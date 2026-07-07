# Phase 38: Next session date field with overview column - Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Add an **optional, real date** for the *next* session and surface it in the client overview table.

- A native `<input type="date">` is added inside the existing "Information for Next Session" section of the add/edit-session form (the section that today holds only the `#customerSummary` note textarea).
- The value is stored on the **session record** as a new optional `nextSessionDate` field (`YYYY-MM-DD` string).
- A new **"Next Session" column** is added to the client overview table, mirroring the existing "Last Session" date column.
- The date also appears in the **PDF / markdown export** alongside the next-session note.
- Optional throughout: setting a next date is never required; rows/sessions without one render empty, exactly as Last Session does.

This phase builds directly on Phase 37, which shipped every touch-point it needs: the canonical local-time date engine (`window.DateFormat` / `App.formatDate`), the native date-input pattern, the `portfolioDateFormat` personalization setting, and the RTL/locale-aware overview date-column formatter.

**Explicitly NOT this phase:**
- Any new capability beyond storing + displaying a single optional next-session date (no scheduling, reminders, calendar sync, or recurrence).
- Changing how the existing next-session *note* (`customerSummary`) works.
- A separate settings control — the new date inherits the existing `portfolioDateFormat` format automatically.

</domain>

<decisions>
## Implementation Decisions

### Overview column
- **D-01 — Data source: most-recent session's `nextSessionDate`.** Per client row, show `clientSessions[0].nextSessionDate` (`clientSessions[0]` is already the most-recent session, sorted descending by date at `overview.js:616–626`). This is the exact mirror of how Last Session derives from `clientSessions[0]?.date` (`overview.js:630`). Meaning: "the next appointment planned at the client's most recent visit." If the latest session left it blank, the cell is blank — **even if an older session had one**. Intentionally NOT "soonest upcoming date across all sessions."
- **D-02 — Placement: immediately after "Last Session".** Column order becomes: Name, Type, Sessions, Last Session, **Next Session**, Actions. Header markup added to `index.html` (~:174–176) **and** `demo.html`. Cell uses `data-label` = new i18n key `overview.table.nextSession`. Value formatted via `App.formatDate` (inherits `portfolioDateFormat`, RTL/locale-aware).
- **D-03 — Sortable, ascending-first.** Add a new `nextSession` sort key to `SORT_DEFAULT_DIR` (`overview.js:260`) with default direction **`ascending`** (soonest-due floats to the top — opposite of Last Session's `descending`). Header gets `class="sortable" data-sort-key="nextSession"` + sort-arrow, mirroring the Last Session `<th>`. Wire into the column-header ↔ `#clientSortSelect` two-way sync (`overview.js:442–500`); add a matching select option. **Empty/missing next-dates sort to the BOTTOM regardless of direction** — Last Session's blank handling won't transfer verbatim (empty strings sort first under ascending `localeCompare`), so blanks must be special-cased to the end.

  - **D-03-R1 — Revision (2026-07-07): blank next-dates TRAVEL WITH the sort direction.** During Phase 38 UAT (test 3) Ben tested the shipped behavior (blanks pinned to the bottom under BOTH directions) and found it unintuitive versus Last Session: with a single dated row among mostly-blank rows, toggling the Next Session sort never visibly moved the dated row — unlike the Last Session toggle a therapist already knows. **New rule:** a blank next-date sorts to the **bottom under ascending** (the default resting view, so blanks never bury dated rows) and to the **top under descending** — i.e. blanks travel WITH the direction, mirroring the Last Session experience. **Mechanism:** instead of early-returning blanks to the bottom, a blank is substituted with a far-future sentinel (`9999-12-31`) before `localeCompare`, so it rides the shared `dir * base` flip. This **SUPERSEDES** the original "Empty/missing next-dates sort to the BOTTOM regardless of direction" clause above.
- **D-04 — Subtle overdue hint.** When a row's `nextSessionDate` is **before today** (local time, via `window.DateFormat.parseLocal` vs a today-local helper), the cell gets a subtle muted / marker cue so a therapist notices a lapsed plan at a glance. "Past" = strictly `< today`; today itself is not overdue. Empty cells render as `-` (mirroring Last Session at `overview.js:630`) with no hint. Must be RTL/locale-safe.

### Session record + form field
- **D-05 — New optional field `nextSessionDate` on the session record.** Stored as a `YYYY-MM-DD` string (same shape as `date` / `birthDate`). The session store is schemaless IndexedDB (`PortfolioDB.addSession` / `updateSession`) → **no migration**; existing sessions simply lack the key and render blank. Add it to the update payload (`add-session.js:~1136`) and add payload (`~1155`), populate on edit (near `~1657–1664`, where `customerSummary` is populated), and reset on new/clear.
- **D-06 — Native `<input type="date">`, not free text.** Mirrors the existing session-date input and the Phase 37 birthdate input. Value is always `YYYY-MM-DD` → can't be malformed. Zero custom entry JS.
- **D-07 — Field placement: below the note.** Inside the existing `data-section-key="nextSession"` section, the `#customerSummary` note textarea **stays where it is**; the date input is added **below** it. New element id (e.g. `#nextSessionDate`). Label via a new i18n key in the `session.form.*` family, translated across EN/HE/DE/CS.
- **D-08 — Dynamic `min` = the session's own date.** The date input's `min` attribute is set to the current value of the session-date field (`#sessionDate`), so a next-session date **cannot precede the session it belongs to**. Same-day is allowed (`>=`). `min` updates if the session date changes (set at populate + on `sessionDate` change). When the session date is empty, leave `min` unset until a session date is chosen. This is NOT `min=today` — it's relative to the session record's own date.

### PDF / markdown export
- **D-09 — Include the date in the export.** In the "Information for Next Session" block of the export (markdown render in `export-modal.js` ~:208/:410; `pdf-export.js` session-card render), render the `nextSessionDate` next to the `customerSummary` note, formatted via `window.DateFormat` (locale/RTL-aware, honoring `portfolioDateFormat`). Follows the **same per-section include-toggle** as the note (Step 1 of the export modal): if the `nextSession` section is excluded, both note and date are omitted. If the note is empty but a date exists (or vice-versa), still render whichever is present.
- **D-10 — Golden baselines regenerated deliberately.** Adding the date to PDF/markdown output changes fixtures for any session that has a next-session date. Per Phase 37 discipline (37-CONTEXT D-19/D-20) and MEMORY `reference-pdf-jsdom-inert-gates`, the planner MUST flag the baseline change as intentional and instruct the executor to **regenerate SHA-256 fixtures with real output verification — not force-pass, not exit-code-only.**

### Backup / restore
- **D-11 — Automatic; no new backup code.** `nextSessionDate` is a field on the session record, and sessions are exported/restored as whole objects in the ZIP backup — so the new field rides along with zero changes to `backup.js` (unlike a separate localStorage key such as `portfolioDateFormat`). Planner should spot-check that session export is wholesale, but expect no code change here.

### Demo consistency
- **D-12 — Demo parity.** `demo.html` gets the same Next Session column/header; `demo-seed-data.json` gets a couple of `nextSessionDate` values on recent seeded sessions so the demo column looks populated (the seed notes already read e.g. "Next session in 10 days"). Seed dates should be near-future relative to their session dates so the demo doesn't render as all-overdue.

### Claude's Discretion
- Exact i18n key names (`overview.table.nextSession`, the `session.form.*` label) following existing key families; translate across EN/HE/DE/CS.
- Exact overdue-hint styling (dimmed text vs. small marker vs. both) — keep it subtle and RTL/locale-safe. May warrant a quick `/gsd-ui-phase` pass since it's a new visual treatment.
- Exact new field id and how `min` is wired (populate-time + `change` listener on `#sessionDate`).
- Whether to add a `#clientSortSelect` option label for the new `nextSession` sort key (recommend yes, for parity with the other sortable columns).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 37 foundation (PRIMARY — the plumbing this phase reuses)
- `.planning/phases/37-date-consistency-date-format-setting-f6-f5/37-CONTEXT.md` — the date engine, native date-input pattern, `portfolioDateFormat`, and overview date-column decisions this phase builds directly on
- `assets/date-format.js` — `window.DateFormat`: `parseLocal("YYYY-MM-DD")` (LOCAL, no UTC off-by-one) + format honoring `portfolioDateFormat`. Use for every next-date parse/format: overview cell, the overdue `< today` comparison, and the PDF/markdown date.

### Core files — session form + model
- `assets/add-session.js` — next-session section field read (`~:1114` `customerSummary`), save payloads (update `~:1136`, add `~:1155`), edit populate (`~:1657–1664`), field default/reset. Add `nextSessionDate` in these paths.
- `add-session.html` — the "Information for Next Session" section (`data-section-key="nextSession"`) holding `#customerSummary`; add the `<input type="date">` **below** the textarea.
- `assets/db.js` — `window.PortfolioDB.addSession` / `updateSession`; schemaless session store, new field needs no migration.

### Overview table
- `assets/overview.js` — client-row renderer (`~:628–697`; `lastSession` at `:630`, `lastSessionCell` `:667–669`), sort config (`SORT_DEFAULT_DIR` `:260`, sort handling `:299–305`), header ↔ `#clientSortSelect` two-way sync (`:442–500`). Add the Next Session column, `nextSession` sort key, and overdue hint.
- `index.html` — overview `<thead>` (`~:165–178`; Last Session `<th>` at `:174–176`). Add the Next Session `<th class="sortable" data-sort-key="nextSession">`.
- `demo.html` — same overview table structure; add the matching column.
- `assets/demo-seed-data.json` — seeded session objects (`customerSummary` notes at `~:125` / `~:151`); seed a few `nextSessionDate` values (D-12).

### PDF / markdown export
- `assets/export-modal.js` — markdown render + section include-toggles (`~:63`, `:143`, `:208`, `:410` handle `customerSummary`); render `nextSessionDate` in the `nextSession` block.
- `assets/pdf-export.js` — PDF session-card render; add the date to the Information-for-Next-Session block, formatted via `window.DateFormat`.
- `tests/34-date-locale.test.js` + PDF golden-fixture tests — regenerate deliberately with real output (D-10). `tests/_helpers/jsdom-pdf-env.js` already injects `window.DateFormat` (from Phase 37).

### i18n
- `assets/i18n-en.js` / `i18n-he.js` / `i18n-de.js` / `i18n-cs.js` — add `overview.table.nextSession` (mirror `overview.table.lastSession`, en `:174`) and the form-field label in the `session.form.*` family (mirror `session.form.nextSession`, en `:135`).

### Memory references
- MEMORY `reference-pdf-jsdom-inert-gates` — PDF jsdom tests can hang→exit-0 silently (false-GREEN); verify real output, not exit code (D-10).
- MEMORY `feedback-behavior-verification` — falsifiable behavior tests BEFORE implementation; TZ-pin the overdue/`today` comparison test.
- MEMORY `reference-rtl-select-value-alignment-headless` + `reference-webkit-chromium-svg-visual-verification` — RTL + WebKit visual gotchas relevant to the new column cell and the overdue marker.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `window.DateFormat` (`parseLocal` + format) — one module for the overview cell, the overdue `< today` comparison, and the PDF/markdown date. No new date logic.
- Existing `<input type="date">` (session date; Phase 37 birthdate) — copy the shape for the next-date input.
- Last Session column mechanics (`overview.js:630`, `:667–669`; `index.html:174–176`) — the exact template to mirror for the new column.
- Sort machinery: `SORT_DEFAULT_DIR` (`overview.js:260`), `getSortHeaders` + `#clientSortSelect` sync (`:442–500`) — extend with a `nextSession` key.
- `portfolioDateFormat` (Phase 37) — the new column/date auto-inherit the user's chosen format; no new setting needed.

### Established Patterns
- Session records are schemaless objects in IndexedDB → additive field, **no migration**.
- All calendar dates stored as `YYYY-MM-DD` strings (`date`, `birthDate`) → `nextSessionDate` matches.
- Per-section export include-toggles (export modal Step 1) gate what renders in PDF/markdown.
- i18n key families (`overview.table.*`, `session.form.*`) across 4 languages (EN/HE/DE/CS).
- Window-IIFE modules; zero-dependency vanilla JS in production.

### Integration Points
- add-session save/edit payloads (`add-session.js:~1136` / `~1155` / `~1657–1664`).
- Overview row render + sort + header (`overview.js` / `index.html` / `demo.html`).
- Export nextSession block (`export-modal.js` + `pdf-export.js`) + golden baselines.
- `demo-seed-data.json` (seed values).
- Backup/restore: **automatic** (field on the session object) — verify wholesale export only.

</code_context>

<specifics>
## Specific Ideas

- **Overdue definition:** `nextSessionDate` strictly before today (local). Today itself is not overdue. Empty → `-`, no hint.
- **Picker `min`:** the session's OWN stored `date` (dynamic), NOT today — a next date can't precede its own session; same-day allowed.
- **Column source:** most-recent session only (`clientSessions[0]`); intentionally NOT the soonest-future-across-all-sessions.
- **Empty next-dates sort to the bottom** regardless of sort direction.
- **Demo seed dates** should be near-future relative to their seeded sessions so the demo column reads naturally (not all overdue).
- **Field order in the section:** note first, date below (keeps the current section layout, date is the structured add-on).

</specifics>

<deferred>
## Deferred Ideas

None new from this discussion — it stayed within phase scope. (The PDF/markdown inclusion is IN scope per D-09, not deferred.)

*Note:* the todo auto-matcher surfaced 20 low-confidence (0.6) keyword matches, none of which concern a next-session-date field — all screened out as keyword noise; none folded.

</deferred>

---

*Phase: 38-next-session-date-field-with-overview-column*
*Context gathered: 2026-07-06*
