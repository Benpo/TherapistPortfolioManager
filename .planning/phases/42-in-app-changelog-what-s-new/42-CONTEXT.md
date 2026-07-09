# Phase 42: In-App Changelog & What's-New - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the **in-app changelog system**: (1) a once-per-version **"What's New" popup** — a modest teaser modal governed by the Phase 40 attention coordinator (the reserved `'whats-new'` precedence slot), keyed on `window.AppVersion.APP_VERSION` vs the already-written `sg.whatsNewLastSeenVersion`, suppressed on first-ever launch (welcome subsumes it, P40 D-03), fully offline; (2) a **persistent standalone changelog page** in the help family — reverse-chronological, version-and-date-grouped, plain-language benefit-led entries in the New/Improved/Fixed register; (3) **one structured, i18n-capable data source** (EN canonical) driving both surfaces; (4) **backfilled history** — detailed v1.1→v1.3 entries + a v1.0 one-line launch marker — with v1.3's own notes as the first self-hosted entry (CHLG-01..04).

**Not this phase:** the docs-maintenance hard gate itself (Phase 43 — but the entry schema must give it checkable hooks, e.g. the highlights field), HE/DE/CS translation of entry content (Phase 42.1 — the data shape must be ready for it), rich-text authoring (v1.4 by decision V13-1), email/push announcements (anti-feature AF-11), any change to the independent footer integrity nudge or backup reminder.

</domain>

<decisions>
## Implementation Decisions

### Backfill & sourcing (resolves CHLG-04's open "backfill depth")
- **D-01:** **Backfill = detailed entries for v1.1 → v1.3, plus v1.0 as a one-line "initial launch" marker with no content bullets** (Ben's exact shape). v1.0 never reached customers — it appears only as the origin line.
- **D-02:** **The v1.2.x patch wave (v1.2.1→v1.2.4) consolidates into ONE v1.2 entry** — a single benefit-led story dated with the final release date. No per-patch bugfix-log energy.
- **D-03:** **Sourcing = curated artifacts, never commit archaeology.** Draft from: `PROJECT.md` "Validated" requirements ledger (per-version feature lists), the v1.2.4 users draft (`.claude/context/2026-07-06_changelog-v1.2.4-users.md`), milestone archives for detail-checking. Git history is used ONLY for release dates. Two filters apply: the register filter (only user-feelable changes survive — v1.2's internal test/refactor work becomes at most "updates install reliably on Safari"-grade bullets) and the Phase 39 D-19 wording pipeline (writer grounded in real sources → factual gate → native-speaker gate → DNA/voice gate).
- **D-04:** **Ben approves ALL entry copy before ship** — the v1.2.4 draft was NEVER reviewed/approved by him; it is source material only. Plan an explicit copy-approval checkpoint (like the Phase 40 welcome-copy and Phase 41 tour-copy approvals) covering the backfill AND the v1.3 entry.

### What's-New popup
- **D-05:** **Teaser + link:** headline ("What's new in version X.Y") + the release's top 2–4 highlights + a primary "See everything new" button into the changelog page + a quiet Close. The page carries the full story; the popup is an announcement, not a reader.
- **D-06:** **Modest centered modal** — standard app modal idiom with a garden touch. The full-screen treatment stays unique to the welcome overlay (its "highest emotional impact" status is preserved).
- **D-07:** **Silent skip when there is no entry for the running version** (pure-internal release): no popup, the last-seen version still updates quietly. The popup only ever fires when the data source has an entry for `APP_VERSION` — users never see a contentless announcement.
- **D-08:** **Highlights are hand-picked per release** — each entry carries an explicit `highlights` field (the author chooses what the popup leads with); the Phase 43 gate can check the field exists.
- **D-09:** **Deliberate dismiss only (welcome-overlay idiom): outside/backdrop clicks do NOTHING.** Close, "See everything new", or Esc dismiss — and each records the version as seen. Rationale: the popup is one-shot; an accidental backdrop click must not eat the announcement (Ben hit exactly this in the sketch). App consistency holds at the right level — everyday recoverable modals keep backdrop-close; one-shot governed surfaces (welcome, this popup) require deliberate dismissal. Sketch 005 was updated to match.

### Register & entry structure (resolves REQUIREMENTS' open emoji question)
- **D-10:** **No emojis in-app.** The changelog page and popup follow the app's calm no-emoji register (26-UI-SPEC copywriting contract); warmth comes from garden tokens and category styling. Ben's emoji-flavored register (🗓️🌿…) stays for WhatsApp/marketing announcements OUTSIDE the app.
- **D-11:** **Entry structure = sketch 005 Variant B — grouped by category** (picked by Ben from the live mockup): per-version heading (version + release date) + one-sentence benefit lede + **New / Improved / Fixed blocks with small colored uppercase category headings**. Empty categories are simply omitted. Start implementation from the sketch's Variant B rendering.
- **D-12:** **The full v1.3 entry is drafted NOW from the locked roadmap/REQUIREMENTS scope** (help center, welcome, tour, changelog). Ben: "I will ship 1.3 (push) only after 43 is done, so it's fine to scope based on the roadmap we have." GATE-04's ship-moment validation (Phase 43) re-checks the entry against what actually shipped before the production push.

### Page placement & entry points
- **D-13:** **The changelog is its own standalone page in the help family** (not a section inside `help.html`) — history grows forever and is version-chronological, structurally unlike help topics; `help.html` stays lean. The help center links to it (a "What's new" card/rail link — exact IA placement Claude's discretion).
- **D-14:** **The "?" popover gains a "What's new" row that opens the changelog PAGE** (the destination link the app.js extension-slot comment anticipated). The popup is never re-triggerable from the menu — announcements stay one-time.
- **D-15:** **Hidden in demo mode** (`window.name === 'demo-mode'`): the "?" What's-new row hides (P41 D-16 tour-entry precedent) and the page is not reachable from the demo iframe. The popup is already impossible there (coordinator fully disabled in demo, P40 D-09).

### i18n (feeds Phase 42.1)
- **D-16:** **EN fallback per entry** — an entry (or part) not yet translated renders in English inside an otherwise-localized page; the history is always complete in every locale and the popup always has content. Matches the help center's planned EN-fallback loader (42.1 scope notes).
- **D-17:** **Per-locale data files, EN canonical** — mirror the `help-content-en.js` precedent: the EN changelog data file is the canonical source; Phase 42.1 adds the HE/DE/CS siblings plus per-locale integrity tests (structure parity with EN, mirroring `tests/39-help-integrity.test.js`). "One structured data source" (CHLG-03) = one logical source; UI-chrome strings (popup buttons, page title, category labels) are normal `data-i18n` keys shipped in all 4 locales in THIS phase per the standing rule.

### Claude's Discretion
- **Footer version link** — Ben explicitly delegated ("You decide") whether the footer's `v1.3.0` line becomes a quiet link to the changelog page. Lean yes as a discoverable-but-silent affordance, but verify it cannot tangle with the integrity ⚠ marker/nudge (independent surface) and respects the demo footer treatment; document the choice.
- **Dismiss/a11y micro-details** beyond D-09 (offered as a discussion area, not selected): focus trap + restore, `aria-modal`, screen-reader announcement — follow the welcome overlay / confirmDialog idioms.
- Data module name and exact entry schema fields (beyond: version, date, lede, categorized bullets, hand-picked `highlights`, and whatever hook Phase 43 needs); `sg.*` storage semantics beyond the established `sg.whatsNewLastSeenVersion` key.
- Exact "?" menu position of the "What's new" row (P40/P41 precedent: appended in the documented slot) and the help-center card/rail placement of the changelog link.
- Multi-version jump handling: popup shows the latest entry (CHLG-03's wording); the page carries everything missed.
- Whether "See everything new" deep-links to the latest version's anchor on the page.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §In-App Changelog (CHLG-01..04) — the four locked requirement contracts; line 8's cross-cutting quality bar (the emoji open question is now resolved by D-10) and line 10's content quality bar (native-speaker agent review for all new user-facing copy).
- `.planning/ROADMAP.md` §Phase 42 — goal, success criteria, dependency notes (keys off `APP_VERSION`, never the SW/integrity layer; must coexist with the footer update nudge without double-signalling).

### The register mockup (THE picked structure — start from it)
- `.planning/sketches/005-changelog-register/index.html` — built and approved in this discuss session. **Variant B (grouped by category) is the picked winner (D-11)**; also contains the What's-New popup teaser preview with the deliberate-dismiss behavior (D-09) and dark-mode chip/heading tinting. Copy inside is PLACEHOLDER (not gate-approved) — structure is what's locked.
- `.planning/sketches/005-changelog-register/README.md` — variants, trade-offs, winner record.

### Prior phase contracts (the surfaces this phase plugs into)
- `.planning/phases/40-first-run-welcome-onboarding-coordinator/40-CONTEXT.md` — coordinator design D-01..D-09 (precedence, one-per-session, demo-off) and D-03 (welcome subsumes the upgrader's first What's-New by writing the last-seen key).
- `assets/attention-coordinator.js` — `PRECEDENCE` already contains `'whats-new'` (slot #2); `WHATS_NEW_LAST_SEEN = 'sg.whatsNewLastSeenVersion'` is already written on welcome dismiss (line ~230); `register({id, eligible(), show()})` is the one-call integration point; `lsGet`/`lsSet` try/catch helpers.
- `assets/version.js` — `window.AppVersion.APP_VERSION` (currently `1.3.0`), the ONLY version key the popup may read; `buildNudge`/integrity layer stays independent.
- `.planning/phases/39-help-center-entry-point/39-CONTEXT.md` — help IA (D-01..D-08), the content-file pattern (D-18), the wording pipeline (D-19) + agent model tiers (D-20), the integrity-test substrate (D-25).
- `assets/help-content-en.js` — the structured-content schema precedent (header comment documents it) the changelog data file mirrors per D-17.
- `assets/app.js` — `initHelpEntry` (~466–565): the "?" popover extension slot; the ~472 comment explicitly anticipates the "What's new" row (D-14).
- `assets/shared-chrome.js` — footer rendering + `maybeUpgradeFooterAndNudge` (the independent update nudge; also where a footer version link (discretion) would land); note the demo footer already strips entry points.

### Backfill content sources (D-03)
- `.claude/context/2026-07-06_changelog-v1.2.4-users.md` — Ben's v1.2.4 EN+HE users draft. **UNAPPROVED source material** — register/content seed only; every derived sentence still passes the gates + Ben's approval (D-04).
- `.planning/PROJECT.md` §Requirements/Validated — the per-version (v1.0/v1.1/v1.2) shipped-feature ledger; primary backfill source.
- `.planning/milestones/` (v1.1-phases/, v1.2-phases/ archives) — detail-checking only.

### Voice, i18n & tests
- `.planning/SessionsGarden-DNA-EN.md` — voice brief for all entry copy and popup strings.
- `.planning/milestones/v1.1-phases/26-in-app-onboarding-overview-help-system/26-UI-SPEC.md` — tokens, type scale, color discipline, copywriting contract (the no-emoji rule D-10 upholds).
- `assets/i18n-en.js` (+ `i18n-he.js`, `i18n-de.js`, `i18n-cs.js`) — 4-locale parity for the popup/page UI-chrome strings shipped this phase (D-17).
- `tests/39-help-integrity.test.js` + `tests/run-all.js` + `.planning/codebase/TESTING.md` — the integrity-test template the changelog data tests mirror; behavior tests BEFORE implementation (project rule).
- Repo gotcha: the new page + data file(s) + any new `assets/*.js` must join `sw.js` `PRECACHE_URLS` (offline requirement); CACHE_NAME auto-rolls via the deploy-stamped INTEGRITY_TOKEN — no manual bump needed (verified 2026-07-08).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`assets/attention-coordinator.js`** — Phase 42 integration is literally one `register({id:'whats-new', …})` call into the pre-reserved slot; the last-seen storage key already exists and is already written by the welcome for upgraders (D-03 there). `eligible()` ≈ `APP_VERSION !== lsGet(WHATS_NEW_LAST_SEEN) && entryExistsFor(APP_VERSION)` — first-run suppression falls out of the welcome's subsume write.
- **Welcome overlay dismiss idiom** (attention-coordinator.js ~200–250) — the deliberate-dismiss pattern (CTA/Esc only, focus trap, scroll lock, no backdrop close) D-09 replicates.
- **`help.html` page shell** — the per-page pattern (one HTML + one `assets/<page>.js`, `SharedChrome` footer/nav, `data-i18n` chrome) the new changelog page copies; `assets/help.js` shows the content-file loader + `{ui:key}` resolution if needed.
- **`assets/help-content-en.js` schema** — the per-locale structured-content precedent for the changelog data file (D-17).
- **"?" popover extension slot** (app.js initHelpEntry) — built for appendable rows; "What's new" is the third planned append (after "Replay welcome" P40, "Take the tour" P41).
- **Sketch 005 CSS** — token-based entry/category/popup styling to port (as sketch 003 was for the tour).

### Established Patterns
- Phase 31 extraction pattern: dedicated IIFE `assets/<module>.js`, four-slot responsibility banner, no new globals unless needed.
- Demo seam: `window.name === 'demo-mode'` checks (D-15).
- CSS logical properties only (RTL-safe), `tokens.css` semantic tokens, `[data-theme="dark"]`, no literal hex, zero npm deps.
- One surface = one `sg.*` flag with try/catch storage reads.
- Behavior tests before implementation; integrity tests join `npm test` via `tests/run-all.js` auto-discovery.

### Integration Points
- `AttentionCoordinator.register()` — the popup's gating (runs on whichever page the session starts, per coordinator D-08).
- `assets/app.js` initHelpEntry — "What's new" row (hidden in demo).
- Help center (`help.html`) — a card/rail link to the changelog page.
- New page + data file(s) → `sw.js` `PRECACHE_URLS` (offline, CHLG-01).
- `assets/shared-chrome.js` footer — the discretionary version-link entry point; the integrity nudge must remain visually/behaviorally independent (no double-signalling with the popup).

</code_context>

<specifics>
## Specific Ideas

- **D-09's origin:** Ben accidentally backdrop-closed the popup preview in the sketch himself — "this is a bit annoying when I accidentally click somewhere and it's just closed." The fix (welcome idiom) came from checking what the real app already does, not from inventing a third behavior.
- **Page framing:** the sketch's page header line — "Every release, in plain language — newest first. Everything always stays on your device." — carries the privacy-reassurance energy of Ben's v1.2.4 draft closing line ("everything stays on your device, and your existing data is untouched"). Keep that register.
- **Per-version lede:** each entry opens with one benefit-led sentence ("This update is all about making the app feel like *your* practice…") before the category blocks — Ben picked Variant B with the ledes rendered, so they're part of the winning shape.
- **v1.0 one-liner tone:** the sketch's "Where it all began — the first seed of Sessions Garden." landed unchallenged; a warm origin marker, not a feature list.

</specifics>

<deferred>
## Deferred Ideas

- **Emoji-flavored release announcements for WhatsApp/marketing** — stays an outside-the-app practice (D-10); the in-app data source could later feed those exports, but that's not a phase deliverable.
- **Release history as a landing-page/demo marketing signal** — surfaced while deciding D-15 (demo hides the changelog). If prospects should see "actively developed," that's a landing-page effort, not an app change.
- **Dismiss semantics & a11y as a discussion area** — offered, not selected; resolved to Claude's discretion within D-09's frame.

### Reviewed Todos (not folded)
- All 25 keyword matches from the todo scan were reviewed — none fold into changelog scope (same list Phases 39–41 reviewed; they remain pending for their own phases). Note: `2026-06-29-project-md-footer-trim-to-oneline.md` matched on the "changelog" keyword but concerns the PROJECT.md planning-doc footer, unrelated to the in-app changelog.

</deferred>

---

*Phase: 42-in-app-changelog-what-s-new*
*Context gathered: 2026-07-09*
