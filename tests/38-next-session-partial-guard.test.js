/**
 * tests/38-next-session-partial-guard.test.js — PARTIAL next-session date save
 * guard (Plan 38-09, NEXT-01 / UAT test 5). Authored BEFORE the guard lands —
 * RED-BY-DESIGN.
 *
 * THE DEFECT (UAT test 5): a native `<input type="date">` reports value="" for
 * BOTH an empty field AND a partially typed/unparseable entry (e.g. the user
 * changed only the day segment in Safari). saveSessionForm() read value || ""
 * with no partial-entry check, so a one-segment edit persisted "" and still
 * fired a SUCCESS toast — a silent data-loss save. The ONLY signal that
 * distinguishes "empty" from "partially typed" is the element's
 * validity.badInput flag.
 *
 * THE GUARD UNDER TEST: isNextSessionDateIncomplete(el) is a PURE function over
 * the element's validity state — it returns true (⇒ BLOCK the save) ONLY when
 * validity.badInput is true; empty and complete both return false (⇒ ALLOW).
 * Because it is pure over a plain validity object, it is unit-testable with a
 * stubbed element.
 *
 * WHY jsdom CANNOT SIMULATE THIS DIRECTLY: jsdom (and even headless Chromium)
 * cannot raise validity.badInput on a native date input — that flag is set by
 * the browser's native date parser from real keyboard segment entry, not from
 * assigning .value. Per project memory `feedback-behavior-verification` and
 * `reference-webkit-chromium-svg-visual-verification`, the falsifiable RED-first
 * test therefore exercises the EXTRACTED PURE GUARD directly against stubbed
 * validity state; the end-to-end badInput behavior is field-verified in real
 * Safari (see the plan's <human-check>).
 *
 * WHY IT IS RED TODAY: window.__addSessionTestHooks.isNextSessionDateIncomplete
 * does not exist yet (Plan 38-09 Step B adds it). The first assertion checks
 * typeof guard === "function", so the failure is a clean, falsifiable RED at the
 * assertion — NOT a harness/syntax error. It flips GREEN only when Step B lands
 * the pure guard + hook exposure; it is NOT weakened to pass.
 *
 * FALSIFIABILITY:
 *   - Test 1 (BLOCK) rejects a "value-only" implementation that ignores
 *     badInput: a partial entry has value="" so a value-check would ALLOW it.
 *   - Test 2 (ALLOW) rejects a naive "block whenever value is empty" mistake:
 *     an empty field (badInput=false, value="") is a LEGAL optional date and
 *     must save — such a mistake would FAIL this test.
 *
 * Read-only: EVALS assets/* into an isolated jsdom window; writes no assets/*.
 *
 * Run: node tests/38-next-session-partial-guard.test.js
 * Exits 0 on full pass, 1 on any failure (RED until Plan 38-09 Step B lands).
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

/**
 * Build a jsdom add-session page and eval the REAL add-session.js WITHOUT
 * booting it. Mirrors the buildEnv harness in tests/38-next-session.test.js:
 * eval app.js, capture (and drop) the DOMContentLoaded handler so add-session.js
 * does NOT auto-boot, inject the App stub + mock DB, then eval
 * export-modal.js → date-format.js → add-session.js. The pure guard is exposed
 * at module-eval time via window.__addSessionTestHooks, so no DOM boot is needed.
 */
function buildHooks() {
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
  if (typeof win.BroadcastChannel !== 'function') {
    win.BroadcastChannel = function () {
      return { postMessage: function () {}, close: function () {}, addEventListener: function () {} };
    };
  }

  win.I18N_DEFAULT = 'en';
  win.eval(readAsset('assets/app.js'));
  var realApp = win.App;

  // Capture (and DROP) add-session.js's DOMContentLoaded handler so the module
  // does not auto-boot — we only want the module-eval-time hook exposure.
  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  win.App = createAppStub({
    createSeverityScale: realApp.createSeverityScale,
    getSeverityValue: realApp.getSeverityValue,
    installNavGuard: function () {},
  });
  win.PortfolioDB = createMockPortfolioDB({ clients: [], sessions: [] });

  win.eval(readAsset('assets/export-modal.js'));
  win.eval(readAsset('assets/date-format.js'));
  win.eval(readAsset('assets/add-session.js'));

  return { dom: dom, win: win };
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(function () {
  var env = buildHooks();
  var win = env.win;
  var hooks = win.__addSessionTestHooks || {};
  var guard = hooks.isNextSessionDateIncomplete;

  // RED-first falsifiability: the hook must be a function BEFORE any behavior
  // case can run. Missing hook ⇒ clean RED here (not a harness error).
  test('the pure guard isNextSessionDateIncomplete is exposed on __addSessionTestHooks', function () {
    assert.strictEqual(typeof guard, 'function',
      'window.__addSessionTestHooks.isNextSessionDateIncomplete must be a function (RED until Plan 38-09 Step B lands the guard)');
  });

  // Test 1 (BLOCK): a partial typed entry — value="" but validity.badInput=true
  // — must return true so the save is blocked. Rejects a value-only impl.
  test('BLOCK: a partial/unparseable entry (validity.badInput=true, value="") returns true', function () {
    assert.strictEqual(guard({ validity: { badInput: true }, value: '' }), true,
      'a partial typed date (badInput true) must be reported incomplete → BLOCK the save');
  });

  // Test 2 (ALLOW): an empty field is a legal optional date — must return false.
  // Rejects a naive "block whenever value is empty" mistake.
  test('ALLOW: an empty field (validity.badInput=false, value="") returns false', function () {
    assert.strictEqual(guard({ validity: { badInput: false }, value: '' }), false,
      'an empty next-session date is a legal optional value → must ALLOW the save (never blocked)');
  });

  // Test 3 (ALLOW): a complete valid date must return false.
  test('ALLOW: a complete date (validity.badInput=false, value="2026-08-01") returns false', function () {
    assert.strictEqual(guard({ validity: { badInput: false }, value: '2026-08-01' }), false,
      'a complete valid next-session date must ALLOW the save');
  });

  // Test 4 (ALLOW): a missing field (null) must never block.
  test('ALLOW: a null element (field absent) returns false', function () {
    assert.strictEqual(guard(null), false,
      'an absent #nextSessionDate element must never block the save');
  });

  env.dom.window.close();

  // ─── count guard (vacuous-green trap) ────────────────────────────────────────
  var EXPECTED_COUNT = 5;
  if (passed + failed !== EXPECTED_COUNT) {
    console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran.');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 38-09 partial next-session guard tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
