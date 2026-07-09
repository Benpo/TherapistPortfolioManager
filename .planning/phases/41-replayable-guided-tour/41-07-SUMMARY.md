---
phase: 41-replayable-guided-tour
plan: 07
subsystem: verification-webkit-probe
tags: [tour, webkit, playwright, rtl, geometry, uat, verification, gap-closure]
status: complete
requires: ["41-05", "41-06"]
provides:
  - "tests/webkit/41-rtl-geometry.mjs — ad-hoc Playwright-WebKit RTL/geometry + spotlight-branch probe (D-14 gate, Task 1)"
  - "41-UAT.md gap findings — the 8 UAT gaps that seed the 41-08..41-12 gap-closure remediation"
affects:
  - tests/webkit/41-rtl-geometry.mjs
decisions:
  - "Task 2 (blocking real-Safari human-verify) closed by SUPERSESSION, not pass: the Safari UAT was executed, failed, and surfaced 8 gaps (41-UAT.md). Per Ben's directive (2026-07-09) the acceptance sign-off is re-homed to 41-13's replay on the remediated v3 (settings-first, 12-step) tour — NOT re-run against the old 10-step tour this plan described."
  - "close-out is the safe_resume_gate 'close out manually' path: Task 1 artifact delivered + committed; Task 2 verification carried forward to 41-13; plan removed from the incomplete set so the phase can converge on 41-13's single authoritative sign-off."
metrics:
  duration: n/a
  completed: 2026-07-09
  tasks: 2
  files: 1
---

# Phase 41 Plan 07: D-14 WebKit/Safari Verification Gate — Close-Out Summary

Delivered the Playwright-WebKit RTL/geometry + spotlight-branch probe (Task 1). Task 2 — the blocking real-Safari human-verify UAT — was executed against the shipped tour, **did not pass**, and surfaced eight UAT gaps recorded in `41-UAT.md`. Those gaps were the trigger for the `41-STORYLINE.md` v3 (settings-first, 12-step) recomposition and the 41-08 → 41-13 gap-closure plans. This plan is closed out by **supersession**: its acceptance sign-off is deferred to **41-13's end-to-end replay** on the remediated v3 tour (Ben's directive, 2026-07-09), rather than re-running Task 2's UAT against the old 10-step tour it was written for.

## What Was Built

- **`tests/webkit/41-rtl-geometry.mjs` (new, Task 1)** — ad-hoc Playwright-WebKit probe (committed `44bef3f`). Resolves `webkit` from the pinned `TPM_Docs/video-pipeline` Playwright install via `createRequire`/dynamic-import (architect-gate A6 — no package.json dep, no global), serves the repo over a local static server, and asserts: (1) the **spotlight BRANCH** is selected for a present+visible anchor — the branch jsdom cannot reach because `offsetParent` is hardcoded null (architect-gate A5); (2) spotlight/tooltip geometry overlaps the anchor and stays in-viewport; (3) the RTL tether-arrow flips to the mirrored inline side in Hebrew with a clean EN→HE→DE→CS re-render (Pitfall 2). Kept out of `tests/run-all.js` discovery (lives under `tests/webkit/`).

## Task 2 — Real-Safari UAT: Executed, Failed, Superseded

Task 2 was a `checkpoint:human-verify gate="blocking"` real-Safari sign-off covering 8 checks against the **old 10-step spine tour** (index → add-session → sessions → reporting). Ben ran that UAT. It **failed**, surfacing 8 gaps (see `41-UAT.md`), notably:

- the RTL BLOCKER — an off-center anchor's spotlight/tooltip mirrored to the wrong physical side in Hebrew (physical `getBoundingClientRect` coords written into logical `inset-inline-*`);
- first-paint spotlight offset + step-to-step jumpiness (`transition: all` animating from a 0×0 base);
- storyline coherence gaps — the 10-step route did not read as a sensible end-user story, prompting the Ben-approved **v3 settings-first 12-step** recomposition.

**Remediation (not re-run here):** 41-08 (geometry), 41-09 (12-anchor contract), 41-10 (12-step `STEPS[]` + tab-activation + export glyph), 41-11 (v3 copy, 4 locales), 41-12 ("?" menu trim). The **single authoritative sign-off** is 41-13's replay of the full 12-step v3 tour in EN + HE. Re-running Task 2's original checkpoint would verify the superseded tour, so it is intentionally NOT executed.

## Verification

- `node tests/webkit/41-rtl-geometry.mjs` — probe delivered and committed (`44bef3f`) under WebKit.
- Task 2 acceptance — **deferred to 41-13** (re-runnable end-to-end UAT on the remediated v3 tour). The phase is NOT marked complete on the strength of this plan; 41-13 carries the human sign-off.

## Deviations from Plan

- **Task 2 not executed as an executor checkpoint.** The original blocking human-verify was already run manually (outside this session), failed, and generated the gap-closure backlog. Rather than re-dispatching an executor that would re-hit an obsolete checkpoint against the old tour, the plan is closed out per the `safe_resume_gate` "close out manually" path and its verification re-homed to 41-13 (Ben's standing directive).

## Self-Check: PASSED

- `tests/webkit/41-rtl-geometry.mjs` — FOUND
- Commit `44bef3f` (WebKit probe, Task 1) — FOUND
- Commit `0371509` (recorded pause at blocking human-verify checkpoint) — FOUND
- `41-UAT.md` (8 gaps) + `41-STORYLINE.md` v3 — FOUND (drive 41-08..41-13)
- Task 2 sign-off re-homed to 41-13 — RECORDED
