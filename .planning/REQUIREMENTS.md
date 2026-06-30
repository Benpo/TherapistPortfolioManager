# Requirements: TherapistPortfolioManager

**Defined:** 2026-06-22
**Core Value:** Therapists can efficiently track client sessions, trapped emotions, and clinical progress without any technical setup, internet connection, or data leaving their device.

> **Milestone v1.2 — Codebase Health & Reliability.** A deliberate shift from feature work to **maintainability and reliability**. Scope was co-designed and locked with Ben on 2026-06-22 and sourced from the codebase concerns triage (`.planning/codebase/CONCERNS.md`). Phases run in **dependency order** (28 → 33): get updates reliably delivered + observable, build a test safety net, *then* refactor behind it, *then* document the result. Requirement categories are phase-aligned, continuing the v1.1 convention.

## v1.2 Requirements

Requirements for the Codebase Health & Reliability milestone. Each maps to exactly one roadmap phase (28–36; phases 34–36 are the v1.2 tail added 2026-06-29 by Ben's work order).

### Update Reliability & Versioning (Phase 28)

- [x] **VER-01**: Installed PWA (including iOS Safari) reliably receives and applies app updates — field-verified on a real installed device, not just in theory _(manual verification component — needs a real iOS device)_
- [x] **VER-02**: A single source-of-truth version constant drives the footer version, the service-worker `CACHE_NAME`, and the value the integrity check validates against (today the footer is a static placeholder in `assets/shared-chrome.js:~8`)
- [x] **VER-03**: A runtime integrity self-check detects when the running/cached version diverges from the source-of-truth version and surfaces it — so the displayed version can't silently lie (as v209 did)
- [x] **VER-04**: CSP is delivered via HTTP header in `_headers`, and the per-page `<meta http-equiv>` CSP tags are removed/reconciled
- [x] **VER-05**: `_headers` cache TTL for static JS/CSS is lengthened (e.g. `max-age=86400`+) with the service worker still owning freshness for installed users
- [x] **VER-06**: All update-reliability and versioning behavior remains fully offline — no phone-home / network dependency introduced _(cross-cutting constraint)_

### Reliability & Observability (Phase 29)

- [x] **OBS-01**: Uncaught errors and unhandled promise rejections are captured and the last N persisted to IndexedDB (`window.onerror` + `unhandledrejection`), with zero network calls
- [x] **OBS-02**: Settings has a "Report a problem" action that copies the persisted error log plus basic diagnostic context to the clipboard for the user to paste into a support email — nothing leaves the device automatically (GDPR-safe)
- [x] **OBS-03**: A failed IndexedDB migration offers a "reset & recover" escape hatch so a user cannot be trapped in an infinite "please refresh" loop

### Test Harness & Coverage (Phase 30)

- [x] **TEST-01**: The 7 currently-unrunnable PDF tests run green in Node (resolve the `jsdom` `HTMLCanvasElement.getContext` gap and the old-Node `blob.arrayBuffer` issue)
- [x] **TEST-02**: An automated RTL regression guard fails if `dir="rtl"` is wrongly applied to non-Hebrew locales (EN/DE/CS)
- [x] **TEST-03**: Behavior tests capture the current observable behavior of the god modules (`settings.js`, `add-session.js`) before any refactor, establishing a green safety net (per `feedback-behavior-verification`)
- [x] **TEST-04**: The full test suite runs via a single documented command (whether to introduce the project's first `package.json` + dev-dependencies is a plan-time decision)

### Refactor God Modules (Phase 31)

- [x] **RFCT-01**: Cohesive units are extracted from `settings.js` (~2,827 lines) into separate IIFE modules (e.g. SnippetEditor, PhotoManager, StorageUsage) with no observable behavior change (Phase 30 suite stays green)
- [x] **RFCT-02**: Export-modal logic is extracted from `add-session.js` (~2,173 lines) into its own IIFE module with behavior preserved (suite green)
- [x] **RFCT-03**: Opportunistic cleanups within touched code only — `var`→`const`/`let`, `innerHTML`+i18n hardening (`overview.js`/`sessions.js`), `openDB()` connection pooling (cache the resolved `IDBDatabase`), and tagged logging in non-trivial silent `catch` blocks

### README + Code Comments (Phase 32)

- [x] **DOCS-01**: A project README documents how to run, deploy, and understand the architecture of the app, written for Sapir as the ongoing maintainer
- [x] **DOCS-02**: The refactored modules carry code-level comments describing their structure and responsibilities _(depends on Phase 31)_

### DE/CS i18n Completion (Phase 33)

- [ ] **I18N-01**: The 13 English-fallback keys in `assets/i18n-de.js` (lines ~419–447) are translated to German; no `// TODO i18n` markers remain _(needs Sapir's strings)_
- [ ] **I18N-02**: The 13 English-fallback keys in `assets/i18n-cs.js` (lines ~419–447) are translated to Czech; no `// TODO i18n` markers remain _(needs Sapir's strings)_

### Session PDF Export — Visual Polish (Phase 34)

- [x] **PDFX-01**: The exported session PDF is visually redesigned — full-bleed mint header band (embedded offline logo + title/subtitle, *no* clinic letterhead), cream client card with a localized in-person/remote pill, leaf-diamond section headings, free-text body, a two-bar before/after severity block, and a footer band (brand-as-tool mark + pagination + "Exported on" date) — using jsPDF primitives only (flat fills/lines/embedded PNG/colored text). **Hebrew RTL/bidi must not regress** and the **Phase 23/30 PDF test suite stays green** (the 5 SHA-256 fixtures regenerated deliberately and visually verified; content-stream floor tests unchanged). Includes FN-2 (localized `sessionType` pill, no new field) and FN-3 (offline-embedded `icon-512.png`).
- [x] **PDFX-02**: The card's "Session #N" is a **derived chronological ordinal** (1-based position among the client's sessions sorted ascending by `date`, tie-break `id`, computed at export time — never the `autoIncrement` DB key), so deleting a middle session renumbers the rest with no gaps. **MUST be covered by a falsifiable behavior test authored before implementation** (FN-1; per `feedback-behavior-verification`).
- [x] **PDFX-03 — DESCOPED (2026-06-30, invalid premise)**: ~~Exporting with unsaved changes offers a non-blocking "Save & export" / "Keep editing" prompt.~~ Descoped after implementation: the session-export button (`#exportSessionBtn`) is shown **only in read mode** on an already-saved session (`add-session.js:289` toggles it on `!isReadMode`), so export is **unreachable** while editing or from an unsaved/new session — there is no dirty/unsaved export path to guard, and the guard could never fire. The guard code was removed (refactor commit `refactor(34): remove dead save-before-export guard`). The behavior-preserving `saveSessionForm` extraction is retained as the save button's handler. FN-1 ordinal correctness for the (always-saved) exported session is fully delivered by **PDFX-02**.

### Demo System Refresh / Version Parity (Phase 35)

Formalized 2026-06-30 at plan time (provisional `DEMO-*` resolved). The demo is the real app in demo mode; this phase unstales the one un-converged home shell, refreshes the seed, removes dead code, and adds a scoped demo exposure lock-down. Approach locked to **D-01** (chrome-only single-sourcing); **D-02** (collapse `demo.html` into `index.html`) was evaluated and declined for minimal blast radius.

- **DEMO-01**: The demo home chrome (header/nav/language-picker/footer) is injected from one source (`app.js initCommon` + `shared-chrome.js`) identical to `index.html`, so it cannot silently drift again (D-01)
- **DEMO-02**: The dead hand-typed native `<select id="languageSelect">` is removed from the demo home (zero JS references) (D-01)
- **DEMO-03**: The "live demo" banner is preserved and language-synced across all four languages (D-01)
- **DEMO-04**: The app version footer renders on the demo home, single-sourced from `version.js` — the on-screen version-parity signal (D-01)
- **DEMO-05**: The seed showcases a Heart Shield removal/progression arc visible on the dashboard + session list (D-03)
- **DEMO-06**: Seed dates are relative/computed at seed time (noon-anchored offsets), guaranteeing ≥1 session in the current calendar month so the demo never looks abandoned (D-06)
- **DEMO-07**: Every seed session conforms exactly to the current `db.js` schema; client-type variety is kept and an `other`-type client/session is added (D-04)
- **DEMO-08**: Demo-specific hand-typed copy uses current terminology; the stale "therapeutic" subtitle literal is gone (D-07)
- **DEMO-09**: `assets/demo-hints.js` is removed with all three live references cleaned (the file, the `app.js` injection block, the `sw.js` precache entry) (D-08)
- **DEMO-10**: The landing iframe demo entry point keeps working — no regression in language sync, per-page gate bypass, or reseed-on-home (manual browser verification)
- **DEMO-11**: In demo mode (`window.name==='demo-mode'`) the Backup cloud button, Export/Import, and license activate/deactivate controls are hidden/disabled, and remain present in the real app; Settings + broader hardening stay deferred (D-09)

## Future Requirements

Deferred to backlog — revisit later (from the 2026-06-22 concerns triage). Tracked but not in the v1.2 roadmap.

### Performance & Scale

- **PERF-01**: Client-side pagination / virtual scroll for the sessions and clients tables (degrades beyond ~500 sessions)
- **PERF-02**: Move PDF export off the main thread (Web Worker)
- **PERF-03**: Parallelize the sequential photo-optimization loop (bounded concurrency)
- **PERF-04**: IndexedDB record-count guidance / soft caps

### Hardening

- **HARD-01**: Backup import maximum file-size guard before reading into memory
- **HARD-02**: Pin / version-track the vendored `jspdf.min.js` for security updates
- **HARD-03**: License re-validation (periodic re-ping to Lemon Squeezy) — deferred because it adds a phone-home to an offline-first app; revisit only if piracy is observed
- **HARD-04**: License-key-in-`localStorage` hardening (beyond current Base64 obfuscation)

### Accessibility

- **A11Y-01**: `aria-rowcount` / `aria-rowindex` on dynamically rendered sessions & clients tables
- **A11Y-02**: `aria-current="step"` on the export-modal stepper
- **A11Y-03**: Verify `aria-live` toast announcements function in demo mode
- **A11Y-04**: Harden landing-page `innerHTML` injection (`pricingLegalText`)

## Out of Scope

Explicitly excluded for v1.2. These conflict with the project's zero-build / local-only / offline-first constraints; revisit only if forced.

| Feature | Reason |
|---------|--------|
| Build step / bundler / minification | Conflicts with the zero-build constraint; all JS is served raw by design |
| Full ES-module import/export system | Same zero-build constraint; the IIFE-global pattern is intentional |
| Multi-device / cloud sync | Destroys the privacy value proposition and adds GDPR processor obligations |
| Removing `unsafe-inline` from `script-src` | Requires nonce/hash CSP refactor across all inline `<script>` blocks; out of scope for v1.2 (header migration in VER-04 does not touch this) |

## Traceability

Which phases cover which requirements. Status filled during execution.

| Requirement | Phase | Status |
|-------------|-------|--------|
| VER-01 | Phase 28 | Complete |
| VER-02 | Phase 28 | Complete |
| VER-03 | Phase 28 | Complete |
| VER-04 | Phase 28 | Complete |
| VER-05 | Phase 28 | Complete |
| VER-06 | Phase 28 | Complete |
| OBS-01 | Phase 29 | Complete |
| OBS-02 | Phase 29 | Complete |
| OBS-03 | Phase 29 | Complete |
| TEST-01 | Phase 30 | Complete |
| TEST-02 | Phase 30 | Complete |
| TEST-03 | Phase 30 | Complete |
| TEST-04 | Phase 30 | Complete |
| RFCT-01 | Phase 31 | Complete |
| RFCT-02 | Phase 31 | Complete |
| RFCT-03 | Phase 31 | Complete |
| DOCS-01 | Phase 32 | Complete |
| DOCS-02 | Phase 32 | Complete |
| I18N-01 | Phase 33 | Pending |
| I18N-02 | Phase 33 | Pending |
| PDFX-01 | Phase 34 | Complete |
| PDFX-02 | Phase 34 | Complete |
| PDFX-03 | Phase 34 | Descoped (invalid premise — export only reachable in read mode) |
| DEMO-01 | Phase 35 | Complete |
| DEMO-02 | Phase 35 | Complete |
| DEMO-03 | Phase 35 | Complete |
| DEMO-04 | Phase 35 | Complete |
| DEMO-05 | Phase 35 | Complete |
| DEMO-06 | Phase 35 | Complete |
| DEMO-07 | Phase 35 | Complete |
| DEMO-08 | Phase 35 | Complete |
| DEMO-09 | Phase 35 | Complete |
| DEMO-10 | Phase 35 | Complete |
| DEMO-11 | Phase 35 | Complete |

**Coverage:**

- v1.2 requirements: 34 total (23 original + 11 DEMO-* formalized 2026-06-30)
- Mapped to phases: 34
- Unmapped: 0

---
*Requirements defined: 2026-06-22 (v1.2 Codebase Health & Reliability)*
*Source: ROADMAP.md v1.2 locked scope + `.planning/codebase/CONCERNS.md` triage (2026-06-22)*
