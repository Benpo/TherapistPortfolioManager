---
phase: 40
slug: first-run-welcome-onboarding-coordinator
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-10
---

# Phase 40 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| i18n strings → rendered DOM | onboard.*/help.welcome.* values render into the welcome overlay, install nudge, mobile hint, and "?" menu row | author-controlled i18n sentences |
| localStorage flags → app | sg.welcomeSeen / sg.installNudgeDismissed / sg.mobileHintDismissed / session marker govern surface display | non-sensitive UX flags |
| browser install API → app | beforeinstallprompt capture + re-arm and native prompt() | none (browser-mediated) |
| version signal → welcome overlay | D-03 upgrader detection writes the last-seen version | public semver only (never INTEGRITY_TOKEN) |

---

## Threat Register

Register consolidated from the `<threat_model>` blocks of all 8 phase plans (authored at plan time; 40-06..08 are the gap-closure round).

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-40-02-XSS | Tampering (XSS) | welcome overlay DOM build | medium | mitigate | All copy via textContent/data-i18n; zero `innerHTML` occurrences in attention-coordinator.js (grep-verified 2026-07-10); gated by 40-welcome-overlay test (green) | closed |
| T-40-03-XSS | Tampering (XSS) | install-nudge / mobile-hint DOM build | medium | mitigate | Same textContent-only boundary (attention-coordinator.js:176 comment marks it); gated by 40-install-nudge test (green) | closed |
| T-40-08 (subtitle2) | Tampering (injection) | showWelcome() second subtitle `<p>` | medium | mitigate | textContent + data-i18n with non-empty/key-echo guard — a hostile translation renders as inert text; gated by 40-welcome-overlay assertions (green) | closed |
| T-40-01-DATA | Tampering (stored XSS vector) | new onboard.*/help.welcome.* i18n values | low | mitigate | Plain sentences, no markup; all consumers render via textContent/data-i18n; 40-i18n-parity enforces no-emoji/non-empty (green) | closed |
| T-40-02-VER | Information Disclosure | D-03 version write | low | mitigate | Records public `AppVersion.APP_VERSION` only; zero INTEGRITY_TOKEN references in attention-coordinator.js (grep-verified) | closed |
| T-40-04-REF | DoS (load error) | initCommon run() call | low | mitigate | `typeof AttentionCoordinator === 'undefined'` guard live at app.js:1474; gated by 40-app-wiring test (green) | closed |
| T-40-04-ARM | Tampering (state corruption) | Replay welcome row | low | mitigate | showWelcome(true) writes no flags (test-gated in 40-coordinator, green) | closed |
| T-40-04-XSS | Tampering | "?" menu row DOM | low | mitigate | Row label via textContent/data-i18n | closed |
| T-40-05-ORDER | DoS (load error) | script order on 8 pages | low | mitigate | Coordinator script before app.js on every page + typeof guard; gated by 40-app-wiring (green) | closed |
| T-40-05-OFFLINE | Availability | sw.js precache | low | mitigate | Coordinator in PRECACHE_URLS; CACHE_NAME auto-rolls via deploy token; gated by 40-precache (green) | closed |
| T-40-05-BANNER | Information Disclosure / UX | deleted legacy iOS banner | low | mitigate | Full IIFE removed; 40-ios-banner-removed asserts absence (green) | closed |
| T-40-06-01 | Tampering | install-nudge re-arm run() | low | mitigate | Re-arm adds no DOM/markup and reads only trusted registry + flags; gated by 40-install-nudge-rearm (green) | closed |
| T-40-06-02 | DoS | throw inside the re-arm | low | mitigate | Re-arm wrapped in its own try/catch — cannot break beforeinstallprompt capture or appinstalled cleanup | closed |
| T-40-02-STOR | Tampering | session/dismissal localStorage flags | low | accept | Single-user local app; worst case a surface re-shows; try/catch guards quota/private mode | closed |
| T-40-03-CLICK | Spoofing | native install prompt | low | accept | `prompt()` opens a browser-mediated dialog the page cannot overlay | closed |
| T-40-03-STOR | Tampering | dismissal flags | low | accept | Clearing a flag only re-offers the surface | closed |
| T-40-07-01 | Tampering | renderNav() template edit | low | accept | Compile-time literal template, no interpolation; removal test green | closed |
| T-40-07-02 | Information Disclosure | .help-entry-item CSS reset | low | accept | Pure presentational; no data or behavior change | closed |
| T-40-08-01 | DoS | empty subtitle2 stub collapsing overlay | low | mitigate | Non-empty guard renders nothing for empty stubs — overlay layout unchanged for non-EN locales | closed |
| T-40-SC | Tampering (supply chain) | package installs | low | accept | Zero packages installed across the phase (zero-npm vanilla PWA) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

**Adjacent note (not a phase-40 threat):** the pre-existing security-note renderer uses interpolated `innerHTML` with dev-owned strings (flagged Info in 40-REVIEW.md; renderer deliberately unchanged per D-05). It predates this phase and carries no user-controlled data; tracked as review info, not an open threat.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-40-01 | T-40-02-STOR, T-40-03-STOR | localStorage UX flags are non-sensitive; tampering only re-shows/suppresses a surface; try/catch-guarded | Plan-time register (Ben-approved plans) | 2026-07-08 |
| AR-40-02 | T-40-03-CLICK | Native install prompt is browser-mediated and cannot be overlaid by the page | Plan-time register (Ben-approved plans) | 2026-07-08 |
| AR-40-03 | T-40-07-01, T-40-07-02 | Gap-closure edits touch compile-time literals / pure CSS only | Plan-time register (Ben-approved plans) | 2026-07-10 |
| AR-40-04 | T-40-SC | No new dependencies introduced anywhere in the phase | Plan-time register (Ben-approved plans) | 2026-07-08 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-10 | 20 | 20 | 0 | gsd-secure-phase (orchestrator grep+test verification; ASVS L1 short-circuit — register authored at plan time, mediums grep-verified in live source, mitigations test-gated in the green 168/168 suite) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-10
