---
phase: 32-readme-code-comments
reviewed: 2026-06-29T04:03:51Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - .github/workflows/deploy.yml
  - assets/add-session.js
  - assets/export-modal.js
  - assets/settings-photos.js
  - assets/settings-snippets.js
  - assets/settings.js
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 32: Code Review Report

**Reviewed:** 2026-06-29T04:03:51Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 32 is a documentation/comment-only phase. I independently verified the
claimed scope before reviewing for substance:

- **Five `assets/*.js` files** — a comment-stripped diff against base `bb7d022`
  shows **zero executable-line changes**. Every delta is a comment edit: new
  file-header banners plus de-phasing of build-history references
  (`D-04`, `D-06`, `D-16`, `D-30`, `T-22-06-02`, `Phase 22/24 Plan NN`).
- **`.github/workflows/deploy.yml`** — exactly one line removed
  (`cp README.md deploy-staging/`). I confirmed no shipped file (HTML, JS,
  `manifest.json`, `sw.js` precache list) references `README.md`, so dropping it
  from the public Cloudflare Pages deploy is safe and slightly reduces internal-doc
  exposure. No finding.

Because no code executed differently, severity hinges on comment *accuracy*: a
banner that now misdescribes the code is the only defect class this phase can
introduce. I found one phase-introduced banner inaccuracy (Warning) and one
pre-existing banner inaccuracy the phase touched but did not correct (Info). No
bugs, security issues, or data-loss risks were introduced.

## Warnings

### WR-01: New `settings.js` banner lists `pickBackupFolder` as a runtime dependency it no longer calls

**File:** `assets/settings.js:22`
**Issue:** This phase added a new `DEPENDENCIES (window.* chain)` banner block to
the file header. It declares:

```
* BackupManager.{canEnableSchedule, pickBackupFolder}, CrashLog.clear, ...
```

`canEnableSchedule` and `CrashLog.clear` are genuinely invoked (lines 883 and
620/634). But `BackupManager.pickBackupFolder` has **zero call sites** in the
file — its only four occurrences (lines 22, 815, 841, 1020) are all comments, and
those comments explicitly state the folder-picker UI was *removed* and the
primitive merely "stays in backup.js (kept for any future caller)." Listing a
removed/uncalled symbol in a freshly-added DEPENDENCIES contract is misleading: a
maintainer reading the banner would reasonably believe `settings.js` drives
`pickBackupFolder`. The banner is the canonical entry point precisely so readers
trust it without grepping.

**Fix:** Drop the dead symbol from the dependency list so it reflects the actual
runtime call graph:

```js
 * DEPENDENCIES (window.* chain): App.{initCommon, t, showToast, confirmDialog},
 * PortfolioDB.{therapistSettings, getAllTherapistSettings, setTherapistSetting},
 * BackupManager.canEnableSchedule, CrashLog.clear, and the
 * "sessions-garden-settings" BroadcastChannel.
```

(If the intent is to document that the *primitive still exists in backup.js*,
keep that note where it already lives at line 1020, not in the dependency chain.)

## Info

### IN-01: `settings-snippets.js` dependency banner lists two uncalled `PortfolioDB` methods

**File:** `assets/settings-snippets.js:12-13`
**Issue:** The header declares the dependency chain
`PortfolioDB.{getSnippet, addSnippet, updateSnippet, deleteSnippet,
resetSeedSnippet, validateSnippetShape, getAllSnippets}`. Of these,
`PortfolioDB.getSnippet` and `PortfolioDB.getAllSnippets` have **zero call sites**
in the file — snippet reads go through `App.getSnippets()` (the in-memory cache,
used ~10×) instead. This inaccuracy is **pre-existing** in base `bb7d022`, not
introduced by Phase 32. However, this phase actively edited this same banner block
(de-phasing the `Phase 24 Plan 05` title and the `D-16` reference on line 72), so
correcting the two stale entries would have been a natural, low-risk part of the
same pass.

**Fix:** While the header is already being touched for de-phasing, trim the
unused methods:

```
//   window.PortfolioDB.{addSnippet, updateSnippet, deleteSnippet,
//                       resetSeedSnippet, validateSnippetShape}
//                                            — set by assets/db.js IIFE
```

---

_Reviewed: 2026-06-29T04:03:51Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
