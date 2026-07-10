/**
 * docs-gate-version-parse.test.js — behavior spec for the shared release-moment
 * version extractor and the fifth docs-gate invariant (WR-06 / GATE-04).
 *
 * The failure class this pins: GATE-04 detects a release by parsing the
 * APP_VERSION literal in assets/version.js. If that literal is ever reformatted
 * so the extractor returns null, the release check silently and permanently
 * self-disables. These tests assert:
 *   1. extractAppVersion returns a non-null semver on the LIVE assets/version.js.
 *   2. extractAppVersion returns null on a DRIFTED blob (backtick-quoted literal).
 *   3. checkVersionParse() against the live repo returns quietly (no throw).
 *   4. checkVersionParse(tempRepoRoot) against a temp repo whose version.js has a
 *      drifted APP_VERSION literal THROWS, and the message names version.js and
 *      the extractor.
 *
 * A falsifiable behavior test (D-21): a format drift makes the invariant throw;
 * a valid literal makes it pass. Node built-ins only. No packages, no jsdom.
 *
 * Run: node tests/docs-gate-version-parse.test.js
 * Exits 0 on full pass, non-zero on any failure.
 */

'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');

var REPO_ROOT = path.resolve(__dirname, '..');

var versionParse = require('../scripts/lib/version-parse.js');
var invariants = require('../scripts/lib/invariants.js');

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (e) { console.log('  FAIL  ' + name); console.log('        ' + (e && e.message || e)); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

console.log('docs-gate version-parse + fifth-invariant spec\n');

// ── 1. extractAppVersion parses the LIVE version.js ──────────────────────────
test('extractAppVersion returns a non-null semver on the live assets/version.js', function () {
  var src = fs.readFileSync(path.join(REPO_ROOT, 'assets', 'version.js'), 'utf8');
  var v = versionParse.extractAppVersion(src);
  assert(typeof v === 'string' && /^\d+\.\d+\.\d+$/.test(v),
    'expected a semver string from the live version.js, got ' + JSON.stringify(v));
});

// ── 2. extractAppVersion returns null on a drifted (backtick) literal ─────────
test('extractAppVersion returns null on a backtick-quoted (drifted) literal', function () {
  assert(versionParse.extractAppVersion('var APP_VERSION = `1.3.0`;') === null,
    'a backtick-quoted APP_VERSION must not parse (the regex requires single/double quotes)');
});
test('extractAppVersion returns null on a renamed/absent literal', function () {
  assert(versionParse.extractAppVersion('var APP_REVISION = "1.3.0";') === null,
    'a renamed literal must not parse');
  assert(versionParse.extractAppVersion('') === null, 'empty input must return null');
  assert(versionParse.extractAppVersion(null) === null, 'falsy input must return null');
});

// ── 3. checkVersionParse against the live repo passes quietly ────────────────
test('checkVersionParse() against the live repo does not throw', function () {
  invariants.checkVersionParse(); // defaults to this install's own repo
  invariants.checkVersionParse(REPO_ROOT); // explicit root, same result
});

// ── 4a. checkVersionParse THROWS on a temp repo with a drifted literal ────────
test('checkVersionParse(tmpRoot) throws when version.js APP_VERSION is drifted', function () {
  var tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vparse-drift-'));
  try {
    fs.mkdirSync(path.join(tmpRoot, 'assets'), { recursive: true });
    // Backtick-quoted literal — the extractor rejects it (returns null).
    fs.writeFileSync(path.join(tmpRoot, 'assets', 'version.js'),
      'var APP_VERSION = `1.3.0`;\n', 'utf8');
    var threw = null;
    try { invariants.checkVersionParse(tmpRoot); }
    catch (e) { threw = e; }
    assert(threw, 'expected checkVersionParse to throw on a drifted version.js');
    assert(/version\.js/.test(threw.message),
      'the error message must name version.js — got: ' + threw.message);
    assert(/APP_VERSION|extractor/.test(threw.message),
      'the error message must name APP_VERSION / the extractor — got: ' + threw.message);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// ── 4b. checkVersionParse PASSES on a temp repo with a valid literal ──────────
test('checkVersionParse(tmpRoot) passes on a temp repo with a valid literal', function () {
  var tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vparse-ok-'));
  try {
    fs.mkdirSync(path.join(tmpRoot, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'assets', 'version.js'),
      "var APP_VERSION = '9.9.9';\n", 'utf8');
    var threw = null;
    try { invariants.checkVersionParse(tmpRoot); }
    catch (e) { threw = e; }
    assert(!threw, 'expected no throw on a valid literal — got: ' + (threw && threw.message));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// ── 4c. checkVersionParse THROWS (fail closed) when version.js is absent ──────
test('checkVersionParse(tmpRoot) throws when assets/version.js cannot be read', function () {
  var tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vparse-missing-'));
  try {
    // No assets/version.js written at all.
    var threw = null;
    try { invariants.checkVersionParse(tmpRoot); }
    catch (e) { threw = e; }
    assert(threw, 'expected checkVersionParse to fail closed on an unreadable version.js');
    assert(/version\.js/.test(threw.message),
      'the error message must name version.js — got: ' + threw.message);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

console.log('');
console.log('docs-gate version-parse spec — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
