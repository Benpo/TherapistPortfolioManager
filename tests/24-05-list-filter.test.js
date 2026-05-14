/**
 * Phase 24 Plan 05 — Behavior test for filterSnippetList helper.
 *
 * Pure-function test: loads assets/settings.js in a vm sandbox, reads
 * filterSnippetList from window.__SnippetEditorHelpers.
 *
 * Run: node tests/24-05-list-filter.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * 9 scenarios per the Plan 05 Test Coverage Plan:
 *   A. Empty searchText + empty activeTags → full cache sorted by trigger.
 *   B. searchText "bet" → matches snippet trigger "betrayal".
 *   C. searchText "forgiven" → matches expansion content (not trigger).
 *   D. searchText matches BOTH trigger and expansion → returned once (no dupe).
 *   E. activeTags ['ec.a1'] → only snippets tagged ec.a1.
 *   F. activeTags ['ec.a1','ec.a2'] → OR-combine.
 *   G. searchText AND activeTags → AND-combine.
 *   H. Sort stability: two snippets with identical prefix sort by full trigger asc.
 *   I. currentLang fallback: snippet has empty 'cs', searchText excludes it
 *      (search is current-locale only per D-16).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {
  window: {},
  document: {
    addEventListener() {},
    removeEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return { setAttribute() {}, appendChild() {}, append() {}, addEventListener() {}, classList: { add() {}, remove() {} } }; },
    body: { prepend() {}, appendChild() {} },
    head: { appendChild() {} },
  },
  console: { error() {}, warn() {}, log() {} },
  setTimeout, clearTimeout, Promise,
};
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings.js'), 'utf8');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/settings.js' });
} catch (err) {
  console.error('FATAL: assets/settings.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const helpers = sandbox.window.__SnippetEditorHelpers;
if (!helpers || typeof helpers.filterSnippetList !== 'function') {
  console.error('FAIL: window.__SnippetEditorHelpers.filterSnippetList is not exposed.');
  console.error('      Plan 05 Task 1 must extract filterSnippetList as a pure helper');
  console.error('      and expose it via window.__SnippetEditorHelpers for tests.');
  process.exit(1);
}
const filterSnippetList = helpers.filterSnippetList;

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

function snip(id, trigger, expEn, tags, expCs) {
  return {
    id,
    trigger,
    expansions: { he: '', en: expEn || '', cs: expCs || '', de: '' },
    tags: tags || [],
    origin: 'seed',
  };
}

// Common fixture
function fixture() {
  return [
    snip('1', 'betrayal',       'Betrayal — a deep wound.',                ['ec.a1']),
    snip('2', 'unreceived-love', 'A pain that hides forgiveness.',         ['ec.a1']),
    snip('3', 'heart-shock',     'Sudden trauma to the chest.',            ['ec.a2']),
    snip('4', 'rejection',       'Felt cast out by another.',              ['ec.a3']),
    snip('5', 'abandoned',       'Left alone — a primal fear.',            ['ec.a2', 'ec.a3']),
  ];
}

// ────────────────────────────────────────────────────────────────────

test('A. Empty searchText + empty activeTags → full cache sorted alphabetically by trigger', () => {
  const out = filterSnippetList(fixture(), { searchText: '', activeTags: [], currentLang: 'en' });
  if (out.length !== 5) throw new Error('A: expected 5, got ' + out.length);
  const triggers = out.map((s) => s.trigger);
  const sorted = triggers.slice().sort();
  if (JSON.stringify(triggers) !== JSON.stringify(sorted)) {
    throw new Error('A: not alphabetical: ' + JSON.stringify(triggers));
  }
});

test('B. searchText "bet" → matches trigger "betrayal" (case-insensitive)', () => {
  const out = filterSnippetList(fixture(), { searchText: 'bet', activeTags: [], currentLang: 'en' });
  if (out.length !== 1) throw new Error('B: expected 1, got ' + out.length);
  if (out[0].trigger !== 'betrayal') throw new Error('B: wrong row: ' + out[0].trigger);
});

test('C. searchText "forgiven" → matches expansion content, NOT trigger', () => {
  const out = filterSnippetList(fixture(), { searchText: 'forgiven', activeTags: [], currentLang: 'en' });
  if (out.length !== 1) throw new Error('C: expected 1, got ' + out.length);
  if (out[0].trigger !== 'unreceived-love') {
    throw new Error('C: wrong row: ' + out[0].trigger);
  }
});

test('D. searchText matches BOTH trigger and expansion → returned once', () => {
  // snippet trigger="betrayal", expansion contains "Betrayal" — search "betrayal"
  // should NOT duplicate this row.
  const out = filterSnippetList(fixture(), { searchText: 'betrayal', activeTags: [], currentLang: 'en' });
  if (out.length !== 1) throw new Error('D: expected 1 (no dupe), got ' + out.length);
});

test('E. activeTags ["ec.a1"] → only ec.a1-tagged snippets', () => {
  const out = filterSnippetList(fixture(), { searchText: '', activeTags: ['ec.a1'], currentLang: 'en' });
  if (out.length !== 2) throw new Error('E: expected 2 (betrayal + unreceived-love), got ' + out.length);
  for (const s of out) {
    if (!s.tags.includes('ec.a1')) throw new Error('E: ' + s.trigger + ' missing ec.a1');
  }
});

test('F. activeTags ["ec.a1","ec.a2"] → OR-combine', () => {
  const out = filterSnippetList(fixture(), { searchText: '', activeTags: ['ec.a1', 'ec.a2'], currentLang: 'en' });
  // ec.a1 = 2 snippets, ec.a2 = 2 snippets, abandoned has both. Union = 4 distinct.
  if (out.length !== 4) throw new Error('F: expected 4, got ' + out.length);
});

test('G. searchText AND activeTags → AND-combine', () => {
  const out = filterSnippetList(fixture(), { searchText: 'bet', activeTags: ['ec.a1'], currentLang: 'en' });
  if (out.length !== 1) throw new Error('G: expected 1, got ' + out.length);
  if (out[0].trigger !== 'betrayal') throw new Error('G: wrong row: ' + out[0].trigger);
});

test('H. Sort stability: identical prefix sorts by full trigger asc', () => {
  const cache = [
    snip('z', 'abandoned-deeply', '', []),
    snip('a', 'abandoned',         '', []),
    snip('m', 'abandoned-once',    '', []),
  ];
  const out = filterSnippetList(cache, { searchText: '', activeTags: [], currentLang: 'en' });
  const triggers = out.map((s) => s.trigger);
  const expected = ['abandoned', 'abandoned-deeply', 'abandoned-once'];
  if (JSON.stringify(triggers) !== JSON.stringify(expected)) {
    throw new Error('H: expected ' + JSON.stringify(expected) + ' got ' + JSON.stringify(triggers));
  }
});

test('I. currentLang "cs" with empty cs expansion → snippet content does NOT match (search is current-locale only)', () => {
  // Snippet has en="Betrayal — a deep wound." but cs="".
  // Searching "Betrayal" with currentLang="cs" should NOT find it via expansion
  // (but should still find it via the trigger "betrayal").
  // To isolate the locale rule, use a search term that only appears in en:
  const out = filterSnippetList(fixture(), { searchText: 'wound', activeTags: [], currentLang: 'cs' });
  if (out.length !== 0) {
    throw new Error('I: expected 0 (cs is empty, search must not cross locales), got ' + out.length + ': ' + JSON.stringify(out.map((s) => s.trigger)));
  }
});

console.log('');
console.log(`Plan 05 filterSnippetList tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
