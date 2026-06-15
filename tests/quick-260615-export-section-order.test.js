/**
 * Quick 260615 Bug #2 — Behavior test: exported / copied session sections are
 * emitted in the SAME order as the add-session form (its on-screen layout),
 * not in an independent hand-maintained order.
 *
 * PRODUCTION BUG (reported in Hebrew): the therapist put text in
 * "כלים ושיטות נוספות" (additionalTech) and it appeared in the export, but in
 * the wrong place — between "trapped emotions" and the section after it —
 * instead of matching the add-session page order (it should be the 3rd heading
 * for that session). Root cause: buildFilteredSessionMarkdown() (export) and
 * buildSessionMarkdown() (copy) emitted `insights` LAST, after `additionalTech`,
 * while the form DOM order is trapped → insights → limitingBeliefs →
 * additionalTech.
 *
 * SOURCE OF TRUTH = the add-session form. add-session.html declares the section
 * order via `data-section-key` attributes. This test derives the canonical
 * order from the HTML and asserts BOTH markdown builders emit their `## heading`
 * sections in that exact relative order — so the two can never silently drift
 * again.
 *
 * FALSIFIABLE (project convention MEMORY:feedback-behavior-verification):
 *   - BEFORE the fix: builders emit insights after additionalTech → FAILS.
 *   - AFTER  the fix: insights precedes limitingBeliefs/additionalTech → PASSES.
 * The expected order is NOT hardcoded here — it is read from the form markup,
 * so this stays correct if the form is ever re-ordered.
 *
 * Run: node tests/quick-260615-export-section-order.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'add-session.html'), 'utf8');
const SRC = fs.readFileSync(path.join(ROOT, 'assets', 'add-session.js'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err.message}`); failed++; }
}

// ── Canonical order: the sequence of data-section-key in add-session.html ──
function domSectionOrder() {
  const re = /data-section-key="([a-zA-Z]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(HTML)) !== null) out.push(m[1]);
  return out;
}

// ── Slice a named IIFE-internal function body out of the source ──
function functionBody(name) {
  const start = SRC.indexOf('function ' + name + '(');
  assert.ok(start !== -1, `could not find function ${name}() in add-session.js`);
  // body ends at the next top-level "\n  function " declaration (2-space indent)
  const after = SRC.indexOf('\n  function ', start + 1);
  return SRC.slice(start, after === -1 ? undefined : after);
}

// ── The order a builder emits headings = order of getSectionLabel("key", …) ──
function emittedOrder(body) {
  const re = /getSectionLabel\(\s*["']([a-zA-Z]+)["']/g;
  const out = [];
  let m;
  while ((m = re.exec(body)) !== null) {
    if (!out.includes(m[1])) out.push(m[1]); // first occurrence wins
  }
  return out;
}

const DOM = domSectionOrder();

// ────────────────────────────────────────────────────────────────────
// Test A — sanity: the form exposes the keys we care about, in a known order
// ────────────────────────────────────────────────────────────────────
test('A: add-session form DOM lists insights BEFORE limitingBeliefs & additionalTech', () => {
  ['trapped', 'insights', 'limitingBeliefs', 'additionalTech'].forEach((k) => {
    assert.ok(DOM.includes(k), `form is missing data-section-key="${k}"`);
  });
  assert.ok(DOM.indexOf('insights') < DOM.indexOf('limitingBeliefs'),
    'precondition: form has insights before limitingBeliefs');
  assert.ok(DOM.indexOf('limitingBeliefs') < DOM.indexOf('additionalTech'),
    'precondition: form has limitingBeliefs before additionalTech');
});

// ────────────────────────────────────────────────────────────────────
// Test B — buildFilteredSessionMarkdown (the export PDF) matches form order
// ────────────────────────────────────────────────────────────────────
test('B: buildFilteredSessionMarkdown emits sections in form (DOM) order', () => {
  const order = emittedOrder(functionBody('buildFilteredSessionMarkdown'));
  const expected = DOM.filter((k) => order.includes(k));
  assert.deepStrictEqual(order, expected,
    `export section order\n   got: ${order.join(' → ')}\n   exp: ${expected.join(' → ')}`);
});

// ────────────────────────────────────────────────────────────────────
// Test C — buildSessionMarkdown (the copy-to-clipboard path) matches too
// ────────────────────────────────────────────────────────────────────
test('C: buildSessionMarkdown emits sections in form (DOM) order', () => {
  const order = emittedOrder(functionBody('buildSessionMarkdown'));
  const expected = DOM.filter((k) => order.includes(k));
  assert.deepStrictEqual(order, expected,
    `copy section order\n   got: ${order.join(' → ')}\n   exp: ${expected.join(' → ')}`);
});

// ────────────────────────────────────────────────────────────────────
// Test D — the reported symptom specifically: insights precedes additionalTech
//          in both builders (the exact regression that put additionalTech too
//          early relative to insights/"physical imbalance").
// ────────────────────────────────────────────────────────────────────
test('D: both builders place insights before additionalTech', () => {
  ['buildFilteredSessionMarkdown', 'buildSessionMarkdown'].forEach((fn) => {
    const order = emittedOrder(functionBody(fn));
    assert.ok(order.indexOf('insights') < order.indexOf('additionalTech'),
      `${fn}: insights (${order.indexOf('insights')}) must come before ` +
      `additionalTech (${order.indexOf('additionalTech')})`);
  });
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
