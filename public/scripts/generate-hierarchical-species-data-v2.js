#!/usr/bin/env node

/**
 * 階層構造品種データ生成スクリプト v2（精度向上版）
 *
 * 改善点:
 * 1. キャプション先頭とハッシュタグの両方を活用
 * 2. 信頼度を3段階で判定（high, medium, low）
 * 3. 低信頼度データをCSV出力して手動レビュー可能に
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// パス設定
const DATA_DIR = path.join(__dirname, '../data');
const POSTS_FILE = path.join(DATA_DIR, 'instagram-posts.json');
const ANALYSIS_FILE = path.join(DATA_DIR, 'jisakubo-tags-analysis.json');
const OUTPUT_INDEX = path.join(DATA_DIR, 'species-hierarchy-index.json');
const OUTPUT_DIR = path.join(DATA_DIR, 'species');
const LOW_CONFIDENCE_CSV = path.join(DATA_DIR, 'low-confidence-classifications.csv');

// 出力ディレクトリ作成
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * 原種18種の定義
 */
const PURE_SPECIES = [
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
    'wallichii',
    'madagascariense'
];

/**
 * 品種名マッピング（英語 → 日本語）
 */
const SPECIES_NAMES_JA = {
    'bifurcatum': 'ビフルカツム',
    'willinckii': 'ウィリンキー',
    'coronarium': 'コロナリウム',
    'ridleyi': 'リドレイ',
    'wandae': 'ワンダエ',
    'superbum': 'スパーバム',
    'veitchii': 'ビーチー',
    'hillii': 'ヒリー',
    'alcicorne': 'アルシコルネ',
    'elephantotis': 'エレファントティス',
    'ellisii': 'エリシー',
    'holttumii': 'ホルタミー',
    'stemaria': 'ステマリア',
    'andinum': 'アンディナム',
    'quadridichotomum': 'クアドリディコトマム',
    'grande': 'グランデ',
    'wallichii': 'ワリチー',
    'madagascariense': 'マダガスカリエンセ',
    'hybrids': '交配種・交雑種'
};

/**
 * ハッシュタグから「#ジサクボ〇〇」を抽出
 */
function extractJisakuboTags(hashtags) {
    if (!Array.isArray(hashtags)) return [];
    return hashtags.filter(tag => tag.includes('ジサクボ'))
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
}

/**
 * タイトルから品種名を抽出（パターンマッチング）
 */
function extractSpeciesFromCaption(caption) {
    if (!caption) return null;

    // キャプションの最初の行を取得
    const firstLine = caption.split('\n')[0].trim();

    // P.willinckii moonlight#PN のような形式をパース
    const patterns = [
        /P\.([a-zA-Z]+)/i,  // P.willinckii
        /Platycerium\s+([a-zA-Z]+)/i  // Platycerium willinckii
    ];

    for (const pattern of patterns) {
        const match = firstLine.match(pattern);
        if (match && match[1]) {
            return match[1].toLowerCase();
        }
    }

    return null;
}

/**
 * タイトルから大分類を推測
 */
function detectMainSpecies(caption) {
    if (!caption) return null;
    const lowerCaption = caption.toLowerCase();

    const patterns = {
        'bifurcatum': /bifurcatum|ビフルカツム/i,
        'willinckii': /willinckii|ウィリンキー/i,
        'coronarium': /coronarium|コロナリウム/i,
        'ridleyi': /ridleyi|リドレイ/i,
        'wandae': /wandae|ワンダエ/i,
        'superbum': /superbum|スパーバム/i,
        'veitchii': /veitchii|ビーチー|ビィーチー/i,
        'hillii': /hillii|ヒリー/i,
        'alcicorne': /alcicorne|アルシコルネ/i,
        'elephantotis': /elephantotis|エレファントティス/i,
        'ellisii': /ellisii|エリシー/i,
        'holttumii': /holttumii|ホルタミー/i,
        'stemaria': /stemaria|ステマリア/i,
        'andinum': /andinum|アンディナム/i,
        'quadridichotomum': /quadridichotomum|クアドリディコトマム/i,
        'grande': /grande|グランデ/i,
        'wallichii': /wallichii|ワリチー/i,
        'madagascariense': /madagascariense|マダガスカリエンセ/i
    };

    // 原種18種のチェック
    for (const [species, pattern] of Object.entries(patterns)) {
        if (pattern.test(lowerCaption)) {
            if (PURE_SPECIES.includes(species)) {
                return species;
            }
        }
    }

    return null;
}

/**
 * 文字列の類似度を計算（Levenshtein距離ベース）
 */
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // 完全一致
    if (s1 === s2) return 1.0;

    // 片方がもう一方を含む
    if (s1.includes(s2) || s2.includes(s1)) {
        return 0.9;
    }

    // Levenshtein距離
    const distance = levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);

    return 1 - (distance / maxLen);
}

/**
 * Levenshtein距離の計算
 */
function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,   // 削除
                    dp[i][j - 1] + 1,   // 挿入
                    dp[i - 1][j - 1] + 1 // 置換
                );
            }
        }
    }

    return dp[m][n];
}

/**
 * 投稿を分類（信頼度付き）
 */
function classifyPost(post) {
    const caption = post.caption || '';
    const jisakuboTags = extractJisakuboTags(post.hashtags || []);

    // 1. キャプション先頭から品種名を抽出
    const captionSpecies = extractSpeciesFromCaption(caption);

    // 2. ハッシュタグから品種IDを抽出
    const hashtagSpecies = jisakuboTags[0]?.replace(/#ジサクボ/g, '').toLowerCase();

    // 3. 大分類を推測
    const mainSpecies = detectMainSpecies(caption);

    // 4. 信頼度を判定
    let confidence = 'none';
    let assignedSpecies = null;
    let reason = '';

    if (captionSpecies && hashtagSpecies) {
        // 両方ある場合：一致度を計算
        const similarity = calculateSimilarity(captionSpecies, hashtagSpecies);

        if (similarity >= 0.8) {
            confidence = 'high';
            assignedSpecies = hashtagSpecies;
            reason = 'キャプションとハッシュタグが一致';
        } else if (similarity >= 0.5) {
            confidence = 'medium';
            assignedSpecies = hashtagSpecies;
            reason = 'キャプションとハッシュタグが部分的に一致';
        } else {
            confidence = 'low';
            assignedSpecies = hashtagSpecies;
            reason = 'キャプションとハッシュタグが不一致';
        }
    } else if (hashtagSpecies) {
        // ハッシュタグのみ
        confidence = 'medium';
        assignedSpecies = hashtagSpecies;
        reason = 'ハッシュタグのみで分類';
    } else if (captionSpecies) {
        // キャプションのみ（ハッシュタグなし）
        confidence = 'low';
        assignedSpecies = captionSpecies;
        reason = 'キャプションのみで分類（ハッシュタグなし）';
    }

    return {
        species: assignedSpecies,
        jisakuboTag: jisakuboTags[0] || null,
        confidence,
        reason,
        mainSpecies,
        captionSpecies,
        hashtagSpecies
    };
}

/**
 * CSV文字列をエスケープ
 */
function escapeCsv(str) {
    if (!str) return '';
    const escaped = String(str).replace(/"/g, '""');
    return `"${escaped}"`;
}

/**
 * 低信頼度データをCSV出力
 */
function exportLowConfidenceCSV(lowConfidencePosts) {
    const header = [
        'ID',
        '投稿日',
        '信頼度',
        '分類先',
        'ハッシュタグ',
        'キャプション品種',
        'ハッシュタグ品種',
        '大分類',
        '理由',
        'キャプション（最初の100文字）'
    ].join(',');

    const rows = lowConfidencePosts.map(p => {
        const captionPreview = (p.caption || '').split('\n')[0].substring(0, 100);

        return [
            p.id,
            p.date,
            p.classification.confidence,
            p.classification.species || 'なし',
            p.classification.jisakuboTag || 'なし',
            p.classification.captionSpecies || 'なし',
            p.classification.hashtagSpecies || 'なし',
            p.classification.mainSpecies || 'なし',
            escapeCsv(p.classification.reason),
            escapeCsv(captionPreview)
        ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    fs.writeFileSync(LOW_CONFIDENCE_CSV, csv);

    console.log(`\n📊 低信頼度データを CSV 出力: ${LOW_CONFIDENCE_CSV}`);
}

/**
 * メイン処理
 */
async function main() {
    console.log('🏗️  階層構造品種データ生成開始（v2 精度向上版）\n');

    // データ読み込み
    const postsData = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
    const posts = postsData.posts || [];

    console.log(`✅ 投稿データ: ${posts.length}件\n`);

    // 分類統計
    const stats = {
        high: 0,
        medium: 0,
        low: 0,
        none: 0
    };

    // 低信頼度投稿を記録
    const lowConfidencePosts = [];

    // 小分類（ジサクボタグ）ごとにグループ化
    const subSpeciesMap = new Map();

    posts.forEach(post => {
        const classification = classifyPost(post);

        // 統計更新
        stats[classification.confidence]++;

        // 低・中信頼度の場合は記録
        if (['low', 'medium'].includes(classification.confidence)) {
            lowConfidencePosts.push({
                id: post.id,
                date: post.date,
                caption: post.caption,
                classification
            });
        }

        // 分類先が決まっている場合のみ小分類に追加
        if (classification.jisakuboTag) {
            const tag = classification.jisakuboTag;

            if (!subSpeciesMap.has(tag)) {
                subSpeciesMap.set(tag, {
                    tag: tag,
                    mainSpecies: classification.mainSpecies,
                    posts: [],
                    displayName: post.caption?.split('\n')[0].trim() || tag
                });
            }

            subSpeciesMap.get(tag).posts.push({
                ...post,
                classification  // 分類情報を追加
            });
        }
    });

    console.log('📊 分類統計\n');
    console.log(`✅ 高信頼度（high）: ${stats.high}件 (${(stats.high / posts.length * 100).toFixed(1)}%)`);
    console.log(`⚠️  中信頼度（medium）: ${stats.medium}件 (${(stats.medium / posts.length * 100).toFixed(1)}%)`);
    console.log(`❌ 低信頼度（low）: ${stats.low}件 (${(stats.low / posts.length * 100).toFixed(1)}%)`);
    console.log(`❓ 分類不可（none）: ${stats.none}件 (${(stats.none / posts.length * 100).toFixed(1)}%)\n`);

    // 低信頼度データをCSV出力
    if (lowConfidencePosts.length > 0) {
        exportLowConfidenceCSV(lowConfidencePosts);
        console.log(`低信頼度投稿数: ${lowConfidencePosts.length}件`);
    }

    // 小分類JSONファイルを生成
    console.log('\n📝 小分類JSONファイル生成中...\n');
    const subSpeciesFiles = [];

    for (const [tag, data] of subSpeciesMap.entries()) {
        const tagId = tag.replace(/#/g, '').toLowerCase();
        const fileName = `${tagId}.json`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        // 投稿データを整形
        const formattedPosts = data.posts.map(p => ({
            id: p.id,
            date: p.date,
            timestamp: p.timestamp,
            caption: p.caption,
            hashtags: p.hashtags,
            images: p.images,
            metadata: {
                ...p.metadata,
                // 分類情報を追加
                classification: {
                    confidence: p.classification.confidence,
                    reason: p.classification.reason
                }
            }
        }));

        // 最初の投稿のタイトル（表示名として使用）
        const representativeTitle = data.posts[0]?.caption?.split('\n')[0].trim() || tag;

        const output = {
            species: {
                id: tagId,
                mainSpecies: data.mainSpecies,
                tag: tag,
                displayName: representativeTitle,
                count: data.posts.length
            },
            posts: formattedPosts
        };

        fs.writeFileSync(filePath, JSON.stringify(output, null, 2));

        subSpeciesFiles.push({
            id: tagId,
            tag: tag,
            mainSpecies: data.mainSpecies,
            displayName: representativeTitle,
            count: data.posts.length,
            file: fileName
        });
    }

    console.log(`✅ ${subSpeciesFiles.length}件の小分類JSONファイルを生成\n`);

    // インデックスファイル生成
    const indexData = {
        meta: {
            generated: new Date().toISOString(),
            version: '2.0',
            totalSpecies: subSpeciesFiles.length,
            totalPosts: posts.length,
            classificationStats: stats
        },
        species: subSpeciesFiles.sort((a, b) => b.count - a.count)
    };

    fs.writeFileSync(OUTPUT_INDEX, JSON.stringify(indexData, null, 2));
    console.log(`✅ インデックスファイル生成: ${OUTPUT_INDEX}\n`);

    console.log('🎉 階層構造品種データ生成完了！\n');
}

main().catch(err => {
    console.error('❌ エラー:', err);
    process.exit(1);
});
