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

const CACHE_NAME = 'sessions-garden-v162';

/**
 * Static assets to precache on install (cache-first strategy).
 * These have no redirect issues because they are fetched as sub-resources,
 * not navigations, so cache.add() works fine for them.
 */
const PRECACHE_URLS = [
  '/manifest.json',
  '/assets/tokens.css',
  '/assets/app.css',
  '/assets/jszip.min.js',
  '/assets/backup.js',
  '/assets/shared-chrome.js',
  '/assets/app.js',
  '/assets/db.js',
  '/assets/i18n.js',
  '/assets/i18n-en.js',
  '/assets/i18n-he.js',
  '/assets/i18n-de.js',
  '/assets/i18n-cs.js',
  '/assets/overview.js',
  '/assets/sessions.js',
  '/assets/crop.js',
  '/assets/add-client.js',
  '/assets/add-session.js',
  '/assets/reporting.js',
  '/assets/disclaimer.js',
  '/assets/license.js',
  '/assets/i18n-disclaimer.js',
  '/assets/fonts/Rubik-Regular.woff2',
  '/assets/fonts/Rubik-SemiBold.woff2',
  '/assets/fonts/Rubik-Bold.woff2',
  '/assets/branding/logo-512.png',
  '/assets/illustrations/garden.png',
  '/assets/illustrations/watering-can.png',
  '/assets/demo.js',
  '/assets/demo-seed.js',
  '/assets/demo-seed-data.json',
  '/assets/demo-hints.js',
  '/assets/demo.css',
  '/assets/landing.css',
  '/assets/landing.js',
  '/assets/globe-lang.css',
  '/assets/globe-lang.js',
  '/assets/settings.js',
  '/assets/pdf-export.js',
  '/assets/md-render.js',
  '/assets/jspdf.min.js',
  '/assets/bidi.min.js',
  '/assets/fonts/heebo-base64.js',
  '/assets/fonts/heebo-bold-base64.js',
  '/assets/snippets-seed.js',
  '/assets/snippets.js'
];

/**
 * HTML pages to precache for offline navigation support.
 *
 * CF Pages "pretty URLs" serves /page.html at the extensionless path /page,
 * returning a 301 redirect when the .html extension is requested.
 * We MUST NOT use cache.add() for these, because cache.add() follows the
 * redirect and stores a response with redirected:true — browsers reject
 * such responses when served for navigation requests.
 *
 * Instead we use fetch(url, { redirect: 'follow' }) + cache.put(url, response)
 * to store the final 200 response under the extensionless key we control.
 *
 * landing.html is intentionally excluded — it does not register the SW
 * and must not be served from cache (it is the pre-license entry point).
 */
const PRECACHE_HTML = [
  '/',
  '/license',
  '/reporting',
  '/sessions',
  '/add-session',
  '/add-client',
  '/demo',
  '/disclaimer',
  '/disclaimer-en',
  '/disclaimer-he',
  '/disclaimer-cs',
  '/datenschutz',
  '/datenschutz-en',
  '/datenschutz-he',
  '/datenschutz-cs',
  '/impressum',
  '/impressum-en',
  '/impressum-he',
  '/impressum-cs',
  '/settings'
];

/**
 * Fetch and cache a single HTML URL using the redirect-safe pattern.
 * Follows any CF Pages redirect and stores the final 200 response
 * under the requested URL key (not the redirect destination URL).
 */
function precacheHtml(cache, url) {
  return fetch(url, { redirect: 'follow' }).then(function (response) {
    if (response && response.status === 200) {
      return cache.put(url, response);
    }
    console.warn('SW: Could not precache HTML (non-200):', url, response && response.status);
  }).catch(function (err) {
    console.warn('SW: Could not precache HTML:', url, err.message);
  });
}

/**
 * Install event: precache all static assets and HTML pages.
 */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Static assets: cache.add() is fine (no redirect issues for sub-resources)
      var staticPromises = PRECACHE_URLS.map(function (url) {
        return cache.add(url).catch(function (err) {
          console.warn('SW: Could not precache', url, err.message);
        });
      });

      // HTML pages: fetch+put pattern to avoid caching redirected responses
      var htmlPromises = PRECACHE_HTML.map(function (url) {
        return precacheHtml(cache, url);
      });

      return Promise.allSettled(staticPromises.concat(htmlPromises));
    })
  );
  // Activate immediately so users get the latest assets without waiting
  // for all tabs to close. Combined with clients.claim() in activate,
  // this ensures updates take effect on the next navigation.
  self.skipWaiting();
});

/**
 * Activate event: delete outdated caches, then take control of all clients.
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
      return self.clients.claim();
    })
  );
});

/**
 * Fetch event handler.
 *
 * Navigation requests (page loads, link clicks):
 *   Network-first with cache fallback. This gives users the latest HTML
 *   when online, and falls back to the precached version when offline.
 *   /landing is excluded — it is not an app page and has no SW registration.
 *
 * Static sub-resources (CSS, JS, images, fonts):
 *   Cache-first. Served instantly from cache; fetched from network only on
 *   first access or after a cache version bump.
 *
 * Non-GET and cross-origin requests: pass through unchanged.
 *
 * This does NOT intercept IndexedDB operations — those happen outside
 * the network layer entirely and are unaffected by this service worker.
 */
self.addEventListener('fetch', function (event) {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  // Do not intercept cross-origin requests (e.g. Lemon Squeezy API)
  if (url.origin !== self.location.origin) return;

  // Navigation requests: network-first with cache fallback.
  // Excludes /landing — not an app page, not cached by SW.
  if (event.request.mode === 'navigate') {
    if (url.pathname === '/landing' || url.pathname === '/landing.html') {
      // Let the browser handle landing.html directly — no SW involvement
      return;
    }

    event.respondWith(
      fetch(event.request).then(function (response) {
        // Network succeeded — update cache with fresh response (redirect-safe)
        // Normalize to extensionless key to match precache entries
        if (response && response.status === 200) {
          var responseToCache = response.clone();
          var cacheKey = url.pathname || '/';
          if (cacheKey.endsWith('.html')) {
            cacheKey = cacheKey.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
          }
          if (cacheKey === '') cacheKey = '/';
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(cacheKey, responseToCache);
          });
        }
        return response;
      }).catch(function () {
        // Offline — serve from cache
        // Links use .html extensions (e.g. ./sessions.html) but CF Pages
        // serves them at extensionless paths, so our cache keys are
        // extensionless. Strip .html and ./index.html to match cache keys.
        var pathname = url.pathname || '/';
        if (pathname.endsWith('.html')) {
          pathname = pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
        }
        if (pathname === '') pathname = '/';

        return caches.open(CACHE_NAME).then(function (cache) {
          return cache.match(pathname).then(function (cached) {
            if (cached) return cached;
            // Last resort: serve root index for unknown paths
            return cache.match('/');
          });
        });
      })
    );
    return;
  }

  // Static sub-resources: cache-first strategy
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        return cached;
      }
      // Not in cache — fetch from network and cache the result
      return fetch(event.request).then(function (response) {
        // Only cache successful, non-redirected 200 responses
        if (response && response.status === 200 && response.type === 'basic' && !response.redirected) {
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
