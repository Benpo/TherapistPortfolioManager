/**
 * tests/39-empty-state-coaching.test.js — Phase 39 Plan 05 (HELP-05, D-21/D-22)
 * behavior guard for the first-run empty-state coaching trio and — critically —
 * the Sessions TRUE-empty vs FILTER-empty distinction (Pitfall 3).
 *
 * WHAT THIS LOCKS (asserts on DOM NODES, never source strings — D-08):
 *   1. Overview no-clients  → #emptyState shown + a soft "Show me how" deep-link
 *      (#overviewCoachBtn, href ./help.html#adding-a-client).
 *   2. Sessions TRUE-empty (zero sessions in the DB) → coaching block
 *      (#sessionsCoach) with the help.deeplink.startSession sentence + a button
 *      → ./help.html#starting-a-session; the filter-empty #sessionsEmpty hidden.
 *   3. Sessions FILTER-empty (one session, filtered out) → the coaching button is
 *      ABSENT and the existing #sessionsEmpty (sessions.empty) is shown. This is
 *      the falsifiable Pitfall-3 guard: fire coaching on a filter-miss and this
 *      case FAILS.
 *   4. Reporting no-data (zero sessions) → #reportingEmpty shown with a button
 *      → ./help.html#overview; with one session present → #reportingEmpty hidden.
 *
 * HARNESS: Overview's renderClientRows is a top-level function called directly
 * (mirrors tests/31-overview-render-hardening.test.js). Sessions' renderSessions
 * and Reporting's renderReporting are CLOSURES inside their page
 * DOMContentLoaded handlers, so those two boot the REAL page: capture the
 * registered handler, inject the App stub + a mock PortfolioDB, await the
 * handler, then settle microtasks (mirrors 31-sessions-render-hardening).
 *
 * Vacuous-green trap (F-A): the async boot cases are captured-and-awaited and a
 * count guard at the end asserts every case ran.
 *
 * Read-only: EVALS assets/*.js into isolated jsdom windows; writes no assets/*.
 *
 * Run: node tests/39-empty-state-coaching.test.js
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

function baseWindow(dom) {
  var win = dom.window;
  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };
  return win;
}

// --- Overview: direct renderClientRows call (no DOMContentLoaded) ------------
function buildOverviewEnv() {
  var dom = new JSDOM(readAsset('index.html'), {
    url: 'https://localhost/index.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = baseWindow(dom);
  win.eval(readAsset('assets/date-format.js'));
  win.eval(readAsset('assets/overview.js'));
  win.App = createAppStub({ t: function (k) { return k; } });
  if (typeof win.renderClientRows !== 'function') {
    throw new Error('assets/overview.js did not expose a top-level renderClientRows');
  }
  return { dom: dom, win: win };
}

// --- Sessions / Reporting: boot the real page, capture the handler ----------
function buildBootEnv(htmlFile, assetFile, seedOpts) {
  var dom = new JSDOM(readAsset(htmlFile), {
    url: 'https://localhost/' + htmlFile,
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = baseWindow(dom);

  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  win.App = createAppStub({ t: function (k) { return k; } });
  win.PortfolioDB = createMockPortfolioDB(seedOpts);
  win.eval(readAsset(assetFile));

  if (captured.length !== 1) {
    throw new Error(assetFile + ' expected exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0] };
}

async function boot(env) { await env.domHandler(); await settle(); }

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── Case 1: Overview no-clients coaching ─────────────────────────────────
  await test('Overview no-clients: #emptyState shown + "Show me how" deep-link -> ./help.html#adding-a-client', function () {
    var env = buildOverviewEnv();
    var win = env.win;

    win.renderClientRows([], new Map());

    var emptyState = win.document.getElementById('emptyState');
    assert.ok(emptyState, '#emptyState must exist');
    assert.strictEqual(emptyState.style.display, 'block', '#emptyState must be shown on no-clients');

    var btn = win.document.getElementById('overviewCoachBtn');
    assert.ok(btn, 'a coaching "Show me how" button must be rendered on no-clients');
    assert.strictEqual(btn.getAttribute('href'), './help.html#adding-a-client',
      'the overview coaching button must deep-link to ./help.html#adding-a-client');
    assert.strictEqual(btn.getAttribute('data-i18n'), 'help.deeplink.cta',
      'the button label must be the help.deeplink.cta i18n key');
    // Non-accent soft style (D-22): .button.ghost, never the primary accent.
    assert.ok(/\bghost\b/.test(btn.className) && !/\bprimary\b/.test(btn.className),
      'the coaching button must use the non-accent .button.ghost style (D-22)');

    // With clients present, the coaching button is hidden.
    win.renderClientRows([{ id: 1, name: 'Maya Cohen' }], new Map([[1, []]]));
    var btn2 = win.document.getElementById('overviewCoachBtn');
    assert.ok(!btn2 || btn2.style.display === 'none',
      'the coaching button must be hidden once clients exist');

    env.dom.window.close();
  });

  // ─── Case 2: Sessions TRUE-empty coaching ─────────────────────────────────
  await test('Sessions TRUE-empty (zero sessions): coaching sentence + button -> ./help.html#starting-a-session; filter-empty message hidden', async function () {
    var env = buildBootEnv('sessions.html', 'assets/sessions.js', { clients: [], sessions: [] });
    var win = env.win;
    await boot(env);

    var coach = win.document.getElementById('sessionsCoach');
    assert.ok(coach && coach.style.display !== 'none', 'the true-empty coaching block must be visible');

    var sentence = coach.querySelector('.empty-coach-sentence');
    assert.ok(sentence, 'the coaching block must render a calm sentence node');
    assert.strictEqual(sentence.getAttribute('data-i18n'), 'help.deeplink.startSession',
      'the coaching sentence must be the help.deeplink.startSession i18n key');
    assert.strictEqual(sentence.textContent, 'help.deeplink.startSession',
      'the coaching sentence textContent must resolve via App.t (key-returning stub)');

    var btn = win.document.getElementById('sessionsCoachBtn');
    assert.ok(btn, 'the true-empty state must render a "Show me how" button');
    assert.strictEqual(btn.getAttribute('href'), './help.html#starting-a-session',
      'the sessions coaching button must deep-link to ./help.html#starting-a-session');
    assert.ok(/\bghost\b/.test(btn.className) && !/\bprimary\b/.test(btn.className),
      'the coaching button must use the non-accent .button.ghost style (D-22)');

    var filterEmpty = win.document.getElementById('sessionsEmpty');
    assert.strictEqual(filterEmpty.style.display, 'none',
      'the filter-empty #sessionsEmpty message must be hidden on TRUE-empty');

    env.dom.window.close();
  });

  // ─── Case 3: Sessions FILTER-empty — the Pitfall-3 negative guard ─────────
  await test('Sessions FILTER-empty (one session, filtered out): coaching ABSENT/hidden, sessions.empty shown', async function () {
    var env = buildBootEnv('sessions.html', 'assets/sessions.js', {
      clients: [{ id: 1, name: 'Maya Cohen' }],
      sessions: [{ id: 500, clientId: 1, date: '2026-06-01', sessionType: 'clinic', issues: [] }],
    });
    var win = env.win;
    await boot(env);

    // Apply a date-from filter AFTER the only session's date so it is filtered
    // out (filtered.length === 0) while totalSessions stays 1 → filter-empty.
    var dateFrom = win.document.getElementById('sessionDateFrom');
    assert.ok(dateFrom, '#sessionDateFrom must exist to drive a filter-empty');
    dateFrom.value = '2026-12-01';
    dateFrom.dispatchEvent(new win.Event('change'));
    await settle();

    var btn = win.document.getElementById('sessionsCoachBtn');
    assert.ok(!btn || btn.style.display === 'none' ||
      (btn.parentNode && btn.parentNode.style.display === 'none'),
      'PITFALL 3: no coaching button may appear on a FILTER-empty (sessions exist but are filtered out)');

    var filterEmpty = win.document.getElementById('sessionsEmpty');
    assert.strictEqual(filterEmpty.style.display, 'block',
      'the existing filter-empty #sessionsEmpty message must be shown on filter-empty');

    env.dom.window.close();
  });

  // ─── Case 4: Reporting no-data coaching + populated hides it ──────────────
  await test('Reporting no-data (zero sessions): #reportingEmpty shown + button -> ./help.html#overview; with a session it is hidden', async function () {
    var envEmpty = buildBootEnv('reporting.html', 'assets/reporting.js', { clients: [], sessions: [] });
    var win = envEmpty.win;
    await boot(envEmpty);

    var reportingEmpty = win.document.getElementById('reportingEmpty');
    assert.ok(reportingEmpty && reportingEmpty.style.display !== 'none',
      '#reportingEmpty must be shown when there are zero sessions');

    var btn = win.document.getElementById('reportingCoachBtn');
    assert.ok(btn, 'the no-data state must render a "Show me how" button');
    assert.strictEqual(btn.getAttribute('href'), './help.html#overview',
      'the reporting coaching button must deep-link to ./help.html#overview');
    assert.ok(/\bghost\b/.test(btn.className) && !/\bprimary\b/.test(btn.className),
      'the coaching button must use the non-accent .button.ghost style (D-22)');

    var statGrid = win.document.querySelector('.stat-grid');
    assert.strictEqual(statGrid.style.display, 'none',
      'the empty stat grid must be hidden on the no-data coaching state');
    envEmpty.dom.window.close();

    // With a session present, #reportingEmpty is hidden and stats render.
    var envData = buildBootEnv('reporting.html', 'assets/reporting.js', {
      clients: [{ id: 1, name: 'Maya Cohen' }],
      sessions: [{ id: 500, clientId: 1, date: '2026-06-01', sessionType: 'clinic', issues: [] }],
    });
    var win2 = envData.win;
    await boot(envData);

    var reportingEmpty2 = win2.document.getElementById('reportingEmpty');
    assert.strictEqual(reportingEmpty2.style.display, 'none',
      '#reportingEmpty must be hidden when sessions exist');
    var statGrid2 = win2.document.querySelector('.stat-grid');
    assert.notStrictEqual(statGrid2.style.display, 'none',
      'the stat grid must render when data exists');
    envData.dom.window.close();
  });

  // ─── F-A count guard (no case silently skipped) ───────────────────────────
  var EXPECTED_COUNT = 4;
  if (passed + failed !== EXPECTED_COUNT) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — a case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 39-05 empty-state coaching tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (e) { console.error(e); process.exit(1); });
