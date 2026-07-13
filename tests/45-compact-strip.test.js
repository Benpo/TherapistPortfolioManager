/**
 * tests/45-compact-strip.test.js — COMPACT-SURFACE MARKDOWN STRIP (D-06) +
 * md-render.js LOAD-ORDER on sessions.html / index.html (BLOCKER 1),
 * Phase 45 Plan 04 Task 2.
 *
 * WHAT THIS LOCKS (test-FIRST):
 *   The three compact surfaces must display markdown STRIPPED to plain text via
 *   textContent (never innerHTML, never literal ** / ## tokens):
 *     - sessions.js trapped-emotions cell (:262)
 *     - overview.js comments line (:848)
 *     - add-session spotlight quote (renderSpotlightSessionInfo, :1658)
 *   All three route through window.MdRender.strip before the textContent assign.
 *
 *   BLOCKER 1 (false-GREEN guard): md-render.js was loaded ONLY by
 *   add-session.html, so on the sessions table + overview pages window.MdRender
 *   was `undefined` and the strip guard fell back to raw markdown PERMANENTLY in
 *   production — while a jsdom test that loads md-render.js ITSELF would false-
 *   pass. So this file ALSO reads the raw sessions.html / index.html and asserts
 *   each ships a md-render.js <script> tag positioned BEFORE its consumer script.
 *
 * F-A (vacuous-green trap): async boots are capture-and-awaited; a count guard
 * at end asserts every case ran.
 *
 * Read-only: EVALS assets/* into isolated jsdom windows + reads raw HTML; writes
 * no assets/*.
 *
 * Run: node tests/45-compact-strip.test.js
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

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ── sessions.js boot (mirrors tests/31-sessions-render-hardening.test.js) ──────
function buildSessionsEnv(seedOpts) {
  var dom = new JSDOM(readAsset('sessions.html'), {
    url: 'https://localhost/sessions.html', runScripts: 'outside-only', pretendToBeVisual: false,
  });
  var win = dom.window;
  win.matchMedia = function () {
    return { matches: false, addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {} };
  };
  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };
  win.App = createAppStub({ t: function (k) { return k; } });
  win.PortfolioDB = createMockPortfolioDB(seedOpts);
  win.eval(readAsset('assets/md-render.js')); // strip helper must be present for the surface to strip
  win.eval(readAsset('assets/sessions.js'));
  if (captured.length !== 1) {
    throw new Error('expected sessions.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0] };
}

// ── overview.js env (mirrors tests/31-overview-render-hardening.test.js) ───────
function buildOverviewEnv() {
  var dom = new JSDOM(readAsset('index.html'), {
    url: 'https://localhost/index.html', runScripts: 'outside-only', pretendToBeVisual: false,
  });
  var win = dom.window;
  win.matchMedia = function () {
    return { matches: false, addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {} };
  };
  win.eval(readAsset('assets/date-format.js'));
  win.eval(readAsset('assets/md-render.js'));
  win.eval(readAsset('assets/overview.js'));
  win.App = createAppStub({ t: function (k) { return k; } });
  if (typeof win.renderClientRows !== 'function') {
    throw new Error('assets/overview.js did not expose a top-level renderClientRows');
  }
  return { dom: dom, win: win };
}

(async function () {
  // ── Case A: sessions.js trapped-emotions cell strips markdown via textContent ──
  await test('sessions.js trapped cell shows "**bold** trapped\\n- x" STRIPPED (no **, no <strong>) via textContent', async function () {
    var env = buildSessionsEnv({
      clients: [{ id: 1, name: 'Maya Cohen' }],
      sessions: [{ id: 500, clientId: 1, date: '2026-04-10', sessionType: 'clinic',
        trappedEmotions: '**bold** trapped\n- x', issues: [] }],
    });
    var win = env.win;
    await env.domHandler(); await settle();

    var cell = win.document.querySelector('#sessionsTableBody .trapped-cell');
    assert.ok(cell, 'a .trapped-cell must render for the seeded session');
    assert.strictEqual(cell.textContent.indexOf('**'), -1,
      'the trapped cell must not contain literal ** (got: ' + JSON.stringify(cell.textContent) + ')');
    assert.strictEqual(cell.querySelector('strong'), null,
      'the trapped cell must contain NO <strong> element (textContent-only, stripped)');
    assert.ok(/bold/.test(cell.textContent) && /trapped/.test(cell.textContent),
      'the stripped text must keep the words "bold" and "trapped"');
    assert.ok(/(^|\W)x(\W|$)/.test(cell.textContent),
      'the stripped text must keep the list content "x" (marker removed)');

    env.dom.window.close();
  });

  // ── Case B: overview.js comments line strips markdown via textContent ─────────
  await test('overview.js comments line shows "## Note\\n**strong**" STRIPPED (no **, no ##, no <strong>) via textContent', function () {
    var env = buildOverviewEnv();
    var win = env.win;

    win.renderClientRows(
      [{ id: 2, name: 'Adi Berg' }],
      new Map([[2, [{ id: 500, clientId: 2, date: '2026-04-10', sessionType: 'clinic',
        issues: [], comments: '## Note\n**strong**' }]]])
    );

    var line = win.document.querySelector('#clientTableBody .session-comments');
    assert.ok(line, 'a .session-comments line must render for the seeded session comment');
    assert.strictEqual(line.textContent.indexOf('**'), -1, 'no literal ** in the comments line');
    assert.strictEqual(line.textContent.indexOf('##'), -1, 'no literal ## in the comments line');
    assert.strictEqual(line.querySelector && line.querySelector('strong'), null,
      'the comments line must contain NO <strong> element (textContent-only, stripped)');
    assert.ok(/Note/.test(line.textContent) && /strong/.test(line.textContent),
      'the stripped comment must keep the words "Note" and "strong"');

    env.dom.window.close();
  });

  // ── Case C: add-session spotlight quote strips markdown via textContent ───────
  await test('add-session spotlight quote (renderSpotlightSessionInfo) shows "**bold**" STRIPPED (no **, no <strong>) via textContent', function () {
    var dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://localhost/add-session.html', runScripts: 'outside-only', pretendToBeVisual: false,
    });
    var win = dom.window;
    win.matchMedia = function () {
      return { matches: false, addEventListener: function () {}, removeEventListener: function () {},
        addListener: function () {}, removeListener: function () {} };
    };
    // Do NOT dispatch DOMContentLoaded — we only need the top-level function decls.
    var realAdd = win.document.addEventListener.bind(win.document);
    win.document.addEventListener = function (type, fn, o) {
      if (type === 'DOMContentLoaded') { return; }
      return realAdd(type, fn, o);
    };
    win.App = createAppStub({ t: function (k) { return k; } });
    win.__exportModalInit = function () {};
    win.eval(readAsset('assets/md-render.js'));
    win.eval(readAsset('assets/date-format.js'));
    win.eval(readAsset('assets/export-modal.js'));
    win.eval(readAsset('assets/add-session.js'));

    assert.strictEqual(typeof win.renderSpotlightSessionInfo, 'function',
      'add-session.js must expose a top-level renderSpotlightSessionInfo');

    var d = win.document;
    var refs = {
      sessionInfo: d.createElement('div'),
      lastDate: d.createElement('span'),
      total: d.createElement('span'),
      summaryBlock: d.createElement('div'),
      summaryQuote: d.createElement('div'),
    };
    win.renderSpotlightSessionInfo(
      refs,
      [{ id: 9, date: '2026-05-01', customerSummary: '**bold** summary' }],
      function (x) { return x; }
    );

    assert.strictEqual(refs.summaryQuote.textContent.indexOf('**'), -1,
      'the spotlight quote must not contain literal ** (got: ' + JSON.stringify(refs.summaryQuote.textContent) + ')');
    assert.strictEqual(refs.summaryQuote.querySelector('strong'), null,
      'the spotlight quote must contain NO <strong> element (textContent-only, stripped)');
    assert.ok(/bold/.test(refs.summaryQuote.textContent) && /summary/.test(refs.summaryQuote.textContent),
      'the stripped quote must keep the words "bold" and "summary"');

    dom.window.close();
  });

  // ── Case D: BLOCKER 1 — md-render.js loaded BEFORE the consumer on both pages ──
  await test('SOURCE: sessions.html ships md-render.js BEFORE sessions.js; index.html ships md-render.js BEFORE overview.js', function () {
    var sessionsHtml = readAsset('sessions.html');
    var mdIdxS = sessionsHtml.indexOf('assets/md-render.js');
    var consumerIdxS = sessionsHtml.indexOf('assets/sessions.js');
    assert.notStrictEqual(mdIdxS, -1, 'sessions.html must contain a md-render.js script tag (BLOCKER 1)');
    assert.notStrictEqual(consumerIdxS, -1, 'sessions.html must contain the sessions.js script tag');
    assert.ok(mdIdxS < consumerIdxS,
      'in sessions.html, md-render.js must be loaded BEFORE sessions.js (load order — window.MdRender must exist when sessions.js runs)');

    var indexHtml = readAsset('index.html');
    var mdIdxI = indexHtml.indexOf('assets/md-render.js');
    var consumerIdxI = indexHtml.indexOf('assets/overview.js');
    assert.notStrictEqual(mdIdxI, -1, 'index.html must contain a md-render.js script tag (BLOCKER 1)');
    assert.notStrictEqual(consumerIdxI, -1, 'index.html must contain the overview.js script tag');
    assert.ok(mdIdxI < consumerIdxI,
      'in index.html, md-render.js must be loaded BEFORE overview.js (load order)');
  });

  // ── Case E: SOURCE — the three surfaces route through MdRender.strip ───────────
  await test('SOURCE: sessions.js, overview.js, add-session.js each call MdRender.strip on their compact surface', function () {
    assert.ok(/MdRender\.strip\(/.test(readAsset('assets/sessions.js')),
      'sessions.js must call MdRender.strip for the trapped cell');
    assert.ok(/MdRender\.strip\(/.test(readAsset('assets/overview.js')),
      'overview.js must call MdRender.strip for the comments line');
    assert.ok(/MdRender\.strip\(/.test(readAsset('assets/add-session.js')),
      'add-session.js must call MdRender.strip for the spotlight quote');
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────────
  var EXPECTED_COUNT = 5;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — a case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 45-04 compact-strip tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (e) { console.error(e); process.exit(1); });
