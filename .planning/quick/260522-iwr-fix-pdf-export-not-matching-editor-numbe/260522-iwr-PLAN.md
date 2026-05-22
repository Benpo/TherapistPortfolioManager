---
phase: quick-260522-iwr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - tests/quick-260522-iwr-ordered-list-export.test.js
  - assets/pdf-export.js
autonomous: true
requirements:
  - QUICK-260522-IWR
must_haves:
  truths:
    - "A numbered/ordered list typed in the editor exports to PDF with every item showing its correct ordinal (1. 2. 3. ...)"
    - "The first numbered item keeps its number — it no longer renders as a bullet"
    - "Items after item 2 keep their numbers — numbering is sequential and unbroken"
    - "Unordered (dash) lists still export with bullet prefixes — no regression"
  artifacts:
    - path: assets/pdf-export.js
      provides: "Ordered-list detection + sequential ordinal rendering in the PDF pipeline"
      contains: "ordered"
    - path: tests/quick-260522-iwr-ordered-list-export.test.js
      provides: "Falsifiable behavior test: ordered-list ordinals present in PDF content stream"
  key_links:
    - from: "parseMarkdown"
      to: "list block renderer"
      via: "block.ordered flag + per-item ordinal"
      pattern: "ordered"
---

<objective>
Fix numbered/ordered list items losing their numbers in exported session PDFs.

In the session export modal ("ייצוא מפגש"), step "עריכה", a therapist types numbered
list items (e.g. "1. תוספתן", "2. עיוות פאציאלי"). The editor preview shows numbers, but
the exported PDF drops them — items render with a "- " bullet instead of an ordinal.

Root cause (confirmed by code read): `assets/pdf-export.js` `parseMarkdown()` at line ~545
detects ordered-list lines (`/^\s*\d+\.\s+/`) but then strips the leading number via
`replace(/^\s*(?:[-*]|\d+\.)\s+/, "")`, collapsing ordered AND unordered lists into one
`{type:'list', items:[...]}` block with NO ordinal information. The list renderer
(lines ~945-991) then hardcodes a `'- '` bullet prefix for EVERY item. There is no
ordered-list code path at all — so all numbers are unconditionally lost. The editor's
visible numbers are the user's literal typed text; the PDF pipeline never carries them.

Purpose: Exported PDF output must match the editor 1:1 for numbered lists — the deliverable
the therapist hands to a client must not silently mangle clinical notes.
Output: An ordered-list-aware PDF pipeline, plus a falsifiable behavior test.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

@assets/pdf-export.js

<interfaces>
<!-- Key contracts the executor needs. Extracted from the codebase. -->

parseMarkdown(markdown) -> Array of blocks. Block types currently:
  { type: 'heading', level, text }
  { type: 'list', items: string[] }    <-- ordered + unordered both land here today (BUG)
  { type: 'para', text }
  { type: 'blank' }

List detection (parseMarkdown, ~line 540-549):
  Trigger:  /^\s*[-*]\s+/  OR  /^\s+\d+\.\s+/  ... actually /^\s*\d+\.\s+/
  Strip:    lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, "")   <-- discards the ordinal

List renderer (buildSessionPDF, ~line 945-991):
  Iterates block.items; for wi===0 prepends a fixed regular-weight segment { text: '- ', bold:false }.
  RTL/LTR anchoring is handled by drawSegmentedLine via drawOpts.leftX / drawOpts.rightX.
  Continuation-line indent uses a fixed 14pt offset.

Behavior-test harness pattern (see tests/pdf-bold-rendering.test.js):
  - Uses jsdom (JSDOM_PATH env, default /tmp/node_modules/jsdom).
  - buildJsdomEnv() evals jspdf.min.js, bidi.min.js, heebo fonts, then pdf-export.js.
  - WrappedJsPDF pins creation date + file id for deterministic output.
  - buildSessionPDF(sessionData, opts) -> Promise<Blob>; sessionData.markdown is the body.
  - Tests walk the PDF content stream collecting (Tf resource, CID) pairs to assert
    which glyphs were drawn. Page-1 title block is always BOLD -> first Tf = Bold resource.
</interfaces>

<test_harness_note>
PDF behavior tests need jsdom. If `/tmp/node_modules/jsdom` is absent:
  mkdir -p /tmp && cd /tmp && npm install jsdom
Then run: `node tests/quick-260522-iwr-ordered-list-export.test.js`
Mirror the env-load + content-stream-walk approach from tests/pdf-bold-rendering.test.js
verbatim — do not invent a new harness.
</test_harness_note>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Write failing behavior test for ordered-list PDF export</name>
  <files>tests/quick-260522-iwr-ordered-list-export.test.js</files>
  <behavior>
    This is a runtime-behavior bug (MEMORY: behavior-verification rule — runtime fixes
    require a falsifiable test that FAILS before the fix, PASSES after; a grep/shape
    check is NOT sufficient). The test builds a real PDF via PDFExport.buildSessionPDF
    and inspects the rendered content, asserting:

    - Test 1 (ordered list, EN): markdown body with
        "1. First item\n2. Second item\n3. Third item"
      The page-1 content stream, decoded to the visible glyph sequence, contains the
      ordinals "1.", "2.", "3." each exactly once, in document order, and contains
      ZERO occurrences of the unordered bullet glyph ("-") as a list prefix.
      (Verify by walking text-show operators / CID stream the same way
      pdf-bold-rendering.test.js derives drawn glyphs; map ordinal digit glyphs.)
    - Test 2 (regression — unordered list still bulleted): markdown body with
        "- alpha\n- beta"
      still renders a "-" bullet prefix on each item and NO digit ordinals.
    - Test 3 (Hebrew ordered list, the user's actual case): markdown body with
        "1. תוספתן\n2. עיוות פאציאלי\n3. בדיקה"
      with opts.uiLang='he'. Every item shows its ordinal; item 1 is NOT a bullet;
      items after item 2 still carry ordinals (the exact reported symptom). The
      ordinal token must survive bidi shaping (digits + "." are an LTR run inside
      an RTL line — assert the digit glyphs for 1/2/3 are all present once each).

    Before the fix, Tests 1 and 3 MUST FAIL (ordinals absent / bullets drawn).
    Test 2 MUST PASS both before and after (proves no unordered-list regression).
  </behavior>
  <action>
    Create tests/quick-260522-iwr-ordered-list-export.test.js. Copy the jsdom env
    setup, WrappedJsPDF date/file-id pinning, and content-stream-walk helper from
    tests/pdf-bold-rendering.test.js (REPO_ROOT, readAsset, buildJsdomEnv, the
    Tf-resource derivation, and the CID-collection loop). Reuse them verbatim — do
    not author a fresh harness.

    Add the three fixtures described in <behavior>. For ordinal detection, render the
    digit glyphs "1" "2" "3" and "." in isolation once to measure their Heebo GIDs
    (mirror how pdf-bold-rendering.test.js measured ASTERISK_GID), then count those
    GIDs in each fixture's page-1 stream. Assert counts and absence-of-bullet as
    described. Print clear PASS/FAIL lines and process.exit(1) on any failure, matching
    the existing test's reporting style.

    Run the test and CONFIRM Tests 1 and 3 FAIL and Test 2 PASSES against the current
    (unfixed) pdf-export.js. Record the failing output in the SUMMARY — this is the
    RED gate. Do NOT touch pdf-export.js in this task.
  </action>
  <verify>
    <automated>node tests/quick-260522-iwr-ordered-list-export.test.js; test $? -ne 0 && echo "RED CONFIRMED: ordered-list tests fail pre-fix"</automated>
  </verify>
  <done>Test file exists; running it against unfixed code FAILS on the ordered-list assertions (Tests 1, 3) and PASSES the unordered regression assertion (Test 2). Failing output captured for the SUMMARY.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add ordered-list support to the PDF pipeline</name>
  <files>assets/pdf-export.js</files>
  <behavior>
    After this task, the Task 1 test passes fully (Tests 1, 2, 3 all green). The PDF
    pipeline distinguishes ordered from unordered lists and renders sequential ordinals
    for ordered lists while preserving the existing bullet behavior for unordered lists.
  </behavior>
  <action>
    Two changes in assets/pdf-export.js, both minimal and contained:

    1. parseMarkdown (~line 540-549): when starting a list, detect whether the FIRST
       list line is ordered (`/^\s*\d+\.\s+/`) or unordered (`/^\s*[-*]\s+/`). Emit
       `block.ordered` (boolean) on the list block. The list is treated as a single
       contiguous run if subsequent lines match EITHER list marker (keep current
       contiguity behavior — do not split a list because a marker style changes
       mid-run; the `ordered` flag is decided by the first line). Keep stripping the
       marker from each item's text (the renderer re-adds the prefix), but additionally
       capture, for ordered lists, the typed ordinal is IGNORED for numbering — the
       renderer assigns sequential ordinals 1..N from item index so numbering is always
       correct and unbroken even if the user mistyped (this is the safe, editor-1:1
       behavior for a clean numbered list). Comment the change referencing this plan.

    2. List renderer (~line 945-991): replace the hardcoded `{ text: '- ', bold:false }`
       prefix. When `block.ordered` is true, the wi===0 prefix segment is
       `{ text: (li + 1) + '. ', bold:false }` where `li` is the item index; when false,
       keep `{ text: '- ', bold:false }`. The prefix is a regular-weight segment so it
       participates in bidi paragraph-direction inference exactly like the bullet does
       today (RTL Hebrew lists: the ordinal is an LTR digit run that drawSegmentedLine
       + shapeForJsPdf already handle — same path as page numbers in the footer). Do
       NOT change the 14pt continuation-line indent or the leftX/rightX anchoring
       logic. For multi-digit ordinals (10. 11. ...) the prefix is naturally wider —
       acceptable; continuation indent stays 14pt (consistent with existing bullet
       behavior). Comment referencing this plan.

    Do not introduce a "v1"/"simplified"/"basic" variant — deliver full sequential
    ordered-list rendering. Run the Task 1 test until all three fixtures pass.
  </action>
  <verify>
    <automated>node tests/quick-260522-iwr-ordered-list-export.test.js && node tests/pdf-bold-rendering.test.js && node tests/pdf-bidi.test.js && node tests/pdf-latin-regression.test.js</automated>
  </verify>
  <done>Task 1 test passes all three fixtures (ordered EN, unordered regression, Hebrew ordered). Existing PDF tests (pdf-bold-rendering, pdf-bidi, pdf-latin-regression) still pass — no regression. Exported numbered lists show correct sequential ordinals; first item and post-item-2 items all keep their numbers.</done>
</task>

</tasks>

<verification>
- `node tests/quick-260522-iwr-ordered-list-export.test.js` — all 3 fixtures pass.
- Pre-fix, the same test FAILS on Tests 1 and 3 (RED gate proven in Task 1).
- `node tests/pdf-bold-rendering.test.js`, `node tests/pdf-bidi.test.js`,
  `node tests/pdf-latin-regression.test.js` — still pass (no regression).
- Manual spot-check (optional): open the export modal, type a numbered list in
  step "עריכה", export — every item shows its number in the PDF.
</verification>

<success_criteria>
- A numbered list typed in the editor exports to PDF with every item numbered 1..N,
  sequential and unbroken.
- The first numbered item is no longer a bullet; items after item 2 keep their numbers.
- Unordered (dash) lists still export with bullet prefixes.
- A falsifiable behavior test exists that failed before the fix and passes after.
- No regression in existing PDF export tests.
</success_criteria>

<output>
After completion, create
`.planning/quick/260522-iwr-fix-pdf-export-not-matching-editor-numbe/260522-iwr-SUMMARY.md`
(include the captured RED failing output from Task 1 and the GREEN passing output from Task 2).
</output>
