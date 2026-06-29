---
created: 2026-03-24T19:48:43.481Z
title: Add app footer with contact email and legal links
area: ui
files:
  - index.html
  - sessions.html
  - reporting.html
  - add-session.html
  - add-client.html
  - landing.html (reference for footer design)
---

## Problem

The app has zero user-facing support or legal elements beyond the navigation bar. No footer, no contact email, no link to Impressum/Datenschutz, no version indicator. Users (non-technical therapists) have no way to reach support or find legal information from within the app. The landing page has a full footer — the app should have a matching one.

## Solution

Add a simple, subtle footer to all 5 app pages (index, sessions, reporting, add-session, add-client) matching the landing page footer's design language:

- **Contact email:** contact@sessionsgarden.app (mailto link)
- **Legal links:** Impressum and Datenschutz (pointing to correct per-language versions once Phase 19 creates them)
- **Version number:** "Sessions Garden v1.1"
- **Must respect:** i18n (4 languages), RTL layout, dark mode tokens
- **Design:** Subtle, not prominent — small text, muted colors, consistent with garden theme. Adapt from landing.html footer pattern, not copy verbatim (app context is different from marketing).

Scope is intentionally minimal — no help center, no FAQ, no onboarding. Just the essentials for a user to find support and legal info.
