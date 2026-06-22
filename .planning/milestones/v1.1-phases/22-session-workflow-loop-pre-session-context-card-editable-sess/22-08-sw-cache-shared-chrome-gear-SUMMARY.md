---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 08
subsystem: pwa-shell
tags: [service-worker, precache, cache-bump, header-actions, gear-icon, settings, i18n, rtl]

# Dependency graph
requires:
  - phase: 22
    plan: 01
    provides: "assets/jspdf.min.js, assets/fonts/noto-sans-base64.js, assets/fonts/noto-sans-hebrew-base64.js (vendored libs/fonts to add to PRECACHE_URLS)"
  - phase: 22
    plan: 02
    provides: "i18n key header.settings.label across en/de/he/cs (consumed by gear icon aria-label/title)"
  - phase: 22
    plan: 03
    provides: "assets/md-render.js (added to PRECACHE_URLS)"
  - phase: 22
    plan: 04
    provides: "settings.html + assets/settings.js (added to PRECACHE_URLS / PRECACHE_HTML; gear icon links to ./settings.html)"
  - phase: 22
    plan: 05
    provides: "assets/pdf-export.js (added to PRECACHE_URLS so PDF export works offline)"
provides:
  - "sw.js CACHE_NAME = 'sessions-garden-v53' — bumped from v52 so installed PWA users evict the old shell on activate"
  - "sw.js PRECACHE_URLS extended with 6 Phase 22 assets (settings.js, pdf-export.js, md-render.js, jspdf.min.js, noto-sans-base64.js, noto-sans-hebrew-base64.js) — offline use of Settings + PDF export pipeline"
  - "sw.js PRECACHE_HTML extended with /settings (pretty-URL convention per Phase 19 D-Deploy) — Settings page reachable offline"
  - "App.initSettingsLink — gear-icon link to ./settings.html mounted in #headerActions on every page using App.initCommon, with i18n'd aria-label/title, .is-active when document.body.dataset.nav==='settings', and once-per-process app:language listener to re-translate label on language switch"
  - ".settings-gear-btn CSS rules (Phase 22 — Header gear icon block in assets/app.css) — design-tokens-only, logical properties only, hover/active/focus-visible states"
affects:
  - "Every app page that calls App.initCommon (overview / sessions / reporting / add-client / add-session / settings / future Phase 22 surfaces) — picks up the gear icon automatically with no per-page wiring."
  - "Future SW cache bumps must increment from v53 onward (next: v54+)."
  - "Settings page (Plan 22-04) is now reachable from anywhere in the app via the gear icon, completing REQ-1 navigation entry."

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PRECACHE_URLS / PRECACHE_HTML append-only deltas with a CACHE_NAME bump per phase that adds new shipped assets — installs evict old caches on activate, no manual reload required."
    - "Header chrome init pattern extended (initThemeToggle / initLanguagePopover / initSettingsLink): self-contained init function that finds #headerActions || .header-actions, builds the DOM node with classes from the existing .header-control-btn family, idempotent guard to avoid double-mount, optional one-time document-level listener registration."
    - "Active-page indicator via document.body.dataset.nav: the gear adds .is-active when on settings.html, mirroring the renderNav pattern already used by .app-nav links."
    - "Pretty-URL convention for HTML precache (no .html suffix) — keys match CF Pages extension-stripping behaviour and Phase 19 SW navigation handler."

key-files:
  created: []
  modified:
    - "sw.js — CACHE_NAME bumped v52 → v53; PRECACHE_URLS +6 entries; PRECACHE_HTML +1 entry"
    - "assets/app.js — added initSettingsLink() (~55 lines); wired into initCommon() after initLanguagePopover()"
    - "assets/app.css — appended /* Phase 22 — Header gear icon */ block (21 lines, 4 selectors)"

key-decisions:
  - "Bumped CACHE_NAME from v52 to v53 (single integer increment). The pre-commit-hook auto-bumps mentioned in the executor reminder did not fire here — current sw.js value at task start was v52 — so a single bump landed the cache at v53. No clash with a concurrently-shipping phase observed."
  - "Insertion site for initSettingsLink() in initCommon(): placed after initLanguagePopover() rather than before initLicenseLink(). The plan's instruction to insert before initLicenseLink() can't be matched literally because D-03 already removed the initLicenseLink() call from initCommon (the function still exists and is exported, just unused at startup). The plan's gear-mount logic queries '.license-link, .license-key-btn' and falls back to appendChild — so at runtime the gear lands at the tail of #headerActions today, which is the right place given the current chrome composition (theme | lang | settings)."
  - "Constant-literal innerHTML SVG kept (not switched to createElementNS) — the plan explicitly accepts this as safe because the SVG string is a compile-time literal with no user-input interpolation. T-22-08-03 mitigation: zero template-string interpolation, zero variable concat in the gear's innerHTML assignment."
  - "Once-per-process app:language listener inside initSettingsLink, guarded by initSettingsLink._listenerInstalled flag — handles repeated initCommon calls cleanly without leaking duplicate listeners."

patterns-established:
  - "Phase-N CACHE_NAME bump pattern: a phase that ships new files appends to PRECACHE_URLS/HTML and increments CACHE_NAME by 1 in the same commit. Activate handler (Phase 19 logic, untouched) deletes all caches != CACHE_NAME so installed PWAs auto-evict on activate."
  - "Minimal gear-icon entry pattern: a single function in app.js + 4 CSS rules in app.css + one i18n key (consumed in earlier plan) is sufficient to add a header chrome entry to every page using App.initCommon — no per-page HTML edits required."

requirements-completed:
  - REQ-1     # Settings page reachable from main app navigation — gear icon entry point
  - REQ-17    # Header gear tooltip translated en/de/he/cs (consumes Plan 02 header.settings.label key)
  - REQ-20    # Service Worker precaches the new Settings page and assets

# Metrics
duration: 3min
completed: 2026-05-06
---

# Phase 22 Plan 08: Service Worker Cache Bump + Shared-Chrome Gear Summary

**Wires Phase 22 outputs into the PWA shell: bumps SW CACHE_NAME v52 → v53 with 6 new precache URLs (jsPDF, fonts, settings.js, pdf-export.js, md-render.js) plus /settings HTML, and adds a gear-icon entry point to ./settings.html in the shared header chrome that every App.initCommon-using page picks up automatically.**

## Performance

- **Duration:** ~3 min (161 s wall clock)
- **Started:** 2026-05-06T17:25:12Z
- **Completed:** 2026-05-06T17:27:53Z
- **Tasks:** 3 / 3
- **Files modified:** 3 (sw.js, assets/app.js, assets/app.css)
- **Files created:** 0
- **Lines added (net):** +96 (sw.js: +10/-3; app.js: +65; app.css: +21)

## Accomplishments

- **Service Worker cache bumped (sw.js):**
  - `CACHE_NAME = 'sessions-garden-v53'` (was v52). Existing activate handler deletes all caches whose name `!== CACHE_NAME`, so installed PWA users evict the v52 shell automatically on next SW activation. T-22-08-01 mitigation.
  - **PRECACHE_URLS** appended with 6 Phase 22 assets in declaration order:
    - `/assets/settings.js` (Plan 22-04)
    - `/assets/pdf-export.js` (Plan 22-05)
    - `/assets/md-render.js` (Plan 22-03)
    - `/assets/jspdf.min.js` (Plan 22-01, 365 KB)
    - `/assets/fonts/noto-sans-base64.js` (Plan 22-01, 116 KB)
    - `/assets/fonts/noto-sans-hebrew-base64.js` (Plan 22-01, 32 KB)
  - **PRECACHE_HTML** appended with `/settings` (no `.html` suffix — Phase 19 D-Deploy pretty-URL convention; SW already uses `redirect:'follow'` + `cache.put` to handle CF Pages 301).
  - Fetch handler / strategies untouched: navigations stay network-first with cache fallback, sub-resources stay cache-first; CF Pages "skip-navigations" logic from Phase 19 is preserved verbatim.
  - File parses cleanly (`node -c sw.js`).
- **Header gear-icon entry point (assets/app.js):**
  - New `initSettingsLink()` function modelled on `initLicenseLink()`. Mounts an `<a class="header-control-btn settings-gear-btn">` with an inline 24×24 viewBox / 20×20 rendered gear SVG into `#headerActions` (or `.header-actions` fallback).
  - `aria-label` and `title` set via `setAttribute` from `t('header.settings.label')` (Plan 22-02 i18n key); falls back to literal `'Settings'` when `t()` is unavailable (early-load defensive path).
  - `href = './settings.html'` — hardcoded, no interpolation. T-22-08-04 spoofing mitigation.
  - Idempotent: bails if `actions.querySelector('.settings-gear-btn')` already returns a node — prevents double-mount on hot-reload or repeated initCommon invocations.
  - Active state: applies `.is-active` class when `document.body.dataset.nav === 'settings'` (mirrors the existing `renderNav` pattern for app-nav links). Settings page already sets `<body data-nav="settings">` per Plan 22-04 SUMMARY.
  - Insertion order targets `actions.querySelector('.license-link, .license-key-btn')` and inserts before it; falls back to `appendChild` when no license element is present (which is the case on every page today since D-03 removed the license-key icon from initCommon). The gear thus lands at the tail of `#headerActions` — visual order on each page is `theme | lang | settings`.
  - One-time `app:language` listener installed inside `initSettingsLink`, guarded by `initSettingsLink._listenerInstalled` static flag — re-translates `aria-label` and `title` when the user switches language without leaking duplicate listeners on repeated initCommon calls.
  - Wired into `initCommon()` immediately after `initLanguagePopover()` so every page using the shared chrome (overview / sessions / reporting / add-client / add-session / settings / any future Phase 22 surface) picks up the gear automatically with zero per-page changes.
  - File parses cleanly (`node -c assets/app.js`).
- **Header gear-icon styles (assets/app.css):**
  - Appended `/* Phase 22 — Header gear icon */` block with 4 selectors:
    - `.settings-gear-btn` — base (resets `<a>` defaults: `text-decoration: none`, `color: inherit`, `display: inline-flex`, alignment).
    - `.settings-gear-btn:hover` — `background: var(--color-surface-hover)`.
    - `.settings-gear-btn.is-active` — `background: var(--color-primary-soft); color: var(--color-primary-dark)` per UI-SPEC active-state contract.
    - `.settings-gear-btn:focus-visible` — `outline: 2px solid var(--color-primary); outline-offset: 2px` for keyboard accessibility.
  - Inherits `.header-control-btn` base size (36×36) from line 126 — no duplicate sizing rules. Global 44×44 tap-target rule (lines 1143-1154) already covers `.header-control-btn`, so the gear hits 44×44 on mobile automatically.
  - Tokens only — no hex literals inside the new block. Logical properties only — no `padding-left/right` or `margin-left/right`. RTL-safe by construction.
  - CSS brace balance preserved (415 `{` / 415 `}` after append).

## Task Commits

Each task was committed atomically with `--no-verify` (parallel-execution rule for worktrees; orchestrator runs hooks after merge):

1. **Task 1 — Bump sw.js CACHE_NAME + extend PRECACHE_URLS / PRECACHE_HTML:** `a97c18f` (feat)
2. **Task 2 — Add App.initSettingsLink to assets/app.js + call from initCommon:** `1d29844` (feat)
3. **Task 3 — Append .settings-gear-btn CSS to assets/app.css:** `b0cbadb` (feat)

_Note: Plan metadata commit (this SUMMARY.md) is performed by the orchestrator after worktree merge. STATE.md and ROADMAP.md updates are also skipped in worktree mode per execute-plan.md parallel-execution rules._

## Files Modified

- **`sw.js`** — CACHE_NAME bumped from v52 to v53; PRECACHE_URLS list grew from 38 to 44 entries (+6); PRECACHE_HTML list grew from 19 to 20 entries (+1). Net: +10 lines, -3 lines (the prior trailing `]` was rewritten to add commas before the new entries — no existing entries removed).
- **`assets/app.js`** — `initSettingsLink()` added directly after `initLicenseLink()` definition (~55 lines including doc comment); call site `initSettingsLink();` inserted into `initCommon()` after `initLanguagePopover()` and before the legacy `// initLicenseLink removed per D-03` comment. Public-API export block (lines 858-900) intentionally NOT modified — `initSettingsLink` is internal, called only by `initCommon`, mirroring `initLicenseLink`'s pre-D-03 status.
- **`assets/app.css`** — `/* Phase 22 — Header gear icon */` block of 21 lines appended after the existing `/* Phase 22 — Export modal */` block to keep all Phase 22 CSS contiguous. No edits to pre-existing rules.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| CACHE_NAME bumped v52 → v53 (single increment) | Current value at task start was v52 (verified via Read); the `<sequential_execution>` reminder noted prior hook runs may have bumped further but no evidence of v53/v54 in the worktree's sw.js. A single integer increment is sufficient — the activate handler deletes any cache whose name doesn't equal CACHE_NAME, so even if main lands a v54 first, the next phase will incorporate it during its own bump. |
| Insertion site after `initLanguagePopover()` (not before `initLicenseLink()`) | The plan said "insert AFTER initThemeToggle and BEFORE initLicenseLink", but the actual `initCommon()` body has had `initLicenseLink()` removed per D-03 (only a `// initLicenseLink removed per D-03` comment remains). Putting the call after `initLanguagePopover()` matches the closest equivalent in the current code and produces the correct visual order at runtime. The plan's runtime insertion logic (`querySelector('.license-link, .license-key-btn')` then `appendChild` fallback) handles the missing license element gracefully. |
| Constant-literal innerHTML SVG (not createElementNS like settings.js used) | Plan 22-04 used createElementNS to satisfy a strict zero-innerHTML acceptance grep on settings.js. This plan's acceptance criteria do not include such a grep, and the plan body explicitly says "The innerHTML use here is safe because the SVG string is a fixed compile-time literal — no user input is interpolated." Following the plan as written. |
| One-time `app:language` listener (guarded) inside initSettingsLink | The gear's text content is set via `aria-label`/`title` (not `data-i18n`), so it would NOT be picked up by the existing applyTranslations re-render path. Listening for `app:language` is the canonical existing pattern (used by `initDemoMode`, `initLanguagePopover`, `initBirthDatePicker`). Guarding via a static `_listenerInstalled` flag prevents listener leaks if `initCommon` is called more than once in the same page lifecycle. |
| `display: inline-flex` + `align-items: center` + `justify-content: center` on `.settings-gear-btn` | The base `.header-control-btn` class already declares `display: flex` with the same alignment. Re-stating these on the gear ensures the SVG centers cleanly even if a future refactor changes `.header-control-btn`. Cost: 3 lines, +0 visual change. |
| Tail of #headerActions chosen as visual position (theme \| lang \| settings) | The current init order in initCommon is `initThemeToggle` then `initLanguagePopover` then `initSettingsLink`, producing visual order `theme | lang | settings`. UI-SPEC originally specified `lang | theme | settings | license`, but theme is currently appended before lang in the existing code (predates Phase 22) and license has been removed entirely. Reordering theme/lang is out of scope for this plan and would risk regressions on every existing app page. Documented as an SPEC-vs-current-code drift; gear placement at the tail is the correct minimal change. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Plan instructs inserting `initSettingsLink()` before `initLicenseLink()` in initCommon, but `initLicenseLink()` is no longer called from initCommon (D-03 removed it).**
- **Found during:** Task 2 setup (reading current `initCommon()` around lines 284-289).
- **Issue:** The plan's `<action>` block for Task 2 specifies inserting `initSettingsLink();` AFTER `initThemeToggle()` and BEFORE `initLicenseLink();` so the visual order matches UI-SPEC `lang | theme | settings | license`. The actual current `initCommon()` body has only:
  ```
  initDemoMode();
  renderNav();
  initThemeToggle();
  initLanguagePopover();
  // initLicenseLink removed per D-03 — license key icon no longer in header
  ```
  There's no `initLicenseLink();` call to insert before. Following the plan literally would have made me invent a fictional anchor.
- **Fix:** Inserted `initSettingsLink();` immediately after `initLanguagePopover();`, with a trailing `// Phase 22 — gear-icon entry point to ./settings.html` inline comment for traceability. The legacy `// initLicenseLink removed per D-03` comment is preserved on the next line. This matches the plan's runtime intent (gear icon mounted as the last header chrome entry on every initCommon-using page) without requiring a fictional anchor.
- **Files modified:** assets/app.js (initCommon body)
- **Verification:** `grep -nE 'initSettingsLink\(\)\s*;' assets/app.js` returns 1 match (the call site at line 353); the plan's `<verify><automated>` awk check requires `>= 1` and passes. Function definition is also present (separate grep).
- **Committed in:** `1d29844` (Task 2)

**2. [Documented drift, no extra fix needed] Visual order `theme | lang | settings`, not UI-SPEC's `lang | theme | settings | license`.**
- **Found during:** Task 2 implementation.
- **Issue:** UI-SPEC § Header Entry Point specifies the gear's insertion order as "after globe-lang, after theme-toggle, before license-key (so the visual order RTL-aware reads: lang | theme | settings | license)". In the actual code, `initCommon` calls `initThemeToggle()` BEFORE `initLanguagePopover()`, producing visual order `theme | lang`. License is gone entirely. So the runtime order with the gear added is `theme | lang | settings`, not `lang | theme | settings`.
- **Resolution:** Out-of-scope for this plan to reorder pre-existing chrome init calls — that's a Phase 22 SPEC vs Phase 20 chrome-implementation drift that pre-dates this plan. Documented here so the verifier and future readers know the divergence is intentional. The gear icon itself is still functionally correct (mounted, i18n'd, active-on-settings, RTL-safe via logical CSS); only the relative ordering of pre-existing buttons differs from the spec drawing.
- **Files modified:** None.
- **Committed in:** N/A.

### Plan-vs-reminder note (no code change)

**3. [Documentation only] Executor reminder said CACHE_NAME may have been auto-bumped to v55 by prior pre-commit hook runs; observed value at task start was v52.**
- **Found during:** Task 1 read of current sw.js value.
- **Issue:** The `<sequential_execution>` block warned that two preceding pre-commit hook runs in main bumped CACHE_NAME from v52 toward v55 and instructed me to bump once more "as part of this plan's CACHE_NAME bump task — do NOT skip the bump on the assumption it's already current." The actual sw.js HEAD value when I read it was `'sessions-garden-v52'` — no evidence the prior auto-bumps had landed in this worktree's branch.
- **Resolution:** Bumped once (v52 → v53) per plan. If main has independently moved beyond v53 by the time this worktree merges, the merge tool / next phase will incorporate the higher value; v53 is still strictly greater than the worktree's pre-edit value (v52) and satisfies the plan's `> v49` floor. Verification grep `const CACHE_NAME = 'sessions-garden-v[5-9][0-9]'` passes.
- **Files modified:** sw.js (already counted in Task 1).

---

**Total deviations:**
- 1 Rule-3 auto-fix (deviation #1: re-anchored the insertion site so the plan's intent could be satisfied with the current initCommon body).
- 2 documented drifts with no code change (deviations #2 and #3).
- 0 Rule-1 bug-fix deviations.
- 0 Rule-2 missing-functionality additions.
- 0 Rule-4 architectural changes.

**Impact on plan:** No scope creep. Functional output matches all `<must_haves>` truths and `<success_criteria>` items. The two non-fix drifts are pre-existing realities (D-03 already removed license-key from header; theme appears before lang in the current chrome code), not introduced by this plan.

## Issues Encountered

**Read-before-edit reminder fires.** Three `PreToolUse:Edit` hook reminders fired across the session even though sw.js, assets/app.js, and assets/app.css were all read at the start of execution. The edits succeeded each time despite the reminders (the runtime did NOT actually reject the edits). No content was lost; this is a transient harness behaviour and did not affect output.

## User Setup Required

None — no external service configuration. The cache bump is automatic on PWA users' next SW activation; the gear icon appears on every initCommon-using page after this commit ships to deploy.

## Threat Model Compliance

All Plan-22-08 threat-register mitigations were implemented:

| Threat ID | Disposition | Implementation |
|-----------|-------------|----------------|
| T-22-08-01 (Tampering, stale SW cache prevents Settings rollout) | mitigate | CACHE_NAME bumped v52 → v53; existing activate handler at sw.js:142-154 deletes any cache whose name `!== CACHE_NAME`. Verified by reading `activate` handler — logic untouched, only the constant changed. |
| T-22-08-02 (DoS, ~1 MB jspdf+fonts inflate SW install size) | accept | Total addition: jspdf 365 KB + Latin font 116 KB + Hebrew font 32 KB + 3 small JS modules ≈ 525 KB. Well under PWA install storage budgets and within Plan 22-01's 1.5 MB ceiling. Worth the offline-PDF capability. |
| T-22-08-03 (XSS via gear-icon innerHTML) | mitigate | `link.innerHTML = '<svg…>'` is a compile-time string literal concatenation — no template-string interpolation, no variable concat with non-literal strings. Verified by reading the literal in initSettingsLink. |
| T-22-08-04 (Spoofing, gear icon links to wrong page) | mitigate | `link.href = './settings.html'` is a hardcoded literal. Verified by `grep -q "settings.html" assets/app.js`. |
| T-22-08-05 (Info disclosure via aria-label) | accept | aria-label = i18n('header.settings.label') = "Settings" / "הגדרות" / "Einstellungen" / "Nastavení" — generic strings, no PII, no session content. |
| T-22-08-06 (Privilege escalation, non-licensed user reaches /settings via gear) | mitigate | settings.html (Plan 22-04) enforces TOC + license gates inline in `<head>` — clicking the gear without a license redirects to license.html. The gear is just a hyperlink; following it triggers the gates. Plan 22-04 SUMMARY confirms gates are in place. |
| T-22-08-07 (Tampering via crafted URL) | accept | Settings page reads from IndexedDB; URL params not consumed. Per plan disposition. |

**Residual risk:** Low. The cache-bump pattern is the established Phase 19 deploy lesson; innerHTML SVG is a compile-time literal; href is hardcoded; gates enforced downstream.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced. The only network surface change is SW PRECACHE_URLS expanding to include 6 additional same-origin paths, all already covered by the existing CSP `default-src 'self'` and the SW's existing same-origin gate (`if (url.origin !== self.location.origin) return;` at sw.js:180).

## Known Stubs

None. Every code path is wired to real, shipping outputs from earlier Phase 22 plans:

- `./settings.html` and `./assets/settings.js` — shipped by Plan 22-04 (commits `5b25dab`, `71a45d6`).
- `./assets/pdf-export.js` — shipped by Plan 22-05 (commit `c0386af`).
- `./assets/md-render.js` — shipped by Plan 22-03 (commits `e9bfb7a` RED, `9ffdc07` GREEN).
- `./assets/jspdf.min.js`, `./assets/fonts/noto-sans-base64.js`, `./assets/fonts/noto-sans-hebrew-base64.js` — shipped by Plan 22-01 (commits `603a5b1`, `c1635a5`, `122c195`).
- `t('header.settings.label')` — i18n key shipped by Plan 22-02 in en/de/he/cs.
- `<body data-nav="settings">` — set by Plan 22-04 (commit `5b25dab`); the gear's `.is-active` branch keys off this attribute.

The wave-3 dependency chain is fully closed.

## Verification Performed

Per the plan's per-task `<verify><automated>` blocks:

**Task 1 (sw.js):**
- `grep -E "const CACHE_NAME = 'sessions-garden-v[5-9][0-9]'" sw.js` → matches `v53`
- `grep -q "/assets/settings.js" sw.js` → match
- `grep -q "/assets/pdf-export.js" sw.js` → match
- `grep -q "/assets/md-render.js" sw.js` → match
- `grep -q "/assets/jspdf.min.js" sw.js` → match
- `grep -q "/assets/fonts/noto-sans-base64.js" sw.js` → match
- `grep -q "/assets/fonts/noto-sans-hebrew-base64.js" sw.js` → match
- `grep -E "['\"]\\/settings['\"]" sw.js` → match (`'/settings'`)
- `node -c sw.js` → parse OK

**Task 2 (assets/app.js):**
- `grep -q "function initSettingsLink" assets/app.js` → match
- `grep -q "settings-gear-btn" assets/app.js` → match
- `grep -q "header.settings.label" assets/app.js` → match
- `grep -nE "initSettingsLink\\(\\)\\s*;" assets/app.js | wc -l` → 1 (>=1 passes the awk gate)
- `grep -q "settings.html" assets/app.js` → match
- `grep -q "data-theme\\|initThemeToggle" assets/app.js` → match
- `grep -q "dataset.nav === 'settings'" assets/app.js` → match
- `grep -q "app:language" assets/app.js` → match
- `grep -q "\\.license-link, \\.license-key-btn" assets/app.js` → match
- `node -c assets/app.js` → parse OK

**Task 3 (assets/app.css):**
- `grep -q "Phase 22 — Header gear icon" assets/app.css` → match
- `grep -qE "\\.settings-gear-btn[[:space:]]*\\{" assets/app.css` → match
- `grep -q "\\.settings-gear-btn\\.is-active" assets/app.css` → match
- Negative-grep for `padding-(left|right):|margin-(left|right):|#[0-9a-fA-F]{3,8}[;{]` inside the new block → 0 matches (clean)
- 4 `.settings-gear-btn*` selectors at line start → confirmed
- CSS brace balance: 415 `{` / 415 `}` after append

**Plan-level `<verification>`:**
- `node -c sw.js` → OK
- `node -c assets/app.js` → OK
- Manual smoke (post-deploy, Sapir's task): install fresh PWA, navigate to /sessions, observe gear in header → click → land on /settings → offline check that jspdf + fonts are in cache.

**Plan-level `<success_criteria>`:**
- ✅ All app pages now show the gear icon in #headerActions (every page calling App.initCommon).
- ✅ /settings reachable via gear icon and via direct URL.
- ✅ Gear's aria-label/title updates on language change (one-time guarded listener).
- ⏳ After SW activation: jspdf.min.js + 2 fonts + settings.js + pdf-export.js + md-render.js are in cache storage (will be verified post-deploy by Sapir; precache list confirmed in code).
- ⏳ Old SW caches (v52 and earlier) evicted on new SW's activate event (existing Phase 19 logic, untouched).

## Self-Check: PASSED

**Files verified to exist / be modified at expected paths:**
- `sw.js` — exists; `git diff --stat` shows +10 / -3 lines (CACHE_NAME bump + 7 new entries in URLs/HTML lists)
- `assets/app.js` — exists; +65 lines (initSettingsLink function + initCommon call + comment)
- `assets/app.css` — exists; +21 lines (Phase 22 — Header gear icon block)

**Commits verified in `git log`:**
- `a97c18f` (Task 1: sw.js cache bump + precache extensions) — FOUND in `git log --oneline -5`
- `1d29844` (Task 2: initSettingsLink + initCommon wiring) — FOUND
- `b0cbadb` (Task 3: app.css gear icon styles) — FOUND

**Plan-level acceptance verified:**
- CACHE_NAME bump confirmed (v52 → v53); strictly greater than v49 floor.
- All 6 new PRECACHE_URLS entries present (one grep per entry).
- PRECACHE_HTML contains `'/settings'`.
- File parses pass (`node -c`) for sw.js and assets/app.js.
- All 4 `.settings-gear-btn` selectors present; no hex literals or physical padding/margin in the new CSS block; tokens-only.

**Stub scan:** No stubs, TODOs, or FIXMEs introduced. All code paths reference real shipped artifacts (verified above).

**Threat surface scan:** No new security-relevant surface beyond the plan's `<threat_model>`.

**Post-commit deletion check (per task):** All three commits' `git diff --diff-filter=D HEAD~1 HEAD` returned empty. No unintended deletions.

**Untracked files check:** `git status --short` empty after each commit. No leftover generated files.

---

*Phase: 22-session-workflow-loop-pre-session-context-card-editable-sess*
*Plan: 08 — Service Worker Cache Bump + Shared-Chrome Gear Icon*
*Completed: 2026-05-06*
