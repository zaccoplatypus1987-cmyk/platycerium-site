/**
 * 新しいposts_1.jsonを処理して、既存のinstagram-posts.jsonに追加するスクリプト
 *
 * 使い方:
 * node public/scripts/add-new-instagram-posts.cjs
 */

const fs = require('fs');
const path = require('path');

const NEW_FILE = path.join(__dirname, '../instagram-data/your_instagram_activity/media/posts_1.json');
const EXISTING_FILE = path.join(__dirname, '../data/instagram-posts.json');
const OUTPUT_FILE = path.join(__dirname, '../data/instagram-posts.json');

console.log('📦 新しいInstagram投稿を追加開始...\n');

// 既存データ読み込み
console.log('📖 既存データ読み込み中...');
if (!fs.existsSync(EXISTING_FILE)) {
    console.error(`❌ エラー: 既存ファイルが見つかりません: ${EXISTING_FILE}`);
    process.exit(1);
}
const existingData = JSON.parse(fs.readFileSync(EXISTING_FILE, 'utf8'));
const existingPosts = existingData.posts || [];
console.log(`   既存投稿数: ${existingPosts.length}件\n`);

// 新しいデータ読み込み
console.log('📖 新しいデータ読み込み中...');
if (!fs.existsSync(NEW_FILE)) {
    console.error(`❌ エラー: 新しいファイルが見つかりません: ${NEW_FILE}`);
    process.exit(1);
}
const newPostsRaw = JSON.parse(fs.readFileSync(NEW_FILE, 'utf8'));
console.log(`   新規投稿数: ${newPostsRaw.length}件\n`);

/**
 * Instagram JSONの文字列をUTF-8にデコード
 */
function decodeInstagramString(str) {
    if (!str) return str;
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code <= 0xFF) {
            bytes.push(code);
        } else {
            const utf8Bytes = Buffer.from(str[i], 'utf8');
            for (let j = 0; j < utf8Bytes.length; j++) {
                bytes.push(utf8Bytes[j]);
            }
        }
    }
    try {
        return Buffer.from(bytes).toString('utf8');
    } catch (e) {
        return str;
    }
}

/**
 * ハッシュタグを抽出
 */
function extractHashtags(text) {
    if (!text) return [];
    const hashtags = text.match(/#[^\s#]+/g) || [];
    return hashtags.map(tag => tag.substring(1));
}

/**
 * タイムスタンプを日付文字列に変換
 */
function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toISOString().split('T')[0];
}

/**
 * 新しい投稿を内部フォーマットに変換
 */
function convertNewPost(post, index) {
    if (!post.media || post.media.length === 0) {
        return null;
    }

    const firstMedia = post.media[0];
    const timestamp = firstMedia.creation_timestamp;
    if (!timestamp) {
        return null;
    }

    let caption = '';
    // まずルートレベルのtitleを確認（Facebookクロスポスト用）
    if (post.title) {
        caption = decodeInstagramString(post.title);
    } else if (firstMedia.title) {
        // なければmedia[0].titleを使用
        caption = decodeInstagramString(firstMedia.title);
    }

    const hashtags = extractHashtags(caption);

    return {
        id: `${timestamp}-${index}`,
        date: formatDate(timestamp),
        timestamp: timestamp,
        caption: caption,
        hashtags: hashtags,
        images: post.media.map(m => ({
            path: `instagram-data/${m.uri}`,
            timestamp: m.creation_timestamp
        })),
        metadata: {
            source: 'instagram',
            originalId: `${timestamp}-${index}`
        }
    };
}

// 新しい投稿を変換
console.log('🔄 新しい投稿を変換中...');
const convertedPosts = [];
for (let i = 0; i < newPostsRaw.length; i++) {
    const converted = convertNewPost(newPostsRaw[i], i);
    if (converted) {
        convertedPosts.push(converted);
    }
}
console.log(`   変換完了: ${convertedPosts.length}件\n`);

// 重複チェック
console.log('🔍 重複チェック中...');
const existingTimestamps = new Set(existingPosts.map(p => p.timestamp));
const uniqueNewPosts = convertedPosts.filter(p => !existingTimestamps.has(p.timestamp));
const duplicateCount = convertedPosts.length - uniqueNewPosts.length;
console.log(`   重複: ${duplicateCount}件`);
console.log(`   追加する投稿: ${uniqueNewPosts.length}件\n`);

// マージ
console.log('✨ マージ中...');
const mergedPosts = [...uniqueNewPosts, ...existingPosts];
mergedPosts.sort((a, b) => b.timestamp - a.timestamp);
console.log(`   合計: ${mergedPosts.length}件\n`);

// 保存
console.log('💾 保存中...');
const output = {
    posts: mergedPosts,
    totalPosts: mergedPosts.length
};
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
console.log(`✅ 保存完了: ${OUTPUT_FILE}\n`);

// サマリー
console.log('📊 サマリー:');
console.log(`   既存投稿: ${existingPosts.length}件`);
console.log(`   新規投稿: ${convertedPosts.length}件`);
console.log(`   重複削除: ${duplicateCount}件`);
console.log(`   追加分: ${uniqueNewPosts.length}件`);
console.log(`   合計: ${mergedPosts.length}件\n`);

console.log('🎉 完了！\n');
console.log('📝 次のステップ:');
console.log('   node public/scripts/generate-hierarchical-species-data-v7-FIXED.js');
