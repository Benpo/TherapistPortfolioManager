---
phase: 42-in-app-changelog-what-s-new
fixed_at: 2026-07-09T20:26:44Z
review_path: .planning/phases/42-in-app-changelog-what-s-new/42-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 42: Code Review Fix Report

**Fixed at:** 2026-07-09T20:26:44Z
**Source review:** .planning/phases/42-in-app-changelog-what-s-new/42-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (fix_scope: critical_warning — 0 Critical, 3 Warning; 4 Info findings out of scope)
- Fixed: 3
- Skipped: 0

**Test suite:** `npm test` — **162 passed, 0 failed, 162 total** (full suite green after all fixes).

## Fixed Issues

### WR-01: changelog.html omits tour.js/tour.css — dead "Onboarding Tour" controls

**Files modified:** `changelog.html`
**Commit:** 3a4f16f
**Applied fix:** Mirrored help.html's established include chain exactly: added
`<link rel="stylesheet" href="./assets/tour.css" />` in `<head>` (after the
page CSS `changelog.css`, before the manifest link) and
`<script src="./assets/tour.js"></script>` immediately after `app.js` in the
script chain. `window.Tour` is now defined on the changelog page, so the help
popover's "Onboarding Tour" row, the coordinator's tour-reminder Start button,
and the welcome overlay CTA all work there. Both tour assets were already in
the SW precache (`sw.js:101-102`), so no precache change was needed.

### WR-02: Changelog anchor deep-links unreliable — entries render after the browser's fragment scroll

**Files modified:** `assets/changelog.js`
**Commit:** 319497f
**Applied fix:** Added a `scrollToFragment()` helper (try/catch-guarded, reads
`window.location.hash`, calls `scrollIntoView()` on the target if present) and
a `bootRender()` wrapper that runs `render()` then `scrollToFragment()`.
`boot()` now resolves `App.initCommon()` into `bootRender` (both fulfillment
and rejection paths), while the `app:language` listener still points at plain
`render` — so the fragment re-application runs exactly once on boot, never on
language re-renders, per the review's guard requirement. Deep-links like
`changelog.html#v1-1` now land on the target entry after the async render.

### WR-03: "Version" heading label hardcoded English — bypasses D-17 chrome-i18n contract

**Files modified:** `assets/changelog.js`, `assets/i18n-en.js`, `assets/i18n-he.js`, `assets/i18n-de.js`, `assets/i18n-cs.js`, `tests/42-i18n-parity.test.js`
**Commit:** 856dc69
**Applied fix:** Added the new chrome key `changelog.entry.version` to all four
locale files, inserted inside the Phase 42 D-17 chrome block (directly after
`changelog.page.intro`, matching the plan 42-08 placement after
`help.entry.takeTour`):
- EN: `"Version {V}"`
- HE: `"גרסה {V}"` (native-speaker pass in Phase 42.1, like the sibling keys)
- DE: `"Version {V}"`
- CS: `"Verze {V}"`

`versionLabel()` in `assets/changelog.js` now interpolates the localized
template, with the review's token-guard fallback: if the key is missing or the
`{V}` token was lost in translation, it falls back to the English
`"Version " + v` (mirrors the whats-new.js title guard). The fallback also
keeps the render test green (its App stub echoes keys). Updated
`tests/42-i18n-parity.test.js` NEW_KEYS from 10 to 11 keys (the test pins an
explicit key list), including header comments and test names — the parity gate
now guards the new key's presence/parity/no-emoji across all four locales.

## Skipped Issues

None — all three in-scope findings were fixed.

(IN-01 through IN-04 are Info-severity and out of scope for
`fix_scope: critical_warning`.)

## Verification

- Tier 1: all modified sections re-read; fixes present, surrounding code intact.
- Tier 2: `node -c` passed on `assets/changelog.js` and
  `tests/42-i18n-parity.test.js`; all four i18n locale files load cleanly in a
  vm sandbox. `changelog.html` has no syntax checker (Tier 3 fallback).
- Targeted tests: `tests/42-i18n-parity.test.js` 3/3 PASS (now guarding 11
  keys), `tests/42-changelog-render.test.js` 15/15 PASS.
- Full suite: `npm test` → 162 passed, 0 failed.

---

_Fixed: 2026-07-09T20:26:44Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
