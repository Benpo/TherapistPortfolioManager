---
phase: 42-in-app-changelog-what-s-new
plan: 07
subsystem: changelog-page
tags: [changelog, help-family, render, rtl, dark-mode, xss-safe, en-fallback]
requires:
  - window.CHANGELOG_CONTENT_EN (Plan 04, assets/changelog-content-en.js)
  - App.t / App.getLanguage / App.initCommon (assets/app.js)
  - AttentionCoordinator + whats-new.js (Plan 05, popup surface loaded on this page)
provides:
  - changelog.html (standalone /changelog page, help family — D-13)
  - assets/changelog.js (window.Changelog reverse-chron Variant-B renderer)
  - assets/changelog.css (entry/category styles, token-only)
affects:
  - Plan 08 (adds changelog.* / whatsNew.* i18n keys the page reads)
  - Plan 10 (deep-links "See everything new" → changelog.html#{anchor}; entry-point gating)
  - sw.js precache plan (adds the 4 new assets + /changelog to precache)
tech-stack:
  added: []
  patterns:
    - "Per-page render module mirroring help.js (createElement+textContent, App.initCommon boot, app:language re-render, window.<Page> test seam)"
    - "Per-entry EN-fallback locale merge (D-16): en.map over window['CHANGELOG_CONTENT_'+LANG])"
key-files:
  created:
    - changelog.html
    - assets/changelog.js
    - assets/changelog.css
  modified:
    - tests/42-changelog-render.test.js
decisions:
  - "Omitted tour.js/tour.css from changelog.html — all app.js window.Tour refs are typeof-guarded and no tour is triggered on this page; honors the plan's explicit tokens→app→changelog CSS chain"
  - "Display heading = 'Version ' + version with a trailing '.0' patch dropped (Version 1.3 / 1.2 / 1.1 / 1.0), matching sketch 005 house-style"
  - "DOM class scheme: .changelog-entry(+--origin) / __head/__version/__date/__lede and .changelog-cat[data-cat] / __label/__list — CSS keys category color off data-cat"
metrics:
  duration: ~18min
  tasks: 3
  files: 4
  completed: 2026-07-09
status: complete
---

# Phase 42 Plan 07: In-App Changelog Page Summary

Shipped the standalone `/changelog` page (CHLG-02): a help-family shell (`changelog.html`), a reverse-chronological Variant-B renderer with per-entry EN-fallback (`assets/changelog.js` → `window.Changelog`), and token-only entry/category styles (`assets/changelog.css`). The render gate T-42-V7/V8 (`tests/42-changelog-render.test.js`) is now GREEN — 15/15.

## What was built

- **assets/changelog.js** — an IIFE (`"use strict"`, four-slot banner) mirroring `help.js`. `localeEntries()` reads `App.getLanguage()`, resolves `window['CHANGELOG_CONTENT_'+LANG.toUpperCase()]` and merges each entry over its EN counterpart (whole-locale-missing → all EN; entry-missing → that entry EN — D-16). `render()` builds one `.changelog-entry` per EN entry (reverse-chron), `id === entry.anchor`, a version+date head, a lede, then present-and-non-empty New/Improved/Fixed `.changelog-cat[data-cat]` blocks (empty categories omitted, D-11); `origin:true` renders a one-line marker with `.changelog-entry--origin` and zero category blocks (D-01). All dynamic text via `createElement`+`textContent` — the module ships **no** `innerHTML`. Boots via `App.initCommon`, re-renders on `app:language`, exposes `window.Changelog = { render, localeEntries }`.
- **changelog.html** — copy of the `help.html` shell: the 4 head guard scripts unchanged, shared header, and empty `#changelogTitle` / `#changelogIntro` / `#changelogEntries` containers the renderer fills. CSS chain `tokens.css → app.css → changelog.css` (app.css carries the What's-New popup + `.btn-primary`). Script chain mirrors help.html and loads `changelog-content-en.js` + `whats-new.js` + `changelog.js` after `attention-coordinator.js`, so the popup can also fire on this page. SW-registration footer intact.
- **assets/changelog.css** — sketch 005 Variant B ported token-only: entry cards (`--color-surface`, 14px radius, 1.5rem 1.75rem padding — approved sketch values), page head, lede, one-line origin marker, and uppercase colored category labels (New `--color-green-600`/`-green-400`, Improved `--color-green-500`/`-green-200`, Fixed `--color-orange-500` both themes) with `[data-theme="dark"]` overrides. Logical properties only; zero literal hex.

## Verification

- `node tests/42-changelog-render.test.js` — **15/15 PASS** (reverse-chron, empty-category omission, v1.0 one-line, kebab anchors, EN-fallback whole + per-entry).
- `grep -nE 'innerHTML' assets/changelog.js` — none.
- `node -c assets/changelog.js` — OK.
- changelog.html shell + script-order verify — OK; 4 head guard scripts present.
- `grep -nE '#[0-9a-fA-F]{3,8}' assets/changelog.css` — no literal hex; no physical `left/right/margin-*` properties.
- Full suite: 159 passed / 3 failed (the 3 failures are out-of-scope RED gates owned by other plans — see below).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Off-by-one in the plan-02 render-test self-count guard**
- **Found during:** Task 1 (turning T-42-V7/V8 green).
- **Issue:** The "no silent skip" guard evaluated `CASES === EXPECTED_CASES` (15) as its condition, but `ok()` increments `CASES` on entry — so at condition-eval time `CASES` is still 14 (the guard's own increment hasn't landed). The test's own comment confirms "14 assertions above; this guard is the 15th", so the guard could **never** pass regardless of implementation, making the RED→GREEN gate impossible. All 14 real behavior assertions passed with the correct renderer.
- **Fix:** Changed the guard condition to `CASES === EXPECTED_CASES - 1` and documented why (pre-increment) in a comment. Message text still reads "all 15 assertions executed".
- **Files modified:** tests/42-changelog-render.test.js
- **Commit:** e569800

## Out-of-scope RED gates (owned by other plans — NOT fixed here)

These 3 phase-42 tests remain RED by design; none touch this plan's files (changelog.html/js/css) and all were RED before plan 07:

| Test | Reason RED | Turned green by |
|------|-----------|-----------------|
| `42-precache.test.js` (T-42-V6) | `sw.js` PRECACHE_URLS lacks the 4 new assets + `/changelog` | the sw.js precache plan |
| `42-i18n-parity.test.js` (T-42-V11) | `changelog.*` / `whatsNew.*` keys not yet in `i18n-{en,he,de,cs}.js` | Plan 08 |
| `42-demo-gate.test.js` (T-42-V10) | "?" menu row + footer version anchor entry points not yet added | Plan 10 |

## Known Stubs

None. The page renders the full real history from the single data source. (The `changelog-content-en.js` copy is DRAFT/placeholder per Plan 04's own header, finalized in Plan 10 — not a stub introduced by this plan.)

## Self-Check: PASSED
- FOUND: changelog.html
- FOUND: assets/changelog.js
- FOUND: assets/changelog.css
- FOUND commit e569800 (changelog.js), 405a13d (changelog.html), 93fec58 (changelog.css)
