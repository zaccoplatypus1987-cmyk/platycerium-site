/**
 * Species Page Application
 * Handles species listing with hierarchical sub-species display
 */

import { ErrorHandler } from './error-handler.js';

class SpeciesApp {
    constructor() {
        this.speciesData = null;
        this.pureSpecies = [];
        this.hybridSpecies = [];
        this.meta = null;
        this.container = null;
        this.expandedSpecies = new Set();
        this.init();
    }

    async init() {
        try {
            this.container = document.getElementById('species-container');
            if (!this.container) {
                throw new Error('Species container not found');
            }

            await this.loadData();
            this.render();
            this.setupEventListeners();

        } catch (error) {
            ErrorHandler.handle(error, 'SpeciesApp.init');
            this.showError('品種データの読み込みに失敗しました');
        }
    }

    /**
     * Load and separate species data
     */
    async loadData() {
        try {
            const response = await fetch('/data/species-hierarchy-index.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // 原種（hierarchyエントリ）
            this.pureSpecies = (data.hierarchy || []).filter(item => item.type === 'pure');

            // 交配種（hierarchyエントリでtype === 'hybrid'）
            const hybridHierarchy = (data.hierarchy || []).filter(item => item.type === 'hybrid');

            // 交配種の統計を計算
            const hybridTotalPosts = hybridHierarchy.reduce((sum, item) => sum + (item.totalPosts || 0), 0);
            const hybridCount = hybridHierarchy.length;

            // 交配種を1つのグループとして保存
            this.hybridSpecies = hybridHierarchy;
            this.hybridGroupData = {
                id: 'hybrid',
                name: 'Hybrids',
                nameJa: '交配種',
                type: 'hybrid',
                totalPosts: hybridTotalPosts,
                subSpeciesCount: hybridCount,
                subSpecies: hybridHierarchy,
                latestImage: hybridHierarchy[0]?.latestImage || null
            };

            this.meta = data.meta;

            console.log(`✅ Loaded ${this.pureSpecies.length} pure species and ${hybridCount} hybrid species`);

        } catch (error) {
            throw new Error('品種インデックスの読み込みに失敗しました');
        }
    }

    /**
     * Render species list
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.className = 'species-header mb-8';
        const totalSpecies = this.pureSpecies.length + (this.hybridGroupData ? 1 : 0);
        const totalPosts = this.meta?.totalPosts || 0;
        header.innerHTML = `
            <h1 class="text-3xl font-bold text-gray-800 mb-2">品種一覧</h1>
            <p class="text-gray-600">原種${this.pureSpecies.length}種 + 交配種、
               ${totalPosts}件の投稿</p>
        `;
        this.container.appendChild(header);

        // Species grid
        const grid = document.createElement('div');
        grid.className = 'species-grid grid gap-6 md:grid-cols-2 lg:grid-cols-3';

        // 原種カードを表示
        for (const species of this.pureSpecies) {
            const card = this.createSpeciesCard(species);
            grid.appendChild(card);
        }

        // 交配種グループカードを表示
        if (this.hybridGroupData) {
            const hybridCard = this.createHybridGroupCard(this.hybridGroupData);
            grid.appendChild(hybridCard);
        }

        this.container.appendChild(grid);
    }

    /**
     * Create species card (for pure species)
     */
    createSpeciesCard(species) {
        const card = document.createElement('div');
        card.className = 'species-card bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300';
        card.dataset.speciesId = species.id;

        // Thumbnail
        const thumbnailHtml = species.latestImage
            ? `<img src="/${species.latestImage}" alt="${species.displayName || species.nameJa}" class="w-full h-48 object-cover">`
            : `<div class="w-full h-48 bg-gray-200 flex items-center justify-center">
                 <span class="text-gray-400">No Image</span>
               </div>`;

        // Sub-species badge (only show if count > 0)
        const hasSubSpecies = (species.subSpeciesCount && species.subSpeciesCount > 0);
        const subSpeciesBadge = hasSubSpecies
            ? `<span class="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                 園芸品種 ${species.subSpeciesCount}種
               </span>`
            : '';

        // Link URL
        const linkUrl = hasSubSpecies
            ? `/species/subspecies.html?parent=${species.id}`
            : `/species/detail.html?id=${species.id}`;

        const displayName = `P. ${species.name}`;
        const displayNameJa = species.nameJa || species.name;

        card.innerHTML = `
            ${thumbnailHtml}
            <div class="p-4">
                <h3 class="text-xl font-bold text-gray-800 mb-1">${displayNameJa}</h3>
                <p class="text-sm text-gray-500 mb-2">${displayName}</p>
                <div class="flex items-center justify-between mb-3">
                    <span class="text-sm text-gray-600">${species.totalPosts}件の投稿</span>
                    ${subSpeciesBadge}
                </div>

                ${hasSubSpecies ? this.createSubSpeciesSection(species) : ''}

                <div class="flex gap-2">
                    <a href="${linkUrl}"
                       class="flex-1 text-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                        ${hasSubSpecies ? '品種を見る' : '詳細を見る'}
                    </a>
                    ${hasSubSpecies ? `
                        <button
                            class="toggle-subspecies px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                            data-species-id="${species.id}">
                            ${this.expandedSpecies.has(species.id) ? '▲' : '▼'}
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        return card;
    }

    /**
     * Create hybrid group card
     */
    createHybridGroupCard(hybridData) {
        const card = document.createElement('div');
        card.className = 'species-card bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300';
        card.dataset.speciesId = 'hybrid';

        // Thumbnail
        const thumbnailHtml = hybridData.latestImage
            ? `<img src="/${hybridData.latestImage}" alt="交配種" class="w-full h-48 object-cover">`
            : `<div class="w-full h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                 <span class="text-4xl">🧬</span>
               </div>`;

        card.innerHTML = `
            ${thumbnailHtml}
            <div class="p-4">
                <h3 class="text-xl font-bold text-gray-800 mb-1">${hybridData.nameJa}</h3>
                <p class="text-sm text-gray-500 mb-2">${hybridData.name}</p>
                <div class="flex items-center justify-between mb-3">
                    <span class="text-sm text-gray-600">${hybridData.totalPosts}件の投稿</span>
                    <span class="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                        ${hybridData.subSpeciesCount}品種
                    </span>
                </div>

                <div class="flex gap-2">
                    <a href="/species/subspecies.html?parent=hybrid"
                       class="flex-1 text-center bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                        品種を見る
                    </a>
                </div>
            </div>
        `;

        return card;
    }

    /**
     * Create sub-species section
     */
    createSubSpeciesSection(species) {
        const isExpanded = this.expandedSpecies.has(species.id);
        const displayClass = isExpanded ? '' : 'hidden';

        // If subspecies data is already available in hierarchy, use it
        if (species.subSpecies && species.subSpecies.length > 0) {
            const listHtml = species.subSpecies
                .map(sub => `
                    <div class="flex items-center justify-between py-1 border-b border-gray-200 last:border-0">
                        <a href="/species/detail.html?id=${sub.id}"
                           class="text-sm text-green-700 hover:text-green-900 hover:underline flex-1">
                            ${sub.displayName}
                        </a>
                        <span class="text-xs text-gray-500">${sub.count}件</span>
                    </div>
                `)
                .join('');

            return `
                <div class="subspecies-list ${displayClass} mb-3 p-3 bg-gray-50 rounded-lg"
                     data-species-id="${species.id}">
                    <p class="text-xs font-semibold text-gray-600 mb-2">園芸品種 (${species.subSpecies.length}種):</p>
                    <div class="space-y-1">${listHtml}</div>
                </div>
            `;
        }

        // Fallback: show loading placeholder
        return `
            <div class="subspecies-list ${displayClass} mb-3 p-3 bg-gray-50 rounded-lg"
                 data-species-id="${species.id}">
                <p class="text-xs font-semibold text-gray-600 mb-2">園芸品種:</p>
                <div class="subspecies-loading text-xs text-gray-500">読み込み中...</div>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Toggle sub-species button
        this.container.addEventListener('click', async (e) => {
            const toggleBtn = e.target.closest('.toggle-subspecies');
            if (toggleBtn) {
                e.preventDefault();
                const speciesId = toggleBtn.dataset.speciesId;
                await this.toggleSubSpecies(speciesId);
            }
        });
    }

    /**
     * Toggle sub-species display
     */
    async toggleSubSpecies(speciesId) {
        const subspeciesList = this.container.querySelector(
            `.subspecies-list[data-species-id="${speciesId}"]`
        );
        const toggleBtn = this.container.querySelector(
            `.toggle-subspecies[data-species-id="${speciesId}"]`
        );

        if (!subspeciesList || !toggleBtn) return;

        // Toggle expanded state
        if (this.expandedSpecies.has(speciesId)) {
            // Collapse
            this.expandedSpecies.delete(speciesId);
            subspeciesList.classList.add('hidden');
            toggleBtn.textContent = '▼';
        } else {
            // Expand
            this.expandedSpecies.add(speciesId);
            subspeciesList.classList.remove('hidden');
            toggleBtn.textContent = '▲';

            // Load sub-species data if not already loaded (fallback only)
            if (subspeciesList.querySelector('.subspecies-loading')) {
                await this.loadSubSpecies(speciesId, subspeciesList);
            }
        }
    }

    /**
     * Load sub-species data (fallback method)
     */
    async loadSubSpecies(speciesId, container) {
        try {
            const response = await fetch(`/data/species/${speciesId}.json`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!data.subSpecies || data.subSpecies.length === 0) {
                container.innerHTML = '<p class="text-xs text-gray-500">園芸品種データなし</p>';
                return;
            }

            // Create sub-species list
            const listHtml = data.subSpecies
                .map(sub => `
                    <div class="flex items-center justify-between py-1 border-b border-gray-200 last:border-0">
                        <a href="/species/detail.html?id=${sub.id}"
                           class="text-sm text-green-700 hover:text-green-900 hover:underline flex-1">
                            ${sub.name || sub.displayName}
                        </a>
                        <span class="text-xs text-gray-500">${sub.count}件</span>
                    </div>
                `)
                .join('');

            container.innerHTML = `
                <p class="text-xs font-semibold text-gray-600 mb-2">園芸品種 (${data.subSpecies.length}種):</p>
                <div class="space-y-1">${listHtml}</div>
            `;

        } catch (error) {
            ErrorHandler.handle(error, 'SpeciesApp.loadSubSpecies');
            container.innerHTML = '<p class="text-xs text-red-500">園芸品種の読み込みに失敗しました</p>';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="error-message bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p class="text-red-600 font-semibold mb-2">エラー</p>
                <p class="text-gray-700">${message}</p>
                <button onclick="location.reload()"
                        class="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">
                    再読み込み
                </button>
            </div>
        `;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new SpeciesApp());
} else {
    new SpeciesApp();
}

export { SpeciesApp };
