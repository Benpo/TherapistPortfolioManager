---
last_mapped_commit: 85c30eaf0a5c17b108306c2910847006a9e26232
---

# Technology Stack

**Analysis Date:** 2026-07-07

## Languages

**Primary:**
- JavaScript (ES2020+) — all application logic, service worker, assets
- HTML5 — all page shells (`index.html`, `add-client.html`, `sessions.html`, `settings.html`, `reporting.html`, `report.html`, `demo.html`, `landing.html`, and legal pages)
- CSS3 — custom design tokens (`assets/tokens.css`), app styles (`assets/app.css`), landing styles (`assets/landing.css`), demo styles (`assets/demo.css`)

**Secondary:**
- JSON — manifest (`manifest.json`), demo seed data (`assets/demo-seed-data.json`)
- Content-module JS — `help.html` and `changelog.html` are empty shells filled at runtime from locale-specific data globals: `assets/help-content-{en,he,de,cs}.js` (`window.HELP_CONTENT_*`, `window.HELP_DEEPLINKS`) and `assets/changelog-content-{en,he,de,cs}.js` (`window.CHANGELOG_CONTENT_*`), rendered by `assets/help.js` / `assets/changelog.js`. `HELP-MAP.md` (repo root) is the topic index mapping each help topic to its owning source files — read it before touching help content.

## Runtime

**Environment:**
- Browser — the app is a client-only PWA; all runtime is the end-user's browser (no server-side JS)
- Node.js ≥18.0.0 — development/test workbench only (`npm test`); never ships to production

**Package Manager:**
- npm (lockfile: `package-lock.json` present)

## Frameworks

**Core:**
- None — vanilla JS throughout; no React, Vue, Angular, or any UI framework

**Testing:**
- jsdom ^29.1.1 — DOM simulation for headless unit tests
- Custom test runner: `tests/run-all.js` — discovers and executes all `*.test.js` files

**Build/Dev:**
- No bundler (Webpack, Vite, Rollup, etc.) — assets are served as-is
- GitHub Actions (`deploy.yml`) — single build step: `sed` replaces `__BUILD_TOKEN__` placeholder in `assets/version.js` with the git short-hash (`${GITHUB_SHA::7}`)

## Key Dependencies

**Critical (vendored, shipped in `assets/`):**
- `assets/jspdf.min.js` — PDF generation (vendored, minified)
- `assets/jszip.min.js` — ZIP archive creation for backup export (vendored, minified)
- `assets/bidi.min.js` — Unicode Bidirectional algorithm for RTL PDF rendering (vendored, minified)

**Dev-only (npm, not shipped):**
- `jsdom` ^29.1.1 — headless DOM for tests

## Configuration

**Environment:**
- No runtime environment variables — the app is fully client-side with zero server
- Secrets (Cloudflare zone ID, purge token, GitHub token) live exclusively in GitHub Actions secrets; never in source
- License credentials stored in browser `localStorage` under keys: `portfolioLicenseActivated`, `portfolioLicenseKey`, `portfolioLicenseInstance`

**Build:**
- `.github/workflows/deploy.yml` — only build artifact; stamps `INTEGRITY_TOKEN` in `assets/version.js`
- `_headers` — Cloudflare Pages HTTP headers (CSP, cache-control per path)
- `_redirects` — Cloudflare Pages redirect rules (root navigation handled by JS gate in `index.html`)

## Platform Requirements

**Development:**
- Node.js ≥18.0.0 (for `npm test` only)
- No build tools required to serve locally — open HTML files directly or via any static server

**Production:**
- Cloudflare Pages (static hosting, CDN)
- Service worker (`sw.js`) precaches all static assets; app is fully offline-capable after first load
- PWA: `manifest.json` enables installability on mobile/desktop

## Versioning

- Hand-set semver in `assets/version.js` (`APP_VERSION`, currently `1.2.2`)
- Deploy-stamped cache-buster: `INTEGRITY_TOKEN` = git short-hash (7 chars), drives `CACHE_NAME` in `sw.js`
- `assets/version.js` and `sw.js` are served with `Cache-Control: no-cache`; all other assets cache for 86400s

---

*Stack analysis: 2026-07-07*
