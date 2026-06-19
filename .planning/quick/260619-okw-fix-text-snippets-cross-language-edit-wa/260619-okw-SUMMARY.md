---
phase: quick-260619-okw
plan: 01
subsystem: text-snippets
status: complete
tags: [snippets, i18n, validation, unicode, ux, filter, rtl]
requires: []
provides:
  - "isValidTrigger + getCrossLangWarning helpers on window.__SnippetEditorHelpers"
  - "Unicode trigger acceptance in settings.js TRIGGER_REGEX + db.js validateSnippetShape"
  - "Cross-language edit warning + emphasised Edit-translations toggle"
  - "All/Mine/Defaults source filter in filterSnippetList + conditional category row"
affects:
  - assets/settings.js
  - assets/db.js
  - assets/snippets.js
  - settings.html
  - assets/app.css
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
tech-stack:
  added: []
  patterns:
    - "Unicode-aware validation regex /^[\\p{L}\\p{N}-]{2,32}$/u aligned with detection engine"
    - "Pure helper + vm-sandbox falsifiable test (RED→GREEN) per behavior-verification rule"
    - "textContent-only DOM writes for i18n-sourced strings (XSS-safe)"
key-files:
  created:
    - tests/quick-260619-okw-trigger-unicode.test.js
    - tests/quick-260619-okw-cross-lang-warning.test.js
  modified:
    - assets/settings.js
    - assets/db.js
    - assets/snippets.js
    - settings.html
    - assets/app.css
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
    - tests/24-04-shape-validator.test.js
    - tests/24-05-list-filter.test.js
decisions:
  - "Used existing --color-warning-bg/--color-warning-text tokens for the warning band (--color-warning-surface does not exist); both have light+dark values"
  - "getCrossLangWarning returns the computed otherLangs even when show=false; the editor only reads otherLangs when show is true (test assertion adjusted to match this canonical contract)"
metrics:
  duration: 7min
  tasks: 3
  files: 14
  completed: 2026-06-19
---

# Quick Task 260619-okw: Text Snippets — Unicode keywords, cross-language edit warning, source filter — Summary

Three atomic snippet-feature changes — Unicode-aware trigger validation (Hebrew/German/Czech),
a non-blocking cross-language edit warning with an emphasised "Edit translations" button, and an
All/Mine/Defaults source filter with a conditional category row — each backed by a falsifiable
pure-function test that failed before and passes after.

## What Was Built

- **Task 1 — Unicode triggers:** Widened `TRIGGER_REGEX` (settings.js) and `validateSnippetShape`
  (db.js) to `/^[\p{L}\p{N}-]{2,32}$/u`, aligned with the detection engine. Added an
  `isValidTrigger` pure helper, wired it into `handleSave`, and exported it on
  `window.__SnippetEditorHelpers`. Refreshed stale ASCII-only comments in db.js + snippets.js.
- **Task 2 — Cross-language warning:** Added `getCrossLangWarning(snippet, currentLang)` pure
  helper. `openEditor` shows a non-blocking warning (edit mode only) naming the language(s) with
  text when the current-language expansion is empty, and adds an `is-attention` ring to the
  toggle (cleared when the user reveals the translations block). Restyled the toggle as a
  content-width, filled (secondary) button with a rotating chevron (RTL-aware).
- **Task 3 — Source filter:** `filterSnippetList` accepts `opts.origin` (`all`/`user`/`seed`),
  AND-combined with search + tags. Added a segmented All/Mine/Defaults control (default All) and a
  conditional category (tag) row that is hidden when no categories exist.

## Tasks & Test Gates

### Task 1 — Allow Unicode (Hebrew/German/Czech) snippet triggers — commit `92a07ad`

**RED (pre-change, against unchanged source):**
```
=== TEST 1: trigger-unicode ===
FAIL: window.__SnippetEditorHelpers.isValidTrigger is not exposed.
EXIT:1

=== TEST 2: 24-04-shape-validator ===
  FAIL  C. Trigger validation: spaces/length-1/length-33 throw; uppercase + Unicode pass
        validateSnippetShape: trigger must match /^[a-z0-9-]{2,32}$/ (got "Betrayal")
Plan 04 shape-validator tests — 8 passed, 1 failed
EXIT:1
```

**GREEN (post-change):**
```
Quick 260619-okw isValidTrigger tests — 11 passed, 0 failed   (EXIT 0)
Plan 04 shape-validator tests — 9 passed, 0 failed            (EXIT 0)
```
Regressions (unchanged, still pass): 24-04-trigger-regex (11/11), 24-05-import-validator (7/7),
24-05-trigger-dedupe (7/7).

### Task 2 — Cross-language edit warning + emphasised toggle — commit `31de6b3`

**RED (pre-change):**
```
=== cross-lang-warning ===
FAIL: window.__SnippetEditorHelpers.getCrossLangWarning is not exposed.
EXIT:1
```

**GREEN (post-change):**
```
  PASS  A. current "he" empty, en has text → show:true, otherLangs:["en"]
  PASS  B. current "he" has text → show:false (warning suppressed even though en has text)
  PASS  C. all expansions empty, current "he" → show:false (no other content)
  PASS  D. null snippet → show:false
  PASS  E. otherLangs follows LOCALES order (he,en,cs,de) and excludes currentLang
  PASS  F. whitespace-only current expansion counts as empty
Quick 260619-okw getCrossLangWarning tests — 6 passed, 0 failed   (EXIT 0)
```
settings.js loads cleanly in the vm sandbox after DOM wiring; all four i18n files pass
`node --check`.

### Task 3 — All/Mine/Defaults source filter + conditional category row — commit `acbc5a2`

**RED (pre-change — origin ignored, all rows returned):**
```
  FAIL  J. origin "user" → only user-origin snippets        (expected 2, got 4)
  FAIL  K. origin "seed" → only seed-origin snippets         (expected 2, got 4)
  PASS  L. origin "all" → both origins
  PASS  M. origin omitted → defaults to "all"
  FAIL  N. origin "user" AND searchText → AND-combine        (expected 1, got 2)
  FAIL  O. origin "user" AND activeTags → AND-combine        (expected 1, got 2)
Plan 05 filterSnippetList tests — 11 passed, 4 failed
EXIT:1
```

**GREEN (post-change):**
```
Plan 05 filterSnippetList tests — 15 passed, 0 failed   (EXIT 0)
  (incl. J/K origin gate, L/M all-or-omitted, N/O origin AND search/tag)
```

### Full suite (final run)
```
PASS  quick-260619-okw-trigger-unicode
PASS  quick-260619-okw-cross-lang-warning
PASS  24-04-shape-validator
PASS  24-04-trigger-regex
PASS  24-05-import-validator
PASS  24-05-trigger-dedupe
PASS  24-05-list-filter
PASS  24-05-modified-seed
```

## Needs Ben's Review (he/de/cs i18n drafts)

All EN strings are authoritative; the following he/de/cs strings were added/modified as drafts and
should be verified (cs especially). Ben is trilingual he/de/en.

**`snippets.editor.trigger.error.format` (modified):**
- he: `הטריגר חייב להכיל 2–32 אותיות, ספרות או מקפים.`
- de: `Der Auslöser muss aus 2–32 Buchstaben, Ziffern oder Bindestrichen bestehen.`
- cs: `Spouštěč musí mít 2–32 písmen, číslic nebo pomlček.`

**`snippets.editor.langWarning` (new):**
- he: `לקטע הזה אין טקסט בשפה הנוכחית. יש לו טקסט ב: {langs}. לחצו על הכפתור „עריכת תרגומים” שלמטה כדי לראות או לערוך אותו.`
- de: `Dieser Baustein hat keinen Text in der aktuellen Sprache. Vorhanden in: {langs}. Klicke unten auf „Übersetzungen bearbeiten“, um ihn anzuzeigen oder zu bearbeiten.`
- cs: `Tento úryvek nemá text v aktuálním jazyce. Má text v: {langs}. Kliknutím na tlačítko „Upravit překlady“ níže jej zobrazíte nebo upravíte.`

**`snippets.lang.name.{en,he,de,cs}` (new — names in the file's own language):**
- he: en=`אנגלית`, he=`עברית`, de=`גרמנית`, cs=`צ׳כית`
- de: en=`Englisch`, he=`Hebräisch`, de=`Deutsch`, cs=`Tschechisch`
- cs: en=`angličtina`, he=`hebrejština`, de=`němčina`, cs=`čeština`

**`snippets.filter.origin.{all,mine,defaults,label}` (new):**
- he: all=`הכול`, mine=`הקטעים שלי`, defaults=`ברירת מחדל`, label=`סינון קטעים לפי מקור`
- de: all=`Alle`, mine=`Meine`, defaults=`Standard`, label=`Snippets nach Quelle filtern`
- cs: all=`Vše`, mine=`Moje`, defaults=`Výchozí`, label=`Filtrovat úryvky podle zdroje`

## Deviations from Plan

**1. [Adaptation] Warning band uses existing tokens instead of `--color-warning-surface`**
- **Found during:** Task 2 (CSS).
- **Issue:** The plan suggested `--color-warning-surface`/`--color-text` but flagged "check before
  inventing." Grep confirmed `--color-warning-surface` does NOT exist in tokens.css; however
  `--color-warning-bg` + `--color-warning-text` DO (and have both light AND dark-mode values).
- **Resolution:** Used `var(--color-warning-bg, #fff3cd)` for background and
  `var(--color-warning-text, #856404)` for text — the closest existing warning tokens, per the
  plan's own fallback instruction. This also gives correct dark-mode behavior for free.
- **Files:** assets/app.css. **Commit:** `31de6b3`.

**2. [Adaptation] Adjusted one cross-lang-warning test assertion to the canonical helper contract**
- **Found during:** Task 2 (test).
- **Issue:** My initial assertion B asserted `otherLangs:[]` when `show:false`. The plan's
  canonical helper (and the plan's own assertion B, which only specifies `{show:false}`) returns
  the computed `others` array unconditionally — the editor only reads `otherLangs` when `show` is
  true. My over-specified assertion failed against the correct implementation.
- **Resolution:** Relaxed assertion B to check `show === false` only (matching the plan's spec for
  B), keeping full-shape assertions for the show=true cases (A/E/F) and the genuinely-empty case
  (C, where `others` IS `[]`). The RED gate still held (the whole file failed pre-change because the
  helper was undefined).
- **Files:** tests/quick-260619-okw-cross-lang-warning.test.js. **Commit:** `31de6b3`.

**3. [Expected] Pre-commit hook bumped sw.js CACHE_NAME on each commit**
- Each of the three commits triggered the project's pre-commit hook, which auto-bumped
  `CACHE_NAME` in sw.js (v198→v199→v200→v201) and re-staged sw.js. This is documented expected
  behavior (MEMORY `reference-pre-commit-sw-bump`) — not a deviation in intent, noted for accuracy.
  No PRECACHE_URLS edits were involved, so no manual follow-up chore commit is needed.

No architectural changes (Rule 4) were required. No auth gates encountered.

## Self-Check: PASSED

- Commits `92a07ad`, `31de6b3`, `acbc5a2` all present in `git log`.
- Created test files both exist on disk.
- No docs/STATE/ROADMAP files were committed in the three task commits (verified via
  `git diff --name-only 182b632 HEAD`).
- No unintended file deletions across the three commits.
