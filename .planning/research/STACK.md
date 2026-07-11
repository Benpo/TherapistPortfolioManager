# Stack Research — v1.4 "Richer Sessions"

**Domain:** Rich-text session notes + drag-sort section reordering in a zero-runtime-dependency, offline-first, RTL-capable PWA (Sessions Garden)
**Researched:** 2026-07-11
**Confidence:** HIGH

## Headline recommendation

**Ship rich text as a Markdown-string editor, not a contenteditable WYSIWYG. Ship drag-sort with hand-rolled Pointer Events, not HTML5 native DnD. Zero new vendored runtime dependencies are required for either feature.** The existing stack already carries ~80% of the machinery: `window.MdRender` (escape-first Markdown→HTML), the caret-aware snippet engine wired into the session textareas, autogrow textareas, the copy/markdown export (already emits Markdown), and — the decisive find — `assets/pdf-export.js` **already parses inline `**bold**` into `{text, bold}` styled runs and renders them as Heebo Bold**. The PDF path is already a Markdown-run renderer; v1.4 extends its style set, it does not rebuild it.

The single genuinely new vendored asset *worth considering* is a **Heebo Italic** font file — and only if italic must render as true italic inside Hebrew PDFs (typographically dubious; see caveat). No JavaScript library needs vendoring.

---

## Recommended Stack

### Core approach decisions

| Decision | Choice | Version / Status | Why it fits the constraints |
|----------|--------|------------------|-----------------------------|
| Rich-text editing model | **Markdown textarea + formatting toolbar + live preview** | Native platform APIs | Reuses `MdRender`, snippet caret engine, autogrow, copy-export, and the PDF run-parser. XSS-safe *by construction*. RTL "just works" in a `<textarea>`. Zero new deps. |
| Toolbar selection-wrapping API | **`textarea.setRangeText(replacement, start, end, "select")`** | Baseline in all modern browsers incl. iOS Safari (14.1+) | Replaces deprecated `document.execCommand('bold')` entirely. Wraps the selection in `**…**` / `++…++` / `- ` and re-selects. No `contenteditable`, no `execCommand`. |
| Stored value format | **Markdown string** (extended subset) | — | Same plain-string column already in IndexedDB (`PortfolioDB`) and the `.sgbackup` encrypted round-trip. **No schema migration, no backup format change.** Copy-export is already Markdown. |
| Live preview renderer | **Extended `window.MdRender`** | in-house, currently ~2.7KB | Already escape-first (escapes `& < > " '` before structural regex) → output can only contain the closed tag set it emits. Extend the subset; do not replace. |
| HTML sanitization | **None required** (escape-first renderer is the whitelist) | — | Because the store is Markdown and `MdRender` escapes first, no raw user HTML ever reaches `innerHTML`. **DOMPurify is unnecessary — avoids a ~23 KB / ~8.7 KB-gzip new vendored dep.** |
| Section reorder interaction | **Hand-rolled Pointer Events sorter** (`pointerdown`/`move`/`up` + `setPointerCapture` + `touch-action:none`) | Pointer Events L2, Baseline everywhere | One code path for mouse + touch + pen. iOS-Safari-safe (HTML5 DnD is not). ~100–150 lines, no library. |
| Section-order persistence | **New `sectionOrder` array on the existing `therapistSettings.{locale}` IDB record** | — | Sits beside the rename/toggle state already there (Phase 22). One propagation path to add/edit forms **and** the two Markdown builders. |
| Pre-prod environment | **Second Cloudflare Pages project, production branch = `pre-prod`, `noindex`** | CF Pages (free) | Isolates staging env + URL from prod; keeps the `main`→`deploy`-anchor docs-gate CI untouched. |

### Extensions to `window.MdRender` (the only "library" change)

| Feature | Markdown token | Renders as | PDF run flag | Status in current code |
|---------|----------------|-----------|--------------|------------------------|
| Bold | `**x**` | `<strong>` | `bold:true` → Heebo Bold | **Already works** in MdRender *and* PDF |
| Italic | `*x*` | `<em>` | `italic:true` | MdRender: works. PDF: currently *stripped* — needs run support (see italic caveat) |
| Bullet list | `- x` / `* x` | `<ul><li>` | list block | **Already works** in both |
| Underline | `++x++` (proposed private token) | `<u>` | `underline:true` → manual jsPDF underline rule | **New** — no Markdown standard for underline (decision flagged below) |

---

## The five NEW capabilities, each resolved

### 1. Rich-text editor — approaches compared

| Approach | Verdict | Rationale |
|----------|---------|-----------|
| **(a) `contenteditable` + `execCommand`** | **REJECT** | `document.execCommand()` is **deprecated** (MDN, all vendors) — still functional but a "black box" that emits inconsistent, browser-divergent HTML. Would force vendoring **DOMPurify** (~23 KB) or relying on the still-not-universal native **HTML Sanitizer API** (`Element.setHTML`). Brings RTL caret bugs and a large XSS surface. Storage becomes arbitrary HTML (harder PDF/Markdown round-trip). Net: more code, more risk, new dep, worse fit. |
| **(a′) `contenteditable="plaintext-only"`** | **REJECT** | Now broadly supported (Safari ✓, Chrome ✓, Firefox 136+), but plaintext-only *disables* formatting — defeats the feature. |
| **(b) Markdown textarea + toolbar + live preview** | **RECOMMEND** | Reuses every existing subsystem. Formatting is stored as text → survives IndexedDB, encrypted backup, copy-export, and PDF with minimal new code. XSS-safe by construction (no sanitizer). RTL native. Selection-wrapping via `setRangeText` (no `execCommand`). |
| **(c) Hybrid (contenteditable WYSIWYG that serializes to Markdown)** | **REJECT for v1.4** | Marginal UX gain over a good toolbar; reintroduces the sanitization + `execCommand`/`beforeinput` complexity and RTL caret handling. Reasonable *future* polish once (b) ships, not now. |

**Why (b) over the "true WYSIWYG" instinct:** the customer ask is "let me bold/underline/bullet my notes," not "give me Google Docs." A toolbar over a textarea with a live preview delivers the felt need while keeping the ~50 KB zero-dep bundle and the escape-first safety model intact. `beforeinput` / Input Events Level 2 (the modern `execCommand` replacement for contenteditable) is therefore **not needed at all** on this route — it only matters if you commit to contenteditable.

**Undo nuance (implementation detail for phase):** `setRangeText` may not always join the textarea's native undo stack. If native Ctrl/Cmd-Z through toolbar edits is a requirement, use `document.execCommand('insertText', false, wrappedString)` for the insertion (the *one* `execCommand` verb still worth using because it preserves the undo buffer in a plain textarea), with `setRangeText` as fallback. This is a local choice, not an architecture change.

### 2. Sanitization — hand-rolled whitelist vs DOMPurify

**No sanitizer needed on the recommended route.** `MdRender` is escape-first: it runs `escapeHtml()` over the entire input *before* applying structural regex, so the only HTML in the output is the fixed tag set the renderer itself emits (`<strong> <em> <u> <ul> <li> <h1-3> <p> <br>`). That *is* a closed whitelist — user text can never inject a tag. Assigning `MdRender.render(value)` to `innerHTML` is already the shipping pattern in `export-modal.js:539`.

- **DOMPurify** (v3.x, ~23 KB min / ~8.7 KB gzip) would be a **new vendored runtime dep for zero benefit** here. Only justified if you go contenteditable.
- **Native HTML Sanitizer API** (`Element.setHTML()`) is emerging (shipping in Chromium; partial elsewhere) and would remove the DOMPurify need *if* contenteditable were chosen — still not needed for Markdown, and not yet reliable across installed Safari PWAs. Note as an industry trend, not a v1.4 dependency.

**Guardrail to add:** a small unit test asserting `MdRender.render('<img src=x onerror=alert(1)>++x++')` emits no `<img>`/`on*` and correctly renders the `++x++` underline — locks the escape-first invariant as the underline token is added.

### 3. Storage format — HTML vs Markdown vs JSON delta

**Markdown string. Decisively.**

| Format | IndexedDB fit | `.sgbackup` round-trip | PDF pipeline fit | Copy/MD export | Verdict |
|--------|---------------|------------------------|------------------|----------------|---------|
| **Markdown string** | Same string column, **no migration** | Plain string, **no format change** | **Already run-parsed** (`parseInlineBold`) | **Already Markdown** | ✅ Recommend |
| HTML string | New serialize/parse; sanitizer needed | Same, but bigger + fragile | Must HTML-parse → runs (new work) | Must HTML→MD downgrade | ❌ More work, new risk |
| Structured JSON delta (Slate/ProseMirror-style) | New nested schema + migration | New schema in encrypted blob | Must walk delta → runs | Must serialize delta→MD | ❌ Overkill; couples to an editor model we're not using |

Markdown also degrades gracefully: a therapist who never touches the toolbar keeps typing plain text, and old sessions render unchanged (backward-compatible — plain text is already valid Markdown-subset input).

### 4. PDF/export integration — the pipeline is already there

`assets/pdf-export.js` already:
- registers **Heebo** (normal) + **Heebo Bold** as one family, swapping via `setFont('Heebo','bold'|'normal')`;
- runs `parseInlineBold()` → `[{text, bold}]` segments and renders bold runs distinctly, **through the bidi (`bidi.min.js`, UAX#9) visual-reorder pipeline** so Hebrew stays correct;
- handles headings and lists structurally.

v1.4 work is therefore **incremental**, not new architecture:
- **Bullet lists / bold:** already survive to PDF. Verify against the new toolbar output.
- **Underline:** add an `underline` run flag; jsPDF has no native underline decoration → draw a manual rule under the measured run (`doc.line(x, y+offset, x+width, y+offset)`) using the already-computed per-run visual width. RTL-safe because the run is already visually ordered.
- **Italic caveat (flag for requirements):** true italic in PDF needs a registered italic font style. Latin has one via jsPDF's built-ins, but **Heebo ships no italic face** — Hebrew italic would require either a vendored **Heebo Italic** TTF (base64, à la `heebo-bold-base64.js`) or a synthetic oblique, and slanted Hebrew is typographically unconventional. **Recommendation:** either (i) scope italic to on-screen/preview + Latin-PDF only, or (ii) defer true-italic-in-PDF. This is the one place where "formatting survives to PDF" has a real constraint — surface it in REQUIREMENTS as an explicit decision.

### 5. Drag-sort section reordering — native DnD vs Pointer Events

| Approach | Mobile/touch | Verdict |
|----------|-------------|---------|
| **HTML5 native DnD** (`draggable=true`, `dragstart`/`dragover`/`drop`) | **Broken on touch** — iOS Safari does not fire HTML5 drag events from touch. Customers run installed Safari PWAs → this alone fails the requirement. | ❌ Reject as sole mechanism |
| **Pointer Events** (`pointerdown`/`pointermove`/`pointerup` + `setPointerCapture` + `touch-action:none` on the handle) | **Unified** mouse + touch + pen in one path; works on iOS Safari | ✅ Recommend |
| **Vendored SortableJS / dragula** | Works, but ~15–40 KB new runtime dep for a handful of section rows | ❌ Over-engineered; violates zero-dep instinct |

**Zero-dep pattern:**
- Dedicated **drag handle** (grip icon) per row, not full-row drag — keeps rows tappable/scrollable on mobile and gives a clear affordance (answers the todo's UX question #1/#3).
- `touch-action: none` on the handle so a drag doesn't scroll the page.
- `setPointerCapture(e.pointerId)` on `pointerdown` for robust tracking even if the pointer leaves the element.
- Reorder in a `requestAnimationFrame` callback; move a placeholder/gap; commit order on `pointerup`.
- **Persistence & the 260615 guard:** save to `therapistSettings.{locale}.sectionOrder`; then **switch `buildFilteredSessionMarkdown` and `buildSessionMarkdown` (`add-session.js`) from their hardcoded order to the saved order**, and update `tests/quick-260615-export-section-order.test.js` to assert `export order == saved section order`. This closes the export/form divergence bug class the todo warns about.
- RTL note: use physical coordinates from `getBoundingClientRect` for hit-testing (per the project's `reference-rtl-logical-props-physical-coords` memory), not logical insets.

### 6. Pre-prod on Cloudflare Pages

**Requirement to stand up a second CF Pages project wired to a `pre-prod` branch:**

1. Create a **new Pages project** (e.g. `sessionsgarden-preprod`) connected to the *same* GitHub repo, with its **production branch set to `pre-prod`**. Every push to `pre-prod` deploys only the staging project; `main` continues to deploy prod. (Alternatively, same project + `pre-prod` branch → auto preview at `pre-prod.<project>.pages.dev`; a separate project is cleaner for env/URL isolation and matches the milestone ask.)
2. **Build settings:** none — static assets, no build step (same as prod).
3. **Custom domain (optional):** e.g. `staging.sessionsgarden.app`; in the Pages dashboard point it at the project's `*.pages.dev` (dashboard writes the CNAME). If skipped, use the free `*.pages.dev` URL.
4. **`noindex`:** add `<meta name="robots" content="noindex">` (or a `_headers` `X-Robots-Tag: noindex`) on the staging build so Google never indexes a second copy and it doesn't compete with prod. Keep the license gate on so it isn't publicly usable.
5. **Docs-gate / CI interaction (critical):** the docs hard-gate anchors its range to the remote **`deploy`** branch subject via `scripts/ci-resolve-docs-range.sh`, which is tied to `main`'s deploy flow. The staging project must **not** touch or re-point the `deploy` branch, or it can desync the prod anchor (see CLAUDE.md recovery runbook). Confirm the staging project's deploy workflow is independent and does not write `deploy`.

---

## Installation

**Production runtime: nothing to `npm install` — the zero-runtime-dependency rule holds.** All new code is hand-written vanilla JS/CSS added to `assets/`.

Possible **vendored asset** (only if true-italic-in-Hebrew-PDF is in scope):
```
assets/fonts/heebo-italic-base64.js   # Heebo Italic TTF → base64, mirroring heebo-bold-base64.js
```
Heebo has no official italic; this would be a synthetic oblique or a substitute face. **Recommend deferring** rather than vendoring (see italic caveat).

Dev/test tooling (already permitted): existing `jsdom` test harness covers the new `MdRender` underline unit test and the updated 260615 export-order test. No new devDeps required.

## Alternatives Considered

| Recommended | Alternative | When the alternative would win |
|-------------|-------------|-------------------------------|
| Markdown textarea + toolbar | contenteditable WYSIWYG | If customers demanded live inline formatting (not just bold/underline/bullets) — revisit in a later milestone, and only with `setHTML`/DOMPurify. |
| Extend in-house `MdRender` | Vendor `marked`/`markdown-it` | If Markdown scope grew to tables/code/links/nested lists — not needed for bold/italic/underline/bullets. |
| No sanitizer (escape-first) | DOMPurify 3.x | Only if a contenteditable route ever ships raw user HTML. |
| Pointer Events hand-roll | SortableJS 1.15.x | If the reorderable set became large/nested with auto-scroll, multi-list transfer, animations — a few section rows don't warrant it. |
| Second CF Pages project | Same-project `pre-prod` preview branch | If you want the absolute minimum setup and don't mind shared env + a `*.pages.dev` preview URL. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `document.execCommand('bold'/'italic'/...)` | Deprecated; browser-divergent messy HTML; black-box | `textarea.setRangeText()` to wrap selection in Markdown markers |
| `contenteditable="true"` WYSIWYG (for v1.4) | Sanitization + `execCommand`/`beforeinput` complexity, RTL caret bugs, arbitrary-HTML storage | Markdown textarea + toolbar |
| DOMPurify (this milestone) | ~23 KB new runtime dep, redundant with escape-first `MdRender` | Extend `MdRender`; add an escape-invariant test |
| HTML5 native drag-and-drop as sole mechanism | No touch support on iOS Safari PWAs | Pointer Events sorter with a drag handle |
| Vendoring SortableJS/dragula | New runtime dep for a tiny reorderable list | ~150-line Pointer Events hand-roll |
| Storing notes as HTML or JSON delta | Migration, sanitizer, harder PDF/MD round-trip | Markdown string (no schema change) |
| Inventing an underline syntax that breaks copy-export | Non-standard tokens confuse external Markdown tools | `++x++` internal token — decide explicitly in REQUIREMENTS (round-trips within the app; note external tools won't render it) |

## Version / API status (verified 2026-07-11)

| Item | Status | Source confidence |
|------|--------|-------------------|
| `document.execCommand()` | Deprecated across vendors; still functional; no single replacement (Selection/Range + Input Events L2 for contenteditable) | HIGH (MDN + multiple) |
| `contenteditable="plaintext-only"` | Safari ✓, Chrome ✓, Firefox 136+ ✓ (2025) | HIGH (caniuse, Bugzilla) |
| `textarea.setRangeText()` | Baseline, all modern browsers incl. iOS Safari | HIGH |
| Pointer Events L2 (`setPointerCapture`, `touch-action`) | Baseline, all modern browsers incl. iOS Safari | HIGH |
| Native HTML Sanitizer API (`Element.setHTML`) | Emerging; Chromium shipping, not universal in installed Safari | MEDIUM — track, don't depend |
| DOMPurify | v3.x, ~23 KB min / ~8.7 KB gzip | HIGH (npm/GitHub) |
| jsPDF (vendored) | 2.5.2, no native underline decoration (draw rule manually) | HIGH (in-repo + jsPDF docs) |
| CF Pages branch/second-project staging | Supported via production-branch config + custom domain | HIGH (CF docs) |

## Integration points with the existing stack

- `window.MdRender` (`assets/md-render.js`) — extend subset (underline token); it remains the single escape-first renderer for preview.
- `assets/export-modal.js:539` — existing live-preview pattern to mirror in the session editor.
- `assets/pdf-export.js` (`parseInlineBold`, Heebo/Heebo-Bold, bidi UAX#9) — extend run-style set (underline rule; italic decision).
- `assets/add-session.js` (`buildFilteredSessionMarkdown`, `buildSessionMarkdown`) — repoint from hardcoded order to `sectionOrder` (260615 guard).
- Snippet caret engine + autogrow textareas — already wired into session fields; the toolbar operates on the same textareas, no conflict.
- `therapistSettings.{locale}` IDB record (Phase 22) — add `sectionOrder[]` beside rename/toggle state.
- `.sgbackup` AES-256-GCM round-trip — unchanged (Markdown is plain string; `sectionOrder` is a small array already covered by the settings-record serialization).
- Docs hard-gate CI / `deploy` anchor — staging project must not write the `deploy` branch.

## Sources

- MDN — `Document.execCommand()` (deprecated status) — HIGH
- caniuse + Bugzilla 1922723 — `contenteditable="plaintext-only"` (Firefox 136, Safari/Chrome) — HIGH
- npm / GitHub cure53/DOMPurify — v3.x size (~23 KB / ~8.7 KB gzip) — HIGH
- alfy.blog (2026) — native HTML Sanitizer API trend — MEDIUM
- robehickman.com; SortableJS; CSS-Script — Pointer Events sortable pattern (touch+mouse unified) — HIGH
- Cloudflare Pages docs + dev.to/zenn staging guides — second-project / branch staging + custom domain — HIGH
- In-repo: `assets/pdf-export.js` (parseInlineBold/Heebo-Bold/bidi), `assets/md-render.js`, `assets/export-modal.js`, `add-session.js` builders, `CLAUDE.md` docs-gate — HIGH (direct read)

---
*Stack research for: v1.4 Richer Sessions (rich-text notes + section drag-sort + pre-prod)*
*Researched: 2026-07-11*
