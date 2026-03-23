---
status: diagnosed
phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update
source: [14-01-SUMMARY.md, 14-02-SUMMARY.md, 14-03-SUMMARY.md]
started: 2026-03-23T12:00:00Z
updated: 2026-03-23T12:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Trust Badges Translate in All Languages
expected: Switch language on landing page to HE/DE/CS — the trust badge text below the pricing should display in the selected language, not English.
result: pass

### 2. Hebrew Disclaimer Has No German Parenthetical
expected: Open disclaimer page in Hebrew. The cancellation rights section title should read "זכות ביטול" without "(Widerrufsrecht)" in parentheses.
result: issue
reported: "cant find how to get there at all now! plus clicking on 'I have already a license' from Hebrew takes to activation page without Hebrew at all"
severity: major

### 3. Language Persists Across Landing/Disclaimer Navigation
expected: Set landing page to Hebrew (or DE/CS). Click the Terms of Use footer link. Disclaimer page should open in the same language. Navigate back — landing should still be in that language.
result: issue
reported: "Datenschutz page has no Hebrew version — shows DE+EN even for Hebrew. All legal pages have mixed languages. Terms of Use translated but checkboxes still in English."
severity: major

### 4. Contact Email Unified
expected: Check landing page contact info and license error messages — all should show contact@sessionsgarden.app. No instances of contact@sessions.garden or support@sessionsgarden.app remain.
result: pass

### 5. Demo Window Resizable by Dragging Handles
expected: Hover over the left or right edge of the demo window — a vertical drag handle with grip dots should appear. Drag horizontally to resize the demo window wider or narrower.
result: issue
reported: "resizable only works vertically not horizontally"
severity: major

### 6. License CTA Button Prominent in Header
expected: The license/enter button in the landing page header should be visually prominent with a colored background, larger font than other nav items, and hover effect.
result: issue
reported: "not enlarged enough, but color is good now"
severity: cosmetic

### 7. Globe Icon Language Selector on Landing Page
expected: Landing page shows a globe icon button instead of a native select dropdown. Clicking it opens an animated popover with 4 language options. Selecting a language updates the page and closes the popover. Click outside also closes it.
result: pass

### 8. Globe Language Selector Consistent Across All Pages
expected: All pages (landing, disclaimer, impressum, datenschutz, license) should use the same globe icon language selector — no pages should still have the old native select dropdown.
result: issue
reported: "Language selector is not identical across all pages, old selector remains for some pages"
severity: major

### 9. Impressum Page Loads with Language Detection
expected: Open impressum.html — it should detect the current language from URL param, localStorage, or browser. Content displays in the detected language. Back link returns to landing page.
result: issue
reported: "language in Impressum still mixed — footer in hebrew version still shows 'Impressum' as page name although 'תנאי שימוש' is also mentioned which is hebrew. Also within TOC the checkboxes are in english despite being on hebrew website (all information is hebrew but just 2 checkboxes are in english)"
severity: major

### 10. Datenschutz Page Loads with Bilingual Content
expected: Open datenschutz.html — page loads with bilingual DE+EN privacy policy content, correct language heading, and proper text direction.
result: issue
reported: "content is nowhere in Hebrew beyond the title — only DE+EN content present"
severity: major

### 11. Footer Links Navigate to Dedicated Legal Pages
expected: Footer Impressum and Datenschutz links on landing page navigate to the standalone pages (not accordion). The ?lang= parameter is appended so the legal page detects the active language.
result: pass

### 12. Service Worker Caches New Legal Pages
expected: After visiting impressum.html and datenschutz.html once, they should be available offline (cached by service worker v15).
result: skipped
reason: can't test offline caching

## Additional Findings

### A1. License Activation Page Loses Hebrew
reported: "From Hebrew landing, clicking 'I have already a license' takes to activation page without Hebrew"
severity: major

### A2. Sessions Garden Logo Not Clickable on Some Pages
reported: "Clicking on 'Sessions Garden' next to the logo on some pages doesn't have clickable link to home page"
severity: major

## Summary

total: 12
passed: 4
issues: 7
pending: 0
skipped: 1
blocked: 0

## Gaps

- truth: "Disclaimer page reachable and Hebrew cancellation rights title has no German parenthetical"
  status: failed
  reason: "User reported: cant find how to get there at all now! plus 'I have already a license' from Hebrew takes to activation page without Hebrew"
  severity: major
  test: 2
  root_cause: "hero-enter-link and pricing-license-link in landing.js set bare ./license.html with no ?lang= param; license.js getLicenseLang() ignores URL params entirely"
  artifacts:
    - path: "assets/landing.js"
      issue: "setHref calls for hero-enter-link and pricing-license-link don't append ?lang="
    - path: "assets/license.js"
      issue: "getLicenseLang() has no URL param branch — only reads localStorage"
  missing:
    - "Append ?lang= to hero-enter-link and pricing-license-link setHref calls"
    - "Add URL param reader to getLicenseLang() before localStorage fallback"
  debug_session: ""

- truth: "Language persists across all legal page navigation — Datenschutz has Hebrew version"
  status: failed
  reason: "User reported: Datenschutz page has no Hebrew version — shows DE+EN even for Hebrew. All legal pages mixed. Terms of Use checkboxes still English."
  severity: major
  test: 3
  root_cause: "datenschutz.html contains only DE and EN content blocks — no Hebrew content exists. Inline script only swaps heading and back-link text. disclaimer.js detectLang() result not persisted before render."
  artifacts:
    - path: "datenschutz.html"
      issue: "Only DE and EN content blocks exist; no Hebrew content block at all"
    - path: "assets/disclaimer.js"
      issue: "detectLang() result not saved to localStorage before rendering — first-time Hebrew users can land on English"
  missing:
    - "Add Hebrew content block to datenschutz.html (or at minimum HE/CS translated sections)"
    - "Save resolved urlLang to localStorage in disclaimer.js detectLang() before rendering"
  debug_session: ""

- truth: "Demo window resizable by dragging handles horizontally"
  status: failed
  reason: "User reported: resizable only works vertically not horizontally"
  severity: major
  test: 5
  root_cause: "Resize handles are 8px slivers positioned inside demo-window-body overlapping the iframe edge. Initial pointerdown is intercepted by iframe before pointer-events:none is applied, so drag never starts. User sees browser scroll instead."
  artifacts:
    - path: "assets/landing.css"
      issue: "demo-resize-handle is only 8px wide, opacity:0 until hover, positioned inside body overlapping iframe"
    - path: "landing.html"
      issue: "Handles are children of demo-window-body, not siblings — overlap iframe edges"
    - path: "assets/landing.js"
      issue: "pointer-events:none on iframe only applied after pointerdown — iframe intercepts initial touch"
  missing:
    - "Position handles outside demo-window-body or widen grab zone to 16-24px extending beyond window"
    - "Set pointer-events:none on iframe permanently or use an overlay during hover near edges"
    - "Add visible affordance so users know handles exist"
  debug_session: ""

- truth: "License CTA button in header is visually prominent and enlarged"
  status: failed
  reason: "User reported: not enlarged enough, but color is good now"
  severity: cosmetic
  test: 6
  root_cause: "landing-btn-primary has conservative padding (15px/36px), no min-width, font-size close to body text — reads as normal link not high-conversion CTA"
  artifacts:
    - path: "assets/landing.css"
      issue: "landing-btn-primary has moderate padding, 1.0625rem font-size, no min-width, subtle shadow"
  missing:
    - "Add min-inline-size: 280px, increase font-size to 1.25rem, more generous padding (1.25rem 3rem)"
  debug_session: ""

- truth: "Globe language selector consistent across all pages"
  status: failed
  reason: "User reported: Language selector is not identical across all pages, old selector remains for some pages"
  severity: major
  test: 8
  root_cause: "Globe selector is landing-page-only (defined in landing.html, initialized by landing.js). disclaimer.html uses native <select> via disclaimer.js. impressum.html and datenschutz.html have no language switcher at all."
  artifacts:
    - path: "disclaimer.html"
      issue: "Uses native <select> created by disclaimer.js — not the globe component"
    - path: "impressum.html"
      issue: "Topbar has brand + back link only, no language selector"
    - path: "datenschutz.html"
      issue: "Same as impressum — no language selector in topbar"
  missing:
    - "Add globe button + popover markup to all legal page topbars"
    - "Extract globe component script from landing.js or create shared module"
    - "Replace disclaimer.js native <select> with globe pattern"
  debug_session: ""

- truth: "Impressum page displays correctly in Hebrew with all elements translated"
  status: failed
  reason: "User reported: language in Impressum still mixed — footer shows 'Impressum' as page name in Hebrew version, TOC checkboxes in English on Hebrew site"
  severity: major
  test: 9
  root_cause: "impressum.html TITLES object hardcodes 'Impressum' for all 4 languages including Hebrew. No Hebrew-translated label provided."
  artifacts:
    - path: "impressum.html"
      issue: "TITLES = { he: 'Impressum' } — hardcoded German term for Hebrew heading"
  missing:
    - "Provide Hebrew heading for Impressum page (e.g. 'אודות / Impressum' or translated equivalent)"
  debug_session: ""

- truth: "Datenschutz page has Hebrew content beyond the title"
  status: failed
  reason: "User reported: content is nowhere in Hebrew beyond the title — only DE+EN content present"
  severity: major
  test: 10
  root_cause: "datenschutz.html contains only DE (lang=de) and EN (lang=en) content blocks. No Hebrew or Czech content exists. Script only swaps heading text."
  artifacts:
    - path: "datenschutz.html"
      issue: "Only two content blocks: DE and EN. No HE or CS content."
  missing:
    - "Add Hebrew and Czech privacy policy content blocks, or show EN as fallback with clear indication"
  debug_session: ""

- truth: "License activation page preserves language from landing page"
  status: failed
  reason: "User reported: From Hebrew landing, clicking 'I have already a license' takes to activation page without Hebrew"
  severity: major
  test: A1
  root_cause: "Same as test 2 — landing.js hero-enter-link and pricing-license-link don't append ?lang=; license.js getLicenseLang() has no URL param reader"
  artifacts:
    - path: "assets/landing.js"
      issue: "setHref for license links missing ?lang= param"
    - path: "assets/license.js"
      issue: "getLicenseLang() only reads localStorage, no URL param support"
  missing:
    - "Append ?lang= to license link setHref calls in landing.js"
    - "Add URL param reader at top of getLicenseLang() in license.js"
  debug_session: ""

- truth: "Sessions Garden logo links to home page on all pages"
  status: failed
  reason: "User reported: Clicking on 'Sessions Garden' next to the logo on some pages doesn't have clickable link to home page"
  severity: major
  test: A2
  root_cause: "disclaimer.html brand is a <div class='disclaimer-brand' role='banner'> — not an <a> tag, no href, not interactive. impressum.html and datenschutz.html are correct (<a> tags)."
  artifacts:
    - path: "disclaimer.html"
      issue: "Brand container is <div> not <a> — no navigation possible"
  missing:
    - "Change disclaimer.html brand from <div> to <a href='./landing.html'>"
  debug_session: ""
