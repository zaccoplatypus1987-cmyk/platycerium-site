#!/usr/bin/env node

/**
 * ハッシュタグ「#ジサクボ〇〇」分析スクリプト
 * 全投稿から「#ジサクボ」系ハッシュタグを抽出し、品種紐付けに使用
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// パス設定
const DATA_DIR = path.join(__dirname, '../data');
const POSTS_FILE = path.join(DATA_DIR, 'instagram-posts.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'jisakubo-tags-analysis.json');

/**
 * ハッシュタグから「#ジサクボ〇〇」パターンを抽出
 * 注意: Instagram JSONではハッシュタグ配列に#記号が含まれていない
 */
function extractJisakuboTags(hashtags) {
    if (!Array.isArray(hashtags)) return [];

    return hashtags.filter(tag => {
        // #記号なしでチェック
        return tag.includes('ジサクボ');
    }).map(tag => {
        // 出力時に#を付与（統一性のため）
        return tag.startsWith('#') ? tag : `#${tag}`;
    });
}

/**
 * ジサクボタグから品種IDを生成
 * 例: "#ジサクボムーンライト" → "moonlight"
 */
function normalizeSpeciesId(jisakuboTag) {
    // "#ジサクボ" を除去
    const speciesName = jisakuboTag.replace(/#?ジサクボ/g, '');

    // カタカナ→英語の変換マップ
    const kanaToEnglish = {
        'ムーンライト': 'moonlight',
        'ムーンライト2': 'moonlight-2',
        'ムーンライト３': 'moonlight-3',
        'スマーフ': 'smurf',
        'ブルークイーン': 'blue-queen',
        'イザナギ': 'izanagi',
        'ナノ': 'nano',
        'ワイワイ': 'waiwai',
        'ピンホイール': 'pinwheel',
        'マウントルイス': 'mount-lewis',
        'レモイネイ': 'lemoinei',
        'ホワイトホーク': 'white-hawk',
        'セルソタツタ': 'celso-tatsuta',
        'フェノメナル': 'phenomenal',
        'ヌクル': 'nukul',
        'トリケラ': 'tricera',
        'マダ': 'mada',
        'ガブリエル': 'gabriel',
        'キンググループエム': 'king-group-m'
    };

    // カタカナマッチング
    for (const [kana, english] of Object.entries(kanaToEnglish)) {
        if (speciesName.includes(kana)) {
            return english;
        }
    }

    // 特殊文字を削除・正規化
    const normalized = speciesName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[（）()]/g, '')
        .replace(/[・]/g, '-')
        .replace(/[^\w\-ぁ-んァ-ヶー一-龯]/g, '');

    return normalized;
}

/**
 * タイトルから大分類（main species）を推測
 */
function detectMainSpecies(title) {
    if (!title) return null;

    const lowerTitle = title.toLowerCase();

    // 主要品種パターン
    const patterns = {
        'willinckii': /willinckii|ウィリンキー/i,
        'veitchii': /veitchii|ビーチー|ビィーチー/i,
        'ridleyi': /ridleyi|リドレイ/i,
        'coronarium': /coronarium|コロナリウム/i,
        'wandae': /wandae|ワンダエ/i,
        'superbum': /superbum|スパーバム/i,
        'hillii': /hillii|ヒリー/i,
        'alcicorne': /alcicorne|アルシコルネ/i,
        'elephantotis': /elephantotis|エレファントティス/i,
        'ellisii': /ellisii|エリシー/i,
        'grande': /grande|グランデ/i,
        'holttumii': /holttumii|ホルタミー/i,
        'stemaria': /stemaria|ステマリア/i,
        'andinum': /andinum|アンディナム/i,
        'quadridichotomum': /quadridichotomum|クアドリディコトマム/i,
        'wallichii': /wallichii|ワリチー/i,
        'bifurcatum': /bifurcatum|ビフルカツム/i
    };

    for (const [species, pattern] of Object.entries(patterns)) {
        if (pattern.test(lowerTitle)) {
            return species;
        }
    }

    return null;
}

/**
 * 投稿から品種情報を抽出
 */
function extractSpeciesInfo(post) {
    // タイトルの最初の行
    const title = post.caption || '';
    const firstLine = title.split('\n')[0].trim();

    // ハッシュタグから「#ジサクボ〇〇」を抽出
    const jisakuboTags = extractJisakuboTags(post.hashtags || []);

    // 大分類を推測
    const mainSpecies = detectMainSpecies(title);

    // 品種IDを生成
    let subSpeciesId = null;
    if (jisakuboTags.length > 0) {
        subSpeciesId = normalizeSpeciesId(jisakuboTags[0]);
    }

    return {
        postId: post.id,
        date: post.date,
        displayName: firstLine || 'タイトルなし',
        mainSpecies: mainSpecies,
        subSpeciesId: subSpeciesId,
        jisakuboTags: jisakuboTags,
        allHashtags: post.hashtags || []
    };
}

/**
 * メイン処理
 */
async function main() {
    console.log('🔍 ハッシュタグ「#ジサクボ〇〇」分析開始...\n');

    // データ読み込み（デコードなし - デコードでハッシュタグが消える可能性を排除）
    const rawData = fs.readFileSync(POSTS_FILE, 'utf-8');
    const data = JSON.parse(rawData);
    const posts = data.posts || [];

    console.log(`✅ 投稿データ読み込み: ${posts.length}件\n`);

    // 分析
    const analysis = {
        totalPosts: posts.length,
        jisakuboTagsFound: 0,
        uniqueJisakuboTags: new Set(),
        mainSpeciesCounts: {},
        subSpeciesCounts: {},
        tagToPostsMap: {},
        postsWithJisakubo: [],
        postsWithoutMainSpecies: []
    };

    posts.forEach(post => {
        const info = extractSpeciesInfo(post);

        // ジサクボタグがある投稿
        if (info.jisakuboTags.length > 0) {
            analysis.jisakuboTagsFound++;
            analysis.postsWithJisakubo.push(info);

            info.jisakuboTags.forEach(tag => {
                analysis.uniqueJisakuboTags.add(tag);

                if (!analysis.tagToPostsMap[tag]) {
                    analysis.tagToPostsMap[tag] = [];
                }
                analysis.tagToPostsMap[tag].push({
                    id: post.id,
                    date: post.date,
                    title: info.displayName
                });
            });

            // 小分類カウント
            if (info.subSpeciesId) {
                analysis.subSpeciesCounts[info.subSpeciesId] =
                    (analysis.subSpeciesCounts[info.subSpeciesId] || 0) + 1;
            }
        }

        // 大分類カウント
        if (info.mainSpecies) {
            analysis.mainSpeciesCounts[info.mainSpecies] =
                (analysis.mainSpeciesCounts[info.mainSpecies] || 0) + 1;
        } else if (info.jisakuboTags.length === 0) {
            // ジサクボタグもなく、大分類も不明な場合のみカウント
            analysis.postsWithoutMainSpecies.push({
                id: post.id,
                date: post.date,
                title: info.displayName,
                hashtags: post.hashtags
            });
        }
    });

    // 結果サマリー
    console.log('📊 分析結果\n');
    console.log(`総投稿数: ${analysis.totalPosts}`);
    console.log(`「#ジサクボ〇〇」を含む投稿: ${analysis.jisakuboTagsFound}件`);
    console.log(`ユニークな「#ジサクボ〇〇」タグ: ${analysis.uniqueJisakuboTags.size}種類\n`);

    // ジサクボタグ一覧（上位30件）
    console.log('🏷️  検出された「#ジサクボ〇〇」タグ（上位30件）:\n');
    const sortedTags = Array.from(analysis.uniqueJisakuboTags)
        .map(tag => ({
            tag: tag,
            count: analysis.tagToPostsMap[tag].length,
            speciesId: normalizeSpeciesId(tag)
        }))
        .sort((a, b) => b.count - a.count);

    sortedTags.slice(0, 30).forEach(({ tag, count, speciesId }) => {
        console.log(`  ${tag} → "${speciesId}" (${count}件)`);
    });

    console.log('\n📁 大分類（Main Species）:\n');
    const sortedMainSpecies = Object.entries(analysis.mainSpeciesCounts)
        .sort((a, b) => b[1] - a[1]);
    sortedMainSpecies.forEach(([species, count]) => {
        console.log(`  ${species}: ${count}件`);
    });

    console.log(`\n⚠️  大分類が不明でジサクボタグもない投稿: ${analysis.postsWithoutMainSpecies.length}件\n`);

    // 結果をJSON出力
    const output = {
        meta: {
            analyzedAt: new Date().toISOString(),
            totalPosts: analysis.totalPosts,
            jisakuboPostsCount: analysis.jisakuboTagsFound,
            uniqueTagsCount: analysis.uniqueJisakuboTags.size
        },
        jisakuboTags: sortedTags.map(({ tag, speciesId, count }) => ({
            tag: tag,
            speciesId: speciesId,
            count: count,
            posts: analysis.tagToPostsMap[tag]
        })),
        mainSpecies: sortedMainSpecies.map(([species, count]) => ({
            id: species,
            count: count
        })),
        subSpecies: Object.entries(analysis.subSpeciesCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([id, count]) => ({ id, count })),
        postsWithoutMainSpecies: analysis.postsWithoutMainSpecies.slice(0, 20) // 最初の20件のみ
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`✅ 分析結果を保存: ${OUTPUT_FILE}\n`);
}

main().catch(console.error);
