---
phase: 39-help-center-entry-point
reviewed: 2026-07-07T22:23:43Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - assets/app.js
  - assets/help-content-en.js
  - assets/help.css
  - assets/help.js
  - assets/i18n-cs.js
  - assets/i18n-de.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - assets/overview.js
  - assets/reporting.js
  - assets/sessions.js
  - assets/version.js
  - tests/39-empty-state-coaching.test.js
  - tests/39-help-entry.test.js
  - tests/39-help-integrity.test.js
  - tests/39-help-precache.test.js
  - tests/39-help-render.test.js
  - help.html
  - reporting.html
  - sw.js
findings:
  critical: 0
  warning: 2
  info: 7
  total: 9
status: issues_found
---

# Phase 39: Code Review Report

**Reviewed:** 2026-07-07T22:23:43Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Reviewed the Phase 39 additions (offline help center, "?" header entry, empty-state coaching trio, 11 i18n chrome keys x4 locales, SW precache + v1.3.0 bump) against the phase diff (4493f7d..HEAD). Review was adversarial and behavior-driven, not shape-driven:

- **Verified by execution:** all five Phase 39 test files pass (`node tests/39-*.test.js`, 0 failures). A standalone script confirmed every `{ui:key}` token in help-content-en.js resolves against I18N.en, all section/topic ids are unique, and all three `HELP_DEEPLINKS` values resolve to real section ids.
- **Verified integration points:** the three hardcoded coaching hrefs (`#adding-a-client`, `#starting-a-session`, `#overview`) match `HELP_DEEPLINKS`; all help.html script/style/image dependencies (including `watering-can.png`, Rubik faces, snippets-seed.js, backup trio) are present in `PRECACHE_URLS`; `/help` follows the redirect-safe `PRECACHE_HTML` pattern; the navigation fetch handler's `.html`-stripping correctly maps `help.html` to the `/help` cache key offline; `CACHE_NAME` derives from the deploy-stamped `INTEGRITY_TOKEN`, so the cache rolls per deploy independent of the semver bump.
- **Security:** clean. All dynamic text is built via `createElement`/`textContent`; the only `innerHTML` sinks are compile-time-literal SVG strings (app.js glyph, help.js chevrons/GLYPHS). The search-echo XSS gate (T-39-06) is real and falsifiable. No secrets, no eval outside test sandboxes, no debug artifacts in shipped files.
- **Sessions Pitfall-3 (TRUE-empty vs FILTER-empty)** is correctly implemented — `totalSessions` is derived from the unfiltered source before filtering, and the negative guard test covers it.

One reproduced runtime bug (WR-01, confirmed in jsdom against the real files) and one ARIA-correctness gap ship with this phase; the rest are quality/maintainability items.

## Warnings

### WR-01: Language switch during an active search leaves the help page in an inconsistent, visibly broken state

**File:** `assets/help.js:349-456` (render), `assets/help.js:279-326` (applySearch), `assets/help.js:253-277` (buildSearchEmpty)
**Issue:** `render()` re-runs on `app:language` (line 452-455) and rebuilds all cards fully visible with only the featured card open — but it never re-applies (or clears) the active search. Reproduced in jsdom against the real files: type a no-match query, then switch language via the globe. Result after the switch:
- the "no results" box (`#searchEmpty`) keeps its inline `display:block` from the previous `applySearch` while `buildSearchEmpty()` rebuilds `#searchTerm` empty — the user sees a stale "nothing matches" message quoting an empty term (`""`) **above all 12 fully-rendered cards**;
- `body.searching` persists (nothing removes it), so the spine group label stays hidden (help.css:150);
- the search input still contains the query, but no filtering is applied — input state and page state disagree.

The matching-search variant is milder but still wrong: after a language switch every card shows despite live query text in the input.
**Fix:** At the end of `render()`, re-apply the current query instead of leaving state dangling:
```js
// after wireScrollSpy() / openForHash(...) in render():
var desk = document.getElementById("searchDesk");
var mob = document.getElementById("searchMob");
applySearch((desk && desk.value) || (mob && mob.value) || "");
```
(Alternatively clear both inputs and call `applySearch("")` — either way, input state and DOM state must be reconciled on re-render.)

### WR-02: Help popover claims `role="menu"`/`role="menuitem"` with no keyboard interaction — worse than no role for screen-reader users

**File:** `assets/app.js:490,509,522`
**Issue:** The "?" popover sets `aria-haspopup="true"` and `role="menu"` with `role="menuitem"` children, but implements none of the keyboard contract those roles announce: no Escape-to-close, no arrow-key item navigation, no focus move into the menu on open. A screen reader will announce "menu" and instruct arrow-key usage that does nothing. The existing globe popover (app.js:203-275) avoids this trap differently — it claims `listbox` (also imperfect) but the new code actively opts into the strictest ARIA pattern without honoring it. Note also that the mockup's `aria-controls` linkage present on the globe (`app.js:215`) is absent here.
**Fix:** Either implement the menu keyboard contract, or drop to the honest minimum, e.g.:
```js
// keep aria-haspopup/aria-expanded; drop role="menu"/"menuitem"
popover.setAttribute('role', 'group'); // or omit role entirely
// and add Escape dismissal:
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && !popover.hidden) {
    popover.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    btn.focus();
  }
});
```

## Info

### IN-01: Dead CSS class `.search-empty.is-visible` — visibility is toggled by a different mechanism

**File:** `assets/help.css:144`, `assets/help.js:322`
**Issue:** help.css defines `.search-empty.is-visible { display: block; }` but help.js never toggles `is-visible` — it sets inline `box.style.display = show ? "block" : ""`. Two mechanisms exist for one job; one is dead. A future maintainer toggling the class (as the CSS invites) would find it works only accidentally.
**Fix:** Use the class in `applySearch` (`box.classList.toggle("is-visible", show)`) and drop the inline style, or delete the dead rule.

### IN-02: Tech-band visibility check depends on inline-style substring matching

**File:** `assets/help.js:315`
**Issue:** `techBand.querySelector('.help-card:not([style*="none"])')` decides whether any technical card survived the search by substring-matching the serialized `style` attribute. Any future inline style containing "none" (`border:none`, `pointer-events:none`) silently mis-hides the band.
**Fix:** Test the property directly: `Array.prototype.some.call(techBand.querySelectorAll('.help-card'), function (c) { return c.style.display !== 'none'; })`.

### IN-03: Clearing the search collapses cards the user (or a deep link) opened

**File:** `assets/help.js:289`
**Issue:** On empty query, `applySearch` runs `setOpen(card, card.id === featuredId)` — force-resetting every card to closed except featured. A user who arrived via `./help.html#adding-a-client` (card auto-opened per D-11), typed one character, and backspaced loses the deep-linked expansion.
**Fix:** Snapshot open state when a search begins (first non-empty query) and restore it on clear, or simply don't touch open state on clear: `if (!q) { card.style.display = ""; return; }`.

### IN-04: Language re-render scroll-jumps back to the URL hash

**File:** `assets/help.js:449`
**Issue:** `render()` unconditionally calls `openForHash(location.hash)`. Because `render()` re-runs on every `app:language` event, a user who deep-linked in, scrolled elsewhere, then switched language is scrolled back to the hash anchor.
**Fix:** Only invoke `openForHash` on the initial render (guard with a `_booted` flag), or pass a flag from the `app:language` handler that skips the hash scroll.

### IN-05: Mailto popover item leaves the "?" popover open after activation

**File:** `assets/app.js:517-526`
**Issue:** Clicking "Contact us" opens the mail client without navigating, and the click is inside the popover so the outside-click handler never fires — the popover stays open. The globe pattern closes on option selection (app.js:242-244). ("Help center" is unaffected because it navigates away.)
**Fix:** In the `items.forEach` loop, add `a.addEventListener('click', function () { popover.hidden = true; btn.setAttribute('aria-expanded', 'false'); });`.

### IN-06: Static English aria-labels on an otherwise translated help page

**File:** `help.html:67,70,84,88`, `assets/help.js:197`
**Issue:** `aria-label="Search help"`, `aria-label="Help sections"`, `aria-label="Jump to a section"` and the rail toggle's `"Show topics"` remain hardcoded EN while the visible placeholder/title use the new `help.search.placeholder`/`help.page.title` keys. D-18 scopes EN-only to the help *body*; these are chrome. A Hebrew screen-reader user hears English control labels beside a Hebrew placeholder.
**Fix:** Either add them to the 11-key chrome set in a follow-up, or record the exception explicitly next to D-18 so Phase 43's docs gate doesn't treat it as drift.

### IN-07: Stale assertion-count comment in the render test

**File:** `tests/39-help-render.test.js:152`
**Issue:** The comment reads "11 assertions run above (4 + 2 + 4 + 1)" but the actual per-case counts are 4 + 3 + 4 + 1 = 12 (which is why `EXPECTED_CASES = 12` passes and the run reports 13/13 including the guard). The arithmetic in the comment misleads whoever next edits the case list and has to update the guard.
**Fix:** Correct the comment to "12 assertions run above (4 + 3 + 4 + 1); this guard is the 13th."

---

_Reviewed: 2026-07-07T22:23:43Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
