---
phase: 41-replayable-guided-tour
plan: 13
subsystem: verification-e2e-signoff
tags: [tour, uat, verification, human-verify, storyline, gap-closure, signoff]
status: complete
requires: ["41-08", "41-09", "41-10", "41-11", "41-12", "41-14"]
provides:
  - "Human EN storyline sign-off on the remediated v3 tour (Ben, 2026-07-09) — closes the failed 41-UAT.md loop"
  - "Green end-to-end gate: jsdom 153/153 + WebKit RTL/geometry/scroll probe (6 sections) on the final tour"
affects: []
decisions:
  - "Sign-off is EN-based per Ben's directive: he approved the English storyline + mechanism; the Hebrew review + any final EN wording tweaks are deferred to Phase 42.1 (inline, no planning). HE/DE/CS ship as machine-draft (D-11) — the tour is functional in all four locales now; native pass is 42.1."
  - "Two Round-2 replay cycles were folded in before sign-off: 41-14 (R2-1 scroll/box + R2-4 real export icon + R2-5 Help-first finish), then a scroll-to-page-top correction (Ben: scroll-to-top gives orientation — you see which settings tab you're in — vs the initial box-clamp-only). The interactive-tour ideas (R2-2/R2-3) were rejected — D-07 stands, the page is inert during the tour."
metrics:
  duration: n/a
  completed: 2026-07-09
  tasks: 2
  files: 0
---

# Phase 41 Plan 13: End-to-End Gap-Closure Verification — Sign-Off Summary

The replayable guided tour is delivered and **human-verified**. After the Round-1 UAT failure (8 gaps) was remediated by 41-08…41-12 (geometry/RTL, 12-anchor v3, 12-step STEPS[], v3 copy, 3-item "?" menu) and the Round-2 replay findings were closed by 41-14 + the scroll-to-top correction, Ben replayed the full 12-step v3 tour in English and **approved** (2026-07-09): the storyline reads coherently, the step box always stays on screen, and each step scrolls to the top so the user keeps their orientation. This closes the 41-UAT.md loop that 41-07's original Safari checkpoint deferred here.

## What Was Verified

- **Task 1 — automated gate (GREEN):**
  - `node tests/run-all.js` → **153 passed, 0 failed, 153 total**
  - `node tests/webkit/41-rtl-geometry.mjs` → **all 6 sections PASS** in real WebKit: spotlight branch selection, on-anchor geometry, RTL physical-side (off-center, not mirrored), clean EN→HE→DE→CS re-render, post-settle geometry, and the R2-1 tall-anchor checks (step box fully in viewport + page scrolled to top, `scrollY ≤ 2`).
- **Task 2 — human EN storyline sign-off (APPROVED, Ben 2026-07-09):**
  - The settings-first 12-step arc reads coherently start to finish.
  - Long settings panels (Fields, Snippets) now land at the **top** — the tab bar is visible, so the user sees where they are (no mid-list drop; the earlier "wordless dim overlay" is gone).
  - Step 9 points at the app's **real 📤 export icon** with plain copy; step 12 leads with the **Help center** + a breadth tease.
  - The tour stays **non-interactive** (D-07) — advance with Next; no in-app clicking.

## Round-2 Remediation Folded In Before Sign-Off

| Finding | Fix | Where |
| --- | --- | --- |
| R2-1 tall settings panels bury the step box; user dropped mid-list | scroll page to TOP on step entry (orientation) + tooltip viewport clamp; below-fold controls (heart/save) centered | 41-14 + `fix(41-14)` scroll-to-top correction |
| R2-4 fake monochrome export glyph | real 📤 (U+1F4E4) via textContent; plain "Export button up top" copy | 41-14 |
| R2-5 finish step Reporting-first | Help-center-first + breadth tease | 41-14 |
| R2-2 interactive/clickable spotlight · R2-3 click-to-advance | **REJECTED** (Ben + Sapir) — D-07 stands, page inert | not built |

## Deferred (by decision, not a gap)

- **Hebrew review + final EN wording tweaks → Phase 42.1** (inline; Ben supplies final texts). HE/DE/CS ship as machine-draft (D-11). The tour is fully functional in all four locales today.

## Deviations from Plan

- Task 2 was signed off on **EN only** (HE deferred to 42.1) rather than "EN + HE" as the plan's acceptance line read — per Ben's explicit sequencing ("share the Hebrew after the English is finalized"). The EN storyline coherence — the acceptance bar Ben set — is met.

## Self-Check: PASSED

- `41-13` automated gate re-run GREEN after 41-14 — VERIFIED (153/153 + WebKit 6/6)
- Ben's EN sign-off ("approved", 2026-07-09) — RECORDED
- Round-2 fixes (41-14 + scroll-to-top) present in `assets/tour.js` — VERIFIED
- HE native pass routed to Phase 42.1 — RECORDED
