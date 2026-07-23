# Phase 47: Session-Section Reordering - Research

> **SUPERSESSION NOTE (2026-07-23, plan review — CONTEXT D-19…D-23):** everything in this
> document about the "— (skip)" 11th severity value / SEV_SKIP marker is SUPERSEDED. Ratings
> were never validation-mandatory in shipped code, so unrated (null) already carries the skip
> meaning. Replacements: tap-again-to-clear (D-20), unrated omitted from every output incl.
> the PDF bar block (D-21), emptiness-keyed end-of-session block (D-22), view-mode name-only
> (D-23). The PLAN.md files are the executable contract — where this document disagrees, the
> plans win.


**Researched:** 2026-07-23
**Domain:** Vanilla-JS/CSS zero-build PWA — persisted ordering model + pointer-events drag + export-builder repoint + severity redesign
**Confidence:** HIGH (all findings are codebase-grep-verified against real source this session; architectural proposals for the discretion areas are flagged ASSUMED for plan review)

## Summary

This is a **reuse/refactor phase in an established zero-npm vanilla-JS codebase** — there is no new stack, no package to install, and no external dependency. The entire "research" surface is the existing code the phase rewrites, which I have read directly: `settings.js`, `add-session.html`/`add-session.js`, `export-modal.js`, `pdf-export.js`, `db.js`, `backup.js`, `app.js`, and the export guard test. Every architectural pattern the plan needs already exists in the repo; the work is composing them, not discovering them.

The phase's real difficulty is **one new data structure with four consumers**. A per-therapist *order sentinel* (a `therapistSettings` record, mirroring `snippetsDeletedSeeds`) must model **groups as data** (D-05) and then drive: (1) the grouped Settings reorder UI, (2) the session-form layout, (3) both export builders (markdown + PDF), and (4) survive an encrypted backup round-trip. Layered on top is Ben's **severity redesign**: before-severity glued to the topics item, after-severity as its own freely-orderable item, an app-level on/off switch (the after-section's enable toggle), and an 11th "skip" (—) scale value. The `severityAfterSections` count mechanism in `export-modal.js`/`pdf-export.js` — today hardwired to "1 if heart-shield present, else 0" — must be re-derived from saved order.

**Primary recommendation:** Model the order sentinel as `{ sectionKey: "sectionOrder", version, items:[…] }` where each item is either `{type:"section",key}` or `{type:"group",id,titleOverride,members:[keys]}`; route it through the existing `_writeTherapistSentinel`/`ALLOWED_SENTINEL_KEYS` lock-step path; expose a synchronous `App.getSectionOrder()` cache alongside `_sectionLabelCache` (same BroadcastChannel refresh); and funnel every order mutation (drag, arrows, load, backup-restore) through **one shared move-validator** that enforces the topics-before-after-severity clamp (Interaction 11). Keep the PDF's severity-block render loop untouched — only change how `severityAfterSections` is derived (from saved-order ordinal, not a heading-label match).

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Form structure — the group concept (sketch 010, Model A locked)**
- **D-01: Model A — mixed structure.** The session form is ONE ordered list of items; an item is either a BARE SECTION (own header, stands alone) or a NAMED GROUP containing 2+ member sections. Single-field pseudo-groups abolished by concept. Reordering = reorder top-level items + reorder members within a group. **NO cross-group moves this milestone.**
- **D-02: Default layout (Ben's exact spec, supersedes current 4-accordion form):** (1) **Session topics** — bare section, first (each topic row carries its before-severity rating); (2) **Emotions & Techniques** — group: Heart-Wall toggle, Emotions in the Heart-Wall, Trapped Emotions Released, Physical Imbalance, Limiting Beliefs, Additional Techniques and Tools; (3) **Severity after** ("Issue severity at the end of this session") — bare section; (4) **Session Wrap-up** — group: Session Notes and Observations, Information for Next Session.
- **D-03: Groups are form-only.** Exported document stays a flat sequence of section headings in saved order — group names NEVER appear in markdown or PDF.
- **D-04: Empty groups hide.** A group whose members are all disabled disappears from the form until a member is re-enabled.
- **D-05: Group renames ship; group management deferred.** Group headers get the same ✎ rename (+ revert) pattern. Creating/dissolving/moving-between = future phase. **CONSTRAINT: order persistence must model groups as DATA (group identity, title override, ordered members, top-level item order) — NOT hardcoded — so the future phase plugs in with zero migration.**
- **D-06: Free order within groups.** Members reorder freely, including conditional fields (Heart-Wall toggle + its dependent emotions field may sit in any relative order); conditional-visibility logic unchanged.

**Severity concept (new — Ben's redesign)**
- **D-07: Before/after severity split.** Before-severity GLUED to Session topics (one orderable item; severity is an attribute of topics). After-severity is its own freely orderable bare item — may sit anywhere, even before Session topics *(NOTE: clamped by Interaction 11 — after-severity may NOT precede topics; see Open Questions Q1)*.
- **D-08: The after-section's enable toggle IS the severity-tracking switch.** Disabling "Severity after" in Settings hides the after block AND the before-rating column inside topic rows (topics stay; ratings vanish). A ⓘ info icon explains it, AND the help corpus gets an explicit "how to turn severity tracking off" entry (docs-gate demand, all four locales).
- **D-09: N/A scale value.** The severity scale gains an 11th option, — (skip), so therapists who usually rate can skip per-session while the field stays mandatory — validation satisfied by —. A topic rated — automatically hides/skips its after-rating. Severity-optional work lands INSIDE Phase 47.

**Settings page reorder UX**
- **D-10: One grouped list.** Existing Settings rows (rename + enable toggle) become the reorder UI directly: every row gains a drag handle + up/down arrows; groups render as header rows with their own drag/arrows; bare sections are top-level rows. One list controls label, visibility AND order.
- **D-11: Disabled sections keep their slot.** They don't render on form/export; re-enabling restores them in place.
- **D-12: One reset-order button.** Restores default structure's order (top-level + within-group). Touches ONLY order — renames/enable states untouched. *(UI-SPEC Copywriting refines this to TWO paired buttons: **Reset order** + **Reset names** — see UI-SPEC.)*

**Export follow-through**
- **D-13: Step-1 checkbox list mirrors saved order.** List order == form order == export order. The rewritten 260615 guard test asserts this three-way invariant against the SAVED order (not static DOM).
- **D-14 (CONTEXT-SEED, locked): topics/severity selection split.** "Session topics" returns as a main checkbox, named IDENTICALLY to the in-session section title in every language (current HE export label mismatch fixed here). "Include severity before/after" is a DEPENDENT sub-option, enabled only when Session topics is checked — severity-alone impossible by construction.
- **D-15: Sub-option defaults.** Checked by default whenever Session topics checked (pre-selecting only when issue data exists); choice RESETS per export, never persisted.
- **D-16: Reorder takes effect on next form open.** Order changes ride existing Settings Save staging; an already-open form keeps the order it rendered with (no live reshuffle). Within one page, form and its exports read the same order snapshot.

**Process (binding)**
- **D-17: Mockup gate CLOSED 2026-07-23** — `47-mockups.html` + UI-SPEC approved by Ben (Sapir reviewed HE). Planning may proceed.
- **D-18: help + what's-new scope is planned by the PLANNER, not improvised by the code executor.** The plan MUST contain a dedicated, explicitly scoped docs task (help topics + changelog/what's-new entry) with a coverage list the planner derives. Ben's changelog user story (verify against D-01..D-16 + HELP-MAP.md): (1) Section reordering — drag + arrows, groups (renamable), enable toggles with rows keeping slot, Reset order / Reset names, order mirrored in export; (2) App-level severity switch (D-08) incl. mandated help entry "how to turn severity ratings off" (EN corpus first, all four locales); (3) The — skip value (D-09); (4) Skipped severity excluded from exports (8a) + export Step-1 topics/severity split (D-14). Explicitly NOT in changelog: topics<severity clamp, saved-order sanitization/migration, tab-order/pointer-drag internals, RTL drag math, label micro-renames.

### Claude's Discretion
- Drag implementation details (pointer-events per ORDR-01; physical left/top coords for RTL overlays, never logical inset-inline), keyboard/a11y announcement specifics beyond the arrow-button baseline, exact sentinel record shape (within D-05's group-ready constraint), auto-scroll during drag.
- **PDF/markdown mechanics of the severity split:** how before-ratings (inside topics item) and the after block (its own item) map onto the PDF's severity bars and the markdown body under the new order model — the `severityAfterSections` count mechanism needs rework. Constraints: severity renders exactly once, position mirrors form order, D-14 sub-option controls it, Phase 23 Hebrew bidi pipeline stays intact. **Researcher proposes, plan review confirms.**
- Where new-section/future-version defaults slot into a saved order (merge semantics), backup restore of order records from older backups (absent record → default order).
- Whether reordering gets a guided-tour step — decided at phase planning.

### Deferred Ideas (OUT OF SCOPE)
- **Group management** (create groups from selected sections, dissolve, move-between; auto-dissolve below 2 members) — its own future phase. Phase 47's group-as-data persistence (D-05) designed so it lands without migration.
- **Live re-apply of order to open forms** — rejected for 47 (D-16); revisit only if users report confusion.
- Reviewed-but-not-folded todos: triple-star pipeline join-invariant (inline-parsing, not section-level); modality templates (out of milestone scope).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ORDR-01 | Reorder sections in Settings by dragging (mouse AND iPhone touch — pointer-events, not HTML5 DnD) | Pointer-capture drag precedents exist: photo crop (Phase 10, `crop.js`), demo-resize (Phase 14). Working mock in `47-mockups.html` (`wireDrag`). `touch-action:none` on handle + `setPointerCapture`. |
| ORDR-02 | Reorder via per-row up/down arrow buttons (WCAG 2.2 baseline) | Arrow end-stops via `disabled` attribute (Interaction 3). Same move-validator as drag. |
| ORDR-03 | Saved order drives add/edit session form layout | Form currently static 4-accordion (`add-session.html` L205-340). Must become order-driven; `applySectionVisibility`/`applySectionLabels` already iterate `[data-section-key]`. |
| ORDR-04 | Saved order drives markdown + PDF builders — repointed atomically with 260615 guard-test rewrite | `EXPORT_SECTION_ORDER` (`export-modal.js` L343) dies in favor of saved order; guard test `tests/30-export-markdown.test.js` rewritten to assert three-way invariant. |
| ORDR-05 | Order persists per therapist (therapistSettings sentinel, mirroring snippetsDeletedSeeds) + round-trips encrypted backup | `_writeTherapistSentinel` (`db.js` L947) + `_SENTINEL_KEYS` (L920) + `ALLOWED_SENTINEL_KEYS` (`backup.js` L1157) — lock-step add required. |

**Requirements amendment required at plan time (per CONTEXT):** ORDR-01..05 stand; the **severity-optional** work (D-08/D-09) and **group renames** (D-05) need new REQUIREMENTS.md entries. Claude drafts them; Ben approves at plan review before execution. Suggested IDs: `ORDR-06` (app-level severity on/off switch + ⓘ + help entry), `ORDR-07` (— skip scale value, mandatory-satisfying, export-omitting), `ORDR-08` (group renames with revert). *(Naming ASSUMED — planner confirms with Ben.)*

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Order persistence (sentinel record) | Database (`db.js` therapistSettings store) | Backup (`backup.js` restore allowlist) | IDB is the single persistence choke-point; sentinel mirrors `snippetsDeletedSeeds` |
| Order read cache (sync) | App shared layer (`app.js` `_sectionLabelCache` sibling) | BroadcastChannel cross-tab | Form + export read synchronously after eager load in `initCommon` |
| Grouped reorder UI + drag/arrows | Settings page (`settings.js`) | `app.css`/tokens | Extends existing rename+toggle rows (D-10) |
| Move-validation / clamp | App shared layer (one validator fn) | consulted by Settings drag, arrows, load, restore | Single source of truth for Interaction 11 (else invariant is theater) |
| Order-driven form render | Session form (`add-session.js` + `add-session.html`) | — | Reorders section DOM into group accordions per saved order |
| Severity value model (— skip) | App shared (`createSeverityScale`/`getSeverityValue`) | consumers: `add-session.js`, `export-modal.js`, `pdf-export.js` | Widget primitive is shared; all readers must handle the new marker |
| Export order + severity split | Export modal (`export-modal.js`) | PDF (`pdf-export.js`) | Step-1 list, both builders, severity-block position |
| Docs (help + changelog) | Content files (`help-content-en.js`, `changelog-content-en.js`) | he/de/cs locale passes | Planner-owned scope (D-18); EN is corpus of record |

## Standard Stack

**No external packages. Zero-build, zero-npm, vanilla IIFE `window.*` modules.** [VERIFIED: codebase grep — `package.json` has only a `test` script running `node tests/run-all.js`; all `assets/*.js` are hand-authored IIFEs.]

### Core (existing, reused verbatim)
| Mechanism | Location | Purpose | Why Standard |
|-----------|----------|---------|--------------|
| `PortfolioDB._writeTherapistSentinel` | `db.js` L947 | Raw `put` for non-section sentinel rows | Order sentinel must NOT use `setTherapistSetting` (coerces to `{customLabel,enabled}`, loses sentinel semantics) [VERIFIED: codebase grep] |
| `PortfolioDB.getAllTherapistSettings` | `db.js` L987 | Read all therapistSettings rows | Order record loaded alongside section rows [VERIFIED] |
| `App.getSectionLabel` / `App.isSectionEnabled` + `_sectionLabelCache` | `app.js` L58/L72/L39 | Sync label + enable read, eager-loaded in `initCommon` | Order cache rides the same pattern + BroadcastChannel refresh (L858) [VERIFIED] |
| `setPointerCapture` pointer-drag | precedent: `crop.js` (Ph10), demo-resize (Ph14) | Mouse + touch drag, no HTML5 DnD | ORDR-01 lock; `47-mockups.html` `wireDrag` is a working reference [VERIFIED: mockup + STATE decisions] |
| `App.createSeverityScale` / `App.getSeverityValue` | `app.js` L1209/L1239 | 0–10 button picker; reads `dataset.value` (`""`→null) | Extend for the 11th — marker [VERIFIED] |
| `App.confirmDialog` | used throughout `settings.js` | Neutral-tone confirm | Reset-names confirm (UI-SPEC) reuses it [VERIFIED] |
| BroadcastChannel `"sessions-garden-settings"` + `therapist-settings-changed` | `settings.js` L518, `app.js` L858 | Cross-tab settings refresh | Order-cache invalidation rides the same message [VERIFIED] |

### Supporting (existing)
| Mechanism | Location | Use case |
|-----------|----------|----------|
| `buildSvg()` DOM-API SVG builder | `settings.js` L62 | Drag-handle / arrow / ⓘ icons (no innerHTML contract) |
| `LOCKED_RENAME` set | `settings.js` L35 | Groups get ✎; `heartShield`/`issues`/`nextSession` keep no ✎ |
| `computeDisableTransitions` + Save staging | `settings.js` L449 | Order changes join the same dirty-state Save flow (D-16) |
| jsdom test helpers (`app-stub.js`, `mock-portfolio-db.js`, `jsdom-pdf-env.js`) | `tests/_helpers/` | Guard-test rewrite harness |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pointer events | HTML5 Drag-and-Drop API | **Rejected by ORDR-01 lock** — HTML5 DnD does not fire on iPhone touch; pointer events cover mouse + touch uniformly |
| Order sentinel in therapistSettings | Separate IDB store / localStorage | Sentinel reuses the proven `snippetsDeletedSeeds` backup path (ORDR-05 names it explicitly); a new store needs a migration + backup wiring |
| Distinct "—" marker value | Reuse `null` for skip | `null` already means "unselected" in `getSeverityValue`; skip must be distinguishable (mandatory-satisfying vs unset) |

**Installation:** None. No `npm install`.

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.** The project is zero-npm/zero-build vanilla JS (`package.json` carries only a test runner script, no runtime `dependencies`). No registry lookup, no slopsquat surface. [VERIFIED: codebase grep]

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────────┐
   Settings page    │  Grouped reorder list (settings.js)          │
   (user drags /    │   rows: drag-handle ⠿ + ↑/↓ + ✎ + toggle     │
    taps arrows)    │   group-header rows + indented member rows   │
                    └───────────────┬─────────────────────────────┘
                                    │ every mutation →
                                    ▼
                    ┌─────────────────────────────────────────────┐
                    │  SHARED MOVE-VALIDATOR (one fn)              │
                    │  clamp: afterSeverity never before topics   │◄──── also consulted by
                    │  (Interaction 11) — pure, returns bool/idx  │      saved-order LOAD
                    └───────────────┬─────────────────────────────┘      and BACKUP RESTORE
                                    │ on Settings Save (D-16 staging)
                                    ▼
        ┌──────────────────────────────────────────────────────────────┐
        │  ORDER SENTINEL  {sectionKey:"sectionOrder", version, items}  │
        │  therapistSettings store · _writeTherapistSentinel path       │
        └───────┬───────────────────────────────────────────┬──────────┘
                │ backup export/restore                       │ eager load in initCommon
                ▼ (ALLOWED_SENTINEL_KEYS lock-step)           ▼
        ┌───────────────┐                     ┌─────────────────────────────────┐
        │ backup.js     │                     │ App.getSectionOrder()  (sync)    │
        │ round-trip    │                     │  cache sibling of _sectionLabel  │
        └───────────────┘                     └───────┬─────────────────┬───────┘
                                                       │                 │
                              ┌────────────────────────▼──┐   ┌──────────▼─────────────┐
                              │ Session FORM render        │   │ EXPORT (export-modal)  │
                              │ (add-session.js)           │   │  Step-1 list == order  │
                              │  order-driven accordions   │   │  markdown builder      │
                              │  empty groups hide (D-04)   │   │  severityAfterSections │
                              │  before-rating in topics    │   │   = ordinal(afterSev)  │
                              │  after-block at its slot     │   └──────────┬─────────────┘
                              └─────────────────────────────┘              │ same order
                                                                            ▼
                                                          ┌──────────────────────────────┐
                                                          │ PDF (pdf-export.js)           │
                                                          │  drawSeverityBlock at slot    │
                                                          │  (loop UNCHANGED; only the    │
                                                          │   severityAfterSections input │
                                                          │   derivation changes)          │
                                                          └──────────────────────────────┘
```

### Component Responsibilities
| File | Responsibility in this phase |
|------|------------------------------|
| `db.js` | Register `"sectionOrder"` in `_SENTINEL_KEYS`; the sentinel put/read is `_writeTherapistSentinel` + a reader helper |
| `backup.js` | Add `"sectionOrder"` to `ALLOWED_SENTINEL_KEYS` (L1157); sanitize the restored order through the shared validator |
| `app.js` | Eager-load order in `initCommon`, expose `App.getSectionOrder()` sync + cross-tab refresh; house the shared move-validator |
| `settings.js` | Grouped reorder list (drag + arrows + group headers), Reset order / Reset names, ⓘ severity explainer; order joins Save staging |
| `add-session.html` / `add-session.js` | One-time D-02 default restructure + order-driven render; — skip value; after-block auto-hide; severity-off column hide |
| `export-modal.js` | Step-1 list from saved order; markdown builder ordered by saved order; topics/severity split (D-14); `severityAfterSections` re-derived |
| `pdf-export.js` | Severity-block placement fed by new `severityAfterSections`; Phase 23 Hebrew bidi pipeline untouched |
| `tests/30-export-markdown.test.js` | Rewritten three-way invariant guard (form == Step-1 == export, against SAVED order) |

### Pattern 1: Order sentinel shape (group-ready, D-05)
**What:** A single therapistSettings row modeling top-level order + group identity + members + title override.
**When to use:** The one persisted artifact for ORDR-05.
**Example (proposed — plan review confirms exact shape):**
```javascript
// [ASSUMED] shape — satisfies D-05 group-as-data + zero-migration future
{
  sectionKey: "sectionOrder",   // sentinel key (NOT a real section)
  version: 1,                    // for future merge/migration semantics
  items: [
    { type: "section", key: "issues" },                 // Session topics (bare; carries before-rating)
    { type: "group", id: "emotionsTech", titleOverride: null,
      members: ["heartShield", "heartShieldEmotions", "trapped",
                "insights", "limitingBeliefs", "additionalTech"] },
    { type: "section", key: "afterSeverity" },           // NEW freely-orderable after-severity item
    { type: "group", id: "wrapup", titleOverride: null,
      members: ["comments", "nextSession"] }
  ]
}
// Section RENAMES stay in per-section therapistSettings rows (customLabel).
// GROUP renames live in items[].titleOverride (D-05). Enable states stay per-section rows.
```
*Rationale: separating group titleOverride (in the sentinel) from section customLabel (in section rows) keeps the future group-management phase migration-free — it only adds create/dissolve verbs over the same `items[]`.*

### Pattern 2: One shared move-validator (Interaction 11)
**What:** A pure function consulted by drag, arrows, saved-order load, AND backup restore.
**When to use:** Every path that produces or accepts an order.
**Example:**
```javascript
// [ASSUMED] — enforce "afterSeverity never precedes topics (issues)"
// Returns a sanitized items[] (load/restore) or a boolean (can-drop test).
function sanitizeOrder(items) {
  const iTopics = items.findIndex(it => it.type === "section" && it.key === "issues");
  const iAfter  = items.findIndex(it => it.type === "section" && it.key === "afterSeverity");
  if (iTopics !== -1 && iAfter !== -1 && iAfter < iTopics) {
    const [after] = items.splice(iAfter, 1);
    items.splice(items.indexOf(items[iTopics]) + 1, 0, after); // clamp to just-after topics
  }
  return items;
}
```
*A restored backup or migrated order MUST pass through this — otherwise the clamp is UI theater (Interaction 11 explicit).*

### Pattern 3: `severityAfterSections` re-derived from saved order
**What:** Keep the PDF render loop untouched; change only the input number.
**Why:** `pdf-export.js` L1486-1501 inserts the two-bar block when `sectionHeadingsSeen === severityAfterSections`. Today `export-modal.js` L760-771 computes that number by matching the first `##` heading against the heart-shield label (→ 0 or 1). Under the new model, the after-severity item can sit anywhere.
**Example:**
```javascript
// [ASSUMED] new derivation — count exported document sections preceding the afterSeverity slot
// in SAVED order (only enabled + present sections, matching what the builder emits).
function deriveSeverityAfterSections(orderedKeys, emittedKeys) {
  const idx = orderedKeys.indexOf("afterSeverity");
  if (idx === -1) return emittedKeys.length; // fallback: end
  return orderedKeys.slice(0, idx).filter(k => emittedKeys.includes(k)).length;
}
```
*This generalizes the existing 0/1 mechanism to N with zero change to the PDF loop or the Phase 23 bidi pipeline. Flagged for plan-review confirmation per Claude's Discretion.*

### Pattern 4: The — (skip) severity value
**What:** An 11th scale value that is mandatory-satisfying but numerically absent.
**Constraints from source:** `getSeverityValue` returns `Number|null`; `null` already means unselected. Skip needs a distinct marker.
**Example:**
```javascript
// [ASSUMED] — reserve a sentinel; update EVERY reader
const SEV_SKIP = "skip";                       // dataset.value === "skip"
// getSeverityValue: return SEV_SKIP for skip, number for 0-10, null for unselected
// validateIssues: treat SEV_SKIP as VALID (field is satisfied)
// updateDelta: SEV_SKIP → hide delta AND hide the after-rating for that topic (D-09)
// export (8a): SEV_SKIP contributes NO before/after bar, NO markdown line; if EVERY
//   topic is skip, omit the severity block entirely even when the sub-option is checked
```
*Readers to touch (grep-verified): `add-session.js` `getIssuesPayload` L830, `updateDelta` L695, `validateIssues` L841; `export-modal.js` issues payload; `pdf-export.js` `drawSeverityBlock`.*

### Anti-Patterns to Avoid
- **Hardcoding groups in the form/CSS.** D-05 requires groups as DATA. A hardcoded group structure means the future group-management phase needs a migration — explicitly forbidden.
- **Using logical `inset-inline-*` for drag/overlay positioning.** [CITED: repo memory `reference-rtl-logical-props-physical-coords`] `getBoundingClientRect` is physical; feeding it into `inset-inline` mirrors overlays wrongly in RTL. Use physical `left`/`top`. Layout chrome (handles/arrows) still uses logical props to flip for free.
- **Validating the clamp only in the drag handler.** Load + restore paths bypass it → invariant breaks silently on a restored backup (Interaction 11).
- **A locale-only edit to satisfy the docs gate.** [CITED: CLAUDE.md] EN is the corpus of record; `*-he/de/cs.js` edits do NOT satisfy the help/changelog demand.
- **Injecting a sentinel into `editor.value` to mark document headings.** [VERIFIED: `export-modal.js` L484-486] `documentSectionLabels` is passed as DATA precisely so the `.md` download stays byte-clean — preserve that.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persist per-therapist order | New IDB store + backup wiring | `_writeTherapistSentinel` + `ALLOWED_SENTINEL_KEYS` (lock-step) | `snippetsDeletedSeeds` already proves the exact path incl. backup round-trip |
| Sync order read in form/export | Async DB read at render time (races) | Eager cache in `initCommon` + `App.getSectionOrder()` | Mirrors `getSectionLabel`; form/export read synchronously (D-16 snapshot) |
| Cross-tab order refresh | Custom storage-event plumbing | BroadcastChannel `"sessions-garden-settings"` | Already wired for therapist-settings-changed (`app.js` L858) |
| Touch + mouse drag | HTML5 DnD or a drag lib | `setPointerCapture` pointer events | ORDR-01 lock; `crop.js`/demo-resize precedents; mock proves it |
| PDF severity placement | New render pass | Existing `drawSeverityBlock` loop, only re-derive the count | Loop is Phase-23-bidi-safe and battle-tested; changing input is 1 function |
| Section label resolution | Re-read DB per section | `App.getSectionLabel` (XSS-safe via textContent) | Verbatim customLabel already handled (T-22-02-01) |
| Confirm dialog for Reset names | New modal | `App.confirmDialog({tone:"neutral"})` | Used across settings.js/backup.js |

**Key insight:** Every persistence, caching, drag, and severity primitive this phase needs already ships in the repo. The risk is NOT "can we build it" — it's **composition discipline**: one sentinel, one cache, one validator, one severity marker, all consumers repointed together. The 260615 bug class returns the moment two consumers read order from different sources.

## Runtime State Inventory

> This phase changes a persisted data model (adds an order sentinel; changes severity value semantics) and restructures a form. Runtime-state audit:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | (1) NEW `therapistSettings` row `sectionKey:"sectionOrder"`. (2) Existing sessions store issue records with `before`/`after` = number\|null; the new — (skip) marker introduces a NON-numeric value into future writes. Existing sessions are unaffected (no skip values pre-exist). | Code edit (writer of new marker) + read-tolerance in every severity reader. NO migration of existing session records (skip only appears going forward). |
| **Live service config** | None — fully local IndexedDB PWA, no external service holds section order or severity config. | None — verified: order/severity live only in IDB + localStorage; no server, no n8n, no Datadog. |
| **OS-registered state** | None — browser PWA; no OS task/service embeds section keys. | None. |
| **Secrets/env vars** | None — no secret or env var references section keys or severity. | None. |
| **Build artifacts / caches** | (1) Service worker precache — `add-session.html`/`settings.html`/`assets/*.js` change → SW `INTEGRITY_TOKEN` auto-rolls on deploy [CITED: repo memory `reference-pre-commit-sw-bump` — no manual bump needed]. (2) `App._sectionLabelCache` in-memory — a NEW order cache sibling must invalidate on the same BroadcastChannel message, else a peer tab renders stale order. (3) Backup manifests already in the wild: older backups have NO `sectionOrder` row → restore must default to D-02 order (absent record → default; Claude's Discretion). | SW: none (auto). Order cache: wire cross-tab refresh. Backup: default-on-absent handling + sanitize-on-restore. |

**The canonical question — after every file is updated, what runtime state still holds old semantics?** Two things: (1) **in-flight peer tabs** with a stale in-memory order cache (fix: BroadcastChannel invalidation), and (2) **existing backup files** with no order record (fix: absent → D-02 default, then sanitize through the shared validator). Neither is a data migration; both are read-time defensive handling.

## Common Pitfalls

### Pitfall 1: Order read from two sources (the 260615 bug class)
**What goes wrong:** Form renders from saved order but export Step-1/builder still reads `EXPORT_SECTION_ORDER` (static). List, form, and document diverge.
**Why it happens:** `export-modal.js` has THREE order consumers today — `EXPORT_SECTION_ORDER` (L343), `buildDocumentSectionLabels` (L492), Step-1 renderer (L521) — plus `buildFilteredSessionMarkdown` (L379) which hardcodes section emission order in-line (L434-470).
**How to avoid:** Derive ALL from `App.getSectionOrder()`. Rewrite `buildFilteredSessionMarkdown` to iterate the ordered key list instead of the hardcoded L434-470 sequence. The 260615 guard test asserts the three-way invariant against SAVED order (D-13).
**Warning signs:** Guard test passes against static DOM but real reorder diverges — the test must assert against a MUTATED saved order, not the default.

### Pitfall 2: The clamp enforced only in the UI
**What goes wrong:** Drag/arrows block afterSeverity-before-topics, but a crafted/old backup or a future-default merge produces an illegal order; the form/export then render severity before topics.
**Why it happens:** Restore (`backup.js` L1158-1196) and load are separate code paths from the Settings drag handler.
**How to avoid:** One `sanitizeOrder(items)` called by load, restore, AND as the drop predicate. Interaction 11 says this explicitly: "a restored backup or migrated order is sanitized through the same rule, otherwise the invariant is theater."
**Warning signs:** A test that drags but never tests load/restore sanitization.

### Pitfall 3: — (skip) confused with null (unselected)
**What goes wrong:** `getSeverityValue` returns null for both → validation lets a truly-empty rating through, OR a skip contributes a phantom 0 to the PDF.
**Why it happens:** `getSeverityValue` (L1239) collapses `""`/undefined → null; skip needs a THIRD state.
**How to avoid:** Reserve a distinct marker (`"skip"`); every reader (`getIssuesPayload`, `validateIssues`, `updateDelta`, PDF `drawSeverityBlock`, markdown) branches on it. Export omits skip entirely (8a); if ALL topics skip, omit the block even when the sub-option is checked.
**Warning signs:** A skip value that survives into the PDF as a bar or a literal "—"/"N/A" string.

### Pitfall 4: jsdom false-GREEN on drag / PDF / RTL
**What goes wrong:** Tests pass in jsdom but touch-drag, RTL drag math, and PDF severity placement are invisible to jsdom.
**Why it happens:** [CITED: repo memory — multiple: `reference-pdf-jsdom-inert-gates`, `reference-python-server-breaks-sw-offline-tests`, CONTEXT code_context] The repo has shipped false-GREEN jsdom PDF tests before.
**How to avoid:** Behavior tests for pure logic (order sanitization, severity-value branching, `severityAfterSections` derivation, backup round-trip). Real-device/real-PDF UAT for: iPhone touch drag, RTL drag mirroring, PDF severity-block position, empty-group hide. Phase 44's pre-prod environment exists for exactly this.
**Warning signs:** No non-jsdom verification step for drag/PDF/RTL in the plan.

### Pitfall 5: Form restructure orphans tour anchors
**What goes wrong:** D-02 collapses the 4 static accordions into a new group structure; `data-tour="session-heart"` (on the old `emotions` accordion, `add-session.html` L246) and `session-setup`/`session-save` may lose their targets → tour step dead (repo has a prior tour-resume-dead incident).
**Why it happens:** Tour anchors are CSS selectors (`tour.js` L137-139) bound to specific DOM nodes.
**How to avoid:** Preserve or re-point `data-tour` anchors during restructure; verify the tour end-to-end (decided at planning per CONTEXT: whether reordering gets its OWN tour step — recommend defer, but the EXISTING anchors must survive).
**Warning signs:** Restructure PR with no tour verification.

### Pitfall 6: Docs gate blocks the push
**What goes wrong:** Heavily user-facing phase pushed without EN help/changelog edits → `scripts/docs-gate.js` fails closed on CI.
**Why it happens:** [CITED: CLAUDE.md Definition of Done] Changelog + affected help topics required; EN only satisfies.
**How to avoid:** The dedicated planner-owned docs task (D-18) with the coverage list below, drafted as its own content pass Ben reviews BEFORE code fixes land [CITED: repo memory `feedback-docs-content-passes-separate-from-code`].

## Code Examples

### Grouped reorder row + pointer drag (reference: 47-mockups.html, verified working)
```javascript
// Source: 47-mockups.html wireDrag() — approved mock, pointer events + physical coords
handle.addEventListener('pointerdown', e => {
  e.preventDefault(); handle.setPointerCapture(e.pointerId);
  row.classList.add('dragging');
  function move(ev) {
    // PHYSICAL getBoundingClientRect (NOT inset-inline) — RTL-safe
    const after = [...host.querySelectorAll('.rrow:not(.dragging)')].find(el => {
      const b = el.getBoundingClientRect();
      return ev.clientY < b.top + b.height / 2;
    });
    if (after) host.insertBefore(row, after); else host.appendChild(row);
    sanitizeOrder(/* current DOM order */);   // clamp on every move (Interaction 11)
  }
  function up() { row.classList.remove('dragging'); handle.releasePointerCapture(e.pointerId);
    handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up);
    refreshArrowEndStops(host); }
  handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up);
});
// handle CSS: touch-action:none;  (else iOS scrolls instead of dragging)
```

### Sentinel lock-step registration (both files, same PR)
```javascript
// db.js L920 — add the order key
const _SENTINEL_KEYS = new Set([DELETED_SEEDS_KEY, "sectionOrder"]);
// backup.js L1157 — MUST match, or restore silently drops the order (ORDR-05)
var ALLOWED_SENTINEL_KEYS = new Set(["snippetsDeletedSeeds", "sectionOrder"]);
// db.js already documents this lock-step requirement in the comment at L917-919.
```

### Order-driven markdown emission (replaces hardcoded L434-470)
```javascript
// export-modal.js — iterate SAVED order instead of the inline hardcoded sequence
const orderedKeys = App.getSectionOrder().flatKeys();  // groups flattened, form-only (D-03)
orderedKeys.forEach(key => {
  if (!selected.has(key)) return;
  const val = readSectionValue(key);               // existing per-key readers
  if (!val) return;
  lines.push("", `## ${stripRequired(App.getSectionLabel(key, exportDefaultI18nKey(key)))}`, val);
});
// Group NAMES never emitted (D-03); severity block placed via deriveSeverityAfterSections().
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static `EXPORT_SECTION_ORDER` array | Saved-order-driven emission | This phase | All three export consumers repoint to `App.getSectionOrder()` |
| `severityAfterSections` = heart-shield-label match (0/1) | Ordinal of afterSeverity item in saved order | This phase | Generalizes to N; PDF loop unchanged |
| Severity always on; `before`/`after` = number\|null | App-level on/off switch + — skip marker (3-state) | This phase | Serves non-Emotion/Body-Code therapists |
| 4 hardcoded form accordions | Order-driven groups-as-data | This phase | Future group-management plugs in migration-free (D-05) |
| Severity = sibling export section | Severity = dependent sub-option of topics (D-14) | This phase | Fixes 46.1 UAT: topics-without-severity impossible before |

**Deprecated/outdated after this phase:**
- `EXPORT_SECTION_ORDER` (`export-modal.js` L343) — replaced by saved order.
- The heart-shield-label heading match for `severityAfterSections` (`export-modal.js` L760-771) — replaced by ordinal derivation.
- `session.form.afterSeverityTitle` copy — replaced by "Issue severity — end of session" (UI-SPEC); HE keeps דרגת חומרה terminology.
- The current HE export label for "Session topics" (mismatch) — fixed as part of D-14.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Order sentinel shape `{sectionKey:"sectionOrder",version,items:[…]}` with section/group item types | Pattern 1 | Wrong shape → future group-management needs a migration (violates D-05); plan review must confirm |
| A2 | After-severity gets a NEW orderable key `"afterSeverity"` (distinct from `"issues"` which becomes Session topics) | Requirements / Pattern 1 | If reusing `"issues"` for both, the split can't be modeled; affects every consumer |
| A3 | — (skip) stored as a distinct non-numeric marker (`"skip"`), not null | Pattern 4 / Pitfall 3 | Wrong → validation + export edge cases; marker choice affects backup round-trip of sessions |
| A4 | `severityAfterSections` re-derived as ordinal of afterSeverity in saved order; PDF loop unchanged | Pattern 3 | If the PDF loop needs changes too, Phase-23 bidi risk rises; plan review confirms |
| A5 | Group titleOverride lives in the sentinel `items[]`; section customLabel stays in section rows | Pattern 1 | Wrong split → group-management migration; also affects Reset names scope |
| A6 | New REQUIREMENTS IDs ORDR-06/07/08 for severity-switch / —-value / group-renames | Phase Requirements | Naming only; Ben approves amendment at plan review |
| A7 | Existing session records need NO migration (— only appears in future writes) | Runtime State Inventory | If a migration is expected, a data-migration task is missing |
| A8 | Older backups without `sectionOrder` → default to D-02 order on restore | Runtime State Inventory | Wrong default → restored profile loses/garbles order |
| A9 | Recommend DEFER a dedicated reorder tour step; only preserve existing anchors | Pitfall 5 | Ben may want a reorder tour step; decided at planning |

**These A1-A9 are the "researcher proposes, plan review confirms" items flagged in CONTEXT Claude's Discretion. None are locked; all need Ben's confirmation at plan review before execution.**

## Open Questions

1. **Can after-severity truly sit "even before Session topics" (D-07) vs. the Interaction-11 clamp (afterSeverity never before topics)?**
   - What we know: D-07 (CONTEXT) says after-severity "may sit anywhere, even before Session topics." Interaction 11 (UI-SPEC, locked 2026-07-23, LATER) says "Issue severity always sits after Session topics."
   - What's unclear: These read as contradictory; UI-SPEC is the later lock.
   - Recommendation: Treat Interaction 11 (the later, explicitly-locked rule) as authoritative — afterSeverity is clamped to AFTER topics. Flag this reconciliation to Ben at plan review so the earlier D-07 phrasing doesn't cause confusion. (Resolved in this doc: D-07 annotated with the clamp.)

2. **Does the PDF two-bar block (before+after per issue) render at the afterSeverity slot, and do topic before-ratings ALSO appear elsewhere?**
   - What we know: `drawSeverityBlock` draws both before AND after bars per issue at one slot. D-07 glues before to topics, after to its own item.
   - What's unclear: Whether the before-bar should visually move to the topics slot in the PDF, or the combined before/after block stays as one unit at the afterSeverity slot.
   - Recommendation: Keep the combined before/after block as ONE unit at the afterSeverity slot (minimal change, Phase-23-safe); the topics section in the PDF shows topic names only, not a duplicate before-bar. Confirm at plan review (explicit Claude's Discretion item).

3. **Guided-tour step for reordering — add or defer?**
   - What we know: CONTEXT leaves it to planning; existing tour has no Settings-reorder step.
   - Recommendation: Defer a NEW step (scope control) but MUST preserve existing `data-tour` anchors through the form restructure. Confirm with Ben.

## Environment Availability

**Skipped — no new external dependencies.** The phase is pure code/config change in an existing local-only PWA. Test runner (`node tests/run-all.js`) and jsdom helpers already present. Real-device UAT uses Ben's installed PWA + iPhone + Phase 44 pre-prod (existing).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in (`node tests/run-all.js`) + jsdom helpers in `tests/_helpers/` [VERIFIED: package.json L7, tests/ listing] |
| Config file | none — `tests/run-all.js` runner; 208 `*.test.js` files |
| Quick run command | `node tests/30-export-markdown.test.js` (single guard file) |
| Full suite command | `npm test` (→ `node tests/run-all.js`) |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| ORDR-03/04 | form == Step-1 == export against a MUTATED saved order (260615 three-way) | unit (jsdom) | `node tests/30-export-markdown.test.js` | ✅ (rewrite) |
| ORDR-05 | order sentinel survives encrypted backup round-trip | unit | new `tests/47-order-backup-roundtrip.test.js` | ❌ Wave 0 (model on `45-backup-roundtrip.test.js` / `snippet-prefix-backup-roundtrip.test.js`) |
| ORDR-05 | `_writeTherapistSentinel` accepts `sectionOrder`; `getAllTherapistSettings` returns it | unit | new `tests/47-order-sentinel.test.js` | ❌ Wave 0 (model on `25-10-snippets-sentinel-roundtrip.test.js`) |
| Interaction 11 | `sanitizeOrder` clamps on load AND restore | unit (pure) | new `tests/47-order-sanitize.test.js` | ❌ Wave 0 |
| D-09 / 8a | — skip: mandatory-satisfying; excluded from export; all-skip omits block | unit | new `tests/47-severity-skip.test.js` | ❌ Wave 0 |
| Pattern 3 | `deriveSeverityAfterSections` ordinal correct for varied orders | unit (pure) | new `tests/47-severity-position.test.js` | ❌ Wave 0 |
| ORDR-01 (touch drag), RTL drag, PDF severity position, empty-group hide | behavior invisible to jsdom | **manual / real-device** | Ben iPhone + installed PWA + real PDF + Phase 44 pre-prod | n/a (UAT gate) |

### Sampling Rate
- **Per task commit:** the single affected guard file (e.g. `node tests/30-export-markdown.test.js`).
- **Per wave merge:** `npm test` (full 208-file suite).
- **Phase gate:** full suite green + real-device UAT (touch drag, RTL, PDF, empty-group) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `tests/47-order-sentinel.test.js` — sentinel put/read (ORDR-05); model on `25-10-snippets-sentinel-roundtrip.test.js`
- [ ] `tests/47-order-backup-roundtrip.test.js` — encrypted round-trip (ORDR-05); model on `45-backup-roundtrip.test.js`
- [ ] `tests/47-order-sanitize.test.js` — clamp on load + restore (Interaction 11)
- [ ] `tests/47-severity-skip.test.js` — — value validation + export omission (D-09/8a)
- [ ] `tests/47-severity-position.test.js` — `deriveSeverityAfterSections` ordinal (Pattern 3)
- [ ] Rewrite `tests/30-export-markdown.test.js` — assert three-way invariant against a MUTATED saved order (not static DOM); this is the atomic 260615 rewrite (ORDR-04)
- [ ] Existing `tests/30-settings-section-roundtrip.test.js` — extend for order rows if it asserts section-row shape

## Security Domain

`security_enforcement` is enabled (config `security: … research:true`; no explicit `false`).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local-only PWA; no auth surface in this phase |
| V3 Session Management | no | No server sessions |
| V4 Access Control | no | Single-user local device |
| V5 Input Validation | **yes** | Group titleOverride + section customLabel are user text → render via `.textContent`/`.value` ONLY (never innerHTML) — the existing `settings.js` contract (L28-29, L129). Order sentinel from a crafted/old backup → sanitize keys against the known section-key allowlist (`backup.js` L1146-1156) AND run through `sanitizeOrder`. |
| V6 Cryptography | indirect | Encrypted backup round-trip (ORDR-05) uses the existing AES-GCM path — do NOT hand-roll; the order row rides the same manifest encryption |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via group/section rename (verbatim user text) | Tampering/Elevation | `.textContent`/`.value` render only (existing contract); never innerHTML |
| Crafted backup injects arbitrary sectionKeys / illegal order | Tampering | Restore whitelists section keys (`ALLOWED_SECTION_KEYS`) + sentinel keys (`ALLOWED_SENTINEL_KEYS`); order items sanitized: drop unknown keys, clamp via `sanitizeOrder`, absent → D-02 default |
| Order sentinel with non-array `items` / wrong types | Tampering/DoS | Type-guard on read (coerce to default on malformed), mirroring `_writeTherapistSentinel`'s `deletedIds` array coercion (`db.js` L955-956) |
| — skip marker smuggled into a numeric severity field | Tampering | Reader branches on the exact marker; unknown values coerce to null (unselected) |

## Docs Coverage (planner-owned, D-18)

**HELP-MAP topics affected (read HELP-MAP.md cold — this is the index, verified):**
| Topic (help-content-en.js) | Why affected |
|----------|--------------|
| `make-it-yours / topic-sections-on-off` | Enable toggles now sit in the reorder list; rows keep their slot |
| `make-it-yours / topic-renaming` | Group renames ship (D-05); Reset names button |
| `make-it-yours / (NEW) topic-reordering` | Drag + arrows, groups, Reset order — the headline feature (planner decides new topic vs. extend existing) |
| `severity / topic-before-after` | App-level on/off switch (D-08), — skip value (D-09) |
| `severity / (NEW) "how to turn severity ratings off"` | **Mandated by D-08** — docs-gate demand, EN first + all four locales |
| `review-export / topic-single-export` + `topic-export-formats` | Topics/severity Step-1 split (D-14), order mirrored in export |

**Changelog (`changelog-content-en.js`, EN corpus of record):** the 4-part D-18 user story. **All new UI strings in EN/DE/HE/CS.** Changelog-only-tier files (`app.js`, `i18n-*.js`, tour) raise changelog demand only — but `settings.html`/`settings.js`/`add-session.html` map to real help topics above.

## Sources

### Primary (HIGH confidence — codebase grep, this session)
- `assets/settings.js` — SECTION_DEFS (L39), LOCKED_RENAME (L35), renderRow, Save staging, `computeDisableTransitions` (L449), buildSvg (L62)
- `assets/db.js` — `_SENTINEL_KEYS` (L920), `_writeTherapistSentinel` (L947), `setTherapistSetting` (L969), therapistSettings migration 4 (L306)
- `assets/backup.js` — `ALLOWED_SENTINEL_KEYS` (L1157), `ALLOWED_SECTION_KEYS` (L1146), restore loop (L1158-1196)
- `assets/app.js` — `getSectionLabel`/`isSectionEnabled`/`_sectionLabelCache` (L39-75), BroadcastChannel refresh (L858), `createSeverityScale`/`getSeverityValue` (L1209/L1239)
- `assets/export-modal.js` — `EXPORT_DEFAULT_CHECKED` (L331), `EXPORT_SECTION_ORDER` (L343), `buildFilteredSessionMarkdown` (L379), `buildDocumentSectionLabels` (L492), `emotionsBlockIncluded` (L510), Step-1 renderer (L517), `severityAfterSections` derivation (L760-771)
- `assets/pdf-export.js` — severity-block placement loop (L1425-1501), document-heading classification
- `assets/add-session.html` — 4-accordion structure (L205-340), data-section-key rows, data-tour anchors
- `assets/add-session.js` — `createIssueBlock`/severity scales (L716-828), `getIssuesPayload` (L830), `applySectionVisibility`/`applySectionLabels` (L997-1042)
- `assets/tour.js` — anchor contract (L131-139)
- `tests/30-export-markdown.test.js` — 260615 guard suite; `tests/_helpers/` harness
- `47-mockups.html` — approved pointer-drag reference (`wireDrag`), — pill, ⓘ popover, topic+before-rating
- `47-UI-SPEC.md` (approved), `47-CONTEXT.md`, `CONTEXT-SEED.md`, `.planning/REQUIREMENTS.md`, `CLAUDE.md` (docs gate), `HELP-MAP.md`

### Secondary (repo memory — MEDIUM/CITED)
- `reference-rtl-logical-props-physical-coords` — physical coords for RTL drag/overlay
- `feedback-docs-content-passes-separate-from-code` — content pass before code fixes (D-18)
- `reference-pdf-jsdom-inert-gates`, `feedback-behavior-verification` — jsdom false-GREEN risk
- `reference-pre-commit-sw-bump` — SW token auto-rolls, no manual bump
- `feedback-ui-checker-greenfield-false-positives` — reuse-phase checker calibration (UI-SPEC Accepted Exceptions)

## Metadata

**Confidence breakdown:**
- Standard stack / existing patterns: HIGH — every mechanism read directly from source this session
- Architecture (sentinel shape, validator, severity-position derivation): MEDIUM — sound proposals grounded in existing patterns, but flagged ASSUMED (A1-A9) for plan-review confirmation per Claude's Discretion
- Pitfalls / security: HIGH — grounded in grep + documented repo incidents

**Research date:** 2026-07-23
**Valid until:** 2026-08-22 (stable internal codebase; no fast-moving external deps). Re-verify only if `export-modal.js`/`pdf-export.js`/`db.js` change before planning.
