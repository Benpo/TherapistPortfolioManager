---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 12
type: execute
wave: 3
depends_on: ["22-11"]
files_modified:
  - assets/backup.js
  - assets/overview.js
  - assets/app.js
  - assets/add-session.js
autonomous: true
gap_closure: true
requirements: [REQ-18, REQ-20]
must_haves:
  truths:
    - "Pressing Cancel on the backup-export passphrase prompt aborts the export entirely — no .zip and no .sgbackup file is downloaded, regardless of where the user clicks (X, Cancel button, Escape key, overlay)."
    - "Pressing Skip Encryption still produces an unencrypted .zip backup (existing behaviour preserved)."
    - "Pressing Encrypt and Save still produces an encrypted .sgbackup backup (existing behaviour preserved)."
    - "A reusable `App.installNavGuard({trigger, isDirty, message, destination, onConfirm?})` helper exists in `assets/app.js` and any future caller can guard a navigation trigger by calling it once with no edits to the helper's source."
    - "The Phase 22 wiring uses `App.installNavGuard` exactly once — for the Settings gear icon — with the add-session/edit-session form-dirty predicate as `isDirty`. Clicking the gear icon while inside an in-progress edit-session form with unsaved changes shows a confirm dialog asking the user to confirm leaving; cancelling stays on the session, confirming navigates to settings.html."
    - "Clicking the Settings gear icon when the session form is in read-only mode (or has no unsaved changes) navigates to settings immediately without a guard."
  artifacts:
    - path: "assets/backup.js"
      provides: "Three-outcome passphrase modal: Encrypt | Skip | Cancel — Cancel returns a distinct sentinel that overview.js uses to abort"
      contains: "_showPassphraseModal"
    - path: "assets/overview.js"
      provides: "Cancel-aware export click handler that does not fall through to unencrypted export when user cancelled"
      contains: "exportEncryptedBackup"
    - path: "assets/app.js"
      provides: "Reusable App.installNavGuard helper (chrome-level navigation guard) consumed once by the Settings gear icon wiring"
      contains: "installNavGuard"
  key_links:
    - from: "passphrase modal Cancel button"
      to: "exportEncryptedBackup resolve sentinel 'cancel'"
      via: "distinct onCancel callback (NOT the same as onSkip)"
      pattern: "onCancel"
    - from: "overview.js export click handler"
      to: "regular exportBackup() call"
      via: "ONLY when result === false (skip), NOT when result === 'cancel' or null"
      pattern: "encrypted === false"
    - from: "settings-gear-btn click"
      to: "App.installNavGuard → App.confirmDialog (leave page warning) → navigation"
      via: "single call to App.installNavGuard with the gear link as trigger and window.PortfolioFormDirty as isDirty"
      pattern: "installNavGuard"
---

<objective>
Close 2 UAT gaps that are both data-safety guards (one is a privacy blocker, one is a workflow data-loss preventer).

Gap A (BLOCKER, Test 4): The Cancel button on the export-encryption prompt currently downloads an unencrypted backup ZIP because the modal's Cancel callback maps to the same handler as Skip Encryption. A therapist who reconsiders mid-flow ends up with a plaintext copy of all client data in their Downloads folder.

Gap B (MAJOR, general/phase-22-related): Clicking the Settings gear icon while inside an edit-session with unsaved changes silently throws away those changes. The window.beforeunload guard exists for full page unload but the gear icon's <a href="./settings.html"> uses standard browser navigation that fires beforeunload — yet the user gets a generic browser-default prompt at best, often suppressed entirely on same-origin navigation in Chromium. The fix is an explicit click-time confirm using App.confirmDialog so the wording is friendly and the choice is consistent.

**Per product decision D3**, Gap B's implementation is shaped as a generic, reusable navigation-guard helper rather than a one-off click handler. The helper (`App.installNavGuard`) lives in `assets/app.js` (chrome-level concern) and is wired exactly once in this plan — for the gear icon. Future call sites (brand-link, add-client, etc.) can register their own guards in 1–2 lines without touching the helper's source. The genericity is the prep for Ben's future audit; the audit itself is out of scope for this plan.

Purpose: Therapist-data integrity. The app must never silently disclose data (Gap A) or destroy in-progress work (Gap B). And it must do so via a building block that supports the future navigation-guard audit.

Output: Updated assets/backup.js (3-outcome passphrase modal: encrypt | skip | cancel), assets/overview.js (treat cancel as "do nothing"), assets/app.js (reusable App.installNavGuard helper + single call site for the gear icon), and assets/add-session.js (exposes window.PortfolioFormDirty + bypass flag for the guard to consume).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-HUMAN-UAT.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-07-backup-restore-roundtrip-SUMMARY.md
@assets/backup.js
@assets/overview.js
@assets/app.js
@assets/add-session.js

## Source-of-truth UAT entries (truth -> fix)

These two truth lines from 22-HUMAN-UAT.md Gaps section are the ONLY gaps this plan closes:

1. (BLOCKER, test: 4) "Cancel button on the export-encryption prompt aborts the export — no backup file is downloaded"
2. (MAJOR, test: general, scope: phase-22-related) "Settings gear icon is guarded against navigation away from an in-progress session — at minimum when the session form is in edit mode with unsaved changes, the user is asked to confirm before navigating"

## Existing implementation reference

### Gap A — Passphrase modal cancel bug

In assets/backup.js _showPassphraseModal (L117-272):
- The modal has THREE buttons: dismissBtn (top-right X-style + bottom Cancel button) at L187-195, cancelBtn ("Skip encryption" / "Go back") at L197-201, confirmBtn ("Encrypt and save" / "Decrypt") at L203-208.
- BUG SOURCE: Both dismissBtn (L191-194) AND cancelBtn (L263-266) call `opts.onCancel()`. There is no distinction.
- The X close button at L131-134 also calls `opts.onCancel()`. Same alias.

In assets/backup.js exportEncryptedBackup (L477-504):
- onConfirm path: encrypts ZIP and downloads as .sgbackup, resolves(true).
- onCancel path: resolves(false).
- This means BOTH Cancel and Skip Encryption resolve to false. The caller cannot tell them apart.

In assets/overview.js export click handler (L66-90):
- Receives `var encrypted = await BackupManager.exportEncryptedBackup();`
- If `encrypted === false`, it calls `BackupManager.exportBackup()` and downloads the unencrypted .zip.
- This is the bug: Cancel returns false → unencrypted export fires.

The fix: split the modal's cancel/skip semantics into TWO distinct callbacks (onCancel for "abort entire flow", onSkip for "do unencrypted export"). Update exportEncryptedBackup to resolve with a 3-state value. Update overview.js to act on each distinctly.

The .sgbackup decrypt path in importBackup (L533-560) ALSO uses `opts.onCancel: function() { resolve(null); }` — that import path is fine as-is (cancel during import correctly aborts; null is filtered upstream by `if (err === null) return;`). DO NOT change the import-side cancel behaviour. The fix is ONLY in the export path.

### Gap B — Navigation guard helper (generic) + gear-icon wiring (single call site)

In assets/app.js initSettingsLink (L291-337):
- L297-299: creates `<a href="./settings.html" class="header-control-btn settings-gear-btn">`.
- It is a plain anchor. Clicks navigate via the browser default; no JS click handler intercepts.

In assets/add-session.js:
- L5: `let formDirty = false;` (module-scoped variable).
- L60-62: input/change listeners set formDirty = true.
- L63-67: window.addEventListener("beforeunload") — preventDefault if formDirty && !formSaving. This works for tab-close and refresh, but for same-origin navigation via <a href> the dialog may be suppressed by Chromium and is not friendly worded.
- formDirty is module-scoped and not exposed to other scripts.

Per product decision D3, the implementation shape is: a reusable helper `App.installNavGuard` lives in `assets/app.js` and is called ONCE in this plan for the gear icon. The helper:
1. Accepts an options bag whose public API is locked (see Task 3 Step A).
2. Reads dirty state via the caller-provided `isDirty` predicate (the gear-icon call passes `() => window.PortfolioFormDirty?.() === true`).
3. Intercepts clicks on the configured trigger; if dirty, awaits `App.confirmDialog` with caller-supplied i18n keys; on confirm, sets the bypass flag (so beforeunload doesn't double-prompt) and navigates to the configured destination; on cancel, stays put.
4. Returns an unregister function so callers can tear down the guard if the trigger is destroyed.

OUT OF SCOPE per Ben (D3): brand-link, language popover, theme toggle, add-client, and any other navigation triggers. Ben confirmed the language switcher and theme toggle do not switch screens (they are in-place toggles), so they don't need the guard regardless. The brand-link and add-client paths currently rely on the browser's native beforeunload prompt; Ben will audit those separately later using `installNavGuard` as the building block. Do NOT add tasks for those call sites in this plan. The genericity of the helper IS the prep — that prep is the deliverable.

## Risk callouts

Risk 1 (Gap A) — Backward compatibility of the resolve sentinel:
- exportEncryptedBackup currently resolves with `true` (encrypted) or `false` (skip). Changing it to also resolve with `'cancel'` (string) breaks any caller that does `if (encrypted)` (truthy check). Audit: only overview.js calls exportEncryptedBackup. It uses `if (encrypted === false)` (strict equality). After change to `'cancel'`, that strict check still does what we want — `'cancel' === false` is false, so the unencrypted fallback does NOT fire. Safe.
- For maximum clarity, RESOLVE shape will be: `true` (encrypted, downloaded), `false` (user pressed Skip Encryption), `'cancel'` (user pressed Cancel/X/Escape — abort). overview.js needs to handle all three.

Risk 2 (Gap A) — Three-button UX in passphrase modal:
- Current modal already has dismissBtn AND cancelBtn AND confirmBtn — three buttons exist. The bug is only that dismissBtn and cancelBtn share the same callback. We're not adding a fourth button — we're separating two existing semantics.
- Visually, dismissBtn and the X close button at the top should both mean "abort"; cancelBtn (currently labelled "Skip encryption") keeps its existing label and meaning.
- BUT: the existing dismissBtn currently has its label come from `_t('backup.passphrase.cancel')` (L190). That key may not exist in i18n files (Plan 19 introduced this modal but the i18n inventory should be checked). If missing, the rendered label is the literal key string, which the user reports seeing. The Cancel button IS visible; the user clicks it; data leaks. Confirm `backup.passphrase.cancel` exists in all 4 i18n files; if not, add it (en: "Cancel" / de: "Abbrechen" / he: "ביטול" / cs: "Zrušit").

Risk 3 (Gap B) — Beforeunload AND click-confirm both firing:
- The existing window.addEventListener("beforeunload") in add-session.js ALSO fires when the gear-icon link triggers same-origin nav. If `installNavGuard` ALSO shows App.confirmDialog on the click, the user could see TWO prompts (custom one, then browser-native one). Solution: when the user confirms leaving inside `installNavGuard`, set a one-shot flag like `window.PortfolioFormDirtyBypass = true` immediately before navigating; the beforeunload listener checks this flag and returns immediately if set. add-session.js's beforeunload becomes:

    window.addEventListener("beforeunload", (e) => {
      if (window.PortfolioFormDirtyBypass) return;
      if (formDirty && !formSaving) { e.preventDefault(); }
    });

  The bypass flag's name (`PortfolioFormDirtyBypass`) is shared knowledge between add-session.js and `installNavGuard`. It is referenced INSIDE the helper (so the helper sets it on confirm) — this is a deliberate coupling: the helper knows the project's bypass-flag convention. If a future caller's "dirty" semantics use a different bypass mechanism, that caller's `onConfirm` callback can do whatever extra work it needs, but the helper will always set `window.PortfolioFormDirtyBypass = true` as well (cheap; idempotent on non-session pages where the flag is unused).

Risk 4 (Gap B) — Other top-nav items remain out of scope:
- Per D3: this plan wires the guard for the gear icon ONLY. Brand-link, add-client, language popover, and theme toggle are explicitly OUT OF SCOPE. Ben confirmed language/theme are in-place toggles (no screen change) so they wouldn't benefit from a guard anyway. Brand-link and add-client will be audited later by Ben using `installNavGuard` as the building block. Do NOT add tasks for those call sites. Do NOT call `installNavGuard` more than once in this plan.

Risk 5 (Gap B) — Read-mode vs edit-mode:
- The session form starts in read mode for existing sessions and in edit mode for new sessions. The `formDirty` variable only goes true on input/change events. Existing sessions in read mode will not have formDirty set (read-mode disables inputs). So the guard naturally only fires when the form has actually been edited. Good — no need for an extra "is in edit mode" check.

Risk 6 (Gap B) — Confirm dialog wording:
- Use existing i18n keys if a "leave page" warning exists. Plan 19 may have one (license deactivation? backup discard?). Check first. If none exists, add 4 new keys: `session.leavePage.title`, `session.leavePage.body`, `session.leavePage.confirm`, `session.leavePage.cancel`. Tone for the confirm button should be `tone: 'danger'` because confirming = data loss is possible. The keys are passed to `installNavGuard` by the gear-icon call site; the helper itself accepts any i18n keys, so future callers can pass their own.

Risk 7 (Gap B) — Helper API stability:
- The public API of `App.installNavGuard` is committed in this plan. Future call sites depend on the shape `{trigger, isDirty, message, destination, onConfirm?}` — changing it later breaks them. Document the API in a code comment block at the helper definition (one short paragraph + the param shape) so it's discoverable from the source. This is the only docstring this fix gets, per project convention.

Risk 8 — Wave/sequencing (parallel-execution i18n conflict):
- This plan now sits at wave 3 and depends on 22-11 because all three Phase 22 gap-closure plans (22-10, 22-11, 22-12) touch the same 4 i18n files (assets/i18n-{en,de,he,cs}.js). Running them in parallel would conflict on those shared files. The chain is 22-10 → 22-11 → 22-12. Do NOT start this plan until 22-11 has landed all of its commits.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Split passphrase modal Cancel from Skip Encryption (Gap A part 1)</name>
  <files>assets/backup.js, assets/i18n-en.js, assets/i18n-de.js, assets/i18n-he.js, assets/i18n-cs.js</files>
  <action>
Step A — Verify and add backup.passphrase.cancel i18n key.

Run: grep -n "backup.passphrase.cancel" in each of assets/i18n-{en,de,he,cs}.js. If MISSING in any of them, append:

en: "backup.passphrase.cancel": "Cancel",
de: "backup.passphrase.cancel": "Abbrechen",
he: "backup.passphrase.cancel": "ביטול",
cs: "backup.passphrase.cancel": "Zrušit",

(Match the existing file's accent encoding pattern for cs.)

Also ensure the inline fallback object in backup.js _t (L98-114) includes:

    'backup.passphrase.cancel': 'Cancel',

Add this line inside the existing fallbacks object.

Step B — Add a third callback `onSkip` to _showPassphraseModal opts.

In assets/backup.js _showPassphraseModal (L117), the opts argument currently accepts `{mode, onConfirm, onCancel}`. EXTEND the contract to ALSO accept `onSkip`. Documentation comment update at L118:

    // opts: { mode: 'encrypt'|'decrypt', onConfirm: fn(passphrase), onCancel: fn(), onSkip?: fn() }
    // For encrypt mode: onCancel = abort; onSkip = continue without encryption.
    // For decrypt mode: only onCancel is meaningful (no skip — file is already encrypted).

In the X close button handler (L131-134), KEEP calling `opts.onCancel()` (this is "abort").

In dismissBtn handler (L187-195), KEEP calling `opts.onCancel()` (this is "abort" — the bottom Cancel button).

In cancelBtn handler (L263-266), CHANGE from calling `opts.onCancel()` to:

    cancelBtn.addEventListener('click', function() {
      cleanup();
      // For encrypt mode this button is "Skip encryption" — different semantic from Cancel.
      // For decrypt mode this button is "Go back" — alias for cancel.
      if (isEncrypt && opts.onSkip) {
        opts.onSkip();
      } else if (opts.onCancel) {
        opts.onCancel();
      }
    });

In Escape-key handler (L268-271), the current line `if (e.key === 'Escape') cancelBtn.click();` would now route to onSkip in encrypt mode — that is WRONG (Escape should mean Cancel, not Skip). Replace with explicit dismiss:

    modal.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !confirmBtn.disabled) confirmBtn.click();
      if (e.key === 'Escape') {
        cleanup();
        if (opts.onCancel) opts.onCancel();
      }
    });

Step C — Update exportEncryptedBackup to resolve with three distinct values.

In assets/backup.js exportEncryptedBackup (L477-504), replace the resolve(false) shape:

    async function exportEncryptedBackup() {
      return new Promise(function(resolve, reject) {
        _showPassphraseModal({
          mode: 'encrypt',
          onConfirm: async function(passphrase) {
            try {
              var result = await exportBackup();
              var encBlob = await _encryptBlob(result.blob, passphrase);
              var url = URL.createObjectURL(encBlob);
              var a = document.createElement('a');
              a.href = url;
              var dateStr = new Date().toISOString().slice(0, 10);
              a.download = 'sessions-garden-' + dateStr + '.sgbackup';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(function() { URL.revokeObjectURL(url); }, 10000);
              localStorage.setItem("portfolioLastExport", String(Date.now()));
              resolve(true);
            } catch (err) {
              console.error('Encrypted backup failed:', err);
              reject(err);
            }
          },
          onSkip: function() { resolve(false); },          // user pressed Skip Encryption
          onCancel: function() { resolve('cancel'); }      // user pressed Cancel / X / Escape — abort
        });
      });
    }

JSDoc update above the function:

    /**
     * Show passphrase modal, build ZIP via exportBackup(), encrypt it, download
     * as .sgbackup file.
     *
     * Returns a Promise that resolves to one of:
     *   true     — user confirmed; .sgbackup file downloaded
     *   false    — user pressed "Skip encryption"; caller should do unencrypted export
     *   'cancel' — user pressed Cancel / X / Escape; caller MUST abort entire flow
     */

Verification before commit:
- node -c assets/backup.js parses
- All 4 i18n files contain backup.passphrase.cancel
- grep -c "opts.onSkip\|opts.onCancel" assets/backup.js shows expected usage
- The .sgbackup decrypt path's onCancel is unchanged (still resolves(null) — verified by reading L558)

Commit message: fix(22-12): split passphrase modal Cancel from Skip Encryption (3-state resolve)
  </action>
  <verify>
    <automated>node -c assets/backup.js &amp;&amp; grep -q "backup.passphrase.cancel" assets/i18n-en.js &amp;&amp; grep -q "backup.passphrase.cancel" assets/i18n-de.js &amp;&amp; grep -q "backup.passphrase.cancel" assets/i18n-he.js &amp;&amp; grep -q "backup.passphrase.cancel" assets/i18n-cs.js &amp;&amp; grep -q "onSkip" assets/backup.js &amp;&amp; grep -q "'cancel'" assets/backup.js</automated>
  </verify>
  <done>
    - The passphrase modal in encrypt mode now distinguishes three outcomes
    - Pressing Cancel / X / Escape resolves the exportEncryptedBackup promise with the string 'cancel'
    - Pressing Skip Encryption resolves with false (unchanged)
    - Pressing Encrypt and Save resolves with true (unchanged)
    - Decrypt-mode flow is unaffected (cancel still resolves(null) via the import path)
  </done>
</task>

<task type="auto">
  <name>Task 2: Update overview.js export handler to honour cancel sentinel (Gap A part 2)</name>
  <files>assets/overview.js</files>
  <action>
In assets/overview.js export click handler (L66-90), update to handle the three-state resolve from exportEncryptedBackup. Replace the existing block:

    if (exportBtn) {
      exportBtn.addEventListener("click", async () => {
        try {
          // Passphrase-first flow: modal shows with "Skip encryption" option
          var encrypted = await BackupManager.exportEncryptedBackup();
          if (encrypted === false) {
            // User chose "Skip encryption" — do regular export
            const { blob, filename } = await BackupManager.exportBackup();
            BackupManager.triggerDownload(blob, filename);
            if (BackupManager.isAutoBackupActive()) {
              await BackupManager.autoSaveToFolder(blob, filename);
            }
          }
          App.showToast("", "toast.exportSuccess");
        } catch (err) { ... }
      });
    }

WITH:

    if (exportBtn) {
      exportBtn.addEventListener("click", async () => {
        try {
          // Passphrase-first flow: modal returns true (encrypted), false (skip), or 'cancel' (abort).
          var encrypted = await BackupManager.exportEncryptedBackup();
          if (encrypted === 'cancel') {
            // User aborted — DO NOT download anything, DO NOT toast success.
            return;
          }
          if (encrypted === false) {
            // User chose "Skip encryption" — do regular unencrypted export
            const { blob, filename } = await BackupManager.exportBackup();
            BackupManager.triggerDownload(blob, filename);
            if (BackupManager.isAutoBackupActive()) {
              await BackupManager.autoSaveToFolder(blob, filename);
            }
          }
          // encrypted === true means file was already downloaded inside exportEncryptedBackup
          App.showToast("", "toast.exportSuccess");
        } catch (err) {
          console.error("Backup export failed:", err);
          var msg = (err && err.message) ? err.message : String(err);
          if (msg.includes("subtle") || msg.includes("crypto")) {
            msg = "Encrypted backup requires HTTPS or localhost. Try accessing via localhost instead of IP.";
          }
          App.showToast(msg, "toast.exportError");
        }
      });
    }

Key changes:
- New early-return on `encrypted === 'cancel'` BEFORE the unencrypted export branch.
- The success toast also moves inside the conditional path so cancel produces no toast at all.
- The catch block is preserved verbatim.

Verification before commit:
- node -c assets/overview.js parses
- grep -q "encrypted === 'cancel'" assets/overview.js
- grep -c "exportBackup" assets/overview.js still shows the same call sites (count unchanged)

Commit message: fix(22-12): honour 'cancel' sentinel in overview export — no silent unencrypted download
  </action>
  <verify>
    <automated>node -c assets/overview.js &amp;&amp; grep -q "encrypted === 'cancel'" assets/overview.js</automated>
  </verify>
  <done>
    - Pressing Cancel on the export passphrase modal results in NO file download (manual UAT step)
    - Pressing Skip Encryption still produces an unencrypted .zip
    - Pressing Encrypt and Save still produces an encrypted .sgbackup
    - No success toast appears after a cancelled export
    - No error toast either — cancel is a clean no-op
  </done>
</task>

<task type="auto">
  <name>Task 3: Reusable App.installNavGuard helper + single call site for the Settings gear icon (Gap B, D3)</name>
  <files>assets/app.js, assets/add-session.js, assets/i18n-en.js, assets/i18n-de.js, assets/i18n-he.js, assets/i18n-cs.js</files>
  <action>
Per product decision D3: the implementation produces a generic, reusable navigation-guard helper. The helper itself goes into `assets/app.js` (chrome-level concern). It is called EXACTLY ONCE in this plan — for the gear icon. Future call sites (brand-link, add-client, etc.) are out of scope for this plan and will be audited later by Ben.

Step A — Define the public API of `App.installNavGuard` in `assets/app.js` via post-IIFE namespace augmentation.

PLACEMENT (locked): the helper MUST be defined AFTER the IIFE that builds the `App` object, by augmenting the namespace from outside the IIFE. Do NOT add the helper to the return object inside the IIFE; do NOT modify the IIFE's existing return shape. Augment the already-exposed `App` global with a new method assignment:

```
App.installNavGuard = function (opts) { ... };
```

This is the ONLY acceptable placement pattern. It avoids touching the existing return object, keeps the diff minimal, and is safe because by the time the helper is invoked at runtime, `App.confirmDialog` (which the helper depends on) is already attached to the namespace by the IIFE. Pick a location in the file AFTER the IIFE's closing `})();` (or equivalent) — e.g. directly after the IIFE block, or near the file's other post-IIFE augmentations if any exist. Do NOT inline it inside the IIFE.

Helper definition:

```
/**
 * App.installNavGuard — register a click-time confirm guard on a navigation trigger.
 *
 * Intercepts clicks on the trigger; if the caller-provided `isDirty()` returns truthy,
 * shows an App.confirmDialog with the supplied i18n keys. On confirm, sets
 * window.PortfolioFormDirtyBypass=true (so beforeunload listeners that honour the flag
 * skip their prompt), runs the optional onConfirm hook, and navigates to `destination`.
 * On cancel, suppresses the navigation. When isDirty() is falsy, the guard is a no-op
 * and default navigation proceeds.
 *
 * Returns an unregister function that detaches the listener — useful when the trigger
 * element may be replaced or destroyed.
 *
 * NOTE: `onConfirm` is invoked synchronously; the helper does not await its return
 * value. Future callers needing an async onConfirm pattern (e.g. "save before
 * leaving") must gate the navigation themselves — i.e. perform the async work in
 * their own click handler before triggering navigation, OR fork the helper. The
 * synchronous-onConfirm contract is intentional and locked at v1.
 *
 * Public API (locked — future call sites depend on this shape):
 *   App.installNavGuard({
 *     trigger:     HTMLElement | string (CSS selector resolved at call time),
 *     isDirty:     () => boolean,                      // caller-provided dirty-state predicate
 *     message: {                                       // i18n keys for the confirm dialog
 *       titleKey, bodyKey, confirmKey, cancelKey,
 *       tone?: 'danger' | 'neutral'                    // defaults to 'danger'
 *     },
 *     destination: string | () => string,              // URL to navigate to on confirm; falls back to trigger.href if a string is unspecified
 *     onConfirm?:  () => void,                         // optional pre-nav SYNCHRONOUS side-effect (e.g. setFormSaving); see NOTE above re: async
 *   }) => (() => void)                                  // unregister fn
 */
App.installNavGuard = function (opts) {
  var trigger = (typeof opts.trigger === 'string') ? document.querySelector(opts.trigger) : opts.trigger;
  if (!trigger) return function () {};
  var msg = opts.message || {};
  var tone = msg.tone || 'danger';
  var resolveDestination = function () {
    if (typeof opts.destination === 'function') return opts.destination();
    if (typeof opts.destination === 'string') return opts.destination;
    return trigger.href || '';
  };
  var onClick = async function (e) {
    var dirty = false;
    try { dirty = !!(opts.isDirty && opts.isDirty()); } catch (_e) { dirty = false; }
    if (!dirty) return; // clean state — let default navigation proceed
    e.preventDefault();
    var ok = false;
    try {
      ok = await App.confirmDialog({
        titleKey:   msg.titleKey,
        messageKey: msg.bodyKey,
        confirmKey: msg.confirmKey,
        cancelKey:  msg.cancelKey,
        tone:       tone
      });
    } catch (_e) { ok = false; }
    if (!ok) return; // user chose to stay
    window.PortfolioFormDirtyBypass = true;
    if (typeof opts.onConfirm === 'function') {
      try { opts.onConfirm(); } catch (_e) { /* swallow — guard is best-effort */ }
    }
    var url = resolveDestination();
    if (url) window.location.href = url;
  };
  trigger.addEventListener('click', onClick);
  return function unregister() {
    trigger.removeEventListener('click', onClick);
  };
};
```

Notes on the implementation:
- `trigger` can be either an HTMLElement or a CSS selector string — selector is resolved once at call time. If the trigger is dynamically re-rendered, the caller is responsible for re-installing the guard (the unregister fn is the escape hatch).
- `destination` falls back to `trigger.href` when the trigger is an `<a>` element and no destination is provided — that's the gear-icon case.
- `tone` defaults to `'danger'` because most nav-guards protect data-loss scenarios; callers can override to `'neutral'`.
- `window.PortfolioFormDirtyBypass = true` is set unconditionally on confirm (cheap on pages without the flag's listener; required on add-session.html).
- `onConfirm` is optional AND synchronous — invoked AFTER the bypass flag is set but BEFORE navigation, so the caller can do things like `formSaving = true` to suppress beforeunload differently if they don't use the bypass-flag convention. The helper does NOT await it; see JSDoc NOTE.
- The catch around `opts.isDirty()` is defensive: a buggy predicate must not break navigation.

Step B — Expose form-dirty signal from add-session.js.

In assets/add-session.js, find the existing module-level `let formDirty = false;` (L5) and `let formSaving = false;` (L6). At the top of the DOMContentLoaded handler (L8) — after `await App.initCommon();` — install a global accessor:

    // Phase 22 Plan 12 (Gap B, D3): expose dirty state for App.installNavGuard consumers.
    window.PortfolioFormDirty = function () {
      return formDirty && !formSaving;
    };

(Function form, not a snapshot, so the guard always reads the live state.)

Also UPDATE the existing beforeunload listener at L63-67 to honour the one-shot bypass flag set by `installNavGuard`:

    window.addEventListener("beforeunload", (e) => {
      if (window.PortfolioFormDirtyBypass) return;
      if (formDirty && !formSaving) {
        e.preventDefault();
      }
    });

This prevents a double-prompt (custom dialog + browser-native) when the user confirms leaving via the guard.

Step C — Add 4 i18n keys for the leave-page confirm.

Append to each of assets/i18n-{en,de,he,cs}.js:

en:
  "session.leavePage.title": "Leave this session?",
  "session.leavePage.body": "You have unsaved changes. Leaving now will discard them.",
  "session.leavePage.confirm": "Leave without saving",
  "session.leavePage.cancel": "Stay on this session",

de:
  "session.leavePage.title": "Sitzung verlassen?",
  "session.leavePage.body": "Sie haben ungespeicherte Änderungen. Beim Verlassen gehen sie verloren.",
  "session.leavePage.confirm": "Verlassen ohne zu speichern",
  "session.leavePage.cancel": "Auf der Sitzung bleiben",

he:
  "session.leavePage.title": "לעזוב את המפגש?",
  "session.leavePage.body": "יש שינויים שלא נשמרו. עזיבה עכשיו תמחק אותם.",
  "session.leavePage.confirm": "לעזוב בלי לשמור",
  "session.leavePage.cancel": "להישאר במפגש",

cs (match existing file's accent encoding):
  "session.leavePage.title": "Opustit toto sezení?",
  "session.leavePage.body": "Máte neuložené změny. Pokud nyní odejdete, budou ztraceny.",
  "session.leavePage.confirm": "Odejít bez uložení",
  "session.leavePage.cancel": "Zůstat u sezení",

Step D — Wire the gear icon as the SINGLE call site (the only one in this plan).

In assets/app.js initSettingsLink (L291-337), AFTER the link element is created and inserted (after the actions.appendChild(link) / actions.insertBefore(link, ...) call at L320-322), AND BEFORE the listener-installed flag check, register the guard via the helper:

    // Phase 22 Plan 12 (Gap B, D3): single call site for App.installNavGuard.
    // Future call sites (brand-link, add-client, etc.) are out of scope for this plan.
    App.installNavGuard({
      trigger: link,
      isDirty: function () {
        return typeof window.PortfolioFormDirty === 'function' && window.PortfolioFormDirty() === true;
      },
      message: {
        titleKey:   'session.leavePage.title',
        bodyKey:    'session.leavePage.body',
        confirmKey: 'session.leavePage.confirm',
        cancelKey:  'session.leavePage.cancel',
        tone:       'danger'
      },
      destination: link.href
    });

DO NOT inline a click handler. DO NOT call `installNavGuard` more than once. Other top-nav items (brand-link, language popover, theme toggle, add-client, etc.) are explicitly out of scope per D3.

Step E — Self-check: future-caller smoke test.

After the helper is in place, write a one-paragraph mental walkthrough in the SUMMARY answering: "If Ben later wants to guard the brand-link, what does he write?" The expected answer is: a single `App.installNavGuard({trigger: brandLink, isDirty: ..., message: {...}, destination: '...'})` call — no edits to the helper's source, no copy-paste of the click-handler logic. If during implementation it becomes clear that the helper's API would force a future caller to do anything weirder than that, STOP and revise the helper's API before committing.

Verification before commit:
- node -c assets/app.js parses
- node -c assets/add-session.js parses
- All 4 i18n files contain session.leavePage.title
- grep -q "App.installNavGuard" assets/app.js (helper defined)
- grep -c "App.installNavGuard" assets/app.js returns at least 2 (definition + the gear-icon call site) — but no more than EXPECTED (no extra call sites)
- grep -q "PortfolioFormDirty" assets/add-session.js (signal exposed)
- grep -q "PortfolioFormDirty" assets/app.js (signal consumed by gear-icon isDirty closure)
- grep -q "PortfolioFormDirtyBypass" assets/add-session.js (bypass flag honoured by beforeunload)
- grep -q "PortfolioFormDirtyBypass" assets/app.js (bypass flag set inside installNavGuard)

Commit message: feat(22-12): App.installNavGuard helper + gear-icon nav guard for unsaved session changes
  </action>
  <verify>
    <automated>node -c assets/app.js &amp;&amp; node -c assets/add-session.js &amp;&amp; grep -q "App.installNavGuard" assets/app.js &amp;&amp; grep -q "PortfolioFormDirty" assets/add-session.js &amp;&amp; grep -q "PortfolioFormDirty" assets/app.js &amp;&amp; grep -q "PortfolioFormDirtyBypass" assets/add-session.js &amp;&amp; grep -q "PortfolioFormDirtyBypass" assets/app.js &amp;&amp; grep -q "session.leavePage.title" assets/i18n-en.js &amp;&amp; grep -q "session.leavePage.title" assets/i18n-de.js &amp;&amp; grep -q "session.leavePage.title" assets/i18n-he.js &amp;&amp; grep -q "session.leavePage.title" assets/i18n-cs.js</automated>
  </verify>
  <done>
    - `App.installNavGuard` exists in assets/app.js, defined via post-IIFE namespace augmentation (`App.installNavGuard = function (opts) { ... }` AFTER the IIFE that builds App), with the locked public API documented in the source code comment block (D3) including the synchronous-onConfirm note
    - The helper is called EXACTLY ONCE in this plan — for the Settings gear icon — with the add-session form-dirty predicate as `isDirty`
    - A future caller can wire a guard for any other navigation trigger by calling `App.installNavGuard({...})` ONCE without touching the helper's source (D3 acceptance)
    - Open a session, switch to edit mode, type something in any field, click the Settings gear → confirm dialog appears with title "Leave this session?" and a red "Leave without saving" button
    - Click "Stay on this session" → modal closes, still on session page, no navigation
    - Click gear again, click "Leave without saving" → navigates to settings.html with no second prompt (bypass flag suppresses beforeunload)
    - On a session page in read mode (no edits) → gear navigates instantly without any prompt
    - On overview.html or sessions.html → gear navigates instantly (PortfolioFormDirty is undefined, isDirty returns false, default navigation proceeds)
    - The original beforeunload guard still fires on browser tab close / refresh when form is dirty (bypass flag is only set on intentional in-app navigation via the helper)
    - No tasks added for brand-link / add-client / language-popover / theme-toggle — those are out of scope per D3 and will be audited by Ben later using `installNavGuard` as the building block
  </done>
</task>

</tasks>

<verification>
After all 3 tasks land:

1. node -c on assets/backup.js, assets/overview.js, assets/app.js, assets/add-session.js — all parse
2. grep -q "onSkip" assets/backup.js (passphrase modal supports the new callback)
3. grep -q "encrypted === 'cancel'" assets/overview.js (overview honours cancel sentinel)
4. grep -q "App.installNavGuard" assets/app.js (helper present)
5. grep -c "App.installNavGuard" assets/app.js returns exactly the expected number (1 definition + 1 call site = 2 occurrences); confirm there are NO additional call sites for brand-link, language popover, theme toggle, etc. (those are out of scope per D3)
6. grep -q "PortfolioFormDirty" in BOTH assets/add-session.js AND assets/app.js (signal exposed and consumed)
7. grep -q "PortfolioFormDirtyBypass" in BOTH files (one-shot bypass to avoid double prompt)
8. All 4 i18n files contain backup.passphrase.cancel AND session.leavePage.title
9. The helper's public API is documented in a code comment block at its definition (D3), including the synchronous-onConfirm NOTE
10. The helper definition appears AFTER the IIFE block in assets/app.js (post-IIFE augmentation pattern); it is NOT inside the IIFE's return object

Manual UAT (must be performed by user after deploy):

Gap A (export cancel):
- Overview page → Export / Backup Data → passphrase modal opens
- Press Cancel — verify NO file appears in Downloads, no toast, modal closes silently
- Re-open export modal, press X (top-right) — same: no file downloaded
- Re-open, press Escape — same: no file downloaded
- Re-open, press Skip Encryption — verify .zip file IS downloaded
- Re-open, type a strong passphrase, press Encrypt and Save — verify .sgbackup file IS downloaded

Gap B (settings nav guard via the new helper):
- Open an existing session → Edit → type in any field
- Click the gear icon — confirm dialog appears (driven by `App.installNavGuard`)
- Press "Stay on this session" — verify still on session page, edits intact
- Click gear again — confirm dialog appears
- Press "Leave without saving" — verify navigated to settings.html (single prompt, not two)
- Open a fresh session in read mode — click gear — navigates instantly, no prompt
- Open overview.html — click gear — navigates instantly, no prompt
- Brand-link / add-client / language popover / theme toggle: no behaviour change in this plan (out of scope per D3)
</verification>

<success_criteria>
- Both UAT truth statements become provable in 22-HUMAN-UAT.md (status flips from failed to closed-fixed after manual UAT)
- Gap A blocker is closed: zero scenarios remain where Cancel produces a file download
- Gap B major is closed: zero scenarios remain where dirty-form changes vanish silently via the gear icon
- D3 acceptance: a future caller can wire a guard for any other navigation trigger by calling `App.installNavGuard({...})` without touching the helper's source — verified by the self-check walkthrough recorded in the SUMMARY
- No regression in: encrypted backup happy path, unencrypted backup happy path, .sgbackup import (decrypt-side cancel still works), beforeunload on tab close, navigation from non-session pages
- 3 atomic commits land on the working branch (one per task)
</success_criteria>

<output>
After completion, create .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-12-data-safety-guards-SUMMARY.md per the template, recording:
- Each commit SHA
- Which UAT gap each commit closes
- The future-caller smoke-test paragraph (D3 acceptance — what a brand-link guard would look like in 1–2 lines)
- Confirmation that the .sgbackup decrypt path's cancel behaviour is unchanged
- Confirmation that App.installNavGuard is defined via post-IIFE augmentation (not inside the IIFE's return object)
- Any deviations from the plan
- The verification grep results
</output>
</content>
