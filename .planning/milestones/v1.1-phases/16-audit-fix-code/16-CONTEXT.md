# Phase 15 Consolidated Findings

**Created:** 2026-03-23
**Source Reports:** 15-01 (Security/Code/Architecture), 15-02 (PWA/Journey/GDPR), 15-03 (i18n/Translations)
**Purpose:** Deduplicated, file-grouped action items for implementation

---

## Deduplication Log

The following findings appeared in multiple reports and are merged into single items:

| Merged Finding | Report Sources | Consolidated Into |
|----------------|----------------|-------------------|
| SW font cache mismatch (Rubik-Variable vs actual files) | 15-01 LOW, 15-02 HIGH | CODE-01 (sw.js) |
| SW missing logo.png and illustration assets | 15-01 LOW, 15-02 MEDIUM | CODE-01 (sw.js) |
| Broken image ref `./assets/גינה 2.png` in landing.html | 15-02 INFO | CODE-05 (landing files) |
| Backup banner hardcoded English | 15-01 MEDIUM (inline styles), 15-03 HIGH (i18n) | CODE-03 (app.js) |
| DB banners hardcoded English + hardcoded styles | 15-01 MEDIUM (styles), 15-03 MEDIUM (i18n) | CODE-04 (db.js) |
| formatSessionType() duplication + dead session types | 15-01 MEDIUM (duplication), 15-03 LOW (dead code) | CODE-08 (shared code) + CODE-09 (dead code) |
| postMessage origin issues (landing.js + demo.js) | 15-01 HIGH x2 | CODE-05 (landing) + CODE-06 (demo) |
| Demo localStorage gate bypass | 15-01 MEDIUM | CODE-06 (demo) |
| CSP headers on all HTML | 15-01 HIGH | CODE-07 (HTML files) |

The following findings from the reports required NO ACTION (informational/already-correct):
- 15-01: innerHTML with escapeHtml in disclaimer.js -- SAFE, no action
- 15-01: innerHTML with static SVG in overview.js/globe-lang.js -- SAFE, no action
- 15-01: Lemon Squeezy API call is expected -- document only
- 15-01: db.js migration chain correct -- no action
- 15-01: manifest.json start_url correct -- no action
- 15-01: SW cache-first strategy appropriate -- no action
- 15-02: manifest.json fully correct -- no action
- 15-02: GDPR fully compliant (Cloudflare, LS, local-only) -- no action
- 15-02: All external resource checks clean -- no action
- 15-03: All 210 i18n keys present in all 4 languages -- no action
- 15-03: Disclaimer i18n complete -- no action
- 15-03: License page i18n complete -- no action
- 15-03: Landing page i18n complete -- no action
- 15-03: No wrong-language bugs -- no action
- 15-03: No empty strings or placeholder text in i18n files -- no action
- 15-03: RTL in app.css clean -- no action
- 15-03: HTML dir attribute handling correct across all pages -- no action

---

## Section 1: Code Fixes (Grouped by File)

### CODE-01: sw.js — Font cache fix + missing assets
**Severity:** HIGH (fonts), MEDIUM (images)
**Sources:** 15-01 (LOW, LOW), 15-02 (HIGH, MEDIUM)

**Changes:**
1. **Line 51:** Replace `/assets/fonts/Rubik-Variable.woff2` with three actual font files:
   - `/assets/fonts/Rubik-Regular.woff2`
   - `/assets/fonts/Rubik-SemiBold.woff2`
   - `/assets/fonts/Rubik-Bold.woff2`

2. **After line 61:** Add app-critical images to PRECACHE_URLS:
   - `/assets/logo.png` (app header logo)
   - `/assets/illustrations/גינה.png` (botanical divider, used in index.html AND landing.html)
   - `/assets/illustrations/משפך.png` (footer botanical, used in index.html AND landing.html)
   Note: Landing-only illustrations (hero-left, hero-right, hero-deco, feature icons) are LOW priority and optional for precache since landing page does not need offline support per D-09.

3. **Line 12:** Bump `CACHE_NAME` from `sessions-garden-v18` to `sessions-garden-v19`.

4. **Add SW registration** to the 4 pages that lack it:
   - `license.html` (critical onboarding path)
   - `impressum.html`
   - `datenschutz.html`
   - `demo.html`
   Each needs the same SW registration snippet already used in other pages (e.g., index.html).

**Verify:** Search for `Rubik-Variable` in sw.js returns 0 results. All 3 actual font filenames appear. `logo.png` appears in PRECACHE_URLS. Cache name is v19.

---

### CODE-02: backup.js — portfolioLanguage key bug
**Severity:** MEDIUM (functional bug)
**Source:** 15-01

**Changes:**
1. **Line 145:** Change `localStorage.getItem("portfolioLanguage")` to `localStorage.getItem("portfolioLang")`
2. **Line 280:** Change `localStorage.setItem("portfolioLanguage", ...)` to `localStorage.setItem("portfolioLang", ...)`

**Verify:** `grep -n "portfolioLanguage" assets/backup.js` returns 0 results. Both lines now use `portfolioLang`.

---

### CODE-03: app.js — Backup banner i18n + hardcoded styles
**Severity:** HIGH (i18n), MEDIUM (styles)
**Sources:** 15-01 (MEDIUM), 15-03 (HIGH)

**Changes:**
1. **Lines 321, 330, 348, 358:** Replace 4 hardcoded English strings with i18n lookup or inline per-language object (like the existing `DEMO_BANNER_TEXT` pattern at lines 98-103):
   - `"It has been a while -- consider backing up your data."` -> i18n key `backup.banner.message`
   - `"Back up now"` -> i18n key `backup.banner.backupNow`
   - `"Postpone to tomorrow"` -> i18n key `backup.banner.postponeTomorrow`
   - `"Postpone 1 week"` -> i18n key `backup.banner.postponeWeek`

   **Option A (recommended):** Add these 4 keys to all 4 i18n files (i18n-en/he/de/cs.js) and use `App.t()`.
   **Option B:** Use inline per-language object like DEMO_BANNER_TEXT (avoids touching i18n files but less maintainable).

2. **Lines 305-317:** Replace hardcoded `style.cssText` on backup banner with CSS classes using design tokens from tokens.css. Create classes in app.css (e.g., `.backup-reminder-banner`, `.backup-reminder-btn`).

**Verify:** `grep -n "It has been a while" assets/app.js` returns 0 results. `grep -n "Back up now" assets/app.js` returns 0 results. No inline `style.cssText` on the banner elements.

---

### CODE-04: db.js — DB error banners i18n + hardcoded styles + Promise anti-pattern
**Severity:** MEDIUM (i18n + styles + code quality)
**Sources:** 15-01 (MEDIUM x2), 15-03 (MEDIUM)

**Changes:**
1. **Lines 136, 167, 170, 206-209:** Replace 5 hardcoded English strings with i18n or inline per-language objects:
   - `"Please close other tabs of this app to continue."` -> `db.error.blocked`
   - `"A newer version of this app is open. Please refresh to continue."` -> `db.error.versionChanged`
   - `"Refresh"` -> `db.error.refresh`
   - `"Database update failed..."` -> `db.error.migrationFailed`
   - `"Refresh page"` -> `db.error.refreshPage`

   **Note:** Since db.js loads before the i18n system, use an inline per-language object pattern (similar to how license.js handles its own translations). Detect language from `localStorage.getItem('portfolioLang') || 'en'`.

2. **Lines 123-135, 149-165, 188-203:** Replace hardcoded `style.cssText` on DB error banners with CSS classes. Create classes in app.css (e.g., `.db-blocked-banner`, `.db-version-banner`, `.db-migration-error`).

3. **Lines 229, 248, 259, 269, 293, 313:** Refactor `new Promise(async (resolve, reject) => {...})` anti-pattern. Convert these functions to plain `async function` that directly awaits `openDB()` and uses try/catch. The `withStore()` pattern at line 217 is the correct reference.

**Verify:** `grep -n "Please close other tabs" assets/db.js` returns 0 results. `grep -n "new Promise(async" assets/db.js` returns 0 results.

---

### CODE-05: landing.js + landing.html + landing.css — postMessage + broken image + RTL
**Severity:** HIGH (postMessage), INFO (broken image), LOW (RTL)
**Sources:** 15-01 (HIGH), 15-02 (INFO), 15-03 (LOW)

**Changes:**
1. **landing.js lines 491, 603:** Replace `'*'` target origin in postMessage calls with `window.location.origin`:
   ```
   demoIframe.contentWindow.postMessage({ type: 'demo-lang', lang: lang }, window.location.origin)
   ```

2. **landing.html line 278:** Fix broken image path. Change:
   `src="./assets/גינה 2.png"` to `src="./assets/illustrations/גינה 2.png"`

3. **landing.css lines 211, 221, 244, 245:** (OPTIONAL/LOW) Convert physical `left`/`right` to logical properties on decorative botanicals:
   - `left: -10px` -> `inset-inline-start: -10px`
   - `right: -10px` -> `inset-inline-end: -10px`
   - Same for the media query versions at lines 244-245.
   Note: These are decorative elements. Conversion is optional polish for RTL.

**Verify:** `grep -n "'\\*'" assets/landing.js` returns 0 results (no wildcard postMessage). `grep "גינה 2" landing.html` shows path includes `illustrations/`.

---

### CODE-06: demo.js + demo.html — postMessage validation + localStorage gate bypass
**Severity:** HIGH (postMessage), MEDIUM (gate bypass)
**Sources:** 15-01 (HIGH, MEDIUM)

**Changes:**
1. **demo.js line 11:** Add origin validation at the top of the message handler:
   ```javascript
   if (event.origin !== window.location.origin) return;
   ```

2. **demo.html lines 8-9:** Fix the localStorage gate bypass. Current code sets real localStorage keys that persist permanently. Options (pick one):
   - **(A) Use sessionStorage** instead of localStorage for `portfolioTermsAccepted` and `portfolioLicenseActivated` in the demo page inline script. This way values only last for the tab session.
   - **(B) Clear on unload:** Add `window.addEventListener('beforeunload', () => { localStorage.removeItem('portfolioTermsAccepted'); localStorage.removeItem('portfolioLicenseActivated'); })` -- but this is unreliable.
   - **(C) Use demo-specific keys:** Change to `demoTermsAccepted` and `demoLicenseActivated`, and in the app gate checks, DON'T check these keys.

   **Recommended: Option A** (sessionStorage). Simplest, most reliable. The demo script already sets `window.name = 'demo-mode'` which is also session-scoped.

   Also need to update the gate check in app pages (index.html etc.) to ensure `sessionStorage` demo values are NOT checked as real gate passes. If using option A, the gate checks already use `localStorage` so demo's `sessionStorage` values naturally don't interfere.

**Verify:** `grep -n "event.origin" assets/demo.js` shows origin check present. `grep -n "localStorage.setItem.*portfolioTerms" demo.html` returns 0 results (should be sessionStorage or removed).

---

### CODE-07: All HTML files — Content-Security-Policy meta tag
**Severity:** HIGH
**Source:** 15-01

**Changes:** Add CSP meta tag to the `<head>` of ALL 11 HTML files:
- index.html, landing.html, license.html, disclaimer.html, impressum.html, datenschutz.html, demo.html, add-client.html, add-session.html, sessions.html, reporting.html

Suggested policy:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.lemonsqueezy.com; font-src 'self'">
```

Notes:
- `unsafe-inline` for script/style is required because multiple pages use inline `<script>` blocks for theme/gate checks.
- `data:` and `blob:` for img-src are needed for photo handling (canvas crop, data URLs).
- `connect-src` allows the Lemon Squeezy API call from license.js.

**Verify:** `grep -c "Content-Security-Policy" *.html` shows 11 for all HTML files.

---

### CODE-08: Shared code extraction (app.js) — formatSessionType + readFileAsDataURL
**Severity:** MEDIUM
**Source:** 15-01

**Changes:**
1. **Move `formatSessionType()` to app.js** and expose via `window.App.formatSessionType`. Then remove the duplicate definitions from:
   - `assets/overview.js:228`
   - `assets/sessions.js:38`
   - `assets/add-session.js:584`
   Replace with calls to `App.formatSessionType()`.

2. **Move `readFileAsDataURL()` to app.js** and expose via `window.App.readFileAsDataURL`. Then remove duplicates from:
   - `assets/add-client.js:431`
   - `assets/add-session.js:1081`
   Replace with calls to `App.readFileAsDataURL()`.

3. (LOW PRIORITY, optional) `setSubmitLabel()` in add-client.js:237 and add-session.js:81 could also be shared, but given its simplicity this is low priority.

**Verify:** `grep -rn "function formatSessionType" assets/` shows only 1 result in app.js. `grep -rn "function readFileAsDataURL" assets/` shows only 1 result in app.js.

---

### CODE-09: Dead code cleanup — old session types + unused i18n key
**Severity:** LOW
**Source:** 15-01, 15-03

**Changes:**
1. **overview.js:228-234, sessions.js:38-44:** Remove the `inPerson`, `proxy`, `surrogate` branches from `formatSessionType()`. After CODE-08, this is part of the shared function in app.js. The current valid session types are: `clinic`, `online`, `other`.

2. **All 4 i18n files:** Remove `overview.table.details` key (and `overview.table.addSession` if present and unused). Confirm unused with: `grep -rn "overview.table.details" assets/ *.html` should only show i18n file definitions, no usage.

**Verify:** `grep -n "inPerson\|proxy\|surrogate" assets/app.js` returns 0 results (after shared code extraction). `grep -n "overview.table.details" assets/i18n-en.js` returns 0 results.

---

### CODE-10: app.css — Hardcoded color
**Severity:** LOW
**Source:** 15-01

**Changes:**
1. **Line 627:** Replace `color: #fff` with a token, e.g., `color: var(--color-text-inverse, #fff)`. Add `--color-text-inverse` to tokens.css if it doesn't exist.

**Verify:** `grep -n "#fff" assets/app.css` returns 0 results (or only in comments).

---

### CODE-11: i18n files — Add new keys for backup banner and DB error strings
**Severity:** HIGH (backup), MEDIUM (DB errors)
**Sources:** 15-03 (HIGH, MEDIUM), supports CODE-03 and CODE-04

**Changes:** Add the following keys to all 4 language files (i18n-en.js, i18n-he.js, i18n-de.js, i18n-cs.js):

**Backup banner keys (for CODE-03):**
- `backup.banner.message` — EN: "It has been a while -- consider backing up your data."
- `backup.banner.backupNow` — EN: "Back up now"
- `backup.banner.postponeTomorrow` — EN: "Postpone to tomorrow"
- `backup.banner.postponeWeek` — EN: "Postpone 1 week"

**DB error keys (for CODE-04) -- inline in db.js, NOT in i18n files** since db.js loads before i18n:
These translations will be defined inline within db.js using a local per-language object.

**Translations needed:**
| Key | EN | HE | DE | CS |
|-----|----|----|----|----|
| backup.banner.message | It has been a while -- consider backing up your data. | עבר זמן מה -- כדאי לגבות את הנתונים שלך. | Es ist eine Weile her -- denke daran, deine Daten zu sichern. | Uz je to delsi dobu -- zvaz zalohovani svych dat. |
| backup.banner.backupNow | Back up now | גיבוי עכשיו | Jetzt sichern | Zalohovat nyni |
| backup.banner.postponeTomorrow | Postpone to tomorrow | דחה למחר | Auf morgen verschieben | Odlozit na zitra |
| backup.banner.postponeWeek | Postpone 1 week | דחה לשבוע | 1 Woche verschieben | Odlozit o tyden |

DB error strings (inline in db.js):
| Key | EN | HE | DE | CS |
|-----|----|----|----|----|
| db.blocked | Please close other tabs of this app to continue. | נא לסגור כרטיסיות אחרות של האפליקציה כדי להמשיך. | Bitte schliesse andere Tabs dieser App, um fortzufahren. | Pro pokracovani prosim zavri ostatni karty teto aplikace. |
| db.versionChanged | A newer version of this app is open. Please refresh to continue. | גרסה חדשה יותר של האפליקציה פתוחה. נא לרענן כדי להמשיך. | Eine neuere Version dieser App ist geoeffnet. Bitte aktualisiere, um fortzufahren. | Je otevrena novejsi verze teto aplikace. Pro pokracovani prosim obnov stranku. |
| db.refresh | Refresh | רענון | Aktualisieren | Obnovit |
| db.migrationFailed | Database update failed. Some features may not work correctly. | עדכון מסד הנתונים נכשל. חלק מהתכונות עלולות לא לעבוד כראוי. | Datenbankaktualisierung fehlgeschlagen. Einige Funktionen funktionieren moeglicherweise nicht korrekt. | Aktualizace databaze se nezdarila. Nektere funkce nemuseji fungovat spravne. |
| db.refreshPage | Refresh page | רענון דף | Seite aktualisieren | Obnovit stranku |

**Note:** Sapir should review HE translations. DE/CS translations are best-effort and should be verified by a native speaker.

**Verify:** All 4 i18n files contain `backup.banner.message`. db.js contains inline translation objects.

---

## Section 2: Business/Operational Items (Require Human Action)

These items CANNOT be implemented by code alone. They require Sapir or Ben to provide information or take action.

### BIZ-01: Lemon Squeezy Account and Product Setup
**Severity:** BLOCKING (launch blocker)
**Source:** 15-02

**Actions required (Sapir):**
1. Create Lemon Squeezy account at lemonsqueezy.com
2. Create product: "Sessions Garden", EUR 119, one-time payment
3. Enable license key generation, set activation limit to 2
4. Copy checkout URL -> provide to Ben for `assets/landing.js:6` (`LS_CHECKOUT_URL`)
5. Copy Store ID and Product ID -> provide to Ben for `assets/license.js:16-17`
6. Configure post-purchase "Thank You" page redirect to `https://sessions-garden.app/license.html`
7. Configure email template to include license key + activation instructions
8. Make a test purchase to verify the full flow

**Code changes after Sapir provides values:**
- `assets/landing.js:6` — replace `LS_CHECKOUT_URL` placeholder
- `assets/license.js:16-17` — replace `STORE_ID = 0` and `PRODUCT_ID = 0`
- `landing.html:92,152,305` — inline hrefs will be overwritten by JS at runtime (no change needed)

---

### BIZ-02: Impressum Real Content
**Severity:** BLOCKING (German legal requirement)
**Source:** 15-02

**Actions required (Sapir):**
Provide the following real business information:
1. Business name (or personal name if Einzelunternehmen)
2. Full street address
3. City and postal code
4. Business email (canonical: contact@sessionsgarden.app)
5. Phone number (required by DDG sec 5)
6. Tax ID / Steuernummer (or note if Kleinunternehmer exempt)

**Code changes after Sapir provides values:**
- `impressum.html` — replace all `[YOUR_*]` placeholders with real content

---

### BIZ-03: Datenschutz Real Business Details
**Severity:** HIGH (legal compliance)
**Source:** 15-02

**Actions required (Sapir):**
Same business details as BIZ-02 (name, address, email) to replace placeholders in:
- German "Verantwortlicher" section
- English "Data Controller" section

**Additional code change (can be done by agent):**
- Add brief note about the license activation API call to `api.lemonsqueezy.com` (sends license key + instance name, user's IP visible to LS). Add to "Local Data Storage" section for GDPR transparency.

---

### BIZ-04: Hebrew Quotes — 6 Missing
**Severity:** MEDIUM
**Source:** 15-03

**Context:** Phase 13 decision was to sync all languages to 41 quotes. HE currently has 35.

**Missing quotes that need Hebrew translation (Sapir or native speaker):**
1. "A small light in the darkness can change everything" (custom quote, index 4)
2. "Out beyond ideas of wrongdoing and rightdoing, there is a field. I'll meet you there." (Rumi)
3. "Smile, breathe, and go slowly" (Thich Nhat Hanh)
4. "Don't ask what the world needs. Ask what makes you come alive" (Howard Thurman)
5. "In the middle of difficulty lies opportunity" (Albert Einstein)
6. "What lies behind us and what lies before us are tiny matters compared to what lies within us" (Ralph Waldo Emerson)

**Note:** HE has 2 extra quotes (Lao Tzu, Paulo Coelho) not in EN. Decision needed: add those 2 to EN/DE/CS as well (reaching 43 each), or replace them with the 6 missing ones (reaching 41 each). Phase 13 target was 41.

**Code change after translations received:**
- `assets/i18n-he.js` — add 6 translated quotes to match EN/DE/CS count

---

### BIZ-05: Manifest `lang` Field
**Severity:** LOW (informational)
**Source:** 15-02

**Question for Ben:** manifest.json has `"lang": "en"`. Since the app is multilingual, this may affect PWA install prompts in non-English browser locales. Likely fine to keep as-is since the app defaults to English. No action required unless Ben wants to address.

---

### BIZ-06: Post-Purchase UX Flow Design
**Severity:** HIGH (customer experience)
**Source:** 15-02

**Decisions needed (Ben/Sapir):**
1. After LS checkout, should the customer be redirected to `license.html` automatically? (LS supports redirect URLs)
2. Should `license.html` accept a `?key=` URL parameter to auto-populate the license key field?
3. What instructions should the LS email template contain?
4. Is the current flow (disclaimer gate BEFORE license entry) acceptable, or should returning customers bypass it?

**Code change for ?key= auto-populate (optional, after decision):**
- `assets/license.js` — read `URLSearchParams` for `key` param, pre-fill input field

---

### BIZ-07: In-App Path Back to License Page
**Severity:** MEDIUM (UX gap)
**Source:** 15-02

**Decision needed (Ben):** Once a user is licensed, there is no way to navigate back to `license.html` from within the app. Needed for re-activation on new device. Options:
- Add a "License" link in settings/footer
- Only show it when there's a license issue
- Don't address for v1 (user can navigate directly via URL)

---

## Section 3: Suggested Implementation Order

### Dependencies

```
CODE-08 (shared code extraction into app.js)
  |
  v
CODE-09 (dead code cleanup — cleans the shared function)
```

```
CODE-11 (i18n keys for backup/DB banners)
  |
  +---> CODE-03 (app.js backup banner uses new i18n keys)
  +---> CODE-04 (db.js uses inline translations)
```

All other CODE items are independent and can be done in any order.

### Recommended Execution Waves

**Wave 1 — Independent, no dependencies:**
- CODE-01 (sw.js — font cache + missing assets + SW registration on 4 pages)
- CODE-02 (backup.js — portfolioLanguage key bug, 2-line fix)
- CODE-05 (landing.js/html/css — postMessage + broken image + RTL)
- CODE-06 (demo.js/html — postMessage validation + gate bypass)
- CODE-07 (all HTML — CSP meta tags)
- CODE-08 (shared code extraction to app.js) **do before CODE-09**
- CODE-10 (app.css — hardcoded color)

**Wave 2 — Depends on Wave 1:**
- CODE-09 (dead code cleanup — after CODE-08 extracts shared function)
- CODE-11 (i18n keys — can actually be Wave 1 but grouping with consumers)
- CODE-03 (app.js backup banner — after CODE-11 adds i18n keys)
- CODE-04 (db.js error banners + Promise refactor — after CODE-11 defines translations)

### Effort Estimates (Claude execution time)

| Item | Est. Time | Files Touched |
|------|-----------|---------------|
| CODE-01 | 10 min | sw.js, license.html, impressum.html, datenschutz.html, demo.html |
| CODE-02 | 2 min | backup.js |
| CODE-03 | 15 min | app.js, app.css |
| CODE-04 | 25 min | db.js, app.css |
| CODE-05 | 10 min | landing.js, landing.html, landing.css |
| CODE-06 | 10 min | demo.js, demo.html |
| CODE-07 | 10 min | 11 HTML files |
| CODE-08 | 20 min | app.js, overview.js, sessions.js, add-session.js, add-client.js |
| CODE-09 | 5 min | app.js (shared fn), i18n-en/he/de/cs.js |
| CODE-10 | 3 min | app.css, tokens.css |
| CODE-11 | 15 min | i18n-en/he/de/cs.js, db.js |
| **Total** | **~125 min** | |

### Suggested Plan Grouping (for when plans are created)

| Plan | Items | Files | Est. |
|------|-------|-------|------|
| Plan A: SW + HTML infra | CODE-01, CODE-07 | sw.js + 11 HTML files | 20 min |
| Plan B: Security hardening | CODE-05, CODE-06 | landing.js/html/css, demo.js/html | 20 min |
| Plan C: Shared code + dead code | CODE-08, CODE-09 | app.js, overview.js, sessions.js, add-session.js, add-client.js, 4 i18n files | 25 min |
| Plan D: i18n + banner fixes | CODE-11, CODE-03, CODE-04, CODE-02 | 4 i18n files, app.js, app.css, db.js, backup.js | 55 min (consider splitting) |
| Plan E: CSS token cleanup | CODE-10 | app.css, tokens.css | 3 min (combine with another) |

---

## Deferred Items (Tracked in Roadmap)

These items are NOT skipped — they are deferred to later phases and tracked in the roadmap.

### Deferred to Phase 18: Technical Debt

| Finding | Source | Severity | Why Deferred | What to Do |
|---------|--------|----------|--------------|------------|
| License key plaintext in localStorage | 15-01 HIGH | HIGH | Requires design decision on obfuscation approach (XOR with device salt, or similar). Not a launch blocker but must be addressed post-launch. | Implement basic obfuscation — XOR with device-derived salt so casual DevTools inspection doesn't reveal raw key. Won't stop determined attackers but raises the bar. |
| Module structure mixes business logic + DOM | 15-01 MEDIUM | MEDIUM | Major refactor — extract business logic (metrics, calculations, filtering) from DOM manipulation across overview.js, sessions.js, add-session.js, add-client.js. Low ROI before launch. | Create utils.js for shared business logic. Extract pure functions (getClientMetrics, date calculations, filtering) away from DOM code. |
| No webhook handling for LS refunds | 15-02 HIGH | HIGH | Requires backend (static site has none). Manual refund process is acceptable for v1 launch volume. Revisit when customer count exceeds manual capacity. | Evaluate options: Cloudflare Worker as webhook receiver, or manual LS dashboard process with documented SOP. |
| dir attribute on body vs html inconsistency | 15-03 note | LOW | Works correctly as-is. App CSS targets `body[dir="rtl"]`. Standalone pages target `html[dir="rtl"]`. No bugs, but could cause issues if CSS conventions change. | Standardize all pages to set `dir` on `<html>` element for consistency. Update app.js `setLanguage()` and all CSS selectors. |

### Included in Phase 16 (moved from "not fixing")

These were originally marked as tradeoffs but are now included in the code fix phase:

| Finding | Source | Added To |
|---------|--------|----------|
| setSubmitLabel() duplication | 15-01 MEDIUM | CODE-08 (shared code extraction) |
| Inconsistent event binding patterns | 15-01 LOW | CODE-09 (standardize during dead code cleanup) |

### Not Fixing (Genuinely Acceptable)

| Finding | Source | Rationale |
|---------|--------|-----------|
| Manifest `lang: "en"` for multilingual app | 15-02 MEDIUM | Acceptable default. App defaults to English. No evidence of user impact on install prompts. If issues surface, trivial to change later. |
