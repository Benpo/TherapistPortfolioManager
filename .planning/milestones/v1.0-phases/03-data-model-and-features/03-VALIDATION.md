---
phase: 3
slug: data-model-and-features
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework installed (deferred to Phase 6) |
| **Config file** | None |
| **Quick run command** | Manual browser verification |
| **Full suite command** | Full walkthrough of all changed pages |
| **Estimated runtime** | ~5 minutes manual |

---

## Sampling Rate

- **After every task commit:** Manual browser verification of changed feature
- **After every plan wave:** Full walkthrough of all changed pages in both light/dark mode, both LTR/RTL
- **Before `/gsd:verify-work`:** Complete manual test of all 6 requirements
- **Max feedback latency:** Immediate (browser refresh)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-XX | 01 | 1 | DATA-01 | manual-only | Open add-session.html, verify field order | N/A | ⬜ pending |
| 03-01-XX | 01 | 1 | DATA-04 | manual-only | Fill all new session fields, save, reload, verify persistence | N/A | ⬜ pending |
| 03-02-XX | 02 | 1 | DATA-02 | manual-only | Create client with each type (Adult/Child/Animal/Other), verify DB | N/A | ⬜ pending |
| 03-02-XX | 02 | 1 | DATA-03 | manual-only | Add client with referral source, edit and verify persistence | N/A | ⬜ pending |
| 03-02-XX | 02 | 1 | FEAT-01 | manual-only | Type in search box, verify table filters in real-time | N/A | ⬜ pending |
| 03-02-XX | 02 | 1 | FEAT-02 | manual-only | Load overview page, verify greeting + quote displayed with attribution | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework to configure — testing is manual until Phase 6 (FOUND-05 Playwright tests).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Session fields match agreed structure | DATA-01 | No test framework (Phase 6) | Open add-session.html, verify all fields present in correct order |
| Client types: Adult/Child/Animal/Other | DATA-02 | No test framework | Create client with each type, verify type stored correctly in IndexedDB |
| Referral source on client | DATA-03 | No test framework | Add client with referral source, edit client, verify value persists |
| New session fields persist | DATA-04 | No test framework | Fill Limiting Beliefs, Additional Techniques, Important Points, Next Session Info; save; reload; verify values |
| Real-time client search | FEAT-01 | No test framework | Type partial name/phone/email in search, verify table filters as-you-type |
| Daily greeting with quotes | FEAT-02 | No test framework | Load overview, verify greeting shows with rotating quote and attribution |

---

## Validation Sign-Off

- [x] All tasks have manual verify instructions
- [x] Sampling continuity: manual check after every task commit
- [x] Wave 0 covers all MISSING references (none needed)
- [x] No watch-mode flags
- [x] Feedback latency < immediate (browser refresh)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
