# Coding Conventions

**Analysis Date:** 2026-06-22

## Project Architecture

This is a vanilla JS + HTML SPA (no bundler, no TypeScript). All JS runs in the browser as IIFE modules assigned to `window.*`. There is no `src/` directory — all application code lives in `assets/`.

## Naming Patterns

**Files:**
- Kebab-case for all asset files: `pdf-export.js`, `globe-lang.js`, `md-render.js`
- Feature pages match their HTML file name: `sessions.html` / `assets/sessions.js`
- i18n locale files: `i18n-{locale}.js` (e.g., `i18n-en.js`, `i18n-he.js`, `i18n-de.js`, `i18n-cs.js`)
- CSS design token file: `assets/tokens.css` (loaded before `app.css`)
- Phase/plan naming in tests: `{phase}-{plan}-{description}.test.js` (e.g., `25-11-i18n-parity.test.js`)
- Quick-task tests: `quick-{YYMMDD}-{task-id}-{description}.test.js` (e.g., `quick-260620-q8m-pdf-paragraph-linebreaks.test.js`)

**JavaScript identifiers:**
- camelCase for functions and variables: `applyTranslations`, `getSectionLabel`, `isSectionEnabled`
- PascalCase for module namespace objects exposed on `window`: `window.App`, `window.PortfolioDB`, `window.PDFExport`, `window.Snippets`
- Private module-level variables prefixed with `_`: `_sectionLabelCache`, `_snippetCache`, `_migrationDone`
- Constants in UPPER_SNAKE_CASE: `DB_NAME`, `DB_VERSION`, `DELETED_SEEDS_KEY`

**CSS classes:**
- BEM-like kebab-case: `.app-shell`, `.app-header`, `.is-modal-open`
- State classes use `is-` prefix: `body.is-modal-open`
- Data attributes for behavior hooks: `data-i18n`, `data-i18n-placeholder`

**HTML files:**
- Kebab-case: `add-client.html`, `add-session.html`, `datenschutz-en.html`
- Legal pages duplicated per locale suffix: `impressum-en.html`, `impressum-he.html`, `impressum-de.html`, `impressum-cs.html`

## Module Pattern

Every JS file exports its public API by assigning an IIFE-returned object to a `window.*` namespace:

```js
window.App = (() => {
  // private vars
  let _private = ...;

  function publicFn() { ... }

  return { publicFn, ... };
})();
```

Callers reference other modules via `window.App.getSectionLabel(...)`, never via ES module imports.

Modules that expose private functions for testing attach them as:
```js
window.Snippets.__testExports = { detectTrigger, resolveExpansion };
```
Production code never reads `__testExports`.

## i18n / Localization Patterns

**Supported locales:** `en`, `he`, `de`, `cs`

**Key structure:** Dot-namespaced strings matching feature area:
- `'nav.overview'`, `'session.form.trapped'`, `'photos.usage.body'`

**Translation lookup via `App.t(key)`** (falls back: current lang → English → key itself):
```js
function t(key) {
  const dict = window.I18N || {};
  return (dict[currentLang] && dict[currentLang][key])
      || (dict.en && dict.en[key])
      || key;
}
```

**HTML wiring:** `data-i18n="key"` on elements; `data-i18n-placeholder="key"` on inputs.
`App.applyTranslations()` scans the DOM and fills them.

**Locale files:** `assets/i18n-{locale}.js` each populate `window.I18N.{locale}` as a flat key→string map.
`assets/i18n.js` is a loader stub (sets `window.I18N_DEFAULT = "en"`) — no content.

**RTL support:** `html[dir="rtl"]` toggled at runtime for Hebrew. CSS uses logical properties
(`inset-inline`, `margin-inline-start`) where directional.

**Parity invariant (enforced):** Every key in `i18n-en.js` must exist in all other locale files.
Enforced by `tests/25-11-i18n-parity.test.js`. Czech (`assets/i18n-cs.js`) has known
untranslated stub values marked `// TODO i18n: translate to Czech`.

**Section label overrides:** `App.getSectionLabel(sectionKey, defaultI18nKey)` reads a therapist-
customised label from `_sectionLabelCache` or falls back to `t(defaultI18nKey)`. Custom labels
MUST be rendered via `.textContent` (never `innerHTML`) — stated in JSDoc.

**Snippet locale fallback chain:** `active → en → he → de → cs`, first non-empty value wins.
Implemented in `assets/snippets.js`, tested in `tests/24-04-trigger-regex.test.js`.

## CSS / Design Token Conventions

**Two-layer token architecture in `assets/tokens.css`:**

**Layer 1 — Primitive tokens** (raw values, never used directly in component CSS):
```css
--color-green-600: #2d6a4f;
--color-cream-warm-50: #fdf8f0;
--color-dark-900: #2f2d38;
```

**Layer 2 — Semantic tokens** (reference primitives, used everywhere else):
```css
--color-primary: var(--color-green-600);
--color-background: var(--color-cream-warm-50);
--color-text: var(--color-dark-900);
--shadow-soft: 0 18px 40px rgba(36, 24, 72, 0.08);
```

**Z-index token scale** (defined in `assets/app.css`):
```css
--z-dropdown: 100;
--z-nav: 200;
--z-modal: 300;
--z-modal-top: 350;   /* crop popup inside modal */
--z-popover: 360;     /* snippet autocomplete */
--z-modal-confirm: 370; /* blocking confirm dialog */
--z-toast: 400;
--z-banner: 500;
```

**Dark mode:** `[data-theme="dark"]` on the root element overrides all semantic tokens.
Primitive tokens never change. Dark palette is teal-grey (not dark green).

**Rule:** Never reference a primitive token directly in component CSS — always use a semantic token.

## Error Handling

**Async/await with try/catch** used throughout `assets/db.js`:
```js
try {
  const dbs = await indexedDB.databases();
  ...
} catch (e) {
  // silent fail or fallback
}
```

Functions return `null`/`false` on failure rather than re-throwing. No global error handler.

Re-entry guards on async init functions:
```js
if (_migrationDone || DB_NAME !== "sessions_garden") {
  _migrationDone = true;
  return;
}
_migrationDone = true;
```

## Comment Style

**Section dividers** for logical blocks within a file:
```js
// ---------------------------------------------------------------------------
// i18n — translation and language management
// ---------------------------------------------------------------------------
```

**Phase/plan references** inline: `// Phase 22`, `// Phase 24 Plan 04:`, `// Phase 27`

**Z-index and stacking rationale** comments in CSS explain WHY each layer value is what it is.

**JSDoc** on all public functions: `@param`, `@returns`, and caller safety constraints.
Example from `assets/app.js`:
```js
/**
 * Callers MUST render the result via .textContent or .value (never innerHTML)
 * because customLabel is stored verbatim.
 * @param {string} sectionKey
 * @param {string} defaultI18nKey
 * @returns {string} Resolved label
 */
```

## Code Safety Rules

- Custom label values must never be injected as `innerHTML` (XSS risk)
- Demo mode isolated via `window.name === "demo-mode"` → uses `"demo_portfolio"` IndexedDB, not `"sessions_garden"`
- Module singletons guard re-entry with boolean flags (`_migrationDone`, `_seedingDone`)

---

*Convention analysis: 2026-06-22*
