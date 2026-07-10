/**
 * docs-gate-role-table.test.js — self-consistency spec for the gate's role table.
 *
 * Authored BEFORE the role table exists. It pins the ONE invariant that keeps the
 * gate from bricking the repo it guards: a watched (user-facing) path must be
 * decided by BOTH a shipped-path test AND a code-extension test, and the role
 * table (denylist / satisfier / trigger / ignored) must never contradict itself.
 *
 * It fails RED today (scripts/lib/role-table.js is absent → require throws) and
 * flips to GREEN once the role table lands, with no edits here.
 *
 * Contract this spec pins for scripts/lib/role-table.js (CommonJS module):
 *   module.exports.classify(relPath) → one of:
 *     'trigger'    — a watched, user-facing file that RAISES the changelog/help
 *                    demand (a shipped path AND a code extension .js/.css/.html,
 *                    not denylisted, not a satisfier).
 *     'satisfier'  — help-content-*.js / changelog-content-*.js; these SATISFY a
 *                    demand and never raise one of their own.
 *     'denylisted' — a shipped surface deliberately carved out (legal + marketing
 *                    pages AND their scripts/styles).
 *     'ignored'    — everything else: non-code shipped files (images/fonts/.json/
 *                    .txt) and every non-shipped repo path (tests/**, scripts/**,
 *                    package.json, .github/**, .planning/**).
 *   module.exports.DENYLIST → array of repo-relative denylisted paths.
 *
 * The load-bearing point: an EXTENSION-ONLY rule would classify all 160+
 * tests/*.js and the gate's own scripts/*.js as triggers — every one an uncovered
 * file that blocks the gate's own ship and every push after. The PATH axis below
 * is exactly what prevents that. An extension-only implementation MUST go RED.
 *
 * Run: node tests/docs-gate-role-table.test.js
 * Exits 0 on full pass, non-zero on any failure (RED until the role table ships).
 */

'use strict';

var fs = require('fs');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..');

var RT = null, LOAD_ERR = null;
try {
  RT = require('../scripts/lib/role-table.js');
} catch (e) {
  LOAD_ERR = e;
}

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (e) { console.log('  FAIL  ' + name); console.log('        ' + (e && e.message || e)); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// Every assertion goes through this so an absent module produces a clear RED
// (not a hard crash that aborts before the summary prints).
function classify(p) {
  assert(RT && typeof RT.classify === 'function',
    'scripts/lib/role-table.js did not export classify() — ' +
    (LOAD_ERR ? LOAD_ERR.message : 'module present but no classify') +
    ' (expected RED until it ships)');
  return RT.classify(p);
}
function denylist() {
  assert(RT && Array.isArray(RT.DENYLIST),
    'scripts/lib/role-table.js did not export a DENYLIST array (expected RED until it ships)');
  return RT.DENYLIST;
}

console.log('docs-gate role-table self-consistency spec\n');

// ── Extension axis: non-code shipped files are ignored ───────────────────────
test('extension axis: an image under assets/ is ignored', function () {
  assert(classify('assets/branding/logo.png') === 'ignored',
    'a .png must be ignored (no covers[] can ever name it)');
});
test('extension axis: a shipped .json data file is ignored', function () {
  assert(classify('assets/demo-seed-data.json') === 'ignored',
    'a shipped .json data file must be ignored');
});

// ── PATH axis: code files that DO NOT ship are ignored ───────────────────────
// (This is the axis an extension-only implementation gets wrong.)
var IGNORED_BY_PATH = [
  'tests/help-integrity.test.js',
  'scripts/docs-gate.js',
  'scripts/lib/role-table.js',
  'package.json',
  '.github/workflows/deploy.yml',
  '.planning/ROADMAP.md',
];
IGNORED_BY_PATH.forEach(function (p) {
  test('path axis: "' + p + '" is ignored (a .js/.yml/.json that never ships)', function () {
    assert(classify(p) === 'ignored',
      '"' + p + '" must be ignored — an extension-only rule wrongly makes it a trigger and bricks the gate');
  });
});

// ── The two named root singletons ARE watched despite living at the root ─────
test('singleton: manifest.json is a trigger', function () {
  assert(classify('manifest.json') === 'trigger', 'manifest.json ships and is watched');
});
test('singleton: sw.js is a trigger', function () {
  assert(classify('sw.js') === 'trigger', 'sw.js ships and is watched');
});

// ── A representative watched code file IS a trigger (both axes satisfied) ─────
test('watched: assets/app.js is a trigger (shipped path AND code extension)', function () {
  assert(classify('assets/app.js') === 'trigger', 'assets/app.js is a shipped .js — a trigger');
});
test('watched: a page-level .html is a trigger', function () {
  assert(classify('add-session.html') === 'trigger', 'a shipped app page is a trigger');
});
test('watched: a shipped .css is a trigger', function () {
  assert(classify('assets/app.css') === 'trigger', 'a shipped, non-denylisted stylesheet is a trigger');
});

// ── Satisfiers are never triggers ────────────────────────────────────────────
var SATISFIERS = [
  'assets/help-content-en.js',
  'assets/changelog-content-en.js',
];
SATISFIERS.forEach(function (p) {
  test('satisfier: "' + p + '" classifies as satisfier, never trigger', function () {
    var role = classify(p);
    assert(role !== 'trigger', '"' + p + '" must not raise its own demand');
    assert(role === 'satisfier', '"' + p + '" must classify as "satisfier", got "' + role + '"');
  });
});

// ── Self-consistency: no path is BOTH denylisted AND a trigger ───────────────
test('invariant: every DENYLIST entry classifies as denylisted (never trigger)', function () {
  var dl = denylist();
  assert(dl.length > 0, 'DENYLIST must be non-empty');
  dl.forEach(function (p) {
    var role = classify(p);
    assert(role === 'denylisted',
      'DENYLIST entry "' + p + '" classifies as "' + role + '" — a path cannot be both denylisted and watched');
  });
});

// ── Self-consistency: the marketing/legal pages ARE denylisted ───────────────
var EXPECT_DENYLISTED = [
  'landing.html', 'demo.html',
  'assets/landing.js', 'assets/demo.js', 'assets/demo-seed.js',
  'assets/disclaimer.js', 'assets/i18n-disclaimer.js',
  'assets/landing.css', 'assets/demo.css',
];
EXPECT_DENYLISTED.forEach(function (p) {
  test('denylisted: "' + p + '" (marketing/legal surface, page + script + style)', function () {
    assert(classify(p) === 'denylisted', '"' + p + '" must be denylisted');
  });
});

// ── Every denylisted path is a real shipped file (no dangling entries) ───────
test('invariant: every DENYLIST entry is a real file on disk', function () {
  var dl = denylist();
  dl.forEach(function (p) {
    assert(fs.existsSync(path.join(REPO_ROOT, p)),
      'DENYLIST names "' + p + '" but no such file exists — a dangling denylist entry');
  });
});

console.log('');
console.log('docs-gate role-table self-consistency spec — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
