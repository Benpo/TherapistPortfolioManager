/**
 * tests/30-settings-section-roundtrip.test.js — settings section-title
 * save/load round-trip (TEST-03a, D-07/D-08/D-09).
 *
 * ROOT CAUSE THIS CLOSES: TESTING.md "What Is NOT Tested" lists "Settings
 * save/load round-trips" as an uncovered gap. The section-title editor in
 * assets/settings.js (IIFE-1 SettingsPage) persists a custom label via
 * PortfolioDB.setTherapistSetting on Save (onSave, settings.js:448) and reverts
 * via loadAndRender on Discard (onDiscard, settings.js:525). Nothing executed
 * that round-trip before this test, so a Phase 31 extraction that silently
 * dropped the saved value, failed to re-render it, or mis-wired Discard would
 * ship with no automated tripwire.
 *
 * THE GUARD (D-09 jsdom real-page): load the REAL settings.html body + the REAL
 * assets/settings.js into a jsdom window, inject the spy-instrumented
 * PortfolioDB mock (tests/_helpers/mock-portfolio-db.js) and the App.* stub
 * (tests/_helpers/app-stub.js), drive the REAL IIFE-1 DOMContentLoaded handler,
 * then assert OBSERVABLE behavior only (D-08): the persisted record captured by
 * the mock, the value the input re-renders after the reload, and the revert +
 * no-write on Discard. Never an internal function name.
 *
 * The mock is wrapped so a write mirrors into the read store — i.e. it behaves
 * like a real PortfolioDB round-trip: after onSave persists, onSave's own
 * loadAndRender re-reads the now-persisted value and re-renders it. That makes
 * the "reload re-renders the saved value" assertion a genuine round-trip, not a
 * tautology.
 *
 * FALSIFIABLE (per feedback-behavior-verification — a behavior test must FAIL on
 * the regression it guards): in a scratch copy, drop the `customLabel` from the
 * record written in onSave (or skip the trailing `await loadAndRender()`), and
 * the round-trip test FAILS (the persisted value / re-rendered value diverges).
 * Renaming an INTERNAL helper (e.g. loadAndRender → renderSections) with no
 * observable change keeps it GREEN (D-08/D-12). A pure source-grep could not
 * tell those two mutations apart; executing the module and reading the rendered
 * input value does.
 *
 * F-A (vacuous-green trap): the IIFE-1 handler and onSave/onDiscard are async; a
 * naive synchronous dispatch would return before the assertions ran and the
 * file could exit green with zero work done. Guarded two ways: (1) we capture
 * and `await` the SPECIFIC IIFE-1 handler then `settle()` the microtask/timer
 * queue after every async-driven event; (2) an end-of-file count guard asserts
 * exactly EXPECTED_COUNT cases executed.
 *
 * F-F (cross-handler flake): settings.js registers 5 DOMContentLoaded handlers
 * (IIFE-1 fields, snippets, tab-nav, backups, photos). We invoke ONLY IIFE-1
 * (the first-registered, settings.js:643) via the captured-listener map — never
 * a blanket dispatchEvent that would also boot snippets/backups/photos and let
 * an unrelated async rejection flake this test.
 *
 * Read-only: this test EVALS assets/settings.js + settings.html into an isolated
 * jsdom window; it never writes any assets/* production file.
 *
 * Run: node tests/30-settings-section-roundtrip.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var mockDbHelper = require('./_helpers/mock-portfolio-db');
var createMockPortfolioDB = mockDbHelper.createMockPortfolioDB;
var assertNoWrites = mockDbHelper.assertNoWrites;
var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

// Flush the microtask + 0ms-timer queue once. settle() flushes several times so
// the async handler → onSave → (9× setTherapistSetting) → loadAndRender chain
// fully resolves before assertions.
function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle() { for (var i = 0; i < 6; i++) { await flush(); } }

// 'trapped' is a rename-ALLOWED section (LOCKED_RENAME = heartShield/issues/
// nextSession only), so its rename input is editable — the right subject for a
// save/discard round-trip.
var TARGET_KEY = 'trapped';

/**
 * Build a jsdom env: real settings.html + real settings.js, with the spy DB
 * mock and App stub injected. Captures the 5 DOMContentLoaded handlers and
 * returns ONLY the IIFE-1 (fields) handler so the test never boots the others.
 *
 * The mock's setTherapistSetting is wrapped to mirror each write back into the
 * read store (`seeded`), so getAllTherapistSettings on the reload reflects what
 * was just saved — a real-DB round-trip. The wrap still delegates to the
 * original spy, so `__calls.get('setTherapistSetting')` and assertNoWrites keep
 * working.
 */
function buildEnv(seeded) {
  var html = readAsset('settings.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/settings.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  // Capture DOMContentLoaded handlers (25-06 docListeners pattern); pass every
  // other listener registration through to the real document.
  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, opts) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, opts);
  };

  var mockDb = createMockPortfolioDB({ therapistSettings: seeded });
  var origSet = mockDb.setTherapistSetting;
  mockDb.setTherapistSetting = function (record) {
    // Mirror the write into the read store so a subsequent reload re-renders
    // the saved value (models real PortfolioDB persistence).
    var idx = seeded.findIndex(function (r) { return r && r.sectionKey === record.sectionKey; });
    var copy = JSON.parse(JSON.stringify(record));
    if (idx >= 0) { seeded[idx] = copy; } else { seeded.push(copy); }
    return origSet.apply(this, arguments); // still records into __calls + resolves
  };

  win.PortfolioDB = mockDb;
  win.App = createAppStub();
  // BroadcastChannel is referenced inside onSave — inject a no-op (app-stub doc
  // block note (a)).
  win.BroadcastChannel = function () {
    return { postMessage: function () {}, close: function () {}, addEventListener: function () {} };
  };
  // Harmless stubs so eval of the whole settings.js never throws. Only IIFE-1
  // is invoked; the snippets/backups/photos IIFEs are never booted.
  win.Snippets = { getPrefix: function () { return '!'; }, setPrefix: function () {} };
  win.SNIPPETS_SEED = [];
  win.BackupManager = {
    canEnableSchedule: function () { return true; },
    isAutoBackupSupported: function () { return false; },
    checkBackupSchedule: function () {},
    pickBackupFolder: function () { return Promise.resolve(null); },
  };
  win.CropModule = { resizeToMaxDimension: function () { return Promise.resolve({ size: 0 }); } };

  win.eval(readAsset('assets/settings.js'));

  // Identity-selection safety: select the fields boot by the only settings boot
  // that calls App.initCommon, asserting exactly one match. This is count/index-
  // INDEPENDENT, so it survives every settings.js extraction (Snippets 5->4,
  // Photos 4->3, ...) instead of breaking whenever the handler count drifts.
  var fieldsMatches = captured.filter(function (fn) { return String(fn).indexOf('initCommon') >= 0; });
  if (fieldsMatches.length !== 1) {
    throw new Error('expected exactly 1 fields (initCommon) DOMContentLoaded handler; got ' + fieldsMatches.length);
  }

  return { dom: dom, win: win, mockDb: mockDb, seeded: seeded, iife1: fieldsMatches[0] };
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

function seed() {
  return [{ sectionKey: TARGET_KEY, customLabel: 'Seed Trapped', enabled: true }];
}

(async function () {
  // ─── A. Precondition: IIFE-1 renders the rows from the seeded store ──────
  await test('boot (IIFE-1 only) renders the 9 section rows and shows the seeded custom label', async function () {
    var env = buildEnv(seed());
    await env.iife1();
    await settle();
    var rows = env.win.document.querySelectorAll('#settingsRowsContainer .settings-row');
    assert.strictEqual(rows.length, 9, 'expected 9 section rows rendered, got ' + rows.length);
    var input = env.win.document.querySelector('.settings-rename-input[data-section-key="' + TARGET_KEY + '"]');
    assert.ok(input, 'the trapped rename input must render');
    assert.strictEqual(input.value, 'Seed Trapped',
      'the seeded customLabel must populate the rename input on load (proves loadAndRender executed — not a vacuous green)');
    env.dom.window.close();
  });

  // ─── B. Round-trip: edit → Save → persisted + re-rendered ────────────────
  await test('round-trip: editing a section title and Saving persists the edited value, and the reload re-renders it', async function () {
    var env = buildEnv(seed());
    var win = env.win;
    await env.iife1();
    await settle();

    var input = win.document.querySelector('.settings-rename-input[data-section-key="' + TARGET_KEY + '"]');
    assert.ok(input, 'the trapped rename input must render');

    var EDITED = 'Renamed Trapped Section';
    input.value = EDITED;
    // Fire input so the form dirty-tracker enables the (initially disabled) Save.
    input.dispatchEvent(new win.Event('input', { bubbles: true }));

    var saveBtn = win.document.getElementById('settingsSaveBtn');
    assert.strictEqual(saveBtn.disabled, false, 'Save must be enabled after an edit fires the dirty tracker');

    saveBtn.click(); // async onSave: persists all sections, then loadAndRender
    await settle();

    // OBSERVABLE PERSISTENCE: the mock captured a setTherapistSetting record for
    // the edited section carrying the edited value.
    var setCalls = env.mockDb.__calls.get('setTherapistSetting');
    var trappedWrites = setCalls
      .map(function (args) { return args[0]; })
      .filter(function (rec) { return rec && rec.sectionKey === TARGET_KEY; });
    assert.ok(trappedWrites.length >= 1, 'setTherapistSetting must persist the trapped section on Save');
    assert.strictEqual(trappedWrites[trappedWrites.length - 1].customLabel, EDITED,
      'the persisted record must carry the edited customLabel (observable persistence)');

    // OBSERVABLE ROUND-TRIP: onSave re-runs loadAndRender from the now-persisted
    // store, so the freshly re-rendered input shows the saved value.
    var reloaded = win.document.querySelector('.settings-rename-input[data-section-key="' + TARGET_KEY + '"]');
    assert.ok(reloaded, 'the rename input must still be present after the post-save re-render');
    assert.strictEqual(reloaded.value, EDITED,
      'after Save + reload the rename input must re-render the saved value (the round-trip)');

    env.dom.window.close();
  });

  // ─── C. Discard half of the round-trip (F-H) ─────────────────────────────
  await test('discard: editing a section title then Discarding reverts the input and writes nothing', async function () {
    var env = buildEnv(seed());
    var win = env.win;
    await env.iife1();
    await settle();

    var input = win.document.querySelector('.settings-rename-input[data-section-key="' + TARGET_KEY + '"]');
    input.value = 'Throwaway Edit';
    // Mark dirty so onDiscard proceeds (it early-returns when !formDirty).
    input.dispatchEvent(new win.Event('input', { bubbles: true }));

    var discardBtn = win.document.getElementById('settingsDiscardBtn');
    discardBtn.click(); // async onDiscard: confirmDialog (stub→true) then loadAndRender
    await settle();

    var reverted = win.document.querySelector('.settings-rename-input[data-section-key="' + TARGET_KEY + '"]');
    assert.strictEqual(reverted.value, 'Seed Trapped',
      'Discard must revert the input to the seeded value (re-render from the unchanged store)');
    // No write may fire for a discarded edit.
    assertNoWrites(env.mockDb);

    env.dom.window.close();
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────
  var EXPECTED_COUNT = 3;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 30-04 settings-section-roundtrip tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
