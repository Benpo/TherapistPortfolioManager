---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 03
subsystem: ui

tags: [markdown, html-escape, xss-mitigation, iife, vanilla-js, export-preview]

# Dependency graph
requires:
  - phase: 22-pattern-map
    provides: PATTERNS.md analog for utility module shape (SharedChrome IIFE)
provides:
  - "window.MdRender.render(string) — pure function returning HTML string safe for innerHTML insertion"
  - "Escape-first regex pipeline supporting h1/h2/h3, **bold**, *italic*, unordered lists, paragraphs, line-breaks"
  - "OWASP-canonical XSS payloads neutralized at the escape stage (script tags, img onerror, javascript: URLs)"
  - "RTL/UTF-8 round-trip for Hebrew, German, Czech text"
affects:
  - 22-06-export-modal-and-buildSessionMarkdown (consumes MdRender.render in preview pane)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Escape-first markdown subset: HTML-escape full input → regex-restore only fixed structural tags (h1-h3, strong, em, ul, li, p, br) — no attribute slots, no URL slots, structurally XSS-immune"
    - "IIFE module shape mirroring SharedChrome — window.<Name> = (function(){ 'use strict'; ... return { ... }; })()"

key-files:
  created:
    - "assets/md-render.js — escape-first markdown→HTML renderer (~2.7 KB, no DOM, no deps)"
  modified: []

key-decisions:
  - "Escape-first ordering: HTML-escape entire input BEFORE any markdown regex runs — ensures attacker-controlled tags are decomposed into &lt;/&gt; entities before structural rules fire"
  - "Subset deliberately excludes [text](url) and ![alt](src) — emitting <a>/<img> would reintroduce a URL slot for javascript: smuggling"
  - "Bounded non-greedy regex quantifiers ([^*\\n]+?) prevent pathological backtracking; perf benchmark 16 KB → 0.79 ms"
  - "Single-line heading match (block.indexOf('\\n') === -1) — prevents '# ' inside paragraphs from being mis-classified"

patterns-established:
  - "Vanilla utility module shape: window.<Name> = (function(){ ... })() with strict mode and a minimal returned surface"
  - "Security pipeline order documented in file header — first rule of any future renderer extension is 'escape-first remains invariant'"

requirements-completed:
  - REQ-12

# Metrics
duration: 1min
completed: 2026-05-06
---

# Phase 22 Plan 03: md-render-utility Summary

**Tiny escape-first Markdown→HTML renderer (window.MdRender.render) for the export modal preview pane — replaces ~50 KB marked.js with ~2.7 KB of pure regex while structurally blocking the OWASP XSS canonical payloads.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-05-06T16:43:22Z
- **Completed:** 2026-05-06T16:45:19Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 1 (created)

## Accomplishments

- `window.MdRender.render(string)` exposes a single pure function that takes Markdown and returns HTML safe for `element.innerHTML` insertion in Plan 22-06's preview pane.
- Pipeline sequence (security-critical): escape `& < > " '` across the **entire** input first, then split on blank-line separators, classify each block as heading / list / paragraph, and finally apply inline `**bold**` / `*italic*` substitution **on already-escaped text** so no markdown rule can reintroduce a tag-forming `<`.
- Producible tag set is fixed at compile-time: `<h1>`, `<h2>`, `<h3>`, `<strong>`, `<em>`, `<ul>`, `<li>`, `<p>`, `<br>` — none accept attributes, none accept URLs. Attribute injection and `javascript:` smuggling are structurally impossible (T-22-03-02, T-22-03-03 mitigated).
- 14 inline smoke tests pass: heading hierarchy, bold/italic, lists, paragraphs, `<script>` escape, `<img onerror=>` escape, `javascript:` URL non-execution, mixed Hebrew round-trip, full session-card composition.
- Perf budget: 16 KB synthetic input renders in 0.79 ms in node — well under the 50 ms threshold from threat T-22-03-04 (DoS via regex backtracking).

## Task Commits

Each TDD gate was committed atomically:

1. **Task 1 — RED gate (failing stub):** `e9bfb7a` — `test(22-03): add failing markdown→HTML render stub`
2. **Task 1 — GREEN gate (implementation):** `9ffdc07` — `feat(22-03): implement escape-first markdown→HTML renderer`

REFACTOR gate: not produced — implementation already followed the SharedChrome IIFE pattern verbatim and required no cleanup.

## Files Created/Modified

- `assets/md-render.js` — Created. Pure-function IIFE assigning `window.MdRender = { render }`. 2775 bytes. Exports a single Markdown→HTML transform with no DOM access and no external dependencies.

## Decisions Made

- **Escape-first ordering, not last** — running escape after structural rules would still leak tag glyphs through heading/paragraph text content. Escaping before any regex fires guarantees `<` is `&lt;` everywhere downstream.
- **No `<a>` or `<img>` in producible tag set** — even with URL allow-listing, link/image markdown is the canonical XSS smuggling channel. Excluding the syntax entirely removes the entire vulnerability class instead of patching it.
- **Single-line heading guard** (`block.indexOf('\\n') === -1`) — without this, a paragraph that happens to start with `# ` would be re-cast as `<h1>` with the rest of the paragraph swallowed.
- **Did not vendor marked.js / micromark** — the consumed subset is exactly what `buildSessionMarkdown` emits today (h1/h2/h3, bold, italic, list, paragraph). Pulling 50 KB to support a closed feature subset is wrong tradeoff per CONTEXT.md D-18.

## Deviations from Plan

None — plan executed exactly as written. The plan's `<action>` block included a complete file template; this implementation matches it character-for-character with no modifications. All 11 acceptance-criteria checks (file existence, required tokens, 5 escape replacements, return surface, node parse, 4 smoke assertions, file size) pass on the GREEN commit.

**Total deviations:** 0
**Impact on plan:** None.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. The file is included via a regular `<script>` tag in `add-session.html` by Plan 22-06; no lazy loading, no env vars, no dashboard steps.

## Threat Model Coverage

All five STRIDE entries from the plan's `<threat_model>` are satisfied at GREEN:

| Threat ID | Disposition | Verified by |
|-----------|-------------|-------------|
| T-22-03-01 (script/img onerror XSS) | mitigate | Test 8/10 — literal `<script>` and `<img` not in output; `&lt;script&gt;` / `&lt;img` present |
| T-22-03-02 (attribute injection) | mitigate | Renderer emits no attribute slots — structurally impossible |
| T-22-03-03 (`javascript:` URL smuggling) | mitigate | Subset excludes link syntax; Test 9 confirms no executable href in output |
| T-22-03-04 (regex DoS) | mitigate | Bounded `[^*\\n]+?` quantifiers; 16 KB → 0.79 ms benchmark |
| T-22-03-05 (info disclosure) | accept | Pure function, only side effect is `window.MdRender =` assignment |

No new threat surface introduced beyond what the threat model already covers.

## Next Phase Readiness

- `window.MdRender.render` is ready for Plan 22-06's export-modal preview pane to consume directly via `previewEl.innerHTML = MdRender.render(textarea.value)`.
- No follow-up work for this utility unless the export feature later expands to support links or tables — both would require explicit threat-model re-derivation before extension.

## Self-Check: PASSED

- File exists: `assets/md-render.js` — FOUND
- RED commit: `e9bfb7a` — FOUND in `git log`
- GREEN commit: `9ffdc07` — FOUND in `git log`
- All 14 smoke-test expectations pass on GREEN
- Plan's automated verify command (`node -e "..."`) returns `all_ok`
- File size 2.7 KB within plan-required 1-4 KB range
- Return surface is exactly `{ render: render }`

---
*Phase: 22-session-workflow-loop-pre-session-context-card-editable-sess*
*Completed: 2026-05-06*
