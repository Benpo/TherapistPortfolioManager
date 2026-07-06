# Requirements: TherapistPortfolioManager

**Defined:** 2026-06-22
**Core Value:** Therapists can efficiently track client sessions, trapped emotions, and clinical progress without any technical setup, internet connection, or data leaving their device.

> **Milestone v1.2 — Codebase Health & Reliability.** A deliberate shift from feature work to **maintainability and reliability**. Scope was co-designed and locked with Ben on 2026-06-22 and sourced from the codebase concerns triage (`.planning/codebase/CONCERNS.md`). Phases run in **dependency order** (28 → 33): get updates reliably delivered + observable, build a test safety net, *then* refactor behind it, *then* document the result. Requirement categories are phase-aligned, continuing the v1.1 convention.

## v1.2 Requirements

Requirements for the Codebase Health & Reliability milestone. Each maps to exactly one roadmap phase (28–36; phases 34–36 are the v1.2 tail added 2026-06-29 by Ben's work order).

### Update Reliability & Versioning (Phase 28)

- [x] **VER-01**: Installed PWA (including iOS Safari) reliably receives and applies app updates — field-verified on a real installed device, not just in theory _(manual verification component — needs a real iOS device)_
- [x] **VER-02**: A single source-of-truth version constant drives the footer version, the service-worker `CACHE_NAME`, and the value the integrity check validates against (today the footer is a static placeholder in `assets/shared-chrome.js:~8`)
- [x] **VER-03**: A runtime integrity self-check detects when the running/cached version diverges from the source-of-truth version and surfaces it — so the displayed version can't silently lie (as v209 did)
- [x] **VER-04**: CSP is delivered via HTTP header in `_headers`, and the per-page `<meta http-equiv>` CSP tags are removed/reconciled
- [x] **VER-05**: `_headers` cache TTL for static JS/CSS is lengthened (e.g. `max-age=86400`+) with the service worker still owning freshness for installed users
- [x] **VER-06**: All update-reliability and versioning behavior remains fully offline — no phone-home / network dependency introduced _(cross-cutting constraint)_

### Reliability & Observability (Phase 29)

- [x] **OBS-01**: Uncaught errors and unhandled promise rejections are captured and the last N persisted to IndexedDB (`window.onerror` + `unhandledrejection`), with zero network calls
- [x] **OBS-02**: Settings has a "Report a problem" action that copies the persisted error log plus basic diagnostic context to the clipboard for the user to paste into a support email — nothing leaves the device automatically (GDPR-safe)
- [x] **OBS-03**: A failed IndexedDB migration offers a "reset & recover" escape hatch so a user cannot be trapped in an infinite "please refresh" loop

### Test Harness & Coverage (Phase 30)

- [x] **TEST-01**: The 7 currently-unrunnable PDF tests run green in Node (resolve the `jsdom` `HTMLCanvasElement.getContext` gap and the old-Node `blob.arrayBuffer` issue)
- [x] **TEST-02**: An automated RTL regression guard fails if `dir="rtl"` is wrongly applied to non-Hebrew locales (EN/DE/CS)
- [x] **TEST-03**: Behavior tests capture the current observable behavior of the god modules (`settings.js`, `add-session.js`) before any refactor, establishing a green safety net (per `feedback-behavior-verification`)
- [x] **TEST-04**: The full test suite runs via a single documented command (whether to introduce the project's first `package.json` + dev-dependencies is a plan-time decision)

### Refactor God Modules (Phase 31)

- [x] **RFCT-01**: Cohesive units are extracted from `settings.js` (~2,827 lines) into separate IIFE modules (e.g. SnippetEditor, PhotoManager, StorageUsage) with no observable behavior change (Phase 30 suite stays green)
- [x] **RFCT-02**: Export-modal logic is extracted from `add-session.js` (~2,173 lines) into its own IIFE module with behavior preserved (suite green)
- [x] **RFCT-03**: Opportunistic cleanups within touched code only — `var`→`const`/`let`, `innerHTML`+i18n hardening (`overview.js`/`sessions.js`), `openDB()` connection pooling (cache the resolved `IDBDatabase`), and tagged logging in non-trivial silent `catch` blocks

### README + Code Comments (Phase 32)

- [x] **DOCS-01**: A project README documents how to run, deploy, and understand the architecture of the app, written for Sapir as the ongoing maintainer
- [x] **DOCS-02**: The refactored modules carry code-level comments describing their structure and responsibilities _(depends on Phase 31)_

### DE/CS i18n Completion (Phase 33)

- [ ] **I18N-01**: The 13 English-fallback keys in `assets/i18n-de.js` (lines ~419–447) are translated to German; no `// TODO i18n` markers remain _(needs Sapir's strings)_
- [ ] **I18N-02**: The 13 English-fallback keys in `assets/i18n-cs.js` (lines ~419–447) are translated to Czech; no `// TODO i18n` markers remain _(needs Sapir's strings)_

### Session PDF Export — Visual Polish (Phase 34)

- [x] **PDFX-01**: The exported session PDF is visually redesigned — full-bleed mint header band (embedded offline logo + title/subtitle, *no* clinic letterhead), cream client card with a localized in-person/remote pill, leaf-diamond section headings, free-text body, a two-bar before/after severity block, and a footer band (brand-as-tool mark + pagination + "Exported on" date) — using jsPDF primitives only (flat fills/lines/embedded PNG/colored text). **Hebrew RTL/bidi must not regress** and the **Phase 23/30 PDF test suite stays green** (the 5 SHA-256 fixtures regenerated deliberately and visually verified; content-stream floor tests unchanged). Includes FN-2 (localized `sessionType` pill, no new field) and FN-3 (offline-embedded `icon-512.png`).
- [x] **PDFX-02**: The card's "Session #N" is a **derived chronological ordinal** (1-based position among the client's sessions sorted ascending by `date`, tie-break `id`, computed at export time — never the `autoIncrement` DB key), so deleting a middle session renumbers the rest with no gaps. **MUST be covered by a falsifiable behavior test authored before implementation** (FN-1; per `feedback-behavior-verification`).
- [x] **PDFX-03 — DESCOPED (2026-06-30, invalid premise)**: ~~Exporting with unsaved changes offers a non-blocking "Save & export" / "Keep editing" prompt.~~ Descoped after implementation: the session-export button (`#exportSessionBtn`) is shown **only in read mode** on an already-saved session (`add-session.js:289` toggles it on `!isReadMode`), so export is **unreachable** while editing or from an unsaved/new session — there is no dirty/unsaved export path to guard, and the guard could never fire. The guard code was removed (refactor commit `refactor(34): remove dead save-before-export guard`). The behavior-preserving `saveSessionForm` extraction is retained as the save button's handler. FN-1 ordinal correctness for the (always-saved) exported session is fully delivered by **PDFX-02**.

### Demo System Refresh / Version Parity (Phase 35)

Formalized 2026-06-30 at plan time (provisional `DEMO-*` resolved). The demo is the real app in demo mode; this phase unstales the one un-converged home shell, refreshes the seed, removes dead code, and adds a scoped demo exposure lock-down. Approach locked to **D-01** (chrome-only single-sourcing); **D-02** (collapse `demo.html` into `index.html`) was evaluated and declined for minimal blast radius.

- **DEMO-01**: The demo home chrome (header/nav/language-picker/footer) is injected from one source (`app.js initCommon` + `shared-chrome.js`) identical to `index.html`, so it cannot silently drift again (D-01)
- **DEMO-02**: The dead hand-typed native `<select id="languageSelect">` is removed from the demo home (zero JS references) (D-01)
- **DEMO-03**: The "live demo" banner is preserved and language-synced across all four languages (D-01)
- **DEMO-04**: The app version footer renders on the demo home, single-sourced from `version.js` — the on-screen version-parity signal (D-01)
- **DEMO-05**: The seed showcases a Heart Shield removal/progression arc visible on the dashboard + session list (D-03)
- **DEMO-06**: Seed dates are relative/computed at seed time (noon-anchored offsets), guaranteeing ≥1 session in the current calendar month so the demo never looks abandoned (D-06)
- **DEMO-07**: Every seed session conforms exactly to the current `db.js` schema; client-type variety is kept and an `other`-type client/session is added (D-04)
- **DEMO-08**: Demo-specific hand-typed copy uses current terminology; the stale "therapeutic" subtitle literal is gone (D-07)
- **DEMO-09**: `assets/demo-hints.js` is removed with all three live references cleaned (the file, the `app.js` injection block, the `sw.js` precache entry) (D-08)
- **DEMO-10**: The landing iframe demo entry point keeps working — no regression in language sync, per-page gate bypass, or reseed-on-home (manual browser verification)
- **DEMO-11**: In demo mode (`window.name==='demo-mode'`) the Backup cloud button, Export/Import, and license activate/deactivate controls are hidden/disabled, and remain present in the real app; Settings + broader hardening stay deferred (D-09)

### Code Comments — Batch 2 (Phase 36)

Formalized 2026-07-01 at plan time (the roadmap referenced `DOCS-03` as "continuation of DOCS-02"; backfilled here). Scope decided with Ben 2026-07-01: **core modules now, defer the 3 giants** — cover batch-1 plus all small/mid production modules this phase; `backup.js`, `app.js`, `pdf-export.js` (each 1,500L+) move to a follow-up batch-3.

- [x] **DOCS-03**: The batch-1 modules (`db.js`, `overview.js`, `sessions.js`) plus every small/mid production module in `32-COMMENT-COVERAGE-MAP.md` — all remaining `assets/*.js` + root `sw.js`, **excluding** the three 1,500L+ giants (`backup.js`/`app.js`/`pdf-export.js`, deferred to batch-3), the vendored `*.min.js`, and the `i18n-*` dictionaries — carry file-top banner comments in the Phase 32 convention (what it owns · public `window.*` surface · cross-`window.*` dependencies · key invariants). Header-less files get brand-new banners; `// Phase X` / `// D-NN` / bug-ticket archaeology is de-phased into plain what-it-does text. Zero behavior change, verified by green `npm test` + the comments-only strip-and-compare gate _(continuation of DOCS-02; giants deferred to batch-3)_

### Date Consistency + Date-Format Setting + Session Types (Phase 37)

Formalized 2026-07-02 at plan time from the F6/F5/F4 UAT triage and two focused research passes (`37-RESEARCH.md` date engine + `37-RESEARCH-personalization.md` personalization surface). Full scope + 21 locked decisions in `.planning/phases/37-date-consistency-date-format-setting-f6-f5/37-CONTEXT.md`.

**Date engine (F6 date-consistency bug + F5 format logic):**

- [x] **DATE-01**: One canonical zero-dependency `window.DateFormat` IIFE (`assets/date-format.js`) regex-extracts a leading `YYYY-MM-DD` and constructs a **local** `Date(y, m-1, d)` (never `new Date("YYYY-MM-DD")` UTC-midnight); exposes `format` / `parseLocal` / `todayLocalISO` / `getPreference`, loaded before `app.js` and `pdf-export.js` on every page
- [x] **DATE-02**: Every calendar-date parse/format in the app routes through the helper — an app-wide sweep leaves **zero** remaining `new Date("<calendar-date>")` UTC-parses (grep gate + behavior tests), while legitimate wall-clock timestamps (`createdAt` / `exportedAt` / `Date.now()`) are deliberately **not** rerouted
- [x] **DATE-03**: The 6 date-format options render correctly across en/he/de/cs — numeric formats use `/` separators (except `yyyy-mm-dd` which uses `-`); "Auto" reproduces each language's conventional output, with English → en-US ("Jul 2, 2026"), unifying the old en-US-UI / en-GB-PDF split
- [x] **DATE-04**: Hebrew numeric dates render left-to-right within the RTL layout across all four consumption contexts (DOM display, `document.title`, PDF, markdown export) — no digit-group flipping
- [x] **DATE-05**: The PDF session-card date and footer "Exported on" date use the chosen format via `window.DateFormat`; `export-modal.js` stops pre-formatting and passes raw ISO to the PDF path
- [x] **DATE-06**: `countSessionsThisMonth` counts by **local** month boundary (dashboard miscount fixed) and the new-session date input defaults to **local** today (`add-session.js:516`)
- [x] **DATE-07**: TZ-pinned falsifiable behavior tests (authored before implementation, executed against the real module) prove the fix in `America/New_York`; `tests/34-date-locale.test.js` is rewritten to assert fixed behavior; changed PDF SHA-256 baselines are regenerated with real-output visual review — never blind `--regenerate` (per `reference-pdf-jsdom-inert-gates`)

**Personalization surface (F5 picker + F4 session types + tab + birthdate):**

- [x] **PERS-01**: A new "Personalization" Settings tab (nav button + panel + `?tab=personalize` deep-link + whitelist) is added, translated across all 4 languages
- [x] **PERS-02**: A date-format `<select>` (the 6 options) in the Personalization tab persists the chosen key to `localStorage["portfolioDateFormat"]` (default `"auto"`) and triggers an app-wide date re-render on change
- [x] **PERS-03**: A two-tier session-type editor (modeled on `settings-snippets.js`): 5 locked defaults (In-person/`clinic`, Online/`online`, Remote/`remote`, Proxy/`proxy`, Other/`other`) show a rename field + lock icon (no delete); custom types show rename + delete; add-new input at bottom; renames are global (one language-agnostic override per type, D-16)
- [x] **PERS-04**: The session-type list is stored durably (IndexedDB `therapistSettings`, `sectionKey:"sessionTypes"`); `App.formatSessionType` resolves the stored key against the list + global renames, falling back to the raw string for unknown/deleted types (D-18); the add/edit-session type cards render data-driven from the list; the 3 legacy keys (`clinic`/`online`/`other`) resolve forever (D-14)
- [x] **PERS-05**: Backup export/restore carries `portfolioDateFormat` (scalar) and the session-type list (via `therapistSettings`) — verified round-trip, no backup manifest/schema version bump
- [x] **PERS-06**: The birthdate entry is swapped from 3 month/day/year `<select>` dropdowns to a single native `<input type="date">` (value `YYYY-MM-DD`, no data migration) across add-client and add-session (create + edit paths), mirroring the existing session-date field
- [x] **PERS-07**: New i18n keys (`settings.tab.*`, `settings.dateFormat.*`, `settings.sessionTypes.*`, `session.type.remote|proxy`) are added across en/he/de/cs
- [x] **PERS-08**: Behavior tests cover the surface — tab appears + deep-links; picker persists + survives reload; F4 add/rename/delete + locked-row delete rejection; global rename overrides label app-wide; unknown-type graceful fallback; backup round-trips the new keys; birthdate input persists + edits

**Terminology disambiguation + Session Format / Heart-Wall filters (folded into Phase 37, 2026-07-05):**

Formalized 2026-07-05 from the "Session Type means three things" UAT collision. Full scope + locked decisions D1–D5 in `.planning/phases/37-date-consistency-date-format-setting-f6-f5/37-TERMINOLOGY-FILTERS-DECISIONS.md` (naming table, filter behaviour, UI controls, trademark clearance). **No data migration** — stored field names `isHeartShield`/`shieldRemoved` and the value key `clinic` stay intact; labels/values change only.

- [x] **TERM-01**: The modality axis label is relabelled "Session Type" → **Session Format** (EN) / **אופן הטיפול** (HE) / **Sitzungsart** (DE, unchanged) / **Typ sezení** (CS, unchanged) on its axis surfaces (the add-session form section `session.form.sessionType`, the Sessions modality column `sessions.table.type` for EN/HE, and the new Session Format filter label). i18n **key names are unchanged** (values only); the 5 modality **value** labels + keys (`clinic`/`online`/`remote`/`proxy`/`other`; HE פרונטלי/מקוון/מרחוק/מיופה כוח/אחר) are UNCHANGED, Proxy kept distinct from Remote; Client Type unchanged (D1/D3)
- [x] **TERM-02**: The heart term is relabelled "Heart Shield" → **Heart-Wall** (EN/DE/CS) / **חומת הלב** (HE) on EVERY surface (filter/toggle label, `sessions.table.heartShield` column, `session.form.heartShield` section + `shieldRemoved`/`heartShieldEmotions`, `reporting.heartShieldCleared`, active/removed badges, `session.copy.heartShield`, `toast.heartShieldRequired`, `common.heartShield`, `settings.row.heartShield*` descriptions) across en/he/de/cs; the HE inconsistencies `מגננת לב`/`הגנת הלב` → `חומת הלב` and `סוג טיפול`/`סוג מפגש` are retired. No PDF golden regeneration (no fixture renders a relabelled string). i18n key names unchanged (values only) (D1/D3)
- [x] **FILT-01**: A **Session Format** filter — **multi-select dropdown-with-checkboxes** (pill "All formats ▾" opens a checkbox list) — is added on Overview + Sessions; options include the custom types dynamically from `App.getSessionTypes()`; legacy sessions with no `sessionType` resolve to `clinic`; Overview filters **clients** (client has ≥1 matching session), Sessions filters **sessions**; the per-session entry stays single-select (D2)
- [x] **FILT-02**: The old heart dropdowns (`#clientHeartShieldFilter` on Overview, `#sessionTypeFilter` on Sessions) are removed and replaced by a **Heart-Wall toggle** using the existing `.toggle-switch`/`.toggle-slider` control (green when on, RTL-aware); toggle ON shows items where `isHeartShield === true` regardless of `shieldRemoved` (D2a); the old dropdown i18n keys are repurposed/retired explicitly (D2)
- [x] **FILT-03**: Overview sort is **BOTH** — click-to-sort on the `<table>` column headers (Name / Sessions / Last Session; direction arrow, RTL-aware, `aria-sort`) AND the existing `#clientSortSelect` dropdown, both driving the SAME sort state and staying in sync (D2b)
- [x] **FILT-04**: Falsifiable behavior tests are authored **before** implementation for the new logic — Session Format multi-select predicate (custom types + legacy-undefined→`clinic` + multi-selection union), Heart-Wall predicate (`isHeartShield===true` regardless of `shieldRemoved`; false/absent excluded), and Overview header-sort ↔ dropdown sync — and pass after; all new DOM (checkbox-dropdown, toggle, sort arrows) is built via DOM APIs + `textContent` (SVG via `createElementNS`), never `innerHTML`, and a custom-label XSS-as-literal-text test guards the checkbox list
- [x] **LEGAL-01**: A short trademark/affiliation disclaimer ("Sessions Garden is independent, not affiliated with / endorsed by Discover Healing; Emotion Code®/Body Code™/Heart-Wall® are trademarks of Wellness Unmasked, Inc., used descriptively") is added to About/Legal (`disclaimer*`) + Impressum (`impressum*`) in all 4 languages; drafted for a separate legal-native-speaker + challenger phrasing review (Czech especially) at orchestrator level before Ben pushes (D4)

## Future Requirements

Deferred to backlog — revisit later (from the 2026-06-22 concerns triage). Tracked but not in the v1.2 roadmap.

### Performance & Scale

- **PERF-01**: Client-side pagination / virtual scroll for the sessions and clients tables (degrades beyond ~500 sessions)
- **PERF-02**: Move PDF export off the main thread (Web Worker)
- **PERF-03**: Parallelize the sequential photo-optimization loop (bounded concurrency)
- **PERF-04**: IndexedDB record-count guidance / soft caps

### Hardening

- **HARD-01**: Backup import maximum file-size guard before reading into memory
- **HARD-02**: Pin / version-track the vendored `jspdf.min.js` for security updates
- **HARD-03**: License re-validation (periodic re-ping to Lemon Squeezy) — deferred because it adds a phone-home to an offline-first app; revisit only if piracy is observed
- **HARD-04**: License-key-in-`localStorage` hardening (beyond current Base64 obfuscation)

### Accessibility

- **A11Y-01**: `aria-rowcount` / `aria-rowindex` on dynamically rendered sessions & clients tables
- **A11Y-02**: `aria-current="step"` on the export-modal stepper
- **A11Y-03**: Verify `aria-live` toast announcements function in demo mode
- **A11Y-04**: Harden landing-page `innerHTML` injection (`pricingLegalText`)

## Out of Scope

Explicitly excluded for v1.2. These conflict with the project's zero-build / local-only / offline-first constraints; revisit only if forced.

| Feature | Reason |
|---------|--------|
| Build step / bundler / minification | Conflicts with the zero-build constraint; all JS is served raw by design |
| Full ES-module import/export system | Same zero-build constraint; the IIFE-global pattern is intentional |
| Multi-device / cloud sync | Destroys the privacy value proposition and adds GDPR processor obligations |
| Removing `unsafe-inline` from `script-src` | Requires nonce/hash CSP refactor across all inline `<script>` blocks; out of scope for v1.2 (header migration in VER-04 does not touch this) |

## Traceability

Which phases cover which requirements. Status filled during execution.

| Requirement | Phase | Status |
|-------------|-------|--------|
| VER-01 | Phase 28 | Complete |
| VER-02 | Phase 28 | Complete |
| VER-03 | Phase 28 | Complete |
| VER-04 | Phase 28 | Complete |
| VER-05 | Phase 28 | Complete |
| VER-06 | Phase 28 | Complete |
| OBS-01 | Phase 29 | Complete |
| OBS-02 | Phase 29 | Complete |
| OBS-03 | Phase 29 | Complete |
| TEST-01 | Phase 30 | Complete |
| TEST-02 | Phase 30 | Complete |
| TEST-03 | Phase 30 | Complete |
| TEST-04 | Phase 30 | Complete |
| RFCT-01 | Phase 31 | Complete |
| RFCT-02 | Phase 31 | Complete |
| RFCT-03 | Phase 31 | Complete |
| DOCS-01 | Phase 32 | Complete |
| DOCS-02 | Phase 32 | Complete |
| I18N-01 | Phase 33 | Pending |
| I18N-02 | Phase 33 | Pending |
| PDFX-01 | Phase 34 | Complete |
| PDFX-02 | Phase 34 | Complete |
| PDFX-03 | Phase 34 | Descoped (invalid premise — export only reachable in read mode) |
| DEMO-01 | Phase 35 | Complete |
| DEMO-02 | Phase 35 | Complete |
| DEMO-03 | Phase 35 | Complete |
| DEMO-04 | Phase 35 | Complete |
| DEMO-05 | Phase 35 | Complete |
| DEMO-06 | Phase 35 | Complete |
| DEMO-07 | Phase 35 | Complete |
| DEMO-08 | Phase 35 | Complete |
| DEMO-09 | Phase 35 | Complete |
| DEMO-10 | Phase 35 | Complete |
| DEMO-11 | Phase 35 | Complete |
| DOCS-03 | Phase 36 | Complete |
| DATE-01 | Phase 37 | Complete |
| DATE-02 | Phase 37 | Complete |
| DATE-03 | Phase 37 | Complete |
| DATE-04 | Phase 37 | Complete |
| DATE-05 | Phase 37 | Complete |
| DATE-06 | Phase 37 | Complete |
| DATE-07 | Phase 37 | Complete |
| PERS-01 | Phase 37 | Complete |
| PERS-02 | Phase 37 | Complete |
| PERS-03 | Phase 37 | Complete |
| PERS-04 | Phase 37 | Complete |
| PERS-05 | Phase 37 | Complete |
| PERS-06 | Phase 37 | Complete |
| PERS-07 | Phase 37 | Complete |
| PERS-08 | Phase 37 | Complete |
| TERM-01 | Phase 37 | Complete |
| TERM-02 | Phase 37 | Complete |
| FILT-01 | Phase 37 | Complete |
| FILT-02 | Phase 37 | Complete |
| FILT-03 | Phase 37 | Complete |
| FILT-04 | Phase 37 | Complete |
| LEGAL-01 | Phase 37 | Complete |

**Coverage:**

- v1.2 requirements: 42 total (23 original + 11 DEMO-* formalized 2026-06-30 + DOCS-03 formalized 2026-07-01 + 7 TERM/FILT/LEGAL folded into Phase 37 on 2026-07-05)
- Phase 37 (date consistency + personalization): 15 (DATE-01..07 + PERS-01..08, formalized 2026-07-02)
- Phase 37 (terminology + Session Format / Heart-Wall filters, folded 2026-07-05): 7 (TERM-01/02 + FILT-01..04 + LEGAL-01)
- Mapped to phases: 57
- Unmapped: 0

---
*Requirements defined: 2026-06-22 (v1.2 Codebase Health & Reliability)*
*Source: ROADMAP.md v1.2 locked scope + `.planning/codebase/CONCERNS.md` triage (2026-06-22)*
