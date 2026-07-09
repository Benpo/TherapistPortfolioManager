/**
 * Phase 40 Plan 01 — new-key i18n parity gate.
 *
 * Guards the 14 new UI-chrome keys this phase introduces (welcome overlay,
 * install nudge, mobile expectation hint) so no locale drifts a key. Loads
 * all four locale maps (en/he/de/cs) into a vm
 * sandbox the same way tests/39-help-integrity.test.js loads I18N, then for
 * every locale × every new key asserts:
 *
 *   1. Presence      — the key exists in the locale map.
 *   2. Non-empty     — its value is a string that is non-empty after trim.
 *   3. Parity        — the set of new keys present is identical across all
 *                      four files (no locale drifts a key in or out).
 *   4. No-emoji      — no new key VALUE contains a pictographic emoji, and
 *                      explicitly not the U+1F4E4 (📤) outbox code point the
 *                      deleted iOS banner used.
 *
 * Authored RED: the 14 keys do not exist yet (Task 2 adds them). Until then
 * this gate MUST fail — do NOT weaken it to green.
 *
 * Run: node tests/40-i18n-parity.test.js
 * Exits 0 on full pass, 1 on any failure (the tests/run-all.js contract).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── Load every locale map into one vm sandbox (the 39-help-integrity idiom) ──
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

// ── The canonical list of the 14 new keys (welcome 4 + install 7 +
//    mobileHint 3 = 14) ─────────────────────────────────────────────────────
const NEW_KEYS = [
  'help.welcome.title',
  'help.welcome.subtitle',
  'help.welcome.ctaTour',
  'help.welcome.ctaExplore',
  'onboard.install.title',
  'onboard.install.body',
  'onboard.install.ctaInstall',
  'onboard.install.safariHint',
  'onboard.install.safariLink',
  'onboard.install.dismiss',
  'onboard.install.laterHint',
  'onboard.mobileHint.body',
  'onboard.mobileHint.link',
  'onboard.mobileHint.dismiss',
];

// Emoji / pictographic scan (mirrors 39-help-integrity's EMOJI_RE): surrogate
// emoji planes + common symbol ranges + variation selector + regional
// indicators. U+1F4E4 (outbox tray, the deleted banner's glyph) lives in the
// U+1F000–U+1FAFF range below and is asserted explicitly too.
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;
const OUTBOX_CP = '\u{1F4E4}'; // 📤 — the retired iOS banner's emoji

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

// ── 1. Presence + non-empty for every locale × every new key ────────────────
test('All 14 new keys exist and are non-empty strings in every locale', function () {
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

// ── 2. Cross-locale parity: identical set of the new keys present ───────────
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

// ── 3. No-emoji in any new key value ────────────────────────────────────────
test('No new key value contains an emoji (incl. U+1F4E4 outbox)', function () {
  const hits = [];
  for (const loc of LOCALES) {
    for (const key of NEW_KEYS) {
      const val = MAPS[loc][key];
      if (typeof val !== 'string') continue;
      if (EMOJI_RE.test(val)) hits.push(loc + '/' + key + ' (emoji)');
      if (val.indexOf(OUTBOX_CP) !== -1) hits.push(loc + '/' + key + ' (U+1F4E4)');
    }
  }
  if (hits.length) throw new Error('emoji in: ' + hits.join('; '));
});

console.log('');
console.log('Phase 40 i18n parity gate — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
