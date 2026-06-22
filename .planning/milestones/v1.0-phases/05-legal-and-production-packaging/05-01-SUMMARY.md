---
phase: 05-legal-and-production-packaging
plan: 01
subsystem: legal
tags: [disclaimer, terms-of-use, i18n, localStorage, Widerrufsrecht, BGB, EU-consumer-protection, gate, vanilla-js]

# Dependency graph
requires:
  - phase: 03-data-model-and-features
    provides: existing app pages (index.html, sessions.html, add-client.html, add-session.html, reporting.html) that now receive the gate script

provides:
  - disclaimer.html: full-screen T&C gate page with 4-language support and LG Karlsruhe-compliant Widerrufsrecht checkbox
  - assets/disclaimer.js: gate logic — language detection, checkbox validation, localStorage acceptance, receipt download, redirect
  - assets/i18n-disclaimer.js: translations for en/he/de/cs including legal text
  - Gate script injected into all 5 app pages as first synchronous script in <head>

affects: [05-02-license-gate, 05-03-landing-page, 06-qa-and-playwright]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inline synchronous gate script as first <script> in <head> — no defer/async, no external file, uses window.location.replace() to prevent back-button loop"
    - "DISCLAIMER_I18N global object pattern: window.DISCLAIMER_I18N[lang] with sections array + flat string keys"
    - "Blob + URL.createObjectURL() + anchor download for receipt .txt generation — no dependencies"
    - "?readonly=true URL param shows legal content without checkboxes/buttons for post-acceptance re-read"
    - "?next=encodedPath URL param for post-acceptance redirect back to original page"

key-files:
  created:
    - disclaimer.html
    - assets/disclaimer.js
    - assets/i18n-disclaimer.js
  modified:
    - index.html
    - sessions.html
    - add-client.html
    - add-session.html
    - reporting.html

key-decisions:
  - "Widerrufsrecht checkbox text uses exact LG Karlsruhe-compliant wording (§356 Abs. 5 BGB) in all 4 languages — separate checkbox from general terms, unchecked by default"
  - "Accept button remains disabled until BOTH checkboxes (general terms + Widerrufsrecht) are checked"
  - "disclaimer.html is standalone — no db.js, app.js, or app page scripts loaded; only tokens.css, app.css, i18n-disclaimer.js, disclaimer.js"
  - "RTL support via dir attribute on html element — toggled to rtl when Hebrew is selected"
  - "Receipt format is plain text .txt via Blob (no PDF library dependency)"
  - "Disclaimer page accessible post-acceptance via footer 'Terms of Use' link using ?readonly=true"

patterns-established:
  - "Gate-first pattern: terms gate script runs before theme detection script, before any app JS"
  - "DISCLAIMER_I18N object structure with sections[] array and flat string keys for labels/buttons/receipt"

requirements-completed: [LEGL-01, LEGL-02, LEGL-03]

# Metrics
duration: 5min
completed: 2026-03-12
---

# Phase 5 Plan 01: Disclaimer / T&C Gate Summary

**Full-screen T&C gate with 4-language i18n, LG Karlsruhe-compliant dual-checkbox (general + Widerrufsrecht per §356 Abs. 5 BGB), Blob receipt download, and synchronous gate script injected into all 5 app pages**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-12T16:53:10Z
- **Completed:** 2026-03-12T16:58:45Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Created standalone disclaimer.html page with sectioned legal content in en/he/de/cs, language auto-detection from navigator.language, RTL support for Hebrew, two checkboxes (general terms + Widerrufsrecht), disabled Accept button until both checked, post-acceptance receipt download and continue-to-app flow
- Built assets/i18n-disclaimer.js with complete translations for all 4 languages including legally-required Widerrufsrecht text per LG Karlsruhe ruling
- Injected synchronous inline gate script as the very first `<script>` in `<head>` of all 5 app pages — blocks all app content before terms accepted, redirects to disclaimer.html?next= for post-acceptance return

## Task Commits

Each task was committed atomically:

1. **Task 1: Create disclaimer page with i18n and legal content** - `315a090` (feat)
2. **Task 2: Inject gate scripts into all 5 existing app pages** - `8c3be1f` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `disclaimer.html` - Full-screen T&C gate page with branding, language selector, 6 legal sections, dual checkboxes, accept button, receipt download, continue button, ?readonly=true mode
- `assets/disclaimer.js` - Gate logic: language detection, direction/RTL, checkbox validation, localStorage acceptance storage (portfolioTermsAccepted + portfolioTermsLang), receipt Blob download, ?next redirect
- `assets/i18n-disclaimer.js` - DISCLAIMER_I18N global with en/he/de/cs translations including LG Karlsruhe-compliant Widerrufsrecht text
- `index.html` - Gate script added as first script in head
- `sessions.html` - Gate script added as first script in head
- `add-client.html` - Gate script added as first script in head
- `add-session.html` - Gate script added as first script in head
- `reporting.html` - Gate script added as first script in head

## Decisions Made

- Widerrufsrecht uses exact LG Karlsruhe wording per §356 Abs. 5 BGB — this is non-negotiable for EU/German legal compliance
- disclaimer.html is fully standalone (no app JS dependencies) so it works even if app scripts fail to load
- Plain text .txt receipt (no PDF library) — legally valid, zero dependencies, works offline
- Gate uses window.location.replace() (not .href) so browser back button doesn't loop to the app

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Disclaimer gate is complete and ready. Phase 05-02 (license key gate) can build on top of the portfolioTermsAccepted localStorage key — its gate script should run after the terms gate.
- All 5 app pages now protected by the terms gate.
- disclamer.html?readonly=true is available for post-acceptance terms re-reading (linked from footer of disclaimer.html).

---
*Phase: 05-legal-and-production-packaging*
*Completed: 2026-03-12*

## Self-Check: PASSED

- disclaimer.html: FOUND
- assets/disclaimer.js: FOUND
- assets/i18n-disclaimer.js: FOUND
- 05-01-SUMMARY.md: FOUND
- Commit 315a090 (Task 1): FOUND
- Commit 8c3be1f (Task 2): FOUND
