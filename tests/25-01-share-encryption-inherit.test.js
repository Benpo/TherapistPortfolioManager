/**
 * Phase 25 Plan 01 — Behaviour test: shareBackup MUST inherit the
 * encryption choice made by the caller (D-04, T-25-01-01).
 *
 * Concretely: shareBackup(blob, filename) MUST NOT call exportBackup()
 * or exportEncryptedBackup() internally. The blob it shares MUST be the
 * exact reference passed in by the caller.
 *
 * This is the closure of the original `sendToMyself` security regression:
 * the doomed implementation called `exportBackup()` directly which bypassed
 * the encrypt/skip-encryption modal. Plan 01 hard-codes the inversion by
 * passing the blob in from the outside; this test enforces that contract.
 *
 * Run: node tests/25-01-share-encryption-inherit.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { createShareMock } = require('./_helpers/mock-navigator-share');

function makeLocalStorage() {
  const map = new Map();
  return {
    getItem: function (k) { return map.has(String(k)) ? map.get(String(k)) : null; },
    setItem: function (k, v) { map.set(String(k), String(v)); },
    removeItem: function (k) { map.delete(String(k)); },
    clear: function () { map.clear(); },
  };
}

function makeDoc() {
  return {
    createElement: function () {
      return {
        href: '', download: '', style: {},
        setAttribute: function () {}, appendChild: function () {},
        click: function () {}, addEventListener: function () {},
        classList: { add: function () {}, remove: function () {} },
      };
    },
    body: { appendChild: function () {}, removeChild: function () {} },
    head: { appendChild: function () {} },
    addEventListener: function () {},
    removeEventListener: function () {},
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
  };
}

// Capture share mock — canShare returns true so the Web Share path is taken.
const shareMock = createShareMock({ canShareReturns: true, shareReturns: Promise.resolve() });

const sandbox = {
  console: { log: function () {}, warn: function () {}, error: function () {} },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Promise: Promise,
  localStorage: makeLocalStorage(),
  crypto: { subtle: {}, getRandomValues: function (a) { return a; } },
  JSZip: function () { return { folder: function () { return { file: function () {} }; }, file: function () {}, generateAsync: function () { return Promise.resolve(new sandbox.Blob([])); } }; },
  Blob: function (parts, opts) { this.parts = parts; this.type = (opts && opts.type) || ''; this.size = (parts && parts[0] && (parts[0].length || parts[0].byteLength)) || 0; },
  File: function (parts, name, opts) { this.parts = parts; this.name = name; this.type = (opts && opts.type) || ''; this.size = (parts && parts[0] && (parts[0].length || parts[0].byteLength)) || 0; },
  URL: { createObjectURL: function () { return 'blob:mock'; }, revokeObjectURL: function () {} },
  document: makeDoc(),
};

sandbox.window = {
  document: sandbox.document,
  localStorage: sandbox.localStorage,
  crypto: sandbox.crypto,
  Blob: sandbox.Blob,
  File: sandbox.File,
  URL: sandbox.URL,
  setTimeout: sandbox.setTimeout,
  PortfolioDB: {},
  App: undefined,
  JSZip: sandbox.JSZip,
};

const locationObj = {};
let lastHref = '';
Object.defineProperty(locationObj, 'href', {
  get: function () { return lastHref; },
  set: function (v) { lastHref = String(v); },
  configurable: true,
  enumerable: true,
});
sandbox.window.location = locationObj;
sandbox.location = locationObj;

sandbox.navigator = {
  canShare: shareMock.canShare,
  share: shareMock.share,
};
sandbox.window.navigator = sandbox.navigator;

vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'backup.js'), 'utf8');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/backup.js' });
} catch (err) {
  console.error('FATAL: assets/backup.js failed to load in vm sandbox.');
  console.error('       ' + (err && err.stack || err.message || err));
  process.exit(1);
}

const BM = sandbox.window.BackupManager;
if (!BM || typeof BM.shareBackup !== 'function') {
  console.error('FAIL: BackupManager.shareBackup not exposed.');
  process.exit(1);
}

// Replace exportBackup and exportEncryptedBackup with throwing stubs that
// also record call attempts. The contract is that shareBackup MUST NOT
// invoke either of these — if it does, the test fails loudly.
const exportCalls = [];
BM.exportBackup = function () {
  exportCalls.push('exportBackup');
  throw new Error('VIOLATION: shareBackup called exportBackup() — D-04 encryption-inheritance contract broken');
};
BM.exportEncryptedBackup = function () {
  exportCalls.push('exportEncryptedBackup');
  throw new Error('VIOLATION: shareBackup called exportEncryptedBackup() — D-04 encryption-inheritance contract broken');
};

// Spy on triggerDownload — should NOT be called when share() succeeds.
const triggerCalls = [];
BM.triggerDownload = function (blob, filename) {
  triggerCalls.push({ blob: blob, filename: filename });
};

let passed = 0;
let failed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(function () {
      console.log('  PASS  ' + name);
      passed++;
    })
    .catch(function (err) {
      console.log('  FAIL  ' + name);
      console.log('        ' + (err && err.message || err));
      failed++;
    });
}

(async function run() {
  const precomputedBlob = new sandbox.Blob([new Uint8Array([9, 9, 9, 9])], { type: 'application/octet-stream' });
  const precomputedFilename = 'precomputed.sgbackup';

  let threw = false;
  try {
    await BM.shareBackup(precomputedBlob, precomputedFilename);
  } catch (err) {
    threw = true;
    // If shareBackup itself called the throwing stubs, that's the bug we
    // want to surface — propagate to the test below.
    console.log('  NOTE  shareBackup threw: ' + (err && err.message || err));
  }

  await test('shareBackup did NOT throw (did not call exportBackup/exportEncryptedBackup internally)', function () {
    if (threw) {
      throw new Error('shareBackup threw — likely called one of the export functions. Calls observed: ' + JSON.stringify(exportCalls));
    }
  });

  await test('Neither exportBackup NOR exportEncryptedBackup was called by shareBackup', function () {
    if (exportCalls.length !== 0) {
      throw new Error('D-04 violation: shareBackup called ' + JSON.stringify(exportCalls));
    }
  });

  await test('navigator.share was called exactly once', function () {
    if (shareMock.calls.length !== 1) {
      throw new Error('expected 1 navigator.share call, got ' + shareMock.calls.length);
    }
  });

  await test('navigator.share files[0].name === "precomputed.sgbackup" (filename round-trips)', function () {
    if (shareMock.calls.length === 0) throw new Error('no share() call recorded');
    const f0 = shareMock.calls[0].files[0];
    if (!f0 || f0.name !== precomputedFilename) {
      throw new Error('expected files[0].name = "' + precomputedFilename + '", got ' + JSON.stringify(f0));
    }
  });

  await test('triggerDownload was NOT called (success path, not fallback)', function () {
    if (triggerCalls.length !== 0) {
      throw new Error('triggerDownload was called ' + triggerCalls.length + ' time(s) on the success path');
    }
  });

  console.log('');
  console.log('Plan 25-01 share-encryption-inherit tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
