/* Network-first: HTML/CSS/JS hamesha naya milta hai, isliye style1.css?v=2 jaisa version nahi lagana padega.
   Offline hone par last saved copy dikhti hai. */
const CACHE = 'sstc-v1';
const CORE = ['./', './index.html', './style1.css', './sstc-enhance.js', './manifest.json', './Logo.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  if (req.headers.has('range')) return; // video streaming ko na chhedein
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
