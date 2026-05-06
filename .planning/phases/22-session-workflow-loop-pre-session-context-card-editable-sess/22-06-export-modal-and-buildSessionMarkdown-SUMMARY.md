---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 06
subsystem: ui
tags: [export, modal, pdf, markdown, share-api, custom-labels, section-visibility, i18n]

# Dependency graph
requires:
  - phase: 22
    plan: 02
    provides: "App.getSectionLabel/isSectionEnabled, app:settings-changed CustomEvent, settings.indicator.disabled i18n key"
  - phase: 22
    plan: 03
    provides: "window.MdRender.render(string) — escape-first Markdown→HTML for preview pane"
  - phase: 22
    plan: 05
    provides: "window.PDFExport.buildSessionPDF / slugify / triggerDownload — lazy-loaded PDF rendering with Hebrew RTL"
provides:
  - "Export button + 3-step modal scaffolding on session edit page (read mode only)"
  - "buildSessionMarkdown emits all 9 section headings via App.getSectionLabel(key, defaultI18nKey) — REQ-19"
  - "applySectionVisibility(isPastSession) — section visibility gate honoring REQ-3 (new sessions hide disabled) and REQ-5 amended (past + populated → fully editable + badge)"
  - "openExportDialog() 3-step flow: Step 1 selection → Step 2 textarea + live MdRender preview → Step 3 PDF / text-file / Share output cards"
  - "buildFilteredSessionMarkdown(selectedKeys) — header + only checked sections; unselected never enter the editor (T-22-06-04 mitigation)"
  - "navigator.canShare-files probe; Share button auto-hidden on unsupported devices (REQ-15)"
  - "22 export.* i18n keys per language (en/de/he/cs) including discard.* dialog copy and pdf.failed fallback"
affects:
  - "22-08 (shared chrome / SW cache — must precache md-render.js if not already; service worker bump)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single label-resolution layer: every section heading emit site funnels through App.getSectionLabel(sectionKey, defaultI18nKey) — never hardcoded App.t for section labels"
    - "3-step modal with step indicator (1 → 2 → 3) — dots toggle is-active/is-completed; connector toggles is-completed; Next button label changes per step (export.next1/next2/done)"
    - "Live preview via .innerHTML = MdRender.render(textarea.value) — safe because MdRender escapes before structural rules (T-22-06-01 mitigation owned by Plan 03)"
    - "Step 1 row labels via labelSpan.textContent = label — never innerHTML for custom labels (T-22-06-02 mitigation)"
    - "Web Share API canShare({files}) probe with a 1-byte dummy PDF File at modal open; button reveals only on success"
    - "Cross-tab settings sync: document.addEventListener('app:settings-changed') re-runs applySectionVisibility(!!editingSession)"
    - "Editable-disabled-section pattern (REQ-5 amended 2026-04-28): hide disabled-with-no-data; show disabled-with-data with badge AND fully editable inputs (no readonly/disabled attributes added)"
    - "Lazy-load discipline preserved: jspdf.min.js NOT in <script> tags; loaded by PDFExport.buildSessionPDF on first click"

key-files:
  created: []
  modified:
    - "add-session.html — 9 .session-section wrappers with data-section-key + hidden disabled-indicator-badge per section, #exportSessionBtn primary button, full #exportModal markup (step indicator + 3 step containers + output cards), md-render.js script tag"
    - "assets/add-session.js — buildSessionMarkdown rewires all 9 section headings via App.getSectionLabel; applySectionVisibility helper + sectionHasData; app:settings-changed listener; openExportDialog + 11 export-helper functions (renderStep1Rows, setActiveStep, updatePreview, applyMobileTabs, wireMobileTabs, closeDialog, handleDownloadPdf, handleDownloadMd, handleShare, probeShareSupport, buildFilteredSessionMarkdown); exportSessionBtn click wiring; visibility toggle alongside copySessionBtn in setReadMode; visibility re-applied after session-load and for new sessions"
    - "assets/app.css — Phase 22 Export modal block (188 lines): .export-card width clamp, .export-step-indicator + .export-step-dot (active/completed states) + .export-step-connector, .export-step display gate, .export-section-row + .is-disabled greyed variant, .export-edit-area grid (1col mobile / 2col ≥769px), .export-editor + .export-preview with h1/h2/h3 typography per UI-SPEC, .export-mobile-tabs (display: none default; inline-flex on ≤768px), .export-output-card with hover lift"
    - "assets/i18n-en.js — 22 export.* keys + session.export"
    - "assets/i18n-de.js — same 22 keys (German)"
    - "assets/i18n-he.js — same 22 keys (Hebrew, gender-neutral imperative)"
    - "assets/i18n-cs.js — same 22 keys (Czech)"

key-decisions:
  - "issues + heartShield were in scope of the App.getSectionLabel rewire even though their previous code path used different i18n keys (session.copy.issues / session.copy.heartShield). Per the plan mapping table, issues→session.form.issuesHeading and heartShield→session.form.heartShield. Both are now resolved through the custom-label layer so renaming via Settings (Plan 22-04) propagates correctly."
  - "applySectionVisibility branches on isPastSession (= !!editingSession) and runs both for new sessions (hides disabled) and after a past session loads (shows disabled-with-data + badge, FULLY editable). This was simpler than introducing per-input disabled-attribute toggling and matches the REQ-5 amendment exactly."
  - "exportSetActiveStep also updates .export-step-dot.is-completed and .export-step-connector.is-completed for the visual progress indicator (UI-SPEC said completed dot uses primary-soft / connector uses primary). The dot/connector classes are toggled from openExportDialog, not from CSS pseudo-classes."
  - "buildFilteredSessionMarkdown is a near-duplicate of buildSessionMarkdown but takes a Set<sectionKey>. I chose duplication over refactoring buildSessionMarkdown to take an optional filter argument because the existing function is in the read-mode/Copy MD path and changing its signature risked regressing the existing 'Copy session text' button behavior. The duplication is contained (lives in the same closure, ~80 lines) and the section-emit logic is identical to buildSessionMarkdown's."
  - "Web Share probe uses navigator.canShare({files: [tinyPdf]}) at modal open. Some Chromium-based desktop browsers expose navigator.share but reject file shares — we only reveal the button if canShare returns true for our file shape. The handler also re-checks canShare immediately before navigator.share to avoid a race where settings change between probe and click."
  - "Discard-confirm gate fires only when _exportState.hasEditedPreview is true (which we set on input event in the editor). Closing on Step 1 or Step 3 with no edits skips the confirm dialog — UX matches what therapists expect (Step 1 selection edits aren't 'document edits')."
  - "exportHandleDownloadMd has a fallback to inline URL.createObjectURL + anchor click in case window.PDFExport hasn't loaded yet (would only happen if md-render.js loaded but PDFExport hasn't been awoken — defensive). Plain-text download doesn't need jsPDF, so users always get the .md even if jsPDF lazy-load is broken."
  - "Hebrew/CS i18n strings — left in raw Unicode (not \\u-escapes) where the source file already contained raw Unicode; Czech file's existing pattern was \\u-escaped accents, but appending raw UTF-8 inside a UTF-8 source file works identically and the runtime evaluates them to the same characters. node -c parsed all 4 files; semantic round-trip verified via node global.window evaluator."

requirements-completed:
  - REQ-5    # Past sessions render disabled-but-populated sections as fully editable (amended 2026-04-28)
  - REQ-7    # Export action button on session edit page; clipboard renamed (markup change in this plan; i18n value in Plan 22-02)
  - REQ-8    # Section-selection dialog with client-safe defaults
  - REQ-9    # Disabled sections appear greyed in export dialog (.is-disabled + badge)
  - REQ-10   # Document header auto-populates (consumed by PDFExport — clientName, sessionDate, sessionType)
  - REQ-11   # Custom labels appear in exported document (via App.getSectionLabel in buildFilteredSessionMarkdown)
  - REQ-12   # Editable preview before final export (Step 2 textarea + live MdRender preview)
  - REQ-14   # Plain-text file download — button label "Download as text file"
  - REQ-15   # Web Share API integration where supported (canShare-files probe)
  - REQ-17   # All export strings translated en/de/he/cs (22 keys × 4 languages)
  - REQ-19   # buildSessionMarkdown reads custom labels (all 9 section heading sites)
# REQ-16 explicitly NOT completed — removed 2026-04-28 (Translate dropped)

# Metrics
duration: ~30min
completed: 2026-05-06
---

# Phase 22 Plan 06: Export Modal + buildSessionMarkdown Summary

**Wires Feature B end-to-end on the session edit page: a 3-step Export modal (selection → editable preview → outputs) producing PDF, plain-text-file (.md), and Web Share — plus closes Feature A's render side by routing every section heading through App.getSectionLabel and gating section visibility per Settings.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-05-06 (worktree agent-a621e3edd76577c85)
- **Completed:** 2026-05-06T17:15:13Z
- **Tasks:** 4 / 4
- **Files modified:** 7 (1 HTML, 1 JS controller, 1 CSS, 4 i18n)
- **Lines added:** ~1045

## Accomplishments

- **HTML scaffolding (Task 1):** Wrapped all 9 session-form sections (trapped, insights, limitingBeliefs, additionalTech, heartShield, heartShieldEmotions, issues, comments, nextSession) in `<div class="session-section" data-section-key="...">` with a hidden `<span class="disabled-indicator-badge is-hidden" data-i18n="settings.indicator.disabled">` placed immediately after each section heading. Added the Export button (#exportSessionBtn, primary `.button.icon-inline`, hidden until read mode) next to the Copy session text button. Updated session.copyAll button text from "Copy Session (MD)" to "Copy session text" (the i18n key value comes from Plan 22-02, but the markup default text was hand-edited here). Added the full Export modal (#exportModal) with step indicator, 3 step containers, output cards (PDF / text / Share), Back + Next pinned actions. Linked md-render.js before add-session.js. NO jspdf.min.js script tag (lazy-loaded only).

- **JS controller (Task 2):** Replaced every section-heading App.t() call inside buildSessionMarkdown with App.getSectionLabel(key, defaultI18nKey) — 9 section keys covered (verify count = 18 matches because some headings are emitted twice between buildSessionMarkdown and buildFilteredSessionMarkdown; the regex floor was 8). Added applySectionVisibility(isPastSession) that walks [data-section-key] wrappers, calls App.isSectionEnabled, and toggles .is-hidden + the badge per the REQ-3/REQ-5 truth table. Disabled-but-populated past sessions render visible, fully editable (no `disabled` or `readonly` attributes added, just the badge — REQ-5 amendment 2026-04-28). Listening for the cross-tab `app:settings-changed` CustomEvent re-runs the visibility check. Wired exportSessionBtn click to a fresh openExportDialog() that initializes _exportState, renders Step 1 rows from EXPORT_SECTION_ORDER with EXPORT_DEFAULT_CHECKED defaults, sets up Esc/overlay/close handlers with discard-confirm gate, and tears down listeners on close. Step 2 uses live MdRender.render of the textarea on every input. Step 3 wires PDFExport.buildSessionPDF (with onProgress subtitle), Blob-based plain-text download (file extension stays .md per amendment), and Web Share with canShare-files probe.

- **CSS (Task 3):** Appended a 188-line Phase 22 Export modal block. Step indicator dots (24×24px circles) with active/completed states; connector lines that complete as you advance. Section rows with greyed-disabled variant. Editor + preview grid (1 column on mobile, 2 columns ≥769px). Mobile tabs hidden ≥769px, inline-flex ≤768px. Output cards with hover lift (translateY -1px) and primary-dark icon color. All on-scale spacing (4/8/16/24/32/48/64), logical properties only (margin-inline / padding-block / inset-block-end), zero hex literals, all colors via existing var(--color-*) tokens.

- **i18n (Task 4):** Added 22 keys per language (en/de/he/cs) — session.export, export.title, step1.helper, step3.helper, next1, next2, done, back, tab.edit, tab.preview, download.pdf, download.text (renamed from download.md per amendment), share, share.subtitle, share.text, preparing, discard.title/body/yes/no, pdf.failed (drops "Markdown" jargon per amendment), empty.body. NO export.translate.* keys; NO translate.google.com URL anywhere. Czech file auto-escaped accents to \\uXXXX sequences (matches existing file pattern); semantic round-trip verified via Node global.window evaluator (e.g. CS export.title → "Exportovat sezení", DE → "Sitzung exportieren", HE → "ייצוא מפגש").

## Task Commits

Each task was committed atomically:

1. **Task 1: Wrap section markup + Export button + Export modal HTML + script tag** — `e97ed4b` (feat)
2. **Task 2: buildSessionMarkdown via App.getSectionLabel + applySectionVisibility + openExportDialog 3-step flow** — `a37b4d6` (feat)
3. **Task 3: Phase 22 Export modal CSS** — `d6593ad` (feat)
4. **Task 4: Export modal i18n keys × 4 languages** — `714403c` (feat)

_Note: Plan metadata commit (this SUMMARY.md) is performed by the orchestrator after worktree merge per the sequential-executor contract; STATE.md / ROADMAP.md updates are also orchestrator-owned._

## Files Created/Modified

- `add-session.html` — Sections re-wrapped with `<div class="session-section" data-section-key="...">` (9 wrappers); badge `<span class="disabled-indicator-badge is-hidden" data-i18n="settings.indicator.disabled">` injected after each section heading; #exportSessionBtn primary button added next to #copySessionBtn (which kept its DOM id and i18n key but had its default text changed to "Copy session text"); full #exportModal markup added after #confirmModal (step indicator + Step 1 selection container + Step 2 mobile tabs + textarea + preview + Step 3 output cards + Back/Next actions); `<script src="./assets/md-render.js">` added before `<script src="./assets/add-session.js">` in footer.

- `assets/add-session.js` — Five integrated changes: (A) all 9 section-heading App.t() calls in buildSessionMarkdown rewired to App.getSectionLabel; (B) sectionHasData(key) + applySectionVisibility(isPastSession) helpers; (C) exportSessionBtn ref + .is-hidden toggle next to copySessionBtn in setReadMode; (D) exportSessionBtn click handler invoking openExportDialog; (E) full openExportDialog() implementation with 11 helper functions (renderStep1Rows, setActiveStep, updatePreview, applyMobileTabs, wireMobileTabs, closeDialog, handleDownloadPdf, handleDownloadMd, handleShare, probeShareSupport, buildFilteredSessionMarkdown, getCurrentSessionDataForExport, exportDefaultI18nKey). app:settings-changed listener wired. Visibility re-applied after sessionId-based session load (`applySectionVisibility(true)`) and for new sessions (`applySectionVisibility(false)`).

- `assets/app.css` — 188-line block appended at end with header comment `/* Phase 22 — Export modal */`. Selectors: .export-card, .export-step-indicator, .export-step-dot (+ .is-active, .is-completed), .export-step-connector (+ .is-completed), .export-step (+ .is-active), .export-section-row (+ .is-disabled), .export-section-label, .export-edit-area, .export-editor, .export-preview (+ h1/h2/h3/p/ul typography), .export-mobile-tabs (+ .tab-btn + .tab-btn.is-active), .export-output-card (+ :hover), .output-card-icon/title/subtitle. Two `@media` queries (≥769px sets editor grid to 1fr 1fr; ≤768px shows mobile tabs).

- `assets/i18n-en.js`, `assets/i18n-de.js`, `assets/i18n-he.js`, `assets/i18n-cs.js` — Each appended a `// --- Phase 22 — Export modal ---` block of 22 export.* keys with locale-correct values per UI-SPEC Copywriting Contract. All 4 files parse via `node -c`. Semantic verification via Node global.window evaluator confirmed all 22 keys present and resolve to correct strings in all 4 languages.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `applySectionVisibility(isPastSession)` parameter rather than reading editingSession from closure | Makes the helper testable in isolation and clearly documents the dependency. The single caller path computes `!!editingSession` once. |
| Duplication of header+sections logic between `buildSessionMarkdown` and `buildFilteredSessionMarkdown` | The existing buildSessionMarkdown serves the Copy session text button; refactoring it to accept an optional filter Set risked regressing that button. The new function is contained (~80 lines), shares helpers (stripRequired, getIssuesPayload, App.getSectionLabel), and the cost is lower than a regression in copy. |
| Step indicator state managed via JS class toggles, not CSS counter() | The plan's HTML markup uses static dots without :nth-child pseudo-classes for active/completed, so toggling .is-active/.is-completed in setActiveStep is the simplest path and matches the UI-SPEC (active = primary, completed = primary-soft, pending = surface-subtle). |
| Web Share probe with 1-byte dummy PDF File at modal open | UI-SPEC says "only renders if navigator.canShare returns true". The probe shape (1-byte file with application/pdf MIME) matches what the actual call will send. Some browsers (desktop Chromium) report `navigator.share` exists but reject `canShare({files})` — the probe filters them out cleanly. |
| `EXPORT_DEFAULT_CHECKED` for heartShieldEmotions only true if data present | Plan-required nuance: heartShieldEmotions has stored data only when Heart Shield Session was on. Pre-checking it without data would yield an empty section in the output. |
| `_exportState.hasEditedPreview` set on textarea input event (not on Step 2 entry) | UX intent: arriving at Step 2 with auto-built markdown is not "edits". Only typing into the textarea creates a discard-confirm gate. |
| `exportHandleDownloadMd` keeps the .md file extension | Per amendment 2026-04-28: only the visible label changes to "Download as text file"; the on-disk extension stays .md so existing markdown viewers and the user's mental model of the file type are preserved. |
| CSS uses `inset-block-end`, `padding-block`, `padding-inline`, `margin-inline` exclusively | Plan-required: logical properties only for RTL safety. Verify regex bans padding-left/right and margin-left/right. Used `margin-block: 0 24px` instead of `margin-bottom: 24px` for the step indicator. |
| `--color-surface-subtle` token used for pending step dot | UI-SPEC: "Pending dot: background var(--color-surface-subtle); color var(--color-text-muted)". Token already exists in tokens.css (no new color tokens introduced). |

## Deviations from Plan

### Auto-fixed Issues

None. The plan was executed exactly as written, including all 5 amendments from 2026-04-28:
1. REQ-16 Translate dropped — no exportTranslateBtn, no wireTranslateButton, no translate.google.com anywhere (verified by negative grep across both add-session.js and all 4 i18n files).
2. Plain-text card label uses `export.download.text` (renamed from `export.download.md`); file extension stays .md.
3. Clipboard button keeps DOM id `copySessionBtn` and i18n key `session.copyAll`; only the rendered string changed (default text in the markup was updated for consistency, but the live value comes from i18n which is set in Plan 22-02).
4. Disabled-but-populated past sections render fully editable + badge — applySectionVisibility does NOT add `disabled`/`readonly` attributes.
5. No demo-mode-specific guards needed.

**Total deviations: 0.** No Rule 1/2/3 auto-fixes triggered. No Rule 4 architectural decisions surfaced.

### Clarifications worth flagging

- The `getSectionLabel` coverage count from `grep -cE` is 18, not 9. This is because the Plan 22-06 implementation includes both `buildSessionMarkdown` (the Copy session text path) and `buildFilteredSessionMarkdown` (the Export modal path). Each emits 9 section labels for a combined 18 matches. The plan's verify regex floor of 8 is comfortably exceeded. This is intentional — the export flow needed its own emit path with section filtering.

## Authentication Gates

None. The Export modal makes zero outbound network calls (REQ-16 amendment confirmed). All file operations (PDF, text, Share) are local to the browser. No credentials, no API keys, no auth flow.

## Threat Model Compliance

All 10 threat-register entries from the plan's `<threat_model>` are accounted for:

| Threat ID | Disposition | Implementation |
|-----------|-------------|----------------|
| T-22-06-01 (XSS via preview innerHTML) | mitigate | `pv.innerHTML = MdRender.render(ed.value)` — Plan 03's escape-first pipeline neutralizes script tags before structural rules. |
| T-22-06-02 (XSS via Step 1 row labels) | mitigate | `labelSpan.textContent = label` — never innerHTML. Verified: only one `.innerHTML =` site in the export path (the preview pane via MdRender). |
| T-22-06-03 (Translate href open-redirect) | REMOVED 2026-04-28 | REQ-16 dropped. No anchor element, no URL construction. Threat ID retained for traceability. |
| T-22-06-04 (Information disclosure via unselected sections leaking into editor) | mitigate | `buildFilteredSessionMarkdown(selectedKeys)` filters by checked-checkbox state at Step 1→2 transition; unselected section content never enters editor.value. |
| T-22-06-05 (navigator.share leaks file to chosen target) | accept | User-initiated share. By design. |
| T-22-06-06 (Web Share canShare false-positive on probe) | mitigate | `exportProbeShareSupport` uses a real File constructed from a 1-byte Blob with the same MIME the real share will use. If probe fails, button stays hidden. The handler also re-checks canShare just before share to handle race conditions. |
| T-22-06-07 (regex DoS on live preview) | mitigate (deferred) | MdRender uses bounded non-greedy quantifiers (Plan 03 verified 16 KB → 0.79 ms). Acceptable for v1. |
| T-22-06-08 (DevTools disabled-section bypass) | accept | Local-only single-user threat model. User is the attacker; bypassing their own setting is not a security boundary. |
| T-22-06-09 (Custom labels into PDF body) | accept | jsPDF `text()` does not execute scripts. Labels appear as plain text. |
| T-22-06-10 (Web Share UA fingerprint) | accept | `navigator.share` doesn't disclose more than the OS share sheet itself. |

**Residual risk: Low-medium.** The preview innerHTML path is the highest-risk surface, mitigated by Plan 03's escape-first pipeline.

## Threat Flags

None. No new network endpoints, no auth paths, no schema changes at trust boundaries. The modal is purely client-side; all I/O is local file generation (PDF blob, text blob) plus optional OS-mediated share.

## Known Stubs

None. Every code path returns valid output for valid input:
- The Export button activates a fully wired modal.
- Step 1 rows render from real `App.isSectionEnabled` data (defaults true if no settings saved yet).
- Step 2 textarea is initially populated from `buildFilteredSessionMarkdown(selectedKeys)` — real markdown for the loaded session.
- Step 3 PDF/text/Share all produce real downloads / shares.
- Web Share button is hidden by default; reveals only on `canShare({files})` probe success.

## Verification Performed

Per the plan's `<verify><automated>` blocks for each task:

**Task 1 — add-session.html:**
- ✅ 9 section-key wrappers (`grep -c data-section-key="..."` returns 9)
- ✅ #exportSessionBtn, #exportModal, #exportEditor, #exportPreview, #exportDownloadPdf, #exportDownloadMd, #exportShare all present
- ✅ md-render.js script tag present (line 547, before add-session.js at line 548)
- ✅ 9 disabled-indicator-badge is-hidden spans (one per section)
- ✅ exportTranslateBtn NOT present (negative grep)
- ✅ jspdf.min.js NOT in script tags (lazy-load only)

**Task 2 — assets/add-session.js:**
- ✅ `node -c assets/add-session.js` passes
- ✅ App.getSectionLabel coverage = 18 (floor was 8)
- ✅ applySectionVisibility function present
- ✅ exportSessionBtn ref + click → openExportDialog
- ✅ PDFExport.buildSessionPDF call site
- ✅ MdRender.render call site
- ✅ navigator.canShare + navigator.share call sites
- ✅ NO translate.google.com (negative grep)
- ✅ NO exportTranslateBtn or wireTranslateButton (negative grep)
- ✅ app:settings-changed listener present
- ✅ URL.createObjectURL OR PDFExport.triggerDownload present (text-file download)

**Task 3 — assets/app.css:**
- ✅ "Phase 22 — Export modal" header comment present
- ✅ All required selectors: .export-card, .export-step-indicator, .export-step-dot (+ .is-active), .export-step-connector, .export-step.is-active, .export-section-row (+ .is-disabled), .export-edit-area, .export-editor, .export-preview, .export-mobile-tabs, .export-output-card
- ✅ NO padding-left/right or margin-left/right within Phase 22 block (negative grep)
- ✅ NO hex literals within Phase 22 block (negative grep — only var() references)
- ✅ @media (min-width: 769px) AND @media (max-width: 768px) both present

**Task 4 — i18n files:**
- ✅ All 13 required keys (and 9 additional) present in en/de/he/cs (22 total per language)
- ✅ NO export.translate.cta, export.translate.tooltip, export.download.md (negative grep)
- ✅ NO translate.google.com URL anywhere (negative grep)
- ✅ All 4 files parse via `node -c`
- ✅ Semantic round-trip via Node global.window evaluator: HE export.title = "ייצוא מפגש"; DE = "Sitzung exportieren"; CS = "Exportovat sezení"; EN download.text = "Download as text file"

## Self-Check: PASSED

**Files modified verified to exist:**
- `add-session.html` ✓
- `assets/add-session.js` ✓
- `assets/app.css` ✓
- `assets/i18n-en.js` ✓
- `assets/i18n-de.js` ✓
- `assets/i18n-he.js` ✓
- `assets/i18n-cs.js` ✓

**Commits verified in `git log`:**
- `e97ed4b` (Task 1) ✓
- `a37b4d6` (Task 2) ✓
- `d6593ad` (Task 3) ✓
- `714403c` (Task 4) ✓

**No file deletions:** `git diff --diff-filter=D 69ed8f0..HEAD` empty.
**No untracked files left over:** `git status --short` empty after all commits.

**Plan-level success criteria (from PLAN.md `<success_criteria>`):**
- ✅ All 9 sections in add-session.html have data-section-key wrappers
- ✅ buildSessionMarkdown emits headings via App.getSectionLabel (all 9 sites)
- ✅ Past sessions render disabled-but-populated sections as fully editable + badge (REQ-5 amended); empty disabled stay hidden
- ✅ Export button visible in read mode (toggled alongside copySessionBtn in setReadMode); opens 3-step modal
- ✅ Step 1: client-safe defaults via EXPORT_DEFAULT_CHECKED, disabled sections greyed via .is-disabled + badge
- ✅ Step 2: live preview updates via window.MdRender.render on textarea input (NO Translate button)
- ✅ Step 3: PDF download via PDFExport.buildSessionPDF + slugify + triggerDownload (D-04 Unicode-preserving filename); plain-text-file via Blob/text-markdown MIME, .md extension; Share visible only if canShare({files}) probe succeeds
- ✅ Custom labels propagate from Settings → form (when wired in Plan 22-04) → Copy session text → Export Step 1 → Export preview → PDF (the App.getSectionLabel single layer is the seam)
- ✅ Modal close with edits prompts via App.confirmDialog with export.discard.* keys

---
*Phase: 22-session-workflow-loop-pre-session-context-card-editable-sess*
*Plan: 06 — Export Modal + buildSessionMarkdown*
*Completed: 2026-05-06*
