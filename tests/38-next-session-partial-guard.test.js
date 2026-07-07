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

/**
 * Plan 38-12 Task 4 — TOO-EARLY (rangeUnderflow) save guard. Unlike badInput
 * (which jsdom/Chromium CANNOT raise from real segment entry — see the header
 * note above), validity.rangeUnderflow IS fully simulatable in jsdom: setting a
 * date input's `min` and a `value` earlier than it makes el.validity.rangeUnderflow
 * true natively (verified). So this branch is behavior-tested END-TO-END by
 * BOOTING the real add-session.js and driving a real submit, asserting the
 * observable side effects: the save is aborted (no addSession), no success toast,
 * and the new toast.nextSessionDateTooEarly key is shown with the error tone +
 * the #nextSessionDate focus target. A companion same-day case proves D-08
 * (min == value is ALLOWED — a too-early guard that used <= would over-block and
 * FAIL that case).
 *
 * Boots the real page the same way tests/38-next-session.test.js buildEnv does:
 * eval app.js for the real severity pair, capture+drop the DOMContentLoaded
 * handler, inject the App stub (spying showToast) + store-backed mock DB, then
 * eval export-modal.js → date-format.js → add-session.js and await the handler.
 */
var SEEDED_CLIENT_ID = 7;

function buildBootEnv() {
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

  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  // Spy showToast with RAW args (the App-stub __calls deep-copies via JSON, which
  // would strip the DOM focus element — we must inspect the real element identity).
  var toastCalls = [];
  win.App = createAppStub({
    createSeverityScale: realApp.createSeverityScale,
    getSeverityValue: realApp.getSeverityValue,
    installNavGuard: function () {},
    showToast: function (message, key, options) { toastCalls.push([message, key, options]); },
  });
  var mockDb = createMockPortfolioDB({
    clients: [{ id: SEEDED_CLIENT_ID, name: 'Test Client' }],
    sessions: [],
  });
  win.PortfolioDB = mockDb;

  win.eval(readAsset('assets/export-modal.js'));
  win.eval(readAsset('assets/date-format.js'));
  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0], mockDb: mockDb, toastCalls: toastCalls };
}

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle(n) { for (var i = 0; i < (n || 8); i++) { await flush(); } }

async function boot(env) { await env.domHandler(); await settle(); }

// Fill the minimum valid new-session form so the submit reaches the
// #nextSessionDate guard (mirrors tests/38-next-session.test.js SAVE recipe):
// a client + a session date + one NAMED issue. Sets the session date FIRST so
// syncNextSessionMin applies #nextSessionDate.min, then sets the next-session
// value — jsdom then computes rangeUnderflow from min vs value natively.
function fillValidFormThenNextDate(win, sessionISO, nextISO) {
  var doc = win.document;
  doc.getElementById('clientSelect').value = String(SEEDED_CLIENT_ID);
  var sf = doc.getElementById('sessionDate');
  sf.value = sessionISO;
  sf.dispatchEvent(new win.Event('input', { bubbles: true }));
  sf.dispatchEvent(new win.Event('change', { bubbles: true })); // → syncNextSessionMin sets min
  doc.querySelector('#issueList .issue-block input.input').value = 'Anxiety';
  var nf = doc.getElementById('nextSessionDate');
  nf.value = nextISO; // earlier than min ⇒ validity.rangeUnderflow === true
  return nf;
}

function submitForm(win) {
  win.document.getElementById('sessionForm')
    .dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
}

function toastWithKey(toastCalls, key) {
  return toastCalls.filter(function (c) { return c[1] === key; });
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}
async function testAsync(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
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

  // ─── Plan 38-12 Task 4: TOO-EARLY (rangeUnderflow) end-to-end boot tests ─────

  // BLOCK: a typed next-session date EARLIER than the session date sets
  // validity.rangeUnderflow=true. The save MUST abort (no addSession, no success
  // toast) and surface toast.nextSessionDateTooEarly with the error tone + the
  // #nextSessionDate focus target. RED today: the guard only checks badInput, so
  // the too-early date saves silently (addSession fires, sessionSaved shows).
  await testAsync('BLOCK: a too-early typed next-session date (rangeUnderflow) aborts the save with the error-toned nextSessionDateTooEarly toast focusing #nextSessionDate', async function () {
    var benv = buildBootEnv();
    var win = benv.win;
    await boot(benv);

    var nf = fillValidFormThenNextDate(win, '2026-08-10', '2026-08-05'); // 08-05 < min 08-10
    assert.strictEqual(nf.validity.rangeUnderflow, true,
      'PRECONDITION: a value earlier than #nextSessionDate.min must raise validity.rangeUnderflow in jsdom');

    submitForm(win);
    await settle();

    var addCalls = benv.mockDb.__calls.get('addSession') || [];
    assert.strictEqual(addCalls.length, 0,
      'a too-early next-session date must ABORT the save — PortfolioDB.addSession must NOT be called (RED until the rangeUnderflow guard lands)');

    var success = toastWithKey(benv.toastCalls, 'toast.sessionSaved');
    assert.strictEqual(success.length, 0, 'no success toast may fire for a blocked too-early save');

    var tooEarly = toastWithKey(benv.toastCalls, 'toast.nextSessionDateTooEarly');
    assert.strictEqual(tooEarly.length, 1,
      'the block must surface exactly one toast.nextSessionDateTooEarly (RED until STEP B/C land the guard + key)');
    var options = tooEarly[0][2];
    assert.ok(options && options.tone === 'error',
      'the too-early toast must pass { tone: "error" } so it renders in the distinct error tone');
    assert.strictEqual(options.focus, nf,
      'the too-early toast must pass the #nextSessionDate element as options.focus so the field is scrolled to and focused');

    benv.dom.window.close();
  });

  // ALLOW (D-08 same-day): min == value is NOT an underflow — the save must go
  // through. A too-early guard that mistakenly used <= would over-block and FAIL
  // here (falsifiability of the boundary).
  await testAsync('ALLOW (D-08): a same-day next-session date (min == value, no rangeUnderflow) saves through — the guard does not over-block the boundary', async function () {
    var benv = buildBootEnv();
    var win = benv.win;
    await boot(benv);

    var nf = fillValidFormThenNextDate(win, '2026-08-10', '2026-08-10'); // same day
    assert.strictEqual(nf.validity.rangeUnderflow, false,
      'PRECONDITION: a same-day next-session date (value == min) must NOT raise rangeUnderflow (D-08 same-day allowed)');

    submitForm(win);
    await settle();

    var addCalls = benv.mockDb.__calls.get('addSession') || [];
    assert.strictEqual(addCalls.length, 1,
      'a same-day next-session date is valid (D-08) and must save — addSession must be called exactly once');
    var tooEarly = toastWithKey(benv.toastCalls, 'toast.nextSessionDateTooEarly');
    assert.strictEqual(tooEarly.length, 0, 'a same-day date must NOT trigger the too-early block');

    benv.dom.window.close();
  });

  // ─── count guard (vacuous-green trap) ────────────────────────────────────────
  var EXPECTED_COUNT = 7;
  if (passed + failed !== EXPECTED_COUNT) {
    console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran.');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 38-09/38-12 next-session guard tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
