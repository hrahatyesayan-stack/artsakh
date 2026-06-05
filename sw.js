/* Արцախ · Artsakh — service worker (installable + offline) */
const CACHE = 'artsakh-v5';
const CORE = [
  './', 'index.html', 'quiz.html', 'runner.html', 'story.html', 'game-map.html', 'memory-match.html', 'timeline-game.html', '404.html',
  'manifest.webmanifest', 'img/icon-192.png', 'img/icon-512.png', 'img/icon-maskable-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
      .catch(() => {})            // если что-то не докачалось — ставим SW всё равно
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.map(k => k !== CACHE ? caches.delete(k) : null)))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // HTML/навигация — сеть в приоритете (свежий контент), оффлайн → из кэша
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(resp => { const cp = resp.clone(); caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {}); return resp; })
        .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }

  // Остальное (картинки, css, js, тайлы карты) — кэш в приоритете, потом сеть
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(resp => {
      const url = req.url;
      const ok = resp && (resp.status === 200 || resp.type === 'opaque');
      const cacheable = url.startsWith(self.location.origin) ||
        /upload\.wikimedia\.org|unpkg\.com|basemaps\.cartocdn\.com|cartocdn\.com/.test(url);
      if (ok && cacheable) { const cp = resp.clone(); caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {}); }
      return resp;
    }).catch(() => caches.match(req)))
  );
});
