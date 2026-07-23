---
phase: 47-session-section-reordering
plan: 11
subsystem: docs-content-he-terminology-and-whats-new
status: complete
tags: [changelog, help-content, i18n, hebrew, terminology, gap-closure, content-only]
requires:
  - 47-05 / 47-09 export delta (topics/severity split, unrated omission) — the factual basis for the corrected 1.5.0 export line
  - shipped שדות terminology (settings.tab.fields "שמות שדות מותאמים", tour title "התאמת שמות השדות")
provides:
  - "native שדות-based Hebrew across the new Phase-47 help + i18n session-section copy"
  - "restructured, accurate 1.5.0 changelog in all four locales (no 1.4.0 contradiction, no minor-feature bullet)"
affects:
  - assets/help-content-he.js
  - assets/i18n-he.js
  - assets/changelog-content-en.js
  - assets/changelog-content-he.js
  - assets/changelog-content-de.js
  - assets/changelog-content-cs.js
tech-stack:
  added: []
  patterns:
    - "EN corpus-of-record rewritten first, then mirrored natively into HE/DE/CS (not mechanical translation)"
    - "terminology aligned to the shipped UI word (שדות), replacing מקטע only where it denotes reorderable session fields"
key-files:
  created: []
  modified:
    - assets/help-content-he.js
    - assets/i18n-he.js
    - assets/changelog-content-en.js
    - assets/changelog-content-he.js
    - assets/changelog-content-de.js
    - assets/changelog-content-cs.js
decisions:
  - "help-content-en.js left UNTOUCHED — the What's-New restructure required no EN help wording change, and the docs-gate raises no help demand here (i18n-he is changelog-only tier; content files are satisfiers). Only the changelog demand is raised, satisfied by the changelog-content-en.js edit."
  - "Aligned the note-writing topic's מקטע (help-content-he line 195) to שדה — its מקטע refers to the same reorderable session sections, so the guidance's 'unless' clause brings it in scope; leaving it would reintroduce the exact inconsistency G5 flags."
  - "Left מקטע untouched in help-document-navigation labels (help.chrome.jumpToSection, help.chrome.ariaSections) and in settings-tab/panel section references (snippets/session-formats/backup-export-heading) — there מקטע means a doc/settings section, not a reorderable session field."
metrics:
  duration: ~10min
  completed: 2026-07-23
  tasks: 2
  files: 6
---

# Phase 47 Plan 11: HE Terminology + What's-New Restructure Summary

A content-only pass closing G5 and G6 from 47-UAT.md. The new Phase-47 Hebrew help
and i18n copy now describes the reorderable session sections as שדות (the word the
shipped UI already uses) instead of מקטע, with per-sentence native grammar; and the
1.5.0 changelog was restructured across all four locales — the minor Reset bullet is
gone and the export line now states the real 1.5.0 delta instead of re-announcing the
1.4.0 export-ratings feature. No code files were touched.

## What Was Built

**Task 1 — G5: align Hebrew session-section copy to שדות (`9142f93`)**
- `help-content-he.js`: rewrote the reorder / enable-disable / rename help topic
  (titles + bodies + notes), the severity turn-off topic, the single-export and
  export-formats topics, the backup-restore note, and the note-writing topic so the
  reorderable session sections read as שדות. Reworded the renaming topic's opener
  from "במקטע {ui:settings.tab.fields}" to the more native "בלשונית …", and smoothed
  the up/down-arrow phrasing ("חצי המעלה והמורידה" → "חצים למעלה ולמטה").
- `i18n-he.js`: aligned the Phase-47 session-section keys — `settings.row.afterSeverity.info`
  ("קטע הסיכום" → "שדה הסיכום"), `settings.rename.tooLong` ("שם המקטע" → "שם השדה"),
  and the guided-tour bodies `help.tour.step.fields.body` (מקטעים → שדות) and
  `help.tour.step.heart.body` (מקטע → שדה, ×2) so the tour body matches its own שדות
  title.
- The reorder aria labels (`settings.reorder.dragHandle/moveUp/moveDown.aria`) already
  use a `{section}` name placeholder — no literal מקטע — so they needed no change.

**Task 2 — G6: restructure the 1.5.0 changelog, EN first (`4eda604`)**
- `changelog-content-en.js`: dropped the "Reset order and Reset names" bullet from
  `categories.new`; rewrote the improved export line. Old: "Exports let you include
  your session topics with or without the severity ratings" (re-announced 1.4.0's
  "Choose whether an export includes the before-and-after emotion ratings"). New:
  "Session topics are now their own choice in an export, with the before-and-after
  ratings as a linked sub-option beneath them — offered whenever the app's severity
  ratings are switched on." This states the genuine 1.5.0 delta (topics independent;
  severity a dependent sub-option following the app-level switch) per 47-05/47-09.
- `changelog-content-he.js`: mirrored the corrected EN, dropped the reset bullet, and
  applied G5 שדות phrasing to the 1.5.0 entry (lede, reorder highlight, reorder `new`
  bullet), plus the native export-delta line.
- `changelog-content-de.js` / `-cs.js`: dropped the reset bullet and rewrote the
  export line to the same delta, natively (Sie form / formal register).
- Version, anchor and date on the 1.5.0 entry are unchanged (FINAL).

## The 1.5.0-vs-1.4.0 export delta (stated precisely)

1.4.0 already shipped a single choice: "Choose whether an export includes the
before-and-after emotion ratings." In 1.5.0 the export model changed:
- **Session topics** became a selectable export section in their own right, independent
  of the ratings.
- The **severity include-option** became a *dependent* sub-choice under topics, offered
  only while the app-level Issue-severity switch is on.
- **Unrated topics** are omitted from exports (and from session-history / overview reads)
  automatically — a topic shows its name only.

The corrected export line in every locale describes this, and no sentence re-announces
the 1.4.0 feature.

## Deviations from Plan

None — plan executed as written. Note: `help-content-en.js` is listed in the plan's
`files_modified` as an option only; it was left untouched because the restructure
required no EN help wording change (documented above and sanctioned by the plan's
plan_specific_notes).

## Docs-gate note

Verified against `scripts/lib/role-table.js`: this push raises the push-global
**changelog** demand (via `i18n-he.js`, a changelog-only-tier file) and **no** per-file
help demand (the content files are satisfiers; i18n is help-exempt). The changelog
demand is satisfied by the `changelog-content-en.js` EN edit. So the docs-gate is
satisfied without an EN help edit.

## Verification

- `node --check` — all six edited files pass.
- `node tests/changelog-integrity.test.js` — 10/10.
- `node tests/changelog-integrity-locale.test.js` — 36/36 (category-key sets still
  byte-identical to EN across HE/DE/CS after the dropped bullet + rewrites).
- i18n parity: `25-11-i18n-parity`, `40-i18n-parity`, `41-tour-i18n-parity`,
  `42-i18n-parity`, `33-i18n-de-cs-completion` — all pass (value-only edits, no key
  add/remove).
- help integrity: `help-integrity`, `help-integrity-locale`, `39-help-entry`,
  `39-help-render` — all pass.
- Residual מקטע audit: only the intentionally-excluded occurrences remain —
  help-content-he lines 89/107/426 (settings-tab / backup-panel section refs) and
  i18n-he `help.chrome.jumpToSection` / `help.chrome.ariaSections` (help-doc navigation).
- Comment hygiene: no ORDR-/D-/G-/R-/47- tokens or "Phase 47" in any diff.

## Human Gate (the real content quality gate)

Ben / Sapir read the rendered HE help center + guided-tour steps (session sections read
as native שדות, no residual מקטע for the reorderable-sections concept, topic structure
unchanged) and the /changelog 1.5.0 entry in all four locales (no Reset bullet; export
line describes the topics/severity split and does not restate the 1.4.0 ratings feature;
HE reads native). Content quality is not machine-verifiable — this review is the gate.

## Known Stubs

None.

## Threat Flags

None. Static content/data strings only; no new trust boundary, no user input, no
package install, no new execution surface.

## Commits

- `9142f93` — docs(47-11): align Hebrew session-section help + i18n copy to שדות terminology
- `4eda604` — docs(47-11): restructure the 1.5.0 changelog around headline changes (four locales)

## Self-Check: PASSED

- Files modified: help-content-he.js, i18n-he.js, changelog-content-{en,he,de,cs}.js — all committed.
- Commits 9142f93, 4eda604 — both present in git log.
- help-content-en.js intentionally NOT modified (documented decision).
