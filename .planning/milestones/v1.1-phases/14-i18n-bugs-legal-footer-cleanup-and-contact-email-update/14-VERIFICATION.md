---
phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update
verified: 2026-03-23T02:00:00Z
status: passed
score: 22/22 must-haves verified
re_verification: true
  previous_status: passed (initial, pre-UAT)
  previous_score: 13/13 (plans 01-03 only)
  gaps_closed:
    - "License lang passthrough — ?lang= appended to all license.html links in landing.js"
    - "getLicenseLang() reads URL param before localStorage"
    - "Disclaimer brand is clickable anchor linking to landing.html"
    - "Impressum Hebrew heading shows 'אודות / Impressum'"
    - "License CTA button enlarged — 1.1875rem, 600 weight, 220px min-width"
    - "Globe language selector consistent across all pages (disclaimer, impressum, datenschutz)"
    - "No native <select> dropdown remains on any page"
    - "Demo window horizontal resize works via pointer capture + wider handles"
    - "Datenschutz shows language-appropriate content for HE/CS users"
  gaps_remaining: []
  regressions: []
---

# Phase 14: i18n Bugs, Legal Footer Cleanup, and Contact Email Update — Re-Verification Report

**Phase Goal:** Fix i18n bugs (language persistence, untranslated badges, German term in Hebrew), extract legal pages to standalone HTML, update footer links, unify contact email. Gap closure: fix license lang passthrough, disclaimer brand link, Impressum Hebrew heading, CTA enlargement, globe selector on all pages, demo horizontal resize, datenschutz multilingual content.

**Verified:** 2026-03-23
**Status:** PASSED
**Re-verification:** Yes — after UAT gap closure (plans 04-06 close 9 UAT failures)

---

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                            | Status     | Evidence                                                                                      |
|-----|--------------------------------------------------------------------------------------------------|------------|-----------------------------------------------------------------------------------------------|
| 1   | Hebrew landing page shows trust badges in Hebrew, not English                                    | VERIFIED   | `priceNote` in all 4 LANDING_I18N objects; `setText('price-note', t.priceNote)` in `applyLang` |
| 2   | Switching to Hebrew on landing page, navigating to disclaimer and back, preserves Hebrew         | VERIFIED   | `applyLang` appends `&lang=` on footer-terms href; `handleContinue` saves `portfolioLang` before redirect |
| 3   | Hebrew disclaimer shows 'זכות ביטול' without '(Widerrufsrecht)' parenthetical                   | VERIFIED   | `i18n-disclaimer.js`: `title: 'זכות ביטול'` — no parenthetical; EN retains correctly        |
| 4   | All email references across entire site point to contact@sessionsgarden.app                      | VERIFIED   | `landing.html` line 375; `license.js` all 4 language blocks; no old addresses found          |
| 5   | Demo window can be resized by dragging handles horizontally                                      | VERIFIED   | Handles widened to 24px, extended -12px outside window, `setPointerCapture` on pointerdown, `releasePointerCapture` in pointerup, `touch-action:none` in CSS |
| 6   | License CTA in header is large and visually prominent                                            | VERIFIED   | `.landing-enter-link`: `font-size: 1.1875rem`, `font-weight: 600`, `padding: 0.6875rem 2rem`, `min-inline-size: 220px` |
| 7   | Language selector is a globe icon that opens a popover with 4 language options                   | VERIFIED   | `landing.html`: `lang-globe-btn` with SVG, `lang-popover` with 4 options; no `<select>` present |
| 8   | Clicking outside the language popover closes it                                                  | VERIFIED   | `landing.js` + `globe-lang.js` both implement `document.addEventListener('click', ...)` for click-outside close |
| 9   | Footer Impressum link opens a dedicated impressum.html page, not an inline accordion             | VERIFIED   | `landing.html`: `href="./impressum.html"`; `impressum.html` exists; no `legal-accordion` in landing.html |
| 10  | Footer Privacy link opens a dedicated datenschutz.html page, not an inline accordion            | VERIFIED   | `landing.html`: `href="./datenschutz.html"`; `datenschutz.html` exists with language-aware content |
| 11  | Both new pages detect language from portfolioLang localStorage and display accordingly           | VERIFIED   | Both pages contain `detectLang()` checking URL param → localStorage → navigator.language      |
| 12  | Footer link labels match the active language                                                     | VERIFIED   | `applyLang` sets `footerImpressum` and `footerPrivacy` via `setText2` for all 4 languages    |
| 13  | Both new pages are cached by the service worker for offline access                               | VERIFIED   | `sw.js` PRECACHE_URLS contains `/impressum.html` and `/datenschutz.html`; CACHE_NAME `sessions-garden-v16` |
| 14  | Clicking 'I have a license' from Hebrew landing opens license page in Hebrew                     | VERIFIED   | `landing.js` line 412/470: `setHref('hero-enter-link', './license.html?lang=' + lang)`; `getLicenseLang()` reads URLSearchParams first |
| 15  | Disclaimer brand text navigates to landing page when clicked                                     | VERIFIED   | `disclaimer.html` line 241: `<a class="disclaimer-brand" href="./landing.html" role="banner">` |
| 16  | Impressum heading shows Hebrew text when lang=he                                                 | VERIFIED   | `impressum.html` line 50: `TITLES = { he: 'אודות / Impressum', ... }` |
| 17  | Globe language selector appears on disclaimer, impressum, and datenschutz pages                  | VERIFIED   | `globe-lang.css` + `globe-lang.js` created; all 3 legal pages link both files and call `initGlobeLang()` |
| 18  | No page uses the old native `<select>` dropdown for language switching                           | VERIFIED   | `disclaimer.html`: no `lang-select` or `<select>` remains; native select creation block removed from `disclaimer.js` |
| 19  | Selecting a language on any legal page updates the page content and saves preference             | VERIFIED   | `disclaimer.js` `onLangChange` re-renders in-page and saves to localStorage; impressum/datenschutz use reload via `window.location.search` |
| 20  | Shared globe component files are cached by the service worker                                    | VERIFIED   | `sw.js` line 60-61: `/assets/globe-lang.css` and `/assets/globe-lang.js` in PRECACHE_URLS    |
| 21  | Demo resize handles extend outside the demo window body to prevent iframe event interception     | VERIFIED   | `landing.css`: `inset-inline-start: -12px` and `inset-inline-end: -12px` on respective handles |
| 22  | Datenschutz page shows meaningful content for Hebrew and Czech users                             | VERIFIED   | `datenschutz.html`: `#content-notice-he` and `#content-notice-cs` blocks; inline script shows notice + EN for HE/CS, EN-only for EN, DE+EN for DE |

**Score:** 22/22 truths verified

---

### Required Artifacts

#### Plans 01-03 Artifacts (regression check)

| Artifact                   | Expected                                               | Status   | Details                                                     |
|----------------------------|--------------------------------------------------------|----------|-------------------------------------------------------------|
| `assets/landing.js`        | `priceNote` translations for 4 languages               | VERIFIED | Lines 104, 195, 286, 377; `setText('price-note',...)` at line 414 |
| `assets/landing.js`        | Footer-terms href with `&lang=` param                  | VERIFIED | Lines 501-502: appends `?readonly=true&lang=` + lang        |
| `assets/i18n-disclaimer.js`| Hebrew `זכות ביטול` without German parenthetical       | VERIFIED | Line 104: `title: 'זכות ביטול'`                            |
| `assets/license.js`        | `contact@sessionsgarden.app` in all 4 language errors  | VERIFIED | Lines 37, 54, 71, 88                                        |
| `landing.html`             | `id="price-note"` on trust badge paragraph             | VERIFIED | `<p id="price-note" class="landing-price-note">`            |
| `landing.html`             | Globe button + popover replacing select                | VERIFIED | `lang-globe-btn` button; `lang-popover` with 4 options; no `landingLangSelect` |
| `landing.html`             | Two resize handle divs                                 | VERIFIED | `demo-resize-handle--start` and `demo-resize-handle--end`   |
| `landing.html`             | Footer links to dedicated pages (no accordion)         | VERIFIED | `href="./impressum.html"` and `href="./datenschutz.html"`   |
| `impressum.html`           | Dedicated Impressum page with language detection       | VERIFIED | Exists; `detectLang()` present; `portfolioLang` localStorage check |
| `datenschutz.html`         | Dedicated Privacy Policy page                          | VERIFIED | Exists; `detectLang()` present; bilingual content           |
| `sw.js`                    | PRECACHE_URLS includes new pages; v16 cache name       | VERIFIED | `/impressum.html`, `/datenschutz.html`, `/assets/globe-lang.css`, `/assets/globe-lang.js`; `sessions-garden-v16` |

#### Plans 04-06 Artifacts (gap closure)

| Artifact                   | Expected                                                      | Status   | Details                                                     |
|----------------------------|---------------------------------------------------------------|----------|-------------------------------------------------------------|
| `assets/landing.js`        | `?lang=` param appended to hero-enter-link and pricing-license-link | VERIFIED | Line 412: `./license.html?lang=' + lang`; line 470: same   |
| `assets/license.js`        | `URLSearchParams` URL param reader at top of `getLicenseLang()` | VERIFIED | Line 98: `var params = new URLSearchParams(window.location.search)` |
| `disclaimer.html`          | Brand is `<a>` element linking to `./landing.html`            | VERIFIED | Line 241: `<a class="disclaimer-brand" href="./landing.html" role="banner">` |
| `impressum.html`           | TITLES object has Hebrew value `'אודות / Impressum'`          | VERIFIED | Line 50: `he: 'אודות / Impressum'`                         |
| `assets/landing.css`       | `.landing-enter-link` with 1.1875rem font, 600 weight, 220px min-width | VERIFIED | Lines 118-130: all three properties confirmed               |
| `assets/globe-lang.css`    | Shared globe button and popover styles                        | VERIFIED | File exists; contains `.globe-lang-btn`, `.globe-lang-popover`, `.globe-lang-option` |
| `assets/globe-lang.js`     | Reusable `initGlobeLang()` function with `onLangChange` callback | VERIFIED | Function at line 10; `onLangChange` callback at line 77; click-outside close at line 81 |
| `disclaimer.html`          | Globe selector markup — `#globe-container` in topbar          | VERIFIED | Line 253: `<div id="globe-container"></div>`; `globe-lang.css/js` linked |
| `assets/disclaimer.js`     | `initGlobeLang()` call with `onLangChange` that re-renders page | VERIFIED | Lines 242-251: `initGlobeLang({ containerId: 'globe-container', onLangChange: ... })` |
| `impressum.html`           | Globe selector markup — `#globe-container` in topbar          | VERIFIED | Line 30; `globe-lang.css/js` linked; `initGlobeLang()` at line 70 |
| `datenschutz.html`         | Globe selector markup — `#globe-container` in topbar          | VERIFIED | Line 29; `globe-lang.css/js` linked; `initGlobeLang()` at line 243 |
| `assets/landing.css`       | Resize handles 24px wide, extended -12px, `touch-action:none` | VERIFIED | `width: 24px` at line 1103; `touch-action: none` at line 1107; `-12px` offsets at lines 1119/1125 |
| `assets/landing.js`        | `setPointerCapture` on pointerdown, `releasePointerCapture` in pointerup | VERIFIED | Line 646: `activeHandle.setPointerCapture(e.pointerId)`; line 670: `releasePointerCapture` |
| `datenschutz.html`         | `#content-notice-he`, `#content-notice-cs`, `#content-de`, `#content-en` divs | VERIFIED | Lines 36, 40, 46, 118; visibility script at lines 213-241  |

---

### Key Link Verification

| From                    | To                              | Via                                           | Status   | Details                                                              |
|-------------------------|---------------------------------|-----------------------------------------------|----------|----------------------------------------------------------------------|
| `assets/landing.js`     | `license.html` + lang state     | `setHref` with `?lang=` appended              | WIRED    | Lines 412, 470 confirmed — both license links carry lang param       |
| `assets/license.js`     | URL `?lang=` param              | `URLSearchParams` at top of `getLicenseLang()` | WIRED    | Line 98: reads `params.get('lang')` before localStorage fallback     |
| `disclaimer.html`       | `landing.html`                  | `<a>` element with `href="./landing.html"`    | WIRED    | Line 241 confirmed — was `<div>`, now `<a>`                          |
| `assets/globe-lang.js`  | page-specific lang handler      | `onLangChange` callback parameter             | WIRED    | `disclaimer.js` passes re-render callback; impressum/datenschutz pass reload callback |
| `disclaimer.html`       | `assets/globe-lang.js`          | `<script src>` tag                            | WIRED    | Line 311: `<script src="./assets/globe-lang.js"></script>`           |
| `impressum.html`        | `assets/globe-lang.js`          | `<script src>` tag                            | WIRED    | Line 47 confirmed                                                    |
| `datenschutz.html`      | `assets/globe-lang.js`          | `<script src>` tag                            | WIRED    | Line 189 confirmed                                                   |
| `assets/landing.js`     | demo resize handles             | `setPointerCapture` on pointerdown            | WIRED    | Line 646: pointer capture guarantees events route to handle over iframe |
| `datenschutz.html`      | language detection script       | `detectLang()` → content visibility toggle    | WIRED    | Lines 213-241: script reads lang, toggles display on all 5 content divs |
| `sw.js`                 | `globe-lang.css` + `globe-lang.js` | PRECACHE_URLS entries                      | WIRED    | Lines 60-61: both new component files in precache array              |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description                                                   | Status    | Evidence                                                              |
|-------------|----------------|---------------------------------------------------------------|-----------|-----------------------------------------------------------------------|
| D-01        | 14-01, 14-04   | Language persistence between pages                            | SATISFIED | `portfolioLang` saved in `handleContinue`; `?lang=` on footer-terms and license.html links; `getLicenseLang()` reads URL param first |
| D-02        | 14-01, 14-04   | Trust badges translated in all 4 languages                    | SATISFIED | `priceNote` in all 4 LANDING_I18N objects; wired via `setText`        |
| D-03        | 14-01          | Hebrew disclaimer drops German parenthetical                  | SATISFIED | `i18n-disclaimer.js`: `'זכות ביטול'` without `(Widerrufsrecht)`      |
| D-04        | 14-02, 14-06   | Demo window is resizable with drag handles                    | SATISFIED | 24px handles, -12px extension, `setPointerCapture`, transparent edge overlays, `touch-action:none` |
| D-05        | 14-03, 14-06   | Impressum and Datenschutz as standalone pages, not accordions | SATISFIED | Both pages created; accordion removed from landing.html; datenschutz now language-aware for all 4 languages |
| D-06        | 14-03          | Footer link labels match the active language                  | SATISFIED | `applyLang` sets `footerImpressum`/`footerPrivacy` for all 4 languages |
| D-07        | 14-01          | Contact email unified to contact@sessionsgarden.app           | SATISFIED | `landing.html` + all 4 `license.js` language blocks; old addresses removed |
| D-08        | 14-02, 14-04   | License CTA in header is visually prominent                   | SATISFIED | `.landing-enter-link`: 1.1875rem, 600 weight, 2rem padding, 220px min-width |
| D-09        | 14-02, 14-05   | Language selector is a globe icon popover, not a native select | SATISFIED | Globe popover on landing (landing.js), shared `globe-lang.js` component on all legal pages; no native select on any page |

**Note on REQUIREMENTS.md:** D-01 through D-09 are phase-specific delivery requirements defined in ROADMAP.md for phase 14. They do not appear in the product REQUIREMENTS.md, which tracks v1.1 feature requirements (UX-xx, HSHLD-xx, LNCH-xx). No orphaned requirements.

---

### UAT Gap Closure Status

All 9 UAT failures from 14-UAT.md are addressed:

| UAT Test | Description                                            | Gap Plan | Resolution                                                        | Status   |
|----------|--------------------------------------------------------|----------|-------------------------------------------------------------------|----------|
| Test 2   | Hebrew disclaimer reachable; no German parenthetical   | 14-04    | `?lang=` added to license links; URL param reader in getLicenseLang() | CLOSED |
| Test 3   | Language persists across all legal page navigation     | 14-04/06 | License links carry lang; datenschutz language-aware content       | CLOSED   |
| Test 5   | Demo resizable horizontally                            | 14-06    | Pointer capture + 24px handles + -12px extension + edge overlays  | CLOSED   |
| Test 6   | License CTA button prominent enough                    | 14-04    | 1.1875rem font, 600 weight, 220px min-width                        | CLOSED   |
| Test 8   | Globe selector consistent across all pages             | 14-05    | `globe-lang.js` component on disclaimer, impressum, datenschutz    | CLOSED   |
| Test 9   | Impressum page fully translated in Hebrew              | 14-04    | `TITLES.he = 'אודות / Impressum'`                                 | CLOSED   |
| Test 10  | Datenschutz has Hebrew content beyond the title        | 14-06    | Hebrew notice block + EN content shown; DE hidden for HE users     | CLOSED   |
| A1       | License activation page preserves language from landing | 14-04   | Same fix as Test 2 — `?lang=` in landing links + URL param reader  | CLOSED   |
| A2       | Sessions Garden logo clickable on disclaimer page      | 14-04    | `disclaimer-brand` changed from `<div>` to `<a href="./landing.html">` | CLOSED |

---

### Anti-Patterns Found

| File              | Line  | Pattern                                                              | Severity | Impact                                                     |
|-------------------|-------|----------------------------------------------------------------------|----------|------------------------------------------------------------|
| `impressum.html`  | 34-40 | `[YOUR_BUSINESS_NAME]`, `[YOUR_STREET_ADDRESS]` placeholders         | INFO     | Intentional — awaiting Sapir's business details (LNCH-01). Legal page structure and language detection fully functional. |
| `datenschutz.html`| ~158  | `[YOUR_BUSINESS_NAME]`, `[YOUR_BUSINESS_EMAIL]` in Verantwortlicher | INFO     | Same intentional stub — same LNCH-01 blocker.              |

Both are documented as intentional in the phase summaries and predate this phase. INFO-level only — they do not block any phase 14 goal.

---

### Human Verification Required

The following behaviors require browser testing to confirm:

#### 1. Language Persistence End-to-End Flow (enhanced)

**Test:** Open `landing.html`, switch to Hebrew using the globe popover, click "I have a license" in the header — verify license page opens in Hebrew (`?lang=he` in URL, page content in Hebrew). Navigate back, click footer "Terms of Use" — verify disclaimer opens in Hebrew. Click Continue — verify landing returns in Hebrew.
**Expected:** Hebrew maintained through entire navigation cycle including license page.
**Why human:** Cannot simulate localStorage + multi-page navigation + URL param reading in static analysis.

#### 2. Demo Window Horizontal Drag

**Test:** On a desktop viewport (>640px), hover over the left or right edge of the demo window — a grip handle should appear. Drag horizontally.
**Expected:** Demo window width changes smoothly; drag works without browser-scroll interference; iframe content remains interactive after drag release.
**Why human:** Pointer capture drag behavior over iframes requires runtime testing. RTL drag direction multiplier (Hebrew) also needs visual confirmation.

#### 3. Globe Popover on Legal Pages

**Test:** Open `disclaimer.html` — globe icon visible in topbar. Open `impressum.html` and `datenschutz.html` — same globe icon in each topbar. Clicking globe opens popover with 4 languages on all three pages.
**Expected:** Visually identical globe selectors on all three legal pages; selecting a language correctly updates content.
**Why human:** Visual consistency across pages requires browser inspection.

#### 4. Datenschutz Language Switching

**Test:** Open `datenschutz.html?lang=he` — should see Hebrew notice at top, then English policy, no German. Open `datenschutz.html?lang=cs` — Czech notice + English. Open `datenschutz.html?lang=de` — both DE and EN. Open `datenschutz.html?lang=en` — English only.
**Expected:** Clean language-conditional display for all 4 languages.
**Why human:** Content visibility toggling (display:none logic) must be confirmed at runtime.

#### 5. Service Worker v16 (unchanged from initial verification)

**Test:** After visiting site once, disable network and reload impressum.html, datenschutz.html, and verify globe-lang component loads.
**Why human:** Offline caching requires browser DevTools / Application panel verification.

---

### Commit History

All commits from plans 04-06 confirmed present in git:

| Commit  | Plan  | Description                                                  |
|---------|-------|--------------------------------------------------------------|
| aad0cfc | 14-04 | fix: license lang passthrough and disclaimer brand link      |
| 0639630 | 14-04 | fix: Impressum Hebrew heading and license CTA enlargement    |
| 544e2eb | 14-05 | feat: create shared globe-lang component                     |
| f69144d | 14-05 | feat: add globe selector to all legal pages, remove native select |
| 183290e | 14-06 | fix: widen demo resize handles and add pointer capture       |
| 7a25065 | 14-06 | feat: add language-aware content display to datenschutz.html |

---

### Summary

All 22 observable truths verified. All 9 D-prefix requirements (D-01 through D-09) satisfied. All 9 UAT gaps from 14-UAT.md closed with concrete codebase evidence.

The only open items from this phase are the intentional `[YOUR_*]` content placeholders in `impressum.html` and `datenschutz.html`, tracked as LNCH-01, requiring Sapir's real business details before public launch. These are pre-existing and do not block phase 14 goal achievement.

Phase 14 is complete. Ready to proceed to phase 15 (Architecture and UI Audit).

---

_Verified: 2026-03-23_
_Verifier: Claude (gsd-verifier)_
_Mode: Re-verification after UAT gap closure (plans 04-06)_
