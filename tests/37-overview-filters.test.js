/**
 * tests/37-overview-filters.test.js — RED behavior spec for the Overview
 * Session-Format multi-select + Heart-Wall toggle (FILT-04, Wave 5, Plan 37-10).
 *
 * TDD RED: the controls this file drives DO NOT EXIST YET. Every case boots the
 * REAL index.html + assets/overview.js against a mock PortfolioDB (seeded so real
 * client rows render), then asserts the pinned DOM contract Plan 37-13 must build
 * verbatim. It therefore FAILS RED now on the MISSING controls (a clean
 * AssertionError naming #clientFormatFilter / #clientHeartWallToggle), NOT on a
 * harness crash — the page boots and renders rows first. It MUST turn GREEN
 * unchanged once 37-13 lands the controls; never weaken it to green.
 *
 * DOM CONTRACT PINNED (from 37-10-PLAN <dom_contract>):
 *   - Session Format multi-select: #clientFormatFilter (.multi-select), pill
 *     #clientFormatFilterToggle, panel #clientFormatFilterPanel, options
 *     input[type="checkbox"][data-format-key]. Option key set === getSessionTypes()
 *     keys (clinic/online/remote/proxy/other + custom). Resolved key =
 *     session.sessionType || "clinic"; empty selection = no filter; selection =
 *     union over the resolved keys (client-level: >=1 matching session).
 *   - Heart-Wall toggle: #clientHeartWallToggle inside label.toggle-switch (with
 *     span.toggle-slider). ON = client has >=1 session with isHeartShield===true,
 *     regardless of shieldRemoved. The old #clientHeartShieldFilter dropdown is
 *     REMOVED.
 *   - Pill summary: the summary TEXT NODE carries NO data-i18n; 0 checked ->
 *     t('filter.sessionFormat.all'); N checked ->
 *     t('filter.sessionFormat.count').replace('{count}', N) (applyTranslations
 *     does no interpolation) so it CONTAINS the number and NOT the literal
 *     "{count}". Panel opens on pill click, closes on Escape + outside-click.
 *   - Security (T-37-10-SEC): a custom label carrying an HTML-injection payload
 *     renders as LITERAL textContent — no injected element.
 *
 * METHOD (MEMORY feedback-behavior-verification): drive the REAL controls, read
 * the REAL rendered rows, assert observable state only. No source-text asserts.
 *
 * Read-only: EVALS assets/date-format.js + assets/overview.js into an isolated
 * jsdom window; writes no assets/* production file.
 *
 * Run: node tests/37-overview-filters.test.js
 * Exits 0 on full pass, 1 on any failure (RED until 37-13 lands the controls).
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

// The 5 locked-default session-type keys the multi-select option list must carry
// (plus any seeded custom key). Mirrors app.js SESSION_TYPE_ORDER (D-13).
var DEFAULT_KEYS = ['clinic', 'online', 'remote', 'proxy', 'other'];

// A t() that returns the key for everything EXCEPT the count template, which must
// carry a "{count}" token so the caller-side .replace(...) (dom_contract) yields a
// summary that contains the NUMBER and never the literal token.
function defaultT(k) {
  if (k === 'filter.sessionFormat.count') return '{count} selected';
  return k;
}

/**
 * Boot the REAL index.html + overview.js. `opts.sessionTypes` seeds
 * localStorage['portfolioSessionTypes'] BEFORE the App stub reads it (so
 * getSessionTypes yields the custom key). `opts.clients` / `opts.sessions` seed
 * the mock DB so real rows render. The real date engine is loaded first so the
 * boot's countSessionsThisMonth (window.DateFormat.parseLocal) never throws —
 * guaranteeing the file fails on the MISSING controls, not a harness error.
 */
function buildOverviewEnv(opts) {
  opts = opts || {};
  var html = readAsset('index.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/index.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  win.matchMedia = function () {
    return { matches: false, media: '', addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {} };
  };

  // Seed BEFORE the stub captures localStorage + before boot renders.
  try { win.localStorage.setItem('portfolioLang', opts.lang || 'en'); } catch (_) {}
  if (opts.sessionTypes != null) {
    win.localStorage.setItem('portfolioSessionTypes',
      typeof opts.sessionTypes === 'string' ? opts.sessionTypes : JSON.stringify(opts.sessionTypes));
  }

  // Real calendar engine (index.html loads date-format.js before app.js) so
  // overview.js's countSessionsThisMonth / age math resolve in jsdom.
  win.eval(readAsset('assets/date-format.js'));

  // Capture the page's async DOMContentLoaded handler so we can AWAIT it.
  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  win.App = createAppStub(Object.assign({
    localStorage: win.localStorage,
    t: defaultT,
  }, opts.appOverrides || {}));
  win.PortfolioDB = createMockPortfolioDB({ clients: opts.clients || [], sessions: opts.sessions || [] });

  win.eval(readAsset('assets/overview.js'));

  return { dom: dom, win: win, handlers: captured };
}

async function boot(env) {
  for (var i = 0; i < env.handlers.length; i++) { await env.handlers[i](); }
  await settle();
}

// The display name of every rendered client row (first .client-name span), in
// DOM order. Reads the REAL rendered #clientTableBody, not an internal predicate.
function renderedClientNames(win) {
  var body = win.document.getElementById('clientTableBody');
  var rows = body ? body.querySelectorAll('tr.client-row') : [];
  return Array.prototype.map.call(rows, function (r) {
    var span = r.querySelector('.client-name span');
    return span ? span.textContent : '';
  });
}

// Drive the REAL multi-select: open the panel, then toggle a format checkbox by
// its data-format-key and fire change so the filter re-renders.
function openFormatPanel(win) {
  win.document.getElementById('clientFormatFilterToggle').click();
}
function checkFormat(win, key) {
  var box = win.document.querySelector('#clientFormatFilterPanel input[type="checkbox"][data-format-key="' + key + '"]');
  assert.ok(box, 'a format checkbox for "' + key + '" must exist to drive the filter');
  box.checked = true;
  box.dispatchEvent(new win.Event('change', { bubbles: true }));
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// A seed reused across the filter behavior cases. Three clients, sessions
// spanning every default format + a custom key + ONE legacy-undefined session
// (resolves to clinic), plus Heart-Wall combos (active / released / none).
function filterSeed() {
  return {
    sessionTypes: { overrides: {}, custom: [{ key: 'custom.900', label: 'Group session' }] },
    clients: [
      { id: 1, name: 'Alice Adams' },
      { id: 2, name: 'Bob Brown' },
      { id: 3, name: 'Carol Clark' },
    ],
    sessions: [
      // Alice: online + custom.900; one ACTIVE Heart-Wall session.
      { id: 11, clientId: 1, date: '2026-05-01', sessionType: 'online', isHeartShield: true, shieldRemoved: false, issues: [] },
      { id: 12, clientId: 1, date: '2026-05-02', sessionType: 'custom.900', issues: [] },
      // Bob: remote + a legacy-undefined session (sessionType absent -> clinic);
      // one RELEASED Heart-Wall session (isHeartShield true, shieldRemoved true).
      { id: 21, clientId: 2, date: '2026-05-03', sessionType: 'remote', isHeartShield: true, shieldRemoved: true, issues: [] },
      { id: 22, clientId: 2, date: '2026-05-04', issues: [] },
      // Carol: proxy only; NO Heart-Wall.
      { id: 31, clientId: 3, date: '2026-05-05', sessionType: 'proxy', issues: [] },
    ],
  };
}

(async function () {
  // ─── 1. Session Format multi-select: structure + option key set ───────────
  await test('Session Format multi-select renders (#clientFormatFilter/.Toggle/.Panel) with option keys === getSessionTypes() keys (incl. custom)', async function () {
    var env = buildOverviewEnv(filterSeed());
    await boot(env);
    var win = env.win;

    var container = win.document.getElementById('clientFormatFilter');
    assert.ok(container, 'the Session Format multi-select container #clientFormatFilter must exist');
    assert.ok(container.classList.contains('multi-select'), '#clientFormatFilter must carry the .multi-select class');
    assert.ok(win.document.getElementById('clientFormatFilterToggle'), 'the pill #clientFormatFilterToggle must exist');
    assert.ok(win.document.getElementById('clientFormatFilterPanel'), 'the panel #clientFormatFilterPanel must exist');

    var boxes = win.document.querySelectorAll('#clientFormatFilterPanel input[type="checkbox"][data-format-key]');
    var keys = Array.prototype.map.call(boxes, function (b) { return b.getAttribute('data-format-key'); });
    var expected = DEFAULT_KEYS.concat(['custom.900']);
    assert.deepStrictEqual(keys, expected,
      'the checkbox data-format-key set must equal getSessionTypes() keys (5 defaults + the seeded custom); got ' + JSON.stringify(keys));
    env.dom.window.close();
  });

  // ─── 2. Session Format filter: empty = all; union; legacy-undefined->clinic ─
  await test('Session Format: 0 checked shows all clients; checking online+remote shows only their clients (proxy-only hidden)', async function () {
    var env = buildOverviewEnv(filterSeed());
    await boot(env);
    var win = env.win;

    assert.ok(win.document.getElementById('clientFormatFilter'), 'the Session Format control must exist to exercise the filter');

    // Empty selection = no filter → all three clients.
    assert.deepStrictEqual(renderedClientNames(win).sort(), ['Alice Adams', 'Bob Brown', 'Carol Clark'],
      'with zero formats checked every client must be shown');

    openFormatPanel(win);
    checkFormat(win, 'online');  // Alice
    checkFormat(win, 'remote');  // Bob
    await settle();

    var names = renderedClientNames(win).sort();
    assert.deepStrictEqual(names, ['Alice Adams', 'Bob Brown'],
      'checking online+remote must show exactly Alice (online) and Bob (remote) — Carol (proxy only) is hidden; got ' + JSON.stringify(names));
    env.dom.window.close();
  });

  await test('Session Format: checking clinic includes the legacy-undefined session client (resolved key = sessionType || "clinic")', async function () {
    var env = buildOverviewEnv(filterSeed());
    await boot(env);
    var win = env.win;
    assert.ok(win.document.getElementById('clientFormatFilter'), 'the Session Format control must exist to exercise the legacy->clinic rule');

    openFormatPanel(win);
    checkFormat(win, 'clinic');
    await settle();

    var names = renderedClientNames(win);
    assert.ok(names.indexOf('Bob Brown') >= 0,
      'Bob has a sessionType-absent session that resolves to clinic, so checking clinic must include him; got ' + JSON.stringify(names));
    assert.ok(names.indexOf('Alice Adams') < 0 && names.indexOf('Carol Clark') < 0,
      'only the clinic-resolved client may show; Alice/Carol have no clinic session; got ' + JSON.stringify(names));
    env.dom.window.close();
  });

  // ─── 3. Heart-Wall toggle: structure + shieldRemoved-agnostic + old dropdown gone ─
  await test('Heart-Wall toggle #clientHeartWallToggle lives inside label.toggle-switch (span.toggle-slider) and the old #clientHeartShieldFilter dropdown is REMOVED', async function () {
    var env = buildOverviewEnv(filterSeed());
    await boot(env);
    var win = env.win;

    var toggle = win.document.getElementById('clientHeartWallToggle');
    assert.ok(toggle, 'the Heart-Wall toggle #clientHeartWallToggle must exist');
    var label = toggle.closest('label.toggle-switch');
    assert.ok(label, '#clientHeartWallToggle must sit inside a label.toggle-switch');
    assert.ok(label.querySelector('span.toggle-slider'), 'the toggle-switch must contain a span.toggle-slider');

    assert.strictEqual(win.document.getElementById('clientHeartShieldFilter'), null,
      'the old #clientHeartShieldFilter dropdown must be REMOVED once the Heart-Wall toggle replaces it');
    env.dom.window.close();
  });

  await test('Heart-Wall ON shows clients with >=1 isHeartShield===true session (released still counts); non-heart client disappears', async function () {
    var env = buildOverviewEnv(filterSeed());
    await boot(env);
    var win = env.win;

    var toggle = win.document.getElementById('clientHeartWallToggle');
    assert.ok(toggle, 'the Heart-Wall toggle must exist to exercise the predicate');

    // OFF → all clients.
    assert.deepStrictEqual(renderedClientNames(win).sort(), ['Alice Adams', 'Bob Brown', 'Carol Clark'],
      'with the Heart-Wall toggle OFF every client must be shown');

    // ON → Alice (active) + Bob (released, still counts); Carol (none) hidden.
    toggle.checked = true;
    toggle.dispatchEvent(new win.Event('change', { bubbles: true }));
    await settle();

    var names = renderedClientNames(win).sort();
    assert.deepStrictEqual(names, ['Alice Adams', 'Bob Brown'],
      'Heart-Wall ON must show Alice (active) and Bob (released isHeartShield===true still counts) and hide Carol (no heart); got ' + JSON.stringify(names));
    env.dom.window.close();
  });

  // ─── 4. Pill summary contract + panel open/close ──────────────────────────
  await test('pill summary: 0 checked = filter.sessionFormat.all value; 2 checked contains "2" and never the literal "{count}"; summary text node has no data-i18n', async function () {
    var env = buildOverviewEnv(filterSeed());
    await boot(env);
    var win = env.win;

    var pill = win.document.getElementById('clientFormatFilterToggle');
    assert.ok(pill, 'the pill #clientFormatFilterToggle must exist to read its summary');

    // 0 checked → the all-label value (App.t returns the key here).
    assert.strictEqual(pill.textContent.trim(), win.App.t('filter.sessionFormat.all'),
      'with zero checked the pill summary must equal t("filter.sessionFormat.all")');
    assert.ok(pill.querySelector('[data-i18n]') === null && pill.getAttribute('data-i18n') === null,
      'the summary text node must carry NO data-i18n (applyTranslations would clobber the interpolated count)');

    pill.click(); // open the panel
    checkFormat(win, 'online');
    checkFormat(win, 'remote');
    await settle();

    var summary = win.document.getElementById('clientFormatFilterToggle').textContent;
    assert.ok(summary.indexOf('2') >= 0,
      'after checking 2 formats the pill summary must contain the number 2; got ' + JSON.stringify(summary));
    assert.ok(summary.indexOf('{count}') < 0,
      'the summary must be interpolated caller-side (.replace) so it never contains the literal "{count}" token; got ' + JSON.stringify(summary));
    env.dom.window.close();
  });

  await test('panel opens on pill click, closes on Escape, and closes on an outside click', async function () {
    var env = buildOverviewEnv(filterSeed());
    await boot(env);
    var win = env.win;

    var pill = win.document.getElementById('clientFormatFilterToggle');
    var panel = win.document.getElementById('clientFormatFilterPanel');
    assert.ok(pill && panel, 'the pill + panel must exist to exercise open/close');

    function isOpen() { return !panel.classList.contains('is-hidden') && panel.hidden !== true; }

    pill.click();
    await settle();
    assert.ok(isOpen(), 'clicking the pill must OPEN the panel');

    win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
    assert.ok(!isOpen(), 'Escape must CLOSE the panel');

    pill.click(); // re-open
    await settle();
    assert.ok(isOpen(), 're-opening the panel for the outside-click check');
    win.document.body.click(); // an outside click
    await settle();
    assert.ok(!isOpen(), 'a click outside the control must CLOSE the panel');
    env.dom.window.close();
  });

  // ─── 5. Security (T-37-10-SEC): custom label renders as literal text ──────
  await test('security (T-37-10-SEC): a custom Session Format label with an HTML-injection payload renders as literal text, no injected element', async function () {
    var PAYLOAD = '<img src=x onerror="window.__xss=1">';
    var env = buildOverviewEnv({
      sessionTypes: { overrides: {}, custom: [{ key: 'custom.evil', label: PAYLOAD }] },
      clients: [{ id: 1, name: 'Alice Adams' }],
      sessions: [{ id: 11, clientId: 1, date: '2026-05-01', sessionType: 'custom.evil', issues: [] }],
    });
    await boot(env);
    var win = env.win;

    var panel = win.document.getElementById('clientFormatFilterPanel');
    assert.ok(panel, 'the Session Format panel must exist to render the custom option label');
    var box = panel.querySelector('input[type="checkbox"][data-format-key="custom.evil"]');
    assert.ok(box, 'the custom option checkbox must render');

    // The label must expose the payload as LITERAL text, with no parsed element.
    assert.ok(panel.textContent.indexOf(PAYLOAD) >= 0,
      'the custom label must appear as literal textContent in the panel');
    assert.strictEqual(panel.querySelectorAll('img').length, 0,
      'no <img> element may be parsed from a custom Session Format label (no-innerHTML contract)');
    assert.notStrictEqual(win.__xss, 1, 'the injected onerror must never execute');
    env.dom.window.close();
  });

  // ─── count guard (vacuous-skip trap) ──────────────────────────────────────
  var EXPECTED_COUNT = 8;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — a case was silently skipped.');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 37-10 overview Session-Format + Heart-Wall filter tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (err) {
  console.error('FATAL test harness error:', err && err.stack || err);
  process.exit(1);
});
