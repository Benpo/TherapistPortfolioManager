---
phase: 29
slug: reliability-observability
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-23
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstructed retroactively from phase artifacts (State B) — all behavioral
> requirements were already covered by green behavior tests written during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Project zero-npm convention — handwritten in-memory IndexedDB shim + `vm` sandbox + DOM stubs, run on Node's built-in (`node:assert`/bespoke harness). No jsdom/fake-indexeddb (hard zero-dependency / zero-build constraint). |
| **Config file** | none — no `package.json`; each test is a standalone runnable file |
| **Quick run command** | `for t in tests/29-*.test.js; do node "$t" || break; done` |
| **Full suite command** | `for t in tests/*.test.js; do node "$t" || break; done` |
| **Estimated runtime** | Phase-29 quick run ~2–3s; full suite ~30–60s |

---

## Sampling Rate

- **After every task commit:** Run the affected `tests/29-*.test.js` file(s)
- **After every plan wave:** Run `for t in tests/29-*.test.js; do node "$t"; done`
- **Before `/gsd-verify-work`:** Full Phase-29 set must be green
- **Max feedback latency:** ~3 seconds (quick run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | OBS-01 | T-29-01 / T-29-02 / T-29-03 / T-29-04 | Crash capture is local-only & bounded: PII stays on-device, zero-network, ≤50/≤30d retention, never-throwing logger | behavior (unit) | `node tests/29-01-crashlog-capture.test.js` | ✅ | ✅ green (6/6) |
| 29-01-02 | 01 | 1 | OBS-01 | T-29-02 | Early head-buffer entries survive module load (no IDB wipe), ingest idempotent, falls back without throwing; all 20 SW pages wire crashlog.js | behavior (unit) + grep | `node tests/29-04-crashlog-ingest-merge.test.js` ; `grep -L assets/crashlog.js <20 pages>` (empty) | ✅ | ✅ green (3/3) |
| 29-02-01 | 02 | 1 | OBS-03 | T-29-07 / T-29-08 | Export-around-failure reads the un-upgraded DB read-only (no openDB re-trigger), missing-store guard, passphrase-gated (no silent export), zero-network | behavior (unit) | `node tests/29-02-recovery-export.test.js` | ✅ | ✅ green (6/6) |
| 29-02-02 | 02 | 1 | OBS-03 | T-29-05 / T-29-06 | Destructive reset double-gated: affirmation checkbox + danger confirm before `deleteDatabase`; cancel never wipes; extra-emphatic when no session export; RTL-safe; dead-end refresh loop removed | behavior (unit) | `node tests/29-02-migration-escape-hatch.test.js` | ✅ | ✅ green (6/6) |
| 29-03-01 | 03 | 2 | OBS-02 | T-29-09 / T-29-10 / T-29-11 / T-29-12 | Redaction floor + editable preview (final privacy gate); Copy copies current textarea value; mailto body excludes full log; hardcoded support address; empty-state; zero-network | behavior (unit) | `node tests/29-03-report.test.js` | ✅ | ✅ green (19/19) |
| 29-03-02 | 03 | 2 | OBS-02 / OBS-01 | T-29-10 | Settings row → report.html; integrity mismatch persisted exactly once via `CrashLog.logError` (feature-gated, no throw when absent); wedged report/recover stubs route to real surfaces | behavior (unit) | `node tests/29-03-report-wiring.test.js` | ✅ | ✅ green (8/8) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Coverage:** 6/6 tasks have green automated behavior verification (34 assertions total across 6 test files, all passing as of 2026-06-23). Every must-have truth in 29-01/29-02/29-03 PLAN frontmatter maps to at least one falsifiable behavior case.

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* The project's established zero-npm test pattern (in-memory IDB shim + `vm` sandbox, per `tests/24-04`/`tests/28-04`) was reused for every Phase-29 test; no framework install was needed. All test files were authored TDD (RED→GREEN) during execution.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `mailto:` "Open email to support" opens the device mail client inside an **installed PWA** (recipient `contact@sessionsgarden.app`, preset subject, short paste-below body — not the full log) | OBS-02 (D-06) | `mailto:` reliability inside an installed PWA is OS/browser-dependent and can silently fail; a build agent has no installed-PWA device. The code path **and** its degradation fallback (`degradeToVisibleAddress()` → visible support address) are both implemented and behavior-tested — only real-device behavior is open. | Install Sessions Garden as a PWA (iOS/Android/desktop) → Settings → "Report a problem" → tap "Open email to support". Expect the native mail client to open with the correct recipient + subject + short body. If it fails/does nothing → un-hide `.report-support-fallback` (call `degradeToVisibleAddress()` on load) so the address is always visible. Tracked in `deferred-items.md` + `29-VERIFICATION.md` (status: `human_needed`, OPEN). |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task is green)
- [x] Wave 0 covers all MISSING references (none — no MISSING gaps)
- [x] No watch-mode flags
- [x] Feedback latency < 3s (quick run)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-23 (retroactive reconstruction — automated coverage complete; one inherently-manual on-device item carried to Manual-Only)
