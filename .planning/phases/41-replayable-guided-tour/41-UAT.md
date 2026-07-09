---
status: diagnosed
phase: 41-replayable-guided-tour
source: [41-01-SUMMARY.md, 41-02-SUMMARY.md, 41-03-SUMMARY.md, 41-04-SUMMARY.md, 41-05-SUMMARY.md, 41-06-SUMMARY.md]
started: 2026-07-08T21:28:46Z
updated: 2026-07-08T21:28:46Z
---

## Current Test

[testing complete — 8 gaps found and diagnosed; narrative gaps (1,6,7) resolved by the Ben-approved 41-STORYLINE.md (all 4 decisions accepted, D-01 re-approved 2026-07-08); gaps 2,3,4,5,8 are code/copy fixes]

## Tests

### 1. Full spine + cross-page resume teaches the path
expected: Tour launches by explicit choice; walks the 10-step spine; page changes feel intentional and teach how to navigate
result: issue
reported: "switching between screens is not straightforward - it just jumps without much explanation. example switching in step 7 to sessions, we dont teach how to get there and what to click on"
severity: major

### 2. Spotlight alignment (Safari)
expected: The spotlight ring sits precisely on the highlighted element
result: issue
reported: "the box is not fully aligned" — step 1 greeting card; green ring offset, card bottom bleeds into the dim
severity: major

### 3. Step 1→2 pacing
expected: Movement between adjacent steps feels smooth
result: issue
reported: "jumping between the hello section (step 1) and add client - its really jumpy, not sure how we can do it smooth(er)"
severity: minor

### 4. Hebrew / RTL positioning
expected: In Hebrew the spotlight + tooltip land on the correct (RTL) side of an off-center anchor
result: issue
reported: "step 1 was flawless but step 2 was trying to find the add client button on the left side while it was appearing on the right side"
severity: blocker

### 5. Step 6 export/PDF reference
expected: Copy references only UI that is on screen
result: issue
reported: "pdf icon doesnt appear"
severity: minor

### 6. Settings coverage
expected: The tour covers the screens a practitioner needs to know
result: issue
reported: "settings is not mentioned at all which is wrong"
severity: major

### 7. Narrative coherence
expected: The story makes sense; each step's framing matches the screen it is on
result: issue
reported: "the fact that the hello is step 1 is maybe nice but not really making sense if we write on the hello section 'Let's walk through running a session, end to end'. its a bit confusing, I was expecting to see a session. We need to really build the story here in a better way."
severity: major

### 8. Help ("?") menu — item count + labels
expected: The "?" menu is a small, non-redundant set of entries; the replayable onboarding is the guided tour
result: issue
reported: "menu shows help center, onboarding screen, take the tour, contact us but it should only be 3 items. the onboarding screen should not be visible after the first time. only the guided tour should be. so probably its just 'Onboarding Tour' or similar and the screen link should be removed."
severity: minor

## Summary

total: 8
passed: 0
issues: 8
pending: 0
skipped: 0
blocked: 0

## Gaps

<!-- Diagnosed. Remediation spec = 41-STORYLINE.md (Ben-approved 2026-07-08). Narrative gaps (1,6,7) are solved by the approved storyline; technical gaps (2,3,4,5) are code fixes. -->

- truth: "Cross-page transitions are narrated and teach the navigation path (not silent teleport)"
  status: failed
  reason: "User reported: screens just jump; step 6→7 (add-session→sessions) doesn't teach how to get there or what to click"
  severity: major
  test: 1
  root_cause: "next() persists resume then _navigate(href) with no teaching; arrival steps anchor to section titles, not the nav tab that brought the user there"
  artifacts:
    - path: "assets/tour.js:95-105,366-385"
      issue: "STEPS[] route + next()/prev() hard-navigate without bridging copy or nav-anchored arrival"
  missing:
    - "Implement 41-STORYLINE.md bridge patterns: 'pressed together' (departing step lights the control that moves you) + 'arrive via the tab' (arrival step lights the now-active nav tab)"
    - "NEW anchors data-tour=nav-sessions / nav-reporting in renderNav (assets/app.js ~142); retire the sessions.html:52 / reporting.html:52 section-title anchors"

- truth: "The spotlight ring aligns precisely with its anchor on first paint (Safari)"
  status: failed
  reason: "User reported: the box is not fully aligned; ring offset from the greeting card, card bottom bleeds into the dim"
  severity: major
  test: 2
  root_cause: "tour.css .sg-tour-spotlight { transition: all 0.32s } animates position AND size from the 0x0 base on first mount; WebKit animates from base so the hole is smaller/offset until it settles"
  artifacts:
    - path: "assets/tour.css:85"
      issue: "transition: all animates width/height/inset on initial mount"
    - path: "assets/tour.js:174-181,309-312"
      issue: "positionSpotlight runs once at render; no first-paint transition suppression, no re-measure after scrollIntoView"
  missing:
    - "Suppress the first-paint transition (snap onto anchor), keep smooth transition only for later scroll/resize reflows; re-measure one rAF after scrollIntoView"

- truth: "Adjacent step-to-step movement is smooth, not jumpy"
  status: failed
  reason: "User reported: step 1 -> step 2 (hello -> add client) is really jumpy"
  severity: minor
  test: 3
  root_cause: "Same transition:all first-paint issue as gap 2, plus two adjacent single-element steps on the home page (double-spotlight)"
  artifacts:
    - path: "assets/tour.css:85"
      issue: "shared with gap 2"
  missing:
    - "Fix first-paint (gap 2); merge the two adjacent home-page button steps into one beat per 41-STORYLINE.md ('Two ways to begin' on NEW data-tour=begin)"

- truth: "In Hebrew, the spotlight + tooltip land on the correct RTL side of an off-center anchor"
  status: failed
  reason: "User reported: step 2 sought the add-client button on the LEFT while it rendered on the RIGHT (RTL mirrored)"
  severity: blocker
  test: 4
  root_cause: "positionSpotlight + tooltip write PHYSICAL getBoundingClientRect coords (r.left = viewport-left) into LOGICAL props insetInlineStart/insetBlockStart; in RTL inset-inline-start == right, so off-center anchors mirror. Step 1 (full-width card) hid it. The arrow's --arrow-x is also logical."
  artifacts:
    - path: "assets/tour.js:178-179,194-196"
      issue: "physical coords assigned to logical inset properties"
    - path: "assets/tour.css:89,120,124"
      issue: "'RTL-safe' comment reflects wrong model; arrow uses inset-inline-start for a physically-measured offset"
  missing:
    - "Position with PHYSICAL left/top/width/height (source coords are physical); make --arrow-x physical/consistent"
    - "Add an off-center-anchor RTL assertion + post-settle geometry check to tests/webkit/41-rtl-geometry.mjs (current probe passed while broken)"

- truth: "Tour copy references only UI that is on screen at that step"
  status: failed
  reason: "User reported: pdf icon doesnt appear"
  severity: minor
  test: 5
  root_cause: "Step 6 (session-save) body says 'look for this export icon' but the spotlight is on the Save button and the PDF control (#exportDownloadPdf) only renders after saving"
  artifacts:
    - path: "assets/i18n-en.js:620"
      issue: "help.tour.step.save.body false deixis"
  missing:
    - "Per 41-STORYLINE.md: rewrite save-step body; ship the export glyph INSIDE the tooltip (approved) so 'this is its icon' is literally true; rewrite HE/DE/CS (flows to 42.1 native pass)"

- truth: "The tour reveals Settings (invisible from the main nav)"
  status: failed
  reason: "User reported: settings is not mentioned at all which is wrong"
  severity: major
  test: 6
  root_cause: "Spine was scoped to the core workflow; Settings has no data-tour anchor and is not in the nav"
  artifacts:
    - path: "settings.html"
      issue: "no data-tour anchor; Settings absent from renderNav"
  missing:
    - "Per 41-STORYLINE.md (approved IN): add step 9 'Making it yours' on NEW data-tour=settings (header gear, assets/app.js ~398); new help.tour.step.settings.* keys x4 locales"

- truth: "The tour tells a coherent story; step framing matches the screen"
  status: failed
  reason: "User reported: opening on the hello card while promising 'running a session end to end' is confusing — expected to see a session; the story needs rebuilding"
  severity: major
  test: 7
  root_cause: "Narrative arc weak; step 1 copy promises something the greeting-card screen doesn't pay off"
  artifacts:
    - path: "assets/i18n-en.js (help.tour.step.*)"
      issue: "step copy lacks a coherent through-line"
    - path: "assets/tour.js:95-105"
      issue: "STEPS[] composition"
  missing:
    - "Implement the approved 41-STORYLINE.md arc ('the path a session travels') end-to-end: step 1 reframe, merged home beat, re-anchored heart/nav steps, settings step, honest finish. D-01 composition change re-approved by Ben 2026-07-08."

- truth: "The '?' menu is a small, non-redundant set — the replayable onboarding is the guided tour, not a welcome-screen replay"
  status: failed
  reason: "User reported: menu has 4 items (Help center / Onboarding screen / Take the tour / Contact us); should be 3 — remove the welcome-screen replay, keep the tour"
  severity: minor
  test: 8
  root_cause: "initHelpEntry adds a 'Replay welcome' action (help.entry.replayWelcome -> AttentionCoordinator.showWelcome(true); Phase 40 Plan 04 / ONBD-02 / D-17) alongside the Phase 41 'Take the tour' row — two redundant onboarding-replay entries"
  artifacts:
    - path: "assets/app.js:518-533"
      issue: "help-entry items[] includes both replayWelcome and takeTour"
    - path: "assets/i18n-en.js:599,647"
      issue: "help.entry.replayWelcome ('Onboarding screen') to remove; help.entry.takeTour label to revise"
  missing:
    - "Remove the help.entry.replayWelcome item from initHelpEntry items[] (and retire the key x4 locales); the showWelcome(true) menu caller goes away — first-run welcome behavior unchanged"
    - "Relabel help.entry.takeTour to fit the app's existing 'guided tour' voice (Ben suggested 'Onboarding Tour'; the welcome CTA already says 'the guided tour' — align, avoid jargon) x4 locales"
    - "Result: Help center / <guided tour> / Contact us = 3 items"
    - "REVERSES Phase 40 D-17 / ONBD-02 (help-menu welcome replay) per Ben's decision 2026-07-08 — note in REQUIREMENTS traceability during gap-closure"

---

## Round 2 — replay of the remediated v3 tour (2026-07-09, CONFIRMED)

<!--
Round 1's 8 gaps were closed by 41-08..41-12; the automated gate (41-13 Task 1) went GREEN.
Ben then replayed the FIXED v3 tour (41-13 Task 2 human-verify) and found a next layer of
UX findings. He first drafted five (R2-1..R2-5) exploring an INTERACTIVE tour, then reconsidered
with Sapir and REVERSED the interactivity. This is the confirmed, decision-aligned record.
Remediation plan: 41-14 (wave 9). Re-verify: re-run of 41-13. EN first; Ben's Hebrew pass follows
once EN is locked.
-->

### CONFIRMED — remediated in 41-14

- id: R2-1
  truth: "On long settings panels (Custom Fields, Snippets) the step box stays fully on screen"
  reason: "Panels are taller than the laptop viewport; renderSpotlight scrollIntoView({block:'center'}) centers the panel so the tethered step box lands off-screen — a wordless dim overlay until you scroll."
  severity: major
  fix: "Engine: for a tall anchor scroll the anchor TOP into view (Ben: 'always scrolled all the way up') and CLAMP the tooltip fully inside the viewport. Keep the big whole-panel spotlight (the 'highlight just the header' idea was dropped). RED-first WebKit box-in-viewport assertion."

- id: R2-4
  truth: "The save step points at the app's REAL export control with an honest label"
  reason: "41-10 inlined a generic monochrome upload SVG; the real export icon is the colourful 📤 on #exportSessionBtn, so the tour's glyph reads as foreign/wrong."
  severity: minor
  fix: "Drop the fake glyph; show the real 📤; reword the body to name the Export button in plain words. 4 locales (EN final-ish; HE/DE/CS machine-draft)."

- id: R2-5
  truth: "The finish step leads with the Help center as 'there's more to explore', then teases the breadth"
  reason: "v3 finish copy leads with Reporting; Ben wants Help-center-first + a high-level tease (backups & their frequency, snippets, Heart-Wall, export formats, and the Reporting tab)."
  severity: minor
  fix: "Rewrite the help step Help-first with a breadth tease. 4 locales."

### REJECTED — explicitly NOT built (Ben + Sapir, 2026-07-09)

- id: R2-2  status: rejected
  what: "Interactive spotlight — reverse D-07 so the highlighted control is clickable in-tour (change date format in place; open the client dropdown to 'believe' Add-new)."
  decision: "NOT built. D-07 STANDS — the page stays inert during the tour. Ben + Sapir: clicking in the app is not intended for the tour; it adds too much complexity and bug risk. The long-panel visibility problem (R2-1) is solved by scroll-to-top instead."

- id: R2-3  status: rejected
  what: "Per-step advance-on-anchor-click (click the Settings gear to advance instead of Next)."
  decision: "NOT built. Depends on R2-2, which is rejected. Advancing stays Next-only."

## Round 2 — Summary

confirmed: 3   (R2-1 engine scroll/clamp, R2-4 save icon+copy, R2-5 help-first copy)
rejected: 2    (R2-2 interactive spotlight, R2-3 click-to-advance — D-07 stands)
remediation: 41-14 (wave 9)
copy: EN provisional (Ben will supply final texts, no planning needed); HE/DE/CS machine-draft → Phase 42.1
reverify: re-run 41-13 (automated) + Ben EN replay; Hebrew pass after EN locked
