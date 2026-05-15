/**
 * Phase 25 Plan 04 Task 3 — Behavior test for D-15/D-19 banner suppression.
 *
 * The load-bearing D-15/D-19 gate per VALIDATION.md (line 51) and project
 * memory `feedback-behavior-verification.md`. Confirms BEHAVIOR (the guard
 * short-circuits the banner render path at runtime), not just SHAPE (the
 * guard exists in source).
 *
 * Sub-cases:
 *   A. schedule ON + extremely stale last-export → banner NOT rendered.
 *   B. schedule OFF + 8-day-stale last-export → banner IS rendered (legacy
 *      7-day path preserved).
 *   C. schedule OFF + 1-day-fresh last-export → banner NOT rendered.
 *   D. BackupManager.getScheduleIntervalMs throws → try/catch falls
 *      through to legacy stale path → banner IS rendered.
 *
 * Loads assets/app.js in a vm sandbox (same pattern as tests/24-04-app-cache.test.js)
 * and exercises App.checkBackupReminder directly. The test stubs
 * App.showBackupBanner after load (test seam exported by this plan) and
 * counts invocations.
 *
 * Run: node tests/25-04-banner-suppression.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Stubs
// ────────────────────────────────────────────────────────────────────

function makeEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener() {},
    dispatchEvent() { return true; },
  };
}

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
}, makeEventTarget());

const storage = (function () {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    clear() { map.clear(); },
  };
})();

const PortfolioDB = {
  getAllSnippets: async () => [],
  getAllTherapistSettings: async () => [],
  setTherapistSetting: async () => {},
};

class BroadcastChannel {
  constructor() {}
  addEventListener() {}
  postMessage() {}
  close() {}
}

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
sandbox.window.I18N = { en: {}, he: {}, de: {}, cs: {} };
sandbox.window.I18N_DEFAULT = 'en';
vm.createContext(sandbox);

const rawSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'app.js'), 'utf8');
// Same patch as tests/24-04-app-cache.test.js — the bare `App.` accesses at
// module-top-level don't auto-alias from window.App in a vm context.
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
for (const fn of ['checkBackupReminder', 'showBackupBanner']) {
  if (typeof App[fn] !== 'function') {
    console.error(`FAIL: App.${fn} is not exported.`);
    console.error('      Plan 04 Task 3 must add this test seam to the App return object.');
    process.exit(1);
  }
}

// Install the showBackupBanner spy. We swap the App-exposed reference; the
// in-app caller is `showBackupBanner()` (closure binding from inside the IIFE)
// which is the function we want to count. Replacing App.showBackupBanner alone
// would not intercept those closure calls — but because Plan 04 Task 3 exports
// the seam specifically for this test, the test calls App.checkBackupReminder
// which internally calls the closure-bound showBackupBanner. To count THAT, we
// instead spy on the spy-friendlier side-effect: body.prepend invocation with a
// banner-flavored node. That's the most behavior-faithful approach.

let bannerRendered = 0;
sandbox.document.body.prepend = function (node) {
  // showBackupBanner creates a div with id="backupBanner" and class
  // containing "backup-banner". Count any prepend whose node has either
  // signal — defensive against minor class-name churn.
  if (node && (node.id === 'backupBanner' ||
               (node.className && String(node.className).indexOf('backup-banner') !== -1))) {
    bannerRendered++;
  }
};

// We also need a working createElement that returns nodes carrying the
// className/id properties so the spy can detect a banner. The default stub
// returns an object whose `setAttribute` doesn't store the id and whose
// className is unset. Re-stub it minimally so the in-app showBackupBanner —
// which does `banner.id = "backupBanner"` and `banner.className = "..."` —
// produces a detectable node.
sandbox.document.createElement = function (tag) {
  return {
    tagName: tag,
    id: '',
    className: '',
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    appendChild() {}, append() {}, prepend() {}, removeChild() {}, remove() {},
    setAttribute() {}, getAttribute() { return null; },
    addEventListener() {}, removeEventListener() {},
  };
};

// ────────────────────────────────────────────────────────────────────
// Test runner
// ────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err.message}`); failed++; }
}

const DAY = 24 * 60 * 60 * 1000;

// ─── Sub-case A: schedule ON + extremely stale last-export → no banner ──
test('A. schedule ON + 30d-stale last-export → banner NOT rendered (D-15/D-19)', () => {
  storage.clear();
  storage.removeItem('portfolioBackupSnoozedUntil');
  storage.setItem('portfolioLastExport', String(Date.now() - 30 * DAY));
  sandbox.BackupManager = { getScheduleIntervalMs: () => 86400000 };
  bannerRendered = 0;
  App.checkBackupReminder();
  assert.strictEqual(bannerRendered, 0,
    'banner must NOT render when schedule is active (D-15/D-19) even with 30-day stale export');
});

// ─── Sub-case B: schedule OFF + 8d stale → banner renders ───────────────
test('B. schedule OFF + 8d-stale last-export → banner IS rendered (legacy path)', () => {
  storage.clear();
  storage.removeItem('portfolioBackupSnoozedUntil');
  storage.setItem('portfolioLastExport', String(Date.now() - 8 * DAY));
  sandbox.BackupManager = { getScheduleIntervalMs: () => null };
  bannerRendered = 0;
  App.checkBackupReminder();
  assert.strictEqual(bannerRendered, 1,
    'banner MUST render when schedule is OFF and last export is stale (legacy 7-day path)');
});

// ─── Sub-case C: schedule OFF + 1d fresh → no banner ────────────────────
test('C. schedule OFF + 1d-fresh last-export → banner NOT rendered (no false positives)', () => {
  storage.clear();
  storage.removeItem('portfolioBackupSnoozedUntil');
  storage.setItem('portfolioLastExport', String(Date.now() - 1 * DAY));
  sandbox.BackupManager = { getScheduleIntervalMs: () => null };
  bannerRendered = 0;
  App.checkBackupReminder();
  assert.strictEqual(bannerRendered, 0,
    'banner must NOT render when last export is recent (legacy behavior preserved)');
});

// ─── Sub-case D: BackupManager.getScheduleIntervalMs throws → defensive ──
test('D. BackupManager.getScheduleIntervalMs throws → try/catch falls through → banner renders', () => {
  storage.clear();
  storage.removeItem('portfolioBackupSnoozedUntil');
  storage.setItem('portfolioLastExport', String(Date.now() - 10 * DAY));
  sandbox.BackupManager = { getScheduleIntervalMs: () => { throw new Error('boom'); } };
  bannerRendered = 0;
  App.checkBackupReminder();
  assert.strictEqual(bannerRendered, 1,
    'try/catch defensive shape must allow legacy banner path when BackupManager throws');
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log(`Plan 04 banner-suppression tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
