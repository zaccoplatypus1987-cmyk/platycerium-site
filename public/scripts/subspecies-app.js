/**
 * subspecies-app.js
 * 園芸品種一覧ページのロジック
 *
 * URL: /species/subspecies.html?parent=willinckii
 *
 * 機能:
 * 1. URLパラメータから原種ID（または'hybrid'）を取得
 * 2. species-hierarchy-index.json から該当原種の園芸品種を取得
 * 3. 園芸品種カードを生成
 * 4. 各カードは detail.html?id=ジサクボ〇〇 にリンク
 */

// 原種名の日本語マッピング
const speciesNameMap = {
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
    'hybrid': '交配種'
};

// URLパラメータから原種IDを取得
const urlParams = new URLSearchParams(window.location.search);
const parentId = urlParams.get('parent');

console.log('Parent ID from URL:', parentId);

/**
 * 園芸品種データを読み込んで表示
 */
async function loadSubspecies() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const subspeciesSection = document.getElementById('subspecies-section');
    const subspeciesGrid = document.getElementById('subspecies-grid');

    const parentTitle = document.getElementById('parent-title');
    const parentSubtitle = document.getElementById('parent-subtitle');
    const parentDescription = document.getElementById('parent-description');
    const breadcrumbCurrent = document.getElementById('breadcrumb-current');

    // パラメータチェック
    if (!parentId) {
        loading.classList.add('hidden');
        error.classList.remove('hidden');
        error.querySelector('p').textContent = '原種IDが指定されていません';
        return;
    }

    try {
        // データ読み込み
        const response = await fetch('/data/species-hierarchy-index.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: データの読み込みに失敗しました`);
        }

        const data = await response.json();
        console.log('Loaded hierarchy data:', data);

        // 交配種の場合
        if (parentId === 'hybrid') {
            await loadHybridSpecies(data);
            return;
        }

        // 該当する原種を探す
        const parentSpecies = data.hierarchy.find(item => item.id === parentId);

        if (!parentSpecies) {
            throw new Error(`指定された原種 "${parentId}" が見つかりません`);
        }

        console.log('Found parent species:', parentSpecies);

        // 原種名の日本語表示
        const parentNameJa = speciesNameMap[parentId] || parentSpecies.nameJa || parentId;
        const parentNameEn = 'P. ' + (parentSpecies.name || parentId);

        // ヘッダー情報を更新
        parentTitle.textContent = `${parentNameJa} の園芸品種`;
        parentSubtitle.textContent = parentNameEn;
        parentDescription.textContent = `${parentSpecies.subSpeciesCount}品種 / ${parentSpecies.totalPosts}件の投稿`;
        breadcrumbCurrent.textContent = parentNameEn;

        // ページタイトル更新
        document.getElementById('page-title').textContent = `${parentNameJa}の園芸品種 - Platycerium Collection`;
        document.getElementById('og-title').setAttribute('content', `${parentNameJa}の園芸品種 - Platycerium Collection`);
        document.getElementById('twitter-title').setAttribute('content', `${parentNameJa}の園芸品種 - Platycerium Collection`);

        // 園芸品種リストを取得
        const subspeciesList = parentSpecies.subSpecies || [];

        if (subspeciesList.length === 0) {
            subspeciesGrid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <p class="text-gray-500 text-lg">この原種に分類された園芸品種はまだ登録されていません</p>
                    <a href="/species/" class="inline-block mt-4 text-forest-mid hover:text-forest-dark transition-colors">
                        品種一覧に戻る
                    </a>
                </div>
            `;
            loading.classList.add('hidden');
            subspeciesSection.classList.remove('hidden');
            return;
        }

        // 園芸品種カードを生成
        renderSubspeciesCards(subspeciesList);

        loading.classList.add('hidden');
        subspeciesSection.classList.remove('hidden');

        console.log(`Successfully loaded ${subspeciesList.length} subspecies`);

    } catch (err) {
        console.error('データ読み込みエラー:', err);
        loading.classList.add('hidden');
        error.classList.remove('hidden');
        error.querySelector('p').textContent = `エラー: ${err.message}`;
    }
}

/**
 * 交配種一覧を表示
 */
async function loadHybridSpecies(data) {
    const loading = document.getElementById('loading');
    const subspeciesSection = document.getElementById('subspecies-section');
    const subspeciesGrid = document.getElementById('subspecies-grid');

    const parentTitle = document.getElementById('parent-title');
    const parentSubtitle = document.getElementById('parent-subtitle');
    const parentDescription = document.getElementById('parent-description');
    const breadcrumbCurrent = document.getElementById('breadcrumb-current');

    // hierarchy配列から交配種を抽出
    const hybridSpecies = data.hierarchy.filter(item => item.type === 'hybrid');

    if (hybridSpecies.length === 0) {
        subspeciesGrid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-gray-500 text-lg">交配種はまだ登録されていません</p>
                <a href="/species/" class="inline-block mt-4 text-forest-mid hover:text-forest-dark transition-colors">
                    品種一覧に戻る
                </a>
            </div>
        `;
        loading.classList.add('hidden');
        subspeciesSection.classList.remove('hidden');
        return;
    }

    // 統計情報
    const totalPosts = hybridSpecies.reduce((sum, item) => sum + (item.totalPosts || 0), 0);

    // ヘッダー情報を更新
    parentTitle.textContent = '交配種の園芸品種';
    parentSubtitle.textContent = 'Hybrids';
    parentDescription.textContent = `${hybridSpecies.length}品種 / ${totalPosts}件の投稿`;
    breadcrumbCurrent.textContent = '交配種 / Hybrids';

    // ページタイトル更新
    document.getElementById('page-title').textContent = '交配種の園芸品種 - Platycerium Collection';
    document.getElementById('og-title').setAttribute('content', '交配種の園芸品種 - Platycerium Collection');
    document.getElementById('twitter-title').setAttribute('content', '交配種の園芸品種 - Platycerium Collection');

    // 交配種カードを生成（subspeciesと同じ形式）
    const hybridCards = hybridSpecies.map(hybrid => {
        const linkUrl = `/species/detail.html?id=${hybrid.id}`;
        const imageSrc = hybrid.latestImage
            ? `/${hybrid.latestImage}`
            : '/images/placeholder-leaf.svg';

        return {
            id: hybrid.id,
            displayName: hybrid.nameJa || hybrid.name,
            tag: hybrid.name || '',
            count: hybrid.totalPosts || 0,
            latestImage: hybrid.latestImage
        };
    });

    renderSubspeciesCards(hybridCards);

    loading.classList.add('hidden');
    subspeciesSection.classList.remove('hidden');

    console.log(`Successfully loaded ${hybridSpecies.length} hybrid species`);
}

/**
 * 園芸品種カードを生成して表示
 */
function renderSubspeciesCards(subspeciesList) {
    const subspeciesGrid = document.getElementById('subspecies-grid');

    const cardsHTML = subspeciesList.map(subspecies => {
        const linkUrl = `/species/detail.html?id=${subspecies.id}`;

        // 画像の表示（latestImageを使用）
        const imageSrc = subspecies.latestImage
            ? `/${subspecies.latestImage}`
            : '/images/placeholder-leaf.svg';

        return `
            <div class="subspecies-card bg-white rounded-lg shadow-md overflow-hidden fade-in"
                 onclick="window.location.href='${linkUrl}'">
                <img src="${imageSrc}"
                     alt="${subspecies.displayName}"
                     class="subspecies-thumbnail"
                     loading="lazy"
                     onerror="this.src='/images/placeholder-leaf.svg'">
                <div class="p-4">
                    <h3 class="text-lg font-bold text-forest-dark mb-2 line-clamp-2">
                        ${subspecies.displayName}
                    </h3>
                    <p class="text-sm text-gray-500 mb-2">
                        ${subspecies.tag || ''}
                    </p>
                    <div class="flex items-center justify-between text-sm text-gray-600">
                        <span>📸 ${subspecies.count}件の投稿</span>
                        <svg class="w-4 h-4 text-forest-mid" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    subspeciesGrid.innerHTML = cardsHTML;
}

// ページロード時に実行
document.addEventListener('DOMContentLoaded', () => {
    loadSubspecies();
});
