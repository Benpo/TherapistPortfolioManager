# Technology Stack

**Analysis Date:** 2026-06-22

## Languages

**Primary:**
- JavaScript (ES2020+) — all application logic, no TypeScript
- HTML5 — page structure (multi-page app, one `.html` per screen)
- CSS — styling via custom properties (`assets/tokens.css`, `assets/app.css`)

## Runtime

**Environment:**
- Browser (PWA) — no server-side runtime
- Node.js — test runner only (`node tests/*.test.js`)

**Package Manager:**
- None — no `package.json`. All JS dependencies are vendored as minified files in `assets/`.

## Frameworks

**Core:**
- None — vanilla JavaScript, no framework (React, Vue, Angular, etc.)
- Multi-page app (MPA) architecture: one HTML file per screen

**PWA:**
- Service Worker (`sw.js`) — cache-first strategy, cache name `sessions-garden-v210`
- Web App Manifest (`manifest.json`) — standalone display mode, installable

**Testing:**
- Node.js built-in `assert` + custom `test()` runner — no external test framework
- Tests run with `node tests/<filename>.test.js`; exit 0 = pass, exit 1 = fail
- VM sandbox (`node:vm`) used to load and isolate browser JS modules in Node

## Key Dependencies (vendored)

All dependencies are bundled as static files — no npm install required.

**Critical:**
- `assets/jspdf.min.js` — jsPDF (2021+ build) — PDF export of session reports
- `assets/jszip.min.js` — JSZip — backup archive creation/extraction (`.sgbackup` files)
- `assets/bidi.min.js` — Unicode BiDi algorithm — RTL text rendering in PDF export

**Storage:**
- Browser IndexedDB (native) — all client/session data. Accessed via custom wrapper in `assets/db.js`

**Fonts:**
- Rubik (Regular, SemiBold, Bold) — self-hosted in `assets/fonts/` as `.woff2`

## Configuration

**Environment:**
- `.env` file present — contains Lemon Squeezy API key and store credentials
- Variable names visible via CSP `connect-src` in `index.html` header; API calls target `https://api.lemonsqueezy.com`

**Build:**
- No build step — static files served as-is
- `_headers` — Cloudflare Pages HTTP headers config (CSP, cache-control)
- `_redirects` — Cloudflare Pages routing config
- `scripts/cf-purge-cache.sh` — manual Cloudflare cache purge script

## Platform Requirements

**Development:**
- Any static file server (no build tooling needed)
- Node.js (any modern version) for running tests

**Production:**
- Cloudflare Pages (static hosting)
- Domain: `sessionsgarden.app`
- CSP enforced via `_headers`: `connect-src` allows only `self` and `https://api.lemonsqueezy.com`

---

*Stack analysis: 2026-06-22*
