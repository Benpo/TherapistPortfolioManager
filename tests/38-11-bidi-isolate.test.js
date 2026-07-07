/**
 * Phase 38 Plan 11 — bidi First-Strong-Isolate RED spec (authored BEFORE the fix).
 *
 * Pins the Hebrew RTL name+date scramble (UAT test 7). In Hebrew mode with a
 * month-name date format, date-format.js returns a BARE mixed-direction string
 * ("16 במאי 2026" — only NUMERIC formats are LRI/PDI-isolated, D-07), so an
 * un-isolated Latin client name adjacent to that bare date under html[dir=rtl]
 * gets reordered by the Unicode Bidi Algorithm into "2026 במאי dgh • 16".
 *
 * The fix (Plan 38-11): a shared window.DateFormat.isolate(str) First-Strong
 * Isolate helper (U+2068 … U+2069) wrapping each mixed run at every string
 * composition site (updateSessionTitle heading + document.title; overview
 * session-meta date; client-modal parts).
 *
 * Two parts:
 *   PART A — helper BEHAVIOR, executed against the real module in a vm sandbox
 *            (per MEMORY feedback-behavior-verification: run the code, don't
 *            assert on source text for behavior).
 *   PART B — per-call-site SOURCE gates (shape guard, comment-stripped) so a
 *            site cannot silently skip isolation.
 *
 * Run: node tests/38-11-bidi-isolate.test.js
 * Exits 0 on full pass, 1 on any failure. RED until Plan 38-11 lands.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var REPO_ROOT = path.resolve(__dirname, '..');

// First-Strong Isolate / Pop Directional Isolate — built by codepoint so this
// test source stays free of raw invisible control characters.
var FSI = String.fromCharCode(0x2068);
var PDI = String.fromCharCode(0x2069);

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (e) { console.log('  FAIL  ' + name); console.log('        ' + (e && e.message || e)); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function countChar(str, ch) {
  var n = 0;
  for (var i = 0; i < str.length; i++) if (str.charCodeAt(i) === ch.charCodeAt(0)) n++;
  return n;
}

function readSource(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

// Strip block comments (/* … */) then line comments (// …) so a reference that
// lives only in a comment cannot satisfy a presence gate (grep-gate hygiene).
function stripJsComments(src) {
  var out = src.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/\/\/[^\n]*(\n|$)/g, '\n');
  return out;
}

// ---------------------------------------------------------------------------
// Load the REAL date-format.js into a vm sandbox (mirrors 37-date-format.test.js
// loadEngine — a minimal window/global; the pure helper needs no DOM). Against
// the current tree window.DateFormat.isolate is undefined => Part A fails RED.
// ---------------------------------------------------------------------------
function loadDateFormat() {
  var sandbox = {
    window: {},
    console: { log: function () {}, warn: function () {}, error: function () {} },
    localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
    String: String, Number: Number, Boolean: Boolean, Date: Date, Array: Array,
    Object: Object, Math: Math, RegExp: RegExp, JSON: JSON, Intl: Intl,
  };
  vm.createContext(sandbox);
  var dfPath = path.join(REPO_ROOT, 'assets', 'date-format.js');
  vm.runInContext(fs.readFileSync(dfPath, 'utf8'), sandbox, { filename: 'assets/date-format.js' });
  return sandbox.window.DateFormat;
}

console.log('Phase 38 Plan 11 bidi-isolate spec\n');

var DateFormat = loadDateFormat();

// ── PART A — helper behavior ────────────────────────────────────────────────
test('A1: DateFormat.isolate is a function', function () {
  assert(DateFormat && typeof DateFormat.isolate === 'function',
    'window.DateFormat.isolate is not a function — helper not implemented yet (expected RED before Plan 38-11)');
});

test('A2: isolate("dgh") wraps with FSI (U+2068) … PDI (U+2069)', function () {
  assert(typeof DateFormat.isolate === 'function', 'isolate missing');
  var out = DateFormat.isolate('dgh');
  assert(out === FSI + 'dgh' + PDI, 'expected FSI+"dgh"+PDI, got ' + JSON.stringify(out));
});

test('A3: isolate("16 במאי 2026") wraps the bare mixed month-name date run', function () {
  assert(typeof DateFormat.isolate === 'function', 'isolate missing');
  var mixed = '16 ' + 'במאי' + ' 2026'; // "16 במאי 2026"
  var out = DateFormat.isolate(mixed);
  assert(out === FSI + mixed + PDI, 'expected FSI+mixed+PDI, got ' + JSON.stringify(out));
});

test('A4: empty/nullish returns "" (never a bare pair of isolate chars)', function () {
  assert(typeof DateFormat.isolate === 'function', 'isolate missing');
  assert(DateFormat.isolate('') === '', 'isolate("") must be ""');
  assert(DateFormat.isolate(null) === '', 'isolate(null) must be ""');
  assert(DateFormat.isolate(undefined) === '', 'isolate(undefined) must be ""');
});

test('A5: composed line has exactly two FSI + two PDI with " • " between the isolated runs', function () {
  assert(typeof DateFormat.isolate === 'function', 'isolate missing');
  var mixed = '16 ' + 'במאי' + ' 2026';
  var line = DateFormat.isolate('dgh') + ' • ' + DateFormat.isolate(mixed);
  assert(countChar(line, FSI) === 2, 'expected exactly two U+2068, got ' + countChar(line, FSI));
  assert(countChar(line, PDI) === 2, 'expected exactly two U+2069, got ' + countChar(line, PDI));
  // The " • " separator must sit BETWEEN the two isolated runs: after the first
  // PDI and before the second FSI.
  var firstPdi = line.indexOf(PDI);
  var secondFsi = line.indexOf(FSI, firstPdi);
  var bulletAt = line.indexOf('•');
  assert(bulletAt > firstPdi && bulletAt < secondFsi,
    'separator must sit between the two isolated runs');
});

// ── PART B — per-call-site source gates (comment-stripped) ──────────────────
test('B1: add-session.js updateSessionTitle isolates BOTH clientName and dateText', function () {
  var src = stripJsComments(readSource('assets/add-session.js'));
  assert(src.indexOf('DateFormat.isolate(clientName)') !== -1,
    'add-session.js must isolate clientName via DateFormat.isolate(clientName)');
  assert(src.indexOf('DateFormat.isolate(dateText)') !== -1,
    'add-session.js must isolate dateText via DateFormat.isolate(dateText)');
});

test('B2: overview.js isolates its mixed runs (session-meta date + client-modal parts) — DateFormat.isolate( appears >= 2x', function () {
  var src = stripJsComments(readSource('assets/overview.js'));
  var count = src.split('DateFormat.isolate(').length - 1;
  assert(count >= 2, 'expected DateFormat.isolate( at least twice in overview.js code, found ' + count);
});

// ── End-of-file vacuous-green guard ─────────────────────────────────────────
var EXPECTED_COUNT = 7;
if (passed + failed !== EXPECTED_COUNT) {
  console.error('\nGUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
    (passed + failed) + ' ran (vacuous-green trap).');
  process.exit(1);
}

console.log('');
console.log('Phase 38 Plan 11 bidi-isolate spec — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
