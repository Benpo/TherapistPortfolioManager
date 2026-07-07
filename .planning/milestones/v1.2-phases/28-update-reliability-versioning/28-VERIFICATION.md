---
phase: 28-update-reliability-versioning
verified: 2026-06-22T00:00:00Z
status: passed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 28: Update Reliability & Versioning Verification Report

**Phase Goal:** Installed PWA users (including iOS Safari) reliably receive app updates, and the displayed version is a single source of truth that a runtime self-check guarantees cannot silently lie.
**Verified:** 2026-06-22
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | A code change pushed to production is received and applied by an already-installed PWA on a real device, field-verified | VERIFIED | Human-confirmed gate (Task 4, D-07): Ben confirmed "phase tested"; live at v1.2.1, deploy token c702c53. Two production-critical bugs found and fixed during field verification: (a) `importScripts` path corrected from `/version.js` to `/assets/version.js` (commit c702c53); (b) `/assets/version.js` marked `no-cache` so the SW update check always reads the fresh token (commit 32b02f4). |
| SC-2 | Footer version, SW CACHE_NAME, and integrity-check reference all derive from one version constant — one edit updates all three | VERIFIED | `assets/version.js` exposes `AppVersion.APP_VERSION = '1.2.1'` and `AppVersion.INTEGRITY_TOKEN`. `sw.js` derives `CACHE_NAME = 'sessions-garden-' + self.AppVersion.INTEGRITY_TOKEN` via `importScripts('/assets/version.js')`. `shared-chrome.js` reads `window.AppVersion.APP_VERSION` (line 12-14). `resolveIntegrityState` uses `INTEGRITY_TOKEN` as the source token. Confirmed: node runtime test `APP_VERSION: 1.2.1`, `INTEGRITY_TOKEN: dev` (dev fallback). |
| SC-3 | When running/cached code diverges from the source-of-truth version, the runtime integrity self-check detects it and surfaces the mismatch — so a stale build cannot display a version it is not running | VERIFIED | `resolveIntegrityState` is a pure tested function (7/7 behavior tests pass: clean/online/offline/wedged states, VER-06 no-network). `buildNudge(state)` renders state-bound honest UI. `footerMarkerForState` enforces one-directional upgrade (D-09). `shared-chrome.js:maybeUpgradeFooterAndNudge` calls `checkIntegrity()` and upgrades footer to ⚠ on mismatch — tests/28-04-nudge-honesty.test.js 6/6 pass. |
| SC-4 | CSP served via HTTP header in `_headers`; per-page `<meta http-equiv>` CSP tags removed | VERIFIED | `_headers` global `/*` block carries `Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; ...`. `grep -l 'http-equiv="Content-Security-Policy"' *.html` returns 0 pages. 21 HTML pages confirmed clean. `landing.html` correctly excluded from version.js wiring; CSP meta removed from it too. |
| SC-5 | Static JS/CSS served with `max-age=86400+`; service worker still owns freshness for installed users | VERIFIED | `_headers`: `/*.js Cache-Control: public, max-age=86400`, `/*.css Cache-Control: public, max-age=86400`. `/*.html` and `/sw.js` remain `no-cache`. `/assets/version.js` explicitly carved out to `no-cache` (field-fix 32b02f4) so the SW update check always gets the fresh deploy token. |
| SC-6 | No update-reliability or versioning behavior introduces a network call — app remains fully functional offline | VERIFIED | `version.js`: zero `fetch`, `XMLHttpRequest`, or dynamic `import()` (grep returns 0 hits in source; comment-only matches). `resolveIntegrityState` is pure with no network references (Test 5 passes). `readLoadedToken` uses `caches.keys()` — local CacheStorage API only. `runGenuineRecovery` uses `registration.update()` — SW's own throttled mechanism, not a new network egress. |

**Score:** 6/6 truths verified (0 present-behavior-unverified; SC-1 was a human-verified gate now closed)

---

### Plan-Level Must-Haves

#### Plan 01 (VER-01, VER-02, VER-06)

| Must-Have | Status | Evidence |
|-----------|--------|----------|
| `assets/version.js` exposes `AppVersion.APP_VERSION` and `INTEGRITY_TOKEN` on both `window` and `self` | VERIFIED | File exists (338 lines). `node -e "global.self=global; require('./assets/version.js'); console.log(self.AppVersion.APP_VERSION)"` → `1.2.1`. Dual-context assignment at lines 332-334. |
| SW `CACHE_NAME` derived from token, not hand-edited literal | VERIFIED | `sw.js` line 19: `const CACHE_NAME = 'sessions-garden-' + self.AppVersion.INTEGRITY_TOKEN`. No `sessions-garden-v[0-9]` literal anywhere. Regression test `tests/sw-precache-cache-reload.test.js` asserts `CACHE_NAME` not hardcoded. |
| Deploy GitHub Action stamps git short-hash into staging version.js via single sed (not a bundler) | VERIFIED | `.github/workflows/deploy.yml` line 39: `sed -i "s/'__BUILD_TOKEN__'/'${GITHUB_SHA::7}'/" deploy-staging/assets/version.js`. No bundler/npm-build step. |
| SW preserves `skipWaiting()` + `clients.claim()` | VERIFIED | `sw.js` lines 167, 182. |

#### Plan 02 (VER-04, VER-05, VER-06)

| Must-Have | Status | Evidence |
|-----------|--------|----------|
| CSP HTTP header in `_headers` global block, byte-equivalent to meta | VERIFIED | `_headers` line 2: full CSP string matching the former meta verbatim (`unsafe-inline` in both `script-src` and `style-src`). |
| `/*.js` and `/*.css` at `max-age=86400`; `/*.html` and `/sw.js` at `no-cache` | VERIFIED | `_headers` lines 12, 15 (86400); lines 9, 26 (no-cache). |
| No new connect-src origin | VERIFIED | `connect-src 'self' https://api.lemonsqueezy.com` — unchanged. |

#### Plan 03 (VER-02, VER-04)

| Must-Have | Status | Evidence |
|-----------|--------|----------|
| Per-page CSP `<meta>` deleted from all 21 HTML pages | VERIFIED | `grep -l 'http-equiv="Content-Security-Policy"' *.html` → 0. |
| 20 SW-registered app pages load `<script src="./assets/version.js">` before `shared-chrome.js` | VERIFIED | `grep -l "assets/version.js" *.html` → 20 pages. Load-order check passed for all SW-registered pages. `landing.html` excluded (0 hits). |

#### Plan 04 (VER-01, VER-02, VER-03, VER-06)

| Must-Have | Status | Evidence |
|-----------|--------|----------|
| `resolveIntegrityState` pure function — clean/online/offline/wedged with no network | VERIFIED | `tests/28-04-integrity-state.test.js` 7/7 pass (all states + no-network test). |
| `buildNudge`: online promises completion + CTA; offline NO CTA; wedged no false "refresh" | VERIFIED | `tests/28-04-nudge-honesty.test.js` 6/6 pass. |
| `INTEGRITY_STRINGS` en/he/de/cs with `integStr` fallback | VERIFIED | All 4 language keys present in `version.js` lines 143-184. `integStr` at line 186 with `lang→en→key` fallback. |
| Footer reads `AppVersion.APP_VERSION` (not hardcoded); upgrades one-directionally to ⚠ | VERIFIED | `shared-chrome.js` lines 12-14: reads `window.AppVersion.APP_VERSION` with defensive fallback `'1.2.0'`. `app-footer-version-warn` span wired at line 103. One-directional logic at lines 120-130. |
| Forced `controllerchange` `location.reload()` removed | VERIFIED | `app.js` line 696: comment "is REMOVED". `grep "controllerchange.*location.reload"` on non-comment lines → 0 hits. |
| `registration.update()` on launch and `visibilitychange` | VERIFIED | `app.js` lines 708-733: `pokeServiceWorkerUpdate()` called on launch and inside idempotent `visibilitychange` listener guarded by `_swUpdateListenerInstalled`. Tagged `console.warn` catch on failure. |
| `sw.js` imports `/assets/version.js` (not `/version.js`) | VERIFIED | `sw.js` line 18: `importScripts('/assets/version.js')`. Regression test `sw-precache-cache-reload.test.js` asserts the path resolves to a real on-disk file (passes). |
| `/assets/version.js` marked `no-cache` in `_headers` | VERIFIED | `_headers` lines 22-23: `/assets/version.js  Cache-Control: no-cache`. |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `assets/version.js` | Dual-context source-of-truth, min 60 lines | VERIFIED | 338 lines. Exports `AppVersion` with `APP_VERSION`, `INTEGRITY_TOKEN`, `resolveIntegrityState`, `INTEGRITY_STRINGS`, `integStr`, `buildNudge`, `runGenuineRecovery`, `footerMarkerForState`. |
| `sw.js` | `importScripts('/assets/version.js')`, CACHE_NAME derived | VERIFIED | Lines 18-19. Precaches `/assets/version.js`. |
| `.github/workflows/deploy.yml` | Single sed stamp step using `GITHUB_SHA::7` | VERIFIED | Line 39. |
| `_headers` | HTTP CSP header, raised TTL, version.js no-cache | VERIFIED | All three present. |
| `assets/shared-chrome.js` | Footer reads `AppVersion.APP_VERSION`, has `app-footer-version-warn` | VERIFIED | Lines 12-14, 103, 119-136. |
| `assets/app.js` | Forced reload removed, `registration.update()` on visibilitychange | VERIFIED | Lines 696-733. |
| `assets/app.css` | `.integrity-nudge` family with `--online`/`--offline`/`--wedged`, RTL-safe close | VERIFIED | Lines 2185-2254. `inset-inline-end` on close button. Banner-family tighter fallbacks (`var(--space-md, 12px)`, `gap: 12px`) verbatim. |
| `tests/28-04-integrity-state.test.js` | Behavior tests, 7 cases | VERIFIED | 7/7 pass. |
| `tests/28-04-nudge-honesty.test.js` | Behavior tests, 6 cases | VERIFIED | 6/6 pass. |
| `tests/sw-precache-cache-reload.test.js` | Regression guard — importScripts path resolves to real file | VERIFIED | ALL PASS. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `sw.js` | `assets/version.js` | `importScripts('/assets/version.js')` exposes `self.AppVersion.INTEGRITY_TOKEN` | VERIFIED | Exact path confirmed. No `/version.js` root path. |
| `.github/workflows/deploy.yml` | `assets/version.js` (staging copy) | `sed -i "s/'__BUILD_TOKEN__'/'${GITHUB_SHA::7}'/"` | VERIFIED | Line 39. Acts on `deploy-staging/assets/version.js` only. |
| `assets/shared-chrome.js` | `assets/version.js` | `window.AppVersion.APP_VERSION` drives footer label | VERIFIED | Lines 12-14. `maybeUpgradeFooterAndNudge` calls `window.AppVersion.checkIntegrity()`. |
| `assets/version.js` (integrity check) | Nudge + footer marker | `checkIntegrity()` → `buildNudge(state)` called from `shared-chrome.js` | VERIFIED | Lines 119-136 in shared-chrome.js. |
| `assets/app.js` | Service worker registration | `registration.update()` on `visibilitychange` + launch | VERIFIED | Lines 708-733. |
| All 21 HTML pages | `_headers` CSP | Per-page `<meta>` deleted; HTTP header is the sole CSP source | VERIFIED | 0 CSP metas in *.html. |
| 20 app HTML pages | `assets/version.js` | `<script src="./assets/version.js">` before `shared-chrome.js` | VERIFIED | 20 pages load it; all load it before shared-chrome.js. `landing.html` excluded. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `assets/shared-chrome.js` footer | `APP_VERSION` | `window.AppVersion.APP_VERSION` ← `assets/version.js` IIFE at page-load | Yes — `'1.2.1'` at runtime | FLOWING |
| `sw.js` | `CACHE_NAME` | `self.AppVersion.INTEGRITY_TOKEN` via `importScripts('/assets/version.js')` ← `__BUILD_TOKEN__` stamped at deploy-time | Yes — real deploy hash in production; `'dev'` locally | FLOWING |
| `assets/version.js` integrity check | `loadedToken` | `caches.keys()` → parses `'sessions-garden-'` prefix from active cache | Yes — local CacheStorage, no network | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `version.js` dual-context global: `APP_VERSION` and dev fallback token | `node -e "global.self=global; require('./assets/version.js'); console.log(self.AppVersion.APP_VERSION, self.AppVersion.INTEGRITY_TOKEN)"` | `1.2.1  dev` | PASS |
| Integrity state resolver — all 7 pure-function behavior cases | `node tests/28-04-integrity-state.test.js` | 7 passed, 0 failed | PASS |
| Nudge honesty — 6 cases (state-bound copy, genuine recovery, 4-lang parity, one-directional footer) | `node tests/28-04-nudge-honesty.test.js` | 6 passed, 0 failed | PASS |
| SW importScripts path resolves to real on-disk file (regression guard) | `node tests/sw-precache-cache-reload.test.js` | ALL PASS | PASS |
| 0 HTML pages carry CSP meta | `grep -l 'http-equiv="Content-Security-Policy"' *.html \| wc -l` | 0 | PASS |
| Exactly 20 pages load `assets/version.js` | `grep -l "assets/version.js" *.html \| wc -l` | 20 | PASS |
| `landing.html` NOT loading `assets/version.js` | `grep -c "assets/version.js" landing.html` | 0 | PASS |
| `sw.js` CACHE_NAME derived (no `sessions-garden-v[0-9]` literal) | `grep "sessions-garden-v[0-9]" sw.js` | 0 hits | PASS |
| Forced `controllerchange` reload absent from `app.js` | `grep -n "controllerchange" app.js` — comment-only | Comment + no `location.reload()` following it | PASS |

---

### Requirements Coverage

| Requirement | Description | Plans | Status | Evidence |
|-------------|-------------|-------|--------|----------|
| VER-01 | Installed PWA reliably receives and applies updates — field-verified | 28-01, 28-04 | SATISFIED | `importScripts` path corrected, `version.js` no-cache, forced reload removed, `registration.update()` on visibilitychange. Field-verified live (v1.2.1, deploy c702c53). |
| VER-02 | Single source-of-truth version constant drives footer, SW CACHE_NAME, integrity-check reference | 28-01, 28-03, 28-04 | SATISFIED | `assets/version.js` is the single source. All three consumers wired and tested. |
| VER-03 | Runtime integrity self-check detects divergence — displayed version cannot silently lie | 28-04 | SATISFIED | `resolveIntegrityState` pure function, 7/7 tests. Footer ⚠ marker one-directional. Honest nudge 6/6 tests. |
| VER-04 | CSP via HTTP header in `_headers`; per-page `<meta>` removed | 28-02, 28-03 | SATISFIED | `_headers` CSP header present; 0 HTML pages carry CSP meta. |
| VER-05 | Static JS/CSS cache TTL `max-age=86400+`; SW still owns freshness | 28-02 | SATISFIED | `/*.js` and `/*.css` at 86400; HTML + sw.js + version.js at no-cache. |
| VER-06 | No network call introduced — fully offline | 28-01, 28-02, 28-03, 28-04 | SATISFIED | Zero `fetch`/`XHR`/`import()` in version.js. `readLoadedToken` uses CacheStorage only. `runGenuineRecovery` uses SW's own update mechanism. Test 5 of integrity-state suite confirms no-network (traps never fire). |

All 6 requirement IDs from plan frontmatter (VER-01 through VER-06) match the ROADMAP Phase 28 requirements. No orphaned requirements.

---

### Anti-Patterns Found

No blockers. No TBD/FIXME/XXX markers in any phase-modified file. No TODO/HACK/PLACEHOLDER hits. The two `return null` occurrences in `version.js` are defensive guards (no-caches-API guard in `readLoadedToken`, no-document guard in `buildNudge`) — not stubs; both are handled by callers. The `return null` occurrences in `app.js` are in pre-existing, unrelated code paths.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | — |

---

### Human Verification Required

None. The one human-verify gate in the phase (Task 4 of Plan 04 — VER-01 field verification on a real installed PWA) was completed by Ben during execution. Per the important context provided, this is confirmed closed. The code supports all verified behaviors without further manual testing.

---

## Gaps Summary

No gaps. All 6 ROADMAP success criteria are verified in the codebase. All 9 artifacts exist and are substantively implemented. All key links are wired. Both production-critical bugs found during field verification (importScripts path, version.js cache policy) were fixed before phase close and are reflected in the live code (commits c702c53, 32b02f4). All 3 behavior test files pass. No debt markers. The phase goal is achieved.

---

_Verified: 2026-06-22_
_Verifier: Claude (gsd-verifier)_
