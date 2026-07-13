/**
 * tests/45-read-mode-render.test.js — READ-MODE RENDERED-NOTE OVERLAY (RTXT-06,
 * Phase 45 Plan 04 Task 1).
 *
 * WHAT THIS LOCKS (test-FIRST, RED before the setReadMode change lands):
 *   Entering read mode on a loaded past session must render each of the 7 note
 *   `.session-textarea` fields as a `.note-rendered` overlay whose innerHTML is
 *   produced EXCLUSIVELY by window.MdRender.render (escape-first), hide the
 *   source textarea, and — on toggling back to edit mode — tear the overlay down
 *   and restore the editable textarea with its value intact (the textarea stays
 *   the single source of truth). When window.MdRender is unavailable the overlay
 *   falls back to textContent (literal markdown), NEVER raw innerHTML.
 *
 * APPROACH (mirrors tests/30-read-mode.test.js — the proven real-page boot): load
 * add-session.html into jsdom on a SEEDED ?sessionId= URL, capture-and-await the
 * async DOMContentLoaded handler, seed PortfolioDB with a client + a session whose
 * note fields carry markdown, and let the boot path enter read mode (it calls
 * setReadMode(true) after populateSession). Then assert OBSERVABLE DOM only:
 * the rendered overlay's innerHTML, the textarea's hidden state, the torn-down
 * overlay after clicking #editSessionBtn (setReadMode(false)).
 *
 * The positive cases EVAL assets/md-render.js so window.MdRender.render is real;
 * the fallback case deliberately does NOT, proving the textContent branch.
 *
 * F-A (vacuous-green trap): async boot handler — capture-and-await + a HARD
 * read-mode precondition + an end-of-file count guard.
 *
 * Read-only: EVALS assets/* into an isolated jsdom window; writes no assets/*.
 *
 * Run: node tests/45-read-mode-render.test.js
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

var SEEDED_SESSION_ID = 71;
var SEEDED_CLIENT_ID = 12;

// Build a booted add-session page for a seeded session. `trapped` seeds the
// trappedEmotions note field's markdown; `withMdRender` toggles evaluating
// assets/md-render.js (the fallback case omits it so window.MdRender is undefined).
function buildEnv(opts) {
  opts = opts || {};
  var trapped = opts.trapped != null ? opts.trapped : '**bold**\n- a\n- b';
  var withMdRender = opts.withMdRender !== false;

  var html = readAsset('add-session.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/add-session.html?sessionId=' + SEEDED_SESSION_ID,
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

  win.I18N_DEFAULT = 'en';
  win.eval(readAsset('assets/app.js'));
  var realApp = win.App;

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

  win.PortfolioDB = createMockPortfolioDB({
    clients: [{
      id: SEEDED_CLIENT_ID, name: 'Maya Cohen',
      firstName: 'Maya', lastName: 'Cohen', email: 'maya@example.com', type: 'adult',
    }],
    sessions: [{
      id: SEEDED_SESSION_ID, clientId: SEEDED_CLIENT_ID,
      date: '2026-05-20', sessionType: 'clinic',
      trappedEmotions: trapped,
      comments: 'plain comment',
      issues: [],
    }],
  });

  if (withMdRender) win.eval(readAsset('assets/md-render.js'));
  win.eval(readAsset('assets/export-modal.js')); // BEFORE add-session.js (__exportModalInit)
  win.eval(readAsset('assets/date-format.js'));  // boot reads window.DateFormat
  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0] };
}

async function boot(env) { await env.domHandler(); await settle(); }

function assertReadModeEntered(win) {
  assert.strictEqual(win.document.body.classList.contains('read-mode'), true,
    'HARD PRECONDITION FAILED: body.read-mode is not set — read-mode entry never happened; ' +
    'every downstream overlay assertion would otherwise pass vacuously.');
}
function isHidden(el) { return el.classList.contains('is-hidden'); }

// The rendered overlay sibling for a given note textarea id.
function overlayFor(win, id) {
  var ta = win.document.getElementById(id);
  return { ta: ta, overlay: ta ? ta.parentNode.querySelector('.note-rendered') : null };
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // Case 1: read mode renders bold + list into a visible overlay and hides the textarea.
  await test('entering read mode on "**bold**\\n- a\\n- b" renders a visible .note-rendered overlay with <strong> + <ul>, and hides the source textarea', async function () {
    var env = buildEnv({ trapped: '**bold**\n- a\n- b' });
    var win = env.win;
    await boot(env);
    assertReadModeEntered(win);

    var pair = overlayFor(win, 'trappedEmotions');
    assert.ok(pair.overlay, 'a .note-rendered overlay must exist as a sibling of the trappedEmotions textarea');
    assert.strictEqual(isHidden(pair.overlay), false, 'the overlay must be visible in read mode');
    assert.ok(/<strong>bold<\/strong>/.test(pair.overlay.innerHTML),
      'the overlay must render **bold** as <strong>bold</strong>, not literal ** (got: ' + pair.overlay.innerHTML + ')');
    assert.ok(/<ul>/.test(pair.overlay.innerHTML),
      'the overlay must render the "- a / - b" lines as a <ul>, not literal - tokens');
    assert.strictEqual(isHidden(pair.ta), true, 'the source textarea must be hidden while the overlay shows');

    env.dom.window.close();
  });

  // Case 2: a <script> note value renders inert (escape-first via MdRender).
  await test('a note value of "<script>alert(1)</script>" produces NO live <script> element in the overlay (escape-first)', async function () {
    var env = buildEnv({ trapped: '<script>alert(1)</script>' });
    var win = env.win;
    await boot(env);
    assertReadModeEntered(win);

    var pair = overlayFor(win, 'trappedEmotions');
    assert.ok(pair.overlay, 'the overlay must exist');
    assert.strictEqual(pair.overlay.querySelector('script'), null,
      'the overlay must contain NO live <script> element — MdRender escapes HTML before structural rules');

    env.dom.window.close();
  });

  // Case 3: toggling to edit mode tears down the overlay and restores the editable textarea + its value.
  await test('clicking #editSessionBtn (edit mode) tears down the overlay and restores the visible, editable textarea with its original value', async function () {
    var env = buildEnv({ trapped: '**keep**' });
    var win = env.win;
    await boot(env);
    assertReadModeEntered(win);

    var editBtn = win.document.getElementById('editSessionBtn');
    editBtn.click();
    await settle();

    assert.strictEqual(win.document.body.classList.contains('read-mode'), false,
      'clicking edit must leave read mode');
    var pair = overlayFor(win, 'trappedEmotions');
    // Overlay torn down: either removed OR hidden AND empty (no rendered content leaking into edit mode).
    if (pair.overlay) {
      assert.strictEqual(isHidden(pair.overlay), true, 'the overlay must be hidden in edit mode');
      assert.strictEqual(pair.overlay.innerHTML, '', 'the overlay must be emptied in edit mode');
    }
    assert.strictEqual(isHidden(pair.ta), false, 'the textarea must be visible again in edit mode');
    assert.strictEqual(pair.ta.readOnly, false, 'the textarea must be editable again in edit mode');
    assert.strictEqual(pair.ta.value, '**keep**', 'the textarea value must be intact (single source of truth)');

    env.dom.window.close();
  });

  // Case 4: fallback — no window.MdRender → textContent (literal), never raw innerHTML.
  await test('with window.MdRender undefined, the overlay uses textContent (literal markdown) and produces NO <strong>', async function () {
    var env = buildEnv({ trapped: '**bold**', withMdRender: false });
    var win = env.win;
    assert.strictEqual(typeof win.MdRender, 'undefined', 'precondition: MdRender is not loaded in this env');
    await boot(env);
    assertReadModeEntered(win);

    var pair = overlayFor(win, 'trappedEmotions');
    assert.ok(pair.overlay, 'the overlay must exist even in the fallback');
    assert.strictEqual(pair.overlay.querySelector('strong'), null,
      'the fallback must NOT produce a <strong> element (no markdown rendering without MdRender)');
    assert.ok(pair.overlay.textContent.indexOf('**bold**') !== -1,
      'the fallback must show the literal markdown via textContent (got: ' + pair.overlay.textContent + ')');

    env.dom.window.close();
  });

  // Case 5: SOURCE ASSERTION — overlay writes innerHTML only from MdRender.render, with a textContent fallback.
  await test('SOURCE: add-session.js overlay writes innerHTML only from MdRender.render(...) and has a textContent fallback branch', function () {
    var src = readAsset('assets/add-session.js');
    // The overlay's innerHTML must be fed by MdRender.render (escape-first).
    assert.ok(/overlay\.innerHTML\s*=\s*window\.MdRender\.render\(/.test(src),
      'the read-mode overlay must assign overlay.innerHTML from window.MdRender.render(...)');
    // A textContent fallback branch must exist for the MdRender-absent path.
    assert.ok(/overlay\.textContent\s*=/.test(src) && /window\.MdRender/.test(src),
      'the overlay must have an overlay.textContent fallback guarded on window.MdRender availability');
    // Guard (defence against a weakened repoint): the overlay must NEVER assign
    // innerHTML from a raw string / template literal — only from MdRender.render.
    assert.ok(!/overlay\.innerHTML\s*=\s*[`"']/.test(src),
      'the overlay must not assign innerHTML from a raw string/template literal');
  });

  // Case 6: SOURCE ASSERTION — app.css has a scoped .note-rendered register + the .export-preview ol indent rule.
  await test('SOURCE: app.css defines .note-rendered, scopes note headings under .note-rendered, and adds a .export-preview ol indent rule', function () {
    var css = readAsset('assets/app.css');
    assert.ok(/\.note-rendered\b/.test(css), 'app.css must define a .note-rendered selector');
    // Note-heading rules must be scoped under .note-rendered (never bare h1/h2/h3 that bleed globally).
    assert.ok(/\.note-rendered\s+h1\b/.test(css) || /\.note-rendered\s+h[123]\b/.test(css),
      'note-heading styles must be scoped under .note-rendered (e.g. ".note-rendered h1")');
    // The new ordered-list indent rule for the Step-2 export preview (NOTE 5).
    assert.ok(/\.export-preview\s+ol\b/.test(css),
      'app.css must add a ".export-preview ol" indent rule to match the existing ".export-preview ul"');
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────────
  var EXPECTED_COUNT = 6;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — a case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 45-04 read-mode-render tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (e) { console.error(e); process.exit(1); });
