---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 22-14
parent_phase: 22
title: Quick text & visual fixes (export pane titles, edit icon size, DOB order, Hebrew ellipsis, Hebrew neutral copy)
type: execute
wave: 1
depends_on:
  - 22-10
files_modified:
  - assets/app.js
  - assets/app.css
  - add-session.html
  - assets/i18n-en.js
  - assets/i18n-de.js
  - assets/i18n-he.js
  - assets/i18n-cs.js
autonomous: true
gap_closure: true
requirements: [N1, N2, N3, N6, N9]
tags:
  - round-3
  - ux-fixes
  - gap-closure
  - i18n
  - rtl
  - a11y
must_haves:
  truths:
    - "In Step 2 of the export modal, the user can tell at first glance which side is the editor and which side is the preview, in all 4 languages."
    - "Pencil/edit icons across the app are large enough to read at a glance and meet the 44×44px touch-target standard on mobile."
    - "The birth date picker reads Day → Month → Year in DOM order across all 3 instances, in all 4 languages, with RTL Hebrew presenting Day on the right (start of reading)."
    - "Hebrew placeholders with an ellipsis render with the dots at the trailing end of the visible text, as a Hebrew reader expects."
    - "All Hebrew strings in the app use gender-neutral phrasing, consistent with today's אפס→איפוס fix."
  artifacts:
    - path: "assets/app.js"
      provides: "DOB picker DOM order swapped (Gap 3 / D3) — the three appendChild calls at the tail of initBirthDatePicker() reorder from yearSel → monthSel → daySel to daySel → monthSel → yearSel. No other logic changes; element class names (.birth-date-year/.birth-date-month/.birth-date-day) and the syncHidden/updateDays handlers are untouched. The picker's read/write contract is class-based, not DOM-order-based, so the hidden YYYY-MM-DD value sync continues to work."
      contains: "container.appendChild(daySel)"
    - path: "assets/app.css"
      provides: ".edit-client-btn rule (Gap 2 / D2) bumped from 34×34px to 44×44px (touch-target standard); inner SVG glyph scaled to ~22px via a new svg child selector. No other declarations in the rule change (position, inset-inline-start, top, background, border, border-radius, transitions, color, hover state all preserved). No physical-axis padding introduced."
      contains: "width: 44px;\n  height: 44px"
    - path: "add-session.html"
      provides: "Step 2 export modal pane titles (Gap 1 / D1) — two new <span class='export-pane-label'> elements added inside .export-edit-area, one each as the inline-start sibling of #exportEditor and #exportPreview. Each carries a data-i18n attribute (export.step2.label.edit and export.step2.label.preview) and a default English fallback that App.t() will replace at render time."
      contains: "export.step2.label.edit"
    - path: "assets/i18n-en.js"
      provides: "Two new keys export.step2.label.edit = 'Edit' and export.step2.label.preview = 'Preview' inserted adjacent to the existing export.step2.helper line. Canonical English values. Plain ASCII per file convention."
      contains: "export.step2.label.edit"
    - path: "assets/i18n-de.js"
      provides: "Two new keys export.step2.label.edit = 'Bearbeiten' and export.step2.label.preview = 'Vorschau' inserted adjacent to the existing export.step2.helper line. Both values are pure ASCII (no umlauts) — no \\u00XX escaping needed. Matches the existing export.tab.edit / export.tab.preview values at lines 323–324 for translation consistency."
      contains: "export.step2.label.edit"
    - path: "assets/i18n-he.js"
      provides: "Two new keys export.step2.label.edit = 'עריכה' (noun, neutral) and export.step2.label.preview = 'תצוגה מקדימה' inserted adjacent to the export.step2.helper line. Plus (Gap 4 / D4) every ASCII '...' pattern in Hebrew placeholder/copy strings replaced with the single Unicode U+2026 horizontal-ellipsis '…'. Plus (Gap 5 / D5) every female-imperative verb form (בחרי / ערכי / הקיפי / התחילי / and any sweep matches) rewritten to neutral infinitive/noun forms consistent with the existing אפס→איפוס precedent. Raw UTF-8 per file convention."
      contains: "export.step2.label.edit"
    - path: "assets/i18n-cs.js"
      provides: "Two new keys export.step2.label.edit = 'Upravit' and export.step2.label.preview = 'N\\u00E1hled' inserted adjacent to the export.step2.helper line. Matches the existing export.tab.edit / export.tab.preview values at lines 323–324. The 'á' in 'Náhled' uses the upper-hex \\u00E1 escape per the file's diacritic convention (verified at the same export.tab.preview line)."
      contains: "export.step2.label.edit"
  key_links:
    - from: "add-session.html .export-edit-area new <span class='export-pane-label'> children"
      to: "i18n-{en,de,he,cs}.js export.step2.label.edit / export.step2.label.preview"
      via: "data-i18n='export.step2.label.edit' (and ...label.preview) attributes on the new spans. App's i18n bootstrap (assets/i18n.js) scans for data-i18n on page load + language-change events and replaces textContent."
      pattern: "data-i18n=\"export.step2.label"
    - from: "assets/app.js initBirthDatePicker() tail appendChild block (currently lines 902–904)"
      to: "container DOM order"
      via: "Three sequential container.appendChild calls render the dropdowns left-to-right in LTR and right-to-left in RTL via direction-respecting block layout. Reordering the three appendChild lines (daySel first, then monthSel, then yearSel) flips the visual order across all 3 form instances (add-client.html line 62, add-session.html line 128, add-session.html line 502) without touching the picker's class-based read/write logic."
      pattern: "container.appendChild(daySel)"
    - from: "assets/app.css .edit-client-btn 44×44 container"
      to: ".edit-client-btn svg glyph at ~22px"
      via: "A new descendant selector .edit-client-btn svg { width: 22px; height: 22px; } scales the inline SVG to the locked accessible-icon ratio (~50% of container) per 22-UI-SPEC icon role. Selector is scoped to .edit-client-btn so no other inline SVGs are affected."
      pattern: ".edit-client-btn svg"
---

<objective>
Close 5 round-3 UAT gaps (N1, N2, N3, N6, N9) as one tightly-scoped "quick text & visual fixes" batch on the way to the PDF rewrite (phase 23).

**Gap N1 (export pane titles):** Step 2 of the export modal shows a markdown editor and a live preview side-by-side, but neither pane has a visible heading. First-time users cannot tell which side is which. Per D1, add a short "Edit" / "Preview" label above each pane (Label-role typography per 22-UI-SPEC: 14px / 600 / 1.4) with new i18n keys `export.step2.label.edit` and `export.step2.label.preview` in all 4 locales.

**Gap N2 (edit icon size):** The pencil icon `.edit-client-btn` on the client spotlight is 34×34px — below the 44×44px WCAG/iOS/Material touch-target minimum and visually small. Per D2, bump container to 44×44px and scale the inner SVG glyph to ~22px via a new descendant selector. No other pencil-icon variants exist in the app (verified: `.session-edit` is a text button, not an icon), so the sweep mentioned in D2 collapses to this single rule.

**Gap N3 (DOB picker order):** The 3-dropdown birth date picker renders Year → Month → Day in DOM order. For Sapir's primary locales (DE, CS, HE, EN-EU) the natural reading order is Day → Month → Year. Per D3, swap the three `appendChild` calls at the tail of `initBirthDatePicker()` (currently lines 902–904) to render Day → Month → Year. The picker's read/write logic accesses elements by class (`.birth-date-year`, `.birth-date-month`, `.birth-date-day`), not by DOM order, so the hidden YYYY-MM-DD value sync continues to work without any other change. Affects all 3 picker instances (add-client.html, inline add-session form, edit-client modal).

**Gap N6 (Hebrew ellipsis bidi):** The Hebrew select-placeholder `"...בחירה"` (and every other Hebrew copy string using ASCII `...`) renders with the dots on the wrong visual end because the three weak ASCII dots interact unpredictably with the bidi resolution. Per D4, replace every ASCII `...` in `assets/i18n-he.js` with the single Unicode horizontal-ellipsis character `…` (U+2026), which Unicode classifies as a single neutral character and which the browser resolves more predictably. If a specific string still renders incorrectly after the U+2026 swap (verified in Chrome desktop + iOS Safari), reorder the source string for that one entry only and document why inline as a code comment.

**Gap N9 (Hebrew gender-neutral copy):** Two helper strings (and others on the sweep list) use female-imperative verbs (`בחרי`, `ערכי`, `הקיפי`, `התחילי`, `הזיני`, `שמרי`, `מחקי`, `הקלידי`, `העתיקי`, `שלחי`). Per D5, rewrite to neutral infinitive/noun forms consistent with today's `אפס→איפוס` precedent. Example: `בחרי אילו חלקים` → `יש לבחור אילו חלקים`. Sweep the entire `assets/i18n-he.js` for every female-imperative pattern in one pass.

Purpose: Close the 5 smallest round-3 UAT findings so the destination phase (23 — PDF rewrite) ships against a clean Hebrew + clean export UX, without intermittent UI/copy bugs noise during PDF verification.

Output:
- Updated `assets/app.js`: three `appendChild` calls in `initBirthDatePicker()` reordered (Gap 3 / D3).
- Updated `assets/app.css`: `.edit-client-btn` container bumped to 44×44px + new descendant selector for the SVG glyph at 22px (Gap 2 / D2).
- Updated `add-session.html`: two `<span class="export-pane-label">` children added inside `.export-edit-area`, one per pane, each with a `data-i18n` attribute (Gap 1 / D1).
- Updated `assets/i18n-en.js`, `assets/i18n-de.js`, `assets/i18n-cs.js`: two new keys each (`export.step2.label.edit`, `export.step2.label.preview`) (Gap 1 / D1).
- Updated `assets/i18n-he.js`: two new keys (Gap 1 / D1) + ASCII `...` → U+2026 sweep (Gap 4 / D4) + female-imperative → neutral sweep (Gap 5 / D5).
- New CSS rule `.export-pane-label` applying the Label-role typography (14px / 600 / 1.4) for the new pane titles, per 22-UI-SPEC.

**Manual UAT confirmation required from Ben on all 5 gaps and from Sapir on the Hebrew strings (Gaps 4 + 5) before flipping them to `closed-fixed` in 22-HUMAN-UAT.md. Sapir's confirmation is a follow-up step — it does not block shipping the plan once the hard grep gates pass.**
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-14-CONTEXT.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-13-settings-pill-revert-affordance-PLAN.md
@assets/app.js
@assets/app.css
@add-session.html
@assets/i18n-en.js
@assets/i18n-de.js
@assets/i18n-he.js
@assets/i18n-cs.js

## UAT truth statements being closed (verbatim from 22-14-CONTEXT.md)

These are the ONLY five gaps this plan closes. No re-debate.

1. **N1 (Gap 1):** "In Step 2 of the export modal, the user can tell at first glance which side is the editor and which side is the preview, in all 4 languages."
2. **N2 (Gap 2):** "Pencil/edit icons across the app are large enough to read at a glance and meet the 44×44px touch-target standard on mobile."
3. **N3 (Gap 3):** "The birth date picker reads Day → Month → Year in DOM order across all 3 instances, in all 4 languages, with RTL Hebrew presenting Day on the right (start of reading)."
4. **N6 (Gap 4):** "Hebrew placeholders with an ellipsis render with the dots at the trailing end of the visible text, as a Hebrew reader expects."
5. **N9 (Gap 5):** "All Hebrew strings in the app use gender-neutral phrasing, consistent with today's אפס→איפוס fix."

## Locked decisions from 22-14-CONTEXT.md (DO NOT re-litigate)

- **D1 — Export pane titles:** new keys `export.step2.label.edit` and `export.step2.label.preview`. Per-locale values:
  - EN: "Edit" / "Preview"
  - DE: "Bearbeiten" / "Vorschau" (pure ASCII, no umlauts — no `\u00XX` escapes needed)
  - HE: "עריכה" / "תצוגה מקדימה" (RTL-safe via logical CSS properties)
  - CS: "Upravit" / "Náhled" ('á' uses upper-hex per file convention)
  - Label-role typography (14px / 600 / line-height 1.4) per 22-UI-SPEC.
- **D2 — Edit icon sizing:** bump `.edit-client-btn` container to 44×44px (WCAG/iOS/Material touch standard). Inner SVG glyph at ~22px (~50% of container — accessible-icon ratio per 22-UI-SPEC icon role). Apply to all pencil-icon variants in one pass — but **verified during planning that `.edit-client-btn` is the only pencil-icon variant**; `.session-edit` is a text button, not an icon. So the "sweep" reduces to one CSS rule.
- **D3 — DOB picker order:** swap `appendChild` order from Year → Month → Day to Day → Month → Year. Three lines change. No other logic.
- **D4 — Hebrew ellipsis bidi:** replace ASCII `...` with U+2026 `…` in every Hebrew copy string. The single Unicode character has a fixed bidi category and resolves more predictably than three weak ASCII dots. Verify in Chrome desktop + iOS Safari that dots render at the trailing reading end. If the U+2026 swap alone doesn't fix a specific string, reorder that one source string and document why inline.
- **D5 — Hebrew gender-neutral copy:** rewrite female-imperative verb forms (`בחרי / ערכי / הקיפי / התחילי / הזיני / שמרי / מחקי / הקלידי / העתיקי / שלחי`) to neutral infinitive/noun forms (e.g. `יש לבחור...` / `ניתן לבחור...`). Sweep all of `assets/i18n-he.js`.

## Locked design tokens from 22-UI-SPEC.md (DO NOT deviate)

- **Spacing scale:** Only {4, 8, 16, 24, 32, 48, 64}px. No 6px, no 12px. The `.export-pane-label` margin / padding uses **8px (the `xs` token)** for the gap to the pane below.
- **Type weights:** Only {400, 600}. The Label role is **600 (SemiBold)**.
- **Type roles — Label:** 14px (0.875rem) / 600 / line-height **1.4**. The `.export-pane-label` is a Label-role text and uses those exact values.
- **Icon role — accessible-icon ratio:** Inner glyph ~50% of touch container. 22px glyph inside a 44×44 container ≈ 50%.

## i18n encoding conventions per file (verified)

- `assets/i18n-en.js` — plain ASCII.
- `assets/i18n-de.js` — uses `\u00XX` **upper-hex** escapes for non-ASCII glyphs (ä, ö, ü, ß) when they appear (verified at lines 322 `Zurück`, 327 `Über Gerät`, 328 `Freigabemenü öffnen`). The two DE values added by this plan ("Bearbeiten" / "Vorschau") contain ZERO non-ASCII glyphs, so they remain pure ASCII strings — verified by `grep -q '"export.tab.edit": "Bearbeiten"' assets/i18n-de.js` (line 323, existing).
- `assets/i18n-he.js` — raw UTF-8 for Hebrew.
- `assets/i18n-cs.js` — uses `\u00XX` upper-hex escapes for Czech diacritics (verified at line 324: `"export.tab.preview": "Náhled"` — note the `á` is escaped as `á`). The CS value `"Upravit"` is pure ASCII; `"Náhled"` becomes `"Náhled"`.

## Existing implementation reference (read once before editing)

### Gap 1 — Export modal Step 2 markup (`add-session.html` L432–435)

The current Step 2 pane block:

```
<div class="export-edit-area">
  <textarea id="exportEditor" class="textarea export-editor" dir="auto" spellcheck="true"></textarea>
  <div id="exportPreview" class="export-preview"></div>
</div>
```

`.export-edit-area` is at `assets/app.css` line 2737: `display: grid; grid-template-columns: 1fr; gap: 16px;` (single column on mobile; widens to two columns at the responsive breakpoint defined further down at L2842 / L2848).

**Plan:** add two `<span class="export-pane-label" data-i18n="...">` elements as siblings of the textarea / preview, BEFORE each. The grid layout already auto-flows children top-to-bottom in single-column mode and into separate cells when the grid widens — so wrapping each pane in its own column would require structural changes. Instead, leverage the existing grid by placing the label above its pane inside a small wrapper, OR keep the labels as the first/third child of the grid in two-column mode and accept that they appear above each pane in one-column mode. Simpler approach: change `.export-edit-area` to a 2-row grid in two-column mode (1 row of labels + 1 row of panes), and stack as 4 children in single-column mode. The CSS change is additive and localised to the existing breakpoint blocks at L2842 / L2848 — no structural HTML rework needed beyond inserting the two `<span>` children at the start of `.export-edit-area`.

The simplest and lowest-risk markup is:

```
<div class="export-edit-area">
  <span class="export-pane-label" data-i18n="export.step2.label.edit">Edit</span>
  <span class="export-pane-label" data-i18n="export.step2.label.preview">Preview</span>
  <textarea id="exportEditor" class="textarea export-editor" dir="auto" spellcheck="true"></textarea>
  <div id="exportPreview" class="export-preview"></div>
</div>
```

Then update `.export-edit-area` so in two-column mode it uses `grid-template-columns: 1fr 1fr; grid-template-rows: auto 1fr;` and the children naturally land: label-edit (row 1, col 1), label-preview (row 1, col 2), textarea (row 2, col 1), preview (row 2, col 2). In single-column mode the existing `grid-template-columns: 1fr` flows all 4 children top-to-bottom in document order, which gives: edit-label / textarea / preview-label / preview — correct stacking for mobile.

### Gap 2 — Edit icon CSS (`assets/app.css` L755–780)

The current rule:

```
.edit-client-btn {
  position: absolute;
  inset-inline-start: 0.75rem;
  top: 0.75rem;
  background: var(--color-surface-modal-close);
  border: 0;
  border-radius: 10px;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-muted);
  transition: background 0.15s, color 0.15s;
}
.edit-client-btn:hover { ... }
```

**Change:** bump `width: 34px;` → `width: 44px;` and `height: 34px;` → `height: 44px;`. Add a new descendant rule `.edit-client-btn svg { width: 22px; height: 22px; }` immediately after the `.edit-client-btn:hover` rule. No other declarations move. The pencil-icon variant sweep mentioned in D2 was investigated during planning — `.session-edit` (line 601) is a text button, not an icon. No other `*-edit-btn` pencil-icon classes exist. The sweep collapses to this one rule.

### Gap 3 — DOB picker `initBirthDatePicker()` (`assets/app.js` L824–910)

Function `initBirthDatePicker()` builds three `<select>` elements (`yearSel`, `monthSel`, `daySel`), wires `change` listeners, and appends them to the container at lines 902–904 in this order:

```
container.appendChild(yearSel);
container.appendChild(monthSel);
container.appendChild(daySel);
```

**Change:** reorder to Day → Month → Year:

```
container.appendChild(daySel);
container.appendChild(monthSel);
container.appendChild(yearSel);
```

That's the entire change for Gap 3. Three lines. No logic change. The `syncHidden()` function reads from `yearSel.value`, `monthSel.value`, `daySel.value` — references by variable, not by DOM order — so the YYYY-MM-DD sync continues to work. The mobile native-date fallback at L907–910 (`window.matchMedia("(max-width: 768px)")` swap to a native `<input type="date">`) is below the appendChild block and unaffected.

All 3 instances of the picker reuse this single function call (add-client.html L62 → `initBirthDatePicker('birthDatePicker', ...)`, add-session.html L128 → `initBirthDatePicker('inlineBirthDatePicker', ...)`, add-session.html L502 → `initBirthDatePicker('editBirthDatePicker', ...)`), so the single reorder fixes all three.

### Gap 4 — Hebrew ASCII `...` instances (`assets/i18n-he.js`)

Verified during planning, the ASCII `...` pattern appears on the following lines of `assets/i18n-he.js`:

- L42: `"overview.search.placeholder": "חיפוש לפי שם..."` — replace `...` → `…`
- L84: `"client.form.referral.placeholder": "...בחירה"` — replace `...` → `…` (and validate visual order in Chrome + iOS Safari; if still wrong, reorder source to `"בחירה…"` and document inline)
- L89: `"client.form.referral.otherPlaceholder": "...נא לפרט"` — same treatment
- L94: `"session.form.client.new": "הוסף לקוח חדש..."` — replace `...` → `…`
- L317: `"export.preparing": "מכין PDF..."` — replace `...` → `…`

(Plus any other `...` matches discovered when the executor runs `grep -n '\.\.\.' assets/i18n-he.js` during execution — the executor sweeps the full file, not just these 5 known lines.)

### Gap 5 — Hebrew female-imperative sweep (`assets/i18n-he.js`)

Verified during planning, the female-imperative forms in `assets/i18n-he.js`:

- L298 `export.step1.helper`: `"שלב 1 מתוך 3 — בחרי אילו חלקים..."` → rewrite to `"שלב 1 מתוך 3 — יש לבחור אילו חלקים..."` (or equivalent neutral infinitive form — the executor picks the cleanest reading)
- L299 `export.step2.helper`: `"שלב 2 מתוך 3 — ערכי את המסמך משמאל..."` → rewrite using neutral infinitive (e.g. `"שלב 2 מתוך 3 — יש לערוך את המסמך משמאל..."`)
- L300 `export.step3.helper`: `"שלב 3 מתוך 3 — בחרי כיצד..."` → rewrite using neutral infinitive
- L302 `export.format.help.bold`: `"הקיפי טקסט בשני כוכבים..."` → rewrite using neutral form
- L303 `export.format.help.italic`: `"הקיפי טקסט בכוכב אחד..."` → rewrite using neutral form
- L304 `export.format.help.heading`: `"התחילי שורה ב־#..."` → rewrite using neutral form
- L305 `export.format.help.list`: `"התחילי שורה במקף..."` → rewrite using neutral form

(Plus any other female-imperative matches discovered when the executor runs the full sweep with the pattern `בחרי\|הזיני\|שמרי\|מחקי\|הקלידי\|העתיקי\|שלחי\|ערכי\|הקיפי\|התחילי` during execution.)

Existing tab labels at L310 `"export.tab.edit": "ערוך"` and L311 `"export.tab.preview": "תצוגה מקדימה"` use the **male-imperative** `ערוך` — which IS the Hebrew tech-UI default-neutral form by convention. The plan does NOT touch the existing tab labels; the new pane labels use the **noun** form `"עריכה"` (consistent with the existing `export.stepper.label.2`: `"עריכה"` at L296 — and consistent with the today's אפס→איפוס noun-form precedent).

## Risk callouts

**Risk 1 — i18n serialization (no impact within this plan):** All 4 i18n files are touched by Task 2 (and `assets/i18n-he.js` again by Task 3). Sequential within this plan; no parallel-execution conflict. Downstream parallel plans should treat 22-14 commits as the i18n baseline.

**Risk 2 — DOB picker hidden-value sync after DOM reorder:** The `syncHidden()` function (`assets/app.js` L873) reads `yearSel.value`, `monthSel.value`, `daySel.value` — by variable reference, not by DOM order. Reordering the appendChild calls does not affect the sync logic. Verified by reading the function during planning.

**Risk 3 — `.edit-client-btn` 44×44 size on narrow mobile viewport:** The button is `position: absolute; inset-inline-start: 0.75rem; top: 0.75rem` inside `.client-spotlight`. 44×44 at top-left + the spotlight's `padding: 1.1rem 1.4rem` leaves enough room — but Phase 21 (mobile audit, parked) will revisit anyway. No immediate conflict.

**Risk 4 — Hebrew ellipsis bidi: U+2026 may not fix all 5 cases:** The decision allows for a per-string source reorder if U+2026 alone doesn't resolve. The executor MUST visually verify each of the 5 known strings in Chrome desktop + iOS Safari after the swap. If any string still renders dots on the wrong end, the executor reorders the source for that specific entry and documents the reason inline as a JS line comment above the entry.

**Risk 5 — Hebrew gender-neutral rewrites — Sapir UAT follow-up:** The new wordings are translation-quality decisions. The hard grep gate verifies the female-imperative patterns are absent, but the actual neutral wording's naturalness is judged by Sapir. UAT-row flip to `closed-fixed` waits for Sapir's eye; plan ships when grep gates pass.

**Risk 6 — Step 2 grid layout regression:** The 4-children (2 labels + 2 panes) grid layout MUST still produce a clean two-column view at the desktop breakpoint. The executor MUST test the layout at desktop ≥ the breakpoint width AND on mobile (single-column flow) to confirm. Adding `grid-template-rows: auto 1fr` to the two-column rule keeps the labels in row 1 and panes in row 2.

**Risk 7 — Stale `data-i18n` resolution in mobile-tabs vs new pane labels:** The existing `<button class="tab-btn" data-i18n="export.tab.edit">Edit</button>` / `data-i18n="export.tab.preview"` at HTML lines 429–430 use the EXISTING `export.tab.*` keys. The NEW pane labels use the NEW `export.step2.label.*` keys. The two key namespaces do not collide. The mobile tabs continue to read from `export.tab.*`.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Edit icon size bump (Gap N2 / D2) + DOB picker DOM order swap (Gap N3 / D3) — CSS + JS only, no i18n changes</name>
  <files>assets/app.css, assets/app.js</files>
  <read_first>
    - assets/app.css lines 755–795 (existing `.edit-client-btn` rule and the hover rule that follows it)
    - assets/app.js lines 824–910 (full `initBirthDatePicker()` function — focus on the three `container.appendChild(...)` calls at lines 902–904)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-14-CONTEXT.md (D2 and D3 — locked decisions)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (icon role — accessible ratio ~50%; spacing scale)
  </read_first>
  <action>
    Two independent local edits, one CSS and one JS. No i18n changes in this task.

    **Step A — `.edit-client-btn` 44×44 (Gap N2 / D2) — `assets/app.css`.**

    Locate the rule at line 760. Change `width: 34px;` to `width: 44px;` and `height: 34px;` to `height: 44px;`. Leave every other declaration in the rule unchanged (position, inset-inline-start, top, background, border, border-radius, display, align-items, justify-content, cursor, color, transition). Do NOT introduce any physical-axis padding (`padding-left` / `padding-right`) — the rule uses logical layout already.

    Immediately AFTER the `.edit-client-btn:hover` rule (currently ends at line 780), insert a new descendant rule. Add a leading comment that explains: "Phase 22-14 (Gap N2 / D2) — scale the inner SVG glyph to the locked accessible-icon ratio (~50% of the 44×44 container) per 22-UI-SPEC icon role. Selector is scoped to .edit-client-btn so no other inline SVGs are affected."

    The new rule is:

    `.edit-client-btn svg` — declarations: `width: 22px;` and `height: 22px;`. Nothing else.

    **Step B — DOB picker DOM order swap (Gap N3 / D3) — `assets/app.js`.**

    Locate the three `container.appendChild(...)` calls at lines 902–904 inside `initBirthDatePicker()`. The current order is:

    ```
    container.appendChild(yearSel);
    container.appendChild(monthSel);
    container.appendChild(daySel);
    ```

    Replace with the Day → Month → Year order:

    ```
    container.appendChild(daySel);
    container.appendChild(monthSel);
    container.appendChild(yearSel);
    ```

    Add a leading comment immediately above the three lines that explains: "Phase 22-14 (Gap N3 / D3) — DOM order Day → Month → Year. DD.MM.YYYY is the European convention (DE primary, CS secondary, HE reads RTL so Day appears on visual right = start of reading, EN-EU therapists primary audience). Class-based read/write logic in syncHidden() is unaffected — selectors are .birth-date-year/.birth-date-month/.birth-date-day, not DOM order."

    Do not touch any other line in `initBirthDatePicker()`. No change to `updateDays()`, `syncHidden()`, `updateMonthNames()`, the change listeners, or the mobile native-date branch below.

    **Verification before commit:**
    - `node -c assets/app.js` parses
    - `grep -c "width: 44px" assets/app.css` shows ≥1 match in the `.edit-client-btn` rule body (use `grep -A 12 '\.edit-client-btn {' assets/app.css | grep -c 'width: 44px'` to scope the count to the rule body, not the whole file)
    - `grep -A 12 '\.edit-client-btn {' assets/app.css | grep -c 'height: 44px'` returns ≥1
    - `grep -c "\.edit-client-btn svg" assets/app.css` returns ≥1 (the new descendant selector)
    - `grep -A 3 '\.edit-client-btn svg' assets/app.css | grep -c "width: 22px"` returns 1 AND `grep -A 3 '\.edit-client-btn svg' assets/app.css | grep -c "height: 22px"` returns 1
    - No stale `34px` literal remains in the `.edit-client-btn` rule body: `grep -A 12 '\.edit-client-btn {' assets/app.css | grep -c '34px'` returns 0
    - `grep -A 12 '\.edit-client-btn {' assets/app.css | grep -cE 'padding-(left|right):'` returns 0 (no physical-axis padding sneaked in)
    - DOB picker order: `awk '/function initBirthDatePicker/,/^  }/' assets/app.js | grep -n 'container.appendChild' | head -3` — output MUST show `daySel` first, `monthSel` second, `yearSel` third (in line order). Verified by `awk '/function initBirthDatePicker/,/^  }/' assets/app.js | grep 'container.appendChild' | head -1 | grep -q 'daySel'`.

    Commit message: `fix(22-14): bump .edit-client-btn to 44x44 + DOB picker DOM order to Day→Month→Year (N2 D2, N3 D3)`
  </action>
  <verify>
    <automated>node -c assets/app.js && [ "$(grep -A 12 '\.edit-client-btn {' assets/app.css | grep -c 'width: 44px')" -ge 1 ] && [ "$(grep -A 12 '\.edit-client-btn {' assets/app.css | grep -c 'height: 44px')" -ge 1 ] && [ "$(grep -A 12 '\.edit-client-btn {' assets/app.css | grep -c '34px')" -eq 0 ] && [ "$(grep -A 12 '\.edit-client-btn {' assets/app.css | grep -cE 'padding-(left|right):')" -eq 0 ] && grep -q '\.edit-client-btn svg' assets/app.css && [ "$(grep -A 3 '\.edit-client-btn svg' assets/app.css | grep -c 'width: 22px')" -eq 1 ] && [ "$(grep -A 3 '\.edit-client-btn svg' assets/app.css | grep -c 'height: 22px')" -eq 1 ] && awk '/function initBirthDatePicker/,/^  }/' assets/app.js | grep 'container.appendChild' | head -1 | grep -q 'daySel' && awk '/function initBirthDatePicker/,/^  }/' assets/app.js | grep 'container.appendChild' | sed -n '2p' | grep -q 'monthSel' && awk '/function initBirthDatePicker/,/^  }/' assets/app.js | grep 'container.appendChild' | sed -n '3p' | grep -q 'yearSel'</automated>
  </verify>
  <acceptance_criteria>
    - **Source assertion (CSS):** `.edit-client-btn` rule body contains `width: 44px;` AND `height: 44px;` AND does NOT contain `34px`. Verified by 3 scoped greps on the `-A 12` window after the selector.
    - **Source assertion (CSS):** A new `.edit-client-btn svg` descendant rule exists with exactly `width: 22px;` and `height: 22px;`. Verified by `grep -A 3 '\.edit-client-btn svg' assets/app.css` producing both width and height lines.
    - **Source assertion (CSS):** No physical-axis padding sneaked into `.edit-client-btn`. Verified by `grep -A 12 '\.edit-client-btn {' assets/app.css | grep -cE 'padding-(left|right):'` returning 0.
    - **Source assertion (JS):** The three `container.appendChild` calls inside `initBirthDatePicker()` are in `daySel → monthSel → yearSel` order. Verified by an `awk` range bounded to the function body, then `head -1 | grep 'daySel'`, `sed -n '2p' | grep 'monthSel'`, `sed -n '3p' | grep 'yearSel'`.
    - **Parse assertion:** `node -c assets/app.js` exits 0.
    - **UAT truth N2 (behaviour, manual UAT — verbatim from 22-14-CONTEXT.md and 22-HUMAN-UAT.md):** "Pencil/edit icons across the app are large enough to read at a glance and meet the 44×44px touch-target standard on mobile." Verification:
      1. Open `add-session.html` in a fresh tab, pick a client so the client spotlight renders.
      2. The pencil icon top-inline-start of the spotlight is visibly larger (44×44 container).
      3. Inspect the element — DevTools confirms 44px × 44px box.
      4. The glyph inside is visibly larger (22px) but not cramped against the container edges.
      5. On mobile viewport (≤ 768px), the touch target is 44×44 — easily tapped without hitting neighbouring content.
      6. Hover state still works (background flips to `--color-primary`, color to `--color-text-inverse`).
    - **UAT truth N3 (behaviour, manual UAT — verbatim):** "The birth date picker reads Day → Month → Year in DOM order across all 3 instances, in all 4 languages, with RTL Hebrew presenting Day on the right (start of reading)." Verification:
      1. Open `add-client.html` (EN) → birth date picker renders Day dropdown first (left in LTR), Month, Year.
      2. Open `add-session.html` → inline birth date picker (in the "Add new client" inline form) renders Day first.
      3. Open `add-session.html`, open the edit-client modal → the modal's birth date picker renders Day first.
      4. Switch UI to DE / CS → same Day → Month → Year order, locale month names render correctly.
      5. Switch UI to HE → picker is RTL, Day appears on the visual right (start of Hebrew reading); Month centre; Year on the visual left. The native picker month names display in Hebrew (via Intl API).
      6. Select a date in any instance → the hidden YYYY-MM-DD input still receives the correct value (verified by inspecting the hidden input after a date pick).
      7. Save the form → the persisted birth date matches what was picked.
    - **Behaviour:** All `change` listener wiring (`yearSel.addEventListener('change', ...)`, etc.) continues to fire — DOM order has no effect on event registration.
  </acceptance_criteria>
  <done>
    - `.edit-client-btn` is 44×44px in CSS; inner SVG glyph is 22×22px via the new descendant rule.
    - `.edit-client-btn` rule body contains no stale `34px` literal.
    - `initBirthDatePicker()` appends `daySel` first, `monthSel` second, `yearSel` third.
    - All 3 picker instances (add-client, inline add-session, edit-client modal) render Day → Month → Year.
    - Hidden YYYY-MM-DD input continues to sync correctly when the user picks a date.
    - `node -c assets/app.js` parses.
    - Manual UAT confirms touch target is 44×44 on mobile and the picker order reads naturally in all 4 languages, including RTL Hebrew.
  </done>
</task>

<task type="auto">
  <name>Task 2: Export modal Step 2 pane titles (Gap N1 / D1) — HTML markup + 4 i18n locales + new CSS rule</name>
  <files>add-session.html, assets/app.css, assets/i18n-en.js, assets/i18n-de.js, assets/i18n-he.js, assets/i18n-cs.js</files>
  <read_first>
    - add-session.html lines 425–446 (full Step 2 block: helper, mobile tabs, `.export-edit-area`, formatting tips)
    - assets/app.css lines 2737–2780 (existing `.export-edit-area`, `.export-editor`, `.export-preview` rules and the responsive breakpoint blocks below at L2842 / L2848)
    - assets/i18n-en.js lines 295–315 (where the export.* keys live; insert the 2 new keys adjacent to `export.step2.helper` at L299)
    - assets/i18n-de.js lines 304–325 (mirror the same insertion point; values "Bearbeiten" / "Vorschau" are pure ASCII — no `\u00XX` escape needed; the existing `export.tab.edit` / `export.tab.preview` at L323–324 already store these values raw)
    - assets/i18n-he.js lines 296–301 (insertion point; values "עריכה" / "תצוגה מקדימה" raw UTF-8)
    - assets/i18n-cs.js lines 304–325 (insertion point; "Upravit" pure ASCII; "Náhled" → "Náhled" upper-hex per file convention, verified by the existing `export.tab.preview` at L324)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (Label-role typography: 14px / 600 / line-height 1.4; spacing scale {4, 8, 16, 24, 32, 48, 64})
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-14-CONTEXT.md (D1 — locked decision: new keys, per-locale wording, Label-role typography)
  </read_first>
  <action>
    Six files. Single semantic feature: two new pane title labels in Step 2 of the export modal, rendered via the standard `data-i18n` mechanism, styled per the Label role from 22-UI-SPEC.

    **Step A — Add the two new i18n keys to all 4 locale files. Translated, NOT TODO placeholders. Insert as two consecutive new lines immediately AFTER the existing `export.step2.helper` entry in each file.**

    File: `assets/i18n-en.js` — insert after line 299. The two lines to add:
    `  "export.step2.label.edit": "Edit",`
    `  "export.step2.label.preview": "Preview",`

    File: `assets/i18n-de.js` — insert after the equivalent `export.step2.helper` line (currently L306). The two lines to add:
    `  "export.step2.label.edit": "Bearbeiten",`
    `  "export.step2.label.preview": "Vorschau",`
    (Both values are pure ASCII — neither contains an umlaut — so no `\u00XX` escape. This is confirmed by the existing `export.tab.edit: "Bearbeiten"` and `export.tab.preview: "Vorschau"` at L323–324 of the same file which also use raw ASCII.)

    File: `assets/i18n-he.js` — insert after line 299 `export.step2.helper`. The two lines to add:
    `  "export.step2.label.edit": "עריכה",`
    `  "export.step2.label.preview": "תצוגה מקדימה",`
    (Raw UTF-8 per file convention. "עריכה" is the noun form — consistent with `export.stepper.label.2` at L296 which is also "עריכה", and with the today's אפס→איפוס noun-form precedent. NOT the imperative "ערוך" that lives at L310 for the mobile tab.)

    File: `assets/i18n-cs.js` — insert after the equivalent `export.step2.helper` line (currently L306). The two lines to add:
    `  "export.step2.label.edit": "Upravit",`
    `  "export.step2.label.preview": "Náhled",`
    (The 'á' in "Náhled" is escaped as `á` upper-hex, matching the existing `export.tab.preview: "Náhled"` at L324.)

    All four files: place the two new entries at the same logical position (adjacent to `export.step2.helper`) for grep-locatability. No TODO placeholder/comment introduced.

    **Step B — Add the two `<span class="export-pane-label" data-i18n="...">` children to `.export-edit-area` in `add-session.html`.**

    Locate the `.export-edit-area` block at lines 432–435. Change it from:

    ```
    <div class="export-edit-area">
      <textarea id="exportEditor" class="textarea export-editor" dir="auto" spellcheck="true"></textarea>
      <div id="exportPreview" class="export-preview"></div>
    </div>
    ```

    To:

    ```
    <div class="export-edit-area">
      <span class="export-pane-label" data-i18n="export.step2.label.edit">Edit</span>
      <span class="export-pane-label" data-i18n="export.step2.label.preview">Preview</span>
      <textarea id="exportEditor" class="textarea export-editor" dir="auto" spellcheck="true"></textarea>
      <div id="exportPreview" class="export-preview"></div>
    </div>
    ```

    The English default text inside each `<span>` ("Edit" / "Preview") is the in-DOM fallback; the i18n bootstrap replaces it with the translated value at page-load and on language-change events. This mirrors the existing pattern used at lines 429–430 for the mobile tab buttons (which use `data-i18n="export.tab.edit"` / `data-i18n="export.tab.preview"`).

    No changes to the textarea or preview div. No `<label for="...">` semantic association — these are visual labels for the entire pane, not form-field labels. (A `<label>` element would require a `for=` attribute pointing to a single form control, which doesn't match a "label above a textarea AND its sibling preview pane".)

    **Step C — Add the `.export-pane-label` CSS rule and update `.export-edit-area` for the new 4-children grid layout.**

    Append to `assets/app.css` in the Phase 22 Export Modal block, immediately AFTER the existing `.export-preview` rule (currently at L2750–2757). Add a leading comment that explains: "Phase 22-14 (Gap N1 / D1) — visible pane title above each Step 2 pane (editor on inline-start, preview on inline-end at desktop). Label-role typography per 22-UI-SPEC: 14px / 600 / 1.4. Logical margin-block-end of 8px (xs spacing token) for the gap to the pane below."

    The new rule is `.export-pane-label`. Declarations — all locked by 22-UI-SPEC tokens:
    - `font-size: 0.875rem;` (14px = Label role)
    - `font-weight: 600;` (Label-role SemiBold)
    - `line-height: 1.4;` (Label-role line-height)
    - `color: var(--color-text-muted);` (matches the existing `.export-step-helper` palette; reuses an existing token, not a hard-coded colour)
    - `margin-block-end: 8px;` (xs spacing token; gap between the label and its pane below; logical property, RTL/LTR-agnostic)

    Do NOT use physical-axis margins (`margin-bottom`) — use the logical `margin-block-end`.

    Then update the responsive breakpoint blocks at lines 2842 and 2848 (`.export-edit-area` at the wider viewport) to use a 2-row grid so the two new labels sit in row 1 and the two panes in row 2. Locate each existing `.export-edit-area { grid-template-columns: 1fr 1fr; ... }` declaration in those breakpoint blocks and add a sibling declaration `grid-template-rows: auto 1fr;`. (If only one breakpoint block uses `1fr 1fr`, update that one. The executor verifies during the read step which block(s) widen the grid to two columns.)

    For the single-column mode at the top-level `.export-edit-area` rule (L2737), the existing `grid-template-columns: 1fr;` flows all 4 children top-to-bottom in document order: edit-label → textarea → preview-label → preview-div. That stacking matches mobile reading order. No change needed to the base rule's `grid-template-columns`.

    **Step D — Sanity check that the 2 new keys resolve in all locales.**

    Each of the 4 i18n files MUST contain exactly one occurrence of `"export.step2.label.edit"` AND exactly one occurrence of `"export.step2.label.preview"`. Verify with two greps per file.

    **Verification before commit:**
    - `node -c assets/i18n-en.js && node -c assets/i18n-de.js && node -c assets/i18n-he.js && node -c assets/i18n-cs.js` — all 4 parse
    - For each of i18n-{en,de,he,cs}.js: `grep -c '"export.step2.label.edit"' <file>` returns 1 AND `grep -c '"export.step2.label.preview"' <file>` returns 1
    - DE values are pure ASCII (not escaped — they have no umlauts): `grep -q '"export.step2.label.edit": "Bearbeiten"' assets/i18n-de.js` and `grep -q '"export.step2.label.preview": "Vorschau"' assets/i18n-de.js`
    - CS values: `grep -q '"export.step2.label.edit": "Upravit"' assets/i18n-cs.js` and `grep -q 'N\\u00E1hled' assets/i18n-cs.js`
    - HE values: `grep -q '"export.step2.label.edit": "עריכה"' assets/i18n-he.js` (raw UTF-8) and `grep -q '"export.step2.label.preview": "תצוגה מקדימה"' assets/i18n-he.js`
    - `grep -c 'data-i18n="export.step2.label.edit"' add-session.html` returns 1
    - `grep -c 'data-i18n="export.step2.label.preview"' add-session.html` returns 1
    - `grep -c '\.export-pane-label' assets/app.css` returns ≥1 (the new CSS rule)
    - The new CSS rule uses the locked token triple: `font-size: 0.875rem`, `font-weight: 600`, `line-height: 1.4`. Verified by 3 positive greps on the 6-line window after the selector.
    - No physical-axis margin in the new rule: `grep -A 6 '\.export-pane-label' assets/app.css | grep -cE 'margin-(top|bottom):'` returns 0.
    - No TODO placeholder/comment introduced in the i18n entries' neighbourhood: `grep -B 2 'export.step2.label' assets/i18n-en.js assets/i18n-de.js assets/i18n-he.js assets/i18n-cs.js | grep -ci 'TODO'` returns 0.

    Commit message: `feat(22-14): add Step 2 export modal pane titles (en/de/he/cs) (N1 D1)`
  </action>
  <verify>
    <automated>node -c assets/i18n-en.js && node -c assets/i18n-de.js && node -c assets/i18n-he.js && node -c assets/i18n-cs.js && [ "$(grep -c '\"export.step2.label.edit\"' assets/i18n-en.js)" -eq 1 ] && [ "$(grep -c '\"export.step2.label.preview\"' assets/i18n-en.js)" -eq 1 ] && [ "$(grep -c '\"export.step2.label.edit\"' assets/i18n-de.js)" -eq 1 ] && [ "$(grep -c '\"export.step2.label.preview\"' assets/i18n-de.js)" -eq 1 ] && [ "$(grep -c '\"export.step2.label.edit\"' assets/i18n-he.js)" -eq 1 ] && [ "$(grep -c '\"export.step2.label.preview\"' assets/i18n-he.js)" -eq 1 ] && [ "$(grep -c '\"export.step2.label.edit\"' assets/i18n-cs.js)" -eq 1 ] && [ "$(grep -c '\"export.step2.label.preview\"' assets/i18n-cs.js)" -eq 1 ] && grep -q '"export.step2.label.edit": "Bearbeiten"' assets/i18n-de.js && grep -q '"export.step2.label.preview": "Vorschau"' assets/i18n-de.js && grep -q '"export.step2.label.edit": "Upravit"' assets/i18n-cs.js && grep -q 'N\\u00E1hled' assets/i18n-cs.js && [ "$(grep -c 'data-i18n="export.step2.label.edit"' add-session.html)" -eq 1 ] && [ "$(grep -c 'data-i18n="export.step2.label.preview"' add-session.html)" -eq 1 ] && grep -q '\.export-pane-label' assets/app.css && [ "$(grep -A 6 '\.export-pane-label' assets/app.css | grep -c 'font-size: 0.875rem')" -ge 1 ] && [ "$(grep -A 6 '\.export-pane-label' assets/app.css | grep -c 'font-weight: 600')" -ge 1 ] && [ "$(grep -A 6 '\.export-pane-label' assets/app.css | grep -c 'line-height: 1.4')" -ge 1 ] && [ "$(grep -A 6 '\.export-pane-label' assets/app.css | grep -cE 'margin-(top|bottom):')" -eq 0 ] && [ "$(grep -B 2 'export.step2.label' assets/i18n-en.js assets/i18n-de.js assets/i18n-he.js assets/i18n-cs.js | grep -ci 'TODO')" -eq 0 ]</automated>
  </verify>
  <acceptance_criteria>
    - **Source assertion (i18n):** Each of `assets/i18n-en.js`, `assets/i18n-de.js`, `assets/i18n-he.js`, `assets/i18n-cs.js` contains the keys `"export.step2.label.edit"` and `"export.step2.label.preview"`, each exactly once. Values per locale:
      - EN: "Edit" / "Preview"
      - DE: "Bearbeiten" / "Vorschau" (pure ASCII, no escape)
      - HE: "עריכה" / "תצוגה מקדימה" (raw UTF-8)
      - CS: "Upravit" / "Náhled" (upper-hex `á` per file convention, verified at L324)
    - **Source assertion (no TODO — neighbourhood-aware):** No `TODO` placeholder/comment in the 2 lines preceding either new key in any of the 4 files. Verified by `grep -B 2 'export.step2.label' assets/i18n-*.js | grep -ci 'TODO'` returning 0.
    - **Source assertion (HTML):** `add-session.html` contains exactly one `data-i18n="export.step2.label.edit"` and exactly one `data-i18n="export.step2.label.preview"`, both on `<span class="export-pane-label">` elements inside the `.export-edit-area` block.
    - **Source assertion (CSS — locked token triple):** `assets/app.css` contains a `.export-pane-label` rule that uses ALL THREE locked values: `font-size: 0.875rem` (= 14px = Label role per 22-UI-SPEC), `font-weight: 600` (Label-role SemiBold), `line-height: 1.4` (Label-role line-height). Verified by three positive greps on the 6-line window after the selector. AND no physical-axis margin inside the rule: `grep -A 6 '\.export-pane-label' assets/app.css | grep -cE 'margin-(top|bottom):'` returns 0.
    - **Parse assertion:** `node -c` exits 0 for all 4 i18n files.
    - **UAT truth N1 (behaviour, manual UAT — verbatim from 22-14-CONTEXT.md and 22-HUMAN-UAT.md):** "In Step 2 of the export modal, the user can tell at first glance which side is the editor and which side is the preview, in all 4 languages." Verification:
      1. Open the app in EN locale, open the export modal for any session, advance to Step 2.
      2. Above the markdown textarea pane, the label "Edit" is visible (Label-role typography — 14px, weight 600, line-height 1.4).
      3. Above the rendered preview pane, the label "Preview" is visible.
      4. Switch UI language to DE → labels read "Bearbeiten" / "Vorschau".
      5. Switch to HE → labels read "עריכה" / "תצוגה מקדימה", RTL flow — the edit label sits above the textarea (on the visual right in HE), the preview label sits above the preview (on the visual left in HE).
      6. Switch to CS → labels read "Upravit" / "Náhled" (the `á` escape decodes to `á` at runtime).
      7. On a mobile viewport (single-column layout), the labels appear above each pane in stacked reading order: Edit-label / textarea / Preview-label / preview-div.
      8. The labels are non-interactive (no hover state, no cursor change). Clicking a label does nothing — it's a visual heading, not a control.
    - **Behaviour (grid layout):** Desktop two-column layout still works correctly — labels in row 1, panes in row 2 — via the `grid-template-rows: auto 1fr` declaration added to the breakpoint block.
    - **Behaviour (mobile tabs unchanged):** The existing mobile-tabs row at L428–430 (`data-i18n="export.tab.edit"` / `data-i18n="export.tab.preview"`) continues to render and function correctly. The two i18n key namespaces (`export.tab.*` vs `export.step2.label.*`) do not collide.
  </acceptance_criteria>
  <done>
    - 4 i18n files each have the new keys `export.step2.label.edit` and `export.step2.label.preview` with the correct localised value (EN/DE/HE/CS — no TODO placeholders).
    - DE values are pure ASCII (no umlauts). CS "Náhled" uses the upper-hex `á` escape per file convention.
    - HE values are raw UTF-8. EN values are pure ASCII.
    - `add-session.html` has two `<span class="export-pane-label" data-i18n="...">` children added as the first two children of `.export-edit-area`.
    - `assets/app.css` has a new `.export-pane-label` rule using the locked 22-UI-SPEC token triple: 14px / 600 / 1.4, plus `margin-block-end: 8px` and `color: var(--color-text-muted)`.
    - Responsive breakpoint block(s) for `.export-edit-area` include `grid-template-rows: auto 1fr` so the 4 children land in a 2-row grid at desktop.
    - Manual UAT confirms labels are visible in all 4 locales, both layouts (desktop 2-col and mobile 1-col).
    - No regression to the existing mobile-tabs row.
  </done>
</task>

<task type="auto">
  <name>Task 3: Hebrew copy pass (Gap N6 / D4 ASCII '...' → U+2026 sweep + Gap N9 / D5 female-imperative → neutral sweep) — `assets/i18n-he.js` only</name>
  <files>assets/i18n-he.js</files>
  <read_first>
    - assets/i18n-he.js (full file — focus on every line containing ASCII `...` and every line containing the female-imperative patterns listed below)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-14-CONTEXT.md (D4 and D5 — locked decisions; D5 lists 7 sweep patterns: `בחרי / הזיני / שמרי / מחקי / הקלידי / העתיקי / שלחי`; planning also identified `ערכי`, `הקיפי`, `התחילי` from the existing strings — sweep includes those 10 patterns)
  </read_first>
  <action>
    Pure i18n edit of one file. No JS, CSS, or HTML changes.

    **Step A — ASCII `...` → U+2026 sweep (Gap N6 / D4).**

    Run `grep -n '\.\.\.' assets/i18n-he.js` to find every line containing the ASCII three-dot pattern. Planning identified at least 5 such lines (L42, L84, L89, L94, L317) — the executor confirms the full list at the start of the task.

    For each match, replace the ASCII `...` with the single Unicode horizontal-ellipsis character `…` (U+2026). Examples:

    - Before: `"overview.search.placeholder": "חיפוש לפי שם...",`
      After: `"overview.search.placeholder": "חיפוש לפי שם…",`
    - Before: `"client.form.referral.placeholder": "...בחירה",`
      After: `"client.form.referral.placeholder": "…בחירה",`
    - Before: `"export.preparing": "מכין PDF...",`
      After: `"export.preparing": "מכין PDF…",`
    - (and any other matches the grep finds)

    After the swap, the executor opens `index.html` (or any page that renders these placeholders) in Chrome desktop AND iOS Safari (or the closest available simulator), confirms that the dots render at the trailing reading end. For any string where the U+2026 swap alone does NOT produce the correct visual order, reorder that specific source string (e.g. flip "…בחירה" to "בחירה…") and add a single-line code comment immediately above explaining: "Phase 22-14 (Gap N6 / D4) — source order reversed because U+2026 alone did not resolve bidi correctly in [Chrome/Safari]. Verified visual order is now <expected>."

    The hard grep gate verifies the ASCII `...` pattern is gone from the file. The visual-order verification is part of the manual UAT — Sapir confirms whether the reading flow feels right to a native Hebrew speaker.

    **Step B — Female-imperative → neutral sweep (Gap N9 / D5).**

    Run `grep -n -E 'בחרי|הזיני|שמרי|מחקי|הקלידי|העתיקי|שלחי|ערכי|הקיפי|התחילי' assets/i18n-he.js` to find every line containing a female-imperative form. Planning identified the following entries (Hebrew text approximate — actual file content is the source of truth):

    - L298 `export.step1.helper`: contains `בחרי`
    - L299 `export.step2.helper`: contains `ערכי`
    - L300 `export.step3.helper`: contains `בחרי`
    - L302 `export.format.help.bold`: contains `הקיפי`
    - L303 `export.format.help.italic`: contains `הקיפי`
    - L304 `export.format.help.heading`: contains `התחילי`
    - L305 `export.format.help.list`: contains `התחילי`

    For each match, rewrite the verb form to neutral infinitive or noun form, consistent with the today's `אפס → איפוס` precedent. Two acceptable rewrite patterns:

    - **(a) Infinitive with `יש ל...` / `ניתן ל...` prefix.** Example: `בחרי אילו חלקים` → `יש לבחור אילו חלקים`. This is the most neutral; reads as instruction-by-statement, not as imperative-to-a-person.
    - **(b) Reword to a noun-phrase instruction.** Example: `הקיפי טקסט בשני כוכבים כדי שיהיה מודגש` → `הקפת טקסט בשני כוכבים תהפוך אותו למודגש` (noun-form). Use sparingly — only where the infinitive reads awkward.

    Recommendation: prefer (a) for every match unless the resulting Hebrew reads strained, in which case fall back to (b) for that one entry only. The executor picks the cleanest reading for each. Sapir confirms final wording.

    Do NOT touch any other strings in the file. Specifically: the existing male-imperative `ערוך` at L310 (`export.tab.edit`) and equivalent at L24, L192 stays as-is — male imperative is the Hebrew tech-UI default-neutral convention by long-standing usage. Only the FEMALE-imperative ending `-י` patterns are being rewritten in this sweep.

    **Step C — Hard grep gates.**

    After both sweeps:
    - `grep -c '\.\.\.' assets/i18n-he.js` returns 0 (no ASCII three-dot pattern remains anywhere in the file)
    - `grep -cE 'בחרי|הזיני|שמרי|מחקי|הקלידי|העתיקי|שלחי|ערכי|הקיפי|התחילי' assets/i18n-he.js` returns 0 (no female-imperative pattern remains)
    - `grep -q '…' assets/i18n-he.js` succeeds (the U+2026 character IS present — i.e., the sweep actually replaced things, didn't just delete the dots)
    - `node -c assets/i18n-he.js` parses
    - No new TODO/FIXME comments introduced

    Commit message: `i18n(22-14): Hebrew copy pass — U+2026 ellipsis + female-imperative → neutral (N6 D4, N9 D5)`
  </action>
  <verify>
    <automated>node -c assets/i18n-he.js && [ "$(grep -c '\.\.\.' assets/i18n-he.js)" -eq 0 ] && [ "$(grep -cE 'בחרי|הזיני|שמרי|מחקי|הקלידי|העתיקי|שלחי|ערכי|הקיפי|התחילי' assets/i18n-he.js)" -eq 0 ] && grep -q '…' assets/i18n-he.js && [ "$(grep -ciE 'TODO|FIXME' assets/i18n-he.js)" -eq 0 ]</automated>
  </verify>
  <acceptance_criteria>
    - **Source assertion (Gap N6 / D4 — ellipsis sweep):** `grep -c '\.\.\.' assets/i18n-he.js` returns 0 — no ASCII three-dot pattern remains anywhere in the file. AND `grep -q '…' assets/i18n-he.js` succeeds — the U+2026 character IS present (i.e., the sweep replaced, didn't delete).
    - **Source assertion (Gap N9 / D5 — female-imperative sweep):** `grep -cE 'בחרי|הזיני|שמרי|מחקי|הקלידי|העתיקי|שלחי|ערכי|הקיפי|התחילי' assets/i18n-he.js` returns 0 — no female-imperative verb form remains in the file.
    - **Source assertion (no TODO/FIXME):** `grep -ciE 'TODO|FIXME' assets/i18n-he.js` returns 0 — no placeholder comment introduced.
    - **Source assertion (other languages untouched):** `git diff --stat assets/i18n-en.js assets/i18n-de.js assets/i18n-cs.js` shows no change at this commit (executor's responsibility to ensure the file scope is limited to `assets/i18n-he.js` — the Task 2 commit may have touched these files, but Task 3 does not).
    - **Parse assertion:** `node -c assets/i18n-he.js` exits 0.
    - **UAT truth N6 (behaviour, manual UAT — verbatim from 22-14-CONTEXT.md and 22-HUMAN-UAT.md):** "Hebrew placeholders with an ellipsis render with the dots at the trailing end of the visible text, as a Hebrew reader expects." Verification:
      1. Switch app UI to HE.
      2. Open the overview page → the search input placeholder reads `חיפוש לפי שם…` with the ellipsis on the trailing end of the Hebrew text (left side in RTL, since the Hebrew reads right-to-left). Verify in Chrome desktop.
      3. Open `add-client.html` → the referral source dropdown's placeholder reads `…בחירה` or `בחירה…` (whichever the executor confirmed renders correctly) — the dots sit at the end of the Hebrew reading, not at the start.
      4. Open `add-client.html` → the referral "Other" sub-placeholder renders the dots correctly.
      5. Open `add-session.html` → the "Add new client" placeholder renders dots at the trailing end.
      6. Trigger an export → the "Preparing PDF…" status text renders dots at the trailing end.
      7. Verify the same set of strings on iOS Safari (or closest mobile simulator). If any string renders dots on the wrong end in iOS but right in Chrome, the executor must escalate — that's a per-string source-reorder decision Sapir confirms.
      8. **Sapir UAT:** Sapir confirms the visual reading order feels natural for every string. Plan ships when the hard grep gates pass; Sapir's confirmation is a follow-up to flip the UAT row from `failed` to `closed-fixed` in 22-HUMAN-UAT.md.
    - **UAT truth N9 (behaviour, manual UAT — verbatim):** "All Hebrew strings in the app use gender-neutral phrasing, consistent with today's אפס→איפוס fix." Verification:
      1. Switch app UI to HE.
      2. Open the export modal Step 1 → the helper text reads with `יש לבחור...` (or equivalent neutral form), NOT `בחרי`.
      3. Open Step 2 → the helper text reads with `יש לערוך...` (or equivalent), NOT `ערכי`.
      4. Open Step 3 → the helper text reads with `יש לבחור...`, NOT `בחרי`.
      5. Open the formatting-tips disclosure in Step 2 → each tip ("bold", "italic", "heading", "list") reads in neutral form, NOT with `הקיפי` or `התחילי`.
      6. **Sapir UAT:** Sapir reads through every rewritten string and confirms each reads naturally in Hebrew. The hard grep gate is necessary but not sufficient for closing the UAT row — Sapir's eye on the wordings is the gate to flip from `failed` to `closed-fixed`.
      7. The existing male-imperative `ערוך` (at the mobile tab and overview table-edit button) stays unchanged — it is the Hebrew tech-UI default-neutral form by convention. Sapir confirms this is the right call.
  </acceptance_criteria>
  <done>
    - `assets/i18n-he.js` contains zero ASCII `...` patterns. The U+2026 `…` character is present where ellipses were.
    - `assets/i18n-he.js` contains zero female-imperative verb forms (`בחרי / הזיני / שמרי / מחקי / הקלידי / העתיקי / שלחי / ערכי / הקיפי / התחילי`).
    - Existing male-imperative `ערוך` and other gender-neutral-by-convention forms are unchanged.
    - No TODO/FIXME comment introduced.
    - `node -c assets/i18n-he.js` parses.
    - Ben confirms during UAT that the visual reading order of ellipsised strings is correct in Chrome desktop + iOS Safari.
    - Sapir's UAT pass confirms every rewritten Hebrew string reads naturally before the UAT rows N6 and N9 flip to `closed-fixed`. (Plan ships on hard grep gate pass; Sapir review is a downstream confirmation step.)
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| i18n locale files → DOM | Static localised strings rendered into export modal pane labels, DOB picker, formatting tips, search placeholders, etc. Source-controlled — no user content involved. |
| HTML markup (`add-session.html`) → DOM | New `<span>` elements with `data-i18n` attributes. Default text content is the literal English fallback ("Edit" / "Preview"). No user content. |
| `initBirthDatePicker()` appendChild order → form submission | DOM order of three `<select>` elements changes; the picker reads values by class-selected references, not by DOM order. Form-data submission path unchanged. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-22-14-01 | Tampering | New i18n keys `export.step2.label.edit` / `export.step2.label.preview` rendered into Step 2 pane labels | accept | Values are source-controlled (static strings in committed locale files) and rendered via the existing i18n bootstrap's `data-i18n` mechanism, which uses `textContent` (not `innerHTML`) per the existing pattern (verified in assets/i18n.js). Even if a malicious actor edited a locale file, `textContent` neutralises any HTML/script. No new attack surface. |
| T-22-14-02 | Tampering | New CSS classes `.export-pane-label` and `.edit-client-btn svg` descendant rule | accept | Pure presentational rules, no user-controlled selectors or values. No injection vector. |
| T-22-14-03 | Tampering | Hebrew copy edits (ellipsis swap, female-imperative rewrite) in `assets/i18n-he.js` | accept | Pure translation edits in a source-controlled file. No new code paths. Rendered via the same `textContent`-based i18n mechanism as all other locale strings. |
| T-22-14-04 | Information Disclosure | DOB picker DOM reorder | accept | The picker's read path (`syncHidden()` reads `yearSel.value` / `monthSel.value` / `daySel.value`) is unchanged. The hidden YYYY-MM-DD input continues to receive only the values the user explicitly picks. No new data exposure surface. |
| T-22-14-05 | Denial of Service | DOB picker DOM reorder + form submission | mitigate | Acceptance criteria explicitly verify the picker order is `daySel → monthSel → yearSel` AND the parse-check passes, ensuring the function still binds change listeners and runs `syncHidden()` correctly. If `node -c` fails, the picker breaks form submission — gate is enforced. |
| T-22-14-06 | Repudiation | n/a | accept | No audit-log or user-action records affected by this plan. |
| T-22-14-07 | Spoofing | n/a | accept | No auth, identity, or session-token surface affected. |
| T-22-14-08 | Elevation of Privilege | n/a | accept | No privilege boundaries crossed; all changes are within already-gated Settings/export/client paths. 22-14 adds no new gates and no new bypass surfaces. |

**Overall security posture:** No new attack surface. All five fixes are presentational / translational / DOM-order changes within existing source-controlled code paths. Standard `textContent`-based i18n rendering is preserved.
</threat_model>

<verification>
After all 3 tasks land, perform these checks:

1. `node -c assets/app.js && node -c assets/i18n-en.js && node -c assets/i18n-de.js && node -c assets/i18n-he.js && node -c assets/i18n-cs.js` — all 5 modified JS files parse.

2. **Gap N2 / D2 — `.edit-client-btn` 44×44 + SVG 22:** `grep -A 12 '\.edit-client-btn {' assets/app.css | grep -c 'width: 44px'` ≥ 1; `grep -A 12 '\.edit-client-btn {' assets/app.css | grep -c 'height: 44px'` ≥ 1; `grep -A 12 '\.edit-client-btn {' assets/app.css | grep -c '34px'` = 0; `grep -A 3 '\.edit-client-btn svg' assets/app.css | grep -c 'width: 22px'` = 1; `grep -A 3 '\.edit-client-btn svg' assets/app.css | grep -c 'height: 22px'` = 1; `grep -A 12 '\.edit-client-btn {' assets/app.css | grep -cE 'padding-(left|right):'` = 0.

3. **Gap N3 / D3 — DOB picker order:** `awk '/function initBirthDatePicker/,/^  }/' assets/app.js | grep 'container.appendChild' | head -1 | grep -q 'daySel'`; same range + `sed -n '2p' | grep -q 'monthSel'`; same range + `sed -n '3p' | grep -q 'yearSel'`.

4. **Gap N1 / D1 — Step 2 pane labels (HTML):** `grep -c 'data-i18n="export.step2.label.edit"' add-session.html` = 1; `grep -c 'data-i18n="export.step2.label.preview"' add-session.html` = 1.

5. **Gap N1 / D1 — Step 2 pane labels (i18n):** For each of i18n-{en,de,he,cs}.js: `grep -c '"export.step2.label.edit"' <file>` = 1 AND `grep -c '"export.step2.label.preview"' <file>` = 1.

6. **Gap N1 / D1 — per-locale wording assertions:** `grep -q '"export.step2.label.edit": "Bearbeiten"' assets/i18n-de.js` AND `grep -q '"export.step2.label.preview": "Vorschau"' assets/i18n-de.js`; `grep -q '"export.step2.label.edit": "Upravit"' assets/i18n-cs.js` AND `grep -q 'N\\u00E1hled' assets/i18n-cs.js`.

7. **Gap N1 / D1 — CSS rule:** `grep -q '\.export-pane-label' assets/app.css`; `grep -A 6 '\.export-pane-label' assets/app.css | grep -c 'font-size: 0.875rem'` ≥ 1; `grep -A 6 '\.export-pane-label' assets/app.css | grep -c 'font-weight: 600'` ≥ 1; `grep -A 6 '\.export-pane-label' assets/app.css | grep -c 'line-height: 1.4'` ≥ 1; `grep -A 6 '\.export-pane-label' assets/app.css | grep -cE 'margin-(top|bottom):'` = 0.

8. **Gap N6 / D4 — Hebrew ellipsis:** `grep -c '\.\.\.' assets/i18n-he.js` = 0; `grep -q '…' assets/i18n-he.js` succeeds.

9. **Gap N9 / D5 — Hebrew female-imperative:** `grep -cE 'בחרי|הזיני|שמרי|מחקי|הקלידי|העתיקי|שלחי|ערכי|הקיפי|התחילי' assets/i18n-he.js` = 0.

10. **No new TODO/FIXME:** `grep -B 2 'export.step2.label' assets/i18n-*.js | grep -ci 'TODO'` = 0; `grep -ciE 'TODO|FIXME' assets/i18n-he.js` = 0.

Manual UAT (must be performed by Ben after deploy; Sapir's confirmation needed for Hebrew strings before flipping N6 / N9 to `closed-fixed`):

**Gap N1 (export pane titles):**
- Open the app, open the export modal for any session, advance to Step 2.
- In EN: labels "Edit" / "Preview" visible above each pane (Label-role: 14px / 600 / 1.4).
- In DE: labels read "Bearbeiten" / "Vorschau".
- In HE: labels read "עריכה" / "תצוגה מקדימה", RTL flow correct.
- In CS: labels read "Upravit" / "Náhled".
- On mobile viewport: labels stack above each pane (Edit / textarea / Preview / preview-div).

**Gap N2 (edit icon size):**
- Open a session that has a client → spotlight renders. The pencil icon (top inline-start of the spotlight) is 44×44px, the glyph inside is ~22px, hover state still works.
- On mobile viewport (≤ 768px), the touch target is 44×44.

**Gap N3 (DOB picker order):**
- Open `add-client.html` (EN) → birth date picker renders Day → Month → Year.
- Open `add-session.html` → inline picker and edit-client modal picker both render Day → Month → Year.
- Switch UI to DE / CS / HE → same order; HE picker is RTL with Day on the visual right.
- Pick a date in any instance → the hidden YYYY-MM-DD input syncs correctly.

**Gap N6 (Hebrew ellipsis bidi):**
- Switch UI to HE. Verify in Chrome desktop AND iOS Safari (or closest simulator):
  - overview search placeholder reads with dots on trailing end
  - referral dropdown placeholder reads with dots on trailing end
  - referral "Other" placeholder reads with dots on trailing end
  - "Add new client" placeholder reads with dots on trailing end
  - "Preparing PDF…" status reads with dots on trailing end
- **Sapir confirms** the visual reading order is natural for a native Hebrew speaker on each string. Plan ships on grep gate pass; Sapir's confirmation flips the UAT row from `failed` to `closed-fixed`.

**Gap N9 (Hebrew gender-neutral copy):**
- Switch UI to HE. Open the export modal:
  - Step 1 helper reads with `יש לבחור...` (or equivalent neutral form), NOT `בחרי`.
  - Step 2 helper reads with neutral form, NOT `ערכי`.
  - Step 3 helper reads with neutral form, NOT `בחרי`.
  - Formatting tips (bold / italic / heading / list) read in neutral form, NOT with `הקיפי` or `התחילי`.
- **Sapir confirms** every rewritten string reads naturally in Hebrew. Plan ships on grep gate pass; Sapir's confirmation flips UAT row to `closed-fixed`.
- The existing male-imperative `ערוך` (at the mobile tab and overview table-edit button) stays unchanged — Sapir confirms this is the right call (male imperative is the Hebrew tech-UI default-neutral form by convention).
</verification>

<success_criteria>
- All five UAT `truth:` statements (N1, N2, N3, N6, N9) become provable in 22-HUMAN-UAT.md. The hard grep gates close on this commit; the row status flips from `failed` to `closed-fixed` after manual UAT (Ben on all 5, Sapir on N6 and N9).
- N1 acceptance: Step 2 pane labels visible in all 4 languages, Label-role typography (14px / 600 / 1.4), grid layout works on desktop and mobile, no regression to mobile tabs.
- N2 acceptance: `.edit-client-btn` is 44×44, inner SVG 22×22, no stale 34px, no physical-axis padding; hover state preserved; mobile touch target meets WCAG/iOS/Material standard.
- N3 acceptance: All 3 picker instances render Day → Month → Year in all 4 languages; HE RTL presents Day on visual right; hidden YYYY-MM-DD sync continues to work.
- N6 acceptance: Zero ASCII `...` in `assets/i18n-he.js`; U+2026 `…` present; Sapir confirms visual order is correct on all known strings.
- N9 acceptance: Zero female-imperative forms in `assets/i18n-he.js`; Sapir confirms each rewritten string reads naturally in Hebrew.
- All existing Plan 22-10 / 22-11 / 22-12 / 22-13 acceptance criteria still pass (no regression in: pill state machine, mobile tabs, export modal navigation, formatting-tips disclosure, settings page).
- Zero new console errors on page load, export-modal open, DOB picker render, or Hebrew locale switch.
- 3 atomic commits land on the working branch (one per task).
- No TODO placeholders introduced in any i18n file or HTML.
- i18n serialisation note: 22-14 is the new baseline for any downstream parallel-batched plan that touches the i18n files. The Task 2 and Task 3 commits land sequentially within this plan; no parallel-execution conflict here.
- Sapir UAT on Hebrew strings (N6 and N9) is acknowledged as a follow-up step that flips the UAT row to `closed-fixed`; it does NOT block this plan from shipping once the hard grep gates pass.
</success_criteria>

<output>
After completion, create `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-14-quick-text-visual-fixes-SUMMARY.md` per the template, recording:

- Each commit SHA (one per task = 3 commits expected: Task 1 → Task 2 → Task 3).
- Which UAT gap each commit closes:
  - Task 1 → N2 (Gap 2 / D2 — edit icon size) + N3 (Gap 3 / D3 — DOB picker order)
  - Task 2 → N1 (Gap 1 / D1 — Step 2 pane titles)
  - Task 3 → N6 (Gap 4 / D4 — Hebrew ellipsis) + N9 (Gap 5 / D5 — Hebrew gender-neutral)
- The exact line numbers in `assets/app.css` of the `.edit-client-btn` rule body and the new `.edit-client-btn svg` rule.
- The exact line numbers in `assets/app.js` of the reordered `container.appendChild` block (Day / Month / Year).
- The exact line numbers in `add-session.html` of the two new `<span class="export-pane-label">` elements.
- The exact line numbers in each of the 4 i18n files where the two new `export.step2.label.*` keys were inserted.
- The CS value as it appears in the file (should be the upper-hex escape form `Náhled`).
- The DE values verbatim (should be `Bearbeiten` and `Vorschau`, pure ASCII).
- The HE values verbatim (should be `עריכה` and `תצוגה מקדימה`, raw UTF-8).
- The list of `assets/i18n-he.js` lines where ASCII `...` was replaced with U+2026 `…` (file-by-file diff is sufficient).
- The list of `assets/i18n-he.js` lines where female-imperative verbs were rewritten, with the before/after Hebrew string for each.
- The verification grep results for each step (1–10 above).
- The new CSS rule's final values for `.export-pane-label`: `font-size`, `font-weight`, `line-height`, `margin-block-end`, `color` (should be 0.875rem / 600 / 1.4 / 8px / var(--color-text-muted) per 22-UI-SPEC).
- Browser verification result for Gap N6: Chrome desktop OK / iOS Safari OK / per-string source-reorder needed (with the specific strings flagged).
- Sapir UAT result for N6 and N9: pending / confirmed (and the date Sapir reviewed).
- Any deviations from the locked plan (there should be none — this is a tight 3-task gap-closure).
</output>
