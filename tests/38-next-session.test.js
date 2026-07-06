/**
 * tests/38-next-session.test.js — NEXT-SESSION date field (add-session page)
 * behavior spec (NEXT-01/02, D-05/D-06/D-08). Authored in Wave 1 BEFORE the
 * field is wired (Plan 38-04) — RED-BY-DESIGN.
 *
 * Per MEMORY `feedback-behavior-verification`, runtime-behavior code requires a
 * FALSIFIABLE behavior test written BEFORE implementation. This file boots the
 * REAL assets/add-session.js against a jsdom add-session.html page (mirroring the
 * tests/30-form-dirty-revert.test.js harness) and asserts the four observable
 * behaviors the field must have — never a stub of the field:
 *
 *   1. SAVE (NEXT-01): a value typed into #nextSessionDate is persisted into the
 *      saved session record as session.nextSessionDate === that YYYY-MM-DD string.
 *   2. POPULATE (NEXT-01, D-05): loading an existing session with a nextSessionDate
 *      sets #nextSessionDate.value to it; a session lacking the key leaves the
 *      input empty (no crash).
 *   3. RESET (NEXT-01): starting a NEW session clears #nextSessionDate.value to "".
 *   4. DYNAMIC MIN (NEXT-02, D-08): #nextSessionDate.min === #sessionDate.value
 *      (same-day allowed); emptying #sessionDate REMOVES the min attribute (NOT
 *      min=today); changing #sessionDate re-applies min to the new value.
 *
 * WHY IT IS RED TODAY: neither the #nextSessionDate element nor the
 * syncNextSessionMin() logic exists yet (Plan 38-04 wires them). Every case first
 * asserts the element's existence, so the failure is a clean, falsifiable RED at
 * the assertion — NOT a harness/syntax error. The file loads the real
 * add-session.js and reaches the assertions. It flips GREEN only when 38-04 lands
 * the field + the save/populate/reset/min wiring — it is NOT weakened to pass.
 *
 * FALSIFIABILITY of the min case (D-08): the min-absent assertion (min attribute
 * REMOVED when the session date is empty) rejects a mistaken `min=today`
 * implementation — such an implementation would FAIL this test.
 *
 * Date construction uses window.DateFormat (todayLocalISO / parseLocal) — never
 * `new Date("YYYY-MM-DD")` — matching the shipped local-time engine.
 *
 * Read-only: EVALS assets/* into an isolated jsdom window; writes no assets/*.
 *
 * Run: node tests/38-next-session.test.js
 * Exits 0 on full pass, 1 on any failure (RED until Plan 38-04 lands).
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

var SEEDED_CLIENT_ID = 7;
var SEEDED_SESSION_ID = 42;
var ORIGINAL_TRAPPED = 'ORIGINAL trapped emotions text';

/**
 * Build a jsdom add-session.html page booted against the REAL add-session.js.
 * opts.sessionId (number|null): when set, boots the ?sessionId= EDITING branch on
 *   a seeded session; when null, boots a fresh NEW-session page.
 * opts.seededSession: the session record to seed (for the editing branch).
 * Mirrors tests/30-form-dirty-revert.test.js buildEnv: eval app.js for the REAL
 * severity pair, capture the single async DOMContentLoaded handler, inject the
 * App stub (capturing installNavGuard opts) + the store-backed mock DB, then eval
 * export-modal.js → date-format.js → add-session.js.
 */
function buildEnv(opts) {
  opts = opts || {};
  var seededSession = opts.seededSession || null;
  var url = 'https://localhost/add-session.html' +
    (opts.sessionId != null ? ('?sessionId=' + opts.sessionId) : '');

  var html = readAsset('add-session.html');
  var dom = new JSDOM(html, {
    url: url,
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
  // add-session.js references a global BroadcastChannel at boot (app-stub note a).
  if (typeof win.BroadcastChannel !== 'function') {
    win.BroadcastChannel = function () {
      return { postMessage: function () {}, close: function () {}, addEventListener: function () {} };
    };
  }

  // Real severity pair from app.js (createIssueBlock → App.createSeverityScale).
  win.I18N_DEFAULT = 'en';
  win.eval(readAsset('assets/app.js'));
  var realApp = win.App;
  if (typeof realApp.createSeverityScale !== 'function' ||
      typeof realApp.getSeverityValue !== 'function') {
    throw new Error('assets/app.js did not expose the real severity pair');
  }

  // Capture add-session.js's single async DOMContentLoaded handler (override
  // AFTER app.js eval so only add-session.js's listener is captured).
  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  var navGuard = { opts: null };
  win.App = createAppStub({
    createSeverityScale: realApp.createSeverityScale,
    getSeverityValue: realApp.getSeverityValue,
    installNavGuard: function (o) { navGuard.opts = o; },
  });

  var sessions = seededSession ? [seededSession] : [];
  var mockDb = createMockPortfolioDB({
    clients: [{ id: SEEDED_CLIENT_ID, name: 'Test Client' }],
    sessions: sessions,
  });
  win.PortfolioDB = mockDb;

  win.eval(readAsset('assets/export-modal.js')); // BEFORE add-session.js (unconditional __exportModalInit boot)
  win.eval(readAsset('assets/date-format.js'));   // add-session.js boot reads window.DateFormat (todayLocalISO/parseLocal)
  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0], mockDb: mockDb, navGuard: navGuard };
}

async function boot(env) {
  await env.domHandler();
  await settle();
}

function el(win, id) { return win.document.getElementById(id); }
function nextDateField(win) { return el(win, 'nextSessionDate'); }
function sessionDateField(win) { return el(win, 'sessionDate'); }

// Set a date input's value and fire the events a sync listener could be bound to
// (whichever of input/change 38-04 uses, this triggers it).
function setDateValue(win, field, value) {
  field.value = value;
  field.dispatchEvent(new win.Event('input', { bubbles: true, cancelable: false }));
  field.dispatchEvent(new win.Event('change', { bubbles: true, cancelable: false }));
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // 1. POPULATE (with key) — editing a session that HAS a nextSessionDate sets
  //    the field's .value to the stored YYYY-MM-DD (NEXT-01, D-05).
  await test('POPULATE: loading an existing session with nextSessionDate sets #nextSessionDate.value to the stored YYYY-MM-DD', async function () {
    var env = buildEnv({
      sessionId: SEEDED_SESSION_ID,
      seededSession: {
        id: SEEDED_SESSION_ID, clientId: SEEDED_CLIENT_ID, date: '2026-06-01',
        sessionType: 'clinic', trappedEmotions: ORIGINAL_TRAPPED, comments: '',
        insights: '', customerSummary: '', issues: [],
        nextSessionDate: '2026-09-15',
      },
    });
    var win = env.win;
    await boot(env);

    var f = nextDateField(win);
    assert.ok(f, '#nextSessionDate must exist on the add-session page (RED until Plan 38-04 wires the field)');
    assert.strictEqual(f.value, '2026-09-15',
      'populateSession must set #nextSessionDate.value to the stored session.nextSessionDate');

    env.dom.window.close();
  });

  // 2. POPULATE (missing key) — editing a session WITHOUT the key leaves the
  //    field empty and does not crash the boot (NEXT-01, D-05).
  await test('POPULATE (missing key): a session lacking nextSessionDate leaves #nextSessionDate empty and does not crash the boot', async function () {
    var env = buildEnv({
      sessionId: SEEDED_SESSION_ID,
      seededSession: {
        id: SEEDED_SESSION_ID, clientId: SEEDED_CLIENT_ID, date: '2026-06-01',
        sessionType: 'clinic', trappedEmotions: ORIGINAL_TRAPPED, comments: '',
        insights: '', customerSummary: '', issues: [],
        // no nextSessionDate key
      },
    });
    var win = env.win;
    await boot(env);

    // Boot reached read-mode + populated the sibling field => no crash on the
    // missing key (a guard-less populate would have thrown before this).
    assert.strictEqual(el(win, 'trappedEmotions').value, ORIGINAL_TRAPPED,
      'PRECONDITION: populateSession ran (trappedEmotions populated) — proves the boot did not crash');
    var f = nextDateField(win);
    assert.ok(f, '#nextSessionDate must exist on the add-session page (RED until Plan 38-04 wires the field)');
    assert.strictEqual(f.value, '',
      'a session lacking nextSessionDate must leave #nextSessionDate empty (no undefined/crash)');

    env.dom.window.close();
  });

  // 3. RESET (new session) — a fresh add-session page starts with an EMPTY
  //    nextSessionDate field (NEXT-01).
  await test('RESET: starting a NEW session leaves #nextSessionDate.value === "" (empty)', async function () {
    var env = buildEnv({ sessionId: null });
    var win = env.win;
    await boot(env);

    var f = nextDateField(win);
    assert.ok(f, '#nextSessionDate must exist on the add-session page (RED until Plan 38-04 wires the field)');
    assert.strictEqual(f.value, '',
      'a new session must reset #nextSessionDate to an empty value');

    env.dom.window.close();
  });

  // 4. SAVE — a value typed into #nextSessionDate is persisted into the saved
  //    session record (NEXT-01). Drives the REAL submit → mock addSession payload.
  await test('SAVE: a value in #nextSessionDate persists as session.nextSessionDate on the saved record', async function () {
    var env = buildEnv({ sessionId: null });
    var win = env.win;
    await boot(env);

    var f = nextDateField(win);
    assert.ok(f, '#nextSessionDate must exist on the add-session page (RED until Plan 38-04 wires the field)');

    // Fill the minimum valid new-session form: a client + a session date + the
    // next-session date under test. sessionDate default is today; set explicitly.
    el(win, 'clientSelect').value = String(SEEDED_CLIENT_ID);
    setDateValue(win, sessionDateField(win), win.DateFormat.todayLocalISO());
    // The save handler also requires >=1 NAMED issue (validateIssues > 0) — a
    // pre-existing precondition unrelated to nextSessionDate. Mirror the sibling
    // tests/30-save-redirect.js seedValidForm so submit reaches the addSession
    // path instead of bailing at toast.issueMissing (Wave-1 setup gap).
    win.document.querySelector('#issueList .issue-block input.input').value = 'Anxiety';
    var NEXT = '2026-10-20';
    f.value = NEXT;

    win.document.getElementById('sessionForm')
      .dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
    await settle();

    var addCalls = env.mockDb.__calls.get('addSession');
    assert.ok(addCalls.length >= 1, 'the save must call PortfolioDB.addSession exactly once for a new session');
    var payload = addCalls[0][0];
    assert.strictEqual(payload.nextSessionDate, NEXT,
      'the saved session record must carry nextSessionDate === the #nextSessionDate value');

    env.dom.window.close();
  });

  // 5. DYNAMIC MIN (D-08 / NEXT-02) — min tracks #sessionDate.value; emptying the
  //    session date REMOVES min (NOT min=today); a change re-applies it.
  await test('DYNAMIC MIN: #nextSessionDate.min equals #sessionDate.value, is REMOVED when the session date is emptied (not today), and re-applies on change', async function () {
    var env = buildEnv({ sessionId: null });
    var win = env.win;
    await boot(env);

    var nf = nextDateField(win);
    assert.ok(nf, '#nextSessionDate must exist on the add-session page (RED until Plan 38-04 wires the field)');
    var sf = sessionDateField(win);

    // (a) min mirrors the session date (same-day allowed).
    setDateValue(win, sf, '2026-08-10');
    await settle();
    assert.strictEqual(nf.getAttribute('min'), '2026-08-10',
      'after setting the session date, #nextSessionDate.min must equal #sessionDate.value (same-day allowed)');

    // (b) emptying the session date REMOVES the min attribute — NOT min=today.
    //     A mistaken `min=today` implementation FAILS here (falsifiability, D-08).
    setDateValue(win, sf, '');
    await settle();
    assert.strictEqual(nf.hasAttribute('min'), false,
      'when the session date is empty, the min attribute must be REMOVED (not set to today)');

    // (c) changing the session date re-applies min to the new value.
    setDateValue(win, sf, '2026-08-20');
    await settle();
    assert.strictEqual(nf.getAttribute('min'), '2026-08-20',
      'changing the session date must re-apply #nextSessionDate.min to the new value');

    env.dom.window.close();
  });

  // ─── count guard (vacuous-green trap) ────────────────────────────────────────
  var EXPECTED_COUNT = 5;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped.');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 38-01 next-session field tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (e) { console.error(e); process.exit(1); });
