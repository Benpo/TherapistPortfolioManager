/**
 * Phase 29 Plan 03 — Behavior test for the OBS-02 "Report a problem" controller
 * (assets/report.js).
 *
 * Honors project memory `feedback-behavior-verification.md`: runtime-behavior
 * code requires a FALSIFIABLE behavior test written to FAIL before the
 * implementation exists and PASS after. Every case below asserts an OBSERVABLE
 * effect (textarea content, a clipboard write argument, a mailto URL, an
 * empty-state heading, a NOT-called network spy) — never the mere presence of
 * a symbol.
 *
 * Convention: this repo is zero-npm. We DO NOT use jsdom (which the plan
 * suggested) — instead we reuse the established handwritten DOM stub + `vm`
 * sandbox pattern (tests/29-01-crashlog-capture.test.js). This keeps the test
 * honoring the project's "zero dependencies, no build" constraint.
 *
 * Run: node tests/29-03-report.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * The 6 load-bearing behavior cases (Plan 03 Task 1 <verify>):
 *   1. with entries present, the preview textarea contains the assembled
 *      multi-line report including the diagnostic-context header AND the entries
 *   2. redaction removes a seeded client-identifying token before it reaches
 *      the textarea
 *   3. Copy report copies the CURRENT (possibly edited) textarea value, not a
 *      stale assembled string
 *   4. Open email to support sets location.href to a mailto: whose body does
 *      NOT contain the full log
 *   5. with zero entries the empty-state heading renders and no error textarea
 *      is shown
 *   6. no fetch / XMLHttpRequest is invoked anywhere in the report path
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// A minimal DOM stub — enough for report.js to query its elements,
// build/replace children, set values, and wire onclick handlers.
// ────────────────────────────────────────────────────────────────────

function makeElement(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    children: [],
    attributes: {},
    style: {},
    dataset: {},
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      contains(c) { return this._set.has(c); },
      toggle(c, on) { if (on === undefined) { this._set.has(c) ? this._set.delete(c) : this._set.add(c); } else if (on) { this._set.add(c); } else { this._set.delete(c); } },
    },
    _value: '',
    _textContent: '',
    _onclick: null,
    hidden: false,
    get value() { return this._value; },
    set value(v) { this._value = String(v); },
    get textContent() { return this._textContent; },
    set textContent(v) {
      this._textContent = String(v);
      this.children = []; // textContent replaces children (matches DOM)
    },
    get onclick() { return this._onclick; },
    set onclick(fn) { this._onclick = fn; },
    setAttribute(k, v) { this.attributes[k] = String(v); if (k === 'dir') this.dir = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; },
    removeAttribute(k) { delete this.attributes[k]; },
    appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
    append(...kids) { kids.forEach((k) => this.appendChild(k)); },
    prepend(child) { this.children.unshift(child); child.parentNode = this; return child; },
    remove() { if (this.parentNode) { const i = this.parentNode.children.indexOf(this); if (i >= 0) this.parentNode.children.splice(i, 1); } },
    focus() {},
    select() {},
    addEventListener() {},
    // Recursive text harvest so tests can assert on rendered copy regardless of
    // whether report.js used textContent on a child or built a tree.
    _allText() {
      let t = this._textContent || '';
      for (const c of this.children) t += '\n' + (c._allText ? c._allText() : '');
      return t;
    },
  };
  return el;
}

function makeDocument(registry) {
  const doc = {
    _byId: registry,
    getElementById(id) { return registry[id] || null; },
    createElement(tag) { return makeElement(tag); },
    querySelector() { return null; },
    body: makeElement('body'),
    addEventListener() {},
  };
  return doc;
}

// ────────────────────────────────────────────────────────────────────
// CrashLog stub — the report controller's data source.
// ────────────────────────────────────────────────────────────────────

function makeCrashLog(entries) {
  return {
    _cleared: false,
    getEntries() { return Promise.resolve(entries.slice()); },
    clear() { this._cleared = true; entries.length = 0; return Promise.resolve(true); },
    clStr(key) {
      const m = { emptyHeading: 'No problems logged', emptyBody: 'Nothing has gone wrong.' };
      return m[key] || key;
    },
    CRASHLOG_STRINGS: { en: { emptyHeading: 'No problems logged', emptyBody: 'Nothing has gone wrong.' } },
  };
}

// ────────────────────────────────────────────────────────────────────
// Clipboard spy — records the exact text writeText() was called with.
// ────────────────────────────────────────────────────────────────────

function makeClipboard() {
  const calls = [];
  return {
    calls,
    writeText(text) { calls.push(String(text)); return Promise.resolve(); },
  };
}

// ────────────────────────────────────────────────────────────────────
// Sandbox boot — load report.js into a shared global scope with the
// elements report.html is expected to provide.
// ────────────────────────────────────────────────────────────────────

let fetchCalls = 0;
let xhrCalls = 0;

// ────────────────────────────────────────────────────────────────────
// WR-01 — exercise the REAL db.js DB_VERSION export instead of a stub.
//
// `readDeclaredDbVersion` parses the `const DB_VERSION = N` literal at the top
// of assets/db.js (the source of truth). `assertDbExportsVersion` loads db.js
// in a throwaway sandbox and confirms the RETURNED PortfolioDB object actually
// EXPOSES DB_VERSION equal to that literal — this is the assertion that fails
// if the export is dropped again. `makeRealPortfolioDB` then hands report.js a
// PortfolioDB whose DB_VERSION is the verified-real value.
// ────────────────────────────────────────────────────────────────────
function readDeclaredDbVersion() {
  const dbSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'db.js'), 'utf8');
  const m = dbSrc.match(/const\s+DB_VERSION\s*=\s*(\d+)/);
  assert.ok(m, 'could not find `const DB_VERSION = N` in assets/db.js');
  return Number(m[1]);
}

function assertDbExportsVersion(declared) {
  // Load db.js in a minimal sandbox and read the EXPORTED value. This is the
  // real WR-01 regression guard: if db.js returns an object without
  // DB_VERSION, this throws and the test fails.
  const dbSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'db.js'), 'utf8');
  const sb = {
    window: { name: 'demo-mode' },
    indexedDB: { open() { return {}; }, databases() { return Promise.resolve([]); } },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    document: { getElementById() { return null; }, createElement() { return { style: {}, setAttribute() {}, append() {}, appendChild() {} }; }, body: { appendChild() {}, prepend() {} }, addEventListener() {} },
    navigator: { userAgent: 'test' },
    console: { error() {}, warn() {}, log() {} },
    setTimeout, clearTimeout, queueMicrotask,
    Promise, JSON, Math, Date, Array, Object, Set, Map, String, Number, Boolean, Error,
  };
  sb.self = sb; sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(dbSrc, sb, { filename: 'assets/db.js' });
  const exported = sb.window.PortfolioDB;
  assert.ok(exported && typeof exported === 'object', 'db.js must expose window.PortfolioDB');
  assert.ok(exported.DB_VERSION != null,
    'WR-01: db.js must EXPORT DB_VERSION on its PortfolioDB object (report.js reads it for the diagnostic header)');
  assert.strictEqual(Number(exported.DB_VERSION), declared,
    `WR-01: exported DB_VERSION (${exported.DB_VERSION}) must equal the declared const (${declared})`);
  return Number(exported.DB_VERSION);
}

function makeRealPortfolioDB(version) {
  // Hand report.js a PortfolioDB carrying the verified-real DB_VERSION.
  return { DB_VERSION: version };
}

// A realistic UA that contains capitalised multi-word tokens ("Intel Mac OS X",
// "Mac OS") — exactly the shape the name-redaction heuristic would clobber if
// the User-agent line were not preserved (WR-02).
const REALISTIC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function boot(entries, userAgentOverride) {
  fetchCalls = 0;
  xhrCalls = 0;

  // The DOM elements report.html provides. report.js looks them up by id.
  const registry = {
    reportPreview: makeElement('textarea'),
    reportEmptyState: makeElement('div'),
    reportEmptyHeading: makeElement('h2'),
    reportEmptyBody: makeElement('p'),
    reportCopyBtn: makeElement('button'),
    reportEmailBtn: makeElement('button'),
    reportIntro: makeElement('p'),
    reportSupportAddress: makeElement('a'),
    toast: makeElement('div'),
  };
  const doc = makeDocument(registry);
  const clipboard = makeClipboard();
  const crashLog = makeCrashLog(entries);

  const location = { href: '' };

  // WR-01: exercise the REAL db.js export, not a hardcoded stub. The previous
  // `PortfolioDB: { DB_VERSION: 6 }` stub made the diagnostic-header DB-version
  // assertion pass regardless of whether db.js actually exposed DB_VERSION —
  // a false-confidence test. We now read the version db.js declares at the top
  // of the file and assert the header reflects THAT, so the test fails if the
  // export is dropped again.
  const REAL_DB_VERSION = readDeclaredDbVersion();

  const win = {
    isSecureContext: true,
    location,
    addEventListener(type, fn) { if (type === 'DOMContentLoaded' || type === 'load') win._ready = fn; },
    _ready: null,
    CrashLog: crashLog,
    AppVersion: { APP_VERSION: '1.2.1' },
    // Mirror the export contract of db.js: report.js reads
    // window.PortfolioDB.DB_VERSION. We populate it from the REAL exported
    // value (see assertExportsDbVersion below) so the test breaks if db.js
    // stops exporting it.
    PortfolioDB: makeRealPortfolioDB(REAL_DB_VERSION),
    App: { t() { return ''; }, showToast() {} },
  };

  const sandbox = {
    window: win,
    self: undefined,
    globalThis: undefined,
    document: doc,
    location,
    navigator: {
      userAgent: userAgentOverride || REALISTIC_UA,
      clipboard,
    },
    localStorage: {
      _m: new Map([['portfolioLang', 'en']]),
      getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
      setItem(k, v) { this._m.set(k, String(v)); },
      removeItem(k) { this._m.delete(k); },
    },
    CrashLog: crashLog,
    AppVersion: win.AppVersion,
    PortfolioDB: win.PortfolioDB,
    App: win.App,
    console: { error() {}, warn() {}, log() {} },
    fetch() { fetchCalls++; throw new Error('network call (fetch) is forbidden'); },
    XMLHttpRequest: function () { xhrCalls++; throw new Error('network call (XHR) is forbidden'); },
    setTimeout, clearTimeout, queueMicrotask,
    encodeURIComponent,
    Promise, JSON, Math, Date, Array, Object, Set, Map, String, Number, Boolean, Error,
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  win.self = sandbox;
  win.document = doc;
  vm.createContext(sandbox);

  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'report.js'), 'utf8');
  vm.runInContext(src, sandbox, { filename: 'assets/report.js' });

  return { sandbox, registry, clipboard, crashLog, location, win };
}

// Drive the controller's init + let microtasks settle.
async function init(ctx) {
  const Report = ctx.sandbox.Report || ctx.win.Report;
  assert.ok(Report && typeof Report.init === 'function', 'report.js must export Report.init');
  await Report.init();
  // settle any pending promise chains (getEntries -> render)
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  return Report;
}

// ────────────────────────────────────────────────────────────────────
// Test cases
// ────────────────────────────────────────────────────────────────────

let failures = 0;
function check(name, cond) {
  if (cond) { console.log('  ok  - ' + name); }
  else { console.error('  FAIL - ' + name); failures++; }
}

async function run() {
  // ── WR-01 regression guard (runs first): db.js must EXPORT DB_VERSION ──────
  const declaredDbVersion = readDeclaredDbVersion();
  let exportedDbVersion;
  try {
    exportedDbVersion = assertDbExportsVersion(declaredDbVersion);
    check('WR-01: db.js exports a real DB_VERSION matching its declared const', true);
  } catch (e) {
    check('WR-01: db.js exports a real DB_VERSION matching its declared const (' + e.message + ')', false);
    exportedDbVersion = declaredDbVersion; // continue so other cases still report
  }

  // ── Case 1 + 2 + 6: entries present → assembled, redacted preview; no network
  {
    const entries = [
      { timestamp: Date.now(), message: 'TypeError: boom for client Yael Cohen', stack: 'at foo (app.js:1)\nclient Yael Cohen', url: 'https://app/x', source: 'onerror' },
      { timestamp: Date.now() - 1000, message: 'second distinct failure marker ZZZ', stack: 'at bar', url: 'https://app/y', source: 'unhandledrejection' },
    ];
    const ctx = boot(entries);
    await init(ctx);

    const preview = ctx.registry.reportPreview;
    const text = preview.value;

    // 1: diagnostic-context header present
    check('1: preview contains app version diagnostic context', text.indexOf('1.2.1') !== -1);
    // WR-01: the header must show the REAL exported DB version, not "unknown"
    // and not a test stub. We assert the actual exported value is in the header
    // and that the literal "unknown" does not appear on the DB version line.
    check('1: preview contains a DB version field with the real exported version',
      /DB version:\s*/i.test(text) && text.indexOf('DB version: ' + exportedDbVersion) !== -1);
    check('1: DB version is not reported as "unknown"',
      text.indexOf('DB version: unknown') === -1);
    // 1: the entries are present
    check('1: preview contains the first entry message', text.indexOf('boom') !== -1);
    check('1: preview contains the second entry marker', text.indexOf('second distinct failure marker ZZZ') !== -1);

    // WR-02: the User-agent diagnostic line must retain its REAL value after
    // redaction — the name heuristic must not clobber "Intel Mac OS X" etc.
    check('WR-02: User-agent line retains the real UA value (not [redacted-name])',
      /User agent: Mozilla\/5\.0 \(Macintosh; Intel Mac OS X/.test(text));
    check('WR-02: User-agent value is not redacted away',
      text.indexOf('User agent: [redacted-name]') === -1);

    // 2: redaction scrubbed an obvious client-identifying token. We seed a
    //    high-signal token and require it NOT to survive verbatim into the
    //    textarea. (The redactor is a best-effort floor; this asserts it runs.)
    //    "Yael Cohen" is a two-word capitalized name embedded in a message.
    check('2: seeded client name is redacted from the preview', text.indexOf('Yael Cohen') === -1);

    // 6: no network at any point
    check('6: no fetch was called during assembly', fetchCalls === 0);
    check('6: no XHR was called during assembly', xhrCalls === 0);
  }

  // ── Case 3: Copy report copies the CURRENT textarea value (after user edit)
  {
    const entries = [
      { timestamp: Date.now(), message: 'original assembled line', stack: '', url: '', source: 'onerror' },
    ];
    const ctx = boot(entries);
    const Report = await init(ctx);

    const preview = ctx.registry.reportPreview;
    // User edits the textarea.
    preview.value = 'USER EDITED CONTENT — only this should be copied';

    // Fire the Copy button.
    const copyBtn = ctx.registry.reportCopyBtn;
    assert.ok(typeof copyBtn.onclick === 'function', 'Copy button must have an onclick');
    await copyBtn.onclick();
    await new Promise((r) => setTimeout(r, 0));

    const copied = ctx.clipboard.calls[ctx.clipboard.calls.length - 1];
    check('3: clipboard received exactly the edited textarea value', copied === 'USER EDITED CONTENT — only this should be copied');
    check('3: stale assembled string was NOT copied', (copied || '').indexOf('original assembled line') === -1);
  }

  // ── Case 4: Open email → mailto whose body does NOT contain the full log
  {
    const longEntry = 'EXTREMELY_LONG_LOG_BODY_TOKEN ' + 'x'.repeat(500);
    const entries = [
      { timestamp: Date.now(), message: longEntry, stack: longEntry, url: '', source: 'onerror' },
    ];
    const ctx = boot(entries);
    await init(ctx);

    const emailBtn = ctx.registry.reportEmailBtn;
    if (typeof emailBtn.onclick === 'function') {
      await emailBtn.onclick();
      await new Promise((r) => setTimeout(r, 0));

      const href = ctx.location.href;
      check('4: email handoff sets a mailto: to the support address', href.indexOf('mailto:') === 0 && href.indexOf('contact@sessionsgarden.app') !== -1);
      check('4: mailto body does NOT carry the full log', href.indexOf('EXTREMELY_LONG_LOG_BODY_TOKEN') === -1);
      check('4: mailto carries a subject', /[?&]subject=/.test(href));
    } else {
      // D-06 degradation path: copy-only + the support address must be VISIBLE.
      const addr = ctx.registry.reportSupportAddress;
      check('4: degraded mode shows the visible support address', (addr._allText() || addr.value || '').indexOf('contact@sessionsgarden.app') !== -1);
    }
  }

  // ── Case 5: empty log → empty-state heading, no error textarea
  {
    const ctx = boot([]);
    await init(ctx);

    const empty = ctx.registry.reportEmptyState;
    const heading = ctx.registry.reportEmptyHeading;
    const preview = ctx.registry.reportPreview;

    const headingText = heading._allText() + (heading.value || '');
    check('5: empty-state heading renders the no-problems copy', /No problems logged/i.test(headingText) || /No problems logged/i.test(empty._allText()));
    check('5: empty state is not hidden when log is empty', empty.hidden === false);
    check('5: the error preview textarea is hidden / not populated with errors', preview.hidden === true || preview.value === '');
  }

  // ── Case 7 (UAT 2026-06-26): the redacted preview must be CLIPBOARD-SAFE —
  //    no NUL or other C0 control characters. A NUL silently truncates the
  //    paste on NUL-terminated native clipboards (Safari): "Copy report"
  //    delivered only the header up to the first NUL, dropping the User-agent
  //    line, the count, and every entry. Root cause: redactReport's UA
  //    placeholder was wrapped in NUL bytes ('\0UA_PLACEHOLDER\0') while the
  //    re-stitch regex matched spaces (/ ?UA_PLACEHOLDER ?/), so the NULs
  //    straddling the "User agent:" line survived. Guards full-report copy.
  {
    const entries = [
      { timestamp: Date.now(), message: 'cascade A', stack: '', url: 'https://app/a', source: 'direct-seam' },
      { timestamp: Date.now(), message: 'cascade B', stack: '@', url: 'https://app/b', source: 'unhandledrejection' },
      { timestamp: Date.now(), message: 'cascade C tail-token-zzz9', stack: '@', url: 'https://app/c', source: 'onerror' },
    ];
    const ctx = boot(entries);
    await init(ctx);
    const text = ctx.registry.reportPreview.value;
    const NUL = String.fromCharCode(0);

    // No NUL anywhere in the copied text.
    check('7: redacted preview contains no NUL byte (clipboard-safe)', text.indexOf(NUL) === -1);

    // No other C0 control / line-separator chars (allow \n and \t).
    let badCtrl = -1;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if ((c < 32 && c !== 10 && c !== 9) || c === 0x2028 || c === 0x2029) { badCtrl = c; break; }
    }
    check('7: redacted preview contains no C0/line-separator control chars', badCtrl === -1);

    // The "User agent:" line starts cleanly right after a newline — no stray
    // delimiter (NUL/space) wedged in by the placeholder re-stitch.
    check('7: "User agent:" line starts cleanly after a newline (no stray delimiter)',
      /\nUser agent: Mozilla\/5\.0/.test(text));

    // Faithful model of the Safari clipboard: a NUL-terminated native clipboard
    // cuts at the FIRST NUL. Whatever survives that cut must still contain the
    // whole report (last entry + the problem count).
    const firstNul = text.indexOf(NUL);
    const clipboardSurvives = firstNul === -1 ? text : text.slice(0, firstNul);
    check('7: a NUL-terminated copy still carries the last entry and the count',
      clipboardSurvives.indexOf('cascade C tail-token-zzz9') !== -1 &&
      clipboardSurvives.indexOf('Logged problems: 3') !== -1);
  }

  console.log('');
  if (failures > 0) {
    console.error('FAILED: ' + failures + ' assertion(s) failed.');
    process.exit(1);
  }
  console.log('PASSED: all report.js behavior cases.');
  process.exit(0);
}

run().catch((e) => { console.error('TEST CRASHED:', e); process.exit(1); });
