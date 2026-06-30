---
created: 2026-06-28T19:30:00.000Z
title: Demo-mode window.name spoofing — accepted limitation (revisit path documented)
area: security-hardening
priority: low
type: decision-record
files:
  - assets/db.js
  - demo.html
  - index.html
  - sessions.html
  - settings.html
  - add-session.html
  - add-client.html
  - report.html
  - reporting.html
---

## Decision (2026-06-28): accept as a known limitation ("Option A")

Surfaced in the 2026-06-28 codebase remap (`CONCERNS.md`). Demo mode is keyed on
`window.name === 'demo-mode'` — set once in `demo.html`, read in `assets/db.js` (DB
selection: `demo_portfolio` vs `sessions_garden`), `demo.js`, `demo-seed.js`, `app.js`,
`backup-modal.js`, and the inline `<head>` gate scripts of all 7 app pages
("demo-mode bypasses all gates").

**The concern:** `window.name` persists across navigations and can be set by an external
page, which could then navigate a visitor to the app and land them in demo mode.

**Why we accept it:** severity is **low**. Demo mode uses a *separate* IndexedDB
(`demo_portfolio`), so real user data is never touched or exposed — worst case is a confused
"where did my data go?" until the tab is closed, in a contrived click-a-malicious-link flow,
for a user who already has real data. Not worth the regression risk to the launch-critical
demo UX.

**Why `window.name` was chosen (don't "fix" naively):** it is the only mechanism that is
(a) readable *synchronously in the inline `<head>`* before any module loads, AND (b) persists
across same-tab navigation — so the framed demo stays in demo mode without threading a flag
through every internal link.

## If ever revisited — preferred fix path

**Option B — framed-guard (best cost/benefit):** the demo only ever runs inside a same-origin
iframe (`landing.html` → `src="./demo.html"`). Additionally require the page be framed
(`window.self !== window.top`); an attacker navigating the *top* window to the app would not be
framed and would fail the check. Keeps `window.name`'s sync-read + persistence. Small change,
but duplicated across 7 inline gates and couples demo to "must run framed" (confirm `demo.html`
is never opened standalone first).

Rejected alternatives: `?demo=1` URL param (doesn't auto-persist across navigation — invasive,
regression-prone); `sessionStorage` flag (iframe partitioning is subtle/browser-dependent).

**Status:** no action planned. Documented so the next remap / reviewer doesn't re-raise it as new.

## Update (2026-06-30): Phase 35 widened the blast radius (code-review WR-01)

Phase 35's demo lock-down added more `window.name==='demo-mode'` consumers on top of the
DB-switch (`db.js`) and gate-bypass (inline `<head>`): it now also **hides backup-cloud /
Export / Import / license controls**, **blocks the programmatic `openExportFlow`**
(`backup-modal.js`), and **redirects in-app/legal nav back into the demo** (`shared-chrome.js`
`getNavigationContext`, `app.js redirectDemoBrandLink`). So a stray demo-mode flag reaching a
real top-level page now strips controls in addition to swapping the DB — the "where's my data?"
failure is a bit louder. The code-review fix recommendation (sanitize at the real gate via a
`window.top === window.self` check) is the **same Option B framed-guard** already documented
above. Still low severity (separate `demo_portfolio` DB; contrived flow), still no action
planned — but if the demo ever escapes its iframe in the wild, Option B closes both the
DB-swap and the new control-stripping at once.
