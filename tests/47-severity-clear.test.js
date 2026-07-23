/**
 * tests/47-severity-clear.test.js
 *
 * BEHAVIOR: the shared severity widget supports tap-again-to-clear — tapping
 * the currently-active pill deselects it back to unrated (dataset.value "",
 * onChange(null)), so a mis-tap is always reversible. No extra pill, no marker
 * constant; getSeverityValue stays null-correct.
 *
 *   (a) a fresh scale renders exactly 11 .severity-button elements (0..10).
 *   (b) clicking an unselected pill selects it (dataset.value, onChange Number).
 *   (c) clicking the ACTIVE pill again clears it (dataset.value "", no active,
 *       getSeverityValue null, onChange null).
 *   (d) clicking a different pill moves the selection (does not clear).
 *   (e) dataset.value round-trips: set → clear → set.
 *
 * Loads the REAL assets/app.js in jsdom and drives the exported severity pair.
 *
 * Run: node tests/47-severity-clear.test.js  — exit 0 = pass, 1 = fail.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const JSDOM = require('jsdom').JSDOM;

const REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://localhost/add-session.html',
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

if (typeof App.createSeverityScale !== 'function' || typeof App.getSeverityValue !== 'function') {
  console.error('FAIL: app.js did not expose the severity pair');
  process.exit(1);
}

function pill(scale, n) {
  return Array.prototype.find.call(
    scale.querySelectorAll('.severity-button'),
    (b) => b.textContent === String(n));
}

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

test('(a) fresh scale has exactly 11 severity-button elements', () => {
  const scale = App.createSeverityScale(null, function () {});
  assert.strictEqual(scale.querySelectorAll('.severity-button').length, 11);
});

test('(b) clicking pill 7 selects it and fires onChange with the Number', () => {
  let last;
  const scale = App.createSeverityScale(null, function (v) { last = v; });
  pill(scale, 7).click();
  assert.strictEqual(App.getSeverityValue(scale), 7, 'value reads 7');
  assert.strictEqual(last, 7, 'onChange received Number 7');
  assert.ok(pill(scale, 7).classList.contains('is-active'), 'pill 7 is active');
});

test('(c) clicking the active pill again clears back to unrated', () => {
  const calls = [];
  const scale = App.createSeverityScale(null, function (v) { calls.push(v); });
  pill(scale, 7).click();
  pill(scale, 7).click();
  assert.strictEqual(scale.dataset.value, '', 'dataset.value cleared to ""');
  assert.strictEqual(App.getSeverityValue(scale), null, 'getSeverityValue null when unrated');
  const anyActive = Array.prototype.some.call(
    scale.querySelectorAll('.severity-button'), (b) => b.classList.contains('is-active'));
  assert.strictEqual(anyActive, false, 'no pill remains active');
  assert.deepStrictEqual(calls, [7, null], 'onChange fired 7 then null');
});

test('(d) clicking a different pill moves the selection (no clear)', () => {
  const calls = [];
  const scale = App.createSeverityScale(null, function (v) { calls.push(v); });
  pill(scale, 7).click();
  pill(scale, 3).click();
  assert.strictEqual(App.getSeverityValue(scale), 3, 'selection moved to 3');
  assert.ok(pill(scale, 3).classList.contains('is-active'), 'pill 3 active');
  assert.ok(!pill(scale, 7).classList.contains('is-active'), 'pill 7 no longer active');
  assert.deepStrictEqual(calls, [7, 3], 'onChange fired 7 then 3 (no null)');
});

test('(e) dataset.value round-trips set → clear → set', () => {
  const scale = App.createSeverityScale(null, function () {});
  pill(scale, 5).click();
  assert.strictEqual(scale.dataset.value, '5');
  pill(scale, 5).click();
  assert.strictEqual(scale.dataset.value, '');
  pill(scale, 2).click();
  assert.strictEqual(scale.dataset.value, '2');
  assert.strictEqual(App.getSeverityValue(scale), 2);
});

test('(f) initialValue Number pre-selects; null leaves all unselected', () => {
  const preset = App.createSeverityScale(4, function () {});
  assert.strictEqual(App.getSeverityValue(preset), 4, 'preset reads 4');
  assert.ok(pill(preset, 4).classList.contains('is-active'));
  const empty = App.createSeverityScale(null, function () {});
  const anyActive = Array.prototype.some.call(
    empty.querySelectorAll('.severity-button'), (b) => b.classList.contains('is-active'));
  assert.strictEqual(anyActive, false, 'null initial leaves all unselected');
});

console.log('');
console.log('47-severity-clear — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
