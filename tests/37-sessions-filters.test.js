/**
 * tests/37-sessions-filters.test.js — RED behavior spec for the Sessions
 * Session-Format multi-select + Heart-Wall toggle (FILT-04, Wave 5, Plan 37-10).
 *
 * TDD RED: the controls DO NOT EXIST YET. Each case boots the REAL sessions.html
 * + assets/sessions.js against a mock PortfolioDB (real session rows render),
 * then asserts the pinned DOM contract Plan 37-14 must build verbatim. It FAILS
 * RED now on the MISSING controls (a clean AssertionError naming
 * #sessionFormatFilter / #sessionHeartWallToggle), NOT on a harness crash — the
 * page boots and renders rows first. It MUST turn GREEN unchanged once 37-14
 * lands the controls; never weaken it to green.
 *
 * SESSIONS ARE SESSION-LEVEL (not client-level): the predicate keeps individual
 * session rows. Resolved key = session.sessionType || "clinic"; empty selection =
 * no filter; selection = union. Heart-Wall ON = isHeartShield===true regardless
 * of shieldRemoved. The old #sessionTypeFilter dropdown is REMOVED. Pill summary
 * + panel open/close + T-37-10-SEC XSS-as-text mirror the Overview contract.
 *
 * METHOD: drive the REAL controls, read the REAL rendered rows (identified by a
 * unique trappedEmotions marker per seeded session), assert observable state
 * only. No source-text asserts.
 *
 * Read-only: EVALS assets/sessions.js into an isolated jsdom window; writes no
 * assets/* production file.
 *
 * Run: node tests/37-sessions-filters.test.js
 * Exits 0 on full pass, 1 on any failure (RED until 37-14 lands the controls).
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

var DEFAULT_KEYS = ['clinic', 'online', 'remote', 'proxy', 'other'];

function defaultT(k) {
  if (k === 'filter.sessionFormat.count') return '{count} selected';
  return k;
}

/**
 * Boot the REAL sessions.html + sessions.js. `opts.sessionTypes` seeds
 * localStorage['portfolioSessionTypes'] before the App stub reads it;
 * `opts.clients`/`opts.sessions` seed the mock DB so real rows render.
 */
function buildSessionsEnv(opts) {
  opts = opts || {};
  var html = readAsset('sessions.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/sessions.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  win.matchMedia = function () {
    return { matches: false, media: '', addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {} };
  };

  try { win.localStorage.setItem('portfolioLang', opts.lang || 'en'); } catch (_) {}
  if (opts.sessionTypes != null) {
    win.localStorage.setItem('portfolioSessionTypes',
      typeof opts.sessionTypes === 'string' ? opts.sessionTypes : JSON.stringify(opts.sessionTypes));
  }

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

  win.eval(readAsset('assets/sessions.js'));

  return { dom: dom, win: win, handlers: captured };
}

async function boot(env) {
  for (var i = 0; i < env.handlers.length; i++) { await env.handlers[i](); }
  await settle();
}

// The trappedEmotions marker of every rendered session row (index-4 cell), in
// DOM order. Reads the REAL rendered #sessionsTableBody.
function renderedMarkers(win) {
  var body = win.document.getElementById('sessionsTableBody');
  var rows = body ? body.querySelectorAll('tr.session-row') : [];
  return Array.prototype.map.call(rows, function (r) {
    var cell = r.children[4];
    return cell ? cell.textContent : '';
  });
}

function openFormatPanel(win) {
  win.document.getElementById('sessionFormatFilterToggle').click();
}
function checkFormat(win, key) {
  var box = win.document.querySelector('#sessionFormatFilterPanel input[type="checkbox"][data-format-key="' + key + '"]');
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

// One client; sessions spanning every default format + a custom key + ONE
// legacy-undefined session (resolves clinic), plus Heart-Wall combos. Each row is
// tagged with a unique trappedEmotions marker so the test can identify it.
function filterSeed() {
  return {
    sessionTypes: { overrides: {}, custom: [{ key: 'custom.900', label: 'Group session' }] },
    clients: [{ id: 1, name: 'Alice Adams' }],
    sessions: [
      { id: 1, clientId: 1, date: '2026-05-01', sessionType: 'online', trappedEmotions: 'M-online', issues: [] },
      { id: 2, clientId: 1, date: '2026-05-02', sessionType: 'remote', trappedEmotions: 'M-remote', issues: [] },
      { id: 3, clientId: 1, date: '2026-05-03', trappedEmotions: 'M-legacy', issues: [] }, // sessionType absent -> clinic
      { id: 4, clientId: 1, date: '2026-05-04', sessionType: 'proxy', trappedEmotions: 'M-proxy', issues: [] },
      { id: 5, clientId: 1, date: '2026-05-05', sessionType: 'custom.900', trappedEmotions: 'M-custom', issues: [] },
      { id: 6, clientId: 1, date: '2026-05-06', sessionType: 'clinic', isHeartShield: true, shieldRemoved: false, trappedEmotions: 'M-heartActive', issues: [] },
      { id: 7, clientId: 1, date: '2026-05-07', sessionType: 'remote', isHeartShield: true, shieldRemoved: true, trappedEmotions: 'M-heartReleased', issues: [] },
    ],
  };
}

(async function () {
  // ─── 1. Session Format multi-select: structure + option key set ───────────
  await test('Session Format multi-select renders (#sessionFormatFilter/.Toggle/.Panel) with option keys === getSessionTypes() keys (incl. custom)', async function () {
    var env = buildSessionsEnv(filterSeed());
    await boot(env);
    var win = env.win;

    var container = win.document.getElementById('sessionFormatFilter');
    assert.ok(container, 'the Session Format multi-select container #sessionFormatFilter must exist');
    assert.ok(container.classList.contains('multi-select'), '#sessionFormatFilter must carry the .multi-select class');
    assert.ok(win.document.getElementById('sessionFormatFilterToggle'), 'the pill #sessionFormatFilterToggle must exist');
    assert.ok(win.document.getElementById('sessionFormatFilterPanel'), 'the panel #sessionFormatFilterPanel must exist');

    var boxes = win.document.querySelectorAll('#sessionFormatFilterPanel input[type="checkbox"][data-format-key]');
    var keys = Array.prototype.map.call(boxes, function (b) { return b.getAttribute('data-format-key'); });
    var expected = DEFAULT_KEYS.concat(['custom.900']);
    assert.deepStrictEqual(keys, expected,
      'the checkbox data-format-key set must equal getSessionTypes() keys (5 defaults + the seeded custom); got ' + JSON.stringify(keys));
    env.dom.window.close();
  });

  // ─── 2. Session Format: empty = all; clinic includes legacy; union ────────
  await test('Session Format: 0 checked shows all sessions; checking clinic includes the legacy-undefined session and excludes non-clinic', async function () {
    var env = buildSessionsEnv(filterSeed());
    await boot(env);
    var win = env.win;
    assert.ok(win.document.getElementById('sessionFormatFilter'), 'the Session Format control must exist to exercise the filter');

    // Empty selection = all 7 seeded sessions.
    assert.strictEqual(renderedMarkers(win).length, 7, 'with zero formats checked every session row must be shown');

    openFormatPanel(win);
    checkFormat(win, 'clinic');
    await settle();

    var markers = renderedMarkers(win);
    // clinic-resolved rows = M-legacy (undefined->clinic) + M-heartActive (clinic).
    assert.ok(markers.indexOf('M-legacy') >= 0,
      'the sessionType-absent session must resolve to clinic and be included when clinic is checked; got ' + JSON.stringify(markers));
    assert.ok(markers.indexOf('M-online') < 0 && markers.indexOf('M-remote') < 0 && markers.indexOf('M-proxy') < 0 && markers.indexOf('M-custom') < 0,
      'non-clinic sessions must be excluded when only clinic is checked; got ' + JSON.stringify(markers));
    env.dom.window.close();
  });

  await test('Session Format: checking online+remote shows the union of both formats (proxy excluded)', async function () {
    var env = buildSessionsEnv(filterSeed());
    await boot(env);
    var win = env.win;
    assert.ok(win.document.getElementById('sessionFormatFilter'), 'the Session Format control must exist to exercise the union');

    openFormatPanel(win);
    checkFormat(win, 'online');
    checkFormat(win, 'remote');
    await settle();

    var markers = renderedMarkers(win);
    assert.ok(markers.indexOf('M-online') >= 0, 'the online session must be in the union; got ' + JSON.stringify(markers));
    assert.ok(markers.indexOf('M-remote') >= 0, 'a remote session must be in the union; got ' + JSON.stringify(markers));
    assert.ok(markers.indexOf('M-proxy') < 0 && markers.indexOf('M-custom') < 0 && markers.indexOf('M-legacy') < 0,
      'formats outside the selected union must be excluded; got ' + JSON.stringify(markers));
    env.dom.window.close();
  });

  // ─── 3. Heart-Wall toggle: structure + shieldRemoved-agnostic + old gone ──
  await test('Heart-Wall toggle #sessionHeartWallToggle lives inside label.toggle-switch (span.toggle-slider) and the old #sessionTypeFilter dropdown is REMOVED', async function () {
    var env = buildSessionsEnv(filterSeed());
    await boot(env);
    var win = env.win;

    var toggle = win.document.getElementById('sessionHeartWallToggle');
    assert.ok(toggle, 'the Heart-Wall toggle #sessionHeartWallToggle must exist');
    var label = toggle.closest('label.toggle-switch');
    assert.ok(label, '#sessionHeartWallToggle must sit inside a label.toggle-switch');
    assert.ok(label.querySelector('span.toggle-slider'), 'the toggle-switch must contain a span.toggle-slider');

    assert.strictEqual(win.document.getElementById('sessionTypeFilter'), null,
      'the old #sessionTypeFilter dropdown must be REMOVED once the Heart-Wall toggle replaces it');
    env.dom.window.close();
  });

  await test('Heart-Wall ON shows BOTH the active and the released heart sessions and excludes non-heart', async function () {
    var env = buildSessionsEnv(filterSeed());
    await boot(env);
    var win = env.win;

    var toggle = win.document.getElementById('sessionHeartWallToggle');
    assert.ok(toggle, 'the Heart-Wall toggle must exist to exercise the predicate');

    // OFF → all 7.
    assert.strictEqual(renderedMarkers(win).length, 7, 'with the Heart-Wall toggle OFF every session row must be shown');

    toggle.checked = true;
    toggle.dispatchEvent(new win.Event('change', { bubbles: true }));
    await settle();

    var markers = renderedMarkers(win).sort();
    assert.deepStrictEqual(markers, ['M-heartActive', 'M-heartReleased'],
      'Heart-Wall ON must show both isHeartShield===true sessions (active + released) and exclude every non-heart session; got ' + JSON.stringify(markers));
    env.dom.window.close();
  });

  // ─── 4. Pill summary contract + panel open/close ──────────────────────────
  await test('pill summary: 0 checked = filter.sessionFormat.all value; 2 checked contains "2" and never the literal "{count}"; summary text node has no data-i18n', async function () {
    var env = buildSessionsEnv(filterSeed());
    await boot(env);
    var win = env.win;

    var pill = win.document.getElementById('sessionFormatFilterToggle');
    assert.ok(pill, 'the pill #sessionFormatFilterToggle must exist to read its summary');

    assert.strictEqual(pill.textContent.trim(), win.App.t('filter.sessionFormat.all'),
      'with zero checked the pill summary must equal t("filter.sessionFormat.all")');
    assert.ok(pill.querySelector('[data-i18n]') === null && pill.getAttribute('data-i18n') === null,
      'the summary text node must carry NO data-i18n (applyTranslations would clobber the interpolated count)');

    pill.click();
    checkFormat(win, 'online');
    checkFormat(win, 'remote');
    await settle();

    var summary = win.document.getElementById('sessionFormatFilterToggle').textContent;
    assert.ok(summary.indexOf('2') >= 0,
      'after checking 2 formats the pill summary must contain the number 2; got ' + JSON.stringify(summary));
    assert.ok(summary.indexOf('{count}') < 0,
      'the summary must be interpolated caller-side (.replace) so it never contains the literal "{count}" token; got ' + JSON.stringify(summary));
    env.dom.window.close();
  });

  await test('panel opens on pill click, closes on Escape, and closes on an outside click', async function () {
    var env = buildSessionsEnv(filterSeed());
    await boot(env);
    var win = env.win;

    var pill = win.document.getElementById('sessionFormatFilterToggle');
    var panel = win.document.getElementById('sessionFormatFilterPanel');
    assert.ok(pill && panel, 'the pill + panel must exist to exercise open/close');

    function isOpen() { return !panel.classList.contains('is-hidden') && panel.hidden !== true; }

    pill.click();
    await settle();
    assert.ok(isOpen(), 'clicking the pill must OPEN the panel');

    win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
    assert.ok(!isOpen(), 'Escape must CLOSE the panel');

    pill.click();
    await settle();
    assert.ok(isOpen(), 're-opening the panel for the outside-click check');
    win.document.body.click();
    await settle();
    assert.ok(!isOpen(), 'a click outside the control must CLOSE the panel');
    env.dom.window.close();
  });

  // ─── 5. Security (T-37-10-SEC): custom label renders as literal text ──────
  await test('security (T-37-10-SEC): a custom Session Format label with an HTML-injection payload renders as literal text, no injected element', async function () {
    var PAYLOAD = '<img src=x onerror="window.__xss=1">';
    var env = buildSessionsEnv({
      sessionTypes: { overrides: {}, custom: [{ key: 'custom.evil', label: PAYLOAD }] },
      clients: [{ id: 1, name: 'Alice Adams' }],
      sessions: [{ id: 1, clientId: 1, date: '2026-05-01', sessionType: 'custom.evil', trappedEmotions: 'M-evil', issues: [] }],
    });
    await boot(env);
    var win = env.win;

    var panel = win.document.getElementById('sessionFormatFilterPanel');
    assert.ok(panel, 'the Session Format panel must exist to render the custom option label');
    var box = panel.querySelector('input[type="checkbox"][data-format-key="custom.evil"]');
    assert.ok(box, 'the custom option checkbox must render');

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
  console.log('Plan 37-10 sessions Session-Format + Heart-Wall filter tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (err) {
  console.error('FATAL test harness error:', err && err.stack || err);
  process.exit(1);
});
