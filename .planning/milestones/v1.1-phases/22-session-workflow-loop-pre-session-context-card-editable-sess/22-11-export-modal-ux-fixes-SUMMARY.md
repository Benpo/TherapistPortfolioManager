---
phase: 22-session-workflow-loop-pre-session-context-card-editable-sess
plan: 11
subsystem: export-modal-ux
type: execute
wave: 2
depends_on: ["22-10"]
gap_closure: true
requirements: [REQ-7, REQ-8, REQ-12]
key-files:
  modified:
    - add-session.html
    - assets/add-session.js
    - assets/app.css
    - assets/i18n-en.js
    - assets/i18n-de.js
    - assets/i18n-he.js
    - assets/i18n-cs.js
commits:
  - 5ab01f1: fix(22-11) event-delegated close handler + labelled step indicator
  - 37aa84c: fix(22-11) per-step contextual guidance for therapist self-orientation
  - b61fc9e: fix(22-11) add markdown formatting cheatsheet to Step 2
metrics:
  tasks_completed: 3
  commits: 3
  files_changed: 7
  completed: 2026-05-07
---

# Phase 22 Plan 11: Export Modal UX Fixes Summary

Closed 3 UAT gaps on the Phase 22 export modal: labelled step indicator (1 Choose / 2 Edit / 3 Export), per-step "Step N of 3 — …" contextual guidance, a collapsible markdown formatting cheatsheet on Step 2, and a defensive event-delegated close handler that fixes the Step 3 X-button bug.

## Tasks completed

| Task | Description | Commit |
| ---- | ----------- | ------ |
| 1 | Event-delegated close handler + labelled step indicator | `5ab01f1` |
| 2 | Per-step contextual guidance (Step 1/2/3 helper paragraphs) | `37aa84c` |
| 3 | Step 2 markdown formatting cheatsheet | `b61fc9e` |

## UAT gap → fix evidence

| Gap (truth) | Status | Evidence |
| ----------- | ------ | -------- |
| Step 1 makes it visually obvious that 1/2/3 are sequential steps | satisfiable | `add-session.html` L401-415 — three `.export-step-pill` spans wrap each numbered dot with a labelled `.export-step-label` span. Active pill picks up `--color-primary` via the `.export-step-pill.is-active .export-step-label` rule. `assets/add-session.js` `exportSetActiveStep` (L979-997) mirrors `is-active`/`is-completed` onto the pill wrapper. |
| Each export step gives contextual guidance — what each screen does | satisfiable | `add-session.html` has exactly 3 occurrences of `class="export-step-helper"` (one per step). Step 2 helper is brand-new (key `export.step2.helper`); Steps 1+3 helpers had their copy expanded to "Step N of 3 — …" plain-language form. `.export-step-helper` CSS (greyed text + soft `border-block-end` divider) defined in `assets/app.css` Phase 22 block. |
| Step 2 includes a plain-language formatting cheatsheet | satisfiable | `add-session.html` Step 2 contains `<details class="export-format-help">` with 4 bullets (bold/italic/heading/list). Each bullet pairs a literal markdown `<code>` chip with a `data-i18n`-attributed explanation span. CSS in `assets/app.css` styles the panel + makes the caret RTL-aware. 5 new i18n keys (`export.format.help.{title,bold,italic,heading,list}`) added to all 4 locales. |
| Step 3 X (close) button dismisses the modal | satisfiable | `assets/add-session.js` `openExportDialog` now wires a single delegated click listener on the modal root (`onModalClick`) that catches `target.closest(".modal-close")` — works on every step regardless of stacking. Belt-and-braces: `.export-card .modal-close { z-index: 2 }` + `.export-card .export-output-card { position: relative; z-index: 1 }` in `assets/app.css`. |

## Root cause: Step 3 X-button bug

The `.modal-close` element has `position: absolute; top: 1rem; inset-inline-end: 1rem` but **no `z-index`**. It lives inside `.modal-card` which DOES create a stacking context (`z-index: 1`). On Steps 1 and 2 the body content does not visually overlap the X. On Step 3 the `.export-output-card` buttons (rendered later in DOM order, full-width, ≥64px tall) sit at the same auto stacking level — and *later sibling DOM order wins paint order at the same level*. Result: the X-button's 36×36 hit area was being absorbed by the topmost output card (`#exportDownloadPdf`) on Step 3, so click events on the visual X were actually hitting the PDF download button (which had its own stopped event because it triggered the PDF flow rather than dismissing).

**Fix is two-pronged** so it survives any future regression:
1. **Event delegation on the modal root** catches clicks via bubbling — even if some other layer stacks on top of `.modal-close`, the click still bubbles to the modal and the closest-matcher fires `exportCloseDialog(false)`.
2. **`.export-card .modal-close { z-index: 2 }`** elevates the X above the output cards. `.export-card .export-output-card { position: relative; z-index: 1 }` formalises the cards' stacking level so the difference is explicit.

**Other modals on the same defect:** This issue is specific to `.export-card` because of the unusual layout (multiple full-width 64px buttons stacked below the title). Other modals (confirm dialog, edit-client modal) have their close buttons plus a single body — no stacking conflict. No remediation needed elsewhere.

## Files changed

- `add-session.html` — labelled stepper markup, Step 2 helper paragraph + format-help `<details>` block, `.export-step-helper` class on Step 1/3 helpers
- `assets/add-session.js` — `onModalClick` delegated listener, cleanup simplified, `exportSetActiveStep` extended to mirror state on `.export-step-pill`
- `assets/app.css` — Phase 22-11 CSS additions: `.export-step-pill`, `.export-step-label`, `.export-step-helper`, `.export-format-help`, `.export-format-help-list`, plus `.export-card .modal-close { z-index: 2 }` defensive guard
- `assets/i18n-en.js` — added 9 new keys (3 stepper labels + 1 step2.helper + 5 format.help.*); expanded values for step1.helper + step3.helper
- `assets/i18n-he.js` — added 9 new keys (real Hebrew translations); expanded helpers
- `assets/i18n-de.js` — added 9 new keys (English fallback values flagged with `// TODO i18n: translate to German`); expanded helpers also flagged TODO
- `assets/i18n-cs.js` — added 9 new keys (English fallback values flagged with `// TODO i18n: translate to Czech`); expanded helpers also flagged TODO

## Verification grep results

```
JS_PARSE_ALL_OK
DELEGATE_OK
pill_count: 3
helper_count: 3
FORMAT_OK
ALL_KEYS_DONE  (all 9 new keys present in en/de/he/cs)
CSS rules present (16 lines matching the 5 new selectors)
Served HTML on http://localhost:8000/add-session.html includes the new pill/helper/format-help markup
```

## Manual UAT steps for re-verification

User should hard-reload (cmd-shift-R / clear cache; service worker cache version bumped to v63 by pre-commit hooks) then:

1. Open any session in read mode; click **Export**.
2. **Step 1**: confirm visual stepper reads "1 Choose · 2 Edit · 3 Export"; "Choose" highlighted in primary colour. Helper paragraph reads "Step 1 of 3 — Choose which session sections…". Click **X** — modal dismisses.
3. Reopen Export. Click **Next: Edit document**.
4. **Step 2**: stepper now highlights "Edit"; "Choose" appears as completed. Helper paragraph reads "Step 2 of 3 — Edit your document…". Click X — modal dismisses.
5. Reopen Export. Advance to Step 2. Find **Formatting tips (click to expand)** below the editor/preview area; click it open. Verify 4 bullets render: `**bold**`, `*italic*`, `# Heading`, `- list item`, each paired with plain-language explanation.
6. In editor, type `**hello**` and confirm live preview shows "**hello**" rendered bold.
7. Advance to Step 3. Stepper highlights "Export"; "Choose" + "Edit" both shown completed. Helper reads "Step 3 of 3 — Choose how to deliver…". Click **X** — modal dismisses (was previously broken).
8. Switch language to **Hebrew**. Repeat steps 1-7. Verify all stepper labels, helper paragraphs, formatting cheatsheet bullets, and details summary read in Hebrew. Verify caret in formatting tips is `◂` (RTL) and rotates `-90deg` when open. Verify layout flows right-to-left.
9. Switch language to **German** or **Czech**. The stepper/helper/cheatsheet copy will be visible but in English (TODO i18n placeholders) — this is the intended interim state per Plan 22-10's pattern. Functional behaviour unchanged.

## Deviations

1. **i18n approach for DE/CS deviated from the plan-as-written**: the plan provided full DE/CS translations inline. The orchestrator instruction (point 5 of execution rules) overrode this and required English fallback values + `// TODO i18n:` comments matching Plan 22-10's pattern. Applied the orchestrator pattern across all 9 new keys per locale, plus also flagged the EXPANDED Step 1/Step 3 helper copies (which retained their previous DE/CS short translations) — those expansions are now flagged TODO i18n with the previous shorter Czech/German copy preserved in the comment for translator context. Net result: DE/CS users see the new English copy with explicit translator flags rather than an inconsistent mix of old short DE/CS translations and new long English ones.

2. **No explicit fallback text update on the inline `<p>Choose how to deliver the document.</p>` for Step 3**: the data-i18n attribute is correctly set, so once `App.applyTranslations(modal)` runs in `openExportDialog` (line 1210, before the modal becomes visible), the user sees the translated longer copy. The inline default is only ever visible during the brief pre-translation render which never paints because the modal starts hidden. No deviation cost.

3. **Service worker cache bumped 3x by pre-commit hook** (v60 → v61 → v62 → v63). This is the hook's intended behaviour — every commit that touches a cached asset triggers a bump. Existing PWAs will pick up v63 on next visit.

## Self-Check: PASSED

- File `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-11-export-modal-ux-fixes-SUMMARY.md`: written
- Commit `5ab01f1`: present (`git log` confirmed)
- Commit `37aa84c`: present
- Commit `b61fc9e`: present
- All 9 new i18n keys present in all 4 locales: confirmed by grep loop
- 3 occurrences of `export-step-helper` in `add-session.html`: confirmed
- 3 occurrences of `export-step-pill` in `add-session.html`: confirmed
- Phase 22-11 CSS additions present (16 selector lines): confirmed
- `node -c` passes on all 5 modified JS files: confirmed
- Served HTML on http://localhost:8000 reflects changes: confirmed via curl
