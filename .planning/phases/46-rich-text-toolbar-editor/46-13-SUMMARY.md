---
phase: 46-rich-text-toolbar-editor
plan: 13
subsystem: docs
tags: [changelog, help, docs-gate, gap-closure]
status: complete
requires:
  - phase: 46-09
    provides: granular module-owned undo/redo stack
  - phase: 46-10
    provides: emotions before/after export opt-out (per-export reset)
  - phase: 46-11
    provides: labelled Preview/Edit toggle + snippet-in-list Enter arbitration
  - phase: 46-12
    provides: clarified Heart-Wall export wording
provides:
  - Revised unreleased v1.4.0 changelog entry describing the final shipped behaviour as one coherent release
  - Updated EN help topics (capturing-emotions, snippets, review-export) reflecting the shipped behaviour
  - docs hard-gate satisfied for the whole gap-round push
affects: [46-14 (real-device gate)]
tech-stack:
  added: []
  patterns:
    - "Revise-in-place of an unreleased changelog entry rather than a new fix entry — no version bump, first-entry version stays 1.4.0"
key-files:
  created:
    - .planning/phases/46-rich-text-toolbar-editor/46-13-SUMMARY.md
  modified:
    - assets/changelog-content-en.js
    - assets/help-content-en.js
decisions:
  - "No version bump: v1.4.0 is unreleased, so the coarse undo and unlabelled toggle were never seen by users — the existing entry is revised in place rather than adding a 1.4.1 'fixed' entry (which would also break the changelog-integrity first-entry pin and collide on the v1-4 anchor)"
  - "EN only — EN is the corpus of record; HE/DE/CS translations follow in a later locale pass"
  - "Emotions opt-out documented as per-export reset (starts checked each export), matching what 46-10 actually shipped — NOT the plan's stale 'remembered per therapist' prediction"
  - "No Help-Unaffected trailer needed — the single EN help edit covers all four watched non-exempt code files (rich-toolbar.js, text-edit.js, snippets.js, export-modal.js) per the gate's trust-not-verify rule"
metrics:
  duration_min: 12
  completed: 2026-07-15
  tasks: 2
  files: 2
  suite: 189/189
---

# Phase 46 Plan 13: Docs Hard-Gate for the Gap Round Summary

**One-liner:** Revised the unreleased v1.4.0 changelog entry to describe the final shipped gap-round behaviour as one coherent release (no version bump, no 1.4.1) and updated the affected EN help topics, so the docs hard-gate passes for the whole gap-round push.

## What Was Done

### Task 1 — revise the unreleased v1.4.0 changelog entry (`assets/changelog-content-en.js`)

Revised the existing unreleased v1.4.0 entry in place — date/anchor/version fields
untouched (version stays `1.4.0`, anchor `v1-4`). Only the descriptive copy changed,
folding in the gap-round's final behaviour:

- **Undo/redo** now described as granular: it steps one line or one change at a time
  (toolbar buttons and Ctrl+Z), so going back never sweeps away more than intended.
- **Preview toggle** now described with its label: reads "Preview" while writing and
  "Edit" while previewing.
- **Emotions before/after** export ratings described as a pre-selected opt-out —
  uncheck to leave the severity ratings out of the PDF and a copied summary.
- **Heart-Wall** export status described with the clarified wording ("Heart-Wall
  removed" vs "Heart-Wall present, not removed this session") in place of a bare yes/no.
- **Snippet-in-a-list** behaviour folded into the existing lists sentence (accepting a
  suggestion inside a list keeps you on the same line) — no separate "fixed" line.

`APP_VERSION` / `assets/version.js` were NOT touched. No new changelog entry was added.

### Task 2 — update the affected EN help topics (`assets/help-content-en.js`)

Read HELP-MAP.md cold to confirm ownership, then updated the topics the gap-round
code changes touched:

| Topic | File-owner (HELP-MAP) | Update |
|-------|-----------------------|--------|
| `topic-quick-paste` ("Capturing emotions fast") | rich-toolbar.js, text-edit.js | Labelled Preview/Edit toggle; granular undo/redo (a line or a change at a time, Ctrl+Z) |
| `topic-snippets` ("Snippets — type less") | snippets.js | Accepting a suggestion inside a bullet/numbered list keeps the same line (no stray new item) |
| `topic-single-export` ("Exporting one session") | export-modal.js | Emotions before/after opt-out (pre-selected, per-export reset); clarified Heart-Wall export wording (omitted entirely for non-Heart-Wall sessions) |

## Docs Gate Result

`node scripts/docs-gate.js --range aa3dfa8..HEAD` → **exit 0**:
`docs-gate OK — 4 help+changelog file(s), 5 changelog-only file(s), all covered`.

The four watched non-exempt code files (rich-toolbar.js, text-edit.js, snippets.js,
export-modal.js) are all covered by the single EN help edit; the changelog demand is
satisfied by the EN changelog edit; the changelog-only tier (app.css + the four i18n
dictionaries) needs no per-file help demand. **No `Help-Unaffected` trailer was
required.** No `--no-verify`, no emergency skip.

## Deviations from Plan

### Authorized comment/content-hygiene translation
Per the locked project comment rule, both edited files are SHIPPED — their user-visible
content strings carry no planning identifiers or process words. The plan's ID-laden
wording was written as plain user-facing prose. Grep of the added lines for
`RTXT-NN` / `D-NN` / phase / UAT / gap-closure / `46-NN` → 0. (Version numbers like
"v1.4" remain, which is allowed.)

### Followed the shipped behaviour over a stale plan prediction
Plan Task 1 described the emotions opt-out as "remembered per therapist", but 46-10
actually shipped a **per-export reset** (no persistence). Per the cross-plan handoff
instruction ("describe what actually shipped, not the plan's predictions"), the
changelog and help both describe the per-export reset. [Rule 1 — accuracy]

## Verification

- `node --check assets/changelog-content-en.js` → parse OK
- `node --check assets/help-content-en.js` → parse OK
- `node tests/run-all.js` → **189 passed, 0 failed** (changelog-integrity green: first
  entry still 1.4.0, anchors unique; no regression)
- `node scripts/docs-gate.js --range aa3dfa8..HEAD` → exit 0, all covered
- `APP_VERSION` unchanged at 1.4.0 (assets/version.js not in the diff)

## Known Stubs

None — content-only edits, both files parse and the suite is green.

## Threat Flags

None — no new network endpoints, auth paths, file access, or schema changes. This plan
is documentation copy only. The register mitigations held: undocumented user-facing
changes are now documented in the same push (T-46-13a), and the gate was satisfied
without `--no-verify` or an emergency skip (T-46-13b).

## Self-Check: PASSED

- assets/changelog-content-en.js — FOUND (revised)
- assets/help-content-en.js — FOUND (revised)
- 46-13-SUMMARY.md — FOUND
- Commit 8cd345e (changelog) — present in git history
- Commit 04ced54 (help) — present in git history
