/**
 * tests/47-order-sanitize.test.js
 *
 * BEHAVIOR: App.sanitizeOrder is the single clamp + allowlist + append-missing
 * validator, and App.getSectionOrder / pinSectionOrder / flattenOrderKeys read
 * a sanitized order synchronously with a page-pinned snapshot.
 *
 *   - sanitizeOrder leaves a legal order untouched (afterSeverity after issues).
 *   - sanitizeOrder moves afterSeverity to immediately after issues when it precedes it.
 *   - sanitizeOrder drops unknown section keys and empty groups.
 *   - sanitizeOrder given null/non-array/malformed input returns a deep copy of DEFAULT_SECTION_ORDER.
 *   - sanitizeOrder appends KNOWN sections/groups missing from a partial input at their default slots.
 *   - getSectionOrder returns a defensive copy (mutation never corrupts the cache).
 *   - pinSectionOrder freezes a snapshot; a later cache refresh cannot change getSectionOrder.
 *   - flattenOrderKeys yields the section keys, groups flattened, group ids absent.
 *
 * Loads the REAL assets/app.js in jsdom (no boot) and drives the exported
 * App.* functions directly. Mirrors the 30-form-dirty-revert app-load pattern.
 *
 * Run: node tests/47-order-sanitize.test.js  — exit 0 = pass, 1 = fail.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const JSDOM = require('jsdom').JSDOM;

const REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://localhost/settings.html',
  runScripts: 'outside-only',
  pretendToBeVisual: false,
});
const win = dom.window;
win.matchMedia = function () {
  return { matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
};
win.I18N_DEFAULT = 'en';
win.eval(readAsset('assets/app.js'));
const App = win.App;

for (const fn of ['sanitizeOrder', 'getSectionOrder', 'pinSectionOrder', 'flattenOrderKeys', 'refreshSectionOrderCache']) {
  if (typeof App[fn] !== 'function') {
    console.error('FAIL: App.' + fn + ' is not exported.');
    process.exit(1);
  }
}
if (!Array.isArray(App.DEFAULT_SECTION_ORDER)) { console.error('FAIL: App.DEFAULT_SECTION_ORDER missing'); process.exit(1); }
if (!App.GROUP_DEFAULT_TITLE_KEYS) { console.error('FAIL: App.GROUP_DEFAULT_TITLE_KEYS missing'); process.exit(1); }

function topKeys(order) {
  return order.filter((o) => o.type === 'section').map((o) => o.key);
}
function groupIds(order) {
  return order.filter((o) => o.type === 'group').map((o) => o.id);
}

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async () => {

// ---- sanitizeOrder ---------------------------------------------------------

await test('legal order (afterSeverity after issues) preserved', () => {
  const input = [
    { type: 'section', key: 'issues' },
    { type: 'section', key: 'afterSeverity' },
  ];
  const out = App.sanitizeOrder(input);
  const keys = topKeys(out);
  assert.ok(keys.indexOf('issues') < keys.indexOf('afterSeverity'), 'issues before afterSeverity');
});

await test('afterSeverity before issues is clamped to just after issues', () => {
  const out = App.sanitizeOrder([
    { type: 'section', key: 'afterSeverity' },
    { type: 'section', key: 'issues' },
  ]);
  const keys = topKeys(out);
  assert.ok(keys.indexOf('issues') < keys.indexOf('afterSeverity'),
    'issues must precede afterSeverity after clamp; got ' + JSON.stringify(keys));
  assert.strictEqual(keys.indexOf('afterSeverity'), keys.indexOf('issues') + 1,
    'afterSeverity sits immediately after issues');
});

await test('unknown section key is dropped', () => {
  const out = App.sanitizeOrder([
    { type: 'section', key: '__evil__' },
    { type: 'section', key: 'issues' },
  ]);
  assert.ok(topKeys(out).indexOf('__evil__') === -1, 'garbage key dropped');
  assert.ok(topKeys(out).indexOf('issues') !== -1, 'known key kept');
});

await test('empty group (all members unknown) is dropped', () => {
  const out = App.sanitizeOrder([
    { type: 'group', id: 'emotionsTech', members: ['__x__', '__y__'] },
    { type: 'section', key: 'issues' },
  ]);
  // emotionsTech reappears via append-missing with its DEFAULT members (not the garbage ones)
  const grp = out.find((o) => o.type === 'group' && o.id === 'emotionsTech');
  assert.ok(grp, 'emotionsTech re-appended at default slot');
  assert.ok(grp.members.indexOf('__x__') === -1, 'garbage members not present');
  assert.ok(grp.members.indexOf('heartShield') !== -1, 'default members restored');
});

await test('null / non-array / malformed → deep copy of DEFAULT_SECTION_ORDER', () => {
  assert.deepStrictEqual(App.sanitizeOrder(null), App.DEFAULT_SECTION_ORDER);
  assert.deepStrictEqual(App.sanitizeOrder({}), App.DEFAULT_SECTION_ORDER);
  assert.deepStrictEqual(App.sanitizeOrder([]), App.DEFAULT_SECTION_ORDER);
  // and it is a COPY, not the same reference
  assert.notStrictEqual(App.sanitizeOrder(null), App.DEFAULT_SECTION_ORDER);
});

await test('partial order appends all missing knowns at default slots', () => {
  const out = App.sanitizeOrder([{ type: 'section', key: 'issues' }]);
  assert.ok(topKeys(out).indexOf('afterSeverity') !== -1, 'afterSeverity appended');
  assert.ok(groupIds(out).indexOf('emotionsTech') !== -1, 'emotionsTech appended');
  assert.ok(groupIds(out).indexOf('wrapup') !== -1, 'wrapup appended');
  // no known section is hidden — flattened keys cover the full default set
  const flat = App.flattenOrderKeys(out);
  App.flattenOrderKeys(App.DEFAULT_SECTION_ORDER).forEach((k) => {
    assert.ok(flat.indexOf(k) !== -1, 'default key present after append: ' + k);
  });
});

await test('a group present but missing a member gets the member re-appended', () => {
  const out = App.sanitizeOrder([
    { type: 'section', key: 'issues' },
    { type: 'group', id: 'emotionsTech', titleOverride: null, members: ['trapped'] },
    { type: 'section', key: 'afterSeverity' },
    { type: 'group', id: 'wrapup', titleOverride: null, members: ['comments', 'nextSession'] },
  ]);
  const grp = out.find((o) => o.type === 'group' && o.id === 'emotionsTech');
  assert.ok(grp.members.indexOf('heartShield') !== -1, 'missing default member restored');
  assert.ok(grp.members.indexOf('trapped') !== -1, 'user-kept member retained');
});

await test('no duplicate section keys after sanitize', () => {
  const out = App.sanitizeOrder([{ type: 'section', key: 'issues' }]);
  const flat = App.flattenOrderKeys(out);
  assert.strictEqual(new Set(flat).size, flat.length, 'no dup keys: ' + JSON.stringify(flat));
});

// ---- getSectionOrder / flattenOrderKeys ------------------------------------

await test('getSectionOrder returns a defensive copy', () => {
  const a = App.getSectionOrder();
  a.push({ type: 'section', key: 'issues' });
  a[0].key = 'MUTATED';
  const b = App.getSectionOrder();
  assert.notStrictEqual(b[0].key, 'MUTATED', 'mutation must not corrupt the cache');
  assert.notStrictEqual(b.length, a.length, 'pushed item must not persist');
});

await test('flattenOrderKeys flattens groups, drops group ids, top-level-then-member order', () => {
  const flat = App.flattenOrderKeys(App.DEFAULT_SECTION_ORDER);
  assert.strictEqual(flat[0], 'issues', 'issues first');
  assert.ok(flat.indexOf('emotionsTech') === -1, 'group id absent from flattened keys');
  assert.ok(flat.indexOf('heartShield') !== -1, 'group members flattened in');
  assert.ok(flat.indexOf('issues') < flat.indexOf('heartShield'), 'top-level issues before group members');
});

// ---- pinSectionOrder (page-pinned snapshot) --------------------------------

await test('pin freezes the snapshot against a later cache refresh', async () => {
  // Stub PortfolioDB to feed refreshSectionOrderCache a DIFFERENT stored order.
  const storedNow = { record: null };
  win.PortfolioDB = {
    getSectionOrderRecord: function () { return Promise.resolve(storedNow.record); },
  };

  // No pin, no cache → default order.
  await App.refreshSectionOrderCache();
  const beforePin = App.getSectionOrder();
  assert.ok(topKeys(beforePin).indexOf('issues') !== -1);

  // Pin the current (default) snapshot.
  App.pinSectionOrder();
  const pinned = App.getSectionOrder();

  // A peer tab changes the stored order; refresh the cache.
  storedNow.record = { sectionKey: 'sectionOrder', version: 1, items: [
    { type: 'section', key: 'afterSeverity' },
    { type: 'section', key: 'issues' },
  ] };
  await App.refreshSectionOrderCache();

  const afterRefresh = App.getSectionOrder();
  assert.deepStrictEqual(afterRefresh, pinned, 'pinned snapshot must survive a cache refresh');
});

  console.log('');
  console.log('47-order-sanitize — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => {
  console.error('FATAL test harness error:', err && err.stack || err);
  process.exit(1);
});
