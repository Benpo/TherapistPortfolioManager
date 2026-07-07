---
phase: 37-date-consistency-date-format-setting-f6-f5
plan: 07
subsystem: personalization-settings
status: complete
tags: [session-types, personalization, resolver, localStorage, xss-safe, cross-tab, f4]
requires:
  - "37-06: empty F4 container (#sessionTypesEditor + #sessionTypeAddInput + #sessionTypeAddBtn) + full F4 i18n key set + script tag/precache"
  - "37-02: RED spec tests/37-personalization.test.js (editor/resolver/security DOM contract)"
  - "37-05: backup.js round-trips portfolioSessionTypes (settings-block scalar)"
provides:
  - "F4 two-tier session-type editor (assets/settings-session-types.js): 5 locked defaults (rename + lock, no delete) + custom rows (rename + delete)"
  - "App.formatSessionType — synchronous localStorage-backed resolver (override D-16 -> custom -> i18n default -> raw key D-18)"
  - "App.getSessionTypes() — freshly-read ordered list (5 defaults + custom) on each call"
  - "localStorage['portfolioSessionTypes'] = {overrides,custom} — the single durable session-type key (D-17)"
  - "window.SessionTypesEditor.deleteType(key) — two-layer locked-delete guard"
  - "cross-tab: App.initCommon native storage-event listener re-dispatches app:session-types-changed in peer tabs (FIX 2)"
affects:
  - "37-08 (add-session cards): consumes App.getSessionTypes()/formatSessionType for the type picker; the add-session birthdate case stays RED until Plan 08"
tech-stack:
  added: []
  patterns:
    - "Synchronous localStorage scalar resolver (mirrors portfolioDateFormat read: try/catch + JSON.parse with default), no async cache"
    - "Self-booting DOMContentLoaded editor IIFE that never calls App.initCommon (Pitfall 1)"
    - "createElementNS SVG icons copied (not called) from IIFE-private settings.js/settings-snippets.js builders (FIX 8)"
    - "Store-only-deviations model: overrides + custom, never materialized defaults (Pitfall 3)"
key-files:
  created:
    - assets/settings-session-types.js
  modified:
    - assets/app.js
decisions:
  - "D-16: renames are GLOBAL — one language-agnostic override string per locked key applies everywhere formatSessionType is used"
  - "D-17: ONE localStorage key portfolioSessionTypes {overrides,custom} — localStorage NOT IndexedDB (IDB does not round-trip backup restore; 37-PATTERNS A2 CORRECTED); backup already persists it (Plan 05)"
  - "D-18: raw String(key) fallback when a type is not in the managed list; legacy clinic/online/other resolve forever via DEFAULT_TYPE_I18N (D-14)"
  - "formatSessionType is now a SYNCHRONOUS localStorage resolver (no IDB, no module cache, no first-paint race)"
metrics:
  duration: "~35 min"
  completed: "2026-07-03"
  tasks: 2
  files_created: 1
  files_modified: 1
---

# Phase 37 Plan 07: F4 Two-Tier Session-Type Editor + Synchronous Resolver Summary

The F4 session-type editor now lives in the Plan 06 container: 5 locked defaults (rename input + lock icon, no delete) render first in fixed order, custom rows (rename + delete) follow, and `App.formatSessionType` is a synchronous `localStorage['portfolioSessionTypes']` resolver with global renames (D-16) and a raw-string fallback (D-18) — turning the editor, resolver, and XSS-as-text behavior tests GREEN.

## What Was Built

**Task 1 — synchronous resolver + getSessionTypes + cross-tab listener** (commit `41d9165`, `assets/app.js`)
- Added `SESSION_TYPE_ORDER` + `DEFAULT_TYPE_I18N` (the 5 locked keys → their `session.type.*` i18n keys) and a private `_readSessionTypes()` that reads `localStorage['portfolioSessionTypes']` behind try/catch, JSON.parse's it, and normalizes to `{overrides:{}, custom:[]}` (missing/corrupt → both empty). No IDB, no module cache, no async.
- Reworked `formatSessionType(type)`: non-empty override (D-16) → custom entry label → known-default i18n string → RAW `String(key)` (D-18). Legacy `clinic/online/other` resolve forever via the map (D-14). Signature/export unchanged so overview/sessions/export-modal callers are untouched.
- Added `App.getSessionTypes()` — a freshly-read ordered list (5 defaults with resolved labels + custom) on each call, mirroring `App.getSnippets`; exported on the App public surface.
- `initCommon` registers a native `window.addEventListener("storage", …)` that re-dispatches `app:session-types-changed` on a `portfolioSessionTypes` change (idempotent via `initCommon._sessionTypesStorageListenerInstalled`). The native `storage` event fires only in peer tabs — exactly the cross-tab case (FIX 2).

**Task 2 — two-tier editor IIFE** (commit `a7f44d0`, `assets/settings-session-types.js` NEW)
- Self-booting IIFE (boots on `DOMContentLoaded`, never `App.initCommon`). `renderTypeList()` reads `localStorage['portfolioSessionTypes']` directly, clears `#sessionTypesEditor`, and appends 5 locked defaults (fixed D-13 order) then custom rows; an empty-state helper shows when there are no custom types.
- `buildTypeRow`: locked rows get a `.session-type-rename-input` + a `.session-type-lock` (tooltip) and NO delete button; custom rows get the rename input + a `.session-type-delete-btn`. Lock (padlock) and trash SVGs are built via a COPIED `buildSvg`/createElementNS path — the source symbols are IIFE-private (FIX 8).
- Persistence stores only deviations: `commitRename` writes/clears a global override string for locked keys, updates the entry label for custom keys (blank/length/duplicate guarded); `addCustomType` validates (non-blank, ≤60, no dup) and appends `{key:'custom.<ts>', label}`; `deleteType(key)` returns `false` for a locked key and `true` after removing a custom entry. Never materialized defaults (Pitfall 3).
- Two-layer locked-delete guard: no delete button rendered for locked rows AND `deleteType` early-returns `false` on a locked key (Pitfall 4). Exposed as `window.SessionTypesEditor.deleteType`.
- After any add/rename/delete: write → dispatch within-tab `app:session-types-changed` → re-render from the just-written value. Re-renders on `app:language` (un-renamed defaults re-translate, overrides stay fixed) and on `app:session-types-changed` (cross-tab). Every user label renders via `input.value`/`textContent` — never innerHTML.

## Verification (GREEN gate)

`node tests/37-personalization.test.js` → **12 passed, 1 failed** (13 total). All cases this plan owns are GREEN:

| Test case | State | Owner |
|-----------|-------|-------|
| 4 editor: 5 locked defaults (rename + lock, no delete, fixed order) | GREEN (this plan) | 37-07 |
| 5 editor: add custom persists to `.custom` + fires `app:session-types-changed` | GREEN (this plan) | 37-07 |
| 6 editor: rename locked default writes a global override (D-16) | GREEN (this plan) | 37-07 |
| 7 editor: two-layer delete guard (`deleteType('clinic')===false`, custom deletes) | GREEN (this plan) | 37-07 |
| 8 editor: single-mount (initCommon ≤ 1) | GREEN | 37-06/07 |
| 9 resolver: override → i18n default → raw fallback (D-16/D-18) | GREEN (this plan) | 37-07 |
| 10 backup: real export→restore round-trips both prefs | GREEN | 37-05 |
| 13 security: XSS payload renders as literal `.value`, no `<img>`, onerror never fires | GREEN (this plan) | 37-07 |
| 1/2/3 picker | GREEN | 37-06 |
| **12 birthdate: add-session inline/edit native date inputs** | **expected-RED** | **37-08** |

- The single remaining RED (case 12) is the add-session birthdate `<input type="date">` swap — Plan 08 scope, unchanged by this plan. Documented as expected-RED in 37-06-SUMMARY too.
- `npm test` full suite → **120 passed, 1 failed, 121 total**; the only failing file is `37-personalization.test.js` on case 12 (Plan 08). No regressions from the app.js resolver rework.
- Grep gates: non-comment `innerHTML` in `settings-session-types.js` = **0**; `DOMContentLoaded` present with **no** `App.initCommon` call (the 3 `initCommon` matches are all in comments); `portfolioSessionTypes` present with **no** `PortfolioDB`/`setTherapistSetting` use; `app:session-types-changed` present; `addEventListener("storage"` present in `app.js`.

## Deviations from Plan

None — plan executed as written. No Rule 1-4 deviations required.

Design note (not a deviation): the editor's `renderTypeList` reads `localStorage['portfolioSessionTypes']` directly plus its own `LOCKED_DEFAULTS`/`DEFAULT_TYPE_I18N` constants rather than delegating enumeration to `App.getSessionTypes()`. This is required for correctness under the test harness (which stubs `App.getSessionTypes` to return `[]`) and is strictly more robust in production — the editor never depends on an async-primed cache to render its own locked defaults. `App.getSessionTypes()` remains exposed per the plan for downstream consumers (Plan 08 add-session picker).

## Threat Flags

None beyond the plan's register. T-37-07-SEC (label XSS) is mitigated and test-proven (case 13: payload stays literal `.value`, zero `<img>` parsed, `onerror` never executes); T-37-07-01 (locked delete) mitigated two ways (case 7); T-37-07-02 (oversized/duplicate label) mitigated via blank/≤60/duplicate validation in add + rename. No new network/auth/schema surface introduced.

## Self-Check: PASSED

- FOUND: assets/settings-session-types.js
- FOUND: assets/app.js (`getSessionTypes`, `_readSessionTypes`, `addEventListener("storage"`)
- FOUND commit: 41d9165 (Task 1 — resolver + getSessionTypes + storage listener)
- FOUND commit: a7f44d0 (Task 2 — two-tier editor IIFE)
- Re-confirmed `node tests/37-personalization.test.js` → 12 passed / 1 (expected-RED, Plan 08); `npm test` → 120 passed / 1 (same file, case 12)
