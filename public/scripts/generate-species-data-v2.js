/**
 * 品種別データ生成スクリプト v2
 * 階層化対応版 - 詳細なクローン名まで分類
 */

const fs = require('fs');
const path = require('path');

// パス設定
const DATA_DIR = path.join(__dirname, '../data');
const INDEX_FILE = path.join(DATA_DIR, 'posts-index.json');
const SPECIES_INDEX_FILE = path.join(DATA_DIR, 'species-index.json');
const SPECIES_DIR = path.join(DATA_DIR, 'species');
const PATTERNS_FILE = path.join(DATA_DIR, 'species-patterns.json');

// ノイズワード（誤検出を除外）
const NOISE_WORDS = [
  'です', 'もいいですね', 'から', 'さん', 'の日', '成長記録', '普及委員会',
  'from', 'has', 'cv', 'wild', 'King', 'king', 'vp',
  'はいいぞ', 'WaiWaiです', 'ドワーフから生えてたミステリービカク',
];

// 主要品種の定義
const MAIN_SPECIES = [
  { id: 'willinckii', name: 'P. willinckii', nameJa: 'ウィリンキー', keywords: ['willinckii', 'ウィリンキー'] },
  { id: 'veitchii', name: 'P. veitchii', nameJa: 'ビーチー', keywords: ['veitchii', 'ビーチー'] },
  { id: 'ridleyi', name: 'P. ridleyi', nameJa: 'リドレイ', keywords: ['ridleyi', 'リドレイ'] },
  { id: 'coronarium', name: 'P. coronarium', nameJa: 'コロナリウム', keywords: ['coronarium', 'コロナリウム'] },
  { id: 'bifurcatum', name: 'P. bifurcatum', nameJa: 'ビフルカツム', keywords: ['bifurcatum', 'ビフルカツム'] },
  { id: 'superbum', name: 'P. superbum', nameJa: 'スパーバム', keywords: ['superbum', 'スパーバム'] },
  { id: 'hillii', name: 'P. hillii', nameJa: 'ヒリー', keywords: ['hillii', 'ヒリー'] },
  { id: 'wandae', name: 'P. wandae', nameJa: 'ワンダエ', keywords: ['wandae', 'ワンダエ'] },
  { id: 'grande', name: 'P. grande', nameJa: 'グランデ', keywords: ['grande', 'グランデ'] },
  { id: 'wallichii', name: 'P. wallichii', nameJa: 'ワリチー', keywords: ['wallichii', 'ワリチー'] },
  { id: 'madagascariense', name: 'P. madagascariense', nameJa: 'マダガスカリエンセ', keywords: ['madagascariense', 'マダガスカリエンセ'] },
  { id: 'alcicorne', name: 'P. alcicorne', nameJa: 'アルシコルネ', keywords: ['alcicorne', 'アルシコルネ'] },
  { id: 'elephantotis', name: 'P. elephantotis', nameJa: 'エレファントティス', keywords: ['elephantotis', 'エレファントティス'] },
  { id: 'ellisii', name: 'P. ellisii', nameJa: 'エリシー', keywords: ['ellisii', 'エリシー'] },
  { id: 'holttumii', name: 'P. holttumii', nameJa: 'ホルタミー', keywords: ['holttumii', 'ホルタミー'] },
  { id: 'stemaria', name: 'P. stemaria', nameJa: 'ステマリア', keywords: ['stemaria', 'ステマリア'] },
  { id: 'andinum', name: 'P. andinum', nameJa: 'アンディナム', keywords: ['andinum', 'アンディナム'] },
  { id: 'quadridichotomum', name: 'P. quadridichotomum', nameJa: 'クアドリディコトマム', keywords: ['quadridichotomum', 'クアドリディコトマム'] },
];

// 有効なクローン名の定義（分析結果から手動キュレーション）
const VALID_CLONES = {
  willinckii: [
    'moonlight', 'smurf', 'blue', 'jade', 'vanorn', 'anne', 'OMG', 'omg',
    'gabriel', 'omega', 'winnie', 'scissor', 'bogor', 'celsotatsuta',
    'fishbone', 'scofieldtatsuta', 'tobari', 'Sparrow', 'sparrow',
    'nadare', 'Indonesia', 'indonesia', 'bacteria', 'adagio',
    'bluequeen', 'yellow', 'Vanorn', 'bogorsuddan', 'セルソタツタ',
    'Celso Tatsuta', 'celso tatsuta', 'Jade Girl', 'jade girl',
    'Scofield Tatsuta', 'scofield tatsuta',
  ],
  veitchii: [
    'auburn', 'sporeling', 'kingfisher', 'longfinger', 'doralemo',
    'Auburn River', 'auburn river', 'Silver Frond', 'silver frond',
  ],
  ridleyi: [
    'nano', 'Nano', 'monkey', 'dwarf', 'ドワーフ', 'pakarang', 'pakalang',
    'Monkey', 'Dwarf',
  ],
  coronarium: [
    'waiwai', 'WaiWai', 'Waiwai',
  ],
  bifurcatum: [],
  superbum: [
    'dwarf', 'ドワーフ', 'Dwarf',
  ],
  hillii: [
    'mutant', 'Mutant', 'サタヒップ',
  ],
  wandae: [],
  grande: [],
  wallichii: [],
  madagascariense: [],
  alcicorne: [],
  elephantotis: [],
  ellisii: [],
  holttumii: [],
  stemaria: [],
  andinum: [],
  quadridichotomum: [],
};

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
      const date = new Date(post.creation_timestamp * 1000);
      post.date = date.toISOString().split('T')[0];
      allPosts.push(post);
    }
  }

  console.log(`✅ 総投稿数: ${allPosts.length}件`);
  return allPosts;
}

/**
 * タイトルから主要品種を検出
 */
function detectMainSpecies(text) {
  const lowerText = text.toLowerCase();
  const detected = [];

  for (const species of MAIN_SPECIES) {
    for (const keyword of species.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        detected.push(species.id);
        break;
      }
    }
  }

  return detected;
}

/**
 * タイトルからクローン名を抽出
 */
function extractCloneName(text, mainSpeciesId) {
  const validClones = VALID_CLONES[mainSpeciesId] || [];
  if (validClones.length === 0) return null;

  const lowerText = text.toLowerCase();

  // 各有効なクローン名でチェック
  for (const clone of validClones) {
    const lowerClone = clone.toLowerCase();

    // 完全一致または単語境界でマッチ
    const regex = new RegExp(`\\b${lowerClone}\\b`, 'i');
    if (regex.test(lowerText)) {
      return clone;
    }
  }

  return null;
}

/**
 * 投稿から品種とクローン名を抽出
 */
function extractSpeciesInfo(post) {
  const title = post.title || '';
  const mediaTitle = post.media && post.media[0] ? post.media[0].title || '' : '';
  const combinedText = title + ' ' + mediaTitle;

  const mainSpecies = detectMainSpecies(combinedText);
  const result = [];

  for (const speciesId of mainSpecies) {
    const cloneName = extractCloneName(combinedText, speciesId);
    result.push({
      mainSpecies: speciesId,
      cloneName: cloneName,
    });
  }

  return result;
}

/**
 * 品種別・クローン別にグルーピング
 */
function groupBySpecies(posts) {
  const speciesData = {};
  const cloneData = {};

  // 初期化
  for (const species of MAIN_SPECIES) {
    speciesData[species.id] = {
      species: {
        id: species.id,
        name: species.name,
        nameJa: species.nameJa,
        hasSubSpecies: (VALID_CLONES[species.id] || []).length > 0,
      },
      posts: [],
      subSpecies: [],
    };

    cloneData[species.id] = {};
  }

  console.log('\n🔍 品種とクローン名を抽出中...');

  for (const post of posts) {
    const speciesInfo = extractSpeciesInfo(post);

    for (const info of speciesInfo) {
      const { mainSpecies, cloneName } = info;

      // メイン品種に追加
      speciesData[mainSpecies].posts.push(post);

      // クローン名がある場合
      if (cloneName) {
        if (!cloneData[mainSpecies][cloneName]) {
          cloneData[mainSpecies][cloneName] = [];
        }
        cloneData[mainSpecies][cloneName].push(post);
      }
    }
  }

  // 各品種の投稿を時系列でソート
  for (const speciesId in speciesData) {
    speciesData[speciesId].posts.sort((a, b) => b.creation_timestamp - a.creation_timestamp);
  }

  // クローンデータをサブ品種として整理
  for (const speciesId in cloneData) {
    const clones = cloneData[speciesId];
    const subSpeciesList = [];

    for (const [cloneName, clonePosts] of Object.entries(clones)) {
      if (clonePosts.length === 0) continue;

      // 時系列でソート
      clonePosts.sort((a, b) => b.creation_timestamp - a.creation_timestamp);

      subSpeciesList.push({
        id: cloneName.toLowerCase().replace(/\s+/g, '-'),
        name: cloneName,
        count: clonePosts.length,
        file: `species/${speciesId}-${cloneName.toLowerCase().replace(/\s+/g, '-')}.json`,
        posts: clonePosts,
      });
    }

    // クローン数でソート
    subSpeciesList.sort((a, b) => b.count - a.count);
    speciesData[speciesId].subSpecies = subSpeciesList;
  }

  return speciesData;
}

/**
 * ファイル出力
 */
function writeSpeciesFiles(speciesData) {
  if (!fs.existsSync(SPECIES_DIR)) {
    fs.mkdirSync(SPECIES_DIR, { recursive: true });
  }

  const speciesStats = [];

  console.log('\n💾 品種別ファイルを出力中...');

  for (const speciesId in speciesData) {
    const data = speciesData[speciesId];

    // 投稿が0件の品種はスキップ
    if (data.posts.length === 0) {
      continue;
    }

    // メイン品種ファイル
    const mainFile = `${speciesId}.json`;
    const mainPath = path.join(SPECIES_DIR, mainFile);

    const mainOutput = {
      species: data.species,
      subSpecies: data.subSpecies.map(sub => ({
        id: sub.id,
        name: sub.name,
        count: sub.count,
        file: sub.file,
      })),
      posts: data.posts,
      count: data.posts.length,
    };

    fs.writeFileSync(mainPath, JSON.stringify(mainOutput, null, 2), 'utf8');
    console.log(`  ✅ ${mainFile} (${data.posts.length}件, サブ品種: ${data.subSpecies.length}種)`);

    // サブ品種ファイル
    for (const subSpecies of data.subSpecies) {
      const subFile = `${speciesId}-${subSpecies.id}.json`;
      const subPath = path.join(SPECIES_DIR, subFile);

      const subOutput = {
        species: {
          id: subSpecies.id,
          parentId: speciesId,
          name: `${data.species.name} ${subSpecies.name}`,
          nameJa: `${data.species.nameJa} ${subSpecies.name}`,
        },
        posts: subSpecies.posts,
        count: subSpecies.posts.length,
      };

      fs.writeFileSync(subPath, JSON.stringify(subOutput, null, 2), 'utf8');
      console.log(`    ↳ ${subFile} (${subSpecies.count}件)`);
    }

    // サムネイル画像
    const thumbnail = data.posts[0] && data.posts[0].media[0]
      ? data.posts[0].media[0].uri
      : null;

    speciesStats.push({
      id: speciesId,
      name: data.species.name,
      nameJa: data.species.nameJa,
      count: data.posts.length,
      file: `species/${mainFile}`,
      thumbnail: thumbnail,
      hasSubSpecies: data.species.hasSubSpecies,
      subSpeciesCount: data.subSpecies.length,
    });
  }

  return speciesStats;
}

/**
 * インデックスファイル生成
 */
function writeSpeciesIndex(speciesStats) {
  const indexData = {
    totalSpecies: speciesStats.length,
    species: speciesStats.sort((a, b) => b.count - a.count),
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(SPECIES_INDEX_FILE, JSON.stringify(indexData, null, 2), 'utf8');
  console.log(`\n📋 品種インデックス生成: species-index.json (${speciesStats.length}品種)`);
}

/**
 * メイン処理
 */
async function main() {
  console.log('🌿 品種別データ生成（階層化版）開始...\n');

  try {
    const allPosts = loadAllPosts();
    const speciesData = groupBySpecies(allPosts);
    const speciesStats = writeSpeciesFiles(speciesData);
    writeSpeciesIndex(speciesStats);

    // 統計情報
    console.log('\n📊 品種別投稿数（上位10品種）:');
    speciesStats
      .slice(0, 10)
      .forEach(({ nameJa, count, subSpeciesCount }) => {
        console.log(`  ${nameJa}: ${count}件 (サブ品種: ${subSpeciesCount}種)`);
      });

    console.log('\n🎉 処理完了！');

  } catch (error) {
    console.error('❌ エラー発生:', error);
    process.exit(1);
  }
}

main();
