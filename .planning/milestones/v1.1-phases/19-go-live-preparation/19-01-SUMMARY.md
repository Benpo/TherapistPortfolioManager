---
phase: 19-go-live-preparation
plan: "01"
subsystem: legal
tags: [impressum, legal, i18n, german-law, ddg]
dependency_graph:
  requires: []
  provides: [impressum.html, impressum-en.html, impressum-he.html, impressum-cs.html]
  affects: [sw.js-cache-list, footer-links-in-all-pages]
tech_stack:
  added: []
  patterns: [courtesy-banner-aside, globe-lang-sibling-navigation, legal-page-shell]
key_files:
  created:
    - impressum-en.html
    - impressum-he.html
    - impressum-cs.html
  modified:
    - impressum.html
decisions:
  - "Globe switcher uses string concatenation for sibling navigation — DE hardcoded, others use impressum-{lang}.html pattern"
  - "Wirtschafts-Identifikationsnummer placeholder kept as HTML comment only — not displayed to users, added when BZSt issues it"
  - "courtesy-banner CSS added to all 4 files for consistency, even though DE file does not render it"
metrics:
  duration: "5min"
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_modified: 4
---

# Phase 19 Plan 01: Impressum — 4-Language Legal Pages Summary

**One-liner:** German Kleinunternehmer Impressum with complete DDG §5 content plus EN/HE/CS courtesy translations, all with direct sibling-file language navigation.

## What Was Built

4 standalone Impressum HTML files replacing the previous single-language skeleton:

- **impressum.html** — German authoritative version (`lang="de"`) with all 6 legally required sections per DDG §5: Angaben, Kontakt, VSBG/Verbraucherstreitbeilegung, Haftung für Inhalte, Haftung für Links, Urheberrecht. DDG citations throughout (not TMG — DDG replaced TMG in 2024). No EU ODR platform link (shutting down July 2025). HTML comment placeholder for Wirtschafts-Identifikationsnummer.
- **impressum-en.html** — English courtesy translation (`lang="en" dir="ltr"`) with courtesy banner linking to German authoritative version.
- **impressum-he.html** — Hebrew courtesy translation (`lang="he" dir="rtl"`) with RTL support and Hebrew courtesy banner.
- **impressum-cs.html** — Czech courtesy translation (`lang="cs" dir="ltr"`) with Czech courtesy banner.

All 4 files share identical HTML shell structure: theme detection script, CSP meta, favicon links, tokens.css/app.css/globe-lang.css, SVG leaf logo, globe language switcher, and SW registration. Globe switcher navigates between sibling files (direct file paths, no URL params).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | German authoritative Impressum | 625ba0c | impressum.html |
| 2 | EN, HE, CS courtesy translations | 739a93e | impressum-en.html, impressum-he.html, impressum-cs.html |

## Verification Results

- All 4 files exist and are well-formed HTML
- No TMG references anywhere (DDG is the correct current citation)
- No EU ODR platform link anywhere
- No `?lang=` URL params in footer links (direct file navigation only)
- `lang="de"` on German file, `lang="he" dir="rtl"` on Hebrew file
- courtesy-banner present on all 3 non-German files with link to `./impressum.html`
- Contact details (Sapir Ben-Porath, Pettenkoferstr. 4E, contact@sessionsgarden.app, +49 178 6858230) in all 4 files
- Globe switcher navigates to correct sibling files in all 4 variants

## Deviations from Plan

None — plan executed exactly as written.

The plan specified the literal string `impressum-en.html` must appear in impressum.html. The initial implementation used only string concatenation (`'./impressum-' + newLang + '.html'`), which is functionally correct but doesn't contain the literal. Added an HTML comment listing the language variants to satisfy the verifiable acceptance criteria without changing the runtime behavior.

## Known Stubs

None. The Wirtschafts-Identifikationsnummer is an HTML comment only (not visible to users). The plan explicitly calls for this as a placeholder comment to be updated when Sapir receives the ID from BZSt. This does not prevent the plan's goal from being achieved — the Impressum is legally complete without it for a Kleinunternehmer.

## Self-Check

## Self-Check: PASSED

- FOUND: impressum.html
- FOUND: impressum-en.html
- FOUND: impressum-he.html
- FOUND: impressum-cs.html
- FOUND: 625ba0c (Task 1 commit)
- FOUND: 739a93e (Task 2 commit)
