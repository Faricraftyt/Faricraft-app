// Faricraft APP service worker: works offline and reloads instantly.
// - Page + data/*.json: network first (always fresh when online), cache as fallback.
// - Built assets, images, flags: cache first, refreshed in the background.
// - Large downloads (downloads/) and other sites are never cached.
const CACHE = "faricraft-v1";
const scope = new URL(self.registration.scope);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "manifest.webmanifest"].map((p) => new URL(p, scope).href))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(fallbackUrl || request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(fallbackUrl || request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(event) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(event.request);
  const refresh = fetch(event.request).then((response) => {
    if (response.ok) cache.put(event.request, response.clone());
    return response;
  });
  if (cached) {
    event.waitUntil(refresh.catch(() => {}));
    return cached;
  }
  return refresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const path = url.pathname.slice(scope.pathname.length);
  if (path.startsWith("downloads/")) return;
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, scope.href));
  } else if (path.startsWith("data/")) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(event));
  }
});
