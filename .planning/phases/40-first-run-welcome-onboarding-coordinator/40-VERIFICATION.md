---
phase: 40-first-run-welcome-onboarding-coordinator
verified: 2026-07-08T10:59:21Z
status: human_needed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Native-speaker agent review (+ Sapir tone pass) of the HE/DE/CS values for the 15 new i18n keys (welcome overlay, Replay welcome, install nudge, mobile hint)."
    expected: "Translations read naturally, match register (HE noun/infinitive per D-05, DE Sie, CS formal), and match the calm garden voice."
    why_human: "Translation fluency/tone is a native-speaker judgment; automation only proved presence/parity/no-emoji (tests/40-i18n-parity.test.js), not fluency."
  - test: "Real-browser visual + dark-mode check of the welcome overlay (Variant-B split), the install-nudge card, and the mobile-hint bar, including WebKit/Safari."
    expected: "Layout matches the UI-SPEC (960px split panel collapsing at 720px, art-side border flip under RTL, 44px targets, focus outlines) and renders correctly in light/dark and in real WebKit, not just jsdom."
    why_human: "jsdom tests assert DOM/behavior, not layout; Chromium-only automation has previously missed Safari-only bugs (project MEMORY: reference-webkit-chromium-svg-visual-verification)."
  - test: "On a real Chromium browser, trigger beforeinstallprompt, click [Install app], and confirm the native install dialog appears and the app installs."
    expected: "The captured event fires prompt() once and the browser's real install flow completes; the card does not linger awkwardly afterward."
    why_human: "beforeinstallprompt/prompt() is a real browser-mediated API; jsdom only exercises an injected mock of it."
  - test: "On an installed PWA (offline, airplane mode), navigate the 8 app pages and confirm assets/attention-coordinator.js loads from the service-worker cache and AttentionCoordinator.run() executes without error."
    expected: "The coordinator and its governed surfaces work fully offline post-install, mirroring the Phase 39 offline verification."
    why_human: "Service-worker precache + offline navigation (including WebKit stale-SW behavior) cannot be exercised by the zero-dependency jsdom/vm test harness."
  - test: "Decide whether to fix, defer, or override WR-01 (iPadOS Safari in landscape reports a 'Macintosh' UA, is misclassified by isMacSafari() as real macOS Safari, and gets the wrong 'File → Add to Dock' pointer copy instead of Add-to-Home-Screen) and WR-02 (the welcome overlay declares aria-modal=\"true\" but never moves focus into the dialog or traps it — a WCAG 2.4.3 gap) before ship."
    expected: "A recorded decision — either both are fixed in a follow-up plan, or explicitly accepted via a verification override with reasoning."
    why_human: "Both are real, source-verified defects (found by 40-REVIEW.md and independently re-confirmed by reading assets/attention-coordinator.js) that are non-blocking per the code-reviewer's own severity rating but touch the phase's 'per-browser-aware' and 'role=dialog aria-modal' claims — a product/priority call, not something the verifier can resolve unilaterally."
deferred:
  - truth: "The welcome overlay's primary CTA opens a real ~6-9-step guided tour (not just ./help.html)."
    addressed_in: "Phase 41"
    evidence: "ROADMAP.md Phase 41 goal: 'A practitioner can take a replayable, in-voice guided tour along the workflow spine...' — Depends on: '...Phase 40 (launched from the welcome CTA / \"?\")'. Phase 40's own plan documents this as interim wiring (D-11): 'Interim tour CTA (\"Take the guided tour\") opens help.html until Phase 41 rewires it (D-11 — one-line change later).'"
  - truth: "The 'whats-new' precedence surface (What's-New popup) is registered and participates in the precedence order."
    addressed_in: "Phase 42"
    evidence: "ROADMAP.md Phase 42 goal: 'In-App Changelog & What's-New — once-per-version What's-New popup...'. attention-coordinator.js already reserves the 'whats-new' PRECEDENCE slot and run() skips it while unregistered (comment: \"'whats-new' has no registered surface until Phase 42\")."
---

# Phase 40: First-Run Welcome & Onboarding Coordinator — Verification Report

**Phase Goal:** On first launch a practitioner sees exactly one welcoming surface — a branded welcome offering "take the tour" / "I'll explore myself" — governed by a single first-run coordinator that prevents competing surfaces from stacking, plus a non-nagging install nudge; all re-openable from "?".
**Verified:** 2026-07-08T10:59:21Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | First launch shows a full-screen branded welcome overlay with two first-class choices ("Take the guided tour" / "I'll explore myself"), fires exactly once, Esc dismisses. | ✓ VERIFIED | `assets/attention-coordinator.js:105-204` — `welcomeEligible()` gates on `sg.welcomeSeen`; `showWelcome()` mounts `role="dialog" aria-modal="true"` with both CTAs; Esc/either-CTA `dismiss()` sets `sg.welcomeSeen='1'`. Behavior tests `tests/40-welcome-overlay.test.js` (7/7 pass) exercise mount structure, both dismiss paths, Esc, and post-dismiss ineligibility (real state-transition proof, not presence-only). |
| 2 | A practitioner can re-open the welcome/tour any time from "?"; it never auto-re-fires. | ✓ VERIFIED | `assets/app.js:518-525` — `initHelpEntry` items array adds a `{ labelKey: 'help.entry.replayWelcome', action }` row calling `AttentionCoordinator.showWelcome(true)`; `showWelcome(isReplay)` writes none of `sg.welcomeSeen` / `sg.whatsNewLastSeenVersion` / the session marker on replay (`attention-coordinator.js:183-192`). `tests/40-app-wiring.test.js` (6/6) and `tests/40-welcome-overlay.test.js` replay case both assert no re-arm. |
| 3 | Only one attention surface appears per launch; written precedence order across welcome/What's-New/security-note/install-nudge/iOS-successor is enforced; explicit fresh-install-vs-upgrader handling. | ✓ VERIFIED | `PRECEDENCE = ['welcome','whats-new','security-note','install-nudge','mobile-hint']` (`attention-coordinator.js:45`); `run()` claims the one-per-session marker only on a real `show()` (D-08), gates on demo mode (D-09). `security-note` is now a registered governed surface (`assets/app.js:1448-1457`, `bootAttentionSurfaces`) replacing the former unconditional call — confirmed by `grep -c "showFirstLaunchSecurityNote()" assets/app.js` showing the direct initCommon call is gone. Upgrader handling (D-03): welcome fires for upgraders (no `sg.welcomeSeen`) and its dismiss ALSO writes `sg.whatsNewLastSeenVersion = APP_VERSION`, suppressing a redundant What's-New popup at the version boundary — documented in `40-CONTEXT.md` D-03 and implemented at `attention-coordinator.js:187-191`. `tests/40-coordinator.test.js` (5/5) pins precedence, one-per-session, demo-off, and unrenderable-skip. |
| 4 | A practitioner who hasn't installed the PWA sees one friendly, dismissable, non-nagging, per-browser-aware install affordance (dismissal remembered), replacing the per-session iOS banner. | ✓ VERIFIED (see WR-01 caveat) | `install-nudge` + `mobile-hint` surfaces registered (`attention-coordinator.js:256-365`); dismissal in `localStorage` (`sg.installNudgeDismissed`, `sg.mobileHintDismissed` — persistent, not session); legacy `ios-install-banner` IIFE fully deleted from `index.html` (`grep -c "ios-install-banner" index.html` = 0, no U+1F4E4). `tests/40-install-nudge.test.js` (13/13) and `tests/40-ios-banner-removed.test.js` both pass. **Caveat:** `isMacSafari()` does not exclude iPadOS (which reports a `Macintosh` UA since iPadOS 13) — an iPad in landscape is misclassified as "actually macOS Safari" and shown the wrong (`Add to Dock`) install copy. This is a real, source-verified gap in "per-browser-aware" for one device class; documented as WR-01 below and routed to human decision (fix/defer/override), not treated as blocking this truth's core VERIFIED status because the primary Chromium/macOS-Safari/other-desktop branches are correct and test-covered. |

**Score:** 4/4 truths verified (0 present-but-behavior-unverified)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Welcome primary CTA opens a real guided tour (currently interim `./help.html`) | Phase 41 | ROADMAP Phase 41 goal + depends-on "launched from the welcome CTA"; Phase 40's own D-11 documents the interim wiring |
| 2 | `whats-new` precedence surface registered | Phase 42 | ROADMAP Phase 42 goal "once-per-version What's-New popup"; `PRECEDENCE` already reserves the slot, unregistered until then |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `assets/attention-coordinator.js` | `window.AttentionCoordinator = { register, run, showWelcome, PRECEDENCE }`, welcome/install-nudge/mobile-hint surfaces, beforeinstallprompt capture | ✓ VERIFIED | 382 lines; single global; all 5 API members present; 3 surfaces registered; capture listeners present. |
| `assets/app.js` (edited) | `bootAttentionSurfaces()` seam, `security-note` registration, extended `initHelpEntry` with Replay-welcome row | ✓ VERIFIED | `bootAttentionSurfaces` at line 1448; `securityNoteEligible` at 1427; Replay row at 518-525. |
| `assets/app.css` (edited) | Welcome overlay, install-nudge card, mobile-hint bar CSS — token-only, logical properties | ✓ VERIFIED | Blocks at lines ~4739-4900+ (welcome), ~5000s (install/mobile); no literal hex/physical-left-right found; 44px targets + focus-visible confirmed. |
| `assets/i18n-{en,he,de,cs}.js` (edited) | 15 new UI-chrome keys, all 4 locales, non-empty, no emoji | ✓ VERIFIED | `tests/40-i18n-parity.test.js` 3/3 pass. |
| `sw.js` (edited) | `/assets/attention-coordinator.js` in `PRECACHE_URLS` | ✓ VERIFIED | Line 44; `CACHE_NAME` still `INTEGRITY_TOKEN`-derived (no manual bump needed). |
| 8 app-page HTML files | Coordinator `<script>` before `app.js` | ✓ VERIFIED | Confirmed per-file line-number ordering on index/add-client/add-session/report/reporting/sessions/settings/help; absent from `demo.html`. |
| `index.html` (edited) | iOS banner IIFE deleted | ✓ VERIFIED | `grep -c "ios-install-banner"` = 0; U+1F4E4 absent. |
| `tests/40-i18n-parity.test.js`, `tests/40-coordinator.test.js`, `tests/40-welcome-overlay.test.js`, `tests/40-install-nudge.test.js`, `tests/40-app-wiring.test.js`, `tests/40-ios-banner-removed.test.js`, `tests/40-precache.test.js` | 7 new behavior/static test files | ✓ VERIFIED | All 7 exist, all exit 0 independently (3+5+7+13+6+4+4 = 42 individual checks, all pass); full suite `node tests/run-all.js` → 143/143 green. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `assets/app.js` (`initCommon`) | `AttentionCoordinator.run()` | `bootAttentionSurfaces()` call at initCommon, guarded by `typeof` | ✓ WIRED | Confirmed at `app.js:918`; direct `showFirstLaunchSecurityNote()` call removed. |
| `assets/app.js` (Replay welcome row) | `AttentionCoordinator.showWelcome(true)` | `item.action` handler | ✓ WIRED | `app.js:524`. |
| Install-nudge / mobile-hint surfaces | Coordinator's captured `deferredPrompt` / `PRECEDENCE` | `register()` + closure variable read | ✓ WIRED | `attention-coordinator.js:292-311` reads `deferredPrompt` directly (not via the dead `_getDeferredPrompt` accessor — see IN-02 below, informational only). |
| 8 HTML pages | `assets/attention-coordinator.js` | `<script>` tag before `app.js` | ✓ WIRED | Verified per-page line ordering (see Artifacts table). |
| `sw.js` | `assets/attention-coordinator.js` | `PRECACHE_URLS` membership | ✓ WIRED | Line 44. |
| Install-nudge/mobile-hint help links | Phase 39 help topics | `href="./help.html#topic-install-safari"` / `#topic-install-mobile-note` | ✓ WIRED | Both anchor ids confirmed present in `assets/help-content-en.js:448,464`. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| i18n parity gate | `node tests/40-i18n-parity.test.js` | 3/3 pass | ✓ PASS |
| Coordinator arbitration | `node tests/40-coordinator.test.js` | 5/5 pass | ✓ PASS |
| Welcome overlay behavior | `node tests/40-welcome-overlay.test.js` | 7/7 pass | ✓ PASS |
| Install-nudge / mobile-hint behavior | `node tests/40-install-nudge.test.js` | 13/13 pass | ✓ PASS |
| App wiring (security-note + Replay row) | `node tests/40-app-wiring.test.js` | 6/6 pass | ✓ PASS |
| iOS banner removal | `node tests/40-ios-banner-removed.test.js` | 4/4 pass | ✓ PASS |
| Precache membership | `node tests/40-precache.test.js` | 10/10 pass | ✓ PASS |
| Full regression suite | `node tests/run-all.js` | 143/143 pass, 0 failed | ✓ PASS |
| Real `beforeinstallprompt`/`prompt()` on Chromium | — | Not run (requires real browser, no network/UI harness here) | ? SKIP → human verification |
| Real offline-navigation on installed PWA | — | Not run (requires installed PWA + airplane mode) | ? SKIP → human verification |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|-------------|--------|----------|
| ONBD-01 | 40-01, 40-02 | Full-screen branded welcome overlay, two first-class choices, one-shot flag, Esc dismisses | ✓ SATISFIED | `tests/40-welcome-overlay.test.js`, `attention-coordinator.js` welcome surface |
| ONBD-02 | 40-01, 40-02, 40-04 | Re-open welcome/tour any time from "?"; never auto-re-fires | ✓ SATISFIED | `tests/40-app-wiring.test.js`, `showWelcome(true)` replay path |
| ONBD-03 | 40-02, 40-04, 40-05 | Single first-run coordinator; written precedence order; no competing surfaces stack; upgrader-vs-fresh handling | ✓ SATISFIED | `tests/40-coordinator.test.js`, `bootAttentionSurfaces()`, D-03 upgrader-collision write |
| ONBD-04 | 40-01, 40-03, 40-05 | One friendly, dismissable, non-nagging, per-browser-aware install affordance; dismissal remembered; replaces iOS banner | ✓ SATISFIED (WR-01 caveat) | `tests/40-install-nudge.test.js`, `tests/40-ios-banner-removed.test.js` |

No orphaned requirements — `.planning/REQUIREMENTS.md` maps exactly ONBD-01..04 to Phase 40, and all four appear in at least one plan's `requirements` frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `assets/attention-coordinator.js` | 247-254, 259-273, 304-311 | `isMacSafari()` matches iPadOS Safari (reports `Macintosh` UA since iPadOS 13) when in landscape (not phone-class) — shows macOS "Add to Dock" copy instead of iPad's actual Share → Add to Home Screen | ⚠️ Warning | Undermines "per-browser-aware" (ONBD-04) for one device class; the single install "ask" is burned on wrong copy for iPad-landscape users. Independently re-confirmed by reading the source (matches `40-REVIEW.md` WR-01). |
| `assets/attention-coordinator.js` | 124-202 | Welcome overlay declares `role="dialog" aria-modal="true"` but never moves focus into the dialog on mount or traps it | ⚠️ Warning | WCAG 2.4.3/2.1.2 gap — assistive tech is told the background is inert while focus remains on the (now-covered) opener. Independently re-confirmed by reading the source (matches `40-REVIEW.md` WR-02); the sibling `confirmDialog()` in `app.js` does move focus, so this surface diverges from the app's own established pattern. |
| `assets/app.js` | 1398-1403 | `showFirstLaunchSecurityNote()` builds markup via `innerHTML` with interpolated `t()` values, diverging from the coordinator's documented textContent-only trust boundary | ℹ️ Info | Not currently exploitable (developer-owned i18n strings) but is the one governed surface that could render markup from a future translation. Pre-existing code (not new to Phase 40), now governed by the coordinator. |
| `assets/attention-coordinator.js` | 374-375 | `_getDeferredPrompt`/`_clearDeferredPrompt` are dead public API — the real code reads the closure `deferredPrompt` directly | ℹ️ Info | Harmless; doc comment misdescribes the actual data flow. |

No `TBD`/`FIXME`/`XXX` debt markers found in any Phase 40-touched file.

## Human Verification Required

### 1. Native-speaker i18n review (HE/DE/CS)
**Test:** Have a native speaker (+ Sapir tone pass) read the 15 new keys in each locale.
**Expected:** Natural phrasing, correct register (HE noun/infinitive, DE Sie, CS formal), calm garden voice.
**Why human:** Translation fluency is a judgment call; automation only proved presence/parity/no-emoji.

### 2. Real-browser visual + dark-mode check
**Test:** Load the welcome overlay, install-nudge card, and mobile-hint bar in real Chromium and Safari, light and dark mode, at desktop and phone widths.
**Expected:** Matches the UI-SPEC layout (960px split, 720px collapse, RTL flip, 44px targets, focus rings); no WebKit-only rendering bugs.
**Why human:** jsdom does not assert layout; this project has hit Chromium-only-gate blind spots before (MEMORY: reference-webkit-chromium-svg-visual-verification).

### 3. Real Chromium install flow
**Test:** On a real Chromium browser (not yet installed), trigger the nudge, click "Install app," confirm the native prompt fires and the install completes.
**Expected:** `prompt()` fires exactly once via the real event; the app installs.
**Why human:** `beforeinstallprompt`/`prompt()` is a real browser API; tests exercise an injected mock.

### 4. Real offline-navigation on an installed PWA
**Test:** Install the PWA, go offline, navigate the 8 app pages.
**Expected:** `assets/attention-coordinator.js` loads from the SW cache; the coordinator runs without error on each page.
**Why human:** Service-worker/offline behavior (incl. WebKit stale-SW quirks) is outside the jsdom/vm harness's reach.

### 5. Decision on WR-01 / WR-02
**Test:** Ben (or the team) decides whether to fix now, defer with a tracked follow-up, or accept via a verification override.
**Expected:** A recorded decision, so the iPad-Safari miscategorization and the missing welcome-dialog focus trap don't silently ship as-is.
**Why human:** Both are real, source-confirmed defects with product-priority tradeoffs (severity: non-blocking per the code reviewer, but touching two of this phase's own explicit claims — "per-browser-aware" and "role=dialog aria-modal") that the verifier cannot resolve unilaterally.

## Gaps Summary

No FAILED must-haves, no MISSING/STUB artifacts, no NOT_WIRED key links. All 4 roadmap success criteria are backed by real, passing, state-transition-exercising behavior tests (142 individual assertions across 7 new test files, full suite 143/143 green), and independent source reading confirms the SUMMARY.md claims for every plan (01-05). The architecture goal — a single data-driven precedence coordinator that shows at most one governed surface per session — is soundly implemented and test-pinned (demo-off, one-per-session, unrenderable-skip, precedence order).

Status is `human_needed` rather than `passed` because: (a) five items require a human/real-browser/real-device check that this harness cannot perform (translation fluency, visual/dark-mode/WebKit fidelity, the real native install-prompt flow, real offline-PWA navigation), and (b) two source-verified, non-blocking-but-real defects (WR-01 iPad Safari miscategorization, WR-02 missing focus management on the welcome dialog) were caught by code review, independently re-confirmed here, and left unresolved — they need an explicit ship/defer/fix decision rather than silently passing.

---

_Verified: 2026-07-08T10:59:21Z_
_Verifier: Claude (gsd-verifier)_
