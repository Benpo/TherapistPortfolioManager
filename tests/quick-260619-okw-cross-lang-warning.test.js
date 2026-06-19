/**
 * Quick task 260619-okw Task 2 — Behavior test for getCrossLangWarning helper.
 *
 * Pure-function test: loads assets/settings.js in a vm sandbox, reads
 * getCrossLangWarning from window.__SnippetEditorHelpers.
 *
 * Falsifiable: PRE-change, window.__SnippetEditorHelpers.getCrossLangWarning is
 * undefined (RED). POST-change, the show/otherLangs logic matches the spec (GREEN).
 *
 * getCrossLangWarning(snippet, currentLang) → { show:boolean, otherLangs:string[] }
 *   - show=true ONLY when snippet has expansions, expansions[currentLang] is
 *     empty/whitespace, AND ≥1 other LOCALES entry has non-empty text.
 *   - otherLangs = LOCALES order (he,en,cs,de) with non-empty text, minus currentLang.
 *
 * Run: node tests/quick-260619-okw-cross-lang-warning.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {
  window: {},
  document: {
    addEventListener() {},
    removeEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return { setAttribute() {}, appendChild() {}, append() {}, addEventListener() {}, classList: { add() {}, remove() {} } }; },
    body: { prepend() {}, appendChild() {} },
    head: { appendChild() {} },
  },
  console: { error() {}, warn() {}, log() {} },
  setTimeout, clearTimeout, Promise,
};
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings.js'), 'utf8');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/settings.js' });
} catch (err) {
  console.error('FATAL: assets/settings.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const helpers = sandbox.window.__SnippetEditorHelpers;
if (!helpers || typeof helpers.getCrossLangWarning !== 'function') {
  console.error('FAIL: window.__SnippetEditorHelpers.getCrossLangWarning is not exposed.');
  console.error('      Task 2 must add a getCrossLangWarning pure helper and export it');
  console.error('      via window.__SnippetEditorHelpers for tests.');
  process.exit(1);
}
const getCrossLangWarning = helpers.getCrossLangWarning;

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    failed++;
  }
}
function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`);
}

// ────────────────────────────────────────────────────────────────────

test('A. current "he" empty, en has text → show:true, otherLangs:["en"]', () => {
  const out = getCrossLangWarning({ expansions: { he: '', en: 'Hello', cs: '', de: '' } }, 'he');
  eq(out, { show: true, otherLangs: ['en'] }, 'A');
});

test('B. current "he" has text → show:false (warning suppressed even though en has text)', () => {
  const out = getCrossLangWarning({ expansions: { he: 'שלום', en: 'Hello', cs: '', de: '' } }, 'he');
  // show is the gate; otherLangs may still list populated others but the editor
  // only reads otherLangs when show is true.
  if (out.show !== false) throw new Error('B: expected show:false, got ' + JSON.stringify(out));
});

test('C. all expansions empty, current "he" → show:false (no other content)', () => {
  const out = getCrossLangWarning({ expansions: { he: '', en: '', cs: '', de: '' } }, 'he');
  eq(out, { show: false, otherLangs: [] }, 'C');
});

test('D. null snippet → show:false', () => {
  eq(getCrossLangWarning(null, 'he'), { show: false, otherLangs: [] }, 'D-null');
  eq(getCrossLangWarning(undefined, 'he'), { show: false, otherLangs: [] }, 'D-undefined');
  eq(getCrossLangWarning({}, 'he'), { show: false, otherLangs: [] }, 'D-no-expansions');
});

test('E. otherLangs follows LOCALES order (he,en,cs,de) and excludes currentLang', () => {
  // current "en" empty; he, cs, de all have text → ["he","cs","de"] in LOCALES order
  const out1 = getCrossLangWarning(
    { expansions: { he: 'שלום', en: '', cs: 'Ahoj', de: 'Hallo' } }, 'en');
  eq(out1, { show: true, otherLangs: ['he', 'cs', 'de'] }, 'E1');
  // current "en" empty; only cs + de have text → ["cs","de"]
  const out2 = getCrossLangWarning(
    { expansions: { he: '', en: '', cs: 'Ahoj', de: 'Hallo' } }, 'en');
  eq(out2, { show: true, otherLangs: ['cs', 'de'] }, 'E2');
  // include he case: current "de" empty; he + en have text → ["he","en"]
  const out3 = getCrossLangWarning(
    { expansions: { he: 'שלום', en: 'Hello', cs: '', de: '' } }, 'de');
  eq(out3, { show: true, otherLangs: ['he', 'en'] }, 'E3');
});

test('F. whitespace-only current expansion counts as empty', () => {
  const out = getCrossLangWarning({ expansions: { he: '   ', en: 'Hello', cs: '', de: '' } }, 'he');
  eq(out, { show: true, otherLangs: ['en'] }, 'F');
});

console.log('');
console.log(`Quick 260619-okw getCrossLangWarning tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
