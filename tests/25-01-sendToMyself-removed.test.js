/**
 * Phase 25 Plan 01 — Regression: BackupManager.sendToMyself is REMOVED and
 * replaced by shareBackup + isShareSupported.
 *
 * Behaviour under test (D-01):
 *   - The doomed `sendToMyself` path is no longer exposed on the public API.
 *   - Two new helpers are exposed: shareBackup, isShareSupported.
 *
 * Loads assets/backup.js in a vm sandbox with minimal stubs for the runtime
 * globals the module references at load time (window, document, localStorage,
 * crypto, JSZip — note: not invoked at load, only referenced).
 *
 * Run: node tests/25-01-sendToMyself-removed.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Minimal localStorage Map-backed stub.
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

const sandbox = {
  window: {},
  document: makeDoc(),
  console: { log: function () {}, warn: function () {}, error: function () {} },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Promise: Promise,
  localStorage: makeLocalStorage(),
  // crypto referenced only inside encryption helpers; subtle is unused at load time
  crypto: { subtle: {}, getRandomValues: function (a) { return a; } },
  JSZip: function () { return { folder: function () { return { file: function () {} }; }, file: function () {}, generateAsync: function () { return Promise.resolve(new Blob([])); } }; },
  // Blob and File are needed by some helpers but not at load time — provide
  // minimal shims so any constructor reference resolves.
  Blob: function (parts, opts) { this.parts = parts; this.type = (opts && opts.type) || ''; this.size = (parts && parts[0] && parts[0].length) || 0; },
  File: function (parts, name, opts) { this.parts = parts; this.name = name; this.type = (opts && opts.type) || ''; this.size = (parts && parts[0] && parts[0].length) || 0; },
  URL: { createObjectURL: function () { return 'blob:mock'; }, revokeObjectURL: function () {} },
};
// window.* references in the source resolve via sandbox.window — wire essentials.
sandbox.window.localStorage = sandbox.localStorage;
sandbox.window.document = sandbox.document;
sandbox.window.crypto = sandbox.crypto;
sandbox.window.Blob = sandbox.Blob;
sandbox.window.File = sandbox.File;
sandbox.window.URL = sandbox.URL;
sandbox.window.setTimeout = sandbox.setTimeout;
sandbox.window.PortfolioDB = {};
sandbox.window.App = undefined;
sandbox.window.JSZip = sandbox.JSZip;

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
if (!BM) {
  console.error('FAIL: window.BackupManager not exposed after loading backup.js');
  process.exit(1);
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log('  PASS  ' + name);
    passed++;
  } catch (err) {
    console.log('  FAIL  ' + name);
    console.log('        ' + (err && err.message || err));
    failed++;
  }
}

test('sendToMyself is NOT on BackupManager public API (D-01 closure)', function () {
  if (typeof BM.sendToMyself !== 'undefined') {
    throw new Error('sendToMyself still exposed (typeof = ' + typeof BM.sendToMyself + ')');
  }
});

test('shareBackup IS exposed as a function on BackupManager (D-02 replacement)', function () {
  if (typeof BM.shareBackup !== 'function') {
    throw new Error('shareBackup missing or not a function (typeof = ' + typeof BM.shareBackup + ')');
  }
});

test('isShareSupported IS exposed as a function on BackupManager (Pitfall 1 probe)', function () {
  if (typeof BM.isShareSupported !== 'function') {
    throw new Error('isShareSupported missing or not a function (typeof = ' + typeof BM.isShareSupported + ')');
  }
});

test('No "sendToMyself" identifier survives in the backup.js source (defense-in-depth)', function () {
  // Grep at runtime as a paranoia check. backup.js source is already loaded;
  // re-read to assert string-level removal.
  if (src.indexOf('sendToMyself') !== -1) {
    throw new Error('sendToMyself string still present in assets/backup.js');
  }
});

console.log('');
console.log('Plan 25-01 sendToMyself-removed tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
