---
phase: 40-first-run-welcome-onboarding-coordinator
reviewed: 2026-07-08T10:53:55Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - assets/app.css
  - assets/app.js
  - assets/attention-coordinator.js
  - assets/i18n-cs.js
  - assets/i18n-de.js
  - assets/i18n-en.js
  - assets/i18n-he.js
  - tests/39-help-entry.test.js
  - tests/40-app-wiring.test.js
  - tests/40-coordinator.test.js
  - tests/40-i18n-parity.test.js
  - tests/40-install-nudge.test.js
  - tests/40-ios-banner-removed.test.js
  - tests/40-precache.test.js
  - tests/40-welcome-overlay.test.js
  - index.html
  - add-client.html
  - add-session.html
  - report.html
  - reporting.html
  - sessions.html
  - settings.html
  - help.html
  - sw.js
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 40: Code Review Report

**Reviewed:** 2026-07-08T10:53:55Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Phase 40 adds a data-driven `AttentionCoordinator` (a one-per-session precedence
registry) plus four governed surfaces (welcome overlay, security note,
install-nudge, mobile-hint), wires it into `app.js`, deletes the legacy iOS
install banner, and precaches the new module. The implementation is unusually
disciplined: arbitration is correct (marker claimed only on real show,
demo/one-per-session gating, throw→false eligibility), i18n parity holds across
all four locales, script load order (coordinator before `app.js`) is correct on
all 8 app pages, the SW precache entry is present with an auto-derived
`CACHE_NAME`, and all eight Phase 40 test files pass (plus the Phase 39
regression). Copy is set via `textContent`/`data-i18n` on the new surfaces,
honoring the stated XSS trust boundary.

No blockers. Two correctness/robustness defects are worth fixing before ship:
an iPadOS Safari install-copy mismatch, and a missing focus contract on a
surface that declares `aria-modal="true"`. Four lower-severity items round out
the list.

Note: no `<structural_findings>` block was provided, so this review is entirely
narrative.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: iPadOS Safari receives incorrect macOS "Add to Dock" install copy

**File:** `assets/attention-coordinator.js:247-254, 259-273, 304-311`
**Issue:** `isMacSafari()` matches on `/Macintosh/ && /Safari\// && !Chromium`.
Since iPadOS 13, iPad Safari reports a `Macintosh` user-agent by default (desktop
mode), so `isMacSafari()` returns `true` on iPad. The mobile-vs-desktop split is
governed only by `isPhoneClass()` (`pointer: coarse` **and** `max-width: 820px`).
An iPad in landscape (~1024px wide, coarse pointer) is therefore **not**
phone-class, flows into `install-nudge`, passes `installEligible()` via the
`isMacSafari()` branch, and `installShow()` renders the else-branch copy
`onboard.install.safariHint` — the macOS "File → Add to Dock" pointer. That
instruction is wrong for iPadOS (iPad installs via Share → Add to Home Screen).
Because the nudge is a deliberate "single ask," it is burned on incorrect copy —
exactly the failure the per-browser gate (D-12) was built to prevent. The
comment on line 244 even asserts macOS Safari is "the ONLY environment where the
File → Add to Dock pointer copy is correct," which iPad violates.
**Fix:** Exclude iPadOS from `isMacSafari()` by also requiring a non-touch
pointer, e.g.:
```javascript
function isMacSafari() {
  try {
    var ua = navigator.userAgent || '';
    var touch = navigator.maxTouchPoints > 1;   // iPadOS reports >1; Mac trackpads report 0
    return /Macintosh/.test(ua)
        && /Safari\//.test(ua)
        && !/Chrome|Chromium|CriOS|Edg|OPR/.test(ua)
        && !touch;
  } catch (e) { return false; }
}
```
(Or widen `isPhoneClass()`/add an iPad branch so large touch devices get the
mobile hint instead.)

### WR-02: Welcome overlay declares `aria-modal="true"` but never moves focus into the dialog or traps it

**File:** `assets/attention-coordinator.js:124-202` (esp. 128-131, 196-201)
**Issue:** `showWelcome()` mounts an overlay with `role="dialog"` and
`aria-modal="true"` and locks body scroll, but it never moves focus into the
dialog on mount and installs no focus trap. Focus remains on whatever element
was active in the background page (for the replay path, the Help menu button),
which `aria-modal="true"` tells assistive tech is now inert — a false promise.
Keyboard users can Tab straight back into the (visually covered) page, and screen
readers are not moved to the dialog. This is a WCAG 2.4.3 (Focus Order) /
2.1.2 (No Keyboard Trap contract) gap. Note the sibling `confirmDialog()` in
`app.js:1137-1139` *does* focus its confirm button on open, so the app has an
established pattern this surface diverges from.
**Fix:** On mount, focus the panel or primary CTA, and restore focus to the
opener on dismiss:
```javascript
// after doc.body.appendChild(overlay);
var opener = doc.activeElement;
primary.focus();
// inside dismiss():
try { if (opener && opener.focus) opener.focus(); } catch (e) {}
```
Optionally add a minimal Tab-wrap between `primary` and `secondary` so focus
cannot escape the dialog while it is open.

## Info

### IN-01: Security note renders via `innerHTML` with interpolated `t()` values, diverging from the surfaces' documented textContent-only trust boundary

**File:** `assets/app.js:1398-1403`
**Issue:** `showFirstLaunchSecurityNote()` builds its markup with
`container.innerHTML = '...' + t('security.note.heading') + '...'`. The
coordinator's header comment (attention-coordinator.js:37-38) states all copy is
set via `textContent`/`data-i18n` and "never variable-interpolated markup — the
overlay's only trust boundary." This surface, now governed by the same
coordinator, is the lone exception. The interpolated values are developer-owned
i18n strings, so this is **not** currently exploitable, but it is the one
governed surface where a translation containing markup would render as HTML.
**Fix:** Build the note with `document.createElement` + `textContent` (mirroring
`makeEl`/`buildCta` in the coordinator), or at minimum set the three text nodes
via `textContent` after inserting a static skeleton.

### IN-02: Public accessors `_getDeferredPrompt` / `_clearDeferredPrompt` have no runtime consumer (dead surface)

**File:** `assets/attention-coordinator.js:374-375`
**Issue:** The module exposes `_getDeferredPrompt()` and
`_clearDeferredPrompt()`, and the header comments (lines 35, 53) claim the Plan
03 install-nudge surface "consumes the captured beforeinstallprompt via
`_getDeferredPrompt()`." In the shipped code, `installEligible()` and
`installShow()` read the closure variable `deferredPrompt` directly (lines 272,
292-299). A repo-wide search finds these two accessors referenced only in
comments, planning summaries, and a test *docstring* — never called. Harmless,
but they are dead public API whose doc comment misdescribes the actual data flow.
**Fix:** Remove both accessors (and correct the header comment), or route
`installShow`/`installEligible` through them if a single access seam is desired.

### IN-03: Empty `else if` branch in the security-note renderer

**File:** `assets/app.js:1391-1393`
**Issue:** `} else if (dismissedAt === '1') { /* Legacy boolean value — treat as
expired, show again */ }` is an empty block. The legacy `'1'` case is already
handled correctly by falling through (the guard `dismissedAt && dismissedAt !==
'1'` skips the 7-day check), so the branch is a pure no-op kept only for a
comment. It reads as an unfinished conditional.
**Fix:** Delete the empty `else if` and move the explanatory comment to the
guard on line 1388, e.g. `// legacy '1' value falls through as expired`.

### IN-04: Chromium install branch leaves an orphaned card after the prompt fires

**File:** `assets/attention-coordinator.js:296-302`
**Issue:** In the Chromium `[Install app]` click handler, after firing
`dp.prompt()` only the button is removed (`install.parentNode.removeChild(install)`).
The card itself (title, body, `No thanks` dismiss, "later" reassurance line)
remains mounted. Whether the user accepts or declines the browser's native
install dialog, the leftover card lingers with a now-dead-ended layout until they
also click dismiss. Minor UX wart, not a correctness bug.
**Fix:** Call `removeCard()` after `dp.prompt()` (the card has served its
purpose once the native prompt is shown), and/or remove it on the `appinstalled`
event.

---

_Reviewed: 2026-07-08T10:53:55Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
