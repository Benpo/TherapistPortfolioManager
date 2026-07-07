# Phase 39: Help Center & "?" Entry Point - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the persistent "?" header entry (popover menu) on every app page, the standalone offline `help.html` help center (hybrid card+rail IA along the 7-step workflow spine), full EN help content covering every current-app feature (Phase 32 topic tree + post-inventory delta), empty-state coaching deep-links on the first-run trio, per-browser (computer-focused) PWA install instructions, simple in-page help search, and an anti-rot content substrate (live-label interpolation + covers metadata + static integrity test).

**Not this phase:** welcome overlay & first-run coordinator (Phase 40), guided tour (Phase 41), changelog page & What's-New popup (Phase 42 — but the help IA must leave room for a changelog section), the blocking docs-maintenance gate itself (Phase 43 — this phase only ships the machine-checkable substrate it will enforce against), DE/CS/HE help translation (deferred until EN stabilizes).

</domain>

<decisions>
## Implementation Decisions

### Help-page layout (IA)
- **D-01:** **Hybrid A+C layout**, validated in a purpose-built mockup (`.planning/sketches/002-help-page-ia/hybrid.html`, approved by Ben this session — planner/UI phase MUST start from it): C's collapsed cards + featured personalization card, combined with A's sticky rail menu. Clicking a rail item scrolls to AND expands the matching card.
- **D-02:** **Multiple cards stay open** — opening a card never auto-collapses another.
- **D-03:** **Rail = top-level sections only, UNNUMBERED** (not all sections are sequenced), grouped "The session loop" / "The technical bits" with a divider. Each rail item has a chevron that expands its sub-topics **in-rail** without jumping; clicking a sub-topic expands the owning card and jumps to the topic anchor. Scroll-spy highlights the active section.
- **D-04:** **Featured personalization card** ("Making Sessions Garden yours") — raised primary-border card with "Start here" tag, open by default at the top (P26 D-04 flagship placement).
- **D-05:** **Soft type for help surfaces** — Rubik 400 headings (deep garden green `--color-primary-deeper`), muted body ink, roomier cards, botanical watering-can accent in the page header. This is a deliberate owner-approved amendment of the 26-UI-SPEC bold-heading rule, **help surfaces only**; zero new font files (uses existing Rubik-Regular.woff2).
- **D-06:** **Simple search folded in** (owner-approved extension of HELP-02): client-side substring live-filter over card titles/topic headings/body text (~40 lines vanilla JS, offline, zero deps). Filtering hides non-matching cards AND rail items; empty rail groups hide their group label + divider. **No-match state shows a calm "write to us" contact fallback** — never a dead end. Fuzzy/typo-tolerant search explicitly deferred.
- **D-07:** **"Still need help?" closing band**: real-person reassurance + `contact@sessionsgarden.app` mailto button + hint to the existing Report-a-problem flow in Settings ("nothing is ever sent automatically").
- **D-08:** **Mobile treatment**: rail hidden on small screens; sticky search box + collapsible "Jump to a section" dropdown pinned at top; cards behave identically to desktop.

### "?" entry point
- **D-09:** **Popover menu from day one** (not direct navigation). Reuse the existing globe language-switcher popover pattern (Phase 14/20) for consistency, RTL safety, and dismiss behavior. Phases 40–42 append their entries (Replay welcome / Take tour / What's new) to this menu — build it so entries are addable.
- **D-10:** **Day-one menu items:** "Help center" (→ `help.html`) + "Contact us" (→ mailto `contact@sessionsgarden.app`, same address as the help-page band).
- **D-11:** **Help center always opens at the top** — no per-page context-aware landing. Context-targeting is reserved for empty-state deep-links where intent is unambiguous. No page→anchor map to maintain.
- **D-12:** Icon placement/behavior per HELP-01 (locked upstream): in `#headerActions` beside cloud + gear, 36×36 visual / 44×44 tap target, inline SVG, `.is-active` mirrors `.settings-gear-btn`, RTL auto-flip. Sketch 004's sanity check confirmed the header icon over a floating button.

### Content depth, visuals & audience
- **D-13:** **Priority-scaled depth** (inventory P-tags drive effort): P1 = detailed and **stupid-proof** (full numbered steps, no assumed knowledge); P2 = also detailed but lighter; P3 = nice-to-have, minimal effort.
- **D-14:** **SVG glyphs only, NO screenshots** — inline SVG for browser-chrome elements users must find (install icons, menus), botanical art for warmth. Locale-neutral, dark-aware, immune to app-UI drift.
- **D-15:** **SCOPE AMENDMENT to HELP-06: mobile (iOS/Android) is NOT officially supported.** Install instructions target **computers only** — Chrome/Edge (address-bar install icon) + macOS Safari (Add to Dock). The app is local-only; the assumption is practitioners work on a computer. Original HELP-06 wording naming iOS Safari/Android is superseded.
- **D-16:** **One brief expectation-setting mobile topic**: Sessions Garden is designed for computers; it opens in a phone browser, but data lives per-device (no sync), so work on your computer. Prevents "where is my data on my phone?" confusion without promising support.
- **D-17:** **EN content targets a global audience including native US speakers** — natural, native-quality English in the app's calm voice. (Not "simple English for non-natives" — Ben corrected this explicitly.)

### Content home & wording pipeline
- **D-18:** **Help copy lives in a dedicated `assets/help-content-en.js`** — structured topic objects (id, section, title, body, priority, covers), loaded ONLY by `help.html`. Global i18n files keep only UI-chrome strings (menu labels, search placeholder, empty-state coaching strings). Future translation = add `help-content-de.js` etc.
- **D-19:** **Wording pipeline (locked):**
  1. **Writer agent** drafts each topic grounded in real source — reads the files mapped in the Phase 32 inventory; every P1/P2 step quotes the app's actual on-screen labels (no invented UI names).
  2. **Gate A — factual verifier:** walks every claim/step against the live app; a wrong instruction is a blocker.
  3. **Gate B — native-speaker review:** natural, native-quality English for the global audience.
  4. **Gate C — App-DNA & consistency:** terminology matches the real UI everywhere (Session Format, Heart-Wall, client/session — never patient/treatment); voice matches the Sessions Garden DNA brief + UI-SPEC tone contract + existing app-string corpus; same word for the same thing across all ~40 topics.
  5. **Sapir reviews the rendered `help.html`** locally in a browser (sees exactly what practitioners see); fixes land before ship.
  6. **Ben arbitrates** wording disputes.
- **D-20:** **Agent model tiers:** language-facing agents (Gates B and C) run at **Sonnet level**. Writer + Gate A factual verifier stay at the default tier (grounding against real code is where quality slips hurt most).

### Empty-state coaching
- **D-21:** **First-run journey trio** gets coaching + deep-links, in spine order: Overview no-clients (→ "Adding a client"), Sessions no-sessions-at-all (→ "Starting a session"), Reporting no-data (→ "Reading your dashboard"). Filter-empties ("no matches") stay as-is; snippets/photos empties skipped (optional features, coaching feels pushy). Planner note: the current `sessions.empty` string is a filter-empty — a true no-sessions-at-all state may need to be distinguished.
- **D-22:** **Link treatment = sentence + secondary button**: keep the calm empty-state sentence, add a soft secondary (non-accent) "Show me how" button below it → opens `help.html` with the matching card auto-expanded. Chosen from a visual demo of both treatments.

### Anti-rot substrate (Ben's guardrail concept)
- **D-23:** **Live-label interpolation**: help text quotes UI labels by key — `{ui:settings.tab.backups}` renders the label's CURRENT live value. Quoted labels can never drift, by construction. Bonus: a Hebrew-UI user reading EN help sees the actual (Hebrew) button names she sees on screen.
- **D-24:** **Per-topic `covers` metadata**: each topic object lists the files/pages it documents (seeded from the Phase 32 inventory's feature-mapping column). This is the hook the Phase 43 gate diffs against ("you touched `backup.js` → these topics claim to cover it → update or explicitly waive").
- **D-25:** **Static integrity test ships in this phase** (joins `npm test`): every `{ui:key}` token resolves to a real i18n key; every deep-link anchor (empty-state buttons, "?" popover items) resolves to an existing topic id. Boundary: the BLOCKING gate (hook/CI/DoD) is Phase 43's job — Phase 39 only ships the substrate + test.

### Claude's Discretion
- "?" icon order within `#headerActions` and Help's position in `renderNav()` (likely last).
- `.is-active` behavior while the popover is open.
- Exact `help-content-en.js` topic-object schema (fields beyond id/section/title/body/priority/covers).
- Rail/card animation details, scroll-spy thresholds, search debounce (if any).
- Which desktop-Safari install nuances to include (Add to Dock availability by version).
- How the trio's true-empty vs filter-empty detection is implemented.

### Folded Todos
1. **`.planning/todos/pending/2026-03-24-pwa-install-guidance-and-user-manual.md`** — per-browser install guidance, offline explainer, 2-device limit, transfer, troubleshooting. Fully absorbed by HELP-04/HELP-06 content scope (computer-focused per D-15). Closes at v1.3 ship.
2. **`.planning/todos/pending/2026-05-15-in-app-onboarding-overview-help.md`** — the origin todo of the whole help system. Phase 39 delivers its help-center slice; Phases 40–41 deliver welcome/tour. Closes at v1.3 ship.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract & seed (Phase 26, archived)
- `.planning/milestones/v1.1-phases/26-in-app-onboarding-overview-help-system/26-UI-SPEC.md` — approved visual/interaction contract: tokens, 4-role type scale, color discipline, copywriting contract (noun headings, no emojis, i18n keys), interaction contract. Amended by D-05 (soft type on help surfaces) and D-15 (computer-only install).
- `.planning/milestones/v1.1-phases/26-in-app-onboarding-overview-help-system/26-CONTEXT.md` — the 15 P26 decisions (D-01..D-15) this phase implements the help-center slice of.
- `.planning/milestones/v1.2-phases/32-readme-code-comments/32-HELP-CONTENT-INVENTORY.md` — the grounded ~40-leaf topic tree with per-leaf feature mapping, format, and P1/P2/P3 priority. THE content checklist for HELP-04; also seeds D-24 covers metadata. Post-inventory delta (session formats incl. custom, date-format personalization, filters/sorting, next-session date, report-a-problem, updates) comes from HELP-04's wording in `.planning/REQUIREMENTS.md`.

### Approved layout mockup (built + approved this session)
- `.planning/sketches/002-help-page-ia/hybrid.html` — the approved hybrid A+C page: rail behavior, in-rail expansion, card expand/collapse, soft type, search + no-match fallback, contact band, mobile jump-strip, deep-link auto-expand. Start implementation from this file's behavior, not from the A/B/C variants in `index.html`.
- `.planning/sketches/002-help-page-ia/README.md` — the original A/B/C exploration rationale.
- `.planning/sketches/004-help-entry-point/README.md` — entry-point sanity check confirming the header "?" over a floating button.

### Voice & wording
- `.planning/SessionsGarden-DNA-EN.md` — canonical product-DNA / voice brief (EN). Gate C's primary reference. Committed this session (834e617).
- `.planning/SessionsGarden-DNA-HE.md` — Hebrew original of the same brief.
- `assets/i18n-en.js` — the live app-string corpus: source of quoted labels (D-19.1), interpolation keys (D-23), and terminology consistency (Gate C).

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §Help Center (HELP-01..07) — note D-15 amends HELP-06 (computer-only install).
- `.planning/ROADMAP.md` §Phase 39 — goal, success criteria, dependencies for Phases 40–42 that hang off this phase's "?" menu and help IA.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Globe language-switcher popover** (Phase 14/20 pattern in `assets/app.js`) — the "?" popover reuses this pattern (positioning, dismiss, RTL) per D-09.
- **`#headerActions` + `initSettingsGear`/cloud mount pattern** (`assets/app.js` ~180/203/392/490) — the "?" button mirrors the gear mount: 44×44 target, `.is-active`, inline SVG.
- **`renderNav()`** (`assets/app.js:137`) — Help nav entry hangs here (`data-nav` active marking).
- **`SharedChrome`** (`assets/shared-chrome.js`) — footer + nav-context for the new `help.html`.
- **Garden design system** — `assets/tokens.css` semantic tokens, `assets/illustrations/watering-can.png` (header accent per D-05), existing `Rubik-Regular/Bold.woff2`.
- **`tests/run-all.js` auto-discovery** — the D-25 integrity test joins the existing zero-dep runner (fs+vm pattern like the Phase 33 i18n gate).

### Established Patterns
- Per-page pattern: one HTML file + one `assets/<page>.js` module; `data-i18n` keys resolved by `assets/i18n.js`; 4-locale parity for UI-chrome strings (help BODY content is EN-only in `help-content-en.js` per D-18).
- CSS logical properties only (RTL), `[data-theme="dark"]` tokens, no literal hex (UI-SPEC).
- `sw.js` `PRECACHE_URLS` must gain `help.html` + `help-content-en.js` + any new assets (HELP-07); pre-commit hook bumps CACHE_NAME but **PRECACHE_URLS edits need the manual chore follow-up** (known repo gotcha).
- Hebrew noun/infinitive forms for the (few) new UI-chrome i18n strings (Phase 24 D-05).

### Integration Points
- Header: "?" popover button into `#headerActions` on every SW-registered app page.
- Nav: Help entry in `renderNav()`.
- Empty states: coaching + "Show me how" secondary button in `index.html` (overview), `sessions.html`, `reporting.html` render paths.
- Offline: `sw.js` precache + static test + real offline-navigation verification (HELP-07); field-verify on a real installed PWA (Safari stale-SW gotchas are a known failure mode).

</code_context>

<specifics>
## Specific Ideas

- The help page should feel **calmer than the rest of the app** — a stressed user lands here; soft type, muted ink, generous spacing, botanical warmth are deliberate de-escalation (Ben: "take them down a notch").
- Search's no-match state doubles as the support funnel: "Nothing here matches X — we're happy to help directly, write to us." Never a dead end.
- Contact band tone: "a real person reads every message"; report-a-problem hint reassures "nothing is ever sent automatically".
- Steps must read stupid-proof at P1: quote exact on-screen labels via `{ui:key}` interpolation so instructions always match what the user sees — including a Hebrew UI under EN help text.
- The mockup exposed that the sketch theme never loaded real Rubik — implementation must verify type against the real font files, not system fallbacks.

</specifics>

<deferred>
## Deferred Ideas

- **Fuzzy/typo-tolerant help search** (index + scoring) — simple substring filter ships in P39; revisit only if search misses become a real complaint.
- **Context-aware "?" landing** (page → topic mapping) — rejected for P39 (D-11); could be revisited after Phase 43's gate could police the mapping.
- **HDEP-01 troubleshooting decision tree** — already a tracked v1.4+ requirement candidate in REQUIREMENTS.md, beyond the plain troubleshooting topics shipping in HELP-04.
- **Mobile (iOS/Android) install support/instructions** — excluded per D-15; revisit only if mobile becomes an officially supported platform.

### Reviewed Todos (not folded)
- The other 21 keyword matches from the todo scan (landing translations, drag-sort settings categories, modality templates, export-modal resize, etc.) were reviewed and are unrelated to help-center scope — they remain pending for their own phases.

</deferred>

---

*Phase: 39-help-center-entry-point*
*Context gathered: 2026-07-07*
