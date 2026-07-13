---
phase: 45-rich-text-rendering-export-foundation
plan: 03
subsystem: pdf-export
tags: [pdf, markdown, headings, classification, rtxt-08, d-02, d-03, d-10, tdd]
status: complete
requires:
  - "assets/pdf-export.js Phase-34 branded heading chrome + Phase-45-02 hardened parse (pinned)"
  - "assets/export-modal.js buildFilteredSessionMarkdown → editor.value pipeline + severityAfterSections label-match precedent"
provides:
  - "PDF document-vs-note heading classification (levels 1-3) driven by a passed-in documentSectionLabels set on the buildSessionPDF contract"
  - "Subordinate chrome-free note-heading PDF render branch (12/11/10.5pt bold, no leaf-diamond, no vein rule)"
  - "Section-count guard gated on DOCUMENT headings only (a note ## never shifts the severity block)"
  - "export-modal buildDocumentSectionLabels() forwarded on BOTH the PDF-download and share dispatches"
  - "__exportModalTestHooks seam exposing buildFilteredSessionMarkdown/buildSessionMarkdown/buildDocumentSectionLabels"
affects:
  - "assets/pdf-export.js (heading classification + subordinate render + section-count guard)"
  - "assets/export-modal.js (label-set builder + dispatch wiring + test seam)"
tech-stack:
  added: []
  patterns:
    - "Document-heading identity re-derived by label equality (a passed-in label set), mirroring severityAfterSections — never a sentinel in the markdown, so editor.value/copy/.md stay byte-clean (D-10)"
    - "Back-compat fallback: no label set supplied => every heading is a document heading (Phase 34 callers byte-unchanged)"
    - "Two-window jsdom test: window A runs the REAL builders (editor.value + label set), window B feeds that exact string into the REAL buildSessionPDF with a setFontSize/text/triangle/line spy"
key-files:
  created:
    - tests/45-pdf-note-headings.test.js
    - tests/45-copy-share-verbatim.test.js
  modified:
    - assets/pdf-export.js
    - assets/export-modal.js
decisions:
  - "Classification is a passed-in documentSectionLabels array on sessionData (executor's choice per D-03) — NOT per-heading flags and NOT a markdown sentinel; keeps editor.value byte-clean (D-10)."
  - "Back-compat: buildSessionPDF with NO documentSectionLabels treats every heading as a document heading (Array.isArray gate), so the Phase 34 severity/branded-heading tests and any legacy caller are byte-unchanged; production always forwards the set."
  - "documentSectionLabels = every EXPORT_SECTION_ORDER key's stripRequired(getSectionLabel(...)) PLUS App.t('session.copy.title') (the level-1 title) — WARNING 2: the title MUST be in the set or a levels-1-3 classification would demote it."
  - "Note-heading register: 12/11/10.5pt bold for H1/H2/H3, COLOR_BODY_INK, 10pt top / 4pt bottom margin, no leaf-diamond, no vein rule (UI-SPEC §C)."
metrics:
  duration: ~40min
  completed: 2026-07-13
  tasks: 2
  commits: 3
  files_changed: 4
---

# Phase 45 Plan 03: Document-vs-note heading classification & verbatim copy/share lock Summary

Solved the phase's single hardest architectural problem (D-03) and its visual constraint (D-02) **on the real export path**: a `#`/`##`/`###` a therapist types inside a note now renders in the PDF as a subordinate, chrome-free note heading — never forging document-section chrome and never shifting the severity block's page slot — while genuine document headings (section labels + the level-1 title) keep their Phase-34 branded chrome and their section count. The classification is passed into `buildSessionPDF` as **data** (a document-section label set), so `editor.value`, the clipboard copy, and the `.md` download all stay byte-clean (D-10), which Task 2 locks with a falsifiable verbatim test.

## What was built

**Task 1 — document-vs-note classification (RED `6c7fc31` → GREEN `54beec4`)**
- `assets/pdf-export.js` `buildSessionPDF`: reads `sessionData.documentSectionLabels` into a trimmed-text lookup and adds `isDocumentHeading(block)` (text-equality). Both the **section-count guard** (`level >= 2` **AND** document → increments `sectionHeadingsSeen` / positions the severity block) and the **branded-chrome branch** (levels 1-3, document only) now gate on it. Note-classified headings (any level) route to a **new subordinate branch**: bold, `12/11/10.5pt` for H1/H2/H3, `COLOR_BODY_INK`, **no leaf-diamond, no vein rule**, RTL-anchored through the existing `shapeForJsPdf` pipeline.
- Back-compat: `hasDocLabels = Array.isArray(sessionData.documentSectionLabels)` — when absent, every heading is a document heading (exact pre-45-03 Phase-34 behavior), so the existing severity/heading tests are byte-unchanged.
- `assets/export-modal.js`: `buildDocumentSectionLabels()` (every `## ${label}` the builders emit via the same `stripRequired(App.getSectionLabel(...))` call **+** the level-1 `App.t("session.copy.title")`, WARNING 2), forwarded as `documentSectionLabels` on **both** the PDF-download (`exportHandleDownloadPdf`) and share (`exportHandleShare`) dispatches.

**Task 2 — RTXT-08 / D-10 verbatim lock (`e7455ca`)**
- `tests/45-copy-share-verbatim.test.js`: a pre-trimmed note fixture (`**bold**`, `1./2.` ordered, `- ` bullet, nested item, `## heading`) survives **byte-for-byte and contiguous** into BOTH `buildSessionMarkdown()` (copy) AND `buildFilteredSessionMarkdown()` (`editor.value` → PDF/share/`.md`), with **no** classification sentinel in either output.

**Test seam** — `__exportModalTestHooks` now also exposes `buildFilteredSessionMarkdown`, `buildSessionMarkdown`, and `buildDocumentSectionLabels` (the builders are closure-locals inside `initExportModal`). Both new tests drive the REAL builders under a live add-session form DOM — no source-slicing (the `30-fake-test-detector` gate confirms they execute the module).

## Documented limitations (pre-flag at the Plan 06 gate — NOT bugs)

The label-set classification is a **text-equality** match (the same inherent design the existing `severityAfterSections` label-match carries). Two accepted, coherent consequences:

1. **False-positive direction:** a NOTE heading whose text EXACTLY equals a document-section label OR the document title (`session.copy.title`) is classified as a DOCUMENT heading (keeps chrome, counts). Rare; acceptable.
2. **NOTE 6 — false-negative direction:** a DOCUMENT section heading RENAMED in the Step-2 editor so its text no longer matches a label is now classified as a NOTE heading — it demotes to the subordinate register AND stops incrementing the section count (before this plan, a renamed heading kept chrome and counted). This is the direct converse of (1) under the same model; accepted.

## Deviations from Plan

**None — plan executed as written.** One faithful implementation choice worth recording (within the plan's stated latitude, not a deviation): the test drives the REAL `buildFilteredSessionMarkdown → buildSessionPDF` pipeline across **two jsdom windows** (window A = the add-session env that runs the real builders + label set; window B = the shared `jsdom-pdf-env` that runs the real `buildSessionPDF` on that exact string). The handoff is pure data (a string + a `string[]`), so the editor markdown is genuinely built by the real filtered builder and then drives the real PDF — satisfying acceptance #104 without loading jsPDF into the heavy add-session window.

## TDD / RED confirmation

- **Task 1:** confirmed RED on pre-change `pdf-export.js` (3 targeted failures): the note `## NOTEHEAD_A` rendered at **16pt branded**, the note `# NOTEHEAD_B` at **18pt branded**, and the note heading **shifted the severity block above it** (`y=444.5 < 502.5`, i.e. the note `##` wrongly incremented the section count). Document `## trapped`, the level-1 title, and the D-10 byte-clean assertion passed on pre-change source (they are unchanged behaviors). After implementation: 7/7 GREEN.
- **Task 2:** a **regression LOCK**, not a feature — it is GREEN by construction (no sentinel was ever injected, and the builders were already verbatim). The byte-for-byte + contiguous + no-sentinel assertions are genuinely falsifiable (any transform / marker injection in either builder trips them). It is the guard that the Task 1 classification stayed data-only.

## Verification

- `node tests/45-pdf-note-headings.test.js` → **7/7 pass** (exit 0)
- `node tests/45-copy-share-verbatim.test.js` → **6/6 pass** (exit 0)
- `node tests/run-all.js` → **179 passed, 0 failed** (Phase 34 branded-heading + severity-placement tests unchanged; `30-fake-test-detector` green — both new tests execute the module)
- Real opened **Hebrew** PDF verification (chrome/RTL visual certainty for the subordinate register) is **deferred to the Plan 05 phase-gate checkpoint** — jsdom cannot certify chrome/RTL visually.

## Threat surface

- T-45-05 (note heading forging document chrome / shifting severity) — **mitigated** (Task 1 classification on the editor.value path; falsifiable spy test).
- T-45-06 (classification polluting the verbatim copy/editor.value paths) — **mitigated** (data-only label set; Task 2 locks both builders byte-clean).
- No new security surface introduced beyond the threat model. No threat flags.

## Deferred / out of scope

- Screen-side note-heading CSS register (UI-SPEC §B) is a separate plan's scope — this plan is the PDF/export side only.
- Real Hebrew opened-PDF visual UAT → Plan 05 gate.

## Self-Check: PASSED
