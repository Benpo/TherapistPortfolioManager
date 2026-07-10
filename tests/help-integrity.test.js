/**
 * Phase 39 — help-content static integrity gate (D-25).
 *
 * The anti-rot guard that ships with the help substrate and joins `npm test`
 * (tests/run-all.js auto-discovers this file). It loads assets/i18n-en.js and
 * assets/help-content-en.js into a vm sandbox (the tests/33-i18n pattern) and
 * asserts the schema + content invariants that Plans 04/05 and the Phase 43
 * docs gate key off:
 *
 *   1. Every {ui:key} token in every topic body resolves to a real key in
 *      window.I18N.en (D-23 — a typo can never render a raw {ui:...} string).
 *   2. All section ids and all topic ids are unique and non-empty.
 *   3. Every window.HELP_DEEPLINKS value is a real section id (the empty-state
 *      trio anchor contract, Plan 05).
 *   4. Coverage: exactly one featured section; both groups present; every
 *      required section id from Plan 01 Tasks 1-2 is present.
 *   5. Every topic has priority in {1,2,3} and a non-empty covers array (D-24).
 *   6. Computer-only install (D-15/D-16): the installing section topic ids
 *      include chrome + safari + mobile-note and match none of /ios|android/.
 *   7. Terminology + copy hygiene: no body text matches /\bpatient\b/i (nor
 *      /\btreatment\b/i); no body text contains an emoji code point.
 *
 * Run: node tests/help-integrity.test.js
 * Exits 0 on full pass, 1 on any failure (the tests/run-all.js contract).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = {
  window: {},
  console: { log() {}, warn() {}, error() {} },
};
sandbox.window.I18N = {};
sandbox.window.QUOTES = {};
vm.createContext(sandbox);

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const FILES = ['i18n-en.js', 'help-content-en.js'];
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ASSETS_DIR, f), 'utf8');
  try {
    vm.runInContext(src, sandbox, { filename: 'assets/' + f });
  } catch (err) {
    console.error('FATAL: assets/' + f + ' failed to load in vm sandbox.');
    console.error('       ' + (err && err.stack || err.message || err));
    process.exit(1);
  }
}

const EN = sandbox.window.I18N.en;
const SECTIONS = sandbox.window.HELP_CONTENT_EN;
const DEEPLINKS = sandbox.window.HELP_DEEPLINKS;

if (!EN || typeof EN !== 'object') {
  console.error('FATAL: window.I18N.en is not an object after loading i18n-en.js');
  process.exit(1);
}
if (!Array.isArray(SECTIONS)) {
  console.error('FATAL: window.HELP_CONTENT_EN is not an array after loading help-content-en.js');
  process.exit(1);
}
if (!DEEPLINKS || typeof DEEPLINKS !== 'object') {
  console.error('FATAL: window.HELP_DEEPLINKS is not an object after loading help-content-en.js');
  process.exit(1);
}

// ── Helpers ────────────────────────────────────────────────────────────────
// Collect every text string in a topic body (p/note text + steps items).
// Glyph nodes carry no user-facing prose (name only) and are skipped.
function bodyTexts(topic) {
  const out = [];
  for (const node of topic.body) {
    if (typeof node.text === 'string') out.push(node.text);
    if (Array.isArray(node.items)) {
      for (const it of node.items) if (typeof it === 'string') out.push(it);
    }
  }
  return out;
}
function allTopics() {
  const out = [];
  for (const sec of SECTIONS) for (const tp of (sec.topics || [])) out.push({ sec, tp });
  return out;
}
// Emoji / pictographic scan: surrogate-pair emoji planes + common symbol
// ranges + variation selector. Deliberately excludes the en/em dash and
// ordinary punctuation used in the copy.
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log('  PASS  ' + name);
    passed++;
  } catch (err) {
    console.log('  FAIL  ' + name);
    console.log('        ' + (err && err.message || err));
    failed++;
  }
}

// ── 1. Every {ui:key} token resolves against window.I18N.en ─────────────────
test('Every {ui:key} token resolves to a real window.I18N.en key', function () {
  const unresolved = [];
  const re = /\{ui:([^}]+)\}/g;
  for (const { sec, tp } of allTopics()) {
    for (const text of bodyTexts(tp)) {
      let m;
      while ((m = re.exec(text)) !== null) {
        const key = m[1];
        if (!(key in EN)) unresolved.push(sec.id + '/' + tp.id + ': {ui:' + key + '}');
      }
    }
  }
  if (unresolved.length) {
    throw new Error(unresolved.length + ' unresolved {ui:key} token(s): ' +
      unresolved.slice(0, 8).join('; ') + (unresolved.length > 8 ? ', …' : ''));
  }
});

// ── 2. All section ids and topic ids are unique and non-empty ───────────────
test('All section ids are unique and non-empty', function () {
  const seen = new Set();
  for (const sec of SECTIONS) {
    if (!sec.id || typeof sec.id !== 'string') throw new Error('empty/invalid section id');
    if (seen.has(sec.id)) throw new Error('duplicate section id: ' + sec.id);
    seen.add(sec.id);
  }
});
test('All topic ids are unique and non-empty', function () {
  const seen = new Set();
  for (const { sec, tp } of allTopics()) {
    if (!tp.id || typeof tp.id !== 'string') throw new Error('empty/invalid topic id in ' + sec.id);
    if (seen.has(tp.id)) throw new Error('duplicate topic id: ' + tp.id);
    seen.add(tp.id);
  }
});

// ── 3. Every HELP_DEEPLINKS value resolves to a real section id ─────────────
test('Every HELP_DEEPLINKS value is a real section id', function () {
  const ids = new Set(SECTIONS.map(s => s.id));
  const required = ['addClient', 'startSession', 'readDashboard'];
  for (const k of required) {
    if (!(k in DEEPLINKS)) throw new Error('missing deep-link key: ' + k);
  }
  for (const [k, v] of Object.entries(DEEPLINKS)) {
    if (!ids.has(v)) throw new Error('deep-link ' + k + ' → "' + v + '" is not a section id');
  }
});

// ── 4. Coverage: featured, groups, required section ids ─────────────────────
test('Exactly one section is featured (make-it-yours)', function () {
  const feat = SECTIONS.filter(s => s.featured === true);
  if (feat.length !== 1) throw new Error('expected exactly 1 featured section, found ' + feat.length);
  if (feat[0].id !== 'make-it-yours') throw new Error('featured section is "' + feat[0].id + '", expected make-it-yours');
});
test('Both groups (session-loop, technical) are present', function () {
  const groups = new Set(SECTIONS.map(s => s.group));
  for (const g of ['session-loop', 'technical']) {
    if (!groups.has(g)) throw new Error('missing group: ' + g);
  }
});
test('All required section ids from Plan 01 are present', function () {
  const ids = new Set(SECTIONS.map(s => s.id));
  const required = [
    'make-it-yours', 'adding-a-client', 'starting-a-session', 'capturing-emotions',
    'heart-wall', 'severity', 'review-export', 'overview',
    'backups', 'installing', 'license', 'troubleshooting'
  ];
  const missing = required.filter(id => !ids.has(id));
  if (missing.length) throw new Error('missing required section id(s): ' + missing.join(', '));
});
test('Every section has at least one topic', function () {
  for (const sec of SECTIONS) {
    if (!Array.isArray(sec.topics) || sec.topics.length === 0) {
      throw new Error('section ' + sec.id + ' has no topics');
    }
  }
});

// ── 5. Every topic has valid priority + non-empty covers ────────────────────
test('Every topic has priority in {1,2,3} and a non-empty covers array', function () {
  for (const { sec, tp } of allTopics()) {
    if (![1, 2, 3].includes(tp.priority)) {
      throw new Error(sec.id + '/' + tp.id + ' has invalid priority: ' + tp.priority);
    }
    if (!Array.isArray(tp.covers) || tp.covers.length === 0) {
      throw new Error(sec.id + '/' + tp.id + ' has empty covers');
    }
  }
});

// ── 6. Computer-only install (D-15/D-16) ────────────────────────────────────
test('Install section is computer-only (chrome + safari + mobile-note, no ios/android)', function () {
  const installing = SECTIONS.find(s => s.id === 'installing');
  if (!installing) throw new Error('installing section missing');
  const ids = installing.topics.map(t => t.id);
  for (const req of ['topic-install-chrome', 'topic-install-safari', 'topic-install-mobile-note']) {
    if (!ids.includes(req)) throw new Error('missing install topic: ' + req);
  }
  const forbidden = ids.filter(id => /ios|android/i.test(id));
  if (forbidden.length) throw new Error('forbidden mobile-install topic(s): ' + forbidden.join(', '));
});

// ── 7. Terminology + emoji hygiene ──────────────────────────────────────────
test('No body text contains "patient" or "treatment" (terminology)', function () {
  const hits = [];
  for (const { sec, tp } of allTopics()) {
    for (const text of bodyTexts(tp)) {
      if (/\bpatient\b/i.test(text)) hits.push(sec.id + '/' + tp.id + ' (patient)');
      if (/\btreatment\b/i.test(text)) hits.push(sec.id + '/' + tp.id + ' (treatment)');
    }
  }
  if (hits.length) throw new Error('forbidden terminology in: ' + hits.join('; '));
});
test('No body text contains an emoji code point', function () {
  const hits = [];
  for (const { sec, tp } of allTopics()) {
    for (const text of bodyTexts(tp)) {
      if (EMOJI_RE.test(text)) hits.push(sec.id + '/' + tp.id);
    }
  }
  if (hits.length) throw new Error('emoji found in: ' + hits.join('; '));
});

console.log('');
console.log('Phase 39 help-content integrity gate — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
