---
status: fixing
trigger: "Phase 34 test-infra defect: buildSessionPDF never resolves under jsdom harness; pdf-* gates silently exit 0 with 0 bytes (false-green)"
created: 2026-06-29T22:19:20Z
updated: 2026-06-29T22:19:20Z
---

## Current Focus

reasoning_checkpoint:
  hypothesis: "buildSessionPDF never resolves under tests/_helpers/jsdom-pdf-env.js because ensureDeps() calls loadScriptOnce('./assets/jspdf.min.js') which, finding no matching <script> tag, APPENDS a <script src> and awaits its onload. jsdom (no resource loader) never fires onload/onerror, so the ensureDeps promise never settles. Node's event loop then empties (nothing pending) and the process exits 0 with 0 bytes written -> false-green gate."
  confirming_evidence:
    - "Instrumented appendChild probe (scratchpad/probe-hang.js): the FIRST and ONLY appended script before timeout is .../assets/jspdf.min.js; build never resolves even with window.IconLogoBase64 pre-defined."
    - "buildSessionPDF body grep: the only async op is `return ensureDeps(opts).then(...)`; everything after is synchronous ending in doc.output('blob')."
    - "loadScriptOnce only short-circuits on an existing <script> tag, NOT on the already-present global; harness eval's libs as globals but injects no <script> stubs."
    - "Running pdf-digit-order against PRE-Phase-34 pdf-export.js (parent of 50804d4) ALSO exits 0 / 0 bytes -> inertness predates 34 (regressed at 543d138, test(30-03) migration that dropped <script> stub injection). 34-06 added a 5th, guarded icon step; not the hang."
  falsification_test: "If loadScriptOnce short-circuits on the present global and the build then resolves to a >1KB Blob with PASS/FAIL stdout, the hypothesis holds. If it still hangs, another await exists."
  fix_rationale: "Make loadScriptOnce resolve synchronously when the dependency's global is already on window (jspdf/bidi/Heebo/HeeboBold/IconLogoBase64). It never appends an unresolvable <script>. Production first-export lazy-load path (global absent -> append+await onload in a real browser) is preserved unchanged. Harness also eval's icon-512-base64.js so the logo XObject is emitted."
  blind_spots: "Whether the now-live digit-order/glyph/bold gates pass is a separate question (real RTL/glyph/bold invariants). The fix only un-inerts them; if they fail that is a real 34-06/34-07 regression to report, not to mask."

## Symptoms

expected: "Harness-built PDF tests (pdf-digit-order, pdf-glyph-coverage, pdf-bold-rendering, pdf-latin-regression) run and print PASS/FAIL (>0 bytes)."
actual: "Each exits 0 with ZERO stdout (false-green); they validate nothing."
errors: "none emitted — silent 0-byte exit"
reproduction: "JSDOM_PATH=... node tests/pdf-digit-order.test.js | wc -c -> 0"
started: "latent since 30-03 (543d138); surfaced during Phase 34 logo work"

## Evidence

- timestamp: 2026-06-29T22:19:20Z
  checked: "instrumented appendChild + 5s race on buildSessionPDF (scratchpad/probe-hang.js)"
  found: "only script appended = assets/jspdf.min.js; TIMEOUT; never resolves"
  implication: "hang is the first loadScriptOnce in ensureDeps, not the icon"
- timestamp: 2026-06-29T22:19:20Z
  checked: "pdf-digit-order vs pre-34 pdf-export.js (parent of 50804d4)"
  found: "exit 0, 0 output bytes"
  implication: "inert before Phase 34; root cause = harness/loadScriptOnce, not 34-06"

## Resolution

root_cause: "loadScriptOnce appends a <script> and awaits onload (never fires in jsdom) instead of short-circuiting on the already-present global; harness provides globals via eval but no <script> stubs -> ensureDeps promise never settles -> buildSessionPDF never resolves -> node exits 0/0-bytes (false-green)."
fix: "(1) pdf-export.js: loadScriptOnce(src, isReady) resolves synchronously when isReady() global check is true; ensureDeps passes a global predicate per dep; icon step short-circuits on window.IconLogoBase64 and never appends an unresolvable external script. (2) jsdom-pdf-env.js: eval assets/branding/icon-512-base64.js into the window so IconLogoBase64 is present."
verification: "Full suite 108 passed / 4 failed (112). The 4 failures are exactly the expected-owner list (pdf-latin-regression=baseline break/34-10; 34-rtl-newblocks & 34-severity-bars=34-09; 34-save-before-export=34-08). Standalone: pdf-digit-order 4/4, pdf-glyph-coverage 3/3, pdf-bold-rendering 9/9, pdf-bidi 12/12, 30-issue-delta 7/0, 34-logo-embed 3/3 — all GREEN with >0 bytes. RTL/glyph/bold invariants genuinely preserved. pdf-latin-regression now RED via pure SHA-256 baseline mismatch (deliberate)."
files_changed:
  - "assets/pdf-export.js"
  - "tests/_helpers/jsdom-pdf-env.js"
