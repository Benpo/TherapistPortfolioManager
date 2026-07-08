/**
 * Regression guard — the replayable guided tour engine (Phase 41, TOUR-03/04)
 * must be precached so the installed PWA runs it fully OFFLINE.
 *
 * The service worker must list BOTH '/assets/tour.js' and '/assets/tour.css' in
 * PRECACHE_URLS. If either entry is dropped, the tour would 404 when the network
 * is off on an installed (Add to Home Screen) PWA — a HELP-07-class silent
 * offline regression (Pitfall 7).
 *
 * This test ALSO asserts every one of the 8 app-chrome pages that boot app.js +
 * attention-coordinator.js loads the tour via those same './assets/tour.js' (as a
 * <script>) and './assets/tour.css' (as a <link>) paths — so the precache entry
 * and the page tags can never drift apart. Those 8 pages are exactly the pages a
 * launch surface renders on (welcome CTA + '?' 'Take the tour' row + reminder
 * Start, architect-gate A1), so window.Tour MUST be present on all of them or the
 * launch surfaces become dead UI. demo.html must NOT reference the tour (the tour
 * is excluded from the demo seam, D-16).
 *
 * NOTE: this is a SHAPE guard (fs source-scan), not a behavior test. Real
 * service-worker + offline navigation is field-verified on an installed PWA at
 * phase UAT (Plan 07, mirroring the Phase 39/40 offline check).
 *
 * Run: node tests/41-precache.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

var failed = 0;
function check(name, cond) {
  if (cond) { console.log('[PASS] ' + name); }
  else { failed++; console.error('[FAIL] ' + name); }
}

var TOUR_JS = '/assets/tour.js';
var TOUR_CSS = '/assets/tour.css';

// ── PRECACHE_URLS must contain both tour assets ────────────────────────────
// Isolate the PRECACHE_URLS array so a stray reference elsewhere (comment,
// fetch handler) cannot satisfy the check by accident.
var urlsMatch = /const\s+PRECACHE_URLS\s*=\s*\[([\s\S]*?)\]/.exec(sw);
var urlsBody = urlsMatch ? urlsMatch[1] : '';

function inUrls(url) {
  return new RegExp("['\"]" + url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "['\"]").test(urlsBody);
}

check('PRECACHE_URLS array is present', !!urlsMatch);
check("PRECACHE_URLS contains '" + TOUR_JS + "'", inUrls(TOUR_JS));
check("PRECACHE_URLS contains '" + TOUR_CSS + "'", inUrls(TOUR_CSS));

// ── All 8 app-chrome pages load the tour; demo.html does not ───────────────
// These are the eight pages that load app.js + attention-coordinator.js, i.e.
// every page a launch surface renders on (architect-gate A1).
var CHROME_PAGES = [
  'index.html', 'add-client.html', 'add-session.html', 'sessions.html',
  'reporting.html', 'report.html', 'settings.html', 'help.html'
];

// tour.js referenced as a <script> and tour.css as a <link> — same paths as the
// precached entries so the page tags and the precache list can never drift.
var TOUR_JS_SCRIPT = /<script[^>]+src=["']\.\/assets\/tour\.js["']/;
var TOUR_CSS_LINK = /<link[^>]+href=["']\.\/assets\/tour\.css["']/;

CHROME_PAGES.forEach(function (page) {
  var html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  check(page + " references './assets/tour.js' as a <script>", TOUR_JS_SCRIPT.test(html));
  check(page + " references './assets/tour.css' as a <link>", TOUR_CSS_LINK.test(html));
});

var demo = fs.readFileSync(path.join(ROOT, 'demo.html'), 'utf8');
check('demo.html does NOT reference the tour (excluded from the demo seam, D-16)',
  !/tour\.js/.test(demo) && !/tour\.css/.test(demo));

console.log('\n' + (failed === 0 ? 'ALL PASS' : (failed + ' FAILED')));
process.exit(failed === 0 ? 0 : 1);
