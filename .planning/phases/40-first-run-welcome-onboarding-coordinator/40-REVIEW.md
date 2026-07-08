---
phase: 40-first-run-welcome-onboarding-coordinator
reviewed: 2026-07-08T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - assets/app.css
  - assets/app.js
  - assets/attention-coordinator.js
  - assets/i18n-cs.js
  - assets/i18n-de.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - tests/39-help-entry.test.js
  - tests/40-install-nudge-rearm.test.js
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
status: issues_found
---

# Phase 40: Code Review Report (Gap-Closure Re-Review)

**Reviewed:** 2026-07-08
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found (Info only — no blockers, no warnings)

## Summary

Adversarial re-review of the Phase 40 gap-closure delta (`ba41f65..HEAD`) covering plans
40-06 (beforeinstallprompt re-arm), 40-07 (redundant Help nav removal + native-button CSS
reset), and 40-08 (two-paragraph EN welcome copy). I read the full diff, traced the changed
control paths through `attention-coordinator.js`, `app.js`, and `app.css`, and executed both
behavior guards.

The delta holds up under scrutiny. I specifically tried to break the three named invariants
and could not:

- **Re-arm (40-06).** `deferredPrompt` is assigned *before* the re-invoked `run()` (line 252
  vs 266), and the `run()` call sits in its own `try/catch` — so a throw in arbitration can
  never destroy the captured prompt. The re-arm routes through `run()`, which still
  early-returns on `isDemo()` (D-09) and the `sg.surfaceShownThisSession` marker (D-02) and
  iterates `PRECEDENCE` in order (D-01). One-per-session and precedence are preserved *by
  construction*, not by ad-hoc guards. The `install-nudge` surface is registered (line 390)
  before any real dispatch can occur (events are async; eval is synchronous), so the registry
  is always populated when the listener fires. Cross-page D-02 also holds — `sessionStorage`
  persists across MPA navigations while `deferredPrompt` resets per page.
- **XSS boundary (40-08 / T-40-03).** The new second subtitle is set via `textContent` only
  (line 173); no `innerHTML` anywhere in the changed regions. The render guard
  (`typeof === 'string' && !== '' && !== 'help.welcome.subtitle2'`) correctly suppresses both
  the empty non-EN parity stubs and the raw-key echo when a locale lacks the entry.
- **Nav removal (40-07).** The active-nav marker loop (`a[data-nav]`) simply finds no help
  anchor now; `.is-active` is carried by the `.help-entry-btn` instead. The `.help-entry-item`
  reset is complete — `text-align: start` (line 234) overrides the UA `<button>` centering, so
  `<button>` action rows do render identically to `<a>` link rows, and `font: inherit`
  correctly precedes `font-size: 0.9rem`.

Both guards pass: `40-install-nudge-rearm` (3/3) and `39-help-entry` (6/6). No correctness,
security, or data-loss defects found in the delta. The three Info items below are content /
robustness follow-ups, not blockers.

## Info

### IN-01: `help.entry.replayWelcome` EN copy diverged from all non-EN locales

**File:** `assets/i18n-en.js:599` (vs `i18n-he.js:598`, `i18n-de.js`, `i18n-cs.js`)
**Issue:** Plan 40-08 re-worded the EN label from "Replay welcome" to **"Onboarding screen"**,
but the three other locales still resolve to the original "replay" phrasing
(HE `צפייה חוזרת בפתיחה`, DE `Begrüßung erneut ansehen`, CS `Přehrát uvítání znovu`). The
popover row is now framed as a noun ("Onboarding screen") in EN and as a verb ("Replay the
welcome") elsewhere — a semantic split, not just untranslated text. This is inside the
Phase 42.1 L10N deferral, but unlike `subtitle2` it was *not* stubbed, so it will silently
ship inconsistent framing to non-EN users. The internal key name `replayWelcome` also no
longer matches the EN label.
**Fix:** Add the three non-EN re-translations to the Phase 42.1 translation batch (or a
tracking note) so the "Onboarding screen" framing lands consistently. No code change required.

### IN-02: Empty `subtitle2` paragraph can persist as a blank gap after a language switch

**File:** `assets/attention-coordinator.js:167-174`; `assets/app.css:4844-4848`
**Issue:** The `sub2` node is created only for locales with non-empty copy (EN). But its
`data-i18n="help.welcome.subtitle2"` means `App.applyTranslations()` (app.js:23-27, invoked by
`setLanguage`) will later set `sub2.textContent = t('help.welcome.subtitle2')` = `""` if the
user switches to HE/DE/CS *while the overlay is open*. The node stays in the DOM, and
`.welcome-subtitle + .welcome-subtitle { margin-block-start: var(--space-sm) }` still applies —
leaving a visible empty-margin gap. Likelihood is low (the overlay is `aria-modal` + focus-
trapped and visually covers the header language switcher, so reaching it mid-overlay is
contrived), which is why this is Info, not Warning.
**Fix:** If hardening is desired, either remove `data-i18n` from `sub2` (it is resolved once at
mount and never needs live re-translation for the first-run flow), or have the language
re-translate hide/remove `.welcome-subtitle` nodes whose resolved value is empty. Otherwise
document as accepted.

### IN-03: `nav.help` i18n key is now orphaned in all four locale dicts

**File:** `assets/i18n-en.js:13` (and `i18n-he.js:13`, `i18n-de.js:13`, `i18n-cs.js:13`)
**Issue:** Plan 40-07 removed the only consumer of `nav.help` (the `data-i18n="nav.help"`
anchor in `renderNav()`). The key remains defined in all four dictionaries with no element
referencing it — dead translation entries. Harmless, but it is now unused surface area.
**Fix:** Optional cleanup — drop `"nav.help"` from the four dicts, or leave it if a future nav
affordance may re-use it. Note: `help.html`'s `<body data-nav="help">` is unrelated and still
correctly drives `.is-active` on the `.help-entry-btn`.

---

_Reviewed: 2026-07-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
