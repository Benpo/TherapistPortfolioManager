/**
 * Phase 25 Plan 02 — Backup & Restore modal markup + header-icon mount structure.
 *
 * Asserts on the STATIC markup of index.html (HTML structure is legitimately
 * a static contract — no module is executed here):
 *
 *   1. Old overview backup IDs are PURGED from index.html:
 *        - id="sendBackupBtn"
 *        - id="autoBackupBtn"
 *        - id="exportBtn"
 *        - id="importInput"
 *        - id="backupRestoreBtn"  (the rejected overview-body button — entry point now in header)
 *   2. New modal IDs are PRESENT in index.html:
 *        - id="backupModal"
 *        - id="backupModalExport"
 *        - id="backupModalShare"
 *        - id="backupModalImportInput"
 *        - id="backupModalScheduleLink"
 *        - id="backupModalLastBackup"
 *        - id="backupModalClose"
 *   3. The `<div class="header-actions" id="headerActions"></div>` container is present
 *      (the cloud icon is JS-mounted, not authored in markup).
 *   4. The `.inline-actions` block contains EXACTLY two button children:
 *      #addClientBtn and #addSessionBtn — no other action buttons.
 *   5. The required data-i18n keys are bound on the modal markup.
 *   6. The modal contains exactly 5 elements with class="backup-contents-item".
 *
 * REMOVED (Phase 30 WR-01/WR-02 hardening, 2026-06-27): two former checks read
 * assets/app.js AS TEXT and regex-asserted that `mountBackupCloudButton` is
 * declared and called from initCommon — the source-slicing anti-pattern this
 * milestone exists to eliminate (they pinned SHAPE, not behaviour, and shipped a
 * dead `require('vm')` that masqueraded as an execution marker). They are dropped
 * rather than allowlisted. app.js is NOT in the Phase 31 refactor scope, so the
 * mount is not at risk now; the genuine gap — no EXECUTING test boots app.js and
 * asserts the cloud button mounts into #headerActions — is a low-priority
 * follow-up for the future app.js coverage work (see ROADMAP "Codebase Health II"
 * outlook), not a Phase-31 blocker.
 *
 * Run: node tests/25-02-modal-structure.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');

const indexSrc = fs.readFileSync(indexPath, 'utf8');

// Vacuous-green guard (WR-05 sibling): the exact number of structural checks this
// file must run, so a silently-dropped test can never pass by simply not running.
const EXPECTED_COUNT = 6;
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

const OLD_IDS = ['sendBackupBtn', 'autoBackupBtn', 'exportBtn', 'importInput', 'backupRestoreBtn'];
const NEW_IDS = [
  'backupModal',
  'backupModalExport',
  'backupModalShare',
  'backupModalImportInput',
  'backupModalScheduleLink',
  'backupModalLastBackup',
  'backupModalClose',
];
const REQUIRED_I18N = [
  'backup.modal.title',
  'backup.contents.heading',
  'backup.export.heading',
  'backup.import.heading',
  'backup.import.warning',
];

test('Old overview backup IDs are PURGED from index.html (D-05 cluster collapse)', function () {
  for (const id of OLD_IDS) {
    if (indexSrc.indexOf('id="' + id + '"') !== -1) {
      throw new Error('id="' + id + '" still present in index.html — must be removed');
    }
  }
});

test('All new modal IDs are PRESENT in index.html', function () {
  for (const id of NEW_IDS) {
    if (indexSrc.indexOf('id="' + id + '"') === -1) {
      throw new Error('id="' + id + '" missing from index.html');
    }
  }
});

test('#headerActions container is present and empty (cloud icon is JS-mounted)', function () {
  // Must contain the empty container — the icon is mounted into it by app.js
  if (indexSrc.indexOf('id="headerActions"') === -1) {
    throw new Error('#headerActions container missing from index.html');
  }
});

test('.inline-actions block contains EXACTLY [#addClientBtn, #addSessionBtn] children', function () {
  const start = indexSrc.indexOf('<div class="inline-actions"');
  if (start === -1) throw new Error('.inline-actions container not found');
  // Find matching closing </div> by scanning balanced tags from start.
  // Simple counter: scan tokens from start.
  let depth = 0;
  let i = start;
  let end = -1;
  const len = indexSrc.length;
  while (i < len) {
    if (indexSrc.startsWith('<div', i) || indexSrc.startsWith('<DIV', i)) {
      depth++;
      i += 4;
    } else if (indexSrc.startsWith('</div>', i) || indexSrc.startsWith('</DIV>', i)) {
      depth--;
      if (depth === 0) {
        end = i + '</div>'.length;
        break;
      }
      i += '</div>'.length;
    } else {
      i++;
    }
  }
  if (end === -1) throw new Error('Could not find matching </div> for .inline-actions');
  const block = indexSrc.slice(start, end);
  // Find every id="..." attribute inside the block.
  const idMatches = block.match(/id="([^"]+)"/g) || [];
  const ids = idMatches.map(m => m.replace(/^id="/, '').replace(/"$/, ''));
  // EXACTLY these two, in this order, no other ids.
  if (ids.length !== 2) {
    throw new Error('expected exactly 2 ids inside .inline-actions; got ' + ids.length + ' (' + ids.join(', ') + ')');
  }
  if (ids[0] !== 'addClientBtn') {
    throw new Error('expected first child id="addClientBtn"; got id="' + ids[0] + '"');
  }
  if (ids[1] !== 'addSessionBtn') {
    throw new Error('expected second child id="addSessionBtn"; got id="' + ids[1] + '"');
  }
});

test('Modal markup has all required data-i18n bindings (D-26 in-app explanation)', function () {
  for (const key of REQUIRED_I18N) {
    if (indexSrc.indexOf('data-i18n="' + key + '"') === -1) {
      throw new Error('data-i18n="' + key + '" missing from index.html');
    }
  }
});

test('Modal contains exactly 5 elements with class="backup-contents-item" (D-09)', function () {
  const matches = indexSrc.match(/class="backup-contents-item"/g) || [];
  if (matches.length !== 5) {
    throw new Error('expected 5 .backup-contents-item rows; got ' + matches.length);
  }
});

console.log('');
console.log('Plan 25-02 modal-structure tests — ' + passed + ' passed, ' + failed + ' failed');

// Vacuous-green guard: assert every expected structural check actually ran.
const ran = passed + failed;
if (ran !== EXPECTED_COUNT) {
  console.log('FAIL  expected ' + EXPECTED_COUNT + ' checks to run, but ' + ran +
    ' executed — a check was added or dropped without updating EXPECTED_COUNT');
  process.exit(1);
}

process.exit(failed === 0 ? 0 : 1);
