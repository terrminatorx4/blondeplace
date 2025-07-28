const CACHE_NAME = 'blondeplace-v1';
const STATIC_ASSETS = [
  '/',
  '/services/',
  '/about/',
  '/contacts/',
  '/beauty-coworking/',
  '/blog/',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Install - кеширование статических ресурсов
self.addEventListener('install', (event) => {
  console.log('PWA: Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('PWA: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('PWA: Static assets cached');
        return self.skipWaiting();
      })
  );
});

// Activate - очистка старого кеша
self.addEventListener('activate', (event) => {
  console.log('PWA: Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('PWA: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('PWA: Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch - стратегия кеширования
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Только для нашего домена
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Если есть в кеше - возвращаем
        if (cachedResponse) {
          console.log('PWA: Serving from cache:', request.url);
          return cachedResponse;
        }

        // Если нет - загружаем и кешируем
        return fetch(request)
          .then((response) => {
            // Кешируем только успешные ответы
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            return response;
          })
          .catch(() => {
            // Офлайн fallback
            if (request.destination === 'document') {
              return caches.match('/');
            }
          });
      })
  );
});

// Background Sync для офлайн форм
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('PWA: Background sync triggered');
    event.waitUntil(
      // Здесь можно добавить логику отправки офлайн форм
      Promise.resolve()
    );
  }
});

// Push notifications (если понадобятся)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: 'Посмотреть',
          icon: '/icon-192.png'
        },
        {
          action: 'close',
          title: 'Закрыть',
          icon: '/icon-192.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});