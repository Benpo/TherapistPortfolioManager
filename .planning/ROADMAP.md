# Roadmap: TherapistPortfolioManager

## Overview

Transform the existing functional vanilla JS prototype into a sellable product for Emotion Code / Body Code therapists. The journey moves through six phases: establishing the technical foundation (design tokens, fonts, migration infrastructure, backup safety), visually transforming the app (garden theme, dark mode, RTL-safe CSS), consolidating and expanding the data model with new features, internationalizing to 4 languages while researching distribution options, implementing legal compliance and production packaging, and finally validating quality across all dimensions while creating maintainer documentation for Sapir.

## Milestones

- ✅ **v1.0 MVP** — Phases 1–7 (shipped 2026-03-18)
- ✅ **v1.1 Final Polish & Launch** — Phases 8–27 (shipped 2026-06-22) — full phase detail archived in `milestones/v1.1-ROADMAP.md`
- 📋 **v1.2 Codebase Health & Reliability** — Phases 28–33 (scope co-designed & locked with Ben 2026-06-22; per-phase planning not yet started)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–7) — SHIPPED 2026-03-18</summary>

- [x] **Phase 1: Foundation** — design tokens, self-hosted fonts, DB migration infrastructure, backup safety net (2026-03-09)
- [x] **Phase 2: Visual Transformation** — garden theme, dark mode, CSS logical properties, nav extraction (2026-03-10)
- [x] **Phase 3: Data Model and Features** — session field consolidation, expanded types, new fields, search, greeting (2026-03-10)
- [x] **Phase 4: Internationalization and Distribution Research** — 4-language i18n, RTL validation, hosting/payment research (2026-03-12)
- [x] **Phase 5: Legal and Production Packaging** — disclaimer compliance, access gating, PWA setup, distribution bundle
- [x] **Phase 05.1: Landing Page Visual Redesign** (INSERTED) — landing visual identity
- [x] **Phase 05.2: Landing Page Polish** (INSERTED) — aurora hero, botanical images, screenshots, legal accordion
- [x] **Phase 6: Quality and Developer Experience** — cross-browser/RTL/responsive QA, maintainer guides
- [x] **Phase 7: ZIP Backup Strategy** — ZIP export/import replacing JSON backup (2026-03-18)

</details>

<details>
<summary>✅ v1.1 Final Polish & Launch (Phases 8–27) — SHIPPED 2026-06-22</summary>

Full goals, success criteria, and per-plan detail are archived in `milestones/v1.1-ROADMAP.md`. Phase directories are in `milestones/v1.1-phases/`.

- [x] **Phase 8: Terminology and Quick UX Fixes** — 2/2 (2026-03-19)
- [x] **Phase 9: Heart Shield Redesign** — 2/2
- [x] **Phase 10: UX Power Features** — 2/2 (2026-03-19)
- [x] **Phase 11: Visual Identity Update** — 2/2 (2026-03-19)
- [x] **Phase 12: Launch Prerequisites** — 4/4 (2026-03-19)
- [x] **Phase 13: Greeting Quotes** — 1/1
- [x] **Phase 14: i18n / Footer / Email** — 6/6
- [x] **Phase 15: Architecture & UI Audit** — 3/3 (2026-03-23)
- [x] **Phase 16: Audit Fix — Code** — 5/5 (2026-03-23)
- [x] **Phase 17: Audit Fix — Business** — 3/3 (2026-03-24)
- [x] **Phase 18: Technical Debt** — 3/3 (2026-03-24)
- [x] **Phase 19: Go-Live Preparation** — 8/8 (2026-03-24)
- [x] **Phase 20: Pre-Launch UI Polish** — 3/3 (2026-03-25)
- ⏸ **Phase 21: Mobile Responsiveness** — 2/3, **PARTIAL** — `21-03` (crop bug fix, overlay-close, body scroll lock, iPhone checkpoint) deferred to backlog (mobile not a launch blocker)
- [x] **Phase 22: Session Workflow Loop** — 15/15
- [x] **Phase 23: PDF Hebrew RTL Rewrite** — 11/11 (2026-05-12)
- [x] **Phase 24: Pre-Launch Final Cleanup** — 8/8 (2026-05-14)
- [x] **Phase 25: Backup Architectural Rework** — 13/13 (2026-05-16)
- 🎨 **Phase 26: In-App Onboarding / Help** — **DESIGN-ONLY**; `26-UI-SPEC.md` approved (6/6 PASS), build deferred to backlog. Build phase MUST start from `milestones/v1.1-phases/26-in-app-onboarding-overview-help-system/26-UI-SPEC.md`
- [x] **Phase 27: Backup Modal Visual Cohesion** — 1/1 (2026-06-15)

</details>

### 📋 v1.2 — Codebase Health & Reliability (Planned — Phases 28–33)

Scope **co-designed and locked with Ben 2026-06-22** (see PROJECT.md Key Decisions). A deliberate shift from feature work to maintainability and reliability. Phases run in **dependency order**: get updates reliably delivered + observable, build a test safety net, *then* refactor behind it, *then* document the result. No PLAN files yet — `/gsd-plan-phase` per phase in upcoming sessions.

- [ ] **Phase 28: Update Reliability & Versioning** — field-verified fix for installed-Safari PWA updates; one source-of-truth version constant driving the footer + SW `CACHE_NAME` + a runtime **integrity self-check** (so the displayed version can't lie, as v209 did); CSP `<meta>`→HTTP header; `_headers` cache TTL. Fully offline-compatible (no phone-home). Footer source today: `assets/shared-chrome.js:~8`.
- [ ] **Phase 29: Reliability & Observability** — local crash log persisted to IndexedDB + a Settings "Report a problem" copy-to-clipboard flow (zero network, GDPR-safe); IDB migration "reset & recover" escape hatch so a failed migration can't trap a user in an infinite refresh loop.
- [ ] **Phase 30: Test Harness & Coverage** — fix the 7 PDF tests that can't run in Node (`jsdom` lacks `HTMLCanvasElement.getContext`; old-Node `blob.arrayBuffer`); add an RTL regression guard; add **behavior tests on the god modules before the refactor** (per `feedback-behavior-verification`). May introduce the project's first `package.json` + dev-dependency (decide at plan time).
- [ ] **Phase 31: Refactor God Modules** — behavior-preserving extraction from `settings.js` (~2,827 lines) and `add-session.js` (~2,173 lines) using the existing IIFE pattern; guarded by the green suite from Phase 30. Opportunistic in touched code: `var`→`const`, `innerHTML`-i18n hardening, `openDB()` connection pooling, logging in silent catches.
- [ ] **Phase 32: README + Code Comments** — project README (run/deploy/architecture) for Sapir as ongoing maintainer; code-level comments describing the *refactored* structure.
- [ ] **Phase 33: DE/CS i18n completion** — translate the 13 export-modal keys currently showing English to German/Czech users (needs Sapir's strings). Independent of the others — slot in whenever ready.

## Backlog

Deferred items. The v1.1 carry-overs are unscoped; the codebase-concerns triage (2026-06-22) is complete.

- **Mobile — `21-03`** — crop bug fix (shared module), overlay-close, body scroll lock, iPhone device checkpoint. Archived: `milestones/v1.1-phases/21-comprehensive-mobile-responsiveness-audit-and-fix-all-app-screens-for-iphone-mobile-viewport/`.
- **Help / onboarding build (Phase 26)** — design complete (`26-UI-SPEC.md`), build deferred. Start from the archived UI-SPEC. Todo: `todos/pending/2026-05-15-in-app-onboarding-overview-help.md`.
- **LNCH-04** — landing page DE/CS translation verification. Todo: `todos/pending/2026-03-18-verify-landing-page-translations.md`.
- **LNCH-06 (mobile QA)** — folded into the mobile backlog item above.
- **Codebase-map concerns — triaged with Ben 2026-06-22** (`.planning/codebase/CONCERNS.md`):
  - *Folded into v1.2:* error telemetry (P29), IDB escape hatch (P29), CSP→header + cache TTL (P28), RTL guard (P30), `openDB`/`innerHTML`/`var` cleanup (P31), DE/CS i18n (P33).
  - *Deferred to backlog:* license re-validation (adds a phone-home — revisit only if piracy is observed), table pagination, PDF→Web Worker, sequential photo-optimize loop, backup import size cap, jsPDF version pin, a11y (table `aria-rowindex`, export-stepper `aria-current`, toast/demo), landing-page `innerHTML`, license-key-in-localStorage note, IDB record caps.
  - *Won't-do for v1.2:* build step / bundler, full ES-module system, multi-device sync, removing `unsafe-inline` from `script-src` — all conflict with the zero-build / local-only constraints; revisit only if forced.
- **Other pending todos** — see `.planning/todos/pending/` (10 items, incl. deactivation data-loss warning, PWA install guidance, v12 IDB encryption, drag-sort settings, modality templates).

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-09 |
| 2. Visual Transformation | v1.0 | 3/3 | Complete | 2026-03-10 |
| 3. Data Model and Features | v1.0 | 3/3 | Complete | 2026-03-10 |
| 4. Internationalization and Distribution Research | v1.0 | 3/3 | Complete | 2026-03-12 |
| 5. Legal and Production Packaging | v1.0 | 3/3 | Complete | - |
| 5.1 Landing Page Visual Redesign | v1.0 | 2/2 | Complete | - |
| 5.2 Landing Page Polish | v1.0 | 3/3 | Complete | - |
| 6. Quality and Developer Experience | v1.0 | 2/2 | Complete | - |
| 7. ZIP Backup Strategy | v1.0 | 2/2 | Complete | 2026-03-18 |
| 8. Terminology and Quick UX Fixes | v1.1 | 2/2 | Complete | 2026-03-19 |
| 9. Heart Shield Redesign | v1.1 | 2/2 | Complete | - |
| 10. UX Power Features | v1.1 | 2/2 | Complete | 2026-03-19 |
| 11. Visual Identity Update | v1.1 | 2/2 | Complete | 2026-03-19 |
| 12. Launch Prerequisites | v1.1 | 4/4 | Complete | 2026-03-19 |
| 13. Greeting Quotes | v1.1 | 1/1 | Complete | - |
| 14. i18n/Footer/Email | v1.1 | 6/6 | Complete | - |
| 15. Architecture/UI Audit | v1.1 | 3/3 | Complete | 2026-03-23 |
| 16. Audit Fix: Code | v1.1 | 5/5 | Complete | 2026-03-23 |
| 17. Audit Fix: Business | v1.1 | 3/3 | Complete | 2026-03-24 |
| 18. Technical Debt | v1.1 | 3/3 | Complete | 2026-03-24 |
| 19. Go-Live Preparation | v1.1 | 8/8 | Complete | 2026-03-24 |
| 20. Pre-Launch UI Polish | v1.1 | 3/3 | Complete | 2026-03-25 |
| 21. Mobile Responsiveness | v1.1 | 2/3 | Partial — 21-03 deferred to backlog | - |
| 22. Session Workflow Loop | v1.1 | 15/15 | Complete | - |
| 23. PDF Hebrew RTL Rewrite | v1.1 | 11/11 | Complete | 2026-05-12 |
| 24. Pre-Launch Final Cleanup | v1.1 | 8/8 | Complete | 2026-05-14 |
| 25. Backup Architectural Rework | v1.1 | 13/13 | Complete | 2026-05-16 |
| 26. In-App Onboarding / Help | v1.1 | Design-only | Deferred — build in backlog | - |
| 27. Backup Modal Visual Cohesion | v1.1 | 1/1 | Complete | 2026-06-15 |
| 28. Update Reliability & Versioning | v1.2 | 0/– | Planned | - |
| 29. Reliability & Observability | v1.2 | 0/– | Planned | - |
| 30. Test Harness & Coverage | v1.2 | 0/– | Planned | - |
| 31. Refactor God Modules | v1.2 | 0/– | Planned | - |
| 32. README + Code Comments | v1.2 | 0/– | Planned | - |
| 33. DE/CS i18n completion | v1.2 | 0/– | Planned | - |
