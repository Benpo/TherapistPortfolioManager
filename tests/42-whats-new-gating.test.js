/**
 * tests/42-whats-new-gating.test.js — Phase 42 Plan 01 (CHLG-01) Wave-0 RED
 * behavior guard for the What's-New popup's coordinator gating contract.
 *
 * WHAT THIS PINS (observable behavior via the public window.AttentionCoordinator
 * API — { register, run, _getSurface } — and the literal storage key
 * 'sg.whatsNewLastSeenVersion'; NO fabricated key):
 *   T-42-V1 (once-per-version gating): with a fixture changelog entry for the
 *     running APP_VERSION present and sg.whatsNewLastSeenVersion unset (or a
 *     different version), the 'whats-new' surface eligible() is true; once
 *     sg.whatsNewLastSeenVersion === APP_VERSION, eligible() is false.
 *   T-42-V2 (first-ever-launch suppression): on genuinely fresh state (no
 *     sg.welcomeSeen, no sg.whatsNewLastSeenVersion) run() shows 'welcome'
 *     (PRECEDENCE[0]) and NOT 'whats-new'; after the welcome dismiss writes
 *     sg.whatsNewLastSeenVersion = APP_VERSION (attention-coordinator.js:227-231),
 *     whats-new eligible() is false — the new user never sees a redundant popup.
 *   T-42-V3 (silent-skip reconcile, D-07): when APP_VERSION differs from the
 *     stored lastSeen AND no changelog entry exists for APP_VERSION, eligible()
 *     is false, run() NEVER invokes the surface's show(), AND eval'ing
 *     whats-new.js has advanced sg.whatsNewLastSeenVersion to APP_VERSION so the
 *     NEXT real release is not silently suppressed.
 *
 * HARNESS: mirrors tests/40-coordinator.test.js — eval assets/attention-
 * coordinator.js then assets/whats-new.js into an isolated jsdom window, seeding
 * window.App (scroll-lock spies), window.AppVersion = { APP_VERSION }, a
 * window.CHANGELOG_CONTENT_EN fixture (independent of the real plan-04 data
 * file), and window.I18N.en. The surface is reached via
 * AttentionCoordinator._getSurface('whats-new') (attention-coordinator.js:502).
 *
 * Read-only: EVALs assets/* into a jsdom window; writes no assets/*.
 * Authored RED — assets/whats-new.js does NOT exist yet (Plan 05 ships it), so
 * buildWindow() throws on load and every case fails RED for the right reason.
 * Do NOT weaken to green.
 *
 * Run: node tests/42-whats-new-gating.test.js — exits 0 on full pass, 1 otherwise.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

var LAST_SEEN_KEY = 'sg.whatsNewLastSeenVersion';   // the ONLY key — never invent one

// Build an isolated jsdom window with the coordinator + the (Plan-05) whats-new
// surface evaluated in. `opts.appVersion` sets AppVersion.APP_VERSION;
// `opts.content` seeds window.CHANGELOG_CONTENT_EN; `opts.lastSeen` pre-seeds the
// storage key before whats-new.js runs (so the D-07 reconcile is exercised).
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
  win.AppVersion = { APP_VERSION: opts.appVersion || '1.3.0' };
  win.eval(readAsset('assets/i18n-en.js'));
  win.I18N_DEFAULT = 'en';
  // Seed the changelog data BEFORE the surface evaluates, so its gating +
  // D-07 reconcile see the fixture (never the real plan-04 file).
  win.CHANGELOG_CONTENT_EN = opts.content || [];
  if (opts.lastSeen != null) win.localStorage.setItem(LAST_SEEN_KEY, opts.lastSeen);
  win.eval(readAsset('assets/attention-coordinator.js'));
  // Plan 05 artifact — absent in Wave 0. readAsset throws ENOENT here → RED.
  win.eval(readAsset('assets/whats-new.js'));
  return { dom: dom, win: win, AC: win.AttentionCoordinator };
}

// A minimal changelog entry (schema: version, anchor, date, lede, highlights[2-4]).
function entry(version, highlights) {
  return {
    version: version,
    anchor: 'v' + version.replace(/\./g, '-'),
    date: '2026-07-09',
    lede: 'Release ' + version,
    highlights: highlights || ['Highlight one', 'Highlight two'],
    categories: { improved: ['Something'] },
  };
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ── T-42-V1 — once-per-version gating ───────────────────────────────────────
test('T-42-V1 once-per-version — eligible() true when an entry for APP_VERSION is unseen, false once lastSeen==APP_VERSION', function () {
  var env = buildWindow({ appVersion: '1.3.0', content: [entry('1.3.0')] });
  var surface = env.AC._getSurface('whats-new');
  assert.ok(surface, "_getSurface('whats-new') must return the registered surface");
  assert.strictEqual(surface.eligible(), true,
    'with a 1.3.0 entry present and ' + LAST_SEEN_KEY + ' unset, whats-new must be eligible');
  env.win.localStorage.setItem(LAST_SEEN_KEY, '1.3.0');
  assert.strictEqual(surface.eligible(), false,
    'once ' + LAST_SEEN_KEY + ' === APP_VERSION, whats-new must NOT be eligible');
  env.dom.window.close();
});

// ── T-42-V2 — first-ever-launch suppression ─────────────────────────────────
test('T-42-V2 first-launch — run() shows welcome (not whats-new); after welcome writes lastSeen=APP_VERSION whats-new is ineligible', function () {
  var env = buildWindow({ appVersion: '1.3.0', content: [entry('1.3.0')] });
  var win = env.win;
  // Genuinely fresh: no welcomeSeen, no lastSeen.
  win.localStorage.removeItem('sg.welcomeSeen');
  win.localStorage.removeItem(LAST_SEEN_KEY);
  var whatsNew = env.AC._getSurface('whats-new');
  var wnShown = 0;
  var origShow = whatsNew.show;
  whatsNew.show = function () { wnShown++; return origShow.apply(this, arguments); };
  env.AC.run();
  // Welcome (PRECEDENCE[0]) must win the single slot on a first-ever launch.
  assert.ok(win.document.querySelector('.welcome-overlay'),
    'run() on fresh state must mount the welcome overlay, not the whats-new popup');
  assert.strictEqual(wnShown, 0, 'whats-new must NOT show on the first-ever launch');
  // Simulate the welcome dismiss recording the last-seen version (coordinator.js:227-231).
  win.localStorage.setItem('sg.welcomeSeen', '1');
  win.localStorage.setItem(LAST_SEEN_KEY, win.AppVersion.APP_VERSION);
  assert.strictEqual(whatsNew.eligible(), false,
    'after welcome records lastSeen=APP_VERSION, whats-new must be ineligible (no redundant popup)');
  env.dom.window.close();
});

// ── T-42-V3 — silent-skip reconcile (D-07) ──────────────────────────────────
test('T-42-V3 silent-skip — APP_VERSION with no changelog entry: ineligible, run() never shows, and lastSeen is reconciled forward to APP_VERSION', function () {
  // APP_VERSION 1.3.0 differs from stored lastSeen 1.2.0, and there is NO entry
  // for 1.3.0 (only an older entry) → nothing to show, but the version pointer
  // must advance so the next real release is not suppressed.
  var env = buildWindow({ appVersion: '1.3.0', lastSeen: '1.2.0', content: [entry('1.2.0')] });
  var win = env.win;
  var surface = env.AC._getSurface('whats-new');
  assert.strictEqual(surface.eligible(), false,
    'with no changelog entry for APP_VERSION, whats-new must be ineligible');
  var shown = 0;
  var origShow = surface.show;
  surface.show = function () { shown++; return origShow.apply(this, arguments); };
  env.AC.run();
  assert.strictEqual(shown, 0, 'run() must never invoke whats-new show() when there is no entry for APP_VERSION');
  assert.strictEqual(win.localStorage.getItem(LAST_SEEN_KEY), '1.3.0',
    'the D-07 silent-skip reconcile must advance ' + LAST_SEEN_KEY + ' to APP_VERSION');
  env.dom.window.close();
});

console.log('\n42-whats-new-gating: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
