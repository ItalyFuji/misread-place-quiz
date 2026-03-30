"""
municipality_DB.csv を加工してクイズ用データベースを生成するスクリプト。
Script to process municipality_DB.csv and generate the quiz database.

使い方 / Usage:
    1. municipality_DB.csv を db/source/ にコピーする
       Copy municipality_DB.csv into db/source/
    2. python make_quiz_db.py を実行する
       Run: python make_quiz_db.py
    3. db/quiz_db.csv が生成される
       db/quiz_db.csv will be created
"""

import os
import re

import pandas as pd

# 漢字にマッチする正規表現 / Regex to detect kanji characters
KANJI_RE = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf]")

INPUT  = os.path.join("db", "source", "municipality_DB.csv")
OUTPUT = os.path.join("db", "quiz_db.csv")


def main():
    # 読み込み / Load source CSV
    df = pd.read_csv(INPUT, encoding="utf-8-sig", dtype=str)
    print(f"読み込み完了 / Loaded: {len(df)} 件")

    # 必要な列だけ残す（市区町村コードは重複除去後に一意性がなくなるため除外）
    # Keep only required columns (municipality_code excluded: no longer unique after deduplication)
    df = df[["prefecture", "name_short", "municipality_category", "reading_short"]]

    # 列名をアプリで使いやすい名前にする / Rename columns to match app's data structure
    df = df.rename(columns={
        "prefecture":            "pref",
        "name_short":            "name",
        "municipality_category": "suffix",
        "reading_short":         "reading",
    })

    # 漢字を含まない地名（ひらがな・カタカナのみ）を除外する
    # Remove entries whose name contains no kanji (hiragana/katakana-only names are not suitable for a reading quiz)
    before = len(df)
    df = df[df["name"].apply(lambda x: bool(KANJI_RE.search(x)))]
    after = len(df)
    print(f"漢字なし地名を除外 / Filtered non-kanji names: {before - after} 件削除 → {after} 件")

    # 重複除去（同じ都道府県・同じ地名を1件に絞る）
    # Remove duplicates: keep one entry per (prefecture, name) pair
    before = len(df)
    df = df.drop_duplicates(subset=["pref", "name"])
    after = len(df)
    print(f"重複除去 / Deduplicated: {before - after} 件削除 → {after} 件")

    # インデックスをリセット / Reset index
    df = df.reset_index(drop=True)

    # 保存 / Save output
    df.to_csv(OUTPUT, index=False, encoding="utf-8-sig")
    print(f"保存完了 / Saved: {OUTPUT}")


if __name__ == "__main__":
    main()
