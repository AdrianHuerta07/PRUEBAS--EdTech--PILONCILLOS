const CACHE_NAME = 'piloncillos-flashcards-v17';

// Recursos esenciales para el funcionamiento Offline de la App
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css?v=1.0.2',
  './app.js?v=1.0.2',
  './manifest.json',
  './icon.jpeg',
  // CDNs externos para asegurar carga sin conexión tras la primera visita
  'https://unpkg.com/@phosphor-icons/web',
  'https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800&family=Feather:wght@700;800;900&display=swap',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11'
];

// 1. Evento Install: Guarda en caché los archivos estáticos base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// 2. Evento Activate: Elimina cachés obsoletas e inmediatamente toma control
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

// 3. Evento Fetch: Estrategia Network First (Red primero, luego Caché)
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Si hay red y la respuesta es válida, actualiza la caché en segundo plano
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Si falla la red (offline), entrega la versión guardada en caché
        return caches.match(event.request);
      })
  );
});