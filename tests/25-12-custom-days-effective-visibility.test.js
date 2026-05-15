/**
 * Phase 25 Plan 12 (post-UAT fix) — Bug 1: the custom-days wrapper must be
 * EFFECTIVELY HIDDEN when the frequency is not 'custom'.
 *
 * Why this exists in addition to 25-12-custom-days-visibility.test.js:
 *   The original test (25-12-custom-days-visibility) sets the `hidden`
 *   attribute via setAttribute('hidden', '') in a JS-stubbed DOM and
 *   asserts the attribute is present. That proves the HANDLER toggles
 *   the attribute, but it does NOT prove the browser actually HIDES the
 *   element — because `.form-field` carries `display: flex` in app.css
 *   (line 965), which has equal specificity to the UA `[hidden]` rule but
 *   wins because author stylesheets beat the UA stylesheet. Net effect:
 *   the wrapper stays VISIBLE in the live browser regardless of the
 *   hidden attribute. Ben reproduced this in Safari UAT on 2026-05-15.
 *
 * This test asserts the CSS rule needed to forcibly hide the wrapper
 * exists in assets/app.css. Specifically:
 *   - a selector matching `#scheduleCustomDaysWrapper[hidden]` (or a
 *     more-specific equivalent) MUST be present
 *   - its declarations MUST include `display: none` (the only thing that
 *     overrides `display: flex` from .form-field)
 *
 * MUST FAIL before the fix (no such rule exists today).
 *
 * Run: node tests/25-12-custom-days-effective-visibility.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');

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
// Find a rule that effectively hides #scheduleCustomDaysWrapper when
// the hidden attribute is set. Accept any of the following selectors
// (each is a valid way to override .form-field's display: flex):
//
//   1. #scheduleCustomDaysWrapper[hidden]
//   2. .form-field[hidden]      ← broader fix that covers other form-fields
//   3. [hidden]                 ← a global override (lowest specificity but
//                                  with !important it still wins)
//
// The declaration body MUST contain `display: none`. Optionally with
// !important if the selector is broad (since .form-field at line 965 has
// equal specificity to [hidden]).
// ────────────────────────────────────────────────────────────────────

function findEffectiveHideRule() {
  // Try the most specific selector first.
  const patterns = [
    {
      label: '#scheduleCustomDaysWrapper[hidden]',
      regex: /#scheduleCustomDaysWrapper\s*\[hidden\][^{]*\{([^}]*)\}/,
    },
    {
      label: '.form-field[hidden]',
      regex: /\.form-field\s*\[hidden\][^{]*\{([^}]*)\}/,
    },
    {
      label: '[hidden]',
      // Accept [hidden] as either the leading selector or part of a
      // compound list (e.g., `*[hidden], [hidden]`). The body must
      // include display:none — !important is required for this broad
      // selector to beat .form-field's display: flex.
      regex: /(?:^|[\s,])\[hidden\][^{]*\{([^}]*)\}/m,
    },
  ];
  for (const p of patterns) {
    const m = appCss.match(p.regex);
    if (m && /display\s*:\s*none\b/i.test(m[1])) {
      // If we matched the broadest [hidden] selector, require !important
      // (otherwise it would lose specificity to .form-field).
      if (p.label === '[hidden]' && !/!\s*important/i.test(m[1])) {
        continue;
      }
      return { matched: p.label, body: m[1] };
    }
  }
  return null;
}

test('app.css contains a rule that effectively hides #scheduleCustomDaysWrapper when [hidden]', () => {
  const rule = findEffectiveHideRule();
  if (!rule) {
    throw new Error(
      'No CSS rule found that overrides .form-field { display: flex } to hide the wrapper.\n' +
      '        Expected one of:\n' +
      '          • #scheduleCustomDaysWrapper[hidden] { display: none; }\n' +
      '          • .form-field[hidden] { display: none; }\n' +
      '          • [hidden] { display: none !important; }\n' +
      '        Without this, .form-field { display: flex } at app.css:965\n' +
      '        wins over the UA [hidden] rule and the wrapper stays visible.'
    );
  }
});

// ────────────────────────────────────────────────────────────────────
// Sanity-check: confirm the root cause is still present in app.css
// (i.e., `.form-field { display: flex }` exists). If a future refactor
// removes that, the override may no longer be necessary — but we still
// keep the override rule for safety, so this assertion is informative
// not load-bearing.
// ────────────────────────────────────────────────────────────────────

test('app.css still declares .form-field { display: flex } (root cause documentation)', () => {
  // Match the .form-field selector at top level (no descendant prefix).
  const re = /(?:^|\})\s*\.form-field\s*\{([^}]*)\}/;
  const m = appCss.match(re);
  if (!m) {
    // Not strictly required — the fix is robust regardless. Log only.
    console.log('        (note: .form-field rule not located — root cause may have been refactored away)');
    return;
  }
  if (!/display\s*:\s*flex\b/i.test(m[1])) {
    console.log('        (note: .form-field no longer uses display: flex — override may be optional)');
  }
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log('Plan 25-12 custom-days-effective-visibility tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
