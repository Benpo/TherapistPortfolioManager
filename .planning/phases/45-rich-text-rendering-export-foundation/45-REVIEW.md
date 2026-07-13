---
phase: 45-rich-text-rendering-export-foundation
reviewed: 2026-07-14T09:30:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - assets/add-session.js
  - assets/app.css
  - assets/changelog-content-cs.js
  - assets/changelog-content-de.js
  - assets/changelog-content-en.js
  - assets/changelog-content-he.js
  - assets/export-modal.js
  - assets/help-content-en.js
  - assets/md-render.js
  - assets/overview.js
  - assets/pdf-export.js
  - assets/sessions.js
  - index.html
  - sessions.html
  - tests/31-overview-render-hardening.test.js
  - tests/31-sessions-render-hardening.test.js
  - tests/45-backup-roundtrip.test.js
  - tests/45-compact-strip.test.js
  - tests/45-copy-share-verbatim.test.js
  - tests/45-inline-hardening.test.js
  - tests/45-mdrender-escape.test.js
  - tests/45-mdrender-lists.test.js
  - tests/45-mdrender-strip.test.js
  - tests/45-pdf-nested-lists.test.js
  - tests/45-pdf-note-headings.test.js
  - tests/45-pipeline-agreement.test.js
  - tests/45-read-mode-render.test.js
  - tests/changelog-integrity.test.js
findings:
  critical: 1
  warning: 2
  info: 5
  total: 8
status: issues_found
---

# Phase 45: Code Review Report

**Reviewed:** 2026-07-14T09:30:00Z
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

Reviewed all 28 files changed since `e48dc08` for Phase 45 (rich-text rendering & export foundation), weighting the three security-sensitive areas named in the phase context. All 14 touched test files were executed against the working tree — all pass (126 cases total, every file count-guarded).

**Security assessment of the weighted areas — clean:**
- **The read-mode innerHTML path (add-session.js:304)** is genuinely escape-first: `MdRender.render` escapes `& < > " '` before any structural rule, `applyInline` only injects fixed `<strong>/<em>` tags, and the fallback branch uses `textContent`. XSS probes (`<script>`, `<img onerror>`) are covered by executing tests (45-mdrender-escape, 45-read-mode-render case 2). No bypass found.
- **The `<li value>` attribute surface (md-render.js:103)** carries only `parseInt` of a `\d+` capture; I verified `listType`/`listOrdinal` accept the same line set, so `ordinal` is never `null` when `type === "ol"`, and no user-controlled text can reach the attribute. The `docLabelSet` lookup in pdf-export.js uses `=== true`, which also neutralizes `__proto__`/`constructor` prototype-chain false positives.
- **The copy/share verbatim pass-through** is byte-clean (no sentinel; label set passed as data), locked by 45-copy-share-verbatim.

**However, the new MdRender list builder silently drops typed content** in dedent shapes neither the unit tests nor the cross-pipeline fuzz corpus cover (CR-01), and the widened heading regex lets `\s+` consume a newline, promoting the line *after* a bare `##` into a heading (WR-01). Both were confirmed by executing the real renderers, and both make the Step-2 export preview disagree with the shipped PDF — the exact T-45-03 divergence class this phase's agreement test exists to prevent.

## Critical Issues

### CR-01: MdRender drops list items that dedent below the depth of the run's first item — typed content silently disappears from read mode and the export preview

**Status:** FIXED — commit `1e7ef3e` (2026-07-14). Each sibling run now re-anchors at the CURRENT item's own depth (top-level window floor 0, child runs bounded by "deeper than parent"), so every typed item renders; the line-92 skip branch is removed (unreachable-by-construction). Dedent shapes (both list types, empty + non-empty items) locked in `45-mdrender-lists` (5 cases) and the `45-pipeline-agreement` dedent corpus (per-item depth/type/ordinal vs pdf `parseMarkdown`).

**File:** `assets/md-render.js:121-137` (`buildSiblingLists` / `buildList`; contributing skip at `assets/md-render.js:92`)
**Issue:** `buildList` anchors the whole run at `items[0].depth`, and `buildSiblingLists` exits as soon as `items[i].depth < depth`. Any item shallower than the anchor is consumed by the caller's `i = k` child-scan but never rendered. Confirmed by executing the real renderer:

| Input | MdRender output | PDF parseMarkdown |
|---|---|---|
| `"  - a\n- b"` | `<ul><li>a</li></ul>` — **"b" gone** | keeps both items (depth 1, 0) |
| `"- a\n    - b\n  - c"` | `<ul><li>a<ul><li>b</li></ul></li></ul>` — **"c" gone** | keeps all three |
| `"  1. a\n1. b"` | `<ol><li value="1">a</li></ol>` — **"b" gone** | keeps both |

This violates the phase's own GAP-45-02 lock ("nothing typed disappears") and T-45-03 (preview/PDF agreement): the same `editor.value` renders **fewer items in the Step-2 "review what will be shared" preview and the read-mode overlay than in the exported PDF**, so a therapist reviews something different from what their client receives. The trigger is ordinary: a first list line typed with leading spaces, or a dedent to an intermediate level. Neither 45-mdrender-lists.test.js nor the pipeline-agreement nesting corpus contains any dedent-below-anchor shape, so the suite is green over the hole.
**Fix:** Re-anchor each sibling run at the *current* item's depth instead of the first item's, and bound child runs by "deeper than parent" rather than ">= first-child depth", e.g.:

```js
function buildList(listLines) {
  var items = listLines.map(...);
  var html = "", i = 0;
  while (i < items.length) {
    var res = buildOneList(items, i, items[i].depth); // re-anchor per run
    html += res.html;
    if (res.next <= i) break;
    i = res.next;
  }
  return html;
}
```

and inside `buildOneList`, when consuming the child run `j..k`, recurse with the same re-anchoring loop bounded by `items[x].depth > depth` (the parent's depth), so a dedent to any intermediate level closes the child list and starts a sibling run rather than being skipped. The `items[i].depth > depth → i++` "safety" branch at line 92 should then be unreachable-by-construction or emit the item — never skip it. Add the three inputs above to 45-mdrender-lists.test.js and to the pipeline-agreement nesting corpus.

## Warnings

### WR-01: Heading regex `\s+` matches a newline — a bare `##` line swallows its markers and promotes the next line to a heading, diverging from the PDF

**Status:** FIXED — commit `038b973` (2026-07-14). Adapted from the suggested `[ \t]+`: heading acceptance now tests the block's FIRST LINE ONLY with `/^(#{1,3})\s+(.+?)\s*$/` — CHARACTER-MATCHED to pdf-export `parseMarkdown`'s per-line `hMatch` — so the two pipelines accept the same heading lines by construction (a plain `[ \t]+` would still have diverged on the marker-only `"## \nfoo"` and pasted-NBSP shapes). The GAP-45-01 per-line scan deliberately keeps `\s+` (character-matched to the PDF's paragraph terminator; per-line `\s` cannot match a newline). Locked by `##\nfoo` / `## \nfoo` cases in `45-mdrender-lists` and the `45-pipeline-agreement` heading corpus.

**File:** `assets/md-render.js:149`
**Issue:** `block.match(/^(#{1,3})\s+([^\n]*)(?:\n([\s\S]*))?$/)` — `\s` includes `\n`, so the block `"##\nfoo"` matches with `\s+` consuming the newline: read mode renders `<h2>foo</h2>` (confirmed by execution). The typed `##` characters vanish from view and the following line is mis-styled. The PDF pipeline's per-line detector (`/^#{1,3}\s+/.test(line)` in `parseMarkdown`) correctly leaves `"##\nfoo"` as a literal paragraph — so preview and PDF disagree (T-45-03 class). It also contradicts md-render's own GAP-45-01 scan at line 176, which uses per-line `/^#{1,3}\s+/` and does *not* treat a bare `##` as a heading — the same file disagrees with itself depending on whether the marker-only line opens the block.
**Fix:** Restrict the marker separator to intra-line whitespace:

```js
var headingMatch = block.match(/^(#{1,3})[ \t]+([^\n]*)(?:\n([\s\S]*))?$/);
```

A bare `#`/`##`/`###` line then stays a literal paragraph in both pipelines. Add `"##\nfoo"` to the pipeline-agreement heading corpus.

### WR-02: Note-typed headings render as a single unwrapped `doc.text` call — long hand-typed headings overflow the PDF page width

**Status:** FIXED — commit `a8e0c56` (2026-07-14). The note-heading register now wraps through `doc.splitTextToSize(noteHeadingText, USABLE_W)` at the register's own font (Heebo bold @ noteSize, set before the split) and draws each sub-line margin-anchored per docDir; single-line headings keep byte-identical `ensureRoom`/`y` bookkeeping. The document branch (1535-1540) is left as-is per the review's own scoping (app-controlled short localized labels). Locked by a wrap test in `45-pdf-note-headings` (multiple margin-anchored sub-lines reconstructing the full typed heading).

**File:** `assets/pdf-export.js:1471-1490` (note-heading branch; same pattern in the document branch at 1535-1540)
**Issue:** The new note-heading register draws `shapeForJsPdf(noteHeadingText)` with one `doc.text` call and no `splitTextToSize`. Document headings could get away with this because their text is app-controlled localized section labels (short). Note headings are **therapist free text** — `## <a sentence-length heading>` overflows past the right margin in LTR (and past the left margin in RTL, where the draw is right-anchored at `PAGE_W - MARGIN_X`), clipping or colliding with the page edge. This is a newly exposed input class introduced by this phase; 45-pdf-note-headings only asserts size/chrome, never width.
**Fix:** Wrap the note heading through the same mechanism the body uses:

```js
var noteLines = doc.splitTextToSize(noteHeadingText, USABLE_W);
for (var nli = 0; nli < noteLines.length; nli++) {
  ensureRoom(LINE_HEIGHT_BODY);
  var v = shapeForJsPdf(noteLines[nli]);
  if (docDir === 'rtl') doc.text(v, PAGE_W - MARGIN_X, y, { align: 'right', isInputVisual: false });
  else doc.text(v, MARGIN_X, y, { isInputVisual: false });
  y += LINE_HEIGHT_BODY;
}
y += NOTE_HEADING_BOTTOM_MARGIN;
```

(Adjust the pre-loop `y +=` / `ensureRoom` bookkeeping accordingly.)

## Info

### IN-01: `MdRender.strip` strips indented headings both renderers treat as literal text

**File:** `assets/md-render.js:242`
**Issue:** `strip`'s heading rule is `/^\s*#{1,3}\s+/` (leading whitespace allowed), but both `renderBlock` (line 149, anchored at column 0) and pdf-export's `parseMarkdown` require the `#` at column 0. A line `" ## X"` shows literal `## X` in read mode and the PDF but appears as bare `X` on the compact surfaces.
**Fix:** Drop the leading `\s*` from the heading rule: `/^#{1,3}\s+/` — aligning strip's heading acceptance with both renderers.

### IN-02: `.note-rendered :first-child` is an unscoped descendant selector

**File:** `assets/app.css:3634-3636`
**Issue:** `.note-rendered :first-child { margin-block-start: 0; }` matches *every* first-child descendant at any depth (each list's first `<li>`, a `<strong>` opening a paragraph), not just the overlay's first block. Harmless today (those elements carry no top margin) but a footgun for future `.note-rendered` styling.
**Fix:** Scope with a child combinator: `.note-rendered > :first-child { margin-block-start: 0; }`.

### IN-03: "the app's ONE sanctioned innerHTML write of user note content" claim is inaccurate — the Step-2 export preview is a second MdRender-routed innerHTML path

**File:** `assets/add-session.js:280-281` (comment), `tests/31-sessions-render-hardening.test.js` (EXT(45-04) lock wording); the other path is `assets/export-modal.js:564` (`preview.innerHTML = window.MdRender.render(editor.value)`)
**Issue:** Both paths are MdRender-routed and escape-first, so there is no security defect — but the "ONE path" narrative repeated in comments and in the hardening test's documentation will misdirect a future security audit that greps for the sanctioned exception and stops at add-session.js.
**Fix:** Reword to "the app's only innerHTML writes of user note content are the two MdRender-routed surfaces: the add-session read-mode overlay and the export Step-2 preview (export-modal.js:564)".

### IN-04: Ordinals beyond Number precision render divergently (`value="1e+21"` vs PDF prefix `1e+21.`)

**File:** `assets/md-render.js:75` and `assets/pdf-export.js:701`
**Issue:** A typed `999999999999999999999. x` gives `parseInt` → `1e+21`; MdRender emits `<li value="1e+21">` (an invalid integer attribute the browser ignores, falling back to sequential numbering) while the PDF prints the literal prefix `1e+21. `. Degenerate input, cosmetic divergence; no injection risk (the string form of a Number contains no HTML-active characters).
**Fix:** Optional — clamp the accepted ordinal (e.g., `\d{1,9}`) in both character-matched capture regexes if editor-1:1 fidelity for absurd ordinals ever matters.

### IN-05: Label-equality heading classification misfires when a note heading exactly equals a section label or the document title (accepted design tradeoff)

**File:** `assets/pdf-export.js:1394-1427`, `assets/export-modal.js` (`buildDocumentSectionLabels`)
**Issue:** A therapist who hand-types `## Comments` (or any exact localized section label, at any level 1-3 — e.g. `### Comments` also counts because the count predicate is `level >= 2`) inside a note gets the branded document chrome and shifts the severity block's placement slot. Likewise, editing a section heading's text in the Step-2 editor demotes it to the note register. This is inherent to the documented "data, not sentinel / trusted, not verified" D-02/D-03 design and mirrors the pre-existing `severityAfterSections` label-match fragility — recorded here as an accepted limitation, not a defect to fix now.
**Fix:** None required; if it ever bites, positional classification (first-N-headings) or level-scoped matching would narrow the collision window.

---

**Verification performed:** all 14 touched test files executed (all exit 0); CR-01 and WR-01 reproduced by executing the real `assets/md-render.js` and `assets/pdf-export.js` (`__test` seam) in jsdom; D-08 regex character-identity spot-verified across `applyInline` / `stripInlineMarkdown` / `parseInlineBold` including scanner-vs-regex agreement on adversarial marker sequences (`*a *b*`, `**a **b**`, `*a**b*c*`); `md-render.js` confirmed present in `sw.js` PRECACHE_URLS (line 82) for the two new page loads; docs-gate obligations satisfied (EN changelog + EN help both edited); staged v1.4.0 changelog entry confirmed inert for the whats-new popup until `APP_VERSION` flips (gate requires an entry matching the *running* version).

_Reviewed: 2026-07-14T09:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
