# Phase 22: Session Workflow Loop — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `22-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 22-session-workflow-loop-pre-session-context-card-editable-sess
**Areas discussed:** PDF generation strategy, Therapist-settings storage + label resolution, Settings page entry point + nav, Export dialog flow architecture

---

## Area selection

| Option | Description | Selected |
|--------|-------------|----------|
| PDF generation strategy | jsPDF vs print stylesheet vs html2pdf vs pdfmake — only spec-flagged deferred decision | ✓ |
| Therapist-settings storage + label resolution | IDB store vs localStorage; where the override-aware label fn lives | ✓ |
| Settings page entry point + nav | Header gear vs nav item vs footer vs profile dropdown | ✓ |
| Export dialog flow architecture | Single modal 3-steps vs separate modals vs split-pane | ✓ |

---

## Area 1 — PDF generation strategy

### Q1: Which PDF generation approach for the export?

| Option | Description | Selected |
|--------|-------------|----------|
| jsPDF vendored | ~50KB MIT, programmatic, Hebrew via unicode font addon, mirrors jszip precedent | ✓ |
| Print stylesheet → window.print() | Zero dep, OS-driven, but no programmatic file (breaks Web Share + automatic download) | |
| html2pdf.js (canvas-based) | DOM → canvas → PDF (~250KB+), raster-based, faithful HTML | |
| pdfmake | Declarative JSON → PDF (~280KB+), heaviest option | |

**User's choice:** jsPDF vendored
**Notes:** Recommended option. Matches the existing "vendor a small lib" precedent (jszip). Hebrew/RTL needs additional font work — covered by Q2.

### Q2: How should jsPDF handle Hebrew (and German umlauts/Czech diacritics) text?

| Option | Description | Selected |
|--------|-------------|----------|
| Embed Noto Sans + Noto Sans Hebrew | ~150-200KB subset, full Hebrew RTL via R2L flag, single font family across 4 langs | ✓ |
| Embed Hebrew font only when lang=he | Conditional load, smaller default bundle, but cross-language docs miss Hebrew | |
| jsPDF default + fall back to Markdown for Hebrew | Latin-only PDF, smallest bundle, but degrades headline feature for Sapir | |
| Bundle a single Unicode font (DejaVu / Noto) | One font for Latin + Hebrew (~250-400KB), simpler but bigger | |

**User's choice:** Embed Noto Sans + Noto Sans Hebrew
**Notes:** Recommended. Self-contained, no Google Fonts CDN dependency.

### Q3: How should the jsPDF library and fonts be loaded?

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy-load on first export | Dynamic <script> append on Export click, SW caches after first fetch | ✓ |
| Precache + load on every page | Always ready, but every page load fetches them | |
| Build a 'pdf-export.js' module | Encapsulate jsPDF in one module loaded only by add-session.html | |

**User's choice:** Lazy-load on first export — but PWA must keep working
**Notes:** User accepted recommendation with constraint: "i am fine with recommended approach, but the concept of having PWA appliction must still work." Resolved by: lazy-load `<script>` injection on click, AND `sw.js` `PRECACHE_URLS` MUST include the bytes so PWA users have them cached at install time. Both compatible. Also adopted the spirit of option 3 — wrap jsPDF in `assets/pdf-export.js` module loaded only when needed.

### Q4: What should the generated PDF filename pattern be?

| Option | Description | Selected |
|--------|-------------|----------|
| ClientName_YYYY-MM-DD.pdf | Sortable, identifiable, ASCII-sanitized | ✓ |
| session_YYYY-MM-DD.pdf | Privacy-conservative, no client name leak | |
| ClientName-SessionType-YYYY-MM-DD.pdf | Most descriptive but longer + needs translation | |

**User's choice:** ClientName_YYYY-MM-DD.pdf
**Notes:** Recommended. Sanitize Hebrew/diacritics to ASCII for cross-OS compatibility.

### Q5: Page size and orientation for the generated PDF?

| Option | Description | Selected |
|--------|-------------|----------|
| A4 portrait | EU/IL/CZ default, 595x842pt | ✓ |
| Letter portrait | US default 612x792pt — wrong for target market | |
| Auto by UI language | en→Letter, others→A4 — added complexity for marginal benefit | |

**User's choice:** A4 portrait

### Q6: How should long sessions paginate?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto page-break with running header | New pages get abbreviated header + page numbers | ✓ |
| Auto page-break, no running header | Simpler, less polished | |
| Force single page — truncate or shrink | Worst UX, rejected | |

**User's choice:** Auto page-break with running header

### Q7: Document body font size in PDF?

| Option | Description | Selected |
|--------|-------------|----------|
| Body 11pt, headings 14pt, header meta 10pt | Print-document standard | ✓ |
| Body 12pt, headings 16pt | Larger, more letter-like | |
| Body 10pt, headings 13pt | Compact, smaller-looking | |

**User's choice:** Body 11pt, headings 14pt, header meta 10pt

---

## Area 2 — Therapist-settings storage + label resolution

### Q1: Where should custom labels + disabled-section state be stored?

| Option | Description | Selected |
|--------|-------------|----------|
| New IndexedDB store + DB v4 | Unified backup, lives with clients/sessions, async read | ✓ |
| localStorage JSON blob | Synchronous read, but separate from IDB → backup.js needs new code path | |
| Hybrid: IDB + sync App cache | Best of both, but cache invalidation complexity | |

**User's choice:** New IndexedDB store + DB v4
**Notes:** Recommended. The hybrid pattern was effectively adopted via subsequent decisions (eager-load cache in App.initCommon() makes reads sync-equivalent at runtime).

### Q2: Where does the override-aware label-resolution function live?

| Option | Description | Selected |
|--------|-------------|----------|
| New App.getSectionLabel(key) in app.js | Single source of truth alongside App.t() | ✓ |
| New module assets/section-labels.js | Cleaner separation but more script tags + namespace pollution | |
| Patch App.t() to check overrides first | Transparent but pollutes generic i18n path | |

**User's choice:** New App.getSectionLabel(key) in app.js

### Q3: How should the in-memory label cache be populated?

| Option | Description | Selected |
|--------|-------------|----------|
| Eager load in App.initCommon() | One IDB call per page load, sync getSectionLabel afterward | ✓ |
| Lazy load on first call | Async surface, race conditions on first render | |
| Page-by-page load | Easy to miss a page in future | |

**User's choice:** Eager load in App.initCommon()

### Q4: How does Settings page push updates to other open pages/tabs?

| Option | Description | Selected |
|--------|-------------|----------|
| BroadcastChannel + reload cache on next render | Defer cache swap to avoid mid-edit flicker | ✓ |
| Just persist — require page reload | Simplest but surprising in multi-tab use | |
| storage-event mirror key | Hacky, works without BroadcastChannel | |

**User's choice:** BroadcastChannel + reload on next render — and ALSO show a visible user-facing message on Settings explaining the steps
**Notes:** Verbatim: "use recomended approach of broadcastchannel+reload app cache on next render, but also add proper text message in the settings page that the user needs to do whichever steps." Captured as D-12 — visible info message i18n'd in 4 languages.

---

## Area 3 — Settings page entry point + nav

### Q1: Where does the Settings entry live in the app chrome?

| Option | Description | Selected |
|--------|-------------|----------|
| Gear icon in header next to globe | Compact, every-page reachable, mobile-friendly | ✓ |
| New tab in app-nav row | Adds 6th item to scrollable mobile nav | |
| Footer link | Functional setting in legal/meta footer = wrong | |
| Profile-style dropdown | Premature abstraction for one screen | |

**User's choice:** Gear icon in header next to globe

### Q2: Settings page filename and module pattern?

| Option | Description | Selected |
|--------|-------------|----------|
| settings.html + assets/settings.js | Matches existing app-page pattern | ✓ |
| Reuse 'preferences.html' filename | Inconsistent with spec naming | |
| Build it inside an existing page (modal) | Violates app-page contract, poor mobile UX | |

**User's choice:** settings.html + assets/settings.js

### Q3: How does the Settings page render the 9 sections?

| Option | Description | Selected |
|--------|-------------|----------|
| Single scrollable list | Simplest mental model | |
| Grouped accordions | Cognitive grouping but arbitrary | |
| Two-column desktop, single-column mobile | More CSS, cramped at 768-900px | |

**User's choice:** Defer to UI-spec / frontend-design agent
**Notes:** Verbatim: "use frontend phase (ui spec?) with frontend design agent to research and make a decision". Locked as D-16 — visual decisions deferred to `/gsd-ui-phase` while architecture (gear icon, settings.html file) stays locked here.

---

## Area 4 — Export dialog flow architecture

### Q1: Export dialog structural decision

| Option | Description | Selected |
|--------|-------------|----------|
| Single modal, three progressive steps | One modal, single body-scroll-lock, 'Back' button | ✓ |
| Three separate sequential modals | More state plumbing, harder back-flow | |
| Single modal, all visible (no steps) | Cluttered at 375px | |
| Defer everything to UI-spec | Planner needs the modal-architecture decision now | |

**User's choice:** Single modal, three progressive steps

### Q2: How is the editable preview implemented?

| Option (round 1) | Description | Selected |
|--------|-------------|----------|
| <textarea> with Markdown source | Plain text edit, simple, predictable | |
| contenteditable rendered preview | WYSIWYG, RTL bidi nightmare | |
| Read-only preview + Edit toggle | Extra click, spec says "editable preview" | |

**User's first response:** "review option 2 more carefully — it sounds that 1 is too simple without any formatting, maybe its not the best"

| Option (round 2 — refined) | Description | Selected |
|--------|-------------|----------|
| Markdown textarea + live rendered preview side-by-side | ~1KB regex parser, mobile uses Edit/Preview tabs | ✓ |
| contenteditable with sanitizer | Honest re-look at cons: RTL bidi + paste-from-Word + zero-dep WYSIWYG cost = multi-week scope | |
| Rendered preview + Edit Markdown toggle | Lower-pressure but loses live feedback during editing | |
| Plain textarea only | Original recommendation, biggest UX cost on uncertainty | |

**User's choice (round 2):** Markdown textarea + live rendered preview side-by-side

### Q3: Where does the 'Export' button live on the session edit page?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline next to 'Copy Session (MD)' button | Spec says "placed next to" | (clarification asked) |
| Floating action / sticky bottom bar on mobile | New pattern, reduces viewport | |
| In a kebab overflow menu | Hides headline feature | |

**User's response:** "what is copy sesssion md, whats the diff with export here? means we probably dont need new md clipboard feature??"

**Clarification given:** Copy MD = single-click full-markdown clipboard for personal/journal use. Export = curated client-facing flow with section selection, preview, file download, share. Both locked by SPEC REQ-7 + REQ-19. Removing Copy MD would be a SPEC change.

| Follow-up Q (round 2) | Description | Selected |
|--------|-------------|----------|
| Yes — keep both per spec | REQ-7 + REQ-19 lock both; same App.getSectionLabel() source | ✓ |
| No — remove Copy MD | Reduces clutter but breaks spec lock | |

**User's choice:** Yes — keep both per spec

---

## Claude's Discretion

- Step indicator visual styling in the export modal (numbered dots, breadcrumb, etc.) — captured for UI-spec
- Action button sizing on mobile cards — captured for UI-spec
- Markdown parser exact heading-level rendering hierarchy
- Slugify rules for non-Latin client names in PDF filename (small in-house map)
- Settings page max label length validation (suggest 40-60 chars) — captured for UI-spec
- Whether to add a "Reset all to defaults" bulk action — deferred (per-row reset is in spec; bulk is not)

## Deferred Ideas

- Pre-session context card (already SPEC-deferred to a future phase)
- Multi-session client reports (v1.2)
- Add/remove/reorder sections (separate phase needs custom-fields infra)
- Per-UI-language label overrides
- mailto / Gmail compose URL delivery
- HTML file export
- In-app translation engine
- Therapist profile / business name in document header
- Backend storage of exports
- Reordering sections in export dialog
- Templates / "Pick your modality" starter packs
- Heart Shield filter / overview indicators / reporting averaging changes
- contenteditable WYSIWYG preview (rejected on RTL + dep cost)
- "Reset all to defaults" bulk action on Settings (per-row reset only in v1)
