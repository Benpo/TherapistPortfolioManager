/**
 * tests/30-read-mode.test.js — add-session READ MODE + EDIT-CLIENT MODAL
 * characterization (GAP-02, region B7, TEST-03, D-08/D-09/D-12).
 *
 * ROOT CAUSE THIS CLOSES: the read-mode wiring of add-session.js (setReadMode +
 * the edit-client modal open/close, lines 243-275 + 284-385) is a Phase-31
 * refactor target with ZERO executed coverage before this test. The export
 * tests click #exportSessionBtn/#copySessionBtn DIRECTLY and BYPASS setReadMode,
 * so nothing ever proved that loading a past session actually enters read mode
 * and rewires the controls. Unguarded:
 *   1. Entering read mode for a loaded past session: body gains `read-mode`, the
 *      submit control hides, the edit/copy/export controls show, and form inputs
 *      become readOnly/disabled.
 *   2. The edit-client modal opens (populated) and closes via the real controls.
 *
 * THE GUARD (D-09 jsdom real-page): read mode is entered ONLY when
 * `sessionId && Number.isInteger(sessionId)` AND
 * `editingSession = await PortfolioDB.getSession(sessionId)` resolves a record
 * (add-session.js:1803-1811). So this test boots on a SEEDED ?sessionId= URL
 * with the session + its client seeded into the now-real PortfolioDB.getSession
 * (Task 0), and asserts `body.classList.contains('read-mode') === true` as a
 * HARD PRECONDITION with a loud message BEFORE any downstream assertion — if
 * read-mode entry never happened, every visibility/disabled assertion would
 * otherwise pass vacuously against the default new-session DOM.
 *
 * Then it asserts OBSERVABLE DOM only (D-08): element is-hidden/disabled/readOnly
 * state and modal visibility — never an internal function name.
 *
 * FALSIFIABLE: neutralise setReadMode's body-class / submit-hide wiring and the
 * hard precondition or the visibility assertion FAILS; an internal rename keeps
 * it GREEN. Mutation-kill recorded in the plan SUMMARY.
 *
 * F-A (vacuous-green trap): async DOMContentLoaded handler — guarded by
 * capture-and-await + an end-of-file count guard.
 *
 * Read-only: EVALS assets/* into an isolated jsdom window; writes no assets/*.
 *
 * Run: node tests/30-read-mode.test.js
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
async function settle(n) { for (var i = 0; i < (n || 8); i++) { await flush(); } }

var SEEDED_SESSION_ID = 51;
var SEEDED_CLIENT_ID = 9;

function buildEnv() {
  var html = readAsset('add-session.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/add-session.html?sessionId=' + SEEDED_SESSION_ID,
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

  // Real severity pair (createIssueBlock → App.createSeverityScale).
  win.I18N_DEFAULT = 'en';
  win.eval(readAsset('assets/app.js'));
  var realApp = win.App;
  if (typeof realApp.createSeverityScale !== 'function' ||
      typeof realApp.getSeverityValue !== 'function') {
    throw new Error('assets/app.js did not expose the real severity pair');
  }

  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  win.App = createAppStub({
    createSeverityScale: realApp.createSeverityScale,
    getSeverityValue: realApp.getSeverityValue,
  });

  var mockDb = createMockPortfolioDB({
    clients: [{
      id: SEEDED_CLIENT_ID,
      name: 'Maya Cohen',
      firstName: 'Maya',
      lastName: 'Cohen',
      email: 'maya@example.com',
      type: 'adult',
    }],
    sessions: [{
      id: SEEDED_SESSION_ID,
      clientId: SEEDED_CLIENT_ID,
      date: '2026-05-20',
      sessionType: 'clinic',
      trappedEmotions: 'past session trapped emotions',
      comments: 'past session comments',
      issues: [],
    }],
  });
  win.PortfolioDB = mockDb;

  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0], mockDb: mockDb };
}

async function boot(env) {
  await env.domHandler();
  await settle();
}

// HARD PRECONDITION — read-mode entry MUST have happened; otherwise the whole
// case would pass vacuously against the default new-session DOM.
function assertReadModeEntered(win) {
  assert.strictEqual(win.document.body.classList.contains('read-mode'), true,
    'HARD PRECONDITION FAILED: body.read-mode is not set — read-mode entry never ' +
    'happened (getSession mis-wired or sessionId not parsed). Every downstream ' +
    'assertion would otherwise pass vacuously against the default new-session DOM.');
}

function isHidden(el) { return el.classList.contains('is-hidden'); }

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // A. Read-mode rendering of a loaded past session.
  await test('loading a past ?sessionId= session enters read-mode: submit hidden, edit/copy/export shown, inputs disabled', async function () {
    var env = buildEnv();
    var win = env.win;
    await boot(env);

    assertReadModeEntered(win); // FIRST — loud hard precondition.

    var form = win.document.getElementById('sessionForm');
    var submitButton = form.querySelector("button[type='submit']");
    var editButton = win.document.getElementById('editSessionBtn');
    var copyBtn = win.document.getElementById('copySessionBtn');
    var exportBtn = win.document.getElementById('exportSessionBtn');

    assert.strictEqual(isHidden(submitButton), true,
      'the submit control must be hidden in read mode');
    assert.strictEqual(isHidden(editButton), false,
      'the edit control must be visible in read mode');
    assert.strictEqual(isHidden(copyBtn), false,
      'the copy control must be visible in read mode');
    assert.strictEqual(isHidden(exportBtn), false,
      'the export control must be visible in read mode');

    // Representative inputs: a date input is disabled; a textarea is readOnly.
    var sessionDate = win.document.getElementById('sessionDate');
    var trapped = win.document.getElementById('trappedEmotions');
    assert.strictEqual(sessionDate.disabled, true,
      'a non-textarea session input must be disabled in read mode');
    assert.strictEqual(trapped.readOnly, true,
      'a session textarea must be readOnly in read mode');

    // Severity / add-issue controls are disabled too.
    var addIssueBtn = win.document.getElementById('addIssueBtn');
    if (addIssueBtn) {
      assert.strictEqual(addIssueBtn.disabled, true,
        'the add-issue control must be disabled in read mode');
    }

    env.dom.window.close();
  });

  // B. Edit-client modal opens (populated) and closes via the real controls.
  await test('the edit-client open control opens+populates the modal; the close control hides it', async function () {
    var env = buildEnv();
    var win = env.win;
    await boot(env);

    assertReadModeEntered(win); // gate this case too — modal open reads clientSelect.value.

    var modal = win.document.getElementById('editClientModal');
    var openBtn = win.document.getElementById('editClientBtn');
    var closeBtn = win.document.getElementById('editClientClose');
    assert.ok(modal && openBtn && closeBtn, 'modal + open + close controls must exist');

    // Open control is shown for a selected client (populateSpotlight reveals it).
    assert.strictEqual(isHidden(openBtn), false,
      'the edit-client open control must be visible once a client is loaded');
    assert.strictEqual(isHidden(modal), true,
      'precondition: the edit-client modal starts hidden');

    openBtn.click();
    await settle();
    assert.strictEqual(isHidden(modal), false,
      'clicking the edit-client open control must show the modal');
    assert.strictEqual(win.document.getElementById('editClientFirstName').value, 'Maya',
      'the modal must be populated from the seeded client record (firstName)');

    closeBtn.click();
    await settle();
    assert.strictEqual(isHidden(modal), true,
      'clicking the close control must hide the modal again');

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
  console.log('Plan 30-07 read-mode tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (e) { console.error(e); process.exit(1); });
