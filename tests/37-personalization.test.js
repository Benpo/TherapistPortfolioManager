/**
 * tests/37-personalization.test.js — Personalization-surface behavior spec
 * (PERS-08, Wave 0). Authored TESTS-FIRST, before any of the surfaces exist, so
 * every block is deliberately RED against the current tree and turns GREEN as
 * Plans 05/06/07/08 build the surface.
 *
 * What this file GATES (all currently absent — that is the point):
 *   - PERS-02  date-format <select> in the Personalization panel: 6 seam-key
 *              options; persists to localStorage['portfolioDateFormat'];
 *              default 'auto' when unset; re-applies on boot; fires
 *              document 'app:dateformat' CustomEvent on change (no reload).
 *   - PERS-03  two-tier session-type editor: 5 locked defaults (rename input +
 *              lock icon, NO delete) in fixed order; custom rows (rename +
 *              delete); add persists to localStorage['portfolioSessionTypes']
 *              JSON {overrides,custom} (FIX 1 — localStorage, NOT IDB); rename of
 *              a locked default writes a GLOBAL override (D-16); two-layer delete
 *              guard (no button on locked AND the delete handler rejects a locked
 *              key); mutations fire 'app:session-types-changed'; the editor boots
 *              WITHOUT App.initCommon (single-mount, settings-snippets.js:1318).
 *   - PERS-04  App.formatSessionType resolves the global override, else the i18n
 *              default, else the RAW key for an unknown/deleted type (D-18).
 *   - PERS-05  the REAL backup.js export -> restore round-trips BOTH
 *              portfolioDateFormat AND portfolioSessionTypes (overrides+custom)
 *              through backup.js's own settings export object + restore block
 *              (FIX 1) — NOT a mock-DB mirror, so it cannot false-GREEN if a
 *              field is dropped.
 *   - PERS-06  birthdate entry is a native <input type="date"> with YYYY-MM-DD
 *              .value plumbing (add-client + add-session inline/edit).
 *   - T-37-02-SEC  a session-type label carrying an HTML-injection payload
 *              renders as LITERAL text (textContent/input.value), never parsed
 *              into a live element — the falsifiable proof of the no-innerHTML
 *              contract Plans 07/08 must honor.
 *
 * METHOD (per MEMORY feedback-behavior-verification): assert OBSERVABLE state
 * only — DOM nodes, input .value, localStorage contents, dispatched events. No
 * assertion on source text. Page behavior runs the REAL modules via jsdom; the
 * backup round-trip drives the REAL backup.js in a vm sandbox with the vendored
 * JSZip (modeled on tests/25-08-roundtrip-stores.test.js).
 *
 * The editor/picker DOM contract (selectors/ids/globals/event names) IS the
 * spec the surface plans implement against:
 *   picker:   <select id="dateFormatSelect"> with 6 <option value> seam keys
 *   editor:   container #sessionTypesEditor; rows .session-type-row[data-type-key];
 *             .session-type-rename-input; locked rows have .session-type-lock and
 *             NO .session-type-delete-btn; custom rows have .session-type-delete-btn;
 *             add via #sessionTypeAddInput + #sessionTypeAddBtn;
 *             global window.SessionTypesEditor.deleteType(key) -> boolean guard;
 *             storage localStorage['portfolioSessionTypes'] = {overrides:{},custom:[]};
 *             events document 'app:session-types-changed'
 *   birthdate: native <input type="date"> #clientBirthDate / #inlineClientBirthDate
 *             / #editClientBirthDate
 *
 * Run: node tests/37-personalization.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * Read-only: EVALS assets/* into isolated jsdom windows + a vm sandbox; never
 * writes any assets/* production file.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createAppStub = require('./_helpers/app-stub').createAppStub;
var createMockPortfolioDB = require('./_helpers/mock-portfolio-db').createMockPortfolioDB;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }
function tryReadAsset(rel) {
  try { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }
  catch (_) { return null; } // not-yet-created surface file — absence => RED via assertions
}

// The 6 date-format seam keys (LOCKED contract, shared with the engine lane).
var SEAM_KEYS = ['auto', 'month-day-year', 'day-month-year', 'mm/dd/yyyy', 'dd/mm/yyyy', 'yyyy-mm-dd'];
// The 5 locked default session types in fixed render order (D-13).
var LOCKED_DEFAULTS = ['clinic', 'online', 'remote', 'proxy', 'other'];

// Candidate surface files that Plans 06/07 may add. Guard-loaded so this spec
// picks them up automatically once they exist, and simply stays RED until then.
var CANDIDATE_SURFACE_FILES = [
  'assets/settings-session-types.js',
  'assets/settings-personalization.js',
  'assets/settings-dateformat.js',
];

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle() { for (var i = 0; i < 6; i++) { await flush(); } }

/**
 * Build a jsdom settings.html env with the proven stub set (mirrors
 * 30-settings-tabnav / 30-settings-section-roundtrip), eval the REAL settings.js
 * plus any candidate surface files that exist, and capture the DOMContentLoaded
 * boot handlers. `seed` pre-populates localStorage BEFORE boot so the picker/
 * editor render from stored state.
 */
function buildSettingsEnv(opts) {
  opts = opts || {};
  var html = readAsset('settings.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/settings.html' + (opts.search || ''),
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

  // Seed localStorage before boot so stored state drives the render.
  if (opts.seed) {
    if (typeof opts.seed.dateFormat === 'string') {
      win.localStorage.setItem('portfolioDateFormat', opts.seed.dateFormat);
    }
    if (opts.seed.sessionTypes != null) {
      win.localStorage.setItem('portfolioSessionTypes',
        typeof opts.seed.sessionTypes === 'string'
          ? opts.seed.sessionTypes
          : JSON.stringify(opts.seed.sessionTypes));
    }
  }

  // App stub: spied initCommon (single-mount guard) + the session-type surface
  // the editor is expected to call. formatSessionType default passthrough.
  var appStub = createAppStub(Object.assign({
    getSessionTypes: function () { return []; },
    refreshSessionTypeCache: function () { return Promise.resolve(); },
  }, opts.appOverrides || {}));
  win.App = appStub;
  win.matchMedia = function () {
    return { matches: false, media: '', addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {} };
  };
  win.BroadcastChannel = function () {
    return { postMessage: function () {}, close: function () {}, addEventListener: function () {} };
  };
  var mockDb = createMockPortfolioDB(opts.dbSeed || {});
  win.PortfolioDB = mockDb;
  win.PortfolioDB.estimatePhotosBytes = function () { return 0; };
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
  CANDIDATE_SURFACE_FILES.forEach(function (rel) {
    var src = tryReadAsset(rel);
    if (src) { try { win.eval(src); } catch (_) { /* a half-built surface file must not abort the spec */ } }
  });

  return { dom: dom, win: win, handlers: captured, appStub: appStub, mockDb: mockDb };
}

// Run every captured boot handler, each guarded so one throwing boot cannot mask
// the surface under test. Awaits async handlers and flushes the microtask queue.
async function runBoots(env) {
  for (var i = 0; i < env.handlers.length; i++) {
    try { await Promise.resolve(env.handlers[i]()); } catch (_) { /* guarded */ }
  }
  await settle();
}

/** Real-app.js env (no page boot) for the pure resolver contract. */
function buildAppEnv(seed) {
  var dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://localhost/settings.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  win.matchMedia = function () {
    return { matches: false, media: '', addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {} };
  };
  win.BroadcastChannel = function () {
    return { postMessage: function () {}, close: function () {}, addEventListener: function () {} };
  };
  try { win.localStorage.setItem('portfolioLang', 'en'); } catch (_) {}
  if (seed && seed.sessionTypes != null) {
    win.localStorage.setItem('portfolioSessionTypes',
      typeof seed.sessionTypes === 'string' ? seed.sessionTypes : JSON.stringify(seed.sessionTypes));
  }
  ['assets/i18n-en.js', 'assets/i18n-he.js', 'assets/i18n-de.js', 'assets/i18n-cs.js', 'assets/i18n.js', 'assets/app.js']
    .forEach(function (f) { try { win.eval(readAsset(f)); } catch (_) {} });
  return { dom: dom, win: win, App: win.App };
}

// ---------------------------------------------------------------------------
// vm sandbox for the REAL backup.js export->restore round-trip (25-08 model)
// ---------------------------------------------------------------------------

function makeLocalStorage() {
  var map = new Map();
  return {
    getItem: function (k) { return map.has(String(k)) ? map.get(String(k)) : null; },
    setItem: function (k, v) { map.set(String(k), String(v)); },
    removeItem: function (k) { map.delete(String(k)); },
    clear: function () { map.clear(); },
  };
}
function makeDoc() {
  return {
    addEventListener: function () {}, removeEventListener: function () {},
    createElement: function () {
      return { href: '', download: '', style: {}, setAttribute: function () {}, appendChild: function () {}, click: function () {}, addEventListener: function () {}, classList: { add: function () {}, remove: function () {} } };
    },
    body: { appendChild: function () {}, removeChild: function () {} },
    head: { appendChild: function () {} },
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
  };
}
function buildBackupSandbox(mockDb) {
  var sandbox = {
    console: { log: function () {}, warn: function () {}, error: function () {} },
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    setImmediate: setImmediate, clearImmediate: clearImmediate,
    queueMicrotask: queueMicrotask, Promise: Promise,
    crypto: globalThis.crypto || { subtle: {}, getRandomValues: function (a) { return a; } },
    TextEncoder: TextEncoder, TextDecoder: TextDecoder,
    Uint8Array: Uint8Array, ArrayBuffer: ArrayBuffer, Blob: Blob, File: File,
    URL: { createObjectURL: function () { return 'blob:stub'; }, revokeObjectURL: function () {} },
    FileReader: function FileReader() {
      this.readAsText = function (file) {
        var self = this;
        Promise.resolve().then(function () { return typeof file.text === 'function' ? file.text() : file.arrayBuffer(); })
          .then(function (res) { self.result = typeof res === 'string' ? res : new TextDecoder().decode(res); if (typeof self.onload === 'function') self.onload({ target: self }); })
          .catch(function (err) { if (typeof self.onerror === 'function') self.onerror(err); });
      };
      this.readAsArrayBuffer = function (file) {
        var self = this;
        Promise.resolve().then(function () { return file.arrayBuffer(); })
          .then(function (res) { self.result = res; if (typeof self.onload === 'function') self.onload({ target: self }); })
          .catch(function (err) { if (typeof self.onerror === 'function') self.onerror(err); });
      };
    },
    document: makeDoc(),
    navigator: { share: undefined, canShare: undefined },
    localStorage: makeLocalStorage(),
    window: {},
  };
  sandbox.window.PortfolioDB = mockDb;
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.crypto = sandbox.crypto;
  sandbox.window.document = sandbox.document;
  var locObj = {}; var lastHref = '';
  Object.defineProperty(locObj, 'href', { get: function () { return lastHref; }, set: function (v) { lastHref = String(v); }, configurable: true, enumerable: true });
  sandbox.window.location = locObj; sandbox.location = locObj;
  vm.createContext(sandbox);
  vm.runInContext(readAsset('assets/jszip.min.js'), sandbox, { filename: 'assets/jszip.min.js' });
  if (!sandbox.JSZip && sandbox.window.JSZip) sandbox.JSZip = sandbox.window.JSZip;
  if (!sandbox.window.JSZip && sandbox.JSZip) sandbox.window.JSZip = sandbox.JSZip;
  vm.runInContext(readAsset('assets/backup.js'), sandbox, { filename: 'assets/backup.js' });
  return sandbox;
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── 1. Picker: 6 seam-key options render in the Personalization panel ────
  await test('picker: <select id="dateFormatSelect"> renders the 6 seam-key options in order', async function () {
    var env = buildSettingsEnv({ search: '?tab=personalize' });
    await runBoots(env);
    var sel = env.win.document.getElementById('dateFormatSelect');
    assert.ok(sel, 'the date-format <select id="dateFormatSelect"> must exist in the Personalization panel');
    var values = Array.prototype.map.call(sel.querySelectorAll('option'), function (o) { return o.value; });
    assert.deepStrictEqual(values, SEAM_KEYS,
      'the 6 <option value> must be the exact seam keys in order; got ' + JSON.stringify(values));
    env.dom.window.close();
  });

  // ─── 2. Picker: default 'auto' when unset; stored value re-applies on boot ─
  await test("picker: default value is 'auto' when unset, and a stored value re-applies on boot", async function () {
    var fresh = buildSettingsEnv({ search: '?tab=personalize' });
    await runBoots(fresh);
    var sel1 = fresh.win.document.getElementById('dateFormatSelect');
    assert.ok(sel1, 'the date-format select must exist');
    assert.strictEqual(sel1.value, 'auto', "the select must default to 'auto' when localStorage['portfolioDateFormat'] is unset");
    fresh.dom.window.close();

    var stored = buildSettingsEnv({ search: '?tab=personalize', seed: { dateFormat: 'yyyy-mm-dd' } });
    await runBoots(stored);
    var sel2 = stored.win.document.getElementById('dateFormatSelect');
    assert.ok(sel2, 'the date-format select must exist');
    assert.strictEqual(sel2.value, 'yyyy-mm-dd', "a stored 'yyyy-mm-dd' must re-apply to the select on boot (reload path)");
    stored.dom.window.close();
  });

  // ─── 3. Picker: change persists + fires app:dateformat (no reload) ────────
  await test("picker: changing the select persists portfolioDateFormat and dispatches 'app:dateformat'", async function () {
    var env = buildSettingsEnv({ search: '?tab=personalize' });
    await runBoots(env);
    var win = env.win;
    var sel = win.document.getElementById('dateFormatSelect');
    assert.ok(sel, 'the date-format select must exist');

    var events = [];
    win.document.addEventListener('app:dateformat', function (e) { events.push(e && e.detail); });

    sel.value = 'dd/mm/yyyy';
    sel.dispatchEvent(new win.Event('change', { bubbles: true }));
    await settle();

    assert.strictEqual(win.localStorage.getItem('portfolioDateFormat'), 'dd/mm/yyyy',
      "the change handler must persist the chosen key to localStorage['portfolioDateFormat']");
    assert.strictEqual(events.length, 1, "exactly one 'app:dateformat' event must fire on change (live re-render, no reload)");
    assert.strictEqual(events[0] && events[0].format, 'dd/mm/yyyy',
      "the 'app:dateformat' detail.format must carry the chosen key");
    env.dom.window.close();
  });

  // ─── 4. Editor: 5 locked defaults render (rename + Revert + ⓘ, no delete) ──
  // Item 9 redesign (UAT 2026-07-03): built-in rows reuse the Fields "Custom
  // field names" pattern — a rename input + a Revert button (.reset-row-btn) +
  // the shared .settings-locked-info ⓘ icon. NO lock symbol, NO delete button.
  await test('editor: the 5 locked defaults render in fixed order with a rename input + Revert button + ⓘ info and NO delete button', async function () {
    var env = buildSettingsEnv({ search: '?tab=personalize' });
    await runBoots(env);
    var win = env.win;
    var container = win.document.getElementById('sessionTypesEditor');
    assert.ok(container, 'the session-type editor container (#sessionTypesEditor) must exist');

    LOCKED_DEFAULTS.forEach(function (key) {
      var row = container.querySelector('.session-type-row[data-type-key="' + key + '"]');
      assert.ok(row, 'a locked default row for "' + key + '" must render');
      assert.ok(row.querySelector('.session-type-rename-input'), 'the "' + key + '" row must have a rename input');
      assert.ok(row.querySelector('.reset-row-btn'), 'the locked "' + key + '" row must show a Revert button (reuses .reset-row-btn)');
      assert.ok(row.querySelector('.settings-locked-info'), 'the locked "' + key + '" row must show the shared ⓘ info icon');
      assert.ok(!row.querySelector('.session-type-lock'), 'the locked "' + key + '" row must NOT show a lock icon (removed in the item 9 redesign)');
      assert.ok(!row.querySelector('.session-type-delete-btn'), 'the locked "' + key + '" row must NOT show a delete button');
    });

    // Fixed order: the first five rows are the locked defaults in D-13 order.
    var renderedKeys = Array.prototype.map.call(
      container.querySelectorAll('.session-type-row'),
      function (r) { return r.getAttribute('data-type-key'); }
    ).slice(0, 5);
    assert.deepStrictEqual(renderedKeys, LOCKED_DEFAULTS,
      'the locked defaults must render first, in fixed order; got ' + JSON.stringify(renderedKeys));
    env.dom.window.close();
  });

  // ─── 5. Editor: add custom stages then persists on Save + fires event ─────
  // Batch model (item 9, UAT 2026-07-03): the "Add type" button REVEALS an
  // inline input + Save(check); the add STAGES, and only the Save/Discard bar's
  // Save commits it to localStorage['portfolioSessionTypes'] (FIX 1 —
  // localStorage, not IDB) and dispatches 'app:session-types-changed'.
  await test("editor: adding a custom type stages then, on Save, persists to localStorage['portfolioSessionTypes'].custom and fires 'app:session-types-changed'", async function () {
    var env = buildSettingsEnv({ search: '?tab=personalize' });
    await runBoots(env);
    var win = env.win;
    var revealBtn = win.document.getElementById('sessionTypeAddBtn');
    var input = win.document.getElementById('sessionTypeAddInput');
    var addSaveBtn = win.document.getElementById('sessionTypeAddSaveBtn');
    var saveBar = win.document.getElementById('sessionTypesSaveBtn');
    assert.ok(revealBtn, 'the add-type reveal button (#sessionTypeAddBtn) must exist');
    assert.ok(input, 'the add-new input (#sessionTypeAddInput) must exist');
    assert.ok(addSaveBtn, 'the inline add Save button (#sessionTypeAddSaveBtn) must exist');
    assert.ok(saveBar, 'the session-types Save button (#sessionTypesSaveBtn) must exist');

    var events = [];
    win.document.addEventListener('app:session-types-changed', function () { events.push(1); });

    revealBtn.click(); // reveal the inline add row
    input.value = 'Group session';
    input.dispatchEvent(new win.Event('input', { bubbles: true }));
    addSaveBtn.click(); // stage the add
    await settle();

    // Staged, not yet committed: nothing persisted until the batch Save.
    assert.ok(!win.localStorage.getItem('portfolioSessionTypes'),
      'the add must STAGE only — nothing persisted before the Save/Discard bar Save');

    saveBar.click(); // commit the batch
    await settle();

    var raw = win.localStorage.getItem('portfolioSessionTypes');
    assert.ok(raw, "localStorage['portfolioSessionTypes'] must be written on Save (FIX 1 — localStorage, not IDB)");
    var parsed = JSON.parse(raw);
    assert.ok(Array.isArray(parsed.custom), 'the stored shape must carry a custom[] array');
    var labels = parsed.custom.map(function (c) { return c && c.label; });
    assert.ok(labels.indexOf('Group session') >= 0,
      'the new custom type label must be persisted into custom[] on Save; got ' + JSON.stringify(labels));
    assert.ok(events.length >= 1, "committing the add on Save must fire 'app:session-types-changed'");
    env.dom.window.close();
  });

  // ─── 6. Editor: rename a locked default writes a GLOBAL override (D-16) ───
  // Batch model: the rename STAGES on input/change; the Save/Discard bar's Save
  // commits the global override to portfolioSessionTypes.overrides (D-16).
  await test("editor: renaming a locked default stages then, on Save, writes a global override to portfolioSessionTypes.overrides and fires the change event", async function () {
    var env = buildSettingsEnv({ search: '?tab=personalize' });
    await runBoots(env);
    var win = env.win;
    var container = win.document.getElementById('sessionTypesEditor');
    assert.ok(container, 'the session-type editor container must exist');
    var row = container.querySelector('.session-type-row[data-type-key="clinic"]');
    assert.ok(row, 'the locked "clinic" row must render');
    var input = row.querySelector('.session-type-rename-input');
    assert.ok(input, 'the "clinic" row must have a rename input');

    var events = [];
    win.document.addEventListener('app:session-types-changed', function () { events.push(1); });

    input.value = 'Face-to-face';
    input.dispatchEvent(new win.Event('input', { bubbles: true }));
    input.dispatchEvent(new win.Event('change', { bubbles: true }));
    await settle();

    // Not committed until Save.
    assert.ok(!win.localStorage.getItem('portfolioSessionTypes'),
      'the locked rename must STAGE only — nothing persisted before Save');

    win.document.getElementById('sessionTypesSaveBtn').click();
    await settle();

    var parsed = JSON.parse(win.localStorage.getItem('portfolioSessionTypes') || '{}');
    assert.ok(parsed.overrides && parsed.overrides.clinic === 'Face-to-face',
      'renaming a locked default must persist a global override string on Save (D-16); got ' + JSON.stringify(parsed.overrides));
    assert.ok(events.length >= 1, "committing the rename on Save must fire 'app:session-types-changed'");
    env.dom.window.close();
  });

  // ─── 7. Editor: two-layer delete guard + custom delete works ─────────────
  await test('editor: locked rows have no delete button AND deleteType() rejects a locked key; a custom type deletes', async function () {
    var env = buildSettingsEnv({
      search: '?tab=personalize',
      seed: { sessionTypes: { overrides: {}, custom: [{ key: 'custom.777', label: 'Workshop' }] } },
    });
    await runBoots(env);
    var win = env.win;
    var container = win.document.getElementById('sessionTypesEditor');
    assert.ok(container, 'the session-type editor container must exist');

    // Layer (a): a custom row shows a delete button; a locked row does not.
    var customRow = container.querySelector('.session-type-row[data-type-key="custom.777"]');
    assert.ok(customRow, 'the seeded custom row (custom.777) must render');
    assert.ok(customRow.querySelector('.session-type-delete-btn'), 'the custom row must show a delete button');
    var clinicRow = container.querySelector('.session-type-row[data-type-key="clinic"]');
    assert.ok(clinicRow && !clinicRow.querySelector('.session-type-delete-btn'),
      'the locked clinic row must NOT show a delete button');

    // Layer (b): the delete handler itself rejects a locked key even if invoked
    // directly (defense-in-depth — a green no-button test alone can't catch a
    // handler regression).
    var editor = win.SessionTypesEditor;
    assert.ok(editor && typeof editor.deleteType === 'function',
      'window.SessionTypesEditor.deleteType(key) must be exposed for the direct-invocation guard');
    var lockedResult = editor.deleteType('clinic');
    assert.strictEqual(lockedResult, false, 'deleteType("clinic") must return false — a locked key cannot be deleted');
    var afterLocked = JSON.parse(win.localStorage.getItem('portfolioSessionTypes') || '{}');
    assert.ok(!(afterLocked.custom || []).some(function (c) { return c.key === 'clinic'; }),
      'a locked key must never leak into custom[] via deleteType');

    // A custom key deletes cleanly.
    var customResult = editor.deleteType('custom.777');
    assert.strictEqual(customResult, true, 'deleteType("custom.777") must return true for a custom key');
    await settle();
    var afterCustom = JSON.parse(win.localStorage.getItem('portfolioSessionTypes') || '{}');
    assert.ok(!(afterCustom.custom || []).some(function (c) { return c.key === 'custom.777'; }),
      'the deleted custom type must be gone from storage');
    env.dom.window.close();
  });

  // ─── 8. Editor: single-mount (no second App.initCommon) ──────────────────
  await test('editor: the full settings boot calls App.initCommon at most once (editor must not double-mount)', async function () {
    var env = buildSettingsEnv({ search: '?tab=personalize' });
    await runBoots(env);
    // The fields boot legitimately calls initCommon once; the session-type editor
    // must boot directly (settings-snippets.js:1318) and NOT add a second call.
    var initCalls = env.appStub.__calls.get('initCommon') || [];
    assert.ok(initCalls.length <= 1,
      'App.initCommon must be called at most once across the settings boot; got ' + initCalls.length +
      ' (a second call means the session-type editor double-mounted the header chrome)');
    // Guard against a vacuous pass if the editor never mounted at all: once the
    // editor exists its container must be present (this half is RED now).
    assert.ok(env.win.document.getElementById('sessionTypesEditor'),
      'the session-type editor must have mounted its container');
    env.dom.window.close();
  });

  // ─── 9. Resolver: override + i18n default + raw fallback (D-16 / D-18) ────
  await test('resolver: App.formatSessionType applies a global override, else the i18n default, else the RAW key (D-18)', async function () {
    var env = buildAppEnv({ sessionTypes: { overrides: { clinic: 'Face-to-face' }, custom: [] } });
    var App = env.App;
    assert.ok(App && typeof App.formatSessionType === 'function', 'App.formatSessionType must exist');

    // If the cache-refresh seam exists (Plan 07), prime it from localStorage.
    if (typeof App.refreshSessionTypeCache === 'function') {
      await Promise.resolve(App.refreshSessionTypeCache());
    }

    // D-16: a global override wins over the i18n default.
    assert.strictEqual(App.formatSessionType('clinic'), 'Face-to-face',
      'a non-empty override for "clinic" must resolve app-wide (D-16)');
    // i18n default for an un-overridden known type.
    assert.ok(typeof App.formatSessionType('online') === 'string' && App.formatSessionType('online').length > 0,
      'a known un-overridden type must resolve to its i18n default label');
    // D-18: an unknown/deleted key returns the RAW string, not a mangled i18n key.
    // NOTE: this asserts the raw-key fallback for a TRULY-unknown key (e.g. a key
    // that arrived via imported data and was never in the list). It is NOT the
    // delete-flow coverage — the friendly 'custom.deleted-xyz' string here would
    // MASK the real `custom.<epoch>` rendering bug the delete flow fixes. The
    // delete-in-use → reassign-to-Other behavior is covered by tests 14 & 15
    // below with a REAL 13-digit epoch key.
    assert.strictEqual(App.formatSessionType('custom.deleted-xyz'), 'custom.deleted-xyz',
      'an unknown/deleted type must fall back to the raw key string (D-18) — no crash, no "session.type." prefix');
    env.dom.window.close();
  });

  // ─── 10. Backup: REAL export -> restore round-trips both prefs (FIX 1) ────
  await test('backup: the REAL export->restore round-trips portfolioDateFormat + portfolioSessionTypes (overrides+custom)', async function () {
    var mockDb = createMockPortfolioDB({});
    var sandbox = buildBackupSandbox(mockDb);
    var BM = sandbox.window.BackupManager;
    assert.ok(BM && typeof BM.exportBackup === 'function' && typeof BM.importBackup === 'function',
      'BackupManager.exportBackup + importBackup must be exposed');

    var SEEDED_TYPES = { overrides: { clinic: 'Face-to-face', proxy: '' }, custom: [{ key: 'custom.1', label: 'Group session' }] };
    sandbox.localStorage.setItem('portfolioDateFormat', 'dd/mm/yyyy');
    sandbox.localStorage.setItem('portfolioSessionTypes', JSON.stringify(SEEDED_TYPES));

    var result = await BM.exportBackup();
    assert.ok(result && result.blob, 'exportBackup must return a blob');
    var file = new File([result.blob], result.filename, { type: 'application/zip' });

    // Clear the two keys, then restore ONLY from the exported manifest. If either
    // key was dropped from backup.js's settings export object or restore block,
    // it is null after restore -> RED. This drives backup.js's REAL settings
    // round-trip, not a mock-DB mirror, so it cannot false-GREEN.
    sandbox.localStorage.removeItem('portfolioDateFormat');
    sandbox.localStorage.removeItem('portfolioSessionTypes');

    await BM.importBackup(file);

    assert.strictEqual(sandbox.localStorage.getItem('portfolioDateFormat'), 'dd/mm/yyyy',
      'portfolioDateFormat must survive the real backup export->restore round-trip (D-09)');
    var restored = sandbox.localStorage.getItem('portfolioSessionTypes');
    assert.ok(restored, 'portfolioSessionTypes must be restored by the real backup restore block (FIX 1)');
    assert.deepStrictEqual(JSON.parse(restored), SEEDED_TYPES,
      'the restored session-type list must equal the seeded overrides+custom exactly (no field dropped)');
  });

  // ─── 11. Birthdate: add-client native date input .value plumbing (D-12) ──
  await test('birthdate: add-client #clientBirthDate is a native <input type="date"> that round-trips a YYYY-MM-DD value', async function () {
    var dom = new JSDOM(readAsset('add-client.html'), { url: 'https://localhost/add-client.html', runScripts: 'outside-only', pretendToBeVisual: false });
    var el = dom.window.document.getElementById('clientBirthDate');
    assert.ok(el, '#clientBirthDate must exist');
    assert.strictEqual(el.tagName, 'INPUT', '#clientBirthDate must be an <input>');
    assert.strictEqual(el.getAttribute('type'), 'date', '#clientBirthDate must be a native date input (D-12), not a hidden input');
    el.value = '1990-05-15';
    assert.strictEqual(el.value, '1990-05-15', 'the native date input must round-trip a YYYY-MM-DD .value');
    dom.window.close();
  });

  // ─── 12. Birthdate: add-session inline + edit native date inputs ─────────
  await test('birthdate: add-session inline + edit birthdate fields are native <input type="date">', async function () {
    var dom = new JSDOM(readAsset('add-session.html'), { url: 'https://localhost/add-session.html', runScripts: 'outside-only', pretendToBeVisual: false });
    var doc = dom.window.document;
    ['inlineClientBirthDate', 'editClientBirthDate'].forEach(function (id) {
      var el = doc.getElementById(id);
      assert.ok(el, '#' + id + ' must exist');
      assert.strictEqual(el.tagName, 'INPUT', '#' + id + ' must be an <input>');
      assert.strictEqual(el.getAttribute('type'), 'date', '#' + id + ' must be a native date input (D-12)');
    });
    dom.window.close();
  });

  // ─── 13. Security: session-type label renders as LITERAL text (T-37-02-SEC)
  await test('security: a session-type label with an HTML-injection payload renders as literal text, never a parsed element', async function () {
    var PAYLOAD = '<img src=x onerror="window.__xss=1">';
    var env = buildSettingsEnv({
      search: '?tab=personalize',
      seed: { sessionTypes: { overrides: {}, custom: [{ key: 'custom.evil', label: PAYLOAD }] } },
    });
    await runBoots(env);
    var win = env.win;
    var container = win.document.getElementById('sessionTypesEditor');
    assert.ok(container, 'the session-type editor container must exist');
    var row = container.querySelector('.session-type-row[data-type-key="custom.evil"]');
    assert.ok(row, 'the seeded custom row must render');
    var input = row.querySelector('.session-type-rename-input');
    assert.ok(input, 'the custom row must have a rename input');
    assert.strictEqual(input.value, PAYLOAD, 'the payload must appear as the literal .value, not parsed');
    assert.strictEqual(container.querySelectorAll('img').length, 0,
      'no <img> element may be parsed from a session-type label (no-innerHTML contract)');
    assert.notStrictEqual(win.__xss, 1, 'the injected onerror must never execute');
    env.dom.window.close();
  });

  // ─── 14. Delete-in-use (App layer): reassign to "Other", not raw epoch key ─
  // Finding #1: deleting a custom type that PAST sessions still reference must
  // reassign those sessions to the legacy "other" key so they resolve to a real
  // label — NEVER the raw `custom.<epoch>` string. Uses a REAL 13-digit epoch
  // key (the prior friendly-string test masked this exact bug).
  await test('delete-in-use (App): reassignSessionType moves real custom.<epoch> sessions to "Other" and count triggers the warning', async function () {
    var EPOCH_KEY = 'custom.1720000000000'; // a real 13-digit epoch custom key
    var env = buildAppEnv({ sessionTypes: { overrides: {}, custom: [{ key: EPOCH_KEY, label: 'Group session' }] } });
    var App = env.App;
    assert.ok(App && typeof App.countSessionsByType === 'function', 'App.countSessionsByType must exist (editor delegates the in-use count)');
    assert.ok(typeof App.reassignSessionType === 'function', 'App.reassignSessionType must exist (editor delegates the reassign)');

    // 3 sessions use the custom epoch key; 1 uses a locked default (control).
    var mockDb = createMockPortfolioDB({ sessions: [
      { id: 1, clientId: 'c1', date: '2026-01-01', sessionType: EPOCH_KEY },
      { id: 2, clientId: 'c1', date: '2026-02-01', sessionType: EPOCH_KEY },
      { id: 3, clientId: 'c2', date: '2026-03-01', sessionType: EPOCH_KEY },
      { id: 4, clientId: 'c2', date: '2026-04-01', sessionType: 'clinic' },
    ] });
    env.win.PortfolioDB = mockDb;

    // BEFORE reassign, the count that drives the confirm dialog must report 3.
    var inUse = await App.countSessionsByType(EPOCH_KEY);
    assert.strictEqual(inUse, 3, 'countSessionsByType must report the 3 in-use sessions (this count triggers the warn/confirm)');

    // Demonstrate the bug the fix prevents: with the type gone from the list,
    // the raw epoch key would render as itself.
    assert.strictEqual(App.formatSessionType('custom.9999999999999'), 'custom.9999999999999',
      'an orphaned custom.<epoch> key renders as the raw string (the exact defect reassign prevents)');

    // Run the reassign (the explicit-confirm path) → 3 sessions moved to "other".
    var moved = await App.reassignSessionType(EPOCH_KEY, 'other');
    assert.strictEqual(moved, 3, 'reassignSessionType must move exactly the 3 in-use sessions');

    var after = await mockDb.getAllSessions();
    var otherLabel = App.formatSessionType('other');
    assert.ok(typeof otherLabel === 'string' && otherLabel.length > 0 && otherLabel !== 'other',
      'the "other" key must resolve to a real i18n label (e.g. "Other"), not the bare key');
    after.forEach(function (s) {
      if (s.id === 4) {
        assert.strictEqual(s.sessionType, 'clinic', 'a session on a DIFFERENT type must be untouched by the reassign');
        return;
      }
      // The 3 formerly-custom sessions now resolve to the "Other" label, never the raw epoch key.
      assert.strictEqual(s.sessionType, 'other', 'session ' + s.id + ' must be reassigned to the legacy "other" key');
      assert.strictEqual(App.formatSessionType(s.sessionType), otherLabel,
        'the reassigned session must resolve to the "Other" label');
      assert.notStrictEqual(App.formatSessionType(s.sessionType), EPOCH_KEY,
        'the reassigned session must NEVER render as the raw custom.<epoch> key');
    });
    // No session record still carries the deleted custom key.
    assert.ok(!after.some(function (s) { return s.sessionType === EPOCH_KEY; }),
      'no session may still reference the deleted custom.<epoch> key after reassign');
    env.dom.window.close();
  });

  // ─── 15. Delete-in-use (editor): stage delete, then Save warns + reassigns ─
  // Drives the REAL settings-session-types.js batch flow. The App layer is
  // stubbed (the editor holds NO direct IDB access — Finding #1) so this asserts
  // the editor's ORCHESTRATION at SAVE time: clicking the trash STAGES the
  // removal; the Save/Discard bar's Save then does count → count-based confirm →
  // reassign to "other" → remove. The guarantee is unchanged (a real epoch-key
  // in-use type is always warned about and reassigned before it disappears),
  // only the trigger point moved from delete-click to Save (batch model).
  await test('delete-in-use (editor): staging a delete then Save warns with the in-use count, reassigns to "other", then removes the type', async function () {
    var EPOCH_KEY = 'custom.1720000000001';
    var reassignCalls = [];
    var env = buildSettingsEnv({
      search: '?tab=personalize',
      seed: { sessionTypes: { overrides: {}, custom: [{ key: EPOCH_KEY, label: 'Workshop' }] } },
      appOverrides: {
        countSessionsByType: function () { return Promise.resolve(2); },
        reassignSessionType: function (fromKey, toKey) { reassignCalls.push([fromKey, toKey]); return Promise.resolve(2); },
      },
    });
    await runBoots(env);
    var win = env.win;
    var container = win.document.getElementById('sessionTypesEditor');
    var row = container.querySelector('.session-type-row[data-type-key="' + EPOCH_KEY + '"]');
    assert.ok(row, 'the seeded in-use custom row must render');
    var delBtn = row.querySelector('.session-type-delete-btn');
    assert.ok(delBtn, 'the custom row must have a delete button');

    // Stage the removal — batch model does NOT warn/reassign at click time.
    delBtn.click();
    await settle();
    var confirmsAfterStage = (env.appStub.__calls.get('confirmDialog') || []).length;
    assert.strictEqual(confirmsAfterStage, 0,
      'clicking the trash must only STAGE the removal — the warn/reassign fires at Save, not on click');
    assert.strictEqual(reassignCalls.length, 0, 'no reassign may run before Save');

    // Commit — the Save bar fires the in-use warning + reassign.
    win.document.getElementById('sessionTypesSaveBtn').click();
    await settle();

    // The confirm must be the COUNT-based reassign warning, carrying count=2.
    var confirmCalls = env.appStub.__calls.get('confirmDialog') || [];
    assert.ok(confirmCalls.length >= 1, 'saving a staged in-use deletion must open a confirm dialog');
    var opts = confirmCalls[confirmCalls.length - 1][0];
    assert.strictEqual(opts.messageKey, 'settings.sessionTypes.confirm.reassign.body',
      'the in-use delete must use the reassign-warning body, not the plain delete body');
    assert.ok(opts.placeholders && Number(opts.placeholders.count) === 2,
      'the warning must carry the in-use session count as a placeholder; got ' + JSON.stringify(opts.placeholders));

    // On confirm (stub resolves true) the editor reassigns to "other" THEN removes.
    assert.strictEqual(reassignCalls.length, 1, 'the editor must call App.reassignSessionType exactly once on confirm');
    assert.deepStrictEqual(reassignCalls[0], [EPOCH_KEY, 'other'],
      'the reassign must move the deleted key to the legacy "other" key');
    var stored = JSON.parse(win.localStorage.getItem('portfolioSessionTypes') || '{}');
    assert.ok(!(stored.custom || []).some(function (c) { return c.key === EPOCH_KEY; }),
      'the custom type must be removed from storage after the reassign+delete');
    env.dom.window.close();
  });

  // ─── 16. Backup faithful mirror: null-source resets a customized target ───
  // WR-02: when the SOURCE device used the defaults (portfolioDateFormat /
  // portfolioSessionTypes unset → manifest stores null), restoring onto a
  // CUSTOMIZED target must RESET those keys to default (removeItem), not silently
  // retain the target's own values. Drives the REAL backup.js export->restore.
  await test('backup: a null-source field (source used defaults) RESETS a customized target on restore (faithful mirror)', async function () {
    var mockDb = createMockPortfolioDB({});
    var sandbox = buildBackupSandbox(mockDb);
    var BM = sandbox.window.BackupManager;
    assert.ok(BM && typeof BM.exportBackup === 'function' && typeof BM.importBackup === 'function',
      'BackupManager.exportBackup + importBackup must be exposed');

    // SOURCE uses defaults: leave both keys UNSET so the manifest stores null.
    sandbox.localStorage.removeItem('portfolioDateFormat');
    sandbox.localStorage.removeItem('portfolioSessionTypes');

    var result = await BM.exportBackup();
    assert.ok(result && result.blob, 'exportBackup must return a blob');
    var file = new File([result.blob], result.filename, { type: 'application/zip' });

    // TARGET is customized before the restore.
    sandbox.localStorage.setItem('portfolioDateFormat', 'mm/dd/yyyy');
    sandbox.localStorage.setItem('portfolioSessionTypes',
      JSON.stringify({ overrides: { clinic: 'Studio' }, custom: [{ key: 'custom.1', label: 'Retreat' }] }));

    await BM.importBackup(file);

    assert.strictEqual(sandbox.localStorage.getItem('portfolioDateFormat'), null,
      'a null-source dateFormat must RESET the customized target to default (removeItem), not retain mm/dd/yyyy');
    assert.strictEqual(sandbox.localStorage.getItem('portfolioSessionTypes'), null,
      'a null-source sessionTypes must RESET the customized target to default (removeItem), not retain the custom list');
  });

  // ─── 17. Locked rename dup-label guard (WR-03) ───────────────────────────
  // A locked-default rename must reject a label that collides with another
  // type's current label (custom renames were already guarded; locked ones were
  // not) — no override may be written on collision.
  await test('editor: renaming a locked default to an existing label is rejected (no override stored) (WR-03)', async function () {
    var env = buildSettingsEnv({
      search: '?tab=personalize',
      seed: { sessionTypes: { overrides: {}, custom: [{ key: 'custom.1', label: 'Online' }] } },
    });
    await runBoots(env);
    var win = env.win;
    var container = win.document.getElementById('sessionTypesEditor');
    var clinicRow = container.querySelector('.session-type-row[data-type-key="clinic"]');
    assert.ok(clinicRow, 'the locked clinic row must render');
    var input = clinicRow.querySelector('.session-type-rename-input');

    // Rename "Clinic" to collide with the existing custom "Online" label. The
    // change-commit dup guard rejects it, so no override is staged — and a
    // subsequent Save (batch model) therefore persists NO clinic override. The
    // Save step is what makes this non-vacuous: without the guard, Save would
    // commit overrides.clinic = "online" (a real collision).
    input.value = 'online';
    input.dispatchEvent(new win.Event('change', { bubbles: true }));
    await settle();
    win.document.getElementById('sessionTypesSaveBtn').click();
    await settle();

    var parsed = JSON.parse(win.localStorage.getItem('portfolioSessionTypes') || '{}');
    assert.ok(!(parsed.overrides && parsed.overrides.clinic),
      'a locked rename that collides with an existing label must NOT write an override even after Save; got ' + JSON.stringify(parsed.overrides));
    env.dom.window.close();
  });

  // ─── end-of-file count guard (vacuous-green trap) ─────────────────────────
  var EXPECTED_COUNT = 17;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — a case was silently skipped.');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 37-02 personalization surface tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (err) {
  console.error('FATAL test harness error:', err && err.stack || err);
  process.exit(1);
});
