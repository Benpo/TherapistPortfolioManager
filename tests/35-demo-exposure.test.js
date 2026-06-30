/**
 * tests/35-demo-exposure.test.js — Phase 35 Plan 02 Task 2.
 *
 * WAVE-0 RED GATE for the demo **exposure lock-down** (DEMO-11 / D-09).
 *
 * WHAT THIS PINS (and why the demo halves are RED today):
 *   In demo mode the destructive / account-level controls must be hidden or
 *   disabled so a demo visitor cannot export real data, import over the demo DB,
 *   or touch license activation. Today NONE of these guards exist:
 *     - app.js initCommon mounts #backupCloudBtn unconditionally, and demo.html's
 *       inline #exportBtn / .import-label render normally in demo.
 *     - license.js binds the activate/deactivate buttons with no demo gate.
 *     - backup-modal.js openExportFlow reaches BM.exportEncryptedBackup() with no
 *       demo gate (openImportFlow already has one — that is the pattern to mirror).
 *   35-06 adds the demo guards; this file then goes GREEN with no edits.
 *
 * FALSIFIABLE ASYMMETRY (not a blanket fail — Pitfall 4, threat T-35-02-FG):
 *   Each control is checked in BOTH demo AND normal mode. The demo half asserts
 *   the control is hidden/disabled/blocked (RED today); the NORMAL half asserts
 *   it is present/enabled/reached (GREEN today). The normal half is the
 *   no-regression guard: 35-06 cannot satisfy this gate by breaking the real app.
 *
 *   Real DOM across demo.html (demo home), index.html (non-demo home),
 *   license.html (real license.js init), and a bare window for the REAL
 *   window.openExportFlow with spied export primitives. A completion sentinel
 *   (.app-footer) guards the async initCommon halves against vacuous-green.
 *
 * Read-only: EVALs assets/*.js into isolated jsdom windows; writes no assets/*.
 *
 * Run: node tests/35-demo-exposure.test.js
 * Exits 0 on full pass, 1 on any failure. RED (non-zero) is EXPECTED at Wave 0.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createMockPortfolioDB = require('./_helpers/mock-portfolio-db').createMockPortfolioDB;
var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }

// hidden/disabled detector tolerant of jsdom (no CSS cascade — only inline
// style, the `hidden` attr, the .is-hidden utility class, .disabled, or a hidden
// ancestor count as hidden). Absent (null) also counts as hidden.
function isHiddenOrDisabled(el) {
  if (!el) return true;
  var node = el;
  while (node && node.nodeType === 1) {
    if (node.hidden === true) return true;
    if (node.getAttribute && node.getAttribute('hidden') !== null) return true;
    if (node.classList && node.classList.contains('is-hidden')) return true;
    var style = node.style;
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return true;
    node = node.parentNode;
  }
  if (el.disabled === true) return true;
  return false;
}

// ── Home-page env: boot demo.html / index.html and run the REAL App.initCommon ──
// Mirrors tests/35-demo-chrome.test.js. shared-chrome.js is evaled so the
// .app-footer completion sentinel renders (35-03 adds it to demo.html's own
// <script> set; here we eval it directly to keep the Wave-0 harness honest).
async function buildHomeEnv(htmlFile, demo) {
  var dom = new JSDOM(readAsset(htmlFile), {
    url: 'https://localhost/' + htmlFile,
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };
  win.eval(readAsset('assets/version.js'));
  win.eval(readAsset('assets/i18n-en.js'));
  win.eval(readAsset('assets/i18n-he.js'));
  win.eval(readAsset('assets/i18n-de.js'));
  win.eval(readAsset('assets/i18n-cs.js'));
  win.eval(readAsset('assets/i18n.js'));
  win.eval(readAsset('assets/shared-chrome.js'));
  win.eval(readAsset('assets/app.js'));

  win.name = demo ? 'demo-mode' : '';
  win.PortfolioDB = createMockPortfolioDB({});

  if (!win.App || typeof win.App.initCommon !== 'function') {
    throw new Error('assets/app.js did not expose App.initCommon');
  }
  await win.App.initCommon();
  await flush();
  return { dom: dom, win: win };
}

// ── License env: boot license.html and run the REAL license.js DOMContentLoaded ──
function buildLicenseEnv(demo) {
  var dom = new JSDOM(readAsset('license.html'), {
    url: 'https://localhost/license.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };
  win.eval(readAsset('assets/version.js'));
  win.eval(readAsset('assets/i18n-en.js'));
  win.eval(readAsset('assets/i18n-he.js'));
  win.eval(readAsset('assets/i18n-de.js'));
  win.eval(readAsset('assets/i18n-cs.js'));
  win.eval(readAsset('assets/i18n.js'));
  win.eval(readAsset('assets/shared-chrome.js'));
  win.eval(readAsset('assets/license.js'));

  win.name = demo ? 'demo-mode' : '';
  // license.js registers its init on DOMContentLoaded; jsdom already finished
  // parsing (readyState complete) so the listener has not fired — dispatch it.
  win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
  return { dom: dom, win: win };
}

// ── Export-flow env: eval backup-modal.js into a bare window. It exposes
// window.openExportFlow unconditionally on module load (no DOM/wiring needed),
// so we inject an App showToast spy + a BackupManager mock whose export
// primitives are spies (a real export is never triggered).
function buildExportEnv(demo) {
  var dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://localhost/index.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  win.eval(readAsset('assets/backup-modal.js'));

  var calls = { exportEncryptedBackup: 0, exportBackup: 0 };
  win.BackupManager = {
    // Resolve a finished encrypted export so openExportFlow completes cleanly
    // without falling through to exportBackup. The SPY is the call counter.
    exportEncryptedBackup: function () { calls.exportEncryptedBackup++; return Promise.resolve({ ok: true, blob: {}, filename: 'demo.sgbackup' }); },
    exportBackup: function () { calls.exportBackup++; return Promise.resolve({ blob: {}, filename: 'demo.zip' }); },
    triggerDownload: function () {},
  };
  win.App = createAppStub({ t: function (k) { return k; }, showToast: function () {} });

  win.name = demo ? 'demo-mode' : '';
  if (typeof win.openExportFlow !== 'function') {
    throw new Error('assets/backup-modal.js did not expose window.openExportFlow');
  }
  return { dom: dom, win: win, calls: calls };
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(function () { console.log('  PASS  ' + name); passed++; })
    .catch(function (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; });
}

async function main() {
  // ─── Home controls — DEMO (RED): backup-cloud absent, export/import hidden ──
  await test('DEMO-11 home/demo: #backupCloudBtn absent, #exportBtn hidden, .import-label hidden (demo.html)', async function () {
    var env = await buildHomeEnv('demo.html', true);
    var doc = env.win.document;
    assert.ok(doc.querySelector('.app-footer'),
      'completion sentinel: .app-footer must render (initCommon ran to the end)');
    assert.ok(isHiddenOrDisabled(doc.getElementById('backupCloudBtn')),
      'demo mode must NOT mount #backupCloudBtn (cloud backup is hidden in demo)');
    assert.ok(isHiddenOrDisabled(doc.getElementById('exportBtn')),
      'demo mode must hide the inline #exportBtn');
    assert.ok(isHiddenOrDisabled(doc.querySelector('.import-label')),
      'demo mode must hide the .import-label import control');
    env.dom.window.close();
  });

  // ─── Home controls — NORMAL (GREEN no-regression): real app untouched ───────
  // index.html is the REAL production home; its backup/export flows through the
  // #backupCloudBtn entry point → modal (there is no inline #exportBtn). The
  // demo half hides #backupCloudBtn; here it MUST be mounted and visible — the
  // direct falsifiable inverse that proves the 35-06 guard is demo-scoped. The
  // export button itself lives inside the #backupModal (is-hidden until opened),
  // so asserting its *visibility* would be a false target — we assert only that
  // it remains present in the DOM (not stripped by the guard).
  await test('DEMO-11 home/normal: #backupCloudBtn present/visible and #backupModalExport still in DOM (index.html)', async function () {
    var env = await buildHomeEnv('index.html', false);
    var doc = env.win.document;
    assert.ok(doc.querySelector('.app-footer'),
      'completion sentinel: .app-footer must render (initCommon ran to the end)');
    assert.ok(!isHiddenOrDisabled(doc.getElementById('backupCloudBtn')),
      'normal mode must mount #backupCloudBtn — the guard is demo-scoped, the real app is untouched');
    assert.ok(doc.getElementById('backupModalExport'),
      'normal mode must keep the real export control (#backupModalExport) in the DOM');
    env.dom.window.close();
  });

  // ─── License controls — DEMO (RED): activate + deactivate disabled/hidden ───
  await test('DEMO-11 license/demo: #license-activate-btn AND #license-deactivate-btn disabled/hidden (license.html)', async function () {
    var env = buildLicenseEnv(true);
    var doc = env.win.document;
    assert.ok(isHiddenOrDisabled(doc.getElementById('license-activate-btn')),
      'demo mode must disable/hide #license-activate-btn');
    assert.ok(isHiddenOrDisabled(doc.getElementById('license-deactivate-btn')),
      'demo mode must disable/hide #license-deactivate-btn');
    env.dom.window.close();
  });

  // ─── License controls — NORMAL (GREEN no-regression): activate enabled ──────
  await test('DEMO-11 license/normal: #license-activate-btn enabled/visible (license.html)', async function () {
    var env = buildLicenseEnv(false);
    var doc = env.win.document;
    assert.ok(!isHiddenOrDisabled(doc.getElementById('license-activate-btn')),
      'normal mode must keep #license-activate-btn enabled/visible — the real license page is untouched');
    env.dom.window.close();
  });

  // ─── Backup export FLOW — DEMO (RED): primitive must NOT be reached ─────────
  await test('DEMO-11 export/demo: window.openExportFlow blocks — neither export primitive runs + exportDisabledDemo toast', async function () {
    var env = buildExportEnv(true);
    await env.win.openExportFlow({});
    await flush();
    assert.strictEqual(env.calls.exportEncryptedBackup, 0,
      'demo mode must block openExportFlow before BM.exportEncryptedBackup (no demo guard exists today → RED)');
    assert.strictEqual(env.calls.exportBackup, 0,
      'demo mode must not reach BM.exportBackup either');
    var toasts = env.win.App.__calls.get('showToast') || [];
    var sawDisabled = toasts.some(function (args) { return args.indexOf('toast.exportDisabledDemo') !== -1; });
    assert.ok(sawDisabled,
      'demo mode should surface App.showToast(..., "toast.exportDisabledDemo")');
    env.dom.window.close();
  });

  // ─── Backup export FLOW — NORMAL (GREEN no-regression): primitive reached ───
  await test('DEMO-11 export/normal: window.openExportFlow reaches BM.exportEncryptedBackup', async function () {
    var env = buildExportEnv(false);
    await env.win.openExportFlow({});
    await flush();
    assert.strictEqual(env.calls.exportEncryptedBackup, 1,
      'normal mode must reach BM.exportEncryptedBackup — the real export flow is untouched');
    env.dom.window.close();
  });

  // ─── count guard (no case silently skipped) ────────────────────────────────
  var EXPECTED_COUNT = 6;
  if (passed + failed !== EXPECTED_COUNT) {
    console.error('\nGUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — a case was silently skipped.');
    process.exit(1);
    return;
  }

  console.log('');
  console.log('Plan 35-02 demo-exposure RED gate — ' + passed + ' passed, ' + failed + ' failed');
  console.log('(RED/non-zero is EXPECTED at this wave: demo guards do not exist yet — demo halves FAIL, normal halves PASS.)');
  process.exit(failed === 0 ? 0 : 1);
}

main();
