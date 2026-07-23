---
phase: 47-session-section-reordering
plan: 09
subsystem: export-clipboard-and-severity-placement
status: complete
tags: [export, clipboard, severity, pdf-placement, saved-order, unrated, three-way-invariant]
requires:
  - App.getSectionOrder / App.flattenOrderKeys (47-01)
  - App.isSectionEnabled('afterSeverity') (47-01/47-03)
  - orderedFormKeys / emotionsBlockIncluded / severityBlockIncluded / getIssuesPayload (47-05)
  - export.section.topics / session.copy.scale.* i18n keys (47-02)
provides:
  - "deriveSeverityAfterSections(orderedKeys, presentKeys) — pure edit-aware ordinal helper"
  - "parsePresentSectionKeys(orderedKeys, markdown) — saved-order ∩ parsed editor headings"
  - "order-driven + gated + unrated-safe clipboard buildSessionMarkdown"
affects:
  - assets/export-modal.js
tech-stack:
  added: []
  patterns:
    - "pure module-scope ordinal helper exposed via the __exportModalTestHooks seam"
    - "present-section derivation parsed from the EDITED editor text (not the build-time emission list)"
    - "strict typeof === 'number' rating gate so a null side never string-concatenates or NaN-subtracts"
key-files:
  created:
    - tests/47-severity-position.test.js
  modified:
    - assets/export-modal.js
    - tests/47-severity-unrated.test.js
decisions:
  - "The clipboard severity ratings stay attached to the topic names in the Session-topics section (there is no structural bar block in a text copy); the afterSeverity slot emits no heading in the copy, mirroring the filtered builder."
  - "A topic with an unrated (non-numeric) side copies as its NAME ONLY — the whole rating line is dropped, not just the unrated side, so the single-line copy format can never carry a dangling half-rating or a NaN change."
  - "pdf-export.js was NOT modified: the drawSeverityBlock render loop already consumes any severityAfterSections >= 0; only the input ordinal path (in export-modal.js) changed."
metrics:
  duration: ~35min
  completed: 2026-07-23
  tasks: 2
  files: 3
---

# Phase 47 Plan 09: Clipboard Copy + Edit-Aware Severity Placement Summary

Completes the export rewrite 47-05 began, on the same file in a later wave (the
two export-modal.js executors never ran concurrently). The PDF severity block now
lands at an edit-aware saved-order slot, and the clipboard-copy builder reads the
same saved order with the same topics/severity gating — an unrated topic copies
as its name only, with no NaN change line ever reaching the clipboard.

## What Was Built

**Task 1 — edit-aware severity-block placement (`713a6c4`)**
- Added the pure module-scope `deriveSeverityAfterSections(orderedKeys, presentKeys)`:
  the count of PRESENT sections preceding the `afterSeverity` slot in saved order;
  `presentKeys.length` when the slot is absent (block at end). Exposed via the
  module `__exportModalTestHooks` seam (alongside `deriveSessionOrdinal`).
- Added the closure helper `parsePresentSectionKeys(orderedKeys, markdown)` —
  scans the edited Step-2 text for `## <label>` heading lines (matched against the
  same `stripRequired(getSectionLabel(...))` strings the builders emit) and keeps
  saved order (saved order ∩ parsed editor headings). The `afterSeverity` slot
  never emits a heading, so it is never present.
- Replaced the old heart-shield-label 0/1 match in `buildRenderInputs` with
  `deriveSeverityAfterSections(orderedFormKeys(), parsePresentSectionKeys(...))`.
  Deleting a preceding heading in Step 2 now shifts the block up one slot; moving
  severity in Settings moves the block. The 47-05 PDF-input `issues` filter is
  untouched.
- **`pdf-export.js` is unchanged** — the `drawSeverityBlock` loop already inserts
  the block when `sectionHeadingsSeen === severityAfterSections`; only the input
  number path (in export-modal.js) changed. The Phase-23 Hebrew bidi pipeline is
  untouched.
- New pure-fn test `tests/47-severity-position.test.js` (9 cases: slot-first → 0,
  N-preceding → N, slot-absent → length, preceding-but-not-present not counted,
  present-after-slot not counted, the edit-awareness delete case, defensive
  non-array inputs).

**Task 2 — order-driven, gated, unrated-safe clipboard builder (`8ba3682`)**
- Rewrote `buildSessionMarkdown` to iterate `orderedFormKeys()` (the same
  page-pinned saved-order source the filtered builder reads) via a per-key switch,
  replacing the hardcoded section sequence. Group names never appear; each section
  is gated on its own content presence.
- The Session-topics slot honours the same gating as the filtered builder:
  `emotionsBlockIncluded()` (topics selected) gates the section;
  `severityBlockIncluded()` (switch + topics + sub-option) gates the rating text.
  With severity included, a fully-rated topic keeps its `before/after/change`
  line; with severity excluded, topic names copy alone.
- Replaced the `issue.before !== null` guards with strict `typeof === "number"`
  checks: a topic with an unrated side emits its name only — a null side can never
  be string-interpolated into a rating line nor subtracted into a NaN change. The
  `afterSeverity` slot emits no heading in the copy.
- Extended `tests/47-severity-unrated.test.js` (6 → 9 cases) with three clipboard
  cases: (h) unrated topic copies name-only with no rating line and no NaN;
  (i) a mutated saved order reorders the copied sections (comments → trapped →
  issues); (j) severity switch off → topic names copy with zero rating lines.

## Key Symbols (for the 47-08 docs pass)

| Symbol | Kind | Notes |
|--------|------|-------|
| `deriveSeverityAfterSections(orderedKeys, presentKeys)` | pure fn | saved-order ordinal of the severity slot among present sections |
| `parsePresentSectionKeys(orderedKeys, markdown)` | closure fn | saved order ∩ `## <label>` headings in the edited text |
| `buildSessionMarkdown()` | closure fn | clipboard copy — saved-order emission, `emotionsBlockIncluded`/`severityBlockIncluded` gating, name-only for unrated topics |

## Deviations from Plan

None — plan executed as written. Note: `assets/pdf-export.js` is listed in the
plan's `files_modified`, but no edit was needed there — the render loop already
consumes the forwarded ordinal unchanged (the plan's own action text confirms the
loop stays untouched). This is documented, not a silent omission.

## Verification

- `node tests/47-severity-position.test.js` — 9/9
- `node tests/47-severity-unrated.test.js` — 9/9 (6 PDF-payload + 3 clipboard)
- Severity PDF regression: `34-severity-bars` 3/3, `34-severity-unmeasured` 2/2,
  `quick-260702-bg4-pdf-severity-long-name-wrap` 7/7
- Export regression: `30-export-markdown` 5/5, `45-pdf-note-headings` 8/8,
  `46.1-export-lifecycle` 7/7, `45-copy-share-verbatim` 6/6,
  `export-heartwall-wording` 5/5, `export-emotions-optout` 5/5
- `npm test` full suite — **218 passed, 0 failed**
- Grep asserts: `buildSessionMarkdown` reaches saved order via `orderedFormKeys`
  (no hardcoded order array remains); the `drawSeverityBlock` insertion condition
  string is intact; `pdf-export.js` has no diff in this plan.
- Comment hygiene: no planning IDs in the `assets/export-modal.js` diff or the
  test additions (grep sweep).

## Manual Gate (before /gsd-verify-work)

Real-device / real-PDF: export a session with severity moved to a non-default
slot → the block appears at that slot; delete a preceding section heading in Step
2 → the block moves up one slot; Hebrew RTL PDF still correct. Clipboard copy of a
session with an unrated topic verified clean (name only, no NaN); a mutated saved
order reorders the copied sections.

## Known Stubs

None.

## Threat Flags

None. No new trust boundary — the clipboard builder reads the already-sanitized
`App.getSectionOrder()` snapshot and the strict numeric checks narrow (never
widen) what reaches the copied document; the severity-placement ordinal is derived
from the same editor text already being exported.

## Commits

- `713a6c4` — feat(47-09): edit-aware saved-order ordinal for the PDF severity block
- `8ba3682` — feat(47-09): saved-order, gated, unrated-safe clipboard copy builder

## Self-Check: PASSED
