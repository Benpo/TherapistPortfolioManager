---
phase: 34
slug: session-pdf-export-visual-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-29
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `34-RESEARCH.md` § Validation Architecture. The single load-bearing invariant is **Hebrew RTL/bidi non-regression**; the single deliberate break is the **5-fixture SHA-256 baseline regeneration**.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Plain Node scripts (no jest/vitest); each `tests/*.test.js` self-exits 0/1 |
| **Config file** | none — `tests/run-all.js` discovers top-level `tests/*.test.js` |
| **PDF harness** | `tests/_helpers/jsdom-pdf-env.js` (jsdom-loads `pdf-export.js`, builds real PDFs) |
| **Quick run command** | `node tests/<file>.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~full suite: tens of seconds |

---

## Sampling Rate

- **After every task commit:** Run the touched `tests/34-*.test.js` + the RTL spine (`pdf-digit-order`, `pdf-glyph-coverage`) — fast.
- **After every plan wave:** Run `npm test` (full suite).
- **Before `/gsd-verify-work`:** Full suite green, **with the 5 SHA-256 fixtures regenerated AND visually verified** against the mockup.
- **Max feedback latency:** seconds (single-file run) / tens of seconds (full suite).

---

## Per-Task Verification Map

> Task IDs are assigned by the planner. Rows below map each phase behavior to its Wave-0 test (authored BEFORE implementation per `feedback-behavior-verification`).

| Behavior | Requirement | Test Type | Automated Command | File Exists | Status |
|----------|-------------|-----------|-------------------|-------------|--------|
| 3 dated sessions export ordinals 1/2/3; delete middle → remaining renumber to 1/2 (no gap) | PDFX-02 (FN-1) | behavior (jsdom + mock DB) | `node tests/34-session-ordinal.test.js` | ❌ W0 | ⬜ pending |
| Same-date tie-break by `id` is deterministic | PDFX-02 (FN-1) | behavior | `node tests/34-session-ordinal.test.js` | ❌ W0 | ⬜ pending |
| Pill renders localized `sessionType` label verbatim (clinic/online/other × en/he/de/cs) | PDFX-01 (FN-2) | content-stream/glyph | `node tests/34-pill-localized.test.js` | ❌ W0 | ⬜ pending |
| `issues[]` `{name,before,after}` 0–10 → two bar fills, widths `value/10 × track`; before uses flat hex (no GState op in stream) | PDFX-01 | content-stream | `node tests/34-severity-bars.test.js` | ❌ W0 | ⬜ pending |
| Each new block (band/card/pill/severity/footer) anchors start-edge & digits keep visual order under `uiLang:'he'` | PDFX-01 (RTL) | content-stream | `node tests/34-rtl-newblocks.test.js` | ❌ W0 | ⬜ pending |
| `addImage` emits an image XObject; export succeeds with no network | PDFX-01 (FN-3) | behavior | `node tests/34-logo-embed.test.js` | ❌ W0 | ⬜ pending |
| Export with a dirty/new-unsaved form → "Save & export" persists (new session gets an `id`) then exports with the correct ordinal; "Keep editing" dismisses; save-validation failure aborts the export (no PDF) | PDFX-03 | behavior (jsdom) | `node tests/34-save-before-export.test.js` | ❌ W0 | ⬜ pending |
| Extracted reusable save = behavior-preserving (save button still validates/persists/redirects as before) | PDFX-03 | behavior | `node tests/34-save-before-export.test.js` + existing `30-export-stepper` | ❌ W0 | ⬜ pending |
| 5 fixtures regenerated & visually verified | PDFX-01 (baselines) | golden hash | `node tests/pdf-latin-regression.test.js` (post `--regenerate`) | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Existing Tests — Expected-Edit vs Must-Stay-Invariant

| Test | Mechanism | Verdict on redesign |
|------|-----------|---------------------|
| `pdf-latin-regression.test.js` | full-PDF SHA-256 of 5 fixtures | **EXPECTED BASELINE EDIT** — regenerate all 5, visually verify before committing |
| `pdf-digit-order.test.js` | digit-GID order in content stream | **MUST STAY GREEN** — RTL digit spine |
| `pdf-glyph-coverage.test.js` | glyph-emission floor for mixed-script line | **MUST STAY GREEN** |
| `pdf-bold-rendering.test.js` | runtime Tf resource walk for bold | **MUST STAY GREEN** |
| `pdf-bidi.test.js` | pure `shapeForJsPdf` unit (12 vectors) | **MUST STAY GREEN** — do not touch `shapeForJsPdf` |
| `quick-260608-c8x / cx5 / iwr / q8m` | content-stream digit/CID + x-anchor | **MUST STAY GREEN** unless markdown body list geometry changes |
| `30-issue-delta.test.js` | add-session `{name,before,after}` payload shape | **MUST STAY GREEN** — pins the severity data contract this phase consumes |
| `30-rtl-guard.test.js` | `app.js setLanguage` dir attr (not PDF) | unaffected |
| `30-export-stepper.test.js` | export modal stepper UI | verify if data-assembly wiring changes |

---

## Wave 0 Requirements

- [ ] `tests/34-session-ordinal.test.js` — PDFX-02/FN-1 (the Ben-flagged MUST-test). Seed 3 dated sessions via mock `PortfolioDB.getSessionsByClient` → assert ordinals 1/2/3 → delete middle → re-derive → assert remaining are 1/2. **Falsifiable:** swap derivation to `session.id` and the renumber case fails.
- [ ] `tests/34-pill-localized.test.js` — FN-2 verbatim localized label across the 4 locales.
- [ ] `tests/34-severity-bars.test.js` — bar fill widths proportional to before/after; before uses flat hex (assert no GState op in stream).
- [ ] `tests/34-rtl-newblocks.test.js` — start-edge anchoring + digit order for new blocks under `uiLang:'he'`.
- [ ] `tests/34-logo-embed.test.js` — image XObject present; build succeeds offline (no fetch).
- [ ] `tests/34-save-before-export.test.js` — PDFX-03: dirty/new-unsaved export → "Save & export" persists (new session gets `id`) → exports with correct ordinal; "Keep editing" dismisses; validation failure aborts export. Asserts the extracted reusable save is behavior-preserving for the save button. Author BEFORE the extraction + wiring.
- [ ] Regeneration protocol: follow `.planning/fixtures/phase-23/README.md` for the 5 SHA-256 baselines.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Regenerated PDF visually matches the FINAL mockup (Hebrew RTL + English LTR) | PDFX-01 | Byte-hash can't judge *visual* correctness — only that bytes changed | After `--regenerate`, open each of the 5 fixtures + a Hebrew export; compare header band, card, severity bars, footer against `design-mockups/FINAL-mockup.html` before committing baselines |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < tens of seconds
- [ ] `nyquist_compliant: true` set in frontmatter (after Wave 0 authored)

**Approval:** pending
