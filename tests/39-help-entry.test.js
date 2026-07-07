/**
 * tests/39-help-entry.test.js — Phase 39 Plan 03 (HELP-01 / HELP-02) behavior
 * guard for the persistent "?" help entry mounted by App.initHelpEntry().
 *
 * WHAT THIS PINS (observable DOM behavior, not source shape):
 *   1. renderNav() emits the Help nav anchor (href ./help.html, data-nav=help,
 *      data-i18n=nav.help resolved to its EN label).
 *   2. A single .help-entry-btn mounts into #headerActions, carries .is-active
 *      when body[data-nav]='help', and its aria-label equals t('help.entry.label').
 *   3. The popover holds exactly the two day-one items whose textContent equals
 *      t('help.entry.center') / t('help.entry.contact') with hrefs ./help.html
 *      and mailto:contact@sessionsgarden.app.
 *   4. Idempotency — a second initHelpEntry() does NOT mount a second button.
 *   5. Clicking the button flips aria-expanded to "true"; an outside document
 *      click dismisses it back to "false" (D-09 globe-pattern popover).
 *
 * HARNESS: boots the REAL assets/app.js into an isolated jsdom window (same
 * eval-into-jsdom convention as tests/30-client-spotlight.test.js), seeding
 * window.I18N.en from assets/i18n-en.js so t() resolves help.entry.* + nav.help.
 * App.initHelpEntry is exported as a test seam (drives the mount directly,
 * exactly as initCommon calls it, without the full async boot).
 *
 * FALSIFIABLE: removing the `if (actions.querySelector('.help-entry-btn')) return;`
 * idempotency guard in app.js makes assertion (4) fail (verified + reverted at
 * authoring time).
 *
 * Read-only: EVALS assets/* into a jsdom window; writes no assets/*.
 *
 * Run: node tests/39-help-entry.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

// Build an isolated jsdom window with the shared-chrome mount points and the
// real App surface, on a page whose body[data-nav] is `navValue`.
function buildWindow(navValue) {
  var html = '<!DOCTYPE html><html><head></head>'
    + '<body' + (navValue ? ' data-nav="' + navValue + '"' : '') + '>'
    + '<div id="nav-placeholder"></div>'
    + '<div id="headerActions"></div>'
    + '</body></html>';
  var dom = new JSDOM(html, {
    url: 'https://localhost/help.html',
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
  // Seed the EN i18n dict FIRST so t() resolves help.entry.* + nav.help.
  win.eval(readAsset('assets/i18n-en.js'));
  win.I18N_DEFAULT = 'en';
  win.eval(readAsset('assets/app.js'));
  if (!win.App || typeof win.App.initHelpEntry !== 'function') {
    throw new Error('assets/app.js did not expose App.initHelpEntry (test seam)');
  }
  return { dom: dom, win: win, App: win.App };
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ── 1. renderNav Help anchor ────────────────────────────────────────────────
test('renderNav() emits a Help anchor (href ./help.html, data-nav=help, i18n label)', function () {
  var env = buildWindow('help');
  env.App.renderNav();
  var a = env.win.document.querySelector('#nav-placeholder a[data-nav="help"]');
  assert.ok(a, 'a Help nav anchor with data-nav="help" must exist');
  assert.strictEqual(a.getAttribute('href'), './help.html', 'nav href must be ./help.html');
  assert.strictEqual(a.getAttribute('data-i18n'), 'nav.help', 'nav anchor must carry data-i18n=nav.help');
  assert.strictEqual(a.textContent, env.App.t('nav.help'),
    'applyTranslations must resolve nav.help to its EN label');
  env.dom.window.close();
});

// ── 2. single mount + is-active + aria-label ────────────────────────────────
test('initHelpEntry() mounts exactly one .help-entry-btn with .is-active + i18n aria-label', function () {
  var env = buildWindow('help');
  env.App.initHelpEntry();
  var btns = env.win.document.querySelectorAll('.help-entry-btn');
  assert.strictEqual(btns.length, 1, 'exactly one .help-entry-btn must mount');
  var btn = btns[0];
  assert.ok(btn.classList.contains('is-active'),
    '.help-entry-btn must be .is-active when body[data-nav]="help"');
  assert.strictEqual(btn.getAttribute('aria-label'), env.App.t('help.entry.label'),
    'aria-label must equal t(help.entry.label)');
  assert.strictEqual(btn.getAttribute('title'), env.App.t('help.entry.label'),
    'title must equal t(help.entry.label)');
  env.dom.window.close();
});

// ── 3. popover items: textContent + hrefs ───────────────────────────────────
test('popover holds the two day-one items with correct textContent + hrefs', function () {
  var env = buildWindow('help');
  env.App.initHelpEntry();
  var items = env.win.document.querySelectorAll('.help-entry-item');
  assert.strictEqual(items.length, 2, 'popover must hold exactly two day-one items');
  assert.strictEqual(items[0].textContent, env.App.t('help.entry.center'),
    'item 0 label must be t(help.entry.center) via textContent');
  assert.strictEqual(items[0].getAttribute('href'), './help.html',
    'item 0 must navigate to ./help.html');
  assert.strictEqual(items[1].textContent, env.App.t('help.entry.contact'),
    'item 1 label must be t(help.entry.contact) via textContent');
  assert.strictEqual(items[1].getAttribute('href'), 'mailto:contact@sessionsgarden.app',
    'item 1 must be the contact mailto');
  env.dom.window.close();
});

// ── 4. no is-active off the help page ───────────────────────────────────────
test('initHelpEntry() does NOT add .is-active when body[data-nav] is not "help"', function () {
  var env = buildWindow('overview');
  env.App.initHelpEntry();
  var btn = env.win.document.querySelector('.help-entry-btn');
  assert.ok(btn, 'button must still mount off the help page');
  assert.ok(!btn.classList.contains('is-active'),
    '.is-active must be absent when data-nav != help');
  env.dom.window.close();
});

// ── 5. idempotency (falsifiable via the guard) ──────────────────────────────
test('a second initHelpEntry() does NOT mount a second .help-entry-btn (idempotent)', function () {
  var env = buildWindow('help');
  env.App.initHelpEntry();
  env.App.initHelpEntry();
  assert.strictEqual(env.win.document.querySelectorAll('.help-entry-btn').length, 1,
    'the idempotency guard must keep exactly one .help-entry-btn after two calls');
  env.dom.window.close();
});

// ── 6. toggle open + outside-click dismiss ──────────────────────────────────
test('clicking the button opens the popover (aria-expanded true); an outside click dismisses it', function () {
  var env = buildWindow('help');
  env.App.initHelpEntry();
  var win = env.win;
  var btn = win.document.querySelector('.help-entry-btn');
  assert.strictEqual(btn.getAttribute('aria-expanded'), 'false',
    'popover starts closed (aria-expanded=false)');

  btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.strictEqual(btn.getAttribute('aria-expanded'), 'true',
    'clicking the button must open the popover (aria-expanded=true)');

  win.document.body.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.strictEqual(btn.getAttribute('aria-expanded'), 'false',
    'an outside document click must dismiss the popover (aria-expanded=false)');
  env.dom.window.close();
});

console.log('\n39-help-entry: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
