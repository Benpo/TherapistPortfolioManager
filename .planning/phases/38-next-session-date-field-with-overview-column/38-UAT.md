---
status: testing
phase: 38-next-session-date-field-with-overview-column
source: [38-VERIFICATION.md]
started: 2026-07-07T12:00:00Z
updated: 2026-07-07T12:00:00Z
---

## Current Test

number: 1
name: Overdue cue visual check (LTR / RTL / dark)
expected: |
  In the client overview, a row whose most-recent session has a nextSessionDate
  strictly before today shows the date dimmed (muted text) with a small amber ●
  marker before it (after it in RTL via margin-inline-end). Subtle, not alarming.
  Hovering the dot shows the localized "overdue" tooltip. Rows with today/future
  dates show a normal-colored date and no dot. Empty cells show "-" with no dot.
  Must look right in light AND dark theme, and in Hebrew (RTL) the marker sits on
  the logical end side without breaking alignment.
awaiting: user response

## Tests

### 1. Overdue cue visual check (LTR / RTL / dark)
expected: Dimmed date + small amber ● with accessible tooltip for strictly-past dates; today is NOT overdue; empty renders "-" with no cue; correct in light/dark and Hebrew RTL (marker on logical end side, alignment intact).
result: [pending]

### 2. Demo Next Session column "reads naturally"
expected: demo.html's overview shows the new "Next Session" column between "Last Session" and "Actions", populated on several rows with mostly NEAR-FUTURE dates and exactly one overdue example (the deliberate showcase). The column should read like a therapist's real planner — not all-overdue, not empty.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
