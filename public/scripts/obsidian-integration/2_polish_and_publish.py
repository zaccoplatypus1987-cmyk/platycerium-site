#!/usr/bin/env python3
"""
Obsidian編集済み記事をClaudeで整形してHTMLに挿入
"""
import sys
import re
from pathlib import Path
from datetime import datetime
import markdown

# プロジェクトルート
PROJECT_ROOT = Path(__file__).parent.parent.parent
OBSIDIAN_VAULT = PROJECT_ROOT.parent / "Platycerium-Articles"

def list_edited_articles():
    """編集中の記事一覧を取得"""
    edited_dir = OBSIDIAN_VAULT / "02-編集中"
    articles = list(edited_dir.glob("*.md"))
    return articles

def read_article(filepath: Path) -> tuple[dict, str]:
    """記事を読み込んでメタデータと本文を分離"""
    content = filepath.read_text(encoding='utf-8')

    # Front Matterを抽出
    frontmatter_match = re.match(r'^---\n(.*?)\n---\n(.*)$', content, re.DOTALL)

    if frontmatter_match:
        frontmatter_text = frontmatter_match.group(1)
        body = frontmatter_match.group(2)

        # メタデータをパース
        metadata = {}
        for line in frontmatter_text.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                metadata[key.strip()] = value.strip()
    else:
        metadata = {}
        body = content

    return metadata, body

def polish_with_claude(article_body: str) -> str:
    """
    Claudeで文章を整形（簡易版）

    本格実装ではClaude APIを使用
    今はシンプルな整形のみ
    """
    # 簡易整形: 空行を統一、見出しレベルを調整
    lines = article_body.split('\n')
    polished_lines = []
    prev_empty = False

    for line in lines:
        # 連続する空行を1つに
        if line.strip() == '':
            if not prev_empty:
                polished_lines.append('')
                prev_empty = True
        else:
            polished_lines.append(line)
            prev_empty = False

    polished = '\n'.join(polished_lines).strip()

    print("🤖 Claude整形完了（本格版ではClaude APIを使用）")
    return polished

def markdown_to_html(markdown_text: str) -> str:
    """MarkdownをHTMLに変換"""
    html = markdown.markdown(
        markdown_text,
        extensions=['extra', 'codehilite', 'toc']
    )
    return html

def insert_into_html(html_file: Path, article_id: str, content_html: str):
    """HTMLファイルに記事を挿入"""
    if not html_file.exists():
        raise FileNotFoundError(f"HTMLファイルが見つかりません: {html_file}")

    html_content = html_file.read_text(encoding='utf-8')

    # マーカーを探す
    marker_start = f"<!-- ARTICLE_START:{article_id} -->"
    marker_end = f"<!-- ARTICLE_END:{article_id} -->"

    if marker_start not in html_content:
        # マーカーがない場合は追加
        print(f"⚠️  マーカーが見つかりません。HTMLに追加します...")
        # 仮の位置に挿入（実際にはユーザーに確認すべき）
        insertion_point = html_content.find('<div id="care-guide-section">')
        if insertion_point == -1:
            print("❌ 挿入位置が見つかりません")
            return False

        marker_block = f"""
    {marker_start}
    <div class="article-content prose max-w-none">
        <!-- 記事はここに挿入されます -->
    </div>
    {marker_end}
"""
        # 次の</div>の前に挿入
        next_div = html_content.find('</div>', insertion_point)
        html_content = html_content[:next_div] + marker_block + html_content[next_div:]

    # マーカー間の内容を置換
    pattern = f"{re.escape(marker_start)}.*?{re.escape(marker_end)}"
    replacement = f"""{marker_start}
    <div class="article-content prose max-w-none">
{content_html}
    </div>
    {marker_end}"""

    new_html = re.sub(pattern, replacement, html_content, flags=re.DOTALL)

    # 保存
    html_file.write_text(new_html, encoding='utf-8')
    print(f"✅ {html_file.name} に記事を挿入しました")
    return True

def move_to_published(filepath: Path, species_name: str):
    """記事を公開済みフォルダに移動"""
    published_dir = OBSIDIAN_VAULT / "04-公開済み"
    published_dir.mkdir(exist_ok=True)

    new_filepath = published_dir / f"{species_name}_公開.md"
    filepath.rename(new_filepath)
    print(f"📁 記事を移動: {new_filepath}")

def main():
    print("=" * 60)
    print("🚀 整形＆公開ツール")
    print("=" * 60)

    # 編集中の記事を表示
    articles = list_edited_articles()

    if not articles:
        print("\n❌ 編集中の記事が見つかりません")
        print("💡 「02-編集中」フォルダに記事を配置してください")
        sys.exit(1)

    print("\n編集中の記事:")
    for i, article in enumerate(articles, 1):
        print(f"  [{i}] {article.name}")

    # 記事選択
    if len(sys.argv) > 1:
        choice = int(sys.argv[1])
    else:
        choice_input = input("\n番号を選択してください: ").strip()
        try:
            choice = int(choice_input)
        except ValueError:
            print("❌ 無効な入力です")
            sys.exit(1)

    if choice < 1 or choice > len(articles):
        print("❌ 無効な番号です")
        sys.exit(1)

    selected_article = articles[choice - 1]
    print(f"\n📝 選択: {selected_article.name}")

    try:
        # 記事を読み込み
        print("\n📖 記事を読み込み中...")
        metadata, body = read_article(selected_article)
        species_name = metadata.get('species', 'unknown')
        target_page = metadata.get('target_page', 'species/detail.html')

        # Claude整形
        print("🤖 Claudeで整形中...")
        polished_body = polish_with_claude(body)

        # MarkdownをHTMLに変換
        print("📄 HTMLに変換中...")
        html_content = markdown_to_html(polished_body)

        # HTMLに挿入
        print(f"📝 {target_page} に挿入中...")
        html_file = PROJECT_ROOT / target_page
        article_id = f"{species_name}-care"
        success = insert_into_html(html_file, article_id, html_content)

        if success:
            # 公開済みに移動
            move_to_published(selected_article, species_name)

            print("\n" + "=" * 60)
            print("✅ 公開完了！")
            print(f"   📄 ページ: {target_page}")
            print(f"   🌐 ブラウザで確認: file://{html_file}")
            print("=" * 60)

            # ブラウザで開く
            open_browser = input("\nブラウザで確認しますか？ (y/n): ").strip().lower()
            if open_browser == 'y':
                import subprocess
                subprocess.run(["open", str(html_file)])
        else:
            print("\n❌ 公開に失敗しました")
            sys.exit(1)

    except Exception as e:
        print(f"\n❌ エラー: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
