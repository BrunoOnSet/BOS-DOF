const CACHE = "bos-dof-v5.27";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css?v=5.27",
  "./app.js?v=5.27",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./logo-bruno-guillard.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  // Always prefer the newest online version for page/CSS/JS.
  if (
    req.mode === "navigate" ||
    req.destination === "document" ||
    req.destination === "style" ||
    req.destination === "script"
  ) {
    event.respondWith(
      fetch(req)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
          return response;
        })
        .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Images/icons: cache first is fine.
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
        return response;
      });
    })
  );
});
