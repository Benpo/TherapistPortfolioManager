/**
 * tests/45-mdrender-lists.test.js — Phase 45 Plan 01 Task 1.
 *
 * BEHAVIOR LOCK: window.MdRender.render must render ordered lists (1. 2. 3.) as
 * <ol><li>, nested (indented) bullet AND numbered lists as nested <ul>/<ol>, and
 * a text line immediately followed by a list run with NO blank line
 * (Emotions:\n- anger) as a paragraph + a real list — never a literal `- token`
 * (WARNING 3 / ROADMAP criterion 1). Flat non-nested output stays BYTE-IDENTICAL
 * to the pre-change renderer (regression lock).
 *
 * SHARED NESTING CONVENTION (pinned; Plan 02 mirrors it): 2 leading spaces = one
 * nesting level. Each nested run's ordered-ness is decided by ITS OWN marker
 * (`-`/`*` -> <ul>, `N.` -> <ol>), NOT the parent's — so mixed-type nesting
 * (`- a\n  1. b`) renders a <ol> nested inside a <ul> <li>.
 *
 * LOAD: eval the REAL assets/md-render.js into an isolated jsdom window and
 * assert on the OBSERVABLE returned HTML string. Ends with a count guard so a
 * silently-skipped case cannot pass vacuously.
 *
 * Run: node tests/45-mdrender-lists.test.js  (exit 0 pass / 1 fail)
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

// ─── Regression lock: flat bullet list is byte-identical to today ────────────
test('flat bullet list `- a\\n- b` renders byte-identical to pre-change output', function () {
  assert.strictEqual(render('- a\n- b'), '<ul><li>a</li><li>b</li></ul>');
});

// ─── NEW: ordered lists ──────────────────────────────────────────────────────
test('ordered list `1. a\\n2. b` renders <ol> with two value-bearing <li>', function () {
  assert.strictEqual(render('1. a\n2. b'), '<ol><li value="1">a</li><li value="2">b</li></ol>');
});

test('ordered list displays the TYPED ordinal via value="N" (`3. a\\n4. b` shows 3,4 not 1,2)', function () {
  // GAP-45-04 editor-1:1: the on-screen number equals what the user typed, so a
  // list that starts at 3 shows 3 (the browser can no longer renumber to 1).
  assert.strictEqual(render('3. a\n4. b'), '<ol><li value="3">a</li><li value="4">b</li></ol>');
});

// ─── NEW: nested lists ───────────────────────────────────────────────────────
test('nested bullet `- a\\n  - b\\n- c` nests a <ul> inside the first <li>', function () {
  assert.strictEqual(
    render('- a\n  - b\n- c'),
    '<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>'
  );
});

test('nested ordered `1. a\\n   1. b` nests an <ol> inside an ordered <li>', function () {
  assert.strictEqual(
    render('1. a\n   1. b'),
    '<ol><li value="1">a<ol><li value="1">b</li></ol></li></ol>'
  );
});

test('mixed-type nesting `- a\\n  1. b` nests an <ol> (not a bullet) inside the first <li>', function () {
  var html = render('- a\n  1. b');
  assert.strictEqual(html, '<ul><li>a<ol><li value="1">b</li></ol></li></ul>');
  // The child run keeps its OWN marker -> ordered, matching Plan 02/Plan 05; the
  // parent bullet <li> carries NO value, only the nested ordered <li> does.
  assert.ok(/<li>a<ol>/.test(html), 'child run must be an <ol> nested inside the bullet <li>');
});

// ─── NEW: text-then-list with NO blank line (WARNING 3) ──────────────────────
test('text then list with NO blank line `Emotions:\\n- anger` splits into <p> + real <ul>', function () {
  var html = render('Emotions:\n- anger');
  assert.strictEqual(html, '<p>Emotions:</p><ul><li>anger</li></ul>');
  assert.ok(/<ul><li>anger<\/li>/.test(html), 'the list run must render as a real <ul><li>anger</li>');
  assert.ok(html.indexOf('- anger') === -1, 'must NOT emit a literal `- anger` token (WARNING 3)');
  assert.ok(!/<p>[^<]*- /.test(html), 'no literal `- ` may leak into the paragraph');
});

// ─── NEW (symmetry): a non-list line ENDS a list run ─────────────────────────
test('list then trailing text `- a\\n- b\\ntext` renders <ul>...</ul><p>text</p>', function () {
  assert.strictEqual(render('- a\n- b\ntext'), '<ul><li>a</li><li>b</li></ul><p>text</p>');
});

// ─── LOCKED contract untouched: single-newline paragraph still uses <br> ─────
test('paragraph single-newline <br> contract is intact (`line1\\nline2`)', function () {
  assert.strictEqual(render('line1\nline2'), '<p>line1<br>line2</p>');
});

// ─── GAP-45-01: text then heading with NO blank line splits into <p> + <hN> ──
test('text then heading with NO blank line `Emotions:\\n## Summary` splits into <p> + real <h2>', function () {
  var html = render('Emotions:\n## Summary');
  assert.strictEqual(html, '<p>Emotions:</p><h2>Summary</h2>');
  assert.ok(html.indexOf('## Summary') === -1, 'must NOT emit a literal `## Summary` token (GAP-45-01)');
});

test('text then `# Title` renders a real <h1>, no literal `# Title`', function () {
  var html = render('note text\n# Title');
  assert.strictEqual(html, '<p>note text</p><h1>Title</h1>');
  assert.ok(html.indexOf('# Title') === -1, 'must NOT emit a literal `# Title` token');
});

test('heading-remainder then heading `## H\\ntext\\n### Sub` renders <h2><p><h3>', function () {
  assert.strictEqual(render('## H\ntext\n### Sub'), '<h2>H</h2><p>text</p><h3>Sub</h3>');
});

test('compound `text\\n## H\\n- item` renders <p> + <h2> + <ul>', function () {
  assert.strictEqual(render('text\n## H\n- item'), '<p>text</p><h2>H</h2><ul><li>item</li></ul>');
});

// ─── Regression-lock: a 4-hash line is NOT a heading, stays literal paragraph ─
test('`text\\n#### x` keeps the 4-hash line literal (not a heading)', function () {
  assert.strictEqual(render('text\n#### x'), '<p>text<br>#### x</p>');
});

// ─── GAP-45-02: marker-only lines are empty list items (1. ≡ 1. ) ────────────
test('bare ordinal `1.` renders an empty ordered item `<ol><li value="1"></li></ol>`', function () {
  assert.strictEqual(render('1.'), '<ol><li value="1"></li></ol>');
});

test('`1.` and `1. ` (trailing space) render identically', function () {
  assert.strictEqual(render('1.'), render('1. '));
  assert.strictEqual(render('1. '), '<ol><li value="1"></li></ol>');
});

test('bare bullet `-` and `- ` render an empty unordered item `<ul><li></li></ul>`', function () {
  assert.strictEqual(render('-'), '<ul><li></li></ul>');
  assert.strictEqual(render('- '), '<ul><li></li></ul>');
});

test('bare `*` renders an empty unordered item `<ul><li></li></ul>`', function () {
  assert.strictEqual(render('*'), '<ul><li></li></ul>');
});

// ─── Regression-lock: the 1.5-guard — `1.5 mg` stays a paragraph, never a list ─
test('`1.5 mg` stays a paragraph (1.5-guard preserved by the lookahead)', function () {
  assert.strictEqual(render('1.5 mg'), '<p>1.5 mg</p>');
});

// ─── GAP-45-04: ordered <li> carries the TYPED ordinal via value="N" (editor-1:1) ─
test('typed ordinal `11. jj` renders `<ol><li value="11">jj</li></ol>` (screen ≡ PDF)', function () {
  assert.strictEqual(render('11. jj'), '<ol><li value="11">jj</li></ol>');
});

test('repeated `1.\\n1.\\n1.` renders three typed-1 empty items (accepted per Ben 2026-07-13)', function () {
  assert.strictEqual(
    render('1.\n1.\n1.'),
    '<ol><li value="1"></li><li value="1"></li><li value="1"></li></ol>'
  );
});

test('block-separated `1. X\\n\\n2. Y` keeps typed ordinals across the blank-line split', function () {
  assert.strictEqual(
    render('1. X\n\n2. Y'),
    '<ol><li value="1">X</li></ol>\n<ol><li value="2">Y</li></ol>'
  );
});

// ─── Regression-lock: bullets NEVER carry value= ─────────────────────────────
test('unordered list `- a\\n- b` carries NO value= attribute (bullets only)', function () {
  var html = render('- a\n- b');
  assert.strictEqual(html, '<ul><li>a</li><li>b</li></ul>');
  assert.ok(html.indexOf('value=') === -1, 'bullets must never carry a value attribute');
});

// ─── Count guard (no vacuous green) ──────────────────────────────────────────
var EXPECTED_COUNT = 23;
if (passed + failed !== EXPECTED_COUNT) {
  console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases, ran ' + (passed + failed));
  process.exit(1);
}

console.log('');
console.log('Plan 45-01 Task 1 MdRender lists tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
