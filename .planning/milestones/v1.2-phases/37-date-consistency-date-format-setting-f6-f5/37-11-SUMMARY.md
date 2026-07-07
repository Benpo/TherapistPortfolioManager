---
phase: 37-date-consistency-date-format-setting-f6-f5
plan: 11
subsystem: i18n + design-system
tags: [terminology, i18n, css, rtl, heart-wall, session-format, demo-seed]
requires:
  - 37-08 (wave-5 predecessor)
provides:
  - "Heart-Wall / חומת הלב single heart term across all i18n surfaces (4 langs)"
  - "Session Format / אופן הטיפול modality axis label (EN/HE; DE/CS unchanged term)"
  - "filter.sessionFormat / .all / .count new i18n keys (all 4 bundles)"
  - "overview.filter.heartShield + sessions.filter.type repurposed as Heart-Wall toggle labels"
  - "CSS: .multi-select* checkbox dropdown, .filter-toggle, th.sortable + aria-sort, .sort-arrow (RTL-aware)"
affects:
  - "Plans 37-13 / 37-14 / 37-15 consume the new i18n keys + CSS class names verbatim"
tech-stack:
  added: []
  patterns:
    - "i18n value-only relabel (key names hard-fenced)"
    - "logical-property RTL (inset-inline / padding-inline), no left/right"
    - "caller-side {count} interpolation (applyTranslations does none)"
key-files:
  created: []
  modified:
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
    - assets/app.css
    - add-session.html
    - reporting.html
    - sessions.html
    - assets/demo-seed-data.json
decisions:
  - "session.copy.type relabeled off the collision term (Rule 2) — Table C under-listed it but acceptance grep==0 + must_haves truth #1 require the copy modality surface too"
  - "settings.sessionTypes.* (F4 type editor from 37-06) left untouched — separate feature, not enumerated in this plan's tables"
  - "demo-seed bare 'shield' anaphora kept — plan scoped exactly the 9 'Heart Shield' compound hits (Ben-approved)"
metrics:
  duration: 11min
  completed: 2026-07-05
  tasks: 4
  files: 9
status: complete
---

# Phase 37 Plan 11: Terminology Relabel + Shared i18n/CSS Foundation Summary

Retired the "Heart Shield" term to **Heart-Wall / חומת הלב** and the modality axis to **Session Format / אופן הטיפול** across all four i18n bundles (values only, key names hard-fenced), front-loaded the new Session Format filter keys + Heart-Wall toggle labels + the reusable checkbox-dropdown / filter-toggle / sortable-header CSS for Plans 37-13/14/15, and relabeled the public demo's clinical prose to match — all with zero data migration and zero PDF golden regeneration.

## What Was Built

**Task 1 — Heart-term relabel (Tables A + B) · commit `8f945f9`**
- 14 heart-status keys (Table A) + 2 repurposed dropdown labels (Table B) relabeled per language across `i18n-{en,he,de,cs}.js`: Heart-Wall (EN/DE/CS), חומת הלב (HE).
- Retired every retired heart token — EN `Heart Shield`, DE `Herzschutz`/`Heart-Shield`, CS `Ochrana srdce`/`Heart Shield`, and the inconsistent HE variants `מגננת לב` / `הגנת הלב` → one HE term `חומת הלב`.
- Updated shipped HTML fallback text on the **surviving** surfaces only: `reporting.html` (heart-cleared stat), `add-session.html` (accordion header, toggle label, emotions label, shieldRemoved question), `sessions.html` (Heart-Wall column header). The doomed filter-bar dropdown option in `sessions.html` (line 71) was intentionally left untouched — Plans 37-13/14 remove it next wave.

**Task 2 — Modality axis relabel (Table C) + new filter keys (Table D) · commit `5dc33fd`**
- `session.form.sessionType` + `sessions.table.type` → Session Format (EN) / אופן הטיפול (HE); DE (`Sitzungsart`/`Typ`) + CS (`Typ sezení`/`Typ`) already the axis term, unchanged.
- `session.copy.type` copy-surface label also retired off the collision term (EN `Session Format:`, HE `אופן הטיפול:`, DE `Sitzungstyp:`→`Sitzungsart:`; CS already `Typ sezení:`) — see Deviations.
- Added `filter.sessionFormat` / `.all` / `.count` to all 4 bundles (identical key sets, 560 keys each). `{count}` is caller-side-interpolated per `applyTranslations` (no interpolation in the loader).
- `add-session.html` sessionType label fallback → Session Format.

**Task 3 — Reusable filter/sort CSS · commit `4721744`**
- Appended `.multi-select` / `.multi-select-toggle` / `.multi-select-panel` / `.multi-select-option` (Session Format checkbox dropdown mirroring the `.select-modern` pill + chevron), `.filter-toggle` (filter-field variant hosting the reused `.toggle-switch` inline), and `.table th.sortable` + `th[aria-sort=…]` state rules + `.sort-arrow`.
- RTL-aware via logical properties (`inset-inline-start`, `padding-inline`, `inline-size`/`block-size`), tokens only, no new scale, no existing selector modified. The Heart-Wall toggle reuses the existing `.toggle-switch`/`.toggle-slider` (not redefined). Dead-but-valid until Waves 7-8.

**Task 4 — Demo-seed prose relabel · commit `8ed9ef7`**
- 9 "Heart Shield" prose hits (insights/customerSummary/comments) → "Heart-Wall", grammar preserved; data fields `isHeartShield`/`shieldRemoved`/`sessionType` and all keys byte-identical (prose-only 9/9 diff). JSON parses; `tests/35-demo-seed.test.js` green.

## Verification

- All four plan verify node scripts exit 0: heart tokens retired in i18n ×4; `filter.sessionFormat` keys present ×4 + RTL-aware CSS classes present; demo prose relabeled + JSON valid.
- `grep -c "Session Type" assets/i18n-en.js` = **0**; `grep -ci "heart shield" assets/demo-seed-data.json` = **0**.
- All 4 bundles parse and carry **identical key sets** (560 keys each).
- `npm test`: **121 passed / 3 failed** — the 3 failures are ONLY the intentionally-RED 37-10 filter/sort spec files (`37-overview-filters`, `37-overview-sort`, `37-sessions-filters`), unchanged from the pre-plan baseline. No new failure; no `.pdf.sha256` baseline touched; `assets/pdf-export.js` and golden fixtures untouched.

## Deviations from Plan

### Auto-fixed / scope-completed

**1. [Rule 2 - missing critical functionality] `session.copy.type` relabeled off the collision term**
- **Found during:** Task 2.
- **Issue:** Table C enumerated only `session.form.sessionType` + `sessions.table.type`, but `session.copy.type` (the copy-to-clipboard "Session Type:" summary label) still read the retired collision term. The Task 2 acceptance (`grep -c "Session Type" en.js` == 0) and must_haves truth #1 ("no i18n surface reads the modality collision label") both require the copy surface too.
- **Fix:** EN `Session Type:`→`Session Format:`, HE `סוג מפגש:`→`אופן הטיפול:`, DE `Sitzungstyp:`→`Sitzungsart:` (the DE axis term). CS was already `Typ sezení:` (correct).
- **Files modified:** `assets/i18n-{en,he,de}.js`. **Commit:** `5dc33fd`.

## Known Residuals (out of this plan's enumerated scope)

- **`settings.sessionTypes.*`** (the F4 "Session types" editor built in 37-06) still uses `Sitzungstyp`/`Sitzungstypen` (DE) and the placeholder `סוג מפגש חדש` (HE, "New session type"). This is the *value-list editor*, a distinct surface from the modality **axis label**, and is not enumerated in this plan's tables. Flagged for the verifier: not a truth-#1 violation (truth #1 targets the axis label surfaces — form/table/filter/copy — all covered), but a future terminology pass may want to align the editor heading. No action taken here to respect the plan's fences.
- **demo-seed bare "shield"** anaphora ("the shield is thinning", "the shield is now fully removed") intentionally kept — the plan scoped exactly the 9 "Heart Shield" compound hits (Ben-approved 2026-07-05); the bare references read naturally as anaphora for the just-named Heart-Wall.

## Authentication Gates

None.

## Self-Check: PASSED
- All 9 modified files present on disk.
- All 4 task commits present in git history: `8f945f9`, `5dc33fd`, `4721744`, `8ed9ef7`.
