/**
 * tests/47-order-backup-roundtrip.test.js
 *
 * BEHAVIOR: the per-therapist section order survives the encrypted backup
 * boundary AND a crafted/old backup can never land an illegal or unknown order.
 *
 *   - A reordered (legal) sectionOrder sentinel encrypt→restore round-trips
 *     byte-for-byte (read back via getSectionOrderRecord).
 *   - The new afterSeverity section row (customLabel + enabled) round-trips like
 *     every other section row (it is on the restore section-key allow-list).
 *   - A crafted order with afterSeverity BEFORE issues is clamped on restore so
 *     issues ends up before afterSeverity (the clamp runs on restore, not only
 *     in the drag handler).
 *   - A crafted order carrying an unknown key ("__evil__") drops that key on
 *     restore.
 *   - A manifest with NO sectionOrder record restores cleanly and the app then
 *     falls back to the default order.
 *
 * Drives the REAL BackupManager encrypt path (exportEncryptedBackup + passphrase
 * modal) and the REAL decrypt/restore path (importBackup on a .sgbackup File)
 * through REAL WebCrypto + REAL JSZip. assets/app.js is loaded into the same
 * window so the restore reuses the REAL shared validator (window.App.sanitizeOrder)
 * — the clamp/allow-list is not re-implemented in the test.
 *
 * Run: node tests/47-order-backup-roundtrip.test.js  — exit 0 = pass, 1 = fail.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle(n) { for (var i = 0; i < (n || 12); i++) { await flush(); } }

var PASSPHRASE = 'Garden2026order'; // >=6, mixed letters+digits, not all-same, not pure digits

var SOURCE_CLIENTS = [
  { id: 1, firstName: 'Maya', lastName: 'Cohen', type: 'adult', photoData: '' }
];
var SOURCE_SESSIONS = [
  { id: 10, clientId: 1, date: '2026-05-01', sessionType: 'clinic', issues: [] }
];

// ── Mock PortfolioDB: getAll* feed the export; the sentinel/section writes are
//    captured so the restore result can be read back (mirrors the real db's
//    getSectionOrderRecord read-after-write in lock-step). ────────────────────
function createMockDB(therapistSettings) {
  var written = { sentinels: {}, sections: {} };
  return {
    __written: written,
    clearAll: function () { return Promise.resolve(); },
    addClient: function () { return Promise.resolve(); },
    addSession: function () { return Promise.resolve(); },
    setTherapistSetting: function (rec) { written.sections[rec.sectionKey] = rec; return Promise.resolve(); },
    _writeTherapistSentinel: function (rec) { written.sentinels[rec.sectionKey] = rec; return Promise.resolve(); },
    getSectionOrderRecord: function () { return Promise.resolve(written.sentinels.sectionOrder || null); },
    updateSnippet: function () { return Promise.resolve(); },
    validateSnippetShape: function () { return true; },
    getAllClients: function () { return Promise.resolve(SOURCE_CLIENTS); },
    getAllSessions: function () { return Promise.resolve(SOURCE_SESSIONS); },
    getAllTherapistSettings: function () { return Promise.resolve(therapistSettings || []); },
    getAllSnippets: function () { return Promise.resolve([]); }
  };
}

function buildWindow(mockDB) {
  var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://localhost/',
    runScripts: 'outside-only',
    pretendToBeVisual: false
  });
  var win = dom.window;

  Object.defineProperty(win, 'crypto', { value: globalThis.crypto, configurable: true, writable: true });
  if (typeof win.TextEncoder === 'undefined') win.TextEncoder = TextEncoder;
  if (typeof win.TextDecoder === 'undefined') win.TextDecoder = TextDecoder;
  win.setImmediate = setImmediate;
  win.clearImmediate = clearImmediate;
  win.URL.createObjectURL = function () { return 'blob:stub'; };
  win.URL.revokeObjectURL = function () {};
  win.HTMLAnchorElement.prototype.click = function () {};
  win.DateFormat = { todayLocalISO: function () { return '2026-07-13'; } };
  win.matchMedia = function () {
    return { matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
  };
  win.I18N_DEFAULT = 'en';

  win.PortfolioDB = mockDB;
  win.eval(readAsset('assets/app.js'));      // provides window.App.sanitizeOrder (the shared validator)
  win.eval(readAsset('assets/jszip.min.js'));
  win.eval(readAsset('assets/backup.js'));
  return win;
}

function driveModal(win, passphrase) {
  var doc = win.document;
  var inputs = doc.querySelectorAll('.passphrase-input');
  assert.ok(inputs.length >= 1, 'passphrase modal must render at least one input');
  for (var i = 0; i < inputs.length; i++) {
    inputs[i].value = passphrase;
    inputs[i].dispatchEvent(new win.Event('input', { bubbles: true }));
  }
  var confirmBtn = doc.querySelector('.passphrase-btn-confirm');
  assert.ok(confirmBtn, 'passphrase modal must render a confirm button');
  assert.strictEqual(confirmBtn.disabled, false, 'confirm button must be enabled after a valid passphrase');
  confirmBtn.click();
}

// Encrypt a backup carrying `therapistSettings`, then decrypt+restore it.
// Returns the mock captures + the live window (for App.* reads).
async function roundTrip(therapistSettings) {
  var mockDB = createMockDB(therapistSettings);
  var win = buildWindow(mockDB);
  var BM = win.BackupManager;
  assert.ok(BM && typeof BM.exportEncryptedBackup === 'function', 'BackupManager.exportEncryptedBackup must exist');

  var encP = BM.exportEncryptedBackup();
  await settle();
  driveModal(win, PASSPHRASE);
  var encResult = await encP;
  assert.ok(encResult && encResult.ok === true && encResult.blob, 'encrypted export must succeed');

  var sgFile = new win.File([encResult.blob], encResult.filename, { type: 'application/octet-stream' });
  var impP = BM.importBackup(sgFile);
  await settle();
  driveModal(win, PASSPHRASE);
  await impP;

  return { db: mockDB, win: win, App: win.App };
}

function topKeys(items) {
  return items.filter(function (o) { return o.type === 'section'; }).map(function (o) { return o.key; });
}

var passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.stack || err.message || err)); failed++; }
}

(async function () {

  await test('a reordered (legal) sectionOrder survives the encrypted round-trip byte-for-byte (ORDR-05)', async function () {
    var REORDERED = [
      { type: 'section', key: 'issues' },
      { type: 'group', id: 'emotionsTech', titleOverride: 'My Tech',
        members: ['insights', 'trapped', 'heartShield', 'heartShieldEmotions', 'limitingBeliefs', 'additionalTech'] },
      { type: 'section', key: 'afterSeverity' },
      { type: 'group', id: 'wrapup', titleOverride: null, members: ['nextSession', 'comments'] },
    ];
    var env = await roundTrip([{ sectionKey: 'sectionOrder', version: 1, items: REORDERED }]);
    var rec = await env.db.getSectionOrderRecord();
    assert.ok(rec, 'a sectionOrder sentinel must be written on restore (not dropped by the allow-list)');
    assert.strictEqual(rec.sectionKey, 'sectionOrder');
    assert.strictEqual(rec.version, 1, 'version round-trips');
    // A complete, legal order is a fixed point of sanitizeOrder → byte-identical.
    assert.deepStrictEqual(rec.items, REORDERED,
      'the reordered custom order (incl. a custom group title + member order) must round-trip unchanged');
  });

  await test('the afterSeverity section row (customLabel + enabled) round-trips like other section rows', async function () {
    var env = await roundTrip([
      { sectionKey: 'afterSeverity', customLabel: 'Post-severity notes', enabled: false },
    ]);
    var row = env.db.__written.sections.afterSeverity;
    assert.ok(row, 'afterSeverity section row must restore (it must be on the ALLOWED_SECTION_KEYS allow-list)');
    assert.strictEqual(row.customLabel, 'Post-severity notes', 'customLabel round-trips');
    assert.strictEqual(row.enabled, false, 'enabled flag round-trips');
  });

  await test('a crafted afterSeverity-before-issues order is CLAMPED on restore (issues ends up first)', async function () {
    var CRAFTED = [
      { type: 'section', key: 'afterSeverity' },
      { type: 'section', key: 'issues' },
      { type: 'group', id: 'emotionsTech', titleOverride: null,
        members: ['heartShield', 'heartShieldEmotions', 'trapped', 'insights', 'limitingBeliefs', 'additionalTech'] },
      { type: 'group', id: 'wrapup', titleOverride: null, members: ['comments', 'nextSession'] },
    ];
    var env = await roundTrip([{ sectionKey: 'sectionOrder', version: 1, items: CRAFTED }]);
    var rec = await env.db.getSectionOrderRecord();
    assert.ok(rec, 'sentinel written');
    var keys = topKeys(rec.items);
    assert.ok(keys.indexOf('issues') < keys.indexOf('afterSeverity'),
      'issues must precede afterSeverity after the restore clamp; got ' + JSON.stringify(keys));
    assert.strictEqual(keys.indexOf('afterSeverity'), keys.indexOf('issues') + 1,
      'afterSeverity sits immediately after issues');
  });

  await test('a crafted order carrying an unknown key ("__evil__") drops that key on restore', async function () {
    var CRAFTED = [
      { type: 'section', key: 'issues' },
      { type: 'section', key: '__evil__' },
      { type: 'group', id: 'emotionsTech', titleOverride: null,
        members: ['heartShield', 'heartShieldEmotions', 'trapped', 'insights', 'limitingBeliefs', 'additionalTech', '__evil_member__'] },
      { type: 'section', key: 'afterSeverity' },
      { type: 'group', id: 'wrapup', titleOverride: null, members: ['comments', 'nextSession'] },
    ];
    var env = await roundTrip([{ sectionKey: 'sectionOrder', version: 1, items: CRAFTED }]);
    var rec = await env.db.getSectionOrderRecord();
    assert.ok(rec, 'sentinel written');
    assert.ok(topKeys(rec.items).indexOf('__evil__') === -1, 'unknown top-level key dropped');
    var grp = rec.items.find(function (o) { return o.type === 'group' && o.id === 'emotionsTech'; });
    assert.ok(grp && grp.members.indexOf('__evil_member__') === -1, 'unknown group member dropped');
    assert.ok(topKeys(rec.items).indexOf('issues') !== -1, 'known keys retained');
  });

  await test('a manifest with NO sectionOrder record restores cleanly → default order', async function () {
    var env = await roundTrip([]); // no sectionOrder row
    var rec = await env.db.getSectionOrderRecord();
    assert.strictEqual(rec, null, 'no sectionOrder sentinel is written when the backup carries none');
    // The app falls back to the default order.
    assert.deepStrictEqual(env.App.getSectionOrder(), env.App.DEFAULT_SECTION_ORDER,
      'App.getSectionOrder() returns the default order when nothing is stored');
  });

  // ── Count guard — no vacuous green ─────────────────────────────────────────
  var EXPECTED = 5;
  if (passed + failed !== EXPECTED) {
    console.log('  FAIL  count guard: expected ' + EXPECTED + ' tests, ran ' + (passed + failed));
    failed++;
  } else {
    console.log('  PASS  count guard: ' + EXPECTED + ' tests ran');
  }

  console.log('');
  console.log('47-order-backup-roundtrip — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);

})().catch(function (err) {
  console.error('FATAL test harness error:', err && err.stack || err);
  process.exit(1);
});
