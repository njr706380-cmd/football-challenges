// sounds.js - محرك الأصوات (Web Audio API)

let audioCtx = null;
let soundEnabled = true;

function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log("Audio not supported");
        }
    }
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
    }
}

function playTone(freq, duration, type = "sine", volume = 0.3, delay = 0) {
    if (!soundEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime + delay;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
}

// نقرة زر
function playClick() {
    initAudio();
    playTone(800, 0.06, "sine", 0.15);
    playTone(1200, 0.04, "sine", 0.1, 0.02);
}

// جواب صحيح - أصوات صاعدة
function playCorrect() {
    initAudio();
    playTone(523.25, 0.12, "sine", 0.3, 0);
    playTone(659.25, 0.12, "sine", 0.3, 0.1);
    playTone(783.99, 0.25, "sine", 0.35, 0.2);
}

// جواب خطأ - صوت هابط
function playWrong() {
    initAudio();
    playTone(300, 0.15, "sawtooth", 0.2, 0);
    playTone(200, 0.25, "sawtooth", 0.25, 0.1);
}

// دقة الساعة (كل ثانية)
function playTick() {
    if (!soundEnabled || !audioCtx) return;
    playTone(1500, 0.03, "square", 0.08);
}

// صافرة الانطلاق
function playWhistle() {
    initAudio();
    playTone(2000, 0.15, "sine", 0.25, 0);
    playTone(2200, 0.2, "sine", 0.25, 0.18);
    playTone(2000, 0.15, "sine", 0.25, 0.4);
}

// فانفير النهاية
function playFanfare() {
    initAudio();
    playTone(523.25, 0.15, "triangle", 0.3, 0);
    playTone(659.25, 0.15, "triangle", 0.3, 0.15);
    playTone(783.99, 0.15, "triangle", 0.3, 0.3);
    playTone(1046.5, 0.5, "triangle", 0.35, 0.45);
}

// تشغيل/إيقاف الصوت
function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById("soundBtn");
    if (btn) btn.textContent = soundEnabled ? "🔊" : "🔇";
    return soundEnabled;
}
