---
status: diagnosed
phase: 46-rich-text-toolbar-editor
source: [46-08-PLAN.md checkpoint — real-device gate, Ben driving; 46-14 re-run round 2]
started: 2026-07-14T21:30:00Z
updated: 2026-07-17T00:00:00Z
---

## Current Test

number: —
name: 46-14 re-run (round 2, 11 items) — in progress on the 00f0c08 pre-prod build
expected: |
  All 11 checklist items from 46-14-PLAN.md pass on installed Safari PWA (desktop),
  iPhone PWA, Chrome, Firefox, plus a real opened PDF.
awaiting: Ben continues the round-2 matrix; item 11 (export Step 2) FAILED on MacBook Pro
  (gaps 10/11 below), remaining items pending

## Tests

### 1. Toolbar + markers
result: partially exercised — no failure reported yet (desktop)

### 3/4. Lists + auto-renumber
result: issue — first build (acbfb04) stacked markers on repeat clicks ("forever-indent").
Fixed during gate: toggle/switch semantics (d88af87). Fix then failed to REACH the
device — see gap 5 (SW precache) — delivery fixed in be7877b. Awaiting re-test.

### 5. Undo/redo
result: issue — see gap 3 (granularity feels wrong; routes to the NAMED module-level
undo-stack follow-up designated by 46-08-PLAN.md).

### 8. Export Step 2
result: issue — see gaps 1/2 (layout breaks on focus; legacy two-pane collides with
toolbar + preview mount).

### 2, 6, 7, 9, 10 (shortcuts, live preview, snippets/autogrow, real PDF, RTL)
result: [pending] — matrix not finished; resume after be7877b re-test

### Round 2 (46-14 re-run, 2026-07-15, 00f0c08 build)

#### Item 11 — Export Step 2 single-pane / always-on toolbar / no accordion / SW delivery
result: FAILED on MacBook Pro — default (non-maximized) Step 2 renders the toolbar as a
clipped sliver and the editor at ~1.5 lines; toolbar also scrolls out of view on long
documents. See gaps 10 and 11.

#### Items 1-10 (round 2)
result: [pending] — Ben continuing the matrix

## Summary — CANONICAL GAP LEDGER (updated 2026-07-17)

One line per gap. "confirm at 46-16" = code-complete + machine-verified, needs
Ben's device eyes on the slimmed gate. "→ 46.1" = owned by the inserted
Preview & Edit Experience Redesign phase (design-first).

| Gap | What | Code status | Owner / next |
|-----|------|-------------|--------------|
| 1 | Export two-pane collided with toolbar | fixed (in-gate R1) | surface superseded → 46.1 |
| 2 | Export toolbar must be always visible | fixed (R1 persistent + R2 sticky/no-shrink) | ratified invariant, carried into 46.1 |
| 3 | Undo granularity + first-undo-after-load | fixed (46-09 + CR-01) | confirm at 46-16 |
| 4 | Preview toggle label+icon | fixed (46-11) | concept rejected → 46.1 |
| 5 | SW precache delivery | fixed (be7877b) | done, field-verified |
| 6 | Formatting-tips accordion removed | fixed (in-gate R1) | confirm at 46-16 |
| 7 | Emotions before/after opt-out | fixed (46-10) | confirm at 46-16 |
| 8 | Snippet-accept Enter in a list | fixed (46-11) | confirm at 46-16 |
| 9 | Heart-Wall export wording | fixed (46-12) | confirm at 46-16 |
| 10 | Step-2 layout collapse on laptops | fixed (46-15, probe-verified) | surface → 46.1 |
| 11 | Toolbar clip + scroll-away | fixed (46-15, probe-verified) | invariant → 46.1 |
| 12 | Export bar buttons dead without focus | fixed (46-17, jsdom+probe) | mechanism survives → 46.1 surface |
| 13 | Preview pane opens below the fold | fixed (46-17) | concept superseded → 46.1 |
| 14 | Preview/edit UX concept rejected (mixed state, inverted button signal, scroll model) | OPEN — design | 46.1: sketch → UI-SPEC → plan → build |
| 15 | Preview color = section-title orange | OPEN — design | 46.1 (unified preview language) |
| 16 | Bar hides on padding/gap click | fixed (a6de32f) | confirm at 46-16 |

Quality loops (context, not open work): phase review R1 4 findings (1 critical),
R2 3, R3 3 — all FIXED or explicitly accepted with rationale; three two-lens
architect reviews (R2, R3 plans) — all conditions folded in pre-execution.

**46-16 gate is SLIMMED:** verify only the content/editing items — undo (3),
accordion (6), emotions opt-out (7), snippet-in-list (8), Heart-Wall (9),
bar-padding click (16), plus iPhone core toolbar, real PDF, snippets/autogrow,
lists, RTL. Everything preview/export-flow-shaped (old items 2, 11-13) moved to
46.1's future gate.

## Gaps

### Gap 1 — Export Step 2: legacy two-pane layout collides with the mounted toolbar (severity: high)
status: resolved
RESOLVED during the gate (commits 5f63620/0318cae/0fc5bfe/3e9ad27): right Preview pane,
mobile tab switcher, and live-pane wiring removed; single full-width editor; preview now
exclusively via the toolbar eye toggle; sizing kept. Re-verify at the gate re-run.
What happens: Step 2 still renders the OLD side-by-side Edit|Preview live panes. On focusing
the editor, the focus-attached toolbar + its preview machinery re-flow the grid: the textarea
shrinks to a tiny box and panes swap/collapse (screenshots in session, 2026-07-14). Root cause:
the 46-06 plan's premise said Step 2 had a "swap-style Edit/Preview switcher" — the real page
is a side-by-side live two-pane. False reuse premise, same failure class as the Phase 37
backup blocker.
Ben's directive (product intent, verbatim decisions):
- REMOVE the right Preview pane entirely — single maximum-width edit surface.
- Preview happens via the toolbar preview toggle instead.
- With the right pane gone, the current ~50% default height is fine ("size would be fine
  before expanding").

### Gap 2 — Export Step 2: toolbar must be ALWAYS visible (severity: medium)
status: resolved
RESOLVED during the gate (same commit series): RichToolbar.mount gained an additive
`persistent: true` option — the export editor gets a dedicated permanently-docked bar;
the 7 note fields keep focus-attached behavior. Re-verify at the gate re-run.
The export editor toolbar must render permanently above the editor, not focus-attached
("the export should ALWAYS show the formatting bar, not only when clicking inside the window").
Note-field (session page) focus-attached behavior stays as built.

### Gap 3 — Undo/redo granularity "needs to feel real" (severity: high, NAMED follow-up)
status: failed
Ben typed several lines; one undo removed all of them. Native execCommand undo lets the
browser coalesce typing into big chunks, so step boundaries feel arbitrary. Per the
46-08-PLAN designated routing this is the D-20 discovery point and triggers the
pre-described follow-up plan (NOT generic gap work): a single module-level undo stack in
window.TextEdit that also intercepts Ctrl+Z (never a dual stack), swapped in behind the
existing button/keydown handlers; pure transforms untouched. Design goal: one undo step
per toolbar action; typing grouped into small human-scale units (e.g., per line/pause).
Failing target recorded: desktop browser (granularity UX), reported before the iOS matrix ran.

### Gap 4 — Preview toggle needs label + icon, both surfaces (severity: medium)
status: failed
Icon-only eye button is insufficient on note fields AND export. Ben's spec (2026-07-14):
label AND icon, showing the TARGET state — eye icon + "Preview" while editing (switches
to view), pencil icon + "Edit" while previewing (switches back). Applies wherever the
toggle appears.

### Gap 5 — SW precache omission: new modules bypassed the update pipeline (severity: high)
status: resolved
text-edit.js + rich-toolbar.js were not in PRECACHE_URLS (46-03 plan never touched sw.js),
so installed PWAs pulled them through the 24h HTTP cache (/*.js max-age=86400) — the
d88af87 list fix never reached Ben's device despite PWA restarts + cache clear, and offline
use would 404 them. Fixed in be7877b (precache both; APP_VERSION → 1.4.0 release bump).
Forward lesson: any plan adding a shipped asset must add it to PRECACHE_URLS.

### Gap 6 — Remove the Formatting-tips accordion (severity: low, CONFIRMED by Ben)
status: resolved
RESOLVED during the gate (same commit series): accordion markup, toggle logic, orphan CSS,
and 9 dead i18n keys removed from all four locales (parity kept). Step-2 helper copy
rewritten in 4 locales. Re-verify at the gate re-run.
Confirmed 2026-07-14: the tips accordion is stale now the toolbar exposes every
formatting affordance — remove it from export Step 2 (and from any other surface that
carries it, if found during planning). The syntax reference itself survives in the help
center (the 46-07 help update already documents formatting there); hand-typed markdown
keeps working regardless.

### Gap 7 — Export content scope: emotions before/after must be opt-out (severity: medium, scope addition)
status: failed
Pre-existing behavior (not a Phase 46 regression): export always includes emotions
before/after; customers complained. Ben wants a PRE-SELECTED checkbox (opt-out), not forced
inclusion. Approved by Ben to ride this gap round. Details + open design questions in
.planning/todos/pending/2026-07-14-export-emotions-optout-checkbox.md.

### Gap 8 — Enter on an open snippet suggestion ALSO fires list auto-continue (severity: high)
status: failed
In a note field, inside any list, accepting a snippet autocomplete with Enter both expands
the snippet AND jumps to a new list item — so you cannot expand a snippet and continue
writing in the same bullet; you must delete the spurious new item every time. This is the
RTXT-09 danger zone (checklist item 7) failing in a coordination way: the toolbar's Enter
auto-format (list continuation) and the Snippets accept-on-Enter both handle the same
keystroke. Fix direction: the list auto-continue must YIELD when the snippets autocomplete
is active/accepting (check the Snippets open-state or event.defaultPrevented before acting) —
snippet accept wins, list continuation only fires on a plain Enter. Needs a regression test
covering Enter-with-suggestion-open vs plain Enter in a list.

### Gap 9 — Heart-Wall export prints a bare "No" when flagged-but-not-released (severity: medium, pre-existing)
status: failed
When a session is flagged as a Heart-Wall session but the wall was NOT released at the end
(the bottom flag), the exported Heart-Wall section renders just "No" — readers first assume
it means "not a Heart-Wall session," which is wrong; it apparently means "not released."
Believed pre-existing (likely live in production, unverified). Fix: replace the bare boolean
with explanatory copy distinguishing the states, e.g. released vs "identified — not yet
released". The gap plan must propose concrete wording options (all locales) for Ben to
choose; also audit the same section for the released=yes wording while there.

### Gap 10 — Export Step 2 default layout collapses on laptop viewports (severity: high, round 2)
status: failed
Found at the 46-14 re-run (2026-07-15, MacBook Pro, 00f0c08 pre-prod build, screenshot in
session): at the Step-2 DEFAULT (non-maximized) size the toolbar renders as a ~15px sliver
with every button clipped in half, and the editor shows ~1.5 lines — the surface is unusable
without hitting maximize. Root cause (confirmed in source, not yet reproduced live):
`.export-card.is-editor-step` is hard-sized to 50dvh (app.css ~3360). On a typical MacBook
viewport (~820-980px) that is a ~410-490px card, and the fixed Step-2 chrome INSIDE it —
title, step indicator, "Step 2 of 3" line, the ephemeral-edit info note, actions row —
consumes ~330-380px, so `.export-edit-area` (flex:1, min-block-size:0) collapses to
~50-100px. Inside that collapsed column the toolbar (a default-shrinkable flex child with
`overflow-y: hidden`, app.css ~5360) compresses and clips its buttons; the editor's 240px
min-height overflows the scroll area showing only a sliver. Round-1 Gap 1 accepted "the
current ~50% default height is fine" — that premise assumed the chrome fit; it does not on
laptop viewports. Fix direction for the gap plan: the EDIT SURFACE, not the card, must be
the sizing floor (e.g. size the card so the edit area gets a guaranteed usable min-height,
or grow the default beyond 50dvh, or slim the Step-2 chrome), plus `flex-shrink: 0` on the
toolbar so it can never compress regardless of sizing. Must be re-verified at the default
size on a real MacBook viewport, not only maximized.

### Gap 11 — Export toolbar is not ALWAYS visible (severity: high, round 2, re-opens Gap 2's requirement)
status: failed
Ben re-affirmed the round-1 ratified requirement at the re-run: "the formatting toolbar
should never be hidden in the export." The Gap-2 fix made the bar persistent (dedicated
always-docked bar, no hide-on-blur) but two mechanisms still hide it:
(a) compression clipping — see Gap 10 (no `flex-shrink: 0`, so the flex column crushes it);
(b) scroll-away — rich-toolbar.js docks the persistent bar `beforebegin` the textarea,
i.e. INSIDE `.export-edit-area`, which is the `overflow-y: auto` scroll container
(app.css ~3384), so on any document taller than the area, scrolling down moves the bar
out of view. Fix direction: keep the bar visually pinned while the document scrolls —
e.g. `position: sticky; inset-block-start: 0` on the bar scoped to the export edit area
(it already carries surface background + popover z-index), or dock it outside the scroll
container — plus the Gap-10 `flex-shrink: 0`. Verify: with a long document, scroll to the
bottom of the edit area — the bar must still be visible and clickable; with a short
viewport the bar must render at full height.

### Gap 12 — Export toolbar controls are DEAD until the editor is focused once (severity: high, round 2)
status: failed
Reported by Ben at the round-2 gate ("the preview button in export does nothing"), reproduced
live in Playwright WebKit (2026-07-15, build e0c48c5): with export Step 2 open and the editor
NOT yet focused, a real click on the toolbar's Preview button does nothing — no pane, no
button-state flip. Root cause (confirmed in source): rich-toolbar.js `_dispatch`/`togglePreview`
resolve their target field from `_focused` (the last-focused registered field) and return
early when it is null. That invariant ("a visible bar implies a focused field") held for the
focus-attached shared bar but was broken by the round-1 in-gate `persistent: true` mount —
the export bar is always visible, so users click its controls BEFORE ever focusing the
editor (the always-on bar invites exactly that; on the live page default focus sits on
#sessionDate). This affects EVERY control on the persistent bar (bold, lists, undo, preview…),
not just Preview. The toolbar's mousedown+preventDefault focus-preservation also means the
click itself never focuses the editor. NOT a round-2 regression: shipped with the round-1
in-gate persistent-bar commit series; untestable until gaps 10/11 made Step 2 usable.
Fix direction: dispatch on a persistent bar must target the bar's OWN field (the
`_persistentBars` mapping already knows it) — e.g. resolve `ta = barField || _focused`
(and focus the field as part of the action, as the undo/redo cases already do) so the
persistent bar never depends on prior focus. Note-field shared-bar behavior unchanged.
Regression test: jsdom can cover the dispatch-target resolution; the device gate covers feel.

### Gap 13 — Export preview pane opens 100% below the scroll fold (severity: high, round 2)
status: failed
Second half of "does nothing", reproduced live in WebKit at 1440x820 on build e0c48c5: with
the editor focused, clicking Preview DOES open the pane and flip the button (aria-pressed
true, label → "Edit"), but the pane is inserted after the editor inside the fixed-height
`.export-edit-area` scroll container, and the editor (flex-fill, min-block-size 240px)
already fills/overflows the visible area — measured pane top 659.6px vs area visible bottom
652.0px: the pane starts entirely below the fold. The user sees no change unless they notice
the small label flip and manually scroll the edit area. Pre-existing consequence of the
round-1 single-pane redesign (pane-below-editor inside a fixed-height scroller); on note
fields the page grows so the pane is naturally visible — the export's scroll container is
the only surface with a fold. Fix direction (gap plan chooses the mechanism, device gate
ratifies the feel): on opening the preview in the export, bring the pane into view — e.g.
scroll the edit area so the pane's top is visible (scrollIntoView/scrollTop math scoped to
the export bar's field), possibly paired with letting the editor yield height while the
preview is open. Must not disturb note-field preview behavior, the sticky pinned bar, or
undo/caret state; RTL-safe.

### Gap 14 — Export preview/edit UX concept rejected — needs a proper UI design phase (severity: high, round 3 gate, DESIGN)
status: failed — routed to a design-first effort per Ben's directive (2026-07-17)
Ben's findings on the 656f959 pre-prod build, verbatim intent: "the overall export is not
behaving anywhere close to bulletproof." Specifics: (a) clicking Preview expands and
auto-scrolls to the pane, but MANUAL scrolling brings the edit surface back into view while
the mode still claims preview — mixed state; (b) the target-state button turns GREEN
(is-active) while its label reads "Edit" — the active styling + target-state label combine
to read as "you are in Edit mode," the inverse of reality; (c) the stacked
editor-plus-preview-in-one-scroll-container concept itself is rejected ("the overall
scrolling concept is also not to my liking"). Ben's process directive, verbatim: "no gaps
finalization can help here without proper mockup, UI phase, replanning and implementation.
which buttons to show, where the preview is shown and how to go back to edit (or its both
integrated together somehow), how much screen space to give each part, how the overall
process looks like." Root context: the round-1 in-gate export redesign was implemented
WITHOUT /gsd-ui-phase (the mandatory UI gate) — this gap is the accumulated cost. Route:
sketch mockups (multiple concepts) → Ben finalizes → UI-SPEC → plan (architect gate) →
implement → device gate. NOT another code-first gap fix.

### Gap 15 — Preview visual language collides with section-title orange (severity: medium, round 3 gate, DESIGN)
status: failed — folded into the Gap-14 design effort
On the session screen, the note preview section's background is the same orange as the
section titles/categories (e.g. "Limiting Beliefs") — the preview reads as another category
header, not as "rendered preview of your text." Ben's directive: the preview treatment in
the session screen AND the export must share ONE visual language that always signals "this
is how previewed text looks in our app." A design-token/visual-identity decision — belongs
in the Gap-14 UI phase, not a spot patch.

### Gap 16 — Formatting bar hides on a click in its empty area (severity: medium, round 3 gate, BUG)
status: fixed (commit a6de32f; RED test 2fca8af)
Session screen, focus-attached bar: clicking ON the bar but NOT on a button (e.g. just
right of the Preview/Edit button, or in inter-button gaps/padding) blurs the field →
focusout hides the bar → the field shifts up; the user must re-focus the field and click
again. Bitten via a small misclick next to Preview. Root cause CONFIRMED in source:
bindPreserveFocus (mousedown+preventDefault, rich-toolbar.js ~150-155) is bound per-CONTROL
only; the bar container itself has no mousedown handler, so clicks on its padding fall
through and steal focus. Fix direction: preventDefault mousedown on the BAR container
(capturing clicks on padding/gaps; controls keep their own binding), so a click anywhere on
the bar never blurs the field. Small, independent of the Gap-14 redesign; timing (quick fix
vs ride the redesign) is Ben's call.
FIXED 2026-07-17: buildToolbar() now binds mousedown+preventDefault on the bar CONTAINER, so
a click on its empty area (padding, inter-button gaps, the strip past the last control) no
longer blurs the focused field — the guard applies to both the shared focus-attached bar and
the persistent export bar (they share the builder). Controls keep their per-control binding
(the container guard never stops propagation; preventDefault's double-call is idempotent).
Confirmed it does NOT block wheel/touch scrolling of the overflow-x strip, and native
scrollbar dragging targets the scrollbar (not this element), so both stay usable. RED-first:
tests/46-persistent-bar-dispatch.test.js Case G (shared bar container mousedown preventDefault
+ per-control regression guard) and Case H (persistent bar container) — both failed against
the unfixed source (false !== true), green after the fix. Full suite 191/191; WebKit export
probe green. Device gate on the session screen still pending Ben's real-click confirmation.

### Fixed during the gate (for the record)
- List button toggle/switch semantics: tests 88f7639, fix d88af87 (7 new unit tests).
- Gap 5 delivery fix + v1.4.0 bump: be7877b.
