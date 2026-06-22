# External Integrations

**Analysis Date:** 2026-06-22

## APIs & External Services

**Payments / Licensing:**
- Lemon Squeezy — one-time purchase licensing and checkout
  - SDK/Client: Vanilla `fetch` (no SDK)
  - Auth: API key in `.env` (name not printed here)
  - Store ID: `324581` (Sessions Garden store — never use store `289135`)
  - Checkout URL: `https://sessionsgarden.lemonsqueezy.com/checkout/buy/70849bde-8fcb-4b30-8525-435f4c7fec66` (hardcoded in `assets/landing.js`)
  - License activate: `POST https://api.lemonsqueezy.com/v1/licenses/activate` (`assets/license.js:211`)
  - License deactivate: `POST https://api.lemonsqueezy.com/v1/licenses/deactivate` (`assets/license.js:263`)
  - CSP `connect-src` explicitly permits `https://api.lemonsqueezy.com` (enforced in `_headers`)

## Data Storage

**Databases:**
- Browser IndexedDB (native) — all client/session/snippets data stored on-device
  - Connection: native `indexedDB` browser API
  - Client: custom wrapper `assets/db.js` (no ORM, no idb library)
  - Privacy design: zero server-side storage; all data stays on user's device

**File Storage:**
- Local only — backups exported as `.sgbackup` files (ZIP archive via JSZip)
- No cloud file storage service

**Caching:**
- Service Worker cache (`sw.js`) — static asset caching in browser
- Cloudflare Pages CDN — edge caching for static assets (controlled via `_headers`)

## Authentication & Identity

**Auth Provider:**
- None (no user accounts, no OAuth)
- License activation replaces auth: `portfolioLicenseActivated` and `portfolioLicenseInstance` stored in `localStorage`
- Gate system in `index.html` redirects to `landing.html` → `disclaimer-*.html` → `license.html` based on localStorage state

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Browser console only (`console.error` / `console.log` in source files)

## CI/CD & Deployment

**Hosting:**
- Cloudflare Pages — static site hosting
  - Cache purge script: `scripts/cf-purge-cache.sh`
  - Header rules: `_headers`
  - Redirect rules: `_redirects`

**CI Pipeline:**
- None detected (no GitHub Actions, no CF Pages build pipeline config found)
- Deployments appear to be manual pushes to CF Pages

## Environment Configuration

**Required env vars (names only — see `.env`):**
- Lemon Squeezy API key — used by `assets/license.js` for license validation calls
- Lemon Squeezy Store ID `324581` — hardcoded in `CLAUDE.md` as the Sessions Garden store

**Secrets location:**
- `.env` file in project root — never read or commit contents

## Webhooks & Callbacks

**Incoming:**
- None detected — no server-side endpoint exists (pure static app)

**Outgoing:**
- None — all Lemon Squeezy calls are client-initiated REST calls, not webhooks

## PWA / Offline

**Service Worker:**
- `sw.js` — cache-first for static assets, network-first for HTML pages
- Cache name versioned: `sessions-garden-v210` (must bump on deploy to bust caches)
- Precache list covers all JS, CSS, fonts, illustrations, and JSON data files

---

*Integration audit: 2026-06-22*
