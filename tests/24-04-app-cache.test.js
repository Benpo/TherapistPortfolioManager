/**
 * Phase 24 Plan 04 — Behavior test for App.getSnippets cache +
 * App.refreshSnippetCache + BroadcastChannel "snippets-changed" handler.
 *
 * Loads assets/app.js in a vm sandbox with generous stubs (PortfolioDB,
 * document, localStorage, BroadcastChannel, etc.) and exercises the public
 * cache API directly. Side-effecting initCommon paths (DOM render, language
 * popover, etc.) are no-op'd via stubs.
 *
 * Run: node tests/24-04-app-cache.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * 5 scenarios per the Plan 04 Test Coverage Plan:
 *   A. App.getSnippets is initially [] before any refresh.
 *   B. After App.refreshSnippetCache (with stub returning 3 snippets),
 *      App.getSnippets returns those 3.
 *   C. App.getSnippets returns a COPY — mutating the returned array does
 *      not corrupt the cache.
 *   D. App.refreshSnippetCache dispatches "app:snippets-changed" CustomEvent
 *      on document.
 *   E. BroadcastChannel onmessage handler dispatches refreshSnippetCache for
 *      type "snippets-changed" AND still handles "therapist-settings-changed"
 *      (no regression of the Phase 22 branch).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Stubs
// ────────────────────────────────────────────────────────────────────

// Track refresh-event dispatches
const dispatched = [];
function makeEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener() {},
    dispatchEvent(ev) {
      dispatched.push({ type: ev.type, detail: ev.detail });
      const arr = listeners.get(ev.type) || [];
      for (const fn of arr) fn(ev);
      return true;
    },
  };
}

const documentEventTarget = makeEventTarget();

const documentStub = Object.assign({
  documentElement: { lang: '', setAttribute() {} },
  body: { classList: { add() {}, remove() {} }, prepend() {}, style: {}, dataset: {} },
  head: { appendChild() {} },
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() {
    return {
      style: {}, classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
      appendChild() {}, append() {}, prepend() {}, removeChild() {}, remove() {}, setAttribute() {},
      getAttribute() { return null; },
      addEventListener() {}, removeEventListener() {},
      getBoundingClientRect() { return { left:0, top:0, width:0, height:0 }; },
    };
  },
}, documentEventTarget);

const storage = (function () {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    clear() { map.clear(); },
  };
})();

// PortfolioDB stub — controls what getAllSnippets returns.
let snippetsToReturn = [];
let therapistSettingsToReturn = [];
const PortfolioDB = {
  getAllSnippets: async () => snippetsToReturn.slice(),
  getAllTherapistSettings: async () => therapistSettingsToReturn.slice(),
  setTherapistSetting: async () => {},
  clearTherapistSettings: async () => {},
};

// BroadcastChannel stub — captures the handler so the test can replay messages.
let capturedBC = null;
class BroadcastChannel {
  constructor(name) { this.name = name; this.handlers = []; capturedBC = this; }
  addEventListener(type, fn) { if (type === 'message') this.handlers.push(fn); }
  postMessage() {}
  close() {}
}

// Build the vm sandbox.
const navStub = {
  serviceWorker: { addEventListener() {} },
  storage: { persist: () => Promise.resolve(false), persisted: () => Promise.resolve(false) },
  userAgent: '',
};
const sandbox = {
  window: { name: '', location: { href: '', search: '' }, scrollTo() {}, getComputedStyle: () => ({}) },
  document: documentStub,
  navigator: navStub,
  localStorage: storage,
  sessionStorage: storage,
  PortfolioDB: PortfolioDB,
  BroadcastChannel: BroadcastChannel,
  CustomEvent: class CustomEvent {
    constructor(type, init) { this.type = type; this.detail = (init && init.detail); this.bubbles = !!(init && init.bubbles); }
  },
  Event: class Event {
    constructor(type, init) { this.type = type; this.bubbles = !!(init && init.bubbles); }
  },
  console: { log() {}, warn() {}, error() {} },
  setTimeout, clearTimeout, queueMicrotask, Promise, JSON, Math, Date, Array, Object, Set, Map, RegExp, String, Number, Boolean,
};
sandbox.window.localStorage = storage;
sandbox.window.PortfolioDB = PortfolioDB;
sandbox.window.BroadcastChannel = BroadcastChannel;
// Minimal I18N to satisfy setLanguage paths if reached. (We won't call initCommon.)
sandbox.window.I18N = { en: {}, he: {}, de: {}, cs: {} };
sandbox.window.I18N_DEFAULT = 'en';
vm.createContext(sandbox);

const rawSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'app.js'), 'utf8');
// app.js declares `window.App = (() => ...)()` and later assigns `App.installNavGuard = ...`
// at module top-level. In a browser, bare `App` is auto-aliased from window.App via legacy
// global property exposure. In a Node vm context that auto-alias does NOT happen, so the
// `App.installNavGuard` line throws "App is not defined". Patch it for tests.
const src = rawSrc.replace(/^App\./gm, 'window.App.');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/app.js' });
} catch (err) {
  console.error('FATAL: assets/app.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const App = sandbox.window.App;
if (!App) {
  console.error('FAIL: App namespace not found on sandbox after loading app.js.');
  process.exit(1);
}
for (const fn of ['getSnippets', 'refreshSnippetCache']) {
  if (typeof App[fn] !== 'function') {
    console.error(`FAIL: App.${fn} is not exported.`);
    console.error('      Plan 04 Task 4 must add this to the public API.');
    process.exit(1);
  }
}

// ────────────────────────────────────────────────────────────────────
// Test runner
// ────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err.message}`); failed++; }
}

const fixture3 = [
  { id: 'a.1', trigger: 'aa', expansions: { he: '', en: 'AA', cs: '', de: '' }, tags: ['x'], origin: 'seed', createdAt: 't', updatedAt: 't' },
  { id: 'b.1', trigger: 'bb', expansions: { he: '', en: 'BB', cs: '', de: '' }, tags: ['x'], origin: 'seed', createdAt: 't', updatedAt: 't' },
  { id: 'c.1', trigger: 'cc', expansions: { he: '', en: 'CC', cs: '', de: '' }, tags: ['x'], origin: 'user', createdAt: 't', updatedAt: 't' },
];

(async () => {
  // ─── A. Initial state ───────────────────────────────────────────────
  await test('A. App.getSnippets is initially [] before any refresh', () => {
    const list = App.getSnippets();
    assert.ok(Array.isArray(list), 'getSnippets must return an array');
    assert.strictEqual(list.length, 0, 'initial cache should be empty');
  });

  // ─── B. After refresh, cache is populated ───────────────────────────
  await test('B. After App.refreshSnippetCache, getSnippets returns the loaded list', async () => {
    snippetsToReturn = fixture3.slice();
    await App.refreshSnippetCache();
    const list = App.getSnippets();
    assert.strictEqual(list.length, 3, `expected 3 cached snippets, got ${list.length}`);
    assert.strictEqual(list[0].id, 'a.1');
    assert.strictEqual(list[2].trigger, 'cc');
  });

  // ─── C. getSnippets returns a COPY (immutability boundary) ──────────
  await test('C. getSnippets returns a COPY — mutating it does not corrupt the cache', async () => {
    const first = App.getSnippets();
    first.push({ id: 'mutant', trigger: 'mutant' });
    first[0] = null;
    const second = App.getSnippets();
    assert.strictEqual(second.length, 3, 'cache must still hold 3 after caller mutation');
    assert.ok(second[0] !== null && second[0].id === 'a.1', 'cache must retain the original first entry');
    assert.ok(!second.some((s) => s && s.id === 'mutant'),
      'mutant push must not leak into the cache');
  });

  // ─── D. refreshSnippetCache dispatches the DOM event ────────────────
  await test('D. App.refreshSnippetCache dispatches "app:snippets-changed" on document', async () => {
    const before = dispatched.filter((e) => e.type === 'app:snippets-changed').length;
    snippetsToReturn = fixture3.slice(0, 2);
    await App.refreshSnippetCache();
    const after = dispatched.filter((e) => e.type === 'app:snippets-changed').length;
    assert.ok(after > before, `expected at least one new "app:snippets-changed" event, got ${after - before}`);
    // And the cache now holds 2.
    assert.strictEqual(App.getSnippets().length, 2);
  });

  // ─── E. BroadcastChannel handler — both branches still work ─────────
  // We need to drive initCommon to register the BroadcastChannel handler.
  // initCommon does many side-effects via the DOM stubs — most of which
  // are no-ops because querySelector* return null. We swallow any throw.
  await test('E. BroadcastChannel handler responds to both snippets-changed AND therapist-settings-changed', async () => {
    capturedBC = null;
    snippetsToReturn = fixture3.slice();
    therapistSettingsToReturn = [
      { sectionKey: 'limitingBeliefs', customLabel: 'Beliefs', enabled: true },
    ];
    try { await App.initCommon(); } catch (_) { /* DOM side-effects may throw on null stubs — ignore */ }

    assert.ok(capturedBC, 'initCommon must construct a BroadcastChannel');
    assert.ok(capturedBC.handlers.length > 0, 'initCommon must register at least one message handler');

    // Fire a snippets-changed message.
    const beforeSnippets = dispatched.filter((e) => e.type === 'app:snippets-changed').length;
    snippetsToReturn = fixture3.slice(0, 1); // change underlying data
    for (const h of capturedBC.handlers) {
      await h({ data: { type: 'snippets-changed' } });
    }
    const afterSnippets = dispatched.filter((e) => e.type === 'app:snippets-changed').length;
    assert.ok(afterSnippets > beforeSnippets,
      'BroadcastChannel snippets-changed must trigger refreshSnippetCache');
    assert.strictEqual(App.getSnippets().length, 1,
      'BroadcastChannel refresh must update the cache to the new IDB content');

    // Fire a therapist-settings-changed message — must NOT regress Phase 22 branch.
    const beforeSettings = dispatched.filter((e) => e.type === 'app:settings-changed').length;
    for (const h of capturedBC.handlers) {
      await h({ data: { type: 'therapist-settings-changed' } });
    }
    const afterSettings = dispatched.filter((e) => e.type === 'app:settings-changed').length;
    assert.ok(afterSettings > beforeSettings,
      'therapist-settings-changed branch must still dispatch app:settings-changed');
  });

  // ─── Report ─────────────────────────────────────────────────────────
  console.log('');
  console.log(`Plan 04 app-cache tests — ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})();
