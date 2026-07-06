/**
 * tests/30-export-markdown.test.js — add-session export markdown builders
 * characterization (TEST-03c, D-08/D-09, F-C).
 *
 * ROOT CAUSE THIS CLOSES: the markdown a therapist copies/exports from a session
 * (section order, included/excluded sections, scale labels, headings) is the
 * highest-risk, lowest-covered output of assets/add-session.js — and the exact
 * region Phase 31 RFCT-02 will extract. The only "tests" that touched it
 * (quick-260615-export-section-order, quick-260516-g7p) `fs.readFileSync` the
 * asset and regex-match internal function BODIES (D-08 anti-pattern): they assert
 * SHAPE, not behavior, and break on a Phase-31 rename that changes nothing a user
 * sees. Nothing EXECUTED the builders against real form DOM before this test.
 *
 * THE GUARD (D-09 jsdom real-page): load the REAL add-session.html body + the
 * REAL assets/add-session.js into a jsdom window, inject the App.* stub and a
 * mock PortfolioDB, drive the REAL DOMContentLoaded handler, populate the session
 * form, and observe the emitted markdown through OBSERVABLE output only (D-08),
 * with the two builders anchored explicitly (F-C):
 *   - FILTERED builder (buildFilteredSessionMarkdown): observed via
 *     `#exportEditor.value` AFTER ticking/unticking the #exportStep1Rows section
 *     checkboxes and clicking #exportNextBtn (the step-1→Next path,
 *     add-session.js:1499-1500). NOT via #exportPreview.textContent — that is
 *     filled by exportUpdatePreview with MdRender.render(...) HTML which consumes
 *     the markdown markers; only its fragile MdRender-absent else-branch degrades
 *     to editor.value.
 *   - FULL builder (buildSessionMarkdown): reachable ONLY via copySessionBtn →
 *     copyTextToClipboard. Under jsdom window.isSecureContext is false so the
 *     real path falls to the execCommand("copy") NO-OP (nothing observable). So
 *     we force isSecureContext=true and install a capturing
 *     navigator.clipboard.writeText spy, click #copySessionBtn, and assert the
 *     captured argument — a SEPARATE explicit assertion (F-C), not folded into
 *     the filtered case.
 *
 * Never an internal function name (D-08/D-12): the test asserts the emitted
 * markdown TEXT (headings, content, ordering), the editor value, and the
 * clipboard-spy arg. It EXECUTES add-session.js under jsdom — it performs NO
 * source-slicing (no fs.readFileSync of the asset for assertion, no
 * indexOf('function ')), and does NOT widen window.__addSessionTestHooks or
 * modify any assets/* file.
 *
 * FALSIFIABLE (per feedback-behavior-verification): in a scratch copy, revert the
 * 260615 section-order fix (emit insights LAST, after additionalTech) and Case A
 * FAILS (indexOf('## insights') no longer follows '## trapped'); drop a section
 * from the filtered selection wiring and Case B FAILS. Rename an INTERNAL builder
 * (buildFilteredSessionMarkdown → buildPickedMarkdown) with no observable change
 * and ALL cases stay GREEN (D-08/D-12). A source-grep could not tell those two
 * mutations apart; executing the module and reading editor.value / the clipboard
 * arg can.
 *
 * F-A (vacuous-green trap): the page DOMContentLoaded handler is ASYNC; a naive
 * synchronous dispatch returns before the page wires up and the file could exit
 * green with zero work. Guarded two ways: (1) we CAPTURE the specific
 * DOMContentLoaded handler (the 25-06 docListeners pattern) and `await` it, then
 * settle() the microtask/timer queue after every async-driven event; (2) an
 * end-of-file count guard asserts exactly EXPECTED_COUNT cases executed.
 *
 * Read-only: this test EVALS assets/add-session.js + add-session.html into an
 * isolated jsdom window; it never writes any assets/* production file.
 *
 * Run: node tests/30-export-markdown.test.js
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

// Flush the microtask + 0ms-timer queue several times so the async page handler
// and any async-driven click handler (copySessionBtn → copyTextToClipboard)
// fully resolve before assertions.
function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle() { for (var i = 0; i < 6; i++) { await flush(); } }

/**
 * Build a jsdom env: real add-session.html + real add-session.js, with the App
 * stub and a mock PortfolioDB injected. Captures the (single) DOMContentLoaded
 * handler so the test can `await` it rather than relying on a blanket dispatch.
 */
function buildEnv() {
  var html = readAsset('add-session.html');
  // Open on a SAVED, clean session (?sessionId=1) so the export trigger takes the
  // "clean AND saved → open directly" path. The PDFX-03 / D-13 save-before-export
  // guard (34-08) fences export behind a non-blocking prompt for a dirty / never-
  // saved session; these markdown-builder tests assert the FILTERED/FULL markdown
  // downstream of the open, so they load an existing EMPTY-content session
  // (issues:[] → one default empty issue row, all fields "") which populateSession
  // leaves byte-identical to a fresh new session. buildFilteredSessionMarkdown
  // omits client/date from the body, so every markdown assertion is unchanged.
  var dom = new JSDOM(html, {
    url: 'https://localhost/add-session.html?sessionId=1',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  // Capture DOMContentLoaded (25-06 docListeners pattern); pass every other
  // listener registration through to the real document so internal listeners
  // (app:settings-changed, keydown, etc.) keep working.
  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, opts) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, opts);
  };

  // The severity pair is left UNstubbed by app-stub by default (F-B). These
  // markdown tests do not exercise the issue-delta path, but createIssueBlock
  // (called once at init, add-session.js:1566) calls App.createSeverityScale and
  // appendChilds the result — so we supply a minimal DOM-node no-op purely to
  // keep init from throwing. getSeverityValue returns null (no issue scores),
  // which leaves the always-present "## issues" heading with the empty payload —
  // exactly what the FULL-builder case asserts (heading present; no score text).
  win.App = createAppStub({
    createSeverityScale: function () { return win.document.createElement('div'); },
    getSeverityValue: function () { return null; },
  });
  // add-session.js init calls PortfolioDB.getAllClients() (loadClients) and, with
  // ?sessionId=1, PortfolioDB.getSession(1). Seed the saved session (empty content
  // → form matches a fresh new session post-populate) so editingSession is set and
  // the export trigger's save-before-export guard sees a clean, already-saved
  // session and opens the dialog directly.
  win.PortfolioDB = createMockPortfolioDB({
    clients: [{ id: 1, name: 'Test Client' }],
    sessions: [{
      id: 1, clientId: 1, date: '', sessionType: 'clinic', issues: [],
      trappedEmotions: '', heartShieldEmotions: '', insights: '',
      limitingBeliefs: '', additionalTech: '', customerSummary: '', comments: '',
      isHeartShield: false, shieldRemoved: null
    }]
  });

  // jsdom does not implement matchMedia; add-session.js uses it for the
  // accordion + export mobile-tabs layout (desktop branch when matches=false).
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

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' +
      captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0] };
}

function setVal(win, id, value) {
  var el = win.document.getElementById(id);
  assert.ok(el, 'form field #' + id + ' must exist in add-session.html');
  el.value = value;
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── A. FILTERED builder: default selection → correct order + inclusion ──────
  await test('FILTERED builder (#exportEditor.value after step-1→Next): default section selection has insights AFTER trapped and includes the checked sections', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    // Populate four ordered text sections with distinctive content.
    setVal(win, 'trappedEmotions', 'TRAP_X');
    setVal(win, 'sessionInsights', 'INS_X');
    setVal(win, 'limitingBeliefs', 'LB_X');
    setVal(win, 'additionalTech', 'AT_X');

    // Open the export dialog via the REAL user path (the button's click handler
    // calls openExportDialog → exportRenderStep1Rows + exportSetActiveStep(1)).
    win.document.getElementById('exportSessionBtn').click();
    await settle();

    // Defaults: trapped/insights/limitingBeliefs/additionalTech checked;
    // issues/comments/heartShield unchecked. Advance step-1 → step-2 (onNext
    // builds buildFilteredSessionMarkdown(selected) into #exportEditor.value).
    win.document.getElementById('exportNextBtn').click();
    await settle();

    var md = win.document.getElementById('exportEditor').value;
    assert.ok(md.indexOf('# session.copy.title') !== -1, 'filtered markdown must carry the title heading');

    var iTrapped = md.indexOf('## trapped');
    var iInsights = md.indexOf('## insights');
    var iLimiting = md.indexOf('## limitingBeliefs');
    var iTech = md.indexOf('## additionalTech');
    assert.ok(iTrapped !== -1, 'trapped section heading must be present');
    assert.ok(iInsights !== -1, 'insights section heading must be present');
    // THE 260615 ORDER FIX: insights must sort AFTER trapped (it was previously
    // emitted last). This is the load-bearing falsifiable assertion.
    assert.ok(iTrapped < iInsights,
      'insights (## insights) must appear AFTER trapped (## trapped) per the 260615 fix — got trapped@' + iTrapped + ' insights@' + iInsights);
    assert.ok(iInsights < iLimiting, 'limitingBeliefs must follow insights in form DOM order');
    assert.ok(iLimiting < iTech, 'additionalTech must follow limitingBeliefs in form DOM order');

    // Content of the checked sections is present.
    assert.ok(md.indexOf('TRAP_X') !== -1, 'trapped content must be included');
    assert.ok(md.indexOf('INS_X') !== -1, 'insights content must be included');
    assert.ok(md.indexOf('LB_X') !== -1, 'limitingBeliefs content must be included');
    assert.ok(md.indexOf('AT_X') !== -1, 'additionalTech content must be included');

    // Unchecked-by-default sections are absent (comments + issues + heartShield).
    assert.ok(md.indexOf('## comments') === -1, 'comments (unchecked by default) must be excluded');
    assert.ok(md.indexOf('## issues') === -1, 'issues (unchecked by default) must be excluded from the FILTERED builder');

    env.dom.window.close();
  });

  // ─── B. FILTERED builder: unticking a section excludes it ────────────────────
  await test('FILTERED builder: unticking the insights checkbox in step 1 removes insights from #exportEditor.value while the others remain', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    setVal(win, 'trappedEmotions', 'TRAP_X');
    setVal(win, 'sessionInsights', 'INS_X');
    setVal(win, 'limitingBeliefs', 'LB_X');
    setVal(win, 'additionalTech', 'AT_X');

    win.document.getElementById('exportSessionBtn').click();
    await settle();

    // Untick the (default-on) insights checkbox before advancing.
    var insightsCb = win.document.querySelector('#exportStep1Rows input[data-section-key="insights"]');
    assert.ok(insightsCb, 'the insights step-1 checkbox must render');
    assert.strictEqual(insightsCb.checked, true, 'insights must be checked by default before we untick it');
    insightsCb.checked = false;

    win.document.getElementById('exportNextBtn').click();
    await settle();

    var md = win.document.getElementById('exportEditor').value;
    // Insights excluded though it HAS data — proves the step-1 filter drives output.
    assert.ok(md.indexOf('## insights') === -1, 'unticked insights must be absent from the filtered markdown');
    assert.ok(md.indexOf('INS_X') === -1, 'unticked insights content must be absent from the filtered markdown');
    // The still-checked siblings remain.
    assert.ok(md.indexOf('TRAP_X') !== -1, 'trapped (still checked) must remain');
    assert.ok(md.indexOf('LB_X') !== -1, 'limitingBeliefs (still checked) must remain');
    assert.ok(md.indexOf('AT_X') !== -1, 'additionalTech (still checked) must remain');

    env.dom.window.close();
  });

  // ─── C. FULL builder via the clipboard spy (copySessionBtn) ──────────────────
  await test('FULL builder (buildSessionMarkdown) via copySessionBtn: the navigator.clipboard.writeText payload has the issues section, insights after trapped, and the included content', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    setVal(win, 'trappedEmotions', 'TRAP_X');
    setVal(win, 'sessionInsights', 'INS_X');
    setVal(win, 'limitingBeliefs', 'LB_X');
    setVal(win, 'additionalTech', 'AT_X');
    setVal(win, 'sessionComments', 'CMT_X');
    setVal(win, 'customerSummary', 'NEXT_X');

    // Force the secure-context clipboard path and install a capturing spy.
    Object.defineProperty(win, 'isSecureContext', { value: true, configurable: true });
    var captured = null;
    Object.defineProperty(win.navigator, 'clipboard', {
      value: { writeText: function (s) { captured = s; return Promise.resolve(); } },
      configurable: true,
    });

    win.document.getElementById('copySessionBtn').click();
    await settle();

    assert.strictEqual(typeof captured, 'string',
      'copySessionBtn must route the full markdown through navigator.clipboard.writeText under a secure context');

    // The FULL builder ALWAYS includes the issues section (unlike the filtered
    // builder where issues is unchecked by default).
    assert.ok(captured.indexOf('## issues') !== -1, 'the full builder always emits the issues section');
    // 260615 order fix holds in the full builder too.
    var iTrapped = captured.indexOf('## trapped');
    var iInsights = captured.indexOf('## insights');
    assert.ok(iTrapped !== -1 && iInsights !== -1, 'trapped + insights headings must be present');
    assert.ok(iTrapped < iInsights,
      'full builder: insights must appear AFTER trapped (260615) — got trapped@' + iTrapped + ' insights@' + iInsights);
    // All populated sections are present, including comments + nextSession.
    assert.ok(captured.indexOf('TRAP_X') !== -1, 'trapped content present');
    assert.ok(captured.indexOf('INS_X') !== -1, 'insights content present');
    assert.ok(captured.indexOf('CMT_X') !== -1, 'comments content present in the full builder');
    assert.ok(captured.indexOf('NEXT_X') !== -1, 'nextSession content present in the full builder');
    assert.ok(captured.indexOf('# session.copy.title') !== -1, 'title heading present');

    env.dom.window.close();
  });

  // ─── D. Next-session DATE line in the full builder (NEXT-06, D-09) — RED ──────
  // A session with BOTH a note and a nextSessionDate must render the note AND a
  // formatted date line under the "Information for Next Session" heading. Asserted
  // against the REAL full builder (clipboard path). RED until Plan 38-04 wires the
  // #nextSessionDate field and Plan 38-06 appends the date line to the builders.
  await test('FULL builder: a session with a note AND a #nextSessionDate renders the note AND the formatted next-session date line', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    setVal(win, 'customerSummary', 'NEXT_NOTE_X');
    var nextDate = win.document.getElementById('nextSessionDate');
    assert.ok(nextDate, '#nextSessionDate must exist on the add-session page (RED until Plan 38-04 wires the field)');
    var NEXT_ISO = '2026-09-15';
    nextDate.value = NEXT_ISO;

    Object.defineProperty(win, 'isSecureContext', { value: true, configurable: true });
    var captured = null;
    Object.defineProperty(win.navigator, 'clipboard', {
      value: { writeText: function (s) { captured = s; return Promise.resolve(); } },
      configurable: true,
    });

    win.document.getElementById('copySessionBtn').click();
    await settle();

    assert.strictEqual(typeof captured, 'string',
      'copySessionBtn must route the full markdown through navigator.clipboard.writeText under a secure context');
    assert.ok(captured.indexOf('## nextSession') !== -1, 'the nextSession heading must be present when a date is set');
    assert.ok(captured.indexOf('NEXT_NOTE_X') !== -1, 'the next-session NOTE must still render alongside the date');
    // The date renders through the SAME App.formatDate path the export uses.
    var formatted = win.App.formatDate(NEXT_ISO);
    assert.ok(captured.indexOf(formatted) !== -1,
      'the formatted next-session date (App.formatDate("' + NEXT_ISO + '") = "' + formatted + '") must appear in the export markdown');

    env.dom.window.close();
  });

  // ─── E. Date-only session still renders the nextSession block (D-09) — RED ────
  // note empty + nextSessionDate present → the block must STILL render with the
  // date. The current builders gate on note length only, so a date-only session
  // emits nothing → RED until Plan 38-06 flips the gate to (note OR date).
  await test('FULL builder: a date-only session (empty note, #nextSessionDate set) still emits the nextSession heading + date line', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    setVal(win, 'customerSummary', ''); // note empty
    var nextDate = win.document.getElementById('nextSessionDate');
    assert.ok(nextDate, '#nextSessionDate must exist on the add-session page (RED until Plan 38-04 wires the field)');
    var NEXT_ISO = '2026-10-20';
    nextDate.value = NEXT_ISO;

    Object.defineProperty(win, 'isSecureContext', { value: true, configurable: true });
    var captured = null;
    Object.defineProperty(win.navigator, 'clipboard', {
      value: { writeText: function (s) { captured = s; return Promise.resolve(); } },
      configurable: true,
    });

    win.document.getElementById('copySessionBtn').click();
    await settle();

    assert.strictEqual(typeof captured, 'string',
      'copySessionBtn must route the full markdown through navigator.clipboard.writeText under a secure context');
    assert.ok(captured.indexOf('## nextSession') !== -1,
      'a date-only session must STILL emit the nextSession heading (D-09 note-OR-date gate)');
    var formatted = win.App.formatDate(NEXT_ISO);
    assert.ok(captured.indexOf(formatted) !== -1,
      'the formatted date (App.formatDate("' + NEXT_ISO + '") = "' + formatted + '") must render even when the note is empty');

    env.dom.window.close();
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────────
  var EXPECTED_COUNT = 5;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 30-05 export-markdown tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
