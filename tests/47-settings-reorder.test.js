/**
 * tests/47-settings-reorder.test.js — Settings grouped-reorder behavior.
 *
 * Guards the arrow-reorder + clamp + persistence path in assets/settings.js:
 * the Fields list renders as one grouped reorder list derived from
 * App.getSectionOrder(), up/down arrows reorder within level/group, every drop
 * is clamped by the SHARED App.sanitizeOrder, and the staged order persists via
 * the sectionOrder sentinel on the existing Save flow.
 *
 * REAL-PAGE, OBSERVABLE-ONLY (mirrors tests/30-settings-section-roundtrip.test.js):
 * load the REAL settings.html + assets/settings.js into a jsdom window; source
 * the REAL order foundation (getSectionOrder / sanitizeOrder / DEFAULT_SECTION_ORDER
 * / GROUP_DEFAULT_TITLE_KEYS / refreshSectionOrderCache) from assets/app.js via
 * createAppStub overrides (app.js is a side-effect-free IIFE whose only top-level
 * read is window.I18N_DEFAULT); drive the REAL IIFE-1 DOMContentLoaded handler and
 * the REAL arrow buttons; assert the persisted sentinel captured by the spy DB.
 *
 * FALSIFIABLE: if the arrow move stopped funnelling through App.sanitizeOrder, or
 * if the severity-after-topics clamp were removed, an afterSeverity-before-issues
 * move would persist issues AFTER afterSeverity and Test A would FAIL. If a
 * within-group member move did not persist, Test B would FAIL.
 *
 * Run: node tests/47-settings-reorder.test.js  (exit 0 pass / 1 fail)
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var mockDbHelper = require('./_helpers/mock-portfolio-db');
var createMockPortfolioDB = mockDbHelper.createMockPortfolioDB;
var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle() { for (var i = 0; i < 8; i++) { await flush(); } }

/**
 * Build a jsdom env with the REAL settings page + the REAL order foundation.
 * Returns the captured IIFE-1 (fields) DOMContentLoaded handler, the spy DB, and
 * the App stub.
 */
function buildEnv(seeded) {
  var html = readAsset('settings.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/settings.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  // Source the REAL order functions from app.js (its only top-level read is
  // window.I18N_DEFAULT). eval it BEFORE the DOMContentLoaded capture override.
  win.I18N_DEFAULT = 'en';
  win.eval(readAsset('assets/app.js'));
  var realApp = win.App;
  ['getSectionOrder', 'sanitizeOrder', 'flattenOrderKeys', 'refreshSectionOrderCache'].forEach(function (fn) {
    if (typeof realApp[fn] !== 'function') {
      throw new Error('assets/app.js did not expose ' + fn);
    }
  });
  if (!Array.isArray(realApp.DEFAULT_SECTION_ORDER) || !realApp.GROUP_DEFAULT_TITLE_KEYS) {
    throw new Error('assets/app.js did not expose DEFAULT_SECTION_ORDER / GROUP_DEFAULT_TITLE_KEYS');
  }

  // Capture DOMContentLoaded handlers; pass everything else through.
  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, opts) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, opts);
  };

  var mockDb = createMockPortfolioDB({ therapistSettings: seeded });

  // Spy BroadcastChannel that records posted messages so we can assert the
  // 'therapist-settings-changed' cross-tab post fired on Save.
  var posted = [];
  win.BroadcastChannel = function () {
    return {
      postMessage: function (m) { posted.push(m); },
      close: function () {},
      addEventListener: function () {},
    };
  };

  win.PortfolioDB = mockDb;
  win.App = createAppStub({
    getSectionOrder: realApp.getSectionOrder,
    sanitizeOrder: realApp.sanitizeOrder,
    flattenOrderKeys: realApp.flattenOrderKeys,
    refreshSectionOrderCache: realApp.refreshSectionOrderCache,
    DEFAULT_SECTION_ORDER: realApp.DEFAULT_SECTION_ORDER,
    GROUP_DEFAULT_TITLE_KEYS: realApp.GROUP_DEFAULT_TITLE_KEYS,
  });

  // Harmless stubs so the whole settings.js evals cleanly (only IIFE-1 is run).
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

  var fieldsMatches = captured.filter(function (fn) { return String(fn).indexOf('initCommon') >= 0; });
  if (fieldsMatches.length !== 1) {
    throw new Error('expected exactly 1 fields (initCommon) handler; got ' + fieldsMatches.length);
  }

  return { dom: dom, win: win, mockDb: mockDb, posted: posted, iife1: fieldsMatches[0] };
}

// Flattened top-level index of a top-level section key within the sentinel items.
function topLevelIndex(items, key) {
  for (var i = 0; i < items.length; i++) {
    if (items[i] && items[i].type === 'section' && items[i].key === key) return i;
  }
  return -1;
}
function findGroup(items, id) {
  for (var i = 0; i < items.length; i++) {
    if (items[i] && items[i].type === 'group' && items[i].id === id) return items[i];
  }
  return null;
}
function lastSentinelItems(mockDb) {
  var calls = mockDb.__calls.get('_writeTherapistSentinel') || [];
  assert.ok(calls.length >= 1, '_writeTherapistSentinel must have been called on Save');
  var rec = calls[calls.length - 1][0];
  assert.strictEqual(rec.sectionKey, 'sectionOrder', 'sentinel write must target sectionOrder');
  return rec.items;
}

async function saveAndSettle(win) {
  var saveBtn = win.document.getElementById('settingsSaveBtn');
  assert.strictEqual(saveBtn.disabled, false, 'Save must be enabled after a reorder marks the form dirty');
  saveBtn.click();
  await settle();
}

// Construct a real PointerEvent in the jsdom window (jsdom exposes the ctor and
// carries pointerId + clientX/clientY, but does NOT implement pointer capture —
// tests spy on setPointerCapture/releasePointerCapture to observe capture state).
function pev(win, type, props) {
  return new win.PointerEvent(type, Object.assign({ bubbles: true, cancelable: true }, props || {}));
}

// Install capture spies on a handle (jsdom has no native pointer capture) so a
// test can assert the drag both captured and later released the pointer.
function spyCapture(handle) {
  handle.__captured = null;
  handle.setPointerCapture = function (id) { handle.__captured = id; };
  handle.releasePointerCapture = function (id) { if (handle.__captured === id) handle.__captured = null; };
}

var passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── A. Grouped list renders; afterSeverity-before-issues is clamped ──────
  await test('arrow move that tries afterSeverity above issues is clamped; Save persists issues before afterSeverity', async function () {
    var env = buildEnv([]);
    var win = env.win;
    await env.iife1();
    await settle();

    var container = win.document.getElementById('settingsRowsContainer');
    // Grouped render sanity: two group headers + the severity row exist.
    assert.ok(container.querySelector('.reorder-group-header[data-group-id="emotionsTech"]'), 'emotionsTech group header renders');
    assert.ok(container.querySelector('.reorder-group-header[data-group-id="wrapup"]'), 'wrapup group header renders');
    assert.ok(container.querySelector('.reorder-severity-row[data-section-key="afterSeverity"]'), 'Issue severity row renders');
    var infoPop = container.querySelector('.reorder-info-pop');
    assert.ok(infoPop && infoPop.textContent.length > 0, 'the severity row carries an ⓘ popover with text');

    // Drive the afterSeverity UP arrow repeatedly. The affordance clamp disables
    // it once afterSeverity sits immediately after issues, so it can never cross.
    for (var i = 0; i < 4; i++) {
      var sevRow = container.querySelector('.reorder-severity-row[data-section-key="afterSeverity"]');
      var up = sevRow.querySelector('.reorder-arrow-up');
      if (up.disabled) break;
      up.click();
      await settle();
    }

    await saveAndSettle(win);

    var items = lastSentinelItems(env.mockDb);
    var issuesIdx = topLevelIndex(items, 'issues');
    var sevIdx = topLevelIndex(items, 'afterSeverity');
    assert.ok(issuesIdx !== -1 && sevIdx !== -1, 'both issues and afterSeverity persist at top level');
    assert.ok(issuesIdx < sevIdx,
      'the shared clamp must keep issues before afterSeverity (got issues@' + issuesIdx + ', afterSeverity@' + sevIdx + ')');

    // The cross-tab post fired on Save.
    var changed = env.posted.filter(function (m) { return m && m.type === 'therapist-settings-changed'; });
    assert.ok(changed.length >= 1, "Save posts 'therapist-settings-changed'");

    env.dom.window.close();
  });

  // ─── B. A within-group member arrow move persists in items[].members ──────
  await test('a within-group member move persists the new member order', async function () {
    var env = buildEnv([]);
    var win = env.win;
    await env.iife1();
    await settle();

    var container = win.document.getElementById('settingsRowsContainer');
    // Move 'trapped' UP one slot inside the emotionsTech group (default members:
    // heartShield, heartShieldEmotions, trapped, ... → swap trapped above
    // heartShieldEmotions).
    var trappedRow = container.querySelector('[data-reorder-type="section"][data-level="member"][data-section-key="trapped"]');
    assert.ok(trappedRow, 'the trapped member row renders inside its group');
    var up = trappedRow.querySelector('.reorder-arrow-up');
    assert.strictEqual(up.disabled, false, 'trapped is not the first member, so its up arrow is enabled');
    up.click();
    await settle();

    await saveAndSettle(win);

    var items = lastSentinelItems(env.mockDb);
    var group = findGroup(items, 'emotionsTech');
    assert.ok(group, 'the emotionsTech group persists');
    var iTrapped = group.members.indexOf('trapped');
    var iHse = group.members.indexOf('heartShieldEmotions');
    assert.ok(iTrapped !== -1 && iHse !== -1, 'both members persist in the group');
    assert.ok(iTrapped < iHse,
      'after moving trapped up it must persist before heartShieldEmotions (got trapped@' + iTrapped + ', heartShieldEmotions@' + iHse + ')');

    env.dom.window.close();
  });

  // ─── C. Reset order is confirm-free; Reset order + Discard writes no sentinel
  await test('Reset order does NOT confirm, sets dirty, and a Reset order + Discard writes no sentinel', async function () {
    var env = buildEnv([]);
    var win = env.win;
    await env.iife1();
    await settle();

    var resetOrderBtn = win.document.querySelector('.reorder-reset-order');
    assert.ok(resetOrderBtn, 'the Reset order control mounts under the list');

    var confirmBefore = (win.App.__calls.get('confirmDialog') || []).length;
    resetOrderBtn.click();
    await settle();
    var confirmAfter = (win.App.__calls.get('confirmDialog') || []).length;
    assert.strictEqual(confirmAfter, confirmBefore, 'Reset order must be confirm-free');

    var saveBtn = win.document.getElementById('settingsSaveBtn');
    assert.strictEqual(saveBtn.disabled, false, 'Reset order sets the form dirty (Save enabled)');

    // Discard (stub confirm → true) abandons the staged reset; no sentinel write.
    win.document.getElementById('settingsDiscardBtn').click();
    await settle();
    var sentinelCalls = env.mockDb.__calls.get('_writeTherapistSentinel') || [];
    assert.strictEqual(sentinelCalls.length, 0,
      'a staged Reset order that is Discarded must write NO sectionOrder sentinel');

    env.dom.window.close();
  });

  // ─── D. Reset names IS confirm-guarded ────────────────────────────────────
  await test('Reset names is guarded by App.confirmDialog', async function () {
    var env = buildEnv([]);
    var win = env.win;
    await env.iife1();
    await settle();

    var resetNamesBtn = win.document.querySelector('.reorder-reset-names');
    assert.ok(resetNamesBtn, 'the Reset names control mounts under the list');
    var before = (win.App.__calls.get('confirmDialog') || []).length;
    resetNamesBtn.click();
    await settle();
    var after = (win.App.__calls.get('confirmDialog') || []).length;
    assert.ok(after > before, 'Reset names must call App.confirmDialog before clearing names');

    env.dom.window.close();
  });

  // ─── E. Highlight cleanup + capture release on cancel AND lost-capture ────
  // Guards G1's stuck-highlight: after a drag ends by pointercancel or by
  // lostpointercapture (the paths WebKit fires when it steals the gesture), the
  // row must not keep the .dragging highlight and the pointer capture must be
  // released. A regression to cleaning up only in onUp would leave .dragging
  // stuck on both paths and FAIL here.
  await test('the drag claims no pointer capture, survives lostpointercapture, and pointercancel clears .dragging', async function () {
    var env = buildEnv([]);
    var win = env.win;
    await env.iife1();
    await settle();
    var container = win.document.getElementById('settingsRowsContainer');

    function grab() {
      var row = container.querySelector('[data-reorder-type="section"][data-section-key="issues"]');
      assert.ok(row, 'the issues section row renders');
      var handle = row.querySelector('.reorder-handle');
      assert.ok(handle, 'the issues row has a drag handle');
      spyCapture(handle);
      return { row: row, handle: handle };
    }

    // No-capture contract: repositioning a row (insertBefore) implicitly
    // releases pointer capture in real engines, so the gesture must neither
    // claim capture nor die when lostpointercapture fires mid-drag.
    var a = grab();
    a.handle.dispatchEvent(pev(win, 'pointerdown', { pointerId: 7, clientX: 0, clientY: 50 }));
    assert.ok(a.row.classList.contains('dragging'), 'pointerdown adds the drag highlight');
    assert.strictEqual(a.handle.__captured, null, 'the gesture claims NO pointer capture');
    a.handle.dispatchEvent(pev(win, 'lostpointercapture', { pointerId: 7 }));
    assert.ok(a.row.classList.contains('dragging'), 'the drag SURVIVES lostpointercapture — a mid-drag row move must not end the gesture');
    win.document.dispatchEvent(pev(win, 'pointercancel', { pointerId: 7 }));
    assert.ok(!a.row.classList.contains('dragging'), 'pointercancel clears the drag highlight — no stuck row');

    env.dom.window.close();
  });

  // ─── F. A pointer drag funnels through the same shared clamp as the arrows ─
  // Guards G1's "both paths clamp": dragging afterSeverity above issues by the
  // pointer must (a) set the form dirty so Save is enabled, (b) release capture on
  // pointerup, and (c) still persist issues BEFORE afterSeverity through the
  // shared App.sanitizeOrder. A pointer path that bypassed the clamp would
  // persist afterSeverity first and FAIL.
  await test('a pointer drag of afterSeverity above issues stays clamped and persists issues first', async function () {
    var env = buildEnv([]);
    var win = env.win;
    await env.iife1();
    await settle();
    var container = win.document.getElementById('settingsRowsContainer');

    var sevRow = container.querySelector('.reorder-severity-row[data-section-key="afterSeverity"]');
    assert.ok(sevRow, 'the Issue severity row renders');
    var handle = sevRow.querySelector('.reorder-handle');
    assert.ok(handle, 'the severity row has a drag handle');
    spyCapture(handle);

    // Grab, then drag well upward (clientY far above the start) so the physical
    // insertion would place afterSeverity before the first top-level unit.
    handle.dispatchEvent(pev(win, 'pointerdown', { pointerId: 3, clientX: 0, clientY: 200 }));
    win.document.dispatchEvent(pev(win, 'pointermove', { pointerId: 3, clientX: 0, clientY: -200 }));
    win.document.dispatchEvent(pev(win, 'pointerup', { pointerId: 3, clientX: 0, clientY: -200 }));
    await settle();
    assert.strictEqual(handle.__captured, null, 'pointerup releases the pointer capture');

    await saveAndSettle(win);

    var items = lastSentinelItems(env.mockDb);
    var issuesIdx = topLevelIndex(items, 'issues');
    var sevIdx = topLevelIndex(items, 'afterSeverity');
    assert.ok(issuesIdx !== -1 && sevIdx !== -1, 'both issues and afterSeverity persist at top level');
    assert.ok(issuesIdx < sevIdx,
      'the shared clamp keeps issues before a pointer-dragged afterSeverity (got issues@' + issuesIdx + ', afterSeverity@' + sevIdx + ')');

    env.dom.window.close();
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────
  var EXPECTED_COUNT = 6;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases, but ' +
      (passed + failed) + ' ran — an async case was silently skipped.');
    process.exit(1);
  }

  console.log('');
  console.log('47-settings-reorder tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
