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
 * Rule set (revised after 38-10 checkpoint round 2 — see app.css comment):
 * on-device Safari proved `text-align: right` has NO effect on the shrink-
 * wrapped ::-webkit-datetime-edit block (the value stayed at the LEFT edge), so
 * the RTL alignment is now done via BOX direction, not text-align.
 *
 * Asserts:
 *   (1) a base rule `input[type="date"] { … direction: ltr … }` — forces the
 *       browser/OS-native segment order by default.
 *   (2) an RTL-scoped rule `html[dir="rtl"] input[type="date"] { … direction:
 *       rtl … }` — makes the control's own box lay out RTL so its datetime-edit
 *       block sits at the inline-start = RIGHT edge, under the Hebrew label.
 *   (3) an RTL-scoped `::-webkit-datetime-edit` rule forcing `direction: ltr`
 *       on the inner sub-fields so the segments still render in native
 *       mm/dd/yyyy order despite the outer rtl direction from (2).
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
// Anchored to a NON-descendant selector (`\binput` at a rule boundary, i.e. not
// preceded by `] `), so the RTL `html[dir="rtl"] input[type="date"]` rule —
// whose body sets `direction: rtl` — cannot satisfy this base pattern.
const BASE_DIRECTION_LTR = /(^|[};])\s*input\[type=["']date["']\]\s*\{[^}]*\bdirection\s*:\s*ltr\b[^}]*\}/m;

test('assets/app.css has base input[type="date"] { direction: ltr } (native segment order)', function () {
  if (!BASE_DIRECTION_LTR.test(cssSrc)) {
    throw new Error('missing base rule `input[type="date"] { direction: ltr }` — WebKit will keep reversing the RTL datetime-edit sub-fields');
  }
});

// ─── Test 2: RTL-scoped box direction:rtl on the control ─────────────
// Positions the shrink-wrapped datetime-edit block at the inline-start = RIGHT
// edge (under the Hebrew label). Must NOT be the ::-webkit-datetime-edit rule
// (that one is direction:ltr), so exclude a `::` before the block.
const RTL_BOX_DIRECTION_RTL = /html\[dir=["']rtl["']\]\s+input\[type=["']date["']\]\s*\{[^}]*\bdirection\s*:\s*rtl\b[^}]*\}/;

test('assets/app.css has html[dir="rtl"] input[type="date"] { direction: rtl } (right-edge box alignment)', function () {
  if (!RTL_BOX_DIRECTION_RTL.test(cssSrc)) {
    throw new Error('missing RTL rule `html[dir="rtl"] input[type="date"] { direction: rtl }` — the value would hug the LEFT edge in Safari (text-align has no effect on the datetime-edit block)');
  }
});

// ─── Test 3: RTL-scoped ::-webkit-datetime-edit { direction: ltr } ───
// Keeps the inner sub-fields in native mm/dd/yyyy order despite the outer
// direction:rtl from Test 2.
const RTL_DATETIME_EDIT_LTR = /html\[dir=["']rtl["']\]\s+input\[type=["']date["']\]::-webkit-datetime-edit\s*\{[^}]*\bdirection\s*:\s*ltr\b[^}]*\}/;

test('assets/app.css has html[dir="rtl"] input[type="date"]::-webkit-datetime-edit { direction: ltr } (native segment order under rtl box)', function () {
  if (!RTL_DATETIME_EDIT_LTR.test(cssSrc)) {
    throw new Error('missing `html[dir="rtl"] input[type="date"]::-webkit-datetime-edit { direction: ltr }` — the outer rtl box would re-reverse the segments into yyyy/dd/mm');
  }
});

// ─── Report ──────────────────────────────────────────────────────────
console.log('');
console.log('Plan 38-10 rtl-date-input tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
