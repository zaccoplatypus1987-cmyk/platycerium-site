/**
 * Update Instagram Data from New Export
 *
 * This script merges new Instagram export data with existing data:
 * - Removes duplicate posts (by timestamp)
 * - Removes hashtags from captions (keeping only before hashtag section)
 * - Converts new Instagram JSON format to our internal format
 * - Merges with existing posts
 *
 * Usage:
 *   npx ts-node scripts/update-instagram-data.ts <path-to-new-posts_1.json>
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public/data');
const EXISTING_POSTS_FILE = path.join(DATA_DIR, 'instagram-posts.json');

interface ExistingPost {
  id: string;
  date: string;
  timestamp: number;
  caption: string;
  hashtags: string[];
  images: {
    path: string;
    timestamp: number;
  }[];
  metadata: {
    source: string;
    originalId: string;
  };
}

interface ExistingPostsData {
  posts: ExistingPost[];
}

interface NewInstagramMedia {
  uri: string;
  creation_timestamp: number;
  title?: string;
  media_metadata?: any;
}

interface NewInstagramPost {
  media: NewInstagramMedia[];
}

/**
 * Remove hashtags from caption
 * Keeps only the text before the first hashtag
 */
function removeHashtags(caption: string): string {
  if (!caption) return '';

  // Find the first hashtag
  const hashtagIndex = caption.indexOf('#');

  if (hashtagIndex === -1) {
    // No hashtags found, return as is
    return caption.trim();
  }

  // Return text before first hashtag, trimmed
  return caption.substring(0, hashtagIndex).trim();
}

/**
 * Extract hashtags from caption
 */
function extractHashtags(caption: string): string[] {
  if (!caption) return [];

  const hashtagRegex = /#[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\w]+/g;
  const matches = caption.match(hashtagRegex);

  if (!matches) return [];

  // Remove # symbol and return unique hashtags
  return [...new Set(matches.map(tag => tag.substring(1)))];
}

/**
 * Convert UNIX timestamp to YYYY-MM-DD format
 */
function timestampToDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert new Instagram JSON format to our internal format
 */
function convertNewPost(post: NewInstagramPost, index: number): ExistingPost | null {
  if (!post.media || post.media.length === 0) {
    return null;
  }

  const firstMedia = post.media[0];
  const timestamp = firstMedia.creation_timestamp;
  const caption = firstMedia.title || '';

  // Remove hashtags from caption
  const captionWithoutHashtags = removeHashtags(caption);

  // Extract hashtags
  const hashtags = extractHashtags(caption);

  // Convert image paths
  const images = post.media.map(media => ({
    path: `instagram-data/${media.uri}`,
    timestamp: media.creation_timestamp
  }));

  return {
    id: `${timestamp}-${index}`,
    date: timestampToDate(timestamp),
    timestamp: timestamp,
    caption: caption, // Keep original caption with hashtags for now (will be cleaned in display)
    hashtags: hashtags,
    images: images,
    metadata: {
      source: 'instagram',
      originalId: `${timestamp}-${index}`
    }
  };
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Error: Please provide path to new posts_1.json file');
    console.log('Usage: npx ts-node scripts/update-instagram-data.ts <path-to-posts_1.json>');
    process.exit(1);
  }

  const newPostsFile = args[0];

  if (!fs.existsSync(newPostsFile)) {
    console.error(`❌ Error: File not found: ${newPostsFile}`);
    process.exit(1);
  }

  console.log('📖 Reading new Instagram data...');
  const newPostsRaw: NewInstagramPost[] = JSON.parse(fs.readFileSync(newPostsFile, 'utf-8'));
  console.log(`   Found ${newPostsRaw.length} posts in new data`);

  console.log('\n🔄 Converting new posts to internal format...');
  const newPosts: ExistingPost[] = [];
  let skipped = 0;

  for (let i = 0; i < newPostsRaw.length; i++) {
    const converted = convertNewPost(newPostsRaw[i], i);
    if (converted) {
      newPosts.push(converted);
    } else {
      skipped++;
    }
  }

  console.log(`   Converted ${newPosts.length} posts (skipped ${skipped})`);

  console.log('\n📖 Reading existing Instagram data...');
  let existingPosts: ExistingPost[] = [];

  if (fs.existsSync(EXISTING_POSTS_FILE)) {
    const existingData: ExistingPostsData = JSON.parse(fs.readFileSync(EXISTING_POSTS_FILE, 'utf-8'));
    existingPosts = existingData.posts;
    console.log(`   Found ${existingPosts.length} existing posts`);
  } else {
    console.log('   No existing posts file found (will create new)');
  }

  console.log('\n🔍 Removing duplicates by timestamp...');

  // Create a Set of existing timestamps for fast lookup
  const existingTimestamps = new Set(existingPosts.map(p => p.timestamp));

  // Filter out duplicates from new posts
  const uniqueNewPosts = newPosts.filter(post => !existingTimestamps.has(post.timestamp));

  const duplicateCount = newPosts.length - uniqueNewPosts.length;
  console.log(`   Found ${duplicateCount} duplicates (removed)`);
  console.log(`   ${uniqueNewPosts.length} new posts to add`);

  console.log('\n✨ Merging posts...');
  const mergedPosts = [...uniqueNewPosts, ...existingPosts];

  // Sort by timestamp descending (newest first)
  mergedPosts.sort((a, b) => b.timestamp - a.timestamp);

  console.log(`   Total posts after merge: ${mergedPosts.length}`);

  console.log('\n💾 Saving merged data...');
  const output: ExistingPostsData = {
    posts: mergedPosts
  };

  // Backup existing file if it exists
  if (fs.existsSync(EXISTING_POSTS_FILE)) {
    const backupFile = EXISTING_POSTS_FILE.replace('.json', `.backup-${Date.now()}.json`);
    fs.copyFileSync(EXISTING_POSTS_FILE, backupFile);
    console.log(`   ✓ Backup created: ${path.basename(backupFile)}`);
  }

  fs.writeFileSync(
    EXISTING_POSTS_FILE,
    JSON.stringify(output, null, 2),
    'utf-8'
  );

  console.log(`   ✓ Saved to: ${EXISTING_POSTS_FILE}`);

  console.log('\n📊 Summary:');
  console.log(`   New posts added: ${uniqueNewPosts.length}`);
  console.log(`   Duplicates removed: ${duplicateCount}`);
  console.log(`   Total posts: ${mergedPosts.length}`);
  console.log(`   Date range: ${mergedPosts[mergedPosts.length - 1].date} to ${mergedPosts[0].date}`);

  console.log('\n✅ Done!');
  console.log('\n⚠️  Next steps:');
  console.log('   1. Review the updated instagram-posts.json');
  console.log('   2. Regenerate species-specific JSON files if needed');
  console.log('   3. Test the gallery page');
  console.log('   4. Commit and deploy');
}

main();
