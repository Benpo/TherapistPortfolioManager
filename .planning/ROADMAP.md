# Roadmap: TherapistPortfolioManager

## Overview

Transform the existing functional vanilla JS prototype into a sellable product for Emotion Code / Body Code therapists. The journey moves through six phases: establishing the technical foundation (design tokens, fonts, migration infrastructure, backup safety), visually transforming the app (garden theme, dark mode, RTL-safe CSS), consolidating and expanding the data model with new features, internationalizing to 4 languages while researching distribution options, implementing legal compliance and production packaging, and finally validating quality across all dimensions while creating maintainer documentation for Sapir.

## Milestones

- ✅ **v1.0 MVP** - Phases 1-7 (shipped 2026-03-18)
- 🚧 **v1.1 Final Polish & Launch** - Phases 8-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-7) - SHIPPED 2026-03-18</summary>

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Design tokens, self-hosted fonts, DB migration infrastructure, and backup safety net (completed 2026-03-09)
- [x] **Phase 2: Visual Transformation** - Garden theme overhaul, dark mode, CSS logical properties, and nav extraction (completed 2026-03-10)
- [x] **Phase 3: Data Model and Features** - Session field consolidation (with Sapir), expanded types, new fields, search, and greeting (completed 2026-03-10)
- [x] **Phase 4: Internationalization and Distribution Research** - 4-language i18n, RTL validation, hosting and payment research (completed 2026-03-12)
- [x] **Phase 5: Legal and Production Packaging** - Disclaimer compliance, access gating, PWA setup, distribution-ready bundle
- [x] **Phase 05.1: Landing Page Visual Redesign (INSERTED)** - Redesign landing page visual identity
- [x] **Phase 05.2: Landing Page Polish (INSERTED)** - Aurora hero, botanical images, screenshots, legal accordion
- [x] **Phase 6: Quality and Developer Experience** - Cross-browser/RTL/responsive QA, maintainer guides
- [x] **Phase 7: ZIP Backup Strategy** - ZIP export/import replacing JSON backup

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
- [x] 01-01-PLAN.md — CSS design token system (tokens.css) + Rubik self-hosted fonts (FOUND-01, FOUND-02)
- [x] 01-02-PLAN.md — IndexedDB sequential migration infrastructure (FOUND-03)
- [x] 01-03-PLAN.md — Backup reminder banner + navigator.storage.persist() (FOUND-04)

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
- [x] 02-01-PLAN.md — Garden palette (tokens.css) + brand area + nav component extraction + no-flash scripts (DSGN-01, DSGN-04)
- [x] 02-02-PLAN.md — Night-garden dark mode palette (tokens.css) + theme toggle (DSGN-02)
- [x] 02-03-PLAN.md — CSS logical properties migration (app.css) (DSGN-03)

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
- [x] 03-01-PLAN.md — DB migration v2 + client type expansion (Adult/Child/Animal/Other) + referral source dropdown (DATA-02, DATA-03)
- [x] 03-02-PLAN.md — Session field consolidation: Important Points, form reorder, severity delta, markdown export (DATA-01, DATA-04)
- [x] 03-03-PLAN.md — Client search, daily quotes with attribution, brand mark homepage link (FEAT-01, FEAT-02)

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
- [x] 04-01-PLAN.md — i18n file split + Heart Shield/Practice/Sessions Garden renames + subtitle wiring (I18N-01, I18N-02, I18N-03)
- [x] 04-02-PLAN.md — Quotes overhaul: Hebrew fixes, 7 replacement quotes, DE/CS quality review (I18N-02, I18N-03)
- [x] 04-03-PLAN.md — RTL validation for Phase 2-3 features + distribution decision document (I18N-04, DIST-01, DIST-02)

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
- [x] 05-01-PLAN.md — Disclaimer/T&C gate with 4-language legal content, Widerrufsrecht checkbox, acceptance receipt (LEGL-01, LEGL-02, LEGL-03)
- [x] 05-02-PLAN.md — License key gate via Lemon Squeezy API + PWA service worker and manifest (DIST-03, DIST-04)
- [x] 05-03-PLAN.md — Marketing landing page with purchase flow, Impressum, Datenschutzerklaerung (DIST-05)

### Phase 05.1: Landing Page Visual Redesign (INSERTED)

**Goal:** Redesign landing page visual identity — colors, typography, layout elements, botanical illustrations, and overall look and feel — based on Sapir's design preferences
**Depends on**: Phase 5 (landing page must exist before visual redesign)
**Requirements**: DIST-05
**Plans:** 2/2 plans complete

Plans:
- [x] 05.1-01-PLAN.md — Hero gradient, typography refinements, hand-drawn doodle botanical SVGs for hero and section divider (DIST-05)
- [x] 05.1-02-PLAN.md — Feature card doodle icons replacing emoji + Sapir visual approval checkpoint (DIST-05)

### Phase 05.2: Landing Page Polish (INSERTED)

**Goal:** Polish the landing page before launch — aurora hero animation, real PNG botanical images, real PNG feature card icons, spotlight glow on cards, screenshots section, contact section, accordion legal, Hebrew buy button fix, content box glow effects.
**Depends on**: Phase 05.1 (visual identity must be established before polish)
**Requirements**: DIST-05
**Plans:** 2/3 plans executed

Plans:
- [x] 05.2-01-PLAN.md — Aurora hero background + real PNG botanical images (hero, dividers, footer) + real PNG card icons + spotlight glow (DIST-05)
- [x] 05.2-02-PLAN.md — Screenshots section (real app photos) + contact section + accordion legal + Hebrew buy button fix + content box glow + i18n for all 4 languages (DIST-05)
- [x] 05.2-03-PLAN.md — Sapir visual approval checkpoint (DIST-05)

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
- [x] 06-01: TBD
- [x] 06-02: TBD

### Phase 7: Investigate data backup strategy

**Goal:** Replace JSON export (which embeds base64 photos causing enormous files) with ZIP-based backup, add auto-save to folder, and "send backup to myself" email flow -- all without external servers
**Depends on:** Phase 6
**Requirements**: BKUP-01, BKUP-02, BKUP-03
**Success Criteria** (what must be TRUE):
  1. Export produces a ZIP file containing a small JSON (text data only) and a photos/ subfolder with individual image files
  2. Importing a ZIP restores all data including photos to IndexedDB with a single click
  3. Old JSON backups (pre-ZIP format) can still be imported without errors
  4. User can click "Send backup to myself" to download ZIP and open email client
  5. On Chrome/Edge, user can set a backup folder for automatic saves via File System Access API
  6. All backup UI strings appear in EN, HE, DE, and CS
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md — BackupManager module (backup.js) with ZIP export/import logic + self-hosted JSZip (BKUP-01, BKUP-02)
- [x] 07-02-PLAN.md — Wire BackupManager into UI, add send-to-self and auto-save buttons, i18n, service worker update (BKUP-03)

</details>

---

### v1.1 Final Polish & Launch (In Progress)

**Milestone Goal:** Polish the app for free trial users, fix UX pain points, update visual identity, and complete all launch prerequisites so the product can be sold.

- [x] **Phase 8: Terminology and Quick UX Fixes** - Update מפגש/לקוח terminology across all 4 languages; replace text action buttons with icon buttons (completed 2026-03-19)
- [ ] **Phase 9: Heart Shield Redesign** - Session-level Heart Shield toggle with removal tracking, client table indicators, and session type filter
- [x] **Phase 10: UX Power Features** - Photo crop/reposition after upload; edit client directly from add-session screen (completed 2026-03-19)
- [x] **Phase 11: Visual Identity Update** - Garden decorations in app UI; updated logo; final app icon (completed 2026-03-19)
- [ ] **Phase 12: Launch Prerequisites** - Real Impressum and Datenschutzerklarung; Lemon Squeezy product setup; DE/CS translation verification; cross-browser and mobile QA

## Phase Details

### Phase 8: Terminology and Quick UX Fixes
**Goal**: The app uses practitioner-appropriate terminology in all 4 languages and the clients table actions are compact and intuitive
**Depends on**: Phase 7 (v1.0 complete)
**Requirements**: UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. Every visible string that previously said "treatment" or "patient" (or equivalents in DE/CS/HE) now reads "session" or "client" across all 4 languages
  2. The clients table shows a history icon and a plus icon instead of text buttons; hovering either shows a tooltip naming the action
  3. Switching the app language and re-checking the clients table still shows icon buttons with correct tooltip text in the selected language
**Plans**: 2 plans

Plans:
- [ ] 08-01-PLAN.md — Terminology sweep: update i18n files for EN/HE/DE/CS (UX-01)
- [ ] 08-02-PLAN.md — Icon buttons with tooltips in clients table actions column (UX-02)

### Phase 9: Heart Shield Redesign
**Goal**: Heart Shield tracking works at the session level with visual indicators and filtering, replacing the old client-level approach
**Depends on**: Phase 8
**Requirements**: HSHLD-01, HSHLD-02, HSHLD-03
**Success Criteria** (what must be TRUE):
  1. When adding or editing a session, user can toggle "Heart Shield session" on or off; toggling it on reveals a required "Shield removed?" yes/no field
  2. A client who has had a Heart Shield session and has not yet had it removed shows a heart icon next to their name in the clients table; after removal, the icon changes to a checkmark
  3. The sessions list has a "session type" dropdown that filters to show all sessions, only Heart Shield sessions, or only regular sessions
  4. Saving a Heart Shield session without answering "Shield removed?" is blocked with a visible validation message
**Plans**: 2 plans

Plans:
- [ ] 09-01-PLAN.md — DB migration for Heart Shield session fields + form toggle and validation (HSHLD-01)
- [ ] 09-02-PLAN.md — Heart icon in clients table + session type filter dropdown (HSHLD-02, HSHLD-03)

### Phase 10: UX Power Features
**Goal**: Users can adjust client photos after upload and edit client details without leaving the add-session flow
**Depends on**: Phase 8
**Requirements**: UX-03, UX-04
**Success Criteria** (what must be TRUE):
  1. After uploading a photo, user can drag to reposition it within the circular crop area and confirm the result before saving
  2. The cropped/repositioned photo is what appears in the client card and throughout the app (not the raw uploaded image)
  3. From the add-session screen, user can open an edit-client panel or modal without navigating away; changes saved there immediately reflect in the session form
**Plans**: 2 plans

Plans:
- [ ] 10-01-PLAN.md — Photo crop/reposition UI: drag-to-position within circular canvas crop (UX-03)
- [ ] 10-02-PLAN.md — Edit client shortcut from add-session screen (UX-04)

### Phase 11: Visual Identity Update
**Goal**: The app interior has botanical character matching the landing page, the logo is refreshed, and the app icon is final
**Depends on**: Phase 8 (stable UI before decorating)
**Requirements**: DSGN-05, DSGN-06, LNCH-05
**Success Criteria** (what must be TRUE):
  1. At least the home/overview page and one secondary page display botanical decorative elements (leaves, flowers, or garden motifs) that match the landing page aesthetic
  2. The same updated logo appears in both the app header and the landing page header
  3. The app icon (home screen / PWA install icon) is a final branded image, not a placeholder
**Plans**: 2 plans

Plans:
- [ ] 11-01-PLAN.md — Botanical decorations added to app pages (DSGN-05)
- [ ] 11-02-PLAN.md — Updated logo for app and landing page + final app icon (DSGN-06, LNCH-05)

### Phase 12: Launch Prerequisites
**Goal**: All legal content is real, the payment product is live, translations are verified, and the app passes a manual QA pass
**Depends on**: Phases 9, 10, 11 (app must be feature-complete before QA)
**Requirements**: LNCH-01, LNCH-02, LNCH-03, LNCH-04, LNCH-06
**Success Criteria** (what must be TRUE):
  1. The Impressum page shows Sapir's real business name, address, and contact details (not placeholder text)
  2. The Datenschutzerklarung is a complete, generated privacy policy applicable to a local-only app sold in Germany
  3. The Lemon Squeezy product is configured with real pricing; the landing page buy button links to the live checkout
  4. A native DE or CS speaker (or Sapir) has reviewed and corrected the landing page German and Czech translations
  5. The app opens and functions correctly in Chrome, Firefox, Safari, and Edge; Hebrew RTL layout has no breakage; the layout is usable on mobile viewport
**Plans**: 4 plans

Plans:
- [ ] 12-01-PLAN.md — Comprehensive Datenschutzerklarung in German and English (LNCH-02)
- [ ] 12-02-PLAN.md — DE/CS translation deep review and corrections (LNCH-04)
- [ ] 12-03-PLAN.md — Impressum real content + Lemon Squeezy product setup (LNCH-01, LNCH-03)
- [ ] 12-04-PLAN.md — Manual QA pass: cross-browser, RTL, mobile (LNCH-06)

## Progress

**Execution Order:**
Phases execute in numeric order: 8 → 9 → 10 → 11 → 12

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
| 8. Terminology and Quick UX Fixes | 2/2 | Complete   | 2026-03-19 | - |
| 9. Heart Shield Redesign | 1/2 | In Progress|  | - |
| 10. UX Power Features | 2/2 | Complete    | 2026-03-19 | - |
| 11. Visual Identity Update | 2/2 | Complete    | 2026-03-19 | - |
| 12. Launch Prerequisites | 3/4 | In Progress|  | - |
