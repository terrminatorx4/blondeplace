// BLONDE PLACE Perfect PWA Service Worker
const CACHE_NAME = 'blondeplace-perfect-v1';
const urlsToCache = [
  '/',
  '/blog/',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.svg',
  '/apple-touch-icon.png'
];

// Perfect install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Perfect fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request).catch(() => {
          // Fallback for offline
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
        });
      }
    )
  );
});

// Perfect activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});