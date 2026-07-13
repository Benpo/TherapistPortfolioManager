/**
 * tests/45-pipeline-agreement.test.js — Phase 45 Plan 05 Task 1.
 *
 * THREAT: T-45-03 — the read-mode preview (MdRender, Plan 01) and the PDF export
 * (pdf-export.js, Plan 02) were HARDENED IN PARALLEL in Wave 1. If their two
 * independently-edited emphasis regexes ever diverge, a therapist's preview and
 * their exported PDF would disagree on what counts as inline formatting (and, in
 * Hebrew, misaligned bold runs after bidi reorder). No single feature plan owns
 * this cross-pipeline agreement — this test does.
 *
 * It proves, on ONE loaded pair of the REAL renderers:
 *   1. BEHAVIOR — MdRender.strip and pdf-export.stripInlineMarkdown agree on a
 *      BROADENED D-08 corpus (pinned rows + adjacency/boundary/multi-marker
 *      cases incl. `**2 * 3 * 4**`) AND on a RANDOMIZED `*`-laced property pass.
 *   2. THE PDF JOIN-INVARIANT (WARNING 4) — for every randomized string,
 *      parseInlineBold(x).map(s=>s.text).join('') === stripInlineMarkdown(x).
 *      This is the ONLY place parseInlineBold (and its inner-italic strip) is
 *      FUZZED; the fixed corpus alone never exercises it under randomization.
 *   3. SOURCE IDENTITY — the emphasis regexes in md-render.js applyInline are
 *      CHARACTER-IDENTICAL to pdf-export.js stripInlineMarkdown's, and NEITHER
 *      uses a lookbehind `(?<` (Safari < 16.4 constraint).
 *   4. NESTED-LIST agreement — MdRender's rendered nesting and pdf-export
 *      parseMarkdown's per-item depth + per-item ordered-ness correspond over the
 *      shared nesting corpus (incl. the mixed-type `- a\n  1. b`).
 *   5. TEXT-THEN-LIST agreement (WARNING 3) — `Emotions:\n- anger` splits into a
 *      paragraph + a real list in BOTH pipelines (no literal `- anger`).
 *
 * Load BOTH real renderers into one jsdom window; reach pdf-export's internal
 * helpers via the PDFExport.__test seam.
 *
 * Run: node tests/45-pipeline-agreement.test.js   (exit 0 pass / 1 fail)
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

var MD_SRC = readAsset('assets/md-render.js');
var PDF_SRC = readAsset('assets/pdf-export.js');

// Both renderers are pure for the functions we exercise (no jsPDF/font deps for
// strip/parse), so evaluate them into one bare jsdom window.
var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'https://localhost/',
  runScripts: 'outside-only'
});
dom.window.eval(MD_SRC);
dom.window.eval(PDF_SRC);

var MdRender = dom.window.MdRender;
var PDFExport = dom.window.PDFExport;
assert.ok(MdRender && typeof MdRender.strip === 'function' && typeof MdRender.render === 'function',
  'MdRender.strip + MdRender.render must be exposed');
assert.ok(PDFExport && PDFExport.__test, 'PDFExport.__test seam must be exposed');
var stripInlineMarkdown = PDFExport.__test.stripInlineMarkdown;
var parseInlineBold = PDFExport.__test.parseInlineBold;
var parseMarkdown = PDFExport.__test.parseMarkdown;
assert.strictEqual(typeof stripInlineMarkdown, 'function', 'stripInlineMarkdown must be a function');
assert.strictEqual(typeof parseInlineBold, 'function', 'parseInlineBold must be a function');
assert.strictEqual(typeof parseMarkdown, 'function', 'parseMarkdown must be a function');

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

function joinSegs(x) {
  return parseInlineBold(x).map(function (s) { return s.text; }).join('');
}

// ── 1. BROADENED D-08 corpus — strip-vs-strip agreement ──────────────────────
// Inline-only single-line inputs (no leading block markers) so MdRender.strip's
// inline behavior is directly comparable to pdf-export.stripInlineMarkdown.
var CORPUS = [
  '**bold**',
  '*italic*',
  '** bold **',            // space-adjacent — literal in both
  '2 * 3 * 4',             // legacy multiplication — literal in both
  'a *b* c',
  'word * more',           // lone spaced asterisk — literal
  'הסיכום **מודגש** כאן',  // Hebrew bold
  '***x***',               // triple-marker
  'a**b**c',               // bold hugging letters on both sides
  'un*believable*ly',      // italic inside a word
  '**a *b* c**',           // italic inside a (non-matching) bold span
  '**2 * 3 * 4**'          // WARNING 4: space-adjacent italic INSIDE a bold span
];

test('MdRender.strip and pdf-export.stripInlineMarkdown agree on the BROADENED D-08 corpus', function () {
  CORPUS.forEach(function (x) {
    var a = MdRender.strip(x);
    var b = stripInlineMarkdown(x);
    assert.strictEqual(a, b,
      'strip disagreement on ' + JSON.stringify(x) + ': MdRender.strip=' + JSON.stringify(a) +
      ' vs stripInlineMarkdown=' + JSON.stringify(b));
  });
});

test('legacy "2 * 3 * 4" stays literal in BOTH pipelines (not mangled)', function () {
  assert.strictEqual(MdRender.strip('2 * 3 * 4'), '2 * 3 * 4', 'MdRender.strip must leave 2 * 3 * 4 literal');
  assert.strictEqual(stripInlineMarkdown('2 * 3 * 4'), '2 * 3 * 4', 'stripInlineMarkdown must leave 2 * 3 * 4 literal');
});

test('`**2 * 3 * 4**` stays WHOLLY literal in both (inner "*" forbids the bold match)', function () {
  assert.strictEqual(MdRender.strip('**2 * 3 * 4**'), '**2 * 3 * 4**');
  assert.strictEqual(stripInlineMarkdown('**2 * 3 * 4**'), '**2 * 3 * 4**');
});

// ── 2 + WARNING 4. Randomized property pass ──────────────────────────────────
function makeRng(seed) {
  var s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

test('RANDOMIZED property pass: strip-vs-strip agreement AND the PDF join-invariant hold on `*`-laced strings', function () {
  var rng = makeRng(0x5145abcd); // deterministic seed (reproducible fuzz)
  var ATOMS = ['*', '**', ' ', 'a', 'b', 'c', 'x', '3'];
  var N = 500;
  var checked = 0;
  for (var i = 0; i < N; i++) {
    // Prefix a letter so no line-leading list/heading marker forms (strip's
    // BLOCK step would otherwise diverge from inline-only stripInlineMarkdown).
    var s = 'z';
    var len = 2 + Math.floor(rng() * 7);
    for (var j = 0; j < len; j++) s += ATOMS[Math.floor(rng() * ATOMS.length)];
    // (a) strip-vs-strip
    var a = MdRender.strip(s);
    var b = stripInlineMarkdown(s);
    assert.strictEqual(a, b,
      'randomized strip disagreement on ' + JSON.stringify(s) + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b));
    // (b) WARNING 4 — the PDF join-invariant fuzzes parseInlineBold + its inner strip
    assert.strictEqual(joinSegs(s), stripInlineMarkdown(s),
      'join-invariant broke on ' + JSON.stringify(s) + ': parseInlineBold.join=' + JSON.stringify(joinSegs(s)) +
      ' vs stripInlineMarkdown=' + JSON.stringify(stripInlineMarkdown(s)));
    checked++;
  }
  assert.strictEqual(checked, N, 'the property pass must exercise all ' + N + ' generated strings');
});

// ── 3. CHARACTER-IDENTICAL source assertion + no-lookbehind ───────────────────
// Extract the JS regex LITERALS (source of /.../g) inside a named function body.
function bodyOf(src, marker) {
  var start = src.indexOf(marker);
  assert.ok(start !== -1, 'could not locate ' + marker + ' in source');
  var next = src.indexOf('\n  function ', start + marker.length);
  var end = next === -1 ? src.length : next;
  return src.slice(start, end);
}
// Match /BODY/g regex literals whose BODY begins with an escaped asterisk-ish
// emphasis pattern. Emphasis literals here contain no "/" so a simple
// escaped-or-non-slash body matcher is sufficient.
function emphasisPatterns(body) {
  var re = /\/((?:\\.|[^\/\n\\])+)\/g/g;
  var out = [];
  var m;
  while ((m = re.exec(body)) !== null) {
    var pat = m[1];
    if (pat.indexOf('\\*') !== -1) out.push(pat);   // emphasis regexes reference \*
  }
  return out;
}

test('the emphasis regexes in md-render applyInline are CHARACTER-IDENTICAL to pdf-export stripInlineMarkdown', function () {
  var mdPatterns = emphasisPatterns(bodyOf(MD_SRC, 'function applyInline'));
  var pdfPatterns = emphasisPatterns(bodyOf(PDF_SRC, 'function stripInlineMarkdown'));
  assert.strictEqual(mdPatterns.length, 2,
    'expected exactly 2 emphasis regexes (bold + italic) in md-render applyInline; got ' + mdPatterns.length);
  assert.strictEqual(pdfPatterns.length, 2,
    'expected exactly 2 emphasis regexes (bold + italic) in pdf-export stripInlineMarkdown; got ' + pdfPatterns.length);
  assert.strictEqual(mdPatterns[0], pdfPatterns[0],
    'BOLD regex source differs:\n  md :' + mdPatterns[0] + '\n  pdf:' + pdfPatterns[0]);
  assert.strictEqual(mdPatterns[1], pdfPatterns[1],
    'ITALIC regex source differs:\n  md :' + mdPatterns[1] + '\n  pdf:' + pdfPatterns[1]);
});

test('neither emphasis regex uses a lookbehind `(?<` (Safari < 16.4 constraint preserved)', function () {
  var mdBody = bodyOf(MD_SRC, 'function applyInline');
  var pdfBody = bodyOf(PDF_SRC, 'function stripInlineMarkdown');
  assert.ok(mdBody.indexOf('(?<') === -1, 'md-render applyInline must not use lookbehind');
  assert.ok(pdfBody.indexOf('(?<') === -1, 'pdf-export stripInlineMarkdown must not use lookbehind');
});

// ── Bold-token agreement: MdRender <strong> ⟺ parseInlineBold bold:true ───────
test('MdRender emphasizes exactly the substrings pdf-export parseInlineBold marks bold', function () {
  [['a **b** c'], ['The **summary** is below.'], ['הסיכום **מודגש** כאן']].forEach(function (row) {
    var input = row[0];
    var boldTexts = parseInlineBold(input).filter(function (s) { return s.bold; }).map(function (s) { return s.text; });
    var html = MdRender.render(input);
    boldTexts.forEach(function (t) {
      assert.ok(html.indexOf('<strong>' + t + '</strong>') !== -1,
        'MdRender must wrap ' + JSON.stringify(t) + ' in <strong> for ' + JSON.stringify(input) + ' (got ' + html + ')');
    });
    if (boldTexts.length === 0) {
      assert.ok(html.indexOf('<strong>') === -1,
        'MdRender must emit NO <strong> when parseInlineBold marks nothing bold for ' + JSON.stringify(input));
    }
  });
});

// ── 4. NESTED-LIST agreement ─────────────────────────────────────────────────
// Derive, from each pipeline, the outer list tag and the (first) nested list tag,
// then assert they correspond. PDF: item.ordered -> 'ol'/'ul' keyed by depth.
function pdfListTags(input) {
  var blocks = parseMarkdown(input);
  var list = blocks.filter(function (b) { return b.type === 'list'; })[0];
  assert.ok(list, 'pdf parseMarkdown must produce a list block for ' + JSON.stringify(input));
  var outer = list.items.filter(function (it) { return it.depth === 0; })[0];
  var inner = list.items.filter(function (it) { return it.depth === 1; })[0];
  assert.ok(outer && inner, 'the nesting corpus must yield both a depth-0 and a depth-1 item');
  return {
    outer: outer.ordered ? 'ol' : 'ul',
    inner: inner.ordered ? 'ol' : 'ul'
  };
}
// MdRender: the first list open tag is the outer; the first list tag nested
// inside a <li> is the inner.
function mdListTags(input) {
  var html = MdRender.render(input);
  var outerM = html.match(/<(ul|ol)>/);
  assert.ok(outerM, 'MdRender must open a list for ' + JSON.stringify(input) + ' (got ' + html + ')');
  var innerM = html.match(/<li(?:\s[^>]*)?>[^<]*<(ul|ol)>/);
  assert.ok(innerM, 'MdRender must NEST a list inside an <li> for ' + JSON.stringify(input) + ' (got ' + html + ')');
  return { outer: outerM[1], inner: innerM[1], html: html };
}

test('MdRender and pdf-export parseMarkdown agree on nested-list depth + per-item ordered-ness (incl. mixed-type)', function () {
  var NEST = [
    '- a\n  - b\n- c',      // bullet > bullet
    '1. a\n   1. b',         // ordered > ordered (3-space continuation folds to depth 1)
    '- a\n  1. b'            // MIXED: bullet parent, ordered child
  ];
  NEST.forEach(function (input) {
    var md = mdListTags(input);
    var pdf = pdfListTags(input);
    assert.strictEqual(md.outer, pdf.outer,
      'outer list tag disagreement on ' + JSON.stringify(input) + ': md=' + md.outer + ' pdf=' + pdf.outer);
    assert.strictEqual(md.inner, pdf.inner,
      'nested list tag disagreement on ' + JSON.stringify(input) + ': md=' + md.inner + ' pdf=' + pdf.inner);
  });
  // Spot-check the mixed case explicitly: <ul> outer, <ol> nested.
  var mixed = mdListTags('- a\n  1. b');
  assert.strictEqual(mixed.outer, 'ul', 'mixed-type: outer must be <ul>');
  assert.strictEqual(mixed.inner, 'ol', 'mixed-type: nested run must be <ol>');
});

// ── 5. TEXT-THEN-LIST agreement (WARNING 3) ──────────────────────────────────
test('`Emotions:\\n- anger` splits into a paragraph + a real list in BOTH pipelines (no literal "- anger")', function () {
  var input = 'Emotions:\n- anger';
  // MdRender: <p>Emotions:</p> then <ul><li>anger</li></ul>; never a literal "- anger".
  var html = MdRender.render(input);
  assert.ok(/<p>Emotions:<\/p>/.test(html),
    'MdRender must render "Emotions:" as a <p> (got ' + html + ')');
  assert.ok(/<ul><li>anger<\/li><\/ul>/.test(html),
    'MdRender must render "- anger" as a real <ul><li>anger</li></ul> (got ' + html + ')');
  assert.ok(html.indexOf('- anger') === -1,
    'MdRender must NOT emit a literal "- anger" token (got ' + html + ')');
  // PDF: parseMarkdown splits into a para block + a list block.
  var blocks = parseMarkdown(input).filter(function (b) { return b.type !== 'blank'; });
  assert.strictEqual(blocks[0].type, 'para', 'pdf parseMarkdown: first block must be a paragraph');
  assert.strictEqual(blocks[0].text, 'Emotions:', 'pdf paragraph text must be "Emotions:"');
  assert.strictEqual(blocks[1].type, 'list', 'pdf parseMarkdown: second block must be a list');
  assert.strictEqual(blocks[1].items[0].text, 'anger', 'pdf list item text must be "anger" (marker stripped)');
});

// ── 6. TEXT-THEN-HEADING agreement (GAP-45-01) ───────────────────────────────
test('`Emotions:\\n## Summary` splits into a paragraph + a real heading in BOTH pipelines (no literal "## Summary")', function () {
  var input = 'Emotions:\n## Summary';
  // MdRender: <p>Emotions:</p> then <h2>Summary</h2>; never a literal "## Summary".
  var html = MdRender.render(input);
  assert.ok(/<p>Emotions:<\/p>/.test(html),
    'MdRender must render "Emotions:" as a <p> (got ' + html + ')');
  assert.ok(/<h2>Summary<\/h2>/.test(html),
    'MdRender must render "## Summary" as a real <h2> (got ' + html + ')');
  assert.ok(html.indexOf('## Summary') === -1,
    'MdRender must NOT emit a literal "## Summary" token (got ' + html + ')');
  // PDF: parseMarkdown splits into a para block + a heading block.
  var blocks = parseMarkdown(input).filter(function (b) { return b.type !== 'blank'; });
  assert.strictEqual(blocks[0].type, 'para', 'pdf parseMarkdown: first block must be a paragraph');
  assert.strictEqual(blocks[0].text, 'Emotions:', 'pdf paragraph text must be "Emotions:"');
  assert.strictEqual(blocks[1].type, 'heading', 'pdf parseMarkdown: second block must be a heading');
  assert.strictEqual(blocks[1].level, 2, 'pdf heading level must be 2');
  assert.strictEqual(blocks[1].text, 'Summary', 'pdf heading text must be "Summary"');
});

test('heading-remainder-then-heading `## H\\ntext\\n### Sub` agrees: heading L2 -> para -> heading L3 in BOTH pipelines', function () {
  var input = '## H\ntext\n### Sub';
  assert.strictEqual(MdRender.render(input), '<h2>H</h2><p>text</p><h3>Sub</h3>',
    'MdRender must render heading -> paragraph -> heading');
  var blocks = parseMarkdown(input).filter(function (b) { return b.type !== 'blank'; });
  assert.strictEqual(blocks[0].type, 'heading', 'pdf block 0 must be a heading');
  assert.strictEqual(blocks[0].level, 2, 'pdf block 0 heading level 2');
  assert.strictEqual(blocks[0].text, 'H', 'pdf block 0 heading text "H"');
  assert.strictEqual(blocks[1].type, 'para', 'pdf block 1 must be a paragraph');
  assert.strictEqual(blocks[1].text, 'text', 'pdf block 1 paragraph text "text"');
  assert.strictEqual(blocks[2].type, 'heading', 'pdf block 2 must be a heading');
  assert.strictEqual(blocks[2].level, 3, 'pdf block 2 heading level 3');
  assert.strictEqual(blocks[2].text, 'Sub', 'pdf block 2 heading text "Sub"');
});

// ── 7. MARKER-ONLY agreement (GAP-45-02) ─────────────────────────────────────
test('marker-only lines (`-`,`- `,`*`,`1.`,`1. `) are empty list items of the matching type in BOTH pipelines', function () {
  [
    { src: '-', tag: 'ul', ordered: false },
    { src: '- ', tag: 'ul', ordered: false },
    { src: '*', tag: 'ul', ordered: false },
    { src: '1.', tag: 'ol', ordered: true },
    { src: '1. ', tag: 'ol', ordered: true }
  ].forEach(function (row) {
    // MdRender: an empty list item of the correct list type; nothing dropped.
    // GAP-45-04: an ordered empty item now carries value="1" (its typed ordinal);
    // unordered items are unchanged.
    var html = MdRender.render(row.src);
    var liOpen = '<li' + (row.ordered ? ' value="1"' : '') + '>';
    assert.strictEqual(html, '<' + row.tag + '>' + liOpen + '</li></' + row.tag + '>',
      'MdRender must render ' + JSON.stringify(row.src) + ' as an empty <' + row.tag + '> item (got ' + html + ')');
    // PDF: a list block whose sole item is empty-text with matching ordered-ness.
    var blocks = parseMarkdown(row.src).filter(function (b) { return b.type !== 'blank'; });
    assert.strictEqual(blocks[0].type, 'list',
      'pdf parseMarkdown must produce a list block for ' + JSON.stringify(row.src));
    assert.strictEqual(blocks[0].items[0].text, '',
      'pdf list item text must be empty for ' + JSON.stringify(row.src));
    assert.strictEqual(blocks[0].items[0].ordered, row.ordered,
      'pdf list item ordered-ness must be ' + row.ordered + ' for ' + JSON.stringify(row.src));
  });
});

test('1.5-guard agreement: `1.5 mg` is a paragraph (not a list) in BOTH pipelines', function () {
  var html = MdRender.render('1.5 mg');
  assert.ok(html.indexOf('<p>') !== -1 && !/<[ou]l>/.test(html),
    'MdRender must render "1.5 mg" as a paragraph, no list tag (got ' + html + ')');
  var blocks = parseMarkdown('1.5 mg').filter(function (b) { return b.type !== 'blank'; });
  assert.strictEqual(blocks[0].type, 'para', 'pdf parseMarkdown: "1.5 mg" must be a paragraph');
});

// ── 8. TYPED-ORDINAL agreement (GAP-45-04) ───────────────────────────────────
test('typed ordinals: read-mode value="N" matches pdf item.ordinal (`11. jj`, block-separated `1. X`/`2. Y`)', function () {
  // Single non-sequential ordinal — read mode emits value="11"; pdf carries ordinal 11.
  var html11 = MdRender.render('11. jj');
  assert.ok(html11.indexOf('value="11"') !== -1,
    'MdRender must emit value="11" for "11. jj" (got ' + html11 + ')');
  var blk11 = parseMarkdown('11. jj').filter(function (b) { return b.type === 'list'; })[0];
  assert.ok(blk11, 'pdf must produce a list block for "11. jj"');
  assert.strictEqual(blk11.items[0].ordinal, 11, 'pdf item.ordinal must be 11 for "11. jj"');

  // Block-separated numbered runs: two <ol> value="1" then value="2"; pdf yields
  // two single-item list blocks whose ordinals are 1 then 2 — both display 1 then 2.
  var htmlBlk = MdRender.render('1. X\n\n2. Y');
  assert.strictEqual(htmlBlk, '<ol><li value="1">X</li></ol>\n<ol><li value="2">Y</li></ol>',
    'MdRender must keep typed ordinals across the blank-line split (got ' + htmlBlk + ')');
  var lists = parseMarkdown('1. X\n\n2. Y').filter(function (b) { return b.type === 'list'; });
  assert.strictEqual(lists.length, 2, 'pdf must yield two list blocks for block-separated numbered runs');
  assert.strictEqual(lists[0].items[0].ordinal, 1, 'first pdf block ordinal must be 1');
  assert.strictEqual(lists[1].items[0].ordinal, 2, 'second pdf block ordinal must be 2');
});

// ── 9. SAME-DEPTH TYPE-FLIP agreement (GAP-45-03) ────────────────────────────
// Read mode splits a same-depth marker-type flip into sibling lists; the PDF keeps
// ONE list block but marks each item's OWN ordered-ness. Both pipelines therefore
// mark the SAME items as bullet-vs-numbered even though the HTML shape differs.
test('same-depth marker-type flips: read mode splits into sibling lists; pdf per-item ordered-ness agrees', function () {
  [
    { src: '-\n1. x', md: '<ul><li></li></ul><ol><li value="1">x</li></ol>', ordered: [false, true], ordinals: [null, 1] },
    { src: '1. x\n- y', md: '<ol><li value="1">x</li></ol><ul><li>y</li></ul>', ordered: [true, false], ordinals: [1, null] },
    { src: '-\n1.', md: '<ul><li></li></ul><ol><li value="1"></li></ol>', ordered: [false, true], ordinals: [null, 1] }
  ].forEach(function (row) {
    // Read mode: two sibling lists with per-run markers.
    assert.strictEqual(MdRender.render(row.src), row.md,
      'MdRender must split the flip for ' + JSON.stringify(row.src) + ' (got ' + MdRender.render(row.src) + ')');
    // PDF: one list block, per-item ordered-ness (and ordinal) match the read-mode markers.
    var list = parseMarkdown(row.src).filter(function (b) { return b.type === 'list'; })[0];
    assert.ok(list, 'pdf must produce a list block for ' + JSON.stringify(row.src));
    assert.strictEqual(list.items.length, row.ordered.length,
      'pdf must keep both items in ONE block for ' + JSON.stringify(row.src));
    row.ordered.forEach(function (ord, idx) {
      assert.strictEqual(list.items[idx].ordered, ord,
        'pdf item ' + idx + ' ordered-ness must be ' + ord + ' for ' + JSON.stringify(row.src));
      if (ord) {
        assert.strictEqual(list.items[idx].ordinal, row.ordinals[idx],
          'pdf ordered item ' + idx + ' ordinal must be ' + row.ordinals[idx] + ' for ' + JSON.stringify(row.src));
      }
    });
  });
});

// ── 10. DEDENT-shape agreement (CR-01) — nothing typed may disappear ─────────
// The pre-fix MdRender builder dropped any list item that dedented below the
// depth of the run's FIRST item, while pdf parseMarkdown kept every item — the
// preview showed FEWER items than the exported PDF (T-45-03 divergence class).
// Lock: for dedent shapes (both list types, empty and non-empty items) read
// mode renders EVERY item and the PDF carries the same per-item depth /
// ordered-ness / typed ordinal.
test('DEDENT shapes: read mode keeps EVERY item; pdf per-item depth/type/ordinal agree (CR-01)', function () {
  [
    { src: '  - a\n- b',
      md: '<ul><li>a</li></ul><ul><li>b</li></ul>',
      pdf: [{ text: 'a', depth: 1, ordered: false }, { text: 'b', depth: 0, ordered: false }] },
    { src: '- a\n    - b\n  - c',
      md: '<ul><li>a<ul><li>b</li></ul><ul><li>c</li></ul></li></ul>',
      pdf: [{ text: 'a', depth: 0, ordered: false }, { text: 'b', depth: 2, ordered: false }, { text: 'c', depth: 1, ordered: false }] },
    { src: '  1. a\n1. b',
      md: '<ol><li value="1">a</li></ol><ol><li value="1">b</li></ol>',
      pdf: [{ text: 'a', depth: 1, ordered: true, ordinal: 1 }, { text: 'b', depth: 0, ordered: true, ordinal: 1 }] },
    { src: '  -\n-',
      md: '<ul><li></li></ul><ul><li></li></ul>',
      pdf: [{ text: '', depth: 1, ordered: false }, { text: '', depth: 0, ordered: false }] },
    { src: '  1.\n1.',
      md: '<ol><li value="1"></li></ol><ol><li value="1"></li></ol>',
      pdf: [{ text: '', depth: 1, ordered: true, ordinal: 1 }, { text: '', depth: 0, ordered: true, ordinal: 1 }] }
  ].forEach(function (row) {
    // Read mode: exact HTML — every typed item present, re-anchored per run.
    assert.strictEqual(MdRender.render(row.src), row.md,
      'MdRender must keep every dedented item for ' + JSON.stringify(row.src) +
      ' (got ' + MdRender.render(row.src) + ')');
    // PDF: ONE list block carrying ALL items with matching depth/type/ordinal.
    var list = parseMarkdown(row.src).filter(function (b) { return b.type === 'list'; })[0];
    assert.ok(list, 'pdf must produce a list block for ' + JSON.stringify(row.src));
    assert.strictEqual(list.items.length, row.pdf.length,
      'pdf must keep ALL ' + row.pdf.length + ' items for ' + JSON.stringify(row.src));
    row.pdf.forEach(function (exp, idx) {
      assert.strictEqual(list.items[idx].text, exp.text, 'pdf item ' + idx + ' text for ' + JSON.stringify(row.src));
      assert.strictEqual(list.items[idx].depth, exp.depth, 'pdf item ' + idx + ' depth for ' + JSON.stringify(row.src));
      assert.strictEqual(list.items[idx].ordered, exp.ordered, 'pdf item ' + idx + ' ordered-ness for ' + JSON.stringify(row.src));
      if (exp.ordered) {
        assert.strictEqual(list.items[idx].ordinal, exp.ordinal, 'pdf item ' + idx + ' ordinal for ' + JSON.stringify(row.src));
      }
    });
  });
});

// ── Count guard — no vacuous green ───────────────────────────────────────────
var EXPECTED = 16;
if (passed + failed !== EXPECTED) {
  console.log('  FAIL  count guard: expected ' + EXPECTED + ' tests, ran ' + (passed + failed));
  failed++;
} else {
  console.log('  PASS  count guard: ' + EXPECTED + ' tests ran');
}

console.log('');
console.log('Phase 45 Plan 05 — cross-pipeline D-08 + nested agreement — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
