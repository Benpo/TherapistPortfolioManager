---
phase: 46-rich-text-toolbar-editor
plan: 10
subsystem: export-pdf
tags: [export-modal, pdf-export, opt-out, i18n, gap-closure]
requires:
  - phase: 46-08
    provides: export Step 2 redesign (single full-width editor, persistent toolbar)
provides:
  - Emotions before/after block as a pre-selected opt-out gating BOTH the PDF severity block and the clipboard-copy Issues section
  - export.section.emotions i18n key in all four locales (EN/HE/DE/CS)
affects: [46-13, 46-14]
tech-stack:
  added: []
  patterns:
    - "Single decision helper (emotionsBlockIncluded) read by both output paths so PDF and copy can never disagree"
    - "Step-1 selection captured on _exportState.selectedKeys at Next; dies with the dialog (per-export reset)"
key-files:
  created:
    - tests/export-emotions-optout.test.js
  modified:
    - assets/export-modal.js
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "Ben ratified PER-EXPORT reset (not the recommended sticky persistence): no localStorage key, the opt-out resets to checked on every export, consistent with the other Step-1 toggles"
  - "Copy path gates on the CURRENT export dialog's live Step-1 selection; with no open dialog/selection it uses the checked default (included)"
  - "Step-1 row renamed to the fixed clarified label 'Emotions before / after ratings' (export.section.emotions), translated in all four locales"
  - "Issues row pre-selects only when the session has issue rows (sectionHasData gate, mirroring heartShieldEmotions/nextSession) — advisory applied"
metrics:
  duration: ~25 min (excluding checkpoint wait)
  completed: 2026-07-15
status: complete
---

# Phase 46 Plan 10: Export Emotions Before/After Opt-Out Summary

**Pre-selected per-export opt-out for the emotions before/after block, gating both the PDF severity bars and the clipboard-copy Issues section through one shared in-memory decision — no persistence, ratified by Ben.**

## What Was Built

Gap 7 (Ben verbatim: "in the export, we always export the emotions before/after, but I want to replace this with pre-selected box for this and not do it forced"). The export Step-1 "Choose which sections to include" row for the issues section now:

1. **Defaults CHECKED** (pre-selected) when the session has issue rows — `EXPORT_DEFAULT_CHECKED.issues` flipped to `true` with a `sectionHasData("issues")` render-time gate.
2. **Actually gates the PDF**: `buildRenderInputs()` forwards `getIssuesPayload()` only when the block is included, else an empty `issues: []` — `drawSeverityBlock` early-returns on empty, so the two-bar block is cleanly omitted with zero pdf-export.js changes.
3. **Gates the clipboard copy**: `buildSessionMarkdown()` (the Copy button's builder, which never passes through Step 1) skips the Issues heading + body when the live selection excludes the block.
4. **Resets per export**: the selection is captured on `_exportState.selectedKeys` in the Step-1 Next handler and dies with the dialog. Nothing is persisted anywhere.

One shared helper, `emotionsBlockIncluded()`, is the single decision both paths read: include unless the open dialog's captured Step-1 selection excluded the block; outside a live selection (dialog closed / Step 1 not advanced) the answer is always "include" — so default behaviour is byte-identical for a therapist who never opts out.

## Ratified Design (Task 1 checkpoint, decided by Ben)

| Question | Ratified choice |
|----------|-----------------|
| Placement | Reuse the existing Step-1 sections row — no new standalone checkbox, no settings toggle |
| Scope | The row controls the PDF two-bar severity block AND the copy Issues section, on the same choice |
| Persistence | **Per-export reset** (Ben overrode the "recommended" sticky option): no localStorage, default re-checks every export; Copy gates on the live in-memory selection, checked default when no dialog is open |
| Wording | Renamed to "Emotions before / after ratings" via new `export.section.emotions` key in all four locales |

**localStorage key: NONE** — the per-export ratification removed the persistence element entirely.

## i18n Keys Added

`export.section.emotions` in all four locales (structure parity intact):
- EN: "Emotions before / after ratings" (canonical, exact ratified wording)
- HE: "דירוג רגשות לפני / אחרי"
- DE: "Bewertung der Emotionen vorher / nachher"
- CS: "Hodnocení emocí před / po"

The Step-1 issues row now uses this fixed clarified label instead of the customizable section label (`App.getSectionLabel("issues", ...)`); the markdown/PDF section headings still use the customizable label unchanged.

## Verification

- `node tests/export-emotions-optout.test.js` — 5/5 green: pre-selected default + label routing, checked → non-empty issues[] forwarded + copy includes, unchecked → empty issues[] + copy omits (other sections survive), per-export reset (re-open re-checks; copy re-includes after close), i18n parity pin with EN wording.
- `node tests/run-all.js` — **187/187 green** (baseline 186 + the new file), locale-structure parity included.
- Real-device confirmation (uncheck → PDF has no severity bars) deferred to the 46-14 gate per plan.

## Deviations from Plan

### Plan-directed adaptation (not a deviation per se)

**Task 2 implemented the "per-export" ratification, not the plan's inline "recommended" draft.** The plan's step 1 (localStorage helper), the persist half of step 3, and the persisted-preference read in steps 4-5 were replaced by the in-memory `_exportState.selectedKeys` capture + `emotionsBlockIncluded()` fallback-to-include — exactly as the checkpoint resolution directed.

### Auto-applied advisory

**[Advisory] Issues row default gated on sectionHasData("issues")** — applied the cross-plan handoff's optional consistency suggestion (mirrors the heartShieldEmotions/nextSession rows). Harmless either way since an empty payload renders nothing; noted here as a judgment call.

### Comment hygiene

All new shipped-file comments written as plain prose per the locked convention — no requirement/decision/phase IDs, no process framing. No new shipped asset added, so sw.js untouched.

## Commits

- `8474f97` feat(46-10): make the emotions before/after export block a pre-selected opt-out

## Known Stubs

None — both paths are fully wired to the live selection.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary changes. The two register mitigations held: the block omission covers BOTH outputs (T-46-10a), and the new row label is set via textContent with the other rows' labels unchanged (T-46-10b).

## Self-Check: PASSED

- tests/export-emotions-optout.test.js exists
- 46-10-SUMMARY.md exists
- Commit 8474f97 exists
- export.section.emotions present in all four locale files
