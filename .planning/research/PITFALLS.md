# Pitfalls Research

**Domain:** Adding rich-text (bold/underline/bullets) editing + section drag-sort reordering to a live, sold, offline-first vanilla-JS PWA (IndexedDB, Hebrew RTL, vendored jsPDF+bidi, snippets engine, installed-Safari flagship users, real customer data in production)
**Researched:** 2026-07-11
**Confidence:** HIGH for repo-specific integration points (read directly from source); HIGH for browser-quirk pitfalls (established, stable behaviors); MEDIUM where a specific WebKit version detail is cited

> **Framing — read this first.** This milestone's single largest risk is a **storage-format architecture decision made implicitly by the editor choice**, not any individual browser bug. This codebase is already **markdown-string-native**, not HTML/contenteditable-native:
> - `assets/md-render.js` (`window.MdRender`) is an **escape-then-render** markdown→HTML converter — the only XSS-safe path already blessed for `innerHTML` in this repo.
> - `assets/export-modal.js:539` already live-previews session text with `MdRender.render(editor.value)` into `innerHTML`.
> - `assets/pdf-export.js` already has a **full markdown block parser** (heading/list/paragraph) plus `parseInlineBold('**X**')` that renders bold runs in **vendored Heebo Bold** with UAX-#9 bidi pre-shaping. **Italic `*X*` is deliberately stripped; there is no underline renderer.**
> - The 7 session note fields are `<textarea data-snippets="true">`; the snippets caret-popover engine (`assets/snippets.js`) is built entirely around **`<textarea>` `.value` + `.selectionStart`**, which do not exist on `contenteditable`.
> - Read mode and the sessions table render session content via **`textContent` (never `innerHTML`)** — e.g. `sessions.js:262 trappedCell.textContent = session.trappedEmotions`. `add-session.js` invariant (lines 36-38): all user values via `textContent`/`.value`, NEVER `innerHTML`.
>
> **The opinionated recommendation the pitfalls below assume:** store **markdown strings**, keep the `<textarea>` editing surface (add a formatting toolbar that inserts `**`/`- ` markers around the selection, exactly as the snippets engine already mutates `.value`), and render formatting for display through `MdRender`. Reserve `contenteditable` only if a true WYSIWYG surface is deemed non-negotiable — and if so, budget for every contenteditable pitfall below. The milestone's own words ("formatting survives **markdown** export") point at markdown-as-storage. The one genuine mismatch: **underline has no markdown syntax and no PDF renderer** — resolve that in the storage-format phase (see Pitfall 3), do not discover it at export time.

---

## Critical Pitfalls

### Pitfall 1: `contenteditable` + `innerHTML` round-trip as the storage model (XSS + data-corruption bomb)

**What goes wrong:**
The naive rich-text build is: make the field `contenteditable`, read `element.innerHTML` on save, write it back into IndexedDB, and re-inject it with `element.innerHTML = stored` on load. This ships raw browser-generated HTML into the database and back into the DOM. It is the exact pattern this codebase spent Phase 31 hardening *away from* (`innerHTML`→DOM). Once stored HTML round-trips through `innerHTML`, any `<img onerror=…>`, `<script>`, `<svg onload=…>`, or `javascript:` URL that ever reaches the field (via paste, via a hand-edited backup, via a `.sgbackup` from another install) executes. It also silently corrupts data: a therapist's clinical note becomes an unbounded HTML blob whose diff, search, and export semantics nobody controls.

**Why it happens:**
`contenteditable` "just works" in a five-minute demo, and `innerHTML` round-trip is the shortest path from demo to persistence. The danger is invisible until a hostile or malformed input arrives — and this app holds **real customer clinical data already in production**, so the blast radius is real people's records.

**How to avoid:**
Prefer the markdown-string model (store `**`/`- ` marker text, render via `MdRender`). If `contenteditable` is used anyway, **never store `innerHTML` and never re-inject stored HTML directly.** Serialize on save to a constrained model (markdown, or a tiny allow-listed AST) and render on load through a sanitizer that allow-lists a fixed tag/attribute set — the same escape-then-render discipline `MdRender` already embodies. Treat every stored string as hostile on the way back in, including strings that came from a decrypted backup.

**Warning signs:**
`element.innerHTML` appears in a *save* path; stored session fields start containing `<` `>` tags; a code review shows user content assigned to `.innerHTML` outside `MdRender.render(...)`.

**Phase to address:** Storage-format & data-model phase (first), enforced again in the editor-build phase and code-review.

---

### Pitfall 2: Paste from Word / Google Docs / WhatsApp injects megabytes of garbage markup (and sanitizer-bypass vectors)

**What goes wrong:**
Users *will* paste from Word, Google Docs, Outlook, and WhatsApp. In a `contenteditable`, a paste from Word/Docs dumps hundreds of lines of `<span style="mso-…">`, `<o:p>`, `class="Apple-…"`, base64 `<img>` blobs, and nested `<div>`s. Stored verbatim, one pasted paragraph can be tens of KB of noise per field; rendered back, the formatting is wrong and the note is unreadable. Sanitizers that operate on an HTML *string* (regex-stripping tags) are bypassable — `<img src=x onerror=…>`, `<a href="javascript:…">`, `<style>` with `expression()`, mutation-XSS via `<noscript>`/`<template>` re-parsing — because parsing HTML with regex is unsound.

**Why it happens:**
`paste` defaults to inserting the richest available clipboard flavor (`text/html`). Developers forget the clipboard is attacker-controllable (a malicious page can set arbitrary `text/html`), and that Word's HTML is adversarial-by-accident.

**How to avoid:**
In the markdown-string model this pitfall largely evaporates: a `<textarea>` paste is `text/plain` only — Word markup never enters. Convert deliberately if desired (read `text/plain` from the paste event; optionally map a small set of `text/html` structures to markdown through an allow-list, never a denylist). If `contenteditable` is used, **intercept `paste` (`preventDefault`) and insert only the sanitized/plain projection** — never let the browser paste `text/html` natively. Sanitize by parsing into a DOM and walking an allow-list of nodes/attributes, not by string-munging. Cap field length after paste.

**Warning signs:**
Pasted text looks fine but the stored string is 20× larger than what was typed; `mso-`, `Apple-`, `<o:p`, or `data:image` substrings appear in IndexedDB; the field's rendered output differs between browsers.

**Phase to address:** Editor-build phase (paste handler is a required task, not a polish item), with the sanitizer decided in the storage-format phase.

---

### Pitfall 3: "Underline" has no markdown syntax and no PDF renderer — silent formatting loss

**What goes wrong:**
The milestone names **bold / underline / bullets**. Bold and bullets map cleanly to markdown and are already rendered by both `MdRender` and the PDF pipeline. **Underline does not exist in markdown**, and `pdf-export.js` has **no underline drawing path** (it draws bold via a second vendored font and lists via bullets; underline would require `doc.line()` segments under each text run, positioned per-glyph and bidi-reordered). If underline is offered in the editor but stored as ad-hoc HTML `<u>` (or `__x__`, or `<ins>`), it will: render inconsistently in read mode, be **silently dropped in the PDF** (the flagship client-facing artifact), and either vanish or leak literal markers in the markdown/clipboard export.

**Why it happens:**
The feature list treats bold/underline/bullets as one homogeneous group. They are not: two are free in this stack, one requires net-new rendering in three surfaces (read mode, PDF, markdown export) plus a storage convention markdown doesn't provide.

**How to avoid:**
Decide underline's fate **in the storage-format phase, on paper, before any editor UI exists.** Options, in order of cost: (a) **drop underline from v1.4** (bold+bullets ship cleanly; therapists rarely need underline in notes) — cheapest and honest; (b) adopt a documented convention (`<u>…</u>` in the allow-list, or a custom `++x++`) AND commit to building an underline renderer in `pdf-export.js` (bidi-aware `doc.line()` under runs) AND a read-mode + markdown-export representation. If (b), treat the PDF underline renderer as its own verification-heavy task. Do not let the editor offer a button whose formatting three of four surfaces cannot represent.

**Warning signs:**
An underline button exists before anyone has decided how underline is stored; the PDF of an underlined note shows plain text; the markdown export of an underlined note shows either nothing or a stray `<u>`.

**Phase to address:** Storage-format & data-model phase (decision), export/render phase (if kept, build the renderer + verify in real PDF).

---

### Pitfall 4: The snippets caret-popover breaks the moment a field becomes `contenteditable`

**What goes wrong:**
The entire snippets engine (`assets/snippets.js`) is `<textarea>`-shaped: `bindTextarea` early-returns unless `tagName === "TEXTAREA"`; trigger detection reads `textarea.value.slice(0, textarea.selectionStart)`; expansion writes `textarea.value = …` and calls `textarea.setSelectionRange(...)`; the caret-popover position comes from a **mirror `<div>` that clones textarea typography** and measures a zero-width span. **None of `.value`, `.selectionStart`, `.setSelectionRange`, or the textarea-mirror technique exists on `contenteditable`.** Convert the 7 session fields to `contenteditable` and snippet expansion + the autocomplete popover silently stop working across the app — a shipped, used feature regresses to zero.

**Why it happens:**
The editor task and the snippets task look independent. They share the same DOM elements. `data-snippets="true"` lives on the same `<textarea>`s the rich-text feature wants to upgrade (`add-session.html:239-338`).

**How to avoid:**
The markdown-string / keep-the-textarea model preserves snippets for free — a formatting toolbar that wraps the selection in `**…**` is the *same class of `.value` mutation* the snippets engine already performs (see `insertExpansion`, which even dispatches a synthetic `input` event for autogrow/dirty-tracking; reuse that exact pattern). If `contenteditable` is chosen, snippets must be **rewritten** for a Range/Selection world (Selection API caret offset, `Range.getBoundingClientRect()` for popover position, `document.execCommand('insertText')` or manual Range mutation for expansion) — scope this as a first-class port, not a footnote, and re-run the snippets test suite (`tests/24-04-trigger-regex`, `Snippets.__testExports`) against it.

**Warning signs:**
Typing `;betrayal ` in a session field no longer expands; the snippet popover never appears; `Snippets.bindTextarea` is being called on a non-textarea and silently no-oping.

**Phase to address:** Editor-build phase — snippets compatibility is an explicit acceptance criterion, verified in a real browser.

---

### Pitfall 5: Read mode and the sessions table won't show formatting — because they render `textContent` today

**What goes wrong:**
Storing markdown is only half the feature. Read mode and the sessions overview render session content via **`textContent`** (`sessions.js:262`, and the `add-session.js` invariant). If the storage model changes to markdown but these render paths are untouched, therapists will type `**important**` and then *see literal asterisks* in the session view — while the PDF shows it bold. That inconsistency reads as a bug and undermines trust in a paid product. The reverse trap: someone "fixes" it by switching those paths to `innerHTML` with the raw stored string — re-introducing Pitfall 1 across every read surface.

**Why it happens:**
The feature is mentally modeled as "editor + export," but there are **four** render surfaces: the editor, read mode, the sessions table/overview, and the PDF/markdown export. It's easy to wire two and forget two.

**How to avoid:**
Enumerate all render surfaces up front. For each display surface that must show formatting, render through `MdRender.render()` (the blessed escape-then-render path) into `innerHTML`, never the raw string. Decide deliberately whether the **compact table cells** should render formatting at all (they probably should strip markers to a plain preview — a `**bold**`→`bold` strip, which `pdf-export.js` already has a helper for) versus the **full read-mode view** which should render it. Do not silently switch a `textContent` sink to `innerHTML` without routing through the sanitizing renderer.

**Warning signs:**
Literal `**`/`- ` visible in read mode or the sessions table; a diff that changes `textContent =` to `innerHTML =` without `MdRender` in between.

**Phase to address:** Export/render phase (read mode + table + PDF + markdown export rendered consistently and safely).

---

### Pitfall 6: Data migration — mixed plain/formatted portfolios and old `.sgbackup` files

**What goes wrong:**
Every existing session in every customer's IndexedDB — and every field in every previously-exported `.sgbackup` — is a **plain string that may already contain `*`, `_`, `-`, `<`, `#`, or `>` characters** typed as literal punctuation. Turn on markdown rendering and a therapist's existing note "cost was 50 * 3" or "range 3-4" or a bulleted-by-hand "- point" suddenly renders as italic/list/emphasis it never meant. Worse, if migration rewrites stored strings (e.g. auto-escaping existing content, or converting to HTML), an old backup restored *after* migration re-injects the un-migrated format and the two models collide. Round-tripping formatted data through the encrypted backup must preserve it byte-for-byte.

**Why it happens:**
"It's just a string, nothing to migrate" — but the *interpretation* of the string changes even though the bytes don't. There is no schema version separating "plain-era" fields from "markdown-era" fields.

**How to avoid:**
Treat this as a real migration decision in the storage-format phase. Prefer a model where **plain old text renders identically to how it renders today** (markdown that is conservative about what it interprets — the existing `MdRender` only acts on `**`, `*`, `#`, `- ` at line start; audit whether that will surprise existing notes, especially bullet-looking lines and `*`-as-multiply). If a per-field/per-session `format` flag or content-version is introduced, define how **old backups without the flag** are interpreted on restore (default to plain), and add a backup round-trip test with a formatted field. Never do a destructive in-place rewrite of existing session strings. Verify the encrypted backup export→import preserves formatted content exactly.

**Warning signs:**
Existing notes change appearance after the feature ships without the user editing them; a restored old backup renders differently than it did before; `*`/`-` in legacy notes triggers unexpected italics/lists.

**Phase to address:** Storage-format & data-model phase (migration/versioning decision + backup round-trip test).

---

### Pitfall 7: Hebrew RTL + mixed bidi inside the editor and inside formatted PDF output

**What goes wrong:**
Hebrew is first-class here. Two distinct RTL traps:
1. **In the editing surface:** inside `contenteditable`, caret placement, arrow-key navigation, and selection across a mixed Hebrew+Latin+digits run are notoriously buggy (caret jumps, selection anchors on the wrong side, `**` markers inserted on the visually-wrong end of a selection). In a `<textarea>` with `dir="auto"` (the pattern the export editor already uses, `add-session.html:458`) this is far more stable — one more reason to keep textareas.
2. **In the PDF:** bold runs and list bullets must survive UAX-#9 bidi reordering. The pipeline already does this via `parseInlineBold` + `shapeForJsPdf`, but **a bold run that spans a bidi boundary** (bold text containing both Hebrew and a Latin word or digits) is exactly the fragile case — the bold segment must be reordered as segments, and Hebrew digits/numbers within a bold run can land on the wrong side. List bullets must sit on the **start** (right) edge in RTL, and heading/label alignment must be logical, not physical.

**Why it happens:**
Formatting adds *runs* (bold spans, list items) on top of text that already needs bidi reordering. Each run boundary is a new place for the visual order to break. Testing only in English hides all of it.

**How to avoid:**
Keep the editing surface a `dir="auto"` `<textarea>` if at all possible. For the PDF, add explicit test vectors for: a bold run that is pure Hebrew; a bold run mixing Hebrew + Latin + digits; a bulleted list in Hebrew (bullet on the right); a bold word inside an otherwise-Hebrew line. Reuse the existing bidi test-vector approach in `pdf-export.js`. Recall the repo's own hard-won RTL lessons: physical `left/top` (not logical `inset-inline-*`) when feeding `getBoundingClientRect` into overlays; WebKit ignoring `text-align` on some inputs. **Verify formatted RTL output in a real rendered PDF opened in a real viewer**, not in jsdom.

**Warning signs:**
Bold Hebrew renders in reversed/jumbled order in the PDF; a bulleted Hebrew list puts bullets on the left; digits inside a bold Hebrew run jump position; caret behaves erratically when typing Hebrew in the editor.

**Phase to address:** Export/render phase (PDF bidi vectors) + editor-build phase (RTL editing verified on device); real-browser + real-PDF verification phase.

---

### Pitfall 8: Safari / WebKit `contenteditable` quirks — and installed-PWA Safari is the flagship environment

**What goes wrong:**
If `contenteditable` is chosen, WebKit is the worst-behaved engine and it is exactly where most customers live (installed PWA on Safari/iOS). Known WebKit `contenteditable` hazards: `beforeinput` / `InputEvent.inputType` coverage and cancelation semantics differ from Chromium (you cannot always rely on canceling `beforeinput` to intercept formatting/paste the way you can in Blink); `document.execCommand` is deprecated everywhere and its behavior/return values are inconsistent in WebKit (bold toggling, list creation produce divergent markup); autocorrect/autocapitalize/dictation on iOS inject text and mutate selection outside your handlers; the software keyboard resizes the viewport and disturbs caret-into-view scrolling; pressing Enter produces `<div>` vs `<p>` vs `<br>` differently per engine. Selection/Range APIs across shadow/zero-width nodes behave subtly differently. Installed-PWA Safari additionally caches aggressively (the repo already fought stale-SW update delivery), so a contenteditable bug shipped to an installed PWA is slow to correct in the field.

**Why it happens:**
Developers build and test in Chrome DevTools where `contenteditable` is most forgiving, then ship to a WebKit-majority audience. `beforeinput` gaps and `execCommand` inconsistency are invisible until tested on the actual engine.

**How to avoid:**
Strongest mitigation: **avoid `contenteditable`** and keep the `<textarea>` + toolbar model — textareas have none of these quirks and are uniform across engines. If `contenteditable` is unavoidable, do **real-device testing on installed-PWA Safari (iOS + macOS)** as a gating criterion, not an afterthought; do not depend on `beforeinput` cancelation as your only interception layer; avoid `execCommand` for anything structural; test Enter-key block creation, iOS dictation, and autocorrect explicitly. Budget for a WebKit-specific bug tail.

**Warning signs:**
Formatting works in Chrome but not on the iPhone PWA; canceling `beforeinput` doesn't prevent the input on Safari; Enter creates different markup on iOS; the caret scrolls under the software keyboard.

**Phase to address:** Editor-build phase (engine choice) + real-browser verification phase (installed-PWA Safari is a named target).

---

### Pitfall 9: Undo/redo, autogrow, and scroll behavior regressions

**What goes wrong:**
- **Undo/redo:** In a `<textarea>`, mutating `.value` programmatically (as a toolbar's `**`-wrapping would) **destroys the native undo stack** — the user can't Ctrl-Z their formatting or the text before it. In `contenteditable`, custom formatting operations that bypass the browser's own editing commands similarly break the native undo history. The snippets engine already mutates `.value` directly, so this is a known local pattern whose undo cost compounds when a toolbar adds more programmatic mutations.
- **Autogrow:** The session textareas auto-resize on `input` (the `add-session.js` autoGrow handler measures + sets height, never touches `.value`). Wrapping selection or inserting markers must dispatch the synthetic `input` event (as `snippets.js:408` already does) or the field won't grow to fit; switching to `contenteditable` throws the autogrow mechanism out entirely.
- **Scroll/caret-into-view:** Toolbar actions and paste can leave the caret off-screen; contenteditable changes scroll semantics.

**Why it happens:**
Programmatic value mutation is the fast path for a formatting toolbar, and it quietly breaks the browser's built-in editing affordances users expect.

**How to avoid:**
For `<textarea>` toolbars, use `document.execCommand('insertText', …)` where still supported (it preserves the undo stack) or accept the tradeoff explicitly and consider a lightweight custom undo for formatting ops. Always re-dispatch the synthetic `input` event so autogrow + dirty-tracking fire — mirror `insertExpansion` exactly. Preserve/restore `selectionStart`/`selectionEnd` around mutations. Test Ctrl-Z after a bold toggle.

**Warning signs:**
Ctrl-Z does nothing or jumps too far after formatting; the textarea stops growing after a toolbar insert; the caret ends up in the wrong place or off-screen after wrapping a selection.

**Phase to address:** Editor-build phase.

---

### Pitfall 10: Section drag-sort — HTML5 DnD doesn't fire on iOS touch; scroll-while-drag; a11y; and the 260615 export-order bug class

**What goes wrong:**
Section reordering has its own cluster:
- **iOS touch:** The HTML5 Drag-and-Drop API (`dragstart`/`dragover`/`drop`) **does not fire from touch on iOS Safari** — the flagship environment. A drag-sort built purely on HTML5 DnD works on desktop and is completely dead on the iPhone. Pointer Events (`pointerdown`/`pointermove` + `touch-action: none`) or a small custom long-press-drag are required for touch.
- **Scroll-while-drag:** On a long section list, dragging to the edge needs auto-scroll; touch drag fights the page's native scroll unless `touch-action` is set correctly.
- **Accessibility:** Pure pointer drag is inoperable by keyboard and invisible to screen readers; a keyboard reorder affordance (move up/down) is needed for a11y.
- **Order-propagation (the repo's own 260615 bug class):** the milestone explicitly flags this. Section order is set in Settings but is consumed by **multiple** builders — the add/edit session form layout, read mode, the **PDF section order**, and the **markdown/clipboard export order**. Reorder in Settings and forget one consumer and the PDF or the copied markdown comes out in the old order. This is a known past defect class in this codebase.

**Why it happens:**
HTML5 DnD looks like the "native" answer and demos fine on a laptop; the iOS gap is invisible until tested on a device. And a single reorder feature fans out to many order-consuming surfaces that are easy to miss.

**How to avoid:**
Use Pointer Events (not raw HTML5 DnD) so touch works, or a tiny dependency-free long-press reorder; set `touch-action: none` on drag handles; add auto-scroll near edges; provide keyboard up/down + ARIA. **Enumerate every consumer of section order** (form, read mode, PDF, markdown export, backup) and route them all through **one** ordering source — then add a test that reorders and asserts the PDF/markdown order changed. Persist order per therapist (localStorage or IndexedDB settings) and include it in backup round-trip.

**Warning signs:**
Drag works on desktop but not on the iPhone; reordering in Settings doesn't change the exported markdown or PDF; the list can't be reordered by keyboard; auto-scroll doesn't trigger near the edges.

**Phase to address:** Section-reordering phase (Pointer-Events choice + single ordering source + all-consumers test) + real-device verification phase.

---

### Pitfall 11: jsPDF formatted-text rendering traps (font fallback, list indent, run wrapping)

**What goes wrong:**
Even reusing the existing pipeline, formatted PDF has sharp edges:
- **Silent bold fallback:** bold renders only because `heebo-bold-base64.js` is vendored and registered as `Heebo/bold` (`pdf-export.js:261`). If a new weight/style (e.g. underline-via-font, or an italic font) is introduced without vendoring the matching TTF, jsPDF **silently falls back** to a default font that **cannot render Hebrew** — Hebrew turns to tofu/boxes with no error. Any new text style needs a vendored, Hebrew-covering font.
- **Run wrapping vs `splitTextToSize`:** bold is rendered as per-segment runs *after* `splitTextToSize` wraps lines; a bold run that crosses a wrap boundary, or interacts with bidi reorder, can mis-measure width and overlap/clip. The code comments already flag this fragility.
- **List indent + RTL alignment:** bullets must indent from the correct (start) edge and align under wrapped continuation lines; ordered vs unordered handling already had a past bug (260608-c8x).

**Why it happens:**
The PDF is a hand-built layout engine; every new text style is a new interaction with fonts, wrapping, and bidi that the layout code must be taught explicitly.

**How to avoid:**
Any new emphasis style ships **with** its vendored Hebrew-covering TTF or it doesn't ship. Add PDF test vectors for bold runs crossing wrap boundaries and for lists with wrapped items in RTL. Verify by **opening a real generated PDF**, not by asserting jsdom output — jsdom cannot lay out or render fonts (the repo has been burned by false-GREEN jsdom PDF tests before; see the PDF-jsdom-inert-gates lesson).

**Warning signs:**
Hebrew shows as boxes in the PDF after adding a style; bold text clips or overlaps at line ends; bulleted lists mis-indent or misalign in RTL; a jsdom PDF test passes but the real PDF is wrong.

**Phase to address:** Export/render phase, with real-PDF verification.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `contenteditable` + store `innerHTML` | WYSIWYG in an afternoon | XSS in production clinical data; unbounded HTML blobs; snippets/autogrow/undo all break; WebKit bug tail | **Never** for stored user content in this app |
| Regex/string-based HTML sanitizer | "Cleans" paste quickly | Mutation-XSS + Word-markup bypasses; unsound by construction | Never — parse to DOM + allow-list, or avoid HTML storage entirely |
| Ship underline stored as ad-hoc `<u>`/HTML | Matches the feature-list wording | Silently dropped in PDF; leaks/vanishes in markdown export; inconsistent read mode | Only with a committed PDF underline renderer + export representation; otherwise drop underline |
| HTML5 DnD only for section drag | Works on the dev laptop immediately | Dead on iOS PWA (flagship users); no keyboard a11y | Never as the sole mechanism; Pointer Events required for touch |
| Wire order into the editor but not PDF/markdown | Reorder "works" in the form | 260615-class bug: exports come out in stale order | Never — single ordering source feeds all consumers |
| Skip real-device Safari test ("passes in Chrome") | Faster sign-off | Field bugs on the majority environment, slow to correct in an installed PWA | Never for editor or drag features |
| Auto-migrate existing notes to a formatted model in place | "Consistent" data | Destroys legacy plain content; collides with old-backup restore | Never destructive; render legacy plain identically instead |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Snippets engine (`snippets.js`) | Convert fields to `contenteditable`, silently breaking `.value`/`.selectionStart`-based expansion + textarea-mirror popover | Keep `<textarea>`; toolbar mutates `.value` + dispatches synthetic `input` exactly like `insertExpansion`. If contenteditable, fully port snippets to Selection/Range |
| `MdRender` (`md-render.js`) | Bypass it and assign raw stored string to `innerHTML` | Route every formatted display through `MdRender.render()` (escape-then-render is the only blessed `innerHTML` path) |
| PDF pipeline (`pdf-export.js`) | Introduce a new text style without vendoring a Hebrew-covering font | New style ⇒ vendored TTF registered on the `Heebo` family; add bidi + wrap test vectors; verify real PDF |
| Encrypted `.sgbackup` (`backup.js`) | Forget section-order + formatted content in round-trip | Include order + formatted fields in export/import; add a round-trip test with a formatted field and a reordered section list |
| Service worker precache (`sw.js`) | Add a new asset (font/JS) but forget to precache it → breaks offline for installed PWA | Add every new shipped asset to `PRECACHE_URLS`; verify offline on a real installed PWA (not `python3 -m http.server`, which false-passes SW tests) |
| Read mode / sessions table | Switch `textContent` to raw `innerHTML` to "show formatting" | Render via `MdRender`; strip-to-plain for compact table cells |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-rendering `MdRender` on every keystroke in a large note | Typing lag in long sessions | Debounce preview; render on blur/save for read mode | Long notes (multi-KB) on low-end phones |
| Pasted Word HTML bloats stored fields | IndexedDB rows balloon; backup files grow | Plain-text paste (textarea) or sanitize-on-paste + length cap | First paste from Word/Docs |
| Auto-scroll during drag re-layout on long section lists | Janky drag on mobile | `transform`-based drag, throttle `pointermove`, `touch-action: none` | Many custom sections on a phone |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Round-tripping user content through `innerHTML` | Stored-XSS executing in a clinical-data app; persists across devices via backup | Never; escape-then-render via `MdRender`, or allow-list DOM sanitize |
| Trusting decrypted `.sgbackup` content as safe | A malicious/edited backup injects HTML on restore | Sanitize on the way *in* from backup, same as any input |
| Trusting the clipboard `text/html` flavor on paste | Attacker-set clipboard HTML enters the doc | Read `text/plain`, or sanitize `text/html` via DOM allow-list |
| Denylist-style tag stripping | Mutation-XSS / obfuscation bypass | Allow-list a fixed, tiny tag+attribute set; no `on*`, no `javascript:`, no `<style>` |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Literal `**`/`- ` shown in read mode/table | Looks broken; erodes trust in a paid product | Render read/full surfaces via `MdRender`; strip markers in compact cells |
| Existing plain notes suddenly render as italic/list | "The app changed my old records" | Conservative interpretation; legacy plain renders as it did before |
| Underline button that does nothing in the PDF | User formats, client PDF ignores it | Drop underline, or build the renderer — no dead buttons |
| Drag handle invisible/tiny on touch | Can't reorder on the phone | Clear grab affordance, adequate hit target, long-press feedback |
| No keyboard way to reorder sections | Inaccessible | Up/down controls + ARIA alongside drag |

## "Looks Done But Isn't" Checklist

- [ ] **Rich-text editor:** Often missing the **paste handler** — verify pasting from Word/Google Docs/WhatsApp yields clean content, not markup blobs
- [ ] **Rich-text editor:** Often missing **snippets still working** — verify `;betrayal ` expansion + popover in a formatted field, in a real browser
- [ ] **Rich-text editor:** Often missing **undo/redo + autogrow** — verify Ctrl-Z after bold, and the field still grows (synthetic `input` dispatched)
- [ ] **Formatting display:** Often missing **read mode + sessions table** — verify formatting shows (or is cleanly stripped) there, not just in the editor
- [ ] **PDF:** Often missing **RTL bold/list vectors + real-PDF open** — verify Hebrew bold, mixed-bidi bold run, and Hebrew bulleted list in an actual opened PDF (jsdom can false-GREEN)
- [ ] **PDF:** Often missing **new-font vendoring** — verify no Hebrew tofu after adding any style; new style ⇒ vendored Hebrew TTF
- [ ] **Underline:** Often missing an **export representation** — verify underline in read mode AND PDF AND markdown export, or confirm it's dropped from scope
- [ ] **Section drag:** Often missing **iOS touch** — verify reordering works on a real iPhone PWA (HTML5 DnD is dead on touch)
- [ ] **Section drag:** Often missing **all order consumers** — verify reorder changes the PDF order AND the copied markdown order (260615 class)
- [ ] **Section drag:** Often missing **keyboard a11y** — verify reorder by keyboard
- [ ] **Migration:** Often missing **old-backup restore** — verify a pre-feature `.sgbackup` restores and renders as before; formatted content round-trips exactly
- [ ] **Offline:** Often missing **SW precache of new assets** — verify offline on a real installed PWA after adding fonts/scripts
- [ ] **Docs gate:** Often missing **changelog + help topic** — the v1.3 hard gate blocks the push otherwise (see process pitfalls)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stored-`innerHTML` XSS shipped | HIGH | Stop the bleed (sanitize on render immediately); migrate stored HTML→markdown/allow-listed model across every install's IndexedDB + backups; audit the field history |
| Snippets broke on contenteditable switch | MEDIUM | Revert to textarea+toolbar, or complete the Selection/Range port; re-run snippet tests |
| Underline dropped silently in PDF | LOW (if caught pre-ship) / MEDIUM (post-ship) | Decide: remove the button, or build the PDF underline renderer + export representation |
| Export order stale after reorder (260615) | LOW–MEDIUM | Route all consumers through one ordering source; add the reorder→export assertion test |
| iOS drag dead on touch | MEDIUM | Re-implement on Pointer Events; retest on device |
| Legacy notes re-interpreted as markdown | MEDIUM | Make interpretation conservative; bytes never rewritten so no data lost — only render rules change |

## Pitfall-to-Phase Mapping

Suggested phase shape (roadmapper decides final structure). The ordering rationale: **the storage-format decision gates everything** — it determines XSS surface, snippets survival, migration, and what the export/PDF must render. Build the editor only after the format is fixed; verify on real Safari/iOS + real PDF at the end.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 — contenteditable/innerHTML round-trip | Storage-format & data-model phase (first) | Code review: no user content to `innerHTML` outside `MdRender`; storage model documented |
| 2 — Word/Docs/WhatsApp paste garbage | Editor-build phase (sanitizer decided in format phase) | Manual paste from Word/Docs/WhatsApp; stored size sane; no `mso-`/`data:image` in DB |
| 3 — underline has no markdown/PDF path | Storage-format phase (decide) + export phase (if kept) | Underline in read mode + PDF + markdown export, or documented as dropped |
| 4 — snippets break on contenteditable | Editor-build phase | Real-browser: `;trigger ` expansion + popover in a session field; snippet tests green |
| 5 — read mode/table render textContent | Export/render phase | Formatting shows (or strips) in read mode + table; no raw-string `innerHTML` |
| 6 — mixed plain/formatted + old backups | Storage-format phase | Old `.sgbackup` restores + renders as before; formatted round-trips; no in-place rewrite |
| 7 — Hebrew RTL + bidi (editor + PDF) | Editor-build + export phase | Real device editing; real-PDF Hebrew bold/mixed-bidi/list vectors |
| 8 — Safari/WebKit contenteditable quirks | Editor-build phase (engine choice) | **Real installed-PWA Safari (iOS+macOS)** gating test |
| 9 — undo/redo, autogrow, scroll | Editor-build phase | Ctrl-Z after format; field grows; caret preserved |
| 10 — drag: iOS touch, scroll, a11y, order fan-out | Section-reordering phase | Real iPhone reorder; reorder changes PDF+markdown; keyboard reorder |
| 11 — jsPDF font fallback / wrap / indent | Export/render phase | Real PDF: no Hebrew tofu; bold across wrap; RTL list indent |

## Process Traps Specific to This Repo

These are not domain pitfalls but *this-repo* execution traps that will bite during v1.4:

- **Docs hard-gate (v1.3 GATE-01..04) blocks the push.** Every user-facing change needs a **changelog entry** (`assets/changelog-content-en.js`, EN only) **and** updated help topic(s) (`assets/help-content-en.js`, EN only) — or an explicit `Help-Unaffected:`/`Changelog-Unaffected:` trailer with a reason on the correct commit. The rich-text editor and section reordering are user-facing; plan the changelog + help edits as phase deliverables (Definition of Done), not afterthoughts. `app.js`/`i18n-*`/`tour.*`/docs-machinery are changelog-only tier; `reporting.*` is denylisted. Read `HELP-MAP.md` cold to find the owning topic.
- **Demo-app parity.** The demo (`demo.js`, `demo-seed*.js`, `demo.css`) must show the new features with seed data, and export/license controls stay locked in demo mode (Phase 35 pattern). A feature that works in the app but is invisible/broken in the demo is incomplete.
- **Service-worker precache additions.** Any new shipped asset (a vendored italic/underline font, a new JS module) must be added to `sw.js` `PRECACHE_URLS` or it breaks offline for installed PWA users. The repo's own lesson: `python3 -m http.server` **false-passes** SW/offline tests (extensionless precache routes 404 under `allSettled`); verify offline on a real installed PWA.
- **jsdom cannot see real caret/selection/render behavior.** The `npm test` (jsdom) suite can test **pure logic**: `MdRender` output, markdown-parse helpers, `parseInlineBold` segmentation, order-model functions, sanitizer allow-list decisions, `detectTrigger`/`resolveExpansion`. It **cannot** test: caret position, Selection/Range behavior, `contenteditable` editing, paste, drag pointer events, actual PDF layout/font rendering, RTL visual order, or Safari/iOS quirks. Those require **real-browser + real-device verification** (Playwright WebKit for automatable checks; a physical iPhone PWA for touch/keyboard/dictation; opening a real generated PDF for bidi/font). The repo has shipped false-GREEN jsdom PDF tests before — do not let a green suite substitute for opening the artifact.
- **Deploy churn / purge race.** Every push to main auto-deploys + rolls the integrity token; keep the reorder/editor commits code-bearing (let docs ride with code) to avoid needless PWA churn and the still-unfixed purge race (itself a v1.4 debt item).

## What Needs Real-Browser/Device Verification vs jsdom

| jsdom-testable (fast, in `npm test`) | Real-browser / real-device only |
|--------------------------------------|----------------------------------|
| `MdRender.render()` output + escaping | Caret position & Selection/Range in editor |
| `parseInlineBold` / markdown block-parse segmentation | `contenteditable` editing, Enter-key block markup |
| Sanitizer allow-list decisions (pure function) | Paste from Word/Google Docs/WhatsApp |
| Section-order model functions (reorder → order array) | Drag pointer/touch events; iOS drag; auto-scroll |
| Order fan-out: given order, builders emit correct sequence | Undo/redo after programmatic format; autogrow growth |
| `detectTrigger`/`resolveExpansion` snippet logic | Snippets popover position + live expansion in a field |
| Backup export/import round-trip of formatted strings (data) | Actual PDF layout, font embedding, Hebrew bidi visual order |
| Migration/versioning interpretation of legacy strings | Installed-PWA Safari (iOS+macOS) behavior; offline after precache |

## Sources

- Direct source read (HIGH): `assets/snippets.js` (textarea/`.value`/`.selectionStart`/mirror-popover coupling), `assets/md-render.js` (escape-then-render), `assets/export-modal.js:537-539` (`MdRender`→`innerHTML` live preview), `assets/pdf-export.js` (markdown block parser, `parseInlineBold`, Heebo Bold vendoring ~line 261, italic-stripped, bidi `shapeForJsPdf`), `assets/sessions.js:262` + `assets/add-session.js:36-38` (textContent-only render invariant), `add-session.html:239-458` (7 `data-snippets` session fields), `.planning/PROJECT.md` (constraints, milestone scope, prior lessons)
- Repo lessons (HIGH, from CLAUDE.md/MEMORY + PROJECT.md): docs hard-gate (v1.3 GATE-01..04), `python3 -m http.server` false-passing SW/offline tests, PDF-jsdom false-GREEN, RTL logical-vs-physical coords, WebKit input `text-align`, demo-parity + control lockdown, deploy purge-race, 260615 export-order bug class, 260608-c8x ordered-list PDF bug
- Established platform behavior (HIGH/MEDIUM): HTML5 Drag-and-Drop not firing from iOS touch (Pointer Events required); WebKit `beforeinput`/`InputEvent` cancelation gaps; `execCommand` deprecation/inconsistency; contenteditable Enter-block divergence; clipboard `text/html` is attacker-controllable; regex HTML sanitization is unsound (mutation-XSS)

---
*Pitfalls research for: rich-text session editor + section drag-sort reordering on a live vanilla-JS RTL offline PWA*
*Researched: 2026-07-11*
