/**
 * Phase 25 Plan 10 — CR-02 closure test
 *
 * BEHAVIOR: `BackupManager.importBackup` must round-trip the
 * `snippetsDeletedSeeds` sentinel record losslessly so that, after restore,
 * the next call to `seedSnippetsIfNeeded` does NOT re-introduce snippets the
 * user explicitly deleted before exporting.
 *
 * The verifier (25-VERIFICATION.md CR-02) corroborated by the code reviewer
 * (25-REVIEW.md CR-02) identified this gap: `ALLOWED_KEYS` in `importBackup`
 * is a 9-key section whitelist that does NOT include `snippetsDeletedSeeds`.
 * The sentinel arrives in the manifest (export side already writes it via
 * `getAllTherapistSettings()`), is silently skipped on import, and on the
 * next `openDB()` `seedSnippetsIfNeeded` sees an empty deleted-ids set and
 * re-seeds the full pack — wiping the user's deletion preference.
 *
 * This test exercises three assertions on the SAME round-trip:
 *
 *   A) After import, the therapistSettings store contains a row with
 *      sectionKey === 'snippetsDeletedSeeds' and deletedIds verbatim equal
 *      to the source. Crucially the row was written via the dedicated
 *      _writeTherapistSentinel path (not setTherapistSetting, which would
 *      coerce it into a customLabel/enabled shape).
 *
 *   B) After import, a synthetic seedSnippetsIfNeeded run sees the restored
 *      deleted-ids and does NOT re-add the deleted seeds — the user's
 *      deletion preference survives the round-trip.
 *
 *   C) The sentinel write happens BEFORE the snippet-restore loop. Without
 *      this ordering, `seedSnippetsIfNeeded` could fire during the snippet
 *      restore phase (e.g. via an openDB() side effect) and see an empty
 *      deleted-ids set, re-seeding the deleted snippets.
 *
 * STRATEGY:
 *   - Re-use the Plan 25-08 vm-sandbox pattern (real JSZip + real backup.js).
 *   - Build an inline PortfolioDB mock that adds a `_writeTherapistSentinel`
 *     spy and a global write-sequence counter shared across all spies. The
 *     canonical mock at tests/_helpers/mock-portfolio-db.js predates this
 *     plan and does not yet record sequence numbers; we extend inline rather
 *     than mutate the shared helper (Plan 25-08 tests must keep passing).
 *   - The source mock seeds the sentinel via `getAllTherapistSettings()` so
 *     it lands in the manifest naturally. The dest mock starts empty.
 *
 * Run: node tests/25-10-snippets-sentinel-roundtrip.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ---------------------------------------------------------------------------
// Source dataset — minimal but real: 1 client, 1 session, 2 non-sentinel
// section rows, 2 snippets, AND the sentinel row.
// ---------------------------------------------------------------------------

const SOURCE_CLIENTS = [
  { id: 1, firstName: 'Alice', lastName: 'A.', type: 'adult', photoData: '' },
];

const SOURCE_SESSIONS = [
  { id: 10, clientId: 1, date: '2026-05-01', sections: {} },
];

const SOURCE_THERAPIST_SETTINGS = [
  { sectionKey: 'trapped', customLabel: 'Locked', enabled: true },
  { sectionKey: 'heartShield', customLabel: null, enabled: false },
  // The CR-02 load-bearing row. Sentinel shape has NO customLabel / enabled.
  { sectionKey: 'snippetsDeletedSeeds',
    deletedIds: ['snippet-seed-001', 'snippet-seed-002'] },
];

const SOURCE_SNIPPETS = [
  // The seed pack's non-deleted survivors. Real-world: the user kept these
  // and deleted snippet-seed-001 + snippet-seed-002.
  { id: 'snippet-seed-003', trigger: 'fear', text: 'fear of falling',
    tags: ['emotion'], modifiedFromSeed: false },
  { id: 'snippet-seed-004', trigger: 'anger', text: 'anger held inward',
    tags: [], modifiedFromSeed: false },
];

// ---------------------------------------------------------------------------
// Sequence-aware spy-instrumented PortfolioDB mock
// ---------------------------------------------------------------------------

function createSentinelAwareMock(opts) {
  opts = opts || {};
  const calls = new Map();
  const METHODS = [
    'clearAll', 'addClient', 'addSession',
    'setTherapistSetting', 'updateSnippet', '_writeTherapistSentinel',
  ];
  METHODS.forEach(function (m) { calls.set(m, []); });

  // Shared monotonic sequence counter so cross-store ordering is observable.
  var seq = 0;
  function nextSeq() { seq += 1; return seq; }

  function deepCopy(arg) {
    try { return JSON.parse(JSON.stringify(arg)); } catch (_) { return arg; }
  }

  function makeWriteSpy(name) {
    return function () {
      const args = Array.prototype.slice.call(arguments).map(deepCopy);
      calls.get(name).push({ args: args, seq: nextSeq() });
      return Promise.resolve();
    };
  }

  return {
    __calls: calls,
    __getSeq: function () { return seq; },

    clearAll: makeWriteSpy('clearAll'),
    addClient: makeWriteSpy('addClient'),
    addSession: makeWriteSpy('addSession'),
    setTherapistSetting: makeWriteSpy('setTherapistSetting'),
    updateSnippet: makeWriteSpy('updateSnippet'),

    // The CR-02 dedicated write path. The RED test asserts importBackup
    // CALLS this method for the sentinel row. Pre-fix this spy will record
    // ZERO calls because the section whitelist drops the row.
    _writeTherapistSentinel: makeWriteSpy('_writeTherapistSentinel'),

    // Reads
    getAllClients: function () {
      return Promise.resolve(opts.clients || []);
    },
    getAllSessions: function () {
      return Promise.resolve(opts.sessions || []);
    },
    getAllTherapistSettings: function () {
      return Promise.resolve(opts.therapistSettings || []);
    },
    getAllSnippets: function () {
      return Promise.resolve(opts.snippets || []);
    },
    validateSnippetShape: function () { return true; },
  };
}

// ---------------------------------------------------------------------------
// vm sandbox (mirrors Plan 25-08 roundtrip test)
// ---------------------------------------------------------------------------

function makeLocalStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
    setItem: (k, v) => { map.set(String(k), String(v)); },
    removeItem: (k) => { map.delete(String(k)); },
    clear: () => map.clear(),
  };
}

function makeDoc() {
  return {
    addEventListener: () => {},
    removeEventListener: () => {},
    createElement: () => ({
      href: '', download: '', style: {},
      setAttribute: () => {}, appendChild: () => {},
      click: () => {}, addEventListener: () => {},
      classList: { add: () => {}, remove: () => {} },
    }),
    body: { appendChild: () => {}, removeChild: () => {} },
    head: { appendChild: () => {} },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

function buildSandbox(mockDb) {
  const sandbox = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setImmediate: setImmediate,
    clearImmediate: clearImmediate,
    queueMicrotask: queueMicrotask,
    Promise: Promise,
    crypto: globalThis.crypto || { subtle: {}, getRandomValues: (a) => a },
    TextEncoder: TextEncoder,
    TextDecoder: TextDecoder,
    Uint8Array: Uint8Array,
    ArrayBuffer: ArrayBuffer,
    Blob: Blob,
    File: File,
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} },
    FileReader: function FileReader() {
      this.readAsText = function (file) {
        const self = this;
        Promise.resolve()
          .then(() => (typeof file.text === 'function' ? file.text()
                                                       : file.arrayBuffer()))
          .then((res) => {
            self.result = typeof res === 'string'
              ? res
              : new TextDecoder().decode(res);
            if (typeof self.onload === 'function') self.onload({ target: self });
          })
          .catch((err) => {
            if (typeof self.onerror === 'function') self.onerror(err);
          });
      };
      this.readAsArrayBuffer = function (file) {
        const self = this;
        Promise.resolve()
          .then(() => file.arrayBuffer())
          .then((res) => {
            self.result = res;
            if (typeof self.onload === 'function') self.onload({ target: self });
          })
          .catch((err) => {
            if (typeof self.onerror === 'function') self.onerror(err);
          });
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
  const locObj = {};
  let lastHref = '';
  Object.defineProperty(locObj, 'href', {
    get: () => lastHref,
    set: (v) => { lastHref = String(v); },
    configurable: true, enumerable: true,
  });
  sandbox.window.location = locObj;
  sandbox.location = locObj;
  vm.createContext(sandbox);

  const jszipSrc = fs.readFileSync(
    path.join(__dirname, '..', 'assets', 'jszip.min.js'), 'utf8');
  vm.runInContext(jszipSrc, sandbox, { filename: 'assets/jszip.min.js' });
  if (!sandbox.JSZip && sandbox.window.JSZip) sandbox.JSZip = sandbox.window.JSZip;
  if (!sandbox.window.JSZip && sandbox.JSZip) sandbox.window.JSZip = sandbox.JSZip;
  if (typeof sandbox.JSZip !== 'function') {
    throw new Error('JSZip did not attach to the sandbox global');
  }

  const backupSrc = fs.readFileSync(
    path.join(__dirname, '..', 'assets', 'backup.js'), 'utf8');
  vm.runInContext(backupSrc, sandbox, { filename: 'assets/backup.js' });

  return sandbox;
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log('  PASS  ' + name);
    passed++;
  } catch (err) {
    console.log('  FAIL  ' + name);
    console.log('        ' + (err && err.stack || err.message || err));
    failed++;
  }
}

(async () => {
  // ------------------------------------------------------------------------
  // STEP 1 — Build the source sandbox + export. The sentinel arrives in the
  // manifest via getAllTherapistSettings() which the export side already
  // calls. No code-under-test changes on the export path for CR-02.
  // ------------------------------------------------------------------------

  const sourceMock = createSentinelAwareMock({
    clients: SOURCE_CLIENTS,
    sessions: SOURCE_SESSIONS,
    therapistSettings: SOURCE_THERAPIST_SETTINGS,
    snippets: SOURCE_SNIPPETS,
  });

  const sandboxSrc = buildSandbox(sourceMock);
  const BMsrc = sandboxSrc.window.BackupManager;
  assert.ok(BMsrc && typeof BMsrc.exportBackup === 'function',
    'BackupManager.exportBackup must be exposed');

  const exportResult = await BMsrc.exportBackup();
  assert.ok(exportResult && exportResult.blob,
    'exportBackup must return { blob } — got: ' + JSON.stringify(exportResult));

  // ------------------------------------------------------------------------
  // STEP 2 — Build fresh dest sandbox + import. The dest mock starts empty.
  // ------------------------------------------------------------------------

  const destMock = createSentinelAwareMock();
  const sandboxDst = buildSandbox(destMock);
  const BMdst = sandboxDst.window.BackupManager;

  const importFile = new File([exportResult.blob], exportResult.filename,
    { type: 'application/zip' });

  await test('importBackup(file) resolves without throwing', async () => {
    await BMdst.importBackup(importFile);
  });

  // ------------------------------------------------------------------------
  // STEP 3 — CR-02 assertions
  // ------------------------------------------------------------------------

  const destSentinelWrites = destMock.__calls.get('_writeTherapistSentinel') || [];
  const destSetTherapist = destMock.__calls.get('setTherapistSetting') || [];
  const destUpdateSnippet = destMock.__calls.get('updateSnippet') || [];

  // --- Assertion A: sentinel arrives at the dedicated write path verbatim
  await test('A1 — _writeTherapistSentinel was called exactly once', () => {
    assert.strictEqual(destSentinelWrites.length, 1,
      '_writeTherapistSentinel must be invoked exactly once for the snippetsDeletedSeeds row; ' +
      'got ' + destSentinelWrites.length + ' call(s). Pre-fix this is 0 because ' +
      'ALLOWED_KEYS at backup.js:994 drops the sentinel.');
  });

  await test('A2 — sentinel row carries the source sectionKey + deletedIds verbatim', () => {
    assert.ok(destSentinelWrites.length >= 1,
      'sentinel write must exist before field-level assertions can run');
    const arg0 = destSentinelWrites[0].args[0];
    assert.ok(arg0 && typeof arg0 === 'object',
      '_writeTherapistSentinel must receive an object as first argument; got: ' + JSON.stringify(arg0));
    assert.strictEqual(arg0.sectionKey, 'snippetsDeletedSeeds',
      'sentinel sectionKey must round-trip verbatim');
    assert.ok(Array.isArray(arg0.deletedIds),
      'sentinel deletedIds must be an array; got: ' + JSON.stringify(arg0.deletedIds));
    assert.deepStrictEqual(arg0.deletedIds.slice().sort(),
      ['snippet-seed-001', 'snippet-seed-002'].sort(),
      'deletedIds must equal source verbatim (order-insensitive)');
  });

  await test('A3 — sentinel did NOT flow through setTherapistSetting (no customLabel/enabled coercion)', () => {
    // setTherapistSetting must have been called ONLY for the two real section
    // rows (trapped + heartShield). If the sentinel leaked into it, length
    // would be 3 AND one of the calls would carry sectionKey === 'snippetsDeletedSeeds'.
    assert.strictEqual(destSetTherapist.length, 2,
      'setTherapistSetting must be called once per non-sentinel section row (2 expected); got ' +
      destSetTherapist.length);
    destSetTherapist.forEach(function (call) {
      assert.notStrictEqual(call.args[0] && call.args[0].sectionKey, 'snippetsDeletedSeeds',
        'sentinel must NOT be routed through setTherapistSetting (it would coerce shape)');
    });
  });

  // --- Assertion B: the survival check — synthetic seedSnippetsIfNeeded run
  // The real seedSnippetsIfNeeded reads from IDB; here we simulate the same
  // logic against the recorded sentinel + recorded snippet writes. If A1/A2
  // passed, this MUST hold; we still encode it explicitly so a future refactor
  // that, say, normalised deletedIds into wrong shape gets caught.
  await test('B — after restore, deleted seeds stay deleted (simulated seedSnippetsIfNeeded)', () => {
    assert.ok(destSentinelWrites.length >= 1,
      'pre-req: sentinel write must exist');
    const sentinel = destSentinelWrites[0].args[0];
    const deletedSet = new Set(sentinel.deletedIds || []);

    // The snippet writes that the importBackup loop emitted (only the source
    // survivors — snippet-seed-003 + snippet-seed-004).
    const restoredIds = destUpdateSnippet.map(function (c) {
      return c.args[0] && c.args[0].id;
    });

    // Simulate the seedSnippetsIfNeeded pass: for each "seed" id in the
    // canonical seed pack, skip if it's already in the store OR in
    // deletedSet. Here we use the source deletion preference as the seed
    // pack universe (snippet-seed-001..004).
    const seedPack = ['snippet-seed-001', 'snippet-seed-002',
                      'snippet-seed-003', 'snippet-seed-004'];
    const restoredSet = new Set(restoredIds);
    const wouldReseed = seedPack.filter(function (id) {
      return !restoredSet.has(id) && !deletedSet.has(id);
    });

    assert.deepStrictEqual(wouldReseed, [],
      'simulated seedSnippetsIfNeeded must NOT re-introduce any deleted seeds; ' +
      'would re-seed: ' + JSON.stringify(wouldReseed));

    // And explicit positive check — the deleted snippets must NOT appear in
    // the restored set either.
    ['snippet-seed-001', 'snippet-seed-002'].forEach(function (id) {
      assert.ok(!restoredSet.has(id),
        'deleted seed ' + id + ' must NOT be present after restore; was restored');
    });
  });

  // --- Assertion C: sentinel write happened BEFORE the snippet-restore loop.
  await test('C — sentinel write sequence precedes first snippet write', () => {
    assert.ok(destSentinelWrites.length >= 1,
      'pre-req: sentinel write must exist');
    assert.ok(destUpdateSnippet.length >= 1,
      'pre-req: snippet writes must exist');
    const sentinelSeq = destSentinelWrites[0].seq;
    const firstSnippetSeq = destUpdateSnippet[0].seq;
    assert.ok(sentinelSeq < firstSnippetSeq,
      'sentinel write seq (' + sentinelSeq + ') must precede first snippet write seq (' +
      firstSnippetSeq + '). If this fails, seedSnippetsIfNeeded called during the ' +
      'snippet-restore phase would see an empty deleted-ids set and re-seed the ' +
      'deleted snippets.');
  });

  console.log('');
  console.log('Plan 25-10 sentinel-roundtrip tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => {
  console.error('FATAL test harness error:', err && err.stack || err);
  process.exit(1);
});
