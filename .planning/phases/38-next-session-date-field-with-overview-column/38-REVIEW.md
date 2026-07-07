---
phase: 38-next-session-date-field-with-overview-column
scope: full Phase 38 review including gap-closure work (38-09/10/11/12) — supersedes the 38-09 scoped re-review
reviewed: 2026-07-07T12:00:00Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - add-session.html
  - assets/add-session.js
  - assets/app.css
  - assets/app.js
  - assets/date-format.js
  - assets/demo-seed-data.json
  - assets/demo-seed.js
  - assets/export-modal.js
  - assets/i18n-cs.js
  - assets/i18n-de.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/overview.js
  - demo.html
  - index.html
  - tests/30-export-markdown.test.js
  - tests/30-form-dirty-revert.test.js
  - tests/30-section-visibility.test.js
  - tests/35-demo-seed.test.js
  - tests/37-overview-sort.test.js
  - tests/38-10-rtl-date-input.test.js
  - tests/38-11-bidi-isolate.test.js
  - tests/38-12-toast-tone-focus.test.js
  - tests/38-next-overdue.test.js
  - tests/38-next-session.test.js
  - tests/38-next-session-partial-guard.test.js
findings:
  critical: 0
  warning: 2
  info: 6
  total: 8
status: issues_found
carried_forward: "IN-04, IN-05, IN-06, IN-07 (all Info, doc/comment staleness) — re-verified still open in current source; restated in the Carried-Forward section"
prior_review: "38-09 scoped re-review (this file's predecessor, preserved in git history): WR-02 (Safari badInput premise) RESOLVED — UAT test 5 field-verified in real Safari (commit a7b06e8) and the 38-12 error-tone + rangeUnderflow guard approved on-device (commit bff5cca); its IN-06/IN-07 remain open and are carried forward below"
---

# Phase 38: Code Review Report

**Reviewed:** 2026-07-07
**Depth:** standard
**Files Reviewed:** 26 (full Phase 38 scope incl. gap-closure plans 38-09/10/11/12)
**Status:** issues_found (0 Critical, 2 Warning, 6 new Info, 4 carried-forward Info)

## Narrative Findings (AI reviewer)

### Summary

Full-scope adversarial review of the Phase 38 next-session-date feature plus the just-landed
gap-closure work: the RTL date-input direction rules in `assets/app.css` (38-10), the
`DateFormat.isolate` FSI helper and its call sites (38-11), the `showToast` tone/focus options
+ `.toast--error` variant (38-12), and the `#nextSessionDate` badInput/rangeUnderflow save
guards (38-09/38-12).

What was traced and verified against real source + execution (not assumed):

- **All 11 test suites in scope executed GREEN** (38-10 3/3, 38-11 7/7, 38-12 3/3,
  38-next-overdue 5/5, 38-next-session 6/6, 38-next-session-partial-guard 7/7,
  30-export-markdown 5/5, 30-form-dirty-revert 5/5, 30-section-visibility 6/6,
  35-demo-seed 4/4, 37-overview-sort 9/9). Every suite carries a non-vacuous count guard.
- **Bidi codepoints verified at byte level** (`perl -CSD` over `assets/date-format.js`):
  LRI U+2066 / PDI U+2069 (numeric-format path) and FSI U+2068 (`isolate()`) are the correct
  characters — the invisible-character hazard class from the Phase-29 clipboard incident does
  not recur here (FSI/PDI are format characters, not control characters; safe in
  `textContent` and `document.title`).
- **`isolate()` contract is correct**: nullish/empty → `""` (never a bare isolate pair);
  nesting over an already-LRI-wrapped Hebrew numeric date is legal under UBA (depth ≪ 125).
  Call sites (`updateSessionTitle` both runs, overview session-meta date, client-modal
  age/type runs) match the 38-11 spec.
- **Save guards are fail-open in the right direction**: `isNextSessionDateIncomplete` keys
  strictly on `validity.badInput`, `isNextSessionDateTooEarly` strictly on
  `validity.rangeUnderflow`; null element / missing validity → allow. Both sit at the single
  DB-persist choke point in `saveSessionForm()` (grep-verified: the submit listener is its
  only caller; export is read-mode-only and never saves). `sessionForm.noValidate = true`
  (`assets/add-session.js:340-342`) guarantees the submit event reaches the guards instead of
  a native validation bubble. Same-day (`value == min`) correctly passes (D-08).
- **`min` sync is race-free at save time**: `syncNextSessionMin` runs on boot, on
  `#sessionDate` change, and inside `populateSession`; clicking Save blurs the date input so
  `change` fires before submit. Empty session date removes `min` entirely (never min=today),
  and the empty-date save is blocked earlier by the required-date check.
- **CSS direction cascade verified**: base `input[type="date"] { direction: ltr }` (0,1,1)
  beats the inherited `html[dir="rtl"]` direction; the RTL override (0,2,1) beats the base;
  the `::-webkit-datetime-edit { direction: ltr }` inner rule restores native segment order.
  Only these three `input[type="date"]` rules exist in app.css — no conflicting earlier rule.
  On-device Safari approval recorded (commits 1838dea, bff5cca).
- **`.toast--error` tokens exist in both themes** (`assets/tokens.css:107-108` light,
  `:190-191` dark); the variant overrides both `background` and `color`, and `showToast`
  removes the error class at the top of every call so a stale tone can never leak onto a
  later success toast. The shared `_timer` is cleared before rescheduling.
- **i18n parity executed**: all four locale files carry exactly 561 keys, zero duplicates,
  zero missing/extra keys vs en (scripted set-diff). `toast.nextSessionDateIncomplete` /
  `toast.nextSessionDateTooEarly` present and terminologically consistent in all 4.
- **Demo seed self-freshening verified by data extraction**: 5 sessions carry
  `nextSessionDaysAgo`; exactly one (client 25, `+4` = 4 days ago) is deliberately overdue —
  matching the 35-demo-seed `pastTodayCount <= 1` gate; every computed next-date ≥ its own
  session date.
- **Overview sort/cell consistency**: the `nextSession` sort branch derives the next-date via
  `mostRecentSession()` with the identical date-desc/createdAt-desc/id-desc tiebreak the cell
  render uses, so the sorted value always equals the displayed value (D-01). The
  `9999-12-31` blank sentinel rides `dir * base` so blanks land bottom-ascending /
  top-descending (revised D-03) — pinned by the updated 37-overview-sort cases.
- **Overdue predicate**: strictly `<` today-local via `parseLocal(todayLocalISO())` — the
  UTC-midnight off-by-one class is dead here; TZ-pinned test proves the boundary.
- **No injection surfaces introduced**: every new render site (`nextSessionCell`, overdue
  dot, session-meta, modal meta) is `textContent`/`createTextNode`-only; no innerHTML with
  data. No secrets, no debug artifacts (the one `console.log` in `requestPersistentStorage`
  is deliberate and commented).

Two Warnings stand: the 38-12 focus mechanism silently degrades inside collapsed mobile
accordions (the exact "warning visibility" UX this plan set out to fix), and the error-tone
API landed but its adoption stopped at add-session, leaving the same i18n key rendered as a
success pill on one page and an error toast on another — with backup import/export failures
still success-styled.

## Warnings

### WR-03: Error-toast focus target is invisible when its mobile accordion is collapsed — the 38-12 "bring the field to the user" mechanism silently no-ops there

**File:** `assets/app.js:866-870` (showToast focus block), `assets/add-session.js:1181-1192`
(guard call sites), `assets/app.css:2247-2255` (accordion collapse)
**Issue:** `#nextSessionDate` (and the `shieldRemoved` radios) live inside the "Session
Notes" accordion (`add-session.html:312-359`). On mobile (≤768px) a collapsed
`.accordion-section .accordion-body` is `max-height: 0; overflow: hidden` — the element stays
in layout but is clip-hidden. `showToast`'s `scrollIntoView() + focus()` on such a target
scrolls to the collapsed section and focuses an element the user cannot see; the accordion
does not open on focus. Repro: on a phone, type a partial/too-early next-session date in the
Notes accordion, tap another accordion header (Notes auto-closes — the accordion is
exclusive), tap Save at the form bottom. The error toast fires, but the offending field is
never revealed — recreating the "nobody notices the block" defect 38-12 was built to fix,
on the platform (mobile Safari) where the badInput scenario originates. Desktop is unaffected
(accordions forced open ≥769px).
**Fix:** Before focusing, expand the owning accordion. Either in `showToast`'s focus block
(generic) or at the add-session call sites (scoped):

```js
// assets/app.js — inside the focusTarget block, before scrollIntoView:
if (typeof focusTarget.closest === "function") {
  const section = focusTarget.closest(".accordion-section");
  if (section && !section.classList.contains("is-active")) {
    section.classList.add("is-active"); // matches the accordion-header click behavior
  }
}
```

(If exclusive-accordion behavior must hold, also remove `is-active` from siblings, mirroring
the header-click handler at `assets/add-session.js:1348-1358`.) Add a jsdom case asserting the
closest `.accordion-section` carries `is-active` after an error toast with a focus target.

### WR-04: Error-tone adoption is inconsistent — the same error key renders success-styled on other pages, and backup/export failures still look like success

**File:** `assets/add-client.js:125,214` · `assets/export-modal.js:666,698` ·
`assets/backup-modal.js:292,345` (contrast: `assets/add-session.js:488,1074,1130-1190`)
**Issue:** 38-12 added the reusable `{ tone: "error", focus }` API and adopted it on every
add-session validation toast, but every other genuine error toast still renders as the
success pill with the 1800 ms dismiss: `toast.errorRequired` is error-toned on add-session
(`add-session.js:1074`) yet success-styled on add-client (`add-client.js:214`) — the SAME
message, two contradictory visual treatments depending on page. Worse, the failures with the
highest cost of being missed — `export.pdf.failed` (export-modal.js:666,698) and the backup
`toast.exportError` / import-failure toasts (backup-modal.js:292,345) — still look identical
to "saved successfully" and vanish in 1.8 s. The exact UAT-test-8 defect ("the block warning
looks exactly like success, nobody notices") remains live at every error site outside
add-session. The showToast docblock itself promises the option is "reusable by any error
toast".
**Fix:** Sweep the remaining error-path call sites and pass `{ tone: "error" }` (plus a
`focus` target where a specific field is at fault, e.g. `#addClientFirstName` for
add-client's `toast.errorRequired`). Mechanical change; the 38-12 test already pins that the
default path is untouched. If deferring, capture it as a tracked backlog item so the
inconsistency doesn't fossilize.

## Info

### IN-08: `allRemoved` name contradicts its `.some()` implementation

**File:** `assets/overview.js:682`
**Issue:** `const allRemoved = heartShieldSessions.some(s => s.shieldRemoved === true)` —
the behavior ("show ✅ if ANY session removed the shield") is intentional per commit 79b7674
("heart badge shows removed if any session has shield removed"), but the name asserts the
opposite quantifier. A future reader "fixing" the name-to-logic mismatch in either direction
would flip clinical-status display semantics. Pre-existing; file is in Phase 38 scope.
**Fix:** Rename to `anyRemoved` (or `shieldRemovedInAnySession`) and add a one-line comment
citing the intent.

### IN-09: Age 0 is treated as "missing birth year"; age math duplicated at four sites

**File:** `assets/overview.js:943-957`, `assets/add-session.js:494,1080,1651-1654`
**Issue:** `if (displayAge)` is falsy for a valid age of 0 (client under 1 year — plausible
for the `child`/`animal` types), so the modal shows the "add birth year" link despite a valid
`birthDate`. The `Math.floor((Date.now() - birthDateParsed) / (365.25 * 24 * 60 * 60 * 1000))`
expression is copy-pasted at four sites across two files.
**Fix:** Extract a shared `App.computeAge(birthDate)` (returns `number | null`) and test
`displayAge != null` instead of truthiness.

### IN-10: Backup restore triggers two concurrent full overview re-renders

**File:** `assets/overview.js:163-175` (with the `app:language` listener at :540-544)
**Issue:** `__afterBackupRestore` calls `App.setLanguage(...)` — which dispatches
`app:language`, whose listener already calls `loadOverview()` — and then explicitly calls
`loadOverview()` again. Two concurrent IDB reads + row renders race; the outcome is identical
data so this is waste, not corruption, but it doubles restore-time work and is a latent
interleaving hazard if the render ever stops being idempotent.
**Fix:** Either drop the explicit `loadOverview()` (the language event covers it) or have
`__afterBackupRestore` set a one-shot flag the `app:language` listener checks. Document
whichever path renders.

### IN-11: `applyRelativeDates` emits "NaN-NaN-NaN" dates for a seed session missing `daysAgo`

**File:** `assets/demo-seed.js:30-47`
**Issue:** `copy.date = isoDaysAgo(s.daysAgo, now)` runs unconditionally; a future seed edit
that omits the integer `daysAgo` yields `setDate(getDate() - undefined)` → Invalid Date →
`"NaN-NaN-NaN"` silently seeded into the demo DB (the `nextSessionDaysAgo` branch guards
null/undefined; the `daysAgo` branch does not). All 11 current sessions carry the key, so
this is latent, and the 35-demo-seed schema gate would not catch it (the key union allows a
string `date`).
**Fix:** Mirror the next-date guard: `if (Number.isInteger(s.daysAgo)) { … } ` else keep/skip
with a `console.warn`, or add a `/^\d{4}-\d{2}-\d{2}$/` assertion on the computed date in the
seed test.

### IN-12: Overview session-meta isolates only the date run, not the session-type run

**File:** `assets/overview.js:799-803`
**Issue:** `meta.textContent = isolate(formatDate(date)) + " • " + formatSessionType(type)` —
the date can no longer scramble (isolated), but a user-defined custom session-type label with
mixed direction (e.g. `"Zoom מרחוק"`) is still a bare run against the bullet under
`html[dir=rtl]`. The sibling sites (client modal :950/:963, `updateSessionTitle`) isolate
both runs. Residual, cosmetic-only exposure; the 38-11 gate (B2, `>= 2` isolate calls) passes
without it.
**Fix:** `meta.textContent = \`${isolate(...date...)} • ${isolate(App.formatSessionType(session.sessionType))}\``.

### IN-13: Stale "RED until Plan 38-XX lands" framing across the four landed 38-x test suites

**File:** `tests/38-next-session.test.js:4,39,183,210,225,240,275` ·
`tests/38-11-bidi-isolate.test.js:23,67,89` · `tests/38-12-toast-tone-focus.test.js:3,26-30,41,159` ·
`tests/38-next-session-partial-guard.test.js:4,29-33,45,249,301,308`
**Issue:** Same failure class as the carried-forward IN-05/IN-07: docblocks and assertion
messages still describe these suites as RED-by-design pending plans that have all landed
(everything is GREEN 21/21 across the four files, verified by execution). A future session
hitting a real regression in one of these could misread the failure as "expected RED".
**Fix:** One sweep: reword headers to "regression pin (originally authored RED-first)", move
"WHY IT IS RED TODAY" sections to past tense, drop the "(RED until …)" parentheticals from
assertion messages. No assertion logic changes.

## Carried-Forward Open Findings (re-verified still open in current source)

### IN-04: Stale hardcoded line references to the render tiebreak comparator

**File:** `assets/overview.js:616-618`, `tests/37-overview-sort.test.js:280`
**Issue:** Both still cite the render comparator at ":619-626"; it lives at
`assets/overview.js:658-665` and drifts with every edit.
**Fix:** Replace line-number citations with the stable anchor (the `renderClientRows()`
`clientSessions.sort` tiebreak: date desc → createdAt desc → id desc).

### IN-05: 37-overview-sort docblock still claims RED state for landed features

**File:** `tests/37-overview-sort.test.js:2,6,11,39,278,345,362`
**Issue:** Header still says "TDD RED … It FAILS RED now"; all 9 cases GREEN (executed).
**Fix:** Same sweep as IN-13.

### IN-06: `saveSessionForm` comments still claim a nonexistent "save-then-export trigger" caller

**File:** `assets/add-session.js:1172-1174,1202`
**Issue:** Both comments assert a second caller that does not exist — the submit listener is
the sole caller (grep-verified again this review); export is read-mode-only and never saves.
**Fix:** Reword to "the submit handler is the SOLE caller of saveSessionForm".

### IN-07: Partial-guard test docblock hard-codes stale RED framing

**File:** `tests/38-next-session-partial-guard.test.js:4,29-33,45`
**Issue:** Landed and GREEN 7/7; subsumed by the IN-13 sweep.
**Fix:** Include in the IN-13 sweep.

---

_Reviewed: 2026-07-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard (full Phase 38 scope, 26 files, all in-scope test suites executed)_
