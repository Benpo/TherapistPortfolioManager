# Phase 46: Rich-Text Toolbar Editor - Research

**Researched:** 2026-07-14
**Domain:** Plain-textarea rich-text editing (markdown-at-rest) — toolbar, keyboard shortcuts, auto-format, live preview, nested-list mechanics, native-undo preservation, and jsPDF true-italic font embedding
**Confidence:** HIGH (undo APIs, font feasibility, codebase integration all verified against source + browser-vendor docs)

## Summary

This phase adds an **editing layer** on top of a shipped, device-verified rendering pipeline (Phase 45 `MdRender` + the `pdf-export.js` bidi/segment pipeline). Every hard problem in it reduces to one root constraint: **all programmatic edits to the 7 note textareas must go through `document.execCommand('insertText')`** (and its sibling delete commands), because that is the *only* API that mutates a textarea's value while preserving the browser's **native undo stack** — and the entire phase (D-11 auto-renumber, D-20 undo/redo buttons, D-04 toggle) is built on that native stack surviving. `setRangeText` and blind `.value =` assignment both *destroy* the undo history. Notably, the app's own `snippets.js` currently inserts via `.value =` (line 403) — so today snippet expansion already wipes undo; this phase's insertion helper should become the shared, undo-safe chokepoint that snippets can later adopt too.

For **D-13 (true italic in the PDF)**: the candidate is sound. Rubik ships a genuine italic face with full Hebrew coverage, and jsPDF natively supports registering an `italic` style on a family (`addFont(file, family, 'italic')` → `setFont(family, 'italic')`). The cost is one vendored font file (a base64 TTF following the `heebo-base64.js` pattern) plus extending the PDF's per-character weight map to a per-character *style* map. The real feasibility lever is **payload**: a full Rubik TTF is large; a Latin+Hebrew **subset** keeps it in the ~60–90 KB base64 range (comparable to one Heebo weight), and it lazy-loads only during export. I recommend a concrete threshold below.

For **D-11 (auto-renumber) and the list mechanics**: these are standard textarea-scripting patterns (operate on the current line via `selectionStart`/`value`, compute the replacement, apply it with a single `execCommand('insertText')` over a programmatic selection, then restore the caret). Caret stability and undo both fall out for free *if and only if* every mutation uses the insertText chokepoint.

**Primary recommendation:** Build one shared, undo-safe `TextEdit` insertion module (`execCommand('insertText')` + programmatic selection) and route the toolbar, auto-format, auto-renumber, and undo/redo buttons through it; extend the existing PDF `{text,bold}` segment model to `{text,bold,italic}` and register a subset **Rubik-Italic** face under a fixed size budget; verify everything on real installed Safari (desktop + iOS PWA), Chrome, and Firefox — never jsdom.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Toolbar chrome, focus tracking, button state | Browser / Client (DOM) | — | Pure UI over the existing textareas; no server/PWA-cache involvement |
| Text insertion / toggle / auto-format / renumber | Browser / Client (textarea value + selection API) | — | All edits are client-side string ops on the textarea; the undo stack is a browser primitive |
| Live preview rendering | Browser / Client (`MdRender`) | — | Reuses the shipped escape-first renderer; zero new render code |
| Undo/redo | Browser native undo stack | Module-level snapshot stack (fallback only) | Native stack is the design intent (D-20); module stack is the flagged fallback if native triggering is unreliable |
| True-italic glyph rendering | PDF export (`jsPDF` font registration) | — | Only the exported artifact needs a real italic face; on-screen italic is CSS `<em>` already |
| Font asset delivery | CDN / Static (SW-precached base64 module) | — | Follows the existing `heebo-base64.js` lazy-load-on-export pattern |

## User Constraints (from CONTEXT.md)

### Locked Decisions (research THESE, no alternatives)
- **Editor surface:** toolbar-over-textarea ONLY — never contenteditable/WYSIWYG. Fields stay plain markdown strings (zero migration).
- **D-01/D-02:** one focus-attached toolbar docked above the focused note field (7 fields); mobile = same bar, compact, horizontally scrollable, toolbar is the ONLY formatting affordance on touch (no Ctrl/Cmd).
- **D-03:** export-modal Step 2 gets the FULL toolbar (headings incl.) + an info-styled ephemeral-edit note.
- **D-04:** full toggle semantics for bold/italic (button + Ctrl/Cmd+B/I); never emit `****text****`.
- **D-05/06/07:** live preview pane directly below the textarea, per-field, on-demand, resets on blur.
- **D-08:** Step 2 keeps a **swap-style Edit/Preview switcher** (not a live pane), keyboard shortcut welcome.
- **D-09:** indent/outdent via toolbar buttons AND Tab/Shift+Tab on list lines; Tab keeps native focus-move on ordinary text (no keyboard trap).
- **D-10:** Enter on empty nested item outdents one level; at top level exits the list.
- **D-11:** full auto-renumbering of ordered lists — raw text always reads 1..N; **caret stability + native undo must survive** (prefer undo-preserving insertion over blind `.value`); verify in a real browser.
- **D-13:** RTXT-F2 promoted, feasibility-gated — research vendoring a TRUE italic face (Rubik Italic candidate); weigh payload, jsPDF TTF embedding, mixing Heebo+Rubik vs. wholesale Rubik, keep Phase 23 bidi intact. Researcher proposes thresholds; **Ben confirms at plan review.**
- **D-14:** fallback if infeasible — italic flattens + tooltip disclosure + export-modal note; italic button never hidden per-language.
- **D-15:** heading indentation flush-left, hierarchy by size/weight only (no CSS indent, no UI-SPEC amendment).
- **D-16 (RESOLVED):** Step 2 opens at ~50% viewport default + visible maximize toggle to ~90%; mobile full-screen.
- **D-17/D-18:** mobile Step 2 = full-screen keyboard-aware takeover; inner editor flexes to fill (no fixed `resize:vertical` textarea in a fixed shell).
- **D-19:** mockup gate SATISFIED (sketches 006/007). Heading control = **dropdown ("Text ▾")** desktop + mobile.
- **D-20:** toolbar gains **undo/redo buttons** driving the native undo stack; on touch they are the ONLY undo affordance; tooltips in all 4 locales. If native triggering unreliable → module-level undo stack (this research decides).

### Claude's Discretion
- Toolbar DOM/positioning mechanism (respect the RTL physical-coords pitfall), preview render debounce, auto-format/renumber implementation approach (within D-11 undo/caret constraint), selection APIs, i18n key naming (EN/DE/HE/CS), info-note styling within existing tokens, Step-2 keyboard shortcut choice, exact D-13 feasibility thresholds (proposed here, Ben confirms), whether the toolbar gets a guided-tour step.

### Deferred Ideas (OUT OF SCOPE)
- Underline; WYSIWYG/contenteditable; font sizes/colors/tables/images; modality templates; bold-italic combined face (see Open Questions — `***x***` is an edge case, not a first-class feature).
- Section reordering (Phase 47); mobile/validation polish (Phase 48).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RTXT-01 | Toolbar inserts markdown markers (bold, italic, bullet, numbered, heading control) | Pattern 1 (undo-safe insertion) + Pattern 4 (toggle) + Component Inventory in UI-SPEC |
| RTXT-02 | Keyboard shortcuts on desktop (Ctrl/Cmd+B/I) | Pattern 5 (keydown routing) — desktop only per D-02 |
| RTXT-03 | Auto-format while typing (`- `/`1. ` starts list, Enter continues, empty exits) | Pattern 2 (line-aware auto-format on `beforeinput`/`input`) |
| RTXT-04 | Live preview toggle | Reuse `MdRender.render` into a `.note-rendered` pane (§Don't Hand-Roll) |
| RTXT-05 | Indent/outdent nested lists, render in preview AND PDF | Pattern 3 (indent) + Phase 45 nesting already renders in preview & PDF |
| RTXT-09 | Snippets + autogrow keep working unchanged | Pitfall 1 (input-event composition) + shared insertion chokepoint |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native `document.execCommand('insertText'/'delete'/'undo'/'redo')` | Browser built-in (deprecated but universally supported) | Undo-preserving textarea mutation | The ONLY API that edits a textarea while keeping the native undo stack intact — no viable replacement exists [VERIFIED: MDN + Firefox/Chromium bug trackers] |
| `window.MdRender` | in-repo (Phase 45) | Escape-first markdown → HTML for the preview pane | Already shipped, device-verified, XSS-safe; zero new render code |
| `jsPDF` (`assets/jspdf.min.js`) | vendored | PDF generation incl. `addFileToVFS`/`addFont`/`setFont` for embedded TTFs | Already the export engine; supports `italic` as a first-class font style [CITED: jsPDF addFont API] |
| `bidi-js` (`assets/bidi.min.js`) | vendored | UAX#9 bidi reorder for Hebrew (Phase 23) | Italic runs must pass through the SAME shaping — do not bypass |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Rubik-Italic (subset TTF → base64 module) | to be vendored | True italic glyphs (Latin+Hebrew) in the PDF | Only if D-13 clears the payload threshold; else D-14 fallback |
| `window.Snippets` | in-repo | Snippet expansion over the same textareas | Coexist — the new insertion chokepoint should be snippet-compatible (RTXT-09) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `execCommand('insertText')` | `textarea.setRangeText()` | Cleaner, non-deprecated API — but **wipes the native undo stack** in Chrome/Safari; breaks D-11/D-20. Rejected. |
| `execCommand('insertText')` | `textarea.value = ...` | What snippets does today; simplest — but destroys undo AND requires manual `input` dispatch. Rejected for edits that must be undoable. |
| Mixing Heebo body + Rubik-italic runs | Switch the whole PDF to Rubik (regular+bold+italic) | Visual consistency (one family) — but re-tests the ENTIRE Phase 23 bidi pipeline + changes the shipped visual register. Higher risk; recommend the mix. |
| Native undo/redo (`execCommand`) | Module-level snapshot stack | Full control — but won't integrate with the browser's own Ctrl+Z (dual-stack divergence, see Pitfall 3). Fallback only. |

**Installation:** No npm — zero-build PWA. The only new asset is a vendored base64 font module (D-13), lazy-loaded during export exactly like `heebo-base64.js`.

## Package Legitimacy Audit

No package-registry installs in this phase (zero-npm app). The only vendored asset is a **static font file** (Rubik-Italic, SIL OFL 1.1, from the official `googlefonts/rubik` repo), following the existing `heebo-base64.js` vendoring pattern. This is not a registry dependency and carries no supply-chain surface beyond verifying the download against the official Google Fonts / googlefonts GitHub source. **Verdict: N/A — no npm/PyPI/crates packages installed.**

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────────────────────┐
   user keystroke /      │              Focus-attached Toolbar          │
   toolbar click /       │  (bold italic list# indent undo redo eye)    │
   Ctrl+B ───────────────┤   tracks document.activeElement ∈ 7 fields   │
                         └───────────────┬─────────────────────────────┘
                                         │ intent (toggle/insert/indent/renumber)
                                         ▼
                    ┌───────────────────────────────────────────┐
                    │   TextEdit chokepoint  (NEW shared module) │
                    │   selection = [start,end] on the textarea  │
                    │   document.execCommand('insertText', repl) │──── preserves NATIVE undo stack
                    └───────────────┬───────────────────────────┘
                                    │ fires real 'input' event
             ┌──────────────────────┼───────────────────────────┐
             ▼                      ▼                             ▼
   autoGrow (measures height)  Snippets input listener   Preview pane (debounced)
   [never mutates .value]      [expands ;triggers]        MdRender.render(value)
                                                                 │
                                                                 ▼  .note-rendered (Phase 45 CSS)
                                    ┌────────────────────────────────────────┐
   Export (Step 2 editor) ────────▶│  buildSessionMarkdown() → pdf-export.js │
                                    │  parseInline{bold,italic} → segments    │
                                    │  drawSegmentedLine: per-char style map  │
                                    │  bold→Heebo/bold  italic→Rubik/italic   │──▶ bidi shape ──▶ jsPDF text
                                    └────────────────────────────────────────┘
```

Data-flow to trace: a keystroke enters through the toolbar/keydown router → becomes an *intent* → the `TextEdit` chokepoint applies it via `execCommand('insertText')` → the resulting native `input` event is observed (not synthesized) by autoGrow + snippets + preview → the same raw markdown later flows into the PDF pipeline where the extended segment model splits bold vs italic runs onto different font faces.

### Recommended Project Structure
```
assets/
├── text-edit.js        # NEW — undo-safe insertion chokepoint (execCommand wrapper +
│                       #        line/selection helpers); shared by toolbar + auto-format
├── rich-toolbar.js     # NEW — the focus-attached toolbar module (window.RichToolbar):
│                       #        DOM, focus tracking, button state, keydown routing,
│                       #        indent/outdent, auto-renumber, preview toggle
├── add-session.js      # EDIT — mount toolbar + preview pane over the 7 note fields
├── export-modal.js     # EDIT — Step-2 redesign (toolbar, info note, 50%/maximize, swap switcher)
├── pdf-export.js       # EDIT (D-13) — register Rubik-Italic; extend segment model to italic
├── fonts/
│   └── rubik-italic-base64.js  # NEW (D-13, if feasible) — subset TTF, SIL OFL 1.1
├── app.css / tokens.css        # EDIT — toolbar/preview/info-note/modal-flex chrome
└── i18n-{en,he,de,cs}.js       # EDIT — tooltips, info note, preview labels (all 4)
```

### Pattern 1: Undo-safe insertion chokepoint (the keystone)
**What:** A single function that replaces a textarea range while keeping the browser undo stack.
**When to use:** EVERY programmatic edit — toggle, marker insert, list continuation, indent, renumber.
**Example:**
```javascript
// Source: MDN Document.execCommand + widely-used textarea-undo idiom (verified pattern)
function editInsert(textarea, start, end, replacement) {
  textarea.focus();
  // Select the exact range to overwrite; execCommand acts on the current selection.
  textarea.setSelectionRange(start, end);
  // insertText is the ONLY path that (a) mutates value, (b) keeps native undo,
  // (c) fires a real 'input' event autoGrow/snippets observe.
  const ok = document.execCommand('insertText', false, replacement);
  if (!ok) {
    // Extremely rare fallback (e.g. some headless envs): value-splice, then
    // MANUALLY re-dispatch input so autoGrow/snippets still react. Undo is lost
    // on this path — acceptable only where execCommand is genuinely unavailable.
    const v = textarea.value;
    textarea.value = v.slice(0, start) + replacement + v.slice(end);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
```
**Key point:** `insertText` with an empty string acts as delete; a positive-length selection + non-empty replacement is a replace. This single primitive expresses toggle-unwrap, marker-insert, continuation, indent, and renumber.

### Pattern 2: Auto-format on `beforeinput` / `input` (RTXT-03)
**What:** Detect `- `/`1. ` at line start, Enter-continuation, and empty-item exit.
**When to use:** list auto-format while typing.
**Example approach:**
```javascript
// On keydown Enter: look at the current line (value between last \n and caret).
//  - line matches /^(\s*)([-*]|\d+\.)\s+(.*)$/  →
//      if item body empty  → exit/outdent (D-10): remove the marker (top level) or
//                            drop one indent level (nested), via editInsert.
//      else                → insert '\n' + sameIndent + nextMarker, via editInsert;
//                            preventDefault the native Enter.
//  - typing '- ' or '1. ' at col 0 needs no special handling — it IS the raw text;
//    only continuation/exit/renumber need scripting.
```
**Note:** prefer `beforeinput` where available for cleaner cancellation, but `keydown` for Enter/Tab is the reliable cross-browser path (iOS Safari `beforeinput` for Enter is inconsistent).

### Pattern 3: Indent / outdent (RTXT-05, D-09)
**What:** Tab/Shift+Tab on a list line, or toolbar buttons, adjust leading indentation.
**When to use:** nested-list building.
**Example approach:** On Tab when the caret's line matches a list marker, `preventDefault` and `editInsert` to add/remove one indent unit (match Phase 45's nesting unit — confirm whether it's 2 spaces or a tab in the shipped renderer) at the line start. On non-list lines, do NOT preventDefault (Tab keeps native focus-move — no keyboard trap).

### Pattern 4: Full toggle (D-04)
**What:** Bold/italic wrap-or-unwrap without producing `****text****`.
**Logic:** If the selection is already wrapped in the marker (or immediately surrounded by it), remove the markers; else wrap. With an empty selection, insert the marker pair and place the caret between them (`setSelectionRange(start+len, start+len)` after insert). All via `editInsert`.

### Pattern 5: PDF italic — extend the per-character style map (D-13)
**What:** `drawSegmentedLine` currently builds `weightByLogical` (0/1 bold). Add a parallel `styleByLogical` (0/1 italic); break runs on *either* changing; `setFont` per run to the right family+style.
**Example approach:**
```javascript
// registerFonts(doc): add one line alongside the Heebo pair —
//   doc.addFileToVFS('RubikItalic.ttf', window.RubikItalic);
//   doc.addFont('RubikItalic.ttf', 'Heebo', 'italic');   // register UNDER 'Heebo'
// Registering the Rubik-italic bytes under family 'Heebo', style 'italic' means the
// renderer only ever calls setFont('Heebo', <style>) — italic runs transparently get
// Rubik glyphs, regular/bold stay Heebo. Measurement (getStringUnitWidth) already
// re-runs per run, so width stays correct across the family switch.
```
Then `parseInlineBold` becomes `parseInline` emitting `{text, bold, italic}` while preserving the byte-for-byte **strip-equivalence invariant** (concatenated segment text === plain-stripped string) that the bidi map depends on.

### Anti-Patterns to Avoid
- **`textarea.value = ...` for undoable edits:** destroys the native undo stack (this is exactly what makes today's snippet insertion non-undoable). Only acceptable in the genuinely-unavailable fallback branch.
- **`setRangeText()`:** looks like the modern replacement but also wipes undo in Chrome/Safari — do NOT use it for the toolbar edits.
- **Positioning the docked toolbar/heading-popover with logical `inset-inline-*` from a `getBoundingClientRect`:** mirrors wrongly in RTL (repo memory). Use physical `left`/`top`.
- **Bypassing `MdRender.render` with raw `innerHTML` in the preview:** XSS regression; always route through the escape-first renderer.
- **Verifying caret/undo/paste/PDF in jsdom:** blind to all of it — this repo has shipped false-GREEN jsdom PDF tests before.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown → HTML for preview | A new renderer | `window.MdRender.render` | Shipped, escape-first, device-verified; matches PDF output |
| Undo/redo history | A snapshot stack (as the *default*) | Native `execCommand` stack | Free, integrates with Ctrl+Z; module stack causes dual-stack divergence (Pitfall 3) |
| Undo-preserving text insertion | Manual value-splice + diff | `execCommand('insertText')` | The only API that keeps undo intact across all target browsers |
| Preview pane styling | New CSS | Reuse Phase 45 `.note-rendered` | Same look as read mode; zero drift |
| PDF italic slant | jsPDF synthetic oblique | A real embedded italic TTF | jsPDF **cannot** synthesize slant; a true face is required |
| Bidi shaping of italic runs | New shaping | Existing `shapeForJsPdfWithMap` | Italic runs must reorder identically or Hebrew breaks |
| Caret position after edit | Guessing offsets | `setSelectionRange` right after `editInsert` | Deterministic; `insertText` leaves caret after the insert, adjust explicitly for renumber |

**Key insight:** The whole phase is "thin scripting over a proven pipeline." The single genuinely-tricky primitive (undo-safe insertion) is solved by one deprecated-but-irreplaceable API; everything else is line/selection string math that must funnel through it.

## Runtime State Inventory

This is an additive feature phase (new chrome + new PDF font), **not** a rename/refactor/migration. Fields stay plain markdown strings — **zero data migration** (milestone lock: markdown-at-rest). Explicit check of the five categories:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None** — note fields already store raw markdown; the toolbar only changes *how* markers are typed, not the at-rest format. Existing sessions render unchanged (RTXT-10, shipped Phase 45). | None |
| Live service config | **None** — offline PWA, no external services. | None |
| OS-registered state | **None.** | None |
| Secrets/env vars | **None.** | None |
| Build artifacts | New `rubik-italic-base64.js` (if D-13 clears) must be added to `sw.js` PRECACHE_URLS so it is available offline during export, mirroring `heebo-*-base64.js`. Verify the SW cache rolls (deploy-stamped INTEGRITY_TOKEN auto-rolls per repo memory). | Add to precache list; confirm offline export still finds the font |

## Common Pitfalls

### Pitfall 1: The autoGrow / snippets composition contract (RTXT-09 danger zone)
**What goes wrong:** The toolbar mutates textarea content; if it does so without firing a real `input` event, autoGrow won't resize and snippet expansion won't trigger — or worse, a manually-dispatched synthetic event double-fires.
**Why it happens:** `add-session.js` header contract: autoGrow *observes* `input` and only measures height (never mutates `.value`, never `preventDefault`). Snippets attaches its own per-textarea `input` listener. Both assume real input events.
**How to avoid:** Route ALL edits through `execCommand('insertText')`, which fires a genuine `input` event that both listeners observe naturally — no synthetic dispatch needed. Only the (rare) value-splice fallback needs a manual `dispatchEvent(new Event('input',{bubbles:true}))`, exactly as snippets does today (`snippets.js:408`).
**Warning signs:** field doesn't grow after a toolbar insert; a `;trigger` typed via paste/programmatic path doesn't expand; undo skips steps.

### Pitfall 2: iOS Safari PWA selection/keyboard quirks
**What goes wrong:** `beforeinput` cancellation for Enter, virtual-keyboard-driven autocorrect, and `execCommand` timing behave differently in a standalone (installed) iOS PWA than in mobile Safari tabs.
**Why it happens:** WebKit's editing internals differ per display mode; the repo has hit WebKit-only bugs before (date inputs, viewBox SVG 0×0).
**How to avoid:** Anchor Enter/Tab handling on `keydown` (not `beforeinput`); verify on a **real installed iOS PWA**, not just desktop Safari or the simulator.
**Warning signs:** list continuation works on desktop but "eats" characters or double-newlines on iPhone.

### Pitfall 3: Native/module undo dual-stack divergence (D-20 fallback trap)
**What goes wrong:** If the undo/redo *buttons* drive a module-level snapshot stack while Ctrl+Z still drives the browser's native stack, the two diverge — Ctrl+Z undoes a native edit the module stack doesn't know about, and the button then "undoes" to a stale snapshot.
**Why it happens:** `execCommand('insertText')` edits always land on the native stack whether you want them to or not; a parallel module stack can't intercept them.
**How to avoid:** **Prefer the native path** — undo/redo buttons call `execCommand('undo')`/`execCommand('redo')`. Only if a target browser refuses to *programmatically* trigger native undo (test this explicitly), fall back to a module stack — and if you do, you must ALSO intercept Ctrl+Z/Ctrl+Shift+Z and route them through the module stack so there is exactly one stack. Never run both stacks live.
**Warning signs:** button-undo and keyboard-undo produce different results; redo re-applies the wrong edit.

### Pitfall 4: Auto-renumber caret jump
**What goes wrong:** Rewriting item numbers below the caret (D-11: delete item 3 → items 4..N shift to 3..N−1) moves text the user didn't touch; a naive rewrite drops the caret to the wrong place.
**Why it happens:** Replacing a large range resets the caret to the end of the insert.
**How to avoid:** Compute the caret's offset *within its own line* before the renumber, apply the renumber as ONE `editInsert` over the affected block, then restore the caret with `setSelectionRange` using the recomputed absolute offset (line start + preserved intra-line offset). Renumber only the contiguous ordered-list block, not the whole field.
**Warning signs:** caret jumps to end after deleting a list item; typing resumes at the wrong spot.

### Pitfall 5: Firefox `insertText` history quirk
**What goes wrong:** Older Firefox had a bug where `execCommand('insertText')` on textarea didn't fire input / behaved oddly (bugzilla 1220696).
**Why it happens:** legacy WebKit-parity gap.
**How to avoid:** Current Firefox supports it correctly; still include Firefox in the real-browser verification matrix and assert the `input` event fires.
**Warning signs:** autoGrow/preview don't update on Firefox after a toolbar action.

## Code Examples

### Reading the current line for auto-format / indent
```javascript
// Source: standard textarea line-extraction idiom
function currentLine(ta) {
  const pos = ta.selectionStart;
  const start = ta.value.lastIndexOf('\n', pos - 1) + 1;   // 0 if none
  let end = ta.value.indexOf('\n', pos);
  if (end === -1) end = ta.value.length;
  return { start, end, text: ta.value.slice(start, end), caretInLine: pos - start };
}
```

### Toggle bold with empty-selection caret placement (D-04)
```javascript
function toggleWrap(ta, marker) {           // marker = '**' or '*'
  const s = ta.selectionStart, e = ta.selectionEnd;
  const sel = ta.value.slice(s, e);
  const m = marker.length;
  const wrapped = ta.value.slice(s - m, s) === marker &&
                  ta.value.slice(e, e + m) === marker;
  if (wrapped) {                            // unwrap
    editInsert(ta, s - m, e + m, sel);
    ta.setSelectionRange(s - m, e - m);
  } else if (s === e) {                     // empty: insert pair, caret inside
    editInsert(ta, s, e, marker + marker);
    ta.setSelectionRange(s + m, s + m);
  } else {                                  // wrap selection
    editInsert(ta, s, e, marker + sel + marker);
    ta.setSelectionRange(s + m, e + m);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `execCommand` treated as fully removable | Retained indefinitely for `insertText`/`undo` because no standard replacement covers undo-preserving edits | Ongoing (MDN issue #40245) | Safe to depend on for this phase despite the "deprecated" banner |
| jsPDF synthesizing oblique from a regular face | Must embed a real italic TTF (`addFont(..., 'italic')`) | Long-standing jsPDF limitation | D-13 requires a vendored italic face, not a transform |
| Rubik Hebrew coverage patchy | Rubik Hebrew revised (Meir Sadan) — full coverage incl. nikkud positioning, italic across all weights | Google Fonts current | Rubik-Italic is a viable Hebrew-covering italic candidate |

**Deprecated/outdated:**
- `document.execCommand` is labelled obsolete on MDN — but is the *only* undo-preserving textarea-edit API; use it deliberately and comment WHY (so a future cleanup doesn't "modernize" it into `setRangeText` and silently break undo).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A Latin+Hebrew **subset** of Rubik-Italic compresses to ~60–90 KB base64 (comparable to one Heebo weight) | D-13 feasibility | If the subset is much larger, the payload threshold decision changes; measure the actual subset before locking D-13. **Ben confirms threshold at plan review.** |
| A2 | Rubik-Italic's Hebrew glyphs render acceptably slanted/oblique (Hebrew has no true cursive italic tradition; "italic" may render upright-oblique) | D-13 | If Hebrew italic looks wrong/unslanted, italic-in-Hebrew value is limited — but Latin italic still benefits; still better than flattening. Visual check on a real PDF required. |
| A3 | Phase 45's nesting indent unit (spaces vs tab, count) is stable and known | Pattern 3 | Indent/outdent must emit the SAME unit the renderer expects; confirm against `md-render.js`/Phase 45 before coding. |
| A4 | `execCommand('undo')`/`('redo')` triggers the native stack reliably enough on desktop Chrome/Firefox/Safari for the D-20 buttons | D-20 | If unreliable (esp. iOS PWA), fall back to the single-module-stack path (Pitfall 3). Must be tested on real devices. |
| A5 | Combined bold-italic (`***x***`) is NOT a first-class feature (md-render doesn't cleanly tokenize it) | Open Questions | If Ben wants `***x***`, a Rubik BoldItalic face (4th font) is needed — extra payload + a bolditalic style registration. |

## Open Questions

1. **D-13 payload threshold — the feasibility gate.**
   - What we know: Rubik has a true italic Hebrew-covering face; jsPDF embeds it via `addFont(..., 'italic')`; it lazy-loads only during export; current font payload is ~170 KB (Heebo 60 KB + 110 KB).
   - What's unclear: the exact size of a Latin+Hebrew Rubik-Italic subset as a base64 TTF.
   - **Recommended concrete thresholds (for Ben to confirm at plan review):**
     - **GREEN (proceed, mix Heebo+Rubik-italic):** subset base64 ≤ **~90 KB** and Phase-23 bidi tests + a real Hebrew+Latin italic PDF both pass. (+90 KB on an export-only lazy load is proportionate — it never touches app boot.)
     - **AMBER (proceed only if Ben accepts the weight):** ~90–140 KB — offer as a plan-review choice.
     - **RED (fall back to D-14 flattening + disclosure):** > ~140 KB, OR subsetting/bidi integration proves fiddly enough to risk the shipped Phase-23 pipeline, OR Hebrew italic renders visibly broken (A2).
   - Recommendation: **subset before deciding**; register the italic bytes UNDER family `'Heebo'` style `'italic'` (renderer only ever says `setFont('Heebo', style)`); keep Heebo for regular/bold (do NOT switch the PDF wholesale to Rubik — that re-tests everything).

2. **D-20 native-undo triggering reliability.**
   - What we know: edits via `insertText` land on the native stack; Ctrl+Z works for free.
   - What's unclear: whether `execCommand('undo')`/`('redo')` *buttons* fire reliably on iOS Safari PWA.
   - Recommendation: implement native-first; add a real-device test asserting button-undo === keyboard-undo; if it fails on any target, switch to a single module stack that ALSO intercepts Ctrl+Z (never dual-stack).

3. **Bold-italic (`***x***`).**
   - What we know: md-render tokenizes `**bold**` and `*italic*` separately; combined `***` is an ambiguous edge, not a toolbar affordance.
   - Recommendation: don't offer a combined button; ensure `***x***` at least degrades gracefully in the PDF (bold-wins or italic-wins, not garbage). A dedicated Rubik-BoldItalic face is out of scope unless Ben asks (A5).

4. **Guided-tour step for the toolbar** (REQUIREMENTS Process Note, deferred to planning).
   - Recommendation: a small optional tour step is low-cost; decide at plan time. Tour machinery is in the changelog-only docs tier (no help-topic demand).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `document.execCommand('insertText')` | All undo-safe edits | ✓ (all target browsers) | native | value-splice + manual input dispatch (loses undo) |
| `window.MdRender` | Preview pane | ✓ (Phase 45) | in-repo | — |
| `jsPDF` `addFont(...,'italic')` | D-13 | ✓ | vendored | D-14 flatten |
| Rubik-Italic subset TTF | D-13 | ✗ (must vendor) | — | D-14 flatten + disclosure |
| Real installed Safari (desktop) + iOS PWA + Firefox + Chrome | Mandatory verification | Ben's devices | — | none — jsdom cannot substitute |

**Missing dependencies with fallback:** Rubik-Italic font (fallback = D-14 flattening + tooltip/note).
**Missing dependencies with no fallback:** none blocking — the core toolbar/preview/list mechanics need only native browser APIs already present.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Zero-npm in-repo test runner (Phase 45 cross-pipeline agreement tests exist: MdRender ↔ PDF) |
| Config file | none (custom runner) — see Wave 0 |
| Quick run command | run the existing node test entrypoint used by Phase 45 (confirm path in `scripts/`/`test/` at plan time) |
| Full suite command | same runner, all tests |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RTXT-01 | Toolbar inserts correct markers / toggle logic | unit (pure string fns: `toggleWrap`, marker insert) | node test on `text-edit`/`rich-toolbar` pure helpers | ❌ Wave 0 |
| RTXT-03 | Auto-format continuation/exit line math | unit (pure line-transform fns) | node test on the line-transform helpers | ❌ Wave 0 |
| RTXT-05 | Indent/outdent + renumber string transforms | unit (pure fns) | node test on renumber/indent helpers | ❌ Wave 0 |
| RTXT-04 | Preview renders via MdRender | unit (already covered by MdRender tests) | existing MdRender suite | ✅ |
| RTXT-01/03/05 caret+undo | Real caret/selection/undo behavior | **manual real-browser** (jsdom-blind) | Safari desktop + iOS PWA + Chrome + Firefox checklist | ❌ human-verify gate |
| RTXT-09 | Snippets + autogrow unaffected | **manual real-browser** | type `;trigger` + long text in an enhanced field | ❌ human-verify gate |
| D-13 | Italic in exported PDF (Latin+Hebrew) | **manual real opened-PDF** | export a session with italic Hebrew+Latin, open the PDF | ❌ human-verify gate |
| D-11 | delete-3 / paste-at-end renumber acceptance | **manual real-browser** (Ben's scenario) | perform the exact delete/paste flow, watch numbers + caret + undo | ❌ human-verify gate |

**Design the pure string transforms (toggle, auto-format, indent, renumber) as side-effect-free functions** taking `(value, selStart, selEnd)` → `{value, selStart, selEnd, replacementRange}` so they are unit-testable in the node runner; the thin `execCommand` wrapper applies the result in the browser. This maximizes automated coverage of the logic while isolating the un-testable-in-jsdom parts to a small verified shim.

### Sampling Rate
- **Per task commit:** quick node run of the pure-transform unit tests.
- **Per wave merge:** full suite incl. Phase 45 MdRender↔PDF agreement tests (extended for italic).
- **Phase gate:** full suite green + the manual real-device/real-PDF checklist signed off before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `test/text-edit.*` — pure toggle/insert transform tests (RTXT-01)
- [ ] `test/list-mechanics.*` — auto-format continuation/exit, indent/outdent, renumber (RTXT-03/05, D-10/D-11)
- [ ] Extend Phase 45 MdRender↔PDF agreement test for the new `{text,bold,italic}` segment model (D-13)
- [ ] Confirm the existing runner's entrypoint/command (STATE shows Phase 45 shipped such tests — reuse, don't duplicate)

## Security Domain

`security_enforcement` is not disabled; assessed for this stack.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Offline local-only app; no auth surface in this phase |
| V3 Session Management | no | No server session |
| V4 Access Control | no | Single-user local device |
| V5 Input Validation / Output Encoding | **yes** | The ONLY security-relevant surface: rendered note markdown MUST go through `MdRender.render` (escape-first) — never raw `innerHTML` (preview pane, Step-2 preview). Already the shipped contract; the new preview pane must honor it. |
| V6 Cryptography | no | No new crypto (encrypted backup untouched; markdown-at-rest carries verbatim) |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored-XSS via crafted note content rendered in preview | Tampering / Elevation | Route 100% of preview rendering through `MdRender.render`; assert no `innerHTML = rawValue` path in the new toolbar/preview code |
| Font asset tampering (vendored base64) | Tampering | Vendor Rubik-Italic from the official googlefonts source; SW-precache; integrity via deploy-stamped token (existing) |

## Sources

### Primary (HIGH confidence)
- MDN `Document.execCommand()` — deprecation status + undo-buffer preservation note [https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand]
- mdn/content issue #40245 — "execCommand has valid use cases without viable alternatives" (undo/redo) [https://github.com/mdn/content/issues/40245]
- googlefonts/rubik README + "Fixing Rubik's Hebrew" (Meir Sadan revision; 5-weight Roman+Italic, Latin/Cyrillic/Hebrew) [https://github.com/googlefonts/rubik]
- In-repo source (read this session): `assets/pdf-export.js` (registerFonts ~237, drawSegmentedLine ~1030, parseInlineBold ~448), `assets/add-session.js` (autoGrow contract header + read-mode), `assets/snippets.js` (`.value =` insertion at line 403–408), `assets/md-render.js` (bold/italic regex lines 28–29), `assets/export-modal.js` (Step-2 preview/switcher ~558)

### Secondary (MEDIUM confidence)
- Firefox bugzilla 1220696 — historical `insertText` textarea quirk (now resolved on current Firefox)
- Pale Moon forum + codestudy.net — corroborate cross-browser `insertText` undo-preservation behavior

### Tertiary (LOW confidence)
- Payload-size estimate for a Rubik-Italic subset (A1) — must be measured before locking D-13

## Metadata

**Confidence breakdown:**
- Undo-safe insertion (execCommand): HIGH — vendor docs + in-repo precedent (snippets shows the anti-pattern)
- List mechanics / renumber: HIGH — standard textarea string math, pure-function-testable
- PDF italic feasibility (D-13): MEDIUM-HIGH on mechanism (jsPDF italic style + Rubik italic exist), MEDIUM on payload (subset size unmeasured, A1) and Hebrew-italic appearance (A2)
- D-20 native-undo button triggering: MEDIUM — needs real-device confirmation (A4)
- Integration (autoGrow/snippets/RTL/preview): HIGH — read directly from source

**Research date:** 2026-07-14
**Valid until:** ~2026-08-14 (stable domain; execCommand won't change, Rubik/jsPDF stable). Re-measure the font subset (A1) before locking D-13 regardless.
