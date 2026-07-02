# HANDOFF — gsd-discuss-phase for "Date consistency (local) + date-format setting" (F6 + F5)

**Created:** 2026-07-02 (from the therapist-UAT triage session).
**Run this:** in a **fresh conversation**, AFTER Phase 36 (code-comments batch 2) has finished and merged — this work edits `app.js` / `pdf-export.js`, which Phase 36 fences out, so running concurrently would collide.
**Do NOT execute code from this handoff.** It seeds a `gsd-discuss-phase`; planning/execution come after.

## How to start the phase (in the new session)
1. Confirm Phase 36 is complete (check `.planning/STATE.md`).
2. Add the phase to the roadmap: `/gsd-phase` → add "Date consistency + date-format setting (F6+F5)".
3. Run `/gsd-discuss-phase <that phase>` and feed it this handoff as context.
4. Then `/gsd-plan-phase`, review, execute.

## Read these first (already written, this repo)
- `.claude/context/session-prompts/2026-07-02_therapist-uat-feedback-triage.md` — full 10-item UAT triage + Ben's decisions.
- `.claude/context/session-prompts/2026-07-02_f6-f5-date-consistency-PLAN-PROPOSAL.md` — the technical proposal (canonical policy, task draft, risks, scope-fence) grounded in the app-wide date audit.

## Phase goal (one line)
Make **every** calendar-date parse/format in the app **local** through **one canonical helper**, and add a **user-selectable date format** — so a back-dated session shows the picked day identically in the UI, the browser title, and the PDF, in any timezone.

## LOCKED decisions (do NOT re-litigate in discuss)
- **Local calendar-date model.** Session `date` / client `birthDate` are `YYYY-MM-DD` strings (already the storage format → **no data migration**). Parse & format **local** everywhere; delete all UTC-parse of calendar dates.
- **One canonical helper** (shared module, e.g. `assets/date-format.js`): regex-extract leading `\d{4}-\d{2}-\d{2}` → `new Date(y,m-1,d)` local → `Intl.DateTimeFormat`. Regex-extract also handles any legacy full-ISO `date` (back-compat).
- **English default = follow language**, `en` → US month-first ("Jul 2, 2026").
- **F5 includes numeric formats** (Ben's call): Auto / Month Day, Year / Day Month Year / MM/DD/YYYY / DD/MM/YYYY / YYYY-MM-DD.
- **Vehicle:** proper GSD phase (discuss → plan → execute), after Phase 36.

## The core bug (why this matters — trust)
`App.formatDate` (`app.js:942`) does `new Date("YYYY-MM-DD")` = **UTC** midnight; formatted in a negative-UTC (American) zone it renders the **previous day**. It feeds the sessions table, overview, spotlight, the **browser tab title**, and — because `export-modal.js` pre-formats and passes the string through — the **PDF card date** too. The date-input default (`add-session.js:516` `.valueAsDate = new Date()`) is also off-by-one (can pre-fill *tomorrow* late evening). The PDF's own local-correct `formatDate` (`pdf-export.js:680`) is effectively **dead code** because it only ever receives a pre-formatted string.

## Discuss-phase agenda (the OPEN questions to resolve)
1. **D4 — Where does the F5 setting live?** No appearance/language settings tab exists today (language = globe menu, theme = toggle). Decide: a `localStorage["portfolioDateFormat"]` scalar near globe/theme, vs a new "Appearance/Language" settings tab. Must add to backup export/restore too.
2. **D5 — Birth-date is 3 dropdowns.** Client birth-date/age uses day/month/year selects (`app.js:1272` month names, `:1290` days-in-month, `:1359` split). If the chosen format is month-first vs day-first, **the dropdowns must reorder to match**. Decide the UX: reorder the selects to follow the format? month as name vs number? does numeric format change the month select's contents? This couples F5 to the client form.
3. **F5 format details.** Exact option labels + i18n (en/he/de/cs), separators (`/` vs `-` vs `.` — note German convention), leading zeros, and how numeric formats coexist with the app's worded-month feel. RTL (Hebrew) rendering of numeric formats.
4. **Golden PDF baselines.** Unifying formatters changes the PDF's English format (en-GB "2 July 2026" → en-US "Jul 2, 2026"). Confirm baselines are regenerated deliberately and reviewed (MEMORY: reference-pdf-jsdom-inert-gates — verify real output, not exit code).
5. **Secondary-sweep scope.** Which non-display UTC-parse sites are IN scope for "consistent to local": `overview.js:568` (`countSessionsThisMonth` month-boundary miscount — real), `overview.js:723` + `add-session.js:1369` (sort, cosmetic), birthDate/age math (`add-client.js:202`, `add-session.js:473/1027/1428`, `overview.js:620` — age near birthdays), backup filename UTC-vs-local inconsistency (`backup.js:731/827` vs `:623`). Decide the fence.
6. **Helper delivery mechanics.** Shared `date-format.js` loaded before `app.js` + `pdf-export.js` and injected into `tests/_helpers/jsdom-pdf-env.js`; a new `<script>` on every HTML page. Confirm this vs byte-identical duplication (matches the existing `parseMarkdown` dual pattern).
7. **Test strategy.** TZ-pinned tests (`process.env.TZ='America/New_York'` at top of a new test file — each test runs in its own process, so it's isolated and directly falsifiable: `App.formatDate('2026-07-02')` returns "Jul 1" today, must be "Jul 2"). Rewrite `tests/34-date-locale.test.js` (it asserts the current buggy pre-format chain) to assert the fixed behavior.

## Scope-fence (files the eventual fix touches)
New `assets/date-format.js`; `app.js`, `pdf-export.js`, `export-modal.js`, `add-session.js`, `add-client.js`, `overview.js`, `sessions.js`; the F5 settings surface; all HTML pages (script tag); `tests/_helpers/jsdom-pdf-env.js` (+ TZ pin); `tests/34-date-locale.test.js` (rewrite); new date tests; regenerated PDF golden baselines. Optional secondary: `backup.js`, `settings-snippets.js`.

## Explicitly NOT in this phase
- **F3** (clock-button "View sessions" label) — separate tiny quick task, unrelated to dates.
- **F7** (PDF severity/referral overlap) — almost certainly already fixed by quick task 260702-bg4; confirm against the practitioner's photo, then it's deploy-only.
- **F2** (rich text in note boxes) — deferred.
- **F4** (more session types) — deferred; reframed as Settings-managed, not per-session.
- **F10** (document/billing storage) — dropped.
- **F1 / F9 / F8** — parked / guidance-only for now.
