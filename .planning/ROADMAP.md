# Roadmap: TherapistPortfolioManager

## Overview

Transform the existing functional vanilla JS prototype into a sellable product for Emotion Code / Body Code therapists. The journey moves through six phases: establishing the technical foundation (design tokens, fonts, migration infrastructure, backup safety), visually transforming the app (garden theme, dark mode, RTL-safe CSS), consolidating and expanding the data model with new features, internationalizing to 4 languages while researching distribution options, implementing legal compliance and production packaging, and finally validating quality across all dimensions while creating maintainer documentation for Sapir.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Design tokens, self-hosted fonts, DB migration infrastructure, and backup safety net
- [ ] **Phase 2: Visual Transformation** - Garden theme overhaul, dark mode, CSS logical properties, and nav extraction
- [ ] **Phase 3: Data Model and Features** - Session field consolidation (with Sapir), expanded types, new fields, search, and greeting
- [ ] **Phase 4: Internationalization and Distribution Research** - 4-language i18n, RTL validation, hosting and payment research
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
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: Visual Transformation
**Goal**: The app looks and feels like a professional, sellable product with garden theme aesthetics and full dark mode support
**Depends on**: Phase 1 (design tokens must exist before theming)
**Requirements**: DSGN-01, DSGN-02, DSGN-03, DSGN-04
**Success Criteria** (what must be TRUE):
  1. The app displays warm cream backgrounds, garden green primary colors, orange accents, and Rubik typography across all 5 pages
  2. User can toggle between light and dark modes via a visible control, and the preference persists across browser sessions with no flash of wrong theme on reload
  3. All directional CSS uses logical properties (inline-start/inline-end) -- switching to Hebrew RTL requires zero CSS overrides
  4. Navigation is rendered from a single JS component -- changing a nav item updates all 5 pages automatically
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Data Model and Features
**Goal**: The clinical data model is finalized with Sapir's input, expanded client types and session fields are live, and key usability features work
**Depends on**: Phase 1 (migration infrastructure required for schema changes)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, FEAT-01, FEAT-02
**Success Criteria** (what must be TRUE):
  1. Sapir has reviewed and approved the final session field list, and the app's data model matches the agreed structure
  2. User can create clients with types Adult, Child, Animal, or Other (replacing the old Human/Animal split)
  3. User can record a referral source when adding or editing a client
  4. Sessions include fields for Limiting Beliefs, Additional Techniques, Important Points, and Next Session Info (per consolidation decisions)
  5. User can search clients by name, phone, or email with results filtering in real-time as they type
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Internationalization and Distribution Research
**Goal**: The app speaks four languages with accurate clinical terminology, and the distribution and payment strategy is decided
**Depends on**: Phase 3 (all translatable field names must be finalized before translation)
**Requirements**: I18N-01, I18N-02, I18N-03, I18N-04, DIST-01, DIST-02
**Success Criteria** (what must be TRUE):
  1. User can switch between English, Hebrew, German, and Czech -- all UI text renders correctly in each language
  2. Hebrew mode displays fully right-to-left with no layout breaks across all pages and features added in Phases 2-3
  3. i18n translations live in separate per-language files (not one monolithic file), and adding a new language requires only adding a new file
  4. A documented decision exists for hosting platform (with rationale) and payment solution (with EU VAT handling confirmed)
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

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
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

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
| 1. Foundation | 0/? | Not started | - |
| 2. Visual Transformation | 0/? | Not started | - |
| 3. Data Model and Features | 0/? | Not started | - |
| 4. Internationalization and Distribution Research | 0/? | Not started | - |
| 5. Legal and Production Packaging | 0/? | Not started | - |
| 6. Quality and Developer Experience | 0/? | Not started | - |
