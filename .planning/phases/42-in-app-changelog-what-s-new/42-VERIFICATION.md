---
phase: 42-in-app-changelog-what-s-new
verified: 2026-07-09T19:05:04Z
status: human_needed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Install the app as a PWA (or open on a real device/browser), go fully offline, then launch on any of the 9 chrome-mounting pages after bumping/simulating a version change."
    expected: "The What's-New popup fires exactly once (modest centered modal, latest entry's 2-4 highlights), dismiss/Close/Esc/'See everything new' all record the version, and /changelog loads and renders fully offline (reverse-chronological, version+date grouped)."
    why_human: "jsdom cannot exercise the real Service Worker / offline cache path or a real 'cold launch after version bump' — every plan 05/07/09 SUMMARY explicitly defers this to the phase-gate UAT."
  - test: "Visually inspect the What's-New popup and the /changelog page in light + dark theme and in RTL (Hebrew) layout on a real browser."
    expected: "Popup is a modest 420px centered modal (not full-screen), category headings (New/Improved/Fixed) use the correct color tokens in both themes, RTL logical properties render mirrored correctly, and no LTR artifacts appear in the RTL heading area."
    why_human: "CSS token/RTL correctness and visual weight are not verifiable via grep/jsdom; sketch-mirroring was checked in source only."
  - test: "Triage the three code-review WARNING findings in 42-REVIEW.md before/at ship: WR-01 (changelog.html omits tour.js/tour.css, leaving the help popover's 'Onboarding Tour' row and the tour-reminder Start button dead no-ops on that page), WR-02 (deep-link anchors race the browser's native fragment scroll against async render — currently invisible because the CTA always targets the newest entry, which renders first), WR-03 (changelog.js's 'Version' heading label is hardcoded English, bypassing the phase's own D-17 chrome-i18n rule)."
    expected: "Ben decides whether each is fix-now, deferred (e.g. to Phase 43 or a quick task), or accepted as-is; none currently fail a CHLG-01..04 truth but WR-01 is a real, code-confirmed dead UI control."
    why_human: "These are judgment calls on scope/priority, not correctness questions — the code review already diagnosed root cause and proposed fixes; a human decision on disposition is what's missing."
---

# Phase 42: In-App Changelog & What's-New Verification Report

**Phase Goal:** A practitioner hears about every release inside the app — a once-per-version "What's New" popup plus a persistent, benefit-led changelog page in the help center — driven by one structured data source, with v1.3's own notes as the first entry.
**Verified:** 2026-07-09T19:05:04Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Opening the app after a version change shows a "What's New in vX.Y.Z" popup exactly once (keyed on APP_VERSION vs stored last-seen, suppressed on first-ever launch, works offline); dismiss records the version | VERIFIED | `assets/whats-new.js` `eligible()`/`dismiss()`; behavioral tests `tests/42-whats-new-gating.test.js` (3/3), `tests/42-whats-new-dismiss.test.js` (5/5) all pass; offline precache confirmed in `sw.js` (below) |
| 2 | A persistent changelog page inside the help center shows reverse-chronological, version+date-grouped, plain-language benefit-led entries (New/Improved/Fixed, no dev jargon) | VERIFIED | `changelog.html` + `assets/changelog.js`; `tests/42-changelog-render.test.js` 15/15 pass; real approved copy read directly from `assets/changelog-content-en.js` (no dev jargon, benefit-led) |
| 3 | One structured, i18n-capable data source drives both the popup (latest) and the page (history) — never forked, never git-scraped, no second version constant | VERIFIED | Single `window.CHANGELOG_CONTENT_EN` in `assets/changelog-content-en.js`; both `assets/whats-new.js` and `assets/changelog.js` read it exclusively (grep-confirmed); no `INTEGRITY_TOKEN` reference in any of the three files |
| 4 | v1.3's own release notes ship as the first changelog entry (self-hosting proof) | VERIFIED | First array element `version:"1.3.0"`, `anchor:"v1-3"`, real Ben-approved copy (D-04, 2026-07-09), `tests/42-changelog-integrity.test.js` 9/9 pass |
| 5 | Popup never fires on the same launch as the first-run welcome (Phase 40 coordinator dependency) | VERIFIED | `T-42-V2` (welcome subsume-write makes whats-new ineligible after first-run) passes; PRECEDENCE ordering confirmed in `attention-coordinator.js` |
| 6 | Popup (and every other governed surface) is suppressed while the onboarding tour is active, without burning the one-per-session marker | VERIFIED | Coordinator-level guard at `attention-coordinator.js:101` (`if (window.Tour && typeof window.Tour.isActive === 'function' && window.Tour.isActive()) return;`), placed before the session-marker claim; `tests/42-coordinator-tour-guard.test.js` 4/4 pass including the non-claiming assertion |
| 7 | Coexists with the existing footer version/update nudge without double-signalling | VERIFIED | `assets/shared-chrome.js`: `.app-footer-version-warn` rendered as a sibling OUTSIDE the new `.app-footer-version-link` anchor; `maybeUpgradeFooterAndNudge`/`buildNudge` unmodified (grep-confirmed) |

**Score:** 7/7 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `assets/changelog-content-en.js` | Single structured data source, 4 entries, final approved copy | ✓ VERIFIED | Exists, real approved prose (D-04 APPROVED header), integrity test 9/9 |
| `assets/whats-new.js` | Popup surface: gate/reconcile/show/dismiss | ✓ VERIFIED | Exists, self-registers `{id:'whats-new'}`, all 8 gating/dismiss tests pass |
| `assets/changelog.js` | Reverse-chron Variant-B page renderer, EN-fallback | ✓ VERIFIED | Exists, `window.Changelog` seam, render test 15/15 |
| `changelog.html` | Standalone help-family page shell | ✓ VERIFIED | Exists, correct CSS/script chain confirmed by grep |
| `assets/changelog.css` | Token-based entry/category styles | ✓ VERIFIED | Exists, no literal hex (per plan verify), used by render test |
| `assets/attention-coordinator.js` (tour guard) | run() suppresses all governed surfaces during a tour | ✓ VERIFIED | Guard present at line 101, non-claiming, `tests/40-coordinator.test.js` regression-clean |
| `sw.js` (precache) | 4 sub-resources in PRECACHE_URLS + `/changelog` in PRECACHE_HTML | ✓ VERIFIED | Confirmed via grep; `tests/42-precache.test.js` all pass |
| `assets/i18n-{en,he,de,cs}.js` (10 keys) | changelog.*/whatsNew.* chrome keys, all 4 locales | ✓ VERIFIED | All 10 keys present, non-empty, parity test 3/3 |
| Entry points (app.js menu row, shared-chrome footer link, help.html rail link) | 3 discoverable entry points, demo-hidden | ✓ VERIFIED | All confirmed present in source; `tests/42-demo-gate.test.js` 4/4 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `whats-new.js` | `AttentionCoordinator` | `register({id:'whats-new',...})` at eval time | WIRED | Confirmed at `whats-new.js:246-247`; reachable via `_getSurface('whats-new')` in tests |
| `whats-new.js` / `changelog.js` | `changelog-content-en.js` | `window.CHANGELOG_CONTENT_EN` read | WIRED | Both consumers read the same global; grep confirms no second source |
| Popup "See everything new" CTA | `changelog.html#{anchor}` | `location.href` navigation | WIRED (see WR-02 note) | Confirmed in code; deep-link works today because CTA always targets the newest entry (renders first) — see human-verification item 3 for the latent race on older anchors |
| 9 chrome-mounting pages | popup surface + data | script tags after `attention-coordinator.js`, before `app.js` runs `initCommon` | WIRED | Confirmed on all 9 pages (7 chrome pages + help.html + changelog.html) via grep |
| 3 entry points | `changelog.html` | direct `href`/anchor navigation | WIRED | Confirmed in `app.js`, `shared-chrome.js`, `help.html` |
| Footer version link | independence from integrity nudge | `.app-footer-version-warn` kept as sibling, `maybeUpgradeFooterAndNudge` untouched | WIRED | Confirmed by source inspection |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Popup gating (once-per-version, first-run suppression, silent-skip) | `node tests/42-whats-new-gating.test.js` | 3 passed, 0 failed | ✓ PASS |
| Popup dismiss (Close/Esc/CTA record version; backdrop no-op) | `node tests/42-whats-new-dismiss.test.js` | 5 passed, 0 failed | ✓ PASS |
| Coordinator tour-active suppression, non-claiming | `node tests/42-coordinator-tour-guard.test.js` | 4 passed, 0 failed | ✓ PASS |
| Changelog data integrity (schema, no-emoji, v1.3 first) | `node tests/42-changelog-integrity.test.js` | 9 passed, 0 failed | ✓ PASS |
| Changelog page render (reverse-chron, empty-category omission, EN-fallback) | `node tests/42-changelog-render.test.js` | 15/15 checks | ✓ PASS |
| Demo-mode entry-point suppression | `node tests/42-demo-gate.test.js` | 4 passed, 0 failed | ✓ PASS |
| i18n parity (10 keys × 4 locales) | `node tests/42-i18n-parity.test.js` | 3 passed, 0 failed | ✓ PASS |
| Two-array precache shape | `node tests/42-precache.test.js` | all PASS | ✓ PASS |
| Full workspace suite (regression) | `node tests/run-all.js` | 162 passed, 0 failed | ✓ PASS |

Real offline/installed-PWA behavior and visual/RTL/dark-mode rendering are explicitly out of jsdom's reach — routed to Human Verification below, per every plan 05/07/09 SUMMARY's own "not field-verified" note.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CHLG-01 | 01, 05, 06, 09 | Once-per-version popup, keyed on APP_VERSION, first-run suppressed, offline | ✓ SATISFIED | Truths 1, 5, 6 above |
| CHLG-02 | 03, 07, 08, 10 | Persistent changelog page, benefit-led, entry points | ✓ SATISFIED | Truth 2 above; entry points confirmed |
| CHLG-03 | 02, 04, 11 | One structured, i18n-capable data source | ✓ SATISFIED | Truth 3 above |
| CHLG-04 | 02, 04, 11 | v1.3's own notes as first entry | ✓ SATISFIED | Truth 4 above |

No orphaned requirements — all 4 REQUIREMENTS.md IDs (CHLG-01..04) are claimed across the 11 plans and REQUIREMENTS.md itself marks all 4 "Complete / Phase 42".

### Anti-Patterns Found

No debt markers (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) in any phase-modified file. A prior code review (`42-REVIEW.md`, 2026-07-09, 0 critical / 3 warning / 4 info) is advisory and independently confirmed here by re-reading the flagged source:

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `changelog.html` | Missing `tour.js`/`tour.css` (all other 8 chrome pages have them) | ⚠️ Warning | The "?" popover's "Onboarding Tour" row and the coordinator's tour-reminder Start button are dead no-ops when landed on `/changelog` — confirmed by grep (`changelog.html` has no `tour.js`/`tour.css` reference; `index.html`/`help.html` do) |
| `assets/changelog.js:45-47` | Hardcoded English `"Version " + …` heading label | ⚠️ Warning | Bypasses the phase's own D-17 chrome-i18n rule; RTL/Hebrew page shows an English fragment in the heading; not caught by `tests/42-i18n-parity.test.js` (key doesn't exist) |
| `assets/changelog.js` / `assets/whats-new.js` | Anchor deep-link races the browser's native fragment scroll against async render | ⚠️ Warning | Currently invisible (CTA always targets the newest entry, which renders first) but is a latent bug for any future deep-link to an older anchor |
| `assets/whats-new.js` (reconcile IIFE) | Not demo-gated (writes localStorage even inside the demo iframe) | ℹ️ Info | No current security/behavior impact (write value matches what a real load would write) but breaks the "demo never mutates app state" invariant established elsewhere in this phase |

None of these fail a CHLG-01..04 truth — all four observable truths and their artifacts/key-links check out independently of these findings. They are carried into Human Verification for a disposition decision.

### Human Verification Required

1. **Real offline / installed-PWA test** — Install as a PWA, go offline, confirm the popup fires once per version on a cold launch and `/changelog` renders fully offline. jsdom cannot exercise the real Service Worker.
2. **Visual / RTL / dark-mode check** — Popup modal weight, category color tokens, and RTL mirroring on a real browser/device.
3. **Triage the 3 code-review warnings** (WR-01 dead tour controls on `/changelog`, WR-02 anchor deep-link race, WR-03 hardcoded "Version" i18n) — real, code-confirmed, non-blocking; Ben decides fix-now / defer / accept.

### Gaps Summary

No blocking gaps. All four Phase 42 success criteria (CHLG-01..04) and the two cross-phase dependencies (Phase 40 coordinator governance, Phase 39 help-center placement) are verified against real, running code and passing behavioral tests — not just SUMMARY narrative. The phase is functionally complete; the only open items are (a) real-device/offline confirmation that jsdom structurally cannot provide, and (b) a human disposition call on three non-blocking code-review warnings that were independently re-confirmed during this verification.

---

_Verified: 2026-07-09T19:05:04Z_
_Verifier: Claude (gsd-verifier)_
