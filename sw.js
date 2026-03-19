/**
 * sw.js — Sessions Garden Service Worker
 *
 * CRITICAL SAFETY NOTE:
 * This service worker handles ONLY the HTTP network/cache layer.
 * It CANNOT and DOES NOT touch IndexedDB.
 * All client data stored in IndexedDB is completely independent of this
 * service worker and is NEVER at risk from service worker installs,
 * updates, or deletions. Only static asset HTTP caches are managed here.
 */

const CACHE_NAME = 'sessions-garden-v12';

/**
 * All static assets to precache on install.
 * Update CACHE_NAME (e.g. 'sessions-garden-v2') to trigger a cache refresh
 * for all users on their next visit.
 */
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/sessions.html',
  '/add-client.html',
  '/add-session.html',
  '/reporting.html',
  '/disclaimer.html',
  '/license.html',
  '/landing.html',
  '/manifest.json',
  '/assets/tokens.css',
  '/assets/app.css',
  '/assets/jszip.min.js',
  '/assets/backup.js',
  '/assets/app.js',
  '/assets/db.js',
  '/assets/i18n.js',
  '/assets/i18n-en.js',
  '/assets/i18n-he.js',
  '/assets/i18n-de.js',
  '/assets/i18n-cs.js',
  '/assets/overview.js',
  '/assets/sessions.js',
  '/assets/add-client.js',
  '/assets/add-session.js',
  '/assets/reporting.js',
  '/assets/disclaimer.js',
  '/assets/license.js',
  '/assets/i18n-disclaimer.js',
  '/assets/fonts/Rubik-Variable.woff2',
  '/demo.html',
  '/assets/demo.js',
  '/assets/demo-seed.js',
  '/assets/demo-seed-data.json',
  '/assets/demo-hints.js',
  '/assets/demo.css',
  '/assets/landing.css',
  '/assets/landing.js'
];

/**
 * Install event: precache all static assets.
 * Note: landing.js is not included here as landing.html (plan 03) is not yet
 * created. Add '/assets/landing.js' to PRECACHE_URLS when plan 03 is complete.
 */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // addAll fails if any URL 404s — use individual adds to be resilient
      // for URLs that may not exist yet (e.g. landing.html before plan 03)
      return Promise.allSettled(
        PRECACHE_URLS.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('SW: Could not precache', url, err.message);
          });
        })
      );
    })
  );
  // Activate immediately so users get the latest assets without waiting
  // for all tabs to close. Combined with clients.claim() in activate,
  // this ensures updates take effect on the next navigation.
  self.skipWaiting();
});

/**
 * Activate event: delete outdated caches, then take control of all clients.
 * Called when all tabs using the previous SW version are closed.
 */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    }).then(function () {
      // Claim all clients so this SW controls pages loaded without it
      return self.clients.claim();
    })
  );
});

/**
 * Fetch event: cache-first strategy for GET requests only.
 * - GET requests: serve from cache, fall back to network (and update cache).
 * - Non-GET requests: pass through to network without caching.
 *
 * This does NOT intercept IndexedDB operations — those happen outside
 * the network layer entirely and are unaffected by this service worker.
 */
self.addEventListener('fetch', function (event) {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Do not intercept cross-origin requests (e.g. Lemon Squeezy API)
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        return cached;
      }
      // Not in cache — fetch from network
      return fetch(event.request).then(function (response) {
        // Cache successful responses for future use
        if (response && response.status === 200 && response.type === 'basic') {
          var responseToCache = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});
