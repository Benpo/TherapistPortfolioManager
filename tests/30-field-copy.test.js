/**
 * tests/30-field-copy.test.js — add-session PER-FIELD copy
 * characterization (TEST-03, GAP-13 / region B2, D-08/D-09, gap-closure 30-11).
 *
 * ROOT CAUSE THIS CLOSES: each long session field has its OWN per-field copy
 * button (.field-copy with data-copy-target=<fieldId>, add-session.html:329/342).
 * Clicking one routes that field's text through buildFieldCopyText(fieldId) →
 * copyTextToClipboard (add-session.js:1570-1580 / :765-770). buildFieldCopyText
 * is REACHABLE only via that button, but NO test ever clicks one — the export
 * tests (30-export-markdown) click only the WHOLE-session copy (#copySessionBtn)
 * and the export dialog. A Phase-31 change that made the per-field button copy
 * the whole-session markdown (or nothing) would ship silently.
 *
 * THE GUARD (D-09 jsdom real-page): load the REAL add-session.html body + the
 * REAL assets/add-session.js into a jsdom window (the 30-export-markdown buildEnv
 * pattern), drive the REAL DOMContentLoaded handler, populate ONE field with
 * distinctive content, force the secure-context clipboard path and install a
 * capturing navigator.clipboard.writeText spy, click THAT field's copy button,
 * and assert the captured argument is the field-scoped copy text — NOT the
 * whole-session markdown.
 *
 * Never an internal function name (D-08/D-12): the test asserts the captured
 * clipboard writeText STRING. It EXECUTES add-session.js under jsdom — it
 * performs NO source-slicing (no fs.readFileSync of the asset for assertion, no
 * source-text indexOf/slice as a coverage mechanism), asserts no internal
 * function names, and does NOT widen the add-session window test-hook surface or
 * modify any assets/* file.
 *
 * buildFieldCopyText returns `${clientName}\n\n${value}` (add-session.js:765-770).
 * With no client selected on a clean ?-URL, getClientNameForCopy returns
 * App.t("session.copy.unknownClient"); the app-stub's `t` returns the KEY, so the
 * expected payload is exactly:  session.copy.unknownClient\n\n<field value>.
 *
 * FALSIFIABLE / mutation-kill (G1, recorded in SUMMARY): in a SCRATCH copy of
 * add-session.js, make the per-field button copy the WHOLE-session text
 * (buildSessionMarkdown()) instead of buildFieldCopyText(targetId) → the
 * scoped-equality assertion (captured === the field-only payload, and captured
 * does NOT contain the whole-session title heading) FAILS; restore → exits 0.
 *
 * F-A (vacuous-green trap): the page DOMContentLoaded handler is ASYNC and the
 * click handler is async (await copyTextToClipboard). Guarded two ways: (1) we
 * CAPTURE the specific DOMContentLoaded handler and `await` it, then settle() the
 * microtask/timer queue after every async-driven event; (2) an end-of-file count
 * guard asserts exactly EXPECTED_COUNT cases executed.
 *
 * Read-only: this test EVALS assets/add-session.js + add-session.html into an
 * isolated jsdom window; it never writes any assets/* production file.
 *
 * Run: node tests/30-field-copy.test.js
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

/**
 * Build a jsdom env: real add-session.html + real add-session.js, with the App
 * stub and a mock PortfolioDB injected. Mirrors tests/30-export-markdown.test.js.
 */
function buildEnv() {
  var html = readAsset('add-session.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/add-session.html',
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
  win.PortfolioDB = createMockPortfolioDB({ clients: [], sessions: [] });

  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };

  win.eval(readAsset('assets/export-modal.js')); // export-modal.js BEFORE add-session.js (unconditional __exportModalInit boot call)
  win.eval(readAsset('assets/date-format.js')); // D-21: add-session.js boot reads window.DateFormat (todayLocalISO/parseLocal)
  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' +
      captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0] };
}

// Force the secure-context clipboard path and install a capturing spy; returns a
// getter for the last writeText argument.
function installClipboardSpy(win) {
  Object.defineProperty(win, 'isSecureContext', { value: true, configurable: true });
  var box = { value: null };
  Object.defineProperty(win.navigator, 'clipboard', {
    value: { writeText: function (s) { box.value = s; return Promise.resolve(); } },
    configurable: true,
  });
  return box;
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── Per-field copy: clicking one field's copy button copies THAT field ──────
  await test('per-field copy: clicking the #sessionComments .field-copy button copies the field-scoped buildFieldCopyText output (that field content only) to the clipboard — NOT the whole-session markdown', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    var FIELD_ID = 'sessionComments';
    var DISTINCT = 'COMMENTS_FIELD_DISTINCT_PAYLOAD_42';
    var field = win.document.getElementById(FIELD_ID);
    assert.ok(field, '#' + FIELD_ID + ' must exist in add-session.html');
    field.value = DISTINCT;

    // Populate a DIFFERENT field so a whole-session-markdown mutation would be
    // observably broader than the per-field payload.
    var other = win.document.getElementById('trappedEmotions');
    assert.ok(other, '#trappedEmotions must exist');
    other.value = 'TRAPPED_OTHER_FIELD_SHOULD_NOT_APPEAR';

    var clip = installClipboardSpy(win);

    var btn = win.document.querySelector('.field-copy[data-copy-target="' + FIELD_ID + '"]');
    assert.ok(btn, 'a .field-copy button targeting #' + FIELD_ID + ' must render');
    btn.click();
    await settle();

    assert.strictEqual(typeof clip.value, 'string',
      'clicking the per-field copy button must route text through navigator.clipboard.writeText under a secure context');

    // buildFieldCopyText returns `${clientName}\n\n${value}`; clientName is the
    // unknown-client i18n KEY under the stub. EXACT scoped payload:
    var expected = 'session.copy.unknownClient\n\n' + DISTINCT;
    assert.strictEqual(clip.value, expected,
      'the per-field copy must be the field-scoped buildFieldCopyText output; got ' + JSON.stringify(clip.value));

    // SCOPED, not whole-session: it must NOT carry the whole-session markdown
    // title heading or section structure, and must NOT leak the OTHER field.
    assert.ok(clip.value.indexOf(DISTINCT) !== -1, 'the copied text must contain the target field content');
    assert.ok(clip.value.indexOf('# session.copy.title') === -1,
      'per-field copy must NOT include the whole-session markdown title heading');
    assert.ok(clip.value.indexOf('## issues') === -1,
      'per-field copy must NOT include the whole-session issues section');
    assert.ok(clip.value.indexOf('TRAPPED_OTHER_FIELD_SHOULD_NOT_APPEAR') === -1,
      'per-field copy must NOT leak a different field\'s content');

    env.dom.window.close();
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────────
  var EXPECTED_COUNT = 1;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 30-11 field-copy tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (err) {
  console.error('FATAL (unhandled): ' + (err && err.stack || err));
  process.exit(1);
});
