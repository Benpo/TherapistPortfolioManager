---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 22-13
parent_phase: 22
title: Settings success-pill regression + revert-button affordance
type: execute
wave: 1
depends_on:
  - 22-10
files_modified:
  - assets/settings.js
  - assets/settings.html
  - assets/app.css
  - assets/i18n-en.js
  - assets/i18n-de.js
  - assets/i18n-he.js
  - assets/i18n-cs.js
autonomous: true
gap_closure: true
requirements: [N4, N5]
tags:
  - settings
  - ux-fixes
  - gap-closure
  - success-pill
  - i18n
  - rtl
  - state-machine-bug
must_haves:
  truths:
    - "The 'Settings saved' success pill appears AFTER EVERY successful Save in the same Settings page session — not just the first one — and remains visible long enough to be noticed"
    - "The Revert button on each Settings page row is self-explanatory at first glance — the user can tell what it does without trial-and-error"
  artifacts:
    - path: "assets/settings.js"
      provides: "Pill state machine that survives back-to-back saves: leaving-cleanup setTimeout is captured into a module-scoped variable (noticeLeaveTimeoutId) and cleared by cancelLeave() before each new showSavedNotice() call. Auto-dismiss timeout bumped from 6000ms to 8000ms via a single named constant. Reset button gets a visible-at-all-times text label (via DOM, not innerHTML)."
      contains: "noticeLeaveTimeoutId"
    - path: "assets/settings.html"
      provides: "Existing pill markup unchanged. No structural changes needed for Gap N5 — the fix is JS-only. For Gap N4 the label is injected by settings.js into the existing .reset-row-btn (no markup change here either)."
      contains: "settings-saved-notice"
    - path: "assets/app.css"
      provides: "New .reset-row-btn-label rule so the injected text label sits next to the icon with logical padding (RTL-safe). The existing .reset-row-btn rule stays icon-only-friendly; the label rule adds inline padding-inline-start, using on-scale tokens (xs 8px, weight 600, line-height 1.4 — Label role per 22-UI-SPEC)."
      contains: ".reset-row-btn-label"
    - path: "assets/i18n-en.js"
      provides: "New key settings.row.revert.label = 'Revert'. Canonical EN value."
      contains: "settings.row.revert.label"
    - path: "assets/i18n-de.js"
      provides: "New key settings.row.revert.label with the German translation (Zurücksetzen) so the label is readable in DE without TODO. Encoded with \\u00XX upper-hex escapes per file convention."
      contains: "settings.row.revert.label"
    - path: "assets/i18n-he.js"
      provides: "New key settings.row.revert.label with the Hebrew translation (אפס) so the label is readable in HE with correct RTL flow. Raw UTF-8 per file convention."
      contains: "settings.row.revert.label"
    - path: "assets/i18n-cs.js"
      provides: "New key settings.row.revert.label with the Czech translation (Obnovit) so the label is readable in CS. Pure ASCII — no escapes needed."
      contains: "settings.row.revert.label"
  key_links:
    - from: "assets/settings.js showSavedNotice()"
      to: "cancelLeave()"
      via: "Both clear noticeTimeoutId (6s/8s auto-dismiss) AND noticeLeaveTimeoutId (200ms post-leaving cleanup). Calling cancelLeave() inside showSavedNotice() before flipping dataset.active back to '' prevents the orphaned hide-cleanup from running after a re-show."
      pattern: "noticeLeaveTimeoutId"
    - from: "assets/settings.js renderRow() reset button creation block"
      to: "i18n-{en,de,he,cs}.js settings.row.revert.label"
      via: "renderRow appends a <span class='reset-row-btn-label'> after the icon, text = App.t('settings.row.revert.label'). Label is created via createElement+textContent (no innerHTML)."
      pattern: "reset-row-btn-label"
---

<objective>
Close 2 round-3 UAT gaps on the Settings page:

**Gap N5 (major) — Success-pill regression:** The 'Settings saved' green pill appears the first time the user saves on the Settings page, then never reappears on subsequent saves in the same session. Root cause: the 200ms leaving-cleanup `setTimeout` inside `dismissSavedNotice()` is fire-and-forget — it is never captured into a module-scoped variable and therefore not cancelled when `showSavedNotice()` re-fires. After a second Save, the orphaned cleanup runs 200ms later, sets `noticeEl.hidden = true` and `delete dataset.active`, hiding the freshly-shown pill. Fix: capture the leaving-cleanup timeout into `noticeLeaveTimeoutId`, clear it in `cancelLeave()`, and bump the auto-dismiss duration from 6000ms to 8000ms (per CONTEXT.md D2 — slight bump, not 10s).

**Gap N4 (minor) — Revert button not self-explanatory:** Each Settings row's per-row Reset button (DOM class `.reset-row-btn`, currently icon-only) is not recognisable to first-time users. Fix per CONTEXT.md D1: add a visible text label next to the icon (not a hover tooltip, not a confirm dialog) in all 4 languages. The icon stays — the label sits alongside it.

Purpose: Restore Save feedback for the entire Settings session (not just the first save) and make the per-row Revert action discoverable at first glance, including on touch devices where the existing `title=` tooltip is invisible.

Output:
- Updated `assets/settings.js`: leaving-cleanup setTimeout captured (`noticeLeaveTimeoutId`), `cancelLeave()` clears both timeouts, auto-dismiss bumped to 8000ms via a named constant, reset button gains a `<span class="reset-row-btn-label">` child with i18n text.
- Updated `assets/app.css`: new `.reset-row-btn-label` rule giving the label logical inline padding (8px = `xs` token), Label role typography (weight 600, line-height 1.4) per 22-UI-SPEC.
- 4 i18n locale files: new key `settings.row.revert.label` translated (EN canonical, DE/HE/CS native — no TODO placeholders, per CONTEXT.md "no v1/static for now" rule). DE uses `\u00XX` upper-hex escapes (file convention); HE raw UTF-8 (file convention); CS pure ASCII.
- `assets/settings.html`: no markup changes (existing pill markup is already correct; the reset button label is injected via JS, mirroring how the icon SVG is currently injected).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-13-CONTEXT.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-10-settings-page-ux-fixes-SUMMARY.md
@assets/settings.js
@assets/settings.html
@assets/app.css

## UAT truth statements being closed (verbatim from 22-HUMAN-UAT.md)

These are the ONLY two gaps this plan closes. No re-debate.

1. **N5 (major):** "The 'Settings saved' success pill appears AFTER EVERY successful Save in the same Settings page session — not just the first one — and remains visible long enough to be noticed"
2. **N4 (minor):** "The Revert button on each Settings page row is self-explanatory at first glance — the user can tell what it does without trial-and-error"

## Locked decisions from 22-13-CONTEXT.md (DO NOT re-litigate)

- **D1 — Revert affordance:** Visible text label, NOT a tooltip, NOT a confirm dialog. Reason: tooltips are invisible on mobile/touch.
- **D2 — Pill fix scope:** Fix the state-machine bug AND bump the auto-dismiss duration from 6000ms → **8000ms** (the mid option). Not 10s (would feel sticky). The "8s mid-option" rationale was explicitly: long enough to be noticed in normal use, not so long it feels sticky — so UAT MUST confirm BOTH halves (visible-on-every-save AND visible-long-enough-to-notice).

## Locked design tokens from 22-UI-SPEC.md (DO NOT deviate)

- **Spacing scale:** Only {4, 8, 16, 24, 32, 48, 64}px. No 6px, no 12px. The `.reset-row-btn-label` padding-inline-start uses **8px (the `xs` token)**.
- **Type weights:** Only {400, 600}. The Label role is **600 (SemiBold)**.
- **Type roles — Label:** 14px / 600 / line-height **1.4**. The `.reset-row-btn-label` is a Label-role text and uses those exact values.

## Existing implementation reference (read once before editing)

### Pill state machine — `assets/settings.js` L285–359 (post-22-10)

The current state machine has these elements:
- `var noticeTimeoutId = null;` (module-scope, L285) — only tracks the 6000ms auto-dismiss timeout.
- `function showSavedNotice()` (L296) — calls `cancelLeave()`, `detachDismissTriggers()`, then sets `noticeEl.hidden = false`, forces a reflow via `void noticeEl.offsetHeight`, sets `dataset.active = ""`, calls `attachDismissTriggers()`, and queues `noticeTimeoutId = setTimeout(dismissSavedNotice, 6000)`.
- `function dismissSavedNotice()` (L309) — early-returns if `!("active" in dataset)`; else sets `dataset.active = "leaving"`, then queues an **uncaptured** `setTimeout(...200ms)` that sets `n.hidden = true; delete n.dataset.active`. Then calls `cancelLeave()` and `detachDismissTriggers()`.
- `function cancelLeave()` (L324) — clears `noticeTimeoutId` only.

The bug: the 200ms cleanup `setTimeout` inside `dismissSavedNotice` is the one that wipes `hidden` and `dataset.active`. It is fire-and-forget. When the user saves a second time:

1. The first save's `attachDismissTriggers` had wired the Save button's `click` to `onNextSave`. When Save is clicked, `onNextSave → dismissSavedNotice()` fires. Pill enters `leaving` state; the 200ms cleanup is queued (unreferenced).
2. The save handler completes, calls `showSavedNotice()`. It calls `cancelLeave()` — clears only `noticeTimeoutId` (the 6s auto-dismiss for the NEW pill, queued moments later). The orphaned 200ms cleanup is still pending.
3. `showSavedNotice` sets `dataset.active = ""` (visible state) and reflows.
4. ~200ms later, the orphaned cleanup fires: `n.hidden = true; delete n.dataset.active`. The pill becomes invisible permanently for the rest of the session (no other code path un-hides it).

Fix: capture the 200ms timeout into a module-scoped `noticeLeaveTimeoutId`; clear it in `cancelLeave()` alongside `noticeTimeoutId`. Plus: bump the auto-dismiss duration from 6000ms to a named constant `NOTICE_AUTO_DISMISS_MS = 8000` (per D2).

### Reset button rendering — `assets/settings.js` renderRow() L201–227

The current construction sequence (read before editing):

- `resetBtn = document.createElement("button");`
- `resetBtn.type = "button";`
- `resetBtn.className = "button ghost reset-row-btn";`
- `resetBtn.setAttribute("data-section-key", def.key);`
- `resetTip = App.t("settings.reset.tooltip");`
- `resetBtn.setAttribute("aria-label", resetTip);`
- `resetBtn.title = resetTip;`
- `resetBtn.appendChild(buildResetIconSvg());`  ← icon is the only child currently
- `if (!hasOverride) { resetBtn.disabled = true; ... }`

The icon is built by `buildResetIconSvg()` (L69). The label has to sit alongside it. Append a second child — a `<span class="reset-row-btn-label">` with text from the new i18n key `settings.row.revert.label`. KEEP `title=` and `aria-label=` set to the existing `settings.reset.tooltip` ("Reset to default name") — they remain the accessible/long-form description; the new label is the at-a-glance affordance.

The existing button class chain is `button ghost reset-row-btn`. The `.reset-row-btn` rule (app.css L2450–2459) has `display: inline-flex; align-items: center; justify-content: center; padding: 8px;` and `opacity: 0.5` when disabled. The new label needs spacing between icon and text — put logical `padding-inline-start: 8px` (the `xs` token per 22-UI-SPEC) on a new `.reset-row-btn-label` rule. Keeping `.reset-row-btn` untouched means existing icon-only renderings (if any) don't shift.

### Settings row layout context — narrow viewports

The row uses `flex-wrap: wrap; gap: 16px` (`.settings-row-controls` at app.css L2444). On mobile the toggle + reset button stack inline; adding a label to the reset button widens it slightly. The label is short (~6 chars max across all 4 languages — including "Zurücksetzen" which is the longest at 13 chars) — should not break the 375px viewport. The action-bar Save/Discard buttons live in a separate sticky row (L2460), unaffected.

### i18n catalog (existing keys near where the new one will live)

All 4 locale files already have `settings.reset.tooltip` (L277). The new key sits adjacent: `settings.row.revert.label`. **Encoding convention per file (verified):**
- `assets/i18n-en.js` — plain ASCII.
- `assets/i18n-de.js` — uses `\u00XX` **upper-hex** escapes for every non-ASCII glyph (verified at L165 `ü`, L257 `ä`/`ß`, L277 `zurücksetzen`, L281 `Über`). The new DE value MUST follow this pattern (lowercase `ü` and uppercase `ü` both appear historically — the locked instruction below uses UPPER-hex to match L257/L277 which are the closest neighbours).
- `assets/i18n-he.js` — raw UTF-8 for Hebrew.
- `assets/i18n-cs.js` — uses `\u00XX` escapes for diacritics (e.g. L277 `výchozí název`), but "Obnovit" is pure ASCII so no escape needed.

## Risk callouts

**Risk 1 — i18n serialization (no impact within this plan):** All four i18n files are touched by Task 2. Since this is a single plan with sequential tasks, there is no parallel-execution conflict here. CONTEXT.md flags that any FUTURE plan running in parallel with 22-13 must serialize i18n edits. This plan does not produce that conflict — but downstream planners should treat 22-13's commits as the i18n baseline for any subsequent gap-closure batch.

**Risk 2 — The leaving-cleanup setTimeout has TWO call sites?** Only one. `dismissSavedNotice()` (L309) is the sole creator of the 200ms cleanup setTimeout. The fix only needs to capture-and-clear that one timeout.

**Risk 3 — Race if dismissSavedNotice fires twice in a row:** Currently, `dismissSavedNotice` early-returns if `!("active" in dataset)`. With the new captured-timeout approach we also clear any previously-captured `noticeLeaveTimeoutId` at the start of `dismissSavedNotice` BEFORE queuing a new one — handles the edge case where dismiss is called twice within ~200ms (e.g. user clicks the close X and the auto-dismiss fires the same frame).

**Risk 4 — RTL for the reset button label:** Hebrew (RTL) — `.reset-row-btn` uses `inline-flex`, which respects writing direction. The icon will sit on the inline-end side and the label on the inline-start side automatically. Use `padding-inline-start: 8px` (direction-agnostic logical property, on-scale `xs` token) — do NOT use `margin-left` or `margin-right`.

**Risk 5 — Reset button disabled state:** The button is `disabled` when `!hasOverride`. The label child still renders, just dimmed by the existing `opacity: 0.5` on `[disabled]`. No special handling needed.

**Risk 6 — `aria-label` vs visible label:** Once a visible text label is added, the `aria-label` becomes redundant (screen readers prefer visible content). However: the existing `aria-label` value is `settings.reset.tooltip` ("Reset to default name"), which is MORE descriptive than the new short visible label ("Revert"). We KEEP the `aria-label` as-is — screen readers get the longer description; sighted users get the short label + icon. Standard accessible button pattern.

**Risk 7 — `title=` attribute remaining:** Same reasoning — the `title=` is the long-form description on desktop hover. Keep it.

**Risk 8 — Task 2 touches 6 files (informational, not a blocker):** Below the >5 split threshold but worth noting: the 4 i18n files + settings.js + app.css are all mechanical edits to a single semantic feature (new label key + render + style). Splitting i18n out into a separate task would create a no-op file set (the JS render would reference a missing key for a few minutes). Keeping the 6 files in one task is the safer atomic unit.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix success-pill state-machine regression — capture leaving-cleanup setTimeout + bump auto-dismiss 6000ms to 8000ms (Gap N5)</name>
  <files>assets/settings.js</files>
  <read_first>
    - assets/settings.js (full file — focus on L285–359 pill state machine block)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-10-settings-page-ux-fixes-SUMMARY.md (understand what 22-10 established — DO NOT redesign the markup, CSS tokens, or attach/detach trigger contract)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-13-CONTEXT.md (D2 — bump to 8000ms, not 10s)
  </read_first>
  <action>
    Modify `assets/settings.js` in the post-22-10 pill state-machine block (currently at L283–359). All edits are localised to that block — no other functions or call sites change.

    **Step A — Add a named constant for the auto-dismiss duration AND a second module-scoped timeout ID for the leaving cleanup.**

    Just above `var noticeTimeoutId = null;` (currently L285), insert a constant declaration:

    `var NOTICE_AUTO_DISMISS_MS = 8000;`

    Add a leading comment that explains: "Auto-dismiss timeout for the success pill. Bumped 6000ms → 8000ms in 22-13 (Gap N5 D2) so the pill is noticed without feeling sticky."

    Immediately AFTER `var noticeTimeoutId = null;` (which stays as-is), add a second module-scoped variable:

    `var noticeLeaveTimeoutId = null;`

    Add a leading comment that explains: "Captures the 200ms post-'leaving' cleanup setTimeout queued inside dismissSavedNotice(). cancelLeave() must clear BOTH this AND noticeTimeoutId, otherwise an orphaned cleanup from the previous dismiss can hide a freshly re-shown pill (Gap N5 regression root cause)."

    **Expected reference count for `noticeLeaveTimeoutId` after this plan = exactly 5:**
    1. Declaration (`var noticeLeaveTimeoutId = null;`)
    2. Assignment inside `dismissSavedNotice` (`noticeLeaveTimeoutId = setTimeout(...)`)
    3. `clearTimeout`/null-out inside `dismissSavedNotice` head (the explicit "clear any prior leave-cleanup before queuing a new one" guard)
    4. `clearTimeout`/null-out inside `cancelLeave` (the load-bearing fix)
    5. Null-out inside the queued 200ms callback body (so once the cleanup actually runs, the handle is released — prevents stale handles in subsequent show/dismiss cycles)

    **Step B — Replace the hardcoded 6000 in `showSavedNotice()` with the new constant.**

    Inside `showSavedNotice()` (currently L296), the line that queues the auto-dismiss is:

    `noticeTimeoutId = setTimeout(function () { dismissSavedNotice(); }, 6000);`

    Change the `6000` literal to `NOTICE_AUTO_DISMISS_MS`. The rest of the function stays unchanged.

    **Step C — Capture the leaving-cleanup setTimeout inside `dismissSavedNotice()` AND clear any prior timeouts before queuing a new one.**

    The current `dismissSavedNotice()` (L309–322) does this:
    1. early-returns if `dataset.active` not present
    2. sets `dataset.active = "leaving"`
    3. queues a fire-and-forget 200ms `setTimeout` that hides the pill and deletes `dataset.active`
    4. calls `cancelLeave()` (clears the 6s auto-dismiss)
    5. calls `detachDismissTriggers()`

    Replace the function body so:
    1. early-return guard stays as-is
    2. `dataset.active = "leaving"` stays
    3. Add explicit clears for `noticeTimeoutId` AND `noticeLeaveTimeoutId` (both `if (id) { clearTimeout(id); id = null; }` blocks) BEFORE queuing the new cleanup. These clears handle two cases at once: (a) the auto-dismiss is no longer needed because we're already leaving, (b) any prior leave-cleanup from a back-to-back dismiss is cancelled.
    4. Queue the 200ms cleanup with its return value assigned to `noticeLeaveTimeoutId`. The callback inside MUST null out `noticeLeaveTimeoutId` once it runs (per the expected-5 count above), then hide and delete `dataset.active` as before.
    5. REMOVE the trailing `cancelLeave()` call (it would otherwise clear the `noticeLeaveTimeoutId` we just stored). The explicit clears in step 3 above replace what `cancelLeave()` was doing for `noticeTimeoutId`.
    6. `detachDismissTriggers()` call at the end stays.

    The structural change is: the 200ms cleanup is now captured, AND `cancelLeave()` is no longer called at the tail of `dismissSavedNotice` (because it would null out the captured handle we want to keep).

    **Step D — Expand `cancelLeave()` to also clear `noticeLeaveTimeoutId`.**

    The current `cancelLeave()` (L324–329) only clears `noticeTimeoutId`. Expand it to clear both timeouts in sequence: first `noticeTimeoutId` (the existing behaviour), then `noticeLeaveTimeoutId` (the new behaviour). Both use the standard `if (id) { clearTimeout(id); id = null; }` pattern.

    This is the load-bearing change. When `showSavedNotice()` calls `cancelLeave()` at its top (currently L299), the orphaned 200ms leave-cleanup from the prior dismiss is now killed BEFORE we re-show. The pill stays visible.

    **Verification before commit:**
    - `node -c assets/settings.js` parses
    - `grep -c "NOTICE_AUTO_DISMISS_MS" assets/settings.js` shows ≥2 matches (declaration + use site inside showSavedNotice)
    - `grep -c "noticeLeaveTimeoutId" assets/settings.js` shows exactly **5** matches (declaration + assignment in dismiss + clear in dismiss + null-out inside post-leave callback + clear in cancelLeave)
    - No bare `6000` literal remains in non-comment lines (use the positive-form regex below to detect `6000` outside JS comments)
    - `grep -n "8000" assets/settings.js` shows the new constant value
    - `dismissSavedNotice` no longer calls `cancelLeave()` at its tail (verified via `awk` range, see acceptance criteria)

    Commit message: `fix(22-13): success-pill survives back-to-back saves — capture leaving-cleanup timeout + bump auto-dismiss to 8s`
  </action>
  <verify>
    <automated>node -c assets/settings.js && [ "$(grep -c 'NOTICE_AUTO_DISMISS_MS' assets/settings.js)" -ge 2 ] && [ "$(grep -c 'noticeLeaveTimeoutId' assets/settings.js)" -eq 5 ] && [ "$(grep -nE '^[^/]*[^/0-9]6000([^0-9]|$)' assets/settings.js | grep -cv 'Bumped 6000ms')" -eq 0 ] && grep -q "8000" assets/settings.js && [ "$(awk '/function dismissSavedNotice/,/^  }/' assets/settings.js | grep -c 'cancelLeave(')" -eq 0 ]</automated>
  </verify>
  <acceptance_criteria>
    - **Source assertion:** `assets/settings.js` defines `var NOTICE_AUTO_DISMISS_MS = 8000;` exactly once at module scope (verified by `grep -c '^[[:space:]]*var NOTICE_AUTO_DISMISS_MS' assets/settings.js` returning `1`).
    - **Source assertion:** `assets/settings.js` defines `var noticeLeaveTimeoutId = null;` exactly once at module scope (verified by `grep -c '^[[:space:]]*var noticeLeaveTimeoutId' assets/settings.js` returning `1`).
    - **Source assertion:** Inside `showSavedNotice`, the auto-dismiss `setTimeout` uses `NOTICE_AUTO_DISMISS_MS` (no bare `6000` literal in `showSavedNotice` after the change). Verified by `grep -A 20 'function showSavedNotice' assets/settings.js | grep -c '6000'` returning `0`.
    - **Source assertion:** Inside `dismissSavedNotice`, the 200ms leave-cleanup `setTimeout` return value is assigned to `noticeLeaveTimeoutId`. Verified by `awk '/function dismissSavedNotice/,/^  }/' assets/settings.js | grep -q 'noticeLeaveTimeoutId = setTimeout'`. The `awk` range is bounded to the function body — the current `dismissSavedNotice` is ~14 lines and the next function (`cancelLeave`) starts at the closing brace, so the range is safe.
    - **Source assertion:** `cancelLeave()` clears both `noticeTimeoutId` AND `noticeLeaveTimeoutId`. Verified by `awk '/function cancelLeave/,/^  }/' assets/settings.js | grep -q noticeTimeoutId` AND `awk '/function cancelLeave/,/^  }/' assets/settings.js | grep -q noticeLeaveTimeoutId`.
    - **Source assertion:** `dismissSavedNotice` no longer calls `cancelLeave()` at its tail (the explicit `clearTimeout` for `noticeTimeoutId` inside the function body replaces that call). Verified by `awk '/function dismissSavedNotice/,/^  }/' assets/settings.js | grep -c 'cancelLeave('` returning `0`. (The `awk` range is bounded to the function body; this avoids false positives from neighbouring functions like the spillover into `cancelLeave` itself that an `-A 30` grep window would catch.)
    - **Source assertion (reference count):** `grep -c 'noticeLeaveTimeoutId' assets/settings.js` returns **exactly 5**: declaration (1) + assignment inside dismiss (1) + clear inside dismiss (1) + null-out inside the queued post-leave callback (1) + clear inside cancelLeave (1). Any other count means the state machine is incomplete or has a stray reference.
    - **Source assertion (no stale 6000ms literal):** No bare `6000` literal remains in non-comment lines. Verified with a positive-form regex that detects `6000` only outside JS line/block comments: `grep -nE '^[^/]*[^/0-9]6000([^0-9]|$)' assets/settings.js | grep -cv 'Bumped 6000ms'` returns `0`. (The `-v 'Bumped 6000ms'` exclusion allows the single documented "bumped 6000ms → 8000ms" comment line introduced in Step A to remain, without permitting any genuine literal use.)
    - **Parse assertion:** `node -c assets/settings.js` exits 0.
    - **UAT truth N5 (behaviour, manual UAT — verbatim from 22-HUMAN-UAT.md and 22-13-CONTEXT.md):** "The 'Settings saved' success pill appears AFTER EVERY successful Save in the same Settings page session — not just the first one — and remains visible long enough to be noticed." Verification steps:
      1. Open `settings.html` in a fresh tab. Toggle row "Trapped emotions" OFF, press Save, confirm the disable warning — green pill appears.
      2. Wait for it to fade out completely (~8 seconds + 200ms leave animation).
      3. Toggle the same row back ON, press Save — pill MUST appear again.
      4. Repeat 3+ more times in the same session (different rows, mix of rename + toggle changes) — pill MUST appear every time.
      5. Save twice in quick succession (queue a change, Save while previous pill is still fading) — pill MUST re-appear after the second save, not stay hidden.
      6. **N5 clause (b) — "long enough to be noticed":** Perform a normal Save (no rush, no eye on the pill) and confirm aloud that the pill was **noticed without effort** — i.e. the 8s duration is long enough to register peripherally during a normal save flow, not blinked past. If the pill feels still too brief, that is a D2-relevant signal (the mid-option was chosen specifically to balance "noticed" vs. "sticky"). User MUST explicitly answer this clause "yes" before the UAT can flip from `failed` to `closed-fixed` — it is the second half of the truth statement and was the rationale for the 6s→8s bump.
    - **Behaviour:** The pill remains visible for ~8 seconds before auto-dismissing (was 6s) — long enough to read without feeling sticky.
  </acceptance_criteria>
  <done>
    - Two new module-scoped variables (`NOTICE_AUTO_DISMISS_MS = 8000`, `noticeLeaveTimeoutId = null`) declared inside the IIFE.
    - `showSavedNotice` uses `NOTICE_AUTO_DISMISS_MS` instead of `6000`.
    - `dismissSavedNotice` stores its leaving-cleanup `setTimeout` in `noticeLeaveTimeoutId`, clears any prior `noticeTimeoutId` and prior `noticeLeaveTimeoutId` at the start, the queued 200ms callback nulls out `noticeLeaveTimeoutId` once it runs, and `dismissSavedNotice` no longer calls `cancelLeave()` at its tail.
    - `cancelLeave` clears both timeouts.
    - `grep -c 'noticeLeaveTimeoutId' assets/settings.js` returns exactly **5**.
    - Subsequent saves in the same page session re-show the pill every time (UAT truth N5 clause (a) holds).
    - The 8s duration is confirmed by the user as "noticed without effort" during a normal save flow (UAT truth N5 clause (b) holds).
    - Pill is visible for ~8s before auto-dismissing.
    - All existing dismiss triggers (form input, next save click, close X click, auto-dismiss) still work.
    - `prefers-reduced-motion` users still get opacity-only fade (no CSS changes in this task).
    - HE/RTL pill still renders with checkmark inline-start, X inline-end (no CSS changes).
  </done>
</task>

<task type="auto">
  <name>Task 2: Add visible "Revert" text label to each Settings row's reset button (Gap N4) — DOM injection + CSS + 4-language i18n key</name>
  <files>assets/settings.js, assets/app.css, assets/i18n-en.js, assets/i18n-de.js, assets/i18n-he.js, assets/i18n-cs.js</files>
  <read_first>
    - assets/settings.js (renderRow reset-button block at L201–227 — current icon-only construction)
    - assets/app.css L2450–2459 (existing `.reset-row-btn` rule — do NOT modify it; the new label sits next to the icon via the existing `inline-flex; align-items: center;`)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (locked spacing scale {4,8,16,24,32,48,64} and Label-role typography: 14px / 600 / line-height 1.4)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-10-settings-page-ux-fixes-SUMMARY.md (understand 22-10's i18n discipline)
    - assets/i18n-en.js L255–291 (where settings.* keys live; insert the new key adjacent to `settings.reset.tooltip` at L277)
    - assets/i18n-de.js (DE non-ASCII glyphs use `\u00XX` upper-hex escapes — verified at L257 `ä`, L277 `zurücksetzen`; match this convention)
    - assets/i18n-he.js (Hebrew raw UTF-8 — verified at L277 `"אפס לשם ברירת המחדל"`)
    - assets/i18n-cs.js (CS uses `\u00XX` for diacritics but "Obnovit" is pure ASCII so no escape needed)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-13-CONTEXT.md (D1 — text label, NOT tooltip, NOT confirm dialog)
  </read_first>
  <action>
    **NOTE on file count:** This task touches 6 files (settings.js + app.css + 4 i18n files). This is intentional and atomic — splitting i18n from the JS render would leave the renderRow temporarily referencing a missing key. The 6 files form a single semantic feature (new label key + render + style). Below the >5 split blocker threshold; just mechanical i18n edits.

    **Step A — Add the new i18n key `settings.row.revert.label` to all 4 locale files. Translated, NOT TODO placeholders. Insert as a new line immediately AFTER the existing `settings.reset.tooltip` entry in each file.**

    File: `assets/i18n-en.js` — insert after L277. The line to add: `  "settings.row.revert.label": "Revert",`

    File: `assets/i18n-de.js` — insert after the equivalent `settings.reset.tooltip` line. **DE non-ASCII glyphs use `\u00XX` upper-hex escapes (see L257, L277).** The German word for "Revert" is "Zurücksetzen", with the umlaut `ü` (U+00FC). Per file convention this is written as `ü` (upper-hex). The line to add: `  "settings.row.revert.label": "Zurücksetzen",`

    File: `assets/i18n-he.js` — insert after the equivalent `settings.reset.tooltip` line. The value is the Hebrew word "אפס" (raw UTF-8 — match the file's existing pattern, e.g. L277 stores `"אפס לשם ברירת המחדל"` raw). The line to add: `  "settings.row.revert.label": "אפס",`

    File: `assets/i18n-cs.js` — insert after the equivalent `settings.reset.tooltip` line. The value is the Czech word "Obnovit" (plain ASCII, no diacritics needed). The line to add: `  "settings.row.revert.label": "Obnovit",`

    All four entries are placed at the same logical position (adjacent to `settings.reset.tooltip`) for grep-locatability.

    **Step B — Modify `assets/settings.js` `renderRow()` to inject the visible label as a second child of the reset button, AFTER the icon.**

    In `assets/settings.js`, locate the reset-button construction block (currently L201–213). The icon append is `resetBtn.appendChild(buildResetIconSvg());` at L209. Insert a new label-creation block AFTER that appendChild and BEFORE the `if (!hasOverride)` disabled-state branch at L210.

    Build the label using DOM APIs (no innerHTML — this matches the file's security pattern, e.g. L248 `newBadge.textContent = ... App.t(...)`):

    1. Create a `span` element via `document.createElement("span")`.
    2. Set its `className` to `"reset-row-btn-label"`.
    3. Set its `textContent` to the result of `App.t("settings.row.revert.label")` with a literal-English fallback (`"Revert"`) for the rare case where `window.App` is not yet defined at render time — match the existing pattern at L205 (`window.App && App.t ? App.t(...) : "Reset to default name"`).
    4. Append the span to `resetBtn` via `resetBtn.appendChild(...)`.

    Add a leading comment that explains: "Gap N4 (22-13): visible text label next to the icon so first-time users can tell what the button does without hovering or clicking. Tooltip (title) and aria-label keep the longer 'Reset to default name' description for desktop hover + screen readers."

    No other lines in `renderRow` change. The existing `aria-label` and `title` attributes (both set to `settings.reset.tooltip` — "Reset to default name") remain in place — accessible text + visible text deliberately differ (visible: short, ~6 chars; accessible: longer, descriptive).

    **Step C — Add a CSS rule for the new label class. Append to `assets/app.css` in the Phase 22 Settings block immediately AFTER the existing `.reset-row-btn[disabled]` rule (currently at L2456–2459).**

    The new rule is `.reset-row-btn-label`. Its properties — all locked by 22-UI-SPEC tokens (spacing scale {4,8,16,24,32,48,64}; weights {400, 600}; Label-role line-height 1.4):
    - `font-size: 0.875rem;` (14px = Label role per 22-UI-SPEC)
    - `font-weight: 600;` (Label role SemiBold — was 500, corrected to on-scale 600)
    - `line-height: 1.4;` (Label role line-height per 22-UI-SPEC — was 1.2, corrected)
    - `padding-inline-start: 8px;` (the `xs` token on the locked spacing scale — was 6px, corrected to on-scale)
    - `color: inherit;` (so disabled state's opacity carries through)

    Add a leading comment that explains: "Phase 22-13 (Gap N4) — visible label next to the reset icon. Logical padding flips correctly in RTL (HE). Values strictly follow 22-UI-SPEC tokens: 8px = `xs` spacing token; weight 600 + line-height 1.4 = Label role typography."

    Logical property `padding-inline-start` flips automatically in RTL — the gap sits between icon and label correctly in HE (where the icon is on the inline-end side relative to the label). No `html[dir="rtl"]` override needed.

    No changes to `.reset-row-btn` itself — the existing `inline-flex; align-items: center;` already positions the icon and the new span side-by-side.

    **Step D — Sanity check that the new key resolves in all locales.**

    The new key MUST appear exactly once per file. Verify with one grep per file (see automated `<verify>` block below).

    **Verification before commit:**
    - `node -c assets/settings.js` parses
    - `node -c assets/i18n-en.js && node -c assets/i18n-de.js && node -c assets/i18n-he.js && node -c assets/i18n-cs.js` all parse
    - Each i18n file contains exactly ONE occurrence of `"settings.row.revert.label"`
    - DE value is the escaped form `"Zurücksetzen"` (NOT raw UTF-8 `"Zurücksetzen"`) — verify: `grep -q 'Zur\\u00FCcksetzen' assets/i18n-de.js`
    - `grep -n "reset-row-btn-label" assets/settings.js` returns ≥1 match (the className assignment)
    - `grep -n "reset-row-btn-label" assets/app.css` returns ≥1 match (the CSS selector)
    - The CSS rule uses the locked token triple: `padding-inline-start: 8px`, `font-weight: 600`, `line-height: 1.4`
    - No TODO placeholders introduced for the new key (defend against a TODO comment sneaking in on the 2 lines preceding the new key — see acceptance criteria).

    Commit message: `feat(22-13): add visible 'Revert' label to Settings row reset button (en/de/he/cs)`
  </action>
  <verify>
    <automated>node -c assets/settings.js && node -c assets/i18n-en.js && node -c assets/i18n-de.js && node -c assets/i18n-he.js && node -c assets/i18n-cs.js && [ "$(grep -c '\"settings.row.revert.label\"' assets/i18n-en.js)" -eq 1 ] && [ "$(grep -c '\"settings.row.revert.label\"' assets/i18n-de.js)" -eq 1 ] && [ "$(grep -c '\"settings.row.revert.label\"' assets/i18n-he.js)" -eq 1 ] && [ "$(grep -c '\"settings.row.revert.label\"' assets/i18n-cs.js)" -eq 1 ] && grep -q 'Zur\\u00FCcksetzen' assets/i18n-de.js && grep -q "reset-row-btn-label" assets/settings.js && grep -q "reset-row-btn-label" assets/app.css && [ "$(grep -A 8 '\.reset-row-btn-label' assets/app.css | grep -c 'padding-inline-start: 8px')" -ge 1 ] && [ "$(grep -A 8 '\.reset-row-btn-label' assets/app.css | grep -c 'font-weight: 600')" -ge 1 ] && [ "$(grep -A 8 '\.reset-row-btn-label' assets/app.css | grep -c 'line-height: 1.4')" -ge 1 ] && [ "$(grep -B 2 'settings.row.revert.label' assets/i18n-en.js assets/i18n-de.js assets/i18n-he.js assets/i18n-cs.js | grep -ci 'TODO')" -eq 0 ]</automated>
  </verify>
  <acceptance_criteria>
    - **Source assertion (i18n):** Each of `assets/i18n-en.js`, `assets/i18n-de.js`, `assets/i18n-he.js`, `assets/i18n-cs.js` contains the key `"settings.row.revert.label"` exactly once. Values: EN="Revert", DE="Zurücksetzen" (umlaut as upper-hex `ü` escape — file convention, verified neighbours at L257 `ä` and L277 `zurücksetzen`), HE="אפס" (raw UTF-8 — file convention), CS="Obnovit" (pure ASCII).
    - **Source assertion (DE escape form):** `grep -q 'Zur\\u00FCcksetzen' assets/i18n-de.js` succeeds (the value is the escaped form, NOT raw UTF-8 `Zurücksetzen`).
    - **Source assertion (no TODO — neighbourhood-aware):** None of the 4 i18n entries OR the 2 lines preceding each entry contains a `TODO` placeholder/comment. Verified by `grep -B 2 'settings.row.revert.label' assets/i18n-en.js assets/i18n-de.js assets/i18n-he.js assets/i18n-cs.js | grep -ci 'TODO'` returning `0`. This defends against a placeholder pattern slipping in above the key (e.g. `// TODO translate` on the line above).
    - **Source assertion (JS):** `assets/settings.js` `renderRow` appends a `<span class="reset-row-btn-label">` child to `resetBtn` after `buildResetIconSvg()` is appended. Verified by `grep -A 5 'buildResetIconSvg' assets/settings.js | grep -q 'reset-row-btn-label'`.
    - **Source assertion (JS — security):** The label text is set via `textContent`, not `innerHTML`. Verified by `grep -B 2 -A 2 'reset-row-btn-label' assets/settings.js | grep -q 'textContent'`.
    - **Source assertion (CSS — locked token triple):** `assets/app.css` contains a `.reset-row-btn-label` rule that uses ALL THREE locked values: `padding-inline-start: 8px` (= `xs` spacing token per 22-UI-SPEC), `font-weight: 600` (Label-role SemiBold per 22-UI-SPEC — NOT 500), `line-height: 1.4` (Label-role line-height per 22-UI-SPEC — NOT 1.2). Verified by three positive greps, all on the 8-line window after the selector. AND no physical-axis padding inside the rule: `grep -A 8 '\.reset-row-btn-label' assets/app.css | grep -cE 'padding-(left|right):'` returns `0`.
    - **Parse assertion:** `node -c` exits 0 for all 5 modified JS files.
    - **UAT truth N4 (behaviour, manual UAT — verbatim from 22-HUMAN-UAT.md and 22-13-CONTEXT.md):** "The Revert button on each Settings page row is self-explanatory at first glance — the user can tell what it does without trial-and-error." Verification steps:
      1. Open `settings.html` in a fresh tab (EN locale).
      2. Each of the 9 settings rows displays its per-row reset button with BOTH an icon AND a visible "Revert" text label next to the icon (label always visible — no hover required).
      3. Switch UI language to DE → the label reads "Zurücksetzen" (the JS engine decodes `ü` → `ü` at runtime).
      4. Switch UI language to HE → the label reads "אפס", and the icon sits on the inline-end (right) side relative to the label, which is on the inline-start (right of icon in LTR sense — left in visual RTL) — verify the gap is between them, not crammed together.
      5. Switch UI language to CS → the label reads "Obnovit".
      6. A first-time user looking at the row understands what the button does WITHOUT hovering, tapping, or reading the page's helper text.
      7. On a touch device (mobile/tablet), the label is visible at all times — no hover state required.
    - **Behaviour (a11y unchanged):** Screen readers still announce the longer "Reset to default name" text via the existing `aria-label`. The visible "Revert" label is supplementary, not a replacement.
    - **Behaviour (disabled state):** When the button is `disabled` (row has no override), the icon + label both render dimmed via the existing `.reset-row-btn[disabled]` rule (`opacity: 0.5`).
  </acceptance_criteria>
  <done>
    - 4 i18n files each have the new key `settings.row.revert.label` with the correct localised value (EN/DE/HE/CS — no TODO placeholders).
    - DE value is the escaped form `"Zurücksetzen"` (upper-hex), matching the file's `\u00XX` convention verified at L257 and L277.
    - HE value is raw UTF-8 `"אפס"`. CS value is pure ASCII `"Obnovit"`.
    - `assets/settings.js` `renderRow` appends a `<span class="reset-row-btn-label">` child after the icon in each row's reset button, with `textContent` set via `App.t("settings.row.revert.label")`.
    - `assets/app.css` has a new `.reset-row-btn-label` rule using the locked 22-UI-SPEC token triple: `padding-inline-start: 8px` (xs token), `font-weight: 600` (Label-role SemiBold), `line-height: 1.4` (Label-role line-height).
    - `aria-label` and `title` on the reset button stay unchanged (still resolve to `settings.reset.tooltip`).
    - Settings page on every locale (EN/DE/HE/CS) shows the visible Revert label alongside the icon at all times.
    - RTL (HE) layout is correct — icon inline-end, label inline-start, gap between them flips automatically.
    - Mobile/touch user can identify the Revert button without hovering (UAT truth N4 holds).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| User input → DOM (Settings page) | Therapist-entered section names (rename inputs). Already validated/escaped by existing 22-10 path; not touched in 22-13. |
| i18n locale files → DOM | Static localised strings rendered into the page. Source-controlled — no user content. |
| `setTimeout` callbacks → DOM | The pill state-machine callbacks mutate `noticeEl.hidden` and `noticeEl.dataset.active`. No user input is involved in these paths. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-22-13-01 | Tampering | New i18n key `settings.row.revert.label` rendered into reset-button label | accept | The value is source-controlled (static strings in committed locale files) and rendered via `textContent` (not `innerHTML`) per the existing settings.js pattern. Even if a malicious actor edited the locale file in a fork, `textContent` neutralises any HTML/script — the string would render as inert text. No new attack surface. |
| T-22-13-02 | Tampering | New CSS class `.reset-row-btn-label` | accept | Pure presentational rule, no user-controlled selectors or values. No injection vector. |
| T-22-13-03 | Information Disclosure | Captured `noticeLeaveTimeoutId` module-scope variable | accept | Module-scoped inside the existing settings.js IIFE — not exposed on `window`. No new disclosure surface. |
| T-22-13-04 | Denial of Service | Rapid back-to-back save clicks could theoretically leave timeouts orphaned if the new clear logic has a bug | mitigate | Acceptance criteria explicitly verify `cancelLeave` clears BOTH `noticeTimeoutId` and `noticeLeaveTimeoutId`, AND that `dismissSavedNotice` clears any prior values before queuing new ones, AND that the reference count of `noticeLeaveTimeoutId` is exactly 5 (no missing clear, no stale handle). The state machine self-heals on each show/dismiss cycle. |
| T-22-13-05 | Repudiation | n/a | accept | No audit-log or user-action records affected by this plan. |
| T-22-13-06 | Spoofing | n/a | accept | No auth, identity, or session-token surface affected. |
| T-22-13-07 | Elevation of Privilege | n/a | accept | No privilege boundaries crossed; Settings page is already gated by license + TOC acceptance (Phase 19). 22-13 adds no new gates and no new bypass surfaces. |

**Overall security posture:** No new attack surface. Both fixes touch existing Settings-page paths and follow the file's established security patterns (textContent over innerHTML, DOM construction over template strings, source-controlled i18n).
</threat_model>

<verification>
After all 2 tasks land, perform these checks:

1. `node -c assets/settings.js && node -c assets/i18n-en.js && node -c assets/i18n-de.js && node -c assets/i18n-he.js && node -c assets/i18n-cs.js` — all 5 modified JS files parse.
2. `grep -c "NOTICE_AUTO_DISMISS_MS" assets/settings.js` returns ≥2 (constant declaration + use site).
3. `grep -c "noticeLeaveTimeoutId" assets/settings.js` returns **exactly 5** (declaration + assignment + clear-inside-dismiss + null-out-inside-callback + clear-inside-cancelLeave).
4. No bare `6000` literal remains in non-comment lines. Verified via positive-form regex: `grep -nE '^[^/]*[^/0-9]6000([^0-9]|$)' assets/settings.js | grep -cv 'Bumped 6000ms'` returns `0`.
5. `grep -q "8000" assets/settings.js` — new constant value present.
6. `awk '/function cancelLeave/,/^  }/' assets/settings.js | grep -q noticeTimeoutId && awk '/function cancelLeave/,/^  }/' assets/settings.js | grep -q noticeLeaveTimeoutId` — both timeouts cleared by cancelLeave.
7. `awk '/function dismissSavedNotice/,/^  }/' assets/settings.js | grep -c 'cancelLeave('` returns `0` — the trailing cancelLeave() call inside dismiss is gone (replaced by the explicit clears at the function head). The `awk` range is tightly bounded to the function body so it cannot spill into the neighbouring `cancelLeave` function.
8. For each of i18n-en.js, i18n-de.js, i18n-he.js, i18n-cs.js: `grep -c '"settings.row.revert.label"' <file>` returns `1`.
9. `grep -q 'Zur\\u00FCcksetzen' assets/i18n-de.js` — DE value uses the upper-hex escape form per file convention.
10. `grep -B 2 'settings.row.revert.label' assets/i18n-*.js | grep -ci 'TODO'` returns `0` — no TODO placeholder/comment in the new key's neighbourhood (covers the key's own line + the 2 lines above).
11. `grep -q "reset-row-btn-label" assets/settings.js && grep -q "reset-row-btn-label" assets/app.css` — DOM injection + CSS rule both present.
12. CSS rule uses the locked 22-UI-SPEC token triple — three positive greps on the 8-line window after the selector: `padding-inline-start: 8px`, `font-weight: 600`, `line-height: 1.4`. AND `grep -A 8 '\.reset-row-btn-label' assets/app.css | grep -cE 'padding-(left|right):'` returns `0` — no physical padding.

Manual UAT (must be performed by user after deploy):

**Gap N5 (success-pill regression) — closes BOTH clauses of the UAT truth:**
- (clause a) Open `./settings.html` fresh tab. Toggle a non-locked row OFF, press Save, confirm — green pill appears next to Save button.
- (clause a) Wait ~8 seconds with no interaction — pill auto-dismisses (visible-duration bump from 6s to 8s).
- (clause a) Toggle the row back ON, press Save — pill MUST appear again. (This is the regression fix.)
- (clause a) Repeat 3+ times in the same session — pill MUST appear every time.
- (clause a) Make a rename change AND a toggle change, press Save while the pill is still fading from a prior save (i.e. queue a second save inside the 200ms leaving window) — pill MUST re-appear for the second save, not stay hidden.
- **(clause b — "long enough to be noticed")** Perform a normal Save (don't stare at the pill — just do the save naturally). Did you notice the pill without effort, during a normal save flow? Answer "yes" / "no". A "no" here means the 8s mid-option (D2) didn't land — escalate before flipping the UAT row to `closed-fixed`. The user MUST explicitly confirm this second clause; it is not assumed from clause (a).

**Gap N4 (Revert label affordance):**
- Open `./settings.html` fresh tab in EN locale → each settings row's reset button shows BOTH an icon AND a visible "Revert" text label next to it (no hover required).
- Switch to DE → label reads "Zurücksetzen" (the `ü` escape in the source file decodes to `ü` at runtime).
- Switch to HE → label reads "אפס", icon and label sit on opposite logical sides with the existing logical gap.
- Switch to CS → label reads "Obnovit".
- On a touch device / mobile viewport (375px), the label is visible at all times — no hover state needed.
- Disabled state (row with no override): icon + label both dim together via the existing `[disabled]` opacity rule.
- Screen reader (VoiceOver/NVDA) announces "Reset to default name" (the existing accessible-name from `aria-label`), not just "Revert" — accessible name remains longer and more descriptive.
</verification>

<success_criteria>
- Both UAT `truth:` statements (N4, N5) become provable in 22-HUMAN-UAT.md (status flips from `failed` to `closed-fixed` after manual UAT). For N5 specifically: BOTH clauses of the truth ("appears after every save" AND "visible long enough to be noticed") MUST be explicitly user-confirmed; clause (b) is not assumed from clause (a).
- N5 acceptance: pill appears on EVERY successful Save in the same Settings page session (not just the first); auto-dismiss bumped to 8 seconds; all existing dismiss triggers still work (form input/change, next Save click, X-button click, reduced-motion); `noticeLeaveTimeoutId` reference count is exactly 5.
- N4 acceptance: per-row Revert button shows a visible text label in all 4 languages with logical RTL-safe spacing; label is visible without hover (touch-friendly); accessible `aria-label` + `title` continue to provide the longer "Reset to default name" description for screen readers and desktop hover; CSS rule uses the locked 22-UI-SPEC token triple (8px, 600, 1.4).
- All existing Plan 22-10 acceptance criteria still pass (no regression in: pill design tokens, Safari tooltip, transition-aware disable-confirm, locked-rename rows).
- Zero new console errors on Settings page load, Save, Discard, or reset-button click.
- 2 atomic commits land on the working branch (one per task).
- No TODO placeholders introduced in any i18n file (covers the new key's line AND the 2 lines preceding it).
- i18n serialization note recorded in CONTEXT so downstream parallel-batched plans know to sequence i18n edits after 22-13.
</success_criteria>

<output>
After completion, create `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-13-settings-pill-revert-affordance-SUMMARY.md` per the template, recording:
- Each commit SHA (one per task = 2 commits expected).
- Which UAT gap each commit closes (Gap N5 → Task 1; Gap N4 → Task 2).
- The exact line numbers in `assets/settings.js` where `NOTICE_AUTO_DISMISS_MS` and `noticeLeaveTimeoutId` were declared.
- The final reference count for `noticeLeaveTimeoutId` (should equal 5; if not, explain).
- The exact line numbers in each i18n locale file where `settings.row.revert.label` was inserted (4 entries).
- The DE value as it appears in the file (should be the upper-hex escape form `Zurücksetzen`).
- The CSS rule's final values for `padding-inline-start`, `font-weight`, `line-height` (should be 8px / 600 / 1.4 per 22-UI-SPEC).
- The verification grep results for each step (1–12 above).
- The before/after auto-dismiss duration values (6000ms → 8000ms) and the rationale tie-back to D2.
- The N5 clause (b) user confirmation result ("yes" / "no" — pill noticed without effort during normal save flow).
- Any deviations from the locked plan (there should be none — this is a tight 2-task gap-closure).
</output>
</content>
</invoke>