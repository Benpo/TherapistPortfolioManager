---
created: 2026-07-11
title: Next-session date shows the same error for incomplete entry and too-early date
area: add-session
files:
  - assets/add-session.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
resolves_phase: 48
---

## Problem

Ben (2026-07-11, during v1.4 scoping): the next-session date field shows the **same
error message** when the field is only partially entered as when the entered date is
not in the future (earlier than the session date). The two failures must be clearly
distinguishable — the user needs to know when the only problem is "this date is not
in the future."

## Investigation so far (2026-07-11, pre-milestone)

The code *looks* split already, so the duplicate message Ben observed is a real but
subtler routing bug:

- Two distinct guards exist at the single save choke point: `isNextSessionDateIncomplete`
  (keys on `validity.badInput`, `assets/add-session.js:90`) → `toast.nextSessionDateIncomplete`
  (`:1183`), and `isNextSessionDateTooEarly` (keys on `validity.rangeUnderflow`, `:102`)
  → `toast.nextSessionDateTooEarly` (`:1190`).
- Both i18n keys have **distinct** strings in all four locales (i18n-*.js:182-183).

So the fix is NOT "add a second message" — it's finding why the wrong branch fires
in Ben's environment. Prime suspects:

1. **Safari/WebKit `validity` support gaps on `<input type=date>`** — if Safari does
   not set `rangeUnderflow` (or sets `badInput` instead) for a typed too-early value,
   the incomplete-branch wins (it runs first) or the save passes silently.
2. Repro environment unconfirmed — need Ben's browser/OS/language + whether it was
   the installed PWA. jsdom tests pass because jsdom raises `rangeUnderflow` natively;
   this is exactly the jsdom-can't-see-real-browser class flagged in v1.4 PITFALLS.md.

## Solution direction

Reproduce on real Safari (macOS + iPhone PWA); if the validity API is unreliable
there, derive too-early by comparing `el.value` against `min` directly (both are
clean `YYYY-MM-DD` strings — lexicographic compare works) instead of trusting
`validity.rangeUnderflow`, keeping `badInput` only for genuine partial entry.
Update/extend the Phase 38 guard tests so the distinction is pinned behavior.

## Milestone

Scoped into **v1.4 Richer Sessions** as **PLSH-03** (2026-07-11).
