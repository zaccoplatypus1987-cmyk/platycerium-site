#!/usr/bin/env node

/**
 * 階層構造品種データ生成スクリプト v7（品質検査官による修正版）
 *
 * v6からの改善点:
 * 1. フォールバック検索を削除（交配種の誤分類を防止）
 * 2. 交配種判定ロジックを追加（"x"や"×"を含む場合）
 * 3. displayNameとmainSpeciesの整合性チェックを追加
 * 4. 品種カードに最新画像データを追加
 *
 * v7-P0修正:
 * 1. "P " (スペース) パターンを許容
 * 2. ハッシュタグフォールバック検出を追加（日本語のみのキャプション用）
 * 3. "P. " (ドット+スペース) パターンを許容
 * 4. displayName選択ロジックを改善（mainSpeciesと一致するタイトルを優先）
 *
 * 修正内容の詳細: QUALITY-REPORT-HIERARCHICAL-SPECIES.md を参照
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
 */
const VARIETY_NAME_MAPPING = {
    // Willinckii 品種
    'moonlight': 'ムーンライト',
    'moonlightvp': 'ムーンライトvp',
    'moonlight#vp': 'ムーンライトvp',
    'moonlight2': 'ムーンライト2',
    '月光': 'ムーンライト',  // 日本語訳
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
    '伊弉諾': 'イザナギ',  // 日本語→カタカナ
    'gabriel': 'ガブリエル',
    'cv.foongsiqi': 'フォンシキ',
    'foongsiqi': 'フォンシキ',
    'white hawk': 'ホワイトホーク',
    'whitehawk': 'ホワイトホーク',
    'vanorn': 'バノン',
    'van orn': 'バノン',

    // Veitchii 品種
    'lemoinei': 'レモイネイ',
    'silver frond': 'シルバーフロンド',
    'silverfrond': 'シルバーフロンド',
    'wild white': 'ワイルドホワイト',
    'wildwhite': 'ワイルドホワイト',
    'australia': 'オーストラリア',

    // Ridleyi 品種
    'nano': 'ナノ',
    'crested': 'クレステッド',
    'wide frond': 'ワイドフロンド',
    'widefrond': 'ワイドフロンド',
    'narrow': 'ナロー',
    'monkey king': 'モンキーキング',
    'monkeyking': 'モンキーキング',

    // Coronarium 品種
    'waiwai': 'ワイワイ',
    'thin frond': 'シンフロンド',
    'thinfrond': 'シンフロンド',
    'white': 'ホワイト',
    'philippines': 'フィリピン',
    'corona': 'コロナ',
    'corona2': 'コロナ2',

    // Hillii 品種
    'mutant': 'ミュータント',
    'drummond': 'ドラモンド',
    'dragon': 'ドラゴン',
    'groupm': 'グループエム',
    'group m': 'グループエム',
    'king': 'キング',
    'kinggroupm': 'キンググループエム',
    'dwarf': 'ドワーフ',
    'cv.dragon': 'ドラゴン',
    'cv.drummond': 'ドラモンド',

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
    'tricera': 'トリケラ',
    'pegasus': 'ペガサス',
    'neptune': 'ネプチューン',
    'nukul': 'ヌクル',
    'merapi': 'メラピ',
    'mt.lewis': 'マウントルイス',
    'mtlewis': 'マウントルイス',
    'mount lewis': 'マウントルイス',
    'mountlewis': 'マウントルイス',
    '白ルイス': '白ルイス',  // 日本語品種名
    'jenny': 'ジェニー',
    'anne': 'アン',
    'an': 'アン',
    'tobari': 'トバリ',
    'nadare': 'ナダレ',
    'scissorhands': 'シザーハンズ',
    'mada': 'マダ',
    'madagascar': 'マダガスカル',

    // その他の一般的なバリエーション
    'spore': '胞子',
    'thin': 'シン',
    'wide': 'ワイド',
    'wild': 'ワイルド',
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

    // 部分一致も試す
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
 * 【v7修正】交配種判定関数
 * 交配種を示すパターン（"x"や"×"）を検出
 */
function isHybrid(caption) {
    if (!caption) return false;

    const firstLine = caption.split('\n')[0];

    // 交配種を示すパターン
    const hybridPatterns = [
        /\s+x\s+/i,          // "veitchii x coronarium"
        /\s+×\s+/i,          // 全角×
        /\(.*x.*\)/i,        // "(veitchii x bifurcatum)"
        /\(.*×.*\)/i         // 全角×括弧内
    ];

    return hybridPatterns.some(pattern => pattern.test(firstLine));
}

/**
 * キャプション先頭から小分類名を推測（改善版）
 */
function extractVarietyFromCaption(caption) {
    if (!caption) return null;

    const firstLine = caption.split('\n')[0].trim();

    // パターン1: Platycerium species 'variety' (シングルクォート内)
    const quotedMatch = firstLine.match(/['']([^'']+)['']/);
    if (quotedMatch && quotedMatch[1]) {
        return normalizeVarietyName(quotedMatch[1]);
    }

    // パターン2: P.species variety (原種 + バリエーション)
    // 【P0修正】P[\.\s]+ に変更（ドット+スペースも許容）
    const varietyMatch = firstLine.match(/P[\.\s]+([a-zA-Z]+)\s+([^\s\n#]+)/i);
    if (varietyMatch && varietyMatch[2]) {
        return normalizeVarietyName(varietyMatch[2]);
    }

    // パターン3: P.Variety (交配種単独、例: P.Phenomenal, P.Triceratops)
    // 原種18種に該当しない場合のみ抽出
    // 【P0修正】P[\.\s]+ に変更
    const hybridMatch = firstLine.match(/^P[\.\s]+([a-zA-Z]+)/i);
    if (hybridMatch && hybridMatch[1]) {
        const speciesName = hybridMatch[1].toLowerCase();

        // 原種でなければ交配種として扱う
        if (!PURE_SPECIES.includes(speciesName)) {
            return normalizeVarietyName(speciesName);
        }
    }

    // パターン4: Platycerium Variety (先頭にPlatyceriumがある交配種)
    const platyceriumMatch = firstLine.match(/^Platycerium\s+([a-zA-Z]+)/i);
    if (platyceriumMatch && platyceriumMatch[1]) {
        const speciesName = platyceriumMatch[1].toLowerCase();

        // 原種でなければ交配種として扱う
        if (!PURE_SPECIES.includes(speciesName)) {
            return normalizeVarietyName(speciesName);
        }
    }

    return null;
}

/**
 * 【P0修正】ハッシュタグから原種を検出（フォールバック検索）
 * VP16のような日本語のみのキャプション用
 */
function extractSpeciesFromHashtag(caption, hashtags) {
    // キャプションに "P." や "Platycerium" がない場合のみ実行
    if (/^P[\.\s]/.test(caption) || /^Platycerium\s+/i.test(caption)) {
        return null;  // 通常のパターンマッチに任せる
    }

    // ハッシュタグから原種名を検出
    for (const tag of hashtags) {
        const lowerTag = tag.toLowerCase();

        // #platycerium[species] 形式
        for (const species of PURE_SPECIES) {
            if (lowerTag.includes(`platycerium${species}`) ||
                lowerTag.includes(`#${species}`)) {
                return species;
            }
        }

        // 日本語の原種名
        const jaPatterns = {
            'willinckii': /ウィリンキー|ウイリンキー/i,
            'veitchii': /ベイチー|ビーチー|ビィーチー/i,
            'ridleyi': /リドレイ/i,
            'wallichii': /ワリチー/i,
            'quadridichotomum': /クアドリ/i,
            'bifurcatum': /ビフルカツム|ビフルカタム/i,
            'coronarium': /コロナリウム/i,
            'wandae': /ワンダエ/i,
            'hillii': /ヒリー/i,
            'superbum': /スパーバム|スーパーバム/i,
            'grande': /グランデ/i,
            'alcicorne': /アルシコルネ/i
        };

        for (const [species, pattern] of Object.entries(jaPatterns)) {
            if (pattern.test(tag)) {
                return species;
            }
        }
    }

    return null;
}

/**
 * 【v7修正+P0修正】タイトル先頭から大分類（main_species）を正確に抽出
 *
 * 改善点:
 * 1. 交配種パターンを先にチェック（"x"や"×"を含む場合は即座に null を返す）
 * 2. フォールバック検索（パターン3）を削除
 *    - 理由: 交配種の説明文に含まれる原種名を誤検出していた
 *    - 例: "P.Elsa (veitchii x bifurcatum)" → veitchiiを誤検出
 * 3. 【P0修正】"P " (スペース) パターンを許容
 * 4. 【P0修正】"P. " (ドット+スペース) パターンを許容
 * 5. 【P0修正】ハッシュタグフォールバック検出を追加
 */
function detectMainSpecies(caption, hashtags = []) {
    if (!caption) return null;

    // 【v7追加】交配種パターンを先にチェック
    if (isHybrid(caption)) {
        return null;  // 交配種はmainSpecies = null
    }

    const firstLine = caption.split('\n')[0].trim();

    // パターン1: "P.species", "P species", "P. species" 形式（最優先）
    // 【P0修正】^P[.\s] → ^P[\.\s]+ に変更（ドット+スペースも許容）
    const pDotMatch = firstLine.match(/^P[\.\s]+([a-zA-Z]+)/i);
    if (pDotMatch && pDotMatch[1]) {
        const speciesCandidate = pDotMatch[1].toLowerCase();

        // 原種18種に該当するかチェック
        if (PURE_SPECIES.includes(speciesCandidate)) {
            return speciesCandidate;
        }

        // 原種に該当しない場合は null（交雑種）
        return null;
    }

    // パターン2: "Platycerium species" 形式
    const platyceriumMatch = firstLine.match(/^Platycerium\s+([a-zA-Z]+)/i);
    if (platyceriumMatch && platyceriumMatch[1]) {
        const speciesCandidate = platyceriumMatch[1].toLowerCase();

        // 原種18種に該当するかチェック
        if (PURE_SPECIES.includes(speciesCandidate)) {
            return speciesCandidate;
        }

        // 原種に該当しない場合は null（交雑種）
        return null;
    }

    // 【P0追加】パターン3: ハッシュタグから原種を検出（フォールバック）
    const hashtagSpecies = extractSpeciesFromHashtag(firstLine, hashtags);
    if (hashtagSpecies) {
        return hashtagSpecies;
    }

    // 【v7削除】パターン4: フォールバック検索を削除
    // 理由: 交配種の説明文に含まれる原種名を誤検出していた
    // 例: "P.Elsa (veitchii x bifurcatum)" → veitchiiを誤検出
    //
    // フォールバック検索が必要なケース（"P."がない投稿）は
    // ハッシュタグ（#ジサクボ）で分類するため問題なし

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
 * 投稿を分類（v7: 複数品種対応版）
 * 1つの投稿に複数の#ジサクボタグがある場合、それぞれ独立して分類
 */
function classifyPostMultiple(post) {
    const caption = post.caption || '';
    const hashtags = post.hashtags || [];
    const jisakuboTags = extractJisakuboTags(hashtags);
    const mainSpecies = detectMainSpecies(caption, hashtags);  // 【P0修正】hashtagsを渡す
    const captionVariety = extractVarietyFromCaption(caption);

    // ハッシュタグがない場合の処理
    if (jisakuboTags.length === 0) {
        if (captionVariety) {
            return [{
                species: captionVariety,
                jisakuboTag: null,
                confidence: 'low',
                reason: `キャプション「${captionVariety}」のみで分類（ハッシュタグなし）`,
                mainSpecies,
                captionVariety,
                hashtagVariety: null
            }];
        }
        return [];
    }

    // 各#ジサクボタグごとに分類情報を作成
    const classifications = jisakuboTags.map(jisakuboTag => {
        const hashtagVarietyRaw = jisakuboTag.replace(/#ジサクボ/g, '');
        const hashtagVariety = normalizeVarietyName(hashtagVarietyRaw);

        let confidence = 'none';
        let assignedSpecies = hashtagVariety;
        let reason = '';

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
        } else if (captionVariety) {
            confidence = 'low';
            reason = `キャプション抽出成功もハッシュタグと不一致`;
        } else {
            // ハッシュタグのみ（キャプションに小分類名なし）
            if (mainSpecies) {
                // 原種グループに所属
                confidence = 'high';
                reason = `ハッシュタグ+大分類一致（${mainSpecies}）- 信頼性高い`;
            } else {
                // mainSpecies = null → 交雑種として扱う
                // 交雑種もハッシュタグがあれば高信頼度
                confidence = 'high';
                reason = 'ハッシュタグで交雑種を分類（#ジサクボは自己管理タグ）';
            }
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
    });

    return classifications;
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
    console.log('🏗️  階層構造品種データ生成開始（v7 品質検査官による修正版 + P0修正v2）\n');

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

    // v7: 複数品種対応（1投稿が複数品種に分類される）
    let totalClassificationCount = 0;  // 重複カウントを含む分類総数

    posts.forEach(post => {
        const classifications = classifyPostMultiple(post);

        // 複数の分類それぞれを処理
        classifications.forEach(classification => {
            totalClassificationCount++;

            // 統計更新（投稿ごとではなく、分類ごとにカウント）
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
                        mainSpeciesVotes: {},  // mainSpeciesの投票を記録
                        posts: []
                        // displayNameは後で全投稿を見て決定する
                    });
                }

                const group = subSpeciesMap.get(tag);

                // mainSpeciesの投票を記録
                if (classification.mainSpecies) {
                    group.mainSpeciesVotes[classification.mainSpecies] =
                        (group.mainSpeciesVotes[classification.mainSpecies] || 0) + 1;
                }

                group.posts.push({
                    ...post,
                    classification  // 分類情報を追加
                });
            }
        });
    });

    console.log('📊 分類統計（v7 品質検査官修正版 + P0修正v2）\n');
    console.log(`📝 元の投稿数: ${posts.length}件`);
    console.log(`🔢 分類総数（重複含む）: ${totalClassificationCount}件\n`);
    console.log(`✅ 高信頼度（high）: ${stats.high}件 (${(stats.high / totalClassificationCount * 100).toFixed(1)}%)`);
    console.log(`⚠️  中信頼度（medium）: ${stats.medium}件 (${(stats.medium / totalClassificationCount * 100).toFixed(1)}%)`);
    console.log(`❌ 低信頼度（low）: ${stats.low}件 (${(stats.low / totalClassificationCount * 100).toFixed(1)}%)`);
    console.log(`❓ 分類不可（none）: ${stats.none}件 (${(stats.none / totalClassificationCount * 100).toFixed(1)}%)\n`);

    const totalClassified = stats.high + stats.medium + stats.low;
    const accuracy = totalClassified > 0 ? ((stats.high + stats.medium) / totalClassified * 100).toFixed(1) : 0;

    console.log(`🎯 分類精度（高+中）: ${accuracy}%`);
    console.log(`📈 改善履歴:`);
    console.log(`   v3: 27.2% (ベースライン)`);
    console.log(`   v4: 45.0% (+17.8pt - 英日マッピング)`);
    console.log(`   v5: 51.1% (+6.1pt - 抽出ロジック改善)`);
    console.log(`   v6: 76.5% (+25.4pt - 信頼度ロジック最適化)`);
    console.log(`   v7: ${accuracy}% (交配種誤分類修正 + P0修正v2、目標: 80%以上)\n`);

    // 低信頼度データをCSV出力
    if (lowConfidencePosts.length > 0) {
        exportLowConfidenceCSV(lowConfidencePosts);
        console.log(`低信頼度投稿数: ${lowConfidencePosts.length}件`);
    }

    // 小分類JSONファイルを生成
    console.log('\n📝 小分類JSONファイル生成中...\n');
    const subSpeciesFiles = [];

    // 【v7追加】整合性エラーカウンター
    let inconsistencyCount = 0;

    for (const [tag, data] of subSpeciesMap.entries()) {
        const tagId = tag.replace(/#/g, '').toLowerCase();
        const fileName = `${tagId}.json`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        // mainSpeciesの投票結果から最も頻度の高いものを選ぶ
        let determinedMainSpecies = null;
        let maxVotes = 0;
        for (const [species, votes] of Object.entries(data.mainSpeciesVotes || {})) {
            if (votes > maxVotes) {
                maxVotes = votes;
                determinedMainSpecies = species;
            }
        }

        // 【P0修正v2】表示名の決定 - mainSpeciesと一致するタイトルを優先
        let representativeTitle = tag;  // デフォルトはタグ

        // 全投稿のキャプション先頭行を収集
        const firstLines = data.posts
            .map(p => p.caption?.split('\n')[0].trim())
            .filter(line => line && line.length > 0);

        // まず、投票で決まったmainSpeciesと一致するタイトルを抽出
        const matchingLines = [];
        if (determinedMainSpecies) {
            for (const line of firstLines) {
                const lineMainSpecies = detectMainSpecies(line, data.posts[0]?.hashtags || []);
                if (lineMainSpecies === determinedMainSpecies) {
                    matchingLines.push(line);
                }
            }
        }

        if (matchingLines.length > 0) {
            // mainSpeciesが一致するタイトルの中で最も頻度の高いものを選ぶ
            const lineCounts = {};
            matchingLines.forEach(line => {
                lineCounts[line] = (lineCounts[line] || 0) + 1;
            });
            representativeTitle = Object.entries(lineCounts)
                .sort((a, b) => b[1] - a[1])[0][0];
        } else {
            // mainSpeciesが一致するタイトルがない場合、従来のロジック
            // 優先順位1: "P." または "Platycerium" で始まる行
            const platyceriumLines = firstLines.filter(line =>
                line.match(/^(P[\.\s]+|Platycerium\s+)/i)
            );

            if (platyceriumLines.length > 0) {
                // 最も頻度の高いものを選ぶ
                const lineCounts = {};
                platyceriumLines.forEach(line => {
                    lineCounts[line] = (lineCounts[line] || 0) + 1;
                });
                representativeTitle = Object.entries(lineCounts)
                    .sort((a, b) => b[1] - a[1])[0][0];
            } else if (firstLines.length > 0) {
                // 優先順位2: 最も頻度の高い先頭行
                const lineCounts = {};
                firstLines.forEach(line => {
                    lineCounts[line] = (lineCounts[line] || 0) + 1;
                });
                representativeTitle = Object.entries(lineCounts)
                    .sort((a, b) => b[1] - a[1])[0][0];
            }
        }

        // 【v7追加+P0修正】displayNameからmainSpeciesを再検証
        // hashtagsを渡すために最初の投稿のhashtagsを使用
        const firstPostHashtags = data.posts[0]?.hashtags || [];
        const displayNameMainSpecies = detectMainSpecies(representativeTitle, firstPostHashtags);

        if (displayNameMainSpecies && displayNameMainSpecies !== determinedMainSpecies) {
            console.warn(`⚠️ mainSpecies不整合検出: ${tag}`);
            console.warn(`   投票結果: ${determinedMainSpecies || 'null'}`);
            console.warn(`   displayName由来: ${displayNameMainSpecies}`);
            console.warn(`   displayName: ${representativeTitle}`);
            console.warn(`   → 投票結果のmainSpeciesを維持します（displayNameを再選択）\n`);

            inconsistencyCount++;

            // 【P0修正v2】投票結果を優先し、displayNameを再選択
            // mainSpeciesが一致するタイトルを再度探す
            const correctLines = [];
            for (const line of firstLines) {
                const lineMainSpecies = detectMainSpecies(line, firstPostHashtags);
                if (lineMainSpecies === determinedMainSpecies) {
                    correctLines.push(line);
                }
            }

            if (correctLines.length > 0) {
                const lineCounts = {};
                correctLines.forEach(line => {
                    lineCounts[line] = (lineCounts[line] || 0) + 1;
                });
                representativeTitle = Object.entries(lineCounts)
                    .sort((a, b) => b[1] - a[1])[0][0];
                console.warn(`   → 修正後displayName: ${representativeTitle}\n`);
            }
        }

        // 【v7追加】交配種の場合はmainSpecies = null
        if (determinedMainSpecies && !PURE_SPECIES.includes(determinedMainSpecies)) {
            console.warn(`⚠️ 不正なmainSpecies検出: ${tag}`);
            console.warn(`   mainSpecies: ${determinedMainSpecies} (原種18種に該当しない)`);
            console.warn(`   → null に修正します\n`);
            determinedMainSpecies = null;
        }

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

        // 【v7追加】最新投稿の情報を取得
        const latestPost = data.posts.length > 0 ? data.posts[0] : null;

        const output = {
            species: {
                id: tagId,
                mainSpecies: determinedMainSpecies,
                tag: tag,
                displayName: representativeTitle,
                count: data.posts.length,
                // 【v7追加】最新投稿の情報
                latestPost: latestPost ? {
                    id: latestPost.id,
                    date: latestPost.date,
                    image: latestPost.images?.[0]?.path || null,
                    caption: latestPost.caption?.split('\n')[0].substring(0, 100)
                } : null
            },
            posts: formattedPosts
        };

        fs.writeFileSync(filePath, JSON.stringify(output, null, 2));

        subSpeciesFiles.push({
            id: tagId,
            tag: tag,
            mainSpecies: determinedMainSpecies,
            displayName: representativeTitle,
            count: data.posts.length,
            file: fileName,
            // 【v7追加】最新投稿の画像
            latestImage: latestPost?.images?.[0]?.path || null,
            latestPostDate: latestPost?.date || null
        });
    }

    console.log(`✅ ${subSpeciesFiles.length}件の小分類JSONファイルを生成\n`);

    if (inconsistencyCount > 0) {
        console.log(`🔧 mainSpecies不整合を ${inconsistencyCount}件 修正しました\n`);
    }

    // 階層構造データを生成（HTML互換性のため）
    // mainSpeciesでグループ化
    const speciesGroups = new Map();

    subSpeciesFiles.forEach(s => {
        if (s.mainSpecies && PURE_SPECIES.includes(s.mainSpecies)) {
            // 原種18種に該当する場合、mainSpeciesでグループ化
            if (!speciesGroups.has(s.mainSpecies)) {
                speciesGroups.set(s.mainSpecies, {
                    mainSpecies: s.mainSpecies,
                    subSpecies: [],
                    totalPosts: 0
                });
            }
            const group = speciesGroups.get(s.mainSpecies);
            group.subSpecies.push({
                id: s.id,
                tag: s.tag,
                displayName: s.displayName,
                count: s.count,
                file: s.file,
                latestImage: s.latestImage  // 【v7追加】
            });
            group.totalPosts += s.count;
        } else {
            // 原種18種に該当しない場合、個別の交配種として扱う
            speciesGroups.set(s.id, {
                mainSpecies: null,
                subSpecies: [],
                totalPosts: s.count,
                speciesData: s
            });
        }
    });

    // 日本語名マッピング
    const speciesNameMap = {
        'willinckii': 'ウィリンキー',
        'veitchii': 'ビーチー',
        'coronarium': 'コロナリウム',
        'ridleyi': 'リドレイ',
        'hillii': 'ヒリー',
        'bifurcatum': 'ビフルカツム',
        'wandae': 'ワンダエ',
        'superbum': 'スパーバム',
        'alcicorne': 'アルシコルネ',
        'elephantotis': 'エレファントティス',
        'madagascariense': 'マダガスカリエンセ',
        'ellisii': 'エリシー',
        'holttumii': 'ホルタミー',
        'stemaria': 'ステマリア',
        'andinum': 'アンディナム',
        'quadridichotomum': 'クアドリディコトマム',
        'grande': 'グランデ',
        'wallichii': 'ワリチー'
    };

    // hierarchy配列を生成
    const hierarchyData = Array.from(speciesGroups.entries()).map(([key, group]) => {
        if (group.mainSpecies) {
            // 原種
            return {
                id: group.mainSpecies,
                name: group.mainSpecies,
                nameJa: speciesNameMap[group.mainSpecies] || group.mainSpecies,
                type: 'pure',
                totalPosts: group.totalPosts,
                subSpeciesCount: group.subSpecies.length,
                subSpecies: group.subSpecies.sort((a, b) => b.count - a.count)
            };
        } else {
            // 交配種（個別）
            const s = group.speciesData;
            return {
                id: s.id,
                tag: s.tag,
                name: s.displayName,
                nameJa: s.displayName,
                type: 'hybrid',
                totalPosts: s.count,
                subSpeciesCount: 0,
                file: s.file,
                latestImage: s.latestImage  // 【v7追加】
            };
        }
    }).sort((a, b) => b.totalPosts - a.totalPosts);

    // インデックスファイル生成
    const indexData = {
        meta: {
            generated: new Date().toISOString(),
            version: '7.0-FIXED-P0-v2',
            description: '品質検査官による修正版（交配種誤分類修正、画像データ追加、P0修正v2）',
            totalSpecies: subSpeciesFiles.length,
            totalPosts: posts.length,
            totalClassifications: totalClassificationCount,  // v7: 分類総数（重複含む）
            classificationStats: stats,
            accuracy: parseFloat(accuracy),
            improvements: {
                v3: '27.2%',
                v4: '45.0%',
                v5: '51.1%',
                v6: '76.5%',
                v7: `${accuracy}% (交配種誤分類修正 + P0修正v2)`,
                target: '80%+'
            },
            qualityMetrics: {
                inconsistencyFixed: inconsistencyCount,
                hybridDetection: 'improved',
                imageDataAdded: true,
                p0Fixes: 'space pattern + dot-space pattern + hashtag fallback + displayName priority'
            }
        },
        species: subSpeciesFiles.sort((a, b) => b.count - a.count),
        hierarchy: hierarchyData  // HTML互換性のため追加
    };

    fs.writeFileSync(OUTPUT_INDEX, JSON.stringify(indexData, null, 2));
    console.log(`✅ インデックスファイル生成: ${OUTPUT_INDEX}\n`);

    console.log('🎉 階層構造品種データ生成完了（v7 品質検査官修正版 + P0修正v2）！\n');

    // 結果サマリー
    console.log('='.repeat(70));
    console.log('📊 最終レポート（v7 品質検査官修正版 + P0修正v2）');
    console.log('='.repeat(70));
    console.log(`📝 元の投稿数: ${posts.length}件`);
    console.log(`🔢 分類総数（重複含む）: ${totalClassificationCount}件`);
    console.log(`🏷️  検出品種数: ${subSpeciesFiles.length}種`);
    console.log(`✅ 高+中信頼度: ${stats.high + stats.medium}件 (${accuracy}%)`);
    console.log(`   - 高信頼度: ${stats.high}件`);
    console.log(`   - 中信頼度: ${stats.medium}件`);
    console.log(`❌ 低信頼度: ${stats.low}件 (${(stats.low / totalClassificationCount * 100).toFixed(1)}%)`);
    console.log(`❓ 分類不可: ${stats.none}件 (${(stats.none / totalClassificationCount * 100).toFixed(1)}%)`);
    console.log(`🔧 mainSpecies不整合修正: ${inconsistencyCount}件`);
    console.log('='.repeat(70));

    if (parseFloat(accuracy) >= 80) {
        console.log('\n🎊 目標達成！精度80%以上を達成しました！');
        console.log('💡 v7では交配種の誤分類を修正し、P0修正v2で原種検出精度を向上しました');
    } else if (parseFloat(accuracy) >= 70) {
        console.log('\n✅ 目標達成！精度70%以上を達成しました！');
        console.log(`💪 80%まであと ${(80 - parseFloat(accuracy)).toFixed(1)}pt`);
    } else {
        console.log(`\n⚠️  目標まであと ${(70 - parseFloat(accuracy)).toFixed(1)}pt`);
    }

    console.log('\n📋 詳細レポート: QUALITY-REPORT-HIERARCHICAL-SPECIES.md を参照');
}

main().catch(err => {
    console.error('❌ エラー:', err);
    process.exit(1);
});
