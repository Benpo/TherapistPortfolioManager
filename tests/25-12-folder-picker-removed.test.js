/**
 * Phase 25 Plan 12 — UAT-D1: folder picker UI is fully removed from
 * Settings → Backups.
 *
 * Asserts:
 *   1. settings.html contains NO id="scheduleFolderField",
 *      id="scheduleFolderPickBtn", id="scheduleFolderState",
 *      id="scheduleFolderUnsupported".
 *   2. assets/settings.js contains NO non-comment references to any
 *      scheduleFolder* element ID.
 *   3. Each of the 4 locale files (i18n-en/he/de/cs.js) contains ZERO keys
 *      starting with "schedule.folder.".
 *   4. BackupManager.pickBackupFolder is still defined in backup.js (UI is
 *      removed but the primitive stays — other callers may still need it).
 *
 * Run: node tests/25-12-folder-picker-removed.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const settingsHtml = fs.readFileSync(path.join(__dirname, '..', 'settings.html'), 'utf8');
const settingsJs = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings.js'), 'utf8');
const backupJs = fs.readFileSync(path.join(__dirname, '..', 'assets', 'backup.js'), 'utf8');
const localeFiles = ['i18n-en.js', 'i18n-he.js', 'i18n-de.js', 'i18n-cs.js'];

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) {
    console.log('  FAIL  ' + name);
    console.log('        ' + (err && err.message || err));
    failed++;
  }
}

// ────────────────────────────────────────────────────────────────────
// 1. settings.html — folder-picker IDs purged
// ────────────────────────────────────────────────────────────────────

const FOLDER_IDS = [
  'scheduleFolderField',
  'scheduleFolderPickBtn',
  'scheduleFolderState',
  'scheduleFolderUnsupported',
];

for (const id of FOLDER_IDS) {
  test('settings.html does NOT contain id="' + id + '"', () => {
    if (settingsHtml.indexOf('id="' + id + '"') !== -1) {
      throw new Error('id="' + id + '" still present in settings.html — must be removed');
    }
  });
}

// ────────────────────────────────────────────────────────────────────
// 2. assets/settings.js — element-lookup helpers purged
//
// Strip JS comments first (line comments + block comments) so leftover
// references in comments don't trigger a false positive.
// ────────────────────────────────────────────────────────────────────

function stripJsComments(src) {
  // Remove block comments first, then line comments. (Naive but adequate
  // for grep-style assertions over hand-maintained code.)
  let out = src.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/\/\/[^\n]*\n/g, '\n');
  return out;
}

const settingsJsCodeOnly = stripJsComments(settingsJs);

for (const id of FOLDER_IDS) {
  test('assets/settings.js (non-comment) does NOT reference "' + id + '"', () => {
    if (settingsJsCodeOnly.indexOf(id) !== -1) {
      throw new Error('"' + id + '" still referenced in assets/settings.js code (not in a comment) — must be removed');
    }
  });
}

// Additional belt-and-braces — function names that handled the folder UI
// in Plan 05 should also be gone (refreshFolderState / readFolderName).
test('assets/settings.js (non-comment) does NOT reference refreshFolderState', () => {
  if (settingsJsCodeOnly.indexOf('refreshFolderState') !== -1) {
    throw new Error('refreshFolderState() helper still referenced in settings.js code');
  }
});

test('assets/settings.js (non-comment) does NOT reference readFolderName', () => {
  if (settingsJsCodeOnly.indexOf('readFolderName') !== -1) {
    throw new Error('readFolderName() helper still referenced in settings.js code');
  }
});

// ────────────────────────────────────────────────────────────────────
// 3. i18n locale files — no schedule.folder.* keys remain
// ────────────────────────────────────────────────────────────────────

for (const f of localeFiles) {
  test(f + ' contains ZERO "schedule.folder." keys', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'assets', f), 'utf8');
    // Match any quoted key starting with schedule.folder.
    const matches = src.match(/["']schedule\.folder\.[^"']*["']/g) || [];
    if (matches.length > 0) {
      throw new Error(matches.length + ' schedule.folder.* key(s) still present in ' + f + ': ' +
        matches.slice(0, 5).join(', ') + (matches.length > 5 ? ', …' : ''));
    }
  });
}

// ────────────────────────────────────────────────────────────────────
// 4. backup.js retains pickBackupFolder primitive (deliberate non-removal)
// ────────────────────────────────────────────────────────────────────

test('assets/backup.js still defines pickBackupFolder (primitive kept)', () => {
  if (!/function\s+pickBackupFolder\s*\(/.test(backupJs) &&
      !/pickBackupFolder\s*:\s*function/.test(backupJs)) {
    // Either the function declaration or the property-shorthand on the
    // BackupManager return object should be present.
    if (backupJs.indexOf('pickBackupFolder') === -1) {
      throw new Error('pickBackupFolder is missing from backup.js — primitive should remain even after UI removal');
    }
  }
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log('Plan 25-12 folder-picker-removed tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
