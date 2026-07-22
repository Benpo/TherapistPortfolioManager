# Phase 47: Session-Section Reordering - Context

**Gathered:** 2026-07-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Therapists control the STRUCTURE of their session documentation: reorder session sections
in Settings (pointer-events drag on mouse AND iPhone touch, plus per-row up/down arrows as
the WCAG 2.2 baseline), have that order drive the add/edit form and BOTH export builders
(markdown + PDF, repointed atomically with the 260615 guard-test rewrite), persisted per
therapist via a `therapistSettings` sentinel record that survives encrypted backup
round-trip (ORDR-01..05).

**Scope grew during this discussion (Ben-directed, 2026-07-22):**
1. The form's group structure is REDEFINED (Model A, sketch 010) — a one-time default
   restructure ships with the reorder feature.
2. Severity tracking becomes OPTIONAL (after-section toggle as the switch + N/A scale
   value with auto-hide) — to serve therapists who are not Emotion/Body Code practitioners.
3. Group RENAMES ship; group management (create/dissolve/move-between) is deferred.
4. Folded 46.1-UAT export bug: the topics/severity selection split (CONTEXT-SEED.md design).

**Requirements amendment required at plan time:** ORDR-01..05 stand; the severity-optional
work and group renames need new REQUIREMENTS.md entries — Claude drafts them, Ben approves
at plan review before execution.

</domain>

<decisions>
## Implementation Decisions

### Form structure — the group concept (sketch 010, Model A locked)
- **D-01: Model A — mixed structure.** The session form is ONE ordered list of items; an
  item is either a BARE SECTION (its own header, stands alone) or a NAMED GROUP containing
  2+ member sections. Single-field pseudo-groups are abolished by concept — no group may
  wrap one field, so header/field name collisions cannot exist. Reordering = reorder items
  at the top level + reorder members within a group. NO cross-group moves this milestone.
- **D-02: Default layout (Ben's exact spec, supersedes the current 4-accordion form):**
  1. **Session topics** — bare section, first (each topic row carries its before-severity rating);
  2. **Emotions & Techniques** — group, members in order: Heart-Wall toggle, Emotions in
     the Heart-Wall, Trapped Emotions Released, Physical Imbalance, Limiting Beliefs,
     Additional Techniques and Tools;
  3. **Severity after** ("Issue severity at the end of this session") — bare section;
  4. **Session Wrap-up** — group: Session Notes and Observations, Information for Next Session.
- **D-03: Groups are form-only.** The exported document stays a flat sequence of section
  headings in saved order — group names NEVER appear in markdown or PDF.
- **D-04: Empty groups hide.** A group whose members are all disabled disappears from the
  form until a member is re-enabled.
- **D-05: Group renames ship; group management is deferred.** Group headers get the same
  ✎ rename (+ revert) pattern sections have. Creating/dissolving groups and moving sections
  between groups = a future "group management" phase. CONSTRAINT for the planner: the order
  persistence must model groups as DATA (group identity, title override, ordered members,
  top-level item order) — NOT hardcoded groups — so the future phase plugs in with zero
  migration.
- **D-06: Free order within groups.** Members reorder freely, including conditional fields
  (the Heart-Wall toggle and its dependent emotions field may sit in any relative order);
  conditional-visibility logic is unchanged.

### Severity concept (new — Ben's redesign this discussion)
- **D-07: Before/after severity split.** Before-severity is GLUED to Session topics — they
  form one orderable item (severity is an attribute of the topics). After-severity is its
  own freely orderable bare item — it may sit anywhere, even before Session topics.
- **D-08: The after-section's enable toggle IS the severity-tracking switch.** Disabling
  the "Severity after" section in Settings hides the after block AND the before-rating
  column inside topic rows (topics stay; ratings vanish). Because this coupling is not
  obvious: a ⓘ info icon next to that toggle explains it, AND the help corpus gets an
  explicit "how to turn severity tracking off" entry (docs-gate demand, all four locales).
- **D-09: N/A scale value.** The severity scale gains an 11th option, N/A, so therapists
  who usually rate (and keep the switch on) can skip severity per-session while the field
  stays mandatory — form validation is satisfied by N/A. A topic rated N/A automatically
  hides/skips its after-rating. Severity-optional work (D-08 + D-09) lands INSIDE Phase 47
  because 47 already rebuilds the topics/severity structure, the Settings list, and both
  export builders — no second pass over the same surface.

### Settings page reorder UX
- **D-10: One grouped list.** The existing Settings rows (rename + enable toggle) become
  the reorder UI directly: every row gains a drag handle + up/down arrows; groups render
  as header rows with their own drag/arrows; bare sections are top-level rows. One list
  controls label, visibility AND order.
- **D-11: Disabled sections keep their slot.** They simply don't render on form/export;
  re-enabling restores them in place.
- **D-12: One reset-order button.** Restores the default structure's order (top-level +
  within-group). Touches ONLY order — renames and enable states untouched.

### Export follow-through
- **D-13: Step-1 checkbox list mirrors the saved order.** The list becomes the document
  outline: list order == form order == export order. The rewritten 260615 guard test
  asserts this three-way invariant against the SAVED order (not static DOM).
- **D-14 (CONTEXT-SEED, locked 2026-07-22): topics/severity selection split.** "Session
  topics" returns as a main checkbox named IDENTICALLY to the in-session section title in
  every language (the current HE export label mismatch is fixed as part of this). "Include
  severity before/after" is a DEPENDENT sub-option, enabled only when Session topics is
  checked — severity-alone is impossible by construction.
- **D-15: Sub-option defaults.** Checked by default whenever Session topics is checked
  (preserves the customer-requested opt-out from the 46 gap round, pre-selecting only when
  issue data exists); the choice RESETS per export, never persisted.
- **D-16: Reorder takes effect on next form open.** Order changes ride the existing
  Settings Save staging; an already-open form keeps the order it rendered with (no live
  reshuffle). Within one page, the form and its exports always read the same order
  snapshot — the 260615 bug class cannot return.

### Process (binding)
- **D-17: Small mockups are part of decision-making.** The structural mockup gate was
  satisfied MID-discussion by sketch `010-section-groups-concept` (Model A + D-02 defaults
  chosen from it). The remaining VISUAL design — grouped Settings list rendering, drag
  affordances, ⓘ icon treatment, N/A widget, topics+before-rating row layout, RTL/dark —
  goes through the mandatory `/gsd-ui-phase` UI-SPEC with SMALL interactive mockups for
  Ben's (+ Sapir's) sign-off BEFORE planning (ROADMAP "UI hint: yes").

### Claude's Discretion
- Drag implementation details (pointer-events per ORDR-01; repo memory: physical
  left/top coordinates for overlays in RTL, never logical inset-inline), keyboard/a11y
  announcement specifics beyond the arrow-button baseline, exact sentinel record shape
  (within D-05's group-ready constraint), auto-scroll during drag.
- **PDF/markdown mechanics of the severity split:** how the before-ratings (inside the
  topics item) and the after block (its own item) map onto the PDF's severity bars and the
  markdown body under the new order model — the current `severityAfterSections` count
  mechanism will need rework. Constraints: severity renders exactly once, position mirrors
  the form order, the D-14 sub-option controls it, Phase 23 Hebrew bidi pipeline stays
  intact. Researcher proposes, plan review confirms.
- Where new-section/future-version defaults slot into a saved order (merge semantics),
  backup restore of order records from older backups (absent record → default order).
- Whether reordering gets a guided-tour step — per REQUIREMENTS Process Notes, decided at
  phase planning.

### Folded Todos
- `2026-05-13-drag-sort-settings-categories.md` — the original feature ask (Sapir):
  promote frequently-used sections. Its 5 design questions are all answered above
  (D-10/D-11/D-12/D-16 + persistence via sentinel); its 260615 coupling warning is D-13/D-16.
- `2026-07-14-export-emotions-optout-checkbox.md` — the opt-out checkbox itself ALREADY
  shipped in the 46 gap round; the residual defect (topics folded into the severity
  checkbox) closes via D-14. Mark the todo resolved when Phase 47 ships.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope & decisions
- `.planning/phases/47-session-section-reordering/CONTEXT-SEED.md` — the locked export
  topics/severity split design (D-14 source).
- `.planning/REQUIREMENTS.md` — ORDR-01..05; NEEDS AMENDMENT for severity-optional +
  group renames (draft at plan time, Ben approves).
- `.planning/ROADMAP.md` — Phase 47 goal + success criteria.
- `.planning/sketches/010-section-groups-concept/` — the winning Model A structure +
  default layout (`index.html` is the visual reference, EN/HE).
- `.planning/todos/pending/2026-05-13-drag-sort-settings-categories.md` — folded (full
  problem statement + 260615 coupling).
- `.planning/todos/pending/2026-07-14-export-emotions-optout-checkbox.md` — folded
  (customer complaint origin of the opt-out).

### Code this phase rewrites (verified in this discussion)
- `assets/settings.js` — `SECTION_DEFS` canonical 9-row schema (~line 39), `currentMap`,
  Save/Discard staging + `computeDisableTransitions` (~449); the grouped reorder list
  builds on this page.
- `add-session.html` — current 4-accordion structure with `data-section-key` rows
  (~lines 205–340) that D-02 restructures.
- `assets/add-session.js` — issue-list UI (before-severity rows), `setReadMode`, section
  render path the saved order must drive.
- `assets/export-modal.js` — `EXPORT_DEFAULT_CHECKED` (~331), `EXPORT_SECTION_ORDER`
  (~343, dies in favor of saved order), `buildSessionMarkdown` (~189),
  `buildFilteredSessionMarkdown` (~379), `emotionsBlockIncluded` (~510),
  `buildDocumentSectionLabels` (~492), `severityAfterSections` derivation (~757–773),
  Step-1 row renderer (~517).
- `assets/pdf-export.js` — `severityAfterSections` consumption + severity-block placement
  (~1430–1500, ~2018); Phase 23 Hebrew bidi pipeline must survive
  (`.planning/milestones/v1.1-phases/23-pdf-hebrew-rtl-rewrite/`).
- `assets/db.js` — `DELETED_SEEDS_KEY` sentinel pattern (~34), therapistSettings store
  (migration 4, ~306); the order sentinel mirrors this.
- `assets/backup.js` — `ALLOWED_SENTINEL_KEYS` allowlist (~1157) MUST admit the new order
  sentinel or restore silently drops it; round-trip test required (ORDR-05).
- `assets/app.js` — `App.getSectionLabel`/`App.isSectionEnabled` (label + enable cache,
  ~48), cross-tab therapistSettings cache refresh (~854).
- `tests/30-export-markdown.test.js` — home of the section-order guard suite (the 260615
  invariant) to be rewritten against saved order.

### Docs gate
- `HELP-MAP.md` + `scripts/docs-gate.js` contract (CLAUDE.md) — heavily user-facing phase:
  changelog entry + help-topic updates required, INCLUDING the new "how to turn severity
  tracking off" entry (D-08). All new strings in EN/DE/HE/CS.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `therapistSettings` sentinel-row pattern (`snippetsDeletedSeeds` in db.js/backup.js) —
  ORDR-05 names it explicitly; the order record follows the same shape and backup path.
- Settings rows renderer + Save staging (`settings.js`) — the grouped list extends this
  page and its dirty-state machinery rather than building new chrome.
- Pointer-events drag precedents: photo crop (Phase 10) and demo-resize handles
  (Phase 14) both use pointer capture — the drag layer follows the same approach, per
  ORDR-01's "pointer events, not HTML5 DnD" lock.
- `App.getSectionLabel` / `App.isSectionEnabled` + cross-tab cache refresh (app.js) —
  the order cache should ride the same mechanism.

### Established Patterns
- Vanilla IIFE `window.*` modules, zero-build/zero-npm; new strings in all four i18n
  dictionaries; logical properties for layout but PHYSICAL coordinates for drag/overlay
  positioning in RTL (repo memory — inset-inline mirrors wrongly).
- jsdom blindness: touch drag, accordion behavior, PDF output, and RTL visuals need
  real-device/real-PDF verification (repo has shipped false-GREEN jsdom tests before);
  Phase 44's pre-prod environment exists for exactly this.
- Docs hard-gate: EN changelog + help edits must accompany the push.

### Integration Points
- `settings.html`/`settings.js` (grouped reorder list, reset button, ⓘ icon),
  `add-session.html`/`add-session.js` (restructured form render driven by saved order,
  N/A rating, after-block auto-hide), `export-modal.js` Step 1 + both builders,
  `pdf-export.js` severity block, `backup.js` restore allowlist, guided tour anchors
  (Phase 41 tour targets the session form — verify anchors survive the restructure).

</code_context>

<specifics>
## Specific Ideas

- **Ben's severity vision (near-verbatim):** severity tracking must become optional so the
  app supports therapists who are not Emotion/Body Code practitioners. When enabled,
  "severity at the beginning" is glued to the session topics; "severity after" moves
  freely — even before the topics if the user wants. On top: the N/A scale option serves
  therapists who usually rate but want to skip it in some sessions — the field stays
  mandatory, "which keeps the app simpler", and an N/A'd topic auto-hides its after-rating.
- **The ⓘ requirement (Ben):** the after-toggle-as-switch solution is "not that
  straightforward" — it needs a proper info icon warning next to it AND a help-section
  entry documenting that this is how you turn severity off.
- **Working style (Ben, twice this session):** structural decisions need SMALL mockups
  before he decides — "mockup needed in order to decide… we need mockup! not later, now."
  Sketch 010 was built mid-discussion and settled Model A + defaults on the spot; Sapir
  consultation happens on mockups, in Hebrew (sketch has full EN/HE RTL toggle).

</specifics>

<deferred>
## Deferred Ideas

- **Group management** (create groups from selected sections, dissolve groups,
  move sections between groups; auto-dissolve below 2 members) — its own future phase.
  Phase 47's group-as-data persistence (D-05) is designed so it lands without migration.
  Recorded loudly per Ben's instruction: concept finalized here, scheduling deliberately
  deferred.
- **Live re-apply of order to open forms** — rejected for 47 (D-16); revisit only if
  users report confusion.

### Reviewed Todos (not folded)
- `2026-07-19-triple-star-breaks-pipeline-join-invariant.md` — inline-marker parsing
  divergence (md-render vs PDF); Phase 47 rewrites section-level builders, not inline
  parsing. Stays pending for a rich-text follow-up.
- `2026-05-13-modality-templates.md` — out of scope this milestone (REQUIREMENTS
  out-of-scope table), unchanged.

</deferred>

---

*Phase: 47-session-section-reordering*
*Context gathered: 2026-07-22*
