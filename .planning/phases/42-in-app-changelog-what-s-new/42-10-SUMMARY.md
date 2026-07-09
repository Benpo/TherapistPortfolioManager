---
phase: 42-in-app-changelog-what-s-new
plan: 10
subsystem: changelog-entry-points
tags: [changelog, discoverability, demo-gate, footer, help-center, chrome]
requires:
  - "assets/whats-new.js + assets/changelog-content-en.js (popup surface + data, plans 07/09)"
  - "whatsNew.menuRow i18n key (plan 08)"
  - "changelog.html page (plan 05)"
provides:
  - "CHLG-02 entry points: '?' popover row, footer version link, help-center see-also rail"
  - "demo-mode suppression of both mounting entry points (T-42-V10 green)"
affects:
  - "assets/app.js (initHelpEntry popover)"
  - "assets/shared-chrome.js (renderFooter)"
  - "help.html (chrome-mounting page)"
tech-stack:
  added: []
  patterns:
    - "items-array + demo-filter pattern (mirrors help.entry.takeTour tour filter)"
    - "isDemo seam (window.name==='demo-mode') for footer entry-point suppression"
    - "independence guard: warn-span sibling OUTSIDE the changelog anchor"
key-files:
  created: []
  modified:
    - "assets/app.js"
    - "assets/shared-chrome.js"
    - "assets/app.css"
    - "help.html"
    - "assets/help.css"
decisions:
  - "D-14: '?' row is a DESTINATION link to ./changelog.html (the page), never a popup re-trigger — announcements stay one-time"
  - "D-15: demo suppresses both mounting entry points (row filtered in app.js, footer link inert via isDemo); page unreachable from the demo iframe"
  - "T-42-09 independence guard: footer link wraps ONLY the version text; .app-footer-version-warn stays a sibling outside the anchor; maybeUpgradeFooterAndNudge untouched"
  - "D-13: help.html link is a quiet see-also rail (.help-see-also), not a workflow-spine card"
metrics:
  duration: ~15min
  completed: 2026-07-09
status: complete
---

# Phase 42 Plan 10: Changelog Entry Points (CHLG-02) Summary

Added the three changelog discoverability entry points — the "?" popover "What's new" row (D-14 page link), the quiet footer version link (demo-inert, integrity-marker independent), and a help-center see-also rail (D-13) — with demo-mode suppression of the two chrome-mounting entry points (D-15). Turns the demo-gate test T-42-V10 fully green (4/4).

## What Was Built

**Task 1 — "?" popover "What's new" row + demo filter (assets/app.js)**
- Added `{ labelKey: 'whatsNew.menuRow', href: './changelog.html' }` to `initHelpEntry`'s addable items array, placed after the tour row. It is a DESTINATION link (opens the changelog PAGE), never a popup re-trigger (D-14), so announcements stay one-time. Label renders via `textContent` from the i18n dict through the existing forEach mount loop (never innerHTML — T-42-01).
- Extended the existing demo filter (which dropped `help.entry.takeTour`) to ALSO drop `whatsNew.menuRow` in demo mode (D-15), so no dead row renders in the sales demo.
- Commit: `8aca0f5`

**Task 2 — footer version link (assets/shared-chrome.js, assets/app.css)**
- In `renderFooter`, the `v{APP_VERSION}` text is now wrapped in a quiet `<a class="app-footer-version-link" href="./changelog.html">` when NOT in demo, and rendered as inert plain text in demo (reusing the same `isDemo` seam as `licenseLinkHtml`). Version is read only from `APP_VERSION` — no integrity-token coupling.
- **Independence guard (T-42-09):** the `.app-footer-version-warn` marker span stays a SIBLING OUTSIDE the changelog anchor. `maybeUpgradeFooterAndNudge` / the integrity nudge region (149-183) were not touched — no double-signalling between the changelog link and the integrity marker.
- Added `.app-footer-version-link` style: `color: inherit` (muted like surrounding copy, never accent-colored), underline only on hover/focus.
- Commit: `ae5e525`

**Task 3 — help.html see-also rail + popup-surface scripts (help.html, assets/help.css)**
- Added a quiet `.help-see-also` link → `./changelog.html` (`data-i18n="whatsNew.menuRow"`) as a secondary see-also affordance under the contact band, not a workflow-spine card (D-13).
- Added `changelog-content-en.js` then `whats-new.js` immediately after `attention-coordinator.js` and before `app.js` — matching the plan-09 wiring convention on the other 7 chrome pages. help.html is a chrome-mounting page, so the one-time popup can fire here too (RESEARCH Pitfall 2); handled in this plan to avoid a same-wave file conflict with plan 09.
- Muted see-also styling in help.css (underline on hover only).
- Commit: `4d7620a`

## Verification

- `node tests/42-demo-gate.test.js` → **4 passed, 0 failed** (was 2/2 failing at plan start). Pins: normal-mode menu row mounts with `href=./changelog.html`; demo-mode row absent; normal-mode footer version text wrapped in `./changelog.html` anchor with warn-span outside; demo-mode footer version inert.
- `node -c assets/app.js` and `node -c assets/shared-chrome.js` pass.
- help.html grep gate: contains `changelog-content-en.js`, `whats-new.js`, `changelog.html`; load order confirmed (coordinator → data → surface → app.js).

## Threat Mitigations Applied

| Threat ID | Mitigation | Status |
|-----------|------------|--------|
| T-42-03 (demo-mode entry points) | Row filtered in app.js demo filter; footer link inert via isDemo; page unreachable from demo iframe | Applied, guarded by T-42-V10 (4/4 green) |
| T-42-09 (footer link vs integrity nudge) | Link wraps ONLY version text; warn-span sibling outside anchor; maybeUpgradeFooterAndNudge untouched | Applied |
| T-42-01 (menu-row label render) | Label via textContent from i18n dict (existing forEach mount path, never innerHTML) | Applied |

## Deviations from Plan

None — plan executed exactly as written. Minor style additions (`.app-footer-version-link` in app.css, `.help-see-also` in help.css) were anticipated by the plan ("add the rule to app.css if a class is needed") and kept the links quiet/muted per UI-SPEC.

## Known Stubs

None. All three entry points are wired to the real `changelog.html` page and the real i18n key; no placeholder or empty-data paths introduced.

## Self-Check: PASSED

- FOUND: assets/app.js (whatsNew.menuRow row + extended demo filter)
- FOUND: assets/shared-chrome.js (versionHtml anchor, warn-span independent)
- FOUND: help.html (see-also link + 2 script tags in order)
- FOUND commit 8aca0f5, ae5e525, 4d7620a in git log
