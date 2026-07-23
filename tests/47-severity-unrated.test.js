/**
 * tests/47-severity-unrated.test.js — the export topics/severity split and the
 * unrated-topic omission from the PDF severity payload.
 *
 * WHAT THIS GUARDS:
 *   - "Session topics" is a main checkbox with a dependent, indented "Include
 *     severity before/after" sub-option enabled only while topics is checked.
 *   - Topics checked + sub-option unchecked → the filtered markdown still lists
 *     the topic NAMES at the topics slot, but the PDF severity payload is empty.
 *   - The PDF severity payload keeps only topics with at least one numeric
 *     rating: a fully-unrated topic (both sides null) is dropped; a partially
 *     rated topic (one numeric side) is kept. An all-unrated set yields an empty
 *     payload so the block is omitted even with the sub-option checked — no empty
 *     bars, no literal "—"/"N/A"/dash placeholder.
 *   - The app-level severity switch (App.isSectionEnabled('afterSeverity')):
 *     when off, the sub-option is NOT offered and a session with stored numeric
 *     ratings exports no severity.
 *   - Unchecking then re-checking topics restores the sub-option's data-derived
 *     default (not the last manual state).
 *
 * HARNESS: load the REAL add-session.html + export-modal.js + add-session.js in
 * a jsdom window with the App stub + mock PortfolioDB. The PDF tier is a
 * capturing seam (buildSessionPDF spy) because the assertions target the
 * forwarded issues[] payload, not PDF bytes. The severity pair round-trips the
 * seeded before/after through the scale node's dataset so getIssuesPayload
 * reports the seeded ratings.
 *
 * FALSIFIABLE: drop the unrated filter → the all-unrated case forwards a
 * non-empty payload and case (c) FAILS; fold severity into the topics checkbox
 * (no sub-option) → case (a) cannot uncheck severity alone and FAILS; ignore the
 * afterSeverity switch → case (f) forwards a payload and FAILS.
 *
 * Read-only: EVALS assets/* into an isolated jsdom window; writes no assets/*.
 *
 * Run: node tests/47-severity-unrated.test.js
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
async function waitFor(pred, tries) {
  for (var i = 0; i < (tries || 100); i++) { if (pred()) return true; await flush(); }
  return pred();
}

function buildEnv(opts) {
  opts = opts || {};
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

  var appOverrides = {
    // Round-trip the seeded before/after through the scale node's dataset so the
    // topic reports its real rating (or null when unrated).
    createSeverityScale: function (initial) {
      var d = win.document.createElement('div');
      if (initial !== null && initial !== undefined && initial !== '') d.dataset.value = String(initial);
      return d;
    },
    getSeverityValue: function (node) {
      var v = node && node.dataset ? node.dataset.value : '';
      return (v === undefined || v === null || v === '') ? null : Number(v);
    },
  };
  if (typeof opts.isSectionEnabled === 'function') appOverrides.isSectionEnabled = opts.isSectionEnabled;
  // When a test supplies an explicit saved order, expose the same reader pair the
  // production page pins (App.getSectionOrder + App.flattenOrderKeys) so the
  // export builders read THAT order instead of the DEFAULT_FLAT_ORDER fallback.
  if (Array.isArray(opts.orderKeys)) {
    var _order = opts.orderKeys.slice();
    appOverrides.getSectionOrder = function () { return _order.slice(); };
    appOverrides.flattenOrderKeys = function (o) { return (o || _order).slice(); };
  }
  win.App = createAppStub(appOverrides);

  win.PortfolioDB = createMockPortfolioDB({
    clients: [{ id: 1, name: 'Test Client' }],
    sessions: [{
      id: 1, clientId: 1, date: '2026-01-05', sessionType: 'clinic',
      issues: opts.issues || [],
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

  win.eval(readAsset('assets/date-format.js'));

  var pdfCalls = [];
  win.PDFExport = {
    buildSessionPDF: function (input) {
      pdfCalls.push(input);
      return Promise.resolve(new win.Blob(['x'], { type: 'application/pdf' }));
    },
    slugify: function (s) { return String(s || 'session').replace(/\s+/g, '_'); },
    triggerDownload: function () {},
  };

  win.eval(readAsset('assets/export-modal.js'));
  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0], pdfCalls: pdfCalls };
}

function topicsCheckbox(win) {
  return win.document.querySelector('#exportStep1Rows input[data-section-key="issues"]');
}
function severitySubOption(win) {
  return win.document.getElementById('exportIncludeSeverity');
}

// Advance Step 1 → 3 and click download, returning the captured PDF payload.
async function capturePdfInput(env) {
  var win = env.win;
  win.document.getElementById('exportNextBtn').click(); // 1 → 2 (captures selection)
  await settle();
  win.document.getElementById('exportNextBtn').click(); // 2 → 3
  await settle();
  win.document.getElementById('exportDownloadPdf').click();
  await waitFor(function () { return env.pdfCalls.length > 0; });
  return env.pdfCalls[0];
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── a. topics checked + sub-option UNCHECKED → no severity, names still emit ─
  await test('(a) topics checked + severity sub-option unchecked: PDF payload empty, but the markdown keeps the Session-topics section with topic names', async function () {
    var env = buildEnv({ issues: [{ name: 'TOPIC_A', before: 7, after: 2 }] });
    var win = env.win;
    await env.domHandler();
    await settle();

    win.document.getElementById('exportSessionBtn').click();
    await settle();

    var topics = topicsCheckbox(win);
    assert.ok(topics && topics.checked, 'topics must default checked when issue data exists');
    var sub = severitySubOption(win);
    assert.ok(sub, 'the severity sub-option must be offered');
    assert.strictEqual(sub.disabled, false, 'the sub-option must be enabled while topics is checked');
    sub.checked = false; // opt out of severity only

    var input = await capturePdfInput(env);
    assert.ok(Array.isArray(input.issues) && input.issues.length === 0,
      'severity excluded → PDF issues[] must be empty (got ' + JSON.stringify(input.issues) + ')');

    var md = win.document.getElementById('exportEditor').value;
    assert.ok(md.indexOf('## issues') !== -1, 'the Session-topics heading must still be present');
    assert.ok(md.indexOf('TOPIC_A') !== -1, 'the topic name must still be listed at the topics slot');

    env.dom.window.close();
  });

  // ─── b. mixed numeric + fully-unrated → payload keeps only the rated topic ────
  await test('(b) a mix of numeric and fully-unrated topics: the PDF payload keeps only the numeric-rated topic', async function () {
    var env = buildEnv({ issues: [
      { name: 'RATED', before: 8, after: 3 },
      { name: 'UNRATED', before: null, after: null }
    ] });
    var win = env.win;
    await env.domHandler();
    await settle();

    win.document.getElementById('exportSessionBtn').click();
    await settle();
    var sub = severitySubOption(win);
    assert.ok(sub && sub.checked, 'the sub-option must default checked when issue data exists');

    var input = await capturePdfInput(env);
    assert.strictEqual(input.issues.length, 1, 'only the rated topic survives the filter');
    assert.strictEqual(input.issues[0].name, 'RATED', 'the surviving topic must be the rated one');

    env.dom.window.close();
  });

  // ─── c. all-unrated → payload empty, block omitted, no dash placeholder ───────
  await test('(c) an all-unrated topic set yields an empty PDF payload (block omitted) even with the sub-option checked, and no dash/N/A leaks', async function () {
    var env = buildEnv({ issues: [
      { name: 'U1', before: null, after: null },
      { name: 'U2', before: null, after: null }
    ] });
    var win = env.win;
    await env.domHandler();
    await settle();

    win.document.getElementById('exportSessionBtn').click();
    await settle();
    var sub = severitySubOption(win);
    assert.ok(sub && sub.checked, 'sub-option checked (precondition)');

    var input = await capturePdfInput(env);
    assert.strictEqual(input.issues.length, 0,
      'zero topics qualify → empty payload so the severity block is omitted');
    var payloadStr = JSON.stringify(input.issues);
    assert.ok(payloadStr.indexOf('—') === -1 && payloadStr.indexOf('N/A') === -1,
      'the payload must contain no literal dash/N-A placeholder');

    var md = win.document.getElementById('exportEditor').value;
    assert.ok(md.indexOf('—') === -1 && md.indexOf('N/A') === -1,
      'the filtered markdown must contain no literal dash/N-A placeholder for an unrated topic');
    // The topic names still export under Session topics.
    assert.ok(md.indexOf('U1') !== -1 && md.indexOf('U2') !== -1,
      'unrated topic NAMES still export under Session topics');

    env.dom.window.close();
  });

  // ─── d. partially-rated (before numeric, after null) → KEPT ───────────────────
  await test('(d) a partially-rated topic (before numeric, after null) is kept in the PDF payload', async function () {
    var env = buildEnv({ issues: [{ name: 'PARTIAL', before: 6, after: null }] });
    var win = env.win;
    await env.domHandler();
    await settle();

    win.document.getElementById('exportSessionBtn').click();
    await settle();

    var input = await capturePdfInput(env);
    assert.strictEqual(input.issues.length, 1, 'a partially-rated topic keeps its row');
    assert.strictEqual(input.issues[0].name, 'PARTIAL', 'the partially-rated topic survives');
    assert.strictEqual(input.issues[0].before, 6, 'the numeric before side is preserved');

    env.dom.window.close();
  });

  // ─── f. afterSeverity switch OFF → no sub-option, no severity ─────────────────
  await test('(f) with App.isSectionEnabled("afterSeverity") false, the sub-option is not offered and a rated session exports no severity', async function () {
    var env = buildEnv({
      issues: [{ name: 'RATED', before: 9, after: 1 }],
      isSectionEnabled: function (key) { return key !== 'afterSeverity'; }
    });
    var win = env.win;
    await env.domHandler();
    await settle();

    win.document.getElementById('exportSessionBtn').click();
    await settle();

    assert.strictEqual(severitySubOption(win), null,
      'the severity sub-option must NOT be offered while the switch is off');

    var input = await capturePdfInput(env);
    assert.strictEqual(input.issues.length, 0,
      'switch off → no severity payload even for a session with stored numeric ratings');

    env.dom.window.close();
  });

  // ─── g. uncheck then re-check topics restores the sub-option default ──────────
  await test('(g) unchecking then re-checking topics restores the sub-option data-derived default', async function () {
    var env = buildEnv({ issues: [{ name: 'TOPIC_A', before: 4, after: 1 }] });
    var win = env.win;
    await env.domHandler();
    await settle();

    win.document.getElementById('exportSessionBtn').click();
    await settle();

    var topics = topicsCheckbox(win);
    var sub = severitySubOption(win);
    assert.ok(sub.checked && !sub.disabled, 'precondition: sub-option checked + enabled');

    // Uncheck topics → sub-option disables + unchecks.
    topics.checked = false;
    topics.dispatchEvent(new win.Event('change', { bubbles: true }));
    await settle();
    assert.strictEqual(sub.disabled, true, 'sub-option disabled when topics unchecked');
    assert.strictEqual(sub.checked, false, 'sub-option unchecked when topics unchecked');

    // Re-check topics → sub-option restored to its data-derived default (checked).
    topics.checked = true;
    topics.dispatchEvent(new win.Event('change', { bubbles: true }));
    await settle();
    assert.strictEqual(sub.disabled, false, 'sub-option re-enabled when topics re-checked');
    assert.strictEqual(sub.checked, true, 'sub-option restored to its data-derived default (not the last manual state)');

    env.dom.window.close();
  });

  // ─── clipboard-copy builder (buildSessionMarkdown) ───────────────────────────
  // These drive the REAL copy path directly via the test-hook seam (the copy
  // button never opens the Step-1 modal, so _exportState stays null and the
  // include-by-default posture applies). App.t returns the KEY, so a rating line
  // is detectable by its i18n key 'session.copy.scale.before'.
  function copyMarkdown(win) {
    var hooks = win.__exportModalTestHooks;
    assert.ok(hooks && typeof hooks.buildSessionMarkdown === 'function',
      '__exportModalTestHooks.buildSessionMarkdown must be exposed (the clipboard copy builder)');
    return hooks.buildSessionMarkdown();
  }
  var RATING_KEY = 'session.copy.scale.before';

  // ─── (h) an unrated topic copies as its NAME ONLY (no rating line, no NaN) ────
  await test('(h) clipboard: an unrated topic copies as its name only — no rating line for the unrated side, no NaN change line', async function () {
    var env = buildEnv({ issues: [{ name: 'UNRATED_TOPIC', before: null, after: null }] });
    var win = env.win;
    await env.domHandler();
    await settle();

    var md = copyMarkdown(win);
    assert.ok(md.indexOf('## issues') !== -1, 'the Session-topics heading must be present in the copy');
    assert.ok(md.indexOf('- UNRATED_TOPIC') !== -1, 'the unrated topic name must copy');
    assert.ok(md.indexOf('UNRATED_TOPIC —') === -1,
      'no rating line (name + em-dash + rating) may be emitted for an unrated topic');
    assert.ok(md.indexOf(RATING_KEY) === -1, 'no before/after rating label may appear for an unrated topic');
    assert.ok(md.indexOf('NaN') === -1, 'no NaN change value may ever reach the clipboard');

    env.dom.window.close();
  });

  // ─── (i) a mutated saved order reorders the copied sections ───────────────────
  await test('(i) clipboard: a mutated saved order changes the copied section sequence to match flattenOrderKeys(order)', async function () {
    // Put comments + trapped BEFORE issues in the saved order; both non-default.
    var order = ['comments', 'trapped', 'issues', 'afterSeverity', 'insights',
      'heartShield', 'heartShieldEmotions', 'limitingBeliefs', 'additionalTech', 'nextSession'];
    var env = buildEnv({
      orderKeys: order,
      issues: [{ name: 'RATED', before: 5, after: 2 }]
    });
    var win = env.win;
    await env.domHandler();
    await settle();

    // Give trapped + comments visible content so their sections emit.
    win.document.getElementById('trappedEmotions').value = 'TRAPPED_BODY';
    win.document.getElementById('sessionComments').value = 'COMMENTS_BODY';

    var md = copyMarkdown(win);
    var iComments = md.indexOf('## comments');
    var iTrapped = md.indexOf('## trapped');
    var iIssues = md.indexOf('## issues');
    assert.ok(iComments !== -1 && iTrapped !== -1 && iIssues !== -1,
      'comments, trapped and issues sections must all be present');
    assert.ok(iComments < iTrapped && iTrapped < iIssues,
      'the copied section order must follow the mutated saved order (comments → trapped → issues)');

    env.dom.window.close();
  });

  // ─── (j) severity switch OFF → topic names copy, zero rating lines ────────────
  await test('(j) clipboard: with the severity switch off, the copy carries topic names but zero before/after/change lines', async function () {
    var env = buildEnv({
      issues: [{ name: 'RATED', before: 9, after: 1 }],
      isSectionEnabled: function (key) { return key !== 'afterSeverity'; }
    });
    var win = env.win;
    await env.domHandler();
    await settle();

    var md = copyMarkdown(win);
    assert.ok(md.indexOf('- RATED') !== -1, 'the topic name still copies when severity is suppressed');
    assert.ok(md.indexOf('RATED —') === -1, 'no rating line may follow the topic name when severity is off');
    assert.ok(md.indexOf(RATING_KEY) === -1, 'no before/after rating label may appear when the severity switch is off');

    env.dom.window.close();
  });

  // ─── count guard ─────────────────────────────────────────────────────────────
  var EXPECTED_COUNT = 9;
  if (passed + failed !== EXPECTED_COUNT) {
    console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped.');
    process.exit(1);
  }

  console.log('');
  console.log('47-severity-unrated tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
