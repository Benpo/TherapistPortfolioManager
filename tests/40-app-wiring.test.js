/**
 * tests/40-app-wiring.test.js — Phase 40 Plan 04 (ONBD-02 / ONBD-03) behavior
 * guard for wiring the AttentionCoordinator into assets/app.js.
 *
 * WHAT THIS PINS (observable behavior, not source shape):
 *   A. App.bootAttentionSurfaces() (the initCommon seam that replaces the direct
 *      showFirstLaunchSecurityNote() call) registers a 'security-note' surface
 *      with the coordinator AND calls run() — the security note is now a governed
 *      surface, not a direct call (ONBD-03).
 *   B. The registered 'security-note' eligible() returns false when
 *      #security-guidance-container is absent (D-08 — an unrenderable winner never
 *      consumes the session slot), and true when the container is present with the
 *      license activated and no recent dismissal (D-05 gates).
 *
 * NOTE (Phase 41 gap-closure, UAT gap 8): the former welcome-screen replay row
 * was retired from the "?" popover per Ben's 2026-07-08 decision — the redundant
 * welcome-screen replay entry is gone, leaving the replayable guided tour as the
 * single onboarding-replay row. The three tests that pinned that row (mount /
 * click / app:language re-translate) were removed here. First-run welcome is
 * unchanged: AttentionCoordinator's welcome-open path stays and is covered
 * directly by tests/40-welcome-overlay.test.js.
 *
 * HARNESS: boots the REAL assets/app.js into an isolated jsdom window (same
 * eval-into-jsdom convention as tests/39-help-entry.test.js), seeding
 * window.I18N.en from assets/i18n-en.js so t() resolves help.entry.* . A FAKE
 * window.AttentionCoordinator is injected to observe register/run/showWelcome
 * calls — the real coordinator is NOT loaded (zero new dependencies, D-08 gate
 * exercised through the smallest real seam: App.bootAttentionSurfaces).
 *
 * Read-only: EVALS assets/* into a jsdom window; writes no assets/*.
 *
 * Run: node tests/40-app-wiring.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

// A fake AttentionCoordinator that records register/run calls.
function makeFakeCoordinator() {
  var calls = { registered: {}, runCalled: 0 };
  return {
    calls: calls,
    register: function (surface) { if (surface && surface.id) calls.registered[surface.id] = surface; },
    run: function () { calls.runCalled++; },
  };
}

// Build an isolated jsdom window with the shared-chrome mount points + the real
// App surface. Optionally mounts a #security-guidance-container.
function buildWindow(opts) {
  opts = opts || {};
  var html = '<!DOCTYPE html><html><head></head>'
    + '<body' + (opts.nav ? ' data-nav="' + opts.nav + '"' : '') + '>'
    + '<div id="nav-placeholder"></div>'
    + '<div id="headerActions"></div>'
    + (opts.withSecurityContainer ? '<div id="security-guidance-container"></div>' : '')
    + '</body></html>';
  var dom = new JSDOM(html, {
    url: 'https://localhost/index.html',
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
  win.eval(readAsset('assets/i18n-en.js'));
  win.I18N_DEFAULT = 'en';
  win.eval(readAsset('assets/app.js'));
  if (!win.App || typeof win.App.initHelpEntry !== 'function') {
    throw new Error('assets/app.js did not expose App.initHelpEntry (test seam)');
  }
  return { dom: dom, win: win, App: win.App };
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ── A. bootAttentionSurfaces registers security-note + calls run() ──────────
test('App.bootAttentionSurfaces registers the security-note surface AND calls run()', function () {
  var env = buildWindow({ nav: 'overview', withSecurityContainer: true });
  var win = env.win;
  assert.strictEqual(typeof env.App.bootAttentionSurfaces, 'function',
    'App must expose bootAttentionSurfaces (the initCommon seam replacing the direct call)');
  var fake = makeFakeCoordinator();
  win.AttentionCoordinator = fake;

  env.App.bootAttentionSurfaces();

  assert.ok(fake.calls.registered['security-note'],
    'a surface with id security-note must be registered (governed, not a direct call)');
  assert.strictEqual(typeof fake.calls.registered['security-note'].eligible, 'function',
    'the security-note surface must expose eligible()');
  assert.strictEqual(typeof fake.calls.registered['security-note'].show, 'function',
    'the security-note surface must expose show()');
  assert.ok(fake.calls.runCalled >= 1, 'run() must be called (arbitration replaces the direct call)');
  win.close();
});

// ── B. security-note eligible() — D-08 container gate + D-05 gates ───────────
test('security-note eligible() is false when #security-guidance-container is absent (D-08)', function () {
  var env = buildWindow({ nav: 'overview', withSecurityContainer: false });
  var win = env.win;
  var fake = makeFakeCoordinator();
  win.AttentionCoordinator = fake;
  win.localStorage.setItem('portfolioLicenseActivated', '1');
  win.localStorage.removeItem('securityGuidanceDismissed');

  env.App.bootAttentionSurfaces();
  var surface = fake.calls.registered['security-note'];
  assert.strictEqual(surface.eligible(), false,
    'eligible() must be false when the Overview-only container is absent (never consume the slot)');
  win.close();
});

test('security-note eligible() is true when container present + license activated + no recent dismissal (D-05)', function () {
  var env = buildWindow({ nav: 'overview', withSecurityContainer: true });
  var win = env.win;
  var fake = makeFakeCoordinator();
  win.AttentionCoordinator = fake;
  win.localStorage.setItem('portfolioLicenseActivated', '1');
  win.localStorage.removeItem('securityGuidanceDismissed');

  env.App.bootAttentionSurfaces();
  var surface = fake.calls.registered['security-note'];
  assert.strictEqual(surface.eligible(), true,
    'eligible() must be true when container present + license active + no recent dismissal');

  // And false when the license is not activated.
  win.localStorage.setItem('portfolioLicenseActivated', '0');
  assert.strictEqual(surface.eligible(), false,
    'eligible() must be false when the license is not activated');

  // And false when dismissed within the last 7 days.
  win.localStorage.setItem('portfolioLicenseActivated', '1');
  win.localStorage.setItem('securityGuidanceDismissed', new Date().toISOString());
  assert.strictEqual(surface.eligible(), false,
    'eligible() must be false when dismissed within the 7-day cadence');
  win.close();
});

console.log('\n40-app-wiring: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
