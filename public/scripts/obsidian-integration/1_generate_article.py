#!/usr/bin/env python3
"""
OCRデータから記事原案を生成してObsidianに保存
"""
import sys
from pathlib import Path
from datetime import datetime
import json

# プロジェクトルート
PROJECT_ROOT = Path(__file__).parent.parent.parent
OBSIDIAN_VAULT = PROJECT_ROOT.parent / "Platycerium-Articles"
OCR_OUTPUT = PROJECT_ROOT.parent / "kindle-ocr" / "output"

def read_ocr_text(book_name: str = "NHK趣味の園芸_ビカクシダ") -> str:
    """OCRデータを読み込み"""
    # タイムスタンプ付きのディレクトリを検索
    matching_dirs = list(OCR_OUTPUT.glob(f"{book_name}*"))

    if not matching_dirs:
        raise FileNotFoundError(f"OCRディレクトリが見つかりません: {OCR_OUTPUT}/{book_name}*")

    # 最新のディレクトリを使用
    ocr_dir = sorted(matching_dirs)[-1]
    text_file = ocr_dir / "全文.txt"

    if not text_file.exists():
        raise FileNotFoundError(f"OCRファイルが見つかりません: {text_file}")

    print(f"   📂 使用するOCRデータ: {ocr_dir.name}")
    return text_file.read_text(encoding='utf-8')

def extract_species_info(ocr_text: str, species_name: str) -> str:
    """
    OCRテキストから特定品種の情報を抽出

    簡易版: 品種名で検索して前後のテキストを取得
    本格版はClaude APIを使って抽出
    """
    lines = ocr_text.split('\n')
    species_lines = []
    found = False
    context_lines = 50  # 前後50行を取得

    for i, line in enumerate(lines):
        if species_name.lower() in line.lower() or f"P. {species_name}" in line:
            found = True
            start = max(0, i - context_lines)
            end = min(len(lines), i + context_lines)
            species_lines = lines[start:end]
            break

    if not found:
        return f"# {species_name}に関する情報が見つかりませんでした\n\nOCRデータ全体を確認してください。"

    return '\n'.join(species_lines)

def generate_article_draft(species_name: str, ocr_info: str) -> str:
    """
    記事原案を生成（Claude APIを使う想定）
    今は簡易版: テンプレート + OCR抽出情報
    """
    today = datetime.now().strftime("%Y-%m-%d")

    article = f"""---
species: {species_name}
common_name: {species_name}
status: 原案
created: {today}
source: NHK趣味の園芸 ビカクシダ
target_page: species/detail.html
---

# {species_name}（P. {species_name}）

## OCRから抽出した情報

{ocr_info}

---

## 基本情報
- **学名**: Platycerium {species_name}
- **和名**:
- **原産地**:
- **難易度**: ⭐☆☆☆☆

## 特徴
（OCR情報を元に記述してください）

## 育て方

### 水やり
（OCR情報を元に記述してください）

### 光
（OCR情報を元に記述してください）

### 温度
（OCR情報を元に記述してください）

### 肥料
（OCR情報を元に記述してください）

## 【追記】実際の育成経験
（ここにあなたの経験を追記してください）

---
📚 参考文献: NHK趣味の園芸 ビカクシダ
"""
    return article

def save_to_obsidian(species_name: str, article_content: str):
    """Obsidianボルトに保存"""
    draft_dir = OBSIDIAN_VAULT / "01-原案"
    draft_dir.mkdir(exist_ok=True)

    filename = f"{species_name}_原案.md"
    filepath = draft_dir / filename

    filepath.write_text(article_content, encoding='utf-8')
    print(f"✅ 記事を生成しました: {filepath}")
    return filepath

def main():
    print("=" * 60)
    print("🤖 記事原案生成ツール")
    print("=" * 60)

    # 品種名入力
    if len(sys.argv) > 1:
        species_name = sys.argv[1]
    else:
        species_name = input("\n品種名を入力してください（例: bifurcatum）: ").strip()

    if not species_name:
        print("❌ 品種名が入力されていません")
        sys.exit(1)

    print(f"\n📖 OCRデータから「{species_name}」の情報を抽出中...")

    try:
        # OCRデータ読み込み
        ocr_text = read_ocr_text()

        # 品種情報抽出
        species_info = extract_species_info(ocr_text, species_name)

        # 記事生成
        print(f"🤖 記事原案を生成中...")
        article = generate_article_draft(species_name, species_info)

        # Obsidianに保存
        filepath = save_to_obsidian(species_name, article)

        print("\n" + "=" * 60)
        print("✅ 完成！次のステップ:")
        print(f"   1. Obsidianで開く: {filepath}")
        print(f"   2. 記事を編集して「02-編集中」に移動")
        print(f"   3. 編集完了したら整形＆公開スクリプトを実行")
        print("=" * 60)

        # Obsidianで開く
        import subprocess
        subprocess.run(["open", "-a", "Obsidian", str(filepath)])

    except FileNotFoundError as e:
        print(f"\n❌ エラー: {e}")
        print("\n💡 ヒント:")
        print("   - kindle-ocrプロジェクトで本をスキャンしましたか？")
        print("   - OCRファイルの場所を確認してください")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 予期しないエラー: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
