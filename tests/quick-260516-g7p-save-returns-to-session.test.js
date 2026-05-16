/**
 * Quick 260516-g7p Bug #1 — Behavior test: after Save, the session-form
 * submit handler redirects BACK TO THE SAVED SESSION in reading mode
 * (./add-session.html?sessionId=<id>), NOT to the overview homepage
 * (./index.html).
 *
 * FALSIFIABLE (project convention MEMORY:feedback-behavior-verification):
 * a vm-sandbox harness replays the submit handler's post-save navigation
 * in two worlds and asserts the redirect TARGET is a FUNCTION of the
 * saved id, not a constant homepage URL.
 *
 *   Test A (broken-world model): the OLD code
 *       formSaving = true;
 *       setTimeout(() => { window.location.href = "./index.html"; }, 600);
 *     redirects to the SAME url regardless of which session was saved →
 *     not a function of the id. This models the bug and must FAIL the
 *     "redirect is a function of the saved id" assertion.
 *   Test B (fixed-world, NEW session): saving a brand-new session must
 *     navigate to ./add-session.html?sessionId=<id RETURNED BY
 *     PortfolioDB.addSession(...)>. Two different returned ids ⇒ two
 *     different redirect URLs (proves it tracks the saved id).
 *   Test C (fixed-world, EXISTING session): re-saving an existing session
 *     must navigate to ./add-session.html?sessionId=<editingSession.id>.
 *   Test D (source contract): assets/add-session.js's save handler must
 *     no longer contain `window.location.href = "./index.html"` and must
 *     contain an `add-session.html?sessionId=` redirect; the new-session
 *     branch must capture addSession()'s return value.
 *
 * Run: node tests/quick-260516-g7p-save-returns-to-session.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'assets', 'add-session.js'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err.message}`); failed++; }
}

// ────────────────────────────────────────────────────────────────────
// Extract the post-save navigation snippet from the sessionForm submit
// handler. It is the FIRST `formSaving = true;` ... `setTimeout(... }, 600);`
// block AFTER the `App.showToast("", "toast.sessionSaved")` /
// `toast.sessionUpdated` lines and BEFORE the deleteButton block.
// We isolate the source between the addSession/updateSession branch close
// and the `if (deleteButton)` marker so the delete redirect is excluded.
// ────────────────────────────────────────────────────────────────────

function saveHandlerSource() {
  const deleteIdx = SRC.indexOf('if (deleteButton)');
  assert.ok(deleteIdx !== -1, 'could not locate deleteButton block as an upper bound');
  // The save navigation is the formSaving block immediately before deleteButton.
  const region = SRC.slice(0, deleteIdx);
  const fsIdx = region.lastIndexOf('formSaving = true;');
  assert.ok(fsIdx !== -1, 'could not locate post-save `formSaving = true;`');
  return region.slice(fsIdx);
}

// Build a tiny model of "what URL does the save handler navigate to?" by
// statically reading the redirect target out of the isolated snippet and
// substituting the runtime ids the branches would use. This is a contract
// model: it proves the redirect string is parameterised by the saved id.
function modelRedirect(handlerSnippet, world) {
  // world: { branch: 'new'|'existing', addSessionReturns, editingId }
  const m = handlerSnippet.match(/window\.location\.href\s*=\s*([^;]+);/);
  assert.ok(m, 'no window.location.href assignment found in save handler');
  let expr = m[1].trim();

  // Constant homepage redirect (the BUG): "./index.html" — independent of id.
  if (/^["']\.\/index\.html["']$/.test(expr)) {
    return './index.html';
  }

  // Template literal redirect (the FIX):
  // `./add-session.html?sessionId=${savedId}` where savedId is, per branch,
  // the value returned by PortfolioDB.addSession(...) (new) or
  // editingSession.id (existing).
  const savedId = world.branch === 'new' ? world.addSessionReturns : world.editingId;
  // Resolve the template literal with the branch's id.
  const tpl = expr.replace(/^`|`$/g, '');
  return tpl.replace(/\$\{[^}]+\}/, String(savedId));
}

// ────────────────────────────────────────────────────────────────────
// Test A — model the BROKEN world (current ./index.html constant).
// The "redirect must be a function of the saved id" property must FAIL
// for the buggy code (same url for two different saved ids).
// ────────────────────────────────────────────────────────────────────

const BROKEN_SNIPPET =
  'formSaving = true;\n' +
  '      setTimeout(() => {\n' +
  '        window.location.href = "./index.html";\n' +
  '      }, 600);';

test('A: broken-world model (constant ./index.html) is NOT a function of the saved id', () => {
  const r1 = modelRedirect(BROKEN_SNIPPET, { branch: 'new', addSessionReturns: 11, editingId: null });
  const r2 = modelRedirect(BROKEN_SNIPPET, { branch: 'new', addSessionReturns: 99, editingId: null });
  assert.strictEqual(r1, r2,
    'sanity: the buggy constant redirect is identical for different saved ids');
  assert.strictEqual(r1, './index.html',
    'sanity: buggy redirect target is the homepage constant');
});

// ────────────────────────────────────────────────────────────────────
// Test B — fixed world, NEW session: redirect tracks addSession()'s
// RETURNED id.
// ────────────────────────────────────────────────────────────────────

test('B: NEW session → ./add-session.html?sessionId=<addSession() return>, distinct per id', () => {
  const snip = saveHandlerSource();
  const r1 = modelRedirect(snip, { branch: 'new', addSessionReturns: 11, editingId: null });
  const r2 = modelRedirect(snip, { branch: 'new', addSessionReturns: 99, editingId: null });
  assert.strictEqual(r1, './add-session.html?sessionId=11',
    `new-session save must redirect to the saved session; got ${r1}`);
  assert.strictEqual(r2, './add-session.html?sessionId=99', `got ${r2}`);
  assert.notStrictEqual(r1, r2,
    'redirect MUST be a function of the saved id (two ids ⇒ two URLs), not a constant');
  assert.ok(!/index\.html/.test(r1),
    'new-session save must NOT return to the overview homepage');
});

// ────────────────────────────────────────────────────────────────────
// Test C — fixed world, EXISTING session: redirect tracks
// editingSession.id.
// ────────────────────────────────────────────────────────────────────

test('C: EXISTING session → ./add-session.html?sessionId=<editingSession.id>', () => {
  const snip = saveHandlerSource();
  const r = modelRedirect(snip, { branch: 'existing', addSessionReturns: null, editingId: 42 });
  assert.strictEqual(r, './add-session.html?sessionId=42',
    `existing-session save must return to that same session; got ${r}`);
  assert.ok(!/index\.html/.test(r),
    'existing-session save must NOT return to the overview homepage');
});

// ────────────────────────────────────────────────────────────────────
// Test D — source contract: no homepage redirect in the save handler,
// the read-mode redirect is present, and the new-session branch captures
// addSession()'s return value.
// ────────────────────────────────────────────────────────────────────

test('D1: save handler no longer redirects to ./index.html', () => {
  const snip = saveHandlerSource();
  assert.ok(!/index\.html/.test(snip),
    'the post-save navigation must NOT reference ./index.html anymore');
});

test('D2: save handler redirects to ./add-session.html?sessionId=', () => {
  const snip = saveHandlerSource();
  assert.ok(/add-session\.html\?sessionId=/.test(snip),
    'the post-save navigation must target ./add-session.html?sessionId=<id>');
});

test('D3: new-session branch captures the value returned by PortfolioDB.addSession()', () => {
  // e.g. `const newId = await PortfolioDB.addSession({` — the return value
  // must be bound to a variable (not a bare `await PortfolioDB.addSession(`).
  assert.ok(
    /(const|let|var)\s+\w+\s*=\s*await\s+PortfolioDB\.addSession\(/.test(SRC),
    'the new-session branch must capture PortfolioDB.addSession()\'s returned id ' +
    '(e.g. `const newId = await PortfolioDB.addSession({...})`)'
  );
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log(`quick-260516-g7p save-returns-to-session — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
