/**
 * tests/35-demo-seed.test.js — Phase 35 Plan 02 Task 1.
 *
 * WAVE-0 RED GATE for the demo **seed refresh** (DEMO-05 / DEMO-06 / DEMO-07).
 *
 * WHAT THIS PINS (and why every case is RED today):
 *   assets/demo-seed-data.json currently ships 7 clients / 11 sessions with
 *   ZERO `isHeartShield` sessions, hardcoded absolute `date` strings, and NO
 *   per-session `daysAgo` offset. The 35-04 seed-refresh rewrites the JSON to
 *   (a) tell a Heart-Shield removal arc on one client, (b) carry a relative
 *   `daysAgo` integer on every session so the dates self-freshen, and (c)
 *   conform to the current db.js v6 schema. It also exposes the date-transform
 *   seam `window.__demoSeedHelpers.applyRelativeDates(sessions, now)` in
 *   demo-seed.js BEFORE its demo-mode early-return so this test (and the seed
 *   itself) can reach it without entering demo mode.
 *
 *   This file asserts the DESIRED post-35-04 end state against the live seed on
 *   disk + the REAL overview.js render path, so it FAILS now and goes GREEN with
 *   no edits once 35-04 lands.
 *
 * FALSIFIABILITY / anti-vacuous-green (Pitfall 4):
 *   - DEMO-05 finds the arc client in the live JSON (RED: none exist today) and
 *     renders its row through the REAL renderClientRows, asserting the
 *     `.heart-badge.heart-badge-removed` node the `.some()` badge path emits.
 *   - DEMO-06 requires a real `daysAgo` on every session AND drives the REAL
 *     overview.js countSessionsThisMonth through the 35-04 seam at BOTH month
 *     edges (local-noon fixtures, Pitfall 5).
 *   - DEMO-07 asserts the schema union / sessionType enum / issues[] shape /
 *     legacy-field absence over the live JSON.
 *   - A count guard asserts every case actually executed (no silent skip).
 *
 * Read-only: reads assets/demo-seed-data.json + EVALs assets/overview.js and
 * assets/demo-seed.js into isolated jsdom windows; writes no assets/*.
 *
 * Run: node tests/35-demo-seed.test.js
 * Exits 0 on full pass, 1 on any failure. RED (non-zero) is EXPECTED at Wave 0.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

// The seed as it ships on disk — the single source of truth both 35-04 and the
// live demo read. We assert against THIS, never a hand-built fixture.
function loadSeed() {
  return JSON.parse(readAsset('assets/demo-seed-data.json'));
}

// db.js v6 session schema — the allowed key union (RESEARCH "Current Seed
// Schema"). A session that adds a key outside this set, or reintroduces a legacy
// field, fails DEMO-07.
var ALLOWED_SESSION_KEYS = {
  clientId: true, date: true, daysAgo: true, sessionType: true, issues: true,
  trappedEmotions: true, insights: true, limitingBeliefs: true, additionalTech: true,
  customerSummary: true, comments: true, isHeartShield: true, shieldRemoved: true,
  createdAt: true, updatedAt: true, id: true,
};
var ALLOWED_ISSUE_KEYS = { name: true, before: true, after: true };
var ALLOWED_SESSION_TYPES = { clinic: true, online: true, other: true };
var LEGACY_KEYS = ['heartWallCleared', 'heartWall'];

// Chronological comparator mirroring overview.js renderClientRows (date asc here
// so the LAST element is the most-recent session of the arc).
function chronoAsc(a, b) {
  var cmp = String(a.date || '').localeCompare(String(b.date || ''));
  if (cmp !== 0) return cmp;
  var ca = new Date(a.createdAt || 0).getTime();
  var cb = new Date(b.createdAt || 0).getTime();
  if (ca !== cb) return ca - cb;
  return (a.id || 0) - (b.id || 0);
}

// Find a client that owns a Heart-Shield REMOVAL ARC: >=2 isHeartShield sessions,
// MIXED shieldRemoved across them, and the chronologically-final one removed.
// Returns { client, sessions, shieldSessions } or null (null TODAY → DEMO-05 RED).
function findHeartShieldArc(seed) {
  var byClient = new Map();
  (seed.sessions || []).forEach(function (s) {
    if (!byClient.has(s.clientId)) byClient.set(s.clientId, []);
    byClient.get(s.clientId).push(s);
  });
  var clients = seed.clients || [];
  for (var i = 0; i < clients.length; i++) {
    var client = clients[i];
    var sessions = byClient.get(client.id) || [];
    var shield = sessions.filter(function (s) { return s.isHeartShield === true; });
    if (shield.length < 2) continue;
    var someRemoved = shield.some(function (s) { return s.shieldRemoved === true; });
    var someNotRemoved = shield.some(function (s) { return s.shieldRemoved !== true; });
    if (!someRemoved || !someNotRemoved) continue; // must be MIXED
    var sortedShield = shield.slice().sort(chronoAsc);
    var finalShield = sortedShield[sortedShield.length - 1];
    if (finalShield.shieldRemoved !== true) continue; // final must be removed
    return { client: client, sessions: sessions, shieldSessions: shield };
  }
  return null;
}

// jsdom env with index.html parsed + the REAL overview.js evaled (top-level
// renderClientRows / countSessionsThisMonth attach to the window). Mirrors
// tests/31-overview-render-hardening.test.js exactly — no DOMContentLoaded fired.
function buildOverviewEnv() {
  var dom = new JSDOM(readAsset('index.html'), {
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
  // overview.js now parses calendar dates via window.DateFormat.parseLocal
  // (Plan 37-05 UTC-parse sweep), so the engine must be present first — mirrors
  // the D-21 date-format injection in tests/_helpers/jsdom-pdf-env.js.
  win.eval(readAsset('assets/date-format.js'));
  win.eval(readAsset('assets/overview.js'));
  win.App = createAppStub({ t: function (k) { return k; } });
  if (typeof win.renderClientRows !== 'function') {
    throw new Error('assets/overview.js did not expose a top-level renderClientRows');
  }
  return { dom: dom, win: win };
}

// jsdom env that evals overview.js (countSessionsThisMonth) + demo-seed.js into a
// NON-demo window (window.name !== 'demo-mode'), so demo-seed.js takes its early
// return and the ONLY thing under test is the 35-04 `__demoSeedHelpers` seam it
// exposes BEFORE that return. Today the seam is absent → DEMO-06 RED.
function buildSeamEnv() {
  var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
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
  win.name = ''; // NOT demo-mode — demo-seed.js returns early before any indexedDB touch
  // countSessionsThisMonth in overview.js now depends on window.DateFormat
  // (Plan 37-05); provide the engine before evaling overview.js.
  win.eval(readAsset('assets/date-format.js'));
  win.eval(readAsset('assets/overview.js'));
  win.eval(readAsset('assets/demo-seed.js'));
  return { dom: dom, win: win };
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ─── DEMO-05: Heart-Shield removal arc + REAL render (RED until 35-04) ────────
test('DEMO-05: the seed tells a Heart-Shield removal arc and renderClientRows emits a .heart-badge.heart-badge-removed', function () {
  var seed = loadSeed();
  var arc = findHeartShieldArc(seed);
  assert.ok(arc,
    'the seed must contain a client owning >=2 isHeartShield sessions with MIXED shieldRemoved and the chronologically-final one removed (zero isHeartShield ships today → 35-04)');

  // Per-session arc shape: at least one active (not removed) and one removed.
  var activeCount = arc.shieldSessions.filter(function (s) { return s.shieldRemoved !== true; }).length;
  var removedCount = arc.shieldSessions.filter(function (s) { return s.shieldRemoved === true; }).length;
  assert.ok(activeCount >= 1, 'the arc must include >=1 active (shield not yet removed) session');
  assert.ok(removedCount >= 1, 'the arc must include >=1 removed session');

  // Render the arc client's row through the REAL renderClientRows. The badge
  // uses heartShieldSessions.some(shieldRemoved === true) (overview.js:395), so
  // ANY removed session in the arc → the REMOVED (✅) badge variant.
  var env = buildOverviewEnv();
  var win = env.win;
  var sessionsByClient = new Map([[arc.client.id, arc.sessions]]);
  win.renderClientRows([arc.client], sessionsByClient);

  var tableBody = win.document.getElementById('clientTableBody');
  var removedBadge = tableBody.querySelector('.heart-badge.heart-badge-removed');
  assert.ok(removedBadge,
    'the rendered arc row must carry a .heart-badge.heart-badge-removed (final session removed → .some() removed-badge path)');

  env.dom.window.close();
});

// ─── DEMO-06: relative dates self-freshen at BOTH month edges (RED until 35-04) ─
test('DEMO-06: every session has an integer daysAgo (one === 0) and the seam keeps >=1 session in-month at both month edges', function () {
  var seed = loadSeed();
  var sessions = seed.sessions || [];
  assert.ok(sessions.length > 0, 'the seed must contain sessions');

  // Every session carries an integer daysAgo, and at least one is "today" (0).
  var allHaveDaysAgo = sessions.every(function (s) {
    return typeof s.daysAgo === 'number' && Number.isInteger(s.daysAgo);
  });
  assert.ok(allHaveDaysAgo,
    'every seed session must carry an integer daysAgo (relative-date model — the JSON ships absolute date / no daysAgo today → 35-04)');
  var hasToday = sessions.some(function (s) { return s.daysAgo === 0; });
  assert.ok(hasToday, 'at least one session must have daysAgo === 0 (a "today" session anchors the current month at both edges)');

  // The 35-04 transform seam, reachable WITHOUT entering demo mode.
  var env = buildSeamEnv();
  var win = env.win;
  var helpers = win.__demoSeedHelpers;
  assert.ok(helpers && typeof helpers.applyRelativeDates === 'function',
    'demo-seed.js must expose window.__demoSeedHelpers.applyRelativeDates(sessions, now) BEFORE its demo-mode early-return (35-04 seam)');
  assert.strictEqual(typeof win.countSessionsThisMonth, 'function',
    'overview.js must expose countSessionsThisMonth for the month-edge assertion');

  // Anchor both fixtures at LOCAL NOON to dodge the timezone month-edge (Pitfall 5).
  var now = new Date();
  var firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0);
  var lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12, 0, 0);
  [['1st-of-month', firstOfMonth], ['last-of-month', lastOfMonth]].forEach(function (pair) {
    var copy = JSON.parse(JSON.stringify(sessions));
    var transformed = helpers.applyRelativeDates(copy, pair[1]);
    var inMonth = win.countSessionsThisMonth(transformed);
    assert.ok(inMonth >= 1,
      'with now=' + pair[0] + ', applyRelativeDates must yield >=1 session in the current month (got ' + inMonth + ')');
  });

  env.dom.window.close();
});

// ─── DEMO-07: schema conformance to db.js v6 (RED until 35-04) ────────────────
test('DEMO-07: every seed session conforms to the v6 schema (key union, sessionType enum, issues[] shape, no legacy fields, has daysAgo)', function () {
  var seed = loadSeed();
  var sessions = seed.sessions || [];
  assert.ok(sessions.length > 0, 'the seed must contain sessions');

  sessions.forEach(function (s, idx) {
    Object.keys(s).forEach(function (k) {
      assert.ok(ALLOWED_SESSION_KEYS[k],
        'session[' + idx + '] has key "' + k + '" outside the allowed v6 union');
    });
    LEGACY_KEYS.forEach(function (legacy) {
      assert.ok(!Object.prototype.hasOwnProperty.call(s, legacy),
        'session[' + idx + '] must not carry the legacy key "' + legacy + '"');
    });
    assert.ok(ALLOWED_SESSION_TYPES[s.sessionType],
      'session[' + idx + '] sessionType "' + s.sessionType + '" must be one of clinic|online|other');
    assert.ok(Array.isArray(s.issues), 'session[' + idx + '] issues must be an array');
    s.issues.forEach(function (issue, j) {
      Object.keys(issue).forEach(function (ik) {
        assert.ok(ALLOWED_ISSUE_KEYS[ik],
          'session[' + idx + '].issues[' + j + '] has key "' + ik + '" outside {name,before,after}');
      });
    });
    // Computed-date model: a relative daysAgo is REQUIRED (the JSON ships an
    // absolute date with no daysAgo today → RED).
    assert.ok(typeof s.daysAgo === 'number' && Number.isInteger(s.daysAgo),
      'session[' + idx + '] must carry an integer daysAgo (computed-date model), not only a hardcoded absolute date');
  });
});

// ─── count guard (no case silently skipped) ──────────────────────────────────
var EXPECTED_COUNT = 3;
if (passed + failed !== EXPECTED_COUNT) {
  console.error('\nGUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
    (passed + failed) + ' ran — a case was silently skipped.');
  process.exit(1);
}

console.log('');
console.log('Plan 35-02 demo-seed RED gate — ' + passed + ' passed, ' + failed + ' failed');
console.log('(RED/non-zero is EXPECTED at this wave: the seed has no Heart-Shield arc / no daysAgo / no seam yet.)');
process.exit(failed === 0 ? 0 : 1);
