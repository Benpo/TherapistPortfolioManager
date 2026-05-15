/**
 * Phase 25 Plan 06 — Behavior test for CropModule.resizeToMaxDimension (D-21).
 *
 * Loads assets/crop.js in a vm sandbox with stubbed createImageBitmap that
 * captures the `opts` argument for every call. Asserts the 800px-longest-edge
 * ceiling is enforced ALGORITHMICALLY (not via grep on a literal), and that
 * EXIF orientation is honored via `imageOrientation: 'from-image'`, and that
 * the resize hints (`resizeWidth` / `resizeHeight`) are passed on the second
 * pass so the browser downscales DURING decode (Pitfall 3 iPhone OOM
 * mitigation — lower peak memory).
 *
 * Run: node tests/25-06-resize-pure.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * 4 sub-cases per the Plan 06 BEHAVIOR spec:
 *   A. SMOKE — function exists, returns a Promise that resolves.
 *   B. PORTRAIT — 3024×4032 source → resizeHeight=800, resizeWidth=600.
 *   C. LANDSCAPE — 4032×3024 source → resizeWidth=800, resizeHeight=600.
 *   D. NO-DOWNSCALE — 400×300 source → no resizeWidth/resizeHeight hints
 *      on the second pass (because scale === 1).
 *
 * Closes the load-bearing D-21 gate per project memory
 * `feedback-behavior-verification.md` (runtime-behavior code requires
 * falsifiable behavior tests BEFORE implementation; grep gates verify
 * shape not behavior).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Sandbox state — mutated per sub-case.
// ────────────────────────────────────────────────────────────────────

const sandboxState = {
  capturedOpts: [],
  nextBitmapWidth: 100,
  nextBitmapHeight: 100,
  toBlobCalls: [],
};

function resetSandboxState(w, h) {
  sandboxState.capturedOpts = [];
  sandboxState.nextBitmapWidth = w;
  sandboxState.nextBitmapHeight = h;
  sandboxState.toBlobCalls = [];
}

// ────────────────────────────────────────────────────────────────────
// DOM stubs sufficient to run crop.js IIFE at module load.
// crop.js's IIFE does NOT do DOM work at load — only when openCropModal
// is called. resizeToMaxDimension creates a fake <canvas> via
// document.createElement on every call.
// ────────────────────────────────────────────────────────────────────

function makeCanvasStub() {
  return {
    width: 0,
    height: 0,
    getContext: function () {
      return {
        drawImage: function () {},
        clearRect: function () {},
        setTransform: function () {},
      };
    },
    toBlob: function (cb, type, quality) {
      sandboxState.toBlobCalls.push({ type: type, quality: quality });
      // Synchronously invoke the callback with a tiny fake JPEG-typed Blob.
      const out = new Blob(['x'], { type: type || 'application/octet-stream' });
      cb(out);
    },
  };
}

const documentStub = {
  createElement: function (tag) {
    if (tag === 'canvas') return makeCanvasStub();
    // crop.js init() reads getElementById('cropCanvas') etc. — not exercised here.
    return { setAttribute: function () {}, appendChild: function () {} };
  },
  getElementById: function () { return null; },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  addEventListener: function () {},
  removeEventListener: function () {},
  body: { appendChild: function () {}, prepend: function () {} },
  head: { appendChild: function () {} },
};

const sandbox = {
  window: { devicePixelRatio: 1 },
  document: documentStub,
  console: { log: function () {}, warn: function () {}, error: function () {} },
  navigator: { userAgent: '' },
  Image: function () { return { onload: null, src: '' }; }, // not exercised here
  Blob: Blob,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  queueMicrotask: queueMicrotask,
  Promise: Promise,
  Math: Math,
  JSON: JSON,
  Date: Date,
  Array: Array,
  Object: Object,
  Number: Number,
  String: String,
  Boolean: Boolean,
  Set: Set,
  Map: Map,
  RegExp: RegExp,
  // Programmable createImageBitmap stub — captures opts argument.
  createImageBitmap: function (blob, opts) {
    sandboxState.capturedOpts.push(opts);
    return Promise.resolve({
      width: sandboxState.nextBitmapWidth,
      height: sandboxState.nextBitmapHeight,
      close: function () {},
    });
  },
};
sandbox.window.document = documentStub;
vm.createContext(sandbox);

const rawSrc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'crop.js'), 'utf8');
// `const CropModule = (function ...)()` at the top level of a vm context does NOT
// attach CropModule to the sandbox global (lexical declarations stay in the script
// scope). Patch the leading declaration so the IIFE assigns to a sandbox-visible
// global instead. Pattern mirrors tests/24-04-app-cache.test.js's `App.` patch.
const src = rawSrc.replace(/^const\s+CropModule\s*=/m, 'this.CropModule =');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/crop.js' });
} catch (err) {
  console.error('FATAL: assets/crop.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const CropModule = sandbox.CropModule;
if (!CropModule) {
  console.error('FAIL: CropModule namespace not found on sandbox after loading crop.js.');
  process.exit(1);
}

// ────────────────────────────────────────────────────────────────────
// Test runner
// ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log('  PASS  ' + name); passed++; }
  catch (err) { console.log('  FAIL  ' + name); console.log('        ' + err.message); failed++; }
}

(async () => {
  // ─── A. SMOKE — signature + return shape ────────────────────────────
  await test('A. CropModule.resizeToMaxDimension exists, returns a Promise that resolves', async () => {
    assert.strictEqual(
      typeof CropModule.resizeToMaxDimension, 'function',
      'CropModule.resizeToMaxDimension must be a function — Plan 06 must add it as a public method.'
    );
    resetSandboxState(100, 100);
    const p = CropModule.resizeToMaxDimension(new Blob(['x']), 800, 0.75);
    assert.ok(p && typeof p.then === 'function', 'resizeToMaxDimension must return a Promise');
    await p; // must not reject
  });

  // ─── B. PORTRAIT — 3024×4032 source → longest edge clamped to 800 ───
  await test('B. PORTRAIT 3024×4032 → second-pass resizeHeight=800, resizeWidth=600, imageOrientation=from-image', async () => {
    resetSandboxState(3024, 4032);
    await CropModule.resizeToMaxDimension(new Blob(['x']), 800, 0.75);

    assert.strictEqual(
      sandboxState.capturedOpts.length, 2,
      'expected two-pass decode (probe + resize) — got ' + sandboxState.capturedOpts.length + ' createImageBitmap calls'
    );

    // Probe pass — EXIF on, NO resize hints (we don't know target dims yet).
    const probe = sandboxState.capturedOpts[0];
    assert.strictEqual(probe.imageOrientation, 'from-image',
      'probe pass must set imageOrientation:"from-image" for EXIF awareness');
    assert.strictEqual(probe.resizeWidth, undefined,
      'probe pass must NOT pass resizeWidth (no target yet)');
    assert.strictEqual(probe.resizeHeight, undefined,
      'probe pass must NOT pass resizeHeight (no target yet)');

    // Second pass — EXIF on AND resize hints set so longest edge = 800.
    const resize = sandboxState.capturedOpts[1];
    assert.strictEqual(resize.imageOrientation, 'from-image',
      'resize pass must set imageOrientation:"from-image" for EXIF awareness');
    assert.strictEqual(resize.resizeHeight, 800,
      'resize pass must clamp longest edge (height, 4032) to 800 — got ' + resize.resizeHeight);
    assert.strictEqual(resize.resizeWidth, Math.round(3024 * 800 / 4032),
      'resize pass must scale width proportionally (= Math.round(3024*800/4032) = 600) — got ' + resize.resizeWidth);
    assert.strictEqual(resize.resizeQuality, 'high',
      'resize pass must set resizeQuality:"high" for downscale fidelity');
  });

  // ─── C. LANDSCAPE — 4032×3024 source → longest edge clamped to 800 ──
  await test('C. LANDSCAPE 4032×3024 → second-pass resizeWidth=800, resizeHeight=600, imageOrientation=from-image', async () => {
    resetSandboxState(4032, 3024);
    await CropModule.resizeToMaxDimension(new Blob(['x']), 800, 0.75);

    assert.strictEqual(sandboxState.capturedOpts.length, 2,
      'expected two-pass decode (probe + resize) — got ' + sandboxState.capturedOpts.length);

    const resize = sandboxState.capturedOpts[1];
    assert.strictEqual(resize.imageOrientation, 'from-image',
      'resize pass must set imageOrientation:"from-image"');
    assert.strictEqual(resize.resizeWidth, 800,
      'resize pass must clamp longest edge (width, 4032) to 800 — got ' + resize.resizeWidth);
    assert.strictEqual(resize.resizeHeight, Math.round(3024 * 800 / 4032),
      'resize pass must scale height proportionally (= Math.round(3024*800/4032) = 600) — got ' + resize.resizeHeight);
    assert.strictEqual(resize.resizeQuality, 'high',
      'resize pass must set resizeQuality:"high"');
  });

  // ─── D. NO-DOWNSCALE — 400×300 source → NO resize hints on pass 2 ───
  await test('D. SMALL 400×300 (already under 800) → second-pass has NO resizeWidth/resizeHeight (scale === 1 guard)', async () => {
    resetSandboxState(400, 300);
    await CropModule.resizeToMaxDimension(new Blob(['x']), 800, 0.75);

    assert.strictEqual(sandboxState.capturedOpts.length, 2,
      'expected two-pass decode (probe + resize) — got ' + sandboxState.capturedOpts.length);

    const resize = sandboxState.capturedOpts[1];
    assert.strictEqual(resize.imageOrientation, 'from-image',
      'resize pass must STILL set imageOrientation:"from-image" even when not downscaling');
    assert.strictEqual(resize.resizeWidth, undefined,
      'small images must NOT receive resizeWidth (the `if (scale < 1)` guard skips it)');
    assert.strictEqual(resize.resizeHeight, undefined,
      'small images must NOT receive resizeHeight (the `if (scale < 1)` guard skips it)');
  });

  // ─── Report ─────────────────────────────────────────────────────────
  console.log('');
  console.log('Plan 06 resize-pure tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
