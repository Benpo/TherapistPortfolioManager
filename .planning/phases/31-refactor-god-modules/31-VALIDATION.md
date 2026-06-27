---
phase: 31
slug: refactor-god-modules
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-27
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> This phase is a **behavior-preserving move**, so the validation contract is unusual: the *existing* green suite is the primary net, and Wave 0 adds characterization tests only where the net is thin (per RESEARCH.md §Validation Architecture, D-03/D-06/D-09).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Plain Node `assert` + jsdom real-page harness (no Jest/Mocha) |
| **Config file** | `package.json` (`"test": "node tests/run-all.js"`); runner `tests/run-all.js` |
| **Quick run command** | `node tests/<file>.test.js` (single file, exit 0/1) |
| **Full suite command** | `npm test` (discovers all `tests/*.test.js`, one child process each; fails if any fail) |
| **Estimated runtime** | ~full suite is fast enough to run after every commit (it is the contractual gate) |

> **Load-bearing mechanic (RESEARCH.md Pitfall):** tests load source by **hardcoded filename** — `win.eval(readAsset('assets/settings.js'))`. There is **no `<script>`-tag auto-discovery**. Every extraction needs a companion test-loader-update task or the suite goes false-red (code not loaded) or false-green (hook-guarded test no-ops).

---

## Sampling Rate

- **After every task commit (per extracted unit, D-06):** Run `npm test` (full suite — fast, and it is the contractual gate). Commit only when green.
- **After every Wave 0 cleanup (RFCT-03):** run the new characterization test red→green first, then `npm test`.
- **Before `/gsd-verify-work`:** Full suite green **plus** the D-08 manual UAT smoke-test of the 3 extracted features **plus** D-09 architect sub-agent sign-off.
- **Max feedback latency:** one full `npm test` run per atomic move.

---

## Per-Task Verification Map

> Extraction-level map from RESEARCH.md §Validation Architecture. The planner refines these into per-task rows ({N}-PP-TT) during planning; every extraction task must point at the protective test(s) below, and every test that evals the origin file must gain a companion `win.eval` of the new file.

| Extraction / Cleanup | Wave | Requirement | Protective test(s) (real, executing) | Net verdict | Status |
|----------------------|------|-------------|----------------------------------------|-------------|--------|
| SnippetsUI → `settings-snippets.js` | move | RFCT-01 | `30-snippet-wiring`, `30-snippet-import-merge`, `24-04-trigger-regex`, `24-05-*` (via `Snippets.__testExports` + `window.__SnippetEditorHelpers` @settings.js:863) | STRONG / LOW | ⬜ pending |
| Photos/StorageUsage (2 IIFEs) → `settings-photos.js` | move | RFCT-01 | `30-photos-optimize-loop`, `25-07-delete-all-photos`, `25-12-optimize-*`, `25-12-photos-usage-language-rerender` (hooks `__PhotosTabHelpers` @2545, `__photosOptimizeResultTimer`) | STRONG / LOW-MED | ⬜ pending |
| Export-modal + md builders → `export-modal.js` | move | RFCT-02 | `30-export-markdown`, `30-export-stepper`, `30-field-copy`, `30-issue-delta`, `quick-260522-iwr-ordered-list-export` (full real DOM `.click()` wiring) | STRONG / MED (closure mechanics) | ⬜ pending |
| `openDB()` connection pooling | 0 | RFCT-03 | **NEW** `31-openDB-pooling` (cached-connection lifecycle — 4 asserts) | net thin → Wave 0 | ⬜ pending |
| `overview.js` innerHTML+i18n hardening | 0 | RFCT-03 | **NEW** `31-overview-render-hardening` (view-button + empty-state render) | net thin → Wave 0 | ⬜ pending |
| `sessions.js` innerHTML+i18n hardening | 0 | RFCT-03 | **NEW** `31-sessions-render-hardening` (file has 0 tests today) | net absent → Wave 0 | ⬜ pending |
| `var`→`const`/`let` (settings.js 403, db.js 10) | with move | RFCT-03 | existing suite (convert only inside moved regions; `npm test` after each batch) | covered | ⬜ pending |
| Tagged `catch` logging (touched silent catches) | with move | RFCT-03 | existing suite (additive; assert nothing thrown) | covered | ⬜ pending |
| Glue dedupe (`t`/`showToast`/`getCurrentLang`→`App.*`, settings.js ~937–978) | with move | RFCT-03 | existing suite, net-verified (D-04); keep wrapper + note on divergence | covered | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Tests/fixtures to create or fix **BEFORE** the moves (characterization-test-before-move, D-03/D-06):

- [ ] `tests/31-openDB-pooling.test.js` — characterize the cached-connection lifecycle. **Highest priority; RFCT-03's only runtime-lifecycle change.** Assert (observable only, never internal `_dbPromise`): (a) repeated `openDB()` returns a working handle (a `getAll` succeeds); (b) after `onversionchange`→close, next `openDB()` yields a **fresh working** handle (cache invalidated); (c) concurrent `openDB()` calls don't double-open/double-seed; (d) `migrateOldDB` side-effect runs once.
- [ ] `tests/31-overview-render-hardening.test.js` — characterize `overview.js` view-button (line ~510) + empty-state (`overview.sessions.none`, ~456) render **before** the innerHTML→textContent/DOM swap.
- [ ] `tests/31-sessions-render-hardening.test.js` — characterize `sessions.js` view-button render (~line 147) **before** change; file has 0 tests today.
- [ ] **Fix** `tests/25-11-toast-behavior.test.js` — add `EXPECTED_COUNT = 5` (close WR-05 vacuous-green hole) **before** the Photos extraction.
- [ ] **Per-extraction test-loader updates (mechanical, not new files):** add `win.eval(readAsset('assets/<new-file>'))` to every test that evals the origin file. Enumerate with `grep -rl "assets/settings.js" tests/*.test.js` (~30) and `grep -rl "assets/add-session.js" tests/*.test.js` (~14); only the `win.eval(readAsset(...))` lines need editing. **Without this, every move goes false-red or false-green.**

---

## Manual-Only Verifications

Per D-08 — a short human smoke-test of the 3 extracted features is a phase gate ON TOP of green `npm test` (the phase premise is "no observable change," and Phase 30 found leaf-level coverage had been over-credited):

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Snippets CRUD + import/export with collisions | RFCT-01 | observable UI behavior; backstops residual net gaps | Open Settings → Snippets: create/edit/delete a snippet; import a file that collides → exercise REPLACE and MERGE |
| Photos optimize / delete-all | RFCT-01 | observable UI + storage-usage line | Settings → Photos: run "optimize all"; confirm savedBytes/usage line updates; delete-all |
| Export-modal stepper 1→2→3 + preview + PDF/MD/share | RFCT-02 | hardest extraction (closure-captured state); end-to-end UX | add-session → export: walk stepper 1→2→3; confirm preview; export PDF, copy MD, share |

---

## Validation Sign-Off

- [ ] All extraction tasks point at a named protective test; all RFCT-03 cleanups have a Wave 0 characterization test or are suite-covered
- [ ] Sampling continuity: `npm test` green after every atomic per-unit commit (D-06)
- [ ] Wave 0 covers all net-thin references (openDB pooling, overview/sessions hardening, toast EXPECTED_COUNT, test-loader updates)
- [ ] No watch-mode flags
- [ ] Feedback latency = one full `npm test` per move
- [ ] `nyquist_compliant: true` set in frontmatter (after planner maps every task)

**Approval:** pending
