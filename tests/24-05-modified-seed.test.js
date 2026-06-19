/**
 * Phase 24 Plan 05 — Behavior test for isModifiedSeed predicate.
 * Revised by quick task 260619-okw PLAN-02 (timestamp semantics).
 *
 * Pure-function test: loads assets/settings.js in a vm sandbox, reads
 * isModifiedSeed from window.__SnippetEditorHelpers.
 *
 * Controls Reset-to-default button visibility AND export-filter inclusion.
 *
 * SEMANTICS (timestamp, NOT byte-exact):
 *   isModifiedSeed(snippet, seedPack) returns true IFF
 *     snippet.origin === 'seed' AND a seedPack entry with the same id exists
 *     AND snippet.updatedAt > snippet.createdAt.
 *   It does NOT byte-compare the snippet against the live seed pack.
 *
 * WHY timestamps and not byte compare: seed-pack text can change between app
 * versions while re-seeding is additive-only. An untouched seed whose pack text
 * drifted (e.g. EN word order "Unreceived Effort" → "Effort Unreceived") keeps
 * its old text in IndexedDB with updatedAt === createdAt — byte compare would
 * flag it "modified" and wrongly export it / show Reset-to-default. Every real
 * user edit bumps updatedAt past createdAt (see handleSave), so the timestamp
 * is the airtight signal. See PLAN-02 critical_design_note.
 *
 * Run: node tests/24-05-modified-seed.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * Scenarios:
 *   A. origin='user' → false (not a seed).
 *   B. origin='seed', no matching seed entry → false (orphan, can't reset).
 *   C. seed, updatedAt > createdAt → true (user edited).
 *   D. seed, timestamps equal, content matches seedPack exactly → false (untouched).
 *   E. seed, timestamps equal, ONE locale expansion differs (version drift) → false.
 *   F. seed, timestamps equal, tags differ → false (drift, not an edit).
 *   G. seed, timestamps equal, trigger differs → false (drift, not an edit).
 *   H. seed, timestamps equal, trailing-whitespace diff → false (drift, not an edit).
 *   I. Ben's case: seed, id matches pack, EN expansion drifted (word order),
 *      updatedAt === createdAt → false (NOT modified, must not export).
 *   J. seed whose content happens to match pack exactly BUT updatedAt > createdAt
 *      → true (the user edited it back to the seed text — still a user edit).
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
if (!helpers || typeof helpers.isModifiedSeed !== 'function') {
  console.error('FAIL: window.__SnippetEditorHelpers.isModifiedSeed is not exposed.');
  console.error('      Plan 05 Task 1 must extract isModifiedSeed as a pure helper');
  console.error('      and expose it via window.__SnippetEditorHelpers for tests.');
  process.exit(1);
}
const isModifiedSeed = helpers.isModifiedSeed;

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
function assertTrue(v, label) {
  if (v !== true) throw new Error(`${label}: expected true, got ${JSON.stringify(v)}`);
}
function assertFalse(v, label) {
  if (v !== false) throw new Error(`${label}: expected false, got ${JSON.stringify(v)}`);
}

const SEED_TS = '2026-05-14T00:00:00.000Z';
function seedEntry(overrides) {
  // L3: ids are "seed.<slug>"; tags are empty arrays by default.
  return Object.assign({
    id: 'seed.betrayal',
    trigger: 'betrayal',
    expansions: {
      he: 'בגידה — תחושה כואבת.',
      en: 'Betrayal — a harsh, unpleasant blow.',
      cs: 'Zrada — bolestivá rána.',
      de: 'Verrat — ein schmerzhafter Schlag.',
    },
    tags: [],
    origin: 'seed',
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  }, overrides || {});
}
const seedPack = [seedEntry()];

// ────────────────────────────────────────────────────────────────────

test('A. origin="user" → false (not a seed)', () => {
  const s = seedEntry({ origin: 'user', id: 'user-1' });
  assertFalse(isModifiedSeed(s, seedPack), 'A');
});

test('B. origin="seed", id has no match in seedPack → false (orphan)', () => {
  const s = seedEntry({ id: 'seed.nonexistent-emotion' });
  assertFalse(isModifiedSeed(s, seedPack), 'B');
});

test('C. seed, updatedAt > createdAt → true (user edited)', () => {
  const s = seedEntry({ updatedAt: '2026-05-15T10:00:00.000Z' });
  assertTrue(isModifiedSeed(s, seedPack), 'C');
});

test('D. seed, timestamps equal, content matches exactly → false (untouched)', () => {
  const s = seedEntry();
  assertFalse(isModifiedSeed(s, seedPack), 'D');
});

test('E. seed, timestamps equal, one locale expansion differs (drift) → false', () => {
  const seed = seedEntry();
  const s = seedEntry({
    expansions: Object.assign({}, seed.expansions, { en: seed.expansions.en + '!' }),
  });
  assertFalse(isModifiedSeed(s, seedPack), 'E');
});

test('F. seed, timestamps equal, tags differ → false (drift, not a user edit)', () => {
  const s = seedEntry({ tags: ['user-added-tag'] });
  assertFalse(isModifiedSeed(s, seedPack), 'F');
});

test('G. seed, timestamps equal, trigger differs → false (drift, not a user edit)', () => {
  const s = seedEntry({ trigger: 'betrayal-renamed' });
  assertFalse(isModifiedSeed(s, seedPack), 'G');
});

test('H. seed, timestamps equal, trailing-whitespace diff → false (drift, not a user edit)', () => {
  const seedWithTrailing = seedEntry({
    expansions: {
      he: 'בגידה — תחושה כואבת.',
      en: 'Betrayal — a harsh, unpleasant blow. ', // <-- trailing space
      cs: 'Zrada — bolestivá rána.',
      de: 'Verrat — ein schmerzhafter Schlag.',
    },
  });
  const pack = [seedWithTrailing];
  const userTrimmed = seedEntry(); // matches everything EXCEPT en lacks the trailing space
  assertFalse(isModifiedSeed(userTrimmed, pack), 'H');
});

test('I. Ben\'s drift case: EN word-order changed in pack, never edited → false', () => {
  // Reproduces seed.unreceived-effort / seed.unreceived-love: the seed pack's EN
  // title word order was changed in a later app version ("Unreceived Effort" →
  // "Effort Unreceived"). The user's IndexedDB kept the OLD text; updatedAt ===
  // createdAt (never edited). Must NOT be flagged modified → must NOT export.
  const pack = [seedEntry({
    id: 'seed.unreceived-effort',
    trigger: 'unreceived-effort',
    expansions: {
      he: 'מאמץ שלא זכה להכרה.',
      en: 'Effort Unreceived — work that went unseen.', // NEW pack word order
      cs: 'Nepřijaté úsilí.',
      de: 'Unerwiderte Mühe.',
    },
  })];
  const userOld = seedEntry({
    id: 'seed.unreceived-effort',
    trigger: 'unreceived-effort',
    expansions: {
      he: 'מאמץ שלא זכה להכרה.',
      en: 'Unreceived Effort — work that went unseen.', // OLD word order in IndexedDB
      cs: 'Nepřijaté úsilí.',
      de: 'Unerwiderte Mühe.',
    },
    createdAt: SEED_TS,
    updatedAt: SEED_TS, // never edited
  });
  assertFalse(isModifiedSeed(userOld, pack), 'I');
});

test('J. edited seed whose content happens to match pack but updatedAt>createdAt → true', () => {
  // The user opened and saved the seed (perhaps editing then reverting). Content
  // equals the pack, but updatedAt was bumped — it is a genuine user edit.
  const s = seedEntry({ updatedAt: '2026-05-16T08:30:00.000Z' });
  assertTrue(isModifiedSeed(s, seedPack), 'J');
});

console.log('');
console.log(`Plan 05 isModifiedSeed tests (timestamp semantics) — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
