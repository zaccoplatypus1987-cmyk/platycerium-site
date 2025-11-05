/**
 * 品種一覧ページJavaScript（シンプル版）
 * species/index.html用
 */

// DOM要素
const speciesGrid = document.getElementById('species-grid');
const speciesStats = document.getElementById('species-stats');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');

/**
 * 品種インデックスデータを読み込み
 */
async function loadSpeciesIndex() {
  try {
    const response = await fetch('/data/species-index.json');

    if (!response.ok) {
      throw new Error(`データの読み込みに失敗しました (${response.status})`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('品種データ読み込みエラー:', error);
    throw error;
  }
}

/**
 * 品種カードを生成
 */
function createSpeciesCard(species) {
  const card = document.createElement('a');
  card.href = `/species/detail.html?id=${species.id}`;
  card.className = 'species-card bg-white rounded-lg shadow-md overflow-hidden block';

  // サムネイル画像
  const thumbnail = species.thumbnail || '/images/placeholder.jpg';
  const imgContainer = document.createElement('div');
  imgContainer.className = 'w-full bg-gray-200';

  const img = document.createElement('img');
  img.src = `/${thumbnail}`;
  img.alt = species.name;
  img.className = 'species-thumbnail w-full';
  img.loading = 'lazy';

  // 画像読み込みエラー対応
  img.onerror = () => {
    img.src = '/images/placeholder.jpg';
  };

  imgContainer.appendChild(img);

  // カード本体
  const content = document.createElement('div');
  content.className = 'p-6';

  // 品種名
  const nameElement = document.createElement('h3');
  nameElement.className = 'text-xl font-bold text-forest-dark mb-3';
  nameElement.textContent = species.name;

  // 投稿数
  const count = document.createElement('div');
  count.className = 'flex items-center gap-2 text-gray-600';
  count.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
    </svg>
    <span class="font-semibold">${species.count}件</span>の投稿
  `;

  // 詳細リンク
  const link = document.createElement('div');
  link.className = 'mt-4 text-forest-mid font-semibold flex items-center gap-1';
  link.innerHTML = `
    成長の軌跡を見る
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
    </svg>
  `;

  content.appendChild(nameElement);
  content.appendChild(count);
  content.appendChild(link);

  card.appendChild(imgContainer);
  card.appendChild(content);

  return card;
}

/**
 * 品種グリッドをレンダリング
 */
function renderSpeciesGrid(speciesData) {
  speciesGrid.innerHTML = '';

  if (speciesData.species.length === 0) {
    speciesGrid.innerHTML = '<p class="text-center text-gray-600 col-span-full py-12">品種データが見つかりませんでした。</p>';
    return;
  }

  speciesData.species.forEach(species => {
    const card = createSpeciesCard(species);
    speciesGrid.appendChild(card);
  });

  // フェードインアニメーション
  speciesGrid.classList.add('fade-in');
}

/**
 * 統計情報を更新
 */
function updateStats(speciesData) {
  const totalPosts = speciesData.species.reduce((sum, s) => sum + s.count, 0);
  speciesStats.textContent = `${speciesData.totalSpecies}品種 / ${totalPosts}件の投稿`;
}

/**
 * エラー表示
 */
function showError(message) {
  loadingElement.classList.add('hidden');
  errorElement.classList.remove('hidden');
  errorElement.querySelector('p').textContent = message;
}

/**
 * 初期化
 */
async function init() {
  try {
    // ローディング表示
    loadingElement.classList.remove('hidden');
    errorElement.classList.add('hidden');

    // データ読み込み
    const speciesData = await loadSpeciesIndex();

    // 統計情報更新
    updateStats(speciesData);

    // グリッドレンダリング
    renderSpeciesGrid(speciesData);

    // ローディング非表示
    loadingElement.classList.add('hidden');

  } catch (error) {
    console.error('初期化エラー:', error);
    showError('品種データの読み込みに失敗しました。しばらくしてから再度お試しください。');
  }
}

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', init);
