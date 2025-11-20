#!/usr/bin/env python3
"""
特定の品種を非表示にする（データファイルは残す）
"""
import json
import sys

# 非表示にするIDのリスト
HIDE_IDS = [
    "ジサクボomgスポ",
    "ジサクボスパローズ",
    "ジサクボ4クイーン",
    "ジサクボjgs",
    "ジサクボjgs2",
    "ジサクボjgs3",
    "ジサクボjgs4",
    "ジサクボjgs5",
    "ジサクボjgs6",
    "ジサクボ艶女",
    "ジサクボ79",
    "ジサクボグループk",
    "ジサクボバクスポ"
]

def main():
    # JSONファイルを読み込む
    with open('public/data/species-hierarchy-index.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"非表示にするID: {len(HIDE_IDS)}個")

    # species配列から削除
    original_species_count = len(data['species'])
    data['species'] = [s for s in data['species'] if s['id'] not in HIDE_IDS]
    removed_from_species = original_species_count - len(data['species'])
    print(f"species配列から削除: {removed_from_species}個")

    # hierarchy配列のsubSpeciesから削除
    total_removed_from_hierarchy = 0
    for item in data['hierarchy']:
        if 'subSpecies' in item and item['subSpecies']:
            original_count = len(item['subSpecies'])
            item['subSpecies'] = [s for s in item['subSpecies'] if s['id'] not in HIDE_IDS]
            removed = original_count - len(item['subSpecies'])
            if removed > 0:
                total_removed_from_hierarchy += removed
                print(f"{item['id']}のsubSpeciesから削除: {removed}個")

    print(f"\n合計削除数: {removed_from_species + total_removed_from_hierarchy}個")

    # ファイルに書き込む
    with open('public/data/species-hierarchy-index.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("✅ 完了しました！")

if __name__ == '__main__':
    main()
