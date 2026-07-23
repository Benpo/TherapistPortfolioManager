---
phase: 47-session-section-reordering
plan: 06
subsystem: section-order-backup-durability
status: complete
tags: [backup, restore, sentinel, section-order, sanitize, allowlist, encrypted-roundtrip]
requires:
  - PortfolioDB._writeTherapistSentinel (47-01 — sectionOrder payload shape)
  - PortfolioDB.getSectionOrderRecord (47-01)
  - App.sanitizeOrder (47-01 — shared clamp + allowlist validator)
  - db.js#_SENTINEL_KEYS containing "sectionOrder" (47-01)
provides:
  - "backup.js restore branch that persists the sectionOrder sentinel across the encrypted boundary"
  - "backup.js ALLOWED_SENTINEL_KEYS now lock-step with db.js#_SENTINEL_KEYS (adds sectionOrder)"
  - "backup.js ALLOWED_SECTION_KEYS admits afterSeverity (enable/customLabel row restores)"
affects:
  - assets/backup.js
tech-stack:
  added: []
  patterns:
    - "untrusted-restore hardening: key-allowlist THEN clamp through the single shared validator before write"
    - "sentinel-key allow-set kept in lock-step across db.js write-side and backup.js restore-side"
key-files:
  created:
    - tests/47-order-backup-roundtrip.test.js
  modified:
    - assets/backup.js
decisions:
  - "The restore key-allow-list reuses the ALLOWED_SECTION_KEYS array (now the 10 known order keys) rather than importing App.KNOWN_SECTION_KEYS, so the allow-list works even if app.js is not loaded in the restore context; the shared App.sanitizeOrder is still the preferred clamp when present."
  - "Round-trip equality is asserted through a JSON normalize because sanitizeOrder builds objects in the jsdom window realm (different Object.prototype) — a raw deepStrictEqual would trip on prototype identity, not content."
metrics:
  duration: ~18min
  completed: 2026-07-23
  tasks: 1
  files: 2
---

# Phase 47 Plan 06: Section-Order Backup Durability Summary

Makes the per-therapist section order durable across the encrypted backup boundary and defensive against crafted/old backups: the `sectionOrder` sentinel now round-trips, the new `afterSeverity` section row restores, and every restored order is key-allowlisted and clamped through the ONE shared `App.sanitizeOrder` validator before it is written — so a crafted backup cannot inject an illegal order (severity before topics) or an unknown key that the form/export would then render.

## What Was Built

**Task 1 — Restore branch for the order sentinel (`assets/backup.js`)**

- Added `"sectionOrder"` to `ALLOWED_SENTINEL_KEYS`, putting it in exact lock-step with `db.js#_SENTINEL_KEYS` (without this, restore silently drops the order as an "unknown sectionKey").
- Added `"afterSeverity"` to `ALLOWED_SECTION_KEYS` so the new section's enable/customLabel row restores through the existing `setTherapistSetting` path like every other section row.
- Derived `KNOWN_ORDER_KEYS = new Set(ALLOWED_SECTION_KEYS)` — the restore key-allow-list, reusing the same array (its 10 entries are exactly the known order keys).
- Extended the sentinel branch (which already runs BEFORE the section-key check) so that when `rec.sectionKey === "sectionOrder"` the restore:
  1. coerces `rec.items` to an array (non-array → `[]`),
  2. key-allowlists every item — drops unknown top-level section keys, and within group items keeps only members in the known order keys,
  3. clamps the candidate through `window.App.sanitizeOrder(...)` (the single shared validator: severity-after-topics clamp + append-missing) before calling `db._writeTherapistSentinel({ sectionKey:"sectionOrder", version:<number|1>, items:<sanitized> })`.
  - Fallback: if `App.sanitizeOrder` is not loaded in the restore context, it writes the **key-allowlisted** candidate only — the raw order is never trusted.
- The existing `snippetsDeletedSeeds` sentinel branch is unchanged (now the else-tail of the sentinel block). No separate order store or migration — the order lives in `therapistSettings`.

## Deviations from Plan

None — plan executed exactly as written. One test-harness detail (not an implementation change): the byte-for-byte round-trip assertion normalizes both sides through `JSON.parse(JSON.stringify(...))` because the restored objects are built in the jsdom window realm and a raw `deepStrictEqual` compares `[[Prototype]]` identity across realms.

## Threat Mitigations (from plan `<threat_model>`)

| Threat | Mitigation shipped |
|--------|--------------------|
| T-47-09 (crafted backup injects arbitrary sectionKeys / illegal order) | Restore key-allowlists `items[].key` + group `members[]` against the known order keys AND clamps via `App.sanitizeOrder` before write; absent record → default order. |
| T-47-10 (non-array items / wrong types) | `rec.items` coerced to `[]` when not an array; `version` coerced to `1` when not a number (matches db.js write-side guards). |
| T-47-11 (ALLOWED_SENTINEL_KEYS drift) | `"sectionOrder"` added in lock-step with `db.js#_SENTINEL_KEYS`; the round-trip test fails if the twin is missing. |

## Verification

- `node tests/47-order-backup-roundtrip.test.js` — **5/5 pass** (reordered legal round-trip; afterSeverity row round-trip; afterSeverity-before-issues clamp on restore; unknown key dropped on restore; absent record → default order).
- Sentinel/backup family green: `45-backup-roundtrip` (3/3), `snippet-prefix-backup-roundtrip` (3/3), `25-10-snippets-sentinel-roundtrip` (6/6), `47-order-sentinel` (6/6), `47-order-sanitize` (11/11).
- `npm test` full suite — **216 passed, 0 failed**.
- Acceptance greps: `sectionOrder` present in `ALLOWED_SENTINEL_KEYS`; `afterSeverity` present in `ALLOWED_SECTION_KEYS`; the restore path calls `App.sanitizeOrder` (validator reused, not re-implemented).
- Comment hygiene: no planning IDs in the `assets/backup.js` added lines (grep sweep clean).
- Manual real-device gate (deferred to /gsd-verify-work): export an encrypted backup after reordering, wipe, restore → order + afterSeverity enable state come back exactly.

## Known Stubs

None.

## TDD Gate Compliance

RED (`test(47-06)` `7eb1070`, 4/5 failing — order dropped as unknown key) → GREEN (`feat(47-06)` `5a938c6`, 5/5 passing). No refactor commit needed.

## Commits

- `7eb1070` — test(47-06): failing round-trip + crafted-order sanitization for section order backup
- `5a938c6` — feat(47-06): restore branch for section order — allowlist lock-step + sanitize-before-write

## Self-Check: PASSED

- File created: tests/47-order-backup-roundtrip.test.js — present.
- File modified: assets/backup.js — committed.
- Commits 7eb1070, 5a938c6 — both present in git log.
