---
phase: 2
slug: visual-transformation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no automated test suite exists (formal tests are Phase 6 scope) |
| **Config file** | none |
| **Quick run command** | Open affected page in browser, verify no visual regression |
| **Full suite command** | Check all 5 pages in both light and dark modes, in LTR and RTL |
| **Estimated runtime** | ~5 minutes manual inspection |

---

## Sampling Rate

- **After every task commit:** Open the affected page in browser, verify no visual regression
- **After every plan wave:** Check all 5 pages in both light and dark modes, in LTR and RTL
- **Before `/gsd:verify-work`:** All 5 pages pass visual inspection in 4 combinations (light/dark × LTR/RTL)
- **Max feedback latency:** ~5 minutes (manual browser check)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | DSGN-01 | manual smoke | Open index.html, verify cream bg, green primary, orange accents | N/A | ⬜ pending |
| 2-01-02 | 01 | 1 | DSGN-04 | manual smoke | Change nav label in renderNav(), verify appears on all 5 pages | N/A | ⬜ pending |
| 2-01-03 | 01 | 1 | DSGN-02 | manual smoke | Add no-flash script, reload; verify no flash of wrong theme | N/A | ⬜ pending |
| 2-02-01 | 02 | 2 | DSGN-02 | manual smoke | Toggle dark, reload; verify persists; check localStorage portfolioTheme | N/A | ⬜ pending |
| 2-02-02 | 02 | 2 | DSGN-03 | manual smoke | Switch to Hebrew (עברית), inspect layout on all 5 pages | N/A | ⬜ pending |
| 2-02-03 | 02 | 2 | DSGN-01 | manual smoke | Verify dark mode uses night-garden palette (deep green bg, readable text, orange accents) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — this phase requires no automated test infrastructure. Formal test suite is FOUND-05 scope (Phase 6). All Phase 2 verification is manual browser inspection.

*Existing infrastructure covers all phase requirements (manual-only).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Garden palette visible — cream bg, green primary, orange accents | DSGN-01 | No browser-automation test infra | Open index.html, visually verify colors; check brand mark uses green bg |
| Theme toggle persists across reload, no flash | DSGN-02 | Flash behavior requires human visual judgment | Toggle dark, reload; verify no flash; inspect localStorage portfolioTheme = "dark" |
| RTL layout correct after logical properties migration | DSGN-03 | Layout correctness requires visual judgment | Switch to Hebrew, inspect layout on all 5 pages; verify spacing/alignment correct |
| Nav renders on all 5 pages from single source | DSGN-04 | Requires visiting 5 pages to confirm | Change nav label in renderNav(), visit all 5 pages without touching HTML |
| Dark mode contrast meets WCAG AA on garden colors | DSGN-01 | Requires human color contrast judgment | Check primary/background/text combinations in dark mode using browser DevTools or WebAIM contrast checker |

---

## Validation Sign-Off

- [ ] All tasks have manual verify instructions
- [ ] Sampling continuity: no 3 consecutive tasks without a verification step
- [ ] Wave 0: not required (manual-only phase)
- [ ] No watch-mode flags
- [ ] Feedback latency < 5 minutes per task
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
