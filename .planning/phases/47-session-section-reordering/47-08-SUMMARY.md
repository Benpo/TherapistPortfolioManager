---
phase: 47-session-section-reordering
plan: 08
subsystem: docs-help-changelog
status: complete
tags: [help, changelog, docs-gate, i18n, locale-mirrors, copy-review]
requires:
  - "Shipped Phase-47 behavior from 47-03/47-04/47-05/47-07/47-09/47-10 (the content source of truth)"
  - "i18n keys settings.reorder.*, settings.reset.*, settings.row.afterSeverity.*, session.form.severityAtStart, export.section.topics, export.suboption.includeSeverity (47-02)"
provides:
  - "New help topic make-it-yours/topic-reordering (the headline reorder feature) in EN + HE/DE/CS"
  - "New help topic severity/topic-turn-off (the mandated how-to-turn-severity-off entry) in EN + HE/DE/CS"
  - "v1.5.0 changelog entry (4-part reorder/severity user story, unrated-by-default model) in all four locales"
  - "Updated topics: sections-on-off, renaming, before-after, single-export, export-formats, multiple-issues, backup-restore"
  - "HELP-MAP.md rows for the two new topics (regenerated via scripts/gen-help-map.js)"
  - "Docs-gate satisfaction: EN help edit + EN changelog edit in the pushed range"
affects:
  - assets/help-content-en.js
  - assets/help-content-he.js
  - assets/help-content-de.js
  - assets/help-content-cs.js
  - assets/changelog-content-en.js
  - assets/changelog-content-he.js
  - assets/changelog-content-de.js
  - assets/changelog-content-cs.js
  - HELP-MAP.md
  - tests/changelog-integrity.test.js
tech-stack:
  added: []
  patterns:
    - "EN is the corpus of record — locale files mirror EN keys/ids/version byte-identically for structure, translated for prose"
    - "HELP-MAP.md is generated (scripts/gen-help-map.js), never hand-finalized — hand rows were replaced by a regeneration"
    - "Changelog latest-version marker in changelog-integrity.test.js advances with each staged release entry"
key-files:
  created: []
  modified:
    - assets/help-content-en.js
    - assets/changelog-content-en.js
    - HELP-MAP.md
    - tests/changelog-integrity.test.js
    - assets/help-content-he.js
    - assets/help-content-de.js
    - assets/help-content-cs.js
    - assets/changelog-content-he.js
    - assets/changelog-content-de.js
    - assets/changelog-content-cs.js
decisions:
  - "Release version confirmed by Ben at the checkpoint: 1.5.0 (anchor v1-5); APP_VERSION bumped externally in 8c82385"
  - "PDF severity placement documented as deletion-aware only (count-based), per the post-planning code-review ruling — no manual-reordering or duplicate-heading claims"
  - "Heart-wall topics + topic-new-session reviewed and declared UNAFFECTED (the D-02 restructure moves their sections but changes no behavior they document)"
requirements-completed: [ORDR-06, ORDR-07, ORDR-08]
metrics:
  duration: ~50min active (checkpoint-spanning, 2026-07-23 → 2026-07-24)
  completed: 2026-07-24
  tasks: 3
  files: 10
---

# Phase 47 Plan 08: Docs Pass — Help Topics + v1.5.0 Changelog Summary

The planner-owned D-18 documentation pass: a new "Reordering sections" help topic
and the mandated "Turning severity ratings off" topic, seven updated existing
topics, and the 4-part v1.5.0 changelog user story — drafted in EN (the corpus of
record the docs-gate reads) and mirrored natively in HE/DE/CS, with HELP-MAP.md
regenerated. Ben reviewed the copy at the blocking checkpoint and approved with
version 1.5.0; the content then reached its FINAL state through the 47-11 gap
plan and Ben's direct fixes (see Checkpoint Resolution below).

## What Was Built

**Task 1 — EN corpus (`c2d5b81`)**
- NEW `make-it-yours/topic-reordering` (P1): drag handle + up/down arrows,
  renamable groups that drag as a block, off-keeps-its-slot, Reset order / Reset
  names, order mirrored into the form and exports.
- NEW `severity/topic-turn-off` (P1): the Issue-severity row is one switch for
  all severity ratings (off hides the end-of-session section and the per-topic
  start rating; topics stay); its drag position sets where end-of-session
  ratings appear in form and exports. Seeded from the ⓘ explainer copy
  (`settings.row.afterSeverity.info`).
- UPDATED `topic-sections-on-off` (rows keep their slot), `topic-renaming`
  (group renames + Reset names), `topic-before-after` (unrated-by-default,
  tap-again-to-clear, start-clear voids the end rating, unrated omitted from
  exports/views; label ref repointed `session.form.beforeSeverity` →
  `session.form.severityAtStart`), `topic-single-export` + `topic-export-formats`
  (topics/severity include choice, sections in saved order, deletion-aware
  severity-block placement — described count-based only per the docs-accuracy
  ruling), `topic-multiple-issues` (ratings optional per topic, unrated shows
  name only in views), `topic-backup-restore` (restore brings back section order
  + group names).
- NEW v1.5.0 changelog entry: the 4-part D-18 story updated to the D-19…D-23
  unrated-by-default model (reordering; app-level severity switch; tap-again-to-
  clear; unrated out of exports + name-only views + export topics/severity
  split). None of the out-of-changelog internals (clamp, sanitization/migration,
  drag internals, RTL math, label micro-renames) are mentioned.
- HELP-MAP.md regenerated via `scripts/gen-help-map.js` with the two new rows
  (topic-reordering → assets/add-session.js, assets/settings.js, settings.html;
  topic-turn-off → add-session.html, assets/settings.js).

**Task 2 — HE/DE/CS mirrors (`f4c9aa6`)**
- Both new topics, all seven updated topics, and the v1.5.0 changelog entry
  translated natively into Hebrew, German, and Czech — identical ids/keys/
  version/anchor to EN, `{ui:...}` tokens byte-identical (locale parity gates).
- HE keeps דרגת חומרה severity terminology and reads RTL.

**Task 3 — Ben's review checkpoint (resolved 2026-07-24)**
- Approved. Version confirmed: **1.5.0** (anchor `v1-5`).

## Checkpoint Resolution + Final Content State

The copy Ben approved is the CURRENT file state, which includes post-checkpoint
revision rounds committed by other agents on top of Tasks 1–2 — this plan's
drafts were the base, not the final wording:

- `8c82385` — APP_VERSION bumped to 1.5.0 (external to this plan's scope; the
  release boundary the version-bump convention defines).
- `9142f93` / `4eda604` (gap plan 47-11) — HE terminology aligned (מקטע → שדות
  across help + i18n) and the 1.5.0 changelog entry restructured around headline
  changes in all four locales.
- `7d7f57b` — Ben's HE typo fix (בחזרה לללא-דירוג, both surfaces).
- `aa7d848` — final lede rewrite in all four locales per Ben's read (dragging
  phrasing, dropped a grouping overclaim, names the app-wide severity switch).

Ben's verdicts on the final state: Hebrew "way better", lede "seems perfect".
The content files are final — not re-edited by this plan's close-out.

## Unaffected-After-Review Declarations (G-14, for the coverage audit)

Reviewed and explicitly declared UNAFFECTED (no edit needed):
- `heart-wall/topic-heartwall-workflow` and `heart-wall/topic-heartwall-removal`
- `starting-a-session/topic-new-session`

Rationale: the D-02 form restructure moves the sections these topics describe,
but changes no behavior they document — their steps reference controls by
`{ui:...}` label, not by position, so the copy stays accurate.

## Deviations from Plan

**1. [Rule 3 — blocking] Advanced the changelog-integrity latest-version marker (tests/changelog-integrity.test.js, in `c2d5b81`)**
- **Found during:** Task 1 verification.
- **Issue:** The test hard-codes the newest entry's version (`1.4.0`); prepending
  the 1.5.0 entry reddened it, blocking the full-suite-green gate.
- **Fix:** Marker advanced `1.4.0 → 1.5.0` with the comment updated — the same
  documented release-boundary advance Phase 45 made for 1.3→1.4. Ben's 1.5.0
  confirmation at the checkpoint retroactively validated the provisional number.

**2. [Rule 3 — blocking] HELP-MAP.md hand rows replaced by regeneration (in `c2d5b81`)**
- **Found during:** Task 1 verification.
- **Issue:** `help-integrity.test.js` asserts HELP-MAP.md matches a fresh
  `scripts/gen-help-map.js` regeneration — hand-added rows (differing covers
  ordering) failed the freshness gate.
- **Fix:** Ran the generator; the generated rows carry the same two new topics
  with canonical covers ordering.

## Verification (re-run against the FINAL post-47-11 file state, 2026-07-24)

- `node --check` on all 8 content files — OK.
- `help-integrity.test.js` — 14/14; `changelog-integrity.test.js` — 10/10.
- `help-integrity-locale.test.js` — 31/31; `changelog-integrity-locale.test.js`
  — 36/36 (structure/token/version parity of HE/DE/CS against EN holds after
  every revision round).
- `npm test` full suite — **218 passed, 0 failed**.
- Greps: `topic-reordering` + `topic-turn-off` present in help-content-en.js and
  HELP-MAP.md; changelog-content-en.js first entry is `1.5.0`; help-content-en.js
  references `session.form.severityAtStart` and no longer references
  `session.form.beforeSeverity`; changelog entry mentions no out-of-scope
  internals.
- Docs-gate expectation satisfied: the pushed range carries an EN help edit AND
  an EN changelog edit — the two demands the gate checks.
- Comment hygiene: no planning IDs in any shipped content diff (grep sweep).

## Known Stubs

None — documentation content only, no runtime code paths.

## Threat Flags

None. T-47-13 (doc/behavior drift) mitigated as planned: content drafted from
the finalized Wave-2/3 SUMMARYs, corrected per the post-planning code-review
docs-accuracy notes (deletion-aware-only placement wording), and reviewed by Ben
at the checkpoint before final.

## Commits (this plan)

- `c2d5b81` — docs(47-08): EN help topics (reordering + severity-off) + changelog entry + HELP-MAP
- `f4c9aa6` — docs(47-08): DE/HE/CS mirrors of reorder + severity help topics and changelog entry

Related (external to this plan, part of the approved final state): `8c82385`
(version bump), `9142f93`/`4eda604` (47-11 gap plan), `7d7f57b` (HE typo),
`aa7d848` (lede rewrite).

## Self-Check: PASSED

- Modified files all present on disk and committed.
- Commits c2d5b81, f4c9aa6 present in git log; cited external commits 8c82385,
  9142f93, 4eda604, 7d7f57b, aa7d848 all resolve.
- Full suite green at close-out: 218 passed, 0 failed.
