// BLONDEPLACE PWA SERVICE WORKER v1.0
const CACHE_NAME = 'blondeplace-v1.0.0';
const CACHE_ASSETS = [
  '/',
  '/blog/',
  '/o-nas/',
  '/uslugi/',
  '/offline/',
  '/site.webmanifest',
  '/favicon.ico'
];

// Install event - кэшируем ресурсы
self.addEventListener('install', event => {
  console.log('PWA: Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('PWA: Caching static assets');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => {
        console.log('PWA: Static assets cached');
        return self.skipWaiting();
      })
      .catch(error => console.log('PWA: Cache failed:', error))
  );
});

// Activate event - очищаем старые кэши
self.addEventListener('activate', event => {
  console.log('PWA: Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('PWA: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('PWA: Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - стратегия кэширования
self.addEventListener('fetch', event => {
  // Пропускаем внешние запросы
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('PWA: Serving from cache:', event.request.url);
          return response;
        }

        // Клонируем запрос для кэширования
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Проверяем валидность ответа
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Клонируем ответ для кэширования
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Возвращаем страницу офлайн для HTML запросов
            if (event.request.destination === 'document') {
              return caches.match('/offline/');
            }
          });
      })
  );
});

// Background sync для уведомлений
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('PWA: Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Здесь можно добавить синхронизацию данных
  return Promise.resolve();
} 