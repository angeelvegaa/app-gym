// Service worker: cache-first sobre el shell de la app, versionado.
// Sube CACHE_VERSION en cada despliegue para que el móvil recoja los cambios.

const CACHE_VERSION = 'gym-v9';

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/app.js',
  './js/plan.js',
  './js/storage.js',
  './js/state.js',
  './js/schedule.js',
  './js/suggestions.js',
  './js/ui/components.js',
  './js/ui/today.js',
  './js/ui/session.js',
  './js/ui/history.js',
  './js/ui/exercise.js',
  './js/ui/settings.js',
  './js/ui/routine.js',
  './js/ui/onboarding.js',
  './js/ui/plan-editor.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
