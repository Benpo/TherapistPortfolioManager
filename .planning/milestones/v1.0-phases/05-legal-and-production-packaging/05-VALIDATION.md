---
phase: 5
slug: legal-and-production-packaging
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual browser testing (no automated framework — Playwright deferred to Phase 6) |
| **Config file** | None — manual test checklist |
| **Quick run command** | Manual browser smoke test for changed feature |
| **Full suite command** | Full manual checklist (all 10 behaviors below) |
| **Estimated runtime** | ~120 seconds (manual) |

---

## Sampling Rate

- **After every task commit:** Manual browser smoke test for that task's requirement
- **After every plan wave:** Full manual checklist — gate, receipt, SW offline, manifest, license, landing page
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | LEGL-01 | manual-smoke | Open index.html without localStorage flag, verify redirect to disclaimer | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | LEGL-01 | manual-smoke | Set `portfolioTermsAccepted=1` in localStorage, verify app loads | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | LEGL-02 | manual-smoke | Accept terms, verify .txt receipt download dialog appears | ❌ W0 | ⬜ pending |
| 05-01-04 | 01 | 1 | LEGL-03 | manual-visual | Inspect disclaimer page, verify Widerrufsrecht checkbox present and unchecked by default | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | DIST-03 | manual-smoke | Enter bogus license key, verify error message | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | DIST-03 | manual-smoke | Enter valid key, verify localStorage populated with instance_id | ❌ W0 | ⬜ pending |
| 05-02-03 | 02 | 2 | DIST-04 | manual-smoke | Visit once, go offline (DevTools), reload — verify app loads | ❌ W0 | ⬜ pending |
| 05-02-04 | 02 | 2 | DIST-04 | manual-smoke | Check DevTools > Application > Manifest shows valid installable PWA | ❌ W0 | ⬜ pending |
| 05-02-05 | 02 | 2 | DIST-05 | manual-visual | Switch language selector on landing.html, verify 4 languages render | ❌ W0 | ⬜ pending |
| 05-02-06 | 02 | 2 | DIST-05 | manual-infra | Push commit, verify Cloudflare Pages build log succeeds | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Manual test checklist document — steps for each requirement behavior
- [ ] No automated framework needed — Phase 6 owns Playwright setup (FOUND-05)

*Existing infrastructure covers automated needs; all phase behaviors verified manually.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Disclaimer gate blocks access | LEGL-01 | No test framework yet | Open app fresh (clear localStorage), verify redirect to disclaimer page |
| Receipt downloads as .txt | LEGL-02 | Browser download dialog | Accept terms, verify file downloads with correct content |
| Widerrufsrecht checkbox gates Accept | LEGL-03 | Visual + interaction check | Verify checkbox unchecked by default, Accept button disabled until checked |
| License key validation | DIST-03 | Requires Lemon Squeezy API | Test with invalid key (error) and valid key (activation stored) |
| Offline functionality | DIST-04 | Requires DevTools network toggle | Load app, go offline, reload — verify full functionality |
| PWA installability | DIST-04 | Requires DevTools Application tab | Check manifest validity, test Add to Home Screen |
| Landing page i18n | DIST-05 | Visual language verification | Toggle each of 4 languages, verify content renders correctly |
| Cloudflare deployment | DIST-05 | Infrastructure verification | Push and verify Pages build succeeds |

---

## Validation Sign-Off

- [ ] All tasks have manual verify instructions
- [ ] Sampling continuity: manual smoke test after every task commit
- [ ] Wave 0 covers manual test checklist
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
