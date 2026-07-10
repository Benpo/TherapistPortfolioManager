/**
 * tests/quick-260710-tcu-tour-cleanurl-resume.test.js — hotfix 260710-tcu RED guard
 *
 * WHY (production bug, live-reproduced on Chromium AND WebKit against
 * https://sessionsgarden.app — see .claude/context/2026-07-10_tour-resume-bug-findings.md):
 * Cloudflare Pages serves CLEAN/extensionless URLs (`/settings.html` 308-redirects to
 * `/settings`). The tour identifies pages by their `.html` filename (STEPS[].page), and
 * `currentPage()` returned `location.pathname`'s raw last segment ("settings"), so every
 * cross-page page-check `STEPS[i].page !== _currentPage()` compared "settings.html" against
 * "settings" and FAILED. Result: `resume()` (and next/prev/start) silently no-op'd on the
 * production host — the tour could never advance past step 2. Invisible to the rest of the
 * suite because local/CI servers serve `/settings.html` LITERALLY (no clean-URL rewrite),
 * so `currentPage()` returned "settings.html" and matched. This is the structural gap this
 * test closes: it stubs a CLEAN URL, which nothing else in the suite ever does.
 *
 * WHAT THIS PINS (observable behavior of window.Tour.resume() via the mounted
 * `[data-tour-chrome]` node, Tour.isActive(), and Tour._getStepIndex()):
 *   - CLEAN URL `/settings` + resume marker {stepIndex:2}: resume() MUST mount step 3
 *     (chrome present, isActive() true, stepIndex 2). ← the falsifier: RED before the fix
 *     because currentPage() returns "settings" ≠ "settings.html" → early return, nothing mounts.
 *   - CONTROL, literal `/settings.html` + same marker: resume() mounts step 3 — proves the
 *     fix is a NO-OP on non-clean-URL hosts (passes before AND after the fix).
 *   - CONTROL, clean root `/` + marker {stepIndex:0}: resume() mounts step 1 — locks the
 *     pre-existing "/" → index.html default (passes before AND after the fix).
 *
 * HARNESS: mirrors tests/42-coordinator-tour-guard.test.js — eval assets/i18n-en.js and
 * assets/tour.js into an isolated jsdom window whose `url` sets window.location.pathname,
 * seed the sessionStorage resume marker, then drive the REAL Tour.resume(). The real
 * currentPage() is exercised (api._currentPage is NOT stubbed) so the page-check runs for real.
 *
 * Read-only: EVALs assets/* into a jsdom window; writes no assets/*.
 * Authored RED — the clean-URL settings case fails until currentPage() canonicalizes a
 * dotless (clean-URL) segment back to its `.html` identifier. Do NOT weaken to green.
 *
 * Run: node tests/quick-260710-tcu-tour-cleanurl-resume.test.js — exits 0 on full pass, 1 otherwise.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

var RESUME_KEY = 'sg.tourResume';

// url sets window.location.pathname — the ONLY input that distinguishes a clean-URL host
// ("/settings") from a literal one ("/settings.html"). No seam is overridden: the real
// currentPage() reads this pathname, exactly as it does in the browser.
function buildWindow(url) {
  var dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url: url,
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
    lockBodyScroll: function () {}, unlockBodyScroll: function () {},
  };
  win.eval(readAsset('assets/i18n-en.js'));
  win.I18N_DEFAULT = 'en';
  win.eval(readAsset('assets/tour.js'));
  if (!win.Tour || typeof win.Tour.resume !== 'function') {
    throw new Error('assets/tour.js did not expose window.Tour.resume');
  }
  return { dom: dom, win: win, Tour: win.Tour };
}

// Seed the resume marker exactly as next()/renderFallback persist it, then drive resume().
function resumeAt(url, stepIndex) {
  var env = buildWindow(url);
  env.win.sessionStorage.setItem(RESUME_KEY, JSON.stringify({ tourId: 'main', stepIndex: stepIndex }));
  env.Tour.resume();
  var chrome = env.win.document.querySelector('[data-tour-chrome]');
  return {
    env: env,
    mounted: !!chrome,
    active: env.Tour.isActive(),
    stepIndex: env.Tour._getStepIndex(),
  };
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

// ── FALSIFIER: clean URL `/settings` must resume step 3 ──────────────────────
test('clean-URL host — resume({stepIndex:2}) on /settings MOUNTS step 3 (the production bug)', function () {
  var r = resumeAt('https://localhost/settings', 2);
  assert.strictEqual(r.mounted, true,
    'on the clean-URL host, resume() must mount tour chrome for step 3 (currentPage() must ' +
    'canonicalize "/settings" → "settings.html" to match STEPS[2].page)');
  assert.strictEqual(r.active, true, 'a resumed tour must be active');
  assert.strictEqual(r.stepIndex, 2, 'resume() must land on step index 2 (personalize)');
  r.env.dom.window.close();
});

// ── CONTROL: literal `/settings.html` still resumes (fix is a no-op here) ─────
test('literal-URL host — resume({stepIndex:2}) on /settings.html still MOUNTS step 3 (no regression)', function () {
  var r = resumeAt('https://localhost/settings.html', 2);
  assert.strictEqual(r.mounted, true, 'literal .html host must keep working (fix must be a no-op here)');
  assert.strictEqual(r.active, true, 'a resumed tour must be active');
  assert.strictEqual(r.stepIndex, 2, 'resume() must land on step index 2 (personalize)');
  r.env.dom.window.close();
});

// ── CONTROL: clean root `/` resumes step 1 (locks the "/" → index.html default) ─
test('clean root — resume({stepIndex:0}) on / MOUNTS step 1 (pre-existing "/" → index.html default)', function () {
  var r = resumeAt('https://localhost/', 0);
  assert.strictEqual(r.mounted, true, 'clean root "/" must resolve to index.html and mount step 1');
  assert.strictEqual(r.active, true, 'a resumed tour must be active');
  assert.strictEqual(r.stepIndex, 0, 'resume() must land on step index 0 (overview)');
  r.env.dom.window.close();
});

console.log('\nquick-260710-tcu-tour-cleanurl-resume: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
