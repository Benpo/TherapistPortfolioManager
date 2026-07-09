/**
 * Phase 41 Plan 01 — tour-copy i18n parity gate.
 *
 * Guards the full help.tour.* copy contract this phase introduces (10 step
 * titles + 10 step bodies + chrome + fallback + mid-tour exit choice + re-entry
 * reminder card + finish card) plus the help.entry.takeTour "?" popover label,
 * so no locale drifts a key. Loads all four locale maps (en/he/de/cs) into a vm
 * sandbox the same way tests/40-i18n-parity.test.js loads I18N, then for every
 * locale × every guarded key asserts:
 *
 *   1. Presence      — the key exists in the locale map.
 *   2. Non-empty     — its value is a string that is non-empty after trim.
 *   3. Parity        — the set of guarded keys present is identical across all
 *                      four files (no locale drifts a key in or out).
 *   4. No-emoji      — no guarded key VALUE contains a pictographic emoji
 *                      (project-wide convention).
 *
 * Authored RED: the 39 keys do not exist yet. Task 2 of Plan 41-01 adds them to
 * all four assets/i18n-{en,he,de,cs}.js files, which flips this gate green.
 * Until then this MUST fail — do NOT weaken it to green.
 *
 * Run: node tests/41-tour-i18n-parity.test.js
 * Exits 0 on full pass, 1 on any failure (the tests/run-all.js contract).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── Load every locale map into one vm sandbox (the 40-i18n-parity idiom) ─────
const sandbox = {
  window: {},
  console: { log() {}, warn() {}, error() {} },
};
sandbox.window.I18N = {};
sandbox.window.QUOTES = {};
vm.createContext(sandbox);

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const LOCALES = ['en', 'he', 'de', 'cs'];
for (const loc of LOCALES) {
  const f = 'i18n-' + loc + '.js';
  const src = fs.readFileSync(path.join(ASSETS_DIR, f), 'utf8');
  try {
    vm.runInContext(src, sandbox, { filename: 'assets/' + f });
  } catch (err) {
    console.error('FATAL: assets/' + f + ' failed to load in vm sandbox.');
    console.error('       ' + (err && err.stack || err.message || err));
    process.exit(1);
  }
}

const MAPS = {};
for (const loc of LOCALES) {
  const m = sandbox.window.I18N[loc];
  if (!m || typeof m !== 'object') {
    console.error('FATAL: window.I18N.' + loc + ' is not an object after loading i18n-' + loc + '.js');
    process.exit(1);
  }
  MAPS[loc] = m;
}

// ── The canonical tour-copy key list (v3 storyline: 12 step titles + 12 step
//    bodies = 24, chrome 5, fallback 2, exit 3, reminder 3, finish 5,
//    takeTour 1 = 43). STEP_IDS mirrors the 41-10 STEPS[] i18nKey suffixes in
//    storyline order (settings-first: overview → settings chapter → the path). ─
const STEP_IDS = [
  'overview', 'settings', 'personalize', 'fields', 'snippets', 'ready',
  'setup', 'heart', 'save', 'sessions', 'backup', 'help',
];
const STEP_KEYS = [];
for (const id of STEP_IDS) {
  STEP_KEYS.push('help.tour.step.' + id + '.title');
  STEP_KEYS.push('help.tour.step.' + id + '.body');
}
const TOUR_KEYS = STEP_KEYS.concat([
  // chrome
  'help.tour.next',
  'help.tour.back',
  'help.tour.close',
  'help.tour.done',
  'help.tour.counter',
  // fallback (anchor missing — never silent, D-11 / TOUR-02)
  'help.tour.fallbackBody',
  'help.tour.takeMeThere',
  // mid-tour exit choice (D-08)
  'help.tour.exit.title',
  'help.tour.exit.remindLater',
  'help.tour.exit.exploreMyself',
  // re-entry reminder card (coordinator-governed, D-08)
  'help.tour.reminder.title',
  'help.tour.reminder.start',
  'help.tour.reminder.dismiss',
  // finish card (D-10)
  'help.tour.finish.title',
  'help.tour.finish.body',
  'help.tour.finish.addClient',
  'help.tour.finish.startSession',
  'help.tour.finish.helpCenter',
  // "?" popover new entry (D-13)
  'help.entry.takeTour',
]);

// Emoji / pictographic scan (mirrors 40-i18n-parity's EMOJI_RE): surrogate
// emoji planes + common symbol ranges + variation selector + regional
// indicators. Em-dash (U+2014) and ellipsis (U+2026) are punctuation, not in
// any of these ranges, so calm-voice copy is unaffected.
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

// ── 1. Presence + non-empty for every locale × every tour key ───────────────
test('All ' + TOUR_KEYS.length + ' tour-copy keys exist and are non-empty strings in every locale', function () {
  const problems = [];
  for (const loc of LOCALES) {
    for (const key of TOUR_KEYS) {
      if (!(key in MAPS[loc])) {
        problems.push(loc + ': missing ' + key);
        continue;
      }
      const val = MAPS[loc][key];
      if (typeof val !== 'string' || val.trim() === '') {
        problems.push(loc + ': empty/non-string ' + key);
      }
    }
  }
  if (problems.length) {
    throw new Error(problems.length + ' issue(s): ' +
      problems.slice(0, 16).join('; ') + (problems.length > 16 ? ', …' : ''));
  }
});

// ── 2. Cross-locale parity: identical set of the tour keys present ──────────
test('The set of tour-copy keys present is identical across all four locales', function () {
  const presence = {};
  for (const loc of LOCALES) {
    presence[loc] = new Set(TOUR_KEYS.filter(k => k in MAPS[loc]));
  }
  const ref = presence.en;
  const drift = [];
  for (const loc of LOCALES) {
    for (const key of TOUR_KEYS) {
      const inRef = ref.has(key);
      const inLoc = presence[loc].has(key);
      if (inRef !== inLoc) {
        drift.push(loc + (inLoc ? ' has ' : ' missing ') + key + ' (en ' + (inRef ? 'has' : 'missing') + ')');
      }
    }
  }
  if (drift.length) throw new Error('key-set drift vs en: ' + drift.join('; '));
});

// ── 3. Placeholder tokens preserved verbatim in every locale ────────────────
test('Placeholder tokens {screen}/{n}/{total} survive in every locale', function () {
  const problems = [];
  const requireToken = (key, token) => {
    for (const loc of LOCALES) {
      const val = MAPS[loc][key];
      if (typeof val === 'string' && val.indexOf(token) === -1) {
        problems.push(loc + '/' + key + ' is missing ' + token);
      }
    }
  };
  requireToken('help.tour.fallbackBody', '{screen}');
  requireToken('help.tour.counter', '{n}');
  requireToken('help.tour.counter', '{total}');
  if (problems.length) throw new Error(problems.join('; '));
});

// ── 4. No-emoji in any tour key value ───────────────────────────────────────
test('No tour-copy value contains an emoji', function () {
  const hits = [];
  for (const loc of LOCALES) {
    for (const key of TOUR_KEYS) {
      const val = MAPS[loc][key];
      if (typeof val !== 'string') continue;
      if (EMOJI_RE.test(val)) hits.push(loc + '/' + key + ' (emoji)');
    }
  }
  if (hits.length) throw new Error('emoji in: ' + hits.join('; '));
});

console.log('');
console.log('Phase 41 tour-copy i18n parity gate — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
