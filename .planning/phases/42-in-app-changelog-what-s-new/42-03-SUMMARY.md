---
phase: 42-in-app-changelog-what-s-new
plan: 03
subsystem: testing
tags: [tdd-red, wave-0, precache, demo-gate, i18n-parity, offline, changelog, whats-new]
requires:
  - tests/39-help-precache.test.js (precache-shape idiom)
  - tests/41-demo-gate.test.js (demo-mode jsdom harness)
  - tests/40-i18n-parity.test.js (vm-sandbox parity idiom)
provides:
  - tests/42-precache.test.js (T-42-V6 — two-array precache split gate)
  - tests/42-demo-gate.test.js (T-42-V10 — What's-New entry-point suppression)
  - tests/42-i18n-parity.test.js (T-42-V11 — 10 chrome-key parity gate)
affects:
  - sw.js (Plan 08 turns precache green)
  - assets/app.js (Plan 07/09 turns menu row green)
  - assets/shared-chrome.js (Plan 09 turns footer link green)
  - assets/i18n-{en,he,de,cs}.js (Plan 07 turns parity green)
tech-stack:
  added: []
  patterns:
    - "Wave-0 RED shape/parity gates authored before implementation (mirrors 39/40/41 idioms)"
    - "Two-array precache split pinned via region-isolated PRECACHE_URLS vs PRECACHE_HTML regex scoping"
    - "Two independent jsdom harnesses in one demo-gate file (App.initHelpEntry + SharedChrome.renderFooter)"
key-files:
  created:
    - tests/42-precache.test.js
    - tests/42-demo-gate.test.js
    - tests/42-i18n-parity.test.js
  modified: []
decisions:
  - "Precache page-vs-asset split is the falsifiable core: /changelog asserted IN PRECACHE_HTML and ABSENT from PRECACHE_URLS (RESEARCH Pitfall 1)"
  - "Footer version-link test asserts .app-footer-version-warn stays a SIBLING OUTSIDE the changelog anchor so the one-directional integrity marker upgrades independently"
  - "No whats-new.css precache entry asserted absent — popup CSS lives in already-precached app.css"
metrics:
  duration: ~10min
  completed: 2026-07-09
  tasks: 3
  files: 3
status: complete
---

# Phase 42 Plan 03: Wave-0 RED Gates (Precache / Demo-Gate / i18n-Parity) Summary

Authored the three Wave-0 RED test files that pin the mechanical-correctness constraints for the In-App Changelog / What's-New feature BEFORE the wiring and i18n plans run: the two-array offline precache split (T-42-V6), demo-mode suppression of both What's-New entry points (T-42-V10), and 4-locale parity for the 10 new chrome keys (T-42-V11). All three fail RED for the right reason against the un-edited sw.js / app.js / shared-chrome.js / i18n files and are auto-discovered by tests/run-all.js.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | RED precache-shape test (T-42-V6) | 7f7a283 | tests/42-precache.test.js |
| 2 | RED demo-gate test (T-42-V10) | 5884971 | tests/42-demo-gate.test.js |
| 3 | RED i18n-parity test (T-42-V11) | 4d458bd | tests/42-i18n-parity.test.js |

## What Each Gate Pins

**tests/42-precache.test.js (T-42-V6)** — fs source-scan mirroring tests/39-help-precache.test.js. Isolates `PRECACHE_URLS` and `PRECACHE_HTML` as SEPARATE regex regions and asserts:
- the four sub-resource assets (`/assets/changelog-content-en.js`, `/assets/whats-new.js`, `/assets/changelog.js`, `/assets/changelog.css`) are in `PRECACHE_URLS`;
- the extensionless `/changelog` page route is in `PRECACHE_HTML`;
- the page is NOT in `PRECACHE_URLS` and no `changelog.html` entry appears there (RESEARCH Pitfall 1 — the redirected-response failure mode);
- the anti-stale guard `fetch(url,{cache:'reload'})` is intact and no bare `cache.add(url)` regressed;
- no bogus `whats-new.css` entry is demanded (popup CSS lives in app.css).

RED shape: 5 failures (4 assets + `/changelog` in HTML not yet present); all guards pass. Plan 08 turns it green.

**tests/42-demo-gate.test.js (T-42-V10)** — two isolated jsdom harnesses (mirrors tests/41-demo-gate.test.js + tests/35-demo-chrome.test.js). Pins observable DOM:
- Menu row (D-15): normal page → `App.initHelpEntry` mounts a `.help-entry-item[data-label-key="whatsNew.menuRow"]` with `href="./changelog.html"`; demo (`window.name==='demo-mode'`) → the row is absent (filtered, no dead row).
- Footer link (D-15): normal → `SharedChrome.renderFooter` wraps the `v{APP_VERSION}` text in `<a href="./changelog.html">` inside `.app-footer-copy`, with `.app-footer-version-warn` a SIBLING OUTSIDE the anchor; demo → version text inert (no changelog anchor).

RED shape: 2 normal-mode assertions fail (row/link not yet added); the 2 demo-mode guards pass. Plans 07/09 turn it green.

**tests/42-i18n-parity.test.js (T-42-V11)** — vm-sandbox load of en/he/de/cs mirroring tests/40-i18n-parity.test.js. For each of the 10 keys (`changelog.page.title`, `changelog.page.intro`, `changelog.cat.new`, `changelog.cat.improved`, `changelog.cat.fixed`, `whatsNew.title`, `whatsNew.sub`, `whatsNew.seeAll`, `whatsNew.close`, `whatsNew.menuRow`) asserts presence + non-empty + cross-locale parity + no-emoji (D-10).

RED shape: presence/non-empty fails (40 missing); parity + no-emoji pass vacuously. Plan 07 turns it green.

## Deviations from Plan

None — plan executed exactly as written. All three tasks matched their acceptance criteria: valid JS (`node -c` passes), each exits non-zero RED, and each fails for the un-implemented target rather than a parse error.

## Verification

- `node tests/42-precache.test.js` → exit 1 (5 RED, guards green).
- `node tests/42-demo-gate.test.js` → exit 1 (2 RED normal-mode, 2 green demo-mode guards).
- `node tests/42-i18n-parity.test.js` → exit 1 (presence RED, parity + no-emoji green).
- All three are top-level `tests/*.test.js`, auto-discovered by `tests/run-all.js`.

## Known Stubs

None. These are test files with no runtime UI surface.

## Self-Check: PASSED

- FOUND: tests/42-precache.test.js
- FOUND: tests/42-demo-gate.test.js
- FOUND: tests/42-i18n-parity.test.js
- FOUND commit 7f7a283, 5884971, 4d458bd
