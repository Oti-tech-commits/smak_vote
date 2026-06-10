self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open('smak-vote-cache-v1').then((cache) => cache.addAll(['/','/manifest.webmanifest'])));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        return caches.open('smak-vote-cache-v1').then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
