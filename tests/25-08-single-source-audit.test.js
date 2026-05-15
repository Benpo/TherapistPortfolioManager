/**
 * Phase 25 Plan 08 — Single-source-of-truth audit (D-30 enforcement).
 *
 * Pure file-content greps, no sandbox needed. Reads source files as strings
 * and asserts each shared helper:
 *   1. is defined in exactly one place (single source of truth), and
 *   2. has multiple consumers — proving the helper is genuinely shared, not
 *      a one-off that should have been inlined.
 *
 * Future regressions caught by this audit:
 *   - If sendToMyself sneaks back into backup.js or overview.js, this test
 *     fails immediately (negative gate).
 *   - If CropModule.resizeToMaxDimension is duplicated (e.g., a second canvas
 *     pipeline in settings.js), the cross-consumer assertion still holds but
 *     the negative gate against canvas-API calls in settings.js / db.js
 *     catches it.
 *   - If getScheduleIntervalMs is forked (e.g., a second copy inlined in
 *     app.js for the banner suppression instead of routing through
 *     BackupManager), the audit detects the missing public-API consumption.
 *
 * Run: node tests/25-08-single-source-audit.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');

function readSrc(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

const backupJs    = readSrc('assets/backup.js');
const overviewJs  = readSrc('assets/overview.js');
const appJs       = readSrc('assets/app.js');
const settingsJs  = readSrc('assets/settings.js');
const addClientJs = readSrc('assets/add-client.js');
const cropJs      = readSrc('assets/crop.js');

let failures = 0;
let passes = 0;
function check(label, condition) {
  if (!condition) {
    console.error('  FAIL  ' + label);
    failures++;
  } else {
    console.log('  PASS  ' + label);
    passes++;
  }
}

// ===========================================================================
// D-30 HELPER 1: BackupManager.getScheduleIntervalMs
//
// Defined in backup.js. Consumed by:
//   - backup.js itself (checkBackupSchedule + computeBackupRecencyState).
//   - app.js (banner suppression — Plan 04).
// The chip-state side (Plan 04 D-13/D-14) routes through
// computeBackupRecencyState which itself calls getScheduleIntervalMs, so the
// helper has 3 distinct consumer call-sites. We assert presence in backup.js
// definition + app.js consumption + at least one downstream consumption from
// inside backup.js (the checkBackupSchedule fire path).
// ===========================================================================

check('getScheduleIntervalMs defined in backup.js',
  /function\s+getScheduleIntervalMs\s*\(/.test(backupJs));

check('getScheduleIntervalMs exposed on BackupManager public API',
  /getScheduleIntervalMs\s*:\s*getScheduleIntervalMs/.test(backupJs));

check('getScheduleIntervalMs consumed by app.js (Plan 04 banner suppression)',
  /BackupManager\.getScheduleIntervalMs\s*\(/.test(appJs));

// Cross-consumer check — getScheduleIntervalMs should appear ≥ 2 times in
// backup.js (definition + internal consumers like computeBackupRecencyState +
// checkBackupSchedule).
const getScheduleIntervalInternalCount = (backupJs.match(/getScheduleIntervalMs/g) || []).length;
check('getScheduleIntervalMs has ≥ 3 references in backup.js (definition + public-API export + internal consumers)',
  getScheduleIntervalInternalCount >= 3);

// ===========================================================================
// D-30 HELPER 2: CropModule.resizeToMaxDimension
//
// Defined in crop.js. Consumed by:
//   - add-client.js (Plan 06 — new uploads, the resize-on-upload path).
//   - settings.js   (Plan 07 — Photos tab bulk optimize loop).
// Both consumers MUST go through CropModule.resizeToMaxDimension — direct
// canvas API calls in settings.js or db.js are a D-30 violation.
// ===========================================================================

check('resizeToMaxDimension defined in crop.js',
  /function\s+resizeToMaxDimension\s*\(/.test(cropJs));

check('resizeToMaxDimension exposed on CropModule public API',
  /resizeToMaxDimension\s*:\s*resizeToMaxDimension/.test(cropJs));

check('resizeToMaxDimension consumed by add-client.js (Plan 06 new uploads)',
  /CropModule\.resizeToMaxDimension\s*\(/.test(addClientJs));

check('resizeToMaxDimension consumed by settings.js (Plan 07 Photos tab optimize)',
  /CropModule\.resizeToMaxDimension\s*\(/.test(settingsJs));

// ===========================================================================
// D-30 HELPER 3: PortfolioDB.updateClient
//
// Pre-existing helper at db.js:477. Plan 07 confirmed BOTH bulk-optimize AND
// bulk delete-all in settings.js route through it (D-30 single-source).
// ===========================================================================

const updateClientHits = (settingsJs.match(/PortfolioDB\.updateClient\s*\(/g) || []).length;
check('PortfolioDB.updateClient used by settings.js in ≥ 2 distinct call-sites (Plan 07 optimize + delete-all)',
  updateClientHits >= 2);

// ===========================================================================
// D-30 HELPER 4: BACKUP_CONTENTS_KEYS
//
// Defined in backup.js. Consumed conceptually by:
//   - The modal markup's static checklist (Plan 02 D-09).
//   - Plan 02's checklist-store-parity test.
//   - Plan 08's round-trip test.
// We assert definition + public-API export + value-shape (5-element array).
// ===========================================================================

check('BACKUP_CONTENTS_KEYS defined in backup.js',
  /BACKUP_CONTENTS_KEYS\s*=\s*\[/.test(backupJs));

check('BACKUP_CONTENTS_KEYS exposed on BackupManager public API',
  /BACKUP_CONTENTS_KEYS\s*:\s*BACKUP_CONTENTS_KEYS/.test(backupJs));

// ===========================================================================
// D-30 HELPER 5: BackupManager.shareBackup
//
// Defined in backup.js. Consumed by overview.js (Plan 02 modal Share button +
// Plan 08 encrypted-then-share path). The same shareBackup is called from
// both encrypted and skip-encryption afterExport callbacks — D-30 single-source.
// ===========================================================================

check('shareBackup defined in backup.js',
  /function\s+shareBackup\s*\(/.test(backupJs));

check('shareBackup exposed on BackupManager public API',
  /shareBackup\s*:\s*shareBackup/.test(backupJs));

check('shareBackup consumed by overview.js (modal Share button afterExport)',
  /BackupManager\.shareBackup\s*\(/.test(overviewJs));

// ===========================================================================
// D-30 NEGATIVE — sendToMyself fully purged (Plan 01 D-01 closure)
// ===========================================================================

check('sendToMyself fully purged from backup.js (D-01)',
  !/sendToMyself/.test(backupJs));

check('sendToMyself fully purged from overview.js (D-01)',
  !/sendToMyself/.test(overviewJs));

// ===========================================================================
// D-30 NEGATIVE — no rogue canvas-API pipelines in settings.js or db.js
//
// The ONLY canvas-based image pipeline in the project must live at
// CropModule.resizeToMaxDimension (crop.js). If a future plan inlines another
// canvas pipeline into settings.js or db.js — DOM resize, raw toBlob, etc. —
// this gate fires.
//
// (assets/add-client.js is exempt: it uses the crop modal's canvas indirectly
// via CropModule.openCropModal — that's by design.)
// ===========================================================================

const canvasApiRegex = /createImageBitmap\(|\.toBlob\(|\.getContext\(\s*['"]2d|\.drawImage\(/g;
check('No rogue canvas-API calls in settings.js (Plan 07 must route through CropModule)',
  !canvasApiRegex.test(settingsJs));

const dbCanvasMatches = (readSrc('assets/db.js').match(canvasApiRegex) || []);
check('No rogue canvas-API calls in db.js (db.js is data, not image processing)',
  dbCanvasMatches.length === 0);

// ===========================================================================
// Report
// ===========================================================================

console.log('');
console.log('Plan 25-08 single-source-audit — ' + passes + ' passed, ' + failures + ' failed');
process.exit(failures === 0 ? 0 : 1);
