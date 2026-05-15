/**
 * Phase 25 Plan 12 (round-2 post-UAT) — Change B: optimize-savings
 * estimate display floor.
 *
 * Round-1 fix added a per-photo threshold so already-optimized photos
 * contribute 0 to estimatePhotoSavings. But when NO photo crosses the
 * threshold the estimator legitimately returns 0 — yet running optimize
 * still saves a handful of bytes from metadata stripping. Showing "0 B"
 * (or "12 B" etc.) is noise; the user is better served by a friendly
 * "Minimal savings expected" message.
 *
 * Contracts:
 *
 *   1. Source constant: ESTIMATE_DISPLAY_FLOOR_BYTES exists in
 *      assets/settings.js near PHOTO_OPTIMIZED_BYTES_THRESHOLD. Its
 *      value is > 0 (a real floor, not zero-equivalent). The objective
 *      recommends 1024 (1 KB) — accept any value in [256, 10240].
 *
 *   2. i18n parity: photos.optimize.minimal exists in all 4 locales
 *      as a non-empty string.
 *
 *   3. Runtime behavior (refreshPhotosTab inline preview):
 *      When the helper returns 500 bytes (< floor), the rendered
 *      #photosOptimizePreview text contains the i18n "minimal" string
 *      AND does NOT contain the byte-level "0 B" / "500 B" / "~500 B"
 *      label. When it returns 5000 bytes (>= floor), the rendered text
 *      contains the byte-formatted "~5" plus a KB/B unit marker.
 *
 *   4. Runtime behavior (handleOptimize confirm dialog):
 *      When estimate < floor, App.confirmDialog receives placeholders
 *      whose `size` value is the minimal-savings i18n string (NOT a
 *      byte amount). When estimate >= floor, `size` is the byte label.
 *
 * MUST FAIL before the round-2 fix:
 *   - No ESTIMATE_DISPLAY_FLOOR_BYTES constant in settings.js.
 *   - No photos.optimize.minimal key in any locale.
 *   - Inline preview renders "~0 B" when estimate is 0.
 *   - Confirm dialog placeholders.size carries "0 B" when estimate is 0.
 *
 * Run: node tests/25-12-optimize-estimate-floor.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const settingsSrc = fs.readFileSync(path.join(ROOT, 'assets', 'settings.js'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { console.log('  PASS  ' + name); passed++; })
    .catch((err) => {
      console.log('  FAIL  ' + name);
      console.log('        ' + (err && err.message || err));
      failed++;
    });
}

// ── Load i18n sandbox ─────────────────────────────────────────────
const i18nSandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
i18nSandbox.window.I18N = {};
i18nSandbox.window.QUOTES = {};
vm.createContext(i18nSandbox);
for (const f of ['i18n-en.js', 'i18n-he.js', 'i18n-de.js', 'i18n-cs.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8'), i18nSandbox, { filename: 'assets/' + f });
}
const I18N = i18nSandbox.window.I18N;

// ────────────────────────────────────────────────────────────────────
// SOURCE GATES
// ────────────────────────────────────────────────────────────────────

(async function runAll() {

await test('Source: ESTIMATE_DISPLAY_FLOOR_BYTES constant exists in settings.js', () => {
  const m = settingsSrc.match(/\bvar\s+ESTIMATE_DISPLAY_FLOOR_BYTES\s*=\s*([^;]+);/);
  if (!m) {
    throw new Error('no `var ESTIMATE_DISPLAY_FLOOR_BYTES = ...;` declaration found in settings.js');
  }
  // The value must evaluate to a number > 0 and within a sane range.
  // Allow expressions like `1024`, `1 * 1024`, `4 * 1024`. Evaluate in a
  // micro-sandbox to keep the test permissive about the literal form.
  let value;
  try {
    value = vm.runInNewContext('(' + m[1].trim() + ')');
  } catch (e) {
    throw new Error('ESTIMATE_DISPLAY_FLOOR_BYTES expression could not be evaluated: ' + m[1]);
  }
  if (typeof value !== 'number' || !isFinite(value)) {
    throw new Error('ESTIMATE_DISPLAY_FLOOR_BYTES is not a finite number — got ' + value);
  }
  if (value < 256 || value > 10240) {
    throw new Error(
      'ESTIMATE_DISPLAY_FLOOR_BYTES = ' + value + ' is outside the sensible\n' +
      '        [256, 10240] byte range. The objective recommends 1024 (1 KB).'
    );
  }
});

await test('Source: ESTIMATE_DISPLAY_FLOOR_BYTES is exposed on __PhotosTabHelpers (for testability + D-30 single-source)', () => {
  if (!/ESTIMATE_DISPLAY_FLOOR_BYTES\s*:\s*ESTIMATE_DISPLAY_FLOOR_BYTES/.test(settingsSrc)) {
    throw new Error('ESTIMATE_DISPLAY_FLOOR_BYTES is not exposed on __PhotosTabHelpers');
  }
});

// ── i18n key existence: all 4 locales ─────────────────────────────

const LOCALES = ['en', 'he', 'de', 'cs'];
for (const l of LOCALES) {
  await test('i18n: photos.optimize.minimal exists in locale ' + l, () => {
    const v = I18N[l] && I18N[l]['photos.optimize.minimal'];
    if (typeof v !== 'string' || v.length === 0) {
      throw new Error('photos.optimize.minimal missing or empty in i18n-' + l + '.js');
    }
  });
}

await test('i18n: EN photos.optimize.minimal reads like "Minimal savings expected" (sanity check on content)', () => {
  const v = I18N.en['photos.optimize.minimal'];
  if (!/minimal/i.test(v) && !/no(t)?\s+significant/i.test(v) && !/very small/i.test(v) && !/negligible/i.test(v)) {
    throw new Error('EN photos.optimize.minimal does not contain a "minimal/negligible/very small" indicator — got: ' + JSON.stringify(v));
  }
});

// ────────────────────────────────────────────────────────────────────
// RUNTIME BEHAVIOR — refreshPhotosTab inline preview
// ────────────────────────────────────────────────────────────────────

function makeNode(id) {
  const listeners = new Map();
  const attrs = new Map();
  const node = {
    id,
    _attributes: attrs,
    _listeners: listeners,
    _hidden: false,
    _value: '',
    _textContent: '',
    _disabled: false,
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); },
      toggle() {},
    },
    get textContent() { return this._textContent; },
    set textContent(v) { this._textContent = String(v); },
    get hidden() { return this._hidden; },
    set hidden(v) { this._hidden = !!v; },
    get value() { return this._value; },
    set value(v) { this._value = String(v); },
    get disabled() { return this._disabled; },
    set disabled(v) { this._disabled = !!v; },
    setAttribute(k, v) { attrs.set(k, String(v)); if (k === 'hidden') this._hidden = true; },
    removeAttribute(k) { attrs.delete(k); if (k === 'hidden') this._hidden = false; },
    getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
    hasAttribute(k) { return attrs.has(k); },
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
    removeEventListener() {},
    _click() {
      const arr = listeners.get('click') || [];
      for (let i = 0; i < arr.length; i++) arr[i]({ preventDefault() {}, stopPropagation() {}, currentTarget: node });
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    appendChild(c) { return c; },
    focus() {}, blur() {},
    style: {},
  };
  return node;
}

function makeSandbox(opts) {
  const elements = new Map();
  const ids = [
    'photosOptimizeBtn', 'photosDeleteAllBtn', 'photosStorageUsage',
    'photosEmpty', 'photosOptimizePreview', 'photosOptimizeSection',
    'photosDeleteAllSection',
  ];
  for (const id of ids) elements.set(id, makeNode(id));

  const docListeners = new Map();
  const document = {
    addEventListener(type, fn) { if (!docListeners.has(type)) docListeners.set(type, []); docListeners.get(type).push(fn); },
    removeEventListener() {},
    getElementById(id) { return elements.has(id) ? elements.get(id) : null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement(tag) { return makeNode('__synthetic_' + tag); },
    body: makeNode('__body'), head: makeNode('__head'), documentElement: makeNode('__html'),
    readyState: 'complete',
    _fireReady() {
      const arr = docListeners.get('DOMContentLoaded') || [];
      for (let i = 0; i < arr.length; i++) try { arr[i]({}); } catch (_) {}
    },
  };

  const confirmDialogCalls = [];
  const storage = (() => {
    const m = new Map();
    return {
      getItem(k) { return m.has(String(k)) ? m.get(String(k)) : null; },
      setItem(k, v) { m.set(String(k), String(v)); },
      removeItem(k) { m.delete(String(k)); },
      clear() { m.clear(); },
    };
  })();

  // PortfolioDB serves whatever clients opts.clientsRef.value points to.
  // estimatePhotosBytes mirrors db.js (sum of base64-derived bytes).
  const PortfolioDB = {
    getAllClients: () => Promise.resolve(opts.clientsRef.value),
    estimatePhotosBytes: function (clients) {
      let total = 0;
      for (let i = 0; i < (clients || []).length; i++) {
        const c = clients[i];
        if (c && typeof c.photoData === 'string' && c.photoData.indexOf(',') !== -1) {
          const b64 = c.photoData.split(',')[1] || '';
          total += Math.floor(b64.length * 0.75);
        }
      }
      return total;
    },
    updateClient: (c) => Promise.resolve(c),
  };

  // App.t resolves through the loaded EN locale for assertions; the
  // confirm spy captures placeholders verbatim.
  const App = {
    showToast: () => {},
    t: (key) => {
      const v = I18N.en && I18N.en[key];
      return typeof v === 'string' ? v : key;
    },
    confirmDialog: (cfg) => {
      confirmDialogCalls.push({
        titleKey: cfg.titleKey, messageKey: cfg.messageKey,
        placeholders: cfg.placeholders ? Object.assign({}, cfg.placeholders) : null,
      });
      return Promise.resolve(false);
    },
    initCommon: () => Promise.resolve(),
    setLanguage: () => {},
    applyTranslations: () => {},
    mountBackupCloudButton: () => {},
    updateBackupCloudState: () => {},
  };

  const sandbox = {
    window: {},
    document,
    localStorage: storage,
    navigator: { storage: { estimate: () => Promise.resolve({ usage: 0 }) } },
    console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, Promise, JSON, Math, Date, Array, Object, Set, Map, RegExp, String, Number, Boolean, Symbol, Error,
    Blob: function () {},
    FileReader: function () {},
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  };
  sandbox.window.document = document;
  sandbox.window.localStorage = storage;
  sandbox.window.navigator = sandbox.navigator;
  sandbox.window.addEventListener = () => {};
  sandbox.window.removeEventListener = () => {};
  sandbox.window.setTimeout = setTimeout;
  sandbox.window.clearTimeout = clearTimeout;
  sandbox.window.App = App;
  sandbox.App = App;
  sandbox.window.PortfolioDB = PortfolioDB;
  sandbox.PortfolioDB = PortfolioDB;
  sandbox.window.CropModule = { resizeToMaxDimension: () => Promise.resolve(new sandbox.Blob([new Uint8Array(5)], {})) };
  sandbox.CropModule = sandbox.window.CropModule;
  sandbox.Uint8Array = Uint8Array;
  sandbox.window.BackupManager = { canEnableSchedule: () => true, isAutoBackupSupported: () => true, checkBackupSchedule: () => {} };
  sandbox.BackupManager = sandbox.window.BackupManager;
  sandbox.window.Snippets = { getPrefix: () => '!', setPrefix: () => {} };
  sandbox.Snippets = sandbox.window.Snippets;
  sandbox.window.SNIPPETS_SEED = [];
  sandbox.SNIPPETS_SEED = [];
  sandbox.window.I18N = I18N;
  sandbox.I18N = I18N;
  sandbox.BroadcastChannel = function () { return { postMessage() {}, close() {}, addEventListener() {} }; };

  vm.createContext(sandbox);
  vm.runInContext(settingsSrc, sandbox, { filename: 'assets/settings.js' });
  document._fireReady();

  return { sandbox, document, elements, confirmDialogCalls };
}

// Build a data URL whose base64 payload yields ~targetBytes bytes
// according to estimatePhotosBytes (which does floor(b64.length * 0.75)).
function makeDataURLOfBytes(targetBytes) {
  if (targetBytes <= 0) return 'data:image/jpeg;base64,';
  const b64Len = Math.ceil(targetBytes / 0.75);
  return 'data:image/jpeg;base64,' + 'A'.repeat(b64Len);
}

// Helper: stub estimatePhotoSavings on __PhotosTabHelpers to a deterministic
// value, then run refreshPhotosTab indirectly by re-binding the click of
// optimize button (which doesn't actually call refresh) — instead we hit
// the DOMContentLoaded path which DOES call refreshPhotosTab.
// Simpler: drive refreshPhotosTab via the click handler's confirm-dialog
// path (which uses the helper). And for refreshPhotosTab itself we
// re-fire DOMContentLoaded with a stubbed estimatePhotoSavings.

// Phase 25 round-5 supersession (Change 3, 2026-05-15): the standalone
// #photosOptimizePreview "Minimal savings expected" / "Estimated savings:
// ~X" line is ABSORBED into the storage-usage verdict line
// (#photosStorageUsage → photos.usage.compact / .optional / .recommended).
// These two tests previously asserted the standalone preview render; they
// now assert the same SIGNAL (sub-floor ⇒ "already compact, won't help";
// ≥-floor ⇒ a byte figure) on the verdict line. The round-2 floor
// CONTRACT (sub-1KB shows no raw "0 B"/"500 B" noise) is preserved — only
// the element that carries the signal moved (objective Change 3 / Rule 1).
await test('Runtime: sub-floor estimate folds into the storage VERDICT line as the "already compact" message (no raw byte noise)', async () => {
  const big = makeDataURLOfBytes(200 * 1024);
  const clientsRef = { value: [{ id: 'c1', photoData: big }] };

  const ctx = makeSandbox({ clientsRef });

  const helpers = ctx.sandbox.window.__PhotosTabHelpers;
  if (!helpers) throw new Error('__PhotosTabHelpers not exposed');
  helpers.estimatePhotoSavings = () => 500; // < ESTIMATE_DISPLAY_FLOOR_BYTES

  ctx.document._fireReady();
  await new Promise(r => setTimeout(r, 30));

  const usageEl = ctx.elements.get('photosStorageUsage');
  if (!usageEl) throw new Error('photosStorageUsage not mounted');
  const rendered = usageEl.textContent || '';

  // Sub-floor ⇒ photos.usage.compact ("Already compact — optimizing
  // won't help"). The {savings} placeholder is NOT in that template, so
  // there is no raw "~500 B" / "~0 B" noise — the round-2 floor contract.
  if (!/already compact/i.test(rendered) || !/won't help|wont help/i.test(rendered)) {
    throw new Error(
      'sub-floor estimate must fold into the compact verdict on #photosStorageUsage.\n' +
      '        Got: ' + JSON.stringify(rendered)
    );
  }
  if (/~\s*\d+\s*B\b/.test(rendered) && !/KB|MB|GB/.test(rendered)) {
    throw new Error(
      'verdict line still renders a raw sub-KB byte amount (round-2 floor contract violated).\n' +
      '        Got: ' + JSON.stringify(rendered)
    );
  }
  // The standalone preview must NOT separately render the old minimal text.
  const previewEl = ctx.elements.get('photosOptimizePreview');
  const prev = (previewEl && previewEl.textContent) || '';
  const minimalText = I18N.en['photos.optimize.minimal'];
  if (minimalText && prev.includes(minimalText)) {
    throw new Error('standalone #photosOptimizePreview should no longer render the minimal-savings line (absorbed into the verdict). Got: ' + JSON.stringify(prev));
  }
});

await test('Runtime: ≥-floor estimate folds into the storage VERDICT line with a byte figure (optional/recommended tier)', async () => {
  const big = makeDataURLOfBytes(200 * 1024);
  const clientsRef = { value: [{ id: 'c1', photoData: big }] };

  const ctx = makeSandbox({ clientsRef });
  const helpers = ctx.sandbox.window.__PhotosTabHelpers;
  helpers.estimatePhotoSavings = () => 5000; // ≥ 1024 (and < 2 MB) → optional + byte figure

  ctx.document._fireReady();
  await new Promise(r => setTimeout(r, 30));

  const usageEl = ctx.elements.get('photosStorageUsage');
  const rendered = usageEl.textContent || '';
  // 5000 bytes formats as ~4.9 KB via humanBytes — must appear as the
  // {savings} substitution in the optional verdict.
  if (!/\b\d+(\.\d+)?\s*KB\b/.test(rendered) && !/\b\d+\s*B\b/.test(rendered)) {
    throw new Error('≥-floor verdict line does not contain a byte-formatted savings figure. Got: ' + JSON.stringify(rendered));
  }
  if (!/optional/i.test(rendered) && !/recommended/i.test(rendered)) {
    throw new Error('≥-floor estimate must render the optional or recommended verdict. Got: ' + JSON.stringify(rendered));
  }
  if (/already compact/i.test(rendered)) {
    throw new Error('≥-floor path must NOT render the compact verdict. Got: ' + JSON.stringify(rendered));
  }
});

// ────────────────────────────────────────────────────────────────────
// RUNTIME — confirm dialog placeholders.size
// ────────────────────────────────────────────────────────────────────

await test('Runtime: handleOptimize confirm-dialog placeholders.size is the minimal-savings i18n string when estimate < floor', async () => {
  // The estimate must come out < floor naturally. With photos at 30 KB
  // each (already-optimized, below PHOTO_OPTIMIZED_BYTES_THRESHOLD =
  // 100 KB), the per-photo helper returns 0 → 0 < 1024 → minimal.
  const small = makeDataURLOfBytes(30 * 1024);
  const clientsRef = { value: [
    { id: 'c1', photoData: small },
    { id: 'c2', photoData: small },
  ] };

  const ctx = makeSandbox({ clientsRef });
  const btn = ctx.elements.get('photosOptimizeBtn');
  btn._click();
  await new Promise(r => setTimeout(r, 30));

  if (ctx.confirmDialogCalls.length < 1) {
    throw new Error('expected handleOptimize to call App.confirmDialog; got 0 calls');
  }
  const call = ctx.confirmDialogCalls[0];
  if (!call.placeholders) throw new Error('confirmDialog call missing placeholders bag');

  const minimalText = I18N.en['photos.optimize.minimal'];
  if (!minimalText) throw new Error('photos.optimize.minimal missing in EN');

  if (call.placeholders.size !== minimalText) {
    throw new Error(
      'confirmDialog placeholders.size is not the minimal-savings i18n string.\n' +
      '        Expected: ' + JSON.stringify(minimalText) + '\n' +
      '        Got:      ' + JSON.stringify(call.placeholders.size)
    );
  }
});

await test('Runtime: handleOptimize confirm-dialog placeholders.size is the byte amount when estimate >= floor', async () => {
  const big = makeDataURLOfBytes(500 * 1024);
  const clientsRef = { value: [
    { id: 'c1', photoData: big },
    { id: 'c2', photoData: big },
  ] };

  const ctx = makeSandbox({ clientsRef });
  const btn = ctx.elements.get('photosOptimizeBtn');
  btn._click();
  await new Promise(r => setTimeout(r, 30));

  if (ctx.confirmDialogCalls.length < 1) throw new Error('no confirmDialog call');
  const call = ctx.confirmDialogCalls[0];
  if (!call.placeholders) throw new Error('confirmDialog call missing placeholders bag');

  const size = call.placeholders.size;
  if (!/(KB|MB|B)\b/.test(String(size))) {
    throw new Error('confirmDialog placeholders.size is not a byte-formatted label. Got: ' + JSON.stringify(size));
  }
  const minimalText = I18N.en['photos.optimize.minimal'];
  if (minimalText && size === minimalText) {
    throw new Error('>= floor path should NOT use the minimal-savings string. Got: ' + JSON.stringify(size));
  }
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log('Plan 25-12 optimize-estimate-floor tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);

})();
