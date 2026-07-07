---
phase: 33-de-cs-i18n-completion
plan: 01
subsystem: i18n
tags: [i18n, german, de, export-modal, localization, markdown]

# Dependency graph
requires:
  - phase: 31-export-modal-extraction
    provides: "Export modal refactor that left 13 keys falling back to English in i18n-de.js"
provides:
  - "13 native-German string values for the export-modal stepper labels, step helpers, settings-saved notice/dismiss, and Markdown formatting tips in assets/i18n-de.js"
  - "Removal of all 13 placeholder translate-to-German comment lines from i18n-de.js"
affects: [33-02-cs-i18n, 33-03-parity-gate, i18n, export-modal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-01 native-translation-panel: 3 independent native renderings per key, cross-checked, synthesized into one authoritative value"
    - "D-05: Markdown syntax characters (** * # ## dash+space) stay ASCII/untranslated inside localized prose"

key-files:
  created: []
  modified:
    - "assets/i18n-de.js — 13 string VALUES translated to German; 13 placeholder comment lines removed"

key-decisions:
  - "settings.saved.notice = 'Einstellungen gespeichert' to match the shipped settings.saved.toast anchor (D-03)"
  - "settings.saved.dismiss = 'Schließen' (close) over 'Verwerfen' (discard) — the notice is dismissed, not changes reverted"
  - "Stepper labels use parallel verb-infinitive form: Auswählen / Bearbeiten / Exportieren (Bearbeiten matches D-03 anchor)"
  - "Format-help keys include the literal ASCII syntax chars in-line ((**), (*), #/##, (- )) to firmly satisfy D-05 while keeping prose German"

patterns-established:
  - "Faithful-but-natural helper translation: every EN guidance clause preserved (what-to-do + why-it-matters-next + caveats), restructured for German sentence flow (D-04)"

requirements-completed: [I18N-01]

coverage:
  - id: D1
    description: "13 export-modal i18n keys in assets/i18n-de.js carry native-German values; no English fallback and no placeholder markers remain"
    requirement: "I18N-01"
    verification:
      - kind: automated_ui
        ref: "node vm check (Task 1 <verify><automated>): markers gone; 13 keys present as strings; 3 helpers differ from EN; heading retains literal #"
        status: pass
    human_judgment: false
  - id: D2
    description: "German strings render and fit in the live export-modal steps 1-3 (no chip overflow, no clipped helpers) with locale switched to German"
    verification: []
    human_judgment: true
    rationale: "Visual fit/overflow of translated strings in the running app requires human/manual verification; tracked at phase level in Plan 33-03 (D-06 part 2)"

# Metrics
duration: 12min
completed: 2026-07-06
status: complete
---

# Phase 33 Plan 01: German Export-Modal i18n Completion Summary

**13 Phase-31 English-fallback keys in assets/i18n-de.js translated to native German — stepper labels, faithful step helpers, and Markdown tips — with all placeholder markers removed and Markdown syntax chars kept ASCII**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-06
- **Completed:** 2026-07-06
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Translated the 13 export-modal keys (`settings.saved.notice/dismiss`, `export.stepper.label.1-3`, `export.step1-3.helper`, `export.format.help.title/bold/italic/heading/list`) to native German via the D-01 native-translation panel.
- Matched shipped export-modal terminology (Bearbeiten, Vorschau, Weiter, Einstellungen gespeichert) per D-03.
- Preserved every guidance clause in the 3 step helpers (D-04) while restructuring for natural German flow; DE users now get the same amount of help as EN users.
- Kept literal Markdown syntax characters ASCII/untranslated in the format-help keys (`**`, `*`, `#`/`##`, dash+space) so `md-render.js` still parses them (D-05).
- Removed all 13 placeholder `// TODO i18n: translate to German` comment lines.

## Task Commits

Each task was committed atomically:

1. **Task 1: Translate the 13 export-modal keys to German via the D-01 native panel** - `d446880` (feat)

**Plan metadata:** committed with SUMMARY.md + STATE.md + ROADMAP.md + REQUIREMENTS.md

## Files Created/Modified
- `assets/i18n-de.js` - 13 English-fallback string VALUES replaced with native German; 13 placeholder comment lines removed. No key added, renamed, reordered, or removed (555 keys before and after, matching i18n-en.js).

## Decisions Made
- `settings.saved.notice` → "Einstellungen gespeichert" to align exactly with the shipped `settings.saved.toast` anchor (D-03).
- `settings.saved.dismiss` → "Schließen" (close the notice) rather than "Verwerfen" (discard), which would wrongly imply reverting data.
- Stepper labels rendered as parallel verb-infinitives — "Auswählen" / "Bearbeiten" / "Exportieren" — so the chip series reads consistently; "Bearbeiten" reuses the shipped anchor.
- Format-help prose embeds the literal ASCII syntax tokens inline ((**), (*), #/##, (- )) to make D-05 compliance unambiguous while the surrounding words are German.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None. The Task 1 automated vm check passed on first run; key count parity with i18n-en.js (555/555) confirmed no structural drift.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- German side of the export-modal localization is complete. Plan 33-02 (Czech) and Plan 33-03 (bidirectional parity gate + manual German render check via `npm test`) can proceed.
- Manual German render/fit check (D-06 part 2) remains tracked at phase level in Plan 33-03.

## Self-Check: PASSED
- `assets/i18n-de.js` modified and loads as valid JS in vm sandbox (verify passed).
- Commit `d446880` exists in git history.
- 13 keys present as non-empty German strings; 0 `// TODO i18n` markers remain; heading key retains literal `#`/`##`.

---
*Phase: 33-de-cs-i18n-completion*
*Completed: 2026-07-06*
