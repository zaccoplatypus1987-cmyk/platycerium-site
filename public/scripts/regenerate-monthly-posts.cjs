/**
 * instagram-posts.jsonから月別JSONファイルを再生成するスクリプト
 *
 * 使い方:
 * node public/scripts/regenerate-monthly-posts.cjs
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../data/instagram-posts.json');
const OUTPUT_DIR = path.join(__dirname, '../data');
const INDEX_FILE = path.join(OUTPUT_DIR, 'posts-index.json');

console.log('📦 月別投稿ファイルを再生成開始...\n');

// instagram-posts.json読み込み
console.log('📖 instagram-posts.json読み込み中...');
if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ エラー: ファイルが見つかりません: ${INPUT_FILE}`);
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
const allPosts = data.posts || [];
console.log(`   総投稿数: ${allPosts.length}件\n`);

/**
 * タイムスタンプから年月を取得（YYYY-MM形式）
 */
function getYearMonth(timestamp) {
    if (!timestamp || isNaN(timestamp)) {
        return null;
    }
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * 月別にグループ化
 */
console.log('🗂️  月別にグループ化中...');
const monthlyPosts = {};

for (const post of allPosts) {
    const yearMonth = getYearMonth(post.timestamp);
    if (!yearMonth) {
        console.log(`⚠️  タイムスタンプなし: ${post.id}`);
        continue;
    }

    if (!monthlyPosts[yearMonth]) {
        monthlyPosts[yearMonth] = [];
    }
    monthlyPosts[yearMonth].push(post);
}

const monthCount = Object.keys(monthlyPosts).length;
console.log(`   ${monthCount}ヶ月分のデータ\n`);

/**
 * 月別ファイルを出力
 */
console.log('💾 月別ファイルを出力中...');
const monthlyStats = [];

for (const [yearMonth, posts] of Object.entries(monthlyPosts)) {
    const filename = `posts-${yearMonth}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);

    // 月別ファイルのデータ構造
    const monthData = {
        month: yearMonth,
        count: posts.length,
        posts: posts.sort((a, b) => b.timestamp - a.timestamp)
    };

    fs.writeFileSync(filepath, JSON.stringify(monthData, null, 2), 'utf8');
    console.log(`  ✅ ${filename} (${posts.length}件)`);

    monthlyStats.push({
        month: yearMonth,
        file: filename,
        count: posts.length
    });
}

/**
 * インデックスファイルを生成
 */
console.log('\n📋 インデックスファイル生成中...');
const totalPosts = monthlyStats.reduce((sum, month) => sum + month.count, 0);

const indexData = {
    totalPosts,
    months: monthlyStats.sort((a, b) => b.month.localeCompare(a.month)), // 新しい順
    generatedAt: new Date().toISOString()
};

fs.writeFileSync(INDEX_FILE, JSON.stringify(indexData, null, 2), 'utf8');
console.log(`✅ posts-index.json 生成完了 (${totalPosts}件)\n`);

// 統計情報
console.log('📊 年別投稿数:');
const yearCounts = {};
monthlyStats.forEach(({ month, count }) => {
    const year = month.substring(0, 4);
    yearCounts[year] = (yearCounts[year] || 0) + count;
});

Object.entries(yearCounts).sort().forEach(([year, count]) => {
    console.log(`  ${year}: ${count}件`);
});

console.log('\n📊 月別投稿数（最近10ヶ月）:');
monthlyStats
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 10)
    .forEach(({ month, count }) => {
        console.log(`  ${month}: ${count}件`);
    });

console.log('\n🎉 完了！');
console.log(`📁 生成ファイル数: ${monthlyStats.length + 1}個（月別ファイル${monthlyStats.length}個 + インデックス1個）`);
