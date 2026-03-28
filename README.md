# Sessions Garden

A privacy-first session management app for energy healing practitioners. Track clients, document sessions, and monitor progress — all stored locally on your device.

## What It Does

- **Client Management** — Organize clients with notes, contact info, and session history
- **Session Documentation** — Record trapped emotions, severity levels, insights, and Heart Shield work
- **Reporting** — View practice statistics and client activity at a glance
- **Encrypted Backups** — Export AES-256-GCM encrypted `.sgbackup` files with passphrase protection
- **Offline-First** — Works without internet after initial setup (PWA with service worker)
- **Multi-Language** — English, German, Hebrew (RTL), and Czech

## Privacy by Design

All data stays in your browser's IndexedDB. Nothing is sent to any server. The developer has zero access to your client data. No cookies, no tracking, no analytics.

The only external connections are:
- **Lemon Squeezy API** — One-time license activation
- **Cloudflare Pages** — Static file hosting

## Tech Stack

- Vanilla HTML/CSS/JavaScript (no framework, no build step)
- IndexedDB for data storage
- Web Crypto API for encrypted backups
- JSZip for backup file packaging
- Service Worker for offline caching

## Development

Serve locally:

```bash
python3 -m http.server 8080
# Open http://localhost:8080/landing.html
```

Encrypted backup features require `localhost` or HTTPS (Web Crypto API secure context requirement).

## Project Structure

```
*.html              App pages (index, sessions, add-client, add-session, reporting)
landing.html        Marketing/sales page
license.html        License activation
impressum*.html     Legal: Impressum (4 languages)
datenschutz*.html   Legal: Privacy Policy (4 languages)
disclaimer*.html    Legal: Terms of Use (4 languages)
assets/
  app.js            Core app framework (i18n, nav, theme, toasts)
  db.js             IndexedDB data layer
  backup.js         Export/import with encryption
  overview.js       Overview page logic
  sessions.js       Session history
  reporting.js      Practice statistics
  license.js        License activation/deactivation
  landing.js        Landing page logic
  i18n-*.js         Translation files (en, de, he, cs)
  tokens.css        Design tokens
  app.css           App styles
sw.js               Service worker (cache-first)
manifest.json       PWA manifest
_headers            Cloudflare Pages security headers
.github/workflows/  Deploy pipeline
```

## Deployment

Push to `main` triggers a GitHub Action that syncs app-only files to a `deploy` branch. Cloudflare Pages watches the `deploy` branch. The deploy branch excludes `.planning/`, `.claude/`, `.env`, and other dev files.

## License

Proprietary. Single-user license sold via [Sessions Garden](https://sessionsgarden.app).
