---
quick_id: 260703-mp6
slug: phase37-mainpage-selects-df-label
phase_ref: 37
status: complete
date: 2026-07-03
commits:
  - 89510fe  # feat(37) E1 main-page modern-select styling
  - 7b67670  # fix(37)  E2 date-format neutral sample label
---

# Quick Task 260703-mp6 — SUMMARY

Scoped Phase 37 extension (handoff `2026-07-03_phase37-extend-mainpage-dropdowns-datepicker.md`).
**Phase 37 remains PENDING** — Ben runs `/gsd-verify-work 37` after Sapir's translation review.

## E1 — main-page controls adopt the shipped modern-select style — `feat(37)` 89510fe
Reused the already-built `.select-modern` / `.input-pill` classes (`app.css:1041`) via the
same dual-class pattern already live on `#dateFormatSelect` / `#scheduleFrequencySelect` /
`#sessionDate`. **Zero new CSS.**
- `index.html`: `#clientTypeFilter`, `#clientHeartShieldFilter`, `#clientYearFilter`, `#clientSortSelect` → `select-field select-modern`.
- `sessions.html`: `#sessionClientFilter`, `#sessionTypeFilter` → `select-field select-modern`; `#sessionDateFrom`, `#sessionDateTo` → `input input-pill`.
- Left plain (intentional): add-client `#clientReferralSource`, add-session `#editClientReferralSource`.
- **Visual verification:** isolated-markup renders against the real `app.css` in headless Chrome — LTR, Hebrew RTL (chevron flips left, bar mirrors), and 500px mobile (clean vertical wrap, content-width pills, no overflow). No layout regression. Live in-app render is deferred to Ben's UAT (both pages sit behind a Terms/license gate that a static render can't reach).

## E2 — date-format picker shows a neutral sample date, not a near-today one — `fix(37)` 7b67670
`assets/settings.js` `REFERENCE_DATE` `"2026-07-02"` → `"2000-01-31"` (neutral, unambiguous:
day 31 > 12, day/month/year all distinct). Picker labels now read `Jan 31, 2000` / `31 Jan 2000`
/ `01/31/2000` / `31/01/2000` / `2000-01-31` (HE: Hebrew month names + LTR-isolated numerics).
**SEAM preserved** — labels still come from `window.DateFormat.format`, never hand-typed; option
values unchanged; `auto` keeps its static i18n label. Comment expanded to explain the WHY.
- **Test:** added `loadDateEngine` opt to `buildSettingsEnv` (evals `date-format.js` before
  `settings.js`, mirroring live script order) + a regression guard asserting labels reflect the
  neutral sample (contain `2000`, never `2026`, and are engine output not the raw placeholder).
  End-of-file count guard 17 → 18.

## Tests
`npm test` → **121 files passed, 0 failed** (personalization file 18/18, up from 17). Baseline preserved.

## Constraints honored
Atomic `feat(37)` + `fix(37)` commits, hooks ON (no `--no-verify`). No ROADMAP/REQUIREMENTS/completion
changes. Phase 37 stays PENDING. No-innerHTML contract untouched (class attrs + one constant + a test only).
