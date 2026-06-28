/**
 * tests/30-snippet-wiring.test.js — snippet editor SCREEN WIRING round-trip
 * (TEST-03, GAP-03a / region A2, D-08/D-09).
 *
 * ROOT CAUSE THIS CLOSES: 30-VERIFICATION GAP-03 — only the 8 leaf snippet
 * helpers (isTriggerUnique, validateImportPayload, detectImportCollisions,
 * filterSnippetList, isModifiedSeed, isValidTrigger, hyphenateSpaces,
 * getCrossLangWarning) are pinned today. The snippet-settings SCREEN WIRING in
 * assets/settings.js IIFE-2 — openEditor → handleSave (add vs update),
 * handleDelete, afterSnippetMutation → renderSnippetList, and the boot() event
 * bindings — has zero observable coverage. A Phase-31 extraction that silently
 * dropped a write, mis-wired the add-vs-update branch, or stopped re-rendering
 * the list would ship with no automated tripwire. This file pins that wiring.
 *
 * THE GUARD (D-09 jsdom real-page): load the REAL settings.html body + the REAL
 * assets/settings.js into a jsdom window, inject the spy-instrumented store-
 * backed PortfolioDB mock (tests/_helpers/mock-portfolio-db.js, 30-07 Task-0
 * addSnippet/updateSnippet/deleteSnippet) and the App.* stub (app-stub.js,
 * 30-07 Task-0 getSnippets/refreshSnippetCache), drive the REAL IIFE-2 snippets
 * boot handler + the REAL editor controls, then assert OBSERVABLE behavior only
 * (D-08): the persistence-call args captured by the mock, the App.showToast
 * key, and the rendered #snippetList contents. Never an internal function name.
 *
 * WHY the delta-capture (F-F cross-handler flake): the snippets boot handler now
 * lives in assets/settings-snippets.js (extracted from settings.js). We snapshot
 * the captured-handler count, eval settings-snippets.js, assert it registered
 * exactly one new DOMContentLoaded handler, and invoke ONLY that one — never a
 * blanket dispatchEvent that would also boot the other settings handlers and let
 * an unrelated async rejection flake this test. The +1 delta is extraction-robust:
 * it does not couple to a fixed handler count or positional index, so it survives
 * later settings.js extractions (e.g. Photos in plan 04).
 *
 * WHY global.PortfolioDB (landmine): app-stub.refreshSnippetCache reads
 * `window.PortfolioDB || global.PortfolioDB` (it runs in Node module scope, not
 * the jsdom window, so `window` is undefined there). buildEnv mirrors the
 * mockDb onto global.PortfolioDB so afterSnippetMutation → refreshSnippetCache
 * pulls the LIVE snippet store back into App.getSnippets() — making a write
 * observable in the rendered list with NO per-test plumbing (the real cache
 * contract, app.js:87-104). Cleared at end-of-file.
 *
 * FALSIFIABLE (per feedback-behavior-verification + mutation-kill G1): in a
 * scratch copy of settings.js, force handleSave to always addSnippet (drop the
 * `editingSnippet ? updateSnippet : addSnippet` branch) → the UPDATE case FAILS
 * (a duplicate row appears / updateSnippet never fires). Restored → GREEN. An
 * internal rename (openEditor → openSnippetModal) keeps it GREEN (D-08/D-12). A
 * source-grep could not tell those apart; executing the module + reading the
 * persisted args and rendered list can.
 *
 * F-A (vacuous-green trap): the boot handler + handleSave/handleDelete are
 * async; a naive synchronous dispatch could exit green with zero work done.
 * Guarded two ways: (1) we capture + invoke the SPECIFIC snippets boot handler
 * then settle() the microtask/timer queue after every async-driven event; (2)
 * an end-of-file count guard asserts exactly EXPECTED_COUNT cases executed.
 *
 * Read-only: this test EVALS assets/settings.js + settings.html into an
 * isolated jsdom window; it never writes any assets/* production file.
 *
 * Run: node tests/30-snippet-wiring.test.js
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

// Flush the microtask + 0ms-timer queue several times so the async boot →
// handleSave → addSnippet/updateSnippet → afterSnippetMutation →
// refreshSnippetCache → renderSnippetList chain fully resolves.
function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle() { for (var i = 0; i < 8; i++) { await flush(); } }

/**
 * Build a jsdom env: real settings.html + real settings.js, with the store-
 * backed spy DB mock and App stub injected. Captures the 5 DOMContentLoaded
 * handlers and returns ONLY the IIFE-2 (snippets) boot handler.
 *
 * mockDb + appStub are seeded from the SAME snippet array so App.getSnippets()
 * matches the DB before any mutation; afterSnippetMutation → refreshSnippetCache
 * then re-pulls the LIVE store, so a write becomes observable in the list.
 */
function buildEnv(seedSnippets) {
  seedSnippets = seedSnippets || [];
  var html = readAsset('settings.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/settings.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, opts) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, opts);
  };

  var mockDb = createMockPortfolioDB({ snippets: seedSnippets });
  var appStub = createAppStub({ snippets: seedSnippets });

  win.PortfolioDB = mockDb;
  win.App = appStub;
  // app-stub.refreshSnippetCache resolves PortfolioDB via window/global; it runs
  // in Node scope where `window` is undefined, so mirror the mock onto global.
  global.PortfolioDB = mockDb;

  // BroadcastChannel is referenced by postSnippetsChanged — inject a no-op.
  win.BroadcastChannel = function () {
    return { postMessage: function () {}, close: function () {}, addEventListener: function () {} };
  };
  // Snippets.getPrefix is read by renderSnippetList / wirePrefixInput.
  win.Snippets = { getPrefix: function () { return ';'; }, setPrefix: function () {} };
  win.SNIPPETS_SEED = [];

  // settings-snippets.js registers exactly the snippets boot handler. Capture it
  // by an extraction-robust delta (NOT a fixed count/index): snapshot the handler
  // count, eval the snippets file, assert it added exactly one handler, and select
  // that one. This survives further settings.js extractions (e.g. Photos in plan 04).
  var beforeSnip = captured.length;
  win.eval(readAsset('assets/settings-snippets.js'));
  if (captured.length - beforeSnip !== 1) {
    throw new Error('expected settings-snippets.js to register exactly 1 DOMContentLoaded handler; got ' +
      (captured.length - beforeSnip));
  }
  var snippetsBoot = captured[captured.length - 1];

  win.eval(readAsset('assets/settings.js'));

  return { dom: dom, win: win, mockDb: mockDb, appStub: appStub, snippetsBoot: snippetsBoot };
}

// Observable: the bare triggers rendered in the snippet list, in DOM order.
function renderedTriggers(win) {
  var els = win.document.querySelectorAll('#snippetList .snippets-list-row .snippets-list-trigger');
  return Array.prototype.map.call(els, function (el) { return el.textContent; });
}

// Observable: the messageKey args App.showToast recorded (settings.js showToast
// calls App.showToast("", messageKey), so the key is arg index 1).
function toastKeys(appStub) {
  return (appStub.__calls.get('showToast') || []).map(function (args) { return args[1]; });
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── A. ADD: openEditor(null) → fill → Save persists via addSnippet ───────
  await test('ADD: add → fill trigger+expansion → Save calls addSnippet with the fields, toasts saved, and the new trigger renders in the list', async function () {
    var env = buildEnv([]);                 // start empty
    var win = env.win;
    await env.snippetsBoot();
    await settle();

    assert.deepStrictEqual(renderedTriggers(win), [], 'list must start empty');

    win.document.getElementById('addSnippetBtn').click();   // openEditor(null)
    var trigInput = win.document.getElementById('snippetEditorTrigger');
    var expInput = win.document.getElementById('snippetEditorActiveExpansion');
    assert.ok(!win.document.getElementById('snippetEditorModal').classList.contains('is-hidden'),
      'the editor modal must open on Add');

    trigInput.value = 'welcome';
    expInput.value = 'Welcome to the practice';
    win.document.getElementById('snippetEditorSave').click();   // async handleSave
    await settle();

    // OBSERVABLE PERSISTENCE: addSnippet recorded with the entered fields.
    var addCalls = env.mockDb.__calls.get('addSnippet');
    assert.strictEqual(addCalls.length, 1, 'Save (add mode) must call addSnippet exactly once');
    var rec = addCalls[0][0];
    assert.strictEqual(rec.trigger, 'welcome', 'addSnippet must carry the entered trigger');
    assert.strictEqual((rec.expansions || {}).he, 'Welcome to the practice',
      'addSnippet must carry the entered expansion for the active language');
    assert.ok(rec.updatedAt, 'addSnippet record must carry updatedAt');
    assert.strictEqual(env.mockDb.__calls.get('updateSnippet').length, 0,
      'add mode must NOT call updateSnippet');

    // OBSERVABLE TOAST + LIST: saved toast + the new trigger rendered.
    assert.ok(toastKeys(env.appStub).indexOf('snippets.toast.saved') >= 0,
      'Save must show the snippets.toast.saved toast');
    assert.deepStrictEqual(renderedTriggers(win), ['welcome'],
      'after Save the rendered list must contain the new trigger (refreshSnippetCache round-trip)');

    win.document.getElementById('snippetEditorModal'); // sanity
    env.dom.window.close();
  });

  // ─── B. UPDATE: edit a seeded snippet → Save calls updateSnippet, no dup ───
  await test('UPDATE: editing a seeded snippet and Saving calls updateSnippet (not addSnippet) with no duplicate row', async function () {
    var existing = {
      id: 'user.seed1', trigger: 'greet', origin: 'user',
      expansions: { he: 'old text' }, tags: [],
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    };
    var env = buildEnv([existing]);
    var win = env.win;
    await env.snippetsBoot();
    await settle();

    assert.deepStrictEqual(renderedTriggers(win), ['greet'], 'the seeded snippet must render');

    // Open the editor via the REAL list-row edit button (calls openEditor(snippet)).
    var row = win.document.querySelector('#snippetList .snippets-list-row[data-snippet-id="user.seed1"]');
    assert.ok(row, 'the seeded row must be present');
    row.querySelector('.icon-button:not(.danger)').click();   // edit
    assert.ok(!win.document.getElementById('snippetEditorModal').classList.contains('is-hidden'),
      'the editor modal must open on edit');

    // Change the expansion, keep the same trigger.
    win.document.getElementById('snippetEditorActiveExpansion').value = 'fresh text';
    win.document.getElementById('snippetEditorSave').click();
    await settle();

    var updCalls = env.mockDb.__calls.get('updateSnippet');
    assert.strictEqual(updCalls.length, 1, 'edit mode must call updateSnippet exactly once');
    assert.strictEqual(updCalls[0][0].id, 'user.seed1',
      'updateSnippet must preserve the edited snippet id');
    assert.strictEqual((updCalls[0][0].expansions || {}).he, 'fresh text',
      'updateSnippet must carry the edited expansion');
    assert.strictEqual(env.mockDb.__calls.get('addSnippet').length, 0,
      'edit mode must NOT call addSnippet (no duplicate write)');

    // No duplicate row — still exactly one "greet".
    var triggers = renderedTriggers(win);
    assert.deepStrictEqual(triggers, ['greet'],
      'after edit the list must still contain exactly one "greet" row (no duplicate)');

    env.dom.window.close();
  });

  // ─── C. DELETE: list-row delete → deleteSnippet + toast + row gone ─────────
  await test('DELETE: confirming a list-row delete calls deleteSnippet(id), toasts deleted, and the row leaves the list', async function () {
    var existing = {
      id: 'user.seed2', trigger: 'signoff', origin: 'user',
      expansions: { he: 'bye' }, tags: [],
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    };
    var env = buildEnv([existing]);
    var win = env.win;
    // App.confirmDialog defaults to resolve(true) in the stub.
    await env.snippetsBoot();
    await settle();

    assert.deepStrictEqual(renderedTriggers(win), ['signoff'], 'the seeded snippet must render');

    var row = win.document.querySelector('#snippetList .snippets-list-row[data-snippet-id="user.seed2"]');
    row.querySelector('.icon-button.danger').click();   // handleDelete(snippet)
    await settle();

    var delCalls = env.mockDb.__calls.get('deleteSnippet');
    assert.strictEqual(delCalls.length, 1, 'confirmed delete must call deleteSnippet exactly once');
    assert.strictEqual(String(delCalls[0][0]), 'user.seed2', 'deleteSnippet must be called with the row id');
    assert.ok(toastKeys(env.appStub).indexOf('snippets.toast.deleted') >= 0,
      'delete must show the snippets.toast.deleted toast');
    assert.deepStrictEqual(renderedTriggers(win), [],
      'after delete the row must leave the rendered list');

    env.dom.window.close();
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────
  var EXPECTED_COUNT = 3;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    delete global.PortfolioDB;
    process.exit(1);
  }

  delete global.PortfolioDB;
  console.log('');
  console.log('Plan 30-08 snippet-wiring (GAP-03a) tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
