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

total: 10
passed: 0 (none formally signed off yet)
issues: 3
pending: 7
skipped: 0
blocked: 0

## Gaps

### Gap 1 — Export Step 2: legacy two-pane layout collides with the mounted toolbar (severity: high)
status: failed
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
status: failed
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

### Gap 4 — Preview toggle needs a text label, both surfaces (severity: medium)
status: failed
Icon-only eye button is insufficient on note fields AND export. Needs visible text —
"Preview"/"Edit" swap label or better. Applies wherever the toggle appears.

### Gap 5 — SW precache omission: new modules bypassed the update pipeline (severity: high)
status: resolved
text-edit.js + rich-toolbar.js were not in PRECACHE_URLS (46-03 plan never touched sw.js),
so installed PWAs pulled them through the 24h HTTP cache (/*.js max-age=86400) — the
d88af87 list fix never reached Ben's device despite PWA restarts + cache clear, and offline
use would 404 them. Fixed in be7877b (precache both; APP_VERSION → 1.4.0 release bump).
Forward lesson: any plan adding a shipped asset must add it to PRECACHE_URLS.

### Gap 6 — Formatting tips block on export Step 2 (severity: low, CONFIRM with Ben)
status: failed
Ben: "the formatting tips are now expandable if we have the formatter as menu" — read as
"expEndable" (redundant now the toolbar exists) → remove the tips accordion from Step 2.
CONFIRM reading before executing; if he meant something else, re-scope.

### Gap 7 — Export content scope: emotions before/after must be opt-out (severity: medium, scope addition)
status: failed
Pre-existing behavior (not a Phase 46 regression): export always includes emotions
before/after; customers complained. Ben wants a PRE-SELECTED checkbox (opt-out), not forced
inclusion. Approved by Ben to ride this gap round. Details + open design questions in
.planning/todos/pending/2026-07-14-export-emotions-optout-checkbox.md.

### Fixed during the gate (for the record)
- List button toggle/switch semantics: tests 88f7639, fix d88af87 (7 new unit tests).
- Gap 5 delivery fix + v1.4.0 bump: be7877b.
