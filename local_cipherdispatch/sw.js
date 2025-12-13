// SERVICE WORKER DISABLED - CAUSING CACHE ISSUES
// This service worker has been disabled due to caching problems
// All caching functionality has been removed

console.log('Service worker loaded but disabled');

// Immediately unregister this service worker
self.registration.unregister().then(() => {
  console.log('Service worker unregistered successfully');
});

// No-op event listeners to prevent errors
self.addEventListener('install', (event) => {
  console.log('SW install - skipping');
});

self.addEventListener('activate', (event) => {
  console.log('SW activate - skipping');
});

self.addEventListener('fetch', (event) => {
  // Do nothing - let all requests pass through normally
});
