/* Financely Service Worker — offline app shell + safe updates */
const CACHE = 'financely-v3';
const ASSETS = [
  './', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './css/styles.css',
  './js/i18n.js', './js/state.js', './js/charts.js', './js/ui.js', './js/calc.js',
  './js/expenses.js', './js/subscriptions.js', './js/income.js', './js/goals.js',
  './js/budgets.js', './js/dashboard.js', './js/stats.js', './js/settings.js', './js/app.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

/* same-origin: stale-while-revalidate; cross-origin (fonts): default network */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req)
      .then(res => { if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone()); return res; })
      .catch(() => null);
    return cached || (await network) || (await cache.match('./index.html'));
  })());
});
