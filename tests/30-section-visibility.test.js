/**
 * tests/30-section-visibility.test.js — the settings→add-session cross-module
 * link: custom section title → live form label, and disabled section → hidden
 * (TEST-03, F-E/D-13c, D-08/D-09, F-A).
 *
 * ROOT CAUSE THIS CLOSES: add-session.js applySectionLabels (writes
 * App.getSectionLabel(sectionKey, defaultI18nKey) into each
 * [data-section-key] .label[data-i18n] textContent) and applySectionVisibility
 * (toggles is-hidden on a wrapper via App.isSectionEnabled) are the glue that
 * carries a therapist's Settings customizations into the live session form. This
 * mechanism sits squarely in the markdown band Phase 31 (RFCT-02 / D-13c) will
 * extract, and the step-1-checkbox filter test does NOT cover it. Nothing
 * EXECUTED this label-render / visibility wiring before this thin guard.
 *
 * THE GUARD (D-09 jsdom real-page, D-10 thin — broad != unbounded): load the REAL
 * add-session.html body + the REAL assets/add-session.js into jsdom, inject an
 * App.* stub whose isSectionEnabled / getSectionLabel returns the test drives,
 * await the REAL DOMContentLoaded handler (which registers both fns + the
 * app:settings-changed listener and runs the initial new-session render), then
 * force a re-render by invoking the CAPTURED app:settings-changed handler
 * (a document-level listener — invoked directly, not via a flaky real dispatch).
 * Assert OBSERVABLE render only (D-08): the label textContent and the is-hidden
 * class — never an internal function name.
 *
 * F-J LIMITATION (stated here AND in success criteria): the section labels come
 * from the App STUB and App.initCommon is a no-op, so a green run pins
 * add-session's ORCHESTRATION/ORDERING — that the resolved label flows from
 * getSectionLabel into the right element, and that a disabled section hides — NOT
 * the therapist-visible custom-title TEXT produced by the real settings.js
 * writer. The Phase 31 D-13c glue cleanup could regress the real end-to-end
 * output while this stays green; that text is out of Phase 30's observable reach
 * without running the real settings.js writer.
 *
 * FALSIFIABLE: in a scratch copy, make applySectionLabels write the default
 * (skip the getSectionLabel resolution) and Case 1 FAILS; make
 * applySectionVisibility never add is-hidden for a disabled new-session section
 * and Case 2 FAILS. Renaming an INTERNAL fn with no observable change stays GREEN
 * (D-08/D-12).
 *
 * F-A (vacuous-green trap): the page DOMContentLoaded handler is ASYNC. Guarded
 * two ways: (1) capture-and-await the specific handler (25-06 docListeners) and
 * settle() the queue after every async-driven event; (2) an end-of-file count
 * guard asserts EXPECTED_COUNT ran.
 *
 * Read-only: EVALS assets/add-session.js + add-session.html into an isolated
 * jsdom window; it never writes any assets/* production file.
 *
 * Run: node tests/30-section-visibility.test.js
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
async function settle() { for (var i = 0; i < 6; i++) { await flush(); } }

/**
 * @param {object} appOverrides - per-test App.* overrides (isSectionEnabled,
 *        getSectionLabel) that drive the two cases.
 * @param {object} [envOpts] - env-level config.
 * @param {number} [envOpts.sessionId] - when set, the page boots in the
 *        past-session / editing path (?sessionId=N → editingSession truthy →
 *        applySectionVisibility(true)), exercising sectionHasData + the
 *        past-session branch (GAP-11 / region B4).
 * @param {Array}  [envOpts.sessions] - seeded session store for PortfolioDB.getSession.
 */
function buildEnv(appOverrides, envOpts) {
  envOpts = envOpts || {};
  var html = readAsset('add-session.html');
  var url = 'https://localhost/add-session.html';
  if (envOpts.sessionId != null) url += '?sessionId=' + envOpts.sessionId;
  var dom = new JSDOM(html, {
    url: url,
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  // Capture ALL document-level listeners into a map (keyed by type), still
  // forwarding non-DOMContentLoaded registrations to the real document. The
  // app:settings-changed listener is registered INSIDE the DOMContentLoaded
  // handler, so it only appears after we await that handler.
  var docHandlers = {};
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (!docHandlers[type]) docHandlers[type] = [];
    docHandlers[type].push(fn);
    if (type === 'DOMContentLoaded') return;
    return realAdd(type, fn, o);
  };

  // Minimal DOM-node severity no-op (F-B leaves the real pair to 30-06); init's
  // createIssueBlock appendChilds the scale so it must return a node. The two
  // cross-module overrides (isSectionEnabled/getSectionLabel) drive the cases.
  var baseOverrides = {
    createSeverityScale: function () { return win.document.createElement('div'); },
    getSeverityValue: function () { return null; },
  };
  Object.keys(appOverrides || {}).forEach(function (k) { baseOverrides[k] = appOverrides[k]; });
  win.App = createAppStub(baseOverrides);
  win.PortfolioDB = createMockPortfolioDB({ clients: [], sessions: envOpts.sessions || [] });
  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };

  win.eval(readAsset('assets/export-modal.js')); // export-modal.js BEFORE add-session.js (unconditional __exportModalInit boot call)
  win.eval(readAsset('assets/date-format.js')); // D-21: add-session.js boot reads window.DateFormat (todayLocalISO/parseLocal)
  win.eval(readAsset('assets/add-session.js'));

  if (!docHandlers['DOMContentLoaded'] || docHandlers['DOMContentLoaded'].length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler');
  }
  return { dom: dom, win: win, docHandlers: docHandlers };
}

// Invoke the captured app:settings-changed listener directly (it is a
// document-level listener registered inside the DOMContentLoaded handler).
function fireSettingsChanged(env) {
  var hs = env.docHandlers['app:settings-changed'];
  assert.ok(hs && hs.length >= 1, 'add-session.js must register an app:settings-changed listener');
  hs.forEach(function (fn) { fn(); });
}

function wrapper(win, key) {
  return win.document.querySelector('[data-section-key="' + key + '"]');
}
function labelText(win, key) {
  var w = wrapper(win, key);
  var el = w && w.querySelector('.label[data-i18n]');
  return el ? el.textContent : null;
}
function badge(win, key) {
  var w = wrapper(win, key);
  return w && w.querySelector('.disabled-indicator-badge');
}

/**
 * Cross-module env (GAP-11 / R11): boot add-session against the REAL
 * assets/app.js getSectionLabel reader — NOT createAppStub's id-returning stub.
 * We eval the real app.js, seed PortfolioDB.therapistSettings with a custom
 * label, then run the REAL App.initCommon() so it populates the real (private)
 * _sectionLabelCache via the real cross-module read path. add-session then boots
 * on the safe stub for every OTHER App.* method, but its getSectionLabel
 * DELEGATES to realApp.getSectionLabel — so the rendered therapist-visible title
 * is produced end-to-end by the real reader reading the real cache. This guards
 * the Phase-31 D-13c glue cleanup from silently regressing the visible title.
 *
 * @param {Array} therapistSettings - seeded rows, e.g.
 *        [{ sectionKey:'trapped', customLabel:'My Title' }]
 */
async function buildRealReaderEnv(therapistSettings) {
  var html = readAsset('add-session.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/add-session.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  win.I18N_DEFAULT = 'en';
  win.BroadcastChannel = function () {
    return { postMessage: function () {}, close: function () {}, addEventListener: function () {} };
  };
  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };

  // Seed the custom therapist label, then eval the REAL app.js and run the REAL
  // initCommon so getSectionLabel reads a cache populated from the seed.
  win.PortfolioDB = createMockPortfolioDB({ clients: [], sessions: [], therapistSettings: therapistSettings });
  win.eval(readAsset('assets/app.js'));
  var realApp = win.App;
  if (typeof realApp.getSectionLabel !== 'function' || typeof realApp.initCommon !== 'function') {
    throw new Error('assets/app.js did not expose getSectionLabel/initCommon');
  }
  await realApp.initCommon(); // populates the real private _sectionLabelCache from the seed

  // Capture add-session.js's DOMContentLoaded handler (installed AFTER initCommon
  // so the real init's own listeners are not swallowed — mirrors 30-issue-delta).
  var docHandlers = {};
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (!docHandlers[type]) docHandlers[type] = [];
    docHandlers[type].push(fn);
    if (type === 'DOMContentLoaded') return;
    return realAdd(type, fn, o);
  };

  // Stub the add-session boot surface, but DELEGATE getSectionLabel to the real
  // reader so the rendered title is real end-to-end.
  win.App = createAppStub({
    createSeverityScale: function () { return win.document.createElement('div'); },
    getSeverityValue: function () { return null; },
    getSectionLabel: function (sectionKey, defaultI18nKey) {
      return realApp.getSectionLabel(sectionKey, defaultI18nKey);
    },
  });

  win.eval(readAsset('assets/export-modal.js')); // export-modal.js BEFORE add-session.js (unconditional __exportModalInit boot call)
  win.eval(readAsset('assets/date-format.js')); // D-21: add-session.js boot reads window.DateFormat (todayLocalISO/parseLocal)
  win.eval(readAsset('assets/add-session.js'));
  if (!docHandlers['DOMContentLoaded'] || docHandlers['DOMContentLoaded'].length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler');
  }
  return { dom: dom, win: win, docHandlers: docHandlers, realApp: realApp };
}

/**
 * Export-flow env (NEXT-06 / D-09): boot add-session on a CLEAN, already-saved
 * ?sessionId=1 session (empty content) so the export trigger takes the "clean AND
 * saved → open directly" path (no save-before-export prompt), then drive the REAL
 * export dialog step-1 rows + filtered builder. Mirrors tests/30-export-markdown.js
 * buildEnv. Used only by the nextSession toggle-default + exclusion cases below.
 */
function buildExportEnv() {
  var html = readAsset('add-session.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/add-session.html?sessionId=1',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, opts) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, opts);
  };

  win.App = createAppStub({
    createSeverityScale: function () { return win.document.createElement('div'); },
    getSeverityValue: function () { return null; },
  });
  win.PortfolioDB = createMockPortfolioDB({
    clients: [{ id: 1, name: 'Test Client' }],
    sessions: [{
      id: 1, clientId: 1, date: '', sessionType: 'clinic', issues: [],
      trappedEmotions: '', heartShieldEmotions: '', insights: '',
      limitingBeliefs: '', additionalTech: '', customerSummary: '', comments: '',
      isHeartShield: false, shieldRemoved: null
    }]
  });
  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };

  win.eval(readAsset('assets/export-modal.js'));
  win.eval(readAsset('assets/date-format.js'));
  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0] };
}

// The rendered step-1 checkbox for a section key (null until the dialog is open).
function step1Checkbox(win, key) {
  return win.document.querySelector('#exportStep1Rows input[data-section-key="' + key + '"]');
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── Case 1: custom title → live form label textContent ──────────────────────
  await test('a custom getSectionLabel return renders into the matching [data-section-key] .label[data-i18n] textContent (applySectionLabels)', async function () {
    var CUSTOM = 'My Renamed Trapped Section';
    var env = buildEnv({
      getSectionLabel: function (sectionKey, defaultI18nKey) {
        if (sectionKey === 'trapped') return CUSTOM;
        return defaultI18nKey; // others fall back to their i18n key
      },
    });
    var win = env.win;
    await env.docHandlers['DOMContentLoaded'][0]();
    await settle();

    // Force the cross-module re-render explicitly.
    fireSettingsChanged(env);
    await settle();

    assert.strictEqual(labelText(win, 'trapped'), CUSTOM,
      'the trapped section label must render the custom getSectionLabel value (the settings→add-session label wiring)');
    // A control: a section without a custom title shows its default i18n key.
    assert.strictEqual(labelText(win, 'comments'), 'session.form.comments',
      'a section with no custom title must keep its default i18n label (proves the custom value is per-section, not blanket)');

    env.dom.window.close();
  });

  // ─── Case 2: disabled section on a new session → is-hidden ───────────────────
  await test('a disabled section (isSectionEnabled false) on a NEW session gets the is-hidden class while an enabled section stays visible (applySectionVisibility)', async function () {
    var env = buildEnv({
      isSectionEnabled: function (sectionKey) {
        return sectionKey !== 'comments'; // comments disabled, all others enabled
      },
    });
    var win = env.win;
    await env.docHandlers['DOMContentLoaded'][0]();
    await settle();

    fireSettingsChanged(env);
    await settle();

    var disabled = wrapper(win, 'comments');
    var enabled = wrapper(win, 'trapped');
    assert.ok(disabled, 'the comments section wrapper must exist');
    assert.ok(enabled, 'the trapped section wrapper must exist');
    assert.strictEqual(disabled.classList.contains('is-hidden'), true,
      'a disabled section on a new (non-past) session must be hidden (is-hidden)');
    assert.strictEqual(enabled.classList.contains('is-hidden'), false,
      'an enabled section must remain visible (control — the hide is not blanket)');

    env.dom.window.close();
  });

  // ─── Case 3: past-session branch — disabled WITH data visible+badged; disabled
  // NO data hidden (GAP-11 / region B4 — sectionHasData + the :960-969 branch).
  await test('on a PAST session a disabled section WITH data renders visible + badged while a disabled section with NO data is is-hidden (applySectionVisibility(true) + sectionHasData)', async function () {
    var env = buildEnv({
      // Both trapped and comments are DISABLED in settings; the past-session +
      // has-data rule decides their visibility, not the enabled flag.
      isSectionEnabled: function (sectionKey) {
        return sectionKey !== 'trapped' && sectionKey !== 'comments';
      },
    }, {
      sessionId: 1,
      // trapped HAS data, comments has NONE → past-session branch must split them.
      sessions: [{ id: 1, clientId: 1, date: '2026-06-01', trappedEmotions: 'HAS_TRAP_DATA', comments: '' }],
    });
    var win = env.win;
    // Booting with ?sessionId=1 drives the editing path → applySectionVisibility(true).
    await env.docHandlers['DOMContentLoaded'][0]();
    await settle();

    var withData = wrapper(win, 'trapped');
    var noData = wrapper(win, 'comments');
    assert.ok(withData, 'the trapped section wrapper must exist');
    assert.ok(noData, 'the comments section wrapper must exist');

    // Disabled + past-session + HAS data → visible + badge shown.
    assert.strictEqual(withData.classList.contains('is-hidden'), false,
      'a disabled past-session section WITH data must stay visible (REQ-5 amendment)');
    var withBadge = badge(win, 'trapped');
    assert.ok(withBadge, 'the trapped section must carry a disabled-indicator badge element');
    assert.strictEqual(withBadge.classList.contains('is-hidden'), false,
      'a disabled past-session section WITH data must SHOW its disabled badge');

    // Disabled + past-session + NO data → hidden.
    assert.strictEqual(noData.classList.contains('is-hidden'), true,
      'a disabled past-session section with NO data must be hidden (is-hidden)');

    env.dom.window.close();
  });

  // ─── Case 4: cross-module section-label via the REAL app.js getSectionLabel
  // (GAP-11 / R11). Real reader + real cache populated by real initCommon from a
  // seeded therapistSetting → the therapist-visible CUSTOM title renders
  // end-to-end (guards the Phase-31 D-13c glue cleanup). NOT the stubbed reader.
  await test('the REAL app.js getSectionLabel (cache populated by the real initCommon from a seeded custom therapistSetting) renders the therapist-visible CUSTOM title end-to-end', async function () {
    var CUSTOM = 'My Renamed Trapped Section (real)';
    var env = await buildRealReaderEnv([{ sectionKey: 'trapped', customLabel: CUSTOM }]);
    var win = env.win;
    await env.docHandlers['DOMContentLoaded'][0]();
    await settle();

    fireSettingsChanged(env);
    await settle();

    // Sanity: the reader in play is the REAL one (resolves the seeded custom label).
    assert.strictEqual(env.realApp.getSectionLabel('trapped', 'session.form.trapped'), CUSTOM,
      'precondition: the REAL app.js reader must resolve the seeded custom label');

    assert.strictEqual(labelText(win, 'trapped'), CUSTOM,
      'add-session must render the therapist-visible CUSTOM title produced by the REAL app.js getSectionLabel (end-to-end, not a stubbed id)');
    // Control: a section with no custom row keeps its default i18n label — proves
    // the custom value is per-section, sourced from the real cache, not blanket.
    assert.strictEqual(labelText(win, 'comments'), 'session.form.comments',
      'a section without a seeded custom label must keep its default i18n key (real reader fallthrough)');

    env.dom.window.close();
  });

  // ─── Case 5: nextSession content-check keys off note OR date (NEXT-06/D-09) ───
  // The export step-1 nextSession toggle must default ON when ONLY a date is
  // present (content = note OR date), and OFF when NEITHER is present. Today the
  // content-check (export-modal.js:142-144) keys off #customerSummary (the note)
  // only, and nextSession's default-checked is not data-gated, so an empty session
  // shows it CHECKED → the "empty ⇒ unchecked" assertion is RED until Plan 38-06
  // gates the default on hasData(note OR date). The #nextSessionDate field itself
  // is RED until Plan 38-04.
  await test('nextSession export toggle defaults ON for a date-only session and OFF when neither note nor date is present (content-check = note OR date)', async function () {
    // (a) date-only session → nextSession toggle CHECKED.
    var envA = buildExportEnv();
    var winA = envA.win;
    await envA.domHandler();
    await settle();

    var dateFieldA = winA.document.getElementById('nextSessionDate');
    assert.ok(dateFieldA, '#nextSessionDate must exist on the add-session page (RED until Plan 38-04 wires the field)');
    winA.document.getElementById('customerSummary').value = ''; // note empty
    dateFieldA.value = '2026-09-15';                            // date present

    winA.document.getElementById('exportSessionBtn').click();
    await settle();
    var cbA = step1Checkbox(winA, 'nextSession');
    assert.ok(cbA, 'the nextSession step-1 checkbox must render');
    assert.strictEqual(cbA.checked, true,
      'a date-only session must default the nextSession export toggle ON (content-check counts the date)');
    envA.dom.window.close();

    // (b) neither note nor date → nextSession toggle UNCHECKED (RED today: it is
    //     checked unconditionally until the default is gated on hasData at 38-06).
    var envB = buildExportEnv();
    var winB = envB.win;
    await envB.domHandler();
    await settle();

    var dateFieldB = winB.document.getElementById('nextSessionDate');
    assert.ok(dateFieldB, '#nextSessionDate must exist on the add-session page (RED until Plan 38-04 wires the field)');
    winB.document.getElementById('customerSummary').value = ''; // note empty
    dateFieldB.value = '';                                       // date empty

    winB.document.getElementById('exportSessionBtn').click();
    await settle();
    var cbB = step1Checkbox(winB, 'nextSession');
    assert.ok(cbB, 'the nextSession step-1 checkbox must render');
    assert.strictEqual(cbB.checked, false,
      'a session with NEITHER a note NOR a date must default the nextSession export toggle OFF (content-check drives the default)');
    envB.dom.window.close();
  });

  // ─── Case 6: excluding nextSession drops BOTH the note AND the date (D-09) ─────
  // With a note AND a date, the default (checked) filtered export includes BOTH;
  // unticking the section drops BOTH. The date half is RED until Plan 38-06
  // appends the date line; the field is RED until Plan 38-04.
  await test('the filtered export includes BOTH the note and the date when nextSession is checked, and drops BOTH when it is unticked', async function () {
    var NOTE = 'NOTE_MARK_X';
    var NEXT_ISO = '2026-10-20';

    // (a) checked (default) → filtered markdown carries BOTH note and formatted date.
    var envA = buildExportEnv();
    var winA = envA.win;
    await envA.domHandler();
    await settle();

    var dateFieldA = winA.document.getElementById('nextSessionDate');
    assert.ok(dateFieldA, '#nextSessionDate must exist on the add-session page (RED until Plan 38-04 wires the field)');
    winA.document.getElementById('customerSummary').value = NOTE;
    dateFieldA.value = NEXT_ISO;

    winA.document.getElementById('exportSessionBtn').click();
    await settle();
    winA.document.getElementById('exportNextBtn').click();
    await settle();

    var mdChecked = winA.document.getElementById('exportEditor').value;
    var formattedA = winA.App.formatDate(NEXT_ISO);
    assert.ok(mdChecked.indexOf(NOTE) !== -1, 'the note must be present when nextSession is checked');
    assert.ok(mdChecked.indexOf(formattedA) !== -1,
      'the formatted date (App.formatDate("' + NEXT_ISO + '") = "' + formattedA + '") must be present when nextSession is checked');
    envA.dom.window.close();

    // (b) unticked → filtered markdown carries NEITHER the note NOR the date.
    var envB = buildExportEnv();
    var winB = envB.win;
    await envB.domHandler();
    await settle();

    var dateFieldB = winB.document.getElementById('nextSessionDate');
    assert.ok(dateFieldB, '#nextSessionDate must exist on the add-session page (RED until Plan 38-04 wires the field)');
    winB.document.getElementById('customerSummary').value = NOTE;
    dateFieldB.value = NEXT_ISO;

    winB.document.getElementById('exportSessionBtn').click();
    await settle();
    var cb = step1Checkbox(winB, 'nextSession');
    assert.ok(cb, 'the nextSession step-1 checkbox must render');
    cb.checked = false; // exclude the section
    winB.document.getElementById('exportNextBtn').click();
    await settle();

    var mdUnticked = winB.document.getElementById('exportEditor').value;
    var formattedB = winB.App.formatDate(NEXT_ISO);
    assert.ok(mdUnticked.indexOf(NOTE) === -1, 'unticking nextSession must drop the note');
    assert.ok(mdUnticked.indexOf(formattedB) === -1, 'unticking nextSession must drop the date too (both, per D-09)');
    envB.dom.window.close();
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────────
  var EXPECTED_COUNT = 6;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 30-05 section-visibility tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
