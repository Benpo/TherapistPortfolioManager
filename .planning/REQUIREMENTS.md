# Requirements: TherapistPortfolioManager

**Defined:** 2026-06-22
**Core Value:** Therapists can efficiently track client sessions, trapped emotions, and clinical progress without any technical setup, internet connection, or data leaving their device.

> **Milestone v1.2 — Codebase Health & Reliability.** A deliberate shift from feature work to **maintainability and reliability**. Scope was co-designed and locked with Ben on 2026-06-22 and sourced from the codebase concerns triage (`.planning/codebase/CONCERNS.md`). Phases run in **dependency order** (28 → 33): get updates reliably delivered + observable, build a test safety net, *then* refactor behind it, *then* document the result. Requirement categories are phase-aligned, continuing the v1.1 convention.

## v1.2 Requirements

Requirements for the Codebase Health & Reliability milestone. Each maps to exactly one roadmap phase (28–33).

### Update Reliability & Versioning (Phase 28)

- [x] **VER-01**: Installed PWA (including iOS Safari) reliably receives and applies app updates — field-verified on a real installed device, not just in theory _(manual verification component — needs a real iOS device)_
- [x] **VER-02**: A single source-of-truth version constant drives the footer version, the service-worker `CACHE_NAME`, and the value the integrity check validates against (today the footer is a static placeholder in `assets/shared-chrome.js:~8`)
- [x] **VER-03**: A runtime integrity self-check detects when the running/cached version diverges from the source-of-truth version and surfaces it — so the displayed version can't silently lie (as v209 did)
- [x] **VER-04**: CSP is delivered via HTTP header in `_headers`, and the per-page `<meta http-equiv>` CSP tags are removed/reconciled
- [x] **VER-05**: `_headers` cache TTL for static JS/CSS is lengthened (e.g. `max-age=86400`+) with the service worker still owning freshness for installed users
- [x] **VER-06**: All update-reliability and versioning behavior remains fully offline — no phone-home / network dependency introduced _(cross-cutting constraint)_

### Reliability & Observability (Phase 29)

- [x] **OBS-01**: Uncaught errors and unhandled promise rejections are captured and the last N persisted to IndexedDB (`window.onerror` + `unhandledrejection`), with zero network calls
- [ ] **OBS-02**: Settings has a "Report a problem" action that copies the persisted error log plus basic diagnostic context to the clipboard for the user to paste into a support email — nothing leaves the device automatically (GDPR-safe)
- [x] **OBS-03**: A failed IndexedDB migration offers a "reset & recover" escape hatch so a user cannot be trapped in an infinite "please refresh" loop

### Test Harness & Coverage (Phase 30)

- [ ] **TEST-01**: The 7 currently-unrunnable PDF tests run green in Node (resolve the `jsdom` `HTMLCanvasElement.getContext` gap and the old-Node `blob.arrayBuffer` issue)
- [ ] **TEST-02**: An automated RTL regression guard fails if `dir="rtl"` is wrongly applied to non-Hebrew locales (EN/DE/CS)
- [ ] **TEST-03**: Behavior tests capture the current observable behavior of the god modules (`settings.js`, `add-session.js`) before any refactor, establishing a green safety net (per `feedback-behavior-verification`)
- [ ] **TEST-04**: The full test suite runs via a single documented command (whether to introduce the project's first `package.json` + dev-dependencies is a plan-time decision)

### Refactor God Modules (Phase 31)

- [ ] **RFCT-01**: Cohesive units are extracted from `settings.js` (~2,827 lines) into separate IIFE modules (e.g. SnippetEditor, PhotoManager, StorageUsage) with no observable behavior change (Phase 30 suite stays green)
- [ ] **RFCT-02**: Export-modal logic is extracted from `add-session.js` (~2,173 lines) into its own IIFE module with behavior preserved (suite green)
- [ ] **RFCT-03**: Opportunistic cleanups within touched code only — `var`→`const`/`let`, `innerHTML`+i18n hardening (`overview.js`/`sessions.js`), `openDB()` connection pooling (cache the resolved `IDBDatabase`), and tagged logging in non-trivial silent `catch` blocks

### README + Code Comments (Phase 32)

- [ ] **DOCS-01**: A project README documents how to run, deploy, and understand the architecture of the app, written for Sapir as the ongoing maintainer
- [ ] **DOCS-02**: The refactored modules carry code-level comments describing their structure and responsibilities _(depends on Phase 31)_

### DE/CS i18n Completion (Phase 33)

- [ ] **I18N-01**: The 13 English-fallback keys in `assets/i18n-de.js` (lines ~419–447) are translated to German; no `// TODO i18n` markers remain _(needs Sapir's strings)_
- [ ] **I18N-02**: The 13 English-fallback keys in `assets/i18n-cs.js` (lines ~419–447) are translated to Czech; no `// TODO i18n` markers remain _(needs Sapir's strings)_

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
| OBS-02 | Phase 29 | Pending |
| OBS-03 | Phase 29 | Complete |
| TEST-01 | Phase 30 | Pending |
| TEST-02 | Phase 30 | Pending |
| TEST-03 | Phase 30 | Pending |
| TEST-04 | Phase 30 | Pending |
| RFCT-01 | Phase 31 | Pending |
| RFCT-02 | Phase 31 | Pending |
| RFCT-03 | Phase 31 | Pending |
| DOCS-01 | Phase 32 | Pending |
| DOCS-02 | Phase 32 | Pending |
| I18N-01 | Phase 33 | Pending |
| I18N-02 | Phase 33 | Pending |

**Coverage:**

- v1.2 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-06-22 (v1.2 Codebase Health & Reliability)*
*Source: ROADMAP.md v1.2 locked scope + `.planning/codebase/CONCERNS.md` triage (2026-06-22)*
