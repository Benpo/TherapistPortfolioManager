# Roadmap: TherapistPortfolioManager

## Overview

Transform the existing functional vanilla JS prototype into a sellable product for Emotion Code / Body Code therapists. The journey moves through six phases: establishing the technical foundation (design tokens, fonts, migration infrastructure, backup safety), visually transforming the app (garden theme, dark mode, RTL-safe CSS), consolidating and expanding the data model with new features, internationalizing to 4 languages while researching distribution options, implementing legal compliance and production packaging, and finally validating quality across all dimensions while creating maintainer documentation for Sapir.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Design tokens, self-hosted fonts, DB migration infrastructure, and backup safety net (completed 2026-03-09)
- [x] **Phase 2: Visual Transformation** - Garden theme overhaul, dark mode, CSS logical properties, and nav extraction (completed 2026-03-10)
- [x] **Phase 3: Data Model and Features** - Session field consolidation (with Sapir), expanded types, new fields, search, and greeting (completed 2026-03-10)
- [x] **Phase 4: Internationalization and Distribution Research** - 4-language i18n, RTL validation, hosting and payment research (completed 2026-03-12)
- [ ] **Phase 5: Legal and Production Packaging** - Disclaimer compliance, access gating, PWA setup, distribution-ready bundle
- [ ] **Phase 6: Quality and Developer Experience** - Playwright tests, cross-browser/RTL/responsive QA, maintainer guides for Sapir

## Phase Details

### Phase 1: Foundation
**Goal**: All technical prerequisites are in place so that visual, data, and feature work can build on solid ground without rework
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04
**Success Criteria** (what must be TRUE):
  1. Every color, shadow, and border in the CSS references a design token variable -- no hardcoded color values remain
  2. The app loads its font (Rubik) from local WOFF2 files with no external network requests
  3. IndexedDB opens with a migration handler that can upgrade through multiple schema versions sequentially
  4. After 7 days without exporting data, the user sees a backup reminder prompt with snooze and export options
  5. The app requests persistent storage via navigator.storage.persist() on first load
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — CSS design token system (tokens.css) + Rubik self-hosted fonts (FOUND-01, FOUND-02)
- [ ] 01-02-PLAN.md — IndexedDB sequential migration infrastructure (FOUND-03)
- [ ] 01-03-PLAN.md — Backup reminder banner + navigator.storage.persist() (FOUND-04)

### Phase 2: Visual Transformation
**Goal**: The app looks and feels like a professional, sellable product with garden theme aesthetics and full dark mode support
**Depends on**: Phase 1 (design tokens must exist before theming)
**Requirements**: DSGN-01, DSGN-02, DSGN-03, DSGN-04
**Success Criteria** (what must be TRUE):
  1. The app displays warm cream backgrounds, garden green primary colors, orange accents, and Rubik typography across all 5 pages
  2. User can toggle between light and dark modes via a visible control, and the preference persists across browser sessions with no flash of wrong theme on reload
  3. All directional CSS uses logical properties (inline-start/inline-end) -- switching to Hebrew RTL requires zero CSS overrides
  4. Navigation is rendered from a single JS component -- changing a nav item updates all 5 pages automatically
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Garden palette (tokens.css) + brand area + nav component extraction + no-flash scripts (DSGN-01, DSGN-04)
- [ ] 02-02-PLAN.md — Night-garden dark mode palette (tokens.css) + theme toggle (DSGN-02)
- [ ] 02-03-PLAN.md — CSS logical properties migration (app.css) (DSGN-03)

### Phase 3: Data Model and Features
**Goal**: The clinical data model is finalized with Sapir's input, expanded client types and session fields are live, and key usability features work
**Depends on**: Phase 1 (migration infrastructure required for schema changes)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, FEAT-01, FEAT-02
**Success Criteria** (what must be TRUE):
  1. Sapir has reviewed and approved the final session field list, and the app's data model matches the agreed structure
  2. User can create clients with types Adult, Child, Animal, or Other (replacing the old Human/Animal split)
  3. User can record a referral source when adding or editing a client
  4. Sessions include fields for Limiting Beliefs, Additional Techniques, Important Points, and Next Session Info (per consolidation decisions)
  5. User can search clients by name with results filtering in real-time as they type
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — DB migration v2 + client type expansion (Adult/Child/Animal/Other) + referral source dropdown (DATA-02, DATA-03)
- [ ] 03-02-PLAN.md — Session field consolidation: Important Points, form reorder, severity delta, markdown export (DATA-01, DATA-04)
- [ ] 03-03-PLAN.md — Client search, daily quotes with attribution, brand mark homepage link (FEAT-01, FEAT-02)

### Phase 4: Internationalization and Distribution Research
**Goal**: The app speaks four languages with accurate clinical terminology suited to energy healing (not medical), and the distribution and payment strategy is decided and documented
**Depends on**: Phase 3 (all translatable field names must be finalized before translation)
**Requirements**: I18N-01, I18N-02, I18N-03, I18N-04, DIST-01, DIST-02
**Success Criteria** (what must be TRUE):
  1. User can switch between English, Hebrew, German, and Czech -- all UI text renders correctly in each language
  2. Hebrew mode displays fully right-to-left with no layout breaks across all pages and features added in Phases 2-3
  3. i18n translations live in separate per-language files (not one monolithic file), and adding a new language requires only adding a new file
  4. A documented decision exists for hosting platform (with rationale) and payment solution (with EU VAT handling confirmed)
**Plans**: 3 plans

Plans:
- [ ] 04-01-PLAN.md — i18n file split + Heart Shield/Practice/Sessions Garden renames + subtitle wiring (I18N-01, I18N-02, I18N-03)
- [ ] 04-02-PLAN.md — Quotes overhaul: Hebrew fixes, 7 replacement quotes, DE/CS quality review (I18N-02, I18N-03)
- [ ] 04-03-PLAN.md — RTL validation for Phase 2-3 features + distribution decision document (I18N-04, DIST-01, DIST-02)

### Phase 5: Legal and Production Packaging
**Goal**: The app is legally compliant for EU/German sales and packaged for distribution as a paid product
**Depends on**: Phase 4 (i18n must be complete for all disclaimer text; distribution decisions inform packaging)
**Requirements**: LEGL-01, LEGL-02, LEGL-03, DIST-03, DIST-04, DIST-05
**Success Criteria** (what must be TRUE):
  1. On first launch, the app displays a disclaimer/T&C screen that blocks access until the user accepts -- no app functionality is accessible before acceptance
  2. After accepting terms, the user can download a receipt file as proof of acceptance
  3. Disclaimer content covers EU consumer protection, German Widerrufsrecht, and privacy disclosure (no data collection) per existing legal research
  4. The app works offline after first load -- service worker caches all assets, and the app is installable via "Add to Home Screen"
  5. A working access-gating mechanism (license key, hash check, or equivalent) controls access for paid users
**Plans**: 3 plans

Plans:
- [ ] 05-01-PLAN.md — Disclaimer/T&C gate with 4-language legal content, Widerrufsrecht checkbox, acceptance receipt (LEGL-01, LEGL-02, LEGL-03)
- [ ] 05-02-PLAN.md — License key gate via Lemon Squeezy API + PWA service worker and manifest (DIST-03, DIST-04)
- [ ] 05-03-PLAN.md — Marketing landing page with purchase flow, Impressum, Datenschutzerklaerung (DIST-05)

### Phase 05.1: Landing Page Visual Redesign (INSERTED)

**Goal:** Redesign landing page visual identity — colors, typography, layout elements, botanical illustrations, and overall look and feel — based on Sapir's design preferences
**Depends on**: Phase 5 (landing page must exist before visual redesign)
**Requirements**: DIST-05
**Plans:** 2/2 plans complete

Plans:
- [ ] 05.1-01-PLAN.md — Hero gradient, typography refinements, hand-drawn doodle botanical SVGs for hero and section divider (DIST-05)
- [ ] 05.1-02-PLAN.md — Feature card doodle icons replacing emoji + Sapir visual approval checkpoint (DIST-05)

### Phase 05.2: Landing Page Polish (INSERTED)

**Goal:** Polish the landing page before launch — fix botanical illustrations (more delicate/subtle), replace feature card icons with beautiful ones matching the design, add a screenshots placeholder section, add a contact section, fix Impressum placeholder.
**Depends on**: Phase 05.1 (visual identity must be established before polish)
**Requirements**: DIST-05
**Plans:** 3 plans

Plans:
- [ ] 05.2-01-PLAN.md — Botanical opacity/stroke reduction + DOODLE_ICONS replacement with beautiful hand-drawn icons
- [ ] 05.2-02-PLAN.md — Screenshots placeholder section + Contact section + i18n for all 4 languages
- [ ] 05.2-03-PLAN.md — Sapir visual approval checkpoint

### Phase 6: Quality and Developer Experience
**Goal**: The product is validated across all browsers, modes, and languages, with automated tests and documentation enabling Sapir to maintain it independently
**Depends on**: Phase 5 (QA tests the final packaged product)
**Requirements**: FOUND-05, QA-01, QA-02, QA-03, QA-04, DEVX-01, DEVX-02, DEVX-03
**Success Criteria** (what must be TRUE):
  1. Playwright test suite covers IndexedDB CRUD, data integrity, navigation, and i18n switching -- all tests pass
  2. The app works correctly in Chrome, Firefox, Safari, and Edge in both light and dark modes
  3. All pages render correctly in Hebrew RTL mode and on mobile/tablet viewports
  4. IndexedDB data survives a version migration without data loss (verified by test)
  5. Sapir can follow the maintainer guide to make a text change, preview it locally, and push it to GitHub without Ben's help
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 1.1 -> 2 -> 2.1 -> 3 -> etc.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete   | 2026-03-09 |
| 2. Visual Transformation | 3/3 | Complete | 2026-03-10 |
| 3. Data Model and Features | 3/3 | Complete | 2026-03-10 |
| 4. Internationalization and Distribution Research | 3/3 | Complete | 2026-03-12 |
| 5. Legal and Production Packaging | 2/3 | In Progress|  |
| 5.1 Landing Page Visual Redesign | 0/2 | Not started | - |
| 5.2 Landing Page Polish | 0/3 | Not started | - |
| 6. Quality and Developer Experience | 0/? | Not started | - |
