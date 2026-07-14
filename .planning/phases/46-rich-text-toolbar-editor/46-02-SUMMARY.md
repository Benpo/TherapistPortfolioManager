---
phase: 46-rich-text-toolbar-editor
plan: 02
subsystem: pdf-export
tags: [pdf, fonts, italic, bidi, hebrew, rubik, tdd]
status: complete
requires:
  - pdf-export.js Phase 23 bidi pipeline (shapeForJsPdfWithMap, single-pass, isInputVisual:false)
  - pdf-export.js parseInlineBold {text,bold} segment model + join-invariant (Phase 45 D-08)
  - tests/45-pipeline-agreement.test.js randomized join-invariant fuzz (T-45-03 gate)
provides:
  - window.RubikItalic (vendored subset Rubik-Italic base64 TTF, family 'Heebo' style 'italic')
  - parseInline emitting {text, bold, italic} (parseInlineBold kept as alias)
  - drawSegmentedLine styleByLogical run model (0 normal / 1 bold / 2 italic)
  - CHECKPOINT OUTCOME: GREEN — Ben accepted true italic (no D-14 disclosure needed in 46-06)
affects:
  - 46-06 (export plan reads THIS outcome: GREEN accepted -> NO italic disclosure follow-up needed)
  - 46-03 (toolbar italic button output now survives export as true slanted glyphs)
tech-stack:
  added:
    - "Vendored subset Rubik-Italic wght=400 (SIL OFL 1.1, from googlefonts/rubik via google/fonts)"
  patterns:
    - "Foreign italic face registered UNDER the existing family ('Heebo'/'italic') so the renderer only ever switches setFont style, never family"
    - "fonttools instancer + pyftsubset as dev-only asset-production tools (no shipped dependency)"
key-files:
  created:
    - assets/fonts/rubik-italic-base64.js
    - assets/fonts/rubik.LICENSE.txt
  modified:
    - assets/pdf-export.js
    - sw.js
    - tests/45-pipeline-agreement.test.js
    - tests/_helpers/jsdom-pdf-env.js
    - tests/30-export-stepper.test.js
    - .planning/fixtures/phase-23/*.pdf.sha256 (all 5 regenerated, justified)
    - .planning/fixtures/phase-23/README.md (regeneration-history entry)
decisions:
  - "D-13 verdict GREEN: subset base64 measures 85,680 chars (~83.7 KB), under the ~90 KB GREEN threshold — true italic ships; D-14 fallback NOT taken"
  - "Checkpoint resolved: Ben replied 'accept italic' (GREEN), explicitly accepting the ~6.3 KB font descriptor embedded in every PDF including italic-free exports (unconditional registration, mirrors Heebo Bold)"
  - "Subset recipe: instance variable Rubik-Italic[wght] to 400, pyftsubset Latin+Latin-1+Latin-Ext-A+Hebrew+GeneralPunct+shekel with ccmp/mark/mkmk/kern/liga/locl/rlig, no-hinting, no-glyph-names"
  - "***x*** degrades bold-wins (unchanged Phase 45 behavior); the bare leading-*** parse/strip degeneracy is pre-existing and documented in the test, asserted as no-garbage not strict join===strip"
metrics:
  duration_min: 35
  completed: 2026-07-14
  tasks: 4
  files: 13
  tests_added: 4
  suite: 185/185
---

# Phase 46 Plan 02: True PDF Italic — Rubik-Italic under 'Heebo'/'italic' Summary

Italic note text now renders as TRUE slanted glyphs in the exported PDF for
Latin AND Hebrew (D-13 / RTXT-05): a subset Rubik-Italic face (wght 400,
~83.7 KB base64 — GREEN) is registered under family `'Heebo'` style `'italic'`,
the segment model grew from `{text,bold}` to `{text,bold,italic}`, and
`drawSegmentedLine` breaks runs on style via a `styleByLogical` array — all with
the Phase 23 single-pass bidi pipeline untouched and the byte-for-byte
join-invariant proven under the 500-string fuzz.

## Payload Measurement & Feasibility Verdict (D-13 gate)

| Metric | Value |
|--------|-------|
| Source | googlefonts/rubik `Rubik-Italic[wght].ttf` via github.com/google/fonts (SIL OFL 1.1) |
| Recipe | fontTools.varLib.instancer wght=400 → pyftsubset (Latin + Latin-1 + Latin-Ext-A + Hebrew U+0590–05FF + GeneralPunct + U+20AA; ccmp/mark/mkmk/kern/liga/locl/rlig; --no-hinting --no-glyph-names --desubroutinize) |
| Subset TTF | 64,260 bytes |
| **Base64 length** | **85,680 chars (~83.7 KB)** |
| **Verdict** | **GREEN** (≤ ~90 KB) |
| Coverage verified | 27/27 Hebrew letters (alef–tav) + 17 nikud, full Latin A–z + digits, italic angle −12°, OS/2 wght 400, ITALIC flags set |
| Per-PDF cost | ~6.3 KB font descriptor embedded in EVERY export (unconditional registration, mirrors Heebo Bold) — measured empirically |

## Checkpoint Outcome (Task 4)

**ACCEPTED — GREEN.** Ben replied "accept italic" after inspecting real opened
PDFs (EN LTR + HE RTL, generated through the production `buildSessionPDF`):
Latin italic visibly slanted; Hebrew italic slants acceptably (oblique — Hebrew
has no cursive-italic tradition, RESEARCH A2); bold stays Heebo bold; normal
unchanged; RTL/bidi order correct. The ~6.3 KB always-embedded descriptor was
explicitly accepted. **Plan 46-06: NO D-14 italic disclosure is needed** (no
tooltip clause, no export-modal note).

Verification artifacts: `/Users/ben/Claude-Code-Sandbox/.claude/context/2026-07-14_46-02-italic-verify-{EN,HE}.pdf` (+ `.png` renders).

## What Was Built

**Task 1 (`bb64bb1`)** — `assets/fonts/rubik-italic-base64.js`: single
`window.RubikItalic` base64 module with the heebo-base64.js header shape (OFL
line, source, upstream, recipe, coverage, payload); Rubik OFL text vendored as
`assets/fonts/rubik.LICENSE.txt`; `/assets/fonts/rubik-italic-base64.js` added
to `sw.js` PRECACHE_URLS directly after heebo-bold (offline export finds the
font; CACHE_NAME auto-rolls via INTEGRITY_TOKEN).

**Task 2 (`9d6f3a3`)** — `assets/pdf-export.js` three seams:
- `registerFonts` registers RubikItalic under `("RubikItalic.ttf", "Heebo", "italic")`
  with the same global-present guard as Regular/Bold (safe no-op when absent).
- `ensureDeps` lazy-loads rubik-italic-base64.js after heebo-bold with a
  global-present `isReady` predicate (headless/jsdom never hangs).
- `parseInlineBold` → `parseInline` emitting `{text, bold, italic}`: a validated
  `*X*` span yields an italic:true segment (previously folded into regular);
  inner text is byte-identical so the join-invariant holds exactly.
  `parseInlineBold` kept as an alias; `__test` seam exposes both.
- `drawSegmentedLine`: `styleByLogical` Uint8Array (0/1/2) parallel to
  `weightByLogical`; runs break on style change; each run
  `setFont('Heebo', normal|bold|italic)`; per-run `getStringUnitWidth`
  re-measure; single `shapeForJsPdfWithMap` call and `{isInputVisual:false}`
  unchanged (23-08 invariant); font reset to normal after the line.

**Task 3 (`be611eb`)** — `tests/45-pipeline-agreement.test.js` extended (not
duplicated): join-invariant fuzz repointed to `parseInline`; +4 tests (italic
span → exactly one italic:true segment, Latin AND Hebrew; `**X**` →
bold:true/italic:false with zero italic segments; mixed line classifies
independently; `***x***` degrades bold-wins with well-formed segments and
strip-pipelines still agreeing). Count guard 17 → 21.

**Verification fix (`7a6706f`)** — see Deviations #3.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jsdom PDF harnesses hung on the new rubik loadScriptOnce step**
- **Found during:** Task 2 (`npm test` — 30-export-stepper failed; 34-* PDF tests went inert exit-0 false-GREEN)
- **Issue:** ensureDeps' new rubik-italic step found no global/tag in the harnesses, appended a `<script>` whose onload never fires in jsdom, hanging `buildSessionPDF` (the documented Phase 34 icon failure mode).
- **Fix:** `tests/_helpers/jsdom-pdf-env.js` and `tests/30-export-stepper.test.js` now eval `rubik-italic-base64.js` (and the stepper also preloads the script tag), mirroring the established Heebo/icon global-present pattern.
- **Files modified:** tests/_helpers/jsdom-pdf-env.js, tests/30-export-stepper.test.js
- **Commit:** 9d6f3a3

**2. [Rule 3 - Blocking] Phase-23 golden PDF hashes regenerated (all 5)**
- **Found during:** Task 2 (`pdf-latin-regression.test.js` failed 0/5)
- **Issue:** Unconditional italic registration embeds a ~6.3 KB font descriptor into every PDF, shifting every fixture hash — including italic-free Latin fixtures.
- **Fix:** Byte-neutrality PROVEN before regenerating: with the rubik registration temporarily disabled but ALL other 46-02 changes active (loadScriptOnce step, parseInline, styleByLogical), all 5 fixtures hashed byte-identical to the pre-46 baseline — the only drift is the intended registration. Regenerated via the documented `--regenerate` protocol; justification recorded in the fixtures README "Regeneration history".
- **Files modified:** .planning/fixtures/phase-23/*.pdf.sha256 (5), .planning/fixtures/phase-23/README.md
- **Commit:** 9d6f3a3

**3. [Rule 1 - Bug] clipSegmentsToRange dropped the italic flag**
- **Found during:** Checkpoint prep — instrumenting a REAL `buildSessionPDF` showed `setFont('Heebo','italic')` fired ZERO times despite parseInline emitting italic segments (jsdom tests alone would never have caught this; the repo's false-GREEN history is why the plan demands a real opened PDF).
- **Issue:** `clipSegmentsToRange` rebuilt clipped segments as `{text, bold}` only; every wrapped paragraph AND list sub-line is clipped before `drawSegmentedLine`, so italic silently rendered as normal.
- **Fix:** Clip now carries `italic: seg.italic`; both empty-clip fallbacks set `italic:false`. Re-instrumented: italic face fires for Latin, Hebrew, and list-item runs. Golden fixtures (no italic) stayed byte-identical.
- **Files modified:** assets/pdf-export.js
- **Commit:** 7a6706f

## Known Stubs

None. True italic is fully wired end-to-end (parse → clip → bidi → draw →
embedded face) and verified against real opened PDFs in both directions.

## Threat Flags

None beyond the plan's own register. T-46-02a mitigated (official
googlefonts/rubik provenance, OFL text vendored, SW-precached under the
deploy-stamped INTEGRITY_TOKEN). T-46-02b mitigated (join-invariant fuzz green,
single-pass bidi asserted). T-46-02c mitigated (GREEN payload, export-time lazy
load only). No shipped package installs (fonttools/pyftsubset dev-only).

## Verification

- `npm test` → **185/185**, exit 0 (including the extended 21-test agreement file and the regenerated golden baselines)
- `grep -Ec 'addFont\("[^"]+",\s*"Heebo",\s*"italic"\)' assets/pdf-export.js` = 1 ✓; no `addFont` registers a Rubik* family (2nd arg) = 0 ✓
- `grep -c "styleByLogical"` = 5 (≥1 ✓); draw loop keeps a single `shapeForJsPdfWithMap` call (no italic bypass) ✓
- `grep -c "window.RubikItalic" assets/fonts/rubik-italic-base64.js` = 1 ✓; `grep -c "rubik-italic-base64.js" sw.js` = 1 ✓
- Real opened-PDF checkpoint: PASSED (Ben, "accept italic", GREEN)

## Self-Check: PASSED

All created/modified files exist on disk; commits bb64bb1, 9d6f3a3, be611eb,
7a6706f all present in git history.
