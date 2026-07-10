---
last_mapped_commit: 85c30eaf0a5c17b108306c2910847006a9e26232
---

# Codebase Concerns

**Analysis Date:** 2026-07-07

## Tech Debt

**Incomplete i18n translations (Czech and German):**
- Issue: 26 string keys carry `// TODO i18n: translate to Czech` / `// TODO i18n: translate to German` comments. Affected keys are in the export-modal section (section selector, delivery method copy, expanded label variants). The app falls back to the English string, so users get mixed-language UI in those flows.
- Files: `assets/i18n-cs.js` (lines 445–472), `assets/i18n-de.js` (lines 445–472)
- Impact: Czech and German therapists see English text in export/delivery UI steps.
- Fix approach: Translate the 13 flagged keys in each file; grep gate `// TODO i18n` to zero.

**License enforcement is client-side only:**
- Issue: The `isLicensed()` check reads `portfolioLicenseActivated === '1'` and a Base64-decoded instance ID from `localStorage`. The encoding is `btoa`/`atob` — explicitly documented as "cosmetic obfuscation" (license.js line 149). A technically aware user can set the key in DevTools and bypass the gate entirely. Real enforcement relies on Lemon Squeezy's 2-device activation limit, which only fires when the user tries to activate on a third device.
- Files: `assets/license.js` (lines 148–182), `assets/app.js` (line 1103), `assets/shared-chrome.js` (line 23)
- Impact: No revenue leakage at scale (app data is local only, there is nothing server-side to protect), but a deliberate bypass takes ~10 seconds via DevTools. Acceptable trade-off for an offline-first PWA, but should be a known constraint for any future monetization changes.
- Fix approach: No perfect fix for a fully offline client-side app. Periodic re-validation against the Lemon Squeezy API on app open (already possible — the instance ID is stored) would raise the bar.

**`window.name` as demo-mode trigger:**
- Issue: The entire app switches to a separate IndexedDB database (`demo_portfolio`) based on `window.name === 'demo-mode'`. `window.name` persists across navigations within a tab and can be set by a referring page. Any external site can open the app in a named window and land in demo mode.
- Files: `assets/db.js` (line 2), `assets/app.js` (line 264), `assets/backup-modal.js` (line 295), `assets/demo-seed.js` (line 8), `assets/demo.js` (line 8)
- Impact: Low severity — demo mode writes to a separate DB, it cannot access real user data. The concern is that a confused user in demo mode could think their real data is gone.
- Fix approach: Use a URL query param (`?demo=1`) instead of `window.name`, or validate that the referrer is the landing page before accepting `window.name`.

**God-module file sizes:**
- Issue: Three files each exceed 1,300 lines with 40–57 functions each, handling multiple responsibilities that have grown over 31+ phases. No bundler or module system — all globals.
  - `assets/backup.js`: 1,575 lines, 57 functions (encryption, key derivation, ZIP, import, export, UI modals, scheduling)
  - `assets/add-session.js`: 1,518 lines, 40 functions (session form, section rendering, snippet expansion, PDF trigger)
  - `assets/settings-snippets.js`: 1,329 lines (snippet CRUD, tag UI, import/export, seeding UI)
- Impact: Hard to test (tests use complex stubs), harder to refactor safely. Phase 31 explicitly documented that test shape coupling to god-module structure caused failures (`reference-test-shape-coupling-extractions.md`).
- Fix approach: Extract sub-concerns into separate files per the Phase 31 RFCT pattern; add per-mechanism grep gates so extraction regressions are caught.

**No build pipeline / all globals:**
- Issue: Every JS file is a plain `<script>` with module-level IIFEs exposing a global (`window.PortfolioDB`, `window.App`, `window.BackupManager`, etc.). Load order is enforced by `<script>` tag ordering in HTML. No bundler, no tree-shaking, no dead-code elimination.
- Files: All `assets/*.js`, all `*.html` files
- Impact: Adding a new page requires manually ensuring correct script-tag order. A misplaced tag causes silent runtime failures (undefined global). Already seen: `snippets-seed.js` must load before `db.js`.
- Fix approach: Medium-term — adopt a bundler (Vite/esbuild) or native ES modules. Short-term — document the load-order contract in ARCHITECTURE.md.

**Pre-commit hook skips CACHE_NAME bump:**
- Issue: The pre-commit hook does not bump `CACHE_NAME` when `sw.js` is in the diff. `PRECACHE_URLS` edits need a manual follow-up chore commit (documented in `memory/reference-pre-commit-sw-bump.md`).
- Files: `sw.js`, `assets/version.js`
- Impact: Easy to forget, leading to stale SW caches that silently serve old assets after deploy.
- Fix approach: Update the pre-commit hook to detect `PRECACHE_URLS` edits in `sw.js` and trigger a version bump automatically.

## Security Considerations

**`'unsafe-inline'` in Content-Security-Policy:**
- Risk: The deployed CSP (`_headers`) allows `script-src 'self' 'unsafe-inline'` and `style-src 'self' 'unsafe-inline'`. This makes the CSP XSS protection largely ineffective — any injected inline script would execute.
- Files: `_headers` (line 2)
- Current mitigation: The app carefully uses `.textContent` for user-controlled data in most places. `innerHTML` is used for static SVG literals and hardcoded i18n strings, not user data. `MdRender` HTML-escapes before applying structural rules.
- Recommendations: Move inline SVGs to external files or use a nonce-based CSP to allow specific inline blocks. The landing page `legalEl.innerHTML = t.pricingLegalText` is safe (hardcoded strings only), but the pattern is one copy-paste accident away from a vulnerability.

**`disclaimer.js` innerHTML with i18n data:**
- Risk: `assets/disclaimer.js` line 86 does `els.sections.innerHTML = html` where `html` is assembled from `escapeHtml(section.title)` and `escapeHtml(p)`. Escaping is in place but relies on the `escapeHtml` function being called correctly at every interpolation point.
- Files: `assets/disclaimer.js` (line 86)
- Current mitigation: `escapeHtml` is called on every user-facing string insertion. The data source is the i18n bundle (hardcoded at deploy time), not user input.
- Recommendations: Low immediate risk. Document as an invariant to maintain when extending the disclaimer renderer.

**License key stored in `localStorage`:**
- Risk: License key, instance ID, and activation flag are stored in `localStorage` as Base64 strings. `localStorage` is accessible to any same-origin JavaScript including browser extensions. A malicious extension could exfiltrate the Lemon Squeezy instance ID.
- Files: `assets/license.js` (lines 250–252)
- Current mitigation: The instance ID is only useful for deactivating the license via LS API. The attacker would need LS API access. No payment data is stored.
- Recommendations: Low priority given offline-first architecture. Document the known limitation.

## Performance Bottlenecks

**Photo storage size in IndexedDB:**
- Problem: Client photos are stored as base64 data URLs directly in the `clients` object store. `estimatePhotosBytes` in `assets/db.js` shows the team is aware of size. A therapist with many clients each with a high-res photo can hit hundreds of MB in IndexedDB.
- Files: `assets/db.js` (lines 675–689), `assets/settings-photos.js`, `assets/crop.js`
- Cause: No streaming or chunked storage — entire base64 string is held in memory when `getAllClients()` is called on every page render.
- Improvement path: A bulk-optimize flow exists (`settings-photos.js`). The remaining gap is loading all clients eagerly; lazy-load photos only when the photo is rendered.

**`getAllClients()` and `getAllSessions()` called on every page render:**
- Problem: Every page (sessions, overview, add-session, reporting) calls `getAllClients()` or `getAllSessions()` at init, loading the full dataset. For a therapist with thousands of sessions and large photo data, this scan grows with usage.
- Files: `assets/sessions.js`, `assets/overview.js`, `assets/reporting.js`, `assets/add-session.js`
- Cause: No pagination, no lazy loading, no cursor-based iteration.
- Improvement path: Use IDB indexes (already present: `clientId`, `date`) to page or filter at the DB layer rather than loading all records and filtering in JS.

## Fragile Areas

**`_dbPromise` connection pool invalidation:**
- Files: `assets/db.js` (lines 16, 88–90, 152–157, 354–358, 373–376, 748–752)
- Why fragile: The pool has exactly three null-out sites and one `undefined` reset site. Missing any of them causes the next `openDB()` call to return a closed handle, causing silent failures on any IDB operation. Phase 31 CR-01 was exactly this bug (the migration close path missed a null-out). The correctness contract is entirely in the comments, not enforced structurally.
- Safe modification: Every code path that calls `db.close()` must immediately precede the close with `_dbPromise = null`. Any new `openDB()` recursive call (like `migrateOldDB`) must also null-out after closing. Add a test for each new null-out path.
- Test coverage: `tests/31-openDB-pooling.test.js` (559 lines) covers the known paths.

**Script load order dependency:**
- Files: All `*.html` pages
- Why fragile: `snippets-seed.js` must load before `db.js`; `app.js` must load before page-specific scripts. There is no enforcement mechanism — a misplaced `<script>` tag produces a runtime `TypeError: window.X is not a function` that is hard to trace.
- Safe modification: When adding a new JS file, trace all globals it reads and confirm those scripts appear earlier in the same HTML file's `<script>` tags.
- Test coverage: Not tested. The test suite uses jsdom stubs that do not reproduce load-order failures.

**HELP-MAP.md is a manually maintained index with no automated sync check:**
- Files: `HELP-MAP.md`, `help.html`, `assets/help-content-*.js`, `assets/help.js`, `scripts/lib/role-table.js`
- Why fragile: `HELP-MAP.md` maps each help topic to the source files it "covers," and the docs-gate (`scripts/lib/role-table.js`) tells contributors to read this file cold to find which help topic owns a changed file — but nothing verifies the map itself stays accurate. A file renamed, split, or newly added under `assets/` has no automatic check that it appears in the right `HELP-MAP.md` row (or a new row exists for it) before the gate is trusted. The map's correctness is entirely a human-maintenance contract.
- Safe modification: When adding/renaming a file that has product-facing behavior, update the corresponding `HELP-MAP.md` row (or add a new topic row) in the same commit as the code change, and add/adjust the matching key in `assets/help-content-en.js` (and other locales) so the docs-gate's "Help-Unaffected" reasoning stays truthful.
- Test coverage: Not tested. No gate cross-checks `HELP-MAP.md` rows against actual files under `assets/` or against the help-content corpus keys.

**Script load order in `help.html` and `changelog.html` is unusually deep and comment-dependent:**
- Files: `help.html` (lines 122–160), `changelog.html` (lines 72–104)
- Why fragile: Both pages carry a long, precisely ordered `<script>` chain — i18n bundles, `db.js`, `crashlog.js`, `attention-coordinator.js`, then per-page `changelog-content-*.js` / `help-content-*.js` data globals, then `whats-new.js`, then `app.js` (which calls `AttentionCoordinator.run`), then the backup trio, then the page's own renderer (`help.js` / `changelog.js`) last. The correctness of "data corpus before popup surface before `app.js`'s coordinator run before the page renderer" is documented only in inline HTML comments (e.g. help.html lines 134–138, changelog.html lines 91–95), not enforced by any test or lint rule. A future edit that reorders these tags (e.g. moving `help.js` earlier, or moving `whats-new.js` after `app.js`) would silently break the What's New popup or leave `#helpCards`/`#changelogEntries` empty, with no test catching it — consistent with the general "Script load order dependency" fragility already noted above, but this pair of pages has the deepest and most comment-reliant ordering contract in the app.
- Safe modification: Preserve the existing script order when editing either page; if inserting a new script, read the adjacent HTML comments first to find which ordering constraint would be violated. Treat any `whats-new.js` / `changelog-content-*.js` / `help-content-*.js` reorder as requiring a manual smoke test of the What's New popup and the help/changelog page render, since no automated test covers this chain.
- Test coverage: Not tested (same gap as the general script-load-order fragility above; this is the sharpest instance of it).

**`withStore` returns the IDBRequest result, not the resolved value:**
- Files: `assets/db.js` (lines 617–626)
- Why fragile: `withStore` resolves with the return value of `callback(store)` — which for `store.put()` / `store.delete()` is an `IDBRequest` object, not the actual key or `undefined`. Callers that discard the resolved value (most do) are fine, but any caller that relies on the resolved value to get the newly assigned key would get an IDBRequest, not a number.
- Safe modification: Use `addRecord` (which properly wires `request.onsuccess`) for writes where the auto-assigned key matters; use `withStore` only for fire-and-forget writes.
- Test coverage: Tested indirectly via roundtrip tests, but the withStore return value contract is not explicitly tested.

## Scaling Limits

**IndexedDB storage per origin:**
- Current capacity: Browser-controlled; Chrome typically allows up to ~60% of available disk for a single origin. No server-side storage.
- Limit: Therapists with large photo sets can exhaust browser storage. `navigator.storage.persist()` is requested (see `assets/app.js`) to reduce eviction risk.
- Scaling path: Client-side only app — no server to offload to. The existing bulk-optimize flow is the primary mitigation.

**Single-tenant, single-device architecture:**
- Current capacity: One therapist, one browser. Data is not shared across devices — backup export/import is the only sync mechanism.
- Limit: A therapist who switches devices loses their data unless they remembered to export a backup.
- Scaling path: Would require a server-side sync layer (out of scope for the current PWA-offline model).

## Dependencies at Risk

**`jspdf.min.js` vendored locally:**
- Risk: `assets/jspdf.min.js` is a vendored copy with no version pin visible in `package.json` (which has only `jsdom` as a dev dependency). Security fixes in jsPDF are not automatically picked up.
- Impact: PDF export is a core feature. A jsPDF vulnerability would require a manual re-vendor.
- Migration plan: Pin the jsPDF version in `package.json` as a devDependency and add a copy step, or reference the CDN version with subresource integrity.

**`jszip.min.js` vendored locally:**
- Risk: Same pattern as jsPDF — vendored without a `package.json` reference. JSZip is used for backup ZIP creation and extraction.
- Impact: Backup import/export would be affected by a JSZip vulnerability.
- Migration plan: Same as jsPDF — pin in `package.json` and add a build copy step.

**`bidi.min.js` vendored locally:**
- Risk: Vendored BiDi library for RTL text rendering in PDFs. No version reference.
- Impact: Hebrew RTL export would be affected.
- Migration plan: Same pattern as above.

## Missing Critical Features

**No automated re-validation of license after activation:**
- Problem: `isLicensed()` only checks `localStorage` after initial activation. If a user's license is revoked by Lemon Squeezy (chargeback, fraud), the app continues to function indefinitely.
- Blocks: Enforcement of subscription or usage policy changes.

**No cross-device sync:**
- Problem: All data lives in the local browser's IndexedDB. There is no mechanism to sync between a therapist's laptop and phone.
- Blocks: Multi-device workflows. The backup export/import flow is manual.

## Test Coverage Gaps

**Load-order / global availability not tested:**
- What's not tested: Whether each HTML page loads its `<script>` tags in the correct order. The test suite mocks all globals via `tests/_helpers/`, so a missing or misplaced `<script>` tag on a real page would not be caught by any test.
- Files: All `*.html` pages
- Risk: A new page or a refactored script tag order could silently break a production page.
- Priority: Medium

**License bypass / enforcement not tested:**
- What's not tested: The `isLicensed()` localStorage-check path and any page-level gate that redirects to `license.html`. No test confirms the gate fires when `portfolioLicenseActivated` is absent.
- Files: `assets/license.js`, `assets/app.js` (line 1103), `assets/shared-chrome.js` (line 23)
- Risk: A refactor to `isLicensed()` could silently remove the gate.
- Priority: Medium

**Integration between pages (navigation flows) not tested:**
- What's not tested: The redirect chain after save (`add-session.js` → `sessions.html`), the back-to-app redirect after license activation, and the demo→live-mode switch.
- Files: Multiple page controllers
- Risk: Cross-page state bugs (e.g., wrong redirect URL, missing query params) are invisible to unit tests.
- Priority: Low (manual UAT catches these, but regression risk grows with scale)

**PDF rendering in real browsers not tested:**
- What's not tested: The `jsdom-pdf-env.js` helper stubs the canvas/font environment. RTL bidi rendering, glyph coverage, and font loading are verified against a simulated environment only.
- Files: `tests/pdf-bidi.test.js`, `tests/pdf-glyph-coverage.test.js`, `assets/pdf-export.js`
- Risk: A font or jsPDF update could silently break Hebrew or Latin PDF output in a real browser.
- Priority: Medium

---

*Concerns audit: 2026-07-07*
