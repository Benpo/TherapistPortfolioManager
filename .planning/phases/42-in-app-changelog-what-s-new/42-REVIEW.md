---
phase: 42-in-app-changelog-what-s-new
reviewed: 2026-07-09T00:00:00Z
depth: standard
files_reviewed: 31
files_reviewed_list:
  - add-client.html
  - add-session.html
  - assets/app.css
  - assets/app.js
  - assets/attention-coordinator.js
  - assets/changelog-content-en.js
  - assets/changelog.css
  - assets/changelog.js
  - assets/help.css
  - assets/i18n-cs.js
  - assets/i18n-de.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/shared-chrome.js
  - assets/whats-new.js
  - changelog.html
  - help.html
  - index.html
  - report.html
  - reporting.html
  - sessions.html
  - settings.html
  - sw.js
  - tests/42-changelog-integrity.test.js
  - tests/42-changelog-render.test.js
  - tests/42-coordinator-tour-guard.test.js
  - tests/42-demo-gate.test.js
  - tests/42-i18n-parity.test.js
  - tests/42-precache.test.js
  - tests/42-whats-new-dismiss.test.js
  - tests/42-whats-new-gating.test.js
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 42: Code Review Report

**Reviewed:** 2026-07-09
**Depth:** standard
**Files Reviewed:** 31
**Status:** issues_found

## Summary

Reviewed the in-app changelog + What's-New popup implementation: the new data
source (`changelog-content-en.js`), page renderer (`changelog.js`), popup
surface (`whats-new.js`), the coordinator tour-suppression guard, the new
`changelog.html` chrome page, SW precache additions, i18n keys in 4 locales,
entry-point wiring (help menu row, footer version link, help see-also), and 8
new test files.

Core correctness is solid: the once-per-version gate, D-07 silent-skip
reconcile, deliberate-dismiss contract, EN-fallback locale merge, demo gates,
and the two-array precache split (extensionless `/changelog` in PRECACHE_HTML,
four sub-resources in PRECACHE_URLS) all check out against the SW fetch
handler's `.html`-stripping offline fallback. All dynamic text renders via
`createElement` + `textContent` — no injection surface; the only new
`innerHTML` interpolation (`shared-chrome.js` footer version link) uses the
compile-time `APP_VERSION` constant. `APP_VERSION` is `1.3.0` and a matching
entry exists, so the popup fires on this release. All 8 phase tests pass when
run.

No blockers. Three warnings — a chrome-page integration gap on
`changelog.html` (missing tour engine leaves a dead menu row), an unreliable
anchor deep-link (entries render after the browser's fragment scroll), and a
hardcoded English "Version" label that bypasses the D-17 chrome-i18n rule —
plus four informational items.

## Warnings

### WR-01: changelog.html omits tour.js/tour.css — the help popover's "Onboarding Tour" row is a dead control on that page

**File:** `changelog.html:71-96` (script list), `assets/app.js:525-527`
**Issue:** Every other chrome-mounting page loads `./assets/tour.js` +
`tour.css` (Phase 41 architect-gate A1: "all 8 app-chrome pages").
`changelog.html` is a new ninth chrome page and loads neither. `App.initCommon`
still mounts the full help-entry popover there, including the "Onboarding Tour"
row, whose handler is `if (typeof window.Tour !== 'undefined') window.Tour.start()`
— on the changelog page this silently does nothing when clicked (a visible menu
item with no effect). The same silent no-op applies to the coordinator's
`tour-reminder` surface (its Start button, `attention-coordinator.js:481-484`)
and the welcome overlay's primary CTA (`attention-coordinator.js:247-251`),
both of which can legitimately mount on the changelog page since it runs
`AttentionCoordinator.run()` via `initCommon`. A user who set "remind me later"
for the tour and lands on the changelog page gets an offer card whose Start
button does nothing.
**Fix:** Add the tour engine to changelog.html alongside the other chrome
scripts (and precache already covers both files):
```html
<script src="./assets/app.js"></script>
<script src="./assets/tour.js"></script>
```
plus `<link rel="stylesheet" href="./assets/tour.css" />` in `<head>`.
Alternatively, if the tour is deliberately excluded from this page, filter the
`help.entry.takeTour` row (and suppress the tour-reminder surface) when
`typeof window.Tour === 'undefined'` so no dead control ever renders.

### WR-02: Changelog anchor deep-links are unreliable — entries render after the browser's fragment scroll

**File:** `assets/changelog.js:119-136` (render), `146-153` (boot); `assets/whats-new.js:211-217`
**Issue:** The data schema declares each `anchor` "IS the changelog.html#v1-3
fragment target", and the popup's "See everything new" CTA navigates to
`changelog.html#<anchor>`. But `#changelogEntries` ships empty and is only
populated after `App.initCommon()` (async IndexedDB settings load) resolves in
`boot()`. The browser's native scroll-to-fragment runs against the parsed DOM
where the target id does not yet exist, so whether the page ends up scrolled to
the anchor is a race (and reliably fails once render lands after the `load`
event). It happens to be invisible today because the popup always links the
newest entry, which renders at the top — but any deep-link to an older anchor
(`#v1-1`, future emails/help links, or simply a longer history pushing `#v1-3`
below the fold) lands at the top of the page instead of the entry.
**Fix:** After `render()` completes in `boot()`, re-apply the fragment:
```js
if (window.location.hash) {
  var target = document.getElementById(window.location.hash.slice(1));
  if (target) target.scrollIntoView();
}
```
(Guard so it runs once on boot, not on every `app:language` re-render.)

### WR-03: "Version" heading label is hardcoded English in changelog.js — bypasses the D-17 chrome-i18n contract

**File:** `assets/changelog.js:45-47`
**Issue:** `versionLabel()` returns `"Version " + …` as a literal English
string. Phase 42's own rule (D-17, restated in the i18n file comments) is that
all page/popup UI *chrome* ships localized in all 4 locales — and every other
chrome string on this page (title, intro, New/Improved/Fixed labels) correctly
goes through `App.t()`. On the Hebrew page the card headings render as English
"Version 1.3" (an LTR fragment inside an RTL heading) while the surrounding
chrome is Hebrew. Because no i18n key exists for it, Phase 42.1 (translation
pass) will not catch it either — the key set is pinned by
`tests/42-i18n-parity.test.js`, which knows nothing about this string.
**Fix:** Add a `changelog.entry.version` key ("Version {V}") to all four
locale files and interpolate:
```js
function versionLabel(version) {
  var v = String(version == null ? "" : version).replace(/\.0$/, "");
  var raw = t("changelog.entry.version");
  return (raw !== "changelog.entry.version" && raw.indexOf("{V}") !== -1)
    ? raw.replace("{V}", v)
    : "Version " + v;
}
```
And add the new key to the parity test's key list.

## Info

### IN-01: whats-new.js silent-skip reconcile writes real-app localStorage from the sales demo

**File:** `assets/whats-new.js:234-240`
**Issue:** The `reconcileSilentSkip` IIFE runs at script eval on every page —
including pages loaded inside the demo iframe (`window.name === 'demo-mode'`),
which shares the origin's localStorage with the real app. Every other Phase
40/42 write path is demo-gated (coordinator `run()` returns on `isDemo()`; the
menu row and footer link are filtered), but this eval-time write is not. Impact
is currently nil (the write only fires when APP_VERSION has no entry, and the
value written is the same one a real-app load would write), but it is the first
non-demo-gated localStorage write in this subsystem and breaks the "demo never
mutates app state" invariant.
**Fix:** Early-return in the IIFE: `if (window.name === 'demo-mode') return;`.

### IN-02: i18n parity gate does not assert the {X.Y} token survives in whatsNew.title — a tokenless translation is silently discarded

**File:** `tests/42-i18n-parity.test.js` (key checks), `assets/whats-new.js:121-127`
**Issue:** `show()` only uses a translated `whatsNew.title` when it contains
the literal `{X.Y}` token; otherwise the *entire* localized title is dropped in
favor of the hardcoded English fallback. All four locales currently keep the
token, but the parity test checks only presence/non-empty/no-emoji — so a
future translation pass (Phase 42.1) that loses the token would silently swap
the popup headline to English with no test failure.
**Fix:** Add an assertion to the parity test:
`assert(dict['whatsNew.title'].includes('{X.Y}'))` for every locale.

### IN-03: eligible() treats an origin (highlight-less) entry as announceable — popup would render with an empty bullet list

**File:** `assets/whats-new.js:88-93`, `141-148`
**Issue:** `eligible()` requires only that *an* entry exists for APP_VERSION.
An `origin:true` entry (v1.0.0 schema: no `highlights`) satisfies it, and
`show()` would mount the popup with an empty `<ul>`. Unreachable today
(APP_VERSION is 1.3.0, and the integrity test forces highlights on content
entries), but the gate's own stated contract is "only when there's something to
announce".
**Fix:** Tighten the gate:
`return !!(e && Array.isArray(e.highlights) && e.highlights.length > 0);` where
`e = entryFor(v)`.

### IN-04: Duplicated load-order comment on the 8 chrome pages claims a constraint changelog.html itself disproves

**File:** `index.html:362-366` (same block in add-client, add-session, report, reporting, sessions, settings, help); `changelog.html:89-96`
**Issue:** The comment repeated on the eight pages says the data global and
popup "must be present before app.js runs initCommon" — implying a script-tag
ordering dependency. The real constraint is only "registered before
DOMContentLoaded" (initCommon runs on DOMContentLoaded, after all sync
scripts), which is why changelog.html loading the same two files *after*
app.js works fine. The inaccurate comment invites a future maintainer to
"fix" changelog.html's ordering or to over-constrain new pages.
**Fix:** Reword the comment to state the actual constraint ("must evaluate
before DOMContentLoaded so the surface is registered when initCommon calls
AttentionCoordinator.run()"), or align changelog.html's ordering and comment
with the other pages for consistency.

---

_Reviewed: 2026-07-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
