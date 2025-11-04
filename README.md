# Platycerium Site - ビカクシダ栽培サイト

Astro + Tailwind CSS で構築したビカクシダ専門サイト

## 🚀 プロジェクト構成

```
platycerium-site/
├── src/
│   ├── content/          # Markdownコンテンツ
│   │   ├── posts/        # 栽培ノウハウ記事
│   │   ├── species/      # 品種別ページ
│   │   └── config.ts     # コンテンツ設定
│   ├── layouts/          # レイアウトファイル
│   │   └── BaseLayout.astro
│   ├── components/       # コンポーネント
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── pages/            # ページファイル
│   │   └── index.astro   # トップページ
│   ├── styles/           # スタイル
│   │   └── global.css    # Tailwind CSS
│   └── assets/           # 画像などのアセット
├── public/               # 静的ファイル
└── astro.config.mjs      # Astro設定
```

## 📝 記事の追加方法（Instagram感覚）

### 1. 新しいMarkdownファイルを作成

`src/content/posts/` に新しい `.md` ファイルを作成します。

例：`src/content/posts/my-article.md`

```markdown
---
title: "記事のタイトル"
description: "記事の説明"
date: 2025-11-04
tags: ["タグ1", "タグ2"]
difficulty: 3
featured: false
---

# 記事のタイトル

本文をここに書きます。

## 見出し2

内容...

![画像の説明](./images/photo.jpg)

### 見出し3

- リスト1
- リスト2
- リスト3
```

### 2. 保存するだけ

ファイルを保存すれば、自動的にサイトに反映されます！

## 🎨 開発方法

### 開発サーバーの起動

```bash
cd /Users/fujikawatakahisa/Desktop/MyProjects/platycerium-site
npm run dev
```

ブラウザで http://localhost:4321 を開く

### ビルド（本番用）

```bash
npm run build
```

### プレビュー（ビルド後の確認）

```bash
npm run preview
```

## 📚 主要なページ

- `/` - トップページ
- `/gallery` - 品種ギャラリー（これから作成）
- `/guide` - 栽培ノウハウ（これから作成）
- `/tools` - 使用道具（これから作成）
- `/about` - Aboutページ（これから作成）

## 🛠️ 使用技術

- **Astro** - 静的サイトジェネレーター
- **Tailwind CSS** - CSSフレームワーク
- **TypeScript** - 型安全なJavaScript

## 📖 次のステップ

1. ✅ Astroプロジェクトのセットアップ
2. ✅ 基本レイアウト・コンポーネントの作成
3. ✅ トップページの作成
4. ✅ サンプル記事の作成
5. ⏳ 既存ギャラリーの統合
6. ⏳ 記事一覧ページの作成
7. ⏳ 品種別ページの作成
8. ⏳ SEO設定
9. ⏳ 広告枠の追加

## 🎯 今後の予定

- 既存の `platycerium-collection` からギャラリーを移行
- 記事一覧ページの実装
- 検索機能の追加
- タグフィルタリング機能
- 関連記事表示機能

## 🌐 デプロイ

### Vercel（推奨）

1. GitHubにプッシュ
2. Vercelと連携
3. 自動デプロイ

### Netlify

1. GitHubにプッシュ
2. Netlifyと連携
3. 自動デプロイ

## 📄 ライセンス

MIT
