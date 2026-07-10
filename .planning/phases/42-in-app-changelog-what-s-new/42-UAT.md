---
status: complete
phase: 42-in-app-changelog-what-s-new
source: [42-VERIFICATION.md]
started: 2026-07-09T19:10:00Z
updated: 2026-07-10T06:46:47Z
---

## Current Test

[testing complete]

## Tests

### 1. Offline What's-New popup + changelog page on a real device/PWA
expected: Popup fires exactly once after a version change on any chrome-mounting page while fully offline; every deliberate dismiss path records the version; /changelog renders fully offline (reverse-chronological, version+date grouped).
result: pass
source: automated (Ben delegated the hands-on run, 2026-07-10)
evidence: |
  Executed against a REAL Service Worker in a persistent Chromium profile, with a
  Cloudflare-Pages-faithful local server (clean URLs + 301 on /foo.html; rejects
  macOS case-insensitive filename matches). 10/10 checks passed:
    - SW precached /changelog and / (94 cache entries)
    - offline confirmed (navigator.onLine=false)
    - cold launch after simulated 1.2.5 -> 1.3.0 change: popup fired, "What's new in
      version 1.3", 3 highlights (within the 2-4 contract)
    - Close dismissed it; localStorage sg.whatsNewLastSeenVersion recorded 1.3.0
    - reload while offline: popup did NOT reappear (the exactly-once guarantee)
    - /changelog rendered offline: 4 entries, 1.3 > 1.2 > 1.1 > 1.0, version+date grouped
    - /sessions (second chrome-mounting page) also loaded offline
  NOT covered by this run (carried to the v1.3 ship checklist, not a Phase 42 gate):
    - installed-PWA cold launch on a real device / iOS Safari
    - deploy-stamped INTEGRITY_TOKEN cache roll — CACHE_NAME was 'sessions-garden-dev'
      locally; the prod cache-roll path is only exercised on a real Cloudflare deploy
      (see the Phase 28 update-delivery lesson)
  NOTE: `python3 -m http.server` CANNOT run this test. It 404s the extensionless
  routes sw.js precaches, and Promise.allSettled (sw.js:209) lets the SW install
  anyway with a half-empty cache — offline /changelog then silently serves index.html
  with HTTP 200 (a false pass). It also resolves /license to the LICENSE copyright
  file on macOS's case-insensitive filesystem and precaches that as the license page.

### 2. Visual pass — light/dark theme + RTL (Hebrew) for popup and changelog page
expected: Popup is a modest ~420px centered modal (not full-screen); New/Improved/Fixed category headings use correct color tokens in both themes; RTL logical properties mirror correctly with no LTR artifacts in the RTL heading area.
result: pass
source: automated + Ben confirmation ("looks good", 2026-07-10)
evidence: |
  Playwright render matrix, 16 cases = {Chromium, WebKit} x {light, dark} x {en, he}:
  - Popup 420px wide, centered, fullScreen=false in all 8 popup cases.
  - Category tokens exact: light New #2d6a4f (green-600) / Improved #3a7d5f (green-500)
    / Fixed #f97316 (orange-500); dark New #74b89a (green-400) / Improved #c8e6d4
    (green-200) / Fixed #f97316 unchanged — matches changelog.css + tokens.css.
  - RTL: html[dir=rtl], list padding flips left:19.2px -> right:19.2px (logical props);
    version heading renders "גרסה 1.3" with direction:rtl — no LTR artifact (WR-03 fix live).
  - Page: 4 entries, reverse-chronological 1.3 > 1.2 > 1.1 > 1.0.
  - Chromium and WebKit agree on every measured value (no Safari-only divergence).
  Backup-reminder banner co-rendering with the popup is BY DESIGN (app.js:1470, D-04 —
  reminder banner + footer integrity nudge are deliberately not coordinator-governed).

### 3. Triage the three code-review WARNING findings (42-REVIEW.md)
expected: Ben decides disposition for each — fix-now, defer (e.g. Phase 43 or quick task), or accept: WR-01 changelog.html omits tour.js/tour.css (dead "Onboarding Tour" popover row + dead tour-reminder Start button on that page); WR-02 anchor deep-links race async render (latent, currently invisible); WR-03 hardcoded English "Version" label bypasses D-17 chrome-i18n.
result: pass — Ben chose fix-now for all three (2026-07-09, AskUserQuestion). Fixed in 3a4f16f (WR-01), 319497f (WR-02), 856dc69 (WR-03); suite 162/162 green; see 42-REVIEW-FIX.md (status all_fixed).

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
