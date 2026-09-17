// online.js - منطق الأونلاين مع الأصوات

let currentRoomCode = null;
let isHost = false;
let myName = "";
let myRole = "";
let roomWatcher = null;

let myQuestions = [];
let myIndex = 0;
let myScore = 0;
let myTimer = null;
let myTimeLeft = 30;
let myAnswered = false;
let myStartTime = 0;
let lastTickSecond = 30;

function showScreen(name) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const el = document.getElementById("screen-" + name);
    if (el) el.classList.add("active");
    window.scrollTo(0, 0);
}

function showMessage(elId, text, type) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = `<div class="message ${type}">${text}</div>`;
    setTimeout(() => { el.innerHTML = ""; }, 3000);
}

async function handleCreateRoom() {
    initAudio();
    playClick();

    const name = document.getElementById("hostName").value.trim();
    if (name.length < 2) {
        showMessage("createMessage", "الاسم قصير جداً", "error");
        return;
    }

    try {
        showMessage("createMessage", "جاري الإنشاء...", "success");
        const code = await createRoom(name);
        currentRoomCode = code;
        isHost = true;
        myName = name;
        myRole = "host";

        sessionStorage.setItem("roomCode", code);
        sessionStorage.setItem("myName", name);
        sessionStorage.setItem("myRole", "host");

        document.getElementById("displayRoomCode").textContent = code;
        document.getElementById("lobbyHostName").textContent = name;
        showScreen("lobby");
        startWatchingRoom();
    } catch (e) {
        showMessage("createMessage", e.message, "error");
    }
}

async function handleJoinRoom() {
    initAudio();
    playClick();

    const code = document.getElementById("roomCode").value.trim().toUpperCase();
    const name = document.getElementById("guestName").value.trim();

    if (code.length !== 4) {
        showMessage("joinMessage", "الكود يجب أن يكون 4 أحرف", "error");
        return;
    }
    if (name.length < 2) {
        showMessage("joinMessage", "الاسم قصير جداً", "error");
        return;
    }

    try {
        showMessage("joinMessage", "جاري الانضمام...", "success");
        await joinRoom(code, name);
        currentRoomCode = code;
        isHost = false;
        myName = name;
        myRole = "guest";

        sessionStorage.setItem("roomCode", code);
        sessionStorage.setItem("myName", name);
        sessionStorage.setItem("myRole", "guest");

        document.getElementById("roomCodeBox").classList.add("hidden");
        document.getElementById("lobbyGuestName").textContent = name;
        document.getElementById("guestStatus").textContent = "أنت";
        document.getElementById("guestCard").classList.remove("empty");
        showScreen("lobby");
        startWatchingRoom();
    } catch (e) {
        showMessage("joinMessage", e.message, "error");
    }
}

function copyRoomCode() {
    initAudio();
    playClick();
    if (!currentRoomCode) return;
    navigator.clipboard.writeText(currentRoomCode).then(() => {
        alert("✅ تم نسخ الكود: " + currentRoomCode);
    }).catch(() => {
        alert("الكود: " + currentRoomCode);
    });
}

function startWatchingRoom() {
    if (roomWatcher) roomWatcher();
    roomWatcher = watchRoom(currentRoomCode, (room) => {
        if (!room) return;

        if (room.host) {
            document.getElementById("lobbyHostName").textContent = room.host.name;
            document.getElementById("gameHostName").textContent = room.host.name;
            document.getElementById("gameHostScore").textContent = room.host.score || 0;
            document.getElementById("finalHostName").textContent = room.host.name;
            document.getElementById("finalHostScore").textContent = room.host.score || 0;
        }
        if (room.guest) {
            document.getElementById("lobbyGuestName").textContent = room.guest.name;
            document.getElementById("guestStatus").textContent = "✅ انضم";
            document.getElementById("guestCard").classList.remove("empty");
            document.getElementById("gameGuestName").textContent = room.guest.name;
            document.getElementById("gameGuestScore").textContent = room.guest.score || 0;
            document.getElementById("finalGuestName").textContent = room.guest.name;
            document.getElementById("finalGuestScore").textContent = room.guest.score || 0;
        }

        if (room.status === "waiting" && room.host && room.guest) {
            document.getElementById("waitingBox").classList.add("hidden");
            if (isHost) {
                document.getElementById("lobbyButtons").classList.remove("hidden");
            }
        }

        if (room.status === "playing" && myQuestions.length === 0) {
            startPlayingOnline(room);
        }

        if (room.status === "playing") {
            updateScores(room);
        }

        if (room.status === "playing" &&
            room.host && room.host.finished &&
            room.guest && room.guest.finished &&
            !document.getElementById("screen-result").classList.contains("active")) {
            showOnlineResult(room);
        }
    });
}

async function startOnlineGame() {
    if (!isHost) return;
    initAudio();
    playClick();

    const questions = getRandomQuestions();
    initFirebase();
    const roomRef = db.ref("rooms/" + currentRoomCode);
    await roomRef.update({
        status: "playing",
        questions: questions
    });
}

function startPlayingOnline(room) {
    myQuestions = room.questions || [];
    myIndex = 0;
    myScore = 0;
    myAnswered = false;
    showScreen("game");
    playWhistle();
    setTimeout(() => showOnlineQuestion(), 500);
}

function showOnlineQuestion() {
    if (myIndex >= myQuestions.length) {
        finishMyGame();
        return;
    }

    myAnswered = false;
    const q = myQuestions[myIndex];

    document.getElementById("gameProgress").textContent = myIndex + 1;
    document.getElementById("gameQuestion").textContent = q.q;

    const answersBox = document.getElementById("gameAnswers");
    answersBox.innerHTML = "";

    q.o.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.style.cssText = "padding: 16px; text-align: right; font-size: 17px;";
        btn.textContent = opt;
        btn.onclick = () => handleOnlineAnswer(i);
        answersBox.appendChild(btn);
    });

    startOnlineTimer();
}

function startOnlineTimer() {
    myTimeLeft = 30;
    lastTickSecond = 30;
    myStartTime = Date.now();

    if (myTimer) clearInterval(myTimer);

    myTimer = setInterval(() => {
        myTimeLeft -= 0.1;
        if (myTimeLeft <= 0) {
            myTimeLeft = 0;
            clearInterval(myTimer);
            if (!myAnswered) handleOnlineTimeout();
            return;
        }
        const curSec = Math.ceil(myTimeLeft);
        if (curSec !== lastTickSecond && curSec > 0 && curSec <= 10) {
            playTick();
            lastTickSecond = curSec;
        }
    }, 100);
}

async function handleOnlineAnswer(selectedIndex) {
    if (myAnswered) return;
    myAnswered = true;
    clearInterval(myTimer);

    const q = myQuestions[myIndex];
    const isCorrect = selectedIndex === q.a;

    const buttons = document.querySelectorAll("#gameAnswers button");
    buttons.forEach((btn, i) => {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        if (i === q.a) {
            btn.style.background = "#27AE60";
            btn.style.borderColor = "#27AE60";
            btn.style.color = "white";
            btn.style.opacity = "1";
        } else if (i === selectedIndex && !isCorrect) {
            btn.style.background = "#E74C3C";
            btn.style.borderColor = "#E74C3C";
            btn.style.color = "white";
            btn.style.opacity = "1";
        }
    });

    if (isCorrect) {
        playCorrect();
        const basePoints = q.d === "easy" ? 1 : q.d === "medium" ? 2 : 3;
        const elapsed = (Date.now() - myStartTime) / 1000;
        let bonus = 0;
        if (elapsed <= 5) bonus = 1;
        else if (elapsed <= 10) bonus = 0.5;
        myScore += basePoints + bonus;
    } else {
        playWrong();
    }

    await updateMyScore();

    setTimeout(() => {
        myIndex++;
        showOnlineQuestion();
    }, 1200);
}

async function handleOnlineTimeout() {
    if (myAnswered) return;
    myAnswered = true;
    playWrong();

    const q = myQuestions[myIndex];
    const buttons = document.querySelectorAll("#gameAnswers button");
    buttons.forEach((btn, i) => {
        btn.disabled = true;
        if (i === q.a) {
            btn.style.background = "#27AE60";
            btn.style.borderColor = "#27AE60";
            btn.style.color = "white";
        }
    });

    await updateMyScore();

    setTimeout(() => {
        myIndex++;
        showOnlineQuestion();
    }, 1200);
}

async function updateMyScore() {
    initFirebase();
    const roomRef = db.ref("rooms/" + currentRoomCode);
    await roomRef.child(myRole).update({
        score: myScore,
        progress: myIndex + 1
    });
}

async function finishMyGame() {
    initFirebase();
    const roomRef = db.ref("rooms/" + currentRoomCode);
    await roomRef.child(myRole).update({
        finished: true,
        score: myScore
    });

    playFanfare();

    document.getElementById("gameAnswers").innerHTML =
        `<div style="text-align: center; padding: 30px; color: #D4AF37; font-size: 20px; font-weight: 700;">
            ✅ أكملت التحدي!<br>
            <span style="color: #888; font-size: 16px; margin-top: 10px; display: block;">في انتظار الخصم...</span>
        </div>`;
    document.getElementById("gameQuestion").textContent = "🎉 انتهيت!";
}

function updateScores(room) {
    if (room.host) {
        document.getElementById("gameHostScore").textContent = room.host.score || 0;
    }
    if (room.guest) {
        document.getElementById("gameGuestScore").textContent = room.guest.score || 0;
    }
}

function showOnlineResult(room) {
    const hostScore = room.host.score || 0;
    const guestScore = room.guest.score || 0;

    document.getElementById("finalHostName").textContent = room.host.name;
    document.getElementById("finalHostScore").textContent = hostScore;
    document.getElementById("finalGuestName").textContent = room.guest.name;
    document.getElementById("finalGuestScore").textContent = guestScore;

    const myScoreVal = myRole === "host" ? hostScore : guestScore;
    const oppScoreVal = myRole === "host" ? guestScore : hostScore;

    let emoji, msg;
    if (myScoreVal > oppScoreVal) {
        emoji = "🏆";
        msg = "فزت! أحسنت 🎉";
    } else if (myScoreVal < oppScoreVal) {
        emoji = "😔";
        msg = "خسرت، حاول مرة ثانية!";
    } else {
        emoji = "🤝";
        msg = "تعادل! مباراة قوية";
    }

    document.getElementById("resultEmoji").textContent = emoji;
    document.getElementById("resultMessage").textContent = msg;

    showScreen("result");
    playFanfare();
}

function leaveRoom() {
    initAudio();
    playClick();
    if (roomWatcher) roomWatcher();
    initFirebase();
    if (currentRoomCode && myRole) {
        const roomRef = db.ref("rooms/" + currentRoomCode);
        if (isHost) {
            roomRef.remove();
        } else {
            roomRef.child(myRole).remove();
        }
    }
    sessionStorage.clear();
    location.reload();
}
