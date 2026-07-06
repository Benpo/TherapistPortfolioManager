/**
 * tests/30-form-dirty-revert.test.js — add-session FORM DIRTY / REVERT
 * characterization (GAP-01, region B6, TEST-03, D-08/D-09/D-12).
 *
 * ROOT CAUSE THIS CLOSES: the dirty-tracking + revert region of add-session.js
 * (snapshotFormState / revertSessionForm / updateCancelButtonLabel /
 * window.PortfolioFormDirty + the App.installNavGuard isDirty wiring, lines
 * 47-74 + 677-728 + 1596-1620) is a Phase-31 refactor target with ZERO
 * executed coverage before this test. Four things were unguarded:
 *   1. window.PortfolioFormDirty() must flip false→true when the form is edited.
 *   2. revertSessionForm() must restore the edited field to its last-saved
 *      snapshot value AND flip PortfolioFormDirty() back to false.
 *   3. updateCancelButtonLabel() must resolve the cancel control's label to
 *      session.discard while dirty and confirm.cancel while clean.
 *   4. The isDirty callback handed to App.installNavGuard at boot must track the
 *      LIVE PortfolioFormDirty() state — not merely "installNavGuard was called".
 *
 * THE GUARD (D-09 jsdom real-page): the revert behavior EARLY-RETURNS unless
 * `lastSavedSnapshot` is populated (add-session.js:711), and the snapshot is
 * only taken on the ?sessionId= EDITING branch (1803-1820, inside a
 * Promise.resolve().then at :1816). So a clean `?-URL` env would make the whole
 * test a vacuous no-op. This test boots on a SEEDED ?sessionId= editing session
 * loaded through the now-real PortfolioDB.getSession (Task 0), settles the
 * post-load microtask so lastSavedSnapshot lands, and asserts
 * PortfolioFormDirty()===false as a HARD precondition before driving any edit.
 *
 * Then it drives ONLY observable user actions: click the real edit control to
 * leave read mode, change a real field + dispatch `input`, read
 * PortfolioFormDirty(); click the real cancel/revert control and re-read the
 * flag + the restored field value. The cancel-button label is read off the
 * real .button-label textContent. The nav-guard wiring is proven by CAPTURING
 * the options object passed to App.installNavGuard and asserting its isDirty()
 * returns true while dirty and false while clean.
 *
 * FALSIFIABLE (per feedback-behavior-verification): neutralise
 * revertSessionForm's snapshot restore and the revert case FAILS; an internal
 * rename (revertSessionForm → undoForm) with no observable change keeps every
 * case GREEN (D-08/D-12). Mutation-kill recorded in the plan SUMMARY.
 *
 * F-A (vacuous-green trap): the page DOMContentLoaded handler is async — guarded
 * by capture-and-await (the 25-06 docListeners pattern) + an end-of-file count
 * guard asserting EXPECTED_COUNT cases ran.
 *
 * Read-only: EVALS assets/* into an isolated jsdom window; writes no assets/*.
 *
 * Run: node tests/30-form-dirty-revert.test.js
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

// Distinguishable i18n strings so the cancel-label flip is observable.
var T = { 'session.discard': 'DISCARD_LABEL', 'confirm.cancel': 'CANCEL_LABEL' };

var SEEDED_SESSION_ID = 42;
var SEEDED_CLIENT_ID = 7;
var ORIGINAL_TRAPPED = 'ORIGINAL trapped emotions text';
var SEEDED_NEXT_DATE = '2026-09-15';

/**
 * Build a jsdom add-session.html page booted on a SEEDED ?sessionId= editing
 * session. Eval app.js first to obtain the REAL severity pair (createIssueBlock
 * needs it), capture the single async DOMContentLoaded handler, inject the App
 * stub (capturing the installNavGuard options) + the store-backed mock seeded
 * with the editing session and its client.
 */
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

  // Real severity pair from app.js (createIssueBlock → App.createSeverityScale).
  win.I18N_DEFAULT = 'en';
  win.eval(readAsset('assets/app.js'));
  var realApp = win.App;
  if (typeof realApp.createSeverityScale !== 'function' ||
      typeof realApp.getSeverityValue !== 'function') {
    throw new Error('assets/app.js did not expose the real severity pair');
  }

  // Capture add-session.js's single async DOMContentLoaded handler.
  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  // Capture the options object handed to App.installNavGuard at boot (line 60).
  var navGuard = { opts: null };

  win.App = createAppStub({
    t: T,
    createSeverityScale: realApp.createSeverityScale,
    getSeverityValue: realApp.getSeverityValue,
    installNavGuard: function (opts) { navGuard.opts = opts; },
  });

  var mockDb = createMockPortfolioDB({
    clients: [{ id: SEEDED_CLIENT_ID, name: 'Test Client' }],
    sessions: [{
      id: SEEDED_SESSION_ID,
      clientId: SEEDED_CLIENT_ID,
      date: '2026-06-01',
      sessionType: 'clinic',
      trappedEmotions: ORIGINAL_TRAPPED,
      comments: 'orig comments',
      insights: '',
      customerSummary: '',
      nextSessionDate: SEEDED_NEXT_DATE,
      issues: [],
    }],
  });
  win.PortfolioDB = mockDb;

  win.eval(readAsset('assets/export-modal.js')); // export-modal.js BEFORE add-session.js (unconditional __exportModalInit boot call)
  win.eval(readAsset('assets/date-format.js')); // D-21: add-session.js boot reads window.DateFormat (todayLocalISO/parseLocal)
  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0], mockDb: mockDb, navGuard: navGuard };
}

// Boot the page on the seeded editing session and settle so lastSavedSnapshot
// (taken in the post-load Promise.resolve().then) has landed.
async function boot(env) {
  await env.domHandler();
  await settle();
}

function trappedField(win) { return win.document.getElementById('trappedEmotions'); }
function editBtn(win) { return win.document.getElementById('editSessionBtn'); }
function cancelBtn(win) { return win.document.getElementById('cancelSessionBtn'); }
function cancelLabelText(win) {
  return cancelBtn(win).querySelector('.button-label').textContent;
}

// Leave read mode (real edit control), then edit a real field through observable
// user actions: set value + dispatch a bubbling `input` so the form's
// dirty-tracking listener fires.
function editTrapped(win, newValue) {
  editBtn(win).click();
  var ta = trappedField(win);
  ta.value = newValue;
  ta.dispatchEvent(new win.Event('input', { bubbles: true, cancelable: false }));
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // A. HARD PRECONDITION — after load+settle the seeded editing session is
  //    clean (lastSavedSnapshot took effect; the dirty flag is reset).
  await test('boot on a seeded ?sessionId= editing session is CLEAN after the post-load snapshot settle (no vacuous no-op)', async function () {
    var env = buildEnv();
    var win = env.win;
    await boot(env);

    assert.strictEqual(typeof win.PortfolioFormDirty, 'function',
      'window.PortfolioFormDirty must be installed by the boot handler');
    assert.strictEqual(win.PortfolioFormDirty(), false,
      'PRECONDITION: a freshly-loaded editing session must be clean (lastSavedSnapshot set, formDirty reset) — ' +
      'if this is not false the snapshot never landed and the revert case below would be vacuous');
    assert.ok(win.document.body.classList.contains('read-mode'),
      'PRECONDITION: a loaded past session enters read-mode');
    assert.strictEqual(trappedField(win).value, ORIGINAL_TRAPPED,
      'PRECONDITION: populateSession loaded the seeded trappedEmotions value');

    env.dom.window.close();
  });

  // B. Edit flips dirty true; revert restores the field AND flips dirty false.
  await test('editing a field flips PortfolioFormDirty() true; clicking revert restores the snapshot value and flips it back to false', async function () {
    var env = buildEnv();
    var win = env.win;
    await boot(env);
    assert.strictEqual(win.PortfolioFormDirty(), false, 'precondition: clean before edit');

    editTrapped(win, 'EDITED — unsaved changes');
    await settle();
    assert.strictEqual(win.PortfolioFormDirty(), true,
      'editing a real field (value change + input event) must flip the dirty flag true');
    assert.strictEqual(trappedField(win).value, 'EDITED — unsaved changes',
      'sanity: the edit actually changed the field value');

    // Click the real cancel/revert control. App.confirmDialog defaults to
    // resolve(true) so the discard is confirmed → revertSessionForm runs.
    cancelBtn(win).click();
    await settle();

    assert.strictEqual(trappedField(win).value, ORIGINAL_TRAPPED,
      'revert must restore the field to its last-saved snapshot value');
    assert.strictEqual(win.PortfolioFormDirty(), false,
      'revert must flip the dirty flag back to false');

    env.dom.window.close();
  });

  // C. Cancel-button label flips discard ⇄ cancel with the dirty state.
  await test('cancel-button label resolves to session.discard while dirty and confirm.cancel while clean', async function () {
    var env = buildEnv();
    var win = env.win;
    await boot(env);

    assert.strictEqual(cancelLabelText(win), T['confirm.cancel'],
      'clean state: the cancel control must read the confirm.cancel label');

    editTrapped(win, 'now dirty');
    await settle();
    assert.strictEqual(cancelLabelText(win), T['session.discard'],
      'dirty state: the cancel control must flip to the session.discard label');

    cancelBtn(win).click();
    await settle();
    assert.strictEqual(cancelLabelText(win), T['confirm.cancel'],
      'after revert (clean again): the label must flip back to confirm.cancel');

    env.dom.window.close();
  });

  // D. Captured nav-guard isDirty() tracks the LIVE PortfolioFormDirty() — NOT
  //    merely "installNavGuard was called".
  await test('the nav-guard isDirty callback captured at boot returns true while dirty and false while clean', async function () {
    var env = buildEnv();
    var win = env.win;
    await boot(env);

    assert.ok(env.navGuard.opts && typeof env.navGuard.opts.isDirty === 'function',
      'App.installNavGuard must be handed an options object carrying an isDirty callback');
    var isDirty = env.navGuard.opts.isDirty;

    assert.strictEqual(isDirty(), false,
      'clean state: the captured nav-guard isDirty() must read false');

    editTrapped(win, 'dirty for nav guard');
    await settle();
    assert.strictEqual(isDirty(), true,
      'dirty state: the captured nav-guard isDirty() must read true (it reads live PortfolioFormDirty())');

    cancelBtn(win).click();
    await settle();
    assert.strictEqual(isDirty(), false,
      'after revert: the captured nav-guard isDirty() must read false again');

    env.dom.window.close();
  });

  // E. snapshotFormState must CAPTURE nextSessionDate so Cancel→Discard restores
  //    it (research Pitfall 2). Edit the field, revert, assert it is restored to
  //    the last-saved snapshot value. RED until Plan 38-04 wires the field +
  //    adds nextSessionDate to snapshotFormState/populateSession.
  await test('editing #nextSessionDate flips dirty; revert restores it to the last-saved value (snapshotFormState captures nextSessionDate — Pitfall 2)', async function () {
    var env = buildEnv();
    var win = env.win;
    await boot(env);
    assert.strictEqual(win.PortfolioFormDirty(), false, 'precondition: clean before edit');

    var field = win.document.getElementById('nextSessionDate');
    assert.ok(field, '#nextSessionDate must exist on the add-session page (RED until Plan 38-04 wires the field)');
    assert.strictEqual(field.value, SEEDED_NEXT_DATE,
      'PRECONDITION: populateSession must load the seeded nextSessionDate into the field');

    // Leave read mode, edit the next-session date, dispatch a bubbling input so the
    // form's dirty-tracking listener fires.
    editBtn(win).click();
    field.value = '2027-01-01';
    field.dispatchEvent(new win.Event('input', { bubbles: true, cancelable: false }));
    await settle();
    assert.strictEqual(win.PortfolioFormDirty(), true,
      'editing #nextSessionDate (value change + input) must flip the dirty flag true');

    cancelBtn(win).click();
    await settle();

    assert.strictEqual(field.value, SEEDED_NEXT_DATE,
      'revert must restore #nextSessionDate to its last-saved snapshot value — proves snapshotFormState captured it (Pitfall 2 guard)');
    assert.strictEqual(win.PortfolioFormDirty(), false,
      'revert must flip the dirty flag back to false');

    env.dom.window.close();
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────────
  var EXPECTED_COUNT = 5;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 30-07 form-dirty-revert tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (e) { console.error(e); process.exit(1); });
