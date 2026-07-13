/**
 * tests/45-backup-roundtrip.test.js — Phase 45 Plan 05 Task 1 (RTXT-10).
 *
 * THREAT: T-45-08 — an encrypted .sgbackup encrypt→restore round-trip could
 * silently ALTER a formatted note's markdown (a stray strip/transform of `**`,
 * a `## heading`, or a nested list line) so the notes a therapist saves come
 * back subtly different. backup.js is UNCHANGED by Phase 45 — session objects
 * round-trip WHOLESALE through JSON (JSON.stringify in _assembleBackupZip,
 * JSON.parse in importBackup); notes are opaque strings that are never
 * individually transformed. This test PROTECTS that property with a REAL,
 * falsifiable encrypt→decrypt→restore round-trip.
 *
 * It drives the REAL BackupManager encrypt path (exportEncryptedBackup + the
 * passphrase modal) and the REAL decrypt path (importBackup on a .sgbackup File
 * + the decrypt passphrase modal), through REAL WebCrypto (AES-256-GCM,
 * PBKDF2) and REAL JSZip — no stub of the crypto or the zip. The restored note
 * strings are captured from the mock DB's addSession() calls and asserted
 * BYTE-IDENTICAL (===) to the originals.
 *
 * jsdom carries the DOM the passphrase modal builds; Node's WebCrypto is injected
 * as window.crypto (jsdom does not implement SubtleCrypto).
 *
 * Run: node tests/45-backup-roundtrip.test.js   (exit 0 pass / 1 fail)
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

var PASSPHRASE = 'Garden2026notes'; // >=6, mixed letters+digits, not all-same, not pure digits

// A formatted note carrying EVERY block/inline shape the phase renders:
// a ## heading, **bold**, *italic*, a 1./2. ordered list, a - bullet list,
// and a nested (2-space indent) item.
var NOTE_TRAPPED = [
  '## Session heading',
  '**Anger** surfaced strongly, and *frustration* underneath.',
  '1. Named the trigger',
  '2. Traced it to childhood',
  '- Chest tightness',
  '  - eased after release',
  'Legacy math like 2 * 3 * 4 must stay literal.'
].join('\n');

var NOTE_COMMENTS = [
  '### Follow-up',
  'Client felt **lighter**.',
  '- book next session',
  '- send the **summary** PDF'
].join('\n');

// A plain-text projection of the markers (what a WRONG, note-stripping backup
// would produce). Used to prove the round-trip is NOT silently stripping.
function crudeStrip(s) {
  return s.replace(/\*\*/g, '').replace(/^#{1,3}\s+/gm, '').replace(/^\s*(?:[-*]|\d+\.)\s+/gm, '');
}

// ── Source session objects (opaque to backup.js — notes are just strings) ──────
var SOURCE_CLIENTS = [
  { id: 1, firstName: 'Maya', lastName: 'Cohen', type: 'adult', photoData: '' }
];
var SOURCE_SESSIONS = [
  {
    id: 10, clientId: 1, date: '2026-05-01', sessionType: 'clinic',
    trappedEmotions: NOTE_TRAPPED,
    comments: NOTE_COMMENTS,
    insights: '',
    issues: []
  }
];

// ── Mock PortfolioDB: getAll* feed the export; addSession captures the restore ──
function createMockDB() {
  var restored = { clients: [], sessions: [] };
  return {
    __restored: restored,
    clearAll: function () { restored.clients = []; restored.sessions = []; return Promise.resolve(); },
    addClient: function (c) { restored.clients.push(c); return Promise.resolve(); },
    addSession: function (s) { restored.sessions.push(s); return Promise.resolve(); },
    setTherapistSetting: function () { return Promise.resolve(); },
    _writeTherapistSentinel: function () { return Promise.resolve(); },
    updateSnippet: function () { return Promise.resolve(); },
    validateSnippetShape: function () { return true; },
    getAllClients: function () { return Promise.resolve(SOURCE_CLIENTS); },
    getAllSessions: function () { return Promise.resolve(SOURCE_SESSIONS); },
    getAllTherapistSettings: function () { return Promise.resolve([]); },
    getAllSnippets: function () { return Promise.resolve([]); }
  };
}

function buildBackupWindow(mockDB) {
  var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://localhost/',
    runScripts: 'outside-only',
    pretendToBeVisual: false
  });
  var win = dom.window;

  // WebCrypto: jsdom has no SubtleCrypto — inject Node's global webcrypto.
  // window.crypto is a getter-only accessor in jsdom, so redefine it.
  Object.defineProperty(win, 'crypto', { value: globalThis.crypto, configurable: true, writable: true });
  if (typeof win.TextEncoder === 'undefined') win.TextEncoder = TextEncoder;
  if (typeof win.TextDecoder === 'undefined') win.TextDecoder = TextDecoder;
  // JSZip's async blob generator schedules via setImmediate, which jsdom's window
  // does not expose — without it generateAsync({type:'blob'}) never resolves.
  win.setImmediate = setImmediate;
  win.clearImmediate = clearImmediate;

  // Neutralize the download side-effect (anchor navigation is unimplemented in jsdom).
  win.URL.createObjectURL = function () { return 'blob:stub'; };
  win.URL.revokeObjectURL = function () {};
  win.HTMLAnchorElement.prototype.click = function () {};
  win.DateFormat = { todayLocalISO: function () { return '2026-07-13'; } };

  win.PortfolioDB = mockDB;
  win.eval(readAsset('assets/jszip.min.js'));
  win.eval(readAsset('assets/backup.js'));
  return { dom: dom, win: win };
}

// Fill the passphrase modal input(s) and click Decrypt/Encrypt-and-save.
function driveModal(win, passphrase, isEncrypt) {
  var doc = win.document;
  var inputs = doc.querySelectorAll('.passphrase-input');
  assert.ok(inputs.length >= 1, 'passphrase modal must render at least one input');
  for (var i = 0; i < inputs.length; i++) {
    inputs[i].value = passphrase;
    inputs[i].dispatchEvent(new win.Event('input', { bubbles: true }));
  }
  var confirmBtn = doc.querySelector('.passphrase-btn-confirm');
  assert.ok(confirmBtn, 'passphrase modal must render a confirm button');
  assert.strictEqual(confirmBtn.disabled, false,
    'confirm button must be enabled after a valid ' + (isEncrypt ? 'matching passphrase' : 'passphrase') + ' is entered');
  confirmBtn.click();
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.stack || err.message || err)); failed++; }
}

(async function () {

  await test('encrypt→decrypt round-trip preserves each formatted note string BYTE-IDENTICALLY (RTXT-10 / T-45-08)', async function () {
    var mockDB = createMockDB();
    var env = buildBackupWindow(mockDB);
    var win = env.win;
    var BM = win.BackupManager;
    assert.ok(BM && typeof BM.exportEncryptedBackup === 'function', 'BackupManager.exportEncryptedBackup must exist');

    // ── ENCRYPT (real modal + real WebCrypto) ──────────────────────────────────
    var encP = BM.exportEncryptedBackup();
    await settle();
    driveModal(win, PASSPHRASE, true);
    var encResult = await encP;
    assert.ok(encResult && encResult.ok === true, 'encrypted export must succeed');
    assert.ok(encResult.blob, 'encrypted export must return an encrypted .sgbackup blob');
    assert.ok(/\.sgbackup$/.test(encResult.filename), 'encrypted filename must end in .sgbackup');

    // ── DECRYPT + RESTORE (real modal + real WebCrypto + real JSZip) ────────────
    var sgFile = new win.File([encResult.blob], encResult.filename, { type: 'application/octet-stream' });
    var impP = BM.importBackup(sgFile);
    await settle();
    driveModal(win, PASSPHRASE, false);
    await impP;

    var restored = mockDB.__restored.sessions;

    // HARD PRECONDITION: the round-trip actually restored a session (no vacuous pass).
    assert.strictEqual(restored.length, SOURCE_SESSIONS.length,
      'exactly ' + SOURCE_SESSIONS.length + ' session(s) must be restored; got ' + restored.length +
      ' (a 0 here would make every byte-identity assertion below pass vacuously)');

    var r = restored[0];

    // The content genuinely carried markers (guard against testing empty strings).
    assert.ok(NOTE_TRAPPED.indexOf('**') !== -1 && NOTE_TRAPPED.indexOf('## ') !== -1 &&
      /\n1\. /.test('\n' + NOTE_TRAPPED) && NOTE_TRAPPED.indexOf('\n  - ') !== -1,
      'the source note must contain bold + heading + ordered + nested markers (test-fixture integrity)');

    // BYTE-IDENTICAL round-trip on every formatted note field.
    assert.strictEqual(r.trappedEmotions, NOTE_TRAPPED,
      'trappedEmotions must survive the encrypted round-trip byte-for-byte');
    assert.strictEqual(r.comments, NOTE_COMMENTS,
      'comments must survive the encrypted round-trip byte-for-byte');

    // Falsifiability: a note-stripping backup would return the crude-stripped
    // text — assert the restored value is NOT that (the exact T-45-08 failure).
    assert.notStrictEqual(r.trappedEmotions, crudeStrip(NOTE_TRAPPED),
      'a restore that silently stripped markers would equal crudeStrip(NOTE) — it must not');
    assert.ok(r.trappedEmotions.indexOf('**Anger**') !== -1 && r.trappedEmotions.indexOf('## Session heading') !== -1,
      'restored markers (**bold**, ## heading) must be present verbatim');
    assert.ok(r.trappedEmotions.indexOf('2 * 3 * 4') !== -1,
      'legacy multiplication text must survive verbatim');
  });

  await test('the client record also round-trips (structural sanity — restore ran end-to-end)', async function () {
    var mockDB = createMockDB();
    var env = buildBackupWindow(mockDB);
    var win = env.win;
    var BM = win.BackupManager;

    var encP = BM.exportEncryptedBackup();
    await settle();
    driveModal(win, PASSPHRASE, true);
    var encResult = await encP;

    var sgFile = new win.File([encResult.blob], encResult.filename, { type: 'application/octet-stream' });
    var impP = BM.importBackup(sgFile);
    await settle();
    driveModal(win, PASSPHRASE, false);
    await impP;

    assert.strictEqual(mockDB.__restored.clients.length, SOURCE_CLIENTS.length,
      'the client must be restored (proves the decrypt→JSZip→JSON.parse→restore path ran, not just the modal)');
    assert.strictEqual(mockDB.__restored.clients[0].firstName, 'Maya',
      'restored client identity must be intact');
  });

  await test('backup.js is UNCHANGED by this plan (test-only guard): notes serialize via whole-object JSON', function () {
    // This plan adds NO source change to backup.js. The property under test is
    // exactly that backup.js treats note strings as opaque JSON values. Assert
    // the two serialization anchors the round-trip relies on are still present.
    var src = readAsset('assets/backup.js');
    assert.ok(/JSON\.stringify\(manifest/.test(src),
      'backup.js must still serialize the manifest (incl. sessions) via JSON.stringify — the wholesale round-trip contract');
    assert.ok(/JSON\.parse\(/.test(src),
      'backup.js must still parse the restored manifest via JSON.parse');
  });

  // ── Count guard — no vacuous green ─────────────────────────────────────────
  var EXPECTED = 3;
  if (passed + failed !== EXPECTED) {
    console.log('  FAIL  count guard: expected ' + EXPECTED + ' tests, ran ' + (passed + failed));
    failed++;
  } else {
    console.log('  PASS  count guard: ' + EXPECTED + ' tests ran');
  }

  console.log('');
  console.log('Phase 45 Plan 05 — backup round-trip (RTXT-10) — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);

})().catch(function (err) {
  console.error('FATAL test harness error:', err && err.stack || err);
  process.exit(1);
});
