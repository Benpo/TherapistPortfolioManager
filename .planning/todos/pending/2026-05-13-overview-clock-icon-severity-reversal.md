---
created: 2026-05-13T00:00:00.000Z
title: Overview clock-icon expansion shows session severity ratings in REVERSE order
area: bug
priority: major
recommended_entry: /gsd-discuss-phase
target_phase: 24
files:
  - assets/overview.js
  - overview.html
source: Ben 2026-05-13 (discovered while verifying 2026-03-19-copy-button-session-text-fields.md)
---

## Problem

On the overview screen, clicking the clock icon next to a client expands a session-history panel. Inside this expansion, the severity ratings for each session's topic are **displayed in reverse order**.

**Concrete repro:**
- Therapist creates a session, enters a topic ("Anxiety") with severity BEFORE = 10 and severity AFTER = 2 (improvement: 10 → 2).
- Open Overview → click clock icon on this client → expanded panel shows: **`2 → 10`** (reversed; reads like the issue got WORSE).
- Affects all locales (verified by Ben in English + Hebrew on 2026-05-13).

## Likely root cause

The expansion render path is reading `severityAfter` and `severityBefore` in the wrong order, OR labeling them wrong, OR the arrow direction is flipped. Likely a one-line bug in `assets/overview.js`'s clock-icon expansion render — probably a template like:

```js
`${session.severityAfter} → ${session.severityBefore}`
```

instead of:

```js
`${session.severityBefore} → ${session.severityAfter}`
```

Other places in the app (session detail, edit-session display, PDF export) appear to show the correct order. This is isolated to the overview expansion.

## Fix

1. Read `assets/overview.js` clock-icon expansion render function.
2. Swap the severity display order to BEFORE → AFTER.
3. Verify via:
   - Manual UAT (create test session 10→2, view in overview expansion).
   - Cross-check against session detail page (which displays correctly per Ben's verification).
   - Both EN and HE locales — Hebrew is RTL so arrow direction may render visually reversed; that's a UAX-natural display, NOT a separate bug. The DATA order must be BEFORE → AFTER in both locales.

## Acceptance

- Create session with `severityBefore: 10, severityAfter: 2`.
- Open overview → click clock icon → expansion panel shows `10 → 2` (in EN, LTR) or `10 → 2` in logical order for HE (which may render visually as `2 ← 10` due to RTL bidi — acceptable AS LONG AS reading R→L gives `10 → 2`).
- Spot-check at least 3 historical sessions render correctly.
- No regression on session detail, edit-session display, PDF export.

## Origin

Reported by Ben 2026-05-13 while verifying that the `2026-03-19-copy-button-session-text-fields.md` TODO is no longer accurate. While confirming the read-mode-default flow works, Ben noticed the severity reversal on the overview clock-icon expansion.

## Recommended Phase 24 inclusion

Should be added to Phase 24 scope (Pre-Launch Final Cleanup) — same area as items 1 + 2 (add-session/edit-session UI surface). Small bug, likely 5-10 LOC fix + regression check.
