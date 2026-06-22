---
phase: 24-pre-launch-final-cleanup
plan: 03
status: complete
completed: 2026-05-14
---

# Plan 24-03 Summary — Cancel/Revert + clock-icon "Edit"→"View" rename

## Outcome

- **Item 2 (Cancel/Revert):** Edit-session form now has a Cancel button in the `.inline-actions` row alongside Save / Delete / Back-to-Overview. Dirty-state-aware: silent revert on clean form, confirm dialog ("Discard changes?") on dirty form. Revert restores the last-saved snapshot in place and returns to read mode — no navigation, no reload.
- **Item 2 companion (D-07):** Overview clock-icon expansion button renamed from "Edit" to "View" with pencil icon. All 4 locales updated.
- **D-05 Hebrew lockdown:** All new Hebrew strings use noun/infinitive forms — verified in-file.

## Changes

| File | Change | Approx LOC |
|------|--------|------------|
| `add-session.html` | Added `#cancelSessionBtn` between save and delete in `.inline-actions` (line 353-356). `.ghost icon-swap is-hidden` classes. Label data-i18n="confirm.cancel"; icon `✕`. | +4 |
| `assets/add-session.js` | Added `cancelButton` reference at line ~34. Added `lastSavedSnapshot = null` module-state at line ~44. Added `snapshotFormState()`, `revertSessionForm()`, `updateCancelButtonLabel()` helpers (45 LOC) after `getIssuesPayload`. Extended `setReadMode()` to toggle cancel button visibility (visible only when in edit mode AND editing existing session). Wired input/change listeners to refresh label. Wired app:language listener to re-translate. Wired Cancel click handler with `App.confirmDialog` on dirty, silent revert + `setReadMode(true)` on clean. Snapshot capture after initial populateSession in editing-existing branch via `Promise.resolve().then(...)` to defer past DOM mutation. | +90 |
| `assets/overview.js` | Replaced `editButton.textContent = App.t("overview.table.edit")` with `editButton.innerHTML = '<span class="button-label" data-i18n="overview.table.view">' + App.t("overview.table.view") + '</span><span class="button-icon" aria-hidden="true">&#9998;</span>'`. Old `overview.table.edit` key preserved (still referenced for other contexts). | ±1 |
| `assets/i18n-en.js` | Added 6 keys: `overview.table.view`, `session.discard`, `confirm.discard.title`, `confirm.discard.body`, `confirm.discard.yes`, `confirm.discard.no`. | +6 |
| `assets/i18n-he.js` | Added 6 keys with **D-05 noun/infinitive Hebrew**: `הצגה`, `ביטול השינויים`, `ביטול השינויים?`, `השינויים שלא נשמרו יאבדו.`, `כן, לבטל`, `המשך עריכה`. | +6 |
| `assets/i18n-de.js` | Added 6 German keys: `Anzeigen`, `Änderungen verwerfen`, `Änderungen verwerfen?`, `Ihre nicht gespeicherten Änderungen gehen verloren.`, `Ja, verwerfen`, `Weiter bearbeiten`. | +6 |
| `assets/i18n-cs.js` | Added 6 Czech keys: `Zobrazit`, `Zahodit změny`, `Zahodit změny?`, `Vaše neuložené změny budou ztraceny.`, `Ano, zahodit`, `Pokračovat`. | +6 |
| `assets/app.css` | No new styles — reused `.button.ghost.icon-swap` from existing Phase 21 button system. | 0 |

## Snapshot capture sites (1 site, plan estimated 3)

| Site | Trigger | Notes |
|------|---------|-------|
| `add-session.js:1670` | After `populateSession(editingSession, ...)` during initial load of an existing session | `Promise.resolve().then(...)` defers the snapshot read past `populateSession`'s dynamic issue-row insertion. Sets `formDirty = false` because populateSession's value writes trigger 'input' events. |

**Plan estimated 3 sites** (initial load + post-save + new-session-init). Adjustments made:
- **Post-save not needed:** existing save handler navigates away (`window.location.href = "./index.html"` at line ~1617-1618), not stay-in-place. No snapshot needed.
- **New-session-init not needed:** Cancel button is hidden when `editingSession` is null (per `setReadMode` visibility guard), so revert flow is unreachable for new sessions.

## Hebrew D-05 lockdown verification

Pasted from `assets/i18n-he.js`:

```
"overview.table.view": "הצגה",
"session.discard": "ביטול השינויים",
"confirm.discard.title": "ביטול השינויים?",
"confirm.discard.body": "השינויים שלא נשמרו יאבדו.",
"confirm.discard.yes": "כן, לבטל",
"confirm.discard.no": "המשך עריכה",
```

All 6 use noun/infinitive forms. NO imperative (`בטל`, `הצג`, `המשיך`, `שמור`, etc.) for any new key in this plan.

**Pre-existing imperative Hebrew strings noted but NOT modified in this plan:**
- `session.form.delete` value is `"מחק מפגש"` (imperative `מחק`). This violates D-05 but is pre-existing (not added in Phase 24). Could be cleaned up in a future polish pass.

## Acceptance gates

| Gate | Result |
|------|--------|
| `add-session.html` has exactly one `id="cancelSessionBtn"` | ✓ |
| `function snapshotFormState` defined | ✓ |
| `function revertSessionForm` defined | ✓ |
| `lastSavedSnapshot` module variable | ✓ |
| `cancelButton.addEventListener` wired | ✓ |
| `App.confirmDialog` referenced with `confirm.discard.title` | ✓ |
| `assets/overview.js` uses `App.t("overview.table.view")` | ✓ |
| All 4 i18n files × 6 keys = 24 key-locale pairs | 24/24 present ✓ |
| Hebrew D-05 lockdown for 4 critical strings | 4/4 match expected ✓ |
| German `Anzeigen`, Czech `Zobrazit` | ✓ |
| `node -c` syntax check on all 6 touched JS files | All pass ✓ |

## Threat-model spot checks

- **T-24-03-01 (data loss):** Confirm dialog on dirty state. Clean form silent revert is safe — no edits to discard. ✓
- **T-24-03-02 (dirty-state SSOT):** Reuses existing `window.PortfolioFormDirty` predicate. No new attack surface. ✓
- **T-24-03-03 (XSS in i18n strings):** All 6 new values are static literals in `i18n-*.js`. The one `innerHTML` use in overview.js composes a literal HTML template + `App.t("overview.table.view")` — output is a static i18n value, not user input. Verified safe. ✓
- **T-24-03-04 (snapshot perf):** Snapshot reads ~14 fields, all O(1) DOM lookups + one map over `issues` array (typical n < 4). Sub-millisecond. ✓
- **T-24-03-05 (empty snapshot):** Cancel button hidden when `editingSession` is null — empty-snapshot revert path is unreachable. ✓

## Regression checklist (for Ben UAT)

**Clean form path:**
- [ ] Load an existing session → click pencil to enter edit mode → DO NOT edit anything → click Cancel → form returns to read mode silently, no dialog, no data change.
- [ ] In edit mode with no edits, Cancel button reads "Cancel" (the existing `confirm.cancel` value, e.g. `ביטול` / `Abbrechen` / `Zrušit` / `Cancel`).

**Dirty form path:**
- [ ] Edit one textarea character → Cancel button label changes to "Discard changes" / `ביטול השינויים` / `Änderungen verwerfen` / `Zahodit změny`.
- [ ] Click Cancel → confirm modal appears with title "Discard changes?" — Yes button is `כן, לבטל` / `Ja, verwerfen` / `Ano, zahodit`, No button is `המשך עריכה` / `Weiter bearbeiten` / `Pokračovat`.
- [ ] Click "Keep editing" → modal closes, edits remain, form stays in edit mode.
- [ ] Click Cancel again → confirm → click "Yes, discard" → form reverts, returns to read mode.

**Issue revert:**
- [ ] In edit mode, add a new issue row → Cancel → confirm discard → added row is removed.
- [ ] Edit existing issue severity → Cancel → confirm discard → severity reverts.

**Spotlight sync (Plan 01 + Plan 03 integration):**
- [ ] In edit mode, change `clientSelect` → Cancel → confirm discard → spotlight reverts to originally-loaded client via `populateSpotlight` (called inside `populateSession` inside `revertSessionForm`).

**Mode transitions:**
- [ ] In read mode, Cancel button is hidden (only pencil edit is visible). Save and Delete also hidden.
- [ ] In edit mode for NEW session (no `?sessionId=` param), Cancel button is hidden (no snapshot to revert to).

**Clock-icon rename (D-07):**
- [ ] Overview → clock-icon expansion → button reads "View" / `הצגה` / `Anzeigen` / `Zobrazit` (not "Edit").
- [ ] Button has pencil icon (✎) inline.
- [ ] Click → still opens session in read mode (no behavior change, only label).

**Regressions:**
- [ ] Save still saves session.
- [ ] Delete still confirms-and-deletes.
- [ ] Back-to-Overview still triggers `App.installNavGuard` on dirty form.
- [ ] Pencil edit button still enters edit mode.

## Hand-off notes

- Plan 06 (pre-session context card) will modify `assets/add-session.js` further. Plan 03's changes are localized to the action row + form-revert lifecycle — no overlap with Plan 06's spotlight-section extension.
- Plan 04 (snippet engine) will add `data-snippets="true"` to 7 textareas — this is orthogonal to Cancel/Revert (snapshots capture textarea VALUES, not their data-* attributes).
- The pre-existing imperative `מחק מפגש` for `session.form.delete` should be considered for a polish cleanup (change to `מחיקת מפגש` per D-05). Not in scope for Phase 24.
