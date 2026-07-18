/**
 * tests/46.1-switcher-current-state.test.js — the CURRENT-STATE mode switcher
 * contract (RTXT-04, Gap-14 falsifier). RED-first: the current shipped source has
 * a single target-labelled preview TOGGLE (eye/pencil, "Preview"/"Edit"), not a
 * two-segment current-state switcher; these outcomes fail today and go green only
 * when the toolbar is rewired to a segmented Edit/Preview control.
 *
 * WHY THIS SHAPE: the rejected design turned a SINGLE toggle green while it was
 * LABELLED with the OTHER mode (a "Preview" button lit up while already previewing).
 * The ratified model is two segments where the ACTIVE segment is always the mode
 * you are CURRENTLY in. This test fails any single-target-toggle shape:
 *   - exactly two mode segments exist ([data-mode="edit"] and [data-mode="preview"]);
 *   - while editing, the edit segment is is-active and preview is not;
 *   - after entering preview, the preview segment is is-active and edit is not;
 *   - the active segment's OWN data-mode equals the current mode (never a green
 *     segment that names the opposite mode), and the two segments carry distinct
 *     labels.
 *
 * Outcomes only — DOM class/state, never module internals. Controls activate via a
 * real `mousedown` MouseEvent (the toolbar binds mousedown, not click).
 * Run: node tests/46.1-switcher-current-state.test.js — RED against current source.
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

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS  ' + name); }
  catch (err) { failed++; console.log('FAIL  ' + name); console.log('      ' + (err && err.message || err)); }
}

// ── Exactly two mode segments, resolvable by data-mode ───────────────────────────
test('the bar renders exactly two mode segments (edit + preview)', function () {
  const { taP } = makeEnv();
  const bar = persistentBar(taP);
  const segs = bar.querySelectorAll('[data-mode]');
  assert.strictEqual(segs.length, 2, 'exactly two mode controls exist on the bar');
  assert.ok(segment(bar, 'edit'), 'an Edit segment is resolvable by [data-mode="edit"]');
  assert.ok(segment(bar, 'preview'), 'a Preview segment is resolvable by [data-mode="preview"]');
});

// ── Current-state, not target-state ──────────────────────────────────────────────
test('while editing the edit segment is is-active and preview is not', function () {
  const { taP } = makeEnv();
  const bar = persistentBar(taP);
  const editSeg = segment(bar, 'edit');
  const previewSeg = segment(bar, 'preview');
  assert.ok(editSeg && previewSeg, 'both mode segments exist');
  assert.ok(editSeg.classList.contains('is-active'),
    'the edit segment is is-active while editing (current-state)');
  assert.ok(!previewSeg.classList.contains('is-active'),
    'the preview segment is NOT is-active while editing');
});

test('after entering preview the preview segment is is-active and edit is not', function () {
  const { win, taP } = makeEnv();
  taP.value = 'body';
  const bar = persistentBar(taP);
  const previewSeg = segment(bar, 'preview');
  assert.ok(previewSeg, 'the Preview segment exists');
  mousedown(win, previewSeg);
  const editSeg = segment(bar, 'edit');
  assert.ok(previewSeg.classList.contains('is-active'),
    'the preview segment is is-active after entering preview (current-state)');
  assert.ok(editSeg && !editSeg.classList.contains('is-active'),
    'the edit segment is NOT is-active while previewing');
  // Current-state is corroborated by the in-place swap: the textarea carries the
  // is-hidden marker exactly when the preview segment is the active mode.
  assert.ok(taP.classList.contains('is-hidden'),
    'the textarea is is-hidden while the preview segment is active (in-place swap)');
});

// ── The active segment's own data-mode equals the current mode; labels differ ────
test('the active segment names the mode it represents (never the opposite), labels distinct', function () {
  const { win, taP } = makeEnv();
  taP.value = 'body';
  const bar = persistentBar(taP);
  const editSeg = segment(bar, 'edit');
  const previewSeg = segment(bar, 'preview');
  assert.ok(editSeg && previewSeg, 'both mode segments exist');
  // Distinct, non-empty labels (the edit segment reads the Edit copy, the preview
  // segment the Preview copy — never one target-labelled toggle for both).
  const editLabel = (editSeg.textContent || '').trim();
  const previewLabel = (previewSeg.textContent || '').trim();
  assert.ok(editLabel.length > 0 && previewLabel.length > 0, 'both segments carry a label');
  assert.notStrictEqual(editLabel, previewLabel, 'the two segments carry distinct labels');
  // While editing, the ACTIVE segment's own data-mode is "edit".
  let active = bar.querySelector('[data-mode].is-active');
  assert.ok(active, 'an active segment exists while editing');
  assert.strictEqual(active.getAttribute('data-mode'), 'edit',
    'the active segment names the CURRENT mode (edit), not the target');
  // After entering preview, the active segment's own data-mode is "preview".
  mousedown(win, previewSeg);
  active = bar.querySelector('[data-mode].is-active');
  assert.ok(active, 'an active segment exists while previewing');
  assert.strictEqual(active.getAttribute('data-mode'), 'preview',
    'the active segment names the CURRENT mode (preview), not the target');
});

console.log('\n46.1-switcher-current-state: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
