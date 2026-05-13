---
created: 2026-05-13T00:00:00.000Z
title: Edit-session has no Cancel/Revert toggle — only Save / Delete / Home
area: bug
priority: major
recommended_entry: /gsd-discuss-phase
target_phase: 24
files:
  - assets/add-session.js
  - add-session.html
source: 22-HUMAN-UAT.md lines 34 / 88 / 178-185 (Phase 22 round-3 UAT, 2026-05-07)
---

## Problem

When pressing EDIT on an existing session, the only options are:
- **Save** (commits changes)
- **Delete** (destructive)
- **Go back to home** (navigates away, may discard or save unclear)

There is **no "Cancel" / "Revert"** affordance that lets the user return to display mode without committing changes. A therapist who accidentally entered edit mode, or made unwanted changes, has no clear non-destructive way back.

## Fix

Add a Cancel / Revert / "Back to view" affordance that:
1. Reverts any unsaved in-place form changes to the last-saved state.
2. Returns the form to read-only / display mode.
3. Does NOT navigate away from the page.

UX choices to decide in discuss-phase:
- Affordance position: header button vs sticky footer vs inline pencil-icon toggle?
- Confirm dialog if changes exist? Or revert silently?
- Visual treatment: "Cancel" (neutral) vs "Discard changes" (warning) wording.

## Acceptance

- From edit mode with unsaved changes, click Cancel/Revert → form reverts to last-saved values → enters display mode.
- From edit mode with no changes, click Cancel → quietly returns to display mode (no confirm needed).
- Save and Delete actions still work as before.
- E2E test: load session, edit a field, click Cancel, reload page → field is unchanged in DB.

## Companion UX fix — overview clock-icon button wording (added 2026-05-13)

While verifying the `2026-03-19-copy-button-session-text-fields.md` TODO, Ben confirmed:
- Session detail default IS read mode (with pencil icon to enter edit mode).
- Overview clock-icon expansion shows an "Edit" button as the only affordance.

The "Edit" wording on the overview expansion doesn't communicate that read mode is the default. Together with the in-session Cancel/Revert toggle above, this completes the read-mode-clarity story.

**Companion fix:** Rename the overview clock-icon expansion's "Edit" button to something that signals read mode is default. Options:
- "View" + pencil icon (entering opens read mode; pencil toggles edit) — most consistent with session detail page pattern.
- "Open" — neutral, less commits about mode.
- "View / Edit" — combo affordance.

Pick during discuss-phase.

## Cross-references

- 22-HUMAN-UAT.md gap "Editing a session offers a way to revert back to display mode without saving or deleting" — failed / major / scope: out-of-phase-22.
- Pairs naturally with `2026-05-13-add-session-dropdown-spotlight-bug.md` (both touch the add-session/edit-session UI flow).
- Related: `assets/app.js:1052` already has `App.installNavGuard` helper (added in commit 8ba567f) — protects against navigating AWAY from a dirty form. This is the complementary case: revert IN-PLACE without navigating.
- Companion to `2026-05-13-overview-clock-icon-severity-reversal.md` — both touch the overview clock-icon expansion.

## Origin

Reported by Ben during Phase 22 round-3 UAT (2026-05-07). Marked "(out of scope)" because Phase 22's scope was locked.
