---
phase: 45-rich-text-rendering-export-foundation
plan: 04
subsystem: ui
tags: [markdown, md-render, read-mode, render, strip, xss, escape-first, rtl, blocker-1]

# Dependency graph
requires:
  - phase: 45-rich-text-rendering-export-foundation
    plan: 01
    provides: window.MdRender.render (escape-first, ordered/nested lists) + MdRender.strip (markdown->plain-text)
provides:
  - Read-mode .note-rendered overlay (RTXT-06) — saved notes render as styled HTML via MdRender.render (the app's ONE sanctioned user-note innerHTML surface)
  - Compact-surface markdown strip (D-06) on sessions trapped cell, overview comments line, add-session spotlight quote — plain text via textContent
  - md-render.js loaded on sessions.html + index.html (BLOCKER 1 — strip now runs in production on all three surfaces, not just add-session.html)
  - Scoped .note-rendered subordinate note-heading CSS register (UI-SPEC §B) + .export-preview ol indent
affects: [45-05-cross-pipeline-source-assertion, 45-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-mode overlay: MdRender.render -> innerHTML (escape-first) with a textContent fallback; teardown clears via textContent so MdRender.render stays the sole innerHTML writer"
    - "Textarea single source of truth: overlay rebuilt on read-mode entry, torn down on edit-mode entry; never autoGrow a hidden textarea (Pitfall 5)"
    - "Compact surfaces route user text through MdRender.strip -> textContent (plain text, no HTML)"
    - "Note-heading register scoped under .note-rendered so it never bleeds onto .export-preview headings"

key-files:
  created:
    - tests/45-read-mode-render.test.js
    - tests/45-compact-strip.test.js
  modified:
    - assets/add-session.js
    - assets/app.css
    - assets/sessions.js
    - assets/overview.js
    - sessions.html
    - index.html
    - tests/31-overview-render-hardening.test.js
    - tests/31-sessions-render-hardening.test.js

key-decisions:
  - "Read-mode note overlay is the app's ONE sanctioned innerHTML write of user note content — routed EXCLUSIVELY through MdRender.render (escape-first); overlay teardown clears via textContent (not innerHTML='') so MdRender.render remains the sole innerHTML writer and the source-lock stays clean"
  - "Read mode no longer autoGrows the (hidden) textareas (Pitfall 5) — the .note-rendered overlay carries the visible height; the language-change handler re-renders overlays instead of resizing hidden fields"
  - "BLOCKER 1 resolved — md-render.js now loaded BEFORE sessions.js (sessions.html) and overview.js (index.html); previously loaded ONLY by add-session.html so the compact-surface strip fell back to raw markdown permanently in production on both pages"
  - "Note-heading register (17/16/15px @600, no rule/diamond) scoped under .note-rendered so it cannot bleed onto .export-preview h1/h2/h3 (UI-SPEC §B selector-scoping); .export-preview ol indent added for MdRender's new ordered-list output"

patterns-established:
  - "Extend (never weaken) the 31-* render-hardening locks: compact surfaces stay textContent-only after the strip change; the single narrow note-innerHTML exception is documented + MdRender-routed"

requirements-completed: [RTXT-06]

coverage:
  - id: D1
    description: "Read mode renders each of the 7 note fields as a visible .note-rendered overlay via MdRender.render (**bold** -> <strong>, - lines -> <ul>), hides the source textarea, tears down on edit with the textarea's value intact; <script> renders inert (escape-first); MdRender-absent falls back to textContent (literal), never raw innerHTML"
    requirement: RTXT-06
    verification:
      - kind: unit
        ref: "tests/45-read-mode-render.test.js (6 cases)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The three compact surfaces (sessions trapped cell, overview comments line, add-session spotlight quote) strip markdown to plain text via textContent (no <strong>, no literal ** / ##); md-render.js is loaded BEFORE the consumer script on sessions.html + index.html (BLOCKER 1 load-order source lock)"
    requirement: RTXT-06
    verification:
      - kind: unit
        ref: "tests/45-compact-strip.test.js (5 cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The 31-* render-hardening locks are extended (never weakened): compact surfaces stay textContent-only after the strip change; the read-mode innerHTML exception is documented as MdRender-routed and narrow"
    requirement: RTXT-06
    verification:
      - kind: unit
        ref: "tests/31-sessions-render-hardening.test.js (3 cases), tests/31-overview-render-hardening.test.js (3 cases)"
        status: pass
    human_judgment: false

# Metrics
duration: 10min
completed: 2026-07-13
status: complete
---

# Phase 45 Plan 04: Read-mode rendered notes + compact-surface strip Summary

**Stood up the primary NEW read surface — a `.note-rendered` overlay that renders saved formatted notes through the escape-first `MdRender.render` (the app's ONE sanctioned user-note innerHTML path) — wired the three compact surfaces to `MdRender.strip` plain text, fixed BLOCKER 1 (md-render.js was never loaded on sessions.html/index.html so strip silently no-op'd there in production), and extended the 31-* hardening locks. Full suite green (181/181).**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-13T10:00:48Z
- **Completed:** 2026-07-13T10:09:49Z
- **Tasks:** 3 (Tasks 1-2 TDD: RED test -> GREEN impl; Task 3 lock extension)
- **Files modified:** 6 source + 2 new test files + 2 extended test files

## Accomplishments

- **Read-mode overlay (RTXT-06, Task 1):** `setReadMode(true)` now renders each of the 7 note `.session-textarea` fields into a sibling `.note-rendered` element via `window.MdRender.render(textarea.value)` (escape-first) and hides the textarea; `setReadMode(false)` tears the overlay down and restores the editable textarea. Hand-typed `#`/`##`/`###` note lines render as headings (D-01) at the subordinate register; all sessions render through one uniform path (D-07, no per-session format flag). MdRender-absent falls back to `textContent` (literal markdown), never raw innerHTML. A `<script>` note value renders inert.
- **Pitfall 5:** read mode no longer autoGrows the (now hidden) textareas — the overlay carries the visible height; the `app:language` handler re-renders overlays instead of resizing hidden fields.
- **Compact strip (D-06, Task 2):** sessions.js trapped cell, overview.js comments line, and the add-session spotlight quote (`renderSpotlightSessionInfo`) now route through `MdRender.strip(...)` before their `textContent` assignment — plain text, no `<strong>`, no literal `**`/`##`.
- **BLOCKER 1:** `md-render.js` is now loaded (before the consumer `<script>`) on `sessions.html` and `index.html`. It was previously loaded ONLY by `add-session.html`, so `window.MdRender` was `undefined` on the sessions table + overview pages and the strip guard fell back to raw markdown PERMANENTLY in production — while a jsdom test that loads md-render.js itself would false-pass. The compact-strip test now asserts the load-order on the raw HTML as a false-GREEN guard.
- **CSS (Task 1):** scoped `.note-rendered` subordinate note-heading register (17/16/15px @600, no border rule / no diamond, RTL-safe logical properties, existing `--color-*` tokens) that cannot bleed onto `.export-preview h1/h2/h3`; plus a `.export-preview ol` indent rule so MdRender's new ordered-list output indents correctly in the already-wired Step-2 preview.
- **Hardening locks (Task 3):** extended (never weakened) both 31-* locks — compact surfaces proven textContent-only after the strip change, and the single narrow read-mode innerHTML exception documented as MdRender-routed.

## Task Commits

Each task committed atomically (Tasks 1-2 TDD RED -> GREEN):

1. **Task 1: read-mode overlay + CSS** — `b0f862a` (test) -> `c16648e` (feat)
2. **Task 2: compact strip + md-render load-order** — `0a50e4c` (test) -> `5ee3ce0` (feat)
3. **Task 3: extend 31-* hardening locks** — `9281d1f` (test)

## Files Created/Modified

- `assets/add-session.js` — `renderReadModeNotes()` / `clearReadModeNotes()` helpers; `setReadMode` wired to render/tear-down overlays; language-change re-renders overlays; spotlight quote routed through `MdRender.strip`.
- `assets/app.css` — scoped `.note-rendered` register (p/ul/ol/li + subordinate h1/h2/h3) and `.export-preview ol` indent.
- `assets/sessions.js` — trapped-emotions cell routed through `MdRender.strip` (guarded).
- `assets/overview.js` — comments line routed through `MdRender.strip` (guarded).
- `sessions.html` / `index.html` — `md-render.js` `<script>` added before `sessions.js` / `overview.js` (BLOCKER 1).
- `tests/45-read-mode-render.test.js` — 6 cases (render, hide textarea, inert `<script>`, teardown, textContent fallback, source locks).
- `tests/45-compact-strip.test.js` — 5 cases (three surfaces stripped, HTML load-order source lock, strip source lock).
- `tests/31-*-render-hardening.test.js` — extended with textContent-only + read-mode-exception documentation cases (count guards bumped 1->3 / 2->3).

## Decisions Made

- **Overlay teardown clears via `textContent = ""`, not `innerHTML = ""`.** This keeps `overlay.innerHTML = window.MdRender.render(...)` as the SOLE innerHTML writer, so the source-lock (no raw-string innerHTML on the overlay) stays clean and the escape-first invariant is unambiguous.
- **Note-heading register is scoped under `.note-rendered`** (never bare `h1/h2/h3`) so it cannot leak onto the `.export-preview` headings — the UI-SPEC §B selector-scoping requirement, enforced by a source assertion.
- **BLOCKER 1 was a real production defect, not a test artifact** — resolved by the two `<script>` tags; no SW change needed (md-render.js already in `PRECACHE_URLS`), and no new docs-gate trailer needed for the two HTML files (both already in a help topic's `covers[]`; Plan 05's help edit satisfies their demand).

## Deviations from Plan

None - plan executed exactly as written. All three tasks followed the pinned behavior tables and acceptance criteria. One in-test regex fix was applied DURING Task 1 (the negative source-assertion for raw-string innerHTML was initially too broad and matched unrelated later code); it was tightened to target the `overlay` variable, and the teardown was switched to `textContent = ""` so the guard reads a single MdRender-only innerHTML writer. This was a test/impl co-design within the task, not a plan deviation.

## Issues Encountered

- The `gsd-tools state.record-metric` handler requires NAMED flags (`--phase/--plan/--duration/--tasks/--files`), not positional args as the workflow snippet suggested; re-run with flags succeeded.
- RTXT-06 was already marked complete by Plan 01 (which listed it under `requirements-completed`); `requirements.mark-complete` reported `already_complete` — expected, no action needed.

## Threat Flags

None — no new security surface. T-45-01 (stored XSS via note -> read-mode innerHTML) is MITIGATED and proven: the overlay writes innerHTML ONLY from `MdRender.render` (escape-first), a `<script>` note value renders inert, and MdRender-absent falls back to textContent. T-45-07 (regression weakening textContent-only hardening) is mitigated: the 31-* locks were extended, never weakened, and the compact surfaces stay textContent-only. Zero package installs (T-45-SC accept).

## Next Phase Readiness

- Read-mode rendering + compact strip are complete and test-locked. Plan 05 (cross-pipeline source assertion + docs) can assert the MdRender emphasis-regex identity across files and carry the phase's EN changelog + help edit (which also satisfies the docs-gate demand for the two newly-touched HTML files and for md-render.js's push).
- **Deferred to Plan 05 phase-gate checkpoint:** real installed-Safari read-mode + dark-mode + RTL visual check (jsdom cannot see rendering/RTL).
- **Docs hard-gate reminder for the eventual push:** `add-session.js`, `app.css`, `sessions.js`, `overview.js`, `sessions.html`, `index.html` are watched files — the EN changelog + help touch (or trailers) land in Plan 05 per project CLAUDE.md Definition of Done. `md-render.js` (touched in Plan 01) still needs its own `Help-Unaffected:` trailer (no covering help topic).

## Self-Check: PASSED

All 9 created/modified files exist on disk; all 5 task commits (`b0f862a`, `c16648e`, `0a50e4c`, `5ee3ce0`, `9281d1f`) present in git history. Full suite: 181 passed, 0 failed.

---
*Phase: 45-rich-text-rendering-export-foundation*
*Completed: 2026-07-13*
