---
phase: 46-rich-text-toolbar-editor
plan: 07
subsystem: docs
tags: [changelog, help, docs-gate, covers, v1.4, locale-parity]
status: complete
requires:
  - 46-05 (note-field toolbar mount — what the help topic describes)
  - 46-06 (export Step-2 toolbar editor + maximize — what the help/changelog describe)
  - 46-02 (true PDF italic GREEN — italic phrased as true slanted text, no flattening caveat)
provides:
  - v1.4 EN changelog entry extended to cover the rich-text toolbar editor
  - capturing-emotions quick-paste help topic describes the toolbar/shortcuts/auto-format/preview
  - review-export single-export topic notes the roomier maximizable export editor
  - new watched modules registered in topic covers[] so the per-file docs-gate help demand resolves
affects:
  - Phase 46 push (docs hard-gate satisfied for the phase's watched code — no skip trailer needed)
  - later locale pass (HE/DE/CS help/changelog translation of these EN edits)
tech-stack:
  added: []
  patterns:
    - "Fold new user-facing help into an EXISTING topic (not a new topic id) to hold help-integrity-locale structure parity until the locale pass"
    - "covers[] registration is the per-file docs-gate satisfaction mechanism for new watched files; HELP-MAP.md is regenerated (not hand-edited) from the EN corpus"
key-files:
  created: []
  modified:
    - assets/changelog-content-en.js
    - assets/help-content-en.js
    - HELP-MAP.md
decisions:
  - "Folded the toolbar/preview content into the existing capturing-emotions quick-paste topic rather than adding a new topic — a new EN-only topic breaks the help-integrity-locale structure-parity gate (HE/DE/CS mirror EN topic ids). The plan explicitly allowed 'topic-quick-paste or a suitable formatting-focused topic'."
  - "rich-toolbar.js + text-edit.js registered under quick-paste (they power the note-field toolbar); rubik-italic-base64.js under single-export (it is the PDF export font) — per the plan's covers[] routing."
  - "Italic described as true slanted text with no flattening caveat, because 46-02 shipped true PDF italic GREEN (Ben accepted)."
  - "HELP-MAP.md regenerated via scripts/gen-help-map.js (freshness invariant in help-integrity.test.js), not hand-edited."
metrics:
  duration_min: 12
  completed: 2026-07-14
  tasks: 2
  files: 3
  suite: 185/185
---

# Phase 46 Plan 07: Docs hard-gate — v1.4 changelog + EN help for the toolbar editor Summary

Satisfied the Phase 43 docs hard-gate for this heavily user-facing phase. The v1.4
EN changelog entry now tells therapists about the formatting toolbar, keyboard
shortcuts, auto-formatting lists, the live preview, and the roomier export editor;
the EN help corpus describes that editing in the capturing-emotions quick-paste
topic and notes the maximizable export editor in the single-export topic; and every
new watched module file this phase ships is registered in a help topic `covers[]`
so the per-file help demand resolves at push. Full suite 185/185.

## What Was Built

**Task 1 — v1.4 EN changelog entry (`64b53e2`).**
Extended the existing `1.4.0` entry in `window.CHANGELOG_CONTENT_EN` (did NOT add a
second v1.4 entry). Refreshed the lede and highlights to lead with the formatting
toolbar, and added the Phase 46 changes under the right categories:
- **new:** a formatting toolbar above session notes (bold, italics, bullet + numbered
  lists, text-style menu for headings, plus undo/redo); a per-field live preview toggle.
  Kept the existing "reading a saved session shows styled text" line.
- **improved:** natural formatting while typing (Ctrl+B/Ctrl+I, dash/number to start a
  list, Tab to nest); the roomier export editor with a maximize button and mobile
  full-screen; plus the kept PDF-formatting and copy/text-file lines.

Italic is phrased as preserved formatting with no flattening caveat, because 46-02
shipped true PDF italic GREEN. Benefit-led, garden register, no emojis, client/session
terminology. `changelog-integrity` stays green.

**Task 2 — EN help topics + covers[] registration (`abe12da`).**
- `capturing-emotions` → `topic-quick-paste`: added three body blocks describing the
  focus-attached formatting toolbar (bold/italic buttons + desktop shortcuts, bullet/
  numbered lists, the text-style/headings menu), typing-to-auto-format lists with
  Enter-to-exit and Tab/Shift+Tab nesting, undo/redo, and the per-field preview toggle.
  Added `assets/rich-toolbar.js` and `assets/text-edit.js` to its `covers[]`.
- `review-export` → `topic-single-export`: added a paragraph on the roomier Step-2
  editor (same toolbar, maximize, mobile full-screen, export-only edits), and added
  `assets/fonts/rubik-italic-base64.js` to its `covers[]`.
- Regenerated `HELP-MAP.md` from the EN corpus via `scripts/gen-help-map.js` (the
  freshness invariant in `help-integrity.test.js` requires it to match).

## Docs-gate dry check

For the phase's push, `scripts/docs-gate.js` demands: (a) an EN changelog edit —
satisfied by `assets/changelog-content-en.js`; (b) per-file HELP coverage for every
changed watched file. The phase's changed watched files and their coverage:

| Watched file | Coverage |
|--------------|----------|
| add-session.js, add-session.html | already in multiple topic covers[] — satisfied by any EN help edit |
| export-modal.js, pdf-export.js | already in review-export covers[] — satisfied |
| sw.js | already in backups/installing covers[] (changelog-only tier anyway) — satisfied |
| **assets/text-edit.js** (new) | now in topic-quick-paste covers[] |
| **assets/rich-toolbar.js** (new) | now in topic-quick-paste covers[] |
| **assets/fonts/rubik-italic-base64.js** (new) | now in topic-single-export covers[] |

An EN help edit accompanies the push (`assets/help-content-en.js`), so files already
in a covers[] are satisfied, and the three new watched files are freshly registered.
No `Help-Unaffected:` / `Docs-Emergency-Skip:` trailer is needed. (Note: the docs-gate
is push-scoped — this phase must ship as ONE push so these edits land with the watched code.)

## Deviations from Plan

### Authorized (comment hygiene — locked project rule)

**[Comment hygiene] Planning IDs kept out of the shipped content and comments.**
`changelog-content-en.js` and `help-content-en.js` are shipped, client-served assets.
Per the locked CONVENTIONS.md §Comments rule, no requirement/decision/phase IDs
(RTXT-NN, D-NN, "Phase 46", "46-07") appear in the added changelog/help strings or the
section comment I touched. Version numbers ("v1.4") are fine and were kept. All internal
framing was translated to plain user-facing prose. IDs remain in this SUMMARY and the
commit messages. Authorized — not a plan violation.

### Auto-fixed blocking issues (Rule 3)

**1. [Rule 3 — Blocking] A new EN-only help topic broke the locale structure-parity gate.**
- **Found during:** Task 2 (`npm test` — `help-integrity-locale.test.js` FAILED:
  `capturing-emotions topic count 2 ≠ EN 3` for he/de/cs).
- **Issue:** My first pass added a new `topic-formatting` topic to the EN corpus. The
  Phase 42.1 locale gate enforces topic-id/structure parity between EN and HE/DE/CS
  *now* — a new EN-only topic fails until each locale sibling mirrors it, but locale
  translation is deliberately a later pass.
- **Fix:** Reverted the new topic and folded the same content into the existing
  `topic-quick-paste` topic (an option the plan explicitly named). No new topic id →
  parity holds; `covers[]` additions don't affect parity. Suite back to 185/185.
- **Files modified:** assets/help-content-en.js
- **Commit:** abe12da

**2. [Rule 3 — Blocking] HELP-MAP.md freshness invariant.**
- **Found during:** Task 2 (editing covers[] made the committed HELP-MAP.md stale).
- **Issue:** `help-integrity.test.js` `=== `-compares HELP-MAP.md against the corpus.
- **Fix:** Regenerated via `scripts/gen-help-map.js` (the sanctioned tool) and committed
  it alongside the help edit.
- **Files modified:** HELP-MAP.md
- **Commit:** abe12da

No other deviations — content edits only, no bugs, no missing functionality, no
architectural changes, no package installs.

## Threat Surface

Phase threat-register items for this plan are satisfied:
- **T-46-07a (client-served docs disclosure):** garden register, client/session
  terminology, no emojis, no internal/planning framing in the shipped strings or the
  touched comment; changelog + help integrity tests gate the shape (green).
- **T-46-07b (docs-gate bypass):** honest EN changelog + help + covers[] edits made, so
  the layered gate (hook + CI) passes without a skip trailer.
- **T-46-SC (installs):** none — content edits only.

## Known Stubs

None. Both content edits are real and land in the shipped corpus. HE/DE/CS translation
of these EN strings is a later locale pass (explicitly out of scope, not gate-blocking).

## Verification

- `npm test` (full suite) → **185/185**, exit 0 (changelog + help + locale-parity +
  HELP-MAP freshness all green).
- `node --check` OK for `changelog-content-en.js` and `help-content-en.js`.
- Source assertions:
  - `grep -c "1.4.0" assets/changelog-content-en.js` = 1; v1.4 entry mentions the
    formatting toolbar (`grep -c "formatting toolbar"` = 4) ✓
  - `grep -c "rich-toolbar.js"` = 1, `grep -c "text-edit.js"` = 1,
    `grep -c "rubik-italic-base64.js"` = 1 in help-content-en.js (all new watched files
    registered in a covers[]) ✓
  - a help topic body describes the formatting toolbar / preview ✓
  - HELP-MAP.md rows show the new covers[] entries for topic-quick-paste and
    topic-single-export ✓
- Dry docs-gate check (table above): the phase's push satisfies scripts/docs-gate.js —
  EN changelog + EN help edits accompany the watched code, and every new watched file is
  in a covers[]. No trailer needed.

## Self-Check: PASSED

- Artifacts `assets/changelog-content-en.js`, `assets/help-content-en.js`, `HELP-MAP.md`
  modified on disk ✓
- Commits `64b53e2` (Task 1) and `abe12da` (Task 2) present in git history ✓
- Full suite green (185/185) ✓
