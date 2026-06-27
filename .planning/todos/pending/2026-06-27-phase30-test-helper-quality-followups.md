---
created: 2026-06-27T00:00:00.000Z
title: Phase 30 test-helper quality/robustness follow-ups (WR-06 + 4 info)
area: testing
priority: low
files:
  - tests/_helpers/app-stub.js
  - tests/_helpers/base64-codec.js
  - tests/30-fake-test-detector.test.js
---

## Problem

Non-blocking quality/robustness findings from the Phase 30 code review
(`.planning/phases/30-test-harness-coverage/30-REVIEW.md`). No current incorrectness;
the verifier judged these low Phase-31 risk. Deferred so the milestone could proceed.

- **WR-06** — `app-stub.refreshSnippetCache` and the snippet tests rely on mutable
  `global.PortfolioDB`, cleared only on the success/guard paths (leak risk between tests).
  `tests/_helpers/app-stub.js:185-199`, `tests/30-snippet-wiring.test.js`,
  `tests/30-snippet-import-merge.test.js`.
- **IN-01** — Inconsistent top-level error handling across the test IIFEs.
- **IN-02** — `base64-codec.partToBuffer` comment says "copy" but returns a shared view
  (`tests/_helpers/base64-codec.js:45-48`).
- **IN-03** — Fake-test-detector ALLOWLIST keyed by exact basenames is silently fragile
  (`tests/30-fake-test-detector.test.js:73-78`).
- **IN-04** — `base64-codec.FileReader` only implements `readAsDataURL`; a future adapter
  change (`readAsArrayBuffer`/`onloadend`) would HANG rather than fail clearly
  (`tests/_helpers/base64-codec.js:69-99`).

## Solution

Most are mechanical — sweep with `/gsd-code-review 30 --fix --all` in a fresh context,
then skim the commits. IN-04 + IN-03 are small hardening additions (throw on an
unsupported FileReader method; make allowlist drift loud). Exact line refs + suggested
fixes are in `30-REVIEW.md`.

## Origin

Phase 30 gap-closure code review (2026-06-27). WR-01/02/05 + the 25-02 source-slice
cleanup from the same review were already resolved test-first; these are the remaining
low-risk items, captured so they are not forgotten.
