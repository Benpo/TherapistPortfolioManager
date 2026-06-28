<!-- refreshed: 2026-06-28 -->
# Architecture

**Analysis Date:** 2026-06-28

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                       HTML Pages (entry points)                       │
│  index.html  sessions.html  add-client.html  add-session.html         │
│  settings.html  reporting.html  report.html  landing.html  demo.html  │
└────────────┬───────────────────────────────┬─────────────────────────┘
             │  <script> tags (load order)   │
             ▼                               ▼
┌────────────────────────┐    ┌─────────────────────────────────────────┐
│   Shared Globals        │    │       Page-Scoped Modules               │
│  window.AppVersion      │    │  overview.js  sessions.js               │
│  window.I18N / QUOTES   │    │  add-client.js  add-session.js          │
│  window.App             │    │  settings.js  settings-snippets.js      │
│  window.PortfolioDB     │    │  settings-photos.js  reporting.js       │
│  window.BackupManager   │    │  export-modal.js  landing.js            │
│  window.SharedChrome    │    │  license.js  disclaimer.js              │
│  window.PDFExport       │    │  backup-modal.js  demo.js               │
│  window.MdRender        │    │  snippets.js  crashlog.js  report.js    │
│  window.Snippets        │    │  glob-lang.js  demo-hints.js            │
│  window.CropModule      │    └─────────────┬───────────────────────────┘
└────────────┬───────────┘                   │
             │                               │
             └──────────────┬────────────────┘
                            │  all modules call
                            ▼
             ┌──────────────────────────────┐
             │   window.PortfolioDB (db.js) │
             │   IndexedDB via raw IDB API  │
             └──────────────────────────────┘
                            │
                            ▼
             ┌──────────────────────────────┐
             │  Browser IndexedDB           │
             │  DB: "sessions_garden" v6    │
             │  Stores: clients, sessions,  │
             │  therapistSettings, snippets,│
             │  crashlog                    │
             └──────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `AppVersion` | Semver + deploy integrity token + SW cache mismatch detection | `assets/version.js` |
| `App` | i18n translation, nav rendering, shared UI utilities, section label cache, snippet cache, form helpers | `assets/app.js` |
| `PortfolioDB` | All IndexedDB CRUD, schema migrations (v1–v6), connection pooling, demo mode switching | `assets/db.js` |
| `BackupManager` | ZIP-based export/import, AES-256-GCM encrypted `.sgbackup` format, auto-backup via File System Access API | `assets/backup.js` |
| `SharedChrome` | Footer, nav chrome, back-links, localized legal links — shared across all pages | `assets/shared-chrome.js` |
| `PDFExport` | Bidi-aware PDF generation using jsPDF, RTL/LTR rendering, font subsetting | `assets/pdf-export.js` |
| `MdRender` | Markdown-to-HTML/PDF rendering for session notes | `assets/md-render.js` |
| `Snippets` | Snippet CRUD UI, import/merge, prefix-backup roundtrip | `assets/snippets.js` |
| `CropModule` | Photo cropping modal (canvas-based) | `assets/crop.js` |
| `CrashLog` | Early crash capture (pre-script-load localStorage buffer) + structured IDB log | `assets/crashlog.js` |
| `Report` | Diagnostic report page: DB stats, crash log, version info | `assets/report.js` |
| Service Worker | Static asset precache (cache-first), token-derived cache name, IndexedDB never touched | `sw.js` |
| i18n dictionaries | Translation strings: English, Hebrew, German, Czech | `assets/i18n-en.js`, `assets/i18n-he.js`, `assets/i18n-de.js`, `assets/i18n-cs.js` |
| Gate scripts | Inline `<script>` blocks in HTML heads enforce license/terms flow before page body renders | `index.html`, `sessions.html`, etc. |

## Pattern Overview

**Overall:** Multi-page vanilla JS PWA — no build step, no bundler, no framework. All modules are IIFEs (Immediately Invoked Function Expressions) that expose themselves on `window.*`. Script load order via `<script>` tags in HTML replaces import graphs.

**Key Characteristics:**
- Zero build tooling — raw `.js` and `.html` files are deployed directly to Cloudflare Pages
- No ES modules (`import`/`export`) — every module is a `var X = (function(){…})()` or `window.X = (() => {…})()` pattern
- All persistent data lives in browser IndexedDB — no server, no API calls for data
- PWA with service worker for offline capability and cache-first asset delivery
- License validation happens client-side via Lemon Squeezy API calls in `assets/license.js`

## Layers

**Gate Layer (inline scripts in HTML heads):**
- Purpose: Redirect unauthorized users before any content renders
- Location: `<head>` of every protected HTML page
- Contains: Three sequential inline gate scripts (no license → landing, no terms → disclaimer, incomplete license → license page)
- Depends on: `localStorage` keys (`portfolioLicenseActivated`, `portfolioTermsAccepted`, `portfolioLicenseInstance`)
- Used by: Browser (runs synchronously on page load)

**Shared Infrastructure (`window.*` globals):**
- Purpose: Cross-page shared state, DB access, utilities
- Location: `assets/app.js`, `assets/db.js`, `assets/backup.js`, `assets/shared-chrome.js`, `assets/version.js`
- Contains: DB abstraction, i18n engine, nav chrome, backup I/O
- Depends on: `window.I18N` (must load before `app.js`), `jszip.min.js` (before `backup.js`)
- Used by: Every page module

**Page Modules (no `window.*` export, IIFE or plain top-level):**
- Purpose: Page-specific UI logic
- Location: `assets/overview.js`, `assets/sessions.js`, `assets/add-client.js`, `assets/add-session.js`, `assets/settings.js`, `assets/reporting.js`, etc.
- Contains: DOM event handlers, data loading, rendering logic for one page
- Depends on: `window.App`, `window.PortfolioDB`, page-specific globals
- Used by: Their corresponding HTML page only

**Storage Layer (IndexedDB):**
- Purpose: All persistent client/session data — local-only, never transmitted
- Location: Browser IDB, accessed via `window.PortfolioDB` (`assets/db.js`)
- Contains: `clients`, `sessions`, `therapistSettings`, `snippets`, `crashlog` stores
- Depends on: Raw IndexedDB API (no wrapper library)
- Used by: `PortfolioDB` exclusively; page modules access data only through `PortfolioDB`

**Service Worker:**
- Purpose: Static asset precaching and cache-first network strategy
- Location: `sw.js`
- Contains: Precache URL list, cache versioning from `INTEGRITY_TOKEN`, install/activate/fetch handlers
- Depends on: `assets/version.js` (imported via `importScripts`)
- Used by: Browser (registered on page load); never touches IndexedDB

## Data Flow

### Primary App Flow (e.g., view client list)

1. Browser requests `index.html` (Gate scripts redirect if unlicensed)
2. `<script>` tags load: `version.js` → `crashlog.js` → i18n files → `i18n.js` → `tokens.css`/`app.css` → `app.js` → `db.js` → `backup.js` → `shared-chrome.js` → `overview.js`
3. `DOMContentLoaded` fires → page module calls `App.initCommon()` (`assets/app.js:initCommon`)
4. `initCommon` reads language from `localStorage`, loads `window.I18N[lang]`, applies translations, renders nav
5. Page module calls `PortfolioDB.getAllClients()` → `openDB()` returns pooled `IDBDatabase` promise → IDB read
6. Data returned → page module renders DOM

### Backup Export Flow

1. User clicks Export → `backup-modal.js` opens modal
2. Modal collects options (encryption password, format) → calls `BackupManager.exportAll()` (`assets/backup.js`)
3. `BackupManager` calls `PortfolioDB.getAllClients()`, `getAllSessions()`, etc.
4. Assembles JSZip archive (photos as binary entries, data as JSON)
5. If encrypted: `crypto.subtle` PBKDF2 → AES-256-GCM encrypt → `.sgbackup` magic bytes prepended
6. `URL.createObjectURL()` triggers download

### License Gate Flow

1. Any protected page → inline gate script checks `localStorage.portfolioLicenseActivated`
2. If absent → `window.location.replace('./landing.html')`
3. `landing.html` → Lemon Squeezy checkout → webhook → `license.js` validates key against LS API
4. On success: writes `portfolioLicenseActivated`, `portfolioLicenseInstance` to `localStorage` → redirect to `index.html`

**State Management:**
- Persistent state: IndexedDB (client/session data) + `localStorage` (license, lang, theme, backup schedule)
- In-memory state: module-level `let` variables inside IIFEs (e.g., `_allClients`, `_sectionLabelCache`, `_snippetCache` in `app.js`; `_dbPromise` connection pool in `db.js`)
- No shared reactive state system — DOM updates are imperative, triggered by module functions

## Key Abstractions

**`PortfolioDB` (IIFE module):**
- Purpose: Single choke-point for all IndexedDB I/O; hides raw IDB callback complexity behind async/Promise wrappers
- File: `assets/db.js`
- Pattern: Connection pool (`_dbPromise`) + versioned schema migrations object (`migrations[1..6]`) + per-entity CRUD methods

**`App` (IIFE module):**
- Purpose: Cross-page runtime — i18n engine, nav render, backup banner, toast/confirm UI, form helpers, section label cache
- File: `assets/app.js`
- Pattern: Lazy-loaded caches (section labels, snippets) populated by `initCommon`, then read synchronously by page modules

**`AppVersion` (global/self):**
- Purpose: Deploy token single source of truth, usable in both page and service worker scope
- File: `assets/version.js`
- Pattern: Assigns to `self`/`globalThis` so SW can `importScripts('/assets/version.js')` and access `self.AppVersion.INTEGRITY_TOKEN`

**Demo Mode:**
- `window.name === "demo-mode"` gates: DB opens `demo_portfolio` IDB instead of `sessions_garden`; gate scripts skip license checks; seed data loaded from `assets/demo-seed-data.json` via `assets/demo-seed.js`

## Entry Points

**Protected App Pages:**
- Location: `index.html`, `sessions.html`, `add-client.html`, `add-session.html`, `settings.html`, `reporting.html`
- Triggers: User navigation
- Responsibilities: Run gate scripts, load all shared scripts in dependency order, invoke page module on `DOMContentLoaded`

**Landing / License:**
- Location: `landing.html`, `license.html`, `disclaimer.html` (and `-he`, `-de`, `-cs`, `-en` variants)
- Triggers: Gate redirects or direct navigation
- Responsibilities: No auth gates; render marketing/legal content, handle license activation

**Demo:**
- Location: `demo.html`
- Triggers: Landing page "Try demo" link
- Responsibilities: Sets `window.name = "demo-mode"`, loads seed data, opens app in demo DB

**Report/Recovery:**
- Location: `report.html`, `reporting.html`
- Triggers: Wedged integrity nudge "Report a problem" button or nav
- Responsibilities: Render diagnostic info from crashlog and DB state

## Architectural Constraints

- **No build step:** Never introduce a bundler, transpiler, or package import. All dependencies ship as standalone `.js` files in `assets/`.
- **Script load order is load-bearing:** Each HTML page's `<script>` sequence defines the dependency graph. `version.js` must be first (SW also imports it). i18n files before `app.js`. `db.js` before page modules.
- **Single-threaded browser:** No web workers (except the service worker, which handles only HTTP caching). All DB I/O is async but serialized through the `_dbPromise` connection pool.
- **Global state via `window.*`:** Module-to-module communication happens only via `window.X` — never by importing. No `import()` calls anywhere.
- **IndexedDB never touched by SW:** `sw.js` and `db.js` are strictly separated — the SW comment at line 1 of `sw.js` makes this explicit.
- **Demo mode isolation:** `window.name === "demo-mode"` is the only branch point. All code paths check this via `PortfolioDB`'s `DB_NAME` constant — do not add ad-hoc demo checks elsewhere.

## Anti-Patterns

### Bypassing `PortfolioDB` for IDB access

**What happens:** Opening `indexedDB` directly from a page module, bypassing `window.PortfolioDB`
**Why it's wrong:** Breaks the connection pool, bypasses migrations, creates a second concurrent connection
**Do this instead:** Always call `window.PortfolioDB.getAllClients()` etc. from `assets/db.js`

### Reading `.env` or secrets in client code

**What happens:** Any attempt to embed API keys or secrets in `assets/*.js`
**Why it's wrong:** All assets are served publicly; the only secret value is the Lemon Squeezy license key which is user-provided at activation time
**Do this instead:** Keep `STORE_ID` and `PRODUCT_ID` as plain constants in `assets/license.js` (these are public IDs); user-provided license key is validated at runtime and stored in `localStorage`

### Using `innerHTML` for i18n strings or user data

**What happens:** Setting `element.innerHTML = t('some.key')` or `element.innerHTML = client.name`
**Why it's wrong:** XSS risk; T-22-02-01 mitigation mandates `textContent`/`.value` for all user-provided or translated strings
**Do this instead:** Use `element.textContent = App.t('some.key')` and `element.value = App.getSectionLabel(key, fallback)`

## Error Handling

**Strategy:** Errors are non-fatal wherever data safety allows. DB migration failures log to console but do not interrupt the user. Critical failures (DB blocked, version changed) show a localized in-page banner with a "Refresh" CTA.

**Patterns:**
- DB errors: `PortfolioDB._showDBMigrationError()` renders a `div.db-error-banner` prepended to `document.body`; uses `createElement`/`textContent` (never `innerHTML`)
- Crash capture: Early `window.onerror` + `unhandledrejection` in `index.html` `<head>` buffers to `localStorage` before `crashlog.js` loads; `crashlog.js` then persists to IDB
- SW integrity mismatch: `AppVersion.buildNudge(state)` renders one of three honest states (`online`, `offline`, `wedged`) — never makes a false "refresh to complete" promise when already tried

## Cross-Cutting Concerns

**Logging:** `console.log/error/warn` only. Structured crash events written to IDB `crashlog` store via `CrashLog` module (`assets/crashlog.js`).
**Validation:** Input sanitization done inline in page modules before calling `PortfolioDB` write methods. IDB schema validated via `validateSnippetShape` in `db.js` for snippets store.
**Authentication:** Client-side only. License key validated against Lemon Squeezy API in `assets/license.js`. Result stored in `localStorage`. Gate scripts enforce on every protected page load — no server session.
**RTL/Bidi:** `assets/bidi.min.js` (Unicode bidi algorithm) used by PDF export. `assets/globe-lang.js` + `assets/globe-lang.css` handle language picker with RTL-aware layout. Hebrew (`he`) triggers `dir="rtl"` on `document.documentElement`.

---

*Architecture analysis: 2026-06-28*
