# Coding Conventions

**Analysis Date:** 2026-02-01

## Naming Patterns

**Files:**
- Kebab-case for HTML files: `index.html`, `add-client.html`, `add-session.html`, `sessions.html`, `reporting.html`
- Kebab-case for JavaScript files: `add-client.js`, `add-session.js`, `reporting.js`, `overview.js`, `sessions.js`, `db.js`, `i18n.js`, `app.js`
- CSS file: `app.css`
- Internationalization strings use dot notation: `"app.title"`, `"nav.overview"`, `"client.form.save"`

**Functions:**
- camelCase for function names: `openDB()`, `withStore()`, `addRecord()`, `addClient()`, `formatDate()`, `createSeverityScale()`, `applyTranslations()`, `getClientDisplayName()`, `loadOverview()`
- Prefix for helper functions that appear at module scope: `format`, `get`, `create`, `is`, `set`
- Event handlers follow `on[EventName]` pattern: `onConfirm()`, `onCancel()`, `onKey()`, `onupgradeneeded`, `onsuccess`, `onerror`

**Variables:**
- camelCase for all variables: `currentLang`, `clientCache`, `inlinePhotoData`, `editingClient`, `isReadMode`, `NEW_CLIENT_VALUE`
- Constants use UPPER_SNAKE_CASE: `DB_NAME`, `DB_VERSION`, `I18N_DEFAULT`
- Boolean variables often use `is` prefix: `isReadMode`, `isInteger()`
- Private/internal module state prefixed with underscore when stored on functions: `showToast._timer`

**Types and Data Objects:**
- No explicit TypeScript interfaces; objects are duck-typed
- Object keys follow camelCase: `photoData`, `clientId`, `heartWall`, `lastInitial`, `firstName`, `createdAt`, `updatedAt`
- Map-like objects use descriptive names: `sessionsByClient`, `map[type]`

**DOM Element IDs and Data Attributes:**
- camelCase for element IDs: `clientForm`, `clientSelect`, `sessionDate`, `clientPhoto`, `deleteClientBtn`, `saveAndSessionBtn`
- data attributes use kebab-case: `data-i18n`, `data-i18n-placeholder`, `data-nav`, `data-value`

**CSS Class Names:**
- kebab-case for CSS classes: `app-header`, `app-nav`, `client-row`, `severity-button`, `is-hidden`, `is-visible`, `is-active`, `read-mode`, `modal-overlay`, `button-label`, `helper-text`, `card-bg`
- State classes prefixed with `is-`: `is-hidden`, `is-visible`, `is-active`
- Utility patterns use descriptive names: `icon-swap`, `secondary`, `ghost`, `inline-actions`

**Internationalization Keys:**
- Use dot notation for hierarchical structure: `app.title`, `nav.overview`, `client.form.firstName`
- Grouping: `overview.*`, `client.*`, `session.*`, `confirm.*`, `toast.*`, `common.*`
- Descriptive keys: `confirm.deleteClient.title`, `toast.errorRequired`, `session.copyField`

## Code Style

**Formatting:**
- No formatter configured; code follows implicit conventions
- 2-space indentation (shown in all sample files)
- Semicolons present at end of statements
- Consistent spacing around operators

**Linting:**
- No ESLint or code quality tools detected
- Manual code review conventions only

**Module Pattern:**
- Immediately-invoked function expression (IIFE) with object return for public API
- `window.App = (() => { ... return { t, applyTranslations, ... }; })()`
- `window.PortfolioDB = (() => { ... return { addClient, ... }; })()`
- `window.I18N = { en: { ... }, he: { ... } }`
- Exposes modules on `window` object for global accessibility

**Promise Handling:**
- async/await preferred over `.then()` chains: `await PortfolioDB.getAllClients()`
- Promise constructor used for callback-based APIs: `new Promise((resolve, reject) => { ... })`
- Error handling via `try/catch` blocks for import/parse operations

## Import Organization

Not applicable - no module imports. Global scope via:
- HTML script tags (order: i18n.js, db.js, app.js, page-specific js)
- Global variable references: `window.App`, `window.PortfolioDB`, `window.I18N`, `App.t()`, `PortfolioDB.addClient()`

## Error Handling

**Patterns:**
- Promise rejections handled in `catch` blocks in try/catch statements
- IndexedDB errors captured via callbacks: `request.onerror = () => reject(request.error)`
- Transaction errors: `tx.onerror = () => reject(tx.error)`
- Graceful degradation for missing DOM elements: `if (!element) return;`
- User feedback via toast messages instead of throwing errors to user interface: `App.showToast("", "toast.importError")`
- No centralized error logging; errors caught and handled locally

**Error Messages:**
- Internationalized via i18n keys: `"toast.importError"`, `"toast.errorRequired"`
- User-facing errors displayed as toast notifications with translations

## Logging

**Framework:** No logging framework; uses `console` implicitly (no explicit console calls visible)

**Patterns:**
- Events dispatched for state changes: `document.dispatchEvent(new CustomEvent("app:language", { detail: { lang: currentLang } }))`
- Event listeners for state-driven UI updates: `document.addEventListener("app:language", () => { ... })`
- Minimal logging; primary mechanism is reactive UI updates via event system

## Comments

**When to Comment:**
- Minimal comments in codebase
- Comments not extensively used; code is relatively self-documenting
- Complex logic (like severity color calculation) lacks explanatory comments

**JSDoc/TSDoc:**
- No JSDoc documentation found
- Function purposes inferred from names and context

## Function Design

**Size:** Functions are generally compact (5-30 lines)

**Parameters:**
- Single responsibility; functions accept minimal parameters
- Complex operations passed as configuration objects: `{ titleKey, messageKey, confirmKey, cancelKey }`
- Callback-based APIs for event handlers and database operations

**Return Values:**
- Async functions return Promises: `async function addClient(client) { return addRecord(...) }`
- Database operations return Promises
- IIFE modules return object literals with public methods
- Modal/dialog functions return Promises resolving to user action result

## Module Design

**Exports:**
- Public API exposed via object literal return in IIFE pattern
- Named exports in object: `{ t, applyTranslations, setLanguage, initCommon, ... }`
- Global namespace pollution intentional (window.App, window.PortfolioDB)

**Module Initialization:**
- App initialization occurs on `DOMContentLoaded` event in page-specific scripts
- `App.initCommon()` called first in each page script to set up language and common UI
- Database accessed via synchronous function calls that return Promises

## Special Patterns

**Internationalization:**
- Key-based translation system with `App.t(key)`
- Language selection via `App.setLanguage(lang)`
- DOM translation via attributes: `data-i18n="key"` and `data-i18n-placeholder="key"`
- `App.applyTranslations(root)` re-renders all translations in given element

**DOM Manipulation:**
- Direct `document.getElementById()` for element access
- `querySelectorAll()` for batch selections
- `classList.add/remove/toggle()` for state classes
- Event delegation via `closest()` for nested click handlers
- Element creation via `document.createElement()` for dynamic content

**Storage:**
- IndexedDB for persistent data (clients and sessions)
- LocalStorage for user preferences: `localStorage.setItem("portfolioLang", currentLang)`

**Form Handling:**
- Form submission prevents default: `event.preventDefault()`
- Submitter button detection: `event.submitter` to distinguish save vs. save-and-continue actions
- File input for image upload with FileReader API: `readFileAsDataURL(file)`

---

*Convention analysis: 2026-02-01*
