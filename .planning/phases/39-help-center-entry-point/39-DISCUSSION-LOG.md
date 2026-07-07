# Phase 39: Help Center & "?" Entry Point - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-07
**Phase:** 39-help-center-entry-point
**Areas discussed:** Help-page layout (sketch 002), "?" click behavior & future menu, Content depth & visuals, Empty-state coaching scope, Anti-rot guardrail substrate (user-added)

---

## Folded Todos (pre-discussion)

| Option | Description | Selected |
|--------|-------------|----------|
| PWA install guidance + user manual (2026-03-24) | Maps onto HELP-04/HELP-06; closes at v1.3 ship | ✓ |
| In-app onboarding & help system (2026-05-15) | Origin todo; P39 delivers the help-center slice | ✓ |

**Notes:** Both were already declared "absorbed by v1.3" in PROJECT.md. The other 21 keyword matches from the todo scan were reviewed and found unrelated to help-center scope.

---

## Help-page layout (sketch 002 A/B/C)

| Option | Description | Selected |
|--------|-------------|----------|
| A — scroll + sticky rail | Single column, rail scroll-spy, cheapest, native anchors | |
| B — two-column docs | Stepper + content pane, SimplePractice feel, heaviest | |
| C — accordion + featured card | Compact, best jump-to-feature, deep-links need auto-expand | |
| Hybrid A+C (free text) | C's cards + featured card, with A's rail menu | ✓ |

**User's choice:** Hybrid A+C — "C looks much better but 40 topics without a table of contents make no sense... something like C but with the menu of A... clicking the menu item also opens the card."
**Notes:** User asked to see a mockup before committing; `hybrid.html` was built and approved through three iterations (font loading, search group-label bug fix).

Sub-decisions within this area:
- **Accordion behavior:** Stays open (multiple cards open at once) — over "one open at a time".
- **Rail depth:** Top-level sections only, UNNUMBERED (user: "not all of them are actually sequenced"), with in-rail chevron expansion of sub-topics — user-refined variant of the presented "top-level only" option.
- **Typography (freeform):** User asked for calmer/smoother font. Discovery: sketch theme never loaded real Rubik (system font shown). Soft-type mode (Rubik 400 headings) built + approved; "font looks nicer". No new font files.
- **Search (user-proposed):** Simple substring live-filter accepted as in-phase HELP-02 extension; fuzzy search deferred. Bug found by user (tech-bits group label stayed visible on empty filter results) and fixed.
- **Contact path (user-proposed):** "Still need help?" band + search no-match "write to us" fallback.
- **Mobile:** Strawman approved — search + sticky collapsible "Jump to a section" dropdown.

---

## "?" click behavior & future menu

| Option | Description | Selected |
|--------|-------------|----------|
| Direct to help.html | Header icons navigate; re-entries live ON the help page | |
| Popover menu from day one | Dropdown: Help center / Contact us; P40–42 append entries | ✓ |

**User's choice:** Popover menu from day one (chose against the recommendation).

| Option | Description | Selected |
|--------|-------------|----------|
| Help center + Contact us | Two useful items from day one | ✓ |
| + Install app | Third deep-link entry | |
| Help center only | Single-item menu | |

| Option | Description | Selected |
|--------|-------------|----------|
| Always top of help page | Predictable; search/rail cover finding | ✓ |
| Context-aware per page | Page→anchor map; riskier guesses | |

---

## Content depth & visuals per topic

| Option | Description | Selected |
|--------|-------------|----------|
| Priority-scaled depth | P1 steps, P2 paragraphs, P3 FAQ | (refined) |
| Uniform short-form | 1–3 calm paragraphs everywhere | |
| Full how-to everywhere | Numbered steps for all ~40 topics | |

**User's choice (free text):** "P1 should be detailed enough and stupid-proof. P2 also detailed but less. Only P3 is really nice-to-have with less effort spent." — a heavier version of priority-scaling.

| Option | Description | Selected |
|--------|-------------|----------|
| SVG glyphs only, no screenshots | Locale-neutral, dark-aware, drift-immune | ✓ (with scope note) |
| Glyphs + a few screenshots | More concrete, stale-prone | |
| Text + botanical only | Not HELP-06 compliant | |

**Notes:** User added a major scope note: "iOS (Mobile) currently not officially supported, as it's local only and the assumption is that eventually people will need a computer, so might as well focus only on computer." → HELP-06 amended to computer-only install instructions.

| Option | Description | Selected |
|--------|-------------|----------|
| Brief expectation-setting note | Designed for computers; per-device data | ✓ |
| Silence on mobile | No guidance | |
| Keep iOS/Android install topics | Original HELP-06 | |

| Option | Description | Selected |
|--------|-------------|----------|
| Rendered page, local | Sapir reviews real help.html in browser | ✓ |
| Exported doc first | Async doc review then page skim | |
| Review after ship | Fast-follow fixes | |

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated help-content file | assets/help-content-en.js, loaded only by help.html | ✓ |
| Everything in i18n-en.js | Global files bloat on every page | |
| Static HTML in help.html | Breaks i18n convention | |

**Wording pipeline (user-driven refinement over two turns):**
- Initially proposed grounded draft + 2 gates; user corrected the audience framing: "it's not true that most are non-native... aim for global audience eventually... we have several US colleagues already" → Gate B targets native-quality English for a global audience.
- User then requested an additional gate: "a gate about the wording and language to match the app DNA... keeping the app consistent with the wording across the help section as well as the app" → Gate C (App-DNA & consistency) defined; the existing DNA brief adopted as its canonical reference and committed (`.planning/SessionsGarden-DNA-EN.md` + `-HE.md`, commit 834e617).
- Side-note from user: language agents (Gates B/C) may run at Sonnet level.

---

## Empty-state coaching scope

| Option | Description | Selected |
|--------|-------------|----------|
| First-run journey trio | Overview / Sessions / Reporting in spine order | ✓ |
| Overview only | Bare minimum per requirement | |
| All true-empty states | Trio + snippets + photos | |

| Option | Description | Selected |
|--------|-------------|----------|
| Sentence + inline text link | Quietest treatment | |
| Sentence + secondary button | "Show me how" soft button | ✓ |

**Notes:** User didn't understand the question in the abstract ("I don't understand what are we even talking about. show me") — a visual demo (scratchpad `empty-state-demo.html`) was built showing both treatments in overview context; user picked Variant 2.

---

## Anti-rot guardrail substrate (user-added area)

**Origin:** User added "guardrail/mechanism concept" as a free-text fifth area at area selection. Clarified via 4 interpretations; user picked #1: help-content freshness guardrail (P39 builds the substrate; P43 owns the blocking gate).

| Option | Description | Selected |
|--------|-------------|----------|
| Live-label interpolation | {ui:key} renders current label; can't drift by construction | ✓ |
| Static drift test | Plain prose + test fails on label drift | |
| Both | Interpolation + full drift test | |

**Notes:** Bundled with the choice (not separately asked): per-topic `covers` metadata (from the Phase 32 inventory mapping) as the P43 gate hook, and a static integrity test in `npm test` ({ui:key} tokens resolve; deep-link anchors resolve).

---

## Claude's Discretion

- "?" icon order in `#headerActions`; Help position in `renderNav()`.
- `.is-active` behavior while the popover is open.
- Exact `help-content-en.js` topic-object schema beyond id/section/title/body/priority/covers.
- Rail/card animation, scroll-spy thresholds, search debounce.
- Desktop-Safari install nuances (Add to Dock availability).
- True-empty vs filter-empty detection implementation for the trio.

## Deferred Ideas

- Fuzzy/typo-tolerant help search (index + scoring).
- Context-aware "?" landing (page→topic map) — revisit once the P43 gate could police the mapping.
- HDEP-01 troubleshooting decision tree (already tracked for v1.4+).
- Mobile (iOS/Android) install support/instructions — only if mobile becomes officially supported.
