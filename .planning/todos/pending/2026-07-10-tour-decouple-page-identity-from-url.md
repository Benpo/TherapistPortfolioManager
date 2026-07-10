---
created: 2026-07-10T23:30:00Z
title: "Decouple tour page-identity from URL spelling (data-page attribute) — hardening for the clean-URL hotfix"
area: tour
severity: low
source: v1.3 tour cross-page resume bug (260710-tcu hotfix)
---

## Context

The tour identifies which page it's on by parsing `location.pathname`'s last
segment and comparing it against `STEPS[].page` (`.html` filenames). On
Cloudflare Pages that broke, because CF serves CLEAN/extensionless URLs
(`/settings.html` 308-redirects to `/settings`) — so `currentPage()` returned
`"settings"` while STEPS said `"settings.html"`, every cross-page page-check
failed, and the tour silently no-op'd past step 2 in production (steps 3–12
dead). See `.claude/context/2026-07-10_tour-resume-bug-findings.md`.

**Already fixed (260710-tcu):** `currentPage()` (`assets/tour.js`) now
canonicalizes a dotless (clean-URL) segment back to its `.html` id, so all four
page-checks (`next`/`prev`/`start`/`resume`) and the "Take me there" fallback
match again. Regression guard: `tests/quick-260710-tcu-tour-cleanurl-resume.test.js`
(stubs a clean URL — the one thing the rest of the suite never did).

## Why this is still worth doing (the deeper fix)

The hotfix keeps page-identity coupled to **URL spelling**. That coupling stays
fragile to host quirks the string-parse can't anticipate:

- trailing-slash variants (`/settings/`) — the hotfix's `filter(Boolean)` covers
  the one known case, but it's still guessing at URL shapes;
- a future host that rewrites differently, sub-path deploys, or a page served at
  a path whose basename ≠ its `.html` id;
- anyone reading the code has to know CF's clean-URL behavior to understand why
  the `.html` re-append exists.

The **correct** design identifies each page by an explicit, stable token that
does NOT depend on how the URL is spelled.

## Proposed approach

1. Stamp each shipped page with an explicit identity, e.g.
   `<body data-page="settings">` (one attribute per root `*.html`:
   index/settings/add-session/sessions, plus any tour ever visits).
2. Change `STEPS[].page` to those tokens (`'settings'`, not `'settings.html'`).
3. `currentPage()` reads `document.body.dataset.page` (fallback to the current
   pathname-parse only if the attribute is absent, for safety during rollout).
4. Once every tour-visited page carries the attribute, the URL parse — and its
   host-specific `.html` gymnastics — can be deleted entirely.

Net: the tour stops caring whether the URL is `/settings`, `/settings.html`, or
`/settings/`. Immune to clean-URL rewrites and trailing slashes by construction.

## Cost / why it was deferred

Touches every root `*.html` `<body>` plus the STEPS table and the test that
pins page-identity — larger surface than a one-line hotfix. Correctly judged
too much to introduce blind into a live-production night hotfix (Ben's call,
2026-07-10). Do it in a calm session; keep the existing clean-URL regression
test green throughout, and add one asserting `currentPage()` reads `data-page`.
