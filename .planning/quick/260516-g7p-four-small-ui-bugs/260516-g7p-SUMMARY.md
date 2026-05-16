---
phase: quick-260516-g7p
plan: 01
subsystem: sessions-garden-app
tags: [ui-fix, snippets, seed-data, overview-filter, save-flow, i18n, tdd]
requires: []
provides:
  - "Post-save redirect to the saved session in reading mode"
  - "Snippet expansion in the export modal's live editor"
  - "Corrected unreceived-effort/love seed English word order"
  - "Actionable missing-birth-year warning (click-to-filter)"
affects:
  - assets/add-session.js
  - add-session.html
  - assets/snippets-seed.js
  - assets/overview.js
  - index.html
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/i18n-de.js
  - assets/i18n-cs.js
tech-stack:
  added: []
  patterns:
    - "Pure module-level predicate as single source of truth shared by banner count + filter"
    - "Idempotent defensive Snippets.bindTextarea() call (belt-and-suspenders)"
    - "window.__OverviewTestHooks exposes DOM-free helpers for falsifiable behavior tests"
key-files:
  created:
    - tests/quick-260516-g7p-save-returns-to-session.test.js
    - tests/quick-260516-g7p-export-editor-snippets.test.js
    - tests/quick-260516-g7p-missing-birth-filter.test.js
  modified:
    - assets/add-session.js
    - add-session.html
    - assets/snippets-seed.js
    - assets/overview.js
    - index.html
    - assets/i18n-en.js
    - assets/i18n-he.js
    - assets/i18n-de.js
    - assets/i18n-cs.js
decisions:
  - "Bug #4 reuses the existing client-table filter pipeline (lower risk, discoverable) rather than a new modal/list"
  - "Single missing-birth predicate clientMissingBirth() shared by banner count and filter guarantees filtered count == warned count"
metrics:
  duration: 18min
  completed: 2026-05-16
---

# Phase quick-260516-g7p: Four Small UI Bugs Summary

Fixed four independent Sessions Garden UI friction points — post-save
navigation, export-editor snippet expansion, mislabeled seed text, and an
undiscoverable missing-birth warning — each in its own atomic commit with a
falsifiable behavior test for the three runtime-behavior changes.

## Commits (one per bug)

| Bug | Commit | Message |
|-----|--------|---------|
| #1 | `416cdd7` | fix(quick-260516-g7p): return to session reading mode after save |
| #2 | `4984ab6` | fix(quick-260516-g7p): enable snippet expansion in export modal editor |
| #3 | `362b66d` | fix(quick-260516-g7p): correct word order in unreceived-effort/love seed text |
| #4 | `f13e4a9` | fix(quick-260516-g7p): make missing-birth warning filter the client table |

## Root Cause + Fix Per Bug

### Bug #1 — Save returned to the overview homepage
- **Root cause:** the `sessionForm` submit handler's post-save navigation
  was a hardcoded constant `window.location.href = "./index.html"` — never
  a function of which session was saved.
- **Fix:** capture the saved id (`PortfolioDB.addSession(...)`'s return for
  new sessions, `editingSession.id` for existing) into `savedId`; redirect
  to `./add-session.html?sessionId=${savedId}`, which auto-enters reading
  mode via the existing read-mode load path (no new read-mode code). The
  `formSaving` guard and ~600ms toast timing are unchanged. The
  delete-session flow (`./sessions.html`) is untouched.
- **Test:** `tests/quick-260516-g7p-save-returns-to-session.test.js` — a
  source-contract model proving the redirect target is a FUNCTION of the
  saved id (two ids ⇒ two URLs), not the homepage constant. RED before
  (5 fails), GREEN after (6 pass).

### Bug #2 — Snippets dead in the export modal's live editor
- **Root cause:** `window.Snippets.init()` binds only
  `textarea[data-snippets="true"]` at DOMContentLoaded; the export modal's
  `#exportEditor` lacked that attribute (the 7 session-form textareas have
  it), so it was never wired.
- **Fix:** (1) added `data-snippets="true"` to `<textarea id="exportEditor">`;
  (2) `openExportDialog()` defensively calls
  `window.Snippets.bindTextarea(editor)` — idempotent (guarded by Snippets'
  internal `_bound` WeakMap), belt-and-suspenders against future modal
  re-rendering. `snippets.js` unchanged.
- **Test:** `tests/quick-260516-g7p-export-editor-snippets.test.js` — a
  vm-sandbox loads the real `snippets.js`; a BOUND textarea expands
  `;betrayal ` while an UNBOUND one does not (proves binding is causal),
  plus structural/contract gates. RED before (2 fails), GREEN after (5 pass).

### Bug #3 — Mislabeled seed snippet text (data-only)
- **Root cause:** the two English seed expansions led with "Unreceived
  Effort" / "Unreceived Love" — wrong word order for the intended
  "X unreceived" reading.
- **Fix:** reordered ONLY the two leading English words before the ` — `
  em-dash: "Effort Unreceived — …" and "Love Unreceived — …". Spelling,
  ids (`seed.unreceived-effort` / `seed.unreceived-love`), triggers,
  em-dash, the rest of the paragraph, and the he/cs/de expansions are
  unchanged — seed migration idempotency preserved (4 id/trigger tokens
  intact). No behavior test (static seed text, per
  MEMORY:feedback-behavior-verification); grep gates green.

### Bug #4 — Undiscoverable missing-birth-year warning
- **Root cause:** the banner showed a count but offered no action.
- **Chosen approach:** reuse the EXISTING client-table filter pipeline
  (lower risk, discoverable) rather than a new modal/list. A "Show them"
  button inside `#missingBirthBanner` toggles a module-level
  `_missingBirthFilterActive` flag honored by one extra predicate in the
  existing `applyFiltersAndSort()` filter. The predicate
  `clientMissingBirth(c)` (`!c.birthDate && !c.age`) is now the SINGLE
  source of truth, reused by `updateMissingBirthBanner` too — so the
  filtered set is guaranteed to equal the warned count. Clicking filters
  the table, updates the Clear button, and scrolls the list into view;
  Clear Filters resets the flag. New i18n key
  `overview.missingBirth.showThem` added to en/de/he/cs.
- **Test:** `tests/quick-260516-g7p-missing-birth-filter.test.js` —
  pure-helper vm sandbox via `window.__OverviewTestHooks`: inactive ⇒ all;
  active ⇒ filtered count == banner count == exactly the missing clients;
  clear ⇒ all. RED before (hook absent, exit 1), GREEN after (4 pass).

## Deviations from Plan

None — plan executed exactly as written. The plan's grep gate for Bug #3
("`seed.unreceived-effort|seed.unreceived-love == 4`") refers to total token
occurrences (2 ids + 2 triggers); confirmed via `grep -o` (4 tokens), while
`grep -c` reports 2 lines because each `rec(...)` has id+trigger on one line.
No behavior change — gate intent (ids/triggers preserved) satisfied.

## Notes

- Each commit auto-bumped `sw.js` CACHE_NAME via the pre-commit hook
  (cached asset *contents* changed; no precached URL changed) — no manual
  CACHE_NAME chore follow-up needed, consistent with
  MEMORY:reference-pre-commit-sw-bump (sw.js was not in any source diff).
- No Lemon Squeezy code touched.
- Regression-checked related pre-existing suites (24-05-list-filter,
  24-05-modified-seed, 24-04-seed-pack, 24-04-trigger-regex,
  25-10-snippets-sentinel-roundtrip, 25-11-i18n-parity) — all pass.

## Known Stubs

None.

## Self-Check: PASSED

- All 3 created test files exist on disk.
- SUMMARY.md exists at the specified path.
- All 4 per-bug commits (416cdd7, 4984ab6, 362b66d, f13e4a9) exist in git.
