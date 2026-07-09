/**
 * Regression guard — the In-App Changelog / What's-New (Phase 42) must be
 * precached so the /changelog page and its sub-resources open fully OFFLINE on
 * an installed PWA (CHLG-01 / CHLG-02, RESEARCH correction #1).
 *
 * This is the mechanical-correctness gate for the TWO-ARRAY precache split that
 * prevents the redirect failure (RESEARCH Pitfall 1). The service worker keeps
 * two distinct precache lists:
 *
 *   • PRECACHE_URLS  — sub-resource ASSETS fetched with { cache: 'reload' } and
 *     stored via cache.put. The four new changelog assets belong HERE:
 *       /assets/changelog-content-en.js, /assets/whats-new.js,
 *       /assets/changelog.js, /assets/changelog.css
 *   • PRECACHE_HTML  — extensionless PAGE routes fetched with redirect:'follow'
 *     and stored under the key we control (never cache.add). The changelog page
 *     belongs HERE as the extensionless '/changelog' route.
 *
 * The Pitfall-1 anti-pattern is putting the PAGE (changelog.html / /changelog)
 * into PRECACHE_URLS, where the { cache: 'reload' } add would follow the CF
 * Pages pretty-URL redirect and store a redirected:true response — which the
 * browser then REJECTS when serving the navigation, blanking the page offline.
 * So this test asserts the page is present in PRECACHE_HTML and ABSENT from
 * PRECACHE_URLS.
 *
 * It ALSO re-asserts the anti-stale guard fetch(url,{cache:'reload'}) is intact
 * and that no bare cache.add(url) crept back in — the same class of silent
 * offline regression the 39-help / sw-precache-cache-reload guards protect.
 *
 * NOTE: the What's-New popup CSS is intentionally NOT its own precache entry —
 * it lives in the already-precached assets/app.css. This test must NOT expect a
 * whats-new.css entry.
 *
 * SHAPE guard (fs source-scan), not a behavior test: the real SW + offline
 * navigation cannot be exercised by the project's zero-dependency harness, so
 * end-to-end offline is field-verified on a real installed PWA.
 *
 * Authored RED: sw.js is not yet edited (Plan 08 adds these entries). Until then
 * this gate MUST fail — do NOT weaken it to green.
 *
 * Run: node tests/42-precache.test.js
 * Exits 0 on full pass, 1 on any failure (the tests/run-all.js contract).
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

function rx(literal) {
  return new RegExp("['\"]" + literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "['\"]");
}

// ── Isolate PRECACHE_URLS and PRECACHE_HTML as SEPARATE regions ─────────────
// Scoping each block prevents a stray reference elsewhere (a comment, the fetch
// handler, or the OTHER array) from satisfying a check by accident — this is
// what makes the two-array split falsifiable.
var urlsMatch = /const\s+PRECACHE_URLS\s*=\s*\[([\s\S]*?)\]/.exec(sw);
var urlsBody = urlsMatch ? urlsMatch[1] : '';
var htmlMatch = /const\s+PRECACHE_HTML\s*=\s*\[([\s\S]*?)\]/.exec(sw);
var htmlBody = htmlMatch ? htmlMatch[1] : '';

check('PRECACHE_URLS array is present', !!urlsMatch);
check('PRECACHE_HTML array is present', !!htmlMatch);

// ── PRECACHE_URLS: the four changelog sub-resource ASSETS must be present ────
// The three locale changelog-content siblings (he/de/cs) join en so the What's-
// New popup + /changelog render localized entries fully OFFLINE (L10N-01). They
// are sub-resource ASSETS → PRECACHE_URLS (never PRECACHE_HTML). RED until Plan 08
// wires them into sw.js.
[
  '/assets/changelog-content-en.js',
  '/assets/changelog-content-he.js',
  '/assets/changelog-content-de.js',
  '/assets/changelog-content-cs.js',
  '/assets/whats-new.js',
  '/assets/changelog.js',
  '/assets/changelog.css'
].forEach(function (asset) {
  check("PRECACHE_URLS contains '" + asset + "'", rx(asset).test(urlsBody));
});

// Region isolation: the changelog content siblings belong in PRECACHE_URLS, NOT
// PRECACHE_HTML (they are assets, not page routes).
['/assets/changelog-content-he.js', '/assets/changelog-content-de.js', '/assets/changelog-content-cs.js']
  .forEach(function (asset) {
    check("PRECACHE_HTML does NOT contain '" + asset + "' (asset belongs in PRECACHE_URLS)",
      !rx(asset).test(htmlBody));
  });

// The popup CSS lives in app.css (already precached) — there is NO whats-new.css
// precache entry, and this test must never demand one.
check('PRECACHE_URLS does NOT introduce a bogus whats-new.css entry (popup CSS lives in app.css)',
  !rx('/assets/whats-new.css').test(urlsBody));

// ── PRECACHE_HTML: the extensionless '/changelog' PAGE route must be present ──
// Match '/changelog' exactly (quoted, same quote after) so '/changelog-foo'
// cannot satisfy it.
check("PRECACHE_HTML contains the extensionless '/changelog' page route",
  /['"]\/changelog['"]/.test(htmlBody));

// ── Pitfall-1 anti-pattern guard: the PAGE must NOT be in PRECACHE_URLS ──────
// Neither the extensionless route nor any changelog.html HTML entry may appear
// in the assets list — that is the redirected-response failure mode.
check("PRECACHE_URLS does NOT contain the '/changelog' page route (Pitfall-1: page belongs in PRECACHE_HTML)",
  !/['"]\/changelog['"]/.test(urlsBody));
check("PRECACHE_URLS does NOT contain any 'changelog.html' HTML entry (Pitfall-1 anti-pattern)",
  !/changelog\.html/.test(urlsBody));

// ── Anti-stale guard must remain intact (do not regress the reload fetch) ────
check("static precache still uses fetch(url, { cache: 'reload' }) (anti-stale guard intact)",
  /fetch\(\s*url\s*,\s*\{\s*cache:\s*['"]reload['"]\s*\}\s*\)/.test(sw));
check('static precache does NOT revert to bare cache.add(url)',
  !/cache\.add\(\s*url\s*\)/.test(sw));

console.log('\n' + (failed === 0 ? 'ALL PASS' : (failed + ' FAILED')));
process.exit(failed === 0 ? 0 : 1);
