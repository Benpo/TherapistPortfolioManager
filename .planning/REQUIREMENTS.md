# Requirements: TherapistPortfolioManager — Milestone v1.4 "Richer Sessions"

**Defined:** 2026-07-11
**Core Value:** Therapists can efficiently track client sessions, trapped emotions, and clinical progress without any technical setup, internet connection, or data leaving their device.

Prior-milestone requirements: `milestones/v1.1-REQUIREMENTS.md`, `v1.2-REQUIREMENTS.md`, `v1.3-REQUIREMENTS.md` (all shipped). This file covers v1.4 only.

## v1.4 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Rich-Text Session Editor (RTXT)

Decisions locked 2026-07-11: markdown-at-rest storage (fields stay plain strings — zero migration); toolbar-over-textarea editor surface (preserves snippets/autogrow, avoids WebKit contenteditable bugs); **underline dropped** (no markdown syntax — see Out of Scope); italic accepted knowing the PDF renders it regular-weight (no Hebrew italic face vendored). Amended 2026-07-13 (Phase 45 discussion): **headings added to the toolbar vocabulary** — H1–H3 plus a "regular text" state (markdown-native, unlike the dropped underline); note-content headings render at a subordinate register in the PDF, never mistakable for document section headings. Amended 2026-07-14 (Phase 46 discussion): the **italic-flattens-in-PDF lock is reopened** — Phase 46 researches vendoring a true italic face (Heebo has no italic face; Rubik Italic with Hebrew coverage is the candidate), feasibility-gated; if infeasible within reasonable size/effort, v1.4 falls back to the accepted flattening plus disclosure (italic-button tooltip + one-line export-modal note).

- [x] **RTXT-01**: User can format session note text via a toolbar — bold, italic, bullet list, numbered list, and a heading control (H1/H2/H3 + back to regular text) — which inserts markdown markers into the familiar text fields
- [x] **RTXT-02**: User can format via keyboard shortcuts on desktop (Ctrl/Cmd+B bold, Ctrl/Cmd+I italic)
- [x] **RTXT-03**: User gets auto-format while typing — "- " / "1. " starts a list, Enter continues it, Enter on an empty item exits it
- [x] **RTXT-04**: User can toggle a live preview of the rendered result while editing
- [x] **RTXT-05**: User can indent/outdent list items (nested lists, standard markdown) and nesting renders correctly in preview and PDF
- [x] **RTXT-06**: User sees formatted notes when READING sessions (read mode + wherever note text is displayed), rendered escape-first via MdRender — never raw innerHTML
- [x] **RTXT-07**: Formatting survives PDF export — bold, lists (incl. nesting), Hebrew RTL/bidi preserved; heading-strip removed or consciously kept
- [x] **RTXT-08**: Formatting survives markdown copy/share export verbatim
- [x] **RTXT-09**: Snippets quick-paste and autogrow keep working unchanged in the enhanced note fields
- [x] **RTXT-10**: Existing (pre-v1.4) sessions render safely and unchanged in meaning; encrypted backup round-trip carries formatted notes with zero format changes

### Session-Section Reordering (ORDR)

- [ ] **ORDR-01**: User can reorder session sections in Settings by dragging (works with mouse AND iPhone touch — pointer-events, not HTML5 DnD)
- [ ] **ORDR-02**: User can reorder via per-row up/down arrow buttons (accessible baseline, WCAG 2.2)
- [ ] **ORDR-03**: Saved order drives the add/edit session form layout
- [ ] **ORDR-04**: Saved order drives the markdown + PDF export builders — repointed atomically with the 260615 guard-test rewrite (order invariant never briefly broken)
- [ ] **ORDR-05**: Order persists per therapist (therapistSettings sentinel record, mirroring the snippetsDeletedSeeds pattern) and round-trips through encrypted backup

### Mobile Pass (MOBL)

- [ ] **MOBL-01**: Index-page header buttons contain their text on iPhone (currently text escapes the circular buttons)
- [ ] **MOBL-02**: Header "?" and globe (language) popovers are mutually exclusive — opening one closes the other
- [ ] **MOBL-03**: Error-toast focus expands a collapsed accordion section before scrolling/focusing the offending field (mobile Safari)
- [ ] **MOBL-04**: Deferred 21-03 checklist (photo-crop, overlay-close, body scroll lock) verified on a real iPhone — failures fixed, passing items closed as obsolete

### Tech Debt (DEBT)

Rescoped 2026-07-11: the ~680-line legacy comment retrofit is TOO BIG for this milestone — deferred to a focused v1.5 candidate. v1.4 ships only the don't-make-it-worse layer.

- [x] **DEBT-01**: The CONVENTIONS.md §Comments contradiction is fixed at the root (the instruction telling agents to cite phase/plan IDs is replaced with the strip-all-planning-IDs rule), and the single RUNTIME planning-ref leak is removed (add-client.js:89 `console.warn` printing "per D-23" into customer DevTools — one-line reword). No enforcement gate ships this milestone: the baseline-aware forward grep-gate travels with the ~680-line legacy retrofit in v1.5 (rescoped 2026-07-11 — gate + hygiene belong together; see Deferred / Future)
- [x] **DEBT-02**: Deploy purges Cloudflare cache only AFTER the Pages promotion is confirmed live (kills the v1.3.0 mixed-cache incident class)
- [x] **DEBT-03**: A pre-prod branch deploys to a second CF Pages project reproducing prod URL semantics (clean URLs, _redirects, deploy-stamped integrity token) for real-device pre-release testing

### Polish (PLSH)

- [ ] **PLSH-01**: Client birthdate fields reject future dates (all 3 entry points: add-client, inline + edit in add-session)
- [ ] **PLSH-02**: Failure toasts use the error tone app-wide (add-client, PDF export, backup — not just the session form)
- [ ] **PLSH-03**: Next-session date shows DISTINCT error messages for "incomplete entry" vs "date not in the future" — verified on real Safari/iPhone (code has two branches already; the observed collapse is a browser-routing bug — see todo 2026-07-11-next-session-date-error-messages-not-distinct)
- [ ] **PLSH-04**: Fields that fail validation get a visible error state (red border or similar) in addition to cursor focus — focus alone is too easy to miss; the state clears once the user edits the field; works in dark mode (danger tokens are light-only today) and RTL

## Deferred / Future

- **RTXT-U1**: Underline formatting — dropped 2026-07-11 (no standard markdown syntax; would need a private `++x++` token + PDF underline renderer). Revisit if users ask.
- **RTXT-F2**: True italic in PDF (vendoring an italic face) — **promoted 2026-07-14 into Phase 46 as a feasibility-gated goal** (Rubik Italic candidate — Heebo has no italic face); falls back to flattening + disclosure (tooltip + export-modal note) if infeasible.
- **Comment-hygiene legacy retrofit + forward gate** (~680 lines / ~43 shipped files) — deferred 2026-07-11 (Ben: too much for this milestone); candidate focus for v1.5. The two travel together: the legacy reword sweep AND the baseline-aware forward grep-gate that blocks NEW planning refs (post-retrofit the gate needs no baseline machinery — a simple zero-tolerance grep). v1.4 only stops the bleeding (DEBT-01: the CONVENTIONS.md §Comments root-cause fix + the single add-client.js console.warn reword, both done in Phase 44).
- Codebase Health II (extraction + coverage + Playwright harness) — v1.5 candidate.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Underline formatting | No markdown syntax; private token breaks external-tool compat — Ben dropped it 2026-07-11 |
| contenteditable/WYSIWYG editor | Breaks snippets+autogrow, WebKit bug class, sanitizer dependency — 3 of 4 researchers converged against |
| Font sizes, colors, tables, images in notes | Anti-features for non-technical therapist users; scope explosion |
| Modality templates | Ben's earlier LOW/v2+ call stands |
| IndexedDB full encryption | Encrypted backups already cover the artifact that leaves the browser |
| Deactivation data-loss warning, demo month-count fix, security-note backoff | Offered at scoping 2026-07-11, not selected |
| Hebrew copy polish + Sapir help read, landing DE/CS verify | Content/business track, runs outside this milestone |
| Keyboard shortcuts (global), progress graphs, native wrapper, cloud backup | Post-launch backlog, promote individually |

## Process Notes (not requirements)

- Changelog + help-topic updates are enforced automatically by the Phase 43 docs hard-gate on every user-facing push — no separate requirement needed.
- Whether rich-text gets a guided-tour step: decided at phase planning.
- jsdom cannot see caret/selection/paste/drag/PDF/RTL-visual behavior — real installed-Safari PWA + real iPhone + real opened-PDF verification is mandatory closing work (this repo has shipped false-GREEN jsdom PDF tests before).

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| RTXT-01 | Phase 46 | Complete |
| RTXT-02 | Phase 46 | Complete |
| RTXT-03 | Phase 46 | Complete |
| RTXT-04 | Phase 46 | Complete |
| RTXT-05 | Phase 46 | Complete |
| RTXT-06 | Phase 45 | Complete |
| RTXT-07 | Phase 45 | Complete |
| RTXT-08 | Phase 45 | Complete |
| RTXT-09 | Phase 46 | Complete |
| RTXT-10 | Phase 45 | Complete |
| ORDR-01 | Phase 47 | Pending |
| ORDR-02 | Phase 47 | Pending |
| ORDR-03 | Phase 47 | Pending |
| ORDR-04 | Phase 47 | Pending |
| ORDR-05 | Phase 47 | Pending |
| MOBL-01 | Phase 48 | Pending |
| MOBL-02 | Phase 48 | Pending |
| MOBL-03 | Phase 48 | Pending |
| MOBL-04 | Phase 48 | Pending |
| DEBT-01 | Phase 44 | Complete |
| DEBT-02 | Phase 44 | Complete |
| DEBT-03 | Phase 44 | Complete |
| PLSH-01 | Phase 48 | Pending |
| PLSH-02 | Phase 48 | Pending |
| PLSH-03 | Phase 48 | Pending |
| PLSH-04 | Phase 48 | Pending |

**Coverage:**

- v1.4 requirements: 26 total
- Mapped to phases: 26 ✓
- Unmapped: 0

**By phase:**

- Phase 44 — Tech-Debt Guardrails & Pre-Prod Environment: DEBT-01, DEBT-02, DEBT-03 (3)
- Phase 45 — Rich-Text Rendering & Export Foundation: RTXT-06, RTXT-07, RTXT-08, RTXT-10 (4)
- Phase 46 — Rich-Text Toolbar Editor: RTXT-01, RTXT-02, RTXT-03, RTXT-04, RTXT-05, RTXT-09 (6)
- Phase 47 — Session-Section Reordering: ORDR-01, ORDR-02, ORDR-03, ORDR-04, ORDR-05 (5)
- Phase 48 — Mobile Pass & Validation Polish: MOBL-01, MOBL-02, MOBL-03, MOBL-04, PLSH-01, PLSH-02, PLSH-03, PLSH-04 (8)

---
*Requirements defined: 2026-07-11*
*Last updated: 2026-07-11 — roadmap created; all 26 requirements mapped to Phases 44–48 (100% coverage, no orphans)*
