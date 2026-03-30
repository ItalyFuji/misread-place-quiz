# 全国市町村読み方クイズ / Japanese Municipality Reading Quiz

日本全国の市区町村名（漢字）の読み方を答えるクイズアプリです。
地名の「読み間違い」に関する研究データ収集を目的として開発しました。

## アプリの概要

- 全国1,675件の市区町村名から出題
- 回答前に「その読みを既に知っていたか」を記録（事前知識フラグ）
- ひらがなで読み方を入力して正誤判定
- 回答データはSupabaseに自動保存

## 収集データ

| 列名 | 内容 |
|------|------|
| timestamp | 回答日時 |
| prefecture | 都道府県 |
| municipality_name | 市区町村名 |
| correct_reading | 正解の読み |
| user_input | ユーザーの入力 |
| is_correct | 正解 / 不正解 |
| is_correct_binary | 正解=1 / 不正解=0 |
| knew_reading | 事前に読みを知っていたか（はい / いいえ） |
| time_to_first_input | 問題表示から最初のキー入力まで（ミリ秒） |
| total_response_time | 問題表示から送信まで（ミリ秒） |

## 技術スタック

- **フロントエンド**: HTML / CSS / JavaScript
- **データベース**: Supabase (PostgreSQL)
- **ホスティング**: Vercel

## ローカルでの起動

```bash
# 依存パッケージのインストール
pip install -r requirements.txt

# クイズDBの生成（初回のみ）
python make_quiz_db.py

# サーバー起動
python server.py
```

ブラウザで `http://localhost:5000` を開く。

## クイズDBの更新

`db/source/municipality_DB.csv` を更新後、以下を実行：

```bash
python make_quiz_db.py
```

`db/quiz_db.csv` と `db/quiz_db.json` が再生成されます。
