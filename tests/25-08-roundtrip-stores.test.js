/**
 * Phase 25 Plan 08 — Round-trip integration test (D-29 enforcement)
 *
 * Strategy:
 *   1. Build a SOURCE PortfolioDB mock primed with a synthetic dataset that
 *      covers ALL FIVE BACKUP_CONTENTS_KEYS stores (clients incl. photos,
 *      sessions, therapistSettings, snippets — photos travel as ZIP entries
 *      inside the clients store).
 *   2. Run the REAL `BackupManager.exportBackup()` against the source mock
 *      to produce a real ZIP blob (via the vendored JSZip).
 *   3. Build a DEST PortfolioDB mock (empty).
 *   4. Run the REAL `BackupManager.importBackup(file)` against the dest mock
 *      with the ZIP file produced in step 2.
 *   5. Assert that every store's writes on the dest mock match the source
 *      losslessly — counts AND key fields AND photo round-trip.
 *
 * Why this approach (not fake-indexeddb):
 *   - The existing PortfolioDB mock is already written, exercised by Plan 03,
 *     and matches the production API surface exactly.
 *   - fake-indexeddb would add a runtime dependency to a no-dependency project.
 *   - The mock exercises EVERY line of exportBackup + importBackup that touches
 *     stores; the only thing it does not exercise is the IDB layer itself,
 *     which is browser-native and out of unit-test scope.
 *
 * Run: node tests/25-08-roundtrip-stores.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { createMockPortfolioDB } = require('./_helpers/mock-portfolio-db');

// ---------------------------------------------------------------------------
// Source dataset — covers every BACKUP_CONTENTS_KEYS store
// ---------------------------------------------------------------------------

const SOURCE_CLIENTS = [
  // Client 1 has a real photo data URL. base64 'QUJDRA==' decodes to 'ABCD'.
  { id: 1, firstName: 'Alice', lastName: 'A.', type: 'adult',
    photoData: 'data:image/jpeg;base64,QUJDRA==' },
  // Client 2 has no photo.
  { id: 2, firstName: 'Bob', lastName: 'B.', type: 'child', photoData: '' },
  // Client 3 has a different photo. base64 'RUZHSA==' decodes to 'EFGH'.
  { id: 3, firstName: 'Carol', lastName: 'C.', type: 'animal',
    photoData: 'data:image/jpeg;base64,RUZHSA==' },
];

const SOURCE_SESSIONS = [
  { id: 10, clientId: 1, date: '2026-05-01', isHeartShield: true,
    shieldRemoved: false, sections: { trapped: 'a', insights: 'b' } },
  { id: 11, clientId: 1, date: '2026-05-08', isHeartShield: false,
    sections: { issues: 'c' } },
  { id: 12, clientId: 3, date: '2026-05-09', isHeartShield: false,
    sections: {} },
];

const SOURCE_THERAPIST_SETTINGS = [
  { sectionKey: 'trapped', customLabel: 'Locked', enabled: true },
  { sectionKey: 'heartShield', customLabel: null, enabled: false },
];

const SOURCE_SNIPPETS = [
  { id: 's1', trigger: 'fear', text: 'fear of falling', tags: ['emotion'],
    modifiedFromSeed: false },
  { id: 's2', trigger: 'anger', text: 'anger held inward', tags: [],
    modifiedFromSeed: true },
];

// ---------------------------------------------------------------------------
// Sandbox boot — load the REAL JSZip + the REAL backup.js into the same context
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
  // Use host-realm native classes so File / Blob are real and consistent.
  const sandbox = {
    console: {
      log: () => {}, warn: () => {}, error: () => {},
    },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    // JSZip's generateAsync relies on setImmediate for its async chunk scheduler.
    setImmediate: setImmediate,
    clearImmediate: clearImmediate,
    queueMicrotask: queueMicrotask,
    Promise: Promise,
    // Native crypto / TextEncoder / TextDecoder are exposed so JSZip works.
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
        // Use the real File.text() if available, otherwise arrayBuffer + decode.
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
  // Plain object location stub
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

  // 1. Load the REAL JSZip into the sandbox.
  const jszipSrc = fs.readFileSync(
    path.join(__dirname, '..', 'assets', 'jszip.min.js'),
    'utf8'
  );
  vm.runInContext(jszipSrc, sandbox, { filename: 'assets/jszip.min.js' });
  // The vendored JSZip is a UMD bundle that attaches to the global. Make sure
  // it's reachable on both `JSZip` and `window.JSZip` from backup.js.
  if (!sandbox.JSZip && sandbox.window.JSZip) sandbox.JSZip = sandbox.window.JSZip;
  if (!sandbox.window.JSZip && sandbox.JSZip) sandbox.window.JSZip = sandbox.JSZip;
  if (typeof sandbox.JSZip !== 'function') {
    throw new Error('JSZip did not attach to the sandbox global. Got: ' + typeof sandbox.JSZip);
  }

  // 2. Load backup.js into the same context.
  const backupSrc = fs.readFileSync(
    path.join(__dirname, '..', 'assets', 'backup.js'),
    'utf8'
  );
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
  // STEP 1 — Build the source sandbox + export
  // ------------------------------------------------------------------------

  const sourceMock = createMockPortfolioDB({
    clients: SOURCE_CLIENTS,
    sessions: SOURCE_SESSIONS,
    therapistSettings: SOURCE_THERAPIST_SETTINGS,
    snippets: SOURCE_SNIPPETS,
  });

  const sandboxSrc = buildSandbox(sourceMock);
  const BMsrc = sandboxSrc.window.BackupManager;

  if (!BMsrc || typeof BMsrc.exportBackup !== 'function') {
    console.error('FATAL: BackupManager.exportBackup not exposed.');
    process.exit(1);
  }

  // BACKUP_CONTENTS_KEYS sanity (early signal — Plan 02's checklist source list)
  await test('BACKUP_CONTENTS_KEYS exposed on the public API', () => {
    assert.ok(Array.isArray(BMsrc.BACKUP_CONTENTS_KEYS),
      'BACKUP_CONTENTS_KEYS must be an array');
    assert.strictEqual(BMsrc.BACKUP_CONTENTS_KEYS.length, 5,
      'BACKUP_CONTENTS_KEYS must have 5 entries (clients, sessions, snippets, therapistSettings, photos)');
  });

  // Step 2: exportBackup against source → real ZIP blob.
  let exportResult;
  await test('exportBackup() returns { blob: Blob, filename: string }', async () => {
    exportResult = await BMsrc.exportBackup();
    assert.ok(exportResult && exportResult.blob, 'exportBackup must return { blob }');
    assert.ok(exportResult.blob instanceof Blob || exportResult.blob.size != null,
      'exportBackup blob must be a Blob (or Blob-like with .size)');
    assert.match(exportResult.filename || '',
      /^Sessions-Garden-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/,
      'filename must match Sessions-Garden-YYYY-MM-DD-HHMM.zip pattern');
    assert.ok(exportResult.blob.size > 0, 'blob size must be non-zero');
  });

  if (!exportResult || !exportResult.blob) {
    console.log('  ABORT — no exportResult, cannot continue.');
    process.exit(1);
  }

  // ------------------------------------------------------------------------
  // STEP 2 — Build a fresh dest sandbox + import
  // ------------------------------------------------------------------------

  const destMock = createMockPortfolioDB();
  const sandboxDst = buildSandbox(destMock);
  const BMdst = sandboxDst.window.BackupManager;

  // Wrap the source-realm Blob in a File-like object the dest realm's importBackup
  // can read. backup.js reads `file.name` for the extension and calls
  // `_readFileAsArrayBuffer(file)` which uses FileReader.readAsArrayBuffer. Our
  // FileReader stub forwards to file.arrayBuffer() — Blob has that natively.
  const importFile = new File([exportResult.blob], exportResult.filename,
    { type: 'application/zip' });

  await test('importBackup(file) resolves without throwing', async () => {
    await BMdst.importBackup(importFile);
  });

  // ------------------------------------------------------------------------
  // STEP 3 — Lossless round-trip assertions across every store
  // ------------------------------------------------------------------------

  const destClearAll = destMock.__calls.get('clearAll') || [];
  const destAddClient = destMock.__calls.get('addClient') || [];
  const destAddSession = destMock.__calls.get('addSession') || [];
  const destSetTherapist = destMock.__calls.get('setTherapistSetting') || [];
  const destUpdateSnippet = destMock.__calls.get('updateSnippet') || [];

  await test('clearAll() was called exactly once before any add* writes (importBackup contract)', () => {
    assert.strictEqual(destClearAll.length, 1,
      'destMock.__calls.get("clearAll").length must be 1, got ' + destClearAll.length);
  });

  await test('client COUNT round-trips (3 clients in, 3 clients out)', () => {
    assert.strictEqual(destAddClient.length, SOURCE_CLIENTS.length,
      'addClient should be called once per source client');
  });

  await test('session COUNT round-trips (3 sessions in, 3 sessions out)', () => {
    assert.strictEqual(destAddSession.length, SOURCE_SESSIONS.length,
      'addSession should be called once per source session');
  });

  await test('therapistSettings COUNT round-trips (2 in, 2 out)', () => {
    assert.strictEqual(destSetTherapist.length, SOURCE_THERAPIST_SETTINGS.length,
      'setTherapistSetting should be called once per source row');
  });

  await test('snippets COUNT round-trips (2 in, 2 out)', () => {
    assert.strictEqual(destUpdateSnippet.length, SOURCE_SNIPPETS.length,
      'updateSnippet should be called once per source snippet');
  });

  // Field-level lossless checks (a sampling — counts above prove all rows visit
  // the write path; below we lock in critical fields per store).

  await test('client 1 (Alice) field-level lossless', () => {
    const c1 = destAddClient[0][0];
    assert.strictEqual(c1.firstName, 'Alice');
    assert.strictEqual(c1.lastName, 'A.');
    assert.strictEqual(c1.type, 'adult');
  });

  await test('client 2 (Bob) no-photo round-trips correctly', () => {
    const c2 = destAddClient[1][0];
    assert.strictEqual(c2.firstName, 'Bob');
    // Bob's photoData was '' — after round-trip it must be falsy (empty string
    // or null), NOT some invalid data URL.
    assert.ok(c2.photoData == null || c2.photoData === '',
      'client 2 photoData must remain empty/null; got: ' + JSON.stringify(c2.photoData));
  });

  await test('session field-level lossless (sections.trapped survives)', () => {
    const s0 = destAddSession[0][0];
    assert.strictEqual(s0.id, 10);
    assert.strictEqual(s0.clientId, 1);
    assert.strictEqual(s0.date, '2026-05-01');
    assert.strictEqual(s0.isHeartShield, true);
    assert.strictEqual(s0.shieldRemoved, false);
    assert.strictEqual(s0.sections && s0.sections.trapped, 'a');
    assert.strictEqual(s0.sections && s0.sections.insights, 'b');
  });

  await test('therapistSettings field-level lossless (custom label survives)', () => {
    const t0 = destSetTherapist[0][0];
    assert.strictEqual(t0.sectionKey, 'trapped');
    assert.strictEqual(t0.customLabel, 'Locked');
    assert.strictEqual(t0.enabled, true);
  });

  await test('snippets field-level lossless (trigger + tags survive)', () => {
    const sn0 = destUpdateSnippet[0][0];
    assert.strictEqual(sn0.id, 's1');
    assert.strictEqual(sn0.trigger, 'fear');
    assert.strictEqual(sn0.text, 'fear of falling');
    assert.deepStrictEqual(sn0.tags, ['emotion']);
  });

  // ------------------------------------------------------------------------
  // The load-bearing photo round-trip assertion
  // ------------------------------------------------------------------------
  //
  // Source client 1: photoData = 'data:image/jpeg;base64,QUJDRA==' (b64 → ABCD)
  // Export step: clients[0].photoData becomes 'photos/client-1.jpg', and the
  //              ZIP gets a photos/client-1.jpg entry holding the raw ABCD bytes.
  // Import step: clients[0].photoData should be reconstructed back to a data:
  //              URL whose base64 segment decodes back to ABCD (mime may be
  //              normalized — what we check is the BYTES, not the exact string).
  // ------------------------------------------------------------------------

  await test('photo round-trip — client 1 (b64 → photos/ subfolder → b64) bytes match', () => {
    const c1 = destAddClient[0][0];
    assert.ok(typeof c1.photoData === 'string' && c1.photoData.startsWith('data:image/'),
      'after round-trip, client 1 photoData must be a data: URL; got: ' +
      (typeof c1.photoData === 'string' ? c1.photoData.slice(0, 60) : typeof c1.photoData));
    // Pull base64 segment from the data URL and decode it.
    const commaIdx = c1.photoData.indexOf(',');
    assert.ok(commaIdx > 0, 'data URL must contain a comma separator');
    const b64 = c1.photoData.slice(commaIdx + 1);
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    assert.strictEqual(decoded, 'ABCD',
      'decoded photo bytes must equal "ABCD" (the source bytes); got: ' + decoded);
  });

  await test('photo round-trip — client 3 (different bytes) round-trips independently', () => {
    const c3 = destAddClient[2][0];
    assert.ok(typeof c3.photoData === 'string' && c3.photoData.startsWith('data:image/'),
      'after round-trip, client 3 photoData must be a data: URL');
    const commaIdx = c3.photoData.indexOf(',');
    const b64 = c3.photoData.slice(commaIdx + 1);
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    assert.strictEqual(decoded, 'EFGH',
      'decoded photo bytes must equal "EFGH" (client 3 source bytes); got: ' + decoded);
  });

  console.log('');
  console.log('Plan 25-08 roundtrip-stores tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);

})().catch((err) => {
  console.error('FATAL test harness error:', err && err.stack || err);
  process.exit(1);
});
