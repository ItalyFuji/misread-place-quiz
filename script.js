// Supabase クライアント / Supabase client
const SUPABASE_URL      = "https://uzsotpzdsixkznbwytft.supabase.co/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6c290cHpkc2l4a3puYnd5dGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NjY5NDksImV4cCI6MjA5MDQ0Mjk0OX0.PD5xZ8Ha3_Y_gQQcrf18VYzMYHu3-3jG595mj9DzKeY";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 状態変数 / State variables
let masterDatabase    = []; // サーバーから取得した全問題 / All questions fetched from server
let remainingQuestions = [];
let currentQuestion   = null;
let knewReading       = null;
let questionNumber    = 0;
let answeredQuestions = [];
let questionStartTime  = null; // 問題表示時刻 / Time when question was displayed
let firstInputTime     = null; // 最初のキー入力時刻 / Time of first keystroke

// DOM要素 / DOM elements
const consentScreen       = document.getElementById("consent-screen");
const consentAgreeBtn     = document.getElementById("consent-agree");
const consentDeclineBtn   = document.getElementById("consent-decline");
const declineScreen       = document.getElementById("decline-screen");
const backToConsentBtn    = document.getElementById("back-to-consent-btn");
const countScreen         = document.getElementById("count-screen");
const countAllBtn         = document.getElementById("count-all-btn");
const quizScreen          = document.getElementById("quiz-screen");
const resultsScreen       = document.getElementById("results-screen");
const questionDisplay     = document.getElementById("question-display");
const hintText            = document.getElementById("hint-text");
const submitBtn           = document.getElementById("submit-btn");
const userAnswerInput     = document.getElementById("user-answer");
const warningMessage      = document.getElementById("warning-message");
const resultMessage       = document.getElementById("result-message");
const knownYesBtn         = document.getElementById("known-yes");
const knownNoBtn          = document.getElementById("known-no");
const resultsList         = document.getElementById("results-list");
const restartBtn          = document.getElementById("restart-btn");


// 画面の切り替えヘルパー / Screen switching helper
const allScreens = [consentScreen, declineScreen, countScreen, quizScreen, resultsScreen];
function showScreen(screen) {
    allScreens.forEach(s => s.style.display = "none");
    screen.style.display = "block";
}


// 1. ページ読み込み時に問題データをサーバーから取得する
//    Fetch question data from the server on page load
fetch("db/quiz_db.json")
    .then(r => r.json())
    .then(data => {
        masterDatabase = data;
        // 全問ボタンのラベルを実際の問題数に更新する / Update "all" button label with actual count
        countAllBtn.textContent = `全問（${masterDatabase.length}問）`;
        // DB件数より多い選択肢を無効化する / Disable options that exceed available question count
        document.querySelectorAll(".count-btn[data-count]").forEach(btn => {
            const count = parseInt(btn.dataset.count);
            if (!isNaN(count) && count > masterDatabase.length) {
                btn.disabled = true;
            }
        });
        console.log(`問題データ取得完了 / Questions loaded: ${masterDatabase.length} 件`);
    })
    .catch(err => console.error("問題データ取得エラー / Failed to load questions:", err));


// 2. 同意確認画面 / Consent screen
consentAgreeBtn.addEventListener("click", () => {
    if (masterDatabase.length === 0) {
        alert("問題データを読み込み中です。しばらくお待ちください。\nQuestion data is still loading. Please wait.");
        return;
    }
    showScreen(countScreen);
});

consentDeclineBtn.addEventListener("click", () => {
    showScreen(declineScreen);
});

// 「戻る」ボタン：同意確認画面に戻る / Back button: return to consent screen
backToConsentBtn.addEventListener("click", () => {
    showScreen(consentScreen);
});


// 3. 問題数選択画面 / Question count selection screen
document.querySelectorAll(".count-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const count = btn.dataset.count === "all" ? masterDatabase.length : parseInt(btn.dataset.count);
        startQuiz(count);
    });
});


// 4. クイズ開始 / Start quiz
function startQuiz(count) {
    // masterDatabaseをシャッフルして先頭count件を出題リストにする
    // Shuffle masterDatabase and take the first `count` entries as the question list
    const shuffled = [...masterDatabase].sort(() => Math.random() - 0.5);
    remainingQuestions = shuffled.slice(0, count);
    answeredQuestions  = [];
    questionNumber     = 0;

    showScreen(quizScreen);
    setNextQuestion();
}


// 5. 出題処理 / Load the next question
function setNextQuestion() {
    if (remainingQuestions.length === 0) {
        showResults();
        return;
    }

    // ランダムに1問選んでリストから取り除く / Pick a random question and remove it from the list
    const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
    currentQuestion   = remainingQuestions.splice(randomIndex, 1)[0];
    questionNumber++;

    questionDisplay.textContent = currentQuestion.name;
    hintText.textContent = `ヒント: ${currentQuestion.pref} の ${currentQuestion.suffix}`;
    questionStartTime = Date.now(); // 問題表示時刻を記録 / Record question display time
    firstInputTime    = null;       // 入力時刻をリセット / Reset first input time

    // 「知っていますか？」を未選択状態にリセットする / Reset the "did you know?" selection
    knewReading = null;
    knownYesBtn.classList.remove("selected");
    knownNoBtn.classList.remove("selected");

    // 入力欄と解答ボタンをロックする（「知っていますか？」を選ぶまで使えない）
    // Lock the input field and submit button until "did you know?" is answered
    userAnswerInput.value     = "";
    userAnswerInput.disabled  = true;
    submitBtn.disabled        = true;
    resultMessage.textContent = "";
    warningMessage.textContent = "";
}


// 6. 「知っていますか？」ボタンの処理 / Handle "did you know?" button selection
function handleKnownSelection(selected) {
    knewReading = selected;
    knownYesBtn.classList.toggle("selected", selected === true);
    knownNoBtn.classList.toggle("selected", selected === false);

    // 選択後に入力欄を有効にする / Enable the input field after selection
    userAnswerInput.disabled = false;
    userAnswerInput.focus();
}

knownYesBtn.addEventListener("click", () => handleKnownSelection(true));
knownNoBtn.addEventListener("click", () => handleKnownSelection(false));


// 7a. PCでEnterキーで送信 / Submit with Enter key on PC
userAnswerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !submitBtn.disabled) {
        submitBtn.click();
    }
});

// 7. 入力中のリアルタイムひらがなチェック / Validate input as hiragana in real time
userAnswerInput.addEventListener("input", () => {
    if (firstInputTime === null && userAnswerInput.value !== "") {
        firstInputTime = Date.now(); // 最初のキー入力時刻を記録 / Record first keystroke time
    }

    const text = userAnswerInput.value;
    const hiraganaRegex = /^[ぁ-んー]*$/;

    if (text === "") {
        warningMessage.textContent = "";
        submitBtn.disabled = true;
    } else if (!hiraganaRegex.test(text)) {
        warningMessage.textContent = "※ひらがなのみで入力してください";
        submitBtn.disabled = true;
    } else {
        warningMessage.textContent = "";
        submitBtn.disabled = false;
    }
});


// 8. 解答送信処理 / Handle answer submission
submitBtn.addEventListener("click", () => {
    const userAnswer         = userAnswerInput.value.trim();
    const isCorrect          = (userAnswer === currentQuestion.reading);
    const now                = Date.now();
    const timeToFirstInput   = firstInputTime !== null ? firstInputTime - questionStartTime : null;
    const totalResponseTime  = now - questionStartTime;

    // 回答を結果画面用に記録する / Record the answer for the results screen
    answeredQuestions.push({
        number:      questionNumber,
        pref:        currentQuestion.pref,
        name:        currentQuestion.name + currentQuestion.suffix,
        reading:     currentQuestion.reading,
        userAnswer:  userAnswer,
        isCorrect:   isCorrect,
        knewReading: knewReading
    });

    // Supabaseへ直接保存 / Save directly to Supabase
    supabaseClient.from("answers").insert({
        timestamp:            new Date().toISOString(),
        prefecture:           currentQuestion.pref,
        municipality_name:    currentQuestion.name + currentQuestion.suffix,
        correct_reading:      currentQuestion.reading,
        user_input:           userAnswer,
        is_correct:           isCorrect ? "正解" : "不正解",
        is_correct_binary:    isCorrect ? 1 : 0,
        knew_reading:         knewReading ? "はい" : "いいえ",
        time_to_first_input:  timeToFirstInput,
        total_response_time:  totalResponseTime
    }).then(({ data, error }) => {
        if (error) {
            console.error("保存エラー:", error);
        } else {
            console.log("保存成功:", data);
        }
    });

    // 正解・不正解を表示する / Show correct / incorrect result
    if (isCorrect) {
        resultMessage.textContent = "正解！";
        resultMessage.style.color = "green";
    } else {
        resultMessage.textContent = "不正解...";
        resultMessage.style.color = "red";
    }

    // 漢字の上にルビ（ふりがな）を表示する / Show furigana above the kanji
    questionDisplay.innerHTML = `<ruby>${currentQuestion.name}<rt style="font-size:0.45em; color:#d32f2f;">${currentQuestion.reading}</rt></ruby>`;

    submitBtn.disabled       = true;
    userAnswerInput.disabled = true;

    // 2秒後に次の問題へ進む / Move to the next question after 2 seconds
    setTimeout(() => {
        setNextQuestion();
    }, 2000);
});


// 9. 結果画面の表示 / Show results screen
function showResults() {
    showScreen(resultsScreen);

    resultsList.innerHTML = answeredQuestions.map(q => `
        <div class="result-item ${q.isCorrect ? "correct" : "incorrect"}">
            <span class="result-num">問${q.number}</span>
            <span class="result-name">${q.name}</span>
            <span class="result-reading">${q.reading}</span>
        </div>
    `).join("");
}


// 10. もう一度挑戦するボタン → 問題数選択画面へ / Restart button → go to count selection screen
restartBtn.addEventListener("click", () => {
    showScreen(countScreen);
});
