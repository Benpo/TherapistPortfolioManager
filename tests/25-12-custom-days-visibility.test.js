/**
 * Phase 25 Plan 12 — UAT-A: custom-days input visibility.
 *
 * Asserts that the change handler hides #scheduleCustomDaysWrapper for every
 * frequency in {off, daily, weekly, monthly} and shows it only when the
 * frequency is 'custom'.
 *
 * Approach: load assets/settings.js in a Node vm sandbox with stubbed DOM nodes
 * for #scheduleFrequencySelect, #scheduleCustomDaysWrapper, #scheduleFrequencyHelper,
 * #schedulePasswordAcked, #schedulePasswordError. Pre-seed
 * portfolioBackupSchedulePasswordAcked='true' so canEnableSchedule returns true
 * and the change is actually persisted (otherwise the handler reverts the select
 * before refreshCustomDaysVisibility runs).
 *
 * For each frequency in ['off', 'daily', 'weekly', 'monthly']:
 *   - set select.value, dispatch 'change' event
 *   - assert wrapper.hidden === true (or hidden attribute set)
 * For frequency='custom':
 *   - assert wrapper.hidden === false (or hidden attribute absent)
 *
 * RED on current code: refreshCustomDaysVisibility already exists in settings.js
 * (line 1923), so this test may actually GREEN immediately — BUT the production
 * code does NOT use a DOM addEventListener for the wrapper visibility, it depends
 * on the change handler invoking applyFrequencyChange. If the change handler does
 * not visibly update the wrapper for every value, the test fails. Plan 12 RED
 * verification is the test running and FAILING; this proves the implementation
 * matches the contract.
 *
 * Run: node tests/25-12-custom-days-visibility.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const settingsSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings.js'), 'utf8');

function makeNode(id) {
  const listeners = new Map();
  const attrs = new Map();
  const node = {
    id: id,
    _attributes: attrs,
    _listeners: listeners,
    _hidden: false,
    _value: '',
    _textContent: '',
    _disabled: false,
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); },
      toggle(c, force) {
        if (force === true) this._classes.add(c);
        else if (force === false) this._classes.delete(c);
        else if (this._classes.has(c)) this._classes.delete(c);
        else this._classes.add(c);
      },
    },
    get textContent() { return this._textContent; },
    set textContent(v) { this._textContent = String(v); },
    get hidden() { return this._hidden; },
    set hidden(v) { this._hidden = !!v; },
    get value() { return this._value; },
    set value(v) { this._value = String(v); },
    get disabled() { return this._disabled; },
    set disabled(v) { this._disabled = !!v; },
    setAttribute(k, v) {
      attrs.set(k, String(v));
      if (k === 'hidden') this._hidden = true;
    },
    removeAttribute(k) {
      attrs.delete(k);
      if (k === 'hidden') this._hidden = false;
    },
    getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
    hasAttribute(k) { return attrs.has(k); },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener() {},
    dispatchChange() {
      const arr = listeners.get('change') || [];
      for (let i = 0; i < arr.length; i++) arr[i]({ target: node, currentTarget: node });
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    appendChild(c) { return c; },
    focus() {},
    blur() {},
    style: {},
  };
  return node;
}

function makeSandbox() {
  const elements = new Map();
  const ids = [
    'scheduleFrequencySelect',
    'scheduleCustomDaysWrapper',
    'scheduleCustomDays',
    'scheduleFrequencyHelper',
    'schedulePasswordAcked',
    'schedulePasswordError',
    'scheduleFolderField',
    'scheduleFolderPickBtn',
    'scheduleFolderState',
    'scheduleFolderUnsupported',
  ];
  for (const id of ids) elements.set(id, makeNode(id));

  const docListeners = new Map();
  const document = {
    addEventListener(type, fn) {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
    },
    removeEventListener() {},
    getElementById(id) { return elements.has(id) ? elements.get(id) : null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return makeNode('__synthetic'); },
    body: makeNode('__body'),
    head: makeNode('__head'),
    documentElement: makeNode('__html'),
    readyState: 'complete',
    _fireReady() {
      const arr = docListeners.get('DOMContentLoaded') || [];
      for (let i = 0; i < arr.length; i++) {
        try { arr[i]({}); } catch (_) {}
      }
    },
  };

  const storage = (function () {
    const m = new Map();
    return {
      getItem(k) { return m.has(String(k)) ? m.get(String(k)) : null; },
      setItem(k, v) { m.set(String(k), String(v)); },
      removeItem(k) { m.delete(String(k)); },
      clear() { m.clear(); },
    };
  })();
  // Pre-seed so canEnableSchedule returns true.
  storage.setItem('portfolioBackupSchedulePasswordAcked', 'true');

  const BackupManager = {
    canEnableSchedule: function (mode) {
      if (mode === 'off') return true;
      return storage.getItem('portfolioBackupSchedulePasswordAcked') === 'true';
    },
    isAutoBackupSupported: function () { return true; },
    checkBackupSchedule: function () {},
    pickBackupFolder: function () { return Promise.resolve(null); },
  };

  const sandbox = {
    window: {},
    document: document,
    localStorage: storage,
    navigator: { storage: { estimate: function () { return Promise.resolve({ usage: 0 }); } } },
    console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, Promise, JSON, Math, Date, Array, Object, Set, Map, RegExp, String, Number, Boolean, Symbol, Error,
    Blob: function () {},
    FileReader: function () {},
    atob: function (s) { return Buffer.from(s, 'base64').toString('binary'); },
    btoa: function (s) { return Buffer.from(s, 'binary').toString('base64'); },
  };
  sandbox.window.document = document;
  sandbox.window.localStorage = storage;
  sandbox.window.navigator = sandbox.navigator;
  sandbox.window.addEventListener = function () {};
  sandbox.window.removeEventListener = function () {};
  sandbox.window.setTimeout = setTimeout;
  sandbox.window.clearTimeout = clearTimeout;
  const App = {
    t: function (k) { return k; },
    showToast: function () {},
    confirmDialog: function () { return Promise.resolve(true); },
    initCommon: function () { return Promise.resolve(); },
    setLanguage: function () {},
    applyTranslations: function () {},
    getSnippets: function () { return []; },
    refreshSnippetCache: function () { return Promise.resolve(); },
    mountBackupCloudButton: function () {},
    updateBackupCloudState: function () {},
  };
  sandbox.window.App = App;
  sandbox.App = App;
  sandbox.window.BackupManager = BackupManager;
  sandbox.BackupManager = BackupManager;
  sandbox.window.PortfolioDB = {
    getAllClients: function () { return Promise.resolve([]); },
    estimatePhotosBytes: function () { return 0; },
    updateClient: function () { return Promise.resolve(); },
    getAllSnippets: function () { return Promise.resolve([]); },
    setTherapistSetting: function () { return Promise.resolve(); },
  };
  sandbox.PortfolioDB = sandbox.window.PortfolioDB;
  sandbox.window.Snippets = { getPrefix: function () { return '!'; }, setPrefix: function () {} };
  sandbox.Snippets = sandbox.window.Snippets;
  sandbox.window.SNIPPETS_SEED = [];
  sandbox.SNIPPETS_SEED = [];
  sandbox.window.I18N = { en: {}, he: {}, de: {}, cs: {} };
  sandbox.I18N = sandbox.window.I18N;
  sandbox.window.CropModule = { resizeToMaxDimension: function () { return Promise.resolve({ size: 0 }); } };
  sandbox.CropModule = sandbox.window.CropModule;
  sandbox.BroadcastChannel = function () {
    return { postMessage: function () {}, close: function () {}, addEventListener: function () {} };
  };

  vm.createContext(sandbox);
  vm.runInContext(settingsSrc, sandbox, { filename: 'assets/settings.js' });
  document._fireReady();

  return { sandbox: sandbox, document: document, elements: elements };
}

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) {
    console.log('  FAIL  ' + name);
    console.log('        ' + (err && err.message || err));
    failed++;
  }
}

const ctx = makeSandbox();
const sel = ctx.elements.get('scheduleFrequencySelect');
const wrap = ctx.elements.get('scheduleCustomDaysWrapper');

if (!sel) { console.error('FAIL: select not mounted'); process.exit(1); }
if (!wrap) { console.error('FAIL: wrapper not mounted'); process.exit(1); }

function setFrequencyAndDispatch(value) {
  sel.value = value;
  // Persist mode so the production code's readScheduleMode() returns the value.
  ctx.sandbox.localStorage.setItem('portfolioBackupScheduleMode', value);
  sel.dispatchChange();
}

['off', 'daily', 'weekly', 'monthly'].forEach((freq) => {
  test('frequency=' + freq + ' → #scheduleCustomDaysWrapper hidden', () => {
    setFrequencyAndDispatch(freq);
    // Drain microtask queue for the async applyFrequencyChange path.
    // (Use a synchronous tick — applyFrequencyChange awaits but the wrapper
    // toggle happens synchronously inside refreshCustomDaysVisibility on the
    // hot path. If implementation moves to async, this test will need to await.)
    const stillVisible = (wrap.hidden === false) && (wrap.getAttribute('hidden') === null);
    assert.strictEqual(stillVisible, false,
      'wrapper should be hidden for frequency=' + freq + ' (hidden=' + wrap.hidden + ', attr=' + wrap.getAttribute('hidden') + ')');
  });
});

test('frequency=custom → #scheduleCustomDaysWrapper visible', () => {
  setFrequencyAndDispatch('custom');
  // Allow microtask drain — refreshCustomDaysVisibility may run after the
  // change handler's await.
  const visible = (wrap.hidden === false) && (wrap.getAttribute('hidden') === null);
  assert.strictEqual(visible, true,
    'wrapper should be visible for frequency=custom (hidden=' + wrap.hidden + ', attr=' + wrap.getAttribute('hidden') + ')');
});

// ────────────────────────────────────────────────────────────────────
// Regression lock-down: source-grep assertions on settings.html and
// settings.js. These prove the STRUCTURE of the visibility contract so a
// future refactor can't accidentally drop the gating.
// ────────────────────────────────────────────────────────────────────

test('settings.html declares #scheduleCustomDaysWrapper with the hidden attribute (initial load = hidden)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'settings.html'), 'utf8');
  // The element must be authored with hidden so the wrapper is invisible
  // on initial paint before JS runs (off is the default frequency).
  if (!/id="scheduleCustomDaysWrapper"[^>]*\bhidden\b/.test(html)) {
    throw new Error('#scheduleCustomDaysWrapper must be authored with the hidden attribute in settings.html (default = hidden)');
  }
});

test('settings.js refreshCustomDaysVisibility gates on frequency === "custom"', () => {
  // Source-grep the function body to ensure the "custom" comparison is
  // present. This prevents a regression where someone replaces the gate
  // with a different condition (e.g. mode !== 'off') that would re-introduce
  // UAT-A.
  const js = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings.js'), 'utf8');
  const fnIdx = js.indexOf('function refreshCustomDaysVisibility');
  if (fnIdx === -1) throw new Error('refreshCustomDaysVisibility function missing from settings.js');
  const slice = js.slice(fnIdx, fnIdx + 600);
  if (!/===\s*['"]custom['"]/.test(slice) && !/['"]custom['"]\s*===/.test(slice)) {
    throw new Error('refreshCustomDaysVisibility no longer compares frequency to "custom" — UAT-A regression risk');
  }
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log('Plan 25-12 custom-days-visibility tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
