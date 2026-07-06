// ============================================================
//  KPWKM ATTENDANCE - SERVICE WORKER
//  Tujuan: membolehkan PWA "Install as App" pada Android/Desktop.
//  Nota: Semua request ke Google Apps Script (API) TIDAK dicache
//  supaya data kehadiran sentiasa terus terkini/real-time.
// ============================================================

const CACHE_NAME = 'kpwkm-attendance-cache-v1';
const APP_SHELL = [
    './index.html',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(APP_SHELL).catch(() => {
                // Jika ada aset gagal dicache (cth. offline semasa install), abaikan sahaja
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Hanya urus permintaan GET untuk app shell/aset statik.
    // JANGAN sentuh request ke Google Apps Script (API) - biar terus ke network,
    // supaya data kehadiran, admin login, dan lain-lain sentiasa live/terkini.
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) {
        return; // biar browser uruskan terus (network), tiada campur tangan SW
    }

    event.respondWith(
        caches.match(req).then((cached) => {
            const networkFetch = fetch(req)
                .then((res) => {
                    if (res && res.status === 200 && res.type === 'basic') {
                        const resClone = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
                    }
                    return res;
                })
                .catch(() => cached);
            return cached || networkFetch;
        })
    );
});
