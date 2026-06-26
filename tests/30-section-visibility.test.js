/**
 * tests/30-section-visibility.test.js — the settings→add-session cross-module
 * link: custom section title → live form label, and disabled section → hidden
 * (TEST-03, F-E/D-13c, D-08/D-09, F-A).
 *
 * ROOT CAUSE THIS CLOSES: add-session.js applySectionLabels (writes
 * App.getSectionLabel(sectionKey, defaultI18nKey) into each
 * [data-section-key] .label[data-i18n] textContent) and applySectionVisibility
 * (toggles is-hidden on a wrapper via App.isSectionEnabled) are the glue that
 * carries a therapist's Settings customizations into the live session form. This
 * mechanism sits squarely in the markdown band Phase 31 (RFCT-02 / D-13c) will
 * extract, and the step-1-checkbox filter test does NOT cover it. Nothing
 * EXECUTED this label-render / visibility wiring before this thin guard.
 *
 * THE GUARD (D-09 jsdom real-page, D-10 thin — broad != unbounded): load the REAL
 * add-session.html body + the REAL assets/add-session.js into jsdom, inject an
 * App.* stub whose isSectionEnabled / getSectionLabel returns the test drives,
 * await the REAL DOMContentLoaded handler (which registers both fns + the
 * app:settings-changed listener and runs the initial new-session render), then
 * force a re-render by invoking the CAPTURED app:settings-changed handler
 * (a document-level listener — invoked directly, not via a flaky real dispatch).
 * Assert OBSERVABLE render only (D-08): the label textContent and the is-hidden
 * class — never an internal function name.
 *
 * F-J LIMITATION (stated here AND in success criteria): the section labels come
 * from the App STUB and App.initCommon is a no-op, so a green run pins
 * add-session's ORCHESTRATION/ORDERING — that the resolved label flows from
 * getSectionLabel into the right element, and that a disabled section hides — NOT
 * the therapist-visible custom-title TEXT produced by the real settings.js
 * writer. The Phase 31 D-13c glue cleanup could regress the real end-to-end
 * output while this stays green; that text is out of Phase 30's observable reach
 * without running the real settings.js writer.
 *
 * FALSIFIABLE: in a scratch copy, make applySectionLabels write the default
 * (skip the getSectionLabel resolution) and Case 1 FAILS; make
 * applySectionVisibility never add is-hidden for a disabled new-session section
 * and Case 2 FAILS. Renaming an INTERNAL fn with no observable change stays GREEN
 * (D-08/D-12).
 *
 * F-A (vacuous-green trap): the page DOMContentLoaded handler is ASYNC. Guarded
 * two ways: (1) capture-and-await the specific handler (25-06 docListeners) and
 * settle() the queue after every async-driven event; (2) an end-of-file count
 * guard asserts EXPECTED_COUNT ran.
 *
 * Read-only: EVALS assets/add-session.js + add-session.html into an isolated
 * jsdom window; it never writes any assets/* production file.
 *
 * Run: node tests/30-section-visibility.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createMockPortfolioDB = require('./_helpers/mock-portfolio-db').createMockPortfolioDB;
var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle() { for (var i = 0; i < 6; i++) { await flush(); } }

/**
 * @param {object} appOverrides - per-test App.* overrides (isSectionEnabled,
 *        getSectionLabel) that drive the two cases.
 */
function buildEnv(appOverrides) {
  var html = readAsset('add-session.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/add-session.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  // Capture ALL document-level listeners into a map (keyed by type), still
  // forwarding non-DOMContentLoaded registrations to the real document. The
  // app:settings-changed listener is registered INSIDE the DOMContentLoaded
  // handler, so it only appears after we await that handler.
  var docHandlers = {};
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (!docHandlers[type]) docHandlers[type] = [];
    docHandlers[type].push(fn);
    if (type === 'DOMContentLoaded') return;
    return realAdd(type, fn, o);
  };

  // Minimal DOM-node severity no-op (F-B leaves the real pair to 30-06); init's
  // createIssueBlock appendChilds the scale so it must return a node. The two
  // cross-module overrides (isSectionEnabled/getSectionLabel) drive the cases.
  var baseOverrides = {
    createSeverityScale: function () { return win.document.createElement('div'); },
    getSeverityValue: function () { return null; },
  };
  Object.keys(appOverrides || {}).forEach(function (k) { baseOverrides[k] = appOverrides[k]; });
  win.App = createAppStub(baseOverrides);
  win.PortfolioDB = createMockPortfolioDB({ clients: [], sessions: [] });
  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };

  win.eval(readAsset('assets/add-session.js'));

  if (!docHandlers['DOMContentLoaded'] || docHandlers['DOMContentLoaded'].length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler');
  }
  return { dom: dom, win: win, docHandlers: docHandlers };
}

// Invoke the captured app:settings-changed listener directly (it is a
// document-level listener registered inside the DOMContentLoaded handler).
function fireSettingsChanged(env) {
  var hs = env.docHandlers['app:settings-changed'];
  assert.ok(hs && hs.length >= 1, 'add-session.js must register an app:settings-changed listener');
  hs.forEach(function (fn) { fn(); });
}

function wrapper(win, key) {
  return win.document.querySelector('[data-section-key="' + key + '"]');
}
function labelText(win, key) {
  var w = wrapper(win, key);
  var el = w && w.querySelector('.label[data-i18n]');
  return el ? el.textContent : null;
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── Case 1: custom title → live form label textContent ──────────────────────
  await test('a custom getSectionLabel return renders into the matching [data-section-key] .label[data-i18n] textContent (applySectionLabels)', async function () {
    var CUSTOM = 'My Renamed Trapped Section';
    var env = buildEnv({
      getSectionLabel: function (sectionKey, defaultI18nKey) {
        if (sectionKey === 'trapped') return CUSTOM;
        return defaultI18nKey; // others fall back to their i18n key
      },
    });
    var win = env.win;
    await env.docHandlers['DOMContentLoaded'][0]();
    await settle();

    // Force the cross-module re-render explicitly.
    fireSettingsChanged(env);
    await settle();

    assert.strictEqual(labelText(win, 'trapped'), CUSTOM,
      'the trapped section label must render the custom getSectionLabel value (the settings→add-session label wiring)');
    // A control: a section without a custom title shows its default i18n key.
    assert.strictEqual(labelText(win, 'comments'), 'session.form.comments',
      'a section with no custom title must keep its default i18n label (proves the custom value is per-section, not blanket)');

    env.dom.window.close();
  });

  // ─── Case 2: disabled section on a new session → is-hidden ───────────────────
  await test('a disabled section (isSectionEnabled false) on a NEW session gets the is-hidden class while an enabled section stays visible (applySectionVisibility)', async function () {
    var env = buildEnv({
      isSectionEnabled: function (sectionKey) {
        return sectionKey !== 'comments'; // comments disabled, all others enabled
      },
    });
    var win = env.win;
    await env.docHandlers['DOMContentLoaded'][0]();
    await settle();

    fireSettingsChanged(env);
    await settle();

    var disabled = wrapper(win, 'comments');
    var enabled = wrapper(win, 'trapped');
    assert.ok(disabled, 'the comments section wrapper must exist');
    assert.ok(enabled, 'the trapped section wrapper must exist');
    assert.strictEqual(disabled.classList.contains('is-hidden'), true,
      'a disabled section on a new (non-past) session must be hidden (is-hidden)');
    assert.strictEqual(enabled.classList.contains('is-hidden'), false,
      'an enabled section must remain visible (control — the hide is not blanket)');

    env.dom.window.close();
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────────
  var EXPECTED_COUNT = 2;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 30-05 section-visibility tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
