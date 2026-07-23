/**
 * tests/30-export-markdown.test.js — the export three-way order invariant.
 *
 * ROOT CAUSE THIS CLOSES (the 260615 bug class): the export modal used to read
 * section order from a hardcoded static array while the filtered markdown
 * builder emitted sections in its own inline sequence — two order sources that
 * could drift, so the Step-1 checkbox list, the exported markdown, and the
 * document-section label set could disagree with the session form.
 *
 * THE GUARD: all export order now flows from ONE saved-order source
 * (App.flattenOrderKeys(App.getSectionOrder())). This test stubs that source to
 * a NON-DEFAULT (mutated) order, drives the REAL add-session page + export
 * modal through a jsdom window, and asserts the three orderings are identical:
 *   1. the Step-1 checkbox row sequence (#exportStep1Rows),
 *   2. the ## heading sequence in the filtered markdown (#exportEditor.value),
 *   3. the buildDocumentSectionLabels order,
 * all matching flattenOrderKeys(mutatedOrder) for the selected/non-empty keys.
 *
 * FALSIFIABLE: re-point any one consumer back to a static order and the mutated
 * order desyncs that source from the other two → the invariant assertion FAILS.
 * The test asserts against a MUTATED order (not the default), so a consumer that
 * silently kept a hardcoded default would pass a default-order test but fail
 * here.
 *
 * Read-only: EVALS assets/* into an isolated jsdom window; writes no assets/*.
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

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle() { for (var i = 0; i < 6; i++) { await flush(); } }

// A deliberately NON-DEFAULT saved order: the wrap-up group is pulled to the
// front (comments, nextSession) and insights sorts BEFORE trapped — the exact
// opposite of any hardcoded default — so a stale static-order consumer stands out.
var MUTATED_ORDER = [
  { type: 'section', key: 'issues' },
  { type: 'group', id: 'wrapup', members: ['comments', 'nextSession'] },
  { type: 'group', id: 'emotionsTech', members: ['insights', 'trapped', 'limitingBeliefs', 'additionalTech', 'heartShield', 'heartShieldEmotions'] },
  { type: 'section', key: 'afterSeverity' },
];

// The production flattening contract (app.js flattenOrderKeys): groups flattened
// to their member keys in reading order, group identities dropped.
function flattenOrderKeys(order) {
  var keys = [];
  (Array.isArray(order) ? order : []).forEach(function (item) {
    if (!item) return;
    if (item.type === 'section') { keys.push(item.key); }
    else if (item.type === 'group' && Array.isArray(item.members)) { item.members.forEach(function (m) { keys.push(m); }); }
  });
  return keys;
}

function buildEnv() {
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
    // The ONE saved-order source every export consumer reads. Stubbed to a
    // mutated (non-default) order so a stale static-order consumer desyncs.
    getSectionOrder: function () { return JSON.parse(JSON.stringify(MUTATED_ORDER)); },
    flattenOrderKeys: function (order) { return flattenOrderKeys(order); },
    pinSectionOrder: function () {},
  });
  win.PortfolioDB = createMockPortfolioDB({
    clients: [{ id: 1, name: 'Test Client' }],
    sessions: [{
      id: 1, clientId: 1, date: '', sessionType: 'clinic',
      issues: [{ name: 'TOPIC_A', before: null, after: null }],
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

function step1RowKeys(win) {
  return Array.prototype.slice
    .call(win.document.querySelectorAll('#exportStep1Rows input[type="checkbox"][data-section-key]'))
    .map(function (cb) { return cb.dataset.sectionKey; });
}

function mdHeadingKeys(md) {
  // In the app-stub, getSectionLabel returns the raw key, so every '## key' line
  // names the section key it emitted. Note bodies here are plain text (no typed
  // '## ' lines) so nothing else matches.
  return (md.match(/^## (.+)$/gm) || []).map(function (l) { return l.replace(/^## /, '').trim(); });
}

// keys of `all` restricted to (and ordered by) their position in `all`, keeping
// only those present in `present`.
function relOrder(all, present) {
  var set = {};
  present.forEach(function (k) { set[k] = true; });
  return all.filter(function (k) { return set[k]; });
}

// Populate every text section + check every box we assert on, then advance to
// Step 2 so #exportEditor.value holds the filtered markdown.
function populateAndAdvance(win) {
  setVal(win, 'trappedEmotions', 'TRAP_X');
  setVal(win, 'sessionInsights', 'INS_X');
  setVal(win, 'limitingBeliefs', 'LB_X');
  setVal(win, 'additionalTech', 'AT_X');
  setVal(win, 'sessionComments', 'CMT_X');
  setVal(win, 'customerSummary', 'NEXT_X');
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

var SELECTED = ['issues', 'comments', 'nextSession', 'insights', 'trapped', 'limitingBeliefs', 'additionalTech'];
var EXPECTED_FLAT = flattenOrderKeys(MUTATED_ORDER); // includes afterSeverity at the tail
var EXPECTED_SELECTED_ORDER = relOrder(EXPECTED_FLAT, SELECTED);

(async function () {
  // ─── A. Three-way invariant against a MUTATED saved order ───────────────────
  await test('three-way invariant: Step-1 rows, markdown ## headings, and document labels all follow the MUTATED saved order', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    populateAndAdvance(win);

    win.document.getElementById('exportSessionBtn').click();
    await settle();

    // Force the exact selection we assert on (comments defaults OFF; the rest ON).
    SELECTED.forEach(function (key) {
      var cb = win.document.querySelector('#exportStep1Rows input[data-section-key="' + key + '"]');
      assert.ok(cb, 'the step-1 checkbox for ' + key + ' must render');
      cb.checked = true;
    });

    // 1. Step-1 row order (restricted to the selected keys).
    var rowOrder = relOrder(step1RowKeys(win), SELECTED);

    win.document.getElementById('exportNextBtn').click();
    await settle();

    var md = win.document.getElementById('exportEditor').value;
    // 2. Markdown ## heading order.
    var mdOrder = relOrder(mdHeadingKeys(md), SELECTED);
    // 3. Document-section label order.
    var docLabels = win.__exportModalTestHooks.buildDocumentSectionLabels();
    var docOrder = relOrder(docLabels, SELECTED);

    assert.deepStrictEqual(rowOrder, EXPECTED_SELECTED_ORDER,
      'Step-1 rows must follow the saved order; got ' + JSON.stringify(rowOrder));
    assert.deepStrictEqual(mdOrder, EXPECTED_SELECTED_ORDER,
      'markdown ## headings must follow the saved order; got ' + JSON.stringify(mdOrder));
    assert.deepStrictEqual(docOrder, EXPECTED_SELECTED_ORDER,
      'document labels must follow the saved order; got ' + JSON.stringify(docOrder));
    // The three are identical to each other (the invariant itself).
    assert.deepStrictEqual(rowOrder, mdOrder, 'Step-1 order must equal markdown order');
    assert.deepStrictEqual(mdOrder, docOrder, 'markdown order must equal document-label order');

    env.dom.window.close();
  });

  // ─── B. Topics section emits topic NAMES only; afterSeverity slot is silent ──
  await test('the issues/topics section emits the topic names (no rating text), and the afterSeverity slot emits no markdown heading', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    populateAndAdvance(win);
    win.document.getElementById('exportSessionBtn').click();
    await settle();
    // topics defaults ON when the session has issue rows.
    var topicsCb = win.document.querySelector('#exportStep1Rows input[data-section-key="issues"]');
    assert.ok(topicsCb && topicsCb.checked, 'topics must default checked when issue data exists');

    win.document.getElementById('exportNextBtn').click();
    await settle();

    var md = win.document.getElementById('exportEditor').value;
    assert.ok(md.indexOf('## issues') !== -1, 'the Session-topics heading must be emitted at the issues slot');
    assert.ok(md.indexOf('TOPIC_A') !== -1, 'the topic NAME must appear under the Session-topics heading');
    // No afterSeverity heading — severity is PDF-structural, not markdown text.
    assert.ok(md.indexOf('## afterSeverity') === -1, 'the afterSeverity slot must emit no markdown heading');
    // No rating text lines for the topic (numeric ratings stay PDF bars).
    assert.ok(md.indexOf('Before') === -1 && md.indexOf('After') === -1,
      'the filtered markdown must carry no before/after rating text lines');

    env.dom.window.close();
  });

  // ─── C. Group names never leak into the markdown (D-03) ─────────────────────
  await test('no group name (emotionsTech / wrapup) appears in the emitted markdown', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    populateAndAdvance(win);
    win.document.getElementById('exportSessionBtn').click();
    await settle();
    win.document.getElementById('exportNextBtn').click();
    await settle();

    var md = win.document.getElementById('exportEditor').value;
    assert.ok(md.indexOf('emotionsTech') === -1, 'the emotionsTech group id must never appear in the markdown');
    assert.ok(md.indexOf('wrapup') === -1, 'the wrapup group id must never appear in the markdown');

    env.dom.window.close();
  });

  // ─── D. Unticking a section removes it from the markdown ────────────────────
  await test('unticking insights in Step 1 removes it from the markdown while its saved-order siblings remain', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    populateAndAdvance(win);
    win.document.getElementById('exportSessionBtn').click();
    await settle();

    var insightsCb = win.document.querySelector('#exportStep1Rows input[data-section-key="insights"]');
    assert.ok(insightsCb && insightsCb.checked, 'insights must be checked by default before we untick it');
    insightsCb.checked = false;

    win.document.getElementById('exportNextBtn').click();
    await settle();

    var md = win.document.getElementById('exportEditor').value;
    assert.ok(md.indexOf('## insights') === -1, 'unticked insights must be absent from the markdown');
    assert.ok(md.indexOf('INS_X') === -1, 'unticked insights content must be absent');
    assert.ok(md.indexOf('## trapped') !== -1, 'trapped (still checked) must remain');
    assert.ok(md.indexOf('TRAP_X') !== -1, 'trapped content must remain');

    env.dom.window.close();
  });

  // ─── E. Document title stays in the label set (WARNING 2) ────────────────────
  await test('buildDocumentSectionLabels keeps the document title in the label set', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    var labels = win.__exportModalTestHooks.buildDocumentSectionLabels();
    assert.ok(labels.indexOf('session.copy.title') !== -1,
      'the document title must remain in the label set so the PDF chrome branch never demotes it');
    // Section labels are present too (order-driven).
    assert.ok(labels.indexOf('trapped') !== -1 && labels.indexOf('issues') !== -1,
      'the saved-order section labels must be present in the label set');

    env.dom.window.close();
  });

  // ─── count guard (vacuous-green trap) ────────────────────────────────────────
  var EXPECTED_COUNT = 5;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('export-markdown three-way-order tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
