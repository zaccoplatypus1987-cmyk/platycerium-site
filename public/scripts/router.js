/**
 * Navigation Helper
 * Provides smooth navigation and history management
 */

export class NavigationHelper {
    constructor() {
        this.setupLinkInterception();
        this.setupBackButton();
    }

    /**
     * Setup smooth link interception for internal navigation
     */
    setupLinkInterception() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');

            if (!link) return;

            const href = link.getAttribute('href');

            // Check if it's an internal link
            if (href && this.isInternalLink(href)) {
                // Allow default navigation for now
                // In future, can add smooth transitions here
            }
        });
    }

    /**
     * Check if link is internal
     */
    isInternalLink(href) {
        return href.startsWith('/') ||
               href.startsWith('./') ||
               href.startsWith('#') ||
               (!href.startsWith('http') && !href.startsWith('mailto:'));
    }

    /**
     * Setup back button history management
     */
    setupBackButton() {
        // Add current page to history
        const currentPath = window.location.pathname;
        const pageTitle = document.title;

        // Replace current state with page info
        if (window.history.replaceState) {
            window.history.replaceState(
                { path: currentPath, title: pageTitle },
                pageTitle,
                currentPath
            );
        }

        // Handle back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.title) {
                document.title = e.state.title;
            }
        });
    }

    /**
     * Navigate to a page programmatically
     */
    static navigateTo(url, title = '') {
        if (title) {
            document.title = title;
        }

        window.location.href = url;
    }

    /**
     * Go back in history
     */
    static goBack() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            // Fallback to gallery if no history
            window.location.href = '/gallery.html';
        }
    }

    /**
     * Scroll to top smoothly
     */
    static scrollToTop(smooth = true) {
        window.scrollTo({
            top: 0,
            behavior: smooth ? 'smooth' : 'auto'
        });
    }

    /**
     * Add smooth scroll to all anchor links
     */
    static setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href').slice(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });

                    // Update URL without reload
                    if (window.history.pushState) {
                        window.history.pushState(null, null, `#${targetId}`);
                    }
                }
            });
        });
    }
}

// Auto-initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new NavigationHelper();
        NavigationHelper.setupSmoothScroll();
    });
} else {
    new NavigationHelper();
    NavigationHelper.setupSmoothScroll();
}
