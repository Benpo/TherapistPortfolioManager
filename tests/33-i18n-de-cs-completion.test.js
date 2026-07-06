/**
 * Phase 33 — DE/CS i18n completion gate (D-06).
 *
 * A standing, machine-checked invariant that DE and CS no longer fall back to
 * English and carry no placeholder markers. Complements the per-key existence
 * checks in tests/25-11-i18n-parity.test.js by asserting:
 *
 *   1. No `// TODO i18n` placeholder markers remain in assets/i18n-de.js or
 *      assets/i18n-cs.js (raw source scan).
 *   2. EXACT bidirectional DE↔EN key parity: every EN key exists in DE (no
 *      missing) AND every DE key exists in EN (no extra).
 *   3. EXACT bidirectional CS↔EN key parity: same, for CS.
 *
 * Full-population verification of a finite key set — not a sample — so parity
 * plus the no-marker scan fully satisfies the D-06 validation coverage.
 *
 * Translation *quality* (that the German/Czech reads natively) is the D-06
 * manual visual check, NOT asserted here: cognates like "Export" make
 * value-equality checks unreliable, so only key structure + markers are gated.
 *
 * Loads i18n-en.js, i18n-de.js, i18n-cs.js into a vm sandbox and inspects
 * window.I18N.{en,de,cs}, matching the style of tests/25-11-i18n-parity.test.js.
 *
 * Run: node tests/33-i18n-de-cs-completion.test.js
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
const FILES = ['i18n-en.js', 'i18n-de.js', 'i18n-cs.js'];
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

const LOCALES = ['en', 'de', 'cs'];
for (const l of LOCALES) {
  if (!sandbox.window.I18N[l] || typeof sandbox.window.I18N[l] !== 'object') {
    console.error('FAIL: window.I18N.' + l + ' is not an object after loading i18n-' + l + '.js');
    process.exit(1);
  }
}

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

// ─── 1. No placeholder markers (D-06 no-marker gate) ──────────────────
for (const f of ['i18n-de.js', 'i18n-cs.js']) {
  test('No "// TODO i18n" marker remains in assets/' + f, function () {
    const raw = fs.readFileSync(path.join(ASSETS_DIR, f), 'utf8');
    if (raw.indexOf('// TODO i18n') !== -1) {
      const lines = raw.split('\n');
      const hits = [];
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('// TODO i18n') !== -1) hits.push(i + 1);
      }
      throw new Error('assets/' + f + ' still contains "// TODO i18n" at line(s): ' + hits.join(', '));
    }
  });
}

// ─── 2 + 3. EXACT bidirectional key parity vs EN ──────────────────────
function assertExactParity(localeName) {
  const en = sandbox.window.I18N.en;
  const loc = sandbox.window.I18N[localeName];
  const enKeys = Object.keys(en);
  const locKeys = Object.keys(loc);

  const missing = enKeys.filter(function (k) { return !(k in loc); });
  const extra = locKeys.filter(function (k) { return !(k in en); });

  if (missing.length > 0 || extra.length > 0) {
    const parts = [];
    if (missing.length > 0) {
      parts.push(missing.length + ' EN key(s) MISSING from ' + localeName.toUpperCase() + ': ' +
        missing.slice(0, 8).join(', ') + (missing.length > 8 ? ', …' : ''));
    }
    if (extra.length > 0) {
      parts.push(extra.length + ' EXTRA key(s) in ' + localeName.toUpperCase() + ' not in EN: ' +
        extra.slice(0, 8).join(', ') + (extra.length > 8 ? ', …' : ''));
    }
    throw new Error(parts.join(' | '));
  }
}

test('EXACT bidirectional DE↔EN key parity (no missing, no extra)', function () {
  assertExactParity('de');
});

test('EXACT bidirectional CS↔EN key parity (no missing, no extra)', function () {
  assertExactParity('cs');
});

console.log('');
console.log('Phase 33 DE/CS i18n completion gate — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
