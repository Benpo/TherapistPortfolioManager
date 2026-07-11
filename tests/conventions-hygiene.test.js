/**
 * conventions-hygiene.test.js — offline source-audit pinning the DEBT-01
 * "stop the bleeding" edits: the CONVENTIONS.md §Comments root-cause rewrite and
 * the single runtime planning-ref leak in assets/add-client.js.
 *
 * WHY this spec exists: CONVENTIONS.md §Comments used to instruct every planner
 * and executor to "cite the phase and plan … do not omit". That instruction is
 * the root cause of internal planning IDs leaking into shipped assets/** — which
 * are served to customers WITH their comments, so an internal ID becomes both a
 * dangling reference (`.planning/` is archived per-milestone) and DevTools-visible
 * customer exposure. This phase rewrites §Comments to the strip-all-planning-IDs
 * rule and rewords the one runtime leak (the large-photo console.warn that printed
 * a decision-ID token). This test asserts both landed and cannot silently regress
 * within this phase.
 *
 * Scope is deliberately narrow (the phase ships NO enforcement gate — the forward
 * grep-gate + the ~680-line legacy retrofit travel together in v1.5):
 *   1. CONVENTIONS.md §Comments no longer carries the old citation mandate.
 *   2. CONVENTIONS.md §Comments now carries the strip-all-planning-IDs rule.
 *   3. The assets/add-client.js large-photo console.warn line carries no
 *      decision-ID token (`D-<n>`).
 * It does NOT blanket-scan CONVENTIONS.md for `D-` — the rewritten Don't-list
 * legitimately shows ID examples (D-NN, CR-NN) — and it does NOT scan the whole of
 * add-client.js, because other legacy planning refs there are the v1.5 retrofit's
 * job, not this phase's (only the console.warn is touched here).
 *
 * Authored RED-first: it fails until the Task-2 edits land, then goes GREEN.
 *
 * Mechanics: pure node built-ins, offline, no temp files, no child processes.
 * Run: node tests/conventions-hygiene.test.js
 * Exits 0 on full pass, non-zero on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..');
var CONVENTIONS = path.join(REPO_ROOT, '.planning', 'codebase', 'CONVENTIONS.md');
var ADD_CLIENT = path.join(REPO_ROOT, 'assets', 'add-client.js');

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (e) { console.log('  FAIL  ' + name); console.log('        ' + (e && e.message || e)); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function read(file) {
  assert(fs.existsSync(file), 'expected file to exist: ' + file);
  return fs.readFileSync(file, 'utf8');
}

// Isolate the §Comments section of CONVENTIONS.md so assertions target it and not
// the whole file. The section runs from the "## Comments" heading to the next
// top-level "## " heading (or EOF).
function commentsSection(md) {
  var lines = md.split('\n');
  var start = -1;
  for (var i = 0; i < lines.length; i++) {
    if (/^##\s+Comments\s*$/.test(lines[i])) { start = i; break; }
  }
  assert(start !== -1, 'CONVENTIONS.md must have a "## Comments" section heading');
  var end = lines.length;
  for (var j = start + 1; j < lines.length; j++) {
    if (/^##\s+/.test(lines[j])) { end = j; break; }
  }
  return lines.slice(start, end).join('\n');
}

console.log('conventions-hygiene source-audit\n');

// 1. Old citation mandate is gone. Both signature phrases of the root-cause
//    instruction must be absent from §Comments.
test('CONVENTIONS.md §Comments no longer instructs agents to cite the phase and plan', function () {
  var sec = commentsSection(read(CONVENTIONS));
  assert(!/cite the phase and plan/i.test(sec),
    '§Comments still contains the "cite the phase and plan" mandate');
  assert(!/primary\s+traceability mechanism/i.test(sec),
    '§Comments still contains the "primary traceability mechanism" mandate');
  assert(!/do not omit/i.test(sec),
    '§Comments still contains the "do not omit" mandate');
});

// 2. New strip-all-planning-IDs rule is present.
test('CONVENTIONS.md §Comments carries the strip-all-planning-IDs rule', function () {
  var sec = commentsSection(read(CONVENTIONS));
  assert(/carries no planning IDs?/i.test(sec),
    '§Comments must state that shipped code carries no planning IDs');
});

// 3. The add-client.js large-photo console.warn line carries no decision-ID token.
//    Scoped to that single line — the file's other legacy refs are the v1.5
//    retrofit's job, not this phase's.
test('assets/add-client.js large-photo console.warn prints no decision-ID token', function () {
  var src = read(ADD_CLIENT);
  var warnLines = src.split('\n').filter(function (l) {
    return /console\.warn\(/.test(l) && /Large photo upload/i.test(l);
  });
  assert(warnLines.length === 1,
    'expected exactly one large-photo console.warn line, found ' + warnLines.length);
  assert(!/\bD-\d+\b/.test(warnLines[0]),
    'the large-photo console.warn still prints a decision-ID token: ' + warnLines[0].trim());
});

console.log('');
console.log('conventions-hygiene source-audit — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
