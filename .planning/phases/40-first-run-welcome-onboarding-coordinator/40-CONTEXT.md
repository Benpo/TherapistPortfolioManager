# Phase 40: First-Run Welcome & Onboarding Coordinator - Context

**Gathered:** 2026-07-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Build (1) the **attention-surface coordinator** — a single decision point that enforces a written precedence order so at most ONE attention surface appears per browser session; (2) the **full-screen branded welcome overlay** (Variant B split layout, two first-class CTAs) firing once on first launch after activation; (3) the **"Replay welcome" entry** in the existing "?" popover; (4) a **computer-focused PWA install nudge** (real Install button on Chromium via `beforeinstallprompt`, Add-to-Dock pointer on macOS Safari); and (5) the **retirement of the iOS install banner**, replaced by a one-shot all-mobile expectation-setting hint.

**Not this phase:** the guided tour itself (Phase 41 — the welcome's tour CTA points at `help.html` in the interim), the What's-New popup and changelog (Phase 42 — but the coordinator must expose the registration point it plugs into), the docs-maintenance gate (Phase 43), any change to the backup-reminder banner or footer integrity nudge behavior (explicitly out of the coordinator's jurisdiction), any change to the security note's 7-day cadence (backlogged as a todo), help body-content translation (still EN-only).

**Language scope (explicit):** all new user-facing strings in this phase (welcome `help.welcome.*`, install nudge, mobile expectation hint, "?" menu entry) are UI chrome → ship in **all 4 locales (EN/HE/DE/CS)** in this phase, per the standing all-language rule. Hebrew uses noun/infinitive forms (Phase 24 D-05).

</domain>

<decisions>
## Implementation Decisions

### Precedence order & launch semantics (ONBD-03 — the order REQUIREMENTS.md deferred to this discussion)
- **D-01:** **Written precedence order (highest wins, it alone shows):** Welcome > What's-New (Phase 42) > security note > install nudge > mobile expectation hint. Rationale: ceremony-by-rarity — one-shot surfaces outrank recurring ones so a never-dismissed weekly note can never starve a once-per-version popup.
- **D-02:** **"One launch" = one browser session.** A sessionStorage marker records that a governed surface already showed this session; navigating between app pages never fires a second surface. Closing the browser/PWA and reopening starts a new launch. Losers are not queued within the session — they compete again next session.
- **D-03:** **Upgrader collision — welcome subsumes What's-New:** an existing user upgrading into v1.3 has no `sg.welcomeSeen` flag → welcome fires (per locked P26 D-15); showing the welcome ALSO records the current `APP_VERSION` as the last-seen What's-New version, so no v1.3 What's-New popup follows next launch. v1.3's notes remain readable in the help-center changelog page (Phase 42). Future upgrades get What's-New normally. The coordinator/welcome must write this last-seen-version key in a form Phase 42 will read — planner defines the key name with Phase 42 in mind.
- **D-04:** **Governed surfaces = exactly the 5 named:** welcome, What's-New (registers in Phase 42), security note, install nudge, mobile expectation hint (iOS banner successor). The **backup-reminder banner and footer integrity nudge stay independent** — functional signals, not onboarding ceremony. DB-error banners obviously exempt (critical).
- **D-05:** **Security note behavior unchanged** — same copy, same 7-day re-appear cadence, same Overview-only container; the coordinator only gates WHETHER it may appear this session (only when no higher-priority surface claimed the launch). Cadence backoff idea → backlog todo (see Deferred).

### Coordinator design
- **D-06:** **Dedicated registry module** (new `assets/` file): each surface registers `{id, eligible(), show()}`; the coordinator walks the precedence list as data, once per session, from `initCommon`, and shows the first eligible surface. Phase 42 adds What's-New by registering ONE entry — no rewrite of existing logic.
- **D-07:** **Module name MUST NOT say "onboarding"** — it coordinates attention surfaces generally (Ben, explicit). e.g. `attention-coordinator.js` / `surface-coordinator.js`; exact name Claude's discretion.
- **D-08:** **Runs on every app page** — the coordinator fires on whichever page the session starts (bookmarked deep links included). Full-screen surfaces (welcome, mobile hint) mount on any page; the security note remains Overview-only by its container — if it wins the session on a non-Overview page, it simply doesn't render there (planner: decide whether winning-but-unrenderable consumes the session slot or passes to the next eligible surface — Claude's discretion, document the choice).
- **D-09:** **Fully disabled in demo mode** (`window.name === 'demo-mode'`, Phase 35 pattern) — no governed surface ever appears in the demo iframe.

### Welcome overlay
- **D-10:** **Layout = Variant B (Split)** from `.planning/sketches/001-welcome-overlay/` — botanical illustration on one inline side, copy + CTAs on the other; sides flip cleanly under RTL via logical properties. All other welcome parameters are locked upstream (26-UI-SPEC): full-screen, garden tokens, Display-role headline, copy skeleton + `help.welcome.title/subtitle/ctaTour/ctaExplore` keys, one-shot `localStorage 'sg.welcomeSeen'`, either CTA or Esc dismisses, upgraders see it once.
- **D-11:** **Interim tour CTA:** "Take the guided tour" opens `help.html` until Phase 41 rewires it to the real tour (roadmap-anticipated; one-line change later). Ben additionally intends not to push to production until the tour phase lands, so the interim wiring is a safety net, not a shipped promise.

### Install nudge (computers)
- **D-12:** **Soft dismissable card with a real Install button where the platform allows:** on Chromium (Chrome/Edge) capture the `beforeinstallprompt` event and have the card's **[Install]** button trigger the native install dialog; on macOS Safari show a one-line "File → Add to Dock" pointer + link to the existing Phase 39 help install topic. Never eligible when already installed (`display-mode: standalone`).
- **D-13:** **Eligible from the second session on** — no extra usage-signal bookkeeping; the coordinator's lowest-tier ordering naturally keeps it off the first launch (welcome wins).
- **D-14:** **Dismissed = gone forever** (persistent flag). One ask, one no, never again; the help-center install topic remains for whenever they're ready.

### iOS banner retirement & mobile expectation hint
- **D-15:** **The hardcoded-English per-session iOS install banner (`index.html:367-374`) is DELETED** — it promotes installing on a platform we deliberately don't support (P39 D-15 computer-only).
- **D-16:** **Replacement: a one-shot, dismissed-forever, fully i18n'd expectation hint on ALL mobile devices** (iOS + Android — phone-class detection, not iOS-only UA sniffing): "Sessions Garden is designed for computers — your data lives on each device separately," linking to the P39 D-16 mobile-expectations help topic. Coordinator-governed at the lowest precedence tier. Voice: calm app voice, not a warning.

### "?" re-open entry
- **D-17:** **Menu entry "Replay welcome"** appended to the Phase 39 "?" popover (the documented extension slot at `assets/app.js` initHelpEntry) — reopens the exact same welcome overlay; replaying never re-arms the one-shot flag or the coordinator (it's a direct open, outside the per-session arbitration). Phase 41 adds its own "Take the tour" entry later; no renaming churn.

### Claude's Discretion
- Exact coordinator module filename (within D-07's no-"onboarding" constraint), storage key names (session marker, install-nudge dismissal, mobile-hint dismissal, last-seen-version), and the registration API shape.
- "?" menu position of "Replay welcome" (suggested: after "Help center", before "Contact us").
- Welcome hero illustration choice (existing botanical assets vs. new; must fit Variant B and dark mode).
- Mobile expectation hint exact wording + phone-class detection approach (all-mobile per D-16).
- Winning-but-unrenderable semantics for the Overview-only security note on other pages (D-08).
- Whether the mobile hint and install nudge are mutually exclusive by device class (they are in practice — desktop gets the nudge, mobile the hint).

### Folded Todos
- `2026-05-15-in-app-onboarding-overview-help.md` — origin todo of the whole help/onboarding system; Phase 40 delivers its welcome/first-run slice (help center shipped in P39, tour in P41). Closes at v1.3 ship.
- `2026-03-24-pwa-install-guidance-and-user-manual.md` — install-guidance content shipped in P39; Phase 40 delivers the install *affordance* slice (ONBD-04). Closes at v1.3 ship.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §Onboarding & First-Run (ONBD-01..04) — ONBD-03's "exact order + upgrader-vs-fresh handling decided in discuss-phase" is now D-01..D-05 above.
- `.planning/ROADMAP.md` §Phase 40 — goal, success criteria, dependency notes (coordinator is the Phase 42 registration point; welcome CTAs point at help center then the tour).

### Design contract (locked upstream — the welcome implements these)
- `.planning/milestones/v1.1-phases/26-in-app-onboarding-overview-help-system/26-UI-SPEC.md` — welcome overlay contract: spacing steps (lg/xl/2xl/3xl rows), 4-role type scale (Display = welcome headline only), color roles, CTA hierarchy (primary filled / secondary first-class non-accent), copy skeleton + i18n keys (`help.welcome.*`), one-shot `sg.welcomeSeen` semantics (§overlay row, ~line 194).
- `.planning/milestones/v1.1-phases/26-in-app-onboarding-overview-help-system/26-CONTEXT.md` — P26 D-09 (welcome shape), D-10 (garden design system), D-15 (trigger/dismissal logic incl. upgraders-see-it-once).
- `.planning/sketches/001-welcome-overlay/index.html` + `README.md` — the three layout variants; **Variant B (Split) is the picked winner (D-10)**. Start from its composition, tokens, and RTL behavior.

### Prior phase context (the surfaces & extension points this phase touches)
- `.planning/phases/39-help-center-entry-point/39-CONTEXT.md` — D-09/D-10 ("?" popover built for appendable entries), D-15 (computer-only install support — the reason the iOS banner dies), D-16 (mobile expectation-setting help topic the hint links to).
- `assets/app.js` — `initHelpEntry` (~466–565, the "?" popover extension slot documented for "Replay welcome"), `showFirstLaunchSecurityNote` (~1356, the governed security note), `initCommon` (coordinator mount point), `checkBackupReminder` (~1253, explicitly NOT governed).
- `index.html:83` — `#security-guidance-container` (Overview-only note container); `index.html:367–374` — the iOS banner inline script to DELETE (D-15).
- `assets/version.js` — `window.AppVersion.APP_VERSION` (the version key D-03's last-seen-version write must use; never the SW/integrity-token layer) + `buildNudge` (integrity nudge, NOT governed).
- `assets/shared-chrome.js` — footer/nav chrome; `maybeUpgradeFooterAndNudge` (independent surface, unchanged).

### Conventions
- `.planning/SessionsGarden-DNA-EN.md` — voice brief for all new copy (welcome subtitle nuances, hint wording, nudge copy).
- `assets/i18n-en.js` (+ he/de/cs) — 4-locale UI-chrome parity for every new string in this phase.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **"?" popover** (`assets/app.js` initHelpEntry) — Phase 39 built it explicitly so Phases 40–42 append entries "with no rewrite" (documented at ~app.js:472/514). "Replay welcome" lands there.
- **Modal/overlay patterns + scroll lock** (`assets/app.js` ~1591 modal scroll-lock) — the full-screen welcome reuses the established overlay idiom (Esc handling, body scroll lock, `[hidden]` semantics).
- **Phase 35 demo seam** (`window.name === 'demo-mode'`) — the exact check D-09 uses to disable the coordinator in demo.
- **Garden design system** — `assets/tokens.css` semantic tokens, botanical illustrations (`assets/illustrations/`), Rubik woff2, `[data-theme="dark"]`; the sketch 001 Variant B already uses production tokens.
- **Extraction pattern** (Phase 31: dedicated `assets/<module>.js`, init-handshake, no new globals unless needed) — the coordinator module follows it.

### Established Patterns
- One surface = one localStorage/sessionStorage flag with try/catch reads (`securityGuidanceDismissed`, `iosPromptDismissed` precedents).
- 4-locale `data-i18n` parity for UI chrome; Hebrew noun/infinitive forms.
- CSS logical properties only (RTL); zero npm deps; `sw.js` PRECACHE_URLS edits need the manual chore follow-up commit (known pre-commit-hook gotcha) if any new file ships.
- Tests: zero-dep node runner (`tests/run-all.js`, fs+vm jsdom patterns); behavior tests before implementation for runtime-behavior code (project rule).

### Integration Points
- `App.initCommon()` — single coordinator invocation point, every app page.
- `index.html:367` iOS banner script — deleted; its per-session sessionStorage idiom informs the coordinator's session marker.
- `showFirstLaunchSecurityNote()` call site (app.js ~892) — moves behind the coordinator's arbitration instead of firing unconditionally.
- `beforeinstallprompt` — new listener (Chromium only); must be captured early (fires before user interaction, often pre-DOMContentLoaded).
- Phase 42 registration point — the coordinator's registry API + the last-seen-version key written by the welcome (D-03).

</code_context>

<specifics>
## Specific Ideas

- Ben's naming constraint: the coordinator "shouldn't include 'onboarding' if it serves multiple purposes and popups" — name it for the general job.
- The welcome is "the highest emotional-impact surface in the app" (sketch 001 brief): felt calm, not SaaS onboarding energy ("Let's get you set up! Step 1 of 12" is the anti-pattern).
- Security note stance (Ben): "don't want this to compete with other popups, but also fine with keeping it happening — only if no other popups would need to appear, it can refer to the 7-days count and appear."
- The mobile hint catches the "where is my data on my phone?" confusion at the exact moment it happens, then stays out of the way forever.
- Install nudge philosophy: one honest ask with a real one-click path where the browser allows it; the help topic is the evergreen fallback.

</specifics>

<deferred>
## Deferred Ideas

- **Security-note cadence backoff** — spread the weekly re-appearance across widening intervals (7 → 10 → 14 → 21 → 60 → 120 days; exact cycles TBD — Ben explicitly unsure, revisit at pickup). Captured as `.planning/todos/pending/2026-07-08-security-note-cadence-backoff.md`. Post-v1.3 backlog, NOT this phase.
- **What's-New popup + changelog** — Phase 42 (registers into this phase's coordinator).
- **Guided tour** — Phase 41 (rewires the welcome's tour CTA and adds its own "?" entry).

### Reviewed Todos (not folded)
- `2026-03-24-terms-acceptance-business-notification.md` — restructuring terms acceptance into the LS activation flow touches the pre-app launch sequence but is its own activation-flow project, not an attention surface. Stays pending.
- The remaining ~20 keyword matches from the todo scan (drag-sort settings, modality templates, export-modal resize, error-tone adoption, help-popover a11y, etc.) were reviewed and are unrelated to first-run/attention-surface scope — they remain pending for their own phases.

</deferred>

---

*Phase: 40-first-run-welcome-onboarding-coordinator*
*Context gathered: 2026-07-08*
