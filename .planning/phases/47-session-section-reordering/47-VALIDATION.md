---
phase: 47
slug: session-section-reordering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-23
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

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | ORDR-03/04 | — | form == Step-1 == export three-way invariant asserted against a MUTATED saved order (atomic 260615 rewrite) | unit (jsdom) | `node tests/30-export-markdown.test.js` | ✅ (rewrite) | ⬜ pending |
| TBD | TBD | 0 | ORDR-05 | — | order sentinel survives encrypted backup round-trip | unit | `node tests/47-order-backup-roundtrip.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | ORDR-05 | — | `_writeTherapistSentinel` accepts `sectionOrder`; `getAllTherapistSettings` returns it | unit | `node tests/47-order-sentinel.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | ORDR-02/05 (Interaction 11) | — | `sanitizeOrder` clamps on load AND on backup restore | unit (pure) | `node tests/47-order-sanitize.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | D-09/8a | — | — skip is mandatory-satisfying; excluded from export; all-skip omits severity block | unit | `node tests/47-severity-skip.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | ORDR-03 (Pattern 3) | — | `deriveSeverityAfterSections` ordinal correct for varied saved orders | unit (pure) | `node tests/47-severity-position.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | — | all | — | N/A | suite | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/47-order-sentinel.test.js` — sentinel put/read (ORDR-05); model on `25-10-snippets-sentinel-roundtrip.test.js`
- [ ] `tests/47-order-backup-roundtrip.test.js` — encrypted round-trip (ORDR-05); model on `45-backup-roundtrip.test.js` / `snippet-prefix-backup-roundtrip.test.js`
- [ ] `tests/47-order-sanitize.test.js` — clamp on load + restore (Interaction 11)
- [ ] `tests/47-severity-skip.test.js` — — skip value validation + export omission (D-09/8a)
- [ ] `tests/47-severity-position.test.js` — `deriveSeverityAfterSections` ordinal (Pattern 3)
- [ ] Rewrite `tests/30-export-markdown.test.js` — assert three-way invariant against a MUTATED saved order, not static DOM (the atomic 260615 rewrite, ORDR-04)
- [ ] Extend `tests/30-settings-section-roundtrip.test.js` for order rows if it asserts section-row shape
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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
