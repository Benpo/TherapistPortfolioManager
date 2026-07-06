/**
 * tests/37-overview-sort.test.js — RED behavior spec for the Overview
 * click-to-sort column headers <-> #clientSortSelect two-way sync (FILT-04 / D2b,
 * Wave 5, Plan 37-10).
 *
 * TDD RED: the sortable-header contract DOES NOT EXIST YET (the thead <th> carry
 * no data-sort-key / aria-sort / span.sort-arrow and are not clickable). Each case
 * boots the REAL index.html + assets/overview.js against a mock PortfolioDB seeded
 * so clients differ in NAME, SESSION COUNT, and LAST-SESSION DATE (a distinct row
 * ordering per sort key), then asserts the pinned contract Plan 37-15 must build
 * verbatim. It FAILS RED now on the MISSING sortable headers (a clean
 * AssertionError), NOT on a harness crash — the page boots and renders rows first.
 * It MUST turn GREEN unchanged once 37-15 lands the headers; never weaken it.
 *
 * DOM CONTRACT PINNED (from 37-10-PLAN <dom_contract>):
 *   - Sortable headers: th.sortable[data-sort-key="name"|"sessions"|"lastSession"]
 *     each with an aria-sort attribute (none|ascending|descending) and a child
 *     span.sort-arrow. The Type and Actions columns are NOT sortable (no
 *     data-sort-key). #clientSortSelect stays present.
 *   - Two-way sync: clicking a header sets #clientSortSelect.value to that key,
 *     sets that header's aria-sort directional, resets the OTHER sortable headers'
 *     aria-sort to 'none', and reorders #clientTableBody rows. Setting the
 *     dropdown + dispatching change drives the SAME state (updates the matching
 *     header aria-sort, resets the others).
 *   - Default directions: the BOOT render is already name-ascending with the
 *     Name header lit (aria-sort=ascending, others none) — the indicator never
 *     lies about the row order (UAT 2026-07-06). First click on an INACTIVE
 *     header applies its pinned default (sessions/lastSession -> descending,
 *     most first); a click on the ACTIVE header — including the very first
 *     click on the boot-default Name — flips direction.
 *
 * METHOD: drive the REAL header clicks + real dropdown, read the REAL rendered
 * #clientTableBody row order and the REAL control values. No source-text asserts.
 *
 * Read-only: EVALS assets/date-format.js + assets/overview.js into an isolated
 * jsdom window; writes no assets/* production file.
 *
 * Run: node tests/37-overview-sort.test.js
 * Exits 0 on full pass, 1 on any failure (RED until 37-15 lands the headers).
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

function buildOverviewEnv(opts) {
  opts = opts || {};
  var html = readAsset('index.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/index.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  win.matchMedia = function () {
    return { matches: false, media: '', addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {} };
  };
  try { win.localStorage.setItem('portfolioLang', opts.lang || 'en'); } catch (_) {}

  win.eval(readAsset('assets/date-format.js'));

  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  win.App = createAppStub({ localStorage: win.localStorage, t: function (k) { return k; } });
  win.PortfolioDB = createMockPortfolioDB({ clients: opts.clients || [], sessions: opts.sessions || [] });

  win.eval(readAsset('assets/overview.js'));

  return { dom: dom, win: win, handlers: captured };
}

async function boot(env) {
  for (var i = 0; i < env.handlers.length; i++) { await env.handlers[i](); }
  await settle();
}

function renderedClientNames(win) {
  var body = win.document.getElementById('clientTableBody');
  var rows = body ? body.querySelectorAll('tr.client-row') : [];
  return Array.prototype.map.call(rows, function (r) {
    var span = r.querySelector('.client-name span');
    return span ? span.textContent : '';
  });
}

function headerByKey(win, key) {
  return win.document.querySelector('thead th[data-sort-key="' + key + '"]');
}
function allSortKeys(win) {
  return Array.prototype.map.call(win.document.querySelectorAll('thead th'), function (th) {
    return th.getAttribute('data-sort-key');
  }).filter(Boolean);
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// Distinct orderings per sort key:
//   name asc          : Alice, Bob, Carol
//   sessions desc     : Alice(3), Carol(2), Bob(1)
//   lastSession desc  : Bob(2026-06-01), Alice(2026-05-01), Carol(2026-04-01)
// Clients are deliberately inserted OUT of name order (Carol, Alice, Bob) so
// the boot-render assertion proves the default sort actually ran — a raw
// IDB-order paint would fail it instead of passing by coincidence.
function sortSeed() {
  return {
    clients: [
      { id: 3, name: 'Carol Clark' },
      { id: 1, name: 'Alice Adams' },
      { id: 2, name: 'Bob Brown' },
    ],
    sessions: [
      { id: 11, clientId: 1, date: '2026-01-01', issues: [] },
      { id: 12, clientId: 1, date: '2026-03-01', issues: [] },
      { id: 13, clientId: 1, date: '2026-05-01', issues: [] },
      { id: 21, clientId: 2, date: '2026-06-01', issues: [] },
      { id: 31, clientId: 3, date: '2026-02-01', issues: [] },
      { id: 32, clientId: 3, date: '2026-04-01', issues: [] },
    ],
  };
}

(async function () {
  // ─── 1. Sortable-header contract (structure) ──────────────────────────────
  await test('sortable headers: th.sortable[data-sort-key] for name/sessions/lastSession with aria-sort + span.sort-arrow; Type + Actions NOT sortable; #clientSortSelect present', async function () {
    var env = buildOverviewEnv(sortSeed());
    await boot(env);
    var win = env.win;

    ['name', 'sessions', 'lastSession'].forEach(function (key) {
      var th = headerByKey(win, key);
      assert.ok(th, 'a sortable header th[data-sort-key="' + key + '"] must exist');
      assert.ok(th.classList.contains('sortable'), 'the "' + key + '" header must carry the .sortable class');
      assert.ok(th.hasAttribute('aria-sort'), 'the "' + key + '" header must carry an aria-sort attribute');
      assert.ok(th.querySelector('span.sort-arrow'), 'the "' + key + '" header must contain a child span.sort-arrow');
      // The slot alone is invisible — buildSortArrows() must have INJECTED the
      // chevron svg into it, or the sorted state renders with no icon at all
      // (UAT 2026-07-06: an empty slot passed this test while looking broken).
      assert.ok(th.querySelector('span.sort-arrow svg path'),
        'the "' + key + '" header sort-arrow slot must contain the injected chevron svg (buildSortArrows output)');
    });

    assert.deepStrictEqual(allSortKeys(win), ['name', 'sessions', 'lastSession'],
      'exactly the Name/Sessions/Last-Session columns are sortable (Type + Actions carry NO data-sort-key); got ' + JSON.stringify(allSortKeys(win)));
    assert.ok(win.document.getElementById('clientSortSelect'), 'the #clientSortSelect dropdown must stay present alongside the header-sort');
    env.dom.window.close();
  });

  // ─── 2. Click Sessions header → dropdown sync + aria-sort + row order ─────
  await test('clicking th[data-sort-key="sessions"] sets #clientSortSelect=sessions, aria-sort descending, others none, and orders rows by most sessions first', async function () {
    var env = buildOverviewEnv(sortSeed());
    await boot(env);
    var win = env.win;

    var th = headerByKey(win, 'sessions');
    assert.ok(th, 'the Sessions sortable header must exist to click');
    th.click();
    await settle();

    assert.strictEqual(win.document.getElementById('clientSortSelect').value, 'sessions',
      'clicking the Sessions header must set #clientSortSelect.value to "sessions" (two-way sync)');
    assert.strictEqual(th.getAttribute('aria-sort'), 'descending',
      'first click on Sessions must sort descending (most first) per the pinned default');
    assert.strictEqual(headerByKey(win, 'name').getAttribute('aria-sort'), 'none',
      'the Name header aria-sort must reset to none when Sessions becomes the active sort');
    assert.strictEqual(headerByKey(win, 'lastSession').getAttribute('aria-sort'), 'none',
      'the Last-Session header aria-sort must reset to none when Sessions becomes the active sort');

    assert.strictEqual(renderedClientNames(win)[0], 'Alice Adams',
      'sessions-descending must put the client with the MOST sessions (Alice, 3) on top; got ' + JSON.stringify(renderedClientNames(win)));
    env.dom.window.close();
  });

  // ─── 3. Repeat click flips direction + reverses order ─────────────────────
  await test('clicking the SAME Sessions header again flips descending->ascending and reverses the row order (fewest first)', async function () {
    var env = buildOverviewEnv(sortSeed());
    await boot(env);
    var win = env.win;

    var th = headerByKey(win, 'sessions');
    assert.ok(th, 'the Sessions sortable header must exist to click twice');
    th.click(); // descending
    await settle();
    th.click(); // ascending
    await settle();

    assert.strictEqual(th.getAttribute('aria-sort'), 'ascending',
      'a repeat click on the active header must flip the direction descending->ascending');
    assert.strictEqual(renderedClientNames(win)[0], 'Bob Brown',
      'sessions-ascending must put the client with the FEWEST sessions (Bob, 1) on top; got ' + JSON.stringify(renderedClientNames(win)));
    env.dom.window.close();
  });

  // ─── 4. Dropdown drives the SAME state (dropdown -> header sync) ──────────
  await test('setting #clientSortSelect=lastSession + change updates the Last-Session header aria-sort, resets others, and reorders by most recent (dropdown drives the same state)', async function () {
    var env = buildOverviewEnv(sortSeed());
    await boot(env);
    var win = env.win;

    var lastTh = headerByKey(win, 'lastSession');
    assert.ok(lastTh, 'the Last-Session sortable header must exist for the dropdown->header sync');

    var sel = win.document.getElementById('clientSortSelect');
    sel.value = 'lastSession';
    sel.dispatchEvent(new win.Event('change', { bubbles: true }));
    await settle();

    assert.strictEqual(lastTh.getAttribute('aria-sort'), 'descending',
      'choosing lastSession in the dropdown must set the Last-Session header aria-sort directional (most recent first)');
    assert.strictEqual(headerByKey(win, 'name').getAttribute('aria-sort'), 'none',
      'the Name header aria-sort must reset to none when the dropdown selects lastSession');
    assert.strictEqual(headerByKey(win, 'sessions').getAttribute('aria-sort'), 'none',
      'the Sessions header aria-sort must reset to none when the dropdown selects lastSession');

    assert.strictEqual(renderedClientNames(win)[0], 'Bob Brown',
      'lastSession-descending must put the most-recent client (Bob, 2026-06-01) on top; got ' + JSON.stringify(renderedClientNames(win)));
    env.dom.window.close();
  });

  // ─── 5. Boot render is REALLY sorted name-ascending (indicator never lies) ─
  await test('boot renders rows name-ascending with the Name header aria-sort=ascending and the others none — WITHOUT any click (seed inserted out of order)', async function () {
    var env = buildOverviewEnv(sortSeed());
    await boot(env);
    var win = env.win;

    assert.deepStrictEqual(renderedClientNames(win), ['Alice Adams', 'Bob Brown', 'Carol Clark'],
      'the default render must be name-ascending, not raw insertion order (Carol, Alice, Bob); got ' + JSON.stringify(renderedClientNames(win)));
    assert.strictEqual(headerByKey(win, 'name').getAttribute('aria-sort'), 'ascending',
      'the Name header must boot lit as the active ascending sort');
    assert.strictEqual(headerByKey(win, 'sessions').getAttribute('aria-sort'), 'none',
      'the Sessions header must boot with aria-sort none');
    assert.strictEqual(headerByKey(win, 'lastSession').getAttribute('aria-sort'), 'none',
      'the Last-Session header must boot with aria-sort none');
    env.dom.window.close();
  });

  // ─── 6. First click on the boot-active Name header FLIPS to descending ────
  await test('clicking the boot-active Name header flips it to descending and reverses the rows (no swallowed first click)', async function () {
    var env = buildOverviewEnv(sortSeed());
    await boot(env);
    var win = env.win;

    var nameTh = headerByKey(win, 'name');
    assert.ok(nameTh, 'the Name sortable header must exist to click');
    nameTh.click();
    await settle();

    assert.strictEqual(win.document.getElementById('clientSortSelect').value, 'name',
      'the dropdown must stay on "name" when the Name header direction flips');
    assert.strictEqual(nameTh.getAttribute('aria-sort'), 'descending',
      'the boot state IS name-ascending, so the FIRST click on Name must flip to descending (UAT 2026-07-06: the old guard swallowed this click)');
    assert.deepStrictEqual(renderedClientNames(win), ['Carol Clark', 'Bob Brown', 'Alice Adams'],
      'name-descending must order rows Carol, Bob, Alice; got ' + JSON.stringify(renderedClientNames(win)));
    env.dom.window.close();
  });

  // ─── count guard (vacuous-skip trap) ──────────────────────────────────────
  var EXPECTED_COUNT = 6;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — a case was silently skipped.');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 37-10 overview header-sort <-> dropdown sync tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (err) {
  console.error('FATAL test harness error:', err && err.stack || err);
  process.exit(1);
});
