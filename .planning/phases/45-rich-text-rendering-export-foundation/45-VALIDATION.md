---
phase: 45
slug: rich-text-rendering-export-foundation
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-13
audited: 2026-07-14
---

# Phase 45 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Custom Node harness (plain `node` test scripts, jsdom bridged via `JSDOM_PATH`) |
| **Config file** | none — `tests/run-all.js` orchestrates all files |
| **Quick run command** | `node tests/<file>.test.js` (per-task file) |
| **Full suite command** | `node tests/run-all.js` |
| **Estimated runtime** | ~60 seconds (full suite, 183 tests) |

---

## Sampling Rate

- **After every task commit:** Run the task's `node tests/45-*.test.js` file
- **After every plan wave:** Run `node tests/run-all.js`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 45-01-01 | 01 | 1 | RTXT-07 | — | flat output byte-identical (D-09) | unit | `node tests/45-mdrender-lists.test.js` | ✅ | ✅ green |
| 45-01-02 | 01 | 1 | RTXT-10 | T-45-01 | escape-first XSS-inert innerHTML; no lookbehind | unit | `node tests/45-mdrender-escape.test.js` | ✅ | ✅ green |
| 45-01-03 | 01 | 1 | RTXT-06 | — | strip() emits plain text only (D-06) | unit | `node tests/45-mdrender-strip.test.js` | ✅ | ✅ green |
| 45-02-01 | 02 | 1 | RTXT-10 | — | parseInlineBold join === stripInlineMarkdown invariant | unit | `node tests/45-inline-hardening.test.js` | ✅ | ✅ green |
| 45-02-02 | 02 | 1 | RTXT-07 | — | RTL-correct physical indent off docDir | unit | `node tests/45-pdf-nested-lists.test.js` | ✅ | ✅ green |
| 45-03-01 | 03 | 2 | RTXT-07 | — | section-count guard gates on document headings only | unit | `node tests/45-pdf-note-headings.test.js` | ✅ | ✅ green |
| 45-03-02 | 03 | 2 | RTXT-08 | — | copy/share byte-for-byte verbatim, no sentinel (D-10) | unit | `node tests/45-copy-share-verbatim.test.js` | ✅ | ✅ green |
| 45-04-01 | 04 | 2 | RTXT-06 | T-45-01 | read-mode innerHTML routed only through MdRender; `<script>` inert | unit | `node tests/45-read-mode-render.test.js` | ✅ | ✅ green |
| 45-04-02 | 04 | 2 | RTXT-06 | — | compact surfaces strip→textContent only | unit | `node tests/45-compact-strip.test.js` | ✅ | ✅ green |
| 45-04-03 | 04 | 2 | RTXT-06 | T-45-07 | 31-* render-hardening locks extended, never weakened | lock | `node tests/31-overview-render-hardening.test.js && node tests/31-sessions-render-hardening.test.js` | ✅ | ✅ green |
| 45-05-01 | 05 | 3 | RTXT-10, RTXT-07, RTXT-06 | T-45-08, T-45-03 | encrypted round-trip byte-identical; cross-pipeline agreement + 500-string fuzz | integration | `node tests/45-backup-roundtrip.test.js && node tests/45-pipeline-agreement.test.js` | ✅ | ✅ green |
| 45-05-02 | 05 | 3 | RTXT-08 (docs DoD) | — | changelog version pin 1.3.0→1.4.0 | integrity | `node tests/changelog-integrity.test.js` | ✅ | ✅ green |
| 45-06-01 | 06 | 4 | RTXT-06, RTXT-07, RTXT-10 | T-45-09 | real-device gate (see Manual-Only) | manual | — | — | ✅ passed (Ben, 2026-07-14) |
| 45-07-01 | 07 | 1 (gap) | RTXT-06 / GAP-45-01 | — | text-then-heading split mirrors PDF paragraph termination | unit | `node tests/45-mdrender-lists.test.js && node tests/45-pipeline-agreement.test.js` | ✅ | ✅ green |
| 45-07-02 | 07 | 1 (gap) | RTXT-06, RTXT-07 / GAP-45-02 | — | marker-only lines identical in both pipelines; `1.5 mg` literal guard | unit | `node tests/45-mdrender-lists.test.js && node tests/45-pdf-nested-lists.test.js && node tests/45-pipeline-agreement.test.js` | ✅ | ✅ green |
| 45-07-03 | 07 | 1 (gap) | docs DoD | — | EN changelog amended, docs-gate OK | integrity | `node tests/run-all.js` | ✅ | ✅ green |
| 45-08-01 | 08 | 1 (gap) | RTXT-06 / GAP-45-04 | T-45-08-01 | `value="N"` digits-only, char-matched to PDF ordMatch; pdf-export.js byte-unchanged | unit | `node tests/45-mdrender-lists.test.js && node tests/45-pipeline-agreement.test.js` | ✅ | ✅ green |
| 45-08-02 | 08 | 1 (gap) | RTXT-06, RTXT-07 / GAP-45-03 | T-45-08-02 | same-depth type-flip starts sibling list; homogeneous runs never split | unit | `node tests/45-mdrender-lists.test.js && node tests/45-pipeline-agreement.test.js` | ✅ | ✅ green |
| 45-08-03 | 08 | 1 (gap) | docs DoD | — | EN changelog amended, docs-gate OK | integrity | `node tests/run-all.js` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The custom Node harness
(`tests/run-all.js`) pre-existed the phase; all 11 phase-45 test files were created
TDD-first inside their tasks, so no Wave 0 stubs were needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Hebrew PDF opens and renders lists/headings correctly | RTXT-07 | jsPDF output must be judged in a real PDF viewer (glyph shaping, RTL layout) — jsdom cannot render it | Export a Hebrew session with nested/ordered lists + note headings to PDF; open and inspect. Artifact: `.claude/context/2026-07-13_phase45-verify-hebrew.pdf` |
| Installed-Safari PWA read-mode rendering (macOS + iPhone) | RTXT-06 | Service-worker/PWA behavior only manifests on a real installed app, not in jsdom (see memory: two SW failure modes) | Open a session in read mode on the installed PWA on both devices; confirm rendered notes |
| Real-device `.sgbackup` restore (encrypted + plain) | RTXT-10 | End-to-end file-picker + WebCrypto UX on device; automated round-trip covers logic but not the device flow | Export backup, restore on device, confirm notes byte-identical |

All three were executed via the Plan 06 `checkpoint:human-verify` gate on pre-prod
`sg-prpr-98xxj34.pages.dev` and **approved by Ben 2026-07-14** after two gap-closure
rounds (GAP-45-01…04 → Plans 07/08).

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (45-06-01 is a sanctioned human gate)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none needed)
- [x] No watch-mode flags
- [x] Feedback latency < ~60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-14

---

## Validation Audit 2026-07-14

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Audit notes: this file existed only as an unfilled template from plan time; it was
populated retroactively from the 8 PLAN/SUMMARY pairs. All 14 referenced test files
exist on disk and the full suite runs **183 passed, 0 failed** as of this audit.
The only non-automated verification in the phase is the Plan 06 real-device gate,
which is deliberate (`autonomous: false`) and passed. No new tests were generated —
every requirement already had green automated coverage.
