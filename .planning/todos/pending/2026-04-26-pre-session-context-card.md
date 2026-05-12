---
created: 2026-04-26T00:00:00.000Z
title: Pre-session context card — surface everything the therapist needs at session start
area: feature
priority: high
recommended_entry: /gsd-spec-phase
files:
  - add-session.html
  - assets/add-session.js
  - assets/app.css
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
---

## Origin — innovator agent (2026-04-26)

Triggered by Sapir's feedback that the client `notes` field should appear in more places (now done — surfaced inline in the session client spotlight). The innovator agent identified a deeper pattern: the app collects rich data at intake but treats each screen as a silo, so therapists can't see context when they need it most — when starting a new session.

## What this is really about

A working therapist has 6–8 sessions per day with maybe 30 seconds between clients. Right now, opening a new session for a returning client surfaces only their name, photo, age, and (after the recent fix) notes. To remember what happened last time, what was open, what to ask about today, the therapist has to navigate away to client history, then back.

The feedback item Sapir already raised (notes propagation) is one slice of this. The bigger fix: a **pre-session context card** that surfaces the full picture in one place at the moment the therapist opens a new session.

## What it would show

Drawn from data already in the DB:

- **Client notes** (already shown — keep it)
- **Last session date** + how many sessions in total
- **"Information for Next Session"** field from the most recent session (this is the killer field — it's the therapist's note-to-self about what to address today)
- **Open issues** — issues from past sessions where severity hasn't dropped to zero
- **Severity trend** — sparkline or text timeline (e.g. "Anxiety 8 → 6 → 4 → 2") for ongoing issues

## Key design questions to resolve before planning

These should be answered during `/gsd-spec-phase`:

1. **Display mode** — always-expanded card, or collapsible/expandable? Default expanded for new-session screen, collapsed when scrolling into the form?

2. **What to show when there's no history** (first session for a new client)? Hide the card entirely, or show a friendly empty state?

3. **Severity trend visualization** — text-only ("Anxiety: 8 → 6 → 4 → 2"), inline sparkline (SVG), or skip for v1?

4. **Open vs. closed issues** — define "open" precisely. Is it `severityAfter > 0`? `severityAfter > 1`? Or every issue ever recorded for that client until manually marked resolved?

5. **"Information for Next Session" field** — does it already exist in the data model under that exact name? Verify before designing UI for it. (The innovator agent referenced it but I haven't grepped for it.)

6. **Read-only or editable in place?** — therapist might want to update notes directly from the context card without opening edit mode.

7. **Mobile layout** — context card on a 375px-wide phone needs a stack-friendly design. What gets prioritized when space is tight?

## Recommended workflow when picked up

1. `/gsd-spec-phase` — answer the questions above, lock falsifiable requirements.
2. `/gsd-discuss-phase` — design decisions (data model verification, layout).
3. `/gsd-plan-phase` — task breakdown.
4. `/gsd-execute-phase`.

## Combining scope

This todo overlaps with the existing #2 fix (notes in session spotlight). The notes block can be folded into the bigger context card, or kept as the "header" with the rest stacking below it. Decide during spec phase.

## Why this is high priority

Of the three innovator-agent recommendations (this one, send-to-client email, session-gap alert), this one:
- Addresses an actual stated user need (notes propagation, just done)
- Uses 100% existing data — no new schema
- Touches a screen the therapist sees multiple times every working day
- Is the lowest-effort high-value pick (the agent rated it S effort with daily value)
