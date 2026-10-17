const CACHE_NAME = "shree-scholars-pwa-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./Logo.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache =>
        /* Ek file missing ho to bhi baaki cache ho jaye, install fail na ho */
        Promise.all(
          APP_SHELL.map(url =>
            cache.add(url).catch(error => {
              console.warn("SW cache skip:", url, error);
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  /* Sirf apni site ki requests handle karo (Google Forms, Maps, API waghera nahi) */
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }

        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached =>
          cached || (event.request.mode === "navigate" ? caches.match("./index.html") : undefined)
        )
      )
  );
});
