/**
 * tests/38-12-toast-tone-focus.test.js — showToast ERROR TONE + FOCUS behavior
 * (Plan 38-12, NEXT-08 / UAT test 8). Authored BEFORE the API lands — RED-BY-DESIGN.
 *
 * THE DEFECT (UAT test 8): App.showToast is single-style — success AND error
 * render identically (same corner pill, same 1.8s auto-dismiss, no focus side
 * effect). The 38-09 incomplete-date block reused it, so the block warning looks
 * exactly like "saved successfully" and is physically far from the offending
 * field. Nobody notices the block.
 *
 * THE API UNDER TEST (Ben's confirmed direction 2026-07-07): showToast gains a
 * backward-compatible THIRD options param { tone, focus }:
 *   - options.tone === "error"  ⇒ adds the "toast--error" class and uses a
 *     LONGER auto-dismiss than the 1800ms success default (the warning lingers).
 *   - options.focus (an element) ⇒ scrollIntoView() + focus() so the offending
 *     field is brought into view and focused.
 *   - Absent/undefined options ⇒ byte-for-byte the CURRENT behavior (single
 *     style, 1800ms, no focus).
 *
 * This is GENUINE RUNTIME BEHAVIOR (class toggling, timer duration, focus/scroll
 * side effects), so per MEMORY `feedback-behavior-verification` it EXECUTES the
 * real showToast in a vm sandbox (mirrors tests/37-date-format.test.js loadEngine
 * — same `.replace(/^App\./gm, 'window.App.')` app.js load) and asserts on
 * observed effects, never on source text.
 *
 * WHY IT IS RED TODAY: showToast(message, key) ignores a third arg, never adds
 * "toast--error", always schedules 1800ms, and never focuses. Scenario 1's error
 * assertions therefore fail cleanly at the assertion (not a harness error).
 *
 * FALSIFIABILITY:
 *   - Scenario 1 rejects a no-op impl: it demands the error class, a strictly
 *     longer duration, AND both focus + scrollIntoView on the target.
 *   - Scenario 2 rejects an impl that leaks error tone / focus onto the default
 *     path: the plain success toast MUST keep 1800ms, no error class, no focus.
 *   - Scenario 3 rejects a signature break: the legacy 1-arg (message-only) path
 *     must still set textContent and never throw.
 *
 * Read-only: EVALS assets/* into an isolated vm sandbox; writes no assets/*.
 *
 * Run: node tests/38-12-toast-tone-focus.test.js
 * Exits 0 on full pass, 1 on any failure (RED until Plan 38-12 Task 2 lands).
 */

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

// A minimal classList backed by a real Set so add/remove/contains actually
// track state (the base .toast keeps "is-visible"; the error tone adds
// "toast--error"). Variadic add/remove mirror the DOM API.
function makeClassList() {
  var set = new Set();
  return {
    add: function () { for (var i = 0; i < arguments.length; i++) set.add(arguments[i]); },
    remove: function () { for (var i = 0; i < arguments.length; i++) set.delete(arguments[i]); },
    contains: function (c) { return set.has(c); },
    toggle: function () {},
    _set: set,
  };
}

// A focus target that records how many times it was scrolled into view / focused.
function makeFieldSpy() {
  var calls = { focus: 0, scrollIntoView: 0 };
  return {
    node: {
      focus: function () { calls.focus++; },
      scrollIntoView: function () { calls.scrollIntoView++; },
    },
    calls: calls,
  };
}

// Build a fresh vm sandbox, eval date-format.js (if present) then app.js, and
// return the real App plus the toast node and a recorder of every scheduled
// setTimeout delay. A fresh sandbox per scenario keeps state isolated.
function loadShowToast() {
  var toast = { textContent: '', classList: makeClassList() };
  var recordedDelays = [];

  var documentStub = {
    getElementById: function (id) { return id === 'toast' ? toast : null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    documentElement: { lang: '', setAttribute: function () {} },
    body: { classList: { add: function () {}, remove: function () {} }, prepend: function () {}, style: {}, dataset: {} },
    head: { appendChild: function () {} },
    createElement: function () {
      return { style: {}, classList: makeClassList(), appendChild: function () {}, append: function () {}, prepend: function () {}, setAttribute: function () {}, getAttribute: function () { return null; }, addEventListener: function () {}, removeEventListener: function () {} };
    },
    addEventListener: function () {}, removeEventListener: function () {}, dispatchEvent: function () { return true; },
  };
  var storage = (function () {
    var m = new Map();
    return { getItem: function (k) { return m.has(k) ? m.get(k) : null; }, setItem: function (k, v) { m.set(k, String(v)); }, removeItem: function (k) { m.delete(k); }, clear: function () { m.clear(); } };
  })();
  // setTimeout spy: records the delay arg (so the test can read the scheduled
  // auto-dismiss duration) and returns a numeric id WITHOUT scheduling — the
  // auto-dismiss callback never needs to fire for these assertions, and this
  // keeps the process from lingering.
  var setTimeoutSpy = function (cb, delay) { recordedDelays.push(delay); return 0; };
  var clearTimeoutSpy = function () {};

  var sandbox = {
    window: { location: { href: '', search: '' }, scrollTo: function () {}, getComputedStyle: function () { return {}; } },
    document: documentStub,
    navigator: { serviceWorker: { addEventListener: function () {} }, storage: { persist: function () { return Promise.resolve(false); }, persisted: function () { return Promise.resolve(false); } }, userAgent: '' },
    localStorage: storage, sessionStorage: storage,
    PortfolioDB: { getAllSnippets: function () { return Promise.resolve([]); }, getAllTherapistSettings: function () { return Promise.resolve([]); } },
    BroadcastChannel: function () { this.addEventListener = function () {}; this.postMessage = function () {}; this.close = function () {}; },
    CustomEvent: function (t, i) { this.type = t; this.detail = i && i.detail; },
    Event: function (t) { this.type = t; },
    console: { log: function () {}, warn: function () {}, error: function () {} },
    setTimeout: setTimeoutSpy, clearTimeout: clearTimeoutSpy, queueMicrotask: queueMicrotask,
    Promise: Promise, JSON: JSON, Math: Math, Date: Date, Array: Array, Object: Object, Set: Set, Map: Map, RegExp: RegExp, String: String, Number: Number, Boolean: Boolean, Intl: Intl,
  };
  sandbox.window.localStorage = storage;
  sandbox.window.I18N = { en: {}, he: {}, de: {}, cs: {} }; // t() falls back to the key → echoes it
  sandbox.window.I18N_DEFAULT = 'en';
  vm.createContext(sandbox);

  var dfPath = path.join(REPO_ROOT, 'assets', 'date-format.js');
  if (fs.existsSync(dfPath)) {
    vm.runInContext(readAsset('assets/date-format.js'), sandbox, { filename: 'assets/date-format.js' });
  }
  var src = readAsset('assets/app.js').replace(/^App\./gm, 'window.App.');
  vm.runInContext(src, sandbox, { filename: 'assets/app.js' });

  var App = sandbox.window.App;
  if (!App || typeof App.showToast !== 'function') {
    throw new Error('app.js did not expose App.showToast');
  }
  return { App: App, toast: toast, recordedDelays: recordedDelays };
}

function lastDelay(env) { return env.recordedDelays[env.recordedDelays.length - 1]; }

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ── Scenario 1: error tone + focus ───────────────────────────────────────────
test('ERROR TONE + FOCUS: tone "error" adds toast--error, lingers >1800ms, focuses + scrolls the field', function () {
  var env = loadShowToast();
  var field = makeFieldSpy();
  env.recordedDelays.length = 0; // ignore any eval-time timers
  env.App.showToast('', 'toast.nextSessionDateIncomplete', { tone: 'error', focus: field.node });

  assert.strictEqual(env.toast.classList.contains('toast--error'), true,
    'error toast must add the "toast--error" class (RED until Task 2 lands the tone param)');
  var d = lastDelay(env);
  assert.strictEqual(typeof d, 'number', 'an auto-dismiss delay must be scheduled');
  assert.ok(d > 1800,
    'error toast must linger STRICTLY longer than the 1800ms success toast, got ' + d);
  assert.strictEqual(field.calls.focus, 1,
    'the focus target must be focused exactly once, got ' + field.calls.focus);
  assert.ok(field.calls.scrollIntoView >= 1,
    'the focus target must be scrolled into view, got ' + field.calls.scrollIntoView + ' calls');
});

// ── Scenario 2: default success toast unchanged ──────────────────────────────
test('DEFAULT UNCHANGED: a plain success toast keeps 1800ms, no toast--error class, no focus side effect', function () {
  var env = loadShowToast();
  env.recordedDelays.length = 0;
  env.App.showToast('', 'toast.sessionSaved'); // no options

  assert.strictEqual(env.toast.classList.contains('toast--error'), false,
    'the default success toast must NOT carry the error class');
  assert.strictEqual(lastDelay(env), 1800,
    'the default success toast must keep the 1800ms auto-dismiss, got ' + lastDelay(env));
  // No focus target was passed, so any focus/scroll would be a leak; the class +
  // duration assertions above are the falsifiable "unchanged" guard.
});

// ── Scenario 3: backward-compat message-only path ────────────────────────────
test('BACKWARD COMPAT: showToast("hello world") sets textContent and does not throw', function () {
  var env = loadShowToast();
  env.App.showToast('hello world');
  assert.strictEqual(env.toast.textContent, 'hello world',
    'the legacy 1-arg (message-only) path must still render the raw message');
});

// ── count guard (vacuous-green trap) ─────────────────────────────────────────
var EXPECTED_COUNT = 3;
if (passed + failed !== EXPECTED_COUNT) {
  console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED_COUNT + ' scenarios to execute, but ' +
    (passed + failed) + ' ran.');
  process.exit(1);
}

console.log('');
console.log('Plan 38-12 toast tone+focus tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
