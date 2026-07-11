# Project Research Summary

**Project:** Sessions Garden — Therapist Portfolio Manager
**Domain:** v1.4 "Richer Sessions" — rich-text session notes + section drag-sort reordering + mobile pass + tech debt, on a live, sold, zero-runtime-dependency, offline-first, RTL-capable vanilla-JS PWA
**Researched:** 2026-07-11
**Confidence:** HIGH

## Executive Summary

This milestone is an integration study on a live product, not a greenfield build — and the single most consequential research finding reframes the whole thing: the PDF + Markdown export pipeline is already Markdown-native and already renders inline bold and lists (`pdf-export.js` parses `**bold**` into styled runs through vendored Heebo Bold, bidi-shaped for Hebrew; `stripInlineMarkdown` only survives on the heading branch). The MILESTONE-CONTEXT premise that formatting is "deferred to a future phase, which is now" is partially stale — bold and bullets already round-trip end-to-end today if a therapist types raw Markdown into a field. What's genuinely missing is (a) an editing affordance (the 7 session fields are plain `<textarea>`s with no toolbar), (b) underline anywhere (no Markdown syntax, no MdRender rule, no PDF renderer), and (c) user-controlled section order (hardcoded in four-plus places, one of which — `severityAfterSections` — is a fifth, subtler coupling).

All four researchers who read live source (STACK, ARCHITECTURE, PITFALLS) converge hard on one architecture: keep the `<textarea>` as the editing and storage surface, add a marker-inserting toolbar using `textarea.setRangeText()`/programmatic `.value` mutation, store Markdown strings (no schema/migration), and render formatting for display through the existing escape-first `window.MdRender`. This preserves — for free — the snippets caret-popover engine, autogrow, dirty-tracking, the `.sgbackup` encrypted round-trip, and the app's hard security invariant (user content only ever via `textContent`/`.value`, never `innerHTML`, except through `MdRender`'s closed-tag-set escape-then-render path). It also avoids the entire class of WebKit `contenteditable`/`execCommand` bugs that would otherwise hit this app's flagship environment — installed Safari PWAs on iPhone. The FEATURES researcher is the lone outlier recommending `contenteditable` + `execCommand`; that recommendation is weighted lower here because it wasn't grounded in the same direct-source reads and would break snippets, autogrow, and the textContent-only invariant, and would require vendoring a sanitizer (DOMPurify) for zero net benefit given the storage format the other three converge on.

For section reordering, the accessible baseline (WCAG 2.2 SC 2.5.7 requires a non-drag path) is up/down arrow buttons, layered with a Pointer Events drag (never HTML5 native DnD, which is dead on iOS Safari touch) as an enhancement. The two features are largely independent except where they both touch `export-modal.js`'s hardcoded order-builders — and reorder must NOT ship without atomically flipping that hardcoding to consume the new saved order and rewriting the `30-export-markdown` guard test, or the shipped 260615 export-order divergence bug class returns. The two biggest open decisions to resolve before any editor code is written are: (1) the underline delimiter/scope (no Markdown syntax exists; a private token like `++x++` plus a manual `doc.line()` PDF underline rule is the cheapest complete option — or drop underline from v1.4 explicitly rather than ship a dead button), and (2) whether pre-existing plain-text notes containing literal `*`/`-`/`#` should be conservatively rendered as before or newly interpreted as Markdown once a rendered read-view ships.

## Key Findings

### Recommended Stack

Zero new vendored runtime dependencies are required. The recommended stack is native platform APIs only: `textarea.setRangeText()` for toolbar selection-wrapping (baseline everywhere, including iOS Safari), Pointer Events L2 (`pointerdown`/`pointermove`/`setPointerCapture`/`touch-action:none`) for a hand-rolled ~100-150 line drag-sort (no SortableJS/dragula), and the existing `window.MdRender` extended with one new inline rule for underline. `document.execCommand()` is avoided for structural formatting (deprecated, browser-divergent) but may still be used narrowly for `insertText` if native undo-stack preservation through the toolbar is required — a local implementation detail, not an architecture choice. No sanitizer library is needed because `MdRender` is escape-first (escapes all HTML before applying its structural regex), which is already the app's one blessed `innerHTML` path.

**Core technologies:**
- `textarea.setRangeText()` — wraps the current selection in Markdown markers (`**`, `- `, `++`) and re-selects — replaces `execCommand('bold')` entirely; Baseline in all modern browsers.
- Pointer Events L2 (`setPointerCapture`, `touch-action`) — one code path for mouse/touch/pen drag-sort; the only mechanism that works on installed-Safari-PWA touch (HTML5 DnD does not fire from iOS touch).
- Extended `window.MdRender` (in-house, ~2.7KB) — add an underline inline rule; remains the single escape-first renderer, no new dep.
- Markdown string storage (same IndexedDB string column, same `.sgbackup` plain-string round-trip) — zero schema migration.
- New `sectionOrder` sentinel record in the existing `therapistSettings` IDB store, following the proven `snippetsDeletedSeeds` sentinel pattern (already backup-aware).
- Second Cloudflare Pages project (production branch `pre-prod`, `noindex`) for the milestone's pre-prod environment ask — must not touch the `deploy` branch the docs-gate CI anchors to.

### Expected Features

**Must have (table stakes) for v1.4:**
- Bold, italic, bullet list via a visible toolbar + keyboard shortcuts (Ctrl/Cmd+B/I) — the literal customer ask.
- Formatting survives Markdown copy/export and PDF export, verified in Hebrew RTL — this is the entire point of the feature; anything less repeats the customer's complaint.
- Section reorder via up/down arrow buttons (WCAG-compliant baseline), propagated to the add/edit form AND both export builders, with the 260615 guard test flipped from "export == static DOM order" to "export == saved order."
- Existing session data (keyed by section id, not position) is untouched by reordering — presentation-only, no data migration.
- Snippets + autogrow keep working unchanged — non-negotiable, verified in a real browser, not just jsdom.

**Should have (differentiators):**
- Underline (the one explicitly named formatting need with no Markdown equivalent) — resolve the storage-token decision explicitly, don't let it get decided implicitly by discovering it at export time.
- Numbered list (shares list machinery with bullets).
- Drag-and-drop with a grip handle, layered ON TOP of the arrow buttons, never as the sole mechanism.
- "Reset order to default" button, mirroring the existing per-row rename "Revert" affordance.

**Defer (v2+):**
- Markdown auto-format shortcuts (`- ` → bullet as you type) — ship only after undo is bulletproof.
- Keyboard pickup/move reorder (Space=grab, arrows=move) — polish beyond WCAG-minimum arrows.
- Full WYSIWYG, font/color pickers, headings, tables, inline images, hyperlinks, collaborative editing — all explicitly out of scope; the existing ~9 named sections already provide structure and the zero-dep/offline/clinical-data constraints rule these out.

### Architecture Approach

Session content already flows through one storage surface (plain-string `<textarea>` fields → IndexedDB → `.sgbackup`) and two consumers that both already parse it as Markdown (the live MdRender export preview, and the PDF pipeline's `parseMarkdown`→`parseInlineBold`→`drawSegmentedLine`). The milestone's job is to add an editing affordance that emits Markdown into that same pipeline and close two real gaps — underline (nowhere) and user-controlled section order (hardcoded in four-plus places). No new component owns "the editor" as a separate subsystem; the toolbar is a thin layer over the existing textarea.

**Major components:**
1. Rich-text toolbar-over-textarea (`add-session.js`/`.html`) — Bold/Underline/Bullet buttons that wrap/prefix the current selection with Markdown tokens via `.value` mutation + synthetic `input` dispatch (mirroring the existing snippet-expansion pattern) — NOT `contenteditable`.
2. In-form rendered read view — a new `MdRender`-driven preview surface shown in read-mode so saved formatting is visible instead of raw `**`/`++` tokens; must NOT bypass `MdRender` into raw `innerHTML`.
3. `sectionOrder` sentinel in `therapistSettings` + `App.getSectionOrder()` sync cache accessor + two lock-step allow-list registrations (`db.js` `_SENTINEL_KEYS`, `backup.js` `ALLOWED_SENTINEL_KEYS`).
4. `md-render.js` + `pdf-export.js` extensions — one new inline underline rule in MdRender; extend the PDF segment model `{text,bold}` → `{text,bold,underline}` and draw a manual `doc.line()` rule under underlined runs (no new font needed; RTL-safe because runs are already visually ordered).
5. Export-builder refactor (`export-modal.js`) — replace the two hardcoded push sequences (`buildSessionMarkdown`, `buildFilteredSessionMarkdown`) and `EXPORT_SECTION_ORDER` with loops over the saved order; recompute `severityAfterSections` from saved order instead of a heartShield-first assumption.

### Critical Pitfalls

1. `contenteditable` + `innerHTML` round-trip as the storage model — would ship raw browser HTML into a database holding real clinical data (XSS + corruption bomb), and directly contradicts this app's hardened `textContent`/`.value`-only invariant. Avoid by keeping the Markdown-textarea model entirely; never store or re-inject `innerHTML`.
2. Underline has no Markdown syntax and no PDF renderer — bold/bullets are free in this stack; underline is not. Decide its fate (drop it, or commit to a token + a bidi-aware `doc.line()` PDF renderer + read-mode + export representation) in the storage-format decision, before any toolbar UI exists — never ship a formatting button three of four render surfaces can't represent.
3. The snippets caret-popover breaks the moment a field becomes `contenteditable` — `snippets.js` is built entirely on `.value`/`.selectionStart`/a textarea-mirror technique that doesn't exist on `contenteditable`. This is the strongest single argument for the textarea-toolbar architecture: it preserves snippets for free.
4. Section drag-sort's 260615 export-order bug class — Settings sets order but the form, PDF, and Markdown/clipboard export are separate consumers; miss one and it silently diverges. Enumerate every consumer, route through one saved-order source, and add/flip a test asserting export order == saved order, atomically with the export-builder refactor.
5. jsdom cannot see real caret/selection/render behavior — the existing `npm test` suite can verify pure functions (MdRender output, `parseInlineBold` segmentation, order-model functions) but NOT contenteditable editing, paste, drag pointer events, actual PDF layout/font rendering, RTL visual order, or Safari/iOS quirks. This repo has shipped false-GREEN jsdom PDF tests before — real-browser (Playwright WebKit) + real installed-Safari-PWA-on-iPhone + a real opened PDF are mandatory verification steps, not optional polish.

## Reconciled Disagreements

**1. Editor surface — resolved in favor of the 3-way convergence.** STACK, ARCHITECTURE, and PITFALLS independently read the live source and converged on Markdown-at-rest + keep the `<textarea>` + a marker-inserting toolbar (`textarea.setRangeText()`/`.value` mutation). This preserves snippets, autogrow, and dirty-tracking, and keeps the escape-first `MdRender` as the only sanitization needed. FEATURES recommends `contenteditable` + `execCommand`, reasoning from general UX-pattern analysis rather than a direct read of `snippets.js`'s textarea coupling. This summary weights the 3-way, source-grounded convergence and treats `contenteditable` as rejected for v1.4 — it would break snippets outright, force a DOMPurify dependency violating the zero-dep rule, and hit a well-documented WebKit `contenteditable`/`execCommand` bug tail on the flagship installed-Safari-PWA environment. Revisit `contenteditable` only in a future milestone if customers demand true inline WYSIWYG beyond bold/underline/bullets.

**2. Reorder UX — resolved as composable, not either/or.** FEATURES recommends up/down arrow buttons as the accessible baseline (WCAG 2.2 SC 2.5.7 requires a non-drag path) with drag layered on top; STACK and PITFALLS specify a Pointer Events sorter as the drag mechanism (HTML5 native DnD is dead on iOS Safari touch). These are not in conflict: ship arrow buttons as the required, always-present baseline, and layer a Pointer Events drag-handle as an enhancement. Both researchers agree HTML5 DnD alone, and any vendored drag library, are rejected.

## Implications for Roadmap

### Phase 1: Storage-format & data-model decisions
**Rationale:** Every downstream surface (editor, PDF, export, migration, security posture) collapses onto this one choice; all four researchers flag it as the phase that must go first and be locked before any editor UI is built.
**Delivers:** Locked decisions — Markdown-at-rest (no migration), underline token/scope (or explicit drop), legacy-content interpretation policy (conservative render vs. per-field marker), `sectionOrder` sentinel shape (single sentinel record, recommended).
**Addresses:** Storage-format decision (P1, FEATURES); underline decision (Pitfall 3); mixed plain/formatted + old-backup migration (Pitfall 6).
**Avoids:** Pitfall 1 (contenteditable/innerHTML round-trip), Pitfall 3 (underline discovered too late), Pitfall 6 (destructive in-place migration).

### Phase 2: MdRender + PDF underline (and format verification)
**Rationale:** Small, pure, unit-testable; unblocks the in-form read view and makes "does formatting survive export?" verifiable end-to-end before the toolbar UI lands. Bold/bullets need zero PDF changes (already shipped Phase 23-12) — this phase is purely the underline gap plus a regression net over the existing pipeline.
**Delivers:** `md-render.js` underline rule + escape-invariant unit test; `pdf-export.js` segment model extended to `{text,bold,underline}` with a manual `doc.line()` underline rule; RTL/bidi test vectors for bold Hebrew, mixed Hebrew+Latin+digit bold runs, and Hebrew bulleted lists, verified in a real opened PDF (not jsdom).
**Uses:** Extended `window.MdRender`; `pdf-export.js`'s existing `parseInlineBold`/bidi pipeline.
**Implements:** MdRender + PDF pipeline components from ARCHITECTURE.md.

### Phase 3: Rich-text toolbar editor + in-form read view
**Rationale:** The headline UX; depends on Phases 1-2 (format + underline rendering must exist first) so "does it survive export" is checkable as the toolbar is built, not discovered afterward.
**Delivers:** Toolbar-over-textarea (Bold/Underline/Bullet buttons using `setRangeText`/`.value` mutation + synthetic `input` dispatch), keyboard shortcuts, a rendered read-mode view (MdRender into a new preview surface, replacing raw-token display), paste handling verified to stay plain-text (textarea paste is `text/plain` only — the biggest XSS/garbage-markup risk evaporates by construction), sessions-table preview strip-to-plain.
**Addresses:** Bold/italic/bullet table stakes (FEATURES P1); paste sanitization (P1, satisfied structurally); snippets/autogrow regression-free (P1).
**Avoids:** Pitfall 4 (snippets breakage), Pitfall 5 (read mode/table still on raw textContent), Pitfall 9 (undo/autogrow regressions).

### Phase 4: Section order storage + form/export consumption
**Rationale:** Independent of Phases 1-3 until the export-builder refactor step; can run in parallel with Track A up to that point, per ARCHITECTURE's suggested build order.
**Delivers:** `sectionOrder` sentinel + `db.js`/`backup.js` allow-list registrations + `App.getSectionOrder()` cache; add/edit form reordered per saved order; export-builder refactor done atomically with the guard-test rewrite — `buildSessionMarkdown`, `buildFilteredSessionMarkdown`, `EXPORT_SECTION_ORDER`, and `severityAfterSections` all repointed to the saved order in one commit, `30-export-markdown` test flipped to assert `export order == saved order`.
**Addresses:** Section reorder table stakes (FEATURES P1) — persistence, propagation to forms, export/copy builder coupling.
**Avoids:** Pitfall 10's core (260615 export-order divergence) — this is the phase where the historical bug class is explicitly closed, not just avoided.

### Phase 5: Drag-sort UI (Settings) + arrow-button baseline
**Rationale:** Layered enhancement over Phase 4's storage/consumption plumbing; sequenced after Phase 4 so drag-sort writes into an already-correct, already-consumed order model.
**Delivers:** Up/down arrow buttons per section row (required, WCAG-compliant baseline) + optional Pointer Events drag-handle enhancement (`pointerdown`/`setPointerCapture`/`touch-action:none`, dedicated grip handle not full-row drag), "reset order" affordance.
**Uses:** Pointer Events L2 from STACK.md; arrow-button accessible-baseline pattern from FEATURES.md.
**Implements:** Section drag-sort UI component from ARCHITECTURE.md.

### Phase 6: Real-device/real-artifact verification + docs gate + demo parity
**Rationale:** jsdom cannot see caret/selection/paste/drag/PDF-layout/RTL-visual-order/Safari-PWA behavior — this repo has been burned by false-GREEN jsdom PDF tests before. This phase is the mandatory closing gate, not optional polish, and also where the project's own Definition-of-Done (changelog + help topics) and demo-parity requirements land.
**Delivers:** Real installed-Safari-PWA (iPhone) verification of toolbar editing, snippets, undo, and drag-sort touch; real opened PDF verification of bold/underline/RTL/bidi vectors and no Hebrew-tofu font fallback; `sw.js` `PRECACHE_URLS` updated for any new asset; demo seed data updated with bold/underline/bullet examples; changelog + help topic entries (or explicit `Help-Unaffected:`/`Changelog-Unaffected:` trailers) satisfying the v1.3 docs hard-gate; old `.sgbackup` restore round-trip check.
**Addresses:** The "Looks Done But Isn't" checklist from PITFALLS.md in full.
**Avoids:** Pitfall 7 (RTL/bidi), Pitfall 8 (WebKit contenteditable quirks — moot given the textarea decision, but the toolbar's own touch/keyboard behavior still needs device verification), Pitfall 11 (jsPDF font/wrap/indent traps), and the repo's process traps (docs gate, demo parity, SW precache, jsdom false-GREEN).

### Phase Ordering Rationale

- Storage-format and underline-token decisions gate everything downstream (XSS surface, snippets survival, migration policy, what the export/PDF must render) — they must be locked on paper before any editor code exists (ARCHITECTURE, PITFALLS both independently insist on this ordering).
- The editor track and the reorder track are architecturally independent and could run as parallel phases, EXCEPT they both edit `export-modal.js`'s builders — sequence so that file is touched by one hand at a time, with the reorder's builder refactor treated as one atomic, test-covered commit to prevent even a brief re-opening of the 260615 bug.
- Verification (real device, real PDF, real installed PWA) is deliberately its own late phase rather than folded into each build phase, because this repo has concretely shipped false-GREEN jsdom-only test passes before (PDF rendering, SW/offline). Keeping it a named gate prevents that recurrence.
- Pre-prod Cloudflare Pages environment setup (from STACK.md) is orthogonal infra work — a separate, low-risk phase that can be sequenced anywhere convenient (not represented above as it doesn't depend on or block the feature phases), but must be checked against the `deploy`-branch docs-gate anchor before use.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Storage-format & underline decision):** underline delimiter choice and legacy-content interpretation policy are explicitly flagged LOW-confidence/open-for-discuss-phase by ARCHITECTURE — needs a discuss-phase decision session with Ben, not further research.
- **Phase 2 (PDF underline):** jsPDF has no native underline decoration; the manual `doc.line()` positioning against bidi-reordered runs is fiddly and worth a research-phase pass if the implementer hasn't touched `pdf-export.js`'s run-drawing code before.
- **Phase 6 (Verification):** real-device Safari PWA + real-PDF verification methodology may warrant a quick research-phase refresh on current Playwright WebKit capabilities for touch/pointer-event simulation.

Phases with standard patterns (skip research-phase):
- **Phase 3 (toolbar editor):** `setRangeText()`/synthetic-input-dispatch is a well-documented, already-precedented pattern in this exact codebase (mirrors `insertExpansion` in snippets.js).
- **Phase 4 (section order storage):** the sentinel-record pattern is proven and already shipping (`snippetsDeletedSeeds`); this is a mechanical extension.
- **Phase 5 (drag-sort UI):** Pointer Events sortable pattern is well-established and documented in STACK.md with a concrete implementation sketch.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Grounded in direct reads of `pdf-export.js`, `md-render.js`, `export-modal.js`, plus MDN/caniuse for API baseline status. |
| Features | HIGH (domain patterns), MEDIUM (editor-surface recommendation) | Domain feature landscape (table stakes/anti-features/WCAG) is mature and cross-verified; the lone `contenteditable` recommendation is weighted lower here because it wasn't grounded in the same direct-source reads as the other three files (see Reconciled Disagreements). |
| Architecture | HIGH | Every load-bearing claim cites file:line from live source; LOW only on the deliberately-open discuss-phase forks (underline token, legacy-render policy, toolbar shape, order-storage option). |
| Pitfalls | HIGH (repo-specific), HIGH/MEDIUM (browser-quirk specifics) | Repo-specific integration points read directly from source; established browser-quirk pitfalls (iOS DnD, WebKit contenteditable/execCommand) are stable, well-documented behaviors; specific WebKit version details are MEDIUM. |

**Overall confidence:** HIGH

### Gaps to Address

- Underline scope/token: genuinely undecided — needs a discuss-phase/requirements decision with Ben (drop vs. `++x++` token + PDF renderer), not further research. Flagged consistently across all four files.
- Legacy plain-text retro-interpretation: whether pre-existing notes containing literal `*`/`-`/`#` should render conservatively (accept ARCHITECTURE's recommendation) or gate behind a per-field marker — a product/UX call, not a technical unknown.
- Section-order storage shape: ARCHITECTURE recommends a single sentinel record (option b) over per-row `order` ints (option a); both are technically viable — pick one in Phase 1/4 planning rather than treating it as still open.
- Whether reorder ships in the same milestone as rich text: they intersect only at `export-modal.js`; if capacity is tight, reorder could plausibly be split to a follow-up milestone without touching the rich-text work, per ARCHITECTURE's confidence note.
- True-italic-in-Hebrew-PDF: Heebo has no official italic face; STACK recommends deferring rather than vendoring a synthetic oblique — surface this as an explicit scope-out in requirements rather than silently shipping degraded italic.

## Sources

### Primary (HIGH confidence)
- Direct source reads: `assets/pdf-export.js`, `assets/md-render.js`, `assets/export-modal.js`, `assets/add-session.js`, `assets/snippets.js`, `assets/db.js`, `assets/settings.js`, `assets/app.js`, `assets/backup.js`, `assets/sessions.js`, `add-session.html`, `demo-seed-data.json`, `tests/30-export-markdown.test.js`
- `.planning/PROJECT.md`, `.planning/todos/pending/2026-05-13-drag-sort-settings-categories.md`, `CLAUDE.md` (docs-gate rules)
- MDN — `Document.execCommand()` deprecated status
- caniuse + Bugzilla 1922723 — `contenteditable="plaintext-only"` support matrix

### Secondary (MEDIUM confidence)
- npm/GitHub cure53/DOMPurify — size/version reference (not used, but sized for the rejected alternative)
- Sparkbox / Smashing Magazine / Adobe React Spectrum — WCAG 2.2 SC 2.5.7 dragging-movements and accessible list-reorder patterns
- Cloudflare Pages docs + community staging guides — second-project/branch pre-prod setup
- alfy.blog (2026) — native HTML Sanitizer API industry trend (tracked, not depended on)

### Tertiary (LOW confidence)
- robehickman.com / CSS-Script — Pointer Events sortable implementation sketches (pattern-level reference only, not a vendored library)

---
*Research completed: 2026-07-11*
*Ready for roadmap: yes*
