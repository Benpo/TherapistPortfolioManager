---
phase: 40-first-run-welcome-onboarding-coordinator
verified: 2026-07-08T13:15:00Z
status: human_needed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 4/4
  gaps_closed:
    - "Install nudge never appears on any Chromium session (MAJOR — beforeinstallprompt re-arm, 40-06)"
    - "Redundant green 'Help' nav pill duplicating the '?' entry (40-07)"
    - "'?' menu action row rendered as a grey 'preselected' box in light and dark (40-07)"
    - "Welcome overlay subtitle read as one flat privacy sentence with no value/experience copy (40-08)"
    - "'Replay welcome' menu label read awkwardly (40-08, renamed to 'Onboarding screen')"
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "The welcome overlay's primary CTA opens a real ~6-9-step guided tour (not just ./help.html)."
    addressed_in: "Phase 41"
    evidence: "ROADMAP.md Phase 41 goal + Phase 40 D-11 interim-wiring note (carried forward from initial verification, unchanged by this gap-closure round)."
  - truth: "The 'whats-new' precedence surface (What's-New popup) is registered and participates in the precedence order."
    addressed_in: "Phase 42"
    evidence: "ROADMAP.md Phase 42 goal; PRECEDENCE already reserves the slot, unregistered until then (carried forward, unchanged)."
  - truth: "Real HE/DE/CS translation of the rewritten welcome subtitle (P1+P2) and the 'Onboarding screen' menu label."
    addressed_in: "Phase 42.1"
    evidence: "ROADMAP.md Phase 42.1 goal: 'Every v1.3-authored user-facing string reads natively in all four locales... welcome overlay copy...' Requirement L10N-01. `.planning/phases/42.1-help-onboarding-translation/DEFERRED-FROM-40.md` records the exact confirmed EN key shape and the three-item HE/DE/CS to-do left for that phase. This was Ben's explicit scope decision recorded in 40-08-PLAN.md and the ROADMAP Phase 42.1 scope note ('Scope decision: Ben 2026-07-08')."
human_verification:
  - test: "Real-browser visual + dark-mode confirmation of the three UI fixes landed in this gap-closure round: (1) the header shows only the '?' icon (no green Help pill), (2) the '?' menu's action row no longer looks grey/preselected in light or dark, and (3) the welcome overlay renders two distinct EN paragraphs (value-first, then privacy) with a comfortable gap — in both Chromium and Safari/WebKit."
    expected: "Nav shows a single '?' affordance; the popover row matches the anchor rows with hover intact on both; the EN welcome overlay shows two paragraphs, properly spaced, in light and dark, in both browser engines."
    why_human: "jsdom asserts DOM structure and CSS rule text, not rendered layout/color in a real engine; this project has previously hit Chromium-only-gate blind spots on WebKit (project MEMORY: reference-webkit-chromium-svg-visual-verification, reference-ui-checker-greenfield-false-positives)."
  - test: "On a real, fresh (not-yet-installed), install-eligible Chromium profile, load an app page and confirm the install nudge now appears this session after the late beforeinstallprompt re-arm, and that clicking [Install app] fires the native install dialog exactly once and the app installs."
    expected: "The nudge surfaces (subject to D-02/PRECEDENCE) once the browser's real beforeinstallprompt fires, and the native install flow completes without a double-prompt or lingering card."
    why_human: "beforeinstallprompt/prompt() is a real, heuristics-gated browser API that jsdom only exercises via an injected mock; the 40-UAT.md test-3 failure was specifically that this had never been exercised on a real profile, and the fix's own SUMMARY documents this same human check as still outstanding."
---

# Phase 40: First-Run Welcome & Onboarding Coordinator — Verification Report (Gap-Closure Re-Verification)

**Phase Goal:** On first launch a practitioner sees exactly one welcoming surface — a branded welcome offering "take the tour" / "I'll explore myself" — governed by a single first-run coordinator that prevents competing surfaces from stacking, plus a non-nagging install nudge; all re-openable from "?".
**Verified:** 2026-07-08T13:15:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (plans 40-06, 40-07, 40-08 closing all 5 UAT-diagnosed gaps)

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | First launch shows a full-screen branded welcome overlay with two first-class choices, fires exactly once, Esc dismisses. | ✓ VERIFIED | Unchanged core mechanism from initial verification (`attention-coordinator.js` welcome surface, `tests/40-welcome-overlay.test.js` 7/7) — plus 40-08 now renders a real, non-flat two-paragraph EN subtitle (`help.welcome.subtitle` + new `help.welcome.subtitle2`, both live at `assets/i18n-en.js:599,602-603`, rendered via `textContent`-only guarded mount at `assets/attention-coordinator.js:167-173`). Test suite re-run confirms no regression. |
| 2 | A practitioner can re-open the welcome/tour any time from "?"; it never auto-re-fires. | ✓ VERIFIED | `assets/app.js` Replay row wiring unchanged and still tested (`tests/40-app-wiring.test.js`). 40-07/40-08 gap-closure additionally: (a) removed the redundant `data-nav="help"` nav anchor (`grep -c 'data-nav="help"' assets/app.js` = 0; `tests/39-help-entry.test.js` test #1 now asserts its absence, 6/6 pass), (b) reset `.help-entry-item` native button chrome so the action row no longer misreads as preselected (`assets/app.css:216-236`, all 7 reset declarations confirmed present), (c) renamed the row label from "Replay welcome" to "Onboarding screen" (`assets/i18n-en.js:599`). |
| 3 | Only one attention surface appears per launch; written precedence order enforced; explicit fresh-install-vs-upgrader handling. | ✓ VERIFIED | `PRECEDENCE` array, one-per-session marker, and upgrader D-03 handling unchanged from initial verification (`tests/40-coordinator.test.js` 5/5). The 40-06 re-arm (below) calls `run()` again from inside the `beforeinstallprompt` handler with NO external guard — verified by reading the source that this relies entirely on `run()`'s own `isDemo()`/session-marker/PRECEDENCE-order checks, and by a dedicated behavior test proving the re-arm cannot break D-02 or PRECEDENCE (`tests/40-install-nudge-rearm.test.js` cases ii and iii, 3/3 pass). |
| 4 | A practitioner who hasn't installed the PWA sees one friendly, dismissable, non-nagging, per-browser-aware install affordance (dismissal remembered), replacing the per-session iOS banner. | ✓ VERIFIED | The MAJOR UAT gap ("install nudge never appears on any Chromium session") is closed: `assets/attention-coordinator.js:250-267` now calls `try { run(); } catch (reErr) {}` immediately after stashing a late `deferredPrompt`, re-triggering arbitration so the nudge can win the slot the same session instead of only ever stashing the event. Falsifiable behavior test `tests/40-install-nudge-rearm.test.js` (3/3: re-arm surfaces the nudge, D-02 suppresses a claimed slot, PRECEDENCE still lets welcome win) proves this is a real state-transition fix, not presence-only. `isMacSafari()` also independently confirmed fixed for the WR-01 iPadOS-misclassification defect (`navigator.maxTouchPoints > 1` exclusion at `attention-coordinator.js:307,311`, commit `b46c1d2`, per 40-UAT.md test 5). |

**Score:** 4/4 truths verified (0 present-but-behavior-unverified)

### UAT Gap Closure Cross-Check (40-UAT.md → this round)

| # | UAT Gap | Severity | Closure Plan | Status |
|---|---------|----------|--------------|--------|
| 1 | Welcome overlay subtitle too flat (privacy-only, no value copy) | minor | 40-08 | ✓ CLOSED — two-paragraph EN copy live, rendered, tested |
| 2 | Green "Help" nav pill duplicates "?" entry | minor | 40-07 | ✓ CLOSED — anchor removed, regression guard added |
| 3 | "?" menu action row looks preselected (grey box) in light/dark | cosmetic | 40-07 | ✓ CLOSED — native button chrome reset, hover preserved on both element types |
| 4 | Install nudge never appears on eligible Chromium (install flow unreachable) | major | 40-06 | ✓ CLOSED (code) — re-arm implemented + behavior-tested; real-device confirmation still human-pending (see Human Verification) |
| 5 | "Replay welcome" label reads awkwardly | minor | 40-08 | ✓ CLOSED — renamed to "Onboarding screen" (EN) |

All 5 UAT-diagnosed gaps have a corresponding code change, a passing automated test that exercises the specific defect (not just presence), and are confirmed by independent source reading in this re-verification — not just trusted from SUMMARY.md claims.

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Welcome primary CTA opens a real guided tour (currently interim `./help.html`) | Phase 41 | ROADMAP Phase 41 goal + D-11 (carried forward, unchanged) |
| 2 | `whats-new` precedence surface registered | Phase 42 | ROADMAP Phase 42 goal; `PRECEDENCE` slot reserved (carried forward, unchanged) |
| 3 | Real HE/DE/CS translation of the rewritten welcome copy (P1+P2) and "Onboarding screen" label | Phase 42.1 | ROADMAP Phase 42.1 goal + `.planning/phases/42.1-help-onboarding-translation/DEFERRED-FROM-40.md` (exact confirmed key shape + 3-item to-do); Ben's explicit 2026-07-08 scope decision |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `assets/attention-coordinator.js` | `beforeinstallprompt` handler re-runs `run()`; `isMacSafari()` excludes touch devices; second subtitle `<p>` guarded mount | ✓ VERIFIED | Re-arm at lines 250-267 (`try { run(); } catch {}`); `isMacSafari()` touch exclusion at 304-313; subtitle2 mount at 167-173 (guarded on non-empty, non-key-echo value). |
| `tests/40-install-nudge-rearm.test.js` | New falsifiable behavior guard, 3 cases | ✓ VERIFIED | Exists, runs standalone: 3/3 pass. |
| `assets/app.js` | `renderNav()` emits no `data-nav="help"` anchor | ✓ VERIFIED | `grep -c` = 0. |
| `assets/app.css` | `.help-entry-item` carries native-button reset (appearance/-webkit-appearance/background/border/width/font/cursor) | ✓ VERIFIED | All 7 declarations present at lines 216-236; `font-size: 0.9rem` still resolves after `font: inherit` (correct ordering). |
| `tests/39-help-entry.test.js` | Test #1 converted to removal-regression guard | ✓ VERIFIED | 6/6 pass; test #1 title/body now asserts absence. |
| `assets/i18n-en.js` | `help.welcome.subtitle` rewritten (P1), `help.welcome.subtitle2` (P2) added, `help.entry.replayWelcome` renamed | ✓ VERIFIED | Lines 599, 602-603 — exact approved copy present. |
| `assets/i18n-he.js` / `-de.js` / `-cs.js` | Empty-string `subtitle2` parity stub, no forbidden `// TODO i18n` marker | ✓ VERIFIED | `help.welcome.subtitle2": ""` present in all three; no forbidden marker found. |
| `.planning/phases/42.1-help-onboarding-translation/DEFERRED-FROM-40.md` | Records confirmed key shape + exact 42.1 to-do | ✓ VERIFIED | File exists with 3-item to-do and register reminders. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `beforeinstallprompt` listener | `run()` | direct call inside try/catch, no external guard | ✓ WIRED | Confirmed by reading source; behavior-proven by `tests/40-install-nudge-rearm.test.js` cases ii/iii that the internal guards (D-02, PRECEDENCE) hold without an external check. |
| `showWelcome()` second `<p>` | `help.welcome.subtitle2` i18n key | `t()` resolution → guarded `textContent` mount | ✓ WIRED | Guard confirmed: `sub2Text !== '' && sub2Text !== 'help.welcome.subtitle2'` — non-EN empty stubs correctly render nothing. |
| `renderNav()` | (removed) Help nav anchor | n/a | ✓ WIRED (absence confirmed) | No dangling reference to a removed anchor found elsewhere in `app.js` or HTML. |
| `.help-entry-item` | `<button>` action row | CSS reset rule | ✓ WIRED | Rule applies to the shared class used by both `<a>` and `<button>` rows; `:hover` rule left untouched per plan. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Install-nudge re-arm (new gap-closure test) | `node tests/40-install-nudge-rearm.test.js` | 3/3 pass | ✓ PASS |
| Install-nudge eligibility/arbitration (regression) | `node tests/40-install-nudge.test.js` | 13/13 pass | ✓ PASS |
| Coordinator precedence/one-per-session (regression) | `node tests/40-coordinator.test.js` | 5/5 pass | ✓ PASS |
| Welcome overlay behavior incl. two-paragraph mount (regression) | `node tests/40-welcome-overlay.test.js` | 7/7 pass | ✓ PASS |
| Help-entry menu incl. nav-pill-removal guard (regression) | `node tests/39-help-entry.test.js` | 6/6 pass | ✓ PASS |
| i18n parity (subtitle2 stubs, no forbidden marker) | `node tests/25-11-i18n-parity.test.js`, `node tests/33-i18n-de-cs-completion.test.js`, `node tests/40-i18n-parity.test.js` | all pass | ✓ PASS |
| Full regression suite (single run, not per-truth) | `node tests/run-all.js` | 144 passed, 0 failed | ✓ PASS |
| Real Chromium install flow after re-arm | — | Not run (requires a real, fresh, install-eligible browser profile) | ? SKIP → human verification |
| Real-browser visual/dark-mode of the 3 UI fixes | — | Not run (jsdom cannot assert rendered layout/color) | ? SKIP → human verification |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|-------------|--------|----------|
| ONBD-01 | 40-01, 40-02, 40-08 | Full-screen branded welcome overlay, two first-class choices, one-shot flag, Esc dismisses | ✓ SATISFIED | `tests/40-welcome-overlay.test.js` (incl. two-paragraph mount, unregressed) |
| ONBD-02 | 40-01, 40-02, 40-04, 40-07, 40-08 | Re-open welcome/tour any time from "?"; never auto-re-fires | ✓ SATISFIED | `tests/40-app-wiring.test.js`, `tests/39-help-entry.test.js` (nav pill removed, button reset, label renamed) |
| ONBD-03 | 40-02, 40-04, 40-05, 40-06 | Single first-run coordinator; written precedence order; no competing surfaces stack; upgrader-vs-fresh handling | ✓ SATISFIED | `tests/40-coordinator.test.js`, `tests/40-install-nudge-rearm.test.js` (re-arm preserves D-02/PRECEDENCE by construction) |
| ONBD-04 | 40-01, 40-03, 40-05, 40-06 | One friendly, dismissable, non-nagging, per-browser-aware install affordance; dismissal remembered; replaces iOS banner | ✓ SATISFIED | `tests/40-install-nudge.test.js`, `tests/40-install-nudge-rearm.test.js`, `isMacSafari()` touch-exclusion fix (WR-01) |

No orphaned requirements — `.planning/REQUIREMENTS.md` maps exactly ONBD-01..04 to Phase 40, marked `[x]` complete, and all four are traced above with gap-closure evidence. This matches the initial verification's finding; the gap-closure round did not change requirement scope.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No new anti-patterns introduced by 40-06/07/08 | — | `grep -n -E "TBD|FIXME|XXX"` returned no matches across all 9 files touched by the gap-closure plans (attention-coordinator.js, app.js, app.css, i18n-en/he/de/cs.js, and the two new/modified test files). |

Carried forward from the initial verification, still present (not touched by this gap-closure round, not re-scored here since neither is a must-have):
- `assets/app.js:1398-1403` — `showFirstLaunchSecurityNote()` uses `innerHTML` with interpolated `t()` values (ℹ️ info, pre-existing, not new).
- `assets/attention-coordinator.js` — `_getDeferredPrompt`/`_clearDeferredPrompt` remain dead public API (ℹ️ info, harmless).

WR-01 (iPadOS Safari misclassification) and WR-02 (welcome-overlay focus trap), both flagged as ⚠️ Warning anti-patterns in the initial verification, are confirmed FIXED in this round (commits `b46c1d2`, `b644428`, both independently re-read in source — see Truth 4 and Key Links above). They no longer appear as open anti-patterns.

## Human Verification Required

### 1. Real-browser visual + dark-mode confirmation of the three landed UI fixes
**Test:** Open the app header in a real Chromium browser and Safari/WebKit, light and dark mode: (a) confirm only the "?" icon appears (no green "Help" pill), (b) open the "?" menu and confirm the action row no longer looks grey/preselected and matches the anchor rows with working hover, (c) trigger the welcome overlay (fresh profile or Replay) and confirm the EN copy reads as two distinct paragraphs with a comfortable gap.
**Expected:** All three fixes render correctly and match the UI-SPEC in both browser engines and both color schemes.
**Why human:** jsdom/static CSS-rule assertions prove the code is present and structurally correct, not that it renders correctly in a real engine — this project has previously hit Chromium-only blind spots on WebKit-specific rendering (project MEMORY).

### 2. Real Chromium install flow after the re-arm fix
**Test:** On a real, fresh (not-yet-installed), install-eligible Chromium profile, load an app page and wait for the browser's real `beforeinstallprompt`; confirm the install nudge now appears this session, and clicking "Install app" fires the native install dialog exactly once and completes installation.
**Expected:** The nudge surfaces once Chrome's real event fires (subject to D-02/PRECEDENCE), and the native flow completes without a double-prompt or a lingering card.
**Why human:** This is the exact human check the original UAT test 3 failed on before the fix, and the fix's own SUMMARY (40-06-SUMMARY.md) explicitly still lists this as outstanding — `beforeinstallprompt`/`prompt()` is a real, heuristics-gated browser API that no jsdom harness can exercise end-to-end.

## Gaps Summary

No FAILED must-haves, no MISSING/STUB artifacts, no NOT_WIRED key links, no debt markers. All 5 UAT-diagnosed gaps (1 major, 4 minor/cosmetic) have a corresponding code fix confirmed by independent source reading (not just trusted from SUMMARY.md), a dedicated or updated automated test that exercises the specific defect, and a green full-suite run (144/144, up from 143/143 — one new test file added). The two source-verified defects left open at the initial verification (WR-01 iPad-Safari misclassification, WR-02 missing welcome-dialog focus trap) were both fixed and independently re-confirmed in this round.

Status remains `human_needed` rather than `passed` because two items genuinely require a real device/browser to observe: (1) visual/dark-mode/WebKit fidelity of the three UI fixes just landed, and (2) the real Chromium `beforeinstallprompt`→install flow now that the re-arm makes it reachable. Both are narrower and more targeted than the initial verification's 5-item human list — the translation-fluency item is now properly out of Phase 40's scope (Ben's recorded decision defers it to Phase 42.1, not silently dropped), and the offline-navigation + WR-01/WR-02-decision items were closed by UAT tests 4 and 5 respectively.

---

_Verified: 2026-07-08T13:15:00Z_
_Verifier: Claude (gsd-verifier)_
