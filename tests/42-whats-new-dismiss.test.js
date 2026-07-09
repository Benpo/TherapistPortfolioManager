/**
 * tests/42-whats-new-dismiss.test.js — Phase 42 Plan 01 (CHLG-01) Wave-0 RED
 * behavior guard for the What's-New popup's content, a11y, and deliberate-dismiss
 * contract.
 *
 * WHAT THIS PINS (observable DOM + storage behavior via the surface reached at
 * AttentionCoordinator._getSurface('whats-new').show(), and the literal storage
 * key 'sg.whatsNewLastSeenVersion'):
 *   T-42-V5 (content + a11y): show() mounts a [role="dialog"] with
 *     aria-modal="true" and aria-labelledby pointing at the headline; the
 *     headline text includes the running APP_VERSION (1.3.0 / major-minor form);
 *     each of the fixture entry's 2-4 highlights renders as textContent; focus is
 *     moved into the dialog on mount.
 *   T-42-V4 (deliberate-dismiss, D-09): a backdrop / outside click is a NO-OP —
 *     the popup stays mounted and sg.whatsNewLastSeenVersion is unchanged; each of
 *     (Close click, Escape keydown, the "See everything new" CTA) removes the
 *     overlay AND writes sg.whatsNewLastSeenVersion === APP_VERSION. No
 *     overlay/backdrop-click dismiss handler exists.
 *
 * HARNESS: mirrors tests/40-welcome-overlay.test.js — eval assets/attention-
 * coordinator.js then assets/whats-new.js into an isolated jsdom window, seeding
 * window.App (scroll-lock spies), window.AppVersion = { APP_VERSION: '1.3.0' },
 * a window.CHANGELOG_CONTENT_EN fixture whose latest entry has 3 highlights, and
 * window.I18N.en.
 *
 * Read-only: EVALs assets/* into a jsdom window; writes no assets/*.
 * Authored RED — assets/whats-new.js does NOT exist yet (Plan 05 ships it), so
 * buildWindow() throws on load and every case fails RED for the right reason.
 * Do NOT weaken to green.
 *
 * Run: node tests/42-whats-new-dismiss.test.js — exits 0 on full pass, 1 otherwise.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

var APP_VERSION = '1.3.0';
var LAST_SEEN_KEY = 'sg.whatsNewLastSeenVersion';
// The three fixture highlights the popup body must render verbatim as textContent.
var HIGHLIGHTS = ['Log a session in one screen', 'Export a polished client PDF', 'Back up your whole portfolio'];

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
  win.AppVersion = { APP_VERSION: APP_VERSION };
  win.eval(readAsset('assets/i18n-en.js'));
  win.I18N_DEFAULT = 'en';
  win.CHANGELOG_CONTENT_EN = [{
    version: APP_VERSION,
    anchor: 'v1-3-0',
    date: '2026-07-09',
    lede: 'The v1.3 release',
    highlights: HIGHLIGHTS.slice(),   // 3 highlights (within the 2-4 contract)
    categories: { new: ['In-app changelog'], improved: ['Faster export'] },
  }];
  win.eval(readAsset('assets/attention-coordinator.js'));
  // Plan 05 artifact — absent in Wave 0. readAsset throws ENOENT here → RED.
  win.eval(readAsset('assets/whats-new.js'));
  return { dom: dom, win: win, AC: win.AttentionCoordinator };
}

function popup(win) { return win.document.querySelector('[role="dialog"][aria-modal="true"]'); }
function backdrop(win) { return win.document.querySelector('.whats-new-overlay'); }
function click(win, el) { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true })); }

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ── T-42-V5 — content + a11y ─────────────────────────────────────────────────
test('T-42-V5 content+a11y — show() mounts a role=dialog aria-modal popup, headline carries the version, all highlights render as text, focus enters the dialog', function () {
  var env = buildWindow();
  var win = env.win;
  env.AC._getSurface('whats-new').show();
  var dlg = popup(win);
  assert.ok(dlg, 'show() must mount a [role="dialog"][aria-modal="true"] popup');
  var labelledby = dlg.getAttribute('aria-labelledby');
  assert.ok(labelledby, 'the dialog must carry aria-labelledby');
  var heading = win.document.getElementById(labelledby);
  assert.ok(heading, 'aria-labelledby must point at a real headline element');
  assert.ok(/1\.3(\.0)?/.test(heading.textContent),
    'the headline must include the running APP_VERSION (1.3.0 / major-minor form); got: ' + heading.textContent);
  // Each fixture highlight must appear verbatim as textContent somewhere in the body.
  var bodyText = dlg.textContent;
  HIGHLIGHTS.forEach(function (h) {
    assert.ok(bodyText.indexOf(h) !== -1, 'the popup body must render the highlight text: "' + h + '"');
  });
  assert.ok(dlg.contains(win.document.activeElement),
    'focus must be moved into the dialog on mount (aria-modal focus contract)');
  env.dom.window.close();
});

// ── T-42-V4a — backdrop click is a NO-OP ─────────────────────────────────────
test('T-42-V4 backdrop no-op — an outside/backdrop click leaves the popup mounted and lastSeen unchanged', function () {
  var env = buildWindow();
  var win = env.win;
  env.AC._getSurface('whats-new').show();
  var bd = backdrop(win);
  assert.ok(bd, 'a .whats-new-overlay backdrop must wrap the popup');
  assert.ok(bd !== popup(win), 'the backdrop must be a separate node from the [role=dialog] popup');
  click(win, bd);   // click the backdrop itself (outside the popup panel)
  assert.ok(popup(win), 'a backdrop click must NOT dismiss the popup (D-09 deliberate-dismiss)');
  assert.strictEqual(win.localStorage.getItem(LAST_SEEN_KEY), null,
    'a backdrop click must NOT write ' + LAST_SEEN_KEY);
  env.dom.window.close();
});

// ── T-42-V4b — the three deliberate dismiss paths write lastSeen ─────────────
test('T-42-V4 Close click — removes the overlay and writes lastSeen=APP_VERSION', function () {
  var env = buildWindow();
  var win = env.win;
  env.AC._getSurface('whats-new').show();
  var closeBtn = win.document.querySelector('.whats-new-close');
  assert.ok(closeBtn, 'a .whats-new-close control must exist');
  click(win, closeBtn);
  assert.ok(!popup(win), 'Close must remove the popup');
  assert.strictEqual(win.localStorage.getItem(LAST_SEEN_KEY), APP_VERSION,
    'Close must write ' + LAST_SEEN_KEY + ' = APP_VERSION');
  env.dom.window.close();
});

test('T-42-V4 Escape key — removes the overlay and writes lastSeen=APP_VERSION', function () {
  var env = buildWindow();
  var win = env.win;
  env.AC._getSurface('whats-new').show();
  win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.ok(!popup(win), 'Escape must remove the popup');
  assert.strictEqual(win.localStorage.getItem(LAST_SEEN_KEY), APP_VERSION,
    'Escape must write ' + LAST_SEEN_KEY + ' = APP_VERSION');
  env.dom.window.close();
});

test('T-42-V4 "See everything new" CTA — removes the overlay and writes lastSeen=APP_VERSION', function () {
  var env = buildWindow();
  var win = env.win;
  env.AC._getSurface('whats-new').show();
  var seeAll = win.document.querySelector('.whats-new-seeall');
  assert.ok(seeAll, 'a .whats-new-seeall CTA must exist');
  // Neutralize jsdom navigation while still exercising the dismiss side effect.
  seeAll.addEventListener('click', function (e) { if (e && e.preventDefault) e.preventDefault(); });
  click(win, seeAll);
  assert.ok(!popup(win), 'the "See everything new" CTA must remove the popup');
  assert.strictEqual(win.localStorage.getItem(LAST_SEEN_KEY), APP_VERSION,
    'the "See everything new" CTA must write ' + LAST_SEEN_KEY + ' = APP_VERSION');
  env.dom.window.close();
});

console.log('\n42-whats-new-dismiss: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
