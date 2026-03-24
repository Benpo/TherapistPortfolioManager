---
phase: 18-technical-debt
plan: 01
subsystem: auth
tags: [localStorage, base64, rtl, license, i18n]

# Dependency graph
requires:
  - phase: 17-audit-fix-business
    provides: license.js with activateLicenseKey and isLicensed functions
provides:
  - Base64-encoded license credentials in localStorage (portfolioLicenseKey, portfolioLicenseInstance)
  - Auto-migration of plain-text keys from pre-v18 installs
  - dir attribute set on html element (documentElement) across all pages
  - CSS RTL selectors targeting html[dir="rtl"] (not body)
affects: [qa, any phase touching license.js or RTL styles]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "encodeLicenseValue/decodeLicenseValue wrappers for localStorage encode/decode"
    - "migratePlainKeys IIFE at DOMContentLoaded for backward compat"
    - "html[dir=rtl] RTL selector pattern (W3C-aligned)"

key-files:
  created: []
  modified:
    - assets/license.js
    - assets/disclaimer.js
    - assets/app.js
    - assets/app.css

key-decisions:
  - "Base64 is cosmetic obfuscation only — real security is LS 2-device activation limit"
  - "Receipt shows decoded (real) key — customer must know their key"
  - "Migration uses atob() failure detection: not valid Base64 means plain-text, re-encode it"
  - "impressum.html and datenschutz.html need no changes — inline scripts already use documentElement"

patterns-established:
  - "encodeLicenseValue/decodeLicenseValue: always wrap localStorage reads/writes for license keys"
  - "html[dir=rtl] not body[dir=rtl]: W3C-standard RTL selector pattern"

requirements-completed: [DEBT-01, DEBT-04]

# Metrics
duration: 3min
completed: 2026-03-24
---

# Phase 18 Plan 01: Technical Debt — License Obfuscation & RTL Dir Cleanup Summary

**Base64 obfuscation of license credentials in localStorage with backward-compatible migration, plus full alignment of RTL dir attribute to html element across JS and CSS**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-24T11:04:43Z
- **Completed:** 2026-03-24T11:06:44Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- license.js now encodes portfolioLicenseKey and portfolioLicenseInstance with btoa() on write and decodes with atob() on read
- migratePlainKeys IIFE auto-migrates existing plain-text credentials to Base64 on first page load after upgrade
- disclaimer.js receipt download shows the decoded (real) license key — customers can still read their key
- app.js setLanguage() now sets dir on document.documentElement instead of document.body (W3C-compliant)
- All 11 CSS RTL selectors in app.css migrated from body[dir="rtl"] to html[dir="rtl"]

## Task Commits

Each task was committed atomically:

1. **Task 1: Base64 license key obfuscation + dir attribute in JS files** - `8c9bf3c` (feat)
2. **Task 2: CSS RTL selectors + static HTML dir attribute cleanup** - `357243f` (fix)

## Files Created/Modified
- `assets/license.js` - Added encodeLicenseValue/decodeLicenseValue helpers, migration IIFE, updated setItem/getItem calls
- `assets/disclaimer.js` - Added decodeLicenseValue helper, updated downloadReceipt() to decode key for display
- `assets/app.js` - Changed setLanguage() to use documentElement.setAttribute('dir', ...) instead of body
- `assets/app.css` - Replaced all 11 body[dir="rtl"] selectors with html[dir="rtl"]

## Decisions Made
- Base64 is cosmetic obfuscation — prevents casual DevTools inspection, not cryptographic protection. Real security remains LS 2-device limit.
- Receipt continues showing decoded key because customers need to know their own license key.
- Migration strategy: attempt atob() on stored value; if it throws, the value is plain-text and needs encoding.
- No changes to impressum.html or datenschutz.html — their inline scripts already use document.documentElement.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DEBT-01 and DEBT-04 closed. Remaining technical debt items (DEBT-02, DEBT-03, DEBT-05) are in plans 18-02 and 18-03.
- Hebrew RTL rendering is functionally unchanged — dir is now set on html element, which cascades correctly to body and all descendants.

## Self-Check: PASSED

Files modified:
- FOUND: assets/license.js (contains encodeLicenseValue, decodeLicenseValue, migratePlainKeys)
- FOUND: assets/disclaimer.js (contains decodeLicenseValue)
- FOUND: assets/app.js (documentElement.setAttribute dir)
- FOUND: assets/app.css (11 html[dir="rtl"], 0 body[dir="rtl"])

Commits:
- FOUND: 8c9bf3c (Task 1)
- FOUND: 357243f (Task 2)

---
*Phase: 18-technical-debt*
*Completed: 2026-03-24*
