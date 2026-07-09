/**
 * tests/42-coordinator-tour-guard.test.js — Phase 42 Plan 01 (T-42-V12) Wave-0
 * RED behavior guard for a COORDINATOR-LEVEL tour-active suppression guard.
 *
 * WHY (captured bug class): while the onboarding tour is running, no governed
 * attention surface may pop over it (the "backup prompt fires over active tour"
 * class). The fix belongs at the coordinator's run() entry point — protecting ALL
 * six PRECEDENCE surfaces at once — NOT as a per-popup check. The real active-run
 * signal is window.Tour.isActive() (assets/tour.js:657), so the guard stubs that.
 *
 * WHAT THIS PINS (observable behavior via window.AttentionCoordinator
 * { register, run } and the sessionStorage marker 'sg.surfaceShownThisSession'):
 *   - Tour ACTIVE (window.Tour.isActive() === true): run() shows NO surface — a
 *     spy on the eligible surface's show() is never called, and no overlay mounts.
 *   - Tour INACTIVE (isActive() === false): run() shows the top-eligible surface
 *     as normal (control case — the guard is specific to the active-tour state).
 *   - Marker NOT burned: a suppressed run() (tour active) must NOT set
 *     'sg.surfaceShownThisSession', so a later run() once the tour is inactive
 *     still shows the eligible surface.
 *
 * HARNESS: mirrors tests/40-coordinator.test.js — eval assets/attention-
 * coordinator.js into an isolated jsdom window, register an always-eligible
 * stub surface, and drive run() under a stubbed window.Tour.isActive().
 *
 * Read-only: EVALs assets/* into a jsdom window; writes no assets/*.
 * Authored RED — attention-coordinator.js run() has NO tour guard yet (Plan 06
 * adds it): today run() ignores window.Tour and shows a surface even while
 * isActive() === true, so the "tour active → nothing shows" case fails RED.
 * Do NOT weaken to green.
 *
 * Run: node tests/42-coordinator-tour-guard.test.js — exits 0 on full pass, 1 otherwise.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

var SESSION_MARKER = 'sg.surfaceShownThisSession';

// opts.tourActive: initial boolean returned by window.Tour.isActive(). The stub
// reads a mutable flag so a single window can flip active→inactive between runs.
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
  win.App = {
    _lock: 0, _unlock: 0,
    lockBodyScroll: function () { this._lock++; },
    unlockBodyScroll: function () { this._unlock++; },
  };
  win.AppVersion = { APP_VERSION: '1.3.0' };
  win.eval(readAsset('assets/i18n-en.js'));
  win.I18N_DEFAULT = 'en';
  // The mutable tour state + the real signal seam (tour.js:657). Absent Tour is
  // handled separately in the control case below.
  var state = { active: !!opts.tourActive };
  if (opts.noTour !== true) {
    win.Tour = { isActive: function () { return state.active; } };
  }
  win.eval(readAsset('assets/attention-coordinator.js'));
  if (!win.AttentionCoordinator || typeof win.AttentionCoordinator.run !== 'function') {
    throw new Error('assets/attention-coordinator.js did not expose AttentionCoordinator.run');
  }
  return { dom: dom, win: win, AC: win.AttentionCoordinator, state: state };
}

// An always-eligible stub surface with a show() spy.
function stub(id) {
  return {
    id: id,
    _shown: 0,
    eligible: function () { return true; },
    show: function () { this._shown++; },
  };
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ── Tour ACTIVE → run() suppresses every governed surface ────────────────────
test('tour active — run() shows NO surface (coordinator-level guard on window.Tour.isActive())', function () {
  var env = buildWindow({ tourActive: true });
  var s = stub('welcome');
  env.AC.register(s);
  env.AC.run();
  assert.strictEqual(s._shown, 0,
    'while window.Tour.isActive() is true, run() must not invoke any surface show()');
  env.dom.window.close();
});

// ── Marker NOT burned by a suppressed run() ──────────────────────────────────
test('tour active — a suppressed run() does NOT set the one-per-session marker; a later inactive run() still shows', function () {
  var env = buildWindow({ tourActive: true });
  var s = stub('welcome');
  env.AC.register(s);
  env.AC.run();
  assert.strictEqual(env.win.sessionStorage.getItem(SESSION_MARKER), null,
    'a tour-suppressed run() must NOT burn ' + SESSION_MARKER);
  // Tour ends; the eligible surface must still get its turn this session.
  env.state.active = false;
  env.AC.run();
  assert.strictEqual(s._shown, 1,
    'once the tour is inactive, the still-eligible surface must show (the slot was never consumed)');
  assert.strictEqual(env.win.sessionStorage.getItem(SESSION_MARKER), '1',
    'the marker is set only when a surface actually shows');
  env.dom.window.close();
});

// ── Control: Tour INACTIVE → run() shows the top-eligible surface ────────────
test('tour inactive — run() shows the top-eligible surface as normal (guard is specific to the active-tour state)', function () {
  var env = buildWindow({ tourActive: false });
  var s = stub('welcome');
  env.AC.register(s);
  env.AC.run();
  assert.strictEqual(s._shown, 1, 'with the tour inactive, run() must show the eligible surface');
  env.dom.window.close();
});

// ── Control: window.Tour absent → run() behaves normally (no throw) ──────────
test('no window.Tour — run() shows the eligible surface (guard must tolerate an absent Tour)', function () {
  var env = buildWindow({ noTour: true });
  var s = stub('welcome');
  env.AC.register(s);
  env.AC.run();
  assert.strictEqual(s._shown, 1, 'an absent window.Tour must not suppress or throw');
  env.dom.window.close();
});

console.log('\n42-coordinator-tour-guard: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
