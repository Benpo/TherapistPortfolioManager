---
phase: 45-rich-text-rendering-export-foundation
plan: 01
subsystem: ui
tags: [markdown, md-render, rendering, xss, escape-first, lists, strip]

# Dependency graph
requires:
  - phase: 22-pdf-export-and-preview
    provides: window.MdRender escape-first renderer + export-modal preview wiring
provides:
  - MdRender ordered-list (1.) rendering as <ol><li>
  - MdRender nested (bullet + numbered, mixed-type) list rendering
  - Text-then-list split (Emotions:\n- anger -> <p> + <ul>), no literal - tokens
  - D-08 hardened inline emphasis (markers hug non-whitespace; legacy asterisks stay literal)
  - window.MdRender.strip(markdown) markdown->plain-text helper (D-06)
affects: [45-02-pdf-hardening, 45-04-read-mode-and-compact-surfaces, 45-05-cross-pipeline-source-assertion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nested-list tree built by leading-whitespace depth (2 spaces = 1 level; floor(spaces/2))"
    - "Each nested list run's ordered-ness decided by its OWN marker (mixed-type nesting)"
    - "Emphasis-hug via non-whitespace char-class boundaries (NO regex lookbehind — Safari <16.4)"
    - "Shared markdown->plain-text strip helper consumed via textContent (never innerHTML)"

key-files:
  created:
    - tests/45-mdrender-lists.test.js
    - tests/45-mdrender-escape.test.js
    - tests/45-mdrender-strip.test.js
  modified:
    - assets/md-render.js

key-decisions:
  - "Nesting convention pinned: 2 leading spaces = 1 level; floor(spaces/2) folds the 3-space ordinal-continuation indent to level 1"
  - "Emphasis regexes made CHARACTER-IDENTICAL contract source for Plan 02 pdf-export.js: bold /\\*\\*([^*\\s\\n](?:[^*\\n]*?[^*\\s\\n])?)\\*\\*/g, italic /(^|[^*])\\*([^*\\s\\n](?:[^*\\n]*?[^*\\s\\n])?)\\*(?!\\*)/g"
  - "strip() returns plain text (no HTML escaping) for textContent consumers; preserves line breaks with \\n join"

patterns-established:
  - "List detection replaced lines.every() gate with first-list-index split so leading text and trailing text co-exist with a list run in one block"
  - "Isolated-jsdom eval of the real asset + observable-HTML assertions + count guard (no vacuous green)"

requirements-completed: [RTXT-06, RTXT-07, RTXT-10]

coverage:
  - id: D1
    description: "MdRender renders ordered (1.) lists as <ol><li> and nested bullet+numbered (incl. mixed-type) lists as nested <ul>/<ol>; text-then-list splits into <p> + real list with no literal - token; flat-list output byte-identical to pre-change"
    requirement: RTXT-07
    verification:
      - kind: unit
        ref: "tests/45-mdrender-lists.test.js (9 cases)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Inline emphasis hardened (D-08): legacy '2 * 3 * 4' and '** bold **' stay literal; **bold**/*italic*/a *b* c preserved; escape-first proven XSS-safe (<script>/<img onerror> render inert); no lookbehind"
    requirement: RTXT-10
    verification:
      - kind: unit
        ref: "tests/45-mdrender-escape.test.js (9 cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "MdRender.strip(markdown) returns marker-free plain text (inline + block markers) agreeing with the D-08 rule; empty/null -> ''"
    requirement: RTXT-06
    verification:
      - kind: unit
        ref: "tests/45-mdrender-strip.test.js (9 cases)"
        status: pass
    human_judgment: false

# Metrics
duration: 9min
completed: 2026-07-13
status: complete
---

# Phase 45 Plan 01: MdRender ordered/nested lists, D-08 inline hardening & strip() Summary

**Extended the shipped escape-first `window.MdRender` in place with ordered (`1.`) + nested (bullet/numbered, mixed-type) list rendering, text-then-list splitting, CommonMark-style inline hardening (legacy asterisks stay literal), and a new `strip()` markdown→plain-text helper — all TDD, full suite green (175/175).**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-07-13T09:00:17Z
- **Completed:** 2026-07-13T09:09:08Z
- **Tasks:** 3 (all TDD: RED test → GREEN impl)
- **Files modified:** 1 source + 3 new test files

## Accomplishments
- Ordered-list (`1.`/`2.`/`3.`) rendering as `<ol><li>`; browser numbers the `<ol>` (no re-derived ordinals).
- Nested bullet AND numbered lists via leading-whitespace depth tracking (2 spaces = 1 level); each nested run keeps its OWN marker type so `- a\n  1. b` renders an `<ol>` nested inside a `<ul><li>` (mixed-type nesting — the shared Plan 02/05 contract).
- Text-then-list blocks with no blank line (`Emotions:\n- anger`) split into `<p>Emotions:</p><ul><li>anger</li></ul>` — never a literal `- anger` token (WARNING 3 / ROADMAP criterion 1); symmetric list-then-text handling too.
- D-08 inline hardening: emphasis markers must hug non-whitespace, so legacy `2 * 3 * 4` and `** bold **` stay literal while `**bold**`/`*italic*`/`a *b* c` still render. Implemented with char-class boundaries — NO regex lookbehind (Safari < 16.4 compat).
- `window.MdRender.strip(markdown)` new public helper: removes inline emphasis (same hardened rule) + leading block markers (`#`/`##`/`###`, `-`/`*`, `N.`) per line, returns plain text for `textContent` (never innerHTML).
- Flat-list output byte-identical to pre-change; LOCKED `<br>`/paragraph contract comment untouched.

## Task Commits

Each task committed atomically (TDD RED → GREEN):

1. **Task 1: ordered + nested lists** — `8461391` (test) → `65fd075` (feat)
2. **Task 2: D-08 inline hardening + escape-first** — `68bce58` (test) → `5462019` (feat)
3. **Task 3: MdRender.strip() helper** — `9674622` (test) → `f8b2249` (feat)

_Note: TDD tasks have a test commit then an implementation commit._

## Files Created/Modified
- `assets/md-render.js` — list helpers (isListItem/listDepth/listType/stripListMarker/buildList/buildListLevel), reworked list branch in `renderBlock`, hardened `applyInline` emphasis regexes, new `stripInline`/`strip` + exposed `strip` on the module.
- `tests/45-mdrender-lists.test.js` — 9 cases: ordered, nested bullet/numbered/mixed, text-then-list, list-then-text, flat regression lock, `<br>` contract.
- `tests/45-mdrender-escape.test.js` — 9 cases: D-08 table + escape-first XSS (`<script>`/`<img onerror>` inert via innerHTML) + no-lookbehind source guard.
- `tests/45-mdrender-strip.test.js` — 9 cases: inline + block strip, legacy literal, multi-line, empty/null.

## Decisions Made
- **Depth = floor(leadingSpaces / 2).** Folds the pinned 3-space ordinal-continuation indent (`   1. b` under `1. a`) and the 2-space bullet indent to the same level 1 — satisfies every pinned nesting case with one rule.
- **Emphasis regex canonical form pinned** (see frontmatter key-decisions) as the character-identical source Plan 02 will replicate in `pdf-export.js` `stripInlineMarkdown`/`parseInlineBold`; Plan 05 Task 1 asserts cross-file identity. Transient divergence with the still-unhardened `pdf-export.js` is expected until Plan 02 lands.
- **strip() does NOT HTML-escape** — output is plain text assigned via `textContent` by the Plan 04 compact surfaces; escaping would be wrong there.

## Deviations from Plan
None - plan executed exactly as written. All three tasks followed the pinned behavior tables and acceptance criteria; no bugs, missing functionality, or blocking issues required auto-fixing.

## Issues Encountered
- A `git stash`/`git stash pop` during a mid-task regression check (run before the Task 1 impl was committed) temporarily set aside the uncommitted `md-render.js` changes; restored via `git stash pop` and re-verified green. No work lost.
- The `tests/quick-260620-q8m-*.test.js` file fails when run bare because it defaults to `JSDOM_PATH=/tmp/node_modules/jsdom`; it passes 4/4 under the repo jsdom path and under `tests/run-all.js` (which bridges `JSDOM_PATH`). Pre-existing environmental default, not a regression from this plan.

## Threat Flags
None — no new security surface. T-45-01 (stored XSS via note→innerHTML) mitigation is preserved and proven: `escapeHtml` still runs on the entire input before any markdown rule, and the escape-first test asserts `<script>`/`<img onerror>` render inert. `strip()` (T-45-02) emits plain text only.

## Next Phase Readiness
- MdRender is now complete for downstream read surfaces: Plan 02 (PDF hardening) must mirror the pinned emphasis regexes character-for-character; Plan 04 (read-mode overlay + compact surfaces) can consume `MdRender.render` (innerHTML) and `MdRender.strip` (textContent).
- Docs hard-gate reminder for the eventual push: `assets/md-render.js` is a watched file — an EN changelog entry (and help-topic touch or trailer) will be needed at push time per project CLAUDE.md Definition of Done.

## Self-Check: PASSED

All created files exist on disk; all 6 task commits (`8461391`, `65fd075`, `68bce58`, `5462019`, `9674622`, `f8b2249`) present in git history. Full suite: 175 passed, 0 failed.

---
*Phase: 45-rich-text-rendering-export-foundation*
*Completed: 2026-07-13*
