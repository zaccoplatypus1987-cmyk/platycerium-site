/**
 * Gallery Page Application
 * Handles gallery page initialization and display
 */

import { DataLoader } from './data-loader.js';
import { GalleryRenderer } from './gallery-renderer.js';
import { InfiniteScroll } from './infinite-scroll.js';
import { ErrorHandler } from './error-handler.js';
import { decodeObject } from './utils/instagram-decoder.js';

class GalleryApp {
    constructor() {
        this.dataLoader = new DataLoader();
        this.infiniteScroll = null;
        this.container = null;
        this.allPosts = [];
        this.displayedPosts = [];
        this.postsPerPage = 12;
        this.monthIndex = [];
        this.currentMonthIdx = 0;

        this.init();
    }

    async init() {
        try {
            // Get gallery container
            this.container = document.getElementById('gallery-container');
            if (!this.container) {
                throw new Error('Gallery container not found');
            }

            // Load posts index
            await this.loadPostsIndex();

            // Load initial posts (latest 3 months)
            await this.loadInitialPosts();

            // Setup infinite scroll
            this.setupInfiniteScroll(this.container);

            // Setup filters
            this.setupFilters();

            // Update stats
            this.updateStats();

        } catch (error) {
            ErrorHandler.handle(error, 'GalleryApp.init');
            this.showError('ギャラリーの初期化に失敗しました');
        }
    }

    /**
     * Load posts index file
     */
    async loadPostsIndex() {
        try {
            const response = await fetch('/data/posts-index.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const index = await response.json();

            // Convert month strings to objects if needed
            if (typeof index.months[0] === 'string') {
                this.monthIndex = index.months.map(month => ({
                    month: month,
                    file: `posts-${month}.json`
                }));
            } else {
                this.monthIndex = index.months.sort((a, b) => b.month.localeCompare(a.month));
            }

            console.log(`Loaded index: ${this.monthIndex.length} months, ${index.totalPosts} total posts`);
        } catch (error) {
            throw new Error('投稿インデックスの読み込みに失敗しました');
        }
    }

    /**
     * Load initial posts (latest 3 months)
     */
    async loadInitialPosts() {
        const loadingElement = document.getElementById('loading');

        try {
            if (loadingElement) {
                loadingElement.classList.remove('hidden');
            }

            // Load latest 3 months
            const monthsToLoad = Math.min(3, this.monthIndex.length);

            for (let i = 0; i < monthsToLoad; i++) {
                const monthData = this.monthIndex[i];
                const [year, month] = monthData.month.split('-').map(Number);

                const result = await this.dataLoader.loadMonth(year, month);

                if (result.ok) {
                    // データをデコードしてから追加（共通ユーティリティを使用）
                    const decodedPosts = result.value.posts.map(post => decodeObject(post));
                    this.allPosts.push(...decodedPosts);
                } else {
                    console.warn(`Failed to load ${monthData.month}:`, result.error);
                }
            }

            this.currentMonthIdx = monthsToLoad - 1;

            // Sort by date (descending)
            this.allPosts.sort((a, b) => b.creation_timestamp - a.creation_timestamp);

            // Display first page
            this.displayNextPage();

        } catch (error) {
            throw error;
        } finally {
            if (loadingElement) {
                loadingElement.classList.add('hidden');
            }
        }
    }

    /**
     * Display next page of posts
     */
    displayNextPage() {
        const startIdx = this.displayedPosts.length;
        const endIdx = startIdx + this.postsPerPage;
        const newPosts = this.allPosts.slice(startIdx, endIdx);

        if (newPosts.length > 0) {
            this.displayedPosts.push(...newPosts);

            if (startIdx === 0) {
                // Initial render
                const postsHTML = GalleryRenderer.renderPosts(this.displayedPosts, this.displayedPosts.length);
                this.container.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">${postsHTML}</div>`;
            } else {
                // Append to existing
                this.appendPosts(newPosts);
            }

            return true;
        }

        return false;
    }

    /**
     * Append posts to gallery
     */
    appendPosts(posts) {
        const container = document.getElementById('gallery-container');
        const grid = container.querySelector('.grid');

        if (!grid) {
            console.error('Grid not found');
            return;
        }

        posts.forEach(post => {
            const cardHTML = GalleryRenderer.renderPostCard(post);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cardHTML;
            grid.appendChild(tempDiv.firstElementChild);
        });
    }

    /**
     * Setup infinite scroll
     */
    setupInfiniteScroll(container) {
        this.infiniteScroll = new InfiniteScroll({
            loadMore: async () => {
                // Try to display next page from already loaded posts
                const hasMore = this.displayNextPage();

                if (!hasMore && this.currentMonthIdx < this.monthIndex.length - 1) {
                    // Load next month
                    await this.loadNextMonth();
                    return { hasMore: this.displayedPosts.length < this.allPosts.length };
                }

                return { hasMore: hasMore };
            },
            threshold: 200,
            throttleDelay: 300
        });

        this.infiniteScroll.init(container);
    }

    /**
     * Load next month's data
     */
    async loadNextMonth() {
        this.currentMonthIdx++;

        if (this.currentMonthIdx >= this.monthIndex.length) {
            console.log('All months loaded');
            return;
        }

        const monthData = this.monthIndex[this.currentMonthIdx];
        const [year, month] = monthData.month.split('-').map(Number);

        console.log(`Loading month: ${monthData.month}`);

        const result = await this.dataLoader.loadMonth(year, month);

        if (result.ok) {
            // データをデコードしてから追加（共通ユーティリティを使用）
            const newPosts = result.value.posts.map(post => decodeObject(post));
            this.allPosts.push(...newPosts);

            // Re-sort all posts
            this.allPosts.sort((a, b) => b.creation_timestamp - a.creation_timestamp);

            console.log(`Added ${newPosts.length} posts from ${monthData.month}`);
        } else {
            console.error(`Failed to load ${monthData.month}:`, result.error);
        }
    }

    /**
     * Setup filter functionality
     */
    setupFilters() {
        const searchInput = document.getElementById('search-input');
        const clearButton = document.getElementById('clear-filters');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterPosts(e.target.value);
            });
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                }
                this.displayedPosts = [];
                this.displayNextPage();
                this.updateStats();
            });
        }
    }

    /**
     * Filter posts by keyword
     */
    filterPosts(keyword) {
        if (!keyword.trim()) {
            this.displayedPosts = [];
            this.displayNextPage();
            this.updateStats();
            return;
        }

        const lowerKeyword = keyword.toLowerCase();
        const filtered = this.allPosts.filter(post => {
            const title = (post.title || '').toLowerCase();
            return title.includes(lowerKeyword);
        });

        this.displayedPosts = filtered;
        const postsHTML = GalleryRenderer.renderPosts(filtered, filtered.length);
        this.container.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">${postsHTML}</div>`;
        this.updateStats(filtered.length);

        // Stop infinite scroll during search
        if (this.infiniteScroll) {
            this.infiniteScroll.hasMore = false;
        }
    }

    /**
     * Update statistics display
     */
    updateStats(filteredCount = null) {
        const statsElement = document.getElementById('gallery-stats');
        if (!statsElement) return;

        const total = this.allPosts.length;
        const displayed = filteredCount !== null ? filteredCount : this.displayedPosts.length;

        statsElement.textContent = filteredCount !== null
            ? `${displayed}件の投稿が見つかりました`
            : `${displayed}/${total}件の投稿を表示中`;
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorElement = document.getElementById('error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new GalleryApp());
} else {
    new GalleryApp();
}
