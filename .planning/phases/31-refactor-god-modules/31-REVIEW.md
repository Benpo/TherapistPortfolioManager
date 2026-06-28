---
phase: 31-refactor-god-modules
reviewed: 2026-06-28T08:05:12Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - assets/db.js
  - assets/overview.js
  - assets/sessions.js
  - assets/settings.js
  - assets/settings-snippets.js
  - assets/settings-photos.js
  - assets/add-session.js
  - assets/export-modal.js
  - assets/version.js
  - sw.js
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
resolved:
  - CR-01
---

# Phase 31: Code Review Report

**Reviewed:** 2026-06-28T08:05:12Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 31 is a behavior-preserving decomposition of three god modules. Most of the
work holds up under adversarial reading:

- **settings-snippets.js and settings-photos.js are byte-identical relocations** of
  the blocks removed from settings.js (verified by diff). Load order in settings.html
  is correct (both load before settings.js), the `window.__SnippetEditorHelpers` /
  `window.__PhotosTabHelpers` hooks are preserved, and settings.js has zero dangling
  references to the moved symbols. No new defects in these two files.
- **export-modal.js** is a faithful extraction: the moved markdown builders/dialog
  functions differ from the original only in indentation, comment wording, and reading
  `getIssuesPayload` through the injected `ctx`. The `window.__exportModalInit` handshake
  is correctly ordered (export-modal.js before add-session.js) and the old click
  wiring was fully removed from add-session.js (no double-firing).
- **overview.js / sessions.js** innerHTML→textContent conversions are output-identical
  (the only remaining innerHTML is the static, non-interpolated SVG icon).
- **sw.js / version.js** changes are correct (3 precache additions present, version bump).

The serious problem is in the **db.js openDB() connection pool**. The RFCT-03 pooling
change introduced a use-after-close regression on the legacy-DB migration path that the
106-test suite does **not** catch — and, notably, test D in `tests/31-openDB-pooling.test.js`
was written with `Promise.allSettled` and a comment acknowledging a "poisoned-handle path,"
so it stays green even when the public consumer rejects. This is exactly the class of
behavior drift the phase asked to prioritize.

## Critical Issues

### CR-01: openDB() returns a closed connection after legacy-DB migration (use-after-close regression) — RESOLVED

**Resolution (2026-06-28, commit fc10d46):** Fixed by nulling the pool at both
migration close sites — `_dbPromise = null;` after `newDB.close()` at db.js:85
(idempotency early-return) and db.js:147 (normal copy path), mirroring the
invalidate-on-close pattern already used at `onversionchange` (db.js:344-347). The
outer `openDB()` now re-opens a fresh live connection after migration instead of
returning the closed handle. Regression test added: **test E** in
`tests/31-openDB-pooling.test.js` ("With legacy DB present, getAllClients() RESOLVES
to the migrated clients") — demonstrated RED on the unfixed pool (rejects with
InvalidStateError) and GREEN after the fix. Full suite green (107 cases, 0 failed).

**File:** `assets/db.js:299-307`, `assets/db.js:85`, `assets/db.js:147`
**Issue:**
The new connection pool caches the resolved `IDBDatabase` in `_dbPromise`. `openDB()`
deliberately places the cache check *after* `await migrateOldDB()` and relies on the
recursive inner `openDB()` call inside `migrateOldDB()` to populate `_dbPromise`, so the
outer call returns "that same cached promise" (per the comment at db.js:302-306).

But `migrateOldDB()` calls `newDB.close()` on that pooled handle in two places —
`db.js:85` (idempotency early-return) and `db.js:147` (after copying clients/sessions) —
**without invalidating `_dbPromise`**. The only invalidation sites are `onversionchange`
(:346), `onerror` (:365) and `clearAll()` (:742); none of them fires on an explicit
`close()`.

Trace for an upgrading user (legacy `emotion_code_portfolio` present, `sessions_garden`
fresh):
1. App calls `openDB()` (outer) → `await migrateOldDB()`.
2. `migrateOldDB()` recursively calls `openDB()` (inner), which opens and **caches** the
   live handle in `_dbPromise`.
3. Migration copies the data, then `newDB.close()` (db.js:147) **closes the pooled handle**.
4. Outer `openDB()` resumes: `if (_dbPromise) return _dbPromise;` → returns the
   **now-closed** connection.
5. The caller (`getAllClients`, `getAllSessions`, etc.) runs `db.transaction(...)` on a
   closed handle → `InvalidStateError` → the promise **rejects**.

Effect: on the first load after the rebrand upgrade, the migration succeeds (data is in
`sessions_garden`, legacy DB deleted) but every read/write on that load throws an uncaught
rejection and the UI sees no data. A reload recovers (legacy DB now gone → `migrateOldDB`
returns early at :71 → fresh live connection), so it is transient and upgrade-only — but it
breaks the single most anxiety-inducing load ("did my data survive the rebrand?") and is a
direct regression from the pre-pool code, where the outer `openDB()` always opened its own
fresh live connection.

Why the suite is green: `tests/31-openDB-pooling.test.js` test D uses
`Promise.allSettled([...])` and asserts only the migration *side-effect* via `_peek` (clients
copied, legacy deleted), explicitly noting "On a poisoned-handle path some of these may
reject." So the rejection is real and known to the shim, just not asserted against.

**Fix:** Invalidate the pool whenever the migration closes the shared handle, so the outer
`openDB()` re-opens a fresh live connection:

```js
// db.js — in migrateOldDB(), at BOTH close sites (~:85 and ~:147)
newDB.close();
_dbPromise = undefined; // pool now holds a closed handle — force a fresh re-open
```

Alternatively, since the handle is pooled, do not close it in `migrateOldDB()` at all
(deleting the *old* DB does not require closing the *new* pooled connection). Add a
regression assertion that `getAllClients()` **resolves to the migrated array** (not just
that `_peek` shows the side-effect) when the legacy DB is staged present.

## Warnings

### WR-01: openDB() onupgradeneeded catch rejects without invalidating the pool

**File:** `assets/db.js:325-330`
**Issue:**
When a migration throws, the `onupgradeneeded` catch calls `transaction.abort()` +
`showDBMigrationError(err)` + `reject(err)` but does **not** set `_dbPromise = null`. It
relies on `request.onerror` (:363-367) firing after the abort to null the pool. That
ordering (abort in upgradeneeded → request `error` event) is standard but undocumented
here; if an environment does not re-fire `onerror` after an in-upgrade abort, `_dbPromise`
stays a permanently-rejected promise and every subsequent `openDB()` returns it (hard-stuck
until reload). The OBS-03 banner does reload, so production usually recovers — but the pool
should self-invalidate at the point of failure rather than depend on a second event.

**Fix:** Null the pool inside the catch, mirroring the other invalidation sites:

```js
} catch (err) {
  _dbPromise = null;            // do not cache a failed/aborted open
  transaction.abort();
  showDBMigrationError(err);
  reject(err);
}
```

### WR-02: export-modal.js re-derives two helpers from add-session.js with no coupling test (silent drift risk)

**File:** `assets/export-modal.js:72-79` (`getClientNameForCopy`), `assets/export-modal.js:84-123` (`sectionHasData`)
**Issue:**
Per the phase's duplication priority I traced all three re-derived helpers against their
add-session.js originals:
- `copyTextToClipboard` — byte-identical, no drift.
- `getClientNameForCopy` — **different implementation**: the copy reads the selected
  `<option>.textContent`, whereas add-session.js resolves through `clientCache` +
  `getClientDisplayName`. Currently output-equivalent **only because** `loadClients()`
  sets `option.textContent = client.name` and `getClientDisplayName` returns `client.name`.
- `sectionHasData` — the `"issues"` branch differs (DOM query `#issueList .issue-block`
  vs. the closure `issues` array). Currently equivalent because both always count ≥1.

No *current* behavioral divergence, but there is **no test that couples the two copies**.
A future change to `loadClients()` option text, the `issues`-array lifecycle, or
`getClientDisplayName` would silently diverge the export filename / PDF title / Step-1
defaults from the rest of add-session.js, with a green suite.

**Fix:** Either (a) inject these as `ctx` accessors from add-session.js (single source of
truth, the same pattern already used for `getIssuesPayload`), or (b) add a focused test that
asserts `export-modal`'s `getClientNameForCopy`/`sectionHasData` produce the same result as
add-session.js's versions for a shared fixture, so the coupling can't rot unnoticed.

## Info

### IN-01: Unused ctx accessors in the export handshake

**File:** `assets/export-modal.js:23-31`, `assets/add-session.js:933-939`
**Issue:** `initExportModal(ctx)` receives `ctx.getEditingSession`, `ctx.getSessionId`, and
`ctx.isReadMode`, but none are referenced anywhere in export-modal.js (confirmed by grep;
the original export region in add-session.js did not use them either). They are dead members
of the handshake contract and imply a coupling that does not exist.
**Fix:** Drop the three unused accessors from both the `ctx` object passed at
add-session.js:933 and the documented contract comment at export-modal.js:11-15, or wire
them if they were intended to gate export behavior in read vs. edit mode.

### IN-02: exportWireMobileTabs defined but never called (pre-existing dead code, carried over)

**File:** `assets/export-modal.js:518-529`
**Issue:** `exportWireMobileTabs` is defined but never invoked (the same was true in the
original add-session.js, so this is a faithful relocation, not a new regression). With it
unwired, the mobile edit/preview `.tab-btn` clicks have no handler; `exportApplyMobileTabs`
reads `.is-active` but nothing ever toggles it on click. Worth resolving while the export
flow is freshly isolated.
**Fix:** Call `exportWireMobileTabs()` once inside `openExportDialog()` (or delete the dead
function if mobile tab switching is intentionally handled elsewhere).

### IN-03: version.js header comment is stale (says v1.2.0)

**File:** `assets/version.js:9-10`
**Issue:** The JSDoc still reads "This milestone ships as v1.2.0." while `APP_VERSION` is
now `'1.2.2'` (version.js:25). Documentation drift only.
**Fix:** Update the comment to reflect 1.2.2 (or make it version-agnostic).

### IN-04: settings-photos.js computes an unused storage-estimate fallback (pre-existing)

**File:** `assets/settings-photos.js:303-312, 378-388`
**Issue:** In `refreshPhotosTab`, `displayBytes` is reassigned from
`navigator.storage.estimate()` in the `!hasPhotos` case, but the `!hasPhotos` render branch
(:378) ignores `displayBytes` entirely and shows the `photos.usage.unavailable` string. The
estimate work is dead. This is a verbatim relocation from the old settings.js (Phase 25), not
a Phase 31 regression — noted for completeness.
**Fix:** Either render `displayBytes` in the empty-state branch or drop the unused
`navigator.storage.estimate()` fallback.

---

_Reviewed: 2026-06-28T08:05:12Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
