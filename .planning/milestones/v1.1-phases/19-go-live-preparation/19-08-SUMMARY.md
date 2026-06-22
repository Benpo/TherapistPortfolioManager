---
plan: "19-08"
status: complete
started: 2026-03-24
completed: 2026-03-24
---

## What Was Done

### Task 1: E2E Verification (LIVE-04) — Human Checkpoint
Full manual UAT across all Phase 19 features with multiple feedback rounds:

**Round 1:** Hebrew RTL fix for Datenschutz, encrypted backup UI wiring, TOC reset on deactivation, license page chrome re-render, landing auto-detect i18n, security note weekly interval, dark mode landing todo.

**Round 2:** Terms gate removed from license page, language-aware disclaimer redirects, backup merged to single button with passphrase-first flow, passphrase modal full i18n (4 languages + RTL), D-23 comments removed from production.

**Round 3:** License page hover fix (root cause: app-nav pill styles), button font-size normalization, crypto.subtle error handling, CTA placeholder URLs replaced.

**Round 4:** License chrome hover fix (replaced app-nav with legal-topbar), missing i18n keys (common.type.human, session.type.inPerson), import error shows actual message, passphrase complexity validation.

**Round 5:** Legal page footer disclaimer links set to readonly, SW landing page removed from precache, security note data-i18n for language reactivity.

### Task 2: LIVE-07 + v1.2 Backlog + Legal Review

**LIVE-07 Confirmed:** Demo uses `demo_portfolio` database, app uses `sessions_garden` — completely separate IndexedDB instances. Zero implementation needed.

**LIVE-09 v1.2 Backlog:** Created `.planning/research/v1.2-feature-backlog.md` with 10 feature candidates. Must-haves: IndexedDB encryption at rest (F-01), Client Progress Chart (F-02). Recommended scope: F-01, F-02, F-04, F-10.

**Legal Content Review:** All 12 pages verified — correct DDG citations (not TMG), no EU ODR link, VSBG section present in all 4 languages, consistent structure.

## Key Files

### Created
- `.planning/research/v1.2-feature-backlog.md`
- `.planning/todos/pending/2026-03-24-dark-mode-persists-on-landing-after-deactivation.md`
- `.planning/todos/pending/2026-03-24-deactivation-data-loss-warning.md`
- `.planning/todos/pending/2026-03-24-terms-acceptance-business-notification.md`

### Modified (UAT fixes)
- `license.html` — terms gate removed, chrome hover fixed, renderLicenseChrome global
- `assets/backup.js` — i18n passphrase modal, complexity validation, crypto guard
- `assets/overview.js` — merged export flow, import error messages
- `assets/landing.js` — auto-detect i18n, features-cta wiring
- `assets/app.js` — security note weekly + data-i18n
- `assets/license.js` — deactivation clears terms + security guidance
- `index.html` — merged export button, import accepts .sgbackup
- `sw.js` — landing removed from precache, bumped to v26
- 5 app pages — language-aware disclaimer redirect
- 8 legal pages — footer disclaimer links readonly
- 4 i18n files — passphrase modal, session/client types, complexity messages
- `assets/app.css` — button font-size normalization
- `datenschutz-he.html` — English content LTR wrapper
- `landing.html` — real LS checkout URLs

## Decisions
- Terms gate belongs on app pages only, not on license page
- Backup flow: passphrase-first with "Skip encryption" option (single button)
- Security note: weekly (7-day) instead of one-time
- Deactivation clears terms acceptance (forces re-agreement)
- Landing page excluded from SW precache (marketing, not PWA)

## Self-Check: PASSED
