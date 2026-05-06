---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 07
subsystem: backup-restore
tags: [backup, indexeddb, manifest, backward-compat, security, whitelist]

# Dependency graph
requires:
  - phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
    plan: 02
    provides: PortfolioDB.getAllTherapistSettings, PortfolioDB.setTherapistSetting, PortfolioDB.clearAll (extended to clear therapistSettings store)
provides:
  - Manifest version 2 (additive therapistSettings field; backward-compat preserved for v0/v1)
  - normalizeManifest defaults manifest.therapistSettings to [] when missing or non-array
  - importBackup restore loop with ALLOWED_KEYS whitelist + per-row type coercion
  - Encrypted .sgbackup path inherits round-trip support automatically (wraps exportBackup/importBackup)
affects: [22-04-settings-page consumers (their saved customisations now survive backup cycles), future phases that add new therapistSettings fields]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Defensive defaulting in normalizeManifest: lift Array.isArray check above version-branching so v0/v1/v2 all converge on a consistent shape"
    - "Per-row whitelist + try/catch in restore loops: a single bad row logs+skips rather than aborting the whole restore (atomic-by-section, not all-or-nothing)"
    - "Type coercion with safe defaults: customLabel falls back to null, enabled falls back to true — never read user-supplied types directly into IDB"

key-files:
  created: []
  modified:
    - "assets/backup.js — exportBackup adds getAllTherapistSettings call (try/catch), manifest version 1->2, manifest.therapistSettings field; normalizeManifest defaults therapistSettings to []; importBackup adds whitelisted restore loop AFTER sessions loop"

key-decisions:
  - "Manifest version bumped to 2 (additive change). v0 legacy and v1 Phase-7 ZIPs continue to load via normalizeManifest's defaulting branch — no error, no warning, just an empty therapistSettings array that the restore loop iterates zero times."
  - "ALLOWED_KEYS whitelist hard-coded in backup.js (not imported from a shared SECTION_KEYS constant). Rationale: backup.js is a defensive boundary against tampered backups; coupling it to a render-side constant would weaken the trust boundary if the render-side list ever expanded with unsafe keys. Future plans that add a 10th sectionKey must update this whitelist explicitly — that is the intended friction."
  - "Per-row try/catch around setTherapistSetting (rather than one try/catch around the whole loop). Rationale: T-22-07-07 — clients/sessions are already restored at this point. A failure on row 4 must not block rows 5-9. Console warnings document any skipped rows."
  - "Encrypted-backup path is NOT separately modified. exportEncryptedBackup / .sgbackup imports both wrap the same exportBackup/importBackup primitives, so they inherit version 2 manifests automatically. Verified by code-reading: exportEncryptedBackup calls await exportBackup() at line 461; .sgbackup decrypt path constructs a File from the decrypted ZIP and recursively calls importBackup at line 525."

patterns-established:
  - "Defensive deserialisation: Array.isArray + type coercion + whitelist at the storage boundary. Storage layer never trusts manifest contents."
  - "Forward-compat: normalizeManifest does not reject unknown version numbers; future v3 manifests can add fields outside the loops and current code silently ignores them (T-22-07-06)."

requirements-completed: [REQ-18]

# Metrics
duration: ~1min
completed: 2026-05-06
---

# Phase 22 Plan 07: Backup/Restore Round-Trip for Therapist Settings

**Backup ZIP manifest now round-trips therapist customisations (custom section labels + disabled flags) via a v2 manifest field, with full backward-compat for pre-Phase-22 backups (v0 legacy, v1 Phase-7 ZIPs) and a whitelist-defended restore loop.**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-05-06 (worktree agent-a3162c8cc9b2ecae8)
- **Completed:** 2026-05-06
- **Tasks:** 1 / 1
- **Files modified:** 1 (assets/backup.js)

## Accomplishments

- `exportBackup()` now reads `await db.getAllTherapistSettings()` and writes the result into `manifest.therapistSettings`. Wrapped in try/catch so a missing function (transitional / older clients) does not abort the backup — falls back to `[]`.
- Manifest `version` bumped from `1` to `2`. The bump is purely additive; the field shape is otherwise unchanged.
- `normalizeManifest()` extended with a top-of-function `Array.isArray(manifest.therapistSettings)` defaulting check. Applied uniformly to v0 legacy (no version field), v1 Phase-7 ZIPs, and any future v3+ manifests with malformed/missing fields. The v0 branch explicitly returns `therapistSettings: []` for clarity.
- `importBackup()` extended with a third restore loop after the sessions loop. The loop:
  - Whitelists `sectionKey` against the 9 allowed keys (`trapped`, `insights`, `limitingBeliefs`, `additionalTech`, `heartShield`, `heartShieldEmotions`, `issues`, `comments`, `nextSession`) — closes T-22-07-01 (arbitrary key injection)
  - Type-coerces `customLabel` to `string|null` and `enabled` to `boolean` — closes T-22-07-03 (type confusion)
  - Wraps `setTherapistSetting` in per-row try/catch — closes T-22-07-07 (partial-restore atomicity)
  - Logs and skips malformed rows (no thrown errors bubble up) — preserves the user-facing "successful restore" UX
- `db.clearAll()` runs BEFORE this loop (existing behaviour, plus Plan 02's extension to clear the therapistSettings store) so the restore is replace-not-merge.
- Encrypted `.sgbackup` path inherits this support automatically. `exportEncryptedBackup` calls `await exportBackup()` (line 461 → version 2 manifest baked into encrypted blob); `.sgbackup` decrypt path constructs a File from the decrypted ZIP and recursively calls `importBackup()` (line 525 → restore loop runs).

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend exportBackup, normalizeManifest, importBackup restore loop in assets/backup.js** — `7bf28c2` (feat)

_Note: Plan metadata commit (SUMMARY.md) is performed by the orchestrator after worktree merge._

## Files Created/Modified

- `assets/backup.js` — three additive changes inside the existing IIFE: (A) `exportBackup` now reads therapistSettings via try/catch + writes to `manifest.therapistSettings`, version bumped to 2; (B) `normalizeManifest` defaults `manifest.therapistSettings` to `[]` and explicitly returns `therapistSettings: []` on the v0 branch; (C) `importBackup` adds a whitelisted, type-coerced, per-row try/catch restore loop after the sessions loop. No other functions touched. ZIP file structure unchanged (same `backup.json` carries the new field).

## Decisions Made

- **Manifest v2 is purely additive.** No existing field changed shape. v1 backups load without errors via the `Array.isArray` default in normalizeManifest. The version bump is for diagnostic purposes (so a debug log can tell you whether a backup is Phase 7 era or Phase 22 era), not a compat barrier.
- **ALLOWED_KEYS is hard-coded inside backup.js**, not imported from a shared constant. Coupling it to a render-side `SECTION_KEYS` would erode the trust boundary if the render side ever expanded the list with an unsafe new key. Future plans that legitimately add a 10th sectionKey must update this whitelist explicitly — that friction is the design.
- **Per-row try/catch, not loop-level try/catch.** Clients and sessions are already restored when the therapistSettings loop runs. A single bad row must not roll those back. The user perceives a successful restore; console warnings document any skipped rows.
- **Encrypted path is not separately patched.** The .sgbackup path wraps exportBackup/importBackup as primitives, so it inherits version 2 manifests automatically. Verified by code-reading the existing `exportEncryptedBackup` (calls `await exportBackup()`) and the .sgbackup branch in `importBackup` (recursively calls `importBackup` with the decrypted ZIP File).
- **Forward-compat preserved.** `normalizeManifest` does not reject unknown version numbers; a hypothetical v3 backup with a new field outside the existing three loops is silently ignored (the existing fields still restore). T-22-07-06 mitigation.

## Deviations from Plan

None — plan executed exactly as written. No Rule 1/2/3 auto-fixes triggered. No Rule 4 architectural decisions surfaced. The threat model in the plan was a complete spec; every disposition (mitigate × 6, accept × 1) is implemented.

## Issues Encountered

None.

## Threat Model Compliance

All seven threats in the plan's STRIDE register were addressed in code:

| Threat ID | Disposition | Implementation |
|-----------|-------------|----------------|
| T-22-07-01 (Tampering: arbitrary sectionKey) | mitigate | `ALLOWED_KEYS.indexOf(rec.sectionKey) === -1` short-circuits with console warning |
| T-22-07-02 (XSS via customLabel) | mitigate | Threat closed at render in Plans 04/06; storage layer is verbatim per Plan 02 contract — restore path does not change the surface |
| T-22-07-03 (type confusion) | mitigate | `cleanRec` coerces customLabel to string\|null, enabled to boolean; other types fall back to defaults |
| T-22-07-04 (DoS via massive array) | mitigate | Whitelist bounds the effective set to 9 keys; loop continues skip the rest in O(1) per row |
| T-22-07-05 (info disclosure via backup ZIP) | accept | User exporting their own backup; same surface as today's clients/sessions backup |
| T-22-07-06 (forward-compat with future v3) | mitigate | normalizeManifest does not reject unknown versions; unknown fields are silently preserved/ignored |
| T-22-07-07 (partial-restore inconsistency) | mitigate | Per-row try/catch keeps the loop running; clients/sessions are already restored at that point |

## User Setup Required

None.

## Next Phase Readiness

- Plan 22-04 users can now back up their custom labels + disabled flags and have them survive a wipe-and-restore cycle (the original REQ-18 scope).
- Plan 22-08 (SW cache + shared chrome) is unaffected by this change — backup is independent of cache behaviour.
- Future phases that add new therapistSettings fields (e.g. per-section ordering, per-section colour) will be exported/imported automatically as long as:
  - The field is added to the row schema in Plan 02's `setTherapistSetting` JSDoc (no change here needed)
  - If a new sectionKey is introduced, the `ALLOWED_KEYS` array in backup.js MUST be updated — the whitelist is intentionally local for security boundary reasons.

## Verification Performed

- `node -c assets/backup.js` — passes
- `grep -q "therapistSettings: allTherapistSettings"` — line 418 ✓
- `grep -q "version: 2"` — line 413 ✓
- `grep -q "Array.isArray(manifest.therapistSettings)"` — line 333 ✓
- `grep -q "db.setTherapistSetting"` — line 661 ✓
- `grep -q "ALLOWED_KEYS"` — lines 634, 651 ✓
- `grep -q "manifest.therapistSettings.length"` — line 645 ✓
- Loop order: sessions loop at line 624 < therapistSettings loop at line 645 ✓
- `getAllTherapistSettings` call wrapped in try/catch (lines 374-381) ✓
- Smoke-tested `normalizeManifest` standalone via `node -e` for four cases:
  - v0 legacy (no version field) → `version: 0`, `therapistSettings: []` ✓
  - v1 Phase-7 ZIP (no therapistSettings field) → `version: 1`, `therapistSettings: []` ✓ (this is the explicit backward-compat success criterion)
  - v2 with valid therapistSettings → preserved exactly ✓
  - v2 with malformed therapistSettings (object instead of array) → defaulted to `[]` ✓

## Self-Check: PASSED

**Files modified verified to exist:**
- `assets/backup.js` ✓

**Commits verified in `git log`:**
- `7bf28c2` (Task 1) ✓

**Plan-level verification:**
- All 8 acceptance criteria from `<acceptance_criteria>` block satisfied (verified via grep above)
- All 7 STRIDE threats addressed per disposition
- Backward-compat success criterion confirmed via standalone normalizeManifest smoke test (v0 + v1 inputs both produce `therapistSettings: []`)
- ZIP file structure unchanged — same `backup.json` inside the same ZIP, just one extra top-level field

**Stub scan:** No new TODO/FIXME/placeholder strings introduced. The pre-existing `'backup.passphrase.placeholder'` matches are i18n key identifiers, unrelated to this plan. Pre-existing `closeBtn.innerHTML = '&times;'` (line 130) is for the modal close button (`×` symbol), unrelated to customLabel rendering — does not violate the T-22-02-01 textContent/value contract because no user data flows through it.

**Threat surface scan:** No new security-relevant surface beyond the plan's `<threat_model>`. The whitelist closes the most material threat (T-22-07-01); type coercion closes the second-order tampering vector (T-22-07-03).

---
*Phase: 22-session-workflow-loop-pre-session-context-card-editable-sess*
*Plan: 07 — Backup/Restore Round-Trip*
*Completed: 2026-05-06*
