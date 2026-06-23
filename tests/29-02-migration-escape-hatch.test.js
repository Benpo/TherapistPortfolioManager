/**
 * Phase 29 Plan 02 — Task 2 behavior test: the migration-failure escape hatch.
 *
 * OBS-03: replace the dead-end "Refresh page → location.reload()" of
 * showDBMigrationError() (which re-runs the failing migration forever) with a
 * recover path: an "Export backup now" action + a hard-gated "Reset & recover"
 * (affirmation checkbox + danger double-confirm, extra-emphatic when no export
 * happened this session) that wipes the DB and reloads into a fresh one.
 *
 * Honors `feedback-behavior-verification.md`: every case asserts an observable
 * effect (a rendered control, a disabled→enabled toggle, a confirmDialog tone,
 * a deleteDatabase spy, a dir attribute), never the mere presence of a symbol.
 * Written to FAIL before the rewrite (RED) and PASS after (GREEN).
 *
 * Zero-npm: no jsdom. A minimal hand-rolled DOM stub (element tree + events +
 * disabled toggling) drives showDBMigrationError the way a browser would.
 *
 * Run: node tests/29-02-migration-escape-hatch.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * Load-bearing cases (Plan 02 Task 2 <verify>/<done>):
 *   1. showDBMigrationError(err) renders an Export control, an affirmation
 *      checkbox, and a Reset & recover button (no bare Refresh).
 *   2. the Reset button is disabled initially and becomes enabled only after
 *      the checkbox is checked (change event).
 *   3. clicking Reset (while checked) invokes App.confirmDialog tone 'danger'
 *      and, on confirm, calls indexedDB.deleteDatabase(DB_NAME).
 *   4. when NO export happened this session → extra-emphatic confirm title key;
 *      after a successful export → the standard title key.
 *   5. the banner sets dir='rtl' when portfolioLang='he'.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Minimal DOM stub: element tree, attributes, classList, events, onclick,
// checked/disabled, append/prepend, getElementById lookup.
// ────────────────────────────────────────────────────────────────────

function makeDOM() {
  const byId = new Map();

  function makeEl(tag) {
    const listeners = {};
    const el = {
      tagName: String(tag).toUpperCase(),
      children: [],
      attributes: {},
      _text: '',
      className: '',
      _id: '',
      type: '',
      checked: false,
      disabled: false,
      dir: '',
      onclick: null,
      onchange: null,
      style: {},
      classList: {
        _set: new Set(),
        add(c) { this._set.add(c); },
        remove(c) { this._set.delete(c); },
        contains(c) { return this._set.has(c); },
      },
      get id() { return this._id; },
      set id(v) { this._id = v; if (v) byId.set(v, el); },
      get textContent() { return el._text; },
      set textContent(v) { el._text = String(v); },
      setAttribute(k, v) {
        el.attributes[k] = String(v);
        if (k === 'id') { el._id = String(v); byId.set(String(v), el); }
        if (k === 'type') el.type = String(v);
      },
      getAttribute(k) { return el.attributes[k]; },
      addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
      append(...kids) { kids.forEach((k) => el.children.push(k)); },
      prepend(...kids) { el.children.unshift(...kids); },
      appendChild(k) { el.children.push(k); return k; },
      removeChild(k) {
        const i = el.children.indexOf(k);
        if (i >= 0) el.children.splice(i, 1);
        return k;
      },
      // Test helpers:
      _dispatch(type, evt) {
        if (type === 'click' && typeof el.onclick === 'function') el.onclick(evt || {});
        if (type === 'change' && typeof el.onchange === 'function') el.onchange(evt || {});
        (listeners[type] || []).forEach((fn) => fn(evt || {}));
      },
      _find(pred) {
        if (pred(el)) return el;
        for (const c of el.children) {
          if (c && typeof c._find === 'function') {
            const hit = c._find(pred);
            if (hit) return hit;
          }
        }
        return null;
      },
      _findAll(pred, acc) {
        acc = acc || [];
        if (pred(el)) acc.push(el);
        for (const c of el.children) {
          if (c && typeof c._findAll === 'function') c._findAll(pred, acc);
        }
        return acc;
      },
    };
    return el;
  }

  const body = makeEl('body');
  const document = {
    createElement: (tag) => makeEl(tag),
    getElementById: (id) => byId.get(id) || null,
    body,
    addEventListener() {},
  };
  return { document, body };
}

function makeLocalStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
    setItem: (k, v) => { map.set(String(k), String(v)); },
    removeItem: (k) => { map.delete(String(k)); },
  };
}

// ────────────────────────────────────────────────────────────────────
// Sandbox boot — load db.js with stubbed App.confirmDialog + BackupManager +
// indexedDB.deleteDatabase spies. We DON'T need a working IDB here; we only
// exercise the banner DOM + the gated reset wiring.
// ────────────────────────────────────────────────────────────────────

function boot(lang) {
  const dom = makeDOM();
  const localStorage = makeLocalStorage({ portfolioLang: lang || 'en' });

  const spies = {
    confirmCalls: [],
    deleteDatabaseCalls: [],
    exportCalls: 0,
    reloadCalls: 0,
    // Controls what confirmDialog resolves to (true=confirm, false=cancel).
    confirmResolves: true,
    // Controls what exportRecoveryBackup resolves to.
    exportResult: { ok: true, skip: true, cancelled: false, blob: { size: 10 } },
  };

  const indexedDB = {
    deleteDatabase(name) {
      spies.deleteDatabaseCalls.push(name);
      const req = {};
      queueMicrotask(() => { if (req.onsuccess) req.onsuccess({ target: req }); });
      return req;
    },
    open() {
      // Minimal: db.js defines openDB but the escape-hatch path must NOT use it.
      const req = {};
      queueMicrotask(() => { if (req.onerror) req.onerror({ target: req }); });
      return req;
    },
    databases() { return Promise.resolve([]); },
  };

  const win = {};
  const location = { href: '', reload() { spies.reloadCalls++; } };

  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, queueMicrotask,
    Promise, JSON, Math, Date, Array, Object, Set, Map, String, Number, Boolean, Error,
    indexedDB,
    IDBKeyRange: { only: (v) => ({ _only: v }) },
    localStorage,
    document: dom.document,
    navigator: { onLine: true, userAgent: 'test' },
    location,
    window: win,
  };
  sandbox.window = win;
  win.PortfolioDB = undefined; // set after db.js loads
  win.localStorage = localStorage;
  win.location = location;
  win.indexedDB = indexedDB;
  win.name = 'demo-mode';
  // App.confirmDialog spy — records its argument; resolves per spies.confirmResolves.
  win.App = {
    confirmDialog(opts) {
      spies.confirmCalls.push(opts);
      return Promise.resolve(spies.confirmResolves);
    },
  };
  // BackupManager.exportRecoveryBackup spy.
  win.BackupManager = {
    exportRecoveryBackup() {
      spies.exportCalls++;
      return Promise.resolve(spies.exportResult);
    },
  };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const dbSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'db.js'), 'utf8');
  vm.runInContext(dbSrc, sandbox, { filename: 'assets/db.js' });

  return { sandbox, dom, localStorage, spies, indexedDB, location };
}

// db.js demo mode → DB_NAME is 'demo_portfolio'
const DB_NAME = 'demo_portfolio';

// showDBMigrationError is module-private inside the PortfolioDB IIFE. It is
// reached in production via openDB()'s onupgradeneeded catch. To exercise it
// directly we need a seam. db.js must expose it on the returned API (or via a
// test-only hook). We assert it is reachable; if not, the test fails loudly
// pointing the implementer at the requirement.
function getShowMigrationError(env) {
  const DB = env.sandbox.window.PortfolioDB;
  if (DB && typeof DB._showDBMigrationError === 'function') return DB._showDBMigrationError;
  return null;
}

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err && err.stack || err.message}`); failed++; }
}

function findExportBtn(banner) {
  return banner._find((el) => el.tagName === 'BUTTON' && el.attributes['data-role'] === 'export');
}
function findResetBtn(banner) {
  return banner._find((el) => el.tagName === 'BUTTON' && el.attributes['data-role'] === 'reset');
}
function findCheckbox(banner) {
  return banner._find((el) => el.type === 'checkbox' || (el.tagName === 'INPUT' && el.attributes['type'] === 'checkbox'));
}

(async () => {
  const env0 = boot('en');
  const show = getShowMigrationError(env0);
  if (!show) {
    console.error('FAIL: PortfolioDB._showDBMigrationError is not exposed by db.js.');
    console.error('      Task 2 must expose the rewritten banner builder as a test seam');
    console.error('      (e.g. add `_showDBMigrationError: showDBMigrationError` to the returned API).');
    process.exit(1);
  }

  // ─── 1. banner renders the three controls (no bare Refresh) ─────────
  await test('1. showDBMigrationError renders Export + affirmation checkbox + Reset & recover', async () => {
    const env = boot('en');
    const showFn = getShowMigrationError(env);
    showFn(new Error('migration boom'));
    const banner = env.dom.document.getElementById('dbMigrationErrorBanner');
    assert.ok(banner, 'a #dbMigrationErrorBanner must be rendered');
    assert.ok(findExportBtn(banner), 'an Export backup now button (data-role="export") must be present');
    assert.ok(findCheckbox(banner), 'an affirmation checkbox must be present');
    assert.ok(findResetBtn(banner), 'a Reset & recover button (data-role="reset") must be present');
    // No bare standalone reload-only button as the ONLY action.
    const allBtns = banner._findAll((el) => el.tagName === 'BUTTON');
    assert.ok(allBtns.length >= 2, 'the banner must offer multiple actions, not a single Refresh dead-end');
  });

  // ─── 2. reset disabled until checkbox checked ───────────────────────
  await test('2. Reset is disabled initially and enabled only after the checkbox is checked', async () => {
    const env = boot('en');
    const showFn = getShowMigrationError(env);
    showFn(new Error('boom'));
    const banner = env.dom.document.getElementById('dbMigrationErrorBanner');
    const reset = findResetBtn(banner);
    const cb = findCheckbox(banner);
    assert.strictEqual(reset.disabled, true, 'Reset must START disabled');
    cb.checked = true;
    cb._dispatch('change', { target: cb });
    assert.strictEqual(reset.disabled, false, 'Reset must become enabled after the checkbox is checked');
    cb.checked = false;
    cb._dispatch('change', { target: cb });
    assert.strictEqual(reset.disabled, true, 'Reset must disable again if the checkbox is unchecked');
  });

  // ─── 3. reset → danger confirm → deleteDatabase ─────────────────────
  await test('3. clicking Reset (checked) invokes confirmDialog tone danger and, on confirm, deletes the DB', async () => {
    const env = boot('en');
    const showFn = getShowMigrationError(env);
    showFn(new Error('boom'));
    const banner = env.dom.document.getElementById('dbMigrationErrorBanner');
    const reset = findResetBtn(banner);
    const cb = findCheckbox(banner);
    // Disabled guard: clicking while disabled must NOT confirm or delete.
    reset._dispatch('click', {});
    await new Promise((r) => setTimeout(r, 10));
    assert.strictEqual(env.spies.confirmCalls.length, 0, 'a disabled Reset must not open the confirm dialog');
    // Now check + click + confirm.
    cb.checked = true;
    cb._dispatch('change', { target: cb });
    env.spies.confirmResolves = true;
    reset._dispatch('click', {});
    await new Promise((r) => setTimeout(r, 20));
    assert.strictEqual(env.spies.confirmCalls.length, 1, 'Reset must open exactly one confirm dialog');
    assert.strictEqual(env.spies.confirmCalls[0].tone, 'danger', 'the confirm must be tone:danger');
    assert.deepStrictEqual(env.spies.deleteDatabaseCalls, [DB_NAME],
      'on confirm, indexedDB.deleteDatabase(DB_NAME) must be called exactly once');
  });

  // ─── 3b. cancelling the confirm does NOT delete ─────────────────────
  await test('3b. cancelling the danger confirm does NOT delete the database', async () => {
    const env = boot('en');
    const showFn = getShowMigrationError(env);
    showFn(new Error('boom'));
    const banner = env.dom.document.getElementById('dbMigrationErrorBanner');
    const reset = findResetBtn(banner);
    const cb = findCheckbox(banner);
    cb.checked = true; cb._dispatch('change', { target: cb });
    env.spies.confirmResolves = false; // user cancels
    reset._dispatch('click', {});
    await new Promise((r) => setTimeout(r, 20));
    assert.strictEqual(env.spies.confirmCalls.length, 1, 'the confirm dialog still opens');
    assert.strictEqual(env.spies.deleteDatabaseCalls.length, 0,
      'cancelling must NEVER call deleteDatabase (no silent wipe)');
  });

  // ─── 4. extra-emphatic confirm when no session export ───────────────
  await test('4. confirm title is extra-emphatic with no session export; standard after a successful export', async () => {
    // 4a — no export this session → extra-emphatic title key.
    const env = boot('en');
    const showFn = getShowMigrationError(env);
    showFn(new Error('boom'));
    let banner = env.dom.document.getElementById('dbMigrationErrorBanner');
    let cb = findCheckbox(banner);
    cb.checked = true; cb._dispatch('change', { target: cb });
    findResetBtn(banner)._dispatch('click', {});
    await new Promise((r) => setTimeout(r, 20));
    const noExportTitle = env.spies.confirmCalls[0].titleKey;

    // 4b — after a successful export → standard title key (different).
    const env2 = boot('en');
    const showFn2 = getShowMigrationError(env2);
    showFn2(new Error('boom'));
    banner = env2.dom.document.getElementById('dbMigrationErrorBanner');
    // Trigger an export first (sets the in-session flag).
    env2.spies.exportResult = { ok: true, skip: true, cancelled: false, blob: { size: 10 } };
    findExportBtn(banner)._dispatch('click', {});
    await new Promise((r) => setTimeout(r, 20));
    cb = findCheckbox(banner);
    cb.checked = true; cb._dispatch('change', { target: cb });
    findResetBtn(banner)._dispatch('click', {});
    await new Promise((r) => setTimeout(r, 20));
    const afterExportTitle = env2.spies.confirmCalls[0].titleKey;

    assert.ok(noExportTitle, 'no-export confirm must carry a titleKey');
    assert.ok(afterExportTitle, 'post-export confirm must carry a titleKey');
    assert.notStrictEqual(noExportTitle, afterExportTitle,
      'the no-export confirm must use a DIFFERENT (extra-emphatic) title key than the post-export confirm');
  });

  // ─── 5. RTL dir for Hebrew ──────────────────────────────────────────
  await test('5. the banner sets dir=rtl when portfolioLang=he', async () => {
    const env = boot('he');
    const showFn = getShowMigrationError(env);
    showFn(new Error('boom'));
    const banner = env.dom.document.getElementById('dbMigrationErrorBanner');
    assert.strictEqual(banner.dir, 'rtl', 'Hebrew banner must set dir=rtl defensively');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
