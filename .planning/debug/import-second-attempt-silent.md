---
status: awaiting_human_verify
trigger: "Second backup import after a restore silently fails — confirm popup never opens (v1.4 ship blocker, resolves_phase 48; todo .planning/todos/pending/2026-07-13-import-second-attempt-no-confirm-popup.md)"
created: 2026-07-22
updated: 2026-07-22
---

## Symptoms

DATA_START
- **Expected**: After a successful backup import/restore, a second import attempt behaves like the first — file browser opens, file selected, the confirm-import dialog (backup.confirmReplace) appears, restore proceeds.
- **Actual**: Second import attempt is a silent no-op — file browser opens, file is selected, the confirm-import popup never appears. No error, no toast, nothing in the UI.
- **Errors**: None visible. Console not captured at repro time.
- **Timeline**: Found 2026-07-13 during Phase 45 UAT on the pre-prod PWA (macOS, build a33d8dc). Pre-existing — Phase 45 touched neither backup.js nor settings.js (verified via git at triage time). Unknown when introduced.
- **Reproduction** (Ben, real device, macOS pre-prod PWA):
  1. Import/restore a `.sgbackup` — succeeds.
  2. Attempt a SECOND import: file browser opens, file selected → confirm popup never appears. Silent no-op.
  3. Hard refresh did NOT heal it.
  4. Navigating between screens ~10 times eventually healed it (import then worked).
DATA_END

## Context from orchestrator's initial code read (verify, don't trust)

- Import wiring lives in `assets/backup-modal.js` — a file the todo's hypothesis list misses (it names backup.js:401-402, but those lines are the PASSPHRASE modal inputs, not the file input).
- Flow: `#backupModalImportInput` change (backup-modal.js:412) → `openImportFlow(file)` (:298) → `App.confirmDialog({messageKey:'backup.confirmReplace'})` (:310) → `BM.importBackup(file)` (:318).
- The input's value is reset only AFTER `openImportFlow`'s promise resolves (backup-modal.js:414) — a hanging promise would leave the value set, so same-file reselection fires no `change` event (silent no-op). But a hang should be healed by hard refresh, which contradicts repro fact 3.
- `App.confirmDialog` (app.js:1061-1065) silently resolves `false` when `#confirmModal` is missing from the DOM — a silent-cancel path.
- `#confirmModal` is static markup in all five pages (index, settings, add-client, add-session, report). `#backupModal` is static on index.html but INJECTED (appendChild to body) on other pages → on non-index pages the injected backup modal sits AFTER #confirmModal in DOM order; both are `.modal` — check z-index/stacking: the confirm dialog may open UNDERNEATH the still-open backup modal (invisible = "never appears").
- On restore success: non-index pages schedule `location.reload()` after 600ms; index.html registers `window.__afterBackupRestore` (overview.js) and refreshes in place — no reload.
- Hard-refresh immunity suggests non-DOM persistent state (SW cache mix / localStorage / sessionStorage / IndexedDB / window.name) — but no single theory yet fits all four repro facts. Note: in this PWA a hard refresh does NOT bypass the service worker (project memory), so "hard refresh didn't heal" is weaker evidence than it looks — the SAME cached assets are re-served.
- `window.name === 'demo-mode'` guard exists in openImportFlow (:303) but shows a toast, not silent.
- backup-modal.js is newer than the original overview.js-only wiring ("Before this module, the modal markup lived only in index.html and its handlers only in overview.js") — check git history: which module versions were in build a33d8dc, and whether the current main differs.

## Current Focus

CONFIRMED: mechanism A. A jsdom harness driving the REAL backup-modal.js proves the silent
no-op is only reachable when the post-restore `refresh` promise fails to settle.

reasoning_checkpoint:
  hypothesis: "openImportFlow gates `importInput.value = ''` (and closeBackupModal/finalize) behind the post-restore `refresh` promise (window.__afterBackupRestore → loadOverview, the index.html-only in-place path). When that promise does not settle promptly — loadOverview stalling on a contended IndexedDB right after the restore's clearAll + bulk writes — the file input's value is never cleared, so re-selecting the SAME .sgbackup fires no `change` event and the confirm popup never appears (silent no-op). Every other page calls location.reload() after restore, which resets the input — which is exactly why the bug is index.html-only."
  confirming_evidence:
    - "Harness scenario C (hanging refresh, 2nd attempt SAME file): attempt1 leaves inputValueCleared=false, backupModalClosed=false; attempt2 changeFired=false, confirmCalled=0 → exact silent no-op reproduced through the real code."
    - "Harness scenarios A/B (normal refresh): 2nd attempt ALWAYS shows the popup (same OR different file) — there is NO bug in the second-attempt path itself; the failure requires a non-settling refresh."
    - "Harness scenario D (hanging refresh, DIFFERENT file): popup appears — a different file heals it (change fires because value differs), matching that only same-file reselection is silent."
    - "backup-modal.js:414 clears importInput.value ONLY inside .then() after openImportFlow settles; openImportFlow:331-337 runs closeBackupModal only inside refresh.then()."
  falsification_test: "If, after eagerly resetting importInput.value in the change handler, harness scenario C (hanging refresh, same file) still shows confirmCalled=0, the fix is wrong. (Verified: post-fix it shows POPUP APPEARS.)"
  fix_rationale: "Decouple the input-value reset from the refresh promise: reset importInput.value = '' immediately in the change handler (capturing the File first). This makes a same-file reselection always re-fire `change` regardless of whether the in-place refresh settles — addressing the root cause (finalization coupled to a promise that can hang), not the symptom."
  blind_spots: "Repro fact 3 (hard refresh did not heal) is not reproduced by the harness — it depends on the real PWA/IndexedDB wedge persisting across reloads, which the debug file already flags as unreliable evidence (a PWA hard-refresh does not re-execute cleanly the way a browser reload does). The harness does not reproduce WHAT makes loadOverview stall (the IDB contention) — only that a stalled refresh is the sole path to the symptom. The fix makes the second attempt robust to the stall but does not itself un-wedge a genuinely stuck IndexedDB (a separate, deeper concern)."

test: DONE — harness scenario C flipped to POPUP APPEARS; regression test proven falsifiable; suite 206/206.
expecting: —
next_action: AWAITING HUMAN VERIFY — Ben confirms the second import now shows the confirm popup on the real pre-prod PWA. On "confirmed fixed": archive to resolved/, append knowledge-base entry, then commit (code + docs) per Ben's push preference. A changelog entry will be needed before the next push (backup-modal.js is a watched shipped-code file → docs-gate).

deferred_observation (surface to Ben, not in scope of this fix): under a genuinely hanging in-place refresh the backup modal also stays OPEN (closeBackupModal is still gated behind the same refresh promise at openImportFlow:331-337). The reported symptom (silent second attempt) is fixed regardless, but if desired, a follow-up could run closeBackupModal + finalize on import SUCCESS and let the in-place refresh run fire-and-forget. Not done here to keep the fix minimal and preserve the GAP-1 in-place re-render contract.

## Evidence

- timestamp: 2026-07-22 (initial gather)
  checked: backup-modal.js change→openImportFlow→confirmDialog chain + git history
  found: (1) Line 414 clears `importInput.value=''` ONLY inside `.then()` after openImportFlow's promise SETTLES. If the promise hangs, value stays set → reselecting the SAME file fires no `change` event → silent no-op. (2) openImportFlow's success path (line 318-338) shows the success toast FIRST (319), THEN awaits `refresh` (the `__afterBackupRestore` hook or a deferred reload), THEN closeBackupModal. So a hanging hook leaves the modal open + input value set + no error. (3) backup-modal.js unchanged since d0f1195 (well before build a33d8dc 2026-07-13); overview.js `__afterBackupRestore` last touched e2dcc85 (Phase 37). Bug is pre-existing, consistent with triage note.
  implication: The silent no-op has two candidate mechanisms both consistent with "no toast/no error": (A) same-file reselection fires no change event because value never cleared (promise hang in refresh); (B) confirmDialog returns Promise.resolve(false) silently because #confirmModal is missing → line 317 `if(!confirmed) return` is silent. Need to discriminate.

- timestamp: 2026-07-22
  checked: App.confirmDialog (app.js:1061) + __afterBackupRestore (overview.js:163)
  found: confirmDialog re-queries #confirmModal by ID and re-binds listeners on EVERY call (1062, 1155-1158), so orphaned listeners are NOT the failure mode — only an actually-missing #confirmModal yields the silent false. __afterBackupRestore runs App.setLanguage → App.applyTheme → renderGreeting → loadOverview() (IndexedDB read) → renderLastBackupSubtitle, returning that promise chain. This IS the `refresh` promise openImportFlow awaits — if loadOverview hangs on a wedged IndexedDB, the whole chain hangs (mechanism A). Index.html uses this in-place path (no reload); other pages location.reload() after 600ms.
  implication: On index.html (overview) the second-attempt failure would persist because there's no reload to reset input value / rebind. On reload pages it would self-heal. Points investigation at the index.html/overview in-place path.

- timestamp: 2026-07-22 (jsdom reproduction harness — real backup-modal.js)
  checked: Built a jsdom harness loading the REAL assets/backup-modal.js against an index.html-like DOM (static #backupModal + static #confirmModal), a faithful App.confirmDialog (mirrors app.js:1061 — re-queries #confirmModal, returns Promise.resolve(false) if missing else shows + resolves), a BM.importBackup stub, and the index.html in-place window.__afterBackupRestore hook. Drove change→openImportFlow→confirmDialog→import→refresh→close for TWO consecutive attempts across four scenarios.
  found: Under a NORMAL (resolving) refresh the second attempt ALWAYS shows the confirm popup — same file (A) or different file (B), inputValueCleared=true after attempt 1. Under a HANGING refresh (C): attempt 1 leaves inputValueCleared=FALSE and backupModalClosed=FALSE (modal stuck open); attempt 2 with the SAME file → changeFired=FALSE, confirmCalled=0 → SILENT NO-OP (exact symptom). Under a hanging refresh with a DIFFERENT file (D) the popup appears (change fires because value differs). So the silent no-op is reachable through the real code ONLY when the post-restore refresh promise does not settle, and ONLY on same-file reselection.
  implication: Mechanism A confirmed and mechanism B falsified — with #confirmModal present (as on index.html static markup) confirmDialog always shows; the silent path is NOT confirmDialog returning false, it is the `change` event never firing because importInput.value was never cleared. Root cause is the coupling of importInput.value reset (backup-modal.js:414) and closeBackupModal (openImportFlow:336) to the refresh promise. Fix: reset importInput.value eagerly in the change handler.

## Eliminated

(recovered from an interrupted investigation cycle — re-verify if load-bearing)
- `settings.js` has NO separate import wiring — `backup-modal.js` is the sole import path. Rules out a second/competing handler on the settings page.
- `sessionStorage` is used only by tour/attention code, NOT the import flow — rules out a persistent "import-in-progress" flag surviving hard refresh via sessionStorage.
- `lockBodyScroll` is not a broken counter, and modals are centered `position:fixed`, so a stuck body-scroll lock cannot hide the confirm dialog off-screen. RE-VERIFIED 2026-07-22: lockBodyScroll/unlockBodyScroll (app.js:1697/1707) are a class-toggle (is-modal-open) + body.top offset, NOT a counter — cannot hide a position:fixed centered dialog.
- MECHANISM B (confirmDialog silently resolves false because #confirmModal missing) — FALSIFIED by the jsdom harness: with #confirmModal present (as it always is on index.html static markup) the confirm popup shows on every attempt under a normal refresh. confirmDialog also re-queries #confirmModal and re-binds on every call (app.js:1062,1155), so orphaned listeners are not a factor.
- MECHANISM B-variant (confirm dialog stacked UNDER the open backup modal → invisible) — does not discriminate first vs second attempt: the backup modal is open during confirmDialog on BOTH attempts, and on index.html both modals are static with fixed DOM order, so stacking would affect the (working) first attempt identically. Not the cause.
- MECHANISM A via applyTranslations orphaning the change listener — FALSIFIED: applyTranslations (app.js:23) only sets el.textContent on [data-i18n] nodes; it never replaces nodes or sets innerHTML, so the import input's change listener survives the GAP-1 in-place re-render.

## Resolution

root_cause: openImportFlow (assets/backup-modal.js) resets the file input's value and closes/finalizes the modal ONLY after the post-restore `refresh` promise settles. On index.html the refresh is the in-place `window.__afterBackupRestore` hook (overview.js:163 → loadOverview, an IndexedDB read) — no page reload. When loadOverview stalls right after the restore's clearAll + bulk writes, the refresh promise does not settle, so `importInput.value = ''` (backup-modal.js:414) never runs. Re-selecting the SAME .sgbackup then fires no `change` event, so openImportFlow is never called and the confirm popup never appears — a silent no-op. All other pages call location.reload() after restore, which resets the input; that is why the bug is index.html-only. (Confirmed by a jsdom harness against the real code: silent no-op reproduces ONLY under a non-settling refresh, ONLY on same-file reselection.)
fix: assets/backup-modal.js change handler (formerly :412-415) now resets `importInput.value = ''` IMMEDIATELY (capturing the File first), then calls openImportFlow(file) — decoupling the input reset from the post-restore refresh promise. A same-file reselection therefore always re-fires `change` regardless of whether the in-place refresh settles. Minimal, targeted; does not alter the confirm/import/refresh pipeline itself.
verification: (1) jsdom harness against the real backup-modal.js — scenario "hanging refresh + same file" flipped from SILENT NO-OP (confirmCalled=0) to POPUP APPEARS (confirmCalled=1); all four scenarios pass. (2) New regression test tests/48-import-second-attempt-reselect.test.js pins the behaviour and was proven falsifiable — it FAILS on the pre-fix (gated-reset) code and PASSES on the fix. (3) Full suite: 206 passed, 0 failed (was 205; +1 new test). NOTE: not yet field-verified by Ben on the real pre-prod PWA (awaiting human confirm).
files_changed:
  - assets/backup-modal.js (import change handler — eager input-value reset)
  - tests/48-import-second-attempt-reselect.test.js (new regression test)
