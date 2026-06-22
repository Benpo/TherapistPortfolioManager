# 15-02 Report: PWA, Customer Journey, GDPR, Legal & Lemon Squeezy Audit

## Summary Table

| Area | Status | Blocking Issues | High Issues | Medium/Low Issues |
|------|--------|:-:|:-:|:-:|
| PWA Manifest | Mostly Good | 0 | 0 | 1 |
| Service Worker | Needs Attention | 0 | 3 | 2 |
| Customer Journey | Gaps Found | 2 | 1 | 1 |
| GDPR Compliance | Mostly Compliant | 0 | 0 | 1 |
| Legal Documents | Placeholder | 1 | 0 | 0 |
| Lemon Squeezy | Not Ready | 1 | 1 | 0 |

---

## 1. PWA Manifest and Service Worker Audit

### 1.1 manifest.json Audit

**`start_url`**: `/index.html` -- CORRECT. Points to the app, not the landing page.

| Field | Value | Status |
|-------|-------|--------|
| `name` | "Sessions Garden" | OK |
| `short_name` | "Sessions Garden" | OK |
| `start_url` | "/index.html" | OK |
| `display` | "standalone" | OK |
| `background_color` | "#faf7f2" | OK |
| `theme_color` | "#2d6a4f" | OK |
| `icons` | 192x192 + 512x512 | OK |
| `scope` | "/" | OK |
| `description` | Present | OK |

**Icon file check:**
- `/assets/icons/icon-192.png` -- EXISTS on disk
- `/assets/icons/icon-512.png` -- EXISTS on disk

**[MEDIUM] `lang` field**: Set to `"en"` which is fine as a default, but since the app is multilingual, consider whether this affects install prompts in non-English locales.

**Verdict:** Manifest is complete and correct. All required PWA fields present. `start_url` correctly points to the app. `scope: "/"` encompasses all pages including landing.

### 1.2 Service Worker Audit

**Cache version:** `sessions-garden-v18` -- uses a version string in the cache name. Cache is updated by incrementing the version number. Old caches are deleted on activate.

**Cache strategy:** Cache-first for same-origin GET requests, network fallback. Cross-origin requests (e.g., Lemon Squeezy API) are excluded from interception.

**Update mechanism:** `skipWaiting()` + `clients.claim()` ensures new SW takes effect on next navigation without waiting for all tabs to close. This is the recommended aggressive-update pattern.

**SW registration coverage:**

| Page | Registers SW? |
|------|:---:|
| index.html | YES |
| sessions.html | YES |
| add-client.html | YES |
| add-session.html | YES |
| reporting.html | YES |
| disclaimer.html | YES |
| landing.html | YES |
| **license.html** | **NO** |
| **impressum.html** | **NO** |
| **datenschutz.html** | **NO** |
| **demo.html** | **NO** |

**[HIGH] 4 pages do not register the service worker.** `license.html` is part of the critical onboarding path (users MUST visit it to activate). Without SW registration, if a user navigates directly to license.html, the SW won't be controlling that page. However, since the SW is already installed from other pages, it still controls via `clients.claim()` after install. The real risk: if license.html is the user's FIRST page visit (e.g., from a bookmark), the SW won't be installed. The normal flow (landing -> license) should work because landing.html registers the SW.

**Cache completeness audit:**

Files in PRECACHE_URLS (SW cache):
```
/, /index.html, /sessions.html, /add-client.html, /add-session.html,
/reporting.html, /disclaimer.html, /license.html, /landing.html,
/impressum.html, /datenschutz.html, /manifest.json, /assets/tokens.css,
/assets/app.css, /assets/jszip.min.js, /assets/backup.js, /assets/app.js,
/assets/db.js, /assets/i18n.js, /assets/i18n-en.js, /assets/i18n-he.js,
/assets/i18n-de.js, /assets/i18n-cs.js, /assets/overview.js,
/assets/sessions.js, /assets/add-client.js, /assets/add-session.js,
/assets/reporting.js, /assets/disclaimer.js, /assets/license.js,
/assets/i18n-disclaimer.js, /assets/fonts/Rubik-Variable.woff2,
/demo.html, /assets/demo.js, /assets/demo-seed.js,
/assets/demo-seed-data.json, /assets/demo-hints.js, /assets/demo.css,
/assets/landing.css, /assets/landing.js, /assets/globe-lang.css,
/assets/globe-lang.js
```

**Files on disk NOT in SW cache:**

| File | Severity | Notes |
|------|----------|-------|
| `/assets/fonts/Rubik-Bold.woff2` | **HIGH** | Used by app -- text will fail offline |
| `/assets/fonts/Rubik-Regular.woff2` | **HIGH** | Used by app -- text will fail offline |
| `/assets/fonts/Rubik-SemiBold.woff2` | **HIGH** | Used by app -- text will fail offline |
| `/assets/logo.png` | **MEDIUM** | Logo may not display offline |
| `/assets/illustrations/hero-left.png` | LOW | Landing page illustration |
| `/assets/illustrations/hero-right.png` | LOW | Landing page illustration |
| `/assets/illustrations/hero-deco.png` | LOW | Landing page decoration |
| `/assets/illustrations/גינה.png` | LOW | Botanical divider (landing + app) |
| `/assets/illustrations/גינה 2.png` | LOW | Botanical divider (landing) |
| `/assets/illustrations/משפך.png` | LOW | Footer botanical (landing + app) |
| `/assets/illustrations/decorations/deco1-7*.png` | LOW | App UI botanicals |
| `/assets/illustrations/icons/ale.png` etc. (6 files) | LOW | Landing feature icons |
| `/assets/illustrations/biancavandijk*.jpg` | INFO | May be unused |
| `/assets/illustrations/saydung*.jpg` | INFO | May be unused |
| `/assets/illustrations/wage212*.png` | INFO | May be unused |
| `/assets/screenshots/*.png` | INFO | Not used in app pages |
| `/screenshots/*.png` | INFO | Not used in app pages |
| `image.png` (root) | INFO | Likely unused |

**[HIGH] Font file mismatch in SW cache.** The cache lists `Rubik-Variable.woff2` but the actual files on disk are `Rubik-Bold.woff2`, `Rubik-Regular.woff2`, `Rubik-SemiBold.woff2`. Either the CSS references the Variable font (which doesn't exist) and falls back to system fonts, or the CSS references the individual weights which aren't cached. Either way, fonts will not work offline.

**[MEDIUM] App UI images not cached.** The botanical decorations used inside the app (index.html references `גינה.png` and `משפך.png`) and the logo (`assets/logo.png`) are not in the SW cache. These are cosmetic but will be blank when offline.

**[INFO] Landing page pricing section references `./assets/גינה 2.png`** (without the `illustrations/` subdirectory). This file does NOT exist at that path. The file exists at `./assets/illustrations/גינה 2.png`. This is a broken image reference.

**Offline capability verdict:** The core app HTML/JS/CSS is cached and will load offline. However, fonts will likely not work (wrong filename in cache), and all images/illustrations are missing from the cache. The app is *functionally* offline-capable but *visually degraded*.

---

## 2. Purchase-to-Usage Customer Journey Map

### Step-by-step flow:

| # | Step | Status | File/Line | Notes |
|---|------|--------|-----------|-------|
| 1 | Customer discovers landing page | **Implemented** | `landing.html` | Full marketing page with features, pricing, FAQ, demo |
| 2 | Customer reads features, reviews pricing | **Implemented** | `landing.html:271-316` | Pricing card with EUR 119 price, feature list |
| 3 | Customer clicks "Buy" button | **Placeholder** | `landing.html:92`, `assets/landing.js:6` | Links to `https://YOURSTORE.lemonsqueezy.com/buy/PLACEHOLDER` |
| 4 | Lemon Squeezy checkout | **Not configured** | -- | No LS account/product exists yet. Customer cannot complete purchase. |
| 5 | Customer receives license key | **Undefined** | -- | How does LS deliver the key? Email? Redirect? No post-purchase flow defined. |
| 6 | Customer navigates to license page | **Partially implemented** | `license.html`, `landing.html:53,310` | "Already have a license?" links exist. No redirect from LS checkout. |
| 7 | Customer enters license key | **Implemented** | `license.js:139-188` | Calls LS `/v1/licenses/activate` API. Handles success, network error, invalid key, device limit. |
| 8 | Terms gate appears if not accepted | **Implemented** | `license.html:8-10` | Redirects to `disclaimer.html?next=/license.html` if terms not yet accepted |
| 9 | Disclaimer acceptance | **Implemented** | `disclaimer.html`, `disclaimer.js` | Two checkboxes (general terms + Widerrufsrecht), receipt download, then continue |
| 10 | License validated, redirect to app | **Implemented** | `license.js:252-259` | On success, stores key in localStorage, redirects to `index.html` after 1.2s |
| 11 | App loads (index.html) | **Implemented** | `index.html:5-9` | Checks `portfolioTermsAccepted` and `portfolioLicenseActivated` in localStorage |
| 12 | App is offline-ready | **Mostly implemented** | `sw.js` | SW is registered, assets cached (with gaps noted in Section 1) |

### Gap Analysis

**[BLOCKING] Step 3-4: No Lemon Squeezy product exists.** The checkout URL is a placeholder. No product has been created on Lemon Squeezy. Customers cannot buy the product. This is the single biggest launch blocker.

**[BLOCKING] Step 5: Post-purchase flow is undefined.** After a customer completes payment on Lemon Squeezy:
- How do they receive the license key? (LS can send via email, or display on success page)
- Is there a redirect URL back to sessions-garden's license.html?
- What instructions does the customer see?
- Currently: NOTHING is configured. The customer would be stranded after payment.

What needs to be built/configured:
1. Configure LS checkout "Thank You" page to redirect to `https://sessions-garden.app/license.html` (or display license key with instructions)
2. Configure LS email template to include the license key and link to activation page
3. Consider adding a `?key=` URL parameter to license.html to auto-populate the key field from the redirect

**[HIGH] Step 8 flow ordering concern:** The current gate flow is: `license.html` checks for terms -> redirects to `disclaimer.html` -> after acceptance, redirects back to `license.html`. This means a customer visiting license.html for the first time sees the disclaimer BEFORE they can enter their key. This is by design (legal requirement for Widerrufsrecht), but the UX could be confusing for a customer who just received their key and wants to activate.

**[MEDIUM] No in-app flow for "your license expired" or "re-activate on new device".** The re-activation path exists in `license.js:222-226` (pre-fills stored key, shows re-activate message) but there's no way for the user to navigate BACK to the license page from within the app. Once licensed, the app has no visible link to `license.html`.

---

## 3. CloudFlare Pages GDPR Compliance

### 3.1 CloudFlare Pages Analysis

| Question | Finding |
|----------|---------|
| Does CF Pages inject cookies? | **No.** CloudFlare Pages does not inject cookies for static sites by default. No analytics cookies, no tracking pixels. |
| Does CF Pages process visitor data? | **Yes.** Cloudflare processes IP addresses and request metadata (browser, URL, timestamp) for DDoS protection and CDN operation. This is standard technical processing. |
| Where is data stored? | Cloudflare operates a global network. Data may traverse US datacenters. |
| EU-US Data Privacy Framework? | **Yes.** Cloudflare participates in the EU-US Data Privacy Framework (DPF), recognized by the European Commission as adequate under Art. 45 GDPR (Adequacy Decision of July 2023). |
| DPA available? | **Yes.** Cloudflare offers a Data Processing Agreement that covers GDPR requirements. |
| EU-only processing possible? | Cloudflare does not offer EU-only routing for Pages (free tier). Enterprise plans may. For the free/pro tier, DPF adequacy decision covers the legal basis. |

**Verdict: COMPLIANT.** CloudFlare Pages with DPF participation provides adequate GDPR coverage for static site hosting. The Datenschutz page already correctly documents this relationship (Section 4 of datenschutz.html).

### 3.2 Website External Resource Audit

**HTML files -- external resource loading:**

| File | External Resources | GDPR Impact |
|------|-------------------|-------------|
| landing.html | None (all local CSS/JS/images) | COMPLIANT |
| index.html | None | COMPLIANT |
| sessions.html | None | COMPLIANT |
| add-client.html | None | COMPLIANT |
| add-session.html | None | COMPLIANT |
| reporting.html | None | COMPLIANT |
| disclaimer.html | None | COMPLIANT |
| license.html | None | COMPLIANT |
| impressum.html | None | COMPLIANT |
| datenschutz.html | Links to cloudflare.com and lemonsqueezy.com privacy policies (user-clicked links, not auto-loaded) | COMPLIANT |
| demo.html | None | COMPLIANT |

**No external fonts loaded** -- all fonts are local woff2 files (Rubik family). No Google Fonts, no CDN fonts.

**No external scripts** -- no analytics (GA, Plausible, etc.), no social media embeds, no external CDNs.

**No external images** -- all illustrations are local PNG/JPG files.

### 3.3 JavaScript External Network Calls

| File | External Call | Purpose | GDPR Impact |
|------|--------------|---------|-------------|
| `license.js:144` | `fetch('https://api.lemonsqueezy.com/v1/licenses/activate')` | License activation (one-time) | Sends license key + generated instance name. No personal data beyond what LS already has from purchase. |
| `demo-seed.js:23` | `fetch('./assets/demo-seed-data.json')` | Local file fetch | No external call -- same-origin |

**All other JS files make zero external network calls.**

### 3.4 Payment Flow (Lemon Squeezy)

Lemon Squeezy acts as **Merchant of Record (MoR)**. This means:
- LS is the legal seller (not Sessions Garden)
- LS processes payment data under its own GDPR responsibility
- Sessions Garden receives only the license key confirmation
- LS is GDPR-compliant and offers DPA
- LS is a subsidiary of Stripe, Inc. (US), but participates in EU data protection frameworks

**Verdict: COMPLIANT.** Lemon Squeezy's MoR model means Sessions Garden has minimal GDPR exposure from the payment flow. The datenschutz page already documents this correctly.

### 3.5 App Data Processing

The app stores ALL data in IndexedDB (local-only):
- Client names, session notes, energy work records
- No data ever transmitted to any server
- No analytics, no telemetry, no crash reporting
- The developer has zero access to user data

**Verdict: COMPLIANT.** Local-only storage = no GDPR processor obligations.

### 3.6 Overall GDPR Summary

| Surface | Verdict | Notes |
|---------|---------|-------|
| Website (landing, legal pages) | COMPLIANT | Zero external resources loaded |
| App (index, sessions, etc.) | COMPLIANT | Zero network calls, local-only data |
| Hosting (Cloudflare) | COMPLIANT | DPF adequacy, documented in Datenschutz |
| Payment (Lemon Squeezy) | COMPLIANT | MoR model, documented in Datenschutz |
| License activation | NEEDS ATTENTION | One-time API call to LS. Technically sends device-generated instance name. Low risk but should be mentioned in Datenschutz. |

**[MEDIUM] The Datenschutz page does not explicitly mention the license activation API call** to `api.lemonsqueezy.com/v1/licenses/activate`. While the data sent (license key + generated instance name) contains no personal information, the call itself means the user's IP is visible to Lemon Squeezy during activation. This should be documented in the "Local Data Storage" section for transparency.

---

## 4. Legal Document Status

### 4.1 Impressum (impressum.html)

**Content status: PLACEHOLDER**

The Impressum contains the following placeholder content (verbatim):

```
[YOUR_BUSINESS_NAME]
[YOUR_STREET_ADDRESS]
[YOUR_CITY_POSTAL_CODE]

Kontakt:
E-Mail: [YOUR_BUSINESS_EMAIL]
Telefon: [YOUR_PHONE_NUMBER]

Steuernummer: [YOUR_TAX_ID]
```

**What real content is needed:**
1. Business name (Sapir's business or personal name)
2. Street address (German requirement: full postal address)
3. City and postal code
4. Business email address (currently `contact@sessionsgarden.app` is the canonical email)
5. Phone number (German requirement under DDG sec 5)
6. Tax ID / Steuernummer (if applicable; Kleinunternehmer may not have VAT ID)

**Multi-language support:** YES -- 4 languages supported via inline script. The title, "Angaben" heading, back link, and footer links all translate correctly for EN/HE/DE/CS.

**Globe language switcher:** YES -- uses `initGlobeLang()` with reload-on-change pattern.

**[BLOCKING] The Impressum cannot be published with placeholder content.** This is a German legal requirement (DDG sec 5, formerly TMG sec 5). Publishing without valid Impressum can result in warnings (Abmahnungen) and fines.

### 4.2 Datenschutz / Privacy Policy (datenschutz.html)

**Content status: MOSTLY COMPLETE with placeholder business details**

The Datenschutz page contains a comprehensive, well-structured privacy policy in both German and English. It covers:
- Data controller identification (placeholder: `[YOUR_BUSINESS_NAME]`, `[YOUR_STREET_ADDRESS]`, etc.)
- Overview of data processing (local-first model explained)
- Legal bases (Art. 6 GDPR)
- Cloudflare hosting (with DPF noted)
- Lemon Squeezy payment processing (MoR model explained)
- Local data storage (IndexedDB + localStorage)
- No cookies / no tracking
- SSL/TLS encryption
- Data subject rights (Art. 15-21 GDPR)
- Currency and amendments

**Placeholder content (verbatim):**
In the German "Verantwortlicher" section:
```
[YOUR_BUSINESS_NAME]
[YOUR_STREET_ADDRESS], [YOUR_CITY_POSTAL_CODE]
[YOUR_BUSINESS_EMAIL]
```

In the English "Data Controller" section:
```
[Name]
[Address]
[Email address]
```

**Multi-language support:** YES -- sophisticated language-aware display:
- DE users: German + English versions (both visible)
- EN users: English only
- HE users: Hebrew notice (2 sentences) + English version
- CS users: Czech notice (2 sentences) + English version

**Globe language switcher:** YES -- working with reload-on-change.

**Data flows that should be mentioned but are currently NOT documented:**
1. License activation API call to `api.lemonsqueezy.com` (sends license key + instance name, user's IP visible)
2. Service Worker behavior (precaches files, manages offline cache -- not a GDPR issue but transparency is good)

**What needs to be done:**
1. Replace `[YOUR_BUSINESS_NAME]`, `[YOUR_STREET_ADDRESS]`, etc. with real values (same as Impressum)
2. Consider adding a brief note about the license activation API call
3. Legal review by someone familiar with German data protection law (recommended, not blocking)

---

## 5. Lemon Squeezy Integration Readiness

### 5.1 Current Checkout URL

**Value:** `https://YOURSTORE.lemonsqueezy.com/buy/PLACEHOLDER`

This is set in two places:
1. `assets/landing.js:6` as `LS_CHECKOUT_URL` variable
2. `landing.html:92,152,305` as inline `href` attributes (overwritten at runtime by landing.js)

The landing.js script updates the hero CTA and pricing CTA buttons at runtime with the `LS_CHECKOUT_URL` value.

### 5.2 License Validation

**Implementation status:** FULLY IMPLEMENTED

`license.js` calls the Lemon Squeezy License API:
- **Endpoint:** `POST https://api.lemonsqueezy.com/v1/licenses/activate`
- **Payload:** `license_key` + `instance_name` (generated as `sessions-garden-{timestamp}`)
- **Content-Type:** `application/x-www-form-urlencoded`

**Product validation constants:**
```javascript
const STORE_ID = 0;   // TODO: replace with actual
const PRODUCT_ID = 0; // TODO: replace with actual
```

When `STORE_ID` and `PRODUCT_ID` are both 0, the cross-product validation check is **skipped** (development mode). Once real values are set, the code validates that the license key belongs to the correct product (`data.meta.store_id` and `data.meta.product_id`).

**Error handling:**

| Scenario | Handled? | User Message |
|----------|:--------:|-------------|
| Network error (offline) | YES | "Activation requires an internet connection" (4 languages) |
| Invalid key | YES | "Invalid license key" (4 languages) |
| Device limit reached | YES | "You have reached the device limit" + support email (4 languages) |
| Wrong product (cross-product) | YES | "This license key is not valid for Sessions Garden" (4 languages) |
| Generic server error | YES | "Activation failed" (4 languages) |

**Post-activation storage:**
- `portfolioLicenseKey` in localStorage (the key itself)
- `portfolioLicenseInstance` in localStorage (LS instance ID)
- `portfolioLicenseActivated` = `"1"` in localStorage (boolean flag)

**Offline daily check:** `isLicensed()` checks localStorage only -- no API call needed after initial activation.

### 5.3 What's Missing

**[BLOCKING] No Lemon Squeezy account or product exists.** To wire up the integration:

1. **Create Lemon Squeezy account** -- Sapir must sign up at lemonsqueezy.com
2. **Create product** -- name: "Sessions Garden", price: EUR 119, one-time payment
3. **Configure license keys** -- enable license key generation for the product, set activation limit to 2 (per pricing page: "2 device activations")
4. **Get checkout URL** -- from LS dashboard, copy the checkout URL and replace `LS_CHECKOUT_URL` in `assets/landing.js:6`
5. **Get Store ID and Product ID** -- from LS dashboard, replace `STORE_ID` and `PRODUCT_ID` in `assets/license.js:16-17`
6. **Configure post-purchase redirect** -- set the "Thank You" page URL in LS to redirect to `https://sessions-garden.app/license.html`
7. **Configure email template** -- ensure LS sends the license key via email with instructions to visit the activation page
8. **Test the full flow** -- make a test purchase, receive key, activate, verify app access

**[HIGH] No webhook handling.** This is expected for a static site -- there's no backend to receive webhooks. However, this means:
- No automatic tracking of refunds (manual process)
- No license deactivation on refund (must be done manually in LS dashboard)
- No subscription management (not needed for one-time purchase)

This is acceptable for v1 but should be noted for future consideration if the business grows.

### 5.4 Integration Readiness Checklist

| Item | Status | Action Required |
|------|--------|----------------|
| Checkout URL | Placeholder | Replace after product creation |
| License validation code | Complete | Only needs STORE_ID + PRODUCT_ID |
| Error handling | Complete | All error cases covered in 4 languages |
| Post-activation redirect | Complete | Redirects to index.html |
| i18n (license page) | Complete | 4 languages fully translated |
| LS account | Not created | Sapir must create |
| LS product | Not created | Sapir must configure |
| Post-purchase flow | Not designed | Need redirect URL + email template |
| Refund handling | Manual | Acceptable for v1 |

---

## Appendix: Complete File Inventory vs SW Cache

### Files ON DISK but NOT in SW cache:

**Fonts (HIGH -- affects offline text rendering):**
- `assets/fonts/Rubik-Bold.woff2`
- `assets/fonts/Rubik-Regular.woff2`
- `assets/fonts/Rubik-SemiBold.woff2`

Note: SW caches `assets/fonts/Rubik-Variable.woff2` which does NOT exist on disk.

**Images used in app/landing (MEDIUM -- cosmetic):**
- `assets/logo.png`
- `assets/illustrations/hero-left.png`
- `assets/illustrations/hero-right.png`
- `assets/illustrations/hero-deco.png`
- `assets/illustrations/גינה.png` (used in index.html AND landing.html)
- `assets/illustrations/גינה 2.png` (used in landing.html)
- `assets/illustrations/משפך.png` (used in index.html AND landing.html)
- `assets/illustrations/decorations/deco1.png` through `deco7hero.png` (7 files)
- `assets/illustrations/icons/ale.png`, `alim.png`, `atsitz.png`, `merizza.png`, `tulip.png`, `vassa.png`

**Possibly unused (INFO):**
- `assets/illustrations/biancavandijk-leaves-7387704_1920.jpg`
- `assets/illustrations/saydung-flowers-5960100_1920 (1).jpg`
- `assets/illustrations/saydung-flowers-5960101_1920.jpg`
- `assets/illustrations/wage212-plant-7073321_640.png`
- `assets/screenshots/*.png` (6 screenshot files)
- `screenshots/*.png` (3 screenshot files)
- `image.png` (root)

**Broken image reference:**
- `landing.html:278` references `./assets/גינה 2.png` but the file is at `./assets/illustrations/גינה 2.png`
