/**
 * Phase 37 — TZ-pinned date-engine RED spec (Wave 0, authored BEFORE the engine).
 *
 * This file is a FALSIFIABLE behavior test for the date-correctness engine
 * (`window.DateFormat`, `assets/date-format.js`) that lands in Plan 37-03, plus
 * the display-site delegation (`App.formatDate`). It is authored FIRST and MUST
 * FAIL against the current tree (RED), then go GREEN once the engine ships.
 *
 * The root bug it pins: `new Date("YYYY-MM-DD")` parses as UTC midnight, so in a
 * negative-UTC timezone the local calendar day is the day BEFORE. Pinning
 * TZ=America/New_York makes the off-by-one observable and deterministic:
 *   - pre-fix: App.formatDate('2026-07-02')  ->  "Jul 1, 2026"   (WRONG)
 *   - post-fix: App.formatDate('2026-07-02') ->  "Jul 2, 2026"   (CORRECT)
 *
 * Per MEMORY `feedback-behavior-verification` the test EXECUTES the real module
 * via a vm sandbox — it never asserts on source text. Per MEMORY
 * `reference-pdf-jsdom-inert-gates` the TZ pin is guarded by an EDT-offset
 * self-check so a silently-inert pin fails loudly instead of passing green.
 *
 * Run: node tests/37-date-format.test.js
 * Exits 0 on full pass, 1 on any failure (RED until Plan 37-03/37-04 land).
 */

'use strict';

// ── TZ PIN — must be the very first executable logic, before any Date use ────
// V8 caches the timezone at process startup, so setting process.env.TZ mid-file
// has NO effect. Set it, then RE-EXEC this file in a child whose TZ is applied
// at startup, and propagate the child's exit code.
if (process.env.TZ !== 'America/New_York') {
  process.env.TZ = 'America/New_York';
  var reexec = require('child_process').spawnSync(
    process.execPath, [__filename],
    { stdio: 'inherit', env: Object.assign({}, process.env, { TZ: 'America/New_York' }) }
  );
  process.exit(reexec.status == null ? 1 : reexec.status);
}

// ── TZ self-check — fail loudly if the pin silently did not take effect ──────
// July 2 2026 in America/New_York is EDT = UTC-4 => getTimezoneOffset() === 240.
// If this is wrong the whole "falsifiable" premise is inert (Pitfall 1).
(function assertTzPin() {
  var off = new Date(2026, 6, 2).getTimezoneOffset();
  if (off !== 240) {
    console.error('FATAL: TZ pin failed — expected EDT offset 240 for Jul 2 2026, got ' +
      off + ' (TZ=' + process.env.TZ + '). Test is inert; aborting.');
    process.exit(1);
  }
})();

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var REPO_ROOT = path.resolve(__dirname, '..');
var LRI = '⁦'; // LEFT-TO-RIGHT ISOLATE
var PDI = '⁩'; // POP DIRECTIONAL ISOLATE

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (e) { console.log('  FAIL  ' + name); console.log('        ' + (e && e.message || e)); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function pad2(n) { return String(n).padStart(2, '0'); }

// ---------------------------------------------------------------------------
// Load the REAL modules into a vm sandbox (mirrors 34-date-locale.test.js
// loadApp). If assets/date-format.js is present it is eval'd into the SAME
// sandbox BEFORE app.js so App.formatDate can delegate to window.DateFormat.
// Against the current tree date-format.js does NOT exist yet, so window.DateFormat
// is undefined and every engine assertion fails cleanly (RED). app.js still
// loads and exposes App.formatDate, which pre-fix returns the UTC-shifted string.
// Returns { App, DateFormat }.
// ---------------------------------------------------------------------------
function loadEngine() {
  var documentEventTarget = { addEventListener: function () {}, removeEventListener: function () {}, dispatchEvent: function () { return true; } };
  var documentStub = Object.assign({
    documentElement: { lang: '', setAttribute: function () {} },
    body: { classList: { add: function () {}, remove: function () {} }, prepend: function () {}, style: {}, dataset: {} },
    head: { appendChild: function () {} },
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    createElement: function () {
      return { style: {}, classList: { add: function () {}, remove: function () {}, contains: function () { return false; }, toggle: function () {} },
        appendChild: function () {}, append: function () {}, prepend: function () {}, setAttribute: function () {}, getAttribute: function () { return null; },
        addEventListener: function () {}, removeEventListener: function () {} };
    },
  }, documentEventTarget);
  var storage = (function () {
    var m = new Map();
    return { getItem: function (k) { return m.has(k) ? m.get(k) : null; }, setItem: function (k, v) { m.set(k, String(v)); }, removeItem: function (k) { m.delete(k); }, clear: function () { m.clear(); } };
  })();
  var sandbox = {
    window: { location: { href: '', search: '' }, scrollTo: function () {}, getComputedStyle: function () { return {}; } },
    document: documentStub,
    navigator: { serviceWorker: { addEventListener: function () {} }, storage: { persist: function () { return Promise.resolve(false); }, persisted: function () { return Promise.resolve(false); } }, userAgent: '' },
    localStorage: storage, sessionStorage: storage,
    PortfolioDB: { getAllSnippets: function () { return Promise.resolve([]); }, getAllTherapistSettings: function () { return Promise.resolve([]); } },
    BroadcastChannel: function () { this.addEventListener = function () {}; this.postMessage = function () {}; this.close = function () {}; },
    CustomEvent: function (t, i) { this.type = t; this.detail = i && i.detail; },
    Event: function (t) { this.type = t; },
    console: { log: function () {}, warn: function () {}, error: function () {} },
    setTimeout: setTimeout, clearTimeout: clearTimeout, queueMicrotask: queueMicrotask,
    Promise: Promise, JSON: JSON, Math: Math, Date: Date, Array: Array, Object: Object, Set: Set, Map: Map, RegExp: RegExp, String: String, Number: Number, Boolean: Boolean, Intl: Intl,
  };
  sandbox.window.localStorage = storage;
  sandbox.window.I18N = { en: {}, he: {}, de: {}, cs: {} };
  sandbox.window.I18N_DEFAULT = 'en';
  vm.createContext(sandbox);

  // Load the engine FIRST if it exists (post-Plan-03). Absent today => RED.
  var dfPath = path.join(REPO_ROOT, 'assets', 'date-format.js');
  if (fs.existsSync(dfPath)) {
    vm.runInContext(fs.readFileSync(dfPath, 'utf8'), sandbox, { filename: 'assets/date-format.js' });
  }

  var src = fs.readFileSync(path.join(REPO_ROOT, 'assets', 'app.js'), 'utf8').replace(/^App\./gm, 'window.App.');
  vm.runInContext(src, sandbox, { filename: 'assets/app.js' });

  var App = sandbox.window.App;
  if (!App || typeof App.formatDate !== 'function' || typeof App.setLanguage !== 'function') {
    throw new Error('app.js did not expose App.formatDate / App.setLanguage');
  }
  return { App: App, DateFormat: sandbox.window.DateFormat };
}

var env = loadEngine();
var App = env.App;
// Re-read DateFormat lazily inside each test so a clear RED message is produced.
function DF() {
  assert(env.DateFormat, 'window.DateFormat is undefined — engine (assets/date-format.js) not implemented yet (expected RED before Plan 37-03)');
  return env.DateFormat;
}

console.log('Phase 37 date-format engine spec (TZ=' + process.env.TZ + ')\n');

// ── The falsifiable SPINE (D-20) ─────────────────────────────────────────────
// Pre-fix App.formatDate('2026-07-02') === 'Jul 1, 2026' (UTC-midnight shift in NY).
// Post-fix it MUST equal 'Jul 2, 2026'.
test('SPINE: App.formatDate("2026-07-02") === "Jul 2, 2026" (lang en) — NOT the UTC-shifted "Jul 1, 2026"', function () {
  App.setLanguage('en');
  var out = App.formatDate('2026-07-02');
  assert(out === 'Jul 2, 2026',
    'expected "Jul 2, 2026", got "' + out + '" (UTC-midnight off-by-one still present)');
});

test('SPINE unit: DateFormat.parseLocal("2026-07-02").getDate() === 2 (LOCAL, not UTC Jul 1)', function () {
  var d = DF().parseLocal('2026-07-02');
  assert(d instanceof Date, 'parseLocal did not return a Date');
  assert(d.getDate() === 2, 'expected getDate()===2, got ' + d.getDate());
});

// ── One assertion per D-05 format option (input '2026-07-02', lang en) ────────
var FORMAT_CASES = [
  ['auto', 'Jul 2, 2026'],
  ['month-day-year', 'Jul 2, 2026'],
  ['day-month-year', '2 Jul 2026'],
  ['mm/dd/yyyy', '07/02/2026'],
  ['dd/mm/yyyy', '02/07/2026'],
  ['yyyy-mm-dd', '2026-07-02'],
];
FORMAT_CASES.forEach(function (c) {
  var key = c[0], expected = c[1];
  test('format option "' + key + '" (en) === "' + expected + '"', function () {
    var out = DF().format('2026-07-02', key, 'en');
    assert(out === expected, 'expected "' + expected + '", got "' + out + '"');
  });
});

// ── D-06 separator rules ─────────────────────────────────────────────────────
test('D-06 separators: slash-formats use "/", yyyy-mm-dd uses "-"', function () {
  var d = DF();
  assert(d.format('2026-07-02', 'mm/dd/yyyy', 'en').indexOf('/') >= 0 && d.format('2026-07-02', 'mm/dd/yyyy', 'en').indexOf('-') === -1, 'mm/dd/yyyy must use slashes only');
  assert(d.format('2026-07-02', 'dd/mm/yyyy', 'en').indexOf('/') >= 0 && d.format('2026-07-02', 'dd/mm/yyyy', 'en').indexOf('-') === -1, 'dd/mm/yyyy must use slashes only');
  var iso = d.format('2026-07-02', 'yyyy-mm-dd', 'en');
  assert(iso.indexOf('-') >= 0 && iso.indexOf('/') === -1, 'yyyy-mm-dd must use dashes only');
});

// ── D-04/D-07 Hebrew numeric LTR isolate ─────────────────────────────────────
test('D-07 Hebrew numeric: format("2026-07-02","dd/mm/yyyy","he") is LTR-isolate-wrapped and LTR-ordered', function () {
  var out = DF().format('2026-07-02', 'dd/mm/yyyy', 'he');
  assert(out.indexOf(LRI) >= 0, 'missing U+2066 LEFT-TO-RIGHT ISOLATE');
  assert(out.indexOf(PDI) >= 0, 'missing U+2069 POP DIRECTIONAL ISOLATE');
  var stripped = out.replace(/[⁦⁩]/g, '');
  assert(stripped === '02/07/2026', 'isolate-stripped string must equal "02/07/2026", got "' + stripped + '"');
  assert(stripped.indexOf('02') < stripped.indexOf('2026'), 'LTR order not preserved — "02" must precede "2026" in "' + stripped + '"');
});

// ── DATE-06 month-boundary unit proof (countSessionsThisMonth bug) ───────────
test('DATE-06 boundary: parseLocal("2026-07-01").getMonth() === 6 (July, not June)', function () {
  var d = DF().parseLocal('2026-07-01');
  assert(d instanceof Date, 'parseLocal did not return a Date');
  assert(d.getMonth() === 6, 'expected month 6 (July), got ' + d.getMonth() + ' — UTC parse lands 2026-07-01 in June in NY');
});

// ── DATE-02 age-math proof (Jan-1 birthdate crosses the year in NY under UTC) ─
test('DATE-02 age math: parseLocal("2000-01-01") is year 2000 / month 0 / day 1 (not 1999-12-31)', function () {
  var d = DF().parseLocal('2000-01-01');
  assert(d instanceof Date, 'parseLocal did not return a Date');
  assert(d.getFullYear() === 2000, 'expected year 2000, got ' + d.getFullYear() + ' — UTC parse crosses to 1999 in NY');
  assert(d.getMonth() === 0, 'expected month 0 (Jan), got ' + d.getMonth());
  assert(d.getDate() === 1, 'expected day 1, got ' + d.getDate());
});

// ── DATE-06 input-default proof (local today, not UTC toISOString slice) ─────
test('DATE-06 input default: todayLocalISO() equals hand-composed LOCAL Y-M-D (not the UTC toISOString slice)', function () {
  var t = new Date();
  var expected = t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate());
  var got = DF().todayLocalISO();
  assert(got === expected, 'expected local "' + expected + '", got "' + got + '"');
});

console.log('');
console.log('Phase 37 date-format engine spec — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
