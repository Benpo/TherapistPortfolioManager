# Roadmap: TherapistPortfolioManager

## Overview

Transform the existing functional vanilla JS prototype into a sellable product for Emotion Code / Body Code therapists. The journey moves through six phases: establishing the technical foundation (design tokens, fonts, migration infrastructure, backup safety), visually transforming the app (garden theme, dark mode, RTL-safe CSS), consolidating and expanding the data model with new features, internationalizing to 4 languages while researching distribution options, implementing legal compliance and production packaging, and finally validating quality across all dimensions while creating maintainer documentation for Sapir.

## Milestones

- ✅ **v1.0 MVP** — Phases 1–7 (shipped 2026-03-18)
- ✅ **v1.1 Final Polish & Launch** — Phases 8–27 (shipped 2026-06-22) — full phase detail archived in `milestones/v1.1-ROADMAP.md`
- 📋 **v1.2 Codebase Health & Reliability** — Phases 28–36 (core 28–33 co-designed & locked with Ben 2026-06-22; tail 34–36 added 2026-06-29)

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

### 📋 v1.2 — Codebase Health & Reliability (Planned — Phases 28–36)

Scope **co-designed and locked with Ben 2026-06-22** (see PROJECT.md Key Decisions). A deliberate shift from feature work to maintainability and reliability. Phases run in **dependency order**: get updates reliably delivered + observable, build a test safety net, *then* refactor behind it, *then* document the result. No PLAN files yet — `/gsd-plan-phase` per phase in upcoming sessions.

- [x] **Phase 28: Update Reliability & Versioning** — field-verified fix for installed-Safari PWA updates; one source-of-truth version constant driving the footer + SW `CACHE_NAME` + a runtime **integrity self-check** (so the displayed version can't lie, as v209 did); CSP `<meta>`→HTTP header; `_headers` cache TTL. Fully offline-compatible (no phone-home). Footer source today: `assets/shared-chrome.js:~8`. (completed 2026-06-22)
- [x] **Phase 29: Reliability & Observability** — local crash log persisted to IndexedDB + a Settings "Report a problem" copy-to-clipboard flow (zero network, GDPR-safe); IDB migration "reset & recover" escape hatch so a failed migration can't trap a user in an infinite refresh loop. (completed 2026-06-23)
- [x] **Phase 30: Test Harness & Coverage** — fix the 7 PDF tests that can't run in Node (`jsdom` lacks `HTMLCanvasElement.getContext`; old-Node `blob.arrayBuffer`); add an RTL regression guard; add **behavior tests on the god modules before the refactor** (per `feedback-behavior-verification`). May introduce the project's first `package.json` + dev-dependency (decide at plan time). (completed 2026-06-26)
- [x] **Phase 31: Refactor God Modules** — behavior-preserving extraction from `settings.js` (~2,827 lines) and `add-session.js` (~2,173 lines) using the existing IIFE pattern; guarded by the green suite from Phase 30. Opportunistic in touched code: `var`→`const`, `innerHTML`-i18n hardening, `openDB()` connection pooling, logging in silent catches. (completed 2026-06-28)
- [x] **Phase 32: README + Code Comments** — project README (run/deploy/architecture) for Sapir as ongoing maintainer; code-level comments describing the *refactored* structure. (plans executed 2026-06-29; pending human UAT — see 32-UAT.md) (completed 2026-06-29)
- [ ] **Phase 33: DE/CS i18n completion** — translate the 13 export-modal keys currently showing English to German/Czech users (needs Sapir's strings). Independent of the others — slot in whenever ready.
- [ ] **Phase 34: Session PDF Export — Visual Polish** — make the exported session PDF (`pdf-export.js`, bidi-aware) look intentionally designed rather than default jsPDF output. **Design-led**: collaborative brainstorm/design pass to define the target look → SPEC → PLAN → exec. Success criteria drafted at design time. Hebrew RTL/bidi correctness must be preserved. (added 2026-06-29 — first of the v1.2 tail, by Ben's work order)
- [ ] **Phase 35: Demo System Refresh / Version Parity** — bring the demo group (`demo.js`/`demo-seed.js`/`demo-hints.js`/`demo.html`) back in sync with the current app schema, features, and version (flagged "stale" in `32-COMMENT-COVERAGE-MAP.md`). Effort uncertain → **size via a discuss/spike before locking a plan**. (added 2026-06-29)
- [ ] **Phase 36: Code Comments — Batch 2** — apply the Phase 32 banner convention to the remaining ~21 production modules, starting at the 3 lowest-staleness batch-1 modules (`db.js`/`overview.js`/`sessions.js`); seeded by `32-COMMENT-COVERAGE-MAP.md`. Guarded by green `npm test` + comments-only strip-and-compare gate. (added 2026-06-29)

### Phase 28: Update Reliability & Versioning

**Goal**: Installed PWA users (including iOS Safari) reliably receive app updates, and the displayed version is a single source of truth that a runtime self-check guarantees cannot silently lie.
**Depends on**: Nothing (first v1.2 phase; reliable update delivery must work before any later fix can reach installed users)
**Requirements**: VER-01, VER-02, VER-03, VER-04, VER-05, VER-06
**Success Criteria** (what must be TRUE):

  1. A code change pushed to production is received and applied by an already-installed PWA on a real iOS Safari device, field-verified (not just asserted in theory)
  2. The footer version, the service-worker `CACHE_NAME`, and the value the integrity check validates against all derive from one version constant — changing the version in one place updates all three
  3. When the running or cached code diverges from the source-of-truth version, the runtime integrity self-check detects it and surfaces the mismatch, so a stale build cannot display a version it is not actually running (the v209 failure mode)
  4. CSP is served via an HTTP `Content-Security-Policy` header in `_headers`, and the per-page `<meta http-equiv>` CSP tags are removed or reconciled to match
  5. Static JS/CSS in `_headers` is served with a longer cache TTL (`max-age=86400`+), with the service worker still owning freshness for installed users
  6. No update-reliability or versioning behavior introduces a network call — the app remains fully functional offline

**Plans:** 4/4 plans complete
**Wave 1**

- [x] 28-01-PLAN.md — Versioning foundation: version.js single source of truth, SW CACHE_NAME auto-derived, deploy-time stamp
- [x] 28-02-PLAN.md — CSP HTTP header migration (verbatim-equivalent) + raise JS/CSS cache TTL to 86400

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 28-03-PLAN.md — HTML convergence: delete the 21 CSP `<meta>` tags + wire version.js into the 20 app pages

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 28-04-PLAN.md — Integrity self-check + honest nudge + footer `⚠` marker + apply-on-next-navigation update delivery

### Phase 29: Reliability & Observability

**Goal**: Production problems on a user's device are diagnosable — errors are captured locally, the user can hand over a diagnostic log without any data leaving the device, and a failed database migration can no longer trap the user in an unrecoverable refresh loop.
**Depends on**: Phase 28 (observability code must actually reach installed users via the now-reliable update path)
**Requirements**: OBS-01, OBS-02, OBS-03
**Success Criteria** (what must be TRUE):

  1. An uncaught error or unhandled promise rejection is captured and the most recent N entries are persisted to IndexedDB, with zero network calls made
  2. Settings exposes a "Report a problem" action that copies the persisted error log plus basic diagnostic context to the clipboard for the user to paste into a support email — nothing is transmitted automatically
  3. When an IndexedDB migration fails, the user is offered a "reset & recover" escape hatch instead of an endless "please refresh" loop, and using it returns the app to a usable state

**Plans:** 4/4 plans complete

**Wave 1** *(parallel — no file overlap)*

- [x] 29-01-PLAN.md — OBS-01 crash-log foundation: `crashlog.js` capture module (window.onerror + unhandledrejection), dual IDB+localStorage storage, 30-day/50-entry prune, `CrashLog.logError()` seam, wired early onto all 20 app pages
- [x] 29-02-PLAN.md — OBS-03 reset & recover escape hatch: read-only export-around-failure open + gated reset (affirmation checkbox + double-confirm) replacing the dead-end migration-error refresh loop

**Wave 2** *(blocked on 29-01)*

- [x] 29-03-PLAN.md — OBS-02 report-a-problem screen (`report.html` + `report.js`): redacted editable preview, Copy report, mailto handoff; Settings entry row; wires Phase 28 integrity-mismatch persistence + version.js wedged stubs

**Gap closure** *(UAT-diagnosed OBS-01 fixes, 2026-06-25)*

- [x] 29-04-PLAN.md — OBS-01 crash-log gap closure: serialize `append()` (tail-promise queue) to fix the lost-update race in concurrent appends (case 7 RED→GREEN), and guard the inline early-buffer handler across all 21 pages so a post-load error is logged exactly once (no 'early' duplicate)

### Phase 30: Test Harness & Coverage

**Goal**: A green automated test suite runs from a single documented command and captures the current behavior of the god modules, establishing the safety net that the Phase 31 refactor will be guarded by.
**Depends on**: Nothing (independent, but MUST complete before Phase 31 — its green suite guards the refactor)
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):

  1. The 7 previously-unrunnable PDF tests run green in Node, with the `jsdom` `HTMLCanvasElement.getContext` gap and the old-Node `blob.arrayBuffer` issue resolved
  2. An automated RTL regression guard fails if `dir="rtl"` is applied to a non-Hebrew locale (EN/DE/CS)
  3. Behavior tests capture the current observable behavior of `settings.js` and `add-session.js`, and they pass against the unrefactored code (the pre-refactor green baseline)
  4. The full test suite runs via a single documented command

**Plans:** 13/13 plans complete

**Wave 1** *(foundation)*

- [x] 30-01-PLAN.md — TEST-04 runner foundation: first-ever root `package.json` (private, devDeps={jsdom ^29.1.1}, engines `>=18`) + `tests/run-all.js` (single `npm test`, JSDOM_PATH bridge to the installed jsdom); engines floor fixes the `blob.arrayBuffer` root cause (TEST-01)

**Wave 2** *(shared helpers — blocked on 30-01)*

- [x] 30-02-PLAN.md — Shared test helpers: `tests/_helpers/jsdom-pdf-env.js` (`buildJsdomEnv`, getContext→null stub, deterministic jsPDF pinning) + `tests/_helpers/app-stub.js` (`createAppStub` App.* surface with `__calls` spy, resolving `initCommon`)

**Wave 3** *(tests — parallel, no file overlap — blocked on 30-02)*

- [x] 30-03-PLAN.md — TEST-01 + TEST-02: migrate the 7 PDF tests onto the shared helper (getContext stubbed, no `/tmp` jsdom) + `tests/30-rtl-guard.test.js` (real `App.setLanguage` dir path, he→rtl / en·de·cs→ltr, fails on non-Hebrew rtl)
- [x] 30-04-PLAN.md — TEST-03 settings.js: `30-settings-section-roundtrip.test.js` (jsdom real-page save→reload round-trip, closes the documented gap) + `30-settings-tabnav.test.js` (?tab= select / URL write / invalid fallback)
- [x] 30-05-PLAN.md — TEST-03 add-session export modal: `30-export-markdown.test.js` (executing markdown-builder characterization via the real export preview/copy — replaces source-slicing) + `30-export-stepper.test.js` (stepper 1→2→3 + preview + files-only share)
- [x] 30-06-PLAN.md — TEST-03 add-session issues: `30-issue-delta.test.js` (severity before→after delta + `getIssuesPayload` shape + empty-row validation, executing observable-behavior)

**Gap closure** *(re-audit gaps GAP-01..16 + Prevention#1 + WR-01/WR-02 + research corrections; planned 2026-06-27 — every new/strengthened test EXECUTES the real module under jsdom/vm and asserts observable behavior, no source-slicing)*

**Wave 1** *(parallel — distinct files, no overlap)*

- [x] 30-07-PLAN.md — add-session high-risk write-new: form dirty/revert (GAP-01/B6), read-mode + edit-client modal (GAP-02/B7), client dropdown/spotlight/title wiring (GAP-04/B8)
- [x] 30-08-PLAN.md — settings high-risk: snippet-settings screen wiring (GAP-03/A2) + saved-notice & disable-confirm (GAP-07/A1)
- [x] 30-09-PLAN.md — settings strengthen: backups helper-text & password-gate rejection (GAP-08/A4) + photos optimize-loop body & dataURL adapters & success path (GAP-09/A5)
- [x] 30-10-PLAN.md — add-session strengthen existing 30-* tests: export-stepper residuals (GAP-10/B3), past-session sectionHasData (GAP-11/B4), issue cap & remove-toggle (GAP-14/B5)
- [x] 30-11-PLAN.md — add-session small new tests: autogrow wiring (GAP-12/B1) + per-field copy (GAP-13/B2)
- [x] 30-12-PLAN.md — fake-test cleanup: delete 2 fakes + 2 redundant structural guards (GAP-05/06/16), replace with real post-save-redirect + settings save-failed-toast tests, remove 25-11 fake Scenario 5 (GAP-15)

**Wave 2** *(blocked on Wave 1 — the gate validates the cleaned, extended tree)*

- [x] 30-13-PLAN.md — Prevention#1 permanent fake-test detector gate (allowlisting the 3 legit static guards) + run-all.js timeout/killSignal (WR-01) + WrappedJsPDF forward-all-args (WR-02) + 30-RESEARCH.md behavior-inventory corrections

### Phase 31: Refactor God Modules

**Goal**: The two largest modules are decomposed into cohesive single-responsibility IIFE modules with no observable behavior change, verified by the Phase 30 suite staying green throughout.
**Depends on**: Phase 30 (behavior-preserving refactor requires the green test suite as a safety net)
**Requirements**: RFCT-01, RFCT-02, RFCT-03
**Success Criteria** (what must be TRUE):

  1. Cohesive units (e.g. SnippetEditor, PhotoManager, StorageUsage) are extracted from `settings.js` into separate IIFE modules, and the Phase 30 suite stays green
  2. The export-modal logic is extracted from `add-session.js` into its own IIFE module, with behavior preserved and the suite green
  3. Within code touched by the refactor only, opportunistic cleanups are applied: `var`→`const`/`let`, `innerHTML`+i18n hardening in `overview.js`/`sessions.js`, `openDB()` connection pooling (caching the resolved `IDBDatabase`), and tagged logging added to non-trivial silent `catch` blocks

**Plans:** 6/6 plans complete

Plans:
**Wave 1**

- [x] 31-01-PLAN.md — Wave 1 · RFCT-03 openDB() connection pooling, test-first (deadlock-safe; new `31-openDB-pooling` characterization test)
- [x] 31-02-PLAN.md — Wave 1 · RFCT-03 overview.js + sessions.js innerHTML→textContent/DOM hardening, test-first (2 new characterization tests)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 31-03-PLAN.md — Wave 2 · RFCT-01 extract SnippetsUI IIFE → `settings-snippets.js` (+ wiring + extraction-robust snippet test loaders + D-04 glue dedup)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 31-04-PLAN.md — Wave 3 · RFCT-01 extract Photos/StorageUsage (2 coupled IIFEs) → `settings-photos.js` (+ wiring + photos test loaders, vm + win.eval)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 31-05-PLAN.md — Wave 4 · RFCT-02 extract export-modal + md builders → `export-modal.js` via init(ctx) context-injection (+ wiring + :2071 log fix + export test loaders)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 31-06-PLAN.md — Wave 5 · finalize: APP_VERSION bump (cache roll) + PRECACHE audit + D-08 manual UAT smoke-test phase gate

### Phase 32: README + Code Comments

**Goal**: The maintainer (Ben + his AI agents) can run, deploy, and understand the app's architecture from an in-repo project README, and the refactored modules carry comments describing their structure and responsibilities. _(Audience reframed by 32-CONTEXT D-01/D-02 — supersedes the original "for Sapir" wording.)_
**Depends on**: Phase 31 (documentation and code comments describe the *refactored* structure)
**Requirements**: DOCS-01, DOCS-02
**Success Criteria** (what must be TRUE):

  1. A project README documents how to run the app locally, how to deploy it, and how its architecture is organized — written for the maintainer (Ben + his AI agents, per D-01) and kept in-repo as agent context (D-02)
  2. The modules extracted in Phase 31 carry code-level comments describing their structure and responsibilities

**Plans:** 4/4 plans complete

Plans:
**Wave 1** *(all four deliverables are independent — fully parallel)*

- [x] 32-01-PLAN.md — Wave 1 · DOCS-01 rewrite README.md into the in-repo maintainer guide (run/deploy/file-map/recipes/agent-rules) + stop publishing it (D-04 deploy.yml line removal)
- [x] 32-02-PLAN.md — Wave 1 · DOCS-02 comment pilot part A: de-phase + responsibility banners on the 3 extracted modules (export-modal, settings-snippets, settings-photos) + comments-only strip-and-compare gate
- [x] 32-03-PLAN.md — Wave 1 · DOCS-02 comment pilot part B: slimmed-shape banner on settings.js + brand-new banner on add-session.js + de-phase + comments-only gate
- [x] 32-04-PLAN.md — Wave 1 · by-product artifacts: comment-coverage map (D-14) + help-content inventory (D-13), both `.planning/` seeds

### Phase 33: DE/CS i18n completion

**Goal**: German and Czech users see fully translated export-modal strings — no English fallbacks and no `// TODO i18n` markers remain in the DE/CS translation files.
**Depends on**: Nothing (fully independent — slot in whenever Sapir's translation strings are ready)
**Requirements**: I18N-01, I18N-02
**Success Criteria** (what must be TRUE):

  1. The 13 English-fallback keys in `assets/i18n-de.js` (lines ~419–447) are translated to German, and no `// TODO i18n` markers remain
  2. The 13 English-fallback keys in `assets/i18n-cs.js` (lines ~419–447) are translated to Czech, and no `// TODO i18n` markers remain
  3. A DE or CS user opening the export modal sees the stepper labels, step helpers, and markdown formatting tips in their own language rather than English

### Phase 34: Session PDF Export — Visual Polish

**Goal**: The client-facing session-export PDF is intentionally designed in the Sessions Garden brand (icon-derived palette, branded header, client card, styled before/after severity) rather than default jsPDF output — with Hebrew RTL/bidi correctness fully preserved and the displayed session number correct under deletions.
**Depends on**: Nothing (independent of Phases 33, 35, 36).
**Requirements**: PDFX-01 (visual redesign, incl. FN-2 localized pill + FN-3 offline logo), PDFX-02 (session-number ordinal correctness), PDFX-03 (save-before-export guard).
**Status**: **Design LOCKED** + UI-SPEC approved (2026-06-29). Planning in progress (`/gsd-plan-phase 34`). Contract: `34-UI-SPEC.md` + `34-DESIGN-DECISIONS.md` + `design-mockups/FINAL-mockup.html`; context `34-CONTEXT.md`, research `34-RESEARCH.md`, validation `34-VALIDATION.md`.
**Success Criteria** (what must be TRUE):

  1. The exported session PDF renders the locked design (icon-mint header band, app-icon logo with green keyline, document-title header with no brand-as-letterhead, cream client card, free-text trapped-emotions, two-bar before/after severity, "made with Sessions Garden" footer) — matching `34-DESIGN-DECISIONS.md`
  2. Hebrew RTL/bidi rendering remains correct after the redesign — no regression vs the Phase 23 RTL rewrite
  3. The displayed **session number is a derived chronological ordinal** (position among the client's sessions sorted by date), NOT the autoIncrement DB id — so deleting an earlier session renumbers the rest (delete the 2nd → former 3rd becomes 2nd), verified by a behavior test
  4. The in-person/remote pill renders the session's existing localized field value (no new field, no hardcoded label)
  5. The redesign is verified against the Phase 30 PDF test suite (suite stays green), and the logo is an embedded PNG (fully offline)
  6. Exporting with unsaved changes offers a non-blocking "Save & export" / "Keep editing" prompt (no hard block, no stale export); "Save & export" persists via a behavior-preserving extracted save function and continues the export with a correct ordinal

**Plans:** 8/10 plans executed

Plans:
**Wave 1**

- [x] 34-01-PLAN.md — Offline logo base64 module + SW precache (D-05/FN-3) [W1]
- [x] 34-02-PLAN.md — New i18n strings (subtitle, severity heading, footer mark/Exported on, save-export prompt) ×4 locales [W1]
- [x] 34-03-PLAN.md — Wave-0 render tests: logo-embed, pill-localized, rtl-newblocks (RED) [W1]
- [x] 34-04-PLAN.md — Wave-0 behavior tests: session-ordinal (FN-1 spine), severity-bars, save-before-export (RED) [W1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 34-05-PLAN.md — Data tier: deriveSessionOrdinal (FN-1) + buildSessionPDF input contract (sessionNumber/issues[]/exportedOn) [W2]
- [x] 34-06-PLAN.md — Render A: header band + client card + embedded logo + localized pill (replaces drawPage1Header) [W2]

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 34-07-PLAN.md — Render B: leaf-diamond section headings + body typography + footer band [W3]
- [x] 34-08-PLAN.md — PDFX-03: extract reusable save + non-blocking Save-before-export prompt [W3]

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 34-09-PLAN.md — Render C: two-bar before/after severity block + move severity out of markdown [W4]

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 34-10-PLAN.md — Regenerate 5 SHA-256 baselines + full suite green + human visual verification [W5]

### Phase 35: Demo System Refresh / Version Parity

**Goal**: The demo experience mirrors the current shipped app — its seed data, hints, and screens reflect the present schema, feature set, and version — so a prospective buyer sees the real product rather than a stale snapshot.
**Depends on**: Nothing (independent). Effort uncertain — size before planning.
**Requirements**: TBD — formalized after the sizing spike (provisional code: DEMO-*).
**Status**: Begins with a short **sizing spike / discuss-phase** to determine whether this is a seed-data refresh (small) or ripples into hints/screens (medium), before a plan is locked. (Distinct from the accepted-as-is `window.name` demo-security limitation in `todos/pending/2026-06-28-demo-mode-window-name-hardening.md`.)
**Success Criteria (DRAFT — refine after sizing)**:

  1. The demo seed data (`demo-seed.js`) reflects the current session/client/issue schema with no missing or obsolete fields
  2. Demo hints/screens (`demo-hints.js`, `demo.html`) match current app features and navigation
  3. The demo displays a version consistent with the shipped app (no stale version mismatch)

**Plans:** Not yet planned — sizing spike first.

### Phase 36: Code Comments — Batch 2

**Goal**: The remaining production JS modules carry file-top banner comments following the Phase 32 convention, so the whole `assets/*.js` (+ root `sw.js`) surface is self-describing for the maintainer and AI agents — extending DOCS-02 from the 5 pilot modules to full coverage.
**Depends on**: Nothing (independent; builds on Phase 32's established convention). If Phases 34/35 touch `pdf-export.js` / the demo files, comment those after they settle to avoid churn.
**Requirements**: DOCS-03 (continuation of DOCS-02).
**Success Criteria** (what must be TRUE):

  1. The 3 batch-1 modules (`db.js`, `overview.js`, `sessions.js`) carry Phase-32-convention banners (what it owns · public `window.*` surface · cross-`window.*` dependencies · key invariants), with header-less files getting brand-new banners
  2. The remaining production modules listed in `32-COMMENT-COVERAGE-MAP.md` are covered, with `// Phase X` / `// D-NN` archaeology de-phased into plain what-it-does text
  3. Every batch is verified by green `npm test` + the comments-only strip-and-compare gate (zero behavior change)

**Plans:** Not yet planned.

## Backlog

Deferred items. The v1.1 carry-overs are unscoped; the codebase-concerns triage (2026-06-22) is complete.

- **Mobile — `21-03`** — crop bug fix (shared module), overlay-close, body scroll lock, iPhone device checkpoint. Archived: `milestones/v1.1-phases/21-comprehensive-mobile-responsiveness-audit-and-fix-all-app-screens-for-iphone-mobile-viewport/`.
- **Help / onboarding build (Phase 26)** — design complete (`26-UI-SPEC.md`), build deferred. Start from the archived UI-SPEC. Todo: `todos/pending/2026-05-15-in-app-onboarding-overview-help.md`.
- **LNCH-04** — landing page DE/CS translation verification. Todo: `todos/pending/2026-03-18-verify-landing-page-translations.md`.
- **LNCH-06 (mobile QA)** — folded into the mobile backlog item above.
- **Codebase-map concerns — triaged with Ben 2026-06-22** (`.planning/codebase/CONCERNS.md`):
  - *Folded into v1.2:* error telemetry (P29), IDB escape hatch (P29), CSP→header + cache TTL (P28), RTL guard (P30), `openDB`/`innerHTML`/`var` cleanup (P31), DE/CS i18n (P33).
  - *Deferred to backlog:* license re-validation (adds a phone-home — revisit only if piracy is observed), table pagination, PDF→Web Worker, sequential photo-optimize loop, backup import size cap, jsPDF version pin, a11y (table `aria-rowindex`, export-stepper `aria-current`, toast/demo), landing-page `innerHTML`, license-key-in-localStorage note, IDB record caps.
  - *Won't-do for v1.2:* build step / bundler, full ES-module system, multi-device sync, removing `unsafe-inline` from `script-src` — all conflict with the zero-build / local-only constraints; revisit only if forced.
- **Broader extraction + test-coverage health (post-v1.2 outlook — likely a "v1.3 Codebase Health II")** — surfaced during Phase 30 discussion (2026-06-26). v1.2 only char-tests + refactors the two god modules (`settings.js`, `add-session.js`); the rest of the `.js` landscape has two unaddressed risks: (a) **dangerous test-coverage gaps** in large files (`app.js` = 1,474 lines / only 6 tests; `license.js` 568/0; `overview.js`, `landing.js`), and (b) **further extraction candidates** among the 4-digit files (`backup.js`, `app.js`, `pdf-export.js`, `db.js` — triage god-module vs cohesive-large, don't assume) + an app-wide glue-duplication sweep (`t()` in 5 files, `showToast` in 2). Best done *after* v1.2 establishes the test harness (P30) + extraction pattern (P31) as the template. Full coverage map + scoping in todo: `todos/pending/2026-06-26-broader-extraction-and-test-coverage-health.md`. Decide promotion at v1.2 close.
- **Other pending todos** — see `.planning/todos/pending/` (incl. deactivation data-loss warning, PWA install guidance, v12 IDB encryption, drag-sort settings, modality templates).

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
| 26. In-App Onboarding / Help | v1.1 | Design-only | Deferred — build in backlog | - |
| 27. Backup Modal Visual Cohesion | v1.1 | 1/1 | Complete | 2026-06-15 |
| 28. Update Reliability & Versioning | v1.2 | 4/4 | Complete    | 2026-06-22 |
| 29. Reliability & Observability | v1.2 | 4/4 | Complete    | 2026-06-23 |
| 30. Test Harness & Coverage | v1.2 | 13/13 | Complete    | 2026-06-27 |
| 31. Refactor God Modules | v1.2 | 6/6 | Complete    | 2026-06-28 |
| 32. README + Code Comments | v1.2 | 4/4 | Complete    | 2026-06-29 |
| 33. DE/CS i18n completion | v1.2 | 0/– | Planned | - |
| 34. Session PDF Export — Visual Polish | v1.2 | 8/10 | In Progress|  |
| 35. Demo System Refresh / Version Parity | v1.2 | 0/– | Planned (size first) | - |
| 36. Code Comments — Batch 2 | v1.2 | 0/– | Planned | - |
