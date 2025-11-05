/**
 * Growth Timeline App
 * ビカクシダの成長タイムライン表示機能
 */

// テキストクリーニングユーティリティをインポート
import { cleanCaption } from './utils/text-cleaner.js';

// Care Keywords - 栽培管理タグ抽出パターン（4種類のみ）
const careKeywords = {
    'purchase': {
        emoji: '🛒',
        label: '購入',
        patterns: ['購入', '手に入れ', 'お迎え', 'from @', '入手'],
        showOnce: true  // 購入タグは最初の1回のみ
    },
    'remount': {
        emoji: '🌱',
        label: '板替え/リマウント',
        patterns: ['板替え', '板替', 'リマウント', 'remount', 'mounting', '着生']
    },
    'moss': {
        emoji: '🌿',
        label: '苔増し',
        patterns: ['苔増し', '苔', 'moss', '水苔']
    },
    'fertilize': {
        emoji: '💊',
        label: '追肥/肥料',
        patterns: ['追肥', '肥料', 'マグァンプ', 'fertilize', '液肥', '栄養']
    }
};

/**
 * URLパラメータを取得
 */
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * 種データを読み込む
 */
async function loadSpeciesData(speciesId) {
    try {
        const response = await fetch(`/data/species/${encodeURIComponent(speciesId)}.json`);

        if (!response.ok) {
            throw new Error(`データの読み込みに失敗しました (HTTP ${response.status})`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error loading species data:', error);
        throw error;
    }
}

/**
 * キャプションから栽培管理タグを抽出
 * 購入タグの重複を追跡
 */
const purchaseTagShown = { value: false };

function extractCareActivities(caption, resetPurchaseFlag = false) {
    if (resetPurchaseFlag) {
        purchaseTagShown.value = false;
    }

    if (!caption) return [];

    const activities = [];
    const lowerCaption = caption.toLowerCase();

    for (const [key, data] of Object.entries(careKeywords)) {
        // 購入タグが既に表示されている場合はスキップ
        if (key === 'purchase' && purchaseTagShown.value) {
            continue;
        }

        for (const pattern of data.patterns) {
            if (lowerCaption.includes(pattern.toLowerCase())) {
                activities.push({
                    key: key,
                    emoji: data.emoji,
                    label: data.label
                });

                // 購入タグを表示したらフラグを立てる
                if (key === 'purchase') {
                    purchaseTagShown.value = true;
                }

                break; // 同じアクティビティは1回だけ追加
            }
        }
    }

    return activities;
}

/**
 * 日付フォーマット
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

/**
 * 経過日数を計算
 */
function calculateDaysSince(startDate, currentDate) {
    const start = new Date(startDate);
    const current = new Date(currentDate);
    const diffTime = Math.abs(current - start);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * 栽培期間を人間が読みやすい形式にフォーマット
 */
function formatCultivationPeriod(days) {
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const remainingDays = days % 30;

    const parts = [];
    if (years > 0) parts.push(`${years}年`);
    if (months > 0) parts.push(`${months}ヶ月`);
    if (remainingDays > 0 || parts.length === 0) parts.push(`${remainingDays}日`);

    return parts.join('');
}

/**
 * サマリー統計を生成
 */
function generateSummary(posts) {
    const sortedPosts = [...posts].sort((a, b) => a.timestamp - b.timestamp);
    const firstPost = sortedPosts[0];
    const lastPost = sortedPosts[sortedPosts.length - 1];

    const totalDays = calculateDaysSince(firstPost.date, lastPost.date);

    return {
        totalPosts: posts.length,
        cultivationPeriod: formatCultivationPeriod(totalDays),
        startDate: formatDate(firstPost.date),
        latestDate: formatDate(lastPost.date),
        firstPostDate: firstPost.date
    };
}

/**
 * モーダルを開く
 */
window.openModal = function(imgElement) {
    const modal = document.getElementById('photo-modal');
    const modalImg = document.getElementById('modal-image');

    modal.classList.add('active');
    modalImg.src = imgElement.src;
    modalImg.alt = imgElement.alt;

    // 背景クリックで閉じる
    modal.onclick = function(event) {
        if (event.target === modal) {
            closeModal();
        }
    };
};

/**
 * モーダルを閉じる
 */
window.closeModal = function() {
    const modal = document.getElementById('photo-modal');
    modal.classList.remove('active');
};

// ESCキーでモーダルを閉じる
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

/**
 * タイムラインアイテムを生成（写真レイアウト改善版 + キャプション追加）
 */
function createTimelineItem(post, daysSinceStart, isFirst = false) {
    const item = document.createElement('div');
    item.className = 'timeline-item fade-in';

    // マーカー
    const marker = document.createElement('div');
    marker.className = `timeline-marker ${isFirst ? 'first' : ''}`;
    item.appendChild(marker);

    // コンテンツ
    const content = document.createElement('div');
    content.className = 'timeline-content';

    // ヘッダー（日付とタグ）
    const header = document.createElement('div');
    header.className = 'timeline-header';

    // 経過日数と日付を横並び
    const dateInfo = document.createElement('div');
    dateInfo.className = 'flex items-center justify-between mb-3';

    const dayLabel = document.createElement('div');
    dayLabel.className = 'day-label';
    dayLabel.textContent = isFirst ? 'START (Day 0)' : `Day ${daysSinceStart}`;
    dateInfo.appendChild(dayLabel);

    const dateLabel = document.createElement('div');
    dateLabel.className = 'date-label';
    dateLabel.textContent = formatDate(post.date);
    dateInfo.appendChild(dateLabel);

    header.appendChild(dateInfo);

    // 栽培管理タグ
    const activities = extractCareActivities(post.caption);
    if (activities.length > 0) {
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'flex flex-wrap gap-3 mt-4';

        activities.forEach(activity => {
            const tag = document.createElement('span');
            tag.className = 'care-tag';
            tag.innerHTML = `<span class="care-tag-emoji">${activity.emoji}</span> ${activity.label}`;
            tagsContainer.appendChild(tag);
        });

        header.appendChild(tagsContainer);
    }

    content.appendChild(header);

    // 写真レイアウト（改善版: 1枚目を大きく、2枚目以降を小さく）
    if (post.images && post.images.length > 0) {
        const photoLayout = document.createElement('div');
        photoLayout.className = 'photo-layout';

        // 1枚目の写真（大きく表示）
        const mainPhoto = document.createElement('div');
        mainPhoto.className = 'main-photo';

        const mainImg = document.createElement('img');
        mainImg.src = `/${post.images[0].path}`;
        mainImg.alt = `${formatDate(post.date)}の成長記録（メイン）`;
        mainImg.loading = 'lazy';
        mainImg.onclick = () => window.openModal(mainImg);

        mainPhoto.appendChild(mainImg);
        photoLayout.appendChild(mainPhoto);

        // 2枚目以降の写真（小さく横並び）
        if (post.images.length > 1) {
            const subPhotos = document.createElement('div');
            subPhotos.className = 'sub-photos';

            // 最大3枚まで表示（2枚目〜4枚目）
            post.images.slice(1, 4).forEach((img, index) => {
                const subImg = document.createElement('img');
                subImg.src = `/${img.path}`;
                subImg.alt = `${formatDate(post.date)}の成長記録（${index + 2}枚目）`;
                subImg.loading = 'lazy';
                subImg.onclick = () => window.openModal(subImg);
                subPhotos.appendChild(subImg);
            });

            photoLayout.appendChild(subPhotos);
        }

        content.appendChild(photoLayout);
    }

    // キャプション表示（絵文字とハッシュタグを削除）
    const captionText = cleanCaption(post.caption || post.title || '');
    if (captionText) {
        const captionSection = document.createElement('div');
        captionSection.className = 'caption-section';

        const captionP = document.createElement('p');
        captionP.className = 'caption-text';
        captionP.textContent = captionText;

        captionSection.appendChild(captionP);
        content.appendChild(captionSection);
    }

    item.appendChild(content);
    return item;
}

/**
 * タイムラインを生成
 */
function generateTimeline(posts, firstPostDate) {
    const container = document.getElementById('timeline-items');
    if (!container) {
        console.error('Timeline container not found');
        return;
    }

    // 購入タグフラグをリセット
    extractCareActivities('', true);

    // 古い順にソート
    const sortedPosts = [...posts].sort((a, b) => a.timestamp - b.timestamp);

    // タイムラインアイテムを生成
    sortedPosts.forEach((post, index) => {
        const daysSinceStart = calculateDaysSince(firstPostDate, post.date);
        const isFirst = index === 0;
        const item = createTimelineItem(post, daysSinceStart, isFirst);
        container.appendChild(item);
    });
}

/**
 * サマリーUIを更新
 */
function updateSummaryUI(summary) {
    document.getElementById('total-posts').textContent = summary.totalPosts;
    document.getElementById('cultivation-period').textContent = summary.cultivationPeriod;
    document.getElementById('start-date').textContent = summary.startDate;
    document.getElementById('latest-date').textContent = summary.latestDate;
}

/**
 * エラー表示
 */
function showError(message) {
    document.getElementById('loading-indicator').classList.add('hidden');
    document.getElementById('timeline-container').classList.add('hidden');

    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');

    errorMessage.textContent = message;
    errorContainer.classList.remove('hidden');
}

/**
 * メイン処理
 */
async function init() {
    try {
        // URLパラメータから種IDを取得
        const speciesId = getUrlParameter('id');

        if (!speciesId) {
            throw new Error('種が指定されていません。URLパラメータ "id" を確認してください。');
        }

        // データ読み込み
        const data = await loadSpeciesData(speciesId);

        if (!data || !data.posts || data.posts.length === 0) {
            throw new Error('投稿データが見つかりませんでした。');
        }

        // タイトル更新
        const speciesTitle = data.species.displayName || speciesId;
        document.getElementById('species-title').textContent = `${speciesTitle} - 成長タイムライン`;
        document.getElementById('page-title').textContent = `${speciesTitle} - 成長タイムライン`;
        document.getElementById('og-title').setAttribute('content', `${speciesTitle} - 成長タイムライン`);

        // サマリー生成
        const summary = generateSummary(data.posts);
        updateSummaryUI(summary);

        // タイムライン生成
        generateTimeline(data.posts, summary.firstPostDate);

        // UI表示切り替え
        document.getElementById('loading-indicator').classList.add('hidden');
        document.getElementById('timeline-container').classList.remove('hidden');

    } catch (error) {
        console.error('Initialization error:', error);
        showError(error.message);
    }
}

// DOMContentLoaded後に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
