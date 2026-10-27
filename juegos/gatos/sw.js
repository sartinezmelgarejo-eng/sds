// Service worker (generado por scripts/build_sw.py — no editar a mano): precachea todo el juego para jugar sin internet.
// Estrategia: caché primero. Cada despliegue genera una versión nueva del SW que vuelve a bajar todo (sin caché HTTP) y borra las cachés viejas.
const CACHE = 'gatos-65dbdbaa61';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/omi-eye.jpg',
  './assets/cats/eyes.json',
  './assets/cats/mako.png',
  './assets/cats/miu.png',
  './assets/cats/omi-up.png',
  './assets/cats/omi.png',
  './assets/fonts/LilitaOne-Regular.ttf',
  './assets/fonts/LuckiestGuy-Regular.ttf',
  './icons/apple-touch-icon.png',
  './icons/favicon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './levels/1-1.json',
  './levels/1-2.json',
  './levels/1-3.json',
  './levels/1-4.json',
  './levels/1-5.json',
  './levels/1-6.json',
  './levels/1-7.json',
  './levels/1-8.json',
  './levels/2-1.json',
  './levels/2-2.json',
  './levels/2-3.json',
  './levels/2-4.json',
  './levels/2-5.json',
  './levels/2-6.json',
  './levels/2-7.json',
  './levels/2-8.json',
  './levels/3-1.json',
  './levels/3-2.json',
  './levels/3-3.json',
  './levels/3-4.json',
  './levels/3-5.json',
  './levels/3-6.json',
  './src/art.js',
  './src/background.js',
  './src/camera.js',
  './src/config.js',
  './src/fx.js',
  './src/main.js',
  './src/menus.js',
  './src/sfx.js',
  './src/sling.js',
  './src/ui.js',
  './vendor/matter.min.js',
  './vendor/pixi.min.mjs'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('gatos-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, {ignoreSearch: true});
    const net = fetch(e.request).then(r => { if (r.ok && !hit) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
