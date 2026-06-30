/**
 * tests/35-demo-static.test.js — Phase 35 Plan 01 Task 2.
 *
 * WAVE-0 RED GATE — pure source/grep assertions (no jsdom) for the demo-home
 * convergence markers and the demo-hints dead-code removal (DEMO-01/02/08/09).
 *
 * WHAT THIS LOCKS (and why each is RED today):
 *   DEMO-01  demo.html must adopt the converged chrome host: an
 *            `id="headerActions"` container AND a `shared-chrome.js` <script>.
 *            Both ABSENT today → RED until 35-03.
 *   DEMO-02  demo.html must DROP the dead native `id="languageSelect"` picker.
 *            PRESENT today → RED until 35-03.
 *   DEMO-08  demo.html's brand-subtitle fallback must not say "therapeutic"
 *            (the product is energy-work; the i18n copy already says "energy").
 *            demo.html STILL hardcodes the "therapeutic" fallback → RED until
 *            35-03. Plus two GREEN-now regression guards: demo.html keeps
 *            `data-i18n="app.subtitle"`, and every i18n app.subtitle stays on
 *            the energy copy (must never revert to "therapeutic").
 *   DEMO-09  the dead demo-hints feature must be gone from the SHIPPED surface:
 *            zero `demo-hints` references across assets/ + sw.js + root *.html,
 *            AND assets/demo-hints.js must not exist. app.js (injector) and
 *            sw.js (precache) still reference it AND the file still exists →
 *            RED until 35-05.
 *
 * FALSIFIABILITY / anti-vacuous-green (gate hygiene):
 *   - Every assertion reads real file CONTENT (fs.readFileSync) or real file
 *     existence (fs.existsSync) and fails on a concrete string/shape.
 *   - The DEMO-09 repo scan is scoped to the shipped surface (assets/ + sw.js +
 *     root *.html) and DELIBERATELY excludes tests/ (so this file's own
 *     `demo-hints` literals cannot self-match), .planning/sketches/**, and
 *     .claude/worktrees/** (per the 35-RESEARCH reference map).
 *   - A final count guard asserts every case actually executed.
 *
 * Read-only: reads repo source; writes nothing.
 *
 * Run: node tests/35-demo-static.test.js
 * Exits 0 on full pass, 1 on any failure. RED (non-zero) is EXPECTED at Wave 0.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');

var REPO_ROOT = path.resolve(__dirname, '..');
function readFile(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(REPO_ROOT, rel)); }

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

var demoHtml = readFile('demo.html');

// ─── DEMO-01: converged chrome host markers in demo.html ─────────────────────
test('DEMO-01: demo.html declares id="headerActions" (converged chrome host)', function () {
  assert.ok(demoHtml.indexOf('id="headerActions"') !== -1,
    'demo.html must expose <div ... id="headerActions"> so App.initCommon injects the converged chrome (added by 35-03)');
});

test('DEMO-01: demo.html loads ./assets/shared-chrome.js (footer source)', function () {
  // Match the <script src="./assets/shared-chrome.js"> tag (quote-agnostic).
  assert.ok(/shared-chrome\.js/.test(demoHtml),
    'demo.html must include a <script src="./assets/shared-chrome.js"> tag so the converged footer renders (added by 35-03)');
});

// ─── DEMO-02: dead native language picker removed from demo.html ─────────────
test('DEMO-02: demo.html does NOT contain id="languageSelect" (dead native picker removed)', function () {
  assert.strictEqual(demoHtml.indexOf('id="languageSelect"'), -1,
    'the native <select id="languageSelect"> must be removed from demo.html (35-03) — the injected globe popover replaces it');
});

// ─── DEMO-08: terminology — no "therapeutic", keep i18n subtitle ─────────────
test('DEMO-08: demo.html does NOT contain the literal "therapeutic" (energy-work terminology)', function () {
  assert.strictEqual(demoHtml.indexOf('therapeutic'), -1,
    'demo.html still hardcodes the "therapeutic" brand-subtitle fallback — it must say energy-work copy (35-03)');
});

test('DEMO-08 (regression, green now): demo.html keeps data-i18n="app.subtitle"', function () {
  assert.ok(demoHtml.indexOf('data-i18n="app.subtitle"') !== -1,
    'demo.html must keep the data-i18n="app.subtitle" hook so the localized subtitle resolves');
});

// Each i18n app.subtitle must stay on the energy copy (must never revert to the
// "therapeutic" wording). Green now — guards against a regression during 35-03.
['i18n-en.js', 'i18n-he.js', 'i18n-de.js', 'i18n-cs.js'].forEach(function (file) {
  test('DEMO-08 (regression, green now): assets/' + file + ' app.subtitle is non-empty and not "therapeutic"', function () {
    var src = readFile('assets/' + file);
    var m = src.match(/"app\.subtitle"\s*:\s*"([^"]*)"/);
    assert.ok(m, 'assets/' + file + ' must define "app.subtitle"');
    var value = m[1];
    assert.ok(value.trim().length > 0, 'app.subtitle in assets/' + file + ' must be non-empty');
    assert.ok(!/therapeut/i.test(value),
      'app.subtitle in assets/' + file + ' must not use "therapeutic" wording (energy-work copy), got ' + JSON.stringify(value));
  });
});

// ─── DEMO-09: demo-hints dead-code gone from the shipped surface ─────────────

// Enumerate the SHIPPED surface only: every file under assets/ (recursively) +
// sw.js + root *.html. tests/, .planning/sketches/**, .claude/worktrees/**, and
// node_modules are NEVER scanned (so this file's own `demo-hints` literals and
// any sketch/worktree copies cannot self-match — gate-hygiene scoping).
function listShippedFiles() {
  var files = [];

  function walk(absDir) {
    var entries = fs.readdirSync(absDir, { withFileTypes: true });
    entries.forEach(function (ent) {
      var abs = path.join(absDir, ent.name);
      if (ent.isDirectory()) { walk(abs); }
      else if (ent.isFile()) { files.push(abs); }
    });
  }

  // assets/ recursively
  walk(path.join(REPO_ROOT, 'assets'));
  // sw.js
  var sw = path.join(REPO_ROOT, 'sw.js');
  if (fs.existsSync(sw)) { files.push(sw); }
  // root *.html (top-level only)
  fs.readdirSync(REPO_ROOT, { withFileTypes: true }).forEach(function (ent) {
    if (ent.isFile() && ent.name.endsWith('.html')) {
      files.push(path.join(REPO_ROOT, ent.name));
    }
  });

  return files;
}

test('DEMO-09: zero "demo-hints" references across the shipped surface (assets/ + sw.js + root *.html)', function () {
  var shipped = listShippedFiles();
  assert.ok(shipped.length > 0, 'the shipped-surface scan must enumerate at least one file (scan misconfigured)');
  var hits = [];
  shipped.forEach(function (abs) {
    var src;
    try { src = fs.readFileSync(abs, 'utf8'); }
    catch (e) { return; } // unreadable/binary — cannot carry the literal
    if (src.indexOf('demo-hints') !== -1) {
      hits.push(path.relative(REPO_ROOT, abs));
    }
  });
  assert.strictEqual(hits.length, 0,
    'the demo-hints feature must be removed from the shipped surface (35-05); still referenced in: ' + hits.join(', '));
});

test('DEMO-09: assets/demo-hints.js does NOT exist', function () {
  assert.strictEqual(exists('assets/demo-hints.js'), false,
    'assets/demo-hints.js must be deleted (35-05)');
});

// ─── count guard (no case silently skipped) ──────────────────────────────────
// 7 fixed cases (2x DEMO-01, DEMO-02, 2x DEMO-08, 2x DEMO-09) + 4 i18n
// regression cases = 11.
var EXPECTED_COUNT = 11;
if (passed + failed !== EXPECTED_COUNT) {
  console.error('\nGUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
    (passed + failed) + ' ran — a case was silently skipped.');
  process.exit(1);
}

console.log('');
console.log('Plan 35-01 demo-static RED gate — ' + passed + ' passed, ' + failed + ' failed');
console.log('(RED/non-zero is EXPECTED at this wave: headerActions/shared-chrome absent, languageSelect + therapeutic + demo-hints still present.)');
process.exit(failed === 0 ? 0 : 1);
