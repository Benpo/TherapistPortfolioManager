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
