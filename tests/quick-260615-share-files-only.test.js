/**
 * Quick 260615 Bug #1 — Behavior test: the session-export "Share via device"
 * action shares the PDF FILE ONLY — no `text`, no `title`.
 *
 * PRODUCTION BUG (see WhatsApp screenshot in the task): exportHandleShare()
 * called navigator.share({ files:[file], title, text }). On macOS Chrome the
 * Web Share API wrote the PDF to a temp WebShare/ directory and, because a
 * `text` field was also present, leaked that absolute file path as a SEPARATE
 * text message into the share target (WhatsApp) — e.g.
 *   "/Users/sapir/Library/Application Support/Google/Chrome/Default/WebShare/
 *    share-…/Adam K_2026-06-15.pdf מסמך מפגש"
 * plus a duplicate attachment. The therapist expects ONLY the file.
 *
 * FALSIFIABLE (project convention MEMORY:feedback-behavior-verification):
 * this test does NOT grep for a string — it EXTRACTS the actual object literal
 * passed to navigator.share() from assets/add-session.js and EVALUATES it in a
 * sandbox with mocked (file, data, App). It then asserts the *constructed
 * payload* carries `files` and carries NEITHER `text` NOR `title`.
 *   - BEFORE the fix: the payload has `text`/`title`  → Test B FAILS.
 *   - AFTER  the fix: the payload is `{ files:[file] }` → Test B PASSES.
 *
 * Run: node tests/quick-260615-share-files-only.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'assets', 'add-session.js'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err.message}`); failed++; }
}

// ────────────────────────────────────────────────────────────────────
// Helper: extract the single object literal passed to `navigator.share(`.
// Walks balanced parentheses so nested brackets/braces ([file], objects)
// are handled correctly. Returns the raw source of the argument expression.
// ────────────────────────────────────────────────────────────────────
function extractShareArg(src) {
  const marker = 'navigator.share(';
  const idx = src.indexOf(marker);
  assert.ok(idx !== -1, 'could not find a navigator.share( call in add-session.js');
  let i = idx + marker.length;
  let depth = 1;
  const start = i;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') depth--;
    if (depth === 0) break;
    i++;
  }
  return src.slice(start, i).trim();
}

// ────────────────────────────────────────────────────────────────────
// Test A — exactly ONE navigator.share() call exists (no accidental dupes)
// ────────────────────────────────────────────────────────────────────
test('A: add-session.js makes exactly one navigator.share() call', () => {
  const count = (SRC.match(/navigator\.share\s*\(/g) || []).length;
  assert.strictEqual(count, 1,
    `expected exactly 1 navigator.share() call, found ${count}`);
});

// ────────────────────────────────────────────────────────────────────
// Test B — the constructed share payload is FILES-ONLY (no text/title)
// ────────────────────────────────────────────────────────────────────
test('B: navigator.share payload contains files and NOT text/title', () => {
  const argSrc = extractShareArg(SRC);

  // Evaluate the literal with mocked dependencies so we inspect the REAL
  // runtime object the production code builds — not the source text.
  const sandbox = {
    file: { name: 'Adam K_2026-06-15.pdf', type: 'application/pdf', size: 48128 },
    data: { clientName: 'Adam K.', sessionDateFormatted: '15 June 2026' },
    App: { t: (k) => 'Session document' },
  };
  vm.createContext(sandbox);
  const payload = vm.runInContext('(' + argSrc + ')', sandbox);

  assert.ok(payload && typeof payload === 'object', 'share payload must be an object');
  assert.ok(Array.isArray(payload.files) && payload.files.length === 1,
    'share payload must carry exactly one file in `files`');
  assert.strictEqual(payload.files[0], sandbox.file,
    'the shared file must be the generated PDF File object');

  assert.ok(!('text' in payload),
    'share payload MUST NOT include `text` — it leaks the temp WebShare file ' +
    'path as a separate message on macOS Chrome → WhatsApp.');
  assert.ok(!('title' in payload),
    'share payload MUST NOT include `title` — files-only share keeps the ' +
    'delivery to a single clean PDF attachment.');
});

// ────────────────────────────────────────────────────────────────────
// Test C — the share-support probe still feature-detects via files
// (guards against a regression where the probe is loosened/removed)
// ────────────────────────────────────────────────────────────────────
test('C: share-support probe still checks canShare({ files: [...] })', () => {
  assert.ok(/canShare\(\s*\{\s*files\s*:/.test(SRC),
    'exportProbeShareSupport must still probe navigator.canShare({ files: [...] })');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
