---
phase: 35-demo-system-refresh-version-parity
reviewed: 2026-06-30T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - assets/app.js
  - assets/backup-modal.js
  - assets/demo-seed-data.json
  - assets/demo-seed.js
  - assets/i18n-cs.js
  - assets/i18n-de.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/license.js
  - assets/shared-chrome.js
  - demo.html
  - sw.js
  - tests/30-fake-test-detector.test.js
  - tests/35-demo-chrome.test.js
  - tests/35-demo-exposure.test.js
  - tests/35-demo-nav.test.js
  - tests/35-demo-seed.test.js
  - tests/35-demo-static.test.js
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 35: Code Review Report

**Reviewed:** 2026-06-30
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed the Phase 35 demo refresh: the single-sourced demo chrome
(`shared-chrome.js` + `app.js` header wiring), the relative-date seed
(`demo-seed.js` / `demo-seed-data.json`), the demo-mode lock-down guards
(`window.name==='demo-mode'`) across `app.js`, `license.js`, `backup-modal.js`,
and the iframe-escape nav fixes. The implementation is solid and well-tested —
all five phase-35 test files execute and pass (verified exit code 0), the seed
schema is clean (the `after: null` issue values are correctly handled by
`overview.js`), the Heart-Shield arc is well-formed, `demo-hints.js` was removed
with no dangling references, and the i18n key `toast.exportDisabledDemo` was
added in all four languages. The new guards are uniformly null-guarded.

No blockers. Two warnings concern the **robustness of the `window.name` demo
seam** (whose blast radius this phase materially expanded) and a **month-edge
date-counting bug** whose code comment misdescribes the fix. Two info items
cover demo/real parity drift and seed-transform input validation.

## Warnings

### WR-01: `window.name==='demo-mode'` is a sticky per-tab seam; Phase 35 widened its blast radius and a leak silently swaps the real DB

**File:** `assets/app.js:264,314,333,349,476`, `assets/license.js:430`, `assets/backup-modal.js:244,302`, `assets/db.js:2`, `index.html:9` (cross-reference)
**Issue:**
`window.name` is the single seam for demo mode. It is a string property that
**persists across same-origin navigations within the same tab/frame**. Before
Phase 35 a leaked `demo-mode` only showed a banner. After Phase 35 the same flag
now also: hides the backup cloud button, hides Export/Import, disables license
activation/deactivation, blocks `openExportFlow`, and pins navigation to
`./demo.html`. Combined with the two pre-existing consumers of the same flag —
`db.js:2` (`DB_NAME = window.name==='demo-mode' ? 'demo_portfolio' : 'sessions_garden'`)
and `index.html:9` (the license gate is bypassed when `window.name==='demo-mode'`)
— a leaked flag on a **real top-level app page** would: silently switch the
licensed user to the empty `demo_portfolio` DB (their real clients/sessions
appear to vanish), bypass the license/landing redirect, and strip backup/export/
license controls.

In normal product use the demo is iframed (`landing.html:229` `src="./demo.html"`),
and the iframe's `window.name` is isolated from the top window, so there is no
leak today. The risk is the edge path: a user opens `/demo` **top-level** in a
tab (it is a precached, linkable URL) and then same-tab navigates to a real app
page (manual URL / history back). Because the flag also gates the IndexedDB name,
the failure mode ("all my data is gone") is more than cosmetic. This is not a
new *security* bypass — the app already trusts the client (`license.js` comments
acknowledge the obfuscation is "cosmetic") — but the accidental-leak surface
grew.

**Fix:** Make the seam non-sticky for real pages. Either clear it on legitimate
non-demo entry, or scope demo detection to something navigation-local instead of
the global `window.name`. Minimal example — neutralize a stale flag at the top of
the real gate before any consumer reads it:
```js
// index.html Gate 0 — only treat demo-mode as real when actually framed as the demo
(function(){try{
  if (window.name === 'demo-mode' && window.top === window.self) {
    window.name = ''; // a top-level real page must not inherit a leaked demo flag
  }
  if (window.name === 'demo-mode') return;
  if (!localStorage.getItem('portfolioLicenseActivated')) window.location.replace('./landing.html');
}catch(e){}})();
```
(Pick one canonical place to sanitize so `db.js` and the `app.js` guards all see
the corrected value.)

### WR-02: `countSessionsThisMonth` parses `YYYY-MM-DD` as UTC — month-edge undercount; the `demo-seed.js` comment claims a fix it does not provide

**File:** `assets/demo-seed.js:16-18` (misleading comment) → `assets/overview.js:568` (actual defect, cross-reference)
**Issue:**
`isoDaysAgo()` correctly anchors generation at local noon, so the produced
`YYYY-MM-DD` string is the intended **local** calendar date. But the comment at
`demo-seed.js:16-18` claims the noon anchor protects the consumer:
*"countSessionsThisMonth re-parses this string with local `new Date(session.date)`."*
That is factually wrong — `new Date("2026-07-01")` is parsed as **UTC midnight**,
not local. The noon anchor protects the generation arithmetic only; it does
nothing for the consumer's parse.

`countSessionsThisMonth` (`overview.js:568`) does `new Date(session.date)` then
reads local `.getMonth()/.getFullYear()`. In any negative-UTC-offset timezone
(the Americas), a session whose local date is the 1st of the month parses to the
previous month. Concretely: on the 1st of a month, the seed's `daysAgo: 0`
("today") session maps to `YYYY-MM-01`, which a US-Pacific demo visitor's
`countSessionsThisMonth` reads as the *previous* month — so the "Sessions This
Month" stat undercounts (can show 0 with a session dated today). A visible demo
glitch ~once per month for western-hemisphere visitors, and the relative-date
model makes month-boundary dates routine.

**Fix:** Parse as local in `countSessionsThisMonth`, and correct the misleading
comment in `demo-seed.js`:
```js
function countSessionsThisMonth(sessions) {
  const now = new Date();
  const m = now.getMonth(), y = now.getFullYear();
  return sessions.filter((s) => {
    if (!s.date) return false;
    const [yy, mm] = s.date.split('-').map(Number); // parse as LOCAL calendar fields
    return (mm - 1) === m && yy === y;
  }).length;
}
```

## Info

### IN-01: `demo.html` ships a stale overview card with dead Export/Import controls

**File:** `demo.html:91-95`
**Issue:** `demo.html` carries an inline overview card with `#exportBtn`,
`.import-label`, and `#importInput`. The production `index.html` no longer has
these (export/import moved to the cloud-icon Backup modal owned by
`backup-modal.js`), and `demo.html` does **not** load `backup-modal.js`, so these
controls have no event handlers in the demo — they are dead. `hideDemoExposedControls`
(`app.js:313`) hides them rather than the card being aligned with `index.html`.
Functionally harmless (hidden + no handler), but it is parity drift in a phase
titled "version parity," and the only thing keeping dead destructive-looking
controls out of view is a JS hide pass.
**Fix:** Align `demo.html`'s overview card with `index.html`'s (cloud-icon entry
point), or delete the dead `#exportBtn`/`.import-label`/`#importInput` markup from
`demo.html` so the hide pass guards live controls only.

### IN-02: `applyRelativeDates` does not validate `daysAgo`; a missing/non-numeric value yields a silent `"NaN-NaN-NaN"` date

**File:** `assets/demo-seed.js:31-38,19-27`
**Issue:** `applyRelativeDates` calls `isoDaysAgo(s.daysAgo)` with no check that
`daysAgo` is a number. If a future seed session omits `daysAgo` (or ships a
string), `base.setDate(base.getDate() - undefined)` produces an Invalid Date and
the session's `date` becomes the string `"NaN-NaN-NaN"`, which then silently
fails every downstream date comparison instead of erroring loudly. The current
JSON has `daysAgo` on all 11 sessions and `tests/35-demo-seed.test.js` (DEMO-07)
gates this, so it is latent only.
**Fix:** Guard the transform, e.g. `if (typeof s.daysAgo !== 'number' || !Number.isInteger(s.daysAgo)) { copy.date = s.date || isoDaysAgo(0, now); }` (or throw) so a malformed future seed fails fast rather than seeding nonsense dates.

---

_Reviewed: 2026-06-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
