# Phase 37: Date consistency + date-format setting (F6+F5+F4) - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Three interrelated features shipped together as one phase, anchored in a new **Personalization** Settings tab:

1. **F6 — Date consistency fix (bug):** Every calendar-date parse/format in the app flows through one canonical local-time helper. Eliminates the UTC-midnight off-by-one that causes back-dated sessions to show the wrong day in the UI, browser title, and PDF for users in negative-UTC timezones.
2. **F5 — Date-format setting (feature):** A user-selectable date presentation preference (6 options incl. numeric), surfaced in the new Personalization tab, stored in `localStorage["portfolioDateFormat"]`, included in backup/restore.
3. **F4 — Session-type management (feature):** Move session types from 3 hardcoded radio cards to a Settings-managed list with 5 locked defaults + user-addable custom types, also surfaced in the Personalization tab.

**Explicitly NOT this phase:**
- F1 (snippets discoverability hint) — separate quick task
- F2 (rich text in note boxes) — deferred
- F3 (clock-button "View sessions" label) — separate quick task (handoff already written)
- F7 (PDF severity overlap) — awaiting photo; likely deploy-only
- F8 (Heart Shield workflow guidance) — guidance-only, no build
- F9 (Heart Shield badge emotions) — separate quick task
- F10 (document storage) — dropped
- Any behavior change beyond what the canonical date helper unifies and what the Personalization tab adds

</domain>

<decisions>
## Implementation Decisions

### Canonical date helper (F6 — locked from prior session, not re-litigated)
- **D-01 — Local calendar-date model.** Session `date` / client `birthDate` are `YYYY-MM-DD` strings (already the storage format → **no data migration**). Parse & format **local** everywhere; delete all UTC-parse of calendar dates.
- **D-02 — One canonical helper: `assets/date-format.js`.** New IIFE module. Core logic: regex-extract leading `\d{4}-\d{2}-\d{2}` → `new Date(y, m-1, d)` (LOCAL, not UTC) → `Intl.DateTimeFormat` with the user's chosen format. Regex-extract also safely handles any legacy full-ISO `date` value (back-compat). Loaded before `app.js` and `pdf-export.js`; a new `<script>` tag on every HTML page.
- **D-03 — Full UTC-parse sweep.** Every UTC-parse of a calendar date in the codebase goes through the canonical helper — not just the core display path. This includes: core display sites (`app.js:942`, `sessions.js:92`, `overview.js:382/487`, etc.), input default (`add-session.js:516` `.valueAsDate`), `countSessionsThisMonth` month-boundary miscount (`overview.js:568` — real bug), sort tie-breaks (`overview.js:723`, `add-session.js:1369`), birthDate/age math (`add-client.js:202`, `add-session.js:473/1027/1428`, `overview.js:620`), and backup filename UTC-vs-local inconsistencies (`backup.js:731/827` vs `:623`). Agent sweep at verification time: zero remaining UTC-parse of calendar dates app-wide.
- **D-04 — English default = US month-first.** `en` → "Jul 2, 2026" (en-US). This unifies the current split: UI was en-US, PDF was en-GB ("2 July 2026"). PDF golden baselines for English will change — regenerated deliberately and visually reviewed (not force-passed). See MEMORY: `reference-pdf-jsdom-inert-gates`.

### Date-format setting (F5)
- **D-05 — 6 format options.** Auto (follow language) / Month Day, Year ("Jul 2, 2026") / Day Month Year ("2 Jul 2026") / MM/DD/YYYY / DD/MM/YYYY / YYYY-MM-DD.
- **D-06 — Slash separators everywhere.** All numeric formats use `/` as separator in option labels across all 4 languages (EN/HE/DE/CS). No locale-specific dot or dash separators in the picker UI.
- **D-07 — Hebrew numeric dates: LTR-wrapped.** Numeric date strings in the Hebrew RTL layout are wrapped in `<bdo dir="ltr">` (or a Unicode LTR mark) so they render left-to-right and don't flip.
- **D-08 — Applies to all date display surfaces.** The user's chosen format is used in: session list, overview/dashboard, browser tab title, PDF session card date, and PDF footer "Exported on" date. The canonical helper receives a format param; every call site passes the user preference.
- **D-09 — `portfolioDateFormat` in localStorage.** Read/write pattern mirrors `portfolioLang` / `portfolioTheme`. Default value when not set: `"auto"` (follow language). Included in backup export/restore (like `portfolioLang`).

### F5 placement — Personalization Settings tab
- **D-10 — New "Personalization" Settings tab.** The date-format picker (F5) and session-type list editor (F4) both live in a new "Personalization" tab in the Settings page. No new control in the header/nav.
- **D-11 — Tab name.** "Personalization" (or "Customization" / "General" — planner picks the label that fits best with the existing tab naming; must be translated across all 4 languages).

### Birth-date entry (D5 — coupled to F5)
- **D-12 — Replace 3 birthdate dropdowns with `<input type="date">`.** The existing 3 separate `<select>` dropdowns for month/day/year (`app.js:1272–1359`) are replaced with a single native `<input type="date">`. Value is always `YYYY-MM-DD` (matches existing storage format → no data migration). Consistent with the session-date field which already uses `<input type="date">`. Browser handles locale ordering. Zero custom JS needed for the entry UI.

### Session-type management (F4)
- **D-13 — 5 locked defaults shipped.** The default session-type list:

  | Display label (default) | Stored key | Status |
  |---|---|---|
  | In-person | `clinic` | Locked (existing) |
  | Online | `online` | Locked (existing) |
  | Remote | `remote` | Locked (new) |
  | Proxy | `proxy` | Locked (new) |
  | Other | `other` | Locked (existing) |

  "Remote" = offline/distant work, client not on a live call. "Online" = live video/voice call (Zoom etc.). These are distinct in EC/BC practice.

- **D-14 — Migration: 3 existing keys stay locked.** Sessions already in the database store `clinic`, `online`, or `other` as their type string. These 3 keys are **permanently locked** — they resolve correctly forever. The 2 new keys (`remote`, `proxy`) are added as locked defaults; no existing session references them (no migration needed). Custom types the user adds later may be deleted; locked defaults cannot.

- **D-15 — Full management UI, two-tier.** Session-type editor in the Personalization tab mirrors the snippet editor pattern (modeled on `assets/settings-snippets.js`) with one key difference:
  - **Locked defaults** (the 5 built-in types): show a rename field + **lock icon** (no delete button). Label is editable.
  - **Custom types**: show a rename field + **delete button**. User-added types are removable.
  - Add-new input at the bottom of the list.
  - Sessions store the type as a string (the stored key, not the display label).

- **D-16 — Renames are global.** A renamed label (e.g. "In-person" → "Face-to-face") overrides the i18n string app-wide, across all languages. Stored as a user-override string per type, language-agnostic. This matches how snippets work.

- **D-17 — Session-type list storage: planner decides.** Options: localStorage (as JSON array, simple, aligned with `portfolioLang`/`portfolioTheme`) or IndexedDB (consistent with snippets/text). **Must be included in backup export/restore regardless of choice.**

- **D-18 — Graceful fallback for unknown types.** If a session references a type string that no longer maps to any entry in the list (e.g., a deleted custom type), display the raw string as-is in the UI. No crash, no data loss.

### PDF golden baselines
- **D-19 — Baselines regenerated deliberately.** The English PDF format changes from en-GB ("2 July 2026") to en-US ("Jul 2, 2026") for the "Auto" default. The `tests/34-date-locale.test.js` file asserts the old behavior and must be rewritten to assert the fixed behavior. Golden baselines for SHA-256 fixture tests are regenerated with real output verification (not force-passed). See MEMORY: `reference-pdf-jsdom-inert-gates`.

### Tests
- **D-20 — TZ-pinned behavior tests.** A new test file pins `process.env.TZ = 'America/New_York'` at the top (isolated per-process). Falsifiable test: `App.formatDate('2026-07-02')` currently returns "Jul 1" in that timezone — after the fix must return "Jul 2". Same for each F5 format option. Full suite stays green.
- **D-21 — `tests/_helpers/jsdom-pdf-env.js` updated.** Inject `window.DateFormat` (the canonical helper) into the jsdom PDF test env so PDF tests use it.

### Claude's Discretion
- **Personalization tab i18n key names** — tab label and all F4/F5 control labels follow the existing i18n key naming convention (`settings.*`).
- **Session-type list storage mechanism** — localStorage vs IndexedDB (see D-17); planner picks based on existing patterns and backup-restore compatibility.
- **F4 type order in the Personalization tab list** — the order of the 5 locked types (recommend: In-person, Online, Remote, Proxy, Other, then any custom types below).
- **Exact `portfolioDateFormat` key values** — planner picks short machine-readable strings (e.g., `"auto"`, `"month-day-year"`, `"day-month-year"`, `"mm/dd/yyyy"`, `"dd/mm/yyyy"`, `"yyyy-mm-dd"`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Handoff & proposal documents (PRIMARY — start here)
- `.claude/context/session-prompts/2026-07-02_f6-f5-discuss-phase-HANDOFF.md` — locked decisions, the core bug, discuss-phase agenda
- `.claude/context/session-prompts/2026-07-02_f6-f5-date-consistency-PLAN-PROPOSAL.md` — canonical policy, task draft, scope-fence, risks
- `.claude/context/session-prompts/2026-07-02_therapist-uat-feedback-triage.md` — full UAT triage; F6/F5/F4 sections + F3/F1/F9 (not this phase); the living master tracker

### Core files — date bug (F6)
- `assets/app.js` lines ~940–958 — `App.formatDate` (UTC-parse bug, primary fix site) and ~1207–1210 `App.formatSessionType` (type resolver, affected by F4)
- `assets/add-session.js` lines ~516 (`.valueAsDate` input default), ~473/1027/1428 (birthDate/age UTC-parse), ~1369 (sort), ~1272–1359 (birthDate 3 dropdowns → replace with `<input type="date">`)
- `assets/pdf-export.js` lines ~674–689 — local `formatDate` (dead code once canonical helper is in; replace)
- `assets/export-modal.js` lines ~510–512, ~605 — markdown render + "Exported on" date (pre-formats and passes string to PDF; stop pre-formatting, pass raw ISO)
- `assets/overview.js` lines ~382/487 (display), ~568 (`countSessionsThisMonth` month-boundary miscount), ~620 (age), ~723 (sort)
- `assets/sessions.js` line ~92 — session-list date display
- `assets/add-client.js` line ~202 — age math
- `assets/backup.js` lines ~731/827/:623 — filename UTC-vs-local inconsistency

### Settings pattern (F4 + F5 placement)
- `assets/settings-snippets.js` — snippet editor pattern to model the session-type list editor on (add/rename/delete list management)
- `assets/settings.js` — top-of-file banner: module architecture, localStorage read/write pattern for `portfolioLang`/`portfolioTheme`; the new `portfolioDateFormat` key follows the same pattern

### Tests
- `tests/34-date-locale.test.js` — asserts current buggy behavior; MUST be rewritten to assert fixed behavior
- `tests/_helpers/jsdom-pdf-env.js` — jsdom PDF test env; must inject `window.DateFormat` and add TZ pin

### Memory references
- MEMORY: `reference-pdf-jsdom-inert-gates` — PDF jsdom tests can hang and exit-0 silently (false-GREEN); verify real output not exit code
- MEMORY: `feedback-behavior-verification` — TZ-pinned falsifiable behavior tests MUST be authored before implementation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `portfolioLang` / `portfolioTheme` localStorage pattern (`settings.js`) — the `portfolioDateFormat` key follows the same read/write/init pattern verbatim
- `assets/settings-snippets.js` — the full snippet management UI (add/rename/delete list) is the model for the session-type editor; examine its structure before building the F4 UI
- `window.PortfolioDB` (`assets/db.js`) — IndexedDB storage; if session-type list storage lands in IDB, use this module
- `assets/crashlog.js` + `assets/version.js` — examples of the `var X = (function() { 'use strict'; ... })()` IIFE pattern for simpler modules (date-format.js should follow the window-IIFE pattern)
- Existing `<input type="date">` on the session-date field in `add-session.html` — the birthdate field can mirror this exactly

### Established Patterns
- **Window-IIFE modules:** All production JS is `window.X = (() => { 'use strict'; ... })()` — `assets/date-format.js` must follow this shape and register as e.g. `window.DateFormat`
- **localStorage scalar keys:** `portfolioLang`, `portfolioTheme` — `portfolioDateFormat` is the same pattern
- **i18n key convention:** `settings.tab.*` / `settings.dateFormat.*` / `settings.sessionTypes.*` — follow existing key families in `assets/i18n-en.js` etc.
- **No npm in production:** `assets/date-format.js` must be zero-dependency vanilla JS; dev-only tooling is fine in `package.json`

### Integration Points
- **New `<script>` tag on all HTML pages:** `date-format.js` must be loaded *before* `app.js` and `pdf-export.js` (load order matters — those modules call `window.DateFormat`)
- **Backup export/restore (`assets/backup.js`):** Add `portfolioDateFormat` (and the session-type list, once storage is decided) to the keys exported and restored
- **PDF test environment (`tests/_helpers/jsdom-pdf-env.js`):** Must expose `window.DateFormat` so PDF tests exercise the real helper
- **Settings page HTML + JS:** A new "Personalization" tab entry needs to be added to the Settings page structure; the F5 date-format select and F4 type-list editor go inside it

</code_context>

<specifics>
## Specific Ideas

- **"Remote vs Online" framing for F4:** Remote = offline/distant work, client not on a live call (common in Emotion Code distance/proxy work). Online = live video/voice call (Zoom etc.). Keep both — they are meaningfully distinct for EC/BC practitioners.
- **Birth-date input migration:** The existing 3-dropdown birth-date entry in `add-session.html` / `add-client.html` is replaced with a single `<input type="date">`. No data migration needed (storage is already `YYYY-MM-DD`). Verify that the `add-client.js:202` age-calculation path reads the `.value` string (YYYY-MM-DD) rather than `.valueAsDate` (which is UTC-based).
- **PDF baseline regeneration is intentional:** The English default shifts from en-GB to en-US. The planner must flag the baseline change as deliberate in the plan and instruct the executor to regenerate (not force-pass) the SHA-256 fixture tests.
- **F4 type-editor lock icon:** Built-in types display a lock icon (not a delete button) to signal they are permanent. Custom types display a delete button. This makes the two-tier system self-explanatory without a tooltip.

</specifics>

<deferred>
## Deferred Ideas

- **F1** — Snippets discoverability hint on note textareas — separate quick task (not date-related)
- **F2** — Rich text in note boxes — deferred (scope decision pending)
- **F3** — "View sessions" clock button label — separate quick task (handoff already written: `2026-07-02_f3-view-sessions-label-HANDOFF.md`)
- **F7** — PDF severity overlap — awaiting therapist photo; likely already fixed by 260702-bg4, deploy-only
- **F8** — Heart Shield workflow clarification — guidance/answer only, no build
- **F9** — Heart Shield "released" badge naming the emotion(s) — separate quick task
- **F10** — Document/billing storage — dropped from roadmap
- **Batch-3 comments** (`backup.js`, `app.js`, `pdf-export.js`) — deferred from Phase 36; not this phase (would conflict with this phase's extensive edits to those files)
- **F5 per-language rename** — user can rename a session type label globally; per-language rename was evaluated and deferred (complex, unlikely to be used)
- **License re-validation** — deferred backlog (HARD-03)

</deferred>

---

*Phase: 37-date-consistency-date-format-setting-f6-f5*
*Context gathered: 2026-07-02*
