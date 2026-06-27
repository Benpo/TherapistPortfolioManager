/**
 * tests/30-snippet-import-merge.test.js — snippet import → applyImport
 * collision-MERGE (REPLACE branch) round-trip (TEST-03, GAP-03b / region A2,
 * D-08/D-09).
 *
 * ROOT CAUSE THIS CLOSES: 30-VERIFICATION GAP-03 — the import collision-MERGE
 * path in assets/settings.js IIFE-2 (handleImportFile :1721-1766 → collision
 * modal → applyImport :1826-1867) is unpinned. The REPLACE branch
 * (settings.js:1837-1845) preserves the EXISTING snippet id so a re-imported
 * trigger updates in place instead of creating a duplicate. Only the leaf
 * detectImportCollisions is unit-tested today; nothing drives the real
 * file-input → FileReader → modal → applyImport plumbing. A Phase-31
 * extraction that turned a collision into a duplicate-add would ship silent.
 *
 * THE GUARD (D-09 jsdom real-page, REAL plumbing): load the REAL settings.html
 * + assets/settings.js into jsdom, inject the store-backed spy PortfolioDB mock
 * (30-07 Task-0) and the App.* stub (getSnippets/refreshSnippetCache), seed an
 * EXISTING snippet whose trigger collides with an imported row, then drive the
 * REAL import path: dispatch a `change` on the import file input carrying a
 * File (FileReader reads it → detectImportCollisions sees the collision →
 * default "replace" decision → openCollisionModal), settle(), then click the
 * REAL #snippetImportApply button → applyImport runs the REPLACE branch.
 *
 * DELIBERATELY NOT the leaf: we never call
 * window.__SnippetEditorHelpers.detectImportCollisions and assert its return —
 * that proves the helper, not the wiring. The whole point of GAP-03b is the
 * plumbing, so the test fires the real file-input event and clicks the real
 * apply button (prohibition in 30-08-PLAN).
 *
 * ASSERT OBSERVABLE (D-08): updateSnippet recorded with the PRESERVED existingId
 * (settings.js:1842), addSnippet NOT called for the colliding trigger, and the
 * colliding trigger appears EXACTLY ONCE in the rendered #snippetList (no
 * duplicate). Never an internal function name.
 *
 * WHY captured[1] + global.PortfolioDB: same as 30-snippet-wiring.test.js — only
 * the IIFE-2 snippets boot (captured[1], settings.js:1898) is invoked, with a
 * captured.length===5 self-check; and app-stub.refreshSnippetCache resolves
 * PortfolioDB via global (it runs in Node scope), so buildEnv mirrors the mock
 * onto global.PortfolioDB and clears it at end-of-file. The REPLACE branch is
 * reachable ONLY because App.getSnippets() returns the seeded colliding snippet
 * (30-07 Task-0 cache), so detectImportCollisions(rows, App.getSnippets()) is
 * non-empty.
 *
 * FALSIFIABLE (mutation-kill G1): in a scratch copy of settings.js, drop the
 * `id: collision.existingId` preservation in the REPLACE branch (so it mints a
 * new id) → the existingId / once-in-list assertion FAILS. Restored → GREEN. An
 * internal rename keeps it GREEN (D-08/D-12).
 *
 * F-A (vacuous-green trap): the boot + FileReader.onload + applyImport are
 * async; guarded by capturing/awaiting the specific boot handler, settle()-ing
 * after every async event, and an end-of-file EXPECTED_COUNT guard.
 *
 * Read-only: EVALS assets/settings.js + settings.html into an isolated jsdom
 * window; never writes any assets/* production file.
 *
 * Run: node tests/30-snippet-import-merge.test.js
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
async function settle() { for (var i = 0; i < 8; i++) { await flush(); } }

var COLLIDE_TRIGGER = 'greet';
var EXISTING_ID = 'user.existing-greet';

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
  global.PortfolioDB = mockDb;

  win.BroadcastChannel = function () {
    return { postMessage: function () {}, close: function () {}, addEventListener: function () {} };
  };
  win.Snippets = { getPrefix: function () { return ';'; }, setPrefix: function () {} };
  win.SNIPPETS_SEED = [];

  win.eval(readAsset('assets/settings.js'));

  if (captured.length !== 5) {
    throw new Error('expected settings.js to register 5 DOMContentLoaded handlers; got ' +
      captured.length + ' — IIFE-2 snippets-boot handler-index (1) selection is unsafe');
  }

  return { dom: dom, win: win, mockDb: mockDb, appStub: appStub, snippetsBoot: captured[1] };
}

function renderedTriggers(win) {
  var els = win.document.querySelectorAll('#snippetList .snippets-list-row .snippets-list-trigger');
  return Array.prototype.map.call(els, function (el) { return el.textContent; });
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── REPLACE/merge via the REAL file-input → applyImport plumbing ─────────
  await test('REPLACE: importing a row that collides with an existing trigger updates in place (preserved existingId) — colliding trigger appears exactly once', async function () {
    var existing = {
      id: EXISTING_ID, trigger: COLLIDE_TRIGGER, origin: 'user',
      expansions: { he: 'original greeting' }, tags: [],
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    };
    var env = buildEnv([existing]);
    var win = env.win;
    await env.snippetsBoot();
    await settle();

    // Precondition: the existing colliding snippet renders once.
    assert.deepStrictEqual(renderedTriggers(win), [COLLIDE_TRIGGER],
      'the seeded colliding snippet must render before import');

    // Build the import payload — a row with the SAME trigger, different expansion.
    var payload = {
      snippets: [
        { id: 'imported.greet', trigger: COLLIDE_TRIGGER, origin: 'user',
          expansions: { he: 'imported greeting' }, tags: [] },
      ],
    };
    var file = new win.File([JSON.stringify(payload)], 'snippets.json', { type: 'application/json' });

    // Drive the REAL plumbing: set the file input's files + dispatch change.
    var fileInput = win.document.getElementById('importSnippetsFile');
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fileInput.dispatchEvent(new win.Event('change', { bubbles: true }));
    await settle();   // FileReader.onload → detectImportCollisions → openCollisionModal

    // The collision modal must be open with the default "replace" decision.
    var importModal = win.document.getElementById('snippetImportModal');
    assert.ok(!importModal.classList.contains('is-hidden'),
      'a collision must open the import collision modal');
    var replaceBtn = win.document.querySelector(
      '#snippetImportCollisionList .snippets-import-collision-row[data-trigger="' + COLLIDE_TRIGGER + '"] button[data-choice="replace"]');
    assert.ok(replaceBtn && replaceBtn.classList.contains('is-active'),
      'the default decision for the collision must be "replace"');

    // Click the REAL apply button → applyImport REPLACE branch.
    win.document.getElementById('snippetImportApply').click();
    await settle();

    // OBSERVABLE: updateSnippet with the PRESERVED existingId; no addSnippet.
    var updCalls = env.mockDb.__calls.get('updateSnippet');
    assert.strictEqual(updCalls.length, 1, 'REPLACE must call updateSnippet exactly once');
    assert.strictEqual(updCalls[0][0].id, EXISTING_ID,
      'REPLACE must preserve the existing snippet id (settings.js:1842)');
    assert.strictEqual((updCalls[0][0].expansions || {}).he, 'imported greeting',
      'REPLACE must carry the imported expansion');
    assert.strictEqual(env.mockDb.__calls.get('addSnippet').length, 0,
      'REPLACE must NOT call addSnippet for the colliding trigger (no duplicate write)');

    // OBSERVABLE: the colliding trigger appears EXACTLY ONCE in the list.
    var triggers = renderedTriggers(win);
    var occurrences = triggers.filter(function (tr) { return tr === COLLIDE_TRIGGER; }).length;
    assert.strictEqual(occurrences, 1,
      'the colliding trigger must appear exactly once after merge (got ' + occurrences + ')');

    env.dom.window.close();
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────
  var EXPECTED_COUNT = 1;
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
  console.log('Plan 30-08 snippet-import-merge (GAP-03b) tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
