/**
 * tests/35-demo-chrome.test.js — Phase 35 Plan 01 Task 1.
 *
 * WAVE-0 RED GATE for the demo-home **chrome convergence** (DEMO-01/03/04).
 *
 * WHAT THIS LOCKS (and why it is RED today):
 *   demo.html currently ships its OWN hand-rolled chrome: a native
 *   `<select id="languageSelect">` language picker baked into the static
 *   markup, a `.header-actions` container with NO `id="headerActions"`, and no
 *   `shared-chrome.js` footer. The convergence work (35-03) deletes the native
 *   select, adds `id="headerActions"`, loads shared-chrome.js, and lets the
 *   REAL `App.initCommon()` inject the same converged chrome every other page
 *   gets (globe popover language picker + theme/settings/backup controls +
 *   `.app-footer` carrying `v{APP_VERSION}`).
 *
 *   This test boots demo.html in jsdom and runs the REAL `App.initCommon()`,
 *   then asserts the *desired post-35-03 end state*. It therefore FAILS now —
 *   specifically on the "exactly ONE language picker" assertion, because the
 *   native `select#languageSelect` still ships alongside the injected globe.
 *   When 35-03 lands, this file goes GREEN with no edits.
 *
 * FALSIFIABILITY / anti-vacuous-green (Pitfall 4, reference-pdf-jsdom-inert-gates):
 *   - We run the REAL async initCommon (not a stub) and assert a COMPLETION
 *     SENTINEL: `.app-footer` is rendered at the very END of initCommon
 *     (shared-chrome renderFooter). If initCommon threw early, the footer is
 *     absent and that case FAILs — so a silently-broken async path cannot
 *     masquerade as a pass.
 *   - Every assertion targets observable DOM nodes / textContent, never a spy
 *     "was called" flag and never the process exit code alone.
 *   - A final count guard asserts every case actually executed.
 *
 * APPROACH (mirrors tests/31-overview-render-hardening.test.js):
 *   Parse demo.html into jsdom with runScripts:'outside-only' (so demo.html's
 *   inline scripts do NOT auto-run), eval the production scripts in load order,
 *   set window.name='demo-mode' BEFORE initCommon (demo gating), inject a
 *   store-backed PortfolioDB mock so initCommon's two awaits resolve, then
 *   `await win.App.initCommon()`.
 *
 * Read-only: EVALs assets/*.js into an isolated jsdom window; writes no assets/*.
 *
 * Run: node tests/35-demo-chrome.test.js
 * Exits 0 on full pass, 1 on any failure. RED (non-zero) is EXPECTED at Wave 0.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var createMockPortfolioDB = require('./_helpers/mock-portfolio-db').createMockPortfolioDB;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

// Build a jsdom window from demo.html, eval the production scripts in the same
// order demo.html loads them, enter demo mode, inject the DB mock, and run the
// REAL initCommon to completion.
async function buildEnv() {
  var html = readAsset('demo.html');
  var dom = new JSDOM(html, {
    url: 'https://localhost/demo.html',
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;

  // matchMedia is touched by some chrome helpers (mirror 31-overview stub).
  win.matchMedia = function () {
    return {
      matches: false,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
    };
  };

  // Eval the production scripts in demo.html's load order. version.js first
  // (APP_VERSION source of truth), the four i18n dictionaries, i18n.js (defines
  // I18N_DEFAULT), shared-chrome.js (renderFooter + APP_VERSION resolution),
  // then app.js (App.initCommon + all chrome injectors).
  win.eval(readAsset('assets/version.js'));
  win.eval(readAsset('assets/i18n-en.js'));
  win.eval(readAsset('assets/i18n-he.js'));
  win.eval(readAsset('assets/i18n-de.js'));
  win.eval(readAsset('assets/i18n-cs.js'));
  win.eval(readAsset('assets/i18n.js'));
  win.eval(readAsset('assets/shared-chrome.js'));
  win.eval(readAsset('assets/app.js'));

  // Demo gating: initDemoMode() / the demo-banner path only fire when
  // window.name === 'demo-mode' (demo.html sets this in an inline script that
  // does NOT run under runScripts:'outside-only', so set it explicitly).
  win.name = 'demo-mode';

  // initCommon awaits PortfolioDB.getAllTherapistSettings() and
  // getAllSnippets(); the store-backed mock resolves both so the async path
  // reaches renderFooter (the completion sentinel).
  win.PortfolioDB = createMockPortfolioDB({});

  if (!win.App || typeof win.App.initCommon !== 'function') {
    throw new Error('assets/app.js did not expose App.initCommon');
  }

  // Run the REAL async chrome wiring to completion. Errors propagate to main()
  // and are reported as a hard setup failure (still RED, never a false green).
  await win.App.initCommon();
  // Flush any microtasks the best-effort integrity check queued.
  await new Promise(function (r) { setTimeout(r, 0); });

  return { dom: dom, win: win };
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

async function main() {
  var env;
  try {
    env = await buildEnv();
  } catch (err) {
    console.error('SETUP FAILED: App.initCommon() threw before the chrome could render.');
    console.error('  ' + (err && err.stack || err));
    process.exit(1);
    return;
  }

  var win = env.win;
  var doc = win.document;

  // ─── Completion sentinel: initCommon reached renderFooter (async guard) ─────
  test('completion sentinel: .app-footer is rendered (proves initCommon ran to the end)', function () {
    var footer = doc.querySelector('.app-footer');
    assert.ok(footer, 'shared-chrome renderFooter runs at the END of initCommon — a missing .app-footer means the async chrome path threw early');
  });

  // ─── DEMO-01: injected header controls land in the converged container ──────
  test('DEMO-01: the header-actions container holds injected chrome controls (childElementCount > 0)', function () {
    var actions = doc.getElementById('headerActions') || doc.querySelector('.header-actions');
    assert.ok(actions, 'demo.html must expose a header-actions container for initCommon to inject into');
    assert.ok(actions.childElementCount > 0,
      'initCommon must inject chrome controls (globe/theme/settings/backup) into the header-actions container');
  });

  // ─── DEMO-01/02: exactly ONE language picker (RED until 35-03) ──────────────
  // The converged globe popover (`.lang-globe-btn`, injected by
  // initLanguagePopover) is the ONLY language picker after 35-03. Today the
  // native `select#languageSelect` still ships in demo.html's static markup, so
  // there are TWO pickers — this case FAILS on the native-select assertion.
  test('DEMO-01/02: the native select#languageSelect is ABSENT and exactly one injected globe picker (.lang-globe-btn) is present', function () {
    var nativeSelect = doc.querySelector('select#languageSelect');
    assert.strictEqual(nativeSelect, null,
      'the dead native select#languageSelect must be removed from demo.html (35-03) — the injected globe popover is the single language picker');
    var globes = doc.querySelectorAll('.lang-globe-btn');
    assert.strictEqual(globes.length, 1,
      'exactly one injected globe language picker (.lang-globe-btn) must be present, got ' + globes.length);
  });

  // ─── DEMO-04: footer carries v{APP_VERSION} from the single source of truth ─
  test('DEMO-04: .app-footer-copy text contains "v" + AppVersion.APP_VERSION', function () {
    var copy = doc.querySelector('.app-footer-copy');
    assert.ok(copy, 'the converged footer must render an .app-footer-copy line');
    var expected = 'v' + win.AppVersion.APP_VERSION;
    assert.ok(copy.textContent.indexOf(expected) !== -1,
      'footer copy must contain ' + JSON.stringify(expected) + ', got ' + JSON.stringify(copy.textContent));
  });

  // ─── DEMO-03: demo banner present with non-empty localized text ─────────────
  test('DEMO-03: a .demo-banner with non-empty .demo-banner-text is present', function () {
    var banner = doc.querySelector('.demo-banner');
    assert.ok(banner, 'demo mode must render a .demo-banner');
    var text = banner.querySelector('.demo-banner-text');
    assert.ok(text, 'the .demo-banner must contain a .demo-banner-text element');
    assert.ok(text.textContent && text.textContent.trim().length > 0,
      'the .demo-banner-text must carry non-empty localized copy');
  });

  env.dom.window.close();

  // ─── count guard (no case silently skipped) ───────────────────────────────
  var EXPECTED_COUNT = 5;
  if (passed + failed !== EXPECTED_COUNT) {
    console.error('\nGUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — a case was silently skipped.');
    process.exit(1);
    return;
  }

  console.log('');
  console.log('Plan 35-01 demo-chrome RED gate — ' + passed + ' passed, ' + failed + ' failed');
  console.log('(RED/non-zero is EXPECTED at this wave: the native select#languageSelect still ships.)');
  process.exit(failed === 0 ? 0 : 1);
}

main();
