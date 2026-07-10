---
created: 2026-07-10T07:20:00.000Z
title: Hebrew copy polish pass (help center + changelog prose)
area: i18n
priority: medium
files:
  - assets/help-content-he.js
  - assets/changelog-content-he.js
  - assets/i18n-he.js
---

## Problem

During the Plan 42.1-10 Hebrew read (Sapir/Ben), Ben approved the Hebrew
surfaces overall ("rest seems nice") but flagged that the prose can still be
improved in several places — the Hebrew is grammatical but not always natural.
His words: "so many of the hebrew sentences could get an update."

Named example: the v1.0 changelog lede — "כאן הכול התחיל — הזרע הראשון של
Sessions Garden." — the 'first seed' ('הזרע הראשון') phrasing reads badly / not
natural in Hebrew.

This spans BOTH the help center bodies and the changelog prose (help +
changelog HE files). It is a broad natural-language polish pass, not a set of
discrete bugs.

## Solution

1. Native-speaker (Sapir) re-read of the HE help center + changelog prose,
   sentence by sentence, flagging every line that reads stiff / unnatural.
2. Rewrite flagged lines in clean, natural Hebrew in the house register
   (plural address per Plan 42.1-09 harmonization; no clinical terms;
   consistent terminology — לקוח, חומת הלב, "Sessions Garden" in Latin).
3. Re-run the HE integrity + parity gates (structure/tokens/\n\n unchanged) and
   the full suite; re-capture render evidence for any changed surface.

## Origin

Ben's 42.1-10 checkpoint response (2026-07-10) — approved-with-corrections. The
three concrete corrections he raised (RTL collapsed chevron; HE 'מתאוששת בכוחות
עצמה' recovery line; the v1.3 phone-home-screen line) were fixed in Plan
42.1-10 Task 3. This broader prose-polish pass was explicitly deferred by Ben
("but we could do this later") and is recorded here so it is not lost.
