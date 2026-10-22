// ==============================================================================
// FITPULSE - SERVICE WORKER (OFFLINE PWA CACHE)
// ==============================================================================

const CACHE_NAME = 'fitpulse-v1.1.4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/layout.css',
  './css/views.css',
  './js/config.js',
  './js/app.js',
  './js/db/indexedDB.js',
  './js/db/supabaseClient.js',
  './js/db/syncManager.js',
  './js/services/authService.js',
  './js/services/biometrics.js',
  './js/services/exerciseCatalog.js',
  './js/services/workoutService.js',
  './js/services/routineService.js',
  './js/services/classRoomService.js',
  './js/services/danceAudioService.js',
  './js/services/wakeLockService.js',
  './js/ui/router.js',
  './js/ui/toast.js',
  './js/ui/charts.js',
  './js/ui/sound.js',
  './js/ui/views/authGateView.js',
  './js/ui/views/dashboardView.js',
  './js/ui/views/profileView.js',
  './js/ui/views/workoutView.js',
  './js/ui/views/historyView.js',
  './js/ui/views/catalogView.js',
  './js/ui/views/settingsView.js',
  './js/ui/views/superAdminView.js',
  './js/ui/views/trainerHubView.js',
  './js/ui/views/liveRoomAthleteView.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching assets estáticos de FitPulse...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antiguo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // No interceptar llamadas API a Supabase ni OAuth de Google
  if (url.hostname.includes('supabase.co') || url.hostname.includes('googleapis.com') || url.hostname.includes('accounts.google.com')) {
    return;
  }

  // Estrategia Network-First con fallback a Cache para que los updates se vean inmediatamente
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback a caché local cuando no hay conexión
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
