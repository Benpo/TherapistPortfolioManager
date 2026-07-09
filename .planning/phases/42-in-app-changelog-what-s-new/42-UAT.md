---
status: testing
phase: 42-in-app-changelog-what-s-new
source: [42-VERIFICATION.md]
started: 2026-07-09T19:10:00Z
updated: 2026-07-09T19:10:00Z
---

## Current Test

number: 1
name: Offline What's-New popup + changelog page on a real device/PWA
expected: |
  After a version change (bump or simulate), launching on any of the 9 chrome-mounting
  pages — fully offline — shows the What's-New popup exactly once (modest centered modal,
  latest entry's highlights). Dismiss/Close/Esc/"See everything new" all record the version
  (no reappearance). /changelog loads and renders fully offline, reverse-chronological,
  version+date grouped.
awaiting: user response

## Tests

### 1. Offline What's-New popup + changelog page on a real device/PWA
expected: Popup fires exactly once after a version change on any chrome-mounting page while fully offline; every deliberate dismiss path records the version; /changelog renders fully offline (reverse-chronological, version+date grouped).
result: [pending]

### 2. Visual pass — light/dark theme + RTL (Hebrew) for popup and changelog page
expected: Popup is a modest ~420px centered modal (not full-screen); New/Improved/Fixed category headings use correct color tokens in both themes; RTL logical properties mirror correctly with no LTR artifacts in the RTL heading area.
result: [pending]

### 3. Triage the three code-review WARNING findings (42-REVIEW.md)
expected: Ben decides disposition for each — fix-now, defer (e.g. Phase 43 or quick task), or accept: WR-01 changelog.html omits tour.js/tour.css (dead "Onboarding Tour" popover row + dead tour-reminder Start button on that page); WR-02 anchor deep-links race async render (latent, currently invisible); WR-03 hardcoded English "Version" label bypasses D-17 chrome-i18n.
result: pass — Ben chose fix-now for all three (2026-07-09, AskUserQuestion). Fixed in 3a4f16f (WR-01), 319497f (WR-02), 856dc69 (WR-03); suite 162/162 green; see 42-REVIEW-FIX.md (status all_fixed).

## Summary

total: 3
passed: 1
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
