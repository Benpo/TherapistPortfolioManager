---
phase: 47-session-section-reordering
plan: 01
subsystem: session-section-order-foundation
status: complete
tags: [indexeddb, sentinel, section-order, severity, cache, validator]
requires:
  - PortfolioDB.getAllTherapistSettings (existing sentinel infra)
  - App.createSeverityScale / getSeverityValue (existing widget)
provides:
  - PortfolioDB.getSectionOrderRecord
  - "db.js sentinel key: sectionOrder ({sectionKey, version, items})"
  - App.DEFAULT_SECTION_ORDER
  - App.GROUP_DEFAULT_TITLE_KEYS
  - App.KNOWN_SECTION_KEYS
  - App.sanitizeOrder
  - App.getSectionOrder
  - App.pinSectionOrder
  - App.flattenOrderKeys
  - App.refreshSectionOrderCache
  - "afterSeverity (new orderable section key)"
  - "tap-again-to-clear on createSeverityScale"
affects:
  - assets/db.js
  - assets/app.js
tech-stack:
  added: []
  patterns:
    - "eager-load + sync-read + defensive-copy cache (mirrors _sectionLabelCache / getSnippets)"
    - "dedicated sentinel write path with per-shape type guards"
    - "single shared pure validator (allowlist + append-missing + clamp)"
key-files:
  created:
    - tests/47-order-sentinel.test.js
    - tests/47-order-sanitize.test.js
    - tests/47-severity-clear.test.js
  modified:
    - assets/db.js
    - assets/app.js
decisions:
  - "Group ids are validated by identity during append-missing, not by a separate allow-list; a global seen-set dedups section keys so no key can appear twice (top-level or inside a group)."
  - "sanitizeOrder appends missing knowns via nearest-preceding-present-default-neighbor insertion, giving a deterministic default slot without requiring the input to be complete."
metrics:
  duration: ~20min
  completed: 2026-07-23
  tasks: 3
  files: 5
---

# Phase 47 Plan 01: Session-Section Order Foundation Summary

The shared data foundation for per-therapist section reordering: an IndexedDB order sentinel, a synchronous sanitized order cache, ONE shared move-validator, and tap-again-to-clear on the severity widget. Every downstream consumer reads order from one cache and validates through one function.

## What Was Built

**Task 1 — Order sentinel persistence (`assets/db.js`)**
- Registered `"sectionOrder"` in `_SENTINEL_KEYS` alongside `snippetsDeletedSeeds`.
- Generalized `_writeTherapistSentinel` to persist each sentinel's own payload shape with per-shape type guards: `sectionOrder` → `{ sectionKey, version:<number>, items:<array> }` (non-array items → `[]`, non-number version → `1`); `snippetsDeletedSeeds` path is byte-for-byte unchanged.
- Added reader `PortfolioDB.getSectionOrderRecord()` — returns the sentinel row (or `null`) from the existing `getAllTherapistSettings()` result filtered by `sectionKey`, introducing no new store/transaction.

**Confirmed sentinel shape:** `{ sectionKey: "sectionOrder", version: <number>, items: <array> }`

**Task 2 — Default order + cache + validator (`assets/app.js`)**
- `App.DEFAULT_SECTION_ORDER` — groups-as-data: `issues` (section) → `emotionsTech` group (`heartShield, heartShieldEmotions, trapped, insights, limitingBeliefs, additionalTech`) → `afterSeverity` (new section key) → `wrapup` group (`comments, nextSession`).
- `App.GROUP_DEFAULT_TITLE_KEYS = { emotionsTech: "session.accordion.emotions", wrapup: "session.group.wrapup" }` — the single group-id→default-title map (the `session.group.wrapup` key itself is authored in 47-02).
- `App.KNOWN_SECTION_KEYS` — the 9 Settings rows + `afterSeverity`.
- `App.sanitizeOrder(items)` — the one clamp+allowlist: drops unknown keys, dedups (each key once), appends any KNOWN section/group/member missing from the candidate at its default slot, clamps `afterSeverity`-before-`issues` to sit immediately after `issues`, and returns a fresh default order on malformed input.
- `App.getSectionOrder()` — sync defensive-copy read; returns the page pin when set.
- `App.pinSectionOrder()` — freezes a page-scoped snapshot.
- `App.flattenOrderKeys(order)` — FREE function; the only flattening API (`App.flattenOrderKeys(App.getSectionOrder())`).
- `App.refreshSectionOrderCache()` — async reload; eager-loaded in `initCommon` and awaited in the `therapist-settings-changed` BroadcastChannel handler. The handler refreshes the cache ONLY and never touches the pin.

**Task 3 — Tap-again-to-clear (`assets/app.js` `createSeverityScale`)**
- Tapping the currently-active pill clears the rating to unrated (`dataset.value = ""`, `onChange(null)`). No extra pill, no marker constant — still exactly 11 buttons. `getSeverityValue` is unchanged (returns a Number `0-10` or `null`). Downstream readers treat `null` as unrated.

## Exported Symbols (for downstream plans)

| Symbol | Kind | Notes |
|--------|------|-------|
| `PortfolioDB.getSectionOrderRecord()` | reader | row or `null` |
| `App.DEFAULT_SECTION_ORDER` | const array | groups-as-data |
| `App.GROUP_DEFAULT_TITLE_KEYS` | const map | `emotionsTech→session.accordion.emotions`, `wrapup→session.group.wrapup` |
| `App.KNOWN_SECTION_KEYS` | Set | 9 rows + `afterSeverity` |
| `App.sanitizeOrder(items)` | pure fn | allowlist + append-missing + clamp |
| `App.getSectionOrder()` | sync read | defensive copy; returns pin when pinned |
| `App.pinSectionOrder()` | fn | freezes page snapshot |
| `App.flattenOrderKeys(order)` | free fn | ordered keys, groups flattened |
| `App.refreshSectionOrderCache()` | async fn | reload cache; leaves pin |

## Deviations from Plan

None — plan executed exactly as written. (One well-formedness hardening within the spec's intent: a global `seen`-set dedups section keys during `sanitizeOrder`, so a crafted order that lists a key both top-level and inside a group cannot produce duplicates — this strengthens the G-7 "no key hidden" guarantee without changing the specified behaviors.)

## Verification

- `node tests/47-order-sentinel.test.js` — 6/6 pass
- `node tests/47-order-sanitize.test.js` — 11/11 pass
- `node tests/47-severity-clear.test.js` — 6/6 pass
- `npm test` full suite — **211 passed, 0 failed** (no regression in db/app/severity tests)
- Comment hygiene: no planning IDs in `assets/db.js` or `assets/app.js` diffs (verified by grep sweep).

## Known Stubs

None.

## Commits

- `03c7f4b` — feat(47-01): section-order sentinel persistence in db.js
- `770cf18` — feat(47-01): default order, getSectionOrder cache + sanitizeOrder validator
- `4f88a1f` — feat(47-01): tap-again-to-clear on the shared severity widget

## Self-Check: PASSED

- Files created: tests/47-order-sentinel.test.js, tests/47-order-sanitize.test.js, tests/47-severity-clear.test.js — all present.
- Files modified: assets/db.js, assets/app.js — changes committed.
- Commits 03c7f4b, 770cf18, 4f88a1f — all present in git log.
