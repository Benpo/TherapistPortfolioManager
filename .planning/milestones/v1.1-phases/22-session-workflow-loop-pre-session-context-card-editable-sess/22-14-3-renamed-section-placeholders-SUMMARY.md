---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 22-14.3
subsystem: ui / i18n / settings-customization
tags:
  - inline-fix
  - uat-gap
  - settings-customization
  - placeholders
  - i18n
requires:
  - 22-09  # introduced applySectionLabels()
  - 22-13  # settings pill revert affordance / customLabel surface
provides:
  - renamed-section-placeholder-sync
  - placeholder-restore-on-unrename
affects:
  - assets/add-session.js
tech-stack:
  added: []
  patterns:
    - "In-place extension of an existing label-sync function — no new public helper. Loop body extended from labelEl-only to labelEl + descendant input/textarea placeholders, gated by `isCustom = resolvedLabel !== App.t(defaultI18nKey)`."
    - "Placeholder write via the `.placeholder` DOM property (attribute setter, not innerHTML) — customLabel is user-controlled and the attribute setter is safe per T-22-02-01 (XSS mitigation for customLabel surface)."
    - "Bidirectional restore: when no custom label, the placeholder is re-applied from its `data-i18n-placeholder` key via `App.t(phKey)`. This is necessary because `app:settings-changed` does NOT re-run `applyTranslations()`, so a rename → un-rename sequence would otherwise leave the previous custom label stuck in the placeholder."
key-files:
  created:
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-14-3-renamed-section-placeholders-SUMMARY.md
  modified:
    - assets/add-session.js
    - sw.js  # auto-bumped by pre-commit hook (CACHE_NAME v80 → v81)
decisions:
  - "D1 (locked): Detect custom-ness via reference comparison `getSectionLabel(key, defaultI18nKey) !== App.t(defaultI18nKey)` rather than introducing a new `getRawSectionLabel` helper. Reason: keeps the change in-place, avoids new public surface in `App`, and the existing `getSectionLabel` semantics (returns customLabel if non-empty, else `t(defaultI18nKey)`) make this a single-line predicate."
  - "D2 (locked): Restore the placeholder from `data-i18n-placeholder` when the section is NOT customised. The plan spec said 'leave the placeholder alone', but `applyTranslations()` does NOT run on `app:settings-changed` (only `applySectionLabels()` does, per add-session.js:805-808). Without an explicit restore, a rename → un-rename sequence leaves the placeholder stuck at the previous custom value. Restoring via `App.t(phKey)` is functionally equivalent to what `applyTranslations` would do."
  - "D3 (locked): Selector `wrapper.querySelectorAll('input, textarea')` — broader than the strict 'has data-i18n-placeholder' filter, because some inputs may have been initialised by JS with a plain `placeholder` attribute. The `phKey` check inside the loop short-circuits the restore branch when no key exists, so non-i18n-driven placeholders are not touched in the default (non-custom) case. In the custom-label case the override is unconditional — which matches the UAT intent (the placeholder must reflect the renamed section)."
  - "D4 (locked): Heart-shield accordion-header sync (the existing post-loop branch at the end of `applySectionLabels`) was NOT modified — it has no descendant input/textarea, so there is no placeholder to update. Per scope discipline, we did not refactor it."
metrics:
  duration_minutes: 10
  completed_date: 2026-05-11
  task_count: 1
  file_count: 1   # excluding sw.js auto-bump
  commit_count: 2 # fix + this SUMMARY
---

# Phase 22 Plan 14.3: Renamed-Section Placeholders Summary

**One-liner:** When a therapist renames a session section in Settings, `applySectionLabels()` now propagates the rename to descendant `<input>` / `<textarea>` placeholders on `add-session.html`, and restores the i18n default placeholder when the customisation is removed.

## What Changed

A single function — `applySectionLabels()` in `assets/add-session.js` — was extended in-place. The original implementation walked every `[data-section-key]` wrapper and rewrote `.label[data-i18n]` `textContent` via `App.getSectionLabel(key, defaultI18nKey)`. It did NOT touch placeholder attributes, so renamed sections showed the new label above a stale placeholder.

The fix appends ~18 net lines inside the existing loop body:

1. Capture `resolvedLabel = App.getSectionLabel(sectionKey, defaultI18nKey)` once (single getter call).
2. Detect `isCustom = resolvedLabel !== App.t(defaultI18nKey)`.
3. For each descendant `<input>` / `<textarea>`:
   - If `isCustom` → `field.placeholder = resolvedLabel`.
   - Else if a `data-i18n-placeholder` key exists → `field.placeholder = App.t(phKey)`.
   - Else → leave the placeholder untouched.

The change is fully contained within `applySectionLabels()`. No new function. No public-surface change to `window.App`. No i18n locale modifications. No DOM changes.

## Verification

- `grep -nE 'placeholder' assets/add-session.js` confirms 5 new `placeholder` references inside the function body (lines 792, 794, 795, 797, 801, 803, 805 — all within `applySectionLabels()` body lines 781-815).
- `git diff --stat` shows `assets/add-session.js | 20 +++++++++++++++++++-` (19 insertions, 1 deletion) → 18 net lines, well under the 30-line constraint.
- Visual-flow guarantee (no manual test run in this autonomous wave — left for Ben's next UAT pass):
  - Default state: `App.getSectionLabel` returns `App.t(defaultI18nKey)` → `isCustom = false` → placeholder resolved via `App.t(phKey)` from `data-i18n-placeholder`. Same value as a fresh `applyTranslations()` pass would produce. No regression.
  - Custom state: `App.getSectionLabel` returns the therapist's custom label → `isCustom = true` → placeholder reflects the rename.
  - Un-rename state: customLabel cleared in Settings → on next `app:settings-changed`, `isCustom` flips back to `false` → placeholder restored from `data-i18n-placeholder` key. No stuck state.
- Service worker cache bumped automatically by pre-commit hook: `sessions-garden-v80 → v81`. Clients will pick up the JS change on next reload.

## Deviations from Plan

### Auto-fixed Issues

None.

### Spec interpretation note (not a deviation)

The plan said "If there is NO custom label (default state), leave the placeholder alone — it should fall back to whatever `data-i18n-placeholder` originally pointed at." The literal reading is "do not write to `.placeholder`". The functional reading is "ensure the placeholder shows the i18n default".

In practice, `app:settings-changed` on `add-session.html` does NOT call `applyTranslations()` (see line 805-808: only `applySectionVisibility` + `applySectionLabels`). So if a therapist customises a section, then resets it back to default in another tab, the broadcast-channel-driven `app:settings-changed` would NOT restore the i18n placeholder — the previous custom value would stay stuck until the user reloads or changes language. Therefore the implementation does write to `.placeholder` in the non-custom branch, restoring it from `App.t(data-i18n-placeholder-key)`. This is functionally consistent with the spec's intent and required for the rename → un-rename UX flow to work correctly.

If a stricter "leave alone" semantics is later preferred, the `else if (phKey)` branch can be deleted (4 lines) without affecting the primary rename-propagation behaviour.

## Known Stubs

None.

## Self-Check

- `assets/add-session.js` modified — committed in `4f75f95`.
- SUMMARY file present at the path documented in `<commits_expected>`.
- Hard verification gate (grep for `placeholder` inside `applySectionLabels`) returns 7 matches — non-empty as required.

## Self-Check: PASSED
