# Requirements: TherapistPortfolioManager

**Defined:** 2026-03-19
**Core Value:** Therapists can efficiently track client sessions, trapped emotions, and clinical progress without any technical setup, internet connection, or data leaving their device.

## v1.1 Requirements

Requirements for final polish and launch. Each maps to roadmap phases.

### UX Polish

- [x] **UX-01**: Terminology updated to "מפגש/לקוח" (session/client) replacing "טיפול/מטופל" across all 4 languages
- [x] **UX-02**: Actions column uses icon buttons (history 🕐, add +) with hover tooltips instead of text buttons
- [ ] **UX-03**: User can crop/reposition client photo after upload
- [ ] **UX-04**: User can edit client details directly from add-session screen without navigating away

### Heart Shield

- [ ] **HSHLD-01**: Each session has optional "Heart Shield session" toggle; when active, "Shield removed?" field is required (yes/no)
- [ ] **HSHLD-02**: Client with active Heart Shield shows ❤️ icon next to name in clients table; icon changes to ✓ when removed
- [ ] **HSHLD-03**: Sessions page has "session type" filter dropdown (all / Heart Shield / regular)

### Design

- [ ] **DSGN-05**: Botanical/garden decorative elements added to app pages (inspired by landing page style)
- [ ] **DSGN-06**: Updated logo for app and landing page

### Launch

- [ ] **LNCH-01**: Real Impressum content with Sapir's business details
- [ ] **LNCH-02**: Real Datenschutzerklarung generated via e-recht24.de or adsimple.de
- [ ] **LNCH-03**: Lemon Squeezy product configured with real pricing and buy button
- [ ] **LNCH-04**: Landing page DE/CS translations verified and corrected
- [ ] **LNCH-05**: Final app icon replacing placeholder
- [ ] **LNCH-06**: Basic QA pass — cross-browser (Chrome/Firefox/Safari/Edge), RTL, mobile viewports

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
| UX-03 | Phase 10 | Pending |
| UX-04 | Phase 10 | Pending |
| HSHLD-01 | Phase 9 | Pending |
| HSHLD-02 | Phase 9 | Pending |
| HSHLD-03 | Phase 9 | Pending |
| DSGN-05 | Phase 11 | Pending |
| DSGN-06 | Phase 11 | Pending |
| LNCH-01 | Phase 12 | Pending |
| LNCH-02 | Phase 12 | Pending |
| LNCH-03 | Phase 12 | Pending |
| LNCH-04 | Phase 12 | Pending |
| LNCH-05 | Phase 11 | Pending |
| LNCH-06 | Phase 12 | Pending |

**Coverage:**
- v1.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation (phases 8-12)*
