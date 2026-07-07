/**
 * Regression guard — the Help center (Phase 39) must be precached so it opens
 * fully OFFLINE on an installed PWA (HELP-07).
 *
 * The service worker must precache the three help assets (assets/help.js,
 * assets/help-content-en.js, assets/help.css) in PRECACHE_URLS and the
 * extensionless /help page (CF Pages pretty-URL convention) in PRECACHE_HTML.
 * If any of these four entries is dropped, Help would 404 / render blank when
 * the network is off — the highest-risk delivery step in this phase.
 *
 * This test ALSO re-asserts the reload-mode static precache is still present,
 * so it fails if the anti-stale guard (fetch(url,{cache:'reload'})) is reverted
 * to the stale-prone bare cache.add(url) form — the same class of failure that
 * once promoted an OLD pdf-export.js into a "fresh" CACHE_NAME on installed apps
 * (see tests/sw-precache-cache-reload.test.js). Precaching help behind a stale
 * static-fetch mode would be a silent offline regression.
 *
 * NOTE: this is a SHAPE guard (fs source-scan), not a behavior test. Real
 * service-worker + offline navigation cannot be exercised by the project's
 * zero-dependency vm/jsdom harness (Pitfall 2 — WebKit-only stale-SW failures
 * are invisible to Chromium), so end-to-end offline is field-verified on a real
 * installed PWA (Plan 39-06 Task 2).
 *
 * Run: node tests/39-help-precache.test.js
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

// ── PRECACHE_URLS: the three new help assets must be present ────────────────
// Isolate the PRECACHE_URLS array so a stray reference elsewhere (e.g. a
// comment or the fetch handler) cannot satisfy the check by accident.
var urlsMatch = /const\s+PRECACHE_URLS\s*=\s*\[([\s\S]*?)\]/.exec(sw);
var urlsBody = urlsMatch ? urlsMatch[1] : '';

check('PRECACHE_URLS array is present', !!urlsMatch);

['/assets/help.js', '/assets/help-content-en.js', '/assets/help.css'].forEach(function (asset) {
  check("PRECACHE_URLS contains '" + asset + "'",
    new RegExp("['\"]" + asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "['\"]").test(urlsBody));
});

// ── PRECACHE_HTML: the extensionless /help page must be present ─────────────
var htmlMatch = /const\s+PRECACHE_HTML\s*=\s*\[([\s\S]*?)\]/.exec(sw);
var htmlBody = htmlMatch ? htmlMatch[1] : '';

check('PRECACHE_HTML array is present', !!htmlMatch);

// Match '/help' exactly (not '/help-something'): quoted, followed by the same quote.
check("PRECACHE_HTML contains the extensionless '/help' entry",
  /['"]\/help['"]/.test(htmlBody));

// ── Anti-stale guard must remain intact (do not regress the reload fetch) ───
// If precaching help ships alongside a silent revert to bare cache.add(url),
// Help would be served stale on installed apps. Keep the reload-mode fetch.
check("static precache still uses fetch(url, { cache: 'reload' }) (anti-stale guard intact)",
  /fetch\(\s*url\s*,\s*\{\s*cache:\s*['"]reload['"]\s*\}\s*\)/.test(sw));

check('static precache does NOT revert to bare cache.add(url)',
  !/cache\.add\(\s*url\s*\)/.test(sw));

console.log('\n' + (failed === 0 ? 'ALL PASS' : (failed + ' FAILED')));
process.exit(failed === 0 ? 0 : 1);
