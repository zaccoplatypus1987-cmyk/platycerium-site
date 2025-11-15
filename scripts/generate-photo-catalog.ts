#!/usr/bin/env ts-node
/**
 * Instagram写真カタログ生成スクリプト
 *
 * Instagram投稿データから、Obsidian用の写真カタログを生成します
 * - 品種別カタログ
 * - 月別カタログ
 * - タグ別カタログ
 * - 全投稿一覧
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュール用のパス設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// パス設定
const PROJECT_ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'public', 'data');
const OBSIDIAN_VAULT = '/Users/fujikawatakahisa/Documents/Obsidian Vault';
const CATALOG_DIR = path.join(OBSIDIAN_VAULT, '📝 ビカクシダ記事', '📷 Instagram写真カタログ');

// 画像の相対パス（Obsidian Vault内のシンボリックリンク経由）
const getImagePath = (imagePath: string, subdir: string) => {
  // カタログの階層に応じてパスを調整
  // 01_品種別, 02_月別, 03_タグ別 → ../../instagram-data/...
  // 00_全投稿一覧.md → ../instagram-data/...
  const depth = subdir ? '../../' : '../';
  return `${depth}${imagePath}`;
};

// ディレクトリ作成
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

interface Post {
  id: string;
  date: string;
  timestamp?: number;
  caption?: string;
  title?: string;
  hashtags?: string[];
  images?: Array<{ path: string; timestamp: number }>;
  media?: Array<{ uri: string; creation_timestamp: number; title: string }>;
}

interface Species {
  id: string;
  name: string;
  count: number;
  file: string;
  thumbnail: string;
}

interface SpeciesDetail {
  species: {
    id: string;
    name: string;
  };
  posts: Post[];
}

interface MonthlyPosts {
  month: string;
  count: number;
  posts: Post[];
}

// 品種別カタログ生成
const generateSpeciesCatalog = () => {
  console.log('📂 品種別カタログを生成中...');

  const speciesIndexPath = path.join(DATA_DIR, 'species-index.json');
  const speciesIndex = JSON.parse(fs.readFileSync(speciesIndexPath, 'utf-8'));

  const outputDir = path.join(CATALOG_DIR, '01_品種別');
  ensureDir(outputDir);

  for (const species of speciesIndex.species as Species[]) {
    const speciesFile = path.join(DATA_DIR, species.file);

    if (!fs.existsSync(speciesFile)) {
      console.warn(`⚠️  品種ファイルが見つかりません: ${species.file}`);
      continue;
    }

    const speciesData: SpeciesDetail = JSON.parse(fs.readFileSync(speciesFile, 'utf-8'));

    let markdown = `# ${species.name}\n\n`;
    markdown += `**投稿数**: ${species.count}枚\n\n`;
    markdown += `---\n\n`;

    // 投稿を日付順にソート（新しい順）
    const sortedPosts = speciesData.posts.sort((a, b) => {
      const dateA = a.creation_timestamp || new Date(a.date).getTime() / 1000;
      const dateB = b.creation_timestamp || new Date(b.date).getTime() / 1000;
      return dateB - dateA;
    });

    for (const post of sortedPosts) {
      const media = post.media || [];
      const caption = post.title || post.caption || '';

      if (media.length === 0) continue;

      markdown += `## ${post.date}\n\n`;

      // 最初の画像のみ表示
      const firstImage = media[0];
      markdown += `![${species.name}](${getImagePath(firstImage.uri, 'species')})\n\n`;
      markdown += `**パス**: \`${firstImage.uri}\`\n\n`;

      if (caption) {
        const shortCaption = caption.split('\n')[0].substring(0, 100);
        markdown += `**キャプション**: ${shortCaption}...\n\n`;
      }

      // 複数画像がある場合
      if (media.length > 1) {
        markdown += `<details>\n<summary>他の写真を見る (${media.length - 1}枚)</summary>\n\n`;
        for (let i = 1; i < media.length; i++) {
          markdown += `![${species.name}](${getImagePath(media[i].uri, 'species')})\n`;
          markdown += `**パス**: \`${media[i].uri}\`\n\n`;
        }
        markdown += `</details>\n\n`;
      }

      markdown += `---\n\n`;
    }

    const filename = species.id.replace(/[^a-zA-Z0-9-]/g, '_') + '.md';
    fs.writeFileSync(path.join(outputDir, filename), markdown);
  }

  console.log(`✅ 品種別カタログ生成完了 (${speciesIndex.species.length}品種)`);
};

// 月別カタログ生成
const generateMonthlyCatalog = () => {
  console.log('📅 月別カタログを生成中...');

  const outputDir = path.join(CATALOG_DIR, '02_月別');
  ensureDir(outputDir);

  // posts-YYYY-MM.json ファイルを取得
  const postFiles = fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^posts-\d{4}-\d{2}\.json$/))
    .sort()
    .reverse(); // 新しい順

  for (const file of postFiles) {
    const monthData: MonthlyPosts = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));

    let markdown = `# ${monthData.month} (${monthData.count}枚)\n\n`;
    markdown += `---\n\n`;

    for (const post of monthData.posts) {
      const images = post.images || [];
      const caption = post.caption || '';

      if (images.length === 0) continue;

      // タイトルを抽出（キャプションの最初の行）
      const title = caption.split('\n')[0].substring(0, 50);

      markdown += `## ${post.date} | ${title}\n\n`;

      // 最初の画像のみ表示
      const firstImage = images[0];
      markdown += `![](${getImagePath(firstImage.path, 'monthly')})\n\n`;
      markdown += `**パス**: \`${firstImage.path}\`\n\n`;

      if (caption) {
        markdown += `<details>\n<summary>キャプションを見る</summary>\n\n`;
        markdown += `\`\`\`\n${caption}\n\`\`\`\n\n`;
        markdown += `</details>\n\n`;
      }

      // 複数画像がある場合
      if (images.length > 1) {
        markdown += `<details>\n<summary>他の写真を見る (${images.length - 1}枚)</summary>\n\n`;
        for (let i = 1; i < images.length; i++) {
          markdown += `![](${getImagePath(images[i].path, 'monthly')})\n`;
          markdown += `**パス**: \`${images[i].path}\`\n\n`;
        }
        markdown += `</details>\n\n`;
      }

      markdown += `---\n\n`;
    }

    fs.writeFileSync(path.join(outputDir, `${monthData.month}.md`), markdown);
  }

  console.log(`✅ 月別カタログ生成完了 (${postFiles.length}ヶ月)`);
};

// タグ別カタログ生成
const generateTagCatalog = () => {
  console.log('🏷️  タグ別カタログを生成中...');

  const outputDir = path.join(CATALOG_DIR, '03_タグ別');
  ensureDir(outputDir);

  // 全投稿からハッシュタグを集計
  const tagMap = new Map<string, Post[]>();

  const postFiles = fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^posts-\d{4}-\d{2}\.json$/));

  for (const file of postFiles) {
    const monthData: MonthlyPosts = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));

    for (const post of monthData.posts) {
      const hashtags = post.hashtags || [];

      for (const tag of hashtags) {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, []);
        }
        tagMap.get(tag)!.push(post);
      }
    }
  }

  // 投稿数が多い順にソート
  const sortedTags = Array.from(tagMap.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 50); // 上位50タグのみ

  for (const [tag, posts] of sortedTags) {
    let markdown = `# ${tag} (${posts.length}枚)\n\n`;
    markdown += `---\n\n`;

    // 日付順にソート（新しい順）
    const sortedPosts = posts.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    for (const post of sortedPosts.slice(0, 100)) { // 最大100件
      const images = post.images || [];

      if (images.length === 0) continue;

      const caption = post.caption || '';
      const title = caption.split('\n')[0].substring(0, 50);

      markdown += `## ${post.date} | ${title}\n\n`;

      const firstImage = images[0];
      markdown += `![](${getImagePath(firstImage.path, 'tags')})\n\n`;
      markdown += `**パス**: \`${firstImage.path}\`\n\n`;

      markdown += `---\n\n`;
    }

    const filename = tag.replace(/[^a-zA-Z0-9ぁ-んァ-ヶー一-龠]/g, '_') + '.md';
    fs.writeFileSync(path.join(outputDir, filename), markdown);
  }

  console.log(`✅ タグ別カタログ生成完了 (${sortedTags.length}タグ)`);
};

// 全投稿一覧生成
const generateAllPostsCatalog = () => {
  console.log('📋 全投稿一覧を生成中...');

  const outputPath = path.join(CATALOG_DIR, '00_全投稿一覧.md');

  let markdown = `# Instagram全投稿一覧\n\n`;
  markdown += `**注意**: このファイルは大きいので、読み込みに時間がかかる場合があります。\n\n`;
  markdown += `---\n\n`;

  const postFiles = fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^posts-\d{4}-\d{2}\.json$/))
    .sort()
    .reverse();

  let totalCount = 0;

  for (const file of postFiles) {
    const monthData: MonthlyPosts = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));

    markdown += `## ${monthData.month} (${monthData.count}枚)\n\n`;

    for (const post of monthData.posts) {
      const images = post.images || [];

      if (images.length === 0) continue;

      const caption = post.caption || '';
      const title = caption.split('\n')[0].substring(0, 50);

      markdown += `### ${post.date} | ${title}\n`;
      markdown += `**パス**: \`${images[0].path}\`\n\n`;

      totalCount++;
    }

    markdown += `---\n\n`;
  }

  // ファイル先頭に総数を追記
  const header = `# Instagram全投稿一覧\n\n**総投稿数**: ${totalCount}件\n\n**注意**: このファイルは大きいので、読み込みに時間がかかる場合があります。\n\n---\n\n`;
  markdown = header + markdown.substring(markdown.indexOf('---'));

  fs.writeFileSync(outputPath, markdown);

  console.log(`✅ 全投稿一覧生成完了 (${totalCount}件)`);
};

// README生成
const generateReadme = () => {
  const readme = `# Instagram写真カタログ

このフォルダには、Instagram投稿データから自動生成された写真カタログがあります。

## 📂 フォルダ構成

- **01_品種別/** - ビカクシダの品種ごとに整理
- **02_月別/** - 投稿月ごとに整理
- **03_タグ別/** - ハッシュタグごとに整理
- **00_全投稿一覧.md** - 時系列での全投稿

## 🔄 更新方法

Claude Codeに「カタログ更新して」と伝えてください。
スクリプトが自動的に再生成します。

## 📸 画像の選び方

1. このカタログで使いたい写真を探す
2. **パス** の部分をコピー
3. トップページ文章編集.mdに貼り付け
4. 「トップページに反映して」とClaude Codeに伝える

---

最終更新: ${new Date().toLocaleString('ja-JP')}
`;

  fs.writeFileSync(path.join(CATALOG_DIR, 'README.md'), readme);
};

// メイン処理
const main = () => {
  console.log('🚀 Instagram写真カタログ生成開始\n');

  ensureDir(CATALOG_DIR);

  try {
    generateSpeciesCatalog();
    generateMonthlyCatalog();
    generateTagCatalog();
    generateAllPostsCatalog();
    generateReadme();

    console.log('\n✨ すべてのカタログ生成が完了しました！');
    console.log(`📁 保存先: ${CATALOG_DIR}`);
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
};

main();
