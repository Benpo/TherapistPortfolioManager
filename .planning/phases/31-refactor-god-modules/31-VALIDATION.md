---
phase: 31
slug: refactor-god-modules
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-27
planned: 2026-06-27
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

| Extraction / Cleanup | Plan / Wave | Requirement | Protective test(s) (real, executing) | Net verdict | Status |
|----------------------|------|-------------|----------------------------------------|-------------|--------|
| SnippetsUI → `settings-snippets.js` | 31-03 / W2 | RFCT-01 | `30-snippet-wiring`, `30-snippet-import-merge`, `24-04-trigger-regex`, `24-05-*` (via `Snippets.__testExports` + `window.__SnippetEditorHelpers` @settings.js:863) | STRONG / LOW | ⬜ planned |
| Photos/StorageUsage (2 IIFEs) → `settings-photos.js` | 31-04 / W3 | RFCT-01 | `30-photos-optimize-loop`, `25-07-delete-all-photos`, `25-12-optimize-*`, `25-12-photos-usage-language-rerender` (hooks `__PhotosTabHelpers` @2545, `__photosOptimizeResultTimer`) | STRONG / LOW-MED | ⬜ planned |
| Export-modal + md builders → `export-modal.js` | 31-05 / W4 | RFCT-02 | `30-export-markdown`, `30-export-stepper`, `30-field-copy`, `30-issue-delta`, `quick-260522-iwr-ordered-list-export` (full real DOM `.click()` wiring) | STRONG / MED (closure mechanics) | ⬜ planned |
| `openDB()` connection pooling | 31-01 / W1 | RFCT-03 | **NEW** `31-openDB-pooling` (cached-connection lifecycle — 4 asserts; deadlock-safe ordering) | net thin → Wave 0 | ⬜ planned |
| `overview.js` innerHTML+i18n hardening | 31-02 / W1 | RFCT-03 | **NEW** `31-overview-render-hardening` (view-button + empty-state render) | net thin → Wave 0 | ⬜ planned |
| `sessions.js` innerHTML+i18n hardening | 31-02 / W1 | RFCT-03 | **NEW** `31-sessions-render-hardening` (file has 0 tests today) | net absent → Wave 0 | ⬜ planned |
| `var`→`const`/`let` (settings.js 403, db.js 10) | 31-01/03/04 | RFCT-03 | existing suite (convert only inside moved/touched regions; `npm test` after each batch) | covered | ⬜ planned |
| Tagged `catch` logging (touched silent catches) | 31-01/03/04/05 | RFCT-03 | existing suite (additive; assert nothing thrown) | covered | ⬜ planned |
| Glue dedupe (`t`/`showToast`/`getCurrentLang`→`App.*`, settings.js ~937–967, inside snippets region) | 31-03 | RFCT-03/D-04 | existing suite, net-verified (D-04); keep wrapper + note on divergence | covered | ⬜ planned |
| `:2071` phase-number log-string fix (D-05) | 31-05 | RFCT-03/D-05 | existing suite (string-only; behavior unchanged) | covered | ⬜ planned |

*Status: ⬜ planned · ✅ green · ❌ red · ⚠️ flaky*

> **Plan→test Nyquist mapping complete (planner, 2026-06-27).** Every extraction/cleanup task in plans 31-01..31-06 points at a named protective test above; every test that loads an origin file gains a companion loader of the new file. `nyquist_compliant: true` set in frontmatter.

---

## Wave 0 Requirements

Tests/fixtures to create or fix **BEFORE** the moves (characterization-test-before-move, D-03/D-06):

- [ ] `tests/31-openDB-pooling.test.js` — characterize the cached-connection lifecycle. **Highest priority; RFCT-03's only runtime-lifecycle change.** Uses a STRENGTHENED IDB shim (NOT the 24-04 no-op `close(){}`/empty-`databases()` shim): `close()` sets a `_closed` flag and `transaction()`/`getAll()` throw `InvalidStateError` when closed, and `indexedDB.open` is instrumented with a call counter. Assert (observable only, never internal `_dbPromise`): (a) repeated `openDB()` returns a working handle (a `getAll` succeeds); (b) after `onversionchange`→close, an op on the cached handle THROWS InvalidStateError AND the next `openDB()` does exactly ONE fresh open (post-close count delta == 1) yielding a working handle — falsifiable: goes RED if `_dbPromise = null` is dropped from either `onversionchange` or `onerror`; (c) with the legacy `emotion_code_portfolio` DB STAGED PRESENT via `databases()` (so migrateOldDB does NOT short-circuit at db.js:64 and the recursive `await openDB()` at db.js:67 actually runs), concurrent `openDB()` calls don't double-open/double-seed and don't deadlock (run-all 120s/SIGKILL catches a regression); (d) `migrateOldDB` side-effect runs once.
- [ ] `tests/31-overview-render-hardening.test.js` — characterize `overview.js` view-button (line ~510) + empty-state (`overview.sessions.none`, ~456) render **before** the innerHTML→textContent/DOM swap.
- [ ] `tests/31-sessions-render-hardening.test.js` — characterize `sessions.js` view-button render (~line 147) **before** change; file has 0 tests today.
- [x] **`tests/25-11-toast-behavior.test.js` `EXPECTED_COUNT = 5` — ALREADY PRESENT** (live-source verified at :355 + guard at :604; the WR-05 fix landed already). Plan 31-04 Task 3 only VERIFIES it (no duplicate add).
- [ ] **Per-extraction test-loader updates (mechanical, not new files):** add a load of `assets/<new-file>` to every test that LOADS the origin file. **Corrected enumeration (live-source, the research's ~30/~14 counted comment mentions):** exactly **7** test files `win.eval` settings.js (`30-backups-helper-gate`, `30-settings-save-failed-toast`, `30-settings-tabnav`, `30-snippet-import-merge`, `30-settings-saved-notice`, `30-settings-section-roundtrip`, `30-snippet-wiring`) and the photos tests load it via **`vm.runInContext`** (`30-photos-optimize-loop`); exactly **9** test files `win.eval` add-session.js. Only the tests that EXERCISE the moved code need the new-file load (plans 31-03/04/05 add it where `npm test` goes red, never blindly to all). **Note the `captured.length===5`/`captured[1]` guard** in `30-snippet-wiring` + `30-snippet-import-merge`: plan 31-03 replaces it with an extraction-robust delta-capture so the later Photos move needs no re-edit. **Without these loader updates, every move goes false-red or false-green.**

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

- [x] All extraction tasks point at a named protective test; all RFCT-03 cleanups have a Wave 0 characterization test (31-01, 31-02) or are suite-covered
- [x] Sampling continuity: `npm test` green after every atomic per-unit commit (D-06) — encoded in each extraction plan's Task-3 verify + done
- [x] Wave 0 covers all net-thin references (openDB pooling → 31-01; overview/sessions hardening → 31-02; toast EXPECTED_COUNT already present → verified in 31-04; test-loader updates → per-extraction Task 3)
- [x] No watch-mode flags
- [x] Feedback latency = one full `npm test` per move
- [x] `nyquist_compliant: true` set in frontmatter (planner mapped every task → protective test)

**Approval:** planner-complete 2026-06-27 (pending plan-checker → D-09 architect sub-agent → Ben)
