---
plan: 05-03
phase: 05-legal-and-production-packaging
status: checkpoint_pending
checkpoint_type: human-verify
completed_tasks: 1
total_tasks: 2
last_updated: "2026-03-14"
---

# Plan 05-03: Marketing Landing Page — Summary

## What Was Built

**Task 1: Landing page with marketing content, legal pages, and purchase flow** ✓

Created 3 new files (1092 lines total, committed bdb6c55):

- **landing.html** (259 lines) — Hero section, 6-feature grid, pricing card (EUR 49 one-time), Impressum with eRecht24 TODO placeholder, Datenschutzerklaerung (GDPR Art. 13/14), footer with legal links. Includes SW registration and manifest link.
- **assets/landing.js** (387 lines) — LANDING_I18N object with all strings in EN/HE/DE/CS, language detection/switching, RTL toggle, smooth scroll, theme detection, Lemon Squeezy placeholder URL with TODO comments.
- **assets/landing.css** (446 lines) — Hero, features grid (1→2→3 col responsive), pricing card, legal sections, footer — all via CSS logical properties for RTL, dark mode support.

## Checkpoint Pending

**Task 2: Verify complete Phase 5 end-to-end flow** — requires human verification across all 3 plans.

See 05-03-PLAN.md Task 2 for the 13-step verification checklist.

## Key Files

- `landing.html` — Marketing landing page (public entry point)
- `assets/landing.js` — i18n, language switching, Lemon Squeezy integration
- `assets/landing.css` — Landing-specific styles with RTL + dark mode

## Decisions Made

- Lemon Squeezy direct link approach (no SDK overlay for v1) — simpler, no JS dependency
- Impressum uses placeholder with eRecht24 generator TODO — Sapir to fill in personal details
- Datenschutzerklaerung covers Cloudflare hosting + Lemon Squeezy payment disclosures
- Price shown as EUR 49 with TODO comment to update after Lemon Squeezy product creation
