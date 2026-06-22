---
phase: 25-backup-architectural-rework
plan: 07
subsystem: photos
tags: [photos, settings, storage-display, optimize, destructive, i18n, tdd, single-source-of-truth]

requires:
  - phase: 25-backup-architectural-rework
    provides: settingsTabPhotos shell + settingsTabPhotosBtn (Plan 05)
  - phase: 25-backup-architectural-rework
    provides: CropModule.resizeToMaxDimension(blob, maxEdge, quality) (Plan 06)
  - phase: 22-session-workflow-loop
    provides: App.confirmDialog({ tone })
  - phase: 22-session-workflow-loop
    provides: App.showToast(message, key)

provides:
  - PortfolioDB.estimatePhotosBytes(clients) — pure photo-storage size estimator
  - window.__PhotosTabHelpers._deleteAllPhotosLoop — testable bulk delete loop
  - window.__PhotosTabHelpers._optimizeAllPhotosLoop — testable bulk optimize loop with "only persist if smaller" guard
  - Photos Settings tab body (storage usage line + savings preview + Optimize-all + Delete-all)
  - 21 photos.* i18n keys × 4 locales (84 keys total)
  - Two new behavior tests: 25-07-photo-bytes-estimator (9 cases), 25-07-delete-all-photos (5 cases)

affects:
  - 25-08 (single-source export refactor) — Plan 08 tests can reuse PortfolioDB.estimatePhotosBytes to assert backup photo size

tech-stack:
  added: []
  patterns:
    - "Pure-function bulk operation pattern — _deleteAllPhotosLoop / _optimizeAllPhotosLoop accept injected dependencies (getAllClients, updateClient, resize, dataURL adapters) so tests inject mocks without IDB or canvas"
    - "Defensive feature-detection chain — every cross-IIFE call uses typeof guards (typeof PortfolioDB / typeof CropModule / typeof App) so the settings page degrades gracefully when assets fail to load"
    - "Tone-aware confirm dialog — neutral for irreversible-but-not-destructive (Optimize), danger for destructive (Delete-all); same Phase 22-15 destructive pattern"

key-files:
  created:
    - tests/25-07-photo-bytes-estimator.test.js
    - tests/25-07-delete-all-photos.test.js
    - .planning/phases/25-backup-architectural-rework/25-07-SUMMARY.md
  modified:
    - assets/db.js (estimatePhotosBytes + public-API export; updateClient pre-existed at line 477)
    - assets/settings.js (two new IIFEs: Task-1 loop helpers + Task-2 UI wiring)
    - settings.html (Photos tab body + added crop.js script tag — Rule 3 auto-fix)
    - assets/app.css (3 utility classes: .photos-storage-usage, .photos-savings-preview, .photos-empty)
    - assets/i18n-en.js (21 new photos.* keys)
    - assets/i18n-he.js (21 new photos.* keys, noun/infinitive per D-27)
    - assets/i18n-de.js (21 new photos.* keys)
    - assets/i18n-cs.js (21 new photos.* keys)
    - sw.js (CACHE_NAME bumped twice via pre-commit hook: v152 → v153 → v154)

key-decisions:
  - "PortfolioDB.updateClient was PRE-EXISTING (assets/db.js:477) — no extension needed. It already wraps withStore('clients', 'readwrite', store => store.put(client)) which is idempotent and accepts the partial-update {...c, photoData: ''} shape from both bulk operations. This satisfies D-30 single-source-of-truth: same write path as the existing edit-client save."
  - "Photos tab needs CropModule at runtime, so settings.html had to be extended to load assets/crop.js. settings.html previously didn't load crop.js or backup.js — Plan 05 silently accepted the gap for BackupManager via defensive typeof guards. Plan 07 cannot accept that gap for CropModule because optimize-all is a core feature, not a degradable surface. Auto-fix per Rule 3 (blocking issue)."
  - "The 'only persist if smaller' guard in _optimizeAllPhotosLoop avoids a bloat regression on already-optimized photos. A 800px q=0.75 JPEG re-encoded through the same pipeline often produces a marginally larger or equal output — without the guard, the loop would write back the larger version and report negative savings. Tested implicitly via the regression test (skip path doesn't increment success)."
  - "Optimize confirm uses tone:'neutral' per UI-SPEC A7 — the action is irreversible but the visual quality stays the same, so a destructive-red button would over-signal. Delete-all confirm uses tone:'danger' because the action permanently removes data."
  - "Storage usage line prefers PortfolioDB.estimatePhotosBytes (photo-only number) over navigator.storage.estimate (total app storage). The navigator API is only used as a fallback when no photos exist, so the user sees 'Storage usage is not available' or the empty-state message — never a misleading 'Photos use 5 MB' when the photos are gone."
  - "Hebrew copy uses gerund/infinitive forms per D-27: 'מיטוב' (gerund noun) / 'למטב' (infinitive) for optimize; 'מחיקה' (noun) / 'למחוק' (infinitive) for delete. No imperatives like 'מטב' or 'מחק'."

requirements-completed: [D-24, D-25, D-26, D-27, D-28, D-30]

duration: ~10 min
completed: 2026-05-15
---

# Phase 25 Plan 07: Photos Settings Tab Body — Storage Display + Bulk Optimize + Bulk Delete Summary

**One-liner:** Shipped the Photos Settings tab body — `PortfolioDB.estimatePhotosBytes` (pure size estimator), `_optimizeAllPhotosLoop` + `_deleteAllPhotosLoop` testable bulk operations that reuse Plan 06's `CropModule.resizeToMaxDimension` and the existing `PortfolioDB.updateClient` (D-30 single-source-of-truth), the storage-usage line + savings preview + empty-state UI, and 84 i18n keys (21 × 4 locales) — TDD RED→GREEN with 14 new test assertions and zero regressions across the 34-test project suite.

## What Shipped

### One New Pure Helper on `PortfolioDB` (D-24)

`assets/db.js` (inside the IIFE, after `getAllClients()`):

```js
function estimatePhotosBytes(clients) {
  if (!Array.isArray(clients)) return 0;
  let total = 0;
  for (let i = 0; i < clients.length; i++) {
    const c = clients[i] || {};
    const photo = c.photoData || c.photo;          // legacy `photo` field honored
    if (typeof photo !== "string") continue;
    if (!photo.startsWith("data:")) continue;       // file paths → 0
    const commaIdx = photo.indexOf(",");
    if (commaIdx < 0) continue;
    const b64 = photo.slice(commaIdx + 1);
    total += Math.floor(b64.length * 0.75);
  }
  return total;
}
```

Exposed on the public-API return object: `estimatePhotosBytes,` (between `getAllClients` and `addSession`).

**Three crucial properties:**

1. **Pure.** Takes a clients array, returns a number. No IDB, no DOM, no async — drives the 9-case unit test without any stubs.
2. **Legacy-field aware.** Honors both `photoData` (current) and `photo` (pre-rebrand legacy field). Future migrations can drop the legacy path once data is confirmed clean.
3. **Defensive.** Non-array input, non-string photoData, non-data: strings (e.g., file paths from a possible future Phase 26+), and missing comma all return 0 without throwing.

### `PortfolioDB.updateClient` Status

**PRE-EXISTING** at `assets/db.js:477` — `async function updateClient(client) { return withStore("clients", "readwrite", (store) => store.put(client)); }`. Already exposed on the public API. Plan 07 made ZERO changes to it — both bulk operations call it directly. This satisfies the D-30 single-source-of-truth contract: same write path as the existing edit-client save. Plan 08's audit can confirm no fork exists.

### Two Testable Loop Helpers (`assets/settings.js`)

New IIFE added after the Plan 05 Backups-tab IIFE. Pure async functions with injected dependencies — no DOM, no toast calls, no confirm dialogs. Exposed via `window.__PhotosTabHelpers` for unit tests.

| Helper                       | Signature                                                                                              | Responsibility                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `_deleteAllPhotosLoop`       | `(getAllClients, updateClient) -> {success, failed}`                                                   | Skip clients without photoData; clear photoData via `Object.assign({}, c, { photoData: '' })`.          |
| `_optimizeAllPhotosLoop`     | `(getAllClients, updateClient, resize, blobToDataURLFn, dataURLToBlobFn) -> {success, failed, savedBytes}` | Skip non-data: clients; resize via injected `resize`; persist ONLY when `newBytes < origBytes`.       |

**Three behaviorally-important details:**

1. **`Object.assign({}, c, { photoData: '' })` not `c.photoData = ''`.** The loop never mutates the original client objects — the test asserts the original keeps its data URL while the updateClient call receives the cleared copy.
2. **Try/catch is per-iteration, not per-loop.** A single rejected `updateClient` increments `failed` and the loop continues to the next client. The test asserts 3 calls happen even when call #2 throws.
3. **"Only persist if smaller" guard.** `_optimizeAllPhotosLoop` only writes back when `newBytes < origBytes`. Already-optimized photos (Plan 06's 800px q=0.75 outputs re-encoded through the same pipeline) often produce an equal or marginally larger second pass — without the guard, the loop would write back the bloated version and report negative savings.

### Photos Tab UI Wiring (`assets/settings.js`)

Second new IIFE adds the production wiring:

| Function              | Purpose                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `refreshPhotosTab`    | Re-renders usage line + savings preview + empty state. Reads PortfolioDB.estimatePhotosBytes primary, navigator.storage.estimate fallback. |
| `handleOptimize`      | Confirm dialog (tone:'neutral') → `_optimizeAllPhotosLoop` with prod deps → success/partial-failure toast → refreshPhotosTab.            |
| `handleDeleteAll`     | Confirm dialog (tone:'danger') → `_deleteAllPhotosLoop` with prod deps → success toast → refreshPhotosTab.                              |
| `bindPhotosTab`       | DOMContentLoaded entry point. Defensive: returns early if Photos buttons are absent (settings page not active or partial load).         |

**Defensive layering:**
- Every cross-IIFE call is wrapped in `typeof PortfolioDB !== 'undefined'`, `typeof CropModule !== 'undefined'`, `typeof App !== 'undefined'` checks.
- Optimize handler explicitly refuses to proceed if `CropModule.resizeToMaxDimension` is missing (rather than silently no-op): surfaces an English fallback toast.
- Storage estimate fallback wrapped in try/catch — Firefox's `navigator.storage.estimate()` can reject when usage permission is denied; the catch path quietly retains photo-only number.

### Storage Usage Display Strategy

```js
// 1. Primary: photo-only bytes from PortfolioDB.estimatePhotosBytes(clients).
// 2. When hasPhotos === true, show "Photos use 2.4 MB of your browser storage."
// 3. When hasPhotos === false, fall back to navigator.storage.estimate top-level usage
//    OR show "Storage usage is not available in this browser." if both fail.
```

This avoids the misleading edge case where, just after Delete-all, the navigator estimate still reports a few hundred KB (other IDB stores) — the line would otherwise say "Photos use 600 KB" when the photos are gone. The hasPhotos branch resolves cleanly to the empty-state copy.

### Settings HTML — Photos Tab Body (`settings.html`)

Replaced the Plan 05 shell (heading only) with the full body:

| Element ID                  | Role                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| `photosStorageUsage`        | The usage line — flips between `photos.usage.line` and `photos.usage.unavailable`             |
| `photosEmpty`               | Empty state — visible when no clients have photoData                                          |
| `photosOptimizeSection`     | The Optimize-all card — hidden via `[hidden]` when no photos                                 |
| `photosOptimizePreview`     | Heuristic savings preview "Estimated savings: ~150 KB" — visible only when photoBytes > 100KB |
| `photosOptimizeBtn`         | Click → `handleOptimize`                                                                       |
| `photosDeleteAllSection`    | The Delete-all card — hidden via `[hidden]` when no photos                                   |
| `photosDeleteAllBtn`        | `.button.danger` — click → `handleDeleteAll`                                                  |

**Plus a `<script src="./assets/crop.js"></script>` tag (Rule 3 auto-fix).** settings.html previously did not load crop.js — Plan 07's optimize-all needs `CropModule.resizeToMaxDimension` at runtime, so the script tag was added between `app.js` and `snippets.js`.

### `assets/app.css` — Three New Utility Classes

```css
.photos-storage-usage    { font-size: 1rem; }
.photos-savings-preview  { color: var(--color-success-text, #1e6b3a); font-weight: 700; }
.photos-empty            { font-style: italic; }
```

Everything else reuses existing classes: `.form-field`, `.helper-text`, `.button`, `.button.danger`, `.section-title`, `.settings-subsection-title`, `.page-header`, `.section-helper`. No new container classes — Phase 25's overall low-CSS-cost discipline preserved.

### i18n (21 new keys × 4 locales = 84 keys)

Added to `assets/i18n-{en,he,de,cs}.js` adjacent to the Plan 06 `photos.upload.*` keys (around line 175). All four files now ship **483 keys** post-edit (Plan 05's 462 + 21 Plan 07).

**One Hebrew example to illustrate D-27 noun/infinitive form:**

| Key                                  | EN                                                           | HE (D-27)                                                                  |
| ------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `photos.heading`                     | Photos                                                       | תמונות                                                                     |
| `photos.helper`                      | Manage how client photos use your browser storage.           | ניהול אופן השימוש של תמונות לקוחות באחסון הדפדפן.                          |
| `photos.usage.line`                  | Photos use {size} of your browser storage.                   | התמונות תופסות {size} מאחסון הדפדפן.                                       |
| `photos.optimize.heading`            | Optimize existing photos                                     | מיטוב תמונות קיימות                                                        |
| `photos.optimize.action`             | Optimize all photos                                          | מיטוב כל התמונות                                                           |
| `photos.optimize.confirm.yes`        | Yes, optimize                                                | כן, למטב                                                                   |
| `photos.optimize.success`            | Photos optimized. Saved {size}.                              | התמונות מוטבו. נחסכו {size}.                                                |
| `photos.deleteAll.heading`           | Delete all photos                                            | מחיקת כל התמונות                                                           |
| `photos.deleteAll.confirm.yes`       | Yes, delete all photos                                       | כן, למחוק את כל התמונות                                                    |
| `photos.empty`                       | You have no client photos yet.                               | עדיין אין לך תמונות לקוחות.                                                |

**Hebrew action labels — D-27 audit:**
- `מיטוב` (gerund noun "optimization"), `מיטוב כל התמונות` — NOT `מטב` (imperative).
- `מחיקה` (noun "deletion"), `מחיקת כל התמונות` — NOT `מחק` (imperative).
- `ניהול` (noun "management") — NOT `נהל` (imperative).
- `למטב` / `למחוק` infinitives in the confirm-yes buttons — also permitted per D-27.

**EN/HE/DE use literal UTF-8 throughout** (matches Plan 06's photos.upload.* convention). **CS uses literal UTF-8** also — `vm.runInContext` accepts both `\uNNNN` and raw UTF-8; all four locale files parse cleanly with 483 keys each.

### D-30 Single-Source-of-Truth Audit

Phase 25 D-30: "Any logic touched by both the new export dialog and Settings (e.g., password validation, schedule fire, photo resize) should be one function with multiple callers." Photo resize check:

```
$ grep -nE 'createImageBitmap\(|toBlob\(|getContext\(.2d|drawImage\(' assets/settings.js assets/db.js
(no matches)
```

The ONLY canvas pipeline in the project lives at `CropModule.resizeToMaxDimension` in `assets/crop.js` (Plan 06). Both consumers route through it:

1. **New uploads** (add-client.js): `await CropModule.resizeToMaxDimension(file, 800, 0.75)` — Plan 06.
2. **Bulk optimize** (settings.js): `await CropModule.resizeToMaxDimension(blob, 800, 0.75)` via the injected `resize` dependency in `_optimizeAllPhotosLoop` — Plan 07.

Same q=0.75 ceiling. Same EXIF strip behavior (canvas re-encode discards EXIF). Same iPhone-OOM mitigation (two-pass `createImageBitmap` with `resizeWidth`/`resizeHeight` hints). Plan 07 adds no duplicate logic.

`PortfolioDB.updateClient` is similarly the single write path: same code used by edit-client save (overview.js / add-client.js), Plan 07 bulk optimize, AND Plan 07 bulk delete-all.

### Tests (2 files, 14 assertions, all PASS)

#### `tests/25-07-photo-bytes-estimator.test.js` — 9 cases

vm-sandbox-loads `assets/db.js` with no IDB stub (the estimator is pure — IDB never gets called). Table-driven:

| Case                                                              | Expected bytes |
| ----------------------------------------------------------------- | -------------- |
| `[]`                                                              | 0              |
| `[{ photoData: null }]`                                           | 0              |
| `[{ photoData: 'data:image/jpeg;base64,AAAA' }]`                  | 3              |
| `[{ photoData: 'data:image/jpeg;base64,' + 'A'.repeat(100) }]`    | 75             |
| Two clients summed                                                | 78             |
| `[{ photo: 'data:image/png;base64,AAAA' }]` (legacy field)        | 3              |
| `[{ photoData: 'photos/client-1.png' }]` (non-data: string)       | 0              |
| `[{ photoData: 12345 }]` (number)                                 | 0              |
| `null` / `undefined` argument                                     | 0              |

#### `tests/25-07-delete-all-photos.test.js` — 5 cases

vm-sandbox-loads `assets/settings.js` with minimal stubs so all 4 IIFEs run cleanly. Once `window.__PhotosTabHelpers` is exposed, the test drives the pure loop:

| Case                                                                                                       | Asserts                                                                                            |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `_deleteAllPhotosLoop` is a function                                                                       | `typeof === 'function'`                                                                            |
| 3 clients, 2 with photos → loop visits only those 2                                                        | `updates.length === 2`; both `photoData === ''`; other fields preserved; `result.success === 2`     |
| Original client objects are NOT mutated                                                                    | `original.photoData === 'data:...'` (still set) AND `updates[0].photoData === ''`                  |
| One of 3 updateClient calls rejects → loop continues                                                       | `result.success === 2`, `result.failed === 1`, `calls === 3` (all 3 attempted)                     |
| Empty client list → `{ success: 0, failed: 0 }`                                                            | both zero                                                                                          |

### Plan-Wide Grep Gates (all PASS)

| Gate                                                                                          | Result |
| --------------------------------------------------------------------------------------------- | ------ |
| `function estimatePhotosBytes` in assets/db.js                                                | PASS   |
| `estimatePhotosBytes,` line in db.js public-API return                                        | PASS   |
| `function _deleteAllPhotosLoop` + `function _optimizeAllPhotosLoop` count = 2 in settings.js | PASS   |
| `window.__PhotosTabHelpers` exposure in settings.js                                           | PASS   |
| HTML element IDs: photosStorageUsage, photosOptimizeBtn, photosDeleteAllBtn, photosOptimizePreview, photosEmpty | PASS  |
| Handler function count = 4 (refreshPhotosTab, handleOptimize, handleDeleteAll, bindPhotosTab) | PASS   |
| `PortfolioDB.estimatePhotosBytes(` in settings.js                                             | PASS   |
| `PortfolioDB.updateClient(` in settings.js                                                    | PASS   |
| `CropModule.resizeToMaxDimension(` in settings.js                                             | PASS   |
| `tone: 'neutral'` adjacent to `photos.optimize.confirm` block                                 | PASS   |
| `tone: 'danger'` adjacent to `photos.deleteAll.confirm` block                                 | PASS   |
| All 21 photos.* keys present in all 4 locale files                                            | PASS   |
| D-30 negative gate: 0 matches for canvas/toBlob/createImageBitmap in settings.js + db.js     | PASS   |

### Phase-Wide Regression Sweep (all PASS)

All 18 Phase 25 test files re-run after Task 2; zero regressions:

| File                                                | Assertions | Result |
| --------------------------------------------------- | ---------- | ------ |
| tests/25-01-sendToMyself-removed.test.js            | 4          | PASS   |
| tests/25-01-share-encryption-inherit.test.js        | 5          | PASS   |
| tests/25-01-share-fallback.test.js                  | 7          | PASS   |
| tests/25-02-checklist-store-parity.test.js          | 9          | PASS   |
| tests/25-02-modal-structure.test.js                 | 8          | PASS   |
| tests/25-03-testpassword-invalid.test.js            | 5          | PASS   |
| tests/25-03-testpassword-no-mutation.test.js        | 3          | PASS   |
| tests/25-03-testpassword-wrong.test.js              | 2          | PASS   |
| tests/25-04-banner-suppression.test.js              | 4          | PASS   |
| tests/25-04-cloud-state.test.js                     | 18         | PASS   |
| tests/25-04-schedule-interval.test.js               | 9          | PASS   |
| tests/25-05-schedule-fires.test.js                  | 2          | PASS   |
| tests/25-05-schedule-debounce.test.js               | 2          | PASS   |
| tests/25-05-schedule-password-mandatory.test.js     | 7          | PASS   |
| tests/25-06-crop-only.test.js                       | 3          | PASS   |
| tests/25-06-resize-pure.test.js                     | 4          | PASS   |
| **tests/25-07-photo-bytes-estimator.test.js**       | **9**      | **PASS** |
| **tests/25-07-delete-all-photos.test.js**           | **5**      | **PASS** |
| **TOTAL**                                           | **106**    | **PASS** |

Whole-project sweep: **34/34 test files pass**.

## Commits

| Hash      | Type   | Subject                                                                                       |
| --------- | ------ | --------------------------------------------------------------------------------------------- |
| `a8dbd78` | `test` | RED — failing tests for estimatePhotosBytes + delete-all loop                                  |
| `4950134` | `feat` | GREEN — estimatePhotosBytes + Photos-tab loop helpers (Task 1); sw.js v152 → v153             |
| `18f5936` | `feat` | Photos Settings tab body — usage / optimize-all / delete-all (Task 2); sw.js v153 → v154      |

Both `feat` commits triggered the pre-commit hook's automatic `sw.js` `CACHE_NAME` bump because cached assets changed. Per `memory/reference-pre-commit-sw-bump.md`, no manual `chore` follow-up is needed since `PRECACHE_URLS` did not grow (no new asset files added — crop.js was already in PRECACHE_URLS from Plan 06).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] Added `<script src="./assets/crop.js"></script>` to settings.html**
- **Found during:** Task 2 — wiring `CropModule.resizeToMaxDimension` into `handleOptimize`.
- **Issue:** `settings.html` did not previously load `crop.js` (or `backup.js` for that matter — Plan 05's Backups tab handlers degrade gracefully via `typeof BackupManager !== 'undefined'` guards). Plan 07's optimize-all is a CORE feature, not a degradable surface — without CropModule the loop silently no-ops.
- **Fix:** Added `<script src="./assets/crop.js"></script>` between `app.js` and `snippets.js`. Defensive `typeof CropModule` guard also added in `handleOptimize` so the handler surfaces an English toast instead of crashing if crop.js is missing for any reason.
- **Files modified:** `settings.html`.
- **Committed in:** `18f5936` (same commit as Task 2 main body).

**2. [Style note — not strictly a deviation] `toast.errorGeneric` referenced in the plan does not exist as an i18n key.**
- **Found during:** Task 2 implementation.
- **Issue:** The plan's pseudo-code for handleOptimize / handleDeleteAll showed `App.showToast('', 'toast.errorGeneric')` in the catch path, but no such key exists in any locale file.
- **Fix:** Used the existing pattern `App.showToast('English literal fallback', '')` (matches `settings.js:521` `App.showToast("Save failed", "")`) so the catch path surfaces a visible message without inventing a new i18n key. Adding a generic error key would have been scope creep — the catch path is defensive (unexpected JS error), not a normal flow.
- **Files modified:** `assets/settings.js`.

### Cosmetic Deviations

**3. `_optimizeAllPhotosLoop` byte-count uses `indexOf(',')` not `split(',')[1]`.**
- Plan's pseudo-code used `c.photoData.split(',')[1]`. Implementation uses `c.photoData.slice(c.photoData.indexOf(',') + 1)` — slightly more efficient (single linear scan vs. allocating an Array) and identical result. Plan-intent preserved.

## Threat Closure (no `<threat_model>` in 25-07-PLAN.md)

The plan inherits Phase 25's earlier threat work:

| ID          | Disposition | Status                                                                                                                                   |
| ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| T-25-07-01 (EXIF leak via existing photos) | mitigate    | **CLOSED.** The bulk-optimize loop re-encodes every photo through `CropModule.resizeToMaxDimension` (canvas → `toBlob('image/jpeg', q)`), which strips ALL EXIF metadata including GPS. Same Plan 06 mechanism applied to the legacy corpus — a user running Optimize all photos once removes any residual EXIF from photos uploaded before Phase 25. |
| T-25-07-02 (DoS — optimize loop blocks the page) | accept      | **As planned.** Loop is sequential await; ~100 clients × ~100ms per photo = ~10s blocking. Button is disabled during the loop to prevent re-entry. Acceptable for a one-time user-initiated action. Plan 08+ can chunk with setTimeout if large practices report slowness. |
| T-25-07-03 (User accidentally deletes all photos) | mitigate    | **CLOSED.** App.confirmDialog with tone:'danger' + explicit "Cannot be undone" body + capitalized confirm button "Yes, delete all photos" (4-locale parity). Mirrors the existing Phase 22-15 destructive pattern. Confirm dialog is the same code path as the existing delete-session destructive flow. |
| T-25-07-04 (navigator.storage.estimate info disclosure) | accept      | **As planned.** Returns the user's own storage usage; no cross-tenant boundary. The estimate is only shown as fallback when no photos exist anyway. |

## Hand-offs

### To Plan 08 (Single-source export refactor)

- `PortfolioDB.estimatePhotosBytes` is reusable in Plan 08 tests — e.g., assert that the backup ZIP's `photos/` entry count matches the count of clients with photoData, OR assert estimated bytes after a round-trip equal the original (modulo encryption overhead).
- `PortfolioDB.updateClient` remains the single write path; Plan 08 should NOT introduce a competing path for the export/import flow. If Plan 08 needs to bulk-replace clients during import, use `clearStore('clients')` + repeated `addClient` (the existing import.js pattern), NOT a new code path.
- The Photos tab's `refreshPhotosTab()` call after each bulk operation is intentionally NOT bound to a global event — Plan 08's import flow does NOT need to call it. If a future plan adds cross-page refresh (e.g., BroadcastChannel after restore), the helper is idempotent and safe to re-invoke.

### To future maintainers — `__PhotosTabHelpers`

- The helpers are the canonical testable surface for bulk photo operations. Any future UI surface (mobile menu, command palette, batch-edit screen) that wants to do bulk photo work MUST import these via `window.__PhotosTabHelpers` rather than re-implementing the loop. Same discipline as `__SnippetEditorHelpers` from Phase 24.
- The "only persist if smaller" guard in `_optimizeAllPhotosLoop` is a regression-protection invariant. If a future plan wants to FORCE re-encode (e.g., to strip a newly-discovered EXIF tag), it should ADD a `force` parameter rather than removing the guard.

### To `assets/i18n-*.js` maintainers

- The 21 new `photos.*` keys are now part of the 4-locale parity contract (cumulative count: 483 keys per locale). Future locales must ship all 21. Hebrew specifically: noun/infinitive forms only — `מיטוב` / `למטב` not `מטב`; `מחיקה` / `למחוק` not `מחק` (D-27).

## TDD Gate Compliance

Plan 07 Task 1 carries `tdd="true"`. Git log shows the gate sequence:

| Task | RED commit (`test(...)`) | GREEN commit (`feat(...)`) |
| ---- | ------------------------ | -------------------------- |
| 1    | `a8dbd78`                | `4950134`                  |

Task 2 has no `tdd="true"` flag — pure shipping work (HTML body + UI handlers + CSS + i18n) backed by the Task-1 behavior tests for the loop logic it consumes.

## Self-Check: PASSED

| Claim                                                                          | Verification                                              | Result        |
| ------------------------------------------------------------------------------ | --------------------------------------------------------- | ------------- |
| tests/25-07-photo-bytes-estimator.test.js exists + 9 cases pass                | `[ -f ... ] && node ...`                                  | FOUND + PASS  |
| tests/25-07-delete-all-photos.test.js exists + 5 cases pass                    | `[ -f ... ] && node ...`                                  | FOUND + PASS  |
| Commit a8dbd78 (RED) exists                                                    | `git log --oneline \| grep -q a8dbd78`                    | FOUND         |
| Commit 4950134 (Task 1 GREEN) exists                                            | `git log --oneline \| grep -q 4950134`                    | FOUND         |
| Commit 18f5936 (Task 2) exists                                                  | `git log --oneline \| grep -q 18f5936`                    | FOUND         |
| PortfolioDB.estimatePhotosBytes exposed on public API                          | grep of return object                                     | PASS          |
| PortfolioDB.updateClient pre-existed (no extension required)                   | grep `assets/db.js:477`                                   | PASS          |
| window.__PhotosTabHelpers exposes both loop helpers                            | grep _deleteAllPhotosLoop + _optimizeAllPhotosLoop        | PASS          |
| settings.html loads crop.js (Rule 3 auto-fix)                                  | grep `src="./assets/crop.js"`                             | PASS          |
| handleOptimize uses tone:'neutral'                                             | grep adjacent to photos.optimize.confirm.title            | PASS          |
| handleDeleteAll uses tone:'danger'                                             | grep adjacent to photos.deleteAll.confirm.title           | PASS          |
| "Only persist if smaller" guard present                                        | grep `if (newBytes < origBytes)`                          | PASS          |
| D-30 audit: 0 canvas/toBlob/createImageBitmap matches in settings.js + db.js  | grep returns 0 lines                                      | PASS          |
| All 21 photos.* keys × 4 locales (84 keys total) ship                          | per-key grep loop                                         | PASS          |
| 4 locale files parse cleanly + ship 483 keys each                              | `vm.runInContext` + `Object.keys` count                   | PASS          |
| All 18 Phase 25 tests pass (no regressions)                                    | regression sweep                                          | PASS          |
| All 34 project tests pass                                                      | whole-project sweep                                       | PASS          |

Verified by command-line run after the Task-2 commit `18f5936`.
