# Phase 41: Replayable Guided Tour - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-08
**Phase:** 41-replayable-guided-tour
**Areas discussed:** Tour route & step content, Tooltip chrome, Navigation & resume semantics, Language scope & wiring, Browser compatibility (Ben-added)

---

## Tour route & step content

| Option | Description | Selected |
|--------|-------------|----------|
| Full spine, 8 steps | Overview → add-client → start-session → form → Sessions → Reporting → Backup → "?"/finish | ✓ (then expanded) |
| Core loop only, ~6 steps | Session loop only, no backup/help | |
| Sketch 003's 6 steps as-is | Reuse the sketch's demo route | |

**User's choice:** Full spine; then chose "2–3 sub-steps on the form" over a single form step, landing on 3 zones (setup → heart → save), total 10 steps.
**Notes:** Save step must also mention export (can't demo it on an empty app — name it and even show the colored export icon). "~10 is fine" over trimming to 9.

| Anchors | Chrome-only (✓) / Mixed data-aware / Mixed fallback-is-fine |
| Copy depth | Title + 1–2 sentences ≤~40 words (✓) / One sentence / 2–4 sentences |

---

## Tooltip chrome (sketch 003 Variant B)

| Option | Description | Selected |
|--------|-------------|----------|
| Tethered tooltip + arrow | Hugs the element, pointing arrow | ✓ |
| Floating card + connector line | Detached calm card + thin line | |
| Bottom-sheet | Fixed sheet at bottom | ✓ (mobile only) |

**User's choice:** First answered "can't decide without mockup" → sketch 003 opened live in browser → picked tethered + arrow for desktop; bottom-sheet on small screens.

---

## Navigation & resume semantics

| Cross-page | Auto-navigate on Next (✓) / Announce-then-Next / User navigates manually |
| Page lock | Inert during tour (✓) / Spotlighted element clickable |
| Mid-tour close | Free-text: offer "Remind me later" / "I'll explore myself", phrased concisely |
| "Remind me later" mechanics | Coordinator nudge next session, low precedence (✓) / Phrasing only / Re-arm welcome |
| Relaunch | Always restart (✓) / Offer to resume / Silently resume |
| Finish | Free-text: finish card with help-center link PLUS "Add your first client" / "First session" buttons |

---

## Language scope & wiring

| Tour copy locales | All 4 locales in this phase (✓) / EN now, rest in 42.1 |
| Demo mode | No tour in demo (✓) / Tour works in demo |

---

## Browser compatibility (Ben-added area)

| Compat bar | Safari-first full matrix / Chrome-first, Safari spot-check (✓) |
| Legacy | Modern evergreen (✓) / Explicit graceful no-op guard |

**Notes:** Chrome-first collided with TOUR-04's locked "real WebKit, not jsdom" wording; Ben approved the reconciliation — Chromium dev loop + Playwright-WebKit verification gate for RTL/spotlight geometry + one real-Safari UAT pass.

---

## Claude's Discretion

Engine module name/shape, storage key names, reminder-surface precedence slot, anchor mechanism + anchor-presence test shape, bottom-sheet breakpoint, spotlight animation, "?" menu position, form-zone scroll behavior.

## Deferred Ideas

- Tour inside demo mode (marketing idea for landing-page prospects).
