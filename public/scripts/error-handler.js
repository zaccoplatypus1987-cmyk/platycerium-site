/**
 * Error Handler Module
 * Centralized error handling and logging
 */

export class ErrorHandler {
    /**
     * Handle errors with logging and user feedback
     * @param {Error} error - The error object
     * @param {string} context - Where the error occurred
     */
    static handle(error, context = 'Unknown') {
        // Log to console for debugging
        console.error(`[${context}]`, error);

        // Log error details
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }

        // Send to analytics (if available)
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'exception', {
                description: `${context}: ${error.message}`,
                fatal: false
            });
        }

        // Return user-friendly error message
        return this.getUserMessage(error);
    }

    /**
     * Get user-friendly error message
     * @param {Error} error
     * @returns {string}
     */
    static getUserMessage(error) {
        // Network errors
        if (error.name === 'NetworkError' || error.message.includes('fetch')) {
            return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
        }

        // 404 errors
        if (error.message.includes('404') || error.message.includes('見つかりません')) {
            return 'データが見つかりませんでした。';
        }

        // Parse errors
        if (error.message.includes('JSON')) {
            return 'データの読み込みに失敗しました。';
        }

        // Generic error
        return error.message || 'エラーが発生しました。ページを再読み込みしてください。';
    }

    /**
     * Show error to user
     * @param {string} message
     * @param {string} elementId - ID of error display element
     */
    static showError(message, elementId = 'error') {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            const messageElement = errorElement.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            } else {
                errorElement.textContent = message;
            }
            errorElement.classList.remove('hidden');
        }

        // Hide loading indicator
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
    }

    /**
     * Log warning
     * @param {string} message
     * @param {string} context
     */
    static warn(message, context = 'Unknown') {
        console.warn(`[${context}]`, message);
    }

    /**
     * Log info
     * @param {string} message
     * @param {string} context
     */
    static info(message, context = 'Unknown') {
        console.log(`[${context}]`, message);
    }
}
