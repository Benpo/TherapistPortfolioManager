# Phase 37: Date consistency + date-format setting (F6+F5+F4) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-02
**Phase:** 37-date-consistency-date-format-setting-f6-f5
**Areas discussed:** Scope, F5 setting placement, Birth-date entry, Secondary-sweep scope, F5 labels & i18n, F4 session types, F4 migration & editor UI, PDF date behavior

---

## Scope

The session opened with the handoff documents pre-loaded (PLAN-PROPOSAL + DISCUSS-HANDOFF + UAT-TRIAGE). The original handoff scoped Phase 37 to F6 + F5. During the F5 placement discussion, Ben requested expansion.

| Option | Description | Selected |
|--------|-------------|----------|
| F6 + F5 only (original) | Date bug fix + date-format setting. Smaller, lower-risk. | |
| F6 + F5 + F4 | Add session-type management in the same new Personalization Settings tab. | ✓ |
| F6 + F5 + F4 + F1 + F9 | Also add snippets discoverability + Heart Shield emotion badge. | |

**User's choice:** F6 + F5 + F4  
**Notes:** F4 was already re-framed as "Settings-managed" in the triage. Putting F5 and F4 together in a new Personalization tab makes a coherent deliverable — one new tab, two settings. F1 and F9 are UX polishes on separate features; cleaner as quick tasks.

---

## F5 Setting Placement

Ben requested a quick mockup before deciding. Three options were mocked up in ASCII in the chat.

| Option | Description | Selected |
|--------|-------------|----------|
| Near globe/theme controls — `<select>` in header | Compact select beside existing language globe and theme toggle | |
| Calendar icon + popover in header | Floating picker opened by a calendar icon | |
| Inside the globe dropdown menu | Date format as sub-option under the language menu; no new header icon | |
| New Settings "Personalization" tab | Both F5 and F4 grouped in a dedicated tab; no header change | ✓ |

**User's choice:** New Settings "Personalization" tab (or "Customization"/"General")  
**Notes:** Ben arrived at this decision after seeing the mockups — the tab approach is cleaner because F4 (session types) can live alongside F5 date format in the same dedicated section, rather than cluttering the header.

---

## Birth-date Entry (D5 — 3 dropdowns)

| Option | Description | Selected |
|--------|-------------|----------|
| Reorder existing dropdowns to match chosen format | Keep 3 selects; reorder month/day when format is day-first | |
| Always Month/Day/Year, no reorder | Dropdowns stay fixed; entry doesn't match display format | |
| Replace with `<input type="date">` | Single native date picker; always YYYY-MM-DD; browser handles locale | ✓ |
| Skip this change | Leave birth-date entry unchanged; this phase affects display only | |

**User's choice:** Native `<input type="date">`  
**Notes:** Ben asked "can we have another picker and not simple dropdown?" — confirmed native date input as the answer. Clean, zero custom JS, consistent with the existing session-date field.

---

## Secondary-Sweep Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Core only | 5 display/input sites that cause the visible off-by-one | |
| Core + month-boundary | Fix `countSessionsThisMonth` too (real dashboard miscount) | |
| Core + month-boundary + age math | Also fix birthDate/age UTC-parse across all files | |
| Full sweep — everything | Every UTC-parse of a calendar date: display, age, sort, backup filename, all | ✓ |

**User's choice:** Full sweep — everything  
**Notes:** Ben chose the most complete option. The canonical helper becomes the only path; agent verification at the end confirms zero remaining UTC-parse of calendar dates.

---

## F5 Labels & i18n

**Separator style:**

| Option | Description | Selected |
|--------|-------------|----------|
| Slash for US/EU, dot for DE/CS | Locale-appropriate separators: / for EN/HE, . for DE/CS | |
| Slash everywhere | All numeric formats use / regardless of locale | ✓ |
| Claude decides per locale | Agent picks conventional separator per language | |

**Hebrew RTL rendering:**

| Option | Description | Selected |
|--------|-------------|----------|
| LTR-wrapped (`<bdo dir="ltr">`) | Numeric dates always left-to-right inside RTL Hebrew UI | ✓ |
| Let browser handle it | May render in wrong order (07/2026/02) in strong-RTL context | |
| Claude decides | Agent picks based on existing app RTL patterns | |

**User's choices:** Slash everywhere; Hebrew numeric dates LTR-wrapped  
**Notes:** Consistent separators simplify the i18n work — no per-locale logic needed for the option labels.

---

## F4 Session Types — Default List

Initial discussion surfaced that the stored value is `clinic` but the displayed label is "In-person". Ben noted uncertainty about Online vs Remote distinction. Agent recommendation: keep both since they are meaningfully different in EC/BC practice (Online = live Zoom call; Remote = offline/distant work, client not on the line).

| Option | Description | Selected |
|--------|-------------|----------|
| 5 types: In-person, Online, Remote, Proxy, Other | Keep 3 existing + add Remote + Proxy | ✓ |
| 4 types: skip Remote | Merge Remote into Online or Proxy | |
| 3 defaults + Proxy (minimal) | Ship only existing 3 + Proxy; user adds Remote if needed | |

**User's choice:** 5 locked defaults (In-person/`clinic`, Online/`online`, Remote/`remote`, Proxy/`proxy`, Other/`other`)  
**Notes:** Ben confirmed after agent explained the Online vs Remote distinction clearly (Online = Zoom; Remote = proxy/distance work client not present). All 5 are locked.

---

## F4 Migration & Data Protection

| Option | Description | Selected |
|--------|-------------|----------|
| Locked & renameable | Built-in keys are permanent but display label is editable | ✓ |
| Locked & not renameable | Fixed labels from i18n, no user override | |

**User's choice:** Locked & renameable  
**Notes:** Ben confirmed this — and also surfaced the constraint that existing sessions must keep working, so the 3 existing stored keys (`clinic`/`online`/`other`) can never be deleted. Custom-added types can be deleted (but existing sessions that reference a deleted custom type degrade gracefully, showing the raw string).

---

## F4 Editor UI

| Option | Description | Selected |
|--------|-------------|----------|
| Full management UI like snippets | List with inline rename + lock icon (locked) or delete button (custom) | ✓ |
| Simple list + Add button | No inline rename; just add | |
| Claude decides | Follow settings-snippets.js pattern | |

**User's choice:** Full management UI (snippet editor pattern) with two-tier affordances  
**Notes:** Ben noted "we can't 1:1 the snippet editor since we can't remove defaults" — clarified: locked types show lock icon (no delete), custom types show delete button. Same add/rename/delete logic, different per-row affordance.

**Rename scope:**

| Option | Description | Selected |
|--------|-------------|----------|
| Global — same label in all languages | One label override stored, language-agnostic | ✓ |
| Per-language rename | Four label fields per type | |

**User's choice:** Global rename  
**Notes:** Simpler storage, consistent with how snippets work.

---

## PDF Date Behavior

Ben asked: "I hope the date change is not 'must' — if they pick DD/MM/YYYY they won't see 'Jul 2, 2026' right?"

**Clarification logged (not a new decision):** Correct — the user's chosen format applies to ALL date display surfaces including the PDF. The canonical helper takes a format param; every call site (UI, browser title, PDF card, PDF footer "Exported on") passes the user preference. The en-GB → en-US baseline change only affects the **default "Auto" behavior for English** — the baseline tests had en-GB baked in and will be regenerated to reflect the new en-US default. Nothing is forced.

---

## Claude's Discretion

- Personalization tab i18n key names — follow existing `settings.*` key families
- Session-type list storage mechanism — localStorage vs IndexedDB; planner picks based on backup-restore compatibility (see D-17 in CONTEXT.md)
- Exact `portfolioDateFormat` key values — planner picks short machine-readable strings
- Personalization tab name — "Personalization" / "Customization" / "General"; planner picks
- F4 type order in the list — recommend: In-person, Online, Remote, Proxy, Other, then custom types below

## Deferred Ideas

- F1 (snippets discoverability) — separate quick task
- F2 (rich text notes) — deferred, scope decision pending
- F3 (clock-button label) — separate quick task, handoff already written
- F7 (PDF overlap) — awaiting photo; likely deploy-only
- F8 (Heart Shield workflow) — guidance-only, no build
- F9 (Heart Shield badge emotions) — separate quick task
- F10 (document storage) — dropped
- Batch-3 code comments for `backup.js`/`app.js`/`pdf-export.js` — deferred from Phase 36; would conflict with this phase's edits to those files
- Per-language type-label renames — evaluated and deferred as too complex/unlikely to be used
