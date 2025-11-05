/**
 * Platycerium Collection - Main Application
 * Entry point for the static site
 */

// Import GalleryRenderer (ES Module style)
import { GalleryRenderer } from './gallery-renderer.js';
import { decodeObject } from './utils/instagram-decoder.js';

// Error Handler Class
class ErrorHandler {
    static handle(error, context = 'unknown') {
        console.error(`[Error - ${context}]:`, error);

        // Track error (Google Analytics will be added later)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exception', {
                description: `${context}: ${error.message}`,
                fatal: false
            });
        }

        return null;
    }

    static showUserMessage(message, type = 'error') {
        // Simple toast notification (can be enhanced with a library later)
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } text-white`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
});

// Router (Simple Hash-based routing for SPA-like experience)
class Router {
    constructor() {
        this.routes = {
            '/': this.renderHome.bind(this),
            '/gallery': this.renderGallery.bind(this),
            '/post/:id': this.renderPostDetail.bind(this),
            '/about': this.renderAbout.bind(this)
        };

        this.init();
    }

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());
    }

    handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const route = this.matchRoute(hash);

        if (route) {
            route.handler(route.params);
        } else {
            this.render404();
        }
    }

    matchRoute(path) {
        for (const [pattern, handler] of Object.entries(this.routes)) {
            const regex = new RegExp('^' + pattern.replace(/:[^\s/]+/g, '([\\w-]+)') + '$');
            const match = path.match(regex);

            if (match) {
                const keys = pattern.match(/:[^\s/]+/g) || [];
                const params = {};
                keys.forEach((key, i) => {
                    params[key.slice(1)] = match[i + 1];
                });
                return { handler, params };
            }
        }
        return null;
    }

    async renderHome() {
        const main = document.getElementById('app-main');
        if (!main) return;

        try {
            // Show loading indicator
            main.innerHTML = `
                <div class="flex justify-center items-center py-20">
                    <div class="animate-spin rounded-full h-16 w-16 border-4 border-forest-light border-t-transparent"></div>
                </div>
            `;

            // Load latest posts from actual data
            const posts = await this.loadLatestPosts(12);

            // Render home page
            main.innerHTML = `
                <div class="mb-8 fade-in">
                    <h2 class="text-3xl md:text-4xl font-bold mb-4">最新の投稿</h2>
                    <p class="text-gray-600">ビカクシダ（コウモリラン）の美しい写真をお楽しみください</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 fade-in" id="posts-grid">
                    ${GalleryRenderer.renderPosts(posts, 12)}
                </div>

                <div class="text-center mt-12 fade-in">
                    <a href="gallery.html" class="inline-block bg-forest-mid hover:bg-forest-dark text-white font-semibold py-3 px-8 rounded-lg transition-colors">
                        すべての投稿を見る →
                    </a>
                </div>
            `;
        } catch (error) {
            ErrorHandler.handle(error, 'renderHome');
            main.innerHTML = `
                <div class="text-center py-20">
                    <div class="text-6xl mb-4">⚠️</div>
                    <p class="text-xl text-gray-600 mb-4">データの読み込みに失敗しました</p>
                    <p class="text-sm text-gray-500 mb-4">${error.message}</p>
                    <button onclick="location.reload()" class="bg-forest-mid hover:bg-forest-dark text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                        再読み込み
                    </button>
                </div>
            `;
        }
    }

    renderGallery() {
        // Redirect to gallery.html
        window.location.href = '/gallery.html';
    }

    renderPostDetail(params) {
        // Redirect to detail.html with post ID
        window.location.href = `/detail.html?id=${params.id}`;
    }

    renderAbout() {
        const main = document.getElementById('app-main');
        if (!main) return;

        main.innerHTML = `
            <div class="max-w-3xl mx-auto fade-in">
                <h2 class="text-3xl md:text-4xl font-bold mb-6">このサイトについて</h2>

                <div class="prose prose-lg max-w-none">
                    <p class="text-gray-700 mb-4">
                        Platycerium Collection（プラティセリウム・コレクション）は、ビカクシダ（コウモリラン）専門の植物図鑑サイトです。
                    </p>

                    <p class="text-gray-700 mb-4">
                        Instagram投稿1,024件と355枚の美しい写真を活用して、ビカクシダの魅力を視覚的にお伝えします。
                    </p>

                    <h3 class="text-2xl font-bold mt-8 mb-4">ビカクシダとは</h3>
                    <p class="text-gray-700 mb-4">
                        ビカクシダ（学名: Platycerium）は、シダ植物門ウラボシ科に属する着生植物です。
                        独特の形状から「コウモリラン」とも呼ばれ、観葉植物として人気があります。
                    </p>

                    <h3 class="text-2xl font-bold mt-8 mb-4">運営者</h3>
                    <p class="text-gray-700 mb-4">
                        Instagram: <a href="https://instagram.com" target="_blank" rel="noopener" class="text-forest-mid hover:text-forest-dark">@platycerium_collection</a>
                    </p>
                </div>
            </div>
        `;
    }

    render404() {
        const main = document.getElementById('app-main');
        if (!main) return;

        main.innerHTML = `
            <div class="text-center py-20">
                <h2 class="text-4xl font-bold mb-4">404</h2>
                <p class="text-xl text-gray-600 mb-8">ページが見つかりませんでした</p>
                <a href="#/" class="inline-block bg-forest-mid hover:bg-forest-dark text-white font-semibold py-3 px-8 rounded-lg transition-colors">
                    ホームに戻る
                </a>
            </div>
        `;
    }

    /**
     * 最新の投稿データを読み込む
     * @param {Number} limit - 読み込む件数
     * @returns {Promise<Array>} 投稿データの配列
     */
    async loadLatestPosts(limit = 12) {
        try {
            // 最新月のデータを読み込む（2025-05）
            const response = await fetch('/data/posts-2025-05.json');

            if (!response.ok) {
                throw new Error(`データの読み込みに失敗しました: ${response.status}`);
            }

            const data = await response.json();

            if (!data.posts || !Array.isArray(data.posts)) {
                throw new Error('投稿データの形式が不正です');
            }

            // データをデコード（共通ユーティリティを使用）
            const decodedPosts = data.posts.map(post => decodeObject(post));

            // 最新順にソート（creation_timestampの降順）
            const sortedPosts = decodedPosts.sort((a, b) =>
                b.creation_timestamp - a.creation_timestamp
            );

            return sortedPosts.slice(0, limit);
        } catch (error) {
            console.error('データ読み込みエラー:', error);
            throw error;
        }
    }
}

// Initialize Router
const router = new Router();

// Export for use in other modules
window.ErrorHandler = ErrorHandler;
window.Router = router;
