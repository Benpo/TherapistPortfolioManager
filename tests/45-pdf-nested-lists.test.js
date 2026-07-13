/**
 * tests/45-pdf-nested-lists.test.js — Phase 45 Plan 02 Task 2.
 *
 * Nested-list support for the Hebrew-bidi PDF pipeline (assets/pdf-export.js):
 * bullet + numbered + MIXED-type nesting, with correct per-item marker and a
 * per-level PHYSICAL indent that mirrors under Hebrew RTL. Two layers of guard:
 *
 *  (1) PARSE structure — parseMarkdown records, PER ITEM, a `depth` (from leading
 *      whitespace; SHARED NESTING CONVENTION 2 spaces = 1 level, floor(spaces/2))
 *      and its OWN `ordered`-ness (from its OWN marker), so "- a / 1. b" yields a
 *      numbered child inside a bullet parent — NOT the pre-45 block-level flag's
 *      "- 1. b". Asserted on the parsed block, not just that a function ran.
 *
 *  (2) RENDER behavior — a jsPDF doc.text() spy (guarding against the repo's
 *      false-GREEN jsdom-PDF history, memory reference-pdf-jsdom-inert-gates):
 *        - MIXED LTR: the nested numbered child draws a "1." numeric prefix, not
 *          a bullet with a literal "1." ("- 1. b").
 *        - LTR indent: a depth-1 item anchors further from the start margin than
 *          depth-0 by the per-level step.
 *        - RTL indent: a depth-1 item indents toward the RIGHT margin (physical
 *          offset decreases the rightX anchor by the per-level step).
 *        - RTL NOTE 5: a nested ORDERED child with LTR content in a Hebrew doc —
 *          whose parent block is UNORDERED — still takes the split-row ordered-
 *          prefix path (keyed on the ITEM's ordered-ness, not block.ordered),
 *          producing a pure "N." prefix call (the c8x Bug B regression guard).
 *
 * Load pdf-export.js into the shared jsdom+jsPDF env (getContext stub + vendored
 * jsPDF); the parse helper is reached via the __test seam, the render spy via the
 * env's onJsPDF(doc) hook wrapping doc.text (as quick-260608-c8x does).
 *
 * Run: node tests/45-pdf-nested-lists.test.js   (exit 0 pass / 1 fail)
 */

'use strict';

var path = require('path');
var assert = require('assert');

var buildJsdomEnv = require('./_helpers/jsdom-pdf-env').buildJsdomEnv;

// Geometry (mirrors pdf-export.js buildSessionPDF scope).
var PAGE_W = 595;
var MARGIN_X = 71;
var RIGHT_X = PAGE_W - MARGIN_X; // 524

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ── PARSE helpers ──────────────────────────────────────────────────────────────
function parse(markdown) {
  var env = buildJsdomEnv();
  var pm = env.win.PDFExport.__test.parseMarkdown;
  assert.strictEqual(typeof pm, 'function', 'parseMarkdown must be exposed on __test');
  var blocks = pm(markdown);
  env.win.close();
  return blocks;
}
function firstListBlock(blocks) {
  for (var i = 0; i < blocks.length; i++) if (blocks[i].type === 'list') return blocks[i];
  throw new Error('no list block produced');
}

// ── RENDER spy helper (doc.text capture via onJsPDF hook) ───────────────────────
function buildAndCapture(markdown, uiLang) {
  var captured = [];
  var env = buildJsdomEnv({
    onJsPDF: function (doc) {
      var origText = doc.text.bind(doc);
      doc.text = function (txt, x, y) {
        try { captured.push({ text: txt, x: x, y: y }); } catch (_) { /* never break render */ }
        return origText.apply(null, arguments);
      };
    },
  });
  return env.win.PDFExport.buildSessionPDF({
    clientName: 'ZZZ', sessionDate: '2026-05-08', sessionType: 'Online',
    markdown: markdown,
  }, { uiLang: uiLang }).then(function (blob) {
    return blob.arrayBuffer();
  }).then(function () {
    env.win.close();
    return captured;
  });
}

// A "pure ordinal prefix" doc.text call — the split-row ordered prefix draws the
// bare "N. " on its own (firstStrongDir digit => LTR), so its whole visual text
// is just the ordinal + dot (+ space). Unified-row rendering embeds the ordinal
// inside a longer content string, so this pattern is unique to the split-row path.
function isPureOrdinalPrefix(t) {
  return typeof t === 'string' && /^\s*\d+\.\s*$/.test(t);
}

async function main() {
  // ============================================================
  // (1) PARSE structure
  // ============================================================
  test('PARSE: "- a /   - b / - c" items carry depth 0,1,0 (all unordered)', function () {
    var block = firstListBlock(parse('- a\n  - b\n- c'));
    assert.strictEqual(block.items.length, 3, 'three items expected');
    assert.strictEqual(block.items[0].depth, 0, 'item a depth 0');
    assert.strictEqual(block.items[1].depth, 1, 'item b depth 1 (2-space indent)');
    assert.strictEqual(block.items[2].depth, 0, 'item c depth 0');
    assert.strictEqual(block.items[0].ordered, false, 'a unordered');
    assert.strictEqual(block.items[1].ordered, false, 'b unordered');
    assert.strictEqual(block.items[2].ordered, false, 'c unordered');
  });

  test('PARSE: "1. a / (3sp)1. b" nested ordered item carries depth 1 + typed ordinal', function () {
    var block = firstListBlock(parse('1. a\n   1. b'));
    assert.strictEqual(block.items.length, 2, 'two items expected');
    assert.strictEqual(block.items[0].depth, 0, 'item a depth 0');
    assert.strictEqual(block.items[1].depth, 1, 'item b depth 1 (3-space ordinal-continuation folds to level 1)');
    assert.strictEqual(block.items[0].ordered, true, 'a ordered');
    assert.strictEqual(block.items[1].ordered, true, 'b ordered');
    assert.strictEqual(block.items[0].ordinal, 1, 'a typed ordinal 1');
    assert.strictEqual(block.items[1].ordinal, 1, 'b typed ordinal 1 (NOT position-derived)');
  });

  test('PARSE: MIXED "- a /   1. b" classifies a unordered, b ORDERED (per-item marker)', function () {
    var block = firstListBlock(parse('- a\n  1. b'));
    assert.strictEqual(block.items.length, 2, 'two items expected');
    assert.strictEqual(block.items[0].ordered, false, 'a unordered');
    assert.strictEqual(block.items[0].depth, 0, 'a depth 0');
    assert.strictEqual(block.items[1].ordered, true, 'b ORDERED by its own "1." marker, not the block flag');
    assert.strictEqual(block.items[1].depth, 1, 'b depth 1');
    assert.strictEqual(block.items[1].ordinal, 1, 'b typed ordinal 1');
    assert.strictEqual(block.items[1].text, 'b', 'b marker stripped to bare "b"');
  });

  // ============================================================
  // (2) RENDER behavior
  // ============================================================

  // MIXED LTR: nested numbered child draws a "1." numeric prefix, NOT "- 1. b".
  var capMix = await buildAndCapture('- alpha\n  1. beta', 'en');
  test('RENDER MIXED (LTR): nested "beta" row draws a numbered prefix, not a bullet+literal "1."', function () {
    var betaRun = capMix.filter(function (c) {
      return typeof c.text === 'string' && c.text.indexOf('beta') !== -1;
    })[0];
    assert.ok(betaRun, 'a doc.text call rendering "beta" must exist');
    var t = betaRun.text.replace(/^\s+/, '');
    assert.ok(/^\d+\.\s/.test(t),
      'nested numbered child must render with a numeric prefix ("1. beta"); saw ' + JSON.stringify(betaRun.text));
    assert.strictEqual(t.indexOf('-'), -1,
      'nested numbered child must NOT carry a bullet ("- 1. beta" is the pre-45 block-flag bug); saw ' + JSON.stringify(betaRun.text));
  });

  // LTR indent: depth-1 item anchored further from the start (left) margin.
  var capLtr = await buildAndCapture('- a\n  - b\n- c', 'en');
  test('RENDER (LTR): depth-1 item anchors further from the start margin than depth-0', function () {
    var bullets = capLtr.filter(function (c) {
      return typeof c.text === 'string' && c.text.replace(/^\s+/, '').indexOf('- ') === 0;
    });
    var aRow = bullets.filter(function (c) { return c.text.indexOf('a') !== -1; })[0];
    var bRow = bullets.filter(function (c) { return c.text.indexOf('b') !== -1; })[0];
    assert.ok(aRow && bRow, 'both "- a" and "- b" bullet rows must be captured');
    assert.ok(bRow.x > aRow.x + 1,
      'depth-1 "b" leftX (' + bRow.x.toFixed(1) + ') must exceed depth-0 "a" leftX (' + aRow.x.toFixed(1) + ') by the indent step');
  });

  // RTL indent: depth-1 item indents toward the RIGHT margin (rightX shrinks).
  var capRtl = await buildAndCapture('1. hello\n  1. world', 'he');
  test('RENDER (RTL): depth-1 ordered item indents toward the right margin (anchor x decreases)', function () {
    var prefixes = capRtl.filter(function (c) { return isPureOrdinalPrefix(c.text); });
    assert.strictEqual(prefixes.length, 2,
      'exactly two pure "N." split-row prefixes expected (one per ordered row); saw ' + prefixes.length);
    prefixes.sort(function (p, q) { return p.y - q.y; }); // first row = smaller y
    assert.ok(prefixes[1].x < prefixes[0].x - 1,
      'depth-1 prefix x (' + prefixes[1].x.toFixed(1) + ') must be LESS than depth-0 prefix x (' +
      prefixes[0].x.toFixed(1) + ') — RTL nesting indents rightward (physical offset off docDir)');
  });

  // RTL NOTE 5: nested ORDERED child (LTR content) under an UNORDERED parent still
  // takes the split-row ordered-prefix path — keyed on the ITEM's ordered-ness.
  var capNote5 = await buildAndCapture('- שלום\n  1. hello', 'he');
  test('RENDER (RTL, NOTE 5): mixed ordered child under a bullet parent takes the split-row ordered prefix', function () {
    var prefixes = capNote5.filter(function (c) { return isPureOrdinalPrefix(c.text); });
    assert.strictEqual(prefixes.length, 1,
      'the nested ordered child must emit exactly one pure "N." split-row prefix (keyed on item.ordered, NOT block.ordered); saw ' + prefixes.length);
    assert.ok(prefixes[0].x > 400 && prefixes[0].x <= RIGHT_X,
      'the split-row prefix must anchor in the RIGHT region (x=' + prefixes[0].x.toFixed(1) +
      '), not dragged toward the left margin');
  });

  // ============================================================
  // (3) GAP-45-02 — marker-only lines parse as EMPTY list items
  // ============================================================
  test('PARSE marker-only: `1.` is a list block whose sole item is empty ordered ordinal-1', function () {
    var block = firstListBlock(parse('1.'));
    assert.strictEqual(block.items.length, 1, 'one item expected');
    assert.deepStrictEqual(block.items[0], { text: '', ordinal: 1, depth: 0, ordered: true });
  });

  test('PARSE marker-only: `1.` and `1. ` yield the identical list/item shape (1. ≡ 1. )', function () {
    var a = firstListBlock(parse('1.'));
    var b = firstListBlock(parse('1. '));
    assert.deepStrictEqual(a.items, b.items, '`1.` and `1. ` must produce identical items');
  });

  test('PARSE marker-only: `-`, `- `, `*` are list blocks whose sole item is empty unordered', function () {
    ['-', '- ', '*'].forEach(function (src) {
      var block = firstListBlock(parse(src));
      assert.strictEqual(block.items.length, 1, 'one item expected for ' + JSON.stringify(src));
      assert.deepStrictEqual(block.items[0], { text: '', depth: 0, ordered: false },
        'empty unordered item expected for ' + JSON.stringify(src));
    });
  });

  test('PARSE regression: `1.5 mg` stays a paragraph (1.5-guard preserved)', function () {
    var blocks = parse('1.5 mg');
    assert.strictEqual(blocks[0].type, 'para', '1.5 mg must be a paragraph, not a list');
  });

  // ── Count guard ──────────────────────────────────────────────────────────────
  var EXPECTED = 11; // 3 parse + 4 render + 4 marker-only
  test('count guard: expected ' + EXPECTED + ' assertions ran', function () {
    assert.strictEqual(passed + failed, EXPECTED,
      'expected ' + EXPECTED + ' tests before the count guard, saw ' + (passed + failed));
  });

  console.log('\n45-pdf-nested-lists: passed ' + passed + ', failed ' + failed + '.');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(function (err) {
  console.error('FATAL:', err && err.stack || err);
  process.exit(1);
});
