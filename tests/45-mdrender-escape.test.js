/**
 * tests/45-mdrender-escape.test.js — Phase 45 Plan 01 Task 2.
 *
 * D-08 INLINE HARDENING + escape-first (XSS) safety for window.MdRender.
 *
 * D-08 CONTRACT (this table is shared VERBATIM with Plan 02's pdf-export.js
 * hardening — the two pipelines must agree; Plan 05 asserts source identity):
 *   | `**bold**`   | yes | <strong>bold</strong>                         |
 *   | `*italic*`   | yes | <em>italic</em>                               |
 *   | `** bold **` | no  | literal (space adjacent inside markers)       |
 *   | `2 * 3 * 4`  | no  | literal (legacy multiplication — no <em>)     |
 *   | `a *b* c`    | yes | <em>b</em> (inner markers hug `b`)            |
 *   | `word * more`| no  | literal (dangling single star)                |
 *
 * ESCAPE-FIRST: escapeHtml runs on the ENTIRE input before any markdown rule, so
 * a typed <script>/<img onerror> renders INERT — proven by assigning the output
 * into a detached node's innerHTML and asserting no live element is created.
 *
 * Run: node tests/45-mdrender-escape.test.js  (exit 0 pass / 1 fail)
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'https://localhost/',
  runScripts: 'outside-only',
});
dom.window.eval(readAsset('assets/md-render.js'));
var MdRender = dom.window.MdRender;
var doc = dom.window.document;
function render(md) { return MdRender.render(md); }

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ─── D-08 emphasis contract ──────────────────────────────────────────────────
test('`**bold**` renders <strong>bold</strong> (positive case preserved)', function () {
  assert.ok(/<strong>bold<\/strong>/.test(render('**bold**')), 'expected <strong>bold</strong>');
});

test('`*italic*` renders <em>italic</em> (positive case preserved)', function () {
  assert.ok(/<em>italic<\/em>/.test(render('*italic*')), 'expected <em>italic</em>');
});

test('`** bold **` (space adjacent inside markers) stays literal — no <strong>', function () {
  var html = render('** bold **');
  assert.ok(html.indexOf('<strong>') === -1, 'must NOT wrap in <strong>');
  assert.ok(html.indexOf('** bold **') !== -1, 'markers stay literal');
});

test('`2 * 3 * 4` (legacy multiplication) stays literal — no <em>', function () {
  var html = render('2 * 3 * 4');
  assert.ok(html.indexOf('<em>') === -1, 'legacy asterisks must NOT italicize');
  assert.ok(html.indexOf('2 * 3 * 4') !== -1, 'text stays literal');
});

test('`a *b* c` renders <em>b</em> (inner markers hug `b`)', function () {
  assert.ok(/<em>b<\/em>/.test(render('a *b* c')), 'expected <em>b</em>');
});

test('`word * more` (dangling single star) stays literal — no <em>', function () {
  var html = render('word * more');
  assert.ok(html.indexOf('<em>') === -1, 'dangling star must NOT italicize');
  assert.ok(html.indexOf('word * more') !== -1, 'text stays literal');
});

// ─── Escape-first XSS safety ─────────────────────────────────────────────────
test('<script> in a note renders INERT (no live <script> element via innerHTML)', function () {
  var out = render('<script>alert(1)</script>');
  assert.ok(out.indexOf('&lt;script&gt;') !== -1, 'the <script> tag must be HTML-escaped');
  var node = doc.createElement('div');
  node.innerHTML = out; // simulate the sanctioned MdRender -> innerHTML path
  assert.strictEqual(node.querySelector('script'), null, 'no live <script> element may be created');
});

test('<img src=x onerror=1> renders INERT (no <img> element created)', function () {
  var out = render('<img src=x onerror=1>');
  var node = doc.createElement('div');
  node.innerHTML = out;
  assert.strictEqual(node.querySelector('img'), null, 'no live <img> element may be created');
});

// ─── Source guard: no lookbehind (Safari < 16.4 compat) ──────────────────────
test('assets/md-render.js applyInline uses NO lookbehind token `(?<`', function () {
  var src = readAsset('assets/md-render.js');
  assert.ok(src.indexOf('(?<') === -1, 'lookbehind is unsupported on Safari < 16.4 — must not appear');
});

// ─── Count guard ─────────────────────────────────────────────────────────────
var EXPECTED_COUNT = 9;
if (passed + failed !== EXPECTED_COUNT) {
  console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases, ran ' + (passed + failed));
  process.exit(1);
}

console.log('');
console.log('Plan 45-01 Task 2 MdRender D-08 + escape tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
