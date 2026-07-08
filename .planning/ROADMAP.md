# Roadmap: TherapistPortfolioManager

## Overview

Transform the existing functional vanilla JS prototype into a sellable product for Emotion Code / Body Code therapists. The journey moves through six phases: establishing the technical foundation (design tokens, fonts, migration infrastructure, backup safety), visually transforming the app (garden theme, dark mode, RTL-safe CSS), consolidating and expanding the data model with new features, internationalizing to 4 languages while researching distribution options, implementing legal compliance and production packaging, and finally validating quality across all dimensions while creating maintainer documentation for Sapir.

## Milestones

- ✅ **v1.0 MVP** — Phases 1–7 (shipped 2026-03-18)
- ✅ **v1.1 Final Polish & Launch** — Phases 8–27 (shipped 2026-06-22) — full phase detail archived in `milestones/v1.1-ROADMAP.md`
- ✅ **v1.2 Codebase Health & Reliability** — Phases 28–38 (shipped 2026-07-07) — full phase detail archived in `milestones/v1.2-ROADMAP.md`
- 🚧 **v1.3 In-App Help, Onboarding & Changelog** — Phases 39–43 (ACTIVE, started 2026-07-07)

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

### 🚧 v1.3 In-App Help, Onboarding & Changelog (Phases 39–43) — ACTIVE

Every practitioner can learn the whole app *inside* the app (welcome, replayable tour, help center) and hears about every release *inside* the app (What's-New popup + changelog page) — with a hard process gate guaranteeing both stay current with every future user-facing change. Zero new production dependencies; fully offline; EN copy canonical (DE/CS/HE deferred). Design seed: the approved Phase 26 `26-UI-SPEC.md`, reconciled against the current (v1.2.x) app. Run dependency-ordered: **help center first** (everything links into it), coordinator-governed onboarding next, then the fragile tour, then the changelog, then the docs gate **last** (so it doesn't block its own milestone's sibling commits).

- [x] **Phase 39: Help Center & "?" Entry Point** — persistent "?" on every app page, offline `help.html` help center (workflow-spine IA + personalization + technical track), full EN content, empty-state deep-links, per-browser install instructions (completed 2026-07-07)
- [ ] **Phase 40: First-Run Welcome & Onboarding Coordinator** — first-run coordinator (single precedence order), branded welcome overlay (tour / explore myself), re-openable from "?", non-nagging install nudge
- [ ] **Phase 41: Replayable Guided Tour** — bespoke ~6–9-step spine tour, graceful degradation (spotlight ↔ modal + "Take me there"), cross-page resume, language re-render
- [ ] **Phase 42: In-App Changelog & What's-New** — once-per-version What's-New popup + persistent changelog page in the help center, one structured data source, v1.3's own notes as first entry
- [ ] **Phase 43: Docs-Maintenance Hard Gate** — layered blocking gate (git hook + unbypassable CI step + GSD DoD) so no user-facing change ships without a changelog entry + updated help topics; validated against v1.3's own ship

## Phase Details (v1.3)

### Phase 39: Help Center & "?" Entry Point

**Goal**: A practitioner can open a comprehensive, offline, workflow-organized help center from a persistent "?" on any app page, and empty states coach them into the right topic.
**Depends on**: Nothing new (first v1.3 phase). Built on the existing `initCommon()` chrome, `renderNav()`, `data-i18n`/4-locale plumbing, and `sw.js` precache.
**Requirements**: HELP-01, HELP-02, HELP-03, HELP-04, HELP-05, HELP-06, HELP-07
**Success Criteria** (what must be TRUE):

  1. A "?" icon appears in the header (beside cloud + gear, RTL-flipped, dark-aware, `.is-active`) on every app page and opens the help center.
  2. `help.html` is browsable any time via a nav entry, organized along the 7-step workflow spine with a "make it yours" personalization section led early and a clearly separated technical-tips track, and its topics are anchor deep-linkable.
  3. EN help content covers every current-app feature (session formats incl. custom, date-format personalization, filters/sorting, next-session date, report-a-problem, updates, backups, activation/2-device transfer, troubleshooting) in current terminology (Heart-Wall, Session Format), verified by a native-speaker agent review and reviewed by Sapir.
  4. A practitioner hitting an empty state (e.g. no clients yet) sees coaching copy that deep-links into the matching help topic.
  5. Help opens fully offline on an installed PWA (new pages/assets added to `sw.js` precache, static-test + real offline-navigation verified), and per-browser PWA install instructions (Chrome/Edge, iOS Safari, Android) are available in Help — never a fake universal install button.

**Plans**: 6/6 plans complete
**Wave 1**

- [x] 39-01-PLAN.md — Help content model + full EN content ({ui:key} interpolation, covers metadata, deep-link registry) + D-25 integrity test [wave 1]
- [x] 39-02-PLAN.md — New UI-chrome i18n keys (nav/entry/search/deep-link), 4-locale parity [wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 39-03-PLAN.md — "?" header popover entry + Help nav entry in app.js + jsdom mount test [wave 2]
- [x] 39-04-PLAN.md — help.html + help.js renderer + soft-type help.css (hybrid A+C IA, search, deep-links, computer-only install glyphs) [wave 2]
- [x] 39-05-PLAN.md — Empty-state coaching deep-links (first-run trio; Sessions true-empty vs filter-empty) [wave 2]

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 39-06-PLAN.md — SW precache + CACHE_NAME/version chore + real-offline & Sapir/DNA/WebKit verification checkpoints [wave 3]

**UI hint**: yes

### Phase 40: First-Run Welcome & Onboarding Coordinator

**Goal**: On first launch a practitioner sees exactly one welcoming surface — a branded welcome offering "take the tour" / "I'll explore myself" — governed by a single first-run coordinator that prevents competing surfaces from stacking, plus a non-nagging install nudge; all re-openable from "?".
**Depends on**: Phase 39 (welcome's "take the tour" / "learn more" CTAs point at the help center and, later, the tour). The coordinator is built first within this phase and is the shared decision point the Phase 42 What's-New popup registers into.
**Requirements**: ONBD-01, ONBD-02, ONBD-03, ONBD-04
**Success Criteria** (what must be TRUE):

  1. The first app launch after activation shows a full-screen branded welcome overlay with two first-class choices ("Take the guided tour" / "I'll explore myself"); it fires exactly once (one-shot flag; either choice or tour completion sets it), and Esc dismisses.
  2. A practitioner can re-open the welcome/tour any time from the "?" entry, and it never auto-re-fires.
  3. On any single launch, only one attention surface appears — a written precedence order across welcome, What's-New, security note, install nudge, and the iOS banner is enforced, with explicit fresh-install-vs-upgrader handling (no competing surfaces stack).
  4. A practitioner who hasn't installed the PWA sees one friendly, dismissable, non-nagging, per-browser-aware install affordance (dismissal remembered) that replaces/reconciles the existing per-session iOS banner.

**Plans**: 1/5 plans executed

**Wave 1**

- [x] 40-01-PLAN.md — New UI-chrome i18n keys (welcome / replay-welcome / install-nudge / mobile-hint) in all 4 locales + parity gate [wave 1]

**Wave 2** *(blocked on Wave 1)*

- [ ] 40-02-PLAN.md — `attention-coordinator.js` core (data-driven precedence registry, one-per-session, demo-off, `beforeinstallprompt` capture) + Variant-B welcome overlay + welcome CSS [wave 2]

**Wave 3** *(blocked on Wave 2; parallel, no file overlap)*

- [ ] 40-03-PLAN.md — Install-nudge surface (Chromium real Install button / macOS Safari pointer) + all-mobile expectation hint (iOS-banner successor) + CSS [wave 3]
- [ ] 40-04-PLAN.md — app.js wiring: `initCommon` → coordinator `run()`, security-note registered as governed surface, "Replay welcome" "?" row [wave 3]
- [ ] 40-05-PLAN.md — Coordinator `<script>` on 8 app pages + iOS banner deletion + SW precache + static gates [wave 3]

**UI hint**: yes

### Phase 41: Replayable Guided Tour

**Goal**: A practitioner can take a replayable, in-voice guided tour along the workflow spine that survives cross-page navigation and language switches and never silently skips a step.
**Depends on**: Phase 39 (tour fallbacks and completion link into the help center — the "Take me there" target) and Phase 40 (launched from the welcome CTA / "?"). Highest technical fragility in the milestone — bespoke engine, no template (`demo-hints.js` deleted); reference is `.planning/sketches/003-tour-fallback/`.
**Requirements**: TOUR-01, TOUR-02, TOUR-03, TOUR-04
**Success Criteria** (what must be TRUE):

  1. A practitioner can launch a ~6–9-step guided tour along the workflow spine only by explicit choice (welcome CTA or "?") — it never auto-runs — and its copy speaks in the app's calm, warm, garden-branded voice (native-speaker-agent verified).
  2. Every tour step degrades gracefully: anchor present & visible → spotlight + tooltip; anchor missing/hidden → centered modal with the same text and a working "Take me there" link — never a silent skip (removing any anchor renders the fallback; an anchor-presence test guards rot).
  3. The tour survives cross-page navigation — steps that live on another page navigate there and resume (sessionStorage state).
  4. Switching language mid-tour re-renders the tour cleanly in the new language and direction (RTL mirroring verified in real WebKit, not jsdom alone).

**Plans**: TBD
**UI hint**: yes

### Phase 42: In-App Changelog & What's-New

**Goal**: A practitioner hears about every release inside the app — a once-per-version "What's New" popup plus a persistent, benefit-led changelog page in the help center — driven by one structured data source, with v1.3's own notes as the first entry.
**Depends on**: Phase 40 (the coordinator governs the popup; What's-New must never fire on the same launch as the first-run welcome) and Phase 39 (the changelog page lives inside the help center). Keys off `window.AppVersion.APP_VERSION`, never the SW/integrity-token layer; must coexist with the existing footer update nudge without double-signalling.
**Requirements**: CHLG-01, CHLG-02, CHLG-03, CHLG-04
**Success Criteria** (what must be TRUE):

  1. Opening the app after a version change shows a "What's New in vX.Y.Z" popup exactly once (keyed on `APP_VERSION` vs a stored last-seen version, suppressed on the very first-ever launch, works fully offline); dismissing records the version so it does not reappear until the next change.
  2. A persistent changelog page inside the help center shows reverse-chronological, version-and-date-grouped, plain-language benefit-led entries (New / Improved / Fixed register, no dev jargon).
  3. One structured, i18n-capable in-app data source drives both the popup (latest entry) and the page (history) — never forked, never scraped from git, no second version constant.
  4. v1.3's own release notes ship as the first changelog entry (self-hosting proof of the pipeline).

**Plans**: TBD
**UI hint**: yes

### Phase 42.1: Help & Onboarding Translation (HE/DE/CS) (INSERTED)

**Goal:** Every v1.3-authored user-facing string reads natively in all four locales — the help body (`help-content-he/de/cs.js` + per-language loader in help.html/help.js with EN fallback), welcome overlay copy, tour copy, and changelog/What's-New entries — so Hebrew-first practitioners get the help center in their own language before the milestone ships.
**Scope notes:** Translation happens AFTER the EN corpus stabilizes (post-P42) — one pass, no double-translation. Pipeline per the D-12/D-19 precedent: agent translation grounded in the shipped EN + each locale's existing i18n register conventions (HE infinitive/plural-imperative house style, DE Sie, CS formal) → native-speaker agent gates (Sonnet) → Sapir human read for Hebrew (CS ships on the Phase-37 accepted-risk precedent; external review only on a deliberate CS push). Per-locale integrity tests mirroring `tests/39-help-integrity.test.js` ({ui:key} resolution against each locale file, forbidden-words, structure parity with EN). Scope decision: Ben 2026-07-08 — L10N-01 moved from v2 deferral into v1.3 (EN-only help was never his intent for a Hebrew-first user base). Must land BEFORE Phase 43 so the docs hard-gate covers translated content from day one.
**Requirements**: L10N-01
**Depends on:** Phase 42
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 42.1 to break down)

### Phase 43: Docs-Maintenance Hard Gate

**Goal**: No user-facing change can ship without a changelog entry and updated help topics — enforced by a layered, hard (blocking) gate, validated against v1.3's own release.
**Depends on**: Phase 42 (needs the `changelog-data.js` shape to parse against). Deliberately landed **last** in the milestone so v1.3's own help/changelog edits are already in place — otherwise the gate would block its own sibling commits. (§11.4 sequencing note: a scaffold-early / enforce-at-close middle path is a discuss-phase option; the requirement is only that final enforcement is HARD and validated on a live ship.) This is repo-tooling, not app code.
**Requirements**: GATE-01, GATE-02, GATE-03, GATE-04
**Success Criteria** (what must be TRUE):

  1. A phase/ship containing user-facing changes cannot complete until a changelog entry exists for those changes AND affected help topics were updated or explicitly marked unaffected — the gate blocks loudly, it does not merely warn.
  2. Enforcement is layered: a fast local git hook (committed `.githooks/`, shared script) + a CI step in the deploy workflow (the unbypassable layer) + a GSD definition-of-done gate.
  3. A written, checkable path-based definition of "user-facing change" governs the gate, with a logged escape hatch for genuine emergencies (never a silent `--no-verify` culture).
  4. The gate hooks the existing release habit — the hand-set `APP_VERSION` bump in `assets/version.js` is the release moment a changelog entry must exist for — and the gate is validated against v1.3's own ship.

**Plans**: TBD
**UI hint**: no

## Backlog

Deferred items. The v1.1 carry-overs are unscoped; the codebase-concerns triage (2026-06-22) is complete.

- **Mobile — `21-03`** — crop bug fix (shared module), overlay-close, body scroll lock, iPhone device checkpoint. Archived: `milestones/v1.1-phases/21-comprehensive-mobile-responsiveness-audit-and-fix-all-app-screens-for-iphone-mobile-viewport/`.
- **Help / onboarding build (Phase 26)** — design complete (`26-UI-SPEC.md`); **build now IN PROGRESS as v1.3 (Phases 39–43)**. Start from the archived UI-SPEC. Todo: `todos/pending/2026-05-15-in-app-onboarding-overview-help.md` (closes at v1.3 ship).
- **LNCH-04** — landing page DE/CS translation verification. Todo: `todos/pending/2026-03-18-verify-landing-page-translations.md`.
- **LNCH-06 (mobile QA)** — folded into the mobile backlog item above.
- **Codebase-map concerns — triaged with Ben 2026-06-22** (`.planning/codebase/CONCERNS.md`):
  - *Folded into v1.2:* error telemetry (P29), IDB escape hatch (P29), CSP→header + cache TTL (P28), RTL guard (P30), `openDB`/`innerHTML`/`var` cleanup (P31), DE/CS i18n (P33).
  - *Deferred to backlog:* license re-validation (adds a phone-home — revisit only if piracy is observed), table pagination, PDF→Web Worker, sequential photo-optimize loop, backup import size cap, jsPDF version pin, a11y (table `aria-rowindex`, export-stepper `aria-current`, toast/demo), landing-page `innerHTML`, license-key-in-localStorage note, IDB record caps.
  - *Won't-do for v1.2:* build step / bundler, full ES-module system, multi-device sync, removing `unsafe-inline` from `script-src` — all conflict with the zero-build / local-only constraints; revisit only if forced.
- **Broader extraction + test-coverage health ("Codebase Health II", candidate for a later milestone)** — surfaced during Phase 30 discussion (2026-06-26); **superseded for the v1.3 slot by the Help/Changelog milestone**, still a valid later-milestone candidate. v1.2 only char-tests + refactors the two god modules (`settings.js`, `add-session.js`); the rest of the `.js` landscape has two unaddressed risks: (a) **dangerous test-coverage gaps** in large files (`app.js` = 1,474 lines / only 6 tests; `license.js` 568/0; `overview.js`, `landing.js`), and (b) **further extraction candidates** among the 4-digit files (`backup.js`, `app.js`, `pdf-export.js`, `db.js` — triage god-module vs cohesive-large, don't assume) + an app-wide glue-duplication sweep (`t()` in 5 files, `showToast` in 2). Full coverage map + scoping in todo: `todos/pending/2026-06-26-broader-extraction-and-test-coverage-health.md`.
- **Other pending todos** — see `.planning/todos/pending/` (incl. deactivation data-loss warning, PWA install guidance [absorbed into v1.3 H-9], v12 IDB encryption, drag-sort settings, modality templates).
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
| 39. Help Center & "?" Entry Point | v1.3 | 6/6 | Complete    | 2026-07-07 |
| 40. First-Run Welcome & Onboarding Coordinator | v1.3 | 1/5 | In Progress|  |
| 41. Replayable Guided Tour | v1.3 | 0/TBD | Not started | - |
| 42. In-App Changelog & What's-New | v1.3 | 0/TBD | Not started | - |
| 43. Docs-Maintenance Hard Gate | v1.3 | 0/TBD | Not started | - |
</content>
</invoke>
