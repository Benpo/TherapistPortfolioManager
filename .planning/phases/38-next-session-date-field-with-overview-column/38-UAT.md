---
status: diagnosed
phase: 38-next-session-date-field-with-overview-column
source: [38-VERIFICATION.md]
started: 2026-07-07T12:00:00Z
updated: 2026-07-07T06:40:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Overdue cue visual check (LTR / RTL / dark)
expected: Dimmed date + small amber ● with accessible tooltip for strictly-past dates; today is NOT overdue; empty renders "-" with no cue; correct in light/dark and Hebrew RTL (marker on logical end side, alignment intact).
result: pass

### 2. Demo Next Session column "reads naturally"
expected: demo.html's overview shows the new "Next Session" column between "Last Session" and "Actions", populated on several rows with mostly NEAR-FUTURE dates and exactly one overdue example (the deliberate showcase). The column should read like a therapist's real planner — not all-overdue, not empty.
result: pass

### 3. Next Session sort direction with blank dates (RETEST after 38-08 — revised D-03-R1)
expected: Next Session sort mirrors Last Session — ascending (default): dated rows soonest-first, blank-date rows at the BOTTOM; descending: blank rows at the TOP, dated rows latest-first below. With one dated row among many blanks, toggling visibly moves it.
result: pass
note: RETESTED 2026-07-07 on local server (localhost:8038, fixed bundle verified served) — Ben confirmed pass.
history: Originally failed 2026-07-07 against the original D-03 (blanks pinned to bottom under both directions — works-as-designed, not a code defect). Ben revised the decision (D-03-R1: blanks travel with the sort direction, mirroring Last Session); gap plan 38-08 implemented it via a far-future sentinel riding the shared dir*base flip. Original report: "with a next-session date on only ONE row among many, toggling sort direction never moved that row off the top."

### 4. Export renders date-only next-session section (Issue B from manual testing)
expected: Exporting a session that has a nextSessionDate but an EMPTY next-session note still renders the date in the export output (D-09/NEXT-06: "if only one of note/date is present, the present one still renders").
result: pass
reported: "exporting didn't export it if there was no text in 'next session info'. this is not expected. I want to be able to show only the next date in the export even if there is no free text."
note: Initially reported as an issue (PDF export, saved/past session). Ben retested during UAT 2026-07-07: "now it does export" — PASS. Code verification: PDF consumes the export editor's markdown (export-modal.js:679) with no next-session gate of its own; all modal gates (sectionHasData :142-148, copy builder :286, filtered builder :432-434, toggle default :455-458) are note-OR-date; 30-section-visibility + 30-export-markdown date-only cases GREEN by execution. Original failure most likely the stale SW-cache bundle (pre-38-06) — the documented failure mode in reference-pwa-sw-cache-updates.

### 5. Manual typed date entry — partial edit silently discarded (found during retest)
expected: Editing the next-session date by typing works; a partially-entered date (only day or only month changed) is never silently dropped — the session either saves a complete date or clearly refuses.
result: issue
reported: "when editing the date manually it becomes black instead of being greyed out. when editing all 3 parts - it works great. but when changing only the day or only month - it doesnt save it despite showing that it was saved successfully."
severity: major
note: Root-caused same session (see Gaps). The "becomes black" part is native Safari segment rendering (entered segment = black, placeholder segments = grey) — not an app defect. Fix direction confirmed with Ben 2026-07-07 — block save + message, #nextSessionDate only.

## Summary

total: 5
passed: 4
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Toggling nextSession sort moves blank-date rows WITH the direction (bottom on ascending, top on descending), mirroring Last Session behavior"
  status: resolved
  reason: "Fixed by gap plan 38-08 (far-future sentinel riding dir*base). Ben retested on local server 2026-07-07: PASS. Original: user decision 2026-07-07 revised D-03 to mirror Last Session."
  severity: minor
  test: 3
  root_cause: "Not a defect — works-as-designed per original D-03 (blanks pin to bottom via early returns that bypass the dir*base flip). Ben revised the decision: blanks must now travel with sort direction like Last Session."
  artifacts:
    - path: "assets/overview.js"
      issue: "nextSession sort branch lines ~315-317: early returns pin blanks to bottom both directions; must be removed/reworked so blanks participate in the dir flip (empty sorts as 'oldest' like lastSession's '' localeCompare)"
    - path: "tests/37-overview-sort.test.js"
      issue: "assertions currently LOCK blanks-to-bottom-both-directions (incl. 'blanks escape the dir*base multiply' case) — must be updated to the new mirrored behavior"
    - path: ".planning/phases/38-next-session-date-field-with-overview-column/38-CONTEXT.md"
      issue: "D-03 locked note must be revised to record the changed decision"
  missing:
    - "Flip blank-date handling in the nextSession sort branch to mirror lastSession (blanks travel with direction)"
    - "Update 37-overview-sort blank-date assertions to the new behavior"
    - "Revise D-03 in 38-CONTEXT.md with the 2026-07-07 decision change"
  debug_session: ""

- truth: "Saving the session with a partially-entered next-session date either saves a complete date or clearly refuses — a partial entry is never silently discarded while the toast reports success"
  status: failed
  reason: "User reported: when changing only the day or only month it doesn't save, despite showing saved successfully (Safari, manual typed entry into the native date input)"
  severity: major
  test: 5
  root_cause: "Native <input type='date'> exposes value='' until ALL segments are complete; the save path (add-session.js:1137, nextSessionDate = el?.value || '') reads '' for a partial entry, saves the session without the date, and shows the generic success toast. Safari compounds the confusion by rendering TODAY'S date greyed inside an EMPTY date input (placeholder hint), so an empty field looks like a stored value and a one-segment edit feels like editing an existing date. Populate path is correct (add-session.js:1709 sets .value from the record). No app CSS involved — black segment = entered, grey = placeholder (native Safari rendering)."
  artifacts:
    - path: "assets/add-session.js"
      issue: "save flow reads #nextSessionDate.value with no partial-entry guard; needs a validity.badInput check that blocks the save with a clear i18n message (Ben's confirmed direction 2026-07-07: block save + message, #nextSessionDate only — NOT other date fields)"
    - path: "assets/i18n-en.js"
      issue: "needs a new key for the incomplete-date block message (plus he/de/cs siblings per the 38-03 four-language pattern)"
  missing:
    - "Save guard: if the #nextSessionDate input reports validity.badInput (partial entry), abort the save and surface an 'incomplete next-session date — complete or clear it' message (4-language i18n key)"
    - "Falsifiable guard test — NOTE: jsdom CANNOT simulate partial native date segments (no segmented UI, badInput never set); unit-test the guard against a stubbed element with validity.badInput=true, RED-first"
    - "Real-Safari field verification checkpoint (badInput fires on partial typed entry, save blocked, message shown) — jsdom/Chromium alone insufficient per reference-webkit-chromium-svg-visual-verification precedent"
  debug_session: ""

- truth: "Export renders the next-session date even when the note is empty (D-09/NEXT-06: if only one of note/date is present, the present one still renders)"
  status: resolved
  reason: "User reported (pre-UAT): exporting didn't export it if there was no text in 'next session info'. RETESTED during UAT 2026-07-07: 'now it does export' — resolved, no fix needed."
  severity: major
  test: 4
  root_cause: "No live defect. PDF consumes the export editor's markdown (export-modal.js:679) with no next-session gate of its own; all modal gates are note-OR-date per 38-06 and date-only behavior tests pass by execution. Original failure most likely a stale service-worker-cached pre-38-06 bundle (reference-pwa-sw-cache-updates failure mode)."
  artifacts: []
  missing: []
  debug_session: ""

