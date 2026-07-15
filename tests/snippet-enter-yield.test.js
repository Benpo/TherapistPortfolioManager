/**
 * tests/snippet-enter-yield.test.js — Enter/Tab arbitration between the snippets
 * autocomplete and the toolbar's list mechanics.
 *
 * THE COLLISION THIS GUARDS: inside a list line, accepting a snippet suggestion
 * with Enter used to BOTH expand the snippet (snippets.js) AND continue the list
 * (rich-toolbar.js), because both bind a bubble-phase keydown on the same
 * textarea. The fix makes the list auto-continue YIELD when the snippets popover
 * is committing — snippet accept wins; plain Enter still continues the list.
 *
 * REAL REGISTRATION ORDER (load-bearing): snippets binds its keydown FIRST and
 * commits SYNCHRONOUSLY — preventDefault, insert the expansion, hide the popover,
 * clear its state — all before the toolbar's keydown handler runs. So by the time
 * the toolbar sees the event the popover is ALREADY closed; `ev.defaultPrevented`
 * is the only signal that survives. This test reproduces that order exactly:
 * Snippets.bindTextarea FIRST, RichToolbar.mount SECOND, on a real jsdom textarea,
 * with the popover GENUINELY open (a partial trigger typed via a real input
 * event). Stubbing the open-state accessor is FORBIDDEN — a stub-true test would
 * pass while an open-state-only implementation fails in production.
 *
 * Run: node tests/snippet-enter-yield.test.js
 * Exits 0 on full pass, 1 on any failure (the tests/run-all.js contract).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const REPO = path.resolve(__dirname, '..');
function asset(rel) { return fs.readFileSync(path.join(REPO, rel), 'utf8'); }

// Build a fresh window with the three real modules loaded in index.html order and
// a single snippet available, in REAL registration order (snippets bound first).
function makeEnv() {
  const dom = new JSDOM(
    '<!DOCTYPE html><body><div id="host"><textarea id="ta"></textarea></div></body>',
    { url: 'https://example.test/', pretendToBeVisual: true, runScripts: 'outside-only' }
  );
  const win = dom.window;
  // Desktop pointer (not coarse) so the toolbar's keyboard path is live.
  win.matchMedia = win.matchMedia || function () {
    return { matches: false, addListener() {}, removeListener() {} };
  };
  // jsdom does not implement execCommand; force the deterministic splice fallback
  // in TextEdit.editInsert (which fires a real input event) so list continuation
  // is observable headlessly.
  win.document.execCommand = function () { return false; };
  // One snippet with an EN expansion; a pass-through t() so i18n never blocks.
  win.App = {
    getSnippets() {
      return [{ id: 'greeting', trigger: 'greeting', tags: [], expansions: { en: 'Hello there' } }];
    },
    t(k) { return k; },
  };
  win.eval(asset('assets/text-edit.js'));
  win.eval(asset('assets/snippets.js'));
  win.eval(asset('assets/rich-toolbar.js'));
  const ta = win.document.getElementById('ta');
  // Real order: snippets binds keydown FIRST, then the toolbar mounts SECOND.
  win.Snippets.bindTextarea(ta);
  win.RichToolbar.mount([ta]);
  return { win, ta };
}

// Set the value + caret and fire a real input event so snippets' trigger
// detection runs exactly as it does while typing.
function typeInto(win, ta, value, caret) {
  ta.value = value;
  ta.selectionStart = ta.selectionEnd = (caret == null ? value.length : caret);
  ta.dispatchEvent(new win.Event('input', { bubbles: true }));
}

// Dispatch a real cancelable keydown so preventDefault sets defaultPrevented for
// the following listener (mirrors the production event flow).
function pressKey(win, ta, key, opts) {
  const ev = new win.KeyboardEvent('keydown', Object.assign({ key, bubbles: true, cancelable: true }, opts || {}));
  ta.dispatchEvent(ev);
  return ev;
}

// ── i18n parity for the new preview-toggle label key ────────────────────────
// There is no general full-key parity gate; the new key needs its own pinned
// assertion across all four locales (the NEW_KEYS idiom).
function loadLocales() {
  const sb = { window: { I18N: {}, QUOTES: {} }, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sb);
  for (const loc of ['en', 'he', 'de', 'cs']) {
    vm.runInContext(asset('assets/i18n-' + loc + '.js'), sb, { filename: 'i18n-' + loc + '.js' });
  }
  return sb.window.I18N;
}

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('PASS  ' + name); }
  catch (err) { failed++; console.log('FAIL  ' + name); console.log('      ' + (err && err.message || err)); }
}

// ── Additive-only surface (RTXT-09 danger zone stays intact) ────────────────
test('Snippets.isPopoverOpen is an additive public method; pure exports untouched', function () {
  const { win } = makeEnv();
  assert.strictEqual(typeof win.Snippets.isPopoverOpen, 'function', 'isPopoverOpen must be exposed');
  assert.strictEqual(typeof win.Snippets.__testExports.detectTrigger, 'function', 'detectTrigger export preserved');
  assert.strictEqual(typeof win.Snippets.__testExports.resolveExpansion, 'function', 'resolveExpansion export preserved');
  assert.strictEqual(typeof win.Snippets.bindTextarea, 'function', 'bindTextarea preserved');
});

test('isPopoverOpen() flips true while the popover shows and false after Escape', function () {
  const { win, ta } = makeEnv();
  assert.strictEqual(win.Snippets.isPopoverOpen(), false, 'closed before any input');
  typeInto(win, ta, '- ;gr');
  assert.strictEqual(win.Snippets.isPopoverOpen(), true, 'open after a partial trigger is typed');
  pressKey(win, ta, 'Escape');
  assert.strictEqual(win.Snippets.isPopoverOpen(), false, 'closed after Escape');
});

test('Enter with popover OPEN in a list: snippet accepted, NO new list item', function () {
  const { win, ta } = makeEnv();
  typeInto(win, ta, '- ;gr');
  assert.strictEqual(win.Snippets.isPopoverOpen(), true, 'precondition: popover open');
  const ev = pressKey(win, ta, 'Enter');
  assert.ok(ev.defaultPrevented, 'snippets committed and prevented the Enter');
  assert.ok(ta.value.indexOf('Hello there') !== -1, 'expansion was inserted');
  assert.strictEqual(ta.value.indexOf('\n'), -1, 'the list did NOT gain a second marker line');
  assert.strictEqual(win.Snippets.isPopoverOpen(), false, 'popover closed after commit');
});

test('Enter with popover CLOSED in a list: the list continues as before', function () {
  const { win, ta } = makeEnv();
  typeInto(win, ta, '- item');
  assert.strictEqual(win.Snippets.isPopoverOpen(), false, 'precondition: popover closed');
  const ev = pressKey(win, ta, 'Enter');
  assert.ok(ev.defaultPrevented, 'toolbar took over the Enter for list continuation');
  assert.ok(ta.value.indexOf('\n- ') !== -1, 'a new list marker line was added');
});

test('Tab with popover OPEN in a list: snippet accepted, NO indent', function () {
  const { win, ta } = makeEnv();
  typeInto(win, ta, '- ;gr');
  assert.strictEqual(win.Snippets.isPopoverOpen(), true, 'precondition: popover open');
  const ev = pressKey(win, ta, 'Tab');
  assert.ok(ev.defaultPrevented, 'snippets committed and prevented the Tab');
  assert.ok(ta.value.indexOf('Hello there') !== -1, 'expansion was inserted');
  assert.ok(/^[-*] /.test(ta.value), 'the list line was NOT indented (still flush-left)');
});

test('Tab with popover CLOSED on a list line: the line indents as before', function () {
  const { win, ta } = makeEnv();
  typeInto(win, ta, '- item');
  assert.strictEqual(win.Snippets.isPopoverOpen(), false, 'precondition: popover closed');
  const ev = pressKey(win, ta, 'Tab');
  assert.ok(ev.defaultPrevented, 'toolbar indented the list line');
  assert.ok(/^ {2}[-*] /.test(ta.value), 'the list line indented by two spaces');
});

test('pinned-key parity: toolbar.backToEdit present + non-empty in all four locales', function () {
  const I18N = loadLocales();
  for (const loc of ['en', 'he', 'de', 'cs']) {
    const map = I18N[loc];
    assert.ok(map && typeof map === 'object', 'i18n-' + loc + ' loaded');
    const v = map['toolbar.backToEdit'];
    assert.ok(typeof v === 'string' && v.trim().length > 0, 'toolbar.backToEdit present + non-empty in ' + loc);
  }
});

console.log('\nsnippet-enter-yield: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
