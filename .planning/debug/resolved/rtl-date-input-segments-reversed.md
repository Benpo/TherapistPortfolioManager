---
status: resolved
trigger: "In Hebrew (RTL) mode, native <input type=\"date\"> fields (#sessionDate and #nextSessionDate in add-session.html) display their segments visually reversed — Safari shows '2026/16/05' (yyyy/dd/mm) for May 16 instead of the browser-native mm/dd/yyyy order. English mode is correct."
created: 2026-07-07T00:00:00Z
updated: 2026-07-07T11:14:00Z
resolved_by: "gap plan 38-10 (direction-based CSS fix; Ben approved on-device in real Safari 2026-07-07)"
---

## Current Focus

hypothesis: CONFIRMED — date inputs inherit `direction: rtl` from html[dir=rtl] (app.css:1289, set by app.js:124 in Hebrew); WebKit renders ::-webkit-datetime-edit sub-fields in that direction, reversing mm/dd/yyyy → yyyy/dd/mm. No `direction: ltr` reset exists on any date input.
test: DONE — grep enumerated 7 date inputs + confirmed no direction reset; Playwright WebKit probe reproduced "2026/16/05" in RTL and corrected it to "05/16/2026" with injected direction:ltr.
expecting: DONE — computed direction rtl↔ltr flips the visual order exactly as predicted.
next_action: Diagnosis complete (find_root_cause_only). Hand off to gap-closure planner — fix direction: force direction:ltr on native date inputs + RTL-appropriate text-align; field-verify in real Safari.

## Symptoms

expected: In Hebrew mode the date inputs keep the SAME segment order as English mode (browser/OS-native order; mm/dd/yyyy in the user's Safari) — the app's RTL styling must not visually reverse the numeric date runs.
actual: Placeholder/value renders as "2026/16/05" (yyyy/dd/mm) — a perfect visual reversal of mm/dd/yyyy. Seen on #sessionDate (תאריך מפגש) and #nextSessionDate at the bottom of the add/edit-session form.
errors: None reported (visual/bidi issue)
reproduction: Serve app locally (running at http://localhost:8038), switch language to Hebrew, open add/edit session (add-session.html), inspect #sessionDate and #nextSessionDate. User observed in real Safari.
started: Believed pre-existing since ~Phase 37 (when native date inputs shipped). Origin phase NOT to be investigated.

## Eliminated

## Evidence

- timestamp: 2026-07-07
  checked: All native date inputs in the app (grep type="date" across *.html + assets/*.js)
  found: |
    5 native <input type="date"> instances, ALL styled with the shared `.input` class (some also `.input-pill`), NONE with any direction reset:
    - add-session.html:86  #sessionDate       (.input .input-pill, required)   ← reported
    - add-session.html:143 #inlineClientBirthDate (.input)  (inline add-client)
    - add-session.html:341 #nextSessionDate   (.input)                          ← reported
    - add-session.html:526 #editClientBirthDate (.input)  (edit-client modal)
    - add-client.html:64   #clientBirthDate   (.input)
    - sessions.html:61/65  #sessionDateFrom / #sessionDateTo (.input .input-pill) (filter range)
  implication: The bug is not specific to the two screenshotted fields — EVERY native date input in the app is affected in Hebrew mode. Any fix must target the shared selector, not just #sessionDate/#nextSessionDate.

- timestamp: 2026-07-07
  checked: assets/app.css for input[type=date] / ::-webkit-datetime-edit rules and any direction reset
  found: |
    ZERO `input[type="date"]` rules. ZERO `::-webkit-datetime-edit*` rules. ZERO `direction: ltr`/`unicode-bidi` on any input. The base `.input`/`.textarea`/`.select-field` rule (app.css:1017-1031) sets only border/padding/color/bg — no `direction` property. `.input-pill` (1077-1082) only radius/size.
  implication: Date inputs have no direction of their own — they inherit the document/ancestor direction.

- timestamp: 2026-07-07
  checked: RTL base-direction rule + how it is applied at runtime
  found: |
    app.css:1288-1290 → `html[dir="rtl"] { direction: rtl; }` sets the document base direction.
    app.js:124 → `document.documentElement.setAttribute("dir", currentLang === "he" ? "rtl" : "ltr")` toggles dir=rtl in Hebrew, dir=ltr otherwise.
    So in Hebrew: <html dir=rtl> → `direction: rtl` → inherited by the un-reset date inputs.
    In English: <html dir=ltr> → `direction: ltr` (default) → segments render browser-native mm/dd/yyyy. Matches the "English is correct" report.
  implication: The RTL base direction is the ONLY differing input between the correct English render and the broken Hebrew render. Strong differential-debugging signal pointing at inherited `direction: rtl`.

- timestamp: 2026-07-07
  checked: Playwright WebKit probe against live app (http://localhost:8038/add-session.html), #sessionDate set to 2026-05-16 (May 16), three states screenshotted + computed-style read
  found: |
    Reproduced the exact reported bug in the WebKit engine (Safari's engine), headlessly:
    - LTR baseline  (html dir=ltr): computedDirection=ltr → screenshot renders "05/16/2026" (native mm/dd/yyyy). CORRECT.
    - RTL reproduce (html dir=rtl, as app.js:124 sets for Hebrew): computedDirection=rtl (inherited, no reset) → screenshot renders "2026/16/05". This is a PIXEL-FOR-PIXEL match of the user's reported "2026/16/05". BUG REPRODUCED.
    - RTL + injected `input[type="date"]{direction:ltr}`: computedDirection=ltr → screenshot renders "05/16/2026" again. FIX DIRECTION VALIDATED.
    computedTextAlign was "start" in both broken and baseline states (never explicitly set); the reversal is driven purely by `direction`, not text-align.
  implication: |
    CONFIRMED root cause: WebKit lays out the native date input's ::-webkit-datetime-edit sub-fields in the element's inherited `direction`. In Hebrew the field inherits `direction: rtl` from html[dir=rtl] (app.css:1289), reversing the LTR mm/dd/yyyy run into yyyy/dd/mm. Forcing `direction: ltr` on the inputs restores native order. Chromium behaves differently (hence "dd/mm/yyyy in Chrome" — its own locale order, unaffected by this specific reversal), which is why a WebKit probe was necessary.

- timestamp: 2026-07-07
  checked: What is verifiable headlessly vs. what needs Ben's real Safari
  found: |
    VERIFIED headlessly (Playwright WebKit == Safari's WebKit engine): the segment reversal, its cause (inherited direction:rtl), and that direction:ltr corrects the ORDER.
    NOT fully verifiable headlessly: (a) the exact `text-align` so the corrected LTR value sits naturally UNDER the RTL label (right side) — .input-pill uses inline-size:auto so #sessionDate shrinks to content and hides alignment effects, while the full-width plain .input #nextSessionDate will show it; project memory `reference-rtl-select-value-alignment-headless` warns computed direction ≠ visual value alignment under the label. (b) the calendar-picker-indicator icon side. (c) behavior on the actual installed PWA / real Safari chrome. These need Ben's on-device check at fix-verification time.
  implication: The fix must pair `direction: ltr` with an RTL-appropriate alignment (text-align) and be field-verified in real Safari on the full-width #nextSessionDate, not just headless.

## Resolution

root_cause: |
  Native <input type="date"> fields have no `direction` of their own, so they inherit the document base direction. In Hebrew the app sets <html dir="rtl"> (app.js:124), and app.css:1289 applies `html[dir="rtl"] { direction: rtl }`. WebKit (Safari) renders the date input's internal ::-webkit-datetime-edit sub-fields in the inherited `direction`, so `direction: rtl` visually reverses the LTR mm/dd/yyyy segment run into yyyy/dd/mm ("2026/16/05"). There is NO `input[type="date"]` / `::-webkit-datetime-edit` rule and NO `direction: ltr` reset anywhere in the CSS, so every native date input in the app is affected in Hebrew. English is correct because <html dir="ltr"> gives the default LTR direction. This is a bidi/CSS-cascade defect, not a date-formatter bug.
fix: |
  DIRECTION (for the gap-closure planner — do NOT implement here): add a CSS rule forcing `direction: ltr` on native date inputs so their segments always render in browser/OS-native order regardless of document RTL. Because there is no date-input-specific selector today, add one (e.g. `input[type="date"]{ direction: ltr; }`), and under `html[dir="rtl"]` pair it with an RTL-appropriate alignment (text-align: right / end-in-ltr) so the value still sits under the right-aligned Hebrew label. Covers ALL 7 native date inputs via the shared selector (#sessionDate, #nextSessionDate, #inlineClientBirthDate, #editClientBirthDate, #clientBirthDate, #sessionDateFrom, #sessionDateTo) — not just the two screenshotted. Field-verify in real Safari (esp. full-width #nextSessionDate alignment + calendar icon side); headless WebKit confirmed order-correction but cannot finalize label alignment.
verification: "Diagnosis only (goal: find_root_cause_only). Root cause reproduced AND fix direction validated headlessly in Playwright WebKit — see Evidence. No production files changed. Fix + real-Safari verification handled by a separate gap-closure plan."
files_changed: []
