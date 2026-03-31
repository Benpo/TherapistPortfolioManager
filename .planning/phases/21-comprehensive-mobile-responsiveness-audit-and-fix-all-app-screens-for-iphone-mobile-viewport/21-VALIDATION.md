---
phase: 21
slug: comprehensive-mobile-responsiveness-audit-and-fix-all-app-screens-for-iphone-mobile-viewport
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual browser testing (no automated test framework — vanilla HTML/CSS/JS app) |
| **Config file** | none |
| **Quick run command** | `open index.html` (verify in Chrome DevTools mobile emulation at 375px) |
| **Full suite command** | `Manual: test all screens at 375px, 768px, and 1024px widths` |
| **Estimated runtime** | ~5 minutes per screen |

---

## Sampling Rate

- **After every task commit:** Verify affected screen at 375px in DevTools
- **After every plan wave:** Full sweep of all modified screens at 375px + 768px
- **Before `/gsd:verify-work`:** Ben tests on real iPhone
- **Max feedback latency:** Immediate (visual verification)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | D-10 | grep | `grep -c '\-\-z-dropdown' assets/app.css` | ✅ | ⬜ pending |
| 21-01-02 | 01 | 1 | D-12 | grep | `grep -c '480px' assets/app.css` | ✅ | ⬜ pending |
| 21-02-01 | 02 | 1 | D-01 | grep | `grep 'max-height.*90dvh\|90vh' assets/app.css` | ✅ | ⬜ pending |
| 21-02-02 | 02 | 1 | D-04 | grep | `grep 'body-scroll-lock\|is-scroll-locked' assets/app.css` | ✅ | ⬜ pending |
| 21-03-01 | 03 | 2 | D-05 | visual | DevTools 375px: form fields stack vertically | N/A | ⬜ pending |
| 21-03-02 | 03 | 2 | D-06 | visual | DevTools 375px: native date input visible | N/A | ⬜ pending |
| 21-03-03 | 03 | 2 | D-08 | visual | DevTools 375px: severity buttons wrap 2 rows | N/A | ⬜ pending |
| 21-04-01 | 04 | 2 | D-11 | grep | `grep 'min-.*44px\|min-.*2.75rem' assets/app.css` | ✅ | ⬜ pending |
| 21-05-01 | 05 | 3 | D-14 | manual | Crop modal initializes from session→edit client flow | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework needed — validation is CSS grep + visual verification.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Modal max-height respects iOS toolbar | D-01 | iOS Safari dynamic viewport | Open modal on iPhone, scroll page, verify modal fits |
| Body scroll lock on iOS Safari | D-04 | iOS-specific `position:fixed` workaround | Open modal on iPhone, try scrolling behind it |
| Native date picker on mobile | D-06 | Requires touch device | Tap date field on iPhone, verify OS wheel picker |
| Accordion collapse interaction | D-07 | Touch interaction | Tap section headers, verify expand/collapse |
| Overlay tap dismiss behavior | D-03 | Touch interaction | Tap outside form modal, verify discard prompt |
| Touch targets 44px minimum | D-11 | Visual/tap accuracy | Try tapping buttons on iPhone, verify no mis-taps |
| Crop modal from session screen | D-14 | Multi-page JS interaction | Navigate session→edit client→change photo→crop |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < immediate (visual check)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
