const CACHE_NAME = 'bioid-cache-v1';
const urlsToCache = [
  'index.html',
  'assets/css/style.css',
  'login-logic.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
