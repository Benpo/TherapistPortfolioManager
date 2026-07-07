/**
 * tests/30-client-spotlight.test.js — add-session CLIENT DROPDOWN / SPOTLIGHT /
 * TITLE characterization (GAP-04, region B8, TEST-03, D-08/D-09/D-12).
 *
 * ROOT CAUSE THIS CLOSES: the client-wiring region of add-session.js
 * (loadClients / populateSpotlight / updateSessionTitle, lines 1865-2094) is a
 * Phase-31 refactor target. Only renderSpotlightSessionInfo was pinned (by
 * tests/24-06-spotlight-session-info.test.js, KEPT). Unguarded before this test:
 *   1. loadClients dropdown population: placeholder + __new__ + the clients
 *      NAME-SORTED (localeCompare) + the ?clientId pre-selected.
 *   2. populateSpotlight: the client name/age/photo/notes rendered from the
 *      seeded record.
 *   3. updateSessionTitle: the .section-title text + document.title — fires ONLY
 *      on the ?sessionId editing branch (add-session.js:1808), so it is asserted
 *      in a SEPARATE ?sessionId case.
 *
 * THE GUARD (D-09 jsdom real-page): boots the REAL add-session.js into jsdom on
 * a ?clientId= URL (Case 1) and a ?sessionId= URL (Case 2), driving the real
 * DOMContentLoaded handler, then asserts OBSERVABLE DOM / selection state only
 * (D-08) — never that loadClients/populateSpotlight/updateSessionTitle were
 * "called".
 *
 * FALSIFIABLE SORT: the clients are seeded OUT OF alphabetical order
 * (Zoe / Adi / Maya), so a dropped or broken localeCompare sort makes the
 * dropdown order assertion FAIL. Mutation-kill recorded in the plan SUMMARY.
 *
 * F-A (vacuous-green trap): async DOMContentLoaded handler — guarded by
 * capture-and-await + an end-of-file count guard.
 *
 * Read-only: EVALS assets/* into an isolated jsdom window; writes no assets/*.
 *
 * Run: node tests/30-client-spotlight.test.js
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

// 1x1 transparent PNG data URL — a real photoData payload for the spotlight.
var PHOTO_DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Clients seeded DELIBERATELY out of alphabetical order so the localeCompare
// sort is falsifiable. Maya (id 3) carries photo + notes + age.
function seedClients() {
  return [
    { id: 1, name: 'Zoe Adler', age: 30 },
    { id: 2, name: 'Adi Berg', age: 25 },
    { id: 3, name: 'Maya Cohen', age: 40, notes: 'prefers morning sessions', photoData: PHOTO_DATA },
  ];
}
var ALPHA_NAMES = ['Adi Berg', 'Maya Cohen', 'Zoe Adler'];
var CLIENTID_CASE = 3; // Maya — the ?clientId target

var SEEDED_SESSION_ID = 200;

function buildEnv(search, seedOpts) {
  var html = readAsset('add-session.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/add-session.html' + (search || ''),
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

  // Eval app.js FIRST for the real App surface (severity pair → createIssueBlock).
  win.I18N_DEFAULT = 'en';
  win.eval(readAsset('assets/app.js'));
  var realApp = win.App;
  if (typeof realApp.createSeverityScale !== 'function' ||
      typeof realApp.getSeverityValue !== 'function') {
    throw new Error('assets/app.js did not expose the real severity pair');
  }

  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, o) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, o);
  };

  win.App = createAppStub({
    createSeverityScale: realApp.createSeverityScale,
    getSeverityValue: realApp.getSeverityValue,
  });

  var mockDb = createMockPortfolioDB(seedOpts);
  win.PortfolioDB = mockDb;

  win.eval(readAsset('assets/export-modal.js')); // export-modal.js BEFORE add-session.js (unconditional __exportModalInit boot call)
  win.eval(readAsset('assets/date-format.js')); // D-21: add-session.js boot reads window.DateFormat (todayLocalISO/parseLocal)
  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0], mockDb: mockDb };
}

async function boot(env) {
  await env.domHandler();
  await settle();
}

function isHidden(el) { return el.classList.contains('is-hidden'); }

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── Case 1 (?clientId): dropdown population + sort + preselect ──────────────
  await test('?clientId boot populates the client <select> as placeholder + __new__ + NAME-SORTED clients, with the ?clientId preselected', async function () {
    var env = buildEnv('?clientId=' + CLIENTID_CASE, { clients: seedClients(), sessions: [] });
    var win = env.win;
    await boot(env);

    var select = win.document.getElementById('clientSelect');
    var options = Array.prototype.slice.call(select.options);

    // placeholder (value "") + __new__ + 3 clients = 5 options.
    assert.strictEqual(options.length, 5,
      'dropdown must have placeholder + __new__ + 3 clients (got ' + options.length + ')');
    assert.strictEqual(options[0].value, '',
      'option 0 must be the empty-value placeholder');
    assert.strictEqual(options[1].value, '__new__',
      'option 1 must be the "__new__" create-client option');

    var clientNamesInOrder = options.slice(2).map(function (o) { return o.textContent; });
    assert.deepStrictEqual(clientNamesInOrder, ALPHA_NAMES,
      'clients must be NAME-SORTED (localeCompare), not in seed order — ' +
      'seeded [Zoe, Adi, Maya], expected [Adi, Maya, Zoe], got ' + JSON.stringify(clientNamesInOrder));

    assert.strictEqual(select.value, String(CLIENTID_CASE),
      'the ?clientId client must be preselected in the dropdown');

    env.dom.window.close();
  });

  // ─── Case 1 (?clientId): spotlight renders name / age / photo / notes ────────
  await test('?clientId boot renders the spotlight with the seeded client name, age, photo, and notes', async function () {
    var env = buildEnv('?clientId=' + CLIENTID_CASE, { clients: seedClients(), sessions: [] });
    var win = env.win;
    await boot(env);

    var spotlight = win.document.getElementById('clientSpotlight');
    assert.strictEqual(isHidden(spotlight), false,
      'the spotlight must be visible for a selected client');

    var nameEl = win.document.getElementById('clientSpotlightName');
    assert.strictEqual(nameEl.textContent, 'Maya Cohen',
      'the spotlight must render the selected client name');

    var ageEl = win.document.getElementById('clientSpotlightAge');
    assert.strictEqual(isHidden(ageEl), false, 'age must be shown when present');
    assert.ok(/\b40\b/.test(ageEl.textContent),
      'the spotlight age must reflect the seeded age (40) — got "' + ageEl.textContent + '"');

    var photo = win.document.getElementById('clientSpotlightPhoto');
    var placeholder = win.document.getElementById('clientSpotlightPlaceholder');
    assert.strictEqual(isHidden(photo), false, 'the photo must be shown when photoData is present');
    assert.strictEqual(photo.getAttribute('src'), PHOTO_DATA,
      'the spotlight photo src must be the seeded photoData');
    assert.strictEqual(isHidden(placeholder), true,
      'the initial-letter placeholder must be hidden when a photo is present');

    var notesEl = win.document.getElementById('clientSpotlightNotes');
    var notesText = win.document.getElementById('clientSpotlightNotesText');
    assert.strictEqual(isHidden(notesEl), false, 'notes must be shown when present');
    assert.strictEqual(notesText.textContent, 'prefers morning sessions',
      'the spotlight must render the seeded client notes verbatim');

    env.dom.window.close();
  });

  // ─── Case 2 (?sessionId): updateSessionTitle sets .section-title + title ─────
  await test('?sessionId boot sets the .section-title text AND document.title to the loaded client + date', async function () {
    var clients = seedClients();
    var env = buildEnv('?sessionId=' + SEEDED_SESSION_ID, {
      clients: clients,
      sessions: [{
        id: SEEDED_SESSION_ID,
        clientId: 3, // Maya
        date: '2026-04-10',
        sessionType: 'clinic',
        issues: [],
      }],
    });
    var win = env.win;
    await boot(env);

    // App.formatDate stub returns String(date), so the title is "Name • date".
    // Plan 38-11: updateSessionTitle now FSI-isolates BOTH runs (bidi scramble
    // fix), so each run is wrapped in U+2068…U+2069 — assert against the real
    // window.DateFormat.isolate helper rather than the bare composed string.
    var expected = win.DateFormat.isolate('Maya Cohen') + ' • ' + win.DateFormat.isolate('2026-04-10');
    var titleEl = win.document.querySelector('.section-title');
    assert.ok(titleEl, '.section-title element must exist');
    assert.strictEqual(titleEl.textContent, expected,
      'updateSessionTitle must set the .section-title to "<client> • <date>"');
    assert.strictEqual(win.document.title, expected,
      'updateSessionTitle must also set document.title to "<client> • <date>"');

    env.dom.window.close();
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────────
  var EXPECTED_COUNT = 3;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 30-07 client-spotlight tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (e) { console.error(e); process.exit(1); });
