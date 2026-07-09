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

## Round 2 — replay of the remediated v3 tour (2026-07-09)

<!--
Round 1 (above) tested the OLD 10-step tour; its 8 gaps were closed by 41-08..41-12
(geometry, 12-anchor, 12-step STEPS[], v3 copy, "?" trim) and the automated gate (41-13
Task 1) is GREEN. Ben then replayed the FIXED v3 tour (41-13 Task 2 human-verify) and
found a NEW round of issues. These are NOT regressions of round 1 — they are next-layer
UX findings, one of which (R2-2) deliberately REVERSES a locked decision (D-07).
Status: awaiting scope/interaction-model confirmation before authoring Round-2 gap-closure plans.
-->

- id: R2-1
  truth: "On long settings screens (Custom Fields, Snippets) the spotlight + step box stay usable and on-screen"
  status: failed
  reason: "User reported: the fields and snippets panels are taller than the laptop viewport, so the spotlight box is huge; the auto-scroll lands in the MIDDLE of the list and the tooltip with the step-count is pushed off-screen — you see a dim overlay with no words until you manually scroll to the top or bottom."
  severity: major
  root_cause: "positionSpotlight sizes the ring to the FULL (very tall) anchor rect; renderSpotlight calls scrollIntoView({block:'center'}) which centers a taller-than-viewport panel so its middle sits at viewport center, and the tethered tooltip (placed above/below the anchor rect, whose top/bottom are now off-screen) is positioned outside the viewport. No viewport clamp keeps the tooltip visible."
  artifacts:
    - path: "assets/tour.js:196-228 (positionSpotlight), 375 (scrollIntoView block:center)"
      issue: "full-panel spotlight + center-scroll bury the tethered tooltip for tall anchors"
    - path: "STEPS[] anchors fields/snippets = whole panel"
      issue: "[data-tour=\"fields\"] / [data-tour=\"snippets\"] point at the entire (tall) panel, not a compact header"
  missing:
    - "Ben's suggestion: for Snippets, the FIRST beat highlights the Text-Snippets section HEADER (compact anchor), not the whole window; a later beat may show the whole panel but never with a giant box."
    - "Engine: for a taller-than-viewport anchor, scroll block:'start' (bring the anchor TOP into view) and CLAMP the tooltip fully inside the viewport so the step-count box is ALWAYS visible."

- id: R2-2
  truth: "The user can interact with the highlighted control during the tour (do it with us), while everything outside the tour stays blocked"
  status: failed
  reason: "User reported (MAIN point): the overlay blocks ALL clicks, so on the date-format step they cannot actually change the format in-tour; on step 7 we say 'you can add a new client' but they cannot open the dropdown to see the 'Add new' row — so they can't believe it. Showing information they must memorize and revisit is wrong; the highlighted field should be usable in place."
  severity: major
  reverses: "D-07 (Page inert during the tour — dim overlay blocks all clicks; the 'Spotlighted element clickable' alternative was explicitly rejected in 41-DISCUSSION-LOG.md:43). Ben: only now, on device, is it clear this is dangerous for UX."
  root_cause: "A4/D-07: the full-viewport .sg-tour-overlay (pointer-events:auto, tour.js:285-288 / tour.css:75-80) intercepts every click — including over the spotlight hole — so the real control beneath is never reachable; the spotlight ring is pointer-events:none and purely visual."
  artifacts:
    - path: "assets/tour.js:285-288"
      issue: "single full-viewport click-capturing overlay makes the whole page inert"
    - path: "assets/tour.css:75-80"
      issue: ".sg-tour-overlay inset:0 pointer-events:auto covers the spotlight hole too"
  missing:
    - "Reverse D-07 to an INTERACTIVE spotlight: replace the single overlay with a 4-panel frame (top/bottom/left/right of the anchor rect) so the anchor rect is a real hole and its control is clickable; everything OUTSIDE the anchor stays blocked (Ben's constraint). Reposition the 4 panels on scroll/resize alongside the ring."
    - "Record the D-07 reversal + refresh the threat note: the reason D-07 existed (tour state can't desync from user actions) is managed because the tour re-measures on reflow and only NAV steps mutate tour state (see R2-3)."

- id: R2-3
  truth: "Where it makes sense, clicking the highlighted target itself advances the tour (an alternative to Next); other steps stay Next-only"
  status: failed
  reason: "User enhancement: on step 2 ('let's go to Settings') they should be able to just click the Settings gear and have the tour continue to step 3 automatically; on the settings-format steps they should be able to click inside, make changes, then proceed. A mix — some steps advance on click, some enforce Next — is explicitly fine."
  severity: minor
  root_cause: "Engine has no per-step 'advance on anchor click' capability; advancing is only via the Next button (buildRow)."
  artifacts:
    - path: "assets/tour.js:168-193 (buildRow), 296-299 (activate)"
      issue: "no advanceOnClick seam; anchor clicks are swallowed by the inert overlay today"
  missing:
    - "Per-step advanceOnClick: navigation/action steps (settings gear → Settings, whole-menu → session form) advance the tour when the target is clicked (intercept the real link → persist resume for the next step → let the cross-page nav proceed / call next()); form + content steps stay Next-only so edits don't accidentally advance. Depends on R2-2 (clicks must reach the anchor first)."

- id: R2-4
  truth: "The save step points at the REAL export control with an honest label"
  status: failed
  reason: "User reported: step 9 says 'this is its icon' with an icon we don't actually use — the real export button has a COLORFUL icon. Drop the fake glyph; say it in plain words, e.g. 'you can share it as a client-ready PDF using the export function on the top' and (optionally) show the real icon in brackets."
  severity: minor
  root_cause: "41-10 inlined a generic monochrome upload SVG glyph in the tooltip (tour.js:354-360) for 'honest deixis', but it is NOT the app's actual export-button icon, so it reads as wrong/foreign."
  artifacts:
    - path: "assets/tour.js:354-360"
      issue: "hardcoded generic SVG glyph, not the real export icon"
    - path: "assets/i18n-*.js help.tour.step.save.body"
      issue: "copy leans on 'this is its icon' deixis for a glyph that doesn't match reality"
  missing:
    - "Remove the inlined generic glyph (or replace with the app's REAL export-icon markup if a glyph is kept); rewrite the save body to plain words pointing at the export function on top, optionally referencing the real icon. Partially reverses 41-10's inline-glyph slice. 4 locales."

- id: R2-5
  truth: "The finish step leads with the Help center as the place that goes deeper, then teases the breadth left to explore"
  status: failed
  reason: "User reported: in step 12 replace the Reporting emphasis with the HELP section — it's more meaningful. Say we didn't cover everything and there's much more to explore, and the help section details it all (a teasing tone). Then, high-level (not full sentences), mention there's more: Reporting, backup-frequency settings, detailed how-tos for things like snippets. Highlight the most meaningful help functionalities in a bit more detail."
  severity: minor
  root_cause: "v3 finish copy leads with 'Reporting one tab along'; Ben wants Help-center-first + a breadth tease (reporting / backup frequency / snippet guides)."
  artifacts:
    - path: "assets/i18n-*.js help.tour.step.help.* / finish.*"
      issue: "finish copy emphasis is Reporting-first, not Help-first"
  missing:
    - "Rewrite the finish/help step copy: Help-center-first + 'there's more to explore' tease naming (high level) Reporting, backup frequency, and how-tos like snippets. 4 locales."

## Round 2 — Summary

total: 5
passed: 0
issues: 5
pending: 0
skipped: 0
blocked: 0
note: "R2-2 reverses locked decision D-07 and R2-2/R2-3 are a real tour-engine change (interactive 4-panel overlay + click-to-advance + tall-anchor scroll/clamp). R2-4 partially reverses 41-10's inline-glyph. Awaiting Ben's confirmation of the interaction model + build path before authoring Round-2 gap-closure plans."
