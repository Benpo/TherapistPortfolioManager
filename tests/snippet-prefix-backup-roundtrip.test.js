/**
 * Bug fix — backup does not preserve the custom snippet prefix.
 *
 * The quick-paste prefix lives in localStorage under `portfolioSnippetPrefix`
 * (assets/snippets.js), NOT in IndexedDB. The backup manifest only captured
 * `portfolioLang` + `portfolioTheme`, so a customised prefix (e.g. `?`) was
 * silently dropped on backup→restore / cross-browser migration.
 *
 * Fix: export adds `manifest.settings.snippetPrefix`; restore writes it back
 * (validated to the 1–2 char setPrefix rule, preferring the live engine).
 * License keys deliberately do NOT travel.
 *
 * Honors `feedback-behavior-verification.md`: a real export→import round-trip
 * through the real backup.js + real JSZip, asserting the OBSERVABLE restored
 * localStorage value. Written to FAIL on the pre-fix code, PASS after.
 *
 * Run: node tests/snippet-prefix-backup-roundtrip.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const SOURCE_CLIENTS = [{ id: 1, firstName: 'Alice', lastName: 'A.', type: 'adult', photoData: '' }];
const SOURCE_SESSIONS = [{ id: 10, clientId: 1, date: '2026-05-01', sections: {} }];

function createMock(opts) {
  opts = opts || {};
  const writes = { snippets: [] };
  return {
    __writes: writes,
    clearAll: () => Promise.resolve(),
    addClient: () => Promise.resolve(),
    addSession: () => Promise.resolve(),
    setTherapistSetting: () => Promise.resolve(),
    _writeTherapistSentinel: () => Promise.resolve(),
    updateSnippet: (s) => { writes.snippets.push(s); return Promise.resolve(); },
    getAllClients: () => Promise.resolve(opts.clients || []),
    getAllSessions: () => Promise.resolve(opts.sessions || []),
    getAllTherapistSettings: () => Promise.resolve(opts.therapistSettings || []),
    getAllSnippets: () => Promise.resolve(opts.snippets || []),
    validateSnippetShape: () => true,
  };
}

function makeLocalStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
    setItem: (k, v) => { map.set(String(k), String(v)); },
    removeItem: (k) => { map.delete(String(k)); },
    clear: () => map.clear(),
    _map: map,
  };
}

function makeDoc() {
  return {
    addEventListener: () => {}, removeEventListener: () => {},
    createElement: () => ({ href: '', download: '', style: {}, setAttribute: () => {},
      appendChild: () => {}, click: () => {}, addEventListener: () => {},
      classList: { add: () => {}, remove: () => {} } }),
    body: { appendChild: () => {}, removeChild: () => {} },
    head: { appendChild: () => {} },
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  };
}

function buildSandbox(mockDb, localStorage) {
  const sandbox = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    setTimeout, clearTimeout, setImmediate, clearImmediate, queueMicrotask, Promise,
    crypto: globalThis.crypto || { subtle: {}, getRandomValues: (a) => a },
    TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, Blob, File,
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} },
    FileReader: function FileReader() {
      this.readAsText = function (file) {
        const self = this;
        Promise.resolve()
          .then(() => (typeof file.text === 'function' ? file.text() : file.arrayBuffer()))
          .then((res) => { self.result = typeof res === 'string' ? res : new TextDecoder().decode(res);
            if (typeof self.onload === 'function') self.onload({ target: self }); })
          .catch((err) => { if (typeof self.onerror === 'function') self.onerror(err); });
      };
      this.readAsArrayBuffer = function (file) {
        const self = this;
        Promise.resolve().then(() => file.arrayBuffer())
          .then((res) => { self.result = res; if (typeof self.onload === 'function') self.onload({ target: self }); })
          .catch((err) => { if (typeof self.onerror === 'function') self.onerror(err); });
      };
    },
    document: makeDoc(), navigator: { share: undefined, canShare: undefined },
    localStorage, window: {},
  };
  sandbox.window.PortfolioDB = mockDb;
  sandbox.window.localStorage = localStorage;
  sandbox.window.document = sandbox.document;
  const locObj = {}; let lastHref = '';
  Object.defineProperty(locObj, 'href', { get: () => lastHref, set: (v) => { lastHref = String(v); }, configurable: true, enumerable: true });
  sandbox.window.location = locObj; sandbox.location = locObj;
  vm.createContext(sandbox);

  const jszipSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'jszip.min.js'), 'utf8');
  vm.runInContext(jszipSrc, sandbox, { filename: 'assets/jszip.min.js' });
  if (!sandbox.JSZip && sandbox.window.JSZip) sandbox.JSZip = sandbox.window.JSZip;
  if (!sandbox.window.JSZip && sandbox.JSZip) sandbox.window.JSZip = sandbox.JSZip;
  if (typeof sandbox.JSZip !== 'function') throw new Error('JSZip did not attach to the sandbox global');

  const backupSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'backup.js'), 'utf8');
  vm.runInContext(backupSrc, sandbox, { filename: 'assets/backup.js' });
  return sandbox;
}

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.stack || err.message || err)); failed++; }
}

(async () => {
  // ── Export from a source install with a CUSTOM prefix + a license key ──────
  const srcLS = makeLocalStorage();
  srcLS.setItem('portfolioLang', 'he');
  srcLS.setItem('portfolioTheme', 'dark');
  srcLS.setItem('portfolioSnippetPrefix', '?');     // the bug: customised prefix
  srcLS.setItem('portfolioLicenseKey', 'LIC-SHOULD-NOT-TRAVEL');

  const srcSandbox = buildSandbox(createMock({ clients: SOURCE_CLIENTS, sessions: SOURCE_SESSIONS }), srcLS);
  const BMsrc = srcSandbox.window.BackupManager;
  const exportResult = await BMsrc.exportBackup();
  assert.ok(exportResult && exportResult.blob, 'exportBackup must return { blob }');

  // Inspect the manifest directly to assert what DOES and does NOT get exported.
  let manifest;
  await test('export: manifest.settings.snippetPrefix carries the custom prefix; no license key travels', async () => {
    const zip = await srcSandbox.JSZip.loadAsync(await exportResult.blob.arrayBuffer());
    manifest = JSON.parse(await zip.file('backup.json').async('string'));
    assert.strictEqual(manifest.settings.snippetPrefix, '?',
      'snippetPrefix must be serialized into the backup (the bug omitted it)');
    const settingsBlob = JSON.stringify(manifest.settings);
    assert.ok(settingsBlob.indexOf('LIC-SHOULD-NOT-TRAVEL') === -1,
      'license key must NOT be exported in the backup');
  });

  // ── Import into a CLEAN install (default prefix) and assert restore ────────
  const dstLS = makeLocalStorage(); // empty → simulates a fresh browser
  const dstSandbox = buildSandbox(createMock(), dstLS);
  const BMdst = dstSandbox.window.BackupManager;
  const importFile = new srcSandbox.File([exportResult.blob], exportResult.filename, { type: 'application/zip' });

  await test('import: restores the custom snippet prefix into a clean install', async () => {
    await BMdst.importBackup(importFile);
    assert.strictEqual(dstLS.getItem('portfolioSnippetPrefix'), '?',
      'the custom prefix must be restored (was lost pre-fix)');
    assert.strictEqual(dstLS.getItem('portfolioLicenseKey'), null,
      'no license key should ever be written by a restore');
  });

  // ── Backward-compat: an OLD backup with no snippetPrefix leaves prefix as-is ─
  await test('import: an old backup (no snippetPrefix) leaves the existing prefix untouched', async () => {
    const dst2 = makeLocalStorage();
    dst2.setItem('portfolioSnippetPrefix', ';'); // existing local prefix
    const sb2 = buildSandbox(createMock(), dst2);
    // Build a legacy manifest blob with NO snippetPrefix.
    const legacy = JSON.parse(JSON.stringify(manifest));
    delete legacy.settings.snippetPrefix;
    const legacyZip = new sb2.JSZip();
    legacyZip.file('backup.json', JSON.stringify(legacy));
    const legacyBlob = await legacyZip.generateAsync({ type: 'blob' });
    const legacyFile = new sb2.File([legacyBlob], 'legacy.zip', { type: 'application/zip' });
    await sb2.window.BackupManager.importBackup(legacyFile);
    assert.strictEqual(dst2.getItem('portfolioSnippetPrefix'), ';',
      'a backup without snippetPrefix must not clobber the existing local prefix');
  });

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed > 0 ? 1 : 0);
})();
