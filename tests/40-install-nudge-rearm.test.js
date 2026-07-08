/**
 * tests/40-install-nudge-rearm.test.js — Phase 40 Plan 06 (ONBD-03 / ONBD-04)
 * behavior guard for the Pitfall-1 re-arm in assets/attention-coordinator.js.
 *
 * WHY THIS EXISTS
 *   AttentionCoordinator.run() executes ONCE at DOMContentLoaded, BEFORE Chrome's
 *   late-firing `beforeinstallprompt`. At run() time deferredPrompt is null, so
 *   installEligible() (= !!deferredPrompt || isMacSafari()) is false and the
 *   install nudge can never win the slot. The confirmed UAT gap (40-UAT.md test 3):
 *   the late event only STASHED deferredPrompt and never re-ran arbitration, so the
 *   nudge never appeared on any Chromium session. The fix re-runs run() inside the
 *   beforeinstallprompt handler after stashing the prompt — run()'s own guards keep
 *   one-per-session (D-02) and PRECEDENCE (D-01) intact by construction.
 *
 * WHAT THIS PINS (observable behavior through the real coordinator):
 *   (i)   RE-ARM  — a beforeinstallprompt that fires AFTER run() still surfaces the
 *         install nudge THIS session (the whole point of the fix).
 *   (ii)  D-02 PRESERVED — a late prompt is suppressed when the one-per-session slot
 *         was already claimed by another surface.
 *   (iii) PRECEDENCE PRESERVED — a late prompt routes through run()'s PRECEDENCE
 *         order, so welcome (higher precedence, eligible) still wins — the re-arm is
 *         never a direct install-nudge show().
 *
 * HARNESS: mirrors tests/40-install-nudge.test.js — evals assets/i18n-en.js then
 * assets/attention-coordinator.js into an isolated jsdom window with a controllable
 * matchMedia (display-mode / pointer:coarse / max-width:820px), an overridable
 * navigator.userAgent, win.App / win.AppVersion, and an injectPrompt(win) helper
 * that dispatches a real 'beforeinstallprompt' Event carrying a prompt() spy (the
 * module's capture listener stashes it). The desktop default window is
 * non-standalone, pointer:fine, wide — so the ONLY thing gating install eligibility
 * is the presence of a captured deferredPrompt.
 *
 * ENVIRONMENTAL CAVEAT: Chrome fires beforeinstallprompt only when PWA install
 * criteria + engagement heuristics are met, so the true browser-mediated flow stays
 * a human UAT check — jsdom can prove the re-arm wiring but not Chrome's heuristics.
 *
 * AUTHORED RED — this file MUST FAIL today (the current handler stashes deferredPrompt
 * but never re-runs arbitration). Task 2 makes it GREEN. Do NOT weaken any case.
 *
 * Run: node tests/40-install-nudge-rearm.test.js — exits 0 on full pass, 1 otherwise.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

var COORDINATOR_SRC = readAsset('assets/attention-coordinator.js');

// Representative UA — desktop Chromium (not phone-class, not standalone). The only
// eligibility lever left is a captured deferredPrompt.
var UA = {
  chromeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
    + '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// Build an isolated jsdom window with the coordinator evaluated in. Defaults model
// a desktop non-standalone, pointer:fine, wide browser.
//   opts.ua         — navigator.userAgent string
//   opts.standalone — matchMedia('(display-mode: standalone)') matches
//   opts.coarse     — matchMedia('(pointer: coarse)') matches
//   opts.narrow     — matchMedia('(max-width: 820px)') matches
function buildWindow(opts) {
  opts = opts || {};
  var dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url: 'https://localhost/index.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  // jsdom ignores the constructor userAgent option — override the instance getter.
  Object.defineProperty(win.navigator, 'userAgent', {
    value: opts.ua || UA.chromeWin,
    configurable: true,
  });

  win.matchMedia = function (q) {
    var matches = false;
    if (q.indexOf('display-mode: standalone') !== -1) matches = !!opts.standalone;
    else if (q.indexOf('pointer: coarse') !== -1) matches = !!opts.coarse;
    else if (q.indexOf('max-width: 820px') !== -1) matches = !!opts.narrow;
    return {
      matches: matches,
      media: q,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };

  // navigator.userAgentData is not implemented by jsdom — leave it undefined so the
  // phone-class probe falls back to the (false) matchMedia signals.
  Object.defineProperty(win.navigator, 'userAgentData', {
    value: undefined,
    configurable: true,
  });

  win.App = {
    lockBodyScroll: function () {}, unlockBodyScroll: function () {},
  };
  win.AppVersion = { APP_VERSION: '1.3.0' };
  win.eval(readAsset('assets/i18n-en.js'));
  win.I18N_DEFAULT = 'en';
  win.eval(COORDINATOR_SRC);
  if (!win.AttentionCoordinator || typeof win.AttentionCoordinator.run !== 'function') {
    throw new Error('attention-coordinator.js did not expose run() (arbitration entry point)');
  }
  return { dom: dom, win: win, AC: win.AttentionCoordinator };
}

// Dispatch a synthetic captured beforeinstallprompt carrying a prompt() spy; the
// module's capture listener stashes it as the deferred prompt (and, once fixed,
// re-runs arbitration).
function injectPrompt(win) {
  var spy = { calls: 0 };
  var e = new win.Event('beforeinstallprompt');
  e.prompt = function () { spy.calls++; return Promise.resolve(); };
  e.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
  win.dispatchEvent(e);
  return spy;
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ═══════════════════════════════ RE-ARM BEHAVIOR ══════════════════════════════

// ── (i) RE-ARM: a late prompt surfaces the nudge in the SAME session ─────────
test('rearm (i) a beforeinstallprompt firing AFTER run() surfaces the install nudge this session', function () {
  var env = buildWindow({ ua: UA.chromeWin });
  // Welcome is out of the way, so install-nudge is the eligible surface once a
  // prompt arrives (welcome sits above install-nudge in PRECEDENCE).
  env.win.localStorage.setItem('sg.welcomeSeen', '1');

  // Models the DOMContentLoaded run() BEFORE the late event: deferredPrompt is null,
  // so installEligible() is false and nothing shows / no slot is claimed.
  env.AC.run();
  assert.strictEqual(env.win.sessionStorage.getItem('sg.surfaceShownThisSession'), null,
    'the pre-prompt run() must not claim the one-per-session slot (nothing was eligible)');
  assert.strictEqual(env.win.document.querySelector('.install-nudge-card'), null,
    'no install card may mount before a prompt is captured');

  // The late beforeinstallprompt fires — the re-arm must re-run arbitration.
  injectPrompt(env.win);
  assert.ok(env.win.document.querySelector('.install-nudge-card'),
    'the late-firing prompt must re-arm arbitration and surface the install nudge this session');
  assert.strictEqual(env.win.sessionStorage.getItem('sg.surfaceShownThisSession'), '1',
    'the real show must now claim the one-per-session slot');
  env.dom.window.close();
});

// ── (ii) D-02 PRESERVED: a claimed slot suppresses the late prompt ──────────
test('rearm (ii) a late prompt is suppressed when the one-per-session slot is already claimed (D-02)', function () {
  var env = buildWindow({ ua: UA.chromeWin });
  // Model another surface (e.g. welcome) having already claimed this session's slot.
  env.win.sessionStorage.setItem('sg.surfaceShownThisSession', '1');

  injectPrompt(env.win);
  assert.strictEqual(env.win.document.querySelector('.install-nudge-card'), null,
    'run()\'s one-per-session guard must early-return; the re-arm must NOT override a claimed slot');
  env.dom.window.close();
});

// ── (iii) PRECEDENCE PRESERVED: welcome still wins over install-nudge ───────
test('rearm (iii) a late prompt never jumps ahead of an eligible welcome (PRECEDENCE / D-01)', function () {
  var env = buildWindow({ ua: UA.chromeWin });
  // Leave sg.welcomeSeen UNSET → welcome is eligible; do NOT pre-claim the slot.
  injectPrompt(env.win); // fires before any explicit run()

  assert.ok(env.win.document.querySelector('.welcome-overlay'),
    'the re-arm must route through run()\'s PRECEDENCE order — welcome (higher) wins');
  assert.strictEqual(env.win.document.querySelector('.install-nudge-card'), null,
    'install-nudge must NOT surface while a higher-precedence welcome is eligible');
  assert.strictEqual(env.win.sessionStorage.getItem('sg.surfaceShownThisSession'), '1',
    'welcome\'s real show claims the slot — proving the re-arm went through run(), not a direct show');
  env.dom.window.close();
});

console.log('\n40-install-nudge-rearm: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
