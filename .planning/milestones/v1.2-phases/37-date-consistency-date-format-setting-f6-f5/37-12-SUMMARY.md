---
phase: 37-date-consistency-date-format-setting-f6-f5
plan: 12
subsystem: legal-pages
tags: [legal, trademark, disclaimer, impressum, i18n, static-html]
requires:
  - 37-08 (Heart-Wall in-app terminology — the descriptive use this disclaimer guards)
provides:
  - Trademark + non-affiliation disclaimer on all 8 static legal pages (4 disclaimer + 4 impressum), 4 languages
affects:
  - disclaimer-en.html
  - disclaimer.html
  - disclaimer-he.html
  - disclaimer-cs.html
  - impressum-en.html
  - impressum.html
  - impressum-he.html
  - impressum-cs.html
tech-stack:
  added: []
  patterns:
    - Static per-file HTML edits (no shared include; plain text nodes, no new scripts)
    - EN canonical verbatim; he/de/cs shipped as flagged DRAFT pending external legal-native + challenger review
key-files:
  created:
    - .planning/phases/37-date-consistency-date-format-setting-f6-f5/37-12-SUMMARY.md
  modified:
    - disclaimer-en.html
    - disclaimer.html
    - disclaimer-he.html
    - disclaimer-cs.html
    - impressum-en.html
    - impressum.html
    - impressum-he.html
    - impressum-cs.html
decisions:
  - "D4 (Phase 37 DECISIONS): trademark + non-affiliation disclaimer on About/Legal + Impressum, 4 languages, drafted then reviewed before push"
  - "Heart-Wall® kept as the Latin trademark name (with ®) in all languages, not the in-app Hebrew label חומת הלב — this is trademark attribution, not the in-app term"
  - "DE disclaimer heading 'Marken und Unabhängigkeit' / impressum 'Marken'; HE 'סימנים מסחריים והשתייכות' / 'סימנים מסחריים'; CS 'Ochranné známky a nezávislost' / 'Ochranné známky' — natural per-language equivalents, not literal EN calques"
metrics:
  duration: ~15min
  completed: 2026-07-05
  tasks: 2
  files: 9
status: complete
---

# Phase 37 Plan 12: Trademark + Non-Affiliation Disclaimer (LEGAL-01) Summary

Added the D4 trademark + non-affiliation disclaimer to both legal surfaces — the 4 About/Legal (disclaimer / Terms of Use) pages and the 4 Impressum pages — in EN/DE/HE/CS, as the nominative-fair-use guardrail for using "Heart-Wall" and the descriptive Emotion Code / Body Code references as plain in-app labels.

## What Was Built

**Task 1 — 4 About/Legal (disclaimer) pages (commit 90bcf28):**
- New `section.disclaimer-section` (h2 title + p body) inserted immediately after each language's Intellectual Property section:
  - `disclaimer-en.html` — after "Intellectual Property"
  - `disclaimer.html` (DE) — after "Geistiges Eigentum"
  - `disclaimer-he.html` — after "קניין רוחני" (inside the existing `dir="rtl"` container)
  - `disclaimer-cs.html` — after "Duševní vlastnictví"
- Heading: "Trademarks & Affiliation" (EN, as `&amp;`) and its per-language equivalent.

**Task 2 — 4 Impressum pages (commit 80026d5):**
- New `h3` + `p` block inserted immediately after each language's Copyright section (EN "Copyright" / DE "Urheberrecht" / HE "זכויות יוצרים" / CS "Autorské právo"), mirroring the existing impressum markup (no `disclaimer-section` classes there).
- Heading: "Trademarks" (EN) and its per-language equivalent.
- The globe-lang navigation script and the DDG §5 / dispute-resolution content were not touched.

**Content:** EN is the canonical text verbatim (independent product; not affiliated with / endorsed by / sponsored by Discover Healing; Emotion Code® / Body Code™ / Heart-Wall® are trademarks of Wellness Unmasked, Inc., referenced descriptively / nominative fair use). ®/™ symbols preserved exactly. No partnership, certification, or endorsement is claimed anywhere.

**Draft flagging:** each he/de/cs section carries a `<!-- DRAFT — ... pending legal-native-speaker + challenger review before push (Czech especially) -->` HTML comment. Per the plan, this executor drafted + implemented the strings only; the external legal-native + challenger phrasing review runs at orchestrator level after this lands and before Ben pushes.

## Verification

- Task 1 verify script: `OK: disclaimer trademark block x4` (exit 0) — each of the 4 disclaimer files contains its trademark block, names Discover Healing / Wellness Unmasked, and mentions Heart-Wall.
- Task 2 verify script: `OK: impressum trademark block x4` (exit 0) — each of the 4 impressum files names Discover Healing + Wellness Unmasked.
- Latent-landmine guard: `grep -l "disclaimer.js" *.html` returns nothing — `assets/disclaimer.js` (dead code whose `DISCLAIMER_I18N` has no trademark entry) stays unreferenced, so the static block cannot be silently wiped. (If a future phase ever wires it, `DISCLAIMER_I18N.sections` needs the trademark entry ×4.)
- `npm test`: 121 passed + exactly the 3 intentionally-RED future-plan files (`37-overview-filters`, `37-overview-sort`, `37-sessions-filters` — 37-13/14/15 scope). Static-HTML-only change moved nothing.
- HE pages: the new block sits inside the existing `html[dir="rtl"]` container; Latin brand names + ®/™ mixed into the RTL paragraph exactly as the file's existing paragraphs already do (e.g. leading "Sessions Garden ..."). On-device Safari confirmation of the RTL rendering is part of the orchestrator's pre-push native review.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Notes for the orchestrator (pre-push review)

- he/de/cs headings + bodies are DRAFT translations by this executor (no in-house Czech speaker). They need the legal-native-speaker + challenger phrasing pass before Ben pushes, per D4 / T-37-12-01. EN is the conservative canonical and can ship as-is.
- Heading choices to confirm during review: DE "Marken und Unabhängigkeit" (disclaimer) / "Marken" (impressum); HE "סימנים מסחריים והשתייכות" / "סימנים מסחריים"; CS "Ochranné známky a nezávislost" / "Ochranné známky".

## Self-Check: PASSED

- disclaimer-en.html, disclaimer.html, disclaimer-he.html, disclaimer-cs.html — FOUND, trademark block present
- impressum-en.html, impressum.html, impressum-he.html, impressum-cs.html — FOUND, trademark block present
- Commit 90bcf28 (Task 1) — FOUND
- Commit 80026d5 (Task 2) — FOUND
