# Phase 45: Rich-Text Rendering & Export Foundation - Context

**Gathered:** 2026-07-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Markdown-formatted session notes display correctly everywhere they are **read** — read mode (the add-session form's read-only view), PDF export, and markdown copy/share — before any editing UI exists (the toolbar editor is Phase 46). Covers RTXT-06, RTXT-07, RTXT-08, RTXT-10: escape-first MdRender rendering (never raw innerHTML), PDF preservation of bold + lists (incl. nesting) + headings with Hebrew RTL/bidi intact, verbatim markdown copy/share, pre-v1.4 plain-text safety, and encrypted `.sgbackup` round-trip fidelity.

**Milestone-level locks (2026-07-11, NOT re-askable):** markdown-at-rest storage (fields stay plain strings, zero migration); toolbar-over-textarea editor in Phase 46; underline dropped; italic renders regular-weight in the PDF (accepted limitation — no Hebrew italic face vendored); verification on real opened PDFs and real devices, never jsdom-only.

</domain>

<decisions>
## Implementation Decisions

### Headings in notes (SCOPE ADDITION — Ben, this discussion)
- **D-01:** Headings are part of the note formatting vocabulary. Ben reversed the earlier toolbar limitation: the **Phase 46 toolbar gains a heading control offering H1/H2/H3 plus a "regular text" state** (a paragraph-style selector). Consequence for Phase 45: hand-typed or toolbar-produced `#`/`##`/`###` lines in note fields must RENDER as headings — in read mode, the export-modal preview, and the PDF. **REQUIREMENTS.md RTXT-01 was edited this session** to include the heading control.
- **D-02:** In the **PDF, note-content headings render at a visually SUBORDINATE register** to the branded document section headings (leaf-diamond + green rule, 14pt, `pdf-export.js` Phase 34 D-06 chrome). A note heading must never be mistakable for a document section. Exact sizes/styling: planner + UI-spec discretion.
- **D-03:** The PDF's **section-counting page-break logic** (`pdf-export.js` ~1286–1313 counts `heading` blocks with `level >= 2`) must not be confused by note-content headings — note headings and document-structure headings need to be distinguishable in the parse/render pipeline (mechanism is planner's choice; e.g. rendering note bodies as a distinct block category).

### Lists
- **D-04:** **Numbered (ordered) lists** must render everywhere — MdRender currently supports only `-`/`*` bullets; ordered-list support (`1.` etc.) is new Phase 45 work in both MdRender and the PDF pipeline.
- **D-05:** **Nested lists land in Phase 45**, not 46 (Ben resolved the RTXT-07 "incl. nesting" vs RTXT-05→Phase-46 mapping ambiguity). The rendering foundation (MdRender + PDF, bullet and numbered, nested) is built and verified ONCE on real PDF/RTL here; Phase 46 only wires the indent/outdent editing UI on top of the proven pipeline.

### Compact display surfaces
- **D-06:** The three compact preview spots — sessions-table "Trapped Emotions" cell (`sessions.js:262`), overview client-detail comments line (`overview.js:848`), and add-session client-spotlight customerSummary quote (`add-session.js` ~1606) — **strip markers to plain text** (`**bold**` displays as `bold`). No styled rendering, no layout risk in table rows/one-liners. Full rendering lives in read mode, preview, and PDF only. (A shared "markdown → plain text" strip helper is the implied need.)

### Legacy note safety (RTXT-10 semantics)
- **D-07:** **One uniform render path** — ALL sessions (pre- and post-v1.4) render through MdRender. No per-session format flag, no new field: honors the zero-migration lock.
- **D-08:** The **inline emphasis rules get CommonMark-style hardening**: `*`/`**` markers must hug non-whitespace text (no space-adjacent matches), so legacy accidental asterisks (e.g. `2 * 3 * 4`) stay literal instead of silently italicizing. This hardening applies in MdRender AND the PDF's `parseInlineBold`/strip helpers — the two pipelines must agree on what counts as formatting.
- **D-09:** Accepted meaning-preserving upgrade: legacy hand-typed `- item` lines render as real bullets (same meaning, nicer display). This is explicitly NOT a violation of "unchanged in meaning".

### Markdown copy/share (RTXT-08)
- **D-10:** Stored note markdown flows **verbatim** into `buildSessionMarkdown()` output — copy/share reproduces stored formatting byte-for-byte within note bodies. (Notes are markdown-at-rest, so this is a pass-through property to protect with tests, not a transformation to build.)

### Claude's Discretion
- Read-mode rendering mechanism (how the read-only textareas are replaced/overlaid with rendered HTML in `setReadMode`), CSS for rendered notes within the garden design system, MdRender API shape (e.g. options/modes), and how the PDF distinguishes note-body blocks from document-structure blocks — planner/executor decide.
- Exact PDF register (font size/weight/spacing) for note headings H1–H3 — planner + UI-spec, within the D-02 subordination constraint.
- Whether rich-text read-mode rendering gets a guided-tour step — per REQUIREMENTS Process Notes, decided at phase planning.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` — RTXT requirement set + the 2026-07-11 milestone locks (markdown-at-rest, no underline, italic regular-weight, out-of-scope table). **RTXT-01 edited this session** (heading control added).
- `.planning/ROADMAP.md` — Phase 45 goal + 4 success criteria (escape-first read rendering, real-PDF verification, verbatim copy/share, legacy + backup round-trip).

### Rendering & export pipelines (the code this phase extends)
- `assets/md-render.js` — existing escape-first renderer (window.MdRender): bold, italic, `-`/`*` bullets, `#`–`###` headings, paragraphs/`<br>`. Missing: ordered lists, nesting, hardened inline rules. Header comment locks the single-newline `<br>` paragraph contract — do not change it.
- `assets/pdf-export.js` — Phase 23 print pipeline: `parseMarkdown` (heading/list/para blocks, ~line 408), `parseInlineBold` (bold segments + bidi-safe invariant, ~line 478), `stripInlineMarkdown` (~line 423), section-heading chrome + section-counting page-break logic (~lines 826–1340). The invariant `parseInlineBold(x).map(s=>s.text).join('') === stripInlineMarkdown(x)` is relied on by `drawSegmentedLine` — preserve it through any rule hardening.
- `assets/export-modal.js` — `buildSessionMarkdown()` (~line 171, generates the `#`/`##` document skeleton notes embed into), Step-2 editor, MdRender preview wiring (~line 537).
- `.planning/milestones/v1.1-phases/23-pdf-hebrew-rtl-rewrite/` — Phase 23 research/plans for the Hebrew bidi PDF pipeline (referenced by pdf-export.js comments as "23-RESEARCH.md — Worked example"); read before touching RTL segment rendering.

### Display surfaces (RTXT-06 "wherever note text is displayed")
- `assets/add-session.js` — read mode (`setReadMode` ~line 306: read-only textareas + autogrow) is the PRIMARY new rendering surface; session note fields saved at `saveSessionForm()` ~line 1127: `trappedEmotions`, `heartShieldEmotions`, `insights`, `limitingBeliefs`, `additionalTech`, `customerSummary`, `comments`; spotlight customerSummary quote ~line 1606.
- `assets/sessions.js:262` — trappedEmotions table cell (compact surface, D-06).
- `assets/overview.js:848` — comments line in client session list (compact surface, D-06).

### Round-trip safety (RTXT-10)
- `assets/backup.js` — encrypted `.sgbackup` export/import; formatted notes must round-trip with zero format changes, verified with a real restore.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `window.MdRender` (assets/md-render.js, 75 lines) — the escape-first renderer named in the success criteria already exists and is proven in the export-modal preview; Phase 45 extends it (ordered lists, nesting, hardened inline rules) rather than building new.
- PDF `parseInlineBold` + bidi segment renderer (Phase 23) — bold-in-Hebrew-RTL is already solved for paragraphs/lists; new block types should reuse the segment pipeline.
- Zero-npm test runner (`tests/run-all.js`) + jsdom-pdf-env helper — but note the repo's history of false-GREEN jsdom PDF tests; real-PDF verification is mandatory closing work.

### Established Patterns
- textContent-only rendering of user text is a hardened, test-locked convention (e.g. `tests/31-overview-render-hardening.test.js`, comments in sessions.js/overview.js). Read-mode rendered HTML is a DELIBERATE, narrow exception routed exclusively through MdRender's escape-first path — expect to update/extend the render-hardening test locks consciously, not weaken them.
- Read mode = same form, `readOnly` textareas + autoGrow (`setReadMode`). Raw markdown would show as literal `**` tokens today; the rendering replacement must preserve the edit-toggle flow, copy-all and export buttons.
- i18n/RTL: rendered-note CSS must be RTL-safe (logical properties per repo convention); PDF list/heading indentation in Hebrew needs physical-direction care (see memory: RTL logical-props pitfalls).

### Integration Points
- Read mode toggle in add-session.js (`setReadMode`) — where rendered view swaps in/out.
- `buildSessionMarkdown()` — where stored note markdown embeds into the export document (headings collision handled per D-03).
- Docs hard-gate: this is user-facing — changelog entry + help-topic updates (or explicit Help-Unaffected) required at push time per `scripts/docs-gate.js`.

</code_context>

<specifics>
## Specific Ideas

- Ben's toolbar mental model (for Phase 46, decided here): heading control = "H1–H3 and switch to regular text" — a paragraph-style selector, not a single toggle.
- "Keep scope otherwise as is" — Ben explicitly re-confirmed the v1.4 out-of-scope table (color, font sizes, tables, images stay out) after asking about color.

</specifics>

<deferred>
## Deferred Ideas

- **Text color in session notes** — asked by Ben this discussion; stays out per the 2026-07-11 scoping (no markdown syntax → private token would break copy/share compat; PDF color pipeline). Revisit if users ask, same bucket as underline (RTXT-U1).

### Reviewed Todos (not folded)
- `2026-07-06-resizeable-export-modal.md` (make export modal Step-2 editor resizeable/roomier) — reviewed; **targeted at Phase 46** (editing ergonomics belongs with the toolbar editor phase), not folded into 45.
- `2026-05-13-drag-sort-settings-categories.md` — already owned by Phase 47 (`resolves_phase: 47`); not for 45.
- `2026-05-13-modality-templates.md` — explicitly out of scope for v1.4 (REQUIREMENTS out-of-scope table).

</deferred>

---

*Phase: 45-rich-text-rendering-export-foundation*
*Context gathered: 2026-07-13*
