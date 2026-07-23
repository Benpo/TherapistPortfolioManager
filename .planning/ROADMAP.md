# Roadmap: TherapistPortfolioManager

## Overview

Transform the existing functional vanilla JS prototype into a sellable product for Emotion Code / Body Code therapists. The journey moves through six phases: establishing the technical foundation (design tokens, fonts, migration infrastructure, backup safety), visually transforming the app (garden theme, dark mode, RTL-safe CSS), consolidating and expanding the data model with new features, internationalizing to 4 languages while researching distribution options, implementing legal compliance and production packaging, and finally validating quality across all dimensions while creating maintainer documentation for Sapir.

## Milestones

- ✅ **v1.0 MVP** — Phases 1–7 (shipped 2026-03-18)
- ✅ **v1.1 Final Polish & Launch** — Phases 8–27 (shipped 2026-06-22) — full phase detail archived in `milestones/v1.1-ROADMAP.md`
- ✅ **v1.2 Codebase Health & Reliability** — Phases 28–38 (shipped 2026-07-07) — full phase detail archived in `milestones/v1.2-ROADMAP.md`
- ✅ **v1.3 In-App Help, Onboarding & Changelog** — Phases 39–43 (shipped 2026-07-10) — full phase detail archived in `milestones/v1.3-ROADMAP.md`
- 🚧 **v1.4 Richer Sessions** — Phases 44–48 (in progress) — rich-text session editor, section reordering, mobile pass, tech-debt guardrails, validation polish

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–7) — SHIPPED 2026-03-18</summary>

- [x] **Phase 1: Foundation** — design tokens, self-hosted fonts, DB migration infrastructure, backup safety net (2026-03-09)
- [x] **Phase 2: Visual Transformation** — garden theme, dark mode, CSS logical properties, nav extraction (2026-03-10)
- [x] **Phase 3: Data Model and Features** — session field consolidation, expanded types, new fields, search, greeting (2026-03-10)
- [x] **Phase 4: Internationalization and Distribution Research** — 4-language i18n, RTL validation, hosting/payment research (2026-03-12)
- [x] **Phase 5: Legal and Production Packaging** — disclaimer compliance, access gating, PWA setup, distribution bundle
- [x] **Phase 05.1: Landing Page Visual Redesign** (INSERTED) — landing visual identity
- [x] **Phase 05.2: Landing Page Polish** (INSERTED) — aurora hero, botanical images, screenshots, legal accordion
- [x] **Phase 6: Quality and Developer Experience** — cross-browser/RTL/responsive QA, maintainer guides
- [x] **Phase 7: ZIP Backup Strategy** — ZIP export/import replacing JSON backup (2026-03-18)

</details>

<details>
<summary>✅ v1.1 Final Polish & Launch (Phases 8–27) — SHIPPED 2026-06-22</summary>

Full goals, success criteria, and per-plan detail are archived in `milestones/v1.1-ROADMAP.md`. Phase directories are in `milestones/v1.1-phases/`.

- [x] **Phase 8: Terminology and Quick UX Fixes** — 2/2 (2026-03-19)
- [x] **Phase 9: Heart Shield Redesign** — 2/2
- [x] **Phase 10: UX Power Features** — 2/2 (2026-03-19)
- [x] **Phase 11: Visual Identity Update** — 2/2 (2026-03-19)
- [x] **Phase 12: Launch Prerequisites** — 4/4 (2026-03-19)
- [x] **Phase 13: Greeting Quotes** — 1/1
- [x] **Phase 14: i18n / Footer / Email** — 6/6
- [x] **Phase 15: Architecture & UI Audit** — 3/3 (2026-03-23)
- [x] **Phase 16: Audit Fix — Code** — 5/5 (2026-03-23)
- [x] **Phase 17: Audit Fix — Business** — 3/3 (2026-03-24)
- [x] **Phase 18: Technical Debt** — 3/3 (2026-03-24)
- [x] **Phase 19: Go-Live Preparation** — 8/8 (2026-03-24)
- [x] **Phase 20: Pre-Launch UI Polish** — 3/3 (2026-03-25)
- ⏸ **Phase 21: Mobile Responsiveness** — 2/3, **PARTIAL** — `21-03` (crop bug fix, overlay-close, body scroll lock, iPhone checkpoint) deferred to backlog (mobile not a launch blocker)
- [x] **Phase 22: Session Workflow Loop** — 15/15
- [x] **Phase 23: PDF Hebrew RTL Rewrite** — 11/11 (2026-05-12)
- [x] **Phase 24: Pre-Launch Final Cleanup** — 8/8 (2026-05-14)
- [x] **Phase 25: Backup Architectural Rework** — 13/13 (2026-05-16)
- 🎨 **Phase 26: In-App Onboarding / Help** — **DESIGN-ONLY**; `26-UI-SPEC.md` approved (6/6 PASS), build deferred to backlog. Build phase MUST start from `milestones/v1.1-phases/26-in-app-onboarding-overview-help-system/26-UI-SPEC.md`
- [x] **Phase 27: Backup Modal Visual Cohesion** — 1/1 (2026-06-15)

</details>

<details>
<summary>✅ v1.2 Codebase Health & Reliability (Phases 28–38) — SHIPPED 2026-07-07</summary>

Full goals, success criteria, and per-plan detail are archived in `milestones/v1.2-ROADMAP.md`. Requirements archived in `milestones/v1.2-REQUIREMENTS.md`. Audit in `milestones/v1.2-MILESTONE-AUDIT.md`. A deliberate shift from feature work to maintainability and reliability, run in dependency order: reliable updates + observability, then a test safety net, then refactor behind it, then document the result.

- [x] **Phase 28: Update Reliability & Versioning** — field-verified Safari PWA update fix; single version source → footer + SW cache + runtime integrity self-check; CSP→header; cache TTL (2026-06-22, shipped v1.2.1)
- [x] **Phase 29: Reliability & Observability** — local crash log + "Report a problem" copy flow (zero network); IDB migration reset & recover escape hatch (2026-06-23)
- [x] **Phase 30: Test Harness & Coverage** — first `package.json` + `npm test`; 7 PDF tests fixed; RTL guard; behavior tests on god modules pre-refactor (2026-06-26)
- [x] **Phase 31: Refactor God Modules** — `settings.js`/`add-session.js` extraction into IIFE modules behind the green test net; opportunistic cleanups (2026-06-28)
- [x] **Phase 32: README + Code Comments** — maintainer-audience README rewrite + four-slot comment banner pilot on the 5 refactored files (2026-06-29)
- [x] **Phase 33: DE/CS i18n completion** — 13 export-modal keys translated via AI native-translation panel (2026-07-06)
- [x] **Phase 34: Session PDF Export — Visual Polish** — Sessions Garden brand redesign, derived chronological session ordinal, Hebrew RTL/bidi preserved (2026-06-30)
- [x] **Phase 35: Demo System Refresh / Version Parity** — demo chrome/seed/version brought back to parity with the shipped app (2026-06-30)
- [x] **Phase 36: Code Comments — Batch 2** — four-slot banner convention extended to ~22 core production modules (2026-07-02)
- [x] **Phase 37: Date consistency + date-format setting + session types** — canonical local-time date engine, Personalization tab (6 date formats), two-tier session-type list, terminology/filter relabel (2026-07-06)
- [x] **Phase 38: Next session date field with overview column** — optional next-session date picker + sortable/overdue-aware overview column, incl. 2 UAT gap-closure rounds (2026-07-07)

</details>

<details>
<summary>✅ v1.3 In-App Help, Onboarding & Changelog (Phases 39–43) — SHIPPED 2026-07-10</summary>

Every practitioner can learn the whole app *inside* the app (welcome, replayable tour, help center) and hears about every release *inside* the app (What's-New popup + changelog page), with a hard process gate keeping both current with every future user-facing change. Zero new production dependencies; fully offline; EN canonical + HE/DE/CS delivered.

- [x] **Phase 39: Help Center & "?" Entry Point** — persistent "?" on every app page, offline `help.html` help center (workflow-spine IA + personalization + technical track), full EN content, empty-state deep-links, per-browser install instructions (completed 2026-07-07)
- [x] **Phase 40: First-Run Welcome & Onboarding Coordinator** — first-run coordinator (single precedence order), branded welcome overlay (tour / explore myself), re-openable from "?", non-nagging install nudge (completed 2026-07-08)
- [x] **Phase 41: Replayable Guided Tour** — bespoke 12-step spine tour, graceful degradation (spotlight ↔ modal + "Take me there"), cross-page resume, language re-render (completed 2026-07-09; cross-page clean-URL resume hotfixed + live-verified 2026-07-10)
- [x] **Phase 42: In-App Changelog & What's-New** — once-per-version What's-New popup + persistent changelog page in the help center, one structured data source, v1.3's own notes as first entry (completed 2026-07-09)
- [x] **Phase 42.1: Help & Onboarding Translation (HE/DE/CS)** — all v1.3-authored help/welcome/tour/changelog copy translated natively, per-locale integrity gates, Sapir Hebrew read (completed 2026-07-10)
- [x] **Phase 43: Docs-Maintenance Hard Gate** — layered blocking gate (git hook + unbypassable CI step + GSD DoD) so no user-facing change ships without a changelog entry + updated help topics; validated against v1.3's own ship (completed 2026-07-10)

Full phase detail archived in `milestones/v1.3-ROADMAP.md`.
</details>

### 🚧 v1.4 Richer Sessions (Phases 44–48) — IN PROGRESS

Session documentation becomes richer and personal — formatted text and custom section order — while the app's mobile chrome, error feedback, and deploy pipeline get hardened. Zero new production dependencies; markdown-at-rest storage (fields stay plain strings, no data migration); underline dropped (no markdown syntax). Real-device verification (installed-Safari PWA, real iPhone, real opened PDF) is embedded as a success criterion in each feature phase — jsdom cannot see caret/paste/drag/PDF/RTL, and this repo has shipped false-GREEN jsdom PDF tests before.

- [x] **Phase 44: Tech-Debt Guardrails & Pre-Prod Environment** — comment-hygiene CONVENTIONS.md root-cause fix + runtime-leak reword (forward gate → v1.5), deploy purge-race fix, second CF Pages pre-prod project
- [x] **Phase 45: Rich-Text Rendering & Export Foundation** — formatted notes render in read mode, PDF, and markdown copy/share; legacy content safe; encrypted-backup round-trip (completed 2026-07-13)
- [x] **Phase 46: Rich-Text Toolbar Editor** — formatting toolbar, keyboard shortcuts, auto-format, live preview, nested lists; snippets/autogrow preserved (completed 2026-07-17)
- [ ] **Phase 47: Session-Section Reordering** — drag + arrow reorder in Settings, drives the form + both export builders (atomic 260615 guard rewrite), per-therapist persistence
- [ ] **Phase 48: Mobile Pass & Validation Polish** — index-header fix, popover exclusivity, accordion error-focus, 21-03 iPhone sweep; future-birthdate reject + error-tone sweep + distinct next-date errors + visible error state

## Phase Details

Active milestone (v1.4). Shipped-milestone phase detail is archived in `milestones/*-ROADMAP.md`.

### Phase 44: Tech-Debt Guardrails & Pre-Prod Environment

**Goal**: Development guardrails and the deploy pipeline are hardened before any feature work begins — new planning references can't leak into shipped code, cache purges can't race the Pages promotion, and a real pre-prod environment exists for on-device pre-release testing.
**Depends on**: Nothing (first v1.4 phase — lands first so its guardrails protect every later phase's commits, and its pre-prod environment serves the device-heavy verification work).
**Requirements**: DEBT-01, DEBT-02, DEBT-03
**Success Criteria** (what must be TRUE):

  1. `CONVENTIONS.md` §Comments no longer instructs agents to cite phase/plan IDs in shipped comments — it carries the strip-all-planning-IDs rule instead — and the single RUNTIME planning-ref leak, the add-client.js `console.warn` citing D-23, is removed (one-line reword). No enforcement gate ships this milestone: the baseline-aware forward grep-gate defers to v1.5 alongside the ~680-line legacy retrofit (they travel together).
  2. A deploy purges the Cloudflare cache only AFTER the Pages promotion is confirmed live — the v1.3.0 mixed-cache incident class can no longer occur.
  3. A `pre-prod` branch deploys to a second Cloudflare Pages project that reproduces production URL semantics (clean URLs, `_redirects`, deploy-stamped integrity token) without touching the `deploy` branch the docs-gate CI anchors to.

**Plans**: 5/5 plans executed
**Wave 1**

- [x] 44-01-PLAN.md — DEBT-01: rewrite CONVENTIONS.md §Comments + reword add-client.js console.warn + align REQUIREMENTS/ROADMAP (no gate ships) [wave 1]
- [x] 44-02-PLAN.md — DEBT-02: scripts/cf-await-promotion.sh sentinel-then-blocking-purge + stub-curl test [wave 1]
- [x] 44-03-PLAN.md — DEBT-03: scripts/build-staging.sh shared transform (+ --noindex) + tmp-dir fidelity test [wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 44-04-PLAN.md — DEBT-02+03: wire deploy.yml to build-staging.sh + cf-await-promotion.sh (blocking purge after promotion) [wave 2]
- [x] 44-05-PLAN.md — DEBT-03: deploy-preprod.yml (isolated) + second CF Pages project human checkpoint [wave 2]

### Phase 45: Rich-Text Rendering & Export Foundation

**Goal**: Formatted session notes display correctly everywhere they are read — read mode, PDF export, and markdown copy/share — so markdown-formatted text round-trips end-to-end before any editing UI exists.
**Depends on**: Phase 44 (guardrails in place before feature commits).
**Requirements**: RTXT-06, RTXT-07, RTXT-08, RTXT-10
**Success Criteria** (what must be TRUE):

  1. When reading a saved session, formatted notes (bold, italic, bullet and numbered lists) render as styled text through the escape-first MdRender path — never raw `**`/`-` tokens and never raw innerHTML.
  2. Exporting a session to PDF preserves bold and lists with Hebrew RTL/bidi intact; italic renders at regular weight (a documented, accepted limitation) and the heading-strip behavior is a conscious choice — verified against a real opened PDF, not jsdom.
  3. Copying or sharing a session as markdown reproduces the stored formatting verbatim.
  4. Pre-v1.4 plain-text sessions render safely and unchanged in meaning, and an encrypted `.sgbackup` round-trip carries formatted notes with zero format changes (verified with a real restore).

**Plans**: 8/8 plans complete
**UI hint**: yes

**Wave 1** *(parallel — no file overlap)*

- [x] 45-01-PLAN.md — MdRender: ordered + nested lists, D-08 inline hardening, strip() helper [wave 1]
- [x] 45-02-PLAN.md — PDF pipeline: D-08 inline hardening (invariant preserved) + nested lists (RTL-safe) [wave 1]

**Wave 2** *(45-03 blocked on 45-02 (pdf-export.js); 45-04 blocked on 45-01 (MdRender))*

- [x] 45-03-PLAN.md — PDF note-body category (D-03) + subordinate chrome-free note headings (D-02) + verbatim copy/share lock (RTXT-08/D-10) [wave 2]
- [x] 45-04-PLAN.md — Read-mode `.note-rendered` overlay + compact-surface strip (D-06) + scoped CSS + extended 31-* hardening locks [wave 2]

**Wave 3** *(blocked on 45-01..45-04)*

- [x] 45-05-PLAN.md — RTXT-10 encrypted-backup round-trip + cross-pipeline D-08 agreement + changelog/help docs gate [wave 3]

**Wave 4** *(blocked on 45-05 — real-device phase gate)*

- [x] 45-06-PLAN.md — Real Hebrew PDF + installed-Safari read mode + real `.sgbackup` restore human checkpoint [wave 4]

**Gap-Closure Wave** *(from 2026-07-13 real-device UAT — 2 diagnosed renderer gaps; re-run the 45-06 checkpoint after this lands)*

- [x] 45-07-PLAN.md — GAP-45-01 text-then-heading render split (md-render.js) + GAP-45-02 marker-only lines consistent in both pipelines (md-render.js + pdf-export.js) + agreement-corpus lock + docs gate [gap-closure]
- [x] 45-08-PLAN.md — GAP-45-03 same-depth marker-type flip starts a new list (CommonMark) + GAP-45-04 ordered `<li value="N">` editor-1:1 ordinals (md-render.js only; pdf byte-unchanged) + agreement-corpus lock + docs gate [gap-closure round 2]

### Phase 46: Rich-Text Toolbar Editor

**Goal**: Therapists can apply formatting while writing session notes — via a toolbar, keyboard shortcuts, and auto-format — with a live preview and nested lists, without breaking snippets or autogrow.
**Depends on**: Phase 45 (formatting must render everywhere first, so "does it survive export?" is checkable as the toolbar is built, not discovered afterward).
**Requirements**: RTXT-01, RTXT-02, RTXT-03, RTXT-04, RTXT-05, RTXT-09
**Success Criteria** (what must be TRUE):

  1. A toolbar over the session note fields inserts markdown markers for bold, italic, bullet list, and numbered list around the current selection in the familiar text fields.
  2. On desktop, Ctrl/Cmd+B and Ctrl/Cmd+I apply bold/italic; typing "- " or "1. " starts a list, Enter continues it, and Enter on an empty item exits the list.
  3. The user can toggle a live preview of the rendered result while editing, and can indent/outdent list items to build nested lists that render correctly in both the preview and the exported PDF.
  4. Snippets quick-paste and autogrow keep working unchanged in the enhanced note fields — verified in a real browser, not jsdom.

**Plans**: 12/17 plans executed
**UI hint**: yes (UI-SPEC approved; mockup gate D-19 satisfied)

**Wave 1** *(parallel — no file overlap)*

- [x] 46-01-PLAN.md — TextEdit undo-safe chokepoint + pure transforms (toggle/list/heading/auto-format/indent/renumber) + node unit tests [wave 1]
- [x] 46-02-PLAN.md — D-13/D-14 true italic in PDF: subset Rubik-Italic + {text,bold,italic} segment model + agreement test + real-PDF feasibility checkpoint [wave 1]

**Wave 2** *(blocked on 46-01)*

- [x] 46-03-PLAN.md — rich-toolbar.js chrome + inline formatting (bold/italic toggle, lists, heading dropdown, desktop shortcuts, undo/redo) + i18n + CSS [wave 2]

**Wave 3** *(blocked on 46-03 — same module)*

- [x] 46-04-PLAN.md — rich-toolbar.js list mechanics (auto-format/indent/outdent/renumber) + per-field live preview pane [wave 3]

**Wave 4** *(blocked on 46-04 — parallel, file-disjoint)*

- [x] 46-05-PLAN.md — mount toolbar + preview over the 7 note fields in add-session.js (RTXT-09 preserved; no-tour-step decision) [wave 4]
- [x] 46-06-PLAN.md — export-modal Step-2 redesign: full toolbar + info note + 50%/maximize + flex-fill + mobile full-screen + shared-module script tags [wave 4]

**Wave 5** *(blocked on 46-05, 46-06)*

- [x] 46-07-PLAN.md — docs hard-gate: EN changelog + affected help topics + covers[] for new modules [wave 5]

**Wave 6** *(blocked on 46-02, 46-05, 46-06, 46-07 — closing real-device pass)*

- [ ] 46-08-PLAN.md — real-browser / real-iPhone-PWA / real-PDF phase verification gate [wave 6]

**Gap-Closure Waves** *(from the 2026-07-14 46-08 real-device UAT — 5 open gaps; re-run the device gate after these land)*

**Wave 7** *(parallel — no file overlap)*

- [x] 46-09-PLAN.md — Gap 3: module-level undo/redo stack in TextEdit (granular, Ctrl+Z intercepted; the NAMED D-20 follow-up) [gap-closure, wave 7]
- [x] 46-10-PLAN.md — Gap 7: emotions before/after opt-out (pre-selected, persisted; gates PDF severity bars + copy) — design-ratification checkpoint [gap-closure, wave 7]

**Wave 8** *(blocked on 46-09 (rich-toolbar.js) + 46-10 (i18n))*

- [x] 46-11-PLAN.md — Gap 4 + Gap 8: preview toggle label+icon (eye/pencil, both surfaces) + snippet-accept-in-a-list Enter fix (+ regression tests) [gap-closure, wave 8]

**Wave 9** *(blocked on 46-10 (export-modal.js) + 46-11 (i18n))*

- [x] 46-12-PLAN.md — Gap 9: Heart-Wall export wording (released vs identified-not-released, all locales) — wording-choice checkpoint [gap-closure, wave 9]

**Wave 10** *(blocked on all gap code — docs hard-gate)*

- [x] 46-13-PLAN.md — docs hard-gate: revise the unreleased v1.4.0 EN changelog entry to final behaviour (no version bump) + affected help topics (quick-paste / snippets / review-export) [gap-closure, wave 10]

**Wave 11** *(blocked on 46-09..46-13 — closing real-device re-run)*

- [x] 46-14-PLAN.md — real-device / real-PDF re-verification gate (5 gap fixes + deferred 46-08 matrix + round-1 in-gate fixes) [gap-closure, wave 11]

**Gap-Closure Round 2** *(from the 2026-07-15 46-14 re-run on MacBook Pro — item 11 failed, 2 new high-severity gaps: 10 Step-2 default layout collapse on laptop viewports, 11 export toolbar not always-visible. Self-contained fresh round: 46-16 SUPERSEDES 46-14's re-run duty.)*

**Round-2 Wave 1** *(scoped CSS fix — immediately executable, no file overlap)*

- [x] 46-15-PLAN.md — Gaps 10+11: export Step-2 edit surface as sizing floor (min-block-size floor, 90dvh-capped) + pinned unclippable toolbar (flex-shrink:0 + position:sticky) + falsifiable WebKit layout probe [gap-closure, wave 1]

**Round-2 Wave 2** *(blocked on 46-15 — closing real-device re-run, supersedes 46-14)*

- [x] 46-16-PLAN.md — real-device / real-PDF re-verification gate: full 11-item round-2 checklist + explicit gap 10/11 verification (default-size usable on MacBook, toolbar full-height + never scrolls away, maximize + mobile + RTL correct) + NEW gap 12/13 verification (first-click persistent-toolbar controls + Preview reveal) [gap-closure, wave 2]

**Gap-Closure Round 3** *(from the 2026-07-15 Playwright-WebKit repro on build e0c48c5 — 2 new high-severity gaps found while testing the 46-15 build: 12 persistent-bar controls dead until the editor is focused once, 13 export preview pane opens below the scroll fold. The standing 46-16 gate re-runs after this lands and now carries item 13.)*

**Round-3 Wave 1** *(scoped JS fix to rich-toolbar.js — immediately executable, no file overlap)*

- [x] 46-17-PLAN.md — Gaps 12+13: persistent-bar dispatch resolves its target from the clicked control's own bar (works on first click, no prior focus) + export preview scrolls its edit-area container into view below the pinned bar; RED-first jsdom test (dispatch, 190→191) + RED-first WebKit probe assertion set E (preview reveal) [gap-closure, wave 1]

### Phase 46.1: Preview & Edit Experience Redesign (INSERTED)

**Goal:** A finalized, Ben-ratified preview/edit experience across BOTH rich-text
surfaces (the 7 session note fields AND the export Step-2 flow) — designed first,
implemented second. Ben's directive (2026-07-17, verbatim intent): "no gaps
finalization can help here without proper mockup, UI phase, replanning and
implementation. which buttons to show, where the preview is shown and how to go
back to edit (or its both integrated together somehow), how much screen space to
give each part, how the overall process looks like."

**Why this phase exists:** the round-1 in-gate export redesign skipped the
mandatory UI phase; the accumulated cost surfaced at the phase-46 device gate as
gaps 14 (preview/edit mode model broken: green is-active + target-state "Edit"
label reads inverted; manual scroll escapes preview while the mode claims
otherwise; stacked-scroll concept rejected) and 15 (note-field preview background
is the same orange as section titles — reads as a category header, not a
preview). See 46-UAT.md gaps 14/15 for the full findings.

**Locked process (Ben-ratified 2026-07-17):**

1. Sketch round — MULTIPLE interactive HTML mockup concepts (/gsd-sketch), full
   both-surfaces scope: interaction model + unified "this is preview" visual
   language decided together. Ben picks/iterates until finalized.

2. /gsd-ui-phase — UI-SPEC.md design contract from the ratified sketch (the
   mandatory UI gate; NOT skippable this time).

3. /gsd-plan-phase (with plan-checker + two-lens architect gate) → execute
   (RED-first) → code review → its own real-device gate.

**Scope carried from phase 46's gate (verify here, not at 46-16):** export
Step-2 layout/flow specifics (46-16 items 2, 11's layout parts, 12, 13) — the
engineering under them (sizing floor, sticky bar, dispatch-without-focus, reveal)
is probe-verified and survives as mechanism, but the surfaces they present are
being redesigned. The always-visible export toolbar remains a ratified invariant
under any design.

**Requirements**: RTXT-01, RTXT-04, RTXT-05 (re-presentation of shipped
capability; no new data-tier requirements — confirmed at UI phase)
**Depends on:** Phase 46
**Plans:** 7/7 plans complete

Sketch round + UI-SPEC complete (008-B / 009-A ratified; UI-SPEC approved 6/6). Plans created 2026-07-18.

**Wave 1** *(RED-first test scaffold — project law: tests before implementation)*

- [x] 46.1-01-PLAN.md — RED jsdom tests (in-place swap + Ctrl/Cmd+E, current-state switcher, format-in-preview + pinned-outside-strip, Gap-15 Frame source-audit) + WebKit probe set E [wave 1]

**Wave 2** *(parallel — file-disjoint: rich-toolbar.js / app.css / i18n+html)*

- [x] 46.1-02-PLAN.md — rich-toolbar.js: pinned two-segment current-state Edit/Preview switcher outside a scroll strip; remove the rejected target-state toggle; setMode + return-and-apply (Gap-14) [wave 2]
- [x] 46.1-04-PLAN.md — app.css: unified Frame preview treatment + PREVIEW chip (never surface-alt, Gap-15) + scroll strip + green-active switcher + dim-in-preview + 280px export editor floor [wave 2]
- [x] 46.1-05-PLAN.md — i18n four-locale copy (chip, reconciled empty-state/discard/ephemeral/Step-2) + add-session.html defaults [wave 2]

**Wave 3** *(blocked on 46.1-02 — same file)*

- [x] 46.1-03-PLAN.md — rich-toolbar.js: in-place swap (textarea hidden, Frame in same box) + Frame wrapper/chip/body (MdRender sole sink) + Ctrl/Cmd+E reaching while hidden + reveal reconcile [wave 3]

**Wave 4** *(docs hard-gate — after implementation)*

- [x] 46.1-06-PLAN.md — docs Definition of Done: EN changelog entry + affected help topics (topic-quick-paste + review-export) [wave 4]

**Wave 5** *(real-device ratification — Ben-ratified locked process step 3)*

- [x] 46.1-07-PLAN.md — real-device / real-PDF gate (MacBook installed-Safari PWA + iPhone, LTR + Hebrew RTL) + WebKit set-E probe; re-verifies carried Phase-46 export items 2/11/12/13 — Ben "approved" 2026-07-20 on pre-prod 3d5cbaf [wave 5]

### Phase 47: Session-Section Reordering

**Goal**: Therapists can set the order of session sections once in Settings and have that order drive the add/edit form and every export, personalizing how each session is documented.
**Depends on**: Phase 45 (both phases refactor `export-modal.js`'s builders; sequenced so the export surface is touched by one hand at a time). Independent of Phases 46 (editor does not touch the export builders).
**Requirements**: ORDR-01, ORDR-02, ORDR-03, ORDR-04, ORDR-05
**Success Criteria** (what must be TRUE):

  1. In Settings, the user can reorder session sections both by dragging (mouse AND iPhone touch, via pointer events — not HTML5 DnD) and by per-row up/down arrow buttons as the accessible (WCAG 2.2) baseline.
  2. The saved order immediately drives the add/edit session form layout.
  3. The saved order drives BOTH the markdown and PDF export builders — `severityAfterSections` included — repointed atomically with the 260615 guard-test rewrite so export order can never briefly diverge from the saved order.
  4. The chosen order persists per therapist (a `therapistSettings` sentinel record, mirroring the `snippetsDeletedSeeds` pattern) and survives an encrypted backup round-trip.

**Plans**: 6/10 plans executed
**UI hint**: yes

Plans:

**Wave 1** (shared foundation — parallel, no file overlap)

- [x] 47-01-PLAN.md — Order sentinel (db.js) + shared getSectionOrder cache/sanitizeOrder validator + tap-again-to-clear on the severity scale (app.js, D-20) [ORDR-05, ORDR-07]
- [x] 47-02-PLAN.md — i18n UI string contract for the whole phase, EN/DE/HE/CS (incl. D-14 HE export-label fix) [ORDR-06, ORDR-07, ORDR-08]

**Wave 2** (feature surfaces — parallel, disjoint files; consume Wave-1 APIs)

- [x] 47-03-PLAN.md — Settings grouped reorder UI: drag + arrows, group headers (renamable), Issue-severity row + ⓘ, Reset order / Reset names, persistence on Save [ORDR-01, ORDR-02, ORDR-06, ORDR-08]
- [x] 47-04-PLAN.md — Session form D-02 restructure + order-driven render (empty-group hide, tour anchors) [ORDR-03]
- [x] 47-05-PLAN.md — Filtered export builder repointed to saved order (atomic 260615 rewrite) + topics/severity split (D-14) + unrated omission via the PDF-input filter (D-21) [ORDR-04, ORDR-07]
- [ ] 47-06-PLAN.md — Backup restore of the order sentinel (lock-step allowlist + sanitize-on-restore) + encrypted round-trip [ORDR-05]
- [x] 47-10-PLAN.md — View mode: fully-unrated topic renders name only (no "(- -> -)" suffix) in Sessions History + client-overview; averages untouched (D-23) [ORDR-07]

**Wave 3** (second add-session pass + clipboard/PDF-placement export split — after the restructure)

- [ ] 47-07-PLAN.md — Severity form semantics: unrated-aware readers, end-of-session-rating auto-hide when unrated (D-22), severity-off column coupling, "Severity at start" label [ORDR-06, ORDR-07]
- [ ] 47-09-PLAN.md — Export split from 47-05 (sequential on export-modal.js): clipboard buildSessionMarkdown saved-order + unrated omission (D-21) + edit-aware severity-block placement (G-8) [ORDR-04, ORDR-07]

**Wave 4** (planner-owned docs pass, D-18 — Ben reviews copy)

- [ ] 47-08-PLAN.md — Help topics (new reordering + "turn severity off") + 4-part changelog entry, EN corpus + DE/HE/CS + HELP-MAP.md [ORDR-06, ORDR-07, ORDR-08]

**Requirements amendment (approved by Ben at plan review, 2026-07-23):** ORDR-06 (app-level severity switch + ⓘ + help entry), ORDR-07 (unrated-by-default severity — D-19…D-23: no 11th "skip" value, tap-again-to-clear, omission from exports + views), ORDR-08 (group renames) added to REQUIREMENTS.md to cover the severity-optional + group-rename scope that grew into Phase 47.

### Phase 48: Mobile Pass & Validation Polish

**Goal**: The app's mobile chrome and validation feedback are hardened — header buttons contain their text, popovers behave, and failed validation is clearly visible — verified on real devices as the milestone's closing pass.
**Depends on**: Phase 44 (guardrails + pre-prod environment for on-device checks); otherwise feature-independent — slotted last as the mobile/polish + real-device closing pass.
**Requirements**: MOBL-01, MOBL-02, MOBL-03, MOBL-04, PLSH-01, PLSH-02, PLSH-03, PLSH-04
**Success Criteria** (what must be TRUE):

  1. On iPhone, index-page header button text stays inside the circular buttons, and the header "?" and language (globe) popovers are mutually exclusive — opening one closes the other.
  2. Birthdate fields reject future dates at all three entry points (add-client, inline + edit in add-session), and failure toasts use the error tone app-wide (add-client, PDF export, backup — not only the session form).
  3. Fields that fail validation show a visible error state (e.g. red border) in addition to focus — working in dark mode and RTL, clearing once the user edits the field — and the next-session-date field shows DISTINCT messages for "incomplete entry" vs "not in the future" (verified on real Safari/iPhone).
  4. On mobile Safari, an error toast expands a collapsed accordion section before focusing the offending field; and the deferred 21-03 checklist (photo-crop, overlay-close, body scroll lock) is verified on a real iPhone — failures fixed, passing items closed as obsolete.

**Plans**: TBD
**UI hint**: yes

## Backlog

Deferred items. The v1.1 carry-overs are unscoped; the codebase-concerns triage (2026-06-22) is complete.

- **Mobile — `21-03`** — crop bug fix (shared module), overlay-close, body scroll lock, iPhone device checkpoint. Archived: `milestones/v1.1-phases/21-comprehensive-mobile-responsiveness-audit-and-fix-all-app-screens-for-iphone-mobile-viewport/`. **Promoted into v1.4 Phase 48 (MOBL-04) — 2026-07-11.**
- **Help / onboarding build (Phase 26)** — design complete (`26-UI-SPEC.md`); **built and shipped as v1.3 (Phases 39–43).** Start from the archived UI-SPEC. Todo: `todos/pending/2026-05-15-in-app-onboarding-overview-help.md` (closes at v1.3 ship).
- **LNCH-04** — landing page DE/CS translation verification. Todo: `todos/pending/2026-03-18-verify-landing-page-translations.md`.
- **LNCH-06 (mobile QA)** — folded into the mobile backlog item above.
- **Codebase-map concerns — triaged with Ben 2026-06-22** (`.planning/codebase/CONCERNS.md`):
  - *Folded into v1.2:* error telemetry (P29), IDB escape hatch (P29), CSP→header + cache TTL (P28), RTL guard (P30), `openDB`/`innerHTML`/`var` cleanup (P31), DE/CS i18n (P33).
  - *Deferred to backlog:* license re-validation (adds a phone-home — revisit only if piracy is observed), table pagination, PDF→Web Worker, sequential photo-optimize loop, backup import size cap, jsPDF version pin, a11y (table `aria-rowindex`, export-stepper `aria-current`, toast/demo), landing-page `innerHTML`, license-key-in-localStorage note, IDB record caps.
  - *Won't-do for v1.2:* build step / bundler, full ES-module system, multi-device sync, removing `unsafe-inline` from `script-src` — all conflict with the zero-build / local-only constraints; revisit only if forced.
- **Broader extraction + test-coverage health ("Codebase Health II", candidate for a later milestone)** — surfaced during Phase 30 discussion (2026-06-26); **passed over for the v1.3 and v1.4 slots, now the v1.5 candidate.** v1.2 only char-tests + refactors the two god modules (`settings.js`, `add-session.js`); the rest of the `.js` landscape has two unaddressed risks: (a) **dangerous test-coverage gaps** in large files (`app.js` = 1,474 lines / only 6 tests; `license.js` 568/0; `overview.js`, `landing.js`), and (b) **further extraction candidates** among the 4-digit files (`backup.js`, `app.js`, `pdf-export.js`, `db.js` — triage god-module vs cohesive-large, don't assume) + an app-wide glue-duplication sweep (`t()` in 5 files, `showToast` in 2). Full coverage map + scoping in todo: `todos/pending/2026-06-26-broader-extraction-and-test-coverage-health.md`.
- **Comment-hygiene legacy retrofit + forward gate (~680 lines / ~43 shipped files)** — deferred 2026-07-11 (Ben: too much beside the v1.4 feature work); a focused **v1.5 candidate**. The reword sweep and the baseline-aware forward grep-gate travel together (post-retrofit the gate is a simple zero-tolerance grep). v1.4 ships NO gate — Phase 44 only stops the bleeding via the DEBT-01 CONVENTIONS.md root-cause fix + the single add-client.js console.warn reword.
- **Rich-text follow-ups (deferred from v1.4 scoping 2026-07-11):** underline formatting (`RTXT-U1` — no markdown syntax; revisit if users ask); true-italic-in-PDF via a vendored italic face (`RTXT-F2` — v1.4 ships italic at regular weight in PDF).
- **Other pending todos** — see `.planning/todos/pending/` (incl. deactivation data-loss warning, PWA install guidance [absorbed into v1.3 H-9], v12 IDB encryption, modality templates).
- **1-interactive-demo-on-landing-page-embedde** — an old landing-page interactive-demo iframe idea (`quick/1-interactive-demo-on-landing-page-embedde/1-PLAN.md`), never executed; superseded by the Phase 35 demo/chrome convergence work. Acknowledged and deferred at v1.2 close (2026-07-07) — revisit only if a prospective-buyer live demo becomes a priority.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-09 |
| 2. Visual Transformation | v1.0 | 3/3 | Complete | 2026-03-10 |
| 3. Data Model and Features | v1.0 | 3/3 | Complete | 2026-03-10 |
| 4. Internationalization and Distribution Research | v1.0 | 3/3 | Complete | 2026-03-12 |
| 5. Legal and Production Packaging | v1.0 | 3/3 | Complete | - |
| 5.1 Landing Page Visual Redesign | v1.0 | 2/2 | Complete | - |
| 5.2 Landing Page Polish | v1.0 | 3/3 | Complete | - |
| 6. Quality and Developer Experience | v1.0 | 2/2 | Complete | - |
| 7. ZIP Backup Strategy | v1.0 | 2/2 | Complete | 2026-03-18 |
| 8. Terminology and Quick UX Fixes | v1.1 | 2/2 | Complete | 2026-03-19 |
| 9. Heart Shield Redesign | v1.1 | 2/2 | Complete | - |
| 10. UX Power Features | v1.1 | 2/2 | Complete | 2026-03-19 |
| 11. Visual Identity Update | v1.1 | 2/2 | Complete | 2026-03-19 |
| 12. Launch Prerequisites | v1.1 | 4/4 | Complete | 2026-03-19 |
| 13. Greeting Quotes | v1.1 | 1/1 | Complete | - |
| 14. i18n/Footer/Email | v1.1 | 6/6 | Complete | - |
| 15. Architecture/UI Audit | v1.1 | 3/3 | Complete | 2026-03-23 |
| 16. Audit Fix: Code | v1.1 | 5/5 | Complete | 2026-03-23 |
| 17. Audit Fix: Business | v1.1 | 3/3 | Complete | 2026-03-24 |
| 18. Technical Debt | v1.1 | 3/3 | Complete | 2026-03-24 |
| 19. Go-Live Preparation | v1.1 | 8/8 | Complete | 2026-03-24 |
| 20. Pre-Launch UI Polish | v1.1 | 3/3 | Complete | 2026-03-25 |
| 21. Mobile Responsiveness | v1.1 | 2/3 | Partial — 21-03 deferred to backlog | - |
| 22. Session Workflow Loop | v1.1 | 15/15 | Complete | - |
| 23. PDF Hebrew RTL Rewrite | v1.1 | 11/11 | Complete | 2026-05-12 |
| 24. Pre-Launch Final Cleanup | v1.1 | 8/8 | Complete | 2026-05-14 |
| 25. Backup Architectural Rework | v1.1 | 13/13 | Complete | 2026-05-16 |
| 26. In-App Onboarding / Help | v1.1 | Design-only | Deferred — built as v1.3 | - |
| 27. Backup Modal Visual Cohesion | v1.1 | 1/1 | Complete | 2026-06-15 |
| 28. Update Reliability & Versioning | v1.2 | 4/4 | Complete | 2026-06-22 |
| 29. Reliability & Observability | v1.2 | 4/4 | Complete | 2026-06-23 |
| 30. Test Harness & Coverage | v1.2 | 13/13 | Complete | 2026-06-27 |
| 31. Refactor God Modules | v1.2 | 6/6 | Complete | 2026-06-28 |
| 32. README + Code Comments | v1.2 | 4/4 | Complete | 2026-06-29 |
| 33. DE/CS i18n completion | v1.2 | 3/3 | Complete | 2026-07-06 |
| 34. Session PDF Export — Visual Polish | v1.2 | 10/10 | Complete | 2026-06-30 |
| 35. Demo System Refresh / Version Parity | v1.2 | 6/6 | Complete | 2026-06-30 |
| 36. Code Comments — Batch 2 | v1.2 | 5/5 | Complete | 2026-07-02 |
| 37. Date consistency + date-format + session types | v1.2 | 15/15 | Complete | 2026-07-06 |
| 38. Next session date field + overview column | v1.2 | 12/12 | Complete | 2026-07-07 |
| 39. Help Center & "?" Entry Point | v1.3 | 6/6 | Complete | 2026-07-07 |
| 40. First-Run Welcome & Onboarding Coordinator | v1.3 | 8/8 | Complete | 2026-07-08 |
| 41. Replayable Guided Tour | v1.3 | 14/14 | Complete | 2026-07-09 |
| 42. In-App Changelog & What's-New | v1.3 | 11/11 | Complete | 2026-07-09 |
| 42.1. Help & Onboarding Translation (HE/DE/CS) | v1.3 | 10/10 | Complete | 2026-07-10 |
| 43. Docs-Maintenance Hard Gate | v1.3 | 10/10 | Complete | 2026-07-10 |
| 44. Tech-Debt Guardrails & Pre-Prod Environment | v1.4 | 5/5 | Complete    | 2026-07-12 |
| 45. Rich-Text Rendering & Export Foundation | v1.4 | 8/8 | Complete    | 2026-07-13 |
| 46. Rich-Text Toolbar Editor | v1.4 | 16/17 | Complete    | 2026-07-17 |
| 47. Session-Section Reordering | v1.4 | 6/10 | In Progress|  |
| 48. Mobile Pass & Validation Polish | v1.4 | 0/TBD | Not started | - |
