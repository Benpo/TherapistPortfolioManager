# Phase 47 — Fable Gap-Gate Report (discussion → finalized plans)

**Run:** 2026-07-23, after gsd-plan-checker PASSED (iteration 1) and all deterministic gates.
**Auditor:** Fable agent (last-layer defence gate, per Ben's 2026-07-23 directive).
**Inputs:** 47-DISCUSSION-LOG.md, 47-CONTEXT.md, 47-UI-SPEC.md, 47-RESEARCH.md, 47-mockups.html, all 8 plans, 47-VALIDATION.md, plus real-source spot-checks (db.js, backup.js, app.js, pdf-export.js, export-modal.js, settings.js, add-session.js/html, i18n-en.js, tour.js, help-content-en.js, HELP-MAP.md).

**Verdict:** GAPS FOUND — 6 blockers, 10 warnings, 2 info. All plan line-number/reuse claims spot-checked accurate; the gaps are distillation losses, not false premises.

---

## Blockers

**G-1 | BLOCKER | Clipboard-copy builder `buildSessionMarkdown` dropped from the phase.** CONTEXT names it explicitly under "Code this phase rewrites" (47-CONTEXT.md:186 "`buildSessionMarkdown` (~189)"); D-13 (export order == saved order, 47-CONTEXT.md:87) and Interaction 8a ("Export never renders a literal '—'/N-A value", 47-UI-SPEC.md:133) apply to every export output. No plan touches it: 47-05 covers only `buildFilteredSessionMarkdown`/labels/Step-1/`severityAfterSections`. The real function (export-modal.js:189-329) emits a HARDCODED section order and issues lines via `issue.before !== null` checks (export-modal.js:211-222) — a skip-rated topic copies as literal "Before: skip" and `after - "skip"` prints "Change: NaN"; the copied order ignores the saved order. **Fix:** extend 47-05 (owns export-modal.js) with an explicit buildSessionMarkdown task — saved-order emission, SEV_SKIP omission, and the redefined topics/sub-option gating.

**G-2 | BLOCKER | D-14's core deliverable — topics WITHOUT severity — has no specified document representation.** CONTEXT-SEED (locked design) + D-14 (47-CONTEXT.md:90-94): "Session topics returns as a main checkbox"; 8a: "the topic itself still exports" (47-UI-SPEC.md:133). But the filtered builder deliberately emits NO issues content today (export-modal.js:419-427), and 47-05 Task 1 lists every per-key reader EXCEPT issues (47-05-PLAN.md:81), while Task 2 says only "The topic NAME still exports" without saying where or how (47-05-PLAN.md:113). Executing as written, checking "Session topics" changes nothing in the markdown/text output — or the executor invents an unreviewed document shape. **Fix:** 47-05 must pin the emission — a `## Session topics` section (via `getSectionLabel("issues",…)`) listing topic names at the issues slot in the filtered markdown, whether/which ratings appear in text vs. stay PDF-structural, and what (if anything) the afterSeverity slot emits in markdown. (The PDF half of this discretion item was proposed at plan review; the markdown half never was.)

**G-3 | BLOCKER | The app-level severity switch (D-08) is not wired into export.** D-08 (47-CONTEXT.md:64-68) + D-11 ("They simply don't render on form/export", 47-CONTEXT.md:83-84); 47-03 even promises it ("…is the switch read by the form (47-07) and export (47-05)", 47-03-PLAN.md:27). But 47-05 never reads `App.isSectionEnabled('afterSeverity')` — the sub-option's logic depends only on topics-checked + issue data (47-05-PLAN.md:113). Hidden before-scales keep their values (47-07-PLAN.md:121), so a therapist who turned severity OFF still gets "Include severity before/after" offered and old sessions' bars rendered. **Fix:** 47-05 Task 2 — when afterSeverity is disabled, hide/disable the sub-option and exclude severity from both builders.

**G-4 | BLOCKER | D-02's group names have no string home; 47-04 instructs the WRONG key for "Session Wrap-up".** Ben's exact spec (LOG "Group concept (second round)"; 47-CONTEXT.md:45) and the approved mockup render a "Session Wrap-up" header (47-mockups.html:173). 47-02 creates NO group-name i18n keys (47-02-PLAN.md:46-53); 47-04 Task 1 says "session.form.comments.title (or a wrapup group header)" (47-04-PLAN.md:72) — that key is "Session Notes" (i18n-en.js:116), diverging from the locked name and near-colliding with member "Session Notes and Observations" — the exact collision D-01 abolishes (47-CONTEXT.md:34-38). Also no plan defines the groupId→default-title mapping needed by the Settings list and ✎-revert when `titleOverride` is null. **Fix:** 47-02 adds `session.group.wrapup` ("Session Wrap-up", 4 locales; reuse `session.accordion.emotions` for the other group), 47-01's SUMMARY records the id→key mapping, 47-03/47-04 consume it.

**G-5 | BLOCKER | D-16's same-page invariant is breakable by the cross-tab order-cache refresh.** D-16 (47-CONTEXT.md:99-101; Interaction 9, 47-UI-SPEC.md:134). export-modal.js ships only on add-session.html — form and export share a page. 47-04 reads the order ONCE at form open (47-04-PLAN.md:104); 47-01 Task 2 refreshes `_sectionOrderCache` on the BroadcastChannel message (47-01-PLAN.md:117); 47-05 reads `App.getSectionOrder()` live at export time. A peer-tab order change mid-edit yields form-in-old-order vs. export-in-new-order on one page — the exact 260615 divergence class, invisible to the jsdom guard test. **Fix:** on add-session, export reads the form's captured snapshot (or the page pins one snapshot for both consumers); owners 47-04/47-05 with a note in 47-01's cache contract.

**G-6 | BLOCKER | "Severity is named ONCE in the Settings list — the topics row never mentions it" (47-UI-SPEC.md:104) is violated by the untouched topics row description.** `settings.row.issues.description` = "The issues addressed and their before/after severity" (i18n-en.js:412) renders on every settings row (settings.js:142-146); no plan changes it. **Fix:** 47-02 rewrites the topics row description severity-free in all four locales.

## Warnings

**G-7 | WARNING | `sanitizeOrder` never completes MISSING known sections.** The merge-semantics discretion (47-CONTEXT.md:143-144) was never decided into any plan: 47-01 Task 2 specifies drop-unknown/clamp/default-on-garbage only (47-01-PLAN.md:117), 47-06 allowlists+clamps (47-06-PLAN.md:75). A partial order (crafted backup, future-version sentinel) passes sanitize and silently hides enabled sections from form AND export. **Fix:** 47-01 — sanitizeOrder appends missing KNOWN sections/groups at their D-02 default slots; add a test case.

**G-8 | WARNING | The new `severityAfterSections` ordinal silently regresses shipped Step-2 edit-awareness.** Current code honours manual Step-2 edits (export-modal.js:757-771 comment; pdf-export.js:1489-1497 counts headings in the EDITED text). 47-05 Task 3 derives the count from build-time emitted keys (47-05-PLAN.md:143) — deleting a section heading in Step 2 lands the severity block at the wrong slot. **Fix:** derive against document headings actually present in the editor (intersect saved order with parsed editor headings), or explicitly accept the regression.

**G-9 | WARNING | The skipped-rating hint is authored but never rendered.** UI-SPEC hint (47-UI-SPEC.md:106) + mockup `naHintOn` (47-mockups.html:167). 47-02 creates `session.form.severitySkip.hint` (47-02-PLAN.md:51); 47-07 never instructs showing it (47-07-PLAN.md:81). **Fix:** 47-07 Task 1 renders/hides the hint with the — selection.

**G-10 | WARNING | The afterSeverity Settings row will render a visible description, contradicting "no descriptor after it — the ⓘ carries the explanation" (47-UI-SPEC.md:104).** `renderRow` unconditionally renders `settings-row-desc` (settings.js:142-146) and 47-03 Task 1 assigns `settings.row.afterSeverity.info` as BOTH the row desc key and the popover content (47-03-PLAN.md:76). **Fix:** 47-03 pins — no visible desc on that row; the info string exists only in the ⓘ popover.

**G-11 | WARNING | D-08 vs. the past-session-with-data visibility contract is unresolved.** `applySectionVisibility` keeps a DISABLED section VISIBLE (badge, editable) on past sessions with data (add-session.js:1010-1021). 47-07 Task 2 relies on that path for the after block yet unconditionally hides before-columns when the switch is off (47-07-PLAN.md:111) — old rated session with severity off: after-block visible / before-columns hidden. Neither LOG nor CONTEXT decides this corner. **Fix:** 47-07 pins the behavior (recommend mirroring the existing disabled-section rule for both).

**G-12 | WARNING | D-15 "checked by default whenever Session topics is checked" (47-CONTEXT.md:95-97) loses the re-check case; the topics main-checkbox default is unpinned.** 47-05 Task 2 defaults once at open and unchecks+disables on topics-uncheck (47-05-PLAN.md:113) — silent on topics RE-check, and never states the topics checkbox's own default (today `issues: true && hasData`, export-modal.js:331-341). **Fix:** 47-05 pins both — re-check restores the default (checked iff issue data exists); topics keeps the pre-selected-opt-out default.

**G-13 | WARNING | Reset order / Reset names staging semantics unpinned.** D-16: order changes ride Settings Save staging (47-CONTEXT.md:98-99). 47-03 Task 2 wires both buttons (47-03-PLAN.md:108) without stating stage-vs-persist; UI-SPEC's "instant, no confirm" (47-UI-SPEC.md:102) is about confirm-lessness only. **Fix:** 47-03 pins that both resets mutate staged state and join formDirty/Save.

**G-14 | WARNING | D-18 docs coverage list incomplete vs HELP-MAP.md.** Missing from 47-08 (47-08-PLAN.md:83): `severity/topic-multiple-issues` (its text "each with its own before-and-after ratings", help-content-en.js:308-314, becomes wrong under switch/skip) and a decide-or-declare on `backups/topic-backup-restore` (restores now carry section order). Remaining add-session.html owners (heart-wall topics, `topic-new-session`) should be explicitly declared unaffected; the topic-before-after update should re-point its `{ui:session.form.beforeSeverity}` ref to the new start-rating label. **Fix:** extend 47-08 Task 1's list.

**G-15 | WARNING | EN "Session topics" naming decision for Ben.** Approved mockup/sketch show "Session topics" (47-mockups.html:170; sketch 010:210 claims "Labels are the app's real section titles"), but the real EN title is "Issues addressed in this session *" (i18n-en.js:124); only HE means "Session topics". Plans keep the old EN title everywhere. If Ben expects the mockup naming, 47-02 needs an EN (+DE/CS) micro-rename of `session.form.issuesHeading`; if not, no change. One-word decision either way.

**G-16 | WARNING | `#heartShieldConditional` ("Was the Heart-Wall removed?", add-session.html:346) has no destination in the D-02 restructure.** It sits inside the old notes accordion, outside any `data-section-key`; 47-04 never mentions it (47-04-PLAN.md:72). Left in place it lands in Session Wrap-up — and D-04's empty-group hide could hide a REQUIRED conditional field mid-Heart-Wall-session. **Fix:** 47-04 names its new home (natural: end of Emotions & Techniques, with the heart-wall content) and adds it to the acceptance greps.

## Info

**G-17 | INFO | `validateIssues` never inspects ratings today (`payload.length > 0` only, add-session.js:841-843)** — 47-07's "skip satisfies the mandatory rating" instruction changes nothing real and its acceptance criterion passes vacuously. No dead-end risk; executor must not invent NEW rating-mandatoriness to make the task meaningful.

**G-18 | INFO | REQUIREMENTS.md carries ORDR-06/07/08 marked "(draft)" (.planning/REQUIREMENTS.md:37-39, 110-112)** — Ben's approval of the amendment is outstanding; collect at this plan review (47-CONTEXT.md:24-27).

---

## Discretion-calls check (planner's locked calls vs the discussion record)

| Call | Verdict |
|------|---------|
| D-07 vs Interaction 11 → clamp wins | CONSISTENT (Interaction 11 is Ben's later lock, 47-UI-SPEC.md:136) |
| New `afterSeverity` key distinct from `issues` | CONSISTENT |
| Skip stored as string `"skip"` | CONSISTENT (8a leak risk is plan gap G-1, not the marker) |
| `severityAfterSections` as saved-order ordinal, PDF loop untouched | CONSISTENT — with G-8 caveat |
| PDF before/after block as ONE unit at afterSeverity slot | CONSISTENT |
| `afterSeverity` rename-locked | CONSISTENT |
| Group renames in sentinel `titleOverride` | CONSISTENT |
| Tour reorder step deferred, `session-heart` preserved | CONSISTENT (verified vs tour.js:131-142) |
| Legacy backups without order record → D-02 default | CONSISTENT |

## D-17 ruling

D-17 is a closed PROCESS gate — "small mockups are part of decision-making", satisfied and marked GATE CLOSED 2026-07-23 in CONTEXT (47-CONTEXT.md:104-110), with `47-mockups.html` wired into 47-03/47-04 as the visual contract. Needs no plan coverage; the coverage tool's "not covered" flag is a false positive.
