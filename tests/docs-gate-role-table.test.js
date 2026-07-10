/**
 * docs-gate-role-table.test.js — self-consistency spec for the gate's role table.
 *
 * Authored BEFORE the role table exists. It pins the ONE invariant that keeps the
 * gate from bricking the repo it guards: a watched (user-facing) path must be
 * decided by BOTH a shipped-path test AND a code-extension test, and the role
 * table (denylist / satisfier / trigger / ignored) must never contradict itself.
 *
 * Authored RED-first, before scripts/lib/role-table.js existed (require then threw);
 * GREEN now that the role table ships. The load-error guard remains as harness
 * self-defense so a future deletion fails RED for the right reason.
 *
 * Contract this spec pins for scripts/lib/role-table.js (CommonJS module):
 *   module.exports.classify(relPath) → one of:
 *     'trigger'        — a watched, user-facing file that RAISES BOTH the changelog
 *                        AND per-file help demand (a shipped path AND a code
 *                        extension .js/.css/.html, not denylisted, not a satisfier,
 *                        not changelog-only).
 *     'changelog_only' — recurring plumbing + the docs-system machinery: raises the
 *                        push-global CHANGELOG demand but is EXEMPT from the per-file
 *                        help demand (never needs a Help-Unaffected trailer).
 *     'satisfier'      — help-content-*.js / changelog-content-*.js; these SATISFY a
 *                        demand and never raise one of their own.
 *     'denylisted'     — a shipped surface deliberately carved out (legal + marketing
 *                        pages AND their scripts/styles).
 *     'ignored'        — everything else: non-code shipped files (images/fonts/.json/
 *                        .txt) and every non-shipped repo path (tests/**, scripts/**,
 *                        package.json, .github/**, .planning/**).
 *   module.exports.DENYLIST → array of repo-relative denylisted paths.
 *   module.exports.CHANGELOG_ONLY → array of repo-relative changelog-only paths.
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
function changelogOnly() {
  assert(RT && Array.isArray(RT.CHANGELOG_ONLY),
    'scripts/lib/role-table.js did not export a CHANGELOG_ONLY array (expected RED until it ships)');
  return RT.CHANGELOG_ONLY;
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
// (app.js / app.css are changelog-only; reporting.* is denylisted PoC; tour.* is
// changelog-only — so a feature-bearing file such as sessions.js keeps the full
// trigger role.)
test('watched: assets/sessions.js is a trigger (shipped path AND code extension)', function () {
  assert(classify('assets/sessions.js') === 'trigger', 'assets/sessions.js is a feature-bearing shipped .js — a trigger');
});
test('watched: a page-level .html is a trigger', function () {
  assert(classify('add-session.html') === 'trigger', 'a shipped app page is a trigger');
});
test('watched: a shipped .css is a trigger', function () {
  assert(classify('assets/globe-lang.css') === 'trigger', 'a shipped, non-denylisted, non-changelog-only stylesheet is a trigger');
});

// ── CHANGELOG-ONLY role: watched, demands a changelog, exempt from help ──────
// Recurring plumbing and the docs-system machinery classify as 'changelog_only':
// they raise the push-global changelog demand but never the per-file help demand.
var EXPECT_CHANGELOG_ONLY = [
  // Recurring plumbing.
  'assets/app.js', 'assets/app.css', 'assets/tokens.css', 'assets/shared-chrome.js',
  'assets/version.js',
  'assets/i18n-en.js', 'assets/i18n-he.js', 'assets/i18n-de.js', 'assets/i18n-cs.js',
  // Docs-system machinery.
  'help.html', 'assets/help.js', 'assets/help.css',
  'changelog.html', 'assets/changelog.js', 'assets/changelog.css',
  'assets/whats-new.js', 'assets/attention-coordinator.js',
  // Teaching-layer machinery (the guided tour).
  'assets/tour.js', 'assets/tour.css',
];
EXPECT_CHANGELOG_ONLY.forEach(function (p) {
  test('changelog-only: "' + p + '" classifies as changelog_only (changelog demand, help exempt)', function () {
    var role = classify(p);
    assert(role === 'changelog_only',
      '"' + p + '" must classify as "changelog_only", got "' + role + '"');
    assert(role !== 'trigger', '"' + p + '" must NOT raise the per-file help demand');
  });
});

test('changelog-only: the exported CHANGELOG_ONLY set matches the expected members exactly', function () {
  var actual = changelogOnly().slice().sort();
  var expect = EXPECT_CHANGELOG_ONLY.slice().sort();
  assert(actual.length === expect.length,
    'CHANGELOG_ONLY has ' + actual.length + ' entries, expected ' + expect.length);
  for (var i = 0; i < expect.length; i++) {
    assert(actual[i] === expect[i],
      'CHANGELOG_ONLY membership mismatch: got "' + actual[i] + '", expected "' + expect[i] + '"');
  }
});

test('changelog-only: has no duplicate entries', function () {
  var seen = {};
  changelogOnly().forEach(function (p) {
    assert(!seen[p], 'CHANGELOG_ONLY lists "' + p + '" more than once');
    seen[p] = true;
  });
});

test('changelog-only: every CHANGELOG_ONLY entry is a real file on disk', function () {
  changelogOnly().forEach(function (p) {
    assert(fs.existsSync(path.join(REPO_ROOT, p)),
      'CHANGELOG_ONLY names "' + p + '" but no such file exists — a dangling entry');
  });
});

test('changelog-only: is disjoint from DENYLIST and from the satisfier set', function () {
  var dl = new Set(denylist());
  changelogOnly().forEach(function (p) {
    assert(!dl.has(p), '"' + p + '" is in both CHANGELOG_ONLY and DENYLIST');
    assert(RT.isSatisfier(p) === false, '"' + p + '" is both changelog-only and a satisfier');
  });
});

test('changelog-only: no DENYLIST entry is also changelog-only', function () {
  var co = new Set(changelogOnly());
  denylist().forEach(function (p) {
    assert(!co.has(p), '"' + p + '" is in both DENYLIST and CHANGELOG_ONLY');
  });
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
  // PoC surfaces — carved out until productized (re-armed by deleting these lines).
  'reporting.html', 'assets/reporting.js',
];
EXPECT_DENYLISTED.forEach(function (p) {
  test('denylisted: "' + p + '" (marketing/legal/PoC surface carved out)', function () {
    assert(classify(p) === 'denylisted', '"' + p + '" must be denylisted');
  });
});

// ── Anchored per-kind satisfier predicates (WR-01 guard) ─────────────────────
// The gate consumes these instead of keeping its own unanchored regex. They MUST
// anchor to assets/ exactly like SATISFIER_RE — a non-assets/ decoy path with a
// satisfier basename must NOT satisfy, or an edit to such a decoy would silently
// waive the help/changelog demand for the whole range (the WR-01 fail-open).
function helpSat(p) {
  assert(RT && typeof RT.isHelpSatisfier === 'function',
    'scripts/lib/role-table.js did not export isHelpSatisfier() — ' +
    (LOAD_ERR ? LOAD_ERR.message : 'module present but no isHelpSatisfier'));
  return RT.isHelpSatisfier(p);
}
function changelogSat(p) {
  assert(RT && typeof RT.isChangelogSatisfier === 'function',
    'scripts/lib/role-table.js did not export isChangelogSatisfier() — ' +
    (LOAD_ERR ? LOAD_ERR.message : 'module present but no isChangelogSatisfier'));
  return RT.isChangelogSatisfier(p);
}

test('anchor: isHelpSatisfier is true for assets/help-content-en.js, false for a non-assets/ decoy', function () {
  assert(helpSat('assets/help-content-en.js') === true,
    'the real assets/ help content must be a help satisfier');
  assert(helpSat('tests/fixtures/help-content-en.js') === false,
    'a non-assets/ decoy path named like a satisfier must NOT satisfy (WR-01)');
});

test('anchor: isChangelogSatisfier is true for assets/changelog-content-en.js, false for a non-assets/ decoy', function () {
  assert(changelogSat('assets/changelog-content-en.js') === true,
    'the real assets/ changelog content must be a changelog satisfier');
  assert(changelogSat('x/changelog-content-en.js') === false,
    'a non-assets/ decoy path named like a satisfier must NOT satisfy (WR-01)');
});

test('anchor: satisfaction is EN-only — only the EN content file satisfies per kind', function () {
  assert(helpSat('assets/help-content-en.js') === true,
    'the EN help content is the corpus of record and must satisfy the help demand');
  assert(changelogSat('assets/changelog-content-en.js') === true,
    'the EN changelog content is the corpus of record and must satisfy the changelog demand');
  ['he', 'de', 'cs'].forEach(function (lang) {
    assert(helpSat('assets/help-content-' + lang + '.js') === false,
      'a locale-only help edit (' + lang + ') must NOT satisfy — EN is the corpus of record');
    assert(changelogSat('assets/changelog-content-' + lang + '.js') === false,
      'a locale-only changelog edit (' + lang + ') must NOT satisfy — EN is the corpus of record');
  });
});

test('locale content files still classify as satisfier (never a trigger), even though they do not satisfy the demand', function () {
  ['he', 'de', 'cs'].forEach(function (lang) {
    assert(classify('assets/help-content-' + lang + '.js') === 'satisfier',
      'help-content-' + lang + '.js must stay a non-triggering satisfier');
    assert(classify('assets/changelog-content-' + lang + '.js') === 'satisfier',
      'changelog-content-' + lang + '.js must stay a non-triggering satisfier');
  });
});

test('anchor: a help satisfier is not a changelog satisfier and vice-versa', function () {
  assert(helpSat('assets/help-content-en.js') === true &&
         changelogSat('assets/help-content-en.js') === false,
    'help content must not read as a changelog satisfier');
  assert(changelogSat('assets/changelog-content-en.js') === true &&
         helpSat('assets/changelog-content-en.js') === false,
    'changelog content must not read as a help satisfier');
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
