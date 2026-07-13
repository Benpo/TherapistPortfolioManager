/**
 * tests/31-sessions-render-hardening.test.js — RFCT-03 characterization +
 * hardening guard for the interpolated-i18n innerHTML site in
 * assets/sessions.js (D-03/D-06, Phase 31 Plan 02 Task 2).
 *
 * NET-NEW COVERAGE: assets/sessions.js had ZERO tests before this file, so this
 * characterization both locks the RFCT-03 swap AND closes a coverage gap.
 *
 * WHAT THIS LOCKS (test-FIRST):
 *   sessions.js:147 set the per-row view button via string-interpolated
 *   innerHTML:
 *     `<span class="button-label" data-i18n="sessions.table.view">${App.t(...)}</span><span class="button-icon">…svg…</span>`
 *   Plan 02 swaps it to textContent + DOM-built nodes. This test was written and
 *   GREEN on the UNCHANGED sessions.js first (characterization baseline), then
 *   must stay GREEN after the swap — proving identical OBSERVABLE output (D-08).
 *
 * APPROACH (mirrors tests/30-client-spotlight.test.js): renderSessions is a
 * CLOSURE inside sessions.js's DOMContentLoaded handler, so we cannot call it
 * directly — we boot the REAL page. Load sessions.html into jsdom, CAPTURE the
 * registered DOMContentLoaded handler (the 25-06 capture pattern), inject the
 * App stub (key-returning t + resolving initCommon) and a mock PortfolioDB
 * seeded with one client + one session, then AWAIT the captured handler and
 * settle microtasks. A populated row renders → the view button is asserted.
 *
 * F-A (vacuous-green trap): the boot handler is ASYNC, so we capture-and-await
 * and a count guard at end asserts every case ran.
 *
 * FALSIFIABILITY: the seeded session forces a populated row; the swap must keep
 * a `.button-label` (textContent = "sessions.table.view"), the
 * data-i18n="sessions.table.view" attribute, and a `.button-icon svg`. Lose any
 * in the swap → FAIL.
 *
 * Read-only: EVALS assets/sessions.js into an isolated jsdom window; writes no
 * assets/*.
 *
 * Run: node tests/31-sessions-render-hardening.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createMockPortfolioDB = require('./_helpers/mock-portfolio-db').createMockPortfolioDB;
var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle(n) { for (var i = 0; i < (n || 8); i++) { await flush(); } }

function buildEnv(seedOpts) {
  var html = readAsset('sessions.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/sessions.html',
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

  // Capture the page's DOMContentLoaded handler so we can AWAIT it (a blanket
  // dispatchEvent would not await the async handler).
  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  // Key-returning App stub: App.t(k) === k → asserted label text equals the key.
  win.App = createAppStub({ t: function (k) { return k; } });

  win.PortfolioDB = createMockPortfolioDB(seedOpts);

  win.eval(readAsset('assets/sessions.js'));

  if (captured.length !== 1) {
    throw new Error('expected sessions.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0] };
}

async function boot(env) {
  await env.domHandler();
  await settle();
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  await test('a populated session row renders a view button: .button-label = "sessions.table.view", data-i18n attr present, and a .button-icon svg', async function () {
    var env = buildEnv({
      clients: [{ id: 1, name: 'Maya Cohen' }],
      sessions: [{ id: 500, clientId: 1, date: '2026-04-10', sessionType: 'clinic', issues: [] }],
    });
    var win = env.win;
    await boot(env);

    var tableBody = win.document.getElementById('sessionsTableBody');
    var label = tableBody.querySelector('.session-edit .button-label');
    assert.ok(label, 'the populated row must render a .button-label inside the .session-edit button');
    assert.strictEqual(label.textContent, 'sessions.table.view',
      'the view button label must be App.t("sessions.table.view")');
    assert.strictEqual(label.getAttribute('data-i18n'), 'sessions.table.view',
      'the view button label must carry data-i18n="sessions.table.view"');

    var icon = tableBody.querySelector('.session-edit .button-icon');
    assert.ok(icon, 'the view button must render a .button-icon span');
    assert.ok(icon.querySelector('svg'), 'the .button-icon must contain an <svg> child');

    env.dom.window.close();
  });

  // ─── Phase 45 Plan 04 EXTENSION (never weaken) ───────────────────────────────
  // The compact trapped-emotions cell now routes through MdRender.strip (D-06),
  // but its output MUST still land on textContent — the strip helper emits plain
  // text, not HTML. This source lock proves the hardening convention survives the
  // strip change: the trapped cell is a textContent assignment and NEVER an
  // innerHTML one.
  await test('EXT(45-04): sessions.js trapped compact cell stays textContent-only after the MdRender.strip change (never innerHTML)', function () {
    var src = readAsset('assets/sessions.js');
    assert.ok(/trappedCell\.textContent\s*=/.test(src),
      'the trapped cell must be assigned via trappedCell.textContent (compact surface stays textContent-only)');
    assert.ok(!/trappedCell\.innerHTML\s*=/.test(src),
      'the trapped cell must NEVER be assigned via innerHTML (D-06: strip emits plain text for textContent)');
    assert.ok(/MdRender\.strip\(/.test(src),
      'the trapped cell must route through MdRender.strip (plain-text strip, not a render)');
  });

  // The app's ONE sanctioned innerHTML write of user NOTE content is the
  // read-mode overlay in add-session.js — and it is routed EXCLUSIVELY through
  // MdRender.render (escape-first). This lock documents that narrow exception so
  // the textContent-only convention on every OTHER surface (this file, overview,
  // the compact cells) is understood to be deliberate and unchanged. The overlay
  // behavior itself is proven by tests/45-read-mode-render.test.js.
  await test('EXT(45-04): the ONLY sanctioned note innerHTML path (add-session read-mode overlay) is MdRender-routed and narrow', function () {
    var addSrc = readAsset('assets/add-session.js');
    assert.ok(/overlay\.innerHTML\s*=\s*window\.MdRender\.render\(/.test(addSrc),
      'the read-mode overlay must write innerHTML ONLY from window.MdRender.render(...) (escape-first, single narrow exception)');
    assert.ok(!/overlay\.innerHTML\s*=\s*[`"']/.test(addSrc),
      'the read-mode overlay must not write innerHTML from a raw string/template literal');
  });

  // ─── F-A count guard ─────────────────────────────────────────────────────────
  var EXPECTED_COUNT = 3;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' case to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 31-02 sessions render-hardening tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (e) { console.error(e); process.exit(1); });
