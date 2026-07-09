---
phase: 42-in-app-changelog-what-s-new
plan: 05
subsystem: onboarding-attention-surfaces
tags: [changelog, whats-new, attention-coordinator, popup, a11y, rtl, css-tokens]
requires:
  - "window.AttentionCoordinator (attention-coordinator.js) — pre-reserved 'whats-new' PRECEDENCE slot + register()"
  - "window.AppVersion.APP_VERSION (version.js) — the ONLY version source"
  - "window.CHANGELOG_CONTENT_EN (changelog-content-en.js, Plan 04) — entries + highlights"
  - "sg.whatsNewLastSeenVersion storage key (welcome subsume-write, coordinator.js:227-231)"
provides:
  - "assets/whats-new.js — self-registering 'whats-new' coordinator surface (CHLG-01)"
  - ".whats-new-* popup CSS block in assets/app.css (always-loaded, precached)"
affects:
  - "Plan 08 supplies whatsNew.title/sub/seeAll/close i18n keys (all 4 locales); this surface renders EN fallbacks until then"
  - "Plan 06 changelog page is the 'See everything new' deep-link target (changelog.html#{anchor})"
tech-stack:
  added: []
  patterns:
    - "self-registering IIFE coordinator surface (mirrors welcome overlay idiom)"
    - "createElement + textContent XSS boundary (no innerHTML with content)"
    - "single dismiss() helper for all deliberate paths; backdrop no-op (D-09)"
    - "self-defined popup control classes (welcome-cta--* precedent)"
key-files:
  created:
    - assets/whats-new.js
  modified:
    - assets/app.css
decisions:
  - "D-05/CHLG-01: popup shows once per version; first-run suppressed via welcome subsume-write"
  - "D-07: entry-less version silently skips popup AND advances last-seen at eval (reconcile)"
  - "D-09: only Close/Esc/See-everything-new dismiss; backdrop click is a no-op"
  - "D-06: modest centered modal (420px) — full-screen weight stays unique to welcome"
  - "Styled .whats-new-seeall/.whats-new-close directly — app has no shared .btn-primary/.btn-quiet"
metrics:
  duration: ~15m
  tasks_completed: 2
  files_created: 1
  files_modified: 1
  tests_green: 8
  completed: 2026-07-09
status: complete
---

# Phase 42 Plan 05: What's-New Popup Coordinator Surface Summary

Shipped `assets/whats-new.js` — the self-registering `'whats-new'` AttentionCoordinator surface implementing CHLG-01 (once-per-version announcement popup) — plus its `.whats-new-*` modest-centered-modal CSS in the always-loaded, precached `assets/app.css`. Turns the 8 gating/dismiss behavior guards (T-42-V1..V5) green.

## What was built

**Task 1 — `assets/whats-new.js`** (commit f6ce33a): A zero-dependency, no-new-globals IIFE with a four-slot responsibility banner:
- **Gate** `eligible()`: true iff `APP_VERSION !== sg.whatsNewLastSeenVersion` AND a changelog entry exists for `APP_VERSION`. First-ever launch is suppressed for free — the welcome overlay sits above `'whats-new'` in PRECEDENCE and its dismiss subsume-writes the last-seen key.
- **Reconcile** (D-07): an eval-time IIFE that, when the running version differs from last-seen AND has no entry, quietly advances `sg.whatsNewLastSeenVersion` so the next real release is never suppressed.
- **Show**: a modest centered `role="dialog"` `aria-modal="true"` `aria-labelledby` modal rendering the current entry's 2-4 highlights via `createElement`+`textContent`, an interpolated `{X.Y}` headline, a focus trap, and focus moved into the dialog on mount.
- **Dismiss**: one helper for Close, Escape, and "See everything new" — each removes the overlay, restores focus to the opener, unlocks scroll, and records `last-seen = APP_VERSION`. "See everything new" records the version BEFORE navigating to `changelog.html#{entry.anchor}`. Backdrop/outside click has no handler at all (D-09).

Version is read only from `window.AppVersion.APP_VERSION` (grep-confirmed no `INTEGRITY_TOKEN`); the exact existing key `sg.whatsNewLastSeenVersion` is reused (no invented key); `innerHTML` appears only in a comment.

**Task 2 — `.whats-new-*` popup CSS in `assets/app.css`** (commit 390f65a): A token-based block placed adjacent to `.welcome-overlay`. Modest centered modal (`max-inline-size: 420px`, `border-radius: 16px` — sketch 005 values), backdrop `--color-modal-overlay-bg`, surface/text via semantic tokens. Logical properties only (RTL-safe, zero JS), a `[data-theme="dark"]` headline refinement, `focus-visible` 2px outline, 44px tap-target floor. Zero literal hex.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking / false-reuse premise] `.btn-primary` / `.btn-quiet` classes do not exist**
- **Found during:** Task 1 (read_first) / Task 2 planning.
- **Issue:** Both tasks instruct the popup buttons to "reuse the app's existing `.btn-primary` (filled) and `.btn-quiet` (neutral)". A codebase-wide grep found no such classes in the chrome CSS — only `.landing-btn-primary` in `landing.css` (not loaded on chrome pages). This is the pattern-mapper false-reuse premise pitfall: relying on those classes would have shipped unstyled buttons.
- **Fix:** The buttons carry the test-required `.whats-new-seeall` / `.whats-new-close` classes (asserted by T-42-V4), and those classes are styled DIRECTLY in the `app.css` popup block — mirroring how the welcome overlay self-defines `.welcome-cta--primary` / `.welcome-cta--secondary` rather than reusing generic button classes. Primary = single filled accent (`--color-primary` + `--color-text-inverse`); Close = quiet neutral (`--color-surface-secondary-btn`). No new global button classes were introduced (avoided scope creep).
- **Files modified:** assets/whats-new.js, assets/app.css
- **Commits:** f6ce33a, 390f65a

## Threat surface

All three plan-registered threats are honored: T-42-01 (all highlight/copy text via `createElement`+`textContent`; `innerHTML` only in a comment) — mitigated & test-guarded (T-42-V5); T-42-06 (version read only from `AppVersion.APP_VERSION`) — grep-verified; T-42-02 (storage flag) — reads/writes wrapped in `lsGet`/`lsSet` try/catch. No new security surface introduced beyond the plan's threat model.

## Verification

- `node tests/42-whats-new-gating.test.js` → 3 passed, 0 failed (T-42-V1/V2/V3).
- `node tests/42-whats-new-dismiss.test.js` → 5 passed, 0 failed (T-42-V4×4, V5).
- `node -c assets/whats-new.js` → OK.
- Acceptance greps: no `INTEGRITY_TOKEN`; `innerHTML` only in a comment; no backdrop click handler; no literal hex in the popup CSS block; logical properties only; `[data-theme="dark"]` variant present.
- Not field-verified: real offline popup behavior on an installed PWA (jsdom cannot exercise the SW) — deferred to the phase-gate UAT per the plan.

## Notes for downstream plans

- **Plan 08** must add `whatsNew.title` (with the `{X.Y}` placeholder), `whatsNew.sub`, `whatsNew.seeAll`, `whatsNew.close` to all 4 locales. Until then this surface renders calm EN fallbacks via `tf(key, fallback)`; once the keys land, `whatsNew.title`'s `{X.Y}` is interpolated to the running major.minor. (The headline is intentionally NOT given a `data-i18n` attribute because its value is version-interpolated — a mid-popup language switch must not clobber the version; `sub`/`seeAll`/`close` do carry `data-i18n`.)
- The "See everything new" CTA deep-links to `changelog.html#{entry.anchor}` (e.g. `#v1-3`) — Plan 06's page is the target.

## Self-Check: PASSED
- assets/whats-new.js — FOUND
- assets/app.css (.whats-new-* block) — FOUND
- Commit f6ce33a — FOUND
- Commit 390f65a — FOUND
