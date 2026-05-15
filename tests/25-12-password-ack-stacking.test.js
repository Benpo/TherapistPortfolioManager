/**
 * Phase 25 Plan 12 — UAT-B: password-ack checkbox sits BELOW the
 * verification text, not to its side.
 *
 * Two acceptable proofs (test passes if either one succeeds):
 *
 *   A. DOM-order proof
 *      Inside #schedulePasswordCallout, the element carrying
 *      data-i18n="schedule.password.ackedLabel" appears BEFORE the wrapper
 *      element with class "schedule-password-acked-row__control" in document
 *      order.
 *
 *   B. CSS-flex-column proof
 *      assets/app.css contains a rule selector `.schedule-password-acked-row`
 *      whose declarations include `display: flex` AND `flex-direction: column`
 *      (or `display: grid` with `grid-template-rows`). This survives a
 *      pure-CSS-stacking implementation where DOM order is unchanged but
 *      visual stacking is achieved by flex/grid.
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
// Combined assertion: at least one proof must succeed.
// ────────────────────────────────────────────────────────────────────

test('Either DOM-order OR CSS-flex-column proves vertical stacking of password-ack checkbox', () => {
  const dom = domOrderProof();
  const css = cssFlexColumnProof();
  if (dom.ok || css.ok) return; // pass
  throw new Error(
    'Neither stacking proof succeeded.\n' +
    '        Proof A (DOM-order): ' + dom.reason + '\n' +
    '        Proof B (CSS-flex-column): ' + css.reason
  );
});

// Supplemental: the new schedule-password-acked-row__control class must exist
// in settings.html (locks in the structural fix introduced by Task 4).
test('settings.html contains class="schedule-password-acked-row__control" wrapper (Task 4)', () => {
  if (settingsHtml.indexOf('schedule-password-acked-row__control') === -1) {
    throw new Error('class "schedule-password-acked-row__control" not present in settings.html');
  }
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log('Plan 25-12 password-ack-stacking tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
