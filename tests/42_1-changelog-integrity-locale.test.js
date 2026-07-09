/**
 * tests/42_1-changelog-integrity-locale.test.js — per-locale changelog-content
 * integrity gate (Phase 42.1, Plan 01; L10N-01; T-42.1-01 / T-42.1-02).
 *
 * RED-FIRST (project rule: integrity tests precede the content they guard).
 * Authored in Wave 0 BEFORE assets/changelog-content-{he,de,cs}.js exist, so the
 * translation plans have a falsifiable, non-vacuous target. Fails RED for the
 * RIGHT reason (locale data file absent) until each locale sibling lands, then
 * turns GREEN. Valid JS (`node -c` passes); auto-discovered by tests/run-all.js.
 *
 * The per-locale mirror of tests/42-changelog-integrity.test.js. For every
 * locale it loads assets/changelog-content-en.js + assets/changelog-content-
 * <loc>.js into a fresh vm sandbox and cross-checks the locale entries against
 * EN:
 *
 *   (a) Schema / order parity — same entry count; identical `version` values in
 *       identical reverse-chronological order; identical `anchor` values; the
 *       version-1.0.0 entry carries `origin:true` with NO highlights / NO
 *       categories (D-01); every content entry has a non-empty `lede` and a
 *       `highlights` array of length 2–4 (D-08).
 *   (b) Category shape parity — for each content entry the SET of present
 *       category keys (⊆ {new, improved, fixed}) is identical to EN, and each
 *       present category is a non-empty string array (empty categories omitted,
 *       D-11). Category keys are never translated.
 *   (c) date — every entry HAS a non-empty `date` string, but this gate makes NO
 *       cross-locale `date` equality assertion: the month word is localized per
 *       D-07 (RESEARCH A1). `version` + `anchor` ARE asserted byte-identical to
 *       EN (they are never translated).
 *   (d) No emoji + no control / bidi-control chars in any lede / highlight /
 *       category string (Phase 29 NUL-truncation / bidi-injection precedent).
 *   (e) Locale-appropriate forbidden clinical terms — the HE/DE/CS clinical
 *       patient/treatment equivalents (same design as the help gate; Pitfall 3).
 *
 * One parameterized file looping he/de/cs. EN is the parity baseline, never
 * iterated as a target. Read-only: never writes a production file.
 *
 * Run: node tests/42_1-changelog-integrity-locale.test.js
 * Exits 0 on full pass, 1 on any failure (the tests/run-all.js contract).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
function assetPath(f) { return path.join(ASSETS_DIR, f); }

// The three locales this gate validates. EN is the parity baseline, NOT here.
const LOCALES = ['he', 'de', 'cs'];

// ── RED guard inputs ─────────────────────────────────────────────────────────
// One fs.existsSync per locale data file (unrolled so each guard is explicit and
// independently greppable — the plan's acceptance keys on one guard per locale).
const CONTENT_PRESENT = {
  he: fs.existsSync(assetPath('changelog-content-he.js')),
  de: fs.existsSync(assetPath('changelog-content-de.js')),
  cs: fs.existsSync(assetPath('changelog-content-cs.js')),
};

// ── Sandbox loader (mirror 42-changelog-integrity.test.js) ───────────────────
// Fresh context per call so no locale leaks state into another. A genuine parse
// error in a shipped file is FATAL (exit 1) — distinct from the RED "file
// absent" signal, reported as a normal test failure below.
function loadSandbox(files) {
  const sandbox = {
    window: {},
    console: { log() {}, warn() {}, error() {} },
  };
  sandbox.window.I18N = {};
  sandbox.window.QUOTES = {};
  vm.createContext(sandbox);
  for (const f of files) {
    const src = fs.readFileSync(assetPath(f), 'utf8');
    try {
      vm.runInContext(src, sandbox, { filename: 'assets/' + f });
    } catch (err) {
      console.error('FATAL: assets/' + f + ' failed to load in vm sandbox.');
      console.error('       ' + (err && err.stack || err.message || err));
      process.exit(1);
    }
  }
  return sandbox;
}

// EN parity baseline (ships today).
const SB_EN = loadSandbox(['changelog-content-en.js']);
const EN_ENTRIES = SB_EN.window.CHANGELOG_CONTENT_EN;
if (!Array.isArray(EN_ENTRIES)) {
  console.error('FATAL: window.CHANGELOG_CONTENT_EN is not an array after loading changelog-content-en.js');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORY_KEYS = ['new', 'improved', 'fixed'];

// The translatable string surface of an entry — lede + highlights[] + each
// present category's string[]. version/anchor (never translated) and date
// (localized month; scanned separately) are excluded.
function translatableStrings(e) {
  const out = [];
  if (typeof e.lede === 'string') out.push(e.lede);
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
function presentCategoryKeys(e) {
  if (!e.categories || typeof e.categories !== 'object') return [];
  return Object.keys(e.categories).sort();
}
function entryByVersion(entries, v) {
  return entries.filter(e => e && e.version === v)[0];
}

// Emoji / pictographic scan — shared shape with 42-changelog-integrity.test.js:87.
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;

// Control / bidi-control scan (escape-only — never embed a literal control char
// in source). Rejects C0 (U+0000–U+001F, incl. \n here: changelog strings are
// single-line, no paragraph breaks), DEL/C1 (U+007F–U+009F), and the bidi-
// control code points U+202A–U+202E / U+2066–U+2069.
const CONTROL_RE = /[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/;

// Locale-appropriate forbidden clinical terms (Pitfall 3 — NOT the EN
// patient/treatment regex). Approved framing is client/session, grounded in the
// shipped i18n-<loc>.js vocab (HE לקוח/מפגש, DE Klient/Sitzung, CS klient/sezení).
const FORBIDDEN_TERMS = {
  he: [/מטופל/, /טיפול/],
  de: [/\bPatient(en|in|innen)?\b/i, /Behandlung/i],
  cs: [/pacient/i, /léčb/i, /léčen/i],
};

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

// ── Per-locale gate ──────────────────────────────────────────────────────────
for (const loc of LOCALES) {
  const LOC = loc.toUpperCase();
  const contentFile = 'changelog-content-' + loc + '.js';

  // RED guard — a live failure (never a throw) while the sibling is absent.
  if (!CONTENT_PRESENT[loc]) {
    test('[' + loc + '] changelog-content-' + loc + '.js exists', function () {
      throw new Error('assets/changelog-content-' + loc + '.js not found (RED — authored by the ' +
        loc + ' translation plan; gate is live, not vacuous)');
    });
    continue;
  }

  const sb = loadSandbox(['changelog-content-en.js', contentFile]);
  const LOC_ENTRIES = sb.window['CHANGELOG_CONTENT_' + LOC];

  test('[' + loc + '] CHANGELOG_CONTENT_' + LOC + ' loaded as an array', function () {
    if (!Array.isArray(LOC_ENTRIES)) {
      throw new Error('window.CHANGELOG_CONTENT_' + LOC + ' is not an array after loading ' + contentFile);
    }
  });
  if (!Array.isArray(LOC_ENTRIES)) continue;

  // (a) Schema / order parity with EN ────────────────────────────────────────
  test('[' + loc + '] same entry count as EN', function () {
    if (LOC_ENTRIES.length !== EN_ENTRIES.length) {
      throw new Error('entry count ' + LOC_ENTRIES.length + ' ≠ EN ' + EN_ENTRIES.length);
    }
  });
  test('[' + loc + '] version values byte-identical to EN in identical order', function () {
    for (let i = 0; i < EN_ENTRIES.length; i++) {
      const en = EN_ENTRIES[i];
      const lc = LOC_ENTRIES[i];
      if (!lc || lc.version !== en.version) {
        throw new Error('entry[' + i + '] version "' + (lc && lc.version) + '" ≠ EN "' + en.version + '"');
      }
    }
  });
  test('[' + loc + '] anchor values byte-identical to EN in identical order', function () {
    for (let i = 0; i < EN_ENTRIES.length; i++) {
      const en = EN_ENTRIES[i];
      const lc = LOC_ENTRIES[i];
      if (!lc || lc.anchor !== en.anchor) {
        throw new Error('entry[' + i + '] anchor "' + (lc && lc.anchor) + '" ≠ EN "' + en.anchor + '"');
      }
    }
  });
  test('[' + loc + '] the v1.0.0 entry is origin-only (origin:true, no highlights/categories)', function () {
    const v10 = entryByVersion(LOC_ENTRIES, '1.0.0');
    if (!v10) throw new Error('no v1.0.0 entry present');
    if (v10.origin !== true) throw new Error('v1.0.0 entry must have origin:true');
    if ('highlights' in v10) throw new Error('v1.0.0 origin entry must NOT have highlights');
    if ('categories' in v10) throw new Error('v1.0.0 origin entry must NOT have categories');
  });
  test('[' + loc + '] every content entry has a non-empty lede + highlights[2-4]', function () {
    for (const e of LOC_ENTRIES) {
      if (e.origin === true) continue;
      if (typeof e.lede !== 'string' || e.lede.trim().length === 0) {
        throw new Error('empty lede on ' + e.version);
      }
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

  // (b) Category shape parity with EN ────────────────────────────────────────
  test('[' + loc + '] present category-key set identical to EN per content entry', function () {
    for (const en of EN_ENTRIES) {
      if (en.origin === true) continue;
      const lc = entryByVersion(LOC_ENTRIES, en.version);
      if (!lc) throw new Error('missing entry for version ' + en.version);
      const enKeys = JSON.stringify(presentCategoryKeys(en));
      const lcKeys = JSON.stringify(presentCategoryKeys(lc));
      if (enKeys !== lcKeys) {
        throw new Error(en.version + ' category keys ' + lcKeys + ' ≠ EN ' + enKeys);
      }
    }
  });
  test('[' + loc + '] each present category is a non-empty string[] with keys ⊆ {new,improved,fixed}', function () {
    for (const e of LOC_ENTRIES) {
      if (e.origin === true) continue;
      if (!e.categories || typeof e.categories !== 'object' || Array.isArray(e.categories)) {
        throw new Error('categories missing/invalid on ' + e.version);
      }
      for (const k of Object.keys(e.categories)) {
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

  // (c) date — present + non-empty, but NO cross-locale equality (D-07) ───────
  test('[' + loc + '] every entry has a non-empty date string (no cross-locale equality asserted)', function () {
    for (const e of LOC_ENTRIES) {
      if (typeof e.date !== 'string' || e.date.trim().length === 0) {
        throw new Error('empty/missing date on ' + e.version);
      }
    }
  });

  // (d) No emoji + no control / bidi chars in translatable strings ────────────
  test('[' + loc + '] no emoji in any lede/highlight/category string', function () {
    const hits = [];
    for (const e of LOC_ENTRIES) {
      for (const s of translatableStrings(e)) {
        if (EMOJI_RE.test(s)) hits.push(e.version);
      }
    }
    if (hits.length) throw new Error('emoji in entries: ' + Array.from(new Set(hits)).join(', '));
  });
  test('[' + loc + '] no control / bidi-control chars in any lede/highlight/category string', function () {
    const hits = [];
    for (const e of LOC_ENTRIES) {
      for (const s of translatableStrings(e)) {
        if (CONTROL_RE.test(s)) hits.push(e.version);
      }
    }
    if (hits.length) throw new Error('control/bidi char in entries: ' + Array.from(new Set(hits)).join(', '));
  });

  // (e) Locale-appropriate forbidden clinical terms ──────────────────────────
  test('[' + loc + '] no forbidden clinical terms (patient/treatment equivalents)', function () {
    const regexes = FORBIDDEN_TERMS[loc];
    const hits = [];
    for (const e of LOC_ENTRIES) {
      for (const s of translatableStrings(e)) {
        for (const rx of regexes) {
          if (rx.test(s)) hits.push(e.version + ' matched ' + rx.toString());
        }
      }
    }
    if (hits.length) throw new Error('forbidden clinical term(s): ' + hits.slice(0, 6).join('; '));
  });
}

console.log('');
console.log('Phase 42.1 per-locale changelog-content integrity gate — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
