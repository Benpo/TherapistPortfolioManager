/**
 * Quick task 260620-p3f — Behavior test: snippet editor flushes the pending
 * (typed-but-uncommitted) tag on Save.
 *
 * Bug: a user who types a tag and clicks Save WITHOUT first pressing
 * Enter/comma/Tab loses the tag. handleSave() read tags via readEditorTags(),
 * which only collects committed <li> chips — the text still in
 * #snippetEditorTagsTextInput was never flushed, so it was silently dropped
 * (the "saved" toast still fired).
 *
 * Loads assets/settings.js in a vm sandbox (zero-dependency, matches the
 * project's other settings/snippet tests — no jsdom in the repo) and reads:
 *   - window.__SnippetEditorHelpers.pendingTagToCommit  (pure normalize/dedupe)
 *   - window.__SnippetEditorHelpers.commitPendingTag    (DOM flush)
 *
 * Falsifiable: PRE-change both helpers are undefined (RED). POST-change the
 * pure normalization and the DOM flush behave per spec (GREEN).
 *
 * Run: node tests/quick-260620-p3f-pending-tag-commit.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ── Capable fake DOM ──────────────────────────────────────────────────────
// A registry-backed getElementById plus nodes that track children + attributes,
// enough to exercise buildTagChip + readEditorTags + commitPendingTag without
// a real DOM. settings.js only touches these inside the helper at call time,
// so a registry swapped in after load is sufficient.
const elementRegistry = {};
function makeNode() {
  const attrs = {};
  return {
    attrs,
    children: [],
    className: '',
    type: '',
    textContent: '',
    value: '',
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
    appendChild(child) { this.children.push(child); return child; },
    removeChild(child) { this.children = this.children.filter((c) => c !== child); return child; },
    remove() {},
    addEventListener() {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    style: {},
    focus() {},
  };
}

const sandbox = {
  window: {},
  document: {
    addEventListener() {},
    removeEventListener() {},
    getElementById(id) { return Object.prototype.hasOwnProperty.call(elementRegistry, id) ? elementRegistry[id] : null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return makeNode(); },
    body: { prepend() {}, appendChild() {} },
    head: { appendChild() {} },
  },
  console: { error() {}, warn() {}, log() {} },
  localStorage: { getItem() { return null; }, setItem() {} },
  setTimeout, clearTimeout, Promise,
};
vm.createContext(sandbox);

const snippetsSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings-snippets.js'), 'utf8');
const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'settings.js'), 'utf8');
try {
  vm.runInContext(snippetsSrc, sandbox, { filename: 'assets/settings-snippets.js' });
  vm.runInContext(src, sandbox, { filename: 'assets/settings.js' });
} catch (err) {
  console.error('FATAL: assets/settings.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const helpers = sandbox.window.__SnippetEditorHelpers;
if (!helpers || typeof helpers.pendingTagToCommit !== 'function' || typeof helpers.commitPendingTag !== 'function') {
  console.error('FAIL: window.__SnippetEditorHelpers.{pendingTagToCommit,commitPendingTag} are not exposed.');
  console.error('      The fix must add a pendingTagToCommit pure helper + commitPendingTag DOM flush,');
  console.error('      call commitPendingTag() in handleSave() before readEditorTags(), and export both.');
  process.exit(1);
}
const { pendingTagToCommit, commitPendingTag } = helpers;

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) { passed++; }
  else { failed++; console.error('FAIL: ' + name); }
}
function eq(name, got, want) {
  check(name + ' (got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want) + ')', got === want);
}

// ── Part 1: pure pendingTagToCommit ───────────────────────────────────────
eq('new tag returned',                 pendingTagToCommit([], 'anxiety'),            'anxiety');
eq('trimmed + lowercased',             pendingTagToCommit([], '  Anxiety  '),        'anxiety');
eq('empty string -> null',             pendingTagToCommit([], ''),                   null);
eq('whitespace only -> null',          pendingTagToCommit([], '   '),                null);
eq('null/undefined raw -> null',       pendingTagToCommit([], null),                 null);
eq('exact duplicate -> null',          pendingTagToCommit(['anxiety'], 'anxiety'),   null);
eq('case-insensitive duplicate -> null', pendingTagToCommit(['anxiety'], 'ANXIETY'), null);
eq('new among existing returned',      pendingTagToCommit(['anxiety'], 'calm'),      'calm');
eq('non-array committed tolerated',    pendingTagToCommit(undefined, 'fear'),        'fear');

// ── Part 2: commitPendingTag DOM flush (the user-facing regression) ────────
const input = makeNode();
const list = makeNode();
elementRegistry['snippetEditorTagsTextInput'] = input;
elementRegistry['snippetEditorTagsList'] = list;

// User typed a tag but did NOT press Enter; commitPendingTag runs on Save.
input.value = 'anxiety';
commitPendingTag();
eq('flush appends exactly one chip',   list.children.length,                         1);
eq('chip carries data-tag',            list.children[0] && list.children[0].getAttribute('data-tag'), 'anxiety');
eq('input cleared after flush',        input.value,                                  '');

// Idempotent: a second flush of the same value must not duplicate.
input.value = 'anxiety';
commitPendingTag();
eq('no duplicate on repeated flush',   list.children.length,                         1);

// Blank input flush is a no-op (and clears input harmlessly).
input.value = '   ';
commitPendingTag();
eq('blank flush adds nothing',         list.children.length,                         1);

// A genuinely new typed tag flushes alongside the existing chip.
input.value = 'Calm';
commitPendingTag();
eq('second distinct tag appended',     list.children.length,                         2);
eq('second chip normalized',           list.children[1] && list.children[1].getAttribute('data-tag'), 'calm');

// ── Result ─────────────────────────────────────────────────────────────────
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
