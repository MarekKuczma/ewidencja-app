/**
 * EWIDENCJA FLOTY RINKON — service worker
 *
 * ŻELAZNA ZASADA: każda zmiana czegokolwiek w folderze pwa/ wymaga
 * podbicia WERSJA_CACHE poniżej. Shell działa cache-first, więc bez
 * podbicia telefony będą uparcie pokazywać starą wersję aplikacji,
 * a Ty stracisz godzinę na szukanie błędu, którego nie ma.
 */

var WERSJA_CACHE = 'ewidencja-v7';

var PLIKI_SHELL = [
  './',
  './index.html',
  './config.js',
  './manifest.json',
  './ikona-192.png',
  './ikona-512.png',
  './ikona-192-maskable.png',
  './ikona-512-maskable.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(WERSJA_CACHE).then(function (cache) {
      return cache.addAll(PLIKI_SHELL);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (klucze) {
      return Promise.all(klucze.map(function (k) {
        if (k !== WERSJA_CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  // Żądania do API nigdy nie idą z cache — dane muszą być świeże.
  // Brak sieci obsługuje kolejka w index.html, nie service worker.
  if (e.request.method !== 'GET' || e.request.url.indexOf('script.google') !== -1) return;

  e.respondWith(
    caches.match(e.request).then(function (odp) {
      return odp || fetch(e.request).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
