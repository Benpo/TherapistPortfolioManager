# Tour step 2→3 cross-page resume failure — findings (2026-07-10)

**Investigator:** Claude (agent, live-site Playwright repro against https://sessionsgarden.app)
**Status:** ROOT CAUSE CONFIRMED — reproduced deterministically on Chromium AND WebKit.
**Repo is read-only for this investigation — no source was modified.**

---

## 1. VERDICT — **[VERIFIED]**

The tour **reproducibly dies when advancing from step 2 → step 3**, i.e. the first
cross-page transition (`index` → `settings`). After clicking Next on step 2, the browser
navigates and the **settings page loads bare — no tour chrome mounts at all**. Reproduced on
BOTH Chromium and WebKit, fresh context (service workers blocked = clean network code), EN,
1440×900.

This is a **real code bug on the production host**, distinct from the earlier "card shoved
off-screen" report (that one was cache-poisoning only — see the geometry sweep, not
reproducible on clean files).

**Scope is bigger than step 3:** the same mechanism breaks EVERY cross-page step on the
production clean-URL host — settings (steps 3–6), add-session (7–9), sessions (10–12). The
tour can never advance past step 2 in production. Steps 1–2 work only because they are
same-page on `index`.

---

## 2. ROOT CAUSE — **[VERIFIED]**  (clean-URL page-check mismatch; NOT the coordinator)

Production host (Cloudflare Pages) auto-redirects `.html` URLs to **clean/extensionless**
URLs, but the tour identifies pages by their `.html` filename. The strict string-equality
page check in `resume()` therefore fails and the tour silently no-ops.

- `tour.js:536` (inside `resume()`): `if (STEPS[data.stepIndex].page !== api._currentPage()) return;`
- `STEPS[2].page` = `"settings.html"` (`tour.js:133`)
- `currentPage()` (`tour.js:675`) returns `location.pathname.split('/').pop()` = **`"settings"`**
  on the live host, because `/settings.html` **308-redirects to `/settings`**.
- `"settings.html" !== "settings"` → **early return → tour never renders.**

### Evidence for/against the three suspects

| Suspect | Verdict | Evidence |
|---|---|---|
| **Resume ran but page-check failed (clean URL)** | ✅ **CONFIRMED cause** | `curl -I /settings.html` → `HTTP 308 → /settings` (also `/index.html` → `/`). Live repro: after nav, `location.pathname="/settings"`, `Tour._currentPage()="settings"`, `STEPS[2].page="settings.html"`, MATCH=false. Marker present, no chrome mounted. |
| **AttentionCoordinator ordering / races the resume** | ❌ **RULED OUT** | `Tour.resume()` runs at `app.js:916`, BEFORE `bootAttentionSurfaces()`→`AttentionCoordinator.run()` at `app.js:943`. The tour is already dead (resume early-returned) before the coordinator runs. Zero console errors. The Phase-42 `Tour.isActive()` guard is irrelevant here (tour not active on fresh load — as team-lead predicted). NOTE: in one repro variant the "What's new v1.3" modal appeared on settings — that is the coordinator filling the *already-empty* slot, a bystander/symptom, not the cause (and it was an artifact of my localStorage setup; see §3). |
| **Missing step-3 anchor** | ❌ **RULED OUT** | `[data-tour="personalize"]` EXISTS on settings.html (`settings.html:125`) and is the DEFAULT-ACTIVE, non-hidden tab. Live repro: `anchorPresent:true, anchorVisible:true`. Forcing `Tour._setStepIndex(2); _render()` on `/settings` mounts step 3 as a proper spotlight (title "Your formats and dates"). Engine + anchor are fine; the page-check gate is the SOLE blocker. |

### Why it escaped tests — **[VERIFIED]**
Local/CI servers (incl. `tests/webkit/41-rtl-geometry.mjs`'s static server) serve
`/settings.html` **literally** — no clean-URL rewrite — so `currentPage()` returns
`"settings.html"` and matches. The bug is invisible anywhere except the CF Pages host.
`_redirects` in the repo is empty (comments only), so the redirect is CF's **automatic**
clean-URL behavior, not repo config.

---

## 3. EXACT FAILURE CHAIN OBSERVED — **[VERIFIED]**

Real user path = `Tour.start()` → step 1 → step 2 → click **Next**. Repro drove `next()`
(same code path the Next button calls).

1. `next()` (`tour.js:487`): from step 2 (`stepIndex 1`), `nextIndex=2` (`personalize`,
   `page:'settings.html'`) ≠ current `index.html` → persists
   `sg.tourResume = {"tourId":"main","stepIndex":2}` (`tour.js:493`) then navigates to
   `./settings.html` (`tour.js:494`).
   - **sessionStorage marker BEFORE next():** `null`
   - **marker AFTER next()/nav:** `{"tourId":"main","stepIndex":2}`  ← correctly persisted
2. Cloudflare Pages: `GET /settings.html` → **HTTP 308** → `/settings`. Page loads at
   `pathname = "/settings"`.
3. On load, `app.js:916` calls `Tour.resume()` (in `initCommon`, right after `setLanguage`).
4. `resume()` (`tour.js:536`): `STEPS[2].page ("settings.html") !== currentPage ("settings")`
   → **early return**. No render.
5. Post-state (both engines): `tourChromeMounted:false`, `Tour.isActive()===false`,
   marker still `{"stepIndex":2}` (unconsumed), **console errors: NONE**.
6. Execution order confirmed: resume (916) BEFORE coordinator.run (943). Coordinator did not
   tear anything down; the tour was never mounted to tear down.

**Repro-artifact caveat:** my probe set `sg.welcomeSeen=1` WITHOUT the whats-new marker, so
the coordinator showed the "What's new v1.3" modal on the bare settings page. In the REAL
welcome-CTA flow, welcome-dismiss stamps BOTH `sg.welcomeSeen` and `sg.whatsNewLastSeenVersion`
(`attention-coordinator.js:238`), so whats-new is NOT eligible and the settings page loads
**truly empty**. Either way the tour is dead — the modal is orthogonal to the root cause.

---

## 4. SMALLEST SAFE FIX — **[HYPOTHESIS — fix not yet implemented/tested]**

One added line in `currentPage()` (`tour.js:675`) — canonicalize clean URLs to the `.html`
identifier the STEPS table uses:

```js
function currentPage() {
  try {
    var p = (window.location && window.location.pathname) || '';
    var seg = p.split('/').pop();
    if (!seg) return 'index.html';                 // '/' → index.html  (existing behavior)
    if (seg.indexOf('.') === -1) seg += '.html';   // '/settings' → 'settings.html'  (the fix)
    return seg;
  } catch (e) { return 'index.html'; }
}
```

Why this is the smallest safe fix:
- ALL callers (`resume`, `next`, `prev`, `start`) funnel through this one seam and compare
  against `.html` STEPS ids → fixes every cross-page transition at once.
- **No-op on non-clean-URL hosts** (segment already has a dot → unchanged) → local tests stay
  green.
- Direction-neutral; no other behavior changes.
- Equivalent alternative: strip `.html` from BOTH sides instead of adding it.

**Recommended regression guard:** a test that stubs `location.pathname` to a clean URL
(`/settings`) and asserts `resume()` mounts step 3. The current suite structurally cannot
catch this (it only ever uses `.html` paths). Best would be an e2e against the deployed host.

---

## 5. NOT YET VERIFIED / open items

- **[NOT VERIFIED]** The fix itself — proposed only; not written to source, not run through
  tests, not re-tested live.
- **[NOT VERIFIED]** The full real user launch path via the welcome CTA button click
  (`AttentionCoordinator.showWelcome` primary CTA → `Tour.start()`). I drove `Tour.start()`
  and `next()` directly (identical code paths) but did not click the physical welcome CTA nor
  the "?" → take-tour help entry. Low risk — the cross-page mechanism is downstream of launch.
- **[NOT VERIFIED]** Steps beyond 3 on their real pages (add-session, sessions). By code
  inspection they share the identical `page:'*.html'` vs clean-URL mismatch, so they are
  predicted to fail identically, but I only live-reproduced the step 2→3 (settings) case.
- **[NOT VERIFIED]** Whether any OTHER consumer of `currentPage()` outside tour.js exists
  (grep suggested it is tour-internal only, but not exhaustively audited).
- **[NOT VERIFIED]** Behavior of the "Take me there" fallback link (`tour.js:467`) which uses
  the same `takeMeThereHref: './settings.html'` — predicted same redirect + same mismatch on
  arrival, but not separately reproduced.

---

## 6. SCREENSHOTS (copied into this dir with dated names)

- `2026-07-10_tour-resume-dead_chromium.png` — bare settings page after step 2→3 (Chromium); tour gone
- `2026-07-10_tour-resume-dead_webkit.png` — same on WebKit (shows whats-new modal artifact per §3 caveat)
- `2026-07-10_tour-resume-forced-render_chromium.png` — step 3 mounts cleanly when page-check bypassed (Chromium)
- `2026-07-10_tour-resume-forced-render_webkit.png` — same on WebKit (proves engine+anchor fine)

Original repro harness + full geometry-sweep screenshots remain in the session scratchpad:
`/private/tmp/claude-501/-Users-ben-Claude-Code-Sandbox-TherapistPortfolioManager-app/f17d2c33-900f-462c-affb-92148d22bace/scratchpad/tour-repro/`
(`repro-resume.mjs` = the resume-bug harness; `repro.mjs` = the geometry sweep.)

---

## Appendix — key source references

- `tour.js:130-143` — STEPS table; all `page` values are `*.html`
- `tour.js:487-499` — `next()` cross-page persist+navigate
- `tour.js:529-539` — `resume()` (the failing `!==` page-check at :536)
- `tour.js:675-681` — `currentPage()` (returns raw last segment; the fix target)
- `app.js:916` — `Tour.resume()` invocation (in `initCommon`, after `setLanguage`)
- `app.js:943` — `bootAttentionSurfaces()` → `AttentionCoordinator.run()` (runs AFTER resume)
- `settings.html:60` — `#settingsTabPersonalizeBtn` (step 3 `activate` target)
- `settings.html:125` — `[data-tour="personalize"]` (step 3 anchor; default-active tab)
- `_redirects` — empty (comments only); clean-URL 308 is Cloudflare Pages default behavior
