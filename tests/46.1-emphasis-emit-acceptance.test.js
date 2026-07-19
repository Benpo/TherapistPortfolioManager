/**
 * tests/46.1-emphasis-emit-acceptance.test.js — the toggle's emissions are
 * markup BOTH pipelines accept (46.1-BOLD-SEMANTICS-RESEARCH §3 preamble + §5
 * Tier 2).
 *
 * Loads the REAL renderers (md-render.js + pdf-export.js) AND the real
 * transform (text-edit.js) into one jsdom window — the
 * tests/45-pipeline-agreement.test.js loader idiom. For every corpus
 * operation's output it asserts:
 *   1. MdRender.render shows <strong>/<em> and no stray literal `*` survives
 *      from an emitted marker;
 *   2. PDFExport.__test.parseInline emits the matching bold/italic segments;
 *   3. the join-invariant parseInline(x).join === stripInlineMarkdown(x) holds
 *      on every output line (the shipped cross-pipeline invariant).
 * Plus a seeded deterministic fuzz (fixed LCG, no Math.random): random doc +
 * random selection + random marker → invariants: no *** in the output (an
 * inserted empty pair stays isolated), the join-invariant is preserved, and a
 * double-toggle from the pure post-state restores text AND selection.
 *
 * Run: node tests/46.1-emphasis-emit-acceptance.test.js  (exit 0 pass / 1 fail)
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
  runScripts: 'outside-only'
});
dom.window.eval(readAsset('assets/md-render.js'));
dom.window.eval(readAsset('assets/pdf-export.js'));
dom.window.eval(readAsset('assets/text-edit.js'));

var MdRender = dom.window.MdRender;
var PDFExport = dom.window.PDFExport;
var TextEdit = dom.window.TextEdit;
assert.ok(MdRender && typeof MdRender.render === 'function', 'MdRender.render must be exposed');
assert.ok(PDFExport && PDFExport.__test, 'PDFExport.__test seam must be exposed');
assert.ok(TextEdit && typeof TextEdit.toggleWrap === 'function', 'TextEdit.toggleWrap must be exposed');
var parseInline = PDFExport.__test.parseInline;
var stripInlineMarkdown = PDFExport.__test.stripInlineMarkdown;

var BOLD = '**';
var ITAL = '*';

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

function joinSegs(x) {
  return parseInline(x).map(function (s) { return s.text; }).join('');
}
function applyRep(value, rep) {
  return value.slice(0, rep.start) + rep.text + value.slice(rep.end);
}
function assertJoinInvariant(value, ctx) {
  value.split('\n').forEach(function (line) {
    assert.strictEqual(joinSegs(line), stripInlineMarkdown(line),
      'join-invariant broke on line ' + JSON.stringify(line) + ' of ' + ctx);
  });
}

// ── 1. Emit-acceptance corpus: every Tier-1 shape, checked in BOTH renderers ──
// Each row: value + selection + marker → expected emission, plus the substrings
// that must come out <strong>/<em> on screen and bold/italic in the PDF parser.
var CORPUS = [
  { desc: 'plain wrap',            v: 'make bold now',        s: 5, e: 9,  m: BOLD, out: 'make **bold** now',   strong: ['bold'], em: [] },
  { desc: 'plain italic wrap',     v: 'make bold now',        s: 5, e: 9,  m: ITAL, out: 'make *bold* now',     strong: [], em: ['bold'] },
  { desc: 'trimmed wrap',          v: 'say word now',         s: 3, e: 9,  m: BOLD, out: 'say **word** now',    strong: ['word'], em: [] },
  { desc: 'unwrap inside',         v: '**bolded text**',      s: 9, e: 13, m: BOLD, out: 'bolded text',         strong: [], em: [] },
  { desc: 'multi-fragment union',  v: '**a** mid **b**',      s: 0, e: 15, m: BOLD, out: '**a mid b**',         strong: ['a mid b'], em: [] },
  { desc: 'partial-overlap grow',  v: 'pre **bold** post',    s: 2, e: 7,  m: BOLD, out: 'pr**e bold** post',   strong: ['e bold'], em: [] },
  { desc: 'multi-line per-line',   v: 'line one\nline two',   s: 0, e: 17, m: BOLD, out: '**line one**\n**line two**', strong: ['line one', 'line two'], em: [] },
  { desc: 'blank line skipped',    v: 'one\n\ntwo',           s: 0, e: 8,  m: BOLD, out: '**one**\n\n**two**',  strong: ['one', 'two'], em: [] },
  { desc: 'bullet line clamps',    v: '- item',               s: 0, e: 6,  m: BOLD, out: '- **item**',          strong: ['item'], em: [] },
  { desc: 'ordered line clamps',   v: '1. step',              s: 0, e: 7,  m: BOLD, out: '1. **step**',         strong: ['step'], em: [] },
  { desc: 'heading text wrap',     v: '## Title',             s: 0, e: 8,  m: BOLD, out: '## **Title**',        strong: ['Title'], em: [] },
  { desc: 'swap bold→italic',      v: '**word**',             s: 2, e: 6,  m: ITAL, out: '*word*',              strong: [], em: ['word'] },
  { desc: 'swap italic→bold',      v: '*word*',               s: 1, e: 5,  m: BOLD, out: '**word**',            strong: ['word'], em: [] },
  { desc: 'partial swap absorbs',  v: '**bolded text**',      s: 9, e: 13, m: ITAL, out: '*bolded text*',       strong: [], em: ['bolded text'] },
  { desc: 'flush absorb',          v: '**a**word',            s: 5, e: 9,  m: BOLD, out: '**aword**',           strong: ['aword'], em: [] },
  { desc: 'disjoint untouched',    v: '*it* and **b**',       s: 5, e: 8,  m: BOLD, out: '*it* **and** **b**',  strong: ['and', 'b'], em: ['it'] },
  { desc: 'hebrew wrap',           v: 'סיכום מודגש כאן',      s: 6, e: 11, m: BOLD, out: 'סיכום **מודגש** כאן', strong: ['מודגש'], em: [] },
];

test('corpus: every toggle emission renders in BOTH pipelines with no literal markers left over', function () {
  CORPUS.forEach(function (row) {
    var r = TextEdit.toggleWrap(row.v, row.s, row.e, row.m);
    assert.strictEqual(r.value, row.out, 'toggle output mismatch for ' + row.desc);
    assert.strictEqual(applyRep(row.v, r.replacement), r.value, 'replacement consistency for ' + row.desc);

    // (1) Screen: markers fully consumed — the rendered HTML holds no `*` at all.
    var html = MdRender.render(r.value);
    assert.ok(html.indexOf('*') === -1,
      'a literal * leaked into the rendered HTML for ' + row.desc + ': ' + html);
    row.strong.forEach(function (t) {
      assert.ok(html.indexOf('<strong>' + t + '</strong>') !== -1,
        row.desc + ': expected <strong>' + t + '</strong> in ' + html);
    });
    row.em.forEach(function (t) {
      assert.ok(html.indexOf('<em>' + t + '</em>') !== -1,
        row.desc + ': expected <em>' + t + '</em> in ' + html);
    });

    // (2) PDF: the char-scanner sees the same emphasis.
    r.value.split('\n').forEach(function (line) {
      var segs = parseInline(line);
      row.strong.forEach(function (t) {
        if (line.indexOf('**' + t + '**') === -1) return; // fragment lives on another line
        assert.ok(segs.some(function (sg) { return sg.bold && sg.text === t; }),
          row.desc + ': parseInline must mark ' + JSON.stringify(t) + ' bold in ' + JSON.stringify(line));
      });
      row.em.forEach(function (t) {
        if (line.indexOf('*' + t + '*') === -1) return;
        assert.ok(segs.some(function (sg) { return sg.italic && sg.text === t; }),
          row.desc + ': parseInline must mark ' + JSON.stringify(t) + ' italic in ' + JSON.stringify(line));
      });
    });

    // (3) The shipped cross-pipeline join-invariant survives the emission.
    assertJoinInvariant(r.value, row.desc);
  });
});

test('corpus: block structure survives — a clamped list/heading emission keeps its block role', function () {
  var list = TextEdit.toggleWrap('- item', 0, 6, BOLD).value;
  var htmlList = MdRender.render(list);
  assert.ok(/<ul><li><strong>item<\/strong><\/li><\/ul>/.test(htmlList),
    'the bullet line must stay a real list item with bold content: ' + htmlList);
  var pdfList = PDFExport.__test.parseMarkdown(list).filter(function (b) { return b.type === 'list'; })[0];
  assert.ok(pdfList, 'pdf must still see a list block');
  assert.strictEqual(pdfList.items[0].text, '**item**', 'pdf list item carries the emphasized body');

  var head = TextEdit.toggleWrap('## Title', 0, 8, BOLD).value;
  var htmlHead = MdRender.render(head);
  assert.ok(/<h2><strong>Title<\/strong><\/h2>/.test(htmlHead),
    'the heading must stay a heading with bold content: ' + htmlHead);
  var pdfHead = PDFExport.__test.parseMarkdown(head).filter(function (b) { return b.type === 'heading'; })[0];
  assert.ok(pdfHead, 'pdf must still see a heading block');
  assert.strictEqual(pdfHead.level, 2, 'pdf heading level preserved');
});

// ── 2. Seeded deterministic fuzz ─────────────────────────────────────────────
function makeRng(seed) {
  var s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

test('FUZZ: random doc + selection + marker → no *** emitted, join-invariant kept, pure-state double-toggle restores', function () {
  var rng = makeRng(0x46b0117e); // fixed seed — reproducible
  var ATOMS = ['a', 'bc', ' ', '**', '*', '\n', '- ', '## ', '3', 'word'];
  var N = 500;
  var checked = 0, involutions = 0;
  for (var i = 0; i < N; i++) {
    var doc = '';
    var len = 2 + Math.floor(rng() * 7);
    for (var j = 0; j < len; j++) doc += ATOMS[Math.floor(rng() * ATOMS.length)];
    if (/\*{3,}/.test(doc)) continue; // pre-damaged clusters are the renderers' problem, not the toggle's
    var a = Math.floor(rng() * (doc.length + 1));
    var b = Math.floor(rng() * (doc.length + 1));
    var s = Math.min(a, b), e = Math.max(a, b);
    var marker = rng() < 0.5 ? BOLD : ITAL;

    var r1 = TextEdit.toggleWrap(doc, s, e, marker);
    assert.strictEqual(applyRep(doc, r1.replacement), r1.value,
      'replacement consistency broke on ' + JSON.stringify([doc, s, e, marker]));

    // C7: never a *** cluster; an empty pair (inserted or swapped in from the
    // other marker) must stand isolated.
    var isEmptyPair = r1.replacement.text === marker + marker;
    if (isEmptyPair) {
      assert.notStrictEqual(r1.value.charAt(r1.replacement.start - 1), '*',
        'empty pair fused left on ' + JSON.stringify([doc, s, e, marker]));
      assert.notStrictEqual(r1.value.charAt(r1.replacement.start + r1.replacement.text.length), '*',
        'empty pair fused right on ' + JSON.stringify([doc, s, e, marker]));
      var rest = r1.value.slice(0, r1.replacement.start) +
                 r1.value.slice(r1.replacement.start + r1.replacement.text.length);
      assert.ok(!/\*{3,}/.test(rest),
        '*** outside the empty pair on ' + JSON.stringify([doc, s, e, marker]) + ' -> ' + JSON.stringify(r1.value));
    } else {
      assert.ok(!/\*{3,}/.test(r1.value),
        'emitted *** on ' + JSON.stringify([doc, s, e, marker]) + ' -> ' + JSON.stringify(r1.value));
    }

    // The cross-pipeline join-invariant holds on every output line.
    assertJoinInvariant(r1.value, JSON.stringify([doc, s, e, marker]));

    // C10: repeated pressing must settle into a 2-cycle. One press converges
    // collisions (a MIXED apply or cross-marker swap is a documented one-way
    // door, undo-recoverable); an unwrap can additionally EXPOSE a block
    // marker (`*- x*` → `- x` becomes a list line) whose next wrap clamps past
    // the new prefix — one more press, then the involution holds on text AND
    // selection. Caret outcomes are their own micro-flows, exercised above.
    if (r1.selStart < r1.selEnd) {
      var r2 = TextEdit.toggleWrap(r1.value, r1.selStart, r1.selEnd, marker);
      var r3 = TextEdit.toggleWrap(r2.value, r2.selStart, r2.selEnd, marker);
      var r4 = TextEdit.toggleWrap(r3.value, r3.selStart, r3.selEnd, marker);
      var r5 = TextEdit.toggleWrap(r4.value, r4.selStart, r4.selEnd, marker);
      [r2, r3, r4, r5].forEach(function (rn) {
        assert.ok(!/\*{3,}/.test(rn.value),
          'a follow-up press emitted *** on ' + JSON.stringify([doc, s, e, marker]) + ' -> ' + JSON.stringify(rn.value));
        assertJoinInvariant(rn.value, 'follow-up press of ' + JSON.stringify([doc, s, e, marker]));
      });
      assert.strictEqual(r4.value, r2.value,
        'the toggle failed to enter a text 2-cycle on ' + JSON.stringify([doc, s, e, marker]) +
        ': ' + JSON.stringify([r1.value, r2.value, r3.value, r4.value]));
      assert.strictEqual(r5.value, r3.value,
        'double-toggle from the settled state failed to restore text on ' + JSON.stringify([doc, s, e, marker]) +
        ': ' + JSON.stringify([r2.value, r3.value, r4.value, r5.value]));
      assert.strictEqual(r5.selStart, r3.selStart,
        'double-toggle from the settled state failed to restore selStart on ' + JSON.stringify([doc, s, e, marker]));
      assert.strictEqual(r5.selEnd, r3.selEnd,
        'double-toggle from the settled state failed to restore selEnd on ' + JSON.stringify([doc, s, e, marker]));
      involutions++;
    }
    checked++;
  }
  assert.ok(checked >= 400, 'the fuzz must exercise most generated docs (ran ' + checked + ')');
  assert.ok(involutions >= 100, 'the fuzz must hit a healthy share of selection outcomes (ran ' + involutions + ')');
});

// ── Count guard — no vacuous green ───────────────────────────────────────────
var EXPECTED = 3;
if (passed + failed !== EXPECTED) {
  console.log('  FAIL  count guard: expected ' + EXPECTED + ' tests, ran ' + (passed + failed));
  failed++;
} else {
  console.log('  PASS  count guard: ' + EXPECTED + ' tests ran');
}

console.log('\n46.1 emphasis emit-acceptance: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
