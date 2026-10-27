/* Mis Finanzas: caché para que la app abra sin internet.
   Si algún día cambias estos archivos y quieres forzar la actualización, sube un número a VERSION. */
const VERSION = 'v2';
const CACHE = 'mis-finanzas-' + VERSION;
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const EXTRA = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    await Promise.all(EXTRA.map((u) => c.add(new Request(u, { mode: 'cors' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  /* El tipo de cambio siempre se pide a internet, nunca se sirve de la caché del navegador. */
  if (/(^|\.)ecb\.europa\.eu$|(^|\.)frankfurter\.dev$/.test(u.hostname)) return;

  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then((res) => {
        if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', cp)); }
        return res;
      }).catch(() => caches.match('./index.html').then((m) => m || caches.match('./')))
    );
    return;
  }

  e.respondWith(caches.match(r).then((hit) => {
    const net = fetch(r).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); }
      return res;
    }).catch(() => hit);
    e.waitUntil(net.catch(() => {}));
    return hit || net;
  }));
});
