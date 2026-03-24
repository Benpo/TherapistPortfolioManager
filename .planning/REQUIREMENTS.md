# Requirements: TherapistPortfolioManager

**Defined:** 2026-03-19
**Core Value:** Therapists can efficiently track client sessions, trapped emotions, and clinical progress without any technical setup, internet connection, or data leaving their device.

## v1.1 Requirements

Requirements for final polish and launch. Each maps to roadmap phases.

### UX Polish

- [x] **UX-01**: Terminology updated to "מפגש/לקוח" (session/client) replacing "טיפול/מטופל" across all 4 languages
- [x] **UX-02**: Actions column uses icon buttons (history 🕐, add +) with hover tooltips instead of text buttons
- [x] **UX-03**: User can crop/reposition client photo after upload
- [x] **UX-04**: User can edit client details directly from add-session screen without navigating away

### Heart Shield

- [x] **HSHLD-01**: Each session has optional "Heart Shield session" toggle; when active, "Shield removed?" field is required (yes/no)
- [x] **HSHLD-02**: Client with active Heart Shield shows ❤️ icon next to name in clients table; icon changes to ✓ when removed
- [x] **HSHLD-03**: Sessions page has "session type" filter dropdown (all / Heart Shield / regular)

### Design

- [x] **DSGN-05**: Botanical/garden decorative elements added to app pages (inspired by landing page style)
- [x] **DSGN-06**: Finalize app logo identity (leaf SVG confirmed as final after visual review of alternatives)

### Launch

- [x] **LNCH-01**: Real Impressum content with Sapir's business details
- [ ] **LNCH-02**: Real Datenschutzerklarung generated via e-recht24.de or adsimple.de
- [x] **LNCH-03**: Lemon Squeezy product configured with real pricing and buy button
- [ ] **LNCH-04**: Landing page DE/CS translations verified and corrected
- [x] **LNCH-05**: Final app icon replacing placeholder
- [ ] **LNCH-06**: Basic QA pass — cross-browser (Chrome/Firefox/Safari/Edge), RTL, mobile viewports

### Audit (Phase 15)

- [x] **AUDIT-01**: Security vulnerabilities scanned across all JS/HTML files with severity classification
- [x] **AUDIT-02**: Dead code (unused JS functions, orphaned CSS, unreferenced i18n keys) identified for cleanup
- [x] **AUDIT-03**: Architecture consistency reviewed (duplicate logic, pattern contradictions, token adoption)
- [x] **AUDIT-04**: PWA manifest and service worker verified for correct start_url and offline capability
- [x] **AUDIT-05**: Purchase-to-usage customer journey mapped with every gap flagged
- [x] **AUDIT-06**: CloudFlare Pages GDPR compliance investigated with clear verdict
- [x] **AUDIT-07**: Legal document placeholder status documented with exact missing content listed
- [x] **AUDIT-08**: Lemon Squeezy integration readiness assessed
- [x] **AUDIT-09**: i18n key completeness verified across all 4 languages
- [x] **AUDIT-10**: RTL layout issues and wrong-language display bugs documented

### Audit Fix: Code (Phase 16)

- [x] **FIX-01**: SW cache lists correct font files and includes app-critical images; all pages register SW
- [x] **FIX-02**: Backup export/import uses correct `portfolioLang` localStorage key
- [x] **FIX-03**: Backup reminder banner text translated in all 4 languages via i18n system
- [x] **FIX-04**: DB error banners translated, hardcoded styles replaced with tokens, Promise anti-pattern refactored
- [x] **FIX-05**: Landing page postMessage uses explicit origin; broken image path fixed; RTL CSS logical properties
- [x] **FIX-06**: Demo page validates postMessage origin; localStorage gate bypass fixed (sessionStorage)
- [x] **FIX-07**: All 11 HTML pages have Content-Security-Policy meta tag
- [x] **FIX-08**: formatSessionType() and readFileAsDataURL() extracted to shared app.js API
- [x] **FIX-09**: Dead code removed (old session types, unused i18n keys); event binding standardized in touched files
- [x] **FIX-10**: Hardcoded CSS colors replaced with design tokens
- [x] **FIX-11**: New i18n keys added for backup banner and DB error strings in all 4 language files

### Audit Fix: Business/Operational (Phase 17)

- [x] **BIZ-01**: Lemon Squeezy account created, product configured (EUR 119, 2-device license), checkout URL live
- [x] **BIZ-02**: Impressum contains real business name, address, contact (tax ID omitted — Kleinunternehmer)
- [x] **BIZ-03**: Datenschutz has real business details and documents license activation API call
- [x] **BIZ-04**: Hebrew quotes brought to 43 (matching EN/DE/CS) with native translations
- [x] **BIZ-05**: Post-purchase flow designed and implemented (LS redirect, email template, ?key= auto-populate)
- [x] **BIZ-06**: In-app navigation path to license page for re-activation

### Technical Debt (Phase 18)

- [x] **DEBT-01**: License key obfuscated in localStorage (Base64 encoding — cosmetic, LS 2-device limit is real security)
- [x] **DEBT-02**: App.js public API cleaned up with JSDoc comments and logical grouping (utils.js descoped — Phase 16 already centralized shared functions)
- [x] **DEBT-03**: Refund handling documented as manual SOP (Cloudflare Worker descoped — proportional at launch volume)
- [x] **DEBT-04**: dir attribute standardized to `<html>` element across all pages
- [x] **DEBT-05**: License page two-mode UX — activated view with self-service deactivation via LS API

### Go-Live Preparation (Phase 19)

- [ ] **LIVE-01**: Impressum legal research — all required sections for German Kleinunternehmer selling PWA software (Opus-level research)
- [ ] **LIVE-02**: Impressum + Datenschutz as separate HTML files per language (de/en/he/cs) — not JSON i18n. German is authoritative; other languages get "German version is legally binding" banner. Pattern: SapphireHealing legal pages.
- [ ] **LIVE-03**: Clean deployment repo — no .planning/, .claude/, or sensitive files; GH Action to sync app-only files
- [ ] **LIVE-04**: Cloudflare Pages deployment — live and tested end-to-end (purchase → activate → use)
- [ ] **LIVE-05**: License page chrome consistency — header, footer, logo, language switcher, correct "home" navigation per context
- [ ] **LIVE-06**: Landing page strategy for activated users — show, hide, redirect, or repurpose
- [ ] **LIVE-07**: Demo data cleanup on first activation — paid users start with clean slate
- [ ] **LIVE-08**: App passcode/PIN lock — research-backed security for local-only browser storage
- [ ] **LIVE-09**: Innovator research for v1.1 feature backlog

## Future Requirements

Deferred to v2. Tracked but not in current roadmap.

### Quality Automation

- **FOUND-05**: Playwright test suite for critical paths (IndexedDB CRUD, data integrity, navigation, i18n switching)
- **QA-01**: Automated cross-browser testing
- **QA-04**: IndexedDB data integrity verification under migration scenarios

### Developer Experience

- **DEVX-01**: "How to modify this app" guide for non-technical maintainer (Sapir)
- **DEVX-02**: Simplified development/preview workflow documentation
- **DEVX-03**: GitHub-based collaboration workflow documentation

### Visualization

- **VIZ-01**: Client progress visualization — charts showing severity improvement over time
- **VIZ-02**: PDF export of session summaries

### Features

- **FEAT-03**: Session templates / quick-fill patterns for common session types
- **FEAT-04**: Keyboard shortcuts for power users

### Platform

- **PLAT-01**: Mobile native wrapper (if sales justify it)
- **PLAT-02**: Optional encrypted cloud backup (requires backend)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Cloud sync / multi-device sync | Destroys privacy value proposition, adds GDPR processor obligations |
| User accounts / authentication | No backend, local app is single-user by design |
| Scheduling / calendar | Scope creep into practice management territory |
| Billing / invoicing | Regulated domain, varies by country, practitioners use separate tools |
| Telehealth / video calls | Massive undertaking, practitioners already use Zoom |
| Insurance claims / superbills | Not relevant to EC/BC practitioners |
| AI-generated session notes | Hallucination risk in clinical docs, requires cloud/API calls |
| IP address collection | Privacy violation, GDPR concern, zero benefit |
| Client portal / client-facing features | This is the practitioner's private workspace |
| SOAP/DAP clinical templates | For licensed mental health professionals, not energy healing |
| Full Playwright automation for v1.1 | Ship with manual QA first, automate after launch |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| UX-01 | Phase 8 | Complete |
| UX-02 | Phase 8 | Complete |
| UX-03 | Phase 10 | Complete |
| UX-04 | Phase 10 | Complete |
| HSHLD-01 | Phase 9 | Complete |
| HSHLD-02 | Phase 9 | Complete |
| HSHLD-03 | Phase 9 | Complete |
| DSGN-05 | Phase 11 | Complete |
| DSGN-06 | Phase 11 | Complete |
| LNCH-01 | Phase 12 | Complete |
| LNCH-02 | Phase 12 | Pending |
| LNCH-03 | Phase 12 | Complete |
| LNCH-04 | Phase 12 | Pending |
| LNCH-05 | Phase 11 | Complete |
| LNCH-06 | Phase 12 | Pending |
| AUDIT-01 | Phase 15 | Complete |
| AUDIT-02 | Phase 15 | Complete |
| AUDIT-03 | Phase 15 | Complete |
| AUDIT-04 | Phase 15 | Complete |
| AUDIT-05 | Phase 15 | Complete |
| AUDIT-06 | Phase 15 | Complete |
| AUDIT-07 | Phase 15 | Complete |
| AUDIT-08 | Phase 15 | Complete |
| AUDIT-09 | Phase 15 | Complete |
| AUDIT-10 | Phase 15 | Complete |

| FIX-01 | Phase 16 | Complete |
| FIX-02 | Phase 16 | Complete |
| FIX-03 | Phase 16 | Complete |
| FIX-04 | Phase 16 | Complete |
| FIX-05 | Phase 16 | Complete |
| FIX-06 | Phase 16 | Complete |
| FIX-07 | Phase 16 | Complete |
| FIX-08 | Phase 16 | Complete |
| FIX-09 | Phase 16 | Complete |
| FIX-10 | Phase 16 | Complete |
| FIX-11 | Phase 16 | Complete |
| BIZ-01 | Phase 17 | Complete |
| BIZ-02 | Phase 17 | Complete |
| BIZ-03 | Phase 17 | Complete |
| BIZ-04 | Phase 17 | Complete |
| BIZ-05 | Phase 17 | Complete |
| BIZ-06 | Phase 17 | Complete |
| DEBT-01 | Phase 18 | Complete |
| DEBT-02 | Phase 18 | Complete |
| DEBT-03 | Phase 18 | Complete |
| DEBT-04 | Phase 18 | Complete |
| DEBT-05 | Phase 18 | Complete |

**Coverage:**
- v1.1 requirements: 47 total
- Mapped to phases: 46
- Unmapped: 0

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-23 after Phase 15 planning (audit requirements added)*
