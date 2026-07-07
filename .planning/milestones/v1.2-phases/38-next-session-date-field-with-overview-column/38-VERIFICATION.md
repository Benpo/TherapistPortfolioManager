---
phase: 38-next-session-date-field-with-overview-column
verified: 2026-07-07T14:10:00Z
status: passed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 8/9 (1 present-but-behavior-unverified)
  gaps_closed:
    - "UAT test 5 real-Safari field check: badInput guard confirmed firing at submit time in real Safari (38-UAT.md test 5 retest, 'pass') — the one item previously routed to human verification is now closed with on-device evidence"
    - "UAT test 6: RTL native date-input segment reversal (yyyy/dd/mm) — fixed by 38-10 (direction:ltr base rule + RTL box-direction/datetime-edit override), Playwright WebKit + on-device Safari approved"
    - "UAT test 7: Latin name + Hebrew month-name date bidi scramble — fixed by 38-11 (shared FSI isolate() helper wrapping name+date at all composition sites), on-device Safari approved"
    - "UAT test 8: block-warning indistinguishable from success toast, not physically close to field — fixed by 38-12 (toast tone/focus API, .toast--error variant, plus Ben-approved rangeUnderflow too-early-date guard extension), on-device Safari approved"
  gaps_remaining: []
  regressions: []
---

# Phase 38: Next Session Date Field With Overview Column Verification Report

**Phase Goal:** Optional native date-picker for the *next* session, stored on the session record + shown as its own sortable overview column (mirrors last-session date), rendered in exports, seeded in the demo, carried by backup/restore — built on the Phase 37 date engine, native date input, and overview column formatter.
**Verified:** 2026-07-07T14:10:00Z
**Status:** passed
**Re-verification:** Yes — after gap-closure plans 38-10, 38-11, 38-12 (UAT retest gaps: RTL date-input segment order, bidi name/date scramble, warning-toast visibility) landed on top of the prior `human_needed` (8/9) verification.

## Context

This is a re-verification following the 38-09 → UAT-retest → 38-10/11/12 gap-closure cycle. The
2026-07-07T09:10Z verification scored 8/9 with one truth (`isNextSessionDateIncomplete` real-Safari
effectiveness) left `PRESENT_BEHAVIOR_UNVERIFIED` because jsdom/Chromium cannot raise
`validity.badInput` — routed to human verification. The subsequent UAT retest (`38-UAT.md`) both
(a) closed that item on real hardware ("incomplete date worked... badInput does fire at submit
time — review WR-02's Safari premise PROVEN") and (b) surfaced three NEW issues found during that
same retest session (tests 6, 7, 8 — all RTL/bidi/toast-visibility, none previously in scope
because they required real-device Hebrew testing). All three were diagnosed with root-cause debug
sessions, fixed by gap plans 38-10/11/12, and each plan's `<human-check>` was approved by Ben
on-device in real Safari on 2026-07-07 (recorded in each plan's SUMMARY.md and in `38-UAT.md`,
whose `Gaps` section now lists all 5 entries as `status: resolved`).

This report treats those five on-device approvals as satisfying the human-verification requirement
— they are not re-flagged as pending. All evidence below (tests, source, wiring) was independently
re-executed and re-read in this session, not taken from SUMMARY.md's word.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | An optional `nextSessionDate` field exists on the session record, entered via a native `<input type="date">` below the note, wired into save/add/populate/reset (NEXT-01) | ✓ VERIFIED | `add-session.html:341`; `node tests/38-next-session.test.js` → 6/6 PASS (executed directly). |
| 2 | The date input's `min` is dynamically bound to `#sessionDate` (never `min=today`), removed when empty, re-applied on change (NEXT-02) | ✓ VERIFIED | `syncNextSessionMin()` in `assets/add-session.js`; DYNAMIC MIN case in `38-next-session.test.js` PASS. |
| 3 | A "Next Session" column appears in the overview table in both `index.html` and `demo.html`, immediately after Last Session, formatted via `App.formatDate`, blank renders `-` (NEXT-03) | ✓ VERIFIED | `index.html:178-179`, `demo.html:167-168` both carry `data-sort-key="nextSession"` header + i18n label. |
| 4 | Sortable via a `nextSession` key defaulting ascending, synced with `#clientSortSelect`, empty next-dates traveling WITH the sort direction (revised NEXT-04/D-03-R1) | ✓ VERIFIED | `assets/overview.js` sentinel-based sort branch (9999-12-31 rides `dir * base`); `node tests/37-overview-sort.test.js` → 9/9 PASS; human-confirmed pass (`38-UAT.md` test 3, retested on local server). |
| 5 | A subtle, accessible overdue cue (dimmed text + amber dot) when `nextSessionDate` is strictly before today-local; today not overdue; empty renders `-` with no cue (NEXT-05) | ✓ VERIFIED | `is-overdue` / `next-overdue-dot` in `assets/overview.js`/`app.css`; `node tests/38-next-overdue.test.js` → 5/5 PASS; human-confirmed pass (`38-UAT.md` test 1: LTR/RTL/dark all correct). |
| 6 | The next-session date renders in the PDF/markdown export beside the note, gated by the same nextSession section toggle; date-only sessions still render (NEXT-06) | ✓ VERIFIED | `assets/export-modal.js` note-OR-date gates (`sectionHasData`, copy builder, filtered builder); human-confirmed pass (`38-UAT.md` test 4). |
| 7 | Demo + backup parity: demo.html gets the column, seed data carries near-future relative next-dates, backup/restore carries the field automatically with no `backup.js` change (NEXT-07) | ✓ VERIFIED | `assets/demo-seed.js`/`demo-seed-data.json` (`nextSessionDaysAgo` self-freshening, one deliberate overdue example); `git log -- assets/backup.js` shows no Phase-38 commit; human-confirmed pass (`38-UAT.md` test 2). |
| 8 | Falsifiable behavior tests, authored before implementation, cover the TZ-pinned overdue boundary, blanks-travel-with-direction sort, dynamic-min constraint, RTL date-input order, bidi isolation, toast tone/focus; golden baselines untouched unless truly needed (revised NEXT-08) | ✓ VERIFIED | `node tests/run-all.js` → **131 passed, 0 failed, 131 total**, executed directly this session. No `.sha256` fixture touched (`git log` for the phase shows no golden-baseline regeneration commit). |
| 9 | Typing a partial next-session date (one segment changed) and pressing Save in a **real browser** BLOCKS the save with a clear i18n message — never silently discarded while a success toast fires; a manually typed too-early date is likewise blocked (closes UAT test 5, NEXT-01) | ✓ VERIFIED | `isNextSessionDateIncomplete`/`isNextSessionDateTooEarly` (`assets/add-session.js:90-103`) wired at the sole `saveSessionForm()` persist choke point (`:1182-1192`); `node tests/38-next-session-partial-guard.test.js` → 7/7 PASS. **Real-Safari evidence:** `38-UAT.md` test 5 retest — "incomplete date worked... badInput does fire at submit time" (Ben, on-device, 2026-07-07) — resolves the ambiguity the prior verification round left open (code-review WR-02's two possible readings; the Safari premise is now proven, not assumed). |

**Score:** 9/9 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `assets/app.css` | Shared `input[type="date"]{direction:ltr}` base rule + RTL override + `::-webkit-datetime-edit` inner-order restore (38-10) | ✓ VERIFIED | Confirmed at `:1095`, `:1116`, `:1119`; CSS-cascade specificity verified by code review and re-confirmed here; `node tests/38-10-rtl-date-input.test.js` → 3/3 PASS. |
| `assets/date-format.js` | `window.DateFormat.isolate(str)` FSI helper (U+2068…U+2069), empty-safe (38-11) | ✓ VERIFIED | Confirmed at `:37-98`, `:128` export; `node tests/38-11-bidi-isolate.test.js` → 7/7 PASS. |
| `assets/add-session.js` | `updateSessionTitle` isolates BOTH clientName and dateText (heading + `document.title`); guard functions + save-path wiring | ✓ VERIFIED | `isolate(` call confirmed at `:1726`; guards at `:90-103`, `:1182-1192`. |
| `assets/overview.js` | Session-meta and client-modal mixed runs isolated | ✓ VERIFIED | `isolate(` calls confirmed at `:803`, `:950`, `:963`. |
| `assets/app.js` | `showToast(message, key, options)` backward-compatible tone/focus API | ✓ VERIFIED | Confirmed at `:851-876`: `toast--error` class toggle, `TOAST_ERROR_MS`=4000 vs `TOAST_SUCCESS_MS`=1800, guarded `scrollIntoView`/`focus`. |
| `assets/app.css` | `.toast--error` variant using `--color-warning-*` tokens (dark-safe) | ✓ VERIFIED | Confirmed at `:1332-1335`; tokens present in both light/dark theme blocks in `assets/tokens.css:107-108,190-191`. |
| `assets/i18n-{en,he,de,cs}.js` | `toast.nextSessionDateIncomplete` + `toast.nextSessionDateTooEarly` keys, 4-language parity | ✓ VERIFIED | Present, non-empty, and terminologically consistent in all 4 files (grepped directly). |
| `tests/38-10-rtl-date-input.test.js`, `38-11-bidi-isolate.test.js`, `38-12-toast-tone-focus.test.js`, `38-next-session-partial-guard.test.js` | Falsifiable behavior tests, non-vacuous count guards | ✓ VERIFIED | Executed individually: 3/3, 7/7, 3/3, 7/7 — all PASS, no skips. |
| All artifacts verified in the 2026-07-07T09:10Z prior VERIFICATION.md (NEXT-01..08 core artifacts) | Unchanged / still present | ✓ VERIFIED (regression check) | Re-checked directly this session — no drift. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `html[dir="rtl"] input[type="date"]` cascade | `::-webkit-datetime-edit` inner block | CSS specificity override chain | ✓ WIRED | Base rule (0,1,1) beats inherited `direction:rtl`; RTL override (0,2,1) beats base for box alignment; inner `::-webkit-datetime-edit{direction:ltr}` restores native segment order — only these 3 rules exist, no conflicting earlier rule (re-confirmed by grep — single occurrence of each selector). |
| `updateSessionTitle` / overview meta / client-modal meta | `window.DateFormat.isolate()` | Direct function call wrapping each mixed-direction run | ✓ WIRED | 4 call sites confirmed (`add-session.js:1726` — both clientName and dateText; `overview.js:803,950,963`). |
| `saveSessionForm()` | `isNextSessionDateIncomplete` / `isNextSessionDateTooEarly` | Direct calls before the DB-persist write, at `:1182` and `:1189` | ✓ WIRED | Both guards call `App.showToast(..., { tone: "error", focus: nextSessionDateEl })` and `return null` before the write — mirrors the pre-existing `heartShieldRequired` block pattern. |
| `App.showToast` options param | `.toast--error` CSS class + focus/scroll | `toast.classList.add("toast--error")` + guarded `focusTarget.scrollIntoView()/.focus()` | ✓ WIRED | Confirmed at `app.js:859-870`; tone always reset at top of function so no stale tone leaks onto a later success toast. |
| add-session form validation call sites | `showToast(..., {tone:"error", focus})` | Migrated call sites in `assets/add-session.js` | ✓ WIRED | Code review (38-REVIEW.md) independently traced the migration; re-confirmed here at the guard call sites (`:1183`, `:1190`). |

### Data-Flow Trace (Level 4)

Not applicable in the classic dynamic-list-rendering sense for the 38-10/11/12 additions — these
are (a) a pure CSS cascade fix, (b) a pure string-isolation helper applied at fixed composition
sites, and (c) a pure toast-options API. Each was traced directly above (Key Link Verification)
rather than through a data-fetch pipeline. The core NEXT-01..08 overview-column data flow
(overview.js reading `clientSessions[0].nextSessionDate` via `mostRecentSession()`) was verified in
the prior report and is unchanged (regression-confirmed: `overview.js` sort/render tiebreak logic
untouched by the 38-10/11/12 diffs, confirmed by grep of the touched-file list in each SUMMARY).

### Behavioral Spot-Checks / Test Execution

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| RTL date-input CSS source gate | `node tests/38-10-rtl-date-input.test.js` | 3 passed, 0 failed | ✓ PASS |
| Bidi-isolate helper + call-site gates | `node tests/38-11-bidi-isolate.test.js` | 7 passed, 0 failed | ✓ PASS |
| Toast tone/focus + default-path regression | `node tests/38-12-toast-tone-focus.test.js` | 3 passed, 0 failed | ✓ PASS |
| Partial-guard + too-early-guard unit tests | `node tests/38-next-session-partial-guard.test.js` | 7 passed, 0 failed | ✓ PASS |
| Next-session field save/populate/reset/min | `node tests/38-next-session.test.js` | 6 passed, 0 failed | ✓ PASS |
| Overview sort (blanks travel with direction) | `node tests/37-overview-sort.test.js` | 9 passed, 0 failed | ✓ PASS |
| Overdue boundary (TZ-pinned) | `node tests/38-next-overdue.test.js` | 5 passed, 0 failed | ✓ PASS |
| i18n parity (new keys, 4 locales) | `node tests/25-11-i18n-parity.test.js` | included in full suite | ✓ PASS |
| Full regression suite | `node tests/run-all.js` | **131 passed, 0 failed, 131 total** | ✓ PASS |
| No debt markers in phase-38-touched files | `grep -n -E "TBD\|FIXME\|XXX" assets/app.css assets/app.js assets/add-session.js assets/overview.js assets/date-format.js tests/38-1*.js tests/38-next-session-partial-guard.test.js` | no matches | ✓ PASS |
| Scope containment (38-10/11/12 commits) | `git log --oneline` review of 18 commits spanning 38-10 through 38-12 | test-first sequencing confirmed (RED commit precedes GREEN commit in each plan) | ✓ PASS |

All tests executed directly in this verification session (not taken on SUMMARY.md's word).

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|-------------|--------|----------|
| NEXT-01 | 38-01, 38-03, 38-04, 38-09, 38-10, 38-12 | Field added, wired into add/edit save payloads; partial/too-early-entry saves guarded; RTL segment order fixed | ✓ SATISFIED | Truths 1, 9 — real-Safari confirmed (`38-UAT.md` tests 5, 6, 8 all `pass`/`resolved`) |
| NEXT-02 | 38-01, 38-04, 38-10 | Dynamic `min` bound to session's own date; RTL rendering doesn't break it | ✓ SATISFIED | Truth 2 (regression-checked, unchanged) |
| NEXT-03 | 38-02, 38-03, 38-05, 38-11 | Next Session overview column, both files; mixed-direction meta line isolated | ✓ SATISFIED | Truth 3; `38-UAT.md` test 7 resolved |
| NEXT-04 | 38-02, 38-03, 38-05, 38-08 | Sortable, blanks travel with direction | ✓ SATISFIED | Truth 4; human-verified pass (`38-UAT.md` test 3) |
| NEXT-05 | 38-01, 38-03, 38-05 | Overdue cue, strictly-before-today | ✓ SATISFIED | Truth 5; human-verified pass (`38-UAT.md` test 1) |
| NEXT-06 | 38-02, 38-06 | Export markdown/PDF renders date, note-OR-date gate | ✓ SATISFIED | Truth 6; human-verified pass (`38-UAT.md` test 4) |
| NEXT-07 | 38-02, 38-07 | Demo + backup parity | ✓ SATISFIED | Truth 7; human-verified pass (`38-UAT.md` test 2) |
| NEXT-08 | 38-01, 38-02, 38-06, 38-08, 38-09, 38-10, 38-11, 38-12 | Falsifiable tests pre-implementation across all gap-closure work | ✓ SATISFIED | Truth 8; full suite green (131/131); RED-first sequencing confirmed for each gap plan's commits |

All 8 REQUIREMENTS.md IDs (NEXT-01..08) are claimed by at least one plan's `requirements`
frontmatter. REQUIREMENTS.md's own coverage table marks all 8 "Complete" — this is now accurate at
both the code level AND the real-device human-verification level (all 5 UAT gap entries resolved).
No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `assets/add-session.js` | 1172-1174, 1202 | Stale comment claims a nonexistent second "save-then-export trigger" caller (carried-forward code-review IN-06) | Info | Documentation staleness only; `saveSessionForm()` has exactly one caller; does not affect behavior |
| `tests/38-next-session-partial-guard.test.js`, `tests/37-overview-sort.test.js`, `tests/38-11-bidi-isolate.test.js`, `tests/38-12-toast-tone-focus.test.js` | various | Docblocks/assertion messages still describe suites as "RED-by-design" / "RED until Plan X lands" even though everything is GREEN (code-review IN-13, carries IN-05/IN-07) | Info | Documentation staleness only; does not affect behavior; all suites confirmed GREEN by direct execution this session |
| `assets/overview.js` | 682 | `allRemoved` variable name contradicts its `.some()` (ANY) implementation (code-review IN-08) | Info | Pre-existing, in phase-38 scope file; naming clarity only, behavior is intentional |
| `assets/overview.js` | 943-957, plus `add-session.js` 4 sites | Age-0 falsy-check bug + duplicated age math (code-review IN-09) | Info | Pre-existing; edge case for clients under 1 year; not introduced by Phase 38 |
| `assets/overview.js` | 163-175 | Backup restore triggers two concurrent full re-renders (code-review IN-10) | Info | Waste, not corruption; latent interleaving hazard only if render stops being idempotent |
| `assets/demo-seed.js` | 30-47 | `applyRelativeDates` would emit "NaN-NaN-NaN" for a seed session missing `daysAgo` (code-review IN-11) | Info | Latent; all 11 current seed sessions carry the key, so not currently triggered |
| `assets/overview.js` | 799-803 | Session-meta isolates only the date run, not the session-type run (code-review IN-12) | Info | Cosmetic-only residual exposure for custom mixed-direction session-type labels; the 38-11 gate still passes |

No `TBD`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER` debt markers found in any phase-38-touched file
(re-grepped directly this session). No Critical anti-patterns. All Info items above are
pre-existing/cosmetic and do not block the phase goal; none are new blockers introduced by the
38-10/11/12 gap-closure work.

### Code Review Follow-up (38-REVIEW.md, full-scope review incl. gap-closure work)

- 0 Critical, 2 Warning, 6 new Info, 4 carried-forward Info.
- **WR-03** (advisory, not a phase-goal blocker): the 38-12 error-toast auto-focus mechanism
  silently no-ops when the offending field's mobile accordion is collapsed — the toast fires but
  the field is never revealed on a phone. This is a real UX gap on mobile Safari specifically, but
  it does not invalidate the phase goal (desktop is unaffected; the feature works as verified
  on-device in the reported desktop-Safari retest). Recommend tracking as a fast-follow.
- **WR-04** (advisory, not a phase-goal blocker): the reusable error-tone API landed and was
  adopted on add-session's validation toasts (in scope for Phase 38 / UAT test 8), but sibling
  pages (add-client, export-modal, backup-modal) still render their own error toasts with the
  success style. Out of Phase 38's declared scope (NEXT-01..08 concern the next-session-date
  feature specifically); flagged for a future sweep, does not block this phase's goal.
- Both warnings are pre-existing gaps in a broader "error visibility" concern that Phase 38 started
  (via UAT test 8) but did not scope to fully complete across the whole app — this is consistent
  with the phase's declared goal (next-session-date field + overview column), which does not
  promise app-wide error-toast consistency.

## Human Verification Required

None. All items requiring human/on-device verification were resolved during the UAT retest cycle:

- Overdue visual cue (LTR/RTL/dark) — `38-UAT.md` test 1, pass.
- Demo column readability — `38-UAT.md` test 2, pass.
- Sort direction with blanks — `38-UAT.md` test 3, pass (retested after 38-08).
- Export date-only rendering — `38-UAT.md` test 4, pass.
- Partial-date save guard, real Safari — `38-UAT.md` test 5, pass (retested after 38-09; badInput fires at submit time, confirmed).
- RTL native date-input segment order — `38-UAT.md` test 6, resolved (38-10, on-device approved: "38.10 looks good now").
- Latin name + Hebrew month-name date bidi scramble — `38-UAT.md` test 7, resolved (38-11, on-device approved: "38.11 is fine").
- Warning-toast visibility/focus/too-early-date guard — `38-UAT.md` test 8, resolved (38-12, on-device approved).

`38-UAT.md` frontmatter status is `resolved`; all 5 `Gaps` entries carry `status: resolved` with
on-device evidence quoted from Ben directly.

## Gaps Summary

No gaps. All 9 observable truths verified, all required artifacts present/substantive/wired, all
key links confirmed, the full 131-file regression suite is green, no new debt markers, and every
item that previously required human/on-device verification has been closed with quoted real-Safari
approval from Ben (2026-07-07). The two advisory code-review warnings (WR-03 mobile-accordion focus
edge case; WR-04 error-tone adoption gap on other pages) are legitimate follow-up items but are
outside this phase's declared NEXT-01..08 scope and do not block goal achievement — recommend
capturing them as backlog items for a future phase.

---

_Verified: 2026-07-07T14:10:00Z_
_Verifier: Claude (gsd-verifier)_
