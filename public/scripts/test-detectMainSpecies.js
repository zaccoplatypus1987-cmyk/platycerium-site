#!/usr/bin/env node

/**
 * detectMainSpecies() のテストスクリプト
 * 品質検査官が指摘した問題が修正されているか確認
 */

// 原種18種の定義
const PURE_SPECIES = [
    'bifurcatum', 'willinckii', 'coronarium', 'ridleyi', 'wandae', 'superbum',
    'veitchii', 'hillii', 'alcicorne', 'elephantotis', 'ellisii', 'holttumii',
    'stemaria', 'andinum', 'quadridichotomum', 'grande', 'wallichii', 'madagascariense'
];

/**
 * タイトル先頭から大分類（main_species）を正確に抽出
 * ユーザー命名規則: "P.[main_species] [variety_name]"
 */
function detectMainSpecies(caption) {
    if (!caption) return null;

    const firstLine = caption.split('\n')[0].trim();

    // パターン1: "P.species" 形式（最優先）
    const pDotMatch = firstLine.match(/^P\.([a-zA-Z]+)/i);
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

    // パターン3: 日本語品種名のみの場合、フォールバック検索
    const lowerCaption = caption.toLowerCase();
    const jaPatterns = {
        'willinckii': /ウィリンキー/i,
        'veitchii': /ビーチー|ビィーチー/i,
        'coronarium': /コロナリウム/i,
        'ridleyi': /リドレイ/i,
        'hillii': /ヒリー/i,
        'bifurcatum': /ビフルカツム/i,
        'wandae': /ワンダエ/i,
        'superbum': /スパーバム/i,
        'alcicorne': /アルシコルネ/i,
        'elephantotis': /エレファントティス/i,
        'madagascariense': /マダガスカリエンセ/i,
        'ellisii': /エリシー/i,
        'holttumii': /ホルタミー/i,
        'stemaria': /ステマリア/i,
        'andinum': /アンディナム/i,
        'quadridichotomum': /クアドリディコトマム/i,
        'grande': /グランデ/i,
        'wallichii': /ワリチー/i
    };

    for (const [species, pattern] of Object.entries(jaPatterns)) {
        if (pattern.test(lowerCaption)) {
            return species;
        }
    }

    return null;
}

// テストケース
const testCases = [
    {
        name: 'ケース1: 原種 + 品種名',
        caption: 'P.willinckii 伊弉諾\nfrom @big_bell.plants_aqua',
        expected: 'willinckii',
        reason: '原種18種に該当するwillinckiiを返す'
    },
    {
        name: 'ケース2: 交雑種（原種18種に該当しない）',
        caption: 'P.マウントキッチャクード\n美しい交配種',
        expected: null,
        reason: 'マウントキッチャクードは原種18種に該当しないのでnull'
    },
    {
        name: 'ケース3: 交雑種（Elsa）',
        caption: 'P.Elsa (willinckii x bifurcatum)\n最高の交配種',
        expected: null,
        reason: 'Elsaは原種18種に該当しないのでnull'
    },
    {
        name: 'ケース4: 原種（ナノ）',
        caption: 'P.ridleyi nano\n小型の原種',
        expected: 'ridleyi',
        reason: '原種18種に該当するridleyiを返す'
    },
    {
        name: 'ケース5: 日本語のみ',
        caption: 'ビカクシダ ウィリンキー ムーンライト\n綺麗',
        expected: 'willinckii',
        reason: 'フォールバック検索でウィリンキーを検出'
    },
    {
        name: 'ケース6: 交雑種（複数原種名が含まれる）',
        caption: 'P.Durval Nunes (bifurcatum x veitchii)\n素晴らしい',
        expected: null,
        reason: 'Durval Nunesは原種18種に該当しないのでnull'
    },
    {
        name: 'ケース7: Platycerium形式の原種',
        caption: 'Platycerium bifurcatum\nネザーランド産',
        expected: 'bifurcatum',
        reason: 'Platycerium形式でも原種を検出'
    },
    {
        name: 'ケース8: 交雑種（White Gizmo）',
        caption: 'P.White gizmo\nfrom Thailand',
        expected: null,
        reason: 'Whiteは原種18種に該当しないのでnull'
    },
    {
        name: 'ケース9: 交雑種（Phenomenal）',
        caption: 'P.Phenomenal\nすごい株',
        expected: null,
        reason: 'Phenomenalは原種18種に該当しないのでnull'
    },
    {
        name: 'ケース10: 原種（veitchii）',
        caption: 'P.veitchii "King Fisher"\n美しい',
        expected: 'veitchii',
        reason: '原種18種に該当するveitchiiを返す'
    }
];

// テスト実行
console.log('🧪 detectMainSpecies() テスト実行\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
    const result = detectMainSpecies(test.caption);
    const isPass = result === test.expected;

    if (isPass) {
        passed++;
        console.log(`✅ ${test.name}`);
        console.log(`   キャプション: "${test.caption.split('\n')[0]}"`);
        console.log(`   期待値: ${test.expected} / 結果: ${result}`);
        console.log(`   理由: ${test.reason}\n`);
    } else {
        failed++;
        console.log(`❌ ${test.name}`);
        console.log(`   キャプション: "${test.caption.split('\n')[0]}"`);
        console.log(`   期待値: ${test.expected} / 結果: ${result}`);
        console.log(`   理由: ${test.reason}`);
        console.log(`   🔴 テスト失敗！\n`);
    }
});

console.log('='.repeat(80));
console.log(`📊 テスト結果: ${passed}/${testCases.length} 成功`);

if (failed === 0) {
    console.log('\n🎉 すべてのテストに合格しました！');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${failed}件のテストが失敗しました`);
    process.exit(1);
}
