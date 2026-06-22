---
phase: 23-pdf-export-rewrite-hebrew-rtl-and-layout
plan: 23-04
parent_phase: 23
title: Bidi test-vector corpus + Latin-regression smoke fixtures
type: execute
wave: 3
depends_on:
  - 23-02
  - 23-03
files_modified:
  - tests/pdf-bidi.test.js
  - tests/pdf-latin-regression.test.js
  - .planning/fixtures/phase-23/fixture-en.json
  - .planning/fixtures/phase-23/fixture-de.json
  - .planning/fixtures/phase-23/fixture-cs.json
  - .planning/fixtures/phase-23/fixture-en.pdf.sha256
  - .planning/fixtures/phase-23/fixture-de.pdf.sha256
  - .planning/fixtures/phase-23/fixture-cs.pdf.sha256
  - .planning/fixtures/phase-23/README.md
autonomous: true
requirements:
  - 23-T1
  - 23-T2
  - 23-T3
tags:
  - phase-23
  - pdf
  - testing
  - regression
  - fixtures
  - bidi
  - latin-regression
must_haves:
  truths:
    - "A session with pure Hebrew content exports a PDF where every Hebrew line reads right-to-left in correct character order. (T1 — verified here by the 12-vector bidi test corpus: vectors #1, #6, #7 cover pure Hebrew variants. The test runs against the live shapeForJsPdf helper from 23-02.)"
    - "A session mixing Hebrew + English/digits exports a PDF where the bidirectional segments land in correct positions. (T2 — verified here by the 12-vector corpus: vectors #2, #3, #5, #10 cover mixed Hebrew + Latin word, Hebrew + ISO date, Hebrew + URL, Hebrew + colon-separated digits.)"
    - "A session in EN/DE/CS only exports a PDF byte-similar to the pre-phase-23 output — no regression on Latin-only paths. (T3 — closed here: 3 fixture JSONs (EN/DE/CS) committed to .planning/fixtures/phase-23/ alongside SHA-256 hashes of their post-23 PDF outputs. Per RESEARCH 'Latin-only Regression Strategy' the hashes are deterministic because the harness pins /CreationDate via doc.setProperties (Mitigation B).)"
  artifacts:
    - path: "tests/pdf-bidi.test.js"
      provides: "Standalone Node test script (no framework — uses Node's built-in `assert`) that loads ./assets/bidi.min.js into a synthetic window, invokes the bidi-js factory, replicates the shapeForJsPdf helper inline (copy-pasted verbatim from 23-02's canonical implementation), and asserts all 12 RESEARCH test vectors produce the expected visual-order output. Exits 0 on full pass; exits 1 with a labelled failure summary on any mismatch. Runnable as `node tests/pdf-bidi.test.js` from the repo root."
      contains: "shapeForJsPdf"
    - path: "tests/pdf-latin-regression.test.js"
      provides: "Standalone Node test script that loads pdf-export.js via JSDOM (per 22-05 SUMMARY's confirmed Node smoke-testability), pins /CreationDate via Mitigation B (doc.setProperties({ creationDate: <fixed> }) immediately after new jsPDF()), generates a PDF for each of the 3 fixture JSONs, computes SHA-256, and compares against the committed hash files. Exits 0 on match; exits 1 with fixture-name + expected + actual on mismatch. Mitigation A (byte-mask /CreationDate) is the fallback if the 5-minute setProperties spike at task start shows the field isn't actually pinned."
      contains: "deterministicDate"
    - path: ".planning/fixtures/phase-23/fixture-en.json"
      provides: "Anglophone fixture session record: clientName 'Anna M.', sessionDate '2026-05-08', sessionType 'Clinic', uiLang 'en', markdown body with 1 heading + 1 paragraph + 1 list with 3 items + 1 second paragraph spanning ~2 pages to exercise running-header + page-break + footer pagination. Fictional but realistic therapist-note content. Matches the sessionData shape from pdf-export.js JSDoc L299–306."
      contains: "Anna M."
    - path: ".planning/fixtures/phase-23/fixture-de.json"
      provides: "German fixture: clientName 'Jörg Müller' (umlauts), sessionDate '2026-05-08', sessionType 'Online', uiLang 'de', German markdown body with ä/ö/ü/ß sprinkled across heading + paragraph + list. Same ~2-page length."
      contains: "Müller"
    - path: ".planning/fixtures/phase-23/fixture-cs.json"
      provides: "Czech fixture: clientName 'Pavel Novák', sessionDate '2026-05-08', sessionType 'Other', uiLang 'cs', Czech markdown body with š/č/ř/ě/ý/ů across heading + paragraph + list. Same ~2-page length."
      contains: "Novák"
    - path: ".planning/fixtures/phase-23/fixture-en.pdf.sha256"
      provides: "64-character lowercase hex SHA-256 of the PDF blob produced by pdf-latin-regression.test.js for fixture-en.json under Mitigation B. Plain text, single line, terminated by single newline (no filename column). Captured at 23-04 execution time AFTER 23-02 + 23-03 ship — this is the post-rewrite baseline that v1.2+ work is gated against."
      contains: ""
    - path: ".planning/fixtures/phase-23/fixture-de.pdf.sha256"
      provides: "Same as fixture-en.pdf.sha256 for the German fixture."
      contains: ""
    - path: ".planning/fixtures/phase-23/fixture-cs.pdf.sha256"
      provides: "Same as fixture-en.pdf.sha256 for the Czech fixture."
      contains: ""
    - path: ".planning/fixtures/phase-23/README.md"
      provides: "Short readme: what the fixture directory is for, how the hashes were generated (harness name + deterministic-date value + bidi-js version + jsPDF version + Phase 23 plan IDs), and what to do if a future Phase changes the hashes (verify the change is intentional, regenerate via the harness's `--regenerate` flag, commit)."
      contains: "phase-23"
  key_links:
    - from: "tests/pdf-bidi.test.js"
      to: "assets/bidi.min.js + the shapeForJsPdf helper inlined for self-contained testing"
      via: "The test loads bidi.min.js via synthetic window (global.window = global.window || {}; require), invokes the factory, replicates the shapeForJsPdf body inline (verbatim from 23-02), and asserts all 12 vectors from RESEARCH 'Test Vector Corpus'."
      pattern: "shapeForJsPdf"
    - from: "tests/pdf-latin-regression.test.js"
      to: ".planning/fixtures/phase-23/*.json + *.pdf.sha256"
      via: "Harness loads pdf-export.js via JSDOM, applies Mitigation B (setProperties({ creationDate })) immediately after new jsPDF(), reads each fixture JSON, calls buildSessionPDF, SHA-256s the blob, compares against the matching .sha256 file. On mismatch prints fixture name + expected + actual, exits non-zero."
      pattern: "sha256"
    - from: "tests/pdf-latin-regression.test.js + .planning/fixtures/phase-23/README.md"
      to: "Each other (cross-referenced)"
      via: "Harness header comment points at README for human-readable context; README points back at harness for regeneration command (`node tests/pdf-latin-regression.test.js --regenerate`). Both reference Plan 23-04 by ID for traceability."
      pattern: "phase-23/README.md"
---

<objective>
Land two pieces of verification scaffolding for Phase 23: (a) an automated bidi test-corpus that exercises all 12 RESEARCH test vectors against the live shapeForJsPdf helper, and (b) 3 committed Latin-only fixture sessions plus their post-rewrite SHA-256 hashes serving as a regression smoke-test for v1.2+ work.

**Per RESEARCH Open Question #4 — LOCKED at planning time:** the 3 fixture JSONs (`fixture-en.json`, `fixture-de.json`, `fixture-cs.json`) and their hash files (`fixture-{en,de,cs}.pdf.sha256`) ARE committed to git under `.planning/fixtures/phase-23/`. No executor-time decision.

**Per RESEARCH 'Latin-only Regression Strategy' — Mitigation B is the planned path:** override `/CreationDate` deterministically inside the test harness only (NOT in production pdf-export.js). The executor performs a 5-minute spike at the start of Task 2 to verify `doc.setProperties({ creationDate: new Date('2026-01-01T00:00:00Z') })` actually pins the bytes. If it doesn't pin them, the executor falls back to **Mitigation A** (compute SHA-256 over bytes outside the /CreationDate field by masking the field's byte-offset range). The plan accepts either outcome — both produce deterministic hashes that gate future regressions.

**Wave 3 dependency reason:** this plan runs AFTER 23-02 (adds shapeForJsPdf) AND 23-03 (changes margins + centering, which affect every Latin fixture's layout). Running it earlier would either capture pre-rewrite hashes that immediately become stale, or test against a shapeForJsPdf helper that doesn't exist yet.

**This plan does NOT touch:** `assets/pdf-export.js`, `sw.js`, `assets/bidi.min.js`. It only creates new files under `tests/` and `.planning/fixtures/`.

Purpose: lock in automated verification for Phase 23. The bidi corpus is the algorithm-correctness gate; the Latin-regression hashes are the v1.2+ regression gate.

Output:
- `tests/pdf-bidi.test.js` — 12-vector bidi test corpus.
- `tests/pdf-latin-regression.test.js` — deterministic-PDF + SHA-256 harness.
- `.planning/fixtures/phase-23/fixture-{en,de,cs}.json` — 3 fixture session records.
- `.planning/fixtures/phase-23/fixture-{en,de,cs}.pdf.sha256` — 3 plain-text hash files.
- `.planning/fixtures/phase-23/README.md` — context document.

**Manual UAT NOT required.** Verification is fully automated. Ben may optionally eyeball the 3 generated PDFs to confirm they render correctly on his side, but it's a sanity check, not a gate.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-CONTEXT.md
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-RESEARCH.md
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-01-vendor-bidi-js-PLAN.md
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-02-bidi-preshape-and-setR2L-removal-PLAN.md
@.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-03-margins-and-title-centering-PLAN.md
@assets/pdf-export.js
@assets/bidi.min.js

## UAT truth statements (verbatim from 23-CONTEXT.md)

1. **T1 (verified — closing happens in 23-02 via Sapir's UAT):** "Pure Hebrew content reads RTL correctly." This plan adds automated coverage on the algorithmic layer (vectors #1, #6, #7).
2. **T2 (verified — closing happens in 23-02):** "Hebrew + English/digits bidirectional segments land correctly." Vectors #2, #3, #5, #10 cover mixed content.
3. **T3 (closed here):** "EN/DE/CS-only sessions produce byte-similar PDFs to pre-phase-23 output." The 3 hash files are the post-rewrite baseline. Per RESEARCH 'Latin-only Regression Strategy': because 23-04 runs after 23-02 + 23-03 have shipped, the practical baseline is the post-rewrite Phase 23 output; any v1.2+ deviation requires explanation.

## Locked decisions

- **D5 (CONTEXT) — No data migration.** Fixtures + hashes are commit-time artifacts, not runtime data.
- **RESEARCH Open Question #4 — commit fixtures + hashes to git.** YES, locked.
- **RESEARCH Open Question #3 — post-rewrite baseline.** Practical-only path since 23-04 runs after 23-02 + 23-03.
- **Mitigation choice** — B (test-harness-only setProperties override). Mitigation A is the fallback after the executor's 5-minute spike.

## 12 test vectors (verbatim from 23-RESEARCH.md "Test Vector Corpus")

The executor pastes these verbatim into `tests/pdf-bidi.test.js`. Each is `{ id, label, input, expected }`. Base direction is inferred via firstStrongDir, not hard-coded.

| # | Logical input | Expected visual output | What it tests |
|---|---------------|------------------------|---------------|
| 1 | `שלום עולם` | `םלוע םולש` | Pure Hebrew |
| 2 | `אני אוהב PDF` | `PDF בהוא ינא` | Hebrew + LTR Latin run |
| 3 | `המפגש ביום 2026-05-11 היה טוב` | `בוט היה 2026-05-11 םויב שגפמה` | Hebrew + ISO date |
| 4 | `הפגישה (חשובה) הסתיימה` | `המייתסה )הבושח( השיגפה` | Hebrew + mirrored brackets (G3) |
| 5 | `בקר ב https://example.com היום` | `םויה https://example.com ב רקב` | Hebrew + URL |
| 6 | `- ראשון: מצב רוח טוב` | `בוט חור בצמ :ןושאר -` | Hebrew with leading "- " bullet |
| 7 | `# סיכום המפגש` | `שגפמה םוכיס #` | Heading with `#` (already stripped by parseMarkdown — test included for completeness) |
| 8 | `` (empty) | `` | Empty input |
| 9 | `Session summary` | `Session summary` | Pure English smoke |
| 10 | `גיל: 42 שנים` | `םינש 42 :ליג` | Hebrew + digits + colon |
| 11 | `מצב רוח: 🌱 פורח` | `חרופ 🌱 :חור בצמ` | Hebrew + emoji surrogate pair (G2) |
| 12 | `רישום [important] כאן` | `ןאכ ]important[ םושיר` | Hebrew + square brackets |

## Fixture JSON shape (matches pdf-export.js JSDoc L298–308)

```json
{
  "sessionData": {
    "clientName": "...",
    "sessionDate": "2026-05-08",
    "sessionType": "...",
    "markdown": "..."
  },
  "opts": {
    "uiLang": "en"
  }
}
```

The harness reads both halves and passes them to `buildSessionPDF(sessionData, opts)`.

## JSDOM availability check

`pdf-export.js` requires `window.jspdf.jsPDF`, `window.NotoSans`, `window.NotoSansHebrew`, `window.bidi_js`, plus DOM script-tag manipulation (loadScriptOnce appends `<script>` elements). 22-05 SUMMARY confirmed Node smoke-testability under JSDOM. The executor MUST verify JSDOM is present (`node -e "require('jsdom')"`) before running Task 2. If missing and `npm install jsdom` is feasible in the sandbox, install it (no-save). If not feasible, the executor falls back to **manual baseline capture**: open the PDF export in a real browser, save the 3 PDFs via the download flow, run `openssl dgst -sha256 -r` on each saved file. The hash files are committed either way; the harness file is committed with a documented "to run, npm install jsdom first" note in its header.

## sha256 file format

Plain text, single line, **64 hex characters lowercase**, terminated by a single newline. No filename column. Equivalent to:

```
openssl dgst -sha256 -r <pdf_file> | cut -d ' ' -f 1 > fixture-en.pdf.sha256
```

Example contents:
```
b3c4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4
```

## Critical reminder — what triggers regen of the baseline hashes

The baseline hashes capture Phase 23's post-rewrite output. They are the **canonical correct output** for v1.2+ regression checks. They WILL drift any time someone legitimately changes pdf-export.js, the vendored jspdf/bidi/font assets, or the fixture JSONs themselves. When that happens, the developer who made the legitimate change is responsible for: (a) running the harness with `--regenerate`, (b) eyeballing the new PDFs to confirm they look right, (c) committing the new hashes with a commit message that names the legitimate change. This contract is documented in `.planning/fixtures/phase-23/README.md` so future maintainers know the protocol.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write the 12-vector bidi test corpus (tests/pdf-bidi.test.js)</name>
  <files>tests/pdf-bidi.test.js</files>
  <action>
    Create `tests/` directory if it doesn't already exist (`mkdir -p tests`).

    Create `tests/pdf-bidi.test.js` as a standalone Node test script using only Node's built-in `assert` module. The script:

    1. Loads `assets/bidi.min.js` into a synthetic window object: `global.window = global.window || {}; require('../assets/bidi.min.js'); var bidi = global.window.bidi_js();`
    2. Defines `firstStrongDir(text)` and `shapeForJsPdf(text)` INLINE inside the test file — verbatim copies of the canonical implementations in 23-02's plan / RESEARCH 'Worked example'. The test is intentionally self-contained — does NOT import from pdf-export.js. The inline copy is ~20 lines total. Add a comment noting that if pdf-export.js's helper changes, this test file MUST be updated too.
    3. Stores the 12 vectors as an array of `{ id, label, input, expected }` objects (D-04 reference: RESEARCH 'Test Vector Corpus' table). Use string literals exactly as the RESEARCH table specifies.
    4. Iterates the 12 vectors, runs `shapeForJsPdf(vector.input)`, asserts `assert.strictEqual(actual, vector.expected)`. Logs `[PASS] #${id}: ${label}` on success. On failure, logs `[FAIL] #${id}: ${label}` with expected vs. actual as JS-string literals AND as `U+XXXX` codepoint sequences (using `Array.from(str).map(c => 'U+' + c.codePointAt(0).toString(16).padStart(4, '0').toUpperCase()).join(', ')`), then rethrows the AssertionError so the script exits non-zero.
    5. Prints `Passed N/12, Failed M/12.` and exits 0 if N == 12 else 1.

    Add a header comment to the file:

    ```
    /**
     * Phase 23 (Plan 23-04) — bidi-js correctness test corpus.
     *
     * Asserts that the shapeForJsPdf helper (defined inline below, mirroring the
     * canonical implementation in assets/pdf-export.js as added by Plan 23-02)
     * produces the correct visual-order output for all 12 test vectors from
     * .planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-RESEARCH.md
     * section "Test Vector Corpus".
     *
     * Runs in plain Node — no test framework. Loads ./assets/bidi.min.js via
     * synthetic window. Self-contained: does NOT require pdf-export.js or jsPDF.
     *
     * Run with: node tests/pdf-bidi.test.js
     * Exits 0 on full pass, 1 on any failure.
     *
     * IMPORTANT (G2 / test vector #11): shapeForJsPdf MUST use text.split('')
     * — NOT [...text] or Array.from(text). Test vector #11 (Hebrew + emoji)
     * catches a buggy implementation that splits by codepoint.
     *
     * Maintenance contract: if the canonical shapeForJsPdf in pdf-export.js
     * is ever modified, this test file's inline copy MUST be updated to match.
     */
    ```

    **Verification before commit:**
    - `node -c tests/pdf-bidi.test.js` parses
    - `node tests/pdf-bidi.test.js` exits 0 (all 12 vectors pass against live bidi.min.js)
    - All 12 vectors literally present in the file (spot-check 5 distinctive inputs):
      - `grep -c 'שלום עולם' tests/pdf-bidi.test.js` ≥ 1
      - `grep -c 'אני אוהב PDF' tests/pdf-bidi.test.js` ≥ 1
      - `grep -c 'הפגישה' tests/pdf-bidi.test.js` ≥ 1
      - `grep -c 'Session summary' tests/pdf-bidi.test.js` ≥ 1
      - `grep -c '🌱' tests/pdf-bidi.test.js` ≥ 1
    - Helper uses `text.split('')` (G2): `grep -c "text.split('')" tests/pdf-bidi.test.js` ≥ 1
    - Helper does NOT use spread/Array.from: `grep -cE '\[\.\.\.text\]|Array\.from\(text' tests/pdf-bidi.test.js` == 0
    - 12 test cases registered: `grep -c 'id:' tests/pdf-bidi.test.js` == 12 (adjust this gate if the executor uses a different field name like `n:` — both the source and this gate should agree)

    Commit message: `test(23-04): 12-vector bidi correctness corpus (tests/pdf-bidi.test.js)`
  </action>
  <verify>
    <automated>node -c tests/pdf-bidi.test.js &amp;&amp; node tests/pdf-bidi.test.js &amp;&amp; [ "$(grep -c "text.split('')" tests/pdf-bidi.test.js)" -ge 1 ] &amp;&amp; [ "$(grep -cE '\[\.\.\.text\]|Array\.from\(text' tests/pdf-bidi.test.js)" -eq 0 ] &amp;&amp; [ "$(grep -c 'שלום עולם' tests/pdf-bidi.test.js)" -ge 1 ] &amp;&amp; [ "$(grep -c 'אני אוהב PDF' tests/pdf-bidi.test.js)" -ge 1 ] &amp;&amp; [ "$(grep -c 'Session summary' tests/pdf-bidi.test.js)" -ge 1 ] &amp;&amp; [ "$(grep -c '🌱' tests/pdf-bidi.test.js)" -ge 1 ] &amp;&amp; [ "$(grep -c 'id:' tests/pdf-bidi.test.js)" -eq 12 ]</automated>
  </verify>
  <done>
    - `tests/pdf-bidi.test.js` exists, parses, runs to exit 0 against live bidi.min.js.
    - All 12 RESEARCH vectors codified (verified by 5 spot-grep checks).
    - Inline helper enforces G2 (`text.split('')`, no spread/Array.from).
    - Output: `[PASS]` for all 12 + final `Passed 12/12, Failed 0/12.` line.
    - Header comment documents plan ID, RESEARCH section reference, G2 gotcha, maintenance contract.
  </done>
</task>

<task type="auto">
  <name>Task 2: Latin-regression harness + 3 fixture JSONs + baseline hashes + README</name>
  <files>tests/pdf-latin-regression.test.js, .planning/fixtures/phase-23/fixture-en.json, .planning/fixtures/phase-23/fixture-de.json, .planning/fixtures/phase-23/fixture-cs.json, .planning/fixtures/phase-23/fixture-en.pdf.sha256, .planning/fixtures/phase-23/fixture-de.pdf.sha256, .planning/fixtures/phase-23/fixture-cs.pdf.sha256, .planning/fixtures/phase-23/README.md</files>
  <action>
    **Step A — 5-minute Mitigation B spike (G10).** Before writing the harness or fixtures, verify `doc.setProperties({ creationDate })` actually pins the PDF /CreationDate bytes. Run a one-off Node script (do NOT commit):

    1. `mkdir -p /tmp/23-04-spike`
    2. Write a tiny script that loads jspdf.min.js via JSDOM (or just node-require if jsPDF supports plain Node), creates two docs 10 seconds apart, calls `setProperties({ creationDate: new Date('2026-01-01T00:00:00Z') })` on each, and SHA-256s `doc.output('arraybuffer')` for each. If the two hashes match, Mitigation B works — proceed to Step B with the planned implementation.
    3. If the two hashes don't match, Mitigation B fails — use **Mitigation A** instead: the harness computes SHA-256 over the PDF bytes with the /CreationDate field masked. To find the /CreationDate offset: grep the PDF output for `/CreationDate` (it's an ASCII substring in the PDF body), then mask the byte range from the `/CreationDate (D:` opening through the closing `)` (typically ~25 bytes total). Record the mitigation choice (A or B) in the harness header comment and in `.planning/fixtures/phase-23/README.md`.

    Delete the spike script. Proceed.

    **Step B — Write the 3 fixture JSONs.** Each file is a JSON object matching the `{ sessionData: {...}, opts: {...} }` shape from the context section.

    - `.planning/fixtures/phase-23/fixture-en.json`: clientName "Anna M.", sessionDate "2026-05-08", sessionType "Clinic", uiLang "en". Markdown body: a `# Session summary` heading, one paragraph of 5–8 sentences describing the session theme (fictional, e.g. grounding exercises, breath work, somatic check-in), a list of 3 items (each ~10–15 words), and a second paragraph of 5–8 sentences. Total content should run to ~2 pages so the running header + page break + footer pagination are exercised. Use plain ASCII for English.

    - `.planning/fixtures/phase-23/fixture-de.json`: clientName "Jörg Müller" (raw UTF-8 umlauts — JSON spec allows them directly in strings), sessionDate "2026-05-08", sessionType "Online", uiLang "de". German markdown body with ä/ö/ü/ß sprinkled across heading + paragraph + list. Same ~2-page length. JSON uses raw UTF-8 (do NOT use `\u00XX` escapes — JSON spec permits raw multi-byte and the harness reads them directly via JSON.parse).

    - `.planning/fixtures/phase-23/fixture-cs.json`: clientName "Pavel Novák", sessionDate "2026-05-08", sessionType "Other", uiLang "cs". Czech markdown body with š/č/ř/ě/ý/ů across heading + paragraph + list. Same ~2-page length.

    All three fixtures are committed verbatim — no executor-time variation. If the executor wants to vary the body content, they may, but the variation MUST be deterministic (reused on regeneration) and recorded in the README. The simpler path is to use the exact body content the executor writes the first time and commit it.

    **Step C — Write the regression harness.** `tests/pdf-latin-regression.test.js`.

    The harness:

    1. Loads JSDOM if available (`require('jsdom')`). If missing, prints a clear "Install jsdom: `npm install --no-save jsdom`" message and exits 1 (the harness is committed for future use even if it can't run today).
    2. Sets up a JSDOM window with the URL `file:///pdf-export-test.html` so loadScriptOnce's relative `./assets/...` paths resolve correctly. The standard pattern is `new JSDOM('', { url: 'file://' + process.cwd() + '/index.html' })`.
    3. Injects `<script>` tags into the JSDOM document body for: assets/jspdf.min.js, assets/bidi.min.js, assets/fonts/noto-sans-base64.js, assets/fonts/noto-sans-hebrew-base64.js. Wait for all 4 to attach and execute (in JSDOM, this is synchronous when the script src can be resolved via file:// — the harness reads the script file contents directly and `eval`s them in the JSDOM's window context using `dom.window.eval(scriptContents)` as a workaround for JSDOM's restricted file:// script loading).
    4. Loads `assets/pdf-export.js` into the same window context. `window.PDFExport` is now available.
    5. **Applies Mitigation B (or A — based on Step A's spike result).** Monkey-patches the jsPDF constructor inside the JSDOM window so every newly-created doc immediately receives `setProperties({ creationDate: new Date('2026-01-01T00:00:00Z') })` before the harness consumes its output. Implementation: `var OriginalJsPDF = dom.window.jspdf.jsPDF; dom.window.jspdf.jsPDF = function (args) { var doc = new OriginalJsPDF(args); doc.setProperties({ creationDate: new Date('2026-01-01T00:00:00Z') }); return doc; };`. This wrapping is applied AFTER pdf-export.js loads but BEFORE buildSessionPDF is called, so pdf-export.js's `var jsPDF = window.jspdf && window.jspdf.jsPDF` line at L322 picks up the wrapped constructor on every invocation. If Mitigation A is chosen instead, skip the monkey-patch and instead mask the /CreationDate bytes in the SHA-256 input — find the byte range via `Buffer.indexOf('/CreationDate', 0)` and zero out the bytes from there through the closing `)` before hashing.
    6. For each of the 3 fixture JSONs (en, de, cs):
       - Read and JSON.parse the fixture file.
       - Call `window.PDFExport.buildSessionPDF(fixture.sessionData, fixture.opts)`.
       - Await the resulting Blob.
       - Convert blob to buffer (in JSDOM: `await blob.arrayBuffer()` then `Buffer.from(arrayBuffer)`).
       - Compute SHA-256: `crypto.createHash('sha256').update(buffer).digest('hex')`.
       - Read the corresponding `.sha256` file (e.g. `.planning/fixtures/phase-23/fixture-en.pdf.sha256`), trim whitespace, compare to the computed hash. If they match: log `[PASS] fixture-${lang}: <hash-prefix>...`. If they don't match: log `[FAIL] fixture-${lang}: expected <expected> got <actual>`, mark a failure, continue with the next fixture.
    7. Print final summary `Passed N/3, Failed M/3.` and exit 0 if N == 3 else 1.

    Support a `--regenerate` flag (`process.argv.includes('--regenerate')`) that, instead of comparing against the .sha256 files, WRITES the computed hashes to the .sha256 files (overwriting any existing content). This is how the baseline hashes get captured the first time, AND how a future maintainer who makes a legitimate pdf-export.js change regenerates the baseline.

    Add a header comment:

    ```
    /**
     * Phase 23 (Plan 23-04) — Latin-only PDF regression harness.
     *
     * For each of the 3 fixture JSONs in .planning/fixtures/phase-23/, this
     * harness builds a PDF via the JSDOM-loaded pdf-export.js, SHA-256s the
     * output, and compares against the committed .sha256 baseline.
     *
     * Mitigation B (executor-chosen at task start): /CreationDate pinned via
     * monkey-patched jsPDF constructor that calls setProperties({creationDate:
     * 2026-01-01T00:00:00Z}) on every doc. If the 5-minute spike at task start
     * showed setProperties doesn't pin the bytes, the harness falls back to
     * Mitigation A (byte-mask /CreationDate range before hashing) — the actual
     * mitigation used by this harness is noted in the section below.
     *
     * MITIGATION USED: <B or A>  (recorded by executor)
     *
     * Run with:
     *   node tests/pdf-latin-regression.test.js              -- check mode (exits non-zero on mismatch)
     *   node tests/pdf-latin-regression.test.js --regenerate -- baseline-capture mode (overwrites .sha256 files)
     *
     * Setup: requires jsdom. If not installed: `npm install --no-save jsdom`
     *
     * See .planning/fixtures/phase-23/README.md for the regeneration protocol.
     */
    ```

    **Step D — Generate the baseline hashes.** Run the harness with `--regenerate`:

    ```
    node tests/pdf-latin-regression.test.js --regenerate
    ```

    This writes `.planning/fixtures/phase-23/fixture-en.pdf.sha256`, `fixture-de.pdf.sha256`, `fixture-cs.pdf.sha256` — each containing a 64-char lowercase hex hash followed by a single newline.

    Sanity check: each file is exactly 65 bytes (64 hex chars + 1 newline):
    ```
    [ "$(wc -c < .planning/fixtures/phase-23/fixture-en.pdf.sha256)" -eq 65 ]
    ```

    Re-run the harness WITHOUT `--regenerate` and confirm all 3 fixtures pass:
    ```
    node tests/pdf-latin-regression.test.js
    ```

    **Step E — Write the README.** `.planning/fixtures/phase-23/README.md`.

    Content:
    - **Header:** "Phase 23 Latin-regression fixtures"
    - **Purpose:** brief explanation (these fixtures + hashes lock in the post-23 Latin-rendering baseline; gates v1.2+ regression).
    - **What's here:** list of the 6 files (3 JSONs + 3 hashes) + this README.
    - **How the hashes were generated:** the harness path, the Mitigation used (A or B — recorded), the fixed creationDate value (2026-01-01T00:00:00Z), the bidi-js version (1.0.3), the jsPDF version (read from package-lock or assets/jspdf.min.js's banner if available; otherwise note "as of 23-01 vendored").
    - **The regeneration protocol:** if a future Phase makes a legitimate change to pdf-export.js / fonts / bidi / jspdf, run `node tests/pdf-latin-regression.test.js --regenerate`, eyeball the 3 generated PDFs to confirm they look right, commit the new .sha256 files with a commit message that names the legitimate change. NEVER commit regenerated hashes blindly — every regeneration must be justified.
    - **The Phase 23 plan IDs:** 23-01 (vendored library), 23-02 (bidi pipeline + setR2L removal), 23-03 (margins + centering), 23-04 (this plan).
    - **Date captured:** the date the hashes were first written.

    **Step F — Verification before commit.**

    - `node -c tests/pdf-latin-regression.test.js` parses
    - All 3 fixture JSONs are valid JSON: `for f in fixture-en fixture-de fixture-cs; do node -e "JSON.parse(require('fs').readFileSync('.planning/fixtures/phase-23/$f.json'))"; done`
    - All 3 .sha256 files are exactly 65 bytes:
      - `[ "$(wc -c < .planning/fixtures/phase-23/fixture-en.pdf.sha256)" -eq 65 ]`
      - `[ "$(wc -c < .planning/fixtures/phase-23/fixture-de.pdf.sha256)" -eq 65 ]`
      - `[ "$(wc -c < .planning/fixtures/phase-23/fixture-cs.pdf.sha256)" -eq 65 ]`
    - Each .sha256 contains exactly one line of 64 hex chars: `grep -cE '^[0-9a-f]{64}$' .planning/fixtures/phase-23/fixture-en.pdf.sha256` returns 1 (and same for de + cs)
    - README exists and references Phase 23: `grep -c 'phase-23' .planning/fixtures/phase-23/README.md` ≥ 1
    - README references the Mitigation: `grep -cE 'Mitigation (A|B)' .planning/fixtures/phase-23/README.md` ≥ 1
    - Harness in check mode passes: `node tests/pdf-latin-regression.test.js` exits 0 (i.e. all 3 fixtures hash to the committed baselines)
    - Distinctive content present in fixtures: `grep -q 'Anna M.' .planning/fixtures/phase-23/fixture-en.json` AND `grep -q 'Müller' .planning/fixtures/phase-23/fixture-de.json` AND `grep -q 'Novák' .planning/fixtures/phase-23/fixture-cs.json`

    Commit message: `test(23-04): Latin-regression harness + 3 fixtures + baseline hashes (T3 closed)`
  </action>
  <verify>
    <automated>node -c tests/pdf-latin-regression.test.js &amp;&amp; node -e "JSON.parse(require('fs').readFileSync('.planning/fixtures/phase-23/fixture-en.json'))" &amp;&amp; node -e "JSON.parse(require('fs').readFileSync('.planning/fixtures/phase-23/fixture-de.json'))" &amp;&amp; node -e "JSON.parse(require('fs').readFileSync('.planning/fixtures/phase-23/fixture-cs.json'))" &amp;&amp; [ "$(wc -c &lt; .planning/fixtures/phase-23/fixture-en.pdf.sha256)" -eq 65 ] &amp;&amp; [ "$(wc -c &lt; .planning/fixtures/phase-23/fixture-de.pdf.sha256)" -eq 65 ] &amp;&amp; [ "$(wc -c &lt; .planning/fixtures/phase-23/fixture-cs.pdf.sha256)" -eq 65 ] &amp;&amp; [ "$(grep -cE '^[0-9a-f]{64}$' .planning/fixtures/phase-23/fixture-en.pdf.sha256)" -eq 1 ] &amp;&amp; [ "$(grep -cE '^[0-9a-f]{64}$' .planning/fixtures/phase-23/fixture-de.pdf.sha256)" -eq 1 ] &amp;&amp; [ "$(grep -cE '^[0-9a-f]{64}$' .planning/fixtures/phase-23/fixture-cs.pdf.sha256)" -eq 1 ] &amp;&amp; [ "$(grep -c 'phase-23' .planning/fixtures/phase-23/README.md)" -ge 1 ] &amp;&amp; [ "$(grep -cE 'Mitigation (A|B)' .planning/fixtures/phase-23/README.md)" -ge 1 ] &amp;&amp; node tests/pdf-latin-regression.test.js &amp;&amp; grep -q 'Anna M.' .planning/fixtures/phase-23/fixture-en.json &amp;&amp; grep -q 'Müller' .planning/fixtures/phase-23/fixture-de.json &amp;&amp; grep -q 'Novák' .planning/fixtures/phase-23/fixture-cs.json</automated>
  </verify>
  <done>
    - Mitigation A/B spike completed; chosen mitigation recorded in harness header and README.
    - 3 fixture JSONs parse cleanly and contain the expected distinctive content (Anna M., Müller, Novák).
    - Harness runs to completion. In check mode (no `--regenerate`), exits 0 against the committed baselines. In regenerate mode, overwrites the .sha256 files with fresh 65-byte values.
    - 3 .sha256 files are exactly 65 bytes each (64 hex chars + newline) and match `^[0-9a-f]{64}$`.
    - README documents purpose, mitigation, regeneration protocol, plan IDs, capture date.
    - All 14 automated gates in the task `<verify>` pass.
  </done>
</task>

</tasks>

<verification>
- Bidi test corpus exists and runs green: `node tests/pdf-bidi.test.js` exits 0 with `Passed 12/12, Failed 0/12.`
- G2 enforced in bidi corpus helper: `grep -c "text.split('')" tests/pdf-bidi.test.js` ≥ 1 AND `grep -cE '\[\.\.\.text\]|Array\.from\(text' tests/pdf-bidi.test.js` == 0.
- All 12 vectors present (5 spot-grep verifications): Hebrew samples + English smoke + emoji surrogate.
- Latin-regression harness exists and parses: `node -c tests/pdf-latin-regression.test.js` exits 0.
- 3 fixture JSONs parse cleanly with distinctive content (Anna M., Müller, Novák).
- 3 .sha256 baseline files exist, each exactly 65 bytes (64 hex + newline), each matches `^[0-9a-f]{64}$`.
- Harness in check mode passes: `node tests/pdf-latin-regression.test.js` exits 0.
- README documents the mitigation used + regeneration protocol + plan IDs.
- No production code (`assets/pdf-export.js`, `sw.js`, `assets/bidi.min.js`) modified.
</verification>

<success_criteria>
- [ ] `tests/pdf-bidi.test.js` runs green against live `assets/bidi.min.js` — all 12 RESEARCH test vectors pass.
- [ ] `tests/pdf-latin-regression.test.js` runs green against the 3 committed baseline hashes.
- [ ] 3 fixture JSONs committed under `.planning/fixtures/phase-23/`.
- [ ] 3 baseline .sha256 hash files committed (each 65 bytes, 64 lowercase hex chars + newline).
- [ ] README.md committed documenting purpose + mitigation + regeneration protocol.
- [ ] Mitigation A or B choice resolved at Step A spike, recorded in harness header + README.
- [ ] All 23 automated gates across the 2 tasks pass.
- [ ] No production code modified.
- [ ] Phase 23 is now ready to ship — orchestrator may proceed to optional Plan 23-05 (footer-centering refactor) or close the phase here.
</success_criteria>

<output>
After completion, create `.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-04-test-vectors-and-latin-regression-SUMMARY.md` capturing:
- Mitigation chosen (A or B), based on the 5-minute spike result.
- Whether JSDOM was already installed or required `npm install`.
- The 3 baseline hash values (so they appear in the SUMMARY for human reading even though the .sha256 files are the source of truth).
- Whether the bidi test corpus passed first-shot or required helper-implementation debugging (any inline-helper drift from RESEARCH's canonical form).
- Any deviations from the planned approach.
- Any new gotchas discovered (especially around JSDOM + jsPDF or determinism-pinning).
</output>
</content>
