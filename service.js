/* Pro Classroom — service worker
   Caches the app shell (this HTML file, manifest, icons) so the app can
   install and open instantly / offline. Firebase Auth + Firestore calls
   go straight to the network (never cached) since that data must stay live.

   Strategy: network-first for the app shell (so a redeploy is picked up
   immediately when online), falling back to the cache when offline.
*/

const CACHE_NAME = 'pro-classroom-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isAppShellRequest(url) {
  // Only cache same-origin GET requests for the app shell files.
  // Everything else (Firebase Auth/Firestore, Google Fonts, gstatic imports)
  // is left to the network so data always stays fresh.
  return url.origin === self.location.origin;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (!isAppShellRequest(url)) return; // let the browser handle cross-origin (Firebase, fonts, etc.)

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
