/**
 * tests/42-whats-new-gating.test.js — Phase 42 Plan 01 (CHLG-01) Wave-0 RED
 * behavior guard for the What's-New popup's coordinator gating contract.
 *
 * WHAT THIS PINS (observable behavior via the public window.AttentionCoordinator
 * API — { register, run, _getSurface } — and the literal storage key
 * 'sg.whatsNewLastSeenVersion'; NO fabricated key):
 *   T-42-V1 (once-per-version gating): with a fixture changelog entry for the
 *     running APP_VERSION present and sg.whatsNewLastSeenVersion unset (or a
 *     different version), the 'whats-new' surface eligible() is true; once
 *     sg.whatsNewLastSeenVersion === APP_VERSION, eligible() is false.
 *   T-42-V2 (first-ever-launch suppression): on genuinely fresh state (no
 *     sg.welcomeSeen, no sg.whatsNewLastSeenVersion) run() shows 'welcome'
 *     (PRECEDENCE[0]) and NOT 'whats-new'; after the welcome dismiss writes
 *     sg.whatsNewLastSeenVersion = APP_VERSION (attention-coordinator.js:227-231),
 *     whats-new eligible() is false — the new user never sees a redundant popup.
 *   T-42-V3 (silent-skip reconcile, D-07): when APP_VERSION differs from the
 *     stored lastSeen AND no changelog entry exists for APP_VERSION, eligible()
 *     is false, run() NEVER invokes the surface's show(), AND eval'ing
 *     whats-new.js has advanced sg.whatsNewLastSeenVersion to APP_VERSION so the
 *     NEXT real release is not silently suppressed.
 *
 * HARNESS: mirrors tests/40-coordinator.test.js — eval assets/attention-
 * coordinator.js then assets/whats-new.js into an isolated jsdom window, seeding
 * window.App (scroll-lock spies), window.AppVersion = { APP_VERSION }, a
 * window.CHANGELOG_CONTENT_EN fixture (independent of the real plan-04 data
 * file), and window.I18N.en. The surface is reached via
 * AttentionCoordinator._getSurface('whats-new') (attention-coordinator.js:502).
 *
 * Read-only: EVALs assets/* into a jsdom window; writes no assets/*.
 * Authored RED — assets/whats-new.js does NOT exist yet (Plan 05 ships it), so
 * buildWindow() throws on load and every case fails RED for the right reason.
 * Do NOT weaken to green.
 *
 * Run: node tests/42-whats-new-gating.test.js — exits 0 on full pass, 1 otherwise.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

var LAST_SEEN_KEY = 'sg.whatsNewLastSeenVersion';   // the ONLY key — never invent one

// Build an isolated jsdom window with the coordinator + the (Plan-05) whats-new
// surface evaluated in. `opts.appVersion` sets AppVersion.APP_VERSION;
// `opts.content` seeds window.CHANGELOG_CONTENT_EN; `opts.lastSeen` pre-seeds the
// storage key before whats-new.js runs (so the D-07 reconcile is exercised).
function buildWindow(opts) {
  opts = opts || {};
  var dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url: 'https://localhost/index.html',
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
  win.App = {
    _lock: 0, _unlock: 0,
    lockBodyScroll: function () { this._lock++; },
    unlockBodyScroll: function () { this._unlock++; },
  };
  win.AppVersion = { APP_VERSION: opts.appVersion || '1.3.0' };
  win.eval(readAsset('assets/i18n-en.js'));
  win.eval(readAsset('assets/i18n-he.js'));
  win.I18N_DEFAULT = 'en';
  // Seed the changelog data BEFORE the surface evaluates, so its gating +
  // D-07 reconcile see the fixture (never the real plan-04 file).
  win.CHANGELOG_CONTENT_EN = opts.content || [];
  // Optional Hebrew changelog fixture — seeded for the localized-highlight render
  // test so a locale-aware entries() (Plan 08) reads it under portfolioLang='he'.
  win.CHANGELOG_CONTENT_HE = opts.contentHe || [];
  // Optional UI language — the popup resolves copy + (post-Plan-08) entries from
  // portfolioLang. Set before the surface evaluates.
  if (opts.lang) win.localStorage.setItem('portfolioLang', opts.lang);
  if (opts.lastSeen != null) win.localStorage.setItem(LAST_SEEN_KEY, opts.lastSeen);
  win.eval(readAsset('assets/attention-coordinator.js'));
  // Plan 05 artifact — absent in Wave 0. readAsset throws ENOENT here → RED.
  win.eval(readAsset('assets/whats-new.js'));
  return { dom: dom, win: win, AC: win.AttentionCoordinator };
}

// A minimal changelog entry (schema: version, anchor, date, lede, highlights[2-4]).
function entry(version, highlights) {
  return {
    version: version,
    anchor: 'v' + version.replace(/\./g, '-'),
    date: '2026-07-09',
    lede: 'Release ' + version,
    highlights: highlights || ['Highlight one', 'Highlight two'],
    categories: { improved: ['Something'] },
  };
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ── T-42-V1 — once-per-version gating ───────────────────────────────────────
test('T-42-V1 once-per-version — eligible() true when an entry for APP_VERSION is unseen, false once lastSeen==APP_VERSION', function () {
  var env = buildWindow({ appVersion: '1.3.0', content: [entry('1.3.0')] });
  var surface = env.AC._getSurface('whats-new');
  assert.ok(surface, "_getSurface('whats-new') must return the registered surface");
  assert.strictEqual(surface.eligible(), true,
    'with a 1.3.0 entry present and ' + LAST_SEEN_KEY + ' unset, whats-new must be eligible');
  env.win.localStorage.setItem(LAST_SEEN_KEY, '1.3.0');
  assert.strictEqual(surface.eligible(), false,
    'once ' + LAST_SEEN_KEY + ' === APP_VERSION, whats-new must NOT be eligible');
  env.dom.window.close();
});

// ── T-42-V2 — first-ever-launch suppression ─────────────────────────────────
test('T-42-V2 first-launch — run() shows welcome (not whats-new); after welcome writes lastSeen=APP_VERSION whats-new is ineligible', function () {
  var env = buildWindow({ appVersion: '1.3.0', content: [entry('1.3.0')] });
  var win = env.win;
  // Genuinely fresh: no welcomeSeen, no lastSeen.
  win.localStorage.removeItem('sg.welcomeSeen');
  win.localStorage.removeItem(LAST_SEEN_KEY);
  var whatsNew = env.AC._getSurface('whats-new');
  var wnShown = 0;
  var origShow = whatsNew.show;
  whatsNew.show = function () { wnShown++; return origShow.apply(this, arguments); };
  env.AC.run();
  // Welcome (PRECEDENCE[0]) must win the single slot on a first-ever launch.
  assert.ok(win.document.querySelector('.welcome-overlay'),
    'run() on fresh state must mount the welcome overlay, not the whats-new popup');
  assert.strictEqual(wnShown, 0, 'whats-new must NOT show on the first-ever launch');
  // Simulate the welcome dismiss recording the last-seen version (coordinator.js:227-231).
  win.localStorage.setItem('sg.welcomeSeen', '1');
  win.localStorage.setItem(LAST_SEEN_KEY, win.AppVersion.APP_VERSION);
  assert.strictEqual(whatsNew.eligible(), false,
    'after welcome records lastSeen=APP_VERSION, whats-new must be ineligible (no redundant popup)');
  env.dom.window.close();
});

// ── T-42-V3 — silent-skip reconcile (D-07) ──────────────────────────────────
test('T-42-V3 silent-skip — APP_VERSION with no changelog entry: ineligible, run() never shows, and lastSeen is reconciled forward to APP_VERSION', function () {
  // APP_VERSION 1.3.0 differs from stored lastSeen 1.2.0, and there is NO entry
  // for 1.3.0 (only an older entry) → nothing to show, but the version pointer
  // must advance so the next real release is not suppressed.
  var env = buildWindow({ appVersion: '1.3.0', lastSeen: '1.2.0', content: [entry('1.2.0')] });
  var win = env.win;
  var surface = env.AC._getSurface('whats-new');
  assert.strictEqual(surface.eligible(), false,
    'with no changelog entry for APP_VERSION, whats-new must be ineligible');
  var shown = 0;
  var origShow = surface.show;
  surface.show = function () { shown++; return origShow.apply(this, arguments); };
  env.AC.run();
  assert.strictEqual(shown, 0, 'run() must never invoke whats-new show() when there is no entry for APP_VERSION');
  assert.strictEqual(win.localStorage.getItem(LAST_SEEN_KEY), '1.3.0',
    'the D-07 silent-skip reconcile must advance ' + LAST_SEEN_KEY + ' to APP_VERSION');
  env.dom.window.close();
});

// ── T-42-V4 — localized-highlight render (Pitfall 1) ─────────────────────────
// With portfolioLang='he' and a CHANGELOG_CONTENT_HE entry for APP_VERSION, the
// rendered popup highlights must be the HEBREW ones, NOT the English fixture.
// RED now: entries() reads window.CHANGELOG_CONTENT_EN unconditionally
// (whats-new.js:73-77), so show() renders the English marker. Flips GREEN when
// Plan 08 makes entries() locale-aware (reads CHANGELOG_CONTENT_<loc> by
// portfolioLang). This is the JS-fixture render gate — it seeds the data object
// directly and therefore CANNOT see a missing page <script> tag (that is T-42-V5).
test('T-42-V4 localized-highlight — portfolioLang=he renders the Hebrew highlight, not the English one (Plan 08 locale-aware entries)', function () {
  var heMarker = 'עברית-הדגשה-ייחודית';
  var enMarker = 'EN-UNIQUE-HIGHLIGHT';
  var env = buildWindow({
    appVersion: '1.3.0',
    lang: 'he',
    content: [entry('1.3.0', [enMarker, 'second highlight'])],
    contentHe: [entry('1.3.0', [heMarker, 'הדגשה שנייה'])],
  });
  var win = env.win;
  var surface = env.AC._getSurface('whats-new');
  assert.ok(surface, "_getSurface('whats-new') must return the registered surface");
  surface.show();
  var items = Array.prototype.map.call(
    win.document.querySelectorAll('.whats-new-highlights li'),
    function (li) { return li.textContent; }
  );
  var joined = items.join(' | ');
  assert.ok(items.length > 0, 'the popup must render highlight <li> items; got none');
  assert.ok(joined.indexOf(heMarker) !== -1,
    'rendered highlights must contain the Hebrew marker under portfolioLang=he (locale-aware entries — Plan 08); got: ' + joined);
  assert.strictEqual(joined.indexOf(enMarker), -1,
    'rendered highlights must NOT contain the English marker under portfolioLang=he; got: ' + joined);
  env.dom.window.close();
});

// ── T-42-V5 — cross-page popup-locale <script>-tag shape gate (BLOCKER 1) ────
// The What's-New popup reads window.CHANGELOG_CONTENT_<loc>; a page that loads
// whats-new.js but omits the locale sibling <script> tags renders English data
// regardless of the entries() fix. The T-42-V4 render test CANNOT catch this — it
// seeds CHANGELOG_CONTENT_HE directly, bypassing the page tags. So this purely-
// static gate reads every one of the nine pages that load whats-new.js and
// requires all three changelog-content locale siblings on each. RED now (Plan 08
// Task 3 adds the tags on all nine pages) — do NOT weaken to green.
test('T-42-V5 cross-page — every page that loads whats-new.js also loads the he/de/cs changelog-content siblings (BLOCKER 1)', function () {
  var PAGES = [
    'index.html', 'sessions.html', 'add-client.html', 'add-session.html',
    'settings.html', 'reporting.html', 'report.html', 'help.html', 'changelog.html',
  ];
  var SIBLINGS = ['changelog-content-he.js', 'changelog-content-de.js', 'changelog-content-cs.js'];
  // Falsifiability guard: confirm we are auditing exactly the pages that load the
  // popup — a page dropping whats-new.js (or a new one gaining it) should update
  // this list, not slip through silently.
  var loaders = fs.readdirSync(REPO_ROOT)
    .filter(function (f) { return /\.html$/.test(f); })
    .filter(function (f) { return readAsset(f).indexOf('whats-new.js') !== -1; })
    .sort();
  assert.deepStrictEqual(loaders, PAGES.slice().sort(),
    'the set of pages loading whats-new.js drifted from the audited nine: ' + loaders.join(', '));
  var problems = [];
  PAGES.forEach(function (page) {
    var src = readAsset(page);
    SIBLINGS.forEach(function (sib) {
      if (src.indexOf(sib) === -1) problems.push(page + ' missing ' + sib);
    });
  });
  assert.strictEqual(problems.length, 0,
    problems.length + ' page/sibling gap(s): ' + problems.join('; '));
});

// ── T-42-V6 — EN-fallback LTR re-key under RTL (WR-02; help BLOCKER-2 analog) ─
// When entries() falls back to EN for the rendered version under an RTL
// document (locale sibling failed to load / missing HE entry), the popup panel
// must carry .is-en-fallback so app.css flips its English lede/highlights LTR.
// A NATIVE HE entry must NOT carry the class — Hebrew keeps reading RTL.
test('T-42-V6 EN-fallback RTL — popup gains .is-en-fallback only when the rendered entry fell back to EN under [dir=rtl] (WR-02)', function () {
  // Case A: portfolioLang=he, HE has NO entry for APP_VERSION → per-entry EN
  // fallback; RTL document → the class must be present.
  var envA = buildWindow({ appVersion: '1.3.0', lang: 'he', content: [entry('1.3.0')], contentHe: [] });
  envA.win.document.documentElement.dir = 'rtl';
  envA.AC._getSurface('whats-new').show();
  var popupA = envA.win.document.querySelector('.whats-new-popup');
  assert.ok(popupA, 'popup must mount (fallback case)');
  assert.ok(popupA.classList.contains('is-en-fallback'),
    'EN-fallback entry under [dir=rtl] must mark the popup .is-en-fallback (WR-02)');
  envA.dom.window.close();
  // Case B: native HE entry present → no fallback, no class (Hebrew stays RTL).
  var envB = buildWindow({
    appVersion: '1.3.0', lang: 'he',
    content: [entry('1.3.0')], contentHe: [entry('1.3.0', ['הדגשה', 'עוד הדגשה'])],
  });
  envB.win.document.documentElement.dir = 'rtl';
  envB.AC._getSurface('whats-new').show();
  var popupB = envB.win.document.querySelector('.whats-new-popup');
  assert.ok(popupB, 'popup must mount (native case)');
  assert.strictEqual(popupB.classList.contains('is-en-fallback'), false,
    'a NATIVE HE entry must NOT be marked .is-en-fallback — Hebrew keeps reading RTL');
  envB.dom.window.close();
});

console.log('\n42-whats-new-gating: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
