---
phase: 34-session-pdf-export-visual-polish
plan: 2
subsystem: i18n / localization
tags: [i18n, pdf-export, localization, parity]
requires:
  - "session.copy.title, session.copy.scale.before/after, session.type.* (existing locked keys, reused not duplicated)"
provides:
  - "pdf.header.subtitle, pdf.severity.heading, pdf.footer.madeWith, pdf.footer.exportedOn (consumed by render plans 34-06/07/09)"
  - "export.unsaved.{title,body,saveExport,keepEditing} (consumed by PDFX-03 prompt plan 34-08)"
affects:
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
tech-stack:
  added: []
  patterns:
    - "Decouple copy authoring from render/wiring plans so 4-locale parity is established once and consuming plans reference stable keys."
key-files:
  created: []
  modified:
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "DE/CS translations authored at Claude's discretion per CONTEXT § Copy + § Claude's Discretion; EN/HE locked copy used verbatim."
  - "Brand token 'Sessions Garden · sessionsgarden.app' kept untranslated inside pdf.footer.madeWith across all locales (D-09 brand-as-tool)."
  - "No hardcoded in-person/remote pill label introduced; pill keeps consuming session.type.* (D-04)."
metrics:
  duration: ~10m
  completed: 2026-06-29
status: complete
---

# Phase 34 Plan 02: PDF + Save-Before-Export i18n Keys Summary

Authored 8 new localization keys across all four locales (en/he/de/cs) at parity for the redesigned PDF (D-01/D-08/D-09) and the save-before-export prompt (D-13), reusing existing locked title/caption/type keys rather than duplicating them.

## What Was Built

Eight new i18n keys added to each of `assets/i18n-{en,he,de,cs}.js`:

| Key | EN value | Decision |
|-----|----------|----------|
| pdf.header.subtitle | "A personal session summary" | D-01 (locked EN/HE; DE/CS translated) |
| pdf.severity.heading | "Severity — before & after" | D-08 (locked heading) |
| pdf.footer.madeWith | "Made with Sessions Garden · sessionsgarden.app" | D-09 (brand token verbatim) |
| pdf.footer.exportedOn | "Exported on" | D-09 (relabel vs. card date) |
| export.unsaved.title | "Save before exporting?" | D-13 |
| export.unsaved.body | "A client's PDF should reflect your saved changes, and a new session needs to be saved to get its correct number." | D-13 |
| export.unsaved.saveExport | "Save & export" | D-13 |
| export.unsaved.keepEditing | "Keep editing" | D-13 |

The `pdf.*` cluster was inserted after the existing `pdf.footer.pageXofY` key; the `export.unsaved.*` cluster after `export.title`.

**Reused (not duplicated):** `session.copy.title` (header title), `session.copy.scale.before`/`.after` (severity bar captions), `session.type.{clinic,online,other}` (pill — already 4-locale).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add the new PDF + prompt i18n keys in all 4 locales | 04088c9 | assets/i18n-{en,he,de,cs}.js |
| 2 | Verify 4-locale parity stays green | (no edits — verification only) | — |

Task 2 required no new edits: `node tests/25-11-i18n-parity.test.js` passed on the first run after Task 1, so there was no key-set drift to repair. It is folded into the same commit as Task 1.

## Verification

- Task 1 automated grep: all 8 keys present in all 4 locales — PASS.
- `node --check` on all four files — valid JS (the `require`-time `window is not defined` is expected; these are browser globals files, syntax confirmed via `--check`).
- cs `export.title` `í` unicode escape preserved intact (edit inserted around it, untouched).
- Task 2: `node tests/25-11-i18n-parity.test.js` — 23 passed, 0 failed, exit 0.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- assets/i18n-en.js / i18n-he.js / i18n-de.js / i18n-cs.js — modified, all 8 keys present (grep verified).
- Commit 04088c9 — present in git log.
