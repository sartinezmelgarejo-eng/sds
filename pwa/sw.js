const CACHE='sds-v3';
const ASSETS=[
  './monitoring.html',
  'https://unpkg.com/react@18.2.0/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js',
  'https://unpkg.com/prop-types@15.8.1/prop-types.min.js',
  'https://unpkg.com/recharts@2.7.3/umd/Recharts.js',
  'https://unpkg.com/@babel/standalone@7.24.0/babel.min.js'
];

// Only cache external CDN assets — never own-site HTML/JS.
// This avoids stale libreria-mapa.html on iOS after a code fix.
function shouldCache(url) {
  return /^https:\/\/(unpkg|cdn\.jsdelivr|cdnjs\.cloudflare)\.com\//.test(url);
}

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch',e=>{
  const url = e.request.url;
  e.respondWith(
    fetch(e.request).then(r=>{
      if (shouldCache(url)) {
        const clone=r.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone));
      }
      return r;
    }).catch(()=>caches.match(e.request))
  );
});
