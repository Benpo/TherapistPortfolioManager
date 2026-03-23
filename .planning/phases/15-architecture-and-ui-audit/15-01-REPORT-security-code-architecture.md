# Security, Code Quality, and Architecture Audit Report

**Audited:** 2026-03-23
**Scope:** All JS (16 files), CSS (5 files), HTML (10 files), manifest.json, sw.js
**Methodology:** Full source-code read of every file listed in plan scope

## Summary Table

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH     | 4 |
| MEDIUM   | 8 |
| LOW      | 10 |

| Section | Findings |
|---------|----------|
| Security | 7 |
| Dead Code and Unused Assets | 7 |
| Architecture and Code Consistency | 8 |

---

## Security

### [HIGH] No Content-Security-Policy on any HTML page
**File:** index.html:1, landing.html:1, license.html:1, disclaimer.html:1, impressum.html:1, datenschutz.html:1, demo.html:1, add-client.html:1, add-session.html:1, sessions.html:1, reporting.html:1
**Description:** No `<meta http-equiv="Content-Security-Policy">` tag exists in any HTML file. This means the browser applies no CSP restrictions whatsoever.
**Impact:** Without CSP, the app is more vulnerable to XSS attacks if any user-supplied content is injected into the DOM. While the app is local-only and does not load remote scripts, CSP would provide defense-in-depth against injection attacks (e.g., via a crafted backup import).
**Recommendation:** Add a CSP meta tag to all HTML files. Suggested policy: `default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.lemonsqueezy.com; font-src 'self'`. The `unsafe-inline` for script is needed because several pages use inline `<script>` blocks for theme/gate checks.

### [HIGH] License key stored in plaintext in localStorage
**File:** assets/license.js:183
**Description:** `localStorage.setItem('portfolioLicenseKey', key)` stores the raw license key in localStorage without any obfuscation or encryption. The instance ID is also stored in plaintext at line 184.
**Impact:** Anyone with physical access to the device can read the license key from browser DevTools and reuse it on another device. Since the license has a 2-device limit, this could enable unauthorized sharing. Also, exported backup manifests could theoretically contain license info if backup logic were extended.
**Recommendation:** This is a known tradeoff in local-only apps. Consider basic obfuscation (e.g., XOR with a device-derived salt) to raise the effort required for casual extraction. Full protection is impossible in a client-side app, but obfuscation deters casual copying.

### [HIGH] postMessage without origin validation in demo.js
**File:** assets/demo.js:11
**Description:** `window.addEventListener('message', function(event) { ... })` accepts messages from any origin. No `event.origin` check is performed. The handler calls `App.setLanguage(lang)` which modifies DOM and localStorage.
**Impact:** Any page that embeds or references the demo page can send `demo-lang` messages to change the app language and write to localStorage. Since the demo runs in an iframe on the landing page (same origin), the risk is low in practice, but the missing origin check is a security anti-pattern.
**Recommendation:** Add origin validation: `if (event.origin !== window.location.origin) return;` at the top of the message handler.

### [HIGH] postMessage sent with wildcard origin from landing.js
**File:** assets/landing.js:491, assets/landing.js:603
**Description:** `demoIframe.contentWindow.postMessage({ type: 'demo-lang', lang: lang }, '*')` uses `'*'` as the target origin instead of an explicit origin.
**Impact:** The wildcard allows the message to be received by any page loaded in the iframe, regardless of origin. Combined with the missing origin check in demo.js, this creates a bidirectional trust gap.
**Recommendation:** Replace `'*'` with the actual origin (e.g., `window.location.origin`).

### [MEDIUM] innerHTML with escapeHtml in disclaimer.js
**File:** assets/disclaimer.js:79
**Description:** `els.sections.innerHTML = html` assigns HTML content built from user-visible i18n strings. The strings pass through `escapeHtml()` (line 75-76) which properly escapes `<`, `>`, `&`, `"`, `'`.
**Impact:** Currently safe because all input goes through escapeHtml. No user-supplied data is injected here. However, if i18n strings were ever loaded from an external source or user input, this would become an XSS vector.
**Recommendation:** No action needed currently. This is a safe pattern. Document that escapeHtml must always be applied when building section HTML.

### [MEDIUM] innerHTML with static SVG in overview.js and globe-lang.js
**File:** assets/overview.js:351, assets/globe-lang.js:27
**Description:** Static SVG markup is assigned via innerHTML. The content is hardcoded strings, not user input.
**Impact:** No security risk. The SVG content is fully controlled by the developer.
**Recommendation:** No action needed. This is acceptable usage of innerHTML with static content.

### [LOW] Lemon Squeezy API call (expected external call)
**File:** assets/license.js:144
**Description:** `fetch('https://api.lemonsqueezy.com/v1/licenses/activate', ...)` is the only external network call in the entire codebase. This is the expected license activation flow documented in the architecture.
**Impact:** This call is by design and only happens during initial license activation (requires internet). After activation, `isLicensed()` is a pure localStorage check with no network call. The `demo-seed.js:23` fetch is a local same-origin call to `./assets/demo-seed-data.json`.
**Recommendation:** Document in the deployment guide that the Lemon Squeezy API call is the only external network dependency. The CSP `connect-src` directive should whitelist `https://api.lemonsqueezy.com`.

---

## Dead Code and Unused Assets

### [MEDIUM] `portfolioLanguage` vs `portfolioLang` key mismatch in backup.js
**File:** assets/backup.js:145, assets/backup.js:280
**Description:** `exportBackup()` reads `localStorage.getItem("portfolioLanguage")` and `importBackup()` writes `localStorage.setItem("portfolioLanguage", ...)`. But the entire rest of the codebase uses `portfolioLang` (set in app.js:26, read in app.js:117, overview.js:32, disclaimer.js:23, etc.). The key `portfolioLanguage` is never read by any other code.
**Impact:** Language preference is never correctly saved/restored during backup export/import. The backup manifest will always contain `null` for the language setting, and importing will set a key that no code reads.
**Recommendation:** Change both occurrences in backup.js to use `portfolioLang` instead of `portfolioLanguage`. This is a bug (Rule 1 finding).

### [MEDIUM] Duplicate `formatSessionType()` function in 3 files
**File:** assets/overview.js:228, assets/sessions.js:38, assets/add-session.js:584
**Description:** The same `formatSessionType()` function is defined independently in three different files. All three have identical logic mapping session type values to translated strings via `App.t()`.
**Impact:** Any change to session type handling must be made in three places. This is a maintenance burden and a source of inconsistency bugs.
**Recommendation:** Move `formatSessionType()` to app.js and expose it via the `window.App` API.

### [MEDIUM] Duplicate `readFileAsDataURL()` function in 2 files
**File:** assets/add-client.js:431, assets/add-session.js:1081
**Description:** Identical `readFileAsDataURL(file)` function defined as a global in both files.
**Impact:** Code duplication. Changes to file reading logic must be mirrored in both places.
**Recommendation:** Move to app.js or a shared utility.

### [MEDIUM] Duplicate `setSubmitLabel()` function in 2 files
**File:** assets/add-client.js:237, assets/add-session.js:81
**Description:** Nearly identical function for updating submit button labels in both form pages.
**Impact:** Minor duplication. Both are scoped within their DOMContentLoaded handlers so no conflict, but logic is repeated.
**Recommendation:** Could be shared via app.js, but low priority given the simplicity.

### [LOW] SW cache references `Rubik-Variable.woff2` but actual files are different
**File:** sw.js:51
**Description:** The SW precache list includes `/assets/fonts/Rubik-Variable.woff2` but the actual fonts directory contains `Rubik-Regular.woff2`, `Rubik-SemiBold.woff2`, and `Rubik-Bold.woff2` (three separate files, not one variable font file).
**Impact:** The SW will fail to cache the font (404), and the actual font files will not be precached. This means fonts may not work offline on first visit, though the SW's cache-on-network-response fallback will eventually cache them when loaded normally.
**Recommendation:** Replace the single `Rubik-Variable.woff2` entry with the three actual font files: `/assets/fonts/Rubik-Regular.woff2`, `/assets/fonts/Rubik-SemiBold.woff2`, `/assets/fonts/Rubik-Bold.woff2`.

### [LOW] SW cache does not include logo.png or illustration assets
**File:** sw.js:19-62
**Description:** The precache list does not include `/assets/logo.png`, any files from `/assets/illustrations/`, or `/assets/icons/icon-192.png` and `/assets/icons/icon-512.png`. The illustrations are used in index.html (botanical dividers) and in landing.html (feature icons, hero image).
**Impact:** Botanical illustrations and the logo will not be available offline on first visit. They will be cached by the SW's fetch handler on subsequent visits. PWA icons are typically handled by the browser manifest flow, not the SW cache.
**Recommendation:** Add `/assets/logo.png` and critical illustration assets to the precache list for reliable offline support. Landing page assets are less critical (landing does not need to work offline per D-09).

### [LOW] i18n key `overview.table.details` likely unused
**File:** assets/i18n-en.js (key: `overview.table.details`)
**Description:** The key `"overview.table.details": "Details"` is defined in the i18n files but the overview table no longer has a "Details" text column. The detail button now uses an SVG clock icon (overview.js:351) with `overview.table.previousSessions` as the tooltip/aria-label.
**Impact:** Dead i18n key. Does not cause any bug but adds unused translation burden.
**Recommendation:** Remove `overview.table.details` and `overview.table.addSession` from all 4 language files if confirmed unused. Confidence: LIKELY (the key is defined but grep shows no `data-i18n="overview.table.details"` in any HTML or JS file).

---

## Architecture and Code Consistency

### [MEDIUM] Inconsistent `new Promise(async ...)` anti-pattern in db.js
**File:** assets/db.js:229, assets/db.js:248, assets/db.js:259, assets/db.js:269, assets/db.js:293, assets/db.js:313
**Description:** Several DB functions use `new Promise(async (resolve, reject) => { const db = await openDB(); ... })`. The `async` executor is an anti-pattern because if `openDB()` rejects, the rejection is unhandled inside the Promise constructor (the async function's implicit try/catch does not propagate to the outer Promise's reject).
**Impact:** If `openDB()` fails (e.g., IndexedDB blocked), the error will be an unhandled promise rejection rather than properly rejecting the returned promise. The `withStore()` function (line 217) demonstrates the correct pattern.
**Recommendation:** Refactor all DB access functions to use the `withStore()` pattern or simply make them `async function` without wrapping in `new Promise`.

### [MEDIUM] Demo mode bypasses terms and license gates via localStorage manipulation
**File:** demo.html:8-9
**Description:** `localStorage.setItem('portfolioTermsAccepted', '1')` and `localStorage.setItem('portfolioLicenseActivated', '1')` are set in the demo page's inline script. This sets real localStorage keys that persist after the demo closes.
**Impact:** If a user visits demo.html directly (not through the landing page iframe), their browser will permanently bypass the terms acceptance and license activation gates for the real app. The `window.name = 'demo-mode'` flag only persists for the window lifetime, but the localStorage values persist permanently.
**Recommendation:** Either (a) clear these localStorage values when the demo page unloads, (b) use sessionStorage instead of localStorage for the demo gate bypass, or (c) add a check in the app pages that `window.name === 'demo-mode'` is still set.

### [MEDIUM] Hardcoded inline styles throughout multiple files
**File:** assets/db.js:123-135, assets/db.js:149-165, assets/db.js:188-203, assets/app.js:305-317, assets/overview.js:42-43
**Description:** Several UI components (DB blocked banner, version change banner, migration error banner, backup reminder banner, quote author element) use inline `style.cssText` assignments with hardcoded values instead of CSS classes from the design token system.
**Impact:** These elements bypass the token system, meaning dark mode or theme changes may not apply consistently. The backup banner partially uses CSS custom properties but falls back to hardcoded hex values.
**Recommendation:** Move these styles to app.css using token-based classes. This improves theme consistency and maintainability.

### [MEDIUM] Module structure mixes business logic with DOM manipulation
**File:** assets/overview.js, assets/sessions.js, assets/add-session.js, assets/add-client.js
**Description:** Each page JS file combines data fetching, business logic (filtering, calculations, metrics), and DOM manipulation (createElement, innerHTML, event binding) in a single file with no separation. For example, overview.js has `getClientMetrics()` (pure business logic) interleaved with `renderClientRows()` (DOM rendering).
**Impact:** Makes testing, refactoring, and code reuse harder. Business logic functions cannot be imported independently of DOM code.
**Recommendation:** For a vanilla JS app without a build step, pragmatic separation would be: extract shared utility functions (formatSessionType, readFileAsDataURL, date calculations, metrics) into a `utils.js` file. This is a low-priority improvement given the codebase size.

### [LOW] Inconsistent event binding patterns across pages
**File:** assets/add-client.js, assets/add-session.js, assets/overview.js
**Description:** Some files use arrow functions for event handlers (add-client.js), while add-session.js mixes arrow functions and named functions. Event binding approaches vary: some use `addEventListener` directly, some attach to `onclick` properties (overview.js:522).
**Impact:** Minor inconsistency. No functional impact but makes the codebase harder to follow.
**Recommendation:** Standardize on `addEventListener` with arrow functions for new code. Low priority.

### [LOW] CSS hardcoded color `#fff` in app.css
**File:** assets/app.css:627
**Description:** A hardcoded `color: #fff` appears in app.css (within the severity button active state styling). Most other color values use CSS custom properties from tokens.css.
**Impact:** This specific case is likely intentional (white text on colored severity buttons), but it means dark mode cannot override this value through the token system.
**Recommendation:** Review whether this should use a token like `--color-text-on-primary` for consistency.

### [LOW] db.js migration chain: migrations are sequential and correct
**File:** assets/db.js:6-64
**Description:** The migration chain (v1 -> v2 -> v3) is correctly structured. Each migration runs conditionally based on `oldVersion`. The v1 migration creates the schema, v2 converts "human" type to "adult", v3 migrates Heart Shield fields. The upgrade loop at line 80 correctly iterates from `oldVersion + 1` to `newVersion`.
**Impact:** No issues found. A fresh install (v0 -> v3) will correctly run all three migrations in sequence.
**Recommendation:** No action needed. Migration chain is correct.

### [LOW] manifest.json start_url correctly points to index.html
**File:** manifest.json:5
**Description:** `"start_url": "/index.html"` correctly points to the app, not the landing page. Scope is set to `"/"` which covers all pages.
**Impact:** PWA installation will correctly open the app dashboard, not the marketing landing page. This is the expected behavior per D-08.
**Recommendation:** No action needed. Manifest is correctly configured.

### [LOW] SW cache-first strategy may serve stale assets
**File:** sw.js:116-141
**Description:** The fetch handler uses a cache-first strategy: serve from cache if available, only go to network if cache misses. Cache updates happen via a new CACHE_NAME version bump, which triggers a full precache refresh on install.
**Impact:** Between cache version bumps, users will always get cached versions even if files have changed on the server. This is mitigated by the version-bump workflow (currently at v18) and `skipWaiting()` + `clients.claim()`.
**Recommendation:** The current strategy is appropriate for a PWA that prioritizes offline reliability. No change needed. Document the deployment workflow: always bump CACHE_NAME when deploying updates.

---

## Additional Observations

### Service Worker Cache Completeness
**Missing from SW precache list:**
1. `/assets/fonts/Rubik-Variable.woff2` is listed but does not exist (actual files: Rubik-Regular.woff2, Rubik-SemiBold.woff2, Rubik-Bold.woff2)
2. `/assets/logo.png` (used in app header via Phase 11)
3. All illustration assets in `/assets/illustrations/` (used in index.html botanical decorations)
4. `/assets/icons/icon-192.png` and `/assets/icons/icon-512.png` (PWA manifest icons)
5. `/sw.js` itself is not in the precache list (this is normal -- service workers do not cache themselves)

**Correctly included:** All HTML pages, all JS files, all CSS files, the manifest, demo assets, and the i18n-disclaimer.js file.

### CSS Token System Adoption
Token adoption is high across the codebase. The main CSS files (tokens.css, app.css, landing.css) use custom properties consistently. Exceptions are:
- Inline styles in db.js banners (hardcoded fallback colors)
- Inline styles in app.js backup banner (uses tokens with hardcoded fallbacks)
- `#fff` in app.css severity button
- Various inline styles in demo-hints.js (demo-only, acceptable)
- License page styles are scoped inline in license.html but use tokens correctly

### i18n Key Coverage
All 4 language files (en, he, de, cs) appear to be in sync based on the i18n system structure. The `overview.table.details` key is likely unused after the Phase 8 UI change to icon buttons. A full key-by-key diff between languages was not performed as part of this audit (that is Plan 02's scope).
