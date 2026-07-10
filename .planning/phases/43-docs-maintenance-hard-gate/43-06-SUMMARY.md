---
phase: 43-docs-maintenance-hard-gate
plan: 06
subsystem: docs-gate
tags: [docs-gate, ci, git-trailers, changelog, help, fail-closed]
requires:
  - scripts/lib/role-table.js
  - scripts/lib/invariants.js
  - scripts/lib/help-loader.js
  - tests/docs-gate.test.js
provides:
  - scripts/docs-gate.js (the one shared, fail-closed docs-rot gate; `--range <A..B>`)
affects:
  - 43-07 (pre-push shim + deploy.yml CI both invoke `node scripts/docs-gate.js --range <computed>`)
tech-stack:
  added: []
  patterns:
    - "Two-phase gate: invariants-first (own repo) → push-range rule (target repo)"
    - "Trailers read via git %(trailers:key=…,valueonly,only), never a body regex"
    - "PASS-path output to stdout, BLOCK-path output to stderr (fail-closed exit 1)"
key-files:
  created:
    - scripts/docs-gate.js
  modified: []
decisions:
  - "Invariants run against the gate's OWN repo (real repo), the push-range rule against the TARGET repo (cwd git root) — in the hook/CI these are the same repo; only the synthetic fixture makes them differ, and the fixture has no HELP-MAP.md / denylist files, so invariants can only be meaningful against a real corpus."
  - "The covers[] reverse index is read via helpLoader.loadWindow (needs only HELP_CONTENT_EN), NOT loadHelpContentEN (which also requires HELP_DEEPLINKS) — the reverse index needs sections + covers[] only, so a minimal corpus is judged identically."
  - "Changelog-Unaffected is a GLOBAL waiver (any non-empty value waives the changelog demand for the whole push); Help-Unaffected is per-file (names files + a mandatory reason)."
  - "Emergency-skip banner and stale/inherited notes on the PASS path print to stdout because a successful run's stderr may be discarded by the caller."
metrics:
  duration: ~25min
  tasks: 2
  files: 1
  completed: 2026-07-10
status: complete
---

# Phase 43 Plan 06: docs-gate.js — the shared fail-closed gate Summary

Built `scripts/docs-gate.js`, the single implementation the local pre-push hook and the CI deploy step both invoke as `node scripts/docs-gate.js --range <A..B>`. It runs the four docs invariants first (fail-closed), then the push-range rule — classifying every changed path, demanding a changelog edit and per-file help coverage for each user-facing change, honouring the three git trailers — and it turns 43-01's RED behavior test GREEN (17/17).

## What was built

- **Two-phase gate.** PHASE 1 runs `invariants.checkHelpMapFresh/checkCoversExist/checkChangelogSchema/checkRoleTable` against the gate's own repo and exits 1 with a loud banner on any breach (D-17: CI gets the invariants for free). PHASE 2 resolves the TARGET repo root from cwd via `git rev-parse --show-toplevel`, reads `<root>/assets`, and applies the range rule.
- **Range rule.** `git diff --name-only <range>` → classify via `role-table.js`. Triggers demand: a changelog edit (satisfier) or a `Changelog-Unaffected:` waiver; and per-file help coverage — a help-content edit (for covered files) or a `Help-Unaffected: <files> — <reason>` trailer (covered or uncovered). Uncovered watched files block with covers[]/Help-Unaffected guidance (D-12 anti-rot).
- **Trailers via git's parser.** All three trailers are read with `%(trailers:key=…,valueonly,only)`, never `--grep`/body regex — a `Help-Unaffected` line inside a fenced code block does NOT satisfy the gate (decoy case GREEN). `Help-/Changelog-Unaffected` are honoured from any commit in the range; `Docs-Emergency-Skip` is honoured ONLY on the range TIP, and an inherited (non-tip) skip is ignored AND reported by short-sha (OD-4).
- **Release moment (GATE-04).** An `APP_VERSION` change across the range (diffed from `git show <base|tip>:assets/version.js`) demands a changelog entry for exactly that version with non-empty highlights + a date; `origin:true` tolerated.
- **Fail-closed (D-04).** Any throw/parse error in the range rule is caught and exits 1 with a clean one-line reason (never a raw stack, which the test treats as a crash, not a verdict).

## Exact help-block failure-message shape (requested by the plan output)

For a covered file changed with the changelog satisfied but no help edit and no trailer (`node docs-gate.js --range origin/main..HEAD`, exit 1, to stderr):

```
============================================================
  DOCS GATE BLOCKED — user-facing changes need docs updates
  range: origin/main..HEAD

  • Help: assets/app.js is documented by help topic "topic-app" (The app basics)
      but no help edit accompanies it. Edit that topic in assets/help-content-en.js,
      or add a trailer:
        Help-Unaffected: assets/app.js — <reason>

  Help-Unaffected: <files> — <reason>   waives the help demand for those files.
  Changelog-Unaffected: <reason>        waives the changelog demand for this push.
============================================================
```

The banner names each changed file and the claiming topic id + title, then prints the Help-Unaffected escape line (D-13).

## Verification

- `node -c scripts/docs-gate.js` valid; `node scripts/docs-gate.js --range HEAD~1..HEAD` returns a deterministic verdict (exit 0 on the live repo, 0 watched files).
- `node tests/docs-gate.test.js` — **17 passed, 0 failed** (the RED→GREEN falsifiability proof, D-21): every block case blocks, every pass case passes, all three trailers flip a block to a pass, the multi-file/stale/empty-reason cases behave, the tip-only emergency skip and inherited-skip cases behave, and the release branch behaves per GATE-04.
- `npm test` — **166 passed, 0 failed** (full suite stays green).

## Deviations from Plan

None as auto-fixes to product behavior. During Task 2 the first test run surfaced two implementation bugs in the new file, fixed inline against the test spec (the spec is the specification; it was not weakened):

1. **[Rule 1 - Bug] covers-index loader required an absent global.** `buildCoversIndex` used `helpLoader.loadHelpContentEN`, which internally asserts `window.HELP_DEEPLINKS` — the minimal fixture corpus does not define it, so every range-rule case failed closed with "could not read the help corpus". Fixed by reading the reverse index via `helpLoader.loadWindow(dir, ['i18n-en.js','help-content-en.js'])` and taking `window.HELP_CONTENT_EN` directly (the reverse index needs sections + covers[] only, never the deeplink table). File: scripts/docs-gate.js.
2. **[Rule 1 - Bug] PASS-path banner/warnings went to stderr and vanished.** The emergency-skip banner and the stale-declaration warning printed to stderr, but a successful (exit 0) child's stderr is discarded by the test harness's `execFileSync` capture, so the loud notices were invisible on the PASS path. Fixed by emitting PASS-path banner/warnings/notes to stdout (BLOCK-path output stays on stderr, which is captured on throw). File: scripts/docs-gate.js.

Both fixes were made to the new gate script only, before its first commit; they are noted here for the record rather than as post-commit deviations.

## Known Stubs

None. The gate reads live git + the target corpus; no hardcoded/placeholder data paths.

## Self-Check: PASSED

- FOUND: scripts/docs-gate.js
- Behavior test GREEN (17/17), full suite GREEN (166/0)
