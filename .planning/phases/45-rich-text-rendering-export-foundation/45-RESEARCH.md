# Phase 45: Rich-Text Rendering & Export Foundation - Research

**Researched:** 2026-07-13
**Domain:** Markdown rendering foundation across three read surfaces (read mode, PDF export, markdown copy/share) in a zero-npm vanilla-JS PWA
**Confidence:** HIGH (entirely codebase-internal; every claim verified against live source)

## Summary

This phase extends **two existing, shipped renderers** — `window.MdRender` (`assets/md-render.js`, escape-first HTML) and the `pdf-export.js` `parseMarkdown`/`parseInlineBold` pipeline (Phase 23 Hebrew-bidi print engine) — so that markdown-at-rest session notes render correctly in read mode, the export-modal preview, the PDF, and copy/share. It builds **no new library, no new dependency, and no new storage format**. The work is: (1) add ordered-list and nested-list support to both renderers, (2) harden inline `*`/`**` rules (CommonMark hug-non-whitespace) identically in both, (3) render note-content headings at a subordinate register that does **not** collide with the PDF's document-section chrome or its section-counting page-break logic, (4) stand up a **new rendered-HTML surface in read mode** (currently read mode only sets `readOnly` on textareas — raw `**` shows literally), and (5) add a shared markdown→plain-text strip helper for three compact surfaces. Legacy safety and backup round-trip are **pass-through properties to protect with tests**, not transformations to build.

The single hardest architectural problem is **D-03**: today, note field values are concatenated into the *same* markdown string that `buildSessionMarkdown()` uses to build the document skeleton (`#`/`##` section headings), then parsed as one flat block stream by `parseMarkdown`. A user-typed `## foo` inside a note is currently **indistinguishable** from a document-structure `## Section` heading — so it would (a) render with the branded leaf-diamond+green-rule chrome (violating D-02 subordination) and (b) be counted by the severity-block page-break logic at `pdf-export.js:1313` (`block.type === 'heading' && block.level >= 2`), corrupting section placement. The pipeline must learn to tag note-body blocks as a **distinct block category** before rendering.

**Primary recommendation:** Extend `MdRender` and `pdf-export.js`'s `parseMarkdown`/`parseInlineBold`/`stripInlineMarkdown` in place — never fork or replace them. Introduce a note-body block category (planner's mechanism per D-03) so document-structure headings and note-content headings are parsed and rendered distinctly. Build the read-mode rendered view as a `.note-rendered` overlay routed exclusively through `MdRender` (the app's only sanctioned `innerHTML` exception). Verify PDF + RTL nesting on a **real opened PDF** and a **real device** — this repo has a documented history of false-GREEN jsdom PDF tests.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (SCOPE ADDITION):** Headings are part of note formatting vocabulary. Hand-typed or toolbar-produced `#`/`##`/`###` lines in note fields must RENDER as headings in read mode, the export-modal preview, and the PDF. (REQUIREMENTS.md RTXT-01 was edited this session to add the heading control; the control ships Phase 46, but the *rendering* ships here.)
- **D-02:** In the PDF, note-content headings render at a visually **SUBORDINATE** register to the branded document section headings (leaf-diamond + green rule, 14pt, Phase 34 D-06 chrome). A note heading must never be mistakable for a document section. Exact sizes/styling: planner + UI-spec discretion (already resolved in 45-UI-SPEC.md §C: 12/11/10.5pt bold, no chrome).
- **D-03:** The PDF's section-counting page-break logic (`pdf-export.js` counts `heading` blocks with `level >= 2`, verified at line 1313) must not be confused by note-content headings. Note headings and document-structure headings must be distinguishable in the parse/render pipeline. Mechanism is planner's choice (e.g. rendering note bodies as a distinct block category).
- **D-04:** Numbered (ordered) lists must render everywhere. MdRender currently supports only `-`/`*` bullets; ordered-list support (`1.` etc.) is new Phase 45 work in MdRender. (NOTE: the *PDF* already parses and renders ordered lists — see State of the Art below — so the PDF ordered-list work is nesting + heading-collision, not first-time ordinals.)
- **D-05:** Nested lists land in Phase 45, not 46. The rendering foundation (MdRender + PDF, bullet and numbered, nested) is built and verified ONCE on real PDF/RTL here; Phase 46 only wires the indent/outdent editing UI on top.
- **D-06:** The three compact preview spots strip markers to plain text (`**bold**` displays as `bold`). No styled rendering. A shared "markdown → plain text" strip helper is the implied need.
- **D-07:** One uniform render path — ALL sessions (pre- and post-v1.4) render through MdRender. No per-session format flag, no new field.
- **D-08:** Inline emphasis rules get CommonMark-style hardening: `*`/`**` markers must hug non-whitespace text (no space-adjacent matches), so legacy accidental asterisks (e.g. `2 * 3 * 4`) stay literal. Applies in MdRender AND the PDF's `parseInlineBold`/strip helpers — the two pipelines must agree.
- **D-09:** Accepted meaning-preserving upgrade: legacy `- item` lines render as real bullets. Explicitly NOT a violation of "unchanged in meaning."
- **D-10:** Stored note markdown flows verbatim into `buildSessionMarkdown()` output — copy/share reproduces stored formatting byte-for-byte within note bodies. A pass-through property to protect with tests, not a transformation to build.

**Milestone-level locks (2026-07-11, NOT re-askable):** markdown-at-rest storage (fields stay plain strings, zero migration); toolbar-over-textarea editor in Phase 46; underline dropped; italic renders regular-weight in the PDF (accepted limitation — no Hebrew italic face vendored); verification on real opened PDFs and real devices, never jsdom-only.

### Claude's Discretion

- Read-mode rendering mechanism (how the read-only textareas are replaced/overlaid with rendered HTML in `setReadMode`).
- CSS for rendered notes within the garden design system (constrained by 45-UI-SPEC.md).
- MdRender API shape (e.g. options/modes).
- How the PDF distinguishes note-body blocks from document-structure blocks (the D-03 mechanism).
- Exact PDF register (font size/weight/spacing) for note headings H1–H3, within the D-02 subordination constraint (45-UI-SPEC.md §C recommends 12/11/10.5pt bold, chrome-free).
- Whether rich-text read-mode rendering gets a guided-tour step.

### Deferred Ideas (OUT OF SCOPE)

- **Text color in session notes** — out per 2026-07-11 scoping (no markdown syntax; private token breaks copy/share compat; PDF color pipeline). Same bucket as underline (RTXT-U1).
- Resizeable export-modal Step-2 editor (todo `2026-07-06`) — targeted at Phase 46.
- Drag-sort settings categories — owned by Phase 47.
- Modality templates — out of scope for v1.4.
- Underline (RTXT-U1), true PDF italic (RTXT-F2), font sizes / colors / tables / images in notes.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RTXT-06 | User sees formatted notes when READING sessions (read mode + wherever note text is displayed), rendered escape-first via MdRender — never raw innerHTML | New `.note-rendered` overlay in `setReadMode` (add-session.js:306) routed through `MdRender.render`; compact surfaces use the D-06 strip helper via `textContent`. See Architecture Patterns §1, §4. |
| RTXT-07 | Formatting survives PDF export — bold, lists (incl. nesting), Hebrew RTL/bidi preserved; heading-strip removed or consciously kept | Extend `parseMarkdown` for nesting + note-heading block category; reuse `parseInlineBold` bidi segment pipeline; note-heading render at subordinate register (UI-SPEC §C). See Architecture Patterns §2, §3 and Pitfalls 1–4. |
| RTXT-08 | Formatting survives markdown copy/share export verbatim | `buildSessionMarkdown()` already embeds trimmed note values verbatim — pass-through property; protect with a byte-for-byte round-trip test. See Architecture Patterns §5. |
| RTXT-10 | Existing (pre-v1.4) sessions render safely and unchanged in meaning; encrypted backup round-trip carries formatted notes with zero format changes | Uniform MdRender path (D-07) + hardened inline rules (D-08) keep legacy asterisks literal; backup serializes session objects wholesale via `JSON.stringify`/`parse` — note fields are opaque strings, never transformed. See Legacy & Round-Trip Safety. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Read-mode note rendering | Browser / Client (DOM) | — | `MdRender.render` → `innerHTML` on a `.note-rendered` overlay inside `setReadMode`; pure client-side, no server |
| Export-modal live preview | Browser / Client (DOM) | — | Already wired (`export-modal.js:537`) via `MdRender`; document-skeleton context |
| PDF rendering | Browser / Client (jsPDF, vendored) | — | `pdf-export.js` runs entirely in-browser; jsPDF + bidi.min.js vendored, no network |
| Markdown copy/share | Browser / Client (Clipboard/WebShare) | — | `buildSessionMarkdown()` builds string, existing copy/share paths emit it verbatim |
| Compact-surface strip | Browser / Client (DOM) | — | Shared strip helper → `textContent` in table cells / one-liners |
| Note storage | Database / Storage (IndexedDB) | Backup (`.sgbackup`) | Markdown-at-rest: plain strings, zero migration; backup round-trips objects wholesale |

**Tier-correctness note:** every capability lives in the Browser/Client tier. There is no backend, no SSR, no API — this is a local-first PWA. The only "storage" concern is that note fields are opaque plain strings at rest (IndexedDB) and in backup (JSON), which is exactly why the milestone chose markdown-at-rest (zero migration).

## Standard Stack

**No new libraries. No new dependencies. Zero npm additions.** This is a milestone constraint (REQUIREMENTS.md Out of Scope; 45-UI-SPEC.md Registry Safety). The phase extends code that already ships.

### Core (existing, extended in place)

| Module | Location | Purpose | Why Standard |
|--------|----------|---------|--------------|
| `window.MdRender` | `assets/md-render.js` (75 lines) | Escape-first markdown→HTML: `#`–`###`, `**bold**`, `*italic*`, `-`/`*` bullets, blank-line paragraphs, single-newline `<br>` | [VERIFIED: codebase] Already named in the phase success criteria; proven in the export-modal preview since Phase 22 |
| `pdf-export.js` parse/render | `assets/pdf-export.js` (`parseMarkdown` L575, `parseInlineBold` L478, `stripInlineMarkdown` L423) | Print-side markdown → jsPDF blocks with Hebrew bidi (Phase 23) | [VERIFIED: codebase] Already renders headings, bold, ordered + unordered lists with UAX#9 bidi |
| jsPDF | vendored (`assets/` static script) | PDF generation | [VERIFIED: codebase] Already the PDF engine since Phase 22/23; no version change |
| bidi.min.js | `assets/bidi.min.js` | UAX#9 bidi reordering for Hebrew/RTL | [VERIFIED: codebase] Drives `getReorderedIndices` in the PDF segment renderer |

### Supporting (existing patterns to reuse)

| Pattern | Location | When to Use |
|---------|----------|-------------|
| `autoGrow` textarea sizing | `add-session.js:66` | Read-mode textarea measurement — the rendered overlay must coexist with or replace this |
| `.export-preview` rendered-markdown CSS | `app.css:3555–3579` | Baseline styling for rendered notes; note-heading register keys off this (UI-SPEC §B) |
| Render-hardening test locks | `tests/31-overview-render-hardening.test.js`, `tests/31-sessions-render-hardening.test.js` | Extend (never weaken) when adding the `innerHTML` read-mode exception |
| Zero-npm test runner | `tests/run-all.js` (172 `.test.js` files, auto-discovery, exit-0/1) | Add new behavior tests here; no new runner |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending MdRender | A real markdown lib (marked, markdown-it) | REJECTED — violates zero-npm constraint, adds a sanitizer dependency + XSS surface, 10x the bytes; MdRender's escape-first design is the whole security model |
| `innerHTML` read-mode overlay | contenteditable / DOM-node construction | contenteditable is explicitly out of scope (WebKit bug class); DOM-node construction can't easily express nested `<ul><li><ul>` — `MdRender.render` → `innerHTML` is the sanctioned narrow exception |

**Installation:** None. `npm install` adds nothing this phase.

**Version verification:** N/A — no packages added or upgraded. jsPDF and bidi.min.js are pre-vendored and unchanged.

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.** No npm/PyPI/crates additions. All code extended (`md-render.js`, `pdf-export.js`, `add-session.js`, `export-modal.js`, `sessions.js`, `overview.js`) already ships in the repo. jsPDF and bidi.min.js are pre-existing vendored assets, unchanged. There is nothing to slopsquat.

## Architecture Patterns

### System Architecture Diagram

```
                         SESSION NOTE FIELDS (markdown-at-rest, plain strings)
                         trappedEmotions · heartShieldEmotions · insights ·
                         limitingBeliefs · additionalTech · customerSummary · comments
                                              │
        ┌─────────────────────┬───────────────┼───────────────────┬────────────────────┐
        │                     │               │                   │                    │
        ▼                     ▼               ▼                   ▼                    ▼
   READ MODE            EXPORT-MODAL      COMPACT SURFACES    PDF EXPORT          COPY / SHARE
  (add-session)         STEP-2 PREVIEW    (D-06 strip)        (pdf-export.js)     (markdown)
        │                     │               │                   │                    │
        │                     │               │                   │                    │
   NEW .note-rendered    exportUpdate      shared strip       buildSessionMarkdown()  buildSessionMarkdown()
   overlay in            Preview()         helper →           embeds note values      → verbatim string
   setReadMode()         (already wired)   textContent        verbatim into one       → Clipboard / WebShare
        │                     │               │               markdown document           │
        ▼                     ▼               ▼                   │                        ▼
  MdRender.render()     MdRender.render()  MdRender.strip()   parseMarkdown()          (no render — raw md)
  → innerHTML           → innerHTML        (new helper)       → blocks[]                   │
        │                     │                                  │  ┌── note-body block ──┐ │
        ▼                     ▼                                  │  │ (NEW category, D-03)│ │
   escapeHtml FIRST      escapeHtml FIRST                        ▼  └─────────────────────┘ │
   then md rules         then md rules              parseInlineBold + bidi segment render   │
   (XSS-safe)            (XSS-safe)                  → note headings SUBORDINATE (D-02)       │
                                                     → section-count skips note headings (D-03)
                                                                   │
                                                                   ▼
                                                            jsPDF (Hebrew RTL/bidi)
                                                                   │
   ─────────────────────────────────────────────────────────────────────────────────────────
   STORAGE: IndexedDB (plain strings) ←→ .sgbackup (AES-256-GCM, whole-object JSON, notes opaque)
```

Trace the primary use case: a saved note string enters from the top, fans out to five read surfaces. Read mode + preview render escape-first HTML; compact surfaces strip to plain text; PDF parses to blocks (with the new note-body category so headings stay subordinate and don't miscount page breaks); copy/share passes the markdown through verbatim. Storage keeps the string opaque end-to-end.

### Component Responsibilities

| File | Responsibility this phase | Change type |
|------|---------------------------|-------------|
| `assets/md-render.js` | Add ordered-list (`1.`) + nested-list support; harden inline `*`/`**` (D-08). Keep the LOCKED single-newline-`<br>` / blank-line-paragraph contract | Extend |
| `assets/pdf-export.js` | Add nested-list support + note-body block category (D-03); render note headings subordinate (D-02); harden `parseInlineBold`/`stripInlineMarkdown` (D-08) preserving the invariant | Extend |
| `assets/add-session.js` | New `.note-rendered` overlay in `setReadMode` (L306) via MdRender; coexist with `autoGrow`/`resizeReadModeTextareas`; keep edit-toggle/copy-all/export flow. Compact spotlight quote (~L1606) uses strip helper | Extend |
| `assets/export-modal.js` | `buildSessionMarkdown()` (L171) already embeds note values verbatim — protect with tests; preview (`exportUpdatePreview` L533) already wired | Verify/lock |
| `assets/sessions.js` | Trapped-emotions cell (L262) → strip helper via `textContent` | Extend |
| `assets/overview.js` | Comments line (L848) → strip helper via `textContent` | Extend |
| `assets/app.css` | `.note-rendered` note-heading register (UI-SPEC §B); RTL-safe logical props | Extend |
| `assets/backup.js` | No change — session objects round-trip wholesale; add a falsifiable round-trip test only | Test-only |

### Pattern 1: Read-mode rendered overlay (the primary new surface)

**What:** Today `setReadMode(true)` only sets `textarea.readOnly = true` (add-session.js:318) — a saved `**bold**` shows as literal `**bold**` in the read-only textarea. The new work swaps in a rendered HTML view.
**When to use:** In `setReadMode`, for each of the 7 note fields.
**Mechanism (Claude's discretion, recommended):** For each `.session-textarea` in read mode, render `MdRender.render(textarea.value)` into a sibling `.note-rendered` element, hide the textarea, show the rendered node. On toggle back to edit, reverse. This preserves the textarea as the single source of truth (edit still works, `autoGrow` still applies in edit mode) and confines rendered HTML to a narrow, clearly-labelled node.
```javascript
// Source: pattern extends assets/add-session.js setReadMode (L306) + export-modal.js:537
// escape-first: MdRender.render escapes HTML BEFORE applying markdown rules,
// so innerHTML here is the app's ONE sanctioned exception (route ONLY through MdRender).
if (window.MdRender && typeof window.MdRender.render === "function") {
  noteRenderedEl.innerHTML = window.MdRender.render(textarea.value); // XSS-safe
} else {
  noteRenderedEl.textContent = textarea.value; // fallback: literal, never raw innerHTML
}
```

### Pattern 2: Note-body block category in the PDF (D-03 — the core problem)

**What:** `buildSessionMarkdown()` concatenates note field values into the *same* markdown string it uses to build `#`/`##` document section headings. `parseMarkdown` then parses one flat block stream — a note's `## foo` is indistinguishable from a document `## Section`. This breaks D-02 (note heading gets branded chrome) and the severity page-break count at L1313.
**When to use:** Whenever note-body content is rendered into the PDF.
**Mechanism (Claude's discretion, recommended):** Tag blocks that originate from note bodies as a distinct category (e.g. `block.noteBody = true`, or a dedicated `type: 'note-heading'`). The section-count guard at L1313 must only count *document-structure* `level >= 2` headings, not note headings. The heading render branch (L1327) must route note headings to the subordinate chrome-free render (UI-SPEC §C: 12/11/10.5pt bold, no diamond/rule). The planner decides whether to (a) parse note bodies separately and merge tagged blocks, or (b) pass a "note-body region" marker through `buildSessionMarkdown` that `parseMarkdown` honors.

### Pattern 3: Nested lists (new in both renderers)

**What:** Both `MdRender` (list branch, md-render.js:46) and `pdf-export.js` `parseMarkdown` (L597, L634) currently produce **flat** lists — no indent-level tracking. `MdRender` requires *every* non-empty line to match a list marker (`lines.every(...)`), so an indented sub-item breaks the match entirely today.
**When to use:** Bullet AND numbered nesting, per D-05.
**Mechanism:** Track leading-whitespace depth per item; emit nested `<ul>`/`<ol>` in MdRender and an indent level on PDF list items (each level = +24px logical indent on screen, +physical indent in PDF per UI-SPEC Spacing). Preserve the existing typed-ordinal contract for ordered items (`{text, ordinal}`, pdf-export.js:625).

### Pattern 4: Shared markdown→plain-text strip helper (D-06)

**What:** Three compact surfaces (`sessions.js:262`, `overview.js:848`, `add-session.js` ~1606) must show `**bold**` as `bold`, `- item` as `item`, `# h` as `h` — plain text only, via `textContent`.
**When to use:** Table cells and one-liners where styled HTML risks layout breakage.
**Mechanism:** A single shared helper (e.g. `MdRender.strip(md)` or an app-level util). It must agree with the hardened inline rules (D-08). Note the PDF already has `stripInlineMarkdown` (pdf-export.js:423) for inline markers — the compact-surface helper additionally strips block markers (`#`, `-`, `1.`). Output always goes through `textContent`, keeping the render-hardening test locks intact.

### Pattern 5: Verbatim copy/share (D-10 — pass-through, not transform)

**What:** `buildSessionMarkdown()` (export-modal.js:171) already reads each note field's `.value.trim()` and embeds it verbatim into the markdown document. Copy/share already emits that string.
**When to use:** No new code — this is a property to *protect*, not build.
**Mechanism:** Add a falsifiable test asserting a note with `**bold**`, `1.`/`-` lists, and `#` headings survives byte-for-byte into `buildSessionMarkdown()` output within the note body region.

### Anti-Patterns to Avoid

- **Forking or replacing MdRender / parseMarkdown.** Two divergent renderers guarantee the on-screen preview and the PDF disagree — the exact bug class quick tasks q8m/iwr/c8x/cx5 fought. Extend in place; keep the two pipelines' formatting rules in lockstep (D-08).
- **Weakening the render-hardening test locks.** The read-mode `innerHTML` is a *narrow* exception routed only through MdRender. Extend the locks to cover the new surface; never relax the `textContent`-only convention elsewhere.
- **Changing the LOCKED `<br>`/paragraph contract** in md-render.js (header comment L25–28) while adding ordered/nested/hardened support.
- **jsdom-only PDF verification.** Documented false-GREEN history (memory `reference-pdf-jsdom-inert-gates`, `reference-python-server-breaks-sw-offline-tests`). Real opened PDF + real device is mandatory closing work.
- **Deriving list ordinals from position.** The typed-ordinal contract (`{text, ordinal}`) exists because paragraph-separated numbered items become single-item blocks (pdf-export.js:602–614). Preserve it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML escaping for note rendering | A custom sanitizer | `MdRender`'s existing `escapeHtml` (escape-FIRST design) | The whole security model; a second escaper drifts |
| Inline bold parsing for PDF | A new bold regex | Existing `parseInlineBold` (pdf-export.js:478) | Carries the bidi-segment invariant `drawSegmentedLine` relies on |
| Ordered-list ordinals in PDF | Position-derived numbering | Existing `{text, ordinal}` typed-ordinal contract | Already solved (quick tasks iwr/c8x); position-derived reintroduces the "three 1."s bug |
| RTL/bidi list & heading layout | New anchor math | Existing `firstStrongDir` + `getReorderedIndices` segment pipeline | UAX#9 bidi already correct for Hebrew (Phase 23 + cx5 regression fix) |
| Markdown preview in export modal | New preview renderer | Existing `exportUpdatePreview` (export-modal.js:533) | Already wired to MdRender with the safe-fallback pattern |
| Backup fidelity for notes | Any note-field serialization | Existing whole-object `JSON.stringify`/`parse` | Notes are opaque strings; touching them risks the zero-migration lock |

**Key insight:** Almost everything this phase needs is already shipped and battle-tested (bold, ordered lists, bidi, escape-first HTML, preview wiring). The genuinely *new* code is: nested lists (both renderers), the note-body block category (D-03), the read-mode overlay, and the strip helper. Everything else is reuse + test-locking.

## Legacy & Round-Trip Safety (RTXT-10)

> This phase is feature-additive (not a rename/refactor), but RTXT-10 has explicit stored-data and round-trip obligations. The relevant runtime-state audit:

| Category | Finding | Action Required |
|----------|---------|------------------|
| Stored note data (IndexedDB) | Note fields (`trappedEmotions`, `heartShieldEmotions`, `insights`, `limitingBeliefs`, `additionalTech`, `customerSummary`, `comments`) are plain strings; markdown-at-rest = zero migration | None — uniform MdRender path (D-07) renders old + new identically |
| Legacy accidental markup | Pre-v1.4 notes may contain incidental `*` (e.g. `2 * 3 * 4`) or `- ` line-openers | D-08 inline hardening keeps `2 * 3 * 4` literal; D-09 accepts `- item` → real bullet as meaning-preserving. Both must hold in MdRender AND PDF |
| Encrypted backup (`.sgbackup`) | Session objects serialized wholesale via `JSON.stringify(manifest)` (backup.js:626); restore via `JSON.parse` (backup.js:987/1066); note fields never individually transformed | None — verify with a REAL restore (not jsdom) that formatted notes round-trip byte-for-byte |
| Backup section-key allowlist | `ALLOWED_SECTION_KEYS` (backup.js:1146) governs *therapistSettings* section customization, NOT note content | None — note content lives in session objects, outside this allowlist |
| Build artifacts / OS state | None — pure in-browser JS, no compiled artifacts, no OS registration | None — verified by inspection |

**The canonical RTXT-10 test:** encrypt a session containing bold + ordered/bulleted/nested lists + a `#` heading to `.sgbackup`, decrypt-restore into a fresh portfolio, and assert the note strings are byte-identical. Verified with a real restore per the milestone lock.

## Common Pitfalls

### Pitfall 1: Note heading hijacks document-section chrome and page-break count
**What goes wrong:** A user types `## Progress` inside a note; the PDF renders it with the branded leaf-diamond+green-rule (looks like a document section) AND the severity block places itself wrong because L1313 counted it.
**Why it happens:** Note values are concatenated into the same flat markdown stream as the document skeleton; `parseMarkdown` can't tell them apart.
**How to avoid:** Implement the D-03 note-body block category before rendering; guard the L1313 count to document-structure headings only.
**Warning signs:** A note heading shows a green rule in the PDF; the "Severity — before & after" block lands after the wrong section.

### Pitfall 2: MdRender/PDF inline rules disagree after hardening
**What goes wrong:** Preview italicizes `2 * 3 * 4` but the PDF doesn't (or vice versa); or the PDF invariant `parseInlineBold(x).map(s=>s.text).join('') === stripInlineMarkdown(x)` breaks and `drawSegmentedLine` misaligns bold runs.
**Why it happens:** D-08 hardening applied to only one pipeline, or applied inconsistently to `parseInlineBold` vs `stripInlineMarkdown`.
**How to avoid:** Change the emphasis regex identically in `md-render.js` `applyInline`, `pdf-export.js` `stripInlineMarkdown` (L423), and `parseInlineBold` (L478). Add a test asserting the invariant still holds on hardened input.
**Warning signs:** Bold text shifts position mid-line in the PDF; preview and PDF emphasize different substrings.

### Pitfall 3: Nested lists break MdRender's `every()` list detection
**What goes wrong:** An indented sub-item makes `lines.every(isListItem)` false, so the whole block falls through to the paragraph branch and renders raw `- ` markers with `<br>`s.
**Why it happens:** md-render.js:47 requires *every* line to match a top-level list marker; indented lines don't.
**How to avoid:** Rework list detection to accept leading whitespace and recurse into nested `<ul>`/`<ol>`; keep flat-list output identical for non-nested input (regression-lock existing behavior).
**Warning signs:** A two-level list shows literal dashes in read mode / preview.

### Pitfall 4: RTL nesting indents the wrong direction in the PDF
**What goes wrong:** Nested Hebrew list items indent leftward (LTR logic) instead of rightward.
**Why it happens:** Using logical CSS thinking for the PDF, where `getBoundingClientRect`-style physical coordinates rule (memory `reference-rtl-logical-props-physical-coords`). The PDF already anchors list prefixes by `docDir` (pdf-export.js ~L1484).
**How to avoid:** Compute per-level indent as a physical offset keyed off `docDir` (mirror the existing prefix-anchor logic). Verify bullet AND numbered nesting in Hebrew on a real opened PDF.
**Warning signs:** Hebrew nested items march the wrong way; continuation lines misalign.

### Pitfall 5: Read-mode overlay desyncs from the textarea / breaks autogrow
**What goes wrong:** Editing after viewing shows stale rendered content, or the rendered node leaves a collapsed/empty textarea affecting layout, or `resizeReadModeTextareas` (add-session.js:267) fights the overlay.
**Why it happens:** Two sources of truth (textarea value vs rendered node) without a clean swap.
**How to avoid:** Keep the textarea as the single source of truth; render on entering read mode, tear down on entering edit mode (mirror `clearReadModeTextareas` at L274). Don't run `autoGrow` on a hidden textarea.
**Warning signs:** Edit shows old text; blank gaps where a note should be; jumpy heights on toggle.

### Pitfall 6: Docs hard-gate blocks the push
**What goes wrong:** Push rejected by `scripts/docs-gate.js` — this is user-facing (rendered notes, PDF output).
**Why it happens:** Changelog + affected help topics not updated (or not declared unaffected). `md-render.js` and `pdf-export.js` are watched `assets/*` files.
**How to avoid:** Per project CLAUDE.md "Definition of Done": add an EN changelog entry (`assets/changelog-content-en.js`) and update the owning help topic in EN (`assets/help-content-en.js`) — read `HELP-MAP.md` cold to find which topic owns note formatting — OR add a `Help-Unaffected:`/`Changelog-Unaffected:` trailer with a reason. Note `md-render.js`/`pdf-export.js` may fall in the changelog-only tier (check `scripts/lib/role-table.js` header) — but the *feature's own* help topic still needs the user-visible change documented.
**Warning signs:** Pre-push hook or CI fails with a docs-gate message.

## Code Examples

### Existing escape-first render (the security foundation — extend, don't replace)
```javascript
// Source: assets/md-render.js:8-23 (VERIFIED)
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function applyInline(text) {
  // text is ALREADY escaped — only ** and * (which survived escape) get re-mapped.
  var out = text.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
  return out;
}
// render() escapes the ENTIRE input first, THEN splits blocks and applies rules —
// output is safe to assign via innerHTML. D-08 hardening tightens these two regexes.
```

### The PDF bidi-segment invariant to preserve (D-08 must not break it)
```javascript
// Source: assets/pdf-export.js:448-453 (VERIFIED)
// INVARIANT (relied on by drawSegmentedLine):
//   parseInlineBold(input).map(s => s.text).join('') === stripInlineMarkdown(input)
// Concatenating all segment texts yields the strip-equivalent plain string
// byte-for-byte. Any inline-rule hardening must keep both sides in agreement.
```

### The section-count guard that must ignore note headings (D-03)
```javascript
// Source: assets/pdf-export.js:1311-1319 (VERIFIED)
if (block.type === 'heading' && block.level >= 2) {          // ← must count DOCUMENT headings only
  if (!severityDrawn && sectionHeadingsSeen === severityAfterSections) {
    drawSeverityBlock(severityIssues);
    severityDrawn = true;
  }
  sectionHeadingsSeen++;                                       // ← note headings must NOT increment this
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MdRender: bullets only (`-`/`*`) | Adds ordered (`1.`) + nested | Phase 45 (this) | New in MdRender only |
| PDF: no ordered lists | Ordered lists with typed ordinals + RTL | Quick tasks iwr/c8x/cx5 (2026-05/06) | **Already shipped** — PDF ordered-list work here is *nesting*, not first-time ordinals |
| PDF: flat lists | Nested lists (indent levels) | Phase 45 (this) | New in both renderers |
| Read mode: raw textareas | Rendered `.note-rendered` overlay | Phase 45 (this) | New primary surface |
| Headings: one register | Document-section vs subordinate note register | Phase 45 (this) | D-01/D-02/D-03 |

**Not deprecated, deliberately kept:**
- Italic renders regular-weight in the PDF (no Hebrew italic face vendored) — accepted limitation, RTXT-F2 deferred.
- Underline dropped entirely (RTXT-U1) — no markdown syntax.
- `<br>`/paragraph contract in md-render.js — LOCKED, do not touch.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The D-03 note-body distinction is best done by tagging blocks in the parse stream (vs. rendering note bodies in a fully separate pass) | Pattern 2 | LOW — both approaches satisfy D-03; planner picks. If tagging proves awkward, a separate note-body render pass is the fallback. Explicitly Claude's discretion per CONTEXT. |
| A2 | The read-mode overlay should render on read-mode entry and tear down on edit-mode entry (textarea stays source of truth) | Pattern 1, Pitfall 5 | LOW — this is the safest of the discretionary mechanisms; an alternative (persistent rendered node + hidden textarea) also works but risks desync. |

**All other claims are VERIFIED against live source.** No external/unverified package or API claims exist in this research (zero new dependencies).

## Open Questions (RESOLVED)

1. **Does note-formatting get its own help topic, or ride an existing one?**
   - What we know: The docs hard-gate requires an EN help-topic touch for user-facing changes; `HELP-MAP.md` is the topic index.
   - What's unclear: Whether "reading formatted notes / exporting formatted PDFs" is a new topic or an update to the existing session/export topic.
   - Recommendation: Read `HELP-MAP.md` cold at plan time; default to updating the existing session-notes/export topic rather than creating a new one (Phase 46 adds the editing UI — the topic likely grows then).
   - RESOLVED at plan time: plans update the existing session/export help topics (45-05 Task 2); no new topic created.

2. **Guided-tour step for read-mode rendering? (Claude's discretion, per REQUIREMENTS Process Notes)**
   - What we know: The decision is explicitly deferred to phase planning.
   - Recommendation: Skip a tour step this phase — rendering is invisible-by-design (notes just look right); the toolbar in Phase 46 is the teachable moment. Revisit at plan time.
   - RESOLVED at plan time: no tour step in Phase 45 (no tour task appears in any plan); Phase 46's toolbar is the teachable moment.

## Environment Availability

**SKIPPED — no external dependencies.** This phase is pure in-browser JS extending shipped code. The only tooling is the existing zero-npm `node`-based test runner (`tests/run-all.js`), already present and used every phase. No services, CLIs, databases, or runtimes are introduced. Real-device + real-PDF verification uses the Phase 44 pre-prod environment (`https://sg-prpr-98xxj34.pages.dev`), already live.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Zero-dependency hand-rolled runner (`tests/run-all.js`) — child-process per `tests/*.test.js`, exit-0/1 contract, jsdom for DOM, vendored jsPDF for PDF |
| Config file | none — auto-discovery of top-level `tests/*.test.js` |
| Quick run command | `node tests/<specific>.test.js` |
| Full suite command | `node tests/run-all.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RTXT-06 | Read-mode renders bold/lists/headings via MdRender, never raw `**` | unit (jsdom) | `node tests/45-read-mode-render.test.js` | ❌ Wave 0 |
| RTXT-06 | Compact surfaces strip to plain text via textContent | unit (jsdom) | `node tests/45-compact-strip.test.js` | ❌ Wave 0 |
| RTXT-06 | Escape-first: `<script>` in a note renders inert | unit | `node tests/45-mdrender-escape.test.js` | ❌ Wave 0 (extend md-render coverage) |
| RTXT-07 | MdRender ordered + nested lists render correct HTML | unit | `node tests/45-mdrender-lists.test.js` | ❌ Wave 0 |
| RTXT-07 | PDF nested list indents; note heading subordinate + doesn't increment section count | behavior (jsPDF spy) | `node tests/45-pdf-note-headings.test.js` | ❌ Wave 0 |
| RTXT-07 | PDF invariant `parseInlineBold==stripInlineMarkdown` holds after D-08 hardening | unit | `node tests/45-inline-hardening.test.js` | ❌ Wave 0 |
| RTXT-07 | **Real opened PDF** with Hebrew bold/lists/nesting/heading | manual-only | on-device / real PDF open (jsdom cannot see this) | manual |
| RTXT-08 | `buildSessionMarkdown()` embeds note markdown byte-for-byte | unit (jsdom) | `node tests/45-copy-share-verbatim.test.js` | ❌ Wave 0 |
| RTXT-10 | Legacy `2 * 3 * 4` stays literal in both renderers | unit | `node tests/45-inline-hardening.test.js` | ❌ Wave 0 |
| RTXT-10 | `.sgbackup` encrypt→restore preserves formatted note strings | integration (jsdom+crypto) | `node tests/45-backup-roundtrip.test.js` | ❌ Wave 0 |
| RTXT-10 | **Real restore** on a real device carries formatting | manual-only | on-device restore (milestone lock) | manual |

### Sampling Rate
- **Per task commit:** `node tests/<touched>.test.js` (the specific new/affected file)
- **Per wave merge:** `node tests/run-all.js` (full 172+ file suite)
- **Phase gate:** Full suite green + real-opened-PDF (Hebrew) + real-device `.sgbackup` restore before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/45-read-mode-render.test.js` — RTXT-06 read-mode overlay
- [ ] `tests/45-compact-strip.test.js` — RTXT-06 D-06 strip helper
- [ ] `tests/45-mdrender-escape.test.js` — RTXT-06 escape-first XSS
- [ ] `tests/45-mdrender-lists.test.js` — RTXT-07 ordered + nested in MdRender
- [ ] `tests/45-pdf-note-headings.test.js` — RTXT-07 D-02/D-03 (falsifiable jsPDF spy; guard against the false-GREEN trap)
- [ ] `tests/45-inline-hardening.test.js` — D-08 both pipelines + invariant + legacy literal
- [ ] `tests/45-copy-share-verbatim.test.js` — RTXT-08 pass-through
- [ ] `tests/45-backup-roundtrip.test.js` — RTXT-10 falsifiable encrypt/restore
- [ ] Extend `tests/31-*-render-hardening.test.js` locks to cover the new read-mode `innerHTML` exception (consciously extend, never weaken)

**Note on false-GREEN risk:** PDF/jsdom tests in this repo have silently passed while inert (memory `reference-pdf-jsdom-inert-gates`). Author PDF gates as falsifiable behavior tests (e.g. `doc.text`/font-size spies with a RED baseline) and confirm they genuinely fail on the pre-fix code before implementing.

## Security Domain

`security_enforcement` is enabled (config default). This phase's security surface is **output encoding / XSS** — it deliberately introduces the app's only `innerHTML` write path for user content.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local-first app, no auth in scope |
| V3 Session Management | no | No server sessions |
| V4 Access Control | no | Single-user local device |
| V5 Validation, Sanitization & Encoding | **yes** | MdRender's escape-FIRST design: `escapeHtml` runs on the entire input before any markdown rule; the read-mode overlay writes `innerHTML` ONLY from `MdRender.render()` output. Compact surfaces use `textContent`. No third-party sanitizer. |
| V6 Cryptography | indirect | Backup uses AES-256-GCM (PBKDF2) — unchanged this phase; note content is opaque plaintext inside the encrypted envelope |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via note content rendered to `innerHTML` | Tampering / Elevation | Escape-first MdRender (escape BEFORE markdown rules); route ALL note `innerHTML` through MdRender only; fallback to `textContent` when MdRender absent (never raw `innerHTML`) |
| Markdown-injection breaking out of the note-body region into document chrome | Tampering | D-03 note-body block category isolates note headings from document-structure headings; note content can't forge a document section |
| Regression that weakens the `textContent`-only hardening elsewhere | Tampering | Extend (never weaken) `tests/31-*-render-hardening.test.js`; the read-mode `innerHTML` is a single, test-locked, narrowly-scoped exception |
| CSP interaction | — | App CSP allows `unsafe-inline` for scripts (existing, documented); MdRender adds inline *content* not inline *scripts* — escape-first neutralizes `<script>`/event-handler injection regardless |

## Sources

### Primary (HIGH confidence — verified against live source this session)
- `assets/md-render.js` (full read) — MdRender API, escape-first design, LOCKED `<br>` contract, current inline regexes
- `assets/pdf-export.js` (L400–663, L1280–1440 read) — `parseMarkdown`, `parseInlineBold`, `stripInlineMarkdown`, the invariant, section-count guard (L1313), heading render (L1327), list render, ordered-ordinal contract
- `assets/add-session.js` (L306–338, L66–275, L1600–1612 read) — `setReadMode`, `autoGrow`, read-mode textarea helpers, spotlight quote
- `assets/export-modal.js` (L165–244, L525–543 read) — `buildSessionMarkdown`, `exportUpdatePreview` MdRender wiring + fallback
- `assets/app.css` (L3536–3585 read) — `.export-preview` rendered-markdown baseline
- `assets/backup.js` (L1140–1170, grep) — whole-object JSON serialization, section-key allowlist scope
- `assets/sessions.js:262`, `assets/overview.js:848` — compact-surface `textContent` sites
- `.planning/phases/45-.../45-CONTEXT.md`, `45-UI-SPEC.md` (approved), `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, project `CLAUDE.md`
- Quick-task history (STATE.md): iwr/c8x/cx5/q8m/bg4 — the PDF list/bidi lineage
- Project memory: `reference-pdf-jsdom-inert-gates`, `reference-rtl-logical-props-physical-coords`, `feedback-behavior-verification`, `reference-python-server-breaks-sw-offline-tests`

### Secondary / Tertiary
- None — no external/web sources needed; zero new dependencies.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; all modules read directly
- Architecture: HIGH — D-03 problem + all integration points traced in live source; the two discretionary mechanisms (A1, A2) are explicitly Claude's-discretion per CONTEXT
- Pitfalls: HIGH — each grounded in a specific line number and/or a documented prior incident in project memory
- Security: HIGH — escape-first model verified in md-render.js source

**Research date:** 2026-07-13
**Valid until:** 2026-08-13 (stable — internal codebase, no fast-moving external deps)
