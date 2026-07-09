/**
 * tests/42-demo-gate.test.js — Phase 42 (D-15) behavior guard for demo-mode
 * suppression of the two What's-New / Changelog entry points that mount into
 * the shared app chrome:
 *
 *   1. The "What's new" MENU ROW in the "?" help-entry popover
 *      (App.initHelpEntry, data-label-key='whatsNew.menuRow').
 *   2. The FOOTER version LINK — the `v{APP_VERSION}` text wrapped in an anchor
 *      to ./changelog.html (SharedChrome.renderFooter).
 *
 * WHAT THIS PINS (observable DOM behavior, not source shape):
 *   • Menu row (D-15): on a NORMAL page initHelpEntry mounts a .help-entry-item
 *     carrying data-label-key='whatsNew.menuRow' whose href is './changelog.html';
 *     in the sales demo (window.name==='demo-mode') NO such row mounts (filtered
 *     out entirely — no dead row).
 *   • Footer link (D-15 / discretion guard): on a NORMAL page the version text is
 *     wrapped in <a href="./changelog.html"> INSIDE .app-footer-copy, while the
 *     .app-footer-version-warn span stays a SIBLING OUTSIDE that anchor (so the
 *     one-directional integrity marker still upgrades independently); in demo mode
 *     the version text is INERT (no ./changelog.html anchor at all).
 *
 * The demo seam is window.name === 'demo-mode' — the established gate used by
 * initDemoMode / mountBackupCloudButton / initHelpEntry's tour filter. Setting
 * win.name explicitly mirrors tests/41-demo-gate.test.js and 35-demo-chrome.test.js
 * (inline window.name scripts do not run under runScripts:'outside-only').
 *
 * FALSIFIABLE: with the code absent, the normal-mode assertions fail (no
 * whatsNew.menuRow row mounts; the version text is not wrapped in a changelog
 * anchor); with a demo filter absent, the demo-mode assertions fail (a dead
 * changelog row / link appears in the demo). Both directions are pinned.
 *
 * Read-only: EVALS assets/* into a jsdom window; writes no assets/*.
 *
 * Authored RED: the menu row + footer link do not exist yet (Plans 07/09 add
 * them). Until then this gate MUST fail — do NOT weaken it to green.
 *
 * Run: node tests/42-demo-gate.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

function stubMatchMedia(win) {
  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };
}

// ── Harness A: the App surface for initHelpEntry (mirrors 41-demo-gate) ──────
// Isolated jsdom window with the shared-chrome mount point + the real App. When
// `demo` is true, window.name is set to 'demo-mode' BEFORE initHelpEntry runs.
function buildAppWindow(demo) {
  var html = '<!DOCTYPE html><html><head></head>'
    + '<body data-nav="overview">'
    + '<div id="nav-placeholder"></div>'
    + '<div id="headerActions"></div>'
    + '</body></html>';
  var dom = new JSDOM(html, {
    url: 'https://localhost/index.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  stubMatchMedia(win);
  win.eval(readAsset('assets/i18n-en.js'));
  win.I18N_DEFAULT = 'en';
  win.eval(readAsset('assets/app.js'));
  if (!win.App || typeof win.App.initHelpEntry !== 'function') {
    throw new Error('assets/app.js did not expose App.initHelpEntry (test seam)');
  }
  if (demo) win.name = 'demo-mode';
  return { dom: dom, win: win, App: win.App };
}

// ── Harness B: the SharedChrome surface for renderFooter ─────────────────────
// version.js is the APP_VERSION source of truth; shared-chrome.js owns
// renderFooter. A .container mount point gives renderFooter its target. When
// `demo` is true, window.name is set to 'demo-mode' BEFORE renderFooter runs.
function buildFooterWindow(demo) {
  var html = '<!DOCTYPE html><html><head></head><body><div class="container"></div></body></html>';
  var dom = new JSDOM(html, {
    url: 'https://localhost/index.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  stubMatchMedia(win);
  win.eval(readAsset('assets/version.js'));
  win.eval(readAsset('assets/shared-chrome.js'));
  if (!win.SharedChrome || typeof win.SharedChrome.renderFooter !== 'function') {
    throw new Error('assets/shared-chrome.js did not expose SharedChrome.renderFooter');
  }
  if (demo) win.name = 'demo-mode';
  win.SharedChrome.renderFooter();
  return { dom: dom, win: win };
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ── 1. normal page: "What's new" menu row IS present, linking to changelog ───
test('normal page: "What\'s new" menu row mounts with href=./changelog.html', function () {
  var env = buildAppWindow(false);
  env.App.initHelpEntry();
  var doc = env.win.document;
  var row = doc.querySelector('.help-entry-item[data-label-key="whatsNew.menuRow"]');
  assert.ok(row, 'the "What\'s new" row must mount on a normal (non-demo) page');
  assert.strictEqual(row.getAttribute('href'), './changelog.html',
    'the "What\'s new" row must be a link to ./changelog.html');
  env.dom.window.close();
});

// ── 2. demo page: the "What's new" menu row is filtered out (no dead row) ─────
test('demo page (window.name=demo-mode): NO "What\'s new" menu row mounts (D-15)', function () {
  var env = buildAppWindow(true);
  env.App.initHelpEntry();
  var doc = env.win.document;
  var row = doc.querySelector('.help-entry-item[data-label-key="whatsNew.menuRow"]');
  assert.strictEqual(row, null,
    'the "What\'s new" row must be ABSENT in demo mode (filtered out, not a dead row)');
  env.dom.window.close();
});

// ── 3. normal page: footer version text wrapped in a ./changelog.html anchor ─
test('normal page: footer version text is wrapped in <a href=./changelog.html>, warn span OUTSIDE the anchor', function () {
  var env = buildFooterWindow(false);
  var doc = env.win.document;
  var copy = doc.querySelector('.app-footer-copy');
  assert.ok(copy, 'the footer must render an .app-footer-copy line');
  var link = copy.querySelector('a[href="./changelog.html"]');
  assert.ok(link, 'the version text must be wrapped in an anchor to ./changelog.html on a normal page');
  var expected = 'v' + env.win.AppVersion.APP_VERSION;
  assert.ok(link.textContent.indexOf(expected) !== -1,
    'the ./changelog.html anchor must carry the version text ' + JSON.stringify(expected) +
    ', got ' + JSON.stringify(link.textContent));
  var warn = copy.querySelector('.app-footer-version-warn');
  assert.ok(warn, 'the .app-footer-version-warn marker span must still be present');
  assert.ok(!link.contains(warn),
    'the .app-footer-version-warn span must remain a SIBLING OUTSIDE the changelog anchor (independent marker upgrade)');
  env.dom.window.close();
});

// ── 4. demo page: footer version text is INERT (no changelog anchor) ─────────
test('demo page (window.name=demo-mode): footer version text is inert (no ./changelog.html anchor) (D-15)', function () {
  var env = buildFooterWindow(true);
  var doc = env.win.document;
  var copy = doc.querySelector('.app-footer-copy');
  assert.ok(copy, 'the footer must render an .app-footer-copy line in demo mode');
  var link = copy.querySelector('a[href="./changelog.html"]');
  assert.strictEqual(link, null,
    'in demo mode the version text must be inert — no ./changelog.html anchor may wrap it');
  env.dom.window.close();
});

console.log('\n42-demo-gate: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
