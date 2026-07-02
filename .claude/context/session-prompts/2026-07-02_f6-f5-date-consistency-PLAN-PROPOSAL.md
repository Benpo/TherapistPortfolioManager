# F6 + F5 — Date consistency + date-format setting — PLAN PROPOSAL (for review)

**Status:** PROPOSAL — not approved, not executed. Awaiting Ben's sign-off on scope + open decisions + vehicle/timing.
**Confirmed direction (Ben, 2026-07-02):** local calendar-date model; one shared helper; parse & format local everywhere; delete UTC-parse. F5 layers a presentation setting on that helper.
**Grounded in:** the app-wide date audit (2026-07-02). Storage is already `YYYY-MM-DD` → **no data migration**.

---

## Goal (acceptance)

Every calendar-date parse/format in the app is **local** and flows through **one canonical helper**, so a back-dated session shows the picked day identically in the UI, the browser title, and the PDF — regardless of the user's timezone. Plus: a user-selectable **date format** (F5). Agent-verified: no remaining UTC-parse of a `YYYY-MM-DD` value anywhere.

## Canonical policy

- Calendar dates (session `date`, client `birthDate`) are `YYYY-MM-DD` strings (already true).
- **Canonical formatter:** regex-extract leading `\d{4}-\d{2}-\d{2}` → `new Date(y, m-1, d)` (LOCAL) → `Intl.DateTimeFormat`. The regex-extract also safely handles any legacy full-ISO value in `date` (back-compat).
- Delete/replace every UTC-parse of a calendar date (`new Date("YYYY-MM-DD")`, `.valueAsDate` default).
- `createdAt`/`updatedAt`/`exportedAt` stay ISO timestamps (unambiguous) — out of scope except where displayed inconsistently.

## Open design decisions (need Ben)

- **D1 — helper delivery.** Ben chose "one shared helper." Cleanest = a small new module (e.g. `assets/date-format.js`) loaded before `app.js` and `pdf-export.js`, and added to the jsdom PDF test env. Trade-off: one more script tag on every HTML page. (Fallback: byte-identical duplication with a sync-comment, matching the existing `parseMarkdown` dual in md-render/pdf-export — lower-risk, but two copies.) **Recommend the shared module** since Ben asked for one source of truth.
- **D2 — English default order.** UI is currently en-US ("Jul 2, 2026"); PDF is en-GB ("2 July 2026"). Unify. **Recommend default = follow language, en → US month-first** — sensible *and* it happens to give the reporting practitioner what she wants by default (relates to F5).
- **D3 — F5 format options (DECIDED 2026-07-02: include numeric).** Set to offer: `Auto (by language)` · `Month Day, Year` (Jul 2, 2026) · `Day Month Year` (2 Jul 2026) · `MM/DD/YYYY` (US numeric, 07/02/2026) · `DD/MM/YYYY` (EU numeric) · `YYYY-MM-DD` (ISO). Discuss-phase to finalize exact labels/i18n, separators, leading-zero rules, and how numeric formats interact with the app's worded-month feel.
- **D4 — F5 placement (OPEN → discuss-phase).** No appearance/language settings tab exists today (language = globe menu, theme = toggle). Candidate homes: (a) `localStorage["portfolioDateFormat"]` scalar near the globe/theme controls; (b) a new "Appearance/Language" settings tab. Must also add the pref to backup export/restore (like `portfolioLang`/`portfolioTheme`). **Not finalized — resolve in the discuss phase.**
- **D5 — Birth-date entry is 3 dropdowns (NEW, Ben 2026-07-02).** Client age/birth-date is entered via day/month/year select dropdowns (`app.js:1272` month names, `:1290` days-in-month, `:1359` `setValue` split). If the date-format setting changes field ordering (US month-first vs EU day-first), **the dropdown order must adapt to match the chosen format**. UX (reorder selects? numeric vs month-name in the month select?) → resolve in the discuss phase. This couples F5 to the client form, not just display.

## Task breakdown (draft — for a GSD plan)

1. **Canonical date module + tests (RED first).** New `assets/date-format.js` (local parse + Intl format + format-preference param). TZ-pinned test (`TZ=America/New_York`): `2026-07-02` → "Jul 2, 2026"; legacy full-ISO input handled; each F5 option formats correctly.
2. **Repoint the UI.** `App.formatDate` → delegates to canonical; verify all display sites (sessions.js:92, overview.js:382/487, add-session.js:1379/1494 incl. `document.title`) now render local.
3. **Fix the input default.** `add-session.js:516` `.valueAsDate = new Date()` → set `.value` to local `YYYY-MM-DD`.
4. **Fix the PDF path.** Stop pre-formatting in `export-modal.js` (pass raw ISO `sessionDateISO` to `buildSessionPDF`); PDF uses the canonical local formatter. **Update `tests/34-date-locale.test.js` in lockstep** (it asserts the old pre-format chain). **Regenerate golden PDF baselines** (English format changes en-GB→en-US) — intentional, reviewed.
5. **Sweep secondary UTC-parse sites for local consistency.** `overview.js:568` (`countSessionsThisMonth` month-boundary miscount — real), `overview.js:723` + `add-session.js:1369` (sort, cosmetic), birthDate/age UTC-parse (`add-client.js:202`, `add-session.js:473/1027/1428`, `overview.js:620`) → local, so age near birthdays is correct. Align filename UTC vs local inconsistencies (`backup.js:731/827` etc.) if in scope.
6. **F5 setting.** Add `portfolioDateFormat` (read/write like `portfolioLang`), wire into the canonical helper, add to backup export/restore, surface the control (D4).
7. **Verification (Ben's bar).** Agent sweep confirms zero remaining UTC-parse of calendar dates app-wide; TZ-pinned behavior tests (UI + PDF); full suite green; golden PDF baselines reviewed; manual check on the deployed build in a US timezone.

## Risks / watch-items

- **Golden PDF baselines change** (formatter unification) — must be regenerated deliberately, not force-passed. (See MEMORY: reference-pdf-jsdom-inert-gates — verify real output.)
- **`tests/34-date-locale.test.js`** asserts current buggy behavior → rewrite to assert the fixed behavior.
- **Legacy full-ISO `date`** values → canonical helper must regex-extract (handled by design).
- **Concurrency with live Phase 36** — a new shared script tag on every HTML page + any ROADMAP/STATE writes could collide with Phase 36's comment-only edits (Phase 36 fences OUT pdf-export.js/app.js/backup.js, but this plan EDITS app.js/pdf-export.js → **direct conflict if run concurrently with a Phase 36 plan that also touches those**). **Strong recommendation: run this AFTER Phase 36 completes.**

## Scope-fence (files the fix will touch)

Primary: `assets/date-format.js` (new), `app.js`, `pdf-export.js`, `export-modal.js`, `add-session.js`, `add-client.js`, `overview.js`, `sessions.js`, settings surface for F5, all HTML pages (new script tag), `tests/_helpers/jsdom-pdf-env.js` (+ TZ pin), `tests/34-date-locale.test.js` (rewrite), new date tests, regenerated PDF golden baselines. Secondary (optional): `backup.js`, `settings-snippets.js` filename consistency.

## Vehicle & timing (DECIDED 2026-07-02)

Phase-scale (≈8 core files + new module + setting + baselines + client-form dropdowns). **Decision:** treat this as a proper **GSD phase**, entered via a **`gsd-discuss-phase` run in its own conversation** (deep dive on D1–D5 + the points below), THEN `gsd-plan-phase`, THEN execute — **all after Phase 36 finishes** (this plan edits `app.js`/`pdf-export.js`, which would collide with Phase 36 and with ROADMAP/STATE writes). This doc + the discuss-handoff are the "drafted now, run later" artifacts. See `2026-07-02_f6-f5-discuss-phase-HANDOFF.md`.

## Sibling items (not this plan)
- **F3** (clock-button label) — unrelated to dates; a separate tiny quick task.
- **F7** — confirm against her photo; almost certainly already fixed by 260702-bg4 (deploy-only).
- **F5** rides with F6 here (shares the canonical helper).
