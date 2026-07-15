---
phase: 46-rich-text-toolbar-editor
reviewed: 2026-07-15T16:20:00Z
depth: deep
round: 2
scope: "commits bb9bb83 (probe) + c90155d (app.css export Step-2 fix)"
files_reviewed: 2
files_reviewed_list:
  - assets/app.css
  - tests/webkit/46-export-step2-layout.mjs
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 46 (gap round 2): Code Review Report — R2

**Reviewed:** 2026-07-15T16:20:00Z
**Depth:** deep (cross-file: CSS ↔ shipped HTML ↔ mount JS)
**Files Reviewed:** 2
**Status:** issues_found (no blockers)

## Summary

Focused review of the two-commit export Step-2 layout fix (`c90155d`, 23 lines of
`assets/app.css`) and its RED-first WebKit probe (`bb9bb83`, new
`tests/webkit/46-export-step2-layout.mjs`).

**The CSS fix is correct and well-scoped.** I traced every invariant and every
regression path the prompt named, and cross-checked the load-bearing DOM premise
against the shipped HTML and mount code rather than trusting the comments:

- **Selector faithfulness (verified, not assumed):** `#exportEditor` is a *direct*
  child of `.export-edit-area` (`add-session.html:463-464`); the persistent bar is
  docked `insertAdjacentElement('beforebegin', field)` (`rich-toolbar.js:252`,
  mounted at `export-modal.js:85`), so it too becomes a direct child. The new
  `.export-card.is-editor-step .export-edit-area > .rich-toolbar` rule (specificity
  0,4,0) therefore matches ONLY the export bar and beats the base `.rich-toolbar`
  (0,1,0), flipping `position: relative → sticky` as intended. The 7 note-field
  toolbars live outside `.export-card` and never match; the preview pane is
  `.rich-toolbar-preview` (not `.rich-toolbar`) so it never matches either. No leak.
- **min/max safety (verified):** `.export-card` IS a `.modal-card`
  (`add-session.html:420`), whose base cap is `max-height: 90vh/90dvh`
  (`app.css:1716-1717`). The floor `min-block-size: min(640px, 90dvh)` is always
  ≤ 90dvh, so `min` can never exceed `max` on any viewport — the comment's claim
  holds and the card can never be forced taller than the screen.
- **Mobile takeover intact & unbroken:** the `@media (max-width:768px)` block
  (`app.css:3729-3748`) is byte-unchanged. The new (non-media) floor still applies
  there, but `min(640px, 90dvh) < 100dvh = block-size`, so the full-screen takeover
  is never overridden — the dual-`dvh` cap is exactly what keeps this safe when the
  keyboard shrinks the viewport.
- **Other invariants:** `.is-maximized.is-editor-step` (`3375-3380`) untouched; the
  three load-bearing zeroing declarations (`min-height:0` at `1725`,
  `min-block-size:0` at `3390`/`3396`) untouched; `vh`-then-`dvh` order correct in
  both new declarations (`3372-3373`); no planning IDs in the app.css comments;
  only `app.css` + the new test file changed (no JS/i18n/sw.js/version touch).
- **Comment accuracy:** both new comment blocks state true constraints (crossover
  at 1280px, the cap-vs-max-height guarantee, the base bar's opaque surface +
  `--z-popover`, logical `inset-block-start`). No repeat of the R1 false-comment
  class of defect.
- **Probe falsifiability:** the assertions are genuinely non-vacuous. A load
  failure or a missing element throws or fails an assert (never silent-passes); A
  is double-guarded (rendered `height >= 40` AND `clientHeight >= scrollHeight-2`,
  which catches flex-compression clipping because the bar's `overflow-y:hidden`
  keeps `scrollHeight` at natural content height); C hard-asserts the overflow
  precondition before testing the pin. The DE pass uses the real `portfolioLang`
  key (`app.js:231/303/908`), so it genuinely re-renders in German.

No blocker- or warning-level correctness or security defect in the shipped CSS.
The findings below are one test-coverage gap and two test-robustness nits — all in
the ad-hoc probe, none blocking.

## Warnings

### WR-01: Probe reconstructs the Step-2 DOM state by hand instead of driving the real export flow — guards the CSS, not the JS path that produces it

**Status:** PARTIALLY FIXED — commit `234e55d` (2026-07-15); real-flow pass explicitly DEFERRED.
The minimum fix landed: `assertUniqueSelectors()` now runs at the start of every
A/B/C pass and hard-fails if ANY measured selector (bar, edit area, editor, card,
preview button) resolves to 0 or >1 nodes, plus asserts the edit area is the scroll
container (`overflow-y: auto`). Selector/nesting drift in export-modal.js /
rich-toolbar.js / add-session.html now fails the gate loudly instead of
false-GREENing against the hand-built DOM. The "drive the real open→Next flow" pass
is deliberately NOT implemented this round: the 46-16 human gate drives the real
export flow end-to-end on real devices this round, and the probe remains an ad-hoc
manual gate (not CI) — the real-flow pass would duplicate the human gate's coverage
at this stage. Revisit if the probe is ever promoted to CI.

**File:** `tests/webkit/46-export-step2-layout.mjs:139-176` (`setupExportStep2`)

**Issue:** The probe never clicks through the real export flow (open modal → Next →
`exportSetActiveStep(2)` → `onNext` populating the editor). Instead it manually
`classList.add('is-editor-step')`, toggles `.export-step.is-active` by
`dataset.step`, and injects 64 lines via `editor.value = …`. It also *re-mounts* the
toolbar itself if boot didn't. This is a deliberate, documented modelling choice for
a CSS-geometry gate, and I verified the modelled class structure matches the shipped
HTML today — so the gate is faithful *right now*. But it means the probe and the fix
share the same premise: the exact class/nesting shape. If a future change to
`export-modal.js`/`add-session.js` renames a class, docks the bar at a different
node, or applies `is-editor-step` to a different element, the *real* Step-2 surface
would regress while this gate — which purports to reproduce "production's export
Step-2 state" — stays GREEN against its hand-built DOM. This repo has shipped
false-GREEN gates before precisely when a test validated a modelled surface rather
than the executed code path.

**Fix:** Drive the real code path for at least one pass — trigger the actual
export-open + Next handlers so the app's own JS produces the Step-2 DOM, then assert
the selectors resolve to exactly one element *before* measuring:
```js
// after setup, fail loudly if the real structure ever diverges from the model
const shape = await page.evaluate((sel) => ({
  bars: document.querySelectorAll(sel.bar).length,
  areaIsScrollParent:
    getComputedStyle(document.querySelector(sel.area)).overflowY === 'auto'
}), SEL);
assert(shape.bars === 1, 'exactly one export bar resolves via the production selector',
  'count=' + shape.bars);
```
At minimum, add an assertion that `SEL.bar` resolves to exactly one node so a
selector/nesting drift fails the gate instead of silently passing.

## Info

### IN-01: Static file server's traversal guard uses a prefix check without a path separator

**Status:** FIXED — commit `234e55d` (2026-07-15). The guard is now
`if (filePath !== REPO_ROOT && !filePath.startsWith(REPO_ROOT + path.sep))` —
sibling-directory escapes are rejected while serving the repo root itself (if ever
requested exactly) still works.

**File:** `tests/webkit/46-export-step2-layout.mjs:127` (`if (!filePath.startsWith(REPO_ROOT))`)

**Issue:** `path.join(REPO_ROOT, urlPath)` followed by `filePath.startsWith(REPO_ROOT)`
admits a sibling-directory escape: a request like `/../TPM_Docs/secret` normalises to
`…/TherapistPortfolioManager_docs`-style siblings that still `startsWith` the
separator-less `REPO_ROOT` string. Impact is effectively nil — the server binds to
`127.0.0.1` on an ephemeral port and is driven only by the probe's own WebKit, with
no untrusted client — so this is a robustness nit, not a live vulnerability. Worth
tightening so the probe can't be copy-pasted into a less-isolated context later.

**Fix:** Compare against `REPO_ROOT + path.sep` (and allow the root itself):
```js
if (filePath !== REPO_ROOT && !filePath.startsWith(REPO_ROOT + path.sep)) {
  res.writeHead(403); res.end('forbidden'); return;
}
```

### IN-02: Hardcoded absolute Playwright path and user-specific WebKit cache make the probe non-portable

**Status:** ACCEPTED — no code change (2026-07-15). Convention shared with
`tests/webkit/41-rtl-geometry.mjs` (same pinned path, same loud exit-2 runbook);
the probe is ad-hoc/manual and excluded from `npm test`, so portability is a
conscious, documented non-goal.

**File:** `tests/webkit/46-export-step2-layout.mjs:56-57` (`PINNED_PLAYWRIGHT`) and the
`~/Library/Caches/ms-playwright` dependency noted in the header

**Issue:** The probe resolves Playwright from
`/Users/ben/Claude-Code-Sandbox/TPM_Docs/video-pipeline/node_modules/playwright` and
depends on a macOS user-cache WebKit binary. On any other machine/CI the top-level
`await import` fails and the probe `process.exit(2)`s. This is consistent with the
existing convention (`tests/webkit/41-rtl-geometry.mjs` does the same) and the file
is explicitly ad-hoc/manual and excluded from `npm test`, so it is acceptable as-is —
flagged only so the portability constraint is a conscious, documented choice rather
than a latent surprise if this ever needs to run in CI. The failure path is loud
(exit 2 with a runbook), not silent, which is the important property.

**Fix:** None required. If portability is ever wanted, resolve the pin via an env var
(`PLAYWRIGHT_DIR`) with the current absolute path as the fallback default.

---

_Reviewed: 2026-07-15T16:20:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep · Round: 2_
