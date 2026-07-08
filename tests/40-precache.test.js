/**
 * Regression guard — the onboarding attention coordinator (Phase 40, ONBD-03)
 * must be precached so the installed PWA runs it fully OFFLINE.
 *
 * The service worker must list '/assets/attention-coordinator.js' in
 * PRECACHE_URLS. If that entry is dropped, the coordinator would 404 when the
 * network is off on an installed (Add to Home Screen) PWA — a silent offline
 * regression of the first-run/onboarding flow.
 *
 * This test ALSO asserts every one of the 8 app pages that boot app.js loads the
 * coordinator via that same './assets/attention-coordinator.js' path (so the
 * precache entry and the page <script> can never drift apart), while demo.html
 * must NOT reference it (the coordinator is disabled in demo mode, D-09).
 *
 * NOTE: this is a SHAPE guard (fs source-scan), not a behavior test. Real
 * service-worker + offline navigation is field-verified on an installed PWA at
 * phase UAT (mirroring the Phase 39 offline check).
 *
 * Run: node tests/40-precache.test.js
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

var COORD = '/assets/attention-coordinator.js';

// ── PRECACHE_URLS must contain the coordinator ─────────────────────────────
// Isolate the PRECACHE_URLS array so a stray reference elsewhere (comment,
// fetch handler) cannot satisfy the check by accident.
var urlsMatch = /const\s+PRECACHE_URLS\s*=\s*\[([\s\S]*?)\]/.exec(sw);
var urlsBody = urlsMatch ? urlsMatch[1] : '';

check('PRECACHE_URLS array is present', !!urlsMatch);
check("PRECACHE_URLS contains '" + COORD + "'",
  new RegExp("['\"]" + COORD.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "['\"]").test(urlsBody));

// ── All 8 app pages load the coordinator; demo.html does not ───────────────
var APP_PAGES = [
  'index.html', 'add-client.html', 'add-session.html', 'report.html',
  'reporting.html', 'sessions.html', 'settings.html', 'help.html'
];
var COORD_REF = /\.\/assets\/attention-coordinator\.js/;

APP_PAGES.forEach(function (page) {
  var html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  check(page + " references './assets/attention-coordinator.js'", COORD_REF.test(html));
});

var demo = fs.readFileSync(path.join(ROOT, 'demo.html'), 'utf8');
check('demo.html does NOT reference the coordinator (disabled in demo mode)',
  !/attention-coordinator\.js/.test(demo));

console.log('\n' + (failed === 0 ? 'ALL PASS' : (failed + ' FAILED')));
process.exit(failed === 0 ? 0 : 1);
