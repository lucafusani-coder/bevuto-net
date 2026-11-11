/* Service worker Bevuto.net
   - Pagina: prima la rete (contenuti sempre aggiornati), copia in cache solo se offline.
   - Icone, immagini del sito e font: cache.
   - Supabase e ogni richiesta non-GET: mai toccati, vanno sempre in rete. */
var VERSION = 'bevuto-v6';
var PRECACHE = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(PRECACHE); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Pagine: rete prima, cache come ripiego offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put('/', copy); });
        return res;
      }).catch(function () { return caches.match('/'); })
    );
    return;
  }

  // File statici del sito e Google Fonts: cache prima
  var sameOriginStatic = url.origin === self.location.origin && /\.(png|jpg|jpeg|webp|svg|ico|json)$/.test(url.pathname);
  var fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (sameOriginStatic || fonts) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          if (res.ok || res.type === 'opaque') {
            var copy = res.clone();
            caches.open(VERSION).then(function (c) { c.put(req, copy); });
          }
          return res;
        });
      })
    );
  }
  // Tutto il resto (Supabase, foto esterne): comportamento normale del browser
});
