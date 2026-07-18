/**
 * tests/46.1-format-in-preview.test.js — formatting-in-preview return-and-apply +
 * the pinned-outside-strip structure (RTXT-01). RED-first: the current shipped
 * source has no mode switcher and no scrollable control strip, so these outcomes
 * fail today; the implementation plans make them green.
 *
 * WHAT THIS PINS (outcomes only — DOM state, never module internals):
 *   - Return-and-apply (one gesture): clicking a FORMATTING button while previewing
 *     returns to Edit (the edit segment is is-active, the textarea is visible) AND
 *     applies the action to the field value (bold adds ** markers).
 *   - Pinned-outside-strip (structure): the mode switcher segments ([data-mode]) are
 *     NOT descendants of the horizontally-scrollable control strip (.rich-toolbar-
 *     scroll), while the formatting buttons ARE inside it — this is why Preview
 *     stays visible while the formatting buttons scroll on phone widths.
 *
 * HARNESS cloned from tests/46-persistent-bar-dispatch.test.js (fresh JSDOM per
 * case; md-render.js eval'd before rich-toolbar.js; execCommand stubbed to force
 * TextEdit's splice fallback; pass-through App.t). Controls activate via a real
 * `mousedown` MouseEvent (the toolbar binds mousedown, not click).
 * Run: node tests/46.1-format-in-preview.test.js — RED against current source.
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

// ── Return-and-apply: format while previewing → back to edit + applied ───────────
test('clicking Bold while previewing returns to Edit and applies bold in one gesture', function () {
  const { win, taP } = makeEnv();
  taP.value = 'text';
  taP.setSelectionRange(0, 4);
  const bar = persistentBar(taP);
  const previewSeg = segment(bar, 'preview');
  assert.ok(previewSeg, 'the bar exposes a Preview mode segment');
  mousedown(win, previewSeg);
  assert.ok(taP.classList.contains('is-hidden'), 'precondition: previewing (textarea hidden)');
  const boldBtn = bar.querySelector('.rich-toolbar-btn[data-action="bold"]');
  assert.ok(boldBtn, 'the Bold formatting button is present on the bar');
  mousedown(win, boldBtn);
  const editSeg = segment(bar, 'edit');
  assert.ok(editSeg && editSeg.classList.contains('is-active'),
    'the mode returned to Edit (edit segment is-active) after clicking a formatting button');
  assert.ok(!taP.classList.contains('is-hidden'),
    'the textarea is visible again (returned to edit)');
  assert.ok(/\*\*/.test(taP.value),
    'the bold markers were applied to the field value in the same gesture');
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
  const boldBtn = bar.querySelector('.rich-toolbar-btn[data-action="bold"]');
  assert.ok(boldBtn, 'the Bold button exists');
  assert.ok(strip.contains(boldBtn),
    'the formatting buttons ARE inside the scroll strip (they scroll beneath the pinned switcher)');
});

console.log('\n46.1-format-in-preview: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
