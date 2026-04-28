const CACHE_NAME = "hangout-kiosk-v6";
const DATA_CACHE_NAME = "hangout-products-v6";
const IMAGE_CACHE_NAME = "hangout-images-v6";

const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.png",
  "/hero.jpg"
];

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.includes('socket.io')) return;

  // 1. API DATA (Products JSON)
  if (url.pathname.includes("/api/products")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => cache.put(request.url, copy));
          }
          return response;
        })
        .catch(() => caches.match(request.url))
    );
    return;
  }

  // 2. IMAGES (All images from Port 5000)
  if (url.port === "5000" || url.pathname.includes("/uploads")) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          // Return cached if available, otherwise fetch and save
          return cachedResponse || fetch(request, { mode: 'cors' }).then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
              // Return nothing if both fail to prevent TypeError
              return new Response(''); 
          });
        });
      })
    );
    return;
  }

  // 3. APP SHELL
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).catch(() => {
        if (request.mode === "navigate") return caches.match("/index.html");
      });
    })
  );
});