---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 09
type: execute
wave: 1
gap_closure: true
depends_on: []
files_modified:
  - add-session.html
  - assets/add-session.js
  - assets/settings.js
  - assets/sessions.js
  - assets/reporting.js
  - assets/overview.js
  - assets/app.js
autonomous: true
requirements: [REQ-13, REQ-15, REQ-3, REQ-5, REQ-21]
provenance: [GAP-1, GAP-2, GAP-3, GAP-4]

must_haves:
  truths:
    - "Therapists can download a session as PDF via the Export modal (REQ-13)"
    - "Web Share API can share the generated PDF (REQ-15)"
    - "App.initCommon() is awaited so therapistSettings cache is populated before applySectionVisibility / first render (REQ-3, REQ-5)"
    - "Settings page first-time-disable confirmation dialog uses neutral styling (not red 'danger') (REQ-21)"
  artifacts:
    - path: "add-session.html"
      provides: "<script> tag loading pdf-export.js between md-render.js and add-session.js"
      contains: 'src="./assets/pdf-export.js"'
    - path: "assets/add-session.js"
      provides: "Awaited App.initCommon() at line 9"
      contains: "await App.initCommon()"
    - path: "assets/settings.js"
      provides: "Awaited App.initCommon() at line 397; tone:'neutral' on disable-confirm site near line 237"
      contains: "await App.initCommon()"
    - path: "assets/sessions.js"
      provides: "Awaited App.initCommon() at line 2"
      contains: "await App.initCommon()"
    - path: "assets/reporting.js"
      provides: "Awaited App.initCommon() at line 2"
      contains: "await App.initCommon()"
    - path: "assets/overview.js"
      provides: "Awaited App.initCommon() at line 54"
      contains: "await App.initCommon()"
    - path: "assets/app.js"
      provides: "confirmDialog accepts tone: 'neutral' | 'danger'; toggles #confirmOkBtn class"
      contains: "tone"
  key_links:
    - from: "add-session.html footer scripts"
      to: "assets/add-session.js exportHandleDownloadPdf / exportHandleShare"
      via: "<script src=\"./assets/pdf-export.js\"></script> registers window.PDFExport synchronously at parse time"
      pattern: 'src="\./assets/pdf-export\.js"'
    - from: "assets/{add-session,settings,sessions,reporting,overview}.js DOMContentLoaded handlers"
      to: "assets/app.js initCommon (async) → therapistSettings cache populated"
      via: "await keyword on App.initCommon() call site"
      pattern: "await App\\.initCommon"
    - from: "assets/settings.js disable-confirm site (~line 237)"
      to: "assets/app.js confirmDialog with tone: 'neutral'"
      via: "tone parameter swaps #confirmOkBtn class danger -> button-primary on open, restores on close"
      pattern: "tone:\\s*['\"]neutral['\"]"
---

<objective>
Close the four verification gaps identified in 22-VERIFICATION.md so Phase 22 ships its full goal.

Purpose:
- Restore REQ-13 (PDF download — labelled CRITICAL in SPEC) and REQ-15 (Web Share with PDF attachment): one missing `<script>` tag in add-session.html.
- Eliminate the WR-01 race that REVIEW.md raised: 5 missing `await` keywords on `App.initCommon()`.
- Polish REQ-21 first-time-disable confirm dialog: stop styling the "Yes, disable" button as destructive red.

Output:
- One script tag added to add-session.html (registers window.PDFExport).
- Five `await` keywords added (one per call site).
- `tone` parameter added to confirmDialog in app.js + tone:'neutral' wired at the settings.js disable-confirm site.
- All other consumers of confirmDialog (delete-session etc.) keep the default destructive styling.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-VERIFICATION.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-REVIEW.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-SPEC.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md
@.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-PATTERNS.md

<interfaces>
<!-- Verbatim from current source — executor uses these directly, no exploration. -->

From add-session.html (footer scripts block, lines 538-553):
```html
  <script src="./assets/i18n-en.js"></script>
  <script src="./assets/i18n-he.js"></script>
  <script src="./assets/i18n-de.js"></script>
  <script src="./assets/i18n-cs.js"></script>
  <script src="./assets/i18n.js"></script>
  <script src="./assets/db.js"></script>
  <script src="./assets/shared-chrome.js"></script>
  <script src="./assets/app.js"></script>
  <script src="./assets/crop.js"></script>
  <script src="./assets/md-render.js"></script>
  <script src="./assets/add-session.js"></script>
  <script>
    if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(e){console.warn('SW registration failed:',e)});});}
  </script>
```

From assets/app.js (current confirmDialog signature, lines 443-489):
```js
function confirmDialog({ titleKey, messageKey, confirmKey = "confirm.delete", cancelKey = "confirm.cancel" }) {
  const modal = document.getElementById("confirmModal");
  if (!modal) {
    return Promise.resolve(false);
  }

  const titleEl = modal.querySelector("#confirmTitle");
  const messageEl = modal.querySelector("#confirmMessage");
  const confirmBtn = modal.querySelector("#confirmOkBtn");
  const cancelBtn = modal.querySelector("#confirmCancelBtn");
  const overlay = modal.querySelector(".modal-overlay");

  if (titleEl && titleKey) titleEl.setAttribute("data-i18n", titleKey);
  if (messageEl && messageKey) messageEl.setAttribute("data-i18n", messageKey);
  if (confirmBtn && confirmKey) confirmBtn.setAttribute("data-i18n", confirmKey);
  if (cancelBtn && cancelKey) cancelBtn.setAttribute("data-i18n", cancelKey);
  applyTranslations(modal);

  return new Promise((resolve) => {
    const close = (result) => {
      modal.classList.add("is-hidden");
      unlockBodyScroll();
      confirmBtn && confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn && cancelBtn.removeEventListener("click", onCancel);
      overlay && overlay.removeEventListener("click", onCancel);
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };

    const onConfirm = () => close(true);
    const onCancel = () => close(false);
    const onKey = (event) => {
      if (event.key === "Escape") close(false);
    };

    confirmBtn && confirmBtn.addEventListener("click", onConfirm);
    cancelBtn && cancelBtn.addEventListener("click", onCancel);
    overlay && overlay.addEventListener("click", onCancel);
    document.addEventListener("keydown", onKey);

    modal.classList.remove("is-hidden");
    lockBodyScroll();
    setTimeout(() => {
      if (confirmBtn) confirmBtn.focus();
    }, 0);
  });
}
```

From settings.html line 86-96 (the shared confirm modal — DO NOT change the markup; the JS toggles classList):
```html
<div id="confirmModal" class="modal is-hidden" role="dialog" ...>
  <div class="modal-overlay"></div>
  <div class="modal-card confirm-card">
    <div id="confirmTitle" class="confirm-title"></div>
    <div id="confirmMessage" class="confirm-body"></div>
    <div class="modal-actions confirm-actions">
      <button class="button ghost" type="button" id="confirmCancelBtn" data-i18n="confirm.cancel">Cancel</button>
      <button class="button danger" type="button" id="confirmOkBtn" data-i18n="confirm.delete">Delete</button>
    </div>
  </div>
</div>
```

From assets/settings.js (current disable-confirm site, lines 234-252):
```js
if (!alreadyConfirmed) {
  var ok = false;
  try {
    ok = await App.confirmDialog({
      titleKey: "settings.confirm.disable.title",
      messageKey: "settings.confirm.disable.body",
      confirmKey: "settings.confirm.disable.confirm",
      cancelKey: "settings.confirm.disable.cancel"
    });
  } catch (e) { ok = false; }
  if (!ok) {
    // Revert
    toggleInput.checked = true;
    return;
  }
  try {
    sessionStorage.setItem("settings.disable.confirmed", "1");
  } catch (e) { /* ignore */ }
}
```

Five callers of `App.initCommon()` to be awaited (all already inside `async () => { ... }`):
- assets/add-session.js:9   — `App.initCommon();`
- assets/settings.js:397    — `App.initCommon();`  (inside an `async function`-shaped DOMContentLoaded; verify it's async, change to async if not)
- assets/sessions.js:2      — `App.initCommon();`
- assets/reporting.js:2     — `App.initCommon();`
- assets/overview.js:54     — `App.initCommon();`
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wire pdf-export.js script tag in add-session.html (closes GAP-1, GAP-2)</name>
  <provenance>GAP-1, GAP-2 — REQ-13 (CRITICAL), REQ-15</provenance>
  <files>add-session.html</files>
  <read_first>
    - add-session.html lines 530-553 (footer scripts block)
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-VERIFICATION.md (gap entries 1 and 2)
    - assets/add-session.js lines 1046-1140 (exportHandleDownloadPdf + exportHandleShare — confirms window.PDFExport is the exact symbol consumed)
  </read_first>
  <action>
    In add-session.html, the footer scripts block currently loads `md-render.js` on line 547 and `add-session.js` on line 548. Insert this exact line BETWEEN them, on its own line, with the same 2-space indentation as the surrounding script tags:

    ```html
      <script src="./assets/pdf-export.js"></script>
    ```

    Final ordering of the four lines must be:
    ```
      <script src="./assets/crop.js"></script>
      <script src="./assets/md-render.js"></script>
      <script src="./assets/pdf-export.js"></script>
      <script src="./assets/add-session.js"></script>
    ```

    Rationale (do NOT change beyond the one line):
    - `pdf-export.js` defines `window.PDFExport`. It must load AFTER `app.js` (no dependency, but ordering keeps the file with its peers) and BEFORE `add-session.js` so `window.PDFExport` is registered by the time the DOMContentLoaded handler in add-session.js runs and binds the Export modal handlers.
    - This single one-line change closes GAP-1 (REQ-13 PDF download) and GAP-2 (REQ-15 Web Share) — same root cause, same fix.
    - Do NOT touch the SW registration block (line 549-551), the toast div, or any other element.
    - Do NOT add `defer` or `async` attributes — the rest of the block uses synchronous loading and that is the contract pdf-export.js was written against.
  </action>
  <verify>
    <automated>grep -c 'src="./assets/pdf-export.js"' add-session.html</automated>
    Expected: exactly `1`. Also run:
    - `grep -n 'pdf-export.js\|md-render.js\|add-session.js' add-session.html | head` — md-render.js line number must be lower than pdf-export.js line number, which must be lower than add-session.js line number.
    - `node -c assets/add-session.js` exits 0 (sanity — we did not touch JS but confirm parse).
  </verify>
  <acceptance_criteria>
    - `grep -E 'src="\./assets/pdf-export\.js"' add-session.html` returns exactly one match.
    - The new script tag appears AFTER `md-render.js` and BEFORE `add-session.js` in the file (verifiable by line-number ordering).
    - No other line in add-session.html is modified (diff is one added line, zero removed lines).
    - Manual smoke (Sapir or operator): open add-session.html, open Export modal, click Download PDF — a real .pdf file with header + section content downloads (not the `export.pdf.failed` toast).
    - Manual smoke: same Export modal, click Share (on a device that exposes navigator.canShare with files) — the OS share sheet appears with a real PDF attached, not an exception.
  </acceptance_criteria>
  <done>
    `<script src="./assets/pdf-export.js"></script>` is present exactly once in add-session.html, sandwiched between md-render.js and add-session.js. window.PDFExport is registered when add-session.html parses. REQ-13 and REQ-15 acceptance flows produce real .pdf output.
  </done>
</task>

<task type="auto">
  <name>Task 2: Await App.initCommon() at all 5 call sites (closes GAP-3 / REVIEW WR-01)</name>
  <provenance>GAP-3 — REQ-3, REQ-5; REVIEW WR-01</provenance>
  <files>assets/add-session.js, assets/settings.js, assets/sessions.js, assets/reporting.js, assets/overview.js</files>
  <read_first>
    - assets/add-session.js lines 1-15 (DOMContentLoaded handler is `async () => { ... }` — confirm before adding await)
    - assets/settings.js lines 390-410 (DOMContentLoaded handler — note current `function () { ... }` form may be sync; if so, change function expression to async)
    - assets/sessions.js lines 1-10 (DOMContentLoaded already async — straight await)
    - assets/reporting.js lines 1-10 (DOMContentLoaded already async — straight await)
    - assets/overview.js lines 48-60 (DOMContentLoaded already async — straight await)
    - assets/app.js around line 348 (`async function initCommon` — confirms it returns a Promise that needs awaiting)
  </read_first>
  <action>
    Add the `await` keyword in front of `App.initCommon()` at each of the five call sites listed below. Exact textual diff per site (single keyword insertion):

    1. **assets/add-session.js line 9** — context already `async () => { ... }`:
       Before: `  App.initCommon();`
       After:  `  await App.initCommon();`

    2. **assets/settings.js line 397** — current handler is `function () { ... }` (synchronous) per the read. Two-line change:
       a. Line 395 — change `document.addEventListener("DOMContentLoaded", function () {` to `document.addEventListener("DOMContentLoaded", async function () {`.
       b. Line 397 — change `App.initCommon();` to `await App.initCommon();`.
       Keep the `if (window.App && typeof App.initCommon === "function")` guard intact — guard wraps the awaited call as: `if (window.App && typeof App.initCommon === "function") { await App.initCommon(); }`.

    3. **assets/sessions.js line 2** — context already `async () => { ... }`:
       Before: `  App.initCommon();`
       After:  `  await App.initCommon();`

    4. **assets/reporting.js line 2** — context already `async () => { ... }`:
       Before: `  App.initCommon();`
       After:  `  await App.initCommon();`

    5. **assets/overview.js line 54** — context already `async () => { ... }`:
       Before: `  App.initCommon();`
       After:  `  await App.initCommon();`

    Do NOT change anything else in any of these files. Do NOT refactor the surrounding handlers. Do NOT remove the `typeof App.initCommon === "function"` guard in settings.js — keep the conditional, just `await` inside it.
  </action>
  <verify>
    <automated>grep -E "await App\.initCommon" assets/add-session.js assets/settings.js assets/sessions.js assets/reporting.js assets/overview.js | wc -l</automated>
    Expected: `5`.

    Additionally:
    - `node -c assets/add-session.js && node -c assets/settings.js && node -c assets/sessions.js && node -c assets/reporting.js && node -c assets/overview.js` — all five syntax-check pass (await inside non-async fn is a SyntaxError, so this catches the settings.js async-fn omission).
    - `grep -nE "App\.initCommon" assets/{add-session,settings,sessions,reporting,overview}.js` — every match is preceded by `await ` (no bare `App.initCommon()` survives).
    - `grep -n "DOMContentLoaded" assets/settings.js | head -3` — the handler signature now contains `async`.
  </verify>
  <acceptance_criteria>
    - All 5 call sites use `await App.initCommon()` (exact substring match count = 5).
    - All 5 files pass `node -c`.
    - assets/settings.js DOMContentLoaded handler is now declared `async function () { ... }` (otherwise the await is a SyntaxError).
    - Manual smoke: open add-session.html for a NEW session — disabled sections are hidden on first paint (no flicker of the 9 sections then sudden hide). Open Settings page — rows render with their custom labels (if any are saved) on first paint, not after a microtask.
    - No regression: existing destructive flows (delete client / delete session) still work; the await change only affects timing, not behavior.
  </acceptance_criteria>
  <done>
    All 5 callers await App.initCommon(). _sectionLabelCache is guaranteed populated before applySectionVisibility(true|false) runs at add-session.js:1481/1485 and before the Settings page renders rows. WR-01 is closed.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add tone option to confirmDialog and use tone:'neutral' for first-disable confirm (closes GAP-4)</name>
  <provenance>GAP-4 — REQ-21; REVIEW IN-02</provenance>
  <files>assets/app.js, assets/settings.js</files>
  <read_first>
    - assets/app.js lines 443-489 (current confirmDialog implementation — destructure params, button references, close logic)
    - settings.html lines 86-96 (shared confirm modal markup with `class="button danger"` baked into #confirmOkBtn)
    - assets/settings.js lines 230-252 (disable-confirm call site that needs tone:'neutral')
    - .planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-UI-SPEC.md (confirm any "neutral primary" class name guidance — codebase uses `button-primary` already)
    - All other call sites of confirmDialog (regression scope check):
      `grep -nE "confirmDialog\s*\(" assets/*.js` — each non-settings.js call must remain default tone (red). Spot-check delete-client and delete-session paths.
  </read_first>
  <action>
    Two edits — one in `assets/app.js`, one in `assets/settings.js`.

    **Edit A — assets/app.js (confirmDialog):**

    Modify the function signature on line 443 to accept an optional `tone` parameter, default `'danger'` (preserves current behavior for all existing destructive callers):

    Before:
    ```js
    function confirmDialog({ titleKey, messageKey, confirmKey = "confirm.delete", cancelKey = "confirm.cancel" }) {
    ```

    After:
    ```js
    function confirmDialog({ titleKey, messageKey, confirmKey = "confirm.delete", cancelKey = "confirm.cancel", tone = "danger" }) {
    ```

    Then, immediately AFTER the line `applyTranslations(modal);` (currently line 459), insert a small block that toggles the OK button class according to `tone`:

    ```js
    // Tone: 'danger' (default — destructive red) or 'neutral' (button-primary).
    // We swap classes on open and restore on close so other consumers' default styling is unaffected.
    let _restoreConfirmBtnClass = null;
    if (confirmBtn) {
      if (tone === "neutral" && confirmBtn.classList.contains("danger")) {
        confirmBtn.classList.remove("danger");
        confirmBtn.classList.add("button-primary");
        _restoreConfirmBtnClass = "danger";
      } else if (tone === "danger" && confirmBtn.classList.contains("button-primary") && !confirmBtn.classList.contains("danger")) {
        // Self-heal in case a prior neutral call leaked (defensive — close() restores, but if a caller crashes mid-dialog this resets state).
        confirmBtn.classList.remove("button-primary");
        confirmBtn.classList.add("danger");
        _restoreConfirmBtnClass = "button-primary";
      }
    }
    ```

    Then, INSIDE the existing `close = (result) => { ... }` arrow on line ~462, add a class restoration step BEFORE `resolve(result);`. The updated close function looks like:

    ```js
    const close = (result) => {
      modal.classList.add("is-hidden");
      unlockBodyScroll();
      // Restore the button class if we swapped it for tone.
      if (confirmBtn && _restoreConfirmBtnClass) {
        if (_restoreConfirmBtnClass === "danger") {
          confirmBtn.classList.remove("button-primary");
          confirmBtn.classList.add("danger");
        } else {
          confirmBtn.classList.remove("danger");
          confirmBtn.classList.add("button-primary");
        }
        _restoreConfirmBtnClass = null;
      }
      confirmBtn && confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn && cancelBtn.removeEventListener("click", onCancel);
      overlay && overlay.removeEventListener("click", onCancel);
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };
    ```

    Do not change anything else in confirmDialog. Do not modify the JSDoc above the function (leave it as-is OR add one line `@param {'danger'|'neutral'} [options.tone='danger']` — operator's choice, but keep the file diff small).

    **Edit B — assets/settings.js (disable-confirm site, around line 237):**

    Inside the `if (!alreadyConfirmed)` block, the call currently reads:

    ```js
    ok = await App.confirmDialog({
      titleKey: "settings.confirm.disable.title",
      messageKey: "settings.confirm.disable.body",
      confirmKey: "settings.confirm.disable.confirm",
      cancelKey: "settings.confirm.disable.cancel"
    });
    ```

    Add one property:

    ```js
    ok = await App.confirmDialog({
      titleKey: "settings.confirm.disable.title",
      messageKey: "settings.confirm.disable.body",
      confirmKey: "settings.confirm.disable.confirm",
      cancelKey: "settings.confirm.disable.cancel",
      tone: "neutral"
    });
    ```

    No other call site of `confirmDialog` is to be modified. Existing destructive consumers (delete-client, delete-session, etc.) must remain default-tone (red).
  </action>
  <verify>
    <automated>grep -n "tone" assets/app.js | head -10 && grep -n "tone:.*neutral" assets/settings.js && node -c assets/app.js && node -c assets/settings.js</automated>
    Expected:
    - At least 3 hits for `tone` in assets/app.js (signature default, neutral branch, danger restore).
    - Exactly 1 hit for `tone:.*neutral` in assets/settings.js.
    - Both files pass `node -c` cleanly.

    Regression check (no other consumer was changed):
    - `grep -nE "confirmDialog\s*\(" assets/*.js | grep -v settings.js` — for each match, eyeball that the call object does NOT contain `tone:` (i.e. they all use default 'danger'). The list of expected default-tone call sites: delete-client, delete-session, any other destructive flows.
  </verify>
  <acceptance_criteria>
    - `grep -n "tone" assets/app.js` shows the new parameter handling (signature default `tone = "danger"` + neutral branch swap + close-time restoration).
    - `grep -nE "tone:\s*['\"]neutral['\"]" assets/settings.js` returns exactly one match (the disable-confirm site).
    - `node -c assets/app.js` exits 0; `node -c assets/settings.js` exits 0.
    - Manual smoke (operator): open Settings page → toggle off any free-text section (e.g. "Heart Shield"). Confirm dialog opens. The OK button reads "Yes, disable" and is styled with `button-primary` (NOT red). Click Cancel → dialog closes, no class leak (open dev tools, `document.getElementById('confirmOkBtn').className` should read `button danger` again).
    - Manual smoke (regression): trigger delete-session flow on the sessions page → confirm dialog opens with the destructive RED OK button (default tone preserved). Same for delete-client.
    - No CSS file is modified — `button-primary` is an existing utility class in the codebase.
  </acceptance_criteria>
  <done>
    confirmDialog accepts `tone: 'danger' | 'neutral'` (default 'danger'). Settings page first-time-disable dialog renders the OK button in `button-primary` styling, matching the warning copy ("This won't delete existing data"). All other destructive consumers of confirmDialog stay red. REQ-21's user-facing intent is now met.
  </done>
</task>

</tasks>

<verification>
After all 3 tasks, run these checks (the executor MUST run them before declaring the plan complete):

```bash
# GAP-1 / GAP-2: pdf-export.js script tag wired
grep -c 'src="./assets/pdf-export.js"' add-session.html
# Expected: 1

# Ordering check: md-render BEFORE pdf-export BEFORE add-session in the HTML
grep -n 'md-render.js\|pdf-export.js\|add-session.js' add-session.html | grep -v 'add-session.js"></script>$' | head
# Visually confirm increasing line numbers in this order: md-render.js, pdf-export.js, add-session.js

# GAP-3: all 5 callers awaited
grep -E "await App\.initCommon" assets/add-session.js assets/settings.js assets/sessions.js assets/reporting.js assets/overview.js | wc -l
# Expected: 5

# GAP-3: no bare unawaited callers remain
grep -nE "(^|[^t])App\.initCommon\(\)" assets/{add-session,settings,sessions,reporting,overview}.js | grep -v "await App.initCommon"
# Expected: empty (no output)

# GAP-4: tone parameter in confirmDialog
grep -nE 'tone\s*=\s*"danger"' assets/app.js
# Expected: 1 hit (the default in the signature)

# GAP-4: tone:'neutral' at the settings.js disable site
grep -cE "tone:\s*['\"]neutral['\"]" assets/settings.js
# Expected: 1

# Syntax check: every modified JS file parses
node -c assets/app.js && \
  node -c assets/add-session.js && \
  node -c assets/settings.js && \
  node -c assets/sessions.js && \
  node -c assets/reporting.js && \
  node -c assets/overview.js
# Expected: all exit 0

# Regression: no other confirmDialog consumer accidentally got tone added
grep -nE "confirmDialog\s*\(" assets/*.js | grep -v "settings.js"
# Manually verify each result: the call object does NOT include tone:.

# REQ-13/REQ-15 manual smoke (operator + Sapir for Hebrew):
# 1. Open add-session.html in browser, create or open a session
# 2. Click Export → step through to step 3 → click Download PDF
#    → expect a real .pdf file in Downloads with filename {clientSlug}_{ISO-date}.pdf
# 3. Same modal → click Share (on iOS Safari / Android Chrome with file-share support)
#    → expect OS share sheet with PDF attached
# 4. Open the .pdf in a viewer → expect header (client / date / type) + section bodies rendered

# REQ-21 manual smoke:
# 1. Open Settings page → toggle off a free-text section
# 2. Confirm dialog opens → "Yes, disable" button is button-primary (NOT red)
# 3. Cancel → dialog closes, toggle reverts (existing behavior)
# 4. Reload page → toggle off again → dialog appears once per visit (existing behavior, not a regression)
# 5. From Sessions page → delete a session → confirm dialog OK button still RED (default tone)
```

If any grep fails the expected count, or any `node -c` fails, the plan is NOT done — fix and re-verify.
</verification>

<success_criteria>
1. `add-session.html` contains exactly one `<script src="./assets/pdf-export.js"></script>` line, positioned between `md-render.js` and `add-session.js` in the footer scripts block.
2. All 5 call sites — assets/add-session.js:9, assets/settings.js:397, assets/sessions.js:2, assets/reporting.js:2, assets/overview.js:54 — use `await App.initCommon()`.
3. assets/settings.js DOMContentLoaded handler is declared `async function () { ... }` (required for the await on line 397 to be syntactically valid).
4. `assets/app.js` confirmDialog accepts `tone: 'danger' | 'neutral'` with default `'danger'`; opens swap class on `#confirmOkBtn` (`danger` ↔ `button-primary`); close restores original class.
5. `assets/settings.js` disable-confirm call site (around line 237) passes `tone: "neutral"`.
6. All 6 modified JS files pass `node -c`.
7. No regression in other `confirmDialog` consumers — they remain default tone (red).
8. Manual: PDF download produces a real .pdf; Web Share attaches a real PDF; first-disable confirm OK button is neutral primary; delete-session OK button is still red.
9. REQ-13, REQ-15, REQ-3, REQ-5, REQ-21 — all five requirements move from BLOCKED/PARTIAL/FAILED to SATISFIED.
</success_criteria>

<output>
After completion, create `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-09-close-verification-gaps-SUMMARY.md` documenting:
- Each gap closed and the file diff that closed it
- Verification command output (grep counts, node -c exit codes)
- Manual smoke results (PDF download produced real file? Share sheet showed PDF? Confirm dialog OK button neutral on disable, red on delete?)
- Any unexpected regressions found in other confirmDialog consumers
- Hand-off to Sapir for Hebrew RTL + 375px mobile + PWA upgrade verification (the 3 human-verification items from 22-VERIFICATION.md that depend on these gaps closing first)
</output>
