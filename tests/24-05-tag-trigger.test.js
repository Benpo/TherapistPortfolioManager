/**
 * Phase 24 Plan 05 — Behavior test for tag-trigger MVP fallback in detectTrigger.
 *
 * When the user types <prefix><query> with NO exact trigger prefix-match
 * available, the engine falls back to tag prefix-match: returns all snippets
 * with a tag starting with the query. Per Ben's UAT decision (session 3).
 *
 * Loads assets/snippets.js in a vm sandbox and reads Snippets.__testExports.
 *
 * Run: node tests/24-05-tag-trigger.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * 6 scenarios:
 *   A. Trigger prefix-match returns trigger candidates (tag path NOT used).
 *   B. No trigger match, exact tag → returns all snippets with that tag.
 *   C. No trigger match, tag prefix-match → returns all matching snippets.
 *   D. No trigger match AND no tag match → empty candidates.
 *   E. Two snippets share a tag → both returned without duplication.
 *   F. Tag-trigger does NOT apply on boundary (active match path) —
 *      typing ";nonexistent " with a boundary still returns null when no
 *      exact trigger; tag matches only show in partial state.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Sandbox with stubs for window + document
const sandbox = {
  window: {},
  document: {
    addEventListener() {},
    removeEventListener() {},
    getElementById() { return null; },
    createElement() { return { setAttribute() {}, append() {}, appendChild() {}, addEventListener() {}, classList: { add() {}, remove() {} }, style: {} }; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    body: { appendChild() {} },
    head: { appendChild() {} },
  },
  console: { error() {}, warn() {}, log() {} },
  setTimeout, clearTimeout, Promise,
  localStorage: { getItem() { return null; }, setItem() {} },
};
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'snippets.js'), 'utf8');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/snippets.js' });
} catch (err) {
  console.error('FATAL: assets/snippets.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const Snippets = sandbox.window.Snippets;
if (!Snippets || !Snippets.__testExports || typeof Snippets.__testExports.detectTrigger !== 'function') {
  console.error('FAIL: Snippets.__testExports.detectTrigger not exposed.');
  process.exit(1);
}
const detectTrigger = Snippets.__testExports.detectTrigger;

// Test fixture: snippets indexed by lowercase trigger
function snip(trigger, tags) {
  return {
    id: 'seed.' + trigger,
    trigger: trigger,
    expansions: { he: '', en: 'expansion of ' + trigger, cs: '', de: '' },
    tags: tags || [],
    origin: 'seed',
  };
}

function buildMap(snippets) {
  const m = new Map();
  for (const s of snippets) m.set(s.trigger.toLowerCase(), s);
  return m;
}

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    failed++;
  }
}

// ────────────────────────────────────────────────────────────────────

test('A. Trigger prefix-match returns trigger candidates (tag path NOT used)', () => {
  // Cache: two triggers starting with "bet" + a third starting with "for".
  // The tag "emotion" is on all three — if the tag fallback fired, it would
  // pollute the candidates with forgiveness. It must NOT fire when trigger
  // prefix-match has at least one hit.
  const cache = [
    snip('betrayal',     ['emotion']),
    snip('beta-feeling', ['emotion']),
    snip('forgiveness',  ['emotion']),
  ];
  const result = detectTrigger(';bet', ';', buildMap(cache));
  if (!result || result.type !== 'partial') {
    throw new Error('A: expected partial result, got ' + JSON.stringify(result));
  }
  if (result.candidates.length !== 2) {
    throw new Error('A: expected 2 candidates (betrayal + beta-feeling), got ' + result.candidates.length);
  }
  const triggers = result.candidates.map((c) => c.trigger).sort();
  if (JSON.stringify(triggers) !== JSON.stringify(['beta-feeling', 'betrayal'])) {
    throw new Error('A: wrong candidates: ' + JSON.stringify(triggers));
  }
  if (result.matchedTag !== null) {
    throw new Error('A: matchedTag should be null when trigger path succeeds, got ' + result.matchedTag);
  }
});

test('B. No trigger match, exact tag → returns all snippets with that tag', () => {
  const cache = [
    snip('betrayal',  ['emotion', 'heart']),
    snip('joy',       ['emotion']),
    snip('lung-related', ['lung']),
  ];
  const result = detectTrigger(';emotion', ';', buildMap(cache));
  if (!result || result.type !== 'partial') {
    throw new Error('B: expected partial result, got ' + JSON.stringify(result));
  }
  // "emotion" does not prefix any trigger (betrayal/joy/lung-related), so
  // the tag path is taken. Both betrayal + joy have tag "emotion".
  const triggers = result.candidates.map((c) => c.trigger).sort();
  if (JSON.stringify(triggers) !== JSON.stringify(['betrayal', 'joy'])) {
    throw new Error('B: wrong candidates: ' + JSON.stringify(triggers));
  }
  if (result.matchedTag !== 'emotion') {
    throw new Error('B: expected matchedTag "emotion", got ' + result.matchedTag);
  }
});

test('C. No trigger match, tag prefix-match → returns matching snippets', () => {
  const cache = [
    snip('alpha', ['personal']),
    snip('beta',  ['personal-care']),
    snip('gamma', ['professional']),
  ];
  const result = detectTrigger(';pers', ';', buildMap(cache));
  if (!result || result.type !== 'partial') {
    throw new Error('C: expected partial result');
  }
  // "pers" doesn't prefix any trigger. Tag prefix match: "personal" and
  // "personal-care" both start with "pers"; alpha + beta match.
  const triggers = result.candidates.map((c) => c.trigger).sort();
  if (JSON.stringify(triggers) !== JSON.stringify(['alpha', 'beta'])) {
    throw new Error('C: wrong candidates: ' + JSON.stringify(triggers));
  }
});

test('D. No trigger match AND no tag match → empty candidates', () => {
  const cache = [
    snip('alpha', ['personal']),
    snip('beta',  ['personal']),
  ];
  const result = detectTrigger(';xyz', ';', buildMap(cache));
  if (!result || result.type !== 'partial') {
    throw new Error('D: expected partial result with empty candidates, got ' + JSON.stringify(result));
  }
  if (result.candidates.length !== 0) {
    throw new Error('D: expected 0 candidates, got ' + result.candidates.length);
  }
  if (result.matchedTag !== null) {
    throw new Error('D: matchedTag should be null, got ' + result.matchedTag);
  }
});

test('E. Snippet with multiple matching tags returned only once', () => {
  const cache = [
    snip('alpha', ['personal', 'personal-deep', 'work']),
    snip('beta',  ['unrelated']),
  ];
  const result = detectTrigger(';pers', ';', buildMap(cache));
  if (!result || result.type !== 'partial') throw new Error('E: expected partial');
  if (result.candidates.length !== 1) {
    throw new Error('E: expected 1 candidate (no dedup failure), got ' + result.candidates.length);
  }
  if (result.candidates[0].trigger !== 'alpha') {
    throw new Error('E: wrong candidate: ' + result.candidates[0].trigger);
  }
});

test('G. Hebrew tag prefix-match — Unicode-aware regex accepts non-Latin chars', () => {
  // Ben tagged emotion "betrayal" with Hebrew tag "אישי" via the Settings
  // editor. Now typing ";אישי" in a session textarea must surface the
  // popover with that snippet. Pre-fix, the trigger regex was [A-Za-z0-9-]
  // so the regex itself failed to match before tag lookup ever ran.
  const cache = [
    snip('betrayal', ['אישי', 'work']),
    snip('joy',      ['אישי']),
    snip('alpha',    ['unrelated']),
  ];
  const result = detectTrigger(';אישי', ';', buildMap(cache));
  if (!result || result.type !== 'partial') {
    throw new Error('G: expected partial result for Hebrew tag, got ' + JSON.stringify(result));
  }
  const triggers = result.candidates.map((c) => c.trigger).sort();
  if (JSON.stringify(triggers) !== JSON.stringify(['betrayal', 'joy'])) {
    throw new Error('G: wrong candidates: ' + JSON.stringify(triggers));
  }
  if (result.matchedTag !== 'אישי') {
    throw new Error('G: expected matchedTag "אישי", got ' + result.matchedTag);
  }
});

test('H. Hebrew tag prefix-match works on partial query (";איש" for tag "אישי")', () => {
  const cache = [
    snip('betrayal', ['אישי']),
  ];
  const result = detectTrigger(';איש', ';', buildMap(cache));
  if (!result || result.type !== 'partial' || result.candidates.length !== 1) {
    throw new Error('H: expected 1 candidate, got ' + JSON.stringify(result));
  }
});

test('F. Tag-trigger does NOT apply on boundary (active match path)', () => {
  // Boundary case: ";emotion " (trailing space). With no exact trigger
  // "emotion", the engine returns null — does NOT try the tag fallback.
  // Tag-trigger only fires in the partial (no boundary) state so the user
  // can deliberately select which snippet to insert.
  const cache = [
    snip('betrayal', ['emotion']),
    snip('joy',      ['emotion']),
  ];
  const result = detectTrigger(';emotion ', ';', buildMap(cache));
  if (result !== null) {
    throw new Error('F: expected null (no auto-expansion on tag), got ' + JSON.stringify(result));
  }
});

console.log('');
console.log(`Plan 05 tag-trigger tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
