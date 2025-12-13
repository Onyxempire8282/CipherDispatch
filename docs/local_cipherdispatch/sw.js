// DISABLED SERVICE WORKER - NO CACHING OR FETCH INTERCEPTION
console.log("Service worker disabled - no caching");

self.addEventListener("install", (event) => {
  console.log("SW install - forcing activation");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("SW activate - clearing ALL caches");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// NO FETCH HANDLER - all requests go direct to network
