# Phase 46: Rich-Text Toolbar Editor - Context

**Gathered:** 2026-07-14
**Status:** Ready for planning

<domain>
## Phase Boundary

The EDITING layer on top of Phase 45's proven rendering pipeline: a formatting toolbar (bold, italic, bullet list, numbered list, heading selector H1–H3 + "regular text"), desktop keyboard shortcuts (Ctrl/Cmd+B/I), auto-format while typing ("- " / "1. " starts a list, Enter continues, Enter on empty item exits), a per-field live preview, and indent/outdent for nested lists — all over the existing textareas, with snippets quick-paste and autogrow unchanged (RTXT-01, 02, 03, 04, 05, 09). Folded into scope this session: a redesigned export-modal Step-2 editing surface (toolbar + real room to edit) and a feasibility-gated attempt at TRUE italic in the PDF (RTXT-F2 promoted — see D-13/D-14).

**Milestone locks (NOT re-askable):** toolbar-over-textarea — never contenteditable/WYSIWYG; markdown-at-rest (fields stay plain strings, zero migration); underline out; color/fonts/tables/images out; heading control = paragraph-style selector (H1/H2/H3 + regular, Phase 45 D-01); nested + ordered list RENDERING already built and device-verified in Phase 45 — this phase wires editing UI on top; real-browser/real-device verification mandatory, never jsdom-only. **Changed this session (2026-07-14, Ben):** the "italic flattens in PDF, accepted" lock was REOPENED as a feasibility-gated research goal — REQUIREMENTS.md amended (locks paragraph + RTXT-F2 entry).

</domain>

<decisions>
## Implementation Decisions

### Toolbar design & scope
- **D-01:** One **focus-attached toolbar** — a single instance docked above whichever of the 7 note fields (trappedEmotions, heartShieldEmotions, insights, limitingBeliefs, additionalTech, customerSummary, comments) has focus; hides when no note field is active. Rejected: per-field persistent toolbars (7× chrome), sticky form-level bar (buttons far from field).
- **D-02:** **Mobile = same docked toolbar** — compact icon row, horizontally scrollable on overflow. On touch the toolbar is the ONLY formatting affordance (no Ctrl/Cmd). Explicitly rejected: iOS keyboard-accessory bar (visualViewport-tracking bug surface in Safari PWAs).
- **D-03:** The **export-modal Step-2 editor gets the FULL toolbar** (headings included), plus an **info-styled note** (informational tone, e.g. blue/info background) stating: edits here affect ONLY this export, are never saved to the session, and are gone when the dialog closes. This invites free restructuring (even reordering content) for a dedicated export without risking stored data. The document-heading collision concern is accepted — whole-document edits in Step 2 are intentional.
- **D-04:** **Full toggle semantics** for bold/italic (buttons AND Ctrl/Cmd+B/I): clicking on already-formatted selection unwraps the markers; with no selection, insert a marker pair and place the caret inside. Never produce `****text****` garbage.

### Live preview (RTXT-04)
- **D-05:** Preview = **live pane directly below the textarea**, re-rendering as the user types (true "preview while editing"). Same pattern on mobile. Rejected: in-place swap (stops editing), side-by-side split (halves writing width).
- **D-06:** **Per-field toggle**, not global — read mode (Phase 45) already covers "see everything rendered".
- **D-07:** Toggle = **eye/preview icon in the toolbar; state resets when leaving the field** (no stickiness) — preview is an on-demand check, form stays calm by default.
- **D-08:** **Step 2 keeps a swap-style Edit/Preview switcher** (NOT a live pane — a pane would cost the editing surface Ben wants to maximize), living inside the redesigned bigger window (D-16). A keyboard shortcut for the switch is welcome (UI-SPEC/planner discretion).

### List editing mechanics (RTXT-03/05)
- **D-09:** Indent/outdent via **toolbar buttons AND Tab/Shift+Tab when the caret is on a list line**. Tab keeps normal move-focus behavior on ordinary text — no keyboard trap. Buttons are the touch + accessibility baseline.
- **D-10:** Enter on an **empty nested item outdents one level per press** (Word/Docs/Notion standard); at top level, Enter on an empty item exits the list (roadmap criterion).
- **D-11:** **Full auto-renumbering** of ordered lists: inserting/deleting/pasting items renumbers the following items so the raw text ALWAYS matches the real sequence. Ben's acceptance scenario: delete item 3, paste it at the end — every number must read correctly with zero manual fixing. Constraint for planner: renumbering rewrites text the user didn't touch — caret stability and native undo behavior must survive (prefer undo-preserving insertion APIs over blind `.value` assignment) and must be verified in a real browser.
- **D-12:** Ben's "live like Word" instinct is satisfied by: live TEXT mechanics in the textarea (numbering, continuation) + live STYLING in the preview pane (D-05). WYSIWYG/contenteditable stays locked out; Ben explicitly declined recording it as a deferred idea — but he must SEE the mechanics in practice at the mockup gate (D-19).

### Italic-in-PDF (lock reopened) + heading indent
- **D-13:** **RTXT-F2 promoted into Phase 46, feasibility-gated:** research vendoring a TRUE italic face for the PDF. Facts: the PDF embeds Heebo regular (~60KB base64) + bold (~110KB base64), one family covering Hebrew+Latin (`assets/pdf-export.js` registerFonts, `assets/fonts/`); **Heebo has no italic face; jsPDF cannot synthesize slant**. Candidate: **Rubik Italic** (true italic with Hebrew coverage; Rubik is already the UI font). Research must weigh: payload size, jsPDF TTF embedding, mixing families (Heebo + Rubik italic) vs. switching the PDF wholesale to Rubik (visual consistency), and keeping the Phase 23 Hebrew bidi pipeline intact.
- **D-14:** **Fallback if infeasible** within reasonable size/effort: italic flattens (as shipped in Phase 45) + disclosure = italic-button **tooltip** AND a **one-line export-modal note**. The italic button stays language-independent — never hidden per-language.
- **D-15:** **Heading indentation: flush-left, standard.** Hierarchy via size/weight only; matches the shipped Phase-45 PDF register and mainstream editors. No CSS indent, no UI-SPEC amendment.

### Export-modal Step-2 redesign (folded todo)
- **D-16:** Step 2 is redesigned for **maximum editing surface** — big enough to show (almost) a whole session with minimal scrolling. Ben is deliberately UNDECIDED between two directions, both of which the **UI-SPEC must present as visual alternatives** for his eyes-on pick: **(a)** bigger-by-default (~50/70/80% candidates — concerns: size gap vs. the small Step 1, and the window must not look like a separate app), or **(b)** current size + a clearly visible **maximize toggle** opening to ~90% with a nicely rearranged maximized layout.
- **D-17:** **Mobile: full-screen takeover** — on small viewports Step 2 becomes a 100%-width/height editing surface, keyboard-aware.
- **D-18:** The **inner editor always flexes to fill** the modal's available space — no independently-resized textarea inside a fixed shell (kills the current `resize: vertical` textarea inside fixed `.modal-card` mismatch).

### Process: UI gate (binding)
- **D-19:** Detailed visual design (button order/grouping, icons, heading-selector presentation — dropdown vs. segmented, spacing, dark mode, RTL mirroring, snippets-button coexistence) is **delegated to the mandatory `/gsd-ui-phase` UI-SPEC**. The UI phase MUST deliver an **interactive (typable/clickable) HTML mockup** — toolbar, live preview, list mechanics feel, and BOTH Step-2 size directions — for Ben's sign-off **BEFORE planning**. Ben: "important to see the UI before accepting."

### Claude's Discretion
- Toolbar DOM/positioning mechanism (beware the RTL overlay pitfall: `getBoundingClientRect` is physical — position with physical left/top, not logical inset-inline), preview render debounce, auto-format/renumber implementation approach (within the D-11 undo/caret constraint), selection APIs, i18n key naming (all new strings ship in EN/DE/HE/CS), info-note styling within existing tokens, Step-2 keyboard shortcut choice, exact feasibility thresholds for D-13 ("reasonable size/effort" — researcher proposes, Ben confirms at plan review).
- Whether the rich-text toolbar gets a guided-tour step — per REQUIREMENTS Process Notes, decided at phase planning.

### Folded Todos
- `2026-07-13-phase46-editor-design-decisions-italic-and-heading-indent.md` — the two Phase-45 UAT carryovers; resolved here as D-13/D-14 (italic went further than the todo's disclosure leaning — lock reopened) and D-15 (flush-left).
- `2026-07-06-resizeable-export-modal.md` — Step-2 cramped-editing ergonomics; resolved here as D-16/D-17/D-18 (direction chosen at the UI mockup gate).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` — RTXT-01..05, 09 + milestone locks. **Amended 2026-07-14 this session:** italic-in-PDF lock reopened, RTXT-F2 promoted feasibility-gated.
- `.planning/ROADMAP.md` — Phase 46 goal + 4 success criteria (toolbar inserts markers, shortcuts + auto-format, preview + nested lists in preview AND PDF, snippets/autogrow verified in a real browser).
- `.planning/phases/45-rich-text-rendering-export-foundation/45-CONTEXT.md` — predecessor decisions this phase builds on (D-01 heading selector, D-05 nesting foundation, D-08 CommonMark-hardened inline rules — the toolbar must produce markers these rules accept).

### Editing surfaces (the code this phase touches)
- `assets/add-session.js` — the 7 note textareas (saved at `saveSessionForm()`), `autoGrow` (composition contract in header comment: never mutates `.value`, composes with the snippets input listener — the toolbar/auto-format layer must honor this), `setReadMode` read-mode overlay.
- `assets/export-modal.js` — 3-step flow; Step-2 editor + existing Edit/Preview swap (~line 560, MdRender-wired); `buildSessionMarkdown()` (~line 171) generates the document skeleton whose `#`/`##` headings share Step-2 with note content.
- `assets/snippets.js` — snippet autocomplete popover over the same textareas (`--z-popover`); RTXT-09 demands zero regression; toolbar/preview chrome must coexist with it.
- `assets/app.css` — `.modal-card` fixed sizing (~line 1616), Step-2 textarea `resize: vertical` (~line 1086), `#confirmModal` z-index coupling (~line 1600); `assets/tokens.css` — design tokens (info-note color, dark mode).

### Rendering & PDF (extended by D-13, otherwise consumed as-is)
- `assets/md-render.js` — escape-first renderer; preview panes MUST route through `MdRender.render` (never raw innerHTML); single-newline `<br>` contract locked in header.
- `assets/pdf-export.js` — font loading/registration (`loadScriptOnce` ~141–150, `registerFonts` ~237–261: Heebo normal+bold via addFileToVFS/addFont), inline segment pipeline. D-13 research starts here.
- `assets/fonts/` — `heebo-base64.js` (~60KB), `heebo-bold-base64.js` (~110KB), Rubik woff2 trio (UI font). A vendored italic follows the heebo-base64 pattern.
- `.planning/milestones/v1.1-phases/23-pdf-hebrew-rtl-rewrite/` — Phase 23 Hebrew bidi pipeline research; D-13 must not break it.

### Folded todos (originals, for full problem statements)
- `.planning/todos/pending/2026-07-13-phase46-editor-design-decisions-italic-and-heading-indent.md`
- `.planning/todos/pending/2026-07-06-resizeable-export-modal.md`

### Docs gate
- `HELP-MAP.md` + `scripts/docs-gate.js` contract (CLAUDE.md) — this phase is heavily user-facing: changelog entry + help-topic updates required at push time.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `window.MdRender` — proven escape-first renderer; the live preview pane (D-05) and Step-2 switcher already consume it; zero new rendering code needed.
- Phase 45 `.note-rendered` CSS — rendered-note styling within the garden design system; the preview pane should reuse it.
- Export-modal Step-2 Edit/Preview swap (~export-modal.js:560) — the existing switcher D-08 keeps.
- Zero-npm test runner + Phase 45's cross-pipeline agreement tests (MdRender ↔ PDF) — extend, don't duplicate.

### Established Patterns
- Vanilla IIFE `window.*` modules, zero-build/zero-npm — the toolbar is a new asset module following this shape (likely a shared module both add-session and export-modal load).
- `autoGrow` composition contract (add-session.js header): handlers never mutate `.value`, never preventDefault — the auto-format/renumber layer WILL mutate `.value`-adjacent state, so it must be inserted consciously (undo-preserving APIs, then let autogrow/snippets listeners observe the input event) — this is the RTXT-09 danger zone.
- RTL: logical properties for layout, but PHYSICAL coordinates for positioned overlays (repo memory: rect-based positioning mirrors wrongly with inset-inline in RTL) — applies to the docked toolbar and preview pane positioning.
- i18n: every new string (tooltips, info note, preview labels) in all four dictionaries; toolbar icons keep buttons language-independent (D-14 rationale).
- jsdom blindness: caret/selection/paste/keyboard/PDF/RTL-visual behavior needs real installed-Safari PWA + real iPhone + real opened-PDF verification (repo has shipped false-GREEN jsdom PDF tests before).

### Integration Points
- add-session.js note textareas (toolbar dock + auto-format + preview pane), read-mode toggle untouched.
- export-modal.js Step 2 (toolbar, info note, redesigned sizing, kept switcher).
- pdf-export.js font registration (D-13 only).
- Docs hard-gate: changelog + help topics (the Sessions & Notes topic will need real updates — read HELP-MAP.md cold).

</code_context>

<specifics>
## Specific Ideas

- **Step-2 vision (Ben, verbatim intent):** a dedicated, big-enough window showing maybe almost the whole session at once — at least scrollable without much scrolling; formatting toolbar on top that looks "advanced enough"; a swap switcher is acceptable if it looks really good and maybe has a keyboard shortcut.
- **Step-2 info note (Ben):** "some kind of a note, maybe with some blue background, resembling some information which is worth knowing" — changes are not saved to the document, only for this dedicated export; close the dialog and they're gone; this explicitly licenses users to reorder/restructure freely for one-off exports.
- **Auto-renumber acceptance scenario (Ben):** delete point 3 to paste it later — the old point 4 immediately reads as 3; paste the cut item at the end — it takes the next number in sequence. Numbers always read as a correct 1..N sequence; swapping two points stays easy and straightforward.
- **Mockup gate:** Ben needs to *type into* the mockup to judge the live feel (list mechanics, renumbering, preview) — a static image does not satisfy D-19.

</specifics>

<deferred>
## Deferred Ideas

None — Ben explicitly declined to record new deferred ideas this session (the WYSIWYG instinct is addressed by D-12, not deferred).

### Reviewed Todos (not folded)
- `2026-05-13-drag-sort-settings-categories.md` — owned by Phase 47 (section reordering).
- `2026-07-07/08/11` polish + a11y todos (error-tone, birthdate, popover exclusivity, next-date errors) — owned by Phase 48 (mobile pass & validation polish).
- `2026-05-13-modality-templates.md` — out of scope for v1.4 (REQUIREMENTS out-of-scope table).
- Remaining low-score matches (deactivation warning, terms flow, IndexedDB encryption, etc.) — unrelated to this phase's domain; left in the backlog.

</deferred>

---

*Phase: 46-rich-text-toolbar-editor*
*Context gathered: 2026-07-14*
