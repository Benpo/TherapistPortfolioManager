# Phase 47: Session-Section Reordering - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-22
**Phase:** 47-session-section-reordering
**Areas discussed:** Todo folding, Reorder scope vs accordion groups, Settings page reorder UX, Export follow-through, Order-change edge semantics, Group concept (second round, sketch-010-gated), Severity concept (Ben-directed redesign)

---

## Todo folding

| Option | Description | Selected |
|--------|-------------|----------|
| Drag-sort Settings todo | resolves_phase: 47; 5 design questions + 260615 coupling | ✓ |
| Export opt-out todo → close via 47 | Shipped in 46 gap round; residual topics/severity split closes here | ✓ |
| Triple-star pipeline bug | Inline-parsing layer, not section-level | |

**User's choice:** Fold both recommended; triple-star stays pending.
**Notes:** Ben also directed at selection time: "mockup must be included in the decisions, small mockups."

---

## Reorder scope vs accordion groups

| Option | Description | Selected |
|--------|-------------|----------|
| Flat list — accordions dissolve | One flat 9-section order; themed groups disappear | |
| Two-level: groups + within | Reorder groups AND sections within; no cross-group moves | ✓ (interim) |
| Within groups only | Group order fixed; fails the original ask | |

**User's choice:** Two-level (interim) — later superseded by the sketch-010 Model A decision (mixed bare sections + groups), which keeps the two-level reorder mechanics.
**Notes:** Severity-group placement could not be decided verbally — "I need a small mockup to show Sapir"; "mockup needed in order to decide if we are finished here, otherwise nothing." Within the (old) Heart-Wall group: allow any order incl. conditional fields — carried forward as D-06.

---

## Settings page reorder UX

| Option | Description | Selected |
|--------|-------------|----------|
| One grouped list | Existing rename+toggle rows gain handles + arrows; group header rows | ✓ |
| Separate reorder mode | Dedicated "Change order" view | |
| Mockup explores both | Defer direction to sketch | |

**User's choice:** One grouped list. Disabled sections: keep their slot (vs sink to bottom / you decide). Reset: one reset-order button, order only (vs no reset / you decide).

---

## Export follow-through

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror saved order | Step-1 list == form == export; guard asserts three-way | ✓ |
| Keep a curated fixed order | List keeps own order, only document follows | |

**User's choice:** Mirror saved order. Severity sub-option: checked by default when topics checked, resets per export (vs remember last choice / you decide).

---

## Order-change edge semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Next form open | Joins Settings Save staging; open forms keep their order | ✓ |
| Live re-apply everywhere | Open forms reshuffle on save | |

**User's choice:** Next form open.

---

## Group concept (second round — gated on sketch 010)

| Option | Description | Selected |
|--------|-------------|----------|
| Mixed: sections OR groups (Model A) | Bare sections + real groups (2+ members) only | ✓ (after sketch) |
| Everything stays grouped (Model B) | All sections grouped; defaults cleaned | |

**User's choice:** First round: "I can't decide without mockup! we need mockup! not later, now." → sketch `010-section-groups-concept` built mid-discussion (EN/HE, RTL). After viewing: "Model A looks great (having a combination)."
**Notes:** Ben framed the underlying pain: single-field groups, header/field name collisions, topics under "Heart-Wall Session"; wanted the group CONCEPT finalized before scheduling anything. Groups in export: form-only ✓. Empty group: hides ✓. Default layout (Ben's exact spec): topics bare → "Emotions & Techniques" group (Heart-Wall ticker + emotions at its start, then the 4 existing fields) → severity-after bare → "Session Wrap-up" group (notes + next-session). Group powers this milestone: rename only ✓ (vs full management now / fully fixed); management deferred with group-ready persistence.

---

## Severity concept (Ben-directed redesign)

| Option | Description | Selected |
|--------|-------------|----------|
| 1 · Free — drag anywhere | Severity an ordinary item | partially |
| 2 · Glued to Session topics | Auto-travels with topics | partially |
| 3 · Pinned near the end | Fixed position | |

**User's choice:** A synthesis he authored: BEFORE-severity glued to Session topics (one item); AFTER-severity its own freely movable item (even before topics). Severity tracking becomes optional: Settings switch + N/A 11th scale value (keeps the field mandatory, auto-hides the after-rating for N/A'd topics); export removal already covered by the sub-option.
**Severity switch mechanism:** After-toggle = the switch ✓ (vs separate three-state / N/A only) — WITH ⓘ info icon warning about the coupled hide of before-ratings AND a help-section entry ("not that straightforward of a solution").
**Severity-optional timing:** Inside Phase 47 ✓ (vs own 47.1 / backlog) — rides the same rewrite; requirements draft for Ben's approval at plan time.

---

## Claude's Discretion

Drag implementation details (physical coords in RTL), a11y specifics beyond arrows,
sentinel record shape (group-ready), PDF/markdown mechanics of the severity split
(severityAfterSections rework — researcher proposes), order merge semantics for future
sections / old backups, guided-tour step decision at planning.

## Deferred Ideas

Group management (create/dissolve/move-between; auto-dissolve <2 members) — future phase,
zero-migration by design. Live re-apply of order to open forms — rejected for 47.
