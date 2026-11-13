/* Bump this cache version when releasing a new offline shell. */
const cacheName = "book-comeback-shell-v6";
const publicAssets = ["/manifest.webmanifest", "/icon.svg", "/apple-touch-icon.png", "/icon-192.png", "/icon-512.png", "/icon-maskable.png"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    const response = await fetch("/", { cache: "reload" });
    if (!response.ok) throw new Error("Could not fetch the app shell.");
    const html = await response.clone().text();
    const assets = [...new Set(
      Array.from(html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g), ([, url]) => url)
    )];
    await cache.addAll([...publicAssets, ...assets]);
    await cache.put("/", response);
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("book-comeback-shell-") && key !== cacheName)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(fetch(request).catch(async () =>
      (await (await caches.open(cacheName)).match("/")) ?? Response.error()));
  } else if (url.pathname.startsWith("/_next/static/") || publicAssets.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
});
