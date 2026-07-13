---
phase: 45-rich-text-rendering-export-foundation
plan: 06
subsystem: rich-text-rendering
tags: [uat, real-device, pdf, hebrew-rtl, backup-round-trip, human-verify, checkpoint]

# Dependency graph
requires:
  - phase: 45-05
    provides: "RTXT-10 encrypted-backup round-trip + cross-pipeline D-08 agreement + all automated tests green (183/183)"
provides:
  - "Real-device / real-PDF confirmation that the rich-text rendering foundation is visually correct — the milestone-locked human gate PASSED"
  - "ROADMAP success criteria 1, 2, 4 satisfied on real surfaces (installed-Safari read mode, real Hebrew PDF, real .sgbackup restore)"
  - "Two on-device UAT gap rounds surfaced and closed (45-07, 45-08) before approval; full suite 183/183"
affects: [46-rich-text-toolbar-editor, 47-session-section-reordering, 48-mobile-pass-validation-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Milestone-locked verification gate: jsdom-green is not proof — a real opened PDF + a real installed-PWA + a real-device backup restore are the acceptance surfaces (this repo has shipped false-GREEN jsdom PDF tests before)"

key-files:
  created:
    - .planning/phases/45-rich-text-rendering-export-foundation/45-06-SUMMARY.md
  modified: []

key-decisions:
  - "Human-verify gate PASSED — Ben approved 2026-07-14 after iterative real-device verification across builds a33d8dc → 207036c → 5ce1f46"
  - "Three consciously-accepted behaviors were presented up front and NOT contested: export-modal preview ≠ PDF note-heading register (NOTE 7); D-09 legacy meaning-preserving upgrade; renamed-document-heading demotion (45-03 limitation 2)"
  - "Second-backup-import popup bug ruled OUT of Phase 45 scope — pre-existing, backup.js/settings.js git-untouched this phase; filed as v1.4 ship-blocker todo (resolves_phase 48)"

patterns-established:
  - "Real-PDF artifact capture: a genuine openable PDF generated through production buildSessionPDF (real vendored jsPDF + Heebo + bidi + logo) is the acceptance evidence, retained at .claude/context/2026-07-13_phase45-verify-hebrew.pdf"

requirements-completed: [RTXT-06, RTXT-07, RTXT-10]

coverage:
  - id: D1
    description: "Real opened Hebrew PDF: bold preserved, numbered/bullet/nested/mixed-type lists correct with rightward RTL indentation, note headings subordinate & chrome-free vs branded document sections, severity block unshifted, italic at regular weight (accepted)"
    requirement: RTXT-07
    verification:
      - kind: manual_procedural
        ref: ".claude/context/2026-07-13_phase45-verify-hebrew.pdf (146KB, 2pp) — inspected by checkpoint agent AND by Ben (phone + Mac rounds)"
        status: pass
    human_judgment: true
    rationale: "PDF visual fidelity, Hebrew RTL direction, and note-heading subordination cannot be certified by jsdom; requires a human opening a real generated PDF"
  - id: D2
    description: "Installed-Safari PWA read mode (macOS + iPhone, pre-prod sg-prpr-98xxj34.pages.dev): bold, bullets L1-4, numbered, nested, mixed lists, headings, text-then-list, dark mode + RTL all legible and styled, never raw markers"
    requirement: RTXT-06
    verification:
      - kind: manual_procedural
        ref: "Ben on-device verification across builds a33d8dc → 207036c → 5ce1f46 (final approval on 5ce1f46 with editor-1:1 ordinal + type-flip screenshots)"
        status: pass
    human_judgment: true
    rationale: "Caret/render/RTL-visual/dark-mode behavior on an installed PWA is not observable in jsdom"
  - id: D3
    description: "Real-device encrypted .sgbackup round-trip: formatted notes byte-identical after restore, verified BOTH with passphrase (encrypted) and without"
    requirement: RTXT-10
    verification:
      - kind: manual_procedural
        ref: "Ben real-device export + restore, both encrypted and plain (RTXT-10)"
        status: pass
    human_judgment: true
    rationale: "A real-device backup export + restore cycle cannot be exercised in jsdom"

# Metrics
duration: 2 days (checkpoint open 2026-07-13 → approved 2026-07-14, spanning 2 on-device gap rounds)
completed: 2026-07-14
status: complete
---

# Phase 45 Plan 06: Real-Device / Real-PDF Phase Gate Summary

**The milestone-locked human-verify gate PASSED — Ben confirmed the rich-text rendering foundation is visually correct on all three real surfaces (installed-Safari read mode, a real opened Hebrew PDF, and a real-device encrypted `.sgbackup` restore), after two on-device UAT gap rounds (45-07, 45-08) closed four list-grammar corners.**

## Performance

- **Duration:** checkpoint open 2026-07-13T11:30Z → approved 2026-07-14 (iterative real-device verification spanning 2 gap rounds)
- **Tasks:** 1 (a single `checkpoint:human-verify` gate)
- **Files modified:** 0 source (verification-only plan)

## Accomplishments

- **Surface 2 — real Hebrew PDF (RTXT-07):** A genuine openable PDF was generated through the production `buildSessionPDF` path (real vendored jsPDF + Heebo + bidi + logo), retained at `/Users/ben/Claude-Code-Sandbox/.claude/context/2026-07-13_phase45-verify-hebrew.pdf` (146KB, 2pp). Verified: branded RTL title band; note headings (`#`, `##`) subordinate & chrome-free vs the branded document section (leaf-diamond + green rule) — the D-02/D-03 contrast; bold preserved; italic at regular weight (accepted limitation); numbered / bullet / nested / mixed-type lists correct with rightward RTL indentation; text-then-list; severity block unshifted. Inspected by the checkpoint agent AND by Ben (phone + Mac rounds).
- **Surface 1 — installed PWA read mode (RTXT-06), macOS + iPhone Safari, pre-prod `sg-prpr-98xxj34.pages.dev`:** bold, bullets L1-4, numbered, nested, mixed lists, headings, RTL + dark mode all verified by Ben across builds a33d8dc → 207036c → 5ce1f46 (final approval on 5ce1f46 with screenshot evidence of editor-1:1 ordinals + the type-flip fix).
- **Surface 3 — real-device encrypted backup (RTXT-10):** Ben exported + restored a `.sgbackup` BOTH with a passphrase (encrypted) and without — formatted notes byte-identical after restore.
- **D-09 legacy-note check:** covered-by-absence — Ben's real pre-v1.4 notes contain no marker-shaped lines; automated D-09 coverage stands.

## Task Commits

This plan changed no source. Its single task was a human-verify checkpoint; the closing metadata is committed with this SUMMARY.

1. **Task 1: Real-device / real-PDF phase gate** — no commit (verification-only; APPROVED by Ben 2026-07-14)

**Plan metadata:** committed with this SUMMARY + the resolved 45-UAT.md.

## The two gap rounds that ran during the open checkpoint

Ben's real-device stress-testing during the open checkpoint surfaced four list-grammar corners jsdom had not caught. Both rounds were fixed on renderer source, re-verified on-device by Ben, and are locked into the cross-pipeline agreement corpus. Full suite stayed 183/183.

- **45-07** (commits `3f3820c`..`207036c`): GAP-45-01 text-then-heading render split (`md-render.js`; PDF already correct) + GAP-45-02 marker-only lines consistent in both pipelines. Verified on-device on build 207036c.
- **45-08** (commits `6b36d17`..`5ce1f46`): GAP-45-03 same-depth marker-type flip starts a new sibling list (CommonMark) + GAP-45-04 ordered `<li value="N">` editor-1:1 ordinals (`md-render.js` only; `pdf-export.js` byte-unchanged). Verified on-device on build 5ce1f46 with screenshot evidence — the final approval build.

## Decisions Made

- **Gate PASSED.** Ben typed "approved" (2026-07-14) after all three real surfaces passed on the final build 5ce1f46. ROADMAP success criteria 1 (read mode), 2 (real Hebrew PDF), and 4 (real-device backup restore) are satisfied on real surfaces.
- **Three consciously-accepted behaviors presented up front, not contested:** (a) NOTE 7 — export-modal Step-2 preview shows a note `## heading` at its normal preview register while the PDF subordinates it (preview ≠ PDF is intended); (b) D-09 — a legacy pre-v1.4 note containing marker-shaped lines upgrades meaning-preservingly rather than rendering literal; (c) renamed-document-heading (45-03 documented limitation 2) — a document section heading renamed in the Step-2 editor so its text no longer matches a label re-classifies as a subordinate note heading in the PDF.

## Deviations from Plan

None — plan executed exactly as written. The single checkpoint task was resolved by human approval. The four list-grammar defects Ben found during the open checkpoint were routed to dedicated gap-closure plans (45-07, 45-08) per the plan's own `<done>` clause ("or defects are captured … and routed to /gsd-plan-phase --gaps"), not auto-fixed inside this verification-only plan.

## Issues Encountered

- **Out-of-scope finding — second-backup-import popup bug:** Ben observed that a second backup import silently fails (no confirm popup). Git-verified NOT a Phase 45 defect — `backup.js` and `settings.js` were untouched this phase; it is a pre-existing bug. Filed as v1.4 ship-blocker todo `2026-07-13-import-second-attempt-no-confirm-popup.md` (resolves_phase 48). A Phase 46 design-decisions todo was also filed (italic-PDF disclosure + heading indent).

## Next Phase Readiness

- Phase 45 rendering foundation is real-device-verified and ready for the verifier + phase completion (owned by the orchestrator).
- Phase 46 (Rich-Text Toolbar Editor) can build on a foundation now proven correct everywhere formatting is displayed — the plan's stated dependency ("formatting must render everywhere first") is satisfied.
- Two carry-forward todos are filed for later phases (second-import popup → Phase 48; italic-PDF + heading-indent design decisions → Phase 46).

## Self-Check

- FOUND: `/Users/ben/Claude-Code-Sandbox/.claude/context/2026-07-13_phase45-verify-hebrew.pdf` (146KB real PDF artifact)
- FOUND commits (gap rounds referenced): 3f3820c, 207036c, 6b36d17, 5ce1f46 (all in git log)
- No source commits claimed for this plan (verification-only) — nothing to falsify.

## Self-Check: PASSED

---
*Phase: 45-rich-text-rendering-export-foundation*
*Completed: 2026-07-14*
