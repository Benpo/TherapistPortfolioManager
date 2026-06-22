---
plan: 22-13
title: Settings success-pill regression + revert-button affordance
created: 2026-05-11
source: UAT round-3 findings (2026-05-07) — see 22-HUMAN-UAT.md
parent_phase: 22
discuss_phase_skipped: true
discuss_phase_skipped_reason: Gaps well-scoped, decisions captured inline with user 2026-05-11
---

# 22-13 Context

## Scope (2 gaps)

### Gap 1 — Settings "saved" pill regression (round-3 finding, major)

**Symptom:** The green "Settings saved" success pill appears the FIRST time the user clicks Save on the Settings page, but does NOT reappear on subsequent saves in the same session.

**Suspected root cause:** The pill's leaving/fade-out timeout is not cancelled when a new save fires before the previous timeout completes. The state machine sees "pill is currently in leaving state" and silently no-ops the second show.

**Source files to investigate:**
- `assets/settings.js` — pill show/dismiss state machine (added in plan 22-10, commit `0b342ec`)
- `assets/settings.html` — pill markup
- `assets/app.css` — pill animation / transition timing

**UAT truth (must be TRUE after fix):**
> The 'Settings saved' success pill appears AFTER EVERY successful Save in the same Settings page session — not just the first one — and remains visible long enough to be noticed.

### Gap 2 — Revert button on Settings rows not self-explanatory (round-3 finding, minor)

**Symptom:** Each Settings page row has a Revert button (icon-only). First-time users cannot tell what it does without clicking it.

**Source files to investigate:**
- `assets/settings.html` — row template / per-row action buttons
- `assets/settings.js` — i18n key bindings for row controls
- `assets/i18n-{en,de,he,cs}.js` — add the new label string

**UAT truth (must be TRUE after fix):**
> The Revert button on each Settings page row is self-explanatory at first glance — the user can tell what it does without trial-and-error.

---

## Decisions (resolved with user, 2026-05-11)

### Decision 1 — Revert button affordance
**Choice:** Add a **text label** in/near the Revert column, visible at all times (not a hover-only tooltip, not a confirm dialog).
**Rationale:** Tooltips don't work on mobile/touch — Ben specifically wanted something visible at first glance. Confirm dialog would be overkill for a low-stakes action.
**Implementation hint:** Label text "Revert" (or its i18n equivalents) shown alongside or below the icon. Must work across en/de/he/cs and respect RTL.

### Decision 2 — Success-pill fix scope
**Choice:** **Fix the bug AND slightly increase the visible duration.**
**Current duration:** 6 seconds (per plan 22-10).
**New duration:** Slight bump — Ben said "increase slightly". Planner should propose 8 seconds (the middle option offered) unless implementation reveals a better number. NOT 10s — that's intrusive.
**Rationale:** Fixing the bug alone solves the regression. Bumping the timer marginally addresses the secondary "easy to miss" concern without making the pill feel sticky.

---

## Non-goals (explicitly NOT in 22-13)

- Other round-3 findings (N1, N2, N3, N6, N7, N9, N10, N11, N12) — those go in their own batched plans (22-14 through 22-17, plus phase 23 for PDF).
- Reworking the pill's visual design — only state-machine + duration adjustments.
- Touching the static "About saved settings" info banner — different element, not in scope.

---

## References

- `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-HUMAN-UAT.md` — canonical UAT (search for the two truth statements above to see full round-3 context)
- `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-10-settings-page-ux-fixes-PLAN.md` + `-SUMMARY.md` — where the original success-pill was introduced (commit `0b342ec`)
- `.claude/context/session-prompts/2026-05-07_phase22-round3-handoff.md` — round-3 handoff doc

---

## Risk

**Low.** Both fixes touch a single page (Settings), no cross-cutting concerns. Pill regression is a state-machine bug isolated to `settings.js`. Revert label is an i18n + markup addition.

The only watch-out is the **i18n-files serialization constraint** from round 2 (Ben's note in the handoff) — if 22-13 is later parallelized with 22-14, the planner must sequence any i18n-file edits to avoid merge conflicts. For 22-13 alone, this is not a concern.
