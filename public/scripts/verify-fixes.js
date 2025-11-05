#!/usr/bin/env node

/**
 * 修正検証スクリプト
 * 2つの修正が正しく適用されているかデータレベルで確認
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 修正検証スクリプト開始\n');
console.log('=' .repeat(60));

// ===== タスク1: veitchii画像の確認 =====
console.log('\n📋 タスク1: veitchii（ビーチー）画像の確認\n');

try {
    const speciesHierarchyPath = path.join(__dirname, '../data/species-hierarchy-index.json');
    const speciesData = JSON.parse(fs.readFileSync(speciesHierarchyPath, 'utf8'));

    // veitchii種を抽出
    const veitchiiSpecies = speciesData.species.filter(s => s.mainSpecies === 'veitchii');

    console.log(`✓ veitchii品種数: ${veitchiiSpecies.length}種`);

    // 最新の投稿を探す
    let latestSpecies = null;
    let latestDate = '';

    veitchiiSpecies.forEach(species => {
        if (species.latestPostDate > latestDate) {
            latestDate = species.latestPostDate;
            latestSpecies = species;
        }
    });

    if (latestSpecies) {
        console.log(`\n✓ 最新のveitchii品種:`);
        console.log(`  - 品種名: ${latestSpecies.displayName}`);
        console.log(`  - タグ: ${latestSpecies.tag}`);
        console.log(`  - 最新投稿日: ${latestSpecies.latestPostDate}`);
        console.log(`  - 画像: ${latestSpecies.latestImage}`);

        // 期待値チェック
        const expectedImage = '18076281013500882.jpg'; // キングフィッシャー
        const wrongImage = '18024959714223660.jpg'; // エルサ

        if (latestSpecies.latestImage.includes(expectedImage)) {
            console.log(`\n✅ 正しい画像（キングフィッシャー）が設定されています`);
        } else if (latestSpecies.latestImage.includes(wrongImage)) {
            console.log(`\n❌ 誤った画像（エルサ）が設定されています`);
        } else {
            console.log(`\n⚠️ 予期しない画像が設定されています`);
        }

        // 画像ファイルの存在確認
        const imagePath = path.join(__dirname, '..', latestSpecies.latestImage);
        if (fs.existsSync(imagePath)) {
            const stats = fs.statSync(imagePath);
            const sizeKB = Math.round(stats.size / 1024);
            console.log(`✓ 画像ファイルが存在します (${sizeKB}KB)`);
        } else {
            console.log(`❌ 画像ファイルが見つかりません: ${imagePath}`);
        }
    } else {
        console.log('❌ veitchii品種が見つかりませんでした');
    }

    // veitchiiの全品種リスト
    console.log(`\n📊 veitchii品種一覧:`);
    veitchiiSpecies
        .sort((a, b) => b.latestPostDate.localeCompare(a.latestPostDate))
        .slice(0, 5)
        .forEach((species, index) => {
            const imageFile = species.latestImage.split('/').pop();
            console.log(`  ${index + 1}. ${species.displayName}`);
            console.log(`     日付: ${species.latestPostDate}, 画像: ${imageFile}`);
        });

} catch (error) {
    console.error('❌ タスク1の確認中にエラーが発生しました:', error.message);
}

// ===== タスク2: 投稿詳細ページのデータ確認 =====
console.log('\n' + '='.repeat(60));
console.log('\n📋 タスク2: 投稿詳細ページのデータ確認\n');

try {
    const targetPostId = '1670421347-0';
    const postsPath = path.join(__dirname, '../data/posts-2022-12.json');
    const postsData = JSON.parse(fs.readFileSync(postsPath, 'utf8'));

    const post = postsData.posts.find(p => p.id === targetPostId);

    if (post) {
        console.log(`✓ 投稿が見つかりました (ID: ${targetPostId})\n`);

        // タイトル確認
        console.log('【タイトル確認】');
        const title = post.caption ? post.caption.split('\n')[0].replace(/#[^\s]+/g, '').trim() : '';
        if (title && title !== '無題' && !title.startsWith('#')) {
            console.log(`✅ タイトル: "${title}"`);
        } else {
            console.log(`❌ タイトルが不正: "${title}"`);
        }

        // 日付確認
        console.log('\n【日付確認】');
        if (post.timestamp) {
            const date = new Date(post.timestamp * 1000);
            const formattedDate = date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
            });
            console.log(`✅ タイムスタンプ: ${post.timestamp}`);
            console.log(`✅ 日付: ${formattedDate}`);
        } else {
            console.log(`❌ タイムスタンプがありません`);
        }

        // 画像確認
        console.log('\n【画像確認】');
        if (post.images && post.images.length > 0) {
            console.log(`✅ 画像数: ${post.images.length}枚`);
            post.images.forEach((img, index) => {
                const imagePath = path.join(__dirname, '..', img.path);
                const exists = fs.existsSync(imagePath);
                const status = exists ? '✓' : '✗';
                const sizeKB = exists ? Math.round(fs.statSync(imagePath).size / 1024) : 0;
                console.log(`  ${status} 画像${index + 1}: ${img.path.split('/').pop()} ${exists ? `(${sizeKB}KB)` : '(ファイルなし)'}`);
            });
        } else {
            console.log(`❌ 画像がありません`);
        }

        // キャプション確認
        console.log('\n【キャプション確認】');
        if (post.caption) {
            const captionWithoutHashtags = post.caption.replace(/#[^\s]+/g, '').trim();
            const lines = captionWithoutHashtags.split('\n').filter(line => line.trim());
            console.log(`✅ キャプション行数: ${lines.length}行`);
            console.log(`✅ 最初の3行:`);
            lines.slice(0, 3).forEach((line, index) => {
                console.log(`   ${index + 1}. ${line.substring(0, 60)}${line.length > 60 ? '...' : ''}`);
            });
        } else {
            console.log(`❌ キャプションがありません`);
        }

        // ハッシュタグ確認
        console.log('\n【ハッシュタグ確認】');
        if (post.hashtags && post.hashtags.length > 0) {
            console.log(`✅ ハッシュタグ数: ${post.hashtags.length}個`);
            console.log(`   ${post.hashtags.map(tag => '#' + tag).join(', ')}`);
        } else {
            console.log(`❌ ハッシュタグがありません`);
        }

        // データ構造確認
        console.log('\n【データ構造確認】');
        const hasId = !!post.id;
        const hasTimestamp = !!post.timestamp;
        const hasCaption = !!post.caption;
        const hasImages = !!(post.images && post.images.length > 0);

        console.log(`  - id: ${hasId ? '✓' : '✗'}`);
        console.log(`  - timestamp: ${hasTimestamp ? '✓' : '✗'}`);
        console.log(`  - caption: ${hasCaption ? '✓' : '✗'}`);
        console.log(`  - images: ${hasImages ? '✓' : '✗'}`);

        if (hasId && hasTimestamp && hasCaption && hasImages) {
            console.log(`\n✅ データ構造は正常です`);
        } else {
            console.log(`\n❌ データ構造に不足があります`);
        }

    } else {
        console.log(`❌ 投稿が見つかりませんでした (ID: ${targetPostId})`);
    }

} catch (error) {
    console.error('❌ タスク2の確認中にエラーが発生しました:', error.message);
}

// ===== サマリー =====
console.log('\n' + '='.repeat(60));
console.log('\n📊 検証サマリー\n');
console.log('データレベルでの確認が完了しました。');
console.log('ブラウザでの動作確認を実施してください。\n');
console.log('手順:');
console.log('  1. サーバーを起動: python3 -m http.server 8080');
console.log('  2. ブラウザで開く: http://localhost:8080/test-browser-check.html');
console.log('  3. 各テスト項目を確認');
console.log('  4. レポートを生成してClaude Codeに共有\n');
console.log('=' .repeat(60));
