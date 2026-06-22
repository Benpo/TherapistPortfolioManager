---
phase: 18-technical-debt
verified: 2026-03-24T14:45:00Z
status: human_needed
score: 10/10 must-haves verified
re_verification: false
human_verification:
  - test: "Open license.html when already activated — verify green 'Licensed' badge with masked key"
    expected: "Green status badge with SVG checkmark, masked key like 'XXXX-....-XXXX', and a red 'Deactivate This Device' button visible. Activation form is hidden."
    why_human: "Two-mode page switching is driven by isLicensed() at runtime — cannot verify visual render or mode toggle programmatically"
  - test: "Click 'Deactivate This Device' — verify custom styled confirmation dialog appears (not native browser confirm)"
    expected: "A styled overlay dialog with a bold red consequence message (not the default grey browser confirm box). Cancel button focused. Escape closes it."
    why_human: "CSS rendering and dialog appearance require visual inspection to confirm D-18 bold-red requirement is met"
  - test: "Hebrew mode on license.html (?lang=he) — activated view strings, RTL layout"
    expected: "All activated-view strings in Hebrew, layout renders RTL correctly with the updated html[dir='rtl'] selectors"
    why_human: "RTL layout correctness after dir-attribute migration to html element requires visual verification"
---

# Phase 18: Technical Debt Verification Report

**Phase Goal:** Address deferred technical debt from Phase 15 audit: license key obfuscation, App.js API cleanup, refund handling SOP, dir attribute standardization, and license page self-service deactivation.
**Verified:** 2026-03-24
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | License key in localStorage is Base64-encoded, not plain text | VERIFIED | `encodeLicenseValue(key)` in `setItem('portfolioLicenseKey', ...)` at license.js:242 |
| 2  | License instance ID in localStorage is Base64-encoded | VERIFIED | `encodeLicenseValue(data.instance.id)` at license.js:243 |
| 3  | Disclaimer receipt shows the real (decoded) license key | VERIFIED | `decodeLicenseValue(localStorage.getItem('portfolioLicenseKey'))` in disclaimer.js:187 |
| 4  | All CSS RTL selectors target html[dir="rtl"], not body | VERIFIED | `grep -c 'body[dir="rtl"]' app.css` = 0; `grep -c 'html[dir="rtl"]' app.css` = 11 |
| 5  | app.js setLanguage sets dir on documentElement | VERIFIED | `document.documentElement.setAttribute("dir", ...)` at app.js:46 |
| 6  | License page shows activated view when licensed | VERIFIED | `showActivatedMode()` called when `isLicensed()` at license.js:436; HTML element `#license-activated-view` exists in license.html |
| 7  | Deactivate button calls LS API and clears localStorage | VERIFIED | POST to `https://api.lemonsqueezy.com/v1/licenses/deactivate` at license.js:255; all 3 `removeItem` calls at license.js:456-458 |
| 8  | Custom confirm dialog (not native) with bold red warning | VERIFIED | `showDeactivateConfirm()` function in license.js; `.license-confirm-msg` CSS has `color: #b91c1c; font-weight: 700` at license.html:310-311 |
| 9  | App.js public API has JSDoc with section grouping | VERIFIED | 20 `@param`, 8 `@returns` annotations; 5 section headers confirmed (i18n, Navigation and chrome, UI utilities, Data formatting and export, Shared form helpers) |
| 10 | Refund SOP document exists with step-by-step LS instructions | VERIFIED | REFUND-SOP.md exists; contains "Deactivate the License Key" section, customer email template, edge cases table, 5x "Lemon Squeezy" references |

**Score:** 10/10 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `assets/license.js` | Base64 encode/decode helpers + dir on documentElement | VERIFIED | Contains `encodeLicenseValue`, `decodeLicenseValue`, `migratePlainKeys` IIFE, `deactivateLicenseKey`, `showDeactivateConfirm`, `showActivatedMode`, `showActivationMode` |
| `assets/disclaimer.js` | Decoded key for receipt | VERIFIED | Contains `decodeLicenseValue` helper and uses it in `downloadReceipt()` |
| `assets/app.js` | Dir on documentElement instead of body | VERIFIED | `document.documentElement.setAttribute("dir", ...)` confirmed; no `document.body.setAttribute("dir"` found |
| `assets/app.css` | RTL selectors on html element | VERIFIED | 11x `html[dir="rtl"]`, 0x `body[dir="rtl"]` |
| `license.html` | Two-mode license page with activated view markup | VERIFIED | Contains `#license-activated-view`, `#license-deactivate-btn`, `#license-masked-key`, `#license-confirm-overlay` |
| `.planning/phases/18-technical-debt/REFUND-SOP.md` | Step-by-step refund handling procedure | VERIFIED | File exists; contains all required sections |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `assets/license.js` | localStorage | `encodeLicenseValue`/`decodeLicenseValue` wrappers | WIRED | `setItem` wraps with `encodeLicenseValue`; `getItem` reads decoded via `decodeLicenseValue` at lines 242-243, 372, 421 |
| `assets/disclaimer.js` | localStorage | `decodeLicenseValue` for receipt | WIRED | `decodeLicenseValue(localStorage.getItem('portfolioLicenseKey'))` at disclaimer.js:187 |
| `assets/app.js` | `document.documentElement` | `setLanguage` dir attribute | WIRED | `document.documentElement.setAttribute("dir", ...)` at app.js:46 |
| `assets/license.js` | `https://api.lemonsqueezy.com/v1/licenses/deactivate` | fetch POST with license_key + instance_id | WIRED | POST fetch at license.js:255; URLSearchParams body confirmed |
| `assets/license.js` | localStorage | clear keys on deactivation | WIRED | `removeItem('portfolioLicenseKey')`, `removeItem('portfolioLicenseInstance')`, `removeItem('portfolioLicenseActivated')` at license.js:456-458 |
| `.planning/phases/18-technical-debt/REFUND-SOP.md` | Lemon Squeezy dashboard | Manual SOP steps with deactivate instruction | WIRED | "Deactivate the License Key" section at SOP line 27 with step-by-step LS dashboard instructions |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DEBT-01 | Plan 01 | License key obfuscated in localStorage | SATISFIED | Base64 via `encodeLicenseValue`/`decodeLicenseValue` in license.js. Note: REQUIREMENTS.md describes "XOR with device-derived salt" but the implementation uses Base64 — this is a documented deliberate decision (Base64 is cosmetic obfuscation; real security is LS 2-device limit). |
| DEBT-02 | Plan 03 | Business logic extracted from DOM manipulation into shared utils.js | SATISFIED (reinterpreted) | REQUIREMENTS.md says "shared utils.js" but decision D-06 (documented in Plan 03) explicitly chose NOT to create utils.js — Phase 16 had already extracted duplicated functions into app.js. JSDoc + section grouping achieved the goal of documented, organized public API. |
| DEBT-03 | Plan 03 | LS refund webhook handling (Cloudflare Worker or documented manual SOP) | SATISFIED | REFUND-SOP.md covers the "documented manual SOP" path. Decision D-09/D-10/D-11 documents why manual SOP is proportional for EUR 119 one-time purchase. |
| DEBT-04 | Plan 01 | dir attribute standardized to html element across all pages | SATISFIED | 11x `html[dir="rtl"]` in app.css, `documentElement.setAttribute("dir")` in app.js. |
| DEBT-05 | Plan 02 | Self-service device deactivation (internal label, not in REQUIREMENTS.md) | ORPHANED | Plan 02 frontmatter lists DEBT-05 as its requirement, but DEBT-05 has no entry in REQUIREMENTS.md. The work was fully delivered and passes all checks, but the requirement was never registered. Plan 02 SUMMARY shows `requirements-completed: []`. This is an administrative tracking gap only — the feature works. |

### Orphaned Requirements

**DEBT-05** — Referenced in `18-02-PLAN.md` frontmatter `requirements: [DEBT-05]` but has no corresponding entry in `.planning/REQUIREMENTS.md`. The associated work (license page two-mode UX, self-service deactivation) is fully implemented and verified. This is a bookkeeping gap: DEBT-05 should either be added to REQUIREMENTS.md as a completed item or the plan frontmatter note should be updated to clarify its informal status.

---

## Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `assets/app.js` | Multiple uses of `placeholder` in code | Info | Not a stub — these are legitimate HTML `placeholder` attribute reads/writes and a `#nav-placeholder` DOM element. No impact. |

No blockers or warnings found.

---

## Human Verification Required

### 1. License page two-mode UX — activated view

**Test:** Open `license.html` in a browser on a device where the license is already activated.
**Expected:** Green "Licensed" badge with SVG checkmark, masked key displayed (first 4 and last 4 chars with `-....-` in between), and a red "Deactivate This Device" button. The activation form (heading, input field, purchase link) should be hidden.
**Why human:** The mode switch is triggered by `isLicensed()` reading live localStorage at DOMContentLoaded — can't verify which UI is shown without a real activated state.

### 2. Deactivation confirmation dialog visual quality

**Test:** Click "Deactivate This Device" (when activated).
**Expected:** A styled modal overlay appears (not the native grey browser `confirm()` dialog). The consequence message text should be **bold and red** (D-18 requirement). Cancel button should be auto-focused. Pressing Escape should close without action.
**Why human:** CSS rendering of bold red text and modal dialog styling requires visual confirmation that the design tokens resolve correctly and the dialog matches the garden aesthetic.

### 3. Hebrew mode activated view

**Test:** Open `license.html?lang=he` on an activated device.
**Expected:** All activated-view strings in Hebrew (gender-neutral phrasing), layout renders RTL, the confirmation dialog also appears in Hebrew if triggered.
**Why human:** RTL layout rendering with the new `html[dir="rtl"]` selector pattern (migrated from `body[dir="rtl"]`) requires visual confirmation that cascade is working correctly and no layout breaks occurred.

---

## Commits Verified

All 8 commits documented in SUMMARY files were verified to exist in git log:

| Commit | Description |
|--------|-------------|
| `8c9bf3c` | feat(18-01): Base64 license key obfuscation + dir on documentElement |
| `357243f` | fix(18-01): migrate CSS RTL selectors from body to html element |
| `a712235` | feat(18-02): license page two-mode UX with self-service deactivation |
| `0e1b863` | fix(18-02): CSS hidden attribute override |
| `f571834` | fix(18-02): improve Hebrew (gender-neutral) and German i18n for deactivation strings |
| `61b6283` | fix: bump SW cache to v23 for i18n string updates |
| `7f2a311` | feat(18-03): add JSDoc comments and section grouping to App API |
| `40cb79c` | feat(18-03): add refund handling SOP document |

---

## Notes on Requirement Interpretation

Two REQUIREMENTS.md descriptions differ from actual implementation:

1. **DEBT-01** says "XOR with device-derived salt" but implementation uses Base64. The PLAN explicitly chose Base64 as a deliberate simplification (cosmetic obfuscation — real security is the LS 2-device activation limit). This was a scoped-down implementation decision, not a missed requirement.

2. **DEBT-02** says "extracted from DOM manipulation into shared utils.js" but no utils.js was created. Decision D-06 documented that Phase 16 had already extracted shared functions into app.js, making a separate utils.js redundant. The JSDoc + grouping approach satisfies the intent (organized, documented public API).

Both deviations are documented decisions with clear rationale, not gaps.

---

_Verified: 2026-03-24_
_Verifier: Claude (gsd-verifier)_
