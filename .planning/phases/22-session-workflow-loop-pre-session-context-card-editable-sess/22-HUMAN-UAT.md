---
status: partial
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
source: [22-VERIFICATION.md]
started: 2026-05-06T19:10:00Z
updated: 2026-05-06T19:10:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Hebrew RTL rendering of Settings page sticky info banner + 9 rows + first-time-disable confirm dialog
expected: Banner heading + 2 bullets, row labels, rename inputs, toggle position, reset icon, badge — all flow right-to-left correctly. Dialog OK/Cancel order is RTL-appropriate. After GAP-4 fix, the confirm OK button reads in 'button-primary' styling (not red 'danger') for the first-disable confirm.
result: [pending]

### 2. Hebrew PDF export — Hebrew client name in filename, Hebrew section headings + body text rendered with R2L
expected: PDF downloads with filename containing Hebrew characters as-is (e.g. 'שירה_2026-05-06.pdf'); inside the PDF, section headings and body lines render right-to-left using NotoSansHebrew font; no question marks or boxes for missing glyphs.
result: [pending]
unblocked_by: GAP-1 closure (pdf-export.js script tag wired)

### 3. 375px mobile viewport — Settings page rows stack correctly; export modal Step 2 tabs (Edit / Preview) work; Download PDF tap target sized correctly
expected: Settings rows reflow vertically; rename input + toggle + reset button do not overflow; export modal shows mobile tabs at <=768px and side-by-side on desktop; tabs switch which pane is visible; tap targets meet ≥44px minimum.
result: [pending]
unblocked_by: GAP-1 closure (PDF download is now reachable)

### 4. Backup/restore round-trip — verify pre-Phase-22 backup loads with no errors and applies defaults
expected: Restoring a ZIP that was created before therapistSettings existed (manifest.therapistSettings absent or null) succeeds without errors; all 9 sections render enabled with default i18n labels; no console errors; no orphaned IDB rows.
result: [pending]

### 5. PWA update path — installed v52 PWA users update through v53 → v54 → v55 → v56 cleanly and pick up Settings page offline
expected: On next visit, SW activate event evicts older cache, precaches v56 (including settings.html, settings.js, pdf-export.js, jspdf.min.js, fonts, plus the new add-session.html with the pdf-export script tag). Settings page works offline after first visit.
result: [pending]
unblocked_by: GAP-1 closure caused 3 additional cache bumps (v53 → v56)

### 6. Demo mode — gear icon visible, Settings page reachable, runs against demo_portfolio IndexedDB without leaking to real install
expected: Open landing.html → Demo button → gear icon visible in header → click → Settings page loads in demo context → setting a custom label in demo does not appear in the real app's IDB.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
