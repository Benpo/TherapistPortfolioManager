/**
 * Quick 260516-g7p Bug #2 — Behavior test: snippet expansion works in the
 * export modal's live editor (#exportEditor) exactly as it does in the
 * session-form textareas.
 *
 * FALSIFIABLE (project convention MEMORY:feedback-behavior-verification):
 *
 *   Test A (structural-but-load-bearing): add-session.html's
 *     <textarea id="exportEditor"> MUST carry data-snippets="true" (parity
 *     with the 7 session-form textareas). Fails BEFORE the fix (attribute
 *     absent) → #exportEditor is never picked up by Snippets.init().
 *   Test B (source contract): openExportDialog() in assets/add-session.js
 *     defensively binds the editor via window.Snippets.bindTextarea(...).
 *   Test C (behavior — causal): load assets/snippets.js in a vm sandbox.
 *     A textarea BOUND via Snippets.bindTextarea expands a known trigger
 *     on input (`;betrayal ` → the snippet expansion). An UNBOUND textarea
 *     with the IDENTICAL input does NOT expand. The contrast proves the
 *     binding is the causal fix, not a constant — i.e. the export editor,
 *     once bound, behaves identically to a session-form textarea.
 *
 * Run: node tests/quick-260516-g7p-export-editor-snippets.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err.message}`); failed++; }
}

// ────────────────────────────────────────────────────────────────────
// Test A — #exportEditor carries data-snippets="true"
// ────────────────────────────────────────────────────────────────────

const HTML = fs.readFileSync(path.join(ROOT, 'add-session.html'), 'utf8');

test('A: <textarea id="exportEditor"> carries data-snippets="true" (session-form parity)', () => {
  const m = HTML.match(/<textarea\b[^>]*\bid="exportEditor"[^>]*>/i);
  assert.ok(m, 'could not find the <textarea id="exportEditor"> element');
  assert.ok(
    /\bdata-snippets="true"/i.test(m[0]),
    'the export editor textarea must carry data-snippets="true" so ' +
    'Snippets.init() binds it (the 7 session-form textareas have it; this one did not).'
  );
});

// ────────────────────────────────────────────────────────────────────
// Test B — openExportDialog defensively binds the editor
// ────────────────────────────────────────────────────────────────────

const ADD_SESSION_SRC = fs.readFileSync(path.join(ROOT, 'assets', 'add-session.js'), 'utf8');

test('B: add-session.js calls window.Snippets.bindTextarea on the export editor', () => {
  assert.ok(
    /Snippets\.bindTextarea\s*\(/.test(ADD_SESSION_SRC),
    'openExportDialog() must defensively call window.Snippets.bindTextarea(editor) ' +
    '(idempotent — guarded by the internal _bound WeakMap).'
  );
});

// ────────────────────────────────────────────────────────────────────
// Test C — behavior: bound textarea expands; unbound does NOT.
// Load the REAL assets/snippets.js in a vm sandbox.
// ────────────────────────────────────────────────────────────────────

// Minimal fake textarea supporting the listener + value API snippets.js uses.
function makeTextarea() {
  const listeners = {};
  return {
    tagName: 'TEXTAREA',
    value: '',
    selectionStart: 0,
    selectionEnd: 0,
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener(type, fn) {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter((f) => f !== fn);
    },
    setSelectionRange(s, e) { this.selectionStart = s; this.selectionEnd = e; },
    dispatchEvent(evt) {
      const type = evt && evt.type;
      (listeners[type] || []).forEach((fn) => fn({ target: this, type }));
      return true;
    },
    // helper for the test: type text and fire a real 'input' event
    _type(str) {
      this.value += str;
      this.selectionStart = this.value.length;
      this.selectionEnd = this.value.length;
      (listeners.input || []).forEach((fn) => fn({ target: this, type: 'input' }));
    },
  };
}

const SNIPPET = {
  id: 's-betrayal',
  trigger: 'betrayal',
  expansions: { en: 'Betrayal — a deep wound to trust.', he: '', de: '', cs: '' },
  tags: [],
  origin: 'seed',
};

function loadSnippets() {
  const storage = (() => {
    const map = new Map();
    return {
      getItem(k) { return map.has(k) ? map.get(k) : null; },
      setItem(k, v) { map.set(k, String(v)); },
      removeItem(k) { map.delete(k); },
    };
  })();
  // Default locale → en so resolveExpansion returns the English expansion.
  storage.setItem('portfolioLang', 'en');

  const sandbox = {
    window: { App: { getSnippets() { return [SNIPPET]; } } },
    document: {
      addEventListener() {}, removeEventListener() {},
      getElementById() { return null; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      createElement() {
        return {
          setAttribute() {}, appendChild() {}, append() {},
          addEventListener() {}, style: {},
          classList: { add() {}, remove() {} },
        };
      },
      body: { prepend() {}, appendChild() {} },
      head: { appendChild() {} },
    },
    localStorage: storage,
    Event: function (type) { return { type }; },
    console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, Promise, JSON, Math, Date,
    Array, Object, Set, Map, WeakMap, RegExp, String, Number, Boolean,
  };
  sandbox.window.localStorage = storage;
  vm.createContext(sandbox);
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'snippets.js'), 'utf8');
  vm.runInContext(src, sandbox, { filename: 'assets/snippets.js' });
  return sandbox.window.Snippets;
}

test('C0: window.Snippets.bindTextarea is a public function', () => {
  const S = loadSnippets();
  assert.ok(S && typeof S.bindTextarea === 'function',
    'snippets.js must expose window.Snippets.bindTextarea');
});

test('C1: a BOUND textarea expands ";betrayal " → the snippet expansion', () => {
  const S = loadSnippets();
  const ta = makeTextarea();
  S.bindTextarea(ta);                 // <-- the causal binding the fix guarantees
  ta._type(';betrayal ');             // prefix + trigger + boundary char
  assert.ok(
    ta.value.indexOf('Betrayal — a deep wound to trust.') !== -1,
    `bound editor must expand the trigger; got: ${JSON.stringify(ta.value)}`
  );
  assert.ok(ta.value.indexOf(';betrayal') === -1,
    'the typed `;betrayal` token must be replaced by the expansion');
});

test('C2: an UNBOUND textarea with the SAME input does NOT expand (proves binding is causal)', () => {
  const S = loadSnippets();
  const ta = makeTextarea();
  // intentionally NOT bound
  ta._type(';betrayal ');
  assert.strictEqual(ta.value, ';betrayal ',
    `unbound textarea must remain literal text; got: ${JSON.stringify(ta.value)} ` +
    `— if this expanded, the test is not proving the binding is the cause`);
  void S;
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log(`quick-260516-g7p export-editor-snippets — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
