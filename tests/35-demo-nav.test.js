/**
 * tests/35-demo-nav.test.js — Phase 35 Plan 06 DEVIATION FIX (DEMO-10 finding).
 *
 * THE BUG (real-browser DEMO-10 regression):
 *   The demo runs at demo.html inside an iframe on landing.html. The
 *   single-sourced chrome exposes navigation that ESCAPES the demo iframe and
 *   recursively re-loads landing.html (which re-embeds the demo) → infinite
 *   frame-in-frame nesting. Root cause: getNavigationContext() resolves
 *   homeHref = isActivated ? './index.html' : './landing.html'. A demo visitor
 *   is never "activated", so every back/brand/home link resolves to
 *   landing.html — and `window.name==='demo-mode'` persists across same-origin
 *   navigations inside the iframe, so it is reliably observable.
 *
 * THE FIX (all via the existing window.name==='demo-mode' seam — keeps the
 * chrome single-sourced and drift-proof):
 *   1. shared-chrome.js getNavigationContext(): in demo mode homeHref → './demo.html'
 *      (so every back/brand/home link, and the legal-page back links driven by
 *      updateBackLinks() → ctx.homeHref, stay INSIDE the demo).
 *   2. shared-chrome.js renderFooter(): omit/hide the footer License link in demo
 *      mode (closes the footer path to license.html).
 *   3. app.js initLicenseLink(): early-return in demo mode (closes the header
 *      key-icon path to license.html), mirroring mountBackupCloudButton's guard.
 *
 * FALSIFIABLE ASYMMETRY (anti-vacuous-green): every control is checked in BOTH
 * demo AND normal mode against the REAL production code (not stubs). The demo
 * half asserts the in-demo / hidden state (RED pre-fix); the normal half asserts
 * the unchanged real behavior (GREEN pre-fix) — the no-regression guard proving
 * the fix is strictly demo-scoped. A case-count guard rejects silent skips.
 *
 * Read-only: EVALs assets/*.js into isolated jsdom windows; writes no assets/*.
 *
 * Run: node tests/35-demo-nav.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

// Boot a minimal jsdom window carrying a .container (footer target), a
// .legal-back-link (the legal-page back-nav path driven by updateBackLinks),
// and a .header-actions (initLicenseLink mount target). Eval the production
// scripts in page load order, then enter/leave demo mode via window.name.
function buildEnv(demo) {
  var html = '<!doctype html><html><head></head><body>' +
    '<div class="container">' +
      '<a class="legal-back-link" href="#"></a>' +
      '<a class="legal-topbar-brand" href="./landing.html"></a>' +
      '<a class="disclaimer-brand" href="./landing.html"></a>' +
      '<div class="header-actions"></div>' +
    '</div>' +
    '</body></html>';
  var dom = new JSDOM(html, {
    url: 'https://localhost/demo.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };

  win.eval(readAsset('assets/version.js'));
  win.eval(readAsset('assets/i18n-en.js'));
  win.eval(readAsset('assets/i18n-he.js'));
  win.eval(readAsset('assets/i18n-de.js'));
  win.eval(readAsset('assets/i18n-cs.js'));
  win.eval(readAsset('assets/i18n.js'));
  win.eval(readAsset('assets/shared-chrome.js'));
  win.eval(readAsset('assets/app.js'));

  // The demo gate: window.name persists across same-origin navigations inside
  // the iframe, so this is the reliable in-demo signal the chrome reads.
  win.name = demo ? 'demo-mode' : '';

  if (!win.SharedChrome || typeof win.SharedChrome.getNavigationContext !== 'function') {
    throw new Error('assets/shared-chrome.js did not expose SharedChrome.getNavigationContext');
  }
  if (!win.App || typeof win.App.initLicenseLink !== 'function') {
    throw new Error('assets/app.js did not expose App.initLicenseLink');
  }
  return { dom: dom, win: win };
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

function main() {
  // ─── DEMO mode: navigation + license entry points stay in-demo / absent ─────
  var demo = buildEnv(true);
  var dWin = demo.win;
  var dDoc = dWin.document;

  test('DEMO-10 demo: getNavigationContext().homeHref resolves to ./demo.html (back/brand/home stays in-demo)', function () {
    var ctx = dWin.SharedChrome.getNavigationContext();
    assert.strictEqual(ctx.homeHref, './demo.html',
      'in demo mode the home/back target must be ./demo.html so navigation never escapes the iframe and re-loads landing.html');
  });

  test('DEMO-10 demo: updateBackLinks() points the legal-page back link at ./demo.html (no landing.html escape)', function () {
    dWin.SharedChrome.updateBackLinks();
    var back = dDoc.querySelector('.legal-back-link');
    assert.ok(back, 'a .legal-back-link must exist to assert against');
    assert.strictEqual(back.getAttribute('href'), './demo.html',
      'legal-page back link must resolve to ./demo.html in demo mode (updateBackLinks → ctx.homeHref), NOT ./landing.html');
  });

  test('DEMO-10 demo: updateBackLinks() points the legal topbar LOGO (.legal-topbar-brand) at ./demo.html', function () {
    dWin.SharedChrome.updateBackLinks();
    var brand = dDoc.querySelector('.legal-topbar-brand');
    assert.ok(brand, 'a .legal-topbar-brand must exist to assert against');
    assert.strictEqual(brand.getAttribute('href'), './demo.html',
      'the impressum/datenschutz topbar logo must resolve to ./demo.html in demo mode, NOT ./landing.html');
  });

  test('DEMO-10 demo: updateBackLinks() points the disclaimer LOGO (.disclaimer-brand) at ./demo.html', function () {
    dWin.SharedChrome.updateBackLinks();
    var brand = dDoc.querySelector('.disclaimer-brand');
    assert.ok(brand, 'a .disclaimer-brand must exist to assert against');
    assert.strictEqual(brand.getAttribute('href'), './demo.html',
      'the disclaimer/About-page logo must resolve to ./demo.html in demo mode — it uses .disclaimer-brand, a SECOND brand class updateBackLinks must cover (the DEMO-10 logo-escape finding)');
  });

  test('DEMO-10 demo: the footer License link is ABSENT (no footer path to license.html)', function () {
    dWin.SharedChrome.renderFooter();
    var footer = dDoc.querySelector('.app-footer');
    assert.ok(footer, 'renderFooter must render an .app-footer');
    var licenseLink = footer.querySelector('a[href="./license.html"]');
    assert.strictEqual(licenseLink, null,
      'demo mode must omit the footer License link — it is a path to license.html (whose own back-link escapes to landing.html)');
    // The footer must otherwise still render (version line intact) — proves we
    // omitted ONLY the license link, not the whole footer.
    assert.ok(footer.querySelector('.app-footer-copy'),
      'the footer version/copy line must remain intact in demo mode');
  });

  test('DEMO-10 demo: initLicenseLink() does NOT mount the header .header-license-link', function () {
    dWin.App.initLicenseLink();
    var headerLink = dDoc.querySelector('.header-license-link');
    assert.strictEqual(headerLink, null,
      'demo mode must skip mounting the header license key-icon (mirrors the mountBackupCloudButton demo guard)');
  });

  demo.dom.window.close();

  // ─── NORMAL mode (no-regression inverse): everything present, as before ─────
  var normal = buildEnv(false);
  var nWin = normal.win;
  var nDoc = nWin.document;

  test('NORMAL: getNavigationContext().homeHref resolves to ./landing.html (unchanged; guard is demo-scoped)', function () {
    var ctx = nWin.SharedChrome.getNavigationContext();
    assert.strictEqual(ctx.homeHref, './landing.html',
      'in normal (non-activated) mode the home target must stay ./landing.html — the demo guard must not leak');
  });

  test('NORMAL: updateBackLinks() points the legal-page back link at ./landing.html (unchanged)', function () {
    nWin.SharedChrome.updateBackLinks();
    var back = nDoc.querySelector('.legal-back-link');
    assert.strictEqual(back.getAttribute('href'), './landing.html',
      'normal mode legal back link must remain ./landing.html — proves the in-demo redirect is demo-scoped');
  });

  test('NORMAL: the legal topbar LOGO (.legal-topbar-brand) stays ./landing.html (unchanged)', function () {
    nWin.SharedChrome.updateBackLinks();
    var brand = nDoc.querySelector('.legal-topbar-brand');
    assert.strictEqual(brand.getAttribute('href'), './landing.html',
      'normal mode legal topbar logo must remain ./landing.html — proves the redirect is demo-scoped');
  });

  test('NORMAL: the disclaimer LOGO (.disclaimer-brand) stays ./landing.html (unchanged)', function () {
    nWin.SharedChrome.updateBackLinks();
    var brand = nDoc.querySelector('.disclaimer-brand');
    assert.strictEqual(brand.getAttribute('href'), './landing.html',
      'normal mode disclaimer logo must remain ./landing.html — proves the redirect is demo-scoped');
  });

  test('NORMAL: the footer License link IS present (real footer untouched)', function () {
    nWin.SharedChrome.renderFooter();
    var footer = nDoc.querySelector('.app-footer');
    assert.ok(footer, 'renderFooter must render an .app-footer');
    var licenseLink = footer.querySelector('a[href="./license.html"]');
    assert.ok(licenseLink,
      'normal mode must keep the footer License link — the guard is demo-scoped, the real footer is untouched');
  });

  test('NORMAL: initLicenseLink() DOES mount the header .header-license-link (real header untouched)', function () {
    nWin.App.initLicenseLink();
    var headerLink = nDoc.querySelector('.header-license-link');
    assert.ok(headerLink,
      'normal mode must mount the header license key-icon when initLicenseLink runs — proves the guard is demo-scoped');
    assert.strictEqual(headerLink.getAttribute('href'), './license.html',
      'the mounted header license link must point at ./license.html');
  });

  normal.dom.window.close();

  // ─── count guard (no case silently skipped) ────────────────────────────────
  var EXPECTED_COUNT = 12;
  if (passed + failed !== EXPECTED_COUNT) {
    console.error('\nGUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — a case was silently skipped.');
    process.exit(1);
    return;
  }

  console.log('');
  console.log('Plan 35-06 demo-nav (DEMO-10 iframe-escape fix) — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
}

main();
