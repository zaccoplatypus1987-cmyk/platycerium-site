/**
 * 品種別データ生成スクリプト（シンプル版）
 * 投稿の最初の行を品種名として抽出し、品種別にグルーピング
 */

const fs = require('fs');
const path = require('path');

// パス設定
const DATA_DIR = path.join(__dirname, '../data');
const INDEX_FILE = path.join(DATA_DIR, 'posts-index.json');
const SPECIES_INDEX_FILE = path.join(DATA_DIR, 'species-index.json');
const SPECIES_DIR = path.join(DATA_DIR, 'species');

/**
 * 投稿から品種名を抽出（シンプル版）
 * 最初の行をそのまま品種名として扱う
 */
function extractSpeciesName(post) {
  // タイトルまたはメディアのタイトルを取得
  const title = post.title || (post.media && post.media[0] ? post.media[0].title || '' : '');

  // 最初の行を取得
  const firstLine = title.split('\n')[0].trim();

  // 空行や短すぎるタイトルをスキップ
  if (!firstLine || firstLine.length < 2) {
    return null;
  }

  // P. または Platycerium で始まる場合のみ品種として認識
  if (firstLine.match(/^(P\.|Platycerium)/i)) {
    return firstLine;
  }

  return null;
}

/**
 * 品種名からファイル名に適したIDを生成
 */
function generateSpeciesId(speciesName) {
  return speciesName
    .toLowerCase()
    .replace(/\s+/g, '-')           // スペースをハイフンに
    .replace(/[^\w\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '') // 英数字、ハイフン、日本語のみ
    .replace(/^p\./i, 'p-')         // 先頭の P. を p- に
    .replace(/^platycerium-/i, 'p-'); // Platycerium を p- に
}

/**
 * 全月別ファイルを読み込み
 */
function loadAllPosts() {
  const indexData = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  const allPosts = [];

  console.log(`📖 ${indexData.months.length}ヶ月分のデータを読み込み中...`);

  for (const monthInfo of indexData.months) {
    const monthFile = path.join(DATA_DIR, monthInfo.file);
    const monthData = JSON.parse(fs.readFileSync(monthFile, 'utf8'));

    for (const post of monthData.posts) {
      // 投稿に日付を追加（YYYY-MM-DD形式）
      const date = new Date(post.creation_timestamp * 1000);
      post.date = date.toISOString().split('T')[0];
      allPosts.push(post);
    }
  }

  console.log(`✅ 総投稿数: ${allPosts.length}件`);
  return allPosts;
}

/**
 * 品種別にグルーピング
 */
function groupBySpecies(posts) {
  const speciesMap = new Map(); // 品種名 -> 投稿配列
  let extractedCount = 0;
  let noMatchCount = 0;

  console.log('\n🔍 品種を抽出中...');

  for (const post of posts) {
    const speciesName = extractSpeciesName(post);

    if (!speciesName) {
      noMatchCount++;
      continue;
    }

    if (!speciesMap.has(speciesName)) {
      speciesMap.set(speciesName, []);
    }

    speciesMap.get(speciesName).push(post);
    extractedCount++;
  }

  console.log(`✅ 品種抽出数: ${extractedCount}件`);
  console.log(`✅ ユニーク品種数: ${speciesMap.size}個`);
  console.log(`⚠️  品種未特定: ${noMatchCount}件`);

  return speciesMap;
}

/**
 * 品種別ファイルを出力
 */
function writeSpeciesFiles(speciesMap) {
  // 出力ディレクトリ作成
  if (!fs.existsSync(SPECIES_DIR)) {
    fs.mkdirSync(SPECIES_DIR, { recursive: true });
  }

  const speciesStats = [];

  console.log('\n💾 品種別ファイルを出力中...');

  for (const [speciesName, posts] of speciesMap.entries()) {
    // 投稿を時系列でソート（古い順 = 成長の軌跡を見やすく）
    posts.sort((a, b) => a.creation_timestamp - b.creation_timestamp);

    const speciesId = generateSpeciesId(speciesName);
    const filename = `${speciesId}.json`;
    const filepath = path.join(SPECIES_DIR, filename);

    const data = {
      species: {
        id: speciesId,
        name: speciesName,
      },
      posts: posts,
      count: posts.length,
    };

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  ✅ ${filename} (${posts.length}件)`);

    // サムネイル画像を取得（最新の投稿の最初の画像）
    const latestPost = posts[posts.length - 1]; // ソート後の最後が最新
    const thumbnail = latestPost && latestPost.media[0]
      ? latestPost.media[0].uri
      : null;

    speciesStats.push({
      id: speciesId,
      name: speciesName,
      count: posts.length,
      file: `species/${filename}`,
      thumbnail: thumbnail,
    });
  }

  return speciesStats;
}

/**
 * 品種インデックスファイルを生成
 */
function writeSpeciesIndex(speciesStats) {
  // 投稿数の多い順にソート
  const sortedSpecies = speciesStats.sort((a, b) => b.count - a.count);

  const indexData = {
    totalSpecies: sortedSpecies.length,
    species: sortedSpecies,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(SPECIES_INDEX_FILE, JSON.stringify(indexData, null, 2), 'utf8');
  console.log(`\n📋 品種インデックス生成: species-index.json (${sortedSpecies.length}品種)`);
}

/**
 * メイン処理
 */
async function main() {
  console.log('🌿 品種別データ生成開始（シンプル版）...\n');

  try {
    // 全投稿を読み込み
    const allPosts = loadAllPosts();

    // 品種別にグルーピング
    const speciesMap = groupBySpecies(allPosts);

    // 品種別ファイルを出力
    const speciesStats = writeSpeciesFiles(speciesMap);

    // インデックスファイルを生成
    writeSpeciesIndex(speciesStats);

    // 統計情報
    console.log('\n📊 品種別投稿数（上位20品種）:');
    speciesStats
      .slice(0, 20)
      .forEach(({ name, count }) => {
        console.log(`  ${name}: ${count}件`);
      });

    console.log('\n🎉 処理完了！');
    console.log(`📁 生成ファイル数: ${speciesStats.length + 1}個（品種別ファイル${speciesStats.length}個 + インデックス1個）`);

  } catch (error) {
    console.error('❌ エラー発生:', error);
    process.exit(1);
  }
}

// スクリプト実行
main();
