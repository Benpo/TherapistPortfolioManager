# Phase 41: Replayable Guided Tour - Context

**Gathered:** 2026-07-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the **replayable guided tour** — a bespoke ~10-step spine tour engine (no template; `demo-hints.js` was deleted in Phase 35) launched ONLY by explicit choice (the welcome overlay's tour CTA — rewired from its interim `help.html` target — and a new "Take the tour" entry in the "?" popover). Every step degrades gracefully per TOUR-02 (anchor present & visible → spotlight + tethered tooltip; missing/hidden → centered modal with the same text + working "Take me there" link — never a silent skip, anchor-presence test guards rot). The tour survives cross-page navigation via sessionStorage (TOUR-03) and re-renders cleanly on mid-tour language switch including RTL (TOUR-04). Also in scope: a mid-tour exit choice ("Remind me later" / "I'll explore myself") with a small coordinator-governed reminder surface next session, and the finish card linking to the help center + first-client/first-session actions.

**Not this phase:** What's-New popup & changelog (Phase 42), tour copy translation is IN this phase (all-4-locale exception below — Phase 42.1 remains help-body-content only), docs-maintenance gate (Phase 43), any tour inside demo mode (D-16), changes to welcome/coordinator behavior beyond the CTA rewire + one new registered reminder surface.

</domain>

<decisions>
## Implementation Decisions

### Route & step content
- **D-01:** **Full-spine route, 10 steps:** 1) Overview welcome/orientation → 2) Add-client button → 3) Start-a-session entry → 4) session form: setup zone (client + date + session format) → 5) session form: the heart (emotions/severity + Heart-Wall) → 6) session form: save & after-save — copy MUST also mention the export capability (sessions list is empty on a fresh app, so it can't be shown live; at minimum name it and show the colored export icon in the tooltip) → 7) Sessions page (browse/filter) → 8) Reporting dashboard → 9) Backup (cloud button) → 10) "?" help + finish card. Ben explicitly accepted 10 steps over the roadmap's "~6–9" (the tilde carries the intent; short calm steps beat the count).
- **D-02:** **Chrome-only anchors** — every step targets an always-present element (nav links, buttons, form sections), never data rows. The TOUR-02 fallback modal stays a rot guard, not a routine first-run experience (a brand-new empty app must show spotlights, not fallbacks).
- **D-03:** **Copy depth: title + 1–2 calm sentences per step (≤~40 words)**, in the garden voice, native-speaker-agent verified (TOUR-01).

### Tooltip chrome (resolves sketch 003 Variant B's open winner)
- **D-04:** **Desktop: tethered tooltip + arrow** (Ben picked it from the live sketch this session). RTL arrow-flip is a validated sketch behavior — keep it.
- **D-05:** **Small screens: bottom-sheet** below a width breakpoint; spotlight still highlights the anchor; no tooltip-collision math on cramped viewports.

### Navigation & resume semantics
- **D-06:** **Auto-navigate on Next** — when the next step lives on another page, clicking Next navigates there itself; sessionStorage state resumes the tour on load (TOUR-03).
- **D-07:** **Page inert during the tour** — dim overlay blocks all clicks outside the tour chrome (Previous/Next/Close + "Take me there" in fallback). Tour state can never desync from user actions underneath.
- **D-08:** **Mid-tour close offers a concise choice: "Remind me later" / "I'll explore myself".** "Remind me later" → next browser session a small governed card ("Ready to finish the tour?" Start/Dismiss) shows via the Phase 40 attention coordinator at low precedence — the tour itself still only ever RUNS on click (TOUR-01 intact). "I'll explore myself" → never remind again (persistent flag). Phrasing must be concise.
- **D-09:** **Relaunch always restarts from step 1.** SessionStorage resume state serves ONLY cross-page continuation inside a single run — never across launches. (Ben rejected offer-to-resume.)
- **D-10:** **Finish card** in the garden voice with: "Browse the help center" link (roadmap's completion→help handoff) PLUS action buttons "Add your first client" / "Start your first session".

### Language scope & wiring
- **D-11:** **Tour copy ships in ALL 4 locales (EN/HE/DE/CS) in this phase** — ~10 short texts + finish card + chrome strings; it does NOT wait for Phase 42.1 (which stays help-body-content only). TOUR-04's mid-tour language switch then demos properly in every language. Hebrew noun/infinitive forms (Phase 24 D-05).
- **D-12:** **Welcome CTA rewire:** "Take the guided tour" switches from `help.html` to launching the real tour (the anticipated one-line change, P40 D-11).
- **D-13:** **"?" popover gains a "Take the tour" entry** in the documented extension slot (P40 D-17 anticipated it — no renaming churn).
- **D-16:** **No tour in demo mode** (`window.name === 'demo-mode'`) — the "?" tour entry hides in demo; consistent with the Phase 35/40 demo seam. (Tour-in-demo captured as a deferred idea.)

### Browser compatibility (Ben-added area)
- **D-14:** **Chromium-first dev loop, WebKit-gated verification:** develop/iterate in Chromium for speed, BUT the phase's verification gate runs Playwright-WebKit for the TOUR-04 RTL criterion + spotlight/tooltip geometry, and UAT includes one real-Safari pass. (Reconciles Ben's "Chrome-first" with TOUR-04's locked "real WebKit, not jsdom" wording; Ben approved the reconciliation explicitly.)
- **D-15:** **Modern evergreen baseline** — no legacy shims or capability-check no-op guard; same browser floor as the rest of the app.

### Claude's Discretion
- Tour engine module name/shape (follow the Phase 31 extraction pattern: dedicated `assets/<module>.js`, IIFE, no new globals unless needed).
- sessionStorage key names for tour state; persistent flag names for "never remind" (follow `sg.*` conventions from attention-coordinator.js).
- The reminder surface's exact precedence slot in `AttentionCoordinator.PRECEDENCE` (low — below security note is implied by "small, low precedence"; planner decides exact position and documents it).
- Anchor selection mechanism (data-attributes vs selectors) and the shape of the anchor-presence test (TOUR-02's rot guard).
- Bottom-sheet breakpoint value; spotlight animation details; exact "?" menu position of "Take the tour" (P40 suggested pattern: after "Replay welcome").
- Whether steps 4–6 (session-form zones) scroll the form to bring each zone into view, and how the inert overlay interacts with page scroll.

### Folded Todos
- `2026-05-15-in-app-onboarding-overview-help.md` — origin todo of the whole help/onboarding system; Phases 39 (help center) and 40 (welcome/coordinator) folded their slices; Phase 41 delivers the final slice (the tour). Closes at v1.3 ship.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §Guided Tour (TOUR-01..04) — the four locked requirement contracts (explicit launch + voice; graceful degradation + anchor test; cross-page sessionStorage resume; language/RTL re-render).
- `.planning/ROADMAP.md` §Phase 41 — goal, success criteria, dependency notes (P39 help-center completion target, P40 launch surfaces; "highest technical fragility in the milestone").

### The reference sketch (THE starting point — resolves how the tour looks & degrades)
- `.planning/sketches/003-tour-fallback/index.html` — live mockup: Variant A (anchored↔fallback walkthrough with "Break anchor" toggle — the D-11/TOUR-02 degradation behavior to replicate), Variant B (chrome treatments — **tethered tooltip + arrow is the picked winner, D-04**), Variant C (long-copy + EN→HE→DE re-render pattern — the TOUR-04 cleanup-then-replace approach). Uses production tokens via `../themes/default.css`.
- `.planning/sketches/003-tour-fallback/README.md` — what each variant validates (RTL tether flip, dark tokens, color discipline: only Next/Done + spotlight ring use the primary accent; Previous/Close/"Take me there" stay neutral).

### Prior phase contracts (the surfaces this phase plugs into)
- `.planning/phases/40-first-run-welcome-onboarding-coordinator/40-CONTEXT.md` — D-11 (welcome tour-CTA interim wiring → rewire here), D-17 ("?" entry extension slot), coordinator design D-06..D-09 (the registry the reminder surface registers into).
- `assets/attention-coordinator.js` — `register({id, eligible(), show()})`, `PRECEDENCE`, one-per-session marker, demo-off gate, `sg.*` storage-key conventions; the D-08 reminder card registers here.
- `assets/app.js` — `initHelpEntry` (~466–565, "?" popover rows; "Take the tour" appends here), `app:language` event (dispatch at ~126 — the TOUR-04 re-render trigger), `initCommon` (page bootstrap), modal scroll-lock idiom (~1591).
- `.planning/milestones/v1.1-phases/26-in-app-onboarding-overview-help-system/26-UI-SPEC.md` — tokens, 4-role type scale, color discipline, copywriting contract, D-11 tour degradation pitfall (the original fallback contract).

### Voice & i18n
- `.planning/SessionsGarden-DNA-EN.md` — voice brief for all tour copy (calm, warm, garden-branded — not SaaS tour energy).
- `assets/i18n-en.js` (+ `i18n-he.js`, `i18n-de.js`, `i18n-cs.js`) — 4-locale parity for ALL tour strings (D-11); source of quoted on-screen labels so step copy names real UI.
- `.planning/phases/39-help-center-entry-point/39-CONTEXT.md` — D-19/D-20 wording pipeline (writer grounded in real source → factual gate → native-speaker gate → DNA/consistency gate) — TOUR-01's "native-speaker-agent verified" should reuse this pipeline shape.

### Conventions & test substrate
- `.planning/codebase/TESTING.md` + `tests/run-all.js` — zero-dep node runner; behavior tests BEFORE implementation for runtime-behavior code (project rule); the TOUR-02 anchor-presence test joins here.
- Known repo gotcha: new `assets/*.js` files shipped to production need `sw.js` PRECACHE_URLS + the manual CACHE_NAME chore follow-up commit.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`assets/attention-coordinator.js`** — registry API + `sg.*` storage idioms + demo seam; the D-08 reminder surface is one `register()` call (exactly the Phase 42-style extension it was built for).
- **"?" popover extension slot** (`assets/app.js` initHelpEntry, documented ~471/515) — "Take the tour" row appends with no rewrite; welcome CTA (`welcome-cta--primary`, `help.welcome.ctaTour` key at attention-coordinator.js:180) currently points at `help.html` — the D-12 rewire target.
- **`app:language` event** (app.js:126) — established re-render trigger used by ~8 listeners; the tour's TOUR-04 re-render subscribes the same way (sketch Variant C's cleanup-then-replace pattern).
- **Sketch 003's working JS** — spotlight animation between anchors, tether/arrow positioning, break-anchor fallback, language re-render — a working prototype to port from, with production token parity.
- **Garden design system** — `assets/tokens.css`, dark tokens, Rubik, logical properties.

### Established Patterns
- Phase 31 extraction pattern: dedicated IIFE module in `assets/`, four-slot responsibility banner, no new globals unless needed.
- One surface = one flag with try/catch storage reads (coordinator lsGet/ssGet helpers are reusable or copyable).
- CSS logical properties only (RTL); zero npm deps; no literal hex.
- Tests: behavior tests before implementation; WebKit visual probes via Playwright for Safari-only rendering bugs (Phase 37 precedent — viewBox-only SVG in flex is 0×0 in WebKit).

### Integration Points
- `assets/attention-coordinator.js` `PRECEDENCE`/`register()` — the tour reminder card (D-08).
- `assets/app.js` initHelpEntry rows — "Take the tour" entry (D-13); hidden in demo (D-16).
- attention-coordinator.js welcome CTA — rewire from `./help.html` to tour launch (D-12).
- Pages the route touches: `index.html` (Overview), `add-session.html`, `sessions.html`, `reporting.html` — tour engine must load on all of them (sw.js precache follow-up applies).
- `document` `app:language` listener — mid-tour re-render (TOUR-04).

</code_context>

<specifics>
## Specific Ideas

- Step 6 (save & after-save): even though a fresh app has no saved sessions to demo export on, the copy should name the export capability and the tooltip may show the colored export icon itself — Ben explicitly wants export surfaced during the tour.
- Exit-choice phrasing must be concise — "Remind me later" / "I'll explore myself" energy, not paragraphs.
- Sketch 003's color discipline carries over: only Next/Done and the spotlight ring take the primary accent; all other tour controls stay neutral.
- The fallback modal should *name where the thing lives* ("This is on the Clients screen.") per the sketch brief — a soft landing, not an error.

</specifics>

<deferred>
## Deferred Ideas

- **Tour inside demo mode** — a guided tour for landing-page prospects exploring the demo iframe could be a genuine marketing asset, but demo's iframe navigation quirks + locked-down controls make it its own scoped effort. Not this phase (D-16).
- **Security-note cadence backoff** — still pending from Phase 40 (`.planning/todos/pending/2026-07-08-security-note-cadence-backoff.md`); the reminder surface added here must not tangle with it.

### Reviewed Todos (not folded)
- The other ~22 keyword matches from the todo scan (drag-sort settings, modality templates, export-modal resize, error-tone adoption, help-popover a11y, Sapir help-content review, etc.) were reviewed and are unrelated to tour scope — they remain pending for their own phases.

</deferred>

---

*Phase: 41-replayable-guided-tour*
*Context gathered: 2026-07-08*
