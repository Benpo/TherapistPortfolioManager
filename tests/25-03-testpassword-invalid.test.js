/**
 * Phase 25 Plan 03 — testBackupPassword corrupt/non-.sgbackup file rejection paths.
 *
 * Three sub-cases:
 *
 *   A) File extension is NOT .sgbackup (e.g., .zip) → reject with
 *      backup.testPassword.notEncrypted. Decryption MUST NOT be attempted —
 *      the early-extension check is the V5 input-validation defense (T-25-03-04).
 *
 *   B) File extension IS .sgbackup but the magic bytes do NOT match
 *      SGBACKUP_MAGIC. _decryptBlob returns null. testBackupPassword treats
 *      this as backup.testPassword.invalid.
 *
 *   C) Decryption succeeds but JSZip.loadAsync returns a zip with NO
 *      backup.json entry. testBackupPassword rejects with
 *      backup.testPassword.invalid.
 *
 * Every sub-case asserts assertNoWrites(mockDb).
 *
 * Run: node tests/25-03-testpassword-invalid.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { createMockPortfolioDB, assertNoWrites } = require('./_helpers/mock-portfolio-db');

const SGBACKUP_MAGIC = new Uint8Array([0x53, 0x47, 0x30, 0x31]); // "SG01"

const NOT_ENCRYPTED_EN_FALLBACK =
  "This file isn't an encrypted backup, so no password is needed. You can import it directly from the Import section.";
const NOT_ENCRYPTED_KEY = 'backup.testPassword.notEncrypted';

const INVALID_EN_FALLBACK =
  "This file isn't a valid Sessions Garden backup. Try a different file.";
const INVALID_KEY = 'backup.testPassword.invalid';

function makeFile(name, firstByte) {
  // firstByte=true → magic bytes; firstByte=false → random non-magic prefix
  const buf = new Uint8Array(64);
  if (firstByte) {
    buf.set(SGBACKUP_MAGIC, 0);
  } else {
    buf.set(new Uint8Array([0xff, 0xff, 0xff, 0xff]), 0);
  }
  for (let i = 4; i < buf.length; i++) buf[i] = i;
  return {
    name: name,
    arrayBuffer: function () { return Promise.resolve(buf.buffer.slice(0)); },
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

function makeSuccessCryptoStub() {
  return {
    subtle: {
      importKey: function () { return Promise.resolve({ __key: true }); },
      deriveKey: function () { return Promise.resolve({ __key: true }); },
      decrypt: function () {
        return Promise.resolve(new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer);
      },
    },
    getRandomValues: function (arr) {
      for (let i = 0; i < arr.length; i++) arr[i] = i & 0xff;
      return arr;
    },
  };
}

/**
 * JSZip stub that returns a zip WITHOUT backup.json.
 * file('backup.json') → null  (matches the real JSZip API).
 */
function makeEmptyJSZipStub() {
  return {
    loadAsync: function () {
      return Promise.resolve({
        file: function (_name) { return null; },
      });
    },
  };
}

/**
 * JSZip stub for sub-case A — must NEVER be called because the .zip
 * file extension is rejected BEFORE _decryptBlob runs.
 */
function makeJSZipNeverCalled() {
  return {
    loadAsync: function () {
      return Promise.reject(new Error('JSZip.loadAsync must NOT run when file extension is not .sgbackup'));
    },
  };
}

function buildSandbox(opts) {
  opts = opts || {};
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
    crypto: opts.crypto || makeSuccessCryptoStub(),
    JSZip: opts.JSZip || makeEmptyJSZipStub(),
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

function assertRejectMessage(err, acceptableKey, acceptableFallback, label) {
  assert.ok(err, label + ': expected reject but got resolve');
  // Note: `instanceof Error` is unreliable across vm realms — backup.js runs in
  // its own context. We duck-type on the .message string instead.
  assert.strictEqual(typeof err.message, 'string', label + ': rejection must expose a .message string');
  const msg = err.message || '';
  const ok = (msg === acceptableKey) || (msg === acceptableFallback);
  assert.ok(ok,
    label + ': rejection message must equal "' + acceptableKey + '" or "' +
    acceptableFallback + '"; got "' + msg + '"');
}

(async () => {

await test('A: .zip file rejects with backup.testPassword.notEncrypted', async () => {
  const { sandbox, mockDb } = buildSandbox({ JSZip: makeJSZipNeverCalled() });
  const BM = sandbox.window.BackupManager;
  const file = makeFile('innocent.zip', true);  // magic bytes do not matter — extension check fires first
  let caught = null;
  try {
    await BM.testBackupPassword(file, 'any-password');
  } catch (err) { caught = err; }
  assertRejectMessage(caught, NOT_ENCRYPTED_KEY, NOT_ENCRYPTED_EN_FALLBACK, 'A');
  assertNoWrites(mockDb);
});

await test('A.2: .json file rejects with backup.testPassword.notEncrypted', async () => {
  const { sandbox, mockDb } = buildSandbox({ JSZip: makeJSZipNeverCalled() });
  const BM = sandbox.window.BackupManager;
  const file = makeFile('legacy.json', true);
  let caught = null;
  try {
    await BM.testBackupPassword(file, 'any');
  } catch (err) { caught = err; }
  assertRejectMessage(caught, NOT_ENCRYPTED_KEY, NOT_ENCRYPTED_EN_FALLBACK, 'A.2');
  assertNoWrites(mockDb);
});

await test('B: .sgbackup with bad magic bytes rejects with backup.testPassword.invalid', async () => {
  // _decryptBlob returns null when magic does not match → testBackupPassword
  // converts that null to backup.testPassword.invalid.
  const { sandbox, mockDb } = buildSandbox({ JSZip: makeJSZipNeverCalled() });
  const BM = sandbox.window.BackupManager;
  const file = makeFile('fake.sgbackup', false);  // magic bytes deliberately invalid
  let caught = null;
  try {
    await BM.testBackupPassword(file, 'any-password');
  } catch (err) { caught = err; }
  assertRejectMessage(caught, INVALID_KEY, INVALID_EN_FALLBACK, 'B');
  assertNoWrites(mockDb);
});

await test('C: decrypts successfully but ZIP has no backup.json → backup.testPassword.invalid', async () => {
  const { sandbox, mockDb } = buildSandbox({
    crypto: makeSuccessCryptoStub(),
    JSZip: makeEmptyJSZipStub(),
  });
  const BM = sandbox.window.BackupManager;
  const file = makeFile('valid-magic.sgbackup', true);
  let caught = null;
  try {
    await BM.testBackupPassword(file, 'right-password');
  } catch (err) { caught = err; }
  assertRejectMessage(caught, INVALID_KEY, INVALID_EN_FALLBACK, 'C');
  assertNoWrites(mockDb);
});

await test('D: empty/null file argument rejects with backup.testPassword.invalid', async () => {
  const { sandbox, mockDb } = buildSandbox({ JSZip: makeJSZipNeverCalled() });
  const BM = sandbox.window.BackupManager;
  let caught = null;
  try {
    await BM.testBackupPassword(null, 'any');
  } catch (err) { caught = err; }
  assertRejectMessage(caught, INVALID_KEY, INVALID_EN_FALLBACK, 'D');
  assertNoWrites(mockDb);
});

console.log('');
console.log('Plan 25-03 testpassword-invalid tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);

})().catch((err) => {
  console.error('FATAL test harness error:', err);
  process.exit(1);
});
