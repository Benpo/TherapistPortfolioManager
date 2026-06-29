/**
 * Phase 34 (Plan 34-04, Wave 0) — FN-1 / D-03 / PDFX-02: the Ben-flagged MUST-test.
 *
 * RED-NOW data-behavior gate authored BEFORE the implementation (project hard rule
 * `feedback-behavior-verification`). Expected to FAIL today; becomes the GREEN gate
 * for 34-05 (which adds `deriveSessionOrdinal(clientId, thisSessionId)` to the
 * export-modal data-assembly tier + extends the buildSessionPDF input contract).
 *
 * --- The contract under test (FN-1, the falsifiable SPINE of the phase) ---
 *
 *   "Session #N" is a DERIVED chronological ordinal, NOT the autoIncrement id.
 *   getSessionsByClient (db.js:976-986) returns index.getAll(clientId) UNSORTED
 *   (primary-key order). deriveSessionOrdinal must sort the client's sessions
 *   ascending by ISO `date` (lexical == chronological for YYYY-MM-DD), tie-break
 *   by numeric `id`, and return (indexOf(thisSession) + 1).
 *
 *   Three behaviors are pinned:
 *     (1) 3 dated sessions whose id order ≠ date order export ordinals 1 / 2 / 3
 *         BY DATE (proving the sort happens — not getAll/id order).
 *     (2) Delete the MIDDLE session → the remaining two RENUMBER to 1 / 2 with NO
 *         gap (the former #3 becomes #2). This is the renumber case Ben flagged.
 *     (3) Two sessions sharing a date tie-break deterministically by numeric id
 *         (lower id first).
 *
 * --- Falsifiability (the FN-1 spine) ---
 *   Sessions are seeded so id order is the REVERSE/scramble of date order:
 *       A: id 7,  date 2026-01-10  (earliest → must derive #1)
 *       B: id 9,  date 2026-02-10  (middle   → must derive #2)
 *       C: id 3,  date 2026-03-10  (latest   → must derive #3)
 *   • If derivation used `session.id` (or the unsorted getAll order) instead of
 *     the date sort, A/B/C would NOT map to 1/2/3 → case (1) FAILS.
 *   • After deleting B, the date sort gives C → #2 but an id-based derivation
 *     gives C → #1 (ids {3,7}: C=3 sorts first) → the renumber case (2) FAILS.
 *   • The tie-break set is RETURNED in id-descending array order, so a date-only
 *     sort with no `|| a.id - b.id` tie-break (or one that trusts array order)
 *     mis-numbers the pair → case (3) FAILS.
 *   Swapping the derivation to `session.id` is therefore caught by (1), (2) AND (3).
 *
 * --- How the function is reached ---
 * 34-05 must expose the derivation as `deriveSessionOrdinal(clientId, thisSessionId)`
 * → Promise<number>, reading `window.PortfolioDB.getSessionsByClient` at call time.
 * This test resolves it from `window.__exportModalTestHooks.deriveSessionOrdinal`
 * (the established `window.__addSessionTestHooks` idiom in this codebase) and falls
 * back to `window.ExportModal.deriveSessionOrdinal`. RED now: export-modal.js
 * exposes only `__exportModalInit` — the hook is absent (gates 34-05).
 *
 *   node tests/34-session-ordinal.test.js   -- exit 0 = pass, exit 1 = RED/fail
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createMockPortfolioDB = require('./_helpers/mock-portfolio-db').createMockPortfolioDB;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

var CLIENT_ID = 1;

// Sessions seeded so id order is a SCRAMBLE of date order (the FN-1 spine).
var A = { id: 7, clientId: CLIENT_ID, date: '2026-01-10' }; // earliest → #1
var B = { id: 9, clientId: CLIENT_ID, date: '2026-02-10' }; // middle   → #2
var C = { id: 3, clientId: CLIENT_ID, date: '2026-03-10' }; // latest   → #3

// Tie-break pair: identical date, RETURNED id-descending to defeat an
// array-order / no-tie-break derivation. Lower id (E) must derive #1.
var TIE_DATE = '2026-05-10';
var D = { id: 20, clientId: CLIENT_ID, date: TIE_DATE };
var E = { id: 12, clientId: CLIENT_ID, date: TIE_DATE };

// Build a bare jsdom window and eval export-modal.js into it. The IIFE only
// references App/navigator INSIDE initExportModal, so a standalone eval is safe;
// it just defines functions and (post-34-05) exposes the test hook. We seed
// window.PortfolioDB so deriveSessionOrdinal's getSessionsByClient call resolves.
function buildEnv() {
  var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://localhost/add-session.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  win.eval(readAsset('assets/export-modal.js'));
  return { dom: dom, win: win };
}

// Resolve the derivation across the two sanctioned seams; null when absent (RED).
function resolveDerive(win) {
  if (win.__exportModalTestHooks && typeof win.__exportModalTestHooks.deriveSessionOrdinal === 'function') {
    return win.__exportModalTestHooks.deriveSessionOrdinal;
  }
  if (win.ExportModal && typeof win.ExportModal.deriveSessionOrdinal === 'function') {
    return win.ExportModal.deriveSessionOrdinal;
  }
  return null;
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  var env = buildEnv();
  var win = env.win;
  var derive = resolveDerive(win);

  var ABSENT_MSG =
    'deriveSessionOrdinal is not exposed (looked at window.__exportModalTestHooks' +
    '.deriveSessionOrdinal and window.ExportModal.deriveSessionOrdinal). RED now — ' +
    'gates 34-05 (FN-1 chronological-ordinal derivation).';

  // ─── (1) 3 sessions, id order ≠ date order → ordinals 1/2/3 BY DATE ──────────
  await test('three sessions (ids 7/9/3, dates Jan/Feb/Mar) derive ordinals 1/2/3 by DATE — not by id/getAll order', async function () {
    assert.ok(derive, ABSENT_MSG);
    // Seed UNSORTED (neither date nor id order) to prove the sort is internal.
    win.PortfolioDB = createMockPortfolioDB({ sessions: [B, C, A] });

    var ordA = await derive(CLIENT_ID, A.id);
    var ordB = await derive(CLIENT_ID, B.id);
    var ordC = await derive(CLIENT_ID, C.id);

    assert.strictEqual(ordA, 1, 'earliest session (id 7, Jan) must be #1 — an id/getAll-order derivation gives the wrong value');
    assert.strictEqual(ordB, 2, 'middle session (id 9, Feb) must be #2');
    assert.strictEqual(ordC, 3, 'latest session (id 3, Mar) must be #3');
  });

  // ─── (2) delete the MIDDLE session → remaining renumber to 1/2 (no gap) ──────
  await test('deleting the middle session renumbers the remaining two to 1/2 (former #3 becomes #2, no gap) — the Ben-flagged renumber case', async function () {
    assert.ok(derive, ABSENT_MSG);
    // B (the middle) removed; only A and C remain for this client.
    win.PortfolioDB = createMockPortfolioDB({ sessions: [C, A] });

    var ordA = await derive(CLIENT_ID, A.id);
    var ordC = await derive(CLIENT_ID, C.id);

    assert.strictEqual(ordA, 1, 'the surviving earliest session must still be #1');
    assert.strictEqual(ordC, 2,
      'the former #3 must RENUMBER to #2 after the middle is deleted (no gap). ' +
      'An id-based derivation (ids {3,7}) would give C=#1 here — the FN-1 falsification point.');
  });

  // ─── (3) same-date tie-break is deterministic by numeric id (lower id first) ─
  await test('two sessions sharing a date tie-break deterministically by numeric id (lower id derives the earlier ordinal)', async function () {
    assert.ok(derive, ABSENT_MSG);
    // Returned id-DESCENDING [D(20), E(12)] to defeat array-order/no-tie-break.
    win.PortfolioDB = createMockPortfolioDB({ sessions: [D, E] });

    var ordE = await derive(CLIENT_ID, E.id);
    var ordD = await derive(CLIENT_ID, D.id);

    assert.strictEqual(ordE, 1, 'the lower id (12) must derive #1 — the id tie-break must override the id-descending return order');
    assert.strictEqual(ordD, 2, 'the higher id (20) must derive #2');
  });

  env.dom.window.close();

  console.log('Passed ' + passed + '/' + (passed + failed) + ', Failed ' + failed + '.');
  if (failed > 0) {
    console.log('(RED as expected while deriveSessionOrdinal is unimplemented — the GREEN gate for 34-05.)');
  }
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (err) {
  console.error('FATAL:', err);
  process.exit(1);
});
