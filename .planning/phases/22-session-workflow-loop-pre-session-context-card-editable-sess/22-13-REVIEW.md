---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 22-13
reviewed: 2026-05-11T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - assets/settings.js
  - assets/app.css
  - assets/i18n-en.js
  - assets/i18n-de.js
  - assets/i18n-he.js
  - assets/i18n-cs.js
  - sw.js
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Plan 22-13: Code Review Report

**Reviewed:** 2026-05-11
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

This plan closes two UAT gaps: Gap N5 (success-pill regression — pill not re-appearing after second save) and Gap N4 (Revert button not self-explanatory). The core pill state-machine fix is sound and the race condition analysis is correct. The i18n additions are complete across all four locales, use correct encoding conventions, and use `textContent` throughout. The sw.js version bump (v66→v67→v68 across two commits) is correct.

Two warnings were found: one is a deviation from the plan's specified implementation pattern for `cancelLeave()` that leaves a stale timer handle; the other is a WCAG 2.5.3 accessibility issue with the `aria-label` not containing the visible label text. Both are real defects, not nit-picks. One informational note on redundant ARIA is also recorded, though it is pre-existing.

---

## Warnings

### WR-01: `cancelLeave()` does not null-out `noticeLeaveTimeoutId` after `clearTimeout` — stale handle, plan spec deviation

**File:** `assets/settings.js:354`

**Issue:** The plan's Step D explicitly requires that both timeouts be cleared using the pattern `if (id) { clearTimeout(id); id = null; }`. The implementation for `noticeTimeoutId` follows this pattern exactly (lines 350–352), but the `noticeLeaveTimeoutId` clear at line 354 only calls `clearTimeout(noticeLeaveTimeoutId)` without subsequently setting `noticeLeaveTimeoutId = null`.

Consequence: After `cancelLeave()` returns, `noticeLeaveTimeoutId` still holds a stale integer timer ID (the timer has been cancelled but the variable was not nulled). This is benign in the common case because `clearTimeout` on a stale ID is a safe no-op. However:

1. It violates the plan's explicit acceptance criterion: *"Both use the standard `if (id) { clearTimeout(id); id = null; }` pattern"* (plan Step D).
2. It causes inconsistency within the same function body, making the intent harder to read and verify.
3. It means the reference count of five `noticeLeaveTimeoutId` occurrences in the file satisfies the plan's grep count, but the null-assign **inside `cancelLeave`** that the plan counted as occurrence #4 is missing. The current occurrence #4 is only a `clearTimeout` call, not a null-assign. The plan's own verification criterion (`grep -c 'noticeLeaveTimeoutId' assets/settings.js` returning 5) passes numerically, but the semantic requirement (null-out in cancelLeave) does not.

**Fix:**
```javascript
function cancelLeave() {
  if (noticeTimeoutId) {
    clearTimeout(noticeTimeoutId);
    noticeTimeoutId = null;
  }
  // Add the null-assign to match the same clear-and-null pattern used above,
  // and to satisfy the plan spec (Step D) and reference-count semantics.
  if (noticeLeaveTimeoutId) {
    clearTimeout(noticeLeaveTimeoutId);
    noticeLeaveTimeoutId = null;
  }
}
```

---

### WR-02: WCAG 2.5.3 violation — `aria-label` does not contain the visible "Revert" text

**File:** `assets/settings.js:206`

**Issue:** Each reset button is constructed with:
- `aria-label` = `App.t("settings.reset.tooltip")` → "Reset to default name" (EN)
- Visible span text = `App.t("settings.row.revert.label")` → "Revert" (EN)

When a button has both an `aria-label` and visible text content, the `aria-label` completely overrides the visible text for assistive technology. WCAG 2.5.3 (Label in Name, Level AA) requires that when a UI component has a visible text label, the accessible name must **contain** that visible text. "Reset to default name" does not contain "Revert", and none of the translations are substrings of their respective `settings.reset.tooltip` values in any locale. This creates a discrepancy: a speech-input user who says "click Revert" will not activate the button (because the accessible name is "Reset to default name"), and a screen reader user hears a different label than what is visually displayed.

The plan acknowledges this in Risk 6 ("screen readers prefer visible content") and states it is intentional. However, choosing the longer tooltip as the accessible name over the visible text is not a WCAG 2.5.3-compliant pattern — the specification requires the accessible name to **include** the visible text, not merely co-exist with it.

**Fix (option A — minimal, WCAG-compliant):** Prepend the visible label to the accessible name so it contains the visible text:
```javascript
// e.g. EN: "Revert — Reset to default name"
var revertLabel = window.App && App.t ? App.t("settings.row.revert.label") : "Revert";
var resetTip = window.App && App.t ? App.t("settings.reset.tooltip") : "Reset to default name";
resetBtn.setAttribute("aria-label", revertLabel + " — " + resetTip);
resetBtn.title = resetTip;
```

**Fix (option B — simpler):** Drop `aria-label` entirely and rely on the visible span text plus the SVG's `aria-hidden="true"`. The visible text "Revert" becomes the button's accessible name, which is discoverable, honest, and WCAG-compliant. The `title` attribute retains the longer tooltip for sighted desktop hover. This is the standard accessible interactive icon+text button pattern.

---

## Info

### IN-01: Pre-existing — redundant `role="status"` and `aria-live="polite"` on pill element

**File:** `assets/settings.html:79–80`

**Issue:** The success-pill element has both `role="status"` and `aria-live="polite"`. The `status` role implicitly carries `aria-live="polite"`, so the explicit `aria-live` attribute is redundant. This is harmless (browsers merge them as polite) but is unnecessary noise. This is pre-existing and was not introduced by 22-13.

**Fix:** Remove the redundant `aria-live="polite"` attribute, keeping only `role="status"`. No behaviour change.

---

_Reviewed: 2026-05-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
