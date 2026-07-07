---
status: testing
phase: 38-next-session-date-field-with-overview-column
source: [38-VERIFICATION.md]
started: 2026-07-07T12:00:00Z
updated: 2026-07-07T09:33:07Z
---

## Current Test

number: 5
name: Partial typed date entry blocked with clear message (RETEST after 38-09)
expected: |
  In real Safari (localhost or installed PWA — make sure the NEW bundle is served, not a stale SW cache):
  1. Edit a session and type into the next-session date field changing only ONE segment (only the day, or only the month). Press Save/Update.
     → The save is BLOCKED: a toast shows "Next session date is incomplete — complete it or clear it" (in the active language), no success toast fires, and the session record is unchanged (the partial date is NOT silently discarded).
  2. Type a COMPLETE date → saves normally with the date.
  3. CLEAR the field entirely → saves normally (empty is legal, never blocked).
  4. Optional: repeat step 1 once in Hebrew — the RTL toast wording reads naturally.
awaiting: user response

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

### 5. Partial typed date entry blocked with clear message (RETEST after 38-09 — validity.badInput guard)
expected: In real Safari, typing a PARTIAL next-session date (only day or only month changed) and pressing Save/Update BLOCKS the save with a localized "incomplete date" toast — no success toast, session record unchanged. A COMPLETE typed date saves normally; a CLEARED field saves normally (empty is legal). Hebrew RTL toast reads naturally.
result: [pending]
history: Originally failed 2026-07-07: "when editing the date manually it becomes black instead of being greyed out. when editing all 3 parts - it works great. but when changing only the day or only month - it doesnt save it despite showing that it was saved successfully." Root-caused: native date input exposes value='' until all segments complete → partial entry saved as '' with generic success toast. The "becomes black" part is native Safari segment rendering (entered segment = black, placeholder = grey) — not an app defect. Fix 38-09 (2026-07-07): validity.badInput guard at the saveSessionForm() choke point + toast.nextSessionDateIncomplete in 4 languages; guard unit test 5/5 GREEN; code review WR-02 defines what this retest must prove (real Safari badInput at submit time — jsdom/Chromium cannot).

### 6. Hebrew RTL — native date inputs render segments reversed (found during 38-09 retest; pre-existing)
expected: In Hebrew mode the native date inputs (#sessionDate, #nextSessionDate) keep the browser-native segment order (mm/dd/yyyy in Ben's Safari, dd/mm/yyyy in Chrome — the accepted native-locale compromise); the app's RTL styling must not visually reverse the numeric runs.
result: issue
reported: "Hebrew RTL is wrong! not only in this phase, I believe it was like this already from phase 37 or something. cant be that date field shown as yyyy/mm/dd in hebrew, it must be a bug. funny enough, its exactly the type of field you said is dependent on the OS native locale, so the date formatter isnt even affecting these boxes in english - its always mm/dd/yyyy in my Safari but dd/mm/yyyy in my Chrome (which I accepted as compromise) - so I expected hebrew to still behave with same mm/dd/yyyy in Safari. also now in the bottom with next session date I see yyyy/dd/mm all of a sudden, which seems like a perfect reversing of the expected value."
severity: major
note: Screenshot shows placeholder "2026/16/05" (yyyy/dd/mm) on תאריך מפגש for May 16 — a perfect VISUAL reversal of Safari's native mm/dd/yyyy, consistent with the RTL base direction reordering the LTR numeric runs (bidi), not a formatter bug. Ben: don't attribute origin phase, just fix it.

### 7. Hebrew RTL — LTR client name + Hebrew month-name date scramble each other (pre-existing)
expected: A line combining a Latin-script client name with a Hebrew month-name date reads in correct order in Hebrew mode (e.g. "dgh • 16 במאי 2026" — name isolated, date parts in order).
result: issue
reported: "another bug preexisting: in hebrew mode, when the month format is chosen to show the name of the month in hebrew, and the customer has english name, it reverses each other and displayed like this: '2026 במאי dgh • 16' (example is for customer 'dgh' for May 16th)."
severity: major
note: Classic missing bidi isolation around the LTR name adjacent to Hebrew text with numeric runs.

## Summary

total: 7
passed: 4
issues: 2
pending: 1
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

- truth: "In Hebrew mode the native date inputs (#sessionDate, #nextSessionDate) keep the browser-native segment order — the app's RTL styling must not visually reverse the numeric runs (yyyy/dd/mm observed instead of Safari's mm/dd/yyyy)"
  status: failed
  reason: "User reported: date field shown as 2026/16/05 (yyyy/dd/mm) in Hebrew Safari for May 16 — 'a perfect reversing of the expected value'; seen on both the session date field and the next-session date field. Pre-existing (believed since ~Phase 37); Ben: don't attribute origin, just fix."
  severity: major
  test: 6
  artifacts: []  # Filled by diagnosis
  missing: []    # Filled by diagnosis
  debug_session: ""

- truth: "A line combining a Latin-script client name with a Hebrew month-name date reads in correct order in Hebrew mode (name bidi-isolated; date parts not scrambled)"
  status: failed
  reason: "User reported: in Hebrew with month-name format and an English client name, name and date 'reverse each other' — displays '2026 במאי dgh • 16' for customer dgh, May 16 2026. Pre-existing."
  severity: major
  test: 7
  artifacts: []  # Filled by diagnosis
  missing: []    # Filled by diagnosis
  debug_session: ""

