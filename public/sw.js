const CACHE_NAME = "arranxos-shell-v1";
const STATIC_PATHS = ["/manifest.json", "/icons/icon-192.svg", "/icons/icon-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_PATHS)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }

            return Promise.resolve(false);
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const shouldHandleAsset =
    url.pathname === "/manifest.json" ||
    url.pathname === "/sw.js" ||
    url.pathname.startsWith("/icons/");

  if (!shouldHandleAsset) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && url.pathname !== "/sw.js") {
          const clonedResponse = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clonedResponse));
        }

        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        return Response.error();
      }),
  );
});
