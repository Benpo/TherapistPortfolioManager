---
phase: 27-backup-restore-modal-visual-cohesion-ui-spec-pass
reviewed: 2026-06-15T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - assets/app.css
  - assets/tokens.css
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 27: Code Review Report

**Reviewed:** 2026-06-15
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Phase 27 is a visual-only CSS pass on the Backup & Restore modal. The change set is exactly as described: four cohesion deltas in `assets/app.css` (removed the tinted-card treatment from `.backup-modal-section--contents` and `.backup-test-password-card`; collapsed `.backup-modal-section-heading` from `1.4rem` to `1.125rem` and deleted the redundant `.backup-modal-section--import` heading override; recoloured `.backup-modal-import-warning` from the `--color-danger-*` family to `--color-warning-*`; aligned the two inline-message bands' box metrics) plus two dark-mode token overrides in `assets/tokens.css` (`--color-warning-bg: #3a2f00`, `--color-warning-text: #ffd966`).

I verified the change set adversarially:

- **Contrast is sound.** The new dark amber pair `#ffd966` on `#3a2f00` measures **9.69:1** (WCAG-AA requires 4.5:1), so the comment's AA claim holds. The 4px `border-inline-start` colour (`#ffd966`) against the `#202828` dark surface is **11.01:1**.
- **No test breakage.** I ran `tests/25-13-css-audit.test.js` — **14 passed, 0 failed**. The deletion of the `.backup-modal-section--import` heading override does not break the D7 test (line 186) because it tolerates a missing rule via `.flat()` and the gap is supplied by `.backup-modal-button-row`. The D6 test (line 150) still passes because the kept `display:flex` + `gap: var(--space-md, 16px)` in `.backup-test-password-card` satisfies it.
- **Conventions respected.** `var(--token, #fallback)` idiom preserved; `border-inline-start` (logical) used throughout; `--color-danger-*` left with no dark override as intended.

No BLOCKER-tier defects in the changed lines. The two warnings below concern a documentation/scope claim that does not match reality and a self-consistency gap, neither of which produces incorrect rendering. Three info items record duplication and pre-existing fragilities the phase touches.

## Warnings

### WR-01: Dark-mode warning override silently re-themes five additional consumers the comment does not mention

**File:** `assets/tokens.css:184-191` (and consumers in `assets/app.css`)
**Issue:** The `[data-theme="dark"]` block now overrides the *semantic* tokens `--color-warning-bg` / `--color-warning-text` globally. The Phase 27 comment scopes the intent to "the Backup-modal Import warning and the test-password error result" — but these are shared semantic tokens with **seven** consumers, so the dark override silently re-themes five others that were never visually reviewed in this phase:

- `assets/app.css:1596-1597` — `.photos-usage-verdict--optional`
- `assets/app.css:2135-2136` — `.db-error-banner--blocked`
- `assets/app.css:2299-2300` — `.passphrase-irreversible`
- `assets/app.css:2427-2428` — `.passphrase-rules`
- `assets/app.css:3688-3689` — `.backup-cloud-btn--warning`

I checked each for contrast safety in dark mode and all pass (e.g. `.photos-usage-verdict--optional` pairs `--color-text` `#e8eeed` on the new `#3a2f00` bg = **11.27:1**; `.backup-cloud-btn--warning` = **9.69:1**), so this is **not** a correctness BLOCKER. The risk is process/maintenance: a future reader trusting the comment's "shared by [two bands]" framing will under-estimate the blast radius of a token edit. This is the most likely place a later change introduces a real dark-mode regression.

**Fix:** Broaden the comment to name the token's true reach, e.g.:
```css
/* Warning palette (Phase 27) — dark overrides for the SEMANTIC --color-warning-*
 * tokens. These are shared by every amber inline band app-wide: the Backup-modal
 * Import warning + test-password error result (the Phase 27 focus), and also
 * .photos-usage-verdict--optional, .db-error-banner--blocked,
 * .passphrase-irreversible, .passphrase-rules, .backup-cloud-btn--warning.
 * All verified AA-readable on #202828 (≥9.6:1). */
```
No CSS change required — the override is correct; only the comment under-states scope.

### WR-02: The two inline bands are documented as "ONE component" but are not metric-identical (font-weight + margin diverge)

**File:** `assets/app.css:3744-3762` (`.backup-modal-import-warning`) vs `assets/app.css:3805-3819` (`.backup-test-password-result` / `.error`)
**Issue:** The comment at 3744-3753 asserts the two bands now use "identical box metrics ... so the two inline bands read as ONE component." Tracing the actual declarations, they are *not* identical:

| Property | `.backup-modal-import-warning` | `.backup-test-password-result.error` |
|---|---|---|
| padding | `8px 16px` | `8px 16px` (inherited) — match |
| border-radius | `4px` | `4px` (inherited) — match |
| border-inline-start | `4px solid warning-text` | `4px solid warning-text` — match |
| **font-weight** | **`700`** (line 3761) | **unset** (inherits, ~400) |
| **margin** | **`margin-bottom: 16px`** (3759) | **`margin: 8px 0 0 0`** (3806) |

The colour + border + padding + radius do match, so the "one severity palette" goal is met visually. But the "identical box metrics / ONE component" claim is falsifiable and false on two axes: the Import warning renders **bold** while the test-password error renders **regular weight**, and their margins differ (the Import band reserves space below, the result band reserves space above). Whether this matters is a design call — but the comment over-claims, which is the kind of drift that erodes trust in the codebase's own documentation.

**Fix:** Either (a) make them genuinely identical by promoting the shared metrics into one rule both selectors use, or (b) soften the comment to claim only what is true — same colour family + same padding/radius/border, deliberately differing weight/margin because one is a standing alert and the other is a transient result line. Minimal honest fix:
```css
/* ... the SAME --color-warning-* tokens and the same padding/radius/4px
 * border-inline-start as .backup-test-password-result, so the two bands
 * read as the SAME severity family. (Weight + margin intentionally differ:
 * this band is a standing bold alert; the result line is a transient status.) */
```

## Info

### IN-01: Modal markup is duplicated between `index.html` and `assets/backup-modal.js`

**File:** `index.html:193-261` and `assets/backup-modal.js:51-104`
**Issue:** The entire Backup-modal section markup (including `class="backup-modal-import-warning"`, `backup-modal-section-heading`, `backup-test-password-card`) exists twice — once as static HTML in `index.html` and once as a JS string template in `backup-modal.js`. Phase 27 changed only CSS, so both copies are styled correctly today. But any future *structural* change to these selectors must be made in two places or the two renderings will drift. Pre-existing; flagged because this phase's selectors sit squarely on the seam.
**Fix:** Out of scope for a CSS-only phase. Track separately: pick a single source of truth for the modal DOM (render from `backup-modal.js` only, or keep the static HTML and delete the JS template).

### IN-02: `--space-*` spacing tokens are never defined — every usage relies on the `var()` fallback

**File:** `assets/tokens.css` (no definition); consumed app-wide, e.g. `assets/app.css:3758` `padding: var(--space-sm, 8px) var(--space-md, 16px)`
**Issue:** Grepping the whole codebase, `--space-xs/sm/md/lg/xl` are **never declared** (no `--space-*:` left-of-colon anywhere). The hairline-aligned box metrics this phase touts as "identical" therefore resolve entirely through the second `var()` argument (the literal `8px`/`16px` fallbacks). This works and renders correctly, but it means the fallbacks are load-bearing, not safety nets, and a single typo in one fallback (e.g. `16px` vs `12px`) silently breaks the alignment the phase is asserting. Pre-existing convention, not introduced by Phase 27.
**Fix:** Out of scope here. Recommend a follow-up: define the `--space-*` scale once in `tokens.css` `:root` so the fallbacks become true fallbacks and the metric-alignment claim has a single source of truth.

### IN-03: Comment claims `--color-danger-*` is "reserved for the confirm dialog," but four other selectors consume it

**File:** `assets/app.css:3749-3750` and `assets/tokens.css:189`
**Issue:** Both Phase 27 comments state `--color-danger-*` is "reserved for the destructive confirm dialog." In fact `--color-danger-bg` / `--color-danger-text` are also consumed by `.error-text` (`app.css:1611-1612`), `.db-error-banner` family (`app.css:2145-2146`), and `app.css:3693-3694`. The *recolour* this phase performed (moving the Import warning off the danger family) is correct and unaffected — this is purely a documentation accuracy nit. Combined with the now-absent dark override on danger, those other danger consumers will inherit the light danger palette in dark mode; that is a pre-existing condition outside this phase's scope, but the "reserved for the confirm dialog" framing under-states where danger tokens actually land.
**Fix:** Reword to "reserved for destructive/error states (confirm dialog, `.error-text`, db-error banners) and intentionally light-only," or drop the "confirm dialog only" specificity. No code change.

---

_Reviewed: 2026-06-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
