/**
 * tests/41-tab-activation.test.js — Plan 41-10, v3 §5 per-step tab activation.
 *
 * Pins the NEW engine capability: a step may declare an `activate` selector — a
 * settings tab button the engine clicks on step entry (read-only view switch) to
 * un-hide the panel its anchor lives on BEFORE the anchor is measured (honest
 * deixis for the Fields/Snippets steps). Two behaviors are guarded:
 *
 *   1. Activation FIRES before measurement: on settings.html at the fields step,
 *      with BOTH the tab button (#settingsTabFieldsBtn) and the [data-tour="fields"]
 *      panel present, render() clicks the tab (counter increments) AND the spotlight
 *      mounts — proving the click ran before the anchor was measured.
 *   2. Degradation is UNCHANGED by activation: with the tab button present but the
 *      anchor absent (forced invisible), render() still drops the centered FALLBACK
 *      modal and does NOT advance the step index (no silent skip — TOUR-02).
 *
 * Branch selection is driven through the injectable Tour._isAnchorVisible seam (A5)
 * — jsdom hardcodes offsetParent === null so real offsetParent can never select the
 * visible branch. No pixel geometry is asserted.
 *
 * Run: node tests/41-tab-activation.test.js
 * Exits 0 on full pass, 1 on any failure (tests/run-all.js contract).
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var JSDOM = require('jsdom').JSDOM;

var REPO_ROOT = path.resolve(__dirname, '..');
function readAsset(rel) { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }

function buildEnv(opts) {
  opts = opts || {};
  var page = opts.page || 'index.html';
  var body = opts.body || '';
  var html = '<!DOCTYPE html><html lang="en"><head></head><body>' + body + '</body></html>';
  var dom = new JSDOM(html, {
    url: 'https://localhost/' + page,
    runScripts: 'outside-only',
    pretendToBeVisual: false,
  });
  var win = dom.window;
  win.I18N_DEFAULT = 'en';
  win.matchMedia = function () {
    return { matches: false, addEventListener: function () {}, removeEventListener: function () {},
             addListener: function () {}, removeListener: function () {} };
  };
  win.requestAnimationFrame = function (cb) { return setTimeout(cb, 0); };
  win.cancelAnimationFrame = function (id) { clearTimeout(id); };
  win.App = { lockBodyScroll: function () {}, unlockBodyScroll: function () {} };

  win.eval(readAsset('assets/i18n-en.js'));
  if (!win.I18N || !win.I18N.en) throw new Error('i18n-en.js did not populate window.I18N.en');
  win.eval(readAsset('assets/tour.js'));
  if (!win.Tour) throw new Error('assets/tour.js did not expose window.Tour');
  return { dom: dom, win: win, Tour: win.Tour };
}

// The fields step is index 3 in the v3 spine (overview, settings, personalize, fields, ...).
var FIELDS_STEP_INDEX = 3;

var EXPECTED_COUNT = 2;
var passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  await test('1. activation fires BEFORE measurement — tab clicked + spotlight mounts (honest deixis)', async function () {
    // settings.html with BOTH the fields tab button and the fields panel present.
    var env = buildEnv({
      page: 'settings.html',
      body: '<button id="settingsTabFieldsBtn"></button><div data-tour="fields">Fields</div>'
    });
    // Sanity: the fields step really carries the #settingsTabFieldsBtn activate selector.
    var steps = env.Tour._getSteps();
    assert.strictEqual(steps[FIELDS_STEP_INDEX].id, 'fields', 'fixture assumption: step 3 is the fields step');
    assert.strictEqual(steps[FIELDS_STEP_INDEX].activate, '#settingsTabFieldsBtn', 'fields step declares the tab activate selector');

    var clicks = 0;
    env.win.document.getElementById('settingsTabFieldsBtn')
      .addEventListener('click', function () { clicks++; });

    env.Tour._isAnchorVisible = function () { return true; };
    env.Tour._setStepIndex(FIELDS_STEP_INDEX);
    env.Tour._render();

    assert.strictEqual(clicks, 1, 'the engine clicks the activate tab exactly once on step entry');
    assert.ok(env.win.document.querySelector('.sg-tour-spotlight'),
      'the spotlight mounts after activation (activation ran before the anchor was measured)');
    assert.strictEqual(env.win.document.querySelector('.sg-tour-modal-scrim'), null,
      'no fallback modal when the (activated) anchor is visible');
  });

  await test('2. degradation UNCHANGED by activation — missing anchor still yields the fallback modal, no step advance (TOUR-02)', async function () {
    // Tab button present but NO [data-tour="fields"] panel; anchor forced invisible.
    var env = buildEnv({
      page: 'settings.html',
      body: '<button id="settingsTabFieldsBtn"></button>'
    });
    env.Tour._isAnchorVisible = function () { return false; };
    env.Tour._setStepIndex(FIELDS_STEP_INDEX);
    env.Tour._render();

    assert.ok(env.win.document.querySelector('.sg-tour-modal-scrim'),
      'a missing anchor after activation still renders the centered fallback modal (never a silent skip)');
    assert.strictEqual(env.win.document.querySelector('.sg-tour-spotlight'), null,
      'no spotlight on the missing branch');
    assert.strictEqual(env.Tour._getStepIndex(), FIELDS_STEP_INDEX,
      'the step index does not advance past a missing anchor (degradation unchanged by activation)');
  });

  var ran = passed + failed;
  if (ran !== EXPECTED_COUNT) {
    console.log('FAIL  scenario-count guard: ran ' + ran + ' of ' + EXPECTED_COUNT);
    process.exit(1);
  }
  process.exit(failed === 0 ? 0 : 1);
})();
