/**
 * ナビゲーション・フッター共通化モジュール
 * 全ページで共通のヘッダー・フッター要素を動的生成
 */

class NavigationManager {
    constructor() {
        this.currentPath = window.location.pathname;
        this.init();
    }

    /**
     * 初期化
     */
    init() {
        this.renderHeader();
        this.renderFooter();
        this.setupMobileMenu();
    }

    /**
     * 現在のページがアクティブか判定
     */
    isActivePage(href) {
        // ホームページ
        if (href === '/' || href === '#/') {
            return this.currentPath === '/' || this.currentPath === '/index.html';
        }

        // 相対パス、絶対パスに対応
        if (href.startsWith('/')) {
            return this.currentPath === href || this.currentPath === `${href}index.html`;
        }

        // ハッシュリンク（#/about等）
        if (href.startsWith('#/')) {
            return window.location.hash === href;
        }

        return false;
    }

    /**
     * アクティブクラスを取得
     */
    getActiveClass(href) {
        return this.isActivePage(href) ? 'text-forest-light font-semibold' : 'hover:text-forest-light transition-colors';
    }

    /**
     * ヘッダーをレンダリング
     */
    renderHeader() {
        const header = document.querySelector('header');
        if (!header) {
            console.error('Header element not found');
            return;
        }

        const headerHTML = `
            <div class="container mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <h1 class="text-2xl md:text-3xl font-bold">
                        <a href="/" class="hover:text-forest-light transition-colors">
                            🌿 Platycerium Collection
                        </a>
                    </h1>

                    <!-- Desktop Navigation -->
                    <nav class="hidden md:flex items-center space-x-6">
                        <a href="/" class="${this.getActiveClass('/')}">ホーム</a>
                        <a href="/species/" class="${this.getActiveClass('/species/')}">ギャラリー</a>
                        <a href="#/about" class="${this.getActiveClass('#/about')}">サイトについて</a>
                    </nav>

                    <!-- Mobile Menu Button -->
                    <button id="mobile-menu-btn" class="md:hidden p-2 hover:bg-forest-mid rounded-lg transition-colors" aria-label="メニューを開く">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </div>

                <!-- Search Bar -->
                <div class="mt-4">
                    <input
                        type="search"
                        id="search-input"
                        placeholder="植物名、キーワードで検索..."
                        class="w-full md:w-96 px-4 py-2 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-light"
                        aria-label="投稿を検索"
                    >
                </div>
            </div>

            <!-- Mobile Menu -->
            <nav id="mobile-menu" class="hidden md:hidden bg-forest-mid px-4 py-4 space-y-2">
                <a href="/" class="${this.isActivePage('/') ? 'block py-2 text-forest-light font-semibold' : 'block py-2 hover:text-forest-light transition-colors'}">ホーム</a>
                <a href="/species/" class="${this.isActivePage('/species/') ? 'block py-2 text-forest-light font-semibold' : 'block py-2 hover:text-forest-light transition-colors'}">ギャラリー</a>
                <a href="#/about" class="${this.isActivePage('#/about') ? 'block py-2 text-forest-light font-semibold' : 'block py-2 hover:text-forest-light transition-colors'}">サイトについて</a>
            </nav>
        `;

        header.innerHTML = headerHTML;
    }

    /**
     * フッターをレンダリング
     */
    renderFooter() {
        const footer = document.querySelector('footer');
        if (!footer) {
            console.error('Footer element not found');
            return;
        }

        const footerHTML = `
            <div class="container mx-auto px-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <!-- About -->
                    <div>
                        <h3 class="text-lg font-bold mb-4">Platycerium Collection</h3>
                        <p class="text-sm text-gray-300">
                            ビカクシダ（コウモリラン）専門の植物図鑑。Instagram投稿から生成された美しい写真と育て方ガイド。
                        </p>
                    </div>

                    <!-- Links -->
                    <div>
                        <h3 class="text-lg font-bold mb-4">リンク</h3>
                        <ul class="space-y-2 text-sm">
                            <li><a href="/" class="hover:text-forest-light transition-colors">ホーム</a></li>
                            <li><a href="/species/" class="hover:text-forest-light transition-colors">ギャラリー</a></li>
                            <li><a href="#/about" class="hover:text-forest-light transition-colors">サイトについて</a></li>
                        </ul>
                    </div>

                    <!-- Social -->
                    <div>
                        <h3 class="text-lg font-bold mb-4">フォローする</h3>
                        <div class="flex space-x-4">
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                               class="text-2xl hover:text-forest-light transition-colors"
                               aria-label="Instagram">
                                📷
                            </a>
                            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                               class="text-2xl hover:text-forest-light transition-colors"
                               aria-label="Twitter">
                                🐦
                            </a>
                        </div>
                    </div>
                </div>

                <div class="border-t border-forest-mid mt-8 pt-8 text-center text-sm text-gray-300">
                    <p>&copy; 2025 Platycerium Collection. All rights reserved.</p>
                </div>
            </div>
        `;

        footer.innerHTML = footerHTML;
    }

    /**
     * モバイルメニューの開閉設定
     */
    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');

        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');

                // アクセシビリティ対応
                const isExpanded = !mobileMenu.classList.contains('hidden');
                mobileMenuBtn.setAttribute('aria-expanded', isExpanded.toString());
            });

            // モバイルメニューのリンクをクリックしたら閉じる
            mobileMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    mobileMenu.classList.add('hidden');
                    mobileMenuBtn.setAttribute('aria-expanded', 'false');
                });
            });
        }
    }
}

// DOMContentLoaded後に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new NavigationManager();
    });
} else {
    // すでにDOMが読み込まれている場合
    new NavigationManager();
}

// モジュールとしてエクスポート（必要に応じて）
export default NavigationManager;
