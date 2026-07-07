# Phase 38: Next session date field with overview column - Research

**Researched:** 2026-07-07
**Domain:** Vanilla-JS PWA — additive session-record field + overview table column + export/date-engine reuse
**Confidence:** HIGH (every canonical line number and integration site verified against live source this session)

## Summary

This is a **low-risk, additive, reuse-only** phase. It adds one optional `nextSessionDate` (`YYYY-MM-DD`) field to the schemaless IndexedDB session record, surfaces it as a sortable "Next Session" column in the client overview (mirroring "Last Session"), applies a subtle overdue cue, renders the date in the PDF/markdown export, and seeds demo data. No new dependencies, no migration, no new architecture — every touch-point reuses plumbing Phase 37 already shipped (`window.DateFormat`, native `<input type="date">`, `portfolioDateFormat`, the header↔dropdown sort sync).

The CONTEXT.md (D-01..D-12) and UI-SPEC.md are unusually complete and accurate: all canonical line numbers verified within ±2 lines against live source. Research surfaced **four material refinements** the planner must fold in — three are correctness gaps not spelled out in CONTEXT, one materially simplifies D-10:

1. **The `nextSession` sort branch CANNOT copy the `lastSession` sort logic.** Last Session sorts by a `reduce`-max over all a client's sessions; D-01 requires the *most-recent session's* `nextSessionDate` (not the max next-date). At sort time `clientSessions[0]` is **not** yet the most-recent (arrays are raw IDB order until `renderClientRows` mutates them). The sort branch must independently find the most-recent session (same date/createdAt/id tiebreak as the render sort) and read *its* `nextSessionDate`.
2. **`snapshotFormState()` (add-session.js:720) must capture `nextSessionDate`** or the Cancel→"Discard changes" revert flow silently drops the field. CONTEXT lists only the save/add/populate sites, not this one.
3. **The PDF golden fixtures are STATIC** (`sessionData.markdown` is a pre-baked string in `.planning/fixtures/phase-23/fixture-*.json`). Adding the date to the *live* export builder does **not** perturb those baselines — so the existing SHA-256 hashes should still PASS unchanged. D-10 golden regeneration is required **only if** the plan deliberately adds a next-session date to a fixture JSON to cover the new PDF render path. The markdown *export* behavior (D-09) is genuinely testable via the live builder in `30-export-markdown.test.js`.
4. **Empty-note gating conflicts with D-09.** Both markdown builders skip the entire nextSession block when the note is empty (`summaryValue.length > 0`). D-09 requires rendering a date-only session, so that condition must become "note OR date present."

**Primary recommendation:** Treat this as a mechanical mirror-the-Last-Session-column phase, but write the three falsifiable behavior tests (TZ-pinned overdue boundary, blanks-to-bottom under both directions, dynamic `min`) BEFORE implementation per `feedback-behavior-verification`, and special-case the sort derivation + blank handling exactly as noted below.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Store `nextSessionDate` | Database / Storage (`db.js` schemaless IndexedDB) | — | Additive field on the session object; no schema, no migration |
| Read/write field on form | Browser / Client (`add-session.js` + `add-session.html`) | — | Native `<input type="date">`; `.value` read on save, set on populate |
| Overview column render + overdue cue | Browser / Client (`overview.js` + `app.css`) | — | Pure DOM render from the in-memory session map |
| Sort by next-date | Browser / Client (`overview.js` comparator) | — | View preference over the same in-memory data |
| PDF/markdown export | Browser / Client (`export-modal.js` markdown builder → `pdf-export.js` parser) | — | Date injected into the markdown string; PDF parses markdown |
| Backup/restore of field | Database / Storage (`backup.js`) | — | Rides along automatically — sessions exported as whole objects (verified) |
| Date parse/format/compare | Browser / Client (`assets/date-format.js` = `window.DateFormat`) | — | Single canonical local-time engine; reused verbatim |

## Standard Stack

**No external packages. Zero-dependency vanilla-JS PWA. No install step, no build.** [VERIFIED: codebase — no package.json runtime deps; window-IIFE modules]

### Core (reused, not added)
| Asset | Location | Purpose | Why Standard |
|-------|----------|---------|--------------|
| `window.DateFormat` | `assets/date-format.js` | `parseLocal("YYYY-MM-DD")` (local, no UTC off-by-one), `todayLocalISO()`, format honoring `portfolioDateFormat` | The canonical Phase 37 date engine — use for the overview cell, the overdue `< today` compare, and the export date. No new date logic. [VERIFIED: codebase] |
| `App.formatDate(iso)` | app.js | Locale/RTL-aware display formatter delegating to `DateFormat` | Exactly how the Last Session cell formats (`overview.js:630`). [VERIFIED: overview.js:630] |
| Native `<input type="date">` | `add-session.html` (`#sessionDate` :86, `#inlineClientBirthDate` :143, `#editClientBirthDate` :522) | Structured date entry; value always `YYYY-MM-DD`, cannot be malformed | Mirror the birthdate input shape (`class="input"`). [VERIFIED: add-session.html:143,522] |
| Sort machinery | `overview.js:260, 302–319, 442–518` | `SORT_DEFAULT_DIR`, comparator, `setSort`, header↔`#clientSortSelect` two-way sync | Extend with a `nextSession` key. [VERIFIED: overview.js] |
| Node built-in test runner + jsdom | `tests/`, `tests/_helpers/jsdom-pdf-env.js` | Behavior + PDF regression tests | Existing infra; `jsdom-pdf-env.js` already injects `window.DateFormat`. [VERIFIED: tests/_helpers] |

**Installation:** none.

## Package Legitimacy Audit

**Not applicable — this phase installs no external packages.** It is a zero-dependency vanilla-JS PWA; all functionality reuses in-repo modules. No npm/PyPI/crates operations. [VERIFIED: codebase]

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────────┐
  add-session.html  │  #sessionDate (date)   #customerSummary(note)│
   nextSession      │  #nextSessionDate (NEW date, min=sessionDate)│
   section          └───────────────┬─────────────────────────────┘
                                     │ .value read on save (add-session.js:1114)
                                     ▼
   PortfolioDB.addSession/updateSession  ──►  IndexedDB session object
   (schemaless; +nextSessionDate, no migration)   { date, customerSummary,
                                     │                nextSessionDate, ... }
        ┌────────────────────────────┼───────────────────────────┐
        ▼                            ▼                           ▼
  loadOverview()             populateSession()            backup.js export
  sessionsByClient Map       (edit → set .value,          (whole session obj →
        │                     set min from date)           ZIP; rides along)
        ▼
  applyFiltersAndSort()  ──►  sort branch: most-recent
        │                     session's nextSessionDate;
        │                     blanks → bottom (both dirs)
        ▼
  renderClientRows()  ──►  nextSessionCell
        │                   • App.formatDate(clientSessions[0].nextSessionDate)
        │                   • '-' if empty
        │                   • is-overdue cue if parseLocal(v) < todayLocal
        ▼
  overview table (index.html / demo.html): Name·Type·Sessions·Last·NEXT·Actions
                                                  colSpan detail-row 5 → 6

  EXPORT PATH:
  export-modal.js buildExportMarkdown()  ──►  "## Information for Next Session\n
    (append date line when present)             <date>\n\n<note>"  ──► markdown string
        │                                                              │
        ▼ .md download                                                 ▼
                                          pdf-export.js parseMarkdown() → PDF blocks
```

### Recommended Project Structure
No new files. All edits land in existing modules:
```
assets/
├── overview.js          # column render, overdue cue, sort key, colSpan bump
├── add-session.js       # field register, read/save, populate, snapshot, min-wiring
├── add-session.html     # #nextSessionDate input in nextSession section
├── export-modal.js      # date line in both markdown builders + content checks
├── i18n-{en,he,de,cs}.js# 4 new keys × 4 languages
├── app.css              # ONE new rule: .next-session-cell + .next-overdue-dot
├── demo-seed-data.json  # a few near-future nextSessionDate values
index.html / demo.html   # <th> + #clientSortSelect <option>
tests/                   # extend sort/markdown tests; new overdue+min behavior tests
```

### Pattern 1: Most-recent-session derivation (display AND sort must agree — D-01/D-03)
**What:** The displayed value is `clientSessions[0].nextSessionDate` where `clientSessions` was sorted **descending** (date, then createdAt, then id) inside `renderClientRows` (`overview.js:619–626`). The sort comparator runs *before* that mutation, on raw-IDB-order arrays, so it must derive "most recent" itself.
**When to use:** Both the `nextSessionCell` render and the `nextSession` sort branch.
**Example:**
```javascript
// Source: overview.js:619-626 (the canonical most-recent tiebreak) — reuse for sort
function mostRecentSession(sessions) {
  if (!sessions || !sessions.length) return null;
  return sessions.slice().sort((a, b) => {
    const cmp = String(b.date || "").localeCompare(String(a.date || ""));
    if (cmp !== 0) return cmp;
    const ca = new Date(a.createdAt || 0).getTime();
    const cb = new Date(b.createdAt || 0).getTime();
    if (cb !== ca) return cb - ca;
    return (b.id || 0) - (a.id || 0);
  })[0];
}
// sort branch (mirrors overview.js:305 structure, but does NOT reduce-max like lastSession):
if (sortVal === "nextSession") {
  const aNext = mostRecentSession(_sessionsByClient.get(a.id))?.nextSessionDate || "";
  const bNext = mostRecentSession(_sessionsByClient.get(b.id))?.nextSessionDate || "";
  // Blanks ALWAYS to the bottom, independent of _sortDir — early-return bypasses `dir *`:
  if (!aNext && !bNext) return 0;
  if (!aNext) return 1;
  if (!bNext) return -1;
  base = aNext.localeCompare(bNext); // ascending: soonest first; `return dir * base` flips
}
```
[VERIFIED: overview.js:305–319, 619–626]

### Pattern 2: Blanks-to-bottom special case (D-03)
**What:** `return dir * base` at `overview.js:318` multiplies the whole comparison by direction. Last Session's blanks (empty string) sort *first* under ascending `localeCompare` and would flip with direction. D-03 requires blanks at the bottom in BOTH directions.
**How:** Early-return `+1`/`-1` for the blank cases *inside* the `nextSession` branch (as above) so they escape the `dir *` multiply; only the non-blank comparison flows through `return dir * base`. [VERIFIED: overview.js:302–319]

### Pattern 3: Dynamic `min` = the session's own date (D-08)
**What:** `#nextSessionDate.min = #sessionDate.value` (same-day allowed); unset when `#sessionDate` is empty.
**When:** (a) new-session default (after `sessionDate.value = todayLocalISO()` at `add-session.js:511`), (b) populate time (after `sessionDate.value = session.date` at `:1660`), (c) a `change` listener on `#sessionDate`.
**Example:**
```javascript
function syncNextSessionMin() {
  const sd = document.getElementById("sessionDate");
  const nx = document.getElementById("nextSessionDate");
  if (!sd || !nx) return;
  if (sd.value) nx.setAttribute("min", sd.value);
  else nx.removeAttribute("min");
}
// call in the new-session block (~:511), in populateSession (~:1660), and:
document.getElementById("sessionDate")?.addEventListener("change", syncNextSessionMin);
```
[VERIFIED: add-session.js:506–513, 1660]

### Pattern 4: Overdue cue (D-04, one new CSS rule)
**What:** cell text dimmed (`--color-text-muted`) + amber dot (`--color-warning-text`) when `DateFormat.parseLocal(v) < todayLocal` (strictly before; today not overdue). Both tokens exist in light+dark. Marker carries `title`/`aria-label` = `overview.table.nextSession.overdue` (not color-only, WCAG 1.4.1). Build via DOM APIs + `textContent`, never `innerHTML` (per `31-overview-render-hardening`). `margin-inline-end` flips in RTL. [CITED: 38-UI-SPEC.md §2; VERIFIED: token existence in tokens.css]
**Today-local helper:** compare `DateFormat.parseLocal(v)` against a today-local Date (build from `todayLocalISO()` → `parseLocal`) so the boundary is wall-clock local, matching Phase 37's off-by-one fix.

### Anti-Patterns to Avoid
- **Copying the `lastSession` reduce-max into the `nextSession` sort.** It yields the max next-date across sessions, not the most-recent session's next-date — contradicts D-01. (See Pattern 1.)
- **Relying on `clientSessions[0]` inside the sort comparator.** At sort time the arrays are raw IDB order, not yet descending. (See Pattern 1.)
- **Letting blank next-dates ride through `dir * base`.** They'd float to the top under one direction. (See Pattern 2.)
- **`innerHTML` for the cell/marker.** `31-overview-render-hardening.test.js` locks textContent-only rendering. [VERIFIED: overview.js:704–709 comment]
- **`min = today`.** D-08 is explicit: `min` is the session's OWN date, dynamic.
- **Blind `--regenerate` on PDF baselines.** Per `reference-pdf-jsdom-inert-gates` + D-10: regenerate only deliberately, with real-output verification (open the PDF, confirm the date line).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parse/format `YYYY-MM-DD` locally | Custom `new Date(str)` | `window.DateFormat.parseLocal` / `App.formatDate` | `new Date("YYYY-MM-DD")` parses as UTC → off-by-one in negative-UTC zones (the exact Phase 37 bug). [VERIFIED: date-format.js] |
| "Today" for the overdue compare | `new Date().toISOString().slice(0,10)` | `window.DateFormat.todayLocalISO()` | UTC slice can be tomorrow late at night in negative-UTC zones (fixed at add-session.js:507–511). [VERIFIED] |
| Date entry validation | Custom text parsing/regex | Native `<input type="date">` + `min` | Value is always well-formed `YYYY-MM-DD`; browser enforces `min`. [VERIFIED: D-06] |
| Header↔dropdown sort sync | New sync code | Extend `SORT_DEFAULT_DIR` + `setSort` + `getSortHeaders` | Two-way sync already handles any `data-sort-key`. [VERIFIED: overview.js:442–518] |
| Backup of the new field | New backup serialization | Nothing | Sessions export as whole objects; field rides along. [VERIFIED: backup.js:647,675,1122] |
| PDF rendering of the date | New pdf-export.js draw code | Append a line to the export **markdown**; `parseMarkdown` renders it | pdf-export builds from `sessionData.markdown`, not structured fields. [VERIFIED: pdf-export.js:700,876,1277] |

**Key insight:** The single biggest correctness lever is reusing `window.DateFormat` for every parse/format/compare. Every date bug in this codebase's history traces to `new Date(isoString)` UTC parsing; the engine exists precisely to prevent it.

## Runtime State Inventory

> Additive field on a schemaless store — no rename, no migration. Included for the "what persists" answer.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | IndexedDB session objects (schemaless via `PortfolioDB.addSession`/`updateSession`). New optional `nextSessionDate` key; existing records simply lack it and render `-`. | Code edit only — **NO data migration**. [VERIFIED: db.js schemaless; overview.js:630 empty-render pattern] |
| Live service config | None — pure client-side PWA, no external services hold this string. | None |
| OS-registered state | None. | None |
| Secrets/env vars | None — no secret or env var references a session field name. | None |
| Build artifacts | None — no build step (vanilla JS served directly). | None |
| Backup payload | `backup.js` exports `db.getAllSessions()` as whole objects (`:647,:675`) and restores via `db.addSession(manifest.sessions[j])` (`:1122–1123`); `BACKUP_CONTENTS_KEYS` (`:1373`) is top-level content keys, NOT a per-field allowlist. | **None** — field round-trips automatically. Spot-check only (D-11). [VERIFIED] |

**Nothing found in categories:** live service config, OS-registered state, secrets, build artifacts — verified by grep of `backup.js`, absence of build tooling, and the client-only architecture.

## Common Pitfalls

### Pitfall 1: Sort derivation diverging from displayed value
**What goes wrong:** Sorting shows a different next-date than the cell displays.
**Why it happens:** Copying `lastSession`'s reduce-max, or trusting `clientSessions[0]` at sort time (raw IDB order).
**How to avoid:** Use the shared `mostRecentSession()` helper (Pattern 1) in BOTH the cell render and the sort branch.
**Warning signs:** A client whose latest session has a blank next-date still sorts as if it had the older session's date.

### Pitfall 2: Revert/discard drops the field
**What goes wrong:** User edits next-date, clicks Cancel→"Discard changes", the date is NOT restored to the last-saved value.
**Why it happens:** `snapshotFormState()` (`add-session.js:720–746`) and `populateSession()` (`:1651–1668`) are a matched pair; revert calls `populateSession(snapshot)`. If the snapshot omits `nextSessionDate`, revert restores `undefined` → blank.
**How to avoid:** Add `nextSessionDate` to BOTH `snapshotFormState()`'s return object AND `populateSession()`'s field-set list. [VERIFIED: add-session.js:739 (snapshot), 1664 (populate), 751–753 (revert delegates to populate)]
**Warning signs:** `30-form-dirty-revert.test.js` passes but manual edit→discard loses the date.

### Pitfall 3: Assuming PDF golden baselines will change
**What goes wrong:** Executor blind-runs `--regenerate`, silently baking in an unintended pdf-export perturbation (the `reference-pdf-jsdom-inert-gates` false-GREEN risk).
**Why it happens:** D-10 reads as "fixtures change." But `.planning/fixtures/phase-23/fixture-*.json` carry a **static** `sessionData.markdown` string — the live export builder isn't invoked, so those hashes DON'T change from this feature. [VERIFIED: fixture-en.json:6 static markdown; pdf-latin-regression.test.js:90 builds from fixture.sessionData]
**How to avoid:** Expect existing PDF baselines to PASS unchanged. Only regenerate a baseline if you deliberately edit a fixture JSON's markdown to include a `## Information for Next Session` date line — and then open the produced PDF and confirm the date renders before committing the new hash.
**Warning signs:** A phase-23 PDF hash changes without you touching a fixture JSON → you perturbed pdf-export.js unintentionally; investigate, don't regenerate.

### Pitfall 4: Empty-note gate hides a date-only export (D-09)
**What goes wrong:** A session with a next-date but no note renders no nextSession block in the export.
**Why it happens:** Both builders gate on `summaryValue.length > 0` (`export-modal.js:274`, `:411`) and the content check at `:142–144` keys off `#customerSummary` only.
**How to avoid:** Change the gate to `(summaryValue.length > 0 || nextDatePresent)` in both builders, and treat a date as content in the `sectionHasData`/toggle-default logic (`:142–144`, `:427`). Render whichever of note/date is present. [VERIFIED: export-modal.js:142–144, 274–276, 410–412]
**Warning signs:** Export modal's nextSession toggle defaults off for a date-only session.

### Pitfall 5: Column-count assertions and colSpan
**What goes wrong:** Detail rows span the wrong width; a test that enumerates sort keys or columns fails.
**Why it happens:** `detailCell.colSpan = 5` (`overview.js:702`) is a 5-column assumption → must become **6**. `37-overview-sort.test.js:164` asserts `allSortKeys` deepEquals `['name','sessions','lastSession']` → must add `'nextSession'`.
**How to avoid:** Bump colSpan to 6; update the sort-key assertion; scan `31-overview-render-hardening.test.js` for cell-count coupling. No CSS `nth-child`/`colspan` on the client `.table` (only `.sessions-table` zebra striping, which is column-count-independent). [VERIFIED: overview.js:702; app.css grep; 37-overview-sort.test.js:164]

## Code Examples

### Cell render (mirror lastSessionCell) — overview.js
```javascript
// Source: overview.js:667-669 (lastSessionCell) + :630 (empty pattern) + UI-SPEC §2
const nextRaw = clientSessions[0]?.nextSessionDate || "";  // [0] IS most-recent here (post-sort at :619)
const nextSessionCell = document.createElement("td");
nextSessionCell.className = "next-session-cell";
nextSessionCell.setAttribute("data-label", App.t("overview.table.nextSession"));
if (!nextRaw) {
  nextSessionCell.textContent = "-";
} else {
  const overdue = window.DateFormat.parseLocal(nextRaw) < todayLocalDate; // strictly before
  if (overdue) {
    nextSessionCell.classList.add("is-overdue");
    const dot = document.createElement("span");
    dot.className = "next-overdue-dot";
    dot.textContent = "●"; // ● bidi-neutral
    dot.setAttribute("title", App.t("overview.table.nextSession.overdue"));
    dot.setAttribute("aria-label", App.t("overview.table.nextSession.overdue"));
    nextSessionCell.appendChild(dot);
  }
  nextSessionCell.appendChild(document.createTextNode(App.formatDate(nextRaw)));
}
// insert AFTER lastSessionCell (:696), BEFORE actionCell (:697):
row.appendChild(lastSessionCell);
row.appendChild(nextSessionCell);
row.appendChild(actionCell);
```
Note: in `renderClientRows`, `clientSessions[0]` **is** the most-recent (array sorted descending at `:619`), so `[0]` is correct for the *render*. Only the *sort comparator* needs `mostRecentSession()`. [VERIFIED: overview.js:619–626, 667–697]

### The one new CSS rule — app.css
```css
/* Source: UI-SPEC §2 — reuses existing tokens, both themes */
.next-session-cell.is-overdue { color: var(--color-text-muted); }
.next-session-cell .next-overdue-dot {
  color: var(--color-warning-text);
  font-size: 0.6em; line-height: 1;
  margin-inline-end: 0.35em; vertical-align: middle;
}
```

### TZ-pinned overdue boundary test (NEXT-08) — mirror the Phase 37 inert-guard
```javascript
// Source: tests/37-date-format.test.js:27-46 — pin TZ + abort if inert (never false-GREEN)
if (process.env.TZ !== 'America/New_York') { process.env.TZ = 'America/New_York'; }
// verify the offset actually took (V8 caches TZ at startup); abort loudly if not:
var off = new Date(2026, 6, 2).getTimezoneOffset();
if (off !== EXPECTED_OFFSET) { console.error('Test inert; aborting'); process.exit(1); }
// then: yesterday-local => overdue true; today-local => overdue FALSE (boundary); tomorrow => false
```
[VERIFIED: tests/37-date-format.test.js:27–46, 208–211]

## State of the Art

Not applicable — no framework/library churn. All patterns are internal-repo conventions established Phases 23–37 and verified current this session.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `--color-warning-text` and `--color-text-muted` are defined for BOTH light and dark in `tokens.css` | Overdue cue | Low — asserted in UI-SPEC §Color; executor should grep `tokens.css` to confirm both `[data-theme]` scopes before shipping |
| A2 | `demo.html`'s `#clientSortSelect` currently lacks the `sessions` option (grep showed only name+lastSession) | Demo parity | Low — executor should add the `nextSession` option to whatever the demo select contains for parity, regardless |

**Everything else is verified against live source (line numbers current as of 2026-07-07).**

## Open Questions

1. **Should the copy-to-clipboard markdown (`buildSessionMarkdown`, export-modal.js:165–278) also include the date, or only the export builder?**
   - What we know: D-09/CONTEXT canonical-refs cite BOTH `:208` (inside the copy builder) and `:410` (export builder). Both currently gate on note-non-empty.
   - What's unclear: whether the clipboard copy is in D-09's intended scope or only the PDF/.md export.
   - Recommendation: Include it in BOTH for consistency (CONTEXT cites both line numbers). Low-risk; keeps copy and export symmetric.

2. **Does the plan want new PDF coverage of the date render, or is markdown-export coverage sufficient?**
   - What we know: existing PDF golden fixtures won't change (static markdown). `30-export-markdown.test.js` exercises the live builder and WILL cover D-09 for the .md path.
   - Recommendation: Cover D-09 via `30-export-markdown.test.js` (live builder, real output). Add PDF coverage only if desired — by editing one fixture JSON's markdown to include a date line and regenerating that single baseline with real-output verification. Don't force it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js test runner | Behavior + PDF tests | ✓ | (existing) | — |
| jsdom (devDependency) | jsdom-pdf-env.js, sort/form tests | ✓ | (installed, resolved via require) | — |
| Browser `<input type="date">` | Field UI | ✓ (all target browsers) | — | — |

**No missing dependencies.** All test infra and runtime APIs are already present. [VERIFIED: tests/_helpers/jsdom-pdf-env.js, existing 37-* tests run]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in test/assert scripts (exit-0/1 contract) + jsdom |
| Config file | none — `tests/run-all.js` spawns each `*.test.js` as a child process |
| Quick run command | `node tests/37-overview-sort.test.js` (single file) |
| Full suite command | `node tests/run-all.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NEXT-01 | field saved/populated/reset on session record | unit (jsdom real page) | `node tests/38-next-session.test.js` | ❌ Wave 0 (new) |
| NEXT-02 | dynamic `min` = session date; unset when empty; updates on change | unit | `node tests/38-next-session.test.js` | ❌ Wave 0 |
| NEXT-03 | "Next Session" column renders most-recent value, `-` when empty, both index+demo | unit | extend `tests/37-overview-sort.test.js` or new `38-next-session-column.test.js` | ⚠️ extend |
| NEXT-04 | ascending default; blanks-to-bottom BOTH directions; header↔select sync | unit | extend `tests/37-overview-sort.test.js` | ⚠️ extend (update `:164` sort-key assertion) |
| NEXT-05 | overdue cue when `< today` local; today NOT overdue (boundary) | unit, **TZ-pinned** | `node tests/38-next-overdue.test.js` | ❌ Wave 0 |
| NEXT-06 | date rendered in markdown export; date-only session still renders; gated by section toggle | unit | extend `tests/30-export-markdown.test.js` + `30-section-visibility.test.js` | ⚠️ extend |
| NEXT-07 | demo column populated; backup round-trips field | unit | extend `tests/35-demo-seed.test.js`; backup roundtrip via `snippet-prefix-backup-roundtrip.test.js` pattern | ⚠️ extend |
| NEXT-08 | TZ-pinned overdue boundary; blanks-to-bottom; dynamic min; deliberate golden regen | unit + guard | as above; PDF baselines expected UNCHANGED | ⚠️ mixed |

### Sampling Rate
- **Per task commit:** the single affected test file (e.g. `node tests/38-next-overdue.test.js`)
- **Per wave merge:** `node tests/run-all.js`
- **Phase gate:** full suite green before `/gsd-verify-work`; if any `pdf-*` hash changed, STOP and investigate (should not change).

### Wave 0 Gaps
- [ ] `tests/38-next-session.test.js` — field save/populate/reset + dynamic `min` (NEXT-01/02); real add-session jsdom page (mirror `30-form-dirty-revert.test.js` harness)
- [ ] `tests/38-next-overdue.test.js` — TZ-pinned overdue `< today` boundary incl. today-not-overdue (NEXT-05/08); mirror `37-date-format.test.js` TZ inert-guard
- [ ] Extend `tests/37-overview-sort.test.js` — add `nextSession` to `allSortKeys` assertion (`:164`), blanks-to-bottom under both directions, header↔select sync (NEXT-03/04)
- [ ] Extend `tests/30-export-markdown.test.js` + `30-section-visibility.test.js` — date line + date-only-session render + toggle gating (NEXT-06)
- [ ] Extend `tests/35-demo-seed.test.js` — assert seeded `nextSessionDate` values present/near-future (NEXT-07)
- [ ] Add `nextSessionDate` capture assertion to `tests/30-form-dirty-revert.test.js` — guards Pitfall 2 (revert restores the field)

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Client-side PWA, no auth surface touched |
| V3 Session Management | no | N/A |
| V4 Access Control | no | Local single-user data |
| V5 Input Validation | yes | Native `<input type="date">` → value constrained to `YYYY-MM-DD` (D-06); `min` bound to session date (D-08). No free-text parse path. |
| V6 Cryptography | no | Backup encryption untouched; field rides existing ZIP path |
| V7 Error Handling | minor | Save already wrapped in try/catch (`add-session.js:1123–1167`); no new failure mode |

### Known Threat Patterns for vanilla-JS PWA
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed/injected date value | Tampering | Native date input cannot emit non-`YYYY-MM-DD`; this is the explicit rationale in D-06 |
| XSS via rendered date | Tampering/Info-disclosure | Render via `textContent`/`document.createTextNode` + `App.formatDate`, never `innerHTML` (locked by `31-overview-render-hardening`) |
| Overdue label color-only signal | (a11y, not security) | Dot carries `title`+`aria-label`; dimmed text is a second channel (WCAG 1.4.1) |

**No new attack surface.** The field is structured, client-local, rendered as text.

## Sources

### Primary (HIGH confidence — live source verified this session, 2026-07-07)
- `assets/overview.js` — sort config `:260`, comparator `:302–319`, most-recent sort `:619–626`, cell render `:630,:667–697`, colSpan `:702`, sync `:442–518`
- `assets/add-session.js` — field register `:129`, new-session default `:506–513`, snapshot `:720–746`, read `:1114`, payloads `:1125–1160`, populate `:1651–1668`
- `assets/export-modal.js` — content checks `:142–144`, copy builder `:208,:274–276`, export builder `:410–412`
- `assets/pdf-export.js` — markdown-driven render `:700,:876,:1277` (PDF parses `sessionData.markdown`)
- `assets/backup.js` — wholesale session export `:647,:675`, restore `:1122–1123`, content keys `:1373`
- `index.html` `:150–178` / `demo.html` `:140–166` — thead + `#clientSortSelect`
- `assets/i18n-en.js` — anchors `:22,:50,:135`
- `.planning/fixtures/phase-23/fixture-en.json:6` + `tests/pdf-latin-regression.test.js:90,:130` + `README.md` — static-markdown golden mechanism
- `tests/37-date-format.test.js:27–46` — TZ inert-guard pattern; `tests/37-overview-sort.test.js:164` — sort-key assertion; `tests/30-form-dirty-revert.test.js` — snapshot/revert harness
- `38-CONTEXT.md` (D-01..D-12) + `38-UI-SPEC.md` — locked decisions and visual contract

### Secondary / Tertiary
- None required — no external research; all claims verified in-repo.

## Project Constraints (from CLAUDE.md)
- **Git sync:** run `git pull` at session start before work. [project CLAUDE.md]
- **Lemon Squeezy:** irrelevant to this phase (no store interaction).
- **No `.env` reads** (global rule) — not touched here.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps; every reused asset located and line-verified.
- Architecture: HIGH — all integration sites read directly; the sort/snapshot/PDF-fixture refinements confirmed in source.
- Pitfalls: HIGH — each traced to a specific verified line and, where possible, an existing guarding test.

**Research date:** 2026-07-07
**Valid until:** 2026-08-06 (stable internal codebase; line numbers may drift if other phases edit these files first — re-verify anchors at plan time if intervening commits land)
</content>
