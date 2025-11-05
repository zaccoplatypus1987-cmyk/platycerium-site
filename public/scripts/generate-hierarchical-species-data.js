#!/usr/bin/env node

/**
 * 階層構造品種データ生成スクリプト
 * Level 1（大分類）→ Level 2（小分類: #ジサクボ〇〇）の階層構造を構築
 *
 * 分類方針:
 * - 原種18種: 独立したカテゴリとして表示
 * - 交配種: 原種18種以外をすべて "Hybrids" カテゴリにまとめる
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
 * ハッシュタグから「#ジサクボ〇〇」を抽出
 */
function extractJisakuboTags(hashtags) {
    if (!Array.isArray(hashtags)) return [];
    return hashtags.filter(tag => tag.includes('ジサクボ'))
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`);
}

/**
 * タイトルから大分類を推測
 */
function detectMainSpecies(title) {
    if (!title) return null;
    const lowerTitle = title.toLowerCase();

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
        if (pattern.test(lowerTitle)) {
            // 原種18種に含まれる場合のみ返す
            if (PURE_SPECIES.includes(species)) {
                return species;
            }
        }
    }

    return null; // 原種18種に該当しない場合はnull（交配種として扱う）
}

/**
 * 品種名の日本語表示名マッピング
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
 * メイン処理
 */
async function main() {
    console.log('🏗️  階層構造品種データ生成開始...\n');

    // データ読み込み
    const postsData = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
    const analysisData = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf-8'));
    const posts = postsData.posts || [];

    console.log(`✅ 投稿データ: ${posts.length}件`);
    console.log(`✅ ジサクボタグ: ${analysisData.meta.uniqueTagsCount}種類\n`);

    // 大分類ごとにグループ化
    const mainSpeciesMap = new Map();

    // 小分類（ジサクボタグ）ごとにグループ化
    const subSpeciesMap = new Map();

    posts.forEach(post => {
        const title = post.caption || '';
        const firstLine = title.split('\n')[0].trim();
        const jisakuboTags = extractJisakuboTags(post.hashtags || []);
        const mainSpecies = detectMainSpecies(title);

        // 原種18種の場合は対応する大分類に追加
        if (mainSpecies) {
            if (!mainSpeciesMap.has(mainSpecies)) {
                mainSpeciesMap.set(mainSpecies, {
                    id: mainSpecies,
                    name: mainSpecies.charAt(0).toUpperCase() + mainSpecies.slice(1),
                    nameJa: SPECIES_NAMES_JA[mainSpecies] || mainSpecies,
                    type: 'pure',
                    posts: [],
                    subSpecies: new Set()
                });
            }
            mainSpeciesMap.get(mainSpecies).posts.push(post);
        }

        // 小分類（ジサクボタグ）に追加
        jisakuboTags.forEach(tag => {
            if (!subSpeciesMap.has(tag)) {
                subSpeciesMap.set(tag, {
                    tag: tag,
                    mainSpecies: mainSpecies, // 原種の場合は品種名、交配種の場合はnull
                    posts: [],
                    displayName: firstLine || tag
                });
            }
            subSpeciesMap.get(tag).posts.push(post);

            // 大分類に小分類を紐付け（原種の場合のみ）
            if (mainSpecies && mainSpeciesMap.has(mainSpecies)) {
                mainSpeciesMap.get(mainSpecies).subSpecies.add(tag);
            }
        });
    });

    console.log('📊 階層構造構築完了\n');
    console.log(`原種（Pure Species）: ${mainSpeciesMap.size}種類`);
    console.log(`小分類（全体）: ${subSpeciesMap.size}種類\n`);

    // 小分類JSONファイルを生成
    console.log('📝 小分類JSONファイル生成中...\n');
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
            metadata: p.metadata
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
            file: `species/${fileName}`
        });

        if (subSpeciesFiles.length % 10 === 0) {
            console.log(`  ✓ ${subSpeciesFiles.length}/${subSpeciesMap.size} ファイル生成完了`);
        }
    }

    console.log(`✅ 小分類JSONファイル生成完了: ${subSpeciesFiles.length}件\n`);

    // 階層構造インデックスを生成
    console.log('📚 階層構造インデックス生成中...\n');
    const hierarchy = [];

    // 原種18種の階層構造
    for (const [mainId, mainData] of mainSpeciesMap.entries()) {
        // この大分類に属する小分類を取得
        const subSpeciesList = subSpeciesFiles.filter(sub =>
            sub.mainSpecies === mainId
        ).sort((a, b) => b.count - a.count);

        hierarchy.push({
            id: mainId,
            name: mainData.name,
            nameJa: mainData.nameJa,
            type: 'pure',
            totalPosts: mainData.posts.length,
            subSpeciesCount: subSpeciesList.length,
            subSpecies: subSpeciesList
        });
    }

    // 投稿数でソート
    hierarchy.sort((a, b) => b.totalPosts - a.totalPosts);

    // 交配種カテゴリ（原種18種に該当しない小分類をまとめる）
    const hybridSubSpecies = subSpeciesFiles.filter(sub => !sub.mainSpecies);
    if (hybridSubSpecies.length > 0) {
        const hybridTotalPosts = hybridSubSpecies.reduce((sum, s) => sum + s.count, 0);

        hierarchy.push({
            id: 'hybrids',
            name: 'Hybrids',
            nameJa: '交配種・交雑種',
            type: 'hybrid',
            totalPosts: hybridTotalPosts,
            subSpeciesCount: hybridSubSpecies.length,
            subSpecies: hybridSubSpecies.sort((a, b) => b.count - a.count)
        });

        console.log(`\n🧬 交配種カテゴリ作成:`);
        console.log(`  品種数: ${hybridSubSpecies.length}種類`);
        console.log(`  投稿数: ${hybridTotalPosts}件`);
    }

    const indexOutput = {
        meta: {
            generatedAt: new Date().toISOString(),
            totalMainSpecies: mainSpeciesMap.size,
            totalHybridSpecies: hybridSubSpecies.length,
            totalSubSpecies: subSpeciesMap.size,
            totalPosts: posts.length
        },
        hierarchy: hierarchy
    };

    fs.writeFileSync(OUTPUT_INDEX, JSON.stringify(indexOutput, null, 2));
    console.log(`\n✅ 階層構造インデックス保存: ${OUTPUT_INDEX}\n`);

    // サマリー表示
    console.log('🎉 生成完了サマリー\n');
    console.log('原種18種（Pure Species）:');
    hierarchy.filter(h => h.type === 'pure').slice(0, 18).forEach(main => {
        console.log(`  ${main.nameJa} (${main.name}): ${main.totalPosts}件 → ${main.subSpeciesCount}品種`);
    });

    console.log('\n交配種（Hybrids）:');
    const hybridCategory = hierarchy.find(h => h.type === 'hybrid');
    if (hybridCategory) {
        console.log(`  ${hybridCategory.nameJa}: ${hybridCategory.totalPosts}件 → ${hybridCategory.subSpeciesCount}品種`);
        console.log('\n  代表的な交配種（上位10）:');
        hybridCategory.subSpecies.slice(0, 10).forEach(sub => {
            console.log(`    - ${sub.displayName} (${sub.count}件)`);
        });
    }

    // 統計情報
    console.log('\n📊 統計情報:');
    console.log(`  原種18種の投稿総数: ${hierarchy.filter(h => h.type === 'pure').reduce((sum, h) => sum + h.totalPosts, 0)}件`);
    console.log(`  交配種の投稿総数: ${hybridCategory ? hybridCategory.totalPosts : 0}件`);
    console.log(`  全体の投稿総数: ${posts.length}件`);
}

main().catch(console.error);
