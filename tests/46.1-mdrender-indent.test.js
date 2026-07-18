/**
 * tests/46.1-mdrender-indent.test.js — preview indentation fidelity.
 *
 * BEHAVIOR LOCK: window.MdRender.render must preserve the LEADING spaces of
 * plain paragraph lines (including continuation lines after a <br>) as &nbsp;
 * sequences, so the on-screen preview / read-mode render shows the same
 * indentation the PDF draws and the clipboard copy carries. Interior spaces are
 * NOT converted (native collapsing/wrapping stays), and the list-nesting
 * pipeline is untouched (leading spaces on list lines are structure, not
 * indentation to render).
 *
 * LOAD: eval the REAL assets/md-render.js into an isolated jsdom window and
 * assert on the OBSERVABLE returned HTML string (plus one rendered-DOM check
 * that the entity really lands as U+00A0 in the text). Ends with a count guard
 * so a silently-skipped case cannot pass vacuously.
 *
 * Run: node tests/46.1-mdrender-indent.test.js  (exit 0 pass / 1 fail)
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

function loadMdRender() {
  var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://localhost/',
    runScripts: 'outside-only',
  });
  dom.window.eval(readAsset('assets/md-render.js'));
  if (!dom.window.MdRender || typeof dom.window.MdRender.render !== 'function') {
    throw new Error('md-render.js did not expose window.MdRender.render after eval');
  }
  return dom;
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

var dom = loadMdRender();
var MdRender = dom.window.MdRender;
var render = function (md) { return MdRender.render(md); };

// ─── Leading indentation on a plain paragraph line ───────────────────────────
test('a leading-indented paragraph line renders its spaces as &nbsp; entities', function () {
  assert.strictEqual(render('  indented line'), '<p>&nbsp;&nbsp;indented line</p>');
});

test('the emitted entities render as real indentation (U+00A0 in the DOM text)', function () {
  var div = dom.window.document.createElement('div');
  div.innerHTML = render('  indented line');
  var p = div.querySelector('p');
  assert.ok(p, 'a <p> was rendered');
  assert.ok(/^\u00a0\u00a0indented line$/.test(p.textContent),
    'the paragraph text starts with two non-breaking spaces (got ' + JSON.stringify(p.textContent) + ')');
});

// ─── Continuation line after a <br> keeps ITS leading indent ─────────────────
test('a two-line paragraph preserves the indented continuation line after the <br>', function () {
  assert.strictEqual(render('first\n  second'), '<p>first<br>&nbsp;&nbsp;second</p>');
});

// ─── Interior spaces are untouched (no pre-wrap semantics smuggled in) ───────
test('interior spaces stay literal spaces (only LEADING runs convert)', function () {
  assert.strictEqual(render('a  b'), '<p>a  b</p>');
});

// ─── Escaping order: entity injection cannot double-escape or go literal ─────
test('an indented line with HTML-escaped content keeps both the entities and the escape', function () {
  assert.strictEqual(render('  <b>x'), '<p>&nbsp;&nbsp;&lt;b&gt;x</p>');
});

// ─── List nesting unchanged (leading spaces on list lines are structure) ─────
test('nested list output is byte-identical (list leading spaces are nesting, not indent)', function () {
  assert.strictEqual(
    render('- a\n  - b\n- c'),
    '<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>'
  );
});

var EXPECTED_COUNT = 6;
if (passed + failed !== EXPECTED_COUNT) {
  console.error('\nGUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
    (passed + failed) + ' ran — a case was silently skipped.');
  process.exit(1);
}

console.log('\n46.1-mdrender-indent: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
