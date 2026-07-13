/**
 * tests/45-copy-share-verbatim.test.js — Phase 45 Plan 03 Task 2.
 *
 * RTXT-08 / D-10 LOCK: stored note markdown flows BYTE-FOR-BYTE (trimmed) into
 * BOTH consumed builders —
 *   - buildSessionMarkdown()          → the clipboard COPY payload
 *   - buildFilteredSessionMarkdown()  → editor.value → PDF / share / `.md` download
 * — with no marker injection and no transformation. This is the guarantee the
 * Plan 03 Task 1 classification must never break: it passes the document-section
 * labels as DATA into buildSessionPDF and injects NOTHING into the markdown, so
 * both builder outputs stay verbatim.
 *
 * NOTE 4 alignment: the builders embed `.value.trim()`, so "byte-for-byte" means
 * byte-for-byte with the TRIMMED value. The fixture is ALREADY trimmed (no
 * leading/trailing whitespace) so trimmed == stored and the two coincide.
 *
 * Falsifiable: if either builder re-wrapped, transformed, or marker-injected the
 * note body, the exact-substring assertion fails. (Reverting Task 1 to inject a
 * sentinel into the markdown would trip the sentinel assertion.)
 *
 * Drives the REAL builders under a live add-session form DOM via the
 * __exportModalTestHooks seam (the same seam Task 1 uses) — never source-slicing.
 *
 * Run: node tests/45-copy-share-verbatim.test.js   (exit 0 pass / 1 fail)
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

// Pre-trimmed (trimmed == stored) fixture with **bold**, an ordered 1./2. list, a
// `- ` bullet, a nested item (2-space indent), and a `## heading`.
var FIXTURE =
  '**bold** intro line\n' +
  '1. first ordered\n' +
  '2. second ordered\n' +
  '- top bullet\n' +
  '  - nested bullet\n' +
  '## heading typed inside a note';

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle() { for (var i = 0; i < 6; i++) { await flush(); } }

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

  win.eval(readAsset('assets/export-modal.js'));
  win.eval(readAsset('assets/date-format.js'));
  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' + captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0] };
}

// No control (excluding \t \n \r), zero-width, or bidi-override sentinel chars.
var SENTINEL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/;

async function main() {
  var env = buildAddSessionEnv();
  var win = env.win;
  await env.domHandler();
  await settle();

  // Populate a note field with the fixture (already trimmed → trimmed == stored).
  win.document.getElementById('trappedEmotions').value = FIXTURE;

  var hooks = win.__exportModalTestHooks;
  assert.ok(hooks && typeof hooks.buildSessionMarkdown === 'function',
    '__exportModalTestHooks.buildSessionMarkdown must be exposed (the COPY builder)');
  assert.ok(typeof hooks.buildFilteredSessionMarkdown === 'function',
    '__exportModalTestHooks.buildFilteredSessionMarkdown must be exposed (the editor.value builder)');

  var allKeys = ['trapped', 'insights', 'limitingBeliefs', 'additionalTech',
    'heartShield', 'heartShieldEmotions', 'issues', 'comments', 'nextSession'];
  var copyOut = hooks.buildSessionMarkdown();                     // clipboard copy path
  var editorOut = hooks.buildFilteredSessionMarkdown(allKeys);    // editor.value path

  env.dom.window.close();

  test('COPY builder (buildSessionMarkdown) embeds the note body BYTE-FOR-BYTE (trimmed == stored, NOTE 4)', function () {
    assert.ok(copyOut.indexOf(FIXTURE) !== -1,
      'the exact stored (trimmed) note content must appear verbatim in the copy output');
  });

  test('editor.value builder (buildFilteredSessionMarkdown) embeds the note body BYTE-FOR-BYTE', function () {
    assert.ok(editorOut.indexOf(FIXTURE) !== -1,
      'the exact stored (trimmed) note content must appear verbatim in the editor.value output (→ PDF/share/.md)');
  });

  test('every markdown construct survives verbatim in BOTH outputs (bold, ordered, bullet, nested, ## heading)', function () {
    ['**bold** intro line', '1. first ordered', '2. second ordered',
     '- top bullet', '  - nested bullet', '## heading typed inside a note'
    ].forEach(function (frag) {
      assert.ok(copyOut.indexOf(frag) !== -1, 'copy output must contain "' + frag + '" verbatim');
      assert.ok(editorOut.indexOf(frag) !== -1, 'editor.value output must contain "' + frag + '" verbatim');
    });
  });

  test('D-10: NO classification sentinel/marker appears in EITHER builder output (both stay byte-clean)', function () {
    assert.ok(!SENTINEL_RE.test(copyOut),
      'the copy output must carry no control / zero-width / bidi-override sentinel (D-10)');
    assert.ok(!SENTINEL_RE.test(editorOut),
      'the editor.value output must carry no control / zero-width / bidi-override sentinel (D-10)');
  });

  test('the note body is not re-wrapped: the fixture appears as ONE contiguous block in both outputs', function () {
    // A transform that split/re-joined the note lines would break the single
    // contiguous match even if every fragment survived individually.
    assert.strictEqual(copyOut.split(FIXTURE).length, 2, 'copy output contains the fixture exactly once, contiguous');
    assert.strictEqual(editorOut.split(FIXTURE).length, 2, 'editor.value output contains the fixture exactly once, contiguous');
  });

  // ── Count guard ────────────────────────────────────────────────────────────────
  var EXPECTED = 5;
  test('count guard: expected ' + EXPECTED + ' assertions ran', function () {
    assert.strictEqual(passed + failed, EXPECTED,
      'expected ' + EXPECTED + ' tests before the count guard, saw ' + (passed + failed));
  });

  console.log('\n45-copy-share-verbatim: passed ' + passed + ', failed ' + failed + '.');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(function (err) {
  console.error('FATAL:', err && err.stack || err);
  process.exit(1);
});
