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

  var exported = {
    APP_VERSION: APP_VERSION,
    INTEGRITY_TOKEN: INTEGRITY_TOKEN
  };

  // Assign to a global readable from both page (window) and worker (self) scope.
  (typeof self !== 'undefined' ? self
    : typeof globalThis !== 'undefined' ? globalThis
    : this).AppVersion = exported;

  return exported;
})();
