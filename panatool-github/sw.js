/* PanaTool · funcionamiento sin conexión
   Primero intenta la red (para recibir siempre la última versión) y, si no
   hay conexión o tarda más de 3 segundos, abre la copia guardada.
   Las llamadas a la nube (Supabase) no pasan por aquí. */
const CACHE = 'panatool-gh1';
const ARCHIVOS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request;
  const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin || u.pathname.includes('/nube/')) return;
  const guardado = () => caches.match(r, { ignoreSearch: true })
    .then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : undefined));
  e.respondWith(new Promise(resolver => {
    let listo = false;
    const fin = x => { if (!listo && x) { listo = true; resolver(x); } };
    const espera = setTimeout(() => guardado().then(fin), 3000);
    fetch(r).then(res => {
      if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(r, copia)); }
      clearTimeout(espera); fin(res);
    }).catch(() => { clearTimeout(espera); guardado().then(m => fin(m || Response.error())); });
  }));
});
