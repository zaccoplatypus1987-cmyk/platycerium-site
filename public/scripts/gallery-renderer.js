/**
 * GalleryRenderer - 投稿カード表示モジュール
 * 投稿データをカード形式でレンダリング
 */

export class GalleryRenderer {
    /**
     * 投稿カードのHTML生成
     * @param {Array} posts - 投稿データの配列
     * @param {Number} limit - 表示件数制限
     * @returns {String} HTMLマークアップ
     */
    static renderPosts(posts, limit = 12) {
        if (!posts || posts.length === 0) {
            return this.renderEmptyState();
        }

        const displayPosts = posts.slice(0, limit);
        return displayPosts.map(post => this.renderPostCard(post)).join('');
    }

    /**
     * 個別の投稿カードを生成
     * @param {Object} post - 投稿データ
     * @returns {String} カードのHTMLマークアップ
     */
    static renderPostCard(post) {
        const date = this.formatDate(post);
        const thumbnail = this.getThumbnail(post);
        const title = this.extractTitle(post);
        const caption = this.truncateCaption(post.title || '', 80);
        const hashtags = this.extractHashtags(post);

        return `
            <a href="detail.html?id=${post.id}"
               class="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group"
               style="min-height: 44px; min-width: 44px;">
                <!-- サムネイル画像 -->
                <div class="aspect-w-1 aspect-h-1 bg-gray-200 overflow-hidden">
                    <img
                        src="${thumbnail}"
                        alt="${title}"
                        class="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'w-full h-64 bg-gray-300 flex items-center justify-center text-gray-500\\'>画像なし</div>'"
                    >
                </div>

                <!-- カード情報 -->
                <div class="p-4">
                    <!-- タイトル -->
                    <h3 class="font-semibold text-lg mb-2 text-gray-900 line-clamp-1 group-hover:text-forest-mid transition-colors">
                        ${title}
                    </h3>

                    <!-- 投稿日時 -->
                    <time class="text-sm text-gray-600 block mb-2" datetime="${post.creation_timestamp}">
                        ${date}
                    </time>

                    <!-- キャプション抜粋 -->
                    <p class="text-gray-700 text-sm line-clamp-2 mb-3">
                        ${caption}
                    </p>

                    <!-- ハッシュタグ -->
                    ${hashtags.length > 0 ? `
                        <div class="flex flex-wrap gap-1">
                            ${hashtags.slice(0, 3).map(tag => `
                                <span class="inline-block bg-forest-light/10 text-forest-dark text-xs px-2 py-1 rounded">
                                    ${tag}
                                </span>
                            `).join('')}
                            ${hashtags.length > 3 ? `
                                <span class="inline-block text-gray-500 text-xs px-2 py-1">
                                    +${hashtags.length - 3}
                                </span>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </a>
        `;
    }

    /**
     * サムネイル画像のパスを取得
     * @param {Object} post - 投稿データ
     * @returns {String} 画像パス
     */
    static getThumbnail(post) {
        if (post.media && post.media.length > 0) {
            // 画像URIの先頭にスラッシュを追加（パスの正規化）
            const uri = post.media[0].uri;
            return uri.startsWith('/') ? uri : `/${uri}`;
        }
        // プレースホルダーはCSSで対応（画像ファイルなし）
        return '';
    }

    /**
     * 投稿のタイトルを抽出（最初の行または植物名）
     * @param {Object} post - 投稿データ
     * @returns {String} タイトル
     */
    static extractTitle(post) {
        if (!post.title) return 'ビカクシダの写真';

        // 最初の行を取得（改行まで）
        const firstLine = post.title.split('\n')[0].trim();

        // 最初の行が短すぎる場合は植物名を抽出
        if (firstLine.length < 5) {
            // P.で始まる植物名を探す
            const plantMatch = post.title.match(/P\.[a-zA-Z\s]+/);
            if (plantMatch) return plantMatch[0];
        }

        return firstLine || 'ビカクシダの写真';
    }

    /**
     * キャプションを指定文字数で切り詰め
     * @param {String} text - キャプション
     * @param {Number} maxLength - 最大文字数
     * @returns {String} 切り詰められたテキスト
     */
    static truncateCaption(text, maxLength) {
        // ハッシュタグを除去
        const textWithoutHashtags = text.split('\n')
            .filter(line => !line.trim().startsWith('#'))
            .join('\n')
            .trim();

        if (textWithoutHashtags.length <= maxLength) {
            return textWithoutHashtags;
        }

        return textWithoutHashtags.substring(0, maxLength) + '...';
    }

    /**
     * ハッシュタグを抽出
     * @param {Object} post - 投稿データ
     * @returns {Array} ハッシュタグの配列
     */
    static extractHashtags(post) {
        if (post.hashtags && Array.isArray(post.hashtags)) {
            return post.hashtags.slice(0, 5); // 最大5件
        }
        return [];
    }

    /**
     * 日付をフォーマット
     * @param {Object} post - 投稿データ
     * @returns {String} フォーマットされた日付
     */
    static formatDate(post) {
        if (post.year && post.month && post.day) {
            return `${post.year}年${post.month}月${post.day}日`;
        }

        if (post.creation_timestamp) {
            const date = new Date(post.creation_timestamp * 1000);
            return date.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        return '日付不明';
    }

    /**
     * 投稿が0件の場合の表示
     * @returns {String} 空状態のHTML
     */
    static renderEmptyState() {
        return `
            <div class="col-span-full text-center py-20">
                <div class="text-6xl mb-4">🌿</div>
                <h3 class="text-2xl font-bold text-gray-700 mb-2">投稿がありません</h3>
                <p class="text-gray-600">新しい投稿をお待ちください</p>
            </div>
        `;
    }

    /**
     * ローディング状態の表示
     * @returns {String} ローディングHTML
     */
    static renderLoading() {
        return `
            <div class="col-span-full flex justify-center items-center py-20">
                <div class="animate-spin rounded-full h-16 w-16 border-4 border-forest-light border-t-transparent"></div>
            </div>
        `;
    }

    /**
     * エラー表示
     * @param {String} message - エラーメッセージ
     * @returns {String} エラーHTML
     */
    static renderError(message = 'データの読み込みに失敗しました') {
        return `
            <div class="col-span-full text-center py-20">
                <div class="text-6xl mb-4">⚠️</div>
                <h3 class="text-2xl font-bold text-red-600 mb-2">エラー</h3>
                <p class="text-gray-600 mb-4">${message}</p>
                <button
                    onclick="location.reload()"
                    class="bg-forest-mid hover:bg-forest-dark text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                    再読み込み
                </button>
            </div>
        `;
    }
}

// グローバルに公開（ES Modules非対応ブラウザ対応）
if (typeof window !== 'undefined') {
    window.GalleryRenderer = GalleryRenderer;
}
