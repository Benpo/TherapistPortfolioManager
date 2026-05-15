/**
 * Phase 25 round-5 post-UAT — Change 2 (C1): the delete-all-photos
 * confirm body must read as TWO visually separate lines, Ben's exact
 * wording, in all 4 locales.
 *
 *   he  line 1: פעולה זו תסיר את תמונות כלל הלקוחות באפליקציה, כאשר שאר פרטי הלקוחות ישמרו.
 *       line 2: תמונות שנמחקו לא ניתן לשחזר.
 *   en  line 1: This will remove all client photos from the app. All other client details are kept.
 *       line 2: Deleted photos cannot be recovered.
 *   de + cs: faithful translation of the new EN copy, same register.
 *
 * The confirm dialog renders body text via .textContent (App.confirmDialog
 * in assets/app.js). Two visual lines therefore require a `\n` line
 * separator in the i18n string AND `.confirm-body { white-space: pre-line }`
 * so the newline is honored. This test asserts BOTH:
 *
 *   1. i18n content (4 locales): photos.deleteAll.confirm.body contains a
 *      `\n` AND both sentences (a non-empty segment before and after the
 *      newline). EN/HE assert Ben's EXACT sentences.
 *   2. Render behavior: app.css `.confirm-body` declares
 *      `white-space: pre-line` (or pre-wrap) so the `\n` produces two
 *      visual lines (textContent + pre-line == two rendered lines).
 *   3. Runtime: App.confirmDialog, given messageKey
 *      photos.deleteAll.confirm.body, sets #confirmMessage.textContent to
 *      a string that contains the newline (the dialog renderer does not
 *      strip it).
 *
 * MUST FAIL before the fix: the current single-sentence bodies contain
 * no `\n`; .confirm-body has no white-space declaration.
 *
 * Run: node tests/25-12-deleteall-confirm-split.test.js
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

// ── Load all 4 i18n bundles ─────────────────────────────────────────
const i18nSandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
i18nSandbox.window.I18N = {};
i18nSandbox.window.QUOTES = {};
vm.createContext(i18nSandbox);
for (const f of ['i18n-en.js', 'i18n-he.js', 'i18n-de.js', 'i18n-cs.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8'), i18nSandbox, { filename: 'assets/' + f });
}
const I18N = i18nSandbox.window.I18N;

const KEY = 'photos.deleteAll.confirm.body';
const LOCALES = ['en', 'he', 'de', 'cs'];

// Exact sentences Ben dictated.
const HE_L1 = 'פעולה זו תסיר את תמונות כלל הלקוחות באפליקציה, כאשר שאר פרטי הלקוחות ישמרו.';
const HE_L2 = 'תמונות שנמחקו לא ניתן לשחזר.';
const EN_L1 = 'This will remove all client photos from the app. All other client details are kept.';
const EN_L2 = 'Deleted photos cannot be recovered.';

// ── 1. i18n parity + newline + both sentences ───────────────────────
for (const l of LOCALES) {
  test('i18n: ' + KEY + ' exists, is non-empty, contains a \\n line separator (' + l + ')', () => {
    const v = I18N[l] && I18N[l][KEY];
    assert.strictEqual(typeof v, 'string', KEY + ' missing in i18n-' + l + '.js');
    assert.ok(v.length > 0, KEY + ' empty in i18n-' + l + '.js');
    assert.ok(v.indexOf('\n') !== -1,
      KEY + ' in ' + l + ' must contain a \\n so it renders as two lines — got: ' + JSON.stringify(v));
    const segs = v.split('\n').map(s => s.trim()).filter(Boolean);
    assert.ok(segs.length >= 2,
      KEY + ' in ' + l + ' must have two non-empty lines — got segments: ' + JSON.stringify(segs));
  });
}

test('i18n: EN delete-all body is Ben\'s exact two sentences', () => {
  const v = I18N.en[KEY];
  const segs = v.split('\n').map(s => s.trim()).filter(Boolean);
  assert.strictEqual(segs[0], EN_L1, 'EN line 1 mismatch — got: ' + JSON.stringify(segs[0]));
  assert.strictEqual(segs[1], EN_L2, 'EN line 2 mismatch — got: ' + JSON.stringify(segs[1]));
});

test('i18n: HE delete-all body is Ben\'s exact two sentences', () => {
  const v = I18N.he[KEY];
  const segs = v.split('\n').map(s => s.trim()).filter(Boolean);
  assert.strictEqual(segs[0], HE_L1, 'HE line 1 mismatch — got: ' + JSON.stringify(segs[0]));
  assert.strictEqual(segs[1], HE_L2, 'HE line 2 mismatch — got: ' + JSON.stringify(segs[1]));
});

test('i18n: DE + CS bodies are two distinct non-empty lines (faithful translation register)', () => {
  for (const l of ['de', 'cs']) {
    const segs = I18N[l][KEY].split('\n').map(s => s.trim()).filter(Boolean);
    assert.ok(segs.length >= 2 && segs[0].length > 5 && segs[1].length > 5,
      l + ' delete-all body must be two real sentences — got: ' + JSON.stringify(segs));
    // The second line should be the short "cannot be recovered" sentence —
    // shorter than the first (sanity that it isn't a duplicated paragraph).
    assert.ok(segs[1].length < segs[0].length,
      l + ' line 2 ("cannot be recovered") should be shorter than line 1 — got: ' + JSON.stringify(segs));
  }
});

// ── 2. .confirm-body honors the newline (white-space: pre-line) ─────
test('CSS: .confirm-body declares white-space: pre-line (so \\n renders as two visual lines)', () => {
  const css = fs.readFileSync(path.join(ROOT, 'assets', 'app.css'), 'utf8');
  // Find the .confirm-body rule body.
  const m = css.match(/\.confirm-body\s*\{([^}]*)\}/);
  assert.ok(m, '.confirm-body rule not found in app.css');
  const body = m[1];
  assert.ok(/white-space\s*:\s*pre-line/.test(body) || /white-space\s*:\s*pre-wrap/.test(body),
    '.confirm-body must declare white-space: pre-line (or pre-wrap) so a \\n in the i18n body renders as two visual lines — rule body: ' + JSON.stringify(body));
});

// ── 3. Runtime: confirmDialog keeps the newline in #confirmMessage ──
test('Runtime: App.confirmDialog renders the delete-all body with the newline intact in #confirmMessage', () => {
  // Module-top-level `App.foo = ...` augmentations don't auto-alias from
  // window.App in a vm context — rewrite them (same pattern as
  // tests/25-04-banner-suppression.test.js).
  const appSrc = fs.readFileSync(path.join(ROOT, 'assets', 'app.js'), 'utf8')
    .replace(/^App\./gm, 'window.App.');

  // Minimal DOM: a #confirmModal with the four sub-nodes confirmDialog uses.
  function el(id) {
    const node = {
      id, _txt: '', _attrs: new Map(),
      classList: { _s: new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, contains(c){return this._s.has(c);} },
      get textContent() { return this._txt; },
      set textContent(v) { this._txt = String(v); },
      setAttribute(k, v) { this._attrs.set(k, String(v)); },
      getAttribute(k) { return this._attrs.has(k) ? this._attrs.get(k) : null; },
      removeAttribute(k) { this._attrs.delete(k); },
      hasAttribute(k) { return this._attrs.has(k); },
      addEventListener() {}, removeEventListener() {},
      querySelector(sel) { return modalChildren[sel] || null; },
      focus() {}, blur() {}, style: {},
    };
    return node;
  }
  const title = el('confirmTitle');
  const message = el('confirmMessage');
  const okBtn = el('confirmOkBtn');
  const cancelBtn = el('confirmCancelBtn');
  const overlay = el('overlay');
  const modalChildren = {
    '#confirmTitle': title, '#confirmMessage': message,
    '#confirmOkBtn': okBtn, '#confirmCancelBtn': cancelBtn, '.modal-overlay': overlay,
  };
  const allChildren = [title, message, okBtn, cancelBtn];
  const modal = el('confirmModal');
  modal.querySelector = (sel) => modalChildren[sel] || null;
  // applyTranslations(modal) walks [data-i18n] / [data-i18n-placeholder].
  modal.querySelectorAll = (sel) => {
    if (sel === '[data-i18n]') return allChildren.filter(c => c._attrs.has('data-i18n'));
    if (sel === '[data-i18n-placeholder]') return allChildren.filter(c => c._attrs.has('data-i18n-placeholder'));
    return [];
  };

  const elements = { confirmModal: modal };
  const document = {
    getElementById: (id) => elements[id] || null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener: () => {}, removeEventListener: () => {},
    createElement: () => el('synthetic'),
    body: el('body'), head: el('head'), documentElement: el('html'),
  };

  // applyTranslations resolves data-i18n → EN locale string. We model the
  // exact production behavior: textContent = i18n value.
  const lang = 'en';
  const win = {};
  const sandbox = {
    window: win, document,
    localStorage: { getItem: () => lang, setItem() {}, removeItem() {} },
    navigator: { language: 'en' },
    I18N,
    console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, Promise, JSON, Math, Date, Array, Object, Set, Map, RegExp, String, Number, Boolean, Symbol, Error,
  };
  win.I18N = I18N; win.document = document; win.localStorage = sandbox.localStorage;
  win.addEventListener = () => {}; win.removeEventListener = () => {};
  win.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  vm.createContext(sandbox);
  try {
    vm.runInContext(appSrc, sandbox, { filename: 'assets/app.js' });
  } catch (e) {
    throw new Error('assets/app.js failed to load in sandbox: ' + e.message);
  }

  const App = win.App || sandbox.window.App;
  assert.ok(App && typeof App.confirmDialog === 'function', 'App.confirmDialog must be exposed');

  // Fire the dialog (don't await — we only inspect the synchronous render).
  App.confirmDialog({
    titleKey: 'photos.deleteAll.confirm.title',
    messageKey: KEY,
    confirmKey: 'photos.deleteAll.confirm.yes',
    cancelKey: 'confirm.cancel',
    tone: 'danger',
  });

  const rendered = message.textContent || '';
  assert.ok(rendered.indexOf('\n') !== -1,
    '#confirmMessage textContent must contain the \\n from the i18n body (renderer must not strip it). Got: ' + JSON.stringify(rendered));
  assert.ok(rendered.indexOf(EN_L1) !== -1 && rendered.indexOf(EN_L2) !== -1,
    '#confirmMessage must contain both EN sentences. Got: ' + JSON.stringify(rendered));
});

console.log('');
console.log('Round-5 C1 deleteall-confirm-split tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
