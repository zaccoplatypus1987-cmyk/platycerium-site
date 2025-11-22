/**
 * Detail Page Application
 * Handles individual post detail page
 */

import { DataLoader } from './data-loader.js';
import { ErrorHandler } from './error-handler.js';
import { decodeObject } from './utils/instagram-decoder.js';
import { cleanCaption } from './utils/text-cleaner.js';

class DetailApp {
    constructor() {
        this.dataLoader = new DataLoader();
        this.postId = null;
        this.post = null;
        this.currentImageIndex = 0;

        this.init();
    }

    /**
     * HTMLエスケープ関数（XSS対策）
     * 悪意のあるコードが実行されないように、特殊文字を安全な形式に変換します
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async init() {
        try {
            // Get post ID from URL
            this.postId = this.getPostIdFromURL();

            if (!this.postId) {
                throw new Error('投稿IDが指定されていません');
            }

            // Find and load the post
            await this.loadPost();

            // Render post details
            this.renderPost();

            // Setup image carousel if multiple images
            if (this.post.media && this.post.media.length > 1) {
                this.setupCarousel();
            }

            // Setup back button
            this.setupBackButton();

            // Update page metadata
            this.updateMetadata();

            // Day 表示とナビゲーション機能を追加
            const species = await this.findSpeciesForPost();
            if (species) {
                const navData = this.calculateNavigationData(species.data);
                if (navData) {
                    this.updateNavigationUI(navData, species.id);

                    // パンくずリストを更新
                    this.updateBreadcrumb(species.data, navData);
                }
            }

            // ページ読み込み後に画像までスクロール（連続クリック対応）
            this.scrollToImage();

        } catch (error) {
            ErrorHandler.handle(error, 'DetailApp.init');
            this.showError(error.message);
        }
    }

    /**
     * ページ上部にスクロール（「次の投稿」連続クリック対応）
     */
    scrollToImage() {
        // ページ読み込み完了後、常にページの上部にスクロール
        setTimeout(() => {
            console.log('scrollToImage: scrolling to top (0)');

            window.scrollTo({
                top: 0,
                behavior: 'instant' // smoothではなくinstantで即座にスクロール
            });
        }, 100);
    }

    /**
     * Get post ID from URL query parameter
     */
    getPostIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    /**
     * Get species ID from URL query parameter
     */
    getSpeciesIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('species');
    }

    /**
     * Load post data by searching through monthly files
     * Optimized: Extract year/month from post ID timestamp for direct lookup
     */
    async loadPost() {
        try {
            // 最適化：投稿IDからタイムスタンプを抽出して年月を特定
            const post = await this.loadPostOptimized();
            if (post) {
                this.post = post;
                console.log('Post found (optimized):', this.post);
                return;
            }

            // フォールバック：見つからなかった場合は全月を探す
            console.log('Post not found with optimized method, falling back to full search...');
            await this.loadPostFallback();

        } catch (error) {
            throw error;
        }
    }

    /**
     * 最適化された投稿読み込み（タイムスタンプから年月を特定）
     */
    async loadPostOptimized() {
        try {
            // 投稿IDからタイムスタンプを抽出（形式: "1763466433-3"）
            const timestampMatch = this.postId.match(/^(\d+)-/);
            if (!timestampMatch) {
                console.log('Cannot extract timestamp from post ID:', this.postId);
                return null;
            }

            const timestamp = parseInt(timestampMatch[1]);
            const date = new Date(timestamp * 1000);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            console.log(`Optimized lookup: post ID ${this.postId} → ${year}-${month}`);

            // 該当する月のファイルを直接読み込む
            const result = await this.dataLoader.loadMonth(year, month);

            if (result.ok) {
                const foundPost = result.value.posts.find(p => p.id === this.postId);

                if (foundPost) {
                    const decodedPost = foundPost;
                    return this.normalizePostData(decodedPost);
                }
            }

            return null;

        } catch (error) {
            console.log('Error in optimized lookup:', error);
            return null;
        }
    }

    /**
     * フォールバック：全月を探す（従来の方法）
     */
    async loadPostFallback() {
        try {
            // Load posts index
            const indexResponse = await fetch('/data/posts-index.json');
            if (!indexResponse.ok) {
                throw new Error('投稿インデックスの読み込みに失敗しました');
            }

            const index = await indexResponse.json();
            const months = Array.isArray(index.months)
                ? (typeof index.months[0] === 'string'
                    ? index.months.sort((a, b) => b.localeCompare(a))
                    : index.months.sort((a, b) => b.month.localeCompare(a.month)))
                : [];

            // Search through months to find the post
            for (const monthData of months) {
                const monthString = typeof monthData === 'string' ? monthData : monthData.month;
                const [year, month] = monthString.split('-').map(Number);
                const result = await this.dataLoader.loadMonth(year, month);

                if (result.ok) {
                    const foundPost = result.value.posts.find(p => p.id === this.postId);

                    if (foundPost) {
                        const decodedPost = foundPost;
                        this.post = this.normalizePostData(decodedPost);

                        console.log('Post found (fallback):', this.post);
                        return;
                    }
                }
            }

            throw new Error('指定された投稿が見つかりませんでした');

        } catch (error) {
            throw error;
        }
    }

    /**
     * Normalize post data structure
     * Converts old format (images, caption, timestamp) to new format (media, title, creation_timestamp)
     */
    normalizePostData(post) {
        const normalized = { ...post };

        // Convert images array to media array with uri property
        if (post.images && Array.isArray(post.images)) {
            normalized.media = post.images.map(img => ({
                uri: img.path || img.uri,
                alt: img.alt || '',
                timestamp: img.timestamp
            }));
        } else if (!post.media) {
            normalized.media = [];
        }

        // Ensure title is set (use caption if title is missing)
        if (!normalized.title && post.caption) {
            normalized.title = post.caption;
        }

        // Ensure creation_timestamp is set
        if (!normalized.creation_timestamp && post.timestamp) {
            normalized.creation_timestamp = post.timestamp;
        }

        return normalized;
    }

    /**
     * 投稿が属する品種を特定
     */
    async findSpeciesForPost() {
        try {
            let speciesId;

            // URLに品種パラメータがあればそれを優先的に使用
            const urlSpeciesId = this.getSpeciesIdFromURL();
            if (urlSpeciesId) {
                speciesId = urlSpeciesId;
                console.log('Using species ID from URL:', speciesId);
            } else {
                // URLに品種パラメータがない場合はハッシュタグから特定
                const jisakuboTags = this.post.hashtags?.filter(tag =>
                    tag.startsWith('ジサクボ') || tag.startsWith('#ジサクボ')
                ) || [];

                if (jisakuboTags.length === 0) {
                    console.log('No species hashtags found in post');
                    return null;
                }

                // 最初の #ジサクボ タグを品種IDとして使用（#を削除）
                speciesId = jisakuboTags[0].replace('#', '');
                console.log('Using species ID from hashtags:', speciesId);
            }

            console.log('Found species ID:', speciesId);

            // species-hierarchy-index.json から品種情報を取得
            const response = await fetch('/data/species-hierarchy-index.json');
            if (!response.ok) {
                console.error('Failed to load species index');
                return null;
            }

            const index = await response.json();
            const speciesEntry = index.species.find(s => s.id === speciesId);

            if (!speciesEntry) {
                console.log('Species not found in index:', speciesId);
                return null;
            }

            console.log('Found species entry:', speciesEntry);

            // 品種データを読み込み
            const speciesResponse = await fetch(`/data/species/${speciesEntry.file}`);
            if (!speciesResponse.ok) {
                console.error('Failed to load species data:', speciesEntry.file);
                return null;
            }

            const speciesData = await speciesResponse.json();

            console.log('Species data loaded:', {
                id: speciesId,
                postCount: speciesData.posts?.length || 0
            });

            return {
                id: speciesId,
                data: speciesData
            };
        } catch (error) {
            console.error('Error finding species for post:', error);
            return null;
        }
    }

    /**
     * Day 番号とナビゲーション情報を計算
     */
    calculateNavigationData(speciesData) {
        try {
            const posts = speciesData.posts;

            if (!posts || posts.length === 0) {
                console.error('No posts in species data');
                return null;
            }

            // タイムスタンプでソート（昇順）
            const sortedPosts = [...posts].sort((a, b) => a.timestamp - b.timestamp);

            // 基準日（Day 0）
            const baseTimestamp = sortedPosts[0].timestamp;

            // 現在の投稿の位置
            const currentIndex = sortedPosts.findIndex(p => p.id === this.postId);

            if (currentIndex === -1) {
                console.error('Current post not found in species posts');
                return null;
            }

            const currentPost = sortedPosts[currentIndex];

            // Day 番号を計算（秒 → 日）
            const dayNumber = Math.floor((currentPost.timestamp - baseTimestamp) / (24 * 60 * 60));

            // 前後の投稿
            const prevPost = currentIndex > 0 ? sortedPosts[currentIndex - 1] : null;
            const nextPost = currentIndex < sortedPosts.length - 1 ? sortedPosts[currentIndex + 1] : null;

            console.log('Navigation data calculated:', {
                dayNumber,
                currentIndex,
                totalPosts: sortedPosts.length,
                hasPrev: !!prevPost,
                hasNext: !!nextPost
            });

            return {
                dayNumber,
                prevPost,
                nextPost
            };
        } catch (error) {
            console.error('Error calculating navigation data:', error);
            return null;
        }
    }

    /**
     * Day 表示とナビゲーションボタンを更新
     */
    updateNavigationUI(navData, speciesId) {
        // ナビゲーションボタンをパンくずリストの下に挿入
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;

        // 品種パラメータをURLに含める
        const speciesParam = speciesId ? `&species=${encodeURIComponent(speciesId)}` : '';

        // URLパラメータを安全にエスケープ（XSS対策）
        const prevPostId = navData.prevPost ? encodeURIComponent(navData.prevPost.id) : '';
        const nextPostId = navData.nextPost ? encodeURIComponent(navData.nextPost.id) : '';

        // ナビゲーションボタン（Dayバッジを中央に配置）
        const navigationHTML = `
            <div class="navigation-buttons mb-6">
                ${navData.prevPost ? `
                    <a href="/detail?id=${prevPostId}${speciesParam}" class="nav-btn">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                        前の投稿
                    </a>
                ` : '<div></div>'}

                <div class="day-badge">
                    <span class="text-xs opacity-90">Day</span>
                    <span class="text-lg">${navData.dayNumber}</span>
                </div>

                ${navData.nextPost ? `
                    <a href="/detail?id=${nextPostId}${speciesParam}" class="nav-btn">
                        次の投稿
                        <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </a>
                ` : '<div></div>'}
            </div>
        `;

        // パンくずリストの後にナビゲーションボタンを挿入
        breadcrumb.insertAdjacentHTML('afterend', navigationHTML);

        console.log('Navigation UI updated successfully with species:', speciesId);
    }

    /**
     * パンくずリストを更新
     */
    updateBreadcrumb(speciesData, navData) {
        try {
            const speciesInfo = speciesData.species;
            const displayName = speciesInfo.displayName || speciesInfo.id;

            // 原種名を抽出（例: "P.willinckii smurf" → "willinckii"）
            const speciesNameMatch = displayName.match(/^P\.(\w+)/);

            if (!speciesNameMatch) {
                console.log('Could not extract species name from:', displayName);
                return;
            }

            const speciesKey = speciesNameMatch[1]; // 例: "willinckii"
            const speciesName = `P. ${speciesKey}`; // 例: "P. willinckii"

            // 原種名リンク
            const breadcrumbSpeciesLink = document.getElementById('breadcrumb-species-link');
            if (breadcrumbSpeciesLink) {
                breadcrumbSpeciesLink.textContent = speciesName;
                breadcrumbSpeciesLink.href = `/gallery/#${speciesKey}`;
            }

            // 品種名リンク
            const breadcrumbSubspeciesLink = document.getElementById('breadcrumb-subspecies-link');
            if (breadcrumbSubspeciesLink) {
                breadcrumbSubspeciesLink.textContent = displayName;
                breadcrumbSubspeciesLink.href = `/gallery/detail?id=${speciesInfo.id}`;
            }

            // 現在のページ（Day 番号）
            const breadcrumbCurrent = document.getElementById('breadcrumb-current');
            if (breadcrumbCurrent && navData) {
                breadcrumbCurrent.textContent = `Day ${navData.dayNumber}`;
            }

            // パンくずリストを表示
            const breadcrumb = document.getElementById('breadcrumb');
            if (breadcrumb) {
                breadcrumb.classList.remove('hidden');
            }

            console.log('Breadcrumb updated successfully:', {
                speciesName,
                displayName,
                dayNumber: navData?.dayNumber
            });

        } catch (error) {
            console.error('Error updating breadcrumb:', error);
        }
    }

    /**
     * Render post details
     */
    renderPost() {
        const container = document.getElementById('detail-container');
        if (!container) {
            throw new Error('Detail container not found');
        }

        const images = this.post.media || [];
        const title = this.extractTitle(this.post.title);
        const date = this.formatDate(this.post.creation_timestamp);
        const caption = this.post.title || '';
        const hashtags = [];  // ハッシュタグセクション削除

        // XSS対策: テキストデータを安全にエスケープ
        const safeTitle = this.escapeHtml(title);
        const safeDate = this.escapeHtml(date);
        const safeCaption = this.escapeHtml(this.formatCaption(caption));

        container.innerHTML = `
            <article class="bg-white rounded-lg shadow-lg overflow-hidden">
                <!-- Image Section -->
                <div class="relative bg-gray-900">
                    ${images.length > 0 ? this.renderImageCarousel(images) : this.renderPlaceholder()}

                    ${images.length > 1 ? `
                        <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                            ${this.currentImageIndex + 1} / ${images.length}
                        </div>
                    ` : ''}
                </div>

                <!-- Content Section -->
                <div class="p-6 md:p-8">
                    <div class="mb-6">
                        <h1 class="text-3xl md:text-4xl font-bold text-primary mb-3">${safeTitle}</h1>
                        <p class="text-gray-500 flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            ${safeDate}
                        </p>
                    </div>

                    <!-- Caption -->
                    <div class="mb-6 prose max-w-none">
                        <div class="text-gray-700 whitespace-pre-wrap">${safeCaption}</div>
                    </div>

                    <!-- Back Button -->
                    <div class="pt-6 border-t">
                        <a href="/gallery/"
                           class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                            </svg>
                            栽培記録に戻る
                        </a>
                    </div>
                </div>
            </article>
        `;

        // ローディング表示を非表示にする
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }

    /**
     * Render image carousel
     */
    renderImageCarousel(images) {
        return `
            <div class="relative">
                <div id="carousel-track" class="flex transition-transform duration-300">
                    ${images.map((img, idx) => {
                        // 画像URIの正規化（先頭にスラッシュがない場合は追加）
                        const imagePath = img.uri.startsWith('/') ? img.uri : `/${img.uri}`;
                        return `
                        <img
                            src="${imagePath}"
                            alt="${img.alt || `Image ${idx + 1}`}"
                            class="w-full h-auto max-h-[600px] object-contain flex-shrink-0"
                            loading="${idx === 0 ? 'eager' : 'lazy'}"
                            onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'w-full h-96 bg-gray-800 flex items-center justify-center text-gray-400\\'>画像を読み込めませんでした</div>'"
                        >
                    `}).join('')}
                </div>

                ${images.length > 1 ? `
                    <button id="prev-btn"
                            class="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                    </button>

                    <button id="next-btn"
                            class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render placeholder image
     */
    renderPlaceholder() {
        return `
            <div class="w-full h-96 bg-gray-200 flex items-center justify-center">
                <span class="text-gray-400 text-lg">画像なし</span>
            </div>
        `;
    }

    /**
     * Setup image carousel controls
     */
    setupCarousel() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const track = document.getElementById('carousel-track');

        if (!track) return;

        const imageCount = this.post.media.length;

        const updateCarousel = () => {
            track.style.transform = `translateX(-${this.currentImageIndex * 100}%)`;
        };

        prevBtn?.addEventListener('click', () => {
            this.currentImageIndex = (this.currentImageIndex - 1 + imageCount) % imageCount;
            updateCarousel();
            this.updateImageCounter();
        });

        nextBtn?.addEventListener('click', () => {
            this.currentImageIndex = (this.currentImageIndex + 1) % imageCount;
            updateCarousel();
            this.updateImageCounter();
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                prevBtn?.click();
            } else if (e.key === 'ArrowRight') {
                nextBtn?.click();
            }
        });

        // Touch swipe support
        let startX = 0;
        let currentX = 0;

        track.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        });

        track.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX;
        });

        track.addEventListener('touchend', () => {
            const diff = startX - currentX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    nextBtn?.click();
                } else {
                    prevBtn?.click();
                }
            }
        });
    }

    /**
     * Update image counter
     */
    updateImageCounter() {
        const counter = document.querySelector('.absolute.bottom-4');
        if (counter && this.post.media) {
            counter.textContent = `${this.currentImageIndex + 1} / ${this.post.media.length}`;
        }
    }

    /**
     * Setup back button
     */
    setupBackButton() {
        // Handle browser back button
        window.addEventListener('popstate', () => {
            window.location.href = '/gallery/';
        });
    }

    /**
     * Update page metadata (title, OGP)
     */
    updateMetadata() {
        const title = this.extractTitle(this.post.title);
        const description = this.extractExcerpt(this.post.title);
        const imageUrl = this.post.media && this.post.media[0]
            ? `${window.location.origin}/${this.post.media[0].uri.startsWith('/') ? this.post.media[0].uri.slice(1) : this.post.media[0].uri}`
            : '';

        document.title = `${title} - ジサクボ's ジサクログ`;

        // Update meta tags
        this.updateMetaTag('description', description);
        this.updateMetaTag('og:title', title);
        this.updateMetaTag('og:description', description);
        this.updateMetaTag('og:image', imageUrl);
        this.updateMetaTag('twitter:title', title);
        this.updateMetaTag('twitter:description', description);
        this.updateMetaTag('twitter:image', imageUrl);
    }

    /**
     * Update meta tag content
     */
    updateMetaTag(name, content) {
        let tag = document.querySelector(`meta[name="${name}"]`) ||
                  document.querySelector(`meta[property="${name}"]`);

        if (!tag) {
            tag = document.createElement('meta');
            if (name.startsWith('og:') || name.startsWith('twitter:')) {
                tag.setAttribute('property', name);
            } else {
                tag.setAttribute('name', name);
            }
            document.head.appendChild(tag);
        }

        tag.setAttribute('content', content);
    }

    /**
     * Extract title from caption (remove emojis and hashtags)
     */
    extractTitle(text) {
        if (!text) return '無題';
        const firstLine = text.split('\n')[0].trim();
        // 絵文字とハッシュタグを削除
        const cleaned = cleanCaption(firstLine);
        return cleaned || '無題';
    }

    /**
     * Format date
     */
    formatDate(timestamp) {
        if (!timestamp) return 'Invalid Date';
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
    }

    /**
     * Format caption (remove emojis and hashtags for display)
     */
    formatCaption(text) {
        if (!text) return '';
        // 絵文字とハッシュタグを削除
        return cleanCaption(text);
    }

    /**
     * Extract excerpt (remove emojis and hashtags)
     */
    extractExcerpt(text) {
        if (!text) return '';
        // 絵文字とハッシュタグを削除
        const cleaned = cleanCaption(text);
        const lines = cleaned.split('\n').filter(line => line.trim());
        const excerpt = lines.slice(0, 3).join(' ');
        return excerpt.length > 160 ? excerpt.substring(0, 160) + '...' : excerpt;
    }

    /**
     * Extract hashtags
     */
    extractHashtags(text) {
        if (!text) return [];
        const hashtagRegex = /#[^\s]+/g;
        return text.match(hashtagRegex) || [];
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorElement = document.getElementById('error');
        if (errorElement) {
            errorElement.querySelector('p').textContent = message;
            errorElement.classList.remove('hidden');
        }

        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new DetailApp());
} else {
    new DetailApp();
}
