# Phase 37 — Terminology disambiguation + Session Format / Heart-Wall filters (DECISIONS)

**Captured:** 2026-07-05 · **Status:** decisions locked, ready to plan · **Folded into Phase 37** (ships together; Ben pushes all at once).
Origin: UAT — "Session Type" collision + date-format reality (see dashboard note 2026-07-03).

## Problem (confirmed by codebase cartography)
Three unrelated concepts all surfaced as some form of "type":
1. **Heart-Wall status** (per-session booleans `isHeartShield` + `shieldRemoved`) — powered the filters `#clientHeartShieldFilter` (Overview) + `#sessionTypeFilter` (Sessions), labeled "Session Type".
2. **Session modality** (per-session string `sessionType` = clinic/online/remote/proxy/other + `custom.NNN`; editable list in localStorage `portfolioSessionTypes`) — the new Phase-37 field, also labeled "Session Type".
3. **Client type** (child/adult/animal/other) — labeled "Client Type".
EN had three "Session Type" labels; HE collided (`סוג המפגש` vs `סוג מפגש`) and was internally inconsistent (`סוג טיפול`/`סוג מפגש`; `מגננת לב`/`הגנת הלב`).

## Domain basis
"Heart-Shield" is not real Emotion Code vocabulary — canonical is **Heart-Wall®** (Israeli practitioners: **חומת הלב**). "Proxy" is a distinct modality (treating someone *through* another person present), NOT a synonym for Remote — kept separate per Ben. Trademark: using "Heart-Wall" as a plain descriptive in-app label = LOW risk (nominative/referential fair use, US + Art.14 EUTMR/§23 MarkenG); guardrail = a "not affiliated with Discover Healing" + trademark-attribution disclaimer in About/Legal + Impressum.

## LOCKED DECISIONS

### D1 · Three clean axes (only "Client Type" keeps "type")
| Axis | EN | HE | DE | CS |
|---|---|---|---|---|
| Client Type *(unchanged)* | Client Type | סוג לקוח | Kliententyp | Typ klienta |
| **Session Format** (modality) | **Session Format** | **אופן הטיפול** | **Sitzungsart** *(unchanged)* | **Typ sezení** *(unchanged)* |
| **Heart-Wall** (status) | **Heart-Wall** | **חומת הלב** | **Heart-Wall** | **Heart-Wall** |

- The **5 modality values are unchanged** (labels + keys): In-person `clinic` / Online `online` / Remote `remote` / Proxy `proxy` / Other `other`; HE פרונטלי/מקוון/מרחוק/מיופה כוח/אחר. **Proxy kept distinct from Remote.**
- **Heart-Wall term replaces "Heart Shield" on ALL surfaces:** the filter, the table column (`sessions.table.heartShield`), the add-session form section (`session.form.heartShield`), the reporting stat (`reporting.heartShieldCleared`), and the active/removed badges. English "Heart-Wall" in EN/DE/CS; חומת הלב in HE. Unify the HE inconsistencies (`מגננת לב`/`הגנת הלב` → חומת הלב; `סוג טיפול`/`סוג מפגש` retired).
- Collision-resolution logic: once the heart side becomes **Heart-Wall** in every language, the "two Session Types" problem disappears everywhere — which is why DE/CS modality labels need no change.

### D2 · Filters on Overview + Sessions
- **Add a Session Format filter** on both screens — **multi-select**, rendered as a **dropdown-with-checkboxes** (pill button "All formats ▾" opening a checkbox list; scales to custom types). The per-session *entry* stays single-select.
- **Remove the Heart-Wall dropdown → a single "Heart-Wall" toggle** on both screens. Control = the **existing `.toggle-switch` / `.toggle-slider`** from the Fields tab (settings.js:204-216 / app.css:1951), green when on, RTL-aware (not a pill, not a native checkbox — Ben picked candidate A).
- **D2a (Ben):** the Heart-Wall toggle shows **all sessions where the Heart-Wall was handled** (`isHeartShield === true`), regardless of whether it was released (`shieldRemoved`). One control, no second toggle.
- **D2b · Sort (Ben: "Both"):** add **click-to-sort on the Overview table column headers** (Name / Sessions / Last Session — arrow shows direction) **AND keep** the existing "Sort By" dropdown in the filter bar. Both drive the same sort state. (Overview is a real `<table>`, index.html:159; the 3 sort options map 1:1 to columns.)
- Overview filter bar therefore keeps 6 controls (Search · Client Type · Session Format · Heart-Wall toggle · Year · Sort) — wraps to 2 rows on desktop / stacks on mobile; **density accepted** (Ben chose "Both", keeping the Sort dropdown).
- **Custom session types** appear as Session Format filter options (dynamic).
- **Legacy sessions** (no `sessionType`) resolve to `clinic`/In-person — accepted; they're indistinguishable from real in-person (noted).
- Overview filters *clients* (client has ≥1 matching session); Sessions filters *sessions* — Session Format means the same on both.

### D3 · No data migration
Keep the stored field names `isHeartShield`/`shieldRemoved` and the value key `clinic`. **Labels only change.** Zero DB/schema churn.

### D4 · Trademark disclaimer (new)
Short "Sessions Garden is independent, not affiliated with / endorsed by Discover Healing; Emotion Code®/Body Code™/Heart-Wall® are trademarks of Wellness Unmasked, Inc., used descriptively" line in **About/Legal + Impressum**, 4 languages. Drafted → **legal-native-speaker + challenger phrasing review** (esp. Czech, the no-in-house-speaker language) before it lands.

### D5 · Reviews / gates (maintainer reframe)
No "Sapir translation review" gate (stale — Ben is sole maintainer). **Ben confirms HE + DE himself.** Czech regular strings = machine-translate + spot-check; the **disclaimer** gets the careful native/legal/challenger pass.

## Out of scope / parked
- **Dates:** the `app:dateformat` live-update wiring, and the native-`<input type="date">` browser-locale reality (Chrome dd.mm vs Edge mm.dd) — Ben parked; revisit later with the "format-echo beside the picker" idea.

## Next
UI-mock the two filter bars (LTR + Hebrew RTL, mobile) for Ben → UI contract → plan (add Phase 37 plans) → execute (i18n ×4 + filter logic + heart checkbox + disclaimer). See [[project-maintainer-reframe-ben-solo]], [[project-sessions-garden-legal-entity]], [[reference-german-gewerbe-legal]].
