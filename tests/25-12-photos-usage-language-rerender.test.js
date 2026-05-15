/**
 * Phase 25 Plan 12 (post-UAT fix) — Bug 4: the Photos-tab storage line
 * (#photosStorageUsage) must RE-RENDER when the user switches language
 * via the language picker.
 *
 * Reproduction (Ben, 2026-05-15, Safari UAT):
 *   1. Open Settings → Photos in Hebrew → storage line says
 *      "התמונות תופסות 21.2 KB מאחסון הדפדפן."
 *   2. Switch to English via the globe icon → other UI strings
 *      re-translate (settings.tab.photos, photos.heading, etc.) but
 *      the storage line STAYS IN HEBREW.
 *
 * Root cause: refreshPhotosTab (settings.js:2293) calls
 *   `usageEl.removeAttribute('data-i18n')`
 * to allow `usageEl.textContent` to be set directly to the substituted
 * Hebrew string. But App.setLanguage() → applyTranslations() walks only
 * `[data-i18n]` nodes; since #photosStorageUsage has no data-i18n after
 * the first render, it is never re-translated.
 *
 * Required fix: refreshPhotosTab must run when the language changes.
 * The standard re-render hook is the `app:language` CustomEvent that
 * setLanguage() dispatches on document.
 *
 * Acceptable fix shapes:
 *   A. `document.addEventListener('app:language', refreshPhotosTab)` in
 *      bindPhotosTab.
 *   B. Equivalent: a single listener that calls refreshPhotosTab() (or
 *      any rebuild function that resolves through tt('photos.usage.body')).
 *
 * This test asserts both the SOURCE wiring and the RUNTIME behavior.
 *
 * MUST FAIL before the fix:
 *   - source-grep: no `app:language` listener exists in the photos-tab
 *     IIFE (settings.js lines 2210-2506).
 *   - runtime: after firing the synthetic app:language event,
 *     usageEl.textContent still contains the original-language string.
 *
 * Run: node tests/25-12-photos-usage-language-rerender.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const settingsSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings.js'), 'utf8');

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

// ────────────────────────────────────────────────────────────────────
// SOURCE GATE
//
// The photos-tab IIFE (which contains refreshPhotosTab + handleOptimize
// + bindPhotosTab) MUST register an `app:language` listener so the
// storage line is re-rendered on language change.
// ────────────────────────────────────────────────────────────────────

test('Source: photos-tab IIFE registers an app:language listener', () => {
  // Find the photos-tab IIFE start. We look for the bindPhotosTab
  // function declaration as our anchor — it's unique to this IIFE.
  const anchor = settingsSrc.indexOf('function bindPhotosTab');
  if (anchor === -1) throw new Error('bindPhotosTab not found in settings.js');
  // The IIFE ends with `})();` followed by a newline. Find it.
  const tail = settingsSrc.slice(anchor);
  const iifeEnd = tail.indexOf('})();');
  if (iifeEnd === -1) throw new Error('photos-tab IIFE closing `})();` not located');
  const photosIIFE = tail.slice(0, iifeEnd);

  // Require an addEventListener('app:language', ...) within this IIFE.
  if (!/addEventListener\(\s*['"]app:language['"]/.test(photosIIFE)) {
    throw new Error(
      "no addEventListener('app:language', ...) in the photos-tab IIFE.\n" +
      '        refreshPhotosTab must be re-invoked when the language changes,\n' +
      '        because it sets usageEl.textContent directly and removes the\n' +
      '        data-i18n attribute — applyTranslations() will not re-render\n' +
      '        the storage line otherwise.'
    );
  }
});

// ────────────────────────────────────────────────────────────────────
// RUNTIME BEHAVIOR GATE
//
// Mount the photos UI in a vm sandbox; provide an App.t spy that
// returns different translations based on a `currentLang` global. Drive
// the initial DOMContentLoaded → refreshPhotosTab → assert the storage
// line has the Hebrew translation. Then flip currentLang to 'en',
// dispatch the `app:language` event, and assert the storage line text
// is now the English translation (no Hebrew remnant).
// ────────────────────────────────────────────────────────────────────

function makeNode(id) {
  const listeners = new Map();
  const attrs = new Map();
  const node = {
    id,
    _listeners: listeners,
    _attributes: attrs,
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
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    appendChild() {},
    focus() {}, blur() {}, style: {},
  };
  return node;
}

function makeSandbox(translations, currentLangRef) {
  const elements = new Map();
  const ids = [
    'photosOptimizeBtn', 'photosDeleteAllBtn', 'photosStorageUsage',
    'photosEmpty', 'photosOptimizePreview', 'photosOptimizeSection',
    'photosDeleteAllSection',
  ];
  for (const id of ids) elements.set(id, makeNode(id));

  const docListeners = new Map();
  const document = {
    addEventListener(type, fn) {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
    },
    removeEventListener() {},
    getElementById(id) { return elements.has(id) ? elements.get(id) : null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement(tag) { return makeNode('__synthetic_' + tag); },
    body: makeNode('__body'),
    head: makeNode('__head'),
    documentElement: makeNode('__html'),
    readyState: 'complete',
    _fireReady() {
      const arr = docListeners.get('DOMContentLoaded') || [];
      for (let i = 0; i < arr.length; i++) try { arr[i]({}); } catch (_) {}
    },
    _fireLanguage(lang) {
      const arr = docListeners.get('app:language') || [];
      const ev = { detail: { lang } };
      for (let i = 0; i < arr.length; i++) try { arr[i](ev); } catch (_) {}
    },
  };

  const storage = (() => {
    const m = new Map();
    return { getItem: k => m.has(String(k)) ? m.get(String(k)) : null, setItem: (k,v) => m.set(String(k),String(v)), removeItem: k => m.delete(String(k)), clear: () => m.clear() };
  })();

  const PortfolioDB = {
    getAllClients: () => Promise.resolve([{ id: 'c1', photoData: 'data:image/jpeg;base64,' + 'A'.repeat(50000) }]),
    estimatePhotosBytes: (clients) => {
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
    updateClient: () => Promise.resolve(),
  };

  const App = {
    showToast: () => {},
    t: (key) => {
      const bag = translations[currentLangRef.value] || {};
      return Object.prototype.hasOwnProperty.call(bag, key) ? bag[key] : key;
    },
    confirmDialog: () => Promise.resolve(false),
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
  sandbox.window.App = App;
  sandbox.App = App;
  sandbox.window.PortfolioDB = PortfolioDB;
  sandbox.PortfolioDB = PortfolioDB;
  sandbox.window.BackupManager = { canEnableSchedule: () => true, isAutoBackupSupported: () => true, checkBackupSchedule: () => {} };
  sandbox.BackupManager = sandbox.window.BackupManager;
  sandbox.window.CropModule = { resizeToMaxDimension: () => Promise.resolve({ size: 0 }) };
  sandbox.CropModule = sandbox.window.CropModule;
  sandbox.window.Snippets = { getPrefix: () => '!', setPrefix: () => {} };
  sandbox.Snippets = sandbox.window.Snippets;
  sandbox.window.SNIPPETS_SEED = [];
  sandbox.SNIPPETS_SEED = [];
  sandbox.window.I18N = { en: {}, he: {}, de: {}, cs: {} };
  sandbox.I18N = sandbox.window.I18N;
  sandbox.BroadcastChannel = function () { return { postMessage() {}, close() {}, addEventListener() {} }; };

  vm.createContext(sandbox);
  vm.runInContext(settingsSrc, sandbox, { filename: 'assets/settings.js' });
  document._fireReady();

  return { sandbox, document, elements };
}

(async function runAll() {

await test('Runtime: storage line re-renders to EN when app:language fires after initial HE render', async () => {
  // Phase 25 round-5 supersession (Change 3, 2026-05-15): the storage
  // line is now a 3-tier verdict (photos.usage.compact/.optional/.
  // recommended) selected by estimatePhotoSavings. The app:language
  // RE-RENDER LIFECYCLE contract this test guards is unchanged — only
  // the resolved key set widened. Provide every verdict key in both
  // locales so whichever tier the test photo selects has a HE + EN value.
  const heUsage = 'התמונות תופסות {size} מאחסון הדפדפן.';
  const enUsage = 'Photos use {size} of your browser storage.';
  const translations = {
    he: {
      'photos.usage.body': heUsage,
      'photos.usage.compact': heUsage + ' כבר קומפקטיות.',
      'photos.usage.optional': heUsage + ' אפשר לפנות {savings}.',
      'photos.usage.recommended': heUsage + ' מומלץ לפנות {savings}.',
    },
    en: {
      'photos.usage.body': enUsage,
      'photos.usage.compact': enUsage + ' Already compact.',
      'photos.usage.optional': enUsage + ' Optimizing could free about {savings}.',
      'photos.usage.recommended': enUsage + ' Optimizing could free about {savings}.',
    },
  };
  const currentLangRef = { value: 'he' };
  const ctx = makeSandbox(translations, currentLangRef);

  // Drain initial refreshPhotosTab.
  await new Promise(r => setTimeout(r, 30));
  const usageEl = ctx.elements.get('photosStorageUsage');
  if (!usageEl) throw new Error('photosStorageUsage element not mounted');

  // Assert initial render uses Hebrew.
  if (usageEl.textContent.indexOf('התמונות תופסות') === -1) {
    throw new Error('initial render did not use Hebrew translation. Got: "' + usageEl.textContent + '"');
  }

  // Flip language to English and fire the app:language event.
  currentLangRef.value = 'en';
  ctx.document._fireLanguage('en');
  await new Promise(r => setTimeout(r, 30));

  // Assert the storage line is now in English with no Hebrew remnant.
  if (usageEl.textContent.indexOf('התמונות') !== -1) {
    throw new Error(
      'storage line still contains Hebrew text after language switch to EN.\n' +
      '        Got: "' + usageEl.textContent + '"\n' +
      '        Expected an English translation like "Photos use ... of your browser storage."'
    );
  }
  if (usageEl.textContent.indexOf('Photos use') === -1 && usageEl.textContent.indexOf('browser storage') === -1) {
    throw new Error(
      'storage line did not switch to English. Got: "' + usageEl.textContent + '"'
    );
  }
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log('Plan 25-12 photos-usage-language-rerender tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);

})();
