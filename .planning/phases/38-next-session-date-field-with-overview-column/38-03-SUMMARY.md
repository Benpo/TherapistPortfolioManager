---
phase: 38
plan: 03
subsystem: i18n
tags: [i18n, localization, next-session, rtl]
requires: []
provides:
  - "i18n key: overview.table.nextSession (EN/HE/DE/CS)"
  - "i18n key: overview.table.nextSession.overdue (EN/HE/DE/CS)"
  - "i18n key: overview.filter.sort.nextSession (EN/HE/DE/CS)"
  - "i18n key: session.form.nextSessionDate (EN/HE/DE/CS)"
affects:
  - "Plan 38-04 (form field label #nextSessionDate)"
  - "Plan 38-05 (overview column header, sort option, overdue aria-label)"
tech-stack:
  added: []
  patterns:
    - "Flat dot-namespaced i18n key map, one JS object literal per language file"
    - "New keys placed adjacent to their mirror family member (lastSession / nextSession)"
key-files:
  created: []
  modified:
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "session.form.nextSessionDate placed after session.form.nextSession.placeholder to keep the whole nextSession family contiguous (still adjacent to its mirror family; satisfies D-07)"
  - "overview.table.nextSession.overdue grouped immediately after overview.table.nextSession within the overview.table.* family (D-04)"
  - "No placeholder/(optional) hint key added for the date field (MEMORY feedback-optional-fields-no-hints)"
metrics:
  duration: "~4 min"
  completed: 2026-07-07
  tasks: 1
  files: 4
status: complete
---

# Phase 38 Plan 03: Next-Session i18n Keys Summary

Added the four next-session i18n keys (`overview.table.nextSession`, `overview.table.nextSession.overdue`, `overview.filter.sort.nextSession`, `session.form.nextSessionDate`) to all four language files (EN/HE/DE/CS) with the exact UI-SPEC copywriting-contract values, each placed adjacent to its existing mirror family, preserving the 4-language key-parity invariant.

## What Was Built

16 key additions total — 4 keys × 4 language files. Each file received:

| Key | EN | HE (RTL) | DE | CS |
|-----|----|----|----|----|
| `overview.table.nextSession` | Next Session | מפגש הבא | Nächste Sitzung | Příští sezení |
| `overview.table.nextSession.overdue` | Overdue | באיחור | Überfällig | Po termínu |
| `overview.filter.sort.nextSession` | Next Session | מפגש הבא | Nächste Sitzung | Příští sezení |
| `session.form.nextSessionDate` | Next session date | תאריך המפגש הבא | Datum der nächsten Sitzung | Datum příštího sezení |

Placement per file:
- `overview.table.nextSession` + `.overdue` → immediately after `overview.table.lastSession` (line ~22).
- `overview.filter.sort.nextSession` → immediately after `overview.filter.sort.lastSession` (line ~50).
- `session.form.nextSessionDate` → immediately after the `session.form.nextSession` family (after its `.placeholder` sub-key, ~line 136), keeping the nextSession family contiguous.

Each file's existing quoting/trailing-comma style (2-space indent, double quotes, trailing comma) was matched exactly.

## Verification

- Plan verify loop (all 4 keys present in all 4 files): **OK**.
- `node --check` on each of the four files: **all parse** with no syntax error.
- Per-file new-key count: **4 each** (EN/HE/DE/CS) — parity holds, no key present in one file and missing in another.
- Hebrew overdue value is a real translated word (`באיחור`), not empty/color-only — supports the WCAG 1.4.1 accessible-name requirement for the downstream overdue marker.
- No `(optional)` / placeholder hint key added for the date field.

## Deviations from Plan

None — plan executed exactly as written. The one judgment call (placing `session.form.nextSessionDate` after the `.placeholder` sub-key rather than between `session.form.nextSession` and its placeholder) keeps the nextSession family contiguous and still satisfies the "adjacent to its mirror key" requirement (D-07). Not a behavioral deviation.

## Known Stubs

None. These keys are static config consumed downstream by Plans 38-04 (form label) and 38-05 (column header, sort option, overdue aria-label). They resolve to real translated strings now; the consuming markup that references them by name lands in the Wave 2 plans, as designed by the wave split.

## Self-Check: PASSED

- FOUND: assets/i18n-en.js, i18n-he.js, i18n-de.js, i18n-cs.js (all 4 keys, node --check OK)
- FOUND: commit f6a7cc3 (feat(38-03): add next-session i18n keys across EN/HE/DE/CS)
