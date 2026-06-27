/**
 * tests/30-save-redirect.test.js — add-session POST-SAVE REDIRECT destination
 * (GAP-06 replacement, TEST-03, D-07/D-08/D-09).
 *
 * ROOT CAUSE THIS CLOSES: the retired quick-260516-g7p fake re-implemented the
 * post-save navigation by reading the handler text out of assets/add-session.js
 * and modelling the redirect string itself — it never executed the module, so a
 * Phase-31 extraction that broke the real navigation would have kept that test
 * green. This test instead EXECUTES the real sessionForm submit handler
 * (assets/add-session.js:1683-1769) end to end and asserts the OBSERVABLE
 * redirect DESTINATION the handler actually assigns to window.location.href.
 *
 * THE BEHAVIOR PINNED (add-session.js:1746-1769): a successful new-session save
 *   const newId = await PortfolioDB.addSession({...});  // resolves a saved id
 *   savedId = newId;
 *   App.showToast("", "toast.sessionSaved");
 *   formSaving = true;
 *   setTimeout(() => { window.location.href =
 *       `./add-session.html?sessionId=${savedId}`; }, 600);
 * so 600ms after a real submit the page navigates BACK TO THE SAVED SESSION in
 * reading mode, and the destination is a FUNCTION of the id PortfolioDB.addSession
 * resolved — not a constant homepage URL. The assertion is the captured
 * destination URL, NOT merely that the save toast fired.
 *
 * WHY A vm-CONTEXTUALISED jsdom REALM (not win.eval): jsdom 29 makes
 * window.location a NON-configurable accessor whose href setter performs (an
 * unimplemented) real navigation — it cannot be redefined to record assignments
 * (verified: Object.defineProperty(win,'location',…) and redefining the href
 * accessor both throw "Cannot redefine property"). So to observe the redirect we
 * run the REAL assets/* modules with vm.runInContext over the jsdom document
 * through a thin global Proxy that overrides ONLY `location` (a settable href
 * recorder) and `setTimeout` (a 600ms-timer capturer); every other binding —
 * document, the DOM element classes, Event, the EventTarget methods — passes
 * straight through to the genuine jsdom realm. This is the faithful equivalent
 * of the 25-01-share-fallback / 29-03-report-wiring settable-location pattern,
 * applied to a jsdom-parsed page instead of a hand-built document.
 *
 * The 600ms redirect timer is made deterministic: the Proxy's setTimeout records
 * any 600ms callback into `capturedTimers` (every other delay passes through), so
 * the test runs the redirect callback ON DEMAND after the submit settles — the
 * generic 0ms settle() flush would never fire a 600ms timer.
 *
 * FALSIFIABLE (per feedback-behavior-verification — a behavior test must FAIL on
 * the regression it guards): change the redirect target in a scratch copy of
 * add-session.js (drop the `?sessionId=` query, or point at ./index.html) and the
 * destination assertion FAILS; restore it and it PASSES (mutation-kill G1,
 * recorded in 30-12-SUMMARY). Two distinct resolved ids produce two distinct
 * destinations, so a constant-URL regression also fails Case B. Renaming an
 * INTERNAL helper with no observable change keeps it GREEN (D-08/D-12).
 *
 * F-A (vacuous-green trap): the DOMContentLoaded + submit handlers are async;
 * guarded by capturing and awaiting the specific DOMContentLoaded handler,
 * settle()-ing the queue after each async-driven event, and an end-of-file count
 * guard asserting EXPECTED_COUNT cases ran.
 *
 * Read-only: this test EVALS assets/app.js + assets/add-session.js into an
 * isolated jsdom-backed vm realm; it never writes any assets/* production file
 * and never re-implements the navigation from the module text.
 *
 * Run: node tests/30-save-redirect.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var vm = require('vm');
var JSDOM = require('jsdom').JSDOM;

var createMockPortfolioDB = require('./_helpers/mock-portfolio-db').createMockPortfolioDB;
var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle(n) { for (var i = 0; i < (n || 10); i++) { await flush(); } }

// Window methods that MUST run with the real jsdom window as `this` (they are
// WebIDL EventTarget/timer methods that reject a foreign receiver). Bound to the
// real window and exposed through the Proxy so `window.addEventListener(...)` in
// the page code reaches the genuine jsdom implementation.
var WIN_BOUND_METHODS = [
  'addEventListener', 'removeEventListener', 'dispatchEvent',
  'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame',
  'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'matchMedia',
];

/**
 * Build a jsdom add-session.html page and run the REAL assets/* modules inside a
 * vm realm whose global is a Proxy over the jsdom window. The Proxy overrides
 * ONLY `location` (settable href recorder) and `setTimeout` (600ms capturer);
 * everything else delegates to the real jsdom window so the DOM behaves
 * natively.
 *
 * @param {number|string} savedId - the id PortfolioDB.addSession resolves, which
 *        the real handler interpolates into the redirect destination.
 */
function buildEnv(savedId) {
  var html = readAsset('add-session.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/add-session.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };

  // Settable location.href recorder (the 25-01/29-03 pattern). jsdom's own
  // location cannot be redefined, so it lives only inside the vm realm Proxy.
  var hrefAssignments = [];
  var myLocation = {};
  Object.defineProperty(myLocation, 'href', {
    get: function () { return hrefAssignments.length ? hrefAssignments[hrefAssignments.length - 1] : ''; },
    set: function (v) { hrefAssignments.push(String(v)); },
    configurable: true, enumerable: true,
  });

  // 600ms redirect-timer capturer; every other delay passes through to the real
  // timer so the page boots normally.
  var capturedRedirects = [];
  var realSetTimeout = win.setTimeout.bind(win);
  var overrides = {
    location: myLocation,
    setTimeout: function (cb, delay) {
      if (delay === 600) { capturedRedirects.push(cb); return 0; }
      return realSetTimeout(cb, delay);
    },
  };
  WIN_BOUND_METHODS.forEach(function (m) {
    if (typeof win[m] === 'function') { overrides[m] = win[m].bind(win); }
  });

  var fnCache = new WeakMap();
  function passThroughFn(fn) {
    if (fnCache.has(fn)) { return fnCache.get(fn); }
    // Wrap so `new Ctor(...)` still works while static props pass through.
    var wrapped = new Proxy(fn, {
      construct: function (t, a, nt) { return Reflect.construct(t, a, nt); },
    });
    fnCache.set(fn, wrapped);
    return wrapped;
  }

  var sandbox = new Proxy(win, {
    get: function (t, p) {
      if (Object.prototype.hasOwnProperty.call(overrides, p)) { return overrides[p]; }
      if (p === 'window' || p === 'self' || p === 'globalThis' || p === 'top' || p === 'parent') {
        return sandbox;
      }
      var v = t[p];
      return typeof v === 'function' ? passThroughFn(v) : v;
    },
    set: function (t, p, v) {
      if (p === 'location' || p === 'setTimeout') { overrides[p] = v; return true; }
      t[p] = v;
      return true;
    },
    has: function () { return true; },
  });
  vm.createContext(sandbox);

  // Eval the REAL app.js to obtain the coupled severity widget pair (its closure
  // binds THIS realm's document, so the issue rows it builds live in the page).
  sandbox.I18N_DEFAULT = 'en';
  vm.runInContext(readAsset('assets/app.js'), sandbox, { filename: 'assets/app.js' });
  var realApp = win.App;
  if (typeof realApp.createSeverityScale !== 'function' ||
      typeof realApp.getSeverityValue !== 'function') {
    throw new Error('assets/app.js did not expose the real createSeverityScale/getSeverityValue pair');
  }

  // Capture add-session.js's single DOMContentLoaded handler (do not dispatch it
  // blindly — it is async; the 25-06 capture-and-await pattern).
  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  // F-B: stub the App.* surface but inject the REAL severity pair so the issue
  // row builds and getIssuesPayload reads a real value.
  var appStub = createAppStub({
    createSeverityScale: realApp.createSeverityScale,
    getSeverityValue: realApp.getSeverityValue,
  });
  sandbox.App = appStub;

  // Spy DB whose addSession RESOLVES a known id (the shared mock resolves
  // undefined); the real handler interpolates that id into the redirect.
  var mockDb = createMockPortfolioDB({ clients: [], sessions: [] });
  var origAdd = mockDb.addSession;
  mockDb.addSession = function () {
    origAdd.apply(mockDb, arguments); // still records into __calls
    return Promise.resolve(savedId);
  };
  sandbox.PortfolioDB = mockDb;

  vm.runInContext(readAsset('assets/add-session.js'), sandbox, { filename: 'assets/add-session.js' });

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }

  return {
    dom: dom, win: win, app: appStub, mockDb: mockDb,
    domHandler: captured[0],
    hrefAssignments: hrefAssignments,
    runRedirectTimers: function () { capturedRedirects.forEach(function (cb) { cb(); }); },
    capturedRedirects: capturedRedirects,
  };
}

// Seed a valid client option + a date + a named issue so the real submit reaches
// PortfolioDB.addSession (the handler bails early on a missing client/date or an
// empty issue payload).
function seedValidForm(win) {
  var select = win.document.getElementById('clientSelect');
  var opt = win.document.createElement('option');
  opt.value = '1';
  opt.textContent = 'Test Client';
  select.appendChild(opt);
  select.value = '1';
  win.document.getElementById('sessionDate').value = '2026-06-01';
  var block = win.document.querySelector('#issueList .issue-block');
  block.querySelector('input.input').value = 'Anxiety';
}

function fireSubmit(win) {
  var form = win.document.getElementById('sessionForm');
  form.dispatchEvent(new win.Event('submit', { cancelable: true, bubbles: true }));
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// Drive a full new-session save and return the captured redirect destination.
async function captureRedirectFor(savedId) {
  var env = buildEnv(savedId);
  await env.domHandler();
  await settle();
  seedValidForm(env.win);
  fireSubmit(env.win);
  await settle();
  // The redirect lives in a 600ms timer — run it deterministically.
  env.runRedirectTimers();
  var result = {
    href: env.hrefAssignments.length ? env.hrefAssignments[env.hrefAssignments.length - 1] : null,
    timerCount: env.capturedRedirects.length,
    addSessionCalls: (env.mockDb.__calls.get('addSession') || []).length,
    toastKeys: (env.app.__calls.get('showToast') || []).map(function (a) { return a[1]; }),
  };
  env.dom.window.close();
  return result;
}

(async function () {
  // A. The destination is the saved session in reading mode, carrying the id
  //    PortfolioDB.addSession resolved.
  await test('a successful new-session save redirects window.location.href to ./add-session.html?sessionId=<resolved id> after the 600ms timer', async function () {
    var r = await captureRedirectFor(4242);
    assert.strictEqual(r.addSessionCalls, 1, 'a valid submit must call PortfolioDB.addSession exactly once');
    assert.strictEqual(r.timerCount, 1, 'the save handler must schedule exactly one 600ms redirect timer');
    assert.strictEqual(r.href, './add-session.html?sessionId=4242',
      'the captured redirect DESTINATION must be the saved session reading-mode URL; got ' + JSON.stringify(r.href));
    assert.ok(r.href.indexOf('index.html') === -1,
      'the save must NOT redirect to the overview homepage');
  });

  // B. The destination is a FUNCTION of the resolved id (two ids ⇒ two URLs) —
  //    a constant-URL regression cannot satisfy both. The save toast still fires,
  //    but the assertion is the destination, not the toast.
  await test('a different resolved id yields a different destination URL (the redirect is parameterised by the saved id, not a constant)', async function () {
    var r1 = await captureRedirectFor(11);
    var r2 = await captureRedirectFor(99);
    assert.strictEqual(r1.href, './add-session.html?sessionId=11', 'got ' + JSON.stringify(r1.href));
    assert.strictEqual(r2.href, './add-session.html?sessionId=99', 'got ' + JSON.stringify(r2.href));
    assert.notStrictEqual(r1.href, r2.href,
      'the redirect destination MUST track the resolved id (two ids ⇒ two URLs), not a constant');
    // The save toast is expected on the path, but it is NOT the assertion subject.
    assert.ok(r1.toastKeys.indexOf('toast.sessionSaved') !== -1,
      'sanity: the save path fires toast.sessionSaved (the redirect destination remains the checked artifact)');
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────
  var EXPECTED_COUNT = 2;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 30-12 save-redirect tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (e) { console.error('TEST CRASHED:', e && e.stack || e); process.exit(1); });
