// firebase-config.js
// إعدادات Firebase + دوال مساعدة

const firebaseConfig = {
    apiKey: "AIzaSyDA5TjwVE3rD5QobH5VOwzGupMANqEnDsM",
    authDomain: "football-m-37cf8.firebaseapp.com",
    databaseURL: "https://football-m-37cf8-default-rtdb.firebaseio.com/",
    projectId: "football-m-37cf8",
    storageBucket: "football-m-37cf8.firebasestorage.app",
    messagingSenderId: "76790118763",
    appId: "1:76790118763:web:24c89383efbda353d6342e"
};

// تهيئة Firebase (باستخدام CDN — بدون npm)
// نستخدم النسخة القديمة (compat) لأنها تعمل مباشرة بـ <script>

let db = null;

function initFirebase() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
    return db;
}

// ============ دوال مساعدة ============

// توليد كود غرفة (4 أحرف/أرقام)
function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // بدون O,0,I,1 لتجنب اللبس
    let code = "";
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// إنشاء غرفة جديدة
async function createRoom(hostName) {
    initFirebase();
    const code = generateRoomCode();
    const roomRef = db.ref("rooms/" + code);

    const roomData = {
        createdAt: Date.now(),
        status: "waiting",  // waiting | playing | ended
        questions: null,    // راح نحطها بعد ما ينضم الطرف الثاني
        host: {
            name: hostName,
            score: 0,
            progress: 0,
            ready: false,
            finished: false,
            joinedAt: Date.now()
        },
        guest: null
    };

    await roomRef.set(roomData);
    return code;
}

// الانضمام لغرفة
async function joinRoom(code, guestName) {
    initFirebase();
    const roomRef = db.ref("rooms/" + code);
    const snap = await roomRef.once("value");
    const room = snap.val();

    if (!room) {
        throw new Error("الغرفة غير موجودة");
    }

    if (room.guest) {
        throw new Error("الغرفة ممتلئة");
    }

    if (room.status !== "waiting") {
        throw new Error("اللعبة بدأت بالفعل");
    }

    await roomRef.child("guest").set({
        name: guestName,
        score: 0,
        progress: 0,
        ready: false,
        finished: false,
        joinedAt: Date.now()
    });

    return code;
}

// مراقبة الغرفة
function watchRoom(code, callback) {
    initFirebase();
    const roomRef = db.ref("rooms/" + code);
    roomRef.on("value", (snap) => {
        callback(snap.val());
    });
    return () => roomRef.off();
}
