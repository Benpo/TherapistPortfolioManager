# Quick Task 260626-h5j: Snippet trigger space handling — Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Task Boundary

User reported "Quick paste of emotions (snippets) is not working in Czech." Investigation
proved there is **no Czech-specific bug**: the engine, seed (full Czech text), validation
(`/^[\p{L}\p{N}-]{2,32}$/u`, accepts Czech accents), i18n, and textarea wiring are all
correct, and all 28 snippet tests pass. The real trigger was the user typing a trigger with
a **space** (`physical trauma`), which the editor correctly rejects. The seed convention for
multi-word emotions is hyphenation (`creative-insecurity`, `lack-of-control`,
`low-self-esteem`, `taken-for-granted`, `wishy-washy`).

Scope = two aligned improvements so a space no longer dead-ends the user, on BOTH the editor
(creation) side and the recall (expansion) side. NOT a Czech bug fix — there is nothing
Czech-specific to fix.
</domain>

<decisions>
## Implementation Decisions (LOCKED — do not revisit)

### Editor side — auto-convert + clearer error
- In the snippet editor trigger input (`assets/settings.js`), **auto-convert spaces to a
  regular hyphen-minus `-` (U+002D)** as the user types the trigger and/or on save. NEVER use
  an em-dash `—` or en-dash `–` — only the plain `-` (U+002D), which is also the only dash the
  `TRIGGER_REGEX` already accepts.
- Improve the format error message so it **guides the user to use a hyphen instead of a
  space** (e.g. "Triggers can't contain spaces — use a hyphen, like `physical-trauma`."), in
  all four locales: en, he, de, cs. Update keys under `snippets.editor.trigger.error.format`
  in `assets/i18n-en.js`, `i18n-he.js`, `i18n-de.js`, `i18n-cs.js`.
- With live auto-convert, a space-containing trigger should generally never reach the error,
  but the reworded message remains the fallback for other invalid input.

### Recall side — smart-commit if unambiguous
- In `assets/snippets.js` (`detectTrigger` / `handleInput`), when the user types a boundary
  char (space etc.) after `<prefix><partial>`:
  1. **Exact trigger match → expand it** (unchanged — `;anger ` still expands "anger").
  2. **No exact match BUT exactly ONE snippet matches the partial** (trigger prefix-match;
     keep existing tag-fallback semantics out of scope unless trivial) → **commit/expand that
     one snippet** (`;physical ` → expands `physical-trauma`; `;low ` → `low-self-esteem`).
  3. **0 candidates, or 2+ candidates → no expansion** (unchanged; popover stays visible for
     2+ so the user picks with arrows/Enter; `;s ` does NOT auto-commit).
- The boundary char's own insertion behavior should match the existing exact-match path
  (exact match today excludes the boundary from replacement — keep expansion + caret behavior
  consistent so the typed space isn't doubled or lost unexpectedly; planner to specify exact
  desired caret/space outcome and test it).

### Claude's Discretion
- Exact wording of the reworded error strings (must convey "no spaces, use a hyphen").
- Whether auto-convert fires on every keystroke (`input`) vs. on save vs. both — pick the
  least surprising; live `input` conversion is preferred so the field self-corrects.
- Internal helper naming and where the single-candidate check lives.
</decisions>

<specifics>
## Specific Ideas

- Seed multi-word triggers all use `-`: `creative-insecurity`, `lack-of-control`,
  `low-self-esteem`, `taken-for-granted`, `unreceived-effort`, `unreceived-love`,
  `wishy-washy`, `heart-shock`. These are the natural single-candidate recall test cases.
- Single-word terminator behavior (`;anger `) is sacred — 53 of 60 seeds are single-word and
  rely on space-as-terminator. Do not regress it.
</specifics>

<canonical_refs>
## Canonical References

- `assets/snippets.js` — `detectTrigger`, `handleInput`, `insertExpansion`, `resolveExpansion`.
- `assets/settings.js` — `isValidTrigger` (~L885), `TRIGGER_REGEX` (~L882), `handleSave`
  (~L1505), editor open/populate (~L1240–1360), `window.__SnippetEditorHelpers` export (~L863).
- Existing behavior tests: `tests/24-04-trigger-regex.test.js`,
  `tests/quick-260619-okw-trigger-unicode.test.js`,
  `tests/quick-260619-okw-cross-lang-warning.test.js`.
- Memory rule `feedback-behavior-verification`: runtime-behavior changes require FALSIFIABLE
  behavior tests written BEFORE implementation (RED → GREEN). This task MUST follow that.
</canonical_refs>
