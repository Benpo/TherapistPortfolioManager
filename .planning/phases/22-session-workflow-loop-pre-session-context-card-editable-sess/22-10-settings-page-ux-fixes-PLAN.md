---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 10
type: execute
wave: 1
depends_on: []
files_modified:
  - assets/settings.js
  - assets/app.css
  - assets/tokens.css
  - assets/settings.html
  - assets/i18n-en.js
  - assets/i18n-de.js
  - assets/i18n-he.js
  - assets/i18n-cs.js
autonomous: true
gap_closure: true
requirements: [REQ-1, REQ-2, REQ-3, REQ-4]
must_haves:
  truths:
    - "When a section's enable-toggle is OFF, the rename input on that row is non-editable (disabled or readonly) and visually muted."
    - "Pressing Save fires the disable-confirm dialog if and only if at least one toggle transitioned enabled → disabled in the staged changes since the last successful Save (or page open). Re-enables alone do NOT trigger the warning. A toggle that is flipped off then back on within the same staging cycle has a net transition of none, and therefore does NOT trigger the warning."
    - "After a successful Save, the post-save confirmation appears as a content-sized success pill (driven by --color-success-bg / --color-success-text / --color-success-border tokens) inserted next to the Save button, visually and structurally distinct from the static info banner above. The pill auto-dismisses on the first form input/change, the next Save click, the X-button click, or after 6 seconds — whichever comes first. The OLD 'About saved settings' blue notice DOM, CSS, and JS show-path are removed entirely."
    - "On Safari/macOS, hovering the info icon next to a locked section's rename input shows a real visible tooltip bubble (not relying on the native title attribute alone)."
  artifacts:
    - path: "assets/settings.js"
      provides: "Toggle change re-disables rename input; per-save disable-confirm using transition-detection helper; new success-pill state machine (showSavedNotice/dismissSavedNotice) wired into the successful-save callback path"
      contains: "showSavedNotice"
    - path: "assets/settings.html"
      provides: "New <div class='settings-saved-notice'> pill markup inserted as last sibling of the Save button; OLD 'About saved settings' notice DOM removed"
      contains: "settings-saved-notice"
    - path: "assets/tokens.css"
      provides: "Three new success-palette tokens (--color-success-bg, --color-success-text, --color-success-border) defined in BOTH the default theme block AND the [data-theme=\"dark\"] block"
      contains: "--color-success-bg"
    - path: "assets/app.css"
      provides: "New .settings-saved-notice + .settings-saved-notice-mark + .settings-saved-notice-close pill rules consuming the success tokens, with reduced-motion handling. OLD .settings-sync-message rules removed. .settings-locked-info CSS-only tooltip added."
      contains: ".settings-saved-notice"
  key_links:
    - from: "assets/settings.js renderRow toggle handler"
      to: "renameInput.disabled state"
      via: "direct DOM mutation when toggle.change fires"
      pattern: "toggleInput.addEventListener\\(.change."
    - from: "assets/settings.js onSave"
      to: "App.confirmDialog (disable warning)"
      via: "fires only when computeDisableTransitions() returns ≥1 enabled→disabled transition vs. last persisted DB state"
      pattern: "App.confirmDialog"
    - from: "assets/settings.js onSave success callback"
      to: "showSavedNotice() / dismissSavedNotice() state machine"
      via: "showSavedNotice replaces the OLD syncMessage.classList.remove('is-hidden') call; dismiss is auto-wired to form input/change, next Save click, close button, and a 6s timeout"
      pattern: "showSavedNotice"
---

<objective>
Close 4 UAT gaps on the Settings page (Phase 22, Plan 04 follow-ups).

All 4 gaps were reported in 22-HUMAN-UAT.md Test 1, severity: major. They are pure UX/correctness defects in `assets/settings.js`, `assets/settings.html`, the Phase 22 CSS block in `assets/app.css`, and `assets/tokens.css`. No data-model or storage changes.

Purpose: Make the Settings page behave the way the therapist actually expects — disabling a row also locks its name field; the disable warning fires on Save iff at least one row newly transitioned enabled → disabled (re-enables don't count, same-cycle off-then-on doesn't count); the post-save confirmation is a content-sized success pill placed next to the Save button (replacing the OLD blue full-width "About saved settings" notice entirely), auto-dismissing on the next interaction or after 6 seconds; the tooltip on locked rows works in Safari.

Output: Updated `assets/settings.js` (toggle handler + save flow + transition-detection helper + new pill state machine), `assets/settings.html` (new pill markup, OLD notice removed), three new success-palette tokens added to `assets/tokens.css` (light AND dark theme), Phase 22 CSS block in `assets/app.css` (new pill rules + CSS-only locked-info tooltip + OLD notice rules removed), and the existing i18n keys for the locked-rename tooltip + disable-confirm dialog verified across all 4 languages plus two new keys for the pill (`settings.saved.notice`, `settings.saved.dismiss`).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-HUMAN-UAT.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-04-settings-page-SUMMARY.md
@assets/settings.js
@assets/settings.html
@assets/app.css
@assets/tokens.css
@assets/i18n-en.js

## Source-of-truth UAT entries (truth → fix)

These four `truth:` lines from `22-HUMAN-UAT.md` `## Gaps` are the ONLY gaps this plan closes:

1. "Disabled section's rename input becomes non-editable (locked) when section is toggled off"
2. "Pressing Save fires the disable-confirm dialog when at least one row newly transitioned enabled → disabled since the last successful Save (or page open); re-enables alone don't trigger it"
3. "'About saved settings' confirmation is visually distinct from the static info banner AND auto-clears on next Save or any subsequent change"
4. "Hover tooltip appears for non-renameable section labels on Safari/macOS"

## Existing implementation reference

In `assets/settings.js` (read once before editing):
- `LOCKED_RENAME = new Set(['heartShield','issues','nextSession'])` — rows where rename is structurally disabled (DO NOT touch this set; we are adding a SECOND reason a rename can be disabled: the toggle being off).
- `renderRow(def, current)` builds each row. The toggle handler at L220–263 currently only flips the badge + sets `formDirty`. It needs to also disable/re-enable `input` (the rename input in the same closure) UNLESS `LOCKED_RENAME.has(def.key)` (those are always disabled regardless).
- `onSave()` at L321 currently does NOT call `App.confirmDialog` — that confirm lives entirely inside the toggle's `change` handler and is gated by `sessionStorage.getItem("settings.disable.confirmed")`. The UAT redefines the spec: confirm fires on Save iff the staged toggle states show ≥1 row transitioning enabled → disabled relative to the last persisted DB state (one combined confirm per Save, not one per toggle).
- The toggle handler's per-toggle `App.confirmDialog` call AND its `sessionStorage` gate must be REMOVED entirely — the new contract is "warn iff Save would persist a new disable-transition".
- `refs.syncMessage` (the `<div id="settingsSyncMessage" class="settings-sync-message is-hidden">` revealed by `classList.remove("is-hidden")` after Save) IS THE OLD "About saved settings" notice. Its DOM in `settings.html`, its CSS rule in `assets/app.css`, and the `refs.syncMessage` JS show-path are REMOVED in this plan and replaced by the new `.settings-saved-notice` pill state machine.

In `assets/tokens.css`:
- The default theme block defines `--color-info-bg: #cce5ff;` and `--color-info-text: #004085;` (no success pair yet — `--color-success` exists as a single hue but no bg/text/border trio).
- The `[data-theme="dark"]` block redefines info tokens for dark mode. The new success tokens MUST be defined in BOTH blocks (light + dark) so the pill reads correctly in either theme.

In `assets/app.css` (Phase 22 block, L2313–2461):
- `.settings-info-banner` (L2313) stays as-is — it's the static info banner the pill must remain visually distinct from.
- `.settings-sync-message` (L2344) and any associated `::before` / `strong` / `p` descendant rules are DELETED entirely — replaced by the new `.settings-saved-notice` rules per the locked spec in Task 2.
- `.settings-locked-info` (L2415) renders a 24×24 info icon with `cursor: help` but relies on the browser's native `title=` tooltip — Safari macOS does not show this reliably. Add a CSS-only tooltip pattern via `::after` reading `attr(data-tooltip)` (Task 3).

## Risk callouts

**Risk 1 — Disable-confirm semantic (LOCKED per product decision D1):**
Disable-confirm fires on Save iff `computeDisableTransitions()` returns at least one row whose staged state is `disabled` AND whose last-persisted DB state was `enabled`. Re-enables alone DO NOT trigger the warning. A toggle that is flipped off and then back on inside the same staging cycle (between two Save attempts, or between page open and Save) has a net transition of none — and therefore DOES NOT trigger the warning. The transition is computed at Save time by comparing each row's current `toggleInput.checked` against `currentMap.get(def.key)?.enabled ?? true` (the value at the last successful load). The `sessionStorage` flag `settings.disable.confirmed` and any `localStorage` 'has-disabled-once' equivalent are abolished by this plan — there is no per-visit gate, only a per-Save transition check. If the user cancels the confirm, the save aborts WITHOUT touching DB or formDirty (the staged transitions remain pending; pressing Save again re-prompts because the transitions are still there).

**Risk 2 — sessionStorage gate removal:** Removing the `sessionStorage.setItem("settings.disable.confirmed", "1")` gate means any leftover key from a prior visit is now dead weight. Leave the key in place (cheap; sessionStorage clears on tab close anyway) — do NOT add a removeItem call. Just stop reading it. Likewise, do NOT introduce any `has-disabled-once` localStorage flag — the new contract relies entirely on transition-vs-DB comparison, no persistent gate.

**Risk 3 — Locked design spec for success notice (LOCKED per product decision D2):** The visual + behavioural shape of the post-save confirmation has been decided ahead of execution and is baked into Task 2 verbatim. The executor MUST NOT redesign — implement the markup, CSS, and JS state machine as-given. The `frontend-design` skill is NOT invoked at runtime for this plan.

**Risk 4 — CSS tooltip in RTL:** The locked-info tooltip pseudo must work in Hebrew (`html[dir=rtl]`). Use `inset-inline-start` / `inset-inline-end` (logical properties), NEVER `left:` / `right:`. The pill itself uses logical properties throughout (`padding-inline-start`, `inset-inline-start`, `margin-inline-start`) so RTL renders the checkmark inline-start and the X inline-end automatically — no per-locale CSS needed.

**Risk 5 — tone for the new combined confirm:** The current per-toggle confirm uses `tone: 'neutral'` (commit e8023da). Keep `tone: 'neutral'` on the new combined Save-time confirm — same UX intent.

**Risk 6 — Wave/sequencing (parallel-execution i18n conflict):** This plan is wave 1 (entry point of the gap-closure chain) because all three Phase 22 gap-closure plans (22-10, 22-11, 22-12) touch the same 4 i18n files (assets/i18n-{en,de,he,cs}.js). Running them in parallel would conflict on those shared files. The chain is 22-10 → 22-11 → 22-12. Land all of this plan's commits before starting 22-11.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Lock rename input when toggle is OFF (Gap 1) + remove per-toggle disable-confirm + add transition-aware per-save disable-confirm (Gap 2)</name>
  <files>assets/settings.js</files>
  <action>
    Modify `assets/settings.js` `renderRow()` and `onSave()`:

    **A. renderRow() toggle handler changes (L220–263):**
    1. The toggle's `change` listener currently does TWO things conditionally: (a) shows confirm dialog on first disable per visit, (b) toggles badge. REPLACE the entire handler body with the simpler logic:
       - On change: toggle the `.disabled-indicator-badge` in `labelLine` (add when checked=false, remove when checked=true) — same as today.
       - On change: if the row is NOT in `LOCKED_RENAME`, set `input.disabled = !toggleInput.checked` and `input.setAttribute('aria-disabled', String(!toggleInput.checked))`. (LOCKED_RENAME rows stay `disabled` always — do not flip them to enabled.)
       - On change: set `formDirty = true; updateSaveButtonState();`
       - REMOVE the `App.confirmDialog({...settings.confirm.disable.*...})` call.
       - REMOVE the `sessionStorage.getItem/setItem("settings.disable.confirmed")` lines.
       - REMOVE the `await` and the revert-on-cancel logic (`toggleInput.checked = true`).
       - The handler can become synchronous (`function ()`), no longer `async`.

    2. Inside `renderRow()` at the point where the rename `input` is initially created (around L137–145), add this AFTER setting `input.value = customLabel` and BEFORE the `if (locked)` branch:
       ```
       // Gap 1: lock rename input when row is disabled (in addition to LOCKED_RENAME structural lock).
       if (!enabled && !locked) {
         input.disabled = true;
         input.setAttribute("aria-disabled", "true");
       }
       ```
       This handles the initial render — DB-disabled rows render with rename input already disabled.

    **B. Add a transition-detection helper at module scope (above `onSave`):**
    ```
    /**
     * Compare current staged toggle states against last-persisted DB state.
     * Returns the list of section keys whose staged state shows a NET enabled → disabled
     * transition since the last successful load (i.e. prevEnabled === true && nextEnabled === false).
     * Re-enables (false → true) and unchanged rows are excluded. A row that was flipped
     * off then back on within the same staging cycle yields prev === next and is excluded.
     *
     * @returns {string[]} — section keys newly disabled at Save time.
     */
     function computeDisableTransitions() {
       var transitions = [];
       for (var k = 0; k < SECTION_DEFS.length; k++) {
         var d = SECTION_DEFS[k];
         var t = refs.rowsContainer.querySelector('.settings-enable-toggle[data-section-key="' + d.key + '"]');
         if (!t) continue;
         var stored = currentMap.get(d.key);
         var prevEnabled = stored ? (stored.enabled !== false) : true;
         var nextEnabled = !!t.checked;
         if (prevEnabled === true && nextEnabled === false) transitions.push(d.key);
       }
       return transitions;
     }
    ```
    Note: `currentMap` is the in-memory snapshot of last-loaded DB state, refreshed by `loadAndRender()` after every successful Save. This is exactly the "since last successful Save (or page open)" reference the truth statement requires.

    **C. onSave() per-save disable-confirm (L321 onwards):**
    Before the `for (var j = 0; ...)` loop that calls `setTherapistSetting`, call the helper and confirm only if it returns a non-empty list:
    ```
    // Gap 2 (D1): warn on Save iff at least one toggle transitioned enabled → disabled
    // since the last persisted DB state. Re-enables alone do NOT trigger; same-cycle
    // off-then-on yields no transition and does NOT trigger.
    var disabledNow = computeDisableTransitions();
    if (disabledNow.length > 0) {
      var ok = false;
      try {
        ok = await App.confirmDialog({
          titleKey: "settings.confirm.disable.title",
          messageKey: "settings.confirm.disable.body",
          confirmKey: "settings.confirm.disable.confirm",
          cancelKey: "settings.confirm.disable.cancel",
          tone: "neutral"
        });
      } catch (e) { ok = false; }
      if (!ok) {
        // formSaving never became true on this path → just return
        return;
      }
    }
    ```
    Place this BEFORE `formSaving = true;` is hoisted (move `formSaving = true;` to AFTER the confirm passes). The cancel path must NOT touch DB, must NOT toast, must NOT hide the dirty state, and must NOT show the post-save sync message. Note: do NOT include `formSaving = false;` in the cancel branch — `formSaving` is still its baseline value when the cancel branch executes (it has not been hoisted yet on this path), so the assignment would be a no-op. The comment above `return;` documents the reasoning so future readers don't add it back.

    **Verification before commit:**
    - `node -c assets/settings.js` parses
    - `grep -n "settings.disable.confirmed" assets/settings.js` returns ZERO matches
    - `grep -n "has-disabled-once" assets/settings.js` returns ZERO matches (no localStorage gate introduced)
    - `grep -n "App.confirmDialog" assets/settings.js` returns exactly TWO matches (one in onDiscard, one in the new onSave block) — the per-toggle one is GONE
    - `grep -n "computeDisableTransitions" assets/settings.js` returns at least TWO matches (definition + onSave call site)
    - The toggle handler is no longer `async` (the only `async` arrow/function remaining for toggle should be inside event listeners that genuinely need it — verify by grep `addEventListener.*async` near the toggle code)

    Commit message: `fix(22-10): lock rename input when toggle off; transition-aware per-Save disable-confirm`
  </action>
  <verify>
    <automated>node -c assets/settings.js && grep -L "settings.disable.confirmed" assets/settings.js && grep -L "has-disabled-once" assets/settings.js && grep -c "App.confirmDialog" assets/settings.js | grep -q "^2$" && grep -q "computeDisableTransitions" assets/settings.js</automated>
  </verify>
  <done>
    - Toggle off → rename input becomes disabled+aria-disabled (Gap 1)
    - Toggle on → rename input becomes enabled (unless LOCKED_RENAME)
    - Initial render of a DB-disabled row also disables its rename input (Gap 1 covers the page-load case too)
    - Save with at least one row newly transitioning enabled → disabled vs. DB → confirm dialog appears (Gap 2 D1)
    - Save where ONLY re-enables happened (no enabled→disabled transition) → NO confirm, just persists silently
    - Save where a row was flipped off then back on within the same staging cycle (net transition = none) → NO confirm
    - Confirm cancel → no DB writes, no toast, no sync-message reveal, formDirty stays true, staged transitions preserved
    - Confirm accept → save proceeds normally; after success, `currentMap` reloads and prior transitions are now part of the new baseline (subsequent Save with no further changes will not re-prompt)
    - Save with NO toggle changes → no confirm (just persists silently as today)
    - sessionStorage 'settings.disable.confirmed' is no longer read or written; no 'has-disabled-once' localStorage flag exists
  </done>
</task>

<task type="auto">
  <name>Task 2: Replace OLD blue "About saved settings" notice with a content-sized success pill next to the Save button (Gap 3, D2 — locked design spec)</name>
  <files>assets/tokens.css, assets/app.css, assets/settings.html, assets/settings.js, assets/i18n-en.js, assets/i18n-de.js, assets/i18n-he.js, assets/i18n-cs.js</files>
  <action>
    ### Locked design spec for the success notice (do NOT redesign — implement as-given)

    **Shape & placement:**
    - A content-sized pill (border-radius 999px, inline-flex), NOT a full-width banner.
    - Insert as the last sibling of the Save button inside the existing settings form action row in `settings.html`.
    - On narrow viewports it wraps to the next line — that's fine, inline-flex sizes it to content automatically.

    **HTML markup (insert into settings.html action row, immediately AFTER the Save button):**
    ```html
    <div
      class="settings-saved-notice"
      id="settingsSavedNotice"
      role="status"
      aria-live="polite"
      hidden
    >
      <span class="settings-saved-notice-mark" aria-hidden="true"></span>
      <span class="settings-saved-notice-label" data-i18n="settings.saved.notice">Settings saved</span>
      <button
        type="button"
        class="settings-saved-notice-close"
        data-i18n-aria-label="settings.saved.dismiss"
        aria-label="Dismiss"
      >
        <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor"
                stroke-width="1.5" stroke-linecap="round" fill="none"/>
        </svg>
      </button>
    </div>
    ```

    **CSS — append to assets/app.css Phase 22 block:**
    ```css
    .settings-saved-notice {
      display: inline-flex;
      align-items: center;
      gap: 0.625rem;
      padding-block: 0.5rem;
      padding-inline-start: 0.875rem;
      padding-inline-end: 0.5rem;
      background: var(--color-success-bg);
      color: var(--color-success-text);
      border: 1px solid var(--color-success-border);
      border-radius: 999px;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.4;
      letter-spacing: -0.005em;
      white-space: nowrap;
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 220ms ease-out, transform 220ms cubic-bezier(0.2, 0, 0, 1);
      pointer-events: none;
    }
    .settings-saved-notice[data-active] { opacity: 1; transform: translateY(0); pointer-events: auto; }
    .settings-saved-notice[data-active="leaving"] { opacity: 0; transition: opacity 180ms ease-in; }
    .settings-saved-notice[hidden] { display: none; }

    .settings-saved-notice-mark {
      width: 0.875rem; height: 0.875rem;
      border-radius: 50%;
      background: currentColor;
      position: relative;
      flex-shrink: 0;
    }
    .settings-saved-notice-mark::after {
      content: "";
      position: absolute;
      inset-inline-start: 28%;
      inset-block-start: 18%;
      width: 22%;
      height: 50%;
      border-block-end: 1.5px solid var(--color-success-bg);
      border-inline-end: 1.5px solid var(--color-success-bg);
      transform: rotate(45deg);
    }

    .settings-saved-notice-close {
      display: inline-grid;
      place-items: center;
      width: 1.25rem; height: 1.25rem;
      padding: 0;
      margin-inline-start: 0.125rem;
      background: transparent;
      border: 0;
      color: inherit;
      opacity: 0.55;
      border-radius: 50%;
      cursor: pointer;
      transition: opacity 120ms ease, background-color 120ms ease;
    }
    .settings-saved-notice-close:hover,
    .settings-saved-notice-close:focus-visible {
      opacity: 1;
      background-color: color-mix(in oklab, currentColor 10%, transparent);
      outline: none;
    }
    .settings-saved-notice-close > svg { width: 0.6875rem; height: 0.6875rem; }

    @media (prefers-reduced-motion: reduce) {
      .settings-saved-notice,
      .settings-saved-notice[data-active="leaving"] {
        transition-duration: 0ms;
        transform: none;
      }
    }
    ```

    **JS state machine — into assets/settings.js (NOT pseudocode — implement exactly):**
    ```js
    const noticeEl  = document.getElementById("settingsSavedNotice");
    const formEl    = document.getElementById("settingsForm");      // executor: confirm actual ID
    const saveBtnEl = document.getElementById("settingsSaveBtn");    // executor: confirm actual ID
    let timeoutId   = null;
    let listenersOn = false;

    function showSavedNotice() {
      cancelLeave();
      detachDismissTriggers();
      noticeEl.hidden = false;
      void noticeEl.offsetHeight;
      noticeEl.dataset.active = "";
      attachDismissTriggers();
      timeoutId = setTimeout(() => dismissSavedNotice("timeout"), 6000);
    }

    function dismissSavedNotice() {
      if (!("active" in noticeEl.dataset)) return;
      noticeEl.dataset.active = "leaving";
      setTimeout(() => { noticeEl.hidden = true; delete noticeEl.dataset.active; }, 200);
      cancelLeave();
      detachDismissTriggers();
    }

    function cancelLeave() { if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; } }

    function onAnyInput()   { dismissSavedNotice(); }
    function onNextSave()   { dismissSavedNotice(); }
    function onCloseClick() { dismissSavedNotice(); }

    function attachDismissTriggers() {
      if (listenersOn) return;
      formEl.addEventListener("input",  onAnyInput, { once: true, capture: true });
      formEl.addEventListener("change", onAnyInput, { once: true, capture: true });
      saveBtnEl.addEventListener("click", onNextSave, { once: true });
      const closeBtn = noticeEl.querySelector(".settings-saved-notice-close");
      if (closeBtn) closeBtn.addEventListener("click", onCloseClick, { once: true });
      listenersOn = true;
    }

    function detachDismissTriggers() {
      formEl.removeEventListener("input",  onAnyInput, { capture: true });
      formEl.removeEventListener("change", onAnyInput, { capture: true });
      saveBtnEl.removeEventListener("click", onNextSave);
      const closeBtn = noticeEl.querySelector(".settings-saved-notice-close");
      if (closeBtn) closeBtn.removeEventListener("click", onCloseClick);
      listenersOn = false;
    }

    // Wire showSavedNotice() into the existing successful-save callback path
    // — at the same point the OLD "About saved settings" notice was being shown.
    // Remove the OLD blue notice DOM and any related CSS at the same time.
    ```

    **i18n keys (add to all 4 locale files; English is the canonical, others marked TODO):**
    - `settings.saved.notice` — en: `"Settings saved"`, he: `"ההגדרות נשמרו"`, de: TODO same English string, cs: TODO same English string
    - `settings.saved.dismiss` — en: `"Dismiss"`, he: `"סגור"`, de: TODO, cs: TODO

    **Removal step (don't forget):**
    The OLD "About saved settings" blue notice — delete its DOM in settings.html (the `<div id="settingsSyncMessage" class="settings-sync-message ...">` element and all its inner content), delete its CSS rules from app.css (`.settings-sync-message` and any descendant rules `::before`, `strong`, `p` inside that selector), delete any JS that shows it (the `refs.syncMessage?.classList.remove("is-hidden")` call inside the successful-save path AND the `refs.syncMessage` reference in `getRefs()`). The new pill replaces it entirely. After removal, `grep -n "settingsSyncMessage\|settings-sync-message\|syncMessage" assets/` should return ZERO matches across `settings.html`, `app.css`, and `settings.js`.

    **Acceptance criteria additions:**
    - The new notice is content-sized and visually distinct from the static info banner at the top of the Settings page.
    - It auto-dismisses on the first input/change in the form, on the next Save click, on its X-button click, or after 6 seconds (whichever first).
    - It's announced once via aria-live="polite" but does not steal focus.
    - Hebrew RTL renders the pill with the checkmark inline-start and the X inline-end (logical-property handling — no per-locale CSS needed).
    - prefers-reduced-motion users see no slide animation.

    ---

    ### Step A — Add three new success-palette tokens to `assets/tokens.css` (D2):

    The default theme block currently defines info tokens at L109–110:
    ```
    --color-info-bg: #cce5ff;
    --color-info-text: #004085;
    ```
    Append (immediately after the info pair, before the `--color-border-soft` line) the success trio. Pick clean values that match the existing palette — a soft sage/green family in light, a deeper emerald in dark, with WCAG AA contrast on the chosen foreground. Suggested values (executor may adjust to match the existing palette's tonal language):
    ```
    --color-success-bg: #e6f4ea;     /* soft sage tint, distinct from cyan info */
    --color-success-text: #1e6b3a;   /* AA contrast on the bg */
    --color-success-border: #4caf50; /* mid-saturation green for the 1px outline */
    ```

    The `[data-theme="dark"]` block at L132 onwards must ALSO define these three tokens. Append inside that block, after the existing dark info overrides. Suggested values:
    ```
    --color-success-bg: #1f3a2a;     /* deeper emerald ground */
    --color-success-text: #b6e5c4;   /* light readable foreground, AA contrast */
    --color-success-border: #4caf50; /* same accent border carries through */
    ```

    Verify both color pairs satisfy WCAG AA (4.5:1 for normal text) using a contrast checker before commit. Adjust hue/lightness only as needed to clear the threshold while keeping the sage/emerald family.

    ### Step B — Append the locked CSS block (above) to `assets/app.css` Phase 22 block, AND remove the OLD `.settings-sync-message` rules.

    The OLD rules live at L2344–2358 of `app.css` (Phase 22 block). Delete the entire `.settings-sync-message` rule plus any descendant rules (`::before`, `strong`, `p`). Append the new `.settings-saved-notice` ruleset from the locked spec at the end of the Phase 22 block.

    ### Step C — Insert the locked HTML markup into `assets/settings.html` and remove the OLD notice DOM.

    1. Find the action row containing the Save button. Insert the locked `<div class="settings-saved-notice" id="settingsSavedNotice" ...>` markup as the LAST sibling of the Save button inside that action row (so it appears next to Save, not above or below the form).
    2. Find the OLD `<div id="settingsSyncMessage" class="settings-sync-message is-hidden">...</div>` element and delete it entirely (including its inner `<strong>` and `<p>` content).

    ### Step D — Wire the locked JS state machine into `assets/settings.js`:

    1. Place the `noticeEl` / `formEl` / `saveBtnEl` lookups + helpers (`showSavedNotice`, `dismissSavedNotice`, `cancelLeave`, `attachDismissTriggers`, `detachDismissTriggers`, the handler callbacks) inside the existing `DOMContentLoaded` handler (or at module scope where `getRefs()` runs), AFTER the DOM is ready.
    2. Confirm the actual element IDs in `settings.html`:
       - `formEl`: the existing settings form. The current code references `refs.form` — confirm whether the form element has `id="settingsForm"`. If not, ADD the id to the form element in `settings.html` so the locked spec's `getElementById("settingsForm")` resolves. (Keep `refs.form` working too — both can coexist.)
       - `saveBtnEl`: the Save button. Confirm/add `id="settingsSaveBtn"` on the existing Save button element.
    3. In the successful-save path of `onSave()`, REPLACE the OLD line `if (refs.syncMessage) refs.syncMessage.classList.remove("is-hidden");` with `showSavedNotice();`.
    4. DELETE the `refs.syncMessage` lookup from `getRefs()` (or wherever it's collected).
    5. DELETE any `refs.syncMessage?.classList.add("is-hidden")` calls (the new state machine handles all dismissal).

    ### Step E — Add the two new i18n keys to all 4 locale files:

    Add `settings.saved.notice` and `settings.saved.dismiss` to each of `i18n-en.js`, `i18n-de.js`, `i18n-he.js`, `i18n-cs.js`. EN and HE values are canonical; DE and CS use the EN string as a TODO placeholder (file-level convention: match how Phase 22 already handles untranslated strings — if previous TODO placeholders are wrapped in a comment marker like `/* TODO de */`, use the same pattern; otherwise just store the EN string and add a `// TODO: translate` comment on the line).

    Values:
    - EN: `"settings.saved.notice": "Settings saved"`, `"settings.saved.dismiss": "Dismiss"`
    - HE: `"settings.saved.notice": "ההגדרות נשמרו"`, `"settings.saved.dismiss": "סגור"`
    - DE: `"settings.saved.notice": "Settings saved" /* TODO: translate */`, `"settings.saved.dismiss": "Dismiss" /* TODO: translate */`
    - CS: `"settings.saved.notice": "Settings saved" /* TODO: translate */`, `"settings.saved.dismiss": "Dismiss" /* TODO: translate */`

    Use `\u`-escapes in the CS/HE files ONLY if the existing files already use them for non-ASCII chars (check the file's existing pattern; HE in particular often uses raw UTF-8 — match it).

    Commit message: `fix(22-10): replace blue 'About saved settings' notice with content-sized success pill next to Save button (D2 locked spec)`
  </action>
  <verify>
    <automated>grep -q "color-success-bg" assets/tokens.css && grep -c "color-success-bg" assets/tokens.css | grep -qE "^[2-9]" && grep -q "settings-saved-notice" assets/app.css && grep -q "settings-saved-notice" assets/settings.html && grep -q "showSavedNotice" assets/settings.js && grep -q "dismissSavedNotice" assets/settings.js && ! grep -q "settings-sync-message" assets/app.css && ! grep -q "settingsSyncMessage" assets/settings.html && grep -q "settings.saved.notice" assets/i18n-en.js && grep -q "settings.saved.notice" assets/i18n-de.js && grep -q "settings.saved.notice" assets/i18n-he.js && grep -q "settings.saved.notice" assets/i18n-cs.js && node -c assets/settings.js</automated>
  </verify>
  <done>
    - Three new tokens (`--color-success-bg`, `--color-success-text`, `--color-success-border`) exist in `assets/tokens.css` in BOTH the default theme block AND the `[data-theme="dark"]` block, both pairs verified as ≥ AA contrast (D2)
    - The new `<div class="settings-saved-notice" id="settingsSavedNotice" ...>` pill markup is inserted as the last sibling of the Save button in `assets/settings.html`
    - The locked `.settings-saved-notice` + `.settings-saved-notice-mark` + `.settings-saved-notice-close` + `prefers-reduced-motion` CSS block is appended to the Phase 22 block in `assets/app.css`, consuming only the new tokens (no hex fallbacks)
    - The locked JS state machine (`showSavedNotice`, `dismissSavedNotice`, `cancelLeave`, attach/detach triggers, the three callbacks) is wired into `assets/settings.js`, and `showSavedNotice()` replaces the OLD `refs.syncMessage.classList.remove("is-hidden")` in the successful-save path
    - The OLD `<div id="settingsSyncMessage" class="settings-sync-message">` DOM is removed from `settings.html`; the `.settings-sync-message` CSS rule (and descendants) is removed from `app.css`; the `refs.syncMessage` reference is removed from `settings.js`. `grep -q "settings-sync-message\|settingsSyncMessage" assets/` returns NOTHING in any of the three files.
    - Two new i18n keys (`settings.saved.notice`, `settings.saved.dismiss`) exist in all 4 locale files (EN + HE canonical, DE + CS as TODO English placeholders)
    - After Save success, the pill renders next to the Save button, content-sized, with the success palette + checkmark dot, visually and structurally distinct from the static info banner above, in both light and dark themes
    - The pill auto-dismisses on the first form input/change after Save, on the next Save click, on the X-button click, or after 6 seconds — whichever comes first
    - `aria-live="polite"` announces the pill once on appearance without stealing focus
    - Hebrew RTL renders the pill with checkmark inline-start, X inline-end, no per-locale CSS overrides
    - `prefers-reduced-motion` users see opacity-only fade, no slide
  </done>
</task>

<task type="auto">
  <name>Task 3: CSS-only hover tooltip for locked-info icon on Safari/macOS (Gap 4)</name>
  <files>assets/settings.js, assets/app.css, assets/i18n-en.js, assets/i18n-de.js, assets/i18n-he.js, assets/i18n-cs.js</files>
  <action>
    **A. JS — set tooltip text via data-attribute (assets/settings.js renderRow, around L155–165):**

    Inside the `if (locked) { ... }` branch where the `infoIcon` is created, the existing code sets `infoIcon.title = tooltip;`. KEEP that (for keyboard/screen reader fallback) AND add a new attribute that the CSS will read:
    ```
    infoIcon.setAttribute("data-tooltip", tooltip);
    ```
    Place it immediately after the existing `infoIcon.title = tooltip;` line. Do NOT add a child `<span>` element — keeping the structure pseudo-element-only preserves the file's "no innerHTML" verification (createElementNS is fine but adding a span is more code than needed and the pseudo is more accessible-by-default since it can't be tab-focused).

    **B. CSS — tooltip via pseudo-element on `.settings-locked-info` (assets/app.css, Phase 22 block, modify L2415–2423):**

    REPLACE the existing `.settings-locked-info` rule block with:
    ```
    .settings-locked-info {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: 24px;
      block-size: 24px;
      color: var(--color-text-muted);
      cursor: help;
      position: relative;
    }
    .settings-locked-info::after {
      content: attr(data-tooltip);
      position: absolute;
      inset-block-end: calc(100% + 8px);
      inset-inline-start: 50%;
      transform: translateX(-50%);
      background: var(--color-surface-elevated, var(--color-surface));
      color: var(--color-text);
      border: 1px solid var(--color-border-soft);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 0.8125rem;
      font-weight: 500;
      line-height: 1.4;
      white-space: normal;
      max-inline-size: 240px;
      min-inline-size: 160px;
      box-shadow: 0 4px 16px var(--color-modal-shadow);
      opacity: 0;
      pointer-events: none;
      transition: opacity 120ms ease-in-out;
      z-index: 10;
    }
    .settings-locked-info:hover::after,
    .settings-locked-info:focus::after,
    .settings-locked-info:focus-within::after {
      opacity: 1;
    }
    /* RTL: keep horizontal centering identical (translateX percentages are direction-agnostic in modern browsers, but defend against transform inheritance) */
    html[dir="rtl"] .settings-locked-info::after {
      inset-inline-start: 50%;
      transform: translateX(50%);
    }
    ```

    The `transform: translateX(-50%)` centring works LTR; for RTL the translate axis flips, so the html[dir=rtl] override switches to `translateX(50%)`.

    **C. i18n — verify the existing tooltip key resolves in all 4 languages:**

    The key `settings.rename.locked.tooltip` already exists in `assets/i18n-en.js` (verified at L288: "This section's purpose is fixed — it can be turned off but not renamed."). Confirm it exists in the other three files. If missing in any of de/he/cs, add it:
    - DE: `"settings.rename.locked.tooltip": "Der Zweck dieses Abschnitts ist fest definiert — er kann ausgeschaltet, aber nicht umbenannt werden.",`
    - HE: `"settings.rename.locked.tooltip": "תפקיד החלק הזה קבוע — אפשר לכבות אותו אך לא לשנות שם.",`
    - CS: `"settings.rename.locked.tooltip": "Účel této sekce je pevně daný — můžete ji vypnout, ale ne přejmenovat.",`

    Use `\u`-escapes in the CS file ONLY if the existing CS file already uses them for accented chars (check `i18n-cs.js` first; if it uses raw UTF-8, use raw — match the file's existing pattern).

    Commit message: `fix(22-10): real CSS tooltip for locked-rename info icon (Safari-compatible)`
  </action>
  <verify>
    <automated>grep -q "data-tooltip" assets/settings.js && grep -q "settings-locked-info::after" assets/app.css && grep -q "content: attr(data-tooltip)" assets/app.css && grep -q "settings.rename.locked.tooltip" assets/i18n-de.js && grep -q "settings.rename.locked.tooltip" assets/i18n-he.js && grep -q "settings.rename.locked.tooltip" assets/i18n-cs.js && node -c assets/settings.js</automated>
  </verify>
  <done>
    - Hovering the info icon next to a locked row's rename input shows a styled tooltip bubble in Safari macOS (manual UAT step)
    - Tooltip is positioned above the icon, centred, with rounded corners and shadow
    - Tooltip works in HE (RTL) without flipping off-screen
    - Keyboard focus on the icon (tab-focusable via tabIndex=0) also reveals the tooltip
    - The native `title` attribute is still set as a fallback for assistive tech
    - All 4 i18n files contain the locked-rename tooltip key
  </done>
</task>

</tasks>

<verification>
After all 3 tasks land, perform these checks:

1. `node -c assets/settings.js` parses without error
2. `grep -L "settings.disable.confirmed" assets/settings.js` (no matches — gate removed)
3. `grep -L "has-disabled-once" assets/settings.js` (no matches — no localStorage flag introduced)
4. `grep -c "App.confirmDialog" assets/settings.js` returns 2 (onDiscard + onSave)
5. `grep -q "computeDisableTransitions" assets/settings.js` (transition helper present and called)
6. `grep -c "color-success-bg" assets/tokens.css` returns ≥ 2 (one in default theme, one in dark theme)
7. `grep -q "settings-saved-notice" assets/app.css` (new pill rules present)
8. `grep -q "settings-saved-notice" assets/settings.html` (new pill DOM present)
9. `grep -q "showSavedNotice" assets/settings.js && grep -q "dismissSavedNotice" assets/settings.js` (state machine present)
10. `! grep -q "settings-sync-message" assets/app.css && ! grep -q "settingsSyncMessage" assets/settings.html` (OLD notice fully removed)
11. `grep -q "settings-locked-info::after" assets/app.css` (CSS tooltip present)
12. `grep -q "data-tooltip" assets/settings.js` (JS sets the data-attribute)
13. All 4 i18n files contain `settings.rename.locked.tooltip` and `settings.confirm.disable.title/body/confirm/cancel` AND the two new keys `settings.saved.notice` + `settings.saved.dismiss` (verify with: `for f in assets/i18n-{en,de,he,cs}.js; do echo "==$f=="; grep "settings.confirm.disable.title\|settings.rename.locked.tooltip\|settings.saved.notice\|settings.saved.dismiss" "$f"; done`)

Manual UAT (must be performed by user after deploy):
- Open `./settings.html`
- Toggle a non-locked row OFF → confirm rename input becomes greyed/disabled in real time
- Toggle it back ON → rename input becomes editable again
- Toggle row A OFF + Save → confirm dialog appears with neutral OK button
- Press Cancel → no toast, no green pill, dirty state preserved, transition still pending
- Press Save again, this time confirm OK → green success pill appears next to the Save button (content-sized, NOT a full-width banner), visually distinct from the static blue info banner above
- Now toggle row B ON (where row B was previously disabled) and Save → NO confirm dialog (re-enable only); just silent persist + green pill
- Toggle row C OFF, then immediately toggle row C ON, then Save → NO confirm dialog (net transition = none)
- Toggle row D OFF, Save (confirm), then Save again with no further changes → NO confirm on the second Save (already part of new baseline)
- Type in any rename input after the pill appears → pill fades out
- Toggle any row after the pill appears → pill fades out
- Click the X button on the pill → pill fades out
- Wait 6 seconds with no interaction after Save → pill auto-dismisses
- Press Save again while the pill is visible → pill fades out immediately, then re-appears after the new save completes
- Hover the (i) icon next to "Heart Shield" / "Issues" / "Information for Next Session" rename input on Safari macOS → real tooltip bubble appears
- Switch to dark theme → green pill remains readable, distinct from dark-mode info banner
- Switch language to Hebrew → tooltip text appears in Hebrew, positioned correctly above the icon; pill renders with checkmark inline-start, X inline-end (RTL)
- Enable prefers-reduced-motion in OS settings → pill appears/disappears without slide animation
</verification>

<success_criteria>
- All 4 UAT `truth:` statements become provable in 22-HUMAN-UAT.md (status flips from `failed` to `closed-fixed` after manual UAT)
- D1 transition semantic is observable: re-enables alone don't prompt; same-cycle off-then-on doesn't prompt; only net enabled→disabled transitions vs. last-loaded DB state prompt
- D2 acceptance: three new tokens exist in tokens.css (light + dark blocks); the locked design spec (pill markup + CSS + JS state machine) is implemented verbatim; the OLD blue "About saved settings" notice is fully removed (DOM + CSS + JS); two new i18n keys are added to all 4 locale files
- Zero new console errors on Settings page load, Save, Discard
- All existing Plan 04 acceptance criteria still pass (no regression in: 9-row render, save+broadcast, discard confirm, beforeunload guard, RTL layout)
- 3 atomic commits land on the working branch (one per task)
</success_criteria>

<output>
After completion, create `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-10-settings-page-ux-fixes-SUMMARY.md` per the template, recording:
- Each commit SHA
- Which UAT gap each commit closes
- The final hex values used for the success palette (light + dark) — note that these were locked ahead of execution per D2; record the actual values committed
- Whether DE/CS i18n strings were left as English TODO placeholders (and where the TODO comments live for future translation work)
- Any deviations from the locked design spec (there should be none — but record any unavoidable adjustments, e.g. if `settingsForm` / `settingsSaveBtn` IDs had to be added to existing elements)
- The verification grep results
</output>
