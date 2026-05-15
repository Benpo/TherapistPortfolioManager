/**
 * Phase 25 Plan 08 — encrypt-then-share BEHAVIOR test (D-04 closure).
 *
 * Plan 02 documented a deferred limitation: the Share button worked ONLY on
 * the skip-encryption path, because `exportEncryptedBackup` downloaded the
 * encrypted blob inside its own promise and never returned the blob to the
 * caller. Plan 08 refactors `exportEncryptedBackup` to ALSO return
 * { ok, skip, cancelled, blob, filename } so openExportFlow can chain the
 * encrypted blob into shareBackup. This test proves the chain holds.
 *
 * Two sub-cases (both ship in this file):
 *
 *   SUB-CASE A — SHAPE grep (already covered by Plan 08 verify gates, mirrored
 *   here so this file is the canonical encrypt-then-share contract):
 *     - exportEncryptedBackup resolves to an object with ok/skip/cancelled/blob/filename.
 *     - openExportFlow consumes result.cancelled/skip/ok/blob.
 *
 *   SUB-CASE B — BEHAVIORAL sentinel-blob assertion (load-bearing for D-04):
 *     - The SAME object reference returned by exportEncryptedBackup as `.blob`
 *       MUST flow into the shareBackup(blob, filename) call. Not null, not a
 *       re-derived blob, not the unencrypted exportBackup() blob.
 *     - This is the closure of D-04 ("All share paths inherit the encryption
 *       choice") for the encrypted path — without sub-case B, a regression
 *       where openExportFlow accidentally re-derived the blob via exportBackup()
 *       would silently leak the unencrypted ZIP to the share sheet, and only
 *       manual UAT would catch it.
 *
 * Run: node tests/25-08-encrypt-then-share.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ---------------------------------------------------------------------------
// Sub-case A — Shape grep (read sources as text and regex against the
// refactored backup.js + openExportFlow).
//
// Phase 25 round-5 supersession (Change 1 / UAT-D2, 2026-05-15): the
// Backup & Restore modal handlers — including openExportFlow + the
// `window.openExportFlow = …` exposure + the shareBackup afterExport
// chain — moved out of overview.js into the page-agnostic
// assets/backup-modal.js so the modal opens IN-PLACE on every app page.
// The encrypt-then-share BEHAVIOR contract is unchanged; only the file
// that owns openExportFlow changed. This test now sources backup-modal.js.
// ---------------------------------------------------------------------------

const backupSrc = fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'backup.js'),
  'utf8'
);
const overviewSrc = fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'backup-modal.js'),
  'utf8'
);

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log('  PASS  ' + name);
    passed++;
  } catch (err) {
    console.log('  FAIL  ' + name);
    console.log('        ' + (err && err.stack || err.message || err));
    failed++;
  }
}

function asyncTest(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log('  PASS  ' + name);
      passed++;
    })
    .catch((err) => {
      console.log('  FAIL  ' + name);
      console.log('        ' + (err && err.stack || err.message || err));
      failed++;
    });
}

// --- Sub-case A: SHAPE grep ---------------------------------------------------

test('Sub-case A.1: exportEncryptedBackup resolves with { ok: true, ..., blob: encBlob, filename: encFilename } on success', () => {
  // Tolerant whitespace; allows any single/double quote.
  const re = /resolve\(\s*\{\s*ok\s*:\s*true\s*,\s*skip\s*:\s*false\s*,\s*cancelled\s*:\s*false\s*,\s*blob\s*:\s*encBlob\s*,\s*filename\s*:\s*encFilename\s*\}\s*\)/;
  assert.match(backupSrc, re,
    "backup.js must contain a resolve({ ok: true, skip: false, cancelled: false, blob: encBlob, filename: encFilename }) call");
});

test('Sub-case A.2: exportEncryptedBackup resolves skip-encryption with { ok: false, skip: true, ... }', () => {
  const re = /resolve\(\s*\{\s*ok\s*:\s*false\s*,\s*skip\s*:\s*true\s*,\s*cancelled\s*:\s*false\s*,\s*blob\s*:\s*null\s*,\s*filename\s*:\s*null\s*\}\s*\)/;
  assert.match(backupSrc, re,
    "backup.js must contain a resolve({ ok: false, skip: true, cancelled: false, blob: null, filename: null }) call");
});

test('Sub-case A.3: exportEncryptedBackup resolves cancel with { ok: false, skip: false, cancelled: true, ... }', () => {
  const re = /resolve\(\s*\{\s*ok\s*:\s*false\s*,\s*skip\s*:\s*false\s*,\s*cancelled\s*:\s*true\s*,\s*blob\s*:\s*null\s*,\s*filename\s*:\s*null\s*\}\s*\)/;
  assert.match(backupSrc, re,
    "backup.js must contain a resolve({ ok: false, skip: false, cancelled: true, blob: null, filename: null }) call");
});

test('Sub-case A.4: openExportFlow in backup-modal.js consumes the new object shape (result.cancelled/skip/ok/blob)', () => {
  const fieldHits = (overviewSrc.match(/result\.(cancelled|skip|ok|blob|filename)/g) || []).length;
  assert.ok(fieldHits >= 4,
    'openExportFlow must reference result.cancelled / result.skip / result.ok / result.blob — got ' +
    fieldHits + ' field accesses');
});

test('Sub-case A.5: old branches purged — no `encrypted === \'cancel\'` or `=== false`', () => {
  const oldBranches = (overviewSrc.match(/encrypted\s*===\s*'cancel'|encrypted\s*===\s*false|encrypted\s*===\s*"cancel"/g) || []).length;
  assert.strictEqual(oldBranches, 0,
    'backup-modal.js still contains old `encrypted === \'cancel\'` / `=== false` branches; expected 0, got ' + oldBranches);
});

test('Sub-case A.6: window.openExportFlow is exposed in overview.js (for the behavior-test sandbox + future programmatic invocation)', () => {
  const re = /window\.openExportFlow\s*=\s*openExportFlow/;
  assert.match(overviewSrc, re,
    'backup-modal.js must expose openExportFlow on window for cross-file invocation');
});

// ---------------------------------------------------------------------------
// Sub-case B — BEHAVIORAL sentinel-blob assertion
//
// Boot a vm sandbox; install a stubbed BackupManager whose
// exportEncryptedBackup returns a frozen sentinel blob; load overview.js into
// the same sandbox so openExportFlow is defined on the sandbox window; call
// openExportFlow with an afterExport callback that forwards (blob, filename)
// into shareBackup; assert the SAME object reference flows through.
// ---------------------------------------------------------------------------

function makeBehaviorSandbox() {
  const SENTINEL_BLOB = Object.freeze({
    __sentinel: 'enc-blob',
    type: 'application/octet-stream',
    size: 1234,
  });
  const SENTINEL_FILENAME = 'sessions-garden-2026-05-15.sgbackup';
  const shareBackupCalls = [];
  const triggerDownloadCalls = [];
  const exportBackupCalls = [];

  const sandbox = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    Promise: Promise,
    Blob: Blob, File: File,
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} },
    document: {
      // backup-modal.js binds on load when readyState !== 'loading'.
      readyState: 'complete',
      addEventListener: () => {},
      removeEventListener: () => {},
      // openExportFlow does getElementById('backupCloudBtn') for the
      // updateBackupCloudState call. backup-modal.js also looks up the
      // modal sub-nodes during bindBackupModal — a generic dummy element
      // is fine (we only exercise openExportFlow programmatically).
      getElementById: (id) => {
        if (id === 'backupCloudBtn') return { id: 'backupCloudBtn', classList: { add: () => {}, remove: () => {} } };
        if (id === 'backupModal') return {
          id: 'backupModal',
          classList: { add: () => {}, remove: () => {}, contains: () => true },
          querySelector: () => null,
        };
        return { id: id, classList: { add: () => {}, remove: () => {}, contains: () => false },
          addEventListener: () => {}, removeAttribute: () => {}, setAttribute: () => {},
          files: [], value: '', disabled: false, hidden: false, textContent: '' };
      },
      createElement: () => ({
        style: {}, classList: { add: () => {}, remove: () => {} },
        setAttribute: () => {}, appendChild: () => {}, click: () => {},
        addEventListener: () => {}, innerHTML: '',
        get firstElementChild() { return null; }, get firstChild() { return null; },
      }),
      body: { appendChild: () => {}, removeChild: () => {} },
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    navigator: {},
    localStorage: (() => {
      const m = new Map();
      return {
        getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null),
        setItem: (k, v) => { m.set(String(k), String(v)); },
        removeItem: (k) => { m.delete(String(k)); },
        clear: () => m.clear(),
      };
    })(),
    Intl: Intl,
    window: {},
  };
  // BackupManager stub with the new return shape
  const BackupManager = {
    exportEncryptedBackup: async () => ({
      ok: true, skip: false, cancelled: false,
      blob: SENTINEL_BLOB,
      filename: SENTINEL_FILENAME,
    }),
    exportBackup: async () => {
      exportBackupCalls.push(true);
      return { blob: { __unused: true, type: 'application/zip' }, filename: 'unused.zip' };
    },
    triggerDownload: (blob, filename) => {
      triggerDownloadCalls.push({ blob, filename });
    },
    isAutoBackupActive: () => false,
    isShareSupported: () => true,
    shareBackup: async (blob, filename) => {
      shareBackupCalls.push({ blob, filename });
      return { ok: true, via: 'navigator.share' };
    },
    autoSaveToFolder: async () => true,
  };
  // App stub with no-op methods
  const App = {
    showToast: () => {},
    t: (k) => k,
    applyTranslations: () => {},
    lockBodyScroll: () => {},
    unlockBodyScroll: () => {},
    confirmDialog: async () => true,
    // Plan 04 hook — overview.js's openExportFlow calls this. No-op is fine.
    updateBackupCloudState: () => {},
  };
  sandbox.BackupManager = BackupManager;
  sandbox.App = App;
  sandbox.window.BackupManager = BackupManager;
  sandbox.window.App = App;
  sandbox.window.document = sandbox.document;
  sandbox.window.localStorage = sandbox.localStorage;
  vm.createContext(sandbox);

  // Round-5 supersession: openExportFlow now lives in backup-modal.js
  // (an IIFE that self-exposes window.openExportFlow on load). Load it
  // whole — bindBackupModal() is defensive and no-ops against the dummy
  // DOM; the encrypt-then-share contract is exercised by calling
  // window.openExportFlow programmatically below.
  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'backup-modal.js'), 'utf8');
  vm.runInContext(src, sandbox, { filename: 'assets/backup-modal.js' });

  return {
    sandbox,
    SENTINEL_BLOB,
    SENTINEL_FILENAME,
    shareBackupCalls,
    triggerDownloadCalls,
    exportBackupCalls,
  };
}

(async () => {

await asyncTest('Sub-case B.1: openExportFlow is exposed on window after loading overview.js', () => {
  const ctx = makeBehaviorSandbox();
  assert.strictEqual(typeof ctx.sandbox.window.openExportFlow, 'function',
    'window.openExportFlow must be a function after overview.js boots');
});

await asyncTest('Sub-case B.2: shareBackup receives the SAME sentinel blob reference returned by exportEncryptedBackup', async () => {
  const ctx = makeBehaviorSandbox();
  await ctx.sandbox.window.openExportFlow({
    afterExport: async ({ blob, filename }) => {
      await ctx.sandbox.BackupManager.shareBackup(blob, filename);
    },
  });
  assert.strictEqual(ctx.shareBackupCalls.length, 1,
    'shareBackup must be called exactly once via the afterExport hook; got ' + ctx.shareBackupCalls.length);
  assert.strictEqual(ctx.shareBackupCalls[0].blob, ctx.SENTINEL_BLOB,
    'shareBackup must receive the SAME blob object reference returned by exportEncryptedBackup (D-04 inheritance)');
  assert.strictEqual(ctx.shareBackupCalls[0].filename, ctx.SENTINEL_FILENAME,
    'shareBackup must receive the .sgbackup filename, not the unencrypted .zip filename');
});

await asyncTest('Sub-case B.3: openExportFlow on the encrypted path does NOT re-derive the blob via exportBackup() (D-04)', async () => {
  const ctx = makeBehaviorSandbox();
  await ctx.sandbox.window.openExportFlow({
    afterExport: async ({ blob, filename }) => {
      await ctx.sandbox.BackupManager.shareBackup(blob, filename);
    },
  });
  assert.strictEqual(ctx.exportBackupCalls.length, 0,
    'openExportFlow must NOT call exportBackup() on the encrypted path — that would leak an unencrypted ZIP to the share sheet');
});

await asyncTest('Sub-case B.4: openExportFlow on the encrypted path does NOT call triggerDownload (the encrypt path already downloaded inside exportEncryptedBackup)', async () => {
  const ctx = makeBehaviorSandbox();
  await ctx.sandbox.window.openExportFlow({
    afterExport: async ({ blob, filename }) => {
      await ctx.sandbox.BackupManager.shareBackup(blob, filename);
    },
  });
  assert.strictEqual(ctx.triggerDownloadCalls.length, 0,
    'triggerDownload must NOT be called on the encrypted path; the download already fired inside exportEncryptedBackup');
});

console.log('');
console.log('Plan 25-08 encrypt-then-share tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);

})().catch((err) => {
  console.error('FATAL test harness error:', err && err.stack || err);
  process.exit(1);
});
