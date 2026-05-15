/**
 * Phase 25 Plan 06 — Behavior test for D-22 crop-only photo persistence.
 *
 * This test verifies the add-client.js pipeline contract: when a user uploads
 * a photo, the IndexedDB write receives ONLY the cropped+resized output, and
 * the raw original File reference is NEVER persisted at any path.
 *
 * Strategy: vm-sandbox-load assets/add-client.js with a fully-controlled
 * environment so the test can drive the change event, the crop callback, and
 * the form submit, then spy on PortfolioDB.addClient to inspect the photoData
 * argument and exhaustively assert the raw original is absent.
 *
 * The CropModule stub here is synthetic — the real CropModule's resize+EXIF
 * behavior is verified by tests/25-06-resize-pure.test.js. This test is solely
 * about the add-client.js pipeline plumbing.
 *
 * Run: node tests/25-06-crop-only.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * 3 sub-cases per the Plan 06 BEHAVIOR spec:
 *   A. SMOKE — clientPhoto has a 'change' listener and clientForm has a
 *      'submit' listener registered after DOMContentLoaded.
 *   B. BEHAVIOR — full upload pipeline → IDB write captures the cropped
 *      sentinel as photoData; rawOriginal reference appears nowhere in the
 *      persisted record (exhaustive check via JSON serialize + per-field
 *      Blob check).
 *   C. REGRESSION — cancelled crop produces record.photoData === '' and no
 *      raw reference in the IDB write.
 *
 * Closes the load-bearing D-22 gate per VALIDATION.md (line 56) and project
 * memory `feedback-behavior-verification.md`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Test collectors — mutated by sandbox stubs.
// ────────────────────────────────────────────────────────────────────

const collectors = {
  resizeCalls: [],
  cropCalls: [],
  readFileCalls: [],
  dbWrites: [],
  toasts: [],
  // Behavior switches the test toggles before driving the pipeline:
  cropAction: 'save',        // 'save' invokes onSave; 'cancel' invokes onCancel.
  croppedDataUrlSentinel: '__CROPPED_SENTINEL_DATA_URL__',
};

function resetCollectors() {
  collectors.resizeCalls = [];
  collectors.cropCalls = [];
  collectors.readFileCalls = [];
  collectors.dbWrites = [];
  collectors.toasts = [];
  collectors.cropAction = 'save';
}

// ────────────────────────────────────────────────────────────────────
// DOM stubs — rich enough to satisfy add-client.js's DOMContentLoaded
// init AND the form submit path.
// ────────────────────────────────────────────────────────────────────

function makeListenerStore() {
  return {
    listeners: {},
    addEventListener: function (type, fn) {
      if (!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(fn);
    },
    removeEventListener: function () {},
  };
}

function makeInputStub(initialValue) {
  const stub = makeListenerStore();
  stub.value = initialValue === undefined ? '' : initialValue;
  stub.checked = false;
  stub.files = null;
  stub.classList = {
    add: function () {},
    remove: function () {},
    contains: function () { return false; },
    toggle: function () {},
  };
  stub.style = {};
  stub.setAttribute = function () {};
  stub.getAttribute = function () { return null; };
  stub.closest = function () { return null; };
  return stub;
}

function makeImgStub() {
  const stub = makeListenerStore();
  stub.src = '';
  stub.classList = {
    add: function () {},
    remove: function () {},
    contains: function () { return false; },
    toggle: function () {},
  };
  stub.style = {};
  return stub;
}

function makeFormStub() {
  const stub = makeListenerStore();
  stub.querySelector = function (sel) {
    if (sel === "button[type='submit']" || sel === 'button[type=submit]') {
      const btn = makeInputStub();
      btn.querySelector = function () { return makeInputStub(); };
      return btn;
    }
    return null;
  };
  return stub;
}

function makeGroupStub() {
  const stub = makeListenerStore();
  stub.querySelectorAll = function () { return []; };
  return stub;
}

// Build the element map. Order matters: getElementById returns by id key.
function buildElements() {
  return {
    clientForm: makeFormStub(),
    clientTypeGroup: makeGroupStub(),
    cancelBtn: makeInputStub(),
    clientPhoto: makeInputStub(),
    clientPhotoPreview: makeImgStub(),
    deleteClientBtn: makeInputStub(),
    clientReferralSource: (function () {
      const s = makeInputStub('');
      s.options = [];
      return s;
    })(),
    clientReferralOther: makeInputStub(''),
    recropBtn: makeInputStub(),
    birthDatePicker: makeInputStub(),
    clientFirstName: makeInputStub('TestFirst'),
    clientLastName: makeInputStub(''),
    clientBirthDate: makeInputStub(''),
    clientEmail: makeInputStub(''),
    clientPhone: makeInputStub(''),
    clientNotes: makeInputStub(''),
  };
}

// ────────────────────────────────────────────────────────────────────
// Build sandbox and load assets/add-client.js.
// ────────────────────────────────────────────────────────────────────

let elements = buildElements();
const docListeners = makeListenerStore();

const documentStub = {
  addEventListener: function (type, fn) { docListeners.addEventListener(type, fn); },
  removeEventListener: function () {},
  getElementById: function (id) {
    if (Object.prototype.hasOwnProperty.call(elements, id)) return elements[id];
    return null;
  },
  querySelector: function (sel) {
    if (sel === '.section-title') {
      const t = makeInputStub();
      t.textContent = '';
      return t;
    }
    if (sel === "input[name='clientType']:checked") {
      // Default: no client type selected — addClient receives type: 'adult' via fallback.
      return null;
    }
    return null;
  },
  querySelectorAll: function (sel) {
    if (sel === "input[name='clientType']") return [];
    return [];
  },
  body: { appendChild: function () {}, prepend: function () {} },
  head: { appendChild: function () {} },
  createElement: function () {
    return {
      style: {},
      classList: { add: function () {}, remove: function () {}, contains: function () { return false; } },
      appendChild: function () {}, append: function () {}, prepend: function () {},
      setAttribute: function () {}, getAttribute: function () { return null; },
      addEventListener: function () {}, removeEventListener: function () {},
    };
  },
};

const locationStub = { search: '', href: 'http://localhost/add-client.html' };

const App = {
  initCommon: function () {},
  initBirthDatePicker: function () {
    return {
      getValue: function () { return ''; },
      setValue: function () {},
      reset: function () {},
    };
  },
  // App.readFileAsDataURL must record every Blob/File it sees so the test can
  // assert the raw original is NEVER passed to it (only the cropped sentinel).
  readFileAsDataURL: function (blob) {
    collectors.readFileCalls.push(blob);
    // Return a stable string keyed off the blob's __id tag for traceability.
    const tag = (blob && blob.__id) ? blob.__id : 'X';
    return Promise.resolve('data:fake/dataurl;tag=' + tag);
  },
  showToast: function (titleKey, msgKey) {
    collectors.toasts.push({ titleKey: titleKey, msgKey: msgKey });
  },
  t: function (k) { return k; },
  setSubmitLabel: function () {},
  applyTranslations: function () {},
  confirmDialog: function () { return Promise.resolve(false); },
};

const CropModule = {
  // The synthetic resize stub records the call (so we can assert maxEdge=800,
  // q=0.75) and returns a tagged sentinel Blob. The test then asserts this
  // sentinel — NOT the rawOriginal — is what flows downstream.
  resizeToMaxDimension: function (file, maxEdge, q) {
    collectors.resizeCalls.push({ file: file, maxEdge: maxEdge, q: q });
    const out = new Blob(['__CROPPED_SENTINEL__'], { type: 'image/jpeg' });
    out.__id = 'CROPPED_SENTINEL_BLOB';
    return Promise.resolve(out);
  },
  openCropModal: function (dataUrl, onSave, onCancel /* , isReCrop */) {
    collectors.cropCalls.push({ dataUrl: dataUrl });
    if (collectors.cropAction === 'cancel') {
      if (onCancel) onCancel();
    } else {
      if (onSave) onSave(collectors.croppedDataUrlSentinel);
    }
  },
};

const PortfolioDB = {
  getClient: function () { return Promise.resolve(null); },
  addClient: function (record) {
    collectors.dbWrites.push({ method: 'addClient', record: record });
    return Promise.resolve(42);
  },
  updateClient: function (record) {
    collectors.dbWrites.push({ method: 'updateClient', record: record });
    return Promise.resolve();
  },
  deleteClientAndSessions: function () { return Promise.resolve(); },
  getAllReferralSources: function () { return Promise.resolve([]); },
};

const URLSearchParamsStub = function (search) {
  this._search = String(search || '');
  this.get = function (key) {
    const params = this._search.replace(/^\?/, '').split('&');
    for (let i = 0; i < params.length; i++) {
      const pair = params[i].split('=');
      if (pair[0] === key) return pair[1] || null;
    }
    return null;
  };
};

const sandbox = {
  window: { location: locationStub },
  document: documentStub,
  location: locationStub,
  console: { log: function () {}, warn: function () {}, error: function () {} },
  navigator: { userAgent: '' },
  App: App,
  CropModule: CropModule,
  PortfolioDB: PortfolioDB,
  Blob: Blob,
  URLSearchParams: URLSearchParamsStub,
  Number: Number,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  queueMicrotask: queueMicrotask,
  Promise: Promise,
  Math: Math,
  JSON: JSON,
  Date: Date,
  Array: Array,
  Object: Object,
  String: String,
  Boolean: Boolean,
  RegExp: RegExp,
  Set: Set,
  Map: Map,
};
sandbox.window.location = locationStub;
sandbox.window.App = App;
sandbox.window.CropModule = CropModule;
sandbox.window.PortfolioDB = PortfolioDB;
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'add-client.js'), 'utf8');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/add-client.js' });
} catch (err) {
  console.error('FATAL: assets/add-client.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

// add-client.js registers ONE 'DOMContentLoaded' listener. Capture it.
const domHandlers = (docListeners.listeners['DOMContentLoaded'] || []);
if (domHandlers.length === 0) {
  console.error('FAIL: add-client.js did not register a DOMContentLoaded handler.');
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

// Helper: drive the DOMContentLoaded init AGAINST a freshly-built element set.
// add-client.js mutates the captured element stubs (assigns listeners, reads
// .value, etc.). For each sub-case we want a clean slate.
async function freshInit() {
  elements = buildElements();
  // Drive the (single) DOMContentLoaded handler captured at module load.
  // The handler is async (top-level `async ()=>{}`) — await it.
  await domHandlers[0]();
}

// Helper: build a tagged "raw original" File-like Blob with a known size.
function makeRawOriginal(id) {
  const bytes = new Uint8Array(2 * 1024 * 1024);
  const blob = new Blob([bytes], { type: 'image/jpeg' });
  blob.__id = id;
  blob.name = 'IMG_4032x3024.jpg';
  return blob;
}

// Helper: exhaustive search — does `obj` (or any nested string) contain `needle`?
function containsRawTag(obj, needle) {
  try {
    return JSON.stringify(obj, function (key, value) {
      // Replace Blob/File refs with a marker string so JSON doesn't drop them silently.
      if (value && typeof value === 'object' && typeof value.arrayBuffer === 'function') {
        return '__BLOBREF__id=' + (value.__id || 'unknown') + '__';
      }
      return value;
    }).indexOf(needle) !== -1;
  } catch (_) {
    return false;
  }
}

(async () => {
  // ─── A. SMOKE — handlers registered ─────────────────────────────────
  await test('A. clientPhoto has change listener AND clientForm has submit listener after DOMContentLoaded', async () => {
    resetCollectors();
    await freshInit();
    assert.ok(
      elements.clientPhoto.listeners.change && elements.clientPhoto.listeners.change.length > 0,
      'clientPhoto must have a "change" event listener registered by add-client.js init'
    );
    assert.ok(
      elements.clientForm.listeners.submit && elements.clientForm.listeners.submit.length > 0,
      'clientForm must have a "submit" event listener registered by add-client.js init'
    );
  });

  // ─── B. BEHAVIOR — full pipeline → IDB write captures ONLY cropped ───
  await test('B. Full upload pipeline → IDB write photoData === cropped sentinel; rawOriginal NEVER in persisted record', async () => {
    resetCollectors();
    collectors.cropAction = 'save';
    await freshInit();

    const rawOriginal = makeRawOriginal('RAW_ORIGINAL_2MB');
    elements.clientPhoto.files = [rawOriginal];

    // Drive the change event — invokes resizeToMaxDimension → readFileAsDataURL
    // (of the resized Blob) → openCropModal → onSave (synchronously sets
    // module-scoped photoData inside add-client.js).
    const changeHandler = elements.clientPhoto.listeners.change[0];
    await changeHandler({ target: elements.clientPhoto });

    // ── Midstream pipeline assertions ──────────────────────────────
    assert.strictEqual(collectors.resizeCalls.length, 1,
      'CropModule.resizeToMaxDimension must be called exactly once — got ' + collectors.resizeCalls.length);
    assert.strictEqual(collectors.resizeCalls[0].file, rawOriginal,
      'Resize call must receive the rawOriginal File reference (it is the gate that throws it away)');
    assert.strictEqual(collectors.resizeCalls[0].maxEdge, 800,
      'Resize must be called with maxEdge=800 per D-21 — got ' + collectors.resizeCalls[0].maxEdge);
    assert.strictEqual(collectors.resizeCalls[0].q, 0.75,
      'Resize must be called with quality=0.75 per D-21 — got ' + collectors.resizeCalls[0].q);

    assert.strictEqual(collectors.cropCalls.length, 1,
      'CropModule.openCropModal must be called exactly once');
    assert.strictEqual(typeof collectors.cropCalls[0].dataUrl, 'string',
      'openCropModal dataUrl arg must be a string');
    assert.strictEqual(collectors.cropCalls[0].dataUrl.indexOf('RAW_ORIGINAL_2MB'), -1,
      'openCropModal dataUrl MUST NOT carry the rawOriginal tag — it must come from the resized Blob, not the raw upload');

    // App.readFileAsDataURL must be called once, with the cropped sentinel — NEVER the raw original.
    assert.strictEqual(collectors.readFileCalls.length, 1,
      'App.readFileAsDataURL must be called exactly once (only for the resized Blob — the raw original must skip this step)');
    assert.strictEqual(collectors.readFileCalls[0].__id, 'CROPPED_SENTINEL_BLOB',
      'App.readFileAsDataURL must receive the CROPPED_SENTINEL_BLOB — the resized output, NOT the raw original. Got: ' + (collectors.readFileCalls[0] && collectors.readFileCalls[0].__id));
    assert.notStrictEqual(collectors.readFileCalls[0], rawOriginal,
      'App.readFileAsDataURL must NEVER receive the rawOriginal reference');

    // ── Drive the form submit and assert the IDB write ───────────────
    elements.clientFirstName.value = 'TestFirst';
    const submitHandler = elements.clientForm.listeners.submit[0];
    await submitHandler({ preventDefault: function () {}, submitter: null, target: elements.clientForm });

    assert.strictEqual(collectors.dbWrites.length, 1,
      'Exactly one IDB write must occur on form submit — got ' + collectors.dbWrites.length);
    assert.strictEqual(collectors.dbWrites[0].method, 'addClient',
      'Fresh add path must call PortfolioDB.addClient (not updateClient) — got ' + collectors.dbWrites[0].method);

    const record = collectors.dbWrites[0].record;

    // THE LOAD-BEARING D-22 ASSERTION — photoData is the cropped sentinel, not the raw original.
    assert.strictEqual(record.photoData, collectors.croppedDataUrlSentinel,
      'record.photoData must equal the cropped sentinel string — got: ' + JSON.stringify(record.photoData));
    assert.strictEqual(typeof record.photoData, 'string',
      'record.photoData must be a string (data URL) — never a Blob/File');
    assert.notStrictEqual(record.photoData, rawOriginal,
      'record.photoData must NOT be the rawOriginal Blob reference');

    // Exhaustive: rawOriginal's tag must appear NOWHERE in the serialized record.
    // (Catches reference leaks via property copy / spread / nested objects.)
    assert.strictEqual(containsRawTag(record, 'RAW_ORIGINAL_2MB'), false,
      'rawOriginal tag "RAW_ORIGINAL_2MB" must NOT appear anywhere in the persisted record — found a leak');

    // Per-field: no Blob/File reference at any top-level field of the record.
    const fieldNames = Object.keys(record);
    for (let i = 0; i < fieldNames.length; i++) {
      const k = fieldNames[i];
      const v = record[k];
      assert.notStrictEqual(v, rawOriginal,
        'record.' + k + ' must NOT be the rawOriginal reference');
      // Duck-type Blob check (works regardless of which Blob global resolves
      // at runtime). Coerce to boolean so falsy non-Blob values (empty string,
      // null, undefined) compare cleanly as `false`.
      const isBlob = !!(v && typeof v === 'object' && typeof v.arrayBuffer === 'function');
      assert.strictEqual(isBlob, false,
        'record.' + k + ' must NOT be a Blob/File — found one (type=' + (v && v.type) + ')');
    }
  });

  // ─── C. REGRESSION — cancelled crop → photoData empty, no raw ref ───
  await test('C. Cancelled crop → IDB write has record.photoData === "" and no rawOriginal reference', async () => {
    resetCollectors();
    collectors.cropAction = 'cancel';
    await freshInit();

    const rawOriginal2 = makeRawOriginal('RAW_ORIGINAL2_2MB');
    elements.clientPhoto.files = [rawOriginal2];

    const changeHandler = elements.clientPhoto.listeners.change[0];
    await changeHandler({ target: elements.clientPhoto });

    // After cancel, photoData inside add-client.js is reset to "".
    elements.clientFirstName.value = 'TestFirst';
    const submitHandler = elements.clientForm.listeners.submit[0];
    await submitHandler({ preventDefault: function () {}, submitter: null, target: elements.clientForm });

    assert.strictEqual(collectors.dbWrites.length, 1,
      'Form submit must still write to IDB even after a cancelled crop');
    const record = collectors.dbWrites[0].record;
    assert.strictEqual(record.photoData, '',
      'record.photoData must be empty string after cancelled crop — got: ' + JSON.stringify(record.photoData));
    assert.strictEqual(containsRawTag(record, 'RAW_ORIGINAL2_2MB'), false,
      'rawOriginal2 tag must NOT appear in the persisted record after cancelled crop');
    assert.notStrictEqual(record.photoData, rawOriginal2,
      'record.photoData must NOT be the rawOriginal2 reference after cancelled crop');
  });

  // ─── Report ─────────────────────────────────────────────────────────
  console.log('');
  console.log('Plan 06 crop-only tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
