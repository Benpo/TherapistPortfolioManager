---
status: resolved
phase: 38-next-session-date-field-with-overview-column
source: [38-VERIFICATION.md]
started: 2026-07-07T12:00:00Z
updated: 2026-07-07T11:38:50Z
---

## Current Test

[testing complete — all gaps resolved: tests 6, 7 (RTL bidi, 38-10/38-11) + test 8 (warning visibility, 38-12) closed on-device 2026-07-07]

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
result: pass
note: RETESTED 2026-07-07 in real Safari — "incomplete date worked": partial entry BLOCKS the save, no silent discard (NEXT-01/UAT-5 functional truth closed; review WR-02's Safari premise PROVEN — badInput does fire at submit time). Complete-date save confirmed in the original report ("editing all 3 parts works great"); empty-allowed covered by unit tests. Toast VISIBILITY complaint spun out to test 8.
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

### 8. Block-message visibility — warning indistinguishable from success toast, far from the field (found during 38-09 retest)
expected: When a save is blocked for an incomplete next-session date, the warning is clearly visible, visually distinct from the success toast, and physically close to the offending field.
result: issue
reported: "incomplete date worked but the toast looks not visibale enough. its the same like 'completed successfully' so no one really sees it in the corner. I thought such warnings will be more visible and clear, and physically close."
severity: minor
note: Self-diagnosed (no debug agent needed): App.showToast (app.js:838) is single-style — success and error render identically, corner placement, 1.8s auto-dismiss; codebase has NO error toast variant and NO inline field-error pattern (no aria-invalid/field-error CSS anywhere). Fix direction to be confirmed with Ben.

## Summary

total: 8
passed: 5
issues: 3
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

- truth: "In Hebrew mode the native date inputs (#sessionDate, #nextSessionDate) keep the browser-native segment order — the app's RTL styling must not visually reverse the numeric runs (yyyy/dd/mm observed instead of Safari's mm/dd/yyyy)"
  status: resolved
  reason: "Fixed by gap plan 38-10 (final direction-based mechanism: html[dir=rtl] input[type=date]{direction:rtl} pins the LTR value block to the right edge + ::-webkit-datetime-edit{direction:ltr} restores native segment order; base input[type=date]{direction:ltr}). A first on-device round used text-align, which WebKit ignores on the shrink-wrapped datetime-edit; the direction-based fix corrected both segment order AND right-alignment. Playwright WebKit validated (RTL native order + right-aligned, LTR unchanged, no Chromium regression); source gate + suite 130/130 green. Ben approved on-device in real Safari 2026-07-07: '38.10 looks good now'. Original report: date field shown as 2026/16/05 (yyyy/dd/mm) in Hebrew Safari for May 16 — a perfect reversal; seen on session + next-session date fields. Pre-existing; Ben: don't attribute origin, just fix."
  severity: major
  test: 6
  root_cause: "Native date inputs have no direction of their own; in Hebrew, html[dir=rtl] (app.js:124) + app.css:1289 `html[dir=rtl]{direction:rtl}` cascade direction:rtl into them, and WebKit lays out the ::-webkit-datetime-edit sub-fields in the inherited direction — visually reversing mm/dd/yyyy → yyyy/dd/mm. NO input[type=date] rule or direction reset exists anywhere in the CSS. Reproduced pixel-for-pixel in Playwright WebKit ('2026/16/05'); injecting input[type=date]{direction:ltr} restores '05/16/2026'. ALL 7 native date inputs are affected (sessionDate, nextSessionDate, inlineClientBirthDate, editClientBirthDate, clientBirthDate, sessionDateFrom, sessionDateTo), not just the two reported. Pure CSS-cascade/bidi defect — not a formatter bug."
  artifacts:
    - path: "assets/app.css"
      issue: "no input[type='date'] rule exists; html[dir=rtl]{direction:rtl} (line ~1289) cascades into all 7 native date inputs, reversing WebKit's datetime-edit sub-field order"
  missing:
    - "Shared CSS rule forcing direction:ltr on native date inputs (input[type='date']) so segments always render in browser-native order regardless of document RTL"
    - "RTL-appropriate alignment under html[dir=rtl] (text-align toward the label side) so the LTR value sits naturally under the right-aligned Hebrew label — esp. the full-width #nextSessionDate"
    - "Real-Safari field verification (headless WebKit validated the order fix; label alignment + calendar-icon side need on-device check per reference-rtl-select-value-alignment-headless)"
  debug_session: .planning/debug/rtl-date-input-segments-reversed.md

- truth: "A line combining a Latin-script client name with a Hebrew month-name date reads in correct order in Hebrew mode (name bidi-isolated; date parts not scrambled)"
  status: resolved
  reason: "Fixed by gap plan 38-11 (shared window.DateFormat.isolate First-Strong-Isolate helper, U+2068 … U+2069, empty-safe; wraps both clientName and dateText in updateSessionTitle heading + document.title, plus the overview session-meta and client-modal mixed runs — all textContent-only). RED-first helper test + per-call-site source gates GREEN; suite 130/130. Ben approved on-device 2026-07-07: '38.11 is fine' — heading, tab title, and overview read correctly in Hebrew; the verify-only PDF export header was confirmed OK (NOT flagged, no follow-up). Original report: in Hebrew with month-name format and an English client name, name and date reversed into '2026 במאי dgh • 16' for customer dgh, May 16 2026. Pre-existing."
  severity: major
  test: 7
  root_cause: "Missing bidi isolation at the string-composition site. updateSessionTitle (add-session.js:1698) builds `${clientName} • ${dateText}` as ONE un-isolated text node written to BOTH titleEl.textContent and document.title. date-format.js maybeWrapLtr intentionally LRI/PDI-wraps ONLY numeric formats; month-name Hebrew dates return as bare mixed-direction strings ('16 במאי 2026'). Un-isolated LTR name + bare mixed date under html[dir=rtl] get reordered by the Unicode Bidi Algorithm → '2026 במאי dgh • 16'. Only reproduces with month-name format because the numeric path is already isolated — matches the repro exactly. Same un-isolated ' • ' composition class also at overview.js:799 (date • sessionType) and overview.js:958-961 (age • type)."
  artifacts:
    - path: "assets/add-session.js"
      issue: "line 1698 updateSessionTitle concatenates un-isolated clientName + dateText into textContent AND document.title (plain text — <bdi>/CSS cannot cover document.title; needs string-level Unicode isolates)"
    - path: "assets/overview.js"
      issue: "same bug class: line 799 `${formatDate} • ${sessionType}` session-meta; lines 958-961 age + Hebrew type joined by ' • ' — un-isolated mixed runs"
    - path: "assets/date-format.js"
      issue: "maybeWrapLtr isolates only numeric formats by design (D-07); month-name output is a bare mixed run relying on call sites to isolate — call sites don't"
  missing:
    - "Shared bidi-isolate helper using First-Strong Isolate (U+2068 … U+2069 PDI) — FSI so Hebrew-named clients stay RTL and Latin-named clients stay LTR"
    - "Wrap BOTH clientName and dateText at add-session.js:1698 (covers heading + document.title)"
    - "Treat overview.js:799 and :958-961 in the same pass (same mechanism, lower severity)"
    - "Verify-only: PDF export header (pdf-export.js own UAX#9 HL2 bidi at :285) renders he month-name date + Latin client name correctly — confirm, don't change"
  debug_session: .planning/debug/rtl-client-name-date-line-scrambled.md

- truth: "The incomplete-date block warning is clearly visible, visually distinct from the success toast, and physically close to the #nextSessionDate field"
  status: resolved
  reason: "Fixed by gap plan 38-12: showToast gained a backward-compatible third options param ({ tone, focus }) — an error tone (dark-safe .toast--error via --color-warning-* tokens, distinct from the success toast) with a longer 4000ms dwell (vs 1800ms success) plus auto scroll-to/focus of the offending field. Migrated the add-session.js incomplete-date guard + session/client form error toasts onto it (field-bound ones focus their control; DB/network errorGeneric tone-only); success/info toasts untouched. Ben-approved scope addition (2026-07-07): the same #nextSessionDate save guard now also blocks validity.rangeUnderflow (a typed too-early next-session date) with the new 4-language toast.nextSessionDateTooEarly key, closing the manual-entry bypass of the calendar-only min (D-08 enforced at save). 38-12-toast-tone-focus 3/3, 38-next-session-partial-guard 7/7, full suite 131/131 green. Ben approved on-device in real Safari 2026-07-07: warning distinct + longer + scrolls-to-field, too-early typed date blocked then valid date saves, other form errors behave the same, success toasts unchanged, error toast legible in dark mode and reads naturally in Hebrew RTL. Original report: toast not visible enough — same look as 'completed successfully', corner placement, nobody sees it; expected warnings more visible, clear, and physically close."
  severity: minor
  test: 8
  root_cause: "App.showToast (app.js:838) is single-style: identical rendering for success and error, fixed corner position (.toast, app.css:1268), 1.8s auto-dismiss. No error/warning toast variant exists; the codebase has NO inline field-error pattern at all (no aria-invalid / field-error CSS). The 38-09 guard reused the generic toast (add-session.js:1167), so the block warning inherits success styling and corner placement."
  artifacts:
    - path: "assets/add-session.js"
      issue: "guard at :1167 surfaces the block via the generic success-styled corner toast"
    - path: "assets/app.js"
      issue: "showToast has no tone/variant support (single style, 1.8s auto-dismiss)"
    - path: "assets/app.css"
      issue: "single .toast style; no error variant; no inline field-error styles"
  missing:
    - "showToast error-tone support: visually distinct (warning/red) styling + longer duration than the 1.8s success toast, so errors never look like 'completed successfully'"
    - "Auto-focus mechanism: an error toast tied to a field scrolls to + focuses the problematic field — Ben's confirmed direction 2026-07-07: 'ideally with auto focus to the problematic field. for all error toasts this is relevant' — design the API generalized, not a one-off"
    - "Guard call site add-session.js:1167 migrated: error tone + auto-focus #nextSessionDate"
    - "Existing error-class showToast call sites adopt the error tone; those with an unambiguous target field (e.g. toast.errorRequired, toast.selectClient, toast.issueMissing, toast.heartShieldRequired in the session/client forms) also pass the focus target — success/info toasts unchanged"
  debug_session: ""

