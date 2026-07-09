---
phase: 41-replayable-guided-tour
plan: 11
subsystem: i18n / guided-tour copy
tags: [i18n, tour, copy, storyline, l10n, parity-gate]
status: complete
requires:
  - "41-09 (12-anchor tour contract — the anchors this copy narrates)"
  - "41-STORYLINE.md v3 (single source of truth for every step title/body)"
provides:
  - "help.tour.step.* copy for the 12-step v3 settings-first storyline in all 4 locales"
  - "realigned 4-locale parity gate (43 keys) enforcing the 12-id step set"
affects:
  - "41-10 (STEPS[] must reference these 12 i18nKey suffixes)"
  - "41-13 (EN/HE storyline human-verify re-run reads this copy)"
  - "42.1-help-onboarding-translation (HE/DE/CS machine-draft native pass)"
tech-stack:
  added: []
  patterns:
    - "Locale block regenerated via a throwaway Node script (raw UTF-8 for HE/DE, \\u-escape for CS) to avoid hand-escaping errors"
key-files:
  created: []
  modified:
    - "tests/41-tour-i18n-parity.test.js (STEP_IDS → 12-id v3 set; 39 → 43 keys)"
    - "assets/i18n-en.js (EN canonical copy, 24 step keys)"
    - "assets/i18n-he.js (HE machine-draft)"
    - "assets/i18n-de.js (DE machine-draft, Sie)"
    - "assets/i18n-cs.js (CS machine-draft, formal, \\u-escaped)"
decisions:
  - "D-11 upheld: all 4 locales authored this phase; HE/DE/CS machine-draft flagged in-file for the Phase 42.1 native pass (explicitly deferred)."
  - "'add them right here' (storyline verbatim) reworded to 'add them here on the spot' in EN to satisfy the explicit no-directional-word grep gate (\\bright\\b) — idiomatic, not spatial, meaning preserved."
metrics:
  duration: ~35m
  completed: 2026-07-09
---

# Phase 41 Plan 11: Storyline Tour Copy (4 locales) + Parity Gate Realign Summary

Recomposed the guided-tour copy to the Ben-approved v3 settings-first storyline (12 steps) across EN/HE/DE/CS and realigned the 4-locale parity gate to the new 12-id step set (43 keys) — the tour now reads "first make this place yours, then walk the path a session travels," closing UAT gaps 1/5/6/7.

## What was built

- **Task 1 (RED):** `tests/41-tour-i18n-parity.test.js` STEP_IDS replaced with the 12-id v3 order (`overview, settings, personalize, fields, snippets, ready, setup, heart, save, sessions, backup, help`); retired `addClient/startSession/reporting` step ids, added `settings/personalize/fields/snippets/ready`; key total 39 → 43. Ran RED as designed until the copy landed.
- **Task 2 (EN canonical):** authored the 12 step titles+bodies verbatim from 41-STORYLINE.md v3 §3 — reframed overview (two-part promise, dropped false "end to end"), the new settings chapter (gear/personalize/fields/snippets/ready), arrival-confirming setup, honest save deixis ("this is its icon"), arrive-via-tab Sessions bridge, backup recency-color, and a Reporting-mentioning tour-replay finish. Retired the 3 old step keys.
- **Task 3 (HE/DE/CS):** mirrored the exact key changes and meaning as machine-draft translations (HE noun/infinitive, DE Sie, CS formal + `\u`-escaped), quoting each locale's own real `nav.*`/`settings.tab.*` labels, preserving Ben's fields + snippets emphases, no left/right words. Parity gate → GREEN.

## Verification

- `node tests/41-tour-i18n-parity.test.js` → 4 passed, 0 failed (43 keys × 4 locales: presence + non-empty + parity + placeholder tokens + no-emoji).
- `node tests/run-all.js` → 152 passed, 0 failed, 152 total.
- EN acceptance greps: overview contains "the path a session travels" and 0× "end to end"; bridges "step inside" / "open a session together" / "through the Sessions tab" / "One tab along" all present; fields "Nothing you disable is ever deleted" + "make the form truly your own"; snippets "Text Snippets" + "a sentence, a keyword"; save "this is its icon" and 0× "look for this export icon"; 0 left/right words in step bodies.
- Per-locale: 5 new keys present + 0 retired keys in each of HE/DE/CS; bridge phrases + real labels present; 0 left/right directional words (checked left/right/links/rechts/vlevo/vpravo).

## Deviations from Plan

### Auto-fixed / adjustments

**1. [Rule 3 - Blocking] EN "add them right here" reworded to satisfy the no-directional-word gate**
- **Found during:** Task 2 verification.
- **Issue:** The storyline's verbatim setup body ("you can add them right here") tripped the plan's explicit `\b(left|right)\b` = 0 acceptance grep. "right here" is idiomatic (immediacy), not spatial, but the gate is a hard binary.
- **Fix:** Reworded to "you can add them here on the spot" — preserves meaning and immediacy, satisfies the gate, and keeps the storyline intent (RTL-safe, direction-neutral).
- **Files modified:** assets/i18n-en.js. Same neutral phrasing applied in HE/DE/CS.
- **Commit:** 4d789b6

**2. [Acceptance-criteria imprecision — noted, no code change] parity-test retired-id grep**
- Task 1's acceptance said `grep -c "addClient\|startSession\|reporting" tests/41-tour-i18n-parity.test.js` = 0, but the test legitimately retains `help.tour.finish.addClient` and `help.tour.finish.startSession` (unchanged finish-card contract). The retired **step** ids are gone (STEP_IDS is clean); the 2 residual matches are the finish-card keys, which must stay. Intent satisfied.

**3. [Tooling] Locale blocks regenerated via a throwaway Node script**
- To avoid hand-escaping errors (CS `\u` convention) and Unicode Edit-matching fragility, HE/DE/CS step blocks were spliced in by a one-shot Node script (raw UTF-8 for HE/DE, `\u`-escape for CS). One iteration fixed an HE `ready.body` that used ASCII double-quotes around labels inside a double-quoted JS string (matched EN's no-quotes-around-labels style).

## Known Stubs

None. All 24 step values are authored non-empty strings. HE/DE/CS are machine-draft (flagged in-file for the Phase 42.1 native-speaker pass) — this is the D-11 precedent, not a stub.

## Self-Check: PASSED

- assets/i18n-en.js, i18n-he.js, i18n-de.js, i18n-cs.js, tests/41-tour-i18n-parity.test.js — all present and modified.
- Commits e59874a (Task 1), 4d789b6 (Task 2), b061e50 (Task 3) — all in git log.
- Parity gate GREEN (43 keys); full suite 152/152.
