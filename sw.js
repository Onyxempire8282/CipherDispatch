// Minimal service worker required for PWA installability on iOS
// Does not cache anything — avoids the caching issues from the
// previous PWA setup
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', (event) => {
  // Pass all requests through — no caching
  return;
});
