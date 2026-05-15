/**
 * Phase 25 Plan 12 (post-UAT fix) — Bug 3: the "Optimize all photos"
 * confirm dialog estimate must be SMALL after photos have already been
 * optimized. The original handler uses a flat 60% reduction heuristic
 * which OVERESTIMATES savings for already-small photos.
 *
 * Reproduction (Ben, 2026-05-15, Safari UAT):
 *   1. First click → dialog says "~XX MB savings", user confirms,
 *      optimization runs → photos shrink.
 *   2. Second click immediately after → dialog STILL says "~XX MB" but
 *      the actual savings (when confirmed) are ~10 bytes because the
 *      photos are already at their optimized size.
 *
 * Root cause: in assets/settings.js handleOptimize, the estimate is
 *   `estimatedSavings = Math.floor(photoBytes * 0.6)`
 * which assumes EVERY photo has room to shrink by 60%. Already-optimized
 * photos (post-resize-to-800px @ q=0.75) are typically <100 KB each;
 * they cannot shrink further so they should contribute 0 to the estimate.
 *
 * Required fix shape (any of):
 *   A. Per-photo gate: count only photos above an "unoptimized" byte
 *      threshold (e.g., > 100 KB per photo) toward the savings estimate.
 *   B. A pre-flight dry-run of the resize loop that returns the exact
 *      byte delta, called before the confirm dialog renders.
 *   C. A persisted `photoOptimizedAt` / size-fingerprint per client,
 *      checked before contributing to the savings.
 *
 * This test enforces shape (A) — the cheapest, schema-free fix. It
 * verifies that the optimize handler uses a per-photo size gate in the
 * estimate computation.
 *
 * MUST FAIL before the fix: the only multiplication is
 *   `Math.floor(photoBytes * 0.6)`
 * with no per-photo iteration / threshold gate.
 *
 * Run: node tests/25-12-optimize-stale-estimate.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const settingsSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings.js'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { console.log('  PASS  ' + name); passed++; })
    .catch((err) => {
      console.log('  FAIL  ' + name);
      console.log('        ' + (err && err.message || err));
      failed++;
    });
}

// ────────────────────────────────────────────────────────────────────
// SOURCE-GREP GATE (cheap, runs first)
//
// The handleOptimize estimate computation MUST include a per-photo
// threshold gate. Accept any of these source-code shapes:
//   1. A helper function name that mentions "estimate" + "savings" (or
//      similar) defined nearby — proves the logic moved out of the flat
//      multiplication.
//   2. A loop over clients that compares per-photo bytes to a threshold
//      constant inside the handler.
//   3. A reference to a new module-scope constant like
//      OPTIMIZED_THRESHOLD / PHOTO_OPTIMIZED_THRESHOLD / etc.
// ────────────────────────────────────────────────────────────────────

test('Source: handleOptimize estimate uses a per-photo gate (not flat photoBytes*0.6)', () => {
  // Slice the handleOptimize function body.
  const fnIdx = settingsSrc.indexOf('async function handleOptimize');
  if (fnIdx === -1) throw new Error('handleOptimize function missing from settings.js');
  // Walk forward to the next `async function ` or `function ` at IIFE indentation.
  const rest = settingsSrc.slice(fnIdx + 1, fnIdx + 6000);
  const nextFnIdx = rest.search(/\n\s{2}(?:async\s+)?function\s+\w+\s*\(/);
  const end = nextFnIdx === -1 ? settingsSrc.length : (fnIdx + 1 + nextFnIdx);
  const body = settingsSrc.slice(fnIdx, end);

  // The forbidden naive shape: a single `photoBytes * 0.6` (or 0.5/0.7)
  // with NO per-photo iteration. We check for the ABSENCE of the
  // forbidden pattern as the primary discriminator. The test accepts ANY
  // of: helper-function call, per-photo loop, or named threshold const.
  const hasFlatHeuristic = /Math\.floor\(\s*photoBytes\s*\*\s*0\.\d+\s*\)/.test(body);
  const hasPerPhotoLoop =
    /for\s*\(\s*var\s+\w+\s*=\s*0[^)]*<\s*clients\.length/.test(body) &&
    /(OPTIMIZED_THRESHOLD|UNOPTIMIZED_THRESHOLD|PHOTO_\w*THRESHOLD|optimizedThreshold)/.test(body);
  const callsEstimateHelper = /estimateOptimizeSavings|estimatePhotoSavings|computeOptimizeSavings|computeSavingsEstimate/.test(body);

  if (hasFlatHeuristic && !hasPerPhotoLoop && !callsEstimateHelper) {
    throw new Error(
      'handleOptimize still uses the flat heuristic `Math.floor(photoBytes * 0.X)`\n' +
      '        with no per-photo gate or helper. This causes the stale-estimate\n' +
      '        bug when photos are already optimized.\n' +
      '        Expected one of:\n' +
      '          • a helper call (estimatePhotoSavings / computeOptimizeSavings / ...)\n' +
      '          • an inline per-photo loop with an OPTIMIZED_THRESHOLD constant\n' +
      '          • a dry-run of the resize loop before the confirm dialog'
    );
  }
});

// ────────────────────────────────────────────────────────────────────
// RUNTIME BEHAVIOR GATE
//
// Build a sandbox, mount the photos UI, and drive handleOptimize twice
// with the App.confirmDialog spy capturing the substituted estimate.
// Between calls, mutate the "stored" clients so the second call sees
// already-optimized photos (each photo's bytes < the optimized threshold,
// e.g., 50 KB per photo). Assert that the second call's estimate string
// represents a SMALL value (sub-KB or sub-100KB) — emphatically NOT the
// same MB-scale value as the first call.
//
// To keep the test independent of the exact threshold the fix picks, we
// require the second estimate to be STRICTLY LESS than 10% of the
// first estimate (when measured in bytes). The first call estimate is
// computed from 2 large photos (~500 KB each); the second from 2 small
// photos (~30 KB each, already-optimized). If the fix is correct, the
// second estimate should be ~0; if the bug persists, it stays ~600 KB.
// ────────────────────────────────────────────────────────────────────

function makeNode(id) {
  const listeners = new Map();
  const attrs = new Map();
  const node = {
    id,
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
      toggle() {},
    },
    get textContent() { return this._textContent; },
    set textContent(v) { this._textContent = String(v); },
    get hidden() { return this._hidden; },
    set hidden(v) { this._hidden = !!v; },
    get value() { return this._value; },
    set value(v) { this._value = String(v); },
    get disabled() { return this._disabled; },
    set disabled(v) { this._disabled = !!v; },
    setAttribute(k, v) { attrs.set(k, String(v)); if (k === 'hidden') this._hidden = true; },
    removeAttribute(k) { attrs.delete(k); if (k === 'hidden') this._hidden = false; },
    getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
    hasAttribute(k) { return attrs.has(k); },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener() {},
    _click() {
      const arr = listeners.get('click') || [];
      for (let i = 0; i < arr.length; i++) arr[i]({ preventDefault() {}, stopPropagation() {}, currentTarget: node });
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

function makeSandbox(opts) {
  const elements = new Map();
  const ids = [
    'photosOptimizeBtn',
    'photosDeleteAllBtn',
    'photosStorageUsage',
    'photosEmpty',
    'photosOptimizePreview',
    'photosOptimizeSection',
    'photosDeleteAllSection',
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
    createElement(tag) { return makeNode('__synthetic_' + tag); },
    body: makeNode('__body'),
    head: makeNode('__head'),
    documentElement: makeNode('__html'),
    readyState: 'complete',
    _fireReady() {
      const arr = docListeners.get('DOMContentLoaded') || [];
      for (let i = 0; i < arr.length; i++) try { arr[i]({}); } catch (_) {}
    },
  };

  const confirmDialogCalls = [];
  const storage = (() => {
    const m = new Map();
    return {
      getItem(k) { return m.has(String(k)) ? m.get(String(k)) : null; },
      setItem(k, v) { m.set(String(k), String(v)); },
      removeItem(k) { m.delete(String(k)); },
      clear() { m.clear(); },
    };
  })();
  storage.setItem('portfolioBackupSchedulePasswordAcked', 'true');

  const PortfolioDB = {
    getAllClients: () => Promise.resolve(opts.clientsRef.value),
    estimatePhotosBytes: function (clients) {
      // Mirror db.js implementation for accuracy.
      let total = 0;
      for (let i = 0; i < (clients || []).length; i++) {
        const c = clients[i];
        if (c && typeof c.photoData === 'string' && c.photoData.indexOf(',') !== -1) {
          const b64 = c.photoData.split(',')[1] || '';
          total += Math.floor(b64.length * 0.75);
        }
      }
      return total;
    },
    updateClient: (c) => Promise.resolve(c),
  };

  const App = {
    showToast: () => {},
    t: (key) => key,
    confirmDialog: (cfg) => {
      // The fix substitutes {n} and {size} BEFORE rendering. We capture
      // the placeholders object directly so the assertion can read the
      // raw size estimate without parsing rendered DOM.
      confirmDialogCalls.push({
        titleKey: cfg.titleKey,
        messageKey: cfg.messageKey,
        placeholders: cfg.placeholders ? Object.assign({}, cfg.placeholders) : null,
      });
      return Promise.resolve(false); // user cancels → no actual optimize runs
    },
    initCommon: () => Promise.resolve(),
    setLanguage: () => {},
    applyTranslations: () => {},
    mountBackupCloudButton: () => {},
    updateBackupCloudState: () => {},
  };

  const sandbox = {
    window: {},
    document,
    localStorage: storage,
    navigator: { storage: { estimate: () => Promise.resolve({ usage: 0 }) } },
    console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, Promise, JSON, Math, Date, Array, Object, Set, Map, RegExp, String, Number, Boolean, Symbol, Error,
    Blob: function () {},
    FileReader: function () {},
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  };
  sandbox.window.document = document;
  sandbox.window.localStorage = storage;
  sandbox.window.navigator = sandbox.navigator;
  sandbox.window.addEventListener = () => {};
  sandbox.window.removeEventListener = () => {};
  sandbox.window.setTimeout = setTimeout;
  sandbox.window.clearTimeout = clearTimeout;
  sandbox.window.App = App;
  sandbox.App = App;
  sandbox.window.PortfolioDB = PortfolioDB;
  sandbox.PortfolioDB = PortfolioDB;
  sandbox.window.CropModule = { resizeToMaxDimension: () => Promise.resolve(new sandbox.Blob([new Uint8Array(5)], {})) };
  sandbox.CropModule = sandbox.window.CropModule;
  sandbox.Uint8Array = Uint8Array;
  sandbox.window.BackupManager = { canEnableSchedule: () => true, isAutoBackupSupported: () => true, checkBackupSchedule: () => {} };
  sandbox.BackupManager = sandbox.window.BackupManager;
  sandbox.window.Snippets = { getPrefix: () => '!', setPrefix: () => {} };
  sandbox.Snippets = sandbox.window.Snippets;
  sandbox.window.SNIPPETS_SEED = [];
  sandbox.SNIPPETS_SEED = [];
  sandbox.window.I18N = { en: {}, he: {}, de: {}, cs: {} };
  sandbox.I18N = sandbox.window.I18N;
  sandbox.BroadcastChannel = function () { return { postMessage() {}, close() {}, addEventListener() {} }; };

  vm.createContext(sandbox);
  vm.runInContext(settingsSrc, sandbox, { filename: 'assets/settings.js' });
  document._fireReady();

  return { sandbox, document, elements, confirmDialogCalls };
}

// Build a data URL whose base64 payload is N chars (so estimatePhotosBytes
// returns floor(N * 0.75) bytes).
function makeDataURLOfBytes(targetBytes) {
  const b64Len = Math.ceil(targetBytes / 0.75);
  return 'data:image/jpeg;base64,' + 'A'.repeat(b64Len);
}

(async function runAll() {

await test('Runtime: second click estimate must be ≪ first click estimate after photos are already optimized', async () => {
  // First-call clients: 2 large photos (~500 KB each → 1 MB total).
  const largePhoto = makeDataURLOfBytes(500 * 1024);
  // Second-call clients: 2 small photos (~30 KB each → 60 KB total).
  // 30 KB per photo is below any reasonable "already-optimized" threshold.
  const smallPhoto = makeDataURLOfBytes(30 * 1024);

  const clientsRef = { value: [
    { id: 'c1', photoData: largePhoto },
    { id: 'c2', photoData: largePhoto },
  ] };

  const ctx = makeSandbox({ clientsRef });
  const btn = ctx.elements.get('photosOptimizeBtn');
  if (!btn) throw new Error('photosOptimizeBtn not mounted');

  // First click — captures the unoptimized estimate.
  btn._click();
  await new Promise(r => setTimeout(r, 30));

  // Mutate the stored clients to simulate post-optimization state.
  clientsRef.value = [
    { id: 'c1', photoData: smallPhoto },
    { id: 'c2', photoData: smallPhoto },
  ];

  // Second click — should see SMALL estimate now.
  btn._click();
  await new Promise(r => setTimeout(r, 30));

  if (ctx.confirmDialogCalls.length < 2) {
    throw new Error('expected 2 confirmDialog calls; got ' + ctx.confirmDialogCalls.length);
  }
  const first = ctx.confirmDialogCalls[0];
  const second = ctx.confirmDialogCalls[1];
  if (!first.placeholders || !second.placeholders) {
    throw new Error('confirmDialog calls missing placeholders bag (Plan 12 UAT-C2 regression)');
  }

  // Extract numeric byte-equivalents from the size label. The handler
  // labels sizes as human-bytes (e.g., "600.0 KB", "12.5 KB"). Parse
  // back to bytes for comparison.
  function labelToBytes(label) {
    const m = /([\d.]+)\s*([KMG]?B)/i.exec(String(label));
    if (!m) return 0;
    const n = parseFloat(m[1]);
    const unit = m[2].toUpperCase();
    if (unit === 'B') return Math.floor(n);
    if (unit === 'KB') return Math.floor(n * 1024);
    if (unit === 'MB') return Math.floor(n * 1024 * 1024);
    if (unit === 'GB') return Math.floor(n * 1024 * 1024 * 1024);
    return 0;
  }

  const firstBytes = labelToBytes(first.placeholders.size);
  const secondBytes = labelToBytes(second.placeholders.size);

  // After photos are already optimized (both photos at ~30 KB), the
  // estimate MUST be effectively zero. With the bug (flat 0.6×total
  // heuristic), the second estimate is 0.6 × 60 KB = ~36 KB. With the
  // fix (per-photo threshold gate excluding photos already < ~100 KB),
  // the second estimate is 0. Require secondBytes < 5 KB so the bug's
  // 36 KB value cannot pass.
  if (firstBytes === 0) {
    throw new Error('first call estimate parsed as 0 bytes; label was: "' + first.placeholders.size + '"');
  }
  if (secondBytes >= 5 * 1024) {
    throw new Error(
      'second call estimate ("' + second.placeholders.size + '" = ' + secondBytes + ' bytes)\n' +
      '        is too close to first call estimate ("' + first.placeholders.size + '" = ' + firstBytes + ' bytes).\n' +
      '        Expected secondBytes < 5 KB (5120 bytes) — the photos at 30 KB each are\n' +
      '        already below any reasonable "already-optimized" threshold, so the\n' +
      '        estimate should be effectively zero.\n' +
      '        This proves the estimate is STALE — the heuristic does not\n' +
      '        differentiate between already-optimized and unoptimized photos.'
    );
  }
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log('Plan 25-12 optimize-stale-estimate tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);

})();
