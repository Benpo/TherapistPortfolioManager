/**
 * tests/47-form-order.test.js — the order-driven session form render.
 *
 * ROOT CAUSE THIS CLOSES: the session form must physically arrange its section
 * and group containers into the therapist's SAVED order at open, hide a group
 * whose members are all effectively hidden, keep disabled sections present but
 * hidden, and MOVE (not rebuild) nodes so inputs/values/listeners survive. This
 * is add-session.js's applySectionOrder + the group-empty-hide pass on
 * applySectionVisibility.
 *
 * THE GUARD (jsdom real-page, mirrors 30-section-visibility): load the REAL
 * add-session.html body + the REAL assets/add-session.js into jsdom, inject an
 * App.* stub whose getSectionOrder returns a MUTATED order and whose
 * isSectionEnabled drives the disabled cases, await the REAL DOMContentLoaded
 * handler, then assert the OBSERVABLE render — the [data-section-key] document
 * order, the group container is-hidden class, a surviving input value, and the
 * pin call — never an internal function name.
 *
 * FALSIFIABLE: with applySectionOrder removed the form stays in source order and
 * Case 1 FAILS; with the group-empty-hide pass removed Case 2 FAILS.
 *
 * Run: node tests/47-form-order.test.js
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

// The default resolved order the form reads when nothing is mutated.
var DEFAULT_ORDER = [
  { type: 'section', key: 'issues' },
  { type: 'group', id: 'emotionsTech', titleOverride: null,
    members: ['heartShield', 'heartShieldEmotions', 'trapped', 'insights', 'limitingBeliefs', 'additionalTech'] },
  { type: 'section', key: 'afterSeverity' },
  { type: 'group', id: 'wrapup', titleOverride: null, members: ['comments', 'nextSession'] },
];

// A MUTATED order: afterSeverity pulled up right after issues, the emotionsTech
// members shuffled, and the wrapup members swapped. issues stays first.
var MUTATED_ORDER = [
  { type: 'section', key: 'issues' },
  { type: 'section', key: 'afterSeverity' },
  { type: 'group', id: 'emotionsTech', titleOverride: null,
    members: ['trapped', 'heartShield', 'insights', 'heartShieldEmotions', 'additionalTech', 'limitingBeliefs'] },
  { type: 'group', id: 'wrapup', titleOverride: null, members: ['nextSession', 'comments'] },
];

// Local flatten (mirrors App.flattenOrderKeys) to compute the expected key list.
function flatten(order) {
  var keys = [];
  order.forEach(function (item) {
    if (item.type === 'section') keys.push(item.key);
    else if (item.type === 'group') item.members.forEach(function (m) { keys.push(m); });
  });
  return keys;
}

/**
 * Boot add-session against the REAL page with an App stub whose section-order
 * surface (getSectionOrder / pinSectionOrder / flattenOrderKeys) and
 * isSectionEnabled are supplied per-case. Returns the captured DOMContentLoaded
 * handler + a pin-call counter.
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

  var pinCount = 0;
  var order = opts.order || DEFAULT_ORDER;

  win.App = createAppStub({
    createSeverityScale: function () { return win.document.createElement('div'); },
    getSeverityValue: function () { return null; },
    isSectionEnabled: opts.isSectionEnabled || function () { return true; },
    getSectionOrder: function () { return JSON.parse(JSON.stringify(order)); },
    pinSectionOrder: function () { pinCount += 1; },
    flattenOrderKeys: function (o) { return flatten(o); },
  });
  win.PortfolioDB = createMockPortfolioDB({ clients: [], sessions: opts.sessions || [] });
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

  if (!docHandlers['DOMContentLoaded'] || docHandlers['DOMContentLoaded'].length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler');
  }
  return { dom: dom, win: win, docHandlers: docHandlers, getPinCount: function () { return pinCount; } };
}

function sectionKeySequence(win) {
  return Array.prototype.map.call(
    win.document.querySelectorAll('[data-section-key]'),
    function (el) { return el.getAttribute('data-section-key'); }
  );
}
function groupContainer(win, id) {
  return win.document.querySelector('[data-group-id="' + id + '"]');
}
function badge(win, key) {
  var w = win.document.querySelector('[data-section-key="' + key + '"]');
  return w && w.querySelector('.disabled-indicator-badge');
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── Case 1: mutated order → DOM [data-section-key] sequence matches ──────────
  await test('a mutated saved order arranges the form [data-section-key] sequence to equal flattenOrderKeys(order)', async function () {
    var env = buildEnv({ order: MUTATED_ORDER });
    var win = env.win;
    await env.docHandlers['DOMContentLoaded'][0]();
    await settle();

    var expected = flatten(MUTATED_ORDER); // enabled → all present
    assert.deepStrictEqual(sectionKeySequence(win), expected,
      'the form section containers must render in the saved (mutated) order');
    env.dom.window.close();
  });

  // ─── Case 2: all-disabled group hides; a group with an enabled member stays ──
  await test('a group whose members are ALL disabled has its container hidden; a group with an enabled member stays visible', async function () {
    var env = buildEnv({
      order: DEFAULT_ORDER,
      isSectionEnabled: function (key) { return key !== 'comments' && key !== 'nextSession'; },
    });
    var win = env.win;
    await env.docHandlers['DOMContentLoaded'][0]();
    await settle();

    var wrapup = groupContainer(win, 'wrapup');
    var emotions = groupContainer(win, 'emotionsTech');
    assert.ok(wrapup && emotions, 'both group containers must exist');
    assert.strictEqual(wrapup.classList.contains('is-hidden'), true,
      'a group with all members disabled (new session) must be hidden');
    assert.strictEqual(emotions.classList.contains('is-hidden'), false,
      'a group with at least one enabled member must stay visible');
    env.dom.window.close();
  });

  // ─── Case 3: past-session data keeps an all-disabled group visible + badged ──
  await test('a past-session all-disabled group whose member carries data stays visible with the member badged', async function () {
    var env = buildEnv({
      order: DEFAULT_ORDER,
      isSectionEnabled: function (key) { return key !== 'comments' && key !== 'nextSession'; },
      sessionId: 1,
      // comments HAS data, nextSession has none → the group must stay visible.
      sessions: [{ id: 1, clientId: 1, date: '2026-06-01', comments: 'HAS_COMMENT_DATA', customerSummary: '' }],
    });
    var win = env.win;
    await env.docHandlers['DOMContentLoaded'][0]();
    await settle();

    var wrapup = groupContainer(win, 'wrapup');
    assert.ok(wrapup, 'the wrapup group container must exist');
    assert.strictEqual(wrapup.classList.contains('is-hidden'), false,
      'a group whose disabled member carries recorded data must stay visible (data never hidden)');
    var commentsBadge = badge(win, 'comments');
    assert.ok(commentsBadge, 'the comments section must carry a disabled-indicator badge');
    assert.strictEqual(commentsBadge.classList.contains('is-hidden'), false,
      'the data-carrying disabled member must show its disabled badge');
    env.dom.window.close();
  });

  // ─── Case 4: node MOVE semantics — a value set before arrange survives ────────
  await test('arranging MOVES nodes (appendChild) so an input value set before the arrange survives and every id stays unique', async function () {
    var env = buildEnv({ order: MUTATED_ORDER });
    var win = env.win;
    // Set a value on a static input BEFORE the init arrange runs.
    win.document.getElementById('trappedEmotions').value = 'SURVIVE_MARK';
    await env.docHandlers['DOMContentLoaded'][0]();
    await settle();

    var trapped = win.document.querySelectorAll('#trappedEmotions');
    assert.strictEqual(trapped.length, 1, '#trappedEmotions must exist exactly once after the arrange');
    assert.strictEqual(trapped[0].value, 'SURVIVE_MARK',
      'the input value must survive the arrange (node moved, not rebuilt)');
    env.dom.window.close();
  });

  // ─── Case 5: the order is pinned at form open ────────────────────────────────
  await test('the form pins the section order at open (pinSectionOrder called at least once)', async function () {
    var env = buildEnv({ order: DEFAULT_ORDER });
    await env.docHandlers['DOMContentLoaded'][0]();
    await settle();
    assert.ok(env.getPinCount() >= 1, 'pinSectionOrder must be called at form init');
    env.dom.window.close();
  });

  // ─── Case 6: heartShieldConditional stays inside the emotionsTech group ───────
  await test('#heartShieldConditional resolves inside the Emotions & Techniques group after the arrange', async function () {
    var env = buildEnv({ order: MUTATED_ORDER });
    var win = env.win;
    await env.docHandlers['DOMContentLoaded'][0]();
    await settle();

    var cond = win.document.getElementById('heartShieldConditional');
    assert.ok(cond, '#heartShieldConditional must exist');
    var grp = cond.closest('[data-group-id]');
    assert.ok(grp && grp.getAttribute('data-group-id') === 'emotionsTech',
      '#heartShieldConditional must live inside the emotionsTech group (never stranded)');
    env.dom.window.close();
  });

  var EXPECTED_COUNT = 6;
  try { assert.strictEqual(passed + failed, EXPECTED_COUNT); }
  catch (e) {
    console.error('\nGUARD FAILED: expected ' + EXPECTED_COUNT + ' cases, ran ' + (passed + failed));
    process.exit(1);
  }

  console.log('');
  console.log('Plan 47-04 form-order tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
