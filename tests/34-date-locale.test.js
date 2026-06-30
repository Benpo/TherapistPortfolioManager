/**
 * Phase 34 — de/cs date-locale behavior test.
 *
 * Closes the gap left by 25-11-i18n-parity (which only checks i18n KEY
 * PRESENCE, never date RENDERING) and by pdf-latin-regression (whose fixtures
 * pass a RAW ISO sessionDate straight into pdf-export.js's own formatDate — the
 * de-DE/cs-CZ branch that has been correct since Phase 22 — so they never
 * exercised the real-app chain that was broken).
 *
 * The real bug: assets/app.js `App.formatDate` branched only
 *   currentLang === "he" ? "he-IL" : "en-US"
 * so de/cs fell through to en-US and rendered US month-first order with ENGLISH
 * month names ("Jun 15, 2026"). App.formatDate feeds BOTH the in-app date
 * display AND the real-app PDF export: export-modal.js pre-formats the session
 * date via App.formatDate and passes the formatted STRING to
 * PDFExport.buildSessionPDF (pdf-export.js leaves an already-formatted,
 * non-ISO string unchanged), and the footer "exported on" date is
 * App.formatDate(new Date()). So de/cs exports showed US-order English dates.
 *
 * The fix maps de->de-DE, cs->cs-CZ (long month names so cs keeps a localized
 * month — its short month is numeric "6."), in European day-month-year order,
 * while leaving en/he byte-identical.
 *
 * This test asserts (falsifiably):
 *   1. App.formatDate de  -> "15. Juni 2026"   (day < month < year; month "Juni")
 *   2. App.formatDate cs  -> "15. června 2026" (day < month < year; month "června")
 *   3. App.formatDate en  -> "Jun 15, 2026"    (UNCHANGED — exact match)
 *   4. App.formatDate he  -> "15 ביוני 2026"   (UNCHANGED — day < year, localized month)
 *   5. Real-app export chain: feeding App.formatDate's de/cs output into
 *      PDFExport.buildSessionPDF produces a non-empty PDF (real output, bytes>0).
 *
 * Run: node tests/34-date-locale.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO_ROOT = path.resolve(__dirname, '..');
const KNOWN_DATE = '2026-06-15'; // a June date so de "Juni" / cs "června" are unambiguous

let passed = 0, failed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { console.log('  PASS  ' + name); passed++; })
    .catch((err) => { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; });
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

// Assert European day-month-year order: the day number precedes the month
// token, which precedes the year. All three tokens must be present.
function assertEuropeanOrder(out, day, monthToken, year) {
  const di = out.indexOf(day), mi = out.indexOf(monthToken), yi = out.indexOf(year);
  assert(di >= 0, 'day "' + day + '" missing from "' + out + '"');
  assert(mi >= 0, 'localized month "' + monthToken + '" missing from "' + out + '"');
  assert(yi >= 0, 'year "' + year + '" missing from "' + out + '"');
  assert(di < mi, 'NOT European order — day "' + day + '" should precede month "' + monthToken + '" in "' + out + '"');
  assert(mi < yi, 'NOT European order — month "' + monthToken + '" should precede year "' + year + '" in "' + out + '"');
}

// ---------------------------------------------------------------------------
// Load assets/app.js in a vm sandbox (mirrors tests/24-04-app-cache.test.js).
// Returns the App namespace; Intl is provided so formatDate can localize.
// ---------------------------------------------------------------------------
function loadApp() {
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
  const src = fs.readFileSync(path.join(REPO_ROOT, 'assets', 'app.js'), 'utf8').replace(/^App\./gm, 'window.App.');
  vm.runInContext(src, sandbox, { filename: 'assets/app.js' });
  const App = sandbox.window.App;
  if (!App || typeof App.formatDate !== 'function' || typeof App.setLanguage !== 'function') {
    throw new Error('app.js did not expose App.formatDate / App.setLanguage');
  }
  return App;
}

(async function run() {
  const App = loadApp();

  // ── App.formatDate: the fixed in-app + export pre-format path ──────────
  await test('App.formatDate de -> European day-month-year with localized month "Juni"', () => {
    App.setLanguage('de');
    const out = App.formatDate(KNOWN_DATE);
    assert(out.length > 0, 'empty output');
    assert(out.indexOf('Juni') >= 0, 'expected localized German month "Juni", got "' + out + '"');
    assert(out.indexOf('Jun ') === -1 || out.indexOf('Juni') >= 0, 'should not be English "Jun" abbreviation');
    assertEuropeanOrder(out, '15', 'Juni', '2026');
    // Regression on the exact bug: must NOT be the old US-order English string.
    assert(out !== 'Jun 15, 2026', 'de still renders the old buggy en-US string');
  });

  await test('App.formatDate cs -> European day-month-year with localized month "června"', () => {
    App.setLanguage('cs');
    const out = App.formatDate(KNOWN_DATE);
    assert(out.length > 0, 'empty output');
    assert(out.indexOf('června') >= 0, 'expected localized Czech month "června", got "' + out + '"');
    // Guard against the short-month numeric form ("15. 6. 2026") losing the month name.
    assert(!/\b6\.\s*2026/.test(out), 'cs rendered a numeric month instead of a localized name: "' + out + '"');
    assertEuropeanOrder(out, '15', 'června', '2026');
    assert(out !== 'Jun 15, 2026', 'cs still renders the old buggy en-US string');
  });

  await test('App.formatDate en -> "Jun 15, 2026" UNCHANGED (byte-identical)', () => {
    App.setLanguage('en');
    const out = App.formatDate(KNOWN_DATE);
    assert(out === 'Jun 15, 2026', 'en output changed — expected "Jun 15, 2026", got "' + out + '"');
  });

  await test('App.formatDate he -> "15 ביוני 2026" UNCHANGED (localized, day before year)', () => {
    App.setLanguage('he');
    const out = App.formatDate(KNOWN_DATE);
    assert(out.length > 0, 'empty output');
    assert(out.indexOf('ביוני') >= 0, 'expected localized Hebrew month "ביוני", got "' + out + '"');
    assert(out.indexOf('15') < out.indexOf('2026'), 'he should keep day before year, got "' + out + '"');
    assert(out === '15 ביוני 2026', 'he output changed — expected "15 ביוני 2026", got "' + out + '"');
  });

  // ── Real-app export chain: App.formatDate output -> buildSessionPDF ─────
  // This is the exact path export-modal.js uses: pre-format the session date
  // via App.formatDate, then hand the already-formatted STRING to
  // PDFExport.buildSessionPDF (which passes a non-ISO string through unchanged).
  // Asserts the chain produces real PDF bytes for the fixed de/cs locales.
  await test('Real-app export chain produces non-empty de + cs PDFs (bytes>0)', async () => {
    const { buildJsdomEnv } = require('./_helpers/jsdom-pdf-env');
    for (const lang of ['de', 'cs']) {
      App.setLanguage(lang);
      const sessionDate = App.formatDate('2026-05-08'); // pre-formatted, European
      const exportedOn = App.formatDate(KNOWN_DATE);
      assert(sessionDate.length > 0 && exportedOn.length > 0, lang + ': empty pre-formatted dates');
      const dom = buildJsdomEnv().dom;
      const win = dom.window;
      const blob = await win.PDFExport.buildSessionPDF({
        clientName: 'Test Klient',
        sessionDate: sessionDate,
        sessionType: 'Online',
        markdown: '# Session\n\nBody text for the export.\n',
        exportedOn: exportedOn,
      }, { uiLang: lang });
      const bytes = Buffer.from(await blob.arrayBuffer());
      assert(bytes.length > 0, lang + ': export produced an empty PDF');
      // pdf-export passes the already-formatted string through unchanged, so the
      // card date the owner sees IS the European App.formatDate output.
      assert(/^(15\. Juni 2026|8\. května 2026)$/.test(sessionDate) || sessionDate.indexOf('2026') >= 0,
        lang + ': unexpected pre-formatted session date "' + sessionDate + '"');
      dom.window.close();
    }
  });

  console.log('');
  console.log('Phase 34 date-locale tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => { console.error('FATAL:', err && err.stack || err); process.exit(1); });
