# Codebase Structure

**Analysis Date:** 2026-06-22

## Directory Layout

```
TherapistPortfolioManager_app/
├── index.html              # Main app entry — Overview (client list)
├── sessions.html           # Session list for a client
├── add-session.html        # Session create/edit form
├── add-client.html         # Client create/edit form
├── reporting.html          # Reporting/analytics
├── settings.html           # Therapist settings + snippets
├── landing.html            # Marketing + license purchase (pre-auth)
├── license.html            # License activation
├── demo.html               # Demo mode (sandboxed IndexedDB)
├── disclaimer.html         # Terms (German / default)
├── disclaimer-en.html      # Terms (English)
├── disclaimer-he.html      # Terms (Hebrew)
├── disclaimer-cs.html      # Terms (Czech)
├── datenschutz.html        # Privacy policy (German)
├── datenschutz-en.html     # Privacy policy (English)
├── datenschutz-he.html     # Privacy policy (Hebrew)
├── datenschutz-cs.html     # Privacy policy (Czech)
├── impressum.html          # Legal notice (German)
├── impressum-en.html       # Legal notice (English)
├── impressum-he.html       # Legal notice (Hebrew)
├── impressum-cs.html       # Legal notice (Czech)
├── manifest.json           # PWA web app manifest
├── sw.js                   # Service worker (cache management)
├── _headers                # Cloudflare Pages HTTP response headers
├── _redirects              # Cloudflare Pages redirect rules
├── assets/                 # All JS, CSS, fonts, images, vendor libs
│   ├── app.js              # Shared runtime utilities (window.App)
│   ├── db.js               # IndexedDB abstraction (window.PortfolioDB)
│   ├── shared-chrome.js    # Shared nav/footer component
│   ├── i18n.js             # i18n bootstrapper
│   ├── i18n-en.js          # English translations
│   ├── i18n-he.js          # Hebrew translations
│   ├── i18n-de.js          # German translations
│   ├── i18n-cs.js          # Czech translations
│   ├── i18n-disclaimer.js  # Disclaimer-specific translations
│   ├── overview.js         # Client list page module
│   ├── sessions.js         # Session list page module
│   ├── add-session.js      # Session form page module
│   ├── add-client.js       # Client form page module
│   ├── reporting.js        # Reporting page module
│   ├── settings.js         # Settings page module
│   ├── snippets.js         # Snippet picker component
│   ├── snippets-seed.js    # Default snippet seed data
│   ├── pdf-export.js       # PDF generation (uses jsPDF)
│   ├── md-render.js        # Markdown-to-HTML renderer
│   ├── backup.js           # Backup export/import logic
│   ├── backup-modal.js     # Backup UI modal
│   ├── landing.js          # Landing page / license purchase
│   ├── license.js          # License activation
│   ├── disclaimer.js       # Disclaimer/terms page logic
│   ├── demo.js             # Demo mode UI + overlay
│   ├── demo-seed.js        # Demo data seeder
│   ├── demo-seed-data.json # Synthetic demo data
│   ├── demo-hints.js       # Demo hint tooltip system
│   ├── crop.js             # Client photo crop utility
│   ├── globe-lang.js       # Language switcher globe widget
│   ├── tokens.css          # Design tokens (CSS custom properties)
│   ├── app.css             # Main application styles
│   ├── landing.css         # Landing page styles
│   ├── demo.css            # Demo mode overlay styles
│   ├── globe-lang.css      # Globe language switcher styles
│   ├── jspdf.min.js        # Vendored: jsPDF library
│   ├── jszip.min.js        # Vendored: JSZip library
│   ├── bidi.min.js         # Vendored: BiDi text algorithm (RTL support)
│   ├── branding/           # App icons, favicons, OG image
│   ├── fonts/              # Rubik + Heebo web fonts (woff2 + base64 for PDF)
│   └── illustrations/      # In-app illustration images
├── tests/                  # Behavior tests
├── .planning/              # GSD planning artifacts (not deployed)
│   └── codebase/           # Codebase analysis documents
├── .claude/                # Claude Code configuration + context
├── assets/cf-purge-cache.sh # Cloudflare cache purge script
└── scripts/                # (symlink or alias to assets/ — same directory)
```

## Directory Purposes

**Root HTML files:**
- Purpose: One HTML file per screen/page. No templating — each is a standalone document.
- Key pattern: App pages include inline gate scripts in `<head>` for license/terms redirect logic before any content loads.
- Legal pages (disclaimer, impressum, datenschutz) are duplicated per language suffix (`-en`, `-he`, `-cs`; German is the unsuffixed default).

**`assets/`:**
- Purpose: All deliverable client-side assets — JS modules, CSS, fonts, images, vendored libraries.
- No subdirectory per concern; everything flat except `branding/`, `fonts/`, `illustrations/`.
- Key files: `app.js` (shared runtime), `db.js` (data layer), `tokens.css` (design system variables).

**`assets/branding/`:**
- Purpose: App icon set (192px, 512px, 180px apple-touch, 32px favicon, .ico, OG image).
- Generated: No. Committed: Yes.

**`assets/fonts/`:**
- Purpose: Rubik web font (woff2, used by app CSS) and Heebo base64 fonts (embedded in PDF export).
- Generated: No. Committed: Yes.

**`assets/illustrations/`:**
- Purpose: In-app SVG/PNG illustrations (garden, watering-can).
- Generated: No. Committed: Yes.

**`tests/`:**
- Purpose: Behavior tests (falsifiable, runtime-behavior tests per project convention).
- Key files: see `TESTING.md`.

**`.planning/`:**
- Purpose: GSD planning system artifacts — phase plans, codebase docs, research.
- Not deployed. Not part of the application.

## Key File Locations

**Entry Points:**
- `index.html`: Main app (Overview — client list). SW `start_url`.
- `landing.html`: Pre-license entry point. Marketing + demo + license purchase.
- `sw.js`: Service worker — registered by all app pages except `landing.html`.

**Configuration:**
- `manifest.json`: PWA manifest (name, icons, start_url, display mode).
- `_headers`: Cloudflare Pages HTTP headers (CSP, cache-control).
- `_redirects`: Cloudflare Pages URL rewrites (pretty URLs for `.html` pages).

**Core Logic:**
- `assets/db.js`: All data persistence — CRUD for clients, sessions, therapistSettings, snippets.
- `assets/app.js`: Shared utilities — i18n, modals, nav guards, section-label and snippet caches.
- `assets/shared-chrome.js`: Shared navigation/footer, renders into every page.

**Design System:**
- `assets/tokens.css`: CSS custom properties — colors, spacing, typography scale.
- `assets/app.css`: Full application stylesheet (4097 lines).

## Naming Conventions

**Files:**
- Page modules: match their HTML page (`overview.js` → `index.html`, `sessions.js` → `sessions.html`).
- i18n files: `i18n-<lang>.js` (two-letter ISO code).
- Vendored libraries: `<name>.min.js`.
- Legal pages: `<type>.html` (German default), `<type>-<lang>.html` (other languages).

**Directories:**
- Flat structure within `assets/` — no nesting by feature.

## Where to Add New Code

**New app screen:**
- Create `<screen-name>.html` in the root directory, following the pattern of existing pages (gate scripts, script loading order, `data-nav` attribute on `<body>`).
- Create `assets/<screen-name>.js` for page-specific logic.
- Add the HTML route to `PRECACHE_HTML` in `sw.js`.
- Add the asset JS file to `PRECACHE_URLS` in `sw.js`.

**New shared utility:**
- Add to `assets/app.js` (attach as `App.fnName = function(){}`).

**New IndexedDB operation:**
- Add to `assets/db.js`; expose in the `return {}` block at the bottom.

**New i18n strings:**
- Add the key to all four language files: `assets/i18n-en.js`, `assets/i18n-he.js`, `assets/i18n-de.js`, `assets/i18n-cs.js`.

**New styles:**
- Global/component styles: `assets/app.css`.
- Design token changes: `assets/tokens.css`.
- Landing-page-only styles: `assets/landing.css`.

**New branding asset:**
- Place in `assets/branding/`.

**Tests:**
- Place in `tests/` following existing test file patterns.

## Special Directories

**`.planning/`:**
- Purpose: GSD planning system — phases, codebase docs, research, sketches.
- Generated: Partially (by GSD tools). Committed: Yes.

**`.claude/`:**
- Purpose: Claude Code hooks, session context, worktrees.
- Generated: Partially. Committed: Yes (hooks and commands); worktree directories are ephemeral.

---

*Structure analysis: 2026-06-22*
