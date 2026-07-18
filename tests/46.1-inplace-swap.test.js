/**
 * tests/46.1-inplace-swap.test.js — the preview/edit IN-PLACE SWAP + Ctrl/Cmd+E
 * toggle contract (RTXT-04). RED-first: these outcomes are NOT built in the
 * current shipped source and must fail today; the implementation plans turn them
 * green by rewiring the toolbar to a current-state switcher that REPLACES the
 * editor with the preview frame in the same box (one thing on screen at a time).
 *
 * WHAT THIS PINS (observable OUTCOMES only — DOM state, never module internals):
 *   - Entering preview HIDES the textarea (is-hidden marker) and shows a preview
 *     frame whose render body contains the REAL MdRender output ("**hi**" → a
 *     <strong>hi</strong> inside .rich-toolbar-preview-body).
 *   - The persistent (export) bar resolves preview WITHOUT focusing the field
 *     (the shipped iOS-soft-keyboard suppression invariant): activeElement is not
 *     the editor after entering preview from the always-on bar.
 *   - Leaving preview restores the textarea (is-hidden gone) AND refocuses it, and
 *     hides the frame.
 *   - Ctrl/Cmd+E toggles both directions. The FIELD keydown drives edit→preview;
 *     the DOCUMENT-level keydown drives the return path (exercised only after the
 *     field is explicitly blurred so a field-only handler cannot pass it).
 *   - A focusout the instant preview opens does NOT cascade the bar+preview closed
 *     (BLOCKER-3 guard): after the 0ms deferred focusout timer flushes, the frame
 *     is still open and the shared bar is still visible.
 *
 * HARNESS: cloned from tests/46-persistent-bar-dispatch.test.js (fresh JSDOM per
 * case; execCommand stubbed to force TextEdit's splice fallback; pass-through
 * App.t). CRITICAL addition: md-render.js is eval'd BEFORE rich-toolbar.js
 * (index.html order) so window.MdRender.render is the REAL escape-first renderer —
 * otherwise renderPreview would take the textContent fallback and a <strong>
 * assertion could never go green.
 *
 * Controls activate via real `mousedown` MouseEvents (the toolbar binds mousedown,
 * not click). Run: node tests/46.1-inplace-swap.test.js — exit 0 on full pass,
 * 1 on any failure (RED against current source is EXPECTED).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const REPO = path.resolve(__dirname, '..');
function asset(rel) { return fs.readFileSync(path.join(REPO, rel), 'utf8'); }

// A persistent export-editor analogue (taP) nested inside an .export-edit-area (as
// production docks it) plus a shared note field (taS). Fresh per case so the
// module singleton's preview/focus state never leaks.
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
  // index.html order: md-render.js FIRST so MdRender.render is the real renderer.
  win.eval(asset('assets/md-render.js'));
  win.eval(asset('assets/text-edit.js'));
  win.eval(asset('assets/rich-toolbar.js'));
  const taP = win.document.getElementById('taP');
  const taS = win.document.getElementById('taS');
  win.RichToolbar.mount([taP], { headings: true, persistent: true });
  win.RichToolbar.mount([taS], { headings: true });
  return { win, taP, taS };
}

// The persistent bar docks `beforebegin` its field, so it is taP.previousElementSibling.
function persistentBar(taP) { return taP.previousElementSibling; }

// Dispatch a real cancelable mousedown MouseEvent — the toolbar binds mousedown,
// not the click event, so a real pointer-press sequence is required to activate.
function mousedown(win, el) {
  el.dispatchEvent(new win.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
}
// Real keydown for the Ctrl/Cmd+E toggle path.
function keydown(win, el, init) {
  el.dispatchEvent(new win.KeyboardEvent('keydown',
    Object.assign({ bubbles: true, cancelable: true }, init)));
}

// The current-state switcher segment for a mode ("edit" / "preview"), resolvable on
// whichever bar hosts it. Guarded lookups keep RED (no segment yet) a clean message.
function segment(bar, mode) { return bar.querySelector('[data-mode="' + mode + '"]'); }
// The in-place preview frame + its render body (created by the implementation plans).
function frame(win) { return win.document.querySelector('.rich-toolbar-preview'); }

// Focus + register a note field so its shared bar docks (jsdom may not fire focusin
// on programmatic .focus(), so dispatch it explicitly like the sibling harness).
function focusField(win, ta) {
  ta.focus();
  ta.dispatchEvent(new win.Event('focusin', { bubbles: true }));
}

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS  ' + name); }
  catch (err) { failed++; console.log('FAIL  ' + name); console.log('      ' + (err && err.message || err)); }
}

// ── Enter preview: textarea hidden + frame shows the REAL rendered strong ────────
test('entering preview hides the textarea and renders the field value in the frame body', function () {
  const { win, taS } = makeEnv();
  taS.value = '**hi**';
  focusField(win, taS);
  const bar = taS.previousElementSibling;
  assert.ok(bar && bar.classList.contains('rich-toolbar'), 'the shared bar docked above the focused note field');
  const previewSeg = segment(bar, 'preview');
  assert.ok(previewSeg, 'the bar exposes a Preview mode segment ([data-mode="preview"])');
  mousedown(win, previewSeg);
  assert.ok(taS.classList.contains('is-hidden'),
    'the textarea carries the is-hidden marker (removed from the box) while previewing');
  const fr = frame(win);
  assert.ok(fr && !fr.classList.contains('is-hidden'), 'a preview frame is present and visible');
  const strong = fr.querySelector('.rich-toolbar-preview-body strong');
  assert.ok(strong, 'the frame render body (.rich-toolbar-preview-body) contains the MdRender <strong>');
  assert.ok(/hi/.test(strong.textContent), 'the rendered strong carries the field text "hi"');
});

// ── One thing on screen at a time (textarea hidden while previewing) ─────────────
test('while previewing the textarea is is-hidden (never both visible in one scroll box)', function () {
  const { win, taS } = makeEnv();
  taS.value = 'note text';
  focusField(win, taS);
  const bar = taS.previousElementSibling;
  const previewSeg = segment(bar, 'preview');
  assert.ok(previewSeg, 'the bar exposes a Preview mode segment');
  mousedown(win, previewSeg);
  assert.ok(taS.classList.contains('is-hidden'), 'the textarea is is-hidden — one box at a time');
});

// ── Persistent bar: preview resolves the field WITHOUT focusing it ───────────────
test('persistent-bar preview does NOT focus the editor (soft-keyboard suppression invariant)', function () {
  const { win, taP } = makeEnv();
  taP.value = 'export body';
  const bar = persistentBar(taP);
  const previewSeg = segment(bar, 'preview');
  assert.ok(previewSeg, 'the persistent bar exposes a Preview mode segment');
  mousedown(win, previewSeg); // NO prior focus
  assert.notStrictEqual(win.document.activeElement, taP,
    'the in-place swap resolved the field WITHOUT focusing the export editor');
});

// ── Leave preview: textarea restored + refocused, frame hidden ───────────────────
test('leaving preview restores the textarea (is-hidden gone + refocused) and hides the frame', function () {
  const { win, taS } = makeEnv();
  taS.value = 'body';
  focusField(win, taS);
  const bar = taS.previousElementSibling;
  const previewSeg = segment(bar, 'preview');
  assert.ok(previewSeg, 'the bar exposes a Preview mode segment');
  mousedown(win, previewSeg);
  assert.ok(taS.classList.contains('is-hidden'), 'precondition: textarea hidden while previewing');
  const editSeg = segment(bar, 'edit');
  assert.ok(editSeg, 'the bar exposes an Edit mode segment ([data-mode="edit"])');
  mousedown(win, editSeg);
  assert.ok(!taS.classList.contains('is-hidden'), 'the textarea is visible again (is-hidden removed)');
  assert.strictEqual(win.document.activeElement, taS, 'the textarea is refocused on returning to edit');
  const fr = frame(win);
  assert.ok(fr && fr.classList.contains('is-hidden'), 'the preview frame is hidden on returning to edit');
});

// ── Ctrl/Cmd+E enter direction (field keydown) ───────────────────────────────────
test('Ctrl+E on the focused field flips edit→preview (textarea gains is-hidden)', function () {
  const { win, taS } = makeEnv();
  taS.value = 'body';
  focusField(win, taS);
  keydown(win, taS, { ctrlKey: true, key: 'e' });
  assert.ok(taS.classList.contains('is-hidden'), 'Ctrl+E entered preview (textarea hidden)');
});

test('Cmd+E on the focused field flips edit→preview (textarea gains is-hidden)', function () {
  const { win, taS } = makeEnv();
  taS.value = 'body';
  focusField(win, taS);
  keydown(win, taS, { metaKey: true, key: 'e' });
  assert.ok(taS.classList.contains('is-hidden'), 'Cmd+E entered preview (textarea hidden)');
});

// ── Ctrl/Cmd+E return direction via the DOCUMENT-level fallback ───────────────────
// jsdom applies no CSS, so an is-hidden textarea is not actually blurred; blur it
// explicitly, then drive the keydown on win.document (NOT the field). Only the
// document-level listener the implementation adds can return to edit here — a
// field-only keydown would pass even if that listener were missing.
test('Ctrl+E on the document returns preview→edit after the field is blurred (document-level path)', function () {
  const { win, taS } = makeEnv();
  taS.value = 'body';
  focusField(win, taS);
  const bar = taS.previousElementSibling;
  const previewSeg = segment(bar, 'preview');
  assert.ok(previewSeg, 'the bar exposes a Preview mode segment');
  mousedown(win, previewSeg);
  assert.ok(taS.classList.contains('is-hidden'), 'precondition: previewing (textarea hidden)');
  taS.blur(); // jsdom will not blur a display:none-less hidden element on its own
  keydown(win, win.document, { ctrlKey: true, key: 'e' });
  assert.ok(!taS.classList.contains('is-hidden'),
    'the document-level Ctrl+E returned to edit (textarea visible again)');
});

// ── Focusout-suppression the instant preview opens (BLOCKER-3 guard, NOTE field) ─
// Focus the note field, enter preview (textarea hidden), then dispatch a real
// focusout and FLUSH the 0ms deferred timer (onFieldFocusOut's setTimeout(...,0)).
// The swap-initiated blur must NOT cascade the bar+preview closed the instant
// preview opens. This case is async (it awaits the deferred macrotask), so it runs
// after the synchronous cases and is scored explicitly.
async function focusoutGuardCase() {
  const { win, taS } = makeEnv();
  taS.value = 'body';
  focusField(win, taS);
  const bar = taS.previousElementSibling;
  const previewSeg = segment(bar, 'preview');
  assert.ok(previewSeg, 'the bar exposes a Preview mode segment (focusout guard)');
  mousedown(win, previewSeg);
  assert.ok(taS.classList.contains('is-hidden'), 'precondition: previewing (focusout guard)');
  taS.dispatchEvent(new win.Event('focusout', { bubbles: true }));
  await new Promise(function (r) { setTimeout(r, 0); }); // flush the 0ms deferred hide
  const fr = frame(win);
  assert.ok(fr && !fr.classList.contains('is-hidden'),
    'the preview frame is STILL open after the deferred focusout timer flushes (BLOCKER-3)');
  assert.ok(!bar.classList.contains('is-hidden'),
    'the shared bar is STILL visible after the deferred focusout timer flushes (BLOCKER-3)');
}

focusoutGuardCase().then(function () {
  passed++; console.log('PASS  focusout the instant preview opens does not cascade the bar+preview closed');
}, function (err) {
  failed++;
  console.log('FAIL  focusout the instant preview opens does not cascade the bar+preview closed');
  console.log('      ' + (err && err.message || err));
}).then(function () {
  console.log('\n46.1-inplace-swap: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
});
