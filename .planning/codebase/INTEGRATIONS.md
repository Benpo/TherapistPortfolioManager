# External Integrations

**Analysis Date:** 2026-02-01

## APIs & External Services

**None Detected**

This is a fully client-side application with no external API integrations. All processing and data management occurs locally within the browser.

## Data Storage

**Databases:**
- IndexedDB (Browser Native)
  - Database Name: `emotion_code_portfolio`
  - Database Version: 1
  - Stores:
    - `clients` - Client profiles with auto-incremented IDs
      - Index: `name` (non-unique)
    - `sessions` - Session records with auto-incremented IDs
      - Index: `clientId` (non-unique) - for querying sessions by client
      - Index: `date` (non-unique) - for date-based queries
  - Implementation: `assets/db.js`
  - Scope: Browser origin only (same-origin policy)
  - Persistence: Until browser data is cleared by user

**File Storage:**
- Local filesystem only (user-initiated uploads via File API)
  - Photo uploads: Stored as Base64 data URLs within IndexedDB
  - File location: `assets/db.js` - `photoData` field in client records

**Caching:**
- Browser native caching - Static assets cached by browser
- No explicit cache layer implemented

## Authentication & Identity

**Auth Provider:**
- None (Not required)

**Implementation:**
- No authentication system
- Single-user application running in user's browser
- No login or user management
- Data isolation via browser's same-origin policy

## Monitoring & Observability

**Error Tracking:**
- None (Not implemented)
- Silent error handling with user-facing toast notifications
- Implementation: `assets/app.js` - `showToast()` function

**Logs:**
- Browser console only (development)
- No persistent logging
- No remote error reporting

**Analytics:**
- None (Not implemented)
- No tracking or telemetry

## CI/CD & Deployment

**Hosting:**
- Any static file server
- Suitable for: GitHub Pages, Netlify, Vercel, AWS S3, traditional web servers
- No server-side processing required

**CI Pipeline:**
- None configured
- No build process to pipeline
- Manual deployment of HTML, CSS, JS files

**Live Status:**
- Not applicable - no backend

## Environment Configuration

**Required env vars:**
- None (No environment variables used)

**Configuration Methods:**
- Language preference: Stored in localStorage as `portfolioLang`
- Default language: `en` (English)
- Supported languages: `en` (English), `he` (Hebrew)

**Secrets location:**
- Not applicable - No authentication or secrets required
- No API keys
- No credentials

## Import/Export

**Data Import:**
- JSON file upload via File API
- Endpoint: None (browser-side processing)
- File format: JSON with structure `{ version: number, clients: [], sessions: [] }`
- Implementation: `assets/overview.js` - `importData()` function
- Validation: Structure validation only

**Data Export:**
- JSON file download via Blob API
- Triggered by user action
- File naming: `emotion-code-portfolio-{YYYY-MM-DD}.json`
- Implementation: `assets/overview.js` - `exportData()` and `downloadJSON()` functions
- Includes: All clients and sessions with full data

## Webhooks & Callbacks

**Incoming:**
- None (No backend service)

**Outgoing:**
- None (No external service integration)

**Client-side Events:**
- Custom DOM events for language changes: `app:language`
- Implementation: `assets/app.js` - Event dispatcher and listener pattern

## Third-party Resources

**Content Delivery:**
- Google Fonts CDN (Font files only)
  - URL: `https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Rubik:wght@400;600;700&display=swap`
  - Fonts: Nunito (Latin) and Rubik (Latin, Hebrew)
  - Reference: `assets/app.css` line 1

**No Other External Dependencies:**
- No JavaScript libraries
- No CSS frameworks
- No analytics services
- No advertising networks

## Data Privacy

**Data Location:**
- All user data stored entirely in browser's IndexedDB
- No data transmission to external servers
- Compliant with offline-first, privacy-by-design principles

**User Data:**
- Client names and profile information
- Session notes and therapy-related data
- All stored locally only

---

*Integration audit: 2026-02-01*
