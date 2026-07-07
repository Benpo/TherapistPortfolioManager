---
phase: 37-date-consistency-date-format-setting-f6-f5
plan: 08
subsystem: add-session-date-personalization
status: complete
tags: [date-format, utc-parse, session-types, personalization, native-date-input, cleanup, phase-exit]
requires:
  - "37-03: window.DateFormat engine (parseLocal / todayLocalISO / getPreference)"
  - "37-07: App.getSessionTypes() ordered list + App.formatSessionType synchronous resolver + app:session-types-changed contract (D-16/D-18)"
  - "37-05: add-client native birthdate pattern + overview UTC sweep to mirror; app.js initBirthDatePicker left intact for this plan"
provides:
  - "add-session.js calendar-date reads routed through DateFormat (local input default, parseLocal age, localeCompare sort)"
  - "add-session session-type cards data-driven from App.getSessionTypes() (5 defaults + custom), re-render on app:language + app:session-types-changed, FIX 6 deleted-key guard"
  - "add-session inline + edit birthdate as native <input type=date> (#inlineClientBirthDate / #editClientBirthDate)"
  - "App.initBirthDatePicker REMOVED (function + export) — phase-wide birthdate picker retirement complete"
  - "phase-wide UTC-parse sweep verified complete (DATE-02): zero calendar-date new Date() parse + zero toISOString().slice(0,10) stamps outside date-format.js"
affects:
  - "closes Phase 37 — no downstream plans; F6/F5 date-consistency + F4 personalization surface fully landed"
tech-stack:
  added: []
  patterns:
    - "Local calendar parse via window.DateFormat.parseLocal with null-guard fallback (mirrors overview.js Plan 05)"
    - "String (localeCompare) tie-break on YYYY-MM-DD session.date; createdAt wall-clock reads untouched (matches sessions.js)"
    - "Data-driven toggle-card render from a managed-list resolver; textContent-only labels (no innerHTML); event-delegated selection survives re-render"
    - "Ephemeral disabled toggle-card preserves a stored-but-deleted key on edit-save (FIX 6 / D-18)"
    - "Native <input type=date> mirroring #sessionDate (zero custom picker JS)"
    - "D-21: date-format.js injected into jsdom/vm sandboxes that eval add-session.js"
key-files:
  created: []
  modified:
    - add-session.html
    - assets/add-session.js
    - assets/app.js
    - tests/30-autogrow-wiring.test.js
    - tests/30-client-spotlight.test.js
    - tests/30-export-markdown.test.js
    - tests/30-field-copy.test.js
    - tests/30-form-dirty-revert.test.js
    - tests/30-issue-delta.test.js
    - tests/30-read-mode.test.js
    - tests/30-save-redirect.test.js
    - tests/30-section-visibility.test.js
decisions:
  - "DATE-06/D-03: new-session date input defaults to DateFormat.todayLocalISO() (the genuine input bug — valueAsDate=new Date() could default to tomorrow in a negative-UTC zone)"
  - "D-03: three add-session age-math sites parse birthDate via DateFormat.parseLocal (null-safe); session sort tie-break uses localeCompare on ISO strings; createdAt tie-breaks stay wall-clock reads"
  - "PERS-04/D-16/D-18: session-type cards render from App.getSessionTypes() (5 defaults + custom); re-render on app:language + app:session-types-changed; FIX 6 ephemeral disabled card preserves a deleted-custom stored key on save"
  - "PERS-06/D-12: add-session inline + edit birthdate are native <input type=date>; no data migration"
  - "DATE-02: App.initBirthDatePicker removed (add-session was the last production caller; add-client migrated Plan 05); legacy JSON backup filename uses todayLocalISO(); app-wide sweep verified"
metrics:
  duration: "~45 min"
  completed: "2026-07-03"
  tasks: 3
  files_created: 0
  files_modified: 12
---

# Phase 37 Plan 08: add-session UTC-parse sweep + data-driven session-type cards + native birthdate + picker retirement Summary

The add-session vertical is fully swept and personalized: its date input defaults to the LOCAL calendar day, its age/sort math parses locally, its session-type cards render data-driven from the managed list (with a deleted-key preservation guard), its birthdate entries are native `<input type="date">`, and the now-orphaned `App.initBirthDatePicker` is gone. This closes the phase-wide DATE-02 UTC-parse sweep and turns the whole suite GREEN (121/121) — the phase's exit condition.

## What Was Built

**Task 1 — add-session UTC-parse sweep + app.js legacy filename** (commit `9898080`)
- New-session date input now defaults to `window.DateFormat.todayLocalISO()` instead of `valueAsDate = new Date()` — the genuine input bug where a UTC-midnight Date defaulted the field to TOMORROW late at night in a negative-UTC zone (DATE-06).
- The three age-math sites (edit-client save, inline-client save, spotlight age) parse `birthDate` via `window.DateFormat.parseLocal` with a null-safe guard (mirroring the overview.js Plan 05 pattern; the `: null` and `: selectedClient.age` fallbacks are preserved).
- The session-date sort tie-break in `renderSpotlightSessionInfo` uses `String(b.date||"").localeCompare(String(a.date||""))` on the ISO calendar strings (matching sessions.js); the adjacent `createdAt` tie-breaks stay wall-clock `new Date(...)` reads (OUT-OF-SCOPE, D-03).
- `app.js` `downloadJSON` legacy backup filename stamp changed from `new Date().toISOString().slice(0,10)` (UTC) to `window.DateFormat.todayLocalISO()` (local day).

**Task 2 — data-driven session-type cards** (commit `6ce1907`)
- The 3 hardcoded `.toggle-card` radios in `#sessionTypeGroup` were replaced with an empty container that `renderSessionTypeCards()` fills from `App.getSessionTypes()` (5 managed defaults + custom). The first card is the checked default. Labels are set via `textContent` (from `App.formatSessionType`) — never `innerHTML` (T-37-08-SEC); the group is cleared with a `removeChild` loop, not `innerHTML`.
- Cards re-render on `app:language` (un-renamed default labels re-translate, overrides stay fixed) and on `app:session-types-changed` (a Settings-tab rename/add/delete — same tab or a peer tab relayed by `App.initCommon`'s storage listener — updates the cards live, FIX 2), preserving the current selection across the re-render.
- FIX 6: `selectSessionType()` guards the edit-repopulate no-match case — when an existing session's stored type maps to NO current card (a custom key later deleted in Settings), it renders an ephemeral **disabled** `.toggle-card` showing the raw stored label (`App.formatSessionType` → raw key, D-18) and checks it, so the checked-value read returns the original key and save never silently rewrites the historical value to the default.
- `setupToggleGroup` (event-delegated), the checked-value reads (`:729`/`:1104`), and the edit-repopulate path stay generic and survive dynamic cards.

**Task 3 — native birthdate inputs + picker retirement + sweep audit** (commit `a0ad663`)
- The two birthdate container+hidden-input pairs (inline new-client + edit-client) became single native `<input class="input" type="date">` (`#inlineClientBirthDate` / `#editClientBirthDate`) mirroring `#sessionDate`. The two `App.initBirthDatePicker` calls were removed; populate-on-edit and clear now set `.value` directly; the read-on-save sites already read `.value`. No data migration.
- `App.initBirthDatePicker` (function + export entry) was **removed** from `app.js` — add-session was the last production caller (add-client migrated in Plan 05).
- App-wide UTC-parse sweep audit run and verified (see below). This closes DATE-02.

## initBirthDatePicker removal — pre-removal caller audit (grep evidence)

Before deleting the function, the WHOLE repo (excluding `node_modules`, `.planning/`, and stale `.claude/worktrees/*` copies) was grepped for `initBirthDatePicker`. Live-tree references:

| Reference | Kind | Blocks removal? |
|-----------|------|-----------------|
| `assets/add-session.js:148-149` | the two production calls | Removed in this plan |
| `assets/app.js` (def + export) | the function itself | Removed in this plan |
| `assets/add-session.js:24` | DEPENDENCIES comment | Cosmetic — updated |
| `tests/25-06-crop-only.test.js:204` | self-contained App **stub** (`initBirthDatePicker: function(){…}`) | No — provides its own fake |
| `tests/quick-260516-rna-textarea-autogrow.test.js:131` | App **stub** (`initBirthDatePicker(){ return {clear(){}} }`) | No — provides its own fake |
| `tests/_helpers/app-stub.js:86` | `initBirthDatePicker: undefined` | No — a property, not a caller |

`assets/add-client.js` has **zero** live references (migrated Plan 05; only worktree copies still show it). Conclusion: add-session was the last production caller — removal is safe. Post-removal `grep -rn "initBirthDatePicker" assets/` returns **0**. (Orphaned `.birth-date-picker*` CSS in `app.css` was left in place — out of scope, harmless dead CSS.)

## App-wide UTC-parse sweep audit (DATE-02 / FIX 5) — VERIFIED COMPLETE

Two bug classes, both verified across `assets/` + repo-root HTML (excluding vendored `jszip.min.js` and the engine `date-format.js`):

- **(a) Calendar-date UTC parse** — `new Date(x)` where `x` holds `session.date` / `client.birthDate` / `birthDate`: **zero** real occurrences. The only grep hit is a comment in `demo-seed.js:17`; the real `new Date()` calls there are wall-clock seed generators (`isoDaysAgo`), not calendar-string parses.
- **(b) `toISOString().slice(0,10)` UTC filename/date stamps**: **zero** app-wide. Every former stamp (backup.js:731/:827 + settings-snippets.js:1019 from Plan 05; app.js:1044 in this plan) now uses `DateFormat.todayLocalISO()`.
- **Untouched (correct):** 17 wall-clock full-ISO `.toISOString()` timestamps WITHOUT `.slice` (createdAt/updatedAt/exportedAt/Date.now) remain intact.

## Verification (GREEN gate — phase exit condition)

- `node tests/37-personalization.test.js` → **13 passed, 0 failed**. Case 12 (add-session inline/edit native birthdate) is now **GREEN** (was the sole remaining RED after Plan 07). Case 13 (session-type label XSS-as-text) stays GREEN.
- `node tests/37-date-format.test.js` → **13 passed, 0 failed**.
- `npm test` full suite → **`Suite: 121 passed, 0 failed, 121 total` — All test files passed.** This is the phase's exit condition and it is met. No assertions were weakened.

Task-1 grep gates: `todayLocalISO` present in add-session.js input default + app.js filename; `DateFormat.parseLocal` count = 3 (the three age sites); no residual `valueAsDate = new Date()`.
Task-2 grep gates: `app:session-types-changed` present (×2); zero `innerHTML` on the card render path.
Task-3 grep gates: `grep -rn initBirthDatePicker assets/` = 0; three `type="date"` inputs in add-session.html.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1/D-21] Injected date-format.js into 9 add-session jsdom/vm test sandboxes**
- **Found during:** Task 1
- **Issue:** Defaulting the session-date input via `window.DateFormat.todayLocalISO()` at add-session.js boot added a genuine runtime dependency on the engine. Nine `30-*` tests eval `add-session.js` into a jsdom window (8 via `win.eval`, `30-save-redirect` via `vm.runInContext`) without loading `date-format.js`, so boot crashed with `Cannot read properties of undefined (reading 'todayLocalISO')`.
- **Fix:** Injected `date-format.js` immediately before the `add-session.js` eval in each sandbox (the canonical D-21 pattern Plan 05 applied to its sandboxes). Production is unaffected — `date-format.js` loads before `add-session.js` on `add-session.html`.
- **Files modified:** `tests/30-autogrow-wiring.test.js`, `tests/30-client-spotlight.test.js`, `tests/30-export-markdown.test.js`, `tests/30-field-copy.test.js`, `tests/30-form-dirty-revert.test.js`, `tests/30-issue-delta.test.js`, `tests/30-read-mode.test.js`, `tests/30-save-redirect.test.js`, `tests/30-section-visibility.test.js`
- **Commit:** `9898080`

Same class as the Plan 05 D-21 deviations: a real new engine dependency required the pre-existing test sandboxes to supply the engine. No production behavior was altered to satisfy a test; no assertion was weakened.

## Threat Model Verification

- **T-37-08-SEC (Tampering / DOM XSS, session-type card label rendering):** disposition `mitigate` — satisfied. Card `<span>` labels are set via `textContent` (`App.formatSessionType` output); the group is cleared via a `removeChild` loop, never `innerHTML`; the FIX 6 ephemeral card label is also `textContent`. Test-proven by `37-personalization.test.js` case 13 (an `<img onerror>` payload stays literal, zero `<img>` parsed, `onerror` never fires).
- **T-37-08-01 (Tampering, native birthdate `.value`):** disposition `accept` — native `<input type="date">` yields a validated `YYYY-MM-DD` string; age math parses it via `DateFormat.parseLocal` which returns null on a bad value (null-safe fallback preserved).

No package installs — no supply-chain surface. No new network/auth/schema surface.

## Known Stubs

None. All production edits are wired to live code paths; no TODO/FIXME/placeholder introduced. The ephemeral FIX-6 card is a deliberate, fully-wired preservation mechanism, not a stub.

## Threat Flags

None. No new network endpoint, auth path, or trust-boundary schema change. The session-type card labels are managed-list output rendered as text; the native birthdate is a validated date string.

## Self-Check: PASSED

- FOUND: add-session.html (3 × `type="date"`; empty `#sessionTypeGroup`; no `birth-date-picker` div)
- FOUND: assets/add-session.js (`renderSessionTypeCards`, `selectSessionType`, `buildSessionTypeCard`; `todayLocalISO`; `DateFormat.parseLocal` ×3; 0 `initBirthDatePicker`; `app:session-types-changed` ×2)
- FOUND: assets/app.js (0 `initBirthDatePicker`; `todayLocalISO` backup filename; no `toISOString().slice`)
- FOUND commit: `9898080` (Task 1); `6ce1907` (Task 2); `a0ad663` (Task 3)
- Re-confirmed `node tests/37-personalization.test.js` → 13/0; `node tests/37-date-format.test.js` → 13/0; `npm test` → 121 passed, 0 failed, 121 total (phase exit condition met)
