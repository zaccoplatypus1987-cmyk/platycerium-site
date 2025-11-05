/**
 * Instagram投稿データを処理して、月別JSONファイルとインデックスを生成するスクリプト
 */

const fs = require('fs');
const path = require('path');

// ファイルパス設定
const INPUT_FILE = path.join(__dirname, '../instagram-data/your_instagram_activity/media/posts_1.json');
const OUTPUT_DIR = path.join(__dirname, '../data');
const INDEX_FILE = path.join(OUTPUT_DIR, 'posts-index.json');
const IMAGES_DIR = path.join(__dirname, '../instagram-data/media/posts');

// ビカクシダ関連のキーワード
const PLATYCERIUM_KEYWORDS = [
  'ビカクシダ',
  'platycerium',
  'staghorn',
  'bifurcatum',
  'willinckii',
  'coronarium',
  'ridleyi',
  'wandae',
  'superbum',
  'veitchii',
  'hillii',
  'alcicorne',
  'elephantotis',
  'ellisii',
  'holttumii',
  'stemaria',
  'andinum',
  'quadridichotomum',
  'grande',
  'wallichii'
];

/**
 * テキストがビカクシダ関連かチェック
 */
function isPlatyceriumRelated(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return PLATYCERIUM_KEYWORDS.some(keyword =>
    lowerText.includes(keyword.toLowerCase())
  );
}

/**
 * 画像ファイルの存在確認
 */
function checkImageExists(uri) {
  const imagePath = path.join(__dirname, '../instagram-data', uri);
  return fs.existsSync(imagePath);
}

/**
 * タイムスタンプを日付文字列に変換（YYYY-MM-DD形式）
 */
function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toISOString().split('T')[0];
}

/**
 * タイムスタンプから年月を取得（YYYY-MM形式）
 */
function getYearMonth(timestamp) {
  if (!timestamp || isNaN(timestamp)) {
    return null; // 無効なタイムスタンプ
  }
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * ハッシュタグを抽出
 */
function extractHashtags(text) {
  if (!text) return [];
  const hashtags = text.match(/#[^\s#]+/g) || [];
  return hashtags.map(tag => tag.substring(1)); // # を除去
}

/**
 * Instagram JSONの文字列を正しくデコード
 */
function decodeInstagramString(str) {
  if (!str) return str;

  // Instagram JSONは UTF-8バイトをUnicode文字として格納
  // JSON.parse済みなので、各文字のcharCodeが実際のバイト値
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code <= 0xFF) {
      // 0x00-0xFF の範囲 → UTF-8バイト
      bytes.push(code);
    } else {
      // 通常のUnicode文字 → そのまま
      const utf8Bytes = Buffer.from(str[i], 'utf8');
      for (let j = 0; j < utf8Bytes.length; j++) {
        bytes.push(utf8Bytes[j]);
      }
    }
  }

  // バイト配列をUTF-8としてデコード
  try {
    return Buffer.from(bytes).toString('utf8');
  } catch (e) {
    return str; // デコード失敗時は元の文字列を返す
  }
}

/**
 * オブジェクト内のすべての文字列をデコード
 */
function decodeObject(obj) {
  if (typeof obj === 'string') {
    return decodeInstagramString(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(item => decodeObject(item));
  } else if (obj !== null && typeof obj === 'object') {
    const decoded = {};
    for (const key in obj) {
      decoded[key] = decodeObject(obj[key]);
    }
    return decoded;
  }
  return obj;
}

/**
 * 投稿からタイムスタンプを取得
 * post.creation_timestamp または media[0].creation_timestamp を使用
 */
function getPostTimestamp(post) {
  // post自体にcreation_timestampがあればそれを使用
  if (post.creation_timestamp && !isNaN(post.creation_timestamp)) {
    return post.creation_timestamp;
  }

  // なければmedia[0].creation_timestampを使用
  if (post.media && post.media.length > 0 && post.media[0].creation_timestamp) {
    return post.media[0].creation_timestamp;
  }

  return null;
}

/**
 * 投稿を既存フォーマットに変換
 */
function convertToExistingFormat(post) {
  // 画像の存在確認
  const mediaItems = post.media || [];
  const validMedia = mediaItems.filter(m => checkImageExists(m.uri));

  if (validMedia.length === 0) {
    return null;
  }

  // タイムスタンプ取得
  const timestamp = getPostTimestamp(post);
  if (!timestamp) {
    return null; // タイムスタンプがない投稿はスキップ
  }

  // キャプションを取得（post.title または media[0].title から）
  let caption = '';
  if (post.title) {
    caption = decodeInstagramString(post.title);
  } else if (validMedia.length > 0 && validMedia[0].title) {
    caption = decodeInstagramString(validMedia[0].title);
  }

  // ハッシュタグ抽出
  const hashtags = extractHashtags(caption);

  // 新フォーマットに合わせる
  return {
    id: `${timestamp}-0`, // タイムスタンプベースのID
    date: formatDate(timestamp),
    timestamp: timestamp,
    caption: caption,  // v7: captionフィールドを追加
    hashtags: hashtags,
    images: validMedia.map(m => ({
      path: m.uri.replace('media/posts/', 'instagram-data/media/posts/'),
      timestamp: m.creation_timestamp
    })),
    metadata: {
      source: 'instagram',
      originalId: post.uri || `${timestamp}-0`
    }
  };
}

/**
 * 月別に投稿をグループ化
 */
function groupPostsByMonth(posts) {
  const monthlyPosts = {};
  let skippedNoTimestamp = 0;

  for (const post of posts) {
    // まず新フォーマットに変換
    const convertedPost = convertToExistingFormat(post);
    if (!convertedPost) {
      skippedNoTimestamp++;
      continue; // 画像がない、またはタイムスタンプがない投稿はスキップ
    }

    // v7: captionでビカクシダ関連チェック
    const caption = convertedPost.caption || '';
    if (!isPlatyceriumRelated(caption)) {
      continue;
    }

    // 年月を取得（v7: timestampフィールド使用）
    const yearMonth = getYearMonth(convertedPost.timestamp);
    if (!yearMonth) {
      skippedNoTimestamp++;
      continue;
    }

    if (!monthlyPosts[yearMonth]) {
      monthlyPosts[yearMonth] = [];
    }

    monthlyPosts[yearMonth].push(convertedPost);
  }

  console.log(`⏭️  スキップ（タイムスタンプなし）: ${skippedNoTimestamp}件`);

  return monthlyPosts;
}

/**
 * 月別ファイルを出力
 */
function writeMonthlyFiles(monthlyPosts) {
  const monthlyStats = [];

  for (const [yearMonth, posts] of Object.entries(monthlyPosts)) {
    const filename = `posts-${yearMonth}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);

    // 月別ファイルのデータ構造（v7: timestamp使用）
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

  return monthlyStats;
}

/**
 * インデックスファイルを生成
 */
function writeIndexFile(monthlyStats) {
  const totalPosts = monthlyStats.reduce((sum, month) => sum + month.count, 0);

  const indexData = {
    totalPosts,
    months: monthlyStats.sort((a, b) => b.month.localeCompare(a.month)), // 新しい順
    generatedAt: new Date().toISOString()
  };

  fs.writeFileSync(INDEX_FILE, JSON.stringify(indexData, null, 2), 'utf8');
  console.log(`\n📋 インデックスファイル生成: posts-index.json (${totalPosts}件)`);
}

/**
 * メイン処理
 */
async function processInstagramData() {
  console.log('📊 Instagram データ処理開始...');

  // JSONファイル読み込み
  console.log('📖 JSONファイルを読み込み中...');
  const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
  let posts = JSON.parse(rawData);

  // 文字列を正しくデコード
  console.log('🔤 文字エンコーディングを修正中...');
  posts = decodeObject(posts);

  console.log(`✅ 総投稿数: ${posts.length}件`);

  // 出力ディレクトリ作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 月別にグループ化
  console.log('\n🗂️  月別にグループ化中...');
  const monthlyPosts = groupPostsByMonth(posts);

  // 月別ファイルを出力
  console.log('\n💾 月別ファイルを出力中...');
  const monthlyStats = writeMonthlyFiles(monthlyPosts);

  // インデックスファイルを生成
  writeIndexFile(monthlyStats);

  // v7: instagram-posts.jsonを生成（全投稿を1つのファイルに）
  console.log('\n📝 instagram-posts.json を生成中...');
  const allPosts = Object.values(monthlyPosts).flat().sort((a, b) => b.timestamp - a.timestamp);
  const instagramPostsFile = path.join(OUTPUT_DIR, 'instagram-posts.json');
  fs.writeFileSync(
    instagramPostsFile,
    JSON.stringify({ posts: allPosts, totalPosts: allPosts.length }, null, 2),
    'utf8'
  );
  console.log(`✅ instagram-posts.json 生成完了 (${allPosts.length}件)`);

  // 統計情報
  console.log('\n📈 年別投稿数:');
  const yearCounts = {};
  monthlyStats.forEach(({ month, count }) => {
    const year = month.substring(0, 4);
    yearCounts[year] = (yearCounts[year] || 0) + count;
  });

  Object.entries(yearCounts).sort().forEach(([year, count]) => {
    console.log(`  ${year}: ${count}件`);
  });

  console.log('\n📊 月別投稿数（上位10ヶ月）:');
  monthlyStats
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .forEach(({ month, count }) => {
      console.log(`  ${month}: ${count}件`);
    });

  console.log('\n🎉 処理完了！');
  console.log(`📁 生成ファイル数: ${monthlyStats.length + 1}個（月別ファイル${monthlyStats.length}個 + インデックス1個）`);
}

// スクリプト実行
processInstagramData().catch(error => {
  console.error('❌ エラー発生:', error);
  process.exit(1);
});
