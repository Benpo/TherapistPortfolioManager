---
phase: 42
slug: in-app-changelog-what-s-new
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-10
---

# Phase 42 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client data array → rendered DOM | changelog/popup entry strings render into popup + page DOM | author-controlled content strings (the only injection surface this phase added) |
| localStorage `sg.whatsNewLastSeenVersion` → app | untrusted stored flag governs popup show/suppress | non-sensitive UX flag |
| demo iframe → app chrome | changelog entry points must be unreachable from demo mode | none (gating only) |
| SW precache → offline delivery | two-array precache underpins the offline guarantee for /changelog | static assets |
| tour runtime → coordinator arbitration | active tour suppresses competing governed surfaces | none (UX arbitration) |

---

## Threat Register

Register consolidated from the `<threat_model>` blocks of all 11 phase plans (authored at plan time). Duplicate threat IDs across plans denote the same threat verified at each touchpoint.

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-42-01 | Tampering (XSS) | whats-new.js / changelog.js render paths | medium | mitigate | createElement + textContent only; changelog.js ships zero `innerHTML` (changelog.js:19-20), whats-new.js textContent XSS boundary (whats-new.js:181); gated by 42-whats-new-gating/dismiss + 42-changelog-render tests (green in 168/168 suite) | closed |
| T-42-02 | Tampering/Spoofing | localStorage `sg.whatsNewLastSeenVersion` | low | accept | Non-sensitive UX flag; worst case one popup re-shows or is suppressed; reads/writes try/catch-wrapped (lsGet/lsSet) | closed |
| T-42-03 | Information Disclosure | demo-mode entry points to /changelog | low | mitigate | D-15 gating: "?" menu row filtered in demo, footer version link inert, coordinator disabled in demo; gated by 42-demo-gate test (green) | closed |
| T-42-04 | Tampering | changelog-content-en.js + i18n chrome string hygiene | low | mitigate | Integrity tests enforce no-emoji + structure contracts (changelog-integrity, 42-i18n-parity, both green); consumers render all strings via textContent | closed |
| T-42-05 | DoS (offline availability) | sw.js precache shape | low | mitigate | Two-array precache split + anti-stale fetch; gated by 42-precache test (green) and the real-SW offline UAT run (10/10 checks, 42-UAT.md test 1) | closed |
| T-42-06 | Spoofing | version source | low | mitigate | Version read only from `AppVersion.APP_VERSION`, never the SW/integrity token — single source of truth (CHLG-03); changelog-integrity asserts the 1.3.0 entry matches APP_VERSION | closed |
| T-42-07 | DoS (UX integrity) | coordinator run() over an active tour | low | mitigate | typeof-guarded `window.Tour.isActive()` early-return (attention-coordinator.js:101), non-claiming so no surface starvation; gated by 42-coordinator-tour-guard test (green) | closed |
| T-42-08 | Tampering | window.Tour stub/absence | low | accept | typeof guard degrades to prior behavior on missing/partial Tour; worst case a surface shows during a tour — no security impact | closed |
| T-42-09 | Tampering (UX integrity) | footer version link vs integrity nudge | low | mitigate | Anchor wraps only the version text; `.app-footer-version-warn` remains a sibling outside the anchor; `maybeUpgradeFooterAndNudge` untouched — verified in execution + UAT visual pass | closed |
| T-42-10 | Repudiation (content accuracy) | unapproved changelog copy shipping | low | mitigate | D-04 blocking human checkpoint executed — Ben approved all entry copy 2026-07-09 (one revision applied); Phase 43's release-moment gate re-checks the entry at ship time | closed |
| T-42-SC | Tampering (supply chain) | npm/pip/cargo installs | low | accept | Zero packages introduced across the phase (RESEARCH Package Legitimacy Audit: N/A); tests use the already-installed jsdom devDependency only | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-42-01 | T-42-02 | localStorage popup flag is a non-sensitive UX marker; tampering yields at most one extra/suppressed popup; access is try/catch-wrapped | Plan-time register (Ben-approved plans) | 2026-07-09 |
| AR-42-02 | T-42-08 | Missing/stubbed window.Tour degrades to pre-phase behavior via typeof guard; no crash, no security impact | Plan-time register (Ben-approved plans) | 2026-07-09 |
| AR-42-03 | T-42-SC | No new dependencies introduced anywhere in the phase; supply-chain surface unchanged | Plan-time register (Ben-approved plans) | 2026-07-09 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-10 | 11 | 11 | 0 | gsd-secure-phase (orchestrator grep+test verification; ASVS L1 short-circuit — register authored at plan time, all mitigations test-gated in the green 168/168 suite) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-10
