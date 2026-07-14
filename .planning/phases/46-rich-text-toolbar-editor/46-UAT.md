---
status: diagnosed
phase: 46-rich-text-toolbar-editor
source: [46-08-PLAN.md checkpoint — real-device gate, Ben driving]
started: 2026-07-14T21:30:00Z
updated: 2026-07-14T23:20:00Z
---

## Current Test

number: —
name: Real-device checklist (10 items) — in progress, interrupted by findings below
expected: |
  All 10 checklist items from 46-08-PLAN.md pass on installed Safari PWA (desktop),
  iPhone PWA, Chrome, Firefox, plus a real opened PDF.
awaiting: Ben re-tests on the be7877b pre-prod build, then completes the remaining matrix

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

## Summary

total: 10 checklist items / 9 gaps found
passed: 0 (no checklist item formally signed off; round 1 ended 2026-07-14 before the full matrix)
gaps_resolved_during_gate: 4 (1, 2, 5, 6 — plus the list-toggle fix d88af87)
gaps_open_for_gap_round: 5 (3 undo stack, 4 preview toggle label+icon, 7 emotions opt-out, 8 snippet-Enter collision, 9 Heart-Wall wording)
matrix_deferred: iPhone pass, real PDF, RTL/Hebrew, snippets re-test, lists re-test — all at the gate re-run after gap execution
skipped: 0
blocked: 0

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

### Fixed during the gate (for the record)
- List button toggle/switch semantics: tests 88f7639, fix d88af87 (7 new unit tests).
- Gap 5 delivery fix + v1.4.0 bump: be7877b.
