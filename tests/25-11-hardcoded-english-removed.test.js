/**
 * Phase 25 Plan 11 — hardcoded-English removed (WR-01) + Hebrew imperatives gone (CR-03).
 *
 * STRUCTURAL SHAPE GATE — reads source files as text and grep-asserts:
 *
 *   Test B (WR-01 — settings.js):
 *     ZERO occurrences of the 4 known English literals as showToast first-arg:
 *       - `App.showToast('Save failed`
 *       - `App.showToast('Optimize is unavailable`
 *       - `App.showToast('Could not optimize photos`
 *       - `App.showToast('Could not delete photos`
 *     (Single OR double-quoted forms; the substring search covers both.)
 *
 *   Test C (CR-03 — i18n-he.js):
 *     - i18n-he.js does NOT contain ` השתמש בגיבויים ` (masc-sg imperative)
 *     - i18n-he.js does NOT contain `ונעל את המכשיר` (masc-sg imperative)
 *     - i18n-he.js DOES contain `מומלץ להשתמש` (infinitive replacement)
 *     - i18n-he.js DOES contain `לנעול` (infinitive replacement)
 *
 *   Test D (UAT-C3 — settings.js):
 *     - settings.js does NOT contain the inline English template literal
 *       `'Photos use {size} of your browser storage.'` as a default fallback
 *       to `tt('photos.usage.line', …)`. (After GREEN, the i18n key is
 *       `photos.usage.body` and the inline English literal is gone.)
 *
 * Run: node tests/25-11-hardcoded-english-removed.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');

function readSource(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

const settingsSrc = readSource('assets/settings.js');
const heSrc = readSource('assets/i18n-he.js');

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

// ─── Test B: WR-01 — hardcoded English toast literals in settings.js ──
const FORBIDDEN_TOAST_LITERALS = [
  // Save failed
  "App.showToast(\"Save failed",
  "App.showToast('Save failed",
  // Optimize unavailable
  "App.showToast(\"Optimize is unavailable",
  "App.showToast('Optimize is unavailable",
  // Optimize failed
  "App.showToast(\"Could not optimize photos",
  "App.showToast('Could not optimize photos",
  // Delete-all failed
  "App.showToast(\"Could not delete photos",
  "App.showToast('Could not delete photos",
];

for (const lit of FORBIDDEN_TOAST_LITERALS) {
  test('settings.js does NOT contain ' + JSON.stringify(lit), function () {
    if (settingsSrc.indexOf(lit) !== -1) {
      throw new Error('forbidden literal found in settings.js: ' + lit);
    }
  });
}

// ─── Test C: CR-03 — Hebrew masc-sg imperatives removed ──────────────
test('i18n-he.js does NOT contain " השתמש בגיבויים " (masc-sg imperative — CR-03)', function () {
  if (heSrc.indexOf(' השתמש בגיבויים ') !== -1) {
    throw new Error('masc-sg imperative "השתמש בגיבויים" still present in i18n-he.js (CR-03 not fixed)');
  }
});

test('i18n-he.js does NOT contain "ונעל את המכשיר" (masc-sg imperative — CR-03)', function () {
  if (heSrc.indexOf('ונעל את המכשיר') !== -1) {
    throw new Error('masc-sg imperative "ונעל את המכשיר" still present in i18n-he.js (CR-03 not fixed)');
  }
});

test('i18n-he.js DOES contain "מומלץ להשתמש" (infinitive replacement — CR-03)', function () {
  if (heSrc.indexOf('מומלץ להשתמש') === -1) {
    throw new Error('infinitive replacement "מומלץ להשתמש" missing from i18n-he.js');
  }
});

test('i18n-he.js DOES contain "לנעול" (infinitive replacement — CR-03)', function () {
  if (heSrc.indexOf('לנעול') === -1) {
    throw new Error('infinitive replacement "לנעול" missing from i18n-he.js');
  }
});

// ─── Test D: UAT-C3 — inline English template literal removed ────────
test('settings.js does NOT contain inline English fallback "Photos use {size} of your browser storage."', function () {
  if (settingsSrc.indexOf("'Photos use {size} of your browser storage.'") !== -1 ||
      settingsSrc.indexOf('"Photos use {size} of your browser storage."') !== -1) {
    throw new Error('inline English fallback "Photos use {size} of your browser storage." still present in settings.js (UAT-C3 not fixed)');
  }
});

test('settings.js storage line uses i18n key "photos.usage.body" (UAT-C3)', function () {
  if (settingsSrc.indexOf("'photos.usage.body'") === -1 &&
      settingsSrc.indexOf('"photos.usage.body"') === -1) {
    throw new Error('settings.js does not reference the i18n key "photos.usage.body" (UAT-C3 not wired)');
  }
});

// ─── Report ──────────────────────────────────────────────────────────
console.log('');
console.log('Plan 25-11 hardcoded-english-removed tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
