const CACHE_NAME = 'fitness-tracker-v1';
const ASSET_DA_CACHARE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/oggi.js',
  './js/allenamento.js',
  './js/storico.js',
  './js/storage.js',
  './js/progressione.js',
  './js/mesociclo.js',
  './js/dati-default.js',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSET_DA_CACHARE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chiavi) =>
      Promise.all(chiavi.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((risposta) => risposta || fetch(event.request))
  );
});
