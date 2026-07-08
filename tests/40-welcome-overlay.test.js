/**
 * tests/40-welcome-overlay.test.js — Phase 40 Plan 02 (ONBD-01 / ONBD-02)
 * behavior guard for the first-run welcome overlay governed by the attention
 * coordinator (assets/attention-coordinator.js).
 *
 * WHAT THIS PINS (observable DOM + storage behavior via the public
 * window.AttentionCoordinator API — { run, showWelcome }):
 *   (f)  showWelcome(false) mounts a role=dialog aria-modal=true overlay with the
 *        two CTAs (textContent = help.welcome.ctaTour / help.welcome.ctaExplore);
 *        App.lockBodyScroll() is called (D-10 / ONBD-01).
 *   (f2) run() with no 'sg.welcomeSeen' mounts the welcome overlay (welcome
 *        eligible when unseen).
 *   (g)  the secondary CTA sets localStorage 'sg.welcomeSeen'='1' AND
 *        'sg.whatsNewLastSeenVersion'='1.3.0', calls App.unlockBodyScroll, and
 *        removes the overlay node (D-03).
 *   (h)  Esc keydown dismisses the same way.
 *   (i)  the primary CTA's navigation target is ./help.html (D-11) and dismissing
 *        via it also sets both keys.
 *   (j)  after 'sg.welcomeSeen' is set, run() no longer mounts the overlay
 *        (welcome eligible() false).
 *   (k)  REPLAY — showWelcome(true) mounts the overlay but dismissal writes NONE
 *        of the three keys (sg.welcomeSeen, sg.whatsNewLastSeenVersion, session
 *        marker) — Pitfall 5.
 *
 * HARNESS: eval assets/attention-coordinator.js into an isolated jsdom window
 * (mirrors tests/39-help-entry.test.js), seeding a fake window.App (scroll-lock
 * spies), window.AppVersion = { APP_VERSION: '1.3.0' }, and window.I18N.en from
 * assets/i18n-en.js so data-i18n copy resolves to textContent.
 *
 * Read-only: EVALs assets/* into a jsdom window; writes no assets/*.
 * Authored RED (attention-coordinator.js absent) — do NOT weaken.
 *
 * Run: node tests/40-welcome-overlay.test.js — exits 0 on full pass, 1 otherwise.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

function buildWindow() {
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
  win.eval(readAsset('assets/attention-coordinator.js'));
  if (!win.AttentionCoordinator || typeof win.AttentionCoordinator.showWelcome !== 'function') {
    throw new Error('assets/attention-coordinator.js did not expose AttentionCoordinator.showWelcome');
  }
  return { dom: dom, win: win, AC: win.AttentionCoordinator };
}

function dialog(win) { return win.document.querySelector('[role="dialog"][aria-modal="true"]'); }
function click(win, el) { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true })); }

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ── (f) mount structure + lock ──────────────────────────────────────────────
test('showWelcome(false) mounts a role=dialog aria-modal overlay with both CTAs and locks scroll', function () {
  var env = buildWindow();
  env.AC.showWelcome(false);
  var win = env.win;
  var dlg = dialog(win);
  assert.ok(dlg, 'a role=dialog aria-modal=true overlay must mount');
  var primary = dlg.querySelector('.welcome-cta--primary');
  var secondary = dlg.querySelector('.welcome-cta--secondary');
  assert.ok(primary, 'the primary CTA must be present');
  assert.ok(secondary, 'the secondary CTA must be present');
  assert.strictEqual(primary.textContent, win.I18N.en['help.welcome.ctaTour'],
    'primary CTA textContent must resolve help.welcome.ctaTour');
  assert.strictEqual(secondary.textContent, win.I18N.en['help.welcome.ctaExplore'],
    'secondary CTA textContent must resolve help.welcome.ctaExplore');
  assert.strictEqual(env.win.App._lock, 1, 'App.lockBodyScroll must be called once on mount');
  env.dom.window.close();
});

// ── (f2) eligible-when-unseen (via run) ─────────────────────────────────────
test('run() with no sg.welcomeSeen mounts the welcome overlay (welcome eligible when unseen)', function () {
  var env = buildWindow();
  env.AC.run();
  assert.ok(dialog(env.win), 'the welcome overlay must mount on first launch');
  env.dom.window.close();
});

// ── (g) secondary-CTA dismiss writes both keys + unlocks + removes ──────────
test('secondary CTA dismiss sets sg.welcomeSeen + sg.whatsNewLastSeenVersion, unlocks, removes overlay', function () {
  var env = buildWindow();
  env.AC.showWelcome(false);
  var win = env.win;
  var secondary = dialog(win).querySelector('.welcome-cta--secondary');
  click(win, secondary);
  assert.strictEqual(win.localStorage.getItem('sg.welcomeSeen'), '1',
    'dismiss must set sg.welcomeSeen=1');
  assert.strictEqual(win.localStorage.getItem('sg.whatsNewLastSeenVersion'), '1.3.0',
    'dismiss must record AppVersion.APP_VERSION into sg.whatsNewLastSeenVersion');
  assert.strictEqual(env.win.App._unlock, 1, 'App.unlockBodyScroll must be called on dismiss');
  assert.ok(!dialog(win), 'the overlay node must be removed on dismiss');
  env.dom.window.close();
});

// ── (h) Esc dismiss ─────────────────────────────────────────────────────────
test('Esc keydown dismisses and writes both keys', function () {
  var env = buildWindow();
  env.AC.showWelcome(false);
  var win = env.win;
  win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.strictEqual(win.localStorage.getItem('sg.welcomeSeen'), '1', 'Esc must set sg.welcomeSeen=1');
  assert.strictEqual(win.localStorage.getItem('sg.whatsNewLastSeenVersion'), '1.3.0',
    'Esc must record the last-seen version');
  assert.ok(!dialog(win), 'the overlay must be removed on Esc');
  env.dom.window.close();
});

// ── (i) primary CTA → ./help.html + writes keys ─────────────────────────────
test('primary CTA targets ./help.html and dismissing via it sets both keys', function () {
  var env = buildWindow();
  env.AC.showWelcome(false);
  var win = env.win;
  var primary = dialog(win).querySelector('.welcome-cta--primary');
  assert.strictEqual(primary.getAttribute('href'), './help.html',
    'the primary CTA navigation target must be ./help.html (D-11)');
  // Suppress jsdom's not-implemented navigation while still exercising dismiss.
  primary.addEventListener('click', function (e) { e.preventDefault(); });
  click(win, primary);
  assert.strictEqual(win.localStorage.getItem('sg.welcomeSeen'), '1',
    'dismissing via the primary CTA must set sg.welcomeSeen=1');
  assert.strictEqual(win.localStorage.getItem('sg.whatsNewLastSeenVersion'), '1.3.0',
    'dismissing via the primary CTA must record the last-seen version');
  env.dom.window.close();
});

// ── (j) eligible-false-after-seen ───────────────────────────────────────────
test('after sg.welcomeSeen=1, run() does NOT mount the welcome overlay', function () {
  var env = buildWindow();
  env.win.localStorage.setItem('sg.welcomeSeen', '1');
  env.AC.run();
  assert.ok(!dialog(env.win), 'welcome must be ineligible once sg.welcomeSeen is set');
  env.dom.window.close();
});

// ── (k) replay does NOT re-arm ──────────────────────────────────────────────
test('replay — showWelcome(true) then dismiss writes NONE of the three keys', function () {
  var env = buildWindow();
  var win = env.win;
  win.localStorage.removeItem('sg.welcomeSeen');
  win.localStorage.removeItem('sg.whatsNewLastSeenVersion');
  win.sessionStorage.removeItem('sg.surfaceShownThisSession');
  env.AC.showWelcome(true);
  var dlg = dialog(win);
  assert.ok(dlg, 'replay must still mount the overlay');
  click(win, dlg.querySelector('.welcome-cta--secondary'));
  assert.strictEqual(win.localStorage.getItem('sg.welcomeSeen'), null,
    'replay dismiss must NOT set sg.welcomeSeen');
  assert.strictEqual(win.localStorage.getItem('sg.whatsNewLastSeenVersion'), null,
    'replay dismiss must NOT set sg.whatsNewLastSeenVersion');
  assert.strictEqual(win.sessionStorage.getItem('sg.surfaceShownThisSession'), null,
    'replay must NOT set the session marker');
  env.dom.window.close();
});

console.log('\n40-welcome-overlay: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
