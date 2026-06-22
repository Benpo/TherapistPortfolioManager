# Phase 23 Plan 23-10: uiLang Anchor + Heart-Shield Section + Issues Heading Cleanup

Three post-23-09 PDF/markdown fixes from Ben's UAT, bundled into one plan, three atomic commits (Task 4 had no work to commit).

## One-line summary

Anchor PDF body lines by document-level `uiLang` (not per-line content) so Hebrew docs anchor right uniformly even on Latin lines; promote heart-shield from a bare label-line to a proper `## ` section in both markdown builders; defensively wrap every `## ` section heading with `stripRequired()` so the form-required `*` marker (currently on `issues`, potentially on others later) cannot leak into the rendered title.

## Tasks executed

| Task | Title | Commit | Cache bump |
|------|-------|--------|------------|
| 1 | Anchor lines by `docDir` (uiLang) -- unified paragraph direction | `2259ec4` | v97 → v98 |
| 2 | Heart shield is its own `## ` section (both builders) | `cb98e57` | v98 → v99 |
| 3 (broadened) | `stripRequired()` on every `## ` heading site (both builders) | `6bace56` | v99 → v100 |
| 4 | Regenerate fixture baselines | (no commit -- zero drift) | n/a |

Final cache version landed at `sessions-garden-v100`, exactly as the brief predicted.

## Verification gates -- all green

### Task 1 (PDF anchor)

- `node -c assets/pdf-export.js` exits 0
- `grep -c "var docDir = "` = **1**
- `grep -c "docDir === 'rtl'"` = **3** (drawTextLine, drawRunningHeader, list rendering -- exceeds the brief's "≥ 2" target)
- `grep -c "isRtl(line)"` = **0** (replaced)
- `grep -c "isRtl(text)"` = **0** (replaced -- drawRunningHeader)
- `grep -c "isRtl(wrapped"` = **0** (replaced -- list rendering)
- `grep -c "function isRtl"` = **0** (function removed -- see deadcode cleanup section below)
- All Phase 23 invariants preserved:
  - `setR2L` = **0**
  - `shapeForJsPdf` count = **18** (≥ 7 floor)
  - `isInputVisual: false` count = **11** (≥ 6 floor)
  - `align: 'right'` count = **5** (≥ 3 floor)
  - `align: 'center'` count = **3** (≥ 3 floor)
  - `Heebo` count = **36** (≥ 4 floor)

### Task 2 (heart-shield section)

- `node -c assets/add-session.js` exits 0
- `heartShieldLine` (variable, filtered builder) = **0** occurrences (gone)
- `heartShieldCopyLine` (variable, copy builder) = **0** occurrences (gone)
- 2 new `## ${App.getSectionLabel("heartShield"...)}` heading sites (one per builder)

### Task 3 (broadened stripRequired -- pre-approved deviation)

- `node -c assets/add-session.js` exits 0
- Total `stripRequired` grep hits = **23** (vs. brief's "≥ 5" target; vs. broadened-target "≥ 15")
- `stripRequired(App.getSectionLabel("issues"...` = **2** (matches brief's exact gate of 2)
- Bare `## ${App.getSectionLabel(...)` (NOT wrapped) sites remaining = **0**
- All `## ` heading sites wrapped with `stripRequired()` = **18** (9 per builder, symmetric)

### Task 4 (test suites)

- `tests/pdf-latin-regression.test.js`: **4/4** pass (all fixtures unchanged, see hash deltas below)
- `tests/pdf-bidi.test.js`: **12/12** pass
- `tests/pdf-glyph-coverage.test.js`: **3/3** pass
- `tests/pdf-digit-order.test.js`: **4/4** pass

Total: **23/23 test cases green** across all four PDF test suites.

## Hash deltas (Task 4)

| Fixture | uiLang | Pre-23-10 | Post-23-10 | Delta |
|---------|--------|-----------|------------|-------|
| `fixture-en` | en | `50445d13a64e3768` | `50445d13a64e3768` | **none** |
| `fixture-de` | de | `0645b9256956005a` | `0645b9256956005a` | **none** |
| `fixture-cs` | cs | `1db0985886f16b97` | `1db0985886f16b97` | **none** |
| `fixture-he` | he | `24521b6f8cccbfd9` | `24521b6f8cccbfd9` | **none** |

**Why nothing drifted -- including `fixture-he`:**

The 23-10 anchor change replaces a per-line `isRtl(line)` decision with a document-level `docDir === 'rtl'` decision. The two are byte-equivalent **as long as every line in the document has the same direction as the document**:

- `fixture-en/de/cs`: every line is Latin -> `isRtl(line)` = `false` -> matches `docDir === 'rtl'` (which is `false` for uiLang=en/de/cs).
- `fixture-he`: every line is Hebrew -> `isRtl(line)` = `true` -> matches `docDir === 'rtl'` (which is `true` for uiLang=he).

The change ONLY produces different bytes when the document is mixed-script -- specifically a Hebrew-uiLang doc with a Latin-only line, or a Latin-uiLang doc with a Hebrew-only line. None of the four regression fixtures contain that scenario by design (they're language-pure).

**This is functionally correct and matches the brief's prediction:** "the effect may be minimal" because "the fixtures don't have much mixed content". The brief left the door open to en/de/cs drifting (which would have signalled a bug); none drifted, so no investigation needed.

The pre-commit `--regenerate` confirmed identical bytes -- no `.sha256` files modified, no Task-4 commit needed.

**Open question for Ben:** should we add a 5th fixture (`fixture-he-mixed.json`) that exercises the new anchor logic? E.g., a Hebrew-uiLang session with one Latin-only body line ("Tools used: SUDS scale, EFT tapping"). Without it, the docDir-anchor change has no regression coverage -- if a future refactor reverts it accidentally, the test suite won't catch it. **Estimated effort:** ~10 minutes to author + regenerate baseline.

## Section structure change for heart shield

### Before (Phase 23-08 + 09)

```
# Session Document

**מפגש מגננת לב** לא

## נושאי המפגש *
- ...
```

After Phase 23 (23-08) stripped `**` markers from the renderer, this rendered as:

```
# Session Document

מפגש מגננת לב לא          <-- raw text, no semantic structure, Ben's "stray junk"

## נושאי המפגש *           <-- literal "*" leaking from required-marker
- ...
```

### After (Phase 23-10)

```
# Session Document

## מפגש מגננת לב           <-- proper section heading
לא                         <-- value as body line

## נושאי המפגש             <-- "*" stripped via stripRequired()
- ...
```

Same structural pattern as every other section (`## Trapped Emotions`, `## Limiting Beliefs`, etc.) -- visually consistent, screen-reader-friendly, matches the heading hierarchy the rest of the document uses.

## Deviations from plan

### Pre-flight gate adjusted (with explicit user approval)

The brief asserted `grep -c "stripRequired" assets/add-session.js >= 5` as a pre-flight check. Actual pre-state: **3** occurrences (1 function definition + 2 call sites for `trapped` only). I stopped per protocol and reported.

User responded: override pre-flight, proceed with **broadened Task 3 (Option 2)** -- wrap all `## ${App.getSectionLabel(...)}` heading call sites with `stripRequired()`, not just the two `issues` sites the brief named. Rationale: (a) `stripRequired()` is a no-op on labels without a trailing `*`, so defensive wrapping is safe; (b) labels can grow `*` markers in the future when therapists customize section titles via Settings or new required sections are added.

User-stated count of "14 heading call sites (7 + 7)" was slightly off -- actual was **8 + 8 = 16** existing heading sites in the original code. After Task 2 added 2 new heart-shield headings (one per builder), the wrapped total is **18** (9 per builder). Combined with 1 function definition + 4 in-comment mentions = **23 total `stripRequired` grep hits**. Brief's broadened gate `>= 15` met by margin of 8.

### Dead-code cleanup -- `isRtl()` function removed

After Task 1 replaced all three `isRtl(...)` callers in `assets/pdf-export.js` (drawTextLine line, drawRunningHeader text, list-rendering wrapped[wi]) with `docDir === 'rtl'`, the function had **zero remaining callers**. I removed it, replacing the function definition + jsdoc with a brief explanatory comment that documents (a) why it was removed and (b) where direction inference still lives (per-line bidi shaping inside `shapeForJsPdf` -> `firstStrongDir` per UAX #9 HL2, which is unchanged).

Cross-checked with `grep -rn "isRtl" assets/ tests/`:

- `assets/landing.js:714,718` declares its own local `var isRtl = (lang === 'he')` -- **completely unrelated** to the pdf-export function (different scope, different definition, different purpose).
- `tests/pdf-latin-regression.test.js:203` and `tests/pdf-glyph-coverage.test.js:285` reference `isRtl` only in **comments** (historical context), not in any test assertion or import.

So the removal is safe -- no callers anywhere. The brief instructed: "If genuinely unused everywhere, remove the function (it's dead code)." Done.

### Stale-comment cleanup -- `drawPage1Header` comment block

A multi-line comment in `drawPage1Header` (formerly L548-554, after my edits L548-555) referenced `isRtl()` twice as the basis for the body-content anchor decision. Updated the comment block to reference `docDir` instead, with a parenthetical noting the Phase 23 23-10 change. No code change in this region -- just documentation hygiene to prevent future readers from grep-finding `isRtl` in stale comments and chasing a non-existent function.

### Task 4 -- no commit (no fixture drift)

The brief specified a `chore(23-10): regenerate fixture baselines` commit. Regeneration produced **zero drift** in all 4 fixtures (see hash table above). Per `git_safety_protocol`, I do not create empty commits. Documented the no-drift outcome here in the SUMMARY instead. The 23-10 anchor change has therefore landed without test coverage for the new mixed-script scenario it enables -- see "Open question" above.

## Files modified

- `assets/pdf-export.js` -- Task 1 (anchor by docDir, remove isRtl, comment hygiene)
- `assets/add-session.js` -- Task 2 (heart-shield -> ## section) + Task 3 (stripRequired on every ## heading)
- `service-worker.js` -- pre-commit hook bumped CACHE_NAME 3 times: v97 -> v98 -> v99 -> v100

## Self-Check: PASSED

All claimed file changes verified to exist and contain the claimed content; all claimed commits verified present in `git log`:

```
$ for h in 2259ec4 cb98e57 6bace56; do
    git log --oneline --all | grep -q "$h" && echo "FOUND: $h" || echo "MISSING: $h"
  done
FOUND: 2259ec4
FOUND: cb98e57
FOUND: 6bace56

$ [ -f assets/pdf-export.js ] && echo "FOUND: assets/pdf-export.js"
FOUND: assets/pdf-export.js

$ [ -f assets/add-session.js ] && echo "FOUND: assets/add-session.js"
FOUND: assets/add-session.js
```

## Open questions for Ben

1. **Add a mixed-script regression fixture?** The 23-10 anchor change is currently uncovered by the regression suite (all 4 existing fixtures are language-pure). A new `fixture-he-mixed.json` -- Hebrew-uiLang session with at least one Latin-only body line -- would lock in the docDir behaviour. ~10 min to author + baseline. Without it, an accidental revert in a future refactor won't be caught.

2. **Other "required-marker" labels in i18n?** Audit confirmed `session.form.issuesHeading` ends with `*`. No other section labels currently end with `*`. The defensive wrapping in Task 3 protects against future additions, but you may want to confirm this is the right policy direction (alternative: strip `*` at the i18n loader layer once and never need defensive wrapping at call sites).

3. **Heart-shield heading wording.** I reused the form-field label `session.form.heartShield` (currently "מפגש מגננת לב" in Hebrew, "Heart Shield Session" in English) as the section heading. The brief noted this reads naturally as a header in Hebrew. If the English wording feels too verbose ("Session" is redundant when it's clearly a section in a session document), let me know and I'll refactor with a dedicated section-heading i18n key.
