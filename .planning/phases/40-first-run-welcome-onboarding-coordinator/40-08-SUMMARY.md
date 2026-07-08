---
phase: 40-first-run-welcome-onboarding-coordinator
plan: 08
subsystem: onboarding / i18n
tags: [welcome-overlay, i18n, onboarding, gap-closure, xss-boundary]
requires:
  - "40-06 (welcome overlay + attention coordinator)"
  - "40-07 (help entry menu)"
provides:
  - "Two-paragraph EN welcome copy (value-first P1 + privacy-softened P2)"
  - "help.welcome.subtitle2 key (EN live, he/de/cs empty parity stub)"
  - "'Onboarding screen' menu label (EN)"
affects:
  - "assets/attention-coordinator.js showWelcome()"
  - "assets/app.css .welcome-subtitle spacing"
  - "i18n en/he/de/cs dicts"
tech-stack:
  added: []
  patterns:
    - "Conditional textContent mount guarded on non-empty resolved value ≠ key echo (T-40-03 / T-40-08-01)"
    - "Empty-string i18n parity stub to satisfy standing bidirectional parity gates without translating"
key-files:
  created: []
  modified:
    - "assets/i18n-en.js"
    - "assets/attention-coordinator.js"
    - "assets/app.css"
    - "assets/i18n-he.js"
    - "assets/i18n-de.js"
    - "assets/i18n-cs.js"
    - ".planning/phases/42.1-help-onboarding-translation/DEFERRED-FROM-40.md"
decisions:
  - "DEFERRED-FROM-40.md lives in the 42.1 phase dir (not the 40 dir the plan frontmatter listed) — updated the real file in place"
  - "CSS second-paragraph spacing uses --space-sm (0.5rem) via margin-block-start (logical, RTL-safe)"
metrics:
  duration: ~12min
  completed: 2026-07-08
  tasks: 3
  files: 7
status: complete
---

# Phase 40 Plan 08: Welcome-Overlay Copy Gap Closure Summary

Closed two MINOR content gaps on the first-run welcome overlay (40-UAT test 1): the flat
single privacy sentence became two warm paragraphs (value-first P1 + privacy-softened P2)
using Ben's approved Option-C copy, and the awkward "Replay welcome" menu row is now
"Onboarding screen" (EN). Non-EN locales carry an empty `subtitle2` parity stub so the four
standing i18n parity gates stay green with the real HE/DE/CS translation cleanly deferred to
Phase 42.1.

## What Was Built

- **Task 1 (7bf899d)** — `assets/i18n-en.js`: `help.welcome.subtitle` rewritten to the P1
  value-first paragraph; new `help.welcome.subtitle2` key added with the P2 privacy paragraph
  (both verbatim from APPROVED-WELCOME-COPY-EN.md); `help.entry.replayWelcome` renamed to
  "Onboarding screen".
- **Task 2 (2d1f93e)** — `assets/attention-coordinator.js` `showWelcome()` renders a second
  `<p class="welcome-subtitle" data-i18n="help.welcome.subtitle2">` via `textContent` only
  (never innerHTML — T-40-03), appended between the first subtitle and the CTAs. The mount is
  guarded: it only appends when the resolved value is a non-empty string and is not the raw key
  echo, so non-EN empty stubs render nothing (T-40-08-01). `assets/app.css` adds
  `.welcome-subtitle + .welcome-subtitle { margin-block-start: var(--space-sm); }` (logical
  property, RTL-safe) so only the second paragraph gets top spacing.
- **Task 3 (2bf86c9)** — `assets/i18n-he.js` / `i18n-de.js` / `i18n-cs.js` each gained an
  empty-string `help.welcome.subtitle2` parity stub, commented "Phase 42.1: translation pending"
  (deliberately NOT the `// TODO i18n` marker that tests/33 rejects). `DEFERRED-FROM-40.md`
  (in the 42.1 phase dir) updated to record the now-confirmed EN key shape and the exact
  three-item HE/DE/CS to-do for 42.1.

## Verification

- `node tests/40-welcome-overlay.test.js` — 7/7 (overlay structure/behavior unbroken).
- `node tests/40-i18n-parity.test.js` — 3/3.
- `node tests/25-11-i18n-parity.test.js` — 23/23 (EN keys exist in de/cs, incl. subtitle2 stubs).
- `node tests/33-i18n-de-cs-completion.test.js` — 4/4 (exact bidirectional parity; no forbidden marker).
- `node tests/run-all.js` — **144 passed, 0 failed**.
- Static checks: `subtitle2` present in attention-coordinator.js; `.welcome-subtitle + .welcome-subtitle`
  spacing rule present; `subtitle2` key present in all three non-EN dicts; no `// TODO i18n` marker.

## Deviations from Plan

None functional. One path note: the plan frontmatter listed `DEFERRED-FROM-40.md` under the
Phase 40 directory, but the real tracker lives at
`.planning/phases/42.1-help-onboarding-translation/DEFERRED-FROM-40.md` (it feeds Phase 42.1).
Updated the actual file in place rather than creating a duplicate.

Task 2's own verify passed immediately, but the full-suite run at Task 2 showed 2 transient
failures (25-11 and 33 parity gates) — expected, because the new EN key existed before the
non-EN stubs landed. Task 3 closed both; the final suite is fully green. This is inherent to
splitting an EN-key add across tasks, not a defect.

## Outstanding

- **Human visual check (Task 2 human-check, not yet performed):** On a fresh profile / replay
  from the "?" menu, confirm the EN overlay shows two distinct paragraphs (value first, privacy
  second) with a comfortable gap in light AND dark, Chromium AND Safari; and that non-EN overlays
  show a single subtitle with no empty gap.
- **Deferred to Phase 42.1:** real HE/DE/CS translation of `subtitle` (P1), `subtitle2` (P2),
  and the "Onboarding screen" label — tracked in DEFERRED-FROM-40.md.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `help.welcome.subtitle2 = ""` | assets/i18n-he.js, i18n-de.js, i18n-cs.js | Intentional empty parity stub; real translation deferred to Phase 42.1 (documented in DEFERRED-FROM-40.md). The overlay's non-empty guard means these render nothing, so non-EN layout is unchanged. |

## Self-Check: PASSED

- Files modified exist: i18n-en.js, attention-coordinator.js, app.css, i18n-he.js, i18n-de.js,
  i18n-cs.js, DEFERRED-FROM-40.md — all present.
- Commits exist: 7bf899d, 2d1f93e, 2bf86c9 — all in git log.
