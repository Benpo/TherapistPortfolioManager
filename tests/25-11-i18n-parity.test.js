/**
 * Phase 25 Plan 11 — i18n parity test (D-28).
 *
 * Asserts:
 *   1. Five NEW keys exist in all 4 locale files (en/he/de/cs):
 *      - photos.usage.body (UAT-C3)
 *      - settings.save.failed (WR-01)
 *      - photos.optimize.unavailable (WR-01)
 *      - photos.optimize.failed (WR-01)
 *      - photos.deleteAll.failed (WR-01)
 *   2. Every key in i18n-en.js exists in the other three locales (D-28 invariant).
 *
 * The test loads the four i18n files in a vm sandbox and inspects window.I18N.{en,he,de,cs}.
 *
 * Run: node tests/25-11-i18n-parity.test.js
 * Exits 0 on full pass, 1 on any failure.
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

const FILES = ['i18n-en.js', 'i18n-he.js', 'i18n-de.js', 'i18n-cs.js'];
for (const f of FILES) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', f), 'utf8');
  try {
    vm.runInContext(src, sandbox, { filename: 'assets/' + f });
  } catch (err) {
    console.error('FATAL: assets/' + f + ' failed to load in vm sandbox.');
    console.error('       ' + (err && err.stack || err.message || err));
    process.exit(1);
  }
}

const LOCALES = ['en', 'he', 'de', 'cs'];
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

const NEW_KEYS = [
  'photos.usage.body',
  'settings.save.failed',
  'photos.optimize.unavailable',
  'photos.optimize.failed',
  'photos.deleteAll.failed',
];

// ─── Per-key, per-locale existence assertions ─────────────────────────
for (const key of NEW_KEYS) {
  for (const l of LOCALES) {
    test('NEW key "' + key + '" exists in locale ' + l, function () {
      const v = sandbox.window.I18N[l][key];
      if (typeof v !== 'string' || v.length === 0) {
        throw new Error('missing or empty: I18N.' + l + '["' + key + '"] = ' + JSON.stringify(v));
      }
    });
  }
}

// ─── 4-locale parity (D-28 lock-down) ─────────────────────────────────
test('Every key in i18n-en.js exists in i18n-he.js', function () {
  const en = sandbox.window.I18N.en;
  const he = sandbox.window.I18N.he;
  const missing = [];
  for (const k of Object.keys(en)) {
    if (!(k in he)) missing.push(k);
  }
  if (missing.length > 0) {
    throw new Error(missing.length + ' EN keys missing from HE: ' + missing.slice(0, 5).join(', ') + (missing.length > 5 ? ', …' : ''));
  }
});

test('Every key in i18n-en.js exists in i18n-de.js', function () {
  const en = sandbox.window.I18N.en;
  const de = sandbox.window.I18N.de;
  const missing = [];
  for (const k of Object.keys(en)) {
    if (!(k in de)) missing.push(k);
  }
  if (missing.length > 0) {
    throw new Error(missing.length + ' EN keys missing from DE: ' + missing.slice(0, 5).join(', ') + (missing.length > 5 ? ', …' : ''));
  }
});

test('Every key in i18n-en.js exists in i18n-cs.js', function () {
  const en = sandbox.window.I18N.en;
  const cs = sandbox.window.I18N.cs;
  const missing = [];
  for (const k of Object.keys(en)) {
    if (!(k in cs)) missing.push(k);
  }
  if (missing.length > 0) {
    throw new Error(missing.length + ' EN keys missing from CS: ' + missing.slice(0, 5).join(', ') + (missing.length > 5 ? ', …' : ''));
  }
});

console.log('');
console.log('Plan 25-11 i18n-parity tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
