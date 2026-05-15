/**
 * Phase 25 Plan 07 Task 1 — Behavior test for the Photos-tab delete-all loop.
 *
 * Verifies the LOOP shape (which lives in settings.js), NOT the UI handler.
 * The loop accepts injected `getAllClients` + `updateClient` function
 * dependencies, walks every client with photoData, and writes
 * `Object.assign({}, client, { photoData: '' })` back via updateClient.
 *
 * Strategy: vm-sandbox-load assets/settings.js with minimal stubs. The file
 * has 4 IIFEs that all execute at load time. We only need the Photos-tab
 * IIFE to register `window.__PhotosTabHelpers`. Once exposed, the test can
 * drive the pure loop without any IDB, DOM, or UI involvement.
 *
 * Run: node tests/25-07-delete-all-photos.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * 3 sub-cases:
 *   A. EXPOSURE — window.__PhotosTabHelpers._deleteAllPhotosLoop is a function.
 *   B. BEHAVIOR — clients with photoData get cleared, clients without are skipped,
 *      success/failed counts match.
 *   C. FAILURE-PROPAGATION — updateClient rejections increment `failed`, never
 *      throw out of the loop.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Stubs — settings.js IIFEs run at load. We provide minimal globals so
// each IIFE returns cleanly. The DOMContentLoaded listeners are registered
// but never fire (we never dispatch the event).
// ────────────────────────────────────────────────────────────────────

const storage = (function () {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    clear() { map.clear(); },
  };
})();

function makeFakeDocument() {
  const listeners = {};
  return {
    addEventListener(type, fn) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    removeEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return { setAttribute() {}, appendChild() {}, addEventListener() {}, classList: { add(){}, remove(){}, contains(){return false;}, toggle(){} } }; },
    body: { prepend() {}, appendChild() {} },
    head: { appendChild() {} },
    _listeners: listeners,
  };
}

const sandbox = {
  window: {
    // settings.js's first IIFE may reference window.App / window.PortfolioDB / window.Snippets
    // — minimal mocks suffice since the DOMContentLoaded handlers never fire.
    App: {
      t: function (k) { return k; },
      getLanguage: function () { return 'en'; },
      showToast: function () {},
      confirmDialog: function () { return Promise.resolve(false); },
      getSnippets: function () { return []; },
      refreshSnippetCache: function () { return Promise.resolve(); },
      initCommon: function () {},
    },
    PortfolioDB: {
      getAllClients: async function () { return []; },
      updateClient: async function () {},
      getAllSnippets: async function () { return []; },
      validateSnippetShape: function () {},
    },
    Snippets: { getPrefix: function () { return '!'; }, setPrefix: function () {} },
    SNIPPETS_SEED: [],
    I18N: { en: {} },
    BackupManager: undefined,
  },
  document: makeFakeDocument(),
  localStorage: storage,
  console: { log() {}, warn() {}, error() {} },
  BroadcastChannel: function () {
    return { postMessage: function () {}, close: function () {}, addEventListener: function () {} };
  },
  setTimeout, clearTimeout, Promise, JSON, Math, Date, Array, Object, Set, Map, RegExp, String, Number, Boolean,
};
sandbox.window.localStorage = storage;
sandbox.self = sandbox.window;
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings.js'), 'utf8');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/settings.js' });
} catch (err) {
  console.error('FATAL: assets/settings.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const helpers = sandbox.window.__PhotosTabHelpers;
if (!helpers || typeof helpers._deleteAllPhotosLoop !== 'function') {
  console.error('FAIL: window.__PhotosTabHelpers._deleteAllPhotosLoop is not exposed.');
  console.error('      Plan 07 Task 1 must add the loop helper inside a new IIFE in');
  console.error('      assets/settings.js and assign it to window.__PhotosTabHelpers.');
  process.exit(1);
}

// ────────────────────────────────────────────────────────────────────
// Test runner
// ────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err.message}`); failed++; }
}

(async function run() {
  // ─── A. EXPOSURE ──────────────────────────────────────────────────
  await test('window.__PhotosTabHelpers._deleteAllPhotosLoop is a function', () => {
    assert.strictEqual(typeof helpers._deleteAllPhotosLoop, 'function');
  });

  // ─── B. BEHAVIOR ──────────────────────────────────────────────────
  await test('loop clears photoData on only the clients that have one', async () => {
    const clients = [
      { id: 1, firstName: 'A', photoData: 'data:image/jpeg;base64,AAAA' },
      { id: 2, firstName: 'B', photoData: '' },
      { id: 3, firstName: 'C', photoData: 'data:image/jpeg;base64,BBBB' },
    ];
    const updates = [];
    const result = await helpers._deleteAllPhotosLoop(
      async () => clients,
      async (c) => { updates.push(c); }
    );

    assert.strictEqual(updates.length, 2, 'only 2 clients had photos to clear');
    assert.strictEqual(updates[0].id, 1);
    assert.strictEqual(updates[0].photoData, '');
    assert.strictEqual(updates[0].firstName, 'A', 'other fields preserved');
    assert.strictEqual(updates[1].id, 3);
    assert.strictEqual(updates[1].photoData, '');
    assert.strictEqual(result.success, 2);
    assert.strictEqual(result.failed, 0);
  });

  await test('loop does not mutate the original client objects', async () => {
    const original = { id: 1, photoData: 'data:image/jpeg;base64,AAAA' };
    const updates = [];
    await helpers._deleteAllPhotosLoop(
      async () => [original],
      async (c) => { updates.push(c); }
    );
    // Original keeps its photoData (Object.assign copy was passed to updateClient)
    assert.strictEqual(original.photoData, 'data:image/jpeg;base64,AAAA');
    assert.strictEqual(updates[0].photoData, '');
  });

  // ─── C. FAILURE-PROPAGATION ───────────────────────────────────────
  await test('rejected updateClient increments failed; loop continues', async () => {
    const clients = [
      { id: 1, photoData: 'data:image/jpeg;base64,AAAA' },
      { id: 2, photoData: 'data:image/jpeg;base64,BBBB' },
      { id: 3, photoData: 'data:image/jpeg;base64,CCCC' },
    ];
    let calls = 0;
    const result = await helpers._deleteAllPhotosLoop(
      async () => clients,
      async () => {
        calls++;
        if (calls === 2) throw new Error('IDB write failed');
      }
    );

    assert.strictEqual(result.success, 2, 'two writes succeeded');
    assert.strictEqual(result.failed, 1, 'one write failed');
    assert.strictEqual(calls, 3, 'loop visited every client with photoData');
  });

  await test('empty client list → success:0, failed:0', async () => {
    const result = await helpers._deleteAllPhotosLoop(
      async () => [],
      async () => {}
    );
    assert.strictEqual(result.success, 0);
    assert.strictEqual(result.failed, 0);
  });

  // ─── Report ──────────────────────────────────────────────────────
  console.log('');
  console.log(`Plan 07 delete-all-photos tests — ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})();
