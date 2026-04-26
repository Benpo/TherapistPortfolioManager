---
phase: 22
slug: session-workflow-loop-pre-session-context-card-editable-sess
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-27
---

# Phase 22 — UI Design Contract

> Visual and interaction contract for Phase 22: Session Workflow Loop.
> Two new surfaces — a Settings page (Feature A) and a 3-step Export modal (Feature B) — must inherit the existing Sessions Garden design system. This spec is **prescriptive**, not exploratory: it locks values that planner and executor consume directly.

> Source of truth for existing tokens: `assets/tokens.css` and `assets/app.css`. This spec **reuses** them, never reinvents them.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (vanilla HTML/CSS/JS, no framework, no shadcn) |
| Preset | not applicable |
| Component library | none — custom IIFE modules per page (`add-session.js`, `settings.js`, etc.) |
| Icon library | inline SVG (existing pattern: see globe icon in `app.js:124`, leaf in `add-session.html:30`); supplement with a few HTML entity glyphs (`&#9881;` gear, `&#11088;` star) where they already work cross-platform |
| Font | Rubik (self-hosted WOFF2 — Regular 400, SemiBold 600, Bold 700) declared in `assets/tokens.css:1-22` |

**Initialization gate result:** N/A — vanilla JS project, no React/Next/Vite. shadcn does not apply. UI contract enforced by audit and reviewer agents instead.

---

## Spacing Scale

The codebase **does not declare named spacing tokens**. Phase 22 adopts the de-facto rem scale already in use across `assets/app.css` and pins it formally so new code stays consistent.

| Token (de-facto) | Value | rem | Usage in this phase |
|-------|-------|-----|---------------------|
| 2xs | 4px | 0.25rem | Icon-to-text gaps inside inline-flex |
| xs | 8px | 0.5rem | Compact gaps (toggle-group items, badge padding-x) |
| sm | 12px | 0.75rem | Inline form gaps, button row gaps |
| md | 16px | 1rem | Default field/row gap, card padding mobile |
| lg | 24px | 1.5rem | Section padding, card padding desktop, modal-card padding |
| xl | 32px | 2rem | Page-level spacing, dialog hero gap |
| 2xl | 48px | 3rem | Page top padding |
| 3xl | 64px | 4rem | App-shell bottom padding |

**Rules for Phase 22:**

- All new CSS must pick from this scale. No `padding: 13px`, no `margin: 0.65rem`.
- Use **logical properties** (`padding-inline`, `padding-block`, `inset-inline-start`) — RTL-safe per Phase 18 standard.
- Modal card padding: `lg` (24px) on mobile, `xl` (32px) on desktop ≥769px (matches existing `.modal-card` at `1.8rem`).

**Exceptions:**

- `--space-xs, 0.5rem` fallback variable used in legacy code at `app.css:121` and `app.css:860` — keep using the `var(--space-xs, 0.5rem)` form when extending neighboring code; do **not** rewrite existing uses.
- Tap-target floor: every new interactive element must be ≥ 44×44px (Phase 21 D-11). This **overrides** the spacing scale when a button at `xs` padding would shrink below 44px.

---

## Typography

The codebase uses Rubik in three weights and a rem-based size ramp. Phase 22 adopts the **declared four roles** below — drawn from existing values in `assets/app.css` so new screens visually match.

| Role | Size | Weight | Line Height | Where used in Phase 22 |
|------|------|--------|-------------|-------------------------|
| Body | 16px (1rem) | 400 (regular) | 1.5 | Settings descriptions, label text inside rows, export modal body, markdown editor textarea |
| Label | 14px (0.875rem) | 600 (semibold) | 1.4 | Field labels (`.label`), checkbox labels, "Disabled in Settings" indicator text |
| Section heading | 22px (1.4rem) | 800 | 1.25 | Settings page H2 ("Section Settings"), modal title (`.modal-title`), step heading inside export dialog |
| Microcopy / helper | 13px (0.85rem) | 600 | 1.4 | Helper text under inputs (e.g. "Saved. Reload other tabs to see changes."), tooltip text, step indicator label |

**Fixed rules for Phase 22:**

- **Hebrew matches Latin sizing** — Rubik Hebrew metrics line up at the same px values; do not bump up for `dir=rtl`.
- **PDF document typography** is governed separately by jsPDF (per CONTEXT.md D-07): body 11pt, headings 14pt, header meta 10pt. Those values are **fixed in code**, do not change them.
- **Live Markdown preview pane** uses Body 16px / 1.5 leading — NOT the PDF 11pt. The preview is a screen surface, not a print preview.
- **No new font weights** — Rubik 400/600/800 is the catalogue (800 is permitted because the existing Bold WOFF2 file is `font-weight: 700` and `.section-title` already declares `font-weight: 800` synthetically; keep that pattern).

---

## Color

The 60/30/10 split is already established in `assets/tokens.css`. Phase 22 inherits it untouched.

| Role | Value (light) | Value (dark) | Usage |
|------|---------------|--------------|-------|
| Dominant (60%) | `var(--color-background)` = `#fdf8f0` (warm cream) | `#1a2020` (dark teal) | Page background behind app-shell, behind modal overlay before fade |
| Secondary (30%) | `var(--color-surface)` = `#ffffff` | `#202828` | Cards (Settings rows), modal-card body, textarea background, preview pane |
| Accent (10%) | `var(--color-primary)` = `#2d6a4f` (garden green) | `#5aacac` (soft teal) | **See reserved-for list below** |
| Destructive | `var(--color-danger)` = `#ea4b4b` | same | Discard-confirm "Discard" button, future delete confirmations only |

**Accent (`--color-primary`) is reserved for** — explicit list, do not use elsewhere in Phase 22:

1. The primary CTA in each step of the export dialog: `[Next →]`, `[Generate Document]`, `[Download PDF]` (the highest-priority action in that step)
2. The primary CTA on the Settings page footer: `[Save changes]`
3. The active state of the step indicator (filled dot for the current step)
4. The selected state of `.toggle-card` checkboxes already in use for section enable/disable (matches `app.css:934`)
5. The gear icon in the header on `settings.html` only (matches existing nav active state convention)

**Accent is NOT used for:**

- Section row borders on the Settings page (use `var(--color-border)` or `var(--color-border-soft)`)
- Helper text (use `var(--color-text-muted)`)
- The "Disabled in Settings" indicator (see Indicator Styling below)
- Hover states on disabled-greyed-out checkboxes in the export dialog
- The Markdown preview pane heading typography

**Indicator styling — "Disabled in Settings" badge** (used in edit-existing-session form AND in greyed export-dialog rows):

| Property | Value |
|----------|-------|
| Background | `var(--color-surface-disabled)` (= `#fefcf8` light / `#202828` dark) |
| Text color | `var(--color-text-muted)` |
| Border | `1px solid var(--color-border-soft)` |
| Padding | `2px 8px` |
| Border-radius | `999px` (pill) |
| Font | Microcopy (13px / 600) |
| Copy | `"Disabled in Settings"` (i18n key `settings.indicator.disabled`) |
| Icon | None — text-only (cleaner at 13px, more RTL-safe than mixing icons) |

**Greyed-out style for unselectable export-dialog rows:**

- Row container: `opacity: 0.55`
- Checkbox: `pointer-events: none` + `cursor: not-allowed`
- Label: `color: var(--color-text-muted)` and `text-decoration: none` (do **not** strike through — it reads as deleted, not disabled)
- Tooltip on hover/focus: shows the i18n string `"Disabled in Settings"`

---

## Layout — Settings Page (Feature A)

**Decision:** single-column scrollable list of section rows. Locked here (CONTEXT.md D-16 deferred this to UI-spec).

**Rationale:**

- 9 rows is past the threshold where two columns saves vertical scroll meaningfully on desktop, but two columns make the rename input unreadably narrow at 768–900px (Sapir's iPad).
- Accordions hide controls that are all top-level in their importance (rename, enable/disable, reset) — bad cognitive grouping.
- Single column reads top-to-bottom in any of 4 languages with zero CSS overrides for RTL.

**Page structure:**

```
+------------------------------------------------+
| App header (shared chrome)                     |
+------------------------------------------------+
| H2 "Settings" + helper text                    |
| (helper: "Customize section names. Custom      |
|  labels are global across UI languages and     |
|  apply to your local copy only.")              |
+------------------------------------------------+
| Sticky info banner                             |
| (the D-12 message — see Sticky Info Banner)    |
+------------------------------------------------+
| Section row 1                                  |
| Section row 2                                  |
| ...                                            |
| Section row 9                                  |
+------------------------------------------------+
| Sticky bottom action bar                       |
| [Cancel]                  [Save changes]       |
+------------------------------------------------+
| App footer (shared chrome)                     |
+------------------------------------------------+
```

**Section row layout (desktop ≥769px):**

```
[ Default name + description ]   [ Rename input ........ ]   [ Toggle ]   [ Reset ]
                                                              switch       button
```

**Section row layout (mobile ≤768px) — stacked:**

```
+------------------------------------------------+
| Default name (label, semibold)                 |
| Description (microcopy, muted)                 |
|                                                |
| [ Rename input field ........................] |
|                                                |
| [Toggle switch]   [Reset to default]           |
+------------------------------------------------+
```

**Per-row spec:**

| Element | Spec |
|---------|------|
| Container | `padding: lg (24px)`; `border: 1px solid var(--color-border-soft)`; `border-radius: 18px`; `background: var(--color-surface)`; `margin-bottom: md (16px)` |
| Default-name label | Body weight 600 — uses i18n default key (e.g. `session.form.trapped`); shows the **English** default name in muted parentheses if current UI language ≠ English (so the therapist always knows what they're renaming) |
| Description | Microcopy, `color: var(--color-text-muted)` — short hint per section (e.g. "Where you log released emotions"). i18n keys `settings.row.{key}.description`. |
| Rename input | `.input` class; `placeholder` = current default i18n value for active UI language; `maxlength="60"` (locks Claude's discretion item from CONTEXT.md); shows current custom label as `value` if set |
| Enable/disable toggle | Reuse `.toggle-switch` + `.toggle-slider` (already exists `app.css:1604-1646`); checked = enabled |
| Reset button | `.button.ghost` with refresh-arrow SVG icon; tooltip + `aria-label` = "Reset to default name"; **disabled state** when no override exists (greyed, `pointer-events: none`); **enabled state** = `.button.ghost` with primary-soft hover |
| Indicator (when section is currently disabled) | The "Disabled in Settings" pill badge appears inline next to the default name |

**Sticky info banner (D-12 messaging):**

| Property | Value |
|----------|-------|
| Position | Sticky below page header, above the row list — `position: sticky; top: 0` (within scroll container) |
| Background | `var(--color-info-bg)` = `#cce5ff` light, `#202828` dark |
| Text color | `var(--color-info-text)` = `#004085` light, `var(--color-text)` dark |
| Padding | `md (16px) lg (24px)` |
| Border-radius | `12px` |
| Icon | Info glyph SVG (same circle-i used elsewhere in app warnings) — leading inline-start |
| Copy (en) | "Saved labels appear immediately on this page. Open session forms will pick up the new labels on next page navigation. Refresh other tabs to see changes immediately." |
| Copy (i18n keys) | `settings.syncMessage.heading` + `settings.syncMessage.body` (in en/de/he/cs) |
| Visibility | Always visible while on Settings page (the sync caveat is non-obvious) |

**Sticky bottom action bar:**

| Element | Spec |
|---------|------|
| Container | `position: sticky; bottom: 0`; `background: var(--color-surface)`; `padding: md`; `border-top: 1px solid var(--color-border-soft)`; `box-shadow: 0 -4px 12px var(--color-modal-shadow)` |
| Layout | `display: flex; gap: sm; justify-content: flex-end` (`flex-start` flipped automatically in RTL via logical props are not needed because flex `justify-content` direction reverses — verified with existing `.modal-actions` pattern at `app.css:1504`) |
| Cancel | `.button.ghost` — discards unsaved changes (with confirm if dirty, see Copywriting) |
| Save changes | `.button` (primary) — disabled until at least one row is dirty; on click, persists, fires BroadcastChannel, swaps page state to "Saved" toast |

---

## Layout — Export Dialog (Feature B)

**Decision:** Single modal, three sequential steps inside it. Inherits Phase 21 modal contract:

- `max-height: 90dvh`, body scrolls
- Pinned action bar at bottom
- `.modal-overlay` click → discard confirm if step 2 (preview) has unsaved edits → close
- `body.is-modal-open` scroll lock active

**Width:** `min(720px, 92vw)` — matches existing `.modal-card` width at `app.css:1353`. This is wider than the 520px confirm-card because the preview pane needs space.

**3 steps + step indicator:**

```
   ●─────○─────○
   1     2     3
 Select  Edit  Send
```

**Step indicator spec:**

| Property | Value |
|---------|-------|
| Position | Top of modal-card-body, below modal title |
| Layout | Horizontal flex row with 3 dots + connector lines, max-width `360px`, centered |
| Dot size | 24×24px circle |
| Active dot | `background: var(--color-primary)`; `color: white`; semibold number inside |
| Completed dot | `background: var(--color-primary-soft)`; `color: var(--color-primary-dark)`; semibold number inside |
| Pending dot | `background: var(--color-surface-subtle)`; `color: var(--color-text-muted)`; semibold number inside |
| Connector | `1px` line; `var(--color-primary)` between completed steps; `var(--color-border-soft)` to pending |
| Step label | Microcopy (13px / 600 / muted), placed below each dot, centered |
| Mobile (<480px) | Hide step labels, keep dots only — saves vertical space |

### Step 1 — Section Selection

```
+------------------------------------------------+
| × Close                                        |
| H3 "Export Session"                            |
|                                                |
|    ●─────○─────○                               |
|    1     2     3                               |
|                                                |
| Body text:                                     |
| "Choose which sections to include..."          |
|                                                |
| ☑  Trapped Emotions Released                   |
| ☑  Physical Imbalance                          |
| ☑  Limiting Beliefs                            |
| ☑  Additional Treatment Techniques             |
| ☑  Heart Shield Emotions                       |
| ☑  Information for Next Session                |
| ☐  Issues + severity                           |
| ☐  Session Notes and Observations              |
| ☐  Was the Heart Shield removed?               |
|                                                |
| ─[Disabled in Settings]─────────  (greyed)     |
| ▢  (disabled section name)                     |
+------------------------------------------------+
| [ Cancel ]              [ Next: Edit document →]
+------------------------------------------------+
```

**Checkbox row spec:**

| Property | Value |
|----------|-------|
| Layout | `display: flex; align-items: center; gap: sm` |
| Container | `padding: sm md`; `border-radius: 12px`; on hover `background: var(--color-surface-hover)` |
| Checkbox | Native `<input type="checkbox">` styled to 20×20px, accent uses `accent-color: var(--color-primary)` |
| Label | Body 16px / 400 |
| Disabled (greyed) row | `opacity: 0.55`; `cursor: not-allowed`; appended pill badge "Disabled in Settings" |
| Tap target | Whole row clickable, `min-height: 44px` |

### Step 2 — Editable Preview

**Desktop (≥769px) — side-by-side:**

```
+--------------------------------------------------------+
| × Close                                                |
| H3 "Edit Document"                                     |
|    ○─────●─────○                                       |
|                                                        |
| Body text: "Edit the markdown on the left. The         |
| preview on the right updates as you type."             |
|                                                        |
| ┌─────────────────────┐ ┌──────────────────────┐       |
| │ # Anna M.           │ │ Anna M.              │       |
| │ **Date:** 2026-...  │ │ Date: 2026-04-27     │       |
| │                     │ │                      │       |
| │ ## Trapped Emotions │ │ ── (h2-styled)       │       |
| │ ...                 │ │ Trapped Emotions     │       |
| │                     │ │                      │       |
| │ Markdown textarea   │ │ Live HTML preview    │       |
| └─────────────────────┘ └──────────────────────┘       |
|                                                        |
| [Translate via Google ↗]                               |
+--------------------------------------------------------+
| [← Back]              [Next: Get document →]           |
+--------------------------------------------------------+
```

**Mobile (≤768px) — tabs:**

```
+------------------------------------------------+
| × Close                                        |
| H3 "Edit Document"                             |
|    ○─────●─────○                               |
|                                                |
| [ Edit ] [ Preview ]   <- segmented tab        |
|                                                |
| ┌──────────────────────────────────────────┐   |
| │ # Anna M.                                │   |
| │ **Date:** 2026-04-27                     │   |
| │ ...                                      │   |
| │ Markdown textarea (full width)           │   |
| └──────────────────────────────────────────┘   |
|                                                |
| [Translate via Google ↗]                       |
+------------------------------------------------+
| [← Back]              [Next →]                 |
+------------------------------------------------+
```

**Editor pane:**

| Property | Value |
|----------|-------|
| Element | `<textarea class="textarea export-editor">` |
| Font | Body 16px (intentionally NOT a monospaced font — Sapir is editing Hebrew prose, not code) |
| Min-height | `300px` desktop, `240px` mobile |
| Padding | `md (16px)` |
| Border | `1px solid var(--color-border)` |
| Border-radius | `14px` (matches existing `.input`/`.textarea`) |
| RTL | `dir="auto"` so Hebrew renders right-to-left within the textarea while UI chrome stays in current language direction |
| Spell-check | `spellcheck="true"` — Hebrew/German benefit |

**Preview pane:**

| Property | Value |
|----------|-------|
| Container | `padding: md`; `border: 1px solid var(--color-border-soft)`; `border-radius: 14px`; `background: var(--color-surface)`; `min-height` matches editor; `overflow-y: auto` |
| Headings (h1) | Section heading 22px / 800; `margin-bottom: sm` |
| Headings (h2) | 18px / 700; `margin-block: md sm`; `border-block-end: 1px solid var(--color-border-soft)`; `padding-block-end: xs` |
| Headings (h3) | 16px / 700; `margin-block: md xs` |
| Body paragraphs | Body 16px / 1.5 |
| Bold | Inherit weight 700 |
| Italic | Standard italic |
| Lists | `padding-inline-start: lg`; bullet color `var(--color-text-muted)` |
| Line breaks | preserve via `<br>` |

**Mobile tab control:**

| Property | Value |
|----------|-------|
| Layout | Segmented `display: inline-flex` — looks like the existing `.toggle-group` |
| Item | `padding: sm md`; `border-radius: 12px`; default `background: var(--color-surface-toggle)` |
| Active | `background: var(--color-primary-soft)`; `color: var(--color-primary-dark)`; `font-weight: 700` |
| Tap target | `min-height: 44px` |

### Step 3 — Output Actions

```
+------------------------------------------------+
| × Close                                        |
| H3 "Get document"                              |
|    ○─────○─────●                               |
|                                                |
| Body text:                                     |
| "Choose how to deliver the document."          |
|                                                |
| ┌──────────────────────────────────────────┐   |
| │ 📄 Download PDF                          │   |
| │ AnnaM_2026-04-27.pdf · A4 · ~80 KB       │   |
| └──────────────────────────────────────────┘   |
|                                                |
| ┌──────────────────────────────────────────┐   |
| │ M↓ Download Markdown                     │   |
| │ AnnaM_2026-04-27.md · plain text         │   |
| └──────────────────────────────────────────┘   |
|                                                |
| ┌──────────────────────────────────────────┐   |
| │ ↗  Share via device                      │   |
| │ Open share sheet (PDF attached)          │   |
| └──────────────────────────────────────────┘   |
| (only renders if navigator.canShare returns ✓) |
+------------------------------------------------+
| [← Back]                            [ Done ]   |
+------------------------------------------------+
```

**Output card spec:**

| Property | Value |
|----------|-------|
| Container | `display: flex; align-items: center; gap: md`; `padding: md`; `border: 1px solid var(--color-border)`; `border-radius: 16px`; `background: var(--color-surface)`; `margin-bottom: sm`; `cursor: pointer`; `min-height: 64px` |
| Hover | `background: var(--color-surface-hover)`; `transform: translateY(-1px)`; `box-shadow: var(--shadow-button)` |
| Icon | 32×32px leading; `color: var(--color-primary-dark)` |
| Title | Label 14px / 600 |
| Subtitle | Microcopy 13px / 400 / muted — shows filename + size hint |
| Whole card focusable & clickable | `<button type="button" class="output-card">` (semantic) |
| Loading state (PDF) | While jsPDF loads on first click, replace icon with spinner; subtitle = "Preparing PDF..." (i18n) |

**Translate shortcut placement** (referenced from Step 2 — lives below the editor/preview, above the action bar):

| Property | Value |
|----------|-------|
| Element | `.button.ghost.icon-inline` |
| Icon | External-link arrow SVG (↗) |
| Label | "Translate via Google" (i18n key `export.translate.cta`) |
| Tooltip / aria | "Opens translate.google.com in a new tab with the current text" (i18n key `export.translate.tooltip`) |
| Behavior | `target="_blank" rel="noopener noreferrer"` — opens new tab with `q=` query param prefilled |

---

## Header Entry Point — Gear Icon (Feature A entry)

Mounts in `header-actions` (existing `id="headerActions"` mount point in `app.js:85, 112`).

| Property | Value |
|----------|-------|
| Element | `<button class="header-control-btn settings-gear-btn">` |
| Size | 36×36px (matches existing `.header-control-btn` at `app.css:126`) |
| Icon | Inline SVG gear (24px viewBox, 20×20px rendered, `currentColor` stroke 1.8) |
| Insertion order in `headerActions` | After globe-lang, after theme-toggle, before license-key (so the visual order RTL-aware reads: lang | theme | settings | license) |
| Tooltip / aria-label | i18n key `header.settings.label` = "Settings" / "הגדרות" / "Einstellungen" / "Nastavení" |
| Active state (when on `settings.html`) | `background: var(--color-primary-soft)`; `color: var(--color-primary-dark)` |
| Tap target | 44×44px on mobile via global rule at `app.css:1147-1154` (already covers `.header-control-btn`) |

---

## Export Button — Session Edit Page (Feature B entry)

Lives inside `.session-header-actions` at `add-session.html:51` next to the existing Copy MD button.

```html
<div class="session-header-actions">
  <button class="button ghost icon-inline" id="copySessionBtn">
    <span data-i18n="session.copyAll">Copy Session (MD)</span>
    <span class="button-icon">📋</span>
  </button>
  <button class="button icon-inline" id="exportSessionBtn">  <!-- NEW -->
    <span data-i18n="session.export">Export</span>
    <span class="button-icon">📤</span>
  </button>
  <button class="icon-button" id="editSessionBtn">✎</button>
</div>
```

| Property | Value |
|----------|-------|
| Visibility | Visible only in **read mode** (loaded session). Hidden during creation of a new unsaved session — same gate as Copy MD. |
| Style | `.button.icon-inline` (NOT `.button.ghost` — Export is the higher-priority action of the two; Copy MD becomes the secondary ghost button) |
| Color | Primary (uses `--color-primary` background) |
| Icon | Outbox/share glyph 📤 (HTML entity is cross-platform safe; falls back to plain unicode) |
| Order on desktop | Copy MD (ghost) → Export (primary) → Edit (icon-button) |
| Order on mobile | Same order; the row wraps if needed (`flex-wrap: wrap` already on `.session-header-actions`) |

---

## Copywriting Contract

### Primary CTAs — verb + noun

| Element | en | he | de | cs |
|---------|----|----|----|----|
| Settings page save | "Save changes" | "שמור שינויים" | "Änderungen speichern" | "Uložit změny" |
| Settings page cancel | "Cancel" | "ביטול" | "Abbrechen" | "Zrušit" |
| Settings row reset | "Reset to default" | "אפס לברירת מחדל" | "Auf Standard zurücksetzen" | "Obnovit výchozí" |
| Export modal step 1 next | "Next: Edit document" | "הבא: ערוך מסמך" | "Weiter: Dokument bearbeiten" | "Další: Upravit dokument" |
| Export modal step 2 next | "Next: Get document" | "הבא: קבל מסמך" | "Weiter: Dokument abrufen" | "Další: Získat dokument" |
| Export modal step 3 done | "Done" | "סיים" | "Fertig" | "Hotovo" |
| Export modal back | "Back" | "חזור" | "Zurück" | "Zpět" |
| Output card — PDF | "Download PDF" | "הורד PDF" | "PDF herunterladen" | "Stáhnout PDF" |
| Output card — MD | "Download Markdown" | "הורד Markdown" | "Markdown herunterladen" | "Stáhnout Markdown" |
| Output card — Share | "Share via device" | "שתף דרך המכשיר" | "Über Gerät teilen" | "Sdílet přes zařízení" |
| Translate CTA | "Translate via Google" | "תרגם דרך Google" | "Mit Google übersetzen" | "Přeložit přes Google" |
| Header gear tooltip | "Settings" | "הגדרות" | "Einstellungen" | "Nastavení" |
| Session header export | "Export" | "ייצוא" | "Exportieren" | "Exportovat" |

### Settings page top-of-page copy

**Heading (en):** "Settings"
**Heading helper (en):** "Customize section names and choose which sections appear in your sessions. Changes are saved on this device."

**Sticky info banner (en):**
- Heading: "About saved settings"
- Body: "Saved labels appear immediately here. Open session forms will pick up the new labels on next page navigation. Refresh other tabs to see changes immediately."

i18n keys:
- `settings.page.title`
- `settings.page.helper`
- `settings.syncMessage.heading`
- `settings.syncMessage.body`

### Empty / dirty / error states

| State | Copy (en) | i18n key |
|-------|-----------|----------|
| Settings — no overrides yet (informational, not blocking) | (No empty state — page always shows the 9 default rows) | — |
| Settings — unsaved changes confirm on Cancel | "Discard unsaved changes?" + "Yes, discard" / "Keep editing" | `settings.discard.title` / `settings.discard.confirm` / `settings.discard.cancel` |
| Settings — save success toast | "Settings saved" | `settings.saved.toast` |
| Settings — rename input too long | "Section name is too long. Maximum 60 characters." | `settings.rename.tooLong` |
| Settings — rename input is whitespace only | "Enter a name or leave blank to use the default." | `settings.rename.empty` |
| Export — session has no content to export | "This session has no content yet. Save the session first." | `export.empty.body` |
| Export — preview unsaved-edits discard confirm | "Discard your edits?" + "Yes, discard" / "Keep editing" | `export.discard.title` / `export.discard.yes` / `export.discard.no` |
| Export — PDF generation failed | "Could not generate PDF. Try again, or download Markdown instead." | `export.pdf.failed` |
| Export — Web Share unsupported (silently hides button — no error visible) | (No copy required — button just doesn't render) | — |
| Export — Web Share user cancelled (silent, no error) | (No copy — `AbortError` swallowed) | — |
| Export — clipboard copy success toast | "Copied to clipboard" (existing key `toast.copied`) | reuse existing |
| Disabled-section indicator (Settings + Export) | "Disabled in Settings" | `settings.indicator.disabled` |

### Destructive confirmations

| Action | Copy | i18n key |
|--------|------|----------|
| Cancel Settings page with dirty form | Title: "Discard unsaved changes?" / Body: "Your renames and toggles won't be saved." / Confirm: "Yes, discard" / Cancel: "Keep editing" | `settings.discard.*` |
| Close export modal mid-edit (step 2 with edits) | Title: "Discard your edits?" / Body: "Your changes to the document will be lost." / Confirm: "Yes, discard" / Cancel: "Keep editing" | `export.discard.*` |

**Note:** Phase 21 already established the discard-confirm contract for modal overlay-close (D-03 in `21-CONTEXT.md`). The export modal **MUST** reuse the same `confirm-card` pattern — do not introduce a new dialog style.

---

## Microcopy — Section Descriptions on Settings Page

To help therapists who do **not** know the Emotion Code vocabulary understand what each section is for. Each ≤ 80 chars.

| Section i18n key | Description (en) | i18n key |
|------------------|------------------|----------|
| `session.form.trapped` | "Released emotions logged during the session" | `settings.row.trapped.description` |
| `session.form.insights` | "Physical or somatic notes from the session" | `settings.row.insights.description` |
| `session.form.limitingBeliefs` | "Beliefs surfaced or worked on this session" | `settings.row.limitingBeliefs.description` |
| `session.form.additionalTech` | "Other tools or techniques used in this session" | `settings.row.additionalTech.description` |
| `session.form.heartShield` | "Heart Shield session toggle and controls" | `settings.row.heartShield.description` |
| `session.form.heartShieldEmotions` | "Emotions found inside the Heart Shield" | `settings.row.heartShieldEmotions.description` |
| `session.form.issuesHeading` | "The issues addressed and their before/after severity" | `settings.row.issues.description` |
| `session.form.comments` | "Free-form notes and observations" | `settings.row.comments.description` |
| `session.form.nextSession` | "What to focus on or carry into the next session" | `settings.row.nextSession.description` |

These descriptions are **the same string** in all UI languages (translated, but not customizable per language). Therapist sees the description in their UI language and the rename input below.

---

## Icon Inventory

Phase 22 uses inline SVG (project precedent — see globe `app.js:124`, leaf `add-session.html:30`). No icon library dependency.

| Icon | Use | SVG source |
|------|-----|------------|
| Gear | Header gear button | 24×24 viewBox; standard 8-cog gear path (`fill: none; stroke: currentColor; stroke-width: 1.8`) |
| Refresh-arrow | Settings row reset | 24×24 viewBox; circular-arrow path |
| External-link | Translate CTA | 24×24 viewBox; box-with-arrow path |
| Document (page) | Export PDF output card | 24×24 viewBox; document-with-corner-fold |
| Markdown | Export MD output card | Use simple "M↓" glyph styled as text (no good universal SVG; matches GitHub convention) |
| Share | Export Share output card and session-header export button | 24×24 viewBox; three-circle-with-connectors share path |
| Info circle | Sticky info banner on Settings | 24×24 viewBox; circle with `i` |
| Check / cross / chevron | Existing patterns — reuse `.toggle-switch` from `app.css:1604` |

**Source:** All SVGs hand-coded (matches existing precedent — no fetched/imported icon set). Researcher-recommended baseline shapes from Heroicons / Lucide visual language without copying the licensed SVG bytes.

---

## Mobile / RTL / Accessibility Contract

| Concern | Spec |
|---------|------|
| Mobile breakpoint | Existing 768/480 (Phase 21 D-01); no new breakpoints |
| 375px viewport (iPhone SE) | Settings rows stack; export modal step indicator drops labels; output cards keep full width |
| Tap targets | 44×44px enforced by global rule at `app.css:1147-1154`; all new buttons inherit |
| RTL (Hebrew) | Logical CSS properties only (`inset-inline-start`, `padding-inline`, `margin-inline-end`); `dir="auto"` on textareas; chevrons in step indicator do NOT flip (numeric progression reads left-to-right in all languages) |
| Focus visible | Reuse existing `:focus-visible` styles where they exist (e.g. `.button.icon-swap:focus-visible` in `app.css:429`); add `outline: 2px solid var(--color-primary); outline-offset: 2px` for new custom interactive elements (output cards) |
| ARIA | Modal: `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (matches existing `confirmModal` pattern at `add-session.html:352`); step indicator `role="progressbar"` with `aria-valuenow`/`aria-valuemax`; greyed checkboxes `aria-disabled="true"` and `aria-describedby` pointing to the indicator |
| Keyboard | Tab order: step indicator → form controls → action bar; Esc closes modal (with discard confirm if dirty); Enter on a checkbox row toggles |
| Screen reader for "Disabled in Settings" indicator | Indicator `<span>` has `aria-hidden="false"`; row container has `aria-describedby` pointing to it |

---

## Color Token Cross-Reference (for the executor)

When implementing, prefer existing semantic tokens. New CSS in `assets/settings.css` (or appended to `app.css`) MUST use these — never hex literals.

| Need | Token |
|------|-------|
| Page background | `var(--color-background)` |
| Card / row background | `var(--color-surface)` |
| Hover background on row | `var(--color-surface-hover)` |
| Disabled / muted background | `var(--color-surface-disabled)` |
| Primary text | `var(--color-text)` |
| Secondary / helper text | `var(--color-text-muted)` |
| Default border | `var(--color-border)` |
| Soft border (between rows) | `var(--color-border-soft)` |
| Primary CTA bg | `var(--color-primary)` |
| Primary CTA text | `var(--color-surface)` |
| Primary CTA shadow | `var(--shadow-button)` |
| Modal card shadow | `var(--shadow-modal)` |
| Modal overlay | `var(--color-modal-overlay-bg)` |
| Info banner | `var(--color-info-bg)` / `var(--color-info-text)` |
| Destructive | `var(--color-danger)` / `var(--shadow-danger)` |
| Toast bg (existing) | `var(--color-toast-bg)` |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable |
| third-party | none | not applicable |

**No third-party registries declared. No external component blocks introduced in Phase 22.**

The two vendored libraries used in this phase — jsPDF + Noto Sans / Noto Sans Hebrew — are NOT design-system registries. They are runtime dependencies vetted in CONTEXT.md D-01 / D-02. Safety vetting for them happens in plan-phase / code review, not here.

---

## Cross-Phase Anchors

This UI-SPEC inherits and does not override:

- **Phase 21 modal contract** — `max-height: 90dvh`, scroll body, pinned actions, body-scroll-lock, overlay-close-discard-confirm. Locked at `21-CONTEXT.md` D-01 through D-04.
- **Phase 21 z-index scale** — `--z-modal: 300` for export dialog, `--z-toast: 400` for confirmation toasts, `--z-dropdown: 100` for the lang popover from header.
- **Phase 21 44px tap targets** — global rule at `app.css:1144-1155`.
- **Phase 18 RTL standard** — logical properties only; `html[dir=rtl]` selector pattern.
- **Phase 14 globe popover pattern** — gear-icon popover would mirror this if added (currently the gear is a simple link, not a popover).
- **Phase 1 design tokens** — every color in this spec resolves to a `var(--color-*)` from `assets/tokens.css`. No new color tokens introduced.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS — every CTA, empty/error/dirty state, destructive confirm, and indicator copy declared in 4 languages
- [ ] Dimension 2 Visuals: PASS — Settings 9-row layout (single-column rationale documented), 3-step modal architecture, step indicator, output cards
- [ ] Dimension 3 Color: PASS — 60/30/10 inherited from existing tokens; accent (primary green) reserved-for list explicit; no new hex literals introduced
- [ ] Dimension 4 Typography: PASS — 4 declared roles (Body 16/400/1.5, Label 14/600/1.4, Section 22/800/1.25, Microcopy 13/600/1.4); Rubik weights 400/600/800 only
- [ ] Dimension 5 Spacing: PASS — 8-multiple scale (4/8/12/16/24/32/48/64) declared; logical-property rule mandated; 44px tap-target floor stated
- [ ] Dimension 6 Registry Safety: PASS — no third-party design registries used; not applicable

**Approval:** pending checker run

---

*Phase 22 — UI Design Contract*
*Created: 2026-04-27*
*Locks visual + interaction surface for: Settings page (9-row form), Export modal (3-step flow), header gear-icon entry, session-page Export button.*
*Next: `/gsd-ui-checker 22` then `/gsd-plan-phase 22`.*
