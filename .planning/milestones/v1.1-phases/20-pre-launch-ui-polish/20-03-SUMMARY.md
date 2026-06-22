---
phase: 20-pre-launch-ui-polish
plan: 03
subsystem: ui
tags: [vanilla-js, legal-pages, license-page, shared-chrome, header, footer, dark-mode]

# Dependency graph
requires:
  - phase: 20-pre-launch-ui-polish
    plan: 02
    provides: "SharedChrome module, header redesign patterns, shared footer"
provides:
  - "Language selector and dark mode toggle on license page"
  - "Shared footer on license page and all 12 legal pages"
  - "Context-aware back links on all legal pages"
  - "License link in shared footer"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SharedChrome.updateBackLinks() for context-aware navigation on legal pages"
    - "SharedChrome.BACK_LINK_STRINGS for localized back link labels"

key-files:
  created: []
  modified:
    - license.html
    - impressum.html
    - impressum-en.html
    - impressum-he.html
    - impressum-cs.html
    - datenschutz.html
    - datenschutz-en.html
    - datenschutz-he.html
    - datenschutz-cs.html
    - disclaimer.html
    - disclaimer-en.html
    - disclaimer-he.html
    - disclaimer-cs.html
    - assets/shared-chrome.js
    - assets/app.css
    - assets/app.js

# Decisions
decisions:
  - id: D-20-03-01
    choice: "Add license link to shared footer rather than restoring header icon"
    why: "Footer is present on all pages, less header clutter, consistent with legal links pattern"
  - id: D-20-03-02
    choice: "Use SharedChrome.updateBackLinks() called on DOMContentLoaded"
    why: "Context-aware navigation without modifying hardcoded HTML in 12 files"

# Deviations
deviations:
  - type: bug-fix
    description: "4 bugs found during visual UAT: (1) birth date picker month names not updating on language switch, (2) legal page back links hardcoded to landing.html, (3) no license page link after header icon removal, (4) EN header wrapping to 2 rows"
    impact: "Additional commit 0919a8c to fix all 4 issues"

# Self-Check
## Self-Check: PASSED
- [x] Language selector and dark mode toggle on license page
- [x] Shared footer on license page and all 12 legal pages
- [x] Context-aware back links (app vs landing based on license state)
- [x] License link accessible via footer
- [x] Header fits single row in EN
- [x] Birth date picker month names update on language switch
---

## Summary

Added language selector popover, dark mode toggle, and shared footer to the license page. Extended the shared footer to all 12 legal pages (4 impressum + 4 datenschutz + 4 disclaimer). During visual UAT, 4 bugs were identified and fixed: birth date picker language sync, context-aware back links, license link accessibility, and header compactness.

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | ad456a2 | feat(20-03): add language selector, dark mode toggle, and footer to license page |
| 2 | 59ff7ca | feat(20-03): add shared footer to all 12 legal pages |
| 3 | 0919a8c | fix(20): resolve 4 UAT bugs — date picker lang sync, context-aware back links, license link in footer, compact header |
