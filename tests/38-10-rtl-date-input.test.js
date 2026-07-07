/**
 * Phase 38 Plan 10 — RTL native date-input segment-order fix (UAT test 6).
 *
 * SOURCE-PRESENCE GATE (behavior-verification rule): this is a WebKit-only
 * visual defect — in Hebrew (RTL) mode WebKit lays out the internal
 * `::-webkit-datetime-edit` sub-fields in the document's inherited `direction:
 * rtl`, visually reversing the browser-native mm/dd/yyyy run into yyyy/dd/mm.
 * jsdom/Chromium cannot render-test this, so the automated gate asserts the two
 * CSS rules are PRESENT in real (non-comment) source; the real visual proof is
 * the Task 2 human checkpoint in on-device Safari.
 *
 * Grep-gate hygiene: the CSS source is stripped of block comments BEFORE
 * matching, so a rule named only inside an explanatory comment cannot satisfy
 * the gate.
 *
 * Asserts:
 *   (1) a base rule `input[type="date"] { … direction: ltr … }` — forces the
 *       browser/OS-native segment order regardless of the RTL base direction.
 *   (2) an RTL-scoped rule `html[dir="rtl"] input[type="date"] { … text-align:
 *       right … }` — pins the (now LTR) value block under the right-aligned
 *       Hebrew label. This rule must add text-align ONLY (no direction here).
 *
 * Run: node tests/38-10-rtl-date-input.test.js
 * Exits 0 on full pass, 1 on any failure (tests/run-all.js auto-discovers it).
 */

'use strict';

const fs = require('fs');
const path = require('path');

function readSource(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

// Strip CSS block comments (/* … */) so a rule mentioned only in a comment
// cannot satisfy the gate. CSS has no line comments, so this is sufficient.
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

const cssSrc = stripComments(readSource('assets/app.css'));

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

// ─── Test 1: base direction:ltr rule on the native date input ────────
// Tolerant: allow arbitrary whitespace and sibling declarations in the block.
// The RTL rule also contains `input[type="date"]` but its body sets only
// text-align (no direction:ltr), so it cannot satisfy this pattern.
const BASE_DIRECTION_LTR = /input\[type=["']date["']\]\s*\{[^}]*\bdirection\s*:\s*ltr\b[^}]*\}/;

test('assets/app.css has input[type="date"] { direction: ltr } (native segment order)', function () {
  if (!BASE_DIRECTION_LTR.test(cssSrc)) {
    throw new Error('missing base rule `input[type="date"] { direction: ltr }` — WebKit will keep reversing the RTL datetime-edit sub-fields');
  }
});

// ─── Test 2: RTL-scoped text-align:right override ────────────────────
const RTL_TEXT_ALIGN_RIGHT = /html\[dir=["']rtl["']\]\s+input\[type=["']date["']\]\s*\{[^}]*\btext-align\s*:\s*right\b[^}]*\}/;

test('assets/app.css has html[dir="rtl"] input[type="date"] { text-align: right } (value under Hebrew label)', function () {
  if (!RTL_TEXT_ALIGN_RIGHT.test(cssSrc)) {
    throw new Error('missing RTL rule `html[dir="rtl"] input[type="date"] { text-align: right }` — LTR value would not align under the right-aligned Hebrew label');
  }
});

// ─── Report ──────────────────────────────────────────────────────────
console.log('');
console.log('Plan 38-10 rtl-date-input tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
