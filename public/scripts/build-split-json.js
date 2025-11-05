#!/usr/bin/env node

/**
 * Instagram JSON Monthly Splitter
 *
 * 6.8MBの元データ（data/instagram.json）を月別に分割し、
 * 各月500KB以下のJSONファイル（data/posts-YYYY-MM.json）を生成する。
 * ビカクシダ関連投稿をハッシュタグで抽出し、日付降順でソート、
 * 一意のID（timestamp-index）を付与する。
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    INPUT_FILE: path.join(__dirname, '../data/instagram.json'),
    OUTPUT_DIR: path.join(__dirname, '../data'),
    BIKAKU_KEYWORDS: ['ビカクシダ', 'platycerium', 'コウモリラン'],
    TARGET_FILE_SIZE: 500 * 1024, // 500KB
};

/**
 * Main function
 */
async function main() {
    console.log('🌿 Instagram JSON Monthly Splitter');
    console.log('=====================================\n');

    try {
        // Step 1: Load Instagram JSON
        console.log('📖 Loading Instagram JSON...');
        const rawData = fs.readFileSync(CONFIG.INPUT_FILE, 'utf-8');
        const allPosts = JSON.parse(rawData);
        console.log(`✅ Loaded ${allPosts.length} posts\n`);

        // Step 2: Filter Bikaku-related posts
        console.log('🔍 Filtering Bikaku-related posts...');
        const bikakuPosts = filterBikakuPosts(allPosts);
        console.log(`✅ Found ${bikakuPosts.length} Bikaku-related posts\n`);

        // Step 3: Add unique IDs and extract metadata
        console.log('🏷️  Adding unique IDs and extracting metadata...');
        const processedPosts = bikakuPosts.map((post, index) => {
            const timestamp = post.creation_timestamp || post.media[0]?.creation_timestamp || 0;
            const date = new Date(timestamp * 1000);

            return {
                id: `${timestamp}-${index}`,
                media: post.media.map(m => ({
                    uri: m.uri.replace(/^media\/posts\//, 'images/posts/'),
                    creation_timestamp: m.creation_timestamp,
                    alt: extractAltText(post.title)
                })),
                title: post.title || '',
                creation_timestamp: timestamp,
                hashtags: extractHashtags(post.title),
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                day: date.getDate()
            };
        });
        console.log(`✅ Processed ${processedPosts.length} posts\n`);

        // Step 4: Sort by date (descending)
        console.log('📅 Sorting posts by date (newest first)...');
        processedPosts.sort((a, b) => b.creation_timestamp - a.creation_timestamp);
        console.log(`✅ Sorted\n`);

        // Step 5: Split by month
        console.log('📂 Splitting posts by month...');
        const byMonth = groupByMonth(processedPosts);
        console.log(`✅ Grouped into ${Object.keys(byMonth).length} months\n`);

        // Step 6: Write monthly files
        console.log('💾 Writing monthly JSON files...');
        let totalFiles = 0;
        for (const [monthKey, posts] of Object.entries(byMonth)) {
            const filename = `posts-${monthKey}.json`;
            const filepath = path.join(CONFIG.OUTPUT_DIR, filename);

            const monthData = {
                month: monthKey,
                postCount: posts.length,
                posts: posts
            };

            fs.writeFileSync(filepath, JSON.stringify(monthData, null, 2), 'utf-8');

            const fileSize = fs.statSync(filepath).size;
            const fileSizeKB = (fileSize / 1024).toFixed(2);
            console.log(`  ✓ ${filename} - ${posts.length} posts, ${fileSizeKB} KB`);
            totalFiles++;
        }
        console.log(`\n✅ Created ${totalFiles} monthly files\n`);

        // Step 7: Create index file
        console.log('📑 Creating index file...');
        const indexData = {
            totalPosts: processedPosts.length,
            months: Object.keys(byMonth).sort().reverse(),
            generatedAt: new Date().toISOString()
        };
        fs.writeFileSync(
            path.join(CONFIG.OUTPUT_DIR, 'posts-index.json'),
            JSON.stringify(indexData, null, 2),
            'utf-8'
        );
        console.log(`✅ Created posts-index.json\n`);

        // Summary
        console.log('=====================================');
        console.log('✅ Success! Summary:');
        console.log(`   Total posts: ${allPosts.length}`);
        console.log(`   Bikaku posts: ${bikakuPosts.length}`);
        console.log(`   Monthly files: ${totalFiles}`);
        console.log(`   Date range: ${indexData.months[indexData.months.length - 1]} - ${indexData.months[0]}`);
        console.log('=====================================\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

/**
 * Filter Bikaku-related posts by hashtags
 */
function filterBikakuPosts(posts) {
    return posts.filter(post => {
        const title = post.title || '';
        return CONFIG.BIKAKU_KEYWORDS.some(keyword =>
            title.toLowerCase().includes(keyword.toLowerCase())
        );
    });
}

/**
 * Extract hashtags from title
 */
function extractHashtags(title) {
    if (!title) return [];
    const hashtagRegex = /#[^\s#]+/g;
    const matches = title.match(hashtagRegex) || [];
    return matches.map(tag => tag.toLowerCase());
}

/**
 * Extract alt text from title (first line or first 50 chars)
 */
function extractAltText(title) {
    if (!title) return 'ビカクシダ';
    const firstLine = title.split('\n')[0];
    const cleaned = firstLine.replace(/#[^\s#]+/g, '').trim();
    return cleaned.substring(0, 100) || 'ビカクシダ';
}

/**
 * Group posts by year-month
 */
function groupByMonth(posts) {
    const byMonth = {};

    for (const post of posts) {
        const monthKey = `${post.year}-${String(post.month).padStart(2, '0')}`;

        if (!byMonth[monthKey]) {
            byMonth[monthKey] = [];
        }

        byMonth[monthKey].push(post);
    }

    return byMonth;
}

// Run
main();
