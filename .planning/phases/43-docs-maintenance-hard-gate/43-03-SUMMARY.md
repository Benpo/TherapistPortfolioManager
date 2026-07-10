---
phase: 43-docs-maintenance-hard-gate
plan: 03
subsystem: docs-rot-gate
tags: [help-content, reverse-index, docs-gate, tooling]
status: complete
requires:
  - "43-02: scripts/lib/help-loader.js (shared vm-sandbox loader — input substrate)"
provides:
  - "HELP-MAP.md: repo-root reverse index (section -> topic -> title -> covers[])"
  - "scripts/gen-help-map.js: write + check modes; checkMap() reusable by 43-05 freshness invariant"
  - "backfilled EN covers[] (page scripts + module owners + vendor bundles)"
affects:
  - "43-04: he/de/cs covers[] parity (this plan touched EN only)"
  - "43-05: freshness invariant #1 requires gen-help-map.js checkMap(); invariant #2 asserts covered paths exist"
tech-stack:
  added: []
  patterns:
    - "one generator, two modes (write/check) — freshness invariant requires the check path, no re-implementation"
    - "canonicalized markdown generation (LF, single trailing newline, covers[] sorted within row, document order preserved)"
key-files:
  created:
    - HELP-MAP.md
    - scripts/gen-help-map.js
  modified:
    - assets/help-content-en.js
    - .gitignore
decisions:
  - "settings-photos.js assigned to topic-client-photo (the photos-feature topic) rather than a generic settings topic — the reverse index answers 'which help might need updating when this module changes', and the photos help is the honest owner."
  - "gen-help-map.js added to .gitignore whitelist (!scripts/gen-help-map.js) alongside the existing docs-gate.js exception — it is docs-rot gate tooling the 43-05 invariant calls, so it must be version-controlled."
metrics:
  tasks: 2
  files-changed: 4
  completed: 2026-07-10
---

# Phase 43 Plan 03: Backfill covers[] + generate HELP-MAP.md Summary

Backfilled the EN help topics' `covers[]` with the scripts behind already-covered pages and obvious module owners (metadata only, no prose), then generated a freshness-checked repo-root `HELP-MAP.md` from that post-backfill index — both landed in one commit so the D-17 #1 freshness invariant is never transiently red.

## What Was Built

**Task 1 — covers[] backfill (D-19, metadata only).** Extended `covers[]` on nine existing EN topics in `assets/help-content-en.js`. No new topic, no body prose, no `{ui:}` token changes; he/de/cs untouched (that is 43-04). The uncovered EN set of covered pages shrank to the by-design residual.

Backfill assignments (path → topic):

| Added path | Topic | Rationale |
|------------|-------|-----------|
| `assets/add-client.js` | topic-first-client | page script of add-client.html |
| `assets/add-session.js` | topic-new-session | page script of add-session.html |
| `assets/sessions.js` | topic-past-sessions | page script of the sessions.html list view |
| `assets/report.js` | topic-report-problem | page script of report.html |
| `assets/settings-session-types.js` | topic-session-formats | settings module — custom session types |
| `assets/settings-photos.js` | topic-client-photo | photos-feature module owner (see Decisions) |
| `assets/date-format.js` | topic-date-format | the canonical calendar-date engine |
| `assets/jspdf.min.js`, `assets/bidi.min.js` | topic-single-export | vendor bundles behind PDF export |
| `assets/jszip.min.js` | topic-backup-restore | vendor bundle behind backup zip |

**Task 2 — generator + map.** Created `scripts/gen-help-map.js` reusing `scripts/lib/help-loader.js` for input. It builds one row per topic (`| Section | Topic | Title | Covers |`), sections/topics in document order, `covers[]` sorted within each row, LF endings, exactly one trailing newline (RESEARCH §Q-I). Two modes: WRITE (default) and CHECK (`--check` — regenerate to a string and `===` compare, print fix instructions and exit non-zero on mismatch). The compare is exported as `checkMap()` so the 43-05 freshness invariant requires this one implementation. Ran it in WRITE mode to produce `HELP-MAP.md` (34 topic rows) from the post-backfill covers[].

## Watched code files uncovered by design (trailer-cost residual)

Per D-12 (accepted cost) / OD-1 WATCH-CODE-ONLY, files with no obvious help owner stay uncovered and cost one trailer per edit — they were NOT forced into an unrelated topic: `assets/app.js`, `assets/i18n-*.js`, `assets/shared-chrome.js`, `assets/tour.js`, `assets/whats-new.js`, `assets/changelog.js`, `assets/reporting.js`, `assets/help.js`, and CSS files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `.gitignore` blocked the required generator artifact**
- **Found during:** Task 2 commit — `scripts/*` is gitignored (only `scripts/lib/` and `scripts/docs-gate.js` whitelisted), so `git add scripts/gen-help-map.js` was silently refused and the first commit landed without it.
- **Fix:** Added `!scripts/gen-help-map.js` to `.gitignore`, directly under the existing `!scripts/docs-gate.js` exception whose comment already reserves the whitelist for "docs-rot gate tooling ... version-controlled". The generator's check mode is exactly that (the 43-05 invariant calls it), so the exception matches existing intent.
- **Files modified:** `.gitignore`
- **Commit:** 63ac5ca (amended the coherent Task 1+2 commit so all four files land together — the covers[] edit and its regenerated map must not split across commits)

## `.gitattributes` note

No `.gitattributes` exists in the repo. Per the plan, one was NOT created — the `HELP-MAP.md text eol=lf` CRLF insurance is skipped. Ben is on macOS (LF native), so drift risk is low; if a `.gitattributes` is ever added, that line should be included then.

## Verification

- Task 1 verify: every covered path exists on disk; `add-session.js` / `sessions.js` / `date-format.js` present in the index — `OK covers 33`.
- `node tests/help-integrity.test.js` — 12 passed, 0 failed (EN covers[] still non-empty per topic).
- Task 2 verify: `node scripts/gen-help-map.js && node scripts/gen-help-map.js --check && test trailing-newline` — `MAP-FRESH-OK`.
- Post-commit re-check: `node scripts/gen-help-map.js --check` — fresh (committed map == regen).

## Self-Check: PASSED
- FOUND: HELP-MAP.md
- FOUND: scripts/gen-help-map.js
- FOUND: assets/help-content-en.js (modified)
- FOUND: commit 63ac5ca (all four files)
