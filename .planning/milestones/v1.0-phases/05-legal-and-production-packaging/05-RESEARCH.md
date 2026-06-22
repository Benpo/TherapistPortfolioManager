# Phase 5: Legal and Production Packaging - Research

**Researched:** 2026-03-12
**Domain:** PWA setup, Lemon Squeezy license key API, German legal disclaimers, Cloudflare Pages deployment
**Confidence:** HIGH (stack locked in CONTEXT.md; verified against official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Disclaimer/T&C:** Full-screen gate blocks all app access until terms accepted. Language selector on disclaimer screen. Auto-detect browser language via navigator.language with manual override. Each of 4 languages has its own legally accurate version.
- **Disclaimer content:** Not medical / data local-only / backup responsibility / no liability / Widerrufsrecht §356 BGB / EU consumer protection / single-user license
- **Widerrufsrecht checkbox:** Required per LG Karlsruhe ruling (§356 Abs. 5 BGB)
- **Acceptance receipt:** Downloadable file, personal and non-transferable
- **License key gating:** Lemon Squeezy generates keys on purchase. Daily use requires NO internet. Key validated and stored locally after first activation.
- **PWA:** manifest.json + service worker. App name "Sessions Garden". Full offline capability. Data (IndexedDB) MUST NEVER be affected by updates. navigator.storage.persist() already done.
- **Landing page:** Same project, same domain. EN/HE/DE/CS. Impressum + Datenschutzerklärung. Lemon Squeezy purchase button. Cloudflare Pages auto-deploy.
- **Deployment:** Cloudflare Pages (free tier). Push to GitHub = auto-deploy. Start with *.pages.dev subdomain.

### Claude's Discretion
- Disclaimer screen UX (full-page gate vs modal, scroll-to-bottom vs sectioned acknowledgment)
- Disclaimer text accessibility after acceptance (always available in settings vs one-time)
- License key validation approach (server-first vs local-only, device limits)
- Invalid key error handling UX
- PWA update strategy (silent vs notification)
- Install prompt behavior per platform
- Landing page layout and content structure
- Pricing recommendation based on market research
- Impressum and privacy policy content
- Receipt format and content

### Deferred Ideas (OUT OF SCOPE)
- Custom domain selection (start with *.pages.dev)
- App icon design (use placeholder, create todo)
- Landing page FAQ about storage limits
- Lemon Squeezy account creation (operational, not code)
- Gewerbeanmeldung update
- Steuerberater consultation
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LEGL-01 | Disclaimer/T&C screen — blocks app until user accepts, no external API calls | Full-screen gate pattern, localStorage flag, gate-before-initCommon pattern |
| LEGL-02 | Acceptance receipt — downloadable proof of T&C acceptance | Blob + URL.createObjectURL() + anchor download pattern |
| LEGL-03 | Disclaimer content — compliant with EU consumer protection, German Widerrufsrecht §356 BGB | LG Karlsruhe ruling checkbox text, eRecht24/AdSimple generators for Impressum/privacy |
| DIST-03 | Access gating mechanism for paid product (license key) | Lemon Squeezy License API activate/validate endpoints, no API key required |
| DIST-04 | PWA setup with service worker for offline capability | Cache-first service worker, manifest.json, install prompt pattern |
| DIST-05 | Production packaging — distribution-ready bundle | Cloudflare Pages static deployment, landing page, Lemon Squeezy embed |
</phase_requirements>

---

## Summary

Phase 5 is the productization sprint: convert a working app into a legally compliant, paid, installable product. It spans five distinct technical domains — legal compliance, access control, PWA infrastructure, a marketing landing page, and deployment pipeline — none of which require changes to the core app code. All decisions about hosting (Cloudflare Pages) and payment (Lemon Squeezy) were locked in Phase 4.

The single most important technical constraint is **data safety**: the service worker must never touch IndexedDB. Service workers operate only on the network layer (HTTP cache); IndexedDB is independent. This is not a risk if the service worker is coded correctly, but it must be explicitly documented and verified.

The biggest complexity is the **disclaimer gate**: it must intercept every app page load before `App.initCommon()` runs, in all 4 languages, with its own i18n, without any dependency on the existing app navigation or DB. The cleanest implementation is a standalone `disclaimer.html` page that redirects to the requested page after acceptance, storing a flag in localStorage.

**Primary recommendation:** Build each domain as an isolated deliverable — disclaimer (LEGL), license gate (DIST-03), service worker (DIST-04), landing page + Cloudflare setup (DIST-05) — in that order.

---

## Standard Stack

### Core (No new libraries — vanilla only)
| Component | Approach | Purpose | Why |
|-----------|----------|---------|-----|
| Disclaimer gate | Vanilla JS + localStorage flag | Block app access before T&C accepted | No library needed; a flag check at page-top handles it |
| Acceptance receipt | `Blob` + `URL.createObjectURL()` + `<a download>` | Downloadable acceptance proof | Browser-native, no dependency |
| License key activation | `fetch()` to Lemon Squeezy License API | First-time activation (requires internet) | Official API, no auth key needed |
| License key validation | localStorage-stored instance_id | Daily-use offline check | Store instance_id + key after activation; no API call needed daily |
| Service worker | Vanilla JS `sw.js` | Offline caching of all static assets | Cache-first strategy, standard Web API |
| Web app manifest | `manifest.json` | PWA installability | Standard PWA requirement |
| Landing page | New `landing.html` + existing CSS/i18n | Product marketing + purchase | Reuses existing design tokens and i18n system |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| eRecht24 Impressum Generator | Generate Impressum text (German DDG §5) | During landing page creation |
| AdSimple Datenschutz Generator | Generate Datenschutzerklärung | During landing page creation |
| Cloudflare Pages dashboard | Connect GitHub repo, configure deployment | One-time infrastructure setup |
| Lemon Squeezy dashboard | Create product, set activation limit, get checkout URL | One-time product configuration |

**Installation:** No new npm packages. This is a vanilla JS project with no build step.

---

## Architecture Patterns

### Recommended Project Structure (additions only)
```
/                          # project root (served as Cloudflare Pages root)
├── landing.html           # marketing landing page (new)
├── disclaimer.html        # T&C gate page (new)
├── sw.js                  # service worker (new, must be at root)
├── manifest.json          # PWA manifest (new, must be at root)
├── assets/
│   ├── disclaimer.js      # disclaimer logic (new)
│   ├── license.js         # license key gate logic (new)
│   ├── landing.js         # landing page logic (new)
│   ├── i18n-disclaimer.js # disclaimer translations (new, 4 languages)
│   └── icons/             # PWA icons (placeholder sizes: 192x192, 512x512)
├── index.html             # (existing — add gate check at top)
├── sessions.html          # (existing — add gate check at top)
├── add-client.html        # (existing — add gate check at top)
├── add-session.html       # (existing — add gate check at top)
└── reporting.html         # (existing — add gate check at top)
```

### Pattern 1: Disclaimer Gate — Redirect Approach
**What:** Each existing app page runs a 5-line gate check at the very top (before any other JS). If terms not yet accepted, redirect to `disclaimer.html?next=[current page]`. After acceptance, redirect back to `?next` URL.
**When to use:** For all 5 existing app pages.
**Why this over a shared modal:** Simpler, no dependency on app JS loading order, works even if app JS fails to load.

```javascript
// Source: Standard localStorage gate pattern
// Add as FIRST <script> in <head> of each app page (inline, synchronous)
(function() {
  try {
    if (!localStorage.getItem('portfolioTermsAccepted')) {
      var next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace('./disclaimer.html?next=' + next);
    }
  } catch(e) { /* localStorage unavailable — do not block */ }
})();
```

### Pattern 2: Lemon Squeezy License Key Activation (first use, requires internet)
**What:** On first app launch after T&C acceptance, show license key entry screen. Call Lemon Squeezy License API `/v1/licenses/activate` with the key and a generated `instance_name`. Store the returned `instance_id` + key in localStorage. Validate `meta.store_id` and `meta.product_id` against hardcoded values to prevent cross-product key abuse.
**When to use:** Only once, at first launch.

```javascript
// Source: https://docs.lemonsqueezy.com/api/license-api/activate-license-key
async function activateLicenseKey(key) {
  const instanceName = 'sessions-garden-' + Date.now();
  const resp = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ license_key: key, instance_name: instanceName })
  });
  const data = await resp.json();
  if (!data.activated) throw new Error(data.error || 'Activation failed');
  // Verify this key belongs to our product
  if (data.meta.store_id !== STORE_ID || data.meta.product_id !== PRODUCT_ID) {
    throw new Error('License key does not belong to this product');
  }
  // Store for offline daily use
  localStorage.setItem('portfolioLicenseKey', key);
  localStorage.setItem('portfolioLicenseInstance', data.instance.id);
  localStorage.setItem('portfolioLicenseActivated', '1');
  return data;
}
```

**Offline daily validation** (no internet needed after activation):
```javascript
// Source: Standard localStorage pattern
function isLicensed() {
  return localStorage.getItem('portfolioLicenseActivated') === '1'
    && !!localStorage.getItem('portfolioLicenseInstance');
}
```

**Device limit recommendation:** Set activation_limit to **3** in Lemon Squeezy product settings. Reasoning: the app is a PWA that may be installed on phone + tablet + desktop. Limit of 1 creates too many support inquiries. Limit of 3 covers real-world multi-device usage while remaining restrictive enough to prevent casual sharing. If a user exceeds the limit, the error message should say: "You have reached the device limit for this license. To activate on a new device, deactivate an existing one via [support email]." This minimizes support burden per the user's priority.

### Pattern 3: Service Worker — Cache-First for All Static Assets
**What:** On install, precache all app HTML/CSS/JS/font files. On fetch, serve from cache first. On activate, delete old cache versions. Updates happen silently via cache version bump in `sw.js`.
**Critical rule:** Service workers intercept only HTTP requests. They CANNOT access or affect IndexedDB. Data is always safe.

```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching
const CACHE_NAME = 'sessions-garden-v1';
const PRECACHE_URLS = [
  '/', '/index.html', '/sessions.html', '/add-client.html',
  '/add-session.html', '/reporting.html', '/disclaimer.html', '/landing.html',
  '/assets/tokens.css', '/assets/app.css',
  '/assets/app.js', '/assets/db.js', '/assets/i18n.js',
  '/assets/i18n-en.js', '/assets/i18n-he.js', '/assets/i18n-de.js', '/assets/i18n-cs.js',
  '/assets/overview.js', '/assets/sessions.js', '/assets/add-client.js',
  '/assets/add-session.js', '/assets/reporting.js',
  '/assets/fonts/Rubik-Variable.woff2', '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
```

**Update strategy:** Silent update. When `sw.js` is updated (new `CACHE_NAME` version string), the new service worker installs in background and activates when all tabs are closed. No notification banner needed for a productivity app. Data is never at risk because only HTTP-layer resources are cached. `self.skipWaiting()` is intentionally omitted — we do NOT force immediate takeover, which could cause a half-old-half-new state if the user has multiple tabs open.

### Pattern 4: PWA Manifest
**What:** A `manifest.json` at the root declares the app as installable.

```json
{
  "name": "Sessions Garden",
  "short_name": "Sessions Garden",
  "description": "Therapeutic session tracking for energy healing practitioners",
  "start_url": "/index.html",
  "scope": "/",
  "display": "standalone",
  "background_color": "#faf7f2",
  "theme_color": "#2d6a4f",
  "lang": "en",
  "icons": [
    { "src": "/assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**iOS Safari note:** Safari does not show an automatic install prompt. Users must use Share > Add to Home Screen manually. Show custom inline guidance for iOS. Detect iOS via `navigator.userAgent` or the absence of `window.BeforeInstallPromptEvent`. Show a one-time dismissible banner: "Install Sessions Garden: tap [share icon] then 'Add to Home Screen'" — only when not already running in standalone mode (`window.matchMedia('(display-mode: standalone)').matches`).

**Register service worker** from each app page:
```html
<!-- Source: MDN PWA docs -->
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () =>
      navigator.serviceWorker.register('/sw.js')
    );
  }
</script>
```

### Pattern 5: Acceptance Receipt Download
**What:** After T&C acceptance, offer a plain-text `.txt` file download as proof. No PDF needed — text is simpler, more portable, and works offline.

```javascript
// Source: Standard Blob/createObjectURL pattern
function downloadAcceptanceReceipt(lang, licenseKey) {
  const timestamp = new Date().toISOString();
  const content = [
    'Sessions Garden — Terms Acceptance Receipt',
    '==========================================',
    'Accepted: ' + timestamp,
    'Language: ' + lang,
    licenseKey ? ('License Key: ' + licenseKey) : '',
    '',
    'The user accepted the Sessions Garden Terms of Use and Privacy Disclosure.',
    'This document serves as personal record of acceptance.',
    'This receipt is non-transferable and personal to the purchaser.',
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sessions-garden-acceptance-' + timestamp.slice(0, 10) + '.txt';
  a.click();
  URL.revokeObjectURL(url);
}
```

**Receipt format decision:** Plain text (.txt) over PDF. Reasons: no library dependency, works offline, simpler to generate and verify, user can email it to themselves easily.

### Anti-Patterns to Avoid
- **Never call `skipWaiting()` without `clients.claim()`**: causes service worker to control pages that loaded with different asset versions
- **Never store license key decisions in sessionStorage**: survives page load but not app restart — use localStorage
- **Never rely on the service worker being present for the disclaimer gate**: the gate must work even if SW fails to register (use the inline `<script>` localStorage check)
- **Never call Lemon Squeezy validate on every app launch**: the instance_id in localStorage is sufficient for offline daily use. Only validate via API if the user explicitly re-enters their key.
- **Never hardcode product price in app code**: only in Lemon Squeezy dashboard (where Lemon Squeezy handles currency conversion automatically)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| EU VAT handling | Custom VAT calculator | Lemon Squeezy (already decided) | VAT rules differ per EU country and change regularly |
| License key generation | Custom HMAC/UUID system | Lemon Squeezy dashboard | Lemon Squeezy handles key delivery, status tracking, revocation |
| Impressum text | Write from scratch | eRecht24 generator + review | German TMG §5 requirements are precise; generators are lawyer-reviewed |
| Datenschutzerklärung | Write from scratch | AdSimple or eRecht24 generator | GDPR Art. 13/14 coverage requires specific clauses |
| Service worker framework | Custom cache management | Vanilla pattern above (Workbox is overkill for a no-build project) | Workbox requires a build pipeline; vanilla covers all needs here |
| PDF receipt | PDFKit or jsPDF | Plain text .txt Blob download | Zero dependency, works offline, equally valid legally |

**Key insight:** This phase is integration work — assembling existing tools (Lemon Squeezy, Cloudflare Pages, legal generators) around the existing app. Custom code should be minimal.

---

## Common Pitfalls

### Pitfall 1: Service Worker Scope
**What goes wrong:** Service worker registered at `/assets/sw.js` only controls requests under `/assets/`, not the whole app.
**Why it happens:** SW scope defaults to the directory it lives in.
**How to avoid:** Place `sw.js` at the project root `/sw.js`. Register with `navigator.serviceWorker.register('/sw.js')`.
**Warning signs:** App works online but not offline; DevTools > Application > Service Workers shows scope as `/assets/`.

### Pitfall 2: Cloudflare Pages Not Serving Updated Files (Cache Headers)
**What goes wrong:** Users see old JS/CSS after deployment because browser caches the old files.
**Why it happens:** Cloudflare Pages serves static files with long cache TTLs by default.
**How to avoid:** The service worker's cache versioning handles this for installed users. For first-time visitors: Cloudflare Pages automatically sets `Cache-Control: max-age=0` on HTML files and longer TTLs on hashed assets. Since this project has no asset hashing (no build step), add a `_headers` file to the root:
```
/*.html
  Cache-Control: no-cache
/*.js
  Cache-Control: public, max-age=86400
/*.css
  Cache-Control: public, max-age=86400
```

### Pitfall 3: Disclaimer Gate Race Condition
**What goes wrong:** App JS runs before the gate redirect fires, exposing app content briefly.
**Why it happens:** Gate check script placed at bottom of `<body>` or deferred.
**How to avoid:** Gate check must be the very first `<script>` in `<head>`, synchronous (no `defer`/`async`), inline (no external file load delay). `window.location.replace()` (not `href`) so back-button doesn't loop back to the app.

### Pitfall 4: Lemon Squeezy Cross-Product Key Abuse
**What goes wrong:** A user enters a valid Lemon Squeezy key from a different product and it activates.
**Why it happens:** License API `/v1/licenses/activate` accepts any valid LS key.
**How to avoid:** After activation, verify `data.meta.store_id === YOUR_STORE_ID && data.meta.product_id === YOUR_PRODUCT_ID`. Hard-code these values in `license.js` (they are not secret).

### Pitfall 5: iOS PWA Install Prompt
**What goes wrong:** Users on iOS never discover they can install the app.
**Why it happens:** iOS Safari has no `beforeinstallprompt` event — the install is entirely manual.
**How to avoid:** Show a dismissible install guidance banner on iOS when not already in standalone mode. Detect with: `!window.matchMedia('(display-mode: standalone)').matches && /iP(hone|ad|od)/.test(navigator.userAgent)`.

### Pitfall 6: Widerrufsrecht Checkbox Wording
**What goes wrong:** Disclaimer uses general "I agree to terms" language and doesn't specifically address the withdrawal right waiver.
**Why it happens:** Developer not aware of §356 Abs. 5 BGB requirement.
**How to avoid:** Use a **separate dedicated checkbox** with the exact LG Karlsruhe-compliant text (see Legal Text section below). This checkbox must be unchecked by default and the "Accept" button must remain disabled until it is checked.

---

## Legal Text Reference

### German Widerrufsrecht Checkbox (LEGL-03 — CRITICAL)
Per LG Karlsruhe ruling (2022, §356 Abs. 5 BGB), the required combined declaration checkbox text is:

**German (canonical):**
"Ich stimme der Vertragsausführung vor Ablauf der Widerrufsfrist zu und weiß, dass dadurch mein Widerrufsrecht erlischt."

**Translation for other language versions:**
- EN: "I agree to the execution of the contract before the expiry of the withdrawal period and acknowledge that my right of withdrawal expires upon commencement of the download/access."
- HE: "אני מסכים/ה לביצוע החוזה לפני תום תקופת הביטול, ומאשר/ת שזכות הביטול שלי פוקעת בעת תחילת הגישה למוצר."
- CS: "Souhlasím s plněním smlouvy před uplynutím lhůty pro odstoupení od smlouvy a beru na vědomí, že tím zaniká mé právo na odstoupení od smlouvy."

**Requirements:**
- Separate checkbox (not the general "I accept" checkbox)
- Unchecked by default
- "Accept" button disabled until this checkbox AND general terms checkbox are both checked
- The checkbox must be visible without scrolling past it OR clearly labeled in a sectioned layout

### Impressum Required Fields (DDG §5 / TMG §5)
Use **eRecht24 generator** (https://www.e-recht24.de/impressum-generator.html) with:
- Full name (Sapir's full legal name)
- Full address (street, city, postal code, country)
- Email address (contact email)
- Phone number (optional but recommended for completeness)
- No VAT-ID needed until annual turnover exceeds 22,000 EUR (Kleinunternehmerregelung)
- Must be reachable within max 2 clicks from any page

### Datenschutzerklärung Coverage Required
Use **AdSimple generator** (https://www.adsimple.de/datenschutz-generator/) or eRecht24 privacy generator. Configure for:
- No user accounts, no registration
- No analytics, no tracking
- No cookies (or only essential/localStorage)
- No contact form (if not present)
- Local data storage only (IndexedDB — user's device, developer has zero access)
- Hosting: Cloudflare Pages (disclose as hosting provider)
- Right to access, deletion per GDPR Art. 17 (user controls their own local data)

---

## Code Examples

### Disclaimer Gate (inline script, each app HTML page)
```html
<!-- Source: Standard gate pattern — first script in <head> -->
<script>
  (function() {
    try {
      if (!localStorage.getItem('portfolioTermsAccepted')) {
        var next = encodeURIComponent(window.location.pathname);
        window.location.replace('./disclaimer.html?next=' + next);
      }
    } catch(e) { /* private browsing / localStorage unavailable — allow access */ }
  })();
</script>
```

### License Gate (inline, each app HTML page — runs after terms check)
```html
<script>
  (function() {
    try {
      if (localStorage.getItem('portfolioTermsAccepted') &&
          !localStorage.getItem('portfolioLicenseActivated')) {
        window.location.replace('./license.html');
      }
    } catch(e) {}
  })();
</script>
```

### Cloudflare Pages Deployment Configuration
No `wrangler.toml` needed for a simple static site. Settings in Cloudflare dashboard:
- **Build command:** `exit 0` (or leave blank)
- **Build output directory:** `/` (root — since all HTML files are at root)
- **Root directory:** `/`
- No environment variables needed

Add `_headers` file to root for cache control (see Pitfall 2 above).

### manifest.json (complete)
Colors use existing design token values from `tokens.css`:
- background_color `#faf7f2` = `--color-bg` in light mode
- theme_color `#2d6a4f` = `--color-primary`

### Service Worker Registration (add to each HTML page)
```html
<!-- Source: MDN PWA — add before closing </body> tag -->
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').catch(function(err) {
        console.warn('SW registration failed:', err);
      });
    });
  }
</script>
```

---

## Pricing Recommendation

**Recommended price: EUR 49 (one-time lifetime license)**

Rationale:
- Comparable one-time indie tool licenses: XYplorer $69.95, niche productivity tools $29–$99
- Subscription alternatives (SimplePractice, etc.) cost $39–$149/month — a lifetime license at EUR 49 is compelling "pay once" value
- EUR 49 is below the psychological "I need to think about it" threshold for solo practitioners
- Lemon Squeezy handles EUR → ILS/CZK/USD currency conversion automatically
- Lemon Squeezy fee: 5% + $0.50 = ~EUR 3 per sale, leaving ~EUR 46 net
- If the user wants to test market response: start at EUR 29, raise to EUR 49 after first 10 sales

**Activation limit:** 3 devices per license key (see Pattern 2 rationale above).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| App-cached service worker (AppCache) | Service Worker API | 2015–2017 | AppCache deprecated and removed; all modern browsers use SW |
| BeforeInstallPrompt for iOS | Manual Share > Add to Home Screen | iOS 16.4+ | iOS still has no automatic install prompt; manual guidance required |
| Separate payment + key management | Merchant of Record (Lemon Squeezy) | ~2021+ | MoR handles EU VAT, key delivery, receipts — no backend needed |
| wrangler.toml required for CF Pages | Dashboard-only setup still works | 2023+ | wrangler.toml now optional for Pages; plain dashboard config is simpler |

**Deprecated/outdated:**
- AppCache: removed from all browsers; do not use
- `window.caches` polyfills: not needed; Cache API is supported in all modern browsers including iOS Safari 11.1+

---

## Open Questions

1. **License key re-entry after localStorage clear**
   - What we know: If a user clears localStorage (or uses a new device), they lose their activation record
   - What's unclear: Should the app prompt for re-entry gracefully, or silently re-validate via the stored key?
   - Recommendation: Store both `portfolioLicenseKey` (the key string) and `portfolioLicenseActivated` flag. If flag is missing but key is present, attempt silent re-validation via Lemon Squeezy validate endpoint. If no key is present, show the license entry screen with a message explaining they may need to re-activate.

2. **Disclaimer text re-accessibility after acceptance**
   - What we know: No specific legal requirement forces ongoing accessibility post-acceptance
   - What's unclear: Is it better UX to always show terms in Settings, or is one-time-only acceptable?
   - Recommendation: Add a "Terms of Use" link in the footer/settings that opens `disclaimer.html` in read-only mode (skip the gate, show only the text). This is low cost, builds trust, and avoids any ambiguity.

3. **Exact Lemon Squeezy store_id and product_id**
   - What we know: These values are obtained after creating the product in Lemon Squeezy dashboard
   - What's unclear: Values not yet known (account setup is deferred)
   - Recommendation: The planner should create a task that includes hardcoding these constants in `license.js` after Lemon Squeezy product is created. This is a blocking dependency for the license gate plan.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None yet (FOUND-05 / Playwright deferred to Phase 6) |
| Config file | None — see Wave 0 |
| Quick run command | Manual browser test (no automated framework available) |
| Full suite command | Manual browser test |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEGL-01 | Disclaimer gate blocks app page without acceptance | manual-smoke | Open index.html without localStorage flag, verify redirect | ❌ Wave 0 |
| LEGL-01 | Disclaimer gate passes through after acceptance | manual-smoke | Set `portfolioTermsAccepted=1` in localStorage, verify app loads | ❌ Wave 0 |
| LEGL-02 | Receipt downloads as .txt file | manual-smoke | Accept terms, verify download dialog appears | ❌ Wave 0 |
| LEGL-03 | Widerrufsrecht checkbox present and required | manual-visual | Inspect disclaimer.html, verify checkbox exists and is unchecked | ❌ Wave 0 |
| DIST-03 | Invalid license key shows clear error | manual-smoke | Enter bogus key, verify error message | ❌ Wave 0 |
| DIST-03 | Valid license key activates and stores instance | manual-smoke | Enter real key, verify localStorage populated | ❌ Wave 0 |
| DIST-04 | App loads offline after first visit | manual-smoke | Visit once, go offline (DevTools), reload — verify app loads | ❌ Wave 0 |
| DIST-04 | App is installable (manifest + SW registered) | manual-smoke | Check DevTools > Application > Manifest shows valid | ❌ Wave 0 |
| DIST-05 | Landing page renders in 4 languages | manual-visual | Switch language selector on landing.html, verify translations | ❌ Wave 0 |
| DIST-05 | Cloudflare Pages auto-deploys on push | manual-infra | Push commit, verify Pages build log succeeds | ❌ Wave 0 |

**All tests are manual** — Playwright test infrastructure is deferred to Phase 6 (FOUND-05). Phase 5 verifies via direct browser inspection.

### Sampling Rate
- **Per task commit:** Manual browser smoke test for that task's requirement
- **Per wave merge:** Full manual checklist — gate, receipt, SW offline, manifest, license, landing page
- **Phase gate:** Full suite passing before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] No automated test framework — Phase 6 will add Playwright
- [ ] Manual test checklist should be documented in verification plan

*(All testing is manual for this phase — consistent with Phase 6 owning automated testing)*

---

## Sources

### Primary (HIGH confidence)
- https://docs.lemonsqueezy.com/api/license-api/activate-license-key — activation endpoint parameters, instance concept
- https://docs.lemonsqueezy.com/api/license-api/validate-license-key — validate endpoint, no auth key needed
- https://docs.lemonsqueezy.com/guides/tutorials/license-keys — recommended validation flow, store/product ID verification
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching — vanilla JS service worker cache-first pattern
- https://developers.cloudflare.com/pages/framework-guides/deploy-anything/ — static site deployment, `exit 0` build command
- https://www.gesetze-im-internet.de/bgb/__356.html — §356 BGB official text

### Secondary (MEDIUM confidence)
- https://shopbetreiber-blog.de/2022/07/11/lg-karlsruhe-zum-erloeschen-des-widerrufsrechts-bei-digitalen-inhalten — LG Karlsruhe ruling analysis, checkbox text requirements (German legal blog, verified against §356 BGB text)
- https://www.e-recht24.de/impressum-generator.html — Impressum generator (lawyer-reviewed, established German legal site)
- https://www.adsimple.de/datenschutz-generator/ — Datenschutzerklärung generator (GDPR-focused, Germany)
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable — iOS PWA install limitations

### Tertiary (LOW confidence — for pricing only)
- XYplorer pricing page ($69.95) — used as market benchmark for one-time indie tools
- General indie software pricing analysis — pricing recommendation is inherently subjective

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools (Lemon Squeezy, Cloudflare Pages, Web APIs) verified against official docs
- Architecture: HIGH — gate pattern, service worker, manifest are standard Web Platform patterns
- Legal text: MEDIUM — LG Karlsruhe checkbox text verified against German legal blog + §356 BGB statute; always recommend Sapir has a German-speaking advisor review final text before launch
- Pitfalls: HIGH — SW scope, gate race condition, cross-product key abuse are verified real issues from official documentation
- Pricing: LOW — market comparison only; pricing is ultimately Sapir's decision

**Research date:** 2026-03-12
**Valid until:** 2026-06-12 (stable stack — Lemon Squeezy API, Web Platform APIs, Cloudflare Pages all stable)
