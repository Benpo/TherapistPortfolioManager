---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 09
subsystem: session-workflow / settings / pdf-export
tags: [gap-closure, bug-fix, race-condition, ux-polish, pdf, web-share, confirm-dialog]
status: complete
gap_closure: true
requirements_closed: [REQ-13, REQ-15, REQ-3, REQ-5, REQ-21]
provenance: [GAP-1, GAP-2, GAP-3, GAP-4]
dependency-graph:
  requires:
    - "22-VERIFICATION.md (gap report)"
    - "22-REVIEW.md (WR-01, IN-02 findings)"
  provides:
    - "window.PDFExport registered on add-session.html → REQ-13/REQ-15 unblocked"
    - "Deterministic _sectionLabelCache population before applySectionVisibility / Settings render → REQ-3/REQ-5 deterministic"
    - "tone option on confirmDialog (danger | neutral) → REQ-21 visual intent met"
  affects:
    - "Phase 22 ship readiness — all four blocking/partial gaps closed"
tech-stack:
  added: []
  patterns:
    - "Optional 'tone' parameter with default-preserves-behavior (no migration of existing callers)"
    - "On-open class swap + on-close class restore (with self-heal branch) for shared modal styling"
key-files:
  created: []
  modified:
    - add-session.html
    - assets/add-session.js
    - assets/settings.js
    - assets/sessions.js
    - assets/reporting.js
    - assets/overview.js
    - assets/app.js
    - sw.js  # auto-bumped by pre-commit hook (v53 → v56)
decisions:
  - "Wire pdf-export.js as a static <script> tag (synchronous load) rather than lazy-load it inside openExportDialog — keeps the file with its peers, matches the contract pdf-export.js was authored against, and is one-line vs adding a loadScriptOnce helper."
  - "Convert settings.js DOMContentLoaded handler to async function (rather than wrapping in IIFE) — minimal-diff path; the await on App.initCommon would be a SyntaxError otherwise."
  - "Add on-open class swap + on-close restore in confirmDialog rather than introducing a new modal — keeps the shared #confirmModal markup unchanged; existing destructive callers see zero behavior change."
  - "Self-heal branch (tone === 'danger' AND already button-primary) added defensively in case a prior neutral call crashes between open and close — guards against state leak even though close() already restores."
metrics:
  duration: 3min
  tasks: 3
  files_modified: 8  # 7 source + 1 auto-bumped sw.js
  commits: 3
  completed: 2026-05-06T18:54:42Z
---

# Phase 22 Plan 09: Close Verification Gaps — Summary

Closed all four gaps surfaced by 22-VERIFICATION.md so Phase 22 ships its full goal: one missing `<script>` tag in add-session.html (root cause of REQ-13 + REQ-15 failure — both labelled CRITICAL), five missing `await` keywords on `App.initCommon()` (REVIEW WR-01 race), and a `tone` parameter on `confirmDialog` so the first-time-disable confirm in Settings stops styling its OK button as destructive red (REVIEW IN-02 / REQ-21 intent).

## Goal Achievement

The phase verification report (`22-VERIFICATION.md`) graded 17/21 must-haves verified, with 2 blocked + 1 at-risk + 1 partial. This plan closes all four:

- **REQ-13 (PDF download — CRITICAL):** moves from BLOCKED → SATISFIED. `<script src="./assets/pdf-export.js"></script>` now loads pdf-export.js between md-render.js and add-session.js, so `window.PDFExport` is registered synchronously at parse time. The previously-broken short-circuit at `add-session.js:1049` (`if (!btn || !window.PDFExport)`) no longer fires; the lazy-load chain (jsPDF + 2 fonts on first buildSessionPDF call) is reachable.
- **REQ-15 (Web Share with PDF):** moves from BLOCKED → SATISFIED. Same root cause as REQ-13; same fix.
- **REQ-3, REQ-5 (initCommon race):** moves from FAILED → SATISFIED. All five callers (`add-session.js:9`, `settings.js:397`, `sessions.js:2`, `reporting.js:2`, `overview.js:54`) now `await App.initCommon()`, guaranteeing `_sectionLabelCache` is populated before `applySectionVisibility(true|false)` runs at add-session.js:1481/1485 and before the Settings page first render. `settings.js` DOMContentLoaded handler converted from `function () { ... }` to `async function () { ... }` to make the await syntactically valid.
- **REQ-21 (first-disable confirm tone):** moves from PARTIAL → SATISFIED. `confirmDialog` accepts `tone: 'danger' | 'neutral'` (default 'danger' preserves existing destructive behavior). Settings.js disable-confirm site (line 237) passes `tone: 'neutral'`, swapping `#confirmOkBtn` from `class="button danger"` to `class="button-primary"` on open and restoring on close. The "Yes, disable" button now matches the warning copy ("This won't delete existing data") instead of contradicting it.

## What Was Built

### Task 1 — pdf-export.js script tag (commit `90c898b`)

`add-session.html` line 548 — single inserted line:

```html
  <script src="./assets/md-render.js"></script>
  <script src="./assets/pdf-export.js"></script>     ← NEW
  <script src="./assets/add-session.js"></script>
```

That is the entire diff. `window.PDFExport` is now registered when the page parses; the Export modal's Download PDF and Share buttons can call `PDFExport.buildSessionPDF(...)` without throwing. `sw.js` auto-bumped CACHE_NAME `v53 → v54` via the pre-commit hook (intentional — installed PWA users will pick up the new HTML).

### Task 2 — await App.initCommon() at 5 sites (commit `ffd6e97`)

Five mechanical edits, plus one function-to-async conversion in settings.js:

| File | Line | Change |
|---|---|---|
| `assets/add-session.js` | 9 | `App.initCommon();` → `await App.initCommon();` (handler already async) |
| `assets/settings.js` | 395, 397 | Handler `function () {` → `async function () {`; call site `App.initCommon();` → `await App.initCommon();` (guard preserved) |
| `assets/sessions.js` | 2 | `App.initCommon();` → `await App.initCommon();` |
| `assets/reporting.js` | 2 | `App.initCommon();` → `await App.initCommon();` |
| `assets/overview.js` | 54 | `App.initCommon();` → `await App.initCommon();` |

`sw.js` auto-bumped `v54 → v55`.

### Task 3 — tone option on confirmDialog (commit `e8023da`)

**`assets/app.js` confirmDialog (lines 443-509):** signature gains `tone = "danger"` default; new ~14-line block after `applyTranslations(modal)` swaps `#confirmOkBtn` class on open (`danger` ↔ `button-primary`) and tracks the original via local `_restoreConfirmBtnClass`; `close()` restores the class before resolving. Self-heal branch covers the rare case where a prior neutral call crashed mid-dialog.

**`assets/settings.js` disable-confirm site (line 237):** added one property `tone: "neutral"` to the existing `App.confirmDialog({ ... })` call object.

`sw.js` auto-bumped `v55 → v56`.

## Verification Results

All plan verification commands executed and passed:

```
=== GAP-1/GAP-2: pdf-export.js script tag ===
1
=== Ordering check ===
547:  <script src="./assets/md-render.js"></script>
548:  <script src="./assets/pdf-export.js"></script>
549:  <script src="./assets/add-session.js"></script>
=== GAP-3: 5 awaited callers ===
       5
=== GAP-3: no bare callers ===
(empty — PASS)
=== GAP-4: tone="danger" default ===
443:  function confirmDialog({ ... cancelKey = "confirm.cancel", tone = "danger" }) {
=== GAP-4: tone:'neutral' at settings disable site ===
1
=== Syntax check on all 6 modified JS files ===
ALL PARSE OK
=== Regression: no other confirmDialog consumer got tone added ===
0 (PASS — no tone in destructive consumers)
```

| Check | Expected | Actual | Result |
|---|---|---|---|
| `grep -c 'src="./assets/pdf-export.js"' add-session.html` | 1 | 1 | PASS |
| Ordering md-render < pdf-export < add-session | yes | 547 < 548 < 549 | PASS |
| `grep -E "await App\.initCommon" \| wc -l` (5 files) | 5 | 5 | PASS |
| No bare `App.initCommon()` (no `await`) | 0 | 0 | PASS |
| `tone = "danger"` default in app.js signature | 1 hit | 1 hit (line 443) | PASS |
| `tone:'neutral'` in settings.js | 1 | 1 | PASS |
| `node -c` on app.js, add-session.js, settings.js, sessions.js, reporting.js, overview.js | exit 0 | exit 0 | PASS |
| Other confirmDialog consumers (add-client:156, add-session:1030/1447, overview:103, settings:380) untouched | yes | yes | PASS |

## Regression Scope Check

Five other consumers of `confirmDialog` exist; all retain default 'danger' tone:

| File:Line | Flow | Tone |
|---|---|---|
| `assets/add-session.js:1030` | Delete-emotion confirm | default (red) |
| `assets/add-session.js:1447` | Delete-session confirm | default (red) |
| `assets/add-client.js:156` | Delete-client confirm | default (red) |
| `assets/overview.js:103` | Delete from overview | default (red) |
| `assets/settings.js:380` | Discard form changes | default (red) — discarding unsaved typing IS destructive |

None of these were modified. Their behavior is unchanged.

## Deviations from Plan

None — plan executed exactly as written.

The plan's three task-level diffs were applied verbatim. The only auto-fix-adjacent observation: the pre-commit hook auto-bumps `sw.js` `CACHE_NAME` whenever a precached asset changes (v53 → v56 across the three commits). This is the project's existing automation, not a plan deviation; sw.js was not in the plan's `files_modified` list because the bumps are mechanical and expected.

## Authentication Gates

None — fully autonomous execution.

## Manual Smoke Tests (Hand-off to Sapir)

The plan's `<verification>` block lists three operator-driven smokes that need a live browser. These are NOT executed by this agent and remain for Sapir / Ben to run in a real browser:

1. **REQ-13 PDF download (CRITICAL):**
   - Open `add-session.html`, create or open a session.
   - Click Export → step through to step 3 → click Download PDF.
   - Expect a real `.pdf` file in Downloads with filename `{clientSlug}_{ISO-date}.pdf`.
   - Open the .pdf — expect header (client / date / type) + section bodies rendered. (Hebrew client requires NotoSansHebrew glyphs — see human-verification item below.)
2. **REQ-15 Web Share:**
   - Same Export modal, click Share (on iOS Safari / Android Chrome with file-share support).
   - Expect OS share sheet with PDF attached.
3. **REQ-21 first-disable tone:**
   - Open Settings page → toggle off any free-text section (e.g. "Heart Shield").
   - Confirm dialog opens. The "Yes, disable" button is button-primary styled (NOT red).
   - Click Cancel → dialog closes; in DevTools, `document.getElementById('confirmOkBtn').className` reads `button danger` again (no class leak).
4. **REQ-21 regression:**
   - From Sessions page → delete a session → confirm dialog OK button is RED (default tone preserved).
   - From Add-Client page → delete a client → same.

## Outstanding Human-Verification Items (from 22-VERIFICATION.md)

Three of the original six human-verification items in 22-VERIFICATION.md were *blocked by* the gaps this plan closed and can now be unblocked for Sapir's manual pass:

- **Hebrew PDF export** — Hebrew client name in filename, Hebrew section headings + body text rendered with R2L using NotoSansHebrew font. (Was blocked by REQ-13; now executable.)
- **375px mobile viewport** — Settings rows reflow vertically; export modal Step 2 tabs (Edit / Preview) work; Download PDF tap target sized correctly.
- **PWA upgrade path** — installed v52 PWA users update through v53 → v54 → v55 → v56 (the three pre-commit cache bumps in this plan), pick up `add-session.html` with the new script tag, Settings page works offline.

The remaining three human-verification items (Hebrew RTL Settings page, pre-22 backup roundtrip, Demo mode IDB isolation) are independent of these gaps and remain on Sapir's list.

## Self-Check: PASSED

**Files created/modified — verification:**

- `add-session.html` — FOUND (line 548 has the new script tag)
- `assets/app.js` — FOUND (confirmDialog signature line 443 has `tone = "danger"`)
- `assets/add-session.js` — FOUND (line 9 has `await App.initCommon()`)
- `assets/settings.js` — FOUND (line 397 has `await App.initCommon()`; line 242 has `tone: "neutral"`)
- `assets/sessions.js` — FOUND (line 2 has `await App.initCommon()`)
- `assets/reporting.js` — FOUND (line 2 has `await App.initCommon()`)
- `assets/overview.js` — FOUND (line 54 has `await App.initCommon()`)
- `sw.js` — FOUND (CACHE_NAME bumped to `sessions-garden-v56` — automatic pre-commit hook behavior)

**Commits — verification:**

- `90c898b` — FOUND (Task 1: fix(22-09) wire pdf-export.js script tag)
- `ffd6e97` — FOUND (Task 2: fix(22-09) await App.initCommon at 5 sites)
- `e8023da` — FOUND (Task 3: feat(22-09) confirmDialog tone option)

All artifacts exist, all commits present, all verification commands passed.
