---
created: 2026-07-08T00:30:00.000Z
title: Sapir human read of the rendered help.html — D-19 final sign-off (pinned during 39-06 close-out)
area: content
priority: medium
recommended_entry: manual (Sapir reads help.html in a browser)
target_phase: post-Phase-39 (v1.3, before the milestone ships)
files:
  - help.html
  - assets/help-content-en.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
source: Phase 39 Plan 06 close-out — Ben's explicit decision 2026-07-08 ("put a pin on that"). The D-19 pipeline gates (A factual, B native-EN, C App-DNA, + locale chrome gate) all ran and their findings were applied during the 39-06 checkpoint; the remaining D-19 step is Sapir's own human read of exactly what practitioners see on the rendered page.
---

## What this is

D-19 (help content review) has five steps. Steps 1–4 — Gate A (factual, opus), Gate B (native-EN, sonnet per D-20), Gate C (App-DNA/terminology, sonnet), and an extra HE/DE/CS chrome-string gate — all ran during the 39-06 Task 3 checkpoint and every finding was applied (fix commits 9140182, 541ecf2). Step 5 — **Sapir reads the rendered `help.html` in a browser and signs off (or lists fixes)** — was deliberately DEFERRED by Ben at plan close-out. Phase 39 shipped with all wording still subject to this review.

Ben personally verified the Safari + RTL rendering (2026-07-07/08); this pin is specifically about Sapir's editorial/voice read of the copy, not the visual render.

## Flagged wording items to look at during the read

These are the specific spots the gate pipeline touched or made a judgment call on — worth Sapir's eye:

1. **`help.search.noMatch` wording** — the calm "write to us" no-match fallback. Gate B endorsed the current phrasing as-is, but it was a plan-vs-UI-SPEC choice; confirm it reads right in Sapir's voice.
2. **Snippets phrasings** — the snippets help coverage was expanded mid-checkpoint (commit dd2bc51, "make-it-yours" + topic depth). Fresh copy that hasn't had a human editorial pass.
3. **`help.deeplink.readDashboard` reports-word override (×4 locales)** — the Reporting empty-state string references each locale's *reports* word (`nav.reporting`), NOT the *overview*/dashboard word the reviewers originally suggested. This was an orchestrator override because the string renders on the Reporting page. Confirm each locale (EN/HE/DE/CS) reads naturally.
4. **"First Name *" asterisk rendering inside `.ui-label` chips** — `{ui:key}` labels now render as soft chips (commit 4dd8d67). Where a live label carries a required-field asterisk (e.g. "First Name *"), check the asterisk renders sensibly inside the chip and doesn't read as a typo or stray glyph.
5. **General terminology pass** — Gate C already fixed a "dashboard" drift back to the canonical "Overview"; Sapir should confirm terminology is consistent (Session Format / Heart-Wall / client / session, never patient/treatment) across every rendered topic.

## Acceptance

- Sapir has read the rendered `help.html` (EN body + the chrome in each locale) in a real browser and either approves as-is or lists specific wording fixes.
- Any fixes land as follow-up edits to the owning content files (help-content-en.js for body; the i18n-*.js files for chrome strings).
- The 4-locale chrome strings stay in parity after any edits.
