// Simple service worker to prevent caching issues
const CACHE_VERSION = "v2.0"; // Force complete refresh

self.addEventListener("install", (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Delete all old caches
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_VERSION) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Network-first strategy: always try to get fresh content
self.addEventListener("fetch", (event) => {
  // Only handle GET requests for same-origin static assets
  if (
    event.request.method !== "GET" ||
    !event.request.url.startsWith(self.location.origin) ||
    event.request.url.includes("supabase.co")
  ) {
    // Let the browser handle non-GET, cross-origin, or API requests normally
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses for static assets
        if (response && response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {
              // Silently ignore cache errors
            });
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache for static assets only
        return caches.match(event.request);
      })
  );
});
