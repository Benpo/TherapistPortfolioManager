# Phase 14: i18n bugs, legal footer cleanup, and contact email update - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix 8 specific bugs/issues across the landing page and disclaimer page: i18n language persistence, untranslated strings, German legal term in Hebrew, resizable demo window, footer legal restructuring, contact email unification, license button visibility, and language selector modernization.

</domain>

<decisions>
## Implementation Decisions

### Language persistence between pages
- **D-01:** The `portfolioLang` localStorage key is already shared across all pages. The bug is that navigating from the Hebrew disclaimer back to the app resets to English. Root cause investigation needed during planning — likely the redirect in `index.html` lines 5-8 doesn't preserve the lang param, or disclaimer.js doesn't write back to localStorage on acceptance.

### Untranslated hero trust badges
- **D-02:** `landing.html:90` has hardcoded `Launch pricing · One-time purchase · Lifetime license` with no i18n ID. Fix: add an ID, add translations to the `LANDING_I18N` object in `landing.js` for all 4 languages, and wire via `setText()`.

### German legal term in Hebrew disclaimer
- **D-03:** `i18n-disclaimer.js:104` shows `זכות ביטול (Widerrufsrecht)` — remove the German parenthetical from the Hebrew version entirely. Keep just `זכות ביטול`. The English version can keep `(Widerrufsrecht)` as it's informational for EU context. Czech version should also drop it if present.

### Demo window resizing
- **D-04:** Custom resize handles on both edges (not CSS `resize: both`). Implement drag handles with pointer events. Also increase the default height slightly from 600px. Mobile stays fixed (no resize on touch).

### Footer legal links → dedicated pages
- **D-05:** Move Impressum and Datenschutz from inline `<details>` accordions in `landing.html` to dedicated `impressum.html` and `datenschutz.html` pages. Footer shows simple links. New pages use the same `portfolioLang` mechanism for language switching. Add both pages to `sw.js` PRECACHE_URLS. Remove the ~160 lines of accordion HTML from `landing.html`.
- **D-06:** Footer link text must match the active language. Currently Hebrew footer shows "Impressum" (German). Each footer link label must come from i18n — `footerImpressum` and `footerPrivacy` already exist in LANDING_I18N, so just ensure the dedicated page links use these translated labels.

### Contact email unification
- **D-07:** Use `contact@sessionsgarden.app` everywhere. Replace `contact@sessions.garden` in landing.html and `support@sessionsgarden.app` in license.js (all 4 language variants). Single address for all purposes.

### License button visibility (header)
- **D-08:** The header "Already have a license?" link (`landing-enter-link` class) needs: larger font size, visible background color (e.g., semi-transparent white or accent), padding to make it button-like. The pricing section version stays as-is.

### Language selector modernization
- **D-09:** Replace the native `<select>` dropdown with a globe icon button that opens a small popover. Popover shows 4 language options with native names (English, עברית, Deutsch, Čeština). Click-outside-to-close. Current language highlighted. Simple implementation: ~30 lines JS for toggle/close, CSS for popover positioning.

### Claude's Discretion
- Exact resize handle styling and drag implementation details
- Globe icon design (SVG inline or emoji)
- Popover animation (fade, slide, or instant)
- Impressum/Datenschutz page layout and styling (should match existing page patterns like disclaimer.html)
- Exact button styling for the license CTA in header

</decisions>

<specifics>
## Specific Ideas

- Demo window resize should have visible handles on both edges — not subtle, users should see they can resize
- Language popover: modern, clean — not a dropdown replacement that looks the same
- License button: "much bigger" and "more visible" — treat it as a real CTA, not a subtle link

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements are fully captured in decisions above.

### Key source files
- `assets/landing.js` — LANDING_I18N object (lines 20-425), `applyLang()` (line 457), `setText()` calls (lines 460-585)
- `assets/landing.css` — demo window styles (lines 1051-1123), footer styles, pricing-license-link (lines 613-623)
- `assets/i18n-disclaimer.js` — disclaimer translations for all 4 languages
- `assets/app.js` — app-side language persistence (line 117)
- `assets/license.js` — support email references in all 4 languages
- `landing.html` — hero trust badges (line 90), header actions (lines 37-45), legal accordion (lines 366-530), footer (lines 539-551)
- `sw.js` — PRECACHE_URLS list (lines 19-60)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `setText()` / `setText2()` in landing.js — established i18n wiring pattern, use for new translatable elements
- `LANDING_I18N` object — already has `footerImpressum`, `footerPrivacy`, `footerTerms` translations for all 4 languages
- `detectLang()` in disclaimer.js — URL param + localStorage + browser fallback chain, reuse pattern for new pages

### Established Patterns
- Multi-page architecture with shared localStorage for state (`portfolioLang`, `portfolioTermsAccepted`, etc.)
- Legal pages follow disclaimer.html pattern: standalone HTML with own CSS/JS, language detection on load
- All pages are listed in sw.js PRECACHE_URLS for offline support

### Integration Points
- New impressum.html and datenschutz.html must be added to sw.js PRECACHE_URLS
- Footer links in landing.html currently use anchor scrolls (`#footer-impressum-toggle`) — change to page links
- Demo iframe styles in landing.css need resize handle additions
- Header actions div (landing.html:37-45) contains both language selector and license button

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update*
*Context gathered: 2026-03-23*
