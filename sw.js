// IMPORTANTE: incrementa questo nome a ogni deploy (es. 'fitness-tracker-v2').
// La strategia è cache-first: senza il cambio di nome i dispositivi con la PWA
// già installata continuerebbero a servire per sempre la vecchia copia in cache
// e non riceverebbero mai le correzioni.
const CACHE_NAME = 'fitness-tracker-v5';
const ASSET_DA_CACHARE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/oggi.js',
  './js/allenamento.js',
  './js/storico.js',
  './js/corpo.js',
  './js/storage.js',
  './js/progressione.js',
  './js/mesociclo.js',
  './js/dati-default.js',
  './js/database-alimenti.js',
  './js/budget.js',
  './js/metabolismo.js',
  './js/giorno-oggi.js',
  './js/prossima-azione.js',
  './js/icons.js',
  './icons/icon.svg',
  './fonts/barlow-400.woff2',
  './fonts/barlow-600.woff2',
  './fonts/barlow-700.woff2',
  './fonts/barlow-condensed-500.woff2',
  './fonts/barlow-condensed-600.woff2',
  './fonts/barlow-condensed-700.woff2'
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
