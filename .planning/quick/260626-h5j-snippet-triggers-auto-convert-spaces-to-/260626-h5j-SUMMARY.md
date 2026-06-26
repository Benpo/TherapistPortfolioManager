---
phase: quick-260626-h5j
plan: 01
subsystem: snippets
status: complete
tags: [snippets, trigger, recall, editor, i18n, tdd]
requires: []
provides:
  - "detectTrigger single-candidate smart-commit (sole trigger prefix-match on a boundary-terminated partial)"
  - "window.__SnippetEditorHelpers.hyphenateSpaces (space->U+002D pure helper)"
  - "Live + defensive editor space->hyphen conversion on the trigger input"
  - "Reworded snippets.editor.trigger.error.format in en/he/de/cs"
affects:
  - assets/snippets.js
  - assets/settings.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
tech_stack:
  added: []
  patterns:
    - "vm-sandbox + __testExports / __SnippetEditorHelpers behavior tests (RED->GREEN)"
    - "Single-pass map scan with early bail to preserve the ReDoS budget"
key_files:
  created:
    - tests/quick-260626-h5j-recall-smart-commit.test.js
    - tests/quick-260626-h5j-trigger-autoconvert.test.js
  modified:
    - assets/snippets.js
    - assets/settings.js
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "Recall auto-commit counts TRIGGER prefix-matches ONLY — tag-fallback stays popover-only; sole match reuses the exact-match shape (end = matchEnd - boundary.length) so the typed boundary survives."
  - "Editor converts whitespace to U+002D hyphen-minus only (never em/en dash); live caret-preserving input listener + defensive handleSave pass."
  - "Format error reworded to name the no-space/use-a-hyphen rule with the physical-trauma example in each locale's native escaping style."
metrics:
  duration: ~12min
  completed: 2026-06-26
---

# Quick Task 260626-h5j: Snippet trigger space handling Summary

Multi-word emotions (`physical-trauma`, `low-self-esteem`) are now both creatable and recallable when the user instinctively types a space — on the editor side spaces auto-convert to a hyphen-minus, and on the recall side a boundary-terminated partial auto-commits when exactly one trigger prefix-matches — while the 53 single-word seed triggers that rely on space-as-terminator keep working byte-for-byte.

## What was built

**Task 1 — Recall smart-commit (`assets/snippets.js`, `detectTrigger`):** Inside the existing `if (hasBoundary)` branch, the exact-match lookup and its return are unchanged. When there is no exact trigger, a single pass over the snippet map counts trigger prefix-matches (same `startsWith(triggerText)` test as the partial branch, with an early bail at the 2nd match to keep the ReDoS budget). Exactly one match returns a `match` result in the same shape as the exact path (`end = matchEnd - m[3].length`, so the typed boundary char survives); 0 or 2+ matches return `null` (unchanged). Tag prefix-matches are deliberately excluded — only an unambiguous TRIGGER prefix auto-commits, so the tag-fallback (seam dd78aff) stays popover-only.

**Task 2 — Editor auto-convert + clearer error (`assets/settings.js` + 4 i18n files):** New pure `hyphenateSpaces` helper (`String(value).replace(/\s+/g, "-")`, U+002D only) exported on `window.__SnippetEditorHelpers`. A live caret-preserving `input` listener on `#snippetEditorTrigger` self-corrects `physical trauma` -> `physical-trauma` as the user types (writes `element.value` only — the no-innerHTML grep gate is preserved). `handleSave` routes the raw value through the helper before validation so a pasted/programmatic space can never reach the format error. The `snippets.editor.trigger.error.format` copy in en/he/de/cs now guides the user to use a hyphen with the `physical-trauma` example, each in its file's native escaping style (en plain ASCII; he raw Hebrew; de/cs `\uXXXX` escapes).

## TDD evidence (RED -> GREEN)

**Task 1** — `tests/quick-260626-h5j-recall-smart-commit.test.js` was RED before implementation (Tests 1, 2, 6, 8, 10 failed because `detectTrigger` returned `null` whenever a boundary was present with no exact trigger; 6 passed, 5 failed). After implementation, GREEN:

```
  PASS  1. `;physical ` (sole prefix-match) auto-commits physical-trauma
  PASS  2. `;low ` (sole prefix-match) auto-commits low-self-esteem
  PASS  3. `;anger ` and `;shame ` keep exact-match terminator behavior
  PASS  4. `;s ` (2+ prefix-matches) does NOT auto-commit
  PASS  5. `;xyz ` (0 prefix-matches) returns null
  PASS  6. sole-candidate match excludes the trailing boundary char
  PASS  7. `;physi` (no boundary) still returns a partial popover result
  PASS  8. `;PHYSICAL ` and `;Physical ` auto-commit physical-trauma, boundary kept
  PASS  9. `;emoti ` (matches a TAG, no trigger prefix) does NOT auto-commit
  PASS  10. `;ztráta ` (sole non-ASCII prefix-match) auto-commits ztráta-důvěry
  PASS  11. adversarial `;`*9999 + "a" completes < 50ms over 5 iterations

Quick 260626-h5j recall smart-commit tests — 11 passed, 0 failed
```

**Task 2** — `tests/quick-260626-h5j-trigger-autoconvert.test.js` was RED before implementation (harness guard failed: `window.__SnippetEditorHelpers.hyphenateSpaces` undefined, exit 1). After implementation, GREEN:

```
  PASS  1. hyphenateSpaces("physical trauma") === "physical-trauma"
  PASS  2. no fancy dash — separator is U+002D, never em (U+2014) / en (U+2013)
  PASS  3. round-trip valid: isValidTrigger(hyphenateSpaces("physical trauma")) === true
  PASS  4. leading/trailing/space-only handled: trimmed output has no whitespace
  PASS  5. idempotent on already-hyphenated: "low-self-esteem" unchanged
  PASS  6. unicode unaffected: hyphenateSpaces("כעס") === "כעס" and is valid

Quick 260626-h5j trigger-autoconvert tests — 6 passed, 0 failed
```

## Regression gate (both GREEN)

```
24-04:       Plan 04 trigger-regex tests — 11 passed, 0 failed
260619-okw:  Quick 260619-okw isValidTrigger tests — 11 passed, 0 failed
```

The `;anger ` / `;shame ` exact-match terminators, partial-popover, locale-fallback, tag-fallback, hyphen-slug, case-insensitive, and ReDoS outcomes are all unchanged.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `d284ee6` | feat(quick-260626-h5j): recall smart-commit for sole prefix-matching trigger |
| 2 | `92dbef4` | feat(quick-260626-h5j): editor space->hyphen auto-convert + reworded error copy |

## Deviations from Plan

None — plan executed exactly as written. Both tasks followed RED->GREEN TDD; all assertions in both `<behavior>` blocks were implemented.

## Notes

- **Pre-commit hook:** On both commits the hook printed `[pre-commit] WARNING: Could not parse version from sw.js — skipping auto-bump.` and did not block. Neither commit touches `sw.js` and no PRECACHE_URLS changed, so no cache bump was required (consistent with memory `reference-pre-commit-sw-bump`).
- **i18n escaping:** The Edit tool wrote de/cs accented characters back in the files' existing `\uXXXX` escaped form (verified on disk: de `Auslöser`/`dürfen`, cs `Spouštěč`/`nesmí`/`Použijte`/`pomlčku`/`např`); he stayed raw Hebrew; en stayed plain ASCII. All four i18n files pass `node --check`.

## Known Stubs

None.

## Self-Check: PASSED

- Files created: `tests/quick-260626-h5j-recall-smart-commit.test.js` FOUND, `tests/quick-260626-h5j-trigger-autoconvert.test.js` FOUND.
- Commits: `d284ee6` FOUND, `92dbef4` FOUND.
- All 4 test suites exit 0.
