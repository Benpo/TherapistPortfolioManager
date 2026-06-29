---
created: 2026-03-24T12:52:20.891Z
title: License page UI polish — add app chrome
area: ui
files:
  - license.html
  - assets/license.js
---

## Problem

The license page (license.html) has its own minimal layout — no shared header, logo, footer, language selector, or back-to-homepage link. Every other app page has the shared nav/header chrome via App.initCommon(). The license page feels disconnected from the rest of the app.

This was surfaced during Phase 18 discuss-phase when adding the two-mode license page (activated vs. not-activated views). Deferred from Phase 18 to keep scope focused on functional changes.

## Solution

Add shared app chrome to license.html:
- Header with logo (matching other app pages)
- Language selector (globe button)
- Footer with links
- Back-to-homepage navigation
- Ensure RTL/dark mode work correctly with the new layout

Consider whether license.html should use App.initCommon() or a lighter version of it (since license page loads before the app is fully unlocked).
