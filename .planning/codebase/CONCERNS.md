# Codebase Concerns

**Analysis Date:** 2026-06-22

---

## Security Concerns

### CSP Uses `unsafe-inline` for Both `script-src` and `style-src`

- **Risk:** `script-src 'unsafe-inline'` nullifies the XSS protection CSP provides. Any successful injection of a `<script>` tag or inline event handler executes freely.
- **Files:** All `*.html` pages set CSP via `<meta http-equiv>` — `index.html:23`, `add-session.html`, `add-client.html`, `reporting.html`, `settings.html`, and all legal/disclaimer pages.
- **Current mitigation:** The app avoids inserting user-controlled data via `innerHTML` in most places (textContent is used for names, notes, etc.). `md-render.js` HTML-escapes before re-injecting markdown.
- **Recommendation:** Move to nonce-based or hash-based CSP to eliminate `unsafe-inline` from `script-src`. This is a medium-effort refactor but high security value given the app handles sensitive clinical data.

### CSP Delivered as `<meta>` Tag, Not HTTP Header

- **Risk:** `<meta>` CSP does not protect navigations or `<base>` injection. HTTP `Content-Security-Policy` headers are stronger.
- **Files:** `_headers` (Cloudflare Pages headers) has no CSP entry; all pages define CSP inline.
- **Fix approach:** Add `Content-Security-Policy` to `_headers` and remove per-page `<meta>` tags.

### License Validation Is Entirely Client-Side

- **Risk:** `isLicensed()` in `assets/license.js:179` checks only whether `portfolioLicenseActivated === '1'` and a non-empty instance ID exist in `localStorage`. Any user who sets these two keys in DevTools bypasses the paywall permanently.
- **Files:** `assets/license.js:179–185`
- **Current mitigation:** Base64 encoding of keys is noted as "cosmetic obfuscation only" (`license.js:148`).
- **Impact:** Revenue loss. The app is a PWA with no server-side data — there is no server to verify against at runtime. The Lemon Squeezy API is only called at initial activation and deactivation (`license.js:211`, `263`).
- **Scaling risk:** As the user base grows, trivially-bypassed licensing becomes a meaningful revenue leak. A periodic re-validation (e.g., weekly re-ping to LS API with graceful offline fallback) would raise the bar significantly.

### License Key Stored in `localStorage` (Base64 Only)

- **Risk:** `localStorage` is readable by any script on the same origin. If an XSS vector is ever introduced, the license key and instance ID are immediately exposed.
- **Files:** `assets/license.js:250–251`
- **Recommendation:** Acceptable risk for current scale, but worth noting alongside the CSP concern above.

### `innerHTML` Used with i18n Translation Strings in `overview.js` and `sessions.js`

- **Risk:** Translated strings are injected via `innerHTML` in `overview.js:456` and `sessions.js:147`. While translation strings are developer-controlled today, this pattern would become an XSS vector if translation strings were ever loaded from a remote source or user-editable.
- **Files:** `assets/overview.js:456`, `assets/sessions.js:147`
- **Fix approach:** Replace with `textContent` for the text node and build SVG icons separately, or use `createElement` + attribute setting.

### `innerHTML` Used for `pricingLegalText` (Landing Page)

- **Risk:** `assets/landing.js:477` injects `t.pricingLegalText` via `innerHTML`. This string contains raw `<a>` tags and is developer-controlled. The pattern is safe today but fragile — if a non-developer ever edits translation content, HTML injection is trivial.
- **Files:** `assets/landing.js:477`, `assets/i18n-en.js`, `assets/i18n-he.js`, `assets/i18n-de.js`, `assets/i18n-cs.js`

---

## i18n / l10n Gaps

### German (`de`) and Czech (`cs`) Translations Incomplete — 13 Keys Each

- **Issue:** 13 translation keys in `assets/i18n-de.js` and `assets/i18n-cs.js` have English fallback values with `// TODO i18n: translate to German/Czech` comments.
- **Affected keys (both files):** `settings.saved.notice`, `settings.saved.dismiss`, export modal stepper labels (`export.stepper.label.1/2/3`), export step helpers (`export.step1.helper`, `export.step2.helper`, `export.step3.helper`), and markdown formatting tips (`export.format.help.*`).
- **Files:** `assets/i18n-de.js:419–447`, `assets/i18n-cs.js:419–447`
- **Impact:** DE and CS users see English strings in the export modal flow — a core workflow.
- **Priority:** High — export is a key feature, not a settings edge case.

### No RTL Regression Guard for Non-Hebrew Locales

- **Issue:** The app has explicit RTL support for Hebrew (via `dir="rtl"` on `<html>`). No automated test guards against accidentally applying RTL to DE/CS/EN locales.

---

## Technical Debt

### `settings.js` Is a 2,827-Line God Module

- **Issue:** `assets/settings.js` contains 182 named functions covering section settings, snippet management, photo optimization, storage usage display, and more.
- **Files:** `assets/settings.js`
- **Impact:** High coupling, slow to navigate, difficult to unit-test in isolation. Adding any new settings feature requires reading the entire file.
- **Fix approach:** Extract `SnippetEditor`, `PhotoManager`, and `StorageUsage` into separate JS modules. The IIFE pattern already used in other files (`assets/backup.js`, `assets/md-render.js`) supports this without a bundler.

### `add-session.js` Is a 2,173-Line Monolith

- **Issue:** Session form, issue management, export modal (3-step stepper), markdown preview, and tag/trigger logic all live in one file.
- **Files:** `assets/add-session.js`
- **Fix approach:** The export modal (approximately lines 1200–1500) is a clear extraction candidate into `assets/export-modal.js`.

### No Build Step — All JS Served Raw

- **Issue:** Every JS file is served as-is with no bundling, minification, or tree-shaking. The total uncompressed JS payload is ~18,000 lines across 20+ files.
- **Files:** All `assets/*.js` except `assets/jspdf.min.js` and `assets/bidi.min.js`
- **Impact:** Slower first load on slow connections. No dead-code elimination. No module system — all globals.
- **Scaling risk:** Adding more features worsens load time linearly. Introducing a bundler would enable code-splitting, proper modules, and minification.

### Global Namespace Pollution — All Modules Are Browser Globals

- **Issue:** `App`, `PortfolioDB`, `BackupManager`, `MdRender`, `LicenseManager`, `CropModule`, `SnippetsModule` are all `window.*` globals. There is no import/export system.
- **Files:** All `assets/*.js`
- **Impact:** Risk of naming collisions; hard to test in isolation without careful mock setup; order of `<script>` tags in HTML is load-order-sensitive.

### Service Worker Cache Version Requires Manual Bump

- **Issue:** `sw.js:12` hardcodes `CACHE_NAME = 'sessions-garden-v210'`. A manual bump is required on every deploy that changes a precached asset.
- **Files:** `sw.js:12`
- **Current mitigation:** A pre-commit hook is documented to skip the bump when `sw.js` is already in the diff (see `memory/reference-pre-commit-sw-bump.md`), meaning edits to precached assets without touching `sw.js` can silently serve stale files to installed PWA users.
- **Fix approach:** Generate `CACHE_NAME` from a content hash at deploy time using a simple build script.

### Backup Import Has No Maximum File-Size Guard

- **Issue:** `assets/backup.js` reads the entire imported ZIP into memory via `FileReader` with no size cap. A maliciously crafted or accidentally huge file would exhaust browser memory.
- **Files:** `assets/backup.js`
- **Fix approach:** Add a `file.size > MAX_BYTES` check before `readAsArrayBuffer`.

### `openDB()` Called on Every DB Operation — No Connection Pooling

- **Issue:** `assets/db.js:272` opens a new `indexedDB.open()` call on every invocation (64+ call sites across the codebase). Although IDB internally reuses the connection, the promise overhead and migration checks run on every call.
- **Files:** `assets/db.js:272`
- **Fix approach:** Cache the resolved `IDBDatabase` instance in a module-level variable and return it on subsequent calls.

### `var` Used Throughout Older Modules

- **Issue:** `assets/backup.js`, `assets/disclaimer.js`, `assets/license.js`, `assets/overview.js`, `assets/sessions.js` use `var` throughout. Newer modules (`assets/app.js`, `assets/add-session.js`) use `const`/`let`.
- **Impact:** Not a bug today, but `var` hoisting makes accidental variable reuse invisible and refactoring harder.

### `jspdf.min.js` Is a Vendored Bundle Without a Recorded Version

- **Issue:** `assets/jspdf.min.js` is a local copy with no `package.json` entry and no version comment other than the copyright year. No automated dependency-update path exists.
- **Files:** `assets/jspdf.min.js`
- **Impact:** Security patches and bug fixes in jsPDF are not tracked or applied.

---

## Performance Risks

### No Pagination on Sessions or Clients Tables

- **Issue:** `assets/sessions.js` and `assets/overview.js` render all records into a DOM table on every load. No virtual scrolling or pagination exists.
- **Files:** `assets/sessions.js:79`, `assets/overview.js:355`
- **Scaling risk:** A therapist with 5+ years of weekly sessions (~260 clients, ~2,600 sessions) will see noticeable render lag. At 10,000 rows the table becomes unusable.
- **Fix approach:** Add client-side pagination (25 rows/page) or a virtual scroll implementation.

### PDF Export Runs on the Main Thread

- **Issue:** `assets/pdf-export.js` (1,198 lines) uses jsPDF synchronously on the main UI thread. Large exports with RTL bidi processing will block the UI for seconds.
- **Files:** `assets/pdf-export.js`, `assets/jspdf.min.js`
- **Fix approach:** Move PDF generation to a Web Worker.

### Photo Optimization Loop Is Sequential

- **Issue:** `assets/settings.js:2370` (`_optimizeAllPhotosLoop`) iterates all client photos sequentially with `await` per photo. For 50+ clients with photos, this can take tens of seconds and holds the settings page in a "loading" state.
- **Files:** `assets/settings.js:2370`
- **Fix approach:** Process photos in bounded parallel batches (e.g., 4 concurrent).

### `_headers` Cache TTL for JS/CSS Is Only 1 Hour

- **Issue:** `assets/*.js` and `assets/*.css` are served with `Cache-Control: public, max-age=3600`. For a PWA that handles its own cache invalidation via the SW, this is unnecessarily short — it causes redundant CDN revalidation every hour.
- **Files:** `_headers`
- **Fix approach:** Increase to `max-age=86400` or longer with the SW still owning freshness for installed users.

---

## Accessibility Gaps

### Dynamic Table Rows Have No `aria-rowindex` or Row Count

- **Issue:** Sessions and overview tables are rendered entirely in JS with no `aria-rowcount` on `<table>` and no `aria-rowindex` on rows. Screen readers cannot announce "row 5 of 47".
- **Files:** `assets/sessions.js:79`, `assets/overview.js:355`

### Export Modal Stepper Has No `aria-current="step"` Indicator

- **Issue:** The 3-step export stepper has no ARIA step indicator. Screen reader users cannot determine which step is active.
- **Files:** `add-session.html`, `assets/add-session.js` (stepper rendering section)

### Toast Notifications in Demo Mode Untested with Assistive Technology

- **Issue:** Demo mode suppresses certain toast behaviors. No audit has verified that `aria-live="polite"` announcements function correctly in demo mode.
- **Files:** `assets/app.js:272`, `assets/demo-hints.js`

---

## Error Handling Gaps

### ~53 Silent `catch` Blocks Swallow Errors Without Logging

- **Issue:** Across all JS files there are approximately 53 `catch (_)` or `catch (e) { /* ignore */ }` blocks. While most wrap localStorage or optional UI operations, failures in these paths are invisible in production — there is no error telemetry.
- **Files:** `assets/app.js:109,442,461,527,547,674,977`, `assets/backup-modal.js`, `assets/license.js`, and others.
- **Fix approach:** For non-trivial catch paths, add at minimum `console.warn` with a tag prefix so support can diagnose issues from user-shared console screenshots.

### No Error Telemetry / Crash Reporting

- **Issue:** No Sentry, Rollbar, or equivalent is integrated. Uncaught exceptions and IDB failures are invisible after deployment.
- **Impact:** Production bugs affecting a small percentage of users (e.g., specific browser IDB quirks, Safari PWA storage eviction) go undetected until a user reports them.
- **Fix approach:** Add a lightweight `window.addEventListener('unhandledrejection', ...)` + `window.onerror` handler that persists the last N errors to IDB for a "report a problem" copy-to-clipboard flow — no external service required.

### IDB Migration Failure Has No Recovery Escape Hatch

- **Issue:** `assets/db.js:149` catches migration failures and shows a "please refresh" banner. If the migration genuinely fails (e.g., corrupted old DB), refreshing will loop indefinitely. There is no "reset and start fresh" escape hatch from this state.
- **Files:** `assets/db.js:149`, `assets/db.js:409–420`

---

## Known TODOs in Code

| File | Lines | Description |
|---|---|---|
| `assets/i18n-de.js` | 419–447 | 13 strings not yet translated to German |
| `assets/i18n-cs.js` | 419–447 | 13 strings not yet translated to Czech |
| `assets/overview.js` | 463 | Severity render D-25 verification noted as reported 2026-05-13 (informational comment) |

---

## Scaling Limits

### No Multi-Device Sync

- **Current state:** Data lives exclusively in IndexedDB on the device where the app is installed. Backup/restore is the only data-transfer mechanism.
- **Limit:** Therapists who switch devices or use multiple devices cannot access their data across devices.
- **Scaling path:** A cloud sync layer with end-to-end encryption using the existing AES-GCM key infrastructure would require significant architecture addition (backend + auth).

### IndexedDB Has No Record Count Caps

- **Current capacity:** Unlimited clients and sessions.
- **Limit:** UI tables degrade severely beyond ~500 sessions (no pagination). PDF export of large histories may hit browser memory limits.
- **Scaling path:** Add table pagination; implement export chunking.

---

## Hard-Coded Values That Should Be Config

| Value | Location | Status |
|---|---|---|
| `'sessions-garden-v210'` (SW cache name) | `sw.js:12` | Should be auto-generated from deploy hash |
| Checkout URL (Lemon Squeezy) | `assets/landing.js:4` | Named constant, acceptable; undocumented if changed |
| `max-age=3600` for JS/CSS | `_headers` | Too short; should be `86400`+ |

---

*Concerns audit: 2026-06-22*
