/**
 * Phase 25 Plan 02 — Backup contents checklist parity test (D-09 + D-29).
 *
 * Asserts:
 *   1. BackupManager.BACKUP_CONTENTS_KEYS is a Set-equal match to
 *      ['clients', 'sessions', 'snippets', 'therapistSettings', 'photos'].
 *   2. For every key in BACKUP_CONTENTS_KEYS except 'photos', the exportBackup
 *      manifest object literal source contains that key followed by a colon
 *      (regression-guard: if a new IDB store ships without updating the
 *      checklist, this test fails).
 *   3. 'photos' is checked separately — the exportBackup body references
 *      `photosFolder` (photos live as files inside the ZIP, not in manifest).
 *   4. BackupManager.computeBackupRecencyState is a function and returns
 *      'never' when localStorage is empty.
 *
 * Run: node tests/25-02-checklist-store-parity.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Minimal localStorage Map-backed stub (same as 25-01 tests).
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
  crypto: { subtle: {}, getRandomValues: function (a) { return a; } },
  JSZip: function () { return { folder: function () { return { file: function () {} }; }, file: function () {}, generateAsync: function () { return Promise.resolve(new Blob([])); } }; },
  Blob: function (parts, opts) { this.parts = parts; this.type = (opts && opts.type) || ''; this.size = (parts && parts[0] && parts[0].length) || 0; },
  File: function (parts, name, opts) { this.parts = parts; this.name = name; this.type = (opts && opts.type) || ''; this.size = (parts && parts[0] && parts[0].length) || 0; },
  URL: { createObjectURL: function () { return 'blob:mock'; }, revokeObjectURL: function () {} },
  Date: Date,
};
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

const backupSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'backup.js'), 'utf8');
try {
  vm.runInContext(backupSrc, sandbox, { filename: 'assets/backup.js' });
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

const EXPECTED = ['clients', 'sessions', 'snippets', 'therapistSettings', 'photos'];

test('BACKUP_CONTENTS_KEYS is exposed on BackupManager (D-09 source of truth)', function () {
  if (!Array.isArray(BM.BACKUP_CONTENTS_KEYS)) {
    throw new Error('BACKUP_CONTENTS_KEYS is not an array (typeof = ' + typeof BM.BACKUP_CONTENTS_KEYS + ')');
  }
});

test('BACKUP_CONTENTS_KEYS contains exactly the 5 expected store keys (Set equality)', function () {
  const actual = new Set(BM.BACKUP_CONTENTS_KEYS);
  const expected = new Set(EXPECTED);
  if (actual.size !== expected.size) {
    throw new Error('size mismatch: actual ' + Array.from(actual).join(',') + ' vs expected ' + Array.from(expected).join(','));
  }
  for (const k of expected) {
    if (!actual.has(k)) {
      throw new Error('missing key: ' + k);
    }
  }
  for (const k of actual) {
    if (!expected.has(k)) {
      throw new Error('unexpected key: ' + k);
    }
  }
});

test('Manifest source contains every store-key in BACKUP_CONTENTS_KEYS (except photos)', function () {
  // Extract the manifest object literal from exportBackup source.
  // The manifest var declaration starts at `var manifest = {` and ends at the
  // matching closing `};`. We approximate by finding the var manifest = { and
  // taking the next ~600 chars (the literal block is ~12 lines, well under that).
  const manifestStart = backupSrc.indexOf('var manifest = {');
  if (manifestStart === -1) {
    throw new Error('Could not locate `var manifest = {` block in backup.js');
  }
  const manifestEnd = backupSrc.indexOf('};', manifestStart);
  if (manifestEnd === -1) {
    throw new Error('Could not locate closing `};` for manifest block');
  }
  const manifestBlock = backupSrc.slice(manifestStart, manifestEnd + 2);
  for (const key of EXPECTED) {
    if (key === 'photos') continue; // photos live in ZIP folder, not manifest
    const re = new RegExp('\\b' + key + ':');
    if (!re.test(manifestBlock)) {
      throw new Error('manifest block missing key: ' + key + ' (regression-guard fail; if a new store was added to db.js but not exportBackup, fix exportBackup first)');
    }
  }
});

test('exportBackup body references photosFolder (D-09 — photos travel as ZIP files)', function () {
  if (backupSrc.indexOf('photosFolder') === -1) {
    throw new Error('exportBackup body no longer references `photosFolder` — photos handling may have regressed');
  }
});

test('computeBackupRecencyState is a function on BackupManager (mount-time helper)', function () {
  if (typeof BM.computeBackupRecencyState !== 'function') {
    throw new Error('computeBackupRecencyState missing or not a function (typeof = ' + typeof BM.computeBackupRecencyState + ')');
  }
});

test('computeBackupRecencyState returns "never" when localStorage has no portfolioLastExport', function () {
  sandbox.localStorage.clear();
  const state = BM.computeBackupRecencyState();
  if (state !== 'never') {
    throw new Error('expected "never" on empty localStorage; got ' + JSON.stringify(state));
  }
});

test('computeBackupRecencyState returns "fresh" when last export was 1 hour ago', function () {
  sandbox.localStorage.setItem('portfolioLastExport', String(Date.now() - 60 * 60 * 1000));
  const state = BM.computeBackupRecencyState();
  if (state !== 'fresh') {
    throw new Error('expected "fresh" within 7 days; got ' + JSON.stringify(state));
  }
});

test('computeBackupRecencyState returns "warning" when last export was 10 days ago', function () {
  sandbox.localStorage.setItem('portfolioLastExport', String(Date.now() - 10 * 24 * 60 * 60 * 1000));
  const state = BM.computeBackupRecencyState();
  if (state !== 'warning') {
    throw new Error('expected "warning" between 7–14 days; got ' + JSON.stringify(state));
  }
});

test('computeBackupRecencyState returns "danger" when last export was 30 days ago', function () {
  sandbox.localStorage.setItem('portfolioLastExport', String(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const state = BM.computeBackupRecencyState();
  if (state !== 'danger') {
    throw new Error('expected "danger" beyond 14 days; got ' + JSON.stringify(state));
  }
});

console.log('');
console.log('Plan 25-02 checklist-store-parity tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
