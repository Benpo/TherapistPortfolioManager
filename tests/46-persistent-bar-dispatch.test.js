/**
 * tests/46-persistent-bar-dispatch.test.js — persistent-toolbar dispatch must not
 * depend on prior editor focus (Phase 46 gap-round-3, Gap 12).
 *
 * THE BUG THIS GUARDS: the export editor mounts its toolbar with
 * { persistent: true } — the bar is ALWAYS visible, so a user clicks its controls
 * BEFORE ever focusing the editor (default page focus sits elsewhere). The
 * dispatch chokepoint resolved its target field from `_focused` (the last-focused
 * registered field) and returned early when it was null, so every persistent-bar
 * control (bold, preview, lists, heading, undo…) silently no-oped on first click.
 * The fix resolves the target from the CLICKED control's OWN bar (bar→field), so a
 * persistent control never depends on prior focus; the shared note-field bar still
 * resolves from `_focused` unchanged.
 *
 * LOAD-BEARING GOTCHA: the toolbar binds its handlers on **mousedown**, never on
 * `click` (mousedown+preventDefault preserves the field's focus/selection). A
 * `button.click()` fires only a `click` event and does NOT trigger the control —
 * every case here dispatches a real `mousedown` MouseEvent, matching production's
 * pointer sequence. Assertions check the OUTCOME (value change / pane presence /
 * aria-pressed / activeElement), never an internal like `_focused`, so either fix
 * mechanism (bar→field resolution, or focus-first) makes it GREEN.
 *
 * Cases:
 *   A — Bold, no focus → persistent field wraps to '**text**' (RED now).
 *   B — Preview, no focus → pane opens + visible + aria-pressed AND the field is
 *       NOT focused (preview is view-only; must not pop the iOS soft keyboard).
 *   C — shared-bar regression guard: a focused non-persistent field still
 *       dispatches, and the persistent field is NOT mis-targeted (GREEN before+after).
 *   D — Heading, no focus → two-step (open dropdown, choose H1) adds '# ' (RED now).
 *   E — cold caret, no focus, no pre-set selection → action lands at end-of-document
 *       ('cold****'), proving a deterministic caret rather than the engine default.
 *   F — focused-then-BLURRED field keeps its caret: a blurred textarea retains its
 *       selectionStart/End, so a returning user's mid-document caret must be
 *       preserved — the end-of-document anchor applies ONLY to a never-focused
 *       field, never to one that was focused and blurred (R3 WR-01 falsifier).
 *
 * Run: node tests/46-persistent-bar-dispatch.test.js
 * Exits 0 on full pass, 1 on any failure (the tests/run-all.js contract).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const REPO = path.resolve(__dirname, '..');
function asset(rel) { return fs.readFileSync(path.join(REPO, rel), 'utf8'); }

// Build a fresh window with the two real modules loaded in index.html order, a
// persistent field (taP, the export-editor analogue) and a shared note-field
// analogue (taS). Fresh per case so the module singleton's state never leaks.
function makeEnv() {
  const dom = new JSDOM(
    '<!DOCTYPE html><body><div id="host">' +
      '<textarea id="taP"></textarea><textarea id="taS"></textarea>' +
    '</div></body>',
    { url: 'https://example.test/', pretendToBeVisual: true, runScripts: 'outside-only' }
  );
  const win = dom.window;
  // Desktop pointer (not coarse) so the toolbar's keyboard path is live (matches
  // the snippets harness — irrelevant to the button path but keeps parity).
  win.matchMedia = win.matchMedia || function () {
    return { matches: false, addListener() {}, removeListener() {} };
  };
  // jsdom does not implement execCommand; force TextEdit's deterministic splice
  // fallback (which fires a real input event) so edits are observable headlessly.
  win.document.execCommand = function () { return false; };
  // Pass-through t() so i18n never blocks.
  win.App = { t(k) { return k; } };
  win.eval(asset('assets/text-edit.js'));
  win.eval(asset('assets/rich-toolbar.js'));
  const taP = win.document.getElementById('taP');
  const taS = win.document.getElementById('taS');
  // The export editor mounts persistent (its own always-docked bar); the note
  // field shares the focus-attached bar.
  win.RichToolbar.mount([taP], { headings: true, persistent: true });
  win.RichToolbar.mount([taS], { headings: true });
  return { win, taP, taS };
}

// The persistent bar docks `beforebegin` its field, so it is taP.previousElementSibling.
function persistentBar(taP) { return taP.previousElementSibling; }

// Dispatch a real cancelable mousedown (NOT .click()) — the toolbar binds mousedown.
function mousedown(win, el) {
  el.dispatchEvent(new win.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
}

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS  ' + name); }
  catch (err) { failed++; console.log('FAIL  ' + name); console.log('      ' + (err && err.message || err)); }
}

// ── Additive-surface guard (public API unchanged) ───────────────────────────
test('public surface: mount / unmount / refreshButtonState remain functions', function () {
  const { win } = makeEnv();
  assert.strictEqual(typeof win.RichToolbar.mount, 'function', 'mount preserved');
  assert.strictEqual(typeof win.RichToolbar.unmount, 'function', 'unmount preserved');
  assert.strictEqual(typeof win.RichToolbar.refreshButtonState, 'function', 'refreshButtonState preserved');
});

// ── Case A — Bold with NO prior focus (RED now) ─────────────────────────────
test('Case A: persistent Bold applies on first click with no prior focus', function () {
  const { win, taP } = makeEnv();
  taP.value = 'text';
  taP.setSelectionRange(0, 4);
  const bar = persistentBar(taP);
  assert.ok(bar && bar.classList.contains('rich-toolbar') && !bar.classList.contains('is-hidden'),
    'the persistent bar is docked above taP and visible');
  const boldBtn = bar.querySelector('.rich-toolbar-btn[data-action="bold"]');
  assert.ok(boldBtn, 'bold button present on the persistent bar');
  mousedown(win, boldBtn);
  assert.strictEqual(taP.value, '**text**', 'bold wrapped the persistent field with no prior focus');
});

// ── Case B — Preview with NO prior focus, view-only (RED now) ────────────────
test('Case B: persistent Preview opens the pane on first click and does NOT focus the field', function () {
  const { win, taP } = makeEnv();
  taP.value = 'hello';
  const bar = persistentBar(taP);
  const previewSeg = bar.querySelector('.rich-toolbar-swap-btn[data-mode="preview"]');
  assert.ok(previewSeg, 'preview mode segment present on the persistent bar');
  mousedown(win, previewSeg);
  assert.ok(taP._notePreview, 'a preview pane was created for the persistent field');
  assert.ok(!taP._notePreview.classList.contains('is-hidden'), 'the preview pane is visible');
  assert.strictEqual(previewSeg.getAttribute('aria-pressed'), 'true', 'preview segment reports aria-pressed=true');
  assert.ok(previewSeg.classList.contains('is-active'), 'preview segment is is-active (current-state)');
  // The pane must render the field's ACTUAL content — presence/visibility alone
  // would pass an empty or stale pane (R3 IN-02).
  assert.ok(/hello/.test(taP._notePreview.textContent),
    'the preview pane rendered the field value');
  // Preview is view-only: it must NOT focus the field (guards the soft-keyboard rule).
  assert.notStrictEqual(win.document.activeElement, taP, 'preview did NOT focus the field');
});

// ── Case C — shared-bar regression guard (GREEN before AND after) ───────────
test('Case C: focused shared field still dispatches; persistent field NOT mis-targeted', function () {
  const { win, taP, taS } = makeEnv();
  taP.value = 'persist'; // must stay untouched by a shared-bar action
  taS.focus();
  // jsdom may not fire focusin on programmatic focus in every version — dispatch
  // a bubbling focusin so the module docks the shared bar and sets _focused=taS.
  taS.dispatchEvent(new win.Event('focusin', { bubbles: true }));
  taS.value = 'shared';
  taS.setSelectionRange(0, 6);
  const sharedBar = taS.previousElementSibling;
  assert.ok(sharedBar && sharedBar.classList.contains('rich-toolbar') && !sharedBar.classList.contains('is-hidden'),
    'the shared bar is docked above the focused note field');
  const boldBtn = sharedBar.querySelector('.rich-toolbar-btn[data-action="bold"]');
  mousedown(win, boldBtn);
  assert.strictEqual(taS.value, '**shared**', 'the shared bar still wraps its focused field');
  assert.strictEqual(taP.value, 'persist', 'the persistent field was NOT mis-targeted by the shared-bar action');
});

// ── Case D — Heading with NO prior focus (RED now) ──────────────────────────
test('Case D: persistent Heading (open dropdown → H1) applies with no prior focus', function () {
  const { win, taP } = makeEnv();
  taP.value = 'a heading line';
  const bar = persistentBar(taP);
  const headingTrigger = bar.querySelector('.rich-toolbar-btn[data-action="heading"]');
  assert.ok(headingTrigger, 'heading trigger present on the persistent bar');
  mousedown(win, headingTrigger); // open the dropdown
  const h1 = win.document.querySelector('.rich-toolbar-heading-item[data-level="1"]');
  assert.ok(h1, 'the heading dropdown opened and exposes the H1 item');
  mousedown(win, h1); // choose Heading 1
  assert.strictEqual(taP.value, '# a heading line', 'H1 prefixed the persistent field with no prior focus');
});

// ── Case E — cold caret at end-of-document (RED now) ────────────────────────
test('Case E: with no pre-set selection the action lands at end-of-document (cold caret)', function () {
  const { win, taP } = makeEnv();
  taP.value = 'cold'; // deliberately NO setSelectionRange — leave the engine default
  const bar = persistentBar(taP);
  const boldBtn = bar.querySelector('.rich-toolbar-btn[data-action="bold"]');
  mousedown(win, boldBtn);
  assert.strictEqual(taP.value, 'cold****',
    'bold-with-no-selection inserted the marker pair at end-of-document (deterministic cold caret)');
});

// ── Case F — focused-then-blurred field keeps its mid-document caret (WR-01) ─
// A blurred textarea RETAINS selectionStart/End. The end-of-document anchor must
// key on "never focused", not "not currently focused" — otherwise a user who set a
// mid-document caret, blurred via a non-preventDefault control (Back/close/modal
// chrome), and returned to click Bold gets the edit silently relocated to the end.
test('Case F: focused-then-blurred field keeps its mid-document caret on a persistent-bar click', function () {
  const { win, taP } = makeEnv();
  taP.value = 'ab cd';
  taP.focus();
  // Ensure the module observes the focus (jsdom may not fire focusin on .focus()).
  taP.dispatchEvent(new win.Event('focusin', { bubbles: true }));
  taP.setSelectionRange(2, 2); // collapsed mid-document caret
  taP.blur();                  // blur preserves the textarea's selection
  assert.notStrictEqual(win.document.activeElement, taP, 'precondition: field is blurred');
  assert.strictEqual(taP.selectionStart, 2, 'precondition: blurred textarea retained its caret');
  const bar = persistentBar(taP);
  const boldBtn = bar.querySelector('.rich-toolbar-btn[data-action="bold"]');
  mousedown(win, boldBtn);
  assert.strictEqual(taP.value, 'ab**** cd',
    'bold pair inserted at the PRESERVED mid-document caret, not relocated to end-of-document');
});

// ── Case G — a click on the bar's EMPTY area must not blur the field ─────────
// The focus-preservation mousedown+preventDefault was bound per-CONTROL only, so
// a click on the bar's own padding / inter-button gaps / the strip past the last
// control fell through and stole focus: on the shared focus-attached bar that
// focusout hides the bar and shifts the layout up. The fix binds
// mousedown+preventDefault on the bar CONTAINER too. defaultPrevented is the
// load-bearing signal — a prevented mousedown never moves focus off the field.
test('Case G: mousedown on the shared bar container empty area is preventDefault-ed', function () {
  const { win, taS } = makeEnv();
  taS.focus();
  // jsdom may not fire focusin on programmatic focus — dispatch it so the module
  // docks the shared focus-attached bar above the field.
  taS.dispatchEvent(new win.Event('focusin', { bubbles: true }));
  const bar = taS.previousElementSibling;
  assert.ok(bar && bar.classList.contains('rich-toolbar') && !bar.classList.contains('is-hidden'),
    'the shared focus-attached bar is docked above the focused field');
  // Click the bar's OWN empty area (target = the bar container, not a control).
  const barEv = new win.MouseEvent('mousedown', { bubbles: true, cancelable: true });
  bar.dispatchEvent(barEv);
  assert.strictEqual(barEv.defaultPrevented, true,
    'mousedown on the bar container is prevented, so the empty-area click never blurs the field');
  // Regression guard: a mousedown on a control is still prevented (existing
  // per-control focus-preservation must keep firing; preventDefault is idempotent).
  const boldBtn = bar.querySelector('.rich-toolbar-btn[data-action="bold"]');
  const btnEv = new win.MouseEvent('mousedown', { bubbles: true, cancelable: true });
  boldBtn.dispatchEvent(btnEv);
  assert.strictEqual(btnEv.defaultPrevented, true,
    'mousedown on a control is still prevented (per-control focus-preservation regression guard)');
});

// The persistent (export) bar shares the same builder, so its container is guarded too.
test('Case H: mousedown on the persistent bar container empty area is preventDefault-ed', function () {
  const { win, taP } = makeEnv();
  const bar = persistentBar(taP);
  const barEv = new win.MouseEvent('mousedown', { bubbles: true, cancelable: true });
  bar.dispatchEvent(barEv);
  assert.strictEqual(barEv.defaultPrevented, true,
    'mousedown on the persistent bar container is prevented (shared buildToolbar guard)');
});

console.log('\n46-persistent-bar-dispatch: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
