---
phase: quick-260516-rna
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - tests/quick-260516-rna-textarea-autogrow.test.js
  - assets/add-session.js
  - assets/app.css
autonomous: true
requirements:
  - QUICK-260516-rna
must_haves:
  truths:
    - "Typing past the visible height in a long add-session textarea makes it grow taller automatically (no inner scroll, no trimmed look)"
    - "Opening an existing session for EDIT shows the long textareas already sized to fit their pre-filled content (not trimmed until the user types)"
    - "Manual vertical drag-resize still works as a fallback"
    - "Snippet expansion (data-snippets textareas) still works — no input-handler conflict"
  artifacts:
    - path: "tests/quick-260516-rna-textarea-autogrow.test.js"
      provides: "Falsifiable behavior test for the scrollHeight-based grow logic"
      contains: "scrollHeight"
    - path: "assets/add-session.js"
      provides: "Always-on auto-grow helper bound on input + initial population"
      contains: "autoGrow"
  key_links:
    - from: "sessionForm input event"
      to: "autoGrow helper"
      via: "delegated input listener on .session-textarea"
      pattern: "addEventListener\\(\"input\""
    - from: "populateSession() / form load"
      to: "autoGrow helper"
      via: "explicit grow call after .value assignment"
      pattern: "autoGrow|growAllSessionTextareas"
---

<objective>
Make the long-form session textareas on the add-session page auto-grow in height
to fit their content — both while typing AND on initial load when editing an
existing session — while keeping manual vertical resize as a fallback and not
breaking snippet expansion.

Purpose: User reports the long fields (notably the last two: "Session Notes and
Observations" #sessionComments and "Information for Next Session"
#customerSummary) trim/scroll instead of growing. The request explicitly asks to
apply this consistently to the intended long fields.

Output: A reusable auto-grow helper applied to every `.session-textarea`, a
falsifiable behavior test, and a CSS guard so the grow logic is not fought by
fixed sizing.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

<interfaces>
<!-- Extracted from the codebase. Executor uses these directly — no exploration needed. -->

The 8 long-form session textareas (add-session.html). They ALL share
`class="textarea session-textarea"` and (except sessionComments/customerSummary)
also `data-snippets="true"`. In visual/document order:
  1. #heartShieldEmotions   (line 245, conditional)
  2. #trappedEmotions       (line 263)
  3. #sessionInsights       (line 276)
  4. #limitingBeliefs       (line 289)
  5. #additionalTech        (line 302)
  6. #sessionComments       (line 331)  -- user's "2nd-to-last"
  7. #customerSummary       (line 344)  -- user's "last field"

NOT in scope: #exportEditor (export modal — handled by prior task 260516-g7p),
#inlineClientNotes, #editClientNotes (different non-session textareas).

Existing reusable pattern — assets/add-session.js lines 61, 146-159:
  - `const readModeTextareas = document.querySelectorAll(".session-textarea");`
  - `resizeReadModeTextareas()` sets `style.height="auto"` then
    `style.height = Math.max(scrollHeight, 56) + "px"` per textarea.
  - `clearReadModeTextareas()` resets `style.height = ""`.
  - Called ONLY from setReadMode() (lines 221, 223). NOT bound to `input`,
    so it does nothing while the user types in edit mode.

Form input wiring — assets/add-session.js lines 90-94:
  `sessionForm.addEventListener("input", () => { formDirty = true; ... });`
  fires on every keystroke (bubbles). Snippets bind their own `input` listener
  directly per data-snippets textarea (assets/snippets.js:455). Both coexist
  with a measure-only auto-grow reaction (we read scrollHeight + set
  style.height; we never preventDefault/stop propagation/mutate .value).

Edit pre-fill path — assets/add-session.js `populateSession()` lines 2033-2050:
  sets `.value` on #trappedEmotions, #sessionComments, #sessionInsights,
  #customerSummary, #limitingBeliefs, #additionalTech. Heart-shield emotions
  populated separately in the block at ~line 2064.

CSS — assets/app.css lines 1009-1019:
  `.textarea { min-height: 140px; resize: vertical; }`
  `.read-mode .textarea.session-textarea{ min-height:56px; resize:none; overflow:hidden; }`
  No max-height and no overflow:hidden on the editable (non-read-mode) state.
</interfaces>

Test pattern reference (vm-sandbox, falsifiable, project convention
MEMORY:feedback-behavior-verification): @tests/quick-260516-g7p-export-editor-snippets.test.js
Runner: plain `node tests/<file>.js`, exit 0 pass / 1 fail, local
`test(name, fn)` harness, `require('vm')` sandbox loading the REAL asset,
`ROOT = path.join(__dirname, '..')`. Helpers dir: tests/_helpers/.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Write falsifiable behavior test for the auto-grow grow-to-fit logic</name>
  <files>tests/quick-260516-rna-textarea-autogrow.test.js</files>
  <behavior>
    - Test A (source contract — load-bearing shape): assets/add-session.js
      defines a reusable auto-grow helper whose body resets
      `style.height = "auto"` then sets `style.height` from `scrollHeight`,
      AND binds it on the form `input` event filtered to `.session-textarea`,
      AND invokes it after `populateSession` pre-fills values (grep the
      source: an `autoGrow`/`growAllSessionTextareas`-named symbol referenced
      both in an `input` path and in/after `populateSession`).
    - Test B (behavior — causal, the real fix): load assets/add-session.js's
      exposed pure hook `window.__addSessionTestHooks.computeGrowHeight` via a
      vm sandbox with stubbed document/window (mirroring the g7p sandbox
      approach). Construct a fake textarea-like object where `scrollHeight`
      reflects content length (e.g. `56 + 20 * lineCount`). Assert: SHORT
      content -> computed height equals the 56px floor; LONG content (many
      lines) -> computed height equals the larger scrollHeight value AND
      `heightFor(long) > heightFor(short)`. The contrast (short stays at
      floor, long grows) proves grow-to-fit, not a constant.
    - Test C (no-cap / fallback intact): assert the height computation does
      NOT clamp to a hard max (no `Math.min(` wrapping the height value);
      assert assets/app.css still declares `resize: vertical` on `.textarea`
      (manual drag fallback preserved) and the editable (non-read-mode)
      state does not add `overflow:hidden`/`max-height`.
  </behavior>
  <action>
    Create tests/quick-260516-rna-textarea-autogrow.test.js following the
    EXACT structure of tests/quick-260516-g7p-export-editor-snippets.test.js
    (`'use strict'`, `fs`/`path`/`vm`/`assert`, local `test()` harness,
    `ROOT = path.join(__dirname, '..')`, `process.exitCode`/exit 1 on any
    failure). Read assets/add-session.js, add-session.html, assets/app.css as
    text for the structural assertions (Test A, Test C CSS check). For the
    causal Test B, load add-session.js in a vm sandbox with minimal
    document/window stubs (it is an IIFE/DOMContentLoaded module — stub
    `document.addEventListener`, `getElementById`→null,
    `querySelectorAll`→[], a `window` object) so module evaluation reaches the
    line that assigns `window.__addSessionTestHooks = { computeGrowHeight }`,
    then call `computeGrowHeight(fakeTextarea)` directly. The test MUST FAIL
    before Task 2 (no auto-grow on input today; hook absent) and PASS after.
    Write the file with the Write tool — do not inline implementation here.
  </action>
  <verify>
    <automated>node tests/quick-260516-rna-textarea-autogrow.test.js; test $? -ne 0 && echo RED-as-expected || echo UNEXPECTED-GREEN</automated>
  </verify>
  <done>Test file exists, runs via plain node, and FAILS (exit 1) against the current unmodified add-session.js — establishing a falsifiable RED state before the fix. Conventional commit: `test(quick-260516-rna): add failing behavior test for textarea auto-grow`.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add always-on auto-grow helper + bind on input and edit-load; CSS guard</name>
  <files>assets/add-session.js, assets/app.css</files>
  <behavior>
    - On `input` in any `.session-textarea`, height is reset to `auto` then
      set from `scrollHeight` (existing 56px floor), so it grows to fit typed
      content with no inner scroll and no hard max cap.
    - After `populateSession()` pre-fills an existing session for editing,
      every `.session-textarea` (including heart-shield emotions) is grown to
      fit its pre-filled value immediately — not trimmed until first keystroke.
    - Manual vertical drag-resize still works (`resize: vertical` retained).
    - Snippet expansion still works (helper only measures + sets height; no
      preventDefault, no stopPropagation, no `.value` mutation).
    - Read-mode behavior unchanged (resizeReadModeTextareas path and the
      `.read-mode` CSS override still apply).
  </behavior>
  <action>
    In assets/add-session.js: extract a pure `computeGrowHeight(el)` returning
    `Math.max(el.scrollHeight, 56)` with NO upper clamp, and an `autoGrow(el)`
    doing `el.style.height = "auto"; el.style.height = computeGrowHeight(el) + "px"`.
    Refactor `resizeReadModeTextareas()` to call `autoGrow` per element so the
    scrollHeight math is single-sourced (no duplication). Bind a delegated
    `input` listener (on `sessionForm`, filtered by
    `e.target.classList && e.target.classList.contains("session-textarea")`)
    that calls `autoGrow(e.target)` — composes with the existing line 90-94
    form `input` listener and the per-textarea snippets listener
    (order-independent, measure-only). Add `growAllSessionTextareas()` that
    iterates the `.session-textarea` NodeList and runs `autoGrow` on each;
    call it after `populateSession(...)` assigns values (and after the
    heart-shield emotions block ~line 2064), and once after initial form
    construction/i18n placeholder application for a fresh page. Expose the
    pure hook for the test: `if (typeof window !== "undefined")
    window.__addSessionTestHooks = Object.assign(window.__addSessionTestHooks
    || {}, { computeGrowHeight });` (mirrors the g7p `__*TestHooks`
    convention). Do NOT add any max-height cap (user explicitly wants
    grow-to-fit).
    In assets/app.css (~lines 1009-1019): keep `.textarea { resize: vertical; }`
    exactly as-is; ensure `.textarea` has `box-sizing: border-box;` (add only
    if not already inherited) so JS scrollHeight assignment does not creep by
    border/padding; do NOT add `overflow:hidden` or `max-height` to the
    editable state; leave `.read-mode .textarea.session-textarea` untouched.
    RTL/mobile: height logic is direction-agnostic — make NO direction-specific
    changes.
    NOTE (MEMORY:reference-pre-commit-sw-bump): assets/add-session.js and
    assets/app.css are precached; the pre-commit hook auto-bumps sw.js
    CACHE_NAME because the changed assets are NOT sw.js — do NOT hand-edit
    sw.js and do NOT add a manual chore commit for the bump.
  </action>
  <verify>
    <automated>node tests/quick-260516-rna-textarea-autogrow.test.js && node tests/quick-260516-g7p-export-editor-snippets.test.js && grep -v '^#' assets/app.css | grep -c 'resize: vertical'</automated>
  </verify>
  <done>The rna behavior test PASSES (exit 0); the g7p snippets regression test still PASSES (no input-handler conflict); `assets/app.css` still declares `resize: vertical` on `.textarea`; the auto-grow helper is single-sourced (read-mode path reuses it). Conventional commit: `fix(quick-260516-rna): auto-grow long add-session textareas to fit content`.</done>
</task>

</tasks>

<verification>
- `node tests/quick-260516-rna-textarea-autogrow.test.js` exits 0.
- `node tests/quick-260516-g7p-export-editor-snippets.test.js` still exits 0 (no input-handler regression).
- Manual sanity (executor, optional): in browser, typing a long note into #customerSummary / #sessionComments grows the box; opening an existing long session for edit shows full content on load; dragging the resize handle still works; Hebrew/RTL shows no layout regression.
</verification>

<success_criteria>
- All `.session-textarea` fields on add-session.html auto-grow on input and on edit-load.
- No hard max-height cap; `resize: vertical` fallback intact.
- Snippet expansion unaffected (g7p regression test green).
- Read-mode resize logic single-sourced through the same helper.
- Two atomic conventional commits (test, then fix).
</success_criteria>

<output>
After completion, create `.planning/quick/260516-rna-add-session-textarea-autogrow/260516-rna-SUMMARY.md`
summarizing the helper added, the textareas affected, and the test result.
</output>
