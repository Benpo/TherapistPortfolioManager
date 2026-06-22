---
phase: 4
slug: internationalization-and-distribution-research
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-11
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test runner installed (Playwright planned for Phase 6) |
| **Config file** | None |
| **Quick run command** | Open browser, check affected language |
| **Full suite command** | Open all 5 pages in all 4 languages, check RTL in Hebrew |
| **Estimated runtime** | ~5 minutes (manual) |

---

## Sampling Rate

- **After every task commit:** Open browser, switch to affected language, spot-check changed keys
- **After every plan wave:** Test all 4 languages on all 5 pages; verify quote cycling; verify RTL on all Hebrew pages
- **Before `/gsd:verify-work`:** Full manual suite — all languages, all pages, Hebrew RTL
- **Max feedback latency:** ~60 seconds (manual browser check)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| Split i18n files | 01 | 1 | I18N-01 | manual-only | Open each page, switch languages | N/A | ⬜ pending |
| HTML script tags | 01 | 1 | I18N-01 | manual-only | Open each page, verify no console errors | N/A | ⬜ pending |
| Brand subtitle wiring | 01 | 1 | I18N-01 | manual-only | Switch language, check subtitle updates | N/A | ⬜ pending |
| Heart Shield rename | 01 | 1 | I18N-02, I18N-03 | manual-only | Check sessions table, reporting page, overview badges in all langs | N/A | ⬜ pending |
| Clinic→Practice rename | 01 | 1 | I18N-02, I18N-03 | manual-only | Check add-session location toggle in EN/CS | N/A | ⬜ pending |
| Czech terminology fixes | 02 | 1 | I18N-03 | manual-only | Set lang=cs, check all pages for English bleed-through | N/A | ⬜ pending |
| German validation | 02 | 1 | I18N-02 | manual-only | Set lang=de, check all pages | N/A | ⬜ pending |
| Hebrew quote fixes | 02 | 1 | I18N-01 | manual-only | Set lang=he, check overview quote | N/A | ⬜ pending |
| Quote translations | 02 | 1 | I18N-02, I18N-03 | manual-only | Check quotes in DE/CS | N/A | ⬜ pending |
| RTL validation | 03 | 2 | I18N-04 | manual-only | Set lang=he, test all 5 pages | N/A | ⬜ pending |
| Distribution decision doc | 04 | 2 | DIST-01, DIST-02 | manual-only | Read DISTRIBUTION-DECISION.md | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework to install — Phase 6 (FOUND-05) will add Playwright.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Language switching works across all 4 languages | I18N-01 | No test runner; visual UI check | Open index.html, switch lang via dropdown, verify all text updates |
| Adding a new language requires only adding one file | I18N-01 | Architecture review, not runtime | Code review of file structure |
| All 5 pages load correctly after script changes | I18N-01 | Browser compatibility check | Open each page, check console for errors |
| German UI renders correctly | I18N-02 | Visual check for naturalness | Set lang=de, browse all pages |
| Czech UI has no English bleed-through | I18N-03 | Visual check for untranslated terms | Set lang=cs, browse all pages |
| Czech "Klinika" fixed to "Praxe" | I18N-03 | Single term check | Set lang=cs, open add-session |
| Heart Shield terms renamed in all languages | I18N-02, I18N-03 | Visual check across languages | Check sessions table, reporting, overview in all 4 langs |
| Hebrew RTL — all Phase 2-3 features | I18N-04 | Visual layout check | Set lang=he, test each feature area |
| Hebrew RTL — no inline style breaks | I18N-04 | Dynamic content check | Set lang=he, add session, check issue rows |
| Distribution decision documented | DIST-01, DIST-02 | Document review | Read decision file, verify rationale present |

---

## Validation Sign-Off

- [x] All tasks have manual verification mapped
- [x] Sampling continuity: browser checks after every commit
- [x] Wave 0: no framework needed — all verification is manual for this phase
- [x] No watch-mode flags
- [x] Feedback latency < 60s (manual browser)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
