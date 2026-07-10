/**
 * tests/help-integrity-locale.test.js — per-locale help-content integrity gate
 * (Phase 42.1, Plan 01; L10N-01; T-42.1-01 / T-42.1-02).
 *
 * RED-FIRST (project rule: integrity tests precede the content they guard).
 * Authored in Wave 0 BEFORE assets/help-content-{he,de,cs}.js exist, so the
 * translation plans have a falsifiable, non-vacuous target. Fails RED for the
 * RIGHT reason (locale content file absent) until each locale sibling lands,
 * then turns GREEN. Valid JS (`node -c` passes); auto-discovered by
 * tests/run-all.js (top-level tests/*.test.js — zero registration).
 *
 * The per-locale mirror of tests/help-integrity.test.js. For every locale it
 * loads assets/i18n-en.js + assets/i18n-<loc>.js + assets/help-content-en.js +
 * assets/help-content-<loc>.js into a fresh vm sandbox (the tests/33-i18n /
 * help-integrity idiom) and cross-checks the locale corpus against EN:
 *
 *   (a) Structure parity with EN — identical section ids in identical order;
 *       identical group / featured / topic ids / topic priority;
 *       exactly ONE featured section; both groups (session-loop, technical)
 *       present. Only title + body text/steps may differ from EN.
 *   (b) {ui:key} tokens — every {ui:...} in a locale body resolves to a
 *       non-empty string in window.I18N.<loc> (D-23; mirrors 39:108-125); and
 *       every {ui:...} present in the EN body is present byte-identical in the
 *       matching locale topic (tokens are NEVER translated).
 *   (c) Locale-appropriate forbidden clinical terms — the HE/DE/CS clinical
 *       patient/treatment equivalents (Pitfall 3: do NOT reuse the EN
 *       /\bpatient\b/ regex). Approved client/session vocab is grounded in the
 *       shipped i18n-<loc>.js dict (HE לקוח/מפגש, DE Klient/Sitzung,
 *       CS klient/sezení).
 *   (d) No emoji — reuse the help-integrity EMOJI_RE against every title/body
 *       string.
 *   (e) No control chars other than \n — reject C0/C1 controls and the
 *       U+202A–U+202E / U+2066–U+2069 bidi-control code points (Phase 29
 *       NUL-truncation / bidi-injection precedent).
 *
 * One parameterized file looping he/de/cs (RESEARCH Open Q 3 — preferred over
 * three siblings). EN is loaded as the parity baseline, never iterated as a
 * target. Read-only: never writes a production file.
 *
 * Run: node tests/help-integrity-locale.test.js
 * Exits 0 on full pass, 1 on any failure (the tests/run-all.js contract).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
function assetPath(f) { return path.join(ASSETS_DIR, f); }

// The three locales this gate validates. EN is the parity baseline (loaded
// below), NOT a member of this array.
const LOCALES = ['he', 'de', 'cs'];

// ── RED guard inputs ─────────────────────────────────────────────────────────
// One fs.existsSync per locale content file (unrolled so each guard is explicit
// and independently greppable — the plan's acceptance keys on one guard per
// locale). Each is turned PRESENT when its translation plan lands the sibling.
const CONTENT_PRESENT = {
  he: fs.existsSync(assetPath('help-content-he.js')),
  de: fs.existsSync(assetPath('help-content-de.js')),
  cs: fs.existsSync(assetPath('help-content-cs.js')),
};

// ── Sandbox loader (Shared Pattern 4 — mirror help-integrity.test.js) ─────
// Fresh context per call so no locale leaks state into another. A genuine parse
// error in a shipped file is FATAL (exit 1) — distinct from the RED "file
// absent" signal, which is reported as a normal test failure below.
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

// EN parity baseline (both files ship today).
const SB_EN = loadSandbox(['i18n-en.js', 'help-content-en.js']);
const EN_SECTIONS = SB_EN.window.HELP_CONTENT_EN;
if (!Array.isArray(EN_SECTIONS)) {
  console.error('FATAL: window.HELP_CONTENT_EN is not an array after loading help-content-en.js');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
// Every user-facing prose string in a topic body (p/note text + steps items).
// Glyph nodes carry no prose (name only) and are skipped.
function bodyTexts(topic) {
  const out = [];
  for (const node of (topic.body || [])) {
    if (typeof node.text === 'string') out.push(node.text);
    if (Array.isArray(node.items)) {
      for (const it of node.items) if (typeof it === 'string') out.push(it);
    }
  }
  return out;
}
// Every string a section contributes (its title + all topic titles + all body
// prose) — the surface the emoji / control-char scans run over.
function sectionStrings(sec) {
  const out = [];
  if (typeof sec.title === 'string') out.push(sec.title);
  for (const tp of (sec.topics || [])) {
    if (typeof tp.title === 'string') out.push(tp.title);
    for (const s of bodyTexts(tp)) out.push(s);
  }
  return out;
}
// Sorted list of {ui:key} tokens (verbatim, including braces) across a topic body.
function uiTokens(topic) {
  const out = [];
  const re = /\{ui:[^}]+\}/g;
  for (const text of bodyTexts(topic)) {
    let m;
    while ((m = re.exec(text)) !== null) out.push(m[0]);
  }
  return out.sort();
}
function sectionById(sections, id) {
  return sections.filter(s => s && s.id === id)[0];
}
function topicById(sec, id) {
  return (sec.topics || []).filter(t => t && t.id === id)[0];
}

// Emoji / pictographic scan — shared shape with help-integrity.test.js:92
// (surrogate emoji planes + common symbol ranges + variation selector).
// Deliberately excludes the en/em dash and ordinary punctuation used in copy.
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;

// Forbidden control / bidi-control scan. Allows \n (U+000A) — the ONLY paragraph
// break the textContent render path honors — and rejects every other C0
// (U+0000–U+0009, U+000B–U+001F), DEL/C1 (U+007F–U+009F), and the LRE/RLE/PDF/
// LRO/RLO + LRI/RLI/FSI/PDI bidi-control code points (Phase 29 precedent).
const CONTROL_RE = /[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/;

// Locale-appropriate forbidden clinical terms (Pitfall 3 — NOT the EN
// patient/treatment regex). The clinical patient/treatment families per script;
// the app's approved framing is client/session (grounded in i18n-<loc>.js).
const FORBIDDEN_TERMS = {
  // HE: מטופל = patient/treated-one; טיפול = treatment/therapy. Approved: לקוח / מפגש.
  he: [/מטופל/, /טיפול/],
  // DE: Patient family + Behandlung (treatment). Approved: Klient / Sitzung.
  de: [/\bPatient(en|in|innen)?\b/i, /Behandlung/i],
  // CS: pacient + léčba / léčení (treatment). Approved: klient / sezení.
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
  const contentFile = 'help-content-' + loc + '.js';
  const i18nFile = 'i18n-' + loc + '.js';

  // RED guard — a live failure (never a throw) while the sibling is absent.
  if (!CONTENT_PRESENT[loc]) {
    test('[' + loc + '] help-content-' + loc + '.js exists', function () {
      throw new Error('assets/help-content-' + loc + '.js not found (RED — authored by the ' +
        loc + ' translation plan; gate is live, not vacuous)');
    });
    continue;
  }

  const sb = loadSandbox(['i18n-en.js', i18nFile, 'help-content-en.js', contentFile]);
  const LOC_I18N = sb.window.I18N[loc];
  const LOC_SECTIONS = sb.window['HELP_CONTENT_' + LOC];

  test('[' + loc + '] window.I18N.' + loc + ' + HELP_CONTENT_' + LOC + ' loaded', function () {
    if (!LOC_I18N || typeof LOC_I18N !== 'object') {
      throw new Error('window.I18N.' + loc + ' is not an object after loading ' + i18nFile);
    }
    if (!Array.isArray(LOC_SECTIONS)) {
      throw new Error('window.HELP_CONTENT_' + LOC + ' is not an array after loading ' + contentFile);
    }
  });
  if (!Array.isArray(LOC_SECTIONS) || !LOC_I18N) continue;

  // (a) Structure parity with EN ─────────────────────────────────────────────
  test('[' + loc + '] section ids match EN in identical order', function () {
    const enIds = EN_SECTIONS.map(s => s.id);
    const locIds = LOC_SECTIONS.map(s => s.id);
    if (enIds.length !== locIds.length) {
      throw new Error('section count ' + locIds.length + ' ≠ EN ' + enIds.length);
    }
    for (let i = 0; i < enIds.length; i++) {
      if (enIds[i] !== locIds[i]) {
        throw new Error('section[' + i + '] id "' + locIds[i] + '" ≠ EN "' + enIds[i] + '"');
      }
    }
  });
  test('[' + loc + '] each section group + featured + topics match EN', function () {
    for (const en of EN_SECTIONS) {
      const lc = sectionById(LOC_SECTIONS, en.id);
      if (!lc) throw new Error('missing section: ' + en.id);
      if (lc.group !== en.group) {
        throw new Error(en.id + ' group "' + lc.group + '" ≠ EN "' + en.group + '"');
      }
      if (Boolean(lc.featured) !== Boolean(en.featured)) {
        throw new Error(en.id + ' featured ' + Boolean(lc.featured) + ' ≠ EN ' + Boolean(en.featured));
      }
      const enTopicIds = (en.topics || []).map(t => t.id);
      const lcTopicIds = (lc.topics || []).map(t => t.id);
      if (enTopicIds.length !== lcTopicIds.length) {
        throw new Error(en.id + ' topic count ' + lcTopicIds.length + ' ≠ EN ' + enTopicIds.length);
      }
      for (let i = 0; i < enTopicIds.length; i++) {
        if (enTopicIds[i] !== lcTopicIds[i]) {
          throw new Error(en.id + ' topic[' + i + '] id "' + lcTopicIds[i] + '" ≠ EN "' + enTopicIds[i] + '"');
        }
        const enTp = en.topics[i];
        const lcTp = lc.topics[i];
        if (lcTp.priority !== enTp.priority) {
          throw new Error(en.id + '/' + enTp.id + ' priority ' + lcTp.priority + ' ≠ EN ' + enTp.priority);
        }
      }
    }
  });
  test('[' + loc + '] exactly one featured section', function () {
    const feat = LOC_SECTIONS.filter(s => s.featured === true);
    if (feat.length !== 1) throw new Error('expected exactly 1 featured, found ' + feat.length);
  });
  test('[' + loc + '] both groups (session-loop, technical) present', function () {
    const groups = new Set(LOC_SECTIONS.map(s => s.group));
    for (const g of ['session-loop', 'technical']) {
      if (!groups.has(g)) throw new Error('missing group: ' + g);
    }
  });

  // (b) {ui:key} tokens resolve + are byte-identical to EN ────────────────────
  test('[' + loc + '] every {ui:key} in a locale body resolves to a non-empty I18N.' + loc + ' string', function () {
    const bad = [];
    const re = /\{ui:([^}]+)\}/g;
    for (const sec of LOC_SECTIONS) {
      for (const tp of (sec.topics || [])) {
        for (const text of bodyTexts(tp)) {
          let m;
          while ((m = re.exec(text)) !== null) {
            const key = m[1].trim();
            const val = LOC_I18N[key];
            if (typeof val !== 'string' || val.length === 0) {
              bad.push(sec.id + '/' + tp.id + ': {ui:' + key + '}');
            }
          }
        }
      }
    }
    if (bad.length) {
      throw new Error(bad.length + ' unresolved/empty {ui:key} token(s): ' +
        bad.slice(0, 8).join('; ') + (bad.length > 8 ? ', …' : ''));
    }
  });
  test('[' + loc + '] {ui:key} token set is byte-identical to EN per topic (tokens never translated)', function () {
    const mismatched = [];
    for (const en of EN_SECTIONS) {
      const lc = sectionById(LOC_SECTIONS, en.id);
      if (!lc) continue; // structure test already flagged this
      for (const enTp of (en.topics || [])) {
        const lcTp = topicById(lc, enTp.id);
        if (!lcTp) continue;
        const enTok = JSON.stringify(uiTokens(enTp));
        const lcTok = JSON.stringify(uiTokens(lcTp));
        if (enTok !== lcTok) {
          mismatched.push(en.id + '/' + enTp.id + ' EN=' + enTok + ' LOC=' + lcTok);
        }
      }
    }
    if (mismatched.length) {
      throw new Error('{ui:} token drift: ' + mismatched.slice(0, 6).join(' | ') +
        (mismatched.length > 6 ? ', …' : ''));
    }
  });

  // (c) Locale-appropriate forbidden clinical terms ──────────────────────────
  test('[' + loc + '] no forbidden clinical terms (patient/treatment equivalents)', function () {
    const regexes = FORBIDDEN_TERMS[loc];
    const hits = [];
    for (const sec of LOC_SECTIONS) {
      for (const text of sectionStrings(sec)) {
        for (const rx of regexes) {
          if (rx.test(text)) hits.push(sec.id + ' matched ' + rx.toString());
        }
      }
    }
    if (hits.length) throw new Error('forbidden clinical term(s): ' + hits.slice(0, 6).join('; '));
  });

  // (d) No emoji ─────────────────────────────────────────────────────────────
  test('[' + loc + '] no emoji code point in any title/body string', function () {
    const hits = [];
    for (const sec of LOC_SECTIONS) {
      for (const text of sectionStrings(sec)) {
        if (EMOJI_RE.test(text)) hits.push(sec.id);
      }
    }
    if (hits.length) throw new Error('emoji found in: ' + Array.from(new Set(hits)).join(', '));
  });

  // (e) No control chars other than \n (bidi-control / NUL guard) ─────────────
  test('[' + loc + '] no control or bidi-control chars (only \\n allowed)', function () {
    const hits = [];
    for (const sec of LOC_SECTIONS) {
      for (const text of sectionStrings(sec)) {
        if (CONTROL_RE.test(text)) hits.push(sec.id);
      }
    }
    if (hits.length) throw new Error('control/bidi char in: ' + Array.from(new Set(hits)).join(', '));
  });
}

// ── Static help.html locale-tag gate (WR-01; mirrors T-42-V5's shape) ────────
// The vm-sandbox gates above load the locale corpora from DISK and therefore
// CANNOT see a dropped/typo'd <script> tag on help.html: help.js
// localeSections() degrades silently to all-EN when HELP_CONTENT_<LOC> is
// undefined, so a missing tag ships an English-only Help center for that
// locale while every other gate stays green (the exact failure class T-42-V5
// exists to prevent for the changelog siblings). This purely-static gate reads
// the REAL help.html source — deleting or typo-ing any of the three sibling
// tags turns it RED.
test('help.html loads help-content-{he,de,cs}.js after help-content-en.js and before help.js (WR-01 static tag gate)', function () {
  const src = fs.readFileSync(path.join(__dirname, '..', 'help.html'), 'utf8');
  const enAt = src.indexOf('help-content-en.js');
  const helpJsAt = src.indexOf('assets/help.js');
  if (enAt === -1) throw new Error('help.html missing <script> for help-content-en.js');
  if (helpJsAt === -1) throw new Error('help.html missing <script> for assets/help.js');
  for (const sib of ['help-content-he.js', 'help-content-de.js', 'help-content-cs.js']) {
    const at = src.indexOf(sib);
    if (at === -1) throw new Error('help.html missing <script> for ' + sib);
    if (at < enAt) throw new Error(sib + ' must load AFTER help-content-en.js (EN is the canonical base localeSections() merges into)');
    if (at > helpJsAt) throw new Error(sib + ' must load BEFORE assets/help.js (the corpus must exist at render)');
  }
});

console.log('');
console.log('Phase 42.1 per-locale help-content integrity gate — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
