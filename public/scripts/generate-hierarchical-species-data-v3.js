#!/usr/bin/env node

/**
 * 階層構造品種データ生成スクリプト v3（高精度版）
 *
 * 改善点:
 * 1. キャプション先頭から品種名を柔軟に抽出
 * 2. 日本語品種名も考慮
 * 3. 信頼度判定ロジックを改善
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// パス設定
const DATA_DIR = path.join(__dirname, '../data');
const POSTS_FILE = path.join(DATA_DIR, 'instagram-posts.json');
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
    'bifurcatum', 'willinckii', 'coronarium', 'ridleyi', 'wandae', 'superbum',
    'veitchii', 'hillii', 'alcicorne', 'elephantotis', 'ellisii', 'holttumii',
    'stemaria', 'andinum', 'quadridichotomum', 'grande', 'wallichii', 'madagascariense'
];

/**
 * ハッシュタグから「#ジサクボ〇〇」を抽出
 */
function extractJisakuboTags(hashtags) {
    if (!Array.isArray(hashtags)) return [];
    return hashtags.filter(tag => tag.includes('ジサクボ'))
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
}

/**
 * キャプション先頭から小分類名を推測
 * 例:
 * - "P.willinckii moonlight#PN" → "moonlight" or "ムーンライト"
 * - "P.coronarium waiwai" → "waiwai" or "ワイワイ"
 */
function extractVarietyFromCaption(caption) {
    if (!caption) return null;

    const firstLine = caption.split('\n')[0].trim();

    // P.species variety のパターン
    const match = firstLine.match(/P\.([a-zA-Z]+)\s+([^\s\n#]+)/i);
    if (match && match[2]) {
        return match[2].toLowerCase();
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
 * 文字列の類似度を計算（簡易版）
 */
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // 完全一致
    if (s1 === s2) return 1.0;

    // 片方がもう一方を含む
    if (s1.includes(s2) || s2.includes(s1)) {
        return 0.85;
    }

    // 英数字のみ抽出して比較
    const alphaNum1 = s1.replace(/[^a-z0-9]/g, '');
    const alphaNum2 = s2.replace(/[^a-z0-9]/g, '');

    if (alphaNum1 && alphaNum2) {
        if (alphaNum1 === alphaNum2) return 0.9;
        if (alphaNum1.includes(alphaNum2) || alphaNum2.includes(alphaNum1)) {
            return 0.75;
        }
    }

    // 先頭3文字が一致
    if (s1.substring(0, 3) === s2.substring(0, 3)) {
        return 0.6;
    }

    return 0.3;
}

/**
 * 投稿を分類（改善版）
 */
function classifyPost(post) {
    const caption = post.caption || '';
    const jisakuboTags = extractJisakuboTags(post.hashtags || []);

    // 1. キャプション先頭から小分類名を抽出
    const captionVariety = extractVarietyFromCaption(caption);

    // 2. ハッシュタグから品種IDを抽出
    const jisakuboTag = jisakuboTags[0];
    const hashtagVariety = jisakuboTag?.replace(/#ジサクボ/g, '').toLowerCase();

    // 3. 大分類を推測
    const mainSpecies = detectMainSpecies(caption);

    // 4. 信頼度を判定（改善版）
    let confidence = 'none';
    let assignedSpecies = null;
    let reason = '';

    if (jisakuboTag) {
        // ハッシュタグがある場合
        assignedSpecies = hashtagVariety;

        if (captionVariety && hashtagVariety) {
            const similarity = calculateSimilarity(captionVariety, hashtagVariety);

            if (similarity >= 0.85) {
                confidence = 'high';
                reason = `キャプション「${captionVariety}」とハッシュタグが高度に一致`;
            } else if (similarity >= 0.6) {
                confidence = 'medium';
                reason = `キャプション「${captionVariety}」とハッシュタグが部分的に一致（類似度: ${(similarity * 100).toFixed(0)}%）`;
            } else {
                confidence = 'low';
                reason = `キャプション「${captionVariety}」とハッシュタグ「${hashtagVariety}」が不一致`;
            }
        } else {
            // ハッシュタグのみ（キャプションに小分類名なし）
            if (mainSpecies) {
                // 大分類があれば中信頼度
                confidence = 'medium';
                reason = `ハッシュタグのみで分類（大分類: ${mainSpecies}）`;
            } else {
                // 大分類もなければ低信頼度
                confidence = 'low';
                reason = 'ハッシュタグのみで分類（大分類なし）';
            }
        }
    } else if (captionVariety) {
        // ハッシュタグなし、キャプションのみ
        assignedSpecies = captionVariety;
        confidence = 'low';
        reason = `キャプション「${captionVariety}」のみで分類（ハッシュタグなし）`;
    }

    return {
        species: assignedSpecies,
        jisakuboTag,
        confidence,
        reason,
        mainSpecies,
        captionVariety,
        hashtagVariety
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
            p.classification.captionVariety || 'なし',
            p.classification.hashtagVariety || 'なし',
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
    console.log('🏗️  階層構造品種データ生成開始（v3 高精度版）\n');

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

    const totalClassified = stats.high + stats.medium + stats.low;
    const accuracy = totalClassified > 0 ? ((stats.high + stats.medium) / totalClassified * 100).toFixed(1) : 0;
    console.log(`🎯 分類精度（高+中）: ${accuracy}%\n`);

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
            version: '3.0',
            totalSpecies: subSpeciesFiles.length,
            totalPosts: posts.length,
            classificationStats: stats,
            accuracy: parseFloat(accuracy)
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
