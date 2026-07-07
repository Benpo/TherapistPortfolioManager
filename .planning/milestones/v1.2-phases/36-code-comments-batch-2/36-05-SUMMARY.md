---
phase: 36-code-comments-batch-2
plan: "05"
subsystem: assets/settings-photos.js · assets/settings.js · assets/export-modal.js · assets/add-session.js
tags: [code-comments, docs, de-phase, pilot-files, batch-3, option-3]
dependency_graph:
  requires: [36-01]
  provides: [pilot-file-id-sweep-complete]
  affects:
    - assets/settings-snippets.js
    - assets/settings-photos.js
    - assets/settings.js
    - assets/export-modal.js
    - assets/add-session.js
tech_stack:
  added: []
  patterns: [option-3-strip, comments-only-gate, strip-and-compare]
key_files:
  created: []
  modified:
    - assets/settings-photos.js
    - assets/settings.js
    - assets/export-modal.js
    - assets/add-session.js
decisions:
  - "settings-snippets.js confirmed already clean from Phase 32 — zero edits required; included only for consistency proof"
  - "export-modal.js L23 divider stripped of FN-1/D-03/PDFX-02 id-stack per the style guide's worked example; divider shape and label preserved"
  - "34-RESEARCH Pitfall 2 cross-ref at L31 rewritten to its encoded reason: TZ/locale ambiguity when parsing the ISO date"
  - "buildSessionPDF purity note (L571-583) rewritten to drop PDFX-01/FN-1/D-03/D-08/D-09/34-09 — the stale 34-09 forward-reference was removed as it described a future swap that has already happened"
  - "dangling quick-260615-export-section-order.test.js references (L258, L395) replaced with prose describing the invariant; the test file does not exist in tests/"
  - "tests/34-session-ordinal.test.js reference at L900 preserved — it is a live code reference (file exists); only the FN-1 tag was stripped"
  - "settings.js L916 UI-SPEC was a bare tag with no prose; expanded to the full disabling-is-reversible rationale from the adjacent L817 comment"
metrics:
  duration_minutes: 15
  completed_date: "2026-07-02"
  tasks_completed: 3
  files_modified: 4
status: complete
---

# Phase 36 Plan 05: Pilot-file ID Sweep Summary

**One-liner:** Stripped all leftover planning IDs (REQ-/OBS-/FN-/D-NN/UI-SPEC/34-RESEARCH/Phase-34/PDFX-01) from the 5 Phase-32 pilot files' bodies per option 3 (D-07), with banners untouched; confirmed comments-only via strip-and-compare gate; settings-snippets.js was already clean.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | settings-snippets.js (confirmed clean) + settings-photos.js (2 UI-SPEC tags) + settings.js body (SPEC REQ-2, OBS-01 ×2, UI-SPEC ×2) | e429259 |
| 2 | export-modal.js heavy sweep (L23 divider, 34-RESEARCH, FN-1 ×3, REQ section headers, Phase-34 tags, PDFX-01/D-NN purity note, dangling test refs ×2) + add-session.js (REQ-3/REQ-5 ×3) | e429259 |
| 3 | Prove comments-only: strip-and-compare COMMENTS_ONLY_OK, npm test 119/119 green, scope fence clean | e429259 |

All three tasks committed together in a single atomic commit (Tasks 1+2 instructed "Do NOT commit yet" pending Task 3's gate).

## Verification Results

- `npm test`: **119/119 passed, 0 failed** — suite stays green
- Strip-and-compare gate: **COMMENTS_ONLY_OK** — zero code lines changed across all five files (D-06)
- De-phase grep (per-file): **DEPHASE_CLEAN** — no ID-shaped tokens remain in any of the 5 files
- settings.js banner (L1–29): byte-unchanged — PRIMARY exemplar intact
- export-modal.js banner (L1–19): byte-unchanged — specialized variant intact
- export-modal.js L23 divider: reads `// ── derived chronological session ordinal ──────` (id-stack stripped)
- Live-code ref `db.js:225` in export-modal.js: preserved (per KEEP allowlist)
- `tests/34-session-ordinal.test.js` reference at L900: preserved (live file exists)
- Scope fence (D-01): `git diff --name-only` excludes assets/backup.js, assets/app.js, assets/pdf-export.js

## What Was Built

### assets/settings-snippets.js — confirmed clean
Phase 32 already de-phased this file under the old keep-REQ approach; however, it had no REQ-/OBS-/D-NN IDs left in the body — confirmed by running the full option-3 de-phase grep. Zero edits.

### assets/settings-photos.js — 2 UI-SPEC tags stripped
- L232: `// Optimize-all confirm uses tone:'neutral' (UI-SPEC: irreversible but the` → `(irreversible but the` (dropped the `UI-SPEC:` label)
- L460: `// UI-SPEC: irreversible but visual quality stays the same.` → `// Irreversible but visual quality stays the same.` (trailing inline comment on the tone:'neutral' call)

### assets/settings.js — 5 body ID tokens stripped; banner (L1–29) untouched
- L33: `per SPEC REQ-2:` → removed; prose "disable-only: their purpose is structurally fixed" kept
- L562: `// OBS-01 surfacing: the "Report a problem" entry row` → dropped `OBS-01 surfacing:` label
- L679: `// OBS-01 surfacing: mount the "Report a problem" entry row.` → `// Mount the "Report a problem" entry row.`
- L817: `(UI-SPEC: disabling is` → `(disabling is` (UI-SPEC label dropped; rationale kept)
- L916: `// ON → OFF requires a neutral-tone confirm (UI-SPEC).` → expanded the bare `(UI-SPEC)` tag to the full prose rationale: "disabling is reversible — banner returns when the 7-day threshold next crosses"

### assets/export-modal.js — heavy body sweep; banner (L1–19) untouched
- L23: `// ── FN-1 / D-03 / PDFX-02: derived chronological session ordinal` → `// ── derived chronological session ordinal` (style guide's worked example)
- L31: `(34-RESEARCH Pitfall 2)` → `when parsing the ISO date` (encoded reason surfaced)
- L66: `Used to derive the FN-1 session ordinal.` → `Used to derive the session ordinal.`
- L258, L395: `tests/quick-260615-export-section-order.test.js` (dangling — file absent) → `The section-order test suite asserts this invariant.`
- L282–284: `Export modal (REQ-7 to REQ-15, REQ-17, REQ-19)` / `No Translate CTA (REQ-16 removed)` → `Export modal` / `3-step flow` only (REQ ids removed)
- L371: `Phase 34 (34-09, D-08): the issues/severity section is NO LONGER emitted` → dropped phase/decision tags; behavior statement kept
- L571–583: `buildSessionPDF` purity note — dropped `PDFX-01`, `FN-1`, `D-03`, `D-08`, `D-09`; stale `34-09 swaps it atomically` forward-reference removed (the swap already happened); rewrote to plain prose describing chronological ordinal and structured issues[]
- L900: `// FN-1 test seam` → `// Test seam` (FN-1 dropped; `tests/34-session-ordinal.test.js` preserved as a live-code ref)

### assets/add-session.js — 3 REQ tags stripped; banner untouched
- L813: `// Section visibility (REQ-3, REQ-5)` → `// Section visibility`
- L881: `// REQ-5: visible, badge shown, inputs remain` → `// Disabled past session with data: visible, badge shown, inputs remain`
- L1235: `// New session — hide disabled sections from the form per REQ-3.` → `// New session — hide disabled sections from the form.`

## Deviations from Plan

### Auto-fixed Issues

None — all edits matched the plan's specified targets exactly.

**Note on de-phase grep gate:** The plan's multi-file verification command (`grep … assets/*.js | grep -vE … \.js:[0-9]`) false-passes when run on multiple files from the project root because grep's `-n` output prefixes each line with `filename.js:linenum:` which itself matches the `\.js:[0-9]` KEEP-allowlist filter. Verified correctness by running the grep per-file (single-file mode) instead; all 5 files returned empty (clean). The strip-and-compare gate (COMMENTS_ONLY_OK) is the authoritative mechanical check.

## Known Stubs

None. Comment-only plan — no code symbols, data flows, or UI elements.

## Threat Flags

None. Comment-only edits add no attack surface. The T-36-05 strip-and-compare gate (COMMENTS_ONLY_OK) closes the only threat (accidental code edit).

## Self-Check: PASSED

- `assets/settings-snippets.js` exists and is clean: confirmed
- `assets/settings-photos.js` exists with UI-SPEC stripped: confirmed
- `assets/settings.js` exists with REQ-2/OBS-01/UI-SPEC stripped, banner (L1-29) intact: confirmed
- `assets/export-modal.js` exists with all ID residue stripped, banner (L1-19) intact, L23 reads `// ── derived chronological session ordinal`: confirmed
- `assets/add-session.js` exists with REQ-3/REQ-5 stripped: confirmed
- Commit `e429259` exists: confirmed
- `npm test` 119/119: confirmed
- Strip-and-compare COMMENTS_ONLY_OK: confirmed
- DEPHASE_CLEAN per-file: confirmed
- Scope fence (no giants modified): confirmed
