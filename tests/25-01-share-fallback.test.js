/**
 * Phase 25 Plan 01 — Behaviour test: shareBackup mailto fallback.
 *
 * Behaviour under test (D-02, T-25-01-03):
 *   When navigator.canShare returns false, shareBackup MUST:
 *     1. Call BackupManager.triggerDownload exactly once with (blob, filename)
 *     2. Set window.location.href to a 'mailto:?' URL
 *     3. The decoded mailto body MUST contain the literal filename
 *     4. navigator.share MUST NOT be called
 *
 * This is the load-bearing assertion for honest copy on the fallback path
 * (T-25-01-03 closure — never lie about an attached file).
 *
 * Run: node tests/25-01-share-fallback.test.js
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

// Record every anchor element created — this is how we detect triggerDownload()
// since shareBackup calls the IIFE-scoped triggerDownload (a closure binding
// we can't spy on directly from outside). triggerDownload's only observable
// side effects are: URL.createObjectURL(blob), document.createElement('a'),
// a.href = url, a.download = filename, a.click().
const anchorsCreated = [];

function makeDoc() {
  return {
    createElement: function (tag) {
      var el = {
        tagName: String(tag || '').toUpperCase(),
        href: '', download: '', style: {},
        setAttribute: function () {}, appendChild: function () {},
        click: function () {}, addEventListener: function () {},
        classList: { add: function () {}, remove: function () {} },
      };
      if (el.tagName === 'A') anchorsCreated.push(el);
      return el;
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

// Record every URL.createObjectURL(blob) call so we can verify the blob
// reference flowed through unchanged.
const objectURLBlobs = [];

// Track every navigation assignment so we can assert on the mailto: target.
const navState = { hrefAssignments: [] };

// Capture share mock — canShare returns false to force the mailto fallback.
const shareMock = createShareMock({ canShareReturns: false });

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
  URL: {
    createObjectURL: function (blob) { objectURLBlobs.push(blob); return 'blob:mock'; },
    revokeObjectURL: function () {},
  },
  document: makeDoc(),
};

sandbox.window = {
  // location is what backup.js sets `window.location.href = ...` on.
  // Define `location` as an object whose `href` setter records assignments.
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

// Define a settable location.href on window — backup.js code uses
// `window.location.href = 'mailto:...'` AND the bare `location.href` form.
const locationObj = {};
Object.defineProperty(locationObj, 'href', {
  get: function () { return ''; },
  set: function (v) { navState.hrefAssignments.push(String(v)); },
  configurable: true,
  enumerable: true,
});
sandbox.window.location = locationObj;
sandbox.location = locationObj;

// navigator with our canShare/share mock.
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

// NOTE: triggerDownload is an IIFE-scoped closure binding inside backup.js,
// not the same function as BackupManager.triggerDownload (which is just a
// reference exported on the public API). We therefore cannot spy on it by
// reassigning BM.triggerDownload — instead we observe its side effects:
//   - URL.createObjectURL(blob) is called with the blob argument
//   - document.createElement('a') is called and the anchor's `.download`
//     property is assigned to the filename
//   - localStorage.portfolioLastExport is updated
// These three together are the load-bearing proof that triggerDownload ran.

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
  const testBlob = new sandbox.Blob([new Uint8Array([1, 2, 3])], { type: 'application/octet-stream' });
  const testFilename = 'test.sgbackup';

  let result;
  try {
    result = await BM.shareBackup(testBlob, testFilename);
  } catch (err) {
    console.error('FATAL: shareBackup threw — ' + (err && err.message || err));
    process.exit(1);
  }

  await test('triggerDownload ran: URL.createObjectURL called once with the EXACT blob (no re-encoding)', function () {
    if (objectURLBlobs.length !== 1) {
      throw new Error('expected 1 URL.createObjectURL call, got ' + objectURLBlobs.length);
    }
    if (objectURLBlobs[0] !== testBlob) {
      throw new Error('expected the SAME blob reference to be passed through (got a different reference — possible re-encoding)');
    }
  });

  await test('triggerDownload ran: an anchor was created with download="test.sgbackup"', function () {
    if (anchorsCreated.length === 0) {
      throw new Error('expected at least one <a> element to be created by triggerDownload');
    }
    var matched = anchorsCreated.filter(function (a) { return a.download === testFilename; });
    if (matched.length !== 1) {
      throw new Error('expected exactly 1 <a download="' + testFilename + '">, got ' + matched.length +
        ' (downloads observed: ' + JSON.stringify(anchorsCreated.map(function (a) { return a.download; })) + ')');
    }
  });

  await test('triggerDownload ran: localStorage.portfolioLastExport was updated', function () {
    var v = sandbox.localStorage.getItem('portfolioLastExport');
    if (!v) throw new Error('portfolioLastExport not set — triggerDownload did not run');
    if (!/^\d+$/.test(v)) throw new Error('portfolioLastExport is not a numeric timestamp: ' + v);
  });

  await test('window.location.href was set to a "mailto:?" URL', function () {
    if (navState.hrefAssignments.length === 0) {
      throw new Error('expected at least one window.location.href assignment, got 0');
    }
    const mailto = navState.hrefAssignments[navState.hrefAssignments.length - 1];
    if (mailto.indexOf('mailto:?') !== 0) {
      throw new Error('expected mailto: URL, got "' + mailto.slice(0, 60) + '"');
    }
  });

  await test('Decoded mailto body contains the literal filename "test.sgbackup"', function () {
    const mailto = navState.hrefAssignments[navState.hrefAssignments.length - 1];
    // Extract &body= and URL-decode
    const bodyMatch = mailto.match(/[?&]body=([^&]*)/);
    if (!bodyMatch) throw new Error('mailto URL has no body= parameter: ' + mailto);
    const decoded = decodeURIComponent(bodyMatch[1]);
    if (decoded.indexOf(testFilename) === -1) {
      throw new Error('mailto body does not contain "' + testFilename + '". Body: "' + decoded + '"');
    }
  });

  await test('navigator.share was NOT called (fallback path only)', function () {
    if (shareMock.calls.length !== 0) {
      throw new Error('navigator.share was called ' + shareMock.calls.length + ' time(s) — expected 0');
    }
  });

  await test('shareBackup returned a truthy result indicating the fallback path was taken', function () {
    // We accept any non-cancel result here — the load-bearing assertion is the
    // mailto + triggerDownload pair above. But check we got something back.
    if (result === undefined) {
      throw new Error('shareBackup returned undefined — expected a result object/value');
    }
  });

  console.log('');
  console.log('Plan 25-01 share-fallback tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
