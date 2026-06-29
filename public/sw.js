/* Langford SMS — service worker.
 *
 * Conservative by design:
 *  - Navigations: network-first, falling back to cached shell only when offline.
 *    (Never serves a stale HTML doc while online, so deploys take effect cleanly.)
 *  - Static assets (_next/static, images, fonts): cache-first for speed.
 *  - Everything else (Firebase, REST APIs, Sentry tunnel, cross-origin, non-GET):
 *    passes straight through — never cached.
 *
 * Bump CACHE_VERSION to invalidate old caches on the next deploy.
 */
const CACHE_VERSION = "langford-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_URL = "/dashboard";

self.addEventListener("install", (event) => {
  // Activate the new worker immediately instead of waiting for old tabs to close.
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.add(OFFLINE_URL)).catch(() => {}),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older versions.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf)$/i.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GETs; let everything else hit the network untouched.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept Sentry tunnel / API / Next data routes.
  if (
    url.pathname.startsWith("/monitoring") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Page navigations → network-first with offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          const cached = await cache.match(OFFLINE_URL);
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Static assets → cache-first, populate cache on first hit.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return cached ?? Response.error();
        }
      })(),
    );
  }
});
