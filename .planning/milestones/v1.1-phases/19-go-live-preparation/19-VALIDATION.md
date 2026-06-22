---
phase: 19
slug: go-live-preparation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (vanilla JS PWA — no automated test infrastructure) |
| **Config file** | None |
| **Quick run command** | Manual browser testing |
| **Full suite command** | Manual cross-browser testing (Chrome + Safari minimum) |
| **Estimated runtime** | ~5 minutes per manual pass |

---

## Sampling Rate

- **After every task commit:** Manual verification of changed behavior in browser
- **After every plan wave:** Cross-browser check (Chrome + Safari minimum)
- **Before `/gsd:verify-work`:** Full E2E walkthrough
- **Max feedback latency:** N/A (manual testing)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Verification Method | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| TBD | 01 | 1 | LIVE-01 | manual | Visual inspection: all required legal sections present in DE Impressum | ⬜ pending |
| TBD | 01 | 1 | LIVE-02 | manual | Open each of 12 legal HTML files, verify language switcher navigates to correct sibling | ⬜ pending |
| TBD | 02 | 1 | LIVE-03 | manual | Push to main, verify GH Action runs, deploy branch updated, CF Pages deploys | ⬜ pending |
| TBD | 02 | 1 | LIVE-04 | manual | Complete real LS checkout, activate license, verify app loads | ⬜ pending |
| TBD | 03 | 1 | LIVE-05 | manual | Test license.html with/without localStorage keys — verify correct chrome renders | ⬜ pending |
| TBD | 03 | 1 | LIVE-06 | manual | Set localStorage keys, visit landing.html, verify auto-redirect behavior | ⬜ pending |
| TBD | N/A | N/A | LIVE-07 | N/A | Zero implementation — separate IndexedDB databases confirmed | ⬜ N/A |
| TBD | 04 | 2 | LIVE-08 | manual | Export encrypted backup, import with correct/wrong passphrase, verify old .zip still works | ⬜ pending |
| TBD | 05 | 2 | LIVE-09 | manual | Check backlog file exists with research output | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — existing manual testing approach covers all phase requirements. Automated test infrastructure is explicitly out of scope for v1.1 (see REQUIREMENTS.md FOUND-05).

---

## Justification for Manual-Only Testing

This is a vanilla JS PWA with no build step and no test framework. All phase 19 testing is integration/E2E level:
- Legal page content requires visual inspection (not automatable)
- Deployment pipeline requires real GH Actions + CF Pages (not unit-testable)
- License flow requires real localStorage state changes in browser
- Encrypted backup requires file download/upload interaction
- Purchase flow requires real Lemon Squeezy checkout

Adding Playwright is explicitly deferred to v2 (FOUND-05).
