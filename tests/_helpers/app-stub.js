/**
 * tests/_helpers/app-stub.js
 *
 * Reusable App.* stub surface (D-09, TEST-03) for the Phase 30 characterization
 * tests that load the REAL settings.html / add-session.html pages and drive the
 * REAL page handlers while asserting observable side effects (D-08).
 *
 * Mirrors the `__calls` spy shape of tests/_helpers/mock-portfolio-db.js: a Map
 * of method-name → array of deep-copied arg-arrays, so a test can assert e.g.
 * `stub.__calls.get('showToast').length === 1`.
 *
 * --- Landmines this stub deliberately handles ---
 *
 *  (1) initCommon MUST return an already-RESOLVED Promise. The page handlers run
 *      `document.addEventListener("DOMContentLoaded", async () => { await
 *      App.initCommon(); ... })`. If initCommon does not resolve, that async
 *      handler hangs forever and the test never sees the page's side effects.
 *
 *  (2) installNavGuard MUST be a no-op. It is called for its side effect only;
 *      a throwing/undefined stub aborts the handler.
 *
 *  (3) The severity pair createSeverityScale / getSeverityValue is INTENTIONALLY
 *      NOT stubbed (F-B). They are a coupled pair:
 *        - createSeverityScale(initial, onChange) builds the widget whose click
 *          sets `wrap.dataset.value` and fires onChange;
 *        - getSeverityValue(wrapper) reads `wrapper.dataset.value`.
 *      add-session.js updateDelta / getIssuesPayload read severity ONLY through
 *      this pair, and updateDelta fires ONLY via the scale's onChange. A
 *      label→number stub would make the delta UNREACHABLE through observable DOM.
 *      So this factory leaves BOTH undefined by default; the issue-delta
 *      god-module test (30-06) supplies the REAL pair from assets/app.js via the
 *      `overrides` argument (app.js loads cleanly in jsdom — the 30-03 RTL guard
 *      already proves this).
 *
 * --- Notes for downstream consuming tests (30-04 / 30-05 / 30-06) ---
 *
 *  (a) add-session.js references a global `BroadcastChannel`. Tests must inject a
 *      no-op stub for it on the jsdom window before eval, e.g.
 *        win.BroadcastChannel = function () {
 *          return { postMessage(){}, close(){}, addEventListener(){} };
 *        };
 *
 *  (b) The page DOMContentLoaded handlers are ASYNC. A consuming test MUST NOT
 *      rely on a blanket `win.document.dispatchEvent(new Event('DOMContentLoaded'))`
 *      — that does not await the async handler. Instead CAPTURE the registered
 *      listener(s) (the 25-06 docListeners pattern: override
 *      `document.addEventListener` before eval into a docListeners map), then
 *      `await` the specific handler, and `await new Promise(r => setTimeout(r, 0))`
 *      after any async-driven event so microtasks/timers flush.
 *
 *  (c) The severity pair is sourced from the REAL app.js per the F-B note above —
 *      pass them through `overrides`, do NOT add them here.
 *
 * Standalone test double: it never reads or modifies assets/app.js.
 *
 * Usage:
 *   const { createAppStub } = require('./_helpers/app-stub');
 *   const appStub = createAppStub({ t: (k) => myMessages[k] || k });
 *   win.App = appStub;
 *   // ... drive the real page ...
 *   assert.strictEqual(appStub.__calls.get('showToast').length, 1);
 */

'use strict';

// The grep-verified App.* surface the two god modules (settings.js,
// add-session.js) call. Each entry gives a default return value. The severity
// pair (createSeverityScale / getSeverityValue) is intentionally ABSENT — see
// the F-B note in the module doc block.
//
// `t` and `initCommon` are handled specially below (key-returning i18n shorthand
// and a resolving Promise respectively) and are excluded from this table.
var DEFAULT_RETURNS = {
  getSectionLabel: function (id) { return id; },
  showToast: undefined,
  formatDate: function (d) { return d == null ? '' : String(d); },
  applyTranslations: undefined,
  confirmDialog: function () { return Promise.resolve(true); },
  isSectionEnabled: function () { return true; },
  getLanguage: function () { return 'he'; },
  setLanguage: undefined,
  unlockBodyScroll: undefined,
  lockBodyScroll: undefined,
  setSubmitLabel: undefined,
  readFileAsDataURL: function () { return Promise.resolve(''); },
  initBirthDatePicker: undefined,
  formatSessionType: function (t) { return t == null ? '' : String(t); },
  installNavGuard: undefined, // no-op (landmine 2)
};

function deepCopy(arg) {
  try { return JSON.parse(JSON.stringify(arg)); } catch (_) { return arg; }
}

/**
 * Build a spy-instrumented App.* stub.
 *
 * @param {object} [overrides] - per-test overrides. Any key replaces the default
 *        (e.g. `t`, `showToast`); supply the REAL `createSeverityScale` /
 *        `getSeverityValue` pair here when the test needs the issue-delta path.
 * @returns {object} App-shaped stub with a `__calls` Map spy.
 */
function createAppStub(overrides) {
  overrides = overrides || {};
  var calls = new Map();

  // record(name, args, returnValue) — push deep-copied args, return the value.
  function record(name, argsLike, returnValue) {
    if (!calls.has(name)) { calls.set(name, []); }
    var args = Array.prototype.slice.call(argsLike).map(deepCopy);
    calls.get(name).push(args);
    return returnValue;
  }

  var stub = { __calls: calls };

  // Build a spied method for each surface entry. If an override is a function,
  // its return value is used (still recorded into __calls); otherwise the
  // DEFAULT_RETURNS behavior (a function => computed default, else literal).
  Object.keys(DEFAULT_RETURNS).forEach(function (name) {
    calls.set(name, []);
    var def = DEFAULT_RETURNS[name];
    var override = overrides[name];
    stub[name] = function () {
      var ret;
      if (typeof override === 'function') {
        ret = override.apply(this, arguments);
      } else if (typeof def === 'function') {
        ret = def.apply(this, arguments);
      } else {
        ret = def; // undefined / literal
      }
      return record(name, arguments, ret);
    };
  });

  // i18n shorthand `t`: return the key by default (or look up a per-test map if
  // the override is a plain object), allowing a function override too.
  calls.set('t', []);
  var tOverride = overrides.t;
  stub.t = function (key) {
    var ret;
    if (typeof tOverride === 'function') {
      ret = tOverride.apply(this, arguments);
    } else if (tOverride && typeof tOverride === 'object') {
      ret = Object.prototype.hasOwnProperty.call(tOverride, key) ? tOverride[key] : key;
    } else {
      ret = key;
    }
    return record('t', arguments, ret);
  };

  // initCommon MUST resolve a Promise (landmine 1). An override may supply its
  // own resolving value, but it must still resolve.
  calls.set('initCommon', []);
  var initOverride = overrides.initCommon;
  stub.initCommon = function () {
    var ret;
    if (typeof initOverride === 'function') {
      ret = initOverride.apply(this, arguments);
      if (!ret || typeof ret.then !== 'function') { ret = Promise.resolve(ret); }
    } else {
      ret = Promise.resolve();
    }
    return record('initCommon', arguments, ret);
  };

  // Phase 30 Plan 07 (Task 0 / G2) — snippet-cache pair mirroring app.js:87-104.
  //
  //   App.getSnippets()        — SYNCHRONOUS read; returns `_snippetCache.slice()`.
  //   App.refreshSnippetCache()— ASYNC; sets `_snippetCache = await
  //                              window.PortfolioDB.getAllSnippets()`.
  //
  // This is the ONE intentional PortfolioDB read in the stub, matching
  // production: settings.js afterSnippetMutation → refreshSnippetCache →
  // renderSnippetList reads getSnippets(), so a snippet write becomes visible in
  // the list with no per-test plumbing. Both are spy-recorded like the rest of
  // the surface. An override may pre-seed `_snippetCache` via overrides.snippets.
  var _snippetCache = Array.isArray(overrides.snippets) ? overrides.snippets.map(deepCopy) : [];
  calls.set('getSnippets', []);
  stub.getSnippets = function () {
    return record('getSnippets', arguments, _snippetCache.slice());
  };
  calls.set('refreshSnippetCache', []);
  stub.refreshSnippetCache = function () {
    var db = (typeof window !== 'undefined' && window.PortfolioDB) ||
      (typeof global !== 'undefined' && global.PortfolioDB) || null;
    var p;
    if (db && typeof db.getAllSnippets === 'function') {
      p = Promise.resolve(db.getAllSnippets()).then(function (list) {
        _snippetCache = Array.isArray(list) ? list : [];
        return undefined;
      }, function () { _snippetCache = []; return undefined; });
    } else {
      _snippetCache = [];
      p = Promise.resolve();
    }
    return record('refreshSnippetCache', arguments, p);
  };

  // Phase 37 Plan 10 (STUB EXTENSION) — a default getSessionTypes() derived from
  // the seeded localStorage['portfolioSessionTypes'] so the Session-Format filter
  // tests' option-build assertions are NOT vacuous. Mirrors the real app.js:1329
  // getSessionTypes shape: 5 locked defaults (in fixed order) with a resolved
  // label (a non-empty override string wins, else the raw key — the filter tests
  // assert the KEY set, so a non-i18n label default is sufficient) + the custom
  // entries as { key, label, locked:false }.
  //
  // The localStorage source is the jsdom window's, passed explicitly via
  // overrides.localStorage (captured live so a seed set before boot is visible at
  // render time). ADDITIVE: an explicit overrides.getSessionTypes (e.g.
  // tests/37-personalization.test.js's ()=>[]) still wins — it is invoked and
  // spy-recorded here instead of being clobbered by the pass-through loop below.
  var SESSION_TYPE_ORDER_STUB = ['clinic', 'online', 'remote', 'proxy', 'other'];
  var _lsRef = overrides.localStorage ||
    (typeof localStorage !== 'undefined' ? localStorage : null);
  function _readSeededSessionTypes() {
    var fallback = { overrides: {}, custom: [] };
    try {
      var raw = _lsRef && _lsRef.getItem('portfolioSessionTypes');
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return fallback;
      return {
        overrides: (parsed.overrides && typeof parsed.overrides === 'object') ? parsed.overrides : {},
        custom: Array.isArray(parsed.custom) ? parsed.custom : [],
      };
    } catch (_) { return fallback; }
  }
  function _defaultGetSessionTypes() {
    var data = _readSeededSessionTypes();
    var list = SESSION_TYPE_ORDER_STUB.map(function (key) {
      var ov = data.overrides[key];
      var label = (typeof ov === 'string' && ov.trim().length > 0) ? ov : key;
      return { key: key, label: label, locked: true };
    });
    data.custom.forEach(function (entry) {
      if (entry && entry.key) {
        list.push({ key: entry.key, label: entry.label != null ? String(entry.label) : entry.key, locked: false });
      }
    });
    return list;
  }
  calls.set('getSessionTypes', []);
  var gstOverride = overrides.getSessionTypes;
  stub.getSessionTypes = function () {
    var ret = (typeof gstOverride === 'function')
      ? gstOverride.apply(this, arguments)
      : _defaultGetSessionTypes();
    return record('getSessionTypes', arguments, ret);
  };

  // F-B: the severity pair is supplied ONLY via overrides (real app.js fns).
  // They are NOT spied — they ARE the real coupled widget pair. When absent,
  // both remain undefined so the smoke can assert it.
  if (typeof overrides.createSeverityScale !== 'undefined') {
    stub.createSeverityScale = overrides.createSeverityScale;
  }
  if (typeof overrides.getSeverityValue !== 'undefined') {
    stub.getSeverityValue = overrides.getSeverityValue;
  }

  // Allow any additional overrides (e.g. extra App.* the consuming test needs)
  // to pass through without being clobbered by the loop above.
  Object.keys(overrides).forEach(function (k) {
    if (k === 't' || k === 'initCommon' ||
        k === 'createSeverityScale' || k === 'getSeverityValue') { return; }
    // Phase 30 Plan 07 (Task 0 / G2): the snippet-cache pair + its seed are
    // owned above — do not let the pass-through loop clobber them.
    if (k === 'getSnippets' || k === 'refreshSnippetCache' || k === 'snippets') { return; }
    // Phase 37 Plan 10 (STUB EXTENSION): getSessionTypes is owned above (respects
    // the override there); localStorage is a config source, not a stub method.
    if (k === 'getSessionTypes' || k === 'localStorage') { return; }
    if (Object.prototype.hasOwnProperty.call(DEFAULT_RETURNS, k)) { return; }
    stub[k] = overrides[k];
  });

  return stub;
}

module.exports = {
  createAppStub: createAppStub,
};
