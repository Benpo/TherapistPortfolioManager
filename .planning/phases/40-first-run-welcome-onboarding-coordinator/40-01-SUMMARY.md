---
phase: 40-first-run-welcome-onboarding-coordinator
plan: 01
subsystem: i18n
tags: [i18n, onboarding, welcome-overlay, install-nudge, parity-test, vanilla-js]

# Dependency graph
requires:
  - phase: 39-help-center-entry-point
    provides: "help.entry.* popover key block + the vm-sandbox i18n integrity test idiom (39-help-integrity.test.js)"
  - phase: 26-in-app-onboarding-overview-help-system
    provides: "help.welcome.* copy contract (Variant B welcome overlay), inherited verbatim into the UI-SPEC"
provides:
  - "15 new UI-chrome i18n keys in all four locales (en/he/de/cs): welcome overlay ×4, help.entry.replayWelcome ×1, install nudge ×7, mobile expectation hint ×3"
  - "tests/40-i18n-parity.test.js — a static presence/non-empty/parity/no-emoji gate for the 15 keys"
affects:
  - "40-02 (attention coordinator + welcome overlay — consumes help.welcome.*)"
  - "40-03 (install nudge / mobile hint surfaces — consumes onboard.install.* / onboard.mobileHint.*)"
  - "40-04 (initHelpEntry 'Replay welcome' row — consumes help.entry.replayWelcome)"
  - "42.1 help-onboarding-translation (native-speaker review of the HE/DE/CS values authored here)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Key-contract-first: author all data-i18n keys in one isolated plan before the consuming surfaces are built, guarded by a RED-authored parity gate"
    - "Zero-dependency vm-sandbox i18n test loading all four locale maps at once (extends the 39-help-integrity single-locale idiom to a cross-locale parity check)"

key-files:
  created:
    - "tests/40-i18n-parity.test.js"
  modified:
    - "assets/i18n-en.js"
    - "assets/i18n-he.js"
    - "assets/i18n-de.js"
    - "assets/i18n-cs.js"

key-decisions:
  - "Authored HE/DE/CS as register-appropriate drafts (HE noun/infinitive per D-05; DE Sie; CS formal vy) and flagged them for the milestone native-speaker agent review — authoring is the INPUT to that review, not a substitute"
  - "Used raw UTF-8 for the new non-ASCII values (matches the predominant real convention of the locale files — 146 raw-non-ASCII lines already in i18n-de.js — not the \\uXXXX escapes seen on a few nearby help.entry.* lines)"
  - "EN em dashes and straight apostrophes taken verbatim from the 40-UI-SPEC Copywriting Contract (character-for-character), not the file's curly-apostrophe house style, per the verbatim acceptance criterion"

patterns-established:
  - "Cross-locale i18n parity gate: load en/he/de/cs into one vm sandbox, assert presence + non-empty-trim + identical key-set + no-emoji (incl. explicit U+1F4E4 outbox check) for a named key list"

requirements-completed: [ONBD-01, ONBD-02, ONBD-04]

coverage:
  - id: D1
    description: "15 new UI-chrome keys exist, are non-empty, parity-checked, and emoji-free across en/he/de/cs"
    requirement: "ONBD-01"
    verification:
      - kind: unit
        ref: "tests/40-i18n-parity.test.js"
        status: pass
    human_judgment: false
  - id: D2
    description: "tests/40-i18n-parity.test.js is a falsifiable RED-authored parity gate (exits 1 before keys added, 0 after) and joins the full suite"
    requirement: "ONBD-04"
    verification:
      - kind: unit
        ref: "tests/40-i18n-parity.test.js (RED at bd28910 exit 1, GREEN at cc7e3ad exit 0)"
        status: pass
      - kind: integration
        ref: "tests/run-all.js — 137/137 passed"
        status: pass
    human_judgment: false
  - id: D3
    description: "HE/DE/CS translations read naturally and match register (noun/infinitive HE, Sie DE, formal CS) and tone (calm garden voice)"
    requirement: "ONBD-02"
    verification: []
    human_judgment: true
    rationale: "Translation quality/tone is a native-speaker judgment; the plan explicitly flags these values for the milestone native-speaker agent review + Sapir tone review before ship. Automation only proves presence/parity, not fluency."

# Metrics
duration: 12min
completed: 2026-07-08
status: complete
---

# Phase 40 Plan 01: Onboarding i18n Key Contract Summary

**15 new UI-chrome i18n keys (welcome overlay, "Replay welcome" row, install nudge, mobile expectation hint) authored in all four locales behind a RED-first cross-locale parity gate — EN verbatim from the UI-SPEC, HE/DE/CS register-appropriate drafts.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-08 (session)
- **Completed:** 2026-07-08
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- Authored `tests/40-i18n-parity.test.js` — a zero-dependency vm-sandbox gate that loads en/he/de/cs at once and asserts presence + non-empty + identical key-set + no-emoji (with an explicit U+1F4E4 outbox check for the retired iOS banner glyph) for the 15 named keys.
- Verified the gate is falsifiable: it exited 1 with all 15 keys absent (RED, commit bd28910), then exited 0 after Task 2 (GREEN, commit cc7e3ad).
- Added the 15 keys to all four locale files: welcome overlay (`help.welcome.title/subtitle/ctaTour/ctaExplore`), `help.entry.replayWelcome`, install nudge (`onboard.install.title/body/ctaInstall/safariHint/safariLink/dismiss/laterHint`), mobile hint (`onboard.mobileHint.body/link/dismiss`).
- EN values copied character-for-character from the 40-UI-SPEC Copywriting Contract; HE/DE/CS authored to register (HE noun/infinitive per Phase 24 D-05, DE Sie, CS formal) and flagged in-code for native-speaker review.
- Full suite stayed green: 137/137 (131 baseline + the 6 checks the new gate contributes across its files, with zero regressions).

## Task Commits

Each task was committed atomically:

1. **Task 1: Author the RED parity gate** - `bd28910` (test)
2. **Task 2: Author the 15 keys across all four locale files** - `cc7e3ad` (feat)

## Files Created/Modified
- `tests/40-i18n-parity.test.js` - New static parity gate (presence/non-empty/parity/no-emoji) for the 15 new keys.
- `assets/i18n-en.js` - EN canonical values (verbatim from UI-SPEC) for the 15 keys.
- `assets/i18n-he.js` - Hebrew (noun/infinitive, D-05) values; flagged for native-speaker review.
- `assets/i18n-de.js` - German (Sie) values; flagged for native-speaker review.
- `assets/i18n-cs.js` - Czech (formal) values; flagged for native-speaker review.

## Decisions Made
- **Raw UTF-8 over `\uXXXX` escapes for new non-ASCII values.** The nearby `help.entry.*` lines happened to use escapes, but the locale files predominantly store raw UTF-8 (146 raw-non-ASCII lines already in `i18n-de.js`, e.g. `"Übersicht"`, `"Nächste Sitzung"`; CS `"Přehled"`). Raw UTF-8 matches the file's real convention and is functionally identical (files load as UTF-8).
- **EN punctuation taken verbatim from the UI-SPEC** (straight apostrophes in "I'll"/"won't", raw em dashes) rather than the file's curly-apostrophe house style, because the acceptance criterion requires character-for-character match with the Copywriting Contract.
- **HE/DE/CS authored as flagged drafts, not final.** In-code comments mark each block for the milestone native-speaker agent review + Sapir tone review (per the phase's language scope and D-14 tone note).

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None. (One no-op Edit call was made while deciding on escape-vs-raw-UTF-8 style; resolved by confirming the files' predominant raw-UTF-8 convention — no code impact.)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The key contract is stable and green: Plans 02–04 can build the welcome overlay, install nudge / mobile hint, and "Replay welcome" row against existing `data-i18n` keys with no missing-key risk (the parity gate guards drift).
- Outstanding before ship (not a blocker for the build plans): HE/DE/CS values need the milestone native-speaker agent review + Sapir tone pass. Flagged in-code and in `key-decisions`.

---
*Phase: 40-first-run-welcome-onboarding-coordinator*
*Completed: 2026-07-08*

## Self-Check: PASSED
- FOUND: tests/40-i18n-parity.test.js
- FOUND: 15 new keys in i18n-en/he/de/cs.js
- FOUND: commit bd28910 (test), cc7e3ad (feat)
