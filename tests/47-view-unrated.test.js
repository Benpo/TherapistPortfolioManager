/**
 * tests/47-view-unrated.test.js — behavior lock for the "hide the empty rating
 * suffix" display change on the two read-only session views:
 *   - the Sessions History issues cell (assets/sessions.js)
 *   - the client-overview expanded-session row (assets/overview.js)
 *
 * RULE UNDER TEST:
 *   A fully-unrated topic (BOTH before AND after null/undefined) renders its
 *   NAME ONLY — no "(- -> -)" / "(-→-)" suffix. A partially-rated topic (exactly
 *   one numeric side) still renders the suffix with "-" for the unrated side. A
 *   fully-rated topic is unchanged. The client-overview averages already exclude
 *   null before/after and MUST stay untouched (unrated topics count toward the
 *   issue count but contribute to no average).
 *
 * APPROACH:
 *   - sessions.js: renderSessions is a CLOSURE inside the page's DOMContentLoaded
 *     handler, so we boot the REAL sessions.html into jsdom (mirroring
 *     31-sessions-render-hardening.test.js), seed one client + one session whose
 *     issues carry the three rating shapes, capture-and-await the async handler,
 *     then assert on the rendered .issue-line elements.
 *   - overview.js exposes top-level renderClientRows / getClientMetrics, so we
 *     eval it into a jsdom index.html window and call them directly (mirroring
 *     31-overview-render-hardening.test.js) — no async trap.
 *
 * FALSIFIABILITY: the seeded session forces one line per rating shape. The
 * fully-unrated line must be the bare topic name (no "(" character); lose the
 * name-only branch and it renders "Fear (- -> -)" → FAIL. The averages guard
 * seeds one fully-unrated + one fully-rated topic and asserts the reported
 * averages equal the fully-rated topic's own before/after — re-including the
 * unrated topic would drag the average and FAIL.
 *
 * Read-only: EVALS the assets into isolated jsdom windows; writes no assets/*.
 *
 * Run: node tests/47-view-unrated.test.js
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

// The three-topic fixture shared across both surfaces: a fully-unrated topic,
// a partially-rated topic (before only), and a fully-rated topic — in that
// order, so the rendered lines map 1:1 to the assertions below.
var THREE_TOPICS = [
  { name: 'Fear', before: null, after: null },   // fully unrated → name only
  { name: 'Anger', before: 5, after: null },      // partial → "(5 -> -)"
  { name: 'Grief', before: 8, after: 3 },         // full → "(8 -> 3)"
];

// ─── sessions.js harness (boot the real page) ────────────────────────────────
function buildSessionsEnv(seedOpts) {
  var html = readAsset('sessions.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/sessions.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };

  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  win.App = createAppStub({ t: function (k) { return k; } });
  win.PortfolioDB = createMockPortfolioDB(seedOpts);

  win.eval(readAsset('assets/sessions.js'));

  if (captured.length !== 1) {
    throw new Error('expected sessions.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0] };
}

// ─── overview.js harness (call top-level fns directly) ───────────────────────
function buildOverviewEnv() {
  var html = readAsset('index.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/index.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };

  win.eval(readAsset('assets/date-format.js'));
  win.eval(readAsset('assets/overview.js'));

  win.App = createAppStub({ t: function (k) { return k; } });

  if (typeof win.renderClientRows !== 'function') {
    throw new Error('assets/overview.js did not expose a top-level renderClientRows');
  }
  if (typeof win.getClientMetrics !== 'function') {
    throw new Error('assets/overview.js did not expose a top-level getClientMetrics');
  }
  return { dom: dom, win: win };
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── SESSIONS HISTORY issues cell ──────────────────────────────────────────
  await test('sessions.js: a fully-unrated topic renders its NAME ONLY (no "(" ); partial keeps "(5 -> -)"; full keeps "(8 -> 3)"', async function () {
    var env = buildSessionsEnv({
      clients: [{ id: 1, name: 'Maya Cohen' }],
      sessions: [{
        id: 500, clientId: 1, date: '2026-04-10', sessionType: 'clinic',
        issues: THREE_TOPICS,
      }],
    });
    var win = env.win;
    await env.domHandler();
    await settle();

    var tableBody = win.document.getElementById('sessionsTableBody');
    var lines = tableBody.querySelectorAll('.issues-cell .issue-line');
    assert.strictEqual(lines.length, 3, 'the seeded session must render exactly three issue lines');

    // fully-unrated → name only, no rating suffix
    assert.strictEqual(lines[0].textContent, 'Fear',
      'the fully-unrated topic must render its name only');
    assert.ok(lines[0].textContent.indexOf('(') === -1,
      'the fully-unrated topic line must contain no "(" character');

    // partial → keeps the suffix with "-" for the unrated side
    assert.ok(lines[1].textContent.indexOf('(5 -> -)') !== -1,
      'the partial topic line must contain "(5 -> -)"');

    // full → unchanged
    assert.ok(lines[2].textContent.indexOf('(8 -> 3)') !== -1,
      'the fully-rated topic line must contain "(8 -> 3)"');

    env.dom.window.close();
  });

  await test('sessions.js: the issues-cell render stays textContent-only (no innerHTML on the issue line)', function () {
    var src = readAsset('assets/sessions.js');
    assert.ok(/issueLine\.textContent\s*=/.test(src),
      'the issue line must be assigned via issueLine.textContent');
    assert.ok(!/issueLine\.innerHTML\s*=/.test(src),
      'the issue line must NEVER be assigned via innerHTML (render-hardening lock)');
  });

  // ─── CLIENT-OVERVIEW expanded-session row ──────────────────────────────────
  await test('overview.js: expanded-row issues string omits the suffix for a fully-unrated topic (name only); partial → "(5→-)"; full → "(8→3)"', function () {
    var env = buildOverviewEnv();
    var win = env.win;

    var clients = [{ id: 1, name: 'Maya Cohen' }];
    var sessionsByClient = new Map([[1, [{
      id: 500, clientId: 1, date: '2026-04-10', sessionType: 'clinic',
      issues: THREE_TOPICS,
    }]]]);

    win.renderClientRows(clients, sessionsByClient);

    var tableBody = win.document.getElementById('clientTableBody');
    var issuesEl = tableBody.querySelector('.session-issues');
    assert.ok(issuesEl, 'the expanded-session row must render a .session-issues element');

    var entries = issuesEl.textContent.split(', ');
    assert.strictEqual(entries.length, 3, 'the joined issues string must have three comma-separated entries');

    // fully-unrated → name only
    assert.strictEqual(entries[0], 'Fear',
      'the fully-unrated topic entry must be its name only');
    assert.ok(issuesEl.textContent.indexOf('(-→-)') === -1,
      'the joined string must contain no "(-→-)" empty suffix');
    assert.ok(issuesEl.textContent.indexOf('Fear (') === -1,
      'the fully-unrated topic must not be followed by a "(" suffix');

    // partial + full unchanged
    assert.strictEqual(entries[1], 'Anger (5→-)',
      'the partial topic entry must be "Anger (5→-)"');
    assert.strictEqual(entries[2], 'Grief (8→3)',
      'the fully-rated topic entry must be "Grief (8→3)"');

    env.dom.window.close();
  });

  await test('overview.js: averages exclude a fully-unrated topic — a fully-unrated + fully-rated fixture reports the fully-rated topic\'s own before/after', function () {
    var env = buildOverviewEnv();
    var win = env.win;

    // One session, two topics: one fully-unrated (contributes to neither
    // average) and one fully-rated (before 8 / after 3). The averages must equal
    // the fully-rated topic alone.
    var sessions = [{
      id: 500, clientId: 1, date: '2026-04-10', sessionType: 'clinic',
      issues: [
        { name: 'Fear', before: null, after: null },
        { name: 'Grief', before: 8, after: 3 },
      ],
    }];

    var metrics = win.getClientMetrics(sessions);
    assert.strictEqual(metrics.avgBefore, '8.0',
      'avgBefore must equal the fully-rated topic\'s before (unrated excluded)');
    assert.strictEqual(metrics.avgAfter, '3.0',
      'avgAfter must equal the fully-rated topic\'s after (unrated excluded)');
    assert.strictEqual(metrics.issues, 2,
      'both topics still count toward the issue count (only averages exclude unrated)');

    env.dom.window.close();
  });

  await test('overview.js: expanded row stays textContent-only and the averages loop null-guards are intact', function () {
    var src = readAsset('assets/overview.js');
    assert.ok(/issueText\.textContent\s*=/.test(src),
      'the expanded-row issues string must be assigned via issueText.textContent');
    assert.ok(!/issueText\.innerHTML\s*=/.test(src),
      'the expanded-row issues string must NEVER be assigned via innerHTML (render-hardening lock)');
    // The averages loop must keep excluding null/undefined before & after.
    assert.ok(/issue\.before !== null && issue\.before !== undefined/.test(src),
      'the averages loop must keep its before null/undefined guard');
    assert.ok(/issue\.after !== null && issue\.after !== undefined/.test(src),
      'the averages loop must keep its after null/undefined guard');
    assert.ok(/beforeCount \+= 1/.test(src) && /afterCount \+= 1/.test(src),
      'the averages loop must keep incrementing beforeCount/afterCount only inside the null-guards');
  });

  // ─── F-A count guard ────────────────────────────────────────────────────────
  var EXPECTED_COUNT = 5;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 47-10 view-unrated tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (e) { console.error(e); process.exit(1); });
