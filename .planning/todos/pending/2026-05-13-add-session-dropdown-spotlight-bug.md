---
created: 2026-05-13T00:00:00.000Z
title: Add-session dropdown does not populate client spotlight (photo + general notes)
area: bug
priority: BLOCKER
recommended_entry: /gsd-discuss-phase
target_phase: 24
files:
  - assets/add-session.js
  - add-session.html
  - assets/app.css
source: 22-HUMAN-UAT.md lines 35 / 87 / 187-194 (Phase 22 round-3 UAT, 2026-05-07)
---

## Problem

Two divergent code paths render the SAME conceptual screen differently:

| Entry path | Behavior |
|---|---|
| **Client card → "New Session"** | Client-spotlight populates fully (photo + general notes ✅) |
| **"Add Session" header → pick client from dropdown** | Client-spotlight is missing photo + general notes ❌ |

Same client, same data in IDB, two different UI outcomes. UAT marked **BLOCKER** because clinicians WILL hit this in real use — they'll wonder which path is "right" and lose trust.

## Likely root cause

The spotlight-populate function is called on initial mount when entering with a pre-selected client (via deep-link `?clientId=X` from the client card). When entering via the standalone "Add Session" page, the populate-on-mount path doesn't have a clientId yet. The dropdown's `change` event likely fires a partial populate (just the name) but not the full spotlight refresh (photo + notes + age block).

## Single-source-of-truth fix

One `populateSpotlight(clientId)` function called from BOTH entry paths:
1. Deep-link entry path (URL `?clientId=X`) — already works.
2. Dropdown `change` event — currently broken; needs to call the same function.

## Acceptance

- Pick a client from the dropdown → photo, general notes, age all appear in the spotlight area within ≤200ms.
- Same client picked from client-card flow → identical UI.
- Pixel-diff or visual comparison of both entry paths shows no divergence.

## Cross-references

- 22-HUMAN-UAT.md gap "Add-session entry path missing client picture & general notes" — failed / blocker / scope: out-of-phase-22
- Related larger feature: `.planning/todos/pending/2026-04-26-pre-session-context-card.md` (the FULL pre-session context card vision — last session date, open issues, severity trend). This TODO is just the BUG FIX to make the existing spotlight populate correctly from both entry paths. The bigger feature can stack on top later.

## Origin

Reported by Ben during Phase 22 round-3 UAT (2026-05-07). Marked "(out of scope, serious)" then "(BLOCKER)" because Phase 22 + 23 had locked scopes. Re-surfaced by Ben on 2026-05-13 — "this is what I meant by two different sources".
