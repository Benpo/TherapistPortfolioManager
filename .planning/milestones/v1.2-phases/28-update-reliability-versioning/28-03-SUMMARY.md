---
phase: 28-update-reliability-versioning
plan: 03
subsystem: html-pages
tags: [csp, security-headers, versioning, service-worker, script-load-order]
requires:
  - phase: 28-update-reliability-versioning
    provides: "assets/version.js (Plan 01) — dual-context AppVersion global the app pages now load"
  - phase: 28-update-reliability-versioning
    provides: "verified-equivalent _headers HTTP CSP (Plan 02) — the gate that made the per-page meta safe to delete"
provides:
  - "21 HTML pages with the per-page <meta http-equiv=\"Content-Security-Policy\"> deleted — CSP now sourced ONLY from the _headers HTTP header (single source, no drift)"
  - "20 SW-registered app pages that load <script src=\"./assets/version.js\"> before shared-chrome.js — version constant available to the footer + integrity check (Plan 04)"
affects:
  - "28-04-integrity-check — the footer version label + runtime integrity self-check now have version.js loaded ahead of shared-chrome.js on every app page"
tech-stack:
  added: []
  patterns:
    - "Single CSP source: HTTP header only; zero per-page <meta> CSP (drift class eliminated)"
    - "Load-order-sensitive script wiring: version.js global defined before any consumer (footer/integrity) reads it"
key-files:
  created: []
  modified:
    - index.html
    - add-session.html
    - add-client.html
    - reporting.html
    - sessions.html
    - settings.html
    - license.html
    - demo.html
    - disclaimer.html
    - disclaimer-en.html
    - disclaimer-he.html
    - disclaimer-cs.html
    - impressum.html
    - impressum-en.html
    - impressum-he.html
    - impressum-cs.html
    - datenschutz.html
    - datenschutz-en.html
    - datenschutz-he.html
    - datenschutz-cs.html
    - landing.html
decisions:
  - "CSP meta deletion was byte-mechanical: the meta line is identical (2-space indent) across all 21 pages, so a single exact-match line delete per file removed it with zero collateral edits"
  - "version.js inserted before shared-chrome.js, matching each page's existing script-block indentation (2-space on 15 pages, 0-space on the 4 disclaimers)"
  - "demo.html has NO shared-chrome.js (it renders its own chrome via demo.js); version.js was placed before its first ./assets/ script (i18n-en.js) to keep it present + load-order-safe and satisfy the 20-page count + SW-page presence check"
metrics:
  duration: 6min
  completed: 2026-06-22
status: complete
---

# Phase 28 Plan 03: Converge CSP source + wire version.js into app pages Summary

**All 21 HTML pages now carry zero CSP `<meta>` tags (CSP is sourced solely from the verified-equivalent `_headers` HTTP header — one source, no drift), and the 20 SW-registered app pages load `assets/version.js` ahead of `shared-chrome.js` so the footer label and integrity check (Plan 04) can read the source-of-truth version constant.**

## What Was Built

### Task 1 — Delete the per-page CSP `<meta>` from all 21 HTML pages (VER-04)
Confirmed Plan 02's `_headers` CSP was signed off byte-equivalent and SAFE TO DELETE before touching anything. The `<meta http-equiv="Content-Security-Policy" content="...">` line was verified byte-identical (2-space indent) across all 21 pages, so a single exact-match line delete per file removed it mechanically:
- **0 pages** now carry a CSP `<meta>` (down from 21).
- `_headers` still contains the `Content-Security-Policy:` header (the deletion did not orphan the CSP — the Plan 02 gate was re-confirmed by the automated check before/after deletion).
- Other `<meta>` tags (charset, viewport, theme-color, OG) untouched — `git diff` confirmed exactly 21 files, 21 single-line deletions, no other content changed.
- **Commit:** `5195336` (refactor)

### Task 2 — Inject `version.js` above `shared-chrome.js` on the 20 app pages (VER-02 wiring)
Added `<script src="./assets/version.js"></script>` immediately before the `shared-chrome.js` tag on the 19 app pages that load shared-chrome (15 at 2-space indent, the 4 disclaimers at 0-space — matched per file). `demo.html` (SW-registered but with no shared-chrome.js — it draws its own chrome via `demo.js`) received version.js before its first `./assets/` script so the constant is present and load-order-safe.
- Every page containing `serviceWorker.register` now also contains `assets/version.js`, with version.js loading **before** shared-chrome.js on every page that has it (load order verified by the plan's automated check).
- `grep -l "assets/version.js" *.html | wc -l` = **20**.
- `landing.html` correctly **excluded** (0 hits) — no SW registration, renders its own footer via `landing.js`.
- The inline SW-registration snippet was **not** edited on any page (D-06 launch/visibilitychange logic lives in `app.js`, already loaded everywhere). `git diff` confirmed exactly 20 files, 20 single-line insertions.
- **Commit:** `3c51b3e` (feat)

## Decisions Made
- **Byte-mechanical CSP deletion.** The meta line being identical across all 21 pages let me delete it with an exact-match line filter per file — guaranteeing no surrounding markup (other meta tags, head spacing) was disturbed. Verified by diff: 21 files / 21 deletions / nothing else.
- **Per-file indentation matched on the version.js insert.** 15 pages use 2-space script indentation, the 4 disclaimers use 0-space; the inserted line matched each so the diff is a clean single-line add with no reflow.
- **demo.html special-cased.** It is SW-registered (so the verify requires version.js) but has no `shared-chrome.js`. The plan's load-order check only fails when shared-chrome exists AND version.js follows it — so placing version.js before demo's first asset script satisfies both the presence requirement and the count of 20, while keeping the constant available before any future consumer.

## Deviations from Plan
None — plan executed exactly as written. No Rule 1–4 deviations. demo.html's lack of a shared-chrome.js tag was handled within the plan's stated intent (version.js present + load-order-safe on every SW page); it is not a deviation since the plan's action centers on "before shared-chrome.js" and demo.html has no such anchor — the constant was placed early in its script block instead. No CLAUDE.md conflicts (no Lemon Squeezy store interaction).

## Issues Encountered
- The local `.git/hooks/pre-commit` cache-bump hook printed `WARNING: Could not parse version from sw.js — skipping auto-bump.` on both commits. This is expected and benign: Plan 01 removed the numeric `CACHE_NAME` literal from `sw.js` (it's now token-derived), so the hook has nothing to parse. This is exactly the now-redundant hook Plan 01 flagged for manual removal (`rm .git/hooks/pre-commit`). No effect on the commits.

## Threat Model Outcome
- **T-28-08** (XSS via CSP meta deletion): mitigated — deletion was gated on Plan 02's verified-equivalent header; the automated check re-confirmed `_headers` still carries the CSP before/after deletion. CSP is never absent — it only moved source.
- **T-28-09** (script load-order tampering): mitigated — automated check asserts version.js loads before shared-chrome.js on every app page; the wrong order would at most make the footer read undefined (handled defensively in Plan 04), not a security issue.
- **T-28-SC** (package installs): n/a — zero-build project, no installs.

## Next Phase Readiness
- **Plan 04 (footer + integrity)** can now read `window.AppVersion.APP_VERSION` (footer label → `v1.2.0`) and `window.AppVersion.INTEGRITY_TOKEN` (runtime self-check + footer `⚠` marker), since version.js is guaranteed loaded before shared-chrome.js on all 20 app pages.
- VER-04 is fully closed (single CSP source). VER-02 wiring side is in place; the consuming footer/integrity code lands in Plan 04.

## Self-Check: PASSED
- FOUND: 0 CSP `<meta>` across all *.html (grep returns 0)
- FOUND: `_headers` still contains `Content-Security-Policy:`
- FOUND: 20 pages load `assets/version.js`; landing.html excluded (0)
- FOUND commit 5195336 (Task 1 — CSP meta deletion)
- FOUND commit 3c51b3e (Task 2 — version.js wiring)

---
*Phase: 28-update-reliability-versioning*
*Completed: 2026-06-22*
