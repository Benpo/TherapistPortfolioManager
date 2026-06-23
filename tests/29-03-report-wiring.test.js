/**
 * Phase 29 Plan 03 — Behavior test for the OBS-02 wiring seams:
 *   - the Settings "Report a problem" entry row (settings.js)
 *   - the Phase 28 integrity-mismatch persistence into the OBS-01 crash log
 *     (shared-chrome.js maybeUpgradeFooterAndNudge → CrashLog.logError)
 *   - the version.js wedged-state report stub routing to report.html
 *
 * Zero-npm: handwritten DOM stub + `vm` sandbox (per 29-01 convention). Every
 * case asserts an observable effect (a built row's affordance target, a spy's
 * call count + payload tag, a navigation href), never symbol presence.
 *
 * Run: node tests/29-03-report-wiring.test.js  → exits 0 pass / 1 fail.
 *
 * Cases (Plan 03 Task 2 <verify>):
 *   1. SettingsPage.buildReportRow() produces a row whose label uses the
 *      report-entry i18n key and whose affordance targets report.html.
 *   2. shared-chrome maybeUpgradeFooterAndNudge, given a non-clean integrity
 *      state, calls CrashLog.logError ONCE with a source:'integrity' entry.
 *   3. version.js buildNudge('wedged') produces a report button whose onclick
 *      navigates to report.html (not an empty stub).
 *   4. the integrity-log call is feature-gated: when window.CrashLog is absent,
 *      maybeUpgradeFooterAndNudge does NOT throw.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ── Minimal DOM stub (shared with 29-03-report.test.js shape) ─────────────
function makeElement(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    children: [],
    attributes: {},
    style: {},
    dataset: {},
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); }, remove(c) { this._set.delete(c); },
      contains(c) { return this._set.has(c); },
      toggle(c, on) { if (on === undefined) { this._set.has(c) ? this._set.delete(c) : this._set.add(c); } else if (on) this._set.add(c); else this._set.delete(c); },
    },
    _value: '', _textContent: '', _onclick: null, hidden: false, href: '',
    get value() { return this._value; }, set value(v) { this._value = String(v); },
    get textContent() { return this._textContent; },
    set textContent(v) { this._textContent = String(v); this.children = []; },
    get onclick() { return this._onclick; }, set onclick(fn) { this._onclick = fn; },
    setAttribute(k, v) { this.attributes[k] = String(v); if (k === 'href') this.href = String(v); if (k === 'dir') this.dir = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; },
    removeAttribute(k) { delete this.attributes[k]; },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    append(...kids) { kids.forEach((k) => this.appendChild(k)); },
    prepend(c) { this.children.unshift(c); c.parentNode = this; return c; },
    querySelector(sel) { return this._find(sel); },
    querySelectorAll() { return []; },
    remove() { if (this.parentNode) { const i = this.parentNode.children.indexOf(this); if (i >= 0) this.parentNode.children.splice(i, 1); } },
    focus() {}, select() {}, addEventListener() {},
    _allText() { let t = this._textContent || ''; for (const c of this.children) t += '\n' + (c._allText ? c._allText() : ''); return t; },
    // crude descendant search for the wiring tests (by tag or [data-role])
    _find(sel) {
      const wantRole = sel && sel.indexOf('data-role=') !== -1 ? sel.replace(/.*data-role="?([^"\]]+)"?.*/, '$1') : null;
      const stack = [...this.children];
      while (stack.length) {
        const n = stack.shift();
        if (wantRole && n.attributes && n.attributes['data-role'] === wantRole) return n;
        if (!wantRole && sel && n.tagName === sel.toUpperCase()) return n;
        if (n.children) stack.push(...n.children);
      }
      return null;
    },
    // collect all descendants with an href (for the report-row affordance test)
    _allWithHref() {
      const out = [];
      const stack = [...this.children];
      while (stack.length) {
        const n = stack.shift();
        if (n.href || (n.attributes && n.attributes.href)) out.push(n);
        if (n.onclick) out.push(n);
        if (n.children) stack.push(...n.children);
      }
      return out;
    },
  };
  return el;
}

function makeDocument(registry) {
  return {
    _byId: registry,
    getElementById(id) { return registry[id] || null; },
    createElement(tag) { return makeElement(tag); },
    createElementNS(_ns, tag) { return makeElement(tag); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    body: makeElement('body'),
    addEventListener() {},
  };
}

let failures = 0;
function check(name, cond) {
  if (cond) console.log('  ok  - ' + name);
  else { console.error('  FAIL - ' + name); failures++; }
}

// ──────────────────────────────────────────────────────────────────────
// Case 1: SettingsPage.buildReportRow()
// ──────────────────────────────────────────────────────────────────────
function testSettingsRow() {
  const registry = { settingsReportSection: makeElement('div') };
  const doc = makeDocument(registry);
  const location = { href: '' };
  const win = {
    location,
    App: { t(key) { return key === 'settings.report.label' ? 'Report a problem' : key; }, confirmDialog() { return Promise.resolve(false); } },
    CrashLog: { clear() { return Promise.resolve(true); } },
    addEventListener() {}, document: doc,
  };
  const sandbox = {
    window: win, self: undefined, globalThis: undefined, document: doc, location,
    navigator: { userAgent: 't' },
    localStorage: { _m: new Map(), getItem(k) { return this._m.get(k) || null; }, setItem(k, v) { this._m.set(k, v); }, removeItem(k) { this._m.delete(k); } },
    console: { warn() {}, error() {}, log() {} },
    App: win.App, CrashLog: win.CrashLog, PortfolioDB: { getAllTherapistSettings() { return Promise.resolve([]); } },
    BroadcastChannel: function () { return { postMessage() {}, close() {}, addEventListener() {} }; },
    setTimeout, clearTimeout, queueMicrotask, Promise, JSON, Math, Date, Array, Object, Set, Map, String, Number, Boolean, Error,
  };
  sandbox.self = sandbox; sandbox.globalThis = sandbox; win.self = sandbox;
  vm.createContext(sandbox);

  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings.js'), 'utf8');
  vm.runInContext(src, sandbox, { filename: 'assets/settings.js' });

  const SP = sandbox.window.SettingsPage || sandbox.SettingsPage;
  assert.ok(SP && typeof SP.buildReportRow === 'function', 'settings.js must export SettingsPage.buildReportRow');

  const row = SP.buildReportRow();
  assert.ok(row, 'buildReportRow must return an element');

  const text = row._allText();
  check('1: report row shows the "Report a problem" label', text.indexOf('Report a problem') !== -1);

  // The affordance targets report.html (either an <a href> or an onclick that
  // sets location.href).
  const affordances = row._allWithHref();
  let targetsReport = false;
  for (const a of affordances) {
    const href = a.href || (a.attributes && a.attributes.href) || '';
    if (href.indexOf('report.html') !== -1) targetsReport = true;
    if (a.onclick) {
      try { a.onclick(); } catch (e) {}
      if (location.href.indexOf('report.html') !== -1) targetsReport = true;
    }
  }
  check('1: report row affordance targets report.html', targetsReport);
}

// ──────────────────────────────────────────────────────────────────────
// Cases 2 + 4: shared-chrome integrity-mismatch persistence (feature-gated)
// ──────────────────────────────────────────────────────────────────────
function bootSharedChrome(opts) {
  opts = opts || {};
  const doc = makeDocument({});
  const location = { href: '' };
  const logCalls = [];
  const crashLog = opts.noCrashLog ? undefined : {
    logError(entry) { logCalls.push(entry); return Promise.resolve(true); },
  };
  const win = {
    location,
    AppVersion: {
      APP_VERSION: '1.2.1',
      checkIntegrity() { return Promise.resolve(opts.state || 'wedged'); },
      footerMarkerForState(prev, state) { return prev || state !== 'clean'; },
      integStr(k) { return k; },
      buildNudge() { return null; },
    },
    addEventListener() {}, document: doc,
  };
  if (crashLog) win.CrashLog = crashLog;

  const sandbox = {
    window: win, self: undefined, globalThis: undefined, document: doc, location,
    navigator: { userAgent: 't', onLine: true },
    localStorage: { _m: new Map(), getItem(k) { return this._m.get(k) || null; }, setItem(k, v) { this._m.set(k, v); }, removeItem(k) { this._m.delete(k); } },
    console: { warn() {}, error() {}, log() {} },
    setTimeout, clearTimeout, queueMicrotask, Promise, JSON, Math, Date, Array, Object, Set, Map, String, Number, Boolean, Error,
  };
  if (crashLog) sandbox.CrashLog = crashLog;
  sandbox.self = sandbox; sandbox.globalThis = sandbox; win.self = sandbox;
  vm.createContext(sandbox);

  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'shared-chrome.js'), 'utf8');
  vm.runInContext(src, sandbox, { filename: 'assets/shared-chrome.js' });

  const SC = sandbox.window.SharedChrome || sandbox.SharedChrome;
  return { SC, logCalls, sandbox };
}

async function testIntegrityPersist() {
  const { SC, logCalls } = bootSharedChrome({ state: 'wedged' });
  assert.ok(SC && typeof SC.maybeUpgradeFooterAndNudge === 'function',
    'shared-chrome.js must export maybeUpgradeFooterAndNudge');

  SC.maybeUpgradeFooterAndNudge();
  // let checkIntegrity().then settle
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));

  check('2: integrity mismatch persisted exactly once via CrashLog.logError', logCalls.length === 1);
  const entry = logCalls[0] || {};
  check('2: persisted entry is tagged source:"integrity"', entry.source === 'integrity');
  check('2: persisted entry message names the mismatch state', /integrity|wedged|mismatch/i.test(String(entry.message || '')));
}

async function testFeatureGate() {
  // CrashLog ABSENT — must not throw.
  let threw = false;
  try {
    const { SC } = bootSharedChrome({ state: 'wedged', noCrashLog: true });
    SC.maybeUpgradeFooterAndNudge();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
  } catch (e) { threw = true; }
  check('4: integrity persistence is feature-gated (no throw when CrashLog absent)', threw === false);
}

// ──────────────────────────────────────────────────────────────────────
// Case 3: version.js buildNudge('wedged') report button navigates to report.html
// ──────────────────────────────────────────────────────────────────────
function testWedgedReportNav() {
  const bodyEl = makeElement('body');
  const registry = {};
  const doc = makeDocument(registry);
  doc.body = bodyEl;
  const location = { href: '' };
  const win = { location, addEventListener() {}, document: doc };
  const sandbox = {
    window: win, self: undefined, globalThis: undefined, document: doc, location,
    navigator: { userAgent: 't', onLine: true },
    localStorage: { _m: new Map([['portfolioLang', 'en']]), getItem(k) { return this._m.get(k) || null; }, setItem(k, v) { this._m.set(k, v); }, removeItem(k) { this._m.delete(k); } },
    console: { warn() {}, error() {}, log() {} },
    fetch() { throw new Error('no network'); },
    setTimeout, clearTimeout, queueMicrotask, Promise, JSON, Math, Date, Array, Object, Set, Map, String, Number, Boolean, Error,
  };
  sandbox.self = sandbox; sandbox.globalThis = sandbox; win.self = sandbox;
  vm.createContext(sandbox);

  const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'version.js'), 'utf8');
  vm.runInContext(src, sandbox, { filename: 'assets/version.js' });

  const AV = sandbox.window.AppVersion || sandbox.AppVersion;
  assert.ok(AV && typeof AV.buildNudge === 'function', 'version.js must export buildNudge');

  const nudge = AV.buildNudge('wedged');
  assert.ok(nudge, 'buildNudge(wedged) must return a node');

  // Find the report button (data-role="report").
  const reportBtn = nudge._find('[data-role="report"]');
  assert.ok(reportBtn, 'wedged nudge must include a report button');
  check('3: report button has a non-empty onclick', typeof reportBtn.onclick === 'function');

  location.href = '';
  try { reportBtn.onclick(); } catch (e) {}
  check('3: report button navigates to report.html', location.href.indexOf('report.html') !== -1);
}

async function run() {
  testSettingsRow();
  await testIntegrityPersist();
  await testFeatureGate();
  testWedgedReportNav();

  console.log('');
  if (failures > 0) { console.error('FAILED: ' + failures + ' assertion(s).'); process.exit(1); }
  console.log('PASSED: all report-wiring behavior cases.');
  process.exit(0);
}

run().catch((e) => { console.error('TEST CRASHED:', e); process.exit(1); });
