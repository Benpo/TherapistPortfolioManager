# Codebase Structure

**Analysis Date:** 2026-06-28

## Directory Layout

```
TherapistPortfolioManager_app/
├── assets/                     # All JavaScript, CSS, fonts, images, i18n
│   ├── *.js                    # App modules (see Key File Locations)
│   ├── tokens.css              # CSS design tokens (colors, spacing, type)
│   ├── app.css                 # App-wide styles
│   ├── demo.css                # Demo mode overlay styles
│   ├── landing.css             # Landing page styles
│   ├── globe-lang.css          # Language picker styles
│   ├── fonts/                  # Rubik woff2 (Regular, SemiBold, Bold)
│   ├── branding/               # Logos, favicons, OG image
│   └── illustrations/          # SVG/PNG scene illustrations
├── tests/                      # Test suite (Node.js + custom runner)
│   ├── _helpers/               # Shared test utilities and stubs
│   ├── *.test.js               # Test files (prefixed by phase number)
│   └── run-all.js              # Test runner entry point
├── scripts/                    # CI/deploy utilities
│   └── cf-purge-cache.sh       # Cloudflare cache purge script
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions: stamp BUILD_TOKEN, deploy to CF Pages
├── .claude/
│   ├── context/                # Session prompts and context docs
│   └── hooks/                  # Claude Code hooks
├── .planning/                  # GSD planning artifacts (not deployed)
│   └── codebase/               # Codebase map documents (this dir)
├── index.html                  # App home (client overview)
├── sessions.html               # Session list page
├── add-client.html             # Add/edit client form
├── add-session.html            # Add/edit session form
├── settings.html               # Therapist settings (snippets, photos, backup)
├── reporting.html              # Reporting / analytics page
├── report.html                 # Diagnostic report page
├── demo.html                   # Demo mode entry (sets window.name)
├── landing.html                # Marketing + license activation page
├── disclaimer.html             # Terms of service (German default)
├── disclaimer-en.html          # Terms — English
├── disclaimer-he.html          # Terms — Hebrew
├── disclaimer-cs.html          # Terms — Czech
├── impressum.html              # Impressum (German default)
├── impressum-en.html           # Impressum — English
├── impressum-he.html           # Impressum — Hebrew
├── impressum-cs.html           # Impressum — Czech
├── datenschutz.html            # Privacy policy (German default)
├── datenschutz-en.html         # Privacy — English
├── datenschutz-he.html         # Privacy — Hebrew
├── datenschutz-cs.html         # Privacy — Czech
├── license.html                # License activation page
├── license.html                # License page
├── manifest.json               # PWA web app manifest
├── sw.js                       # Service worker
├── _headers                    # Cloudflare Pages HTTP header rules
├── _redirects                  # Cloudflare Pages redirect rules
├── package.json                # Dev dependencies (test runner only)
├── package-lock.json
├── CLAUDE.md                   # Project-level Claude Code rules
└── README.md
```

## Directory Purposes

**`assets/`:**
- Purpose: All runtime JavaScript, CSS, fonts, images — everything deployed as-is
- Contains: IIFE modules, design token CSS, i18n dictionaries, vendor libs (jsPDF, JSZip, bidi)
- Key files: `app.js`, `db.js`, `backup.js`, `version.js`, `shared-chrome.js`, `tokens.css`, `app.css`

**`tests/`:**
- Purpose: Test suite, run with Node.js via `npm test` (no browser)
- Contains: Phase-prefixed test files (`24-04-*.test.js`, `31-*.test.js`, etc.), helper stubs in `_helpers/`
- Key files: `run-all.js` (orchestrator), `tests/_helpers/` (DOM stubs, IDB mock, test utilities)

**`scripts/`:**
- Purpose: Deployment and ops scripts
- Contains: `cf-purge-cache.sh` (Cloudflare cache purge after deploy)

**`.github/workflows/`:**
- Purpose: CI/CD pipeline
- Contains: `deploy.yml` — stamps `__BUILD_TOKEN__` in `assets/version.js` with `${GITHUB_SHA::7}`, deploys to Cloudflare Pages

## Key File Locations

**Entry Points (HTML pages):**
- `index.html`: App home — client overview, search, filters
- `sessions.html`: Session list for a client (URL param: `?clientId=N`)
- `add-client.html`: Add or edit a client (URL param: `?clientId=N` for edit)
- `add-session.html`: Add or edit a session (URL params: `?clientId=N&sessionId=M`)
- `settings.html`: Therapist settings (tab-nav: snippets, photos, backup, schedule)
- `reporting.html`: Reporting and analytics views
- `landing.html`: Marketing page + Lemon Squeezy checkout entry

**Core Modules:**
- `assets/version.js`: `AppVersion` — deploy token, integrity check, SW cache management
- `assets/db.js`: `PortfolioDB` — all IndexedDB I/O, schema migrations, connection pool
- `assets/app.js`: `App` — i18n, nav, shared UI helpers, section label cache
- `assets/backup.js`: `BackupManager` — ZIP export/import, AES-256-GCM encryption
- `assets/shared-chrome.js`: `SharedChrome` — footer, nav chrome, localized legal links

**Page Modules (one per page):**
- `assets/overview.js` — used by `index.html`
- `assets/sessions.js` — used by `sessions.html`
- `assets/add-client.js` — used by `add-client.html`
- `assets/add-session.js` — used by `add-session.html`
- `assets/settings.js` — used by `settings.html` (coordinates tab modules)
- `assets/settings-snippets.js` — snippets tab logic
- `assets/settings-photos.js` — photo management tab logic
- `assets/reporting.js` — used by `reporting.html`
- `assets/landing.js` — used by `landing.html`
- `assets/license.js` — used by `license.html`

**UI Utility Modules:**
- `assets/export-modal.js`: Export dialog (PDF, markdown, ZIP)
- `assets/backup-modal.js`: Backup options modal
- `assets/crop.js`: `CropModule` — photo crop canvas modal
- `assets/pdf-export.js`: `PDFExport` — bidi-aware PDF generation
- `assets/md-render.js`: `MdRender` — markdown to HTML/text renderer
- `assets/snippets.js`: `Snippets` — snippet picker UI

**i18n:**
- `assets/i18n.js`: Loader stub (sets `window.I18N_DEFAULT`)
- `assets/i18n-en.js`: English strings + quotes (`window.I18N.en`, `window.QUOTES.en`)
- `assets/i18n-he.js`: Hebrew strings (`window.I18N.he`)
- `assets/i18n-de.js`: German strings (`window.I18N.de`)
- `assets/i18n-cs.js`: Czech strings (`window.I18N.cs`)
- `assets/i18n-disclaimer.js`: Legal page strings (`window.DISCLAIMER_I18N`)

**Observability:**
- `assets/crashlog.js`: `CrashLog` — IDB crash log CRUD; early buffer in `index.html` `<head>`
- `assets/report.js`: `Report` — diagnostic page renderer

**Vendor Libraries:**
- `assets/jspdf.min.js`: jsPDF (PDF generation)
- `assets/jszip.min.js`: JSZip (backup ZIP)
- `assets/bidi.min.js`: Unicode BiDi algorithm (RTL PDF text)

**Configuration:**
- `assets/version.js`: `APP_VERSION` (hand-set semver) + `INTEGRITY_TOKEN` (build-stamped)
- `manifest.json`: PWA manifest (name, icons, start URL, display mode)
- `sw.js`: Service worker (precache list, cache strategy)
- `_headers`: Cloudflare Pages HTTP header overrides (cache-control, security headers)
- `_redirects`: Cloudflare Pages redirect rules

**Testing:**
- `tests/run-all.js`: Test runner
- `tests/_helpers/`: DOM stubs, IDB mock, assertion helpers
- `tests/*.test.js`: All test files

## Naming Conventions

**Files:**
- HTML pages: `kebab-case.html` with language suffix for legal variants (e.g., `disclaimer-he.html`)
- JS modules: `kebab-case.js` matching the module purpose (e.g., `backup-modal.js`, `settings-snippets.js`)
- CSS files: `kebab-case.css` (e.g., `tokens.css`, `globe-lang.css`)
- Test files: `{phase-number}-{short-descriptor}.test.js` (e.g., `31-openDB-pooling.test.js`) or `quick-{YYMMDD}-{id}-{descriptor}.test.js` for hotfix tests

**JavaScript:**
- Global module objects: `PascalCase` (e.g., `window.PortfolioDB`, `window.BackupManager`, `window.App`)
- Private module internals: `camelCase` with `_` prefix for module-private vars/functions (e.g., `_dbPromise`, `_sectionLabelCache`, `_migrationDone`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `DB_VERSION`, `CACHE_NAME`, `PBKDF2_ITERATIONS`)
- IDB store names: `camelCase` strings (e.g., `"clients"`, `"sessions"`, `"therapistSettings"`, `"snippets"`, `"crashlog"`)

**CSS:**
- BEM-lite: `block-name`, `block-name__element`, `block-name--modifier` (e.g., `.db-error-banner`, `.integrity-nudge`, `.integrity-nudge--online`)
- Design tokens: `--token-name` CSS custom properties defined in `assets/tokens.css`

## Where to Add New Code

**New app page:**
1. Create `newpage.html` in root — copy gate script block from `index.html`
2. Load scripts in correct order: `version.js` → `crashlog.js` → i18n files → `app.js` → `db.js` → (other deps) → `newpage.js`
3. Create `assets/newpage.js` — call `App.initCommon()` on `DOMContentLoaded`, use `PortfolioDB` for data
4. Add nav entry in `App.renderNav()` in `assets/app.js`

**New DB operation:**
- Add method to the `PortfolioDB` IIFE in `assets/db.js`
- Export it in the `return {}` block at the bottom (~line 1110)
- Schema change: increment `DB_VERSION`, add versioned migration function to `migrations` object

**New i18n string:**
- Add key to all four language files: `assets/i18n-en.js`, `assets/i18n-he.js`, `assets/i18n-de.js`, `assets/i18n-cs.js`
- Keep keys alphabetical within their group; use `data-i18n="key"` in HTML or `App.t('key')` in JS

**New shared utility:**
- If used by multiple pages: add to `assets/app.js` `App` module and export in `return {}`
- If purely visual/chrome: add to `assets/shared-chrome.js` `SharedChrome` module

**New test:**
- Create `tests/{phase}-{descriptor}.test.js`
- Use helpers from `tests/_helpers/`
- Tests run in Node.js — no real browser DOM; use stubs from `_helpers`

**New asset to precache:**
- Add path to `PRECACHE_URLS` array in `sw.js` (exact deployed path)
- Also add to `assets/version.js` if it needs integrity tracking

## Special Directories

**`.claude/worktrees/`:**
- Purpose: Git worktrees used by parallel agent sub-tasks
- Generated: Yes (by GSD agent system)
- Committed: No — these are temporary working directories

**`.planning/`:**
- Purpose: GSD planning artifacts, phase plans, codebase maps
- Generated: Partially (by GSD commands)
- Committed: Yes

**`assets/fonts/`:**
- Purpose: Self-hosted Rubik font (woff2 only) for offline/PWA support
- Generated: No (committed)
- Committed: Yes

**`assets/illustrations/`:**
- Purpose: Scene illustrations for onboarding and empty states
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-06-28*
