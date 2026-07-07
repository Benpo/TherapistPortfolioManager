---
phase: 32-readme-code-comments
plan: 04
subsystem: planning-artifacts
tags: [docs, planning-seed, help-content, comment-coverage]
status: complete
requires: [DOCS-01, DOCS-02]
provides:
  - comment-coverage-map
  - help-content-inventory
affects:
  - future "comments — batch 2" phase
  - future help/onboarding phase
tech-stack:
  added: []
  patterns: [markdown planning seed, persona-lens synthesis, workflow-spine IA]
key-files:
  created:
    - .planning/phases/32-readme-code-comments/32-COMMENT-COVERAGE-MAP.md
    - .planning/phases/32-readme-code-comments/32-HELP-CONTENT-INVENTORY.md
  modified: []
decisions:
  - "Help inventory organized strictly along the P26 7-step workflow spine + flagship personalization + technical track; demo excluded as a topic source (stale)"
  - "Coverage map batch-1 = db.js/overview.js/sessions.js (lowest staleness from P31 touch); batch-2 convention = the Phase 32 pilot banner convention"
metrics:
  duration: ~12m
  completed: 2026-06-29
  tasks: 2
  files: 2
---

# Phase 32 Plan 04: By-Product Planning Artifacts Summary

Produced the two `.planning/` planning seeds that fall out of the doc work — the comment-coverage map (D-14) and the EN-only help-content inventory (D-13) — both inventory/map artifacts, never shipped.

## What Was Built

**Task 1 — Comment-coverage map (D-14)** · `32-COMMENT-COVERAGE-MAP.md` · commit `5df80d7`
- Per-module done/batch-1/remaining table covering all ~28 production JS modules (excludes `*.min.js` vendor + i18n dictionaries), lifted from `32-RESEARCH.md` §"Comment-Coverage Map".
- 5 pilot files marked **done (this phase)**; `db.js` / `overview.js` / `sessions.js` flagged **batch-1** for the follow-up comments phase (lowest staleness from the P31 touch).
- Header-less modules noted (need a brand-new banner, not just a de-phase): `add-session.js` (done), `add-client.js`, `app.js`, `db.js`, `reporting.js`, `sessions.js`.
- Intro states the map seeds the comments batch-2 phase and that the batch-2 convention is the Phase 32 pilot convention.

**Task 2 — Help-content inventory (D-13)** · `32-HELP-CONTENT-INVENTORY.md` · commit `0a7aeee`
- EN-only topic/workflow tree, **inventory only** (no help copy), organized along the **P26 7-step workflow spine** (add client → start session → capture emotions → Heart Shield → severity tracking → review & export → back to overview) + flagship personalization (led early) + a parallel technical-tips track.
- Synthesized from 4 persona lenses (struggling novice / trainer / power user / domain expert) + 1 grounded feature-coverage auditor + 1 synthesizer.
- Each leaf carries title + one-line intent + mapped feature/page + tags `{persona source · P26 status · suggested format · priority}`.
- **license.html** (activation / trial / 2-device transfer / re-activation / purchase) covered as a real interactive feature area (G3). Legal pages (datenschutz / impressum / disclaimer, all variants) correctly excluded as non-topics.
- Explicit **Sources / Grounding** section lists only live pages + refreshed codebase maps + REQUIREMENTS + the P26 spine; the demo (`demo.html` / `demo-hints.js` / `demo-seed.js`) appears only as a named exclusion.

## Deviations from Plan

None — plan executed exactly as written. Both tasks were doc-only (no code, no shipped artifacts, no new code symbols), so deviation Rules 1–4 did not trigger.

## Threat Model

The plan's single register item (T-32-40, a correctness guardrail: don't ground the help inventory in the stale demo) was mitigated as specified — the demo is excluded as a topic source and named only as an exclusion; grounding is the live app + P26 spine + REQUIREMENTS + codebase maps. No security surface (two internal `.planning/` markdown files, never shipped).

## Verification

- Both artifacts exist at their `.planning/` paths.
- Task 1 automated greps PASS: file exists, `batch-1`, `db.js`, `overview.js`, `sessions.js`, `done` all present.
- Task 2 automated greps PASS: `persona`, `priority`, `intent`, `sources|grounding`, and the demo-exclusion pattern all present.
- Manual cross-checks: Sources/Grounding section lists no demo file as a source (demo named only as exclusion); license activation/trial covered; legal pages excluded as non-topics; every leaf carries the full four-tag set; inventory only (no help-copy paragraphs).

## Self-Check: PASSED
- FOUND file: .planning/phases/32-readme-code-comments/32-COMMENT-COVERAGE-MAP.md
- FOUND file: .planning/phases/32-readme-code-comments/32-HELP-CONTENT-INVENTORY.md
- FOUND commit: 5df80d7 (coverage map)
- FOUND commit: 0a7aeee (help inventory)
