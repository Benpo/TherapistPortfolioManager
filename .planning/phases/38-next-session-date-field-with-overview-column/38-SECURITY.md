---
phase: 38
slug: next-session-date-field-with-overview-column
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-07
---

# Phase 38 — Security

**Audited:** 2026-07-07
**Auditor:** gsd-secure-phase (State B — register built from 12 plan-time `<threat_model>` blocks; L1 grep-depth verification)
**ASVS Level:** L1
**Block-on:** high
**Register origin:** `register_authored_at_plan_time: true` (all 12 PLAN files carry a parseable `<threat_model>`)
**Waves:** W1 test-authoring (38-01/02/03), W2 implementation (38-04/05/06/07), gap-closure (38-08…38-12)

## Verdict: SECURED

All **25 register threats resolve to CLOSED** (`threats_open: 0`). Every `mitigate` disposition (17) was located in the implementation at grep depth and read in context; every `accept` disposition (8) is a documented client-local / no-new-surface residual, logged below in the Accepted Risks Log. No declared mitigation is absent. No SUMMARY reported a `## Threat Flags` section — zero unregistered threat surfaces appeared during implementation.

Every high-severity threat (5, all `mitigate`) is CLOSED, so no threat at or above the `high` block threshold remains open.

**Short-circuit applied:** `threats_open: 0 AND register_authored_at_plan_time: true AND asvs_level == 1` → L1 grep-depth is sufficient; the deep `gsd-security-auditor` (L2/L3) pass was correctly not required.

**Threat profile of this phase:** a purely client-local, zero-network PWA feature — a new optional `nextSessionDate` field, an overview column with an overdue cue, and its flow through export / PDF / backup / demo-seed. No network, auth, or server surface exists anywhere in the phase. The dominant risk classes are therefore (a) test-integrity / non-vacuous verification (Repudiation), (b) DOM-injection via the render path (Tampering), and (c) bidi/RTL rendering fidelity (Information Disclosure) — all of which the register covers and the implementation mitigates.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| user form input → session record | `#nextSessionDate` value crosses from the form into the IndexedDB session object | date string (`YYYY-MM-DD`), client-local, non-secret |
| `#sessionDate` → min constraint | The session date drives the allowable range of `#nextSessionDate` | date string (constraint only) |
| session record → overview DOM | Stored date values render into table cells + an overdue marker | formatted date + a11y label |
| stored date → overdue comparison | The overdue decision is wall-clock-local and must use the local date engine | boolean derivation |
| session field → export markdown → PDF | The date is injected into the markdown string that feeds the `.md` download and the PDF parser | plain markdown string |
| session object → ZIP backup | The whole session object (incl. `nextSessionDate`) is serialized to/from the backup archive | client-local session JSON |
| seed JSON → demo render | Seeded relative offsets flow through `applyRelativeDates` into the demo overview column | static seed JSON (no runtime input) |
| user-entered client name → DOM `textContent` / `document.title` | Raw client string composed with a formatted date, wrapped in inert Unicode isolates | text (rendered via `textContent` only) |
| form validation → toast + focus | Validation failure surfaces a localized toast and moves focus to a form control | i18n key (no new user data) |
| test harness → real module | Tests execute the real `add-session.js` / date engine / builders; a stubbed assertion could pass vacuously | test-integrity boundary |
| CI time zone → date logic | The overdue comparison is wall-clock-local; an un-pinned TZ makes the boundary test non-deterministic | test-integrity boundary |
| npm/pip/cargo installs | Package-manager supply chain | (no new dependencies this phase) |

---

## Threat Register / Verification

Reused threat IDs (`T-38-01…04` appear in both the W1 test plans and the W2 impl plans) are disambiguated by the **Plan** column.

| Threat ID | Plan | Category | Sev | Disp | Status | Evidence (file:line) |
|-----------|------|----------|-----|------|--------|----------------------|
| T-38-01 | 38-01 | Repudiation (vacuous test) | high | mitigate | CLOSED | TZ pinned to `America/New_York` before any `Date` use + re-exec child + `getTimezoneOffset` self-check that aborts loudly if inert — `tests/38-next-overdue.test.js:33-46` (mirrors `37-date-format.test.js`); no false-GREEN. |
| T-38-02 | 38-01 | Tampering (stubbed assert) | medium | mitigate | CLOSED | Asserts against REAL `add-session.js` output (no field stub); min-absent assertion rejects a `min=today` mistake — `tests/38-next-session.test.js` executes the live module. |
| T-38-03 | 38-02 | Repudiation (reduce-max drift) | high | mitigate | CLOSED | Runs the REAL comparator; fixtures that would pass a reduce-max bug FAIL (most-recent derivation guard); blanks tested both directions — `tests/37-overview-sort.test.js`. |
| T-38-04 | 38-02 | Tampering (note-only gate regression) | medium | mitigate | CLOSED | Asserts against the live export builders (copy + export), not a stub — `tests/30-export-markdown.test.js`. |
| T-38-05 | 38-03 | Tampering (i18n markup injection) | low | mitigate | CLOSED | Values are literal strings only, no HTML — `assets/i18n-en.js:23-24,138-140,181-182`; consumers render via `data-i18n`/`textContent`, never `innerHTML` (38-04/05). |
| T-38-01 | 38-04 | Tampering (`#nextSessionDate` input) | high | mitigate | CLOSED | Native `<input type="date">` constrains value to `YYYY-MM-DD` (no free-text parse); dynamic `min` bound to `#sessionDate` and REMOVED (never `today`) when empty — `assets/add-session.js:1738-1752` (`setNextSessionMin`), reads at `:1181-1194`. |
| T-38-06 | 38-04 | Tampering (revert blanks a saved value) | medium | mitigate | CLOSED | `snapshotFormState()` captures `nextSessionDate` so revert cannot silently blank it — `assets/add-session.js:763-785` (`nextSessionDate: nextSessionDateEl ? nextSessionDateEl.value : ""`); guarded by `tests/30-form-dirty-revert.test.js`. |
| T-38-02 | 38-05 | Tampering (overview cell XSS) | high | mitigate | CLOSED | Cell + overdue dot built via `createElement`/`createTextNode`/`textContent`/`appendChild`, never `innerHTML` — `assets/overview.js:715-733`; value via `App.formatDate`; locked by `31-overview-render-hardening.test.js`. |
| T-38-07 | 38-05 | Information Disclosure (a11y — color-only cue) | low | mitigate | CLOSED | Overdue is not color-only: `is-overdue` dims the cell text (2nd channel) and the dot carries `title` + `aria-label` (`overview.table.nextSession.overdue`) — `assets/overview.js:725-731` (WCAG 1.4.1). |
| T-38-08 | 38-05 | Repudiation (sort ≠ displayed value) | medium | mitigate | CLOSED | Sort derives most-recent via `mostRecentSession()` so it matches the displayed cell (no reduce-max drift) — `assets/overview.js:305-319`, `:621`; guarded by `tests/37-overview-sort.test.js`. |
| T-38-03 | 38-06 | Tampering (export markdown injection) | medium | mitigate | CLOSED | Date emitted as a plain markdown string line (`lines.push`), no `innerHTML` — `assets/export-modal.js:285-289,432-435`; section labels via `textContent` (`:472`); section toggle still gates it. |
| T-38-04 | 38-06 | Repudiation (silent PDF baseline drift) | high | mitigate | CLOSED | Static PDF fixtures expected unchanged; any hash drift halts the plan (no blind `--regenerate`, no force-pass, real-output check per D-10 + `reference-pdf-jsdom-inert-gates`) — `tests/pdf-*.test.js` present and green. |
| T-38-09 | 38-07 | Tampering (demo date drift) | low | mitigate | CLOSED | Relative `nextSessionDaysAgo` via the existing `isoDaysAgo` seam keeps the demo self-freshening (no absolute-date drift into all-overdue); seed values are static JSON, no runtime input — `assets/demo-seed.js:41-43`. |
| T-38-10 | 38-07 | Information Disclosure (backup round-trip) | low | accept | CLOSED | Field is client-local, non-secret; rides the existing whole-object session export with no new serialization surface (D-11). Logged below. |
| T-38-08-01 | 38-08 | Tampering (sort comparator crash) | low | accept | CLOSED | Pure client-side display ordering of local data; blank/missing coerces to a far-future sentinel `"9999-12-31"`, real values are date-input-validated `YYYY-MM-DD` — `assets/overview.js:317-319`. No integrity/confidentiality impact. Logged below. |
| T-38-09-01 | 38-09 | Tampering (silent partial-date save) | low | mitigate | CLOSED | `validity.badInput` guard (`isNextSessionDateIncomplete`) blocks the save on a partial entry and surfaces a localized error toast — `assets/add-session.js:1181-1183` (`showToast("", "toast.nextSessionDateIncomplete", {tone:"error", focus:nextSessionDateEl})`). Fixes UAT test 5 defect. |
| T-38-09-02 | 38-09 | Denial of function (guard over-blocks empty) | low | mitigate | CLOSED | Guard keys ONLY on `validity.badInput`; empty (`badInput=false, value=""`) is explicitly allowed so the optional date still saves — `assets/add-session.js:79-80` note + guard scope. |
| T-38-10-01 | 38-10 | Tampering (CSS injection) | low | accept | CLOSED | Static CSS cannot carry/alter data; the rule only sets `direction`/`text-align` on native date inputs — no script/content-injection surface. Logged below. |
| T-38-10-02 | 38-10 | Information Disclosure (date value rendering) | low | accept | CLOSED | No change to stored/transmitted values; purely visual segment ordering. Logged below. |
| T-38-11-01 | 38-11 | Tampering (bidi isolate injection) | low | mitigate | CLOSED | Rendering stays `textContent`-only; isolate chars U+2066/U+2068/U+2069 are non-executing formatting codepoints (bare string, never `<bdo>` markup) — `assets/date-format.js:24,33-37,84-98,128` (`isolate()`). No injection surface. |
| T-38-11-02 | 38-11 | Information Disclosure (isolate output) | low | accept | CLOSED | Helper only wraps the same displayed string with invisible bidi controls; stored/exported logical data unchanged. Logged below. |
| T-38-12-01 | 38-12 | Tampering (toast focus target) | low | mitigate | CLOSED | `focus`/`scrollIntoView` guarded to elements (`typeof …=== "function"`); a missing/invalid target is a no-op, never throws — `assets/app.js:864-869`. No new injection/navigation surface. |
| T-38-12-02 | 38-12 | Denial of service (toast duration) | low | accept | CLOSED | Longer error auto-dismiss is a fixed constant and still auto-clears; cannot be driven by user input — `assets/app.js:838`. Logged below. |
| T-38-12-03 | 38-12 | Information Disclosure (toast message) | low | accept | CLOSED | Migrated calls keep the empty message arg + existing i18n keys; no new user data rendered in the toast. Logged below. |
| T-38-SC | 38-01…07 | Tampering (supply chain) | low | accept | CLOSED | Phase installed no packages: `dependencies: {}`, the only dev dep (`jsdom`) was added in Phase 30 (`f4be52a`, 2026-06-26); no phase-38 commit touched `package.json`/`package-lock.json`. App libs are vendored (`jspdf.min.js`/`jszip.min.js`/`bidi.min.js`). Logged below. |

*Status: open · closed · open — below `high` threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `high` count toward `threats_open`.*

---

## Unregistered Flags

None. No Phase-38 SUMMARY declares a `## Threat Flags` section, and no new attack surface appeared during implementation that lacks a register mapping. The phase is client-local and zero-network throughout (no `fetch`/XHR added anywhere).

---

## Accepted Risks Log

*Accepted risks are documented residuals and do not resurface in future audit runs.*

| Risk ID | Plan | Rationale | Accepted By | Date |
|---------|------|-----------|-------------|------|
| T-38-10 | 38-07 | Backup round-trip of `nextSessionDate` is a client-local, non-secret field riding the pre-existing whole-object session export; no new serialization surface (D-11). | Ben | 2026-07-07 |
| T-38-08-01 | 38-08 | Sort comparator operates on local display data only; malformed input coerces to a far-future sentinel and cannot crash; real values are native-date-validated. No integrity/confidentiality impact. | Ben | 2026-07-07 |
| T-38-10-01 | 38-10 | Static `direction`/`text-align` CSS on native date inputs — no script or content-injection surface. | Ben | 2026-07-07 |
| T-38-10-02 | 38-10 | Purely visual segment ordering; no stored/transmitted value change. | Ben | 2026-07-07 |
| T-38-11-02 | 38-11 | `isolate()` wraps the displayed string with invisible bidi controls only; logical stored/exported data unchanged. | Ben | 2026-07-07 |
| T-38-12-02 | 38-12 | Error-toast auto-dismiss is a fixed constant that still auto-clears and is not user-driven. | Ben | 2026-07-07 |
| T-38-12-03 | 38-12 | Migrated toast calls keep the empty message arg + existing i18n keys; no new user data rendered. | Ben | 2026-07-07 |
| T-38-SC | 38-01…07 | Phase added zero dependencies; no package manifest was touched. Supply-chain risk not introduced by this phase. | Ben | 2026-07-07 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-07 | 25 | 25 | 0 | gsd-secure-phase (State B, L1 grep-depth) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-07
