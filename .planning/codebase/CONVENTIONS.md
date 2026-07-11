---
last_mapped_commit: 85c30eaf0a5c17b108306c2910847006a9e26232
---

# Coding Conventions

**Analysis Date:** 2026-07-07

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
- Test files: `{slug}.test.js` — no phase/plan numbers in the filename, provenance lives in git (forward rule, locked 2026-07-10; see §Comments). The legacy corpus is still phase-numbered (`25-01-sendToMyself-removed.test.js`, `quick-{date}-{id}-{slug}.test.js`) and is renamed only in a later dedicated pass.

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

**No planning IDs in shipped code.** Shipped code carries no planning IDs. Strip every
planning ID to plain prose, keeping the WHY it carried:

- Requirement IDs (`REQ-`, `OBS-`, `VER-`, `RFCT-`, `DOCS-`, `DEMO-`, `PDFX-`, `I18N-`,
  `TEST-`, `DEBT-`, …), decision IDs (`D-NN`), code-review IDs (`CR-NN`), task IDs
  (`T-N-N-N`), phase/plan citations (`Phase 31`, `Plan 04`), and process framing (`UAT`,
  `architect-gate`, `the executor`, `.planning/…` paths) all become plain prose.
- Only the ID/tag leaves; the constraint or rationale it justified stays. A comment that
  existed *only* to name an ID had no reason to exist; a comment that used an ID to
  justify a non-obvious constraint keeps the constraint, worded plainly.
- `git blame` is the durable trace back to the change that introduced a line — that is
  where provenance lives, not in the shipped source.

**Real technical tokens are NOT planning IDs — leave them untouched:** `AES-256`,
`SHA-256`, IndexedDB schema versions (`v1`–`v6`), `IDBDatabase`, HTTP status codes, and
similar domain/technical identifiers are content, not planning provenance.

**Rationale (two, both binding):** (a) `.planning/` is archived per milestone, so an ID
in shipped code becomes a dangling reference — the target no longer exists in the working
tree; (b) `assets/**` ships its comments to the browser, so an internal ID is visible to
any practitioner with DevTools open. Either rationale alone is sufficient; together they
make the rule non-negotiable for shipped code.

**File-top banner shape (4 slots).** Non-trivial modules open with a four-slot banner in
this exact order: **`OWNS`** (what the module owns) · **`PUBLIC SURFACE`** (the `window.*`
it registers + any key handshake) · **`DEPENDENCIES`** (the cross-`window.*` chain it
reads) · **`CONSTRAINTS`** (key invariants). Tiny modules get a concise 1–3 line banner —
do not fabricate empty slots where there is nothing to say. Reference template:
`assets/settings.js` top-of-file. Full Do/Don't wording and worked before/after pairs live
in the archived
`.planning/milestones/v1.2-phases/36-code-comments-batch-2/36-COMMENT-STYLE-GUIDE.md`
(archived history — read it, do not move or promote it out of the archive).

**Constraint notes.** Any zero-build constraint (no `fetch`, no `import`, no
`XMLHttpRequest`) that a line deliberately upholds is called out in plain prose stating
the constraint and why — never by naming a requirement ID.

**Test-file naming.** New test files are `{slug}.test.js` — no phase or plan numbers in
the filename (provenance lives in git). This is forward-looking: the existing
phase-numbered test corpus (`24-04-…`, `30-…`, `quick-260516-…`) is left as-is here and
renamed only in a later dedicated pass; new tests follow the slug rule from now on.


## Help & Changelog Content Convention

`help.html` and `changelog.html` are thin shell pages: all visible copy is delivered
via `data-i18n` keys (e.g. `help.chrome.intro`, `changelog.page.title`) resolved at
runtime from the `i18n-{lang}.js` dictionaries — no inline English fallback text is
treated as authoritative content, it exists only as an offline/no-JS fallback.

`HELP-MAP.md` is the single source of truth mapping each help topic (section +
topic id) to the asset/HTML files it documents. Per the docs hard-gate contract in
`CLAUDE.md`, any change to a file listed in `HELP-MAP.md`'s "Covers" column requires
either a help-topic update or an explicit `Help-Unaffected:` trailer — read
`HELP-MAP.md` cold to find the owning topic; do not scan the full help corpus.

---

*Convention analysis: 2026-07-10 (incremental remap, scope: HELP-MAP.md, changelog.html, help.html)*
