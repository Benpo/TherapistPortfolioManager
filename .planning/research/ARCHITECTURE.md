# Architecture Research

**Domain:** Rich-text session editor + section drag-sort reordering bolted onto a live, zero-dependency vanilla-JS PWA (Sessions Garden)
**Researched:** 2026-07-11
**Confidence:** HIGH (grounded in the live codebase; every load-bearing claim cites `file:line`. LOW only where a design fork is deliberately left open for discuss-phase.)

> Scope note: this is a **subsequent-milestone integration study**, not a greenfield stack survey. It answers "how do the rich-text editor and section reordering bolt onto the code that already ships." The single most important finding — which reframes the whole milestone — is that **the PDF + markdown export pipeline is ALREADY markdown-native and ALREADY renders inline bold + ordered/unordered lists** (Phase 23-12). The MILESTONE-CONTEXT premise that "the PDF pipeline deliberately strips inline markdown, bold not rendered — deferred to a future phase, which is now" is **partially stale**: `stripInlineMarkdown` survives ONLY on the heading branch (`pdf-export.js:1343`, headings are wholly bold already); the paragraph and list branches route through `parseInlineBold` → `drawSegmentedLine` and emit **Heebo Bold** runs (`pdf-export.js:1391-1432`, `931-994`). What is genuinely missing is (a) an **editing affordance** in the session form (fields are plain `<textarea>`), (b) **underline** anywhere (no markdown underline, no `md-render` support, no PDF support), and (c) **user-controlled section order** (hardcoded in four places).

---

## Standard Architecture

### System Overview — where the new surfaces attach

Session note content flows through one storage surface and two consumers today. All three are markdown-string based already:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  SESSION FORM  (add-session.html + add-session.js)                        │
│  8 plain <textarea class="session-textarea"> fields                       │
│    trappedEmotions · insights · limitingBeliefs · additionalTech ·        │
│    comments · customerSummary · heartShieldEmotions   (+ issue rows)      │
│  → composes with: snippets input-listener, autoGrow, dirty-track,         │
│    read-only toggle, section-visibility, section-label rename             │
└──────────────┬───────────────────────────────────────────────────────────┘
               │ saveSessionForm() → .value.trim()  (add-session.js:1163-1245)
               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  PortfolioDB.addSession / updateSession   (db.js:731-737)                  │
│  session note fields persisted as PLAIN STRINGS on the record.            │
│  No schema for text formatting. keyPath id, autoIncrement.                 │
└───────┬───────────────────────────────┬──────────────────────────────────┘
        │ getSession (edit/read)         │ getAllSessions / getSessionsByClient
        ▼                                ▼
┌───────────────────────┐   ┌───────────────────────────────────────────────┐
│ EXPORT (export-modal)  │   │ .sgbackup ZIP (backup.js) — sessions[] as JSON │
│ buildSessionMarkdown / │   │ round-trips whatever string we store, verbatim │
│ buildFilteredSessionMd  │   └───────────────────────────────────────────────┘
│ push raw field .value  │
│ as MARKDOWN body under │
│ "## <sectionLabel>"    │
│   (export-modal.js:171 │
│    -295, 349-441)      │
└──────┬─────────┬───────┘
       │         │
       ▼         ▼
 MdRender    PDFExport.buildSessionPDF
 (preview,   parseMarkdown → parseInlineBold →
 md-render)  drawSegmentedLine (Heebo Bold + lists,
             bidi-shaped, RTL-anchored)
```

**Key implication:** because both consumers already parse the field value as markdown, the storage format for rich text is **already decided by the surrounding code** — it is markdown. The milestone's job is to add an *editing affordance* that emits that markdown, render it back in the form, and close the two real gaps (underline; user-controlled order).

### Component Responsibilities (as they exist today)

| Component | Owns | Cite |
|-----------|------|------|
| `add-session.js` | The 8 session textareas, save choke-point, read/edit mode toggle, section visibility + label application, autoGrow, revert snapshot | `add-session.js:1-41` (banner), `:1163-1245` (save), `:306-338` (read-mode), `:913-986` (visibility+labels) |
| `export-modal.js` | 3-step export; `buildSessionMarkdown` (copy) + `buildFilteredSessionMarkdown` (PDF/MD); live MdRender preview; PDF input assembly | `:171-295`, `:349-441`, `:533-543`, `:614-703` |
| `md-render.js` | Markdown → safe HTML for the export preview. Supports `#/##/###`, `**bold**`, `*italic*`, `-`/`*` lists, paragraphs, `<br>`. **No underline.** HTML-escapes before rules | `md-render.js:5-75` |
| `pdf-export.js` | jsPDF pipeline; `parseMarkdown` (blocks) → `parseInlineBold` (segments) → `drawSegmentedLine` (per-run Heebo Regular/Bold, bidi-shaped). Ordered+unordered lists, RTL anchors. **No underline.** Heebo + Heebo Bold vendored | `:478-535`, `:931-994`, `:1391-1432`, `:250-263` (fonts) |
| `db.js` | IDB choke-point. `sessions` store (fields are strings); `therapistSettings` store (keyPath `sectionKey`, rows `{sectionKey, customLabel, enabled}`); sentinel-write path `_writeTherapistSentinel` | `:731-737`, `:306-312`, `:947-985`, `:917-920` |
| `settings.js` | The 9 section rows (rename + enable toggle + reset), `SECTION_DEFS` canonical list/order, Save→`setTherapistSetting` per row, BroadcastChannel sync | `:35-49`, `:465-540` |
| `app.js` | `_sectionLabelCache` (sync section-label/enabled reads), `getSectionLabel`, `isSectionEnabled`, populated in `initCommon` | `:58-75` |
| `backup.js` | `.sgbackup` export/import; `therapistSettings` restore branches on section rows vs sentinel rows; `ALLOWED_SECTION_KEYS` + `ALLOWED_SENTINEL_KEYS` allow-lists | `:1146-1194`, `:1157` |

---

## The storage-format decision (rich text)

**Recommendation: store markdown. No migration. Fields stay plain strings.**

| Option | Migration | Old sessions | Mixed portfolios | .sgbackup before/after | Verdict |
|--------|-----------|--------------|------------------|------------------------|---------|
| **Markdown** (recommend) | **None** — plain text ⊂ markdown; field type unchanged (string) | Render unchanged (plain text = a markdown paragraph) | Trivially fine — every record is "just a string" | Identical shape; round-trips verbatim (`backup.js` treats sessions[] as opaque JSON) | ✅ Already the codebase lingua franca; both export consumers already parse it |
| Sanitized HTML | None structurally, but… | XSS surface on every read; **violates the deeply-baked `textContent`-never-`innerHTML` invariant** (`add-session.js:36-40`, `db.js:966-967`, `settings.js:27-28`) | Fine | Carries HTML into the backup file | ❌ Fights the security posture; needs a sanitizer dep or hand-rolled allow-list |
| JSON (delta / portable-text) | Reasoning + serializers required | Need a plain-string→JSON upgrade path or dual-read | Two shapes coexist | Backup shape changes; importer must handle both | ❌ Overkill for bold/underline/bullets; needs md-serializer (export) + html-serializer (preview) |

**Why markdown is nearly free here:** `buildFilteredSessionMarkdown` already pushes `trappedValue.trim()` (etc.) as **raw markdown body** under a `##` heading (`export-modal.js:402-438`), and `md-render`/`pdf-export` already parse it. A user who types `- item` in a field **already** gets a bullet in the exported PDF today. The demo seed even ships bullet lists inside `comments` (`demo-seed-data.json:126,152`). So markdown-in-fields is de-facto live in the export path already.

**The one real compat wrinkle — retroactive interpretation.** The moment the **read-mode form** switches from showing a raw `<textarea>` to showing a *rendered* markdown preview, any pre-existing plain-text field that happens to contain `*`, `-`/`* ` at line start, `#`, or the chosen underline token will suddenly render as formatting (e.g. a literal asterisk becomes bold, a leading dash becomes a bullet). This risk is:
- **Already partially live** in the export/copy path (those builders already parse field content as markdown), so it is not new to export.
- **New** to the in-form read view. Flag for discuss-phase: accept it (markdown is intuitive), or gate rendering behind a per-field "is-formatted" marker so legacy content stays literal. A per-field marker reintroduces a (small) schema concern; accepting retro-interpretation keeps zero-migration. Recommend **accept**, because the export already behaves this way and consistency form↔export is the higher-value property.

**Underline is the storage sub-decision.** Markdown has no underline. `**`=bold and `*`=italic are taken (`md-render.js:20-22`, `pdf-export.js:478-535`); `__ __` currently renders **literally** (not mapped). A stored underline needs a token that (a) does not collide with `*`/`**`, (b) is reversible, (c) is handled in BOTH `md-render` (preview + read view) and `pdf-export` (parse + draw). Candidate tokens: `__text__`, `++text++`, or a raw `<u></u>` convention (but `<u>` is HTML-escaped by `md-render.js:8-15` and by `pdf-export`'s text path, so it would need special-casing — messier). **Recommend a paired delimiter (`__…__` or `++…++`)** parsed identically to the bold path. This is a genuine decision to lock BEFORE the editor UI is built.

---

## The section-order decision (reordering)

**Order is hardcoded in FOUR places that must all agree — this is the 260615 bug class.**

1. **Static form DOM** — `[data-section-key]` wrappers in `add-session.html` (the visual order).
2. **`buildSessionMarkdown`** (copy path) — a hardcoded push sequence, explicitly commented "Order MUST mirror the add-session form DOM order" (`export-modal.js:260-292`).
3. **`buildFilteredSessionMarkdown`** (PDF/MD path) — a second hardcoded push sequence, same comment (`export-modal.js:406-438`).
4. **`EXPORT_SECTION_ORDER`** array — drives the Step-1 include-checkbox order (`export-modal.js:313-323`).

Plus a subtle **fifth** coupling: `severityAfterSections` (`export-modal.js:646-657` → `pdf-export.js:1291-1319`) positions the severity-bars block by *assuming* the issues/severity section sits right after `heartShield` in form order. Reordering breaks that positional assumption.

Quick task **260615** (see the drag-sort todo) *fixed* a divergence by making builders 2+3 hardcode-match the static DOM. That fix is exactly what must be **unwound** into "consume the saved order" when drag-sort lands, or the two builders diverge from the now-user-controlled form and reintroduce 260615.

**Where the saved order should live.** `therapistSettings` is `keyPath: "sectionKey"` with rows `{sectionKey, customLabel, enabled}` (`db.js:306-312`, `settings.js:507-512`). Note: the 2026-05-13 todo assumed a per-locale `therapistSettings.{locale}` record — **that is wrong per the live schema**; rename/enabled state is **global per section**, one row per key, and order should be too. Two viable homes:

| Option | Shape | Pros | Cons |
|--------|-------|------|------|
| **(a) per-row `order` int** | add `order` to each `{sectionKey,…}` row | Reuses `setTherapistSetting` + `getAllTherapistSettings` | Reorder rewrites all 9 rows; must extend `setTherapistSetting` (`db.js:969-985`) + `renderRow`; disabled/locked rows still need slots; total-order integrity is emergent, not enforced |
| **(b) single sentinel record** (recommend) | `{sectionKey:'sectionOrder', order:[...keys]}` | One write, one read, a clean total order; **mirrors the existing `snippetsDeletedSeeds` sentinel pattern** (`db.js:917-963`) which is already backup-aware | Must register the new key in **two lock-step allow-lists**: `db.js` `_SENTINEL_KEYS` (`:920`) AND `backup.js` `ALLOWED_SENTINEL_KEYS` (`:1157`) — the `db.js:918-920` comment mandates exactly this |

**Recommend (b).** It matches a proven, backup-safe pattern and keeps order as one authoritative array. The backup restore loop already branches sentinel-vs-section rows (`backup.js:1166-1194`), so a new sentinel drops into the existing seam.

**Consumers to switch from hardcoded → saved order (all of them, atomically):**
- **`app.js`**: add a sync `getSectionOrder()` reading a new cache slot, populated in `initCommon` alongside `_sectionLabelCache` (same eager-load/sync-read pattern as `getSectionLabel`).
- **Add/edit form** (`add-session.js`): reorder the `[data-section-key]` wrappers in the DOM per saved order at load. `applySectionVisibility` + `applySectionLabels` already iterate those wrappers (`:913-986`) — add a reorder pass before them. Covers both new and edit (same page).
- **`buildSessionMarkdown` + `buildFilteredSessionMarkdown`**: replace the two hardcoded push sequences with a single loop over the saved order.
- **`EXPORT_SECTION_ORDER`**: derive from saved order (or sort by it).
- **`severityAfterSections`**: recompute as "count of enabled body sections preceding `issues` in the **saved** order" instead of the heartShield-first assumption.
- **Guard test**: `tests/30-export-markdown.test.js` currently asserts `export order == static DOM order` (its header cites `quick-260615-export-section-order`; the assertions live at `:203-209`). It must change to assert `export order == saved section order`. (No standalone `quick-260615-export-section-order.test.js` exists; the coverage is folded into `30-export-markdown.test.js`.)

---

## New vs Modified components (explicit)

**NEW:**
- **Rich-text toolbar component** (the one substantial new UI). Recommend a **markdown-toolbar-over-`<textarea>`** (Bold/Underline/Bullet buttons that wrap/prefix the current selection with tokens), **NOT `contenteditable`**. Rationale: keeps `.session-textarea` as the storage + editing surface, so the snippets input-listener (`add-session.js:32-34`), `autoGrow` (`:66-74`), dirty-tracking (`:212-219`), read-only toggle (`:315-322`), and section-visibility all keep working **unchanged**. A `contenteditable` swap would break every one of those.
- **In-form rendered read view** — a MdRender preview surface shown in read-mode in place of (or over) each read-only textarea, so saved formatting is *visible* rather than shown as raw `**`/`__` tokens. (Design fork; see LOW-confidence note below.)
- **`sectionOrder` sentinel** in `therapistSettings` (+ two allow-list registrations).
- **Section drag-sort UI** in `settings.js` (reorder the 9 `SECTION_DEFS` rows; persist the sentinel on Save).
- **`App.getSectionOrder()`** sync accessor + cache slot.
- Underline parse/render additions (see below — extensions of existing functions, arguably "modified").

**MODIFIED:**
- **`md-render.js`** — add underline token support (new inline rule alongside `applyInline`, `:17-23`). Small, pure, unit-testable.
- **`pdf-export.js`** — (1) extend the segment model `{text,bold}` → `{text,bold,underline}` in `parseInlineBold` (`:478-535`); (2) in `drawSegmentedLine` (`:931-994`), each run already has a measured width, x-anchor, and y-baseline — draw a `doc.line` under underlined runs (~1.5pt below baseline). RTL is handled for free because runs are already positioned in visual order. **No new font** (bold already vendored; underline is a drawn rule, not a glyph variant). Bold + bullets need **no PDF change**.
- **`add-session.js`** — wire the toolbar; add the read-mode rendered view; reorder section wrappers per saved order.
- **`add-session.html`** — toolbar markup per field (or one shared, selection-aware toolbar) + a read-view container per section.
- **`export-modal.js`** — swap the two hardcoded builder sequences to loop over saved order; recompute `severityAfterSections`; `EXPORT_SECTION_ORDER` follows saved order. Preview already uses MdRender (`:539`) — inherits underline for free once `md-render` supports it.
- **`settings.js`** — drag-sort interaction + persist order; possibly a "reset order" affordance.
- **`db.js`** — register `sectionOrder` in `_SENTINEL_KEYS`; the `_writeTherapistSentinel` path already handles arbitrary sentinel arrays (may need to generalize its `deletedIds`-specific coercion at `:955-962` to a generic array field).
- **`backup.js`** — register `sectionOrder` in `ALLOWED_SENTINEL_KEYS`; verify the sentinel round-trips (the restore branch at `:1166-1179` currently forwards `deletedIds` — generalize to forward the order array).
- **`sessions.js`** (list table) — the sessions table renders `session.trappedEmotions` via `textContent` (`sessions.js:262`), so raw `**`/`__` tokens would show in the cell preview. Strip inline markdown for the table preview (reuse a strip helper) or accept it. Minor, but do not forget it.
- **Guard test** `tests/30-export-markdown.test.js` — rewrite the order assertions.

**NO change needed:**
- **`backup.js` for rich text** — session fields stay strings; markdown round-trips verbatim. (Only the *section-order sentinel* touches backup.)
- **PDF bold + list rendering** — already shipped (Phase 23-12).
- **`db.js` sessions schema / migrations** — no new store, no migration; DB_VERSION stays 6.
- **Snippets engine** — composes unchanged **iff** the editor stays a textarea.

---

## Data Flow (after the milestone)

**Rich-text write path:**
```
User clicks Bold/Underline/Bullet toolbar → wrap selection in markdown token
  → textarea.value mutated → input event → autoGrow + dirty-track fire (unchanged)
  → saveSessionForm reads .value.trim() → PortfolioDB.updateSession (string, unchanged)
```
**Rich-text read/export path (already markdown-native):**
```
getSession → populateSession sets textarea.value
  → read-mode: MdRender.render(value) into preview surface (NEW view)
  → export: buildFilteredSessionMarkdown pushes value as md body (unchanged)
      → MdRender preview (underline NEW) / PDFExport (underline NEW, bold+lists existing)
```
**Section-order path (NEW):**
```
Settings drag-sort → save → _writeTherapistSentinel({sectionKey:'sectionOrder', order:[…]})
  → BroadcastChannel → App refreshes _sectionOrder cache
  → add-session reorders [data-section-key] wrappers
  → export builders loop saved order (one source of truth) → no 260615 divergence
```

---

## Suggested build order (dependency-aware)

The two features are largely independent EXCEPT they both touch the export builders (`export-modal.js`). Sequence so the builder refactor happens once, cleanly, with its guard-test rewrite.

**Track A — Rich text**
1. **Storage-format + underline-token decision** (spike/decision). Blocks everything downstream. Lock: markdown storage, retro-interpretation accepted (or gated), underline delimiter chosen.
2. **`md-render` underline** (+ unit test). Small; unblocks preview and the in-form read view.
3. **PDF underline** (extend `parseInlineBold` segment model + `drawSegmentedLine` rule-draw + tests). Depends on the token from step 1. Bold/bullets already done.
4. **Toolbar-over-textarea editor UI** + in-form rendered read view. Depends on 1–2. This is the headline UX.
5. **Backup/demo parity check** — mostly verification (fields already round-trip); add a bold/underline example to `demo-seed-data.json` for parity.

**Track B — Section reorder** (can run parallel until step B3)
1. **Order storage** — `sectionOrder` sentinel + `db.js` `_SENTINEL_KEYS` + `backup.js` `ALLOWED_SENTINEL_KEYS` + `App.getSectionOrder()` cache.
2. **Form consumes saved order** — reorder `[data-section-key]` wrappers (add/edit).
3. **Export builders consume saved order** — refactor both builders + `EXPORT_SECTION_ORDER` + `severityAfterSections`, and **rewrite the `30-export-markdown` guard test in the same change** (this is the 260615-critical, atomic step).
4. **Settings drag-sort UI** + persist + optional reset-order.

**Ordering rationale:** decide format before building any editor (Track A blocks on A1); render underline in preview/PDF before/with the editor so "does formatting survive export?" is verifiable end-to-end; land the export-builder reorder refactor as one atomic commit with the guard-test rewrite (B3) so the section-order invariant is never briefly broken. If both tracks land in one milestone, do Track B's B3 **after** Track A's export-touching work (or coordinate) so `export-modal.js` is edited by one hand at a time.

---

## Anti-Patterns (domain-specific, verified against this code)

**Swapping the session fields to `contenteditable`.**
- *Why it's wrong:* breaks the snippets input-listener, `autoGrow` scrollHeight math (`add-session.js:58-74`), dirty-tracking, read-only toggle, and the `.value`-based save/revert snapshot — all of which assume a `<textarea>`.
- *Do instead:* toolbar-over-textarea emitting markdown tokens.

**Storing sanitized HTML "so the preview is easy."**
- *Why it's wrong:* the entire app renders user content via `textContent`/`.value`, never `innerHTML` (stated as an INVARIANT in `add-session.js:36-40`, enforced across `settings.js`, `db.js`, `sessions.js`). HTML storage inverts that and opens an XSS surface on every read.
- *Do instead:* markdown storage; `MdRender` already produces *escaped* safe HTML for the one place `innerHTML` is used (the export preview, `export-modal.js:539`).

**Leaving the export builders on hardcoded order after Settings gets drag-sort.**
- *Why it's wrong:* the exact 260615 divergence — form order becomes user-controlled while PDF/copy stay static.
- *Do instead:* one saved-order source consumed by form + both builders + step-1 list + severity positioning, with the guard test asserting equality to saved order.

**Forgetting `severityAfterSections`.**
- *Why it's wrong:* it silently assumes issues/severity follows `heartShield` in form order; reordering mislocates the severity bars in the PDF.
- *Do instead:* recompute from saved order.

---

## Integration Points

| Boundary | Communication | Notes |
|----------|---------------|-------|
| toolbar ↔ `.session-textarea` | direct `.value` mutation + synthetic `input` event | must compose with snippets + autoGrow (order-independent by design) |
| `add-session.js` ↔ `export-modal.js` | `window.__exportModalInit(ctx)` accessor closures (`add-session.js:1023-1029`) | export reads live field values via DOM ids at use-site; reorder changes DOM, not the contract |
| section order ↔ `therapistSettings` | new `sectionOrder` sentinel via `_writeTherapistSentinel` | register in `db.js` `_SENTINEL_KEYS` + `backup.js` `ALLOWED_SENTINEL_KEYS` **in lock-step** |
| Settings ↔ other tabs | `BroadcastChannel("sessions-garden-settings")` (`settings.js:517-521`) + `app:settings-changed` | order changes should ride the same refresh path as rename/enable |
| fields ↔ `.sgbackup` | sessions[] JSON, opaque strings (`backup.js`) | rich text needs zero backup change; only the order sentinel touches backup |
| markdown ↔ PDF | `PDFExport.buildSessionPDF({markdown,…})` (`export-modal.js:675-691`) | bold/lists live; underline is the only new render primitive |

---

## Confidence

- **HIGH** on every "already exists / already markdown / hardcoded in 4 places / no migration needed" claim — read directly from source, cited.
- **LOW / open for discuss-phase:** (1) read-mode rendering fork — accept retro-interpretation vs per-field is-formatted marker; (2) underline delimiter choice; (3) toolbar shape (per-field vs one shared selection-aware toolbar); (4) order-storage option (a) vs (b) — recommend (b) but either works; (5) whether reorder ships in the same milestone as rich text (they intersect only at `export-modal.js`).

## Sources

- Live source (cited inline `file:line`): `add-session.js`, `export-modal.js`, `md-render.js`, `pdf-export.js`, `db.js`, `settings.js`, `app.js`, `backup.js`, `sessions.js`, `demo-seed-data.json`, `tests/30-export-markdown.test.js`
- `.planning/todos/pending/2026-05-13-drag-sort-settings-categories.md` (drag-sort intent + the 260615 export-builder trap)
- `.planning/PROJECT.md` (v1.4 scope, zero-dependency + local-only constraints)

---
*Architecture research for: rich-text session editor + section reordering on a live zero-dep vanilla PWA*
*Researched: 2026-07-11*
