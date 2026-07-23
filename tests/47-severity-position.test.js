/**
 * tests/47-severity-position.test.js — the edit-aware saved-order ordinal that
 * positions the structural severity block in the exported PDF.
 *
 * WHAT THIS GUARDS (deriveSeverityAfterSections(orderedKeys, presentKeys)):
 *   The two-bar before/after severity block is drawn just before the
 *   (result + 1)-th document heading the PDF encounters. So the function must
 *   return the number of sections that ACTUALLY appear in the exported body and
 *   sit BEFORE the end-of-session-severity slot, read in the therapist's saved
 *   order:
 *     - severity slot first in the order            → 0 (block heads the body)
 *     - N present sections precede the slot          → N
 *     - severity slot absent from the saved order    → presentKeys.length (end)
 *     - a section that precedes the slot in the order but is NOT present in the
 *       edited text is NOT counted (edit-awareness: deleting a heading in Step 2
 *       moves the block up one slot)
 *   The severity slot itself never emits a heading, so it never appears in
 *   presentKeys.
 *
 * FALSIFIABLE:
 *   - count all preceding keys (not just present ones) → the deleted-heading and
 *     not-present cases FAIL.
 *   - count present keys after the slot too            → the trailing-present case FAILS.
 *   - return a fixed 0/1 (the old heartShield-only match) → every non-trivial
 *     order FAILS.
 *
 * The function is PURE (no DOM, no closure state) and resolved from the module
 * test-hook seam (window.__exportModalTestHooks.deriveSeverityAfterSections),
 * the same idiom 34-session-ordinal uses for deriveSessionOrdinal. Read-only:
 * evals assets/export-modal.js into a bare jsdom window; writes no assets/*.
 *
 *   node tests/47-severity-position.test.js   -- exit 0 = pass, 1 = fail
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

// The IIFE references App/navigator only INSIDE initExportModal, so a standalone
// eval is safe — it defines the module-scope helpers and exposes the test hook.
function buildEnv() {
  var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://localhost/add-session.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  win.eval(readAsset('assets/export-modal.js'));
  return { dom: dom, win: win };
}

function resolveDerive(win) {
  if (win.__exportModalTestHooks && typeof win.__exportModalTestHooks.deriveSeverityAfterSections === 'function') {
    return win.__exportModalTestHooks.deriveSeverityAfterSections;
  }
  return null;
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(function () {
  var env = buildEnv();
  var derive = resolveDerive(env.win);

  test('the pure ordinal helper is exposed on the module test-hook seam', function () {
    assert.ok(typeof derive === 'function',
      'window.__exportModalTestHooks.deriveSeverityAfterSections must be a function');
  });

  // The canonical acceptance case: afterSeverity between issues and comments;
  // only "issues" is present before the slot ("comments" is present but sits
  // AFTER the slot). afterSeverity never appears in presentKeys (no heading).
  test('issues before the slot, comments after it → 1 (only the preceding present section counts)', function () {
    assert.strictEqual(
      derive(['issues', 'afterSeverity', 'comments'], ['issues', 'comments']),
      1);
  });

  test('severity slot FIRST in the order → 0 (block heads the body)', function () {
    assert.strictEqual(
      derive(['afterSeverity', 'issues', 'comments'], ['issues', 'comments']),
      0);
  });

  test('N present sections precede the slot → N', function () {
    var order = ['issues', 'trapped', 'insights', 'afterSeverity', 'comments'];
    var present = ['issues', 'trapped', 'insights', 'comments'];
    assert.strictEqual(derive(order, present), 3);
  });

  test('severity slot ABSENT from the saved order → presentKeys.length (block at end)', function () {
    var order = ['issues', 'trapped', 'comments'];
    var present = ['issues', 'trapped', 'comments'];
    assert.strictEqual(derive(order, present), 3);
  });

  test('a preceding section that is NOT present is not counted', function () {
    // "trapped" precedes the slot in the order but is absent from the edited
    // text, so only "issues" counts.
    var order = ['issues', 'trapped', 'afterSeverity', 'comments'];
    var present = ['issues', 'comments'];
    assert.strictEqual(derive(order, present), 1);
  });

  test('edit-awareness: deleting one preceding heading in Step 2 drops the ordinal by one', function () {
    var order = ['issues', 'trapped', 'insights', 'afterSeverity', 'comments'];
    var full = derive(order, ['issues', 'trapped', 'insights', 'comments']); // all present
    var edited = derive(order, ['issues', 'insights', 'comments']);          // "trapped" heading removed
    assert.strictEqual(full, 3, 'all three preceding sections present → 3');
    assert.strictEqual(edited, 2, 'one preceding heading deleted → 2');
    assert.strictEqual(full - edited, 1, 'removing a preceding heading shifts the block up exactly one slot');
  });

  test('a present section positioned AFTER the slot never counts', function () {
    // Every non-severity section is present, but only the two before the slot count.
    var order = ['issues', 'trapped', 'afterSeverity', 'insights', 'comments'];
    var present = ['issues', 'trapped', 'insights', 'comments'];
    assert.strictEqual(derive(order, present), 2);
  });

  test('defensive: non-array inputs do not throw (returns 0)', function () {
    assert.strictEqual(derive(undefined, undefined), 0);
    assert.strictEqual(derive(null, null), 0);
  });

  // ─── producer/consumer heading-level agreement (parsePresentSectionKeys) ──────
  // The PDF consumer counts ANY document-labeled heading at level 2 OR 3 toward
  // the severity ordinal (its parseMarkdown accepts #{1,3} and its counter
  // matches level >= 2). The producer that derives presentKeys from the edited
  // Step-2 text must therefore accept the same levels: a therapist promoting
  // `## insights` to `### insights` must NOT drop the section from presentKeys,
  // or the severity block draws one slot early. parsePresentSectionKeys is an
  // init-scoped closure, so this case runs the init handshake with a minimal
  // ctx + App stub (getSectionLabel echoes the key, so headings are `## <key>`).
  test('a heading promoted to level 3 (### insights) still counts as present', function () {
    var env2 = buildEnv();
    var win2 = env2.win;
    win2.App = {
      t: function (k) { return k; },
      getSectionLabel: function (id) { return id; },
    };
    win2.__exportModalInit({
      els: {},
      getIssuesPayload: function () { return []; },
      getEditingSession: function () { return null; },
    });
    var parse = win2.__exportModalTestHooks &&
      win2.__exportModalTestHooks.parsePresentSectionKeys;
    assert.ok(typeof parse === 'function',
      'window.__exportModalTestHooks.parsePresentSectionKeys must be exposed after init');

    var orderedKeys = ['issues', 'insights', 'comments'];
    var md = '## issues\n- topic\n\n### insights\nbody\n\n## comments\nbody\n';
    var present = parse(orderedKeys, md);
    assert.deepStrictEqual(present, ['issues', 'insights', 'comments'],
      'a ###-promoted heading must still count as present (got ' + JSON.stringify(present) + ')');

    // Level 1 and level 4 stay excluded — the consumer never counts them toward
    // the ordinal (level 1 is the document title; #### is not a parsed heading).
    var mdEdge = '# issues\n\n#### insights\n\n## comments\n';
    assert.deepStrictEqual(parse(orderedKeys, mdEdge), ['comments'],
      'level-1 and level-4 lines must not register as present sections');

    env2.dom.window.close();
  });

  env.dom.window.close();

  var EXPECTED = 10;
  if (passed + failed !== EXPECTED) {
    console.error('\nCOUNT GUARD FAILED: expected ' + EXPECTED + ' cases, ran ' + (passed + failed));
    process.exit(1);
  }

  console.log('');
  console.log('47-severity-position tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
