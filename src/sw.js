const CACHE_NAME = 'offline-runtime-v1';
const RUNTIME_ASSETS = [
  '/',
  '/index.html',
  '/assets/workers/pyodide.worker.js',
  '/assets/workers/js.worker.js',
  '/assets/pyodide/pyodide.js',
  '/assets/pyodide/pyodide.asm.wasm',
  // pyodide CDN - cached so app can work offline after first load
  'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js',
  'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.asm.wasm'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(RUNTIME_ASSETS.map(url => new Request(url, { mode: 'no-cors' }))).catch(err => {
        // best-effort caching for cross-origin items
        console.warn('Some assets failed to cache during install', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // network-first for pyodide CDN, cache-first for local assets
  const req = event.request;
  if (req.url.includes('cdn.jsdelivr.net/pyodide')) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
