/**
 * tests/47-severity-form.test.js — the session form's severity semantics.
 *
 * ROOT CAUSE THIS CLOSES: under the unrated-by-default model a topic's start
 * rating is optional. Clearing it (null) must (a) flow through getIssuesPayload
 * → save → reload without being coerced to 0 or blocking save, (b) auto-hide
 * that topic's end-of-session rating row keyed on EMPTINESS, and (c) void the
 * paired end rating so no unmeasured topic can carry a hidden end value. The
 * 'Issue severity' switch is the app-level severity master: off hides both the
 * end-of-session block and the per-topic start-rating column on a data-free
 * session, but keeps both visible+badged on a past session that already recorded
 * severity (recorded clinical data is never hidden). The start-rating label
 * reads 'Severity at start'.
 *
 * THE GUARD (jsdom real-page, mirrors 47-form-order): load the REAL
 * add-session.html body + the REAL assets/add-session.js into jsdom, inject an
 * App.* stub carrying a REAL-shaped severity widget pair (dataset.value +
 * tap-again-to-clear pills) so getSeverityValue round-trips, capture the
 * getIssuesPayload closure the page hands to the export module, drive the
 * OBSERVABLE widget clicks, and assert payload values + DOM visibility — never
 * an internal function name.
 *
 * Run: node tests/47-severity-form.test.js
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

var DEFAULT_ORDER = [
  { type: 'section', key: 'issues' },
  { type: 'group', id: 'emotionsTech', titleOverride: null,
    members: ['heartShield', 'heartShieldEmotions', 'trapped', 'insights', 'limitingBeliefs', 'additionalTech'] },
  { type: 'section', key: 'afterSeverity' },
  { type: 'group', id: 'wrapup', titleOverride: null, members: ['comments', 'nextSession'] },
];

function flatten(order) {
  var keys = [];
  order.forEach(function (item) {
    if (item.type === 'section') keys.push(item.key);
    else if (item.type === 'group') item.members.forEach(function (m) { keys.push(m); });
  });
  return keys;
}

// A REAL-shaped severity widget pair: the click sets dataset.value and fires
// onChange; tapping the active pill again clears it back to unrated (null).
// getSeverityValue reads dataset.value. This mirrors assets/app.js so the form
// readers exercise the true widget contract.
function makeSeverityPair(win) {
  function createSeverityScale(initialValue, onChange) {
    var wrap = win.document.createElement('div');
    wrap.className = 'severity-scale';
    wrap.dataset.value = (initialValue !== null && initialValue !== undefined) ? String(initialValue) : '';
    for (var i = 0; i <= 10; i += 1) {
      (function (n) {
        var btn = win.document.createElement('button');
        btn.type = 'button';
        btn.className = 'severity-button';
        btn.textContent = String(n);
        if (String(initialValue) === String(n)) btn.classList.add('is-active');
        btn.addEventListener('click', function () {
          if (wrap.dataset.value === String(n)) {
            wrap.dataset.value = '';
            wrap.querySelectorAll('.severity-button').forEach(function (b) { b.classList.remove('is-active'); });
            if (onChange) onChange(null);
            return;
          }
          wrap.dataset.value = String(n);
          wrap.querySelectorAll('.severity-button').forEach(function (b) { b.classList.remove('is-active'); });
          btn.classList.add('is-active');
          if (onChange) onChange(n);
        });
        wrap.appendChild(btn);
      })(i);
    }
    return wrap;
  }
  function getSeverityValue(wrap) {
    if (!wrap) return null;
    var v = wrap.dataset.value;
    if (v === '' || v === undefined) return null;
    return Number.parseInt(v, 10);
  }
  return { createSeverityScale: createSeverityScale, getSeverityValue: getSeverityValue };
}

var LABELS = {
  'session.form.severityAtStart': 'Severity at start',
  'session.form.beforeSeverity': 'Severity before',
  'session.form.afterSeverity': 'Severity after',
  'session.form.issueName': 'Issue',
};

/**
 * Boot add-session against the REAL page with an App stub carrying the real
 * severity widget pair + a configurable isSectionEnabled/getSectionOrder, and
 * CAPTURE the getIssuesPayload closure the page passes to the export module.
 */
function buildEnv(opts) {
  opts = opts || {};
  var html = readAsset('add-session.html');
  var url = 'https://localhost/add-session.html';
  if (opts.sessionId != null) url += '?sessionId=' + opts.sessionId;
  var dom = new JSDOM(html, { url: url, runScripts: 'outside-only', pretendToBeVisual: false });
  var win = dom.window;

  var docHandlers = {};
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (!docHandlers[type]) docHandlers[type] = [];
    docHandlers[type].push(fn);
    if (type === 'DOMContentLoaded') return;
    return realAdd(type, fn, o);
  };

  var order = opts.order || DEFAULT_ORDER;
  var pair = makeSeverityPair(win);

  win.App = createAppStub({
    t: LABELS,
    createSeverityScale: pair.createSeverityScale,
    getSeverityValue: pair.getSeverityValue,
    isSectionEnabled: opts.isSectionEnabled || function () { return true; },
    getSectionOrder: function () { return JSON.parse(JSON.stringify(order)); },
    pinSectionOrder: function () {},
    flattenOrderKeys: function (o) { return flatten(o); },
  });
  win.PortfolioDB = createMockPortfolioDB({ clients: opts.clients || [], sessions: opts.sessions || [] });
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

  // Capture the getIssuesPayload closure the page hands to the export module,
  // while still letting the real init run.
  var captured = {};
  var realInit = win.__exportModalInit;
  win.__exportModalInit = function (api) {
    captured.api = api;
    return typeof realInit === 'function' ? realInit(api) : undefined;
  };

  if (!docHandlers['DOMContentLoaded'] || docHandlers['DOMContentLoaded'].length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler');
  }
  return {
    dom: dom, win: win, docHandlers: docHandlers,
    payload: function () { return captured.api.getIssuesPayload(); },
  };
}

async function boot(opts) {
  var env = buildEnv(opts);
  await env.docHandlers['DOMContentLoaded'][0]();
  await settle();
  return env;
}

function firstBeforeScale(win) { return win.document.querySelector('#issueList .issue-block .severity-scale'); }
function firstAfterScale(win) { return win.document.querySelector('#issueSummaryList .issue-summary .severity-scale'); }
function firstSummaryBlock(win) { return win.document.querySelector('#issueSummaryList .issue-summary'); }
function firstNameInput(win) { return win.document.querySelector('#issueList .issue-block input.input'); }
function afterSeveritySection(win) { return win.document.querySelector('[data-section-key="afterSeverity"]'); }
function firstRemoveButton(win) { return win.document.querySelector('#issueList .issue-block .issue-remove'); }
function clickPill(scale, n) { scale.querySelectorAll('.severity-button')[n].click(); }
function nameFirstTopic(win, name) {
  var input = firstNameInput(win);
  input.value = name;
  input.dispatchEvent(new win.Event('input', { bubbles: true }));
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── Case 1: getIssuesPayload forwards null (not 0) / Number ──────────────────
  await test('getIssuesPayload forwards null for a cleared/unselected rating and a Number for a selected pill', async function () {
    var env = await boot();
    var win = env.win;
    nameFirstTopic(win, 'Anxiety');
    var p0 = env.payload();
    assert.strictEqual(p0.length, 1, 'the named topic is in the payload');
    assert.strictEqual(p0[0].before, null, 'an unselected start rating is null (never 0)');
    assert.strictEqual(p0[0].after, null, 'an unselected end rating is null (never 0)');

    clickPill(firstBeforeScale(win), 7);
    clickPill(firstAfterScale(win), 3);
    var p1 = env.payload();
    assert.strictEqual(p1[0].before, 7, 'a selected start pill reads as its Number');
    assert.strictEqual(p1[0].after, 3, 'a selected end pill reads as its Number');
    env.dom.window.close();
  });

  // ─── Case 2: cleared (null) before is save-safe and round-trips ──────────────
  await test('a cleared (null) start rating stays in the payload (save-safe) and a stored null re-renders unselected with no end-of-session row', async function () {
    var env = await boot();
    var win = env.win;
    nameFirstTopic(win, 'Grief');
    clickPill(firstBeforeScale(win), 7);
    // Clear the start rating by tapping the active pill again.
    clickPill(firstBeforeScale(win), 7);
    var p = env.payload();
    assert.strictEqual(p.length, 1, 'the named topic is NOT dropped when its start rating is cleared (validateIssues stays payload.length > 0)');
    assert.strictEqual(p[0].before, null, 'the cleared start rating persists as null, not coerced');
    env.dom.window.close();

    // Round-trip: a stored null start rating re-renders with no pill selected and
    // no end-of-session rating row for that topic.
    var env2 = await boot({
      sessionId: 1,
      sessions: [{ id: 1, clientId: 1, date: '2026-06-01', issues: [{ name: 'Grief', before: null }] }],
    });
    var win2 = env2.win;
    assert.strictEqual(firstBeforeScale(win2).querySelector('.severity-button.is-active'), null,
      'a stored null start rating leaves the pill unselected on reload');
    assert.strictEqual(firstSummaryBlock(win2).classList.contains('is-hidden'), true,
      'a topic with no start rating shows no end-of-session rating row');
    env2.dom.window.close();
  });

  // ─── Case 3: updateDelta auto-hides the end-of-session row when start is null ─
  await test('an unrated start rating hides that topic end-of-session row; selecting a numeric start restores it', async function () {
    var env = await boot();
    var win = env.win;
    nameFirstTopic(win, 'Fear');
    assert.strictEqual(firstSummaryBlock(win).classList.contains('is-hidden'), true,
      'with no start rating the end-of-session row is hidden');
    clickPill(firstBeforeScale(win), 5);
    assert.strictEqual(firstSummaryBlock(win).classList.contains('is-hidden'), false,
      'selecting a numeric start rating restores the end-of-session row');
    env.dom.window.close();
  });

  // ─── Case 4 (D-22a): clearing the start voids the paired end rating ──────────
  await test('clearing the start rating voids the paired end rating (before:null, after:null); re-rating the start shows an empty end scale', async function () {
    var env = await boot();
    var win = env.win;
    nameFirstTopic(win, 'Shame');
    clickPill(firstBeforeScale(win), 7);
    clickPill(firstAfterScale(win), 3);
    assert.deepStrictEqual(
      { before: env.payload()[0].before, after: env.payload()[0].after },
      { before: 7, after: 3 }, 'both ratings set');
    // Clear the START pill → the end rating is voided too.
    clickPill(firstBeforeScale(win), 7);
    assert.deepStrictEqual(
      { before: env.payload()[0].before, after: env.payload()[0].after },
      { before: null, after: null }, 'clearing the start voids the pair — no hidden end value survives');
    assert.strictEqual(firstAfterScale(win).querySelector('.severity-button.is-active'), null,
      'the end scale shows no active pill after the start is cleared');
    // Re-rate the start → the end scale stays empty (the old value was voided).
    clickPill(firstBeforeScale(win), 5);
    assert.strictEqual(env.payload()[0].before, 5, 're-rating the start reads the new Number');
    assert.strictEqual(env.payload()[0].after, null, 're-rating the start does NOT resurrect the voided end value');
    env.dom.window.close();
  });

  // ─── Case 5: clearing the end scale alone leaves the start intact ────────────
  await test('clearing the end scale alone clears only itself; the start rating stays', async function () {
    var env = await boot();
    var win = env.win;
    nameFirstTopic(win, 'Anger');
    clickPill(firstBeforeScale(win), 7);
    clickPill(firstAfterScale(win), 3);
    clickPill(firstAfterScale(win), 3); // clear only the after pill
    assert.strictEqual(env.payload()[0].before, 7, 'clearing the end leaves the start intact');
    assert.strictEqual(env.payload()[0].after, null, 'the end rating clears to null');
    env.dom.window.close();
  });

  // ─── Case 6: no skipped-rating hint element is rendered ──────────────────────
  await test('no skipped-rating hint element is rendered (the — pill / skip hint design was dropped)', async function () {
    var env = await boot();
    var win = env.win;
    nameFirstTopic(win, 'Doubt');
    clickPill(firstBeforeScale(win), 4);
    clickPill(firstBeforeScale(win), 4); // clear → self-evident via the deselected pill
    var hint = win.document.querySelector('.severity-skip-hint, .skipped-rating-hint, [data-severity-skip]');
    assert.strictEqual(hint, null, 'no skip-hint helper element exists');
    env.dom.window.close();
  });

  // ─── Case 7: the topic-row rating label reads 'Severity at start' ────────────
  await test("the topic-row start-rating label reads 'Severity at start' (session.form.severityAtStart), not the old 'before' key", async function () {
    var env = await boot();
    var win = env.win;
    var label = win.document.querySelector('#issueList .issue-block label[data-i18n="session.form.severityAtStart"]');
    assert.ok(label, 'the start-rating label uses the session.form.severityAtStart key');
    assert.strictEqual(label.textContent, 'Severity at start', 'it resolves to the Severity at start string');
    assert.strictEqual(
      win.document.querySelector('#issueList .issue-block label[data-i18n="session.form.beforeSeverity"]'),
      null, 'the old before-severity label key is gone from the topic row');
    env.dom.window.close();
  });

  // ─── Case 8: severity off + no data → block AND start column hidden ──────────
  await test('with Issue severity off on a data-free session, the end-of-session block AND every topic start-rating column hide; the topic name field stays', async function () {
    var env = await boot({ isSectionEnabled: function (k) { return k !== 'afterSeverity'; } });
    var win = env.win;
    assert.strictEqual(afterSeveritySection(win).classList.contains('is-hidden'), true,
      'the afterSeverity end-of-session block is hidden');
    assert.strictEqual(firstBeforeScale(win).closest('.form-field').classList.contains('is-hidden'), true,
      'the per-topic start-rating column is hidden');
    assert.strictEqual(firstNameInput(win).closest('.form-field').classList.contains('is-hidden'), false,
      'the topic name field stays visible (topics remain)');
    env.dom.window.close();
  });

  // ─── Case 9: severity off + past session WITH data → both stay visible ───────
  await test('with Issue severity off on a PAST session carrying numeric severity, the end-of-session block AND the start-rating columns both stay visible (badged)', async function () {
    var env = await boot({
      isSectionEnabled: function (k) { return k !== 'afterSeverity'; },
      sessionId: 1,
      sessions: [{ id: 1, clientId: 1, date: '2026-06-01', issues: [{ name: 'X', before: 6, after: 2 }] }],
    });
    var win = env.win;
    assert.strictEqual(afterSeveritySection(win).classList.contains('is-hidden'), false,
      'recorded severity keeps the end-of-session block visible (data never hidden)');
    assert.strictEqual(firstBeforeScale(win).closest('.form-field').classList.contains('is-hidden'), false,
      'recorded severity keeps the start-rating columns visible — the two surfaces never disagree');
    var badge = afterSeveritySection(win).querySelector('.disabled-indicator-badge');
    assert.ok(badge && !badge.classList.contains('is-hidden'),
      'the disabled-section badge is shown on the still-visible block');
    env.dom.window.close();
  });

  // ─── Case 10: severity on → both visible ─────────────────────────────────────
  await test('with Issue severity on, the start-rating columns and the end-of-session block are visible', async function () {
    var env = await boot();
    var win = env.win;
    assert.strictEqual(afterSeveritySection(win).classList.contains('is-hidden'), false,
      'the end-of-session block is visible when severity is on');
    assert.strictEqual(firstBeforeScale(win).closest('.form-field').classList.contains('is-hidden'), false,
      'the start-rating column is visible when severity is on');
    env.dom.window.close();
  });

  // ─── Case 11: a topic added while severity is off starts hidden ──────────────
  await test('a topic added while Issue severity is off renders with its start-rating column hidden', async function () {
    var env = await boot({ isSectionEnabled: function (k) { return k !== 'afterSeverity'; } });
    var win = env.win;
    win.document.getElementById('addIssueBtn').click();
    await settle();
    var scales = win.document.querySelectorAll('#issueList .issue-block .severity-scale');
    assert.strictEqual(scales.length, 2, 'a second topic row exists');
    assert.strictEqual(scales[1].closest('.form-field').classList.contains('is-hidden'), true,
      'the newly-added topic row start-rating column is hidden while severity is off');
    env.dom.window.close();
  });

  // ─── Case 12: the start column is HIDDEN (class), not removed — value survives ─
  await test('the start-rating column is hidden by class, not removed — a selected value survives a disable→enable cycle', async function () {
    var sevOn = { v: true };
    var env = await boot({ isSectionEnabled: function (k) { return k === 'afterSeverity' ? sevOn.v : true; } });
    var win = env.win;
    clickPill(firstBeforeScale(win), 6);
    assert.strictEqual(firstBeforeScale(win).dataset.value, '6', 'the start rating is set');
    // Disable severity live.
    sevOn.v = false;
    win.document.dispatchEvent(new win.Event('app:settings-changed'));
    await settle();
    assert.strictEqual(firstBeforeScale(win).closest('.form-field').classList.contains('is-hidden'), true,
      'the column hides on disable');
    assert.ok(firstBeforeScale(win), 'the start scale node is still present (hidden, not removed)');
    assert.strictEqual(firstBeforeScale(win).dataset.value, '6', 'the selected value survives while hidden');
    // Re-enable.
    sevOn.v = true;
    win.document.dispatchEvent(new win.Event('app:settings-changed'));
    await settle();
    assert.strictEqual(firstBeforeScale(win).closest('.form-field').classList.contains('is-hidden'), false,
      'the column reappears on enable');
    assert.strictEqual(firstBeforeScale(win).dataset.value, '6', 'the value is intact after the cycle');
    env.dom.window.close();
  });

  // ─── Case 13: setting a start rating marks the form dirty ────────────────────
  await test('setting a start rating marks the form dirty (severity pills are buttons that bypass the input/change tracker)', async function () {
    var env = await boot();
    var win = env.win;
    assert.strictEqual(win.PortfolioFormDirty(), false, 'a freshly opened form is clean');
    clickPill(firstBeforeScale(win), 6);
    assert.strictEqual(win.PortfolioFormDirty(), true, 'clicking a start-rating pill marks the form dirty so navigation warns');
    env.dom.window.close();
  });

  // ─── Case 14: clearing a start rating keeps the form dirty ───────────────────
  await test('clearing a start rating (tap the active pill again) keeps the form dirty', async function () {
    var env = await boot();
    var win = env.win;
    clickPill(firstBeforeScale(win), 6);
    clickPill(firstBeforeScale(win), 6); // clear
    assert.strictEqual(win.PortfolioFormDirty(), true, 'clearing a start rating still marks the form dirty (silent-loss path closed)');
    env.dom.window.close();
  });

  // ─── Case 15: an end-rating interaction marks the form dirty ─────────────────
  await test('an end-rating interaction marks the form dirty independently of the start scale (set AND clear)', async function () {
    var env = await boot();
    var win = env.win;
    assert.strictEqual(win.PortfolioFormDirty(), false, 'a freshly opened form is clean');
    clickPill(firstAfterScale(win), 3);
    assert.strictEqual(win.PortfolioFormDirty(), true, 'clicking an end-rating pill marks the form dirty');
    clickPill(firstAfterScale(win), 3); // clear the end only
    assert.strictEqual(win.PortfolioFormDirty(), true, 'clearing the end rating still marks the form dirty');
    env.dom.window.close();
  });

  // ─── Case 16: saving the form resets it clean ────────────────────────────────
  await test('saving the form resets it clean (a subsequent navigation does not warn)', async function () {
    var env = await boot({ clients: [{ id: 1, firstName: 'A', lastName: 'B' }] });
    var win = env.win;
    win.document.getElementById('clientSelect').value = '1';
    nameFirstTopic(win, 'Anxiety');
    clickPill(firstBeforeScale(win), 6);
    assert.strictEqual(win.PortfolioFormDirty(), true, 'the edited form is dirty before save');
    win.document.getElementById('sessionForm').dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
    await settle();
    assert.strictEqual(win.PortfolioFormDirty(), false, 'after a successful save the form reads clean');
    env.dom.window.close();
  });

  // ─── Case 17: severity off, past session — clearing all start ratings live-hides the emptied section ─
  await test('with severity off on a past session, clearing every start rating live-hides the emptied end-of-session section (header + badge gone)', async function () {
    var env = await boot({
      isSectionEnabled: function (k) { return k !== 'afterSeverity'; },
      sessionId: 1,
      sessions: [{ id: 1, clientId: 1, date: '2026-06-01', issues: [
        { name: 'X', before: 6, after: 2 },
        { name: 'Y', before: 4, after: 1 },
      ] }],
    });
    var win = env.win;
    assert.strictEqual(afterSeveritySection(win).classList.contains('is-hidden'), false,
      'recorded severity keeps the end-of-session section visible on load');
    // A past session opens in read mode (pills disabled); the therapist clicks Edit
    // to change ratings, matching the UAT repro.
    win.document.getElementById('editSessionBtn').click();
    await settle();
    var scales = win.document.querySelectorAll('#issueList .issue-block .severity-scale');
    clickPill(scales[0], 6); // clear X's start rating
    assert.strictEqual(afterSeveritySection(win).classList.contains('is-hidden'), false,
      'one topic still carries a numeric rating — the section stays visible');
    clickPill(scales[1], 4); // clear Y's start rating — no numeric rating remains
    assert.strictEqual(afterSeveritySection(win).classList.contains('is-hidden'), true,
      'the fully-emptied disabled section hides live, header-and-all');
    env.dom.window.close();
  });

  // ─── Case 18: a disabled section retaining one rating stays visible + badged ──
  await test('a disabled severity section retaining one numeric rating stays visible + badged after an in-form clear', async function () {
    var env = await boot({
      isSectionEnabled: function (k) { return k !== 'afterSeverity'; },
      sessionId: 1,
      sessions: [{ id: 1, clientId: 1, date: '2026-06-01', issues: [
        { name: 'X', before: 6, after: 2 },
        { name: 'Y', before: 4, after: 1 },
      ] }],
    });
    var win = env.win;
    win.document.getElementById('editSessionBtn').click();
    await settle();
    var scales = win.document.querySelectorAll('#issueList .issue-block .severity-scale');
    clickPill(scales[0], 6); // clear only X's start rating; Y still recorded
    var section = afterSeveritySection(win);
    assert.strictEqual(section.classList.contains('is-hidden'), false,
      'the section stays visible while a topic still carries a numeric rating');
    var badge = section.querySelector('.disabled-indicator-badge');
    assert.ok(badge && !badge.classList.contains('is-hidden'),
      'the disabled-section badge stays shown on the still-visible section');
    env.dom.window.close();
  });

  // ─── Case 19: removing an issue marks the form dirty ─────────────────────────
  await test('removing an issue marks the form dirty (the remove control is a button that bypasses the input/change tracker)', async function () {
    var env = await boot({
      sessionId: 1,
      sessions: [{ id: 1, clientId: 1, date: '2026-06-01', issues: [
        { name: 'X', before: 6, after: 2 },
        { name: 'Y', before: 4, after: 1 },
      ] }],
    });
    var win = env.win;
    assert.strictEqual(win.PortfolioFormDirty(), false, 'a freshly loaded past session is clean');
    win.document.getElementById('editSessionBtn').click();
    await settle();
    firstRemoveButton(win).click();
    assert.strictEqual(win.PortfolioFormDirty(), true,
      'removing an issue marks the form dirty so navigation warns before the deletion is silently discarded');
    env.dom.window.close();
  });

  // ─── Case 20: removing the only rated issue live-hides the disabled section ───
  await test('with severity off, removing the only rated issue live-hides the emptied end-of-session section (header + badge gone)', async function () {
    var env = await boot({
      isSectionEnabled: function (k) { return k !== 'afterSeverity'; },
      sessionId: 1,
      sessions: [{ id: 1, clientId: 1, date: '2026-06-01', issues: [
        { name: 'RATED', before: 6, after: 2 },
        { name: 'UNRATED', before: null, after: null },
      ] }],
    });
    var win = env.win;
    assert.strictEqual(afterSeveritySection(win).classList.contains('is-hidden'), false,
      'the recorded rating keeps the disabled section visible on load');
    win.document.getElementById('editSessionBtn').click();
    await settle();
    firstRemoveButton(win).click(); // removes RATED (the first block); no numeric rating remains
    assert.strictEqual(afterSeveritySection(win).classList.contains('is-hidden'), true,
      'removing the only rated issue empties the disabled section, which hides live');
    env.dom.window.close();
  });

  // ─── Case 21: revert re-shows a section that an in-form clear had collapsed ────
  await test('severity off + past session WITH recorded severity: an in-form clear collapses the section; Cancel→Discard restores the data AND re-shows the section', async function () {
    var env = await boot({
      isSectionEnabled: function (k) { return k !== 'afterSeverity'; },
      sessionId: 1,
      sessions: [{ id: 1, clientId: 1, date: '2026-06-01', issues: [{ name: 'X', before: 6, after: 2 }] }],
    });
    var win = env.win;
    assert.strictEqual(win.PortfolioFormDirty(), false, 'clean after load');
    assert.strictEqual(afterSeveritySection(win).classList.contains('is-hidden'), false,
      'recorded severity keeps the disabled section visible on load');
    win.document.getElementById('editSessionBtn').click();
    await settle();
    clickPill(firstBeforeScale(win), 6); // tap the active pill again → clears the only rating
    assert.strictEqual(afterSeveritySection(win).classList.contains('is-hidden'), true,
      'clearing the only rating collapses the disabled section live');
    win.document.getElementById('cancelSessionBtn').click(); // confirmDialog resolves true → revert
    await settle();
    assert.strictEqual(afterSeveritySection(win).classList.contains('is-hidden'), false,
      'after discard the restored recorded severity re-shows the section (revert re-applies visibility)');
    assert.strictEqual(firstBeforeScale(win).dataset.value, '6',
      'the discarded edit restored the saved start rating');
    env.dom.window.close();
  });

  // ─── Case 22: revert re-hides rebuilt start-rating columns (severity off) ─────
  await test('severity off + past session WITHOUT severity data: after an edit, Cancel→Discard re-hides the rebuilt start-rating column instead of wrongly showing it', async function () {
    var env = await boot({
      isSectionEnabled: function (k) { return k !== 'afterSeverity'; },
      sessionId: 1,
      sessions: [{ id: 1, clientId: 1, date: '2026-06-01', trappedEmotions: 'orig',
        issues: [{ name: 'X', before: null, after: null }] }],
    });
    var win = env.win;
    assert.strictEqual(firstBeforeScale(win).closest('.form-field').classList.contains('is-hidden'), true,
      'severity off + no recorded data → the start-rating column is hidden on load');
    win.document.getElementById('editSessionBtn').click();
    await settle();
    var trapped = win.document.getElementById('trappedEmotions');
    trapped.value = 'edited';
    trapped.dispatchEvent(new win.Event('input', { bubbles: true }));
    await settle();
    assert.strictEqual(win.PortfolioFormDirty(), true, 'the edit marks the form dirty');
    win.document.getElementById('cancelSessionBtn').click(); // confirmDialog resolves true → revert
    await settle();
    assert.strictEqual(firstBeforeScale(win).closest('.form-field').classList.contains('is-hidden'), true,
      'after discard the rebuilt start-rating column is re-hidden to match the severity-off setting');
    env.dom.window.close();
  });

  // ─── Case 23: clicking Add issue marks the form dirty ────────────────────────
  await test('clicking Add issue marks the form dirty (the add control is a button that bypasses the input/change tracker)', async function () {
    var env = await boot();
    var win = env.win;
    assert.strictEqual(win.PortfolioFormDirty(), false, 'a freshly opened form is clean');
    win.document.getElementById('addIssueBtn').click();
    await settle();
    assert.strictEqual(win.PortfolioFormDirty(), true, 'adding an issue marks the form dirty');
    env.dom.window.close();
  });

  var EXPECTED_COUNT = 23;
  try { assert.strictEqual(passed + failed, EXPECTED_COUNT); }
  catch (e) {
    console.error('\nGUARD FAILED: expected ' + EXPECTED_COUNT + ' cases, ran ' + (passed + failed));
    process.exit(1);
  }

  console.log('');
  console.log('Plan 47-07 severity-form + coupling tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
