# Phase 45: Rich-Text Rendering & Export Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-13
**Phase:** 45-rich-text-rendering-export-foundation
**Areas discussed:** Headings inside notes, Nested lists (45 vs 46), Secondary display surfaces, Legacy note safety, Color scope (ad-hoc), Todo cross-reference

---

## Headings inside notes

| Option | Description | Selected |
|--------|-------------|----------|
| Plain text (Recommended) | `# Follow-up` displays literally; formatting vocabulary equals toolbar offering | |
| Demote to bold line | Heading renders as bold line, no hierarchy | |
| Full heading rendering | MdRender h1–h3 in notes; PDF renders as section headings | ✓ (expanded) |

**User's choice:** Ben first asked "Why would the toolbar only offer 3 options instead of more?" and "So what is in?" — after the explanation (markdown-at-rest drives the vocabulary; headings are the one markdown-native candidate left off), he decided: **add a heading button to the Phase 46 toolbar** ("if we can have headers then let's do button for this with h1 to some sub header") and keep scope otherwise as-is. Phase 45 therefore renders headings fully, with the PDF note-heading register subordinate to document section headings.

### Follow-up: heading levels

| Option | Description | Selected |
|--------|-------------|----------|
| Two: H1 + H2 (Recommended) | Heading + subheading, simpler toolbar | |
| Three: H1–H3 | Full renderer depth exposed | ✓ (via Other) |
| One: single heading | Maximum simplicity | |

**User's choice:** "H1-h3 and switch to regular text" — three levels plus a regular-text state on the control (paragraph-style selector).
**Notes:** Triggered a REQUIREMENTS.md RTXT-01 scope edit (committed with this context).

---

## Nested lists: 45 or 46?

| Option | Description | Selected |
|--------|-------------|----------|
| Nesting in 45 (Recommended) | Foundation handles nested bullet/numbered lists now; verified once on real PDF/RTL | ✓ |
| Flat lists in 45, nesting in 46 | Smaller 45, but PDF pipeline re-opened and re-verified in 46 | |

**User's choice:** Nesting in 45.
**Notes:** Resolves the RTXT-07 ("incl. nesting") vs RTXT-05→Phase-46 traceability ambiguity.

---

## Secondary display surfaces

| Option | Description | Selected |
|--------|-------------|----------|
| Strip to plain text (Recommended) | Markers removed in compact spots; zero layout risk | ✓ |
| Inline-only rendering | Bold/italic styled, lists flattened | |
| Full markdown render | Full rendering incl. lists in table cells | |

**User's choice:** Strip to plain text (sessions-table trappedEmotions cell, overview comments line, spotlight summary quote).

---

## Legacy note safety

| Option | Description | Selected |
|--------|-------------|----------|
| Render all + harden rules (Recommended) | Uniform render path, CommonMark-style emphasis tightening; accidental asterisks stay literal | ✓ |
| Render all with current loose rules | Simplest; `2 * 3 * 4` would silently italicize | |
| Flag legacy sessions as plain text | Safest but forks the render path; conflicts with zero-migration spirit | |

**User's choice:** Render all + harden rules. Hand-typed `- item` upgrading to a real bullet is accepted as meaning-preserving.

---

## Color scope (ad-hoc, raised by Ben)

| Option | Description | Selected |
|--------|-------------|----------|
| Stays out; note for later (Recommended) | Keep 2026-07-11 scoping; capture as deferred idea | ✓ |
| Reopen v1.4 scope | REQUIREMENTS + roadmap change, private token + PDF color pipeline | |

**User's choice:** "And keep scope otherwise as is" — color stays out, logged as deferred idea.

---

## Todo cross-reference

| Option | Description | Selected |
|--------|-------------|----------|
| Target Phase 46 (Recommended) | Editing ergonomics belongs with the toolbar editor phase | ✓ |
| Fold into Phase 45 | Do it now while touching the export modal | |
| Leave in backlog | Stay pending for a later call | |

**User's choice:** `2026-07-06-resizeable-export-modal.md` targeted at Phase 46 (reviewed, not folded).

## Claude's Discretion

- Read-mode rendering mechanism (how read-only textareas swap to rendered HTML in `setReadMode`), rendered-note CSS, MdRender API shape, and how the PDF distinguishes note-body blocks from document-structure blocks.
- Exact PDF register (size/weight/spacing) for note headings, within the "subordinate to section headings" constraint.
- Whether rich-text read mode gets a guided-tour step (per REQUIREMENTS Process Notes).

## Deferred Ideas

- Text color in session notes — stays out per v1.4 scoping; revisit if users ask (same bucket as underline RTXT-U1).
- Resizeable export modal Step-2 editor — targeted at Phase 46.
