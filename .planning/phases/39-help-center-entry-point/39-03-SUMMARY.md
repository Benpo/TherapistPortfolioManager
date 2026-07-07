---
phase: 39-help-center-entry-point
plan: 03
subsystem: app-chrome
tags: [help, header, popover, i18n, nav]
requires:
  - "i18n keys help.entry.* + nav.help (Plan 02)"
provides:
  - "App.initHelpEntry() — persistent '?' header entry + addable help popover"
  - "renderNav() Help anchor (./help.html, data-nav=help)"
  - "App.initHelpEntry test seam on the App public surface"
affects:
  - "every SW-registered app page (initCommon mounts the '?' entry)"
  - "help.html (Plan 04) — receives active nav marking + popover target for free"
tech-stack:
  added: []
  patterns:
    - "icon-button mount mirrors initSettingsLink (idempotent guard, i18n label, is-active, install-once app:language listener)"
    - "popover open/close/outside-click-dismiss + aria-expanded sync mirrors initLanguagePopover (D-09 globe pattern)"
    - "addable item array so Phases 40–42 append entries without a rewrite (D-09/D-10)"
    - "popover item labels via textContent (never innerHTML); inline SVG glyph is the only compile-time-literal innerHTML"
key-files:
  created:
    - tests/39-help-entry.test.js
  modified:
    - assets/app.js
decisions:
  - "initHelpEntry exported as a documented test seam (mirrors checkBackupReminder/showBackupBanner) so the jsdom test drives the mount directly without booting the full async initCommon"
  - "'?' button wrapped in a .help-entry container (like initLanguagePopover's .lang-selector) to host the popover; idempotency guard querySelector still resolves it inside #headerActions"
  - "Feather help-circle glyph (circle + question-mark path + dot), 20x20 in a 24x24 viewBox, stroke=currentColor — RTL-neutral, no physical props/hex added to app.js"
metrics:
  duration: ~12min
  completed: 2026-07-07
status: complete
---

# Phase 39 Plan 03: Help Center "?" Entry Point Summary

`App.initHelpEntry()` mounts a persistent "?" header affordance + an addable Help popover (Help center → ./help.html, Contact us → mailto) into `#headerActions` on every app page via `initCommon()`, and `renderNav()` gains a Help nav entry — both guarded by a real-jsdom mount/idempotency/popover test.

## What Was Built

**Task 1 — `initHelpEntry()` + Help nav entry (commit `44d40d2`)**
- New module-private `initHelpEntry()` in `assets/app.js`, composed from two shipped chrome patterns: the `initSettingsLink` icon-button mount (idempotent double-mount guard, aria-label/title from `t('help.entry.label')`, compile-time-literal inline SVG, `.is-active` on `body[data-nav]='help'`, install-once `app:language` re-translate listener via `initHelpEntry._listenerInstalled`) and the `initLanguagePopover` popover (hidden-attribute toggle, `aria-expanded` sync, outside-click dismiss).
- Popover items come from an **addable array** (`[{labelKey:'help.entry.center', href:'./help.html'}, {labelKey:'help.entry.contact', href:'mailto:contact@sessionsgarden.app'}]`) so Phases 40–42 append "Replay welcome / Take tour / What's new" with no rewrite. Each item is an `<a>` whose label is set via `textContent` (T-39-05 injection guard).
- `renderNav()` gains `<a href="./help.html" data-nav="help" data-i18n="nav.help">` as the last nav item — active marking + translation are automatic via the existing loop + `applyTranslations`.
- Wired into `initCommon()` right after `initSettingsLink()`; exported as a documented test seam.

**Task 2 — jsdom guard (commit `a94ee6e`)**
- `tests/39-help-entry.test.js` boots the real `assets/app.js` into an isolated jsdom window (seeding `window.I18N.en` from `assets/i18n-en.js`) and asserts, on observable DOM only: the Help nav anchor; a single `.help-entry-btn` mount; `.is-active` parity (present on help page, absent off it); `aria-label`/`title` from i18n; the two popover items' `textContent` + hrefs; idempotency across a second call; and click-to-open / outside-click-dismiss `aria-expanded` transitions.

## Verification

- Task 1 source-shape smoke check: **OK app.js wiring**.
- `node --check assets/app.js`: **SYNTAX OK**; no new physical `right:`/`left:` or literal hex in the help code (prohibition satisfied).
- `node tests/39-help-entry.test.js`: **6 passed, 0 failed** (exit 0).
- Falsifiability: removing the `if (actions.querySelector('.help-entry-btn')) return;` guard makes the single-mount assertion fail (`2 !== 1`); restored → green (verified during execution).
- `npm test`: **133 passed, 0 failed** — the new test is auto-discovered and green.

## Threat Model

Both registered threats are mitigated as planned:
- **T-39-04 (Tampering, inline SVG glyph):** the "?" SVG is a hard-coded compile-time literal — no user-interpolated markup.
- **T-39-05 (Tampering, popover item labels):** item labels are set via `textContent` from the i18n dict, never `innerHTML` — no injection surface.

## Deviations from Plan

None — plan executed as written. The plan's `<action>` left insertion order and the idempotency-test entry point to executor discretion; both were resolved within the plan's stated latitude (container wrap for popover hosting; `App.initHelpEntry` test seam per the plan's "initCommon()/initHelpEntry" acceptance wording).

## Notes for Later Plans

- **Plan 04 (help.html):** the popover "Help center" item already targets `./help.html`; the Help nav anchor gives that page active marking for free once its `<body>` carries `data-nav="help"`.
- **Phases 40–42:** append new popover entries to the `items` array in `initHelpEntry()` — the render loop, `textContent` labelling, and `app:language` re-translate already cover new rows.
- **Plan 06 (visual polish):** no CSS was added here; the "?" button reuses `.header-control-btn`. The `.help-entry` / `.help-entry-popover` / `.help-entry-item` classes are the styling hooks (popover currently shows/hides via the `hidden` attribute only).

## Self-Check: PASSED

- FOUND: `assets/app.js`
- FOUND: `tests/39-help-entry.test.js`
- FOUND commit: `44d40d2` (feat)
- FOUND commit: `a94ee6e` (test)
