---
phase: 46-rich-text-toolbar-editor
round: gap-closure-2
reviewed: 2026-07-15
scope: [46-15-PLAN.md, 46-16-PLAN.md]
verdict: SOUND WITH CONDITIONS (both lenses; no blockers)
---

# Architect-Soundness Review — Phase 46 gap round 2

Two independent lenses reviewed the round-2 plans against real source (app.css,
rich-toolbar.js, export-modal.js, add-session.html, role-table.js, git range)
after the plan-checker passed. Both returned SOUND WITH CONDITIONS, zero
blockers. Conditions were folded back into the plans before execution (floor
640px + dual vh/dvh declaration, second short-viewport probe pass + German
locale pass, non-vacuous scroll-pin precondition, NOT-list for the untouched
Step-2 chrome, gate items 12f-h).

## Lens A — CSS mechanism soundness (verified on real source)

- Cap math `min(floor, 90dvh)` is provably viewport-safe: floor is always ≤ the
  .modal-card 90vh/90dvh max-height, so the card never exceeds the viewport at
  any height (568px-1080px checked); maximize (90dvh) and the ≤768px 100dvh
  takeover always win. 50dvh governs on tall screens — ratified 50% look kept.
- `flex-shrink: 0` targets the true root cause: `.rich-toolbar`'s
  `overflow-y: hidden` gives it an automatic min size of 0, so default
  flex-shrink collapsed it to a clipped sliver in the squeezed column.
- Sticky pin is canonical: the persistent bar is a direct child of
  `.export-edit-area` (docked beforebegin #exportEditor), which is the sole
  overflowing scroller; the `min-block-size: 0` chain above it
  (.modal-card-body → .export-step.is-active → .export-edit-area,
  app.css ~1725/~3380/~3386) is intact and is a LOAD-BEARING INVARIANT —
  removing any link silently breaks the pin.
- z-index/popover interplay safe (bar clipped to the edit area; fixed-position
  menus unaffected); RTL safe (inset-block-start is block-axis).
- Known cosmetic residual: the bar's 8px margin-block-end is a transparent
  strip content scrolls under — eyeballed at the 46-16 gate (item 12h), fixed
  only if it reads poorly.
- Probe honesty: maximize assertion (D) is a regression guard, not RED
  evidence — RED rests on the unclipped-toolbar / editor-floor / scroll-pin
  assertions.

## Lens B — product intent + regression surface (verified on real artifacts)

- Gap 11 closed completely at every viewport; the fix cannot leak to the 7
  note-field focus-attached toolbars (selectors scoped under .export-card,
  which the session form never matches) — matching the export-only ratified
  requirement.
- Ratified round-1 behavior survives: 50% default on tall screens, maximize
  90dvh, ≤768px takeover, Steps 1/3 card size, other .modal-card modals.
- 46-16 carries all 11 round-2 gate items verbatim from 46-14 plus item 12
  (gap 10/11 checks); nothing dropped or weakened.
- All five process constraints verified true: comment-hygiene clause present;
  app.css is CHANGELOG-ONLY tier per role-table.js (no help trailer needed);
  changelog demand satisfied by 8cd345e in the unpushed range (re-verify range
  at push time); APP_VERSION untouched; no new shipped assets → no sw.js edit.
- Surfaced deferral (now an explicit NOT-list in 46-15): Step-2 chrome (info
  note, indicator, title, actions) intentionally unchanged this round; on wide
  desktop windows shorter than ~640px content height the editor stays
  constrained (toolbar still visible/pinned) — accepted residual.
