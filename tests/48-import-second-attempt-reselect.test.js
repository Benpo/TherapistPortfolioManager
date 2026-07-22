/**
 * tests/48-import-second-attempt-reselect.test.js — the second-import silent
 * no-op regression (v1.4 ship blocker; debug session
 * .planning/debug/resolved/import-second-attempt-silent.md).
 *
 * BUG: On the Overview (index.html) the Backup & Restore import runs in-place —
 * after a restore, backup-modal.js awaits window.__afterBackupRestore (overview.js
 * → loadOverview, an IndexedDB read) instead of reloading the page. openImportFlow
 * used to reset the file input's value ONLY after that refresh promise settled. If
 * loadOverview stalls right after the restore's clearAll + bulk writes, the reset
 * never runs, so re-selecting the SAME .sgbackup fires no `change` event and the
 * confirm popup silently never appears — a second-attempt no-op that a page reload
 * (every other page's post-restore path) would have masked.
 *
 * FIX: the change handler resets importInput.value = '' IMMEDIATELY (capturing the
 * File first), so a same-file reselection always re-fires `change`, independent of
 * whether the in-place refresh settles.
 *
 * WHAT THIS PINS (observable OUTCOME — App.confirmDialog call count, a positive
 * assertion that the popup path is re-entered):
 *   - Under a HANGING post-restore refresh, a first same-file import followed by a
 *     SECOND selection of the SAME file re-opens the confirm dialog (confirmDialog
 *     called again). Before the fix this count stays 0 → silent no-op.
 *   - Sanity: under a NORMAL (resolving) refresh the second same-file attempt also
 *     re-opens the dialog, and the input value is cleared after the first attempt.
 *
 * MUST FAIL before the fix: reverting the change handler to gate importInput.value
 * reset behind openImportFlow's settled promise makes attempt-2 confirmDialog
 * calls = 0 under a hanging refresh.
 *
 * Run: node tests/48-import-second-attempt-reselect.test.js — exit 0 on full pass,
 * 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
var BACKUP_MODAL_SRC = fs.readFileSync(path.join(REPO_ROOT, 'assets/backup-modal.js'), 'utf8');

var passed = 0, failed = 0;
var CASES = [];
function test(name, fn) { CASES.push({ name: name, fn: fn }); }
async function runAll() {
  for (var i = 0; i < CASES.length; i++) {
    try { await CASES[i].fn(); console.log('  PASS  ' + CASES[i].name); passed++; }
    catch (err) { console.log('  FAIL  ' + CASES[i].name); console.log('        ' + (err && err.message || err)); failed++; }
  }
}

function settle(win, n) {
  var p = Promise.resolve();
  for (var i = 0; i < (n || 12); i++) p = p.then(function () { return new Promise(function (r) { win.setTimeout(r, 0); }); });
  return p;
}

// jsdom parses asynchronously: at win.eval time readyState is 'loading', so
// backup-modal.js defers bindBackupModal to DOMContentLoaded. Wait until it has
// wired (window.__backupModalWired) before driving the input.
async function ready(win) {
  for (var i = 0; i < 50 && !win.__backupModalWired; i++) await new Promise(function (r) { win.setTimeout(r, 0); });
  if (!win.__backupModalWired) throw new Error('backup-modal.js never wired (bindBackupModal did not run)');
}

// index.html-like static markup: #backupModal (static → injector is a no-op) +
// the shared #confirmModal (always present on index.html).
var HTML = '<!doctype html><html><head></head><body>' +
  '<div id="backupModal" class="modal is-hidden" role="dialog">' +
  '  <div class="modal-overlay"></div>' +
  '  <div class="modal-card">' +
  '    <p id="backupModalLastBackup"></p>' +
  '    <button id="backupModalShare" class="is-hidden"></button>' +
  '    <label><input id="backupModalImportInput" type="file" /></label>' +
  '  </div>' +
  '</div>' +
  '<div id="confirmModal" class="modal is-hidden" role="dialog">' +
  '  <div class="modal-overlay"></div><button id="confirmOkBtn"></button><button id="confirmCancelBtn"></button>' +
  '</div>' +
  '</body></html>';

// Build a window with the real backup-modal.js wired, a controllable confirmDialog
// (call counter + auto-confirm), a resolving BM.importBackup, and the index.html
// in-place __afterBackupRestore hook whose loadOverview behaviour is controllable.
function buildEnv(refreshBehavior) {
  var dom = new JSDOM(HTML, { url: 'https://app.local/index.html', runScripts: 'outside-only', pretendToBeVisual: true });
  var win = dom.window;
  var doc = win.document;

  var confirm = { calls: 0 };
  win.App = {
    // Mirrors app.js:1061 shape: re-query #confirmModal, resolve(false) if absent,
    // otherwise "show" and resolve true (auto-confirm) so the flow proceeds to import.
    confirmDialog: function () {
      confirm.calls++;
      var modal = doc.getElementById('confirmModal');
      if (!modal) return Promise.resolve(false);
      modal.classList.remove('is-hidden');
      return Promise.resolve(true);
    },
    applyTranslations: function () {},
    lockBodyScroll: function () {}, unlockBodyScroll: function () {},
    t: function (k) { return k; },
    showToast: function () {},
    setLanguage: function () {}, applyTheme: function () {},
    updateBackupCloudState: function () {},
  };
  win.BackupManager = {
    importBackup: function () { return Promise.resolve(); },
    isShareSupported: function () { return false; },
  };
  win.localStorage.setItem('portfolioLang', 'en');

  // index.html in-place refresh hook (overview.js:163). refreshBehavior === 'hang'
  // models loadOverview stalling after the restore; 'normal' resolves promptly.
  win.__afterBackupRestore = function () {
    win.App.setLanguage('en'); win.App.applyTheme(null);
    return Promise.resolve().then(function () {
      if (refreshBehavior === 'hang') return new Promise(function () {}); // never settles
      return Promise.resolve();
    });
  };

  win.eval(BACKUP_MODAL_SRC); // runs the IIFE + bindBackupModal (readyState 'complete')

  // Shadow-backed input value: jsdom forbids setting a file input's value to a
  // non-empty string, so override the accessor. This lets the REAL code's
  // `importInput.value = ''` run AND lets us model the browser rule "selecting the
  // same file as the current value fires no change event".
  var input = doc.getElementById('backupModalImportInput');
  var shadow = '';
  Object.defineProperty(input, 'value', { configurable: true, get: function () { return shadow; }, set: function (v) { shadow = String(v); } });
  Object.defineProperty(input, 'files', { configurable: true, get: function () { return shadow === '' ? [] : [{ name: shadow.split('\\').pop() }]; } });

  return { win: win, doc: doc, input: input, confirm: confirm };
}

// Simulate the OS file picker selecting `fileName`, honouring the "same file → no
// change event" rule. Returns whether a change event fired.
function selectFile(env, fileName) {
  var token = 'C:\\fakepath\\' + fileName;
  if (env.input.value === token) return false; // identical selection: browser fires no change
  env.input.value = token;
  env.input.dispatchEvent(new env.win.Event('change'));
  return true;
}

test('under a HANGING refresh, a SECOND same-file selection re-opens the confirm dialog (no silent no-op)', async function () {
  var env = buildEnv('hang');
  await ready(env.win);
  var callsBefore1 = env.confirm.calls;
  selectFile(env, 'backup.sgbackup'); // attempt 1
  return settle(env.win).then(function () {
    assert.strictEqual(env.confirm.calls - callsBefore1, 1, 'attempt 1 should open the confirm dialog once');
    assert.strictEqual(env.input.value, '', 'attempt 1 must clear the input value EAGERLY, even though the refresh hangs');

    var callsBefore2 = env.confirm.calls;
    var fired = selectFile(env, 'backup.sgbackup'); // attempt 2 — SAME file
    assert.strictEqual(fired, true, 'same-file reselection must fire `change` because the value was cleared');
    return settle(env.win).then(function () {
      assert.strictEqual(env.confirm.calls - callsBefore2, 1,
        'SECOND same-file import must re-open the confirm dialog — this is the fixed silent no-op');
    });
  });
});

test('under a NORMAL refresh, the second same-file attempt also re-opens the dialog and the input clears', async function () {
  var env = buildEnv('normal');
  await ready(env.win);
  selectFile(env, 'backup.sgbackup');
  return settle(env.win).then(function () {
    assert.strictEqual(env.input.value, '', 'input cleared after a normal first import');
    var callsBefore = env.confirm.calls;
    selectFile(env, 'backup.sgbackup');
    return settle(env.win).then(function () {
      assert.strictEqual(env.confirm.calls - callsBefore, 1, 'second same-file attempt opens the dialog under a normal refresh');
    });
  });
});

runAll().then(function () {
  console.log('\nimport second-attempt reselect: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
});
