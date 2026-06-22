---
phase: 28-update-reliability-versioning
plan: 04
subsystem: service-worker
tags: [service-worker, versioning, integrity-check, pwa, cache-busting, i18n, rtl]
requires:
  - phase: 28-update-reliability-versioning
    provides: "assets/version.js (Plan 01) — AppVersion global exposing APP_VERSION + deploy-stamped INTEGRITY_TOKEN; SW CACHE_NAME auto-derived from the token"
  - phase: 28-update-reliability-versioning
    provides: "version.js wired ahead of shared-chrome.js on all 20 SW app pages (Plan 03) — the footer + integrity check can read the source-of-truth constant"
provides:
  - "Pure, tested runtime integrity self-check (resolveIntegrityState) mapping (loadedToken, sourceToken, online, recoveryAttempted) → clean/online/offline/wedged with ZERO network (VER-03, VER-06)"
  - "Honest integrity nudge (.db-error-banner-family variant) whose copy is bound to the resolved state — online promises completion, offline makes no promise, wedged hands off to Phase 29 (D-10/D-11/D-12)"
  - "INTEGRITY_STRINGS {en,he,de,cs} colocated in version.js with integStr() fallback getter (never i18n.js — early-lifecycle requirement)"
  - "Footer reads window.AppVersion.APP_VERSION (single source, VER-02) and one-directionally upgrades to v1.2.1 ⚠ on mismatch, never downgrading (D-09)"
  - "Update delivery fix: forced controllerchange reload REMOVED (apply-on-next-navigation, D-05); registration.update() on launch + visibilitychange (D-06)"
  - "Field-verified live (v1.2.1, deploy c702c53): version.js no-cache + corrected SW importScripts path — the two fixes that make automatic update delivery actually hold in production"
affects:
  - "Phase 29 (Reliability & Observability) — the wedged-state nudge CTAs ('Recover the app', 'Report a problem') stub to the Phase 29 reset-hatch + report-a-problem flow; the now-reliable update path is the channel observability code reaches installed users through"
tech-stack:
  added: []
  patterns:
    - "Pure state-resolver + thin runtime entrypoint: resolver is a pure function of its args (unit-testable without a SW/DOM); the entrypoint gathers real local-only inputs (navigator.onLine, cache-name token, a per-load recovery flag)"
    - "Honest-by-construction UI: nudge copy is bound to the resolved state and locked by behavior tests, so the UI cannot promise a fix it won't deliver"
    - "Colocated early-lifecycle i18n (INTEGRITY_STRINGS/integStr) mirroring the db.js DB_STRINGS/dbStr idiom — strings that must exist before i18n.js loads live next to their consumer"
    - "One-directional footer marker: render clean optimistically, only upgrade to ⚠, never downgrade within a load (D-09)"
    - "Genuine recovery (not cosmetic reload): registration.update() → activate new SW → delete stale HTTP/asset caches → reload; IndexedDB never touched"
    - "Deploy-token propagation discipline: any file the SW re-imports to detect a new deploy (version.js) MUST be no-cache, and the importScripts path MUST match the actually-deployed/precached path"
key-files:
  created:
    - tests/28-04-integrity-state.test.js
    - tests/28-04-nudge-honesty.test.js
  modified:
    - assets/version.js
    - assets/shared-chrome.js
    - assets/app.css
    - assets/app.js
    - _headers
    - sw.js
    - tests/sw-precache-cache-reload.test.js
key-decisions:
  - "version.js must be no-cache: the SW re-imports it on every update check, so under the /*.js max-age=86400 rule a stale token could hide a new deploy for up to 24h (fix 32b02f4)"
  - "SW importScripts path must match the deployed/precached path: sw.js imported root /version.js which the deploy never ships → importScripts threw → the Phase 28 SW never installed in production; corrected to /assets/version.js (fix c702c53)"
  - "Shipped as v1.2.1 (bumped from 1.2.0 during auto-delivery field verification)"
  - "Integrity 'loaded token' derived locally from the active SW cache name (caches.keys) — no network fetch (VER-06)"
  - "Offline state never promises completion (D-11); online+already-recovered → wedged, never a looped 'refresh to complete' lie (D-12)"
patterns-established:
  - "Pure resolver + thin entrypoint for testable runtime checks"
  - "State-bound honest UI copy locked by behavior tests"
  - "Colocated early-lifecycle string tables (INTEGRITY_STRINGS) instead of i18n.js routing"
  - "Deploy-token propagation: no-cache the re-imported file + match the importScripts path to the precache path"
requirements-completed: [VER-01, VER-02, VER-03, VER-06]

duration: ~95min (incl. field verification + gap closure)
completed: 2026-06-22
status: complete
---

# Phase 28 Plan 04: Integrity self-check + honest nudge + reliable update delivery Summary

**A pure, tested runtime integrity self-check (token comparison → clean/online/offline/wedged, zero network) drives a state-bound honest nudge and a one-directional footer `v1.2.1 ⚠` marker; the forced mid-page reload is gone (apply-on-next-navigation) and `registration.update()` runs on launch/visibilitychange — and two field-verification fixes (version.js `no-cache`, corrected SW `importScripts` path) make automatic update delivery actually hold in production.**

## Performance

- **Duration:** ~95 min (code ~25 min across 3 task commits, then field verification + gap closure)
- **Started:** 2026-06-22T14:12:59Z (Task 1 commit)
- **Completed:** 2026-06-22 (live as v1.2.1, deploy token c702c53)
- **Tasks:** 4 (3 auto code tasks + 1 human-verify field gate, now closed)
- **Files modified:** 9 (4 source + 2 new tests + 3 field-gap-closure: _headers, sw.js, sw regression test)

## Accomplishments
- **Runtime integrity self-check (VER-03)** — `resolveIntegrityState({loadedToken, sourceToken, online, recoveryAttempted})` is a pure function returning `clean`/`online`/`offline`/`wedged` per the UI-SPEC "Three honest states"; the displayed version can no longer silently lie (the v209 failure mode). The "loaded token" is derived locally from the active SW cache name (`caches.keys()`) — strictly no network (VER-06).
- **Honest, state-bound nudge** — `online` offers a genuine "Refresh to complete" recovery; `offline` makes NO completion promise (reconnect hint only, D-11); `wedged` degrades to "Recover / Report" guidance handing off to Phase 29, never a looped false "refresh" (D-12). Copy is locked to state by the behavior tests.
- **Single source of truth (VER-02)** — the footer reads `window.AppVersion.APP_VERSION` (→ `v1.2.1`) instead of the old hardcoded literal, and upgrades one-directionally to `v1.2.1 ⚠` on a detected mismatch (never downgrades, D-09).
- **Reliable update delivery (VER-01)** — the forced mid-page `controllerchange` `location.reload()` is removed (apply-on-next-navigation, D-05); `registration.update()` now pokes on launch + `visibilitychange` (D-06), idempotently guarded with a tagged `console.warn` catch.
- **4-language nudge strings** — `INTEGRITY_STRINGS {en,he,de,cs}` colocated in version.js with an `integStr()` fallback getter (lang→en→key); HE gender-neutral (Phase 18); never routed through i18n.js (early-lifecycle requirement).
- **Field-verified live and two production-critical fixes shipped** (see "Field-verification gap closure").

## Task Commits

1. **Task 1: Integrity self-check + pure state resolver (RED→GREEN)** — `d394e33` (feat) — `resolveIntegrityState` + `readLoadedToken()` (local-only, via SW cache name) + `checkIntegrity()` entrypoint; behavior test `tests/28-04-integrity-state.test.js` (7/7).
2. **Task 2: Honest nudge DOM builder + 4-lang strings + genuine recovery + footer ⚠ marker (RED→GREEN)** — `d0993db` (feat) — `INTEGRITY_STRINGS`/`integStr`, `buildNudge(state)`, `runGenuineRecovery`, `footerMarkerForState`; shared-chrome footer reads `AppVersion.APP_VERSION`; behavior test `tests/28-04-nudge-honesty.test.js` (6/6).
3. **Task 3: Nudge CSS + remove forced reload + launch update poll** — `6542a08` (feat) — `.integrity-nudge` family (`--online`/`--offline`/`--wedged` info/warning/danger bands, RTL-safe `inset-inline-end` close button, banner-family tighter fallbacks verbatim); app.js removes the forced reload and installs the visibilitychange `registration.update()` poll.
4. **Task 4: VER-01 field verification (D-07 human gate)** — no code commit; manual gate on the live installed PWA. **CLOSED** — Ben confirmed the phase is field-tested and the fix is live. The two fixes below were found and shipped during this verification.

**Deferred-items log:** `b0b12ee` (docs) — pre-existing PDF test-env failures logged as out-of-scope.

**Plan metadata:** this commit (docs: finalize plan).

## Field-verification gap closure

VER-01's manual gate (D-07) is exactly where the two failures that actually decide whether automatic update delivery works were caught. Both are now fixed, tested, and live (production v1.2.1, deploy token `c702c53`):

### 1. `version.js` was HTTP-cacheable → stale deploy token could hide a new deploy for 24h — `32b02f4`
`version.js` carries `INTEGRITY_TOKEN`, the value the whole cache-busting scheme keys on. Under the `/*.js` `max-age=86400` rule it was served `public, max-age=86400`. The service worker's update check **re-imports `version.js`**, fetched through the HTTP cache by default — so within 24h of a previous deploy the SW could read a stale token and miss the new deploy entirely, defeating VER-01/VER-03's "updates reach everyone automatically" goal.
**Fix:** `_headers` now marks `/assets/version.js` `Cache-Control: no-cache` (the same treatment `sw.js` already has), so its token is always revalidated and every deploy is detected immediately.

### 2. SW `importScripts('/version.js')` pointed at a path the deploy never ships → the Phase 28 SW never installed in production — `c702c53`
`sw.js` imported root `/version.js`, but the deploy ships `version.js` only at `/assets/version.js`. Root `/version.js` resolved to Cloudflare's HTML fallback, so `importScripts()` threw during SW evaluation and **the Phase 28 service worker never installed in production**. The page layer worked (pages load `./assets/version.js` directly via `<script>`), which masked the failure — but the SW layer, which owns cache invalidation and the integrity check (i.e. the phase goal), was dead.
**Fix:** point `importScripts` at `/assets/version.js` (matches `PRECACHE_URLS`, the page load path, and the now-no-cache rule) + a regression guard in `tests/sw-precache-cache-reload.test.js` asserting the `importScripts()` path resolves to a real on-disk file.

**Net effect:** these two fixes are what make the phase goal — reliable automatic updates — actually hold for installed users. Without them the in-app code was correct but unreachable (SW dead) and slow to propagate (stale token). The phase ships as **v1.2.1** (bumped from 1.2.0 during this auto-delivery verification).

## Files Created/Modified
- `assets/version.js` — integrity resolver + runtime entrypoint, nudge DOM builder, genuine recovery, `INTEGRITY_STRINGS`/`integStr`, footer-marker helper; `APP_VERSION = '1.2.1'`
- `assets/shared-chrome.js` — footer reads `AppVersion.APP_VERSION` (single source, VER-02), one-directional `⚠` upgrade (D-09)
- `assets/app.css` — `.integrity-nudge` family (info/warning/danger bands, RTL-safe close, banner-family tighter fallbacks verbatim)
- `assets/app.js` — forced `controllerchange` reload removed (D-05); launch + visibilitychange `registration.update()` (D-06), idempotent guard + tagged catch
- `_headers` — `/assets/version.js` `no-cache` (field-gap fix 32b02f4)
- `sw.js` — `importScripts('/assets/version.js')` (field-gap fix c702c53)
- `tests/28-04-integrity-state.test.js` — 7 pure-resolver behavior cases (incl. no-network)
- `tests/28-04-nudge-honesty.test.js` — 6 cases: state-bound copy, genuine recovery, 4-lang parity, one-directional footer
- `tests/sw-precache-cache-reload.test.js` — added regression guard that importScripts path resolves to a real file

## Decisions Made
- **`version.js` is `no-cache`.** It is the one file the SW re-imports to detect a deploy; HTTP-caching it would let a stale token hide a new deploy for up to the JS TTL (24h). Found during field verification.
- **SW `importScripts` path must match the deployed/precached path.** Root `/version.js` is never shipped; the SW must import `/assets/version.js` or it fails to install. Found during field verification.
- **Shipped as v1.2.1** (bumped from 1.2.0) during the auto-delivery verification — the footer single-source value now reads `v1.2.1`.
- **Loaded token derived locally** from the active SW cache name (`caches.keys()`), never a network fetch (VER-06).
- **Offline never promises completion (D-11); online+already-recovered → wedged (D-12)** — copy is honest by construction and locked by behavior tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] version.js HTTP-cacheable masked new deploys from the SW update check**
- **Found during:** Task 4 (VER-01 field verification)
- **Issue:** `version.js` (carrier of `INTEGRITY_TOKEN`) was served `public, max-age=86400`; the SW re-imports it through the HTTP cache on each update check, so a stale token could hide a new deploy for up to 24h — defeating the phase's automatic-update goal.
- **Fix:** `_headers` marks `/assets/version.js` `Cache-Control: no-cache`.
- **Files modified:** `_headers`
- **Verification:** Live deploy propagation confirmed in field testing; production at v1.2.1.
- **Committed in:** `32b02f4`

**2. [Rule 1 - Bug] SW importScripts pointed at an unshipped root path → Phase 28 SW never installed in production**
- **Found during:** Task 4 (VER-01 field verification)
- **Issue:** `sw.js` imported `/version.js` (root), which the deploy never ships (file lives at `/assets/version.js`); root `/version.js` returned Cloudflare's HTML fallback, so `importScripts()` threw and the Phase 28 SW never installed live. The page layer masked it (pages load `./assets/version.js` directly).
- **Fix:** `importScripts('/assets/version.js')` + regression guard asserting the path resolves to a real on-disk file.
- **Files modified:** `sw.js`, `tests/sw-precache-cache-reload.test.js`
- **Verification:** Regression test passes (importScripts path resolves to a deployed file); SW installs live; production at v1.2.1.
- **Committed in:** `c702c53`

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs). Both were latent in the SW/headers layer and only observable on a real deploy, which is precisely what the D-07 field-verification gate exists to surface.
**Impact on plan:** Both fixes are essential for correctness — without them the in-app integrity/update code was correct but unreachable (SW dead) and slow to propagate (stale token). No scope creep; both fixes are squarely within the phase goal (reliable automatic update delivery). Prompted the v1.2.0 → v1.2.1 bump.

## Issues Encountered
- The pre-existing PDF test-env failures surfaced during the suite run are out of scope for this plan (test harness work is Phase 30, TEST-01); logged to `deferred-items.md` (`b0b12ee`) rather than fixed here.

## TDD Gate Compliance
Tasks 1 and 2 followed RED→GREEN (behavior test authored first, confirmed failing, then implemented). Both committed as single `feat` commits with the test colocated; behavior tests pass (`28-04-integrity-state` 7/7, `28-04-nudge-honesty` 6/6).

## User Setup Required
None — no external service configuration. (Deploys are user-controlled; this plan is not pushed by the executor.)

## Next Phase Readiness
- **VER-01, VER-02, VER-03, VER-06 are closed** — Phase 28's six requirements (VER-01..VER-06 across plans 01–04) are all complete. The displayed version cannot silently lie, one edit drives footer + CACHE_NAME + integrity reference, updates reach installed users reliably, and everything stays offline.
- **Phase 29 hooks are stubbed** — the wedged-state nudge CTAs ("Recover the app", "Report a problem") link/stub to the Phase 29 reset-hatch (OBS-03) and report-a-problem (OBS-02) flows; the now-reliable update path (this plan) is the channel Phase 29's observability code will reach installed users through.

## Self-Check: PASSED
- FOUND: `.planning/phases/28-update-reliability-versioning/28-04-SUMMARY.md`
- FOUND: `tests/28-04-integrity-state.test.js` (7/7 pass), `tests/28-04-nudge-honesty.test.js` (6/6 pass), `tests/sw-precache-cache-reload.test.js` (regression guard pass)
- FOUND commit `d394e33` (Task 1), `d0993db` (Task 2), `6542a08` (Task 3), `32b02f4` (field fix 1), `c702c53` (field fix 2), `b0b12ee` (deferred log)
- FOUND: `assets/version.js` APP_VERSION = '1.2.1'; `_headers` /assets/version.js no-cache; `sw.js` importScripts('/assets/version.js')

---
*Phase: 28-update-reliability-versioning*
*Completed: 2026-06-22*
