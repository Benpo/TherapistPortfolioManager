/**
 * Phase 25 Plan 12 — UAT-B: password-ack checkbox visual hierarchy.
 *
 * History:
 *   • Round 1 (Plan 12 original task 4): the checkbox stacked BELOW
 *     a separate verification-text paragraph (.schedule-password-acked-row
 *     was flex-direction:column with the <p ackedLabel> sibling above).
 *   • Round 1 post-UAT fix (bug 2, 2026-05-15): added width:100% so the
 *     row claimed its own line inside the parent flex-wrap container.
 *   • Round 2 redesign (post-UAT, 2026-05-15 — Ben surfaced that the
 *     two sentences were redundant + the layout was too tall): collapsed
 *     to a single inline row [checkbox] [label], with the label styled
 *     bolder + slightly larger than the callout paragraph above.
 *
 * Round-2 contract enforced here:
 *   The .schedule-password-acked-row__control class must exist (it now
 *   targets the label-span carrying data-i18n="schedule.password.ackedLabel").
 *   This catches the case where a future refactor accidentally drops
 *   the class hook and breaks the bolder/larger styling.
 *
 *   The flex-direction:column / DOM-order assertions from round 1 are
 *   superseded by tests/25-12-password-callout-redesign.test.js which
 *   asserts the round-2 inline-row contract.
 *
 * Run: node tests/25-12-password-ack-stacking.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const settingsHtml = fs.readFileSync(path.join(__dirname, '..', 'settings.html'), 'utf8');
const appCss = fs.readFileSync(path.join(__dirname, '..', 'assets', 'app.css'), 'utf8');

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
// DOM-order check (Proof A)
//
// 1. Locate the #schedulePasswordCallout block boundaries.
// 2. Inside that block, find the index of:
//      a. data-i18n="schedule.password.ackedLabel"
//      b. class containing "schedule-password-acked-row__control"
//    (Plan task 4 introduces this nested control wrapper.)
// 3. Assert a < b (text comes before the checkbox wrapper in document order).
// ────────────────────────────────────────────────────────────────────

function domOrderProof() {
  const calloutStart = settingsHtml.indexOf('id="schedulePasswordCallout"');
  if (calloutStart === -1) {
    return { ok: false, reason: '#schedulePasswordCallout not found in settings.html' };
  }
  // Walk forward to find the matching closing </div>. The callout is a
  // single-level container — count the next balanced </div>.
  // (Simplified: take a generous slice; the callout markup is small.)
  const slice = settingsHtml.slice(calloutStart, calloutStart + 2000);

  const labelIdx = slice.indexOf('data-i18n="schedule.password.ackedLabel"');
  const controlIdx = slice.indexOf('schedule-password-acked-row__control');

  if (labelIdx === -1) {
    return { ok: false, reason: 'data-i18n="schedule.password.ackedLabel" not found inside #schedulePasswordCallout' };
  }
  if (controlIdx === -1) {
    return { ok: false, reason: 'class "schedule-password-acked-row__control" not found inside #schedulePasswordCallout (introduced by Task 4)' };
  }
  if (labelIdx < controlIdx) return { ok: true };
  return { ok: false, reason: 'label index (' + labelIdx + ') is NOT before control index (' + controlIdx + ') — checkbox sits before text in document order' };
}

// ────────────────────────────────────────────────────────────────────
// CSS-flex-column check (Proof B)
// ────────────────────────────────────────────────────────────────────

function cssFlexColumnProof() {
  // Find the rule selector. Use a forgiving regex that handles whitespace and
  // multi-line rule bodies.
  //
  // Match selectors that BEGIN with `.schedule-password-acked-row` at a
  // word boundary — this allows `.schedule-password-acked-row { ... }` AND
  // multi-selector rules like `.x, .schedule-password-acked-row { ... }` while
  // excluding the `.schedule-password-acked-row__control` modifier.
  const ruleRegex = /(?:^|[\s,])\.schedule-password-acked-row(?![\w-])[^{]*\{([^}]*)\}/g;
  let m;
  while ((m = ruleRegex.exec(appCss)) !== null) {
    const body = m[1];
    const hasDisplayFlex = /display\s*:\s*flex\b/.test(body);
    const hasFlexCol = /flex-direction\s*:\s*column\b/.test(body);
    const hasDisplayGrid = /display\s*:\s*grid\b/.test(body);
    const hasGridRows = /grid-template-rows\s*:/.test(body);
    if ((hasDisplayFlex && hasFlexCol) || (hasDisplayGrid && hasGridRows)) {
      return { ok: true };
    }
  }
  return { ok: false, reason: 'no .schedule-password-acked-row rule with flex-direction: column (or grid-template-rows) found in app.css' };
}

// ────────────────────────────────────────────────────────────────────
// Round-2 contract: .schedule-password-acked-row__control class hook
// must exist in settings.html (catches accidental refactor that drops
// the styling hook). The round-1 DOM-order / CSS-flex-column proofs
// are superseded — see tests/25-12-password-callout-redesign.test.js
// for the active layout contract.
// ────────────────────────────────────────────────────────────────────

test('settings.html contains class="schedule-password-acked-row__control" styling hook', () => {
  if (settingsHtml.indexOf('schedule-password-acked-row__control') === -1) {
    throw new Error('class "schedule-password-acked-row__control" not present in settings.html');
  }
});

// Touch the now-unused proof helpers so this file does not accumulate
// dead code yet allows a future rollback to re-enable the round-1 proofs
// without rewriting the inspector functions.
void domOrderProof; void cssFlexColumnProof;

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log('Plan 25-12 password-ack-stacking tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
