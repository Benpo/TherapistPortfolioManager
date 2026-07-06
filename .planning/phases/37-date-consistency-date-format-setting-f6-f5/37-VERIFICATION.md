---
phase: 37-date-consistency-date-format-setting-f6-f5
verified: 2026-07-06T12:00:00Z
status: human_needed
score: 12/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 5/5
  gaps_closed: []
  gaps_remaining: []
  regressions: []
  new_scope_added:
    - "37-10: RED test files (filter/sort specs)"
    - "37-11: Terminology relabeling + i18n/CSS foundation (TERM-01, TERM-02)"
    - "37-12: Trademark/non-affiliation legal disclaimers (LEGAL-01)"
    - "37-13: Overview Session Format multi-select + Heart-Wall toggle (FILT-01, FILT-02)"
    - "37-14: Sessions Session Format multi-select + Heart-Wall toggle (FILT-01, FILT-02)"
    - "37-15: Overview click-to-sort + dead sub-key removal + visual gate (FILT-03)"
human_verification:
  - test: "HE/CS Personalization tab i18n — broader [ASSUMED] block native review"
    expected: |
      All strings under the '// Phase 37 — Personalization tab [translations ASSUMED]' comment
      in i18n-he.js and i18n-cs.js read naturally to a native speaker with no machine-translation
      artifacts. Scope: settings.tab.personalize, settings.dateFormat.label/auto/savedToast,
      settings.sessionTypes.* (heading, helper, add.*, locked.tooltip, rename/delete aria,
      savedToast, empty, confirm.delete.*, confirm.reassign.*). For HE, Ben can confirm
      (speaks Hebrew). For CS — no in-house Czech speaker — needs external review.
    why_human: |
      The [ASSUMED] comment block is still present in i18n-he.js (line 426) and i18n-cs.js
      (line 426). Commit 6bde07c aligned settings.sessionTypes.* EN/DE/HE vocabulary but
      CS was left unchanged ("already consistent"). The broader helper texts, toasts, and
      confirm dialog strings for ALL CS keys remain machine-translated + unconfirmed.
      Ben confirmed HE/DE for D5 relabel tables; the full Personalization tab set in HE/CS
      needs a final human pass.
  - test: "WR-02: Backup restore null-vs-absent decision"
    expected: |
      Decide the intended behavior when a backup was taken on a device using DEFAULT (null)
      portfolioDateFormat / portfolioSessionTypes. Current code (if (manifest.settings.dateFormat))
      skips restoring null/default, so a target device retains its own customization after
      restoring from a source that never customized. Either (a) accept as-is (documented),
      or (b) apply the 'dateFormat' in manifest.settings + removeItem-on-null fix so
      restore faithfully mirrors the source device state.
    why_human: |
      Bug is in backup.js:1235, 1238. Fix is straightforward; decision is whether the edge
      case warrants a follow-up before shipping. The round-trip test covers non-null values
      correctly; the null/absent distinction is behaviorally unverifiable by automated means
      without a device-migration simulation.
  - test: "Legal page he/de/cs + Czech external legal-native review"
    expected: |
      All 8 legal pages (disclaimer-{en,he,cs}.html + disclaimer.html(DE),
      impressum-{en,he,cs}.html + impressum.html(DE)) carry correct trademark + non-affiliation
      text. HE/DE: Ben can confirm (speaks both). CS specifically: the disclaimer text
      (Ochranné známky a nezávislost) and impressum text (Ochranné známky) were drafted and
      self-reviewed by the executor + challenger pass (commit 573f376), but no external
      Czech native legal speaker has confirmed. Pre-push Czech review is outstanding.
    why_human: |
      Commit 573f376 applied the challenger + internal review (stripped DRAFT flags, fixed
      CS grammar: gender jím->jimi + comma-splice, "schváleny"/"schválen" added). The plan
      mandated "external legal-native-speaker + challenger phrasing review before Ben
      pushes" — Czech especially. The challenger pass was done by the Claude executor,
      not an external Czech legal speaker. The EN text (canonical) can ship as-is.
  - test: "demo.html Phase 37 controls — add filter bar + sortable headers or leave as pre-37 overview?"
    expected: |
      Ben decides whether demo.html should gain the Phase 37 controls (Session Format
      multi-select, Heart-Wall toggle, sortable column headers). Currently demo.html ships
      the reduced pre-37 overview markup (no filter bar, no sortable headers, no 37 filter
      bar). The deployed index.html has all 37 controls.
    why_human: |
      Open design decision surfaced during the 37-15 checkpoint (2026-07-06). The sort
      arrows appear absent in demo.html because demo.html genuinely lacks the Phase 37
      controls — it is not a bug in the index.html implementation. Tests/37-overview-sort.test.js
      now asserts the injected SVG (commit dece141) so the real index.html is covered.
      The demo.html decision requires a product/scope call from Ben.
---

# Phase 37: Date Consistency + Date-Format Setting + Session Types — Verification Report

**Phase Goal:** Every calendar date in the app is parsed and formatted through one canonical local-time helper (killing the UTC-midnight off-by-one), the user can choose their date presentation from a new Personalization Settings tab, and session types become a Settings-managed two-tier list (5 locked defaults + custom) — all with Hebrew RTL correctness and PDF parity preserved. Scope extended in Wave 5 to include: terminology relabeling (Heart-Wall / Session Format), Session Format multi-select + Heart-Wall toggle filters on Overview and Sessions screens, Overview click-to-sort, and trademark disclaimers on all legal pages.

**Verified:** 2026-07-06T12:00:00Z
**Status:** human_needed — all 12 success criteria verified against the actual codebase; 4 items require human review (i18n native review, backup edge case decision, Czech legal review, demo.html scope decision)
**Re-verification:** Yes — merges previous 2026-07-03 verification (plans 37-01..37-08) with new scope (37-10..37-15). No regressions; no previously-verified truths degraded.
**Test Suite:** `npm test` → **124/124 GREEN** (run 2026-07-06)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Every date surface uses local-time parsing; App.formatDate('2026-07-02') returns Jul 2 not Jul 1 under NYC timezone; zero UTC-midnight parses outside date-format.js | ✓ VERIFIED | `node tests/37-date-format.test.js` → 13/13 PASS. Spine asserts "Jul 2, 2026". assets/date-format.js:45 uses `new Date(y, m-1, d)`. App.formatDate at app.js:968 delegates to DateFormat. Grep: zero `new Date(variable.date)` parses; zero `toISOString().slice(0,10)` stamps outside date-format.js. |
| 2 | Personalization tab lets user pick 1 of 6 date formats; choice persists in localStorage["portfolioDateFormat"]; applies to every date surface; Hebrew numeric dates wrap in U+2066/U+2069 LTR isolates | ✓ VERIFIED | settings.html:60 `data-tab="personalize"` tab button; panel at :124. assets/settings.js:858 writes portfolioDateFormat; :860 dispatches app:dateformat. date-format.js:34-35 LRI/PDI isolate chars. pdf-digit-order.test.js 7/7. 30-settings-tabnav.test.js ?tab=personalize deep-link passes. |
| 3 | Session types: 5 locked defaults (non-deletable) + user custom types (renameable + deletable); resolver override→i18n→raw fallback | ✓ VERIFIED | settings-session-types.js:337 deleteType() early-returns on locked key. :213 locked rows rendered without delete button. app.js:1270 formatSessionType() resolver. 37-personalization.test.js → 13/13 PASS incl. locked-guard, resolver, XSS-as-text. |
| 4 | Birthdate entry is native `<input type="date">`; portfolioDateFormat and portfolioSessionTypes survive backup export→restore round-trip | ✓ VERIFIED | add-client.html:64 `id="clientBirthDate" type="date"`. add-session.html:143,522 native date inputs. backup.js:621-622 export; :1235-1240 guarded restore. Backup round-trip test in 37-personalization.test.js PASSES. initBirthDatePicker removed: grep = 0. |
| 5 | Phase 30/34 test suite stays green; TZ-pinned tests pass; PDF SHA-256 baselines regenerated with visual review; all new i18n strings present in en/he/de/cs | ✓ VERIFIED | `npm test` → **124/124 GREEN** (was 121/121 pre-37-10 scope; +3 from new filter/sort test files now also GREEN). All i18n bundles: settings.tab.personalize, settings.dateFormat.*, settings.sessionTypes.*, session.type.remote/proxy present in 4 bundles. 557-key parity. he/de/cs flagged [ASSUMED] for Personalization tab — see Human Verification. |
| 6 | Heart-Wall terminology unified: one heart term per language (Heart-Wall EN/DE/CS, חומת הלב HE) across all i18n surfaces; HE inconsistencies (מגננת/הגנת הלב) retired; no i18n surface reads the retired term | ✓ VERIFIED | `node -e "...retired token check..."` → OK for all 4 bundles. 14 keys in Table A + 2 in Table B relabeled. grep: zero `Heart Shield`, zero `Herzschutz`, zero `Ochrana srdce`, zero מגננת/הגנת הלב in any bundle. |
| 7 | Session Format modality axis relabeled (TERM-01); 5 modality VALUE labels/keys unchanged; Proxy stays distinct from Remote; dead sub-keys sessions.filter.type.{all,heartShield,regular} removed; all 4 bundles at 557-key parity | ✓ VERIFIED | session.form.sessionType EN→"Session Format", HE→"אופן הטיפול"; DE Sitzungsart + CS Typ sezení unchanged. Dead sub-keys: grep for "sessions.filter.type." in 4 bundles → zero hits; parent key "sessions.filter.type" (Heart-Wall toggle label) intact. Bundle counts: en/he/de/cs → 557 keys each. |
| 8 | Overview filter bar: Session Format multi-select (#clientFormatFilter) with dynamic checkbox options from getSessionTypes(), union predicate, legacy-undefined→clinic; Heart-Wall toggle (#clientHeartWallToggle) replaces old #clientHeartShieldFilter; Clear Filters resets both | ✓ VERIFIED | index.html:129 #clientFormatFilter.multi-select; :139 #clientHeartWallToggle. assets/overview.js:47-68 buildFormatOptions() via textContent (XSS-safe); :252 heartWallOn predicate (isHeartShield===true regardless of shieldRemoved); :324 updateClearButton accounts for _selectedFormats. `node tests/37-overview-filters.test.js` → 8/8 PASS. |
| 9 | Sessions filter bar: Session Format multi-select (#sessionFormatFilter) + Heart-Wall toggle (#sessionHeartWallToggle) replaces old #sessionTypeFilter; session-level predicate; pill summary interpolation; XSS guard | ✓ VERIFIED | sessions.html:69 #sessionFormatFilter; :79 #sessionHeartWallToggle. assets/sessions.js:44-57 buildFormatOptions() textContent-only; :74 renderFormatSummary caller-side {count} replace (no data-i18n on summary node). `node tests/37-sessions-filters.test.js` → 8/8 PASS. #sessionTypeFilter fully removed. |
| 10 | Overview column headers (Name/Sessions/Last Session) are clickable sort triggers; direction arrow shown; second click flips; header click and #clientSortSelect dropdown share one sort state and stay in two-way sync; Type and Actions columns NOT sortable | ✓ VERIFIED | index.html:170-178 — 3 th.sortable[data-sort-key][aria-sort][tabindex=0] with span.sort-arrow; Type/Actions plain. overview.js:239 SORT_DEFAULT_DIR; :457-509 setSort/syncSortIndicators/buildSortArrows (createElementNS, no innerHTML); dropdown change wiring at :507. `node tests/37-overview-sort.test.js` → 5/5 PASS including svg-injection assertion. |
| 11 | All new filter/sort controls render with zero horizontal overflow in LTR, Hebrew RTL, and ~500px mobile; CSS classes RTL-aware via logical properties | ✓ VERIFIED | app.css: .multi-select, .multi-select-toggle, .multi-select-panel, .multi-select-option, .filter-toggle, th.sortable, .sort-arrow — all present; `inset-inline-*`/`padding-inline-*` logical props confirmed. Headless visual gate (6 renders: Overview/Sessions × LTR/RTL/500px) — 6/6 zero horizontal overflow banners. Checkpoint reviewed by Ben 2026-07-06. |
| 12 | All 8 legal pages (4 disclaimer + 4 impressum) carry a trademark + non-affiliation disclaimer naming Discover Healing (non-affiliation) and Wellness Unmasked, Inc. (trademark attribution for Emotion Code® / Body Code™ / Heart-Wall®) | ✓ VERIFIED | Node verify scripts exit 0 for all 8 files. Disclaimer-en.html, disclaimer.html(DE), disclaimer-he.html, disclaimer-cs.html — each has Trademarks & Affiliation section. Impressum-en.html, impressum.html(DE), impressum-he.html, impressum-cs.html — each has Trademarks section. Commit 573f376 applied reviewer fixes (grammar, doctrine self-labels removed, Wellness Unmasked added to non-affiliation clause in all 8). |

**Score: 12/12 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `assets/date-format.js` | Zero-dependency window.DateFormat IIFE | ✓ VERIFIED | 113 lines; parseLocal via local Date constructor |
| `assets/app.js` (App.formatDate) | Delegates entirely to DateFormat | ✓ VERIFIED | Line 968: DateFormat.format() delegation |
| `assets/settings-session-types.js` | Two-tier session-type editor IIFE | ✓ VERIFIED | 400 lines; locked guard; no innerHTML on non-comment lines |
| `assets/app.js` (formatSessionType, getSessionTypes) | Synchronous localStorage-backed resolver | ✓ VERIFIED | _readSessionTypes(); resolver at line 1270 |
| `settings.html` | Personalization tab + picker + session-type editor | ✓ VERIFIED | Tab button :60; panel :124; settings-session-types.js script :381 |
| `assets/settings.js` | personalize whitelist + F5 picker JS | ✓ VERIFIED | Whitelist at :729; picker init/persist/event at :823-860 |
| `add-client.html` | Native `<input type="date">` birthdate | ✓ VERIFIED | Line 64: `id="clientBirthDate" type="date"` |
| `add-session.html` | 3 native date inputs (session + 2 birthdate) | ✓ VERIFIED | Lines 86, 143, 522 |
| `assets/backup.js` | Export + restore of portfolioDateFormat and portfolioSessionTypes | ✓ VERIFIED | Export :621-622; restore :1235-1240 |
| `tests/37-date-format.test.js` | TZ-pinned falsifiable engine spec | ✓ VERIFIED | 13/13 PASS |
| `tests/37-personalization.test.js` | Personalization surface behavior spec | ✓ VERIFIED | 13/13 PASS |
| `tests/37-overview-filters.test.js` | Overview Session Format + Heart-Wall filter spec | ✓ VERIFIED | 8/8 PASS (was RED until 37-13) |
| `tests/37-sessions-filters.test.js` | Sessions Session Format + Heart-Wall filter spec | ✓ VERIFIED | 8/8 PASS (was RED until 37-14) |
| `tests/37-overview-sort.test.js` | Overview header-sort ↔ dropdown sync spec | ✓ VERIFIED | 5/5 PASS incl. svg-injection assertion (hardened in dece141) |
| `assets/i18n-{en,he,de,cs}.js` (Heart-Wall relabel) | All heart keys relabeled; no retired token | ✓ VERIFIED | Node script exits 0; 14 Table A + 2 Table B keys relabeled |
| `assets/i18n-{en,he,de,cs}.js` (Session Format keys) | filter.sessionFormat / .all / .count in 4 bundles | ✓ VERIFIED | Node script exits 0; 557-key parity |
| `assets/app.css` (filter/sort classes) | .multi-select* / .filter-toggle / th.sortable / .sort-arrow, RTL-aware | ✓ VERIFIED | All 7 selectors present; inset-inline* logical props confirmed |
| `assets/demo-seed-data.json` | Heart Shield prose → Heart-Wall | ✓ VERIFIED | grep -ci "heart shield" = 0; JSON valid |
| `index.html` (sortable headers) | 3 sortable th + #clientFormatFilter + #clientHeartWallToggle | ✓ VERIFIED | sortable th at :170-178; filter controls at :129-139 |
| `sessions.html` (Sessions filters) | #sessionFormatFilter + #sessionHeartWallToggle; no #sessionTypeFilter | ✓ VERIFIED | Filter controls at :69-79; #sessionTypeFilter absent |
| 4 disclaimer pages | Trademarks & Affiliation section (4 languages) | ✓ VERIFIED | Node verify script exits 0; all 4 files contain Discover Healing + Wellness Unmasked + Heart-Wall |
| 4 impressum pages | Trademarks section (4 languages) | ✓ VERIFIED | Node verify script exits 0; all 4 files contain both names |
| `assets/version.js` | APP_VERSION bumped to 1.2.4 | ✓ VERIFIED | `APP_VERSION = '1.2.4'` at line 25 (commit 7ba6e42) |
| `assets/settings.html` fallback text | "Session formats" (updated for 6bde07c vocabulary fix) | ✓ VERIFIED | settings.html:137 `data-i18n="settings.sessionTypes.heading">Session formats` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| All 8 app pages | `assets/date-format.js` | `<script>` tag | ✓ WIRED | 8/8 pages confirmed |
| `sw.js` PRECACHE_URLS | `assets/date-format.js` | `/assets/date-format.js` entry | ✓ WIRED | grep confirmed |
| `assets/app.js:formatDate` | `window.DateFormat.format()` | Line 968 delegation | ✓ WIRED | Confirmed |
| `assets/pdf-export.js:formatDate` | `window.DateFormat.format()` | Line 683 delegation | ✓ WIRED | Confirmed |
| `settings.html` | `assets/settings-session-types.js` | `<script src>` at line 381 | ✓ WIRED | F4 editor IIFE loads |
| `sw.js` PRECACHE_URLS | `assets/settings-session-types.js` | `/assets/settings-session-types.js` at line 79 | ✓ WIRED | Offline-available |
| `index.html` filter bar | `assets/overview.js` | `buildFormatOptions()/renderFormatSummary()/applyFiltersAndSort()` | ✓ WIRED | #clientFormatFilter + #clientHeartWallToggle wired |
| `sessions.html` filter bar | `assets/sessions.js` | `buildFormatOptions()/renderFormatSummary()/renderSessions()` | ✓ WIRED | #sessionFormatFilter + #sessionHeartWallToggle wired |
| `index.html` sortable th | `assets/overview.js` | click handlers + setSort/syncSortIndicators | ✓ WIRED | data-sort-key on 3 th; keydown handlers |
| `#clientSortSelect` | `assets/overview.js` shared sort state | `change` → `setSort(value, false)` | ✓ WIRED | Both directions confirmed |
| i18n new filter keys | `assets/overview.js` + `assets/sessions.js` | `App.t('filter.sessionFormat.*')` calls | ✓ WIRED | buildFormatOptions() + renderFormatSummary() |
| CSS `.multi-select*` / `.filter-toggle` / `th.sortable` | `index.html` + `sessions.html` elements | class attributes on wired elements | ✓ WIRED | Classes applied to deployed DOM |
| 8 static legal pages | `sw.js` PRECACHE_URLS | Per-file precache entries (pre-existing) | ✓ WIRED | No new files required; no sw.js change needed |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `window.DateFormat.format()` | `d` (local Date) | `parseLocal()` → `new Date(y, m-1, d)` | Yes — local Date from regex-extracted components | ✓ FLOWING |
| `App.formatSessionType()` | `data` | `_readSessionTypes()` → `localStorage['portfolioSessionTypes']` | Yes — live read per call, no cache | ✓ FLOWING |
| `buildFormatOptions()` in overview.js + sessions.js | `types` | `App.getSessionTypes()` → `_readSessionTypes()` | Yes — reflects current localStorage; custom types included | ✓ FLOWING |
| `renderFormatSummary()` pill text | `n` (Set size) | `_selectedFormats.size` after checkbox interaction | Yes — live Set state | ✓ FLOWING |
| Backup export (portfolioDateFormat + portfolioSessionTypes) | localStorage values | `localStorage.getItem()` at export time | Yes — live values | ✓ FLOWING |
| Sort state → row order | `_sortKey` / `_sortDir` | Click/dropdown → setSort → applyFiltersAndSort | Yes — reads real client rows from PortfolioDB query | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TZ-pinned spine: App.formatDate('2026-07-02') === 'Jul 2, 2026' under NY TZ | `node tests/37-date-format.test.js` | 13/13 PASS | ✓ PASS |
| Personalization surface: picker + F4 editor + resolver + backup round-trip + XSS guard | `node tests/37-personalization.test.js` | 13/13 PASS | ✓ PASS |
| Overview Session Format + Heart-Wall filter (union/legacy/shield-agnostic/XSS/pill) | `node tests/37-overview-filters.test.js` | 8/8 PASS | ✓ PASS |
| Sessions Session Format + Heart-Wall filter (session-level/union/legacy/shield-agnostic) | `node tests/37-sessions-filters.test.js` | 8/8 PASS | ✓ PASS |
| Overview header-sort ↔ dropdown two-way sync + direction flip + svg injection | `node tests/37-overview-sort.test.js` | 5/5 PASS | ✓ PASS |
| PDF Hebrew numeric LTR: '2026' present, '6202' absent | `node tests/pdf-digit-order.test.js` | 7/7 PASS | ✓ PASS |
| PDF golden baselines: 5/5 pass including regenerated fixture-en | `node tests/pdf-latin-regression.test.js` | 5/5 PASS | ✓ PASS |
| Fixed date-locale assertions (en-US, raw-ISO PDF chain) | `node tests/34-date-locale.test.js` | 7/7 PASS | ✓ PASS |
| Demo seed gate (isHeartShield/shieldRemoved data unchanged; prose relabeled) | `node tests/35-demo-seed.test.js` | GREEN (confirmed by 37-11 SUMMARY) | ✓ PASS |
| Full suite | `node tests/run-all.js` | **124/124 GREEN** | ✓ PASS |

---

### Probe Execution

Not applicable — no phase-declared probe scripts.

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| DATE-01 | 37-01, 37-03 | Zero-dependency `window.DateFormat` IIFE with parseLocal | ✓ SATISFIED | date-format.js:45 local Date constructor |
| DATE-02 | 37-03, 37-05, 37-08 | App-wide sweep: zero remaining UTC calendar-date parses | ✓ SATISFIED | Grep: zero hits; 37-date-format.test.js 13/13 |
| DATE-03 | 37-03 | 6 date-format options render correctly across locales | ✓ SATISFIED | 37-date-format.test.js 6-format assertions all PASS |
| DATE-04 | 37-03, 37-04 | Hebrew numeric dates LTR in all contexts | ✓ SATISFIED | U+2066/U+2069 isolates; pdf-digit-order.test.js 7/7 |
| DATE-05 | 37-04 | PDF card date + footer use DateFormat; raw ISO from export-modal | ✓ SATISFIED | pdf-export.js:683; export-modal.js:604, 648, 711 |
| DATE-06 | 37-05, 37-08 | countSessionsThisMonth fixed; new-session default is local today | ✓ SATISFIED | overview.js uses DateFormat.parseLocal ×5; add-session.js uses todayLocalISO() |
| DATE-07 | 37-01, 37-04 | TZ-pinned behavior tests; rewritten 34-date-locale; baselines regenerated | ✓ SATISFIED | 37-date-format.test.js 13/13; 34-date-locale.test.js 7/7; fixture-en regenerated (Ben-approved) |
| PERS-01 | 37-06 | Personalization Settings tab + deep-link | ✓ SATISFIED | settings.html tab + panel; personalize whitelist; test passes |
| PERS-02 | 37-06 | Date-format picker persists; re-render event | ✓ SATISFIED | settings.js :858-860; app:dateformat dispatched |
| PERS-03 | 37-07 | Two-tier session-type editor | ✓ SATISFIED | settings-session-types.js; locked rows; 37-personalization.test.js PASS |
| PERS-04 | 37-07 | Resolver + durable storage; legacy key resolution | ✓ SATISFIED (localStorage vs IDB — see NOTE) | formatSessionType resolver confirmed; backup round-trip PASS |
| PERS-05 | 37-05, 37-07 | Backup carries portfolioDateFormat + session-type list | ✓ SATISFIED (localStorage vs IDB — see NOTE) | backup.js :621-622, :1235-1240; round-trip test PASS |
| PERS-06 | 37-05, 37-08 | Native `<input type="date">` for birthdate | ✓ SATISFIED | add-client.html:64; add-session.html:143,522 |
| PERS-07 | 37-06 | New i18n keys across en/he/de/cs | ✓ SATISFIED | All keys confirmed in all 4 bundles; [ASSUMED] quality — see Human Verification |
| PERS-08 | 37-02 | Behavior tests covering Personalization surface | ✓ SATISFIED | 37-personalization.test.js 13/13 PASS |
| TERM-01 | 37-11 | Session Format modality axis label (EN/HE updated; DE/CS already correct) | ✓ SATISFIED | session.form.sessionType + sessions.table.type relabeled; session.copy.type also fixed (Rule 2 auto-fix by executor) |
| TERM-02 | 37-11 | Heart-Wall single heart term per language; HE inconsistencies retired | ✓ SATISFIED | Node verify script exits 0 for all 4 bundles |
| FILT-01 | 37-13, 37-14 | Session Format multi-select on Overview + Sessions | ✓ SATISFIED | 8/8 PASS per screen; client-level (Overview) and session-level (Sessions) predicates |
| FILT-02 | 37-13, 37-14 | Heart-Wall toggle replacing old heart dropdowns | ✓ SATISFIED | #clientHeartShieldFilter + #sessionTypeFilter both removed; toggles present and wired |
| FILT-03 | 37-15 | Overview click-to-sort + #clientSortSelect two-way sync | ✓ SATISFIED | 5/5 PASS; svg injection asserted; Playwright e2e field-confirmed |
| FILT-04 | 37-10 | RED behavior tests for filters + sort, pinning DOM/selector contract | ✓ SATISFIED | 3 test files authored RED then turned GREEN by 37-13/14/15; 37-10 RED gate inverted (confirmed) |
| LEGAL-01 | 37-12 | Trademark + non-affiliation disclaimer on 8 legal pages (4 disclaimer + 4 impressum) | ✓ SATISFIED | Node verify scripts exit 0 for all 8 files |

**NOTE on PERS-04 / PERS-05:** REQUIREMENTS.md text describes IndexedDB (`therapistSettings`) storage; actual implementation uses `localStorage['portfolioSessionTypes']` per 37-PATTERNS.md A2 CORRECTED — the IDB path doesn't round-trip through backup restore. The implementation is functionally superior. REQUIREMENTS.md text is stale documentation, not a code error.

---

### Anti-Patterns Found

| File | Line(s) | Pattern | Severity | Impact |
|------|---------|---------|----------|--------|
| `assets/app.js` | 968, 1044 | `window.DateFormat.format()` / `.todayLocalISO()` called without null guard (WR-05 from 37-03 code review) | ⚠️ Warning | If date-format.js fails to load (pre-SW-cache first visit), both throw TypeError. Normal operation unaffected (script wired on all 8 pages + precached). |
| `assets/settings-session-types.js` | 308-309, 327-329, 345-346 | Double `renderTypeList()` per mutation — `persist()` dispatches CHANGED_EVENT synchronously then caller invokes `renderTypeList()` explicitly (WR-01) | ⚠️ Warning | Two complete list rebuilds per save. Performance issue, not correctness. Invisible at typical list sizes. |
| `assets/backup.js` | 1235, 1238 | `if (manifest.settings.dateFormat)` falsy check treats null (source used defaults) same as absent (old backup) (WR-02) | ⚠️ Warning | If source device never customised format/types (null stored), target device retains its own customisation after restore. Decision required — see Human Verification. |
| `assets/settings-session-types.js` | 277-284 | No duplicate-label guard on locked-type renames (WR-03) | ⚠️ Warning | User can rename "Clinic" to "Online" → two rows labeled "Online". Data keys remain distinct; no records corrupted. UI ambiguity only. |
| `assets/app.js` | 719-729 | Cross-tab relay in initCommon handles portfolioSessionTypes changes but NOT portfolioDateFormat changes (WR-04) | ℹ️ Info | Acknowledged deliberate in Plan 06 (FIX 7). Not user-visible in normal single-tab use. |
| `assets/date-format.js` | 34-35 | U+2066 (LRI) and U+2069 (PDI) embedded as invisible literal characters (IN-01) | ℹ️ Info | Correct behavior for Hebrew numeric LTR wrapping. Not visible in code review tools without hex dump. No security risk. |
| `demo.html` | — | Reduced pre-37 overview markup: no filter bar, no sortable headers, no Phase 37 controls | ℹ️ Info | Intentional — demo.html ships the pre-37 state. The apparent "no sort icon" sighting during 37-15 checkpoint was this, not a bug in index.html. Decision deferred to Ben (see Human Verification). |
| sessions table ≤640px | — | No mobile card treatment at narrow viewports (sessions table squeezes/clips) | ℹ️ Info | Pre-existing gap, not a Phase 37 regression. Logged as a backlog candidate in 37-15 SUMMARY. |

No `TBD`, `FIXME`, or `XXX` markers found in any phase-modified file.

---

### Known Intentional Gaps (NOT blocking — per team lead)

| Gap | Status | Notes |
|-----|--------|-------|
| `demo.html` pre-37 overview controls | Open Ben decision | demo.html ships without Phase 37 filter bar / sortable headers. Not a bug; open scope decision. See Human Verification item 4. |
| Sessions table ≤640px mobile treatment | Pre-existing backlog | No `tr.session-row` stacked-card CSS at narrow viewports; pre-dates Phase 37. Logged as backlog candidate. |
| USPTO live-register re-verification of "Wellness Unmasked, Inc." registrant + Body Code ™-vs-® | Recommended pre-push, intentionally skipped | Research from 2026-07-03 recommends re-checking the USPTO database before push to confirm ™ vs ® status and registrant name. Skipped in this phase; legal pages use the best-known status (Body Code™). |

---

### Human Verification Required

#### 1. HE/CS Personalization Tab i18n — Broader [ASSUMED] Block (Partial Resolution)

**Context:** The [ASSUMED] comment block at line 426 of i18n-he.js, i18n-de.js, and i18n-cs.js covers the entire Personalization tab (settings.tab.personalize, settings.dateFormat.*, settings.sessionTypes.*).

**RESOLVED as of 2026-07-06 (commit 6bde07c):**
- HE+DE relabel table values (D5) confirmed by Ben
- settings.sessionTypes.* EN/DE/HE aligned to "Session formats" / "Sitzungsarten" / "אופני טיפול" vocabulary

**STILL NEEDS NATIVE REVIEW:**
- **HE:** settings.dateFormat.savedToast ("תבנית התאריך עודכנה."), settings.dateFormat.auto ("אוטומטי (לפי השפה)"), settings.tab.personalize ("התאמה אישית"), and the broader helper/confirm-dialog strings in settings.sessionTypes.* (Ben speaks Hebrew, can confirm)
- **DE:** settings.dateFormat.* strings (Ben speaks German, can confirm). settings.sessionTypes.* was updated in 6bde07c and DE-reviewed.
- **CS:** ALL Personalization tab strings remain [ASSUMED] — no CS speaker in-house. Includes settings.tab.personalize ("Přizpůsobení"), all settings.dateFormat.* ("Formát data", "Automaticky", etc.), AND settings.sessionTypes.* ("Typy sezení" family — note CS uses "Typy" not "Sitzungsarten" equivalent; the 6bde07c commit intentionally left CS unchanged since "Typ sezení" was already the correct CS axis term).

**Test:** Open the Personalization tab with language set to HE, DE, and CS. Review all strings visible on the Personalization tab (tab label, date-format label/auto/toast, session-formats heading/helper/add-controls/tooltips/confirm dialogs).

**Expected:** All strings read naturally to a native speaker; no machine-translation artifacts.

**Why human:** Keys exist structurally and tests pass; quality verification requires native speakers. CS is unreviewed end-to-end.

---

#### 2. WR-02: Backup Restore Default-Value Fidelity — Accept or Fix?

**Test:** On Device A (default settings, never customised date format or session types), export a backup. On Device B (which has `mm/dd/yyyy` set and custom session types), restore that backup. Observe whether Device B retains its customisations or resets to Device A's defaults.

**Expected if fixed:** Device B's format and session types reset to defaults (matching Device A's state), because the backup explicitly encodes "source used defaults (null)".

**Current behavior:** Device B retains its customisations (null-valued fields in the backup are silently skipped by the falsy check at `backup.js:1235, 1238`).

**Fix (if chosen):** Change `if (manifest.settings.dateFormat)` to `if ('dateFormat' in manifest.settings)` with a `removeItem` branch for null. Same for sessionTypes.

**Why human:** The fix is 2-line; the decision is whether this edge case warrants a follow-up before shipping or is acceptable as a known limitation of current backup semantics.

---

#### 3. Legal Pages he/de/cs + Czech External Legal-Native Review

**Test:** Read the new trademark + non-affiliation section in disclaimer-he.html, disclaimer.html (DE), disclaimer-cs.html, impressum-he.html, impressum.html (DE), impressum-cs.html.

**Expected:** All text reads correctly and legally soundly in its language; no awkward phrasing or inaccurate claims. EN is the canonical (can ship as-is). HE and DE: Ben can confirm (speaks both). CS "Ochranné známky a nezávislost" / "Ochranné známky" text — needs an external Czech native (ideally with legal/business context) to confirm.

**Note:** Commit 573f376 (2026-07-05) applied a challenger review (grammar fixes, CS sentence-1 rewrite, doctrine self-labels removed, "empfohlen"/"schválen" added). The DRAFT HTML comments were intentionally stripped (appropriate per commit message: "view-source admission on the binding Impressum"). The challenger pass was done by the Claude executor, not an external CS legal speaker.

**Why human:** Czech has no in-house speaker. Legal phrasing must be accurate before a public push.

---

#### 4. demo.html Phase 37 Controls — Scope Decision

**Test:** View demo.html. Observe that the Overview section lacks the Phase 37 filter bar (Session Format multi-select, Heart-Wall toggle) and sortable column headers.

**Expected (current):** demo.html renders the pre-37 Overview — original filter controls, no sortable headers. The sessions-garden.app deployed site (if any) also doesn't yet have Phase 37.

**Decision needed:** Should demo.html be updated to include the Phase 37 controls (filter bar + sortable headers) before the Phase 37 release? Or is the pre-37 demo acceptable for now (backlog)?

**Why human:** Product/scope call. The index.html implementation is correct and fully tested. This is about whether the public demo reflects the current state.

---

### Gaps Summary

No blocking gaps. All 24 requirements (DATE-01 through LEGAL-01) and all 12 observable truths are verified against the actual codebase. The full test suite is 124/124 GREEN. The 8 anti-pattern warnings (WR-01 through WR-05, IN-01, and 2 pre-existing/intentional items) are quality notes from code review; none prevent the phase goal from being achieved.

The 4 human verification items are quality-assurance items that should be resolved before shipping:
1. CS i18n native review (critical — no CS speaker in-house)
2. WR-02 backup null-vs-absent (decision required, fix is simple)
3. Czech legal phrasing (critical — legal pages must be accurate before public push)
4. demo.html scope (nice-to-have — doesn't block the main app)

---

## Phase 37 — Additional Notes

**REQUIREMENTS.md stale documentation:** PERS-04 and PERS-05 text describes IndexedDB storage for session types. The actual implementation uses `localStorage['portfolioSessionTypes']` — a planned correction documented in 37-PATTERNS.md (A2 CORRECTED). The behavior tests verify the actual (correct) behavior. REQUIREMENTS.md should be updated for accuracy in a future documentation pass.

**Session Format vocabulary extension (6bde07c, 2026-07-06):** settings.sessionTypes.* strings (the F4 editor surface) were not in the 37-11 relabel tables (out of scope per plan fences). After 37-11 landed, the residual was identified (settings.sessionTypes.heading still read "Session types" EN / "Sitzungstyp" DE / "סוג מפגש" HE). Commit 6bde07c aligned all three (EN → "Session formats", DE → "Sitzungsarten", HE → "אופני טיפול"). CS left unchanged (already consistent: "Typy sezení"). This was a post-37-11, pre-verification clean-up — not a gap; Ben confirmed HE+DE per D5.

**Visual gate methodology (37-15):** The headless-Chrome renders used an isolated-markup harness (self-measuring scrollWidth===innerWidth banners) + Playwright for interactive field verification. The harness was a throwaway artifact (not shipped). The field-verified result: arrows injected 3/3 on real index.html; click→aria-sort descending+select synced; second click flips ascending. The visual renders were reviewed by Ben in the 37-15 checkpoint (2026-07-06).

**Dead heart-dropdown sub-key removal (37-15 Task 1.5):** sessions.filter.type.all / .heartShield / .regular were safely removed only in Wave 8, after both old dropdowns (#clientHeartShieldFilter and #sessionTypeFilter) were removed by 37-13 and 37-14. The parent key sessions.filter.type (repurposed as the Heart-Wall toggle label by 37-11) is intact.

**Legal review process (37-12 + 573f376):** The plan mandated "external legal-native-speaker + challenger review before Ben pushes". The challenger review was completed by the Claude executor + Ben in-session. The DRAFT HTML comments were intentionally stripped in 573f376 (they are inappropriate in a view-source-readable Impressum). The external Czech native review remains outstanding — see Human Verification item 3.

---

_Verified: 2026-07-06T12:00:00Z_
_Verifier: Claude (gsd-verifier) — re-verification merging 37-VERIFICATION.md (2026-07-03) + 37-UAT.md + new scope 37-10..37-15_
