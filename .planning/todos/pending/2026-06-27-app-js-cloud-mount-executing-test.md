---
created: 2026-06-27T00:00:00.000Z
title: Add an EXECUTING test for app.js cloud-button mount (mountBackupCloudButton)
area: testing
priority: low
files:
  - assets/app.js
---

## Problem

`assets/app.js`'s `mountBackupCloudButton` (called from `initCommon`) has NO executing
test. It was formerly only SHAPE-pinned by `tests/25-02-modal-structure.test.js` via
source regex — those two source-pins were removed in Phase 30 (WR-01/02 detector
hardening, commit `ac5192e`) because they were the source-slicing anti-pattern this
milestone exists to eliminate. The observable behaviour — after `initCommon` runs on a
page with `#headerActions`, a `.backup-cloud-btn` mounts into it — is now unguarded.

## Solution

Write a jsdom/vm test that boots `assets/app.js`, provides a `#headerActions` element,
runs `initCommon` (or calls `App.mountBackupCloudButton()`), and asserts a
`.backup-cloud-btn` is mounted into `#headerActions` (and the double-mount guard holds).
Mirror the real-page boot pattern used by the 30-* characterization tests
(`tests/_helpers/` jsdom env). The detector (`30-fake-test-detector`) will require it to
genuinely execute, not source-slice.

## Origin

Surfaced during Phase 30 detector hardening (2026-06-27). LOW priority: app.js is NOT in
Phase 31's refactor scope (only `settings.js` + `add-session.js`), so the mount is not at
risk now. Best folded into the future broader app.js coverage work (ROADMAP "Codebase
Health II" outlook). See the `30-REVIEW.md` resolution log.
