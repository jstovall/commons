const CACHE_NAME = "commons-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Minimal network-first handler — having a fetch listener is one of the
// signals browsers use to decide an app is "installable." No offline
// asset caching yet; that's a future enhancement if it becomes valuable.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});