# Phase 37 — Date-Correctness Engine (F6 + F5-logic) — Research

**Researched:** 2026-07-02
**Domain:** Local-time calendar-date parsing/formatting; `Intl.DateTimeFormat`; Hebrew RTL bidi; jsPDF golden-baseline testing; TZ-pinned behavior tests
**Lane:** The date engine ONLY — canonical helper, full UTC-parse sweep, format spec, Hebrew LTR wrap, PDF integration, baseline regen, TZ tests. The Personalization tab UI, the F5 `<select>` element, F4 session types, storage/backup plumbing, and the birthdate input-element swap are the **other researcher's** lane.
**Confidence:** HIGH (all call-site claims verified by direct grep + read of the current tree; `Intl` output claims are CITED from ECMA-402 knowledge and MUST be pinned by tests before trusting).

---

## User Constraints (from 37-CONTEXT.md)

### Locked Decisions (this lane)
- **D-01** Session `date` / client `birthDate` are `YYYY-MM-DD` strings already → **no data migration**. Parse & format **local** everywhere; delete all UTC-parse of calendar dates.
- **D-02** One canonical helper `assets/date-format.js` (new IIFE). Core: regex-extract leading `\d{4}-\d{2}-\d{2}` → `new Date(y, m-1, d)` (LOCAL, never `new Date("YYYY-MM-DD")` which is UTC-midnight) → format. Regex also handles legacy full-ISO values (back-compat). Loaded via `<script>` **before** `app.js` and `pdf-export.js` on every app HTML page.
- **D-03** Full UTC-parse sweep — every calendar-date parse routes through the helper (display sites, input default, `countSessionsThisMonth` month-boundary, sort tie-breaks, birthDate/age math, backup filename UTC-vs-local). Verification: zero remaining UTC-parse of calendar dates app-wide.
- **D-04** English default = US month-first ("Jul 2, 2026" / en-US), unifying the UI (was en-US) and PDF (was en-GB "2 July 2026"). PDF golden baselines for English WILL change — regenerated deliberately, visually reviewed, NOT force-passed.
- **D-05** 6 format options: Auto / Month Day, Year / Day Month Year / MM/DD/YYYY / DD/MM/YYYY / YYYY-MM-DD.
- **D-06** All numeric formats use `/` separators in ALL 4 languages (yyyy-mm-dd uses `-`). No locale dots/dashes.
- **D-07** Hebrew numeric dates render LTR (wrapped) so they don't flip.
- **D-08** Chosen format applies to: session list, overview/dashboard, browser tab title, PDF session-card date, PDF footer "Exported on".
- **D-19** `tests/34-date-locale.test.js` asserts old behavior → rewrite to assert fixed behavior; SHA-256 fixture baselines regenerated with real-output verification.
- **D-20** New TZ-pinned test file pins `process.env.TZ='America/New_York'`; falsifiable spine: `App.formatDate('2026-07-02')` returns "Jul 1" today, MUST return "Jul 2" after fix; one assertion per format option; suite stays green.
- **D-21** `tests/_helpers/jsdom-pdf-env.js` injects `window.DateFormat` into the jsdom PDF env.

### Seams with the other lane (note, don't solve)
- **`portfolioDateFormat` value contract (LOCKED):** keys `"auto"`, `"month-day-year"`, `"day-month-year"`, `"mm/dd/yyyy"`, `"dd/mm/yyyy"`, `"yyyy-mm-dd"`; default when unset = `"auto"`. THIS lane READS + APPLIES the key. The other lane owns the picker that WRITES it + backup export/restore of the key.
- **Birthdate:** other lane swaps 3 dropdowns → `<input type="date">`. THIS lane only ensures age-math parses the `.value` string (`YYYY-MM-DD`) **locally**, never `.valueAsDate`. (Verified: the age sites already read `.value` — only the parse is UTC; see sweep.)
- **F4 session types:** entirely other lane. `formatSessionType` is NOT a date concern — ignore.

### Deferred (OUT OF SCOPE)
F1, F2, F3, F7, F8, F9, F10; per-language rename; Batch-3 comments on backup/app/pdf-export; license re-validation.

---

## Proposed Requirements (date engine — advisory, orchestrator reconciles IDs)

Following the `REQUIREMENTS.md` `FAMILY-0N` style:

| ID | Requirement |
|----|-------------|
| **DATE-01** | One canonical `window.DateFormat` IIFE in `assets/date-format.js`, zero-dependency, regex-extracts a leading `YYYY-MM-DD` and constructs a **local** `Date(y,m-1,d)`; exposes `format`, `parseLocal`, `todayLocalISO`, `getPreference`. |
| **DATE-02** | Every calendar-date parse/format in the app routes through the helper; zero remaining `new Date("<calendar-date>")` UTC-parse app-wide (verified by grep gate + behavior tests). Legitimate wall-clock timestamps are NOT rerouted. |
| **DATE-03** | The 6 format options render correctly across en/he/de/cs per the format spec; numeric formats use `/` (yyyy-mm-dd uses `-`); "Auto" reproduces the current per-language Intl output (en → en-US). |
| **DATE-04** | Hebrew numeric dates render LTR in the RTL layout across all 4 consumption contexts (DOM, `document.title`, PDF, markdown). |
| **DATE-05** | PDF session-card date and footer "Exported on" use the chosen format via `window.DateFormat`; `export-modal.js` stops pre-formatting and passes raw ISO. |
| **DATE-06** | `countSessionsThisMonth` counts by **local** month boundary (bug fix); the new-session date input defaults to **local** today. |
| **DATE-07** | TZ-pinned falsifiable behavior tests (authored before implementation) prove the fix in `America/New_York`; `34-date-locale.test.js` rewritten; SHA-256 PDF baselines regenerated with real-output visual review. |

---

## Summary

The bug is a single root cause repeated across the codebase: **`new Date("YYYY-MM-DD")` parses as UTC midnight**, so in any negative-UTC timezone the local calendar day is the day *before*. `App.formatDate` (`assets/app.js:940`) is the primary display site; the same UTC-parse recurs in `countSessionsThisMonth`, age math, sort tie-breaks, and the new-session input default. The fix is one canonical local-time helper (`assets/date-format.js` → `window.DateFormat`) that every calendar-date parse/format routes through, plus a full sweep that leaves legitimate wall-clock timestamps (`createdAt`, `exportedAt`, `Date.now()`) untouched.

Two pleasant surprises from reading the real code: (1) **`pdf-export.js`'s own `formatDate` is already local-correct** — it appends `"T00:00:00"` (local parse) — it is only *locale*-wrong (en-GB, and it's dead once we route through the helper). (2) **The birthdate age sites already read `.value`** (the string), not `.valueAsDate`; only their *parse* is UTC. So the sweep is mostly about the parse, not the input read. The single genuine input bug is `add-session.js:516` `sessionDate.valueAsDate = new Date()`, which must become `sessionDate.value = DateFormat.todayLocalISO()`.

The PDF baseline change is narrower than feared: fixtures pass a **raw ISO** `sessionDate` and set **no** `exportedOn`, so the ONLY hash-affecting change per fixture is the session-card date string. Only `fixture-en` is *guaranteed* to drift (en-GB "8 May 2026" → en-US "May 8, 2026"); de/cs/he should stay byte-identical IF "Auto" reproduces the current per-locale Intl output — which the executor must confirm by real render + visual review, never `--regenerate` blindly (MEMORY: `reference-pdf-jsdom-inert-gates`).

**Primary recommendation:** Build `window.DateFormat` as a pure zero-dependency IIFE with `format/parseLocal/todayLocalISO/getPreference`. Keep `App.formatDate` and `pdf-export.js formatDate` as thin wrappers that delegate to it (call sites unchanged). Author the TZ-pinned falsifiable tests FIRST. Regenerate exactly the 5 `.planning/fixtures/phase-23/*.pdf.sha256` baselines with visual verification.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Rationale |
|------------|-------------|-----------|
| Calendar-date parse (string → local Date) | `date-format.js` (client util) | Single source of truth; kills UTC-midnight off-by-one |
| Calendar-date format (Date → display string) | `date-format.js` | One `Intl`/hand-assembly path for all 6×4 combos |
| Reading the format preference | `date-format.js` (`getPreference`) reads `localStorage` | Mirrors `portfolioLang`/`portfolioTheme`; call sites stay dumb |
| In-app display formatting | `app.js App.formatDate` → delegates to `DateFormat` | Existing public API; ~10 call sites unchanged |
| PDF card + footer formatting | `pdf-export.js formatDate` → delegates to `DateFormat` | jsPDF text tier; runs in jsdom for tests |
| "Today" for input default + filenames | `date-format.js todayLocalISO` | Local wall-clock day, TZ-safe |
| Wall-clock timestamps (createdAt/exportedAt) | unchanged (`Date.now()`/`toISOString`) | NOT calendar dates — must not be rerouted |

---

## Module API — `assets/date-format.js` → `window.DateFormat`

**Shape** (mirrors `crashlog.js`/`version.js` `var X = (function(){ 'use strict'; ... })()` — but registers on `window`; production convention is `window.X = (() => { 'use strict'; ... })()`). Zero dependencies. `[VERIFIED: codebase — assets/crashlog.js:24, assets/version.js:22]`

```js
// assets/date-format.js
window.DateFormat = (function () {
  'use strict';

  var VALID_KEYS = ['auto','month-day-year','day-month-year','mm/dd/yyyy','dd/mm/yyyy','yyyy-mm-dd'];
  var LOCALE_MAP = { he: 'he-IL', de: 'de-DE', cs: 'cs-CZ' }; // else en-US (D-04)

  // Extract a LOCAL Date from the leading YYYY-MM-DD of any isoish input.
  // Handles bare "2026-07-02" AND legacy full-ISO "2026-07-02T00:00:00.000Z"
  // (regex grabs only the leading date part → never a UTC-midnight shift).
  function parseLocal(input) {
    if (!input) return null;
    if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(input));
    if (!m) return null;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); // LOCAL, not UTC
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function todayLocalISO() {
    var t = new Date();
    return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
  }

  function getPreference() {
    try { return localStorage.getItem('portfolioDateFormat') || 'auto'; }
    catch (e) { return 'auto'; }
  }

  function resolveLocale(lang) { return LOCALE_MAP[lang] || 'en-US'; }

  // input: isoish string | Date ; formatKey: one of VALID_KEYS ; lang: 'en'|'he'|'de'|'cs'
  function format(input, formatKey, lang) {
    var d = parseLocal(input);
    if (!d) return input ? String(input) : '';          // invalid → pass through / empty
    if (VALID_KEYS.indexOf(formatKey) === -1) formatKey = 'auto';
    var locale = resolveLocale(lang);
    var y = d.getFullYear(), mo = d.getMonth() + 1, day = d.getDate();
    var out;
    switch (formatKey) {
      case 'yyyy-mm-dd':      out = y + '-' + pad(mo) + '-' + pad(day); break;      // D-06 dashes
      case 'mm/dd/yyyy':      out = pad(mo) + '/' + pad(day) + '/' + y; break;      // D-06 slashes
      case 'dd/mm/yyyy':      out = pad(day) + '/' + pad(mo) + '/' + y; break;      // D-06 slashes
      case 'month-day-year':  out = shortMonth(d, locale) + ' ' + day + ', ' + y; break;
      case 'day-month-year':  out = day + ' ' + shortMonth(d, locale) + ' ' + y; break;
      case 'auto':
      default:                out = autoFormat(d, lang, locale); break;
    }
    return maybeWrapLtr(out, formatKey, lang);
  }

  function shortMonth(d, locale) {
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(d);
  }

  // "Auto" == the CURRENT App.formatDate behavior, byte-for-byte:
  //   en → en-US short  ("Jul 2, 2026")     [D-04]
  //   he → he-IL short  ("2 ביולי 2026")
  //   de → de-DE long   ("2. Juli 2026")
  //   cs → cs-CZ long   ("2. července 2026")
  function autoFormat(d, lang, locale) {
    var month = (lang === 'de' || lang === 'cs') ? 'long' : 'short';
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: month, day: 'numeric' }).format(d);
  }

  // D-07: numeric formats in Hebrew must render LTR. Wrap with Unicode isolates
  // (U+2066 LRI … U+2069 PDI) — a BARE-STRING solution safe for every context
  // (textContent, document.title, markdown). See "Hebrew LTR wrapping".
  function isNumericKey(k) { return k === 'mm/dd/yyyy' || k === 'dd/mm/yyyy' || k === 'yyyy-mm-dd'; }
  function maybeWrapLtr(str, formatKey, lang) {
    if (lang === 'he' && isNumericKey(formatKey)) return '⁦' + str + '⁩';
    return str;
  }

  return {
    format: format,
    parseLocal: parseLocal,
    todayLocalISO: todayLocalISO,
    getPreference: getPreference
  };
})();
```

**Public surface:**
- `DateFormat.format(input, formatKey, lang)` → display string. Empty/falsy input → `""`; unparseable → the raw string (safe pass-through, matches current `App.formatDate` line 943). `[VERIFIED: codebase — app.js:941,943]`
- `DateFormat.parseLocal(input)` → local `Date` or `null` (for age math, sort, month-boundary count).
- `DateFormat.todayLocalISO()` → `"YYYY-MM-DD"` local (input default + filenames).
- `DateFormat.getPreference()` → `localStorage['portfolioDateFormat'] || 'auto'` (try/catch, mirrors backup.js:178). `[VERIFIED: codebase — backup.js:178]`

**Wrapper delegation (call sites unchanged):**
- `App.formatDate(dateString)` (app.js:940) → `return window.DateFormat.format(dateString, window.DateFormat.getPreference(), currentLang);` — reads the preference internally so all ~10 `App.formatDate(...)` callers need no change. `[VERIFIED: 10+ App.formatDate call sites]`
- `pdf-export.js formatDate(sessionDate, uiLang)` (pdf-export.js:674) → `return window.DateFormat.format(sessionDate, window.DateFormat.getPreference(), uiLang);` — the old en-GB/`T00:00:00` body becomes dead code. `[VERIFIED: pdf-export.js:674-690]`

---

## The 6 Format Options × 4 Locales (D-05/D-06)

`[CITED: ECMA-402 Intl.DateTimeFormat — outputs MUST be pinned by tests before trusting; Node/V8 ICU version can vary spacing/month tokens]`

| Key | Method | en (en-US) | he (he-IL) | de (de-DE) | cs (cs-CZ) |
|-----|--------|-----------|-----------|-----------|-----------|
| `auto` | `Intl` `{year,month,day}`; month `short` for en/he, `long` for de/cs (reproduces current app.js) | `Jul 2, 2026` | `2 ביולי 2026` | `2. Juli 2026` | `2. července 2026` |
| `month-day-year` | hand-assemble `shortMonth + " " + D + ", " + Y`; `shortMonth` = `Intl {month:'short'}` (localized) | `Jul 2, 2026` | `יולי 2, 2026`¹ | `Juli 2, 2026`² | `čvc 2, 2026`² |
| `day-month-year` | hand-assemble `D + " " + shortMonth + " " + Y` | `2 Jul 2026` | `2 יולי 2026` | `2 Juli 2026`² | `2 čvc 2026` |
| `mm/dd/yyyy` | hand-assemble `MM/DD/YYYY`, ASCII digits, `/` | `07/02/2026` | `07/02/2026` (LTR-wrapped) | `07/02/2026` | `07/02/2026` |
| `dd/mm/yyyy` | hand-assemble `DD/MM/YYYY`, ASCII digits, `/` | `02/07/2026` | `02/07/2026` (LTR-wrapped) | `02/07/2026` | `02/07/2026` |
| `yyyy-mm-dd` | hand-assemble `YYYY-MM-DD`, ASCII digits, `-` | `2026-07-02` | `2026-07-02` (LTR-wrapped) | `2026-07-02` | `2026-07-02` |

¹ Hebrew month-name order forced by hand-assembly — the localized month token is used but the *order* is fixed by the option. This is the intended semantics of an explicit format choice (the user asked for "Month Day, Year"). ² Same: the option forces the presentation order across all locales while keeping the localized short-month token.

**Key rules:**
- **Only `auto` uses `Intl` for full ordering.** All other options **hand-assemble** so the presentation order is stable across locales and (for numeric) the separators are forced `/`/`-` per D-06. `[VERIFIED: D-06 requires this; Intl cannot force order]`
- **Numeric = ASCII digits** (do not localize digits; Hebrew/German/Czech all use ASCII digits in practice, and the app already renders ASCII digits in dates — see `pdf-digit-order.test.js` which asserts "2026" not Eastern-Arabic). `[VERIFIED: tests/pdf-digit-order.test.js]`
- **`auto` en = en-US** ("Jul 2, 2026"), never en-GB (D-04). This is exactly what `app.js:952` already produces (`localeMap[currentLang] || "en-US"`). `[VERIFIED: app.js:951-957]`
- The named-month options (`month-day-year`/`day-month-year`) reuse the `shortMonth` helper so a language's localized abbreviation appears; verify the exact `Intl {month:'short'}` token per locale in tests (de "Juli"/"Jul", cs "čvc", he "יולי" vary by ICU). `[CITED: ECMA-402]`

---

## Hebrew Numeric LTR Wrapping (D-07)

**The problem:** In an RTL Hebrew layout, a numeric string like `07/02/2026` can visually reorder to `2026/02/07` because the `/` separators are bidi-neutral and the number runs are laid out per the surrounding RTL direction. `[CITED: Unicode Bidirectional Algorithm UAX #9]`

**The helper returns a BARE string** consumed in four contexts, which dictates the wrapping mechanism:

| Context | Call path | Can it accept HTML markup? | Correct wrapper |
|---------|-----------|---------------------------|-----------------|
| (a) DOM display | mostly `el.textContent = App.formatDate(...)` (e.g. overview.js:498, sessions.js:106) | **No** — `textContent` would show literal `<bdo>` tags | Unicode isolates |
| (b) Browser tab | `document.title = ...` | **No** markup | Unicode isolates |
| (c) PDF | jsPDF `doc.text(...)` via `bidi.min.js` | **No** HTML | Unicode isolates (or bidi-lib handles) |
| (d) Markdown export | plain text file | **No** | Unicode isolates |

**Recommendation: embed Unicode directional isolates in the returned string** — `U+2066` (LEFT-TO-RIGHT ISOLATE) + string + `U+2069` (POP DIRECTIONAL ISOLATE) — for Hebrew numeric formats only. `[VERIFIED: no existing `<bdo>`/LRM usage in assets — grep found only a comment at pdf-export.js:309; there is no precedent to conform to]`

Rationale:
- **`<bdo dir="ltr">` is rejected** because the majority of consumers use `.textContent` (verified: overview.js:498, sessions.js:106 use `textContent`), which would render the tags literally. Returning markup would force every call site to switch to `innerHTML` — a security and churn cost.
- **Isolates > bare LRM (`U+200E`)**: LRI…PDI fully isolates the run's bidi resolution from surrounding text; a lone LRM only nudges. Isolates are the modern, robust choice. `[CITED: UAX #9 §2.4 isolates]`
- **PDF caveat — MUST verify in a test:** `pdf-export.js` runs numeric strings through `bidi.min.js` (`shapeForJsPdf`). The isolates may (i) be handled correctly, (ii) be stripped, or (iii) render as `.notdef` boxes if Heebo lacks the glyphs. **The TZ/format test suite must build a Hebrew `mm/dd/yyyy` PDF and assert digit order via the existing `pdf-digit-order.test.js` GID-run technique** (assert "2026" present, "6202" absent). If isolates break the PDF, the fallback is: `pdf-export.js` strips `U+2066/U+2069` before `shapeForJsPdf` and relies on jsPDF drawing the date field in a known LTR position. `[VERIFIED: tests/pdf-digit-order.test.js provides the exact assertion technique; bidi.min.js behavior with isolates is UNVERIFIED → test-gated]`
- Named-month Hebrew options (`month-day-year`, `day-month-year`) are NOT wrapped — they contain a strong-RTL Hebrew month token that anchors direction naturally, matching current `auto` he behavior.

**Open verification (test-gated, not a blocker):** whether `bidi.min.js` + Heebo tolerate `U+2066/U+2069`. Design the PDF Hebrew-numeric test to fail loudly if not, then apply the strip-fallback.

---

## The Definitive UTC-Parse Sweep (D-03)

**Verified line numbers** (the CONTEXT refs had drifted; these are the true current locations as of 2026-07-02). `[VERIFIED: grep + read of current tree]`

### IN SCOPE — calendar-date parse/format → route through `DateFormat`

| # | File · line | Current code | Canonical replacement | Note |
|---|-------------|--------------|-----------------------|------|
| 1 | `app.js:942` | `new Date(dateString)` in `formatDate` | delegate whole fn to `DateFormat.format(dateString, getPreference(), currentLang)` | **Primary display bug site.** Fixes ~10 downstream `App.formatDate` callers at once |
| 2 | `overview.js:579` | `const date = new Date(session.date)` in `countSessionsThisMonth` | `const date = DateFormat.parseLocal(session.date); if(!date) return false;` | **Real month-boundary bug** — UTC-parse of a 1st-of-month date lands in the prior month in −UTC zones |
| 3 | `overview.js:631` | `new Date(client.birthDate)` (age math) | `DateFormat.parseLocal(client.birthDate)` | Age = `floor((Date.now()-parseLocal)/yr)` |
| 4 | `overview.js:734` | `.map(s => new Date(s.date))` in `averageDaysBetween` | `.map(s => DateFormat.parseLocal(s.date)).filter(Boolean)` | **New site — NOT in CONTEXT list.** Day-diff is UTC-consistent, but route for uniformity + to satisfy the zero-remaining-UTC gate |
| 5 | `add-session.js:473` | `new Date(birthDate)` (edit-client age) | `DateFormat.parseLocal(birthDate)` | `birthDate` read via `.value` at :472 ✓ |
| 6 | `add-session.js:516` | `sessionDate.valueAsDate = new Date()` | `sessionDate.value = DateFormat.todayLocalISO()` | **Genuine input bug** — `valueAsDate` interprets UTC → default day can be tomorrow at night in −UTC zones |
| 7 | `add-session.js:1027` | `new Date(birthDate)` (age) | `DateFormat.parseLocal(birthDate)` | |
| 8 | `add-session.js:1369-1370` | `new Date(a.date\|\|0).getTime()` (sort tie-break) | `DateFormat.parseLocal(a.date)?.getTime() \|\| 0` OR `String(b.date).localeCompare(String(a.date))` | Prefer string compare (matches overview.js:385 / sessions.js:85) |
| 9 | `add-session.js:1379` | `formatDate(latest.date)` (display) | unchanged (delegates via wrapper) | Confirm this is `App.formatDate` |
| 10 | `add-session.js:1428` | `new Date(selectedClient.birthDate)` (age) | `DateFormat.parseLocal(...)` | |
| 11 | `add-client.js:219` | `new Date(birthDate)` (age) | `DateFormat.parseLocal(birthDate)` | `birthDate` read via `.value` at :218 ✓ — seam already satisfied |
| 12 | `pdf-export.js:680` | `new Date(sessionDate + "T00:00:00")` in local `formatDate` | delegate whole fn to `DateFormat.format(sessionDate, getPreference(), uiLang)` | Already local-correct; only locale-wrong (en-GB). Becomes dead code |
| 13 | `export-modal.js:326-327` | `sessionDateFormatted = App.formatDate(sessionDateISO)` | **stop pre-formatting**; pass raw `sessionDateISO` into `buildSessionPDF({ sessionDate: sessionDateISO })` (:646,:709) | pdf-export now formats it |
| 14 | `export-modal.js:602` | `exportedOn = App.formatDate(new Date())` | `exportedOn = App.formatDate(DateFormat.todayLocalISO())` | Footer "Exported on"; drawn raw at pdf-export:1846, so keep pre-formatting but from **local today** |
| 15 | `overview.js:395,498` · `sessions.js:106` | `App.formatDate(session.date)` (display) | unchanged (wrapper delegates) | No site change |

### BORDERLINE — backup/export filenames (D-03 explicitly names these)

These are **wall-clock "moment of action" stamps**, not stored calendar dates — but D-03 calls out the **local-vs-UTC inconsistency** as in-scope. `[VERIFIED: backup.js:623,731,827,906]`

| # | File · line | Current | Class | Disposition |
|---|-------------|---------|-------|-------------|
| B1 | `backup.js:623` | `new Date()` → `getFullYear/Month/Date` (.zip name) | **LOCAL** already | Consistency anchor — leave, or route to `todayLocalISO()` |
| B2 | `backup.js:731` | `new Date().toISOString().slice(0,10)` (.sgbackup name) | **UTC** (inconsistent) | **Fix → `DateFormat.todayLocalISO()`** |
| B3 | `backup.js:827` | `new Date().toISOString().slice(0,10)` (.sgbackup name) | **UTC** (inconsistent) | **Fix → `DateFormat.todayLocalISO()`** |
| B4 | `backup.js:906` | `new Date()` → local components (mailto subject) | **LOCAL** already | Leave / route for uniformity |
| B5 | `app.js:1033` | `new Date().toISOString().slice(0,10)` (legacy JSON backup name) | **UTC** | Adjacent same-class; recommend `todayLocalISO()` for consistency |
| B6 | `settings-snippets.js:1019` | `new Date().toISOString().slice(0,10)` (snippets export name) | **UTC** | Out of date-phase scope (snippets); flag only, do not touch |

Rule: a user exporting at 20:00 EDT should get **today's local date** in the filename, not tomorrow's UTC date. Making B2/B3 local matches B1/B4.

### OUT OF SCOPE — legitimate wall-clock timestamps (MUST NOT reroute) `[VERIFIED: grep]`

- `createdAt`/`updatedAt`/`exportedAt` writes: `add-client.js:254,270`; `add-session.js:502,1046,1138,1157`; `app.js:1018`; `backup.js:596`; `disclaimer.js:167,197,199`; `settings-snippets.js:881,1010,1154,1160`. (`new Date().toISOString()` = a moment in time.)
- Timestamp *reads*: `overview.js:387-388`, `sessions.js:87-88`, `add-session.js:1372-1373` (`createdAt` sort tie-breaks); `report.js:147` (`entry.timestamp`); `backup-modal.js:474` (`r.exportedAt` display).
- `Date.now()` everywhere; `app.js:1165,1182` (security-guidance dismiss); `overview.js:109,111,124` (day-of-year / greeting-hour); `app.js:1257,1272,1290,1317` (the birthdate 3-dropdown builder — **other lane** replaces the element; not a parse-correctness site).

**Verification gate for the sweep:** grep for `new Date(` where the argument is a variable holding `.date`/`.birthDate`/`session.date`/`client.birthDate` — must return zero outside `date-format.js`. (Shape gate only — pair it with the behavior tests below.)

---

## PDF Integration

**Current flow** `[VERIFIED: export-modal.js:326-330,602,646-651,709-714; pdf-export.js:674,877,1846-1849]`:
1. `export-modal.js:326` reads `sessionDateISO = sessionDate.value`; `:327` pre-formats `sessionDateFormatted = App.formatDate(sessionDateISO)`.
2. `:646`/`:709` pass `sessionDate: data.sessionDateFormatted` (the already-formatted string) into `buildSessionPDF`.
3. `pdf-export.js:877` calls its own `formatDate(sessionData.sessionDate, opts.uiLang)`; the regex at `:677` sees a non-ISO string → passes through unchanged. So the card date is currently the `App.formatDate` (en-US) string, NOT en-GB.
4. Footer: `export-modal.js:602` `exportedOn = App.formatDate(new Date())` → passed at `:651`/`:714` → drawn raw at `pdf-export.js:1846-1849` (no re-format).

**Where en-GB lives:** only in `pdf-export.js:685`'s own `formatDate` default branch — which currently only fires when a **raw ISO** reaches it. The **fixtures** do exactly that (`sessionDate: "2026-05-08"` raw), so the fixtures render en-GB. Once we (a) route `pdf-export.formatDate` through `DateFormat` and (b) make `export-modal` pass raw ISO, the whole path is unified on `DateFormat` (en-US for `auto`).

**Plan:**
- `pdf-export.js:674` `formatDate` → `return window.DateFormat.format(sessionDate, window.DateFormat.getPreference(), uiLang);` (delete the en-GB `T00:00:00` body).
- `export-modal.js:646,709` → pass `sessionDate: data.sessionDateISO` (raw). Drop `sessionDateFormatted` (or keep only for the on-screen Step-1 preview).
- `export-modal.js:602` → `exportedOn = App.formatDate(DateFormat.todayLocalISO())` (local today, chosen format).

**How the preference reaches the PDF (incl. jsdom):** `pdf-export.js` calls `window.DateFormat.getPreference()`, which reads `localStorage['portfolioDateFormat']`. In the jsdom PDF env, jsdom provides `localStorage` (empty) → `'auto'` → follows `uiLang` → deterministic per-locale output. A test wanting a specific format sets `win.localStorage.setItem('portfolioDateFormat','dd/mm/yyyy')` before building. `[VERIFIED: jsdom provides window.localStorage; jsdom-pdf-env.js already relies on a real window]`

**D-21 injection:** in `tests/_helpers/jsdom-pdf-env.js`, add `win.eval(readAsset('assets/date-format.js'));` **before** `win.eval(readAsset('assets/pdf-export.js'));` (line 125) — because `pdf-export.js`'s `formatDate` now calls `window.DateFormat`. `[VERIFIED: jsdom-pdf-env.js:90-125 eval order]`

---

## PDF Golden-Baseline Regeneration (D-04/D-19)

**Baseline files** (5 SHA-256, in `.planning/fixtures/phase-23/`), driven by `tests/pdf-latin-regression.test.js`: `fixture-en.pdf.sha256`, `fixture-de.pdf.sha256`, `fixture-cs.pdf.sha256`, `fixture-he.pdf.sha256`, `fixture-he-mixed.pdf.sha256`. `[VERIFIED: pdf-latin-regression.test.js:125-130; ls of fixtures dir]`

**What actually drives drift:** each fixture passes `sessionDate` as **raw ISO** and sets **no** `exportedOn` (footer date omitted). So the ONLY hash-affecting change per fixture is the **session-card date string**. `[VERIFIED: fixture-en.json/fixture-he.json — sessionDate "2026-05-08", no exportedOn]`

| Fixture | uiLang | Card date before | Card date after (`auto`) | Drift? |
|---------|--------|------------------|--------------------------|--------|
| fixture-en | en | `8 May 2026` (en-GB) | `May 8, 2026` (en-US) | **YES — intended (D-04)** |
| fixture-de | de | `8. Mai 2026` (de-DE long) | `8. Mai 2026` (de-DE long) | No expected — **confirm** |
| fixture-cs | cs | `8. května 2026` (cs-CZ long) | `8. května 2026` | No expected — **confirm** |
| fixture-he | he | `8 במאי 2026` (he-IL **long**, via pdf-export) | `8 במאי 2026` (he-IL **short**, via auto) | **Verify** — short vs long may differ for some months (May likely identical) |
| fixture-he-mixed | he | body date is literal markdown, not `formatDate` | unchanged | No expected — **confirm** |

**Safe regeneration procedure** (per MEMORY `reference-pdf-jsdom-inert-gates` — a jsdom PDF test can hang→exit-0 silently; never trust a green exit alone):
1. Build each fixture PDF to a **real file** on disk (not just hash), e.g. add a `--emit` path or reuse the harness build fn.
2. **Open/visually inspect** each PDF: confirm the card date reads exactly `May 8, 2026` (en) and that de/cs/he are unchanged.
3. Only then run `node tests/pdf-latin-regression.test.js --regenerate` (line 41 — overwrites `.sha256`).
4. Re-run without `--regenerate`; confirm 5/5 pass.
5. Commit the changed `.sha256` files with an explicit "en-GB→en-US intended (D-04)" note (README protocol demands justification).

**Other PDF tests to re-run (non-baseline, should stay green):** `pdf-digit-order` (he, `2026-03-24`), `pdf-glyph-coverage` (`2026-05-12`), `pdf-bold-rendering` (`2026-05-08`), `quick-260702-bg4`, `quick-260620-q8m`, `quick-260608-cx5`, `quick-260608-c8x`. These assert layout/glyph/wrap, not the date string; the en-US reorder uses the same glyphs. Re-run to confirm no incidental drift. `[VERIFIED: sessionDate values grep]`

**`tests/34-date-locale.test.js` rewrite (D-19):** currently asserts `App.formatDate` de/cs/en/he *unchanged* and the export chain via **pre-formatted** strings. Rewrite to: (a) load `date-format.js` into the vm sandbox (see below), (b) assert `auto` outputs still hold, (c) assert the export chain now passes **raw ISO** and pdf-export produces the en-US card date. `[VERIFIED: 34-date-locale.test.js:69-181]`

---

## Script Load-Order Map (D-02)

`date-format.js` must load **before** `app.js` and `pdf-export.js`. There is **no shared script-injector** — `shared-chrome.js` only appends a footer DOM node (`appendChild(footer)` at line 140), it does not inject `<script>` tags. Each page's `<script>` list is **hand-maintained**. `[VERIFIED: grep shared-chrome.js; per-page grep of all 22 HTML files]`

**8 pages load `app.js` → each needs `date-format.js` inserted immediately before it:**

| Page | `app.js` at line | Insert `date-format.js` before | Also loads `pdf-export.js`? |
|------|------------------|-------------------------------|-----------------------------|
| `index.html` | 344 | line 344 (after `shared-chrome.js`:343) | no |
| `add-client.html` | 195 | line 195 | no |
| `add-session.html` | 596 | line 596 | **yes (:610)** — covered (after app.js) |
| `sessions.html` | 107 | line 107 | no |
| `settings.html` | 322 | line 322 | no |
| `report.html` | 107 | line 107 | no |
| `reporting.html` | 96 | line 96 | no |
| `demo.html` | 178 | line 178 | no |

**Pages that do NOT load `app.js` (no insertion needed):** `landing.html`, `license.html`, all `datenschutz*`, `impressum*`, `disclaimer*` (these load only `version.js`+`crashlog.js`+`shared-chrome.js`; no date display). `[VERIFIED: per-page grep]`

**Runtime-call safety note:** on `index.html`, `backup.js` (line 340) loads *before* `app.js`/`date-format.js`. `backup.js` only calls `DateFormat.todayLocalISO()` inside export **event handlers** (runtime, post-load), so load order is safe — `window.DateFormat` exists by the time a user clicks export. No need to move `date-format.js` above `backup.js`. `[VERIFIED: backup.js calls are inside async fns, not module body]`

**SW precache:** `date-format.js` is a new asset — add it to `sw.js` `PRECACHE_URLS` so it's offline-available (mirrors how `icon-512-base64.js` is precached per add-session.html:608 comment). `[CITED: add-session.html:608 comment]` (Confirm exact precache list location during planning.)

---

## Falsifiable TZ-Pinned Tests (D-20)

**Harness facts** `[VERIFIED: run-all.js:62-74]`:
- `run-all.js` spawns each `tests/*.test.js` in **its own `node` child process** via `spawnSync`, `stdio:'inherit'`, 120s timeout. **Env is per-process** → a test file can set `process.env.TZ` for itself without leaking. Best practice: set it at the very top *and* re-exec if TZ isn't applied (V8 caches TZ at startup — see pitfall).

**New file: `tests/37-date-format.test.js`** — pin TZ, load the REAL module (not source text).

```js
// MUST be the first executable lines — before any Date use.
if (process.env.TZ !== 'America/New_York') {
  process.env.TZ = 'America/New_York';
  // V8 reads TZ once at startup; re-exec so the pin actually takes effect.
  require('child_process').execFileSync(process.execPath, [__filename],
    { stdio: 'inherit', env: Object.assign({}, process.env, { TZ: 'America/New_York' }) });
  process.exit(0); // child's exit code propagates via execFileSync throw
}
```

Load `date-format.js` in a `vm` sandbox (mirror `34-date-locale.test.js:69` `loadApp`), providing `Intl`, `Date`, `localStorage` stub. Then load `app.js` into the SAME sandbox so `App.formatDate` can delegate to `window.DateFormat`.

**Spine assertion (the falsifiable core):**
```
DateFormat.parseLocal('2026-07-02').getDate() === 2        // NOT 1 (UTC would give Jul 1 in NY)
App.formatDate('2026-07-02') === 'Jul 2, 2026'  (lang en)  // pre-fix: 'Jul 1, 2026'
```

**One assertion per format option** (lang en unless noted), input `'2026-07-02'`:

| Key | Expected |
|-----|----------|
| `auto` (en) | `Jul 2, 2026` |
| `month-day-year` | `Jul 2, 2026` |
| `day-month-year` | `2 Jul 2026` |
| `mm/dd/yyyy` | `07/02/2026` |
| `dd/mm/yyyy` | `02/07/2026` |
| `yyyy-mm-dd` | `2026-07-02` |
| `dd/mm/yyyy` (he) | contains `⁦` … `⁩`; strip-isolates === `02/07/2026`; assert `02` precedes `2026` in the *stripped* string (LTR order preserved) |

**Boundary + math assertions (the real bugs):**
- **countSessionsThisMonth:** with TZ=America/New_York and system month = the test's control, feed `[{date:'2026-07-01'}]` and assert it counts in **July** (pre-fix: `new Date('2026-07-01')` = Jun 30 in NY → counted in June). To make this deterministic regardless of "today", either extract `countSessionsThisMonth` to accept an injected `now`, or assert on `DateFormat.parseLocal('2026-07-01').getMonth() === 6`. Recommend the latter as the falsifiable unit assertion; add an integration assertion if the fn is refactored to accept `now`.
- **Age math:** `DateFormat.parseLocal('2000-07-02')` → assert `.getFullYear()===2000 && .getMonth()===6 && .getDate()===2` (pre-fix parseLocal doesn't exist; the old `new Date('2000-07-02')` in NY is `1999-12-31`-style shift only across year for Jan-1 dates — use a Jan-1 birthdate `'2000-01-01'` to make the UTC bug cross a year: UTC-parse → `1999-12-31` in NY → age off by one).
- **Input default:** `DateFormat.todayLocalISO()` === local `YYYY-MM-DD` (assert it equals a hand-computed local Y/M/D, and that it is NOT `new Date().toISOString().slice(0,10)` when the two differ — i.e. run this assertion knowing NY evening would differ; since tests run at arbitrary times, assert `todayLocalISO()` matches `getFullYear/Month/Date` composition rather than the UTC slice).

**Authored BEFORE implementation** (MEMORY `feedback-behavior-verification`): these must EXECUTE the real module via `vm`, never assert on source text. They will FAIL against the current tree (proving falsifiability) and PASS after the fix.

**PDF Hebrew-numeric test** (in the jsdom env): build a `he` PDF with `portfolioDateFormat='mm/dd/yyyy'`, sessionDate `'2026-07-02'`; reuse `pdf-digit-order.test.js`'s GID-run extraction to assert `2026` present / `6202` absent, `07` present. This validates D-07 survives jsPDF.

---

## Validation Architecture

> `workflow.nyquist_validation` treated as enabled (no config override found). This section drives the phase VALIDATION.md.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bespoke zero-dep runner — `tests/run-all.js` spawns each `tests/*.test.js` in its own `node` child; each file self-reports PASS/FAIL and exits 0/1 `[VERIFIED: run-all.js]` |
| Config file | none — convention: top-level `tests/*.test.js`; helpers in `tests/_helpers/` excluded |
| Quick run command | `node tests/37-date-format.test.js` (this lane's file) |
| Full suite command | `npm test` (→ `node tests/run-all.js`) |
| Isolation | per-process env → TZ pin is safe and local to the file |

### Phase Requirements → Test Map (date engine)
| Req | Behavior | Test type | Command | Exists? |
|-----|----------|-----------|---------|---------|
| DATE-01/02 | `parseLocal('2026-07-02').getDate()===2`; `App.formatDate` spine | unit (vm) | `node tests/37-date-format.test.js` | ❌ Wave 0 |
| DATE-03 | 6 format options × en (+he numeric) exact strings | unit (vm) | same | ❌ Wave 0 |
| DATE-04 | Hebrew numeric LTR: isolates present + digit order in PDF | unit + jsdom-PDF | same + `node tests/pdf-digit-order.test.js` | ⚠ extend existing |
| DATE-05 | PDF card + footer via `DateFormat`; export-modal passes raw ISO | jsdom-PDF | `node tests/pdf-latin-regression.test.js` | ⚠ rewrite baselines |
| DATE-06 | `countSessionsThisMonth` local boundary; input default local | unit (vm) | `node tests/37-date-format.test.js` | ❌ Wave 0 |
| DATE-07 | 34-date-locale rewritten; 5 baselines regenerated | regression | `npm test` | ⚠ rewrite `tests/34-date-locale.test.js` |

### Sampling Rate
- **Per task commit:** `node tests/37-date-format.test.js` + any touched PDF test.
- **Per wave merge:** `npm test` (full suite green).
- **Phase gate:** full suite green + the 5 regenerated `.sha256` visually verified before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `tests/37-date-format.test.js` — TZ-pinned spine + 6 formats + boundary + age (covers DATE-01/02/03/06). **Author before implementation.**
- [ ] Rewrite `tests/34-date-locale.test.js` (DATE-07) — load `date-format.js` into the vm sandbox; assert fixed behavior + raw-ISO export chain.
- [ ] Extend `tests/_helpers/jsdom-pdf-env.js` — eval `date-format.js` before `pdf-export.js` (D-21).
- [ ] Extend a Hebrew-numeric PDF assertion (reuse `pdf-digit-order` GID technique) for DATE-04.
- [ ] Regenerate 5 `.planning/fixtures/phase-23/*.pdf.sha256` with visual review (DATE-05/07).

### Other-lane behaviors that also need validation (high level — NOT this lane's deep design)
So the planner has a complete map; deep test design belongs to the Personalization-surface researcher:
- **F5 picker persistence:** selecting a format writes `portfolioDateFormat`; reload re-applies it.
- **F4 session-type editor:** rename locked default (global override), add/delete custom type, unknown-type graceful fallback (D-18), 3 legacy keys resolve forever (D-14).
- **Backup round-trip:** `portfolioDateFormat` + session-type list survive export→import (D-09/D-17).
- **Birthdate input:** `<input type="date">` stores `YYYY-MM-DD`; no data migration; age recomputes correctly (this lane guarantees the *parse* half).
- **Personalization tab i18n:** tab + control labels across en/he/de/cs.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Localized month names / locale ordering | a month-name lookup table per language | `Intl.DateTimeFormat` (`auto` + `shortMonth`) | Built-in, correct, already used at app.js:951; a table drifts from ICU |
| Bidi LTR forcing | manual digit-reversal | Unicode isolates `U+2066/U+2069` (+ existing `bidi.min.js` for PDF) | UBA is subtle; the app already vendors a bidi engine for PDF |
| Date parsing | a full ISO/`Date.parse` reliance | the leading-`\d{4}-\d{2}-\d{2}` regex + `new Date(y,m-1,d)` | Only the local-components constructor avoids the UTC-midnight trap; `Date.parse`/`new Date(str)` is the bug |
| A date library (dayjs/luxon) | npm install anything | zero-dep vanilla `date-format.js` | Production is zero-dependency vanilla IIFE (locked constraint) |

**Key insight:** the entire class of bugs comes from ONE fact — `new Date("YYYY-MM-DD")` is UTC, `new Date(y, m-1, d)` is local. Centralizing that single distinction in `parseLocal` fixes every site.

---

## Common Pitfalls

### Pitfall 1: V8 caches `TZ` at process start
**What goes wrong:** setting `process.env.TZ` *after* the first `Date` use (or mid-file) has no effect — the pin silently does nothing and the "falsifiable" test passes in the local TZ.
**Avoid:** set `TZ` as the first line and **re-exec the file** (see test skeleton). Assert `new Date(2026,6,2).getTimezoneOffset()` matches an EDT offset (240) at the top as a self-check. `[CITED: Node process.env.TZ semantics]`

### Pitfall 2: Returning `<bdo>` markup from the helper
**What goes wrong:** call sites using `.textContent` render literal `<bdo dir="ltr">` tags.
**Avoid:** return a bare string with Unicode isolates; never HTML markup.

### Pitfall 3: Blindly `--regenerate` PDF baselines
**What goes wrong:** a jsdom PDF build can hang→exit-0 or render a wrong-but-stable output; `--regenerate` bakes the wrong bytes into the baseline (MEMORY `reference-pdf-jsdom-inert-gates`).
**Avoid:** render to a real file, open it, confirm the date string, THEN regenerate.

### Pitfall 4: "Auto" accidentally changing de/cs/he
**What goes wrong:** if `auto` uses `{month:'short'}` for de/cs (instead of the current `long`), or a different he short/long, the de/cs/he PDF baselines drift unintentionally.
**Avoid:** `autoFormat` reproduces the current app.js rule exactly (long for de/cs, short for en/he); confirm each fixture hash post-change and treat any non-en drift as a bug to investigate.

### Pitfall 5: Rerouting a wall-clock timestamp
**What goes wrong:** passing `createdAt`/`exportedAt` (a real instant) through `parseLocal` truncates it to a calendar day, corrupting sort order or "exported at" display.
**Avoid:** the sweep table's OUT-OF-SCOPE list is exhaustive — touch only `.date`/`.birthDate` and the named filename sites.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| `node` | test suite | ✓ (assumed CI/dev) | — | — |
| `jsdom` | PDF tests | ✓ installed devDependency | node_modules/jsdom | run-all.js bridges `JSDOM_PATH` `[VERIFIED: run-all.js:35-43]` |
| `Intl` full ICU (he/de/cs) | format spec | ✓ (Node ships full ICU ≥ v13) | — | If small-ICU, month tokens differ — **pin in tests** |

No new runtime packages. **Package Legitimacy Audit: N/A** — `date-format.js` is zero-dependency vanilla; nothing installed. `[VERIFIED: zero-build constraint]`

---

## State of the Art

| Old | Current | Impact |
|-----|---------|--------|
| `new Date("YYYY-MM-DD")` (UTC) scattered across 15 sites | one `DateFormat.parseLocal` | kills the off-by-one class |
| PDF date en-GB, UI en-US | unified en-US via `DateFormat` (D-04) | intended baseline change (fixture-en) |
| Per-file bidi guesses | Unicode isolates `U+2066/U+2069` | robust cross-context Hebrew LTR |

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | Exact `Intl {month:'short'}` tokens (de "Jul"/"Juli", cs "čvc", he "יולי") | Format spec | Named-month option strings differ → test expectations need adjusting (LOW — pinned by tests) |
| A2 | `bidi.min.js` + Heebo tolerate `U+2066/U+2069` in the PDF path | Hebrew wrap | PDF numeric he may need the strip-fallback (MEDIUM — test-gated, fallback specified) |
| A3 | de/cs/he PDF fixtures stay byte-identical under `auto` | Baseline regen | Extra baselines drift → regenerate more than fixture-en (LOW — visual-review procedure catches it) |
| A4 | jsdom provides a working `localStorage` for `getPreference()` in PDF env | PDF integration | If not, tests set it explicitly or pdf-export takes the key via `opts` (LOW) |
| A5 | `add-session.js:1379` `formatDate` is `App.formatDate` (delegates) | Sweep #9 | If it's a separate local fn, add one delegation (LOW — confirm at plan time) |

---

## Open Questions

1. **Does `pdf-export.js` need the format key via `opts` instead of reading `localStorage`?**
   - Known: reading `getPreference()` works in-browser and in jsdom (localStorage present).
   - Unclear: whether a future non-jsdom PDF caller lacks localStorage.
   - Recommendation: read via `getPreference()`; allow an optional `opts.dateFormatKey` override for determinism/tests.
2. **Extract `countSessionsThisMonth` to accept an injected `now`?**
   - Enables a fully deterministic boundary integration test.
   - Recommendation: optional param `countSessionsThisMonth(sessions, now = new Date())`; falsifiable unit assertion on `parseLocal` covers the core regardless.

---

## Sources

### Primary (HIGH — direct code inspection, authoritative for THIS codebase)
- `assets/app.js` (940-958 formatDate, 1398-1440 public return, 951-957 localeMap), `assets/pdf-export.js` (674-690, 877, 1846-1849), `assets/export-modal.js` (326-330, 602, 646-651, 709-714), `assets/overview.js` (384-391, 498, 573-582, 631, 731-736), `assets/add-session.js` (473, 516, 1027, 1369-1379, 1428), `assets/add-client.js` (218-219), `assets/sessions.js` (85-91, 106), `assets/backup.js` (596, 623-629, 731, 827, 906), `assets/crashlog.js`/`assets/version.js` (IIFE shape)
- `tests/34-date-locale.test.js`, `tests/_helpers/jsdom-pdf-env.js`, `tests/run-all.js`, `tests/pdf-latin-regression.test.js`, `tests/pdf-digit-order.test.js`
- `.planning/fixtures/phase-23/` (5 fixtures + README), all 22 `*.html` script orders
- `.planning/phases/37-.../37-CONTEXT.md` (D-01..D-21)

### Secondary (MEDIUM/CITED)
- ECMA-402 `Intl.DateTimeFormat` semantics; Unicode UAX #9 (bidi isolates); Node `process.env.TZ` behavior

### MEMORY (honored)
- `reference-pdf-jsdom-inert-gates`, `feedback-behavior-verification`

---

## Metadata

**Confidence breakdown:**
- Sweep site list + line numbers: HIGH — every entry grep-verified against the current tree.
- Module API + wrapper delegation: HIGH — matches existing IIFE + public-return patterns.
- Format spec strings: MEDIUM — `Intl` tokens must be pinned by tests before trusting (A1).
- Hebrew PDF LTR: MEDIUM — isolate handling in `bidi.min.js` is test-gated (A2), fallback specified.
- Baseline regen scope: HIGH for fixture-en (intended), MEDIUM for de/cs/he (confirm by render).

**Research date:** 2026-07-02
**Valid until:** ~2026-08-01 (stable; re-verify line numbers if the files change before planning)
