/**
 * 既存のinstagram.jsonと新しいposts_1.jsonをマージするスクリプト
 *
 * 使い方:
 * node public/scripts/merge-instagram-data.cjs
 */

const fs = require('fs');
const path = require('path');

const EXISTING_FILE = path.join(__dirname, '../data/instagram.json');
const NEW_FILE = path.join(__dirname, '../instagram-data/your_instagram_activity/media/posts_1.json');
const OUTPUT_FILE = path.join(__dirname, '../data/instagram.json');
const BACKUP_DIR = path.join(__dirname, '../data/backup-instagram');

console.log('📦 Instagram データマージ開始...\n');

// バックアップディレクトリ作成
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 既存データのバックアップ
const timestamp = Date.now();
const backupFile = path.join(BACKUP_DIR, `instagram-${timestamp}.json`);
if (fs.existsSync(EXISTING_FILE)) {
    fs.copyFileSync(EXISTING_FILE, backupFile);
    console.log(`✅ バックアップ作成: ${path.basename(backupFile)}\n`);
}

// 既存データ読み込み
console.log('📖 既存データ読み込み中...');
let existingPosts = [];
if (fs.existsSync(EXISTING_FILE)) {
    const existingData = fs.readFileSync(EXISTING_FILE, 'utf8');
    existingPosts = JSON.parse(existingData);
    console.log(`   既存投稿数: ${existingPosts.length}件`);
} else {
    console.log('   既存ファイルなし（新規作成）');
}

// 新しいデータ読み込み
console.log('📖 新しいデータ読み込み中...');
if (!fs.existsSync(NEW_FILE)) {
    console.error(`❌ エラー: 新しいファイルが見つかりません: ${NEW_FILE}`);
    process.exit(1);
}
const newData = fs.readFileSync(NEW_FILE, 'utf8');
const newPosts = JSON.parse(newData);
console.log(`   新規投稿数: ${newPosts.length}件\n`);

// タイムスタンプを取得する関数
function getPostTimestamp(post) {
    if (post.creation_timestamp) {
        return post.creation_timestamp;
    }
    if (post.media && post.media.length > 0 && post.media[0].creation_timestamp) {
        return post.media[0].creation_timestamp;
    }
    return null;
}

// 既存投稿のタイムスタンプセットを作成
console.log('🔍 重複チェック中...');
const existingTimestamps = new Set();
existingPosts.forEach(post => {
    const timestamp = getPostTimestamp(post);
    if (timestamp) {
        existingTimestamps.add(timestamp);
    }
});

// 新しい投稿のうち、重複しないものだけを抽出
const uniqueNewPosts = [];
let duplicateCount = 0;

newPosts.forEach(post => {
    const timestamp = getPostTimestamp(post);
    if (!timestamp) {
        return; // タイムスタンプがない投稿はスキップ
    }

    if (existingTimestamps.has(timestamp)) {
        duplicateCount++;
    } else {
        uniqueNewPosts.push(post);
    }
});

console.log(`   重複投稿: ${duplicateCount}件`);
console.log(`   追加する投稿: ${uniqueNewPosts.length}件\n`);

// マージ
console.log('✨ データマージ中...');
const mergedPosts = [...uniqueNewPosts, ...existingPosts];

// タイムスタンプでソート（新しい順）
mergedPosts.sort((a, b) => {
    const tsA = getPostTimestamp(a);
    const tsB = getPostTimestamp(b);
    if (!tsA) return 1;
    if (!tsB) return -1;
    return tsB - tsA;
});

console.log(`   マージ後の総投稿数: ${mergedPosts.length}件\n`);

// 保存
console.log('💾 保存中...');
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mergedPosts, null, 2), 'utf8');
console.log(`✅ 保存完了: ${OUTPUT_FILE}\n`);

// サマリー
console.log('📊 サマリー:');
console.log(`   既存投稿: ${existingPosts.length}件`);
console.log(`   新規投稿: ${newPosts.length}件`);
console.log(`   重複削除: ${duplicateCount}件`);
console.log(`   追加分: ${uniqueNewPosts.length}件`);
console.log(`   合計: ${mergedPosts.length}件\n`);

console.log('🎉 マージ完了！\n');
console.log('📝 次のステップ:');
console.log('   1. node public/scripts/process-instagram-data.cjs');
console.log('   2. node public/scripts/generate-hierarchical-species-data-v7-FIXED.js');
