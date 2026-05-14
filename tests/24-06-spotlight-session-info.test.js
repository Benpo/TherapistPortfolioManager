/**
 * Phase 24 Plan 06 — Behavior test for the Session-info subsection rendering.
 *
 * Tests the pure helper `renderSpotlightSessionInfo(refs, sessions, formatDate)`
 * that Plan 06 adds to assets/add-session.js. The helper is extracted from the
 * async populateSpotlight wrapper so that the render logic can be exercised
 * without IDB, document, or i18n.
 *
 * Three scenarios from PLAN.md acceptance criteria:
 *   A. Existing client with ≥1 session AND latest has non-empty customerSummary
 *      → subsection visible, date/count/quote all rendered, summary block shown.
 *   B. Existing client with ≥1 session AND latest has empty customerSummary
 *      → subsection visible, date/count rendered, summary block HIDDEN (D-31 fallback).
 *   C. Client with 0 sessions
 *      → subsection HIDDEN entirely, no strings written (D-30 silent empty state).
 *
 * Extra: D-32 enforcement — helper must NOT write any "open issues" or "severity"
 * strings to any ref. We assert by inspecting that no element receives such text.
 *
 * Loader: the helper is exported on window.__spotlightTestExports in the browser
 * script. In Node we load assets/add-session.js inside a vm sandbox that stubs
 * window/document just enough that the module top-level executes without errors,
 * then read the exported helper from the sandbox.
 *
 * Run: node tests/24-06-spotlight-session-info.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * IMPORTANT — this test is intentionally BLIND to the async populateSpotlight
 * wrapper. The wrapper's correctness (scope resolution, await ordering, race
 * guard) is covered by the browser UAT script at 24-06-UAT.md. Two layers:
 * this test = render logic; UAT = integration/scope/binding.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// --- Element shim ---
// Minimal stand-in for an HTMLElement that records classList state and text.
function makeEl(initialClasses) {
  const set = new Set(initialClasses || []);
  return {
    classList: {
      add(c) { set.add(c); },
      remove(c) { set.delete(c); },
      contains(c) { return set.has(c); },
      toString() { return Array.from(set).join(' '); },
    },
    textContent: '',
    _classes: set,
  };
}

// --- Load the helper from assets/add-session.js ---
// We use a stub-heavy vm context. add-session.js executes its top-level let/const
// declarations (fine — they're inert) and registers a DOMContentLoaded listener
// on `document`. We never dispatch that event, so the DOMContentLoaded body never
// runs — but the top-level function declarations (populateSpotlight,
// renderSpotlightSessionInfo, getSelectedClient, etc.) do get bound to the
// sandbox's global, and we expose them via the test hook.

const srcPath = path.join(__dirname, '..', 'assets', 'add-session.js');
const src = fs.readFileSync(srcPath, 'utf8');

const sandbox = {
  // Top-level declarations in add-session.js use `let` (not `var`), so they
  // do NOT auto-bind to the global object in a vm script context the way a
  // browser <script> tag binds top-level function declarations to `window`.
  // Workaround: append a small epilogue that explicitly publishes the helper
  // onto a sandbox-visible name.
  console: { log() {}, warn() {}, error() {} },
  document: {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  },
  window: {},
  URLSearchParams: globalThis.URLSearchParams,
  Date,
  Number,
  Math,
  Array,
  Object,
  String,
  Boolean,
  JSON,
  Promise,
  Set,
  Map,
  setTimeout,
  clearTimeout,
  __test_exports: {},
};
sandbox.window.location = { search: '' };

// Epilogue: publish the helper. The implementation will define
// `function renderSpotlightSessionInfo(refs, sessions, formatDate)` at module
// top-level alongside populateSpotlight. We re-export it here.
const EPILOGUE = `
;try {
  if (typeof renderSpotlightSessionInfo === 'function') {
    __test_exports.renderSpotlightSessionInfo = renderSpotlightSessionInfo;
  }
} catch (_) {}
`;

vm.createContext(sandbox);
try {
  vm.runInContext(src + EPILOGUE, sandbox, { filename: 'assets/add-session.js' });
} catch (err) {
  console.error('FATAL: add-session.js failed to load in vm sandbox.');
  console.error(err.message);
  process.exit(1);
}

const renderSpotlightSessionInfo = sandbox.__test_exports.renderSpotlightSessionInfo;
if (typeof renderSpotlightSessionInfo !== 'function') {
  console.error('FAIL: renderSpotlightSessionInfo was not exported from add-session.js.');
  console.error('      Plan 06 must define this top-level helper. See PLAN.md task 1.');
  process.exit(1);
}

// --- Test runner ---
let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    failed++;
  }
}

const fakeFormatDate = (iso) => `[date:${iso}]`;

// --- Scenario A: ≥1 session, latest has non-empty customerSummary ---
test('A. Existing client with sessions + non-empty latest summary renders all fields', () => {
  const refs = {
    sessionInfo: makeEl(['is-hidden']),
    lastDate: makeEl([]),
    total: makeEl([]),
    summaryBlock: makeEl(['is-hidden']),
    summaryQuote: makeEl([]),
  };
  const sessions = [
    { date: '2026-05-01', customerSummary: 'older note' },
    { date: '2026-05-10', customerSummary: 'latest note for next session' },
    { date: '2026-04-20', customerSummary: '' },
  ];
  renderSpotlightSessionInfo(refs, sessions, fakeFormatDate);

  assert.strictEqual(refs.sessionInfo.classList.contains('is-hidden'), false,
    'subsection should be visible when sessions exist');
  assert.strictEqual(refs.lastDate.textContent, '[date:2026-05-10]',
    'last date should be the most recent session date, formatted');
  assert.strictEqual(refs.total.textContent, '3',
    'total should equal sessions.length, as a string');
  assert.strictEqual(refs.summaryBlock.classList.contains('is-hidden'), false,
    'summary block should be visible when latest customerSummary is non-empty');
  assert.strictEqual(refs.summaryQuote.textContent, 'latest note for next session',
    'summary quote should hold the latest session.customerSummary verbatim');
});

// --- Scenario B: ≥1 session, latest has empty customerSummary ---
test('B. Latest session with empty customerSummary keeps date/count but hides summary block', () => {
  const refs = {
    sessionInfo: makeEl(['is-hidden']),
    lastDate: makeEl([]),
    total: makeEl([]),
    summaryBlock: makeEl([]),
    summaryQuote: makeEl([]),
  };
  const sessions = [
    { date: '2026-05-15', customerSummary: '' },
    { date: '2026-05-01', customerSummary: 'earlier note (should NOT surface)' },
  ];
  renderSpotlightSessionInfo(refs, sessions, fakeFormatDate);

  assert.strictEqual(refs.sessionInfo.classList.contains('is-hidden'), false,
    'subsection should still be visible');
  assert.strictEqual(refs.lastDate.textContent, '[date:2026-05-15]',
    'latest date is the empty-summary session, not the older one');
  assert.strictEqual(refs.total.textContent, '2');
  assert.strictEqual(refs.summaryBlock.classList.contains('is-hidden'), true,
    'summary block must be hidden — empty customerSummary');
  // No leak from earlier session.
  assert.strictEqual(refs.summaryQuote.textContent, '',
    'summary quote must NOT fall back to older session text');
});

// --- Scenario C: 0 sessions — D-30 silent empty state ---
test('C. Empty sessions array hides subsection entirely and writes no strings (D-30)', () => {
  const refs = {
    sessionInfo: makeEl([]), // start visible
    lastDate: makeEl([]),
    total: makeEl([]),
    summaryBlock: makeEl([]),
    summaryQuote: makeEl([]),
  };
  renderSpotlightSessionInfo(refs, [], fakeFormatDate);

  assert.strictEqual(refs.sessionInfo.classList.contains('is-hidden'), true,
    'subsection must be hidden when sessions.length === 0');
  assert.strictEqual(refs.lastDate.textContent, '',
    'no strings should be written to lastDate on empty');
  assert.strictEqual(refs.total.textContent, '',
    'no strings should be written to total on empty');
  assert.strictEqual(refs.summaryQuote.textContent, '',
    'no strings should be written to summaryQuote on empty');
});

// --- Scenario D: D-32 enforcement — no out-of-scope text written ---
test('D. D-32: helper writes no "open issues" or "severity trend" text', () => {
  const refs = {
    sessionInfo: makeEl(['is-hidden']),
    lastDate: makeEl([]),
    total: makeEl([]),
    summaryBlock: makeEl(['is-hidden']),
    summaryQuote: makeEl([]),
  };
  const sessions = [
    {
      date: '2026-05-10',
      customerSummary: 'a normal note',
      issues: [{ severity: 5, title: 'open issue' }], // helper must IGNORE these
    },
  ];
  renderSpotlightSessionInfo(refs, sessions, fakeFormatDate);

  const allText = [
    refs.lastDate.textContent,
    refs.total.textContent,
    refs.summaryQuote.textContent,
  ].join(' | ').toLowerCase();

  assert.ok(!/open\s*issue/.test(allText),
    'D-32: helper must not surface "open issue" text — actual: ' + allText);
  assert.ok(!/severity/.test(allText),
    'D-32: helper must not surface severity-trend text — actual: ' + allText);
  assert.ok(!/sparkline/.test(allText),
    'D-32: helper must not surface sparkline text — actual: ' + allText);
});

// --- Scenario F: same-date tiebreaker — must pick the latest createdAt ---
// Regression for the UAT bug Ben hit on 2026-05-14: two sessions recorded today,
// the spotlight surfaced the FIRST one's customerSummary instead of the latest.
// Root cause: stable sort on equal date kept IDB insertion order, which puts
// the oldest same-date session at index 0. Fix uses createdAt then id as tiebreakers.
test('F. Same date — most recent createdAt wins, not insertion order', () => {
  const refs = {
    sessionInfo: makeEl(['is-hidden']),
    lastDate: makeEl([]),
    total: makeEl([]),
    summaryBlock: makeEl(['is-hidden']),
    summaryQuote: makeEl([]),
  };
  // Order in the array matches the order PortfolioDB.getSessionsByClient would
  // return for two same-date sessions: oldest createdAt first (id 1, id 2).
  const sessions = [
    { id: 1, date: '2026-05-14', createdAt: '2026-05-14T09:00:00.000Z', customerSummary: 'morning session note' },
    { id: 2, date: '2026-05-14', createdAt: '2026-05-14T15:30:00.000Z', customerSummary: 'afternoon session note (LATEST)' },
  ];
  renderSpotlightSessionInfo(refs, sessions, fakeFormatDate);

  assert.strictEqual(refs.summaryQuote.textContent, 'afternoon session note (LATEST)',
    'must surface the session with the later createdAt, not the first-inserted one');
  assert.strictEqual(refs.total.textContent, '2');
});

// --- Scenario G: same-date, missing createdAt — fall back to id descending ---
test('G. Same date and missing createdAt — id descending wins as final fallback', () => {
  const refs = {
    sessionInfo: makeEl(['is-hidden']),
    lastDate: makeEl([]),
    total: makeEl([]),
    summaryBlock: makeEl(['is-hidden']),
    summaryQuote: makeEl([]),
  };
  const sessions = [
    { id: 5, date: '2026-05-14', customerSummary: 'older (id 5, no createdAt)' },
    { id: 9, date: '2026-05-14', customerSummary: 'newer (id 9, no createdAt)' },
  ];
  renderSpotlightSessionInfo(refs, sessions, fakeFormatDate);

  assert.strictEqual(refs.summaryQuote.textContent, 'newer (id 9, no createdAt)',
    'with no createdAt, the higher id should win — sessions are autoincrement');
});

// --- Scenario E: defensive — sessions with missing/invalid date still picks one ---
test('E. Sessions with missing date sort to epoch; valid latest still wins', () => {
  const refs = {
    sessionInfo: makeEl(['is-hidden']),
    lastDate: makeEl([]),
    total: makeEl([]),
    summaryBlock: makeEl(['is-hidden']),
    summaryQuote: makeEl([]),
  };
  const sessions = [
    { date: '', customerSummary: 'dateless older' },
    { date: '2026-05-10', customerSummary: 'valid latest' },
    { date: null, customerSummary: 'dateless newer' },
  ];
  renderSpotlightSessionInfo(refs, sessions, fakeFormatDate);

  assert.strictEqual(refs.lastDate.textContent, '[date:2026-05-10]',
    'session with a real date should win over dateless ones');
  assert.strictEqual(refs.summaryQuote.textContent, 'valid latest',
    'summary should come from the session whose date wins the sort');
});

// --- Report ---
console.log('');
console.log(`Plan 06 helper tests — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
