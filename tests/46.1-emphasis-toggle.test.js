/**
 * tests/46.1-emphasis-toggle.test.js — the bold/italic toggle behavior contract
 * (46.1-BOLD-SEMANTICS-RESEARCH §3, ratified: D1=swap, D2=empty pair, D3=mixed
 * applies). One falsifiable case per clause, both markers where meaningful.
 *
 * Pure-function test: loads assets/text-edit.js in a vm sandbox and drives
 * TextEdit.toggleWrap through __testExports (the tests/text-edit.test.js loader
 * idiom). No jsdom — the transform is pure; the emit-acceptance harness
 * (tests/46.1-emphasis-emit-acceptance.test.js) covers the renderer/PDF side.
 *
 * The five verified defects of the naive span-wrapper (§1) appear here as
 * direct cases and are RED against the pre-contract implementation:
 *   #1 multi-line single-pair wrap            → C4 cases
 *   #2 nesting inside an existing bold span   → C2 unwrap-inside
 *   #3 selection including the markers        → C2 marker-edge normalize
 *   #4 italic press on bold content corrupts  → C7/D1 swap cases
 *   #5 bold press on italic content emits *** → C7/D1 swap cases
 *
 * Run: node tests/46.1-emphasis-toggle.test.js   (exit 0 pass / 1 fail)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// --- Sandbox (mirrors tests/text-edit.test.js) ------------------------------
function makeSandbox() {
  const sandbox = {
    window: {},
    document: { execCommand() { return false; } },
    console: { log() {}, warn() {}, error() {} },
    Event: function Event(type, opts) { this.type = type; this.bubbles = !!(opts && opts.bubbles); },
    JSON, Math, Date, Array, Object, Set, Map, WeakMap, RegExp, String, Number, Boolean,
  };
  vm.createContext(sandbox);
  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'text-edit.js'), 'utf8');
  vm.runInContext(src, sandbox, { filename: 'assets/text-edit.js' });
  return sandbox;
}

let sandbox;
try {
  sandbox = makeSandbox();
} catch (err) {
  console.error('FATAL: assets/text-edit.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}
const TextEdit = sandbox.window.TextEdit;
if (!TextEdit || typeof TextEdit.toggleWrap !== 'function') {
  console.error('FAIL: window.TextEdit.toggleWrap not found.');
  process.exit(1);
}

const BOLD = '**';
const ITAL = '*';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + err.message); failed++; }
}

function applyRep(value, rep) {
  return value.slice(0, rep.start) + rep.text + value.slice(rep.end);
}

// Every invocation goes through this recorder so the C7/C8 sweeps at the bottom
// cover EVERY case's output, not a hand-picked subset.
const RESULTS = [];
function run(value, s, e, marker) {
  const r = TextEdit.toggleWrap(value, s, e, marker);
  // C8 shape: exactly one {start,end,text} replacement that reproduces `value`.
  assert.ok(r && r.replacement, 'toggle must return a replacement');
  assert.strictEqual(applyRep(value, r.replacement), r.value,
    'the single spanning replacement must reproduce the returned value');
  RESULTS.push({
    input: value,
    marker: marker,
    out: r,
    pairInsert: r.replacement.start === r.replacement.end && r.replacement.text === marker + marker,
  });
  return r;
}

// A no-op outcome: value untouched, empty-length replacement (caller-skippable).
function assertNoop(r, value) {
  assert.strictEqual(r.value, value, 'no-op must leave the value untouched');
  assert.strictEqual(r.replacement.start, r.replacement.end, 'no-op replacement is zero-length');
  assert.strictEqual(r.replacement.text, '', 'no-op replacement carries no text');
}

// Selection helper: [start, end) of the FIRST occurrence of `sub`.
function sel(value, sub) {
  const i = value.indexOf(sub);
  assert.ok(i !== -1, 'selection helper: ' + JSON.stringify(sub) + ' not found in ' + JSON.stringify(value));
  return [i, i + sub.length];
}

// ── C1 — normalize first ─────────────────────────────────────────────────────
test('C1: a whitespace-padded selection is trimmed before wrapping (markers hug)', () => {
  const v = 'say word now';
  const r = run(v, 3, 9, BOLD); // " word " incl. both spaces
  assert.strictEqual(r.value, 'say **word** now');
  assert.strictEqual(r.selStart, 6, 'selection covers the wrapped content');
  assert.strictEqual(r.selEnd, 10);
});

test('C1: an all-whitespace selection is a no-op (empty replacement, selection kept)', () => {
  const v = 'a   b';
  const r = run(v, 1, 4, BOLD);
  assertNoop(r, v);
  assert.strictEqual(r.selStart, 1);
  assert.strictEqual(r.selEnd, 4);
});

// ── C2 — FULL state removes the containing span entirely ─────────────────────
test('C2: unwrap-exact — selecting a bold span content un-bolds it', () => {
  const v = 'make **bold** now';
  const r = run(v, 7, 11, BOLD);
  assert.strictEqual(r.value, 'make bold now');
  assert.strictEqual(r.selStart, 5, 'selection covers the formerly-emphasized content');
  assert.strictEqual(r.selEnd, 9);
});

test('C2: unwrap-inside — a selection deep inside a span un-bolds the WHOLE span (defect #2)', () => {
  const v = '**bolded text**';
  const [s, e] = sel(v, 'text');
  const r = run(v, s, e, BOLD);
  assert.strictEqual(r.value, 'bolded text', 'no nesting, no splitting — the containing span un-bolds');
  assert.strictEqual(r.selStart, 0, 'selection covers the formerly-emphasized content');
  assert.strictEqual(r.selEnd, 11);
});

test('C2: a selection that includes the markers is treated as the span content (defect #3)', () => {
  const v = '**word**';
  const r = run(v, 0, v.length, BOLD);
  assert.strictEqual(r.value, 'word', 'never a quadrupled marker');
  assert.strictEqual(r.selStart, 0);
  assert.strictEqual(r.selEnd, 4);
});

test('C2: italic unwrap-exact mirrors bold', () => {
  const v = 'an *em* word';
  const [s, e] = sel(v, 'em');
  const r = run(v, s, e, ITAL);
  assert.strictEqual(r.value, 'an em word');
  assert.strictEqual(r.selStart, 3);
  assert.strictEqual(r.selEnd, 5);
});

// ── C3 — MIXED/NONE applies (D3), union in one pair per line-segment ─────────
test('C3: multi-fragment selection merges into ONE pair (never nests)', () => {
  const v = '**a** mid **b**';
  const r = run(v, 0, v.length, BOLD);
  assert.strictEqual(r.value, '**a mid b**', 'union of the fragments, a single pair');
  assert.strictEqual(r.selStart, 2);
  assert.strictEqual(r.selEnd, 9);
});

test('C3: partial overlap grows the span — the un-selected remainder stays emphasized', () => {
  const v = 'pre **bold** post';
  const r = run(v, 2, 7, BOLD); // "e **b" straddles the opening marker
  assert.strictEqual(r.value, 'pr**e bold** post', 'union of selection + span content, one pair');
  assert.strictEqual(r.selStart, 4);
  assert.strictEqual(r.selEnd, 10);
});

test('C3/D3: MIXED state applies — plain + bold selection makes everything bold', () => {
  const v = 'plain **bold**';
  const r = run(v, 0, v.length, BOLD);
  assert.strictEqual(r.value, '**plain bold**');
  assert.strictEqual(r.selStart, 2);
  assert.strictEqual(r.selEnd, 12);
});

// ── C4 — multi-line: one state, per-line pairs ───────────────────────────────
test('C4: multi-line wrap emits one pair per line, never one pair around the block (defect #1)', () => {
  const v = 'line one\nline two';
  const r = run(v, 0, v.length, BOLD);
  assert.deepStrictEqual(r.value.split('\n'), ['**line one**', '**line two**'],
    'each line carries its own hugging pair');
  assert.strictEqual(r.selStart, 2, 'selection: first segment content start');
  assert.strictEqual(r.selEnd, 23, 'selection: last segment content end');
});

test('C4: a blank line inside the selection is skipped, never wrapped', () => {
  const v = 'one\n\ntwo';
  const r = run(v, 0, v.length, BOLD);
  assert.strictEqual(r.value, '**one**\n\n**two**');
  assert.strictEqual(r.selStart, 2);
  assert.strictEqual(r.selEnd, 14);
});

test('C4: a whitespace-only line inside the selection stays untouched', () => {
  const v = 'one\n   \ntwo';
  const r = run(v, 0, v.length, BOLD);
  assert.strictEqual(r.value, '**one**\n   \n**two**');
});

test('C4: multi-line with all-bold lines un-bolds per line (one state across the selection)', () => {
  const v = '**one**\n**two**';
  const r = run(v, 0, v.length, BOLD);
  assert.strictEqual(r.value, 'one\ntwo');
  assert.strictEqual(r.selStart, 0);
  assert.strictEqual(r.selEnd, 7);
});

// ── C5 — clamp to content regions ────────────────────────────────────────────
test('C5: a selection over a bullet line clamps after the marker — never **- item**', () => {
  const v = '- item';
  const r = run(v, 0, v.length, BOLD);
  assert.strictEqual(r.value, '- **item**');
  assert.strictEqual(r.selStart, 4);
  assert.strictEqual(r.selEnd, 8);
});

test('C5: an ordered-list line clamps after "N. "', () => {
  const v = '1. step';
  const r = run(v, 0, v.length, BOLD);
  assert.strictEqual(r.value, '1. **step**');
});

test('C5: a nested bullet keeps its indent + marker outside the pair', () => {
  const v = '  - deep';
  const r = run(v, 0, v.length, BOLD);
  assert.strictEqual(r.value, '  - **deep**');
});

test('C5: a heading line clamps after the "## " prefix', () => {
  const v = '## Title';
  const r = run(v, 0, v.length, BOLD);
  assert.strictEqual(r.value, '## **Title**');
  assert.strictEqual(r.selStart, 5);
  assert.strictEqual(r.selEnd, 10);
});

test('C5: a selection covering only the marker/prefix chars is a no-op', () => {
  const v = '- item';
  const r = run(v, 0, 2, BOLD);
  assertNoop(r, v);
  assert.strictEqual(r.selStart, 0);
  assert.strictEqual(r.selEnd, 2);
});

// ── C6 — caret rules ─────────────────────────────────────────────────────────
test('C6-i: a caret inside a span content un-wraps the containing span, caret on the same char', () => {
  const v = '**word**';
  const r = run(v, 4, 4, BOLD); // between "wo" and "rd"
  assert.strictEqual(r.value, 'word');
  assert.strictEqual(r.selStart, 2, 'caret still sits between "wo" and "rd"');
  assert.strictEqual(r.selEnd, 2);
});

test('C6-ii: a caret at the end of the span content hops past the closer with ZERO text edit', () => {
  const v = '**word**';
  const r = run(v, 6, 6, BOLD); // just before the closing **
  assertNoop(r, v);
  assert.strictEqual(r.selStart, 8, 'caret moved past the closing marker');
  assert.strictEqual(r.selEnd, 8);
});

test('C6-ii: italic skip-out mirrors bold', () => {
  const v = '*word*';
  const r = run(v, 5, 5, ITAL);
  assertNoop(r, v);
  assert.strictEqual(r.selStart, 6);
});

test('C6-iii: a caret between an empty bold pair removes the pair', () => {
  const v = 'ab****cd';
  const r = run(v, 4, 4, BOLD);
  assert.strictEqual(r.value, 'abcd');
  assert.strictEqual(r.selStart, 2);
  assert.strictEqual(r.selEnd, 2);
});

test('C6-iii: a caret between an empty italic pair removes the pair', () => {
  const v = 'ab**cd';
  const r = run(v, 3, 3, ITAL);
  assert.strictEqual(r.value, 'abcd');
  assert.strictEqual(r.selStart, 2);
});

test('C6-iv/D2: a plain-text caret inserts an empty pair, caret between (type-flow)', () => {
  const v = 'hello ';
  const r = run(v, 6, 6, BOLD);
  assert.strictEqual(r.value, 'hello ****');
  assert.strictEqual(r.selStart, 8);
  assert.strictEqual(r.selEnd, 8);
});

test('C6-iv/C5: a caret inside a list marker clamps the pair into the content region', () => {
  const v = '- item';
  const r = run(v, 1, 1, BOLD); // between "-" and its space
  assert.strictEqual(r.value, '- ****item', 'the pair lands at the content start, never before the marker');
  assert.strictEqual(r.selStart, 4);
});

// ── C7 — cross-marker collisions resolve per D1 (swap), never emit *** ───────
test('C7/D1: italic on bold content SWAPS deliberately — never a nested or literal artifact (defect #4)', () => {
  const v = '**word**';
  const [s, e] = sel(v, 'word');
  const r = run(v, s, e, ITAL);
  assert.strictEqual(r.value, '*word*', 'the pressed marker wins');
  assert.strictEqual(r.selStart, 1);
  assert.strictEqual(r.selEnd, 5);
});

test('C7/D1: italic press with a CARET inside bold content swaps too — no mid-word pair (defect #4)', () => {
  const v = '**word**';
  const r = run(v, 4, 4, ITAL); // caret between "wo" and "rd"
  assert.strictEqual(r.value, '*word*', 'never the corrupt **wo**rd** shape');
  assert.strictEqual(r.selStart, 3, 'caret stays between "wo" and "rd"');
});

test('C7/D1: bold on italic content swaps — never ***word*** (defect #5)', () => {
  const v = '*word*';
  const [s, e] = sel(v, 'word');
  const r = run(v, s, e, BOLD);
  assert.strictEqual(r.value, '**word**');
  assert.strictEqual(r.selStart, 2);
  assert.strictEqual(r.selEnd, 6);
});

test('C7/D1: italic on PART of a bold span swaps the whole collision — no *** cluster', () => {
  const v = '**bolded text**';
  const [s, e] = sel(v, 'text');
  const r = run(v, s, e, ITAL);
  assert.strictEqual(r.value, '*bolded text*', 'the intersected span is absorbed, pressed marker wins');
  assert.strictEqual(r.selStart, 1);
  assert.strictEqual(r.selEnd, 12);
});

test('C7/D1: disjoint bold and italic on one line stay untouched by a toggle elsewhere', () => {
  const v = '*it* and **b**';
  const [s, e] = sel(v, 'and');
  const r = run(v, s, e, BOLD);
  assert.strictEqual(r.value, '*it* **and** **b**', 'the disjoint spans are not collateral');
});

test('C7: wrapping flush against an existing bold span absorbs it — never a **** cluster', () => {
  const v = '**a**word';
  const [s, e] = sel(v, 'word');
  const r = run(v, s, e, BOLD);
  assert.strictEqual(r.value, '**aword**');
  assert.strictEqual(r.selStart, 2);
  assert.strictEqual(r.selEnd, 7);
});

test('C7: wrapping flush against an existing italic span absorbs it under the pressed marker', () => {
  const v = '*it*word';
  const [s, e] = sel(v, 'word');
  const r = run(v, s, e, BOLD);
  assert.strictEqual(r.value, '**itword**', 'zero-gap collision resolves to the pressed marker');
});

test('C7: an empty-pair press of the OTHER marker swaps the pair in place', () => {
  const v = 'a**b';
  const r = run(v, 2, 2, BOLD); // caret between an empty italic pair
  assert.strictEqual(r.value, 'a****b', 'italic empty pair becomes a bold empty pair');
  assert.strictEqual(r.selStart, 3, 'caret sits between the swapped pair');
  const v2 = 'x****y';
  const r2 = run(v2, 3, 3, ITAL); // caret between an empty bold pair
  assert.strictEqual(r2.value, 'x**y', 'bold empty pair becomes an italic empty pair');
  assert.strictEqual(r2.selStart, 2);
});

test('C7: hand-typed ***word*** degrades one marker layer per press, never grows', () => {
  const v = '***word***';
  const rb = run(v, 5, 5, BOLD); // caret inside the content
  assert.strictEqual(rb.value, '*word*', 'bold press strips the bold layer, italic survives');
  const ri = run(v, 5, 5, ITAL);
  assert.strictEqual(ri.value, '**word**', 'italic press strips the italic layer, bold survives');
});

// ── Grammar-unwrappable content: skip rather than emit literal markers ───────
test('a selection whose content holds a loose star cannot be wrapped — no-op, never literal **', () => {
  const v = '2 * 3';
  const r = run(v, 0, v.length, BOLD);
  assertNoop(r, v);
});

test('D2 next to a loose star is a no-op — an empty pair may never fuse into a cluster', () => {
  const v = '2 * 3';
  const r1 = run(v, 3, 3, BOLD); // caret right after the star
  assertNoop(r1, v);
  const r2 = run(v, 2, 2, BOLD); // caret right before the star
  assertNoop(r2, v);
});

// ── C9/C10 — selection maps to the same text; involution on pure states ──────
// Toggle twice from a pure state with the RETURNED selection: text AND selection
// must round-trip byte-identically.
function roundTrip(v0, s0, e0, marker) {
  const r1 = run(v0, s0, e0, marker);
  const r2 = run(r1.value, r1.selStart, r1.selEnd, marker);
  assert.strictEqual(r2.value, v0, 'toggle∘toggle must restore the text');
  assert.strictEqual(r2.selStart, s0, 'toggle∘toggle must restore selStart');
  assert.strictEqual(r2.selEnd, e0, 'toggle∘toggle must restore selEnd');
}

test('C10: wrap→unwrap round-trips on plain text (both markers)', () => {
  roundTrip('make bold now', 5, 9, BOLD);
  roundTrip('make bold now', 5, 9, ITAL);
});

test('C10: unwrap→wrap round-trips from the emphasized side', () => {
  roundTrip('make **bold** now', 7, 11, BOLD);
  roundTrip('an *em* word', 4, 6, ITAL);
});

test('C10: round-trip holds on a list line and a heading line', () => {
  roundTrip('- item', 2, 6, BOLD);
  roundTrip('## Title', 3, 8, BOLD);
});

test('C10: round-trip holds across a multi-line selection', () => {
  roundTrip('one\ntwo', 0, 7, BOLD);
});

test('C10: a MIXED selection converges to FULL after one apply; the involution holds from there', () => {
  const v0 = '**a** mid **b**';
  const r1 = run(v0, 0, v0.length, BOLD);   // MIXED → apply
  assert.strictEqual(r1.value, '**a mid b**');
  const r2 = run(r1.value, r1.selStart, r1.selEnd, BOLD); // FULL → remove
  assert.strictEqual(r2.value, 'a mid b');
  const r3 = run(r2.value, r2.selStart, r2.selEnd, BOLD); // NONE → apply
  assert.strictEqual(r3.value, r1.value, 'from the converged pure state the toggle is an involution');
  assert.strictEqual(r3.selStart, r1.selStart);
  assert.strictEqual(r3.selEnd, r1.selEnd);
});

// ── C6-iii/iv involution: pair insert ↔ pair remove ──────────────────────────
test('C10: the empty-pair micro-flow is an involution (insert then remove)', () => {
  const r1 = run('note ', 5, 5, BOLD);
  assert.strictEqual(r1.value, 'note ****');
  const r2 = run(r1.value, r1.selStart, r1.selEnd, BOLD);
  assert.strictEqual(r2.value, 'note ');
  assert.strictEqual(r2.selStart, 5);
});

// ── C7 sweep — EVERY recorded output ─────────────────────────────────────────
test('C7 sweep: no case output contains a *** cluster; empty-pair inserts stay isolated', () => {
  assert.ok(RESULTS.length > 30, 'the sweep must cover the full case list');
  RESULTS.forEach((rec) => {
    if (rec.pairInsert) {
      const rep = rec.out.replacement;
      assert.notStrictEqual(rec.input.charAt(rep.start - 1), '*',
        'an inserted empty pair must not touch a star on its left: ' + JSON.stringify(rec.out.value));
      assert.notStrictEqual(rec.input.charAt(rep.start), '*',
        'an inserted empty pair must not touch a star on its right: ' + JSON.stringify(rec.out.value));
      const rest = rec.out.value.slice(0, rep.start) + rec.out.value.slice(rep.start + rep.text.length);
      assert.ok(!/\*{3,}/.test(rest),
        'outside the inserted pair no *** may exist: ' + JSON.stringify(rec.out.value));
    } else if (!/\*{3,}/.test(rec.input)) {
      // Degenerate inputs that already hold a cluster only ever shrink it; every
      // clean input must stay clean.
      assert.ok(!/\*{3,}/.test(rec.out.value),
        'emitted a *** cluster: ' + JSON.stringify(rec.input) + ' -> ' + JSON.stringify(rec.out.value));
    }
  });
});

// ── C8 sweep — replacement discipline on every case ──────────────────────────
test('C8 sweep: unchanged-value outcomes always return the empty caller-skippable replacement', () => {
  RESULTS.forEach((rec) => {
    if (rec.out.value === rec.input) {
      assert.strictEqual(rec.out.replacement.start, rec.out.replacement.end,
        'a value-preserving outcome must be a zero-length replacement');
      assert.strictEqual(rec.out.replacement.text, '',
        'a value-preserving outcome must carry no text');
    }
  });
});

// ── Source identity — the toggle's grammar IS the renderers' grammar ─────────
// The emphasis span patterns in text-edit.js must be CHARACTER-IDENTICAL to
// md-render.js applyInline's (which tests/45-pipeline-agreement.test.js pins to
// pdf-export.js) — the markers this module emits are exactly those both
// pipelines accept.
test('source identity: text-edit emphasis regexes === md-render applyInline regexes', () => {
  const teSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'text-edit.js'), 'utf8');
  const mdSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'md-render.js'), 'utf8');
  function emphasisPatterns(body) {
    const re = /\/((?:\\.|[^\/\n\\])+)\/g/g;
    const out = [];
    let m;
    while ((m = re.exec(body)) !== null) {
      if (m[1].indexOf('\\*') !== -1) out.push(m[1]);
    }
    return out;
  }
  function bodyOf(src, mark) {
    const start = src.indexOf(mark);
    assert.ok(start !== -1, 'could not locate ' + mark);
    const next = src.indexOf('\n  function ', start + mark.length);
    return src.slice(start, next === -1 ? src.length : next);
  }
  const mdPatterns = emphasisPatterns(bodyOf(mdSrc, 'function applyInline'));
  const tePatterns = emphasisPatterns(teSrc);
  assert.strictEqual(mdPatterns.length, 2, 'md-render applyInline must expose bold+italic');
  assert.strictEqual(tePatterns.length, 2,
    'text-edit must hold exactly the two emphasis regexes (bold + italic); got ' + tePatterns.length);
  assert.strictEqual(tePatterns[0], mdPatterns[0], 'BOLD pattern must be character-identical');
  assert.strictEqual(tePatterns[1], mdPatterns[1], 'ITALIC pattern must be character-identical');
});

// ── Count guard — no vacuous green ───────────────────────────────────────────
const EXPECTED = 45;
if (passed + failed !== EXPECTED) {
  console.log('  FAIL  count guard: expected ' + EXPECTED + ' tests, ran ' + (passed + failed));
  failed++;
} else {
  console.log('  PASS  count guard: ' + EXPECTED + ' tests ran');
}

console.log('\n46.1 emphasis-toggle contract: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
