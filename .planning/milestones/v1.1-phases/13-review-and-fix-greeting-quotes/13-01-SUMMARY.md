---
phase: 13-review-and-fix-greeting-quotes
plan: 01
subsystem: ui
tags: [i18n, quotes, content, localization, hebrew, german, czech]

# Dependency graph
requires: []
provides:
  - "41 verified, natural-sounding greeting quotes in EN, HE, DE, CS"
  - "Fixed attribution: no misattributed famous quotes remain"
  - "Hebrew quotes: all neutral/plural — no masculine-only forms"
affects: [overview-page, greeting-display]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Quote structure: { text } for custom, { text, author } for famous"
    - "30 custom + 11 famous = 41 quotes per language"
    - "All 4 languages synced to same quote count in same thematic order"

key-files:
  created: []
  modified:
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js

key-decisions:
  - "Removed Gandhi misquote ('Be the change...') — replaced with original quote"
  - "Removed unverifiable Nelson Mandela quote — no authenticated source found"
  - "Removed unverifiable Dalai Lama exact wording — replaced with original"
  - "Removed paraphrased Thich Nhat Hanh quote — replaced with verified quote"
  - "Added Pema Chodron, Carl Rogers, Howard Thurman, Ralph Waldo Emerson as verified sources"
  - "Hebrew gender: all masculine-only forms (כשאתה) replaced with neutral/plural phrasing"
  - "Hebrew famous quotes section fully replaced to match English quote set"
  - "German/Czech: removed unverifiable Mandela, Gandhi misquote, Camus (unverified), old Brene Brown wording"

patterns-established:
  - "Famous quotes require verified attribution — paraphrases attributed to wrong person must be fixed or removed"
  - "Hebrew quotes: neutral phrasing preferred over gendered forms"

requirements-completed: [QUOTE-01, QUOTE-02, QUOTE-03]

# Metrics
duration: 20min
completed: 2026-03-20
---

# Phase 13 Plan 01: Review and Fix Greeting Quotes Summary

**All 41 greeting quotes rewritten across EN/HE/DE/CS — misattributed famous quotes removed, Hebrew gender neutralized, all 4 languages synced in count and theme**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-20T14:00:00Z
- **Completed:** 2026-03-20T14:20:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Identified and removed 5 misattributed or unverifiable famous quotes across all languages
- Replaced removed quotes with verified attributions (Pema Chodron, Carl Rogers, Howard Thurman, Emerson) or originals
- Fixed all Hebrew masculine-only forms to neutral/plural phrasing
- Fully synced all 4 languages: 41 quotes each (30 custom + 11 famous) in matching thematic order
- All i18n files pass syntax validation

## Task Commits

1. **Task 1: Review and rewrite English quotes + verify attributions** - `2abfb91` (fix)
2. **Task 2: Sync Hebrew, German, Czech quotes** - `89cc8c4` (fix)

## Files Created/Modified

- `assets/i18n-en.js` — English quotes: removed Gandhi misquote, Mandela (unverifiable), Dalai Lama (exact wording unverifiable), paraphrased Thich Nhat Hanh; added verified quotes from Pema Chodron, Carl Rogers, Howard Thurman, Emerson; 2 minor custom phrasing tweaks
- `assets/i18n-he.js` — Hebrew quotes: full sync to English set; all masculine-only forms → neutral/plural; misattributed famous quotes replaced
- `assets/i18n-de.js` — German quotes: synced to English set; unverifiable quotes removed; Rumi, Howard Thurman, Pema Chodron, Carl Rogers, Einstein, Emerson added
- `assets/i18n-cs.js` — Czech quotes: same sync; Jung quote translation corrected ("navíc" → correct verb); all unverifiable attributions removed

## Decisions Made

- Gandhi "Be the change..." is a paraphrase widely misattributed — removed entirely, replaced with original quote capturing same theme
- Nelson Mandela "One light is enough to illuminate all darkness" — not found in authenticated speeches/writings — replaced with original
- "Compassion is the language of the world" attributed to Dalai Lama — exact wording unverifiable — replaced with original
- Thich Nhat Hanh "the real miracle...ordinary things with awareness" — a paraphrase, not a verbatim quote — replaced with verified "The present moment is the only moment available to us..."
- "Courage is not the absence of fear" — actual Mandela quote misattributed to Brené Brown — replaced with original
- Hebrew gender: Priority 1 (neutral) applied throughout — avoided both masculine and feminine singular forms
- Czech Jung quote had wrong verb ("probírá se" = "browses" in modern Czech); corrected to "probouzí se" = "awakens"

## Deviations from Plan

None — plan executed exactly as written. All content changes were within the planned review scope.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 4 QUOTES arrays have 41 quotes each, verified attributions, matching count and theme order
- Hebrew quotes are gender-neutral throughout
- App can display daily quotes normally via getDailyQuote(lang)
- Phase 13 complete — ready to proceed to any next planned phase

---
*Phase: 13-review-and-fix-greeting-quotes*
*Completed: 2026-03-20*
