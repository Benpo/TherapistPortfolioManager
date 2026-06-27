/**
 * tests/30-autogrow-wiring.test.js — add-session autogrow WIRING
 * characterization (TEST-03, GAP-12 / region B1, D-08/D-09, gap-closure 30-11).
 *
 * ROOT CAUSE THIS CLOSES: the auto-grow WIRING in assets/add-session.js — the
 * delegated `input` listener that calls autoGrow on a .session-textarea
 * (add-session.js:131-138), autoGrow's reset-to-"auto"-then-set DOM mutation
 * (:25-29), and growAllSessionTextareas' boot/populate iteration (:31-33, called
 * at :1829 on a new session and :2172 on edit-load) — is currently covered ONLY
 * by SOURCE-TEXT regex (the quick-260516-rna test A1/A2/A3 `indexOf`/`slice` the
 * asset source). Only the pure LEAF computeGrowHeight is EXECUTED there
 * (rna B1/B2/B3). A Phase-31 rename that left the wiring source identical would
 * pass rna; a Phase-31 change that DELETED the autoGrow call from the input
 * listener (the real wiring) would ALSO pass rna, because rna asserts the source
 * SHAPE, not the runtime behaviour. Nothing EXECUTED the wiring before this test.
 *
 * THE GUARD (D-09 jsdom real-page): load the REAL add-session.html body + the
 * REAL assets/add-session.js into a jsdom window (the 30-export-markdown buildEnv
 * pattern), drive the REAL DOMContentLoaded handler, and observe the wiring
 * through OBSERVABLE DOM only (style.height was SET) — driven by a REAL `input`
 * Event dispatched on a real .session-textarea, NOT by calling the leaf helper
 * and NOT by widening the add-session test-hook export surface.
 *
 * HONEST SCOPE (R12 — the load-bearing caveat): jsdom performs NO LAYOUT, so
 * every element's scrollHeight is 0. computeGrowHeight therefore ALWAYS returns
 * the SESSION_TEXTAREA_MIN_HEIGHT floor (56) and autoGrow always sets
 * style.height = "56px". This test consequently pins the WIRING ONLY —
 *   (1) the delegated listener fired → autoGrow ran → style.height WAS SET, and
 *   (2) growAllSessionTextareas iterated the nodes on boot →
 *       every .session-textarea has style.height set.
 * It does NOT and CANNOT claim the grow-to-fit height COMPUTATION is exercised
 * (that needs real layout). The grow-to-fit math stays guarded by the existing
 * quick-260516-rna leaf test (computeGrowHeight against a fake scrollHeight),
 * which this plan leaves UNTOUCHED. Assertions here check style.height is SET
 * and px-shaped, never a specific grown number.
 *
 * Never an internal function name (D-08/D-12): the test asserts the textarea's
 * style.height attribute. It EXECUTES add-session.js under jsdom — it performs NO
 * source-slicing (no fs.readFileSync of the asset for assertion, no
 * source-text indexOf/slice as a coverage mechanism) and does NOT widen the
 * add-session window test-hook surface or modify any assets/* file.
 *
 * FALSIFIABLE / mutation-kill (G1, recorded in SUMMARY): in a SCRATCH copy of
 * add-session.js, remove the `autoGrow(target)` call from the delegated input
 * listener (:138) so style.height is never (re)set on input → Case A (cleared
 * height stays "" after the input event) FAILS; restore → exits 0. A source-grep
 * could not tell that mutation from a no-op rename; executing the module and
 * dispatching a real input event can.
 *
 * F-A (vacuous-green trap): the page DOMContentLoaded handler is ASYNC; a naive
 * synchronous dispatch returns before the page wires up. Guarded two ways:
 * (1) we CAPTURE the specific DOMContentLoaded handler and `await` it, then
 * settle() the microtask/timer queue after every async-driven event; (2) an
 * end-of-file count guard asserts exactly EXPECTED_COUNT cases executed.
 *
 * Read-only: this test EVALS assets/add-session.js + add-session.html into an
 * isolated jsdom window; it never writes any assets/* production file.
 *
 * Run: node tests/30-autogrow-wiring.test.js
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
 * stub and a mock PortfolioDB injected. Captures the (single) DOMContentLoaded
 * handler so the test can `await` it rather than relying on a blanket dispatch.
 * Mirrors tests/30-export-markdown.test.js buildEnv.
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

  win.eval(readAsset('assets/add-session.js'));

  if (captured.length !== 1) {
    throw new Error('expected add-session.js to register exactly 1 DOMContentLoaded handler; got ' +
      captured.length);
  }
  return { dom: dom, win: win, domHandler: captured[0] };
}

// px-shaped: a non-empty integer-or-decimal px value (e.g. "56px"). Deliberately
// NOT a specific number — under jsdom this is always the 56 floor, and the point
// of this test is that the height WAS SET by the wiring, not WHAT it computed.
function isPxShaped(v) { return typeof v === 'string' && /^\d+(\.\d+)?px$/.test(v); }

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── A. Delegated input listener WIRING → autoGrow set style.height ───────────
  await test('delegated input listener: dispatching a real input Event on a .session-textarea sets its style.height (autoGrow ran via the wiring; jsdom scrollHeight===0 → 56 floor, so we assert px-shaped/SET, not a grown number)', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    var ta = win.document.querySelector('.session-textarea');
    assert.ok(ta, 'add-session.html must render at least one .session-textarea');
    assert.ok(win.document.getElementById('sessionForm').contains(ta),
      'the .session-textarea must live inside #sessionForm so its input event reaches the delegated listener');

    // Clear the boot-set height so the assertion proves THE INPUT LISTENER set it
    // (not the earlier growAllSessionTextareas boot call). If the delegated
    // listener's autoGrow call were removed, height would stay "" after input.
    ta.style.height = '';
    assert.strictEqual(ta.style.height, '', 'precondition: height cleared before the input event');

    ta.value = 'line one\nline two\nline three\nline four';
    ta.dispatchEvent(new win.Event('input', { bubbles: true }));
    await settle();

    assert.ok(isPxShaped(ta.style.height),
      'after a real input event the delegated listener must run autoGrow → style.height set to a px value (got "' +
      ta.style.height + '"). jsdom does no layout so this is the 56 floor; the assertion is that the WIRING set it.');

    env.dom.window.close();
  });

  // ─── B. growAllSessionTextareas iterated the nodes on boot ───────────────────
  await test('growAll on boot: every .session-textarea has style.height set after the boot/populate path (growAllSessionTextareas iterated the nodes)', async function () {
    var env = buildEnv();
    var win = env.win;
    await env.domHandler();
    await settle();

    var nodes = win.document.querySelectorAll('.session-textarea');
    assert.ok(nodes.length > 0, 'add-session.html must render .session-textarea nodes');

    Array.prototype.forEach.call(nodes, function (el, i) {
      assert.ok(isPxShaped(el.style.height),
        '.session-textarea[' + i + '] (#' + (el.id || '?') + ') must have style.height set after boot ' +
        '(growAllSessionTextareas iterated it); got "' + el.style.height + '"');
    });

    env.dom.window.close();
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────────
  var EXPECTED_COUNT = 2;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 30-11 autogrow-wiring tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (err) {
  console.error('FATAL (unhandled): ' + (err && err.stack || err));
  process.exit(1);
});
