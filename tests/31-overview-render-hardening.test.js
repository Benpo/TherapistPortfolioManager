/**
 * tests/31-overview-render-hardening.test.js — RFCT-03 characterization +
 * hardening guard for the two interpolated-i18n innerHTML sites in
 * assets/overview.js (D-03/D-06, Phase 31 Plan 02 Task 1).
 *
 * WHAT THIS LOCKS (and why it is test-FIRST):
 *   overview.js had two `innerHTML = `...${App.t(...)}...`` assignments that
 *   string-interpolated app-controlled i18n into the DOM:
 *     - :456 empty-state  →  `<div class="helper-text">${App.t("overview.sessions.none")}</div>`
 *     - :510 view button  →  `<span class="button-label" data-i18n="overview.table.view">${App.t(...)}</span><span class="button-icon">…svg…</span>`
 *   Plan 02 swaps both to textContent + DOM-built nodes. This test was written
 *   and GREEN on the UNCHANGED overview.js first (characterization baseline),
 *   then must stay GREEN after the swap — proving the OBSERVABLE rendered
 *   output is identical (D-08: assert rendered DOM, not "was called").
 *
 * APPROACH: load the REAL index.html (the page that ships overview.js) into
 * jsdom, eval assets/overview.js into that window, inject the shared App.t stub
 * (key-returning, so an asserted textContent equals the i18n KEY), then call the
 * top-level `renderClientRows(clients, sessionsByClient)` DIRECTLY. We do NOT
 * fire DOMContentLoaded — renderClientRows is a pure DOM render that needs no
 * PortfolioDB — so there is no async vacuous-green trap. A count guard at the
 * end still asserts every case ran.
 *
 * FALSIFIABILITY:
 *   - empty-state: a client with ZERO sessions must produce a `.helper-text`
 *     (scoped INSIDE #clientTableBody, so it cannot match the page's global
 *     #emptyState .helper-text) whose textContent is the "none" key. Drop the
 *     render and the element is absent → FAIL.
 *   - view button: a client WITH a session must produce a `.button-label`
 *     (textContent = view key), a `data-i18n="overview.table.view"` attr, and a
 *     `.button-icon svg`. Lose any of these in the swap → FAIL.
 *
 * Read-only: EVALS assets/overview.js into an isolated jsdom window; writes no
 * assets/*.
 *
 * Run: node tests/31-overview-render-hardening.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

// Build a jsdom window with index.html parsed but overview.js's DOMContentLoaded
// handler NEVER fired (runScripts 'outside-only' + we never dispatch it). We
// eval overview.js so its top-level function declarations (renderClientRows et
// al.) attach to the window, then inject the key-returning App stub.
function buildEnv() {
  var html = readAsset('index.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/index.html',
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

  win.eval(readAsset('assets/overview.js'));

  // Key-returning App stub: App.t(k) === k, so an asserted textContent equals
  // the i18n KEY the production site passed to App.t.
  win.App = createAppStub({ t: function (k) { return k; } });

  if (typeof win.renderClientRows !== 'function') {
    throw new Error('assets/overview.js did not expose a top-level renderClientRows');
  }
  return { dom: dom, win: win };
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ─── Case 1: empty-state detail render (overview.js:456) ─────────────────────
test('a client with ZERO sessions renders a .helper-text (inside #clientTableBody) whose textContent is the "overview.sessions.none" key', function () {
  var env = buildEnv();
  var win = env.win;

  var clients = [{ id: 1, name: 'Maya Cohen' }];
  var sessionsByClient = new Map(); // id 1 → no sessions → empty-state branch

  win.renderClientRows(clients, sessionsByClient);

  var tableBody = win.document.getElementById('clientTableBody');
  // Scope to tableBody so we cannot accidentally match the page-level
  // #emptyState element, which ALSO carries class "helper-text".
  var helper = tableBody.querySelector('.helper-text');
  assert.ok(helper, 'the empty-state detail cell must render a .helper-text element inside the table body');
  assert.strictEqual(helper.textContent, 'overview.sessions.none',
    'the empty-state helper text must be App.t("overview.sessions.none") (key-returning stub → the key itself)');

  env.dom.window.close();
});

// ─── Case 2: populated-row view button render (overview.js:510) ──────────────
test('a client WITH a session renders a view button: .button-label = "overview.table.view", data-i18n attr present, and a .button-icon svg', function () {
  var env = buildEnv();
  var win = env.win;

  var clients = [{ id: 2, name: 'Adi Berg' }];
  var sessionsByClient = new Map([[2, [{
    id: 500, clientId: 2, date: '2026-04-10', sessionType: 'clinic', issues: [],
  }]]]);

  win.renderClientRows(clients, sessionsByClient);

  var tableBody = win.document.getElementById('clientTableBody');

  var label = tableBody.querySelector('.edit-button .button-label');
  assert.ok(label, 'the populated row must render a .button-label inside the .edit-button');
  assert.strictEqual(label.textContent, 'overview.table.view',
    'the view button label must be App.t("overview.table.view")');
  assert.strictEqual(label.getAttribute('data-i18n'), 'overview.table.view',
    'the view button label must carry data-i18n="overview.table.view"');

  var icon = tableBody.querySelector('.edit-button .button-icon');
  assert.ok(icon, 'the view button must render a .button-icon span');
  assert.ok(icon.querySelector('svg'), 'the .button-icon must contain an <svg> child');

  env.dom.window.close();
});

// ─── count guard (no case silently skipped) ──────────────────────────────────
var EXPECTED_COUNT = 2;
if (passed + failed !== EXPECTED_COUNT) {
  console.error('\nGUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
    (passed + failed) + ' ran — a case was silently skipped.');
  process.exit(1);
}

console.log('');
console.log('Plan 31-02 overview render-hardening tests — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
