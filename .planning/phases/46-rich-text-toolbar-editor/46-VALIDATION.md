---
phase: 46
slug: rich-text-toolbar-editor
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-14
audited: 2026-07-14
---

# Phase 46 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Zero-npm custom Node harness (plain `node tests/*.test.js`; jsdom bridged via `JSDOM_PATH`) — the same runner Phase 45 used |
| **Config file** | none — `tests/run-all.js` auto-discovers every top-level `tests/*.test.js` and runs each in its own child process |
| **Quick run command** | `node tests/46-text-edit.test.js` (per-task file; swap in the task's own file) |
| **Full suite command** | `npm test` (= `node tests/run-all.js`) |
| **Estimated runtime** | ~60–90 seconds full suite; the new pure-transform files run sub-second each |

---

## Sampling Rate

- **After every task commit:** Run the task's `node tests/46-*.test.js` file (pure-transform tasks) or its grep assertion (wiring/source tasks)
- **After every plan wave:** Run `npm test` (full suite, incl. the extended 45-pipeline-agreement join-invariant)
- **Before `/gsd-verify-work`:** Full suite green AND the 46-08 real-device / real-PDF checklist signed off
- **Max feedback latency:** ~90 seconds (full suite; per-task pure-transform files sub-second)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 46-01-01 | 01 | 1 | RTXT-01, D-04 | T-46-01a | editInsert keeps native undo; no setRangeText; empty-selection never doubles markers | unit | `node tests/46-text-edit.test.js` | ❌ W0 (RED-first, 46-01) | ⬜ pending |
| 46-01-02 | 01 | 1 | RTXT-03, RTXT-05, D-09/10/11 | T-46-01b | renumber scoped to the contiguous ordered block; caret offset survives the rewrite | unit | `node tests/46-list-mechanics.test.js` | ❌ W0 (RED-first, 46-01) | ⬜ pending |
| 46-02-01 | 02 | 1 | RTXT-05 (D-13) | T-46-02a, T-46-SC | vendored OFL font from official googlefonts source; SW-precached | asset/source | `grep -c "window.RubikItalic" assets/fonts/rubik-italic-base64.js; grep -c "rubik-italic-base64.js" sw.js` | — (source assertion) | ⬜ pending |
| 46-02-02 | 02 | 1 | RTXT-05 | T-46-02b | parseInline join-invariant byte-for-byte; single-pass bidi untouched | unit | `npm test` | ✅ (extends 45-pipeline-agreement) | ⬜ pending |
| 46-02-03 | 02 | 1 | RTXT-05 | T-46-02b | italic/bold classified; `***x***` degrades, join-invariant holds | unit | `node tests/45-pipeline-agreement.test.js` | ✅ (extended, 46-02) | ⬜ pending |
| 46-02-04 | 02 | 1 | RTXT-05 (D-13/D-14) | T-46-02a/c | real opened-PDF italic (Latin + Hebrew) + payload feasibility sign-off | manual | — (checkpoint:human-verify, blocking-human) | — | ⬜ pending |
| 46-03-01 | 03 | 2 | RTXT-01, RTXT-02 | T-46-03b | focus-preserved (mousedown+preventDefault, issue 1); in-flow dock (insertAdjacentElement) rides scroll/resize (issue 3); RTL-safe physical coords for the heading popover only; no direct `.value`/setRangeText | source | `grep -c "window.RichToolbar" assets/rich-toolbar.js; grep -c "getBoundingClientRect" assets/rich-toolbar.js; grep -c "rich-toolbar" assets/app.css; grep -c "mousedown" assets/rich-toolbar.js; grep -c "insertAdjacentElement" assets/rich-toolbar.js` | — (source assertion) | ⬜ pending |
| 46-03-02 | 03 | 2 | RTXT-01, RTXT-02 (D-04/D-20) | T-46-03b | edits via TextEdit; native execCommand undo/redo; 4-locale i18n parity | source + suite | `npm test; grep -c "execCommand('undo')" assets/rich-toolbar.js; grep -c "toggleWrap" assets/rich-toolbar.js` | — (source; i18n-parity via suite) | ⬜ pending |
| 46-04-01 | 04 | 3 | RTXT-03, RTXT-05 (D-09/10/11) | T-46-04b | keydown-anchored; renumber via TextEdit; undo-safe, caret-stable | unit-backed + source | `npm test; grep -c "autoFormatEnter\|renumberOrderedBlock" assets/rich-toolbar.js` | — (46-01 units back it) | ⬜ pending |
| 46-04-02 | 04 | 3 | RTXT-04 (D-05/06/07) | T-46-04a | preview 100% via MdRender (escape-first); no raw-value innerHTML | source | `grep -c "MdRender.render" assets/rich-toolbar.js; grep -c "note-rendered" assets/rich-toolbar.js assets/app.css` | — (source assertion) | ⬜ pending |
| 46-05-01 | 05 | 4 | RTXT-01, RTXT-04, RTXT-09 | T-46-05a | mount additive; autoGrow/snippets untouched | source + suite | `npm test; grep -c "RichToolbar.mount" assets/add-session.js` | — (source assertion) | ⬜ pending |
| 46-06-01 | 06 | 4 | RTXT-01, RTXT-04, RTXT-09 | T-46-06a/c | script load order correct; swap switcher kept (escape-first preview) | source + suite | `npm test; grep -c "rich-toolbar.js" add-session.html; grep -c "RichToolbar" assets/export-modal.js` | — (source assertion) | ⬜ pending |
| 46-06-02 | 06 | 4 | D-16/17/18 | T-46-06a | flex-fill editor; maximize state; confirm-dialog z-order intact | source | `grep -c "is-maximized" assets/app.css assets/export-modal.js` | — (source assertion) | ⬜ pending |
| 46-07-01 | 07 | 5 | RTXT-01…05 (docs DoD) | T-46-07a | in-register, no emojis, no internal framing | integrity | `npm test` (changelog-integrity) | ✅ (existing integrity test) | ⬜ pending |
| 46-07-02 | 07 | 5 | docs DoD | T-46-07b | new watched files registered in a topic covers[]; EN help edit | integrity + source | `npm test; grep -c "rich-toolbar.js\|text-edit.js\|rubik-italic-base64.js" assets/help-content-en.js` | ✅ (help-content integrity) | ⬜ pending |
| 46-08-01 | 08 | 6 | RTXT-01…05, RTXT-09 | T-46-08a/b | real-device / real-PDF gate (see Manual-Only) | manual | — (checkpoint:human-verify, blocking-human) | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · File Exists: ✅ exists/extended · ❌ W0 authored RED-first in-plan · — source/asset/manual (no dedicated test file)*

---

## Wave 0 Requirements

The zero-npm Node harness (`tests/run-all.js`) pre-exists and auto-discovers every
top-level `tests/*.test.js`, so **no framework install or separate Wave-0 scaffolding
phase is required**. The pure-transform test files are authored **RED-first inside
46-01's TDD tasks** (the Nyquist pattern — a task creates the test it will make green),
and the Phase-45 agreement test is extended in 46-02:

- [ ] `tests/46-text-edit.test.js` — created RED-first in 46-01 Task 1 (RTXT-01, D-04: `toggleWrap` / `insertListMarker` / `applyHeading` / `currentLine`)
- [ ] `tests/46-list-mechanics.test.js` — created RED-first in 46-01 Task 2 (RTXT-03/05, D-09/10/11: `autoFormatEnter` / `indentLine` / `outdentLine` / `renumberOrderedBlock`)
- [x] `tests/45-pipeline-agreement.test.js` — EXISTS (Phase 45); extended in 46-02 Task 3 for the `{text,bold,italic}` join-invariant
- [x] `tests/run-all.js` — EXISTS; auto-discovers the new files, no install

No task references a test that an earlier wave does not create — the "Wave 0 covers all
MISSING references" invariant holds without a dedicated Wave 0.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real opened-PDF italic (Latin + Hebrew) + payload feasibility | RTXT-05 (D-13/D-14) | jsdom PDF tests have shipped FALSE-GREEN in this repo; glyph slant + Hebrew bidi are only judgeable in a real opened PDF | 46-02 Task 4 (blocking-human): export italic Hebrew+Latin, open the real PDF, compare base64 payload to GREEN ≤90 / AMBER 90–140 / RED >140 KB |
| Caret / selection / toggle / paste live behavior | RTXT-01, D-04 | jsdom is blind to caret & selection | 46-08 checklist item 1 (real Safari/Chrome/Firefox + iPhone PWA) |
| Desktop shortcuts present / touch shortcuts absent | RTXT-02, D-02 | needs a real keyboard AND a real touch device | 46-08 item 2 |
| Auto-format + nested-list keydown mechanics | RTXT-03, RTXT-05, D-09/D-10 | keydown/caret behavior jsdom-blind | 46-08 item 3 |
| Delete-3 / paste-at-end renumber + caret + native undo | D-11 (Ben's scenario) | caret stability + native-undo revert only real on a device | 46-08 item 4 |
| Undo/redo buttons === keyboard undo (esp. iOS PWA) | D-20 | `execCommand('undo')` reliability is device-specific (A4 / Pitfall 3) | 46-08 item 5 — a mismatch routes to the NAMED D-20 fallback follow-up (single module-level undo stack that also intercepts Ctrl+Z), NOT generic gap-closure |
| Live preview render on real WebKit | RTXT-04 | render + toggle only real in a browser | 46-08 item 6 |
| Snippets + autogrow unchanged in an enhanced field | RTXT-09 (danger zone) | input-event composition only provable in a real browser | 46-08 item 7 |
| In-flow toolbar stays docked on scroll / autogrow | RTXT-01 (issue 3) | in-flow layout riding only observable in a real browser as the field grows/scrolls | 46-08 item 1 (SCROLL CHECK) |
| Export Step-2 sizing / maximize / mobile full-screen | D-16/17/18 | layout + viewport behavior only real | 46-08 item 8 |
| Steps 1 & 3 not oddly empty at 50% / maximized | D-16 (issue 6) | step-scoped sizing only judgeable by eye on a real render | 46-08 item 8 (STEPS 1 & 3 CHECK) |
| Two mount() call sites coexist (note fields + export editor) | RTXT-01 (issue 4) | additive-mount liveness only provable by exercising both surfaces in one session | 46-08 item 8 (MULTI-MOUNT COEXISTENCE) |
| RTL toolbar / dropdown / preview mirroring | RTL invariant | physical-coordinate positioning only visible on a real RTL render | 46-08 item 10 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (the two `checkpoint:human-verify` tasks — 46-02 Task 4 and 46-08 — are sanctioned `autonomous: false` human gates for jsdom-blind PDF/device behavior)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (the only manual tasks are the two terminal human gates, never 3 in a row)
- [x] Wave 0 covers all MISSING references (none — runner exists; the two new files are RED-first in 46-01; the agreement test is extended in 46-02)
- [x] No watch-mode flags (`tests/run-all.js` runs once and exits — no watch mode)
- [x] Feedback latency < ~90s (full suite; per-task pure-transform files sub-second)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-14

---

## Notes

Populated at plan-approval time from the 8 PLAN.md files (46-01…46-08). Every `auto`
task carries an `<automated>` verify command (unit test or grep source-assertion); the
two `checkpoint:human-verify` tasks (46-02 Task 4 real-PDF italic, 46-08 real-device
gate) are deliberate `autonomous: false` gates for behavior jsdom cannot see (caret,
selection, undo, PDF glyphs, RTL). The D-20 native-undo reliability check (A4 / Pitfall
3) is exercised at 46-08 item 5 with an explicit differentiated fallback route (see
Manual-Only), not an undifferentiated gap-closure bucket.
