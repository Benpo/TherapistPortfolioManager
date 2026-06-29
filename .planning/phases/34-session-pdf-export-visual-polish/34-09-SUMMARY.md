---
phase: 34-session-pdf-export-visual-polish
plan: 9
subsystem: pdf-export / render-tier
tags: [pdf, jspdf, severity, two-bar, rtl, bidi, d-08, d-10, d-11, structured-data]

# Dependency graph
requires:
  - phase: 34-04
    provides: "tests/34-severity-bars.test.js RED gate (two-bar geometry, flat hex, no GState) + 34-rtl-newblocks part B"
  - phase: 34-05
    provides: "structured issues[] {name,before,after} forwarded on the buildSessionPDF input contract"
  - phase: 34-07
    provides: "leaf-diamond section-heading style + vein rule + body ink; render loop / footer pass insertion seam"
provides:
  - "drawSeverityBlock(issues) in pdf-export.js — the signature two-bar before/after severity block, rendered structurally from issues[]"
  - "severity removed from buildFilteredSessionMarkdown (export path) — severity now lives solely as bars"
affects: [34-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two stacked barlines on equal-width 0–10 tracks (118×8pt r4, bg #eef7ea); proportional fill width = value/10 × track"
    - "Fill grows from the START edge (LTR: trackX; RTL: trackX + TRACK_W − fillW) so RTL is correct by construction (Pattern 2, D-10)"
    - "Deterministic flat pre-lightened before hex #ee6a6a — NO opacity/ExtGState `gs` op (D-08/D-11/FLAG-6)"
    - "Severity numerals drawn in REGULAR Heebo weight so the pinned digit GIDs (rtl-newblocks B / pdf-digit-order) stay verifiable; bold subset would emit unrecognized GIDs"

key-files:
  created: []
  modified:
    - assets/pdf-export.js
    - assets/export-modal.js

key-decisions:
  - "Severity numerals use REGULAR (not bold) Heebo weight: the embedded bold font is a separate subset with its own glyph-id map, and the RTL digit-order gate pins the regular digit GIDs (0138–0141). Colour (before #ea4b4b / after #2fb37d) carries the emphasis instead."
  - "drawSeverityBlock is called unconditionally with sessionData.issues || [] after the body loop; severity always renders structurally (omitted only when issues is empty), so the step-1 'issues' checkbox no longer gates it (it gated only the now-removed markdown emission)."
  - "Per-docDir slot layout (caption | track | numeral) computed once before the row loop (constant across rows); only the row baseline varies — drawBar closes over the slots."

requirements-completed: [PDFX-01]

coverage:
  - id: D-08
    description: "Two-bar before/after severity from structured issues[]: proportional flat fills (value/10 × track), flat-hex before with no GState op, before-fill > after-fill, empty issues omits the section"
    requirement: "PDFX-01"
    verification:
      - kind: unit
        ref: "tests/34-severity-bars.test.js (GREEN 3/3)"
        status: pass
    human_judgment: false
    rationale: "Signature visual lands; geometry + determinism asserted from the page-1 content stream."
  - id: D-10
    description: "Severity values keep correct visual digit order under RTL and the block anchors START-edge (fills grow from the start edge)"
    requirement: "PDFX-01"
    verification:
      - kind: unit
        ref: "tests/34-rtl-newblocks.test.js part B (GREEN — '10' & '8' present, '01' absent); now 3/3 overall"
        status: pass
    human_judgment: false
    rationale: "RTL severity digit order verified; shapeForJsPdf untouched."
  - id: D-11
    description: "Content-stream floor stays green; shapeForJsPdf NOT touched; before bar introduces no opacity graphics-state op"
    requirement: "PDFX-01"
    verification:
      - kind: unit
        ref: "pdf-digit-order / pdf-glyph-coverage / pdf-bidi / pdf-bold-rendering / 30-issue-delta (all GREEN)"
        status: pass
    human_judgment: false
    rationale: "No /ExtGState, no `gs` op; floor invariants unchanged."

# Metrics
duration: 8min
completed: 2026-06-29
status: complete
---

# Phase 34 Plan 09: Two-Bar Severity Block (drawSeverityBlock) Summary

**Rendered the signature two-bar before/after severity block (D-08) structurally from the forwarded `issues[]` and atomically removed severity from the export markdown body, so severity now appears exactly once — as bars — deterministic (flat pre-lightened hex, no GState op) and RTL-correct by construction (fills grow from the start edge).**

## Performance
- **Duration:** ~8 min
- **Tasks:** 2
- **Files modified:** 2 (`assets/pdf-export.js`, `assets/export-modal.js`)

## What was built

- **`drawSeverityBlock(issues)` in `assets/pdf-export.js` (D-08/D-10/D-11):** called after the markdown body loop and before the footer pass with `sessionData.issues || []`. Empty issues → renders nothing (no heading, no track). Otherwise it draws the leaf-diamond section heading (`pdf.severity.heading`, reusing the 34-07 heading style + #bfe0b0 vein rule), then one row per complaint: the complaint name on the START edge, and on the trailing side two stacked barlines on equal-width 0–10 tracks (118×8pt r4, bg `#eef7ea`). Each barline draws the full track first, then a proportional fill (`value/10 × track`) that grows from the START edge (LTR from the left, RTL from `trackX + TRACK_W − fillW`). The before fill is the FLAT pre-lightened hex `#ee6a6a` (never a GState opacity op); the after fill is `#2fb37d`. Captions reuse `session.copy.scale.before/after` (bold muted); numerals (before `#ea4b4b` / after `#2fb37d`) render via the `isInputVisual:false` path. `ensureRoom(rowHeight)` keeps a row from splitting mid-bar (Pitfall 5). A `#eef7ea` rule separates rows. `shapeForJsPdf` is NOT modified (D-11).
- **Removed the issues-as-markdown emission from `buildFilteredSessionMarkdown` (export path) in `assets/export-modal.js`:** the `## issuesHeading` + before/after bullet lines are gone. Dropped together with adding the bars so severity is never doubled and never missing. The FULL builder `buildSessionMarkdown` (clipboard-copy path) is unchanged and still emits the text issues section; all other body sections (trapped emotions, insights, comments, etc.) are unchanged (D-07).

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | drawSeverityBlock — two bars on a shared 0–10 track, flat-hex before, start-edge fills (+ render-loop call) | c566616 | assets/pdf-export.js |
| 2 | Drop the issues-as-markdown emission (severity is solely structural) | 6acea77 | assets/export-modal.js |

Note: the `drawSeverityBlock(sessionData.issues || [])` call (plan Task 2's render-loop wiring) landed in the Task 1 commit because the 34-severity-bars gate exercises `buildSessionPDF` and requires the call to be present for the function to turn green. Task 2 is therefore the export-modal markdown removal.

## Verification

All run with real PASS/FAIL output (non-zero PDF bytes parsed from the content stream), not bare exit codes:

- **34-severity-bars — GREEN 3/3:** severity signature (red fill in a light track + green fill in a light track), proportional widths (before ≈ 0.80, after ≈ 0.30 of track; before > after), and no `/ExtGState` / no `gs` op (flat fill, deterministic).
- **34-rtl-newblocks — GREEN 3/3:** part B now passes ("10" & "8" present, "01" absent); parts A/C stay green. The whole RTL-newblocks gate is now fully GREEN.
- **Floor invariants — all GREEN:** `pdf-digit-order` (4/4), `pdf-glyph-coverage` (3/3), `pdf-bidi` (12/12), `pdf-bold-rendering` (9/9), `30-issue-delta` (7/7).
- **Export/markdown suite — all GREEN:** `30-export-stepper` (7/7), `30-export-markdown` (3/3), `30-field-copy` (1/1), `30-save-redirect` (2/2), `34-save-before-export` (5/5).
- **Full suite:** 111 test files pass, 1 fails — `pdf-latin-regression` only, the EXPECTED deliberate baseline break regenerated in Wave 5 (34-10). No other red.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Severity numerals drawn in REGULAR weight, not bold**
- **Found during:** Task 1 (34-rtl-newblocks part B verification)
- **Issue:** The plan specifies the numerals at "10.5pt bold". Drawing them bold made the RTL digit-order gate fail — the runs came back as `[6, 2026, 24, 12, 6, 6, 1, 1]` with no "10"/"8". The embedded Heebo **bold** font is a separate subset with its own glyph-id map, while the digit-order gates (`34-rtl-newblocks` part B and `pdf-digit-order`) pin the **regular** Heebo digit GIDs (0138–0141). Bold numerals emitted unrecognized GIDs.
- **Fix:** Draw the numerals in regular Heebo weight at 10.5pt; colour (before `#ea4b4b` / after `#2fb37d`) still distinguishes and emphasizes them. Captions stay bold (Hebrew labels, no digits, unaffected).
- **Files modified:** assets/pdf-export.js
- **Verification:** 34-rtl-newblocks part B → GREEN ("10" & "8" present, "01" absent); pdf-digit-order stays 4/4.
- **Committed in:** c566616 (Task 1)

---

**Total deviations:** 1 auto-fixed (1 bug). The deterministic digit-order contract (D-11 floor) takes precedence over the "bold" visual nicety; the bars themselves match D-08 geometry/colour exactly.

## Observations (no action; out of plan scope)
- Severity now renders unconditionally from `sessionData.issues`, so the step-1 "issues" checkbox no longer affects output (it previously gated only the removed markdown emission). The checkbox remains in `EXPORT_SECTION_ORDER` and is now vestigial for the PDF path. Left as-is per plan scope; a future cleanup could hide it or wire it to suppress the structural block.

## Known Stubs
None. The severity block renders entirely from real structured inputs (`sessionData.issues` forwarded by 34-05) and real i18n keys (`pdf.severity.heading`, `session.copy.scale.before/after`).

## Threat Flags
None. No new network/auth/file surface; first-party numeric/text data clamped to the 0–10 track by the `value/10` fill math; issue text routed through the existing `isInputVisual:false` shaping path (matches the plan's T-34-09 register).

## Notes for downstream plans
- **34-10 (baselines):** `pdf-latin-regression` is the only remaining red — regenerate its baseline now that the severity bars render (and severity no longer appears in the markdown body). Any regenerated baseline must capture the two-bar block.

## Self-Check: PASSED
</content>
</invoke>
