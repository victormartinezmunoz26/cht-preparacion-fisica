const CACHE = 'cht-v' + Date.now();
const ASSETS = ['/', '/index.html'];

// Instal·lació: guarda els fitxers a la cache
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting(); // Activa el nou SW immediatament
});

// Activació: elimina caches antigues
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // Pren control de totes les pestanyes obertes
});

// Fetch: xarxa primer, cache com a fallback
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Guarda la resposta nova a la cache
        const resClone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, resClone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
