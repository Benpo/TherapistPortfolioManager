# Phase 20: Pre-Launch UI Polish & Legal Compliance

## Goal
Fix UX pain points, add missing UI chrome, and complete legal notification requirements so the app is ready to sell.

## Source Todos (7 items)

### POLISH-01: Birth date picker improvement
- **Problem**: Selecting distant birth years requires scrolling month-by-month
- **Solution**: Add year dropdown or fast year navigation
- **Todo**: `2026-03-19-birth-date-picker-improvement.md`

### POLISH-02: App footer with contact email and legal links
- **Problem**: App pages have no footer with legal links or contact info
- **Solution**: Add footer to all app pages with Impressum, Datenschutz, Terms links and contact email
- **Todo**: `2026-03-24-add-app-footer-with-contact-email-and-legal-links.md`

### POLISH-03: Backup dialog cancel button
- **Problem**: Backup password dialog has no way to dismiss — no X or Cancel button
- **Solution**: Add Cancel button and/or X close button
- **Todo**: `2026-03-24-add-cancel-close-button-to-backup-dialog.md`

### POLISH-04: Dark mode persistence after deactivation
- **Problem**: When license is deactivated, dark mode state persists on landing page
- **Solution**: Clear dark mode preference on deactivation or ensure landing page has its own theme state
- **Todo**: `2026-03-24-dark-mode-persists-on-landing-after-deactivation.md`

### POLISH-05: License page UI polish
- **Problem**: License page has no shared header, logo, footer, or language selector — feels disconnected
- **Solution**: Add consistent app chrome matching other pages
- **Todo**: `2026-03-24-license-page-ui-polish-add-app-chrome.md`

### POLISH-06: App header redesign
- **Problem**: Header too narrow causing two-row wrapping; language selector differs from landing; dark mode toggle and license key button are small icons
- **Solution**: Widen header, unify language selector, make all controls equal-sized buttons
- **Todo**: `2026-03-24-redesign-app-header-wider-layout-with-consistent-controls.md`

### POLISH-07: Terms acceptance business notification
- **Problem**: No way for the business to know when a user accepts terms
- **Solution**: Send webhook/notification when terms are accepted
- **Todo**: `2026-03-24-terms-acceptance-business-notification.md`
