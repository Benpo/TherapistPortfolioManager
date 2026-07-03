/**
 * tests/30-settings-tabnav.test.js — settings ?tab= navigation (TEST-03b,
 * D-07/D-08).
 *
 * ROOT CAUSE THIS PINS: the settings page tab navigation (assets/settings.js
 * IIFE-3, lines 2035-2113) is currently uncovered. On load it reads the ?tab=
 * URL param (readUrlTab), selects the matching tab (activate), and an invalid
 * value falls back to the default; clicking a tab writes the new ?tab= to the
 * URL (writeUrlTab → history.replaceState). A Phase 31 extraction that broke
 * the param parsing, the active-tab wiring, or the URL write would ship with no
 * automated tripwire.
 *
 * THE GUARD (D-09 jsdom real-page): load the REAL settings.html + the REAL
 * assets/settings.js into a jsdom window whose URL carries ?tab=<value>, invoke
 * ONLY the IIFE-3 tab-nav boot handler (captured via the docListeners map — NOT
 * a blanket dispatchEvent that would also boot IIFE-1/snippets/backups/photos
 * and let an unrelated async rejection flake this test — F-F), then assert
 * OBSERVABLE state only (D-08): the active-tab class + aria-selected on the tab
 * button, panel visibility, and window.location.search. Never an internal
 * function name.
 *
 * boot() is SYNCHRONOUS (no await machinery needed), so the only async concern
 * is handler SELECTION — hence the docListeners capture to pick the right one.
 *
 * FALSIFIABLE (per feedback-behavior-verification): the invalid-tab case
 * pre-activates a NON-default tab before boot, then asserts boot RESET to the
 * default — so a boot that skipped the fallback (or a readUrlTab that wrongly
 * accepted the bogus value) would leave the wrong tab active and FAIL. The
 * valid-tab case asserts a tab OTHER than the authored default becomes active,
 * so a no-op boot fails. The URL case asserts location.search changes. Renaming
 * an INTERNAL helper (activate → selectTab) with no observable change stays
 * GREEN (D-08/D-12).
 *
 * F-A (vacuous-green trap): an end-of-file count guard asserts exactly
 * EXPECTED_COUNT cases executed, so a mis-wired run that silently skips cases
 * cannot exit green.
 *
 * Read-only: this test EVALS assets/settings.js + settings.html into an isolated
 * jsdom window; it never writes any assets/* production file.
 *
 * Run: node tests/30-settings-tabnav.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createAppStub = require('./_helpers/app-stub').createAppStub;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

/**
 * Build a jsdom env at settings.html<search>, eval the real settings.js, capture
 * the 5 DOMContentLoaded handlers and return ONLY the IIFE-3 tab-nav boot
 * (index 2: after IIFE-1 fields :643 and the snippets boot :2016; tab-nav is
 * registered at :2111).
 */
function buildTabEnv(search) {
  var html = readAsset('settings.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/settings.html' + (search || ''),
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  var captured = [];
  var realAdd = win.document.addEventListener.bind(win.document);
  win.document.addEventListener = function (type, fn, opts) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realAdd(type, fn, opts);
  };

  // tab-nav boot does not touch App/PortfolioDB, but the OTHER IIFEs deref these
  // at eval-safe points; inject harmless stubs so the whole-file eval never
  // throws. Only IIFE-3 is invoked.
  win.App = createAppStub();
  win.BroadcastChannel = function () {
    return { postMessage: function () {}, close: function () {}, addEventListener: function () {} };
  };
  win.PortfolioDB = {
    getAllTherapistSettings: function () { return Promise.resolve([]); },
    setTherapistSetting: function () { return Promise.resolve(); },
    getAllClients: function () { return Promise.resolve([]); },
    getAllSnippets: function () { return Promise.resolve([]); },
    estimatePhotosBytes: function () { return 0; },
    updateClient: function () { return Promise.resolve(); },
  };
  win.Snippets = { getPrefix: function () { return '!'; }, setPrefix: function () {} };
  win.SNIPPETS_SEED = [];
  win.BackupManager = {
    canEnableSchedule: function () { return true; },
    isAutoBackupSupported: function () { return false; },
    checkBackupSchedule: function () {},
    pickBackupFolder: function () { return Promise.resolve(null); },
  };
  win.CropModule = { resizeToMaxDimension: function () { return Promise.resolve({ size: 0 }); } };

  win.eval(readAsset('assets/settings.js'));

  // Select the tab-nav boot by stable identity (the only settings boot that queries
  // the settings-tabs tablist), asserting exactly one match — count/index-INDEPENDENT,
  // so it survives every settings.js extraction (Snippets 5->4, Photos 4->3, ...).
  var tabnavMatches = captured.filter(function (fn) { return String(fn).indexOf('settings-tabs[role="tablist"]') >= 0; });
  if (tabnavMatches.length !== 1) {
    throw new Error('expected exactly 1 tab-nav (settings-tabs tablist) DOMContentLoaded handler; got ' + tabnavMatches.length);
  }

  return { dom: dom, win: win, tabnavBoot: tabnavMatches[0] };
}

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── A. Valid ?tab= selects the matching tab ─────────────────────────────
  await test('a valid ?tab=snippets selects the snippets tab (active class + aria-selected); fields not active', async function () {
    var env = buildTabEnv('?tab=snippets');
    env.tabnavBoot(); // synchronous

    var win = env.win;
    var snippetsBtn = win.document.getElementById('settingsTabSnippetsBtn');
    var fieldsBtn = win.document.getElementById('settingsTabFieldsBtn');

    // The authored default is fields-active; snippets-active is only reachable
    // by boot honoring ?tab= — so this differs from a no-op boot.
    assert.ok(snippetsBtn.classList.contains('is-active'),
      'the snippets tab button must be active for ?tab=snippets');
    assert.strictEqual(snippetsBtn.getAttribute('aria-selected'), 'true',
      'the snippets tab aria-selected must be "true"');
    assert.ok(!fieldsBtn.classList.contains('is-active'),
      'the fields tab must not be active when snippets is selected');
    assert.strictEqual(fieldsBtn.getAttribute('aria-selected'), 'false',
      'the fields tab aria-selected must be "false" when snippets is selected');

    var snippetsPanel = win.document.getElementById('settingsTabSnippets');
    assert.ok(!snippetsPanel.hasAttribute('hidden'),
      'the snippets panel must be revealed (hidden removed) when its tab is active');

    env.dom.window.close();
  });

  // ─── B. Switching tabs writes the new ?tab= to the URL ───────────────────
  await test('clicking a different tab writes the new ?tab= to window.location.search', async function () {
    var env = buildTabEnv('?tab=snippets');
    env.tabnavBoot();

    var win = env.win;
    var backupsBtn = win.document.getElementById('settingsTabBackupsBtn');
    backupsBtn.click(); // activate('backups') -> writeUrlTab -> history.replaceState

    assert.ok(/[?&]tab=backups(?:&|$)/.test(win.location.search),
      'window.location.search must carry ?tab=backups after switching tabs; got "' + win.location.search + '"');
    assert.ok(backupsBtn.classList.contains('is-active'),
      'the backups tab must be active after its click');

    env.dom.window.close();
  });

  // ─── C. Invalid ?tab= falls back to the default tab ──────────────────────
  await test('an invalid ?tab= value falls back to the default (fields) tab', async function () {
    var env = buildTabEnv('?tab=bogus-not-a-tab');
    var win = env.win;

    var fieldsBtn = win.document.getElementById('settingsTabFieldsBtn');
    var snippetsBtn = win.document.getElementById('settingsTabSnippetsBtn');

    // Pre-activate a NON-default tab so a boot that skipped the fallback would
    // leave snippets active — proving the assertion below tests boot's fallback,
    // not the authored default markup.
    fieldsBtn.classList.remove('is-active');
    fieldsBtn.setAttribute('aria-selected', 'false');
    fieldsBtn.tabIndex = -1;
    snippetsBtn.classList.add('is-active');
    snippetsBtn.setAttribute('aria-selected', 'true');
    snippetsBtn.tabIndex = 0;

    env.tabnavBoot();

    assert.ok(fieldsBtn.classList.contains('is-active'),
      'the default (fields) tab must be active for an invalid ?tab= value (boot reset the pre-activated snippets tab)');
    assert.strictEqual(fieldsBtn.getAttribute('aria-selected'), 'true',
      'the fields tab aria-selected must be "true" on invalid-tab fallback');
    assert.ok(!snippetsBtn.classList.contains('is-active'),
      'snippets must not stay active on invalid-tab fallback — the bogus value must not be honored');

    env.dom.window.close();
  });

  // ─── D. ?tab=personalize deep-links to the new Personalization tab ────────
  // RED until Plan 06 adds the Personalization tab button/panel to settings.html
  // AND the `personalize` token to the readUrlTab whitelist (settings.js:729).
  // Falsifiable: with neither in place, readUrlTab rejects "personalize" and boot
  // falls back to fields, so the Personalization button/panel never activate (and
  // in fact do not exist yet) — this case FAILS. When Plan 06 lands the markup +
  // whitelist token, boot honors ?tab=personalize and this turns GREEN.
  await test('a valid ?tab=personalize selects the Personalization tab (active + aria-selected) and reveals its panel', async function () {
    var env = buildTabEnv('?tab=personalize');
    env.tabnavBoot(); // synchronous

    var win = env.win;
    var personalizeBtn = win.document.getElementById('settingsTabPersonalizeBtn');
    var fieldsBtn = win.document.getElementById('settingsTabFieldsBtn');

    // The Personalization tab is only reachable if boot honored ?tab=personalize;
    // a boot that rejected the (currently un-whitelisted) token falls back to
    // fields, so this differs from a no-op boot.
    assert.ok(personalizeBtn,
      'the Personalization tab button (#settingsTabPersonalizeBtn) must exist in settings.html');
    assert.ok(personalizeBtn.classList.contains('is-active'),
      'the Personalization tab button must be active for ?tab=personalize');
    assert.strictEqual(personalizeBtn.getAttribute('aria-selected'), 'true',
      'the Personalization tab aria-selected must be "true"');
    assert.strictEqual(personalizeBtn.getAttribute('tabindex'), '0',
      'the active Personalization tab must be keyboard-focusable (tabindex="0")');
    assert.ok(!fieldsBtn.classList.contains('is-active'),
      'the fields tab must not be active when personalize is selected');

    var panel = win.document.getElementById('settingsTabPersonalize');
    assert.ok(panel,
      'the Personalization panel (#settingsTabPersonalize) must exist in settings.html');
    assert.ok(!panel.hasAttribute('hidden'),
      'the Personalization panel must be revealed (hidden removed) when its tab is active');

    env.dom.window.close();
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────
  // Bumped 3 -> 4 for the Personalization deep-link case above (Plan 37-02, §9).
  var EXPECTED_COUNT = 4;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — a case was silently skipped.');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 30-04 settings-tabnav tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
