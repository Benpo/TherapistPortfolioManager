/**
 * tests/45-pdf-note-headings.test.js — Phase 45 Plan 03 Task 1.
 *
 * Document-vs-note heading classification on the REAL export path (D-02/D-03).
 *
 * THE PROBLEM: the shipped PDF / share / `.md`-download are all built from
 * `editor.value` (export-modal.js: `editor.value = buildFilteredSessionMarkdown(
 * selected)` → `buildSessionPDF({ markdown: editor.value })`). A therapist can
 * type `## Progress` inside a note field; it arrives in editor.value as a bare
 * `## Progress` line indistinguishable from a document `## Section`. Before this
 * plan it WRONGLY got the Phase-34 branded leaf-diamond + green-rule chrome AND
 * corrupted the severity-block page-break count.
 *
 * THE FIX (data, not sentinel): export-modal forwards a document-section label
 * set (`sessionData.documentSectionLabels` = every `## ${label}` the builders emit
 * PLUS the level-1 title `# ${session.copy.title}`); in the PDF block loop a
 * `#`/`##`/`###` heading is DOCUMENT if its trimmed text is in that set, else
 * NOTE. Both the section-count guard (level >= 2, DOCUMENT only) and the branded-
 * chrome branch (levels 1-3, DOCUMENT only) gate on it; NOTE headings route to a
 * subordinate chrome-free register (UI-SPEC §C: 12/11/10.5pt bold, no chrome).
 * NO sentinel is injected into editor.value (D-10).
 *
 * THE GUARD (falsifiable, drives the REAL path — memory reference-pdf-jsdom-inert
 * -gates warns of false-GREEN inert PDF tests): two jsdom windows, one data
 * handoff (a string + a string[]):
 *   - Window A (add-session.html + add-session.js + export-modal.js): the REAL
 *     builders run under a live form DOM. We populate a note field whose body
 *     carries `## NOTEHEAD_A` + `# NOTEHEAD_B`, then call the REAL
 *     buildFilteredSessionMarkdown (→ editor.value) and buildDocumentSectionLabels
 *     via the __exportModalTestHooks seam — NEVER buildSessionMarkdown.
 *   - Window B (shared jsdom-pdf-env, real jsPDF): drive `buildSessionPDF({
 *     markdown: editorValue, documentSectionLabels, ... })` with a per-instance spy
 *     wrapping doc.setFontSize / doc.text / doc.triangle / doc.line so we can read
 *     each heading's rendered font size and whether the leaf-diamond (triangle) /
 *     vein-rule (line) chrome was drawn for it.
 *
 * Run: node tests/45-pdf-note-headings.test.js   (exit 0 pass / 1 fail)
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var buildJsdomEnv = require('./_helpers/jsdom-pdf-env').buildJsdomEnv;
var createMockPortfolioDB = require('./_helpers/mock-portfolio-db').createMockPortfolioDB;
var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

var HEADING_SIZE = 16; // pdf-export.js document-heading base size (H2)
var DOC_H1_SIZE = HEADING_SIZE + 2; // 18pt — document title / H1 branded chrome

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle() { for (var i = 0; i < 6; i++) { await flush(); } }

// ── Window A: the REAL add-session env that runs the REAL export builders ───────
function buildAddSessionEnv() {
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

  win.eval(readAsset('assets/export-modal.js')); // before add-session.js (unconditional __exportModalInit boot)
  win.eval(readAsset('assets/date-format.js'));
  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0] };
}

// ── Window B: spy on the jsPDF instance to read per-heading size + chrome ────────
function buildAndCapturePDF(editorValue, documentSectionLabels, extra) {
  extra = extra || {};
  var currentSize = null;
  var texts = [];      // { text, x, y, size }
  var triangles = [];  // { ys: [y1,y2,y3] }
  var lines = [];      // { y }
  var env = buildJsdomEnv({
    onJsPDF: function (doc) {
      var origSetFontSize = doc.setFontSize.bind(doc);
      doc.setFontSize = function (s) { currentSize = s; return origSetFontSize.apply(null, arguments); };
      var origText = doc.text.bind(doc);
      doc.text = function (txt, x, y) {
        try { texts.push({ text: String(txt), x: x, y: y, size: currentSize }); } catch (_) {}
        return origText.apply(null, arguments);
      };
      var origTriangle = doc.triangle.bind(doc);
      doc.triangle = function (x1, y1, x2, y2, x3, y3) {
        try { triangles.push({ ys: [y1, y2, y3] }); } catch (_) {}
        return origTriangle.apply(null, arguments);
      };
      var origLine = doc.line.bind(doc);
      doc.line = function (x1, y1, x2, y2) {
        try { lines.push({ y: y1 }); } catch (_) {}
        return origLine.apply(null, arguments);
      };
    },
  });
  var input = {
    clientName: 'ZZZ', sessionDate: '2026-05-08', sessionType: 'Online',
    markdown: editorValue,
    documentSectionLabels: documentSectionLabels,
  };
  if (typeof extra.severityAfterSections === 'number') input.severityAfterSections = extra.severityAfterSections;
  if (extra.issues) input.issues = extra.issues;
  return env.win.PDFExport.buildSessionPDF(input, { uiLang: 'en' })
    .then(function (blob) { return blob.arrayBuffer(); })
    .then(function () {
      env.win.close();
      return { texts: texts, triangles: triangles, lines: lines };
    });
}

function findText(cap, needle) {
  return cap.texts.filter(function (t) { return t.text.indexOf(needle) !== -1; })[0];
}
// A leaf-diamond triangle sits just above the heading baseline (cy = y - hSize*0.30,
// dHalf ~4.5) — its y-coords fall in roughly [y-14, y]. "Chrome present" = a
// triangle in that band above the heading baseline.
function triangleNear(cap, baselineY) {
  return cap.triangles.some(function (tr) {
    return tr.ys.some(function (ty) { return ty >= baselineY - 14 && ty <= baselineY + 2; });
  });
}
// A vein rule is a horizontal line ~4pt beneath the heading baseline.
function ruleNear(cap, baselineY) {
  return cap.lines.some(function (ln) { return ln.y >= baselineY - 1 && ln.y <= baselineY + 12; });
}

async function main() {
  // ── Window A: build editor.value + documentSectionLabels via the REAL builders ──
  var envA = buildAddSessionEnv();
  var winA = envA.win;
  await envA.domHandler();
  await settle();

  // A note field body carrying a level-2 note heading (NOTEHEAD_A, between two
  // DOCUMENT sections) and a level-1 note heading (NOTEHEAD_B). `sessionInsights`
  // gives a SECOND document section after the note headings so the severity-block
  // placement (severityAfterSections=1 → before the 2nd document heading) is
  // observable relative to the note heading.
  winA.document.getElementById('trappedEmotions').value =
    'alpha\n## NOTEHEAD_A\nbeta\n# NOTEHEAD_B\ngamma';
  winA.document.getElementById('sessionInsights').value = 'delta';

  var allKeys = ['trapped', 'insights', 'limitingBeliefs', 'additionalTech',
    'heartShield', 'heartShieldEmotions', 'issues', 'comments', 'nextSession'];
  var hooks = winA.__exportModalTestHooks;
  assert.ok(hooks && typeof hooks.buildFilteredSessionMarkdown === 'function',
    '__exportModalTestHooks.buildFilteredSessionMarkdown must be exposed (the REAL editor.value builder)');
  assert.ok(typeof hooks.buildDocumentSectionLabels === 'function',
    '__exportModalTestHooks.buildDocumentSectionLabels must be exposed');

  var editorValue = hooks.buildFilteredSessionMarkdown(allKeys);
  var docLabels = hooks.buildDocumentSectionLabels();
  envA.dom.window.close();

  // Sanity on the produced editor.value (the app-stub returns the KEY as each
  // section label and 'session.copy.title' as the title).
  assert.ok(editorValue.indexOf('# session.copy.title') !== -1, 'title heading present in editor.value');
  assert.ok(editorValue.indexOf('## trapped') !== -1, 'document ## trapped present');
  assert.ok(editorValue.indexOf('## insights') !== -1, 'document ## insights present');
  assert.ok(editorValue.indexOf('## NOTEHEAD_A') !== -1, 'note ## NOTEHEAD_A present (typed inside the trapped note)');
  assert.ok(editorValue.indexOf('# NOTEHEAD_B') !== -1, 'note # NOTEHEAD_B present');
  assert.ok(docLabels.indexOf('session.copy.title') !== -1, 'documentSectionLabels INCLUDES the document title (WARNING 2)');
  assert.ok(docLabels.indexOf('trapped') !== -1, 'documentSectionLabels includes the section labels');
  assert.ok(docLabels.indexOf('NOTEHEAD_A') === -1, 'documentSectionLabels must NOT include the note heading text');

  // ── Window B: render the PDF from that exact editor.value ──────────────────────
  var cap = await buildAndCapturePDF(editorValue, docLabels, {
    severityAfterSections: 1,
    issues: [{ name: 'SEVSEVMARK', before: 5, after: 2 }],
  });

  var noteA = findText(cap, 'NOTEHEAD_A');
  var noteB = findText(cap, 'NOTEHEAD_B');
  var trapped = findText(cap, 'trapped');
  var insights = findText(cap, 'insights');
  var title = findText(cap, 'session.copy.title');
  var sev = findText(cap, 'SEVSEVMARK');

  test('the note ## NOTEHEAD_A renders chrome-free (no leaf-diamond, no vein rule) at a subordinate < 14pt size', function () {
    assert.ok(noteA, 'a doc.text call rendering NOTEHEAD_A must exist');
    assert.ok(typeof noteA.size === 'number' && noteA.size < 14,
      'note ## heading must render below the 14pt document register; saw ' + noteA.size + 'pt');
    assert.ok(!triangleNear(cap, noteA.y),
      'note heading must NOT draw a leaf-diamond (triangle) — it is chrome-free (D-02)');
    assert.ok(!ruleNear(cap, noteA.y),
      'note heading must NOT draw a green vein rule — it is chrome-free (D-02)');
  });

  test('the document ## trapped still renders branded chrome (leaf-diamond) at the 16pt document register', function () {
    assert.ok(trapped, 'a doc.text call rendering the trapped label must exist');
    assert.strictEqual(trapped.size, HEADING_SIZE,
      'document ## heading keeps the 16pt document HEADING_SIZE; saw ' + trapped.size + 'pt');
    assert.ok(triangleNear(cap, trapped.y), 'document heading must keep its leaf-diamond chrome');
  });

  test('WARNING 2: the level-1 document TITLE keeps branded chrome at the 18pt H1 size (title is in documentSectionLabels)', function () {
    assert.ok(title, 'a doc.text call rendering the document title must exist');
    assert.strictEqual(title.size, DOC_H1_SIZE,
      'the document title (level-1, in the label set) keeps the 18pt branded H1 size; saw ' + title.size + 'pt');
    assert.ok(triangleNear(cap, title.y), 'the document title must keep its leaf-diamond chrome (WARNING 2)');
  });

  test('WARNING 2: a note-typed level-1 # NOTEHEAD_B renders SUBORDINATE + chrome-free (classification spans level 1, not just level >= 2)', function () {
    assert.ok(noteB, 'a doc.text call rendering NOTEHEAD_B must exist');
    assert.ok(typeof noteB.size === 'number' && noteB.size < 14,
      'a note-typed level-1 heading must render subordinate (< 14pt), proving classification spans level 1; saw ' + noteB.size + 'pt');
    assert.ok(!triangleNear(cap, noteB.y),
      'the note-typed level-1 heading must be chrome-free (no diamond) — NOT the 18pt branded title register');
  });

  test('a note heading does NOT increment the section count: the severity block still lands before the 2nd DOCUMENT section (below the note heading, not above it)', function () {
    assert.ok(sev, 'the severity block issue-name text (SEVSEVMARK) must render');
    assert.ok(noteA && insights, 'note heading + insights heading must both render');
    // severityAfterSections=1 → block draws before the 2nd DOCUMENT heading
    // (insights). The note heading NOTEHEAD_A lies between trapped and insights;
    // if it WRONGLY counted, the block would draw before NOTEHEAD_A (ABOVE it).
    // Correct: block y is BELOW the note heading and ABOVE insights.
    assert.ok(sev.y > noteA.y,
      'severity block (y=' + sev.y.toFixed(1) + ') must render BELOW the note heading (y=' + noteA.y.toFixed(1) +
      ') — i.e. the note ## did NOT increment sectionHeadingsSeen');
    assert.ok(sev.y < insights.y,
      'severity block (y=' + sev.y.toFixed(1) + ') must render ABOVE the 2nd document section insights (y=' +
      insights.y.toFixed(1) + ') per severityAfterSections=1');
  });

  test('D-10: the classification injects NO sentinel/marker into editor.value (the string is byte-clean, raw note headings survive verbatim)', function () {
    // The mechanism is a passed-in label set, never a marker in the text. The
    // editor.value we FED to buildSessionPDF is the .md-download source; assert it
    // carries the raw typed headings and no control/zero-width sentinel chars.
    assert.ok(editorValue.indexOf('## NOTEHEAD_A') !== -1 && editorValue.indexOf('# NOTEHEAD_B') !== -1,
      'raw typed note headings must survive verbatim in editor.value');
    var SENTINEL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/;
    assert.ok(!SENTINEL_RE.test(editorValue),
      'editor.value must contain no control / zero-width / bidi-override sentinel characters (D-10 byte-clean)');
  });

  // ── Count guard ────────────────────────────────────────────────────────────────
  var EXPECTED = 6;
  test('count guard: expected ' + EXPECTED + ' assertions ran', function () {
    assert.strictEqual(passed + failed, EXPECTED,
      'expected ' + EXPECTED + ' tests before the count guard, saw ' + (passed + failed));
  });

  console.log('\n45-pdf-note-headings: passed ' + passed + ', failed ' + failed + '.');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(function (err) {
  console.error('FATAL:', err && err.stack || err);
  process.exit(1);
});
