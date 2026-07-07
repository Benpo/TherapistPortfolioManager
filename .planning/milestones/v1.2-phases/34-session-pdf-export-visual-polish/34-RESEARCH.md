# Phase 34: Session PDF Export Visual Polish - Research

**Researched:** 2026-06-29
**Domain:** jsPDF print-document rendering (vanilla JS IIFE), RTL/bidi, IndexedDB data derivation, Node `node:test`-style behavior testing
**Confidence:** HIGH (all claims are direct file:line reads of the live codebase)

## Summary

This phase redesigns the client-facing session-export PDF in `assets/pdf-export.js` (1198 lines). The design is LOCKED; this research de-risks the implementation and produces a falsifiable validation strategy. The renderer is a single IIFE (`window.PDFExport`) with a lazy-load chain (jsPDF 2.5.2 + bidi-js + Heebo normal/bold base64 fonts), a mature Phase-23 RTL pipeline (`shapeForJsPdf` / `drawSegmentedLine` with the `isInputVisual:false` invariant on every `doc.text()`), and a linear block renderer driven by `parseMarkdown`. The new structural elements (header band, client card, pill, severity bars, footer band) slot in around the existing `drawPage1Header()` / footer-pass code and largely **add** rather than replace the body block loop.

Three findings sharpen the locked design. **(1)** The in-person/remote field is `sessionType` with values **`clinic` / `online` / `other`** (NOT "remote") — and all four locales already carry `session.type.*` keys, so there is **no missing DE/CS i18n key** (the spec's FLAG-3/FLAG-5 worry is resolved: no new keys needed for the pill). The localized label already flows into `buildSessionPDF` today as `sessionData.sessionType`. **(2)** `getSessionsByClient()` does **NOT sort** — it returns `index.getAll(clientId)` ordered by primary key `id`, so FN-1 must sort ascending by `date` with an `id` tie-break at export time. **(3)** `buildSessionPDF` currently receives only `{clientName, sessionDate, sessionType, markdown}` and renders severity as markdown text; the redesign requires extending that contract with a **structured `issues` array** and a **derived `sessionNumber`**, both of which are reachable from the export-modal `ctx` (`getEditingSession().clientId/.id` + `getIssuesPayload()`).

The single highest-risk test interaction: `tests/pdf-latin-regression.test.js` byte-hashes the whole PDF for 5 fixtures against committed `.sha256` baselines. **Any** layout change breaks all 5 — they must be regenerated via the file's built-in `--regenerate` mode. The content-stream *floor* tests (glyph-coverage, digit-order, bold-rendering, the quick-* list tests) are layout-robust and form the RTL non-regression spine that must stay green.

**Primary recommendation:** Bundle the logo as a base64 JS module (`heebo-base64.js` pattern) loaded in the existing lazy-load chain — zero network, zero SW-precache dependency. Extend the `buildSessionPDF` data contract with `issues[]` + `sessionNumber`. Add new draw helpers (band/card/pill/severity/footer) that reuse `shapeForJsPdf` + the `docDir` anchor convention so RTL is preserved by construction. Regenerate the 5 SHA fixtures deliberately; keep every content-stream floor test green.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PDF geometry / fills / text | `assets/pdf-export.js` (render) | — | All drawing primitives live here; the only file that touches jsPDF |
| Session-ordinal derivation (FN-1) | `assets/export-modal.js` (data assembly) | `assets/db.js` `getSessionsByClient` | Ordinal is computed at export time from DB query results, then passed in — keep the renderer a pure function of its inputs (deterministic for tests) |
| In-person/remote label (FN-2) | `assets/app.js` `formatSessionType` → export-modal | i18n dicts | Localization already resolved before the renderer; pill renders the verbatim label |
| Severity payload (FN-2/Q4) | `assets/add-session.js` `getIssuesPayload` → export-modal | — | Structured `{name,before,after}` produced in add-session; export-modal must forward it as structured data, not markdown |
| Logo bytes (FN-3) | new base64 asset module | SW precache (fallback path) | Embed deterministically; never fetch |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jsPDF | **2.5.2** (built 2024-09-17) | PDF generation | Already vendored at `assets/jspdf.min.js` `[VERIFIED: header comment line 2-3]`; locked, do not bump |
| bidi-js | 1.0.3 | UAX#9 reorder/mirror for Hebrew | Vendored `assets/bidi.min.js`; drives `shapeForJsPdf` |
| Heebo (TTF base64) | normal(400)+bold(700) | unified Hebrew+Latin glyphs | `registerFonts()` registers ONLY `normal` + `bold` — **no medium/500 face** `[VERIFIED: pdf-export.js:194-205]` |
| jsdom | ^29.1.1 (dev-only) | test harness for PDF builds | `[VERIFIED: package.json:10]`; production ships zero runtime deps |

### jsPDF primitives confirmed available (2.5.2)
| Primitive | Status | Use in this phase |
|-----------|--------|-------------------|
| `rect(x,y,w,h,'F')` | available | full-bleed header/footer band fills |
| `roundedRect(x,y,w,h,rx,ry,style)` | available (fill `'F'` + stroke `'S'`) | client card, pill, severity track, logo keyline |
| `addImage(data,'PNG',x,y,w,h)` | available | embedded logo |
| `setFillColor / setDrawColor / setLineWidth / line` | available | bands, rules, bar fills |
| `triangle(x1,y1,x2,y2,x3,y3,style)` | available | leaf-diamond bullet (see Pattern 3) |
| `GState({opacity})` | available but **avoid** | before-bar opacity — use flat hex instead (D-locked, FLAG-6) |

**No existing `addImage`, `roundedRect`, `triangle`, or `GState` call exists in `pdf-export.js`** `[VERIFIED: grep returned NONE]` — every new primitive is greenfield within this file.

### Installation
No new packages. No `npm install`. Production is dependency-free; jsPDF/bidi/Heebo are already vendored and precached.

## Package Legitimacy Audit

Not applicable — this phase installs **no external packages**. All dependencies (jsPDF 2.5.2, bidi-js, Heebo, jsdom) are already vendored/installed and locked. No registry interaction occurs.

## User Constraints (from locked design docs)

> No CONTEXT.md exists for phase 34; the constraints below are the locked decisions from `34-DESIGN-DECISIONS.md` + `34-UI-SPEC.md` + the research brief. Treat as locked.

### Locked Decisions
- **Hebrew RTL/bidi must not regress.** Every `doc.text()` keeps `isInputVisual:false`; `docDir = (opts.uiLang==='he')?'rtl':'ltr'` `[VERIFIED: pdf-export.js:682, 735-744]`. New blocks mirror: content anchors to the start edge, bar fills grow from the start edge.
- **Phase 30/23 PDF test suite stays green** (`npm test`); layout-assertion baselines updated deliberately.
- **Offline / zero-network.** Logo is an embedded PNG, never fetched. A4 portrait, 71pt margins (`MARGIN_X=MARGIN_TOP=MARGIN_BOTTOM=71`) `[VERIFIED: pdf-export.js:701-703]`.
- Border colors per mockup: card `#c8e6d4`, section rule `#bfe0b0`, severity/footer rule `#eef7ea`. (Note UI-SPEC FLAG-2 pins `#bfe0b0` for card; the brief pins `#c8e6d4` — **the brief wins**, see Open Questions.)
- Content inset 71pt; bands full-bleed x=0→595 with content inset to 71pt.
- Before-bar opacity = pre-computed flat hex (~`#ee6a6a`), NOT GState (keep renderer deterministic).
- Logo: accept square PNG under rounded green keyline (no new clipped asset).
- Header subtitle: EN "A personal session summary" / HE "סיכום אישי של המפגש". Footer date relabel "Exported on".

### Claude's Discretion (plan-time)
- DE/CS translations for the header title/subtitle copy (the `session.type.*` pill keys already exist — see FN-2).
- Exact pt slotting of new blocks; whether the logo base64 module vs SW-precache fetch path is used (recommend base64 module).

### Deferred Ideas (OUT OF SCOPE)
- Re-litigating palette, layout, typography, or the two-bar severity treatment.
- Any new session field (in-person/remote reuses existing `sessionType`).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FN-1 | Session #N = derived chronological ordinal | `getSessionsByClient` returns unsorted `getAll` `[db.js:976-986]`; sort asc by `date`, tie-break `id`; data path via `ctx.getEditingSession().clientId` `[add-session.js:972, export-modal.js:12]` |
| FN-2 | In-person/remote pill renders localized value verbatim | Field is `sessionType` ∈ {clinic,online,other}; localized via `App.formatSessionType` `[app.js:1151-1154]`; already passed as `sessionData.sessionType` `[export-modal.js:294, 566]` |
| FN-3 | Logo embedded, offline-safe | `icon-512.png` 512×512 RGB PNG `[VERIFIED: file]`; **byte-identical to precached `logo-512.png`** (md5 `f78c482f…`); recommend base64 module |
| Severity bars | before/after on 0–10 track | `getIssuesPayload()` → `{name,before,after}` `[add-session.js:702, 744]`; pinned by `30-issue-delta` test `[tests/30-issue-delta.test.js:299-304]` |

## Architecture Patterns

### System Architecture Diagram

```
add-session.html (?sessionId=N)
   │  DOMContentLoaded → editingSession = getSession(N)   [add-session.js:1186-1190]
   │  __exportModalInit({ getEditingSession, getSessionId, getIssuesPayload, els })   [add-session.js:971-978]
   ▼
export-modal.js  (data assembly tier)
   │  getCurrentSessionDataForExport() → {clientName, sessionDateISO, sessionTypeLabel}  [289-296]
   │  ── NEW ── ordinal = derive(getSessionsByClient(editingSession.clientId), thisSession)   ← FN-1
   │  ── NEW ── issues  = getIssuesPayload() forwarded as STRUCTURED array                    ← severity
   │  buildSessionPDF({ clientName, sessionDate, sessionType, markdown,
   │                    + sessionNumber, + issues, + exportedOn })  [export-modal.js:563-567]
   ▼
pdf-export.js  (render tier — pure fn of its inputs)
   ensureDeps() → jsPDF + bidi + Heebo(+ NEW logo base64)   [91-121]
   registerFonts(doc)                                        [193-206]
   ┌─ NEW drawHeaderBand()  (full-bleed mint + logo keyline + title/subtitle)
   ├─ NEW drawClientCard()  (roundedRect + name + meta row + pill)   ← replaces drawPage1Header [878-912]
   ├─  parseMarkdown(markdown) → block loop  (summary/trapped-emotions body, UNCHANGED path) [942-1155]
   │     └─ drawSegmentedLine / drawTextLine  (RTL-aware, isInputVisual:false)  [784-872]
   ├─ NEW drawSeverityBlock(issues)  (per-issue row: label + 2 bars on 0–10 track)
   └─ NEW drawFooterBand()  per page  ← extends footer pass [1161-1179]
   → doc.output('blob')
```

File-to-implementation: the new header band + client card **replace** `drawPage1Header()` (`pdf-export.js:878-912`, which currently draws a centered title + meta line). The body block loop (`942-1155`) is **unchanged** for summary/trapped-emotions free text. Severity is currently embedded in the markdown body; the redesign **moves** it out to a structured `drawSeverityBlock` fed by the new `issues` input. The footer pass (`1161-1179`) is **extended** with the band fill + three-zone layout.

### Pattern 1: RTL-safe new block (the load-bearing pattern)
**What:** Any new text must go through `shapeForJsPdf` and anchor by `docDir`, never by raw x.
**When:** Every title/subtitle/name/meta/caption/numeral draw.
**Example:**
```javascript
// Mirror of the existing convention at pdf-export.js:849-872
function drawStartAnchored(text, size, weight, yLine, startInset) {
  doc.setFont('Heebo', weight || 'normal');
  doc.setFontSize(size);
  var visual = shapeForJsPdf(text);              // logical → visual (UAX#9)
  if (docDir === 'rtl') {
    doc.text(visual, PAGE_W - startInset, yLine, { align: 'right', isInputVisual: false });
  } else {
    doc.text(visual, startInset, yLine, { isInputVisual: false });
  }
}
```
`[CITED: pdf-export.js:849-872 drawTextLine — the canonical anchor logic to mirror]`

### Pattern 2: Severity bar fill that grows from the start edge (RTL-correct)
**What:** Track is drawn full-width; the colored fill is a second `roundedRect` whose x depends on `docDir`.
```javascript
// trackX/trackW computed start-anchored; fillW = (value/10) * trackW
var fillX = (docDir === 'rtl') ? (trackRightEdge - fillW) : trackLeftX;
doc.setFillColor('#eef7ea'); doc.roundedRect(trackX, y, 118, 8, 4, 4, 'F'); // track
doc.setFillColor(beforeFlatHex); doc.roundedRect(fillX, y, fillW, 8, 4, 4, 'F'); // fill
```
Numerals draw via Pattern 1 (so digit order stays correct under `isInputVisual:false` — the exact thing `pdf-digit-order.test.js` guards).

### Pattern 3: Leaf-diamond bullet
**What:** A 45° square ≈9pt. **Recommended technique:** two `triangle()` calls (or one `triangle` if a tri-bullet is acceptable) — simplest deterministic path; avoids matrix transforms.
```javascript
// diamond center (cx,cy), half-diagonal d
doc.setFillColor('#7da877');
doc.triangle(cx, cy-d, cx+d, cy, cx, cy+d, 'F');   // right half
doc.triangle(cx, cy-d, cx-d, cy, cx, cy+d, 'F');   // left half
```
Avoid `lines()` polygon close-path quirks; two triangles render identically LTR/RTL (symmetric shape, no mirroring needed).

### Anti-Patterns to Avoid
- **Do NOT use `GState({opacity})`** for the before bar — adds a graphics-state op that perturbs the content stream non-deterministically. Use the pre-lightened flat hex `#ee6a6a` (locked).
- **Do NOT read the session ordinal from `session.id`** — `id` is `autoIncrement` and never renumbers `[db.js:225]`; gaps after deletion. Derive it.
- **Do NOT pass severity as markdown** into the body — pass structured `issues` so `drawSeverityBlock` controls geometry and the data is unit-testable.
- **Do NOT anchor any new text at a hard-coded x** — always `docDir`-branch (RTL regression vector).
- **Do NOT fetch the logo** — embed it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Logical→visual Hebrew ordering | a custom reverse | `shapeForJsPdf` / `shapeForJsPdfWithMap` `[pdf-export.js:259-335]` | UAX#9 + mirror + surrogate-pair handling already correct (12 vectors) |
| Mixed bold/regular runs in a line | manual font swaps | `drawSegmentedLine` `[pdf-export.js:784-847]` | Handles per-run measure + RTL anchor + isInputVisual invariant |
| Rounded shapes | bezier paths | `doc.roundedRect` | Native jsPDF 2.5.2 |
| Date localization | manual formatting | `formatDate` `[pdf-export.js:617-633]` + `App.formatDate` | Already locale-aware (he/de/cs/en) |
| In-person/remote label | hardcoded strings | `App.formatSessionType` `[app.js:1151-1154]` | Localized, already wired into export data |

**Key insight:** Phase 23 already built the hard part (a verified bidi pipeline). New blocks must *consume* it, not reimplement anchoring.

## Runtime State Inventory

This is a render/data-derivation phase, not a rename/migration. No stored data, OS state, or secrets are renamed.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — ordinal is derived at export time, never stored (`sessions` store unchanged) `[db.js:225]` | none |
| Live service config | None | none |
| OS-registered state | None | none |
| Secrets/env vars | None | none |
| Build artifacts | `icon-512.png` not in PRECACHE; recommended new `assets/branding/icon-512-base64.js` must be added to PRECACHE_URLS + lazy-load chain | add precache entry + bump CACHE token (see pre-commit SW note) |

## Common Pitfalls

### Pitfall 1: All 5 SHA-256 fixtures break (expected, not a regression)
**What goes wrong:** `pdf-latin-regression.test.js` hashes the entire PDF for `fixture-en/de/cs/he/he-mixed` against `.planning/fixtures/phase-23/*.pdf.sha256` `[VERIFIED: tests/pdf-latin-regression.test.js:53-143]`. The redesign changes nearly every byte.
**Why:** It is a full-document byte hash, not a geometry assertion.
**How to avoid:** Regenerate deliberately: `node tests/pdf-latin-regression.test.js --regenerate` `[VERIFIED: line 41, 54]`, then visually verify each regenerated PDF matches the mockup before committing the new baselines. Document the regeneration in the plan as an EXPECTED baseline edit.
**Warning signs:** If you regenerate *without* visually verifying, a silent visual regression gets baked into the baseline.

### Pitfall 2: FN-1 ordinal off-by-one or wrong order
**What goes wrong:** Using `getSessionsByClient` results as-is gives `id`-order, not date-order `[db.js:982 index.getAll]`.
**How to avoid:** `sessions.slice().sort((a,b)=> a.date.localeCompare(b.date) || a.id-b.id)`; ordinal = `indexOf(thisSession)+1`. Dates are ISO `YYYY-MM-DD` strings (form `sessionDate.value` `[export-modal.js:291]`), so lexical compare == chronological — **no `new Date()` parsing needed** (avoids TZ gotchas). Tie-break by numeric `id`.
**Warning signs:** Two same-date sessions printing the same N, or N changing when a later session is added.

### Pitfall 3: Export of an unsaved/new session has no ordinal
**What goes wrong:** When `editingSession` is null (new session not yet persisted), `getSessionsByClient` can't locate "this" session.
**How to avoid:** Guard: if no `editingSession`, derive N as `count(existing for client) + 1` or omit the "Session #N" gracefully. Decide at plan time. `[export-modal.js:562 uses _exportState.sessionData OR getCurrentSessionDataForExport]`

### Pitfall 4: Logo offline gap
**What goes wrong:** `icon-512.png` is NOT in `PRECACHE_URLS` (only `logo-512.png` is) `[VERIFIED: sw.js:55]` — a runtime `fetch('icon-512.png')` would fail offline.
**How to avoid:** Two safe options: **(a recommended)** bundle a base64 module `assets/branding/icon-512-base64.js` loaded in the lazy chain (matches `heebo-base64.js`, zero fetch); **(b)** reuse the already-precached `logo-512.png` (byte-identical, md5 `f78c482f4d141b487fa68ce26f7a9558`) via a cache-served fetch. Option (a) is most deterministic for tests.
**Warning signs:** Logo missing in an installed PWA with no network.

### Pitfall 5: Card/severity row splits across a page break
**What goes wrong:** The existing `ensureRoom`/`addPage` logic `[pdf-export.js:945-951]` is per-body-line; a tall client card or a severity row could split.
**How to avoid:** Call `ensureRoom(blockHeight)` with the full measured height *before* drawing the card and each severity row so the whole unit moves to the next page atomically. Verify against a multi-issue, multi-page fixture (FLAG-8).

## Code Examples

### Deriving the FN-1 ordinal (export-modal tier)
```javascript
// Source: composes db.js:976-986 (unsorted getAll) with the FN-1 contract
async function deriveSessionOrdinal(clientId, thisSessionId) {
  const all = await PortfolioDB.getSessionsByClient(clientId);   // unsorted (id order)
  all.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
  const idx = all.findIndex(s => s.id === thisSessionId);
  return idx === -1 ? all.length + 1 : idx + 1;   // unsaved → next ordinal
}
```

### Reading the localized pill value (already available)
```javascript
// Source: export-modal.js:293-294 — sessionTypeLabel is ALREADY localized & passed
const sessionTypeInput = document.querySelector("input[name='sessionType']:checked");
const sessionTypeLabel = App.formatSessionType(sessionTypeInput ? sessionTypeInput.value : "");
// → render sessionTypeLabel verbatim in the pill; no new i18n key needed.
```

## State of the Art

| Old Approach (current code) | Current Approach (this phase) | Impact |
|--------------|------------------|--------|
| Centered title + meta line (`drawPage1Header`) | Full-bleed mint header band + cream client card | Replaces `pdf-export.js:878-912` |
| Severity rendered as markdown text in body | Structured `issues[]` → two-bar `drawSeverityBlock` | New `buildSessionPDF` input + new draw fn |
| `TITLE_SIZE=18`, `BODY_SIZE=11`, `LINE_HEIGHT_BODY=16` `[pdf-export.js:705,718-719]` | client name 23pt, body 11.5pt, line-height ≈19pt | Type-scale bump → SHA baselines regenerate |
| No logo | embedded base64 logo + green keyline | New asset module + addImage |

**Deprecated/outdated:** none — jsPDF 2.5.2, bidi-js, Heebo are locked and current for this project.

## Validation Architecture

> `nyquist_validation` treated as enabled (memory: research re-enabled 2026-06-23). Tests authored BEFORE implementation per `feedback-behavior-verification`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Plain Node scripts (no jest/vitest); each `tests/*.test.js` self-exits 0/1 `[VERIFIED: package.json:7 "node tests/run-all.js"]` |
| Config file | none — `tests/run-all.js` discovers top-level `tests/*.test.js` `[VERIFIED: run-all.js:5-12]` |
| PDF harness | `tests/_helpers/jsdom-pdf-env.js` (jsdom-loads pdf-export.js + builds real PDFs) |
| Quick run command | `node tests/<file>.test.js` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| FN-1 | 3 dated sessions export ordinals 1/2/3; delete middle → remaining are 1/2 (renumbered, no gap) | behavior (jsdom + mock DB) | `node tests/34-session-ordinal.test.js` | ❌ Wave 0 |
| FN-1 | same-date tie-break by `id` is deterministic | behavior | (same file) | ❌ Wave 0 |
| FN-2 | pill renders localized `sessionType` label verbatim (clinic/online/other × en/he/de/cs) | content-stream/glyph | `node tests/34-pill-localized.test.js` | ❌ Wave 0 |
| Severity | `issues[]` `{name,before,after}` 0–10 → two bar fills with widths `value/10×track` | content-stream | `node tests/34-severity-bars.test.js` | ❌ Wave 0 |
| RTL | each new block (band/card/pill/severity/footer) anchors start-edge & digits keep visual order under `uiLang:'he'` | content-stream (extend digit-order/glyph-coverage approach) | `node tests/34-rtl-newblocks.test.js` | ❌ Wave 0 |
| Logo | `addImage` emits an image XObject; export succeeds with no network | behavior | `node tests/34-logo-embed.test.js` | ❌ Wave 0 |
| Baselines | 5 fixtures regenerated & visually verified | golden hash | `node tests/pdf-latin-regression.test.js` (post `--regenerate`) | ✅ exists |

### Existing tests: expected-edit vs must-stay-invariant
| Test | Mechanism | Verdict on redesign |
|------|-----------|---------------------|
| `pdf-latin-regression.test.js` | full-PDF SHA-256 of 5 fixtures `[53-143]` | **EXPECTED BASELINE EDIT** — regenerate all 5 |
| `pdf-digit-order.test.js` | digit-GID order in content stream | **MUST STAY GREEN** — RTL digit spine |
| `pdf-glyph-coverage.test.js` | glyph-emission floor for mixed-script line | **MUST STAY GREEN** |
| `pdf-bold-rendering.test.js` | runtime-derived Tf resource walk for bold | **MUST STAY GREEN** |
| `pdf-bidi.test.js` | pure `shapeForJsPdf` unit (12 vectors, self-contained) | **MUST STAY GREEN** (don't touch `shapeForJsPdf`) |
| `quick-260608-c8x / cx5 / iwr / q8m` (pdf list/para) | content-stream digit/CID + x-anchor | **MUST STAY GREEN** unless markdown body list geometry changes |
| `30-issue-delta.test.js` | add-session `{name,before,after}` payload shape `[299-304]` | **MUST STAY GREEN** — pins the severity data contract this phase consumes |
| `30-rtl-guard.test.js` | app.js `setLanguage` dir attr (NOT pdf) `[1-26]` | unaffected |
| `30-export-stepper.test.js` | export modal stepper UI | likely unaffected (verify if data-assembly wiring changes) |

### Sampling Rate
- **Per task commit:** the touched `tests/34-*.test.js` + `pdf-digit-order` + `pdf-glyph-coverage` (RTL spine, fast).
- **Per wave merge:** full `npm test`.
- **Phase gate:** full suite green (with regenerated, visually-verified SHA baselines) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `tests/34-session-ordinal.test.js` — FN-1 (the Ben-flagged MUST-test): seed 3 dated sessions via mock `PortfolioDB.getSessionsByClient` → assert ordinals 1/2/3 → delete middle → re-derive → assert 1/2. Author BEFORE implementing the derivation. Falsifiable: swap to `session.id` and the renumber case fails.
- [ ] `tests/34-pill-localized.test.js` — FN-2 verbatim localized label across 4 locales.
- [ ] `tests/34-severity-bars.test.js` — bar fill widths proportional to before/after; before uses flat hex (no GState op in stream).
- [ ] `tests/34-rtl-newblocks.test.js` — start-edge anchoring + digit order for new blocks under `uiLang:'he'`.
- [ ] `tests/34-logo-embed.test.js` — image XObject present; build succeeds offline (no fetch).
- [ ] Regeneration protocol doc: follow `.planning/fixtures/phase-23/README.md` for the 5 baselines.

## Security Domain

`security_enforcement` — this phase has **no auth, network, input-parsing-of-untrusted-data, session, access-control, or cryptography surface**. The PDF is generated locally from the user's own IndexedDB data and downloaded via a Blob URL. The only "input" is the therapist's own session text, already handled by the existing markdown path.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | minimal | Session text is first-party; `slugify` already sanitizes filenames `[pdf-export.js:145-155]` |
| V6 Cryptography | no | none |
| V2/V3/V4 (auth/session/access) | no | offline single-user PWA |

No new threat patterns introduced. RTL/bidi correctness is a *correctness* invariant, not a security one.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| jsPDF | rendering | ✓ vendored | 2.5.2 | — |
| bidi-js | RTL | ✓ vendored | 1.0.3 | — |
| Heebo normal+bold | glyphs | ✓ base64 modules | — | — |
| `icon-512.png` bytes | logo | ✓ on disk (RGB 512²) | — | identical `logo-512.png` already precached |
| jsdom | tests | ✓ installed | ^29.1.1 | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** `icon-512.png` is not in `PRECACHE_URLS`; fallback is the byte-identical precached `logo-512.png` or a new base64 module.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ISO `YYYY-MM-DD` lexical sort == chronological for FN-1 (no TZ parse needed) | Pitfall 2 | If dates were stored as locale strings, sort would be wrong — VERIFY `session.date` format is ISO at plan time (form value is ISO `[export-modal.js:291]`, but confirm the persisted `editingSession.date`) |
| A2 | `editingSession` carries `.clientId` and `.id` at export time | FN-1 data path | Verified `editingSession.clientId` used at `add-session.js:1182,1190`; `.id` at `1127`. LOW risk |
| A3 | `triangle()` two-call diamond is the simplest bullet technique | Pattern 3 | If `triangle` fill has a seam artifact, fall back to `lines()` polygon — cosmetic only |
| A4 | Regenerating the 5 SHA baselines is the accepted green-keeping path | Pitfall 1 | Confirmed by the file's own `--regenerate` mode + README; LOW risk |

## Open Questions (RESOLVED)

1. **Card border color: `#bfe0b0` (UI-SPEC FLAG-2) vs `#c8e6d4` (brief + mockup CSS)?**
   - What we know: The research brief explicitly locks `#c8e6d4` for the client card; UI-SPEC FLAG-2 pinned `#bfe0b0`.
   - Recommendation: **Use the brief's `#c8e6d4`** (it post-dates and explicitly overrides FLAG-2: "Border colors MATCH THE MOCKUP"). Section rule stays `#bfe0b0`, severity/footer rule `#eef7ea`. Confirm with Ben at plan time — it's a one-line constant.
   - RESOLVED: D-02 locks the card border to #c8e6d4 (match mockup); section rule stays #bfe0b0.

2. **Unsaved-session export ordinal (Pitfall 3).** Decide: `count+1` vs omit "Session #N". Recommendation: `count+1` (matches what the session will become on save).
   - RESOLVED: D-13/PDFX-03 — export always proceeds on a saved session (Save & export, or Keep editing), so the ordinal is always derivable.

3. **Logo embed mechanism:** base64 module (recommended) vs cache-served fetch of precached `logo-512.png`. Recommendation: base64 module for determinism; adds one PRECACHE entry + one lazy-load step + a CACHE token bump.
   - RESOLVED: base64 module (assets/branding/icon-512-base64.js) per D-05 / Claude's Discretion.

## Sources

### Primary (HIGH confidence — direct codebase reads)
- `assets/pdf-export.js` (1198 lines) — full render pipeline, constants, RTL helpers, footer pass
- `assets/db.js:225, 976-986` — sessions store keyPath/autoIncrement; `getSessionsByClient` (unsorted getAll)
- `assets/export-modal.js:12, 27-31, 289-296, 562-567` — data assembly, ctx accessors, buildSessionPDF call
- `assets/add-session.js:138-142, 702-744, 971-978, 1151-1190` — sessionId param, getIssuesPayload, ctx wiring, editingSession
- `assets/app.js:1151-1154` — formatSessionType
- `assets/i18n-{en,he,de,cs}.js:265-267` — `session.type.{clinic,online,other}` present in ALL 4 locales
- `sw.js:26-80` — PRECACHE_URLS (logo-512.png present, icon-512.png absent)
- `tests/pdf-latin-regression.test.js`, `pdf-digit-order`, `pdf-glyph-coverage`, `pdf-bold-rendering`, `pdf-bidi`, `30-issue-delta`, `30-rtl-guard` — test mechanisms
- `assets/jspdf.min.js:2-3` — version 2.5.2
- `file` + `md5` on `assets/branding/icon-512.png` vs `logo-512.png` — RGB 512², byte-identical

### Secondary / Tertiary
- None — all findings are first-party file reads; no web search needed.

## Metadata

**Confidence breakdown:**
- Implementation map (Q1): HIGH — full file read
- FN-1 data source (Q2): HIGH — getSessionsByClient + ctx path read directly
- FN-2 field/i18n (Q3): HIGH — all 4 locales confirmed; field is sessionType (clinic/online/other), NOT "remote"
- Severity payload (Q4): HIGH — getIssuesPayload + 30-issue-delta pin
- Test inventory (Q5): HIGH — read each test's mechanism
- jsPDF primitives (Q6): HIGH — version confirmed; primitives standard in 2.5.2; flat-hex decision sound
- Logo/offline (Q7): HIGH — asset verified, precache gap identified, base64 path recommended

**Research date:** 2026-06-29
**Valid until:** 2026-07-29 (stable; locked deps, no fast-moving externals)
