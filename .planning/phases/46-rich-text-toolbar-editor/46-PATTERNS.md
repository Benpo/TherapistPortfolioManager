# Phase 46: Rich-Text Toolbar Editor - Pattern Map

**Mapped:** 2026-07-14
**Files analyzed:** 8 (2 new modules, 1 new font asset, 5 edits)
**Analogs found:** 7 / 8

All new files follow the repo's **vanilla IIFE `window.*` module, zero-build/zero-npm** convention. The single genuinely-new primitive (undo-safe insertion via `execCommand('insertText')`) has NO existing analog — `snippets.js` demonstrates the *anti-pattern* (`.value =`) to consciously improve on. Everything else copies a shipped in-repo pattern.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `assets/text-edit.js` (NEW) | utility (shared insertion chokepoint) | transform | `assets/snippets.js` (`insertExpansion`) | role-match (analog is the anti-pattern to improve) |
| `assets/rich-toolbar.js` (NEW) | component (focus-attached toolbar) | event-driven | `assets/snippets.js` (popover module) + `assets/add-session.js` (autoGrow contract) | role-match |
| `assets/add-session.js` (EDIT) | controller (form page) | event-driven | itself (autoGrow/setReadMode host) | self / exact |
| `assets/export-modal.js` (EDIT) | controller (modal flow) | request-response | itself (Step-2 switcher + `exportUpdatePreview`) | self / exact |
| `assets/pdf-export.js` (EDIT, D-13) | service (PDF gen) | transform / batch | itself (`registerFonts`, `parseInlineBold`, `drawSegmentedLine`) | self / exact |
| `assets/fonts/rubik-italic-base64.js` (NEW, D-13) | config (vendored font asset) | file-I/O | `assets/fonts/heebo-base64.js` | exact |
| `tests/46-*.test.js` (NEW) | test | — | `tests/45-pipeline-agreement.test.js` | exact |
| `assets/app.css` + `tokens.css` + `i18n-{en,he,de,cs}.js` (EDIT) | config/style | — | existing modal/token/i18n patterns | exact |

## Pattern Assignments

### `assets/text-edit.js` (NEW — undo-safe insertion chokepoint)

**Analog:** `assets/snippets.js` `insertExpansion` (lines 407–418) — shows exactly what NOT to do (`.value =` wipes undo) and the synthetic-input fallback pattern to keep for the rare `execCommand` failure branch.

**Anti-pattern to replace (snippets.js:407–418):**
```javascript
function insertExpansion(textarea, start, end, snippet, appendSpace) {
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const insertion = expansion + (appendSpace ? " " : "");
  textarea.value = before + insertion + after;   // ← DESTROYS native undo
  const caret = start + insertion.length;
  textarea.setSelectionRange(caret, caret);
  try { textarea.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) {}
}
```

**Correct pattern to build (RESEARCH.md Pattern 1):** `editInsert(ta, start, end, replacement)` → `setSelectionRange` then `document.execCommand('insertText', false, replacement)`; keep the value-splice + manual `dispatchEvent(new Event('input',{bubbles:true}))` ONLY as the `!ok` fallback. Comment WHY `execCommand` is used despite the deprecation banner (so a future cleanup does not "modernize" it into `setRangeText` and silently break undo).

**Module header convention** (copy `snippets.js` header shape, lines 1–20): OWNS / PUBLIC SURFACE / DEPENDENCIES / CONSTRAINTS block, then `window.TextEdit = (function () { "use strict"; ... })();` with a `__testExports` seam for pure helpers.

**Pure-function design (RESEARCH §Validation):** transforms `toggle/autoformat/indent/renumber` are side-effect-free `(value, selStart, selEnd) → {value, selStart, selEnd, replacementRange}`, unit-testable in the node runner; the thin `editInsert` shim applies the result in-browser. `toggleWrap` and `currentLine` reference implementations are in RESEARCH.md §Code Examples (lines 279–308).

---

### `assets/rich-toolbar.js` (NEW — focus-attached toolbar, `window.RichToolbar`)

**Analog:** `assets/snippets.js` (popover-over-textarea module: bind/unbind, keyboard nav, caret-anchored positioning) + `assets/add-session.js` autoGrow composition contract.

**Composition contract to honor (add-session.js header, lines 33–41 + 60–68):**
```
// The autoGrow handler never mutates .value and never calls
// preventDefault/stopPropagation, so handler order is irrelevant.
```
All toolbar edits route through `TextEdit.editInsert`, which fires a REAL `input` event that autoGrow (line 66) AND the snippets `input` listener observe naturally — no synthetic dispatch, no double-fire (RESEARCH Pitfall 1). This is the RTXT-09 danger zone.

**Focus tracking:** track `document.activeElement ∈ 7 note fields` (`trappedEmotions, heartShieldEmotions, insights, limitingBeliefs, additionalTech, customerSummary, comments` — see add-session.js:813+). Dock above the focused field; hide on blur out of the set.

**RTL positioning (repo memory, RESEARCH anti-pattern):** position the docked toolbar and the "Text ▾" heading-dropdown popover with PHYSICAL `left`/`top` from `getBoundingClientRect` — NEVER logical `inset-inline-*` (mirrors wrongly in RTL). Same rule snippets' popover follows.

**Preview pane (D-05, RTXT-04):** reuse `MdRender.render` into a `.note-rendered` (Phase 45) pane below the textarea; debounced. NEVER raw `innerHTML` of raw value — the escape-first renderer only (V5 security control).

**Keydown routing (D-09/D-10, RTXT-02/03):** anchor Enter/Tab/Ctrl+B/I on `keydown` (NOT `beforeinput` — iOS Safari inconsistent, RESEARCH Pitfall 2). `preventDefault` only on list lines for Tab (no keyboard trap on ordinary text).

---

### `assets/export-modal.js` (EDIT — Step-2 redesign, D-03/D-08/D-16/D-17/D-18)

**Analog:** itself. The Step-2 swap-switcher (D-08 KEEPS this — do not convert to live pane) and preview wiring already exist.

**Preview render pattern to reuse (export-modal.js `exportUpdatePreview`, lines 558–569):**
```javascript
if (window.MdRender && typeof window.MdRender.render === "function") {
  // MdRender.render escapes HTML before structural rules — safe to assign.
  preview.innerHTML = window.MdRender.render(editor.value);
} else {
  preview.textContent = editor.value;
}
```

**Mobile swap pattern to extend (export-modal.js `exportApplyMobileTabs`, lines 570+):** the existing `matchMedia("(max-width: 768px)")` tab-swap is the base for D-17 full-screen takeover and the D-08 desktop Edit/Preview switch.

**Full toolbar mount:** mount `RichToolbar` (headings included, D-03) over `#exportEditor`. Add the info-styled ephemeral-edit note (D-03) using existing token colors. The `#exportEditor`/`#exportPreview` IDs are the mount points.

**Step-2 markdown source (buildSessionMarkdown, lines 171+):** unchanged; note that its `#`/`##` document headings share the Step-2 surface with note content (D-03 whole-document edits are intentional).

---

### `assets/pdf-export.js` (EDIT — D-13 true italic, feasibility-gated)

**Analog:** itself — three shipped seams extend cleanly:

**1. Font registration (registerFonts, lines 250–262)** — add one line mirroring the Bold branch, registering Rubik-Italic bytes UNDER family `'Heebo'`, style `'italic'` so the renderer only ever calls `setFont('Heebo', style)`:
```javascript
if (typeof window.HeeboBold === "string" && window.HeeboBold.length > 0) {
  doc.addFileToVFS("HeeboBold.ttf", window.HeeboBold);
  doc.addFont("HeeboBold.ttf", "Heebo", "bold");
}
// D-13 ADD (mirror): register Rubik-Italic bytes under 'Heebo'/'italic'
//   doc.addFileToVFS("RubikItalic.ttf", window.RubikItalic);
//   doc.addFont("RubikItalic.ttf", "Heebo", "italic");
```

**2. Segment model (parseInlineBold, lines 448+)** — currently STRIPS italic (`*X* → X`) into the surrounding regular segment. Extend `{text, bold}` → `{text, bold, italic}`. Preserve the **strip-equivalence INVARIANT** (docstring lines 455–465): `parseInline(x).map(s=>s.text).join('') === stripInlineMarkdown(x)` — the bidi map depends on it byte-for-byte.

**3. Draw loop (drawSegmentedLine, lines 1030–1075)** — add a parallel `styleByLogical` Uint8Array beside `weightByLogical` (line 1039); break runs on EITHER weight OR style changing; `setFont('Heebo', style)` per run where `style` ∈ {normal, bold, italic}. `getStringUnitWidth` already re-measures per run (line 1068) so width stays correct across the family switch.

**Bidi invariant:** italic runs must pass through the SAME `shapeForJsPdfWithMap` (line 1046) — do not bypass. Phase 23 pipeline stays intact.

---

### `assets/fonts/rubik-italic-base64.js` (NEW, D-13 if feasible)

**Analog:** `assets/fonts/heebo-base64.js` (exact). Copy the header comment shape (SIL OFL 1.1 license line + Source + Upstream googlefonts URL, lines 1–3), then `window.RubikItalic = "…base64…";`. Add to `sw.js` PRECACHE_URLS beside `heebo-*-base64.js` so offline export finds it (RESEARCH §Runtime State — Build artifacts). Lazy-loads only during export.

**Feasibility gate (RESEARCH Open Q1, A1):** subset Latin+Hebrew first; GREEN ≤ ~90 KB base64, AMBER ~90–140 KB (Ben decides), RED > ~140 KB → D-14 fallback (flatten + tooltip + note). Ben confirms threshold at plan review.

---

### `tests/46-*.test.js` (NEW)

**Analog:** `tests/45-pipeline-agreement.test.js` (exact). Runner: `node tests/run-all.js` (auto-discovers `tests/*.test.js`, per-file child process, exit-0/1 contract). jsdom bridged via `JSDOM_PATH`.

- Pure-transform unit tests (`toggleWrap`, auto-format, indent, renumber) — node, no jsdom (RTXT-01/03/05).
- EXTEND `45-pipeline-agreement.test.js` for the new `{text,bold,italic}` segment model and the join-invariant fuzz (D-13) — extend, do NOT duplicate.
- Caret/undo/paste/PDF/RTL behavior is **jsdom-blind** → manual real-device gate (Safari desktop + iOS PWA + Chrome + Firefox + real opened-PDF). Repo has shipped false-GREEN jsdom PDF tests before.

## Shared Patterns

### Undo-safe text mutation (the keystone)
**Source:** NEW `assets/text-edit.js`, replacing the `snippets.js:407` anti-pattern.
**Apply to:** toolbar toggle/insert, auto-format continuation/exit, indent/outdent, auto-renumber, undo/redo buttons (D-20 → `execCommand('undo'/'redo')`, native-first; single module stack only if a target browser refuses programmatic native undo — NEVER dual-stack, Pitfall 3).
```javascript
textarea.focus();
textarea.setSelectionRange(start, end);
document.execCommand('insertText', false, replacement); // keeps native undo + fires real input
```

### Module shape
**Source:** `assets/snippets.js` lines 21–22, header block lines 1–20.
**Apply to:** `text-edit.js`, `rich-toolbar.js` — IIFE `window.X = (function(){ "use strict"; ... __testExports ... })();`, OWNS/PUBLIC/DEPENDENCIES/CONSTRAINTS header.

### Escape-first preview rendering (V5 security control)
**Source:** `export-modal.js` `exportUpdatePreview` (lines 561–567).
**Apply to:** every preview surface (new per-field pane + Step-2). Route 100% through `MdRender.render`; assert no `innerHTML = rawValue` path exists in new code.

### autoGrow / snippets composition
**Source:** `add-session.js` header (33–41) + `autoGrow` (66–70).
**Apply to:** all `rich-toolbar.js` edits — rely on the real `input` event from `execCommand`; never `preventDefault` on ordinary-text input; verify field still grows and `;trigger` still expands after a toolbar insert.

### RTL physical-coordinate positioning
**Source:** repo memory (`reference-rtl-logical-props-physical-coords.md`) + snippets popover.
**Apply to:** docked toolbar + heading "Text ▾" dropdown — physical `left`/`top`, never `inset-inline-*` from a rect.

### i18n four-locale rule
**Source:** existing `i18n-{en,he,de,cs}.js` + export-modal `App.t(...)` keys (lines 546–554).
**Apply to:** all new tooltips (`Undo (Ctrl+Z)` etc.), info note, preview labels — EN/DE/HE/CS. Toolbar icons stay language-independent (D-14). Note the docs-gate: locale files are changelog-only tier; the **EN help topic** (Sessions & Notes, read `HELP-MAP.md` cold) + `changelog-content-en.js` are the real push-time demands.

## No Analog Found

| File / concern | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `editInsert` via `execCommand('insertText')` | utility | transform | No existing undo-preserving insertion exists in the repo; `snippets.js` uses the `.value =` anti-pattern. This primitive is genuinely new (though snippets can later adopt it). |

## Metadata

**Analog search scope:** `assets/` (add-session, export-modal, snippets, md-render, pdf-export, fonts, css), `tests/`, `scripts/`.
**Files scanned:** 11 (targeted reads; no full-file loads of the 2140-line pdf-export or 5337-line app.css).
**Pattern extraction date:** 2026-07-14
</content>
</invoke>
