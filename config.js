/**
 * EWIDENCJA FLOTY RINKON — konfiguracja PWA
 *
 * Ten plik jest jedynym miejscem, gdzie trzymamy adres API i token.
 * Po każdym NOWYM wdrożeniu Apps Script (Wdróż → Nowe wdrożenie) adres
 * się zmienia — trzeba go tu podmienić i podbić WERSJA_CACHE
 * w service-worker.js, inaczej telefony będą dalej używać starego pliku.
 */

var KONFIG = {
  // Adres wdrożenia API.gs (kończy się na /exec).
  URL_API: 'https://script.google.com/macros/s/AKfycbyX3LL708ZTuoIKmGRKOBsT54C5SJRS334hiivzFYdZGq51h8bbkbQV9YNHpLMw85v4/exec',

  // Musi być identyczny z wartością TOKEN_API w zakładce Ustawienia arkusza.
  TOKEN: 'eEGbvkyMABqVQdZZEVPJLSkGwUdkjBxN',

  // Domyślna paleta: 'grafit' (wariant C) albo 'burgund' (wariant D).
  PALETA_DOMYSLNA: 'grafit'
};
