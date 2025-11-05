/**
 * Image Loader & Lazy Loading Module
 *
 * Intersection Observerでビューポート外の画像を遅延読み込み。
 * WebP形式への変換とフォールバック、読み込み中のプレースホルダー、
 * フェードインアニメーションを実装。
 */

class ImageLoader {
    constructor() {
        this.observer = null;
        this.options = {
            root: null, // viewport
            rootMargin: '200px', // 200px手前で読み込み開始
            threshold: 0.01
        };

        this.placeholderDataURL = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f0f0f0" width="400" height="400"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E読み込み中...%3C/text%3E%3C/svg%3E';

        this.init();
    }

    /**
     * 初期化: Intersection Observer セットアップ
     */
    init() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(
                this.handleIntersection.bind(this),
                this.options
            );
            console.log('✅ Image lazy loading initialized');
        } else {
            // Fallback: すぐに全画像読み込み
            console.warn('⚠️ IntersectionObserver not supported, loading all images immediately');
        }
    }

    /**
     * Intersection Observer コールバック
     */
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                this.loadImage(img);
                this.observer.unobserve(img);
            }
        });
    }

    /**
     * 画像を遅延読み込み対象として登録
     * @param {HTMLImageElement} img - 画像要素
     */
    observe(img) {
        if (this.observer) {
            // data-src属性からsrcへ移動（遅延読み込み）
            if (!img.dataset.src && img.src && img.src !== this.placeholderDataURL) {
                img.dataset.src = img.src;
                img.src = this.placeholderDataURL;
            }

            this.observer.observe(img);
        } else {
            // Fallback: すぐに読み込み
            this.loadImage(img);
        }
    }

    /**
     * 複数の画像を一括登録
     * @param {NodeList|Array} images - 画像要素の配列
     */
    observeAll(images) {
        images.forEach(img => this.observe(img));
    }

    /**
     * 画像を実際に読み込む
     * @param {HTMLImageElement} img - 画像要素
     */
    async loadImage(img) {
        const src = img.dataset.src || img.src;

        if (!src || src === this.placeholderDataURL) {
            console.warn('⚠️ No image source found:', img);
            return;
        }

        try {
            // WebP サポートチェック
            const supportsWebP = await this.checkWebPSupport();
            const imageSrc = supportsWebP ? this.getWebPUrl(src) : src;

            // 画像プリロード
            const preloadImg = new Image();
            preloadImg.onload = () => {
                // フェードイン開始
                img.src = imageSrc;
                img.classList.add('fade-in');
                img.removeAttribute('data-src');
            };

            preloadImg.onerror = () => {
                // WebP失敗時のフォールバック
                if (supportsWebP && imageSrc !== src) {
                    console.warn('⚠️ WebP load failed, fallback to original:', src);
                    img.src = src;
                } else {
                    console.error('❌ Image load failed:', src);
                    img.alt = '画像の読み込みに失敗しました';
                }
            };

            preloadImg.src = imageSrc;

        } catch (error) {
            console.error('❌ Error loading image:', error);
            img.src = src; // フォールバック
        }
    }

    /**
     * WebP URLを生成
     * @param {string} originalUrl - 元のURL
     * @returns {string} WebP URL
     */
    getWebPUrl(originalUrl) {
        // .jpg, .jpeg, .png を .webp に変換
        return originalUrl.replace(/\.(jpe?g|png)$/i, '.webp');
    }

    /**
     * WebP サポート確認（キャッシュ付き）
     * @returns {Promise<boolean>}
     */
    async checkWebPSupport() {
        if (this._webpSupport !== undefined) {
            return this._webpSupport;
        }

        return new Promise((resolve) => {
            const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
            const img = new Image();
            img.onload = () => {
                this._webpSupport = (img.width > 0) && (img.height > 0);
                resolve(this._webpSupport);
            };
            img.onerror = () => {
                this._webpSupport = false;
                resolve(false);
            };
            img.src = webpData;
        });
    }

    /**
     * picture 要素を生成（WebP + JPEG フォールバック）
     * @param {string} src - 画像URL
     * @param {string} alt - 代替テキスト
     * @param {string} className - CSSクラス
     * @returns {HTMLPictureElement}
     */
    createPictureElement(src, alt, className = '') {
        const picture = document.createElement('picture');

        // WebP source
        const webpSource = document.createElement('source');
        webpSource.srcset = this.getWebPUrl(src);
        webpSource.type = 'image/webp';
        picture.appendChild(webpSource);

        // Fallback img
        const img = document.createElement('img');
        img.dataset.src = src;
        img.src = this.placeholderDataURL;
        img.alt = alt;
        img.className = className;
        img.loading = 'lazy'; // Native lazy loading（サポートブラウザ用）
        picture.appendChild(img);

        // Intersection Observer登録
        this.observe(img);

        return picture;
    }

    /**
     * srcset 生成（レスポンシブ画像）
     * @param {string} baseUrl - ベースURL
     * @param {Array<number>} sizes - 画像サイズの配列 [400, 800, 1200]
     * @returns {string} srcset文字列
     */
    generateSrcSet(baseUrl, sizes = [400, 800, 1200]) {
        // 実装例: baseUrl が "/images/photo.jpg" の場合
        // "/images/photo-400.jpg 400w, /images/photo-800.jpg 800w, /images/photo-1200.jpg 1200w"
        const ext = baseUrl.match(/\.[^.]+$/)?.[0] || '.jpg';
        const baseName = baseUrl.replace(ext, '');

        return sizes
            .map(size => `${baseName}-${size}${ext} ${size}w`)
            .join(', ');
    }

    /**
     * すべての監視を停止
     */
    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
            console.log('🛑 Image lazy loading disconnected');
        }
    }

    /**
     * プレースホルダー画像のカスタマイズ
     * @param {string} text - プレースホルダーに表示するテキスト
     * @param {string} bgColor - 背景色
     * @param {string} textColor - テキスト色
     */
    setPlaceholder(text = '読み込み中...', bgColor = '#f0f0f0', textColor = '#999') {
        this.placeholderDataURL = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="${encodeURIComponent(bgColor)}" width="400" height="400"/%3E%3Ctext fill="${encodeURIComponent(textColor)}" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`;
    }
}

// シングルトンインスタンス
const imageLoader = new ImageLoader();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = imageLoader;
}

if (typeof window !== 'undefined') {
    window.imageLoader = imageLoader;
}
