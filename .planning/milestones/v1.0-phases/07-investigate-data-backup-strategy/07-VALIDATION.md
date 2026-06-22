---
phase: 7
slug: investigate-data-backup-strategy
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright |
| **Config file** | playwright.config.js (Wave 0 creates if missing) |
| **Quick run command** | `npx playwright test tests/backup.spec.js` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/backup.spec.js`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | ZIP export format | integration | `npx playwright test tests/backup.spec.js -g "export-format"` | ❌ W0 | ⬜ pending |
| 7-01-02 | 01 | 1 | Photo extraction | integration | `npx playwright test tests/backup.spec.js -g "photo-extraction"` | ❌ W0 | ⬜ pending |
| 7-01-03 | 01 | 1 | Import/replace | integration | `npx playwright test tests/backup.spec.js -g "import-replace"` | ❌ W0 | ⬜ pending |
| 7-01-04 | 01 | 1 | Legacy JSON import | integration | `npx playwright test tests/backup.spec.js -g "legacy-import"` | ❌ W0 | ⬜ pending |
| 7-02-01 | 02 | 2 | Auto-save to folder | manual+mock | `npx playwright test tests/backup.spec.js -g "auto-save"` | ❌ W0 | ⬜ pending |
| 7-02-02 | 02 | 2 | Send to myself | manual-only | N/A — mailto + download not automatable | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/backup.spec.js` — stubs for export-format, photo-extraction, import-replace, legacy-import, auto-save
- [ ] Playwright install: `npm install --save-dev @playwright/test && npx playwright install chromium`
- [ ] `playwright.config.js` — if not already present

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Send to myself" triggers download + opens email client | Send-to-myself UX | `mailto:` and download cannot be automated reliably | 1. Click "Send to myself" button 2. Verify ZIP downloads 3. Verify email client opens with pre-filled subject/body |
| Auto-save permission re-request on new session | File System Access API | Requires real browser gesture; mock can't fully verify UX | 1. Set backup folder 2. Close/reopen browser 3. Trigger backup 4. Verify permission prompt appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
