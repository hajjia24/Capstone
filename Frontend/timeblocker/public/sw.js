const CACHE_NAME = 'timeblocker-shell-v2';
const OFFLINE_URLS = ['/', '/manifest.json', '/icon-192x192.png', '/icon-512x512.png'];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Adding to cache:', OFFLINE_URLS);
        return cache.addAll(OFFLINE_URLS).catch((err) => {
          console.error('[SW] Cache.addAll error:', err);
        });
      })
      .catch((err) => {
        console.error('[SW] Cache open error:', err);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension')) return;

  event.respondWith(
    caches.match(request)
      .then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          if (response.ok && request.url.startsWith(self.location.origin)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy).catch((err) => {
                console.warn('[SW] Cache.put error:', err);
              });
            });
          }
          return response;
        });
      })
      .catch((err) => {
        console.error('[SW] Fetch error:', err);
        return caches.match('/');
      })
  );
});
