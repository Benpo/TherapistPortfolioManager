# Architecture

**Analysis Date:** 2026-02-01

## Pattern Overview

**Overall:** Multi-page SPA with modular namespace pattern and IndexedDB client-side persistence.

**Key Characteristics:**
- Vanilla JavaScript with namespace-based modules (no framework)
- Client-side only (no backend API)
- IndexedDB for persistent local storage
- Page-per-route navigation pattern
- Shared utility modules loaded across all pages
- Bilingual UI (English/Hebrew with RTL support)

## Layers

**Presentation Layer:**
- Purpose: Render UI and handle user interactions
- Location: HTML pages in root (`index.html`, `add-client.html`, `sessions.html`, `add-session.html`, `reporting.html`)
- Contains: Static HTML structure with data-i18n bindings for translations, modal dialogs, forms
- Depends on: App module (`assets/app.js`), i18n module (`assets/i18n.js`), page-specific scripts
- Used by: End users via browser navigation

**UI Module Layer:**
- Purpose: Shared UI logic, components, and utilities
- Location: `assets/app.js`
- Contains: Translation system, toast notifications, confirm dialogs, severity scale widget, formatting utilities
- Depends on: i18n module, browser DOM APIs
- Used by: All page-specific modules

**Data Access Layer:**
- Purpose: Manage IndexedDB connection and query operations
- Location: `assets/db.js` (window.PortfolioDB namespace)
- Contains: Database initialization, CRUD operations for clients and sessions
- Depends on: Browser IndexedDB API
- Used by: All page-specific modules

**Internationalization Layer:**
- Purpose: Store and manage translations
- Location: `assets/i18n.js` (window.I18N)
- Contains: Key-value translation dictionaries for English and Hebrew
- Depends on: None (static data)
- Used by: App module for dynamic translation lookup

**Page Logic Layer:**
- Purpose: Implement page-specific functionality and business logic
- Location: `assets/overview.js`, `assets/add-client.js`, `assets/add-session.js`, `assets/sessions.js`, `assets/reporting.js`
- Contains: Page initialization, form submission, data rendering, filtering/sorting
- Depends on: App module, PortfolioDB module, i18n module, browser DOM APIs
- Used by: Browser DOMContentLoaded event

## Data Flow

**Client Creation Flow:**

1. User navigates to `add-client.html`
2. `add-client.js` initializes, optionally loads existing client if `clientId` param present
3. User fills form and submits
4. Form handler calls `PortfolioDB.addClient()` or `PortfolioDB.updateClient()`
5. IndexedDB transaction completes, client stored
6. Redirect to `index.html` triggers `overview.js` to reload
7. `overview.js` calls `PortfolioDB.getAllClients()` to fetch and render client table

**Session Creation Flow:**

1. User navigates to `add-session.html` (optionally with `clientId` URL param)
2. `add-session.js` populates client dropdown from `PortfolioDB.getAllClients()`
3. User fills form with client, date, session type, issues with before/after severity
4. Form handler calls `PortfolioDB.addSession()` or `PortfolioDB.updateSession()`
5. IndexedDB stores session with clientId reference
6. Redirect to `index.html` triggers data reload

**Data Read Flow:**

1. Page loads and DOMContentLoaded fires
2. Specific page module calls `PortfolioDB.getAllClients()` and/or `PortfolioDB.getAllSessions()`
3. IndexedDB transaction reads all records
4. Page module processes data (filtering, aggregation, sorting)
5. DOM elements populated with formatted data
6. User interactions (filter, sort, delete) trigger re-renders

**State Management:**

- **Client state:** Stored in IndexedDB, no in-memory cache except page-local variables during editing
- **Session state:** Stored in IndexedDB
- **UI state:** DOM attributes (data-* attributes), CSS classes (is-hidden, is-active, is-visible)
- **Language state:** Stored in localStorage (`portfolioLang`), reflected in document.documentElement.lang and body[dir]
- **Form state:** Held in form inputs during editing; discarded on navigation

## Key Abstractions

**Database Access (PortfolioDB):**
- Purpose: Encapsulate IndexedDB complexity, provide consistent async API
- Examples: `assets/db.js`
- Pattern: IIFE returning object of async functions; opens DB on each operation to ensure fresh connection

**App Utilities (App):**
- Purpose: Centralized UI operations and translation helpers
- Examples: `assets/app.js`
- Pattern: IIFE with public methods for t() (translate), applyTranslations(), setLanguage(), showToast(), confirmDialog(), formatDate(), createSeverityScale()

**Page Modules:**
- Purpose: Self-contained logic for each page/route
- Examples: `assets/overview.js`, `assets/add-client.js`, `assets/add-session.js`, `assets/sessions.js`, `assets/reporting.js`
- Pattern: IIFE or direct module code attached to DOMContentLoaded; no shared state between pages except via IndexedDB

**i18n Dictionary:**
- Purpose: Centralized translation storage
- Examples: `assets/i18n.js`
- Pattern: Static nested object on window.I18N with language code as first key, translation key as second key

## Entry Points

**Overview Page:**
- Location: `index.html` + `assets/overview.js`
- Triggers: Browser loads index.html or navigation from other pages
- Responsibilities: Fetch all clients and sessions, render client table with summary stats, handle client modal, setup import/export, setup navigation

**Add Client Page:**
- Location: `add-client.html` + `assets/add-client.js`
- Triggers: User clicks "Add Client" button or navigates to add-client.html?clientId=X
- Responsibilities: Render form with client fields (name, type, age, notes, photo), validate input, persist to DB, handle delete for existing clients

**Add Session Page:**
- Location: `add-session.html` + `assets/add-session.js`
- Triggers: User clicks "Add Session" or navigates with ?clientId=X or ?sessionId=X
- Responsibilities: Load client list, render form with session fields (date, type, issues with severity), support issue bulk creation, handle inline client creation, copy prev session data

**Sessions Page:**
- Location: `sessions.html` + `assets/sessions.js`
- Triggers: User clicks "Sessions" nav link
- Responsibilities: Fetch all sessions, support filtering by client and date range, render table with client, date, session type, issues

**Reporting Page:**
- Location: `reporting.html` + `assets/reporting.js`
- Triggers: User clicks "Reporting" nav link
- Responsibilities: Aggregate metrics across all sessions (total clients, sessions, avg issues, avg severity before/after, heart-wall clears)

## Error Handling

**Strategy:** Try-catch blocks in async operations; fallback to toast notifications for user feedback

**Patterns:**
- Import/export validation: `try { JSON.parse() } catch (err) { App.showToast("", "toast.importError") }`
- Photo file reading: `try { photoData = await readFileAsDataURL(file) } catch (err) { handle }`
- Form submission: Wrapped in try-catch with toast notification on error; form reset on success
- IndexedDB errors: Rejected promises propagated to caller; no global error handler

## Cross-Cutting Concerns

**Logging:** None implemented. Errors logged to browser console implicitly via Promise rejection.

**Validation:**
- Client form: Required fields (name) enforced by HTML5 validation (required attribute)
- Session form: Required fields (client, date, issues) enforced by required attribute and custom validation before submission
- Photo upload: Validated by accept="image/*" input attribute and file size checks in some cases

**Authentication:** None (client-side only, no user accounts)

**Internationalization:**
- All visible text bound via data-i18n attributes in HTML
- Dynamic content translated via App.t(key) in JavaScript
- Language switching via App.setLanguage(lang) updates DOM direction (RTL for Hebrew)
- localStorage persists language selection

---

*Architecture analysis: 2026-02-01*
