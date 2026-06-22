---
phase: 25-backup-architectural-rework
plan: 08
subsystem: backup
tags: [backup, regression, single-source-of-truth, encrypt-share, d-29, d-30, d-04, tdd]

requires:
  - phase: 25-backup-architectural-rework
    provides: BACKUP_CONTENTS_KEYS + exportBackup + importBackup (Plan 02)
  - phase: 25-backup-architectural-rework
    provides: tests/_helpers/mock-portfolio-db.js (Plan 03)
  - phase: 25-backup-architectural-rework
    provides: openExportFlow + window.openBackupModal (Plan 02)
  - phase: 25-backup-architectural-rework
    provides: CropModule.resizeToMaxDimension (Plan 06)
  - phase: 25-backup-architectural-rework
    provides: PortfolioDB.updateClient + estimatePhotosBytes (Plan 07 / pre-existing)

provides:
  - tests/25-08-roundtrip-stores.test.js (15 assertions — D-29 enforcement)
  - tests/25-08-encrypt-then-share.test.js (10 assertions — D-04 closure for encrypted path)
  - tests/25-08-single-source-audit.test.js (18 assertions — D-30 enforcement)
  - BackupManager.exportEncryptedBackup new return shape: { ok, skip, cancelled, blob, filename }
  - window.openExportFlow (cross-file exposure for behavior-test sandbox + future programmatic use)
  - settings.html ↛ backup.js wiring fix (closes silent Plan 05 Backups-tab no-op)

affects:
  - assets/backup.js (exportEncryptedBackup return-shape refactor)
  - assets/overview.js (openExportFlow consumes new shape; window.openExportFlow exposed; Share button now visible on encrypted path)
  - settings.html (adds backup.js <script> tag)
  - sw.js CACHE_NAME (auto-bumped by pre-commit hook twice: v154 → v155 → v156)

tech-stack:
  added: []
  patterns:
    - "vm-sandbox + real vendored JSZip + real exportBackup/importBackup → in-memory round-trip integration test (D-29). No fake-indexeddb dependency added."
    - "Object return shape supersedes tri-state — exportEncryptedBackup now returns a structured outcome instead of true/false/'cancel'. Single call-site updated."
    - "Sentinel-blob behavioral assertion — freeze a unique object reference, install stub BackupManager.exportEncryptedBackup → SENTINEL_BLOB, drive openExportFlow, assert shareBackup receives the SAME reference. Proves D-04 inheritance for the encrypted path behaviorally, not just by shape grep."

key-files:
  created:
    - tests/25-08-roundtrip-stores.test.js
    - tests/25-08-encrypt-then-share.test.js
    - tests/25-08-single-source-audit.test.js
    - .planning/phases/25-backup-architectural-rework/25-08-SUMMARY.md
  modified:
    - assets/backup.js
    - assets/overview.js
    - settings.html
    - sw.js (auto-bumped by pre-commit hook)

decisions:
  - "D-04: All Share paths inherit the encryption choice — now enforced for the encrypted path by tests/25-08-encrypt-then-share.test.js sub-case B (sentinel-blob behavioral assertion). Plan 02's deferred limitation is closed."
  - "D-29: Backup round-trip completeness — now enforced by tests/25-08-roundtrip-stores.test.js (15 assertions across all 5 BACKUP_CONTENTS_KEYS stores: clients incl. photos, sessions, therapistSettings, snippets)."
  - "D-30: Single-source-of-truth — now enforced by tests/25-08-single-source-audit.test.js (5 shared helpers + sendToMyself negative + rogue-canvas negative)."
  - "Refactor: exportEncryptedBackup's return contract changed from tri-state (true/false/'cancel') to a structured object { ok, skip, cancelled, blob, filename }. Sole caller (overview.js openExportFlow) updated. No backward-compat shim needed — internal API only."
  - "Share-button visibility: Plan 02 hid the Share button on the encrypted path (no encrypted blob in scope). Plan 08 unhides it — the button is now gated only by navigator.canShare() capability, not by which path the user took. probeShareSupport() runs after both paths."
  - "settings.html ↛ backup.js fix: discovered during Wave 6 regression that settings.html never loaded backup.js, silently breaking Plan 05's Backups-tab handlers (which all guard their BackupManager calls with `typeof !== 'undefined'`). Added the script tag to restore the intended production behavior. Shipped as a dedicated fix(25-08) commit so the failure mode is on the git record."

requirements-completed: [D-29, D-30, D-04]

metrics:
  duration: ~12 min
  completed: 2026-05-15
  tasks: 3
  tests_added: 3 (43 assertions total)
  tests_passing: 21/21 Phase 25 tests (zero regressions)
  commits: 5 (round-trip RED→commit, encrypt-share RED, encrypt-share GREEN, audit, settings.html fix)
---

# Phase 25 Plan 08: Single-Source Export Refactor + Round-Trip Integration Test — Summary

**One-liner:** Closed D-29 / D-30 / D-04 with three new tests (43 assertions), refactored `exportEncryptedBackup` to expose the encrypted blob+filename so the Share button now works on the encrypted path (closing Plan 02's deferred limitation), and fixed a Wave-6 regression discovery where `settings.html` was silently missing the `backup.js` script tag — making the entire Plan 05 Backups tab non-functional in production.

## What Shipped

### Task 1 — Round-trip integration test (D-29 enforcement)

**File:** `tests/25-08-roundtrip-stores.test.js` — 15 assertions, all PASS.

**Strategy:** in-memory `PortfolioDB` mocks (source + dest) + the REAL vendored JSZip + the REAL `BackupManager.exportBackup` and `BackupManager.importBackup`, exercised in two vm sandboxes. Synthetic dataset covers every store in `BACKUP_CONTENTS_KEYS`:

| Store              | Source rows                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `clients`          | 3 (Alice with `data:image/jpeg;base64,QUJDRA==` photo; Bob no photo; Carol with `data:image/jpeg;base64,RUZHSA==`) |
| `sessions`         | 3 (covers `sections.trapped` / `sections.insights` / `sections.issues` / empty sections)                          |
| `therapistSettings`| 2 (with `customLabel: 'Locked'` + `customLabel: null`)                                                            |
| `snippets`         | 2 (with `tags: ['emotion']` + `tags: []`; `modifiedFromSeed` true/false)                                          |
| `photos`           | Travel via ZIP entries under `photos/client-{id}.{ext}` — load-bearing round-trip assertion decodes the base64 segment and asserts `'ABCD'` / `'EFGH'` bytes survive the trip |

**Round-trip assertions:**

1. `BACKUP_CONTENTS_KEYS` exposed (5 entries).
2. `exportBackup()` returns `{ blob, filename }` matching `/Sessions-Garden-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/`.
3. `importBackup(file)` resolves without throwing.
4. `clearAll()` was called exactly once before any add* writes.
5. Client COUNT (3 → 3), session COUNT (3 → 3), therapistSettings COUNT (2 → 2), snippets COUNT (2 → 2).
6. Field-level lossless (firstName / lastName / type, clientId / date / isHeartShield / shieldRemoved / sections, sectionKey / customLabel / enabled, id / trigger / text / tags).
7. **Photo round-trip — bytes equality:** decoded base64 from `destAddClient[0][0].photoData` must equal `'ABCD'`; same for client 3 → `'EFGH'`. This is the load-bearing assertion proving the `photos/` subfolder serialization is lossless.

**Code-fix surfaced by the round-trip test:** ZERO. The first run produced one sandbox-setup failure (`setImmediate is not defined` — JSZip's generateAsync uses it for chunk scheduling); fixed by exposing `setImmediate`/`clearImmediate`/`queueMicrotask` in the sandbox. All 15 assertions then passed against the existing `backup.js` — D-29 was already upheld by the existing code, this test just makes it falsifiable.

**Run time:** ~120ms.

### Task 2 — exportEncryptedBackup refactor + encrypt-then-share BEHAVIOR test (D-04 closure)

**Files:**
- `tests/25-08-encrypt-then-share.test.js` — 10 assertions (6 shape grep + 4 sentinel-blob behavior), all PASS.
- `assets/backup.js` — refactored `exportEncryptedBackup` return contract.
- `assets/overview.js` — refactored `openExportFlow` to consume the new shape; exposed `window.openExportFlow`.

#### `exportEncryptedBackup` return-shape refactor

| Outcome    | Before (Plan 02)    | After (Plan 08)                                                                          |
| ---------- | ------------------- | ---------------------------------------------------------------------------------------- |
| Confirm    | `true`              | `{ ok: true,  skip: false, cancelled: false, blob: encBlob, filename: encFilename }`     |
| Skip       | `false`             | `{ ok: false, skip: true,  cancelled: false, blob: null,    filename: null }`            |
| Cancel     | `'cancel'`          | `{ ok: false, skip: false, cancelled: true,  blob: null,    filename: null }`            |

The encrypted-blob exposure is the load-bearing change: the caller (overview.js `openExportFlow`) can now plumb `result.blob` and `result.filename` into the Share button's `afterExport` callback, which forwards them to `BackupManager.shareBackup(blob, filename)`. Result: the encrypted `.sgbackup` file goes through the OS share sheet, not the unencrypted ZIP.

**Sole caller verified:** `overview.js` `openExportFlow`. No other call site in `assets/` or `tests/` references `exportEncryptedBackup`. No backward-compat shim needed.

#### `openExportFlow` consumption pattern

```js
const result = await BackupManager.exportEncryptedBackup();
if (result.cancelled) return null;
let producedBlob = null, producedFilename = null;
if (result.skip) {
  // Skip-encryption: produce unencrypted ZIP ourselves
  const unenc = await BackupManager.exportBackup();
  BackupManager.triggerDownload(unenc.blob, unenc.filename);
  if (BackupManager.isAutoBackupActive()) await BackupManager.autoSaveToFolder(unenc.blob, unenc.filename);
  producedBlob = unenc.blob; producedFilename = unenc.filename;
} else if (result.ok) {
  // Encrypted: blob already downloaded inside exportEncryptedBackup;
  //           forward the encrypted blob+filename to the Share button.
  producedBlob = result.blob; producedFilename = result.filename;
}
probeShareSupport();  // capability-gated only — visible for BOTH paths
// ... renderLastBackupSubtitle / updateBackupCloudState / afterExport ...
```

**Share button visibility:** Plan 02 explicitly hid the Share button after an encrypted export (`shareBtn.classList.add('is-hidden')`) because no encrypted blob was in scope to chain. Plan 08 removes that explicit hide; the button is now gated only by `navigator.canShare({ files: [probeFile] })` via `probeShareSupport()`, which runs after BOTH the encrypted and skip-encryption paths. The honest-body principle is preserved: the button is hidden only when the platform genuinely cannot share, not because of the export path.

#### `window.openExportFlow` exposure

Added next to the existing `window.openBackupModal` / `window.renderLastBackupSubtitle` exports at the top of `overview.js`. One-line additive change. Required by the behavior-test sandbox (sub-case B drives the openExportFlow code path via the sandbox window); also useful for future scheduled-backup interval-end prompt invocation from `settings.js` and any command-palette / mobile-menu deep links.

#### Encrypt-then-share test — TWO sub-cases

**Sub-case A — SHAPE grep (6 assertions):** reads `backup.js` and `overview.js` as text and asserts:
- `resolve({ ok: true, skip: false, cancelled: false, blob: encBlob, filename: encFilename })` regex match (tolerant whitespace).
- `resolve({ ok: false, skip: true, cancelled: false, blob: null, filename: null })` regex match.
- `resolve({ ok: false, skip: false, cancelled: true, blob: null, filename: null })` regex match.
- `openExportFlow` consumes `result.cancelled` / `result.skip` / `result.ok` / `result.blob` (≥ 4 field accesses).
- Old branches purged: 0 matches for `encrypted === 'cancel'` / `=== false`.
- `window.openExportFlow = openExportFlow` exposure present.

**Sub-case B — SENTINEL-BLOB behavior assertion (4 assertions):** the load-bearing D-04 closure per project memory `feedback-behavior-verification.md`.

Strategy: vm sandbox installs a stubbed `BackupManager` whose `exportEncryptedBackup` returns a frozen `SENTINEL_BLOB`. Loads `overview.js` (the pre-DOMContentLoaded block, where `openExportFlow` is hoisted and exposed on `window`). Drives `openExportFlow({ afterExport: async ({ blob, filename }) => { await BackupManager.shareBackup(blob, filename); } })`. Asserts:

```js
assert.strictEqual(shareBackupCalls.length, 1);
assert.strictEqual(shareBackupCalls[0].blob, SENTINEL_BLOB);
assert.strictEqual(shareBackupCalls[0].filename, 'sessions-garden-2026-05-15.sgbackup');
// Plus: exportBackup was NOT called (no re-derivation)
// Plus: triggerDownload was NOT called (encrypted path already downloaded inside exportEncryptedBackup)
```

A regression that re-derives the blob via `await BackupManager.exportBackup()` on the encrypted path would leak the unencrypted ZIP to `shareBackup`; this test catches it because the reference identity check `=== SENTINEL_BLOB` fails immediately.

### Task 3 — Single-source-of-truth audit (D-30 enforcement)

**File:** `tests/25-08-single-source-audit.test.js` — 18 assertions, all PASS. Pure file-content greps, no sandbox.

**Helpers audited:**

| Helper                                  | Definition       | Consumers (asserted)                                                                                                  |
| --------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `BackupManager.getScheduleIntervalMs`   | `assets/backup.js` | `assets/app.js` (banner suppression — Plan 04) + ≥ 3 references inside `backup.js` (computeBackupRecencyState + checkBackupSchedule + public-API export) |
| `CropModule.resizeToMaxDimension`       | `assets/crop.js`   | `assets/add-client.js` (Plan 06 new uploads) + `assets/settings.js` (Plan 07 Photos-tab optimize)                     |
| `PortfolioDB.updateClient`              | `assets/db.js`     | ≥ 2 call-sites in `settings.js` (Plan 07 optimize + delete-all)                                                       |
| `BACKUP_CONTENTS_KEYS`                  | `assets/backup.js` | Public-API export (consumed by modal markup + Plan 02 parity test + Plan 08 round-trip test)                          |
| `BackupManager.shareBackup`             | `assets/backup.js` | `assets/overview.js` (modal Share button afterExport — both encrypted and skip-encryption paths after Plan 08)        |

**Negative gates (regression-prevention):**

- `sendToMyself` fully purged from `backup.js` AND `overview.js` (Plan 01 D-01).
- No rogue canvas-API calls (`createImageBitmap` / `.toBlob(` / `.getContext('2d')` / `.drawImage(`) in `settings.js` OR `db.js`. The canvas pipeline must live ONLY in `crop.js` (`CropModule`).

Note on the audit's chip-side check: Plan 04 wires the chip color through `BackupManager.computeBackupRecencyState()` (which itself calls `getScheduleIntervalMs`). So `getScheduleIntervalMs` is consumed by 3 distinct paths inside the project (banner suppression in `app.js`, chip color via `computeBackupRecencyState` in `backup.js`, and the schedule-fire path in `backup.js`'s `checkBackupSchedule`) — the audit verifies all three via combined `app.js` + `backup.js` reference counts.

### Critical follow-up — `settings.html` ↛ `backup.js` wiring fix

**Discovery context:** orchestrator regression check between Plan 07 and Plan 08 revealed that `settings.html` does not load `assets/backup.js`. Plan 05's Backups-tab handlers (`BackupManager.canEnableSchedule`, `BackupManager.checkBackupSchedule`, schedule-disable confirm, password-mandatory enforcement) all wrap their calls in `typeof BackupManager !== 'undefined'` guards — those guards were silently no-op'ing on the live site because no script tag exposed `BackupManager`.

**Fix:** added `<script src="./assets/backup.js"></script>` to `settings.html` between `crop.js` and `snippets.js`, mirroring the `index.html` script load order. The defensive `typeof BackupManager` guards in `settings.js` stay in place as a fail-safe.

**Why shipped as a dedicated `fix(25-08)` commit:** per the orchestrator's instruction, so the failure mode is on the git record and bisectable. Phase 25 test suite continues to pass (21/21).

## Commits

| Hash      | Type   | Subject                                                                                       |
| --------- | ------ | --------------------------------------------------------------------------------------------- |
| `6a3825e` | `test` | round-trip integration test enforces D-29 across all 5 stores (Task 1)                        |
| `d7fc711` | `test` | RED — encrypt-then-share contract + sentinel-blob D-04 behavior (Task 2 RED)                  |
| `1195cca` | `feat` | GREEN — exportEncryptedBackup returns blob+filename; Share works on encrypted path (Task 2 GREEN); sw.js v154 → v155 |
| `8b82a8e` | `test` | single-source-of-truth audit enforces D-30 across 5 helpers (Task 3)                          |
| `05f747a` | `fix`  | wire backup.js on settings.html — restores Plan 05 Backups-tab handlers; sw.js v155 → v156    |

The two pre-commit auto-bumps (v154 → v155 → v156) followed the project's documented convention for `assets/backup.js` and `settings.html` being in `PRECACHE_URLS`. No manual `chore` follow-up is needed since `PRECACHE_URLS` itself did not grow.

## Plan-Wide Grep Gates (all PASS)

| Gate                                                                                                                | Result |
| ------------------------------------------------------------------------------------------------------------------- | ------ |
| `resolve\(\s*\{\s*ok:\s*true` in backup.js                                                                          | PASS   |
| `resolve\(\s*\{\s*ok:\s*false,\s*skip:\s*true` in backup.js                                                         | PASS   |
| `resolve\(\s*\{\s*ok:\s*false,\s*skip:\s*false,\s*cancelled:\s*true` in backup.js                                   | PASS   |
| `result\.cancelled\|result\.skip\|result\.ok\|result\.blob` ≥ 4 in overview.js                                      | PASS (8 hits) |
| `encrypted\s*===\s*'cancel'\|encrypted\s*===\s*false` = 0 in overview.js (old branches purged)                      | PASS   |
| `window\.openExportFlow\s*=` present in overview.js                                                                 | PASS   |
| `SENTINEL_BLOB\|shareBackupCalls` ≥ 3 in tests/25-08-encrypt-then-share.test.js                                     | PASS (10 hits) |
| `BACKUP_CONTENTS_KEYS\|sourceClients\|sourceSessions\|sourceTherapistSettings\|sourceSnippets` references ≥ 4       | PASS (20 hits) |
| `exportBackup\(\)` + `importBackup\(` both present in tests/25-08-roundtrip-stores.test.js                          | PASS   |
| settings.html now contains `src=".\/assets\/backup\.js"`                                                            | PASS   |

## Phase-Wide Regression Sweep (all PASS)

```
$ for f in tests/25-*.test.js; do node "$f" > /dev/null 2>&1 && echo PASS || echo FAIL; done
PASS: tests/25-01-sendToMyself-removed.test.js
PASS: tests/25-01-share-encryption-inherit.test.js
PASS: tests/25-01-share-fallback.test.js
PASS: tests/25-02-checklist-store-parity.test.js
PASS: tests/25-02-modal-structure.test.js
PASS: tests/25-03-testpassword-invalid.test.js
PASS: tests/25-03-testpassword-no-mutation.test.js
PASS: tests/25-03-testpassword-wrong.test.js
PASS: tests/25-04-banner-suppression.test.js
PASS: tests/25-04-cloud-state.test.js
PASS: tests/25-04-schedule-interval.test.js
PASS: tests/25-05-schedule-debounce.test.js
PASS: tests/25-05-schedule-fires.test.js
PASS: tests/25-05-schedule-password-mandatory.test.js
PASS: tests/25-06-crop-only.test.js
PASS: tests/25-06-resize-pure.test.js
PASS: tests/25-07-delete-all-photos.test.js
PASS: tests/25-07-photo-bytes-estimator.test.js
PASS: tests/25-08-encrypt-then-share.test.js
PASS: tests/25-08-roundtrip-stores.test.js
PASS: tests/25-08-single-source-audit.test.js
```

**Phase 25 total: 21/21 tests pass.** Full suite runs in ~0.4 s.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] JSZip `setImmediate` reference inside vm sandbox**

- **Found during:** Task 1 first run.
- **Issue:** The vendored `assets/jszip.min.js` calls `setImmediate` inside `generateAsync` for chunk scheduling. Node 22 has `setImmediate` as a global but the vm sandbox doesn't inherit globals — it only sees what's installed on its sandbox object.
- **Fix:** exposed `setImmediate`, `clearImmediate`, and `queueMicrotask` on the sandbox object. No change to backup.js or jszip.min.js.
- **Files modified:** `tests/25-08-roundtrip-stores.test.js` (sandbox setup only).
- **Committed in:** folded into the Task-1 commit `6a3825e`.

**2. [Rule 3 — Blocking issue] `settings.html` did not load `backup.js`**

- **Found during:** orchestrator regression check between Plan 07 and Plan 08 (passed to executor via `<critical_followup>` in the spawning prompt).
- **Issue:** Plan 05's Backups-tab handlers wrapped every `BackupManager.*` call in `typeof !== 'undefined'` guards; Plan 05 silently accepted that `settings.html` had no `backup.js` script tag, so the entire Backups tab on the live site was non-functional (silent no-op).
- **Fix:** added `<script src="./assets/backup.js"></script>` between `crop.js` and `snippets.js` in `settings.html`, mirroring `index.html`'s load order. Shipped as a dedicated `fix(25-08)` commit so the failure mode is on the git record and bisectable.
- **Files modified:** `settings.html`.
- **Committed in:** `05f747a`.

### Architectural-style deviation note

**3. Audit test's "getScheduleIntervalMs from overview.js" check became "from app.js"**

- **Plan text said:** "getScheduleIntervalMs consumed by overview.js (chip)".
- **Reality:** the chip color routes through `BackupManager.computeBackupRecencyState()` (a Plan 02/04 single-source helper), which itself calls `getScheduleIntervalMs`. `overview.js` does NOT directly reference `getScheduleIntervalMs` — it calls `App.updateBackupCloudState(...)`, which is the public chip-state API. This is GOOD design (`overview.js` doesn't need to know schedule details), but it means the plan's specific grep would fail.
- **Adapted:** the audit test now asserts `getScheduleIntervalMs` is consumed by `app.js` (banner suppression — also a Plan 04 single-source consumer) AND has ≥ 3 references inside `backup.js` (definition + public-API export + the two internal consumers `checkBackupSchedule` and `computeBackupRecencyState`). The D-30 invariant — getScheduleIntervalMs has multiple consumers — is preserved; only the literal grep changed.
- **No code change** — the architecture was already correct, the plan's verify gate just needed updating to match reality. Documented here for transparency.

### Cosmetic Deviations

None.

## Threat Closure (from PLAN.md `<threat_model>`)

| ID          | Disposition | Status                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-25-08-01  | mitigate    | **CLOSED.** `tests/25-08-encrypt-then-share.test.js` sub-case B asserts the SAME blob object reference returned by `exportEncryptedBackup` flows into `shareBackup`. A regression that re-derived the blob via `await exportBackup()` on the encrypted path (silently leaking unencrypted data to the share sheet) would fail the `=== SENTINEL_BLOB` reference-identity check immediately.            |
| T-25-08-02  | accept      | As planned. The mock's `__calls` Map is test-only spy surface; production code never reads it.                                                                                                                                                                                                                                                                                                          |
| T-25-08-03  | accept      | As planned. Synthetic dataset uses 'Alice', 'Bob', 'Carol' — no real PII.                                                                                                                                                                                                                                                                                                                              |

## Hand-offs

### To gsd-verify-work (next step)

The 30 D-XX decisions from `25-CONTEXT.md` are now ready for an end-to-end verification pass:
- D-01 → D-08 (overview cluster + entry point) — closed by Plans 01/02.
- D-09 → D-12 (modal contents + test-password) — closed by Plans 02/03.
- D-13 → D-15 (chip / cloud icon state coupling) — closed by Plan 04.
- D-16 → D-20 (scheduled-backup) — closed by Plan 05.
- D-21 → D-25 (photo handling + Photos settings) — closed by Plans 06/07.
- D-26 → D-28 (cross-cutting i18n + helper text) — closed throughout.
- **D-29 (round-trip completeness) — closed by Plan 08, enforceable via `node tests/25-08-roundtrip-stores.test.js`.**
- **D-30 (single-source-of-truth) — closed by Plan 08, enforceable via `node tests/25-08-single-source-audit.test.js`.**
- **D-04 (Share-path encryption inheritance) — closed for the encrypted path by Plan 08 sub-case B (behavioral sentinel-blob), enforceable via `node tests/25-08-encrypt-then-share.test.js`.**

### To manual UAT on Safari macOS + iPhone Safari (post-merge)

1. Open Backup & Restore modal → Export. Enter passphrase. Confirm. Verify the OS share sheet appears with the encrypted `.sgbackup` file (NOT the unencrypted ZIP). Pick "Save to Files" or "Mail" and confirm the file extension is `.sgbackup`.
2. Open Backup & Restore modal → Export. Click "Skip encryption". Verify the OS share sheet appears with the unencrypted `.zip`.
3. Live round-trip: Export → save to disk → clear browser data → reopen → Import → verify all clients/sessions/snippets/settings/photos are restored. (Human version of `tests/25-08-roundtrip-stores.test.js`.)
4. Settings → Backups tab: now actually functional after the `settings.html` fix. Verify Plan 05's password-mandatory enforcement, schedule-on/off transition, and interval-end prompt all work as designed.

### To future maintainers — mock-portfolio-db.js extension

The Plan 03 mock already accepted `{ clients, sessions, therapistSettings, snippets }` options, so Plan 08 needed NO extension. The mock is now exercised by:
- `tests/25-03-testpassword-no-mutation.test.js` (no-mutation invariant)
- `tests/25-03-testpassword-wrong.test.js` (no-mutation invariant on wrong-password path)
- `tests/25-03-testpassword-invalid.test.js` (no-mutation invariant on invalid-file paths)
- `tests/25-08-roundtrip-stores.test.js` (source-priming + dest-write-recording — the canonical round-trip consumer)

If a future test needs more options (e.g., to inject a custom `validateSnippetShape` that REJECTS certain shapes), extend the factory in place. The Plan 03 + Plan 08 consumers will not break — `opts` is optional and additive.

### To anyone touching `exportEncryptedBackup` in the future

The return shape is now `{ ok, skip, cancelled, blob, filename }`. The sole caller is `overview.js openExportFlow`. If you add a second caller (e.g., a scheduled-backup interval-end prompt that wants to invoke the encrypt-or-skip flow), use the new shape — there is no shim or legacy adapter.

## TDD Gate Compliance

Plan 08 carries `tdd="true"` on Tasks 1 and 2. Git log shows both gate sequences:

| Task | RED commit (`test(...)`)                                                                  | GREEN commit (`feat(...)`)                                                                                       |
| ---- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1    | `6a3825e test(25-08): round-trip integration test enforces D-29 across all 5 stores` *    | (no implementation needed — existing exportBackup/importBackup already upheld D-29; first-run passed 15/15)      |
| 2    | `d7fc711 test(25-08): RED — encrypt-then-share contract + sentinel-blob D-04 behavior`    | `1195cca feat(25-08): GREEN — exportEncryptedBackup returns blob+filename; Share works on encrypted path`        |

*Task 1's RED commit was the only test commit because the production code was already correct — D-29 was an existing-but-unenforced invariant. The test commit serves as both the test addition AND the gate closure. No GREEN commit followed because there was no broken implementation to fix.

Task 3 has no `tdd="true"` flag — pure audit work, single commit `8b82a8e`.

## Self-Check: PASSED

| Claim                                                                                | Verification                                                          | Result   |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | -------- |
| tests/25-08-roundtrip-stores.test.js exists + 15 assertions pass                     | `[ -f ... ] && node ...`                                              | FOUND + PASS |
| tests/25-08-encrypt-then-share.test.js exists + 10 assertions pass                   | `[ -f ... ] && node ...`                                              | FOUND + PASS |
| tests/25-08-single-source-audit.test.js exists + 18 assertions pass                  | `[ -f ... ] && node ...`                                              | FOUND + PASS |
| Commit 6a3825e (Task 1) exists                                                       | `git log --oneline \| grep -q 6a3825e`                                | FOUND    |
| Commit d7fc711 (Task 2 RED) exists                                                   | `git log --oneline \| grep -q d7fc711`                                | FOUND    |
| Commit 1195cca (Task 2 GREEN) exists                                                 | `git log --oneline \| grep -q 1195cca`                                | FOUND    |
| Commit 8b82a8e (Task 3) exists                                                       | `git log --oneline \| grep -q 8b82a8e`                                | FOUND    |
| Commit 05f747a (settings.html fix) exists                                            | `git log --oneline \| grep -q 05f747a`                                | FOUND    |
| exportEncryptedBackup returns the new object shape                                   | grep of resolve({ ok: ..., blob, filename })                          | PASS     |
| openExportFlow consumes result.cancelled/skip/ok/blob (≥ 4 references)               | grep count = 8                                                        | PASS     |
| Old `encrypted === 'cancel'` / `=== false` branches purged (= 0)                     | grep count = 0                                                        | PASS     |
| window.openExportFlow exposed                                                        | `grep -E 'window\\.openExportFlow\\s*=' assets/overview.js`           | PASS     |
| settings.html now loads backup.js                                                    | `grep -E 'src=\".\\/assets\\/backup\\.js\"' settings.html`            | PASS     |
| All 21 Phase 25 tests pass (no regressions)                                          | regression sweep                                                      | PASS     |

Verified by command-line run after the final commit `05f747a`.

## Known Stubs

None. Plan 08 is purely test-and-refactor work — no UI placeholders, no "coming soon" rendering paths, no hardcoded empty values. The encrypted-share path is fully wired end-to-end as of `1195cca`.
