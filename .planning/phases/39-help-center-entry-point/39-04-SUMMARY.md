---
phase: 39-help-center-entry-point
plan: 04
subsystem: ui
tags: [help-center, render, i18n-interpolation, search, deep-link, install-glyphs, jsdom-test]
status: complete

# Dependency graph
requires:
  - plan: 39-01
    provides: "window.HELP_CONTENT_EN (12 sections) + window.HELP_DEEPLINKS + {ui:key} live-label tokens + glyph node schema"
  - plan: 39-02
    provides: "help.page.title + help.search.* UI-chrome i18n keys (4 locales)"
  - plan: 39-03
    provides: "renderNav() Help anchor (data-nav=help active marking) + App.initHelpEntry '?' header entry"
provides:
  - "help.html — standalone offline help center page shell (per-page scaffold, body data-nav=help, empty rail/content containers)"
  - "assets/help.js — renders the hybrid A+C IA from window.HELP_CONTENT_EN with {ui:key} interpolation, substring search + no-match fallback, deep-link auto-expand, scroll-spy, computer-only install glyphs; window.Help test seam"
  - "assets/help.css — soft-type help surfaces (scale tokens scoped to .help-root, semantic tokens + logical properties only)"
  - "tests/39-help-render.test.js — jsdom render + interpolation + XSS-echo behavior gate (auto-discovered by run-all.js)"
affects: [39-05-empty-state-deeplinks, 39-06-webkit-visual-checkpoint, 43-docs-maintenance-gate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Scale-token scoping: the mockup's spacing/radius/typography scale (absent from shipped tokens.css) is redeclared on .help-root so it never leaks into the shared app chrome that relies on app.css's own var(--space-*, <px>) fallbacks"
    - "Content-driven render: every card + rail item is built from window.HELP_CONTENT_EN — zero topic copy in help.html (D-18), integrity + render tests key off card count === array length"
    - "createElement + textContent for ALL dynamic text; inline SVG (chevrons + install glyphs) is the only compile-time-literal innerHTML (T-39-06/T-39-07)"

key-files:
  created:
    - help.html
    - assets/help.js
    - assets/help.css
    - tests/39-help-render.test.js
  modified: []

key-decisions:
  - "Scale tokens (space/radius/text/weight/lh/tap) live on .help-root, not :root — the sketch theme carried them but the shipped tokens.css does not, and a global redeclare would silently override app.css chrome spacing on the help page only"
  - "Soft type is always-on for help surfaces: the mockup's .soft-type gated rules are folded directly into .help-root selectors (no toggle, D-05)"
  - "Rubik @font-face is NOT redeclared — tokens.css already ships weights 400/600/700 (Pitfall 5)"
  - "EN-only chrome strings (page-head intro, group eyebrows, spine/tech-band labels, contact band, 'Start here', 'Jump to a section') are hardcoded English — help body is EN-only for now (D-18) and these have no i18n keys; help.page.title + help.search.* ARE bound to live labels"
  - "help.js exposes window.Help (render/applySearch/openForHash/interpolateUiLabels/setOpen) as the jsdom test seam, mirroring the initHelpEntry/checkBackupReminder seam convention"

patterns-established:
  - "help-surface CSS scoped under .help-root with a locally-declared scale so shared app.css chrome is untouched"
  - "renderer keeps styling in help.css — JS sets no inline colors/spacing except display toggles for search filtering"

requirements-completed: [HELP-02, HELP-03, HELP-06]

coverage:
  - id: D1
    description: "help.html is a valid standalone app page (per-page scaffold, data-nav=help, tokens/app/help CSS, help-content-en.js before help.js, SW registration) with EMPTY rail/content containers"
    requirement: HELP-02
    verification:
      - kind: unit
        ref: "Task 1 automated: data-nav=help + help.css link + script order + no-hex/no-physical-property gate — OK shell+css"
        status: pass
    human_judgment: false
  - id: D2
    description: "help.js builds window.HELP_CONTENT_EN.length cards from the content array, featured first + open, each card id === section.id, every topic anchor-addressable"
    requirement: HELP-03
    verification:
      - kind: unit
        ref: "tests/39-help-render.test.js#.help-card count === HELP_CONTENT_EN.length + featured-first/open + every card id === section.id"
        status: pass
    human_judgment: false
  - id: D3
    description: "{ui:key} tokens render the current live i18n label via App.t() (D-23) — no literal {ui:...} leaks"
    requirement: HELP-03
    verification:
      - kind: unit
        ref: "tests/39-help-render.test.js#{ui:settings.tab.fields} renders the resolved live label + no literal {ui:...}"
        status: pass
    human_judgment: false
  - id: D4
    description: "Search no-match echoes the term via textContent with no injected element (T-39-06); calm 'write to us' mailto fallback, never a dead end"
    requirement: HELP-02
    verification:
      - kind: unit
        ref: "tests/39-help-render.test.js#<img onerror> term echoed as text, NO <img> created — proven falsifiable (innerHTML flip fails 3 assertions), reverted"
        status: pass
    human_judgment: false
  - id: D5
    description: "Deep-link arrival (help.html#<id>) auto-expands the owning card (D-11)"
    requirement: HELP-02
    verification:
      - kind: unit
        ref: "tests/39-help-render.test.js#openForHash(#topic-first-client) expands its owning card"
        status: pass
    human_judgment: false
  - id: D6
    description: "Computer-only install (Chrome/Edge + macOS Safari) with inline SVG glyphs, one mobile expectation note; no universal Install button, no iOS/Android legs (D-14/D-15/D-16)"
    requirement: HELP-06
    verification:
      - kind: unit
        ref: "content model (Plan 01 integrity test) supplies only install-chrome/install-safari/mobile-note; help.js glyph renderer maps only those two names to compile-time SVG"
        status: pass
    human_judgment: true
    rationale: "Visual correctness of the glyphs + soft-type/RTL/dark rendering is the Plan 06 WebKit checkpoint's job"
  - id: D7
    description: "Soft-type help surfaces (Rubik 400 headings in --color-primary-deeper, 600 h3, 700 labels) from real Rubik faces; semantic tokens + logical properties, no literal hex"
    requirement: HELP-03
    verification:
      - kind: unit
        ref: "Task 1 gate: no #hex, no bare right:/left:/margin-left in help.css"
        status: pass
    human_judgment: true
    rationale: "Calm/soft visual feel + dark-mode botanical invert are the Plan 06 rendered-page review"

# Metrics
duration: ~7min
completed: 2026-07-07
tasks: 3
files: 4
---

# Phase 39 Plan 04: Help Center Page Render Summary

**The standalone offline help center — `help.html` shell + `assets/help.js` (renders the approved hybrid A+C IA from `window.HELP_CONTENT_EN` with `{ui:key}` live-label interpolation, substring search + calm no-match fallback, deep-link auto-expand, scroll-spy, and computer-only install glyphs) + `assets/help.css` (soft-type surfaces) + a jsdom render/XSS-echo gate.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-07-07T19:59:53Z
- **Tasks:** 3
- **Files:** 4 (all created)

## Accomplishments

- **`help.html`** — a valid per-page app scaffold (crashlog early-buffer, terms/license/theme bootstrap, favicon/manifest, `#headerActions` + `#nav-placeholder` header, SW registration), `body[data-nav=help]`, links `tokens.css` + `app.css` + `help.css`, script order loading `help-content-en.js` before `help.js`. Rail/content containers ship EMPTY (`#railBody`, `#helpCards`); topic copy is never hardcoded (D-18).
- **`assets/help.js`** — `render()` builds the full hybrid A+C IA from the content array: a grouped unnumbered rail ("The session loop" / "The technical bits" + divider), the featured personalization card first + open with a "Start here" tag, session-loop cards under a spine label, and the technical cards wrapped in the tech-band. `interpolateUiLabels()` resolves every `{ui:key}` to the live `App.t()` label (D-23) and re-renders on `app:language`. `applySearch()` substring-filters cards + rail items, hides empty rail groups / divider / tech-band, and shows the calm "write to us" no-match state with the term echoed via `textContent`. `openForHash()` auto-expands + scrolls a deep-linked topic; an `IntersectionObserver` drives scroll-spy. Install glyphs render compile-time-literal inline SVG (Chrome/Edge monitor-with-arrow + macOS Safari Add-to-Dock).
- **`assets/help.css`** — the mockup's help-surface CSS ported near-verbatim, with the spacing/radius/typography scale scoped to `.help-root` (no leak into shared chrome), soft type always on, semantic tokens + logical properties only, no literal hex.
- **`tests/39-help-render.test.js`** — a jsdom behavior gate driving the REAL `help.js` against the REAL `help.html` skeleton; 12/12 checks green, XSS-echo assertion proven falsifiable then reverted; full suite 134/134.

## Task Commits

1. **Task 1: help.html shell + help.css soft-type surfaces** — `3214227` (feat)
2. **Task 2: help.js renderer** — `ae4973b` (feat)
3. **Task 3: jsdom render + interpolation + XSS-echo test** — `a77f8b0` (test)

## Deviations from Plan

None — plan executed as written. No auto-fixes, no authentication gates, no checkpoints.

Note (not a deviation): the plan's Task-1 `read_first` pointed at the sketch's scale tokens (`--space-*`, `--radius-*`, `--text-*`, `--weight-*`, `--lh-*`, `--tap-target-min`) as if they were in `tokens.css`; they are only in the throwaway sketch theme. Per the plan's own "Reference ONLY semantic tokens from tokens.css" instruction and Pitfall 5, the scale was redeclared with the mockup's exact values, scoped to `.help-root` so it cannot alter the shared app chrome — the intended near-verbatim port with no visual drift.

## Known Stubs

None. Rail + cards are fully data-driven from `window.HELP_CONTENT_EN`. The EN-only chrome strings (page-head intro, group eyebrows, spine/tech-band labels, contact band, "Start here", "Jump to a section") are intentional hardcoded English — the help BODY is EN-only for now (D-18) and these have no i18n keys; `help.page.title` and the `help.search.*` chrome ARE bound to live labels.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes. The two trust boundaries in the plan's threat model (search term echo, content/`{ui:key}` render) are mitigated exactly as specified — all dynamic text via `createElement`+`textContent`, inline SVG the only literal innerHTML — and the render test asserts the `<img onerror>` term is inert (T-39-06).

## Next Plan Readiness

- Plan 05 (empty-state coaching trio) can deep-link into `help.html#<section-id>` via `window.HELP_DEEPLINKS`; `openForHash()` auto-expands the owning card on arrival.
- Plan 06 (WebKit checkpoint) performs the real-Safari visual pass: soft-type feel, dark-mode botanical invert, RTL flip, install-glyph rendering, and scroll-spy on a real installed page.
- Reminder (HELP-07, still pending): `sw.js` PRECACHE_URLS must gain `help.html`, `assets/help.js`, `assets/help.css`, and `assets/help-content-en.js` — a known manual chore-commit follow-up.

## Self-Check: PASSED

- Files verified on disk: help.html, assets/help.js, assets/help.css, tests/39-help-render.test.js, .planning/phases/39-help-center-entry-point/39-04-SUMMARY.md
- Commits verified in git log: 3214227 (Task 1), ae4973b (Task 2), a77f8b0 (Task 3)
