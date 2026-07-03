/**
 * Phase 37 (D-19) rewrite — date-locale behavior test, now asserting the FIXED
 * date-engine behavior instead of the pre-fix behavior it originally pinned.
 *
 * ORIGINAL (Phase 34) intent — preserved as history:
 *   The old file asserted App.formatDate's per-locale output and drove the PDF
 *   export chain via PRE-FORMATTED strings (export-modal pre-formatted the date
 *   and handed pdf-export a non-ISO string it passed through unchanged). That
 *   encoded the OLD split: en-US in the UI, en-GB in the PDF, and a
 *   pre-formatting export seam.
 *
 * PHASE 37 rewrite (D-04 / D-19) — what this file now asserts:
 *   1. The canonical engine `window.DateFormat` (assets/date-format.js) EXISTS
 *      and exposes format / parseLocal / todayLocalISO / getPreference.
 *   2. `auto` per-locale outputs reproduce the current app.js rule, byte-for-byte:
 *        en -> en-US short  "Jul 2, 2026"        (D-04: en-US month-first, NOT en-GB "2 July 2026")
 *        de -> de-DE long   "15. Juni 2026"
 *        cs -> cs-CZ long   "15. června 2026"
 *        he -> he-IL short  "15 ביוני 2026"
 *   3. App.formatDate DELEGATES to the engine (its output equals the engine's
 *      `auto` output) — proving the display path routes through DateFormat.
 *   4. The PDF export chain now passes RAW ISO into pdf-export (the pre-format
 *      seam is removed) and the jsdom PDF env has `window.DateFormat` injected
 *      (D-21), so pdf-export formats the card date to the unified en-US string.
 *
 * This file is authored as a RED gate: assets/date-format.js does not exist yet
 * (lands Plan 37-03) and the jsdom PDF env does not inject it yet (D-21 lands
 * Plan 37-04), so it FAILS against the current tree by design. It stays a
 * behavior test — it EXECUTES the real modules via vm/jsdom, never asserting on
 * source text (MEMORY feedback-behavior-verification).
 *
 * Run: node tests/34-date-locale.test.js
 * Exits 0 on full pass, 1 on any failure (RED until Plan 37-03 / 37-04 land).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO_ROOT = path.resolve(__dirname, '..');
const REF_EN = '2026-07-02'; // en-US month-first => "Jul 2, 2026"
const REF_JUN = '2026-06-15'; // de "Juni" / cs "června" unambiguous
const REF_MAY = '2026-05-08'; // export-chain fixture date => en-US "May 8, 2026"

let passed = 0, failed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { console.log('  PASS  ' + name); passed++; })
    .catch((err) => { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; });
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// ---------------------------------------------------------------------------
// Load assets/app.js (and assets/date-format.js, when present) into a vm
// sandbox. The engine is eval'd BEFORE app.js so the (post-Plan-03) App.formatDate
// wrapper can delegate to window.DateFormat. Against the current tree the engine
// file is absent, so window.DateFormat is undefined and the engine assertions
// fail cleanly (RED). Returns { App, DateFormat }.
// ---------------------------------------------------------------------------
function loadAppAndEngine() {
  const documentEventTarget = { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } };
  const documentStub = Object.assign({
    documentElement: { lang: '', setAttribute() {} },
    body: { classList: { add() {}, remove() {} }, prepend() {}, style: {}, dataset: {} },
    head: { appendChild() {} },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() {
      return { style: {}, classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
        appendChild() {}, append() {}, prepend() {}, setAttribute() {}, getAttribute() { return null; },
        addEventListener() {}, removeEventListener() {} };
    },
  }, documentEventTarget);
  const storage = (() => { const m = new Map();
    return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() }; })();
  const sandbox = {
    window: { location: { href: '', search: '' }, scrollTo() {}, getComputedStyle: () => ({}) },
    document: documentStub,
    navigator: { serviceWorker: { addEventListener() {} }, storage: { persist: () => Promise.resolve(false), persisted: () => Promise.resolve(false) }, userAgent: '' },
    localStorage: storage, sessionStorage: storage,
    PortfolioDB: { getAllSnippets: async () => [], getAllTherapistSettings: async () => [] },
    BroadcastChannel: class { constructor() {} addEventListener() {} postMessage() {} close() {} },
    CustomEvent: class { constructor(t, i) { this.type = t; this.detail = i && i.detail; } },
    Event: class { constructor(t) { this.type = t; } },
    console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, queueMicrotask, Promise, JSON, Math, Date, Array, Object, Set, Map, RegExp, String, Number, Boolean, Intl,
  };
  sandbox.window.localStorage = storage;
  sandbox.window.I18N = { en: {}, he: {}, de: {}, cs: {} };
  sandbox.window.I18N_DEFAULT = 'en';
  vm.createContext(sandbox);

  // D-19/D-21: load the canonical engine into the SAME sandbox before app.js.
  const dfPath = path.join(REPO_ROOT, 'assets', 'date-format.js');
  if (fs.existsSync(dfPath)) {
    vm.runInContext(fs.readFileSync(dfPath, 'utf8'), sandbox, { filename: 'assets/date-format.js' });
  }

  const src = fs.readFileSync(path.join(REPO_ROOT, 'assets', 'app.js'), 'utf8').replace(/^App\./gm, 'window.App.');
  vm.runInContext(src, sandbox, { filename: 'assets/app.js' });
  const App = sandbox.window.App;
  if (!App || typeof App.formatDate !== 'function' || typeof App.setLanguage !== 'function') {
    throw new Error('app.js did not expose App.formatDate / App.setLanguage');
  }
  return { App, DateFormat: sandbox.window.DateFormat };
}

(async function run() {
  const { App, DateFormat } = loadAppAndEngine();
  function DF() {
    assert(DateFormat, 'window.DateFormat is undefined — engine (assets/date-format.js) not implemented yet (expected RED before Plan 37-03)');
    return DateFormat;
  }

  // 1) Engine exists with its public surface.
  await test('engine: window.DateFormat exposes format / parseLocal / todayLocalISO / getPreference', () => {
    const d = DF();
    assert(typeof d.format === 'function', 'DateFormat.format missing');
    assert(typeof d.parseLocal === 'function', 'DateFormat.parseLocal missing');
    assert(typeof d.todayLocalISO === 'function', 'DateFormat.todayLocalISO missing');
    assert(typeof d.getPreference === 'function', 'DateFormat.getPreference missing');
  });

  // 2) `auto` per-locale outputs reproduce the current app.js rule (D-04 for en).
  await test('auto en -> "Jul 2, 2026" (en-US month-first, D-04 — NOT en-GB "2 July 2026")', () => {
    const out = DF().format(REF_EN, 'auto', 'en');
    assert(out === 'Jul 2, 2026', 'expected "Jul 2, 2026", got "' + out + '"');
    assert(out !== '2 July 2026', 'must not render the old en-GB long form');
  });

  await test('auto de -> "15. Juni 2026" (de-DE long, unchanged)', () => {
    const out = DF().format(REF_JUN, 'auto', 'de');
    assert(out === '15. Juni 2026', 'expected "15. Juni 2026", got "' + out + '"');
  });

  await test('auto cs -> "15. června 2026" (cs-CZ long, unchanged)', () => {
    const out = DF().format(REF_JUN, 'auto', 'cs');
    assert(out === '15. června 2026', 'expected "15. června 2026", got "' + out + '"');
  });

  await test('auto he -> "15 ביוני 2026" (he-IL short, unchanged)', () => {
    const out = DF().format(REF_JUN, 'auto', 'he');
    assert(out === '15 ביוני 2026', 'expected "15 ביוני 2026", got "' + out + '"');
  });

  // 3) App.formatDate delegates to the engine (output === engine auto output).
  await test('App.formatDate delegates to DateFormat (en output === engine auto output)', () => {
    App.setLanguage('en');
    const appOut = App.formatDate(REF_EN);
    const engineOut = DF().format(REF_EN, 'auto', 'en');
    assert(appOut === engineOut, 'App.formatDate "' + appOut + '" != engine auto "' + engineOut + '" — wrapper not delegating');
    assert(appOut === 'Jul 2, 2026', 'expected "Jul 2, 2026", got "' + appOut + '"');
  });

  // 4) PDF export chain: raw ISO in, engine injected (D-21), en-US card date out.
  await test('export chain: jsdom PDF env has window.DateFormat (D-21) + raw-ISO sessionDate builds a non-empty en PDF', async () => {
    const { buildJsdomEnv } = require('./_helpers/jsdom-pdf-env');
    const { dom, win } = buildJsdomEnv();
    try {
      // D-21: pdf-export delegates to window.DateFormat, so it MUST be injected
      // into the PDF env. Absent today (injection lands Plan 37-04) => RED.
      assert(win.DateFormat && typeof win.DateFormat.format === 'function',
        'jsdom PDF env is missing window.DateFormat — D-21 injection not applied yet (expected RED before Plan 37-04)');
      assert(win.DateFormat.format(REF_MAY, 'auto', 'en') === 'May 8, 2026',
        'engine in PDF env should format en auto "' + REF_MAY + '" as "May 8, 2026"');

      // The export chain now passes RAW ISO (no pre-formatting) into buildSessionPDF.
      const blob = await win.PDFExport.buildSessionPDF({
        clientName: 'Test Client',
        sessionDate: REF_MAY, // RAW ISO — pdf-export formats it via the engine
        sessionType: 'Online',
        markdown: '# Session\n\nBody text for the export.\n',
      }, { uiLang: 'en' });
      const bytes = Buffer.from(await blob.arrayBuffer());
      assert(bytes.length > 0, 'export produced an empty PDF');
    } finally {
      dom.window.close();
    }
  });

  console.log('');
  console.log('Phase 37 (D-19) date-locale rewrite — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => { console.error('FATAL:', err && err.stack || err); process.exit(1); });
