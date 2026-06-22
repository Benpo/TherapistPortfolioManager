# Phase 24: Pre-Launch Final Cleanup — Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Close all remaining items blocking end-user E2E UAT for v1.1. Six bundled items: 1 BLOCKER bug (dropdown spotlight), 1 major UX bug (edit-session Cancel/Revert + clock-icon "Edit" rename), 1 new feature (Emotion-Code text-snippet quick-paste), 1 polish item (markdown `##` heading bug + single-newline rendering decision), 1 major bug (overview clock-icon severity reversal), and 1 new feature (pre-session context card extension). Discussion clarifies HOW to implement what's already scoped — new capabilities belong in other phases (notably Phase 25 backup architectural rework).

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**9 requirements are locked** for Item 3 (snippet quick-paste). See `24-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `24-SPEC.md` before planning or implementing Item 3. Requirements are not duplicated here.

The other 5 Phase 24 items are already specified by their TODO files (see canonical refs below) — they go directly to plan-phase, no SPEC.md required.

**SPEC amendment locked in this discussion (must be reflected in 24-SPEC.md before plan-phase):**
- Req 2 (configurable prefix): changed from "exactly 1 character" to "1 or 2 characters". Two-character prefixes like `::`, `;;`, `??` are explicitly supported to reduce false-trigger risk against natural single-char usage in Hebrew/German prose. SPEC.md edited inline 2026-05-14.

**In scope (from SPEC.md, summarized):**
- Snippet trigger engine (inline detection + word-boundary expansion) for textareas marked `data-snippets="true"`
- User-configurable prefix in Settings (default `;`, 1–2 chars)
- 4-locale per-snippet data shape with fallback chain (`active → en → he → de → cs`)
- Auto-installed seed pack of 60 snippets from Sapir's Emotion Code PDF
- Settings management UI (list view + modal editor)
- Categories / tags (per-snippet metadata + filter UI)
- Inline autocomplete dropdown (≤8 suggestions, keyboard nav, RTL-aware)
- Granular snippet-only JSON import/export with collision detection
- 7 session-form textareas wired via `data-snippets="true"`
- All new UI strings translated across HE/EN/CS/DE
- Additive IndexedDB migration (new `snippets` store + idempotent seed)

**Out of scope (from SPEC.md, summarized):**
- Snippet variables / placeholders (`{clientName}`, `{date}`)
- Snippet expansion in non-session textareas
- Public snippet marketplace / pack-sharing UI
- Re-collapse of expanded text in read-mode
- Custom expansion side-effects (cursor markers, macros)
- Unicode triggers (Hebrew/Cyrillic keywords)

</spec_lock>

<decisions>
## Implementation Decisions

### Item 1 — Dropdown spotlight bug (BLOCKER)

- **D-01:** Single-source-of-truth fix. Extract one `populateSpotlight(clientId)` function used by BOTH entry paths (client-card → New Session AND "Add Session" → dropdown). Most natural home: `assets/add-session.js` as a module-scope function, or `assets/app.js` if a future phase needs cross-page reuse. Planner decides; criterion is "one function, two callers." This is the foundation for Item 6 (pre-session context card extends what `populateSpotlight` shows).

### Item 2 — Edit-session Cancel/Revert UX

- **D-02:** Affordance position — Cancel/Revert lives as a header button in the action area alongside Save / Delete. No new sticky-footer or pencil-toggle pattern.
- **D-03:** Confirm dialog — only triggered when form is dirty. Clean form Cancel → silently return to read mode. Dirty form Cancel → reuse the Phase 21 confirm-card modal pattern with "Discard changes?" prompt. Mirrors the behavior already established by `App.installNavGuard` (`assets/app.js:1052`).
- **D-04:** Button wording — **asymmetric**. Label swaps based on dirty state: "Cancel" when clean / "Discard changes" when dirty.
- **D-05:** **Hebrew gender-neutral convention (memory-locked).** All Hebrew strings in Phase 24 use **noun/infinitive forms**, NOT imperative — same convention as `ערוך → עריכה`, `הורד → הורדה`. Concrete strings to lock during plan-phase:

  | Surface | EN | HE (noun/infinitive) | DE | CS |
  |---|---|---|---|---|
  | Cancel (clean) | Cancel | ביטול | Abbrechen | Zrušit |
  | Discard (dirty) | Discard changes | ביטול השינויים | Änderungen verwerfen | Zahodit změny |
  | Clock-icon button (D-07) | View | הצגה | Anzeigen | Zobrazit |
  | Confirm modal title | Discard changes? | ביטול השינויים? | Änderungen verwerfen? | Zahodit změny? |
  | Confirm — destructive | Yes, discard | כן, לבטל | Ja, verwerfen | Ano, zahodit |
  | Confirm — keep | Keep editing | המשך עריכה | Weiter bearbeiten | Pokračovat |

  Planner / executor may refine exact strings; the rule is non-negotiable noun/infinitive Hebrew.

- **D-06:** Edit-mode lifecycle — Cancel reverts the form to the last-saved state in-place (no navigation, no page reload). Composes cleanly with the existing read-mode default established for past sessions: Save commits → returns to read mode; Cancel reverts → returns to read mode; Delete confirms then navigates.
- **D-07:** Companion fix — overview clock-icon expansion's "Edit" button renamed to "View" + pencil icon. Entering opens read mode; the pencil icon inside the opened session toggles edit. Strengthens the "read mode is the default" story.

### Item 3 — Snippet engine implementation (HOW)

- **D-08:** IDB storage shape — new dedicated `snippets` object store. Schema: `{ id (PK), trigger, expansions: { he, en, cs, de }, tags: string[], origin: 'seed' | 'user', createdAt, updatedAt }`. Indexed on `trigger` (unique, case-insensitive). Bump `DB_VERSION` (Phase 22 ended at v4; v4 → v5 here). Additive migration only — no edits to `clients`, `sessions`, `therapistSettings`. Mirrors Phase 22 D-08 pattern.
- **D-09:** Seed-pack source format — hardcoded `assets/snippets-seed.js` JS module exporting `const SNIPPETS_SEED = [...]`. Migration reads it directly at upgrade time. Zero parse step, version-controlled diff is human-readable, SW precaches it. ~30–50KB.
- **D-10:** Seed-pack identity — each seed snippet gets a deterministic ID derived from its Emotion Code chart coordinate + English slug (e.g., `ec.a1.betrayal`). The migration is idempotent: re-running it does not duplicate; user-deleted seeds stay deleted across re-launches (uses a `deletedSeedIds` set in `therapistSettings` or equivalent — planner picks the cleanest persistence shape).
- **D-11:** Autocomplete popover positioning — fixed-position element anchored to caret coordinates via the **caret-mirror** pattern (Notion-style): clone the textarea's content up to caret into a hidden `<div>` with identical typography + a final `<span>`, then read `span.getBoundingClientRect()`. Popover positions adjacent to that rect. RTL: anchor via `inset-inline-start` / `inset-inline-end` so the popover correctly mirrors in Hebrew textareas. ~50 LOC of vanilla JS, zero new dependencies.
- **D-12:** Modal editor layout (REFINED). Default editor view shows ONLY the **current app language** field — single textarea for that locale + trigger input + tags input. A small "Edit translations" affordance (button or toggle) reveals the other 3 language fields. Single-language therapists (the dominant case) see a minimal editor; multi-language authoring is one click away. Each locale shows a filled/empty indicator dot so the user can see which translations exist. The 4-tab interface I originally proposed is replaced by this progressive-disclosure pattern.
- **D-13:** Trigger-time locale behavior — **SPEC stands**. Active app language wins at trigger time; fallback chain applies (`active → en → he → de → cs`). No per-trigger locale override in v1. Hebrew therapists needing the English version use either of two zero-cost workarounds: (a) switch app language temporarily via the globe icon, or (b) copy-paste from the EN tab in the snippet editor. Per-trigger locale picker (modifier key, flag chips in popover) is **deferred to v2** if usage signal emerges.
- **D-14:** Import collision behavior — collision modal shows per-trigger **Replace / Skip toggle** (not single-Replace-All-or-Skip-All). User sees all colliding triggers and picks per row. Plus a final "Apply" button. Cancel discards the entire import.
- **D-15:** Reset-to-default for modified seed snippets — per-row "Reset to default" button visible in the snippet editor modal ONLY when `origin === 'seed'`. Restores trigger + 4-locale expansions + tags from the seed pack source. Plus a bulk "Reset all modified seeds" button in the Settings UI for batch recovery.
- **D-16:** Settings list search — single search input at the top of the Snippets list. Substring match (case-insensitive) against trigger keyword AND the current-app-language expansion content. Combines with tag-filter chips for narrowing. The list view shows each snippet's current-language preview only (not all 4 langs); 4-lang editing happens in the modal.
- **D-17:** Tag input in editor — chips-style with autocomplete suggestions from existing tags (Gmail-style). Type word + Enter / comma → becomes a removable pill `[grief ×]`. Suggestions dropdown shows matching existing tags as user types. Tags saved as lowercase to prevent drift.
- **D-18:** Cache + cross-tab sync — extend Phase 22 D-09/D-10/D-11 pattern. Add `App.getSnippets()` reading from `App._snippetCache` (eager-loaded in `App.initCommon()`). Cross-tab sync via existing BroadcastChannel `sessions-garden-settings` (extend with a `snippets` event type). No new infrastructure.
- **D-19:** Backup/restore — extend `assets/backup.js` to include the `snippets` store. Restore from pre-v1.1 backups (no snippets store): the v5 migration runs on import-target DB if needed; seed pack populates as if a fresh install.
- **D-20:** Service worker — add `assets/snippets-seed.js`, `assets/snippets.js` (the engine module), `assets/snippets-editor.js` (the Settings UI) to `sw.js` `PRECACHE_URLS`. Pre-commit hook auto-bumps `CACHE_NAME` — don't pre-bump manually.
- **D-21:** Demo-mode parity — per Phase 22 D-23. Snippets store + seed pack are populated identically in `demo_portfolio` as in `sessions_garden`. No demo-specific guards; the separate IDB already isolates side effects.
- **D-22:** Where snippet management lives — new "Text Snippets" section in `settings.html`, alongside the existing section-label-customization section. Same gear-icon entry point. No new page, no new nav slot.

### Item 4 — Markdown polish

- **D-23:** Single-newline rendering — **keep current behavior** (within a paragraph block, single `\n` → `<br>` via `assets/md-render.js:52` `applyInline(block).replace(/\r?\n/g, "<br>")`; blank line = new paragraph). Verified against `assets/md-render.js` 2026-05-14: the codebase currently joins consecutive non-blank lines with `<br>`, NOT space. Earlier parenthetical phrasing ("join with space") was a description error — corrected here. This behavior is locked; no code change for this item. PDF + MD copy + preview pane stay consistent with the existing `<br>` semantics.
- **D-24:** Markdown `##` heading bug fix — deterministic. `assets/md-render.js:38` regex requires no internal newlines; fix the regex / parser order so `## heading\nbody` correctly produces `<h2>heading</h2><p>body</p>` instead of `<p>## heading<br>body</p>`. Affects only the export-preview pane (PDF `parseMarkdown` is already correct). Small (~5 LOC) targeted fix.

### Item 5 — Overview clock-icon severity reversal

- **D-25:** Bug fix in `assets/overview.js`. Currently a 10→2 (improvement) renders as 2→10 (looks like deterioration). Diagnose whether the rendering pulls `before` / `after` in inverted order, or whether the labels are swapped. ~5–10 LOC fix. Verify across all 4 locales (the bug is locale-independent but UAT must confirm).

### Item 6 — Pre-session context card

- **D-26:** Scope strategy — **EXTEND**. The existing client spotlight grows into a unified "context card." Item 1's `populateSpotlight(clientId)` is the renderer for this card. No new sibling UI region.
- **D-27:** Content (v1) — two visually-separated sections inside the card:
  - **Customer data** (existing): photo + name + age + client notes
  - **Session info** (new): last session date, total session count for this client, "Information for Next Session" carried over from the most recent session as a read-only quote
- **D-28:** Visual separator — subtle horizontal divider line + subsection header (e.g., `Recent activity` / `פעילות אחרונה` / `Letzte Aktivität` / `Poslední aktivita`). RTL-safe via logical CSS props.
- **D-29:** Display mode — **collapsed by default** with a clear title/header + tap-to-expand button. Reuse the existing `<details class="expandable-field">` pattern from Phase 22 (RTL-safe, accessible, consistent with the editable session sections).
- **D-30:** Empty state (first session for new client, `sessionsByClient.length === 0`) — hide the entire Session-info subsection. Card still renders the Customer data section. No empty-state UI strings to translate.
- **D-31:** Read-only quote of `customerSummary` — the "Information for Next Session" value is displayed as a read-only block-quote-like element. To edit it, the therapist scrolls to the current session's Information for Next Session field. No edit-in-place from the card; no copy-to-clipboard button in v1.
- **D-32:** OUT OF SCOPE (defer to v1.2 or later signal): open issues list, severity trend visualization (text-only or sparkline). These were the BIGGER vision in the TODO; v1 stays focused.

### Phase-wide

- **D-33:** Cache and i18n strategy — all new UI strings (Items 2 + 3 + 6) added to `i18n-en.js`, `i18n-de.js`, `i18n-he.js`, `i18n-cs.js`. Hebrew strings follow the noun/infinitive convention (D-05). Strings reused across items where semantically identical (e.g., the "Cancel" / "Discard changes" pair may share keys with the existing nav-guard confirm modal).
- **D-34:** SW precache + cache version — pre-commit hook auto-bumps `sw.js` `CACHE_NAME` on every asset commit. Plans MUST NOT pre-bump or bypass with `--no-verify`. New assets (`snippets.js`, `snippets-seed.js`, `snippets-editor.js`, any new CSS) get added to `PRECACHE_URLS`.
- **D-35:** Backup compatibility — `assets/backup.js` extends naturally with the new `snippets` store. Pre-v1.1 backups (missing snippets store) restore cleanly: the v5 migration runs on the target DB if needed.

### Claude's Discretion

- Exact CSS class names + design tokens for the snippet UI (popover shadow, modal layout details, tag-chip styling) — covered by existing app.css conventions.
- Snippets module file split: `assets/snippets.js` (engine) vs `assets/snippets-editor.js` (Settings UI) vs single file — planner picks.
- Trigger-detection event mechanism (input event on textarea / selectionchange / MutationObserver) — Notion-style caret-mirror typically uses `input` + `selectionchange` events.
- Snippets store soft-delete vs hard-delete — likely hard-delete for user-added; for seeds, track in a `deletedSeedIds` set so re-launch doesn't restore them.
- Tag canonicalization rules (lowercase-on-save, trim, dedupe within a snippet).
- Empty state for snippet Settings list (when zero snippets exist — only happens if user has manually deleted all 60 seeds). Probably a friendly empty-state with "Add snippet" CTA + "Reset all to defaults" CTA.
- Default tags applied to seed snippets — recommend two tags per seed: one for EC chart cell (`ec.a1` ... `ec.b6`) and one for organ/meridian group (`heart-small-intestine`, `spleen-stomach`, etc.) so therapists can filter both ways.
- Item 5 (severity reversal) verification approach — likely a targeted regression test fixture.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked requirements (read FIRST)
- `.planning/phases/24-pre-launch-final-cleanup/24-SPEC.md` — Locked requirements (9 reqs + 12 acceptance criteria) for Item 3 only. SPEC was amended 2026-05-14 during discuss-phase: Req 2 now allows 1–2 character prefixes.

### Source TODOs (specifications for Items 1, 2, 4, 5, 6)
- `.planning/todos/pending/2026-05-13-add-session-dropdown-spotlight-bug.md` — Item 1 (BLOCKER)
- `.planning/todos/pending/2026-05-13-edit-session-cancel-revert-toggle.md` — Item 2 (major UX + companion clock-icon rename)
- `.planning/todos/pending/2026-05-07_emotions-quick-paste.md` — Item 3 (feature; supplemented by SPEC.md above)
- `.planning/todos/pending/2026-05-07_emotions-quick-paste - Sapir's feedback - Text to include.pdf` — Item 3 seed-pack source (60 Emotion Code emotions × 4-locale title + meaning paragraphs)
- `.planning/todos/pending/2026-05-13-overview-clock-icon-severity-reversal.md` — Item 5 (major bug, ~5–10 LOC fix in `assets/overview.js`)
- `.planning/todos/pending/2026-04-26-pre-session-context-card.md` — Item 6 (feature; v1 scope narrowed in this discussion)

### Project-level constraints
- `.planning/PROJECT.md` — vanilla JS / zero-dep / IndexedDB / 4-lang i18n / RTL / one-time sale / local-only
- `.planning/REQUIREMENTS.md` — v1.1 requirements + out-of-scope rules
- `.planning/codebase/CONVENTIONS.md` — App namespace, IIFE module pattern, kebab-case files, dot-notation i18n keys, logical CSS properties
- `.planning/codebase/STRUCTURE.md` — file structure for new app pages, where to add new code, IDB schema
- `.planning/codebase/STACK.md` — IndexedDB schema location, no build process, browser compatibility

### Prior-phase canonical context (closest precedents to reuse)
- `.planning/phases/22-session-workflow-loop-pre-session-context-card-editable-sess/22-CONTEXT.md` — therapistSettings IDB store pattern (D-08), `App.getSectionLabel` + `_sectionLabelCache` (D-09/D-10), BroadcastChannel cross-tab sync (D-11), shared-chrome gear icon → Settings (D-13), modal pattern reuse from Phase 21, demo-mode parity (D-23), Phase 22 D-21 amendment (edit-mode renders disabled-but-populated sections as fully editable inputs with badge)
- `.planning/phases/22-.../22-SPEC.md` — Phase 22 locked requirements (precedent for SPEC.md → CONTEXT.md handoff)
- `.planning/phases/23-pdf-export-rewrite-hebrew-rtl-and-layout/23-CONTEXT.md` — bidi reordering, RTL handling, jsPDF integration
- `.planning/phases/21-comprehensive-mobile-responsiveness-audit-and-fix-all-app-screens-for-iphone-mobile-viewport/21-CONTEXT.md` (if exists) — modal pattern, z-index scale, 44×44px tap target rule

### Files Phase 24 will modify
- `assets/db.js` — bump `DB_VERSION` v4 → v5; add `snippets` object store; idempotent seed-pack migration reading from `assets/snippets-seed.js`
- `assets/app.js` — extend with `App.getSnippets()`, snippet cache in `App.initCommon()`, BroadcastChannel listener for `snippets` event type; possibly host `populateSpotlight()` if cross-page reuse is needed (D-01)
- `assets/add-session.js` — `populateSpotlight(clientId)` single-source-of-truth fix (D-01); 7 textareas marked `data-snippets="true"`; Cancel/Revert header button + dirty-state listener; pre-session context card render path (D-26 to D-32)
- `add-session.html` — Cancel/Revert button markup in action header; 7 textareas get `data-snippets="true"` attribute; context-card markup with two sections + collapsible
- `assets/settings.js` — new "Text Snippets" section: list view + search input + tag filter chips + add/edit/delete + modal editor with single-lang default + "Edit translations" reveal + import/export
- `settings.html` — markup for the new section
- `assets/overview.js` — Item 5 severity reversal fix (before/after rendering order); D-07 clock-icon button rename "Edit" → "View"
- `assets/md-render.js:38` — `##` heading regex bug fix (D-24)
- `assets/backup.js` — include `snippets` store in backup/restore; backward-compat with pre-v1.1 backups (D-19)
- `assets/shared-chrome.js` — no changes (gear icon already wired in Phase 22 D-13)
- `assets/i18n-en.js`, `i18n-de.js`, `i18n-he.js`, `i18n-cs.js` — new keys for Items 2 + 3 + 6 (Cancel/Discard buttons, confirm modal, snippets Settings UI, snippet editor modal, autocomplete popover, context-card section headers); Hebrew strings use noun/infinitive forms (D-05)
- `sw.js` — `PRECACHE_URLS` extended with new asset files. Pre-commit hook auto-bumps `CACHE_NAME` (D-34).
- `assets/app.css` — new styles for: snippet editor modal, autocomplete popover, tag chips, snippets Settings list + search, Cancel/Revert button states, context-card visual separator + collapsed/expanded states

### New files Phase 24 will create
- `assets/snippets-seed.js` — exports `SNIPPETS_SEED` array (60 emotion snippets from Sapir's PDF, 4-locale)
- `assets/snippets.js` — trigger detection engine + caret-mirror popover + expansion + locale fallback (D-11, D-13)
- `assets/snippets-editor.js` — Settings UI logic for snippets (CRUD, search, tags, import/export) — may merge into `assets/settings.js`; planner decides

### Hebrew copy convention (memory-locked)
- All Hebrew strings use **noun/infinitive forms** (gender-neutral) — never imperative. Examples: `איפוס`, `סיום`, `הורדה`, `שיתוף`, `עריכה`, `בחירה`, `ביטול`, `הצגה`. This is a project-wide rule, not Phase 24-specific.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`window.App` namespace** (`assets/app.js`) — extend with `App.getSnippets()`, snippet cache + eager-load in `App.initCommon()`. Identical pattern to Phase 22 D-09/D-10 `App.getSectionLabel` + `_sectionLabelCache`. Plus `App.installNavGuard` (`app.js:1052`) is the closest precedent for Cancel/Revert confirm UX — complementary case (revert in-place vs guard against navigate-away).
- **`window.PortfolioDB` namespace** (`assets/db.js`) — extend with `getAllSnippets()`, `getSnippet(id)`, `addSnippet()`, `updateSnippet()`, `deleteSnippet()`, `resetSeedSnippet(id)`. Mirrors Phase 22 D-08 `therapistSettings` CRUD shape.
- **BroadcastChannel `sessions-garden-settings`** (Phase 22 D-11) — already exists for therapistSettings cross-tab sync. Extend with a `snippets` event type for cross-tab snippet refresh.
- **Modal architecture (Phase 21)** — `max-height: 90vh`, scroll body, pinned action bar, body-scroll lock, overlay-close-with-discard-confirm, `--z-modal: 300`. Apply to the snippet editor modal and the Cancel/Revert confirm modal.
- **`<details class="expandable-field">` pattern** (Phase 22) — used in `add-session.html` for collapsible sections. Reuse for the pre-session context card's collapse/expand affordance (D-29) and possibly for the "Edit translations" reveal in the snippet editor (D-12).
- **`<input type="date">`, `44×44px` tap targets, `--z-toast: 400`** — established Phase 21/22 mobile rules; apply to new Settings UI and modals.
- **`assets/md-render.js`** — the tiny regex Markdown parser added in Phase 22-05. Item 4 (D-24) is a targeted bug fix here.
- **`assets/pdf-export.js`** — Phase 23-rewrite. Confirm Item 4's single-newline decision (D-23) doesn't regress PDF rendering.

### Established Patterns
- **IIFE module returning public API** — every JS file follows this. New `snippets.js` and `snippets-editor.js` follow suit.
- **`data-i18n` attributes** — set translation keys in HTML, `App.applyTranslations(root)` re-renders. Used everywhere; new markup uses it.
- **`async/await` for IndexedDB** — `await PortfolioDB.getAllClients()` style. New snippet CRUD follows.
- **CSS logical properties** (`inline-start`, `inline-end`, `border-block-start`) — RTL-safe; required for all new CSS in Phase 24.
- **Per-language i18n files** (`i18n-en.js`, `i18n-de.js`, `i18n-he.js`, `i18n-cs.js`) — add new keys to all 4. Phase 14 established this split.
- **Pre-commit hook auto-bumps `sw.js` `CACHE_NAME`** — don't pre-bump manually.
- **Hebrew copy convention** — noun/infinitive forms (gender-neutral). Project-wide rule.
- **Demo-mode parity** (Phase 22 D-23) — no demo guards in new code.

### Integration Points
- **`App.initCommon()`** — extend with eager IDB read for `snippets`. Currently bootstraps language + section labels; new logic is additive.
- **`add-session.html` form sections** — already wrapped with `data-section-key` (Phase 22 D-21). Adding `data-snippets="true"` to the 7 target textareas is a one-line each change.
- **`backup.js` manifest** — already enumerates IDB stores. Add `snippets` to the export/import list. Restore handler must accept pre-v1.1 backups (no snippets store).
- **`shared-chrome.js` gear icon** — already routes to `settings.html` (Phase 22 D-13). The new "Text Snippets" section lives inside the existing Settings page.

</code_context>

<specifics>
## Specific Ideas

- **Sapir's PDF as seed-pack source** — 60 emotions across the standard Emotion Code chart (12 cells × 5 emotions). Sapir has already curated the content: "Edited for consistent plural Hebrew, simplified Hebrew/English wording, examples removed, and Czech/German meanings added." Treat this as v1 source-of-truth; the seed-pack import format must preserve all 4 locales and the chart-cell tags.
- **Raycast-style mental model** — Ben corrected the initial misread (picker UI) during spec-phase Round 0. The feature is inline text expansion (`;heart` + space → expansion), not a click-to-paste picker. This framing should propagate to plan-phase and executor.
- **Multi-character prefix supports `::heart` style** — the SPEC was amended 2026-05-14 to allow 1–2 char prefixes specifically to prevent false triggers in Hebrew (`12:30 הגעתי`) and German (`Sektion: 4.2 Sicherheit`) prose.
- **Hebrew noun/infinitive memory** — explicitly raised by Ben during Area 2 (Cancel/Revert wording). This is a memory-pinned project-wide rule; all new Hebrew strings in Phase 24 (and beyond) MUST conform. Concrete strings for Item 2 documented in D-05.
- **Single-language editor as the default** — Ben's mid-Area-4 refinement. The common case (Hebrew-only therapist) should see a minimal one-textarea editor. Multi-lang editing is one click behind an "Edit translations" affordance. This is BETTER than the 4-tabs-preselected approach I originally proposed and supersedes that decision.
- **Item 6 v1 scope narrowed** — Ben explicitly skipped open issues + severity trend from the original TODO vision. v1 ships only date + count + last-`customerSummary` quote. The bigger vision parks for v1.2.

</specifics>

<deferred>
## Deferred Ideas

(All items below either came up during discussion or were carried forward from SPEC.md out-of-scope. They are not implemented in this phase.)

### Future phases / signal-driven
- **Per-trigger locale picker at insertion time** (modifier key / flag-chip popover per autocomplete row) — defer to v2 if Hebrew/multi-lang therapists request it.
- **Open issues list + severity trend** in the pre-session context card — original Item 6 vision; v1.2 candidate.
- **SVG sparkline severity viz** — discussed in Area 3; deferred along with open-issues.
- **Snippet variables / placeholders** (`{clientName}`, `{date}`, `{session.number}`) — explicit SPEC out-of-scope; v2 if signal emerges.
- **Snippet expansion in non-session textareas** (client form notes, settings inputs, export editor) — opt-in attribute makes this a one-line change later.
- **Public snippet marketplace / shared packs / pack import URLs** — local-only JSON file import is the v1 ceiling.
- **Snippet expansion macros / cursor-position markers / chained expansions** — TextExpander-class feature creep; reassess after v1 usage data.
- **Unicode triggers** (Hebrew or Cyrillic snippet keywords) — Latin slug only in v1; keyboard-layout switching makes Latin universal.
- **Single-newline → per-line-break markdown rendering** — locked at "keep as-is" for v1; reconsider only if user signal emerges.
- **Search box with virtual scrolling** in the snippets Settings list — flat search sufficient at v1 sizes.
- **"View / Edit" combo button** on the overview clock-icon expansion — D-07 went with plain "View"; the combo phrasing was an alternative.
- **Sticky-footer Cancel/Revert layout** — D-02 went with header; sticky footer was a discarded alternative.

### Explicitly out of Phase 24 (parked elsewhere)
- **"Send to myself" no-attachment bug + 3-button overview backup consolidation** — Phase 25 (own discuss-phase).
- **Scheduled backup reminders + auto-backup setting** — `.planning/todos/pending/2026-03-12-add-scheduled-backup-reminder-and-auto-backup-setting.md`.
- **v12 full IndexedDB encryption** — own large phase, deferred.
- **Drag-and-drop sorting of section categories in Settings** — `2026-05-13-drag-sort-settings-categories.md`.
- **Modality templates / starter packs** — `2026-05-13-modality-templates.md`; explicitly LOWER priority per Ben 2026-05-13.
- **Session-to-document email export** — `2026-04-26-session-to-document-email-export.md`.
- **Photo crop bug from session screen** — `2026-03-18-photo-crop-reposition.md`.
- **PWA install guidance + user manual** — `2026-03-24-pwa-install-guidance-and-user-manual.md`.
- **Deactivation data-loss warning** — `2026-03-24-deactivation-data-loss-warning.md`.
- **Terms acceptance business notification (webhook to n8n)** — `2026-03-24-terms-acceptance-business-notification.md`.
- **Legal compliance remaining fixes** — `2026-03-25-legal-compliance-remaining-fixes.md`.

### Reviewed Todos (not folded)
None for this phase. All 6 in-scope TODOs were folded directly into Phase 24 items (1 → Item 1, 2 → Item 2, emotions-quick-paste → Item 3 + SPEC.md, severity-reversal → Item 5, pre-session-context-card → Item 6). The polish Item 4 had no separate TODO — it was an inline note in the ROADMAP Phase 24 entry.

</deferred>

---

*Phase: 24-pre-launch-final-cleanup*
*Context gathered: 2026-05-14*
*Next step: `/gsd-plan-phase 24` — generates the executable plans from SPEC.md + this CONTEXT.md.*
