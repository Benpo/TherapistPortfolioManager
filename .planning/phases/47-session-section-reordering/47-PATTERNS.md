# Phase 47: Session-Section Reordering - Pattern Map

**Mapped:** 2026-07-23
**Files analyzed:** 9 modified + 6 new test files
**Analogs found:** 14 / 15 (1 net-new artifact: the order sentinel + shared validator have partial analogs only)

> This is a **reuse/refactor phase** in a zero-build, zero-npm vanilla-JS PWA. Every file "created" here is actually a NEW function/section INSIDE an existing file, or a NEW test modeled on an existing one. The analogs are all in-repo and were read directly this session. The RESEARCH.md already carries the architectural proposals (A1-A9, "researcher proposes, plan review confirms") — this map ties each to the concrete source lines to copy from.

---

## File Classification

| File / New Artifact | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `db.js` — order sentinel put/read | model / persistence | CRUD | `db.js` `_writeTherapistSentinel` / `snippetsDeletedSeeds` (L920-963) | exact (same file, same pattern) |
| `backup.js` — restore allowlist + sanitize | model / persistence | file-I/O (backup round-trip) | `backup.js` `ALLOWED_SENTINEL_KEYS` loop (L1157-1181) | exact |
| `app.js` — `getSectionOrder()` cache + validator | service / shared layer | request-response (sync read) | `app.js` `_sectionLabelCache`/`_snippetCache` + BroadcastChannel (L39-110, L840-869) | exact |
| `settings.js` — grouped reorder list, drag, arrows, Reset order/names, ⓘ | component / UI | event-driven (pointer/click) | `settings.js` `SECTION_DEFS`/`renderRow`/`buildSvg`/Save-staging (L35-96, L449) + `47-mockups.html` `wireDrag` | role-match (rows exist; drag is new-but-mocked) |
| `add-session.html` / `add-session.js` — order-driven render, — skip, after-block hide | component / form | transform (order → DOM) | `add-session.js` `applySectionVisibility`/`applySectionLabels` (L997-1042), `createIssueBlock` (L716-828) | role-match |
| `app.js` — severity `—` (skip) marker | utility / widget primitive | transform | `app.js` `createSeverityScale`/`getSeverityValue` (L1209-1244) | exact (extend in place) |
| `export-modal.js` — order-driven emit, topics/severity split, re-derive count | service | transform (data → markdown) | `export-modal.js` `EXPORT_SECTION_ORDER` (L343), `severityAfterSections` (L755-773), Step-1 renderer (L517) | exact (repoint) |
| `pdf-export.js` — severity-block placement | service | transform (data → PDF) | `pdf-export.js` `drawSeverityBlock` loop (L1425-1501) — **loop UNCHANGED, only input changes** | exact |
| `tests/30-export-markdown.test.js` — three-way invariant rewrite | test | — | itself (rewrite against MUTATED saved order) | exact |
| `tests/47-order-sentinel.test.js` (NEW) | test | — | `tests/25-10-snippets-sentinel-roundtrip.test.js` | role-match |
| `tests/47-order-backup-roundtrip.test.js` (NEW) | test | — | `tests/45-backup-roundtrip.test.js` | role-match |
| `tests/47-order-sanitize.test.js` (NEW) | test | — | pure-fn unit (no direct analog) | no-analog |
| `tests/47-severity-skip.test.js` (NEW) | test | — | existing severity/export tests | role-match |
| `tests/47-severity-position.test.js` (NEW) | test | — | pure-fn unit | role-match |
| Docs: `help-content-en.js` + `changelog-content-en.js` | content | — | existing topic entries (HELP-MAP.md index) | exact |

---

## Pattern Assignments

### `db.js` — order sentinel (model, CRUD)

**Analog:** `_writeTherapistSentinel` + `_SENTINEL_KEYS` — SAME FILE, L920-996.

**Lock-step registration** (L920 — the comment at L917-919 explicitly mandates the backup.js twin):
```javascript
const _SENTINEL_KEYS = new Set([DELETED_SEEDS_KEY]); // add "sectionOrder"
```

**Write path** (L947-963) — note the dedicated raw `put` that BYPASSES `setTherapistSetting`'s `{customLabel,enabled}` coercion. The order record must NOT use `setTherapistSetting` (RESEARCH A2). The array-coercion discipline (L955-956, non-array → `[]`) is the type-guard template for coercing a malformed `items[]` to the D-02 default on read:
```javascript
const rawIds = Array.isArray(record.deletedIds) ? record.deletedIds : [];
const cleanIds = rawIds.filter((x) => typeof x === "string");
return withStore("therapistSettings", "readwrite", (store) =>
  store.put({ sectionKey: record.sectionKey, deletedIds: cleanIds }));
```

**Read path:** `getAllTherapistSettings` (L987-996) already returns ALL rows — the order row rides the same `getAll`; filter it out of section-row walkers by `sectionKey === "sectionOrder"`.

---

### `backup.js` — restore allowlist + sanitize (model, file-I/O)

**Analog:** sentinel restore branch — SAME FILE, L1157-1181.

**Allowlist twin** (L1157) — MUST match `db.js#_SENTINEL_KEYS` or restore silently drops the order (ORDR-05):
```javascript
var ALLOWED_SENTINEL_KEYS = new Set(["snippetsDeletedSeeds"]); // add "sectionOrder"
```

**Restore branch pattern** (L1164-1181): sentinel branch comes BEFORE the `ALLOWED_SECTION_KEYS` check (CR-02 fix) so it doesn't trip "unknown sectionKey". The new order branch mirrors this shape but calls `_writeTherapistSentinel` with `items` and — critically per Interaction 11 / Pitfall 2 — pipes the restored `items` through the shared `sanitizeOrder` validator BEFORE writing (a restored/old backup must be clamped, else the invariant is theater). Absent order row → D-02 default (RESEARCH A8).

**Security (V5):** `ALLOWED_SECTION_KEYS` (L1146-1156) is the key allowlist — restored order `items[].key` / `members[]` must be filtered against it; unknown keys dropped.

---

### `app.js` — `getSectionOrder()` cache + shared validator (service, request-response)

**Analog:** `_sectionLabelCache` / `_snippetCache` eager-load + sync-read — SAME FILE.

**Cache declaration** (L39, L44): add `let _sectionOrderCache = null;` sibling. **Sync reader** mirrors `getSnippets` (L87-89, returns a copy) and `getSectionLabel` (L58-64):
```javascript
function getSectionOrder() { /* return _sectionOrderCache || defaultOrder(); sync */ }
```

**Eager load** in `initCommon` (L842-851 shows the snippet eager-load template) — load the order row alongside snippets so form/export read synchronously (D-16 snapshot).

**Cross-tab refresh** (L856-868): the `BroadcastChannel("sessions-garden-settings")` + `therapist-settings-changed` handler already rebuilds `_sectionLabelCache` (L864). Rebuild `_sectionOrderCache` in the SAME handler — one message invalidates both, else a peer tab renders stale order.

**Shared move-validator** lives here too (RESEARCH Pattern 2 `sanitizeOrder`) — one pure fn consulted by settings drag, arrows, load, AND backup restore. Enforces topics-before-afterSeverity clamp (Interaction 11).

---

### `settings.js` — grouped reorder list (component, event-driven)

**Analog:** `SECTION_DEFS` + `renderRow` + Save staging — SAME FILE; drag from `47-mockups.html` `wireDrag`.

**Schema** (L39-49): the canonical 9-row `SECTION_DEFS` is the source; the grouped list layers group-header rows + indented member rows over these. **`LOCKED_RENAME`** (L35 = `heartShield`,`issues`,`nextSession`) → these keep NO ✎; groups GET ✎ (D-05).

**Icon builder** (L62-96): `buildSvg` (DOM-API only, never innerHTML) is the contract for drag-handle ⠿, ↑/↓ arrows, and the ⓘ severity-explainer — `buildInfoIconSvg` (L74) and `buildResetIconSvg` (L86) are ready-made; add handle + chevron builders the same way.

**Pointer drag** (from `47-mockups.html` `wireDrag`, RESEARCH Code Examples) — pointer events + PHYSICAL `getBoundingClientRect` (never `inset-inline`, repo memory `reference-rtl-logical-props-physical-coords`); `touch-action:none` on the handle:
```javascript
handle.addEventListener('pointerdown', e => {
  e.preventDefault(); handle.setPointerCapture(e.pointerId);
  // ...move: find insert point via el.getBoundingClientRect().top; sanitizeOrder() each move
});
```

**Dirty-state:** order changes join the existing `computeDisableTransitions` + Save staging (L449, D-16) — no new Save chrome. **Reset order / Reset names** (UI-SPEC: two paired buttons) reuse `App.confirmDialog({tone:"neutral"})` for the names-reset confirm.

**Security (V5):** group `titleOverride` + section `customLabel` are user text — render via `.textContent`/`input.value` ONLY (existing contract, header comment L25-28).

---

### `add-session.js` / `add-session.html` — order-driven form + — skip (component, transform)

**Analog:** `applySectionVisibility`/`applySectionLabels` (L997-1042) already iterate `[data-section-key]` — extend to iterate `App.getSectionOrder()` and reorder DOM into group accordions. **One-time D-02 restructure** replaces the static 4-accordion HTML (`add-session.html` L205-340).

**Severity — skip marker** (extend `createIssueBlock` L716-828, `getIssuesPayload` L830, `updateDelta` L695, `validateIssues` L841): the `—` value is mandatory-satisfying but non-numeric; a `—`'d topic auto-hides its after-rating (D-09).

**Tour anchors (Pitfall 5):** preserve/re-point `data-tour="session-heart"` etc. (was on the `emotions` accordion, L246) through the restructure — verify tour end-to-end.

---

### `app.js` — severity `—` (skip) value (utility, transform)

**Analog:** `createSeverityScale` / `getSeverityValue` — SAME FILE L1209-1244.

Today `getSeverityValue` (L1239-1244) collapses `""`/undefined → `null` (unselected). The `—` skip needs a THIRD state distinct from `null` (Pitfall 3, RESEARCH A3):
```javascript
// createSeverityScale: append an 11th "—" button, wrap.dataset.value = "skip"
// getSeverityValue: value === "skip" → return SEV_SKIP marker (not null, not number)
// EVERY reader branches: validateIssues (satisfied), updateDelta (hide after), export (omit)
```
Existing session records need NO migration — `—` only appears in future writes (RESEARCH A7).

---

### `export-modal.js` — order-driven emit + topics/severity split (service, transform)

**Analog:** SAME FILE. `EXPORT_SECTION_ORDER` (L343) **dies** — replaced by `App.getSectionOrder().flatKeys()` (groups flattened, form-only D-03). `EXPORT_DEFAULT_CHECKED` (L331-341) stays but Step-1 rows render in saved order (L517).

**`severityAfterSections` re-derivation** (L755-773): today it matches the first `##` heading against the heartShield label → 0 or 1. Replace with an ordinal of the `afterSeverity` slot in saved order (RESEARCH Pattern 3 `deriveSeverityAfterSections`) — generalizes 0/1 → N, PDF loop untouched:
```javascript
// current (L764-767): firstHeading match → 0 or 1  ← REPLACE
// new: count emitted sections preceding the afterSeverity slot in SAVED order
```

**Pitfall 1 (260615 class):** `buildFilteredSessionMarkdown` (L379) hardcodes emission order inline (L434-470) — rewrite to iterate the ordered key list. ALL three consumers (this, `buildDocumentSectionLabels` L492, Step-1 L517) must read from `App.getSectionOrder()` — one source.

**D-14 split:** "Session topics" main checkbox (named identically to in-session title, fixes HE mismatch); "Include severity before/after" is a DEPENDENT sub-option enabled only when topics checked; resets per export (D-15).

---

### `pdf-export.js` — severity-block placement (service, transform)

**Analog:** `drawSeverityBlock` loop — SAME FILE L1425-1501. **Loop stays UNCHANGED** (Phase-23 Hebrew bidi safe); only the `severityAfterSections` input number (fed from export-modal) changes. Do not touch the render pass (Don't-Hand-Roll).

---

### Tests

| New/Rewritten test | Model on |
|--------------------|----------|
| `tests/30-export-markdown.test.js` (rewrite) | itself — assert three-way invariant (form==Step-1==export) against a **MUTATED** saved order, not static DOM |
| `tests/47-order-sentinel.test.js` | `tests/25-10-snippets-sentinel-roundtrip.test.js` |
| `tests/47-order-backup-roundtrip.test.js` | `tests/45-backup-roundtrip.test.js` (encrypted round-trip) |
| `tests/47-order-sanitize.test.js` | pure-fn unit (clamp on load AND restore) |
| `tests/47-severity-skip.test.js` | existing severity/export tests (— satisfies validation, excluded from export, all-skip omits block) |
| `tests/47-severity-position.test.js` | pure-fn unit (`deriveSeverityAfterSections` ordinal) |

**jsdom false-GREEN warning (Pitfall 4):** touch drag, RTL drag math, PDF severity position, empty-group hide are invisible to jsdom — real-device/real-PDF UAT (Phase 44 pre-prod) is the gate, NOT jsdom.

---

## Shared Patterns

### Sentinel lock-step (persistence)
**Source:** `db.js` L917-963 + `backup.js` L1157-1181
**Apply to:** the order sentinel — register in `_SENTINEL_KEYS` AND `ALLOWED_SENTINEL_KEYS` in the SAME PR, or restore silently drops it (ORDR-05). Comment at `db.js` L917-919 states the requirement.

### Eager-load + sync-read cache
**Source:** `app.js` `_sectionLabelCache`/`_snippetCache` (L39-110, L840-868)
**Apply to:** `App.getSectionOrder()` — load once in `initCommon`, read sync everywhere (D-16 snapshot), invalidate on the shared BroadcastChannel `therapist-settings-changed` message.

### One shared move-validator (invariant integrity)
**Source:** RESEARCH Pattern 2 (`sanitizeOrder` in `app.js`)
**Apply to:** settings drag drop-predicate, arrow moves, saved-order load, AND backup restore — all four. Validating only in the drag handler = theater (Pitfall 2, Interaction 11).

### DOM-API SVG / no-innerHTML render
**Source:** `settings.js` `buildSvg` (L62-96); XSS contract at L25-28 and `app.js` `getSectionLabel` (L52 comment)
**Apply to:** all new icons (handle/arrows/ⓘ) and all user-text render (`titleOverride`, `customLabel`) — `.textContent`/`input.value` only.

### RTL drag positioning
**Source:** repo memory `reference-rtl-logical-props-physical-coords`; `47-mockups.html` `wireDrag`
**Apply to:** drag overlay math — PHYSICAL `left`/`top` from `getBoundingClientRect`, NEVER logical `inset-inline-*`. Layout chrome (handles/arrows) still uses logical props to flip for free.

### Docs hard-gate (D-18, planner-owned)
**Source:** CLAUDE.md Definition of Done; HELP-MAP.md index; RESEARCH.md "Docs Coverage" table
**Apply to:** a DEDICATED docs task drafted as its own content pass Ben reviews before code fixes (repo memory `feedback-docs-content-passes-separate-from-code`). EN corpus of record; the mandated "how to turn severity ratings off" help entry (D-08) + 4-part changelog user story; all new strings EN/DE/HE/CS.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `tests/47-order-sanitize.test.js` | test | — | The clamp validator is a net-new pure fn; no existing order-sanitization test exists. Model structurally on any pure-fn unit in `tests/`. |

Everything else has an in-repo analog (mostly the SAME file being extended). The order sentinel and shared validator are *composed from* proven patterns (`snippetsDeletedSeeds` path + `_sectionLabelCache` shape), not invented — but the specific record shape (A1) and validator (A2) are ASSUMED pending Ben's plan-review confirmation.

---

## Metadata

**Analog search scope:** `assets/{db,backup,app,settings,export-modal,pdf-export,add-session}.js`, `add-session.html`, `tests/`, `47-mockups.html`
**Files read this session (targeted excerpts):** db.js L910-999, backup.js L1140-1199, app.js L36-115/L840-869/L1205-1274, settings.js L25-97, export-modal.js L331-360/L755-776
**Pattern extraction date:** 2026-07-23
</content>
</invoke>
