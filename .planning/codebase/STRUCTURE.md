# Codebase Structure

**Analysis Date:** 2026-02-01

## Directory Layout

```
TherapistPortfolioManager_app/
├── .planning/                      # Planning and analysis documents
│   └── codebase/                   # Codebase reference docs (ARCHITECTURE.md, etc.)
├── assets/                         # JavaScript modules and stylesheets
│   ├── app.js                      # Shared UI utilities (translations, toasts, dialogs)
│   ├── app.css                     # Global styles
│   ├── db.js                       # IndexedDB client (PortfolioDB namespace)
│   ├── i18n.js                     # Translation dictionaries (English/Hebrew)
│   ├── overview.js                 # Overview page logic (dashboard, client table)
│   ├── add-client.js               # Add/edit client page logic
│   ├── add-session.js              # Add/edit session page logic
│   ├── sessions.js                 # Sessions list page logic with filtering
│   └── reporting.js                # Reporting page logic (metrics aggregation)
├── index.html                      # Overview/dashboard page (entry point)
├── add-client.html                 # Add/edit client form page
├── add-session.html                # Add/edit session form page
├── sessions.html                   # Sessions list page
└── reporting.html                  # Reporting metrics page
```

## Directory Purposes

**assets/:**
- Purpose: Shared and page-specific JavaScript modules, styles, and translations
- Contains: Vanilla JavaScript modules, CSS stylesheet, i18n dictionaries
- Key files: `app.js` (UI library), `db.js` (data access), all page modules

**Root (project directory):**
- Purpose: HTML page files and project configuration
- Contains: Entry point (index.html) and form/report pages
- Key files: `index.html` (dashboard)

## Key File Locations

**Entry Points:**
- `index.html`: Main application dashboard; loaded on app start
- `assets/app.js`: Loaded on every page; defines App namespace with UI utilities
- `assets/db.js`: Loaded on every page; defines PortfolioDB namespace for data access
- `assets/i18n.js`: Loaded first on every page; defines window.I18N translation dictionary

**Configuration:**
- `assets/i18n.js`: Translation strings (English and Hebrew)
- `assets/app.css`: All styles, including responsive layout, components, animations
- No config files (environment variables not used)

**Core Logic:**
- `assets/db.js`: IndexedDB schema definition and CRUD operations
- `assets/app.js`: Shared UI operations (toast, modals, translations, formatting)
- `assets/overview.js`: Client dashboard, stats, modal, import/export
- `assets/add-client.js`: Client form, photo upload, photo deletion
- `assets/add-session.js`: Session form, issue list management, inline client creation
- `assets/sessions.js`: Session list rendering and filtering
- `assets/reporting.js`: Metrics aggregation (totals, averages, heart-wall stats)

**Testing:**
- Not found: No test files present

## Naming Conventions

**Files:**
- HTML pages: kebab-case with descriptive names (index.html, add-client.html, add-session.html)
- JavaScript modules: kebab-case with .js extension (app.js, db.js, overview.js)
- CSS: Single global stylesheet (app.css)
- CSS classes: kebab-case with semantic names (card, form-field, client-avatar, is-hidden, is-active)
- HTML IDs: camelCase with semantic context (clientForm, modalAvatar, statClients, addClientBtn)

**Directories:**
- Lowercase, descriptive (assets, .planning/codebase)

**JavaScript Functions:**
- camelCase (openDB, withStore, addClient, formatDate, createSeverityScale, loadOverview)
- Async functions use standard async/await (not callbacks)

**CSS Classes:**
- Utility classes: is-* (is-hidden, is-active, is-visible), has-* for states
- Component classes: semantic names (modal, card, table, button, severity-scale)
- Layout classes: semantic (container, form-field, stat-card, session-list)

**Variables:**
- camelCase for local variables (editingClient, photoData, clientCache)
- UPPERCASE_SNAKE_CASE for constants (DB_NAME, DB_VERSION, NEW_CLIENT_VALUE)

**Namespaces:**
- Global: window.App, window.PortfolioDB, window.I18N
- Module pattern: IIFE returning public API object

## Where to Add New Code

**New Feature (e.g., new data field for clients):**
1. Update IndexedDB schema: Modify `assets/db.js` object store initialization
2. Add form field: Edit corresponding HTML page (e.g., `add-client.html`)
3. Add UI handling: Edit page-specific JavaScript (e.g., `assets/add-client.js`) to read/write new field
4. Add display logic: Update rendering in page modules (e.g., `assets/overview.js` for table columns)
5. Add translation strings: Add keys to window.I18N in `assets/i18n.js`
6. Add styles: Add CSS rules to `assets/app.css`

**New Page/Route:**
1. Create HTML file in root (e.g., `new-page.html`)
2. Create corresponding module in `assets/` (e.g., `assets/new-page.js`)
3. Include script tags: Add i18n, db, app, and new-page.js to HTML
4. Add navigation link: Update all `app-nav` elements in existing HTML files
5. Add i18n keys: Add translation strings to `assets/i18n.js`
6. Add CSS: Add styles to `assets/app.css` (or extend existing classes)
7. Use PortfolioDB API: Call functions like `PortfolioDB.getAllClients()`, `PortfolioDB.addSession()`
8. Use App utilities: Call `App.t()` for translations, `App.showToast()` for messages, etc.

**Utilities/Helpers:**
- Shared across pages: Add to `assets/app.js` as methods on App namespace
- Date formatting: Use App.formatDate() or extend it in app.js
- Translations: Use App.t(key) to look up strings from window.I18N
- UI patterns: Use App.createSeverityScale(), App.confirmDialog(), App.showToast()

**Styles:**
- All CSS in `assets/app.css`
- Follow existing patterns: Semantic class names, utility classes for state (is-*, has-*)
- Responsive design: Mobile-first with media queries
- Components: card, modal, button, form-field, table, severity-scale (all defined in app.css)

## Special Directories

**.planning/codebase/:**
- Purpose: Contains ARCHITECTURE.md, STRUCTURE.md, and other analysis documents
- Generated: Yes (by GSD tools)
- Committed: Yes (documentation is version controlled)

**assets/:**
- Purpose: Static assets loaded by HTML pages
- Generated: No
- Committed: Yes (source code)

## Data Model

**Clients Table (IndexedDB):**
- Structure: { id (auto), firstName, lastInitial, age, email, phone, notes, type, heartWall, photoData, name }
- Key: id (auto-increment)
- Indices: name (for lookup)
- Used by: add-client.js, overview.js, add-session.js, sessions.js

**Sessions Table (IndexedDB):**
- Structure: { id (auto), clientId (FK), date, sessionType (inPerson/proxy/surrogate), issues: [{ name, before (0-10), after (0-10) }], comments, heartWallCleared, insights, customerSummary }
- Key: id (auto-increment)
- Indices: clientId (for querying sessions by client), date (for sorting)
- Used by: add-session.js, overview.js, sessions.js, reporting.js

---

*Structure analysis: 2026-02-01*
