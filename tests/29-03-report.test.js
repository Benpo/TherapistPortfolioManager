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

function boot(entries) {
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

  const win = {
    isSecureContext: true,
    location,
    addEventListener(type, fn) { if (type === 'DOMContentLoaded' || type === 'load') win._ready = fn; },
    _ready: null,
    CrashLog: crashLog,
    AppVersion: { APP_VERSION: '1.2.1' },
    PortfolioDB: { DB_VERSION: 6 },
    App: { t() { return ''; }, showToast() {} },
  };

  const sandbox = {
    window: win,
    self: undefined,
    globalThis: undefined,
    document: doc,
    location,
    navigator: {
      userAgent: 'test-agent/1.0',
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
    check('1: preview contains a DB version field', /DB|database/i.test(text) && text.indexOf('6') !== -1);
    // 1: the entries are present
    check('1: preview contains the first entry message', text.indexOf('boom') !== -1);
    check('1: preview contains the second entry marker', text.indexOf('second distinct failure marker ZZZ') !== -1);

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

  console.log('');
  if (failures > 0) {
    console.error('FAILED: ' + failures + ' assertion(s) failed.');
    process.exit(1);
  }
  console.log('PASSED: all report.js behavior cases.');
  process.exit(0);
}

run().catch((e) => { console.error('TEST CRASHED:', e); process.exit(1); });
