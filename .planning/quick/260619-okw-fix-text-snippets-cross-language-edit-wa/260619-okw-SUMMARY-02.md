---
phase: quick-260619-okw
plan: 02
type: execute
base_commit: e9a6910
status: complete
commits:
  - 6f34a62  # Task 1: isModifiedSeed timestamp semantics
  - 5a9ac82  # Task 2: cross-language warning copy + {current}
  - a8299e4  # Task 3: translate icon replaces chevron
  - 3c14b06  # Task 4: bare trigger in import collision dialog
files_modified:
  - assets/settings.js
  - assets/app.css
  - settings.html
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
  - tests/24-05-modified-seed.test.js
  - sw.js   # CACHE_NAME auto-bumped by pre-commit hook (v201 → v205)
---

# Quick 260619-okw Plan 02: Text-Snippets UAT Follow-ups Summary

Four follow-up fixes from Ben's UAT of the Text Snippets feature, executed as four
atomic code-only commits on `main` over base `e9a6910`. The export false-positive
(Task 1) was fixed under a mandatory RED→GREEN behavior gate. The DB layer was NOT
touched — the `critical_design_note` invariant (only the edit path bumps `updatedAt`;
reset/seed/restore preserve it) was honored.

## Task 1 — isModifiedSeed = timestamp signal (export false-positive)

**Commit:** `6f34a62`
**Files:** `tests/24-05-modified-seed.test.js`, `assets/settings.js`

The bug: `isModifiedSeed` had an early `updatedAt > createdAt` short-circuit but STILL
fell through to a byte-compare of trigger/expansions/tags against the live seed pack.
Because re-seeding is additive-only, a seed whose pack text drifted between app versions
(e.g. `seed.unreceived-effort` EN word order "Unreceived Effort" → "Effort Unreceived")
kept its old text in IndexedDB with `updatedAt === createdAt` yet was byte-flagged
modified — wrongly exported and offered Reset-to-default. Fix: return true ONLY when
`snippet.updatedAt > snippet.createdAt`; the byte-compare block was deleted.

Added an invariant comment at `handleSave`'s edit-branch `updatedAt: now` documenting
that export/Reset logic depends on the bump (behavior unchanged). Did NOT add a bump to
`db.updateSnippet` — that would make backup restore (`backup.js:1084`, passes the snippet
as-is to preserve timestamps) reintroduce the false positive.

### RED evidence (revised test vs UNCHANGED settings.js)

Scenarios E/F/G/H flipped to expect `false` (drift, not an edit) and a new scenario I
reproduces Ben's word-order-drift case. Against the old byte-compare code:

```
  PASS  A. origin="user" → false (not a seed)
  PASS  B. origin="seed", id has no match in seedPack → false (orphan)
  PASS  C. seed, updatedAt > createdAt → true (user edited)
  PASS  D. seed, timestamps equal, content matches exactly → false (untouched)
  FAIL  E. seed, timestamps equal, one locale expansion differs (drift) → false
        E: expected false, got true
  FAIL  F. seed, timestamps equal, tags differ → false (drift, not a user edit)
        F: expected false, got true
  FAIL  G. seed, timestamps equal, trigger differs → false (drift, not a user edit)
        G: expected false, got true
  FAIL  H. seed, timestamps equal, trailing-whitespace diff → false (drift, not a user edit)
        H: expected false, got true
  FAIL  I. Ben's drift case: EN word-order changed in pack, never edited → false
        I: expected false, got true
  PASS  J. edited seed whose content happens to match pack but updatedAt>createdAt → true

Plan 05 isModifiedSeed tests (timestamp semantics) — 5 passed, 5 failed   (exit 1)
```

### GREEN evidence (after settings.js change)

```
  PASS  A. … PASS  J.   (all 10)
Plan 05 isModifiedSeed tests (timestamp semantics) — 10 passed, 0 failed   (exit 0)
```

Plus no regression: `24-05-list-filter` (15 pass), `24-04-shape-validator` (9 pass).

## Task 2 — Natural-language warning copy + {current} placeholder

**Commit:** `5a9ac82`
**Files:** `assets/i18n-en.js`, `assets/i18n-he.js`, `assets/i18n-de.js`, `assets/i18n-cs.js`, `assets/settings.js`

Replaced `snippets.editor.langWarning` in all four locales with the Ben-approved copy
(DE uses formal "Sie" and "Textbaustein"). `openEditor` now interpolates a new `{current}`
(current-language name via `snippets.lang.name.<lang>`) alongside `{langs}`, still assigned
via `textContent` (never innerHTML).

Verified: `quick-260619-okw-cross-lang-warning` (6 pass) — the pure `getCrossLangWarning`
helper is unchanged; the warning-composition change lives in DOM-bound `openEditor` and is
covered by the manual EN/HE check noted in the plan.

## Task 3 — Translate icon replaces chevron (keep label)

**Commit:** `a8299e4`
**Files:** `settings.html`, `assets/app.css`

Replaced the `▸` chevron span in `#snippetEditorTranslationsToggle` with an inline Material
"translate" SVG (`aria-hidden`, `fill:currentColor`), keeping the existing `.button-label`.
Removed all four `.snippets-translations-chevron` rules (base, rotation, two RTL transforms)
and added `.snippets-translations-icon { inline-size:1.1em; block-size:1.1em; flex:0 0 auto; }`.
`.snippets-translations-toggle` layout and the `.is-attention` ring are unchanged.
Confirmed no `snippets-translations-chevron` / `▸` references remain in the toggle context
(the lone `▸` at `app.css:3000` is the unrelated `.export-format-help summary::before`).

## Task 4 — Import collision dialog shows bare trigger

**Commit:** `3c14b06`
**Files:** `assets/settings.js`

`openCollisionModal` now sets `label.textContent = c.trigger;` (was `prefix + c.trigger`)
and the now-unused `getPrefix()` lookup was removed from the function. This matches the
main list (`buildListRow`, bare trigger) and eliminates the RTL bidi-reordered phantom "?".

## Tests run (final)

| Test | Result |
|------|--------|
| `tests/24-05-modified-seed.test.js` | PASS (10/10, exit 0; RED proven 5 fail pre-change) |
| `tests/24-05-list-filter.test.js` | PASS (15/15, exit 0) |
| `tests/24-04-shape-validator.test.js` | PASS (9/9, exit 0) |
| `tests/quick-260619-okw-cross-lang-warning.test.js` | PASS (6/6, exit 0) |
| `tests/quick-260619-okw-trigger-unicode.test.js` | PASS (11/11, exit 0) |

No automated test exists for the `{current}` interpolation, the SVG/CSS swap, or the
collision-dialog bare trigger — all three carry `<manual>` verification in the plan.

## Deviations from Plan

**1. [Pre-commit hook] sw.js CACHE_NAME auto-bumped into each commit (v201 → v205).**
The repo's pre-commit hook detects cached-asset changes and amends a `sw.js` CACHE_NAME
bump into the same commit. This is established project behavior (see memory
`reference-pre-commit-sw-bump.md`), not a change I authored. Each of the four task commits
therefore also touches `sw.js`. No separate chore commit was needed because the hook staged
it automatically and left the working tree clean.

**2. [Minor — plan text drift] isModifiedSeed already had the timestamp short-circuit.**
The plan described replacing "the byte-compare block"; in the actual `e9a6910` source the
function already contained an `updatedAt > createdAt` early-return AND the byte-compare
fall-through. I removed the byte-compare fall-through and the redundant early-return,
leaving the single timestamp return exactly as the plan's GREEN snippet specifies. End
state matches the plan's prescribed function verbatim.

No other deviations. DE/CS i18n files retained their existing `\uXXXX` escape convention
(the Edit matched the on-disk escape sequences); EN/HE retained literal UTF-8.

## Self-Check: PASSED

- `assets/settings.js` — modified (commits 6f34a62, 5a9ac82, 3c14b06)
- `tests/24-05-modified-seed.test.js` — modified (commit 6f34a62)
- `assets/i18n-{en,he,de,cs}.js` — modified (commit 5a9ac82)
- `settings.html`, `assets/app.css` — modified (commit a8299e4)
- Commits `6f34a62`, `5a9ac82`, `a8299e4`, `3c14b06` all present in `git log`.
- All five verification tests exit 0; RED gate captured before Task 1 change.
