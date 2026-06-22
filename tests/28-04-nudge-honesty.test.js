/**
 * Phase 28 Plan 04 — Behavior test for the integrity-mismatch NUDGE honesty
 * + 4-language parity + the one-directional footer ⚠ marker
 * (D-09, D-10, D-11, D-12, VER-03).
 *
 * "The words must always match reality" (Ben, UI-SPEC central principle).
 * These assertions are FALSIFIABLE behavior checks, not grep-on-shape:
 *   - they build the real nudge DOM via AppVersion.buildNudge(state) and
 *     inspect the produced element's text + buttons,
 *   - they invoke the CTA handler and confirm it routes through the genuine
 *     recovery (registration.update + cache deletion), NOT a bare reload,
 *   - they assert 4-language parity + lang→en→key fallback of integStr,
 *   - they assert the footer marker upgrade is one-directional within a load.
 *
 * Run: node tests/28-04-nudge-honesty.test.js
 * Exits 0 on full pass, 1 on any failure.
 *
 * Honors project memory `feedback-behavior-verification.md`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// ────────────────────────────────────────────────────────────────────
// Minimal DOM stub sufficient for the .db-error-banner-style builder:
// createElement(div/span/button), element.append/appendChild, textContent,
// className, setAttribute, onclick, document.body.prepend, getElementById.
// ────────────────────────────────────────────────────────────────────

function makeEl(tag) {
  return {
    tagName: String(tag).toUpperCase(),
    children: [],
    className: '',
    _id: '',
    _attrs: {},
    _text: '',
    onclick: null,
    dir: '',
    get id() { return this._id; },
    set id(v) { this._id = v; registry[v] = this; },
    set textContent(v) { this._text = String(v); },
    get textContent() {
      // Aggregate own text + descendants (so reading a container's text works).
      var t = this._text;
      for (var i = 0; i < this.children.length; i++) t += this.children[i].textContent;
      return t;
    },
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return this._attrs[k]; },
    append() { for (var i = 0; i < arguments.length; i++) this.children.push(arguments[i]); },
    appendChild(c) { this.children.push(c); return c; },
    prepend(c) { this.children.unshift(c); return c; },
    querySelectorAll() { return []; },
    // Collect every <button> descendant (for CTA / close assertions).
    _buttons() {
      var out = [];
      if (this.tagName === 'BUTTON') out.push(this);
      for (var i = 0; i < this.children.length; i++) out = out.concat(this.children[i]._buttons());
      return out;
    },
  };
}

let registry = {};

const documentStub = {
  createElement: function (tag) { return makeEl(tag); },
  getElementById: function (id) { return registry[id] || null; },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  body: makeEl('body'),
};

// ── Recovery instrumentation: track that the genuine-recovery path runs. ──
const recoveryLog = { update: 0, cacheDeletes: [], reloaded: 0 };

const cachesStub = {
  keys: function () { return Promise.resolve(['sessions-garden-old0000', 'sessions-garden-new1111']); },
  delete: function (name) { recoveryLog.cacheDeletes.push(name); return Promise.resolve(true); },
};

const navigatorStub = {
  onLine: true,
  serviceWorker: {
    ready: Promise.resolve({
      update: function () { recoveryLog.update++; return Promise.resolve(); },
    }),
    addEventListener: function () {},
  },
};

const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  document: documentStub,
  navigator: navigatorStub,
  caches: cachesStub,
  localStorage: (function () {
    var store = { portfolioLang: 'en' };
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
    };
  })(),
  location: { reload: function () { recoveryLog.reloaded++; } },
  fetch: function () { throw new Error('VER-06: no network in the nudge'); },
  setTimeout: setTimeout,
  Promise: Promise,
  Math, JSON, Date, Array, Object, Number, String, Boolean, RegExp,
};
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'version.js'), 'utf8');
try {
  vm.runInContext(src, sandbox, { filename: 'assets/version.js' });
} catch (err) {
  console.error('FATAL: assets/version.js failed to load in vm sandbox.');
  console.error('       ' + err.message);
  process.exit(1);
}

const AppVersion = sandbox.AppVersion;
if (!AppVersion) {
  console.error('FAIL: AppVersion not found after loading version.js.');
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

function freshBody() { documentStub.body = makeEl('body'); registry = {}; }

(async () => {
  await test('buildNudge + INTEGRITY_STRINGS + integStr exist', () => {
    assert.strictEqual(typeof AppVersion.buildNudge, 'function', 'AppVersion.buildNudge must be a function');
    assert.strictEqual(typeof AppVersion.integStr, 'function', 'AppVersion.integStr must be a function');
    assert.ok(AppVersion.INTEGRITY_STRINGS && typeof AppVersion.INTEGRITY_STRINGS === 'object',
      'AppVersion.INTEGRITY_STRINGS must be an object');
  });

  // ─── Test 1: online promises completion + has CTA; offline has NO CTA + reconnect-only ─
  await test('1. online → completion promise + CTA button; offline → NO CTA + reconnect-only (D-11)', () => {
    freshBody();
    const online = AppVersion.buildNudge('online');
    const onlineBtns = online._buttons();
    // online must have at least one non-close action button.
    const onlineActions = onlineBtns.filter(b => b._attrs['data-role'] !== 'close');
    assert.ok(onlineActions.length >= 1, 'online state must render an action CTA button');
    assert.ok(/complete/i.test(online.textContent),
      'online copy must promise completion ("...complete...") — got: ' + JSON.stringify(online.textContent));

    freshBody();
    const offline = AppVersion.buildNudge('offline');
    const offlineActions = offline._buttons().filter(b => b._attrs['data-role'] !== 'close');
    assert.strictEqual(offlineActions.length, 0,
      'offline state must have NO completion CTA button (D-11) — found ' + offlineActions.length);
    assert.ok(/reconnect/i.test(offline.textContent),
      'offline copy must ask to reconnect — got: ' + JSON.stringify(offline.textContent));
    assert.ok(!/refresh to complete/i.test(offline.textContent),
      'offline copy must NOT promise "refresh to complete" (D-11)');
  });

  // ─── Test 2: wedged CTA is not "refresh to complete"; body reassures data safety ─
  await test('2. wedged → CTA not "refresh to complete"; body reassures data safety (D-12)', () => {
    freshBody();
    const wedged = AppVersion.buildNudge('wedged');
    const actions = wedged._buttons().filter(b => b._attrs['data-role'] !== 'close');
    assert.ok(actions.length >= 1, 'wedged must offer at least a recover action');
    for (const b of actions) {
      assert.ok(!/refresh to complete/i.test(b.textContent),
        'wedged CTA must NOT say "refresh to complete" (D-12) — got: ' + JSON.stringify(b.textContent));
    }
    assert.ok(/data (is )?safe|safe/i.test(wedged.textContent),
      'wedged body must reassure data safety — got: ' + JSON.stringify(wedged.textContent));
  });

  // ─── Test 3: online CTA handler runs GENUINE recovery, not a bare reload ─
  await test('3. online CTA invokes genuine recovery (registration.update + cache delete), not bare reload (D-10)', async () => {
    freshBody();
    recoveryLog.update = 0; recoveryLog.cacheDeletes = []; recoveryLog.reloaded = 0;
    const online = AppVersion.buildNudge('online');
    const cta = online._buttons().filter(b => b._attrs['data-role'] !== 'close')[0];
    assert.ok(cta && typeof cta.onclick === 'function', 'online CTA must have an onclick handler');
    await cta.onclick();
    // Let any chained microtasks settle.
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));
    assert.ok(recoveryLog.update >= 1,
      'CTA must call registration.update() as part of the genuine recovery (D-10) — it did not');
    assert.ok(recoveryLog.cacheDeletes.length >= 1,
      'CTA must delete a stale cache as part of the genuine recovery (D-10) — it did not');
  });

  // ─── Test 4: 4-language parity + integStr fallback lang→en→key ─
  await test('4. INTEGRITY_STRINGS has en/he/de/cs for every key; integStr falls back lang→en→key', () => {
    const S = AppVersion.INTEGRITY_STRINGS;
    for (const l of ['en', 'he', 'de', 'cs']) {
      assert.ok(S[l] && typeof S[l] === 'object', 'INTEGRITY_STRINGS.' + l + ' must exist');
    }
    const enKeys = Object.keys(S.en);
    assert.ok(enKeys.length >= 4, 'expected the full set of nudge strings in en');
    for (const l of ['he', 'de', 'cs']) {
      for (const k of enKeys) {
        assert.ok(Object.prototype.hasOwnProperty.call(S[l], k),
          'parity gap: key "' + k + '" missing from INTEGRITY_STRINGS.' + l);
      }
    }
    // Fallback: an unknown lang falls through to en for a known key.
    sandbox.localStorage.setItem('portfolioLang', 'zz');
    assert.strictEqual(AppVersion.integStr(enKeys[0]), S.en[enKeys[0]],
      'integStr must fall back unknown-lang → en');
    // Unknown key falls back to the key string itself.
    assert.strictEqual(AppVersion.integStr('__nope__'), '__nope__',
      'integStr must fall back unknown-key → the key string');
    sandbox.localStorage.setItem('portfolioLang', 'en');
  });

  // ─── Test 5: footer marker upgrade is one-directional (clean→⚠ ok, ⚠→clean disallowed within a load) ─
  await test('5. footer marker is one-directional: clean→⚠ allowed, ⚠→clean disallowed in a load (D-09)', () => {
    assert.strictEqual(typeof AppVersion.footerMarkerForState, 'function',
      'AppVersion.footerMarkerForState(prevMarked, state) must exist to enforce one-directional upgrade');
    // Start clean, observe a mismatch → upgrade to marked.
    let marked = AppVersion.footerMarkerForState(false, 'online');
    assert.strictEqual(marked, true, 'a detected mismatch must upgrade the footer to marked');
    // Already marked, then a later "clean" read must NOT downgrade within the load.
    let stillMarked = AppVersion.footerMarkerForState(true, 'clean');
    assert.strictEqual(stillMarked, true,
      'once marked, the footer must NOT downgrade back to clean within a load (D-09)');
    // Clean-then-clean stays clean.
    assert.strictEqual(AppVersion.footerMarkerForState(false, 'clean'), false,
      'clean→clean stays clean');
  });

  // ─── Report ─────────────────────────────────────────────────────────
  console.log('');
  console.log('Plan 04 nudge-honesty tests — ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
