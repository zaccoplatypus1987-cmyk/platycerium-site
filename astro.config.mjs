// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'fs';
import path from 'path';

import tailwindcss from '@tailwindcss/vite';

// 動的URLを生成する関数
function generateDynamicUrls() {
  const urls = [];
  const baseUrl = 'https://platycerium-site.vercel.app';

  try {
    // 品種インデックスを読み込み
    const indexPath = path.join(process.cwd(), 'public/data/species-hierarchy-index.json');
    if (fs.existsSync(indexPath)) {
      const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

      // 各品種の詳細ページを追加
      if (indexData.species) {
        indexData.species.forEach(species => {
          urls.push(`${baseUrl}/gallery/detail?id=${encodeURIComponent(species.id)}`);
        });
      }
    }

    // 投稿詳細ページを追加
    const postsPath = path.join(process.cwd(), 'public/data/instagram-posts.json');
    if (fs.existsSync(postsPath)) {
      const postsData = JSON.parse(fs.readFileSync(postsPath, 'utf-8'));
      if (postsData.posts) {
        postsData.posts.forEach(post => {
          urls.push(`${baseUrl}/detail?id=${post.id}`);
        });
      }
    }
  } catch (error) {
    console.warn('動的URLの生成中にエラーが発生しました:', error);
  }

  return urls;
}

// https://astro.build/config
export default defineConfig({
  site: 'https://platycerium-site.vercel.app',
  integrations: [
    sitemap({
      customPages: generateDynamicUrls(),
    })
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});