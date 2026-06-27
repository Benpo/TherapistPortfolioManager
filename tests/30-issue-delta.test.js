/**
 * tests/30-issue-delta.test.js — add-session issue management: severity
 * before→after DELTA, addSession issues PAYLOAD shape, and empty-row
 * VALIDATION (TEST-03e, F-A/F-B/F-D, D-07/D-08/D-09/D-12).
 *
 * ROOT CAUSE THIS CLOSES: the issue-management region of add-session.js
 * (lines 502-675 — updateDelta, getIssuesPayload, validateIssues) is a Phase-31
 * refactor target, and nothing EXECUTED its observable behavior before this
 * test. Three things were unguarded:
 *   1. updateDelta: the before→after delta (afterValue − beforeValue) + sign +
 *      delta-positive/negative class + hidden-on-zero display toggle. It is
 *      reachable ONLY by clicking the REAL App.createSeverityScale widget (its
 *      click fires onChange → updateDelta) and reads severity ONLY through the
 *      REAL App.getSeverityValue. A label→number stub would make the delta
 *      UNREACHABLE through observable DOM (F-B), so this test injects the REAL
 *      coupled pair from assets/app.js via createAppStub overrides.
 *   2. getIssuesPayload: the {name, before, after} map + nameless-row filter,
 *      observable ONLY through the #sessionForm submit seam (F-D) — submit calls
 *      getIssuesPayload() and persists via PortfolioDB.addSession, so the test
 *      asserts the SHAPE on mockDb.__calls.get('addSession')[0][0].issues.
 *   3. validateIssues: an empty issue row (no name) → payload []  →
 *      App.showToast("", "toast.issueMissing") and NO write (assertNoWrites).
 *
 * THE GUARD (D-09 jsdom real-page): load the REAL add-session.html body + the
 * REAL assets/add-session.js into a jsdom window. Eval assets/app.js FIRST to
 * obtain the REAL severity pair (it loads cleanly — a pure `window.App = (()=>{
 * ... })()` IIFE with no top-level DOMContentLoaded handler; the 30-rtl-guard
 * proves this), inject it via createAppStub overrides so updateDelta stays
 * reachable through observable DOM, inject a mock PortfolioDB, drive the REAL
 * DOMContentLoaded handler, then CLICK the real severity buttons / fire the real
 * submit and assert OBSERVABLE state only (D-08): deltaEl.textContent + class +
 * display, and mockDb.__calls — never an internal fn name.
 *
 * FALSIFIABLE (per feedback-behavior-verification): break afterValue−beforeValue
 * (e.g. swap operands, drop the sign, or stop hiding on zero) and the matching
 * delta case FAILS; drop the nameless-row filter or the payload field set and
 * the payload case FAILS; remove the `payload.length > 0` gate and the empty
 * case FAILS (a write would fire). Renaming an INTERNAL fn (updateDelta →
 * refreshDelta, getIssuesPayload → collectIssues) with no observable change
 * keeps every case GREEN (D-08/D-12).
 *
 * F-A (vacuous-green trap): the page DOMContentLoaded + submit handlers are
 * async. Guarded two ways: (1) capture-and-await the specific DOMContentLoaded
 * handler (the 25-06 docListeners pattern) and settle() the microtask/timer
 * queue after every async-driven event; (2) an end-of-file count guard asserts
 * EXPECTED_COUNT cases ran.
 *
 * Read-only: EVALS assets/* into an isolated jsdom window; writes no assets/*.
 *
 * Run: node tests/30-issue-delta.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createMockPortfolioDB = require('./_helpers/mock-portfolio-db').createMockPortfolioDB;
var assertNoWrites = require('./_helpers/mock-portfolio-db').assertNoWrites;
var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle(n) { for (var i = 0; i < (n || 8); i++) { await flush(); } }

/**
 * Build a jsdom add-session.html page wired with the REAL severity pair.
 *
 * Order matters: eval assets/app.js BEFORE installing the DOMContentLoaded
 * capture override (app.js is a side-effect-free IIFE — no DOMContentLoaded
 * handler — so nothing is captured from it), grab the REAL
 * createSeverityScale/getSeverityValue off window.App, inject them through the
 * stub so they run in THIS window's document, then eval add-session.js and
 * capture its single DOMContentLoaded handler.
 */
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

  // Eval the REAL app.js to obtain the coupled severity widget pair. app.js is
  // `window.App = (() => { ... return { createSeverityScale, getSeverityValue,
  // ... }; })()` — its only top-level execution reads window.I18N_DEFAULT, so
  // set it first. The pair's closure references THIS window's `document`, so the
  // nodes it creates can be appended into the add-session DOM.
  win.I18N_DEFAULT = 'en';
  win.eval(readAsset('assets/app.js'));
  var realApp = win.App;
  if (typeof realApp.createSeverityScale !== 'function' ||
      typeof realApp.getSeverityValue !== 'function') {
    throw new Error('assets/app.js did not expose the real createSeverityScale/getSeverityValue pair');
  }

  // Capture add-session.js's DOMContentLoaded handler (do NOT dispatch it
  // blindly — it is async; the 25-06 capture-and-await pattern).
  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  // F-B: stub the rest of App.* but inject the REAL severity pair so the delta
  // path is reachable through observable DOM clicks.
  win.App = createAppStub({
    createSeverityScale: realApp.createSeverityScale,
    getSeverityValue: realApp.getSeverityValue,
  });
  var mockDb = createMockPortfolioDB({ clients: [], sessions: [] });
  win.PortfolioDB = mockDb;

  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0], mockDb: mockDb };
}

// Issue row N (0-based): the before-scale lives in #issueList, the after-scale
// + delta in the matching #issueSummaryList summary block, in append order.
function getRow(win, index) {
  index = index || 0;
  var blocks = win.document.querySelectorAll('#issueList .issue-block');
  var summaries = win.document.querySelectorAll('#issueSummaryList .issue-summary');
  var block = blocks[index];
  var summary = summaries[index];
  assert.ok(block, 'issue block #' + index + ' must exist');
  assert.ok(summary, 'issue summary #' + index + ' must exist');
  return {
    nameInput: block.querySelector('input.input'),
    beforeScale: block.querySelector('.severity-scale'),
    removeBtn: block.querySelector('.issue-remove'),
    afterScale: summary.querySelector('.severity-scale'),
    deltaEl: summary.querySelector('.severity-delta'),
  };
}

// Click the REAL severity widget button for `value` (0-10). Button index i
// corresponds to value i (createSeverityScale loops i=0..10). This sets
// dataset.value AND fires onChange → updateDelta — the ONLY observable path.
function clickSeverity(scale, value) {
  var buttons = scale.querySelectorAll('.severity-button');
  assert.ok(buttons[value], 'severity button for value ' + value + ' must exist');
  buttons[value].click();
}

// Seed a valid client option + a date so the submit handler reaches the issue
// validation gate (it bails early on a missing client or date).
function seedClientAndDate(win) {
  var select = win.document.getElementById('clientSelect');
  var opt = win.document.createElement('option');
  opt.value = '1';
  opt.textContent = 'Test Client';
  select.appendChild(opt);
  select.value = '1';
  win.document.getElementById('sessionDate').value = '2026-06-01';
}

function fireSubmit(win) {
  var form = win.document.getElementById('sessionForm');
  form.dispatchEvent(new win.Event('submit', { cancelable: true, bubbles: true }));
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── Task 1: severity before→after DELTA via the REAL widget ────────────────

  // A. positive: before 2 → after 6 ⇒ "+4", delta-positive, visible.
  await test('clicking the real before-scale (2) then after-scale (6) yields deltaEl "+4" with class delta-positive and visible', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    var row = getRow(win, 0);
    clickSeverity(row.beforeScale, 2);
    clickSeverity(row.afterScale, 6);
    await settle();

    assert.strictEqual(row.deltaEl.textContent, '+4',
      'delta must be afterValue−beforeValue = 6−2 = +4 (with the + sign)');
    assert.ok(row.deltaEl.classList.contains('delta-positive'),
      'a positive delta must carry the delta-positive class');
    assert.ok(!row.deltaEl.classList.contains('delta-negative'),
      'a positive delta must NOT carry the delta-negative class');
    assert.notStrictEqual(row.deltaEl.style.display, 'none',
      'a non-zero delta must be visible (display !== "none")');

    env.dom.window.close();
  });

  // B. negative: before 6 → after 2 ⇒ "-4", delta-negative, visible.
  await test('clicking the real before-scale (6) then after-scale (2) yields deltaEl "-4" with class delta-negative and visible', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    var row = getRow(win, 0);
    clickSeverity(row.beforeScale, 6);
    clickSeverity(row.afterScale, 2);
    await settle();

    assert.strictEqual(row.deltaEl.textContent, '-4',
      'delta must be afterValue−beforeValue = 2−6 = -4');
    assert.ok(row.deltaEl.classList.contains('delta-negative'),
      'a negative delta must carry the delta-negative class');
    assert.ok(!row.deltaEl.classList.contains('delta-positive'),
      'a negative delta must NOT carry the delta-positive class');
    assert.notStrictEqual(row.deltaEl.style.display, 'none',
      'a non-zero delta must be visible (display !== "none")');

    env.dom.window.close();
  });

  // C. no-change: a visible delta becomes hidden when before === after (delta 0).
  await test('after a visible +2 delta, clicking the after-scale to equal the before value (delta 0) hides the deltaEl (display "none")', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    var row = getRow(win, 0);
    // First establish a visible non-zero delta so the hide is an active toggle.
    clickSeverity(row.beforeScale, 4);
    clickSeverity(row.afterScale, 6);
    await settle();
    assert.notStrictEqual(row.deltaEl.style.display, 'none',
      'precondition: the +2 delta must be visible before the no-change click');

    // Now make after === before (4 === 4) ⇒ delta 0 ⇒ hidden.
    clickSeverity(row.afterScale, 4);
    await settle();
    assert.strictEqual(row.deltaEl.style.display, 'none',
      'a zero delta (before === after) must hide the deltaEl');

    env.dom.window.close();
  });

  // ─── Task 2: issues PAYLOAD shape + empty-row VALIDATION via submit seam ─────

  // D. valid submit after one add + one remove ⇒ addSession.issues has exactly
  //    the remaining row's {name, before, after}.
  await test('a valid submit (after adding then removing a row) persists addSession with exactly the remaining issue {name, before, after}', async function () {
    var env = buildEnv();
    var win = env.win;
    var mockDb = env.mockDb;
    await env.domHandler();
    await settle();

    seedClientAndDate(win);

    // Row 0 (from init): the row that must survive into the payload.
    var row0 = getRow(win, 0);
    row0.nameInput.value = 'Anxiety';
    clickSeverity(row0.beforeScale, 8);
    clickSeverity(row0.afterScale, 3);

    // Add a second row, fill it, then remove it — it must NOT appear in payload.
    win.document.getElementById('addIssueBtn').click();
    await settle();
    var row1 = getRow(win, 1);
    row1.nameInput.value = 'Temporary';
    clickSeverity(row1.beforeScale, 5);
    clickSeverity(row1.afterScale, 1);
    row1.removeBtn.click();
    await settle();

    fireSubmit(win);
    await settle();

    var calls = mockDb.__calls.get('addSession');
    assert.strictEqual(calls.length, 1, 'a valid submit must call PortfolioDB.addSession exactly once');
    var issues = calls[0][0].issues;
    assert.ok(Array.isArray(issues), 'addSession payload .issues must be an array');
    assert.strictEqual(issues.length, 1,
      'only the surviving (non-removed, named) row may appear — the removed row must be gone');
    assert.deepStrictEqual(issues[0], { name: 'Anxiety', before: 8, after: 3 },
      'the persisted issue must carry exactly {name, before, after} from the surviving row');

    env.dom.window.close();
  });

  // E. empty issue row (no name) ⇒ blocked: showToast("toast.issueMissing") AND
  //    no write.
  await test('submitting with a single empty (nameless) issue row shows toast.issueMissing and writes NOTHING', async function () {
    var env = buildEnv();
    var win = env.win;
    var mockDb = env.mockDb;
    await env.domHandler();
    await settle();

    seedClientAndDate(win);
    // Leave the single init issue row's name EMPTY → getIssuesPayload filters it
    // out → validateIssues([]) is false → submission blocked.

    fireSubmit(win);
    await settle();

    var toastCalls = win.App.__calls.get('showToast') || [];
    var sawIssueMissing = toastCalls.some(function (args) {
      return args.indexOf('toast.issueMissing') !== -1;
    });
    assert.ok(sawIssueMissing,
      'an empty issue row must trigger App.showToast with "toast.issueMissing"');
    assertNoWrites(mockDb); // nothing persisted — submission was blocked.

    env.dom.window.close();
  });

  // ─── Task 3: issue-cap + remove-button toggle (GAP-14 / region B5) ──────────

  // F. MAX_ISSUES cap: growing rows to 3 disables #addIssueBtn and blocks a 4th.
  await test('adding issue rows up to the MAX_ISSUES=3 cap disables #addIssueBtn and prevents a 4th row', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    var addBtn = win.document.getElementById('addIssueBtn');
    assert.ok(addBtn, '#addIssueBtn must exist');
    function rowCount() { return win.document.querySelectorAll('#issueList .issue-block').length; }

    assert.strictEqual(rowCount(), 1, 'init must render exactly one issue row');
    assert.strictEqual(addBtn.disabled, false, 'at 1 row #addIssueBtn must be enabled');

    addBtn.click();
    await settle();
    assert.strictEqual(rowCount(), 2, 'first add must yield 2 rows');
    assert.strictEqual(addBtn.disabled, false, 'at 2 rows #addIssueBtn must still be enabled');

    addBtn.click();
    await settle();
    assert.strictEqual(rowCount(), 3, 'second add must yield 3 rows (the cap)');
    assert.strictEqual(addBtn.disabled, true,
      'at the MAX_ISSUES=3 cap #addIssueBtn must be disabled');

    // A further click at the cap must NOT add a 4th row (the handler guards it).
    addBtn.click();
    await settle();
    assert.strictEqual(rowCount(), 3, 'clicking at the cap must not add a 4th row');

    env.dom.window.close();
  });

  // G. updateRemoveButtons toggle: hidden+disabled at 1 row, enabled+visible at 2.
  await test('the issue remove button is hidden+disabled at a single row and becomes enabled+visible once a second row exists (updateRemoveButtons)', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    // At 1 row the lone remove button must be hidden (can't remove the last row).
    var row0 = getRow(win, 0);
    assert.strictEqual(row0.removeBtn.classList.contains('is-hidden'), true,
      'at 1 row the remove button must be is-hidden');
    assert.strictEqual(row0.removeBtn.disabled, true,
      'at 1 row the remove button must be disabled');

    // Add a second row → both remove buttons become enabled + visible.
    win.document.getElementById('addIssueBtn').click();
    await settle();

    row0 = getRow(win, 0);
    var row1 = getRow(win, 1);
    assert.strictEqual(row0.removeBtn.classList.contains('is-hidden'), false,
      'at 2 rows row 0 remove button must be visible (not is-hidden)');
    assert.strictEqual(row0.removeBtn.disabled, false,
      'at 2 rows row 0 remove button must be enabled');
    assert.strictEqual(row1.removeBtn.classList.contains('is-hidden'), false,
      'at 2 rows row 1 remove button must be visible (not is-hidden)');
    assert.strictEqual(row1.removeBtn.disabled, false,
      'at 2 rows row 1 remove button must be enabled');

    env.dom.window.close();
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────────
  var EXPECTED_COUNT = 7;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 30-06 issue-delta tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
