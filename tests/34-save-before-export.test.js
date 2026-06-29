/**
 * Phase 34 (Plan 34-04, Wave 0) — D-13 / PDFX-03: save-before-export non-blocking
 * guard + behavior-preserving save extraction.
 *
 * RED-NOW jsdom behavior gate authored BEFORE the implementation (project hard
 * rule `feedback-behavior-verification`). Expected to FAIL today; becomes the
 * GREEN gate for 34-08, which (a) extracts the inline submit-handler save into a
 * reusable save (validate → persist, returning {savedId, isNew}, WITHOUT the
 * 600ms location redirect) and (b) wires a non-blocking "save first?" prompt onto
 * the export trigger so a never-saved / dirty session is persisted (and gains an
 * id for the FN-1 ordinal) before it exports.
 *
 * --- The contract under test (PDFX-03, five behaviors) ---
 *   (a) Triggering export on a never-saved (or dirty) session surfaces a
 *       non-blocking prompt (App.confirmDialog) — it does NOT export immediately
 *       and does NOT hard-block.
 *   (b) "Save & export" (confirm → true) runs the extracted save (persists via
 *       PortfolioDB.addSession for a new session) and THEN proceeds to export
 *       (the export modal opens). A redirect-instead-of-export would leave the
 *       modal closed → caught here.
 *   (c) "Keep editing" (confirm → false) dismisses: NO persist, NO export.
 *   (d) A save-VALIDATION failure (e.g. a nameless issue row) aborts the export
 *       entirely: NO persist, NO export modal, and the issue-missing toast fires
 *       (the user stays editing).
 *   (e) Behavior-preservation: the SAVE BUTTON path (form submit) still
 *       validates + persists — the extraction did not change save-button
 *       semantics. (Green today; must STAY green after 34-08's extraction.)
 *
 * --- Falsifiability ---
 *   • Exporting immediately (no prompt) fails (a)/(c)/(d).
 *   • A hard block (never reaching export after Save & export) fails (b).
 *   • A redirect inside the extracted save (instead of opening the export modal)
 *     leaves the modal closed → fails (b).
 *   • Letting a validation failure through (persisting or exporting anyway) fails (d).
 *   • Breaking the save button (submit no longer persists) fails (e).
 *
 * Observable-only (D-08): spies on App.confirmDialog / App.showToast and
 * PortfolioDB.__calls, plus the #exportModal is-hidden class — never an internal
 * function name.
 *
 * RED now: clicking #exportSessionBtn calls openExportDialog directly — no
 * prompt, no save — so (a)–(d) fail; (e) already passes (gates 34-08).
 *
 *   node tests/34-save-before-export.test.js   -- exit 0 = pass, exit 1 = RED/fail
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
async function settle(n) { for (var i = 0; i < (n || 10); i++) { await flush(); } }

/**
 * Build a jsdom add-session page (NEW session — no ?sessionId, so editingSession
 * is null = never-saved) with the export-modal + add-session boot handlers.
 * @param {object} [opts]
 * @param {boolean} [opts.confirmResult] App.confirmDialog resolution (default true).
 */
function buildEnv(opts) {
  opts = opts || {};
  var confirmResult = (typeof opts.confirmResult === 'boolean') ? opts.confirmResult : true;

  var html = readAsset('add-session.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/add-session.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  // Stub severity pair (a node + null value): getIssuesPayload only needs a name
  // to produce a valid issue (severity may be null). confirmDialog is the prompt.
  var app = createAppStub({
    createSeverityScale: function () { return win.document.createElement('div'); },
    getSeverityValue: function () { return null; },
    confirmDialog: function () { return Promise.resolve(confirmResult); },
  });
  win.App = app;

  var mockDb = createMockPortfolioDB({ clients: [], sessions: [] });
  win.PortfolioDB = mockDb;

  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };

  win.eval(readAsset('assets/export-modal.js')); // before add-session.js (boot handshake)
  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0], mockDb: mockDb, app: app };
}

// Give the form a selectable client + a date so the save reaches issue validation.
function seedClientAndDate(win) {
  var select = win.document.getElementById('clientSelect');
  var opt = win.document.createElement('option');
  opt.value = '1';
  opt.textContent = 'Test Client';
  select.appendChild(opt);
  select.value = '1';
  win.document.getElementById('sessionDate').value = '2026-06-01';
}

function setIssueName(win, name) {
  var input = win.document.querySelector('#issueList .issue-block input.input');
  assert.ok(input, 'the initial issue row name input must exist');
  input.value = name;
}

function clickExport(win) {
  win.document.getElementById('exportSessionBtn').click();
}

function fireSubmit(win) {
  var form = win.document.getElementById('sessionForm');
  form.dispatchEvent(new win.Event('submit', { cancelable: true, bubbles: true }));
}

function exportModalOpen(win) {
  var modal = win.document.getElementById('exportModal');
  return !!(modal && !modal.classList.contains('is-hidden'));
}

function callCount(spyMap, name) {
  var arr = spyMap.get(name) || [];
  return arr.length;
}

function sawToast(app, key) {
  var arr = app.__calls.get('showToast') || [];
  return arr.some(function (args) { return args.indexOf(key) !== -1; });
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── (a) export on a never-saved session surfaces the non-blocking prompt ────
  await test('exporting a never-saved session surfaces the save-first prompt (App.confirmDialog) rather than exporting immediately', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    seedClientAndDate(win);
    setIssueName(win, 'Anxiety'); // a dirty, never-saved session with content

    clickExport(win);
    await settle();

    assert.ok(callCount(env.app.__calls, 'confirmDialog') >= 1,
      'export on a never-saved session must surface the save-first prompt (App.confirmDialog). ' +
      'RED now: #exportSessionBtn opens the dialog directly with no prompt.');

    env.dom.window.close();
  });

  // ─── (b) "Save & export" persists (no redirect) THEN exports ─────────────────
  await test('"Save & export" persists a new session (addSession) and then opens the export modal (no redirect-instead-of-export)', async function () {
    var env = buildEnv({ confirmResult: true });
    var win = env.win;
    await env.domHandler();
    await settle();

    seedClientAndDate(win);
    setIssueName(win, 'Anxiety');

    clickExport(win);
    await settle();

    assert.ok(callCount(env.app.__calls, 'confirmDialog') >= 1,
      'the save-first prompt must fire before persisting');
    assert.strictEqual(callCount(env.mockDb.__calls, 'addSession'), 1,
      '"Save & export" must persist the never-saved session exactly once (gains an id for the ordinal)');
    assert.ok(exportModalOpen(win),
      'after the save, export must PROCEED — the export modal must open. ' +
      'A redirect-inside-the-extracted-save (instead of exporting) leaves it closed → this fails.');

    env.dom.window.close();
  });

  // ─── (c) "Keep editing" dismisses — no persist, no export ────────────────────
  await test('"Keep editing" (prompt dismissed) does NOT persist and does NOT open the export modal', async function () {
    var env = buildEnv({ confirmResult: false });
    var win = env.win;
    await env.domHandler();
    await settle();

    seedClientAndDate(win);
    setIssueName(win, 'Anxiety');

    clickExport(win);
    await settle();

    assert.ok(callCount(env.app.__calls, 'confirmDialog') >= 1,
      'the prompt must have been shown');
    assert.strictEqual(callCount(env.mockDb.__calls, 'addSession'), 0,
      '"Keep editing" must NOT persist');
    assert.ok(!exportModalOpen(win),
      '"Keep editing" must NOT export — the export modal must stay closed. ' +
      'RED now: #exportSessionBtn opens the modal immediately regardless.');

    env.dom.window.close();
  });

  // ─── (d) save-validation failure aborts the export entirely ──────────────────
  await test('a save-validation failure (nameless issue) aborts the export: no persist, no export modal, issue-missing toast fires', async function () {
    var env = buildEnv({ confirmResult: true });
    var win = env.win;
    await env.domHandler();
    await settle();

    seedClientAndDate(win);
    // Leave the issue row name EMPTY → getIssuesPayload []→ validateIssues false.

    clickExport(win);
    await settle();

    assert.strictEqual(callCount(env.mockDb.__calls, 'addSession'), 0,
      'a validation failure must NOT persist');
    assert.ok(!exportModalOpen(win),
      'a validation failure must ABORT the export — the export modal must NOT open. ' +
      'RED now: the modal opens immediately with no validation gate.');
    assert.ok(sawToast(env.app, 'toast.issueMissing'),
      'the user must see the issue-missing toast and stay editing');

    env.dom.window.close();
  });

  // ─── (e) save-button (form submit) still validates + persists (preserved) ────
  await test('the SAVE BUTTON path (form submit) still validates and persists — extraction preserves save-button semantics', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    seedClientAndDate(win);
    setIssueName(win, 'Anxiety');

    fireSubmit(win);
    await settle();

    assert.strictEqual(callCount(env.mockDb.__calls, 'addSession'), 1,
      'submitting a valid new session via the save button must persist exactly once');

    env.dom.window.close();
  });

  // ─── count guard (vacuous-green trap) ────────────────────────────────────────
  var EXPECTED_COUNT = 5;
  if (passed + failed !== EXPECTED_COUNT) {
    console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases, ' +
      (passed + failed) + ' ran — an async case was silently skipped.');
    process.exit(1);
  }

  console.log('Passed ' + passed + '/' + EXPECTED_COUNT + ', Failed ' + failed + '.');
  if (failed > 0) {
    console.log('(RED as expected while the save-before-export guard + save extraction are unwired — the GREEN gate for 34-08.)');
  }
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (err) {
  console.error('FATAL:', err);
  process.exit(1);
});
