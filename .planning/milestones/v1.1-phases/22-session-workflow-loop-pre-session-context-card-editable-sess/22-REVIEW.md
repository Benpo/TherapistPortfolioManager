---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
reviewed: 2026-05-06T19:05:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - add-session.html
  - assets/add-session.js
  - assets/app.js
  - assets/overview.js
  - assets/reporting.js
  - assets/sessions.js
  - assets/settings.js
  - sw.js
findings:
  critical: 0
  warning: 0
  info: 4
  total: 4
status: issues_found
re_review: true
re_review_of: 2feb1fa
scope: 22-09-close-verification-gaps (commit range 90c898b^..HEAD)
---

# Phase 22: Code Review Report (Re-review of 22-09)

**Reviewed:** 2026-05-06T19:05:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found (informational only — no blockers, no warnings)
**Re-review of:** commit 2feb1fa (full-phase review)
**Scope:** Plan 22-09 changes only (`90c898b^..HEAD`, 4 commits across 8 files, +38/-9 lines)

## Summary

Plan 22-09 was a tightly-scoped gap-closure pass: one HTML script tag, five `await` keywords, one optional dialog parameter. The diff is 38 added lines, 9 removed lines, surgically applied. All four verification gaps from 22-VERIFICATION.md close cleanly:

- **GAP-1 / GAP-2 (REQ-13 PDF download / REQ-15 Web Share)** — `<script src="./assets/pdf-export.js"></script>` is now present at `add-session.html:548`, sandwiched between `md-render.js` (547) and `add-session.js` (549) per the plan's required ordering. `window.PDFExport` is registered synchronously at parse time, so `exportHandleDownloadPdf` (line 1046), `exportHandleShare` (line 1108), and the slugify path in `exportHandleDownloadMd` (line 1090) all resolve. `pdf-export.js` was already in `sw.js` `PRECACHE_URLS` (line 58) since the prior phase, so PWA install picks it up without further changes.
- **GAP-3 (REVIEW WR-01 — `App.initCommon()` await race)** — All five call sites now `await`: `add-session.js:9`, `settings.js:398`, `sessions.js:2`, `reporting.js:2`, `overview.js:54`. The `settings.js` DOMContentLoaded handler was correctly upgraded from `function () { ... }` to `async function () { ... }` (otherwise the await would be a SyntaxError). The `_sectionLabelCache` in `app.js` is now guaranteed populated before `applySectionVisibility(true|false)` runs at `add-session.js:1481` and `1485`, before the Settings page's first `loadAndRender()`, and before any reporting/sessions/overview render path that depends on `App.isSectionEnabled` or `App.getSectionLabel`. WR-01 is closed in the strict sense.
- **GAP-4 (REQ-21 confirm-dialog tone)** — `assets/app.js:443` adds `tone = "danger"` to the destructure with default value, so all existing destructive callers (delete-session at `add-session.js:1447`, delete-client at `add-client.js:156`, overview's restore-confirm at `overview.js:103`, the export-discard at `add-session.js:1030`, the settings-discard at `settings.js:381`) keep their default red OK button — verified zero regressions via `grep -nE "tone\\s*:"` across `assets/*.js` returning exactly one match (`settings.js:242`). The class-swap logic at `app.js:464-475` and the corresponding restore at `app.js:482-491` correctly capture the original class on open and restore it on close.

The `sw.js` `CACHE_NAME` bump from `v53` to `v56` (the diff is a single line: line 12) appears to be three sequential automation bumps across the four 22-09 commits; the `PRECACHE_URLS` list itself is unchanged and already contains every Phase 22 asset (verified `pdf-export.js` at line 58, `md-render.js` at line 59, `jspdf.min.js` at line 60, both fonts at lines 61-62). The bump is correct and ensures the new HTML (with the new script tag) and the new JS (with the awaits and tone parameter) evict stale v53 caches on next activation.

No critical issues. No warnings. Four informational notes — all minor, none introduced by 22-09. Three pre-existing findings from the 2feb1fa review remain open and out-of-scope for this plan.

## Info

### IN-01: confirmDialog tone class-swap is robust for serial calls but has a small leak window for re-entrant calls (new in 22-09)

**File:** `assets/app.js:463-491`
**Issue:** The `_restoreConfirmBtnClass` closure variable is declared per-invocation of `confirmDialog`, so each call captures its own restore target. For the only realistic usage pattern — one confirm dialog open at a time, in series — this is correct. There is one corner case worth documenting:

If two callers invoke `confirmDialog` overlappingly (e.g. a destructive call mid-animation while a neutral call is still resolving), the second call's open-time class check sees DOM state mutated by the first call. The "self-heal" branch at line 469-474 handles the case where neutral state leaked into a danger call: it swaps to `danger` for this dialog and records `_restoreConfirmBtnClass = "button-primary"`. On close, it restores to `button-primary` — which preserves the leaked state from before this call started, rather than canonically resetting to `danger`. This is intentional ("preserve entry state") but means a leak heals only for the duration of the destructive dialog, not permanently. Each subsequent danger caller would self-heal again.

Since the codebase calls `confirmDialog` strictly serially (every consumer awaits the resolution), this corner case never fires in practice. Flagging as info because the comment at line 470 says "self-heal in case a prior neutral call leaked" — but the heal is per-call, not persistent.

**Fix:** None required. If you want defense-in-depth, change the close-time restore so danger is the canonical resting state regardless of `_restoreConfirmBtnClass`:

```js
// At end of close():
if (confirmBtn) {
  confirmBtn.classList.remove("button-primary");
  confirmBtn.classList.add("danger");  // canonical default
}
```

Then the open-time logic only needs to handle tone === "neutral" (swap one way; the close always resets to danger). Smaller surface, no closure variable needed.

---

### IN-02: settings.js Discard confirm dialog still uses default 'danger' tone (pre-existing, in scope by sibling pattern to REQ-21)

**File:** `assets/settings.js:381-386`
**Issue:** The Discard-unsaved-changes confirm at line 381 doesn't pass `tone`, so it inherits the default `"danger"` — meaning the OK button reads "Discard changes" in red. Discarding unsaved Settings edits is *not* destructive of stored data (it's a UI revert; the IDB therapistSettings store is untouched). This is the same pattern REQ-21 fixed for the first-disable confirm — and the same `tone: "neutral"` annotation would apply.

22-09's plan explicitly scoped the change to "the disable-confirm site only" so this was correctly left alone. Flagging because the pattern is now in place (`app.js` supports tone) and the next polish pass should sweep both confirms together.

**Fix:** When the next polish pass touches settings.js, add `tone: "neutral"` to the call object at line 381-386. One-line change, mirrors the disable-confirm site at line 237-243.

---

### IN-03: settings.js initial `loadAndRender()` is fire-and-forget at the end of DOMContentLoaded (pre-existing)

**File:** `assets/settings.js:429`
**Issue:** After `await App.initCommon()` populates the cache and the event listeners are wired, `loadAndRender()` is called without `await`. The function returns a Promise (it awaits `PortfolioDB.getAllTherapistSettings`). Since this is the last statement in the DOMContentLoaded handler and nothing else inside the handler depends on its completion, the fire-and-forget is functionally fine — the rows render whenever the IDB read finishes. However, errors thrown inside `loadAndRender` after the await chain (the function does `try/catch` around the IDB call but not around the render loop) would surface as unhandled-promise-rejection rather than being caught by the DOMContentLoaded handler.

Pre-existing and not introduced by 22-09. Same pattern in the `app:language` and `app:settings-changed` listeners at lines 417 and 419 — both call `loadAndRender()` without await.

**Fix:** None required for v1. If desired:

```js
await loadAndRender();
```

at line 429 (the function is already inside `async function () { ... }`) would surface unhandled errors via the host's standard error handling.

---

### IN-04: sw.js CACHE_NAME bumped 3 versions in a single plan (v53 → v56) — automation artifact

**File:** `sw.js:12`
**Issue:** The diff for `sw.js` is a single line (`CACHE_NAME` bump). Three sequential bumps across four 22-09 commits ended up at `v56` — the precache list itself is unchanged from v53. This is correct (every CACHE_NAME bump invalidates v53 and re-precaches at the new name) but the version-number arithmetic is no longer monotonic with semantic content changes; v54 and v55 ship identical caches to v56. Future cache-bust analytics or rollback procedures should know the actual content hash matches v56 across the whole plan.

This is automation behavior, not a regression. Flagging as info so a downstream operator who notices "we bumped from v53 to v56 but PRECACHE_URLS didn't change" understands why.

**Fix:** None required. If desired in the future, gate the version-bump automation to require a content change in `sw.js`'s `PRECACHE_URLS` or `PRECACHE_HTML` arrays. For now, the over-bumping is harmless.

---

## Status of prior findings (re-review of 2feb1fa)

| Prior ID | Title | Status after 22-09 | Reason |
|----------|-------|--------------------|--------|
| WR-01 | `App.initCommon()` async but called without `await` | **RESOLVED** | All 5 call sites now `await App.initCommon()`. Verified by grep returning exactly 5 matches at the expected files/lines. settings.js DOMContentLoaded handler upgraded to async. |
| WR-02 | PDF font registration silently no-ops if base64 globals fail | **STILL OPEN — out of scope** | `pdf-export.js` was not in 22-09's modified files. Finding remains valid; defer to a follow-up todo. |
| WR-03 | BroadcastChannel closed immediately after `postMessage` (settings.js:351-355) | **STILL OPEN — out of scope** | The lines are unchanged in 22-09; the BroadcastChannel close-after-post pattern is still present. Real-world impact is engine-specific (older Firefox/Safari only); defer to a follow-up todo. |
| WR-04 | `exportRenderStep1Rows` clears `container.innerHTML = ""` (add-session.js:905) | **STILL OPEN — out of scope** | Line 905 still reads `container.innerHTML = "";`. Functionally safe (empty-string assignment) but the Phase 22 contract is "no innerHTML writes for repopulated containers." Cosmetic; defer to a follow-up todo. |
| IN-01 | `applySectionVisibility` not re-run on language change (add-session.js:1461-1470) | **STILL OPEN — out of scope** | Listener at lines 1461-1470 is unchanged. Same root cause as WR-01 was, but survives even with the await fix because the listener doesn't currently re-run visibility. With WR-01 closed, the practical risk drops to near-zero (cache is populated before any language switch can happen), so the priority of this fix drops correspondingly. |
| IN-02 | confirmDialog reuses `#confirmOkBtn` with hardcoded `class="button danger"` | **RESOLVED** | `tone: 'neutral' \| 'danger'` parameter added with default `"danger"` (preserves existing destructive callers). Settings.js disable-confirm passes `tone: "neutral"`. Class swap on open + restore on close. |
| IN-03 | `loadScriptOnce` resolves on existing `<script>` tag presence | **STILL OPEN — out of scope** | `pdf-export.js` not in 22-09 scope. Risk is theoretical (no other entry point inserts the tag). Defer. |
| IN-04 | PDF page-number footer width approximation | **STILL OPEN — out of scope** | `pdf-export.js` not in 22-09 scope. Future-proofing only; no functional impact today. |
| IN-05 | `_extFromMime` falls back to `image/jpeg` for unknown MIMEs | **STILL OPEN — out of scope** | `backup.js` not in 22-09 scope. Pre-existing, not a regression. |
| IN-06 | `console.warn` / `console.error` in production paths | **STILL OPEN — by design** | Codebase-wide diagnostic style; intentional per prior review. |

## Verification of 22-09's stated outcomes

| Plan claim | Verification |
|------------|--------------|
| `<script src="./assets/pdf-export.js"></script>` present exactly once in add-session.html | Confirmed at line 548 (between md-render.js:547 and add-session.js:549). |
| 5 `await App.initCommon()` call sites | Confirmed: add-session.js:9, settings.js:398, sessions.js:2, reporting.js:2, overview.js:54. |
| settings.js DOMContentLoaded handler converted to async | Confirmed at line 396: `document.addEventListener("DOMContentLoaded", async function () { ... });` |
| `tone` parameter on confirmDialog with default `"danger"` | Confirmed at app.js:443 signature; class-swap at 464-475; restore at 482-491. |
| `tone: "neutral"` passed at the disable-confirm site | Confirmed at settings.js:242 (inside the call object at lines 237-243). |
| No other consumer of confirmDialog modified | Confirmed by `grep -nE "tone\\s*:" assets/*.js` returning exactly 1 match (settings.js:242). All 6 other call sites (add-session.js:1030, 1447; add-client.js:156; overview.js:103; settings.js:381) inherit default `"danger"`. |
| sw.js bumped past v53 to invalidate stale caches on PWA upgrade | Confirmed: `CACHE_NAME = 'sessions-garden-v56'` (line 12). PRECACHE_URLS unchanged from v53; pdf-export.js already at line 58, md-render.js at 59, jspdf.min.js at 60, fonts at 61-62. |

## Anti-pattern scan results (8 files, standard depth)

- **Hardcoded secrets:** None found (no `password|secret|api_key|token` literal-equals-string-literal patterns).
- **Dangerous functions:** `eval(` / `Function(` not used. `innerHTML` writes audited:
  - `app.js:100` — nav placeholder, compile-time literal HTML, no user input. Safe.
  - `app.js:271` — license link, compile-time SVG literal. Safe.
  - `app.js:308` — gear icon, compile-time SVG literal. Safe.
  - `app.js:735-740` — security guidance, builds string with `t()` translations + interpolation but the t() values are i18n-controlled (developer-authored), not user-supplied. Acceptable.
  - `app.js:823, 825, 831, 834, 846, 850, 872, 875` — birth-date picker option lists; values are `<option value="YYYY">YYYY</option>` and `<option value="0..11">monthName</option>` where monthName comes from `Intl.DateTimeFormat`. Intl-derived strings are trusted. Acceptable.
  - `add-session.js:905` — `container.innerHTML = ""`. Empty-string clear; covered by prior WR-04 (still open, out of scope).
  - `add-session.js:985` — `preview.innerHTML = MdRender.render(editor.value)`. MdRender escapes HTML before applying structural rules (verified in prior review at md-render.js). Acceptable.
  - `add-session.js:1177` — `preview.innerHTML = ""` on dialog open. Empty-string clear, covered by prior WR-04 commentary.
- **Debug artifacts:** `console.warn` / `console.error` survive in 22-09-modified files (pre-existing, IN-06).
- **Empty catch blocks:** `assets/settings.js:233, 244, 252, 357` and `assets/app.js` various — all are documented as "intentional swallow" with a `/* ignore */` or similar comment. Acceptable defensive pattern.
- **Race conditions:** WR-01 (the principal Phase 22 race) is resolved.
- **Type coercion:** None introduced by 22-09.

## Cross-file consistency

- **confirmDialog signature:** `app.js:443` exports the new `tone` option. The shared `#confirmOkBtn` exists in both `add-session.html:390` and `settings.html:93` with identical `class="button danger"` markup. The runtime class-swap in `confirmDialog` correctly handles either entry page. Verified zero call sites accidentally pass `tone` other than the intended one (`grep` count).
- **Async chain:** Every entry-point page that consumes `App.getSectionLabel` / `App.isSectionEnabled` now awaits `initCommon`. The receiver-side BroadcastChannel listener in `app.js:371-388` is itself async (`message` handler is `async`), so cross-tab cache refreshes also flow through awaits. No cross-file ordering hazards.

---

_Reviewed: 2026-05-06T19:05:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Re-review scope: 22-09-close-verification-gaps (commits 90c898b → HEAD)_
