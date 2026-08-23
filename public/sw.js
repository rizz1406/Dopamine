// DOPAMINE service worker — offline-first arcade.
const CACHE = 'dopamine-v3';
const CORE = [
  '/', '/index.html', '/css/style.css',
  '/js/app.js', '/js/data.js', '/js/rng.js', '/js/store.js', '/js/audio.js',
  '/js/confetti.js', '/js/share.js', '/js/ads.js', '/js/reel-logic.js',
  '/js/hl-logic.js', '/js/word-logic.js', '/js/timeline-logic.js', '/js/flag-logic.js',
  '/js/words.js', '/js/flags.js', '/js/juice.js', '/js/scores.js',
  '/js/games/reel.js', '/js/games/higherlower.js', '/js/games/reflex.js',
  '/js/games/memory.js', '/js/games/timeline.js', '/js/games/word.js',
  '/js/games/flagrush.js', '/js/games/leaderboard.js', '/js/games/admin.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // external (fonts, flags): network-first, cache fallback
  if (url.origin !== location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // navigations: network-first with offline fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => { caches.open(CACHE).then(c => c.put('/', res.clone())); return res; })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // same-origin assets: cache-first, revalidate in background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
