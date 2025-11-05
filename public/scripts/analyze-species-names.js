/**
 * 品種名分析スクリプト
 * 全投稿のタイトルを分析し、詳細な品種名パターンを抽出
 */

const fs = require('fs');
const path = require('path');

// パス設定
const DATA_DIR = path.join(__dirname, '../data');
const INDEX_FILE = path.join(DATA_DIR, 'posts-index.json');
const REPORT_FILE = path.join(__dirname, '../SPECIES-ANALYSIS-REPORT.md');

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
    allPosts.push(...monthData.posts);
  }

  console.log(`✅ 総投稿数: ${allPosts.length}件`);
  return allPosts;
}

/**
 * タイトルから品種名パターンを抽出
 */
function extractPatterns(posts) {
  const patterns = {
    willinckii: {},
    veitchii: {},
    ridleyi: {},
    coronarium: {},
    bifurcatum: {},
    superbum: {},
    hillii: {},
    wandae: {},
    other: {},
  };

  // 各主要品種のパターン定義
  const mainSpeciesPatterns = {
    willinckii: [
      // P. willinckii [クローン名]
      /P\.\s*willinckii\s+([A-Za-z\s][A-Za-z\s]+?)(?:\s|$|[、。#\n])/gi,
      // willinckii [クローン名]（前後に区切りがある）
      /(?:^|[^\w])willinckii\s+([A-Za-z\s][A-Za-z\s]+?)(?:\s|$|[、。#\n])/gi,
      // ウィリンキー [クローン名]
      /ウィリンキー\s*([^\s、。#\n]+)/gi,
    ],
    veitchii: [
      /P\.\s*veitchii\s+([A-Za-z\s][A-Za-z\s]+?)(?:\s|$|[、。#\n])/gi,
      /(?:^|[^\w])veitchii\s+([A-Za-z\s][A-Za-z\s]+?)(?:\s|$|[、。#\n])/gi,
      /ビーチー\s*([^\s、。#\n]+)/gi,
    ],
    ridleyi: [
      /P\.\s*ridleyi\s+([A-Za-z\s][A-Za-z\s]+?)(?:\s|$|[、。#\n])/gi,
      /(?:^|[^\w])ridleyi\s+([A-Za-z\s][A-Za-z\s]+?)(?:\s|$|[、。#\n])/gi,
      /リドレイ\s*([^\s、。#\n]+)/gi,
    ],
    coronarium: [
      /P\.\s*coronarium\s+([A-Za-z\s][A-Za-z\s]+?)(?:\s|$|[、。#\n])/gi,
      /(?:^|[^\w])coronarium\s+([A-Za-z\s][A-Za-z\s]+?)(?:\s|$|[、。#\n])/gi,
      /コロナリウム\s*([^\s、。#\n]+)/gi,
    ],
    bifurcatum: [
      /P\.\s*bifurcatum\s+([A-Za-z\s][A-Za-z\s]+?)(?:\s|$|[、。#\n])/gi,
      /(?:^|[^\w])bifurcatum\s+([A-Za-z\s][A-Za-z\s]+?)(?:\s|$|[、。#\n])/gi,
      /ビフルカツム\s*([^\s、。#\n]+)/gi,
    ],
    superbum: [
      /P\.\s*superbum\s+([A-Za-z\s][A-Za-z\s]+?)(?:\s|$|[、。#\n])/gi,
      /(?:^|[^\w])superbum\s+([A-Za-z\s][A-Za-z\s]+?)(?:\s|$|[、。#\n])/gi,
      /スパーバム\s*([^\s、。#\n]+)/gi,
    ],
    hillii: [
      /P\.\s*hillii\s+([A-Za-z\s][A-Za-z\s]+?)(?:\s|$|[、。#\n])/gi,
      /(?:^|[^\w])hillii\s+([A-Za-z\s][A-Za-z\s]+?)(?:\s|$|[、。#\n])/gi,
      /ヒリー\s*([^\s、。#\n]+)/gi,
    ],
    wandae: [
      /P\.\s*wandae\s+([A-Za-z\s][A-Za-z\s]+?)(?:\s|$|[、。#\n])/gi,
      /(?:^|[^\w])wandae\s+([A-Za-z\s][A-Za-z\s]+?)(?:\s|$|[、。#\n])/gi,
      /ワンダエ\s*([^\s、。#\n]+)/gi,
    ],
  };

  console.log('\n🔍 タイトルパターンを抽出中...');

  for (const post of posts) {
    const title = post.title || '';
    const mediaTitle = post.media && post.media[0] ? post.media[0].title || '' : '';
    const combinedText = title + ' ' + mediaTitle;

    // 各品種について検索
    for (const [speciesKey, regexList] of Object.entries(mainSpeciesPatterns)) {
      for (const regex of regexList) {
        let match;
        while ((match = regex.exec(combinedText)) !== null) {
          const cloneName = match[1].trim();

          // ノイズ除去
          if (
            cloneName.length < 2 ||
            cloneName.length > 50 ||
            /^[0-9]+$/.test(cloneName) || // 数字のみ
            /^[\s、。#]+$/.test(cloneName) || // 記号のみ
            cloneName.includes('http') ||
            cloneName.includes('instagram')
          ) {
            continue;
          }

          // カウント
          if (!patterns[speciesKey][cloneName]) {
            patterns[speciesKey][cloneName] = 0;
          }
          patterns[speciesKey][cloneName]++;
        }
      }
    }
  }

  return patterns;
}

/**
 * パターンをクリーンアップ
 */
function cleanupPatterns(patterns) {
  const cleaned = {};

  for (const [species, clones] of Object.entries(patterns)) {
    cleaned[species] = {};

    // 出現回数でソート
    const sorted = Object.entries(clones)
      .filter(([name, count]) => count >= 2) // 2回以上出現したもののみ
      .sort((a, b) => b[1] - a[1]);

    for (const [name, count] of sorted) {
      cleaned[species][name] = count;
    }
  }

  return cleaned;
}

/**
 * レポート生成
 */
function generateReport(patterns, posts) {
  const lines = [];

  lines.push('# 品種名分析レポート');
  lines.push('');
  lines.push(`**生成日時**: ${new Date().toISOString()}`);
  lines.push(`**分析対象**: ${posts.length}件の投稿`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // サマリー
  lines.push('## サマリー');
  lines.push('');
  for (const [species, clones] of Object.entries(patterns)) {
    const cloneCount = Object.keys(clones).length;
    const totalPosts = Object.values(clones).reduce((sum, count) => sum + count, 0);

    if (cloneCount > 0) {
      lines.push(`- **${species}**: ${cloneCount}種のクローン名を検出（合計${totalPosts}件の言及）`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // 詳細（各品種）
  lines.push('## 詳細品種リスト');
  lines.push('');

  for (const [species, clones] of Object.entries(patterns)) {
    if (Object.keys(clones).length === 0) continue;

    lines.push(`### ${species.charAt(0).toUpperCase() + species.slice(1)}`);
    lines.push('');
    lines.push('| クローン名 | 出現回数 |');
    lines.push('|-----------|---------|');

    const sorted = Object.entries(clones)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50); // 上位50個

    for (const [name, count] of sorted) {
      lines.push(`| ${name} | ${count} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // 推奨される階層化
  lines.push('## 推奨される階層化');
  lines.push('');
  lines.push('### 優先度: 高');
  lines.push('');

  const highPriority = [];
  for (const [species, clones] of Object.entries(patterns)) {
    const topClones = Object.entries(clones)
      .filter(([name, count]) => count >= 10) // 10回以上
      .sort((a, b) => b[1] - a[1]);

    if (topClones.length > 0) {
      highPriority.push({ species, clones: topClones });
    }
  }

  if (highPriority.length > 0) {
    for (const { species, clones } of highPriority) {
      lines.push(`**${species}**: ${clones.length}種（${clones.map(([n, c]) => `${n} (${c})`).join(', ')}）`);
    }
  } else {
    lines.push('（該当なし）');
  }

  lines.push('');
  lines.push('### 優先度: 中');
  lines.push('');

  const mediumPriority = [];
  for (const [species, clones] of Object.entries(patterns)) {
    const topClones = Object.entries(clones)
      .filter(([name, count]) => count >= 5 && count < 10) // 5-9回
      .sort((a, b) => b[1] - a[1]);

    if (topClones.length > 0) {
      mediumPriority.push({ species, clones: topClones });
    }
  }

  if (mediumPriority.length > 0) {
    for (const { species, clones } of mediumPriority) {
      lines.push(`**${species}**: ${clones.length}種（${clones.map(([n, c]) => `${n} (${c})`).join(', ')}）`);
    }
  } else {
    lines.push('（該当なし）');
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // 統計情報
  lines.push('## 統計情報');
  lines.push('');

  const totalUniqueClones = Object.values(patterns).reduce(
    (sum, clones) => sum + Object.keys(clones).length,
    0
  );

  const totalMentions = Object.values(patterns).reduce(
    (sum, clones) => sum + Object.values(clones).reduce((s, c) => s + c, 0),
    0
  );

  lines.push(`- **検出されたユニークなクローン名**: ${totalUniqueClones}種`);
  lines.push(`- **クローン名の総言及回数**: ${totalMentions}回`);
  lines.push(`- **分析投稿数**: ${posts.length}件`);
  lines.push(`- **クローン名カバー率**: ${((totalMentions / posts.length) * 100).toFixed(2)}%`);
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('**レポート終了**');

  return lines.join('\n');
}

/**
 * メイン処理
 */
async function main() {
  console.log('🌿 品種名分析開始...\n');

  try {
    // 全投稿を読み込み
    const allPosts = loadAllPosts();

    // パターン抽出
    const rawPatterns = extractPatterns(allPosts);

    // クリーンアップ
    const cleanedPatterns = cleanupPatterns(rawPatterns);

    console.log('\n📊 抽出結果:');
    for (const [species, clones] of Object.entries(cleanedPatterns)) {
      if (Object.keys(clones).length > 0) {
        console.log(`  ${species}: ${Object.keys(clones).length}種のクローン名`);
      }
    }

    // レポート生成
    const report = generateReport(cleanedPatterns, allPosts);
    fs.writeFileSync(REPORT_FILE, report, 'utf8');

    console.log(`\n✅ レポート生成完了: SPECIES-ANALYSIS-REPORT.md`);

    // 結果をJSONでも保存
    const jsonOutput = {
      generatedAt: new Date().toISOString(),
      totalPosts: allPosts.length,
      patterns: cleanedPatterns,
    };

    const jsonFile = path.join(__dirname, '../data/species-patterns.json');
    fs.writeFileSync(jsonFile, JSON.stringify(jsonOutput, null, 2), 'utf8');
    console.log(`✅ パターンデータ保存: data/species-patterns.json`);

    console.log('\n🎉 分析完了！');

  } catch (error) {
    console.error('❌ エラー発生:', error);
    process.exit(1);
  }
}

// スクリプト実行
main();
