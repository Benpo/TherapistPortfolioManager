/**
 * Phase 25 Plan 13 — CSS audit for UAT-D5/D6/D7/E1/F1 visual gaps.
 *
 * Source-grep behavior tests. Each assertion targets the SHAPE of the
 * CSS rule that fixes one UAT finding. Lock-down regression suite for
 * the 5 visual gaps Ben surfaced in the 2026-05-15 UAT pass:
 *
 *   D5 — Modal footer link looks clickable (underline + link color + hover).
 *   D6 — Test-password drop zone is visually distinct (dashed border,
 *        spacing from the password input below).
 *   D7 — Backup-modal action rows have a non-zero gap between buttons.
 *   E1 — Cloud icon `--fresh` state subordinates to the gear's current-page
 *        green on settings.html (Pattern A: non-fill ring).
 *   F1 — Photos-tab buttons sized to content (not full-stretch width).
 *
 * These are CSS-rule SHAPE assertions, not runtime computed-style checks
 * (the project does not bundle a DOM/CSS engine such as jsdom). Visual
 * outcome verification is handled by the checkpoint:human-verify task at
 * the end of Plan 25-13 (screenshots in SUMMARY).
 *
 * Run: node tests/25-13-css-audit.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'assets', 'app.css');
const css = fs.readFileSync(cssPath, 'utf8');

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

/**
 * Find a CSS rule block whose selector list contains `selectorFragment`
 * and return the body { ... } as a string. Naive but sufficient: app.css
 * is hand-authored, no @media nesting around the target rules, and
 * selectors are short. Returns null if no rule found.
 */
function findRule(selectorFragment) {
  // Greedy-friendly regex: anchor on the selector fragment, capture the
  // brace block. Handles multi-selector rules joined by commas.
  // Pattern: any non-{} chars containing the fragment, then { body }.
  const re = new RegExp(
    '([^{}]*' + selectorFragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^{}]*)\\{([^}]*)\\}',
    'g'
  );
  const matches = [];
  let m;
  while ((m = re.exec(css)) !== null) {
    matches.push({ selector: m[1].trim(), body: m[2] });
  }
  return matches;
}

// ─── UAT-D5 — Footer link styling ───────────────────────────────────
test('UAT-D5: .backup-modal-footer link OR #backupModalScheduleLink has text-decoration: underline', function () {
  // Global rule at app.css:35 strips link styling (text-decoration:none, color:inherit).
  // Plan 25-13 must add an explicit override for the modal footer link.
  const candidates = [
    findRule('.backup-modal-footer a'),
    findRule('#backupModalScheduleLink'),
    findRule('.text-link'),
  ].flat();
  if (candidates.length === 0) {
    throw new Error('No rule found targeting .backup-modal-footer a, #backupModalScheduleLink, or .text-link — D5 fix missing');
  }
  const hasUnderline = candidates.some(function (r) {
    return /text-decoration\s*:\s*underline/.test(r.body) ||
           /text-decoration-line\s*:\s*underline/.test(r.body) ||
           /text-decoration\s*:\s*[^;}]*underline/.test(r.body);
  });
  if (!hasUnderline) {
    throw new Error('Footer link rule(s) exist but none declare text-decoration: underline');
  }
});

test('UAT-D5: footer link rule sets an explicit link color (not inherit)', function () {
  // The global `a` rule sets color:inherit. The override must use a real
  // color token so the link visually differs from surrounding text.
  const candidates = [
    findRule('.backup-modal-footer a'),
    findRule('#backupModalScheduleLink'),
    findRule('.text-link'),
  ].flat();
  const hasColor = candidates.some(function (r) {
    // color: var(--color-primary*) or color: <hex>
    return /color\s*:\s*var\(--color-(primary|primary-dark|primary-strong|link)/.test(r.body);
  });
  if (!hasColor) {
    throw new Error('Footer link rule(s) must declare an explicit color: var(--color-primary*) — none found');
  }
});

test('UAT-D5: footer link has a :hover state', function () {
  // The hover state must be DEFINED so the cursor + visual feedback
  // signals interactivity beyond the default cursor: pointer on <a>.
  const hoverRules = [
    findRule('.backup-modal-footer a:hover'),
    findRule('#backupModalScheduleLink:hover'),
    findRule('.text-link:hover'),
  ].flat();
  if (hoverRules.length === 0) {
    throw new Error('No :hover rule found for .backup-modal-footer a / #backupModalScheduleLink / .text-link');
  }
});

// ─── UAT-D6 — Test-password drop zone styling ───────────────────────
test('UAT-D6: .backup-test-password-filebtn has border-style: dashed (or dashed in shorthand)', function () {
  const rules = findRule('.backup-test-password-filebtn');
  if (rules.length === 0) {
    throw new Error('.backup-test-password-filebtn rule missing entirely');
  }
  // Match either:
  //   border-style: dashed;
  //   border: 2px dashed var(--color-border);
  //   border-block-...: ... dashed ...;
  const hasDashed = rules.some(function (r) {
    return /border(-[a-z-]*)?\s*:\s*[^;}]*\bdashed\b/.test(r.body);
  });
  if (!hasDashed) {
    throw new Error('.backup-test-password-filebtn does not declare a dashed border (UAT-D6 fix missing)');
  }
});

test('UAT-D6: .backup-test-password-filebtn separates from password input below (margin-block-end / margin-bottom ≥ var(--space-md, 16px))', function () {
  const rules = findRule('.backup-test-password-filebtn');
  if (rules.length === 0) {
    throw new Error('.backup-test-password-filebtn rule missing entirely');
  }
  const hasSpacing = rules.some(function (r) {
    // var(--space-md, *) or var(--space-lg, *) or var(--space-xl, *) — anything ≥16px tokens
    if (/margin-(block-end|bottom)\s*:\s*var\(--space-(md|lg|xl)/.test(r.body)) return true;
    // Numeric fallback: 16px or larger
    const m = r.body.match(/margin-(block-end|bottom)\s*:\s*(\d+)\s*px/);
    if (m && parseInt(m[2], 10) >= 16) return true;
    // rem fallback: 1rem or larger
    const r2 = r.body.match(/margin-(block-end|bottom)\s*:\s*(\d+(\.\d+)?)\s*rem/);
    if (r2 && parseFloat(r2[2]) >= 1) return true;
    return false;
  });
  if (!hasSpacing) {
    throw new Error('.backup-test-password-filebtn does not declare ≥16px margin-block-end / margin-bottom');
  }
});

// ─── UAT-D7 — Button-row gap inside backup modal ────────────────────
test('UAT-D7: at least one .backup-modal-section / button-row rule declares non-zero gap', function () {
  // Plan 02 already shipped .backup-modal-button-row { gap: var(--space-sm) } — keep that
  // baseline AND ensure either a section-level or actions-level rule reaffirms it so the
  // export+share row + Test-password row both have visible spacing.
  const candidates = [
    findRule('.backup-modal-section--export'),
    findRule('.backup-modal-section--import'),
    findRule('.backup-modal-section--test'),
    findRule('.backup-modal-actions'),
    findRule('.backup-modal-button-row'),
  ].flat();
  if (candidates.length === 0) {
    throw new Error('No section/action/button-row rule found — D7 fix missing');
  }
  const hasGap = candidates.some(function (r) {
    // gap: var(--space-sm, *) OR gap: 8px / 0.5rem / any non-zero token
    if (/\bgap\s*:\s*var\(--space-(xs|sm|md|lg|xl)/.test(r.body)) return true;
    const m = r.body.match(/\bgap\s*:\s*([\d.]+)\s*(px|rem|em)/);
    if (m && parseFloat(m[1]) > 0) return true;
    return false;
  });
  if (!hasGap) {
    throw new Error('No backup-modal-* rule declares a non-zero gap (UAT-D7 fix missing)');
  }
});

// ─── UAT-E1 — Cloud icon --fresh subordinated to gear current-page ──
test('UAT-E1: .backup-cloud-btn--fresh no longer uses background-color: var(--color-success-bg) as its primary fill', function () {
  const rules = findRule('.backup-cloud-btn--fresh');
  if (rules.length === 0) {
    throw new Error('.backup-cloud-btn--fresh rule missing entirely');
  }
  // The rule MUST exist, but it must NOT have a strong success-bg fill.
  // Acceptable shapes:
  //   Pattern A — background-color: transparent + border with success-border
  //   Pattern B — background-color: <different soft tint that is NOT --color-success-bg>
  const violations = rules.filter(function (r) {
    // A rule is a violation if it sets background-color: var(--color-success-bg)
    // (the original Phase 25 Plan 04 treatment that Ben flagged).
    return /background-color\s*:\s*var\(--color-success-bg\)/.test(r.body) ||
           /background\s*:\s*var\(--color-success-bg\)/.test(r.body);
  });
  if (violations.length > 0) {
    throw new Error('.backup-cloud-btn--fresh still uses background-color: var(--color-success-bg) — clashes with gear current-page green (UAT-E1)');
  }
});

test('UAT-E1: .backup-cloud-btn--fresh uses a ring or distinct treatment (transparent bg + success-border, or a different background token)', function () {
  const rules = findRule('.backup-cloud-btn--fresh');
  if (rules.length === 0) {
    throw new Error('.backup-cloud-btn--fresh rule missing entirely');
  }
  // Pattern A: background-color: transparent + border-color/border with success-border
  // Pattern B: background-color: var(--color-primary-soft) or another non-success-bg token
  const hasPatternA = rules.some(function (r) {
    const transparentBg = /background(-color)?\s*:\s*transparent/.test(r.body);
    const successBorder = /border(-color)?\s*:\s*[^;}]*var\(--color-success-border/.test(r.body) ||
                          /border\s*:\s*[^;}]*var\(--color-success/.test(r.body);
    return transparentBg && successBorder;
  });
  const hasPatternB = rules.some(function (r) {
    return /background-color\s*:\s*var\(--color-(primary-soft|surface-alt|surface-subtle)/.test(r.body);
  });
  if (!hasPatternA && !hasPatternB) {
    throw new Error('.backup-cloud-btn--fresh has neither Pattern A (transparent + success-border ring) nor Pattern B (alt token bg) — UAT-E1 fix incomplete');
  }
});

// ─── UAT-F1 — Photos buttons sized to content ───────────────────────
test('UAT-F1: #photosOptimizeBtn and #photosDeleteAllBtn have width: auto OR a non-100% max-width OR are inline', function () {
  // Either by direct ID rule or by a shared class rule (e.g., .photos-action-buttons button).
  // The .form-field container is `display: flex; flex-direction: column;` so without an
  // override the button stretches to 100% (cross-axis stretch). align-self: flex-start
  // OR width: auto + an explicit non-100% max-width counts as the fix.
  const direct = [
    findRule('#photosOptimizeBtn'),
    findRule('#photosDeleteAllBtn'),
  ].flat();
  if (direct.length === 0) {
    throw new Error('No rule found for #photosOptimizeBtn / #photosDeleteAllBtn — UAT-F1 fix missing');
  }
  const hasSizingFix = direct.some(function (r) {
    if (/\bwidth\s*:\s*auto\b/.test(r.body)) return true;
    if (/\balign-self\s*:\s*(flex-start|start|center|flex-end|end)\b/.test(r.body)) return true;
    if (/\bdisplay\s*:\s*inline(-flex|-block)?\b/.test(r.body)) return true;
    // max-width: token-value (anything not 100%) also acceptable
    const m = r.body.match(/\bmax-width\s*:\s*([\d.]+)\s*(px|rem|em)/);
    if (m && parseFloat(m[1]) > 0) return true;
    return false;
  });
  if (!hasSizingFix) {
    throw new Error('#photosOptimizeBtn / #photosDeleteAllBtn lack width:auto / align-self / max-width — buttons still stretch full-width');
  }
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log('Plan 25-13 CSS audit — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
