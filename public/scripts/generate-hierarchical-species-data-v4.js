#!/usr/bin/env node

/**
 * 階層構造品種データ生成スクリプト v4（英日マッピング対応版）
 *
 * 改善点:
 * 1. 英語↔日本語品種名のマッピングテーブル追加
 * 2. 正規化後に類似度判定（精度大幅向上）
 * 3. 目標精度: 60-70%
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
 * 英語↔日本語 品種名マッピングテーブル
 *
 * ユースケース:
 * - キャプション: "P.willinckii moonlight#vp" (英語)
 * - ハッシュタグ: "#ジサクボムーンライトvp" (日本語)
 * → 正規化後に比較すると一致判定可能
 */
const VARIETY_NAME_MAPPING = {
    // Willinckii 品種 (759件の主要品種)
    'moonlight': 'ムーンライト',
    'moonlightvp': 'ムーンライトvp',
    'moonlight#vp': 'ムーンライトvp',
    'omega': 'オメガ',
    'smurf': 'スマーフ',
    'blue queen': 'ブルークイーン',
    'bluequeen': 'ブルークイーン',
    'bq': 'ブルークイーン',
    'dwarf smurf': 'ドワーフスマーフ',
    'dwarfsmurf': 'ドワーフスマーフ',
    'jade girl': 'ジェイドガール',
    'jadegirl': 'ジェイドガール',
    'celso tatsuta': 'セルソタツタ',
    'celsotatsuta': 'セルソタツタ',
    'rq': 'レッドクイーン',
    'red queen': 'レッドクイーン',
    'redqueen': 'レッドクイーン',
    'king fisher': 'キングフィッシャー',
    'kingfisher': 'キングフィッシャー',
    'auburn river': 'オーバンリバー',
    'auburnriver': 'オーバンリバー',
    'omg': 'オーエムジー',
    'bqds': 'bqds',
    'winnie': 'ウィニー',
    'izanagi': '伊弉諾',
    'gabriel': 'ガブリエル',
    'cv.foongsiqi': 'フォンシキ',
    'foongsiqi': 'フォンシキ',
    'white hawk': 'ホワイトホーク',
    'whitehawk': 'ホワイトホーク',

    // Veitchii 品種 (174件)
    'lemoinei': 'レモイネイ',
    'silver frond': 'シルバーフロンド',
    'silverfrond': 'シルバーフロンド',
    'wild white': 'ワイルドホワイト',
    'wildwhite': 'ワイルドホワイト',
    'australia': 'オーストラリア',

    // Ridleyi 品種 (161件)
    'nano': 'ナノ',
    'crested': 'クレステッド',
    'wide frond': 'ワイドフロンド',
    'widefrond': 'ワイドフロンド',
    'narrow': 'ナロー',

    // Coronarium 品種 (86件)
    'waiwai': 'ワイワイ',
    'thin frond': 'シンフロンド',
    'thinfrond': 'シンフロンド',
    'white': 'ホワイト',
    'philippines': 'フィリピン',

    // Hillii 品種 (57件)
    'mutant': 'ミュータント',
    'drummond': 'ドラモンド',
    'dragon': 'ドラゴン',
    'groupm': 'グループエム',
    'group m': 'グループエム',
    'king': 'キング',

    // 交配種・交雑種
    'elsa': 'エルサ',
    'white gizmo': 'ホワイトギズモ',
    'whitegizmo': 'ホワイトギズモ',
    'gizmo': 'ギズモ',
    'phenomenal': 'フェノメナル',
    'majus mix': 'マジュスミックス',
    'majusmix': 'マジュスミックス',
    'monkey north': 'モンキーノース',
    'monkeynorth': 'モンキーノース',
    'peawchan': 'ピューチャン',
    'pewchan': 'ピューチャン',
    'white dorian': 'ホワイトドリアン',
    'whitedorian': 'ホワイトドリアン',
    'little will': 'リトルウィル',
    'littlewill': 'リトルウィル',
    'durval nunes': 'ダーバルヌネス',
    'durvalnunes': 'ダーバルヌネス',
    'silver wing': 'シルバーウィング',
    'silverwing': 'シルバーウィング',
    'triceratops': 'トリケラトプス',
    'pegasus': 'ペガサス',
    'neptune': 'ネプチューン',
    'nukul': 'ヌクル',
    'merapi': 'メラピ',
    'mt.lewis': 'マウントルイス',
    'mtlewis': 'マウントルイス',
    'mount lewis': 'マウントルイス',
    'mountlewis': 'マウントルイス',

    // その他の一般的なバリエーション
    'spore': '胞子',
    'dwarf': 'ドワーフ',
    'thin': 'シン',
    'wide': 'ワイド',
    'narrow': 'ナロー',
    'wild': 'ワイルド',
    'white': 'ホワイト',
    'silver': 'シルバー',
    'cv.': '',
    'cv': '',
};

/**
 * 品種名を正規化（英語→日本語に統一）
 */
function normalizeVarietyName(name) {
    if (!name) return null;

    // 小文字化、前後の空白削除
    let normalized = name.toLowerCase().trim();

    // 記号除去（#, ., 空白など）
    normalized = normalized.replace(/[#.\s]/g, '');

    // マッピングテーブルで変換
    if (VARIETY_NAME_MAPPING[normalized]) {
        return VARIETY_NAME_MAPPING[normalized];
    }

    // 部分一致も試す（"moonlight #vp" → "moonlightvp"）
    for (const [en, ja] of Object.entries(VARIETY_NAME_MAPPING)) {
        if (normalized.includes(en) || en.includes(normalized)) {
            return ja;
        }
    }

    // マッピングがない場合は元の名前を返す（小文字化済み）
    return normalized;
}

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
 */
function extractVarietyFromCaption(caption) {
    if (!caption) return null;

    const firstLine = caption.split('\n')[0].trim();

    // P.species variety のパターン
    const match = firstLine.match(/P\.([a-zA-Z]+)\s+([^\s\n#]+)/i);
    if (match && match[2]) {
        return normalizeVarietyName(match[2]);
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
 * 文字列の類似度を計算（正規化後）
 */
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const s1 = String(str1).toLowerCase().trim();
    const s2 = String(str2).toLowerCase().trim();

    // 完全一致
    if (s1 === s2) return 1.0;

    // 片方がもう一方を含む
    if (s1.includes(s2) || s2.includes(s1)) {
        return 0.9;
    }

    // 先頭3文字が一致
    if (s1.length >= 3 && s2.length >= 3 && s1.substring(0, 3) === s2.substring(0, 3)) {
        return 0.7;
    }

    return 0.3;
}

/**
 * 投稿を分類（v4: 正規化対応版）
 */
function classifyPost(post) {
    const caption = post.caption || '';
    const jisakuboTags = extractJisakuboTags(post.hashtags || []);

    // 1. キャプション先頭から小分類名を抽出（正規化済み）
    const captionVariety = extractVarietyFromCaption(caption);

    // 2. ハッシュタグから品種IDを抽出（正規化済み）
    const jisakuboTag = jisakuboTags[0];
    const hashtagVarietyRaw = jisakuboTag?.replace(/#ジサクボ/g, '');
    const hashtagVariety = normalizeVarietyName(hashtagVarietyRaw);

    // 3. 大分類を推測
    const mainSpecies = detectMainSpecies(caption);

    // 4. 信頼度を判定（正規化後の比較）
    let confidence = 'none';
    let assignedSpecies = null;
    let reason = '';

    if (jisakuboTag) {
        // ハッシュタグがある場合
        assignedSpecies = hashtagVariety;

        if (captionVariety && hashtagVariety) {
            const similarity = calculateSimilarity(captionVariety, hashtagVariety);

            if (similarity >= 0.9) {
                confidence = 'high';
                reason = `正規化後に高度一致（類似度: ${(similarity * 100).toFixed(0)}%）`;
            } else if (similarity >= 0.7) {
                confidence = 'medium';
                reason = `正規化後に部分一致（類似度: ${(similarity * 100).toFixed(0)}%）`;
            } else {
                confidence = 'low';
                reason = `正規化後も不一致（キャプ:${captionVariety} vs ハッシュ:${hashtagVariety}）`;
            }
        } else {
            // ハッシュタグのみ（キャプションに小分類名なし）
            if (mainSpecies) {
                confidence = 'medium';
                reason = `ハッシュタグのみで分類（大分類: ${mainSpecies}）`;
            } else {
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
        'キャプション品種（正規化後）',
        'ハッシュタグ品種（正規化後）',
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
    console.log('🏗️  階層構造品種データ生成開始（v4 英日マッピング対応版）\n');

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

    console.log('📊 分類統計（v4 正規化対応版）\n');
    console.log(`✅ 高信頼度（high）: ${stats.high}件 (${(stats.high / posts.length * 100).toFixed(1)}%)`);
    console.log(`⚠️  中信頼度（medium）: ${stats.medium}件 (${(stats.medium / posts.length * 100).toFixed(1)}%)`);
    console.log(`❌ 低信頼度（low）: ${stats.low}件 (${(stats.low / posts.length * 100).toFixed(1)}%)`);
    console.log(`❓ 分類不可（none）: ${stats.none}件 (${(stats.none / posts.length * 100).toFixed(1)}%)\n`);

    const totalClassified = stats.high + stats.medium + stats.low;
    const accuracy = totalClassified > 0 ? ((stats.high + stats.medium) / totalClassified * 100).toFixed(1) : 0;
    console.log(`🎯 分類精度（高+中）: ${accuracy}%`);
    console.log(`📈 改善目標: 60-70% (v3の27.2%から大幅改善)\n`);

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
            version: '4.0',
            description: '英語↔日本語マッピング対応版',
            totalSpecies: subSpeciesFiles.length,
            totalPosts: posts.length,
            classificationStats: stats,
            accuracy: parseFloat(accuracy),
            improvements: {
                v3: '27.2%',
                v4: `${accuracy}%`,
                target: '60-70%'
            }
        },
        species: subSpeciesFiles.sort((a, b) => b.count - a.count)
    };

    fs.writeFileSync(OUTPUT_INDEX, JSON.stringify(indexData, null, 2));
    console.log(`✅ インデックスファイル生成: ${OUTPUT_INDEX}\n`);

    console.log('🎉 階層構造品種データ生成完了（v4）！\n');

    // 結果サマリー
    console.log('='.repeat(60));
    console.log('📊 最終レポート');
    console.log('='.repeat(60));
    console.log(`🔢 総投稿数: ${posts.length}件`);
    console.log(`🏷️  検出品種数: ${subSpeciesFiles.length}種`);
    console.log(`✅ 高+中信頼度: ${stats.high + stats.medium}件 (${accuracy}%)`);
    console.log(`❌ 低信頼度: ${stats.low}件`);
    console.log(`❓ 分類不可: ${stats.none}件`);
    console.log('='.repeat(60));
}

main().catch(err => {
    console.error('❌ エラー:', err);
    process.exit(1);
});
