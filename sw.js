const CACHE_NAME = 'church-shop-pwa-v2';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
];

// Icons are cached opportunistically so replacing SVG icons with PNG files later
// does not break service worker installation when the old files disappear.
const OPTIONAL_ICON_URLS = [
  './icon-192.svg',
  './icon-512.svg',
  './icon-192.png',
  './icon-512.png',
];

function cacheOptionalUrl(cache, url) {
  return fetch(url)
    .then((response) => {
      if (!response.ok) return null;
      return cache.put(url, response);
    })
    .catch(() => null);
}

self.addEventListener('install', (event) => {
  if (self.location.protocol === 'file:') return;

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS)
        .then(() => Promise.all(OPTIONAL_ICON_URLS.map((url) => cacheOptionalUrl(cache, url)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  if (self.location.protocol === 'file:') return;

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (self.location.protocol === 'file:' || event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
