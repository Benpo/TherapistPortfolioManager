/**
 * Phase 25 round-5 post-UAT — Change 3: optimize-estimate verdict line.
 *
 * Ben approved a 3-tier verdict folded INTO the storage-usage line,
 * recomputed on every refreshPhotosTab() render:
 *
 *   S < 1 KB   (ESTIMATE_DISPLAY_FLOOR_BYTES)         → photos.usage.compact
 *      "Photos use {size} of your browser storage. Already compact —
 *       optimizing won't help."
 *   1 KB ≤ S < 2 MB (OPTIMIZE_RECOMMEND_THRESHOLD)   → photos.usage.optional
 *      "Photos use {size} of your browser storage. Optimizing could free
 *       about {savings} (optional)."
 *   S ≥ 2 MB                                          → photos.usage.recommended
 *      "Photos use {size} of your browser storage. Optimizing could free
 *       about {savings} — recommended."
 *
 * Contracts:
 *   1. Source constant OPTIMIZE_RECOMMEND_THRESHOLD_BYTES = 2*1024*1024
 *      exists in settings.js next to the other threshold constants and
 *      is exposed on __PhotosTabHelpers (like ESTIMATE_DISPLAY_FLOOR_BYTES).
 *   2. i18n parity: photos.usage.compact / .optional / .recommended exist
 *      in all 4 locales, non-empty, with the right {size}/{savings}
 *      placeholders. photos.usage.body is KEPT (back-compat fallback).
 *   3. Runtime: drive estimatePhotoSavings via a mock at
 *      0, 500 (<1KB), 800*1024 (between), 5*1024*1024 (≥2MB) and assert
 *      the rendered #photosStorageUsage text uses
 *      compact / compact / optional / recommended respectively, with
 *      {size} substituted (and {savings} for optional/recommended).
 *
 * Reuses the tests/25-12-optimize-estimate-floor.test.js vm-sandbox
 * harness (settings.js loaded in a Node vm with DOM + PortfolioDB stubs).
 *
 * MUST FAIL before the fix: no OPTIMIZE_RECOMMEND_THRESHOLD_BYTES; no
 * photos.usage.compact/.optional/.recommended keys; refreshPhotosTab
 * still renders the flat photos.usage.body line for every estimate.
 *
 * Run: node tests/25-12-optimize-verdict.test.js
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
  return Promise.resolve().then(fn)
    .then(() => { console.log('  PASS  ' + name); passed++; })
    .catch((err) => { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; });
}

// ── i18n bundles ────────────────────────────────────────────────────
const i18nSandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
i18nSandbox.window.I18N = {};
i18nSandbox.window.QUOTES = {};
vm.createContext(i18nSandbox);
for (const f of ['i18n-en.js', 'i18n-he.js', 'i18n-de.js', 'i18n-cs.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8'), i18nSandbox, { filename: 'assets/' + f });
}
const I18N = i18nSandbox.window.I18N;
const LOCALES = ['en', 'he', 'de', 'cs'];

// ── DOM stub harness (mirrors 25-12-optimize-estimate-floor) ────────
function makeNode(id) {
  const listeners = new Map();
  const attrs = new Map();
  const node = {
    id, _attributes: attrs, _listeners: listeners,
    _hidden: false, _value: '', _textContent: '', _disabled: false,
    classList: { _classes: new Set(), add(c){this._classes.add(c);}, remove(c){this._classes.delete(c);}, contains(c){return this._classes.has(c);}, toggle(){} },
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
    addEventListener(t, fn) { if (!listeners.has(t)) listeners.set(t, []); listeners.get(t).push(fn); },
    removeEventListener() {},
    _click() { (listeners.get('click') || []).forEach(fn => fn({ preventDefault(){}, stopPropagation(){}, currentTarget: node })); },
    querySelector() { return null; }, querySelectorAll() { return []; },
    appendChild(c) { return c; }, focus() {}, blur() {}, style: {},
  };
  return node;
}

function makeSandbox(opts) {
  const elements = new Map();
  const ids = ['photosOptimizeBtn','photosDeleteAllBtn','photosStorageUsage','photosEmpty','photosOptimizePreview','photosOptimizeSection','photosDeleteAllSection'];
  for (const id of ids) elements.set(id, makeNode(id));

  const docListeners = new Map();
  const document = {
    addEventListener(t, fn) { if (!docListeners.has(t)) docListeners.set(t, []); docListeners.get(t).push(fn); },
    removeEventListener() {},
    getElementById(id) { return elements.has(id) ? elements.get(id) : null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    createElement(tag) { return makeNode('__synthetic_' + tag); },
    body: makeNode('__body'), head: makeNode('__head'), documentElement: makeNode('__html'),
    readyState: 'complete',
    _fireReady() { (docListeners.get('DOMContentLoaded') || []).forEach(fn => { try { fn({}); } catch (_) {} }); },
    _fireLang() { (docListeners.get('app:language') || []).forEach(fn => { try { fn({}); } catch (_) {} }); },
  };

  const storage = (() => { const m = new Map(); return {
    getItem(k){return m.has(String(k))?m.get(String(k)):null;}, setItem(k,v){m.set(String(k),String(v));}, removeItem(k){m.delete(String(k));}, clear(){m.clear();} }; })();

  const PortfolioDB = {
    getAllClients: () => Promise.resolve(opts.clientsRef.value),
    estimatePhotosBytes: function (clients) {
      let total = 0;
      for (let i = 0; i < (clients || []).length; i++) {
        const c = clients[i];
        if (c && typeof c.photoData === 'string' && c.photoData.indexOf(',') !== -1) {
          total += Math.floor((c.photoData.split(',')[1] || '').length * 0.75);
        }
      }
      return total;
    },
    updateClient: (c) => Promise.resolve(c),
  };

  const langRef = { value: opts.lang || 'en' };
  const App = {
    showToast: () => {},
    t: (key) => { const v = I18N[langRef.value] && I18N[langRef.value][key]; return typeof v === 'string' ? v : key; },
    confirmDialog: () => Promise.resolve(false),
    initCommon: () => Promise.resolve(),
    setLanguage: () => {}, applyTranslations: () => {},
    mountBackupCloudButton: () => {}, updateBackupCloudState: () => {},
  };

  const sandbox = {
    window: {}, document, localStorage: storage,
    navigator: { storage: { estimate: () => Promise.resolve({ usage: 0 }) } },
    console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, Promise, JSON, Math, Date, Array, Object, Set, Map, RegExp, String, Number, Boolean, Symbol, Error,
    Blob: function () {}, FileReader: function () {},
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
  sandbox.window.App = App; sandbox.App = App;
  sandbox.window.PortfolioDB = PortfolioDB; sandbox.PortfolioDB = PortfolioDB;
  sandbox.window.CropModule = { resizeToMaxDimension: () => Promise.resolve(new sandbox.Blob([new Uint8Array(5)], {})) };
  sandbox.CropModule = sandbox.window.CropModule;
  sandbox.Uint8Array = Uint8Array;
  sandbox.window.BackupManager = { canEnableSchedule: () => true, isAutoBackupSupported: () => true, checkBackupSchedule: () => {} };
  sandbox.BackupManager = sandbox.window.BackupManager;
  sandbox.window.Snippets = { getPrefix: () => '!', setPrefix: () => {} };
  sandbox.Snippets = sandbox.window.Snippets;
  sandbox.window.SNIPPETS_SEED = []; sandbox.SNIPPETS_SEED = [];
  sandbox.window.I18N = I18N; sandbox.I18N = I18N;
  sandbox.BroadcastChannel = function () { return { postMessage(){}, close(){}, addEventListener(){} }; };

  vm.createContext(sandbox);
  vm.runInContext(settingsSrc, sandbox, { filename: 'assets/settings.js' });
  document._fireReady();
  return { sandbox, document, elements, langRef };
}

function makeDataURLOfBytes(targetBytes) {
  if (targetBytes <= 0) return 'data:image/jpeg;base64,';
  return 'data:image/jpeg;base64,' + 'A'.repeat(Math.ceil(targetBytes / 0.75));
}

(async function runAll() {

// ── 1. Source constant ──────────────────────────────────────────────
await test('Source: OPTIMIZE_RECOMMEND_THRESHOLD_BYTES = 2 MB constant exists in settings.js', () => {
  const m = settingsSrc.match(/\bvar\s+OPTIMIZE_RECOMMEND_THRESHOLD_BYTES\s*=\s*([^;]+);/);
  if (!m) throw new Error('no `var OPTIMIZE_RECOMMEND_THRESHOLD_BYTES = ...;` in settings.js');
  let value;
  try { value = vm.runInNewContext('(' + m[1].trim() + ')'); }
  catch (e) { throw new Error('expression not evaluable: ' + m[1]); }
  if (value !== 2 * 1024 * 1024) {
    throw new Error('OPTIMIZE_RECOMMEND_THRESHOLD_BYTES must equal 2*1024*1024 (2 MB) — got ' + value);
  }
});

await test('Source: OPTIMIZE_RECOMMEND_THRESHOLD_BYTES exposed on __PhotosTabHelpers', () => {
  if (!/OPTIMIZE_RECOMMEND_THRESHOLD_BYTES\s*:\s*OPTIMIZE_RECOMMEND_THRESHOLD_BYTES/.test(settingsSrc)) {
    throw new Error('OPTIMIZE_RECOMMEND_THRESHOLD_BYTES not exposed on __PhotosTabHelpers');
  }
});

// ── 2. i18n parity ──────────────────────────────────────────────────
for (const key of ['photos.usage.compact', 'photos.usage.optional', 'photos.usage.recommended']) {
  for (const l of LOCALES) {
    await test('i18n: ' + key + ' exists & non-empty (' + l + ')', () => {
      const v = I18N[l] && I18N[l][key];
      if (typeof v !== 'string' || v.length === 0) throw new Error(key + ' missing/empty in ' + l);
      if (v.indexOf('{size}') === -1) throw new Error(key + ' (' + l + ') must keep the {size} placeholder — got: ' + v);
      if (key !== 'photos.usage.compact' && v.indexOf('{savings}') === -1) {
        throw new Error(key + ' (' + l + ') must keep the {savings} placeholder — got: ' + v);
      }
    });
  }
}

await test('i18n: photos.usage.body is KEPT (back-compat fallback) in all 4 locales', () => {
  for (const l of LOCALES) {
    const v = I18N[l] && I18N[l]['photos.usage.body'];
    if (typeof v !== 'string' || v.length === 0) throw new Error('photos.usage.body removed from ' + l + ' — must be kept for back-compat');
  }
});

await test('i18n: EN compact/optional/recommended read with the right verdict words', () => {
  const c = I18N.en['photos.usage.compact'];
  const o = I18N.en['photos.usage.optional'];
  const r = I18N.en['photos.usage.recommended'];
  if (!/already compact/i.test(c) || !/won't help|wont help|no(t)? help/i.test(c)) {
    throw new Error('EN photos.usage.compact should say "Already compact — optimizing won\'t help" — got: ' + JSON.stringify(c));
  }
  if (!/optional/i.test(o) || !/free about/i.test(o)) {
    throw new Error('EN photos.usage.optional should say "Optimizing could free about {savings} (optional)" — got: ' + JSON.stringify(o));
  }
  if (!/recommended/i.test(r) || !/free about/i.test(r)) {
    throw new Error('EN photos.usage.recommended should say "...free about {savings} — recommended" — got: ' + JSON.stringify(r));
  }
});

// ── 3. Runtime verdict selection by estimate tier ───────────────────
async function renderWithEstimate(bytes, lang) {
  const big = makeDataURLOfBytes(300 * 1024); // ensures hasPhotos=true branch
  const clientsRef = { value: [{ id: 'c1', photoData: big }] };
  const ctx = makeSandbox({ clientsRef, lang: lang || 'en' });
  const helpers = ctx.sandbox.window.__PhotosTabHelpers;
  if (!helpers) throw new Error('__PhotosTabHelpers not exposed');
  helpers.estimatePhotoSavings = () => bytes;
  ctx.document._fireReady();
  await new Promise(r => setTimeout(r, 30));
  const usageEl = ctx.elements.get('photosStorageUsage');
  return { rendered: usageEl.textContent || '', ctx };
}

await test('Runtime: estimate = 0 → storage line uses photos.usage.compact', async () => {
  const { rendered } = await renderWithEstimate(0);
  const tmpl = I18N.en['photos.usage.compact'];
  const expectedTail = tmpl.replace('{size}', '').replace(/\s+$/,'');
  if (!/already compact/i.test(rendered) || !/won't help|wont help/i.test(rendered)) {
    throw new Error('estimate=0 must render the compact verdict. Got: ' + JSON.stringify(rendered));
  }
});

await test('Runtime: estimate = 500 B (<1KB) → storage line uses photos.usage.compact', async () => {
  const { rendered } = await renderWithEstimate(500);
  if (!/already compact/i.test(rendered) || !/won't help|wont help/i.test(rendered)) {
    throw new Error('estimate=500 (<1KB) must render the compact verdict. Got: ' + JSON.stringify(rendered));
  }
});

await test('Runtime: estimate = 800 KB (1KB ≤ S < 2MB) → storage line uses photos.usage.optional with {savings}', async () => {
  const { rendered } = await renderWithEstimate(800 * 1024);
  if (!/optional/i.test(rendered)) {
    throw new Error('estimate=800KB must render the OPTIONAL verdict. Got: ' + JSON.stringify(rendered));
  }
  if (/recommended/i.test(rendered)) {
    throw new Error('800KB is below 2MB — must NOT say "recommended". Got: ' + JSON.stringify(rendered));
  }
  // {savings} substituted — expect a KB-scale figure in the line.
  if (!/\bKB\b|\bMB\b/.test(rendered)) {
    throw new Error('optional verdict must substitute {savings} with a byte figure. Got: ' + JSON.stringify(rendered));
  }
});

await test('Runtime: estimate = 5 MB (≥2MB) → storage line uses photos.usage.recommended with {savings}', async () => {
  const { rendered } = await renderWithEstimate(5 * 1024 * 1024);
  if (!/recommended/i.test(rendered)) {
    throw new Error('estimate=5MB must render the RECOMMENDED verdict. Got: ' + JSON.stringify(rendered));
  }
  if (/\(optional\)/i.test(rendered)) {
    throw new Error('5MB is ≥2MB — must NOT say "(optional)". Got: ' + JSON.stringify(rendered));
  }
  if (!/\bMB\b/.test(rendered)) {
    throw new Error('recommended verdict must substitute {savings} with a byte figure. Got: ' + JSON.stringify(rendered));
  }
});

await test('Runtime: {size} placeholder is substituted (no literal "{size}" left in the rendered line)', async () => {
  const { rendered } = await renderWithEstimate(5 * 1024 * 1024);
  if (rendered.indexOf('{size}') !== -1 || rendered.indexOf('{savings}') !== -1) {
    throw new Error('rendered storage line still contains an unsubstituted placeholder. Got: ' + JSON.stringify(rendered));
  }
});

await test('Runtime: app:language re-render keeps the verdict (recommended) — Hebrew path', async () => {
  const { ctx } = await renderWithEstimate(5 * 1024 * 1024, 'en');
  ctx.langRef.value = 'he';
  ctx.document._fireLang();
  await new Promise(r => setTimeout(r, 30));
  const usageEl = ctx.elements.get('photosStorageUsage');
  const rendered = usageEl.textContent || '';
  const heRecommended = I18N.he && I18N.he['photos.usage.recommended'];
  if (typeof heRecommended !== 'string' || heRecommended.length === 0) {
    throw new Error('HE photos.usage.recommended missing — cannot verify the language re-render path');
  }
  // The HE recommended template (minus placeholders) should appear.
  const heStem = heRecommended.replace('{size}', '').replace('{savings}', '').replace(/\s+/g, '').slice(0, 6);
  if (rendered.replace(/\s+/g, '').indexOf(heStem) === -1) {
    throw new Error('after app:language→he, storage line must re-render in Hebrew with the recommended verdict. Got: ' + JSON.stringify(rendered));
  }
});

console.log('');
console.log('Round-5 Change-3 optimize-verdict tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);

})();
