/**
 * Phase 42 — new-key i18n parity gate for the Changelog / What's-New chrome.
 *
 * Guards the 11 new UI-chrome keys this phase introduces (the /changelog page
 * scaffolding + the entry-card version label + the What's-New popup + the "?"
 * menu row) so no locale drifts a key. Loads all four locale maps (en/he/de/cs) into a vm sandbox the same way
 * tests/40-i18n-parity.test.js does, then for every locale × every new key
 * asserts:
 *
 *   1. Presence   — the key exists in the locale map.
 *   2. Non-empty  — its value is a string that is non-empty after trim.
 *   3. Parity     — the set of new keys present is identical across all four
 *                   files (no locale drifts a key in or out).
 *   4. No-emoji   — no new key VALUE contains a pictographic emoji (D-10 — the
 *                   changelog/what's-new chrome stays text-only, category labels
 *                   included, so an emoji glyph never leaks into a locale value).
 *
 * The 11 keys (page scaffolding 5 + entry-card 1 + what's-new popup/menu 5):
 *   changelog.page.title, changelog.page.intro, changelog.entry.version,
 *   changelog.cat.new, changelog.cat.improved, changelog.cat.fixed,
 *   whatsNew.title, whatsNew.sub, whatsNew.seeAll, whatsNew.close,
 *   whatsNew.menuRow
 *
 * Authored RED: the original 10 keys did not exist yet (Plan 07 added them);
 * changelog.entry.version joined via the review fix (WR-03). This gate MUST
 * fail when any key drifts — do NOT weaken it to green.
 *
 * Run: node tests/42-i18n-parity.test.js
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

// ── The canonical list of the 11 new chrome keys (page 5 + entry 1 + what's-new 5) ─
const NEW_KEYS = [
  'changelog.page.title',
  'changelog.page.intro',
  'changelog.entry.version',
  'changelog.cat.new',
  'changelog.cat.improved',
  'changelog.cat.fixed',
  'whatsNew.title',
  'whatsNew.sub',
  'whatsNew.seeAll',
  'whatsNew.close',
  'whatsNew.menuRow',
];

// Emoji / pictographic scan (mirrors 40-i18n-parity's EMOJI_RE): surrogate
// emoji planes + common symbol ranges + variation selector + regional
// indicators.
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

// ── 1. Presence + non-empty for every locale × every new key ─────────────────
test('All 11 new chrome keys exist and are non-empty strings in every locale', function () {
  const problems = [];
  for (const loc of LOCALES) {
    for (const key of NEW_KEYS) {
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
      problems.slice(0, 12).join('; ') + (problems.length > 12 ? ', …' : ''));
  }
});

// ── 2. Cross-locale parity: identical set of the new keys present ────────────
test('The set of new keys present is identical across all four locales', function () {
  const presence = {};
  for (const loc of LOCALES) {
    presence[loc] = new Set(NEW_KEYS.filter(k => k in MAPS[loc]));
  }
  const ref = presence.en;
  const drift = [];
  for (const loc of LOCALES) {
    for (const key of NEW_KEYS) {
      const inRef = ref.has(key);
      const inLoc = presence[loc].has(key);
      if (inRef !== inLoc) {
        drift.push(loc + (inLoc ? ' has ' : ' missing ') + key + ' (en ' + (inRef ? 'has' : 'missing') + ')');
      }
    }
  }
  if (drift.length) throw new Error('key-set drift vs en: ' + drift.join('; '));
});

// ── 3. No-emoji in any new key value (D-10) ──────────────────────────────────
test('No new chrome key value contains an emoji (D-10 text-only)', function () {
  const hits = [];
  for (const loc of LOCALES) {
    for (const key of NEW_KEYS) {
      const val = MAPS[loc][key];
      if (typeof val !== 'string') continue;
      if (EMOJI_RE.test(val)) hits.push(loc + '/' + key + ' (emoji)');
    }
  }
  if (hits.length) throw new Error('emoji in: ' + hits.join('; '));
});

// ── 4. Interpolation tokens survive verbatim in every locale (WARNING 2) ─────
// changelog.js (versionLabel ~47-53) and whats-new.js (title ~121-127) fall back
// to a HARDCODED ENGLISH label when their interpolation token is dropped, so a
// token-losing locale edit would silently ship an English version label with
// every other gate still green. This gate mirrors the requireToken idiom in
// tests/41-tour-i18n-parity.test.js: it asserts changelog.entry.version carries
// '{V}' and whatsNew.title carries '{X.Y}' in every locale. RED-safe (it PASSES
// today because all four locales carry both tokens); it guards against future
// drift — including a Plan 09 refinement dropping a token.
test('Interpolation tokens {V}/{X.Y} survive in changelog.entry.version / whatsNew.title in every locale', function () {
  const problems = [];
  const requireToken = (key, token) => {
    for (const loc of LOCALES) {
      const val = MAPS[loc][key];
      if (typeof val === 'string' && val.indexOf(token) === -1) {
        problems.push(loc + '/' + key + ' is missing ' + token);
      }
    }
  };
  requireToken('changelog.entry.version', '{V}');
  requireToken('whatsNew.title', '{X.Y}');
  if (problems.length) throw new Error(problems.join('; '));
});

console.log('');
console.log('Phase 42 i18n parity gate — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
