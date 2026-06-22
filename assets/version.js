/**
 * version.js — Single source of truth for the app version (VER-02)
 *
 * Exposes ONE constant object, `AppVersion`, readable from BOTH the page
 * (`window`) and the service-worker (`self`) global scopes — a service worker
 * has no `window`, so this assigns to `self`/`globalThis`.
 *
 * Two values are exposed:
 *   - APP_VERSION    : the hand-set semver (D-01). Touched only at a release
 *                      boundary. This milestone ships as v1.2.0.
 *   - INTEGRITY_TOKEN: a deploy-stamped git short-hash (D-02). The deploy
 *                      GitHub Action sed-replaces the placeholder below with
 *                      ${GITHUB_SHA::7}. When unreplaced (local / file:// open
 *                      where the deploy step never ran) it falls back to 'dev'.
 *
 * The SW derives CACHE_NAME from INTEGRITY_TOKEN, so a deploy never requires
 * hand-editing a cache number again (kills the v209 stale-cache failure class).
 *
 * Pure-synchronous, side-effect-free beyond assigning the global. Zero network
 * calls — no fetch, no XHR, no dynamic import (VER-06).
 */
var AppVersion = (function() {
  'use strict';

  var APP_VERSION = '1.2.0';

  // Deploy-stamped at build time by .github/workflows/deploy.yml. The literal
  // below is the placeholder the sed step replaces; if it is still its
  // unreplaced value, INTEGRITY_TOKEN resolves to 'dev'.
  var BUILD_TOKEN = '__BUILD_TOKEN__';
  var INTEGRITY_TOKEN = (BUILD_TOKEN === ('__BUILD' + '_TOKEN__')) ? 'dev' : BUILD_TOKEN;

  // ──────────────────────────────────────────────────────────────────────
  // Runtime integrity self-check (VER-03, D-08) — fully local, zero network.
  //
  // resolveIntegrityState is a PURE function of its four arguments so the
  // honest-state machine (UI-SPEC "Three honest states") is unit-testable
  // without a service worker, a DOM, or a network. It reads NO globals — the
  // runtime entrypoint below gathers the real inputs and passes them in.
  //
  //   loadedToken        : the deploy token the actually-running/cached pieces
  //                        report (derived locally from the active SW cache name)
  //   sourceToken        : AppVersion.INTEGRITY_TOKEN (the source of truth)
  //   online             : navigator.onLine
  //   recoveryAttempted  : have we already run the genuine recovery this load?
  //
  // States (VER-06: none of these branches touch the network):
  //   tokens match                     → 'clean'   (no nudge; footer stays clean)
  //   differ + offline (any recovery)  → 'offline' (no completion promise, D-11)
  //   differ + online + recovered      → 'wedged'  (no false "refresh", D-12)
  //   differ + online + not recovered  → 'online'  (genuine recovery available)
  // ──────────────────────────────────────────────────────────────────────
  function resolveIntegrityState(input) {
    var loadedToken = input.loadedToken;
    var sourceToken = input.sourceToken;
    var online = input.online;
    var recoveryAttempted = input.recoveryAttempted;

    // Agreement = clean. This is checked FIRST so the footer renders clean
    // optimistically and only ever UPGRADES to a warning (D-09).
    if (loadedToken === sourceToken) {
      return 'clean';
    }
    // Offline: there is nothing to complete the update WITH, so we never make
    // a completion promise — even if a recovery was already attempted (D-11).
    if (!online) {
      return 'offline';
    }
    // Online but a genuine recovery already ran and the mismatch persists:
    // promising another "refresh to complete" would be the looped lie D-12
    // forbids. Degrade to honest guidance (hands off to Phase 29).
    if (recoveryAttempted) {
      return 'wedged';
    }
    // Online, mismatch, recovery not yet attempted: the genuine recovery CAN
    // fetch fresh assets, so "Refresh to complete" is a true promise.
    return 'online';
  }

  // Determine the actually-loaded deploy token from LOCAL sources only — the
  // active SW's cache is named 'sessions-garden-<token>' (see sw.js), so the
  // cache key tells us which deploy's assets are genuinely being served. This
  // uses the CacheStorage API (caches.keys()), which is fully local — NO fetch,
  // NO phone-home (VER-06). Resolves to null when it cannot be determined
  // (no SW / file://), in which case the caller treats the load as clean
  // (optimistic — never cry wolf without evidence).
  function readLoadedToken() {
    return new Promise(function (resolve) {
      try {
        if (typeof caches === 'undefined' || !caches.keys) {
          resolve(null);
          return;
        }
        caches.keys().then(function (names) {
          var prefix = 'sessions-garden-';
          for (var i = 0; i < names.length; i++) {
            if (names[i].indexOf(prefix) === 0) {
              resolve(names[i].slice(prefix.length));
              return;
            }
          }
          resolve(null);
        }).catch(function () { resolve(null); });
      } catch (e) {
        resolve(null);
      }
    });
  }

  // Module-level "have we already attempted recovery this load?" flag. Set by
  // the genuine-recovery action (added in the page-side block below) and read
  // by the runtime entrypoint to distinguish 'online' (first try) from
  // 'wedged' (recovery already failed).
  var _recoveryAttempted = false;

  // Runtime entrypoint: gather the real LOCAL inputs and resolve the state.
  // Returns a Promise<state>. Never throws; never touches the network.
  function checkIntegrity() {
    return readLoadedToken().then(function (loadedToken) {
      // No evidence of a loaded token (no SW / file://) → treat as clean.
      if (loadedToken === null || loadedToken === undefined) {
        return 'clean';
      }
      var online = (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean')
        ? navigator.onLine : true;
      return resolveIntegrityState({
        loadedToken: loadedToken,
        sourceToken: INTEGRITY_TOKEN,
        online: online,
        recoveryAttempted: _recoveryAttempted
      });
    });
  }

  var exported = {
    APP_VERSION: APP_VERSION,
    INTEGRITY_TOKEN: INTEGRITY_TOKEN,
    resolveIntegrityState: resolveIntegrityState,
    readLoadedToken: readLoadedToken,
    checkIntegrity: checkIntegrity,
    // Recovery-attempted flag accessors (the recovery action sets it; the
    // entrypoint reads it). Exposed so the page-side nudge code can flip it.
    _markRecoveryAttempted: function () { _recoveryAttempted = true; },
    _wasRecoveryAttempted: function () { return _recoveryAttempted; }
  };

  // Assign to a global readable from both page (window) and worker (self) scope.
  (typeof self !== 'undefined' ? self
    : typeof globalThis !== 'undefined' ? globalThis
    : this).AppVersion = exported;

  return exported;
})();
