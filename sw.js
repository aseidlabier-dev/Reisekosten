const CACHE_NAME = 'reisekosten-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './db.js',
  './manifest.json',
  'https://unpkg.com/dexie@3.2.4/dist/dexie.js',
  'https://unpkg.com/lucide@latest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Return from cache
        }
        return fetch(event.request).then(
          function(response) {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            // Clone the response
            var responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                // Don't cache API/CDN calls unless specified in ASSETS_TO_CACHE, but for simple PWA we cache all GET
                if(event.request.method === 'GET') {
                    cache.put(event.request, responseToCache);
                }
              });
            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
