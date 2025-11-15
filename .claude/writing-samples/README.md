# Writing Samples - 執筆サンプル集

このディレクトリには、記事執筆の精度を上げるための資料を保存します。

---

## 📁 ディレクトリ構成

```
.claude/writing-samples/
├── README.md                    # このファイル
├── feedback-log.md              # フィードバック履歴
├── good-expressions.md          # 良い表現集
└── approved-articles/           # 完成した良い記事
    └── (記事ファイルをここに保存)
```

---

## 🎯 目的

### 1. フィードバックループで精度向上
```
記事執筆 → フィードバック → 修正 → 学び → 次回の精度向上
```

### 2. 継続的な改善
- よく指摘される表現を `feedback-log.md` に記録
- 好評だった表現を `good-expressions.md` に追加
- 完成記事を `approved-articles/` に保存
- パターンを見つけて `content-writer.md` に反映

---

## 📝 使い方

### A. 記事執筆時
1. Obsidianで骨子を書く
2. Claude Code の `content-writer` エージェントを呼ぶ
3. 初稿を生成
4. フィードバック → 修正（2-3回）
5. 完成

### B. フィードバック記録
```markdown
## 2025-11-15: 水やり方法の記事

### 指摘内容
「〜について解説します」がAIっぽい

### 修正内容
❌ 「水やりについて解説します」
✅ 「水やりについて、僕のやり方を書きますね」

### 学び
「解説します」は避けて、「書きますね」「話します」などを使う
```

### C. 良い記事の保存
完成した記事を `approved-articles/` に保存：
```bash
cp src/content/posts/watering.md .claude/writing-samples/approved-articles/2025-11-15-watering.md
```

### D. 定期的な振り返り（週1回程度）
1. `feedback-log.md` を見返す
2. 共通パターンを見つける
3. `content-writer.md` に反映
4. `good-expressions.md` を更新

---

## 🔄 改善サイクル

```
初稿 → フィードバック → 修正 → 完成
  ↓
feedback-log.md に記録
  ↓
パターン分析
  ↓
content-writer.md を更新
  ↓
次回の初稿精度が向上 ✨
```

---

## 💡 ヒント

### 良い記事の見分け方
- [ ] ジサクボさんらしい語り口
- [ ] 具体的な数字・実体験
- [ ] 失敗談も含まれている
- [ ] AI的な表現がない
- [ ] 読者が「自分にもできそう」と思える

### フィードバックの記録タイミング
- 「この表現は避けたい」と思ったとき
- 「この言い回しいいな」と思ったとき
- 同じ指摘を2回したとき（パターン化）

---

**作成日**: 2025-11-11
**管理者**: ジサクボ + Claude Code
