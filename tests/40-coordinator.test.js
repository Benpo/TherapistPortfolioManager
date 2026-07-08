/**
 * tests/40-coordinator.test.js — Phase 40 Plan 02 (ONBD-03) behavior guard for
 * the attention-surface coordinator (assets/attention-coordinator.js).
 *
 * WHAT THIS PINS (observable behavior via the public window.AttentionCoordinator
 * API only — { register, run, showWelcome, PRECEDENCE }):
 *   (a) first-eligible-wins — register() + run() invokes the show() of the FIRST
 *       precedence id whose eligible() is true, and no later one (D-01).
 *   (b) precedence order — with two eligible surfaces at different precedence
 *       positions, only the earlier-in-PRECEDENCE one shows.
 *   (c) one-per-session — after a first run() shows a surface, a second run() in
 *       the same window shows nothing; the sessionStorage marker
 *       'sg.surfaceShownThisSession' is '1' (D-02).
 *   (d) demo-off — with window.name === 'demo-mode', run() shows nothing and sets
 *       no marker (D-09).
 *   (e) unrenderable-skip — a higher-precedence surface whose eligible() is false
 *       is skipped and the next eligible surface shows; the marker is only set
 *       when a surface actually shows (D-08).
 *
 * HARNESS: eval assets/attention-coordinator.js into an isolated jsdom window
 * (mirrors tests/39-help-entry.test.js), seeding a fake window.App (scroll-lock
 * spies), window.AppVersion = { APP_VERSION: '1.3.0' }, and window.I18N.en from
 * assets/i18n-en.js so data-i18n copy resolves.
 *
 * Read-only: EVALs assets/* into a jsdom window; writes no assets/*.
 * Authored RED (attention-coordinator.js absent) — do NOT weaken.
 *
 * Run: node tests/40-coordinator.test.js — exits 0 on full pass, 1 otherwise.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

// Build an isolated jsdom window with the coordinator's runtime seams and the
// real assets/attention-coordinator.js evaluated in.
function buildWindow(opts) {
  opts = opts || {};
  var dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
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
  // Fake App with scroll-lock spies (the overlay reuses App.lockBodyScroll).
  win.App = {
    _lock: 0, _unlock: 0,
    lockBodyScroll: function () { this._lock++; },
    unlockBodyScroll: function () { this._unlock++; },
  };
  win.AppVersion = { APP_VERSION: '1.3.0' };
  win.eval(readAsset('assets/i18n-en.js'));
  win.I18N_DEFAULT = 'en';
  if (opts.demo) win.name = 'demo-mode';
  win.eval(readAsset('assets/attention-coordinator.js'));
  if (!win.AttentionCoordinator || typeof win.AttentionCoordinator.run !== 'function') {
    throw new Error('assets/attention-coordinator.js did not expose window.AttentionCoordinator.run');
  }
  return { dom: dom, win: win, AC: win.AttentionCoordinator };
}

// A registered surface stub: { id, eligible(), show() } with a show counter.
function stub(id, eligibleVal) {
  return {
    id: id,
    _shown: 0,
    eligible: function () { return typeof eligibleVal === 'function' ? eligibleVal() : eligibleVal; },
    show: function () { this._shown++; },
  };
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ── (a) first-eligible-wins ─────────────────────────────────────────────────
test('register() + run() invokes show() of the first eligible surface and no later one', function () {
  var env = buildWindow();
  var w = stub('welcome', true);
  var later = stub('security-note', true);
  env.AC.register(w);
  env.AC.register(later);
  env.AC.run();
  assert.strictEqual(w._shown, 1, 'the first eligible surface show() must fire exactly once');
  assert.strictEqual(later._shown, 0, 'no later precedence surface may show');
  env.dom.window.close();
});

// ── (b) precedence order ────────────────────────────────────────────────────
test('precedence — the earlier-in-PRECEDENCE eligible surface wins', function () {
  var env = buildWindow();
  env.AC.register(stub('welcome', false));       // ineligible highest-precedence
  var earlier = stub('security-note', true);
  var laterS = stub('install-nudge', true);
  env.AC.register(earlier);
  env.AC.register(laterS);
  env.AC.run();
  assert.strictEqual(earlier._shown, 1, 'security-note precedes install-nudge, so it wins');
  assert.strictEqual(laterS._shown, 0, 'install-nudge must not show when an earlier surface won');
  env.dom.window.close();
});

// ── (c) one-per-session ─────────────────────────────────────────────────────
test('one-per-session — a second run() shows nothing; the session marker is set', function () {
  var env = buildWindow();
  var w = stub('welcome', true);
  env.AC.register(w);
  env.AC.run();
  assert.strictEqual(w._shown, 1, 'first run() shows the surface');
  assert.strictEqual(env.win.sessionStorage.getItem('sg.surfaceShownThisSession'), '1',
    'the session marker must be set once a surface shows');
  env.AC.run();
  assert.strictEqual(w._shown, 1, 'a second run() in the same session must show nothing');
  env.dom.window.close();
});

// ── (d) demo-off ────────────────────────────────────────────────────────────
test('demo-off — window.name "demo-mode" suppresses every surface and sets no marker', function () {
  var env = buildWindow({ demo: true });
  var w = stub('welcome', true);
  env.AC.register(w);
  env.AC.run();
  assert.strictEqual(w._shown, 0, 'no surface may show in demo mode');
  assert.strictEqual(env.win.sessionStorage.getItem('sg.surfaceShownThisSession'), null,
    'the session marker must NOT be set in demo mode');
  env.dom.window.close();
});

// ── (e) unrenderable-skip + marker-only-on-show ─────────────────────────────
test('unrenderable-skip — an ineligible higher-precedence surface is skipped; marker only set on real show', function () {
  var env = buildWindow();
  env.AC.register(stub('welcome', false));       // ineligible → skipped
  var sec = stub('security-note', true);
  env.AC.register(sec);
  env.AC.run();
  assert.strictEqual(sec._shown, 1, 'the next eligible surface must show after the skip');
  assert.strictEqual(env.win.sessionStorage.getItem('sg.surfaceShownThisSession'), '1',
    'the marker is set because a surface actually showed');
  env.dom.window.close();

  // All-ineligible → nothing shows, marker stays unset (never consumed).
  var env2 = buildWindow();
  env2.AC.register(stub('welcome', false));
  env2.AC.register(stub('security-note', false));
  env2.AC.run();
  assert.strictEqual(env2.win.sessionStorage.getItem('sg.surfaceShownThisSession'), null,
    'the marker must stay unset when no surface renders');
  env2.dom.window.close();
});

console.log('\n40-coordinator: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
