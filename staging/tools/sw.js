/* MLP Tools service worker — network-first for app shell, fallback to cache. */
const CACHE = 'mlp-tools-v32';
const SHELL = [
  './',
  './index.html',
  './quotes.html',
  './customers.html',
  './customer.html',
  './projects.html',
  './project.html',
  './sign.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
  './css/tools.css',
  './js/app.js',
  './js/openai.js',
  './js/supabase-client.js',
  './js/signature-pad.js',
  './js/config.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never cache cross-origin (Supabase, OpenAI, fonts/cdn). Let them go through.
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML/JS/CSS so updates roll out, cache as fallback.
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
