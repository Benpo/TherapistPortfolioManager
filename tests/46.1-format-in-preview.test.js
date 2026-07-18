/**
 * tests/46.1-format-in-preview.test.js — the INERT formatting bar in preview +
 * the pinned-outside-strip structure (RTXT-01, amended). Retargeted from the
 * original return-and-apply contract: while a surface is previewing, every
 * toolbar control except the Edit/Preview mode switcher is inert — dimmed means
 * dead. The only ways back to Edit are the switcher's Edit segment and
 * Ctrl/Cmd+E.
 *
 * WHAT THIS PINS (outcomes only — DOM state, never module internals):
 *   - Inert-in-preview: clicking a FORMATTING button while previewing does
 *     NOTHING — the preview segment stays is-active, the textarea stays hidden,
 *     the frame stays visible, and the field value is unchanged (no ** markers).
 *   - Heading dropdown: clicking the heading trigger while previewing does NOT
 *     open the dropdown panel (no .rich-toolbar-heading-menu in the document,
 *     aria-expanded stays "false").
 *   - aria-disabled affordance: the strip controls carry aria-disabled="true"
 *     while previewing, and returning to Edit clears it — WITHOUT clearing a
 *     still-valid other dim reason (heading-line indent/outdent, empty-history
 *     undo/redo).
 *   - Return paths: the switcher's Edit segment and Ctrl/Cmd+E still return to
 *     Edit (textarea visible again, edit segment is-active).
 *   - Pinned-outside-strip (structure): the mode switcher segments ([data-mode])
 *     are NOT descendants of the horizontally-scrollable control strip
 *     (.rich-toolbar-scroll), while the formatting buttons ARE inside it.
 *
 * HARNESS cloned from tests/46-persistent-bar-dispatch.test.js (fresh JSDOM per
 * case; md-render.js eval'd before rich-toolbar.js; execCommand stubbed to force
 * TextEdit's splice fallback; pass-through App.t). Controls activate via a real
 * `mousedown` MouseEvent (the toolbar binds mousedown, not click).
 * Run: node tests/46.1-format-in-preview.test.js
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
      '<div class="export-edit-area"><textarea id="taP"></textarea></div>' +
      '<textarea id="taS"></textarea>' +
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
  const taP = win.document.getElementById('taP');
  const taS = win.document.getElementById('taS');
  win.RichToolbar.mount([taP], { headings: true, persistent: true });
  win.RichToolbar.mount([taS], { headings: true });
  return { win, taP, taS };
}

function persistentBar(taP) { return taP.previousElementSibling; }
function mousedown(win, el) {
  el.dispatchEvent(new win.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
}
function segment(bar, mode) { return bar.querySelector('[data-mode="' + mode + '"]'); }
function btn(bar, action) {
  return bar.querySelector('.rich-toolbar-btn[data-action="' + action + '"]');
}

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS  ' + name); }
  catch (err) { failed++; console.log('FAIL  ' + name); console.log('      ' + (err && err.message || err)); }
}

// ── Inert: clicking Bold while previewing does NOTHING ───────────────────────────
test('clicking Bold while previewing does nothing — still previewing, value unchanged', function () {
  const { win, taP } = makeEnv();
  taP.value = 'text';
  taP.setSelectionRange(0, 4);
  const bar = persistentBar(taP);
  const previewSeg = segment(bar, 'preview');
  assert.ok(previewSeg, 'the bar exposes a Preview mode segment');
  mousedown(win, previewSeg);
  assert.ok(taP.classList.contains('is-hidden'), 'precondition: previewing (textarea hidden)');
  const boldBtn = btn(bar, 'bold');
  assert.ok(boldBtn, 'the Bold formatting button is present on the bar');
  mousedown(win, boldBtn);
  assert.ok(previewSeg.classList.contains('is-active'),
    'the preview segment stays is-active — the click did NOT change the mode');
  assert.ok(taP.classList.contains('is-hidden'),
    'the textarea stays hidden — still previewing after the formatting click');
  const frame = taP._notePreview;
  assert.ok(frame && !frame.classList.contains('is-hidden'),
    'the preview frame stays visible — the click changed nothing on screen');
  assert.strictEqual(taP.value, 'text',
    'the field value is unchanged — no bold markers were applied');
});

// ── Inert: the heading dropdown does not open while previewing ───────────────────
test('clicking the heading trigger while previewing does NOT open the dropdown', function () {
  const { win, taP } = makeEnv();
  taP.value = 'a line';
  const bar = persistentBar(taP);
  mousedown(win, segment(bar, 'preview'));
  assert.ok(taP.classList.contains('is-hidden'), 'precondition: previewing');
  const trigger = btn(bar, 'heading');
  assert.ok(trigger, 'the heading trigger is present on the bar');
  mousedown(win, trigger);
  assert.strictEqual(win.document.querySelector('.rich-toolbar-heading-menu'), null,
    'no heading dropdown panel opened while previewing');
  assert.strictEqual(trigger.getAttribute('aria-expanded'), 'false',
    'the trigger still reports aria-expanded="false"');
  assert.ok(taP.classList.contains('is-hidden'), 'still previewing after the trigger click');
});

// ── Affordance: strip controls carry aria-disabled while previewing, cleared after ─
test('strip controls are aria-disabled while previewing and re-enabled on return to Edit', function () {
  const { win, taP } = makeEnv();
  taP.value = 'text';
  const bar = persistentBar(taP);
  mousedown(win, segment(bar, 'preview'));
  ['bold', 'italic', 'bulletList', 'numberedList', 'heading', 'indent', 'outdent'].forEach(function (action) {
    const b = btn(bar, action);
    assert.ok(b, action + ' button exists');
    assert.strictEqual(b.getAttribute('aria-disabled'), 'true',
      action + ' carries aria-disabled while previewing');
  });
  mousedown(win, segment(bar, 'edit'));
  ['bold', 'italic', 'bulletList', 'numberedList', 'heading'].forEach(function (action) {
    assert.notStrictEqual(btn(bar, action).getAttribute('aria-disabled'), 'true',
      action + ' sheds aria-disabled on return to Edit');
  });
});

// ── Composition: leaving preview must NOT clear a still-valid other dim reason ───
test('leaving preview keeps the heading-line indent/outdent dim', function () {
  const { win, taP } = makeEnv();
  taP.value = '## heading line';
  taP.setSelectionRange(5, 5);
  win.RichToolbar.refreshButtonState(taP); // caret sits on a heading line
  const bar = persistentBar(taP);
  assert.strictEqual(btn(bar, 'indent').getAttribute('aria-disabled'), 'true',
    'precondition: indent is aria-disabled on a heading line');
  mousedown(win, segment(bar, 'preview'));
  assert.strictEqual(btn(bar, 'indent').getAttribute('aria-disabled'), 'true',
    'indent stays aria-disabled while previewing');
  mousedown(win, segment(bar, 'edit'));
  assert.strictEqual(btn(bar, 'indent').getAttribute('aria-disabled'), 'true',
    'indent is STILL aria-disabled after leaving preview (heading-line reason survives)');
  assert.strictEqual(btn(bar, 'outdent').getAttribute('aria-disabled'), 'true',
    'outdent is STILL aria-disabled after leaving preview (heading-line reason survives)');
  assert.notStrictEqual(btn(bar, 'bold').getAttribute('aria-disabled'), 'true',
    'bold (no other dim reason) sheds aria-disabled on return to Edit');
});

test('leaving preview keeps the empty-history undo/redo dim', function () {
  const { win, taP } = makeEnv();
  // Fresh field, untouched value: the persistent bar starts with undo/redo
  // dimmed (empty history). A preview round-trip must not wake them up.
  const bar = persistentBar(taP);
  assert.strictEqual(btn(bar, 'undo').getAttribute('aria-disabled'), 'true',
    'precondition: undo is aria-disabled with an empty history');
  mousedown(win, segment(bar, 'preview'));
  mousedown(win, segment(bar, 'edit'));
  assert.strictEqual(btn(bar, 'undo').getAttribute('aria-disabled'), 'true',
    'undo is STILL aria-disabled after leaving preview (empty-history reason survives)');
  assert.strictEqual(btn(bar, 'redo').getAttribute('aria-disabled'), 'true',
    'redo is STILL aria-disabled after leaving preview (empty-history reason survives)');
});

// ── Return paths: the Edit segment and Ctrl/Cmd+E still return to Edit ───────────
test('the Edit segment still returns to Edit after an inert formatting click', function () {
  const { win, taP } = makeEnv();
  taP.value = 'text';
  const bar = persistentBar(taP);
  mousedown(win, segment(bar, 'preview'));
  mousedown(win, btn(bar, 'bold')); // inert — dropped
  const editSeg = segment(bar, 'edit');
  mousedown(win, editSeg);
  assert.ok(editSeg.classList.contains('is-active'), 'the edit segment is is-active');
  assert.ok(!taP.classList.contains('is-hidden'), 'the textarea is visible again');
});

test('Ctrl/Cmd+E still returns to Edit while previewing', function () {
  const { win, taS } = makeEnv();
  taS.value = 'text';
  taS.focus();
  const bar = taS.previousElementSibling;
  mousedown(win, segment(bar, 'preview'));
  assert.ok(taS.classList.contains('is-hidden'), 'precondition: previewing');
  // While previewing the textarea is hidden; the RETURN direction rides the
  // document-level keydown fallback. jsdom applies no CSS, so blur explicitly
  // (a real browser blurs the hidden field on its own) before driving the
  // document-level keydown.
  taS.blur();
  win.document.dispatchEvent(new win.KeyboardEvent('keydown', {
    key: 'e', ctrlKey: true, bubbles: true, cancelable: true,
  }));
  assert.ok(!taS.classList.contains('is-hidden'),
    'Ctrl+E returned the field to Edit (textarea visible again)');
});

// ── Pinned-outside-strip: switcher NOT in the scroll strip; formatting buttons ARE ─
test('the mode switcher is pinned OUTSIDE the scrollable strip; formatting buttons are inside it', function () {
  const { taP } = makeEnv();
  const bar = persistentBar(taP);
  const strip = bar.querySelector('.rich-toolbar-scroll');
  assert.ok(strip, 'the bar has a horizontally-scrollable control strip (.rich-toolbar-scroll)');
  const stripModeSegs = strip.querySelectorAll('[data-mode]');
  assert.strictEqual(stripModeSegs.length, 0,
    'no mode switcher segment lives inside the scroll strip (they are pinned outside it)');
  const boldBtn = btn(bar, 'bold');
  assert.ok(boldBtn, 'the Bold button exists');
  assert.ok(strip.contains(boldBtn),
    'the formatting buttons ARE inside the scroll strip (they scroll beneath the pinned switcher)');
});

console.log('\n46.1-format-in-preview: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
