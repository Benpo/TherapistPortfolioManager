# Phase 12: Launch Prerequisites - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

All legal content is real (not placeholder), the payment product is live, translations are verified by a native-level review, and the app passes a manual QA pass across browsers and devices. This phase does NOT add new features — only replaces placeholders with real content and verifies quality.

</domain>

<decisions>
## Implementation Decisions

### Impressum (LNCH-01)
- Business runs under Sapir's husband's name — Gewerbe needs update to include "Verkauf digitaler Produkte" before launch
- Sapir will provide: full legal name, address, email, phone, Steuernummer via chat when ready
- Claude fills in the Impressum template with real details, replacing current placeholder
- Impressum stays in German only (legal requirement — DDG §5)
- Current placeholder structure in landing.html is correct — just needs real data

### Datenschutzerklärung (LNCH-02)
- Deep research required — Claude must investigate what's legally needed for this specific app type (local-only PWA, no data collection, Cloudflare hosting, Lemon Squeezy payments)
- Final version in German (primary, legally required) AND English (for non-German speakers)
- Current draft in landing.html covers the basics but needs to be comprehensive and legally sound
- Must cover: GDPR Art. 13/14, local-only data model, Cloudflare hosting, Lemon Squeezy as Merchant of Record, no cookies/tracking, localStorage usage, user rights
- Sapir explicitly requested thorough research — "do it properly"

### Lemon Squeezy Product Setup (LNCH-03)
- Account not yet created — Sapir needs to register at lemonsqueezy.com and fill business details
- Product name: "Sessions Garden"
- Product description: short, in English
- Pricing: €119 launch / €159 full (confirmed, same as Phase 5 decision)
- Two buy buttons exist in landing page (Hero + Pricing section) — both need real checkout URL
- Current code has placeholder: `LS_CHECKOUT_URL = 'https://YOURSTORE.lemonsqueezy.com/buy/VARIANT_ID'`
- Claude will provide step-by-step guide for product creation in Lemon Squeezy dashboard

### Translation Verification DE/CS (LNCH-04)
- Claude does deep review of ALL German and Czech translations — both landing page AND app
- Landing page translations: `assets/landing.js` LANDING_I18N object
- App translations: `assets/de.js` and `assets/cs.js`
- Hebrew is the source language — all translations must preserve the same atmosphere and tone
- Key requirements: natural, professional, LOCAL-sounding (not translated-sounding), non-medical terminology
- Must match the warmth and personal feel of the Hebrew original
- Previous decision (Phase 4): avoid trademarked terms, "clinic" → "practice" (Praxe in CS, Praxis in DE), non-medical language throughout
- Previous decision (Phase 4): German uses "Sie" (formal)

### Manual QA Pass (LNCH-06)
- Claude prepares detailed QA checklist — Sapir executes manually
- Available devices: MacBook (Chrome, Safari), Windows PC (Chrome, Firefox, Edge), iPhones (Safari)
- Full browser coverage: Chrome, Firefox, Safari, Edge
- Must test: all 4 languages, RTL Hebrew layout, mobile viewport, dark mode
- Both landing page AND app tested
- Claude fixes any bugs found during QA

### Cleanup
- All TODO placeholders in code must be removed/replaced before launch
- Includes: Impressum placeholder, Datenschutzerklärung TODO note, Lemon Squeezy URL placeholder

### Claude's Discretion
- Exact Datenschutzerklärung structure and completeness (after research)
- Lemon Squeezy product description copy
- QA checklist structure and priority order
- Translation improvements — specific wording choices for DE/CS
- How to structure the checklist for Sapir (by page, by browser, by feature, etc.)

</decisions>

<specifics>
## Specific Ideas

- "אני לא מבינה בזה כלום" — Sapir feels overwhelmed by legal/launch requirements. All instructions must be extremely clear, step-by-step, and in plain language
- "אני רוצה שתעשה על זה ממש מחקר לעומק ושנעשה את זה ממש כמו שצריך" — Datenschutzerklärung must be thoroughly researched, not just template-filled
- "לשמור על שפה דומה באוירה לעברית" — Hebrew is the emotional baseline for all translations. Every language should feel like it was written by someone who speaks it natively
- "שההגדרות לא יהיו רפואיות ויתאימו לסוג השירות הזה" — energy healing terminology, never medical
- Domain: deferred to after launch — start with *.pages.dev, add custom domain anytime later (5 min + ~10€/year)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `landing.html:375-406`: Impressum + Datenschutzerklärung sections with collapsible `<details>` — structure ready, needs real content
- `assets/landing.js:7`: `LS_CHECKOUT_URL` variable — single place to update checkout URL
- `assets/landing.js:471,527`: Two places where buy button URLs are set (hero + pricing)
- `assets/de.js`, `assets/cs.js`: App translation files to review
- `assets/landing.js` LANDING_I18N: Landing page translation object to review
- `assets/i18n-disclaimer.js`: Disclaimer page translations to review

### Established Patterns
- Legal sections use `<details><summary>` collapsible pattern in landing page footer
- Translations use `window.I18N` global with per-language objects
- Landing page translations in separate LANDING_I18N object in landing.js
- All text uses `data-i18n` attributes for DOM binding

### Integration Points
- Impressum/Datenschutzerklärung are in landing.html footer — also linked from footer navigation
- Buy buttons in Hero section (line ~81) and Pricing section (line ~291)
- License validation in `assets/license.js` — connects to Lemon Squeezy API
- Service worker `sw.js` — caches all assets for offline use

</code_context>

<deferred>
## Deferred Ideas

- **Custom domain** — Start with *.pages.dev, add custom domain later (Cloudflare Registrar, ~10€/year, 5-minute setup). Not blocking for launch
- **Gewerbe update** — Sapir and husband need to update business registration before launch. Operational task, not code work

</deferred>

---

*Phase: 12-launch-prerequisites*
*Context gathered: 2026-03-19*
