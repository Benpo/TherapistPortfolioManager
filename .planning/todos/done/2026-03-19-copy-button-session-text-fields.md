---
created: 2026-03-19T12:00:00.000Z
title: Redesign session viewing UX — read mode, copy flow, and professional session cards
area: ux
priority: high
files:
  - assets/add-session.js
  - add-session.html
  - assets/overview.js
  - overview.html
---

## Problem

The session viewing experience has multiple UX issues that make it feel unfinished:

### 1. No read mode — sessions open in edit mode by default
Copy buttons on session fields only appear in read mode, but the only way to reach a past session (Overview → Client → expand sessions → click "Edit") drops you directly into **edit mode**. There is no way to view a session in read-only mode with copy functionality without first landing in edit.

### 2. Session preview in overview is unprofessional
When clicking the clock icon on a client row in the overview table, past sessions expand inline as yellow cards showing **raw unformatted text** — markdown-style content dumped with no visual hierarchy:
- Raw `**bold**` markers visible instead of rendered formatting
- No structured layout (date, type, findings, notes are all mashed together)
- Just a single "Edit" button at the bottom
- Looks like debug output, not a professional therapist tool

### 3. Session viewing journey is broken
The full flow (Overview → Client → Sessions → Session detail) has no dedicated "view session" step. Every path leads to edit mode, making it impossible to quickly read and copy session content to share with a client.

## Solution

This needs a UI redesign phase (likely Phase 21 or 22):

1. **Read mode as default** — sessions open in a well-formatted read view with copy buttons visible on each field
2. **Clear edit toggle** — prominent "Edit" button to switch from read to edit mode
3. **Redesign session preview cards** — replace raw text dump with properly formatted cards showing structured fields (date, session type, findings, notes) with visual hierarchy
4. **Session detail page** — consider a proper session detail view rather than inline expansion

## Origin

Sapir requested copy buttons during Phase 10. Scope expanded 2026-03-25 after reviewing the full session viewing journey.

---

## Closure 2026-05-13

**Status: DONE — original problem statements no longer apply.**

Ben verified 2026-05-13: the premise of this TODO is wrong as of the current codebase.
- ✅ **Default IS read mode** (not edit mode as the TODO claimed).
- ✅ **Pencil button exists** to enter edit mode from read mode.
- ✅ Per-field copy buttons exist and are visible in read mode (which is now the default).

**However, two NEW bugs surfaced while verifying:**
- `2026-05-13-overview-clock-icon-severity-reversal.md` — severity ratings displayed in reverse order (`2 → 10` instead of `10 → 2`) on the overview clock-icon expansion.
- Overview clock-icon "Edit" button wording could suggest read mode is the default — folded into `2026-05-13-edit-session-cancel-revert-toggle.md`.

This TODO closed; moving to `done/`.
