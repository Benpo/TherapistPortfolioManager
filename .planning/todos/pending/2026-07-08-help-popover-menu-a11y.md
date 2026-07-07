---
created: 2026-07-08T00:45:00.000Z
title: "?" help popover — honor or drop the menu ARIA contract (WR-02) + review-info polish
area: accessibility
priority: low
recommended_entry: /gsd-quick or fold into a Phase 40 chrome plan
target_phase: any (no functional impact; a11y + polish)
files:
  - assets/app.js
  - assets/help.js
  - assets/help.css
source: Phase 39 code review (39-REVIEW.md, WR-02 + Info items), 2026-07-08
---

## What this is

**WR-02 (warning):** `initHelpEntry()` (assets/app.js:~509) marks the "?" popover `role="menu"` / `role="menuitem"` but implements none of the menu keyboard contract — no Escape-to-close, no arrow-key movement, no focus management, and no `aria-controls` linkage (the globe popover has one). A claimed-but-unimplemented menu role is worse for screen-reader users than plain links. Fix either way:
- **Cheap:** drop `role=menu/menuitem` (plain links in a disclosure) + add `aria-controls` + Escape-to-close, or
- **Full:** implement the menu keyboard pattern (arrows, Home/End, focus trap, Escape).

## Review Info items worth folding in (from 39-REVIEW.md)

- Dead `.search-empty.is-visible` CSS rule (help.css)
- Brittle `[style*="none"]` selector for tech-band visibility (help.js)
- Clearing a search collapses cards that a deep-link had auto-opened
- Language switch scroll-jumps back to the URL hash mid-page
- The mailto popover item doesn't close the popover on click
- Static EN aria-labels on translated chrome
- Stale assertion-count comment in tests/39-help-render.test.js:152

WR-01 (stale search state after language re-render) was already fixed and WebKit-verified in commit 6e1aa02 — NOT part of this todo.
