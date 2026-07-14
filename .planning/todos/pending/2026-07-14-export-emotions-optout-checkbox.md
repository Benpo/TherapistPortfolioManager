---
created: 2026-07-14
source: Ben, during Phase 46-08 real-device gate (UAT session)
area: pdf-export / export-modal
---

# Export: emotions before/after must become an opt-out checkbox (pre-selected), not forced

**What Ben asked (verbatim intent):** "in the export, we always export the emotions before/after, but I want to replace this with pre-selected box for this and not do it forced (several customers complained)."

**Routing decision (Ben, 2026-07-14):** include in the Phase 46 gap-closure round (`/gsd-plan-phase 46 --gaps`) alongside any remaining 46-08 UAT findings — NOT a new conversation/milestone. It is a scope addition riding the gap round because the phase already touches the PDF pipeline.

**Pre-existing behavior, not a Phase 46 regression.** Several customers complained about the forced inclusion.

**Open design questions for the gap-plan (Ben approves before execution):**
- Where the checkbox lives (export modal Step 1 vs settings) — default CHECKED (pre-selected) per Ben.
- Exactly which section(s) it controls ("emotions before/after" block) in both the editor preview text and the rendered PDF.
- Whether the choice persists per-user (localStorage/settings) or resets per export.
