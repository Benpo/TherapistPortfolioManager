---
phase: 40-first-run-welcome-onboarding-coordinator
fixed_at: 2026-07-08T12:05:00Z
review_path: .planning/phases/40-first-run-welcome-onboarding-coordinator/40-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 40: Code Review Fix Report

**Fixed at:** 2026-07-08T12:05:00Z
**Source review:** .planning/phases/40-first-run-welcome-onboarding-coordinator/40-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (fix_scope = critical_warning; the 4 Info findings are out of scope)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: iPadOS Safari receives incorrect macOS "Add to Dock" install copy

**Files modified:** `assets/attention-coordinator.js`
**Commit:** b46c1d2
**Applied fix:** `isMacSafari()` now also requires `navigator.maxTouchPoints <= 1`.
iPadOS 13+ Safari in desktop mode reports a `Macintosh` UA but exposes
`maxTouchPoints > 1` (real Macs, trackpads included, report 0), so iPads no
longer pass the macOS-Safari branch of `installEligible()` and the one-shot
nudge is never burned on wrong "File → Add to Dock" copy. Comment updated to
document the iPadOS tell. Verified with a jsdom probe: Macintosh UA +
`maxTouchPoints: 5` → ineligible; Macintosh UA + `maxTouchPoints: 0` → still
eligible. Note: an iPad now sees neither surface this session (it is not
phone-class either) — the slot simply passes on, which is the review's
recommended primary fix; widening `isPhoneClass()` for large touch devices was
the review's optional alternative and was not taken.

### WR-02: Welcome overlay declares `aria-modal="true"` but never moves focus into the dialog or traps it

**Files modified:** `assets/attention-coordinator.js`
**Commit:** b644428
**Applied fix:** `showWelcome()` now honors the aria-modal focus contract,
mirroring the `confirmDialog()` pattern in `app.js`:
- On mount: captures `document.activeElement` as the opener, then focuses the
  primary CTA after appending the overlay.
- Focus trap: `onKeydown` wraps Tab/Shift+Tab between the primary and
  secondary CTAs, and pulls focus back into the dialog if it somehow lands
  outside the overlay.
- On dismiss: restores focus to the opener (guarded try/catch, safe when the
  opener is gone). Runs on all dismiss paths (Esc, secondary CTA, primary CTA
  before its href navigation).

Verified with a 6-assertion jsdom probe (mount focus, Tab wrap both
directions, escape recovery, opener restore on Esc, replay writes no keys).

## Verification

- `node -c assets/attention-coordinator.js` — syntax clean after each fix.
- Full Phase 40 suite + Phase 39 regression after each fix and again on
  `main` post-merge: all 8 test files pass
  (40-app-wiring, 40-coordinator, 40-i18n-parity, 40-install-nudge,
  40-ios-banner-removed, 40-precache, 40-welcome-overlay, 39-help-entry).
- Ad-hoc jsdom behavior probes for both fixes (described above) passed.
- Real-device sanity (actual iPad Safari, actual screen reader) remains a
  human UAT item — jsdom can only simulate the UA/maxTouchPoints signals.

## Skipped Issues

None in scope. IN-01 through IN-04 were not attempted (fix_scope =
critical_warning excludes Info findings).

---

_Fixed: 2026-07-08T12:05:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
