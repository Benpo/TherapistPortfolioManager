# Phase 22: Session Workflow Loop — Context

**Gathered:** 2026-04-27
**Status:** Ready for planning (after `/gsd-ui-phase` runs)

<domain>
## Phase Boundary

Two features under one phase:

1. **Editable session section titles** — A new Settings page lets the therapist rename and disable any of the 9 session sections. Custom labels are global across UI languages and persist locally. Underlying storage keys are unchanged.
2. **Session-to-document export** — A new Export flow on the session edit page produces a client-safe document from a session: section selection → editable preview → PDF download / Markdown download / Web Share / Translate.

Plus cross-cutting work on `assets/backup.js`, `assets/add-session.js` (`buildSessionMarkdown`), and `sw.js`.

Discussion clarifies HOW to implement what SPEC.md locked. New capabilities belong in other phases.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**20 requirements are locked.** See `22-SPEC.md` for full requirements, boundaries, acceptance criteria, and cross-cutting impact table.

Downstream agents (researcher, planner, executor) MUST read `22-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md, summarized):**
- Settings page with rename + enable/disable + per-row reset for 9 sections
- Per-section enable/disable affects new-session form, edit-session form (with stored-data fallback + indicator), and export dialog
- Single-session export with section-selection dialog (client-safe defaults), editable preview, PDF + Markdown file download
- Web Share API where supported (PDF as attachment); no mailto/Gmail fallback
- Translate shortcut to translate.google.com
- Existing "Copy Session (MD)" button preserved AND updated to read custom labels from the same source as Export
- Backup/restore round-trips therapist-settings; backward-compatible with pre-Phase-22 backups
- SW `CACHE_NAME` bump + `PRECACHE_URLS` extension
- New Settings HTML page wired into shared chrome, license gate, and TOC/disclaimer gate
- All new strings in en/de/he/cs with RTL-safe layout
- Mobile-first responsive (375px)

**Out of scope (from SPEC.md, summarized):**
- Pre-session context card (deferred to future phase)
- Multi-session client reports (v1.2)
- Add/remove/reorder sections; change field types
- Per-UI-language label overrides
- mailto / Gmail compose URL delivery
- HTML file export
- In-app translation engine
- Therapist profile / business name in document header
- Backend storage of exports, send tracking
- Reordering sections in export dialog
- Templates / "Pick your modality" starter packs
- Heart Shield filter on sessions page; clients-table indicators; reporting averaging behavior
- Demo mode (separate IndexedDB) — verify-only

</spec_lock>

<decisions>
## Implementation Decisions

### PDF generation (Feature B)

- **D-01:** PDF library — vendor `jsPDF` (~50KB minified, MIT) into `assets/`. Follows the existing `jszip.min.js` precedent. Programmatic, deterministic output. No browser-dialog dependency.
- **D-02:** Fonts — embed `Noto Sans` (Latin / extended diacritics for de/cs) + `Noto Sans Hebrew` as base64 strings, subset to needed glyph ranges (~150–200 KB total). Hebrew rendered via jsPDF's `R2L` direction flag. Single font family across all 4 UI languages, fully self-contained (no Google Fonts CDN at export time).
- **D-03:** Loading — lazy-load jsPDF + fonts on the **first** Export click (dynamic `<script>` append). **PWA constraint:** `sw.js` `PRECACHE_URLS` MUST include all jsPDF + font assets so installed PWA users have them available offline after install. Lazy-load and SW-precache are compatible: bytes are cached at install time; the script tag only executes when Export is clicked.
- **D-04:** Filename pattern — `ClientName_YYYY-MM-DD.pdf` (e.g. `AnnaM_2026-04-27.pdf`). Sanitize: ASCII-only, strip diacritics, transliterate Hebrew chars to Latin (use a small `slugify` helper), no spaces.
- **D-05:** Page size — A4 portrait (595×842pt) globally. EU/IL/CZ default; no per-language switching.
- **D-06:** Pagination — auto page-break with a running header on pages 2+ (abbreviated: client name + session date). Page numbers in footer (`Page X of Y`).
- **D-07:** Typography — body 11pt, section headings 14pt (bold), header meta 10pt. Print-document standard.

### Therapist-settings storage + label resolution (Feature A + C)

- **D-08:** Storage — new IndexedDB store `therapistSettings` in `assets/db.js`. Schema: `{ sectionKey: string (PK), customLabel: string|null, enabled: boolean }`. Bump `DB_VERSION` from 3 to 4 with a no-op upgrade for existing users (createObjectStore for the new store only). Lives alongside `clients` and `sessions` so `backup.js` extends naturally.
- **D-09:** Label-resolution function — new `App.getSectionLabel(sectionKey)` in `assets/app.js`. Reads from in-memory cache; falls back to `App.t(defaultI18nKey)` if no override. Single source used by `add-session.js` (form rendering), `buildSessionMarkdown` (Copy MD), and the new export module.
- **D-10:** Cache initialization — eager load in `App.initCommon()`. On every page load, after DOMContentLoaded, populate `App._sectionLabelCache` from `PortfolioDB.getAllTherapistSettings()`. By the time page-specific JS runs, `App.getSectionLabel` is synchronous.
- **D-11:** Cross-tab sync — BroadcastChannel `sessions-garden-settings`. Settings page posts on save; other tabs listen and swap `App._sectionLabelCache` on next render (deferred swap avoids label flicker if user is mid-edit on a form).
- **D-12:** User-facing sync messaging — Settings page shows a visible, i18n'd info message (en/de/he/cs) explaining what to expect after Save. Suggested copy: "Saved. Open session forms will pick up the new labels on next page navigation. Refresh other tabs to see changes immediately." This is a real UI element, not a toast — the user explicitly requested it.

### Settings page chrome (Feature A)

- **D-13:** Entry point — gear icon in `shared-chrome.js` header next to the globe language switcher and license-key icon. Reachable from every app page. Tooltip "Settings". i18n'd in 4 languages.
- **D-14:** File pattern — `settings.html` + `assets/settings.js`. Matches existing app-page contract: license gate inline `<script>` in `<head>`, TOC/disclaimer gate, shared chrome via `shared-chrome.js`, CSP meta tag, no external network at page load.
- **D-15:** SW precache — add `settings.html`, `assets/settings.js`, and any new CSS to `sw.js` `PRECACHE_URLS`. Bump `CACHE_NAME` from `sessions-garden-v49` to `sessions-garden-v50`. (Confirm latest version at execution time — Phase 22 may bump further if other plans land first.)
- **D-16:** **Settings page visual layout (9-row rendering, accordions, two-column, mobile breakpoints, indicator styling for "Disabled in Settings", reset-button placement) is deferred to `/gsd-ui-phase`** with the frontend-design agent. Discuss-phase locks the architecture; UI-spec locks the visual design.

### Export dialog (Feature B)

- **D-17:** Flow architecture — single modal with three progressive steps: (1) section checkboxes → (2) editable preview → (3) output actions (Download PDF / Download .md / Share / Translate). "Back" button to revisit selection. Single modal scope = single body-scroll-lock, single overlay-close discard-confirm contract (per Phase 21 D-03).
- **D-18:** Editable preview — Markdown textarea + live rendered preview side-by-side on desktop; tabs (`Edit` / `Preview`) on mobile (≤480 px). Tiny custom regex Markdown parser (~1 KB, supports `# / ## / ### / **bold** / *italic* / line breaks / lists` — the subset we actually emit). RTL-safe via logical CSS properties. Edits in the textarea flow into PDF + .md download + Web Share.
- **D-19:** Export button placement — inline button group `[Copy MD] [Export]` on the session edit page. Visible in the same context as the existing Copy MD button. Consistent icon-button styling.
- **D-20:** Copy MD preserved — both buttons exist per SPEC REQ-7 + REQ-19. Copy MD = one-click clipboard of full markdown for personal/journal use. Export = curated client-facing document. Both call `App.getSectionLabel()` so labels never diverge.

### Folded Todos

- **`2026-04-26-editable-session-section-titles.md`** — fully covered by Feature A (D-08 through D-16).
- **`2026-04-26-session-to-document-email-export.md`** — covered by Feature B (D-01 through D-07, D-17 through D-20). The "email" delivery angle is satisfied by Web Share API (mobile native share sheet picks email apps automatically) + downloadable file. No `mailto:` integration per SPEC out-of-scope.

### Claude's Discretion

- Step indicator visual styling in the export modal (numbered dots, breadcrumb, etc.) — UI-spec.
- Action button sizing on mobile cards — UI-spec.
- Markdown parser exact heading-level rendering (h1 vs h2 vs h3 size hierarchy in HTML preview).
- Slugify rules for non-Latin client names in PDF filename (ICU-style transliteration is overkill; a small in-house map is fine).
- Settings page max label length validation (suggest 40-60 chars) — capture in UI-spec.
- Whether to add a "Reset all to defaults" bulk action on the Settings page (deferred — per-row reset is in spec; bulk is not).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked requirements (read FIRST)
- `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-SPEC.md` — 20 locked requirements, boundaries, acceptance criteria, cross-cutting impact table

### Project-level constraints
- `.planning/PROJECT.md` — vanilla JS / zero-dep / IndexedDB / 4-lang i18n / RTL / one-time sale / local-only
- `.planning/codebase/CONVENTIONS.md` — App namespace, IIFE module pattern, kebab-case files, dot-notation i18n keys, logical CSS properties
- `.planning/codebase/STRUCTURE.md` — file structure for new app pages, where to add new code
- `.planning/codebase/STACK.md` — IndexedDB schema location, no build process

### Files this phase will modify
- `assets/app.js` — add `App.getSectionLabel()`, eager-load cache in `App.initCommon()`, BroadcastChannel listener
- `assets/db.js` — bump `DB_VERSION` 3 → 4, add `therapistSettings` store with no-op upgrade migration
- `assets/add-session.js:596-681` — `buildSessionMarkdown()` reads `App.getSectionLabel()` instead of hardcoded `App.t()`. Section render becomes conditional on enabled-state. Edit-mode shows disabled-but-populated sections with the indicator.
- `add-session.html` — section markup wraps support hide/show + indicator badge per section; new Export button next to Copy MD
- `assets/backup.js` — ZIP includes the new `therapistSettings` store; restore round-trip; backward-compat with pre-Phase-22 backups
- `assets/shared-chrome.js` — register new Settings page; add gear-icon entry next to globe in header-actions
- `sw.js` — bump `CACHE_NAME` from `sessions-garden-v49`; add `settings.html`, `assets/settings.js`, jsPDF lib + fonts to `PRECACHE_URLS`
- `assets/i18n-en.js` / `-de.js` / `-he.js` / `-cs.js` — new keys for: Settings page rows, disabled-indicator tooltip, gear-button label, BroadcastChannel sync message, export dialog labels, Translate/Share/Download buttons, step indicator
- `assets/app.css` (or new `assets/settings.css`) — Settings page layout (deferred to UI-spec for visual decisions); export dialog step layout; greyed-out style for export dialog rows; "Disabled in Settings" indicator style

### New files this phase will create
- `settings.html` — Settings page (license gate, TOC gate, shared chrome, CSP)
- `assets/settings.js` — Settings page logic (CRUD on `therapistSettings`, BroadcastChannel sender)
- `assets/jspdf.min.js` (vendored) — PDF library
- `assets/fonts/noto-sans-base64.js` + `noto-sans-hebrew-base64.js` (or single combined file) — embedded fonts as base64 strings
- `assets/pdf-export.js` — PDF generation module with `buildSessionPDF(sessionData, opts)` API; encapsulates jsPDF inside one file. Loaded only by `add-session.html`.
- `assets/md-render.js` — tiny regex Markdown → HTML parser for the live preview pane

### Existing surfaces explicitly NOT changed (verified, per SPEC.md Boundaries)
- `assets/sessions.js` Heart Shield filter — unchanged
- `assets/overview.js` clients-table heart-shield indicators — unchanged
- `assets/reporting.js` averaging logic — unchanged
- Demo mode (separate `demo_portfolio` IndexedDB) — verify-only, no edits

### Prior-phase context
- `.planning/phases/21-.../21-CONTEXT.md` — modal pattern (max-height 90vh, scroll body, pinned actions, body-scroll lock, overlay-close discard-confirm), z-index token scale, 44×44px tap target, mobile breakpoints (768/480px)
- `.planning/phases/19-go-live-preparation/19-CONTEXT.md` — SW versioning discipline, license-gate pattern, app-page contract
- `.planning/phases/14-.../14-CONTEXT.md` — globe language switcher pattern, in-page re-render vs reload-on-change

### UI design contract (to be created next)
- `.planning/phases/22-.../22-UI-SPEC.md` — **does not yet exist**. Run `/gsd-ui-phase 22` after this discussion to lock the visual design for the Settings page (9-row layout) and export dialog (3-step modal, side-by-side preview vs Edit/Preview tabs).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`window.App` namespace** (`assets/app.js`) — extend with `App.getSectionLabel(key)`, eager-load cache in existing `App.initCommon()`. Pattern proven across all pages.
- **`window.PortfolioDB` namespace** (`assets/db.js`) — extend with `getAllTherapistSettings()`, `setTherapistSetting()`, `resetTherapistSetting()`. IIFE module return pattern.
- **`assets/jszip.min.js`** — existing vendored library precedent. Mirror the same pattern for `assets/jspdf.min.js`.
- **Modal architecture from Phase 21** — `max-height: 90vh`, scroll body, pinned action bar, body-scroll lock, overlay-close-with-discard-confirm. Apply directly to the export 3-step modal.
- **Z-index token scale (Phase 21 D-10)** — `--z-modal: 300`, `--z-toast: 400`. Export dialog uses `--z-modal`.
- **Native `<input type="date">` on mobile (Phase 21 D-06)** — already in place; export dialog inherits.
- **44×44px tap target enforcement (Phase 21 D-11)** — global rule applies to all new buttons in Settings + Export.
- **`assets/shared-chrome.js`** — header-actions area is where the gear icon mounts. `FOOTER_STRINGS` inline pattern shows how to handle copy without i18n.js dependency.
- **`buildSessionMarkdown()` (`assets/add-session.js:596-681`)** — already builds the markdown string used for Copy MD. Refactor to call `App.getSectionLabel()` for section headings and reuse the same string-building logic for the export preview default.
- **BroadcastChannel API** — well-supported in modern browsers. Same-origin channel `sessions-garden-settings` for Settings ↔ open-tab sync.

### Established Patterns
- **IIFE module returning public API** — every JS file follows this. New `pdf-export.js`, `md-render.js`, `settings.js` follow suit.
- **`data-i18n` attributes** — set translation keys in HTML, `App.applyTranslations(root)` re-renders. Used everywhere; new Settings/Export markup uses it.
- **`async/await` for IndexedDB** — `await PortfolioDB.getAllClients()` style. New therapist-settings CRUD follows.
- **CSS logical properties** (`inline-start`, `inline-end`) — RTL-safe. Phase 18 made `html[dir=rtl]` the standard. New CSS uses logical props only.
- **License gate inline `<script>` in `<head>`** — every app page does this. `settings.html` follows.
- **TOC/disclaimer gate** — every app page enforces; `settings.html` follows.
- **Per-language i18n files** (`i18n-en.js`, `i18n-de.js`, `i18n-he.js`, `i18n-cs.js`) — add new keys to all 4. Phase 14 established this split (formerly single `i18n.js`).

### Integration Points
- **`shared-chrome.js` header** — gear icon mounts in the same area as globe + license-key. Header is rendered identically across all app pages by `shared-chrome.js`.
- **`PRECACHE_URLS` in `sw.js`** — append new Settings assets + jsPDF + fonts. Bump `CACHE_NAME`.
- **`App.initCommon()` in `app.js`** — extend with the eager IDB read for `therapistSettings`. Currently bootstraps language; new logic is additive.
- **`backup.js` ZIP layout** — the manifest already enumerates IDB stores. Add `therapistSettings` to the export/import list. Restore handler must accept missing-store backups (pre-Phase-22) and apply defaults.
- **`add-session.html` form sections** — each section needs a wrapper with `data-section-key` so JS can hide/show by enabled-state and inject the "Disabled in Settings" indicator badge.
- **`add-session.js` section render path** — refactor each section's render to be guarded by `App.isSectionEnabled(key)` (with the edit-mode-with-data fallback).

</code_context>

<specifics>
## Specific Ideas

- **Sapir's verbatim feedback (2026-04-26):** Section titles must be editable so therapists from non–Emotion-Code modalities can use the app. Sessions need a clear path to a client-facing document with auto-populated date.
- **No third-party processors** — local-only is the privacy story baked into the €119 sale. PDF generation must be 100% client-side. Translate is the single sanctioned external handoff (and only because it requires no data input by the app — the user pastes the already-shown text into Google Translate UI).
- **Sapir is the test user** — Hebrew RTL must look right in the PDF and the export dialog. She'll catch any RTL bidi bugs immediately.
- **Mobile-first reality** — therapists use phones during/between sessions. The 3-step export modal must be tappable at 375px; preview tabs (not split panes) on mobile.
- **Existing Copy MD use case is real** — paste session into a personal Notes app. Don't break it.
- **Cross-language client communication is rare but important** — therapist with Hebrew UI exporting an English document for an English-speaking client. Translate shortcut handles this without an in-app translation engine.

</specifics>

<deferred>
## Deferred Ideas

(All items below were either raised during discussion or carried forward from SPEC.md out-of-scope. They are not implemented in this phase.)

### Future phases
- **Pre-session context card** — innovator-extrapolated, not direct user feedback. Remains in `.planning/todos/pending/2026-04-26-pre-session-context-card.md`.
- **Multi-session client reports** — date-range or last-N summaries. Targeted for v1.2.
- **Add / remove / reorder sections + new field types** — requires custom-fields infrastructure; separate phase.
- **Per-UI-language label overrides** — global by design; multi-language therapists manage via the editable preview.
- **Templates / "Pick your modality" starter packs** — therapist renames manually in v1.

### Explicitly rejected (UX or architecture grounds)
- **mailto: / Gmail compose URL** — body-length-limited, no attachments, dated UX. Web Share + download cover the same use case better.
- **HTML file export** — PDF + Markdown sufficient for v1.
- **In-app translation engine** — external Google Translate handoff is enough.
- **Therapist profile / business name in document header** — no profile system exists; introducing one is a separate phase.
- **Backend storage of exports, send tracking, read receipts** — local-first.
- **Reordering sections in the export dialog** — same order as session form.
- **contenteditable WYSIWYG preview** — RTL bidi quirks + paste-from-Word + accidental structure-deletion + no zero-dep library that handles RTL well; rolling our own is multi-week scope. Markdown textarea + side-by-side preview is the pragmatic choice.
- **"Reset all to defaults" bulk action on Settings page** — per-row reset is in scope; bulk is not (deferred).

### Verified-no-change surfaces
- Heart Shield filter on sessions page (`assets/sessions.js`) — historical sessions still searchable
- Heart Shield indicators on clients table (`assets/overview.js`) — historical data preserved
- Reporting averaging (`assets/reporting.js`) — disabled `issues[]` contributes zero, behavior unchanged in v1
- Demo mode (separate IndexedDB) — verify-only

### Reviewed Todos (not folded)
- None. The two relevant todos (`editable-session-section-titles`, `session-to-document-email-export`) are folded into this phase. The third (`pre-session-context-card`) is already deferred at the SPEC level.

</deferred>

---

## Next steps

1. **Run `/gsd-ui-phase 22`** — lock the visual design for the Settings page (9-row rendering) and the export dialog (3-step modal, preview layout). Discuss-phase locks architecture; UI-spec locks visual design.
2. **Then run `/gsd-plan-phase 22`** — generates the executable plan(s) from SPEC.md + this CONTEXT.md + the upcoming UI-SPEC.md.

---

*Phase: 22-session-workflow-loop-pre-session-context-card-editable-sess*
*Context gathered: 2026-04-27*
