// service-worker.js
// يخلي الموقع يشتغل أوفلاين + سريع

const CACHE_NAME = "tahadi-kura-v1";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./game.html",
    "./online.html",
    "./game.js",
    "./online.js",
    "./questions.js",
    "./sounds.js",
    "./firebase-config.js",
    "./manifest.json"
];

// تثبيت
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(FILES_TO_CACHE).catch((err) => {
                console.log("Cache install error:", err);
            });
        })
    );
    self.skipWaiting();
});

// تفعيل
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// جلب الملفات
self.addEventListener("fetch", (event) => {
    // تجاهل طلبات Firebase
    if (event.request.url.includes("firebase") ||
        event.request.url.includes("googleapis") ||
        event.request.url.includes("gstatic")) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((fetchRes) => {
                // خزّن الملفات الجديدة
                if (fetchRes && fetchRes.status === 200 && event.request.method === "GET") {
                    const resClone = fetchRes.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, resClone);
                    });
                }
                return fetchRes;
            });
        }).catch(() => {
            // لو أوفلاين، رجّع الصفحة الرئيسية
            return caches.match("./index.html");
        })
    );
});
