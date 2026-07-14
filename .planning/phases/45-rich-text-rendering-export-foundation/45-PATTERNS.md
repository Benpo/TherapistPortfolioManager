# Phase 45: Rich-Text Rendering & Export Foundation - Pattern Map

**Mapped:** 2026-07-13
**Files analyzed:** 8 modified/extended + 9 new test files
**Analogs found:** 8 / 8 (this is an extend-in-place phase — every modified file is its own best analog)

> **Key framing:** This phase adds **no new source module**. Every production file is an
> *extension* of shipped code, so the "closest analog" for each modified file is the file
> itself (its existing branches are the pattern to copy). New **test** files copy the
> repo's established behavior-test + render-hardening shapes. Excerpts below are the exact
> in-place patterns to extend, with the lines that must be preserved called out.

## File Classification

| File | Role | Data Flow | Change | Closest Analog | Match Quality |
|------|------|-----------|--------|----------------|---------------|
| `assets/md-render.js` | utility (renderer) | transform | Extend | itself (`renderBlock`/`applyInline`) | exact (self) |
| `assets/pdf-export.js` | utility (print pipeline) | transform | Extend | itself (`parseMarkdown`/`parseInlineBold`) | exact (self) |
| `assets/add-session.js` | component (form) | request-response | Extend | `export-modal.js` `exportUpdatePreview` (L533) | exact |
| `assets/export-modal.js` | component (modal) | transform | Verify/lock | itself (`buildSessionMarkdown` L171) | exact (self) |
| `assets/sessions.js` | component (table) | CRUD-read | Extend | itself (L262 `textContent`) + `overview.js` | exact |
| `assets/overview.js` | component (list) | CRUD-read | Extend | itself (L848 `textContent`) | exact (self) |
| `assets/app.css` | config (styles) | — | Extend | `.export-preview` block (L3555–3579) | exact |
| `assets/backup.js` | service (persistence) | file-I/O | Test-only | itself (whole-object JSON) | exact (self) |
| `tests/45-*.test.js` (×8) | test | — | New | `tests/31-*-render-hardening.test.js` | role-match |

## Pattern Assignments

### `assets/md-render.js` (utility/transform) — extend `renderBlock` + `applyInline`

**Analog:** self. The escape-first design is the whole security model — extend, never fork.

**Escape-first + inline pattern to preserve/harden (D-08)** (lines 8–23):
```javascript
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function applyInline(text) {
  // text is already escaped — only ** and * that survived escape get re-mapped.
  var out = text.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
  return out;
}
```
D-08 hardening tightens these TWO regexes so `*`/`**` must hug non-whitespace (no
space-adjacent match), keeping legacy `2 * 3 * 4` literal. The IDENTICAL change must land
in `pdf-export.js` `stripInlineMarkdown` (L434–435) and `parseInlineBold`.

**LOCKED contract — DO NOT change** (lines 25–31): single-newline → `<br>`, blank line →
new paragraph; heading regex accepts an optional body remainder. New ordered/nested support
must not alter this.

**List branch to extend for ordered + nested (D-04/D-05)** (lines 45–55):
```javascript
var lines = block.split(/\r?\n/).filter(function (l) { return l.length > 0; });
var allListItems = lines.length > 0 && lines.every(function (l) {
  return /^[-*]\s+.+/.test(l);          // ← PITFALL 3: every() breaks on indented sub-items
});
if (allListItems) {
  var items = lines.map(function (l) {
    return "<li>" + applyInline(l.replace(/^[-*]\s+/, "")) + "</li>";
  });
  return "<ul>" + items.join("") + "</ul>";
}
```
Rework: accept `1.` ordinals (emit `<ol>`), track leading-whitespace depth, recurse into
nested `<ul>`/`<ol>`. **Regression-lock:** flat non-nested output must stay byte-identical.

---

### `assets/pdf-export.js` (utility/transform) — extend `parseMarkdown`, guard section-count

**Analog:** self (Phase 23 bidi print engine). Reuse `parseInlineBold` + bidi segment
renderer for any new block type; never write a second bold regex.

**Invariant that D-08 must preserve** (lines 448–453):
```
parseInlineBold(input).map(s => s.text).join('') === stripInlineMarkdown(input)
```
`drawSegmentedLine` relies on this to place bold runs after bidi reorder. Harden
`stripInlineMarkdown` (L434–435) and `parseInlineBold` in lockstep and add a test asserting
the invariant still holds on hardened input.

**`parseMarkdown` block stream — where the note-body category (D-03) is introduced** (lines 586–635):
```javascript
var hMatch = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
if (hMatch) {
  blocks.push({ type: 'heading', level: hMatch[1].length, text: hMatch[2] });
  i++; continue;
}
// Ordered lists ALREADY supported here (typed-ordinal contract — do NOT position-derive):
if (listOrdered) {
  var ordMatch = /^\s*(\d+)\.\s+/.exec(lines[i]);
  var typedOrdinal = ordMatch ? parseInt(ordMatch[1], 10) : (items.length + 1);
  items.push({ text: lines[i].replace(/^\s*\d+\.\s+/, ""), ordinal: typedOrdinal });
}
blocks.push({ type: 'list', items: items, ordered: listOrdered });
```
New work here: nesting (indent level per item) + tagging note-body blocks as a distinct
category (e.g. `block.noteBody = true` or `type:'note-heading'`) so the section-count guard
and heading render can tell them apart. Preserve the `{text, ordinal}` typed-ordinal
contract (quick tasks iwr/c8x — position-derived numbering reintroduces the "three 1."s bug).

**Section-count guard that must ignore note headings (D-03)** (lines 1313–1319):
```javascript
if (block.type === 'heading' && block.level >= 2) {   // ← count DOCUMENT headings ONLY
  if (!severityDrawn && sectionHeadingsSeen === severityAfterSections) {
    drawSeverityBlock(severityIssues);
    severityDrawn = true;
  }
  sectionHeadingsSeen++;                               // ← note headings must NOT increment
}
```

**Branded heading chrome that note headings must NOT get (D-02)** (lines 1326–1343):
```javascript
if (block.type === 'heading') {
  var hSize = (block.level === 1) ? HEADING_SIZE + 2 : (block.level === 2) ? HEADING_SIZE : HEADING_SIZE - 2;
  // Phase 34 D-06: leaf-diamond bullet + #456b42 bold label + #bfe0b0 vein rule.
  y += HEADING_TOP_MARGIN;
  ...
  var headingText = stripInlineMarkdown(block.text);
```
Route note headings to a NEW subordinate, chrome-free branch (UI-SPEC §C: 12/11/10.5pt bold,
no diamond, no rule). RTL nesting indent = physical offset keyed off `docDir` (Pitfall 4;
memory `reference-rtl-logical-props-physical-coords`) — the PDF already anchors list prefixes
by `docDir` (~L1484); mirror that, don't reason in logical CSS.

---

### `assets/add-session.js` (component) — new `.note-rendered` overlay in `setReadMode`

**Analog:** `export-modal.js` `exportUpdatePreview` (the proven MdRender→innerHTML wiring).

**Current `setReadMode` — only sets `readOnly`, so `**bold**` shows literally** (lines 315–338):
```javascript
if (sessionForm) {
  sessionForm.querySelectorAll("input, select, textarea").forEach((el) => {
    if (el.tagName === "TEXTAREA") {
      el.readOnly = isReadMode;              // ← saved **bold** renders as literal "**bold**"
    } else { el.disabled = isReadMode; }
  });
  ...
}
if (isReadMode) { resizeReadModeTextareas(); }
else { clearReadModeTextareas(); updateAddIssueState(); updateRemoveButtons(); }
```

**Copy this MdRender→innerHTML pattern (from `export-modal.js:537`) for the overlay:**
```javascript
if (window.MdRender && typeof window.MdRender.render === "function") {
  noteRenderedEl.innerHTML = window.MdRender.render(textarea.value);  // escape-first, XSS-safe
} else {
  noteRenderedEl.textContent = textarea.value;                        // fallback: never raw innerHTML
}
```
Recommended lifecycle (Pattern 1 / Pitfall 5): render on read-mode entry, tear down on
edit-mode entry (mirror `clearReadModeTextareas` L274); textarea stays the single source of
truth; don't run `autoGrow`/`resizeReadModeTextareas` (L267–272) on a hidden textarea. Apply
to the 7 note fields; compact spotlight quote (~L1606) uses the strip helper via `textContent`.

---

### `assets/export-modal.js` (component) — verify/lock `buildSessionMarkdown` (D-10)

**Analog:** self. No transformation to build — a pass-through property to protect with tests.

**Verbatim embed pattern (already correct)** (lines 209–214):
```javascript
const trappedValue = (trappedEl ? trappedEl.value : "").trim();
const limitingBeliefsValue = (limitingBeliefsEl ? limitingBeliefsEl.value : "").trim();
const additionalTechValue = (additionalTechEl ? additionalTechEl.value : "").trim();
const insightsValue = (insightsInput ? insightsInput.value : "").trim();
```
These trimmed values embed byte-for-byte into the `#`/`##` document skeleton. Add a
falsifiable test asserting a note with `**bold**`, `1.`/`-` lists, and `#` headings survives
verbatim into the note-body region of the output. Preview (`exportUpdatePreview` L533–543) is
already wired — no change.

---

### `assets/sessions.js` + `assets/overview.js` (components) — compact strip (D-06)

**Analog:** self — both already use `textContent`; just route through the new strip helper.

`sessions.js:262`:
```javascript
trappedCell.textContent = session.trappedEmotions || "-";   // → MdRender.strip(...) then textContent
```
`overview.js:848`:
```javascript
commentsLine.textContent = `${App.t("session.form.comments")}: ${commentsText}`;  // → strip commentsText
```
New shared helper (e.g. `MdRender.strip(md)`) strips inline (`**`,`*`) AND block markers
(`#`,`-`,`1.`) and must agree with the D-08 hardened inline rules. Output stays via
`textContent` — the render-hardening locks remain intact (these are NOT the innerHTML
exception).

---

### `assets/app.css` (config) — `.note-rendered` heading register

**Analog:** `.export-preview` rendered-markdown block (lines 3555–3579):
```css
.export-preview h1 { font-size: 1.4rem; font-weight: 600; line-height: 1.25; margin-block-end: 8px; }
.export-preview h2 { font-size: 1rem;   font-weight: 600; border-block-end: 1px solid var(--color-border); margin-block: 16px 8px; padding-block-end: 4px; }
.export-preview h3 { font-size: 0.875rem; font-weight: 600; margin-block: 16px 4px; }
.export-preview ul { padding-inline-start: 24px; }   /* ← logical prop: RTL-safe */
```
Copy these logical-property conventions for `.note-rendered` (per UI-SPEC §B). Nested-list
indent uses `padding-inline-start` (logical, screen-safe) — the physical-direction care is a
PDF-only concern (Pitfall 4).

---

### `assets/backup.js` (service) — no source change, add round-trip test

**Analog:** self. Session objects serialize wholesale via `JSON.stringify`/`parse`
(backup.js:626 / 987 / 1066); note fields are opaque strings, never individually
transformed. `ALLOWED_SECTION_KEYS` (L1146) governs therapistSettings, NOT note content — out
of the note path. Add ONLY the canonical RTXT-10 test: encrypt a session with
bold+ordered/bulleted/nested+`#` heading to `.sgbackup`, decrypt-restore into a fresh
portfolio, assert note strings are byte-identical. Real restore on a real device is the
milestone lock (jsdom cannot certify it).

---

### `tests/45-*.test.js` (new, ×8) — copy the render-hardening + behavior-test shape

**Analog:** `tests/31-overview-render-hardening.test.js` (and `31-sessions-render-hardening`).

**Pattern to copy** (from the 31-file header, lines 5–37): write the test GREEN against the
UNCHANGED source first (characterization baseline), assert the OBSERVABLE rendered DOM (not
"was called"), load the real page into jsdom, eval the real asset into that window, inject a
key-returning `App.t` stub, call the render function directly (no async DOMContentLoaded →
no vacuous-green trap), and end with a count guard proving every case ran. Read-only: evals
into an isolated jsdom window, writes no `assets/*`.

**Extend (never weaken)** `tests/31-overview-render-hardening.test.js` and
`tests/31-sessions-render-hardening.test.js` to cover the new read-mode `innerHTML`
exception — the exception is narrow and test-locked, the `textContent`-only convention
elsewhere stays.

**PDF tests: guard against false-GREEN** (memory `reference-pdf-jsdom-inert-gates`,
`reference-python-server-breaks-sw-offline-tests`): author `tests/45-pdf-note-headings.test.js`
as a falsifiable jsPDF `doc.text`/font-size spy with a RED baseline; confirm it genuinely
fails on pre-fix code before implementing. Real opened PDF (Hebrew) is mandatory closing work.

## Shared Patterns

### Escape-first HTML (the ONLY sanctioned innerHTML path)
**Source:** `assets/md-render.js:8–23` (escapeHtml → applyInline)
**Apply to:** read-mode overlay (add-session.js), export preview (already), any note→innerHTML.
Never introduce a second escaper; always fall back to `textContent`, never raw `innerHTML`.

### Inline-rule agreement across both renderers (D-08)
**Source:** `md-render.js` `applyInline` (L20–21) ↔ `pdf-export.js` `stripInlineMarkdown`
(L434–435) + `parseInlineBold`.
**Apply to:** both pipelines, identically. Preserve the PDF invariant
`parseInlineBold(x).map(s=>s.text).join('') === stripInlineMarkdown(x)`.

### Note-body vs document-structure block distinction (D-03)
**Source:** new tag on `parseMarkdown` blocks (L586–635); consumed by the section-count guard
(L1313–1319) and heading render (L1326–1343).
**Apply to:** the whole PDF note-rendering path so note headings stay subordinate and never
increment `sectionHeadingsSeen`.

### RTL / logical-vs-physical direction
**Source:** `.export-preview` logical props (app.css L3564–3578, `margin-block`/
`padding-inline-start`) for screen; `docDir`-keyed physical prefix anchoring (~pdf-export.js
L1484) for PDF.
**Apply to:** screen note CSS = logical props; PDF nesting indent = physical offset by docDir.

### `textContent`-only compact surfaces
**Source:** `sessions.js:262`, `overview.js:848`.
**Apply to:** all three compact spots via the shared strip helper — keeps render-hardening
locks intact.

## No Analog Found

None. Every production file is an extension of shipped, battle-tested code; every new test
mirrors the existing `tests/31-*-render-hardening` / behavior-test shape. There is no
greenfield module and no external dependency in this phase.

## Metadata

**Analog search scope:** `assets/` (md-render, pdf-export, add-session, export-modal,
sessions, overview, app.css, backup), `tests/31-*`.
**Files scanned:** 8 source + 1 test analog (targeted reads at the CONTEXT/RESEARCH-cited line
ranges; no whole-file loads of pdf-export.js).
**Pattern extraction date:** 2026-07-13
</content>
</invoke>
