/**
 * Instagram Data Loader Module
 *
 * 月別JSONファイルを非同期で読み込み、メモリキャッシュで重複読み込みを防止。
 * ネットワークエラー時のリトライロジック（指数バックオフ、最大3回）を実装。
 * オフライン時にキャッシュデータへフォールバック。
 */

export class DataLoader {
    constructor() {
        this.cache = new Map(); // メモリキャッシュ
        this.loadingPromises = new Map(); // 重複リクエスト防止
        this.indexData = null;
    }

    /**
     * 初期化: インデックスファイルを読み込む
     */
    async init() {
        try {
            this.indexData = await this.fetchWithRetry('/data/posts-index.json');
            console.log('✅ Data loader initialized:', this.indexData.totalPosts, 'posts available');
            return this.indexData;
        } catch (error) {
            console.error('❌ Failed to initialize data loader:', error);
            throw new Error('データの初期化に失敗しました');
        }
    }

    /**
     * 指定月のデータを取得（キャッシュ優先）
     * @param {number} year - 年 (例: 2025)
     * @param {number} month - 月 (例: 5)
     * @returns {Promise<Object>} { ok: true, value: posts } または { ok: false, error: error }
     */
    async loadMonth(year, month) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const filename = `/data/posts-${monthKey}.json`;

        try {
            // キャッシュチェック
            if (this.cache.has(monthKey)) {
                console.log(`📦 Cache hit: ${monthKey}`);
                return { ok: true, value: this.cache.get(monthKey) };
            }

            // 重複リクエスト防止
            if (this.loadingPromises.has(monthKey)) {
                console.log(`⏳ Waiting for existing request: ${monthKey}`);
                return await this.loadingPromises.get(monthKey);
            }

            // 新規読み込み
            console.log(`📥 Loading: ${monthKey}`);
            const loadPromise = this._loadMonthInternal(filename, monthKey);
            this.loadingPromises.set(monthKey, loadPromise);

            const result = await loadPromise;
            this.loadingPromises.delete(monthKey);

            return result;

        } catch (error) {
            this.loadingPromises.delete(monthKey);
            return {
                ok: false,
                error: {
                    type: 'UnexpectedError',
                    message: error.message,
                    retryable: true
                }
            };
        }
    }

    /**
     * 最新Nヶ月分を一括取得
     * @param {number} months - 取得する月数
     * @returns {Promise<Object>} { ok: true, value: posts[] }
     */
    async loadLatest(months = 1) {
        if (!this.indexData) {
            await this.init();
        }

        const latestMonths = this.indexData.months.slice(0, months);
        const results = await Promise.all(
            latestMonths.map(monthKey => {
                const [year, month] = monthKey.split('-').map(Number);
                return this.loadMonth(year, month);
            })
        );

        // 成功した結果のみを結合
        const allPosts = results
            .filter(r => r.ok)
            .flatMap(r => r.value.posts || []);

        if (allPosts.length === 0) {
            return {
                ok: false,
                error: {
                    type: 'NoDataAvailable',
                    message: 'データが取得できませんでした',
                    retryable: true
                }
            };
        }

        return { ok: true, value: allPosts };
    }

    /**
     * すべてのデータを取得（ギャラリーページ用）
     * @returns {Promise<Object>} { ok: true, value: posts[] }
     */
    async loadAll() {
        if (!this.indexData) {
            await this.init();
        }

        return this.loadLatest(this.indexData.months.length);
    }

    /**
     * 内部: 月別ファイルを読み込み
     */
    async _loadMonthInternal(filename, monthKey) {
        try {
            const data = await this.fetchWithRetry(filename);

            // キャッシュに保存
            this.cache.set(monthKey, data);

            return { ok: true, value: data };

        } catch (error) {
            console.error(`❌ Failed to load ${monthKey}:`, error);

            // オフライン時にキャッシュからフォールバック
            if (this.cache.has(monthKey)) {
                console.log(`📦 Fallback to cached data: ${monthKey}`);
                return { ok: true, value: this.cache.get(monthKey) };
            }

            return {
                ok: false,
                error: {
                    type: this._classifyError(error),
                    message: error.message,
                    retryable: error.name === 'NetworkError'
                }
            };
        }
    }

    /**
     * リトライ機能付きフェッチ
     * @param {string} url
     * @param {number} maxRetries - 最大リトライ回数（デフォルト: 3）
     * @returns {Promise<any>} パース済みJSON
     */
    async fetchWithRetry(url, maxRetries = 3) {
        let lastError;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const response = await fetch(url);

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error(`ファイルが見つかりません: ${url}`);
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                return data;

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Attempt ${attempt + 1}/${maxRetries} failed:`, error.message);

                // 最後の試行でない場合、指数バックオフで待機
                if (attempt < maxRetries - 1) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // 最大10秒
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    await this._sleep(delay);
                }
            }
        }

        // すべてのリトライ失敗
        const error = new Error(`Failed to fetch ${url} after ${maxRetries} attempts: ${lastError.message}`);
        error.name = 'NetworkError';
        throw error;
    }

    /**
     * エラー分類
     */
    _classifyError(error) {
        if (error.name === 'NetworkError') return 'NetworkError';
        if (error.message.includes('JSON')) return 'ParseError';
        if (error.message.includes('見つかりません')) return 'NotFoundError';
        return 'UnexpectedError';
    }

    /**
     * スリープ関数
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * キャッシュクリア
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache cleared');
    }

    /**
     * キャッシュサイズ取得
     */
    getCacheSize() {
        return this.cache.size;
    }

    /**
     * キャッシュ状態取得
     */
    getCacheStatus() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Default export for convenience
export default DataLoader;
