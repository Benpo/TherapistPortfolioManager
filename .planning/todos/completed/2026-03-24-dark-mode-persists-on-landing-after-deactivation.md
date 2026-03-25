---
title: Dark mode persists on landing page after license deactivation
priority: low
source: UAT Phase 19
created: 2026-03-24
---

## Issue

When a user is in dark mode, deactivates their license, and gets redirected to the landing page, the landing page stays in dark mode with no way to switch back (no theme toggle on landing page).

## Options

1. Add a theme toggle to the landing page header
2. Reset theme to light on deactivation (alongside other localStorage cleanup)
3. Both

## Context

Landing page currently reads `portfolioTheme` from localStorage for theme but has no UI to change it. The theme toggle only exists in the app pages.
