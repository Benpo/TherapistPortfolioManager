/**
 * tests/changelog-integrity.test.js — changelog data-source integrity gate
 * (Phase 42, Plan 02; CHLG-03 / CHLG-04 / T-42-V9; D-08 / D-10).
 *
 * RED-FIRST (project rule: integrity tests precede implementation). Authored
 * BEFORE assets/changelog-content-en.js exists; fails RED for the right reason
 * (data module absent) until Plan 04 authors the single source, which turns it
 * GREEN. Valid JS (`node -c` passes); auto-discovered by tests/run-all.js.
 *
 * The anti-rot guard for the ONE structured source that drives BOTH the What's-
 * New popup (latest .highlights) and the changelog page (full history) — never
 * forked, never scraped from git (CHLG-03). Mirrors tests/help-integrity.js:
 * loads assets/i18n-en.js then assets/changelog-content-en.js into a vm sandbox
 * (the tests/33-i18n pattern) and asserts the RESEARCH ## Entry Schema contract:
 *
 *   1. `version` is a unique semver string per entry; the array is strictly
 *      REVERSE-CHRONOLOGICAL by version (newest first).
 *   2. `anchor` is a unique, non-empty kebab id per entry (deep-link target).
 *   3. Each CONTENT entry (non-origin) has a non-empty `lede`, a `highlights`
 *      array of length 2–4 (D-08 — the popup source), and a `categories` object
 *      whose keys ⊆ {new, improved, fixed}, each present category a non-empty
 *      string array.
 *   4. The v1.0 entry has `origin:true` and NO `highlights` / `categories`
 *      (one-line marker, D-01).
 *   5. The FIRST array element is the latest: `version === '1.3.0'` and it has a
 *      non-empty `highlights` array (self-hosting proof, CHLG-04; popup source).
 *   6. NO emoji code point appears in ANY string field (D-10) — same surrogate/
 *      symbol-range scan the i18n no-emoji tests use.
 *
 * Read-only: loads the REAL data module (not a fixture) so it genuinely
 * validates Plan 04's output. Never writes any production file.
 *
 * Run: node tests/changelog-integrity.test.js
 * Exits 0 on full pass, non-zero on any failure (the tests/run-all.js contract).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const DATA_FILE = 'changelog-content-en.js';

// ── RED guard: fail cleanly (not a stack trace) while the source is absent ────
// Plan 04 (changelog-content-en.js) turns this GREEN. All assertions live below.
if (!fs.existsSync(path.join(ASSETS_DIR, DATA_FILE))) {
  console.error('RED (expected before impl): assets/' + DATA_FILE + ' does not exist yet.');
  console.error('Plan 04 (changelog-content-en.js) turns tests/changelog-integrity.test.js GREEN.');
  process.exit(1);
}

const sandbox = {
  window: {},
  console: { log() {}, warn() {}, error() {} },
};
sandbox.window.I18N = {};
sandbox.window.QUOTES = {};
vm.createContext(sandbox);

// Load the i18n dict (parity with help-integrity) then the REAL data source.
const FILES = ['i18n-en.js', DATA_FILE];
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

const ENTRIES = sandbox.window.CHANGELOG_CONTENT_EN;
if (!Array.isArray(ENTRIES)) {
  console.error('FATAL: window.CHANGELOG_CONTENT_EN is not an array after loading assets/' + DATA_FILE);
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORY_KEYS = ['new', 'improved', 'fixed'];

// Emoji / pictographic scan (shared shape with help-integrity): surrogate-
// pair emoji planes + common symbol ranges + variation selector. Excludes the
// en/em dash and ordinary punctuation used in the copy.
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;

// Collect every user-facing string field of an entry (version/anchor/date/lede,
// highlights[], and each present category's string[]).
function entryStrings(e) {
  const out = [];
  ['version', 'anchor', 'date', 'lede'].forEach((k) => {
    if (typeof e[k] === 'string') out.push(e[k]);
  });
  if (Array.isArray(e.highlights)) {
    for (const h of e.highlights) if (typeof h === 'string') out.push(h);
  }
  if (e.categories && typeof e.categories === 'object') {
    for (const k of Object.keys(e.categories)) {
      const arr = e.categories[k];
      if (Array.isArray(arr)) for (const s of arr) if (typeof s === 'string') out.push(s);
    }
  }
  return out;
}

// Parse a strict "MAJOR.MINOR.PATCH" semver into a comparable [n,n,n] tuple.
function semverTuple(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
function cmpSemverDesc(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return b[i] - a[i]; // descending: newer first
  }
  return 0;
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

// ── 1. Unique semver + strictly reverse-chronological ────────────────────────
test('Every entry version is a unique, valid semver string', function () {
  const seen = new Set();
  for (const e of ENTRIES) {
    if (typeof e.version !== 'string' || !semverTuple(e.version)) {
      throw new Error('invalid semver version: ' + JSON.stringify(e.version));
    }
    if (seen.has(e.version)) throw new Error('duplicate version: ' + e.version);
    seen.add(e.version);
  }
});
test('Array is strictly reverse-chronological by version (newest first)', function () {
  // cmpSemverDesc(prev,cur) is <0 when prev is NEWER than cur (correct order),
  // >0 when cur is newer (out of order), 0 when equal.
  for (let i = 1; i < ENTRIES.length; i++) {
    const prev = semverTuple(ENTRIES[i - 1].version);
    const cur = semverTuple(ENTRIES[i].version);
    const c = cmpSemverDesc(prev, cur);
    if (c > 0) {
      throw new Error('not reverse-chron: ' + ENTRIES[i - 1].version + ' precedes newer ' + ENTRIES[i].version);
    }
    if (c === 0) {
      throw new Error('adjacent equal versions: ' + ENTRIES[i].version);
    }
  }
});

// ── 2. Unique, non-empty kebab anchors ───────────────────────────────────────
test('Every entry anchor is a unique, non-empty kebab id', function () {
  const seen = new Set();
  for (const e of ENTRIES) {
    if (typeof e.anchor !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.anchor)) {
      throw new Error('invalid kebab anchor on ' + e.version + ': ' + JSON.stringify(e.anchor));
    }
    if (seen.has(e.anchor)) throw new Error('duplicate anchor: ' + e.anchor);
    seen.add(e.anchor);
  }
});

// ── 3. Content-entry schema: lede + highlights[2-4] + categories ⊆ set ───────
test('Every content (non-origin) entry has a non-empty lede', function () {
  for (const e of ENTRIES) {
    if (e.origin === true) continue;
    if (typeof e.lede !== 'string' || e.lede.trim().length === 0) {
      throw new Error('empty lede on ' + e.version);
    }
  }
});
test('Every content entry has a highlights array of length 2-4 (D-08)', function () {
  for (const e of ENTRIES) {
    if (e.origin === true) continue;
    if (!Array.isArray(e.highlights) || e.highlights.length < 2 || e.highlights.length > 4) {
      throw new Error('highlights length out of [2,4] on ' + e.version + ': ' +
        (Array.isArray(e.highlights) ? e.highlights.length : typeof e.highlights));
    }
    for (const h of e.highlights) {
      if (typeof h !== 'string' || h.trim().length === 0) {
        throw new Error('empty highlight string on ' + e.version);
      }
    }
  }
});
test('Every content entry categories keys ⊆ {new,improved,fixed}, each a non-empty string[]', function () {
  for (const e of ENTRIES) {
    if (e.origin === true) continue;
    if (!e.categories || typeof e.categories !== 'object' || Array.isArray(e.categories)) {
      throw new Error('categories missing/invalid on ' + e.version);
    }
    const keys = Object.keys(e.categories);
    if (keys.length === 0) throw new Error('empty categories object on ' + e.version);
    for (const k of keys) {
      if (!CATEGORY_KEYS.includes(k)) {
        throw new Error('unexpected category key "' + k + '" on ' + e.version);
      }
      const arr = e.categories[k];
      if (!Array.isArray(arr) || arr.length === 0) {
        throw new Error('empty category "' + k + '" on ' + e.version);
      }
      for (const s of arr) {
        if (typeof s !== 'string' || s.trim().length === 0) {
          throw new Error('empty item in category "' + k + '" on ' + e.version);
        }
      }
    }
  }
});

// ── 4. v1.0 origin-only marker (D-01) ────────────────────────────────────────
test('The v1.0 entry is origin-only (origin:true, no highlights/categories)', function () {
  const v10 = ENTRIES.find((e) => e.version === '1.0.0');
  if (!v10) throw new Error('no v1.0.0 origin entry present');
  if (v10.origin !== true) throw new Error('v1.0.0 entry must have origin:true');
  if ('highlights' in v10) throw new Error('v1.0.0 origin entry must NOT have highlights');
  if ('categories' in v10) throw new Error('v1.0.0 origin entry must NOT have categories');
});

// ── 5. First element is the latest v1.3.0 with highlights (CHLG-04) ──────────
test('First entry is v1.3.0 (self-hosting) with a non-empty highlights array', function () {
  const first = ENTRIES[0];
  if (!first || first.version !== '1.3.0') {
    throw new Error('first entry version is "' + (first && first.version) + '", expected 1.3.0');
  }
  if (!Array.isArray(first.highlights) || first.highlights.length < 2) {
    throw new Error('v1.3.0 must ship a non-empty highlights array (popup source, CHLG-04)');
  }
});

// ── 6. No emoji in any string field (D-10) ───────────────────────────────────
test('No entry string field contains an emoji code point (D-10)', function () {
  const hits = [];
  for (const e of ENTRIES) {
    for (const s of entryStrings(e)) {
      if (EMOJI_RE.test(s)) hits.push(e.version);
    }
  }
  if (hits.length) throw new Error('emoji found in entries: ' + Array.from(new Set(hits)).join(', '));
});

console.log('');
console.log('Phase 42 changelog-content integrity gate — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
