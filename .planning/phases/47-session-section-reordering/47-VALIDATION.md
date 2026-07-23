---
phase: 47
slug: session-section-reordering
status: assigned
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-23
updated: 2026-07-23
---

# Phase 47 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 47-RESEARCH.md `## Validation Architecture`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Zero-npm custom runner + Node `assert` + jsdom helpers in `tests/_helpers/` — no Jest/Vitest/Mocha |
| **Config file** | none — `tests/run-all.js` globs top-level `tests/*.test.js` (208 files at Phase 47 start), each in its own `node` child process, exit-0/1 contract |
| **Quick run command** | `node tests/<task-specific-file>.test.js` (single file, e.g. `node tests/30-export-markdown.test.js`) |
| **Full suite command** | `npm test` (→ `node tests/run-all.js`) |
| **Estimated runtime** | ~60 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run the task's single affected test file (e.g. `node tests/30-export-markdown.test.js`)
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite green + real-device UAT (iPhone touch drag, RTL drag, PDF severity position, empty-group hide)
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

> Task IDs assigned at planning; seeded from the requirement→test map in 47-RESEARCH.md.

Test scaffolds are created WITHIN their owning plan (each implementation plan writes/rewrites the test it makes pass), not in a separate Wave-0 plan.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 47-01 T1 | 47-01 | 1 | ORDR-05 | T-47-01/11 | `_writeTherapistSentinel` accepts `sectionOrder` (items/version); reader returns it | unit | `node tests/47-order-sentinel.test.js` | ❌ create in 47-01 | ⬜ pending |
| 47-01 T2 | 47-01 | 1 | ORDR-05 (Interaction 11) | T-47-02 | `sanitizeOrder` clamps afterSeverity-after-issues + drops unknown keys + APPENDS missing known sections/groups at D-02 default slots (G-7) + defaults on garbage; `pinSectionOrder` page-pin survives a cache refresh (G-5) | unit (pure) | `node tests/47-order-sanitize.test.js` | ❌ create in 47-01 | ⬜ pending |
| 47-01 T3 | 47-01 | 1 | ORDR-07 | T-47-03 | severity widget "— (skip)" third state; getSeverityValue returns SEV_SKIP / Number / null | unit | `node tests/47-severity-marker.test.js` | ❌ create in 47-01 | ⬜ pending |
| 47-03 T2 | 47-03 | 2 | ORDR-02 (Interaction 11) | T-47-02 | arrow-reorder persists via sentinel; illegal move clamped before save | unit (jsdom) | `node tests/47-settings-reorder.test.js` | ❌ create in 47-03 | ⬜ pending |
| 47-04 T2 | 47-04 | 2 | ORDR-03 | T-47-05 | form section DOM order == saved order; empty-group hide | unit (jsdom) | `node tests/47-form-order.test.js` | ❌ create in 47-04 | ⬜ pending |
| 47-05 T1 | 47-05 | 2 | ORDR-03/04 | T-47-07 | form == Step-1 == export three-way invariant vs a MUTATED saved order (atomic 260615 rewrite) | unit (jsdom) | `node tests/30-export-markdown.test.js` | ✅ (rewrite in 47-05) | ⬜ pending |
| 47-05 T2 | 47-05 | 2 | ORDR-06/07 (D-08/D-09/D-14/D-15/8a) | T-47-06 | — skip excluded from export; all-skip omits block; no literal marker leaks; topics-without-severity emits the topic-name section at the issues slot (G-2); switch-off hides the sub-option + excludes severity from both builders (G-3); topics re-check restores the sub-option default (G-12) | unit | `node tests/47-severity-skip.test.js` | ❌ create in 47-05 | ⬜ pending |
| 47-05 T3 | 47-05 | 2 | ORDR-04 (Pattern 3) | — | `deriveSeverityAfterSections` EDIT-AWARE ordinal (saved order ∩ parsed editor headings; a Step-2 heading deletion shifts the block, G-8) correct for varied saved orders | unit (pure) | `node tests/47-severity-position.test.js` | ❌ create in 47-05 | ⬜ pending |
| 47-05 T4 | 47-05 | 2 | ORDR-04/07 (D-13/8a) | T-47-06 | clipboard `buildSessionMarkdown` emits saved order + same topics/sub-option/switch gating; skip topic copies as name only — no skip-marker rating line, no NaN change line (G-1) | unit | `node tests/47-severity-skip.test.js` | ❌ extended in 47-05 T4 | ⬜ pending |
| 47-06 T1 | 47-06 | 2 | ORDR-05 | T-47-09/10/11 | order sentinel survives encrypted backup round-trip; restore key-allowlists + clamps | unit | `node tests/47-order-backup-roundtrip.test.js` | ❌ create in 47-06 | ⬜ pending |
| 47-07 T1/T2 | 47-07 | 3 | ORDR-06/07 | T-47-03/12 | skip value round-trips + never blocks save (validateIssues unchanged, G-17) + auto-hides after-rating + shows the skip hint (G-9); severity-off hides start-rating column on data-free sessions, keeps both visible+badged on past sessions with data (G-11) | unit (jsdom) | `node tests/47-severity-form.test.js` | ❌ create in 47-07 | ⬜ pending |
| — | all | — | all | — | full regression each wave merge | suite | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Test-Creation Assignments (folded into owning plans, not a separate Wave 0)

- [ ] `tests/47-order-sentinel.test.js` — created in **47-01 T1** (model on `25-10-snippets-sentinel-roundtrip.test.js`)
- [ ] `tests/47-order-sanitize.test.js` — created in **47-01 T2** (clamp + allowlist + append-missing-knowns at default slots (G-7) + default-on-garbage + page-pin survives cache refresh (G-5))
- [ ] `tests/47-severity-marker.test.js` — created in **47-01 T3** (widget "— (skip)" third state)
- [ ] `tests/47-settings-reorder.test.js` — created in **47-03 T2** (arrow reorder + clamp + persist)
- [ ] `tests/47-form-order.test.js` — created in **47-04 T2** (form order == saved order + empty-group hide)
- [ ] Rewrite `tests/30-export-markdown.test.js` — in **47-05 T1** (three-way invariant vs MUTATED order — the atomic 260615 rewrite)
- [ ] `tests/47-severity-skip.test.js` — created in **47-05 T2** (export omission + all-skip omits block + topics-without-severity emission (G-2) + switch-off exclusion (G-3) + re-check default (G-12)), EXTENDED in **47-05 T4** (clipboard buildSessionMarkdown: saved-order + gating + skip-copies-as-name-only, no NaN — G-1)
- [ ] `tests/47-severity-position.test.js` — created in **47-05 T3** (`deriveSeverityAfterSections` edit-aware ordinal — saved order ∩ parsed editor headings, G-8)
- [ ] `tests/47-order-backup-roundtrip.test.js` — created in **47-06 T1** (encrypted round-trip + restore sanitize)
- [ ] `tests/47-severity-form.test.js` — created in **47-07 T1/T2** (skip save/round-trip + hint toggle (G-9) + severity-off column incl. past-session-with-data badge mirror (G-11))
- [ ] Existing `tests/30-settings-section-roundtrip.test.js` — kept green (47-03 verify runs it); extend only if it asserts the section-row shape
- [ ] Framework install: none needed (zero-npm runner + jsdom already in place)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| iPhone touch drag reorders rows | ORDR-01 | Pointer-event geometry invisible to jsdom | Ben's iPhone, installed PWA, Settings → reorder rows by touch drag |
| RTL drag correctness | ORDR-01 | Physical-coords vs logical-props mirroring risk (Phase 41 lesson) | Hebrew locale, drag rows in both directions |
| PDF severity block position | ORDR-03 | Real PDF rendering — jsdom false-GREEN risk | Export PDF with severity moved to non-default slots; verify block position |
| Empty-group hide in form + export | UI-SPEC | Visual layout | Session with empty groups → check form and both exports |

*Real-device gate per project law before `/gsd-verify-work`.*

---

## Validation Sign-Off

- [x] All code-producing tasks have an `<automated>` verify (single-file test each), plus manual gates for jsdom-blind behavior
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every plan's tasks carry a test/grep/`node --check` verify)
- [x] All MISSING test references assigned to an owning plan+task
- [x] No watch-mode flags (single-file `node tests/*.test.js` runs)
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Manual-only gates remain (real-device, pre-`/gsd-verify-work`):** iPhone touch drag (ORDR-01), RTL drag mirroring, PDF severity-block position, empty-group hide, guided-tour anchor survival.

**Approval:** assigned — Task IDs / plans / waves mapped 2026-07-23.
