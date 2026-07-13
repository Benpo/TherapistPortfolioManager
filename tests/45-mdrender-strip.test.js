/**
 * tests/45-mdrender-strip.test.js — Phase 45 Plan 01 Task 3.
 *
 * D-06 shared markdown -> plain-text helper: window.MdRender.strip(markdown)
 * returns PLAIN TEXT (for textContent, never innerHTML) with inline emphasis
 * markers removed using the SAME hardened D-08 rule as render (so `2 * 3 * 4`
 * stays literal) AND leading block markers removed per line — heading `#`/`##`/
 * `###`, bullet `-`/`*`, ordered `N.`. Consumed by the three compact surfaces in
 * Plan 04 (sessions.js:262, overview.js:848, add-session spotlight ~1606).
 *
 * Run: node tests/45-mdrender-strip.test.js  (exit 0 pass / 1 fail)
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

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

test('strip is exposed on the MdRender module', function () {
  assert.strictEqual(typeof MdRender.strip, 'function', 'MdRender.strip must be a function');
});

test('inline bold marker removed: `**bold**` -> `bold`', function () {
  assert.strictEqual(MdRender.strip('**bold**'), 'bold');
});

test('inline italic marker removed: `*italic*` -> `italic`', function () {
  assert.strictEqual(MdRender.strip('*italic*'), 'italic');
});

test('bullet marker removed: `- item` -> `item`', function () {
  assert.strictEqual(MdRender.strip('- item'), 'item');
});

test('ordered marker removed: `1. item` -> `item`', function () {
  assert.strictEqual(MdRender.strip('1. item'), 'item');
});

test('heading markers removed: `# Heading`/`## H2`/`### H3`', function () {
  assert.strictEqual(MdRender.strip('# Heading'), 'Heading');
  assert.strictEqual(MdRender.strip('## H2'), 'H2');
  assert.strictEqual(MdRender.strip('### H3'), 'H3');
});

test('legacy literal preserved (D-08): `2 * 3 * 4` -> `2 * 3 * 4`', function () {
  assert.strictEqual(MdRender.strip('2 * 3 * 4'), '2 * 3 * 4');
});

test('multi-line note: `## Progress\\n- **big** step` -> `Progress\\nbig step`', function () {
  assert.strictEqual(MdRender.strip('## Progress\n- **big** step'), 'Progress\nbig step');
});

test('empty/null inputs -> ""', function () {
  assert.strictEqual(MdRender.strip(''), '');
  assert.strictEqual(MdRender.strip(null), '');
});

var EXPECTED_COUNT = 9;
if (passed + failed !== EXPECTED_COUNT) {
  console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases, ran ' + (passed + failed));
  process.exit(1);
}

console.log('');
console.log('Plan 45-01 Task 3 MdRender strip tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
