/**
 * Quick 260516-1f5 — Behavior test: header backup cloud icon color is
 * DERIVED FROM the last-backup timestamp on the Sessions/Reporting load
 * path, not always grey.
 *
 * CRITICAL production bug: sessions.html and reporting.html load app.js
 * but NOT assets/backup.js, so BackupManager is undefined on those two
 * pages → app.js's cloud-icon derivation falls back to 'never' → the icon
 * is permanently grey (backup-cloud-btn--never) regardless of when the
 * user actually backed up. The 4 other app pages load the backup trio and
 * color correctly.
 *
 * This test is FALSIFIABLE (project convention
 * MEMORY:feedback-behavior-verification): it fails BEFORE the HTML fix and
 * passes AFTER, and it asserts the derived state CLASS as a function of
 * the timestamp using the REAL backup.js thresholds — not a hardcoded
 * constant the production code does not compute.
 *
 *   Test A — parity (structural-but-load-bearing): every one of the 6 app
 *     HTML pages must reference assets/backup.js in a <script src> tag.
 *     BEFORE fix: sessions.html + reporting.html FAIL. AFTER: all 6 pass.
 *   Test B — behavior: replicate app.js's exact color derivation in two
 *     worlds. "broken world" (BackupManager undefined) → 'never' → grey.
 *     "fixed world" (real backup.js loaded, lastExport = now − 1d) →
 *     'fresh' → NOT grey. Proves color is a FUNCTION of the timestamp.
 *   Test C — timestamp sensitivity: backup.js loaded, lastExport =
 *     now − 20d, schedule OFF → 'danger' (not 'fresh', not 'never').
 *     Proves the color tracks the timestamp, not a constant.
 *
 * Run: node tests/quick-260516-1f5-backup-trio-parity.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const DAY = 24 * 60 * 60 * 1000;

// ────────────────────────────────────────────────────────────────────
// Test runner
// ────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); passed++; }
  catch (err) { console.log(`  FAIL  ${name}`); console.log(`        ${err.message}`); failed++; }
}

// ────────────────────────────────────────────────────────────────────
// Helper: load a real BackupManager from assets/backup.js into a vm
// sandbox with a fresh stub localStorage (so each call is isolated).
// Mirrors tests/25-04-cloud-state.test.js's loader.
// ────────────────────────────────────────────────────────────────────

function makeStorage() {
  const map = new Map();
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    clear() { map.clear(); },
  };
}

function loadBackupManager(storage) {
  const sandbox = {
    window: {},
    document: {
      addEventListener() {}, removeEventListener() {},
      getElementById() { return null; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      createElement() { return { setAttribute() {}, appendChild() {}, addEventListener() {} }; },
      body: { prepend() {}, appendChild() {} },
      head: { appendChild() {} },
    },
    localStorage: storage,
    console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, Promise, JSON, Math, Date,
    Array, Object, Set, Map, RegExp, String, Number, Boolean,
  };
  sandbox.window.localStorage = storage;
  vm.createContext(sandbox);
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'backup.js'), 'utf8');
  vm.runInContext(src, sandbox, { filename: 'assets/backup.js' });
  return sandbox.window.BackupManager;
}

/**
 * EXACT replica of app.js's cloud-icon state derivation
 * (mountBackupCloudButton app.js:~438 and updateBackupCloudState
 * app.js:~524). BM is the in-scope BackupManager or undefined.
 * Returns the CSS class app.js would set on the button.
 */
function deriveCloudClass(BM) {
  let state = 'never';
  try {
    if (typeof BM !== 'undefined' && BM && typeof BM.computeBackupRecencyState === 'function') {
      state = BM.computeBackupRecencyState() || 'never';
    }
  } catch (_) { /* keep default */ }
  const STATES = ['never', 'fresh', 'warning', 'danger'];
  if (STATES.indexOf(state) === -1) state = 'never';
  return 'backup-cloud-btn--' + state;
}

// ────────────────────────────────────────────────────────────────────
// Test A — parity: every app page references assets/backup.js
// ────────────────────────────────────────────────────────────────────

const APP_PAGES = [
  'index.html',
  'add-client.html',
  'add-session.html',
  'settings.html',
  'sessions.html',
  'reporting.html',
];

// Matches a <script ... src="...assets/backup.js"...> tag (not backup-modal.js).
const BACKUP_SCRIPT_RE = /<script[^>]+src=["'][^"']*assets\/backup\.js["']/i;

for (const page of APP_PAGES) {
  test(`A: ${page} loads assets/backup.js (script trio parity)`, () => {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    assert.ok(
      BACKUP_SCRIPT_RE.test(html),
      `${page} has no <script src=".../assets/backup.js"> tag — ` +
      `BackupManager will be undefined on this page and the header cloud ` +
      `icon will be permanently grey (backup-cloud-btn--never).`
    );
  });
}

// ────────────────────────────────────────────────────────────────────
// Test B — behavior: color is a FUNCTION of the timestamp once
// backup.js is present (broken world grey vs fixed world fresh).
// ────────────────────────────────────────────────────────────────────

test('B1: broken world (BackupManager undefined) → backup-cloud-btn--never (grey)', () => {
  const cls = deriveCloudClass(undefined);
  assert.strictEqual(
    cls, 'backup-cloud-btn--never',
    `with no BackupManager loaded, app.js must fall back to 'never' (grey); got ${cls}`
  );
});

test('B2: fixed world (backup.js loaded, lastExport = now − 1d, schedule OFF) → backup-cloud-btn--fresh (NOT grey)', () => {
  const storage = makeStorage();
  const BM = loadBackupManager(storage);
  assert.ok(BM && typeof BM.computeBackupRecencyState === 'function',
    'real backup.js must expose BackupManager.computeBackupRecencyState');
  storage.setItem('portfolioBackupScheduleMode', 'off');
  storage.setItem('portfolioLastExport', String(Date.now() - 1 * DAY));
  const cls = deriveCloudClass(BM);
  assert.strictEqual(
    cls, 'backup-cloud-btn--fresh',
    `a 1-day-old backup with backup.js loaded must derive 'fresh', NOT grey; got ${cls}`
  );
  assert.notStrictEqual(cls, 'backup-cloud-btn--never',
    'fixed world must NOT be the always-grey "never" state');
});

// ────────────────────────────────────────────────────────────────────
// Test C — timestamp sensitivity: a 20-day-old backup (schedule OFF)
// must derive 'danger', proving the color tracks the timestamp and is
// not a constant.
// ────────────────────────────────────────────────────────────────────

test('C: backup.js loaded, lastExport = now − 20d, schedule OFF → backup-cloud-btn--danger', () => {
  const storage = makeStorage();
  const BM = loadBackupManager(storage);
  storage.setItem('portfolioBackupScheduleMode', 'off');
  storage.setItem('portfolioLastExport', String(Date.now() - 20 * DAY));
  const cls = deriveCloudClass(BM);
  assert.strictEqual(
    cls, 'backup-cloud-btn--danger',
    `a 20-day-old backup (schedule OFF: >14d) must derive 'danger'; got ${cls} ` +
    `— proves the icon color tracks the timestamp, not a constant`
  );
  assert.notStrictEqual(cls, 'backup-cloud-btn--fresh', 'must not be fresh at 20d');
  assert.notStrictEqual(cls, 'backup-cloud-btn--never', 'must not be the always-grey state');
});

// ─── Report ─────────────────────────────────────────────────────────
console.log('');
console.log(`quick-260516-1f5 backup-trio-parity — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
