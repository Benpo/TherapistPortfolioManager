# Requirements: TherapistPortfolioManager

**Defined:** 2026-03-09
**Core Value:** Therapists can efficiently track client sessions, trapped emotions, and clinical progress without any technical setup, internet connection, or data leaving their device.

## v1 Requirements

Requirements for sellable product release. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: CSS design token system with two-tier architecture (primitives + semantic tokens) replacing hardcoded colors
- [x] **FOUND-02**: Self-hosted Rubik font (WOFF2) eliminating Google Fonts CDN dependency
- [x] **FOUND-03**: IndexedDB migration infrastructure with version upgrade handlers, onblocked/onversionchange support
- [x] **FOUND-04**: Backup reminder system — weekly prompt with snooze, persistent across sessions
- [ ] **FOUND-05**: Playwright test suite for critical paths (IndexedDB CRUD, data integrity, navigation, i18n switching)

### Design

- [ ] **DSGN-01**: Garden/nature theme overhaul — warm cream background, garden green primary, orange accents, Rubik font
- [x] **DSGN-02**: Dark mode with light/dark toggle persisted to localStorage, no flash of wrong theme on load
- [x] **DSGN-03**: CSS logical properties migration replacing all directional CSS (margin-left -> margin-inline-start etc.)
- [ ] **DSGN-04**: Navigation component extraction — JS-rendered nav replacing copy-pasted HTML across 5 pages

### Data Model

- [x] **DATA-01**: Session field consolidation — interactive step with Sapir to finalize data model (fields to keep, add, rename, remove from both codebases)
- [x] **DATA-02**: Expanded client types — Adult / Child / Animal / Other (replacing current Human / Animal)
- [x] **DATA-03**: Referral source tracking per client (dropdown or text field)
- [x] **DATA-04**: Additional session fields per consolidation decisions (Limiting Beliefs, Additional Techniques, Important Points, Next Session Info — pending DATA-01)

### Features

- [x] **FEAT-01**: Client search — text search by name, phone, and email with real-time filtering
- [x] **FEAT-02**: Daily greeting — time-of-day greeting with rotating inspirational quotes

### Internationalization

- [ ] **I18N-01**: i18n architecture restructure — split monolithic i18n.js into per-language files
- [ ] **I18N-02**: German language support with accurate clinical terminology
- [ ] **I18N-03**: Czech language support with accurate clinical terminology
- [ ] **I18N-04**: RTL validation — confirm all new features work correctly in Hebrew RTL mode

### Legal

- [ ] **LEGL-01**: Disclaimer/T&C screen — blocks app until user accepts, no external API calls
- [ ] **LEGL-02**: Acceptance receipt — downloadable proof of T&C acceptance for both parties
- [ ] **LEGL-03**: Disclaimer content — compliant with EU consumer protection, German Widerrufsrecht, per existing legal research

### Distribution

- [ ] **DIST-01**: Hosting platform research and decision (Cloudflare Pages / Netlify / Vercel / VPS) — optimized for low recurring cost with one-time sale model
- [ ] **DIST-02**: Payment solution research and decision (Lemon Squeezy / alternatives) — must handle EU VAT
- [ ] **DIST-03**: Access gating mechanism for paid product (license key, hash check, or equivalent)
- [ ] **DIST-04**: PWA setup with service worker for offline capability
- [ ] **DIST-05**: Production packaging — distribution-ready bundle

### Developer Experience

- [ ] **DEVX-01**: "How to modify this app" guide for non-technical maintainer (Sapir)
- [ ] **DEVX-02**: Simplified development/preview workflow documentation
- [ ] **DEVX-03**: GitHub-based collaboration workflow documentation (sync, branching, Claude Code usage)

### Quality Assurance

- [ ] **QA-01**: Cross-browser testing (Chrome, Firefox, Safari, Edge) in both light and dark modes
- [ ] **QA-02**: RTL testing across all pages and features in Hebrew
- [ ] **QA-03**: Responsive design verification on mobile and tablet viewports
- [ ] **QA-04**: IndexedDB data integrity verification under migration scenarios

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Visualization

- **VIZ-01**: Client progress visualization — charts showing severity improvement over time
- **VIZ-02**: PDF export of session summaries

### Features

- **FEAT-03**: Session templates / quick-fill patterns for common session types
- **FEAT-04**: Keyboard shortcuts for power users

### Platform

- **PLAT-01**: Mobile native wrapper (if sales justify it)
- **PLAT-02**: Optional encrypted cloud backup (requires backend — Phase 2 architecture)

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
| IP address collection | Privacy violation, GDPR concern, zero benefit (removed from Lovable code) |
| Client portal / client-facing features | This is the practitioner's private workspace |
| SOAP/DAP clinical templates | For licensed mental health professionals, not energy healing |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1: Foundation | Complete |
| FOUND-02 | Phase 1: Foundation | Complete |
| FOUND-03 | Phase 1: Foundation | Complete |
| FOUND-04 | Phase 1: Foundation | Complete |
| FOUND-05 | Phase 6: Quality and Developer Experience | Pending |
| DSGN-01 | Phase 2: Visual Transformation | Pending |
| DSGN-02 | Phase 2: Visual Transformation | Complete |
| DSGN-03 | Phase 2: Visual Transformation | Complete |
| DSGN-04 | Phase 2: Visual Transformation | Pending |
| DATA-01 | Phase 3: Data Model and Features | Complete |
| DATA-02 | Phase 3: Data Model and Features | Complete |
| DATA-03 | Phase 3: Data Model and Features | Complete |
| DATA-04 | Phase 3: Data Model and Features | Complete |
| FEAT-01 | Phase 3: Data Model and Features | Complete |
| FEAT-02 | Phase 3: Data Model and Features | Complete |
| I18N-01 | Phase 4: Internationalization and Distribution Research | Pending |
| I18N-02 | Phase 4: Internationalization and Distribution Research | Pending |
| I18N-03 | Phase 4: Internationalization and Distribution Research | Pending |
| I18N-04 | Phase 4: Internationalization and Distribution Research | Pending |
| DIST-01 | Phase 4: Internationalization and Distribution Research | Pending |
| DIST-02 | Phase 4: Internationalization and Distribution Research | Pending |
| LEGL-01 | Phase 5: Legal and Production Packaging | Pending |
| LEGL-02 | Phase 5: Legal and Production Packaging | Pending |
| LEGL-03 | Phase 5: Legal and Production Packaging | Pending |
| DIST-03 | Phase 5: Legal and Production Packaging | Pending |
| DIST-04 | Phase 5: Legal and Production Packaging | Pending |
| DIST-05 | Phase 5: Legal and Production Packaging | Pending |
| QA-01 | Phase 6: Quality and Developer Experience | Pending |
| QA-02 | Phase 6: Quality and Developer Experience | Pending |
| QA-03 | Phase 6: Quality and Developer Experience | Pending |
| QA-04 | Phase 6: Quality and Developer Experience | Pending |
| DEVX-01 | Phase 6: Quality and Developer Experience | Pending |
| DEVX-02 | Phase 6: Quality and Developer Experience | Pending |
| DEVX-03 | Phase 6: Quality and Developer Experience | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-09 after roadmap creation*
