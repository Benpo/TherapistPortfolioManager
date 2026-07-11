# Feature Research

**Domain:** Minimal rich-text note editing + list reordering for a zero-dependency, offline-first, RTL-capable therapist notes PWA (Sessions Garden v1.4 "Richer Sessions")
**Researched:** 2026-07-11
**Confidence:** HIGH (domain patterns are mature and cross-verified; app-specific integration risks drawn from the project's own docs)

> **Scope note.** This file covers ONLY the two new v1.4 features: (1) a *minimal* rich-text editor for session note sections, and (2) drag/reorder of session sections in Settings. It is written against three hard project constraints that eliminate most of the "obvious" market answers: **zero npm runtime dependencies**, **IndexedDB-only / no server / fully offline**, and **Hebrew RTL as a first-class locale**. Those constraints are why heavyweight editors (TipTap/Quill/ProseMirror/CKEditor) and server-side sanitization are off the table before we even start. The driving user complaint: "only simple text in the session window" — they want bullet points, bold, underline "and so on."

---

## The one decision that governs everything: storage format

Every downstream question (export, XSS, backup, snippets, undo) collapses onto a single choice: **what do we persist in IndexedDB for a formatted section — Markdown text, or an HTML fragment?**

| | **Markdown-at-rest (recommended)** | HTML-at-rest |
|---|---|---|
| Markdown copy/export (already shipped) | Near-passthrough — trivial | Must serialize HTML→MD anyway |
| PDF pipeline | Parse MD→styled runs (bounded grammar) | Parse arbitrary HTML→runs |
| XSS surface at rest | Effectively none (plain text) | Real — needs sanitize on every render |
| Backup `.sgbackup` | Plain text, human-readable, diff-safe | Opaque HTML blob |
| Snippets engine (inserts plain text) | Just works | Needs HTML-aware insertion |
| **Underline** | **No Markdown syntax exists — blocker** | Native `<u>` |
| Editing surface for non-technical users | Still needs WYSIWYG (they won't type `**`) | WYSIWYG native |

**Opinionated recommendation:** store **Markdown**, edit through a **WYSIWYG `contenteditable` surface** that serializes its constrained DOM to Markdown on save. This keeps the export/copy/backup paths cheap and the at-rest data safe, while giving therapists buttons (not syntax). The one snag is **underline** (below) — the single requested feature Markdown cannot express. Resolve that explicitly in requirements; do not let it silently pick the storage format for us.

**Editor tech under the zero-dep rule.** `document.execCommand` is officially deprecated/obsolete but still ships in every browser and is the *only* zero-dependency way to toggle bold/italic/lists inside `contenteditable` without hand-writing a Selection/Range engine. Its modern replacements either aren't cross-browser (the **EditContext API** is Chromium-only as of 2026 — absent from the Safari/WebKit path this app must support) or imply a framework we cannot add (a Slate-style JSON model). **Pragmatic call:** `contenteditable="true"` + `execCommand` for the toggle actions, plus our own Markdown serializer and our own paste sanitizer — accept execCommand's "deprecated but universal" status as a known, contained risk. Keep the formatting grammar tiny so a future swap to a Range-based engine stays bounded.

---

## Feature Landscape — Rich-text editor

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Bold** | The literal ask; universal in Notes/WhatsApp/Word | LOW | Markdown `**`. `execCommand('bold')`. |
| **Italic** | Natural pairing with bold; universal | LOW | Markdown `*`. Same toolbar. |
| **Bullet list** | The literal ask ("bullet points") | MEDIUM | Markdown `- `. Lists are the fiddliest contenteditable behavior (nesting, exit-on-empty-line, backspace-merge) — budget more than bold/italic. |
| **Visible toolbar** | Non-technical therapists will NOT know Ctrl+B or Markdown syntax; buttons are the discoverable path | LOW–MEDIUM | 3–5 icon buttons above/inside the field; must reflect active state (bold lit when caret is in bold). |
| **Keyboard shortcuts (Ctrl/Cmd+B/I/U)** | Muscle memory from every editor; cheap accelerator | LOW | Additive to the toolbar, not a replacement. |
| **Paste sanitization (Word/WhatsApp/web)** | Users WILL paste from elsewhere; raw paste injects font/color/span garbage that breaks the PDF brand and bloats storage | **HIGH** | The biggest quality risk in the whole feature. Intercept `paste`, strip to the allowed subset (or plain text + re-map bold/italic/lists). Also the real XSS entry point in an offline app — a pasted `<script>`/`onerror` must never survive. |
| **Native undo/redo (Ctrl+Z / Ctrl+Y)** | Assumed in any text field | MEDIUM | `execCommand` participates in the native undo stack; heavy custom `beforeinput` interception can *break* it — a classic contenteditable regression. Verify undo after every custom handler. |
| **Formatting survives PDF export** | The user's whole point — plain text in the window is the complaint; a PDF that flattens it repeats the complaint | **HIGH** | The PDF pipeline *deliberately strips* inline markdown today (PROJECT.md) — this milestone reverses that. Must render bold/italic/list runs through the existing jsPDF + bidi path. |
| **Formatting survives Markdown copy/export** | Copy output is a shipped feature; losing formatting on copy is a regression | LOW (if MD-at-rest) | Falls out for free under Markdown storage; non-trivial under HTML storage. |
| **Works in Hebrew RTL** | HE is a shipped first-class locale | MEDIUM | Bold/italic are direction-agnostic; **list bullets must sit on the right** in RTL and the PDF bidi path must format *runs*, not just whole paragraphs. Mixed-direction content is where RTL bugs hide (see project RTL memory notes). |
| **Touch-usable toolbar** | Therapists use phones/tablets; selection + formatting must work on iOS Safari | MEDIUM | Large tap targets; iOS Safari contenteditable has known caret/selection/autocorrect quirks — field-test on a real iPhone (the app already has this discipline). |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Underline** | Explicitly requested ("bold, underline… and so on"); honoring the literal ask matters | MEDIUM | **No Markdown equivalent.** Options: (a) `<u>…</u>` passthrough inside otherwise-Markdown text, (b) HTML-at-rest, (c) drop it. Also a mild UX anti-pattern (confusable with links) — but the user asked, so surface the tradeoff and let Ben choose rather than silently substituting (per the project's "implement the literal UX directive" memory note). |
| **Numbered list** | Natural completion of "bullet points"; low marginal cost once bullet lists exist | MEDIUM | Markdown `1.`. Shares ~all list machinery with bullets. |
| **Markdown auto-format ("- " → bullet, "**x**" → bold)** | Delights the minority who know Markdown; feels "smart" | MEDIUM–HIGH | `beforeinput` pattern-matching. Real risk for non-technical users: *surprise* transforms and undo confusion. Ship AFTER the toolbar is solid, gated behind good undo. Differentiator, not table stakes. |
| **Active-format toolbar state on selection** | Tells the user "you're in a bullet / this is bold" — makes the toolbar feel real | MEDIUM | `selectionchange` → `queryCommandState`. Polishes perceived quality. |
| **Clear-formatting button** | Recovery valve after a messy paste | LOW | `removeFormat` + list-unwrap. Cheap insurance given paste is the risk. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested / Appeal | Why Problematic (for THIS app / these users) | Better Approach |
|---------|------------------------|-----------------------------------------------|-----------------|
| **Third-party editor (TipTap/Quill/ProseMirror/CKEditor)** | "Just use a real editor" | Violates the zero-runtime-dependency rule (100s of KB); breaks the ~50KB offline bundle and the simplicity value prop | Hand-rolled `contenteditable` + tiny serializer |
| **Full WYSIWYG / font family & size pickers** | "Make it like Word" | Overwhelms non-technical therapists; destroys PDF brand consistency; huge surface | Fixed brand typography; only bold/italic/underline/lists |
| **Text & highlight colors** | Feels expressive | Clinical notes don't need color; breaks the garden PDF palette; contrast/a11y + storage complexity | Omit |
| **Headings / heading levels** | "Structure my notes" | The ~9 named sections ALREADY provide structure; headings add Markdown+PDF complexity for redundant hierarchy | Rely on existing sections |
| **Tables** | "Organize data" | Brutal in contenteditable AND in the PDF layout engine; not asked | Bullet/numbered lists |
| **Inline images / media** | "Attach a picture" | IndexedDB bloat + PDF layout; explicitly Out of Scope in PROJECT.md (no attachments beyond client photo) | Out of scope |
| **Hyperlinks** | "Link to a resource" | Underline/link confusion; paste-phishing surface; private notes rarely need it | Plain URLs as text |
| **Markdown *syntax* as the editing interface** (make users type `**bold**`) | Cheapest to build | Non-technical therapists won't learn syntax — the whole point is buttons | WYSIWYG toolbar that *emits* Markdown |
| **Collaborative / real-time editing** | "Modern editors have it" | Explicitly Out of Scope — local-only is the core value | N/A |

---

## Feature Landscape — Section reordering (Settings)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Reorder mechanism that works on touch + keyboard** | WCAG 2.2 SC 2.5.7 ("Dragging Movements") requires a **non-drag** path; therapists are on phones; a11y matters | LOW (arrows) | **Up/Down arrow buttons per row are the strong recommendation:** zero-dep, robust on touch, keyboard/screen-reader friendly, RTL-safe, no HTML5-DnD cross-browser pain. The simplest thing that fully satisfies the requirement. |
| **New order propagates to add-session AND edit-session forms** | Reordering that doesn't change the actual form is pointless | MEDIUM | Same propagation path as the shipped 22-14.3 rename. |
| **New order drives export/copy builders** | Order divergence between form and export is a *known shipped bug class* | MEDIUM | **HARD DEPENDENCY / regression guard:** quick-fix **260615** hardcoded `buildSessionMarkdown` / `buildFilteredSessionMarkdown` to the static DOM order. This feature MUST repoint both to the saved `sectionOrder`, and flip `tests/quick-260615-export-section-order.test.js` from "export == static DOM" to "export == saved order". Miss this and the 260615 bug returns. |
| **Persists across refresh + locale switch** | Settings are expected to stick | LOW | Same `therapistSettings.{locale}` IDB record that already holds rename+toggle, or a sibling `sectionOrder` array (open question — see Dependencies). |
| **Existing session DATA is untouched by reordering** | Users expect changing display order not to mutate their notes | LOW (by design) | Sessions store field values **keyed by section id, not by position**, so reorder is presentation-only — **no data migration**. Already-generated PDFs are static artifacts and correctly stay as-is. State this explicitly so no one "migrates" anything. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Drag-and-drop with a grip handle (⠿)** | The "expected" modern gesture on desktop; feels premium | MEDIUM–HIGH | Layer ON TOP of arrows, never instead. Use a **dedicated handle**, not full-row drag (full-row conflicts with selecting/renaming text in the row's input). Pointer Events for touch long-press; native HTML5 DnD is desktop-mouse-centric and awkward on touch + RTL. |
| **Keyboard pickup/move (Space=grab, ↑↓=move, Esc=cancel)** | Best-in-class a11y | MEDIUM | Nice, but up/down buttons already meet WCAG cheaply — treat as polish. |
| **"Reset order to default" button** | Recovery after experimentation | LOW | Mirrors the existing per-row "Revert" rename affordance. |

### Anti-Features

| Anti-Feature | Why Requested | Why Problematic | Better Approach |
|--------------|---------------|-----------------|-----------------|
| **Drag-and-drop as the ONLY reorder path** | "Everyone drags" | Fails WCAG 2.2 SC 2.5.7; painful on touch; fragile in RTL + across Safari/Chromium | Arrows as primary; drag as optional enhancement |
| **A drag library (SortableJS etc.)** | "Solved problem" | Violates zero-dep rule | Hand-rolled arrows (+ optional Pointer-Events drag) |
| **Free-form / 2-D positioning** | "Total control" | Sections are a 1-D list; over-engineered | Simple vertical order |

---

## Feature Dependencies

```
Rich-text editor (contenteditable surface)
    ├──REPLACES──> plain <textarea>  ──breaks──> Snippets engine (caret popover inserts into textarea)
    │                                └──breaks──> Autogrow (textarea-height logic; contenteditable self-sizes)
    ├──requires──> Storage-format decision (Markdown vs HTML)  ──governs──> everything below
    ├──requires──> Paste sanitizer (XSS + brand safety)
    ├──feeds──> PDF export (must render runs + bidi; reverses today's strip-markdown behavior)
    ├──feeds──> Markdown copy/export (cheap iff Markdown-at-rest)
    └──feeds──> Backup/restore (.sgbackup serialization of formatted content)

Underline ──conflicts──> Markdown-at-rest (no MD syntax for underline)

Section reorder (Settings)
    ├──requires──> existing section rename/toggle IDB record (co-located persistence)
    ├──drives──> add/edit session forms (propagation path 22-14.3)
    └──drives──> export/copy builders  ──guards──> 260615 bug (order divergence)

Markdown auto-format ──enhances──> Rich-text editor (ship after toolbar + undo are solid)
```

### Dependency Notes

- **Editor breaks Snippets + Autogrow (highest integration risk).** The snippet quick-paste engine and autogrow are both coupled to `<textarea>`. Swapping any section to `contenteditable` breaks caret-popover insertion and height logic. Requirements must decide: migrate snippet insertion to a Range-based insert into contenteditable, and drop autogrow (contenteditable grows natively). Verify the trigger-prefix popover still positions correctly over a contenteditable caret.
- **Underline conflicts with Markdown storage.** The cleanest storage choice cannot represent the one differentiator the user named. Decide deliberately (HTML-at-rest, `<u>` passthrough, or drop underline) — don't let it get decided implicitly.
- **Reorder drives the export builders (260615).** Non-negotiable coupling; the guard test must be flipped in the same phase.
- **Reorder does NOT depend on the editor** and vice-versa — the two features are independently shippable and could be separate phases.
- **Open questions carried from the drag-sort todo** (for requirements): (1) persistence shape — reuse `therapistSettings.{locale}` vs a new `sectionOrder` array; (2) disabled sections — keep their order slot, or sink to a "hidden" group at the bottom; (3) a single "reset order" button.

---

## MVP Definition

### Launch With (v1.4 core)
- [ ] **Storage-format decision made** (Markdown-at-rest recommended) — unblocks all else
- [ ] **Bold + Italic + Bullet list**, via **toolbar + keyboard shortcuts** — the literal ask
- [ ] **Paste sanitization** to the allowed subset — mandatory quality/XSS gate
- [ ] **Formatting survives PDF + Markdown export**, verified in **Hebrew RTL** — the point of the feature
- [ ] **Snippets + autogrow migration** resolved so no existing capability regresses
- [ ] **Section reorder via Up/Down arrow buttons**, propagated to forms + export builders, **260615 guard flipped**

### Add After Validation (v1.4 stretch / fast-follow)
- [ ] **Underline** + **Numbered list** — completes "…and so on" (underline pending the storage-format call)
- [ ] **Clear-formatting** button + active-format toolbar state
- [ ] **Drag-and-drop reorder** (grip handle) layered over the arrows

### Future Consideration (v1.5+)
- [ ] **Markdown auto-format shortcuts** — only once undo is bulletproof
- [ ] **Keyboard pickup/move reorder** — polish beyond WCAG-minimum arrows

## Feature Prioritization Matrix

| Feature | User Value | Impl. Cost | Priority |
|---------|------------|------------|----------|
| Storage-format decision | HIGH | LOW (decision) | P1 |
| Bold / Italic | HIGH | LOW | P1 |
| Bullet list | HIGH | MEDIUM | P1 |
| Toolbar + shortcuts | HIGH | LOW–MED | P1 |
| Paste sanitization | HIGH | HIGH | P1 |
| PDF/MD/RTL preservation | HIGH | HIGH | P1 |
| Snippets/autogrow migration | HIGH (avoids regression) | MEDIUM | P1 |
| Section reorder (arrows) + export coupling | HIGH | MEDIUM | P1 |
| Underline | MEDIUM | MEDIUM | P2 |
| Numbered list | MEDIUM | MEDIUM | P2 |
| Clear-format / active state | MEDIUM | LOW | P2 |
| Drag-and-drop reorder | MEDIUM | MED–HIGH | P2 |
| Markdown auto-format | LOW–MED | MED–HIGH | P3 |
| Keyboard pickup/move reorder | LOW | MEDIUM | P3 |

**Priority key:** P1 = must have for v1.4 launch · P2 = should have, add when capacity allows · P3 = future consideration

## Competitor / Analog Feature Analysis

| Aspect | Apple Notes / Bear | WhatsApp / chat | Clinical EHR note fields | **Our Approach** |
|--------|--------------------|-----------------|--------------------------|------------------|
| Formatting set | Bold/italic/underline/lists/headings | Bold/italic/strike (markdown-ish) | Often plain or minimal | Bold/italic/underline/bullets/numbered — no headings/color/tables |
| Interface | Toolbar + shortcuts + auto-format | Type markdown syntax | Toolbar | **Toolbar-first** (buttons), shortcuts as accelerator, auto-format deferred |
| Storage | Proprietary/HTML | Plain text w/ markers | HTML/RTF | **Markdown-at-rest** (recommended) |
| Reorder pattern | Drag handle (desktop), long-press (touch) | n/a | Up/down or drag | **Up/down arrows primary**, drag optional |
| Paste handling | Sanitizes to app style | Strips to plain | Varies | **Sanitize to allowed subset** |

## Sources

- [MDN: Document.execCommand() — deprecated/obsolete](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand)
- [execCommand() is Obsolete: What's the Modern Alternative? (EditContext, Selection/Range)](https://www.codestudy.net/blog/execcommand-is-now-obsolete-what-s-the-alternative/)
- [TinyMCE: Using HTML contenteditable to build a rich text editor](https://www.tiny.cloud/blog/using-html-contenteditable/)
- [neworbit: Using Markdown Securely (markdown vs HTML storage, XSS)](https://www.neworbit.co.uk/blog/post/using-markdown-securely/)
- [Syncfusion: Preventing XSS in a rich text editor (paste sanitization)](https://www.syncfusion.com/blogs/post/react-rich-text-editor-xss-prevention)
- [Sparkbox: Understanding & Implementing WCAG 2.2 SC 2.5.7 Dragging Movements](https://sparkbox.com/foundry/understanding_implementing_wcag_dragging_movements_accessibility)
- [Smashing Magazine: Accessible List Reordering (up/down buttons + drag)](https://www.smashingmagazine.com/2018/01/dragon-drop-accessible-list-reordering/)
- [Adobe React Spectrum: Accessible drag and drop (keyboard pickup/move, touch)](https://react-spectrum.adobe.com/blog/drag-and-drop.html)
- Project docs (HIGH-confidence, app-specific): `.planning/PROJECT.md` (zero-dep/RTL/offline constraints, PDF strips markdown today, Out-of-Scope attachments); `.planning/todos/pending/2026-05-13-drag-sort-settings-categories.md` (reorder scope + the **260615** export-order coupling and guard test)

---
*Feature research for: minimal rich-text editing + section reordering, zero-dependency offline RTL PWA (Sessions Garden v1.4)*
*Researched: 2026-07-11*
