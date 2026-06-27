---
phase: 30-test-harness-coverage
verified: 2026-06-27T10:00:00Z
re_audited: 2026-06-27T15:00:00Z
status: gaps_found
score: "4/4 must-haves met at requirement level — but the Phase-31 safety net is incomplete (13 god-module regions audited; 4 high-risk + 6 med-risk holes, 2 confirmed fake tests)"
behavior_unverified: 0
audit_method: "13-region multi-agent finder + adversarial refutation. Every verdict is backed by (a) executing the test (`node tests/<file>.test.js`) and (b) a quoted assertion line — not by counting files that mention a module."
supersedes: "the prior `status: passed (4/4)` verdict (kept below under Requirements Coverage); that verdict was correct at the must-have level but did not characterize the net's completeness for Phase 31."
---

# Phase 30: Test Harness & Coverage — Verification Report (RE-AUDITED)

**Phase Goal:** A green automated test suite runs from a single documented command and captures the current behavior of the god modules, establishing the safety net that the Phase 31 refactor will be guarded by.

**Status:** `gaps_found` — the four locked requirements (TEST-01..TEST-04) are met **at the must-have level** (suite is green, 94 files, single command, PDF tests fixed, RTL guard real). **But the goal's second clause — "captures the current behavior of the god modules, establishing the safety net Phase 31 will be guarded by" — is only partially achieved.** A full coverage audit over `settings.js` (2,969 lines) and `add-session.js` (2,173 lines) found **2 god-module regions with no coverage at all, 3 regions covered only at the leaf-function level (wiring unprotected), and 2 confirmed fake (source-slicing) tests** — exactly the holes a "rests on a strong auto-test net" expectation would not tolerate.

## Why this report was rebuilt

The prior verification (`status: passed`) checked that the 7 new test files exist, run green, and execute real code — all true. What it did **not** do is audit the *old* tests the phase leaned on. `30-RESEARCH.md` (line 200) claimed most of the two god modules were "already covered" by the 24-xx/25-xx suites and so scoped Phase 30 to only the "uncovered" parts. That judgment was **never re-checked during the phase**, and it is partly wrong:

- It **credited the wrong files**: the settings.js Backups tab (IIFE-4) and Photos tab (IIFE-5) were called "EXTENSIVELY covered" by `25-04`/`25-05`/`25-06` — but those tests load `assets/backup.js` and `assets/crop.js`, **different modules**. They pin the backup/crop *engines*, not the settings.js *screen wiring* that Phase 31 moves. (Confirmed below.)
- It **counted leaf coverage as region coverage**: the snippet UI (IIFE-2) and add-session bottom functions (B8) have many real leaf-function tests but **zero** tests of the screen wiring (editor open/save/delete, dropdown population, spotlight render) that the refactor rearranges.
- It **left a "DO NOW" region with no plan**: form dirty/revert (B6) was listed as DO-NOW in research but assigned to no plan; no test references it.

This is the "coverage = counting file-mentions, not running the code" failure recorded in memory `feedback-test-coverage-count-not-real`. This re-audit ran the code.

## Audit method (falsifiable, not vibes)

13 finder agents (one per god-module region) each: identified the candidate test files, **ran each one** (`node tests/<file>.test.js`), confirmed *which* asset the test actually `eval`/`vm`/`jsdom`-loads (to catch the "loads a different file" trap), read the assertions and classified them **behavioral** (observable output/DOM/persistence) vs **structural** (source text / function existence), and judged whether the region's **wiring** (load→render→init→event-handler) is exercised or only its leaf pure-functions. Every region's `missing`/`fake`/`weak` verdict then went to a **second, independent agent that tried to refute it** (prove coverage exists elsewhere). **All skeptical verdicts survived refutation; none were overturned.** A mechanical fake-detector grep (reads an asset as text but has zero `vm`/`eval`/`jsdom` markers) seeded the suspect list.

---

## Requirements Coverage (must-have level — STILL SATISFIED)

These four are genuinely met; this is unchanged from the prior verification. The gaps below are about net *completeness*, not requirement failure.

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| TEST-01 | 7 unrunnable PDF tests run green in Node | SATISFIED | shared `tests/_helpers/jsdom-pdf-env.js` (`getContext→null` stub); all 7 PASS; `engines.node>=18` floor |
| TEST-02 | RTL regression guard fails if `dir=rtl` on non-Hebrew | SATISFIED | `30-rtl-guard.test.js` 5/5; evals real `app.js`, asserts `documentElement` dir |
| TEST-03 | Behavior tests capture observable behavior of the god modules | **SATISFIED (must-have) / INCOMPLETE (net)** | 7 new char tests execute real modules under jsdom — but see Coverage Map: 5 of 13 regions are weak/missing |
| TEST-04 | Full suite runs via single documented command | SATISFIED | `npm test` → 94/94, exit 0 |

The nuance the prior report missed: **TEST-03's must-have ("tests capture *some* observable behavior and pass") is met; the goal's intent ("the safety net Phase 31 will be guarded by") is not yet.**

---

## Coverage Map (13 god-module regions)

Verdict legend: **real** = executes the real module + behavioral assertions + wiring covered · **weak** = executes the real module but only leaf-level / structural, region wiring uncovered · **fake** = claims to cover but never executes the module (source-slicing) · **missing** = no meaningful coverage. `p31_risk` = likelihood Phase 31 breaks this region **undetected** by the current net.

### Module A — `assets/settings.js` (2,969 lines; 5 IIFEs)

| Region (lines) | Real covering test(s) | Executes real `settings.js` | Assertions | Wiring covered | Verdict | p31_risk | Disposition |
|---|---|---|---|---|---|---|---|
| **A1** IIFE-1 Section-title editor + saved-notice (14–688) | `30-settings-section-roundtrip` (real); `29-03-report-wiring` (real but leaf-only) | yes (`30-...:142 win.eval`) | behavioral | yes (boot→Save/Discard) | **real** | med | strengthen |
| **A2** IIFE-2 Snippet Settings UI (712–2018) | 8 leaf tests (`24-05-*`, `quick-260619-*`, `quick-260620-p3f`, `quick-260626-h5j`) | yes (`vm.runInContext`) — **leaf helpers only** | behavioral (leaf) | **no** | **weak** | **high** | write-new |
| **A3** IIFE-3 Tab nav (2035–2113) | `30-settings-tabnav` (real) | yes (`:104 win.eval`) | behavioral | yes | **real** | low | keep |
| **A4** IIFE-4 Backups tab (2135–2344) | `25-12-custom-days-visibility`, `25-12-schedule-saved-toast` (real) | yes (`vm.runInContext` + `_fireReady`) | mixed | partial | **real** | med | strengthen |
| **A5** IIFE-5 Photos tab (2370–2969) | `25-07-delete-all-photos`, `25-11-toast-behavior`, `25-12-optimize-{estimate-floor,verdict,stale-estimate}`, `25-12-photos-usage-language-rerender` (real) | yes (`vm.runInContext`) | mixed | yes (render/handlers) | **real** | med | strengthen |

### Module B — `assets/add-session.js` (2,173 lines; one `DOMContentLoaded` IIFE + free fns)

| Region (lines) | Real covering test(s) | Executes real `add-session.js` | Assertions | Wiring covered | Verdict | p31_risk | Disposition |
|---|---|---|---|---|---|---|---|
| **B1** Textarea autogrow (17–34) | `quick-260516-rna-textarea-autogrow` (real leaf) | yes (`:145 vm.runInContext`) — leaf `computeGrowHeight` only | mixed (leaf behavioral; wiring structural) | **no** | **weak** | med | strengthen |
| **B2** Markdown builders (730–1180) | `30-export-markdown` (real) | yes (`:132 win.eval`) | behavioral | yes (load→export→clipboard) | **real** | low | keep (+delete fake) |
| **B3** Export modal stepper (1180–1835) | `30-export-stepper` + `30-export-markdown` (real) | yes (`:142 win.eval`) | mixed | yes (open→step→share) | **real** | med | strengthen |
| **B4** Section visibility/labels (901–1054) | `30-section-visibility` (real) | yes (`:112 win.eval`) | behavioral | partial (new-session only) | **real** | med | strengthen |
| **B5** Issue mgmt — delta/payload/validation (502–662) | `30-issue-delta` (real) | yes (`:129 win.eval` + real `app.js` severity) | behavioral | yes | **real** | low | keep |
| **B6** Form dirty/revert (679–718) | **NONE** | no | none | no | **missing** | **high** | write-new |
| **B7** Read mode (178–283) | **NONE** | no | none | no | **missing** | **high** | write-new |
| **B8** Bottom free fns — clients/spotlight (1865–2173) | `24-06-spotlight-session-info` (real leaf `renderSpotlightSessionInfo` only) | yes (`:113 vm.runInContext`) — leaf only | mixed | **no** | **weak** | **high** | write-new |

**Summary:** 8 real · 3 weak (A2, B1, B8) · 2 missing (B6, B7) · 0 fully fake regions — but 2 individual *test files* are fakes (see Gaps GAP-05/GAP-06) and 1 test has a fake sub-case (GAP-15). **High-risk holes: A2, B6, B7, B8.**

---

## Gaps

Each entry is concrete enough for `/gsd-plan-phase 30 --gaps` to plan a test from. "Test type" is `real-page jsdom` (load the real `*.html` body + `win.eval(readAsset(...))` + drive handlers) or `vm-exec` (`vm.runInContext` a leaf with `__testExports`). Ordered high→low.

### HIGH p31-risk (a Phase-31 break here passes the current net GREEN)

**GAP-01 — `add-session.js` form dirty/revert is entirely untested (F1 confirmed)**
- **Region:** B6 (lines 679–718): `snapshotFormState`, `revertSessionForm`, `updateCancelButtonLabel`, `window.PortfolioFormDirty`.
- **What's missing:** snapshot→edit→revert restoration, the dirty flag driving `App.installNavGuard`, and the cancel-button label flip (`confirm.cancel` ⇄ `session.discard`) have **zero** assertions.
- **Evidence:** `grep -rln "snapshotFormState|revertSessionForm|updateCancelButtonLabel|PortfolioFormDirty" tests/` → **0 matches**. All four functions live inside the `DOMContentLoaded` closure (`add-session.js:44`), and only `computeGrowHeight` is exported on `window.__addSessionTestHooks` (`:38-41`). Refuter confirmed: four jsdom tests parse the closure but none assert any region symbol (`30-issue-delta`'s only "dirty"-adjacent token is `cancelable:true` at `:179`).
- **Test type:** real-page jsdom. Load `add-session.html` + `add-session.js`, dispatch `DOMContentLoaded`, edit a field → assert `PortfolioFormDirty()===true` + cancel label === `t('session.discard')`; click revert → assert fields restored + `PortfolioFormDirty()===false` + label === `t('confirm.cancel')`.
- **Disposition:** write-new.

**GAP-02 — `add-session.js` read mode + edit-client modal entirely untested (NEW — not in seed findings)**
- **Region:** B7 (lines 178–283): `setReadMode`, `applyCopyLabels`, `resizeReadModeTextareas`, `clearReadModeTextareas`, `openEditClientModal`/`closeEditClientModal`.
- **What's missing:** read-only rendering of a past session (body `read-mode` class, submit hidden / edit+copy+export shown, all inputs disabled, severity/issue buttons disabled, D-02/D-06 cancel logic) and the edit-client modal open/close. No test asserts any of it.
- **Evidence:** `grep -ln` for `setReadMode|applyCopyLabels|resizeReadModeTextareas|openEditClientModal|closeEditClientModal|editClientModal` across `tests/*.test.js` → **0 files**. Region lives inside the `DOMContentLoaded` closure; the only `add-session.js` vm-loader (`quick-260516-rna`) stubs `addEventListener(){}` (`:115`) so the closure never runs. Export tests click `#exportSessionBtn`/`#copySessionBtn` directly (`30-export-markdown:170,266`), bypassing the `setReadMode` visibility wiring. Refuter upheld `missing`.
- **Test type:** real-page jsdom. Load `add-session.html?sessionId=<existing>`, let `DOMContentLoaded` run, assert `body.classList.contains('read-mode')`, submit hidden + edit/copy/export visible, inputs `readOnly`/`disabled`; click edit → modal populates + shows; close → modal hides.
- **Disposition:** write-new.

**GAP-03 — `settings.js` snippet UI screen-wiring untested; only leaf helpers covered (F2 expanded)**
- **Region:** A2 (lines 712–2018). Leaf helpers (`isTriggerUnique`, `validateImportPayload`, `detectImportCollisions`, `filterSnippetList`, `isModifiedSeed`, `isValidTrigger`, `hyphenateSpaces`, `getCrossLangWarning`, `commitPendingTag`) **are** behaviorally pinned by 8 real tests — **keep those.** The gap is the wiring Phase 31 rearranges: `openEditor`, `handleSave` (guard order, multi-locale expansion assembly, `updatedAt` bump, add-vs-update branch, persist + "saved" toast), `handleDelete`, `handleImport`→`applyImport` collision-merge, `renderSnippetList`, and all `boot()` event bindings (1909–2002).
- **Evidence:** `grep -nE 'openEditor\(|handleSave\(|handleDelete\(|handleImport\(|applyImport\(|renderSnippetList\(' tests/*.test.js` → only comment lines, **zero real call sites**. `settings.js:863-874` exports only leaf helpers on `window.__SnippetEditorHelpers`. Refuter confirmed: `30-settings-tabnav` and `30-settings-section-roundtrip` do load settings.js into jsdom but invoke `captured[2]` (IIFE-3) and `captured[0]` (IIFE-1) respectively — neither invokes the snippets boot `captured[1]` (`boot()` at `settings.js:1898`).
- **Test type:** real-page jsdom (or fake-DOM driving the boot). Drive `openEditor`→edit→`handleSave`→assert persisted record (stub `PortfolioDB`) + "saved" toast; `handleDelete` confirm/delete/toast; `handleImport`→`applyImport` collision merge.
- **Disposition:** write-new (this is fix #2 from the pre-approved list — the "settings.js tab-wiring tests").

**GAP-04 — `add-session.js` client/spotlight wiring weak; only one leaf pinned (NEW)**
- **Region:** B8 (lines 1865–2173). `renderSpotlightSessionInfo` **is** fully pinned by `24-06-spotlight-session-info` (real module, sort/tiebreak/empty-state) — **keep it.** The gap: `loadClients` dropdown population (placeholder + `__new__` option + name-sort + pre-select), the async `populateSpotlight` wrapper (refs, age, photo, notes, IDB lookup), `updateSessionTitle` (`.section-title` + `document.title`), and `populateSession` form-fill — none are behaviorally asserted.
- **Evidence:** `24-06` header (`:30-35`) states it is "intentionally BLIND to the async `populateSpotlight` wrapper"; EPILOGUE exports only `renderSpotlightSessionInfo`. `loadClients` runs at init in `30-export-markdown`/`30-issue-delta` but its output is never asserted and `30-issue-delta:167-175` even **overrides** it (`select.appendChild(opt)`). `grep` over `tests/*.test.js`: `clientSpotlight*` ids = 0, `updateSessionTitle` = 0, `document.title` = 0, `getClientDisplayName` = 0. `populateSession` has only a structural source-slice (`quick-260516-rna:89-95`). Refuter upheld `weak`/high.
- **Test type:** real-page jsdom. Seed mock clients, fire init, assert `clientSelect` option set/order/pre-select; on a real `?clientId` URL assert `populateSpotlight` renders name/age/photo/notes + session-info; assert `updateSessionTitle` sets `.section-title` + `document.title`; assert `populateSession` fills fields + renders issue blocks.
- **Disposition:** write-new (keep `24-06`).

### Confirmed FAKE tests (delete / replace — F3, F4)

**GAP-05 — DELETE `quick-260615-export-section-order.test.js` (F3 confirmed fake)**
- **Region:** B2 markdown builders. **What's wrong:** claims to test export/copy section *order* (a therapist-visible behavior) but only `SRC.indexOf('function '+name+'(')` + `SRC.slice(...)` to extract a function body, then regex-counts `getSectionLabel(` call order over the **source text** — it never runs the builders.
- **Evidence:** `quick-260615-export-section-order.test.js:39` `fs.readFileSync(...add-session.js)`, `:57-62` source-slicing, `:66-74,95` structural regex; `grep` for `eval/vm/jsdom` in the file = **NONE**. It would stay green through a refactor that breaks the emitted order, and would false-fail on an internal rename. Superseded by `30-export-markdown` (real).
- **Disposition:** delete.

**GAP-06 — DELETE/REPLACE `quick-260516-g7p-save-returns-to-session.test.js` (F4 confirmed fake)**
- **Region:** add-session save→redirect (B8-adjacent). **What's wrong:** source-slices the save handler (`SRC.indexOf('if (deleteButton)')` … `region.lastIndexOf('formSaving = true;')`, `:65-72`) and **re-implements** the navigation from a regex over source text (`:85-100`). It never executes the module; it tests a hand-rewritten copy of the logic.
- **Evidence:** fake-detector flagged it (reads asset, 0 exec markers); B7/B8 refuters confirmed it only matches a comment ("read-mode redirect is present", `:147`) and asserts a re-implemented redirect. References no real save/redirect symbol via execution.
- **Test type (if replaced):** real-page jsdom asserting post-save redirect URL after a real submit. **Disposition:** replace-fake (delete; optionally replace with a real redirect test).

### MEDIUM p31-risk (region is partly real but a named behavior is unpinned)

**GAP-07 — A1 saved-notice + disable-confirm unpinned (strengthen)**
- **Region:** A1. The round-trip is real, but `showSavedNotice`/`dismissSavedNotice` + auto-dismiss timer (`settings.js:311-347`) have **zero** assertions (they execute as a side-effect of `onSave` but nothing asserts the pill shows/auto-dismisses), and `computeDisableTransitions`' confirm-on-disable branch (`:464-480`) is never hit (round-trip only edits the rename input).
- **Evidence:** `grep` for `SavedNotice|NOTICE_AUTO_DISMISS|settings.saved.toast` across tests = 0 assertions. Note: `25-11-toast-behavior` Scenario 5 is **not** real coverage here (see GAP-15).
- **Test type:** real-page jsdom + fake timers. After Save assert `#settingsSavedNotice` visible (`dataset.active`/`hidden=false`) and auto-dismisses after the timer; flip a toggle off → assert disable-confirm dialog fires and gates persistence.
- **Disposition:** strengthen.

**GAP-08 — A4 backups helper-text + password-gate rejection unpinned (strengthen; F2-adjacent)**
- **Region:** A4. `custom-days visibility` and `save-toast` **are** real/behavioral. Unpinned: `refreshFrequencyHelper` mode→`helperOff`/`helperOn` text wiring (`settings.js:2166-2173`, executes but never asserted), the password-ack **gate-block rejection** path (`:2203-2226`: `schedulePasswordError` shown + select reverted + return false — both covering tests pre-seed `passwordAcked='true'`), and the ack-checkbox un-ack force-off (`:2316-2329`).
- **Evidence:** `grep helperOff|helperOn` → only an i18n copy test (`25-12-reminders-explainer`), not the wiring. F2 confirmed: `25-04-schedule-interval:52/54` and `25-05-*` load `assets/backup.js` (the `BackupManager` engine), **not** settings.js — research mis-credited them.
- **Test type:** real-page jsdom. Assert `scheduleFrequencyHelper` data-i18n/textContent after mode change; pre-seed `passwordAcked='false'`, dispatch change to a non-off freq → assert `schedulePasswordError` un-hidden + select reverted + no `schedule.savedToast`.
- **Disposition:** strengthen.

**GAP-09 — A5 photos optimize-loop body + dataURL adapters never execute (strengthen; F2-adjacent)**
- **Region:** A5. Render/verdict/language-rerender/`handleOptimize` branches/`_deleteAllPhotosLoop` **are** real. But the real `_optimizeAllPhotosLoop` body (`settings.js:2834`) is **never executed** — every test either makes `confirmDialog` return false (loop unreached) or monkey-patches the loop to reject. So "persist only if strictly smaller", `savedBytes` accumulation, the `dataURLToBlob`/`blobToDataURL` round-trip, and the optimize SUCCESS path (inline preview pill + success toast, `:2856-2883`) would survive a break undetected. `humanBytes` is only indirectly checked via rendered KB/MB.
- **Evidence:** `grep savedBytes|dataURLToBlob|blobToDataURL` in tests = 0 hits; `25-11-toast-behavior:434` overwrites `_optimizeAllPhotosLoop`. F2 confirmed: `25-06-resize-pure` loads `assets/crop.js`; `25-07-photo-bytes-estimator` loads `assets/db.js` — both off-region.
- **Test type:** vm-exec. Call `_optimizeAllPhotosLoop` directly with injected stubs (resize returns a strictly-smaller blob, real `dataURLToBlob`/`blobToDataURL`) → assert success/failed/`savedBytes` + the no-shrink no-op; one `handleOptimize` test with `confirmDialog→true` asserting inline preview text + success toast.
- **Disposition:** strengthen.

**GAP-10 — B3 export-stepper residual paths uncovered (strengthen)**
- **Region:** B3. Active-step 1→2→3, filtered `#exportEditor.value` on Next, and files-only `navigator.share` **are** real. Uncovered: `exportCloseDialog` (no test clicks close + asserts modal hidden), `exportHandleDownloadPdf`/`exportHandleDownloadMd` step-3 download dispatch (only Share is clicked), `exportUpdatePreview`'s `#exportPreview` render, and `exportApplyMobileTabs`/`exportWireMobileTabs` (`matchMedia` stubbed `matches:false`, mobile path never run).
- **Evidence:** `30-export-markdown:22` explicitly asserts editor.value **not** `#exportPreview.textContent`; `grep` confirms only `30-export-stepper`/`30-export-markdown` touch the region; `quick-260615-share-files-only` is source-slicing (redundant — see GAP-16).
- **Test type:** real-page jsdom. Click `exportClose` (assert modal closed); click MD + PDF download buttons (assert dispatch); drive mobile-tabs under `matchMedia matches:true`.
- **Disposition:** strengthen.

**GAP-11 — B4 sectionHasData + past-session branch never execute (strengthen)**
- **Region:** B4. `applySectionLabels` and the enabled/disabled-**new**-session branch of `applySectionVisibility` **are** real. But `sectionHasData` (one of the 3 named functions, `add-session.js:901-940`) gets **zero** execution — the test uses a new session so `applySectionVisibility(false)` short-circuits at `:955-959` before the `sectionHasData` call. The entire past-session branch (`:960-969`, incl. the REQ-5 "visible+badge when has data" logic) is unexercised; the cross-module link to the real settings.js title writer is stubbed (`createAppStub`) — the test flags this itself as limitation F-J.
- **Evidence:** `30-section-visibility:155,179` drive the new-session path only; refuter not required (verdict was `real`, but the gap is documented in the finding).
- **Test type:** real-page jsdom. Add a past-session case (`editingSession` truthy → `applySectionVisibility(true)`) with a disabled section that HAS data (assert visible + badge) and one with NO data (assert `is-hidden`) to exercise `sectionHasData` + `:960-969`.
- **Disposition:** strengthen.

**GAP-12 — B1 autogrow wiring only source-sliced (strengthen)**
- **Region:** B1. The leaf `computeGrowHeight` is fully pinned (floor 56, grows to 836). But `autoGrow`'s reset-to-auto-then-set DOM mutation (`:25-29`), `growAllSessionTextareas`' `.session-textarea` iteration (`:31-33`), the delegated input listener (`:131-138`), and the `populateSession` grow call (`:2172`) are covered **only by source-text regex/indexOf/slice**, never executed (only `computeGrowHeight` is exported on the test hook).
- **Evidence:** `quick-260516-rna:58-96,191-199` are all structural; refuter confirmed the only test asserting `style.height`/`scrollHeight` is this one leaf test, and no test fires an `input` event on a `.session-textarea`.
- **Test type:** vm-exec (export `autoGrow`+`growAllSessionTextareas` on the hook) or real-page jsdom (fire input on a real `.session-textarea`). Assert `style.height` set to `'auto'` then computed px; assert `growAll` sizes every node.
- **Disposition:** strengthen. (Low-value region per research, hence med not high.)

### LOW p31-risk (real coverage with a narrow hole; optional)

**GAP-13 — B2 `buildFieldCopyText` per-field copy untested (write-new, small).** `30-export-markdown` clicks only `copySessionBtn`/`exportSessionBtn`, never a single-field copy button (`add-session.js:1575`). Phase 31 could break per-field copy undetected. Test type: real-page jsdom — click a per-field copy button, assert clipboard arg.

**GAP-14 — B5 `MAX_ISSUES=3` cap + remove-button toggle not directly asserted (strengthen, optional).** `30-issue-delta` clicks `addIssueBtn` once; the 3-issue cap (`add-session.js:502-505`) and `updateRemoveButtons` `is-hidden`/disabled toggle (`:507-514`) are never directly asserted. Add a case adding rows to 3 → assert `addIssueBtn.disabled===true`; assert remove button hidden at 1 row vs enabled at 2.

**GAP-15 — Replace `25-11-toast-behavior` Scenario 5 fake sub-case (replace-fake).** Scenario 5 (settings save-failed toast) `settingsSrc.indexOf('App.showToast("", "settings.save.failed")')` then replays a **hand-written** `try{throw err}catch{...}` (`:577-592`); the file even narrates doing so (`:569-573`). It does not cover the real `onSave` catch (`settings.js:518-522`). The other scenarios (1-4,6) are real photos-tab tests — keep them. Replace Scenario 5 with a real-page jsdom test that forces `PortfolioDB.setTherapistSetting` to throw and asserts the real `onSave` shows `settings.save.failed`.

**GAP-16 — Retire structural-redundant tests (optional cleanup).** `quick-260615-share-files-only` (source-slices the share-arg, superseded by `30-export-stepper` case C) and `25-12-optimize-placeholders` (pure source-slice; the placeholders behavior is already pinned by the floor/stale runtime tests) are harmless but redundant structural guards. Retire once the `30-*` suite is extended.

---

## Documentation corrections for `30-RESEARCH.md` (not test work — fix the record)

The research behavior inventory (line 195+) should be corrected so the next planner doesn't re-inherit the mis-credits:

| Research claim | Reality (verified by execution) |
|---|---|
| IIFE-4 Backups "EXTENSIVELY" covered by `25-04`/`25-05` | Those load `assets/backup.js` (the `BackupManager` engine). settings.js Backups **screen wiring** is covered only by `25-12-custom-days-visibility`/`schedule-saved-toast`; helper-text + password-gate are gaps (GAP-08). |
| IIFE-5 Photos "EXTENSIVELY" covered incl. `25-06` | `25-06-resize-pure` loads `assets/crop.js`; `25-07-photo-bytes-estimator` loads `assets/db.js`. settings.js photos **loop body** (`_optimizeAllPhotosLoop`) is a gap (GAP-09). |
| IIFE-2 Snippets "EXTENSIVE" coverage | True **at leaf level only**; all screen wiring uncovered (GAP-03). |
| `buildReportRow` "shape only? (via 29-03)" | Wrong suspicion — `29-03-report-wiring` is **behavioral** (asserts label text + report.html target), just leaf-only; `mountReportRow` boot wiring is uncovered. |
| B8 bottom fns "DONE: 24-06; quick-260516-g7p-*" | `24-06` pins only `renderSpotlightSessionInfo`; `quick-260516-g7p` is a fake (GAP-06). The rest of B8 wiring is uncovered (GAP-04). |

---

## Prevention (bake into the `--gaps-only` round — agreed with Ben)

1. **Fake-test detector as a permanent gate.** A check (pre-commit hook or a `tests/` self-check) that fails any test which `readFileSync`s an `assets/*` file but never executes it (`vm`/`eval`/`jsdom`/`runInContext`). Make it a real, repeated gate — not a one-off grep. (Carve out the legitimate static "removal/audit" guards by intent or an explicit allowlist: `25-08-single-source-audit`, `25-11-hardcoded-english-removed`, `25-12-folder-picker-removed` are valid removal guards, not fakes.)
2. **Verification must run things, not trust summaries.** The re-verify after `--gaps-only` must execute a sample of the new tests, confirm they touch the real module, and run the fake-test grep. The original verify passed on the vague goal text; that must not recur. (Memory: `feedback-test-coverage-count-not-real`, `feedback-behavior-verification`.)

## Anti-patterns carried forward from `30-REVIEW.md` (still open, low)

- **WR-01:** `run-all.js` `spawnSync` has no `timeout` — one hung async test stalls the whole gate. Phase 31 will edit these exact modules, so a mis-wired handler that hangs is a realistic failure mode. Add `timeout` + `killSignal`.
- **WR-02:** `WrappedJsPDF` forwards only the first constructor arg — safe today (single options object) but a latent trap for the shared PDF helper.

---

_Re-audited: 2026-06-27 via 13-region multi-agent finder + adversarial refutation (18 agents, every verdict execution-backed)._
_Supersedes the prior `status: passed` verdict, which was correct at the must-have level but did not characterize the Phase-31 net's completeness._
