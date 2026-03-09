---
phase: 1
slug: foundation
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-09
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — inline node scripts + grep (Playwright added in Phase 6) |
| **Config file** | none — Wave 0 installs nothing |
| **Quick run command** | `grep -c 'var(--' assets/app.css` |
| **Full suite command** | see Per-Task Verification Map — run each `<automated>` command |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` verify command
- **After every plan wave:** Run all automated commands in sequence
- **Before `/gsd:verify-work`:** All automated checks must pass; manual checkpoint completed
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01-01 | 1 | FOUND-01, FOUND-02 | file + grep | `ls assets/fonts/Rubik-Regular.woff2 assets/fonts/Rubik-SemiBold.woff2 assets/fonts/Rubik-Bold.woff2 && grep -c "@font-face" assets/tokens.css && grep -c "data-theme" assets/tokens.css` | ❌ W0 | ⬜ pending |
| 01-01-T2 | 01-01 | 1 | FOUND-01 | grep | `grep -c 'var(--' assets/app.css` (must be ≥25; grep -c '#[0-9a-fA-F]' assets/app.css should be 0 outside tokens.css) | ❌ W0 | ⬜ pending |
| 01-02-T1 | 01-02 | 1 | FOUND-03 | node inline | `node -e "const {openDB}=require('./assets/db.js'); console.log(typeof openDB)"` (7-point structural check) | ❌ W0 | ⬜ pending |
| 01-03-T1 | 01-03 | 1 | FOUND-04 | node inline | `node -e "const src=require('fs').readFileSync('./assets/app.js','utf8'); ['checkBackupReminder','requestPersistentStorage','portfolioLastExport','navigator.storage.persist'].forEach(k=>{if(!src.includes(k))throw new Error(k+' missing')}); console.log('OK')"` | ❌ W0 | ⬜ pending |
| 01-03-T2 | 01-03 | 1 | FOUND-04 | checkpoint:human-verify | MISSING — manual browser UI test (12-step procedure in plan) | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

No test runner is installed for this phase. All automated verification uses inline node scripts and grep commands embedded in each task's `<verify>` element. Playwright E2E suite is Phase 6 scope.

*Wave 0 has no file gaps to fill.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Backup reminder banner appears after 7 days, shows 4 buttons, each button behaves correctly | FOUND-04 | LocalStorage-based timing + DOM interaction; no browser automation in Phase 1 | Set `localStorage.portfolioLastExport = Date.now() - 8*24*60*60*1000`, reload, verify banner appears with "Back up now", "Tomorrow", "1 week", "×"; click each and verify correct behavior |
| App loads Rubik font from local WOFF2 with no external network requests | FOUND-02 | Network tab inspection required | Open DevTools > Network, filter Fonts; reload — only local requests to assets/fonts/ should appear; no fonts.googleapis.com or fonts.gstatic.com |
| Dark mode activates correctly | FOUND-01 | Visual CSS rendering | In DevTools console: `document.documentElement.setAttribute('data-theme','dark')` — verify purple tones shift to dark palette |

---

## Validation Sign-Off

- [x] All auto tasks have `<automated>` verify command
- [x] Sampling continuity: no 3 consecutive auto tasks without automated verify
- [x] Wave 0: no test files needed (inline scripts cover all automated checks)
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter — set above, awaiting execution confirmation

**Approval:** pending
