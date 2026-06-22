---
phase: 23
plan: 23-06
subsystem: pdf-export
type: hot-fix
tags: [bidi, rtl, jspdf, regression-test, verification-gap]
date: 2026-05-12
status: shipped
---

# Phase 23 Plan 23-06: RTL Anchor Fix Summary

**One-liner:** Hebrew body text was rendering off the right edge of the PDF because the RTL x-anchor (set in the pre-Phase-23 setR2L=true world) was not paired with `align: 'right'` after 23-02 removed setR2L; fix adds `align: 'right'` at all 3 RTL `doc.text` sites and adds the Hebrew regression fixture that should have caught it.

## Bug summary

Phase 23 was algorithmically correct — `tests/pdf-bidi.test.js` showed 12/12 vectors passing — but the placement layer was wrong for RTL text.

In the pre-Phase-23 world, `setR2L=true` told jsPDF to internally `.split('').reverse().join('')` the input string before drawing, which (combined with anchoring at `PAGE_W - MARGIN_X`) produced visually right-aligned text. Plan 23-02 correctly removed `setR2L` (because combining it with the bidi pre-shape would double-reverse). But the x-anchor logic at three sites in `drawTextLine` / `drawRunningHeader` / RTL list branch was left untouched. Without `setR2L`, jsPDF flows glyphs left-to-right from the x-coordinate; anchoring the leftmost-visual glyph at `PAGE_W - MARGIN_X` sent the rest of the line OFF the page to the right, leaving Hebrew sessions nearly empty visually.

Fix: pass `{ align: 'right' }` so jsPDF treats the x-coordinate as the END of the visual string, and the line occupies the page going leftward — correct for shaped RTL text.

## Sites changed in `assets/pdf-export.js`

| Site | Function | Before | After |
| --- | --- | --- | --- |
| 1 | `drawTextLine` (L456) | `var x = isRtl(line) ? (PAGE_W - MARGIN_X) : MARGIN_X; doc.text(visual, x, y);` | `if (isRtl(line)) { doc.text(visual, PAGE_W - MARGIN_X, y, { align: 'right' }); } else { doc.text(visual, MARGIN_X, y); }` |
| 2 | `drawRunningHeader` (L499) | Same shape (text-arg variant) | Same fix (text-arg variant) |
| 3 | List RTL branch (L557) — bullet line | `doc.text(visualA, rtlX, y);` | `doc.text(visualA, rtlX, y, { align: 'right' });` |
| 3 | List RTL branch (L557) — continuation | `doc.text(visualB, rtlX - 14, y);` | `doc.text(visualB, rtlX - 14, y, { align: 'right' });` |

LTR branches were not touched — Latin paths were already correct (this is what the en/de/cs fixtures had been silently confirming).

## Latin baseline drift status

**EN/DE/CS hashes UNCHANGED** after the fix. Snapshots taken before --regenerate compared byte-for-byte against the regenerated baselines and all 3 Latin diffs were empty. This confirms the fix was scoped strictly to the RTL branch as designed:

| Fixture | Pre-fix hash | Post-fix hash | Drift |
| --- | --- | --- | --- |
| fixture-en | `3963c08b8de7339a1ca2cf92e5189ea0e63a154e46481a3ff9f367c8a0df7b23` | `3963c08b8de7339a1ca2cf92e5189ea0e63a154e46481a3ff9f367c8a0df7b23` | none |
| fixture-de | `11ea9f8c7cac3b82ed84ce1eed7f0923cf3eeb06af0d4e7da82e3b90ddc47208` | `11ea9f8c7cac3b82ed84ce1eed7f0923cf3eeb06af0d4e7da82e3b90ddc47208` | none |
| fixture-cs | `1148f0c98375b99f04458f2831d94b66ba3a316b6d29af6e1b262c47440732d5` | `1148f0c98375b99f04458f2831d94b66ba3a316b6d29af6e1b262c47440732d5` | none |
| fixture-he | (none — new) | `db2d4f3112084b4bf5ca18056072ac1de3de1dae6301b3ef6b3d83eb72b52b29` | new baseline |

## New Hebrew fixture

`fixture-he.json` covers the RTL rendering path:
- Pure-Hebrew H1 heading + two H2 sub-headings
- Hebrew paragraph (multi-sentence, exercises wrapping)
- Hebrew list with 3 items (exercises bullet placement + continuation indent)
- Hebrew + Latin mix (the `"Atomic Habits"` book reference, exercises bidi at run boundary)
- Hebrew + ISO date (`2026-05-15`)
- Hebrew + parens (UAX-BD16 mirrors via `(body scan)` parenthetical)
- ~2 pages of content so running header + page break + footer pagination get exercised

Hash: `db2d4f3112084b4bf5ca18056072ac1de3de1dae6301b3ef6b3d83eb72b52b29`.

## Verification

| Gate | Expected | Actual |
| --- | --- | --- |
| `node -c assets/pdf-export.js` | exit 0 | passed |
| `grep -c "align: 'right'" assets/pdf-export.js` | ≥ 3 | 5 (4 sites + 1 in comment) |
| `grep -c "isRtl(line) ? (PAGE_W - MARGIN_X)" assets/pdf-export.js` | 0 | 0 |
| `grep -c "isRtl(text) ? (PAGE_W - MARGIN_X)" assets/pdf-export.js` | 0 | 0 |
| `grep -c "setR2L" assets/pdf-export.js` | 0 (Phase 23 invariant) | 0 |
| `grep -c "shapeForJsPdf" assets/pdf-export.js` | ≥ 7 | 14 |
| `grep -cE "MARGIN_X = 71\|MARGIN_TOP = 71\|MARGIN_BOTTOM = 71"` | ≥ 3 | 3 |
| `grep -c "var pageWidth = doc.internal.pageSize.getWidth"` | 1 | 1 |
| `node tests/pdf-bidi.test.js` | 12/12 PASS | 12/12 PASS |
| `node tests/pdf-latin-regression.test.js` | 4/4 PASS | 4/4 PASS |
| `grep -c "Phase 23" sw.js` | 0 | 0 |
| `grep -c "23-CONTEXT" sw.js` | 0 | 0 |
| `grep -c "sessions-garden-v" sw.js` | ≥ 1 | 1 (v87) |
| `node -c sw.js` | exit 0 | passed |
| EN/DE/CS hash drift | none | none |
| `fixture-he.pdf.sha256` is 65 bytes | yes | 65 bytes |
| `fixture-he.pdf.sha256` matches `^[0-9a-f]{64}$` | yes | yes |

## Commits

| Hash | Type | Summary |
| --- | --- | --- |
| `7d95601` | fix | RTL body text was rendering off-page right edge — add align:right to drawTextLine/drawRunningHeader/list (regression from 23-02 setR2L removal) |
| `8c8baae` | chore | remove leaky internal-planning comment from sw.js (Phase 23 vocabulary in production file) |
| `f1a8f78` | test | add Hebrew regression fixture + baseline hash (closes coverage gap that let the 23-02 RTL anchor bug ship) |

(Pre-commit hook auto-bumped `CACHE_NAME` from `sessions-garden-v86` → `sessions-garden-v87` during commit `7d95601` because `assets/pdf-export.js` was modified — expected behavior. Commit `8c8baae` modified sw.js itself, so the hook correctly did NOT re-bump the cache.)

## Reflection on the verification gap

**Why our automated tests didn't catch this:**

1. **`tests/pdf-bidi.test.js` (12 vectors, 12/12 PASS).** This tests the `shapeForJsPdf` helper in isolation — it returns the bidi-reordered visual-order string from a logical-order string. The helper was correct; the bug was in how the *placement layer* anchored that visual string on the page. The algorithmic test cannot see placement.

2. **`tests/pdf-latin-regression.test.js` with en/de/cs fixtures (3/3 PASS).** All three Latin fixtures fail the `isRtl()` predicate (Latin text → false), so they all took the **LTR branch** of `drawTextLine`, which was correct and unchanged. The RTL branch — where the bug lived — was structurally unreachable from these fixtures. The hashes were green and gave a false sense of coverage.

**What would have caught it:** exactly the Hebrew fixture this plan now adds. A single Hebrew session through the regression harness would have produced a measurably different PDF (most of the body off-page → fewer text-rendering bytes → different hash). Even without an eyeball check, the hash would have refused to come back stable across runs IF the fixture had existed during 23-02 development.

**Process lesson — "no fixture-X for primary language X" lint:**

The Phase 23 work treated en/de/cs as the regression matrix because they were called "Latin-only". But the *primary use case* for this app is Hebrew sessions (Sapir's clinic) — Hebrew is not "an extra language to also test", it is the dominant runtime language. We had a regression suite that completely excluded the primary language path.

Recommendation for the GSD workflow: when a phase's RESEARCH or CONTEXT explicitly names a language/locale/code-path as a primary concern (Phase 23-CONTEXT D1-D5 are *all* about RTL Hebrew), the planner should fail with a hard lint if the regression suite the phase ships does not include a fixture exercising that primary path. Concretely: if `23-CONTEXT.md` mentions "RTL" or "Hebrew" N times and the test suite added in any phase plan has zero `*-he.*` / `*-rtl-*` fixtures, halt planning with a "primary-path regression coverage gap" blocker.

A weaker but cheaper version: add a checklist item to the GSD plan-phase template — "Regression fixture coverage matches phase's stated primary use case" — that the planner must explicitly check off (with file paths) before finalizing the plan. The setR2L removal in 23-02 plus the Hebrew fixture missing in 23-04 should both have been caught by such a checklist.

## Self-Check: PASSED

- All 4 commit hashes exist in `git log`:
  - `7d95601` FOUND
  - `8c8baae` FOUND
  - `f1a8f78` FOUND (this commit + the SUMMARY commit)
- Files referenced in this SUMMARY all exist:
  - `assets/pdf-export.js` FOUND
  - `sw.js` FOUND
  - `tests/pdf-latin-regression.test.js` FOUND
  - `.planning/fixtures/phase-23/fixture-he.json` FOUND
  - `.planning/fixtures/phase-23/fixture-he.pdf.sha256` FOUND
  - `.planning/fixtures/phase-23/README.md` FOUND
- 4-fixture regression run is green; bidi corpus still green.
