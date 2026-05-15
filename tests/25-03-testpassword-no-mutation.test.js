/**
 * Phase 25 Plan 03 — testBackupPassword MUST NOT mutate IndexedDB or localStorage.
 *
 * Load-bearing assertion for T-25-03-01 (D-12's safety promise):
 * the user's data is NEVER touched by a dry-run password test, even on the
 * happy path where decryption + manifest parsing succeed.
 *
 * Sandbox boots assets/backup.js in a vm context with:
 *   - A spy-instrumented PortfolioDB mock (tests/_helpers/mock-portfolio-db.js)
 *   - A Map-backed localStorage mock whose setItem records every call
 *   - A crypto.subtle.decrypt stub that succeeds (returns plaintext ArrayBuffer)
 *   - A JSZip stub whose .loadAsync resolves to a fake zip with backup.json
 *   - A File-like blob whose first 4 bytes match SGBACKUP_MAGIC ("SG01")
 *
 * Asserts:
 *   1. testBackupPassword resolves with { ok: true, clientCount: number, sessionCount: number }
 *   2. assertNoWrites(mockDb) holds — none of clearAll / addClient / addSession /
 *      setTherapistSetting / updateSnippet were called
 *   3. No localStorage.setItem call landed on a key matching /^portfolio/
 *
 * Run: node tests/25-03-testpassword-no-mutation.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { createMockPortfolioDB, assertNoWrites } = require('./_helpers/mock-portfolio-db');

// ---------------------------------------------------------------------------
// Build the sandbox and stubs
// ---------------------------------------------------------------------------

const SGBACKUP_MAGIC = new Uint8Array([0x53, 0x47, 0x30, 0x31]); // "SG01"

/**
 * Build a minimal File-like object whose .arrayBuffer() returns a Uint8Array
 * starting with SGBACKUP_MAGIC. The remaining bytes are arbitrary — the
 * decrypt stub will not actually use them.
 */
function makeFakeSgbackupFile(name) {
  const buf = new Uint8Array(64);
  buf.set(SGBACKUP_MAGIC, 0);
  // Fill the rest with predictable filler bytes (salt[16] + iv[12] + ciphertext)
  for (let i = SGBACKUP_MAGIC.length; i < buf.length; i++) buf[i] = i;
  return {
    name: name || 'test.sgbackup',
    arrayBuffer: function () { return Promise.resolve(buf.buffer.slice(0)); },
  };
}

/**
 * JSZip.loadAsync stub — returns a fake zip whose .file('backup.json') returns
 * an entry whose .async('string') yields the manifest JSON we configure here.
 */
function makeJSZipStub(manifestObj) {
  function FakeZip(manifest) {
    this._manifest = manifest;
  }
  FakeZip.prototype.file = function (name) {
    if (name !== 'backup.json') return null;
    const text = JSON.stringify(this._manifest);
    return {
      async: function (type) {
        if (type === 'string') return Promise.resolve(text);
        return Promise.resolve(text);
      },
    };
  };
  return {
    loadAsync: function (_buffer) {
      return Promise.resolve(new FakeZip(manifestObj));
    },
  };
}

function makeLocalStorageMock() {
  const map = new Map();
  const calls = { setItem: [], removeItem: [], clear: [] };
  return {
    getItem: function (k) { return map.has(k) ? map.get(k) : null; },
    setItem: function (k, v) {
      calls.setItem.push({ key: k, value: String(v) });
      map.set(k, String(v));
    },
    removeItem: function (k) {
      calls.removeItem.push(k);
      map.delete(k);
    },
    clear: function () { calls.clear.push(true); map.clear(); },
    __calls: calls,
    __map: map,
  };
}

/**
 * crypto.subtle.decrypt stub — succeeds and returns an ArrayBuffer matching
 * the plaintext we want JSZip.loadAsync (also stubbed) to "see".
 */
function makeSuccessCryptoStub() {
  return {
    subtle: {
      importKey: function () { return Promise.resolve({ __key: true }); },
      deriveKey: function () { return Promise.resolve({ __key: true }); },
      decrypt: function (_algo, _key, _ciphertext) {
        // Return an arbitrary ArrayBuffer — the JSZip stub does not parse it.
        return Promise.resolve(new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer);
      },
    },
    getRandomValues: function (arr) {
      for (let i = 0; i < arr.length; i++) arr[i] = i & 0xff;
      return arr;
    },
  };
}

function buildSandbox(opts) {
  opts = opts || {};
  const localStorageMock = makeLocalStorageMock();
  const mockDb = createMockPortfolioDB({
    clients: opts.clients || [],
    sessions: opts.sessions || [],
  });
  const sandbox = {
    console: { log: function () {}, warn: function () {}, error: function () {} },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Promise: Promise,
    Uint8Array: Uint8Array,
    Blob: typeof Blob !== 'undefined' ? Blob : function (parts, opts) {
      // Minimal Blob shim: stores parts and exposes arrayBuffer/type
      this._parts = parts;
      this.type = (opts && opts.type) || '';
      this.size = (parts && parts[0] && parts[0].byteLength) || 0;
      const self = this;
      this.arrayBuffer = function () {
        const p = self._parts && self._parts[0];
        if (p && p.buffer) return Promise.resolve(p.buffer.slice(0));
        if (p instanceof ArrayBuffer) return Promise.resolve(p.slice(0));
        return Promise.resolve(new ArrayBuffer(0));
      };
    },
    File: typeof File !== 'undefined' ? File : function (parts, name, opts) {
      this._parts = parts;
      this.name = name;
      this.type = (opts && opts.type) || '';
    },
    ArrayBuffer: ArrayBuffer,
    TextEncoder: typeof TextEncoder !== 'undefined' ? TextEncoder : require('util').TextEncoder,
    URL: { createObjectURL: function () { return 'blob:stub'; }, revokeObjectURL: function () {} },
    FileReader: function () {},
    document: {
      addEventListener: function () {},
      removeEventListener: function () {},
      createElement: function () { return { setAttribute: function () {}, appendChild: function () {}, click: function () {}, style: {}, classList: { add: function () {}, remove: function () {} } }; },
      body: { appendChild: function () {}, removeChild: function () {} },
    },
    navigator: { share: undefined, canShare: undefined },
    crypto: opts.crypto || makeSuccessCryptoStub(),
    JSZip: opts.JSZip || makeJSZipStub({
      version: 3,
      exportedAt: '2026-05-15T12:00:00.000Z',
      clients: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
      sessions: [{ id: 1 }, { id: 2 }, { id: 3 }],
      therapistSettings: [],
      snippets: [],
    }),
    localStorage: localStorageMock,
    window: {},
  };
  sandbox.window.PortfolioDB = mockDb;
  sandbox.window.localStorage = localStorageMock;
  sandbox.window.JSZip = sandbox.JSZip;
  sandbox.window.crypto = sandbox.crypto;
  vm.createContext(sandbox);

  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'backup.js'), 'utf8');
  vm.runInContext(src, sandbox, { filename: 'assets/backup.js' });

  return { sandbox, mockDb, localStorageMock };
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
    console.log('        ' + (err && err.message || err));
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

(async () => {

await test('Happy path: testBackupPassword resolves { ok: true, clientCount, sessionCount }', async () => {
  const { sandbox } = buildSandbox({
    clients: [],
    sessions: [],
  });
  const BM = sandbox.window.BackupManager;
  assert.strictEqual(typeof BM.testBackupPassword, 'function',
    'BackupManager.testBackupPassword must be a function on the public API');
  const file = makeFakeSgbackupFile('verify.sgbackup');
  const result = await BM.testBackupPassword(file, 'correct-passphrase');
  assert.strictEqual(result.ok, true, 'result.ok must be true on success');
  assert.strictEqual(typeof result.clientCount, 'number', 'clientCount must be a number');
  assert.strictEqual(typeof result.sessionCount, 'number', 'sessionCount must be a number');
  assert.strictEqual(result.clientCount, 2, 'clientCount must reflect manifest.clients.length');
  assert.strictEqual(result.sessionCount, 3, 'sessionCount must reflect manifest.sessions.length');
  assert.strictEqual(result.exportedAt, '2026-05-15T12:00:00.000Z',
    'exportedAt must echo manifest.exportedAt');
});

await test('NO PortfolioDB write methods are called during a successful dry-run', async () => {
  const { sandbox, mockDb } = buildSandbox();
  const BM = sandbox.window.BackupManager;
  const file = makeFakeSgbackupFile('verify.sgbackup');
  await BM.testBackupPassword(file, 'correct-passphrase');
  // Will throw if any of clearAll / addClient / addSession /
  // setTherapistSetting / updateSnippet fired.
  assertNoWrites(mockDb);
});

await test('NO localStorage.setItem call lands on a portfolio* key during a dry-run', async () => {
  const { sandbox, localStorageMock } = buildSandbox();
  const BM = sandbox.window.BackupManager;
  const file = makeFakeSgbackupFile('verify.sgbackup');
  await BM.testBackupPassword(file, 'correct-passphrase');
  const offendingCalls = localStorageMock.__calls.setItem.filter(function (c) {
    return /^portfolio/.test(c.key);
  });
  assert.strictEqual(offendingCalls.length, 0,
    'testBackupPassword wrote to localStorage portfolio* key(s): ' +
    JSON.stringify(offendingCalls));
});

console.log('');
console.log('Plan 25-03 testpassword-no-mutation tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);

})().catch((err) => {
  console.error('FATAL test harness error:', err);
  process.exit(1);
});
