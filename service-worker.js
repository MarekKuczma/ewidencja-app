/**
 * EWIDENCJA FLOTY RINKON — service worker
 *
 * ŻELAZNA ZASADA: każda zmiana czegokolwiek w folderze pwa/ wymaga
 * podbicia WERSJA_CACHE poniżej. Bez podbicia telefony będą uparcie
 * pokazywać starą wersję aplikacji, a Ty stracisz godzinę na szukanie
 * błędu, którego nie ma.
 *
 * W-02 (01.08.2026): wzorzec ujednolicony z aplikacją flota — obie appki
 * miały tylko połowę tego samego rozwiązania. Instalacja pojedynczych
 * plików (poniżej) już była tu zrobiona dobrze; dołożone: cichy odświeżacz
 * w tle (stale-while-revalidate) przy każdym żądaniu app shellu,
 * przeniesiony z floty — wcześniej raz zapisany plik zostawał w cache aż
 * do podbicia WERSJA_CACHE, bez prób odświeżenia w międzyczasie.
 */

var WERSJA_CACHE = 'ewidencja-v113';  // 31.08.2026: W-43c korekta optyczna — plakietka i strzałka podniesione o 2 px, bo wersaliki nazwy miesiąca nie mają ogonków i ich środek masy siedzi wyżej niż etykiet

// Przekaźnik kodu kierowcy między kartą Safari a zainstalowaną ikonką
// (D69, patrz też index.html — NAZWA_RELAY_KODU). NIE kasować przy
// sprzątaniu starych cache — to jedyne miejsce, w którym kod „przeżywa"
// między kontekstami na iOS; musi zostać dokładnie ta sama nazwa co w
// index.html.
var NAZWA_RELAY_KODU = 'ewidencja-kod-relay';

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

/**
 * Instalacja: pliki cache'ujemy POJEDYNCZO, nie przez cache.addAll().
 *
 * addAll() jest „wszystko albo nic": wystarczy, że jeden plik odpowie 404
 * (literówka w nazwie, nie wgrana ikona) i cała instalacja się wywraca, a
 * aplikacja zostaje BEZ trybu offline — przy czym nic tego nie sygnalizuje,
 * bo online działa normalnie. Przy aplikacji, której sens polega na tym, że
 * da się wpisać bez zasięgu na budowie (D50), to zbyt kruche.
 */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(WERSJA_CACHE).then(function (cache) {
      return Promise.all(PLIKI_SHELL.map(function (plik) {
        return cache.add(plik).catch(function (err) {
          console.warn('[SW] Nie udało się zapisać w cache:', plik, err);
        });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (klucze) {
      return Promise.all(klucze.map(function (k) {
        // Przekaźnik kodu przeżywa sprzątanie — inaczej kasowalibyśmy
        // kierowcy kod przy każdej aktualizacji aplikacji.
        if (k !== WERSJA_CACHE && k !== NAZWA_RELAY_KODU) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var zadanie = event.request;

  // Żądania do API i wszystko spoza naszej domeny: tylko sieć
  // (network-only), nigdy z cache. Brak sieci obsługuje kolejka
  // w index.html, nie service worker. (W-02: sprawdzenie po originie,
  // jak we flocie, zamiast dopasowania fragmentu URL-a „script.google" —
  // ogólniejsze, zadziała też, gdyby domena API kiedyś się zmieniła.)
  if (zadanie.method !== 'GET' ||
      new URL(zadanie.url).origin !== self.location.origin) {
    return;
  }

  // App shell: cache-first + ciche odświeżenie kopii w tle (W-02,
  // przeniesione z floty) — kolejne otwarcie appki dostaje świeży plik,
  // bez czekania na podbicie WERSJA_CACHE.
  event.respondWith(
    caches.match(zadanie, { ignoreSearch: true }).then(function (zCache) {
      var zSieci = fetch(zadanie).then(function (odpowiedz) {
        if (odpowiedz && odpowiedz.ok) {
          var kopia = odpowiedz.clone();
          caches.open(WERSJA_CACHE).then(function (cache) {
            cache.put(zadanie, kopia);
          });
        }
        return odpowiedz;
      }).catch(function () {
        return zCache || caches.match('./index.html');
      });
      return zCache || zSieci;
    })
  );
});

/* W-22 (20.08.2026): aplikacja pyta workera o jego wersję.
   POWÓD: 20.08 nie dało się rozstrzygnąć, czy zgłoszony błąd to wada kodu,
   czy telefon uruchamia starą wersję z cache — appka nigdzie nie pokazywała,
   co właściwie wykonuje. Wersję MUSI podawać sam worker: stała odczytana we
   froncie mówiłaby o kodzie, który właśnie działa, a nie o tym, który siedzi
   w cache — czyli mijałaby się z celem dokładnie w sytuacji, dla której to
   robimy. `caches.keys()` też nie wystarcza: przy aktualizacji potrafią
   istnieć obok siebie dwa cache i nie widać, który jest czynny. */
self.addEventListener('message', function (e) {
  if (!e.data || e.data.typ !== 'wersja') return;
  var odp = { typ: 'wersja', wersja: WERSJA_CACHE };
  if (e.ports && e.ports[0]) e.ports[0].postMessage(odp);
  else if (e.source) e.source.postMessage(odp);
});
