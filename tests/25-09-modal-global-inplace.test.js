/**
 * Phase 25 round-5 post-UAT — Change 1 (UAT-D2): the Backup & Restore
 * modal must ship on EVERY app page and open IN-PLACE wherever the user
 * clicks the header cloud icon — never bounce to index.html first.
 *
 * Root cause (pre-fix): the modal markup + window.openBackupModal lived
 * only in index.html / overview.js. On settings.html / add-client.html /
 * add-session.html the cloud-icon click handler (app.js ~line 475) found
 * no window.openBackupModal and did `window.location.href =
 * './index.html?openBackup=1'` — a NAVIGATION, not an in-place open.
 *
 * Fix: assets/backup-modal.js owns the modal markup (injected into
 * <body> if #backupModal is absent) + all modal handlers + defines
 * window.openBackupModal. It is loaded on every app page.
 *
 * Behavior asserted (vm-sandbox, no jsdom — same pattern as
 * tests/25-09-schedule-debounce-no-modal.test.js / 25-11-toast-behavior):
 *
 *   A. After backup-modal.js runs on a page with NO #backupModal in the
 *      DOM, the markup is injected: a #backupModal node exists.
 *   B. window.openBackupModal is a function after backup-modal.js loads.
 *   C. Clicking #backupCloudBtn (app.js handler) when window.openBackupModal
 *      is available does NOT mutate window.location (no navigation).
 *   D. When #backupModal markup is ALREADY present (index.html static
 *      markup), backup-modal.js does NOT inject a duplicate.
 *
 * MUST FAIL before the fix:
 *   - assets/backup-modal.js does not exist (require/read throws) → all fail.
 *
 * Run: node tests/25-09-modal-global-inplace.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ── Minimal DOM stub with a real element tree (enough for inject + query) ──
function makeDom(opts) {
  opts = opts || {};
  const docListeners = new Map();

  function makeEl(tag) {
    const el = {
      tagName: (tag || 'div').toUpperCase(),
      _children: [],
      _attrs: new Map(),
      _id: '',
      _html: '',
      _listeners: new Map(),
      classList: {
        _s: new Set(),
        add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
        contains(c) { return this._s.has(c); }, toggle() {},
      },
      style: {},
      get id() { return this._id; },
      set id(v) { this._id = v; },
      get innerHTML() { return this._html; },
      set innerHTML(v) {
        this._html = String(v);
        // Parse the ids declared in the markup so getElementById works
        // after inject. The first id-bearing top-level element is the
        // injected modal (id="backupModal"); model it as a child node.
        const ids = [];
        const re = /id="([^"]+)"/g;
        let m;
        while ((m = re.exec(this._html)) !== null) ids.push(m[1]);
        this._parsedIds = ids;
        // Synthesize the root node so .firstElementChild works (browser
        // parity: setting innerHTML builds a child tree).
        this._children = [];
        if (/<div id="backupModal"/.test(this._html)) {
          const root = makeEl('div');
          root.id = 'backupModal';
          root._parsedIds = ids;
          // classList from the markup so closeBackupModal / openBackupModal
          // .classList.remove('is-hidden') has something to act on.
          root.classList.add('is-hidden');
          this._children.push(root);
        }
      },
      get firstElementChild() { return this._children[0] || null; },
      get firstChild() { return this._children[0] || null; },
      setAttribute(k, v) { this._attrs.set(k, String(v)); if (k === 'id') this._id = String(v); },
      getAttribute(k) { return this._attrs.has(k) ? this._attrs.get(k) : null; },
      removeAttribute(k) { this._attrs.delete(k); },
      hasAttribute(k) { return this._attrs.has(k); },
      addEventListener(t, fn) { if (!this._listeners.has(t)) this._listeners.set(t, []); this._listeners.get(t).push(fn); },
      removeEventListener() {},
      appendChild(c) { this._children.push(c); c._parent = el; return c; },
      prepend(c) { this._children.unshift(c); c._parent = el; return c; },
      insertBefore(c) { this._children.unshift(c); return c; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      focus() {}, blur() {},
      contains() { return false; },
    };
    return el;
  }

  const body = makeEl('body');
  const head = makeEl('head');
  const html = makeEl('html');

  // Registry of explicitly-created id'd nodes (cloud button, optional
  // pre-existing modal).
  const registry = new Map();

  if (opts.preexistingModal) {
    const modal = makeEl('div');
    modal.id = 'backupModal';
    registry.set('backupModal', modal);
    body.appendChild(modal);
  }

  const document = {
    body, head, documentElement: html,
    readyState: 'loading',
    addEventListener(t, fn) { if (!docListeners.has(t)) docListeners.set(t, []); docListeners.get(t).push(fn); },
    removeEventListener() {},
    getElementById(id) {
      if (registry.has(id)) return registry.get(id);
      // Search injected body children for a node whose innerHTML declared id.
      for (const child of body._children) {
        if (child._id === id) return child;
        if (child._parsedIds && child._parsedIds.indexOf(id) !== -1) {
          // Return a lightweight stand-in element for inner ids.
          if (!registry.has(id)) {
            const n = makeEl('div'); n.id = id; registry.set(id, n);
          }
          return registry.get(id);
        }
      }
      return null;
    },
    querySelector(sel) {
      if (sel === '#backupModal') return document.getElementById('backupModal');
      return null;
    },
    querySelectorAll() { return []; },
    createElement(tag) { return makeEl(tag); },
    _fireReady() {
      document.readyState = 'complete';
      const arr = docListeners.get('DOMContentLoaded') || [];
      for (let i = 0; i < arr.length; i++) try { arr[i]({}); } catch (e) { /* surface below */ throw e; }
    },
  };

  return { document, body, registry, makeEl };
}

function makeSandbox(opts) {
  opts = opts || {};
  const dom = makeDom(opts);

  const storage = (() => {
    const m = new Map();
    return {
      getItem(k) { return m.has(k) ? m.get(k) : null; },
      setItem(k, v) { m.set(k, String(v)); },
      removeItem(k) { m.delete(k); }, clear() { m.clear(); },
    };
  })();

  const location = { pathname: opts.pathname || '/settings.html', search: '', hash: '', href: 'https://example.test' + (opts.pathname || '/settings.html') };

  const App = {
    t: (k) => k,
    applyTranslations: () => {},
    lockBodyScroll: () => {}, unlockBodyScroll: () => {},
    showToast: () => {},
    confirmDialog: () => Promise.resolve(false),
    updateBackupCloudState: () => {},
    initCommon: () => Promise.resolve(),
  };

  const BackupManager = {
    isShareSupported: () => false,
    exportEncryptedBackup: () => Promise.resolve({ cancelled: true }),
    exportBackup: () => Promise.resolve({ blob: {}, filename: 'b.zip' }),
    importBackup: () => Promise.resolve(),
    testBackupPassword: () => Promise.resolve({ clientCount: 0, sessionCount: 0 }),
    isAutoBackupActive: () => false,
    triggerDownload: () => {},
    computeBackupRecencyState: () => 'never',
  };

  const win = {
    location, localStorage: storage, App, BackupManager,
    formatRelativeTime: () => null,
    addEventListener: () => {}, removeEventListener: () => {},
    setTimeout, clearTimeout,
    history: { replaceState() {} },
    URLSearchParams,
  };

  const sandbox = {
    window: win,
    document: dom.document,
    localStorage: storage,
    App, BackupManager,
    URLSearchParams,
    File: function () {}, Blob: function () {},
    console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, Promise, JSON, Math, Date, Array, Object, Set, Map, RegExp, String, Number, Boolean,
  };
  win.document = dom.document;
  vm.createContext(sandbox);
  return { sandbox, dom, win, location };
}

function loadBackupModal(ctx) {
  const p = path.join(ROOT, 'assets', 'backup-modal.js');
  const src = fs.readFileSync(p, 'utf8'); // throws if missing → RED
  vm.runInContext(src, ctx.sandbox, { filename: 'assets/backup-modal.js' });
}

// ── A: markup injected when absent ──────────────────────────────────
test('A: backup-modal.js injects #backupModal into <body> when it is absent (non-overview page)', () => {
  const ctx = makeSandbox({ pathname: '/settings.html', preexistingModal: false });
  loadBackupModal(ctx);
  ctx.dom.document._fireReady();
  const modal = ctx.dom.document.getElementById('backupModal');
  assert.ok(modal, '#backupModal must exist after backup-modal.js runs on a page without static modal markup');
});

// ── B: window.openBackupModal defined ───────────────────────────────
test('B: window.openBackupModal is a function after backup-modal.js loads', () => {
  const ctx = makeSandbox({ pathname: '/add-client.html', preexistingModal: false });
  loadBackupModal(ctx);
  ctx.dom.document._fireReady();
  assert.strictEqual(typeof ctx.win.openBackupModal, 'function',
    'window.openBackupModal MUST be defined on every page so the cloud icon opens the modal in-place');
});

// ── C: cloud-icon click does NOT navigate when modal available ──────
test('C: with window.openBackupModal available, the cloud-icon handler does NOT change window.location', () => {
  const ctx = makeSandbox({ pathname: '/settings.html', preexistingModal: false });
  loadBackupModal(ctx);
  ctx.dom.document._fireReady();

  // Reproduce the app.js cloud-icon click handler logic exactly.
  const hrefBefore = ctx.location.href;
  (function cloudIconClick() {
    if (typeof ctx.win.openBackupModal === 'function') {
      ctx.win.openBackupModal();
    } else {
      ctx.win.location.href = './index.html?openBackup=1';
    }
  })();
  assert.strictEqual(ctx.location.href, hrefBefore,
    'cloud-icon click MUST open the modal in-place (no navigation) when window.openBackupModal is defined');
});

// ── D: no duplicate injection when markup already present ───────────
test('D: backup-modal.js does NOT inject a duplicate when #backupModal is already in the DOM (index.html)', () => {
  const ctx = makeSandbox({ pathname: '/index.html', preexistingModal: true });
  const bodyChildrenBefore = ctx.dom.body._children.length;
  loadBackupModal(ctx);
  ctx.dom.document._fireReady();
  // Count nodes whose id is backupModal among direct body children.
  const modalCount = ctx.dom.body._children.filter(c => c._id === 'backupModal').length;
  assert.strictEqual(modalCount, 1,
    'When index.html ships the static #backupModal markup, backup-modal.js MUST NOT inject a second copy (got ' + modalCount + ')');
  assert.ok(ctx.dom.body._children.length >= bodyChildrenBefore,
    'sanity: body children count did not shrink');
});

console.log('');
console.log('Round-5 D2 modal-global-inplace tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
