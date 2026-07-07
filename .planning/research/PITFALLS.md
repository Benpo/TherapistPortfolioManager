# Pitfalls Research

**Domain:** Adding an in-app help/onboarding + version-changelog + docs-maintenance gate to a LIVE, sold, offline-first vanilla-JS multi-page PWA (4 languages incl. Hebrew RTL, non-technical therapist users, solo maintainer + AI agents)
**Researched:** 2026-07-07
**Confidence:** HIGH for the integration pitfalls (derived from this repo's own verified constraints + shipped-incident memory); MEDIUM for the general tour/gate community patterns (public best-practice material, corroborated against this codebase)

> **Framing.** This is NOT a greenfield onboarding build. The dominant risks here are *integration* risks — the new surfaces colliding with an existing offline cache, an existing first-run stack, an existing installed-PWA update lag, an active DOM refactor, and 10+ paying users who are mid-relationship with the product. Greenfield "how do I build a tour" advice is mostly a distraction. Every pitfall below is phrased as: what breaks *when you bolt this onto the running system*, and the concrete test/check/rule that prevents it.

---

## Critical Pitfalls

### Pitfall 1: New help/changelog pages 404 offline because they were never added to `PRECACHE_URLS`

**What goes wrong:**
You add `help.html`, `assets/help.js`, `assets/help-tour.js`, `assets/help-tour.css`, `changelog` data, and botanical assets. They work perfectly in `npm`/dev and on first online load. Then an installed, offline user (the whole point of this app) taps "?" and gets a blank page or a browser 404 — because the service worker's cache-first strategy only serves what's in the precache manifest, and a 404 is never self-healed by retry. The single most-marketed new feature is invisible to exactly the users who bought the offline promise.

**Why it happens:**
This project has **no build step and a hand-maintained `PRECACHE_URLS` list** (verified: zero-dependency vanilla, no Workbox to auto-generate a manifest). Every new shipped path must be added manually. The pre-commit hook is already known to *skip the `CACHE_NAME` bump when `sw.js` is in the diff* (memory: `reference-pre-commit-sw-bump`), so even editing the SW doesn't guarantee the cache version rolls. It's a two-part manual step that is trivially forgotten, and it fails silently *only for offline users* — so it passes every online smoke test.

**How to avoid:**
- **Design rule:** treat "new user-facing route/asset" and "PRECACHE_URLS + CACHE_NAME bump" as one atomic change. Put it in the phase Definition-of-Done.
- **Test to write:** a Node/jsdom test that parses `sw.js`'s `PRECACHE_URLS`, globs the actual shipped `*.html` + new `assets/*` the phase adds, and **fails if any help/changelog file is not precached**. This is a static assertion, no browser needed — cheap and it can't rot.
- **Verify offline for real:** load the installed PWA, go offline (DevTools → Offline), hard-navigate to `help.html` and open the tour. jsdom cannot catch a precache miss — only a real offline navigation does.
- Ship a branded offline-fallback for uncached help routes as a backstop, not a substitute.

**Warning signs:**
Help works online but you never tested it offline. `git diff` touches `sw.js` but the commit is not a `chore:` cache-bump follow-up. New assets referenced by `help.html` that don't appear verbatim in `PRECACHE_URLS`.

**Phase to address:**
Every phase that ships a new page/asset (Help-system phase, Changelog phase). Add the precache assertion in the earliest phase that touches `sw.js`.

---

### Pitfall 2: The "What's New" popup fires on the wrong version because installed PWAs run stale service workers for days

**What goes wrong:**
The changelog popup is keyed on `APP_VERSION` change (compare shipped `version.js` against a stored `localStorage` "last seen version"). But an installed PWA can serve the *old* app shell + old `version.js` for days after you deploy (verified project reality — the whole v1.2 P28 VER-01..06 work exists because Safari PWA updates are unreliable). Result set:
- User is still running v1.2.x code but you've "released" v1.3 → popup never fires, or fires with the wrong content.
- The SW finally updates while the app is open → version flips mid-session, popup can fire at a jarring moment or double-fire.
- Worse: the popup's *content* (the release notes) is baked into the new shell, so a user on the stale shell literally does not have the v1.3 notes to show — there's no "phone home" (zero-network) to fetch them.

**Why it happens:**
Version-keyed popups assume "deploy = user is now on new version instantly." That assumption is false for every PWA and *doubly* false here given the documented Safari update lag and the no-network constraint (the changelog data ships inside the bundle, so it and the version stamp update together — but only when the shell actually updates).

**How to avoid:**
- **Design rule:** the popup must key off the version stamp *that shipped in the same bundle as the changelog data* — never a value fetched separately. Since `version.js` already drives footer + cache + integrity self-check (verified single source), reuse *that same* constant. Then the popup and its content are always consistent, because they arrive together.
- **Detect first-install vs. upgrade explicitly** (see Pitfall 3) so a brand-new install doesn't show "What's New in v1.3" as if the user had a v1.2.
- **Only mark "seen" after the popup is actually rendered and dismissed**, storing the *exact* version string shown — so a mid-session SW flip resolves cleanly on next load rather than eating the notification.
- **Test to write:** unit-test the decision function `shouldShowWhatsNew(shippedVersion, lastSeenVersion, isFirstRun)` across the matrix: fresh install, same version, one-version bump, multi-version jump (user skipped a release), and `lastSeen` newer than shipped (downgrade/rollback). Pure function, no DOM — fully jsdom-safe.
- Accept and document that the popup appears *when the user's shell actually updates*, which may be days after deploy. That is correct behavior, not a bug — but it means "did users see the v1.3 notes" is not answerable from deploy time.

**Warning signs:**
Any code path that fetches a version or changelog from a URL. A "seen" flag set before render. No test case for "user skipped a version." Treating deploy time as release-reached-user time.

**Phase to address:**
Changelog phase. The version-source decision should be locked in discuss-phase (reuse `version.js`, do not invent a parallel stamp).

---

### Pitfall 3: The welcome overlay treats a 6-month paying customer as a brand-new user

**What goes wrong:**
The first-run welcome ("Take the guided tour / I'll explore myself") is gated on the *absence* of a `localStorage` flag (`sg.welcomeSeen`). Existing customers upgrading into v1.3 have never had that flag → on their next launch, a loyal power user who's logged 200 sessions gets a full-screen "Welcome! Let's get you started" overlay. At best it's mildly insulting; at worst they think a reset/wipe happened and panic about their data (this audience is non-technical and privacy-anxious).

The mirror failure is over-correcting: you suppress the welcome for "anyone with data," and then a genuine new trial user who imported a backup, or whose IndexedDB seeded oddly, never sees the welcome at all.

**Why it happens:**
"Flag absent ⇒ first run" is the standard one-shot pattern (and it's what the Phase 26 design proposed, D-15). It's correct for a *fresh* install but conflates "new to the app" with "new to *this feature*." An existing install has no welcome flag simply because the feature didn't exist yet — not because the user is new.

**How to avoid:**
- **This is a product decision to make explicitly in discuss-phase, not a default to inherit.** Two defensible options:
  1. **Treat upgraders as new-to-help (show once):** frame the overlay as "New in Sessions Garden: in-app help" rather than "Welcome, let's set up your account." Same one-shot, different copy — never implies a reset.
  2. **Suppress for existing users, offer a quieter nudge:** detect existing data (client/session count > 0 in IndexedDB, or presence of any pre-v1.3 localStorage key like `portfolioLang`) → skip the full-screen welcome, show a small dismissable "New: help & tours — tap ? anytime" toast instead.
- **Distinguish upgrade from fresh install** using a pre-existing signal that predates v1.3: e.g. `portfolioLang` / license keys / a non-empty client store all imply "not a first-ever run." Set a `sg.installedBeforeV13` marker on first v1.3 boot based on that check, and branch on it.
- **Test to write:** a jsdom test seeding (a) empty localStorage + empty IDB → fresh path, (b) `portfolioLang` present / clients > 0 → upgrader path, asserting which overlay variant renders. Falsifiable and cheap.

**Warning signs:**
Welcome logic that reads only `sg.welcomeSeen` and nothing that could distinguish an upgrader. Copy that says "welcome"/"get started"/"set up" with no upgrader variant. No test seeding pre-existing data.

**Phase to address:**
Welcome/first-run phase. Flag the tradeoff to Ben in discuss-phase — this is a "bug or feature" call the owner explicitly wants surfaced.

---

### Pitfall 4: First-run attention collision — the welcome overlay stacks on top of redirect gates, the security note, and the iOS A2HS banner

**What goes wrong:**
On first launch the app already runs: three `<head>` redirect gates (legal/T&C, license), an existing first-launch security note (`showFirstLaunchSecurityNote()`), and an iOS Add-to-Home-Screen banner. Drop a full-screen welcome + a PWA install nudge + (potentially) a What's-New popup into the same moment and a new user can face **five competing modal-ish surfaces at once**, possibly z-index-fighting, possibly one trapping focus under another, possibly the welcome firing *before* the legal gate is satisfied (teaching the app to someone who hasn't been let in yet).

**Why it happens:**
Each first-run surface was built independently at a different time; nobody owns the *aggregate* first-run sequence. Adding two or three more without a defined precedence order is how you get a stack.

**How to avoid:**
- **Design a single first-run orchestration order and write it down** (a documented precedence chain), e.g.: redirect/legal gate → license activation → security note (once) → *then and only then* welcome overlay → install nudge (deferred, non-blocking) → What's-New popup (only for upgraders, never same launch as welcome). At most one attention-grabbing surface visible at a time; the next waits for the previous to dismiss.
- **Rule: the welcome must never render until the legal/license gates have passed.** Gate the welcome trigger on the same condition that lets the user into the app.
- **Rule: welcome and What's-New are mutually exclusive on any single launch.** A fresh install gets welcome (no prior version to announce); an upgrader gets What's-New (already knows the app). Never both.
- **Verify on a real device** (esp. iOS Safari) that the native A2HS banner + your install nudge + welcome don't all appear together. jsdom cannot see the native banner or real stacking.

**Warning signs:**
More than one overlay able to become visible in the same tick. Welcome logic that doesn't check the legal/license gate. Install nudge and welcome both `display:flex` at once in a first-run screenshot. No written first-run precedence order.

**Phase to address:**
Welcome/first-run phase — but the *orchestration order* is a cross-cutting concern that should be decided before any of the three surfaces are built.

---

### Pitfall 5: `data-tour` anchors rot because the DOM is being actively refactored (and the tour degrades silently)

**What goes wrong:**
Tour steps bind to `[data-tour="..."]` anchors that don't exist yet and must be added across pages whose DOM is *actively churning* (v1.2 just decomposed `settings.js`/`add-session.js`; more extraction is backlogged). A later refactor moves or regenerates the markup, the anchor vanishes, and — if you inherited `demo-hints.js`'s `if (!target) return;` behavior — the tour step **silently disappears**. The user's "guided tour" has invisible holes and they don't know steps are missing. This is the exact failure mode community best practice warns about: tours break on DOM/class changes, and libraries that don't handle a missing element "crash silently with no error logged."

**Why it happens:**
Two compounding causes: (1) anchors are added by one phase and depended-on forever after, but nothing *tests* that they still exist; (2) the borrowed rendering pattern's default is silent-skip, which is fine for an 8-step marketing script but wrong for a teaching tour.

**How to avoid:**
- **Anchor contract as data:** maintain the canonical list of `data-tour` anchor names in one place (the tour step definitions). 
- **Test to write (the anti-rot guard):** a jsdom test that loads each page's HTML and asserts **every `data-tour` anchor referenced by a tour step is present in exactly one element**. This runs in `npm test`, fails the moment a refactor drops an anchor, and is the single highest-value test in this milestone. Add it the same phase you add the anchors.
- **Never bind tours to `#id`s another module owns, `:nth-child`, or visible text** (text changes per locale across 4 languages). Dedicated `data-tour` attributes only — invisible to styling, i18n, and refactors.
- **Degrade, never skip:** a missing anchor must fall back to a centered modal with the step's text + a "take me there" deep-link (the Phase 26 D-11 contract). Make this the *tested* behavior: delete an anchor in the test DOM and assert the modal fallback renders, not a no-op.

**Warning signs:**
Tour steps referencing selectors that aren't `data-tour`. No test asserting anchor presence. A refactor PR that touches a page with tour anchors but doesn't run/notice a tour test. "Missing anchor" has no defined visible behavior in the spec.

**Phase to address:**
Tour-engine phase for the degrade-not-skip behavior; the anchor-presence test should live wherever anchors are introduced and run on every subsequent build.

---

### Pitfall 6: The overlay looks right in jsdom/Chromium but breaks in Safari/WebKit (RTL, stacking context, positioning)

**What goes wrong:**
The tour tooltip / welcome overlay / spotlight positions correctly in your jsdom tests and Chromium screenshots, then on a real therapist's iPhone (Hebrew, RTL): the tooltip escapes the viewport on the inline-end side, the spotlight is a 0×0 box, a `viewBox`-only SVG icon collapses, or the overlay renders *behind* a header that has its own stacking context. This project has a documented history of exactly this: **Chromium-only visual gates have missed Safari-only bugs** (memory: `reference-webkit-chromium-svg-visual-verification` — viewBox-only SVG = 0×0 in WebKit; `reference-rtl-select-value-alignment-headless`), and **jsdom does no layout at all** (`getBoundingClientRect` returns zeros), so any positioning/overlap/focus-trap logic is invisible to it.

**Why it happens:**
jsdom has no layout engine — it cannot catch positioning, z-index/stacking-context, focus-trap, or overflow bugs. Chromium headless catches *some* but not WebKit-specific ones. Overlays are the single most layout-dependent thing in the milestone, and this stack has a proven Safari-blind-spot.

**How to avoid:**
- **Rule: overlay/positioning correctness is verified in a real browser, ideally Playwright WebKit + on-device Safari, never jsdom alone.** jsdom tests are fine for the *decision logic* (should-show, anchor-present, seen-flag) but must not be the sole gate for *where the tooltip lands*.
- **Probe positioning with `getBoundingClientRect` in Playwright WebKit** (the project already has this technique in memory) — assert the tooltip rect is inside the viewport in both LTR and RTL.
- **CSS rules (hard):** logical properties only (`inset-inline-*`, `margin-inline-*`, `padding-inline-*`) — no `left/right/margin-left`; give overlay SVG icons explicit `width`/`height`, never `viewBox` alone; give the overlay its own top-level stacking context with an explicit high `z-index` and verify it clears `#headerActions` and the redirect gates.
- **Manual RTL + dark-mode pass** on the welcome, every tour step, and every fallback modal, on a real device.

**Warning signs:**
Positioning logic covered "only by jsdom tests." Any `left:`/`right:`/`text-align:right`/literal hex in overlay CSS. SVG icons with `viewBox` but no width/height. No WebKit run. Green suite, untested on a phone.

**Phase to address:**
Tour-engine phase and Welcome phase — bake a WebKit/on-device check into each phase's verification, do not rely on `npm test` green.

---

### Pitfall 7: The docs-maintenance gate gets routinely bypassed with `--no-verify` (or blocks emergency fixes) and quietly rots

**What goes wrong:**
You add a pre-commit/pre-push hook that blocks commits touching user-facing files unless the changelog + help topics are also updated. Three predictable failure modes for a *solo* repo:
1. **Trivial bypass:** `git commit --no-verify` skips it (documented Git behavior). A solo maintainer under time pressure — or an AI agent told "just commit" — routes around it within a week, and now it's theater.
2. **Emergency-fix deadlock:** a hotfix for a real production bug (this app is *sold* — outages matter) is blocked because you haven't written release notes yet, at the worst possible moment.
3. **Too-coarse matching:** the gate treats *every* changed file as "user-facing," so a whitespace/comment/test-only/`chore:` commit demands a changelog entry, training you to reflexively `--no-verify` everything → the gate is dead.
4. **Gate rot:** the pattern of "what counts as user-facing" drifts as the codebase changes; nobody re-checks it; it silently stops catching real changes (matches the community lesson that skipping hooks "defeats the purpose").

**Why it happens:**
Local git hooks are advisory, not enforceable, and `--no-verify` exists by design. A solo maintainer is both the enforcer and the bypasser — there's no second party the gate protects against. Coarse matching + a rigid block is the fastest route to the gate being resented and disabled.

**How to avoid:**
- **Match precisely, not broadly.** The gate should fire only on genuinely user-facing surfaces (e.g. `*.html`, `assets/i18n-*.js`, product `assets/*.js` excluding tests/tooling) — and explicitly *not* on `*.test.js`, docs, `chore:`/comment-only diffs. A gate that only fires when it should is a gate people keep.
- **Provide a first-class, logged escape hatch instead of `--no-verify`.** e.g. an intentional `[skip-changelog]` / `docs: n/a` token in the commit message that the hook recognizes and records — so emergency fixes and non-user-facing changes pass *with an auditable reason*, rather than everyone learning the blunt `--no-verify` reflex.
- **Given a solo + AI-agent workflow, prefer the gate at the point that actually can't be skipped:** a GSD Definition-of-Done / phase-completion gate (agent workflow checks changelog+help updated before a user-facing phase is marked complete) is more reliable here than a git hook, because the hook's whole threat model (protect the repo from a careless committer) doesn't fit a single trusted owner. Consider **both**, but treat the DoD gate as the real one and the hook as a fast local reminder.
- **Interplay with the existing SW-bump hook:** this repo already has a pre-commit hook that (buggily) skips the `CACHE_NAME` bump when `sw.js` changes. Don't layer a second fragile hook without reconciling them — one hook file, tested behavior.
- **Test the gate itself:** write cases proving it *blocks* a user-facing change with no changelog, *passes* a test-only change, and *passes with reason* on the escape token. An untested gate rots invisibly.

**Warning signs:**
`--no-verify` appearing in your own recent git history. The gate demanding changelog entries for test/comment commits. No escape hatch, so hotfixes stall. No test on the gate's own matching logic. "User-facing" defined by a broad glob like `assets/*`.

**Phase to address:**
Docs-gate phase. Decide hook vs. DoD-gate vs. both in discuss-phase; the too-coarse and no-escape-hatch failures are the ones to design against from the start.

---

### Pitfall 8: Help content drifts from the real UI — stale screenshots, renamed terminology, features documented that changed

**What goes wrong:**
You author comprehensive EN help against v1.2.x behavior. Then the app keeps shipping (it's live and actively developed). Within a milestone or two the help says "Session Type" (renamed to "Session Format" in P37), "Heart Shield" (renamed "Heart-Wall"), shows screenshots of a pre-refactor settings page, or documents a flow that changed. Non-technical users trust the help *more* than power users would, so drift actively misleads exactly the people it's for. Screenshots are the worst offenders — they go stale the instant the UI moves and there's no compiler to flag them.

**Why it happens:**
Help content is prose + images with no link to the code that renders the UI; nothing fails when they diverge. This project has *already lived* the terminology-drift problem (P37's whole TERM-01/02 relabel existed because "Session Type" meant three different things). A live product + solo maintainer means content ages continuously and quietly.

**How to avoid:**
- **Prefer text + the app's own live UI over baked screenshots.** Where an illustration is unavoidable, keep the count minimal and list every screenshot in one manifest so a UI change has a checklist of images to re-shoot. Fewer screenshots = less rot surface.
- **Single-source terminology:** help copy for feature names should pull from the *same i18n keys* the UI uses wherever practical, so a relabel propagates instead of drifting. At minimum, keep a terminology glossary the help and UI both reference.
- **This is the changelog gate's real job:** the docs-maintenance gate (Pitfall 7) is precisely what keeps help from drifting — a user-facing change can't ship without touching affected help topics. The gate and the content are two halves of one system.
- **Content-accuracy review is a named task, not an assumption:** Sapir (or Ben) reviews EN help against *actual shipped behavior* before it ships — every claim matches the real Heart-Wall model, severity reversal, per-session export, local-only storage, etc.

**Warning signs:**
Help mentions "Session Type"/"Heart Shield" (old terms). Screenshots with no manifest/re-shoot checklist. Help feature names hard-coded as prose instead of drawn from i18n. A shipped user-facing change with no corresponding help diff.

**Phase to address:**
Help-content phase for authoring discipline; Docs-gate phase for the ongoing anti-drift enforcement. They must be designed together.

---

### Pitfall 9: Untranslated help keys leak raw (or English) across the 3 non-EN locales

**What goes wrong:**
Help/tour/welcome/changelog content is EN-canonical; DE/CS/HE translation is *deliberately deferred* (verified milestone scope). If the i18n loader's missing-key behavior is "render the raw key" you get `help.tour.addClient.title` on screen in Hebrew; if it's "silently blank" you get empty tooltips; if it falls back to EN you get English help inside an otherwise-Hebrew app for a Hebrew-primary audience. Any of the three looks broken to a paying non-EN user — and the app's biggest language is Hebrew.

**Why it happens:**
Adding a large batch of EN-only keys to a 4-locale system with deferred translation guarantees a window where keys exist in EN and not elsewhere. Whatever the loader does by default for a missing key is now on display at scale.

**How to avoid:**
- **Decide the missing-key policy deliberately** for help content: the least-bad option for deferred-translation content is usually an **explicit, controlled EN fallback** (readable English, never a raw dotted key, never blank) — possibly with a small "help is available in English" note for non-EN users — rather than accidental raw-key leakage.
- **Test to write:** a key-parity/leakage test that loads each locale and asserts **no `data-i18n` on any help surface resolves to a raw key string** (regex `^[a-z0-9]+(\.[a-z0-9]+)+$`) and none renders empty. This catches both raw-key and blank-key leakage across all 4 locales in `npm test`.
- **Author EN keys now so HE translates cleanly later:** noun/infinitive phrasing, not imperatives (project-wide Hebrew rule, memory-locked), and flexible-length tooltip containers (HE/DE run longer/shorter than EN — a known RTL truncation risk).
- **Scope the fallback as an explicit decision in the milestone**, so "English help in a Hebrew app" is a chosen, communicated tradeoff, not a surprise bug report.

**Warning signs:**
No missing-key policy stated for help. A locale render showing dotted keys or blank tooltips. No parity/leakage test. Imperative EN microcopy that will force unnatural Hebrew.

**Phase to address:**
Help-content phase (authoring + fallback policy); add the leakage test the same phase the EN keys land.

---

### Pitfall 10: Double-signal — the What's-New popup and the SW "update available / reload" nudge both fire, confusing users

**What goes wrong:**
The app already cares about SW updates (v1.2 P28 shipped verified PWA-update delivery). If there's any "a new version is ready, reload" affordance, it can collide with the What's-New popup: the user reloads for the update *and then* gets a What's-New popup, or gets a "new version" nudge and a "what's new" popup that seem to say the same thing twice, or the popup fires *before* the reload actually applied the new version (so it describes features the running code doesn't have yet).

**Why it happens:**
Two independently-built version-awareness surfaces (SW update lifecycle vs. changelog popup) with no coordination. Each is reasonable alone; together they double-signal.

**How to avoid:**
- **One version-change story, sequenced:** the What's-New popup should fire *after* the new shell is actually active and running (post-update, on the load where `version.js` first reads the new value), never as an "update pending" teaser. Reuse the single `version.js` source so "am I actually on the new version" and "what's new" are the same fact.
- **Don't show both a generic "updated" toast and the changelog popup for the same version** — the changelog popup *is* the update announcement. Collapse to one.
- **Test to write:** extend the `shouldShowWhatsNew` matrix (Pitfall 2) with an "update just applied this load" case and assert single-fire.

**Warning signs:**
An "update available/reload" toast plus a separate What's-New popup for the same version. Popup content describing features the running shell doesn't include. No coordination between SW lifecycle events and the popup trigger.

**Phase to address:**
Changelog phase, coordinated with the existing SW update logic from v1.2 P28.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hand-add new pages to `PRECACHE_URLS` with no test guard | Fast, no tooling | Silent offline 404s when the manual step is forgotten (Pitfall 1) | Only if paired with the precache-assertion test — otherwise **never** for an offline-first product |
| Bake screenshots into help content | Looks polished immediately | Every UI change silently invalidates them; no compiler catches it (Pitfall 8) | For a tiny, manifest-tracked set with a re-shoot checklist; avoid otherwise |
| Ship the tour with `if (!anchor) return;` silent-skip | Least code, "works" in the happy path | Invisible holes in the tour after any refactor; users get a broken teaching flow (Pitfall 5) | **Never** — degrade-to-modal is the contract |
| Version popup keyed on a separately-fetched/stored version | Simple to reason about | Popup ↔ content mismatch under stale-SW conditions (Pitfall 2) | **Never** here — must key off the same `version.js` that ships the content |
| Git hook that blocks all `assets/*` changes without a changelog | Feels rigorous | Coarse → reflexive `--no-verify` → dead gate (Pitfall 7) | Never as the *only* mechanism; pair precise matching + logged escape hatch + DoD gate |
| EN-only help keys with default raw-key fallback | Ship help without waiting on translation | Dotted keys on screen for HE/DE/CS users (Pitfall 9) | Only with an explicit readable-EN fallback + leakage test |
| Welcome gated solely on `sg.welcomeSeen` absence | One-liner, matches existing pattern | Fires for 6-month customers as if new (Pitfall 3) | Only after the upgrader-vs-fresh decision is made and tested |

## Integration Gotchas

Connecting the new surfaces to the *existing* running system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Service worker (`sw.js` / `PRECACHE_URLS`) | Add new help/changelog files, forget to precache + bump `CACHE_NAME` (hook skips the bump when `sw.js` is in the diff) | Atomic "new route ⇒ precache + explicit cache-bump chore"; static test asserts every help asset is precached; verify offline navigation on a real installed PWA |
| `version.js` (single source: footer + cache + integrity) | Invent a second version stamp for the popup | Reuse the one `version.js` constant so popup + content + integrity self-check agree |
| First-run stack (redirect gates, license, security note, iOS A2HS banner) | Add welcome/install-nudge/popup independently → 3–5 overlays collide | One written precedence order; ≤1 attention surface at a time; welcome gated behind legal+license; welcome XOR What's-New per launch |
| `localStorage` (`portfolioLang`, license keys, `securityGuidanceDismissed`) | Use only new flags → can't tell upgrader from fresh install | Detect pre-v1.3 signals (existing lang/license/IDB data) to classify upgrader vs. new |
| Existing SW update-delivery logic (v1.2 P28) | Separate "update ready" toast + What's-New popup double-signal | Fire the changelog popup only after the new shell is active; collapse to one announcement |
| Active DOM refactor (settings/add-session extractions ongoing) | Tour anchors added once, silently rot on the next refactor | `data-tour` anchors only + a jsdom presence test that fails when an anchor is dropped |
| i18n loader (4 locales, EN-first) | Assume deferred-translation keys degrade gracefully | Explicit readable-EN fallback + a raw-key/blank-key leakage test across all locales |
| Demo mode (`demo.html`, locked-down controls, P35) | Welcome/tour/popup fire inside the marketing demo or leak license/export nudges | Confirm the new surfaces respect the demo lock-down; don't trigger install/activation nudges in demo |

## Performance Traps

Scale here is modest (10+ practitioners, local-only), so classic perf traps are low-risk. The real "scale" axes are *number of pages the tour spans* and *content volume*.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Tour re-queries/re-renders all steps on every `app:language` / resize event | Jank when switching language mid-tour; flicker on rotate | Cleanup-then-replace only the active step (the demo-hints.js pattern); debounce resize | Noticeable with RTL relayout on mobile mid-tour |
| MutationObserver for late-rendering anchors left running for the whole session | Battery/CPU drain on an installed all-day app | Scope the observer to the active tour only; disconnect on tour end | Long sessions on low-end devices |
| Help page loads all 4 locales' content eagerly | Larger shell, slower first paint | Load only the active locale's help strings | Grows as help content expands over releases |
| Changelog page renders full history inline forever | Page grows unbounded release over release | Structured data + render most-recent-N, expand-on-demand | After many releases |

## Security Mistakes

Domain-specific (offline, zero-network, encrypted-backup, licensed) — beyond OWASP basics.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Help/changelog fetches remote content or images from a CDN | Breaks the zero-network guarantee + offline; privacy regression for a privacy-first product | All help/tour/changelog content and assets ship in-bundle and are precached; no external requests, ever |
| `innerHTML` for help/changelog copy (esp. anything derived from stored/user data) | XSS via injected markup; contradicts v1.2's `innerHTML`→DOM hardening (P31) | Build DOM nodes / `textContent`; keep the P31 hardening posture for the new modules |
| Install-nudge / activation help exposing license internals in demo or to the wrong audience | License/paywall info leaking in the marketing demo (P35 locked this down) | Respect the demo lock-down; keep activation help behind the real app gate |
| Welcome/popup writing PII (client names, counts) into `localStorage` flags | Sensitive data outside IndexedDB's model | Store only opaque flags/version strings in `localStorage`; never client data |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Forced linear tutorial that blocks the app | Non-technical therapists feel trapped/intimidated | Non-forced welcome with a first-class "I'll explore myself"; tour is optional + replayable (Calm-style, per Phase 26 D-14) |
| Full-screen "Welcome, let's set up!" for an existing customer | Alarm ("did I lose my data?"), feels insulting | Upgrader-aware copy ("New: in-app help") or a quiet toast (Pitfall 3) |
| Generic SaaS tour energy ("Step 1 of 12 🚀") | Wrong tone for a calm, clinical, warm product | Warm, workflow-led, self-paced voice; short anchor-light steps |
| Nagging install prompt / repeated What's-New | Erosion of trust; dismissal fatigue | Dismissable, once, respectful; store dismissal; never re-nag same version |
| "Install" button that does nothing on iOS Safari | Confusion (no `beforeinstallprompt` on iOS) | Per-browser *illustrated instructions* (Safari = Share → Add to Home Screen), not a universal button |
| Tour tooltip overflow/truncation in Hebrew/German | Clipped or mirrored-wrong guidance for the largest locale | Flexible-height, `min/max-width`, logical-property containers; verify RTL on-device |
| What's-New popup interrupting an in-progress session entry | Lost focus / accidental dismissal mid-work | Fire on load/idle, not over an active form; easy to reopen from the changelog page |

## "Looks Done But Isn't" Checklist

- [ ] **Help page:** works online — but did you load it **offline on an installed PWA**? (precache miss = 404, Pitfall 1)
- [ ] **Tour:** runs on the happy path — but delete a `data-tour` anchor: does it **degrade to a modal**, or silently vanish? (Pitfall 5)
- [ ] **Tour/overlay:** green in jsdom + Chromium — but checked on **real Safari/WebKit in RTL + dark mode**? (Pitfall 6)
- [ ] **What's-New popup:** fires on a version bump — but tested for **fresh install, skipped-version, and rollback**? And keyed off the *shipped* `version.js`, not a fetched value? (Pitfall 2)
- [ ] **Welcome:** shows for new users — but does it **treat a 6-month customer as new**? Upgrader path tested? (Pitfall 3)
- [ ] **First-run:** welcome renders — but does it wait for **legal + license gates**, and never stack with the security note / A2HS banner? (Pitfall 4)
- [ ] **Docs gate:** blocks a missing changelog — but does it **pass test-only commits**, offer a **logged escape hatch**, and is its matching **tested**? (Pitfall 7)
- [ ] **Help content:** reads well in EN — but does it use **current terminology** (Session Format, Heart-Wall), and match **actual shipped behavior**? (Pitfall 8)
- [ ] **i18n:** EN help complete — but do HE/DE/CS render **readable fallback, never raw keys or blanks**? Leakage test present? (Pitfall 9)
- [ ] **Popup ↔ update:** does the changelog popup **double-signal** with the SW "update ready" nudge? (Pitfall 10)
- [ ] **Demo mode:** do welcome/tour/popup/install-nudge **respect the P35 demo lock-down**?

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Precache miss (help 404s offline) | LOW | Add missing paths to `PRECACHE_URLS`, bump `CACHE_NAME`, redeploy; add the precache test so it can't recur. Users self-heal on next SW update |
| Wrong-version / mismatched What's-New popup | MEDIUM | Fix the trigger to key off `version.js`; ship a version bump so the corrected popup supersedes; can't un-show what stale-SW users already saw |
| Welcome fired for existing customers | MEDIUM | Add upgrader detection + one-shot suppression; damage (confusion/support pings) already done — a reassuring changelog entry helps |
| Tour anchor rot (silent holes) | LOW–MEDIUM | Restore/rename anchors, add the anchor-presence test; if degrade-to-modal was in place, impact was cushioned |
| Docs gate bypassed to death | LOW | Re-scope matching to be precise, add logged escape hatch, move enforcement to the DoD gate; re-establish the habit |
| Raw i18n keys leaked to HE users | LOW | Set explicit EN fallback, add leakage test, redeploy; brief window of ugliness |
| Safari-only overlay break | MEDIUM | Reproduce in Playwright WebKit, fix with logical props / explicit SVG sizing / stacking context; add a WebKit gate to prevent recurrence |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Precache 404 offline | Any phase shipping a new page/asset (Help, Changelog) | Static precache-assertion test passes; real offline navigation to `help.html` works on installed PWA |
| 2. Version-keyed popup vs. stale SW | Changelog phase | `shouldShowWhatsNew` matrix test green (fresh/same/bump/skip/rollback); popup keyed to `version.js` |
| 3. Welcome treats customer as new | Welcome/first-run phase | jsdom test: upgrader (data present) → suppressed/variant; fresh → welcome |
| 4. First-run attention collision | First-run orchestration (cross-cutting, before the 3 surfaces) | Written precedence order; ≤1 overlay visible; welcome gated on legal+license; on-device first-run pass |
| 5. Tour anchor rot / silent skip | Tour-engine phase (+ anchor-introducing phase) | Anchor-presence jsdom test; delete-anchor test shows modal fallback |
| 6. Safari/WebKit overlay break | Tour-engine + Welcome phases | Playwright WebKit rect-in-viewport assertion (LTR+RTL); on-device Safari + dark-mode pass |
| 7. Docs gate bypass / too coarse / no escape | Docs-gate phase | Gate tests: blocks user-facing-no-changelog, passes test-only, passes on logged escape token |
| 8. Help content drift | Help-content phase + Docs-gate phase | Terminology audit (Session Format/Heart-Wall); Sapir/Ben accuracy review vs. shipped behavior; screenshot manifest |
| 9. Untranslated key leakage | Help-content phase | Raw-key/blank-key leakage test across all 4 locales; EN fallback confirmed |
| 10. Popup ↔ update double-signal | Changelog phase (with v1.2 P28 SW logic) | Single-fire test incl. "update just applied"; no separate "updated" toast for same version |

## Sources

- **This repo's verified constraints & shipped-incident memory** (HIGH): `.planning/PROJECT.md` (offline/zero-dep/4-locale/version.js single source/demo lock-down); memory refs `reference-pre-commit-sw-bump` (hook skips CACHE_NAME bump), `reference-sw-version-update-delivery` + `reference-pwa-sw-cache-updates` (installed-PWA stale-SW lag, Safari update unreliability), `reference-webkit-chromium-svg-visual-verification` + `reference-rtl-select-value-alignment-headless` (Chromium-only gates miss Safari; viewBox-only SVG = 0×0 in WebKit), `reference-pdf-jsdom-inert-gates` + `feedback-behavior-verification` (jsdom false-GREEN; runtime behavior needs real-browser verification), P37 TERM-01/02 (terminology drift precedent).
- **Archived Phase 26 research** (HIGH, cross-checked): `.planning/milestones/v1.1-phases/26-in-app-onboarding-overview-help-system/26-RESEARCH.md` — Pitfalls 1–6 (AGPL license, non-RTL/dark vendored CSS, SPA-assumption cross-page, iOS install, EN→Hebrew-imperative, silent-skip fallback). Re-derived independently here; this pass adds the *integration-with-a-live-system* pitfalls P26 did not cover (precache miss, stale-SW version popup, upgrader-vs-fresh, first-run stacking, docs-gate bypass, content drift, key leakage, double-signal).
- **Community best practice** (MEDIUM): [Product Fruits — Building Unbreakable Product Tours](https://productfruits.com/blog/building-unbreakable-product-tours) (data-attributes over CSS classes; wait for DOM settlement; graceful missing-element handling; silent crashes); [Intercom — Edit CSS to point tours at the right elements](https://www.intercom.com/help/en/articles/2901138-edit-css-to-point-your-tour-at-the-right-website-elements); [MDN — PWA Caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching) and [PWA Workshop — Precaching](https://pwa-workshop.js.org/3-precaching/) (404 not self-healed; cache-first never refreshes without new SW; need a precache manifest); [DEV — Deterministic caching for offline-first PWAs](https://dev.to/crisiscoresystems/service-workers-that-dont-surprise-you-deterministic-caching-for-offline-first-pwas-5480); [git-scm — githooks](https://git-scm.com/docs/githooks) and [Adam Johnson — Git: How to skip hooks](https://adamj.eu/tech/2023/02/13/git-skip-hooks/) (`--no-verify` bypasses pre-commit/commit-msg by design; skipping defeats the purpose).

---
*Pitfalls research for: adding in-app help/onboarding + version changelog + docs-maintenance gate to a live offline-first vanilla-JS RTL PWA (solo + AI-agent maintainer)*
*Researched: 2026-07-07*
