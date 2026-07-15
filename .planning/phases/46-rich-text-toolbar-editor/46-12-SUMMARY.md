---
phase: 46-rich-text-toolbar-editor
plan: 12
subsystem: export
tags: [i18n, export, heart-wall, wording, gap-closure]
requires:
  - phase: 46-10
    provides: emotionsBlockIncluded gating + export.section.emotions relabel in export-modal.js (current file state this plan edits around)
provides:
  - Export-only Heart-Wall status wording (released / identified-not-released) in both export builders, all four locales
  - Regression test tests/export-heartwall-wording.test.js
affects: [46-14 gate (real opened-PDF confirmation of the new wording, Hebrew included)]
tech-stack:
  added: []
  patterns:
    - Export-only i18n keys decoupled from shared form-radio keys
    - Key-returning App.t stub makes i18n routing observable in jsdom builder tests
key-files:
  created:
    - tests/export-heartwall-wording.test.js
  modified:
    - assets/export-modal.js
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "Ben chose Option B (present/removed vocabulary) at the checkpoint: released = 'Heart-Wall removed'; not released = 'Heart-Wall present — not removed this session'"
  - "Not-flagged sessions keep the current omission — no third state, the Heart-Wall section stays absent entirely"
metrics:
  duration: 6min
  completed: 2026-07-15
status: complete
---

# Phase 46 Plan 12: Heart-Wall Export Wording Summary

**One-liner:** Heart-Wall export line now reads "Heart-Wall removed" / "Heart-Wall present — not removed this session" (Ben's Option B) via two new export-only i18n keys in all four locales, replacing the ambiguous bare Yes/No in both export builders while the form radios stay plain Yes/No.

## The Chosen Wording (checkpoint decision — Option B)

| Locale | Released | Identified — not released |
|--------|----------|---------------------------|
| EN | Heart-Wall removed | Heart-Wall present — not removed this session |
| HE | חומת הלב הוסרה | חומת הלב קיימת — לא הוסרה במפגש זה |
| DE | Heart-Wall entfernt | Heart-Wall vorhanden – in dieser Sitzung nicht entfernt |
| CS | Heart-Wall odstraněna | Heart-Wall přítomna – v tomto sezení neodstraněna |

Ben also ratified: not-flagged sessions keep the current behavior — the Heart-Wall
section is omitted entirely (no third state added).

## New i18n Keys

- `session.export.heartWall.released`
- `session.export.heartWall.notReleased`

Added to all four locales right after `session.export` (the export-modal key block).
CS values follow the block's `\uXXXX` escape convention (matching 46-10's addition).
The shared form-radio keys `session.form.shieldRemoved.yes/no` are untouched — the
add/edit form radios still read plain Yes/No.

## What Was Done

### Task 1: Checkpoint — Ben chose the wording
Presented three options (status-forward / present-removed / detected-pending) with
all four locales. Ben chose **Option B** exactly as proposed, plus the explicit
keep-omission ruling for unflagged sessions. No commit (decision only).

### Task 2: Emit the chosen wording in both builders + locales + regression test (commit 822db4e)
- Both builders in `assets/export-modal.js` repointed their Heart-Wall value line:
  - `buildSessionMarkdown()` (clipboard copy path)
  - `buildFilteredSessionMarkdown()` (editor/PDF path — the PDF renders this line
    from the same markdown body; confirmed `pdf-export.js` has no separate
    Heart-Wall rendering, only section-count comments)
- Four locale files gained the two keys with parity.
- `tests/export-heartwall-wording.test.js` (5 cases, count-guarded):
  1. Key parity across all four locales + pinned EN wording + form radios still
     exactly "Yes"/"No"
  2. Flagged-but-not-released → both builders emit the notReleased key, never the
     form no-radio key (jsdom, real page + populate, key-returning App.t stub)
  3. Released → both builders emit the released key, never the form yes-radio key
  4. Not flagged → section absent entirely in both builders (pins the omission ruling)
  5. Source guard — `export-modal.js` contains zero references to
     `session.form.shieldRemoved.yes/no`, and exactly two `App.t()` sites per new key

## Verification

- `node tests/export-heartwall-wording.test.js` — 5/5 green.
- `node tests/run-all.js` — **189 passed, 0 failed** (baseline 188 + this plan's new file).
- Real opened-PDF confirmation (Hebrew included) deferred to the 46-14 gate per plan.

## Deviations from Plan

### Authorized adjustments

**1. Comment hygiene translation (pre-authorized)**
- Plan wording carrying planning IDs was translated to plain prose in all shipped-file
  comments (export-modal.js comment blocks, i18n-en.js key comment, test doc block).
  Zero planning IDs in shipped files.

Otherwise: none — plan executed as written.

## Threat Register Outcomes

- T-46-12a (ambiguous "No" misread): mitigated — explicit released / present-not-removed
  copy in both builders, four locales.
- T-46-12b (accidental change to shared form-radio keys): mitigated — new export-only
  keys; test case 1 pins the form radios at "Yes"/"No" and case 5 asserts the builders
  no longer reference them.

## Known Stubs

None.

## Self-Check: PASSED

- assets/export-modal.js — FOUND
- assets/i18n-en.js / -he / -de / -cs new keys — FOUND (parity verified by test)
- tests/export-heartwall-wording.test.js — FOUND
- Commit 822db4e — FOUND
