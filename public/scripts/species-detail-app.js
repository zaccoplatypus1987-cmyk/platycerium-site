/**
 * 品種別詳細ページ JavaScript（成長タイムライン統合版）
 * species/detail.html 用
 */

// テキストクリーニングユーティリティをインポート
import { cleanCaption, extractCareActivities } from './utils/text-cleaner.js';

// DOM要素
const speciesNameJa = document.getElementById('species-name-ja');
const speciesNameEn = document.getElementById('species-name-en');
const speciesCount = document.getElementById('species-count');
const speciesDescription = document.getElementById('species-description');
const breadcrumbSpeciesLink = document.getElementById('breadcrumb-species-link');
const breadcrumbSubspecies = document.getElementById('breadcrumb-subspecies');
const postsContainer = document.getElementById('posts-container');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');

// 状態管理
let speciesData = null;

/**
 * URLから品種IDを取得
 */
function getSpeciesIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/**
 * 品種データを読み込み
 */
async function loadSpeciesData(speciesId) {
  try {
    const url = `/data/species/${speciesId}.json`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('指定された品種が見つかりませんでした');
      }
      throw new Error(`データの読み込みに失敗しました (${response.status})`);
    }

    const data = await response.json();

    // データはすでにサーバー側でデコード済み
    return data;

  } catch (error) {
    console.error('品種データ読み込みエラー:', error);
    throw error;
  }
}

/**
 * 日付をフォーマット（YYYY年MM月DD日）
 */
function formatDateJapanese(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

/**
 * 日付をフォーマット（YYYY/MM/DD）
 */
function formatDateShort(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

/**
 * 経過日数を計算
 * @param {number} baseTimestamp - 基準日のタイムスタンプ（秒）
 * @param {number} currentTimestamp - 現在のタイムスタンプ（秒）
 * @returns {number} - 経過日数
 */
function calculateDaysSince(baseTimestamp, currentTimestamp) {
  const diffMs = (currentTimestamp - baseTimestamp) * 1000;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * 相対時間を表示（例: "3ヶ月前"）
 */
function getRelativeTime(timestamp) {
  const now = Date.now();
  const postDate = timestamp * 1000;
  const diffMs = now - postDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`;
  return `${Math.floor(diffDays / 365)}年前`;
}

/**
 * 投稿カードを生成（成長タイムライン統合版）
 */
function createPostCard(post, isFirstPost, baseTimestamp) {
  const card = document.createElement('a');
  card.href = `/detail.html?id=${post.id}`;
  card.className = 'post-card bg-white rounded-lg shadow-md overflow-hidden block hover:shadow-xl transition-shadow';

  // キャプションを整形（絵文字とハッシュタグを削除）
  const captionText = post.caption || '';
  const cleanedCaption = cleanCaption(captionText);

  // 栽培管理アクティビティを検出
  const careActivities = extractCareActivities(captionText);

  // Day計算
  const dayNumber = calculateDaysSince(baseTimestamp, post.timestamp);

  // 画像
  const imgContainer = document.createElement('div');
  imgContainer.className = 'w-full bg-gray-200 relative';

  const firstImage = post.images && post.images[0];
  if (firstImage) {
    const img = document.createElement('img');
    img.src = `/${firstImage.path}`;
    // ALT属性を最適化（50文字以内、絵文字・ハッシュタグなし）
    const altText = cleanedCaption.split('\n')[0].substring(0, 50);
    img.alt = altText || '投稿画像';
    img.className = 'post-image w-full aspect-square object-cover';
    img.loading = 'lazy';

    // 画像読み込みエラー対応
    img.onerror = () => {
      img.src = '/images/placeholder.jpg';
    };

    imgContainer.appendChild(img);

    // 複数画像の場合はバッジを表示
    if (post.images.length > 1) {
      const badge = document.createElement('div');
      badge.className = 'absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded';
      badge.textContent = `${post.images.length}枚`;
      imgContainer.appendChild(badge);
    }
  }

  // カード本体
  const content = document.createElement('div');
  content.className = 'p-4';

  // Day表示
  const dayBadge = document.createElement('div');
  dayBadge.className = 'inline-flex items-center gap-2 bg-gradient-to-r from-forest-mid to-forest-light text-white px-3 py-1.5 rounded-full font-bold text-sm mb-3';
  dayBadge.innerHTML = `
    <span class="text-xs opacity-90">Day</span>
    <span class="text-lg">${dayNumber}</span>
  `;

  // 投稿日
  const dateElement = document.createElement('div');
  dateElement.className = 'mb-3';
  const dateShort = formatDateShort(post.date);
  const relativeTime = getRelativeTime(post.timestamp);

  dateElement.innerHTML = `
    <div class="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
      </svg>
      <span>${dateShort}</span>
    </div>
    <div class="text-xs text-gray-500 ml-6">
      ${relativeTime}
    </div>
  `;

  // 栽培管理タグ
  const tagsContainer = document.createElement('div');
  tagsContainer.className = 'flex flex-wrap gap-2 mb-3';

  // 購入タグは最初の投稿（Day 0）のみに表示
  if (isFirstPost) {
    const purchaseTag = document.createElement('span');
    purchaseTag.className = 'care-tag care-tag-purchase inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500 text-white';
    purchaseTag.textContent = '🛒 購入';
    tagsContainer.appendChild(purchaseTag);
  }

  // その他のタグ
  careActivities.forEach(activity => {
    const tag = document.createElement('span');
    const colorClass = {
      'remount': 'bg-green-500',
      'moss': 'bg-indigo-500',
      'fertilize': 'bg-amber-500',
      'pruning': 'bg-purple-500',
      'watering': 'bg-blue-500',
      'location': 'bg-teal-500'
    }[activity.type] || 'bg-gray-500';

    tag.className = `care-tag care-tag-${activity.type} inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${colorClass} text-white`;
    tag.textContent = `${activity.emoji} ${activity.label}`;
    tagsContainer.appendChild(tag);
  });

  // キャプション
  const title = document.createElement('p');
  title.className = 'text-gray-700 text-sm line-clamp-3';
  title.textContent = cleanedCaption || '投稿詳細';

  content.appendChild(dayBadge);
  content.appendChild(dateElement);
  if (tagsContainer.children.length > 0) {
    content.appendChild(tagsContainer);
  }
  content.appendChild(title);

  card.appendChild(imgContainer);
  card.appendChild(content);

  return card;
}

/**
 * 投稿グリッドをレンダリング（古い順）
 */
function renderPosts(posts) {
  postsContainer.innerHTML = '';

  if (posts.length === 0) {
    postsContainer.innerHTML = '<p class="text-center text-gray-600 col-span-full py-12">投稿がありません。</p>';
    return;
  }

  // ソート: 古い順（タイムスタンプ昇順）
  const sortedPosts = [...posts].sort((a, b) => a.timestamp - b.timestamp);

  // 最古の投稿をDay 0として設定
  const baseTimestamp = sortedPosts[0].timestamp;

  sortedPosts.forEach((post, index) => {
    const isFirstPost = index === 0; // 最初の投稿のみ購入タグを表示
    const card = createPostCard(post, isFirstPost, baseTimestamp);
    postsContainer.appendChild(card);
  });

  // フェードインアニメーション
  postsContainer.classList.add('fade-in');
}

/**
 * ページヘッダーを更新
 */
function updateHeader() {
  // データの存在確認
  if (!speciesData || !speciesData.species) {
    console.error('品種データが不正です:', speciesData);
    throw new Error('品種データの構造が不正です');
  }

  const { species, posts } = speciesData;
  const count = species.count;

  const displayName = species.displayName || species.id;

  // DOM要素の存在確認
  if (!speciesNameJa || !speciesNameEn) {
    console.error('必要なDOM要素が見つかりません');
    console.error('speciesNameJa:', speciesNameJa);
    console.error('speciesNameEn:', speciesNameEn);
    throw new Error('ページのHTML構造が不正です');
  }

  speciesNameJa.textContent = displayName;
  speciesNameEn.textContent = displayName;

  // 種名を抽出（例: "P.willinckii 月光爪哇" から "P.willinckii" を抽出）
  // または "Platycerium ridleyi nano" から "P. ridleyi" を抽出
  let speciesNameMatch = displayName.match(/^P\.(\w+)/);

  // "P." で始まらない場合は "Platycerium" を試す
  if (!speciesNameMatch) {
    speciesNameMatch = displayName.match(/^Platycerium\s+(\w+)/);
  }

  if (speciesNameMatch) {
    const speciesKey = speciesNameMatch[1]; // 例: "willinckii" または "ridleyi"
    const speciesName = `P. ${speciesKey}`; // 例: "P. willinckii"（ドット+スペース）

    // パンくずリストに種名リンクを設定
    breadcrumbSpeciesLink.textContent = speciesName;
    breadcrumbSpeciesLink.href = `/species/subspecies.html?parent=${speciesKey}`;

    // 亜種名を設定（原種名も含めて表示）
    breadcrumbSubspecies.textContent = displayName;
  } else {
    // 種名が抽出できない場合は従来通り
    breadcrumbSpeciesLink.textContent = displayName;
    breadcrumbSpeciesLink.href = '#';
    breadcrumbSubspecies.textContent = '';
  }

  // 成長期間を表示（古い順にソート済み）
  const sortedPosts = [...posts].sort((a, b) => a.timestamp - b.timestamp);

  if (sortedPosts.length > 0) {
    const firstDate = formatDateJapanese(sortedPosts[0].date);
    const lastDate = formatDateJapanese(sortedPosts[sortedPosts.length - 1].date);

    // 経過日数を計算
    const totalDays = calculateDaysSince(sortedPosts[0].timestamp, sortedPosts[sortedPosts.length - 1].timestamp);

    speciesCount.textContent = `${count}件の投稿 / ${firstDate} 〜 ${lastDate}（${totalDays}日間）`;
  } else {
    speciesCount.textContent = `${count}件の投稿`;
  }

  // 説明文があれば表示
  if (species.description) {
    speciesDescription.textContent = species.description;
    speciesDescription.classList.remove('hidden');
  }
}

/**
 * ページメタデータを更新
 */
function updateMetadata() {
  const { species } = speciesData;
  const displayName = species.displayName || species.id;
  const title = `${displayName} - Platycerium Collection`;

  const pageTitle = document.getElementById('page-title');
  const ogTitle = document.getElementById('og-title');
  const twitterTitle = document.getElementById('twitter-title');

  if (pageTitle) pageTitle.textContent = title;
  if (ogTitle) ogTitle.setAttribute('content', title);
  if (twitterTitle) twitterTitle.setAttribute('content', title);
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

    // URLから品種IDを取得
    const speciesId = getSpeciesIdFromURL();

    if (!speciesId) {
      throw new Error('品種IDが指定されていません');
    }

    // 品種データ読み込み
    speciesData = await loadSpeciesData(speciesId);

    // ヘッダー更新
    updateHeader();

    // メタデータ更新
    updateMetadata();

    // 投稿レンダリング（古い順）
    renderPosts(speciesData.posts);

    // ローディング非表示
    loadingElement.classList.add('hidden');

    const displayName = speciesData.species.displayName || speciesData.species.id;
    console.log(`品種: ${displayName}, 投稿数: ${speciesData.species.count}`);

    // ソート済みの投稿で期間を表示
    const sortedPosts = [...speciesData.posts].sort((a, b) => a.timestamp - b.timestamp);
    console.log(`期間: ${sortedPosts[0]?.date} 〜 ${sortedPosts[sortedPosts.length - 1]?.date}`);

  } catch (error) {
    console.error('初期化エラー:', error);
    showError(error.message || '品種データの読み込みに失敗しました。');
  }
}

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', init);
