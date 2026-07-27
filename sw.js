const CACHE_NAME = 'piloncillos-flashcards-v20';

// Recursos locales indispensables
const LOCAL_ASSETS = [
  './',
  './index.html',
  './styles.css?v=1.0.2',
  './app.js?v=1.0.2',
  './manifest.json',
  './icon.jpeg'
];

// CDNs externos
const EXTERNAL_ASSETS = [
  'https://unpkg.com/@phosphor-icons/web',
  'https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800&family=Feather:wght@700;800;900&display=swap',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11'
];

// 1. Instalación a prueba de fallos (Procesa archivo por archivo)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Guarda recursos locales
      await Promise.allSettled(LOCAL_ASSETS.map(url => cache.add(url)));
      // Guarda recursos externos sin bloquear si alguno falla
      await Promise.allSettled(EXTERNAL_ASSETS.map(url => cache.add(new Request(url, { mode: 'no-cors' }))));
    }).then(() => self.skipWaiting())
  );
});

// 2. Limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estrategia de Red / Caché corregida para CDNs
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Acepta respuestas normales (basic) y de CDNs externos (cors / opaque)
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});