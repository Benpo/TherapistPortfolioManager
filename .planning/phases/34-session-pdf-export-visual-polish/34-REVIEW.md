---
phase: 34-session-pdf-export-visual-polish
reviewed: 2026-06-30T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - assets/pdf-export.js
  - assets/export-modal.js
  - assets/add-session.js
  - assets/app.js
  - tests/_helpers/jsdom-pdf-env.js
  - tests/_helpers/mock-portfolio-db.js
findings:
  critical: 1
  warning: 1
  info: 4
  total: 6
status: issues_found
---

# Phase 34: Code Review Report

**Reviewed:** 2026-06-30
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed the Phase-34 PDF-export redesign (diff base `e9fce0c^`): new render passes
(`drawHeaderBand`, `drawClientCard`, `drawSeverityBlock`, `drawFooterBand`,
`drawRunningHeader`), the chronological session-ordinal derivation, the
`saveSessionForm` extraction, the locale-aware `formatDate`, and the two test helpers.

The bidi/RTL machinery, the `loadScriptOnce` short-circuit, the ordinal sort +
tie-break + renumber/unsaved edge cases, the footer auto-fit, and the
`saveSessionForm` extraction are all correct on inspection. No security issues
(all user data routes through `textContent` / `isInputVisual:false`; the one
`innerHTML` site is `MdRender`-escaped; no secrets; `addImage` consumes a vendored
asset).

One real correctness defect was found in the signature feature of the phase: the
severity two-bar block renders an **unrecorded** before/after value as a literal
`0` instead of the intended `–`. Because the 112/112 suite is byte-comparison
against pinned golden baselines, it pins whatever bytes the renderer emits and
cannot catch this — it is exactly the "tests pass ≠ correct" gap. The remaining
items are robustness / cleanup.

## Critical Issues

### CR-01: Unrecorded severity value renders as `0`, not `–` (the dash branch is dead)

**File:** `assets/pdf-export.js:1701-1704` (consumed at `:1696`, `:1713-1714`)
**Issue:**
`drawSeverityBlock` decides "value present?" with:
```js
var beforeVal = Number(issue.before);
var afterVal  = Number(issue.after);
var hasBefore = isFinite(beforeVal);
var hasAfter  = isFinite(afterVal);
```
For an issue where the therapist never picked a before/after value,
`getIssuesPayload()` sets the field to **`null`** (not `undefined`) — see
`assets/add-session.js:706-708` (`App.getSeverityValue` returns `null` when nothing
is selected, `assets/app.js:957-962`). `Number(null) === 0` and `isFinite(0) === true`,
so `hasBefore`/`hasAfter` are `true` and line 1696 draws the numeral
`String(value)` → **`"0"`**. The intended missing-value glyph `'–'` is therefore
**never reached** on the export path (the only producer, `getIssuesPayload`, never
yields `undefined`).

Why it matters: this is a client-facing therapeutic progress document. On a 0–10
scale, `0` is a legitimate value meaning "fully resolved / no severity"; printing
`0` for a value the practitioner never recorded misrepresents clinical data and
silently conflates "resolved" with "not measured." The text/clipboard path handles
this correctly (`export-modal.js:184-186` checks `!== null && !== undefined`), so
the same session exports inconsistently as bars vs. text.

**Fix:** treat `null`/`undefined` as "no value" before coercing:
```js
var hasBefore = issue.before != null && isFinite(Number(issue.before));
var hasAfter  = issue.after  != null && isFinite(Number(issue.after));
var beforeVal = hasBefore ? Number(issue.before) : NaN;
var afterVal  = hasAfter  ? Number(issue.after)  : NaN;
```
(After this fix the existing `'–'` branch at `:1696` becomes live, and a golden
baseline that includes a partially-filled issue should be regenerated.)

## Warnings

### WR-01: `saveSessionForm` persists with no error handling — a failed write fails silently

**File:** `assets/add-session.js:1116-1155` (caller `:1159-1172`)
**Issue:** `saveSessionForm()` awaits `PortfolioDB.updateSession` / `addSession`
with no `try/catch`, and the submit listener (`:1160`, an `async` handler) awaits it
without one either. If the IndexedDB write rejects (quota, blocked upgrade,
private-mode eviction), the user sees no error toast, `formSaving` is never set, and
the rejection surfaces only as an `unhandledrejection`. The practitioner believes
the session is unsaved/limbo with zero feedback — a data-loss-adjacent UX hole.
This structure is pre-existing (the extraction preserved it verbatim) but it now
lives in the explicitly-touched save path. Note the sibling PDF/share handlers
(`export-modal.js:668-674`, `:734-739`) *do* wrap their async work in `try/catch` +
toast, so the convention exists.

**Fix:** wrap the persist + redirect in `try/catch`, e.g. in the submit listener:
```js
let result;
try { result = await saveSessionForm(); }
catch (err) { console.error("Session save failed:", err); App.showToast("", "toast.errorGeneric"); return; }
if (!result) return;
```

## Info

### IN-01: `saveSessionForm` returns an unused `isNew` field (dead output)

**File:** `assets/add-session.js:1114` / `:1156`
**Issue:** `isNew` is computed and returned in `{ savedId, isNew }`, and the JSDoc
advertises it for "the caller," but the only caller (`:1165`) reads `result.savedId`
only. `grep` confirms no other consumer. Dead return surface.
**Fix:** drop `isNew` until a caller needs it, or document it as a reserved/forward
field.

### IN-02: Two divergent `formatDate` defaults (en-US vs en-GB); pdf-export's ISO path is dead on the export flow

**File:** `assets/app.js:908` (default `en-US`) vs `assets/pdf-export.js:685` (default `en-GB`)
**Issue:** `App.formatDate` defaults non-mapped locales to `en-US` ("Jun 30, 2026");
`pdf-export.js`'s internal `formatDate` defaults to `en-GB` ("30 June 2026"). In the
real export flow the card date is pre-formatted by `App.formatDate`
(`export-modal.js:328`) and passed as an already-localized string, so pdf-export's
`formatDate` hits its non-ISO pass-through and the `en-GB` branch never runs — a
latent inconsistency that will bite if a raw ISO date is ever passed directly.
**Fix:** have pdf-export reuse `App.formatDate` (or align the default locale) so the
two implementations cannot drift.

### IN-03: Client name in `drawClientCard` can overflow the card / page (no wrap or clamp)

**File:** `assets/pdf-export.js:1095-1104`
**Issue:** the 23pt client name is drawn as a single unmeasured line inside a
fixed-width (`USABLE_W`) / fixed-height (`cardHeight = 88`) card. A long name (or a
long localized session-type pill on the meta row, `:1168-1196`) overruns the card
edge / collides with adjacent meta items; nothing measures against `USABLE_W`.
**Fix:** measure with `getStringUnitWidth` and either shrink-to-fit (reuse the
`fitSize` helper pattern from the footer) or truncate with an ellipsis.

### IN-04: Footer auto-fit can still overlap the centered page label in the degenerate case

**File:** `assets/pdf-export.js:1783-1791`
**Issue:** `fitSize` floors at `FOOT_MIN_SIZE` (6.5pt) and the `maxWidth <= 0` branch
returns `minSize` and still draws, so the comment's claim that a side zone "can
never reach the center label" is inaccurate for a sufficiently narrow clearance —
it would render at 6.5pt and overlap rather than be suppressed. Impact is low (the
made-with mark is short and fixed), but the guarantee is overstated.
**Fix:** if `fitSize` is forced to the floor and the text still exceeds `maxWidth`,
omit the side zone (or truncate) instead of drawing an overlapping line; soften the
comment to match actual behavior.

---

_Reviewed: 2026-06-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
