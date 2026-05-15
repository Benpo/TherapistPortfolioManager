/**
 * Phase 25 Plan 03 — testBackupPassword wrong-passphrase rejection path.
 *
 * Asserts:
 *   1. testBackupPassword REJECTS when crypto.subtle.decrypt throws an
 *      OperationError (AES-GCM authentication failure = wrong passphrase).
 *   2. The rejection error.message resolves to backup.testPassword.wrongPassphrase
 *      (either the i18n KEY itself OR the EN fallback "That password didn't ..."
 *      — both are acceptable so the test does not couple to runtime i18n).
 *   3. assertNoWrites(mockDb) holds — wrong-passphrase path MUST NOT touch IDB.
 *
 * Run: node tests/25-03-testpassword-wrong.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { createMockPortfolioDB, assertNoWrites } = require('./_helpers/mock-portfolio-db');

const SGBACKUP_MAGIC = new Uint8Array([0x53, 0x47, 0x30, 0x31]); // "SG01"

const WRONG_PASS_EN_FALLBACK =
  "That password didn't decrypt this file. Double-check the password you used when creating the backup, or try a different file.";
const WRONG_PASS_KEY = 'backup.testPassword.wrongPassphrase';

function makeFakeSgbackupFile(name) {
  const buf = new Uint8Array(64);
  buf.set(SGBACKUP_MAGIC, 0);
  for (let i = SGBACKUP_MAGIC.length; i < buf.length; i++) buf[i] = i;
  return {
    name: name || 'wrong.sgbackup',
    arrayBuffer: function () { return Promise.resolve(buf.buffer.slice(0)); },
  };
}

function makeOperationErrorCryptoStub() {
  return {
    subtle: {
      importKey: function () { return Promise.resolve({ __key: true }); },
      deriveKey: function () { return Promise.resolve({ __key: true }); },
      decrypt: function () {
        // AES-GCM authentication failure shape (matches the existing
        // importBackup branch at backup.js lines 805-810):
        //   { name: 'OperationError' }
        const err = new Error('decrypt failed');
        err.name = 'OperationError';
        return Promise.reject(err);
      },
    },
    getRandomValues: function (arr) {
      for (let i = 0; i < arr.length; i++) arr[i] = i & 0xff;
      return arr;
    },
  };
}

function makeJSZipStubNeverCalled() {
  // Decrypt rejects first, so loadAsync should never be reached. If it is,
  // throwing here surfaces a wiring bug in testBackupPassword.
  return {
    loadAsync: function () {
      return Promise.reject(new Error('JSZip.loadAsync must NOT run when decrypt throws OperationError'));
    },
  };
}

function makeLocalStorageMock() {
  const map = new Map();
  const calls = { setItem: [], removeItem: [], clear: [] };
  return {
    getItem: function (k) { return map.has(k) ? map.get(k) : null; },
    setItem: function (k, v) { calls.setItem.push({ key: k, value: String(v) }); map.set(k, String(v)); },
    removeItem: function (k) { calls.removeItem.push(k); map.delete(k); },
    clear: function () { calls.clear.push(true); map.clear(); },
    __calls: calls,
    __map: map,
  };
}

function buildSandbox() {
  const localStorageMock = makeLocalStorageMock();
  const mockDb = createMockPortfolioDB();
  const sandbox = {
    console: { log: function () {}, warn: function () {}, error: function () {} },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Promise: Promise,
    Uint8Array: Uint8Array,
    ArrayBuffer: ArrayBuffer,
    Blob: typeof Blob !== 'undefined' ? Blob : function () {},
    File: typeof File !== 'undefined' ? File : function () {},
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
    crypto: makeOperationErrorCryptoStub(),
    JSZip: makeJSZipStubNeverCalled(),
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

(async () => {

await test('OperationError → REJECTS with backup.testPassword.wrongPassphrase', async () => {
  const { sandbox } = buildSandbox();
  const BM = sandbox.window.BackupManager;
  assert.strictEqual(typeof BM.testBackupPassword, 'function',
    'BackupManager.testBackupPassword must be a function on the public API');
  const file = makeFakeSgbackupFile('wrong.sgbackup');
  let caught = null;
  try {
    await BM.testBackupPassword(file, 'wrong-passphrase');
  } catch (err) {
    caught = err;
  }
  assert.ok(caught, 'expected testBackupPassword to reject on OperationError');
  assert.ok(caught instanceof Error, 'rejection must be an Error instance');
  const msg = caught.message || '';
  const acceptable = (msg === WRONG_PASS_KEY) || (msg === WRONG_PASS_EN_FALLBACK);
  assert.ok(acceptable,
    'rejection message must equal either the i18n key "' + WRONG_PASS_KEY +
    '" or the EN fallback "' + WRONG_PASS_EN_FALLBACK + '"; got "' + msg + '"');
});

await test('Wrong-passphrase path does NOT mutate IndexedDB', async () => {
  const { sandbox, mockDb } = buildSandbox();
  const BM = sandbox.window.BackupManager;
  const file = makeFakeSgbackupFile('wrong.sgbackup');
  try {
    await BM.testBackupPassword(file, 'wrong-passphrase');
  } catch (_) { /* expected */ }
  assertNoWrites(mockDb);
});

console.log('');
console.log('Plan 25-03 testpassword-wrong tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);

})().catch((err) => {
  console.error('FATAL test harness error:', err);
  process.exit(1);
});
