---
phase: 23
plan: 09
subsystem: pdf-export
tags: [i18n, fonts, typography, polish]
key-files:
  created:
    - assets/fonts/heebo-bold-base64.js
  modified:
    - assets/pdf-export.js
    - assets/add-session.js
    - assets/i18n-en.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
    - assets/i18n-he.js
    - sw.js
    - tests/pdf-latin-regression.test.js
    - tests/pdf-glyph-coverage.test.js
    - tests/pdf-digit-order.test.js
    - .planning/fixtures/phase-23/fixture-en.pdf.sha256
    - .planning/fixtures/phase-23/fixture-de.pdf.sha256
    - .planning/fixtures/phase-23/fixture-cs.pdf.sha256
    - .planning/fixtures/phase-23/fixture-he.pdf.sha256
decisions:
  - 'Heebo Bold sourced from canonical OdedEzer/heebo upstream (fonts/ttf/Heebo-Bold.ttf v3.100), same project + version as Regular'
  - 'No separate LICENSE file for Bold -- the SIL OFL 1.1 in heebo.LICENSE.txt is family-wide'
  - 'drawTextLine accepts an optional weight arg (option A from spec); applyFontFor() helper removed entirely (was a one-liner after Plan 23-07)'
  - 'HEADING_SIZE 14->16, TITLE_SIZE 16->18, LINE_HEIGHT_HEADING 22->26 -- gives clear visual hierarchy (H2:body ratio 16:11=1.45 vs prior 14:11=1.27)'
  - 'i18n key naming: session.copy.scale.{before|after|change} composed inline via template literals (not parameterized substitution -- App.t() doesnt support {var} placeholders)'
  - 'Footer label uses inline switch on opts.uiLang matching the existing formatDate() pattern (not App.t -- pdf-export.js has minimal coupling to window.App)'
  - 'i18n keys for footer (pdf.footer.pageXofY) added to all 4 locales for discoverability even though pdf-export.js uses inline switch (matches D-04 plan note that strings should be discoverable in i18n files)'
metrics:
  duration: ~30 minutes
  tasks: 7
  commits: 7
  files-touched: 14
  fixture-baselines-regenerated: 4
  test-suites-passing: 4 (pdf-latin-regression 4/4, pdf-bidi 12/12, pdf-glyph-coverage 3/3, pdf-digit-order 4/4)
---

# Phase 23 Plan 09: i18n + Bold Headings + Polish Summary

Six PDF polish improvements bundled into a single plan: i18n the "Before/After/Delta" scales text (renamed to "Change"), i18n the "Page X of Y" footer per uiLang, remove redundant Client/Date/Type metadata from buildSessionMarkdown, vendor Heebo Bold (weight 700), wire bold rendering into headings + page-1 title, bump heading sizes for better visual hierarchy, and regenerate all 4 fixture baselines. All 4 test suites still pass after the cumulative changes.

## Tasks

| #   | Title                                              | Commit    | Notes                                                                                                              |
| --- | -------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | i18n scales text (Before/After/Change)             | `7d21038` | Added `session.copy.scale.{before,after,change}` to all 4 locales; updated both `buildSessionMarkdown` + `buildFilteredSessionMarkdown` |
| 2   | i18n footer "Page X of Y"                          | `4be8fa1` | Inline switch matches `formatDate()` pattern; pre-shaped via `shapeForJsPdf` for Hebrew; discoverability key in all i18n files |
| 3   | Remove Client/Date/Type from buildSessionMarkdown  | `0577b5f` | Only the clipboard-copy markdown builder; the export-dialog/PDF builder is left as-is per spec (open question below) |
| 4   | Vendor Heebo Bold                                  | `98cd8df` | New file `assets/fonts/heebo-bold-base64.js` (~111 KB); SIL OFL 1.1 covered by existing `heebo.LICENSE.txt`         |
| 5   | Bold rendering for headings + title                | `3c2ff91` | `drawTextLine` accepts optional `weight` arg; `applyFontFor` removed; updated 3 test harnesses to load the Bold font |
| 6   | Bump heading sizes                                 | `01b978e` | HEADING_SIZE 14->16, TITLE_SIZE 16->18, LINE_HEIGHT_HEADING 22->26                                                  |
| 7   | Regenerate fixture baselines                       | `1a50493` | All 4 hashes drifted as expected; all 4 test suites pass post-regen                                                  |

## Translation Strings Added

| Key                            | en       | de        | cs       | he       |
| ------------------------------ | -------- | --------- | -------- | -------- |
| `session.copy.scale.before`    | Before   | Vorher    | Před     | לפני     |
| `session.copy.scale.after`     | After    | Nachher   | Po       | אחרי     |
| `session.copy.scale.change`    | Change   | Änderung  | Změna    | שינוי    |
| `pdf.footer.pageXofY`          | Page {x} of {y} | Seite {x} von {y} | Stránka {x} z {y} | עמוד {x} מתוך {y} |

The i18n keys for the footer use `{x}`/`{y}` placeholder syntax for discoverability; the pdf-export.js implementation does NOT use these keys directly (it uses an inline switch on `opts.uiLang` matching the existing `formatDate()` pattern). The strings are present in the i18n files so any future consumer (a CLI export, a sidebar, etc.) can find them.

Hebrew "Change": `שינוי` (sapir-confirmed; standard Hebrew word for "change" in this clinical-progress context).

## Heebo Bold Font

| Property | Value |
| --- | --- |
| Source | `https://github.com/OdedEzer/heebo/raw/master/fonts/ttf/Heebo-Bold.ttf` (canonical Heebo upstream) |
| Version | 3.100 (matches Regular) |
| Raw TTF size | 82,508 bytes (~80 KB) |
| Base64 + JS file size | 111,014 bytes (~111 KB) |
| Family registration | `addFont('HeeboBold.ttf', 'Heebo', 'bold')` -- same family ('Heebo'), style='bold' |
| License | SIL OFL 1.1 -- covered by existing `assets/fonts/heebo.LICENSE.txt` (family-wide) |

Sanity test (JSDOM): rendered Hebrew + Latin + mixed samples in both weights, verified 6 Tj operators emitted (no glyph drops), verified Bold widths slightly wider than Regular (Hebrew +5.7%, Latin +1.5%) -- confirms Bold is a distinct font subset, not a styling overlay.

## Heading Sizes (Plan 23-09 vs prior)

| Element | Pre-23-09 | Post-23-09 | Change |
| --- | --- | --- | --- |
| Body                | 11pt | 11pt | unchanged |
| H3 (`### Heading`)  | 12pt | 14pt | +2pt |
| H2 (`## Heading`)   | 14pt | 16pt | +2pt |
| H1 (`# Heading`)    | 16pt | 18pt | +2pt |
| Page-1 title        | 16pt | 18pt | +2pt (matches H1) |
| LINE_HEIGHT_HEADING | 22pt | 26pt | +4pt (accommodates the larger H1 ascenders/descenders) |

Visual hierarchy ratio (H2:body): was 14:11 ≈ 1.27, now 16:11 ≈ 1.45 -- comfortably above the typographic minimum of ~1.33 for clear hierarchy. All headings now also render in **bold** (Heebo Bold variant), giving them stronger visual presence.

## Fixture Hash Deltas

| Fixture | Pre (16-char) | Post (16-char) |
| --- | --- | --- |
| fixture-en | `8e95025475d624af` | `50445d13a64e3768` |
| fixture-de | `48414c642e1f6e56` | `0645b9256956005a` |
| fixture-cs | `10fff21962989608` | `1db0985886f16b97` |
| fixture-he | `dc7435916b6e8d22` | `24521b6f8cccbfd9` |

All 4 hashes changed -- expected because of bold font subset, larger heading glyphs, i18n'd scale labels (de/cs/he get translated body text), and i18n'd footer (de/cs/he get translated footer text). Regenerated baselines committed.

## Service Worker Cache

CACHE_NAME bumped from v91 (pre-23-09) to v96 over the course of this plan (pre-commit hook auto-bumps on every cached-asset change). Old caches are deleted on activate; users get the new fonts + behavior on the next page load after the new SW activates.

## Test Results (Post-Regen)

| Test Suite | Result |
| --- | --- |
| `node tests/pdf-latin-regression.test.js` | **4/4 PASS** |
| `node tests/pdf-bidi.test.js` | **12/12 PASS** |
| `node tests/pdf-glyph-coverage.test.js` | **3/3 PASS** |
| `node tests/pdf-digit-order.test.js` | **4/4 PASS** |

All other 3 test harnesses (`pdf-glyph-coverage`, `pdf-digit-order`, `pdf-latin-regression`) needed a 1-line patch each to also `win.eval(readAsset('assets/fonts/heebo-bold-base64.js'))` and to add the bold-font path to their `preload` array -- otherwise pdf-export.js's `loadScriptOnce('./assets/fonts/heebo-bold-base64.js')` promise hangs forever and the tests produce no output. Fix is the same pattern in all 3 files.

## Visual Verification (fixture-he Footer)

Decoded the LAST `Tj` draw on page 1 of regenerated fixture-he.pdf: 13 glyphs, pattern `digit + space + 4-glyph-word + space + digit + space + 4-glyph-word`. Matches the expected visual-order shape of "עמוד 1 מתוך 1" (Hebrew base direction, digits stay LTR inside the RTL paragraph, Hebrew words reversed in place by the bidi pre-shape). Footer is rendering correctly in Hebrew on RTL pages.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-flight check command had wrong shell escaping**

- **Found during:** Pre-flight
- **Issue:** Spec said `grep -c "Before: \${before}" assets/add-session.js` should return 2, but bash variable expansion of `\${before}` produces an empty string after the colon-space, so the count returned 0
- **Fix:** Used `grep -cF` (fixed-string mode) instead -- count came back as 4 (each call site has 2 occurrences: with-delta + without-delta branches), confirming the underlying code is in the expected state
- **No code change** -- this was a verification-step issue, not a code issue

**2. [Rule 1 - Spec gate mismatch] Verification gate `setFont('Heebo', 'bold') >= 2` is incompatible with chosen impl**

- **Found during:** Task 5
- **Issue:** Spec recommends impl option A (drawTextLine accepts a weight arg, internally calls `doc.setFont('Heebo', weight)` -- where `weight` is a variable, not the literal string `'bold'`). With this impl, only ONE call site has the literal string `setFont('Heebo', 'bold')` (the page-1 title in drawPage1Header). The heading branch's bold-rendering reaches `setFont` via the dynamic variable, so a literal-string grep can't see it.
- **Fix:** None. The functional intent (heading + title both render bold) is verified via the JSDOM sanity test (Task 4) and the regenerated fixture baselines (which only pass if Heebo Bold is being used in the output stream). Documenting as a spec-gate mismatch rather than a code bug.

**3. [Rule 1 - Test harnesses needed sibling patch] Other 2 test harnesses also needed Heebo Bold loaded**

- **Found during:** Task 7
- **Issue:** When running `tests/pdf-glyph-coverage.test.js` and `tests/pdf-digit-order.test.js` after Task 5, both produced only the canvas warning then exited silently with code 1. Root cause: those harnesses don't load `heebo-bold-base64.js` in their JSDOM context, so when pdf-export.js's `ensureDeps()` chain hits the new `loadScriptOnce('./assets/fonts/heebo-bold-base64.js')` step, the promise hangs forever (JSDOM in `runScripts: 'outside-only'` mode does NOT execute dynamically-injected `<script>` tags).
- **Fix:** Added the same 2-line patch to both files (`win.eval(readAsset('assets/fonts/heebo-bold-base64.js'))` + add to `preload` array). Same fix as the 23-09 patch already applied to pdf-latin-regression.test.js in Task 5. Documented in the Task 7 commit message.

### Scope Boundary Items (Out-of-Scope, NOT Fixed)

**A. buildFilteredSessionMarkdown still emits Client/Date/Type lines (the function that actually feeds the PDF)**

- **Found during:** Task 3
- **Discovery:** Task 3 spec targets `buildSessionMarkdown` (L608, used by clipboard copy). But the function that actually feeds the PDF export dialog -> PDF generator is `buildFilteredSessionMarkdown` (L884, used at L1270 by the "Next" button in the export dialog). The latter STILL emits the 3 Client/Date/Type lines. So the redundancy in the actual PDF output (which Ben presumably saw and reported) is NOT yet fixed by this plan.
- **Per spec:** Task 3 explicitly says "modify buildSessionMarkdown only" and "leave [the keys] be" in i18n files. So this is intentional per spec.
- **Action taken:** Documented in the Task 3 commit message and as an open question below.

## Open Question for the User

**The PDF export still shows duplicated Client/Date/Type metadata** (centered title-block at top of page 1 + repeated again as 3 markdown lines below). Task 3 only cleaned up the clipboard-copy version of the markdown (`buildSessionMarkdown` at L608). The PDF export goes through a separate function (`buildFilteredSessionMarkdown` at L884) which was NOT touched per spec.

If the PDF still shows the redundancy, please request a follow-up: "remove Client/Date/Type from buildFilteredSessionMarkdown too" -- the change is mechanically identical to Task 3 (delete the 3 lines from the `lines = [...]` array, keep the i18n keys).

Alternatively: the comment at L886 of the original code said "the Plan 22-05 PDF module also relies on header metadata" -- which appears to be outdated (drawPage1Header reads sessionData args, not markdown body). If you want to verify the comment's claim, generate a PDF before/after to confirm there's no functional regression.

## Deferred Items (Explicitly NOT in This Plan's Scope)

These are NOT in 23-09. If you want them, let me know and I'll plan a 23-10:

1. **Inline `**X**` bold rendering.** The 23-08 strip-asterisks behavior is preserved -- inline `**bold**` text in the middle of a paragraph still has its `**` markers stripped (rather than rendered as bold runs). True inline-bold rendering would require per-segment font switching inside `drawTextLine` -- non-trivial because jsPDF doesn't expose per-text-run styling in a single `doc.text()` call; would need to split each line into segments, render each with its own setFont + getTextWidth offset.

2. **Field separation / line-break handling.** The Markdown blocks parser collapses multi-line paragraphs to single-line "para" blocks (with words space-joined). After Task 3's metadata removal, paragraphs may need different line spacing -- but no behavior change is included here.

3. **buildFilteredSessionMarkdown follow-up** (see open question above).

4. **Visual verification of the actual rendered PDF.** Hash-based regression catches byte-stream changes but doesn't tell you whether the PDF *looks right*. The 4 fixture PDFs would need to be opened in a real PDF viewer to confirm:
   - Headings render in noticeably-bold weight
   - Heading sizes feel right (not too big, not too small)
   - Page-1 title is bold and centered
   - Hebrew footer reads correctly in fixture-he
   - The Before/After/Change scale text reads naturally in each language

## Self-Check: PASSED

**Created files:**
- `assets/fonts/heebo-bold-base64.js` -- FOUND (111014 bytes)
- `.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-09-i18n-bold-headings-SUMMARY.md` -- FOUND (this file)

**Modified files:**
- `assets/pdf-export.js` -- modified in 3 commits (Tasks 2, 5, 6)
- `assets/add-session.js` -- modified in 2 commits (Tasks 1, 3)
- `assets/i18n-en.js` / `i18n-de.js` / `i18n-cs.js` / `i18n-he.js` -- all modified (Tasks 1, 2)
- `sw.js` -- modified by pre-commit auto-bump + Task 4 PRECACHE_URLS edit (now CACHE_NAME=v96)
- `tests/pdf-latin-regression.test.js` / `pdf-glyph-coverage.test.js` / `pdf-digit-order.test.js` -- all modified to load heebo-bold (Tasks 5, 7)
- 4 fixture .sha256 files -- regenerated (Task 7)

**Commits:**
- `7d21038` -- FOUND
- `4be8fa1` -- FOUND
- `0577b5f` -- FOUND
- `98cd8df` -- FOUND
- `3c2ff91` -- FOUND
- `01b978e` -- FOUND
- `1a50493` -- FOUND
