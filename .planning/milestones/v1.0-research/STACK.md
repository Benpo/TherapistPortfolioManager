# Technology Stack

**Project:** TherapistPortfolioManager
**Researched:** 2026-03-09
**Mode:** Ecosystem (enhancement of existing vanilla JS app)

## Recommended Stack

The guiding principle: **keep zero npm runtime dependencies**. The app's strength is simplicity -- ~50KB, no build step, works from `file://`. Every recommendation below preserves that. The only npm usage is for dev-time testing tooling, which never ships to users.

### Core (Unchanged)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vanilla ES6+ JavaScript | ES2020+ | App logic | Already in place. No framework needed for this app's complexity. Avoid React/Vue/Svelte -- they add build steps, bundle size, and maintenance burden for a non-technical maintainer (Sapir). |
| HTML5 | - | Page structure | Multi-page architecture works well. No SPA router needed. |
| CSS3 with Custom Properties | - | Styling + theming | Already using `:root` vars. Extend for dark mode and garden theme. |
| IndexedDB | - | Data persistence | Already in place. Scales to hundreds of MB. Perfect for local-only model. |

### Theming System (New)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| CSS Custom Properties | Native | Design tokens for light/dark themes | Already partially in place (`:root` vars). Extend with `html[data-theme="dark"]` overrides. No library needed. **HIGH confidence** |
| `color-scheme` CSS property | Native | Native form element theming | Tells browser to style scrollbars, inputs, selects in dark mode natively. One line: `color-scheme: light dark;`. **HIGH confidence** |
| CSS `light-dark()` function | Native | Simplified color declarations | Modern CSS function: `color: light-dark(#333, #eee)`. Supported in Chrome 123+, Firefox 120+, Safari 17.5+. Consider as progressive enhancement only -- the `[data-theme]` approach is the primary mechanism for broader compat. **MEDIUM confidence** (newer feature) |
| `prefers-color-scheme` media query | Native | Respect OS dark mode preference | Detect system preference, apply if user hasn't set explicit choice. **HIGH confidence** |
| localStorage | Native | Persist theme choice | Same pattern already used for language (`portfolioLang`). Add `portfolioTheme`. **HIGH confidence** |

**Theme toggle priority cascade:**
1. User's explicit choice (localStorage) -- highest
2. OS system preference (`prefers-color-scheme`) -- fallback
3. Light theme -- default

**FOUC prevention:** Place theme-detection script in `<head>` before CSS loads. ~5 lines of inline JS that reads localStorage and sets `data-theme` attribute on `<html>` before first paint.

### Internationalization (Enhanced)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Custom i18n system | In-house | Translation management | Already built (`assets/i18n.js`, `App.t()`, `data-i18n` attributes). Extend from 2 to 4 languages. No library needed -- the existing pattern is clean and sufficient. **HIGH confidence** |
| CSS Logical Properties | Native | RTL layout without duplicate CSS | Replace `margin-left` with `margin-inline-start`, `padding-right` with `padding-inline-end`, etc. One set of CSS rules works for both LTR and RTL. Fully supported in all modern browsers (Chrome 87+, Firefox 66+, Safari 14.1+). **HIGH confidence** |
| `dir` attribute | Native | Document direction | Already implemented. Hebrew = `rtl`, others = `ltr`. |
| Separate translation files | - | Maintainability | Split `i18n.js` into per-language files (`i18n/en.js`, `i18n/he.js`, `i18n/de.js`, `i18n/cs.js`). Keeps each file manageable and allows Sapir to edit translations independently. Load all via `<script>` tags -- no dynamic import needed. |

**i18n architecture for 4 languages:**
```
assets/i18n/en.js   -> window.I18N.en = { ... }
assets/i18n/he.js   -> window.I18N.he = { ... }
assets/i18n/de.js   -> window.I18N.de = { ... }
assets/i18n/cs.js   -> window.I18N.cs = { ... }
```
Each file is a simple key-value object. No build step. Sapir can edit any file directly.

**RTL languages:** Only Hebrew. The existing `dir` attribute toggle handles this. CSS logical properties eliminate the need for separate RTL stylesheets.

### Fonts (Changed)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Self-hosted WOFF2 fonts | - | Rubik + Nunito (or replacement) | **Replace Google Fonts CDN** with self-hosted files. Required for offline/PWA support, eliminates external network dependency, avoids GDPR concerns about Google tracking. Download from [google-webfonts-helper](https://gwfh.mranftl.com/fonts/rubik). WOFF2 only -- supported in all target browsers, ~30% smaller than WOFF. **HIGH confidence** |

**Font file placement:**
```
assets/fonts/rubik-400.woff2
assets/fonts/rubik-600.woff2
assets/fonts/rubik-700.woff2
assets/fonts/nunito-400.woff2
assets/fonts/nunito-600.woff2
assets/fonts/nunito-700.woff2
assets/fonts/nunito-800.woff2
```
Total size: ~150KB for all weights. Comparable to the Google Fonts download but without the external request.

### Testing (New -- Dev Only)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Playwright | Latest (1.50+) | End-to-end browser testing | Tests the app as users experience it -- clicks buttons, fills forms, checks IndexedDB. Framework-agnostic, works with static HTML files served from localhost. The only testing tool that makes sense for a no-build vanilla JS app. **HIGH confidence** |
| Python `http.server` | Built-in | Serve static files for tests | Zero-install local server. Playwright's `webServer` config can auto-start it. Avoids adding a Node.js server dependency. Alternative: `npx serve` if Python isn't available. **HIGH confidence** |

**Why Playwright over alternatives:**
- **Jest/Vitest**: Unit test runners. They can't test DOM interactions, IndexedDB, or multi-page navigation. The app has no importable modules (IIFEs on `window`), so unit testing the JS directly is awkward.
- **Cypress**: Similar capability but heavier, slower, and more opinionated. Playwright is faster and has better multi-browser support.
- **Manual testing**: Not sustainable as the app grows. Automated tests catch regressions.

**Test scope:** Focus on critical paths -- client CRUD, session CRUD, data import/export, language switching, theme toggle. Not 100% coverage.

**npm usage:** Playwright requires npm to install (`npm init playwright@latest`). This is acceptable because:
1. It's dev-only -- nothing ships to users
2. `node_modules/` stays in `.gitignore` (or a separate `tests/` directory)
3. Sapir doesn't need to run tests -- Ben/Claude handle it

### PWA / Offline (New)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Service Worker | Native | Offline caching | Cache-first strategy for all static assets. The app is already offline-capable via IndexedDB, but a service worker ensures the HTML/CSS/JS files themselves load without network. ~30 lines of JS. **HIGH confidence** |
| Web App Manifest | Native | Installability | `manifest.json` with app name, icons, theme color, `display: standalone`. Enables "Add to Home Screen" on mobile and desktop. **HIGH confidence** |
| Cache API | Native | Asset caching | Used by service worker. Version the cache name for clean updates. **HIGH confidence** |

**Caching strategy:** Cache-first with versioned cache name. When the app updates, bump the cache version, service worker activates, old cache is deleted, new assets are fetched. Simple and predictable for a static app.

**What this enables:**
- Install as "app" on phone/desktop (no app store)
- Works fully offline after first visit
- Updates automatically when user is online

### Distribution & Payment (New)

| Technology | Purpose | Cost | Why |
|------------|---------|------|-----|
| **Cloudflare Pages** | Hosting | Free (unlimited bandwidth, 500 builds/month) | Best free tier for static sites. Unlimited bandwidth eliminates cost anxiety. Global edge network for fast delivery to Israel, Germany, Czech Republic. **HIGH confidence** |
| **Lemon Squeezy** | Payment processing | 5% + $0.50 per transaction | Merchant of Record -- handles VAT/GST globally, so Ben doesn't need to register for VAT in multiple countries. One-time purchase model supported. Checkout overlay or redirect. Post-purchase redirect to the app URL. **MEDIUM confidence** (needs implementation testing) |

**Distribution model options (ranked):**

1. **Recommended: Password/code-gated PWA** -- Lemon Squeezy sends a unique access code after purchase. Landing page at `yourapp.com` requires the code. Once entered, the PWA installs and works offline forever. Simple, no backend needed. The "gate" is just a localStorage flag + the code validation can be a simple hash check in JS.

2. **Alternative: Direct download** -- Lemon Squeezy delivers a ZIP file containing the entire app. User opens `index.html` from their filesystem. Works with `file://` protocol (already supported). No hosting needed after purchase. Downside: no automatic updates.

3. **Alternative: Hosted with obscure URL** -- After purchase, redirect to a non-guessable URL (e.g., `app.yoursite.com/v1/abc123`). Security through obscurity -- not ideal but simple.

**Cost analysis for one-time sale at EUR 49:**
- Lemon Squeezy fee: ~EUR 2.95 (5% + $0.50)
- Hosting: EUR 0 (Cloudflare Pages free tier)
- Domain: ~EUR 10/year
- **Net per sale: ~EUR 46**
- **Ongoing cost: ~EUR 10/year** (domain only)

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| React / Vue / Svelte | Adds build step, bundle size, npm dependencies. The app is 5 pages with forms and lists -- vanilla JS handles this fine. Would make Sapir's maintenance impossible. |
| Tailwind CSS | Requires build step (PostCSS). The app's CSS is already well-structured with custom properties. Adding Tailwind means npm, config files, and a build pipeline. |
| Bootstrap / Material | Heavyweight CSS frameworks that override your design. The garden theme is custom -- a framework would fight it. |
| i18next / FormatJS | npm dependencies for i18n. The existing custom system works. These libraries solve problems (plurals, ICU message format, date formatting) that this app doesn't have. |
| Firebase / Supabase | Backend services. Violates the local-only constraint and adds GDPR complexity. |
| Electron / Tauri | Desktop app wrappers. Massive overhead (Electron = 100MB+). A PWA achieves "installed app" feel at 0 additional size. Reassess only if desktop-specific features (file system access) become required. |
| Capacitor / Cordova | Mobile app wrappers. Same argument as Electron. PWA works on mobile. App store distribution adds review overhead and 30% commission. |
| TypeScript | Requires build step. The codebase is small enough that vanilla JS with good structure is manageable. TypeScript's value shines in larger codebases with multiple developers. |
| Vite / Webpack / Parcel | Build tools. The app has no build step and shouldn't get one. Every file is directly served as-is. |
| Stripe (direct) | Requires backend for webhook handling and session management. Lemon Squeezy wraps Stripe and acts as MoR, eliminating backend needs. |
| Gumroad | 10% + $0.50 per transaction -- double the fee of Lemon Squeezy. Less suitable for software products. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Hosting | Cloudflare Pages | Netlify | Both are excellent. Cloudflare wins on unlimited bandwidth (Netlify caps at 100GB free) and slightly better global performance. For a low-traffic app, either works. |
| Hosting | Cloudflare Pages | Vercel | Vercel is React/Next.js-focused. Overkill for static files. |
| Hosting | Cloudflare Pages | GitHub Pages | Slower, no edge network, fewer features. But viable as a fallback. |
| Payment | Lemon Squeezy | Paddle | Paddle has higher minimums and is more SaaS-focused. Lemon Squeezy is better for indie digital products. |
| Payment | Lemon Squeezy | Payhip | Lower fees (5% on free plan) but less polished checkout experience and no EU VAT handling as MoR. |
| Testing | Playwright | Cypress | Slower, larger install, less multi-browser support. Playwright is the modern standard. |
| Testing | Playwright | Puppeteer | Lower-level, no built-in test runner. Playwright is Puppeteer's successor by the same team. |
| i18n | Custom (extend existing) | vanilla-i18n library | Adding a CDN dependency for something the app already does. The existing `App.t()` + `data-i18n` pattern is identical to what vanilla-i18n provides. |
| Dark mode | CSS custom properties | Separate dark.css file | Duplicate CSS to maintain. Custom properties with `[data-theme]` selectors is cleaner and the modern standard. |

## Installation

### Production App (no install needed)
```
# The app has zero dependencies.
# Just open index.html in a browser, or deploy to Cloudflare Pages.
```

### Development (testing only)
```bash
# One-time setup for Playwright tests
cd tests/
npm init -y
npm install -D @playwright/test
npx playwright install

# Run tests
npx playwright test

# Run tests with UI (for debugging)
npx playwright test --ui
```

### Font Self-Hosting (one-time)
```bash
# Download from https://gwfh.mranftl.com/fonts/rubik?subsets=latin,hebrew
# Download from https://gwfh.mranftl.com/fonts/nunito?subsets=latin
# Place .woff2 files in assets/fonts/
# Update @font-face declarations in app.css
# Remove Google Fonts @import
```

## Key Implementation Notes

### CSS Logical Properties Migration

The current CSS uses physical properties (`margin-left`, `padding-right`). These should be migrated to logical properties for automatic RTL support:

| Physical (current) | Logical (migrate to) |
|--------------------|---------------------|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `text-align: left` | `text-align: start` |
| `text-align: right` | `text-align: end` |
| `float: left` | `float: inline-start` |
| `border-left` | `border-inline-start` |
| `left` (positioning) | `inset-inline-start` |

This eliminates the need for `body[dir="rtl"]` style overrides entirely.

### Theme Token Structure

```css
:root {
  /* Garden theme - Light */
  --color-bg-primary: #FFF8F0;        /* warm cream */
  --color-bg-card: #FFFFFF;
  --color-text-primary: #2D3B2D;      /* dark garden green */
  --color-text-secondary: #5A6B5A;
  --color-accent: #4A7C59;            /* garden green */
  --color-accent-soft: #E8F0E8;
  --color-accent-warm: #D4854A;       /* orange accent */
  --color-success: #2FB37D;
  --color-danger: #EA4B4B;
  --color-border: #E0D8CC;
  --color-shadow: rgba(45, 59, 45, 0.08);
  color-scheme: light;
}

html[data-theme="dark"] {
  --color-bg-primary: #1A2420;
  --color-bg-card: #243028;
  --color-text-primary: #E8E0D8;
  --color-text-secondary: #A8B0A0;
  --color-accent: #6BA87A;
  --color-accent-soft: #2A3830;
  --color-accent-warm: #E09060;
  --color-success: #3DC88E;
  --color-danger: #F06060;
  --color-border: #384838;
  --color-shadow: rgba(0, 0, 0, 0.3);
  color-scheme: dark;
}
```

### Service Worker Template

```javascript
// sw.js - ~30 lines
const CACHE_NAME = 'therapist-portfolio-v1';
const ASSETS = [
  '/', '/index.html', '/add-client.html', '/add-session.html',
  '/sessions.html', '/reporting.html',
  '/assets/app.css', '/assets/app.js', '/assets/db.js',
  '/assets/i18n/en.js', '/assets/i18n/he.js',
  '/assets/i18n/de.js', '/assets/i18n/cs.js',
  '/assets/overview.js', '/assets/add-client.js',
  '/assets/add-session.js', '/assets/sessions.js',
  '/assets/reporting.js',
  '/assets/fonts/rubik-400.woff2',
  '/assets/fonts/rubik-600.woff2',
  '/assets/fonts/rubik-700.woff2',
  // ... other font files
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
```

## Sources

- [CSS Custom Properties Dark Mode - CSS-Tricks](https://css-tricks.com/a-complete-guide-to-dark-mode-on-the-web/) -- comprehensive dark mode guide
- [Best light/dark mode toggle - whitep4nth3r](https://whitep4nth3r.com/blog/best-light-dark-mode-theme-toggle-javascript/) -- FOUC prevention, localStorage cascade
- [DigitalOcean CSS Theming](https://www.digitalocean.com/community/tutorials/css-theming-custom-properties) -- custom properties for themes
- [CSS Logical Properties - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Logical_properties_and_values/Margins_borders_padding) -- RTL logical properties reference
- [CSS Logical Properties for RTL - Medium](https://medium.com/@dimuthupinsara/mastering-rtl-ltr-layouts-with-css-logical-properties-4bc0fccd2014) -- practical RTL migration
- [Playwright Documentation](https://playwright.dev/) -- test framework
- [Playwright Web Server Config](https://playwright.dev/docs/test-webserver) -- serving static files for tests
- [PWA Service Workers - MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/js13kGames/Offline_Service_workers) -- service worker patterns
- [PWA Tutorial 2025](https://markaicode.com/progressive-web-app-tutorial-2025-service-worker-offline/) -- modern PWA setup
- [Vanilla PWA - DigitalOcean](https://www.digitalocean.com/community/tutorials/js-vanilla-pwa) -- vanilla JS PWA guide
- [Google Webfonts Helper](https://gwfh.mranftl.com/fonts/rubik) -- self-host font files
- [Self-hosting Fonts - Google Fonts](https://fonts.google.com/knowledge/using_type/self_hosting_web_fonts) -- official guidance
- [Cloudflare Pages vs Netlify Comparison](https://www.ai-infra-link.com/vercel-vs-netlify-vs-cloudflare-pages-2025-comparison-for-developers/) -- hosting comparison
- [Lemon Squeezy vs Gumroad Fees](https://userjot.com/blog/stripe-polar-lemon-squeezy-gumroad-transaction-fees) -- payment platform fee comparison
- [Lemon Squeezy Link Variables](https://docs.lemonsqueezy.com/help/products/link-variables) -- post-purchase redirect
- [SitePoint i18n in JavaScript](https://www.sitepoint.com/how-to-implement-internationalization-i18n-in-javascript/) -- vanilla JS i18n patterns
