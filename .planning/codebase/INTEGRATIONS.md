---
last_mapped_commit: 85c30eaf0a5c17b108306c2910847006a9e26232
---

# External Integrations

**Analysis Date:** 2026-07-07

## APIs & External Services

**Licensing / Payments:**
- Lemon Squeezy — purchase checkout and license key activation/deactivation
  - Checkout URL: `https://sessionsgarden.lemonsqueezy.com/checkout/buy/70849bde-8fcb-4b30-8525-435f4c7fec66` (hardcoded in `assets/landing.js`)
  - License activation: `POST https://api.lemonsqueezy.com/v1/licenses/activate` (`assets/license.js`)
  - License deactivation: `POST https://api.lemonsqueezy.com/v1/licenses/deactivate` (`assets/license.js`)
  - Auth: no server-side API key — calls are unauthenticated from the browser (public LS License API)
  - Store ID: `324581` (Sessions Garden store), Product ID: `919889`
  - CSP `connect-src` in `_headers` explicitly allows `https://api.lemonsqueezy.com`

**Cache Purging:**
- Cloudflare Cache Purge API — called at the end of every deploy
  - Endpoint: `https://api.cloudflare.com/client/v4/zones/<CF_ZONE_ID>/purge_cache`
  - Auth: `CF_PURGE_TOKEN` GitHub Actions secret; `CF_ZONE_ID` GitHub Actions secret
  - Invoked in `.github/workflows/deploy.yml` (server-side only, never exposed to browser)

## Data Storage

**Databases:**
- IndexedDB (browser-native) — all client/session/settings data stored client-side
  - Database name: `SessionsGardenDB` (v6 schema)
  - Object stores: `clients`, `sessions`, `therapistSettings`, `snippets`, `crashlog`
  - Client: custom wrapper in `assets/db.js` — no third-party IDB library
  - Connection pool: single `_dbPromise` reused across all 23 call sites (`assets/db.js`)

**File Storage:**
- Local filesystem only — backup exports written as `.sgbackup` files via the browser download API
- No cloud file storage

**Caching:**
- Service Worker CacheStorage (`sw.js`) — cache-first strategy for all precached static assets
- Cache key: `sessions-garden-<INTEGRITY_TOKEN>` (auto-derived, never hand-edited)

## Authentication & Identity

**Auth Provider:**
- None — no user account system, no server-side auth
- License validation: `localStorage` check only after initial activation (`assets/license.js`)
  - Keys: `portfolioLicenseActivated`, `portfolioLicenseKey`, `portfolioLicenseInstance`
  - Values obfuscated (rot-13 or similar lightweight encoding) — noted as DEBT-01 in source
  - Activation limited to 2 devices/browsers per license key (enforced by Lemon Squeezy)

## Monitoring & Observability

**Error Tracking:**
- CrashLog — custom client-side error capture, stored in IndexedDB `crashlog` store (`assets/crashlog.js`)
- No third-party error tracking service (Sentry, etc.)

**Logs:**
- No server-side logs — app is entirely client-side
- CrashLog entries visible in the app's recovery/export flows

## CI/CD & Deployment

**Hosting:**
- Cloudflare Pages — static site hosting with CDN
- Deploy branch: `deploy` (force-pushed from `main` via GitHub Actions)
- No server, no Functions, no Workers — pure static file serving

**CI Pipeline:**
- GitHub Actions: `.github/workflows/deploy.yml`
  - Trigger: push to `main`
  - Steps: checkout → prepare staging dir → stamp `INTEGRITY_TOKEN` → verify no sensitive files → push to `deploy` branch → purge Cloudflare cache
  - No test step in CI — tests are run locally via `npm test`

## Environment Configuration

**Required secrets (GitHub Actions only):**
- `GITHUB_TOKEN` — push to `deploy` branch (auto-provided by Actions)
- `CF_ZONE_ID` — Cloudflare zone for cache purge
- `CF_PURGE_TOKEN` — Cloudflare API token scoped to cache purge

**No `.env` file required** — the application has no server and no runtime secrets

## Documentation Surfaces

- `help.html` / `changelog.html` — static in-app documentation pages, both fully client-side, no external calls; content sourced from vendored JS globals (see STACK.md). `changelog.html` links back to `help.html` via a "see also" affordance, and vice versa; no server round-trip for either surface.
- Both pages share the app's early-boot scripts (terms-acceptance redirect, license-activation redirect, CrashLog capture) and register the same service worker (`/sw.js`) as all other app pages — no separate integration surface.

## Webhooks & Callbacks

**Incoming:**
- None — no webhook endpoints (no server to receive them)

**Outgoing:**
- None — the only external calls are the two Lemon Squeezy License API calls triggered by user action in `assets/license.js`

## Fonts

- Rubik (Regular, SemiBold, Bold) — self-hosted `.woff2` in `assets/fonts/` (no Google Fonts or CDN)
- Heebo — self-hosted, base64-embedded for PDF export only (`assets/fonts/heebo-base64.js`, `assets/fonts/heebo-bold-base64.js`)

---

*Integration audit: 2026-07-07*
