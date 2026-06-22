# Phase 24: Pre-Launch Final Cleanup — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 24-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 24-pre-launch-final-cleanup
**Areas discussed:** Single-newline markdown rendering, Edit-session Cancel/Revert UX, Pre-session context card scope, Snippet engine implementation

---

## Single-newline markdown rendering (Item 4)

| Option | Description | Selected |
|---|---|---|
| Keep as-is — standard Markdown paragraph join | Consecutive lines join with space. Blank line = new paragraph. Matches every Markdown renderer the therapist might cross-reference. | ✓ |
| Change globally to per-line breaks (GitHub soft-break) | Each Enter = `<br>` everywhere. Affects preview, PDF, MD copy. Breaks Markdown contract for lists/headings. | |
| Per-line in preview/PDF only, MD copy stays paragraph-join | Hybrid: rendered surfaces treat single newlines as breaks, raw MD download keeps Markdown contract. | |
| You decide — defer until user signal | Lean-recommendation if no user complaint exists. | |

**User's choice:** Keep as-is.
**Notes:** Reason: matches GitHub/Obsidian/Notion. Keeps PDF + MD copy + preview pane consistent. Therapists who want line breaks add a blank line.

---

## Edit-session Cancel/Revert UX (Item 2)

### Q1: Affordance position

| Option | Description | Selected |
|---|---|---|
| Header button alongside Save/Delete | Always-visible button in the action header. No new UI region. | ✓ |
| Footer / sticky bottom action bar | Bigger tap targets, mobile-friendly. New pattern not used elsewhere. | |
| Inline pencil-icon toggle | Click pencil again to revert. Smallest UI footprint; discovery risk. | |
| You decide | Lean header button. | |

**User's choice:** Header button alongside Save/Delete.

### Q2: Confirm dialog rules

| Option | Description | Selected |
|---|---|---|
| Confirm only if form is dirty | No changes → silent return; dirty → confirm modal. Mirrors `App.installNavGuard`. | ✓ |
| Always confirm — even when clean | Highest safety; most friction. | |
| Never confirm — always revert silently | Maximum speed; misclick = lost work. | |
| Confirm only if dirty AND > N seconds | Hybrid time-gated; marginal benefit. | |

**User's choice:** Confirm only if form is dirty.
**Notes:** Reuse Phase 21 confirm-card pattern; mirrors `App.installNavGuard` (`app.js:1052`).

### Q3: Button wording

| Option | Description | Selected |
|---|---|---|
| "Cancel" — neutral verb | EN: Cancel. Universal across apps. | |
| "Discard changes" — warning verb | Explicit destructive label; longer in all 4 locales. | |
| "Revert" — explicit semantic | Closer to actual behavior; less common in consumer apps. | |
| Asymmetric — "Cancel" when clean, "Discard changes" when dirty | Label swaps based on dirty state. | ✓ |

**User's choice:** Asymmetric, with explicit Hebrew constraint.
**Notes (verbatim from user):** "Assymetric sounds good but the Hebrew translation anyway needs gender neutral and good wording."
**Locked rule:** Hebrew strings use **noun/infinitive forms** (gender-neutral), never imperative. Concrete strings: Cancel = ביטול / Discard = ביטול השינויים / View (clock-icon) = הצגה. Documented in CONTEXT.md D-05.

### Q4: Clock-icon "Edit" button rename (companion fix)

| Option | Description | Selected |
|---|---|---|
| "View" + pencil icon | Entering opens read mode; pencil toggles edit. Most consistent with session detail page. | ✓ |
| "Open" — neutral | Says nothing about mode; lets the page communicate. | |
| "View / Edit" — combo | Both modes mentioned; longer button. | |
| Keep as "Edit" — reassess later | Don't change. | |

**User's choice:** "View" + pencil icon.

---

## Pre-session context card scope (Item 6)

### Q1: Relationship to existing client spotlight

| Option | Description | Selected |
|---|---|---|
| EXTEND — single unified context card replaces spotlight | Item 1's `populateSpotlight()` becomes the renderer. | ✓ |
| PARALLEL — keep spotlight; add new "recent sessions" card below | Two distinct UI regions. | |
| FOLD-INTO — spotlight grows new collapsible subsections | Master container with disclosure regions. | |
| You decide | Lean EXTEND. | |

**User's choice:** EXTEND, with explicit content-narrowing.
**Notes (verbatim from user):** "So let's use the extent of the existing one... mainly add the last session date the number of sessions this customer already had and mostly the field of information for next session... skip the open issues and severity trend should not be part of the scope. But we should have some kind of a separation between the customer data like the notes and the age and the photo to the information about the sessions... Maybe some kind of a vertical line that's up to the session or font or something like this."

### Q2: What content does the card show

| Option | Description | Selected |
|---|---|---|
| Last session date + total session count | From `getSessionsByClient()` length + max date. | ✓ |
| "Information for Next Session" from most recent session | The killer field — therapist's note-to-self. | ✓ |
| Open issues list (severity > 0 over past sessions) | Aggregated from `issues[]` arrays. | (out of scope per Q1) |
| Severity trend per open issue | Per-issue mini-trend across history. | (out of scope per Q1) |

**User's choice:** Date + count + last `customerSummary`. Explicit OUT of v1 scope: open issues + severity trend.

### Q3: Display mode

| Option | Description | Selected |
|---|---|---|
| Always-expanded on screen-open; auto-collapse on scroll | Therapist sees full context on open; collapses when scrolling into form. | |
| Always-expanded — never collapses | Maximum density; less form real-estate. | |
| Collapsed by default; tap to expand | Minimal default footprint; explicit reveal gesture. | ✓ |
| Smart-expanded based on content | Empty = hidden; rich = expanded. | |

**User's choice:** Collapsed by default with a clear button to expand and clear title/header.
**Notes:** Reuse `<details class="expandable-field">` pattern from Phase 22.

### Q4: Severity trend visualization

| Option | Description | Selected |
|---|---|---|
| Text timeline — "Anxiety: 8 → 6 → 4 → 2" | Plain text rendering. Lowest cost, RTL-safe. | |
| SVG sparkline | Custom inline chart per issue. | |
| Skip for v1 | Show only current severity, no history. | ✓ |
| Both — text default, sparkline opt-in | Hybrid behind Settings toggle. | |

**User's choice:** Skip entirely — out of v1 scope (consistent with Q1 + Q2 answers).

### Follow-up Q5: Empty state (first session for new client)

| Option | Description | Selected |
|---|---|---|
| Hide session-info subsection — show only customer data | If 0 prior sessions, lower section omitted. | ✓ |
| Show friendly empty state: "First session with this client" | Translatable greeting in lower section. | |
| Hide entire context-card collapsible — show only original spotlight chrome | Card reveals itself for returning clients. | |

**User's choice:** Hide session-info subsection.

### Follow-up Q6: Editable in place?

| Option | Description | Selected |
|---|---|---|
| Read-only display — quote from last session | Just shows text. To change, scroll to current session's field. | ✓ |
| Read-only + copy-to-clipboard icon | Adds copy affordance. | |
| Editable in place — updates previous session's DB record | Risk: silent mutation of past audit trail. | |
| You decide | Lean read-only. | |

**User's choice:** Read-only display.

### Follow-up Q7: Visual separator + section header

| Option | Description | Selected |
|---|---|---|
| Subtle horizontal divider line + subsection header | `border-block-start` + small heading like "Recent activity" / "פעילות אחרונה". | ✓ |
| Background tint difference | Different shade; needs dark-mode token tuning. | |
| Vertical line on inline-start — quote-callout style | Mimics blockquote. | |
| Font weight / size difference only | Typographic hierarchy alone. | |

**User's choice:** Subtle horizontal divider + subsection header.

---

## Snippet engine implementation (Item 3 HOW)

### Q1: IDB storage shape

| Option | Description | Selected |
|---|---|---|
| New dedicated `snippets` object store + bump DB_VERSION | Mirrors Phase 22 D-08 pattern. | ✓ |
| Extend existing `therapistSettings` store with prefixed keys | No DB bump; mixes config + content. | |
| Inline as single JSON blob in `therapistSettings['snippets']` | One key, one blob. Doesn't scale. | |
| You decide | Lean dedicated store. | |

**User's choice:** New dedicated `snippets` store; bump DB_VERSION (Phase 22 ended at v4 → v5 here).

### Q2: Seed-pack source format

| Option | Description | Selected |
|---|---|---|
| Hardcoded `assets/snippets-seed.js` JS module | Zero parse, version-controlled diff readable, SW precaches. | ✓ |
| JSON file `assets/snippets-seed.json` lazy-fetched at migration | Pure data; needs precache + async-at-migration. | |
| Inline inside `db.js` migration function | Bloats db.js to ~2000 lines. | |
| You decide | Lean separate JS module. | |

**User's choice:** `assets/snippets-seed.js`.

### Q3: Autocomplete popover positioning

| Option | Description | Selected |
|---|---|---|
| Fixed-position via Range/getBoundingClientRect (caret-mirror) | Notion-style ~50 LOC; zero new dependency; RTL-aware via logical CSS. | ✓ |
| Anchored to bottom of textarea | Simpler; less visually-tight. | |
| Floating UI library | ~10KB vendor; violates zero-dep stance. | |
| You decide | Lean caret-mirror. | |

**User's choice:** Caret-mirror anchoring.

### Q4: Snippet editor modal layout

| Option | Description | Selected |
|---|---|---|
| 4 tabs (HE/EN/DE/CS) above a single textarea | One language at a time; tab-switching. | |
| Stacked accordion — each language collapsible | All 4 visible by default. | |
| Side-by-side 2×2 grid | Wide screens only. | |
| Single textarea + language dropdown switcher | One field; least feedback about filled locales. | |
| **(User-introduced) Single-language default + "Edit translations" reveal** | Default editor view shows only current app language. A button opens the expanded multi-language view. | ✓ |

**User's choice (refined via free text):** Single-language default + "Edit translations" reveal affordance.
**Notes (verbatim from user):** "the default behavior of editing snippets should be only current language. getting into defining a snippet in other languages should be something outside the regular UI/UX... the default case should be simple - just edit/maintain the current language for the selected snippet."
**Result:** Supersedes the 4-tabs-preselected approach I originally framed in Q4. Locked in CONTEXT.md D-12.

### Q5: Trigger-time locale behavior (re-opened mid-flow)

**Context:** User questioned whether SPEC Req 3's "active app lang wins" was right.

| Option | Description | Selected |
|---|---|---|
| Yes — lock both: SPEC stands + editor uses 4 tabs w/ active-lang preselected | (At this point editor was still 4-tabs; refined later in Q4.) | ✓ |
| Re-open trigger-time: support locale picker at insertion | Modifier key / popover locale chips. | |
| Keep SPEC, but editor different | Trigger-time fine; re-ask modal options. | |

**User's choice:** SPEC stands. Per-trigger locale picker deferred to v2.

### Q6: Import collision behavior

| Option | Description | Selected |
|---|---|---|
| Confirmation modal: Replace All / Skip All / Cancel | Single decision applied to all. Matches SPEC Req 8 default. | |
| Per-trigger Replace / Skip toggle in collision modal | Power user mix-and-match. | ✓ |
| Always Replace; post-import summary | Lowest friction; risky. | |
| Always Skip + toast log | Conservative inverse; silent skip risk. | |

**User's choice:** Per-trigger toggle in collision modal.

### Q7: Reset-to-default for modified seed snippets

| Option | Description | Selected |
|---|---|---|
| Per-row "Reset to default" in editor modal (seeds only) | Restore original Sapir-PDF content per snippet. | |
| Per-row reset + bulk "Reset all modified seeds" in Settings | Plus a bulk action. | ✓ |
| No reset — modifications permanent | Re-import seed pack manually. | |
| Reset via DB nuke only | Deferred to nuclear option. | |

**User's choice:** Per-row + bulk.

### Q8: Settings list search box

| Option | Description | Selected |
|---|---|---|
| Yes — search box at top, filters by trigger + current-lang content | Required quality-of-life for 60+ rows. | ✓ |
| No — rely on tag chips only | Cheaper; risky for memory-by-content lookup. | |

**User's choice:** Yes — and explicitly clarified that the list shows current-app-language content; multi-lang editing happens in the modal only.

### Q9: Tag input UI in editor

| Option | Description | Selected |
|---|---|---|
| Chips with autocomplete suggestions (Pattern A) | Gmail-style chips with type-ahead. | ✓ |
| Comma-separated text input (Pattern B) | Single text box; typo/casing drift risk. | |
| Dropdown picker + "+ new tag" (Pattern C) | Constrains namespace; more clicks. | |
| You decide | Lean Pattern A. | |

**User's choice:** Pattern A (chips with autocomplete).

### Q10: Prefix length (SPEC amendment)

| Option | Description | Selected |
|---|---|---|
| Single character only — keep SPEC as-is | Faster to type; matches Espanso default. | |
| Allow 1–3 chars | `::heart` collision-resistant; edits SPEC Req 2. | |
| Allow any non-letter/digit string up to 8 chars | Maximum freedom; biggest validation surface. | |
| **(User-introduced) Allow 1–2 chars** | Middle ground. | ✓ |

**User's choice (free text):** "allow 1-2 chars."
**Result:** SPEC.md Req 2 + Constraints + Acceptance Criteria #3 amended inline 2026-05-14 to reflect this. Documented in CONTEXT.md D-09 area (actually Req 2 — see SPEC.md).

---

## Claude's Discretion

Areas where the user said "You decide" or deferred to Claude:

- Exact CSS class names + design tokens for snippet UI (popover shadow, modal layout details, tag-chip styling).
- Snippets module file split decision: single `assets/snippets.js` vs `assets/snippets.js` + `assets/snippets-editor.js`.
- Trigger-detection event mechanism (`input` + `selectionchange` vs MutationObserver).
- Snippets store soft-delete vs hard-delete strategy (likely hard-delete for user-added; deletedSeedIds set for seeds).
- Tag canonicalization rules (lowercase-on-save, trim, dedupe within snippet).
- Empty-state for the snippets Settings list (if user manually deletes all 60 seeds).
- Default tags applied to seed snippets (recommend dual-tag: EC cell `ec.a1`...`ec.b6` + organ group `heart-small-intestine`...).
- Item 5 (severity reversal) verification approach.
- Whether `populateSpotlight()` (Item 1) lives in `assets/add-session.js` (module-scope) or `assets/app.js` (cross-page).

## Deferred Ideas

See `24-CONTEXT.md` `<deferred>` section for the full list. Brief recap:
- Per-trigger locale picker at insertion time → v2 if signal emerges
- Open issues + severity trend in pre-session card → v1.2
- Snippet variables / placeholders, expansion in non-session textareas, snippet marketplace, Unicode triggers → v2+
- "View / Edit" combo button, sticky-footer Cancel/Revert layout → discarded alternatives
- Phase 25 owns: backup architectural rework (mailto-no-attachment + 3-button consolidation)
