# Platycerium Collection - Astro Site 開発原則

## ⚡ Claude必須動作
**会話開始時に必ずこのファイルを読むこと**

---

## 🔴 絶対死守（10秒で読める）

1. **ユーザー承認必須** - 勝手にコード実装・変更するな。必ずユーザーの許可を得てから実行
2. **変更前バックアップ必須** - `git commit`忘れたら作業停止
3. **CC-SDD準拠** - `/kiro:spec-init`から開始、設計→実装の順守
4. **静的サイト構成** - データベース不使用、Instagram JSON + Markdown記事
5. **完全無料運用** - Vercel + GitHub（月額¥0）
6. **完全レスポンシブ** - モバイルファースト設計

---

## 🟡 技術スタック

### フロントエンド
```
Astro v5.15.3 + Tailwind CSS v4 + TypeScript
├── コンポーネント指向（再利用性）
├── 型安全（TypeScript strictest）
├── レスポンシブデザイン
└── 画像最適化自動化
```

### データソース
```
Instagram JSON（200件の投稿データ）
├── 写真URL
├── キャプション
└── 投稿日時

Platycerium-Articles/（Markdown記事）
├── 原案 → 編集中 → 整形済み → 公開済み
├── Obsidian管理
└── Astro Content Collectionsで自動取り込み
```

### デプロイ・運用
```
GitHub → Vercel
├── Git push で自動デプロイ
├── 30秒で反映
└── 完全無料
```

---

## 🟢 プロジェクト固有ルール

### データ管理
- **データベース不使用**: 静的サイトとして実装
- **Instagram JSON**: プライマリデータソース（200件）
- **Markdown記事**: Platycerium-Articles/ から取り込み
- **画像**: Instagram CDN直リンク（または public/images/）

### デザインコンセプト
- **ナチュラル・モダン**: 植物が主役、黒ベース+グリーンアクセント
- **グラデーション**: emerald-500/teal-500系
- **写真重視**: 大きなビジュアル、Bento Box Grid
- **モバイル最適化**: Instagram ユーザー層を想定
- **ビカキンちゃん**: マスコットキャラクター統合

### 収益化戦略
- Google AdSense（広告）
- Amazon アソシエイト（園芸用品）
- 楽天アフィリエイト（植物・肥料）
- note/Brain（栽培ノウハウ販売）

### ターゲットユーザー
- Instagram フォロワー（20,000人）
- ビカクシダ愛好家
- 観葉植物初心者
- スマホメインユーザー

---

## 🚨 Claude作業ルール

**忘れたら即停止:**
- **実装前に必ずユーザーの許可を得る**
- `git add . && git commit -m "修正前"`（作業前必須）
- 変更内容を明確報告
- 失敗時は`git checkout HEAD~1`で復旧

---

## ⛔ 絶対禁止事項

1. **ユーザーの許可なしにコード実装・変更を実行すること**
2. **CC-SDDを無視して勝手に実装を進めること**
3. **要件定義・設計フェーズをスキップすること**
4. **データベースを使用すること**（静的サイト厳守）
5. **有料サービスを提案すること**（完全無料運用）

---

## 🤖 サブエージェント自動使用ルール

### 必ずサブエージェントを使用する場面

1. **新機能追加時のフロー**
   - まず `@fullstack-developer` で設計・実装
   - UI/デザイン重視なら `@frontend-specialist`
   - 実装後は必ず `@integration-tester` でテスト
   - 最後に `@quality-inspector` でレビュー

2. **キーワードによる自動選択**
   - 「実装」「作る」「Astro」「コンポーネント」→ fullstack-developer
   - 「UI」「デザイン」「レスポンシブ」「Tailwind」→ frontend-specialist
   - 「テスト」「動作確認」「ブラウザ」→ integration-tester
   - 「レビュー」「品質」「リファクタ」→ quality-inspector or refactoring-specialist

3. **自動連携パターン**
   - 実装完了後は自動的にテストエージェントを呼び出す
   - リファクタリング時は品質検査官を先に呼ぶ

---

## 🛠️ MCP設定（超軽量構成）

### 📋 利用可能なMCPツール（このプロジェクト専用）

| MCP | 用途 | 理由 |
|-----|------|------|
| **filesystem** | ファイル操作（プロジェクト限定） | ✅ 必須 |
| **playwright-mcp** | モダンブラウザテスト | ✅ UI確認に必須 |
| **sequential-thinking** | 複雑な計画・思考支援 | ✅ 設計時に有用 |

**注**: コンテキスト最適化のため、この3つのみ使用

### 🎯 各サブエージェントの実際の権限

#### fullstack-developer
**目的**: Astro実装、コンポーネント作成、Instagram JSON連携
**モデル**: claude-sonnet-4-5
**使用可能ツール**: Read, Write, Edit, Bash, filesystem, playwright, sequential-thinking

#### frontend-specialist
**目的**: UI/UX改善、Tailwind CSS、レスポンシブデザイン
**モデル**: claude-sonnet-4-5
**使用可能ツール**: Read, Write, Edit, Bash, filesystem, playwright

#### integration-tester
**目的**: ブラウザテスト、レスポンシブ確認、動作検証
**モデル**: claude-opus-4-1-20250805
**使用可能ツール**: Read, Write, Bash, filesystem, playwright (メイン)

#### quality-inspector
**目的**: コードレビュー、セキュリティ監査、パフォーマンス確認
**モデル**: claude-sonnet-4-5
**使用可能ツール**: Read, Write, Bash, filesystem, sequential-thinking

#### refactoring-specialist
**目的**: コード整理、最適化、保守性向上
**モデル**: claude-opus-4-1-20250805
**使用可能ツール**: Read, Write, Edit, Bash, filesystem, sequential-thinking

---

## 📝 プロジェクト構造

```
platycerium-site/
├── .claude/
│   ├── agents/              # カスタムエージェント（5個）
│   ├── mcp.json             # MCP設定（3サーバー）
│   ├── settings.local.json  # サンドボックス設定
│   └── CLAUDE.md            # このファイル
├── .git/
├── .gitignore
├── astro.config.mjs
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── public/
│   └── images/              # 静的画像（ビカキンちゃん等）
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro      # トップページ
│   │   ├── index-ultimate.astro  # 最終デザイン
│   │   ├── gallery/
│   │   ├── guide/
│   │   └── tools/
│   ├── content/
│   │   ├── config.ts        # Content Collections設定
│   │   ├── posts/           # 記事（Articles/から取り込み）
│   │   └── species/         # 品種情報
│   ├── data/
│   │   └── instagram.json   # Instagram投稿データ
│   └── styles/
│       └── global.css       # Tailwind CSS
└── README.md
```

---

## 🚀 開発フロー

### 新機能追加
1. `/kiro:spec-init [機能名]` でCC-SDD開始
2. `/kiro:spec-requirements [機能名]` で要件定義
3. `/kiro:spec-design [機能名]` で設計
4. `/kiro:spec-tasks [機能名]` でタスク分解
5. `/kiro:spec-impl [機能名]` で実装
6. integration-tester でテスト
7. quality-inspector でレビュー

### 日常の更新作業
1. Platycerium-Articles/ で記事執筆（Markdown）
2. src/content/posts/ に配置（または自動同期）
3. `npm run dev` で確認
4. Git commit & push
5. Vercel自動デプロイ（30秒）

### 開発サーバー起動
```bash
npm run dev              # localhost:4321
npm run dev -- --host    # ネットワーク公開（iPhone確認用）
```

---

## 📊 チェックコマンド

「システム全体をチェックして」と言われたら：
1. Astroプロジェクト構造確認
2. コンポーネント・レイアウト確認
3. レスポンシブ対応チェック
4. Instagram JSON連携確認
5. Content Collections動作確認
6. ビルドエラーチェック（`npm run build`）
7. 型エラーチェック（TypeScript）

---

## 💡 教育原則
- 専門用語は平易に説明
- 初心者にも分かるように
- 図解・例示を多用
- Astroの機能を積極的に活用

---

## 🎯 このガイドラインの使い方

1. **新機能開発時**: `/kiro:spec-init` から開始
2. **実装前**: チェックリストを確認
3. **レビュー時**: このガイドラインを基準に評価
4. **迷った時**: 該当セクションを参照

---

## 📋 Active Specifications (CC-SDD)

### platycerium-site
Instagram投稿200件とMarkdown記事を活用した、Astro+Tailwind CSSによるモダンな静的サイト植物図鑑。型安全、コンポーネント指向、完全レスポンシブ。Vercel無料ホスティング、アフィリエイト収益化対応。

---

---

## 🔄 Instagram データ更新プロセス（自動化）

### ⚡ トリガーフレーズ（Claude必須実行）

ユーザーが以下のフレーズを使った場合、**必ず** `scripts/update-instagram-data.ts` を自動実行すること：

- 「新しいInstagramデータで更新して」
- 「Instagramの投稿データを更新」
- 「Instagram JSONを更新」
- 「栽培記録を更新」

### 📝 実行手順

1. **新しいJSONファイルのパスを確認**
   - 通常: `~/Downloads/instagram-j39bo-YYYY-MM-DD-*/your_instagram_activity/media/posts_1.json`
   - ユーザーに確認する必要はない（自動で探す）

2. **スクリプトを実行**
   ```bash
   npx ts-node scripts/update-instagram-data.ts <path-to-posts_1.json>
   ```

3. **Species データを再生成**
   ```bash
   node public/scripts/generate-hierarchical-species-data-v7-FIXED.js
   ```

4. **変更をコミット＆プッシュ**
   ```bash
   git add public/data/ scripts/
   git commit -m "feat: update Instagram cultivation records with X new posts"
   git push origin main
   ```

### ✅ スクリプトの機能

- **自動重複削除**: タイムスタンプで重複投稿を検出して削除
- **フォーマット変換**: Instagram JSONを内部形式に自動変換
- **バックアップ作成**: 更新前にバックアップファイルを自動生成
- **ハッシュタグ処理**: キャプションからハッシュタグを分離

### 📊 期待される結果

- 新しい投稿がギャラリーページに反映される
- 種別ごとの投稿数が自動更新される
- 重複投稿は自動的に除外される
- Vercel自動デプロイで約30秒後に本番反映

---

**最終更新**: 2025-11-21
**バージョン**: 2.1.0
**プロジェクト**: Platycerium Collection - Astro Site
**目標**: Instagram 2万フォロワーへの情報発信 + 月1〜3万円の副収入
