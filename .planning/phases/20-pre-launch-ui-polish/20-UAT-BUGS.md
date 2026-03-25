# Phase 20 UAT Bugs

Bugs discovered during Phase 20 visual verification and post-deploy testing.

## Fixed

| # | Bug | Root Cause | Fix | Commit |
|---|-----|-----------|-----|--------|
| 1 | Birth date picker month names don't update on language switch | Month options built once at init, no language change listener | Added `app:language` event listener calling `updateMonthNames()` | 0919a8c |
| 2 | Legal page back links always go to landing.html | SharedChrome.getNavigationContext() compared `=== 'true'` but license.js stores `'1'` | Accept both `'1'` and `'true'` in activation check | 7729cb7 |
| 3 | No way to access license page after header icon removal | License key icon removed from header, no replacement link | Added "License" link to shared footer on all pages | 0919a8c |
| 4 | EN app header wraps to 2 rows | Brand subtitle + 5 nav pills + controls too wide | Hidden brand subtitle (`display: none`), reduced nav padding/gaps | 7729cb7 |
| 5 | License page opens in wrong language | `getLicenseLang()` read stale `portfolioTermsLang` before `portfolioLang` | Swapped priority: `portfolioLang` first | 2367d29 |
| 6 | License page language switch does nothing | `window.location.reload()` served stale files from SW cache | Replaced with inline re-render via `applyLicenseLang()` + `renderLicenseChrome()` | 2367d29 |
| 7 | Demo iframe shows TOC/landing instead of app | Page gates check localStorage but demo uses sessionStorage; `window.name` bypass missing from gates | Added `window.name==='demo-mode'` check to all gates on all 5 app pages | 88fe88a |
| 8 | Demo brand logo links to index.html (leaves demo context) | Hardcoded `href="./index.html"` in demo.html | Changed to `./demo.html` | d77c334 |
| 9 | Double footer on all 12 legal pages | Old `legal-footer`/`disclaimer-footer` HTML still present alongside new SharedChrome footer | Removed old footer HTML from all 12 files | 9067f3c |
| 10 | CF CDN serves stale assets after deploy | `_headers` set `max-age=86400` (24h) for JS/CSS | Reduced to `max-age=3600` (1h), added auto-purge to deploy workflow | 86c2a7f |
