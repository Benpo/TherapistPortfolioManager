---
phase: 45
slug: rich-text-rendering-export-foundation
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-14
---

# Phase 45 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| note text → MdRender output → read-mode innerHTML | User-entered session note strings (untrusted) transformed to HTML and assigned via innerHTML in the add-session `.note-rendered` read-mode overlay — the app's single sanctioned innerHTML path for user content | Session note text (sensitive therapy content) |
| note text → compact surface textContent | Compact surfaces render via `MdRender.strip` output assigned through textContent only — no HTML emitted | Session note text |
| note markdown → jsPDF output | Same note strings parsed and drawn into the exported PDF (text/vector drawing — no DOM sink; risk is correctness/integrity, not injection) | Session note text |
| note content → PDF document structure | User-typed `## Section` inside a note could attempt to forge document chrome or shift the severity block; note-body classification isolates note headings from document chrome | Session note text |
| note content → encrypted .sgbackup → restore | Formatted note strings cross the AES-256-GCM encrypt/decrypt boundary; risk is data integrity (format drift), not confidentiality | Full app data (encrypted) |
| automated-green → real-device truth | jsdom green does not prove PDF/RTL/device correctness; the Plan 06 human gate is the boundary where visual/real-device truth is confirmed | Verification evidence |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-45-01 | Tampering/Elevation | MdRender.render → read-mode innerHTML (stored XSS via note content) | high | mitigate | Escape-first: `escapeHtml` runs on the ENTIRE input before any markdown rule (`assets/md-render.js:251`); overlay writes innerHTML ONLY from `MdRender.render` output, textContent fallback when MdRender absent; `tests/45-mdrender-escape.test.js` + `tests/45-read-mode-render.test.js` assert `<script>`/`<img onerror>` render inert | closed |
| T-45-02 | Tampering | MdRender.strip output | low | mitigate | `strip` returns plain text consumed only via textContent — never innerHTML (`tests/45-compact-strip.test.js`) | closed |
| T-45-03 | Tampering (data integrity) | parseInlineBold / stripInlineMarkdown divergence after D-08; MdRender ⟺ PDF pipeline divergence | medium | mitigate | Lockstep invariant + cross-pipeline agreement over pinned corpus and randomized fuzz, plus char-identical source assertion (`tests/45-pipeline-agreement.test.js`); confirmed in 45-05-SUMMARY | closed |
| T-45-04 | Information disclosure (garbled export) | RTL nested-list indent direction | low | mitigate | Physical offset keyed off `docDir` (`assets/pdf-export.js:865,1075,1109`); verified on a real opened Hebrew PDF at the Plan 06 phase gate (PASSED 2026-07-14) | closed |
| T-45-05 | Tampering | Markdown-injection: note heading forging document chrome / shifting severity block | medium | mitigate | Document-vs-note classification by label-set on the editor.value path; section-count guard and chrome branch count/brand document headings only; falsifiable spy test drives editor.value → buildSessionPDF; confirmed in 45-03-SUMMARY | closed |
| T-45-06 | Tampering (data integrity) | Classification polluting the verbatim copy/editor.value paths (D-10 breach) | medium | mitigate | Classification is passed-in DATA (a label set), never a sentinel in the markdown; both `buildSessionMarkdown()` and `buildFilteredSessionMarkdown()` locked byte-clean; confirmed in 45-03-SUMMARY | closed |
| T-45-07 | Tampering | Regression weakening textContent-only hardening on other surfaces | medium | mitigate | 31-* locks extended, never weakened; compact surfaces stay textContent-only; the innerHTML exception is single, narrow, test-locked; confirmed in 45-04-SUMMARY | closed |
| T-45-08 | Tampering (data integrity) | Backup round-trip silently altering note formatting | medium | mitigate | Falsifiable byte-identical round-trip test (`tests/45-backup-roundtrip.test.js`, real jsdom + real BackupManager modal + WebCrypto + JSZip); `backup.js` unchanged; ALSO verified on real device (encrypted + plain) at the Plan 06 gate | closed |
| T-45-09 | Repudiation (false-GREEN) | jsdom PDF tests passing while visually broken | high | mitigate | Mandatory real-opened-PDF + real-device human checkpoint (Plan 06) — PASSED: Ben approved 2026-07-14 after real Hebrew PDF inspection, installed-PWA rounds across builds a33d8dc → 207036c → 5ce1f46, and real-device backup restore | closed |
| T-45-SC | Tampering | Supply chain: npm/pip/cargo installs | low | accept | Zero package installs this phase; jsPDF/bidi.min.js pre-vendored and unchanged; nothing to slopsquat | closed |
| T-45-07-01 | Tampering / Info-disclosure (XSS) | md-render.js renderBlock rendering to innerHTML (round-1 gap fixes) | low | accept | No new XSS surface: `render()` escapes BEFORE any structural transform; the gap fixes changed only block-structure detection operating on already-escaped text; escape-first path and sole-innerHTML-writer invariant untouched | closed |
| T-45-07-02 | Tampering (silent cross-pipeline divergence) | md-render.js ⟺ pdf-export.js (round-1 gap fixes) | medium | mitigate | Gap fixes landed as cross-pipeline agreement cases (text-then-heading, heading-remainder, marker-only both types, 1.5-guard) in `tests/45-pipeline-agreement.test.js`; character-identity + join-invariant gates keep D-08 emphasis regexes pinned | closed |
| T-45-07-03 | Tampering (regex over-broadening breaks the 1.5-guard) | marker-detection regexes | medium | mitigate | Detection uses `(?=\s\|$)` and stripping `(?:\s+\|$)`; regression locks in `tests/45-mdrender-lists.test.js:176` and `tests/45-pdf-nested-lists.test.js:224` fail loudly if `1.5 mg` ever becomes a list | closed |
| T-45-08-01 | Tampering / Info-disclosure (attribute injection into innerHTML) | md-render.js buildListLevel `<li value="N">` emission | low | mitigate | `value` is `parseInt` of a `\d+` capture — digits-only, no user-controlled text concatenated into the attribute (`assets/md-render.js:71,104`); regression cases assert bullets carry NO `value` and ordered values are digit-only (`tests/45-mdrender-lists.test.js:63-89`) | closed |
| T-45-08-02 | Tampering (silent cross-pipeline divergence) | md-render.js ⟺ pdf-export.js (round-2 gap fixes) | medium | mitigate | Round-2 fixes landed as agreement cases (same-depth type-flip both directions incl. empty; typed non-sequential ordinals; block-separated numbered runs) in `tests/45-pipeline-agreement.test.js` | closed |
| T-45-08-03 | Tampering (regex over-broadening breaks the round-1 1.5-guard) | new `listOrdinal` capture regex | medium | mitigate | `listOrdinal` uses `/^\s*(\d+)\.(?:\s+\|$)/` character-matched to pdf's `ordMatch`, only ADDS a capture; round-1 `1.5 mg` → paragraph regressions stay green in both suites | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-45-01 | T-45-SC | Zero package installs across all 8 plans; jsPDF/bidi.min.js pre-vendored and unchanged — no supply-chain exposure introduced | plan-time threat model (all 8 plans) | 2026-07-14 |
| AR-45-02 | T-45-07-01 | Round-1 gap fixes changed only block-structure detection on already-escaped text; escape-first path and sole-innerHTML-writer invariant untouched — no new XSS surface | plan-time threat model (45-07-PLAN) | 2026-07-14 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-14 | 16 | 16 | 0 | /gsd-secure-phase orchestrator (ASVS L1 grep-depth; short-circuit — register authored at plan time, all mitigations evidenced in code/tests/summaries) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-14
