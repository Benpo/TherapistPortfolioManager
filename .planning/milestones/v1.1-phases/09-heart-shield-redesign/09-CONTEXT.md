# Phase 9: Heart Shield Redesign - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Move Heart Shield (מגננת הלב) tracking from a client-level flag to session-level toggles with removal tracking, visual indicators in the clients table, and a session type filter on the sessions page. No new clinical fields — existing session form fields (Important Points, Comments, etc.) cover additional notes.

</domain>

<decisions>
## Implementation Decisions

### Session Form Toggle
- Toggle switch at the top of the session form, below client name and date, before all other fields
- Label: "מפגש מגננת לב" (Heart Shield session)
- Default: off
- When toggled on: reveals a required "המגננה הוסרה?" (Shield removed?) yes/no radio field
- No additional fields inside the Heart Shield section — existing form fields (Insights, Important Points, Comments) cover session notes
- Validation: cannot save a Heart Shield session without answering "המגננה הוסרה?" — blocks save with visible error message

### Client Table Indicators
- 3 states based on session data (NOT a client-level flag):
  - **No icon**: client has never had a Heart Shield session
  - **❤️ (red heart)**: client has at least one Heart Shield session where the shield was NOT removed — "מגננה פעילה"
  - **✅ (checkmark)**: ALL of the client's Heart Shield sessions have shield marked as removed — "מגננה הוסרה"
- Icon appears next to client name in the clients table (same position as existing ♥ badge)
- Tooltip on hover: "מגננת לב פעילה" or "מגננת הלב הוסרה"
- Status is computed from sessions, not stored on client record

### Session Type Filter
- Dropdown on sessions page, next to existing filters (client, date range)
- 3 options: "הכל" (all) / "מגננת לב" (Heart Shield) / "רגיל" (regular)
- Default: "הכל"

### Sessions Table Column
- Keep existing Heart Shield column in sessions table
- Update content: show "פעילה" badge for heart shield sessions where shield not removed, "הוסרה" badge where removed, "−" for regular sessions

### Data Migration
- No existing Heart Shield data in the database — migration is clean
- Add new session fields: `isHeartShield` (boolean), `shieldRemoved` (boolean)
- Remove old client-level `heartWall` flag (unused, no data)
- Remove old session-level `heartWallCleared` field (unused, no data)
- Rename all code references from "heartWall" to "heartShield"

### Claude's Discretion
- Toggle switch visual design (CSS styling)
- Exact badge styling for "פעילה" / "הוסרה" in sessions table
- DB migration version number
- How to compute client Heart Shield status efficiently (query strategy)
- i18n key naming conventions for new strings
- Icon rendering approach for ❤️ and ✅ (emoji vs SVG — existing code uses text emoji)

</decisions>

<specifics>
## Specific Ideas

- The feature is called "מגננת הלב" (Heart Shield), NEVER "Heart Wall" — both in UI and in code variable names
- Toggle should be prominent and clear — this is an important clinical distinction
- Sapir emphasized that the session form already has enough fields for documentation — no need to duplicate note-taking inside the Heart Shield section
- The "השם הוסרה?" validation is strict — therapists must document whether the shield was removed in every Heart Shield session

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `assets/overview.js` line 222: existing `heart-badge` span rendering pattern — reuse for new indicator
- `assets/sessions.js` line 117-125: existing `heartwall-badge` rendering in sessions table — update to new model
- `assets/reporting.js` line 19: existing Heart Shield cleared counter — update to use new field names
- Toggle card pattern: `setupToggleGroup()` in existing code — could be reused for yes/no radio

### Established Patterns
- DB migrations: `MIGRATIONS[version]` pattern in `db.js` — currently at version 2, Phase 9 adds version 3
- i18n: `App.t("key")` + `data-i18n="key"` attribute — all new labels need keys in 4 languages
- Validation: existing pattern in `add-session.js` shows toast on validation failure
- Badge styling: `.heartwall-badge` class exists in `app.css` — update/extend

### Integration Points
- `assets/db.js`: Add migration version 3 — new session fields, remove old client/session fields
- `assets/add-session.js`: Add toggle + conditional "removed?" field + validation
- `assets/overview.js`: Update client name rendering to compute status from sessions
- `assets/sessions.js`: Add filter dropdown, update Heart Shield column rendering
- `assets/reporting.js`: Update Heart Shield cleared counter to use new field names
- `assets/i18n-*.js` (all 4 languages): New keys for toggle label, removed question, filter options, badges, tooltips
- `sessions.html`: Add filter dropdown element
- `assets/app.css`: Styles for toggle, conditional section, updated badges

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-heart-shield-redesign*
*Context gathered: 2026-03-19*
