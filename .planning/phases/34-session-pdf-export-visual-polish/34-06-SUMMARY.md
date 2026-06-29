---
phase: 34-session-pdf-export-visual-polish
plan: 6
subsystem: pdf-export / render-tier
tags: [pdf, jspdf, rtl, bidi, i18n, branding, header-band, client-card, D-01, D-02, D-04, D-05, D-10, D-12]

# Dependency graph
requires:
  - phase: 34-01
    provides: window.IconLogoBase64 vendored offline logo (assets/branding/icon-512-base64.js)
  - phase: 34-02
    provides: pdf.header.subtitle + session.copy.title/date i18n keys
  - phase: 34-03
    provides: 34-logo-embed / 34-pill-localized / 34-rtl-newblocks RED gates
  - phase: 34-05
    provides: sessionData.sessionNumber on the buildSessionPDF input contract
  - phase: 23
    provides: shapeForJsPdf / docDir RTL pipeline + isInputVisual:false invariant
provides:
  - "drawHeaderBand() — full-bleed mint header band with embedded offline logo + green keyline + localized title/subtitle (D-01/D-05)"
  - "drawClientCard() — cream client card with name + meta row (Date · localized pill · Session #N) (D-02/D-04)"
  - "pdf.card.sessionNo i18n key (en/he/de/cs) for the meta-row Session label"
affects: [34-07, 34-09, 34-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Branded page-1 opening drawn entirely from data: full-bleed band fill (rect 0→595) with content inset to MARGIN_X; embedded logo via addImage(data-URI base64, no fetch)"
    - "RTL-safe meta row by construction: item list laid out start→trailing (LTR) or mirrored right→left (RTL); each piece shaped via shapeForJsPdf + isInputVisual:false; never re-implements shapeForJsPdf (D-10)"
    - "Test-safe lazy asset: icon module loaded through loadScriptOnce's existing-tag fast path only; eager-loaded in add-session.html so the global is present without appending an unstubbed <script> that would hang jsdom"
    - "Hex→RGB color helpers (setFill/setStroke/setInk) for jsPDF-version-agnostic color; text color reset to black after band/card"

key-files:
  created: []
  modified:
    - assets/pdf-export.js
    - add-session.html
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js

key-decisions:
  - "Embed logo via doc.addImage('data:image/png;base64,'+IconLogoBase64,'PNG',…) (data-URI) rather than raw base64, so jsPDF's PNG decoder runs headless without a canvas — produces the /Subtype /Image XObject the 34-logo-embed gate requires (FN-3/D-05)."
  - "Card border #c8e6d4 (D-02 / FINAL mockup), overriding UI-SPEC FLAG-2 #bfe0b0, per 34-RESEARCH Open Q1 RESOLVED."
  - "Session number rendered as localized key + '#'+N (pdf.card.sessionNo); '#' is a universal number sign kept across all four locales for a consistent, low-churn label."
  - "Icon asset eager-loaded in add-session.html + a tag-guarded fallback in ensureDeps — never append an unstubbed external <script> (jsdom never fires its onload, which would hang every export under the render-tier test harness)."

requirements-completed: [PDFX-01]

# Metrics
duration: ~25min
completed: 2026-06-29
status: complete
---

# Phase 34 Plan 06: Branded Page-1 Header Band + Client Card Summary

Replaced the plain centered page-1 header with the locked branded opening — a full-bleed mint header band carrying the embedded offline logo (under a green keyline) plus a localized title/subtitle, and a cream client card with the client name and a single meta row (Date · localized session-type pill · Session #N) — every new text/shape anchored by `docDir` through `shapeForJsPdf` so the Phase 23 RTL invariant holds by construction.

## What was built

- **`drawHeaderBand()`** (pdf-export.js): full-bleed `#e2f3e3` band (`rect(0,0,595,96,'F')`); 48pt logo at the start edge via `addImage('data:image/png;base64,'+window.IconLogoBase64,'PNG',…)` (zero fetch, D-05/FN-3) under a `#3a7d5f` keyline (`roundedRect …'S'`); 20pt bold `#345e34` title (`session.copy.title`) + 11pt `#456b42` subtitle (`pdf.header.subtitle`) on the trailing side of the logo. No "Sessions Garden" wordmark letterhead (D-01).
- **`drawClientCard()`** (pdf-export.js): cream `#fdf8f0` card with the D-02 `#c8e6d4` border (`roundedRect …'FD'`), `ensureRoom(cardHeight)` so it never splits (Pitfall 5); 23pt bold `#345e34` client name; meta row with Date (bold `#456b42` key + muted `#5f5c72` value), a fully-rounded green pill (`#e8f5ee` fill, 11pt bold `#1e5c3a`) carrying the **localized session-type value verbatim** (D-04/FN-2), and Session #N. The row flows start→trailing in LTR and mirrors right→left in RTL; numerals keep visual order (`isInputVisual:false`, D-10).
- **Supporting helpers** (pdf-export.js): `pdfI18n()` (reads `window.I18N[uiLang][key]` → en → literal default), hex→rgb `setFill/setStroke/setInk`, `measureAt`, `makeTextItem`, `makePillItem`, `drawMetaRow`; layout/palette constants. `drawPage1Header` removed; render entry is now `drawHeaderBand(); var y = drawClientCard();`.
- **`add-session.html`**: eager `<script src="./assets/branding/icon-512-base64.js">` before `pdf-export.js` so `window.IconLogoBase64` is present at render time (offline, precached by 34-01).
- **`assets/i18n-{en,he,de,cs}.js`**: new `pdf.card.sessionNo` key (Session / מפגש / Sitzung / Sezení).

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | drawHeaderBand — band, embedded logo + keyline, title/subtitle | 50804d4 | assets/pdf-export.js, add-session.html |
| 2 | drawClientCard — card, name, meta row; remove drawPage1Header | f2a448b | assets/pdf-export.js, assets/i18n-{en,he,de,cs}.js |

## Verification

- **Target gates GREEN:** `34-logo-embed` (3/3 — image XObject emitted, offline build, vendored source); `34-pill-localized` (12/12 — localized pill verbatim across type×locale).
- **RTL spine GREEN (must-stay-green floor):** `pdf-digit-order`, `pdf-glyph-coverage`, `pdf-bold-rendering`, `pdf-bidi`, `30-issue-delta` all PASS — no RTL/order/glyph regression.
- **`pdf-latin-regression` GREEN:** the anticipated baseline break (Pitfall 1) did NOT materialize — the header/card changes did not disturb the Latin body baseline this fixture checks, so no Wave-5 regeneration is forced by this plan.
- **`34-rtl-newblocks` advancing (RED overall, expected):** parts A (card "Session #12" digit order) and C (pill start-edge anchored under RTL: heX≈344.6 > enX≈225.9, not at the LTR margin) PASS; part B (severity values 10/8) remains RED — gated by 34-09.
- **i18n parity GREEN:** `25-11-i18n-parity` passes with the new key present in all four locales.
- **Full suite:** 109 passed, 3 failed (`34-rtl-newblocks` advancing, `34-save-before-export` → 34-08, `34-severity-bars` → 34-09 — all expected Wave-0 gates owned by other plans).

## Deviations from Plan

### Auto-added missing functionality

**1. [Rule 3 — Blocking issue] Eager-load the logo asset in add-session.html instead of a blocking lazy append**
- **Found during:** Task 1.
- **Issue:** The plan said to add `icon-512-base64.js` to the ensureDeps lazy-load chain. An unconditional `loadScriptOnce` append cannot work: jsdom never fires `onload`/`onerror` for an appended external `<script>` (empirically verified), so it would hang every export under the render-tier test harness (the very gates this plan must turn green) — and a tag-guarded fallback alone would skip loading in production (no logo).
- **Fix:** Eager-load the asset in `add-session.html` (the only page that exports; consistent with its eager i18n + jszip loads) so `window.IconLogoBase64` is present before any export, AND keep a tag-guarded `loadScriptOnce` step in ensureDeps (resolves instantly via the existing-tag fast path in production; skips cleanly headless). `drawHeaderBand` guards the global and omits the logo if absent — never throws.
- **Files modified:** add-session.html, assets/pdf-export.js — **Commit:** 50804d4

**2. [Rule 2 — Missing critical copy] Add pdf.card.sessionNo i18n key (4 locales)**
- **Found during:** Task 2.
- **Issue:** D-02's meta row needs a localized "Session" label (key + value), but no such i18n key existed (34-02 authored the other pdf.* keys but not this one). The plan's `files_modified` listed only pdf-export.js.
- **Fix:** Added `pdf.card.sessionNo` to en/he/de/cs (Session / מפגש / Sitzung / Sezení); rendered as `{label} #{N}`. i18n parity stays green.
- **Files modified:** assets/i18n-{en,he,de,cs}.js — **Commit:** f2a448b

## Known Stubs

None. The header band and client card render from real inputs (`window.IconLogoBase64`, `window.I18N`, `sessionData.sessionNumber`/`sessionType`/`sessionDate`/`clientName`). Severity bars and the footer band are intentionally NOT in this plan (owned by 34-09 / 34-07); the body still renders the existing markdown.

## Notes for downstream plans

- **34-09 (severity bars)** flips part B of `34-rtl-newblocks` by rendering structured `issues[]` values (10/8). NB: the rtl-newblocks GID→digit heuristic produces a spurious "6" run from a Hebrew glyph in the new "תאריך:" (Date) label; it is a harmless test-side false positive (trips no assertion) — the authoritative `pdf-digit-order` invariant is green and the actual digits ("2026", "24", "#12") render in correct visual order.
- **34-10 (baselines):** `pdf-latin-regression` did not break, so no regeneration is required on this plan's account; re-confirm after 34-07/34-09 land the footer/severity.

## Self-Check: PASSED

- FOUND: assets/pdf-export.js (drawHeaderBand + drawClientCard present; drawPage1Header removed)
- FOUND: add-session.html (eager icon-512-base64.js script)
- FOUND: pdf.card.sessionNo in all four i18n files
- FOUND commit 50804d4 (Task 1)
- FOUND commit f2a448b (Task 2)
