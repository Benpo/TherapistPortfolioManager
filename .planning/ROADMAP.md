# Roadmap: TherapistPortfolioManager

## Overview

Transform the existing functional vanilla JS prototype into a sellable product for Emotion Code / Body Code therapists. The journey moves through six phases: establishing the technical foundation (design tokens, fonts, migration infrastructure, backup safety), visually transforming the app (garden theme, dark mode, RTL-safe CSS), consolidating and expanding the data model with new features, internationalizing to 4 languages while researching distribution options, implementing legal compliance and production packaging, and finally validating quality across all dimensions while creating maintainer documentation for Sapir.

## Milestones

- ✅ **v1.0 MVP** - Phases 1-7 (shipped 2026-03-18)
- 🚧 **v1.1 Final Polish & Launch** - Phases 8-20 (in progress)

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
- [x] 20-01-PLAN.md — Backup dialog cancel/X, dark mode deactivation fix, birth date picker (POLISH-01, POLISH-03, POLISH-04)
- [x] 20-02-PLAN.md — App header popover redesign + shared footer on app pages (POLISH-02, POLISH-06)
- [x] 20-03-PLAN.md — License page chrome + footer on legal pages + visual checkpoint (POLISH-05)

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
- [x] 20-01-PLAN.md — Backup dialog cancel/X, dark mode deactivation fix, birth date picker (POLISH-01, POLISH-03, POLISH-04)
- [x] 20-02-PLAN.md — App header popover redesign + shared footer on app pages (POLISH-02, POLISH-06)
- [ ] 20-03-PLAN.md — License page chrome + footer on legal pages + visual checkpoint (POLISH-05)

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
- [x] 20-01-PLAN.md — Backup dialog cancel/X, dark mode deactivation fix, birth date picker (POLISH-01, POLISH-03, POLISH-04)
- [x] 20-02-PLAN.md — App header popover redesign + shared footer on app pages (POLISH-02, POLISH-06)
- [ ] 20-03-PLAN.md — License page chrome + footer on legal pages + visual checkpoint (POLISH-05)

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
- [ ] 20-01-PLAN.md — Backup dialog cancel/X, dark mode deactivation fix, birth date picker (POLISH-01, POLISH-03, POLISH-04)
- [ ] 20-02-PLAN.md — App header popover redesign + shared footer on app pages (POLISH-02, POLISH-06)
- [ ] 20-03-PLAN.md — License page chrome + footer on legal pages + visual checkpoint (POLISH-05)

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
- [ ] 20-01-PLAN.md — Backup dialog cancel/X, dark mode deactivation fix, birth date picker (POLISH-01, POLISH-03, POLISH-04)
- [ ] 20-02-PLAN.md — App header popover redesign + shared footer on app pages (POLISH-02, POLISH-06)
- [ ] 20-03-PLAN.md — License page chrome + footer on legal pages + visual checkpoint (POLISH-05)

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

### Phase 13: Review and fix greeting quotes

**Goal:** Every greeting quote across all 4 languages sounds natural and idiomatic, has verified attribution, follows Hebrew gender rules, and maintains the healing/inspirational tone
**Requirements**: QUOTE-01, QUOTE-02, QUOTE-03
**Depends on:** Phase 12
**Plans:** 1/1 plans complete

Plans:
- [ ] 13-01-PLAN.md — Review and fix all quotes: EN attribution verification + HE/DE/CS native idiom sync (QUOTE-01, QUOTE-02, QUOTE-03)

### Phase 14: i18n bugs, legal footer cleanup, and contact email update

**Goal:** Fix i18n language persistence and untranslated strings, make the demo window resizable, convert footer legal sections from expandable accordions to simple links that match the active language, and update contact email to contact@sessionsgarden.app across the entire site
**Requirements**: D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09
**Depends on:** Phase 13

**Specific issues:**
1. Hebrew login page shows German text in parentheses for the cancel concept
2. Language doesn't persist when navigating between landing page and app — returns to English
3. Hebrew version shows "Launch pricing · One-time purchase · Lifetime license" untranslated
4. Demo app window must be resizable
5. Footer legal links (Impressum/Datenschutz) should be plain links, not expandable sections, and must match the displayed language (no mixing like Hebrew + "Impressum")
6. Update email to contact@sessionsgarden.app everywhere
**Plans:** 6/6 plans complete

Plans:
- [x] 14-01-PLAN.md — Fix language persistence, trust badge i18n, Hebrew disclaimer, contact email (D-01, D-02, D-03, D-07)
- [x] 14-02-PLAN.md — Demo resize handles, header license CTA, globe language popover (D-04, D-08, D-09)
- [x] 14-03-PLAN.md — Impressum and Datenschutz as dedicated pages, footer cleanup, SW update (D-05, D-06)
- [x] 14-04-PLAN.md — [GAP] License lang passthrough, disclaimer brand link, Impressum Hebrew heading, CTA enlargement (D-01, D-02, D-08)
- [x] 14-05-PLAN.md — [GAP] Globe language selector on all legal pages (D-09)
- [x] 14-06-PLAN.md — [GAP] Demo horizontal resize fix, datenschutz multilingual content (D-04, D-05)

### Phase 15: Architecture and UI audit

**Goal:** Comprehensive dual-mode quality audit -- (1) Architecture review via parallel executor plans covering security, code quality, PWA correctness, GDPR compliance, customer journey, and i18n completeness; (2) Frontend UI audit via /gsd:ui-review for visual/UX quality scoring. All outputs combined into actionable findings reports.
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05, AUDIT-06, AUDIT-07, AUDIT-08, AUDIT-09, AUDIT-10
**Depends on:** Phase 14
**Success Criteria** (what must be TRUE):
  1. Security audit report exists with severity-classified findings across all JS/HTML files
  2. Dead code report identifies unused JS functions, orphaned CSS, unreferenced i18n keys
  3. PWA manifest and service worker verified for offline capability
  4. Customer journey from landing page through purchase to app usage is fully mapped with gaps flagged
  5. CloudFlare Pages GDPR compliance has clear verdict
  6. Legal page placeholder status documented with exact missing content
  7. i18n completeness verified across all 4 languages with missing keys listed
  8. RTL layout issues documented
**Plans:** 3/3 plans complete

Plans:
- [x] 15-01-PLAN.md — Security, dead code, and architecture consistency audit (AUDIT-01, AUDIT-02, AUDIT-03)
- [x] 15-02-PLAN.md — PWA, customer journey, GDPR, legal status, and Lemon Squeezy readiness audit (AUDIT-04, AUDIT-05, AUDIT-06, AUDIT-07, AUDIT-08)
- [x] 15-03-PLAN.md — i18n key completeness and RTL layout audit (AUDIT-09, AUDIT-10)

### Phase 16: Audit fix — Code

**Goal:** Fix all code-level findings from Phase 15 audit: SW cache, security hardening, i18n gaps, dead code cleanup, shared code extraction, and CSS token compliance. Grouped by file to minimize redundant edits.
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04, FIX-05, FIX-06, FIX-07, FIX-08, FIX-09, FIX-10, FIX-11
**Depends on:** Phase 15
**Source:** `.planning/phases/15-architecture-and-ui-audit/15-CONSOLIDATED-FINDINGS.md` (CODE-01 through CODE-11)
**Success Criteria** (what must be TRUE):
  1. SW caches correct font files (3 weights, not Variable); app images cached; all pages register SW
  2. Backup export/import correctly saves and restores language preference
  3. Zero hardcoded English strings in user-visible banners (backup + DB errors)
  4. All 11 HTML pages have CSP meta tag
  5. postMessage calls use explicit origins; demo localStorage gate doesn't persist
  6. formatSessionType() and readFileAsDataURL() exist once in app.js, not duplicated
  7. No dead code referencing old session types (inPerson/proxy/surrogate)
  8. No hardcoded colors in app.css outside design token system
**Plans:** 5/5 plans complete

Plans:
- [x] 16-01-PLAN.md — SW font cache fix, image precaching, SW registration on all pages, CSP meta tags (FIX-01, FIX-07)
- [x] 16-02-PLAN.md — Landing and demo postMessage security hardening, broken image fix, RTL CSS (FIX-05, FIX-06)
- [x] 16-03-PLAN.md — Shared code extraction (formatSessionType, readFileAsDataURL), dead code cleanup, CSS token (FIX-08, FIX-09, FIX-10)
- [x] 16-04-PLAN.md — Backup banner i18n keys, portfolioLang key bug fix, backup banner styling (FIX-02, FIX-03, FIX-11)
- [x] 16-05-PLAN.md — DB error banner i18n, CSS classes, Promise anti-pattern refactor (FIX-04)

### Phase 17: Audit fix — Business and operational

**Goal:** Complete all business/operational items identified in Phase 15 audit that require human input: Lemon Squeezy product setup, real legal content, Hebrew quote translations, and post-purchase UX flow.
**Requirements**: BIZ-01, BIZ-02, BIZ-03, BIZ-04, BIZ-05, BIZ-06
**Depends on:** Phase 16 (code fixes should be clean before business wiring)
**Source:** `.planning/phases/15-architecture-and-ui-audit/15-CONSOLIDATED-FINDINGS.md` (BIZ-01 through BIZ-06)
**Success Criteria** (what must be TRUE):
  1. Lemon Squeezy product live with real checkout URL, Store ID, and Product ID wired into code
  2. Impressum and Datenschutz display real business details (no placeholders)
  3. All 4 languages have 43 quotes each (Hebrew parity restored, 2 HE extras added to EN/DE/CS)
  4. Customer can complete purchase → receive key → activate → use app without getting stranded
  5. Licensed user can navigate back to license page for re-activation
**Plans:** 3/3 plans complete

Plans:
- [x] 17-01-PLAN.md — Hebrew quote parity: add 6 missing HE quotes + 2 HE extras to EN/DE/CS (BIZ-04)
- [x] 17-02-PLAN.md — Post-purchase UX flow (?key= auto-populate, license link, Datenschutz LS note) (BIZ-05, BIZ-06, BIZ-03)
- [x] 17-03-PLAN.md — Wire real LS values + Impressum/Datenschutz business details (BIZ-01, BIZ-02) ⚠ GAP: Impressum has contact info only — missing Umsatzsteuer, Verbraucherstreitbeilegung, Haftung, Urheberrecht sections. Carried to Phase 19.

### Phase 18: Technical debt

**Goal:** Address deferred technical debt from Phase 15 audit: license key obfuscation, App.js API cleanup, refund handling SOP, dir attribute standardization, and license page self-service deactivation.
**Requirements**: DEBT-01, DEBT-02, DEBT-03, DEBT-04
**Depends on:** Phase 17 (launch first, then address debt)
**Source:** `.planning/phases/15-architecture-and-ui-audit/15-CONSOLIDATED-FINDINGS.md` (Deferred Items section)
**Success Criteria** (what must be TRUE):
  1. License key in localStorage is Base64-obfuscated (not readable via casual DevTools inspection)
  2. App.js public API has JSDoc comments and logical grouping by concern
  3. LS refund handling has a documented manual SOP with step-by-step instructions
  4. All pages set dir attribute on `<html>` element consistently
  5. Licensed users can self-service deactivate from the license page
**Plans:** 3/3 plans complete

Plans:
- [x] 18-01-PLAN.md — Base64 license key obfuscation + dir attribute standardization (DEBT-01, DEBT-04)
- [x] 18-02-PLAN.md — License page two-mode UX with deactivation (DEBT-01)
- [x] 18-03-PLAN.md — App.js JSDoc cleanup + refund handling SOP (DEBT-02, DEBT-03)

### Phase 19: Go-Live Preparation

**Goal:** Complete all remaining prerequisites to take Sessions Garden live on Cloudflare Pages: legal compliance (Impressum research + full content), i18n for legal pages, deployment pipeline (clean repo + CF setup), license page UX consistency, post-purchase cleanup, app passcode security, and innovation research for v1.1 backlog.
**Requirements**: LIVE-01, LIVE-02, LIVE-03, LIVE-04, LIVE-05, LIVE-06, LIVE-07, LIVE-08, LIVE-09
**Depends on:** Phase 18
**Success Criteria** (what must be TRUE):
  1. Impressum has all legally required sections for a German Kleinunternehmer selling software (researched, not guessed)
  2. Impressum + Datenschutz fully translated in all 4 languages with "German is authoritative" disclaimer on non-DE versions
  3. Clean GitHub repo exists for CF deployment with no .planning/, .claude/, or sensitive files exposed
  4. App is live on Cloudflare Pages and full purchase→activate→use flow works end-to-end
  5. License page has consistent chrome (header, footer, logo, language switcher) matching other app pages, with correct "home" navigation per context
  6. Landing page behavior for activated/paid users is resolved (show, hide, or redirect)
  7. Demo data is cleared on first activation so paid users start fresh
  8. App has a passcode/PIN lock option with research-backed security approach for local-only storage
  9. Innovator research completed — v1.1 feature candidates collected in backlog
**Plans:** 8/8 plans complete

Plans:
- [x] 19-01-PLAN.md — Impressum 4 per-language files with full DDG §5 legal content (LIVE-01, LIVE-02)
- [x] 19-02-PLAN.md — Datenschutz 4 + Disclaimer 4 per-language files (LIVE-02)
- [x] 19-03-PLAN.md — Encrypted backup export/import via Web Crypto API (LIVE-08)
- [x] 19-04-PLAN.md — License gate hardening + license page chrome + landing auto-detect (LIVE-05, LIVE-06)
- [x] 19-05-PLAN.md — SW cache update + cross-link migration to per-language files (LIVE-02)
- [x] 19-06-PLAN.md — Security guidance messaging at 3 touchpoints (LIVE-08)
- [x] 19-07-PLAN.md — GitHub Action deploy workflow + _headers security headers (LIVE-03)
- [x] 19-08-PLAN.md — E2E verification + LIVE-07 confirmation + innovator research (LIVE-04, LIVE-07, LIVE-09)

**Post-deployment fixes (2026-03-24/25):** CF Pages "pretty URLs" caused two cascading issues: (1) SW cached redirected `.html` responses, browsers rejected them for navigation; (2) `_redirects` rule `/ /landing.html 302` intercepted all `./index.html` navigations because CF treats `index.html` as root document. Fixed by: SW skips all navigations + HTML removed from precache; `_redirects` replaced with JS Gate 0 in `index.html <head>`. See 19-RESEARCH.md addendum.

### Phase 21: Comprehensive mobile responsiveness — audit and fix all app screens for iPhone/mobile viewport

**Goal:** Every app screen is usable on iPhone mobile viewport (375px) — consolidated breakpoints, 44px touch targets, scrollable modals, collapsible accordion sections, body scroll lock, and photo crop bug fix
**Requirements**: MOB-01, MOB-02, MOB-03, MOB-04, MOB-05, MOB-06, MOB-07, MOB-08, MOB-09, MOB-10, MOB-11, MOB-12, MOB-13, MOB-14
**Depends on:** Phase 20
**Plans:** 3 plans

Plans:
- [ ] 21-01-PLAN.md — CSS infrastructure: z-index tokens, breakpoint consolidation (768/480), touch targets, modal overflow (MOB-01 through MOB-05)
- [ ] 21-02-PLAN.md — Form/nav responsive: stacking, severity wrap, nav scroll, accordion, date picker, crop resize (MOB-06 through MOB-11)
- [ ] 21-03-PLAN.md — Crop bug fix (shared module), overlay-close, body scroll lock, iPhone checkpoint (MOB-12 through MOB-14)
### Phase 22: Session Workflow Loop

**Goal:** Therapists can (a) tailor the session form to their own modality by renaming and disabling section titles via a Settings page, and (b) turn a finished session into an editable, client-facing document downloadable as PDF or Markdown and shareable via the device's native share sheet.

**Scope summary** (after spec-phase, 2026-04-26):
1. **Feature A — Editable session section titles**: Settings page with rename + enable/disable + reset per row for all 9 session sections. Custom labels are global across UI languages. Disabled sections hide from new sessions but remain visible (with indicator) in edit mode for existing sessions that have data. Storage keys unchanged.
2. **Feature B — Session-to-document export**: Section-selection dialog with client-safe defaults → editable preview → PDF download (critical) + Markdown download + Web Share API (where supported) + Translate shortcut (Google Translate). Existing "Copy Session (MD)" preserved.
3. **Feature C — Cross-cutting integrations**: Backup/restore extended to round-trip therapist settings (backward-compatible); `buildSessionMarkdown()` reads custom labels; Service Worker cache bumped; new Settings page wired into shared chrome and license/disclaimer gates.

**Dropped from this phase**: Pre-session context card / open issues / severity trend (innovator extrapolation, not direct user feedback). Todo `2026-04-26-pre-session-context-card.md` remains in `pending/` for a future phase.

**Source todos** (in `.planning/todos/pending/`):
- `2026-04-26-editable-session-section-titles.md` — drives Feature A
- `2026-04-26-session-to-document-email-export.md` — drives Feature B (note: mailto: replaced with PDF download + Web Share API per spec discussion)

**Constraints:** Local-first (no backend), i18n en/de/he/cs, RTL-safe, must preserve existing session data, mobile-first, no heavyweight new dependencies, Service Worker discipline (CACHE_NAME bump + PRECACHE_URLS).

**Requirements**: 20 requirements locked in `22-SPEC.md` (Feature A: 1-6, Feature B: 7-17, Feature C: 18-20)
**Depends on:** Phase 21
**Plans:** 13/13 plans complete

Plans:
- [x] 22-01-PLAN.md — Vendored libraries: jsPDF + Noto Sans / Noto Sans Hebrew base64 fonts (REQ-13 foundation)
- [x] 22-02-PLAN.md — DB v4 migration + therapistSettings store + App.getSectionLabel/isSectionEnabled cache + BroadcastChannel + Settings i18n keys (REQ-2, REQ-3, REQ-4, REQ-6, REQ-11, REQ-17, REQ-19)
- [x] 22-03-PLAN.md — md-render.js (escape-first Markdown→HTML utility for export preview) (REQ-12)
- [x] 22-04-PLAN.md — Settings page (settings.html + settings.js + CSS) — 9-row form, sticky banner, action bar (REQ-1, REQ-2, REQ-3, REQ-4, REQ-6, REQ-17)
- [x] 22-05-PLAN.md — pdf-export.js — lazy-loaded jsPDF wrapper with A4, RTL Hebrew, pagination (REQ-10, REQ-13)
- [x] 22-06-PLAN.md — Export modal + buildSessionMarkdown rewire + section visibility (REQ-5, REQ-7, REQ-8, REQ-9, REQ-10, REQ-11, REQ-12, REQ-14, REQ-15, REQ-16, REQ-17, REQ-19)
- [x] 22-07-PLAN.md — Backup/restore round-trips therapistSettings; backward-compat with pre-Phase-22 backups (REQ-18)
- [x] 22-08-PLAN.md — SW CACHE_NAME bump + PRECACHE_URLS for jspdf/fonts/settings.js + header gear-icon entry point (REQ-1, REQ-17, REQ-20)
- [x] 22-09-PLAN.md — Close verification gaps: pdf-export.js script tag in add-session.html + await App.initCommon() at 5 sites + tone:neutral on first-disable confirm dialog (REQ-13, REQ-15, REQ-3, REQ-5, REQ-21)
- [x] 22-10-PLAN.md — Settings page UX fixes round 2: rename-input lock, transition-aware disable confirm, success-pill, Safari CSS tooltip (UAT round-1 gaps)
- [x] 22-11-PLAN.md — Export modal UX fixes round 2: labelled stepper, per-step contextual guidance + markdown cheatsheet, Step 3 X-button stacking-context fix (UAT round-1 gaps)
- [x] 22-12-PLAN.md — Data-safety guards round 2: export Cancel-cancels (3-state sentinel), App.installNavGuard helper + gear-icon wiring (UAT round-1 gaps)
- [ ] 22-13-PLAN.md — Settings success-pill regression + revert-button affordance (UAT round-3 gaps N4, N5)

---

### v1.1 Final Polish & Launch (In Progress)

**Milestone Goal:** Polish the app for free trial users, fix UX pain points, update visual identity, and complete all launch prerequisites so the product can be sold.

- [x] **Phase 8: Terminology and Quick UX Fixes** - Update מפגש/לקוח terminology across all 4 languages; replace text action buttons with icon buttons (completed 2026-03-19)
- [ ] **Phase 9: Heart Shield Redesign** - Session-level Heart Shield toggle with removal tracking, client table indicators, and session type filter
- [x] **Phase 10: UX Power Features** - Photo crop/reposition after upload; edit client directly from add-session screen (completed 2026-03-19)
- [x] **Phase 11: Visual Identity Update** - Garden decorations in app UI; updated logo; final app icon (completed 2026-03-19)
- [x] **Phase 12: Launch Prerequisites** - Real Impressum and Datenschutzerklarung; Lemon Squeezy product setup; DE/CS translation verification; cross-browser and mobile QA (completed 2026-03-19)

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

### Phase 20: Pre-Launch UI Polish & Legal Compliance

**Goal:** Fix UX pain points, add missing UI chrome, and ensure visual consistency across all app pages
**Requirements**: POLISH-01, POLISH-02, POLISH-03, POLISH-04, POLISH-05, POLISH-06
**Depends on:** Phase 19
**Success Criteria** (what must be TRUE):
  1. Birth date picker allows fast year selection without scrolling month-by-month through distant years
  2. App footer shows contact email, legal links (Impressum, Datenschutz, Terms), copyright, and version on all app pages including license page
  3. Backup dialog has a Cancel/X button allowing users to dismiss without completing backup
  4. Dark mode state is properly cleared when a user's license is deactivated and they return to the landing page
  5. License page has language selector and dark mode toggle matching other app pages, plus the shared footer
  6. App header uses full width with consistent language selector (matching landing page popover style) and dark/light toggle at equal sizing — no two-row wrapping
**Plans**: 3 plans

Plans:
- [ ] 20-01-PLAN.md — Backup dialog cancel/X, dark mode deactivation fix, birth date picker (POLISH-01, POLISH-03, POLISH-04)
- [ ] 20-02-PLAN.md — App header popover redesign + shared footer on app pages (POLISH-02, POLISH-06)
- [ ] 20-03-PLAN.md — License page chrome + footer on legal pages + visual checkpoint (POLISH-05)

**Source todos:**
- Birth date picker improvement (2026-03-19)
- App footer with contact email and legal links (2026-03-24)
- Backup dialog cancel button (2026-03-24)
- Dark mode persistence after deactivation (2026-03-24)
- License page UI polish (2026-03-24)
- App header redesign (2026-03-24)

**Deferred to Phase 21+:**
- Terms acceptance business notification — restructured into LS activation flow (too big for polish phase)

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
| 12. Launch Prerequisites | 4/4 | Complete   | 2026-03-19 | - |
| 13. Greeting Quotes | 1/1 | Complete | - | - |
| 14. i18n/Footer/Email | 6/6 | Complete | - | - |
| 15. Architecture/UI Audit | 3/3 | Complete | 2026-03-23 | - |
| 16. Audit Fix: Code | 5/5 | Complete    | 2026-03-23 | - |
| 17. Audit Fix: Business | 3/3 | Complete    | 2026-03-24 | - |
| 18. Technical Debt | 0/3 | 3/3 | Complete    | 2026-03-24 |
| 19. Go-Live Preparation | 8/8 | Complete | 2026-03-24 | - |
| 20. Pre-Launch UI Polish | 0/3 | 3/3 | Complete    | 2026-03-25 |
