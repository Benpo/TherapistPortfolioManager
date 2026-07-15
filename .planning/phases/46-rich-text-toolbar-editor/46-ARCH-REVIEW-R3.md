---
phase: 46-rich-text-toolbar-editor
round: gap-closure-3
reviewed: 2026-07-15
scope: [46-17-PLAN.md, 46-16-PLAN.md (item-13 amendment)]
verdict: SOUND WITH CONDITIONS (both lenses; 1 test-fidelity blocker, folded back before execution)
---

# Architect-Soundness Review — Phase 46 gap round 3

Two independent lenses reviewed the round-3 plans (gaps 12/13: persistent-bar
dispatch dead without focus; export preview pane below the scroll fold) against
real source after the plan-checker passed. Both returned SOUND WITH CONDITIONS.
All conditions were folded into the plans before execution.

## Lens A — dispatch/focus mechanism (technical)

Verified sound on real source: no premature preview close (dockTo only closes a
DIFFERENT field's pane); focus() inside the preventDefaulted mousedown is an
already-shipped pattern (undo/redo cases); mis-targeting mitigated (shared bar
falls through to _focused byte-identically; heading menu items capture the field
at open time; WeakMap survives modal reopen); the heading path is covered by
focus-before-open.

Conditions raised:
- **F1 (BLOCKER, test fidelity):** the probe's reveal assertion measured the
  pane against the AREA top — a bare scrollIntoView would park the pane top
  UNDER the sticky bar and still pass. Fixed: assertion now requires
  paneTop >= bar bottom; implementation must offset scrollTop by the bar height
  and bare scrollIntoView is forbidden.
- **F2:** cold-caret behavior (never-focused field) was undefined and the test
  masked it by pre-setting a selection. Fixed: caret deterministically placed at
  end-of-document on cold focus + a no-preset-selection test case.
- **F3:** don't rely solely on focusin side-effects to set module focus state —
  set it directly in addition to .focus().
- **F4:** preview must not focus the field (iOS soft-keyboard would cover the
  revealed pane) — preview resolves its target without focusing; gate watches
  the iPhone behavior.
- **F5:** heading first-click had zero coverage at every layer — jsdom Case D
  added + gate item 13a names the heading dropdown.
- **F6 (note):** no reveal-on-Step-2-entry (stale-open pane must not trigger an
  entry scroll) — recorded in the NOT-list.

## Lens B — product intent + regression surface

Verified sound on real artifacts: Gap-12 mechanism correct for every control;
shared-bar path byte-identical (reverse map cannot match the shared bar);
Gap-13 reveal gated to persistent fields only (note fields provably excluded,
vertical-only, RTL-safe); 46-16 items 1-12 byte-unchanged with additive item 13;
docs disposition correct (rich-toolbar.js watched, non-changelog-only, owned by
topic-quick-paste; EN help+changelog demands already satisfied in the unpushed
range, no trailers needed); suite math 190→191 (run-all counts files); zero new
i18n strings; APP_VERSION untouched; no new shipped assets.

Conditions raised (converging with Lens A): heading coverage (= F5); NOT-list
must state that keyboard shortcuts still require field focus (only buttons
become focus-independent); iOS preview/keyboard watch (= F4); toggle-back-to-
Edit relies on the scroll container's natural clamp — gate item 13c watches for
disorientation, explicit scroll-restore only if flagged.
