/**
 * tests/30-photos-optimize-loop.test.js — Phase 30 Plan 09 (GAP-09, region A5).
 *
 * ROOT CAUSE THIS CLOSES: the Settings → Photos optimize pipeline in
 * assets/settings.js — the REAL _optimizeAllPhotosLoop body (:2512-2541), the
 * dataURL adapters dataURLToBlob/blobToDataURL (:2451-2468), and the
 * handleOptimize SUCCESS path (:2831-2840 dependency assembly → :2856-2883
 * inline preview pill + success toast) — was never actually EXECUTED with
 * truthful byte math by any prior test:
 *
 *   - 25-11 either declines the confirm, hits the "unavailable" guard, or
 *     MONKEY-PATCHES __PhotosTabHelpers._optimizeAllPhotosLoop to reject — so
 *     the real loop body never runs; and
 *   - 25-11's Blob/FileReader/atob/btoa are CONSTANT-output fakes
 *     (FileReader always yields 'data:image/jpeg;base64,' + 'A'.repeat(10)),
 *     which makes any savedBytes number meaningless (a fixed constant).
 *
 * THE GUARD: load the REAL assets/settings.js via vm.createContext +
 * vm.runInContext (so window.__PhotosTabHelpers is populated at eval time
 * WITHOUT monkey-patching the loop), and install the 30-07 Task-0 FAITHFUL,
 * Buffer-backed base64 codec (atob/btoa/Blob/FileReader from
 * tests/_helpers/base64-codec.js) on the sandbox so the REAL dataURLToBlob/
 * blobToDataURL adapters compute TRUTHFUL base64 lengths — never the 25-11
 * constant-output fakes.
 *
 *   Case 1 (strictly-smaller persist, EXACT savedBytes): call the REAL loop
 *   helper directly with a resize that returns a strictly-smaller blob of known
 *   bytes + the REAL helpers.blobToDataURL/helpers.dataURLToBlob; assert the
 *   optimized dataURL was persisted AND result.savedBytes === the EXACT integer
 *   the loop computes from the real base64 lengths (floor(origB64*0.75) −
 *   floor(newB64*0.75)), NOT savedBytes > 0.
 *
 *   Case 2 (no-shrink no-op): a same-size resize → NO persist, savedBytes === 0.
 *
 *   Case 3 (real handleOptimize success path): drive the real click handler with
 *   confirmDialog→true and CropModule.resizeToMaxDimension returning a strictly
 *   smaller blob, so the REAL dependency assembly at settings.js:2831-2840 runs,
 *   and assert the inline preview pill text + the success toast. This catches a
 *   wrong-args wiring break in handleOptimize that calling the loop directly
 *   would miss.
 *
 * FALSIFIABLE (per feedback-behavior-verification): in a scratch copy, change
 * the loop's `if (newBytes < origBytes)` guard to always-persist (or drop the
 * savedBytes accumulation) and the exact-savedBytes / no-shrink-no-op cases
 * FAIL. An internal rename keeps it GREEN.
 *
 * Read-only: vm-loads assets/settings.js into an isolated context; never writes
 * any assets/* production file.
 *
 * Run: node tests/30-photos-optimize-loop.test.js
 * Exits 0 on full pass, 1 on any failure.
 */

'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var vm = require('vm');

// The 30-07 Task-0 faithful base64 codec — NOT the 25-11 constant-output fakes.
var codec = require('./_helpers/base64-codec');

var REPO_ROOT = path.resolve(__dirname, '..');
var settingsSrc = fs.readFileSync(path.join(REPO_ROOT, 'assets', 'settings.js'), 'utf8');

function flush() { return new Promise(function (r) { setTimeout(r, 0); }); }
async function settle() { for (var i = 0; i < 8; i++) { await flush(); } }

// ── Minimal DOM stub (only what the photos IIFE touches) ──────────────────
function makeNode(id) {
  var listeners = new Map();
  var node = {
    id: id,
    _attributes: new Map(),
    _text: '',
    classList: {
      _c: new Set(),
      add: function (c) { this._c.add(c); },
      remove: function (c) { this._c.delete(c); },
      contains: function (c) { return this._c.has(c); },
      toggle: function (c, f) {
        if (f === true) this._c.add(c); else if (f === false) this._c.delete(c);
        else if (this._c.has(c)) this._c.delete(c); else this._c.add(c);
      },
    },
    get textContent() { return this._text; },
    set textContent(v) { this._text = String(v); },
    get disabled() { return this._disabled || false; },
    set disabled(v) { this._disabled = !!v; },
    setAttribute: function (k, v) { this._attributes.set(k, String(v)); },
    removeAttribute: function (k) { this._attributes.delete(k); },
    getAttribute: function (k) { return this._attributes.has(k) ? this._attributes.get(k) : null; },
    hasAttribute: function (k) { return this._attributes.has(k); },
    addEventListener: function (t, fn) { if (!listeners.has(t)) listeners.set(t, []); listeners.get(t).push(fn); },
    removeEventListener: function (t, fn) {
      if (!listeners.has(t)) return;
      var a = listeners.get(t); var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1);
    },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    focus: function () {},
    click: function () {
      var a = listeners.get('click') || [];
      for (var i = 0; i < a.length; i++) a[i]({ preventDefault: function () {}, currentTarget: node });
    },
    style: {},
  };
  return node;
}

function makeDom(ids) {
  var elements = new Map();
  (ids || []).forEach(function (id) { elements.set(id, makeNode(id)); });
  var domListeners = new Map();
  var document = {
    addEventListener: function (type, fn) {
      if (!domListeners.has(type)) domListeners.set(type, []);
      domListeners.get(type).push(fn);
    },
    removeEventListener: function () {},
    getElementById: function (id) { return elements.has(id) ? elements.get(id) : null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    createElement: function (t) { return makeNode('__syn_' + t); },
    body: makeNode('__body'),
    documentElement: makeNode('__html'),
    readyState: 'complete',
  };
  return { document: document, elements: elements, domListeners: domListeners };
}

/**
 * makeSandbox — vm context with the REAL settings.js loaded and the FAITHFUL
 * codec installed. Captures the 5 DOMContentLoaded handlers (does NOT auto-fire
 * them) so Case 3 can boot ONLY the photos IIFE.
 */
function makeSandbox(opts) {
  opts = opts || {};
  var dom = makeDom(opts.elementIds || []);
  var captured = [];
  var realDocAdd = dom.document.addEventListener;
  dom.document.addEventListener = function (type, fn) {
    if (type === 'DOMContentLoaded') { captured.push(fn); return; }
    return realDocAdd.call(dom.document, type, fn);
  };

  var showToastCalls = [];
  var updateClientCalls = [];

  var tValues = opts.tValues || {};
  function tStub(key) {
    return Object.prototype.hasOwnProperty.call(tValues, key) ? tValues[key] : key;
  }

  var PortfolioDB = {
    getAllClients: function () { return Promise.resolve((opts.clients || []).slice()); },
    updateClient: function (c) { updateClientCalls.push(c); return Promise.resolve(c); },
    estimatePhotosBytes: function (clients) {
      var total = 0;
      for (var i = 0; i < (clients || []).length; i++) {
        var c = clients[i];
        if (c && typeof c.photoData === 'string' && c.photoData.indexOf(',') !== -1) {
          var b64 = c.photoData.split(',')[1] || '';
          total += Math.floor(b64.length * 0.75);
        }
      }
      return total;
    },
  };
  if (opts.dbOverrides) { Object.keys(opts.dbOverrides).forEach(function (k) { PortfolioDB[k] = opts.dbOverrides[k]; }); }

  var App = {
    showToast: function (a, b) { showToastCalls.push([a, b]); },
    t: tStub,
    confirmDialog: function () { return Promise.resolve(!!opts.confirmResult); },
    initCommon: function () { return Promise.resolve(); },
    setLanguage: function () {}, applyTranslations: function () {},
  };

  var sandbox = {
    window: {},
    document: dom.document,
    navigator: { storage: { estimate: function () { return Promise.resolve({ usage: 0 }); } } },
    localStorage: (function () {
      var m = new Map();
      return {
        getItem: function (k) { return m.has(String(k)) ? m.get(String(k)) : null; },
        setItem: function (k, v) { m.set(String(k), String(v)); },
        removeItem: function (k) { m.delete(String(k)); },
        clear: function () { m.clear(); },
      };
    })(),
    console: { log: function () {}, warn: function () {}, error: function () {} },
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    Promise: Promise, JSON: JSON, Math: Math, Date: Date, Array: Array,
    Object: Object, Set: Set, Map: Map, RegExp: RegExp, String: String,
    Number: Number, Boolean: Boolean, Error: Error, Uint8Array: Uint8Array,
    ArrayBuffer: ArrayBuffer,
    // FAITHFUL base64 codec (30-07 Task 0) — the whole point of GAP-09.
    atob: codec.atob, btoa: codec.btoa, Blob: codec.Blob, FileReader: codec.FileReader,
  };
  sandbox.window.document = dom.document;
  sandbox.window.localStorage = sandbox.localStorage;
  sandbox.window.navigator = sandbox.navigator;
  sandbox.window.addEventListener = function () {};
  sandbox.window.removeEventListener = function () {};
  sandbox.window.App = App;
  sandbox.window.PortfolioDB = PortfolioDB;
  sandbox.window.atob = codec.atob;
  sandbox.window.btoa = codec.btoa;
  sandbox.window.Blob = codec.Blob;
  sandbox.window.FileReader = codec.FileReader;
  sandbox.window.setTimeout = setTimeout;
  sandbox.window.clearTimeout = clearTimeout;
  sandbox.App = App;
  sandbox.PortfolioDB = PortfolioDB;
  if (opts.cropModule !== null && typeof opts.cropModule !== 'undefined') {
    sandbox.window.CropModule = opts.cropModule;
    sandbox.CropModule = opts.cropModule;
  }

  vm.createContext(sandbox);
  vm.runInContext(settingsSrc, sandbox, { filename: 'assets/settings.js' });

  // Select the photos boot by stable identity (the named bindPhotosTab handler),
  // asserting exactly one match — count/index-INDEPENDENT, so it survives every
  // settings.js extraction (Snippets 5->4, Photos 4->3, ...).
  var photosMatches = captured.filter(function (fn) { return fn.name === 'bindPhotosTab'; });
  if (photosMatches.length !== 1) {
    throw new Error('expected exactly 1 photos (bindPhotosTab) DOMContentLoaded handler; got ' + photosMatches.length);
  }

  return {
    sandbox: sandbox,
    helpers: sandbox.window.__PhotosTabHelpers,
    captured: captured,
    photosBoot: photosMatches[0],
    dom: dom,
    showToastCalls: showToastCalls,
    updateClientCalls: updateClientCalls,
  };
}

// Build a real data-URL whose base64 decodes to `buf` bytes (image/jpeg).
function dataURLFor(buf) { return 'data:image/jpeg;base64,' + buf.toString('base64'); }
// The loop's byte formula: floor(base64Length * 0.75).
function loopBytes(buf) { return Math.floor(buf.toString('base64').length * 0.75); }

var passed = 0;
var failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + (err && err.message || err)); failed++; }
}

(async function () {
  // ─── Case 1: strictly-smaller persist with EXACT savedBytes ──────────────
  await test('strictly-smaller resize persists the optimized dataURL and returns the EXACT savedBytes', async function () {
    var origBuf = Buffer.alloc(300, 0xAB);   // 300 bytes → 400 b64 chars → 300 "bytes"
    var smallBuf = Buffer.alloc(150, 0xCD);  // 150 bytes → 200 b64 chars → 150 "bytes"
    var ctx = makeSandbox({});
    var h = ctx.helpers;
    assert.ok(h && typeof h._optimizeAllPhotosLoop === 'function', '__PhotosTabHelpers loop must be exposed');
    assert.strictEqual(typeof h.dataURLToBlob, 'function', 'REAL dataURLToBlob must be exposed');
    assert.strictEqual(typeof h.blobToDataURL, 'function', 'REAL blobToDataURL must be exposed');

    var client = { id: 'c1', photoData: dataURLFor(origBuf) };
    var clients = [client];
    var updates = [];
    var outBlob = new codec.Blob([smallBuf], { type: 'image/jpeg' });

    // REAL h.dataURLToBlob / h.blobToDataURL — NOT stubbed.
    var result = await h._optimizeAllPhotosLoop(
      function () { return Promise.resolve(clients); },
      function (c) { updates.push(c); return Promise.resolve(); },
      function (/* inBlob, maxEdge, quality */) { return Promise.resolve(outBlob); },
      h.blobToDataURL,
      h.dataURLToBlob
    );

    var expectedSaved = loopBytes(origBuf) - loopBytes(smallBuf);
    assert.strictEqual(expectedSaved, 150, 'sanity: expected savings is the known 150-byte delta');
    assert.strictEqual(updates.length, 1, 'a strictly-smaller resize must persist exactly one client');
    assert.strictEqual(updates[0].photoData, dataURLFor(smallBuf),
      'the persisted client must carry the optimized (smaller) dataURL from the real blobToDataURL');
    assert.strictEqual(result.success, 1, 'success count must be 1');
    assert.strictEqual(result.savedBytes, expectedSaved,
      'savedBytes must equal the EXACT integer the loop computes from the real base64 lengths (not just > 0)');
  });

  // ─── Case 2: no-shrink no-op (equal size → strict-less-than guard) ────────
  await test('a same-size resize does NOT persist and leaves savedBytes at 0 (strict-less-than guard)', async function () {
    var origBuf = Buffer.alloc(300, 0xAB);
    var sameBuf = Buffer.alloc(300, 0xCD);   // same byte length → newBytes === origBytes → NOT strictly smaller
    var ctx = makeSandbox({});
    var h = ctx.helpers;

    var client = { id: 'c1', photoData: dataURLFor(origBuf) };
    var clients = [client];
    var updates = [];
    var outBlob = new codec.Blob([sameBuf], { type: 'image/jpeg' });

    var result = await h._optimizeAllPhotosLoop(
      function () { return Promise.resolve(clients); },
      function (c) { updates.push(c); return Promise.resolve(); },
      function () { return Promise.resolve(outBlob); },
      h.blobToDataURL,   // REAL
      h.dataURLToBlob    // REAL
    );

    assert.strictEqual(loopBytes(sameBuf), loopBytes(origBuf), 'sanity: equal byte length');
    assert.strictEqual(updates.length, 0, 'a non-shrinking resize must NOT persist (no updateClient write)');
    assert.strictEqual(result.success, 0, 'success count must be 0 on a no-shrink no-op');
    assert.strictEqual(result.savedBytes, 0, 'savedBytes must stay 0 when nothing shrank');
  });

  // ─── Case 3: real handleOptimize success path (dependency assembly) ──────
  await test('handleOptimize success path: real dependency assembly persists + renders the inline pill + success toast', async function () {
    var origBuf = Buffer.alloc(400, 0xAB);
    var smallBuf = Buffer.alloc(200, 0xCD);
    var ctx = makeSandbox({
      elementIds: [
        'photosOptimizeBtn', 'photosDeleteAllBtn', 'photosStorageUsage', 'photosEmpty',
        'photosOptimizePreview', 'photosOptimizeSection', 'photosDeleteAllSection',
      ],
      clients: [{ id: 'c1', photoData: dataURLFor(origBuf) }],
      confirmResult: true,
      cropModule: {
        // The REAL handleOptimize wires this as the loop's `resize` dependency.
        resizeToMaxDimension: function () {
          return Promise.resolve(new codec.Blob([smallBuf], { type: 'image/jpeg' }));
        },
      },
      tValues: {
        'photos.optimize.success': 'OPT_OK success={success} failed={failed} size={size}',
      },
    });

    // Boot ONLY the photos IIFE (selected by bindPhotosTab identity) — never the others.
    ctx.photosBoot();
    await settle();

    var btn = ctx.dom.elements.get('photosOptimizeBtn');
    assert.ok(btn, 'photosOptimizeBtn must be mounted');
    btn.click();           // async handleOptimize
    await settle();

    // The real dependency assembly must have persisted the optimized photo.
    assert.strictEqual(ctx.updateClientCalls.length, 1,
      'the real handleOptimize→loop assembly must persist the shrunk photo (proves the args were wired correctly)');

    var expectedSaved = loopBytes(origBuf) - loopBytes(smallBuf);
    var expectedSize = ctx.helpers.humanBytes(expectedSaved);
    var expectedMsg = 'OPT_OK success=1 failed=0 size=' + expectedSize;

    var preview = ctx.dom.elements.get('photosOptimizePreview');
    assert.strictEqual(preview.textContent, expectedMsg,
      'the inline preview pill must render the substituted success message');
    assert.strictEqual(preview.hasAttribute('hidden'), false, 'the inline preview pill must be visible');

    var successToast = ctx.showToastCalls.find(function (a) { return a[0] === expectedMsg && a[1] === ''; });
    assert.ok(successToast, 'a success toast with the substituted message must fire; got ' + JSON.stringify(ctx.showToastCalls));
  });

  // ─── F-A end-of-file count guard ─────────────────────────────────────────
  var EXPECTED_COUNT = 3;
  try {
    assert.strictEqual(passed + failed, EXPECTED_COUNT);
  } catch (e) {
    console.error('\nF-A GUARD FAILED: expected ' + EXPECTED_COUNT + ' cases to execute, but ' +
      (passed + failed) + ' ran — an async case was silently skipped (vacuous-green trap).');
    process.exit(1);
  }

  console.log('');
  console.log('Plan 30-09 photos-optimize-loop tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})().catch(function (err) {
  console.error('FATAL (unhandled): ' + (err && err.stack || err));
  process.exit(1);
});
