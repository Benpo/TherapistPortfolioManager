/**
 * tests/46.1-nav-guard-coverage.test.js — EVERY same-tab internal navigation
 * trigger on add-session.html is dirty-guarded, not just the logo + the bottom
 * "Back to Overview" link.
 *
 * RED-first: today only three triggers carry App.installNavGuard (brand logo,
 * settings gear, back-to-overview). The five header nav links renderNav injects
 * (Overview / Sessions / Reporting / Add Client / Add Session) and the help
 * popover's destination rows (Help center, What's new) navigate the tab away
 * unguarded — a dirty form falls through to the native beforeunload dialog
 * instead of the app's leave-page confirm.
 *
 * HARNESS: the REAL add-session.html page with the REAL assets/app.js (so
 * initCommon genuinely renders the nav + help popover and installNavGuard's
 * real click interception runs), booted through the captured async
 * DOMContentLoaded handler (the 25-06 docListeners pattern). App.confirmDialog
 * is patched to a counting stub resolving false ("stay"), so an intercepted
 * click is observable two ways: the click event is defaultPrevented AND the
 * dialog fired.
 *
 * FALSIFIABLE + audit-complete: the trigger list is ENUMERATED FROM THE LIVE
 * DOM (every same-origin, same-tab, non-hash <a href> after boot — static and
 * injected alike), never hardcoded, so a future internal nav anchor added to
 * the page FAILS this test until it is guarded. mailto:/_blank/hash anchors are
 * excluded — they never navigate this tab away.
 *
 * Run: node tests/46.1-nav-guard-coverage.test.js — exit 0 pass, 1 fail.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createMockPortfolioDB = require('./_helpers/mock-portfolio-db').createMockPortfolioDB;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle(n) { for (var i = 0; i < (n || 8); i++) { await flush(); } }

// Boot the real page (new-session flow) with the REAL App so initCommon renders
// the header nav + help popover and the real installNavGuard handles clicks.
function buildEnv() {
  var html = readAsset('add-session.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/add-session.html',
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
  win.BroadcastChannel = function () {
    return { postMessage: function () {}, close: function () {}, addEventListener: function () {} };
  };
  win.document.execCommand = function () { return false; };

  // Capture the page's async DOMContentLoaded handlers (app.js may register its
  // own alongside add-session.js's) so boot can await them deterministically.
  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  win.PortfolioDB = createMockPortfolioDB({
    clients: [{ id: 1, name: 'Test Client' }],
    sessions: [],
  });

  // The page's own script order: i18n before app.js; date-format + export-modal
  // before add-session.js.
  win.eval(readAsset('assets/i18n-en.js'));
  win.eval(readAsset('assets/i18n.js'));
  win.eval(readAsset('assets/date-format.js'));
  win.eval(readAsset('assets/app.js'));

  // Patch the REAL App's confirmDialog with a counting, controllable stub —
  // installNavGuard resolves App.confirmDialog at click time, so the patch is
  // what every guard invokes.
  var confirmRef = { value: false, calls: 0 };
  win.App.confirmDialog = function () { confirmRef.calls++; return Promise.resolve(confirmRef.value); };

  win.eval(readAsset('assets/export-modal.js'));
  win.eval(readAsset('assets/add-session.js'));

  if (captured.length < 1) {
    throw new Error('expected at least 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, handlers: captured, confirmRef: confirmRef };
}

async function boot(env) {
  for (var i = 0; i < env.handlers.length; i++) { await env.handlers[i](); }
  await settle();
}

// Make the new-session form dirty through an observable user action.
function dirtyForm(win) {
  var ta = win.document.getElementById('sessionComments');
  ta.value = 'unsaved note';
  ta.dispatchEvent(new win.Event('input', { bubbles: true, cancelable: false }));
}

// Every same-tab INTERNAL navigation anchor in the live post-boot DOM: same
// origin, http(s), no target="_blank", not a pure hash. This is the audit — it
// sees injected chrome (nav links, gear, help popover rows) and static HTML
// alike, and grows automatically with the page.
function internalNavAnchors(win) {
  var out = [];
  win.document.querySelectorAll('a[href]').forEach(function (a) {
    if (a.getAttribute('target') === '_blank') return;
    var raw = a.getAttribute('href') || '';
    if (!raw || raw.charAt(0) === '#') return;
    var url;
    try { url = new win.URL(a.href, win.location.href); } catch (e) { return; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (url.origin !== win.location.origin) return;
    out.push(a);
  });
  return out;
}

function describeAnchor(a) {
  return '<a href="' + a.getAttribute('href') + '" class="' + (a.className || '') + '">';
}

function clickEvent(win, el) {
  var ev = new win.MouseEvent('click', { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  return ev;
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // A. The audit surface is real: boot renders the nav links AND the help
  //    popover destination rows (a tiny anchor list would make B vacuous).
  await test('boot renders the header nav links and help popover rows (audit surface is non-vacuous)', async function () {
    var env = buildEnv();
    var win = env.win;
    await boot(env);

    var navLinks = win.document.querySelectorAll('#nav-placeholder .app-nav a[href]');
    assert.ok(navLinks.length >= 5, 'renderNav injected the header nav links (got ' + navLinks.length + ')');
    var helpCenter = win.document.querySelector('.help-entry-popover a[href="./help.html"]');
    assert.ok(helpCenter, 'the help popover carries the Help center destination row');
    var whatsNew = win.document.querySelector('.help-entry-popover a[href="./changelog.html"]');
    assert.ok(whatsNew, 'the help popover carries the What\'s new destination row');
    var all = internalNavAnchors(win);
    assert.ok(all.length >= 9,
      'the enumerated internal-nav anchor set covers the whole page (got ' + all.length + ')');

    env.dom.window.close();
  });

  // B. THE CONTRACT: while the form is dirty, EVERY enumerated internal nav
  //    anchor's click is intercepted by a guard (defaultPrevented + the app
  //    dialog fires) — no trigger falls through to the native dialog.
  await test('while dirty, every same-tab internal nav anchor is intercepted by the leave-page guard', async function () {
    var env = buildEnv();
    var win = env.win;
    await boot(env);

    dirtyForm(win);
    await settle();
    assert.strictEqual(win.PortfolioFormDirty(), true, 'precondition: the form is dirty');

    var anchors = internalNavAnchors(win);
    var unguarded = [];
    for (var i = 0; i < anchors.length; i++) {
      var before = env.confirmRef.calls;
      var ev = clickEvent(win, anchors[i]);
      await settle(2);
      if (!ev.defaultPrevented || env.confirmRef.calls === before) {
        unguarded.push(describeAnchor(anchors[i]));
      }
    }
    assert.strictEqual(unguarded.length, 0,
      'every internal nav trigger must be guarded while dirty; unguarded: ' + unguarded.join(', '));

    env.dom.window.close();
  });

  // C. Guards stay out of the way when the form is CLEAN: default navigation
  //    proceeds (no preventDefault, no dialog).
  await test('while clean, no internal nav anchor is blocked and no dialog fires', async function () {
    var env = buildEnv();
    var win = env.win;
    await boot(env);

    assert.strictEqual(win.PortfolioFormDirty(), false, 'precondition: the form is clean');
    var anchors = internalNavAnchors(win);
    var blocked = [];
    for (var i = 0; i < anchors.length; i++) {
      var ev = clickEvent(win, anchors[i]);
      await settle(2);
      if (ev.defaultPrevented) blocked.push(describeAnchor(anchors[i]));
    }
    assert.strictEqual(blocked.length, 0,
      'a clean form must never block navigation; blocked: ' + blocked.join(', '));
    assert.strictEqual(env.confirmRef.calls, 0, 'no leave-page dialog fires while clean');

    env.dom.window.close();
  });

  // D. Cancel keeps the user on the page with the form intact; the dialog fired
  //    through the app's confirm seam (the i18n keys ride installNavGuard's
  //    locked message contract).
  await test('cancelling the dialog keeps the edits (dirty state survives a refused leave)', async function () {
    var env = buildEnv();
    var win = env.win;
    await boot(env);

    dirtyForm(win);
    await settle();
    env.confirmRef.value = false;
    var navLink = win.document.querySelector('#nav-placeholder .app-nav a[data-nav="sessions"]');
    assert.ok(navLink, 'the Sessions nav link exists');
    var ev = clickEvent(win, navLink);
    await settle(2);
    assert.ok(ev.defaultPrevented, 'the click was intercepted');
    assert.ok(env.confirmRef.calls >= 1, 'the leave-page dialog fired');
    assert.strictEqual(win.PortfolioFormDirty(), true, 'the form is still dirty (edits kept)');
    assert.strictEqual(win.document.getElementById('sessionComments').value, 'unsaved note',
      'the edited field content survived the refused leave');

    env.dom.window.close();
  });

  var EXPECTED_COUNT = 4;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nGUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped.');
    process.exit(1);
  }

  console.log('');
  console.log('46.1-nav-guard-coverage — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (e) { console.error(e); process.exit(1); });
