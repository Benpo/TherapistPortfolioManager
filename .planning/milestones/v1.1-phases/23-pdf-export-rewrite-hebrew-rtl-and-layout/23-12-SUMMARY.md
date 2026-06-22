---
phase: 23
plan: 12
subsystem: pdf-export
tags: [pdf, bidi, i18n, bold-rendering, regression, polish]
status: COMPLETE
reconstructed: true
reconstruction-note: "This SUMMARY was reconstructed forensically on 2026-06-14 from git history + current code; it was never written at execution time. All claims below are verified against the committed code and a fresh test run unless explicitly marked unverified."
date-executed: 2026-05-12
key-files:
  created:
    - tests/pdf-bold-rendering.test.js
    - .planning/fixtures/phase-23/fixture-he-mixed.json
    - .planning/fixtures/phase-23/fixture-he-mixed.pdf.sha256
  modified:
    - assets/pdf-export.js
    - tests/pdf-bidi.test.js
    - tests/pdf-latin-regression.test.js
    - assets/i18n-en.js
    - assets/i18n-de.js
    - assets/i18n-he.js
    - assets/i18n-cs.js
    - .planning/fixtures/phase-23/README.md
    - sw.js
metrics:
  tasks: 4
  implementation-commits: 4
  plan-doc-commit: 1
  test-suites-passing: 5 (pdf-bidi 12/12, pdf-bold-rendering 9/9, pdf-latin-regression 5/5, pdf-glyph-coverage 3/3, pdf-digit-order 4/4)
  total-assertions: 33/33
  cache-version: v102 -> v105
---

# Phase 23 Plan 23-12: Final Polish — Inline Bold + In-person i18n + Bracket Mirroring + Mixed Fixture

> **Reconstructed SUMMARY.** This file was missing — the plan was executed and committed on 2026-05-12 but its SUMMARY was never written. Reconstructed 2026-06-14 from the git commit chain (`fb6004d`, `94bedd8`, `9e5690a`, `ccfe3a7`, `0b27149`) and verified against the current `assets/pdf-export.js`, the i18n files, the fixtures, and a fresh run of all five Phase 23 PDF test suites. Claims that could not be verified from the repository are marked **(unverified)**.

The four-item close-out of Phase 23: render inline `**bold**` markers in the PDF (Heebo Bold) instead of stripping them; align the In-person session-type label across the form and the export in all 4 locales; restore standard UAX-BD16 bracket mirroring for native Hebrew readers; and add a mixed-script regression fixture to lock in the 23-10 docDir-uniform-anchor behaviour. All work landed on 2026-05-12; all five PDF test suites are green (33/33 assertions).

## One-line summary

Inline `**X**` renders in Heebo Bold with bidi-correct positioning (new `parseInlineBold` + `shapeForJsPdfWithMap` + `clipSegmentsToRange` + `drawSegmentedLine` pipeline); the form/export In-person label is unified per locale and the dead `session.type.inPerson` key is deleted everywhere; bracket mirroring is restored in `shapeForJsPdf` (with a latent G16 API bug fixed in the process); and a new `fixture-he-mixed` regression covers Hebrew docs with embedded Latin paragraphs.

## Commit chain

| Order | Task | Commit | What |
|-------|------|--------|------|
| plan | — | `eba3fa8` | docs(23-12): plan — Phase 23 final polish (4 items, 2 waves) |
| 1 | Task 1 (Wave 1) | `fb6004d` | fix(23-12): restore UAX-BD16 bracket mirroring (revert 23-11 fix 1) — `pdf-export.js`, `tests/pdf-bidi.test.js`, `sw.js` (v102→v103) |
| 2 | Task 2 (Wave 1) | `94bedd8` | fix(23-12): align `session.form.clinic` + `session.type.clinic` to In-person across 4 locales; delete `session.type.inPerson` — 4 i18n files, `sw.js` (v103→v104) |
| 3 | Task 3 (Wave 1) | `9e5690a` | test(23-12): add `fixture-he-mixed.json` regression (docDir-uniform-anchor) — new fixture + baseline + README + `tests/pdf-latin-regression.test.js` 4→5 (no `sw.js` bump; no asset changed) |
| 4 | Task 4 (Wave 2) | `ccfe3a7` | feat(23-12): inline bold rendering — `parseInlineBold` + `shapeForJsPdfWithMap` + `clipSegmentsToRange` + `drawSegmentedLine` — `pdf-export.js` (+367/−44), `sw.js` (v104→v105) |
| 5 | Task 4 (test) | `0b27149` | test(23-12): add `pdf-bold-rendering.test.js` regression (9 assertions across 3 fixtures) — new test file (no `sw.js` bump; test-only) |

All five commits are timestamped **2026-05-12** (`eba3fa8` 22:01, `fb6004d` 22:09, `94bedd8` 22:11, `9e5690a` 22:13, `ccfe3a7` 22:37, `0b27149` 22:37 CEST). Date range: a single working session on 2026-05-12.

## What shipped

### Task 1 — Restore UAX-BD16 bracket mirroring (`fb6004d`)

- **`assets/pdf-export.js` `shapeForJsPdf`:** the `mirrorMap.forEach(...)` loop that applies `_bidi.getMirroredCharactersMap()` substitutions before the reorder pass is restored (removed by `20c1b9e` in 23-11). Verified: comment-stripped grep for `getMirroredCharactersMap` returns 3 hits in the current file (gate wanted ≥ 1); the comment block cites plan `23-12` and carries the human-driver rationale ("Sapir" appears twice in the file).
- **Latent bug fixed during restoration (G16):** the commit message documents that `getMirroredCharactersMap` indexes its second argument as a raw `Uint8Array`, so it must receive `levels.levels`, NOT the wrapper object that `getReorderSegments` consumes. The pre-23-11 code passed the wrapper, so the mirror map silently returned empty and never mirrored anything. This commit passes `levels.levels` correctly — the first time bracket mirroring actually functions end-to-end in this codebase.
- **`tests/pdf-bidi.test.js`:** inline `shapeForJsPdf` copy updated to match the canonical helper; vectors #4 and #12 expectations changed to the mirrored form. Verified: vector #4 expected string `המייתסה (הבושח) השיגפה` is present; `pdf-bidi.test.js` passes 12/12.

### Task 2 — Clinic → In-person i18n alignment (`94bedd8`)

- All 4 i18n files now set `session.form.clinic` and `session.type.clinic` to a single per-locale value, and delete the dead `session.type.inPerson` key. Verified in current code:
  - EN: both `"In-person"`
  - DE: both `"Vor Ort"`
  - HE: both `"פרונטלי"` (gender-neutral noun)
  - CS: both `"Osobně"`
  - `grep -c session.type.inPerson` returns **0** across all 4 files.
- Internal `sessionType` value stays `"clinic"` — no data migration (per plan).

### Task 3 — `fixture-he-mixed` regression (`9e5690a`)

- New `.planning/fixtures/phase-23/fixture-he-mixed.json`: `uiLang: "he"` (docDir resolves to rtl), markdown with two Hebrew paragraphs wrapping one English paragraph ("Anna mentioned… 'Atomic Habits'…"). Confirmed it contains BOTH Latin and Hebrew, NO bracket characters, and NO `**` markers — so its baseline depends only on the docDir-uniform-anchor logic, independent of Task 1 and Task 4.
- New baseline `fixture-he-mixed.pdf.sha256` = `066e3f77901d1b3a2e773a1cebc82152b79e615bed4f489a534a11433e70a819` (matches the value the live test currently asserts).
- `tests/pdf-latin-regression.test.js` fixtures array extended 4 → 5; `README.md` updated. Verified: `pdf-latin-regression.test.js` passes 5/5.

### Task 4 — Inline bold rendering (`ccfe3a7` + test `0b27149`)

Three (effectively four) new helpers added to `assets/pdf-export.js`, replacing the 23-08 strip-only placeholder:

- **`parseInlineBold(text)`** → `[{text, bold}]`. Locked shape, no `logicalStart`/`logicalEnd` fields; downstream derives logical positions by accumulating `segment.text.length`. Italic single-asterisk markers are still stripped (italic out of scope). Verified present (15 grep hits — definition + JSDoc + para/list call sites).
- **`shapeForJsPdfWithMap(text)`** → `{ visual, logicalToVisualMap, visualToLogicalMap }`. Additive bidi pipeline built on `getReorderedIndices` (NOT raw `getReorderSegments` walking, exactly as the plan specified). Documents the G16 API quirk (reordered indices use the wrapper; mirror map uses the raw array). Verified present (4 grep hits).
- **`clipSegmentsToRange(segments, startIdx, endIdx)`** — clips parsed segments to a wrapped sub-line's char range, splitting at the boundary. Verified present (6 grep hits). *(Note: this helper is not named in the plan's must_haves but is a reasonable, plan-consistent realization of step (d).5's `clipSegmentsToRange` instruction.)*
- **`drawSegmentedLine(segments, y, size, drawOpts)`** — reconstructs the logical line, builds a per-code-unit weight `Uint8Array`, calls `shapeForJsPdfWithMap`, collapses contiguous same-weight visual runs, measures each run at its own font weight, and emits one `doc.text()` per run with `{ isInputVisual: false }`. RTL anchor = `rightX - totalW`; LTR anchor = `leftX`. Resets font to `'normal'` before returning. Verified present (12 grep hits).

Rewires (per commit message, consistent with the plan):
- `parseMarkdown` para and list paths no longer call `stripInlineMarkdown` — raw `**` markers now reach the renderer.
- Para and list branches: parse → wrap on stripped text → clip per sub-line → `drawSegmentedLine`. List bullet `"- "` prepended as a regular-weight segment on the first wrapped line so it participates in bidi paragraph-direction inference.
- Heading branch: applies `stripInlineMarkdown(block.text)` at entry (the whole heading is already bold per 23-09; inline bold is redundant, so markers are stripped rather than rendered). Verified at `pdf-export.js:968`.

**`stripInlineMarkdown` call-site accounting (resolves a plan-gate ambiguity):** the plan predicted a grep count of exactly 2. Current count of `stripInlineMarkdown(` is **3**, but the three hits are: line 366 (function definition), line 393 (a JSDoc-comment reference inside `parseInlineBold`), and line 968 (the heading-branch call). The *actual call sites* are exactly 2 (definition + heading); the third is documentation. No para/list call site leaked. The plan's literal gate is a false-positive; the intent is satisfied.

**New regression test `tests/pdf-bold-rendering.test.js` (`0b27149`):** 3 fixtures × 3 assertions = 9 assertions, JSDOM + Mitigation-B harness, walks `Tj`/`TJ` operators tracking the active `/Font` resource. Font roles (Bold vs Regular) are derived at runtime from the title-block ordering — no hard-coded `/F` numbers. Verified: passes 9/9.

## Step-1 proof gate (Task 4) — neither escalation trigger fired

Per the feat commit message (`ccfe3a7`), the two locked gates were validated before writing renderer code:

- **Trigger 1 (bidi-mapping contiguity):** each `{text, bold}` segment mapped to a CONTIGUOUS visual range via `getReorderedIndices` for all 3 fixtures (EN: 3 segments contiguous; HE: 3 segments contiguous, fully reversed; mixed: 2 segments contiguous spanning a bidi boundary).
- **Trigger 2 (`splitTextToSize` round-trip):** each fixture fit in a single wrapped sub-line under `USABLE_W=453pt` at 11pt, trivially round-trippable. The `paraOff += subLine.length + 1` offset arithmetic is therefore safe; a defensive empty-clip fallback is included for the non-round-trippable case.

Neither `## CHECKPOINT REACHED` escalation was triggered. The renderer uses the planned monolithic-`splitTextToSize` path (not the segment-by-segment rewrap fallback).

## Measured constants (from `0b27149` commit message — for future test maintenance)

- **Heebo asterisk GID:** `0178` (measured 2026-05-12 under `MEASURE_MODE=1` by rendering `*` in isolation; stable for Heebo Regular v3.100). The asterisk-floor assertion requires 0 occurrences in the page-1 content stream.
- **Font resources (this jsPDF version):** `/F15` = Heebo Regular, `/F16` = Heebo Bold — but the test derives these at runtime, so the literal IDs are informational only.
- **MEASURE_MODE per-fixture body-bold CID counts:** A_en bold=7, B_he bold=5, C_mix bold=9 (each ≥ the bolded-word length floor).

## Verification / tests

Ran on 2026-06-14 with `node v22.20.0` (no `package.json` / test runner — suites are invoked directly with `node`). The `Not implemented: HTMLCanvasElement's getContext()` line is a benign jsdom warning the harnesses tolerate.

| Test suite | Result |
|------------|--------|
| `node tests/pdf-bidi.test.js` | **12/12 PASS** |
| `node tests/pdf-bold-rendering.test.js` | **9/9 PASS** |
| `node tests/pdf-latin-regression.test.js` | **5/5 PASS** |
| `node tests/pdf-glyph-coverage.test.js` | **3/3 PASS** |
| `node tests/pdf-digit-order.test.js` | **4/4 PASS** |

**Total: 33/33 assertions green** — exactly the success criterion in the plan.

Cross-task invariants (verified in current code):
- `session.type.inPerson` count = **0** across all 4 i18n files. ✔
- `getMirroredCharactersMap` (comment-stripped) ≥ 1 → **3**. ✔
- `parseInlineBold` ≥ 4 → **15**; `shapeForJsPdfWithMap` ≥ 2 → **4**; `drawSegmentedLine` ≥ 3 → **12**; `getReorderedIndices` ≥ 1 → **4**. ✔
- **`isInputVisual: false` invariant:** all **8** real `doc.text(` call sites (lines 834, 860, 862, 880, 900, 924, 926, 1170) pass `{ isInputVisual: false }`. The naive gate `count(isInputVisual: false) ≥ count(doc.text()` *appears* to fail (8 vs 11) ONLY because 3 of the `doc.text(` matches are inside comments (lines 242, 727, 771). The 23-08 invariant is fully preserved. ✔

## Service worker cache

Pre-commit hook auto-bumped `CACHE_NAME` across the asset-touching commits:

| Commit | CACHE_NAME |
|--------|-----------|
| (pre-23-12, `9c66805`) | v102 |
| `fb6004d` (Task 1) | v102 → **v103** |
| `94bedd8` (Task 2) | v103 → **v104** |
| `9e5690a` (Task 3) | no bump (no cached asset changed) |
| `ccfe3a7` (Task 4) | v104 → **v105** |
| `0b27149` (Task 4 test) | no bump (test-only) |

23-12 landed `sw.js` at **v105**. (The repo is now far past this — current HEAD shows v193 — because many later phases bumped it; v105 was the value at the close of 23-12.)

## Discrepancies between plan and actual implementation

1. **fixture-he baseline did NOT drift (plan predicted it WOULD).** The plan asserted at length that Task 1's mirror restoration would flip the `(body scan)` parens in `fixture-he.json` and therefore change its byte hash, and built the entire Task 1↔Task 3 ordering lock around regenerating that baseline. In reality the `fixture-he.pdf.sha256` value is **byte-identical pre and post 23-12** (`24521b6f8cccbfd9…` at both `9c66805` and HEAD), and commit `fb6004d` touched no `.sha256` file at all. The commit message explains why: the `(body scan)` parens fall on a wrapped sub-line whose `firstStrongDir` resolves to LTR, so those brackets sit at bidi level 0 and are never mirrored. The plan's premise — that any HE content with brackets would drift — was wrong for this specific fixture. No regeneration was needed and none happened.

2. **A latent G16 bug was discovered and fixed (not anticipated by the plan).** The plan framed Task 1 as a ~5-line straight revert. The executor found that the pre-23-11 mirror code had been passing the wrong argument shape to `getMirroredCharactersMap` (wrapper object vs raw `Uint8Array`), meaning bracket mirroring had *never actually worked* before this commit. The revert therefore also became the first commit to make mirroring functional — and is what makes the bidi corpus vectors #4/#12 exercise real end-to-end mirroring.

3. **`clipSegmentsToRange` is a fourth helper not listed in must_haves.** The plan's frontmatter named three new helpers (`parseInlineBold`, `shapeForJsPdfWithMap`, `drawSegmentedLine`); the implementation added a fourth, `clipSegmentsToRange`, which the plan's *action body* (step (d).5) did call for. Plan-consistent; only the frontmatter under-counted.

4. **`shapeForJsPdfWithMap` returns three maps, not two.** The plan specified `{ visual, logicalToVisualMap }`; the implementation returns `{ visual, logicalToVisualMap, visualToLogicalMap }` (the inverse map is needed to walk visual positions back to logical weight). Additive, plan-consistent.

5. **`stripInlineMarkdown(` grep count is 3, not 2 (plan gate).** Resolved above — the extra hit is a JSDoc comment, not a call site. Intent satisfied; the literal gate is a false-positive.

## Unverified items (no evidence available in the repo)

- **Manual UAT (Ben + Sapir):** the in-app confirmation that the In-person label renders in the form radio across all 4 locales, that bold text renders visibly heavier with no literal asterisks, that Hebrew `(parens)` read naturally R→L (Sapir-gated per W7), and that embedded-Latin Hebrew docs anchor uniformly — none of these human-UAT steps can be confirmed from the repository. **(unverified)**
- **The plan's `<output>` block requested several SUMMARY-only artifacts** (the exact splitTextToSize sub-line lists, full MEASURE_MODE dumps). Only the condensed values that survived into the commit messages are recorded above; the full per-fixture sub-line listings were not persisted anywhere in the repo and could not be reconstructed. **(unverified)**

## Self-check: PASSED

All five commits present in `git log`; all created files exist (`tests/pdf-bold-rendering.test.js`, `fixture-he-mixed.json`, `fixture-he-mixed.pdf.sha256`); all named symbols present in `assets/pdf-export.js`; all 4 i18n cleanups confirmed; all 5 test suites re-run green (33/33). This SUMMARY is a forensic reconstruction, not a contemporaneous record — treated accordingly.
