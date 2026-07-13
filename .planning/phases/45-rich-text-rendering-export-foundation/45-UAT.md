---
status: diagnosed
phase: 45-rich-text-rendering-export-foundation
source: [45-06 checkpoint (real-device gate), Ben real-device UAT 2026-07-13]
started: 2026-07-13T11:30:00.000Z
updated: 2026-07-13T13:40:00.000Z
---

## Current Test

number: n/a
name: Round 1 complete — 2 gaps diagnosed, gap round authorized ("collect everything, then ONE gap plan + execute" — Ben)
awaiting: gap closure, then short re-check + approval of the 45-06 checkpoint

## Tests

### 1. Read-mode rendering (installed PWA, macOS + iPhone Safari, pre-prod build a33d8dc)
expected: bold / bullets / numbered / nested lists / headings render styled, never raw markers
result: pass — bullets levels 1–4 ✓, bold ✓, block-start headings ✓, RTL + dark mode intact ✓

### 2. Hebrew PDF export
expected: note headings subordinate & chrome-free, document sections branded, nested RTL lists indent rightward, severity block unshifted
result: pass — phone-round export + inspection of the generated real-PDF sample (2026-07-13_phase45-verify-hebrew.pdf)

### 3. Backup round-trip on a real device (RTXT-10)
expected: formatted notes restore byte-identical
result: pass — verified BOTH encrypted (passphrase) and plain; formatting intact after restore

### 4. Text-then-heading without a blank line
expected: `text` line followed directly by `## X` renders a heading (the PDF already parses it that way)
result: ISSUE → GAP-45-01

### 5. Marker-only list lines
expected: `1.` and `1. ` (trailing space) behave identically
result: ISSUE → GAP-45-02

### 6. Legacy pre-v1.4 notes (D-09)
expected: legacy notes with accidental marker-shaped text upgrade meaning-preservingly
result: covered-by-absence — Ben's real legacy notes contain no marker-shaped lines; automated D-09 coverage stands

### 7. (Out of scope finding) Second backup import silently fails
result: NOT a Phase 45 item — pre-existing bug (backup.js/settings.js untouched this phase, git-verified). Filed as v1.4 ship-blocker todo `2026-07-13-import-second-attempt-no-confirm-popup.md` (resolves_phase 48).

## Summary

total: 6
passed: 3
issues: 2
pending: 0
skipped: 1 (covered-by-absence)
blocked: 0

## Gaps

### GAP-45-01: text-then-heading renders literal in read mode (pipeline divergence)
status: diagnosed
severity: major
surface: `assets/md-render.js` renderBlock — heading regex `/^(#{1,3})\s+…/` anchored at block start only
diagnosis: a `#`/`##`/`###` line directly after a text line (no blank line before it) falls through to the
  paragraph branch and renders literally with `<br>`s. The PDF parser (`pdf-export.js` parseMarkdown)
  terminates paragraph collection at heading lines, so the SAME note renders real headings in the PDF —
  a cross-pipeline divergence of exactly the class the 45-05 agreement corpus exists to prevent (the
  corpus covers text-then-LIST but missed text-then-HEADING). Repro'd by Ben with screenshots; the
  blank-line workaround is the block boundary. The heading-remainder recursion re-enters renderBlock, so
  one split also fixes `### X` after text inside a heading's body remainder (Ben's image 2).
fix_direction (agreed with Ben 2026-07-13): split text-then-heading inside a block exactly like the
  existing WARNING-3 text-then-list split — render leading text lines as a paragraph, recurse on the
  remainder starting at the heading line. PDF needs NO change. Extend
  `tests/45-pipeline-agreement.test.js` with text-then-heading + heading-remainder-then-heading cases so
  this divergence class is locked out.

### GAP-45-02: marker-only list lines are trailing-space-sensitive; typed lines visually disappear
status: diagnosed
severity: minor
surface: `assets/md-render.js` isListItem + `assets/pdf-export.js` parseMarkdown list regexes
  (`/^\s*(?:[-*]|\d+\.)\s+/` — requires whitespace AFTER the marker, content not required)
diagnosis: `1. ` (with an invisible trailing space) parses as an EMPTY ordered item while `1.` stays a
  paragraph line — invisible whitespace changes meaning, and consecutive such lines merge/renumber so
  typed lines appear to vanish in read mode (Ben's images 3/4). Both pipelines currently share the rule
  (no divergence) — this is a least-surprise defect, not an agreement defect.
fix_direction (Ben's explicit decision 2026-07-13, supersedes the orchestrator's tighten-to-literal
  suggestion): marker-only lines (bare `-`/`*`/`N.` with optional trailing whitespace) parse as EMPTY
  LIST ITEMS consistently in BOTH pipelines — `1.` ≡ `1. `, nothing disappears (CommonMark-aligned).
  Accepted side effect (flagged to Ben): a lone `-` used as a visual separator renders as an empty
  bullet. The `1.5 mg` guard (no whitespace after the dot ⇒ literal) is unaffected. Extend the
  agreement corpus with marker-only cases (bare and trailing-space variants, both marker types).
