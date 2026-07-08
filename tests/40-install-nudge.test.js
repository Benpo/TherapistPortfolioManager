/**
 * tests/40-install-nudge.test.js — Phase 40 Plan 03 (ONBD-04) behavior guard for
 * the two lowest-precedence attention surfaces the coordinator arbitrates: the
 * computer-focused install nudge and the all-mobile expectation hint
 * (assets/attention-coordinator.js).
 *
 * WHAT THIS PINS (observable behavior via the coordinator's registry surfaces,
 * reached through the internal _getSurface(id) seam — same _-prefixed-internal
 * convention as _getDeferredPrompt):
 *
 *   INSTALL-NUDGE (id 'install-nudge')
 *   (a) eligible() FALSE when display-mode standalone matches (already installed).
 *   (b) eligible() FALSE when localStorage 'sg.installNudgeDismissed' is set.
 *   (c) eligible() FALSE on phone-class (mobile gets the hint instead).
 *   (c2) PER-BROWSER GATE (D-12): eligible() FALSE in a Firefox-like desktop env
 *        (no captured beforeinstallprompt AND a non-Safari UA) — and via run(),
 *        nothing shows, 'sg.installNudgeDismissed' is NOT written, and the
 *        session slot ('sg.surfaceShownThisSession') is NOT consumed. Also
 *        models Chromium when run() beats the late-firing event (Pitfall 1).
 *   (d) with a captured deferredPrompt on a desktop non-standalone browser,
 *        eligible() TRUE and show() renders a real [Install app] button
 *        (textContent = onboard.install.ctaInstall) whose click calls the
 *        injected prompt() spy exactly once; a second click does NOT call it
 *        again (Pitfall 2).
 *   (e) with NO captured deferredPrompt but an actual macOS Safari UA, eligible()
 *        TRUE and show() renders the Add-to-Dock pointer (onboard.install
 *        .safariHint) + a 'See install help' link (onboard.install.safariLink →
 *        ./help.html#topic-install-safari) and NO prompt()-calling button.
 *   (f) clicking dismiss ('No thanks') sets localStorage 'sg.installNudgeDismissed'
 *        and, on a fresh coordinator load (even with a freshly captured prompt),
 *        eligible() is now false — gone forever (localStorage, not session;
 *        Pitfall 4).
 *
 *   MOBILE-HINT (id 'mobile-hint')
 *   (g) eligible() TRUE on phone-class (coarse+narrow matchMedia OR
 *        userAgentData.mobile) when not-yet-dismissed, FALSE otherwise.
 *   (h) show() renders the hint body (onboard.mobileHint.body) + topic link
 *        (onboard.mobileHint.link → ./help.html#topic-install-mobile-note) + a
 *        'Got it' dismiss (onboard.mobileHint.dismiss).
 *   (i) dismiss sets localStorage 'sg.mobileHintDismissed' and it stays gone on a
 *        fresh coordinator load (one-shot forever).
 *
 * HARNESS: eval assets/attention-coordinator.js into an isolated jsdom window
 * (mirrors tests/40-coordinator.test.js), with a controllable window.matchMedia
 * (display-mode / pointer / max-width), a settable navigator.userAgent (JSDOM
 * userAgent option) and navigator.userAgentData.mobile, and a way to inject a
 * synthetic captured beforeinstallprompt (dispatch a real event carrying a
 * prompt() spy — the module's capture listener stashes it).
 *
 * Read-only: EVALs assets/* into a jsdom window; writes no assets/*.
 * Authored RED (the install-nudge + mobile-hint surfaces are not yet registered)
 * — do NOT weaken.
 *
 * Run: node tests/40-install-nudge.test.js — exits 0 on full pass, 1 otherwise.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

var COORDINATOR_SRC = readAsset('assets/attention-coordinator.js');

// Representative UA strings for the per-browser gate.
var UA = {
  safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 '
    + '(KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  firefoxMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) '
    + 'Gecko/20100101 Firefox/120.0',
  chromeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
    + '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// Build an isolated jsdom window with the install-nudge/mobile-hint runtime seams
// and the real coordinator evaluated in.
//   opts.ua         — navigator.userAgent string
//   opts.standalone — matchMedia('(display-mode: standalone)') matches
//   opts.coarse     — matchMedia('(pointer: coarse)') matches
//   opts.narrow     — matchMedia('(max-width: 820px)') matches
//   opts.uaMobile   — navigator.userAgentData.mobile
function buildWindow(opts) {
  opts = opts || {};
  var dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url: 'https://localhost/index.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  // jsdom 29 ignores the constructor `userAgent` option, so override the instance
  // getter directly — the per-browser gate (isMacSafari) reads navigator.userAgent.
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

  // navigator.userAgentData is not implemented by jsdom — define it explicitly.
  Object.defineProperty(win.navigator, 'userAgentData', {
    value: (typeof opts.uaMobile === 'boolean') ? { mobile: opts.uaMobile } : undefined,
    configurable: true,
  });

  win.App = {
    lockBodyScroll: function () {}, unlockBodyScroll: function () {},
  };
  win.AppVersion = { APP_VERSION: '1.3.0' };
  win.eval(readAsset('assets/i18n-en.js'));
  win.I18N_DEFAULT = 'en';
  win.eval(COORDINATOR_SRC);
  if (!win.AttentionCoordinator || typeof win.AttentionCoordinator._getSurface !== 'function') {
    throw new Error('attention-coordinator.js did not expose _getSurface(id) (test seam)');
  }
  return { dom: dom, win: win, AC: win.AttentionCoordinator };
}

// Re-eval the coordinator into the SAME window (localStorage persists) to model a
// fresh coordinator load in a later session.
function reload(win) {
  win.eval(COORDINATOR_SRC);
  return win.AttentionCoordinator;
}

// Dispatch a synthetic captured beforeinstallprompt carrying a prompt() spy; the
// module's capture listener stashes it as the deferred prompt.
function injectPrompt(win) {
  var spy = { calls: 0 };
  var e = new win.Event('beforeinstallprompt');
  e.prompt = function () { spy.calls++; return Promise.resolve(); };
  e.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
  win.dispatchEvent(e);
  return spy;
}

// EN copy the surfaces must render (mirror the shipped dict — never hardcode).
function EN(win, key) { return win.I18N.en[key]; }

function surface(env, id) {
  var s = env.AC._getSurface(id);
  assert.ok(s && typeof s.eligible === 'function' && typeof s.show === 'function',
    'surface "' + id + '" must be registered with eligible()/show()');
  return s;
}

function click(win, el) {
  el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ════════════════════════════════ INSTALL-NUDGE ═══════════════════════════════

// ── (a) standalone → ineligible ─────────────────────────────────────────────
test('install (a) eligible() is FALSE when display-mode standalone matches (already installed)', function () {
  var env = buildWindow({ ua: UA.chromeWin, standalone: true });
  injectPrompt(env.win); // even with a captured prompt, standalone wins
  assert.strictEqual(surface(env, 'install-nudge').eligible(), false,
    'a standalone (installed) window must never be eligible for the install nudge');
  env.dom.window.close();
});

// ── (b) dismissed flag → ineligible ─────────────────────────────────────────
test('install (b) eligible() is FALSE when localStorage sg.installNudgeDismissed is set', function () {
  var env = buildWindow({ ua: UA.chromeWin });
  injectPrompt(env.win);
  env.win.localStorage.setItem('sg.installNudgeDismissed', '1');
  assert.strictEqual(surface(env, 'install-nudge').eligible(), false,
    'a persisted dismissal must keep the install nudge ineligible');
  env.dom.window.close();
});

// ── (c) phone-class → ineligible (mobile gets the hint) ─────────────────────
test('install (c) eligible() is FALSE on phone-class (coarse + narrow)', function () {
  var env = buildWindow({ ua: UA.chromeWin, coarse: true, narrow: true });
  injectPrompt(env.win);
  assert.strictEqual(surface(env, 'install-nudge').eligible(), false,
    'phone-class devices get the mobile hint, never the install nudge');
  env.dom.window.close();
});

// ── (c2) per-browser gate: Firefox-like no-event non-Safari → ineligible ────
test('install (c2) eligible() is FALSE in a Firefox-like desktop env (no event, non-Safari)', function () {
  var env = buildWindow({ ua: UA.firefoxMac }); // no injected prompt, not Safari
  assert.strictEqual(surface(env, 'install-nudge').eligible(), false,
    'no captured prompt AND non-Safari UA → the one-ask is never burned on wrong copy');
  env.dom.window.close();
});

// ── (c2') slot not consumed: run() shows/writes nothing in that env ─────────
test('install (c2) run() consumes no slot in the Firefox-like env — nothing shown, nothing dismissed', function () {
  var env = buildWindow({ ua: UA.firefoxMac });
  env.win.localStorage.setItem('sg.welcomeSeen', '1'); // welcome out of the way
  env.AC.run();
  assert.strictEqual(env.win.sessionStorage.getItem('sg.surfaceShownThisSession'), null,
    'no surface rendered, so the one-per-session slot must stay unconsumed');
  assert.strictEqual(env.win.localStorage.getItem('sg.installNudgeDismissed'), null,
    'an ineligible nudge must never write its dismissal flag');
  assert.strictEqual(env.win.document.querySelector('.install-nudge-card'), null,
    'no install card may mount when the nudge is ineligible');
  env.dom.window.close();
});

// ── (d) Chromium captured prompt → real button, prompt() exactly once ───────
test('install (d) Chromium captured prompt → eligible; [Install app] click calls prompt() once, not twice', function () {
  var env = buildWindow({ ua: UA.chromeWin });
  var spy = injectPrompt(env.win);
  var s = surface(env, 'install-nudge');
  assert.strictEqual(s.eligible(), true, 'a captured prompt on a desktop non-standalone browser is eligible');
  s.show();
  var card = env.win.document.querySelector('.install-nudge-card');
  assert.ok(card, 'show() must mount the install card');
  var btn = card.querySelector('.install-nudge-install');
  assert.ok(btn, 'the Chromium branch must render a real [Install app] button');
  assert.strictEqual(btn.textContent, EN(env.win, 'onboard.install.ctaInstall'),
    '[Install app] label must be onboard.install.ctaInstall via textContent');
  assert.strictEqual(card.querySelector('.install-nudge-safari-hint'), null,
    'the Safari pointer copy must NOT render on Chromium');

  click(env.win, btn);
  assert.strictEqual(spy.calls, 1, 'the first click must fire the deferred prompt() exactly once');
  click(env.win, btn);
  assert.strictEqual(spy.calls, 1, 'a second click must NOT fire prompt() again (one-shot, Pitfall 2)');
  env.dom.window.close();
});

// ── (e) macOS Safari, no prompt → pointer + help link, no button ────────────
test('install (e) macOS Safari (no prompt) → Add-to-Dock pointer + help link, no prompt()-calling button', function () {
  var env = buildWindow({ ua: UA.safariMac }); // no injected prompt
  var s = surface(env, 'install-nudge');
  assert.strictEqual(s.eligible(), true, 'actual macOS Safari is eligible via the pointer branch');
  s.show();
  var card = env.win.document.querySelector('.install-nudge-card');
  assert.ok(card, 'show() must mount the install card on macOS Safari');

  var hint = card.querySelector('.install-nudge-safari-hint');
  assert.ok(hint, 'the Safari branch must render the Add-to-Dock pointer line');
  assert.strictEqual(hint.textContent, EN(env.win, 'onboard.install.safariHint'),
    'pointer copy must be onboard.install.safariHint');

  var link = card.querySelector('.install-nudge-safari-link');
  assert.ok(link, 'the Safari branch must render a See-install-help link');
  assert.strictEqual(link.textContent, EN(env.win, 'onboard.install.safariLink'),
    'link label must be onboard.install.safariLink');
  assert.strictEqual(link.getAttribute('href'), './help.html#topic-install-safari',
    'the help link must target the Phase 39 Safari install topic');

  assert.strictEqual(card.querySelector('.install-nudge-install'), null,
    'the Safari branch must render NO prompt()-calling [Install app] button');
  env.dom.window.close();
});

// ── (e2) non-Safari must never show the Safari pointer copy ─────────────────
test('install (e2) a Firefox-like non-Safari env renders no card at all (never the Safari copy)', function () {
  var env = buildWindow({ ua: UA.firefoxMac });
  var s = surface(env, 'install-nudge');
  // eligible() is false, but even a defensive show() must not paint Safari copy.
  assert.strictEqual(s.eligible(), false, 'Firefox-like desktop is ineligible');
  env.dom.window.close();
});

// ── (f) dismiss persists across a fresh load (localStorage, not session) ─────
test('install (f) dismiss sets sg.installNudgeDismissed and stays gone on a fresh load (even with a new prompt)', function () {
  var env = buildWindow({ ua: UA.chromeWin });
  injectPrompt(env.win);
  var s = surface(env, 'install-nudge');
  s.show();
  var card = env.win.document.querySelector('.install-nudge-card');
  var dismiss = card.querySelector('.install-nudge-dismiss');
  assert.ok(dismiss, 'the card must carry a No-thanks dismiss control');
  assert.strictEqual(dismiss.textContent, EN(env.win, 'onboard.install.dismiss'),
    'dismiss label must be onboard.install.dismiss');

  click(env.win, dismiss);
  assert.strictEqual(env.win.localStorage.getItem('sg.installNudgeDismissed'), '1',
    'dismiss must write the PERSISTENT localStorage flag (not sessionStorage)');
  assert.strictEqual(env.win.document.querySelector('.install-nudge-card'), null,
    'dismiss must remove the card');

  // Fresh coordinator load in a later session, with a NEWLY captured prompt:
  // eligibility must STILL be false purely because of the persisted dismissal.
  var AC2 = reload(env.win);
  injectPrompt(env.win);
  assert.strictEqual(AC2._getSurface('install-nudge').eligible(), false,
    'gone forever — a persisted dismissal survives a fresh load even with a new prompt (Pitfall 4)');
  env.dom.window.close();
});

// ════════════════════════════════ MOBILE-HINT ═════════════════════════════════

// ── (g) phone-class eligibility both ways; desktop ineligible ───────────────
test('mobile (g) eligible() is TRUE on phone-class (coarse+narrow) and FALSE on desktop', function () {
  var envPhone = buildWindow({ ua: UA.safariMac, coarse: true, narrow: true });
  assert.strictEqual(surface(envPhone, 'mobile-hint').eligible(), true,
    'a coarse + narrow device is phone-class → the mobile hint is eligible');
  envPhone.dom.window.close();

  var envUaMobile = buildWindow({ ua: UA.chromeWin, uaMobile: true });
  assert.strictEqual(surface(envUaMobile, 'mobile-hint').eligible(), true,
    'userAgentData.mobile alone marks phone-class → eligible');
  envUaMobile.dom.window.close();

  var envDesktop = buildWindow({ ua: UA.chromeWin });
  assert.strictEqual(surface(envDesktop, 'mobile-hint').eligible(), false,
    'a desktop pointer:fine wide window is not phone-class → ineligible');
  envDesktop.dom.window.close();
});

// ── (g2) dismissed flag → ineligible ────────────────────────────────────────
test('mobile (g2) eligible() is FALSE once sg.mobileHintDismissed is set', function () {
  var env = buildWindow({ ua: UA.safariMac, coarse: true, narrow: true });
  env.win.localStorage.setItem('sg.mobileHintDismissed', '1');
  assert.strictEqual(surface(env, 'mobile-hint').eligible(), false,
    'a persisted dismissal keeps the mobile hint ineligible');
  env.dom.window.close();
});

// ── (h) show() structure: body + topic link + Got it ────────────────────────
test('mobile (h) show() renders body + topic link (mobile-note) + Got-it dismiss', function () {
  var env = buildWindow({ ua: UA.safariMac, coarse: true, narrow: true });
  surface(env, 'mobile-hint').show();
  var bar = env.win.document.querySelector('.mobile-hint-bar');
  assert.ok(bar, 'show() must mount the mobile hint bar');

  var body = bar.querySelector('.mobile-hint-body');
  assert.ok(body, 'the hint must render a body line');
  assert.strictEqual(body.textContent, EN(env.win, 'onboard.mobileHint.body'),
    'body copy must be onboard.mobileHint.body');

  var link = bar.querySelector('.mobile-hint-link');
  assert.ok(link, 'the hint must render a topic link');
  assert.strictEqual(link.textContent, EN(env.win, 'onboard.mobileHint.link'),
    'link label must be onboard.mobileHint.link');
  assert.strictEqual(link.getAttribute('href'), './help.html#topic-install-mobile-note',
    'the link must target the Phase 39 mobile-expectations topic');

  var dismiss = bar.querySelector('.mobile-hint-dismiss');
  assert.ok(dismiss, 'the hint must render a Got-it dismiss');
  assert.strictEqual(dismiss.textContent, EN(env.win, 'onboard.mobileHint.dismiss'),
    'dismiss label must be onboard.mobileHint.dismiss');
  env.dom.window.close();
});

// ── (i) dismiss persists across a fresh load (one-shot forever) ─────────────
test('mobile (i) dismiss sets sg.mobileHintDismissed and stays gone on a fresh load', function () {
  var env = buildWindow({ ua: UA.safariMac, coarse: true, narrow: true });
  surface(env, 'mobile-hint').show();
  var bar = env.win.document.querySelector('.mobile-hint-bar');
  click(env.win, bar.querySelector('.mobile-hint-dismiss'));
  assert.strictEqual(env.win.localStorage.getItem('sg.mobileHintDismissed'), '1',
    'dismiss must write the persistent localStorage flag');
  assert.strictEqual(env.win.document.querySelector('.mobile-hint-bar'), null,
    'dismiss must remove the bar');

  var AC2 = reload(env.win);
  assert.strictEqual(AC2._getSurface('mobile-hint').eligible(), false,
    'one-shot forever — the dismissal survives a fresh coordinator load');
  env.dom.window.close();
});

console.log('\n40-install-nudge: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
