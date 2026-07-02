---
task: 260702-bg4
subsystem: pdf-export
status: complete
tags: [pdf, severity, rtl, text-wrap, bugfix, tdd]
requirements: [QUICK-260702-bg4]
provides:
  - "drawSeverityBlock wraps issue.name to the name column with per-row dynamic height"
affects:
  - assets/pdf-export.js
key-files:
  created:
    - tests/quick-260702-bg4-pdf-severity-long-name-wrap.test.js
  modified:
    - assets/pdf-export.js
decisions:
  - "Name column width computed once per docDir (symmetric ~253pt) with a GAP gutter off the bars"
  - "Dynamic rowHeight = max(nameLines*nameLineH, two-bar) + ROW_PAD; single-line reduces to the historical 44pt (no golden-baseline regression)"
metrics:
  duration: ~15min
  tasks: 2
  files: 2
  completed: 2026-07-02
commits:
  - 708133c: "test(260702-bg4): failing behavior test (RED)"
  - a5eef6f: "fix(260702-bg4): wrap long severity name + dynamic per-row height (GREEN)"
---

# Quick Task 260702-bg4: PDF Severity Section — Long Emotion Name Wrap Summary

Fixed the PDF export "Severity — before & after" section so a long emotion name
(`issue.name`) now WRAPS inside its name column instead of drawing straight
across / under the fixed before-after bar unit — the reported overlap is gone, in
both LTR and RTL, with the full name text preserved (no truncation, ellipsis, or
font shrinking).

## What Changed

`drawSeverityBlock()` was the ONLY section in `assets/pdf-export.js` that drew
text at a bare anchor with no width constraint; every other section wraps via
`doc.splitTextToSize`. Because the before/after bar unit sits at a fixed x
hugging the trailing edge, a long name overran into it.

The fix (Task 2):
- Compute `nameColW` once per docDir (symmetric, ~253pt both directions), leaving
  a `GAP` gutter so wrapped lines never touch the bars.
- Wrap the logical name with `doc.splitTextToSize(String(issue.name || ''), nameColW)`
  and draw one baseline per wrapped line (`rowTop + 10 + nl * nameLineH`),
  top-aligned to the bar unit. The bar-unit slot math and `drawBar` are untouched.
- Replace the module-scope fixed `rowHeight` with a per-row dynamic value:
  `Math.max(nameLines.length * nameLineH, BAR_LINE_H * 2) + ROW_PAD`, fed into the
  existing `ensureRoom()` page-break check and the `y = rowTop + rowHeight` advance.
  A single-line name gives `max(16, 32) + 12 = 44pt`, byte-identical to the prior
  fixed height — so single-line rows and the golden-baseline PDFs are unaffected.

## TDD RED → GREEN Evidence

Task 1 authored a falsifiable behavior test using the shared `jsdom-pdf-env`
`{ onJsPDF }` hook to spy on each jsPDF instance's own `text` method, recording
per draw `{ str, x, y, size, style, w }`. Name lines are isolated as normal-weight
11.5pt draws at the per-docDir name anchor (`nameX`); the fixture uses a
heading-only markdown so no 11.5pt body paragraph collides.

**RED (against unfixed code)** — gates A (`>=2 wrapped baselines`) and B (`no name
line crosses the bar-unit edge`) genuinely FAILED in both LTR and RTL:

```
--- LTR name lines ---
  y=300 x=71 w=436.5 str="Persistent overwhelming anticipatory performance anxiety and dread before sessions"
[FAIL] A[RED] LTR: found 1 name baseline(s); expected >= 2
[FAIL] B[RED] LTR: name line right edge 507.5 crosses the bar unit at 330
--- RTL name lines ---
  y=300 x=524 w=359.7 str="דימתמ ... הדרח"
[FAIL] A[RED] RTL: found 1 name baseline(s); expected >= 2
[FAIL] B[RED] RTL: name line left edge 164.3 crosses the bar unit far edge at 265
Passed 3/7, Failed 4/7.   (exit 1)
```

**GREEN (after fix)** — all 7 checks pass; the name wraps to 2 lines each way,
no line crosses the bar-unit edge, full text preserved, and row 2 sits below
row 1's last wrapped line:

```
--- LTR name lines ---
  y=300 x=71 w=190.0 str="Persistent overwhelming anticipatory"
  y=316 x=71 w=243.6 str="performance anxiety and dread before sessions"
[PASS] A/B/C LTR
--- RTL name lines ---
  y=300 x=524 w=240.5 str="םייתרבח םישגפמ ינפל דחוימב הזעו תכשמתמ הדרח"
  y=316 x=524 w=116.4 str="דימתמ הוולנ ץחלו םילודג"
[PASS] A/B/C RTL
[PASS] D LTR: row 2 ("Anger") sits below row 1's last wrapped name line (gap >= 16)
Passed 7/7, Failed 0/7.   (exit 0)
```

The run executed all 7 assertions with visible per-check output (no
hang-then-exit / false-GREEN — the known jsdom-PDF incident was watched for).

## No Regressions

- `node tests/34-severity-bars.test.js` — 3/3 pass (severity signature,
  proportional widths, flat-fill determinism).
- `node tests/34-severity-unmeasured.test.js` — 2/2 pass (`–` vs `0` handling).
- `npm test` — **119 passed / 0 failed** (was 118 + the new bg4 file). Golden
  baseline PDF suite unaffected — the single-line dynamic height reduces to the
  existing 44pt. No test was weakened.

## Deviations from Plan

None — plan executed exactly as written. The only production file changed is
`assets/pdf-export.js`; the other file is the new behavior test.

## Threat Flags

None — no new network, storage, or eval surface. Name width is bounded by
`nameColW` and height by `nameLines.length * nameLineH`; `splitTextToSize` is a
single bounded pass, and pagination stays bounded by `ensureRoom` (T-bg4-01
mitigated by construction). No new dependencies (T-bg4-02).

## Self-Check: PASSED

- FOUND: tests/quick-260702-bg4-pdf-severity-long-name-wrap.test.js
- FOUND: fix (`splitTextToSize(String(issue.name`) in assets/pdf-export.js @ a5eef6f
- FOUND: commit 708133c (RED test)
- FOUND: commit a5eef6f (GREEN fix)
