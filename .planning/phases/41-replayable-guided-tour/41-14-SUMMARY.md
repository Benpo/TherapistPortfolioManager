---
phase: 41-replayable-guided-tour
plan: 14
subsystem: help-onboarding
tags: [guided-tour, webkit-geometry, tdd, i18n, uat-gap-closure, round-2]
requires:
  - "41-08 (physical-coordinate positioning + WebKit RTL/geometry probe)"
  - "41-09 (v3 storyline route + data-tour anchors)"
  - "41-10 (save-step glyph the fake SVG this plan replaces)"
  - "41-11 (tour-copy parity gate + HE/DE/CS drafts)"
provides:
  - "Tall-anchor step box always inside the viewport (scroll-to-anchor-top + tooltip clamp)"
  - "Save step points at the app's REAL export icon (📤 U+1F4E4) via textContent"
  - "Help-center-first finish copy with a breadth tease (EN + HE/DE/CS drafts)"
  - "textContent-only tour engine (zero innerHTML/raw-markup left)"
  - "WebKit probe section [6] — tall-anchor box-in-viewport falsifiable gate"
affects:
  - tests/webkit/41-rtl-geometry.mjs
  - assets/tour.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
tech-stack:
  added: []
  patterns:
    - "RED-first WebKit box-in-viewport assertion on a synthetic taller-than-viewport anchor in a short (600px) context"
    - "Tall-anchor scroll heuristic (height >= 0.7*innerHeight → block:'start') + universal tooltip viewport clamp"
    - "Real UI glyph injected as textContent (not raw markup) to remove the innerHTML trust-boundary surface"
    - "CS locale keeps \\u-escaped values (Edit tool auto-escapes to convention); runtime decode verified via vm"
key-files:
  created: []
  modified:
    - tests/webkit/41-rtl-geometry.mjs
    - assets/tour.js
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "R2-1 solved by scroll-to-anchor-top + tooltip clamp; the big whole-panel spotlight is KEPT (no ring shrink)"
  - "D-07 upheld — overlay stays a single inert click-blocker; no interactivity, no click-to-advance (R2-2/R2-3 rejected)"
  - "Save glyph is the real 📤 (U+1F4E4) matching #exportSessionBtn, injected as textContent — engine is now innerHTML-free"
  - "No tour.css change needed — the JS clamp alone satisfies the box-in-viewport invariant for the short real tooltips"
  - "EN copy is PROVISIONAL (Ben-approved verbatim from the plan); HE/DE/CS are machine-draft for the Phase 42.1 native pass"
metrics:
  duration: ~7m
  completed: 2026-07-09
  tasks: 3
  files_changed: 6
status: complete
---

# Phase 41 Plan 14: Round-2 replay gap-closure (tall-panel box visibility, real export icon, Help-first finish) Summary

Closed the three CONFIRMED Round-2 replay gaps on the shipped v3 tour while upholding the locked non-interactive model: on tall settings panels the step box now stays fully on screen (scroll the anchor's TOP into view + clamp the tooltip into the viewport), the save step points at the app's real 📤 export icon in plain words, and the finish step leads with the Help center plus a breadth tease. The rejected interactive-tour ideas (R2-2/R2-3) were NOT built — D-07 stands, the overlay remains a single inert click-blocker, and the big whole-panel spotlight is untouched.

## What shipped

### Task 1 — RED (commit cd77384)
Added section **[6]** to `tests/webkit/41-rtl-geometry.mjs`: in a short (1280×600) WebKit context it mounts a deliberately taller-than-viewport anchor (2200px) + a synthetic step and drives the REAL `renderSpotlight`/`positionSpotlight` path at it, then asserts the step box (tooltip) is fully inside the viewport. RED against the current center-scroll engine — the box landed at `top=-1087, bottom=-807` (entirely above the viewport); sections [1]–[5] (spotlight branch, RTL physical side, 4-language re-render, off-center post-settle) all still passed. Kept out of `tests/run-all.js` discovery (stays under `tests/webkit/`).

### Task 2 — GREEN (commit 4d754d6)
`assets/tour.js`:
- **`renderSpotlight`** — tall-anchor scroll heuristic: an anchor whose height `>= 0.7 * innerHeight` scrolls `block:'start'` (top into view, Ben's "always scrolled all the way up") instead of `block:'center'`; short anchors still center.
- **`positionSpotlight`** — added a vertical viewport CLAMP on the tooltip's physical `top` (12px margin), applied on every render and on the one-rAF post-scroll re-measure and reflow, so the step-count box is always visible. The horizontal axis was already clamped.
- Spotlight ring untouched (big whole-panel highlight kept); overlay unchanged (single inert layer). **No tour.css change was needed** — the JS clamp alone passes the invariant for the short real tooltips.

Result: WebKit probe GREEN (exit 0); `tests/run-all.js` 153/153.

### Task 3 — real icon + copy (commit d714fef)
`assets/tour.js`:
- Save-step glyph: replaced the generic monochrome upload SVG (`innerHTML`) with the app's REAL export icon **📤 (U+1F4E4)** — the same code point `add-session.html #exportSessionBtn` renders (`&#128228;`) — injected as `textContent`. The engine now has **zero innerHTML/raw-markup** anywhere; the trust-boundary header comment (T-41-01) was updated to match.

`assets/i18n-en.js` (provisional, Ben-approved verbatim):
- `help.tour.step.save.body` — names the Export button in plain words; the false "this is its icon" deixis is gone.
- `help.tour.step.help.body` — Help-center-first + breadth tease (backups & their cadence, snippet library, Heart-Wall, export formats, and the Reporting tab), no longer Reporting-first.

`assets/i18n-{he,de,cs}.js` — machine-draft mirrors of both bodies (real Export/Reporting labels quoted per locale: ייצוא/דוחות, Exportieren/Statistiken, Exportovat/Přehledy), flagged for the Phase 42.1 native pass. No i18n KEY added or removed; every i18n value stays emoji-free (the 📤 is engine-injected).

Result: `tests/41-tour-i18n-parity.test.js` green (43 keys, parity + placeholders + no-emoji); `tests/run-all.js` 153/153; WebKit probe still GREEN.

## Verification

| Gate | Result |
|------|--------|
| WebKit probe RED before Task 2 | box `top=-1087` off-screen → exit 1 ✅ |
| WebKit probe GREEN after Task 2 | box fully in viewport → exit 0 ✅ |
| `tests/run-all.js` (jsdom suite) | 153 passed, 0 failed ✅ |
| `tests/41-tour-i18n-parity.test.js` | 4 passed, 0 failed (43 keys, no emoji) ✅ |
| Spotlight ring not shrunk | no `max-height` on `.sg-tour-spotlight` ✅ |
| Overlay stays inert | single `pointer-events:auto` layer, no new interactive hole ✅ |
| Engine innerHTML-free | no `innerHTML`/`<svg>` code remains in tour.js ✅ |

## RED→GREEN evidence

```
[6] Tall-anchor step box stays inside a short viewport (R2-1):
  PASS  probe anchor is genuinely taller than the viewport
  # BEFORE (center-scroll):  FAIL  box={"top":-1087,"bottom":-807, ...}   → exit 1
  # AFTER  (scroll-top+clamp): PASS  tall-anchor step box FULLY inside viewport → exit 0
```

## Deviations from Plan

None — plan executed as written. Two plan-anticipated non-actions:
- No test asserted the old save-step SVG/innerHTML shape, so no glyph-shape test needed updating (the plan allowed for one "if" it existed).
- `tour.css` (listed in Task 2's files) needed no edit; the plan scoped a CSS tweak as conditional ("only if the clamp needs a max-height/overflow tweak") and it did not.

## Notes / follow-ups

- EN copy is PROVISIONAL; Ben supplies final texts later (no planning needed). HE/DE/CS are machine-draft → Phase 42.1 native pass.
- Re-verification is the re-run of 41-13 (automated suite + WebKit probe), then Ben's EN replay; the Hebrew pass follows once EN is locked. Do NOT write 41-13-SUMMARY until the re-replay passes.

## Self-Check: PASSED
- Files verified present: 41-14-SUMMARY.md, tests/webkit/41-rtl-geometry.mjs, assets/tour.js
- Commits verified: cd77384 (RED), 4d754d6 (GREEN), d714fef (icon+copy)
</content>
</invoke>
