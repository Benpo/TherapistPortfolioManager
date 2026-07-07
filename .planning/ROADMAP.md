# Roadmap: TherapistPortfolioManager

## Overview

Transform the existing functional vanilla JS prototype into a sellable product for Emotion Code / Body Code therapists. The journey moves through six phases: establishing the technical foundation (design tokens, fonts, migration infrastructure, backup safety), visually transforming the app (garden theme, dark mode, RTL-safe CSS), consolidating and expanding the data model with new features, internationalizing to 4 languages while researching distribution options, implementing legal compliance and production packaging, and finally validating quality across all dimensions while creating maintainer documentation for Sapir.

## Milestones

- ✅ **v1.0 MVP** — Phases 1–7 (shipped 2026-03-18)
- ✅ **v1.1 Final Polish & Launch** — Phases 8–27 (shipped 2026-06-22) — full phase detail archived in `milestones/v1.1-ROADMAP.md`
- ✅ **v1.2 Codebase Health & Reliability** — Phases 28–38 (shipped 2026-07-07) — full phase detail archived in `milestones/v1.2-ROADMAP.md`

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

<details>
<summary>✅ v1.2 Codebase Health & Reliability (Phases 28–38) — SHIPPED 2026-07-07</summary>

Full goals, success criteria, and per-plan detail are archived in `milestones/v1.2-ROADMAP.md`. Requirements archived in `milestones/v1.2-REQUIREMENTS.md`. Audit in `milestones/v1.2-MILESTONE-AUDIT.md`. A deliberate shift from feature work to maintainability and reliability, run in dependency order: reliable updates + observability, then a test safety net, then refactor behind it, then document the result.

- [x] **Phase 28: Update Reliability & Versioning** — field-verified Safari PWA update fix; single version source → footer + SW cache + runtime integrity self-check; CSP→header; cache TTL (2026-06-22, shipped v1.2.1)
- [x] **Phase 29: Reliability & Observability** — local crash log + "Report a problem" copy flow (zero network); IDB migration reset & recover escape hatch (2026-06-23)
- [x] **Phase 30: Test Harness & Coverage** — first `package.json` + `npm test`; 7 PDF tests fixed; RTL guard; behavior tests on god modules pre-refactor (2026-06-26)
- [x] **Phase 31: Refactor God Modules** — `settings.js`/`add-session.js` extraction into IIFE modules behind the green test net; opportunistic cleanups (2026-06-28)
- [x] **Phase 32: README + Code Comments** — maintainer-audience README rewrite + four-slot comment banner pilot on the 5 refactored files (2026-06-29)
- [x] **Phase 33: DE/CS i18n completion** — 13 export-modal keys translated via AI native-translation panel (2026-07-06)
- [x] **Phase 34: Session PDF Export — Visual Polish** — Sessions Garden brand redesign, derived chronological session ordinal, Hebrew RTL/bidi preserved (2026-06-30)
- [x] **Phase 35: Demo System Refresh / Version Parity** — demo chrome/seed/version brought back to parity with the shipped app (2026-06-30)
- [x] **Phase 36: Code Comments — Batch 2** — four-slot banner convention extended to ~22 core production modules (2026-07-02)
- [x] **Phase 37: Date consistency + date-format setting + session types** — canonical local-time date engine, Personalization tab (6 date formats), two-tier session-type list, terminology/filter relabel (2026-07-06)
- [x] **Phase 38: Next session date field with overview column** — optional next-session date picker + sortable/overdue-aware overview column, incl. 2 UAT gap-closure rounds (2026-07-07)

</details>

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
- **Broader extraction + test-coverage health (post-v1.2 outlook — likely a "v1.3 Codebase Health II")** — surfaced during Phase 30 discussion (2026-06-26). v1.2 only char-tests + refactors the two god modules (`settings.js`, `add-session.js`); the rest of the `.js` landscape has two unaddressed risks: (a) **dangerous test-coverage gaps** in large files (`app.js` = 1,474 lines / only 6 tests; `license.js` 568/0; `overview.js`, `landing.js`), and (b) **further extraction candidates** among the 4-digit files (`backup.js`, `app.js`, `pdf-export.js`, `db.js` — triage god-module vs cohesive-large, don't assume) + an app-wide glue-duplication sweep (`t()` in 5 files, `showToast` in 2). Best done *after* v1.2 establishes the test harness (P30) + extraction pattern (P31) as the template. Full coverage map + scoping in todo: `todos/pending/2026-06-26-broader-extraction-and-test-coverage-health.md`. Decide promotion at v1.2 close.
- **Other pending todos** — see `.planning/todos/pending/` (incl. deactivation data-loss warning, PWA install guidance, v12 IDB encryption, drag-sort settings, modality templates).
- **1-interactive-demo-on-landing-page-embedde** — an old landing-page interactive-demo iframe idea (`quick/1-interactive-demo-on-landing-page-embedde/1-PLAN.md`), never executed; superseded by the Phase 35 demo/chrome convergence work. Acknowledged and deferred at v1.2 close (2026-07-07) — revisit only if a prospective-buyer live demo becomes a priority.

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
| 28. Update Reliability & Versioning | v1.2 | 4/4 | Complete | 2026-06-22 |
| 29. Reliability & Observability | v1.2 | 4/4 | Complete | 2026-06-23 |
| 30. Test Harness & Coverage | v1.2 | 13/13 | Complete | 2026-06-27 |
| 31. Refactor God Modules | v1.2 | 6/6 | Complete | 2026-06-28 |
| 32. README + Code Comments | v1.2 | 4/4 | Complete | 2026-06-29 |
| 33. DE/CS i18n completion | v1.2 | 3/3 | Complete | 2026-07-06 |
| 34. Session PDF Export — Visual Polish | v1.2 | 10/10 | Complete | 2026-06-30 |
| 35. Demo System Refresh / Version Parity | v1.2 | 6/6 | Complete | 2026-06-30 |
| 36. Code Comments — Batch 2 | v1.2 | 5/5 | Complete | 2026-07-02 |
| 37. Date consistency + date-format + session types | v1.2 | 15/15 | Complete | 2026-07-06 |
| 38. Next session date field + overview column | v1.2 | 12/12 | Complete | 2026-07-07 |
</content>
