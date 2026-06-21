/**
 * Regression guard — the service worker must precache static assets with
 * { cache: 'reload' } so a new CACHE_NAME never promotes a STALE, HTTP-cached
 * asset into a "fresh" cache.
 *
 * Incident (2026-06-21): installed (Add to Dock) web apps reported the new
 * CACHE_NAME via caches.keys() but still ran OLD code, because the previous
 * precache used `cache.add(url)` (default cache mode) which reused a 4h
 * HTTP-cached copy of pdf-export.js. Safari (fresh fetch) was fine; the web app
 * served old code from its own cache. `cache.add` -> `fetch(url,{cache:'reload'})`.
 *
 * NOTE: this is a SHAPE guard, not a behavior test. The actual behavior (precache
 * bypasses the HTTP cache) depends on real Cache API + HTTP-cache semantics that
 * the project's zero-dependency vm/jsdom harness cannot exercise; it is verified
 * end-to-end by checking the deployed sw.js + an installed-web-app relaunch. This
 * guard only prevents a silent revert to the stale-prone `cache.add(url)` form.
 *
 * Run: node tests/sw-precache-cache-reload.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');

var sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

var failed = 0;
function check(name, cond) {
  if (cond) { console.log('[PASS] ' + name); }
  else { failed++; console.error('[FAIL] ' + name); }
}

// The static precache must force a network fetch that bypasses the HTTP cache.
check("static precache uses fetch(url, { cache: 'reload' })",
  /fetch\(\s*url\s*,\s*\{\s*cache:\s*['"]reload['"]\s*\}\s*\)/.test(sw));

// The stale-prone form must NOT come back for the static precache loop.
check("does not precache static assets via bare cache.add(url)",
  !/cache\.add\(\s*url\s*\)/.test(sw));

// CACHE_NAME must be bumped past the incident version so installed web apps
// re-precache cleanly (with the new reload-mode fetch) on their next launch.
var m = /CACHE_NAME\s*=\s*['"]sessions-garden-v(\d+)['"]/.exec(sw);
check('CACHE_NAME present and >= v210', !!m && parseInt(m[1], 10) >= 210);

console.log('\n' + (failed === 0 ? 'ALL PASS' : (failed + ' FAILED')));
process.exit(failed === 0 ? 0 : 1);
