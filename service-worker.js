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

var WERSJA_CACHE = 'ewidencja-v140';  /* v140 (17.09.2026, W-78): POPRAWKA ZAZNACZA SIĘ JAK RESZTA. Marek na żywej appce: „w momencie gdy go zaznaczam, nic się nie dzieje… zaznaczając «popraw na xxx L» nie widać, że to zaznaczyłem". Cały ekran importu działa według jednej zasady — zaznaczam ptaszkiem, wykonuję jednym guzikiem na dole (wariant 1 z makiety) — a pozycja „do poprawki" była jedynym elementem, który działał od razu przy dotknięciu. Teraz zaznacza się tak samo, liczy się do „zaznacz wszystkie", a guzik na dole MÓWI, co zrobi: „Dopisz do wpisów", „Popraw" albo „Dopisz i popraw". ⚠ Kolejność wykonania: NAJPIERW poprawki, potem dopisania — poprawka dostawia znacznik do tego samego wiersza, który dopisanie zaraz czyta. Guzik „Weź z Floty" przy wpisie w „Moich wpisach" (13d) bez zmian. Wymaga API v56. */  /* v139 (17.09.2026, W-77): SZKIELET ŁADOWANIA TANKOWAŃ. Zielona karta w „Moich wpisach" i ekran importu pokazują kształt tego, co za chwilę przyjdzie, zamiast pustki. ⚠ TYLKO wtedy, gdy naprawdę nie ma czego pokazać (zasada z Z-87): przy odświeżaniu listy, która JUŻ jest na ekranie, szkieletu nie ma wcale — decyzja Marka 17.09, żeby nie wróciło migotanie usunięte w W-70. Szkielet rysuje się OD RAZU i gaśnie na obu drogach, także przy braku sieci i przy zacięciu arkusza Floty — szkielet, który został na zawsze, obiecuje coś, co nie przyjdzie. W formularzu nowego wpisu świadomie go NIE ma (najkrótsze czekanie z trzech). Wymaga API v56. */  /* v138 (16.09.2026, W-76): STRONA I OBSŁUGA W TLE TO DWIE RÓŻNE WERSJE — i teraz appka sama to widzi. Marek: „a czemu to jest stary kod, a jednak wersje pokazuje nowe?". Bo stopka pokazywała numer WORKERA, a worker aktualizuje się pierwszy i niezależnie od strony. Telefon Anety miał nowy worker i starą stronę: numer nowy, a karty tankowań brak. Od teraz strona niesie własny `WERSJA_SHELL`, stopka pokazuje JEGO (a workera w nawiasie, gdy się różni), a przy rozjeździe pojawia się pomarańczowy pasek „Jest nowsza wersja aplikacji" z guzikiem „Odśwież teraz", który najpierw każe workerowi przejąć stronę, a dopiero potem przeładowuje. ⚠ OBA NUMERY PODBIJAMY RAZEM — pilnuje tego test. Wymaga API v56. */  /* v137 (16.09.2026, W-75): LINIJKA POD LICZNIKIEM PRZESTAJE SKAKAĆ. Marek z telefonu Anety: „pokazuje, że ostatni znany to 10.09, gdzie dziś jest 16.09 i wpis jest zrobiony; po odświeżeniu 16.09, a po wejściu w «moje wpisy» i z powrotem — znów 10.09". Obie liczby były POPRAWNE: bez historii leciał wariant „ostatni znany stan" z pulpitu, a z historią — „ostatni wpis PRZED wybranym dniem", czyli 10.09, bo dzisiejszy jest z definicji pomijany. Dwa różne zdania w jednym miejscu czytają się jak awaria. Teraz: formularz bierze historię z pamięci OD RAZU i odświeża w tle (zdanie nie skacze), każde zdanie NAZYWA dzień, względem którego liczy, a gdy na wybrany dzień wpis JUŻ JEST — mówimy to od razu, zamiast pozwolić wypełnić cały formularz i odmówić dopiero przy zapisie (E008). Wymaga API v56. */  /* v136 (16.09.2026, W-74): GUZIK MÓWI, ŻE ZOSTAŁ NACIŚNIĘTY. Marek: „przy wybieraniu popraw nie widać zmiany stanu «zaznaczone lub nie»". Pozycje z ptaszkiem zmieniają wygląd od razu, a „Popraw" i „Weź z Floty" wyglądały tak samo przed kliknięciem i po nim — więc człowiek nie wie, czy trafił, i klika drugi raz. Teraz guzik od razu się blokuje i pisze „Poprawiam…", po udanej poprawce „✓ Poprawione", a przy błędzie wraca do poprzedniego napisu. Doszedł też `:active` — na telefonie nie ma „hover", więc to jedyne, co daje poczucie trafienia w przycisk. Wymaga API v56. */  /* v135 (16.09.2026, W-72): CISZA, KTÓRA WYGLĄDAŁA JAK AWARIA. Aneta odświeżyła „Moje wpisy" i nie zobaczyła nic — wynik był POPRAWNY (tankowanie miała już wpisane ręcznie), ale brak karty wygląda tak samo jak brak połączenia. Teraz przy zerze czekających, a rozpoznanych ręcznych, jest spokojna linijka „Tankowania z Floty: nic nie czeka — 1 jest już wpisane w Twoich wpisach". Pokazuje się TYLKO wtedy, gdy naprawdę coś rozpoznaliśmy. Wymaga API v56. */  /* v134 (16.09.2026, W-71): TRZECI STAN — tankowanie wpisane ręcznie, ale Z LITERÓWKĄ. Marek na swoim Jumperze: wpisał 43,64 L, we Flocie jest 43,68 L, licznik ten sam — a appka proponowała DOPISANIE, czyli zrobiłaby z jednego tankowania dwa. Teraz pozycja pokazuje „masz wpisane: 43.64L / 122873km" i guzik „Popraw na 43,68 L" zamiast ptaszka. Poprawka podmienia JEDEN kawałek tekstu, reszty pola nie rusza, dostawia znacznik T-… i idzie do Historii zmian. Przy cudzym wpisie guzika nie ma, ale różnicę i tak MÓWIMY. Wymaga API v56. */  /* v133 (16.09.2026, pierwszy dzień na żywo — trzy rzeczy z głowy Marka): 1) W-70: tankowanie WPISANE RĘCZNIE nie proponuje się do importu. Marek: „pokazało mi, że mam tankowania do zaimportowania, mimo iż mam je wpisane ręcznie" — i tak jest dla całej historii, bo kolumna z numerami powstała dopiero teraz. Rozpoznajemy po LITRACH z wpisu z tego dnia, z krotnością; dzień w całości wpisany ręcznie znika z listy, ale ekran importu MÓWI, ile pominął. Zielona karta i czerwona linijka liczą tylko to, co naprawdę czeka. 2) LPG weszło do importu — Dacia Jogger jest jedynym pojazdem w bazie, który nim tankuje, i przez to nie widziała swoich tankowań. 3) Zapytanie o tankowania idzie PO danych ekranu, nie równolegle: Apps Script robi żądania jednego człowieka po kolei, a to otwiera drugi arkusz — stąd „długo się przeładowywała" i jednorazowe „poza siecią". Wymaga API v55. */  /* v132 (16.09.2026, W-68 pkt 13d): TANKOWANIE ZMIENIONE WE FLOCIE PO DOPISANIU. Na wpisie w „Moich wpisach" SZARA linijka „We Flocie jest dziś inaczej" z OBIEMA wartościami — swoją i flotową — plus guzik „Weź z Floty", ale TYLKO wtedy, gdy serwer umie trafić w kawałek o tym samym liczniku (licznik się nie zmienia, litry tak). Podmieniany jest JEDEN kawałek; ręczne dopiski kierowcy zostają nietknięte. Kto chce zostawić swoją wersję — nie klika (decyzja Marka 16.09). Tankowanie, którego we Flocie już nie ma, dostaje samą informację — kasowania nie proponujemy. Tylko miesiące OTWARTE. Szara, nie czerwona: to nie błąd kierowcy, tylko dwie wersje tej samej liczby. Wymaga API v54. */  /* v131 (16.09.2026, W-68 etap 3): DRUGA DROGA + PRZYPOMNIENIE. 1) W formularzu NOWEGO wpisu podpowiedź „we Flocie jest tankowanie z tego dnia" i guzik „Wstaw do formularza": wypełnia litry, licznik tankowania i budowę, ZOSTAJE w formularzu (zapis robi dopiero „Zapisz wpis"), a „Cofnij wstawienie" zdejmuje dokładnie to, co wstawiliśmy. Zmiana daty unieważnia wstawienie. ⚠ Stanu licznika wpisu NIE wypełniamy — to stan PORANNY, a tankowanie jest z połowy dnia (pkt 11); zamiast tego linijka pod polem mówi, co licznik pokazywał przy tankowaniu. 2) W karcie „zgłoszony jako zamknięty" czerwona linijka „w tym miesiącu czeka jeszcze N tankowań tej maszyny — dopisz je i zgłoś miesiąc ponownie" (pomysł Marka 16.09). Czerwień z istniejącego wzorca .wpis-poprawa. Przypomnienie jest WYŁĄCZNIE wewnątrz maszyny — nigdy na ekranie wyboru pojazdu (decyzja Marka, dwa razy). 3) Karta „N tankowań czeka" może być sprzed minuty, lista po kliknięciu „Importuj" — nigdy (pkt 14, poprawka 2). Wymaga API v53. */  /* v130 (16.09.2026, W-68 etap 2): TANKOWANIA Z FLOTY SAME WCHODZĄ DO WPISÓW. W „Moich wpisach" zielona karta „N tankowań czeka", a pod nią ekran importu: dzień jako RAMKA (zielona = wpis jest i mogę go poprawić, pomarańczowa = wpisu nie ma albo jest cudzy), zaznaczanie ptaszkiem i jeden guzik „Dopisz do wpisów". Pozycja, której kierowca nie może ruszyć, jest WIDOCZNA i wyszarzona z powodem — nie schowana (decyzja Marka 14.09: schowana znika bez śladu). Pokazujemy też, KTO tankował, gdy to nie ten, kto patrzy — bo tankuje często kto inny niż autor wpisu. Wymaga API v52. ⚠ Import jest poprawką wpisu, więc cofa „Zamykam miesiąc" (W-55). Zacięcie arkusza Floty nie rusza „Moich wpisów" — karty po prostu nie ma. */  // 14.09.2026 W-67: karta „sierpien zgloszony jako zamkniety" znika po ZAMKNIECIU miesiaca i zdanie w karcie mowi to wprost („gdy Marek zamknie miesiac"), zamiast obiecywac archiwizacje. Zgloszenie Marka 14.09: zamknal i zarchiwizowal 08.2026 w obu appkach — we Flocie karta zniknela, w Ewidencji zostala. Powod byl po stronie backendu Ewidencji (`zgloszoneMiesiace_` jako jedyna funkcja nie odsiewala miesiecy zamknietych) — poprawione w API v50. Archiwizacja i tak WYMAGA wczesniejszego zamkniecia, wiec „znika przy zamknieciu" znaczy „najpozniej przy archiwizacji".   // 13.09.2026 W-45: naglowek miesiaca na liscie wpisow pokazuje ROK TYLKO wtedy, gdy inny niz biezacy („PAZDZIERNIK”, ale „GRUDZIEN 2025”) — „PAZDZIERNIK 2026” potrzebowal 353 px przy 328 px do dyspozycji i podpis „szczegoly” spadal pod nazwe miesiaca (tak samo dzis wrzesien, czerwiec i grudzien). Podsumowanie i wybierak miesiaca maja rok dalej.  // 04.09.2026 W-55: wraca umowiony tekst „jesli cos dopiszesz ALBO POPRAWISZ, zgloszenie sie cofnie” — bo od API v49 poprawka i anulowanie wpisu tez cofaja deklaracje; stan po obu akcjach wraca w odpowiedzi, wiec pulpit zmienia sie od razu. Wymaga API v49.  // 04.09.2026 W-53/W-54: tytul 15 px i jedno slownictwo („Sierpien 2026 zgloszony jako zamkniety”); `stanPo` z API v48 niesie `zgloszoneMiesiace`, wiec karta znika od razu po dopisaniu wpisu; dialog „Zamykam miesiac” i ekran „Wpis dodany” mowia, ze zgloszenie sie cofa. Wymaga API v48.  // 03.09.2026 W-52b: zielona ramka + zielony ptaszek zamiast pastylki; rozwijanie pigulka 'szczegoly' jak przy wpisach.  // 03.09.2026: W-52 — karta „masz zgłoszone" zwinięta do jednej linijki (plakietka + tytuł + „rozwiń"), pełny tekst dopiero po dotknięciu, na końcu „Komunikat zniknie, gdy Marek zarchiwizuje miesiąc".  // 02.09.2026: W-46/W-47 — pulpit mówi, co już zgłoszone („Masz zgłoszone: lipiec i sierpień”), a w ewidencji także KTO zgłosił i czy maszyna ma opiekuna. Wymaga API v47.

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
/* ⚠ W-76 (16.09.2026) — CZEGO TEN MECHANIZM NIE ŁAPAŁ.
   Powyższe rozumowanie jest nadal słuszne: wersję CACHE musi podawać worker.
   Ale front pokazywał TĘ liczbę jako wersję aplikacji — a to dwie różne rzeczy.
   Worker aktualizuje się PIERWSZY i niezależnie, więc telefon potrafi mieć nowy
   worker i starą stronę: stopka pokazuje nowy numer, a kierowca patrzy na kod
   sprzed dwóch wersji. Tak było 16.09 na telefonie Anety — nie widziała karty
   tankowań, choć serwer to tankowanie widział.
   Od teraz strona niesie WŁASNY numer (`WERSJA_SHELL` w index.html) i sama
   porównuje go z tym, co odda worker. Ten komunikat zostaje bez zmian — doszedł
   tylko `przejmij`, żeby guzik „Odśwież teraz" naprawdę wymieniał stronę,
   a nie podawał jej z powrotem tej samej z pamięci telefonu. */
self.addEventListener('message', function (e) {
  if (!e.data) return;
  if (e.data.typ === 'przejmij') {
    self.skipWaiting();
    self.clients.claim();
    return;
  }
  if (e.data.typ !== 'wersja') return;
  var odp = { typ: 'wersja', wersja: WERSJA_CACHE };
  if (e.ports && e.ports[0]) e.ports[0].postMessage(odp);
  else if (e.source) e.source.postMessage(odp);
});
