---
phase: 47-session-section-reordering
plan: 12
subsystem: settings-reorder-ui
tags: [settings, reorder, drag, pointer, webkit, safari, rtl, css, gap-closure]
status: complete
gap_closure: true
requires:
  - App.sanitizeOrder shared clamp (47-01)
  - wireDrag / enforceOrderClamp / markReorderDirty reorder handler (47-03)
  - .settings-saved-notice-mark checkmark glyph (Phase 22)
provides:
  - "Safari-desktop-operable pointer drag: document-level listeners, selectstart suppression, slop threshold, unconditional highlight cleanup on up/cancel/lostpointercapture"
  - "RTL-upright settings-saved checkmark (physical geometry)"
  - "jsdom guards: cancel/lost-capture cleanup + pointer-drag-through-shared-clamp"
affects:
  - assets/settings.js
  - assets/app.css
  - tests/47-settings-reorder.test.js
tech-stack:
  added: []
  patterns:
    - "document-level pointermove/up/cancel listeners (not handle-bound) so WebKit capture-routing loss cannot drop the gesture"
    - "selectstart suppression during a drag so native text-selection cannot steal the gesture over editable rows"
    - "movement slop threshold before engaging a reorder"
    - "idempotent cleanup() run on every drag end path (pointerup, pointercancel, lostpointercapture)"
    - "semantic glyph drawn with PHYSICAL geometry so RTL never mirrors it"
key-files:
  created: []
  modified:
    - assets/settings.js
    - assets/app.css
    - tests/47-settings-reorder.test.js
decisions:
  - "G1 root cause = WebKit does not reliably route handle-bound pointermove/up under mouse capture, and a drag drifting over the editable rows triggers a native text selection that WebKit prioritises (firing pointercancel/lostpointercapture); both starve the handle listeners so rows don't move and the pointerdown-added highlight stays stuck"
  - "Fix keeps setPointerCapture best-effort but no longer depends on it: listeners move to document; selectstart is suppressed; a 4px slop gates repositioning; cleanup is unconditional across all three end paths"
  - "G2 = the checkmark used logical properties (inset-inline-start/border-inline-end) that mirror under RTL; a checkmark is a semantic glyph, so it is redrawn with physical geometry (left/top + border-bottom/right) — never a wrong-facing chevron"
metrics:
  duration: ~40min
  completed: 2026-07-23
  tasks: 2
  files: 3
---

# Phase 47 Plan 12: Safari Pointer-Drag + RTL Checkmark Gap-Closure Summary

Closed G1 (critical) and G2 (minor) from 47-UAT.md, both on the Settings reorder
surface. The pointer drag now survives WebKit's capture-routing quirks and never
leaves a stuck highlight; the settings-saved checkmark stays upright in RTL.

## What Was Built

**Task 1 — G1: harden the Safari pointer drag + unconditional highlight cleanup
(`assets/settings.js`, `tests/47-settings-reorder.test.js`)**

Confirmed root cause (diagnosis before fix, as mandated): the old `wireDrag` bound
`pointermove`/`pointerup` **on the handle** and relied on `setPointerCapture` to
route those events there. On WebKit desktop a mouse pointer capture does not
reliably redirect `pointermove` to the capturing element the way Chromium does, and
— decisively — a drag that drifts over the editable rows starts a **native text
selection**, which WebKit prioritises: it steals the gesture (firing `pointercancel`
/ `lostpointercapture`) so the handle-bound `pointermove`/`pointerup` never arrive.
Result matched Ben's report exactly: rows won't move (the ~1/10 success being the
rare gesture where selection didn't engage), and because `.dragging` was removed
**only in `onUp`**, the highlight stayed stuck when Safari cancelled instead. This
is candidate classes (a) capture-routing + (c) text-selection theft + (d)
cleanup-only-on-the-unfired-path, acting together.

The fix (based on that diagnosis):
- Move `pointermove`/`pointerup`/`pointercancel` listeners to **`document`** — they
  receive the events regardless of capture routing. `setPointerCapture` stays
  best-effort but the gesture no longer depends on it.
- Suppress `selectstart` for the duration of the drag so native text selection can
  no longer steal the gesture over the editable rows.
- Engage repositioning only past a small **4px slop threshold** (covers the
  never-moving-capture case and avoids reordering on a plain click).
- A single idempotent `cleanup()` (guarded by a `done` flag; detaches
  `lostpointercapture` before releasing capture to avoid re-entry) removes
  `.dragging` and releases the pointer capture, and it runs on **pointerup AND
  pointercancel AND lostpointercapture** — no release path can leave the highlight
  stuck. `pointerId` guards keep it to the active pointer.
- Both input paths preserved: arrows remain the accessible fallback, and both drag
  and arrows still funnel every move through `enforceOrderClamp` → `markReorderDirty`
  → the shared `App.sanitizeOrder` on Save. Within-group vs top-level rules, the
  end-stop clamp, and the Save-time sentinel persist are untouched.

Two new falsifiable jsdom guards (suite now 6/6):
- **cancel/lost-capture cleanup:** dispatch `pointerdown` then `pointercancel`
  (and separately `lostpointercapture`) on a handle; assert the row drops
  `.dragging` and capture is released via spied `setPointerCapture`/
  `releasePointerCapture`. A cleanup-only-in-onUp regression fails here.
- **pointer-drag-through-clamp:** drive a real `pointerdown`→`pointermove`(up past
  issues)→`pointerup` on the afterSeverity handle; assert it sets the form dirty,
  releases capture, and Save still persists `issues` before `afterSeverity`.

**Task 2 — G2: RTL-correct the settings-saved checkmark (`assets/app.css`)**

Confirmed the mirrored glyph is a CSS logical-property flip, not a wrong asset:
`.settings-saved-notice-mark::after` drew the check from `inset-inline-start` +
`border-block-end` + `border-inline-end`, all of which mirror under `[dir=rtl]`, so
the corner flipped and the mark read as a wrong-facing chevron. A checkmark is a
**semantic** glyph (like the app's bold/italic/eye/pencil — which stay upright;
only directional glyphs flip via `.icon-flip`), so it must not mirror. Redrawn with
**physical geometry** — `left`/`top` + `border-bottom`/`border-right` — so RTL never
mirrors it. Circle background, success tokens (light + dark), size, and the
reduced-motion block are unchanged.

## Deviations from Plan

None — plan executed as written. Diagnosis-before-fix was followed for G1 and the
confirmed root cause is recorded above.

## Verification

- `node --check assets/settings.js` — OK.
- `node tests/47-settings-reorder.test.js` — **6/6 pass** (4 existing + 2 new
  highlight-cleanup / drag-through-clamp guards).
- `node tests/30-settings-section-roundtrip.test.js` — **3/3 pass** (flat fallback /
  rename round-trip intact).
- `npm test` full suite — **218 passed, 0 failed**.
- `.settings-saved-notice-mark::after` present, physical geometry, zero logical
  properties (grep-asserted).
- Comment hygiene: no planning tokens in the settings.js / app.css / test diffs.

## Manual verification still required (jsdom-blind — MANUAL GATES for Ben's preprod retest)

jsdom proves the highlight-cleanup contract and the drag-through-clamp routing, but
it cannot prove WebKit drag operability (no layout, no real pointer capture) nor
computed RTL glyph geometry. These stay explicit manual gates:

1. **G1 — Safari desktop (real WebKit, Hebrew UI):** Settings → Fields, drag a row
   by its handle — the row follows the pointer and drops into the new position
   **reliably across repeated attempts** (the ~1/10 failure must be gone); on release
   **no row keeps a highlighted background**; the up/down arrows still reorder; Save
   persists the order (reopen confirms). Repeat one drag in RTL to confirm the
   physical-coordinate insertion still mirrors correctly.
2. **G2 — Hebrew (RTL) UI:** trigger the settings-saved notice ("ההגדרות נשמרו") and
   confirm the glyph reads as a **correct-direction checkmark**, not a mirrored
   chevron; re-check LTR (EN/DE) still shows a correct checkmark; verify in dark mode.

## Known Stubs

None.

## Threat Flags

None. Both registered threats stay mitigated: every drag/arrow move still funnels
through `App.sanitizeOrder` before staging/persist (T-4712-01), and the unconditional
cleanup on all three end paths removes the wedged-drag denial-of-service surface
(T-4712-02) rather than adding one.

## Commits

- `13bf9b5` — fix(47-12): harden Safari pointer drag + unconditional highlight cleanup
- `07d6eee` — fix(47-12): keep the settings-saved checkmark upright in RTL
- (docs) — this SUMMARY + STATE/ROADMAP updates

## Self-Check: PASSED

- Modified files present: assets/settings.js, assets/app.css,
  tests/47-settings-reorder.test.js, 47-12-SUMMARY.md.
- Commits 13bf9b5 and 07d6eee present in git log.
