/**
 * tests/export-emotions-optout.test.js — the emotions before/after block is a
 * pre-selected OPT-OUT in the export, not forced.
 *
 * WHAT THIS GUARDS: the issues + before/after severity section ("emotions
 * before / after ratings") used to be forced into every export output — the
 * PDF assembly always forwarded the full issues payload and the clipboard-copy
 * builder always emitted the Issues section, regardless of the Step-1
 * selection. It is now a real opt-out:
 *
 *   1. The Step-1 row for the section defaults CHECKED (pre-selected) when the
 *      session has issue rows, and carries the clarified fixed label routed
 *      through the `export.section.emotions` i18n key.
 *   2. Left checked, behaviour is unchanged: buildSessionPDF receives a
 *      non-empty issues[] and the copy markdown carries the Issues section.
 *   3. Unchecked, BOTH paths omit it: buildSessionPDF receives an EMPTY
 *      issues[] (the severity renderer early-returns on empty) and the copy
 *      builder skips the Issues heading + body while the selection is live.
 *   4. The choice resets per export — nothing is persisted. Re-opening the
 *      dialog shows the row checked again, and the copy path outside a live
 *      selection defaults to include.
 *   5. The new i18n key exists non-empty in all four locales (structure
 *      parity), with the ratified EN wording pinned.
 *
 * HARNESS (the 30-export-stepper real-page idiom): load the REAL
 * add-session.html + assets/export-modal.js + assets/add-session.js into a
 * jsdom window with the App stub + mock PortfolioDB, drive the REAL
 * DOMContentLoaded handler and the REAL modal flow (open → toggle → Next →
 * download click). The PDF tier is a SEAM here — win.PDFExport.buildSessionPDF
 * is a spy capturing its input, because the assertions target the forwarded
 * issues[] contract, not PDF bytes. The copy path is asserted through the
 * exposed __exportModalTestHooks.buildSessionMarkdown (the exact function the
 * Copy button calls).
 *
 * FALSIFIABLE: revert the gating (forward getIssuesPayload() unconditionally,
 * or drop the emotions gate from buildSessionMarkdown) and cases 3/4 FAIL;
 * flip the issues default back to unchecked and case 1 FAILS; drop the i18n
 * key from any locale and case 5 FAILS.
 *
 * Read-only: EVALS assets/* into an isolated jsdom window; writes no assets/*.
 *
 * Run: node tests/export-emotions-optout.test.js
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
async function waitFor(pred, tries) {
  for (var i = 0; i < (tries || 100); i++) { if (pred()) return true; await flush(); }
  return pred();
}

// Real add-session page + real export-modal/add-session scripts; PDF tier is a
// capturing seam (this test asserts the forwarded render-input contract, not
// PDF bytes, so the heavy jsPDF stack is not loaded).
function buildEnv() {
  var html = readAsset('add-session.html');
  // Open on a SAVED, clean session (?sessionId=1) seeded WITH one issue so the
  // export trigger opens the dialog directly and the emotions row has data.
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

  // Minimal DOM-node severity pair: createIssueBlock appendChilds the scale so
  // it must return a node; getSeverityValue null keeps the payload shape
  // ({name, before:null, after:null}) — the gating assertions only need the
  // array to be non-empty vs empty.
  win.App = createAppStub({
    createSeverityScale: function () { return win.document.createElement('div'); },
    getSeverityValue: function () { return null; },
  });
  win.PortfolioDB = createMockPortfolioDB({
    clients: [{ id: 1, name: 'Test Client' }],
    sessions: [{
      id: 1, clientId: 1, date: '2026-01-05', sessionType: 'clinic',
      issues: [{ name: 'ANGER_MARKER', before: 8, after: 3 }],
      trappedEmotions: 'TRAP_X', heartShieldEmotions: '', insights: '',
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

  // buildRenderInputs reads window.DateFormat.todayLocalISO for the exportedOn
  // footer date — the real engine, same load order as the page.
  win.eval(readAsset('assets/date-format.js'));

  // PDF SEAM: capture the exact input object the export hands to the renderer.
  var pdfCalls = [];
  win.PDFExport = {
    buildSessionPDF: function (input) {
      pdfCalls.push(input);
      return Promise.resolve(new win.Blob(['x'], { type: 'application/pdf' }));
    },
    slugify: function (s) { return String(s || 'session').replace(/\s+/g, '_'); },
    triggerDownload: function () {},
  };

  win.eval(readAsset('assets/export-modal.js')); // before add-session.js (init handshake)
  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0], pdfCalls: pdfCalls };
}

function issuesCheckbox(win) {
  return win.document.querySelector('#exportStep1Rows input[data-section-key="issues"]');
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── 1. Pre-selected default + clarified label ─────────────────────────────
  await test('the emotions before/after row defaults CHECKED (pre-selected) and carries the export.section.emotions label', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    win.document.getElementById('exportSessionBtn').click();
    await settle();

    var cb = issuesCheckbox(win);
    assert.ok(cb, 'the issues/emotions step-1 checkbox must render');
    assert.strictEqual(cb.checked, true,
      'the emotions before/after row must default CHECKED (pre-selected opt-out) when the session has issues');
    // The key-returning App.t stub makes the routed i18n key observable as the
    // label text — proving the row uses the clarified fixed label, not the
    // customizable section label.
    var labelSpan = cb.parentElement.querySelector('.export-section-label');
    assert.ok(labelSpan, 'the row must carry a label span');
    assert.strictEqual(labelSpan.textContent, 'export.section.emotions',
      'the emotions row label must route through the export.section.emotions i18n key');

    env.dom.window.close();
  });

  // ─── 2. Left checked → both paths include (default behaviour unchanged) ────
  await test('left checked, the PDF receives a non-empty issues[] and the copy markdown carries the Issues section', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    win.document.getElementById('exportSessionBtn').click();
    await settle();
    win.document.getElementById('exportNextBtn').click(); // 1 → 2 (captures selection)
    await settle();
    win.document.getElementById('exportNextBtn').click(); // 2 → 3
    await settle();

    win.document.getElementById('exportDownloadPdf').click();
    await waitFor(function () { return env.pdfCalls.length > 0; });
    assert.strictEqual(env.pdfCalls.length, 1, 'buildSessionPDF must be dispatched exactly once');
    var input = env.pdfCalls[0];
    assert.ok(Array.isArray(input.issues) && input.issues.length === 1,
      'with the row checked the PDF input must carry the full issues payload (got ' +
      JSON.stringify(input.issues) + ')');
    assert.strictEqual(input.issues[0].name, 'ANGER_MARKER',
      'the forwarded issues payload must carry the real issue row');

    // The copy path (the exact function the Copy button calls) includes the
    // Issues section while the live selection keeps the row checked.
    var md = win.__exportModalTestHooks.buildSessionMarkdown();
    assert.ok(md.indexOf('## issues') !== -1,
      'the copy markdown must carry the Issues heading when the row is checked');
    assert.ok(md.indexOf('ANGER_MARKER') !== -1,
      'the copy markdown must carry the issue row content when the row is checked');

    env.dom.window.close();
  });

  // ─── 3. Unchecked → both paths omit ─────────────────────────────────────────
  await test('unchecked, the PDF receives an EMPTY issues[] and the copy markdown omits the Issues section', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    win.document.getElementById('exportSessionBtn').click();
    await settle();
    var cb = issuesCheckbox(win);
    assert.ok(cb && cb.checked, 'precondition: the row renders pre-selected');
    cb.checked = false; // the therapist opts out
    win.document.getElementById('exportNextBtn').click(); // 1 → 2 (captures selection)
    await settle();
    win.document.getElementById('exportNextBtn').click(); // 2 → 3
    await settle();

    win.document.getElementById('exportDownloadPdf').click();
    await waitFor(function () { return env.pdfCalls.length > 0; });
    var input = env.pdfCalls[0];
    assert.ok(Array.isArray(input.issues) && input.issues.length === 0,
      'with the row unchecked the PDF input must carry an EMPTY issues[] so the severity block is omitted (got ' +
      JSON.stringify(input.issues) + ')');

    // The copy path honours the same live choice.
    var md = win.__exportModalTestHooks.buildSessionMarkdown();
    assert.ok(md.indexOf('## issues') === -1,
      'the copy markdown must omit the Issues heading while the opt-out is live');
    assert.ok(md.indexOf('ANGER_MARKER') === -1,
      'the copy markdown must omit the issue row content while the opt-out is live');
    // A still-selected section proves the omission is targeted, not a broken builder.
    assert.ok(md.indexOf('TRAP_X') !== -1,
      'other sections must survive the emotions opt-out in the copy markdown');

    env.dom.window.close();
  });

  // ─── 4. Per-export reset — nothing persists ─────────────────────────────────
  await test('the opt-out resets per export: re-opening the dialog pre-selects the row again and the copy defaults to include', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    // First export: opt out and advance so the exclusion is live, then close.
    win.document.getElementById('exportSessionBtn').click();
    await settle();
    var cb = issuesCheckbox(win);
    cb.checked = false;
    win.document.getElementById('exportNextBtn').click(); // 1 → 2
    await settle();
    win.document.getElementById('exportClose').click(); // preview unedited → closes directly
    await settle();

    // Outside a live selection, the copy path defaults to INCLUDE (checked default).
    var mdAfterClose = win.__exportModalTestHooks.buildSessionMarkdown();
    assert.ok(mdAfterClose.indexOf('## issues') !== -1,
      'after the dialog closes, the copy markdown must include the Issues section again (no saved preference)');
    assert.ok(mdAfterClose.indexOf('ANGER_MARKER') !== -1,
      'after the dialog closes, the copy markdown must carry the issue row content again');

    // Second export: the row must be pre-selected again — the choice did not stick.
    win.document.getElementById('exportSessionBtn').click();
    await settle();
    var cb2 = issuesCheckbox(win);
    assert.ok(cb2, 'the issues/emotions step-1 checkbox must re-render');
    assert.strictEqual(cb2.checked, true,
      'a re-opened export dialog must pre-select the emotions row again (per-export reset, no persistence)');

    env.dom.window.close();
  });

  // ─── 5. i18n structure parity pin for the new key ───────────────────────────
  await test('export.section.emotions exists non-empty in all four locales, with the ratified EN wording', async function () {
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
      var val = map['export.section.emotions'];
      assert.strictEqual(typeof val, 'string',
        'export.section.emotions must exist in i18n-' + loc + '.js (locale structure parity)');
      assert.ok(val.trim().length > 0,
        'export.section.emotions must be non-empty in i18n-' + loc + '.js');
    });
    assert.strictEqual(sandbox.window.I18N.en['export.section.emotions'],
      'Emotions before / after ratings',
      'the EN label must carry the ratified wording');
  });

  // ─── end-of-file count guard (vacuous-green trap) ───────────────────────────
  var EXPECTED_COUNT = 5;
  if (passed + failed !== EXPECTED_COUNT) {
    console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped.');
    process.exit(1);
  }

  console.log('');
  console.log('export-emotions-optout tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
