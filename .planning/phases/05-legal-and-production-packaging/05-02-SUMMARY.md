---
phase: 05-legal-and-production-packaging
plan: 02
subsystem: infra
tags: [pwa, service-worker, manifest, license-key, lemon-squeezy, offline, localStorage, i18n, vanilla-js]

# Dependency graph
requires:
  - phase: 05-legal-and-production-packaging
    plan: 01
    provides: terms gate script in all 5 app pages (portfolioTermsAccepted localStorage key)

provides:
  - license.html: license key entry page with terms gate, i18n (en/he/de/cs), RTL support, re-activation pre-fill, purchase link
  - assets/license.js: Lemon Squeezy activate API call, STORE_ID/PRODUCT_ID cross-product validation, offline isLicensed() check, all error categories, 4-language i18n
  - sw.js: cache-first service worker precaching all static assets for full offline capability
  - manifest.json: PWA manifest with Sessions Garden name, standalone display, theme colors, placeholder icons
  - assets/icons/icon-192.png, icon-512.png: valid placeholder PNG icons (green squares)
  - _headers: Cloudflare Pages cache control (no-cache HTML, 1-day JS/CSS)
  - License gate injected into all 5 app pages (after terms gate, before theme script)
  - manifest link + SW registration in all 5 app pages + disclaimer.html
  - iOS install guidance banner on index.html

affects: [05-03-landing-page, 06-qa-and-playwright]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "License gate inline script: runs after terms gate, redirects to license.html if portfolioTermsAccepted exists but portfolioLicenseActivated is missing"
    - "Cache-first service worker: precache on install, delete old caches on activate + clients.claim(), network fallback on miss"
    - "STORE_ID/PRODUCT_ID === 0 skips cross-product validation — development-mode escape hatch, TODO before launch"
    - "iOS install banner: sessionStorage-dismissed, shown when /iP(hone|ad|od)/.test(UA) + not standalone"
    - "Error type classification in activateLicenseKey(): network/invalid/deviceLimit/crossProduct throw typed objects"

key-files:
  created:
    - license.html
    - assets/license.js
    - sw.js
    - manifest.json
    - _headers
    - assets/icons/icon-192.png
    - assets/icons/icon-512.png
  modified:
    - index.html
    - sessions.html
    - add-client.html
    - add-session.html
    - reporting.html
    - disclaimer.html

key-decisions:
  - "STORE_ID and PRODUCT_ID constants default to 0 — Sapir must replace with real Lemon Squeezy values after product creation; 0 skips cross-product check (dev mode)"
  - "sw.js uses Promise.allSettled() for precaching — tolerates 404 on not-yet-created files (e.g. landing.html) without blocking install"
  - "Service worker does NOT call skipWaiting — avoids half-old-half-new asset state with multiple open tabs"
  - "iOS install banner dismissed via sessionStorage (per session only) — resurfaces on next load if dismissed"
  - "SW cross-origin requests (e.g. Lemon Squeezy API) pass through untouched — only same-origin GET requests are cached"

patterns-established:
  - "Gate order in app pages: 1) terms gate 2) license gate 3) theme detection — each inline synchronous script"
  - "License localStorage keys: portfolioLicenseKey (string), portfolioLicenseInstance (LS instance_id), portfolioLicenseActivated ('1')"

requirements-completed: [DIST-03, DIST-04]

# Metrics
duration: 8min
completed: 2026-03-12
---

# Phase 5 Plan 02: License Key Gate and PWA Infrastructure Summary

**Lemon Squeezy license gate (localStorage + API activation) with full PWA offline support via cache-first service worker, manifest.json, and placeholder icons across all app pages**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-12T17:01:39Z
- **Completed:** 2026-03-12T17:09:42Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Created license.html key entry page with 4-language i18n (en/he/de/cs), RTL for Hebrew, re-activation pre-fill when key is stored but activation flag is missing, and Lemon Squeezy API activation with typed error classification (network, invalid, deviceLimit, crossProduct)
- Built assets/license.js with STORE_ID/PRODUCT_ID cross-product verification, offline isLicensed() check (localStorage only, no API call after first activation), and all required localStorage keys
- Cache-first service worker (sw.js) precaching all static assets using Promise.allSettled() to tolerate missing files gracefully; no skipWaiting to avoid half-updated states; explicitly documented that IndexedDB is unaffected
- PWA manifest (manifest.json) with correct Sessions Garden branding, colors from design tokens, valid placeholder 192x512 PNG icons, Cloudflare Pages _headers cache rules
- License gate + manifest link + SW registration injected into all 5 app pages; disclaimer.html gets manifest + SW only (no license gate)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create license key gate page and activation logic** - `644d749` (feat)
2. **Task 2: Create PWA infrastructure and inject gates into app pages** - `f842c84` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `license.html` - License key entry UI with terms gate, brand, input field, activate button, error/success messaging, purchase link, loading state
- `assets/license.js` - activateLicenseKey() async with Lemon Squeezy API, STORE_ID/PRODUCT_ID validation (skipped if 0), isLicensed() offline check, 4-language LICENSE_I18N object, DOMContentLoaded page init with RTL support
- `sw.js` - Cache-first service worker; install precaches all HTML/CSS/JS/fonts; activate deletes old caches + clients.claim(); fetch intercepts same-origin GETs only; explicitly does NOT touch IndexedDB
- `manifest.json` - PWA manifest: name "Sessions Garden", standalone display, theme_color #2d6a4f, background_color #faf7f2, 192+512 icon entries
- `_headers` - Cloudflare Pages headers: no-cache for HTML, 1-day max-age for JS/CSS
- `assets/icons/icon-192.png` - Valid PNG placeholder icon (192x192 solid green #2d6a4f)
- `assets/icons/icon-512.png` - Valid PNG placeholder icon (512x512 solid green #2d6a4f)
- `index.html` - License gate + manifest link + SW registration + iOS install banner
- `sessions.html` - License gate + manifest link + SW registration
- `add-client.html` - License gate + manifest link + SW registration
- `add-session.html` - License gate + manifest link + SW registration
- `reporting.html` - License gate + manifest link + SW registration
- `disclaimer.html` - Manifest link + SW registration (no license gate — disclaimer must remain accessible)

## Decisions Made

- STORE_ID and PRODUCT_ID constants set to 0 as placeholders — cross-product validation is skipped when either is 0 (dev mode). Sapir must replace these after creating the Lemon Squeezy product.
- service worker uses Promise.allSettled() rather than cache.addAll() so that missing files (landing.html not yet created) don't fail the entire install
- iOS install banner uses sessionStorage (dismissed per session, not permanently) — minor annoyance tradeoff vs ensuring users on iOS discover the install option

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Verification script check for `sw.includes('skipWaiting')` triggered on a comment in sw.js that used the phrase for documentation. Fixed by rephrasing the comment to avoid the string. (Rule 1 auto-fix — trivial)

## User Setup Required

**Lemon Squeezy product configuration required before launch:**
1. Create a product in Lemon Squeezy dashboard
2. Set activation limit to 3 devices
3. Copy your numeric `store_id` and `product_id` from the product overview
4. Replace `STORE_ID = 0` and `PRODUCT_ID = 0` in `assets/license.js` with actual values
5. Update `support@sessionsgarden.app` placeholder in device limit error message

No code changes needed until Step 4 above.

## Next Phase Readiness

- License gate complete and injected. Phase 05-03 (landing page) can proceed independently.
- All app pages now have: terms gate → license gate → theme detection → manifest → SW registration.
- disclaimer.html is accessible without license (as required — user must be able to re-read terms).
- service worker will cache landing.html once plan 03 creates it (already in PRECACHE_URLS list).

---
*Phase: 05-legal-and-production-packaging*
*Completed: 2026-03-12*
