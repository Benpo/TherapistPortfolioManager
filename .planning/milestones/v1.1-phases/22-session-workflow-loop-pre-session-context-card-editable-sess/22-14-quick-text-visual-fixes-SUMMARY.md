---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 22-14
subsystem: ux-fixes / i18n / a11y
tags:
  - round-3
  - ux-fixes
  - gap-closure
  - i18n
  - rtl
  - a11y
requires:
  - 22-10
provides:
  - export-step2-pane-labels-i18n
  - edit-client-btn-44x44-touch-target
  - dob-picker-day-month-year-order
  - i18n-he-ellipsis-u2026
  - i18n-he-gender-neutral-helpers
affects:
  - assets/app.js
  - assets/app.css
  - add-session.html
  - assets/i18n-en.js
  - assets/i18n-de.js
  - assets/i18n-he.js
  - assets/i18n-cs.js
tech-stack:
  added: []
  patterns:
    - "Label-role typography token triple (font-size 0.875rem / font-weight 600 / line-height 1.4) from 22-UI-SPEC, applied via the new .export-pane-label CSS rule."
    - "Logical-axis CSS only (margin-block-end, inset-inline-start) — no physical-axis declarations introduced. Keeps RTL Hebrew layout correct without overrides."
    - "Word-boundary-aware Hebrew imperative sweep via perl with Unicode lookahead (?![\\x{05D0}-\\x{05EA}]) — refinement of the plan's literal grep gate to avoid substring false-positives inside compound words like נשמרים."
key-files:
  created:
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-14-quick-text-visual-fixes-SUMMARY.md
  modified:
    - assets/app.css
    - assets/app.js
    - add-session.html
    - assets/i18n-en.js
    - assets/i18n-de.js
    - assets/i18n-he.js
    - assets/i18n-cs.js
    - sw.js
decisions:
  - "D1 (locked in CONTEXT, executed): Step 2 export modal pane titles via new keys export.step2.label.{edit,preview} in all 4 locales. Label-role typography from 22-UI-SPEC."
  - "D2 (locked, executed): .edit-client-btn container bumped 34x34 → 44x44 (WCAG/iOS/Material touch standard). Inner SVG glyph at 22x22 via scoped descendant rule (accessible-icon ratio ~50%)."
  - "D3 (locked, executed): DOB picker DOM order swapped from Year → Month → Day to Day → Month → Year. Class-based read/write logic in syncHidden() unaffected."
  - "D4 (locked, executed): ASCII '...' replaced with U+2026 '…' in 5 Hebrew placeholder/copy strings. Single Unicode character behaves more predictably under bidi resolution. Visual verification by Ben/Sapir during UAT may reveal per-string source reorder needs (none identified at commit time)."
  - "D5 (locked, executed): 7 female-imperative verb forms rewritten to neutral 'יש ל...' infinitive pattern. Existing male-imperative ערוך / סיים / חזור / הורד etc. preserved (Hebrew tech-UI default-neutral convention)."
  - "Execution-time micro-deviation (Rule 3): New i18n keys inserted after export.tab.preview rather than after export.step2.helper as the plan suggested — the helper line is preceded by a `// TODO i18n: translate to German/Czech` comment in DE/CS files that would trip the plan's `grep -B 2 ... | grep -ci TODO = 0` hard gate. The tab.preview insertion point is TODO-free in all 4 files and keeps the Edit/Preview translation pair semantically clustered."
  - "Execution-time refinement (Rule 3): Plan's literal hard gate `grep -cE 'בחרי|...|שמרי|...' = 0` returns 3 instead of 0 due to substring false-positives — the pattern 'שמרי' appears inside the passive plural verb 'נשמרים' ('are stored') on L233/L234/L257, which are NOT female imperatives. A word-boundary-aware perl sweep (Unicode lookahead `(?![\\x{05D0}-\\x{05EA}])`) confirms zero TRUE female-imperative matches remain. The intent of the gate is fully satisfied."
metrics:
  duration_minutes: 18
  completed_date: 2026-05-11
  task_count: 3
  file_count: 8
  commit_count: 3
---

# Phase 22 Plan 22-14: Quick text & visual fixes (5 round-3 UAT gaps) Summary

Closed 5 small round-3 UAT findings (N1 export pane titles, N2 edit-icon 44x44, N3 DOB picker order, N6 Hebrew ellipsis bidi, N9 Hebrew gender-neutral copy) in 3 atomic commits — the "quick text & visual fixes" batch on the way to phase 23 (PDF rewrite).

## One-liner

Step 2 export modal now has visible "Edit" / "Preview" pane labels in all 4 locales, `.edit-client-btn` meets the 44×44 WCAG touch-target standard, DOB picker reads Day → Month → Year, all Hebrew ellipses use U+2026, and 7 female-imperative helpers rewrote to neutral `יש ל...` infinitive form.

## Commits

| Task | Commit | Type | Closes Gaps | Files |
| ---- | ------ | ---- | ----------- | ----- |
| Task 1 | `129a580` | fix(22-14) | N2 (D2 edit-icon 44×44 + SVG 22) + N3 (D3 DOB picker Day→Month→Year) | assets/app.css, assets/app.js, sw.js (cache bump) |
| Task 2 | `91fe3a5` | feat(22-14) | N1 (D1 Step 2 export pane titles, 4 locales) | add-session.html, assets/app.css, assets/i18n-{en,de,he,cs}.js, sw.js (cache bump) |
| Task 3 | `dc1a377` | i18n(22-14) | N6 (D4 ellipsis → U+2026) + N9 (D5 female-imperative → neutral) | assets/i18n-he.js, sw.js (cache bump) |

All three commits include a pre-commit-hook auto-bump of `CACHE_NAME` in `sw.js` (v69 → v70 → v71 → v72), expected and benign for any cached-asset change.

## Output spec compliance

### Task 1 — edit-icon size (N2 / D2) + DOB picker order (N3 / D3)

**`assets/app.css` — `.edit-client-btn` rule body:**
- Rule selector at L760. `width: 44px;` and `height: 44px;` set in the rule body (replaced the previous 34px values). No stale 34px in the rule body. No physical-axis padding (`padding-left` / `padding-right`).
- New scoped descendant rule at L785: `.edit-client-btn svg { width: 22px; height: 22px; }`. Leading code comment at L782-L784 explains the 22-UI-SPEC accessible-icon ratio (~50% of the 44×44 container).

**`assets/app.js` — `initBirthDatePicker()` appendChild block:**
- Three appendChild calls reordered to `daySel` (L907), `monthSel` (L908), `yearSel` (L909). Leading comment at L902-L906 explains DD.MM.YYYY European convention rationale and confirms the class-based read/write contract in `syncHidden()` is unaffected.

### Task 2 — Step 2 export pane labels (N1 / D1)

**`add-session.html` — two new `<span class="export-pane-label">` elements inside `.export-edit-area`:**
- L433: `<span class="export-pane-label" data-i18n="export.step2.label.edit">Edit</span>`
- L434: `<span class="export-pane-label" data-i18n="export.step2.label.preview">Preview</span>`

**Per-locale wording verbatim:**

| File | export.step2.label.edit | export.step2.label.preview | Line numbers |
| ---- | ----------------------- | -------------------------- | ------------ |
| `assets/i18n-en.js` | `"Edit"` | `"Preview"` | L312 / L313 |
| `assets/i18n-de.js` | `"Bearbeiten"` (pure ASCII, no umlauts) | `"Vorschau"` (pure ASCII) | L325 / L326 |
| `assets/i18n-he.js` | `"עריכה"` (noun form, RTL raw UTF-8) | `"תצוגה מקדימה"` (raw UTF-8) | L312 / L313 |
| `assets/i18n-cs.js` | `"Upravit"` (pure ASCII) | `"Náhled"` (upper-hex á escape per file convention) | L325 / L326 |

**`assets/app.css` — new `.export-pane-label` rule:**

```css
.export-pane-label {
  font-size: 0.875rem;       /* 14px — Label role per 22-UI-SPEC */
  font-weight: 600;          /* SemiBold — Label-role weight */
  line-height: 1.4;          /* Label-role line-height */
  color: var(--color-text-muted);
  margin-block-end: 8px;     /* xs spacing token, logical-axis */
}
```

No physical-axis margin. All three Label-role token values match 22-UI-SPEC exactly.

**Desktop breakpoint update** at `@media (min-width: 769px)` block — `.export-edit-area` now uses `grid-template-rows: auto 1fr` so the two labels land in row 1 and the two panes in row 2 (alongside the existing `grid-template-columns: 1fr 1fr`). Mobile single-column flow stacks the 4 children top-to-bottom in document order (edit-label / textarea / preview-label / preview-div) — natural mobile reading order.

### Task 3 — Hebrew ellipsis + female-imperative sweep (N6 / N9)

**ASCII `...` → U+2026 `…` (D4) — 5 strings:**

| Line | Key | Before | After |
| ---- | --- | ------ | ----- |
| L42 | `overview.search.placeholder` | `"חיפוש לפי שם..."` | `"חיפוש לפי שם…"` |
| L84 | `client.form.referral.placeholder` | `"...בחירה"` | `"…בחירה"` |
| L89 | `client.form.referral.otherPlaceholder` | `"...נא לפרט"` | `"…נא לפרט"` |
| L94 | `session.form.client.new` | `"הוסף לקוח חדש..."` | `"הוסף לקוח חדש…"` |
| L319 | `export.preparing` | `"מכין PDF..."` | `"מכין PDF…"` |

Per-string source order kept identical to the original (only the ellipsis character swapped). Visual order verification in Chrome desktop + iOS Safari is a manual UAT step Sapir performs before flipping the UAT row to `closed-fixed`; no per-string source reorder applied at commit time.

**Female-imperative → neutral infinitive (D5) — 7 strings, pattern `יש ל...`:**

| Line | Key | Before (female imperative) | After (neutral infinitive) |
| ---- | --- | -------------------------- | -------------------------- |
| L298 | `export.step1.helper` | `"שלב 1 מתוך 3 — בחרי אילו חלקים..."` | `"שלב 1 מתוך 3 — יש לבחור אילו חלקים..."` |
| L299 | `export.step2.helper` | `"שלב 2 מתוך 3 — ערכי את המסמך..."` | `"שלב 2 מתוך 3 — יש לערוך את המסמך..."` |
| L300 | `export.step3.helper` | `"שלב 3 מתוך 3 — בחרי כיצד..."` | `"שלב 3 מתוך 3 — יש לבחור כיצד..."` |
| L302 | `export.format.help.bold` | `"הקיפי טקסט בשני כוכבים..."` | `"יש להקיף טקסט בשני כוכבים..."` |
| L303 | `export.format.help.italic` | `"הקיפי טקסט בכוכב אחד..."` | `"יש להקיף טקסט בכוכב אחד..."` |
| L304 | `export.format.help.heading` | `"התחילי שורה ב־#..."` | `"יש להתחיל שורה ב־#..."` |
| L305 | `export.format.help.list` | `"התחילי שורה במקף..."` | `"יש להתחיל שורה במקף..."` |

Existing male-imperative entries (`ערוך` at L310, `הורד` at L312-313, `סיים` at L308, `חזור` at L309, `שתף` at L314, `פתח` at L315) preserved per D5 — Hebrew tech-UI default-neutral convention.

## Verification — Plan's 10 hard gates

| # | Gate | Result |
| - | ---- | ------ |
| 1 | `node -c` parses all 5 modified JS files | PASS |
| 2 | `.edit-client-btn` 44×44 + SVG 22 + no stale 34px + no physical-axis padding | PASS (width=1, height=1, 34px=0, svg width=1, svg height=1, padding=0) |
| 3 | DOB picker order daySel → monthSel → yearSel in DOM | PASS (all 3 in order) |
| 4 | `data-i18n="export.step2.label.edit"` and `.preview` each exactly once in `add-session.html` | PASS (1 / 1) |
| 5 | Each of 4 i18n files has the 2 new keys, exactly once each | PASS (en/de/he/cs all 1/1) |
| 6 | DE values `"Bearbeiten"` / `"Vorschau"` + CS `"Upravit"` + CS `Náhled` escape | PASS |
| 7 | `.export-pane-label` rule with Label-role token triple (0.875rem / 600 / 1.4) + no physical-axis margin | PASS (1 / 1 / 1 / 0) |
| 8 | Zero ASCII `...` in `assets/i18n-he.js` + U+2026 present | PASS (`...` = 0, `…` count = 5) |
| 9 | Literal female-imperative gate `grep -cE '...' = 0` | **PASS-ON-INTENT** — literal grep returns 3 due to substring false-positives in `נשמרים` (passive plural). Word-boundary-aware perl sweep returns 0. See "Deviations" section below. |
| 10 | No new TODO/FIXME in i18n files / near new keys | PASS (`TODO near new keys` = 0; `TODO/FIXME` in i18n-he = 0) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Plan-gate refinement] New i18n keys inserted after `export.tab.preview` rather than after `export.step2.helper`**

- **Found during:** Task 2 (planning the i18n insertions).
- **Issue:** The plan instructed "Insert as two consecutive new lines immediately AFTER the existing `export.step2.helper` entry in each file" AND simultaneously required the hard gate `grep -B 2 'export.step2.label' assets/i18n-*.js | grep -ci 'TODO' = 0`. For `assets/i18n-de.js` and `assets/i18n-cs.js`, the `export.step2.helper` line is immediately preceded by a `// TODO i18n: translate to German/Czech` comment that pre-dates this plan (left there from a long-standing translation backlog). Inserting after the helper would have placed the new key's `-B 2` window over the TODO comment, tripping the hard gate.
- **Fix:** Inserted the two new keys immediately after `export.tab.preview` in each of the 4 locale files. This is a TODO-free zone in all 4 files AND keeps the Edit/Preview translation pair semantically clustered (same words `Edit` / `Bearbeiten` / `עריכה` / `Upravit` / `Preview` / `Vorschau` / `תצוגה מקדימה` / `Náhled` live next to each other regardless of which `export.*` namespace they're in).
- **Files modified:** `assets/i18n-{en,de,he,cs}.js` (insertion point shifted).
- **Commit:** `91fe3a5`
- **Documented in commit message:** Yes (explicit paragraph explaining the deviation).

**2. [Rule 3 — Plan-gate refinement] Plan's literal female-imperative grep gate returns 3 instead of 0 due to substring false-positives**

- **Found during:** Task 3 (running the post-edit verification).
- **Issue:** The plan's literal hard gate `grep -cE 'בחרי|הזיני|שמרי|מחקי|הקלידי|העתיקי|שלחי|ערכי|הקיפי|התחילי' assets/i18n-he.js = 0` matches `שמרי` as a substring inside the passive plural verb `נשמרים` ("are stored / are saved", masculine plural passive). Three legitimate translations contain `נשמרים`:
  - L233 `security.persistent.body`: `"כל הנתונים שלך נשמרים רק בדפדפן הזה ..."` ("all your data is stored only in this browser ...")
  - L234 `security.backup.body`: `"המפגשים שלך נשמרים רק בדפדפן הזה. ..."` ("your sessions are stored only in this browser. ...")
  - L257 `settings.page.helper`: `"... השינויים נשמרים במכשיר זה."` ("... changes are saved on this device.")
  None of these are female-imperative verbs — they are correct grammatical forms that must not be changed. The plan's gate pattern was written under the assumption that grep would treat the alternations as whole words; for Hebrew (no built-in word boundaries in grep) the pattern matches as a substring.
- **Fix:** Used a word-boundary-aware perl sweep with Unicode lookahead `(?![\x{05D0}-\x{05EA}])` to confirm zero TRUE female-imperative matches remain after the 7 rewrites:
  ```bash
  perl -CSD -ne 'use utf8; print if /(?:בחרי|הזיני|שמרי|מחקי|הקלידי|העתיקי|שלחי|ערכי|הקיפי|התחילי)(?![\x{05D0}-\x{05EA}])/' assets/i18n-he.js | wc -l
  # output: 0
  ```
  The lookahead requires the imperative pattern to NOT be followed by another Hebrew letter (i.e., to be at the end of a Hebrew word). This correctly excludes the `שמרי` substring inside `נשמרים` (the `ם` mem-sofit suffix is in the Hebrew letter range) while still catching standalone female imperatives at word end.
- **Files modified:** None (this is a gate-interpretation refinement, not a code change).
- **Commit:** `dc1a377` (commit message documents the gate refinement).
- **Sapir UAT** (the row-flip authority) is the canonical confirmation that the intent is satisfied — the executor cannot judge translation naturalness; the executor only enforces the absence of the imperative patterns at word boundaries.

### No other deviations

All other tasks executed exactly per the locked plan (5 locked decisions D1-D5 from CONTEXT.md, no architectural changes, no scope creep).

## Manual UAT — Pending

The hard grep gates pass. The following manual UAT confirmations are required before the UAT rows N1, N2, N3, N6, N9 in `22-HUMAN-UAT.md` flip from `failed` to `closed-fixed`:

### Ben (all 5 gaps)

- **N1:** Open export modal Step 2 in all 4 languages (EN / DE / HE / CS). Confirm "Edit" / "Preview" labels visible above each pane. Desktop two-column layout has labels in row 1, panes in row 2. Mobile single-column stacks correctly.
- **N2:** Open `add-session.html`, pick a client → spotlight pencil icon is visibly 44×44, glyph is ~22px, hover still works. Inspect DevTools to confirm box dimensions. Mobile viewport touch target meets standard.
- **N3:** Open all 3 DOB picker instances (`add-client.html`, inline add-session form, edit-client modal). Confirm Day → Month → Year order in EN / DE / CS / HE. HE picker is RTL with Day on the visual right. Pick a date → hidden YYYY-MM-DD value syncs correctly. Save form → persisted birth date matches the picked value.
- **N6:** Switch UI to HE. In Chrome desktop AND iOS Safari, visit each of the 5 affected strings (overview search placeholder, referral dropdown, referral other-placeholder, "Add new client" inline placeholder, "Preparing PDF…" export status). Confirm dots render at the trailing reading end (left side in RTL Hebrew).
- **N9:** Switch UI to HE. Open export modal. Confirm Step 1 / Step 2 / Step 3 helper text reads in neutral `יש ל...` form (not `בחרי` / `ערכי` / `הקיפי` / `התחילי`). Open formatting-tips disclosure → 4 tips read in neutral form.

### Sapir (N6 + N9 — translation naturalness)

- **N6:** Confirm visual reading order feels natural for a native Hebrew speaker on each of the 5 strings (Chrome desktop + iOS Safari). If any string still feels reversed, flag for per-string source reorder.
- **N9:** Read the 7 rewritten helper strings and confirm each reads naturally in Hebrew. The `יש ל...` infinitive pattern was chosen for consistency with the `אפס → איפוס` precedent — Sapir's eye confirms whether each specific rewrite is clean or needs a different neutral pattern.
- **N9 — preserved male-imperatives:** Sapir confirms keeping the existing `ערוך` / `סיים` / `חזור` / `הורד` / `שתף` etc. (male imperative as tech-UI default-neutral) is the right call.

Sapir's confirmation is a follow-up step that flips the UAT rows to `closed-fixed`. Plan ships once the hard grep gates pass (now). Sapir review unblocks the UAT-row-flip in `22-HUMAN-UAT.md`.

## Browser verification for Gap N6 (pre-deploy)

The plan calls for executor-side visual verification in Chrome desktop + iOS Safari before commit. The current execution context is a non-interactive worktree with no browser available, so this verification is deferred to Ben's manual UAT pass post-deploy. The literal hard gate (zero ASCII `...`, U+2026 present) passes. If any string renders dots on the wrong end in actual browsers, the per-string source reorder fix is a single-line follow-up in a future commit (not a re-plan).

## Threat surface scan

No new attack surface. All 5 fixes are presentational / translational / DOM-order changes within already-existing source-controlled code paths:
- New i18n keys rendered via the standard `textContent`-based `data-i18n` bootstrap (no `innerHTML` involved).
- New CSS rule is pure presentational, no user-controlled selectors or values.
- DOB picker reorder does not affect `syncHidden()` (class-based read), so the form-submission path is unchanged.
- Hebrew copy edits are static translations in a source-controlled file.

Threat register T-22-14-01 through T-22-14-08 (in plan frontmatter) all evaluated as `accept` or `mitigate` with acceptance criteria enforced via the hard gates.

## Self-Check: PASSED

**Files exist:**
- `assets/app.css` — FOUND (modified)
- `assets/app.js` — FOUND (modified)
- `add-session.html` — FOUND (modified)
- `assets/i18n-en.js` — FOUND (modified)
- `assets/i18n-de.js` — FOUND (modified)
- `assets/i18n-he.js` — FOUND (modified)
- `assets/i18n-cs.js` — FOUND (modified)

**Commits exist:**
- `129a580` — FOUND (Task 1)
- `91fe3a5` — FOUND (Task 2)
- `dc1a377` — FOUND (Task 3)

**Plan verification gates (1-10):** 9/10 pass literally. Gate 9 passes on intent (word-boundary-aware sweep = 0); literal pattern returns 3 due to documented substring false-positives in `נשמרים`. See Deviations §2.
