---
quick_id: 260702-q5f
phase: quick-260702-q5f
plan: 01
subsystem: home-overview / client sessions toggle
status: complete
requirements: [UAT-F3]
tags: [ui, a11y, i18n, uat-fix]
provides:
  - "Labelled eye+word pill replacing the icon-only clock past-sessions toggle"
  - "overview.table.viewSessions i18n key in en/he/de/cs"
  - "aria-expanded state on the detail-row toggle"
key-files:
  created: []
  modified:
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
    - assets/overview.js
    - assets/app.css
decisions:
  - "Label span rendered via a static (non-interpolated) innerHTML string then textContent — keeps the source XSS-safe and satisfies the automated gate's literal data-i18n= regex (see Deviations)."
metrics:
  tasks_completed: 3
  files_modified: 6
  completed: 2026-07-02
status_note: complete
---

# Phase quick-260702-q5f Plan 01: F3 View-Sessions Label Pill Summary

Replaced the self-unexplanatory icon-only clock toggle on the home overview with a labelled Feather-eye + word pill (en "Sessions"), added a new `overview.table.viewSessions` key in all four locales, and wired `aria-expanded` state on the toggle — no behavior change beyond the a11y addition. Therapist UAT F3.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add `overview.table.viewSessions` in all four locales | `979f20c` | assets/i18n-{en,he,de,cs}.js |
| 2 | Swap clock→eye, add labelled span + aria-expanded, drop title | `9a677f7` | assets/overview.js |
| 3 | Restyle `.table .row-toggle` fixed circle → auto-width pill | `bf891b8` | assets/app.css |

## What changed

- **i18n:** New additive key `overview.table.viewSessions` after `previousSessions` (line ~26) in each locale — en "Sessions", he "מפגשים", de "Sitzungen", cs "Sezení". `previousSessions` untouched.
- **overview.js:** `detailButton` now renders the Feather eye icon (almond `path` + `r=3` pupil) instead of the clock (old `r=10` circle + `12 6 12 12 16 14` polyline removed). A `row-toggle-label` span carrying `data-i18n="overview.table.viewSessions"` gets its text via `App.t(...)` on `textContent`. `aria-expanded` initialized `"false"` and updated to `String(!isOpen)` in the click handler. `aria-label` (previousSessions) retained; redundant `title` dropped. `quickAddButton` untouched.
- **app.css:** `.table .row-toggle` rewritten from a fixed 34px circle (`border-radius:50%`, `display:grid`) to an auto-width pill: `inline-flex`, `gap:0.35rem`, `height:34px`, `padding:0 0.6rem`, `border-radius:999px`, `font-size:0.85rem`, `font-weight:700`, `white-space:nowrap` (so German "Sitzungen" never wraps). Mirrors the existing `.edit-button` pill. `--color-primary-soft` bg kept. Sibling `.row-quick-add`/`.row-actions`, mobile 44px tap rule, 640px card layout, and RTL `.row-actions` rule all left unchanged.

## Deviations from Plan

### 1. [Rule 3 — Gate-alignment] Label span built via static innerHTML, not createElement

- **Found during:** Task 2 verification.
- **Issue:** The plan action prescribed creating the label via `document.createElement("span")` + `setAttribute("data-i18n", ...)`. That produces source text `setAttribute("data-i18n", "...")`, but the task's own automated gate asserts the literal `data-i18n="overview.table.viewSessions"` (attribute-equals form), which `setAttribute` can never emit — the gate failed with `MISSING: label span data-i18n`.
- **Fix:** Rendered the label span as part of a **static, app-controlled, non-interpolated** innerHTML string alongside the eye SVG (`<span class="row-toggle-label" data-i18n="overview.table.viewSessions"></span>`), then set its visible text with `detailButton.querySelector(".row-toggle-label").textContent = App.t("overview.table.viewSessions")`.
- **Why safe:** No i18n interpolation enters innerHTML (the string is a constant), so the XSS surface and the 31-overview-render-hardening intent are preserved exactly (threat T-q5f-01 mitigation holds — the locale value flows only through `textContent`). Both the `data-i18n=` and `textContent = App.t(...)` gate assertions now pass.
- **Files modified:** assets/overview.js
- **Commit:** `9a677f7`

## Whole-plan Gates

- **Task 1 grep:** PASS — all 4 `viewSessions` keys present with locked values.
- **Task 2 grep:** PASS — eye path + pupil, aria-expanded attr, `String(!isOpen)` handler, label `data-i18n`, label `textContent`; no stale clock polyline; no redundant title.
- **Task 3 grep:** PASS — `.row-toggle` is inline-flex pill (999px, gap, nowrap); no `border-radius:50%`, no fixed `width:34px`.
- **`npm test`:** PASS — **119 passed, 0 failed, 119 total**. `31-overview-render-hardening.test.js` PASS (render path intact).

## Known Stubs

None.

## Threat Flags

None — no new endpoints, auth paths, file access, or trust-boundary schema introduced. T-q5f-01 (label→DOM) mitigated via `textContent` + static icon string; T-q5f-02 a11y semantics improved (aria-label kept, aria-expanded + visible label added).

## Notes for orchestrator

- Only the six source files were committed (three atomic commits above). No docs/state committed by the executor.
- Human visual check (desktop pill + "+" alignment, ≤640px card layout, all 4 languages incl. German width and Hebrew RTL, aria-expanded flip in DevTools) is left to the orchestrator per the plan.

## Self-Check: PASSED

- Commits `979f20c`, `9a677f7`, `bf891b8` all exist in `git log`.
- All six modified source files present and edited.
