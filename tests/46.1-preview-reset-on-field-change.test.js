/**
 * tests/46.1-preview-reset-on-field-change.test.js — the shared-bar preview
 * TEARDOWN contract: every path that closes a preview must also reset the bar
 * UI, not just the internal swap state.
 *
 * RED-first: today only the export-modal close path (resetPreview) resets the
 * switcher + is-preview marker. The other close paths — focus moving to a
 * DIFFERENT registered field (dockTo), and the outside-pointerdown dismissal —
 * restore the textarea/Frame swap but leave the bar stuck in preview: the
 * Preview segment stays is-active, the bar keeps `is-preview`, and every strip
 * control stays aria-disabled (dimmed means dead) while the user is looking at
 * a plain editable textarea.
 *
 * WHAT THIS PINS (observable OUTCOMES only — DOM class/state):
 *   - preview on field A, then focus moves to field B: the shared bar docked
 *     above B carries NO `is-preview`, the Edit segment is the active one
 *     (is-active + aria-pressed), and the strip controls are live again;
 *   - preview on field A, then a pointerdown outside the bar + Frame: the bar
 *     is dismissed AND its switcher is back on Edit, so the next focus shows a
 *     bar whose active segment matches the mode the field is actually in.
 *
 * Controls activate via a real `mousedown` MouseEvent (the toolbar binds
 * mousedown, not click). Run: node tests/46.1-preview-reset-on-field-change.test.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const REPO = path.resolve(__dirname, '..');
function asset(rel) { return fs.readFileSync(path.join(REPO, rel), 'utf8'); }

function makeEnv() {
  const dom = new JSDOM(
    '<!DOCTYPE html><body><div id="host">' +
      '<textarea id="taA"></textarea>' +
      '<textarea id="taB"></textarea>' +
    '</div></body>',
    { url: 'https://example.test/', pretendToBeVisual: true, runScripts: 'outside-only' }
  );
  const win = dom.window;
  win.matchMedia = win.matchMedia || function () {
    return { matches: false, addListener() {}, removeListener() {} };
  };
  win.document.execCommand = function () { return false; };
  win.App = { t(k) { return k; } };
  win.eval(asset('assets/md-render.js'));
  win.eval(asset('assets/text-edit.js'));
  win.eval(asset('assets/rich-toolbar.js'));
  const taA = win.document.getElementById('taA');
  const taB = win.document.getElementById('taB');
  win.RichToolbar.mount([taA, taB], { headings: true });
  return { win, taA, taB };
}

function mousedown(win, el) {
  el.dispatchEvent(new win.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
}
function focusin(win, ta) {
  ta.focus();
  ta.dispatchEvent(new win.FocusEvent('focusin'));
}
function segment(bar, mode) { return bar.querySelector('[data-mode="' + mode + '"]'); }
function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }

// Focus the field, then enter preview via the shared bar's Preview segment.
function enterPreview(win, ta) {
  focusin(win, ta);
  const bar = ta.previousElementSibling;
  assert.ok(bar && bar.classList.contains('rich-toolbar'), 'the shared bar docks above the focused field');
  mousedown(win, segment(bar, 'preview'));
  assert.ok(bar.classList.contains('is-preview'), 'precondition: the bar is in preview');
  assert.ok(ta.classList.contains('is-hidden'), 'precondition: the textarea is swapped out');
  return bar;
}

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('PASS  ' + name); }
  catch (err) { failed++; console.log('FAIL  ' + name); console.log('      ' + (err && err.message || err)); }
}

(async function () {

  // ── Focus moving to another registered field resets the bar UI ────────────────
  await test('preview on A, focus to B: the bar loses is-preview and the Edit segment is active', async function () {
    const { win, taA, taB } = makeEnv();
    taA.value = 'note a';
    taB.value = 'note b';
    const bar = enterPreview(win, taA);

    focusin(win, taB);

    assert.strictEqual(taB.previousElementSibling, bar, 'the shared bar re-docked above field B');
    assert.ok(!bar.classList.contains('is-preview'),
      'the bar sheds is-preview when the preview closes on a field change');
    const editSeg = segment(bar, 'edit');
    const previewSeg = segment(bar, 'preview');
    assert.ok(editSeg.classList.contains('is-active'),
      'the Edit segment is the active one above the newly-focused field');
    assert.strictEqual(editSeg.getAttribute('aria-pressed'), 'true',
      'the Edit segment is aria-pressed');
    assert.ok(!previewSeg.classList.contains('is-active'),
      'the Preview segment is no longer active');
    assert.strictEqual(previewSeg.getAttribute('aria-pressed'), 'false',
      'the Preview segment is not aria-pressed');
    assert.ok(!taA.classList.contains('is-hidden'), 'field A is restored visible');
  });

  await test('preview on A, focus to B: the strip controls are live again (no stale preview dim)', async function () {
    const { win, taA, taB } = makeEnv();
    taA.value = 'note a';
    const bar = enterPreview(win, taA);
    const bold = bar.querySelector('.rich-toolbar-btn[data-action="bold"]');
    assert.strictEqual(bold.getAttribute('aria-disabled'), 'true',
      'precondition: strip controls are inert while previewing');

    focusin(win, taB);

    assert.notStrictEqual(bold.getAttribute('aria-disabled'), 'true',
      'strip controls are re-enabled once the preview closed with the field change');
  });

  // ── The outside-pointerdown dismissal resets the bar UI too ───────────────────
  await test('preview on A, pointerdown outside: the switcher is back on Edit for the next focus', async function () {
    const { win, taA } = makeEnv();
    taA.value = 'note a';
    const bar = enterPreview(win, taA);
    await flush(); // the outside-dismiss listener binds deferred

    mousedown(win, win.document.body);

    assert.ok(bar.classList.contains('is-hidden'), 'the shared bar is dismissed');
    assert.ok(!taA.classList.contains('is-hidden'), 'field A is restored visible');
    assert.ok(!bar.classList.contains('is-preview'),
      'the dismissed bar sheds is-preview (a re-shown bar must not open stuck in preview)');
    const editSeg = segment(bar, 'edit');
    assert.ok(editSeg.classList.contains('is-active'),
      'the Edit segment is active after the dismissal');
    assert.strictEqual(segment(bar, 'preview').getAttribute('aria-pressed'), 'false',
      'the Preview segment is not aria-pressed after the dismissal');
  });

  console.log('\n46.1-preview-reset-on-field-change: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
