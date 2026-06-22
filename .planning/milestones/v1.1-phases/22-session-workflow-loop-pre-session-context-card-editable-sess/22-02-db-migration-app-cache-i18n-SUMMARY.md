---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 02
subsystem: database
tags: [indexeddb, i18n, broadcastchannel, settings, cache, migration]

# Dependency graph
requires:
  - phase: 16-audit-fix-code
    provides: PortfolioDB withStore/clearStore patterns, sequential MIGRATIONS ladder
  - phase: 14-i18n-bugs-legal-footer-cleanup-and-contact-email-update
    provides: 4-language i18n key parity standard (en/de/he/cs)
provides:
  - PortfolioDB v4 schema with therapistSettings object store (keyPath sectionKey)
  - PortfolioDB.getAllTherapistSettings() / setTherapistSetting() / clearTherapistSettings() public API
  - App.getSectionLabel(sectionKey, defaultI18nKey) custom-label-with-fallback resolver
  - App.isSectionEnabled(sectionKey) section visibility getter (defaults true)
  - Eager-loaded _sectionLabelCache populated in async initCommon BEFORE setLanguage
  - BroadcastChannel('sessions-garden-settings') cross-tab sync dispatching DOM event 'app:settings-changed'
  - 35 Settings page i18n keys per language across en/de/he/cs (with 8 keys from 2026-04-28 amendment)
  - Updated session.copyAll value across all 4 languages
affects: [22-04-settings-page, 22-06-export-modal-and-buildSessionMarkdown, 22-08-sw-cache-shared-chrome-gear, future plans rendering session sections]

# Tech tracking
tech-stack:
  added: [BroadcastChannel API]
  patterns:
    - "Single label-resolution layer (App.getSectionLabel) — every section render site funnels through one getter"
    - "Eager cache load in async initCommon: await DB read BEFORE setLanguage so first applyTranslations pass sees custom labels"
    - "Cross-tab sync via BroadcastChannel + document CustomEvent decoupling (DB → cache → DOM event → re-render)"
    - "Verbatim customLabel storage with JSDoc-mandated textContent/value rendering (XSS mitigation T-22-02-01)"

key-files:
  created: []
  modified:
    - "assets/db.js — DB_VERSION 3→4, MIGRATIONS[4] therapistSettings store, public API trio, clearAll extended"
    - "assets/app.js — _sectionLabelCache + getSectionLabel + isSectionEnabled, async initCommon with eager DB load, BroadcastChannel listener"
    - "assets/i18n-en.js — 35 Settings keys + session.copyAll value update"
    - "assets/i18n-de.js — 35 Settings keys + session.copyAll value update"
    - "assets/i18n-he.js — 35 Settings keys + session.copyAll value update (gender-neutral Hebrew)"
    - "assets/i18n-cs.js — 35 Settings keys + session.copyAll value update"

key-decisions:
  - "Migration 4 is purely additive — no data mutation in clients/sessions stores; preserves all existing user data"
  - "customLabel stored verbatim (not HTML-escaped at write time); render-site plans (22-04, 22-06) own textContent/value enforcement"
  - "_sectionLabelCache is module-private; only getSectionLabel/isSectionEnabled getters are exported"
  - "BroadcastChannel payload carries no PII — just {type: 'therapist-settings-changed'} signal; receivers re-read DB"
  - "initCommon converted to async; existing await-less callers still get synchronous chrome wired (renderNav, themeToggle), and the cache load happens before setLanguage as required"
  - "Hebrew action button copy uses gender-neutral 'בטל' / 'שמור' / 'השאר' forms"

patterns-established:
  - "Section label resolution: always go through App.getSectionLabel(sectionKey, defaultI18nKey) — never hardcode custom labels at render sites"
  - "Cross-tab settings sync: post {type:'therapist-settings-changed'} to BroadcastChannel('sessions-garden-settings'); peer tabs re-load cache and dispatch document 'app:settings-changed'"
  - "i18n parity: every Settings key appended to all 4 language files in the same order with locale-correct values; key parity verified via grep"

requirements-completed: [REQ-2, REQ-3, REQ-4, REQ-6, REQ-21, REQ-11, REQ-17, REQ-19]

# Metrics
duration: ~25min
completed: 2026-05-06
---

# Phase 22 Plan 02: DB Migration + App Cache + i18n Foundation Summary

**IndexedDB v4 with therapistSettings store, App.getSectionLabel/isSectionEnabled getters, eager-loaded cache, BroadcastChannel cross-tab sync, and 35 Settings i18n keys across en/de/he/cs.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-06 (worktree agent-a3add6d5b23530cdf)
- **Completed:** 2026-05-06
- **Tasks:** 3 / 3
- **Files modified:** 6 (assets/db.js, assets/app.js, 4× i18n files)

## Accomplishments

- DB schema v3 → v4: added `therapistSettings` object store with `sectionKey` keyPath via additive migration (no risk to existing clients/sessions data)
- Three new public DB functions: `getAllTherapistSettings()`, `setTherapistSetting(record)`, `clearTherapistSettings()` — `setTherapistSetting` trims customLabel and includes JSDoc mandating textContent/value rendering as XSS mitigation
- Two new App API functions: `getSectionLabel(sectionKey, defaultI18nKey)` returning user-customized labels with i18n fallback, and `isSectionEnabled(sectionKey)` defaulting true
- `initCommon()` converted to async — therapistSettings cache loaded BEFORE `setLanguage()` so the first `applyTranslations()` pass can resolve custom labels
- BroadcastChannel(`sessions-garden-settings`) listens for `therapist-settings-changed` peer messages; on receipt refreshes the cache and dispatches a document `app:settings-changed` CustomEvent for re-render
- 35 Settings page i18n keys + 8 amendment keys appended to en/de/he/cs (header, page chrome, 9 row descriptions, indicator, syncMessage, discard dialog, save toast, rename validation, reset tooltip, save/discard actions, banner heading + 2 bullets, disable-confirm dialog, locked-rename tooltip)
- `session.copyAll` value updated in all 4 languages from "Copy Session (MD)" → "Copy session text" (en) / "Sitzungstext kopieren" (de) / "העתק טקסט סשן" (he) / "Kopírovat text sezení" (cs); key identifier unchanged so no DOM data-i18n changes downstream

## Task Commits

Each task was committed atomically:

1. **Task 1: Add MIGRATIONS[4] therapistSettings store + public DB API** — `6bfaea0` (feat)
2. **Task 2: Add App.getSectionLabel/isSectionEnabled + eager cache + BroadcastChannel listener** — `adaa19c` (feat)
3. **Task 3: Add Settings page i18n keys to all 4 language files** — `f80e95d` (feat)

_Note: Plan metadata commit (SUMMARY.md) is performed by the orchestrator after worktree merge._

## Files Created/Modified

- `assets/db.js` — DB_VERSION bumped 3→4; new `MIGRATIONS[4]` purely additive (`createObjectStore("therapistSettings", { keyPath: "sectionKey" })`); added `setTherapistSetting`, `getAllTherapistSettings`, `clearTherapistSettings`; extended `clearAll()` to clear therapistSettings; all three new functions exported on PortfolioDB.
- `assets/app.js` — module-private `_sectionLabelCache` Map; `getSectionLabel`/`isSectionEnabled` declared after the i18n block; `initCommon` converted to `async`; eager cache load via `await PortfolioDB.getAllTherapistSettings()` placed BEFORE `setLanguage(savedLang)`; BroadcastChannel listener wired (refreshes cache and dispatches document `app:settings-changed` CustomEvent); new getters exported from App IIFE.
- `assets/i18n-en.js` — appended 35 Settings keys (English values per UI-SPEC); updated `session.copyAll` to "Copy session text".
- `assets/i18n-de.js` — appended same 35 keys (German values); updated `session.copyAll` to "Sitzungstext kopieren".
- `assets/i18n-he.js` — appended same 35 keys (Hebrew values, gender-neutral); updated `session.copyAll` to "העתק טקסט סשן".
- `assets/i18n-cs.js` — appended same 35 keys (Czech values); updated `session.copyAll` to "Kopírovat text sezení".

## Decisions Made

- **Migration 4 is additive-only.** No cursor walk over clients/sessions, no field manipulation. The therapistSettings store starts empty for all existing users; `getSectionLabel` returns the i18n fallback until a user opens Settings (Plan 22-04) and saves at least one customization. Risk profile: zero data loss, zero migration runtime cost.
- **customLabel stored verbatim.** No HTML-escape at write time. JSDoc on `setTherapistSetting` explicitly mandates `.textContent` or `.value` (never `innerHTML`) at every render site. This is the T-22-02-01 mitigation contract — Plans 22-04 and 22-06 own enforcement at their render sites.
- **Eager cache load in async initCommon.** Required so the first `applyTranslations()` pass (called by `setLanguage`) can resolve custom labels via `getSectionLabel`. The cache must be populated BEFORE setLanguage runs.
- **Existing initCommon callers don't await.** All five callers (`overview.js`, `sessions.js`, `reporting.js`, `add-client.js`, `add-session.js`) invoke `App.initCommon()` synchronously. After the conversion to async, the synchronous chrome wiring (renderNav, themeToggle, langPopover) still completes before the function suspends at the first `await`. setLanguage and downstream applyTranslations then run after the cache populates. This is the intended D-09 behavior — no caller changes needed.
- **BroadcastChannel uses minimal-payload signal pattern.** Peer tabs only post `{type: "therapist-settings-changed"}`; receivers re-read the DB to get fresh state. No PII flows over the channel (T-22-02-03 accept disposition).

## Deviations from Plan

None — plan executed exactly as written, including all 2026-04-28 amendment additions (8 new keys + session.copyAll value update). No Rule 1/2/3 auto-fixes triggered. No Rule 4 architectural decisions surfaced.

## Issues Encountered

**Czech / German Unicode escape auto-conversion at write time.** The runtime/editor toolchain auto-escaped some accented characters in strings I wrote (e.g. `Uložit změny` was stored as `Uložit změny`, `Über Einstellungen` as `Über Einstellungen`). This matches the pre-existing pattern in those files (39 raw accented chars vs. 58 `\u` escapes already in i18n-cs.js before this plan). The JavaScript evaluates to the correct semantic strings — verified end-to-end via `node` REPL evaluation:

```
de save: Änderungen speichern
de copyAll: Sitzungstext kopieren
cs save: Uložit změny
cs copyAll: Kopírovat text sezení
he save: שמור שינויים
en save: Save changes
```

No fix needed — the escape sequences are functionally identical to raw Unicode in JavaScript string literals, and the project already mixes both styles.

## User Setup Required

None — no external service configuration required. Cache load on first run after deploy will simply find an empty therapistSettings store and `getSectionLabel` will return i18n fallbacks.

## Next Phase Readiness

Plan 22-04 (Settings page) can now:
- Read existing settings via `await PortfolioDB.getAllTherapistSettings()`
- Persist user input via `await PortfolioDB.setTherapistSetting({sectionKey, customLabel, enabled})`
- Notify peer tabs via `new BroadcastChannel('sessions-garden-settings').postMessage({type: 'therapist-settings-changed'})`
- Use the 35+ i18n keys (settings.page.*, settings.row.*, settings.indicator.*, settings.discard.*, settings.saved.*, settings.rename.*, settings.reset.*, settings.action.*, settings.banner.*, settings.confirm.disable.*, settings.rename.locked.*)

Plan 22-06 (export modal + buildSessionMarkdown) can call `App.getSectionLabel(sectionKey, defaultI18nKey)` at render sites instead of `App.t(defaultI18nKey)`. Per T-22-02-01 contract: must use `.textContent` / `.value` (never `innerHTML`) at those call sites.

## Self-Check: PASSED

**Files modified verified to exist:**
- `assets/db.js` ✓
- `assets/app.js` ✓
- `assets/i18n-en.js` ✓
- `assets/i18n-de.js` ✓
- `assets/i18n-he.js` ✓
- `assets/i18n-cs.js` ✓

**Commits verified in `git log`:**
- `6bfaea0` (Task 1) ✓
- `adaa19c` (Task 2) ✓
- `f80e95d` (Task 3) ✓

**Plan-level verification:**
- `node -c assets/db.js` ✓
- `node -c assets/app.js` ✓
- `node -c assets/i18n-{en,de,he,cs}.js` ✓
- All 11 required Settings keys + 9 settings.row.* keys present in all 4 languages ✓
- `session.copyAll` updated in all 4 languages; old "Copy Session (MD)" string absent ✓

**Stub scan:** No stubs, TODOs, or FIXMEs introduced. No `innerHTML` usage on customLabel-touching code paths.

**Threat surface scan:** No new security-relevant surface beyond what's already in the plan's `<threat_model>`. T-22-02-01 mitigation contract documented in JSDoc; enforcement deferred to render-site plans (22-04, 22-06) per plan design.

---
*Phase: 22-session-workflow-loop-pre-session-context-card-editable-sess*
*Plan: 02 — DB Migration + App Cache + i18n*
*Completed: 2026-05-06*
