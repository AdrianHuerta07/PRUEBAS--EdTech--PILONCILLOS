// ══════════════════════════════════════════════════════════
// SERVICE WORKER · Flashcards Piloncillos
// Cachea el "app shell" para que la aplicación funcione
// completamente offline una vez visitada la primera vez.
// ══════════════════════════════════════════════════════════

const CACHE_NAME = 'piloncillos-flashcards-v11';

// Archivos propios de la app (siempre disponibles offline)
const CORE_ASSETS = [
    './',
    './index.html',
    './app.js',
    './styles.css',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Recursos externos (fuentes e iconos). Si no hay internet en la
// primera visita, simplemente no se cachean y la app sigue
// funcionando con las fuentes del sistema.
const EXTERNAL_ASSETS = [
    'https://unpkg.com/@phosphor-icons/web',
    'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:ital,wght@0,400;0,600;0,700;0,800;1,600&display=swap'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            await cache.addAll(CORE_ASSETS);
            // Externos: se intentan cachear pero no bloquean la instalación si fallan
            await Promise.allSettled(
                EXTERNAL_ASSETS.map(url => cache.add(url).catch(() => null))
            );
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Estrategia: "cache first, network fallback" para el app shell,
// y "network first, cache fallback" para todo lo demás (por si
// las fuentes/iconos cambian de versión con conexión disponible).
self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Solo interceptar GET
    if (req.method !== 'GET') return;

    const isCoreAsset = CORE_ASSETS.some((asset) => req.url.endsWith(asset.replace('./', '')));

    if (isCoreAsset) {
        event.respondWith(
            caches.match(req).then((cached) => cached || fetch(req))
        );
    } else {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
                    return res;
                })
                .catch(() => caches.match(req))
        );
    }
});