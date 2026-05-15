/**
 * Phase 25 Plan 12 (post-UAT fix) — Bug 2: the password-ack callout's
 * inner form-field must FORCE A LINE BREAK inside the parent flex-row
 * (#schedulePasswordCallout uses .backup-reminder-banner which is
 * `display: flex; flex-wrap: wrap; align-items: center;
 *  justify-content: space-between;`).
 *
 * Why this exists in addition to 25-12-password-ack-stacking.test.js:
 *   The original test asserts that `.schedule-password-acked-row` has
 *   `display: flex; flex-direction: column` (which is true — the rule
 *   exists at app.css:3691). BUT the parent is itself a flex-row with
 *   flex-wrap: wrap. Without a `width: 100%` (or `flex-basis: 100%`) on
 *   the .schedule-password-acked-row, the form-field shares its line
 *   with the callout text on the LEFT, and the form-field is shrunk
 *   horizontally so the inner <p> ackedLabel + <label> .__control stack
 *   side-by-side instead of stacking vertically as designed. Ben
 *   reproduced this in Safari UAT on 2026-05-15: "the checkbox is INLINE
 *   next to the text, not on its own row below."
 *
 * Required CSS contract:
 *   .schedule-password-acked-row {
 *     display: flex;
 *     flex-direction: column;
 *     width: 100%;          ← NEW (forces wrap to its own line)
 *     (OR alternative: flex-basis: 100%)
 *   }
 *
 * MUST FAIL before the fix (the existing rule has display:flex and
 * flex-direction:column but no width/flex-basis declaration).
 *
 * Run: node tests/25-12-password-ack-full-width.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const appCss = fs.readFileSync(path.join(__dirname, '..', 'assets', 'app.css'), 'utf8');
const settingsHtml = fs.readFileSync(path.join(__dirname, '..', 'settings.html'), 'utf8');

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
// Establish the root cause first: parent #schedulePasswordCallout uses
// the .backup-reminder-banner rule which is a horizontal flex-row.
// ────────────────────────────────────────────────────────────────────

test('parent #schedulePasswordCallout inherits .backup-reminder-banner flex-row layout (root cause)', () => {
  // settings.html must mark the callout with both classes.
  if (!/class="[^"]*\bbackup-reminder-banner\b[^"]*\bschedule-password-callout\b/.test(settingsHtml) &&
      !/class="[^"]*\bschedule-password-callout\b[^"]*\bbackup-reminder-banner\b/.test(settingsHtml)) {
    throw new Error('#schedulePasswordCallout no longer carries .backup-reminder-banner — root cause may have been refactored');
  }
  const re = /\.backup-reminder-banner\s*\{([^}]*)\}/;
  const m = appCss.match(re);
  if (!m) throw new Error('.backup-reminder-banner rule missing from app.css');
  if (!/display\s*:\s*flex\b/i.test(m[1])) {
    throw new Error('.backup-reminder-banner no longer uses display: flex — root cause description is stale');
  }
});

// ────────────────────────────────────────────────────────────────────
// Find a .schedule-password-acked-row rule that includes BOTH
// flex-direction:column AND a full-width directive (width:100% OR
// flex-basis:100%). The full-width directive forces the form-field to
// wrap to its own line inside the .backup-reminder-banner flex-row.
// ────────────────────────────────────────────────────────────────────

function findAckedRowRuleBodies() {
  const bodies = [];
  // Match selectors that START with `.schedule-password-acked-row` at a
  // word boundary — exclude `.schedule-password-acked-row__control`.
  const re = /(?:^|[\s,])\.schedule-password-acked-row(?![\w-])[^{]*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(appCss)) !== null) bodies.push(m[1]);
  return bodies;
}

test('.schedule-password-acked-row declares width: 100% OR flex-basis: 100% (forces its own row in parent flex)', () => {
  const bodies = findAckedRowRuleBodies();
  if (!bodies.length) {
    throw new Error('no .schedule-password-acked-row rule found in app.css');
  }
  // Collect all declarations across all matching rule bodies.
  const combined = bodies.join('\n');
  const hasWidth100 = /width\s*:\s*100\s*%/.test(combined);
  const hasFlexBasis100 = /flex-basis\s*:\s*100\s*%/.test(combined);
  const hasFlex100Shorthand = /flex\s*:\s*1\s+1\s+100\s*%/.test(combined);
  if (!hasWidth100 && !hasFlexBasis100 && !hasFlex100Shorthand) {
    throw new Error(
      'no `width: 100%` / `flex-basis: 100%` / `flex: 1 1 100%` declaration found\n' +
      '        in any .schedule-password-acked-row rule. The form-field needs to\n' +
      '        be forced to occupy its own row inside the parent flex container.\n' +
      '        Bodies inspected:\n        ' + bodies.map(b => b.trim().replace(/\s+/g, ' ')).join('\n        ')
    );
  }
});

// ────────────────────────────────────────────────────────────────────
// Round-2 supersession (post-UAT 2026-05-15): the original Plan 12
// contract was a flex-column stack; Ben's round-2 redesign collapsed
// the row to a single horizontal line ([checkbox] [bolder label]),
// so flex-direction:column is now expressly absent. The width:100%
// assertion above STILL holds — the row still claims its own line
// inside the parent flex-wrap container, just as a row-direction
// flex item this time. The active layout contract is enforced by
// tests/25-12-password-callout-redesign.test.js.
// ────────────────────────────────────────────────────────────────────

test('.schedule-password-acked-row still declares display: flex (round-2 horizontal row)', () => {
  const bodies = findAckedRowRuleBodies();
  const combined = bodies.join('\n');
  if (!/display\s*:\s*flex\b/.test(combined)) {
    throw new Error('.schedule-password-acked-row no longer declares display: flex');
  }
  // Round-2 explicitly REMOVES flex-direction:column. Sanity-check that
  // the obsolete declaration is not silently reintroduced (which would
  // re-break the inline-row layout Ben requested).
  if (/flex-direction\s*:\s*column\b/.test(combined)) {
    throw new Error(
      '.schedule-password-acked-row has flex-direction:column again — round-2\n' +
      '        redesign requires the row to be horizontal. Did a refactor\n' +
      '        accidentally restore the round-1 stacked layout?'
    );
  }
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log('Plan 25-12 password-ack-full-width tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
