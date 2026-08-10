const CACHE_NAME = 'martinari-v1';
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
  // Let the browser handle standard API or WebRTC fetch directly, only cache static assets if needed
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
