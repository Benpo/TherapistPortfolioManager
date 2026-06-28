# Coding Conventions

**Analysis Date:** 2026-06-28

## Language & Module Pattern

All production code is **vanilla JavaScript (ES2020+), zero-build, zero-npm**. Every
`assets/*.js` file ships as-is to the browser — no bundler, no TypeScript, no transpile
step. The sole `package.json` devDependency is `jsdom` (test runner only).

**Module pattern:** IIFE assigned to `window.*` global.

```js
// Every production module follows this exact shape:
window.PortfolioDB = (() => {
  'use strict';
  // private state + helpers
  return { publicMethod, ... };
})();

// Older/simpler modules use var at top level instead of IIFE:
var CrashLog = (function () {
  'use strict';
  ...
  return { logError, ... };
})();
```

Files: `assets/db.js`, `assets/app.js`, `assets/crashlog.js`, `assets/backup.js`, etc.

## Naming Patterns

**Files:**
- `kebab-case.js` for all asset files: `add-client.js`, `shared-chrome.js`, `pdf-export.js`
- `i18n-{lang}.js` for language dictionaries: `i18n-en.js`, `i18n-he.js`, `i18n-de.js`, `i18n-cs.js`
- Test files: `{phase}-{plan}-{slug}.test.js` (e.g. `25-01-sendToMyself-removed.test.js`) or `quick-{date}-{id}-{slug}.test.js`

**Functions:**
- `camelCase` for all functions: `openDB`, `migrateOldDB`, `getAllClients`, `buildReportRow`
- `_prefixedPrivate` for module-private variables: `_dbPromise`, `_migrationDone`, `_seedingDone`, `_sectionLabelCache`, `_snippetCache`

**Constants:**
- `SCREAMING_SNAKE_CASE` for module-level constants: `DB_NAME`, `DB_VERSION`, `OLD_DB_NAME`, `MIRROR_KEY`, `MAX_ENTRIES`, `MAX_AGE_MS`

**DOM data attributes:**
- `data-i18n` for translation keys
- `data-i18n-placeholder` for placeholder translations
- `data-role="..."` for behavioral hooks (e.g. `data-role="report"`)

## Code Style

**Formatting:**
- No automated formatter (no Prettier/ESLint config present)
- Single quotes for strings in test files; double quotes in production assets
- 2-space indentation throughout

**Declarations:**
- `const`/`let` in production ES modules (IIFE bodies)
- `var` in test files and some older production modules (CrashLog uses `var`)
- `'use strict';` declared at the top of every file

**JSDoc:**
- All public-facing functions in production modules carry `@param` / `@returns` JSDoc
- Internal helpers use inline comments explaining the "why" (especially for non-obvious constraints)

```js
/**
 * Translate a key using the current language dictionary.
 * Falls back to English, then returns the key itself.
 * @param {string} key - i18n key (e.g., 'nav.overview')
 * @returns {string} Translated string
 */
function t(key) { ... }
```

## Error Handling

**Production pattern — never-throwing guard idiom:**
Every handler and storage operation is wrapped so errors can never crash the page.
Exemplar: `assets/crashlog.js` and `assets/version.js`.

```js
try {
  // ... operation
} catch (_) { /* ignore */ }
```

**Async functions:**
- `async/await` throughout production code (`assets/db.js`, `assets/app.js`)
- Rejections are caught with `try/catch` inside the async body or at the call site
- Promise callbacks (`onsuccess`, `onerror`, `oncomplete`) on IDB requests follow the old-callback shape required by IndexedDB

**Feature-gating:**
Optional dependencies are checked before use to ensure graceful degradation:

```js
if (typeof window.CrashLog !== 'undefined') {
  window.CrashLog.logError(entry);
}
```

## Import Organization

There are no ES module `import` statements. Dependencies are loaded via `<script>` tags
in each HTML page in declaration order. Inter-module calls use `window.*` globals
(`window.App`, `window.PortfolioDB`, `window.CrashLog`, etc.).

## i18n Pattern

All user-facing strings go through `App.t(key)` for runtime translation. Hard-coded
English strings in production JS are a known violation that must be eliminated (see
`tests/25-11-hardcoded-english-removed.test.js`).

Modules that must render before `i18n.js` loads (e.g. `crashlog.js`, `version.js`)
embed their own pre-i18n 4-language string tables as `var MODULE_STRINGS = { en, he, de, cs }`.

## DOM Safety Rule

Custom labels from user input are applied via `.textContent` or `.value`, **never
`innerHTML`**. This is explicitly documented in JSDoc for `getSectionLabel`:

> Callers MUST render the result via .textContent or .value (never innerHTML)
> because customLabel is stored verbatim.

## Sync-Read / Async-Load Cache Pattern

Shared data accessed on the hot path uses an eager-load + synchronous-read pattern:

1. `initCommon()` populates the cache asynchronously at page load
2. All callers read synchronously via a getter that returns a copy

```js
// Write: async, on init
_sectionLabelCache = await PortfolioDB.getAllTherapistSettings();

// Read: sync, everywhere
function getSectionLabel(sectionKey, defaultI18nKey) {
  const entry = _sectionLabelCache.get(sectionKey);
  ...
}
```

This pattern is used for `_sectionLabelCache` (`app.js`) and `_snippetCache` (`app.js`).

## Comments

**Phase/plan references:** Code comments cite the phase and plan that introduced
non-obvious code (e.g. `// RFCT-03 (Phase 31)`, `// Phase 22`). This is the primary
traceability mechanism — do not omit.

**Constraint notes:** Any zero-build constraint violation (no `fetch`, no `import`, no
`XMLHttpRequest`) is called out with a comment referencing the specific constraint code
(e.g. `// VER-06 carry-over`).

---

*Convention analysis: 2026-06-28*
