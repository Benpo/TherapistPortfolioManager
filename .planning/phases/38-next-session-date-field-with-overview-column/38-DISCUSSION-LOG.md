# Phase 38: Next session date field with overview column - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-06
**Phase:** 38-next-session-date-field-with-overview-column
**Areas discussed:** Overview column source, Column & sorting, Past-date & empty, Form field & PDF export

---

## Overview column source

| Option | Description | Selected |
|--------|-------------|----------|
| Most-recent session's | Show `nextSessionDate` from the client's latest session (`clientSessions[0]`) — exact mirror of Last Session. | ✓ |
| Soonest upcoming date | Scan all sessions, show the earliest future next-date. Diverges from the Last-Session mirror; adds logic. | |
| You decide | Default to most-recent (mirrors Last Session, trivial code). | |

**User's choice:** Most-recent session's
**Notes:** Consistency with the existing Last Session mechanic won. If the latest session has no next-date, the cell is blank even when an older session had one.

---

## Column & sorting

| Option | Description | Selected |
|--------|-------------|----------|
| After Last, sortable | Order: Name, Type, Sessions, Last Session, Next Session, Actions. Sortable ascending-first (soonest-due on top). | ✓ |
| After Last, display-only | Same placement, non-sortable plain column. Less code. | |
| You decide | after-Last + sortable ascending-first. | |

**User's choice:** After Last, sortable
**Notes:** Ascending-first surfaces who's coming up next. Empty next-dates sort to the bottom regardless of direction (captured as an implementation note — Last Session's blank handling doesn't transfer verbatim).

---

## Past-date & empty

*(Two sub-questions asked together.)*

### Picker range

| Option | Description | Selected |
|--------|-------------|----------|
| Allow any date | No min/max; fully flexible. | |
| Future-only (min=today) | `min=today` blocks past dates. | |
| **User refinement** | `min` = **this session's own stored date** — the next date just can't be before the session it's attached to (same-day allowed). Not `min=today`. | ✓ |

**User's choice:** Future-only, but relative to the session's own date (free-text refinement)
**Notes:** "min=this session's date, as it's stored on session level. so future session just cant be in the past compared to existing one." Dynamic constraint — keys off `#sessionDate`, updates if the session date changes.

### Overdue look

| Option | Description | Selected |
|--------|-------------|----------|
| Plain, same as any date | Render every next-date identically. Zero new styling. | |
| Subtle overdue hint | Muted / marker cue when the date is before today, so a lapsed plan is noticeable. | ✓ |

**User's choice:** Subtle overdue hint
**Notes:** Overdue = date strictly before today (local); today is not overdue; empty = `-` with no hint. Must stay RTL/locale-safe.

---

## Form field & PDF export

*(Two sub-questions asked together.)*

### Field layout

| Option | Description | Selected |
|--------|-------------|----------|
| Date above note | Date picker first, note textarea below. | |
| Note above date | Keep the note textarea, add the date picker below it. | ✓ |
| You decide | date-above-note. | |

**User's choice:** Note above date
**Notes:** Minimal disruption to the current section; date is a secondary structured add-on under the note.

### PDF export

| Option | Description | Selected |
|--------|-------------|----------|
| Overview-only (roadmap scope) | Date stays in form + overview; not exported. Tightest scope. | |
| Include in export too | Date appears alongside the note in the PDF/markdown block. Expands into export-modal.js + pdf-export.js + golden baselines. | ✓ |

**User's choice:** Include in export too
**Notes:** Golden baselines must be regenerated deliberately with real-output verification (per Phase 37 PDF discipline). Follows the same per-section export include-toggle as the note.

---

## Claude's Discretion

- Exact i18n key names (`overview.table.nextSession`, the `session.form.*` label), translated EN/HE/DE/CS.
- Exact overdue-hint styling (dim vs. marker vs. both) — subtle, RTL/locale-safe; may warrant a quick `/gsd-ui-phase` pass.
- Exact new field id and how `min` is wired (populate-time + `change` listener on `#sessionDate`).
- Whether to add a `#clientSortSelect` option for the new `nextSession` sort key (recommend yes).

## Deferred Ideas

None new — discussion stayed within phase scope. The PDF/markdown inclusion is in-scope (D-09), not deferred. The todo auto-matcher surfaced 20 low-confidence keyword matches, none relevant to a next-session-date field; none folded.
