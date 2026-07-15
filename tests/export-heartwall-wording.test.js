/**
 * tests/export-heartwall-wording.test.js — the Heart-Wall export line carries
 * explanatory export-only wording, never the form's bare Yes/No.
 *
 * WHAT THIS GUARDS: a session flagged as a Heart-Wall session but NOT released
 * used to export a bare "No" under the Heart-Wall heading — which readers first
 * take to mean "not a Heart-Wall session" (wrong; it means identified but not
 * yet released). The released case exported a bare "Yes", also thin. Both
 * export builders now route through two NEW export-only i18n keys:
 *
 *   session.export.heartWall.released     — "Heart-Wall removed"
 *   session.export.heartWall.notReleased  — "Heart-Wall present — not removed
 *                                            this session"
 *
 * The add/edit form radio labels (session.form.shieldRemoved.yes/no = plain
 * Yes/No) are SHARED with the form and must stay unchanged — the fix is
 * export-only. The PDF renders the Heart-Wall line from the same markdown body
 * buildFilteredSessionMarkdown produces, so covering that builder covers the
 * PDF path.
 *
 * CASES:
 *   1. i18n parity — both new keys exist non-empty in all four locales; the EN
 *      values pin the ratified wording; the form radio EN values stay exactly
 *      "Yes"/"No" (untouched).
 *   2. Flagged, NOT released — BOTH builders emit the notReleased export key
 *      and neither emits the form's shieldRemoved.no key (no bare "No").
 *   3. Flagged, released — BOTH builders emit the released export key and
 *      neither emits the form's shieldRemoved.yes key (no bare "Yes").
 *   4. Not flagged — the Heart-Wall section stays absent entirely in both
 *      builders (the deliberate third state: omission, not a label).
 *   5. Source guard — assets/export-modal.js no longer references the shared
 *      form-radio value keys at all (the two builders were its only consumers).
 *
 * HARNESS (the export-emotions-optout idiom): load the REAL add-session.html +
 * assets/export-modal.js + assets/add-session.js into a jsdom window with the
 * key-returning App stub + mock PortfolioDB seeded per case, drive the REAL
 * DOMContentLoaded populate, then call the REAL builders through the
 * __exportModalTestHooks seam. The key-returning App.t stub makes the routed
 * i18n key observable as the emitted text, so key-routing assertions are exact.
 *
 * FALSIFIABLE: repoint either builder back to session.form.shieldRemoved.yes/no
 * and case 2/3/5 FAIL; drop either new key from any locale and case 1 FAILS;
 * emit the section for unflagged sessions and case 4 FAILS.
 *
 * Read-only: EVALS assets/* into an isolated jsdom window; writes no assets/*.
 *
 * Run: node tests/export-heartwall-wording.test.js
 * Exits 0 on full pass, 1 on any failure (the tests/run-all.js contract).
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
async function settle(n) { for (var i = 0; i < (n || 8); i++) { await flush(); } }

var RELEASED_KEY = 'session.export.heartWall.released';
var NOT_RELEASED_KEY = 'session.export.heartWall.notReleased';
var FORM_YES_KEY = 'session.form.shieldRemoved.yes';
var FORM_NO_KEY = 'session.form.shieldRemoved.no';

// All document section keys the filtered builder accepts — heartShield included
// so the Heart-Wall section is SELECTED and only the flag decides its presence.
var ALL_SECTION_KEYS = ['trapped', 'insights', 'limitingBeliefs', 'additionalTech',
  'heartShield', 'heartShieldEmotions', 'issues', 'comments', 'nextSession'];

// Real add-session page + real export-modal/add-session scripts, seeded with a
// single saved session whose Heart-Wall flags are the per-case variable.
// `shieldRemoved` is the stored boolean (true → the "yes" radio gets checked
// during populate, false → "no", null → neither).
function buildEnv(isHeartShield, shieldRemoved) {
  var html = readAsset('add-session.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/add-session.html?sessionId=1',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  win.App = createAppStub({
    createSeverityScale: function () { return win.document.createElement('div'); },
    getSeverityValue: function () { return null; },
  });
  win.PortfolioDB = createMockPortfolioDB({
    clients: [{ id: 1, name: 'Test Client' }],
    sessions: [{
      id: 1, clientId: 1, date: '2026-01-05', sessionType: 'clinic', issues: [],
      trappedEmotions: 'TRAP_X', heartShieldEmotions: '', insights: '',
      limitingBeliefs: '', additionalTech: '', customerSummary: '', comments: '',
      isHeartShield: isHeartShield, shieldRemoved: shieldRemoved
    }]
  });
  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };

  win.eval(readAsset('assets/export-modal.js')); // before add-session.js (init handshake)
  win.eval(readAsset('assets/date-format.js'));
  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0] };
}

// Build both markdown outputs for one seeded flag combination, then close.
async function buildBoth(isHeartShield, shieldRemoved) {
  var env = buildEnv(isHeartShield, shieldRemoved);
  await env.domHandler();
  await settle();
  var hooks = env.win.__exportModalTestHooks;
  assert.ok(hooks && typeof hooks.buildSessionMarkdown === 'function',
    '__exportModalTestHooks.buildSessionMarkdown must be exposed');
  assert.ok(typeof hooks.buildFilteredSessionMarkdown === 'function',
    '__exportModalTestHooks.buildFilteredSessionMarkdown must be exposed');
  var copyMd = hooks.buildSessionMarkdown();
  var filteredMd = hooks.buildFilteredSessionMarkdown(ALL_SECTION_KEYS);
  env.dom.window.close();
  return { copyMd: copyMd, filteredMd: filteredMd };
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── 1. i18n parity + pinned wording + untouched form radios ───────────────
  await test('both export-only keys exist non-empty in all four locales; EN pins the ratified wording; the form radios stay plain Yes/No', function () {
    var sandbox = { window: {}, console: { log: function () {}, warn: function () {}, error: function () {} } };
    sandbox.window.I18N = {};
    sandbox.window.QUOTES = {};
    vm.createContext(sandbox);
    var LOCALES = ['en', 'he', 'de', 'cs'];
    LOCALES.forEach(function (loc) {
      vm.runInContext(readAsset('assets/i18n-' + loc + '.js'), sandbox, { filename: 'assets/i18n-' + loc + '.js' });
    });
    LOCALES.forEach(function (loc) {
      var map = sandbox.window.I18N[loc];
      assert.ok(map && typeof map === 'object', 'window.I18N.' + loc + ' must load');
      [RELEASED_KEY, NOT_RELEASED_KEY].forEach(function (key) {
        var val = map[key];
        assert.strictEqual(typeof val, 'string',
          key + ' must exist in i18n-' + loc + '.js (locale structure parity)');
        assert.ok(val.trim().length > 0,
          key + ' must be non-empty in i18n-' + loc + '.js');
      });
    });
    // The ratified EN wording (present/removed vocabulary).
    assert.strictEqual(sandbox.window.I18N.en[RELEASED_KEY], 'Heart-Wall removed',
      'the EN released wording must carry the ratified copy');
    assert.strictEqual(sandbox.window.I18N.en[NOT_RELEASED_KEY],
      'Heart-Wall present — not removed this session',
      'the EN not-released wording must carry the ratified copy');
    // The SHARED form radio labels are untouched — plain Yes/No.
    assert.strictEqual(sandbox.window.I18N.en[FORM_YES_KEY], 'Yes',
      'the form radio yes label must stay plain "Yes" (shared with add-session.html)');
    assert.strictEqual(sandbox.window.I18N.en[FORM_NO_KEY], 'No',
      'the form radio no label must stay plain "No" (shared with add-session.html)');
  });

  // ─── 2. Flagged, NOT released → notReleased key in BOTH builders ───────────
  await test('flagged-but-not-released: both builders emit the notReleased export key, never the form no-radio key', async function () {
    var md = await buildBoth(true, false); // stored boolean false → "no" radio
    [['copy', md.copyMd], ['filtered/PDF', md.filteredMd]].forEach(function (pair) {
      var label = pair[0], body = pair[1];
      assert.ok(body.indexOf('## heartShield') !== -1,
        'the ' + label + ' markdown must carry the Heart-Wall section heading');
      assert.ok(body.indexOf(NOT_RELEASED_KEY) !== -1,
        'the ' + label + ' markdown must route the value line through ' + NOT_RELEASED_KEY);
      assert.ok(body.indexOf(FORM_NO_KEY) === -1,
        'the ' + label + ' markdown must NOT route through the form radio key ' + FORM_NO_KEY + ' (the bare "No")');
    });
  });

  // ─── 3. Flagged, released → released key in BOTH builders ──────────────────
  await test('released: both builders emit the released export key, never the form yes-radio key', async function () {
    var md = await buildBoth(true, true); // stored boolean true → "yes" radio
    [['copy', md.copyMd], ['filtered/PDF', md.filteredMd]].forEach(function (pair) {
      var label = pair[0], body = pair[1];
      assert.ok(body.indexOf('## heartShield') !== -1,
        'the ' + label + ' markdown must carry the Heart-Wall section heading');
      assert.ok(body.indexOf(RELEASED_KEY) !== -1,
        'the ' + label + ' markdown must route the value line through ' + RELEASED_KEY);
      assert.ok(body.indexOf(FORM_YES_KEY) === -1,
        'the ' + label + ' markdown must NOT route through the form radio key ' + FORM_YES_KEY + ' (the bare "Yes")');
    });
  });

  // ─── 4. Not flagged → the section stays absent (omission, no third label) ──
  await test('not a Heart-Wall session: the section is omitted entirely in both builders', async function () {
    var md = await buildBoth(false, null);
    [['copy', md.copyMd], ['filtered/PDF', md.filteredMd]].forEach(function (pair) {
      var label = pair[0], body = pair[1];
      assert.ok(body.indexOf('## heartShield') === -1,
        'the ' + label + ' markdown must omit the Heart-Wall section for unflagged sessions');
      assert.ok(body.indexOf(RELEASED_KEY) === -1 && body.indexOf(NOT_RELEASED_KEY) === -1,
        'the ' + label + ' markdown must carry neither Heart-Wall status line for unflagged sessions');
      // A present section proves the builder ran, so the omission is targeted.
      assert.ok(body.indexOf('TRAP_X') !== -1,
        'other sections must still render in the ' + label + ' markdown');
    });
  });

  // ─── 5. Source guard: export-modal.js dropped the form-radio value keys ────
  await test('assets/export-modal.js no longer references the shared form-radio value keys', function () {
    var src = readAsset('assets/export-modal.js');
    assert.ok(src.indexOf(FORM_YES_KEY) === -1,
      'export-modal.js must not reference ' + FORM_YES_KEY + ' anywhere');
    assert.ok(src.indexOf(FORM_NO_KEY) === -1,
      'export-modal.js must not reference ' + FORM_NO_KEY + ' anywhere');
    // Both builders reference each new key once — two sites per key.
    [RELEASED_KEY, NOT_RELEASED_KEY].forEach(function (key) {
      var count = src.split('App.t("' + key + '")').length - 1;
      assert.strictEqual(count, 2,
        'export-modal.js must call App.t("' + key + '") in exactly the two builders (got ' + count + ')');
    });
  });

  // ─── end-of-file count guard (vacuous-green trap) ───────────────────────────
  var EXPECTED_COUNT = 5;
  if (passed + failed !== EXPECTED_COUNT) {
    console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped.');
    process.exit(1);
  }

  console.log('');
  console.log('export-heartwall-wording tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
