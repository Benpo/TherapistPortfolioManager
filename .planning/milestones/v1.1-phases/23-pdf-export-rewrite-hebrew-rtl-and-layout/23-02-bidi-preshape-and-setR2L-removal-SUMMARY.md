---
phase: 23-pdf-export-rewrite-hebrew-rtl-and-layout
plan: 23-02
parent_phase: 23
title: Bidi pre-shape pipeline + setR2L removal in pdf-export.js — SUMMARY
type: summary
wave: 2
status: shipped-pending-uat
requirements:
  - 23-T1
  - 23-T2
  - 23-T3
tags:
  - phase-23
  - pdf
  - hebrew
  - rtl
  - bidi
  - uax-9
  - core-rewrite
  - summary
commits:
  - hash: c27a853
    type: feat
    message: ensureDeps bidi-js wiring + firstStrongDir/shapeForJsPdf helpers (D1, D2)
  - hash: 11377e4
    type: feat
    message: shapeForJsPdf at every doc.text boundary + remove all setR2L (D1, D2, G1)
files_modified:
  - assets/pdf-export.js
metrics:
  shapeForJsPdf_call_sites: 7
  setR2L_calls_remaining: 0
  loadScriptOnce_chain_length: 4
  helpers_added: 2
  lines_added_total: 98
  lines_removed_total: 16
---

# Phase 23 Plan 02: Bidi pre-shape pipeline + setR2L removal — SUMMARY

**One-liner:** Replaced jsPDF's broken pseudo-RTL handling (`setR2L` + anchor flip) with a proper UAX #9 bidi pre-shape pipeline using vendored bidi-js@1.0.3 — every `doc.text()` boundary now receives a visual-order string built by `shapeForJsPdf()`, all 3 `setR2L` calls deleted, x-anchor flip preserved.

## What shipped

### Code changes (assets/pdf-export.js)

**Module-private state (L42–44):** Added `var _bidi = null;` declaration alongside the existing `_depsLoaded` and `_loadingPromise` flags. Cached factory output, initialized inside `ensureDeps` after the bidi-js script resolves (G9 — must NOT be initialized at module-eval time, as `window.bidi_js` does not exist until the UMD script attaches).

**ensureDeps Promise chain (L94–110):** Inserted a 4th `loadScriptOnce('./assets/bidi.min.js')` step between `jspdf.min.js` and `noto-sans-base64.js`. Immediately after that step, `_bidi = window.bidi_js();` invokes the factory once and caches the result. The `progress('loading-fonts')` call moved from after the jspdf load to after the bidi-factory invocation, so 'loading-lib' covers jspdf+bidi and 'loading-fonts' covers just the two font files (matches RESEARCH 'Performance / Lazy-Load Notes').

**Two new helpers (L191–253):** Inserted `firstStrongDir()` and `shapeForJsPdf()` between `registerFonts` (ends L183) and `isRtl` (begins L265). Helper bodies match the RESEARCH-canonical implementations verbatim — no deviations.

  - `firstStrongDir(text)`: Implements UAX #9 HL2 (paragraph base direction from first strong directional char). Returns `'ltr'` on empty input or no strong char (default per HL2). Iterates `text.length` (UTF-16 code units) and uses `_bidi.getBidiCharTypeName(text[i])`.
  - `shapeForJsPdf(text)`: Operates on `text.split('')` (UTF-16 code units, NOT `[...text]` / `Array.from(text)` — G2 enforced; surrogate pairs preserved). Calls `_bidi.getEmbeddingLevels`, `_bidi.getReorderSegments`, `_bidi.getMirroredCharactersMap`. Applies BD16 mirror swaps first, then UAX-L2 segment reversal, then joins back to string.

**`applyFontFor()` (L425–438):** Body shrunk from 9 lines to 6 lines. Both `doc.setR2L(true)` (RTL branch) and `doc.setR2L(false)` (LTR branch) calls removed (G1). Function name preserved for call-site stability; responsibility narrows from "font + direction" to "font only". Comment block added explaining why the R2L flag is gone and that direction is now driven by `shapeForJsPdf`.

**`drawTextLine()` (L440–446):** `var visual = shapeForJsPdf(line); doc.text(visual, x, y);` — the x-anchor logic at the previous line (`isRtl(line) ? PAGE_W - MARGIN_X : MARGIN_X`) STAYS unchanged, because shaped RTL text still needs the right-margin anchor for jsPDF's left-to-right glyph emission to flow leftward visually.

**`drawPage1Header()` title (L463–464):** `var titleVisual = shapeForJsPdf(clientName || " "); doc.text(titleVisual, titleX, titleY);` — Plan 23-03 will REPLACE this entire title draw call with a centered version per D4; this insertion is the interim form so the file stays consistent if 23-02 ships before 23-03.

**`drawPage1Header()` meta line at L478:** UNCHANGED in 23-02 — call is `drawTextLine(metaText, ...)` and `drawTextLine` already shapes internally per the change above. Plan 23-03 will replace this with a centered draw of its own.

**`drawRunningHeader()` (L487–488):** `var visual = shapeForJsPdf(text); doc.text(visual, x, RUNNING_HEADER_Y);`.

**List rendering (L536–555):** All 4 `doc.text()` sites wrapped:
  - 5a (RTL list, first wrapped line, L542–543): `var visualA = shapeForJsPdf("- " + wrapped[wi]); doc.text(visualA, rtlX, y);` — **prefix-then-shape** per Open Question #1: the `-` participates in paragraph-direction inference and visually lands on the right edge.
  - 5b (RTL list, continuation, L545–546): `var visualB = shapeForJsPdf(wrapped[wi]); doc.text(visualB, rtlX - 14, y);`.
  - 5c (LTR list, first wrapped line, L550–551): `var visualC = shapeForJsPdf("- " + wrapped[wi]); doc.text(visualC, MARGIN_X, y);`.
  - 5d (LTR list, continuation, L553–554): `var visualD = shapeForJsPdf(wrapped[wi]); doc.text(visualD, MARGIN_X + 14, y);`.

  Variable names A/B/C/D avoid `var visual` redeclaration confusion (pdf-export.js is var-scoped, not block-scoped — same name reused 4 times in different branches is legal but visually noisy; the 4 distinct names keep the diff readable).

**Footer pass (L575–586):** `doc.setR2L(false)` at the previous L502 deleted. The block `doc.setFont("NotoSans", "normal"); doc.setR2L(false); doc.setFontSize(META_SIZE);` collapsed to two lines. The `doc.text(label, fx, FOOTER_BASELINE_Y)` at the previous L509 left UNCHANGED — footer text is always Latin page-number; `shapeForJsPdf(label)` would return `label` byte-identical (firstStrongDir → 'ltr', getReorderSegments → []), so leaving it unwrapped keeps the footer pass minimal for Plan 23-05 (optional footer-centering refactor) to operate on.

**`isRtl()` docstring (L258–267):** Stale reference to "whether to call setR2L(true) for the line being rendered" removed; replaced with an accurate description of `isRtl`'s post-Phase-23 responsibilities (font choice + x-anchor only) plus a Phase-23 note pointing at the new shaping pipeline.

### Verification gates — all 9 automated checks pass

| # | Gate | Expected | Actual |
|---|------|----------|--------|
| 1 | `node -c assets/pdf-export.js` | exit 0 | OK |
| 2 | `grep -c 'var _bidi = null' …` | == 1 | 1 |
| 3 | `grep -c 'loadScriptOnce.*bidi.min.js' …` | ≥ 1 | 2 (1 call + 1 comment ref) |
| 4 | `grep -c '_bidi = window.bidi_js' …` | ≥ 1 | 1 |
| 5 | `grep -c 'function firstStrongDir' …` | == 1 | 1 |
| 6 | `grep -c 'function shapeForJsPdf' …` | == 1 | 1 |
| 7 | `grep -cF "text.split('')" …` | ≥ 1 | 3 |
| 8 | `grep -cE '\[\.\.\.text\]\|Array.from\(text' …` | == 0 | 0 |
| 9 | `grep -cF 'setR2L' …` (strict, plan's literal gate) | == 0 | 0 |
| 10 | `grep -cF 'shapeForJsPdf(' …` | ≥ 7 | 10 (1 def + 7 calls + 2 comments) |
| 11 | `grep -cF 'shapeForJsPdf("- ' …` | ≥ 2 | 2 (RTL + LTR list-first-line) |
| 12 | `awk '/applyFontFor/,/^      }$/' \| grep -c setR2L` | == 0 | 0 |
| 13 | `awk '/applyFontFor/,/^      }$/' \| grep -c setFont` | ≥ 2 | 2 |
| 14 | `awk '/drawTextLine/,/^      }$/' \| grep -c 'PAGE_W - MARGIN_X'` | ≥ 1 | 1 |

### Test-vector spot-check (Node + bidi.min.js sandbox)

To validate the helpers before relying on them at PDF-render time, the executor loaded `assets/bidi.min.js` into a Node `vm` context (with `window`/`self` shims for the UMD bundle) and ran the helpers against a curated subset of RESEARCH section "Test Vector Corpus":

| Test vector | Direction | Output | Outcome |
|-------------|-----------|--------|---------|
| `שלום עולם` (pure Hebrew, T1) | rtl | `םלוע םולש` | exact match RESEARCH (PASS) |
| `Hello עולם` (Hebrew + Latin, T2) | ltr | `Hello םלוע` | LTR run preserved + Hebrew run reversed (PASS) |
| `מצב רוח: 🌱 פורח` (surrogate-pair safety, G2) | rtl | `חרופ 🌱 :חור בצמ` | 🌱 (U+1F331, surrogate pair) intact (PASS) |
| `תאריך: 2026-05-12` (Hebrew + ISO date, T2) | rtl | `2026-05-12 :ךיראת` | date kept LTR, colon repositioned (PASS) |
| `שלום (עולם)` (paired brackets in RTL, G3) | rtl | `)םלוע( םולש` | UAX-BD16 paren mirroring — `(` ↔ `)` (PASS) |
| `- שלום עולם` (prefix-then-shape, RTL list, Open Q #1) | rtl | `םלוע םולש -` | bullet on visual-left → renders on right edge (PASS) |
| `- Hello World` (LTR list) | ltr | `- Hello World` | byte-identical no-op (PASS) |
| `Hello World` (pure Latin, T3) | ltr | `Hello World` | byte-identical no-op (PASS) |
| `https://example.com/path` (URL) | ltr | `https://example.com/path` | byte-identical no-op (PASS) |
| `Schöne Grüße aus Berlin` (German diacritics) | ltr | `Schöne Grüße aus Berlin` | byte-identical no-op (PASS) |
| `בקר אצלנו: https://example.com` (Hebrew + URL) | rtl | `https://example.com :ונלצא רקב` | URL kept LTR, Hebrew reversed (PASS) |
| empty string | ltr | empty | (PASS) |

**0 failures.** Latin-only inputs are byte-identical no-ops, which is the structural protection 23-04 will then byte-verify against the pre-Phase-23 reference PDFs (T3).

## Deviations from Plan

### 1. [Rule 3 — Blocking issue] Plan's strict `setR2L` grep gate vs. plan's prescribed comments

- **Found during:** Task 2 verification.
- **Issue:** The plan instructs me to add inline comments like `// Phase 23 (G1): setR2L removed. jsPDF's setR2L(true) does a naive .split(...).reverse()...` (plan lines 386–401). It also requires `grep -c 'setR2L' assets/pdf-export.js` to return **0** (plan line 466 + success criterion line 510). These are mutually exclusive — adding the prescribed comments makes the grep return ≥3, not 0. There was also a pre-existing stale docstring on `isRtl` (L260–263) that mentioned `setR2L(true)` as part of `isRtl`'s historical responsibility — that docstring also tripped the gate.
- **Fix:** Reworded the two new comments to convey the same meaning without using the literal token `setR2L`. The applyFontFor comment now says *"jsPDF's right-to-left flag is no longer set here. That flag does a naive `.split('').reverse().join('')` on the string it draws — combining it with the bidi pre-shape would double-reverse."* The footer comment now says *"jsPDF's RTL flag reset is no longer needed here — no other code path enables that flag after Phase 23."* The `isRtl` docstring was also updated to remove the stale reference and add a Phase-23 note pointing at `shapeForJsPdf`. All meaning preserved; literal token gone; the strict grep gate now returns 0 as the plan demanded.
- **Files modified:** assets/pdf-export.js
- **Commit:** Same Task 2 commit (11377e4)

### 2. [Rule 2 — Missing critical functionality] Stale `isRtl` docstring updated as part of Phase-23 cleanup

- **Found during:** Task 2 verification (while resolving deviation #1).
- **Issue:** The pre-existing docstring on `isRtl()` at L260–263 said *"Used to decide which font to set + whether to call setR2L(true) for the line being rendered."* — that statement is now factually wrong (the second clause was removed by Phase 23). The plan didn't explicitly ask me to update this docstring, but leaving it would create a documentation lie and would also have failed the strict `setR2L` gate.
- **Fix:** Replaced with an accurate description: font choice + x-anchor only, plus a Phase-23 cross-reference to `shapeForJsPdf`.
- **Files modified:** assets/pdf-export.js
- **Commit:** Same Task 2 commit (11377e4)

### Line-number drift from plan

The plan's L362, L365, L502 references for the three `setR2L` call sites were **byte-exact** against the file at the moment Task 1 began — no drift. After Task 1 added the `_bidi` declaration + the bidi-load step + the two helper functions (≈ 70 inserted lines), the file shifted by that amount, but the Edit tool's anchor matching is line-number-independent so this caused no issues.

## UAT outcome notes (manual)

**Sapir's UAT (Hebrew rendering correctness):** **Pending — to be filled in after Sapir/Ben round-trip post-Wave-3.** This session executes 23-02 → 23-03 → 23-04 → 23-05 and then ships the combined Wave 2 + Wave 3 changeset for UAT in a single round. Per the dispatch plan, manual UAT is held until all of Phase 23's PDF-side changes (bidi pre-shape, margins/centering, regression test, optional footer simplification) are in place, so Sapir evaluates a single coherent surface rather than 4 incremental PDFs.

When the UAT round runs, the test list per the plan's `<verification>` section is:
- Pure Hebrew session renders RTL with correct letter order.
- Mixed Hebrew + ISO date renders with the date in correct position.
- Hebrew bullet list places the bullet on the right edge of the page (per Open Question #1).
- Bracket-mirroring in RTL paragraphs is correct UAX-BD16 behaviour, NOT a bug (G3 — pre-empt the "parens are backwards" question with the Sapir explainer in the round-up message).

**Ben's UAT (Latin no-regression — visual):** **Pending — to be filled in after Sapir/Ben round-trip post-Wave-3.** Byte-level Latin-regression confirmation is 23-04's automated job; Ben's UAT is the final visual sanity check on EN/DE/CS sessions to catch anything 23-04's vector tests don't cover (e.g. font-fallback weirdness, line-break differences in real session content). Latin lines are structurally protected because `shapeForJsPdf` returns Latin input byte-identical (test vectors above confirm this empirically — Pure Latin / German / URLs all pass through unchanged).

## New gotchas discovered during execution

**G13 (new): Plan-author-prescribed inline comments can collide with strict literal-grep gates.** Future plans that REMOVE a named API and want both (a) inline comments documenting the removal AND (b) a `grep -c '<api-name>' == 0` gate must EITHER (a) phrase the comments without the literal API token, OR (b) loosen the gate to `grep -cE '<api-name>\\s*\\(' == 0` (only counts call sites, not mentions). This came up here with `setR2L`. RESEARCH should add this as a meta-gotcha in the gate-authoring section — when a plan transitions a name from "live in code" to "documented-as-removed in comments", the literal grep stops being a useful gate and must shift to a syntactic one.

**G14 (new): bidi.min.js UMD requires both `window` and `self` shims when loaded into Node `vm` for sanity checks.** A naive `vm` setup with only `window` (no `self`) caused `sandbox.window.bidi_js` to be undefined on the second test run (the first run worked because of subtle shim ordering). Adding `self: {}` and `sandbox.self.self = sandbox.self` makes the UMD detection branch land on `window` reliably. Worth noting for 23-04, which will need the same sandbox setup at scale to run the automated test-vector corpus.

## Self-Check: PASSED

- `assets/pdf-export.js` — modified in commits c27a853 + 11377e4. Verified: `git log --oneline assets/pdf-export.js` shows both hashes. **FOUND.**
- Commit c27a853 (Task 1) — `git log --oneline | grep c27a853` returns hit. **FOUND.**
- Commit 11377e4 (Task 2) — `git log --oneline | grep 11377e4` returns hit. **FOUND.**
- All 14 automated gates above re-run and confirmed passing.
- All test-vector spot-checks re-run and confirmed passing.
- No file deletions across either commit (`git diff --diff-filter=D --name-only HEAD~2 HEAD` returns empty).
- This SUMMARY file written to `.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-02-bidi-preshape-and-setR2L-removal-SUMMARY.md`.

## Hand-off to next plan

Plan 23-03 (margins + title centering) can now run. **Both 23-02 and 23-03 modify `assets/pdf-export.js`** so they MUST be sequential within Wave 2 — 23-03 picks up from this commit (`11377e4`) and replaces the title draw (currently at L463–465) with a centered version per D4, preserving the `shapeForJsPdf` call but switching the x-coordinate to the page midpoint and adding `{ align: 'center' }` to the `doc.text()` options.

Wave 3 (23-04 test corpus + Latin regression, 23-05 footer center) can run in parallel after 23-03 lands.

UAT (Sapir + Ben) is held until Wave 3 completes — the round-up message goes out as a single coherent ask covering all Phase 23 PDF changes at once.
