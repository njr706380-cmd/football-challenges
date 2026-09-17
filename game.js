// game.js
// منطق لعبة "تحدي 30 ثانية"

// ============ إعدادات ============
const TIMER_SECONDS = 30;
const BONUS_FAST = 5;      // أول 5 ثواني = +1 نقطة
const BONUS_QUICK = 10;    // أول 10 ثواني = +0.5 نقطة
const CIRCLE_LENGTH = 238.76; // محيط الدائرة

// ============ الحالة ============
let questions = [];
let currentIndex = 0;
let score = 0;
let correctCount = 0;
let timeLeft = TIMER_SECONDS;
let timerInterval = null;
let answered = false;
let questionStartTime = 0;

// ============ عناصر الصفحة ============
const elProgress = document.getElementById("qProgress");
const elScore = document.getElementById("score");
const elCorrect = document.getElementById("correctCount");
const elTimerBox = document.getElementById("timerBox");
const elTimerText = document.getElementById("timerText");
const elTimerProgress = document.getElementById("timerProgress");
const elQuestionText = document.getElementById("questionText");
const elCategory = document.getElementById("category");
const elDiffBadge = document.getElementById("diffBadge");
const elAnswersBox = document.getElementById("answersBox");
const elQuestionArea = document.getElementById("questionArea");
const elEndScreen = document.getElementById("endScreen");
const elFinalScore = document.getElementById("finalScore");
const elEndMessage = document.getElementById("endMessage");

// ============ ترجمة الصعوبة ============
const DIFF_LABEL = {
    easy: { text: "سهل", cls: "diff-easy" },
    medium: { text: "متوسط", cls: "diff-medium" },
    hard: { text: "صعب", cls: "diff-hard" }
};

const DIFF_POINTS = {
    easy: 1,
    medium: 2,
    hard: 3
};

// ============ بدء اللعبة ============
function startGame() {
    // نجيب 25 سؤال عشوائي
    if (typeof getRandomQuestions === "function") {
        questions = getRandomQuestions();
    } else {
        // fallback: نستخدم QUESTIONS مباشرة
        const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
        questions = shuffled.slice(0, 25);
    }

    currentIndex = 0;
    score = 0;
    correctCount = 0;
    updateInfoBar();
    showQuestion();
}

// ============ شريط المعلومات ============
function updateInfoBar() {
    elProgress.textContent = `${currentIndex + 1}/${questions.length}`;
    elScore.textContent = score;
    elCorrect.textContent = correctCount;
}

// ============ عرض السؤال ============
function showQuestion() {
    answered = false;

    if (currentIndex >= questions.length) {
        endGame();
        return;
    }

    const q = questions[currentIndex];

    // بطاقة الصعوبة
    const diff = DIFF_LABEL[q.d] || DIFF_LABEL.easy;
    elDiffBadge.textContent = diff.text;
    elDiffBadge.className = "difficulty-badge " + diff.cls;

    // التصنيف + السؤال
    elCategory.textContent = q.cat || "";
    elQuestionText.textContent = q.q;

    // الأجوبة
    elAnswersBox.innerHTML = "";
    q.o.forEach((option, i) => {
        const btn = document.createElement("button");
        btn.className = "answer-btn";
        btn.textContent = option;
        btn.dataset.index = i;
        btn.addEventListener("click", () => handleAnswer(i));
        elAnswersBox.appendChild(btn);
    });

    updateInfoBar();
    startTimer();
}

// ============ المؤقت ============
function startTimer() {
    timeLeft = TIMER_SECONDS;
    questionStartTime = Date.now();
    updateTimerDisplay();

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        if (timeLeft <= 0) {
            timeLeft = 0;
            updateTimerDisplay();
            clearInterval(timerInterval);
            if (!answered) handleTimeout();
            return;
        }
        updateTimerDisplay();
    }, 100);
}

function updateTimerDisplay() {
    const t = Math.ceil(timeLeft);
    elTimerText.textContent = t;

    const progress = (timeLeft / TIMER_SECONDS) * CIRCLE_LENGTH;
    elTimerProgress.style.strokeDashoffset = CIRCLE_LENGTH - progress;

    // تغيير اللون حسب الوقت
    elTimerBox.classList.remove("timer-warning", "timer-danger");
    if (timeLeft <= 5) {
        elTimerBox.classList.add("timer-danger");
    } else if (timeLeft <= 10) {
        elTimerBox.classList.add("timer-warning");
    }
}

// ============ معالجة الإجابة ============
function handleAnswer(selectedIndex) {
    if (answered) return;
    answered = true;
    clearInterval(timerInterval);

    const q = questions[currentIndex];
    const correctIndex = q.a;
    const isCorrect = selectedIndex === correctIndex;

    // تلوين الأزرار
    const buttons = elAnswersBox.querySelectorAll(".answer-btn");
    buttons.forEach((btn, i) => {
        btn.disabled = true;
        if (i === correctIndex) {
            btn.classList.add("correct");
        } else if (i === selectedIndex && !isCorrect) {
            btn.classList.add("wrong");
        }
    });

    if (isCorrect) {
        correctCount++;
        const basePoints = DIFF_POINTS[q.d] || 1;

        // حساب بونص السرعة
        const elapsed = (Date.now() - questionStartTime) / 1000;
        let bonus = 0;
        let bonusMsg = "";

        if (elapsed <= BONUS_FAST) {
            bonus = 1;
            bonusMsg = "⚡ سرعة خارقة! +1";
        } else if (elapsed <= BONUS_QUICK) {
            bonus = 0.5;
            bonusMsg = "💨 سريع! +0.5";
        }

        const totalGain = basePoints + bonus;
        score += totalGain;

        updateInfoBar();

        if (bonus > 0) {
            showBonus(bonusMsg);
        }
    }

    // الانتقال للسؤال التالي
    setTimeout(() => {
        currentIndex++;
        showQuestion();
    }, 1200);
}

// ============ انتهى الوقت ============
function handleTimeout() {
    if (answered) return;
    answered = true;

    const q = questions[currentIndex];
    const correctIndex = q.a;

    // نلون الجواب الصحيح
    const buttons = elAnswersBox.querySelectorAll(".answer-btn");
    buttons.forEach((btn, i) => {
        btn.disabled = true;
        if (i === correctIndex) {
            btn.classList.add("correct");
        }
    });

    setTimeout(() => {
        currentIndex++;
        showQuestion();
    }, 1200);
}

// ============ بونص ============
function showBonus(message) {
    const popup = document.createElement("div");
    popup.className = "bonus-popup";
    popup.textContent = message;
    document.body.appendChild(popup);

    setTimeout(() => popup.remove(), 1000);
}

// ============ نهاية اللعبة ============
function endGame() {
    clearInterval(timerInterval);

    elQuestionArea.classList.add("hidden");
    elTimerBox.classList.add("hidden");
    elEndScreen.classList.remove("hidden");

    elFinalScore.textContent = score;

    // رسالة تحفيزية
    const total = questions.length;
    const percent = (correctCount / total) * 100;

    let msg = "";
    if (percent >= 90) msg = "🏆 أسطورة كروية! معلوماتك ممتازة";
    else if (percent >= 75) msg = "⚽ ممتاز! انت مشجع حقيقي";
    else if (percent >= 60) msg = "👏 جيد جداً! بس تكدر تسوي أحسن";
    else if (percent >= 40) msg = "🎯 لا بأس، تدرب أكثر";
    else msg = "📚 لازم تشاهد كرة أكثر!";

    elEndMessage.innerHTML = `${msg}<br><br>جاوبت صح ${correctCount} من ${total}`;
}

// ============ بدء تلقائي ============
document.addEventListener("DOMContentLoaded", startGame);
