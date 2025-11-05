/**
 * Infinite Scroll Handler
 * Implements infinite scrolling with Intersection Observer API
 */

export class InfiniteScroll {
    constructor(options = {}) {
        this.loadMore = options.loadMore || (() => {});
        this.threshold = options.threshold || 200;
        this.throttleDelay = options.throttleDelay || 300;
        this.isLoading = false;
        this.hasMore = true;

        this.observer = null;
        this.sentinel = null;
        this.throttleTimeout = null;
    }

    /**
     * Initialize infinite scroll
     * @param {HTMLElement} container - Container element
     */
    init(container) {
        if (!container) {
            console.error('Container element is required');
            return;
        }

        // Create sentinel element
        this.sentinel = document.createElement('div');
        this.sentinel.className = 'infinite-scroll-sentinel';
        this.sentinel.style.height = '1px';
        container.appendChild(this.sentinel);

        // Setup Intersection Observer
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            {
                root: null,
                rootMargin: `${this.threshold}px`,
                threshold: 0.01
            }
        );

        this.observer.observe(this.sentinel);
    }

    /**
     * Handle intersection events (throttled)
     */
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !this.isLoading && this.hasMore) {
                this.throttledLoad();
            }
        });
    }

    /**
     * Throttled load more
     */
    throttledLoad() {
        if (this.throttleTimeout) {
            return;
        }

        this.throttleTimeout = setTimeout(() => {
            this.load();
            this.throttleTimeout = null;
        }, this.throttleDelay);
    }

    /**
     * Execute load more callback
     */
    async load() {
        if (this.isLoading || !this.hasMore) {
            return;
        }

        this.isLoading = true;
        this.showLoading();

        try {
            const result = await this.loadMore();

            if (result && result.hasMore !== undefined) {
                this.hasMore = result.hasMore;
            }
        } catch (error) {
            console.error('Failed to load more:', error);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        if (!this.loadingElement) {
            this.loadingElement = document.createElement('div');
            this.loadingElement.className = 'text-center py-8';
            this.loadingElement.innerHTML = `
                <div class="inline-flex items-center gap-2 text-gray-600">
                    <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>読み込み中...</span>
                </div>
            `;
        }

        if (this.sentinel && !this.loadingElement.parentNode) {
            this.sentinel.parentNode.insertBefore(this.loadingElement, this.sentinel);
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        if (this.loadingElement && this.loadingElement.parentNode) {
            this.loadingElement.parentNode.removeChild(this.loadingElement);
        }
    }

    /**
     * Stop infinite scroll (no more data)
     */
    stop() {
        this.hasMore = false;
        this.hideLoading();

        if (!this.endMessage) {
            this.endMessage = document.createElement('div');
            this.endMessage.className = 'text-center py-8 text-gray-500';
            this.endMessage.textContent = 'すべての投稿を表示しました';
        }

        if (this.sentinel && !this.endMessage.parentNode) {
            this.sentinel.parentNode.insertBefore(this.endMessage, this.sentinel);
        }
    }

    /**
     * Destroy infinite scroll
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        if (this.sentinel && this.sentinel.parentNode) {
            this.sentinel.parentNode.removeChild(this.sentinel);
            this.sentinel = null;
        }

        if (this.loadingElement && this.loadingElement.parentNode) {
            this.loadingElement.parentNode.removeChild(this.loadingElement);
            this.loadingElement = null;
        }

        if (this.endMessage && this.endMessage.parentNode) {
            this.endMessage.parentNode.removeChild(this.endMessage);
            this.endMessage = null;
        }

        if (this.throttleTimeout) {
            clearTimeout(this.throttleTimeout);
            this.throttleTimeout = null;
        }
    }
}
