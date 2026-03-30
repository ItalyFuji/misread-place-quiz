import csv
import io
import os
from datetime import datetime
from flask import Flask, jsonify, request, send_file, send_from_directory

app = Flask(__name__)

DATA_DIR = "data"
CSV_FILE = os.path.join(DATA_DIR, "answers.csv")
CSV_HEADER = ["timestamp", "prefecture", "municipality_name", "correct_reading", "user_input", "is_correct", "is_correct_binary", "knew_reading"]

QUIZ_DB = os.path.join("db", "quiz_db.csv")

# dataフォルダとCSVファイルを初期化する / Initialize data folder and CSV file
os.makedirs(DATA_DIR, exist_ok=True)
if not os.path.exists(CSV_FILE):
    with open(CSV_FILE, "w", newline="", encoding="utf-8-sig") as f:
        csv.writer(f).writerow(CSV_HEADER)


# --- 静的ファイルの配信 / Serve static files ---

@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(".", path)


# --- API ---

@app.route("/api/questions", methods=["GET"])
def get_questions():
    # quiz_db.csv が存在しない場合はエラーを返す
    # Return error if quiz_db.csv does not exist
    if not os.path.exists(QUIZ_DB):
        return jsonify({"error": "quiz_db.csv not found. Run make_quiz_db.py first."}), 404

    questions = []
    with open(QUIZ_DB, "r", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            questions.append(row)
    return jsonify(questions)


@app.route("/api/save_answer", methods=["POST"])
def save_answer():
    # フロントエンドから受け取ったデータをCSVに1行追記する
    # Append one answer row to the CSV from data sent by the frontend
    data = request.json
    is_correct = data["is_correct"]
    row = [
        datetime.now().isoformat(),
        data["prefecture"],
        data["municipality_name"],
        data["correct_reading"],
        data["user_input"],
        "正解" if is_correct else "不正解",
        1 if is_correct else 0,
        "はい" if data["knew_reading"] else "いいえ",
    ]
    with open(CSV_FILE, "a", newline="", encoding="utf-8-sig") as f:
        csv.writer(f).writerow(row)
    return jsonify({"status": "ok"})


# --- 管理画面 / Admin ---

def _read_answers():
    """CSVをメモリに読み込んで返す（元ファイルをロックしない）
    Read CSV into memory and return rows (does not lock the source file)."""
    if not os.path.exists(CSV_FILE):
        return [], []
    with open(CSV_FILE, "r", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    if not rows:
        return [], []
    return rows[0], rows[1:]  # header, data


@app.route("/admin")
def admin():
    # 回答データをHTMLテーブルで表示する（5秒ごとに自動更新）
    # Display answer data as an HTML table (auto-refreshes every 5 seconds)
    header, data = _read_answers()

    rows_html = ""
    for row in reversed(data):  # 新しい回答を上に表示 / Show latest answers first
        is_correct = row[5] == "正解" if len(row) > 5 else False  # is_correct列
        color = "#e8f5e9" if is_correct else "#ffebee"
        cells = "".join(f"<td>{cell}</td>" for cell in row)
        rows_html += f'<tr style="background:{color}">{cells}</tr>'

    header_html = "".join(f"<th>{h}</th>" for h in header)
    total = len(data)

    return f"""<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>管理画面 / Admin</title>
    <style>
        body {{ font-family: sans-serif; padding: 24px; background: #f4f6f8; }}
        h1 {{ font-size: 20px; margin-bottom: 4px; }}
        .meta {{ color: #666; font-size: 13px; margin-bottom: 16px; }}
        .actions {{ margin-bottom: 16px; }}
        a.btn {{
            display: inline-block; padding: 10px 24px; background: #007bff;
            color: white; text-decoration: none; border-radius: 6px; font-size: 15px;
        }}
        a.btn:hover {{ background: #0056b3; }}
        table {{ border-collapse: collapse; width: 100%; background: white;
                 border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }}
        th {{ background: #343a40; color: white; padding: 10px 12px;
              text-align: left; font-size: 13px; }}
        td {{ padding: 9px 12px; font-size: 13px; border-bottom: 1px solid #eee; }}
    </style>
</head>
<body>
    <h1>回答一覧 / Answer List</h1>
    <p class="meta">総回答数 / Total answers: <strong>{total}</strong> 件 &nbsp;|&nbsp; 5秒ごとに自動更新 / Auto-refreshes every 5s</p>
    <div class="actions">
        <a class="btn" href="/admin/download">CSVをダウンロード / Download CSV</a>
    </div>
    <table>
        <thead><tr>{header_html}</tr></thead>
        <tbody>{rows_html if rows_html else '<tr><td colspan="8" style="text-align:center;color:#999;">まだ回答がありません / No answers yet</td></tr>'}</tbody>
    </table>
    <script>setTimeout(() => location.reload(), 5000);</script>
</body>
</html>"""


@app.route("/admin/download")
def admin_download():
    # CSVをメモリにコピーしてダウンロードさせる（元ファイルは開きっぱなしにならない）
    # Copy CSV into memory and send as download (source file is never kept open by Excel)
    header, data = _read_answers()
    if not header:
        return "データがありません / No data yet.", 404

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    writer.writerows(data)

    filename = f"answers_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return send_file(
        io.BytesIO(buffer.getvalue().encode("utf-8-sig")),
        mimetype="text/csv",
        as_attachment=True,
        download_name=filename
    )


if __name__ == "__main__":
    print("サーバー起動中 / Server running ... ブラウザで / Open in browser: http://localhost:5000")
    print("管理画面 / Admin page: http://localhost:5000/admin")
    app.run(debug=True, port=5000)
