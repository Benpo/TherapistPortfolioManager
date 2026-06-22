---
phase: 23-pdf-export-rewrite-hebrew-rtl-and-layout
plan: 23-12
parent_phase: 23
title: Phase 23 final polish — inline bold rendering, In-person i18n, bracket mirroring restore, mixed fixture
type: execute
wave: 1
depends_on: []
files_modified:
  # Wave 1 (trivial tasks 1-3)
  - assets/pdf-export.js
  - tests/pdf-bidi.test.js
  - assets/i18n-en.js
  - assets/i18n-de.js
  - assets/i18n-he.js
  - assets/i18n-cs.js
  - .planning/fixtures/phase-23/fixture-he-mixed.json
  - .planning/fixtures/phase-23/fixture-he-mixed.pdf.sha256
  - .planning/fixtures/phase-23/fixture-he.pdf.sha256
  - tests/pdf-latin-regression.test.js
  # Wave 2 (inline bold)
  - tests/pdf-bold-rendering.test.js
autonomous: true
requirements:
  - 23-T1
  - 23-T2
  - 23-T3
  - VIZ-02
tags:
  - phase-23
  - pdf
  - bidi
  - i18n
  - bold-rendering
  - regression
  - polish
must_haves:
  truths:
    - "A paragraph containing a `**bold**` inline marker exports a PDF where the marker characters do NOT appear, AND the wrapped text renders in Heebo Bold (weight 700) while surrounding text renders in Heebo Regular. Verified by tests/pdf-bold-rendering.test.js fixture 1 (EN paragraph)."
    - "The same behaviour holds for Hebrew paragraphs (e.g. `**מודגש**`) with correct visual-order positioning: bold word lands at the correct visual position when reading R→L. Verified by tests/pdf-bold-rendering.test.js fixture 2 (HE paragraph)."
    - "Mixed-script lines with bold spanning a bidi boundary (e.g. `**important** דבר חשוב`) render both fonts' glyphs in the correct visual positions. Verified by tests/pdf-bold-rendering.test.js fixture 3."
    - "Hebrew paragraphs containing `(content)` render naturally for an R→L reader: `)` on the visual LEFT and `(` on the visual RIGHT (standard UAX-BD16 mirroring). Verified by tests/pdf-bidi.test.js vector #4 with the restored expectation `המייתסה (הבושח) השיגפה`."
    - "Form-side and PDF-side strings for the in-person session type are identical across all 4 locales: EN 'In-person', DE 'Vor Ort', HE 'פרונטלי', CS 'Osobně'. The dead session.type.inPerson key is removed from all 4 locales."
    - "A Hebrew document containing embedded Latin/English paragraphs anchors every line at the right margin (uniform docDir-driven anchoring from 23-10). Verified by tests/pdf-latin-regression.test.js fixture-he-mixed."
    - "All existing tests still green: pdf-bidi.test.js 12/12, pdf-latin-regression.test.js 5/5 (was 4/4, +fixture-he-mixed), pdf-glyph-coverage.test.js 3/3, pdf-digit-order.test.js 4/4."
  artifacts:
    - path: "assets/pdf-export.js"
      provides: "Extended bidi pipeline (shapeForJsPdfWithMap returning {visual, logicalToVisualMap}), inline bold parser (parseInlineBold), segmented line renderer (drawSegmentedLine), wired into renderBlock for 'para' and 'list' types. Bracket mirroring restored in shapeForJsPdf via getMirroredCharactersMap. parseMarkdown's stripInlineMarkdown helper retained ONLY for the running-header / title-block paths that do not support inline bold."
      contains: "parseInlineBold"
    - path: "tests/pdf-bidi.test.js"
      provides: "12-vector corpus updated: vector #4 and #12 now expect mirrored brackets. The inline shapeForJsPdf copy in this file mirrors the canonical implementation in pdf-export.js (mirror step restored)."
      contains: "getMirroredCharactersMap"
    - path: "tests/pdf-bold-rendering.test.js"
      provides: "New regression test asserting per-glyph font assignment in PDF content stream. 3 fixtures cover EN/HE/mixed-script. Pattern modeled after pdf-digit-order.test.js (JSDOM + Mitigation B pinning, walk Tj/TJ operators, assert which font's glyph subset was used for each emitted GID)."
      contains: "HeeboBold"
    - path: "assets/i18n-en.js"
      provides: "session.form.clinic + session.type.clinic both set to 'In-person'; session.type.inPerson key deleted."
      contains: "In-person"
    - path: "assets/i18n-de.js"
      provides: "session.form.clinic + session.type.clinic both set to 'Vor Ort'; session.type.inPerson key deleted."
      contains: "Vor Ort"
    - path: "assets/i18n-he.js"
      provides: "session.form.clinic + session.type.clinic both set to 'פרונטלי'; session.type.inPerson key deleted."
      contains: "פרונטלי"
    - path: "assets/i18n-cs.js"
      provides: "session.form.clinic + session.type.clinic both set to 'Osobně'; session.type.inPerson key deleted."
      contains: "Osobně"
    - path: ".planning/fixtures/phase-23/fixture-he-mixed.json"
      provides: "Mixed Hebrew + Latin session record (uiLang 'he', docDir 'rtl') exercising docDir-uniform-anchor on embedded Latin lines."
      contains: "uiLang"
    - path: ".planning/fixtures/phase-23/fixture-he-mixed.pdf.sha256"
      provides: "Deterministic baseline hash for fixture-he-mixed, captured via --regenerate after the rest of 23-12 lands."
      contains: ""
    - path: ".planning/fixtures/phase-23/fixture-he.pdf.sha256"
      provides: "Regenerated baseline for fixture-he. Task 1 (bracket mirroring restoration) WILL drift this baseline because fixture-he.json's markdown contains `(body scan)` — a bracket pair that the restored UAX-BD16 mirror map will flip. Task 1 includes regeneration of this baseline as its final action; Task 3's later regeneration must therefore be idempotent for fixture-he (no further drift after Task 1's commit)."
      contains: ""
    - path: "tests/pdf-latin-regression.test.js"
      provides: "Fixture list extended from 4 → 5: ['fixture-en', 'fixture-de', 'fixture-cs', 'fixture-he', 'fixture-he-mixed']. Single-line edit at the fixtures array."
      contains: "fixture-he-mixed"
  key_links:
    - from: "assets/pdf-export.js parseInlineBold()"
      to: "assets/pdf-export.js parseMarkdown() output (para/list block.text)"
      via: "After parseMarkdown produces para/list blocks (stripInlineMarkdown REMOVED from those paths), the rendering loop calls parseInlineBold(text) to produce [{text, bold}] segments which then feed into drawSegmentedLine."
      pattern: "parseInlineBold"
    - from: "assets/pdf-export.js drawSegmentedLine()"
      to: "assets/pdf-export.js shapeForJsPdfWithMap()"
      via: "drawSegmentedLine takes the wrapped logical-order line + its segment metadata, calls shapeForJsPdfWithMap once on the full line to get {visual, logicalToVisualMap}, then derives per-segment visual ranges via the map and emits one doc.text() call per visual run with the appropriate font weight."
      pattern: "shapeForJsPdfWithMap"
    - from: "assets/pdf-export.js shapeForJsPdf()"
      to: "_bidi.getMirroredCharactersMap()"
      via: "The mirroring step removed in commit 20c1b9e is restored: mirrorMap.forEach((mc, idx) => chars[idx] = mc) inserted between the chars.split('') and the flips loop."
      pattern: "getMirroredCharactersMap"
    - from: "assets/pdf-export.js heading branch (L620-L633)"
      to: "assets/pdf-export.js stripInlineMarkdown()"
      via: "Task 4(g) adds a stripInlineMarkdown call at the heading branch entry: previously the heading branch rendered block.text directly (so a heading containing `**foo**` would display literal asterisks); now it strips inline markers so only the prose is rendered in the heading's bold weight."
      pattern: "stripInlineMarkdown"
    - from: "tests/pdf-bold-rendering.test.js"
      to: "assets/fonts/heebo-bold-base64.js"
      via: "Test harness loads heebo-bold-base64.js (already loaded by 23-09 in production), then asserts the bold font's GID subset appears in the content stream for the **bold** segments."
      pattern: "HeeboBold"
    - from: "tests/pdf-latin-regression.test.js"
      to: ".planning/fixtures/phase-23/fixture-he-mixed.json + fixture-he-mixed.pdf.sha256"
      via: "Harness's fixtures array extended to include the new fixture; the rest of the harness logic is unchanged (existing JSDOM + Mitigation B pinning + SHA-256 comparison)."
      pattern: "fixture-he-mixed"
---

<objective>
Finalize Phase 23 with four polish items the iteration loop produced consensus on after 23-11 shipped:

1. **Inline bold rendering (Item 1, Wave 2 — main work, ~80-120 LOC):** when a paragraph or list item contains a `**X**` inline-bold marker, render `X` in Heebo Bold and the rest in Heebo Regular, with correct bidi-aware positioning across mixed-script and RTL lines. Replaces the 23-08 placeholder behaviour where `stripInlineMarkdown()` simply removed the markers without rendering any emphasis. Heebo Bold is already vendored and registered (23-09), so the work is purely in the rendering path: a `parseInlineBold` segmentation pass + a `shapeForJsPdfWithMap` extension that exposes the logical→visual index mapping + a `drawSegmentedLine` renderer that emits one `doc.text()` call per visual run with the correct font weight.

2. **Clinic → In-person i18n alignment (Item 2, Wave 1 — trivial, ~12 lines):** the form-side label (`session.form.clinic`) and the PDF/export-side label (`session.type.clinic`) currently diverge in EN ("Practice" vs "Clinic") and CS ("Praxe" vs "Ordinace"). Lock both labels per locale to a single string ("In-person" / "Vor Ort" / "פרונטלי" / "Osobně"). The dead `session.type.inPerson` key (no radio with value=inPerson exists in any form) is deleted from all 4 locales. Internal value stays `"clinic"` — zero data migration.

3. **Restore UAX-BD16 bracket mirroring (Item 3, Wave 1 — trivial, ~5 lines):** revert commit 20c1b9e's `shapeForJsPdf` mirror-step removal. After this, `(content)` in a Hebrew paragraph renders with `)` on the visual LEFT and `(` on the visual RIGHT — the natural R→L reading, matching Word and `dir="rtl"` browsers. Test vectors #4 and #12 in `pdf-bidi.test.js` update their expectations to the mirrored form. Regenerate `fixture-he.pdf.sha256` baseline (drift IS expected: `fixture-he.json` contains `(body scan)`, which the restored mirror map will flip — see Task 1's regeneration step).

4. **`fixture-he-mixed.json` regression coverage (Item 4, Wave 1 — small):** add a 5th Latin-regression fixture exercising the 23-10 docDir-uniform-anchor behaviour for Hebrew docs containing embedded Latin paragraphs. Existing `fixture-he.json` is pure Hebrew and does not catch regressions to the mixed-content anchor logic.

**Implementation order (locked):** Wave 1 ships all three trivial items in parallel-safe tasks (Tasks 1, 2, 3 below — they touch disjoint files). Wave 2 ships the inline-bold work last (Task 4) so prior atomic commits don't pile on review.

**Cross-task ordering inside Wave 1 (LOCKED):** Tasks 1 and 2 commit FIRST (in parallel — they touch disjoint files). Task 3's `--regenerate` step MUST run AFTER Tasks 1 and 2 have committed, because Task 1 changes the visual output (and therefore the byte hash) of any HE content containing bracket characters, AND Task 1 itself regenerates fixture-he's baseline as its final action. Task 3 then (a) adds fixture-he-mixed and its baseline, (b) re-regenerates Latin-only baselines as a sanity step (expecting NO drift on en/de/cs), and (c) confirms fixture-he's baseline is already at the post-Task-1 value (so Task 3's regeneration is idempotent for fixture-he). Task 3 is the FINAL Wave 1 step.

**Why this is wave 1, not depends_on prior plans:** plans 23-01..23-05 already shipped and their summaries are in this phase directory. Plans 23-06..23-11 shipped as inline hot-fixes without PLAN.md files (see session-prompts handoff). 23-12 is additive — it builds directly on the current state of `assets/pdf-export.js` (HEAD at commit 9c66805) and does not need to wait for any not-yet-completed work. `depends_on: []` is correct.

Purpose: close out Phase 23 with the last UX gap (bold styling), align the In-person label across all surfaces, restore standard bidi bracket behaviour, and harden the regression net for the docDir-uniform-anchor logic.

Output:
- `assets/pdf-export.js` extended with `parseInlineBold`, `shapeForJsPdfWithMap`, `drawSegmentedLine`; mirror step restored in `shapeForJsPdf`.
- `tests/pdf-bidi.test.js` vectors #4 and #12 updated (mirrored brackets); inline `shapeForJsPdf` copy updated to mirror the canonical helper.
- `tests/pdf-bold-rendering.test.js` new — 3 fixtures asserting per-glyph font assignment.
- `tests/pdf-latin-regression.test.js` fixtures array extended.
- 4 i18n files: 3 changes each (update form key, update type key, delete inPerson key).
- New fixture: `.planning/fixtures/phase-23/fixture-he-mixed.json` + `.pdf.sha256`.
- Regenerated `.planning/fixtures/phase-23/fixture-he.pdf.sha256` (drift expected — fixture-he contains `(body scan)`).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md

# Phase 23 source-of-truth
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-CONTEXT.md
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-RESEARCH.md

# Prior summaries (only the ones relevant to this plan's work)
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-08-isinputvisual-and-strip-asterisks-SUMMARY.md
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-09-i18n-bold-headings-SUMMARY.md
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-10-uilang-anchor-and-sections-SUMMARY.md

# Module being modified
@assets/pdf-export.js
@tests/pdf-bidi.test.js
@tests/pdf-digit-order.test.js
@tests/pdf-latin-regression.test.js
@tests/pdf-glyph-coverage.test.js
@.planning/fixtures/phase-23/fixture-he.json
@.planning/fixtures/phase-23/fixture-en.json

# i18n files (all 4, only the 3 affected lines per file)
@assets/i18n-en.js
@assets/i18n-de.js
@assets/i18n-he.js
@assets/i18n-cs.js

<interfaces>
<!-- bidi-js API surface (already vendored at assets/bidi.min.js, factory cached in _bidi at module scope). Confirmed present in the minified source by tools/grep at planning time. -->

From assets/bidi.min.js (UMD attaches factory to window.bidi_js):
  bidi.getEmbeddingLevels(text, explicitDir?) -> { levels: Uint8Array, paragraphs: [{start, end, level}] }
  bidi.getReorderSegments(text, levels, start?, end?) -> Array<[startIdx, endIdx]>  // inclusive ranges to reverse
  bidi.getReorderedIndices(text, levels, start?, end?) -> Array<number>             // i[visualPos] = logicalPos. THIS is the clean logical-to-visual map primitive.
  bidi.getMirroredCharactersMap(text, levels, start?, end?) -> Map<number, string>  // code-unit idx -> mirrored char (for brackets in RTL runs)
  bidi.getBidiCharTypeName(ch) -> 'L'|'R'|'AL'|'EN'|'AN'|'NSM'|'ON'|...             // used by firstStrongDir
  bidi.getReorderedString(text, levels, start?, end?) -> string                      // visual-order string (combines reorder + mirror in one call)

<!-- Existing canonical helpers in assets/pdf-export.js (Plan 23-02, 23-11 modified): -->
function firstStrongDir(text) -> 'ltr'|'rtl'                                          // L209-L226
function shapeForJsPdf(text) -> string                                                // L227-L270 — CURRENTLY MISSING the mirror step (removed by 20c1b9e). Task 1 restores it.

<!-- Existing renderer code structure (function names + line numbers): -->
function parseMarkdown(markdown) -> Array<{type: 'heading'|'list'|'para'|'blank', ...}>  // L311; stripInlineMarkdown invoked at L338, L359
function stripInlineMarkdown(text) -> string                                              // L301-L309 — KEPT for running-header / title-block; REMOVED from para/list call sites by Task 4.
function drawTextLine(line, y, size, weight) -> void                                      // L508-L531; called by heading + para branches
function drawPage1Header() -> y                                                            // L537-L571 — uses shapeForJsPdf directly on clientName; does NOT need bold-inline support
function drawRunningHeader() -> void                                                       // L573-L595 — uses shapeForJsPdf directly; does NOT need bold-inline support
// Per-block render loop: L612-L694 (para branch L682-L693, list branch L636-L679, heading branch L620-L633)

<!-- Heebo font GID subsets (measured in tests/pdf-glyph-coverage.test.js + tests/pdf-digit-order.test.js): -->
// Regular weight is registered via setFont('Heebo', 'normal') -> jsPDF emits glyphs from one GID space.
// Bold weight is registered as the SAME family 'Heebo' with style='bold' -> jsPDF emits glyphs from a SEPARATE
// GID space (different font subset object in the PDF). Test must distinguish the two by checking which
// /Font resource the Tf operator selected before each Tj/TJ run.

<!-- File header in i18n-en.js around the relevant keys (line numbers from grep at planning time): -->
// L97:  "session.form.clinic": "Practice",   <- target: "In-person"
// L214: "session.type.clinic": "Clinic",      <- target: "In-person"
// L216: "session.type.inPerson": "In Person", <- DELETE this line
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Restore UAX-BD16 bracket mirroring in shapeForJsPdf (revert of 23-11 fix 1)</name>
  <files>assets/pdf-export.js, tests/pdf-bidi.test.js, .planning/fixtures/phase-23/fixture-he.pdf.sha256</files>
  <read_first>
    - assets/pdf-export.js L240-L270 (current shapeForJsPdf with mirror step REMOVED; comment block at L249-L253 says "intentionally DISABLED")
    - tests/pdf-bidi.test.js L90-L124 (current inline shapeForJsPdf copy + VECTORS array; vector #4 expects 'המייתסה )הבושח( השיגפה' i.e. UNMIRRORED brackets, vector #12 expects 'ןאכ ]important[ םושיר')
    - The 11-line diff of commit 20c1b9e (run `git show 20c1b9e -- assets/pdf-export.js tests/pdf-bidi.test.js`) to see EXACTLY which lines were removed.
    - .planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-RESEARCH.md "Worked example" section (L109-L156) and "G3" gotcha (L417-L419) — the canonical bidi+mirror implementation pattern.
    - **.planning/fixtures/phase-23/fixture-he.json** — confirmed at planning time to contain `(body scan)` in the markdown body (the third `## הערות נוספות` paragraph). This bracket pair WILL be flipped by the restored mirror map, so fixture-he's PDF byte hash WILL drift. Task 1 must therefore regenerate `fixture-he.pdf.sha256` as its final action (see action step (f) below).
  </read_first>
  <action>
Restore the bracket-mirroring step in `shapeForJsPdf` (canonical helper at `assets/pdf-export.js` L257-L270). Concrete edits:

(a) In `assets/pdf-export.js` `shapeForJsPdf`:
  - After the line `var flips = _bidi.getReorderSegments(text, levels);` add the line: `var mirrorMap = _bidi.getMirroredCharactersMap(text, levels);`
  - After `var chars = text.split('');` add the mirror application loop (matching the pre-20c1b9e code shape): `mirrorMap.forEach(function (mirroredChar, idx) { chars[idx] = mirroredChar; });`
  - Loop ordering: mirror BEFORE flips (matches the RESEARCH "Worked example" at 23-RESEARCH.md L142-L150 and the pre-23-11 implementation). The mirror map's indices reference logical positions; mutating chars at those indices BEFORE the reverse pass ensures the mirrored character is then placed in the correct VISUAL position by the reorder step.

(b) Update the comment block in `shapeForJsPdf` (currently L246-L256). Replace the "Phase 23 (23-11): bracket mirroring (UAX-BD16) is intentionally DISABLED..." paragraph with a paragraph stating mirroring is RESTORED in 23-12 for natural R→L reading. Reference Plan 23-12 by ID. Reference RESEARCH G3 (mirroring is a visual feature, not a bug). Also include a one-sentence "human driver" note citing why 23-11's removal is reverted: **"Reverting 23-11's removal: Sapir's UAT preference matches standard UAX-BD16 for native Hebrew readers."** (per W1, this records the human rationale for the policy reversal so future readers don't re-litigate the decision).

(c) In `tests/pdf-bidi.test.js`:
  - Inline copy of `shapeForJsPdf` (L90-L105 in the test file) MUST match the canonical helper byte-for-byte. Update the inline copy with the same mirror restoration. Update the L91-L92 comment from "Phase 23 (23-11): bracket mirroring intentionally disabled" to "Phase 23 (23-12): bracket mirroring restored per UAX-BD16 — matches Word/dir=rtl browsers (Sapir's UAT preference for native HE readers)."
  - VECTORS array (L111-L124): update vector #4 expected from `'המייתסה )הבושח( השיגפה'` to `'המייתסה (הבושח) השיגפה'`. Update vector #4 label from "Hebrew + brackets unmirrored (23-11)" to "Hebrew + brackets mirrored (23-12, UAX-BD16)".
  - Update vector #12 expected from `'ןאכ ]important[ םושיר'` to `'ןאכ [important] םושיר'`. Update vector #12 label from "Hebrew + square brackets (unmirrored)" to "Hebrew + square brackets (mirrored)".
  - Visual rationale (recheck before committing): the round bracket pair `(...)` and the square bracket pair `[...]` are both in `getMirroredCharactersMap`'s coverage. After mirroring, the OPENING bracket flips to the CLOSING glyph and vice versa, AT THE SAME LOGICAL INDEX. The reorder pass then swaps the two indices into visual positions. End state for vector #4: visual reads (right→left for an R→L reader) `(הבושח)` — opener on the visual right, closer on the visual left — which when serialized L-to-R becomes `(הבושח)`. Note the parens look identical to the input form but the VISUAL/glyph identities are swapped relative to the unmirrored output `)הבושח(`.

(d) Do NOT touch the running header or title-block code paths — they call `shapeForJsPdf` and pick up the mirror restoration transparently.

(e) Service worker cache bump: do NOT manually edit `sw.js`. The repo's pre-commit hook auto-bumps `CACHE_NAME` on every asset commit (per project CLAUDE.md). The bump is automatic; verify after commit that `sw.js` shows the version bumped by the hook.

(f) **Regenerate `fixture-he.pdf.sha256` baseline (FINAL ACTION of Task 1).** `fixture-he.json` contains `(body scan)` in the third paragraph (confirmed in read_first). With Task 1's mirror restoration, those parens will flip glyph identities in the visual stream → the PDF byte output for fixture-he will change → its SHA-256 hash will drift from the current baseline. Run `node tests/pdf-latin-regression.test.js --regenerate` AFTER the code edits in (a)-(c) land and after `node tests/pdf-bidi.test.js` passes 12/12. This will rewrite `fixture-he.pdf.sha256` to the post-mirror-restoration baseline. Inspect the diff:
  ```
  git diff .planning/fixtures/phase-23/fixture-he.pdf.sha256
  ```
  Expected: hash CHANGES. Also inspect en/de/cs hashes — they must NOT change (no Hebrew = no bidi/mirror path exercised). If en/de/cs drift, that's a red flag — investigate before committing. Note: Task 3's later `--regenerate` will see fixture-he's baseline already at the post-Task-1 value and be idempotent for that file.
  </action>
  <verify>
    <automated>node tests/pdf-bidi.test.js && node tests/pdf-latin-regression.test.js  # bidi MUST pass 12/12 with updated vector #4 + #12 expectations; latin-regression MUST pass 4/4 against the regenerated fixture-he baseline (fixture-he-mixed is added in Task 3, not yet present here)</automated>
  </verify>
  <acceptance_criteria>
    - `grep -v '^[[:space:]]*//' assets/pdf-export.js | grep -c 'getMirroredCharactersMap'` returns >= 1 (was 0 after 20c1b9e; comment-stripped count to avoid the comment-block self-match).
    - `grep -c 'mirrorMap.forEach' assets/pdf-export.js` returns >= 1.
    - `grep -c '23-12' assets/pdf-export.js` returns >= 1 (the new comment references the plan ID).
    - `grep -F "Sapir's UAT preference" assets/pdf-export.js` matches at least once (the human-driver rationale, per W1).
    - `node tests/pdf-bidi.test.js` exits 0 and prints `Passed 12/12, Failed 0/12.`
    - `grep -F 'Hebrew + brackets mirrored (23-12, UAX-BD16)' tests/pdf-bidi.test.js` matches.
    - `grep -F 'המייתסה (הבושח) השיגפה' tests/pdf-bidi.test.js` matches (vector #4 expected string).
    - `grep -F 'ןאכ [important] םושיר' tests/pdf-bidi.test.js` matches (vector #12 expected string).
    - Inline `shapeForJsPdf` copy in `tests/pdf-bidi.test.js` is byte-identical to the canonical one in `assets/pdf-export.js` for the body (comments may differ in wording but the logic must match exactly; verify via `diff <(sed -n '/function shapeForJsPdf/,/^}/p' assets/pdf-export.js) <(sed -n '/function shapeForJsPdf/,/^}/p' tests/pdf-bidi.test.js)` — the function body lines must be identical excluding inline comments).
    - `git diff .planning/fixtures/phase-23/fixture-he.pdf.sha256` shows the hash CHANGED (drift IS expected because `fixture-he.json` contains `(body scan)`).
    - `git diff .planning/fixtures/phase-23/fixture-en.pdf.sha256 .planning/fixtures/phase-23/fixture-de.pdf.sha256 .planning/fixtures/phase-23/fixture-cs.pdf.sha256` shows NO byte changes (Latin fixtures must not be affected).
    - `node tests/pdf-latin-regression.test.js` exits 0 with `Passed 4/4, Failed 0/4.` after the regeneration (fixture-he-mixed is not yet added at this task's commit point; Task 3 extends to 5/5).
  </acceptance_criteria>
  <done>shapeForJsPdf restores UAX-BD16 mirroring; bidi corpus passes 12/12 with mirrored-bracket expectations; fixture-he baseline regenerated to reflect the new mirrored output for `(body scan)`; Latin-only baselines unchanged; pre-commit hook auto-bumps sw.js CACHE_NAME on commit.</done>
</task>

<task type="auto">
  <name>Task 2: Clinic → In-person i18n alignment across 4 locales</name>
  <files>assets/i18n-en.js, assets/i18n-de.js, assets/i18n-he.js, assets/i18n-cs.js</files>
  <read_first>
    - assets/i18n-en.js L95-L100 + L210-L220 (context for the 3 affected keys)
    - assets/i18n-de.js L95-L100 + L210-L220
    - assets/i18n-he.js L95-L100 + L210-L220
    - assets/i18n-cs.js L95-L100 + L210-L220
    - .planning/STATE.md L170-L172 (mentioning the dead inPerson/proxy/surrogate type cleanup from Phase 19 UAT for context)
  </read_first>
  <action>
Apply EXACTLY these 3 changes per locale (12 line edits total — 3 per file × 4 files):

For each of the 4 i18n files, the changes follow this pattern (showing target values per locale):

| File | L97 (session.form.clinic) | L214 (session.type.clinic) | L216 (session.type.inPerson) |
|------|---------------------------|----------------------------|------------------------------|
| assets/i18n-en.js | `"In-person"` (was "Practice") | `"In-person"` (was "Clinic") | DELETE THE LINE |
| assets/i18n-de.js | `"Vor Ort"` (was "Praxis") | `"Vor Ort"` (was "Praxis") | DELETE THE LINE |
| assets/i18n-he.js | `"פרונטלי"` (was "קליניקה") | `"פרונטלי"` (was "קליניקה") | DELETE THE LINE |
| assets/i18n-cs.js | `"Osobně"` (was "Praxe") | `"Osobně"` (was "Ordinace") | DELETE THE LINE |

Important:
- Do NOT change the JSON key names (`session.form.clinic`, `session.type.clinic`); only the values.
- The internal value stored in the DB stays `"clinic"` — no migration. Existing sessions with `sessionType: "clinic"` will now display as "In-person" / "פרונטלי" / etc. via the i18n lookup.
- Hebrew "פרונטלי" is the gender-neutral form per the project Hebrew convention (noun/infinitive, not gender-marked) — confirmed in context as the locked target.
- After deletion of `session.type.inPerson`, ensure the surrounding key block remains valid JS/JSON-of-keys (no trailing comma in the JSON object after the last preserved key; check the file's structure with a syntax read after the edit).

Do NOT touch any other key in any of these 4 files. The diff per file should be exactly 3 lines (2 modified, 1 deleted).
  </action>
  <verify>
    <automated>node -e "['en','de','he','cs'].forEach(function(l){var p=require('path').join('assets','i18n-'+l+'.js');var src=require('fs').readFileSync(p,'utf8');var form=src.match(/\"session\.form\.clinic\":\s*\"([^\"]+)\"/);var type=src.match(/\"session\.type\.clinic\":\s*\"([^\"]+)\"/);var inPerson=src.match(/\"session\.type\.inPerson\"/);if(!form||!type)throw new Error(l+': missing key');if(form[1]!==type[1])throw new Error(l+': mismatch form='+form[1]+' type='+type[1]);if(inPerson)throw new Error(l+': inPerson key STILL present, must be deleted');console.log(l+': '+form[1]+' OK')})"</automated>
  </verify>
  <acceptance_criteria>
    - The single-line node verify above prints exactly 4 lines, one per locale, each ending in ` OK`, and exits 0.
    - `grep -c 'session.type.inPerson' assets/i18n-en.js assets/i18n-de.js assets/i18n-he.js assets/i18n-cs.js` returns 0 across all 4 files.
    - `grep -F 'In-person' assets/i18n-en.js` matches at exactly the two intended key locations (form + type).
    - `grep -F 'Vor Ort' assets/i18n-de.js` matches at exactly the two intended key locations.
    - `grep -F 'פרונטלי' assets/i18n-he.js` matches at exactly the two intended key locations.
    - `grep -F 'Osobně' assets/i18n-cs.js` matches at exactly the two intended key locations.
    - All 4 files parse without syntax error: `node --check assets/i18n-en.js && node --check assets/i18n-de.js && node --check assets/i18n-he.js && node --check assets/i18n-cs.js` all exit 0. (Per W3: these are browser-global files, not CommonJS modules; `require()` is invalid for them — use `node --check` only.)
    - No other strings in the 4 files changed: `git diff --stat assets/i18n-*.js` shows exactly 4 files modified with at most **20 lines changed in --stat output** across all 4 files (per W2: --stat reports insertions+deletions per file; per file we expect 2 modified lines = 2 insertions + 2 deletions, plus 1 deleted line = 1 deletion, total 5 changes × 4 files = 20). The grep-based assertions above cover the substance of WHAT changed; this assertion just bounds the breadth.
  </acceptance_criteria>
  <done>All 4 i18n files have aligned form/type clinic labels per the locked decision; the dead inPerson key is removed; per-locale syntax is valid; the in-product UAT (Sapir + Ben opening the form on each language) will confirm the new label appears in both the form radio and the PDF export — that confirmation is a Phase 23 close-out UAT step, not part of this task's automated gate.</done>
</task>

<task type="auto">
  <name>Task 3: fixture-he-mixed.json regression + final Wave 1 baseline pass (depends on Tasks 1 + 2 commits landing first)</name>
  <files>.planning/fixtures/phase-23/fixture-he-mixed.json, .planning/fixtures/phase-23/fixture-he-mixed.pdf.sha256, .planning/fixtures/phase-23/fixture-he.pdf.sha256, tests/pdf-latin-regression.test.js</files>
  <read_first>
    - .planning/fixtures/phase-23/fixture-he.json (the existing pure-Hebrew fixture — used as a structural template)
    - .planning/fixtures/phase-23/fixture-en.json (Latin-only structure — used to derive the embedded Latin paragraph)
    - .planning/fixtures/phase-23/README.md (regeneration protocol)
    - tests/pdf-latin-regression.test.js (entire file — pay attention to the fixtures array at L205 and the --regenerate handling at L222-L226)
    - .planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-10-uilang-anchor-and-sections-SUMMARY.md (the docDir-uniform-anchor behaviour being regression-covered here)
  </read_first>
  <action>
**Ordering precondition (LOCKED):** Task 3 runs AFTER Tasks 1 and 2 have committed. Task 1 commits change the visual output of HE content containing brackets (and Task 1 itself regenerates fixture-he's baseline). Task 3 is therefore the FINAL Wave 1 step — if Tasks 1 and 2 have not yet committed, ABORT and surface the ordering violation. Verify before starting: `git log --oneline -10 | grep -E '23-12.*(Task 1|Task 2|mirror|i18n|In-person)'` should show both Task 1 and Task 2 commits.

(a) Create `.planning/fixtures/phase-23/fixture-he-mixed.json` modeled on `fixture-he.json`. Required structure:

  - `sessionData.clientName`: "דנה כהן" (same as fixture-he for consistency)
  - `sessionData.sessionDate`: "2026-05-08"
  - `sessionData.sessionType`: "קליניקה"   (raw value, not the i18n-resolved label — this matches fixture-he's pattern; the docDir-uniform-anchor regression is independent of the Task 2 i18n rename)
  - `sessionData.markdown`: a 3-paragraph body interleaving Hebrew and English:
    1. First paragraph: Hebrew prose (one paragraph from fixture-he is fine — e.g. the opening "דנה הגיעה לפגישה..." block, ~80-120 chars; do NOT include any `**` bold markers — Task 4 covers bold rendering and this fixture must be insensitive to that; ALSO do NOT include any bracket characters — keep this fixture insensitive to Task 1's mirror restoration so its baseline depends only on the docDir-uniform-anchor logic).
    2. Second paragraph: pure English ("Anna mentioned that she has been reading 'Atomic Habits' by James Clear and finds the concept of habit stacking useful. We discussed how to apply the 1% improvement principle to her morning routine.").
    3. Third paragraph: Hebrew prose again (the closing paragraph from fixture-he is fine — ~80-120 chars; same constraints: no `**`, no brackets).
    Separator between paragraphs: `\n\n` (blank line, per parseMarkdown's block boundary).
  - `opts.uiLang`: "he"  ← THIS is the key invariant. With uiLang='he', docDir resolves to 'rtl' (see pdf-export.js L438), so EVERY line — including the embedded English paragraph — must anchor at the right margin. That's the regression this fixture catches: if a future change reverts the 23-10 docDir-uniform-anchor and goes back to per-line isRtl() anchoring, the English paragraph would jump to the left margin and the byte hash would drift.

(b) Edit `tests/pdf-latin-regression.test.js` L205 fixtures array. Change:
  ```
  var fixtures = ['fixture-en', 'fixture-de', 'fixture-cs', 'fixture-he'];
  ```
  to:
  ```
  var fixtures = ['fixture-en', 'fixture-de', 'fixture-cs', 'fixture-he', 'fixture-he-mixed'];
  ```
  Also update the comment block above (currently L201-L204 mentions "the 3 Latin fixtures") to mention 5 fixtures total: 3 Latin + 1 Hebrew + 1 mixed-Hebrew.

(c) Regenerate the baseline hash for `fixture-he-mixed` (and re-confirm all other baselines as a sanity step):
  ```
  node tests/pdf-latin-regression.test.js --regenerate
  ```
  This writes `.planning/fixtures/phase-23/fixture-he-mixed.pdf.sha256` (single-line lowercase 64-char hex + newline). It will also REWRITE the 4 existing `.sha256` files with the current hashes. Inspect the diff after regeneration:
  ```
  git diff .planning/fixtures/phase-23/*.pdf.sha256
  ```
  Expected state:
  - `fixture-he-mixed.pdf.sha256` is NEW (creation).
  - `fixture-he.pdf.sha256` is IDEMPOTENT — byte-identical to its Task-1-regenerated value (no diff). Task 1 already rewrote this baseline to the post-mirror value; Task 3's `--regenerate` should produce the same hash.
  - `fixture-en.pdf.sha256`, `fixture-de.pdf.sha256`, `fixture-cs.pdf.sha256` are byte-identical to pre-regeneration (no Hebrew = no bidi/mirror path exercised; harness rewrites the same bytes).
  - If ANY of en/de/cs/he-non-mixed DRIFT, that's a red flag — investigate before committing.

(d) Confirm regression pass:
  ```
  node tests/pdf-latin-regression.test.js
  ```
  Must print `Passed 5/5, Failed 0/5.` and exit 0.

(e) Update `.planning/fixtures/phase-23/README.md`: add a single-line bullet describing fixture-he-mixed.json's purpose (docDir-uniform-anchor regression for Hebrew docs with embedded Latin content). Do NOT rewrite the README structure — append to the existing fixture list.
  </action>
  <verify>
    <automated>node tests/pdf-latin-regression.test.js   # MUST exit 0 with Passed 5/5</automated>
  </verify>
  <acceptance_criteria>
    - `ls .planning/fixtures/phase-23/fixture-he-mixed.json` exists.
    - `ls .planning/fixtures/phase-23/fixture-he-mixed.pdf.sha256` exists and contains exactly 64 lowercase hex chars + a trailing newline.
    - `grep -F 'fixture-he-mixed' tests/pdf-latin-regression.test.js` matches at least once (the fixtures array).
    - `node -e "var j=require('./.planning/fixtures/phase-23/fixture-he-mixed.json'); if (j.opts.uiLang !== 'he') throw new Error('uiLang must be he'); if (!j.sessionData.markdown.match(/[a-zA-Z]/) || !j.sessionData.markdown.match(/[֐-׿]/)) throw new Error('markdown must contain BOTH Latin and Hebrew chars'); if (j.sessionData.markdown.match(/[()\[\]{}]/)) throw new Error('markdown must NOT contain brackets (keep fixture independent of Task 1 mirror restoration)'); if (j.sessionData.markdown.match(/\*\*/)) throw new Error('markdown must NOT contain ** markers (keep fixture independent of Task 4 inline-bold)'); console.log('OK')"` prints `OK` and exits 0.
    - `node tests/pdf-latin-regression.test.js` exits 0 and prints `Passed 5/5, Failed 0/5.`
    - `git diff .planning/fixtures/phase-23/fixture-en.pdf.sha256 .planning/fixtures/phase-23/fixture-de.pdf.sha256 .planning/fixtures/phase-23/fixture-cs.pdf.sha256` shows NO byte changes (the Latin fixtures must not be affected).
    - `git diff .planning/fixtures/phase-23/fixture-he.pdf.sha256` shows NO byte changes (Task 1 already wrote the post-mirror hash; Task 3's regeneration must be idempotent for this file).
    - `grep -F 'fixture-he-mixed' .planning/fixtures/phase-23/README.md` matches at least once.
  </acceptance_criteria>
  <done>fixture-he-mixed regression added; 5/5 Latin regression passes; the Latin-only baselines are unchanged; fixture-he's baseline is idempotent (Task 1 set it, Task 3 confirms). Task 3 is the final Wave 1 step.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Inline bold rendering — parseInlineBold + shapeForJsPdfWithMap + drawSegmentedLine + new regression test</name>
  <files>assets/pdf-export.js, tests/pdf-bold-rendering.test.js</files>
  <read_first>
    - assets/pdf-export.js (entire file — L1-L737) — required because this task introduces three new helpers and rewires two existing call sites (para branch L682-L693, list branch L636-L679)
    - tests/pdf-digit-order.test.js (entire file — the pattern this new test mirrors most closely: JSDOM + Mitigation B pinning, walking Tj/TJ operators in the content stream, asserting WHICH glyphs were emitted)
    - tests/pdf-glyph-coverage.test.js L1-L80 (read the header docblock + the CID measurement methodology — this test's font-discrimination assertion uses the same approach)
    - .planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-RESEARCH.md L109-L156 ("Worked example" — bidi pipeline reference)
    - .planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-RESEARCH.md L186-L252 (Integration Pipeline + Where exactly does the bidi pre-shape sit?)
    - .planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-08-isinputvisual-and-strip-asterisks-SUMMARY.md (the current `stripInlineMarkdown` behaviour being replaced; the isInputVisual:false invariant that every doc.text call must preserve)
    - .planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-09-i18n-bold-headings-SUMMARY.md (confirms Heebo Bold is registered as setFont('Heebo','bold') — Task 4 inherits this registration; no font-registration work needed)
    - assets/bidi.min.js: locate the exported names `getReorderedIndices` and `getMirroredCharactersMap` (already vendored; planning-time grep confirmed both are exposed on the bidi factory output)
  </read_first>
  <behavior>
    EN paragraph fixture: input markdown `"The session **summary** is below."`. Expected behavior:
      - The literal `**` markers must NOT appear in the PDF.
      - The word `summary` must be emitted using the Heebo BOLD font subset (different /Font resource than the surrounding Regular subset).
      - The words `The session`, ` is below.` must be emitted using the Heebo REGULAR font subset.
      - The bold word position must be consistent with LTR reading order.

    HE paragraph fixture: input markdown `"הסיכום **מודגש** כאן."`. Expected behavior:
      - The literal `**` markers must NOT appear.
      - The Hebrew word `מודגש` must be emitted using the Heebo BOLD font subset.
      - The surrounding Hebrew text must be emitted using the Heebo REGULAR font subset.
      - With uiLang='he' (docDir='rtl'), the visual line must read right-to-left correctly. The bold word lands at its bidi-correct visual position — NOT at the right edge (where the logical start of the line sits visually), but in the middle, where `מודגש` would land after UAX-L2 reorders the line.

    Mixed-script fixture: input markdown `"**important** דבר חשוב"` with uiLang='he'. Expected behavior:
      - `important` (Latin) emitted in Heebo BOLD.
      - `דבר חשוב` (Hebrew) emitted in Heebo REGULAR.
      - Visual order respects bidi: the LTR run "important" stays internally L-to-R, the Hebrew run reverses; the OVERALL paragraph anchors at the right margin (docDir='rtl').

    All three fixtures: zero literal asterisk glyphs in the page-1 content stream (the asterisk GID in Heebo, measured once at MEASURE_MODE, must NOT appear among the emitted CIDs).
  </behavior>
  <action>
**Implementation strategy (LOCKED before writing code — derived from RESEARCH and the vendored bidi-js API surface):**

The core technical challenge — bidi reordering operates on the whole line — is solved by exploiting bidi-js's `getReorderedIndices` primitive, which returns an array `idx` where `idx[visualPos] = logicalPos`. This gives us the clean logical→visual mapping the task brief asked for, WITHOUT manual reconstruction from raw reorderSegments.

**Segment shape (LOCKED — addresses B2):** `parseInlineBold` returns segments shaped as `[{text: string, bold: boolean}]` — NO `logicalStart`/`logicalEnd` fields. Rationale: explicit logical indices on segments are redundant and error-prone given that `splitTextToSize` can collapse spaces and split on hyphens/ZWSP. Instead, the renderer walks segments with a running character offset derived from `segment.text.length`, and clips against the wrapped sub-line by re-walking the segment array character-by-character. **Invariant (provable in code):** concatenating all `segment.text` values yields `stripInlineMarkdown(input)` byte-for-byte. Any code that needs a logical position derives it by accumulating prior segments' `.text.length`.

The pipeline is:
1. Logical-order line + segment metadata `[{text, bold}]` arrives at the renderer (already clipped to the wrapped sub-line).
2. Run `_bidi.getEmbeddingLevels(line, dir)` → `levels`.
3. Run `_bidi.getMirroredCharactersMap(line, levels)` → mirror chars (Task 1 restored mirroring; this task uses the same primitive).
4. Run `_bidi.getReorderedIndices(line, levels)` → `idx[]`.
5. Mutate the char array: apply mirror substitutions at their LOGICAL indices (same step Task 1 added to shapeForJsPdf).
6. Build the visual-order string by walking idx[]: `visual = idx.map(logicalI => chars[logicalI]).join('')`.
7. Build a logical-position → weight map by walking segments with a running offset: `weightByLogical = new Uint8Array(line.length); var off = 0; segments.forEach(s => { for (var k = 0; k < s.text.length; k++) weightByLogical[off + k] = s.bold ? 1 : 0; off += s.text.length; });`. Then for each VISUAL position `vp` in 0..n-1, the weight is `weightByLogical[idx[vp]]`.
8. Walk visual positions left-to-right, collecting maximal contiguous runs where the weight does not change. Each run becomes one `doc.text()` call with the appropriate setFont weight.
9. Position math: precompute the total visual width by running `doc.getStringUnitWidth(visual) * fontSize` for the WHOLE visual line (recall RESEARCH G7: glyph advance widths are identical in logical and visual order, so this is well-defined). For RTL docs, leftmost x = `PAGE_W - MARGIN_X - totalVisualWidth`; for LTR docs, leftmost x = `MARGIN_X`. Walk runs left-to-right starting at leftmost x; after each run, advance x by `doc.getStringUnitWidth(runText) * fontSize`. CRITICAL: weight changes affect width measurement — measure each run's width AFTER setting that run's font weight (because Heebo Bold has different per-glyph advance widths than Heebo Regular). Equivalent total-width calc: sum per-run widths under their correct weights, then back out leftmost x as `PAGE_W - MARGIN_X - sum_run_widths` for RTL.
10. Pass `{ isInputVisual: false }` to every `doc.text()` call (per 23-08 invariant — verified by `tests/pdf-digit-order.test.js`).

**Concrete code structure (3 new helpers + 1 rewire):**

(a) Add helper `parseInlineBold(text)` near the existing `stripInlineMarkdown` (around L301-L309):
    Returns `[{text: string, bold: boolean}]` — segment shape per the locked decision above. **No `logicalStart`/`logicalEnd` fields.**
    Implementation: scan for `**X**` substrings via the same regex as `stripInlineMarkdown` (`/\*\*([^*\n]+?)\*\*/g`) but emit segments instead of stripping. Italic `*X*` is still stripped (not rendered) — italic support is OUT OF SCOPE for this plan; the function MUST also strip italic markers from the segment.text so they don't display literally. **Invariant (assert in unit-test-style code at the call site):** `segments.map(s => s.text).join('')` equals `stripInlineMarkdown(input)` byte-for-byte. This invariant is what makes "running offset" indexing work later: the renderer derives any logical position by accumulating `segment.text.length` values from the start of the segment array.

(b) Add helper `shapeForJsPdfWithMap(text)` next to `shapeForJsPdf`:
    Returns `{ visual: string, logicalToVisualMap: Int32Array }` where `logicalToVisualMap[logicalIdx] = visualIdx`. Implementation: call `_bidi.getEmbeddingLevels`, `_bidi.getMirroredCharactersMap`, `_bidi.getReorderedIndices`. Mutate the chars array for mirrors (matching shapeForJsPdf's Task 1 behaviour). Build `visual` by walking the reordered indices. Build the inverse map: `logicalToVisualMap = new Int32Array(text.length); reorderedIndices.forEach((logicalI, visualI) => { logicalToVisualMap[logicalI] = visualI; });`. shapeForJsPdf stays as-is — this is an ADDITIVE helper, not a replacement (shapeForJsPdf still serves the title-block, running-header, and heading paths which have no inline-bold segments).

(c) Add helper `drawSegmentedLine(segments, y, size)` near `drawTextLine` (L508):
    `segments` is the array produced by `parseInlineBold` on a WRAPPED logical-order line. Per the strategy above:
    - Reconstruct the logical line: `var line = segments.map(s => s.text).join('');`.
    - Build the logical→weight Uint8Array by walking segments with a running offset (see pipeline step 7 above).
    - Call `shapeForJsPdfWithMap(line)` → `{visual, logicalToVisualMap}`. Invert via reorderedIndices to get visual→logical lookup (or store both maps from the helper).
    - Derive per-visual-position weight; collapse to maximal runs; emit one `doc.text()` per run with `{align, isInputVisual: false}` and the appropriate setFont weight.
    - For RTL docs use `align: 'right'` and compute the rightmost x once (= `PAGE_W - MARGIN_X`), then walk runs LEFT-to-RIGHT in visual order starting from `rightmost - totalVisualWidth`; for LTR docs use `align` omitted (defaults to 'left') and start at `MARGIN_X`.
    - Each run after the first uses the same y but x advances by the prior run's measured width.

(d) Rewire the para branch (L682-L693): replace the `var paraLines = doc.splitTextToSize(block.text, USABLE_W);` + `drawTextLine(paraLines[pi], y, BODY_SIZE);` loop with:
    1. Pre-parse: `var paraSegments = parseInlineBold(block.text);` once at block top.
    2. Reconstruct the strip-equivalent text: `var stripped = paraSegments.map(s => s.text).join('');`. **Assert at runtime in dev mode (or via a one-time console assert):** `stripped === stripInlineMarkdown(block.text)`. This is the invariant from (a).
    3. **Step 1 proof gate (LOCKED — addresses B1):** BEFORE writing any rendering code in step 5 below, validate splitTextToSize's behavior on all three test fixtures (EN, HE, mixed). Concretely:
       - For each fixture's stripped text, call `doc.splitTextToSize(stripped, USABLE_W)` → `subLines[]`.
       - Round-trip check: join `subLines` with a single space (i.e. `subLines.join(' ')`) — call this `rejoinedSpace` — and also with `'\n'` — call this `rejoinedNewline`. Compute `stripped.replace(/\s+/g, ' ').trim()` as `normalizedStripped`.
       - **Accept condition:** at least one of `rejoinedSpace === normalizedStripped` OR `rejoinedNewline.replace(/\n/g, ' ') === normalizedStripped` holds for ALL THREE fixtures, with the only permitted differences being (i) collapsed runs of multiple spaces to single spaces, and (ii) trimmed trailing whitespace per sub-line. No other transformation is acceptable for the "advance offset by `subLine.length + 1`" heuristic to be safe.
       - **Reject condition:** if EVEN ONE fixture exhibits non-round-trippable wrap (e.g. splitTextToSize splits on a hyphen mid-word, or inserts a ZWSP, or breaks on a character that wasn't whitespace in the input), STOP and ESCALATE BEFORE writing renderer code. Return to the orchestrator with `## CHECKPOINT REACHED` containing: (i) the failing fixture, (ii) the input string, (iii) the unexpected sub-line output, (iv) the proposed fallback: **"rewrap segment-by-segment in logical order: for each segment, run `doc.splitTextToSize(segment.text, remainingWidth)` independently, accept different wrap points than monolithic splitTextToSize would produce, and stitch the per-segment sub-lines into composite lines. This trades wrap-point exactness against round-trip safety."** Do NOT proceed to step 5 without orchestrator approval of the fallback.
       - The proof gate output is a one-time print at task start under `MEASURE_MODE=1` (same flag the bold-rendering test uses for its asterisk-GID measurement). Capture the three sub-line lists in the task SUMMARY for future reference.
    4. Wrap: `var paraLines = doc.splitTextToSize(stripped, USABLE_W);` (per RESEARCH G7, wrap on the STRIPPED logical text — the unstripped text contains `**` chars that would interfere with wrap measurement).
    5. For each wrapped sub-line, derive its segment slice by clipping `paraSegments` to the sub-line's character range in the stripped text. Implement this as `clipSegmentsToRange(paraSegments, subLineStartIdx, subLineEndIdx)` returning a new array of `{text, bold}` segments whose concatenation equals the wrapped sub-line.
    6. Call `drawSegmentedLine(clippedSegments, y, BODY_SIZE)`.
    7. To track subLineStartIdx/EndIdx across iterations, use the **round-trip-validated offset arithmetic from step 3**: each sub-line's char range is `[offset, offset + subLine.length)`; after each sub-line, advance offset by `subLine.length + 1` (accounts for the single space splitTextToSize uses as a join). This is ONLY safe because the step-3 proof gate confirmed splitTextToSize is round-trippable for all three fixtures. If the proof gate's escape hatch (segment-by-segment rewrap) is triggered, this offset arithmetic is REPLACED by the alternative path.

(e) Rewire the list branch (L636-L679): same shape as (d), with two extra wrinkles:
    1. For wi===0 (first wrapped line), prefix the bullet: prepend `"- "` segment (bold: false) to the clipped segments. The `- ` participates in paragraph-direction inference (RESEARCH Open Question #1 — already locked: prefix-then-shape).
    2. For wi>0 (continuation lines), use the indented x (MARGIN_X+14 for LTR, PAGE_W-MARGIN_X-14 effective right anchor for RTL). drawSegmentedLine must accept an optional x-offset arg or a `continuationIndent: boolean` flag to handle this; pick whichever API shape minimizes code.
    3. The `applyFontFor` call sites (`doc.setFont('Heebo', 'normal')` at L640, L645) are kept — they set the BASELINE font before drawSegmentedLine overrides per run. drawSegmentedLine must reset back to 'normal' before returning so subsequent renderer code (the next list item, the next paragraph, the next heading) starts from a clean baseline.

(f) Remove `stripInlineMarkdown(...)` from the parseMarkdown para and list paths (L338 and L359). KEEP `stripInlineMarkdown` defined — the function stays as a utility because the running-header / title-block / running-header paths could theoretically receive `**` markers in clientName (unlikely but defensive); also worth keeping for any future caller. The two call sites in parseMarkdown that strip are removed; the function definition stays.

(g) Heading branch (L620-L633): does NOT need inline-bold rendering — headings are rendered as a single span in BOLD already (Plan 23-09). But headings CAN contain `**` markers if a user types `## My **header**`. Decision: keep the heading branch using `drawTextLine(..., 'bold')` AND apply `stripInlineMarkdown` to `block.text` at the heading branch entry (since the whole heading is bold, inline bold is redundant; strip markers to avoid literal `**` display). One-line addition: `var headingText = stripInlineMarkdown(block.text);` then `drawTextLine(headingText, y, hSize, 'bold');`. This matches the title-block convention (the title is always bold; inline bold markers are stripped for that path too — keep consistent). **Note (per W5):** this addition creates a new key_link `heading branch L631 → stripInlineMarkdown` (already recorded in frontmatter.must_haves.key_links). The semantic shift is from "heading renders literal `**foo**`" to "heading strips markers". Verify in the post-commit grep that the heading branch invokes `stripInlineMarkdown` exactly once.

(h) The title-block (`drawPage1Header` at L537-L571) and running-header (`drawRunningHeader` at L573-L595) and footer (L700-L718) paths: NO CHANGE. They render clientName / sessionDate / sessionType / page numbers which do not support markdown. The shapeForJsPdf call sites stay as-is and pick up Task 1's mirror restoration transparently.

(i) Create `tests/pdf-bold-rendering.test.js`. Modeled CLOSELY on `tests/pdf-digit-order.test.js`. Structure:
    - Same JSDOM + Mitigation B pinning harness (copy `buildJsdomEnv` verbatim from pdf-digit-order.test.js).
    - 3 fixtures inlined as JS objects (no separate .json files):
      - Fixture A (EN): clientName 'Test', sessionDate '2026-05-08', sessionType 'In-person', markdown 'The session **summary** is below.', uiLang 'en'.
      - Fixture B (HE): clientName 'בדיקה', sessionDate '2026-05-08', sessionType 'In-person' (per Task 2, though the type label is irrelevant here), markdown 'הסיכום **מודגש** כאן.', uiLang 'he'.
      - Fixture C (mixed): clientName 'Test', sessionDate '2026-05-08', sessionType 'In-person', markdown '**important** דבר חשוב', uiLang 'he'.
    - Glyph-extraction harness: same Tj/TJ walker as pdf-digit-order.test.js, but tracking the current `/Font` resource selected by the most recent `Tf` operator. Heebo Regular and Heebo Bold register as separate font resources in the PDF; jsPDF emits a `Tf` operator before each font switch. Walking `Tf F1 11 Tf` vs `Tf F2 11 Tf` etc. tells you which font was active for the subsequent glyphs.
    - Measurement step (executor runs at task start, ONE TIME under `MEASURE_MODE=1`): render each fixture and print the (font_resource_name, glyph_CID) pairs to derive the canonical "F1=Heebo F2=HeeboBold" resource IDs. The IDs are stable for the vendored jsPDF version. If they ever change, the executor re-runs MEASURE_MODE. **Resource numbering caveat (verify at task start):** jsPDF may assign `/F1` to whichever font is invoked first in the document. Use MEASURE_MODE to confirm whether Regular or Bold is `/F1` vs `/F2`. If jsPDF assigns resource numbers based on invocation order, the test must derive Regular_resource and Bold_resource at runtime from a known-anchor doc.text() call (e.g., the title block which is always bold, so its glyphs come from the Bold resource) rather than hard-coding them. Recommend the runtime-derived approach for robustness.
    - Assertions per fixture:
      - **Asterisk floor:** Heebo's asterisk GID (measure once via MEASURE_MODE on a fixture with literal `*` chars; expect 4-hex value like 0021 — verify at task start) MUST appear 0 times in the content stream.
      - **Bold-font usage:** the BOLD font resource must be used for at least M_bold glyphs, where M_bold is the codepoint count of the bolded word(s) (e.g. fixture A: M_bold = 7 for "summary"; fixture B: M_bold = 5 for "מודגש"; fixture C: M_bold = 9 for "important").
      - **Regular-font usage:** the REGULAR font resource must be used for at least M_reg glyphs, derived similarly (the non-bold remainder of each fixture's body text, minus spaces — RESEARCH measurement showed spaces emit their own GID; the floor uses content glyphs only).
    - Use the digit-order test's failure-message style: include "Runs found: [...]" diagnostic on each failed assertion.
    - Three fixtures = 3 outer test scopes. Each fixture has 3 assertions (asterisk floor + bold floor + regular floor) = 9 assertions total. Print `Passed 9/9` on full pass, `Failed N/9` with diagnostics on partial fail.

(j) Service worker: do NOT manually edit `sw.js`. Pre-commit hook auto-bumps. Verify after commit.

**Risk escalation (CHECKPOINT path):** Two distinct escalation triggers, both BEFORE writing renderer code:

  **Trigger 1 (B1 — wrap round-trip):** see step (d).3 above. If splitTextToSize is non-round-trippable for any fixture, escalate with the segment-by-segment rewrap fallback.

  **Trigger 2 (bidi mapping contiguity):** If during implementation, after reading the bidi-js source surface and attempting the per-segment visual-range derivation, the indices math proves intractable (e.g., a segment's logical range maps to a NON-CONTIGUOUS visual range that the run-walker cannot collapse cleanly, or `getReorderedIndices` returns indices that don't align with the segment boundaries in any computable way), STOP. Do NOT ship a half-correct implementation. Return to the orchestrator with a `## CHECKPOINT REACHED` block stating:
  - What was tried (the specific bidi-js primitives invoked and their outputs for the failing fixture).
  - Where it broke (e.g. "fixture C: 'important' spans logical [0,8], but reorderedIndices puts those at visual positions [12,4] non-contiguously").
  - Recommended fallback: roll back Task 4 only (keep Tasks 1-3 shipped), defer inline-bold to a follow-up Phase 24.

  **Concretely (the 2-step proof harness that gates trigger 2):** treat the implementation as a 2-step proof. Step 1 (max 30% of the task's context, AFTER the B1 wrap proof in (d).3 passes): run the bidi pipeline against fixtures A/B/C and print the logical→visual map alongside the segment ranges. Confirm each segment maps to a contiguous visual range. ALSO run the B1 wrap round-trip check on the same fixtures in this step. If both checks pass for all three fixtures, proceed to Step 2 (write the renderer). If even one fixture fails either check, escalate. The expected outcome for the three task fixtures is CONTIGUOUS bidi mapping AND round-trippable wrap in all cases (bidi reordering of `**X**` segments where X is a single word in a single script produces contiguous visual ranges because UAX-L2 reverses by level — a single-script segment is one level run, hence one contiguous visual range; and the test fixtures use only ASCII space + Hebrew letters + Latin letters, none of which trigger hyphen/ZWSP wrap). The escalation paths exist for safety, but I do not expect to hit them.
  </action>
  <verify>
    <automated>node tests/pdf-bold-rendering.test.js && node tests/pdf-bidi.test.js && node tests/pdf-digit-order.test.js && node tests/pdf-glyph-coverage.test.js && node tests/pdf-latin-regression.test.js</automated>
  </verify>
  <acceptance_criteria>
    - `tests/pdf-bold-rendering.test.js` exists and exits 0 with `Passed 9/9, Failed 0/9.` (3 fixtures × 3 assertions: asterisk floor, bold floor, regular floor).
    - `grep -c 'parseInlineBold' assets/pdf-export.js` >= 4 (definition + invocations in para and list branches + JSDoc reference).
    - `grep -c 'shapeForJsPdfWithMap' assets/pdf-export.js` >= 2 (definition + invocation in drawSegmentedLine).
    - `grep -c 'drawSegmentedLine' assets/pdf-export.js` >= 3 (definition + para invocation + list invocation).
    - `grep -c 'getReorderedIndices' assets/pdf-export.js` >= 1 (used in shapeForJsPdfWithMap).
    - `grep -c 'stripInlineMarkdown(' assets/pdf-export.js` — definition is preserved; the two call sites in parseMarkdown para and list paths are REMOVED; new call site added at the heading branch entry (Task 4(g)). Expected count after Task 4: 2 (definition itself + the new heading branch usage). NOT 3 (which would mean a parseMarkdown call site was left in by mistake).
    - All four existing tests still pass: `node tests/pdf-bidi.test.js` (12/12), `node tests/pdf-latin-regression.test.js` (5/5 after Task 3), `node tests/pdf-glyph-coverage.test.js` (3/3), `node tests/pdf-digit-order.test.js` (4/4).
    - No `doc.text(` call in `assets/pdf-export.js` lacks `isInputVisual: false`. Run `grep -c 'doc.text(' assets/pdf-export.js` and `grep -c 'isInputVisual: false' assets/pdf-export.js` — the second must be >= the first. (drawSegmentedLine MUST pass the option on every emitted run.)
    - JSDoc on `shapeForJsPdfWithMap` documents the return shape `{visual, logicalToVisualMap}` and references the underlying bidi-js primitive `getReorderedIndices`.
    - JSDoc on `parseInlineBold` includes at least one explicit example of input → segments output (matching the format used in the existing JSDoc for `slugify` at L137-L144). The example MUST illustrate the locked segment shape `{text, bold}` (no logicalStart/logicalEnd fields — per B2 decision).
    - The `**` markers do NOT appear in any rendered PDF: the asterisk-floor assertion in pdf-bold-rendering.test.js catches this; ALSO verify visually by `git diff` of `fixture-he-mixed.pdf.sha256` — if the asterisk floor assertion holds at test time but the bytes change post-Task-4 for fixture-he-mixed (which doesn't contain `**` markers), that's a Task-4 side effect on the unrelated path; investigate before committing.
    - **Step-1 proof gate output captured in SUMMARY:** the MEASURE_MODE run from action step (d).3 must have been executed; its sub-line-list output for all three fixtures must be recorded in the Task 4 commit message or the post-completion SUMMARY. If the round-trip check failed for any fixture and the segment-by-segment fallback was used, the SUMMARY must document which path was taken.
    - Manual UAT (Ben after the commit lands): export a session from the live app whose markdown body contains both `**bold**` text and regular text. The bold text renders in a visibly heavier weight; no literal asterisks appear. This is a Phase 23 close-out human-verification step, NOT a gate on this task.
  </acceptance_criteria>
  <done>Inline bold rendering works for LTR + RTL + mixed-script paragraphs and lists. All 5 test suites green (bidi 12/12, latin-regression 5/5, glyph-coverage 3/3, digit-order 4/4, bold-rendering 9/9). The `stripInlineMarkdown` placeholder behaviour from 23-08 is replaced; literal `**` markers no longer appear and bolded text renders in Heebo Bold weight. Heading branch now strips inline markers (W5 key_link). Title-block path unchanged. The risk-escalation paths (CHECKPOINT REACHED) were NOT triggered — Step 1 confirmed both contiguous visual mapping AND round-trippable wrap for all three fixtures.</done>
</task>

</tasks>

<verification>
After all 4 tasks complete, run the full test suite from the repo root:

```
node tests/pdf-bidi.test.js              # Expected: Passed 12/12 (vectors #4, #12 now mirrored)
node tests/pdf-latin-regression.test.js  # Expected: Passed 5/5 (added fixture-he-mixed)
node tests/pdf-glyph-coverage.test.js    # Expected: Passed 3/3 (unchanged from current)
node tests/pdf-digit-order.test.js       # Expected: Passed 4/4 (unchanged from current)
node tests/pdf-bold-rendering.test.js    # Expected: Passed 9/9 (new test)
```

Cross-task invariants:
- `git diff .planning/fixtures/phase-23/fixture-{en,de,cs}.pdf.sha256` shows no byte changes (Task 1's mirror restoration must not affect non-bidi paths).
- `git diff .planning/fixtures/phase-23/fixture-he.pdf.sha256` shows a change relative to PRE-23-12 (Task 1 regenerated it because fixture-he.json contains `(body scan)`); the Task 3 `--regenerate` is idempotent for this file (no additional drift between Task 1 commit and Task 3 commit).
- `grep -c 'isInputVisual: false' assets/pdf-export.js` >= `grep -c 'doc.text(' assets/pdf-export.js` (Task 4's new draw calls preserve the 23-08 invariant).
- `grep -c 'session.type.inPerson' assets/i18n-*.js` returns 0 across all 4 files (Task 2 cleanup is complete).
- `grep -v '^[[:space:]]*//' assets/pdf-export.js | grep -c 'getMirroredCharactersMap'` >= 1 (Task 1 restored mirroring; comment-stripped count).
- `grep -c 'parseInlineBold' assets/pdf-export.js` >= 4 (Task 4 added the new helper and wired it into para + list paths).

Pre-commit hook auto-bumps `sw.js` CACHE_NAME. Verify after each commit that the bump landed: `grep -F 'CACHE_NAME' sw.js`.

Manual UAT (Ben + Sapir, post-merge):
- Open the app in EN, DE, HE, CS. Open a session, confirm the form's session-type "In-person" / "Vor Ort" / "פרונטלי" / "Osobně" radio displays the new label.
- Export a session whose markdown contains both `**bold**` and regular text. Confirm bold renders visibly heavier than regular; no literal asterisks appear.
- **(Sapir confirms — native HE bidi behavior, Ben cannot self-verify):** Export a Hebrew session whose markdown contains `(parens)`. Sapir confirms the rendering reads naturally R→L with `)` on the visual left and `(` on the visual right, matching Word and dir="rtl" browser behavior. Per W7: this bullet is gated by Sapir's confirmation, not Ben's.
- Export a Hebrew session containing an embedded English paragraph. Confirm both the Hebrew and the English paragraphs anchor at the right margin (docDir-uniform-anchor regression).
</verification>

<success_criteria>
- All 5 automated test suites pass (12/12 + 5/5 + 3/3 + 4/4 + 9/9 = 33 passing assertions total).
- The 4 must_haves.truths above are all observable in the live app:
  1. Bold rendering works in EN.
  2. Bold rendering works in HE with correct bidi positioning.
  3. Bold rendering works in mixed-script lines.
  4. Brackets mirror naturally for R→L readers in HE paragraphs (Sapir confirms — W7).
  5. The In-person label is identical between form and PDF across all 4 locales.
  6. Hebrew docs with embedded Latin lines anchor uniformly (regression coverage added).
- No regression on any of: 12-vector bidi corpus, 4-fixture Latin regression (now 5), 3-fixture glyph coverage, 4-assertion digit order.
- Phase 23 close-out: the 4 polish items from the iteration loop are fully shipped; `/gsd:wrap-up-phase 23` can fire after Ben's + Sapir's UAT confirmation.
</success_criteria>

<output>
After completion, create `.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-12-phase23-final-polish-SUMMARY.md` documenting:
- The four shipped changes and their commit IDs.
- The bidi index-mapping approach taken in Task 4 (was it `getReorderedIndices` as planned, or did the executor fall back to raw `getReorderSegments` walking?).
- The Step-1 proof gate output for Task 4 (the splitTextToSize round-trip results and the per-segment visual-range contiguity check for all three fixtures). State whether either escalation trigger fired (expected: no).
- Whether either CHECKPOINT escalation was triggered (expected: no, but record the path taken: monolithic splitTextToSize vs segment-by-segment rewrap fallback).
- Any deviations from the plan, with rationale.
- The asterisk GID and Heebo Bold font-resource ID (`/F1`/`/F2`) measured during Task 4's MEASURE_MODE step — these are stable for the Heebo v3.100 vendored version and worth recording for future test maintenance.
- The pre-Task-1 vs post-Task-1 hash of fixture-he.pdf.sha256 (Task 1 regenerates it; record both for audit trail).
- Confirmation that `sw.js` CACHE_NAME was auto-bumped by the pre-commit hook (and what version it landed at).
- A pointer to the Phase 23 close-out manual UAT items for Ben + Sapir (with Sapir specifically gating the bracket-mirroring bullet per W7).
</output>
