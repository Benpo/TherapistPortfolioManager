/**
 * Phase 25 Plan 12 — UAT-D3: schedule frequency change must fire
 * App.showToast('', 'schedule.savedToast').
 *
 * RUNTIME behavior test (per feedback-behavior-verification.md):
 *   - load assets/settings.js in a vm sandbox
 *   - mount stub DOM for #scheduleFrequencySelect, #scheduleCustomDaysWrapper,
 *     #scheduleFrequencyHelper, #schedulePasswordAcked, #schedulePasswordError
 *   - seed portfolioBackupSchedulePasswordAcked='true' so canEnableSchedule
 *     returns true and the change is persisted
 *   - install an App.showToast spy that records each (arg1, arg2) call
 *   - dispatch a 'change' event on the select with value='weekly'
 *   - assert calls includes (and exactly equals once for this dispatch)
 *       ['', 'schedule.savedToast']
 *   - repeat for 'custom' and 'off' — confirm dialog auto-confirms for off
 *
 * Negative assertion: no recorded call contains the English literal
 * "Schedule updated" in arg 0 (catches accidental fallback to the literal).
 *
 * MUST FAIL on current code: today the change handler writes localStorage
 * but does not call App.showToast.
 *
 * Run: node tests/25-12-schedule-saved-toast.test.js
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
    _checked: false,
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
    get checked() { return this._checked; },
    set checked(v) { this._checked = !!v; },
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
  // Pre-seed: canEnableSchedule must return true for non-off transitions.
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

  const showToastCalls = [];
  const App = {
    t: function (k) { return k; },
    showToast: function (a, b) { showToastCalls.push([a, b]); },
    // Auto-confirm any prompt (including the ON→OFF confirm) — keeps the
    // test focused on the save-toast contract, not the confirm flow.
    confirmDialog: function () { return Promise.resolve(true); },
    initCommon: function () { return Promise.resolve(); },
    setLanguage: function () {},
    applyTranslations: function () {},
    getSnippets: function () { return []; },
    refreshSnippetCache: function () { return Promise.resolve(); },
    mountBackupCloudButton: function () {},
    updateBackupCloudState: function () {},
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

  return { sandbox: sandbox, document: document, elements: elements, showToastCalls: showToastCalls };
}

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) {
    console.log('  FAIL  ' + name);
    console.log('        ' + (err && err.message || err));
    failed++;
  }
}

(async function run() {
  // ─── Setup ────────────────────────────────────────────────────────
  const ctx = makeSandbox();
  const sel = ctx.elements.get('scheduleFrequencySelect');
  if (!sel) { console.error('FAIL: select not mounted'); process.exit(1); }

  async function setFrequencyAndWait(value) {
    sel.value = value;
    sel.dispatchChange();
    // applyFrequencyChange is async (await on confirmDialog); drain microtasks.
    await new Promise((r) => setTimeout(r, 25));
  }

  // ─── Weekly ───────────────────────────────────────────────────────
  await test("change → 'weekly' fires App.showToast('', 'schedule.savedToast')", async () => {
    ctx.showToastCalls.length = 0;
    await setFrequencyAndWait('weekly');
    const savedToast = ctx.showToastCalls.find((c) => c[1] === 'schedule.savedToast');
    if (!savedToast) {
      throw new Error('expected showToast call with key "schedule.savedToast"; got ' +
        JSON.stringify(ctx.showToastCalls));
    }
    assert.strictEqual(savedToast[0], '', 'first arg must be empty string, not an English literal');
    assert.strictEqual(savedToast[1], 'schedule.savedToast');
  });

  // ─── Custom ───────────────────────────────────────────────────────
  await test("change → 'custom' fires App.showToast('', 'schedule.savedToast')", async () => {
    ctx.showToastCalls.length = 0;
    await setFrequencyAndWait('custom');
    const savedToast = ctx.showToastCalls.find((c) => c[1] === 'schedule.savedToast');
    if (!savedToast) {
      throw new Error('expected showToast call with key "schedule.savedToast"; got ' +
        JSON.stringify(ctx.showToastCalls));
    }
    assert.strictEqual(savedToast[0], '');
  });

  // ─── Off (ON → OFF) ───────────────────────────────────────────────
  await test("change → 'off' fires App.showToast('', 'schedule.savedToast')", async () => {
    ctx.showToastCalls.length = 0;
    // Prior step left mode='custom'; switching to 'off' requires a confirm
    // which the spy auto-resolves true.
    await setFrequencyAndWait('off');
    const savedToast = ctx.showToastCalls.find((c) => c[1] === 'schedule.savedToast');
    if (!savedToast) {
      throw new Error('expected showToast call with key "schedule.savedToast" after ON→OFF; got ' +
        JSON.stringify(ctx.showToastCalls));
    }
    assert.strictEqual(savedToast[0], '');
  });

  // ─── Negative: no English literal in arg 0 ────────────────────────
  await test('no recorded call uses an English literal "Schedule updated" as arg 0', async () => {
    for (const [a, b] of ctx.showToastCalls) {
      if (typeof a === 'string' && /Schedule updated/.test(a)) {
        throw new Error('forbidden English literal "Schedule updated" in arg 0: ' + JSON.stringify([a, b]));
      }
    }
  });

  // ─── Report ──────────────────────────────────────────────────────
  console.log('');
  console.log('Plan 25-12 schedule-saved-toast tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
