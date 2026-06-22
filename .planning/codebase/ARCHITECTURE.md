<!-- refreshed: 2026-06-22 -->
# Architecture

**Analysis Date:** 2026-06-22

## System Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                     HTML Pages (MPA)                            │
│  index.html  sessions.html  add-session.html  add-client.html   │
│  reporting.html  settings.html  landing.html  license.html      │
│  demo.html   disclaimer-*.html  impressum-*.html  datenschutz-* │
└───────┬────────────┬──────────────────┬──────────────────┬──────┘
        │            │                  │                  │
        ▼            ▼                  ▼                  ▼
┌──────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│  app.js  │ │  Page module │ │  i18n.js +   │ │  shared-chrome.js│
│ (shared  │ │  (per page): │ │  i18n-*.js   │ │  (nav/footer)    │
│  utils,  │ │  overview.js │ │  (en/he/de/  │ │                  │
│  modals, │ │  sessions.js │ │   cs)        │ │                  │
│  i18n,   │ │  add-session │ └──────────────┘ └──────────────────┘
│  guards) │ │  add-client  │
└──────────┘ │  reporting   │
             │  settings.js │
             │  snippets.js │
             └──────┬───────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                  db.js (window.PortfolioDB)                     │
│              IndexedDB abstraction layer                        │
│   stores: clients, sessions, therapistSettings, snippets        │
└─────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     IndexedDB (browser)                         │
│  DB: "sessions_garden" (or "demo_portfolio" in demo mode)       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Service Worker (sw.js)                        │
│   Manages HTTP asset cache only — never touches IndexedDB       │
└─────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| PortfolioDB | IndexedDB CRUD for all data stores | `assets/db.js` |
| App | Shared utilities: i18n, modals, nav guards, theme, section labels, snippet cache | `assets/app.js` |
| SharedChrome | Shared nav/footer rendering, license-aware back links | `assets/shared-chrome.js` |
| I18N | Translation dictionaries per language | `assets/i18n.js`, `assets/i18n-en.js`, `assets/i18n-he.js`, `assets/i18n-de.js`, `assets/i18n-cs.js` |
| overview.js | Client list, search/filter, missing-birth banner | `assets/overview.js` |
| sessions.js | Session list for a client | `assets/sessions.js` |
| add-session.js | Session create/edit form | `assets/add-session.js` |
| add-client.js | Client create/edit form | `assets/add-client.js` |
| reporting.js | Reporting/analytics view | `assets/reporting.js` |
| settings.js | Therapist settings, section labels, snippets management | `assets/settings.js` |
| snippets.js | Snippet picker UI component | `assets/snippets.js` |
| pdf-export.js | PDF generation via jsPDF | `assets/pdf-export.js` |
| backup.js + backup-modal.js | Export/import ZIP backup | `assets/backup.js`, `assets/backup-modal.js` |
| landing.js | License purchase flow (Lemon Squeezy) | `assets/landing.js` |
| license.js | License activation/validation | `assets/license.js` |
| demo.js + demo-seed.js | Demo mode seeding and hint overlays | `assets/demo.js`, `assets/demo-seed.js` |
| sw.js | Service worker: static asset precache, offline navigation | `sw.js` |

## Pattern Overview

**Overall:** Multi-Page Application (MPA) PWA — vanilla JavaScript, no framework, no build step.

**Key Characteristics:**
- Each HTML page is a standalone document; no SPA routing.
- All JS modules are IIFEs exposed as `window.Globals` (e.g., `window.PortfolioDB`, `window.App`).
- No npm, no bundler — all assets served directly as static files from Cloudflare Pages.
- All data stored client-side in IndexedDB; no backend server.
- Service worker handles offline capability via cache-first strategy for static assets.

## Layers

**HTML Pages:**
- Purpose: Entry points and markup shells for each screen.
- Location: root directory (`index.html`, `sessions.html`, `add-session.html`, `add-client.html`, `reporting.html`, `settings.html`, `landing.html`, `license.html`, `demo.html`, `disclaimer-*.html`, `impressum-*.html`, `datenschutz-*.html`)
- Contains: Inline gate scripts (license/terms checks), layout HTML, `<script>` tags loading page modules.
- Depends on: `assets/*.js`, `assets/*.css`

**Shared Runtime (app.js):**
- Purpose: Shared utilities used by all app pages.
- Location: `assets/app.js`
- Contains: i18n (`App.t`, `App.applyTranslations`), modal dialogs (`App.confirmDialog`, `App.showToast`), nav guards (`App.installNavGuard`), section-label cache, snippet cache, theme management.
- Depends on: i18n dictionaries loaded before it.
- Used by: all page-specific modules.

**Data Layer (db.js):**
- Purpose: IndexedDB abstraction — all persistence.
- Location: `assets/db.js`
- Contains: `window.PortfolioDB` IIFE exposing async CRUD methods for clients, sessions, therapistSettings, snippets. Handles DB version migrations (current version: 5). Handles rebrand migration from old `emotion_code_portfolio` DB to `sessions_garden`.
- Depends on: Nothing (pure IndexedDB).
- Used by: All page modules, backup.js.

**Page Modules:**
- Purpose: Page-specific UI logic, loaded only on relevant pages.
- Location: `assets/overview.js`, `assets/sessions.js`, `assets/add-session.js`, `assets/add-client.js`, `assets/reporting.js`, `assets/settings.js`
- Contains: DOM manipulation, event listeners, calls to `PortfolioDB`, calls to `App`.
- Depends on: `app.js`, `db.js` (both loaded first via `<script>` ordering in HTML).
- Used by: Their respective HTML page only.

**Service Worker:**
- Purpose: Offline support — caches static assets and HTML pages on install.
- Location: `sw.js`
- Contains: Precache lists for all JS/CSS/fonts/images and all HTML routes; cache-first strategy for static assets; redirect-safe pattern for HTML page caching (CF Pages pretty URLs).
- Never touches IndexedDB.

## Data Flow

### Primary Request Path (e.g., opening Overview)

1. Browser navigates to `index.html` — inline gate scripts run: redirect to `landing.html` if unlicensed, `disclaimer-*.html` if terms not accepted (`index.html` lines 5–14).
2. Page HTML loads `assets/tokens.css`, `assets/app.css`, `assets/app.js`, `assets/db.js`, `assets/i18n*.js`, `assets/overview.js`.
3. `overview.js` calls `PortfolioDB.getAllClients()` → IndexedDB → returns client array.
4. `App.applyTranslations()` populates all `data-i18n` elements.
5. DOM is updated with client rows; event listeners attached.

### Session Create/Edit Flow

1. User navigates to `add-session.html` (new) or `add-session.html?id=<uuid>` (edit).
2. `add-session.js` calls `PortfolioDB.getSession(id)` if editing; populates form.
3. On submit: `PortfolioDB.addSession()` or `PortfolioDB.updateSession()`.
4. Navigation redirects back to `sessions.html?client=<id>`.

### Demo Mode

1. `landing.html` opens `demo.html` in a named window (`window.name = "demo-mode"`).
2. `db.js` detects `window.name === "demo-mode"` and opens `demo_portfolio` IndexedDB instead of `sessions_garden`.
3. `demo-seed.js` populates synthetic client/session data on first load.

**State Management:**
- No in-memory global state store. Each page module holds page-local variables (e.g., `_allClients`, `_sessionsByClient` in `overview.js`).
- Persistent state lives entirely in IndexedDB (clients, sessions, settings, snippets) and `localStorage` (license flags, language, theme, terms acceptance).
- `App` holds two module-level caches populated once at page load: `_sectionLabelCache` (Map) and `_snippetCache` (Array), both read synchronously by page modules thereafter.

## Key Abstractions

**window.PortfolioDB:**
- Purpose: Single access point for all IndexedDB operations.
- Examples: `assets/db.js`
- Pattern: IIFE returning named async functions — `addClient`, `updateClient`, `getAllClients`, `addSession`, `updateSession`, `deleteSession`, `getAllTherapistSettings`, `getAllSnippets`, etc.

**window.App:**
- Purpose: Shared page utilities.
- Examples: `assets/app.js`
- Pattern: IIFE returning core namespace; additional methods attached as `App.fnName = function(){}` after the IIFE closes.

**data-i18n attributes:**
- Purpose: Declarative i18n — `App.applyTranslations()` sets `.textContent` on all matching elements.
- Pattern: `<span data-i18n="nav.clients"></span>` → resolved via current language dictionary.

## Entry Points

**index.html (Overview):**
- Location: `index.html`
- Triggers: Direct navigation; SW `start_url`.
- Responsibilities: Gate checks → client list via `overview.js`.

**landing.html:**
- Location: `landing.html`
- Triggers: Redirect from gate scripts when no license.
- Responsibilities: Marketing page, demo launch, license purchase via Lemon Squeezy.

**sw.js:**
- Location: `sw.js`
- Triggers: Registered from each app HTML page (not `landing.html`).
- Responsibilities: Precache all static assets + HTML routes on install; serve cache-first for static assets. Cache version: `sessions-garden-v210`.

## Architectural Constraints

- **Threading:** Single-threaded browser JS. Service worker runs in a separate thread but only handles HTTP cache — no shared state with the main thread.
- **Global state:** `window.PortfolioDB` and `window.App` are module-level singletons. `_sectionLabelCache` and `_snippetCache` in `app.js` are shared mutable state populated once at page init.
- **Circular imports:** No module system — load order in `<script>` tags is the dependency graph. `db.js` must load before page modules; `app.js` and i18n files must load before page modules.
- **No backend:** Zero server-side logic. All data is client-only. License validation calls Lemon Squeezy API (`https://api.lemonsqueezy.com`) directly from the browser.
- **No build step:** No transpilation, no minification (except vendored libs). Changes go live on deploy immediately.

## Anti-Patterns

### Loading order as implicit dependency management

**What happens:** Page modules depend on `app.js` and `db.js` being loaded first, enforced only by `<script>` tag ordering in HTML.
**Why it's wrong:** Any page that loads scripts out of order silently fails at runtime with `window.App is not defined` — no build-time safety net.
**Do this instead:** Maintain the existing `<script>` order in every HTML page: `tokens.css` → `app.css` → `app.js` → `db.js` → i18n files → page module last.

### Inline gate scripts in `<head>`

**What happens:** License/terms/redirect checks run as blocking inline scripts before any resources load (`index.html` lines 5–14).
**Why it's wrong:** Any async or complex logic here blocks the page and can cause redirect loops if localStorage is unavailable.
**Do this instead:** Keep gate scripts as simple, synchronous, single-purpose checks; never add async logic inside them.

## Error Handling

**Strategy:** Defensive — most DB calls are wrapped in try/catch at the call site; failures surfaced via `App.showToast`.

**Patterns:**
- IndexedDB errors bubble via rejected Promises; page modules catch and show toast notifications.
- Gate scripts wrap in `try/catch` and fail silently (no redirect on localStorage error).

## Cross-Cutting Concerns

**Logging:** `console.warn` in `sw.js` for precache failures; no structured logging elsewhere.
**Validation:** Form validation in page modules; `PortfolioDB.validateSnippetShape` for snippet shape validation.
**Authentication:** License-key based; checked via `localStorage.getItem('portfolioLicenseActivated')` in gate scripts and `shared-chrome.js`.

---

*Architecture analysis: 2026-06-22*
