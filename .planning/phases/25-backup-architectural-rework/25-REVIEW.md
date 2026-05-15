---
phase: 25-backup-architectural-rework
reviewed: 2026-05-15T22:21:03Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - assets/app.js
  - assets/backup-modal.js
  - assets/backup.js
  - assets/db.js
  - assets/overview.js
  - assets/settings.js
  - assets/app.css
  - index.html
  - settings.html
  - add-client.html
  - add-session.html
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-05-15T22:21:03Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Phase 25 reworked the backup architecture along four axes, and the load-bearing
parts hold up well under adversarial tracing:

- **backup-modal.js extraction (D2 / UAT-D2):** The single-module relocation is
  sound. The IIFE runs synchronously at script-parse time on every page, so
  `window.openBackupModal` / `window.formatRelativeTime` exist before any
  `DOMContentLoaded` handler (and therefore before `App.initCommon()` →
  `checkBackupSchedule()`) fires on index/settings/add-client/add-session. No
  load-order race. Double-init is correctly guarded by
  `window.__backupModalWired`; the Esc keydown listener is registered exactly
  once inside that guard. The static `index.html` markup wins over the injected
  copy via the `#backupModal` existence check in `ensureBackupModalMarkup()`.
- **CR-02 sentinel round-trip:** Traced end-to-end and correct. The sentinel
  IS exported (`getAllTherapistSettings()` → `store.getAll()` returns the
  `snippetsDeletedSeeds` row → manifest), and `_writeTherapistSentinel` is
  invoked before the snippet-restore loop. `clearAll()` resets the
  `_seedingDone`/`_seedingPromise` guards, and the post-import snippet writes
  re-trigger `seedSnippetsIfNeeded` which then reads the freshly-restored
  `deletedIds`. `withStore` resolves on `tx.oncomplete`, so the `await` in the
  restore loop genuinely waits for the write.
- **ALLOWED_SECTION_KEYS / ALLOWED_SENTINEL_KEYS:** Whitelist boundary is
  intact. The sentinel branch correctly precedes the section-key check so the
  sentinel does not trip "unknown sectionKey". `_writeTherapistSentinel`
  re-validates `sectionKey` against `_SENTINEL_KEYS` in db.js (defence in
  depth) and string-filters `deletedIds`. No data-integrity or injection
  regression.
- **settings.js schedule gate + verdict:** The D-18 `canEnableSchedule` gate
  and 3-tier verdict render are logically correct, with one state-consistency
  bug in the un-ack cascade (WR-01).
- **i18n parity/syntax:** All four locales parse cleanly and carry an
  identical 490-key set. Removed `schedule.folder.*` keys were dropped from
  all four in lock-step; new keys (`schedule.savedToast`, `reminders.helper.*`,
  `photos.usage.compact/optional/recommended`, `photos.optimize.minimal`,
  `settings.save.failed`, `photos.*.failed/unavailable`) are present in all
  four. No parity or syntax defects.

No Critical defects found. Three Warnings and four Info items below.

## Warnings

### WR-01: Un-ack cascade can desync schedule mode from password-acked flag

**File:** `assets/settings.js:2046-2068` (handler) and `assets/settings.js:1979-1998` (ON→OFF confirm)
**Issue:** When the user un-checks the password-ack box while a schedule is
active, the handler writes `portfolioBackupSchedulePasswordAcked = 'false'`
**first** (line 2051-2052), then calls `applyFrequencyChange('off')`. Inside
`applyFrequencyChange`, the ON→OFF branch (`prev !== 'off' && newMode === 'off'`)
shows a neutral confirm dialog. If the user **cancels** that confirm, the
function reverts `sel.value = prev` and returns `false` without persisting the
mode change — so `portfolioBackupScheduleMode` stays e.g. `'weekly'` (active)
while `portfolioBackupSchedulePasswordAcked` is now `'false'`. The schedule
keeps firing prompts (`checkBackupSchedule` only reads the mode/interval, not
the ack flag), but `canEnableSchedule()` now returns `false`, so the UI claims
the user must re-tick the box to enable a schedule that is, in fact, already
active. State is internally inconsistent.
**Fix:** Either (a) defer the `localStorage.setItem(...PasswordAcked...)` write
until after `applyFrequencyChange('off')` resolves truthy, or (b) re-assert the
ack value if the forced ON→OFF transition is cancelled:
```js
if (!ack.checked && readScheduleMode() !== 'off') {
  sel.value = 'off';
  const turnedOff = await applyFrequencyChange('off');
  if (!turnedOff) {
    // Confirm was cancelled — schedule is still active; keep the ack
    // flag consistent with the still-active schedule.
    ack.checked = true;
    try { localStorage.setItem('portfolioBackupSchedulePasswordAcked', 'true'); } catch (_) {}
    return;
  }
}
```
(Note `ack.addEventListener('change', ...)` is not declared `async`; promote it
to `async` to `await` the cascade, or chain via `.then`.)

### WR-02: `confirmDialog` placeholder substitution strips `data-i18n` from the shared modal, breaking live language switch while the dialog is open

**File:** `assets/app.js:786-792`
**Issue:** `#confirmModal` (`#confirmTitle` / `#confirmMessage`) is a single
shared DOM element reused by every `confirmDialog` caller. When `placeholders`
is supplied (the Optimize-photos UAT-C2 path), `substitute()` calls
`el.removeAttribute("data-i18n")` on the title and message. While the dialog is
open, a language switch dispatches `app:language` → `applyTranslations()`,
which now skips these elements (no `data-i18n`), so the dialog text is left in
the previous language with the *previous* placeholder values frozen in. The
attribute is re-set on the *next* `confirmDialog` call (line 757-758), so this
is not permanent corruption, but the open dialog does not respond to a
mid-dialog locale change the way every other dialog does.
**Fix:** Don't mutate `data-i18n` on the shared element. Re-run the
placeholder substitution from an `app:language` listener scoped to the dialog's
lifetime, or store the resolved+substituted strings and re-apply them on
`app:language` until the dialog closes. Minimal patch: keep `data-i18n` intact
and instead re-substitute on the existing per-dialog `app:language` path.

### WR-03: Optimize confirm `{n}` photo count and `{size}` savings estimate use different photo-field coverage

**File:** `assets/settings.js:2504-2509` vs `estimatePhotoSavings` (assets/settings.js, Plan 12 addition ~line 2150)
**Issue:** The `photoCount` loop counts only clients whose `c.photoData` is a
string containing `,` (line 2507). `estimatePhotoSavings(clients)` counts
`c.photoData || c.photo`. A client whose photo lives in `c.photo` but not
`c.photoData` contributes to the savings estimate but not to `{n}`, so the
confirm dialog can read e.g. "Optimize **2** photos? … free about
**~180 KB**" where the savings reflect 3 photos. Not data corruption (the
optimize loop is independent), but the user-facing numbers can disagree. The
codebase treats `photoData` as primary (backup.js export reconstructs both),
so the divergent-field case is rare but reachable for legacy/imported records.
**Fix:** Use one field-resolution rule in both places:
```js
var pf = (c && (typeof c.photoData === 'string' ? c.photoData
                 : (typeof c.photo === 'string' ? c.photo : '')));
if (pf && pf.indexOf(',') !== -1) photoCount++;
```
or have `handleOptimize` derive the count from the same predicate
`estimatePhotoSavings` uses.

## Info

### IN-01: Modal markup duplicated across two sources of truth

**File:** `assets/backup-modal.js:42-113` and `index.html:182-268`
**Issue:** The `MODAL_HTML` string in backup-modal.js is a hand-maintained
duplicate of the static `#backupModal` block in index.html. The injector
correctly no-ops when `#backupModal` exists, so today they only need to agree
on IDs and `data-i18n` keys (which they do). But the `reminders.helper.body`
default text already differs slightly between the two copies, and any future
structural edit must be applied in both places or the non-index pages silently
drift.
**Fix:** Treat one as canonical (the JS string), have index.html include the
identical block via the injector on first paint, or add a build/test assertion
that the two markups are byte-identical (a parity test in the spirit of the
existing `25-02-checklist-store-parity.test.js`).

### IN-02: Stale "Sole caller" comment in backup.js after the modal extraction

**File:** `assets/backup.js:688`
**Issue:** The `exportEncryptedBackup` doc comment states *"Sole caller
(verified by grep): overview.js openExportFlow."* `openExportFlow` was moved
out of overview.js into backup-modal.js in this phase, so the comment now
points at a function that no longer lives there. Documentation drift only — no
runtime effect.
**Fix:** Update the comment to reference `assets/backup-modal.js openExportFlow`.

### IN-03: Post-restore refresh on non-overview pages does redundant DOM work before reload

**File:** `assets/backup-modal.js:316-329`
**Issue:** When `window.__afterBackupRestore` is not registered (settings /
add-client / add-session), the import-success path schedules
`setTimeout(window.location.reload, 600)` and then immediately runs
`renderLastBackupSubtitle()`, `App.updateBackupCloudState(...)`, and
`closeBackupModal()` on a page that is about to be discarded. Harmless
(the reload supersedes), but the work is dead on those pages.
**Fix:** Skip the `refresh.then(...)` cosmetic block when the reload branch is
taken, or early-return after scheduling the reload.

### IN-04: `tx.onabort` not handled in `_writeTherapistSentinel`/`withStore` (pre-existing pattern)

**File:** `assets/db.js:451-460` (used by `_writeTherapistSentinel` at db.js:744-752)
**Issue:** `withStore` rejects on `tx.onerror` but not `tx.onabort`. An aborted
transaction (e.g., quota exceeded / version-change) would leave the awaiting
promise pending. This is a pre-existing pattern reused by the new sentinel
path, not introduced by Phase 25, so it is out of scope for a blocker —
flagged for awareness because the sentinel restore loop now depends on this
helper.
**Fix (if addressed):** Add `tx.onabort = () => reject(tx.error || new Error('transaction aborted'));`
in `withStore`.

---

_Reviewed: 2026-05-15T22:21:03Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
