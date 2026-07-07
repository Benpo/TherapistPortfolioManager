---
phase: 37-date-consistency-date-format-setting-f6-f5
plan: 05
subsystem: date-consistency-personalization
status: complete
tags: [date-format, overview, add-client, backup, localStorage, utc-parse]
requires:
  - "37-03: window.DateFormat engine (parseLocal / todayLocalISO / getPreference)"
  - "37-02: tests/37-personalization.test.js RED spec (backup round-trip + add-client birthdate assertions)"
provides:
  - "overview.js calendar-date parses routed through DateFormat.parseLocal (month boundary fixed)"
  - "add-client native <input type='date'> #clientBirthDate (no data migration)"
  - "backup.js round-trips portfolioDateFormat + portfolioSessionTypes as localStorage scalars"
  - "local (todayLocalISO) filename stamps in backup.js encrypted-export paths + settings-snippets.js"
affects:
  - "37-06 (date-format picker writes portfolioDateFormat — now backed up)"
  - "37-07 (session-type editor writes portfolioSessionTypes — now backed up)"
  - "37-08 (add-session birthdate migration — add-client half done here)"
tech-stack:
  added: []
  patterns:
    - "Local calendar parse via window.DateFormat.parseLocal with null-guard fallback"
    - "Additive-optional localStorage scalar in backup settings block (no manifest version bump)"
    - "Native <input type='date'> mirroring #sessionDate (zero custom picker JS)"
    - "D-21 date-format.js injection into vm/jsdom test sandboxes that eval overview.js/backup.js"
key-files:
  created: []
  modified:
    - assets/overview.js
    - add-client.html
    - assets/add-client.js
    - assets/backup.js
    - assets/settings-snippets.js
    - tests/35-demo-seed.test.js
    - tests/29-02-recovery-export.test.js
decisions:
  - "DATE-06/D-03: countSessionsThisMonth parses session.date via parseLocal (+null early-return), killing the UTC month-boundary miscount"
  - "D-03: overview age math + averageDaysBetween route through parseLocal; createdAt sort tie-breaks left as wall-clock reads"
  - "PERS-06/D-12: add-client birthdate is a single native <input type='date'>; populate sets .value, read reads .value, no migration; caller of the old picker removed (app.js helper left for Plan 08)"
  - "PERS-05/D-09/D-17: backup carries portfolioDateFormat + portfolioSessionTypes as guarded localStorage scalars — NOT via therapistSettings IDB (which strips overrides/custom on restore, A2 CORRECTED); no version bump; whitelist untouched"
  - "D-03/D-17: backup.js:741/:840 + settings-snippets.js export filename stamps → todayLocalISO() (local day, not UTC slice)"
metrics:
  duration: "~30 min"
  completed: "2026-07-03"
  tasks: 3
  files_created: 0
  files_modified: 7
---

# Phase 37 Plan 05: Overview UTC-parse sweep + add-client native birthdate + backup persistence Summary

overview.js now parses every calendar date in LOCAL time (fixing the real `countSessionsThisMonth` month-boundary miscount), add-client's birthdate is a native `<input type="date">`, and backup export→restore now round-trips both `portfolioDateFormat` and `portfolioSessionTypes` as additive-optional localStorage scalars with local (non-UTC) filename stamps.

## What Was Built

**Task 1 — overview.js local-parse sweep** (commit `646f551`)
- `countSessionsThisMonth` parses `session.date` via `window.DateFormat.parseLocal` with a `null` early-return, fixing the DATE-06 bug where a UTC-midnight parse shifted a `YYYY-MM-DD` date back a day and miscounted "this month" across the month boundary.
- The modal age calculation parses `client.birthDate` locally with a null-safe fallback to `client.age` (preserves the prior Invalid-Date → fallback behavior).
- `averageDaysBetween` maps `session.date` through `parseLocal` and filters nulls.
- `createdAt` timestamp sort tie-breaks (`overview.js:387-388`) left untouched — legitimate wall-clock reads, per the OUT-OF-SCOPE list.

**Task 2 — add-client native birthdate + local-parse age** (commit `feda531`)
- Replaced the `#birthDatePicker` div + hidden-input pair in `add-client.html` with a single native `<input class="input" id="clientBirthDate" type="date">` mirroring `#sessionDate` (value `YYYY-MM-DD`, no migration).
- Removed the `App.initBirthDatePicker('birthDatePicker','clientBirthDate')` caller (the app.js helper is left intact — add-session still uses it until Plan 08). Populate-on-edit sets `.value` directly; read-on-save already read `.value`.
- Age math parses `.value` via `DateFormat.parseLocal` (null-safe). Updated the DEPENDENCIES banner.

**Task 3 — backup scalars + local filename stamps** (commit `2d26af1`)
- `backup.js` settings export object now carries `dateFormat: localStorage.getItem("portfolioDateFormat")` and `sessionTypes: localStorage.getItem("portfolioSessionTypes")` beside `snippetPrefix`.
- Restore block adds two guarded restores (`if (manifest.settings.dateFormat) …` / `if (manifest.settings.sessionTypes) …`) mirroring the snippetPrefix back-compat guard — older backups restore cleanly. **No manifest `version` bump** (stays `3`); the `therapistSettings` whitelist is untouched. The session-type list rides localStorage because the IDB `therapistSettings` restore loop drops non-whitelisted `sectionKey`s and coerces rows (37-PATTERNS.md A2 CORRECTED).
- The two encrypted-export filename stamps (`backup.js:741` / `:840`) and the snippet-export stamp (`settings-snippets.js`) changed from `new Date().toISOString().slice(0,10)` (UTC) to `window.DateFormat.todayLocalISO()` (local day), matching the already-local B1/B4 stamps.

## Backup Round-Trip Verification (the plan's central correctness gate)

Verified against the REAL `assets/backup.js` export+restore, not a mock mirror. `tests/37-personalization.test.js` case #10 drives `BackupManager.exportBackup()` → clears both keys → `BackupManager.importBackup(file)` in a vm sandbox with the vendored JSZip, and asserts:
- `portfolioDateFormat` survives (`'dd/mm/yyyy'`), AND
- `portfolioSessionTypes` restores **byte-exact** to the seeded `{ overrides:{clinic:'Face-to-face', proxy:''}, custom:[{key:'custom.1',label:'Group session'}] }` (no field dropped).

**Sub-assertions turned GREEN by this plan** (were RED for this scope):
- #10 `backup: the REAL export->restore round-trips portfolioDateFormat + portfolioSessionTypes (overrides+custom)` — **GREEN**
- #11 `birthdate: add-client #clientBirthDate is a native <input type="date">` — **GREEN**

**Sub-assertions intentionally still RED** (Plans 06/07/08 surfaces, out of scope here): picker ×3 (Plan 06), editor ×5 + resolver + security (Plan 07), add-session inline/edit birthdate (Plan 08). `30-settings-tabnav.test.js` also stays RED until the Personalization tab lands (Plan 06).

## Verification (GREEN gate)

- `node tests/37-date-format.test.js` → **13 passed, 0 failed** (engine spine + DATE-06 boundary unit proof still green after the overview sweep).
- `node tests/37-personalization.test.js` → backup round-trip + add-client birthdate **PASS**; remaining 11 RED are Plans 06/07/08 surfaces by design.
- `npm test` full suite → **119 passed, 2 failed, 121 total**. The 2 failures (`30-settings-tabnav`, `37-personalization`) are the expected personalization-surface RED gates for later plans — identical to the post-Plan-03 baseline.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1/D-21] Injected date-format.js into tests/35-demo-seed.test.js**
- **Found during:** Task 1
- **Issue:** Routing `countSessionsThisMonth` through `window.DateFormat.parseLocal` added a genuine runtime dependency on the engine. `35-demo-seed.test.js` evals `overview.js` into two jsdom envs without loading `date-format.js`, so DEMO-06 crashed with `Cannot read properties of undefined (reading 'parseLocal')` (it passed 3/0 at HEAD before this change).
- **Fix:** Added `win.eval(readAsset('assets/date-format.js'))` before each `overview.js` eval (two sites), mirroring the D-21 injection Plan 03 applied to `jsdom-pdf-env.js`. Production is unaffected — `date-format.js` loads before `overview.js` on `index.html`.
- **Files modified:** `tests/35-demo-seed.test.js`
- **Commit:** `646f551`

**2. [Rule 3/D-21] Injected date-format.js into tests/29-02-recovery-export.test.js**
- **Found during:** Task 3
- **Issue:** Changing the encrypted-export filename stamp (`backup.js:840`) to `window.DateFormat.todayLocalISO()` broke `29-02-recovery-export.test.js` case 6, which drives the REAL `exportRecoveryBackup()` in a vm sandbox that loaded db.js + JSZip + backup.js but not the date engine (`TypeError: … reading 'todayLocalISO'`).
- **Fix:** Added a `date-format.js` `vm.runInContext` step immediately before the backup.js load in the sandbox boot. Production is unaffected — backup.js reads `window.DateFormat` only at export time, by which point `date-format.js` is always loaded.
- **Files modified:** `tests/29-02-recovery-export.test.js`
- **Commit:** `2d26af1`

Both deviations are the same class: a real new engine dependency introduced by this plan required the pre-existing test sandboxes to supply the engine (the canonical D-21 pattern). No production behavior was altered to satisfy a test; no assertion was weakened.

## Threat Model Verification

- **T-37-05-01 (Tampering, restored portfolioDateFormat):** disposition `mitigate` — satisfied by the engine, not this plan. `window.DateFormat.getPreference()`/`format()` validate the key and fall back to `'auto'` for any unrecognized value, so a tampered backup value cannot inject an invalid format path. No new validation surface added here.
- **T-37-05-02 (DoS, malformed backup):** disposition `accept` — the two new restores are guarded (`if (manifest.settings.X)`); missing/odd fields leave existing values untouched. No new parsing surface.

## Known Stubs

None. All five production edits are fully wired to live code paths; no TODO/FIXME/placeholder introduced.

## Threat Flags

None. No new network endpoint, auth path, or trust-boundary schema change. The backup additive scalars reuse the existing user-controlled-restore surface (already covered by T-37-05-02); the session-type list is a JSON string round-tripped verbatim through localStorage.

## Self-Check: PASSED

- FOUND: assets/overview.js (5 `DateFormat.parseLocal` refs; 0 residual `new Date(session.date)`/`new Date(client.birthDate)`)
- FOUND: add-client.html (`id="clientBirthDate" type="date"`); assets/add-client.js (0 `initBirthDatePicker`, age uses `parseLocal`)
- FOUND: assets/backup.js (`portfolioDateFormat` ×2, `portfolioSessionTypes` ×2, `todayLocalISO` ×2, `version: 3` unchanged, `ALLOWED_SECTION_KEYS` unchanged)
- FOUND: assets/settings-snippets.js (`todayLocalISO`; 0 residual UTC slice on the download line)
- FOUND commit: `646f551` (Task 1); `feda531` (Task 2); `2d26af1` (Task 3)
- `npm test` re-confirmed 119 passed, 2 failed (the 2 = expected Plans 06/07/08 RED gates)
