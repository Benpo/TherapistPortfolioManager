/**
 * tests/40-app-wiring.test.js — Phase 40 Plan 04 (ONBD-02 / ONBD-03) behavior
 * guard for wiring the AttentionCoordinator into assets/app.js.
 *
 * WHAT THIS PINS (observable behavior, not source shape):
 *   A. initHelpEntry() mounts a "Replay welcome" row (label help.entry.replayWelcome)
 *      as a <button role=menuitem> carrying data-label-key, positioned AFTER the
 *      'Help center' row and BEFORE the 'Contact us' row (D-17). It is an action
 *      row, NOT an <a href>.
 *   B. Clicking that row calls AttentionCoordinator.showWelcome(true) (a direct
 *      open) and does NOT re-arm localStorage 'sg.welcomeSeen' nor the session
 *      marker 'sg.surfaceShownThisSession' (Pitfall 5 — no first-run re-arm).
 *   C. An app:language dispatch re-translates the new row's textContent via its
 *      data-label-key (the existing re-translate listener covers the button row).
 *   D. App.bootAttentionSurfaces() (the initCommon seam that replaces the direct
 *      showFirstLaunchSecurityNote() call) registers a 'security-note' surface
 *      with the coordinator AND calls run() — the security note is now a governed
 *      surface, not a direct call (ONBD-03).
 *   E. The registered 'security-note' eligible() returns false when
 *      #security-guidance-container is absent (D-08 — an unrenderable winner never
 *      consumes the session slot), and true when the container is present with the
 *      license activated and no recent dismissal (D-05 gates).
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

// A fake AttentionCoordinator that records register/run/showWelcome calls.
function makeFakeCoordinator() {
  var calls = { registered: {}, runCalled: 0, showWelcomeArgs: [] };
  return {
    calls: calls,
    register: function (surface) { if (surface && surface.id) calls.registered[surface.id] = surface; },
    run: function () { calls.runCalled++; },
    showWelcome: function (isReplay) { calls.showWelcomeArgs.push(isReplay); },
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

function itemsByKey(win) {
  var out = {};
  win.document.querySelectorAll('.help-entry-item').forEach(function (el) {
    out[el.getAttribute('data-label-key')] = el;
  });
  return out;
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ── A. Replay-welcome row: element, label, position ─────────────────────────
test('initHelpEntry mounts a Replay-welcome button (menuitem) after Help center, before Contact us', function () {
  var env = buildWindow({ nav: 'overview' });
  env.App.initHelpEntry();
  var win = env.win;
  var all = win.document.querySelectorAll('.help-entry-item');
  var keys = Array.prototype.map.call(all, function (el) { return el.getAttribute('data-label-key'); });

  var iCenter = keys.indexOf('help.entry.center');
  var iReplay = keys.indexOf('help.entry.replayWelcome');
  var iContact = keys.indexOf('help.entry.contact');
  assert.ok(iReplay !== -1, 'a help.entry.replayWelcome row must mount');
  assert.ok(iCenter !== -1 && iContact !== -1, 'the two day-one rows must still mount');
  assert.ok(iCenter < iReplay && iReplay < iContact,
    'Replay welcome must sit AFTER Help center and BEFORE Contact us (D-17)');

  var row = itemsByKey(win)['help.entry.replayWelcome'];
  assert.strictEqual(row.tagName, 'BUTTON', 'Replay welcome must be a <button> action row, not an <a href>');
  assert.ok(!row.hasAttribute('href'), 'Replay welcome must NOT carry an href (it is not a link)');
  assert.strictEqual(row.getAttribute('role'), 'menuitem', 'Replay welcome must carry role=menuitem');
  assert.strictEqual(row.getAttribute('data-label-key'), 'help.entry.replayWelcome',
    'Replay welcome must carry data-label-key for re-translate');
  assert.strictEqual(row.textContent, env.App.t('help.entry.replayWelcome'),
    'Replay welcome label must equal t(help.entry.replayWelcome) via textContent');
  win.close();
});

// ── B. click → showWelcome(true), no re-arm ─────────────────────────────────
test('clicking Replay welcome calls showWelcome(true) and never re-arms welcomeSeen / session marker', function () {
  var env = buildWindow({ nav: 'overview' });
  var win = env.win;
  var fake = makeFakeCoordinator();
  win.AttentionCoordinator = fake;
  env.App.initHelpEntry();

  // Pre-state: first-run flags untouched.
  win.localStorage.removeItem('sg.welcomeSeen');
  win.sessionStorage.removeItem('sg.surfaceShownThisSession');

  var row = itemsByKey(win)['help.entry.replayWelcome'];
  row.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));

  assert.strictEqual(fake.calls.showWelcomeArgs.length, 1, 'showWelcome must be called exactly once');
  assert.ok(fake.calls.showWelcomeArgs[0], 'showWelcome must be called with a truthy isReplay (direct replay)');
  assert.strictEqual(win.localStorage.getItem('sg.welcomeSeen'), null,
    'replay must NOT write sg.welcomeSeen (Pitfall 5 — no re-arm)');
  assert.strictEqual(win.sessionStorage.getItem('sg.surfaceShownThisSession'), null,
    'replay must NOT claim the one-per-session marker (Pitfall 5 — no re-arm)');
  win.close();
});

// ── C. re-translate on app:language ─────────────────────────────────────────
test('app:language re-translates the Replay-welcome row via data-label-key', function () {
  var env = buildWindow({ nav: 'overview' });
  var win = env.win;
  env.App.initHelpEntry();

  // Mutate the dict then fire the shared re-translate signal.
  win.I18N.en['help.entry.replayWelcome'] = 'REPLAY_X';
  win.document.dispatchEvent(new win.Event('app:language'));

  var row = itemsByKey(win)['help.entry.replayWelcome'];
  assert.strictEqual(row.textContent, 'REPLAY_X',
    'the existing app:language re-translate listener must cover the button row');
  win.close();
});

// ── D. bootAttentionSurfaces registers security-note + calls run() ──────────
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

// ── E. security-note eligible() — D-08 container gate + D-05 gates ───────────
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
