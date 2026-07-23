---
phase: 47-session-section-reordering
plan: 05
subsystem: export-order-and-severity-split
status: complete
tags: [export, section-order, severity, pdf-payload, markdown, three-way-invariant]
requires:
  - App.getSectionOrder / App.flattenOrderKeys (47-01)
  - App.isSectionEnabled('afterSeverity') (47-01/47-03)
  - export.section.topics / export.suboption.includeSeverity i18n keys (47-02)
  - add-session form pins the page order snapshot at open (47-04)
provides:
  - "order-driven buildFilteredSessionMarkdown (one saved-order source)"
  - "orderedFormKeys() — the single export order reader (with default fallback)"
  - "Step-1 topics main checkbox (data-section-key='issues') + dependent severity sub-option (#exportIncludeSeverity)"
  - "severityBlockIncluded() gate (switch + topics + sub-option)"
  - "buildRenderInputs PDF-payload unrated filter (>=1 numeric rating)"
affects:
  - assets/export-modal.js
tech-stack:
  added: []
  patterns:
    - "single flattened saved-order source read by every export consumer"
    - "dependent sub-option coupled to a parent checkbox, default restored on re-check"
    - "output-gating at the render-input assembly site (filter the payload, leave the render loop untouched)"
key-files:
  created:
    - tests/47-severity-unrated.test.js
  modified:
    - assets/export-modal.js
    - tests/30-export-markdown.test.js
    - tests/export-emotions-optout.test.js
decisions:
  - "emotionsBlockIncluded() left unchanged (topics-selected predicate, still read by the clipboard buildSessionMarkdown owned by 47-09); a NEW severityBlockIncluded() carries the switch+sub-option gate for the PDF payload only — keeps the clipboard-builder gating change inside 47-09's boundary."
  - "A DEFAULT_FLAT_ORDER fallback mirrors the app default and is used only when App.getSectionOrder/flattenOrderKeys are absent (minimal test hosts); production always reads the saved order, so the fallback never diverges."
metrics:
  duration: ~45min
  completed: 2026-07-23
  tasks: 2
  files: 4
---

# Phase 47 Plan 05: Order-Driven Export + Topics/Severity Split Summary

The export modal's filtered builder, Step-1 list, and document-section labels now
read section order from ONE saved-order source (the page-pinned snapshot the form
captured), the export offers topics with a dependent severity sub-option, and the
PDF severity payload drops fully-unrated topics so an all-unrated set omits the
block entirely. The three-way invariant (form == Step-1 == export) holds against a
mutated order.

## What Was Built

**Task 1 — order-driven emission (`1a57964`)**
- Removed the static `EXPORT_SECTION_ORDER` array; added `orderedFormKeys()` — the
  one reader that returns `App.flattenOrderKeys(App.getSectionOrder())` (with a
  `DEFAULT_FLAT_ORDER` fallback for minimal test hosts).
- Rewrote `buildFilteredSessionMarkdown` to iterate the saved order: for each
  selected + non-empty key it emits `## label` + body via the existing per-key
  readers. The `issues` slot emits a **Session-topics** section listing the topic
  NAMES only (ratings stay PDF-structural); the `afterSeverity` slot emits no
  markdown; group names never leak.
- Repointed `buildDocumentSectionLabels` and `exportRenderStep1Rows` to
  `orderedFormKeys()`; the Step-1 topics row is named via `export.section.topics`
  (identical to the in-session title); the `afterSeverity` key renders no Step-1
  row. Added the `afterSeverity` case to `exportDefaultI18nKey`.
- Rewrote `tests/30-export-markdown.test.js` to assert the three-way invariant
  against a MUTATED (non-default) saved order.

**Task 2 — topics/severity split + unrated omission (`20b1807`)**
- Added the dependent **Include severity before/after** sub-option
  (`#exportIncludeSeverity`) beneath the topics row: enabled only while topics is
  checked, offered only while `App.isSectionEnabled('afterSeverity')` is on,
  default checked when issue data exists, and restored to that data-derived
  default on topics re-check (never the last manual state).
- Added `severityBlockIncluded()` (switch + topics selected + sub-option checked)
  and captured `_exportState.includeSeverity` alongside the section selection.
- Applied the unrated filter at the single `buildRenderInputs` issues-assembly
  site: keep a topic only when `typeof before === "number" || typeof after ===
  "number"`. Fully-unrated topics drop out; a partially-rated topic keeps its row;
  an all-unrated set yields an empty payload so the block is omitted via the
  existing empty-array early-return. `pdf-export.js` drawSeverityBlock is untouched.
- Created `tests/47-severity-unrated.test.js` (7 cases: sub-option gating,
  mix/partial/all-unrated filtering, switch-off, re-check default).

## Handoff for 47-09 (same file, wave 3)

- Step-1 selectors: topics main checkbox `#exportStep1Rows input[data-section-key="issues"]`;
  severity sub-option `#exportIncludeSeverity` (indented `.export-suboption-row`).
- Severity gating hook: `severityBlockIncluded()` (reads `severityTrackingEnabled()`
  = `App.isSectionEnabled('afterSeverity')`, `_exportState.selectedKeys`,
  `_exportState.includeSeverity`).
- Unrated filter site: the `buildRenderInputs` `issues` assembly (the `.filter(...)`
  keeping `typeof before/after === "number"`).
- Still owned by 47-09: the clipboard `buildSessionMarkdown` rewrite + its
  severity gate, the edit-aware severity-block PLACEMENT ordinal
  (`deriveSeverityAfterSections`), and `pdf-export.js` placement.
- `emotionsBlockIncluded()` is deliberately unchanged (still the topics-selected
  predicate the clipboard builder reads).

## Deviations from Plan

**1. [Rule 3 — blocking] Updated `tests/export-emotions-optout.test.js` (not in the plan's file list)**
- **Found during:** Task 1 (label change) and Task 2 (unrated filter).
- **Issue:** That test guarded the pre-split single "emotions before/after"
  checkbox — it asserted the row label `export.section.emotions` (Task 1 renames
  it to `export.section.topics`) and expected an unrated topic to forward to the
  PDF payload (Task 2's D-21 filter drops it). Both are behaviors this plan
  intentionally supersedes, so the test blocked the "full suite green" gate.
- **Fix:** Retargeted case 1 to `export.section.topics` and gave the harness's
  severity pair a dataset round-trip so the seeded topic reads as RATED (surviving
  the new filter), preserving the "left checked forwards issues" intent. Case 5
  (i18n parity for the still-present `export.section.emotions` key) is unchanged.
- **Files:** tests/export-emotions-optout.test.js. **Commits:** 1a57964, 20b1807.

**2. [interpretation] Split the severity gate into a new `severityBlockIncluded()` rather than mutating `emotionsBlockIncluded()`**
- The plan says "update emotionsBlockIncluded … so severity is included only when
  topics AND sub-option AND switch." `emotionsBlockIncluded()` is also read by the
  clipboard `buildSessionMarkdown`, whose severity gate is explicitly 47-09's
  scope. Folding the sub-option/switch into it now would change the clipboard path
  early. A new `severityBlockIncluded()` carries the full gate for the PDF payload
  only; the clipboard gate lands cleanly in 47-09.

## Verification

- `node tests/30-export-markdown.test.js` — 5/5 (three-way invariant vs mutated order)
- `node tests/47-severity-unrated.test.js` — 6/6 (a/b/c/d/f/g; case list covers the
  D-21 filter, sub-option gating, switch-off, re-check default)
- `node tests/export-emotions-optout.test.js` — 5/5
- `grep -c 'EXPORT_SECTION_ORDER' assets/export-modal.js` → 0
- `npm test` — **215 passed, 0 failed** (esp. 34-severity-unmeasured, 45-pdf-note-headings,
  45-copy-share-verbatim, 46.1-export-lifecycle, 30-export-stepper, 47-form-order)
- Comment hygiene: no planning IDs in the `assets/export-modal.js` diff (grep sweep).

## Manual Gate (before /gsd-verify-work)

Real-device / real-PDF: topics-without-severity (topic-name section present, no
rating lines) in an opened PDF and `.md`; a session with a fully-unrated topic
exports with NO empty bar row and NO dash; an all-unrated session omits the
severity block entirely; with the Issue-severity switch off, an OLD rated session
exports no bars. (Severity-block PLACEMENT at a moved slot + the clipboard clean-
unrated case verify in 47-09.)

## Known Stubs

None. The clipboard builder + severity-block placement are intentionally deferred
to 47-09 (documented in the plan objective), not stubbed here.

## Threat Flags

None. No new trust boundary — order reads the already-sanitized
`App.getSectionOrder()`; the PDF payload filter narrows (never widens) the data
forwarded to the existing renderer.

## Commits

- `1a57964` — feat(47-05): order-driven export emission across the filtered builder, Step-1 list, and document labels
- `20b1807` — feat(47-05): topics/severity split with dependent sub-option and unrated-topic omission

## Self-Check: PASSED

- Files created: tests/47-severity-unrated.test.js — present.
- Files modified: assets/export-modal.js, tests/30-export-markdown.test.js, tests/export-emotions-optout.test.js — committed.
- Commits 1a57964, 20b1807 — both present in git log.
