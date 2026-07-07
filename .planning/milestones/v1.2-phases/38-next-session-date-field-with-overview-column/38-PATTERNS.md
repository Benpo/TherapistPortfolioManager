# Phase 38: Next session date field with overview column - Pattern Map

**Mapped:** 2026-07-07
**Files analyzed:** 13 (all modified; no new source files, 3 new test files)
**Analogs found:** 13 / 13 (all in-repo, all analogs are same-file sibling patterns)

> This is a **reuse-only, additive** phase. Every "new" file is an EXISTING file being extended, and the analog for each is a **sibling pattern in the same file** (the Last Session column, the `customerSummary` note, the existing `<input type="date">`). All line numbers below were re-verified against live source on 2026-07-07 with excerpts pasted. RESEARCH.md's four refinements (sort branch ≠ reduce-max, `snapshotFormState` capture, static PDF fixtures, empty-note export gating) are folded into the assignments below — do NOT contradict them.

## File Classification

| Modified File | Role | Data Flow | Closest Analog (same-file sibling) | Match Quality |
|---------------|------|-----------|-----------------------------------|---------------|
| `assets/overview.js` | store/view render | transform | `lastSession` column + sort branch (same file) | exact |
| `assets/add-session.js` | controller (form) | request-response (CRUD write) | `customerSummary` read/save/populate/snapshot (same file) | exact |
| `add-session.html` | view (form markup) | — | `#sessionDate` / birthdate `<input type="date">` | exact |
| `index.html` | view (table markup) | — | Last Session `<th>` + `#clientSortSelect` `<option>` | exact |
| `demo.html` | view (table markup) | — | `index.html` overview table | exact |
| `assets/export-modal.js` | service (markdown build) | transform | `customerSummary` nextSession block (2 builders) | exact |
| `assets/pdf-export.js` | service (PDF render) | transform | markdown-driven render (no direct edit — rides markdown) | role-match |
| `assets/db.js` | model/storage | CRUD | `addSession`/`updateSession` schemaless (no edit needed) | exact (no change) |
| `assets/backup.js` | service (backup) | file-I/O | wholesale session export (no edit needed) | exact (no change) |
| `assets/i18n-{en,he,de,cs}.js` | config | — | `overview.table.lastSession` + `session.form.nextSession` families | exact |
| `assets/app.css` | config (style) | — | overview cell styling (one new rule) | role-match |
| `assets/demo-seed-data.json` | fixture/data | — | existing seeded session objects | exact |
| `tests/*` (3 new + 4 extended) | test | — | `37-overview-sort.test.js`, `37-date-format.test.js`, `30-form-dirty-revert.test.js`, `30-export-markdown.test.js` | exact |

## Pattern Assignments

### `assets/overview.js` (store/view render, transform)

**Analog:** the `lastSession` column mechanics in the SAME file — but with the three RESEARCH refinements applied.

**1. Sort config** — add `nextSession: "ascending"` to `SORT_DEFAULT_DIR` (VERIFIED overview.js:260):
```javascript
const SORT_DEFAULT_DIR = { name: "ascending", sessions: "descending", lastSession: "descending" };
```
→ becomes `{ ..., lastSession: "descending", nextSession: "ascending" }`. Ascending = soonest-due floats to top (D-03), opposite of Last Session.

**2. Sort branch — DO NOT copy the `lastSession` reduce-max** (VERIFIED overview.js:302-319). The live Last Session branch is:
```javascript
const dir = _sortDir === "descending" ? -1 : 1;
filtered.sort((a, b) => {
  let base;
  if (sortVal === "lastSession") {
    const aSessions = _sessionsByClient.get(a.id) || [];
    const bSessions = _sessionsByClient.get(b.id) || [];
    const aLast = aSessions.length ? aSessions.reduce((max, s) => s.date > max ? s.date : max, "") : "";
    const bLast = bSessions.length ? bSessions.reduce((max, s) => s.date > max ? s.date : max, "") : "";
    base = aLast.localeCompare(bLast); // ascending: oldest first
  } ...
  return dir * base;
});
```
The `reduce`-max returns the MAX next-date across sessions — **wrong** for D-01, which wants the most-recent session's `nextSessionDate`. At sort time the per-client arrays are raw IDB order (the descending sort at :619 has NOT run yet), so `clientSessions[0]` is unreliable here. Add a `mostRecentSession()` helper reusing the render tiebreak (below) and special-case blanks to escape `dir * base` (RESEARCH Pattern 1 & 2):
```javascript
if (sortVal === "nextSession") {
  const aNext = mostRecentSession(_sessionsByClient.get(a.id))?.nextSessionDate || "";
  const bNext = mostRecentSession(_sessionsByClient.get(b.id))?.nextSessionDate || "";
  if (!aNext && !bNext) return 0;
  if (!aNext) return 1;   // blanks ALWAYS bottom, both directions
  if (!bNext) return -1;
  base = aNext.localeCompare(bNext);
}
```

**3. Most-recent tiebreak helper** — extract from the EXISTING render sort (VERIFIED overview.js:619-626):
```javascript
clientSessions.sort((a, b) => {
  const cmp = String(b.date || "").localeCompare(String(a.date || ""));
  if (cmp !== 0) return cmp;
  const ca = new Date(a.createdAt || 0).getTime();
  const cb = new Date(b.createdAt || 0).getTime();
  if (cb !== ca) return cb - ca;
  return (b.id || 0) - (a.id || 0);
});
```
Same date/createdAt/id tiebreak feeds `mostRecentSession()` used by the sort branch. In the render the array is already sorted, so `clientSessions[0]` IS most-recent there.

**4. Cell render** — mirror `lastSession` + `lastSessionCell` (VERIFIED overview.js:630, 667-669):
```javascript
const lastSession = clientSessions[0]?.date ? App.formatDate(clientSessions[0].date) : "-";
// ...
const lastSessionCell = document.createElement("td");
lastSessionCell.textContent = lastSession;
lastSessionCell.setAttribute("data-label", App.t("overview.table.lastSession"));
```
New `nextSessionCell`: read `clientSessions[0]?.nextSessionDate || ""`, format via `App.formatDate`, `-` when empty. Add overdue cue when `window.DateFormat.parseLocal(v) < todayLocalDate` (strictly before; today NOT overdue). Build via `textContent`/`createTextNode` + `createElement("span")` — NEVER `innerHTML` (locked by `31-overview-render-hardening.test.js`). Insert AFTER `lastSessionCell`, BEFORE `actionCell` (VERIFIED :696-697):
```javascript
row.appendChild(lastSessionCell);
row.appendChild(actionCell);   // ← insert nextSessionCell between these two
```

**5. colSpan bump** — VERIFIED overview.js:702:
```javascript
detailCell.colSpan = 5;   // → MUST become 6 (new column added)
```

**6. Header↔dropdown sync** — the two-way sync at :442-518 handles any `data-sort-key` automatically; no sync code needed beyond adding the `<th>` and `<option>`.

---

### `assets/add-session.js` (controller/form, request-response CRUD write)

**Analog:** the `customerSummary` note field — mirror it at EVERY site, PLUS `snapshotFormState` (RESEARCH refinement #2, the one CONTEXT omitted).

**1. Read on save** (VERIFIED add-session.js:1114):
```javascript
const customerSummary = customerSummaryInput ? customerSummaryInput.value.trim() : "";
```
Add `const nextSessionDate = document.getElementById("nextSessionDate")?.value || "";` (no `.trim()` — native date value is already clean or empty).

**2. Update payload** (VERIFIED :1125-1141) and **3. Add payload** (VERIFIED :1145-1160) — both list `customerSummary,`:
```javascript
await PortfolioDB.updateSession({ ...editingSession, /* ... */ customerSummary, comments, /* ... */ });
const newId = await PortfolioDB.addSession({ /* ... */ customerSummary, comments, /* ... */ });
```
Add `nextSessionDate,` to BOTH object literals.

**4. Populate on edit** (VERIFIED :1657, 1664):
```javascript
const customerSummary = document.getElementById("customerSummary");
if (customerSummary) customerSummary.value = session.customerSummary || "";
```
Add the matching `nextSessionDate` grab + `.value = session.nextSessionDate || ""`, then call `syncNextSessionMin()` after `sessionDate.value = session.date` (VERIFIED :1660).

**5. `snapshotFormState()` — MUST capture the field** (VERIFIED :720-746; RESEARCH Pitfall 2). The revert flow (`revertSessionForm` → `populateSession(lastSavedSnapshot)`, :751-753) restores `undefined`→blank if omitted:
```javascript
return {
  // ...
  customerSummary: customerSummaryEl ? customerSummaryEl.value : "",
  // ← add: nextSessionDate: nextEl ? nextEl.value : "",
};
```
`30-form-dirty-revert.test.js` must get a `nextSessionDate` capture assertion (Wave 0).

**6. Dynamic `min` = session's own date** (D-08; RESEARCH Pattern 3, VERIFIED anchors :506-513, :1660). `min = #sessionDate.value` (same-day allowed), unset when empty; wire at new-session default, populate, and a `change` listener on `#sessionDate`. NOT `min=today`.

**7. New-session reset** — set `#nextSessionDate.value = ""` wherever the note is cleared for a fresh form.

---

### `add-session.html` (view, form markup)

**Analog:** existing native date inputs — `#sessionDate` (:86), `#inlineClientBirthDate` (:143), `#editClientBirthDate` (:522), all `class="input"` `type="date"` (VERIFIED per RESEARCH). Add `<input type="date" id="nextSessionDate" class="input">` with a `session.form.*` label, placed BELOW the `#customerSummary` textarea inside `data-section-key="nextSession"` (D-07: note stays put, date is the structured add-on below).

---

### `index.html` + `demo.html` (view, table markup)

**Analog:** Last Session `<th>` (VERIFIED index.html:174-176) and `#clientSortSelect` (VERIFIED :151-155):
```html
<th class="sortable" data-sort-key="lastSession" aria-sort="none" tabindex="0" scope="col">
  <span class="sort-label"><span data-i18n="overview.table.lastSession">Last Session</span><span class="sort-arrow" aria-hidden="true"></span></span>
</th>
```
Add a matching `<th ... data-sort-key="nextSession">` with `data-i18n="overview.table.nextSession"` immediately AFTER the Last Session `<th>`, BEFORE `<th class="col-actions">` (D-02: Name·Type·Sessions·Last·**Next**·Actions). Add a `<option value="nextSession" data-i18n="overview.filter.sort.nextSession">` to the select (currently name/lastSession/sessions at :152-154). Apply the SAME to `demo.html` (D-12; RESEARCH A2: add the option regardless of demo's current select contents).

---

### `assets/export-modal.js` (service, markdown transform)

**Analog:** the `customerSummary` nextSession block in BOTH builders — but change the empty-note gate (RESEARCH refinement #4, Pitfall 4).

**Content check** (VERIFIED :142-144) — currently keys off `#customerSummary` only:
```javascript
case "nextSession": {
  const el = document.getElementById("customerSummary");
  return !!(el && el.value && el.value.trim().length > 0);
}
```
Must also return true when a next-date is present (so the toggle defaults on for a date-only session).

**Copy builder** (VERIFIED :274-276) and **export builder** (VERIFIED :410-412):
```javascript
if (summaryValue.length > 0) {
  lines.push("", `## ${stripRequired(App.getSectionLabel("nextSession", "session.form.nextSession"))}`, summaryValue);
}
```
Change gate to `(summaryValue.length > 0 || nextDatePresent)` and append the formatted date line (via `window.DateFormat`, honoring `portfolioDateFormat`) alongside the note. Render whichever of note/date is present (D-09). Open Question #1: CONTEXT cites both :208 (copy) and :410 (export) → apply to BOTH for symmetry.

---

### `assets/pdf-export.js` (service, PDF render) — NO direct code edit

**VERIFIED reuse claim:** `pdf-export.js` builds from `sessionData.markdown` (parses markdown, not structured fields — VERIFIED per RESEARCH :700,:876,:1277). The date reaches the PDF automatically once the export markdown includes it. **Static golden fixtures** (`.planning/fixtures/phase-23/fixture-*.json` carry a pre-baked `sessionData.markdown` string — VERIFIED fixture-en.json:6) will NOT change from this feature; existing SHA-256 hashes should PASS unchanged. Only regenerate a baseline if you DELIBERATELY add a date line to a fixture JSON's markdown — and then open the PDF and confirm the date renders (D-10; `reference-pdf-jsdom-inert-gates`). Do NOT blind-`--regenerate`.

---

### `assets/db.js` + `assets/backup.js` — NO code edit (VERIFIED reuse)

**db.js:** schemaless IndexedDB via `addSession`/`updateSession` — additive field, no migration; existing records lack the key and render `-` (mirrors overview.js:630 empty pattern). **backup.js:** sessions export as whole objects (`db.getAllSessions()` → ZIP :647,:675) and restore via `db.addSession(manifest.sessions[j])` (:1122-1123); `BACKUP_CONTENTS_KEYS` (:1373) is top-level content keys, NOT a per-field allowlist. Field round-trips automatically (D-11). Spot-check only.

---

### `assets/i18n-{en,he,de,cs}.js` (config)

**Analog:** existing key families (VERIFIED i18n-en.js:22 `overview.table.lastSession`, :50 `overview.filter.sort.lastSession`, :135 `session.form.nextSession`):
```javascript
"overview.table.lastSession": "Last Session",
"overview.filter.sort.lastSession": "Last Session",
"session.form.nextSession": "Information for Next Session",
```
Add across ALL FOUR languages: `overview.table.nextSession`, `overview.filter.sort.nextSession`, the `session.form.*` field label for the date input, and `overview.table.nextSession.overdue` (aria/title for the overdue marker).

---

### `assets/app.css` (config, style) — ONE new rule

Mirror overview cell styling, reuse existing tokens (RESEARCH A1: verify `--color-warning-text` + `--color-text-muted` exist in both `[data-theme]` scopes in `tokens.css`):
```css
.next-session-cell.is-overdue { color: var(--color-text-muted); }
.next-session-cell .next-overdue-dot {
  color: var(--color-warning-text);
  font-size: 0.6em; line-height: 1;
  margin-inline-end: 0.35em; vertical-align: middle;  /* margin-inline-end flips in RTL */
}
```
May warrant a `/gsd-ui-phase` pass (new visual treatment; D-04 discretion).

---

### `assets/demo-seed-data.json` (fixture)

Add a few `nextSessionDate` values to recent seeded sessions, near-future relative to their session dates so the column doesn't read as all-overdue (D-12).

---

### Tests

**Analogs (extend, don't invent):**
- `tests/38-next-session.test.js` (NEW) — field save/populate/reset + dynamic `min`; harness mirrors `30-form-dirty-revert.test.js` (real add-session jsdom page).
- `tests/38-next-overdue.test.js` (NEW) — TZ-pinned overdue `< today` boundary incl. today-NOT-overdue; mirror the inert-guard in `37-date-format.test.js:27-46` (pin `TZ`, abort loudly if the offset didn't take — never false-GREEN).
- Extend `tests/37-overview-sort.test.js` — the `allSortKeys` assertion at :164 currently deepEquals `['name','sessions','lastSession']` → add `'nextSession'`; add blanks-to-bottom-both-directions + header↔select sync.
- Extend `tests/30-export-markdown.test.js` + `30-section-visibility.test.js` — date line + date-only-session render + toggle gating (live builder, real output).
- Extend `tests/30-form-dirty-revert.test.js` — assert `nextSessionDate` captured in snapshot (Pitfall 2 guard).
- Extend `tests/35-demo-seed.test.js` — assert seeded `nextSessionDate` values present/near-future.

## Shared Patterns

### Date engine (parse / format / compare)
**Source:** `assets/date-format.js` (`window.DateFormat`) + `App.formatDate` (VERIFIED overview.js:630 uses `App.formatDate`).
**Apply to:** overview cell, overdue `< today` compare, export date line.
Use `window.DateFormat.parseLocal("YYYY-MM-DD")` (LOCAL, no UTC off-by-one) and `todayLocalISO()` for "today". NEVER `new Date(isoString)` (UTC off-by-one — the exact Phase 37 bug) or `new Date().toISOString().slice(0,10)`.

### textContent-only DOM rendering (XSS + test lock)
**Source:** overview.js:704-709 comment; locked by `31-overview-render-hardening.test.js`.
**Apply to:** the new cell and overdue marker — `textContent` / `createTextNode` / `createElement`, never `innerHTML`.

### Behavior-test-before-implementation
**Source:** MEMORY `feedback-behavior-verification`; `37-date-format.test.js:27-46` TZ inert-guard.
**Apply to:** the TZ-pinned overdue boundary, blanks-to-bottom, and dynamic-`min` tests — write them BEFORE implementation; TZ-pin the today comparison.

## No Analog Found

None. Every touch-point has a verified same-file or sibling-module analog. This is a pure mirror-the-Last-Session-column + mirror-the-note-field phase.

## Metadata

**Analog search scope:** `assets/overview.js`, `assets/add-session.js`, `assets/export-modal.js`, `assets/pdf-export.js`, `assets/backup.js`, `assets/db.js`, `index.html`, `assets/i18n-en.js`, `.planning/fixtures/phase-23/`.
**Files scanned (read/grep):** overview.js (:255-324, :610-709), add-session.js (:720-756, :1108-1167, :1651-1669), export-modal.js (:138-149, :268-281, :405-416), index.html (:148-179), i18n-en.js (grep).
**Pattern extraction date:** 2026-07-07
</content>
</invoke>
