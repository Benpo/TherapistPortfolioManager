/**
 * Quick task 260722-rew Task 3 — Behavior test for validatePrefix helper.
 *
 * Pure-function test: loads assets/settings-snippets.js in a vm sandbox, reads
 * validatePrefix from window.__SnippetEditorHelpers.
 *
 * Falsifiable: PRE-change, validatePrefix is undefined (RED) and the prefix
 * denylist accepts the inline formatting markers (* _ ~ `). POST-change, those
 * markers are rejected as prefix characters — they are word-boundary characters
 * in the detection engine (snippets.js detectTrigger), so a marker prefix would
 * collide with toolbar formatting (e.g. prefix "*" inside **bold**).
 *
 * Run: node tests/quick-260722-rew-prefix-formatting-chars.test.js
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

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings-snippets.js'), 'utf8');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/settings-snippets.js' });
} catch (err) {
  console.error('FATAL: assets/settings-snippets.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const helpers = sandbox.window.__SnippetEditorHelpers;
if (!helpers || typeof helpers.validatePrefix !== 'function') {
  console.error('FAIL: window.__SnippetEditorHelpers.validatePrefix is not exposed.');
  console.error('      The prefix validator must be a module-scoped pure helper');
  console.error('      exported via window.__SnippetEditorHelpers for tests.');
  process.exit(1);
}
const validatePrefix = helpers.validatePrefix;

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS: ' + name);
  } catch (err) {
    failed++;
    console.error('  FAIL: ' + name);
    console.error('        ' + err.message);
  }
}
function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(label + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}

const INVALID = 'snippets.prefix.error.invalidChar';
const LENGTH = 'snippets.prefix.error.length';

// ── Formatting markers rejected (the new rule) ─────────────────────────────
test('rejects "*" (bold/italic marker)', () => assertEqual(validatePrefix('*'), INVALID, '*'));
test('rejects "_" (italic marker)', () => assertEqual(validatePrefix('_'), INVALID, '_'));
test('rejects "~" (strikethrough marker)', () => assertEqual(validatePrefix('~'), INVALID, '~'));
test('rejects "`" (code marker)', () => assertEqual(validatePrefix('`'), INVALID, '`'));
test('rejects "**" (two-char marker prefix)', () => assertEqual(validatePrefix('**'), INVALID, '**'));
test('rejects "?*" (marker anywhere in the prefix)', () => assertEqual(validatePrefix('?*'), INVALID, '?*'));
test('rejects "_?" (marker anywhere in the prefix)', () => assertEqual(validatePrefix('_?'), INVALID, '_?'));

// ── Existing denylist unchanged (regression) ───────────────────────────────
test('rejects letter "a"', () => assertEqual(validatePrefix('a'), INVALID, 'a'));
test('rejects digit "7"', () => assertEqual(validatePrefix('7'), INVALID, '7'));
test('rejects whitespace "; "', () => assertEqual(validatePrefix('; '), INVALID, '; '));
test('rejects quote "\\""', () => assertEqual(validatePrefix('"'), INVALID, '"'));
test('rejects angle bracket "<"', () => assertEqual(validatePrefix('<'), INVALID, '<'));
test('rejects empty string (length)', () => assertEqual(validatePrefix(''), LENGTH, 'empty'));
test('rejects 3-char ";;;" (length)', () => assertEqual(validatePrefix(';;;'), LENGTH, ';;;'));
test('rejects non-string (length)', () => assertEqual(validatePrefix(null), LENGTH, 'null'));

// ── Valid prefixes still accepted (regression) ─────────────────────────────
test('accepts ";" (default)', () => assertEqual(validatePrefix(';'), null, ';'));
test('accepts "??"', () => assertEqual(validatePrefix('??'), null, '??'));
test('accepts "!"', () => assertEqual(validatePrefix('!'), null, '!'));
test('accepts "#"', () => assertEqual(validatePrefix('#'), null, '#'));
test('accepts "++"', () => assertEqual(validatePrefix('++'), null, '++'));

// ── Helper copy names the markers in every locale ──────────────────────────
// The UI hint must not promise characters the validator now rejects. Each
// locale's snippets.prefix.helper string must mention the marker set.
['en', 'he', 'de', 'cs'].forEach((lang) => {
  test('i18n-' + lang + ' helper copy names the formatting markers', () => {
    const i18nSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'i18n-' + lang + '.js'), 'utf8');
    const line = i18nSrc.split('\n').find((l) => l.includes('"snippets.prefix.helper"'));
    if (!line) throw new Error('snippets.prefix.helper key missing in i18n-' + lang + '.js');
    if (!line.includes('* _ ~ `')) {
      throw new Error('helper copy does not name the formatting markers (* _ ~ `)');
    }
  });
});

console.log('');
console.log('Prefix-formatting-chars tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
