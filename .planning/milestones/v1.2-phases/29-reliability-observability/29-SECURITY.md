# SECURITY.md — Phase 29: reliability-observability

**Audited:** 2026-06-23
**Auditor:** gsd-security-auditor (FORCE stance — mitigation assumed absent until proven in code)
**ASVS Level:** L1
**Block-on:** high
**Waves:** OBS-01 (local crash-log capture), OBS-03 (DB-migration reset/recover escape hatch), OBS-02 ("Report a problem" flow)

## Verdict: SECURED

All 13 register threats resolve to CLOSED. 12 `mitigate` dispositions are present in the implementation and test-backed; the single `accept` disposition (T-29-12) is documented below in the Accepted Risks log. No declared mitigation is absent. Zero unregistered threat flags. One known, already-tracked, security-adjacent review item (WR-04) is assessed below as a documented accepted residual risk, not a phase blocker.

Verification method per the agent contract: for each `mitigate` threat the declared pattern was grepped in the cited files AND read in context; every zero-network claim was confirmed by (a) absence of `fetch`/`XMLHttpRequest`/`import(`/`sendBeacon`/`WebSocket`/`EventSource`/`new Image(` in the named path and (b) a test that spies global `fetch`/`XMLHttpRequest` asserting zero calls. All 6 Phase-29 test files were executed and pass (30 assertions, 0 failures).

---

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence (file:line) |
|-----------|----------|-------------|--------|----------------------|
| T-29-01 | Information Disclosure (PII in crash entries) | mitigate | CLOSED | Raw stored locally only — `assets/crashlog.js:213-227` (`persistToIDB` → IDB) + `:190-200` (localStorage mirror); no transmission anywhere (zero-network grep clean). Redaction applied at report gate — `assets/report.js:200-248` (`redactReport`). Bounded retention ≤50/≤30d — `assets/crashlog.js:158-172` (`prune`). Integrity-mismatch persist is local + guarded — `assets/shared-chrome.js:125-133`. |
| T-29-02 | Info Disclosure / zero-network (capture path + inline head handler) | mitigate | CLOSED | No `fetch`/XHR/`import()` in `assets/crashlog.js` (grep: NONE). Inline head handler is pure `localStorage.setItem`, no network — `index.html:5` (replicated on all 21 pages). Test spies global fetch/XHR → 0 calls: `tests/29-01-crashlog-capture.test.js:295-296,442-449` (PASS). |
| T-29-03 | Denial of Service (unbounded log growth) | mitigate | CLOSED | Prune-on-write ≤50 AND ≤30d every append — `assets/crashlog.js:158-172` (`prune`), invoked in `append` `:268` and `writeMirror` `:195`. Inline buffer bounded ≤5 — `index.html:5` (`while(a.length>5)a.shift()`, present on all 21 pages). Tests: `tests/29-01-...:443` (51st→50), (31-day prune). PASS. |
| T-29-04 | Tampering (throwing logger crashing the page) | mitigate | CLOSED | Every handler + storage op wrapped in the never-throwing guard idiom (mirrors `assets/version.js:104-107`). `onerror`/`unhandledrejection` handlers `assets/crashlog.js:337-371`; `normalize`/`prune`/`readMirror`/`writeMirror`/`persistToIDB`/`logError` each `try{...}catch{warn(...)}` — e.g. `:288-294`, `:160-170`, `:177-188`, `:213-227`. Degrades to guarded `console.warn` `:83-85`. |
| T-29-05 | Tampering / destructive data loss (reset wipe) | mitigate | CLOSED | Backup-gated: Export offered first — `assets/db.js:496-512`. Reset `disabled` attr — `:529`; in-handler re-check (defence-in-depth) — `:536-538`; `App.confirmDialog({tone:'danger'})` double-confirm — `:559-566`; `deleteDatabase` runs only after confirm `:567-570`. Extra-emphatic variant when no session export — `:543-555`. Test: `tests/29-02-migration-escape-hatch.test.js` cases 2,3,3b,4 (PASS — cancel does NOT wipe). |
| T-29-06 | Denial of Service (infinite refresh loop) | mitigate | CLOSED | Dead-end `location.reload()` removed from the migration-failure path; `showDBMigrationError` now offers Export + Reset&recover — `assets/db.js:475-583`. (The `location.reload()` at `db.js:443` is the separate `showDBVersionChangedMessage` "another tab upgraded the DB" banner, not the migration dead-end.) User is offered a recover path, not trapped. |
| T-29-07 | Info Disclosure / data integrity (export-around-failure reading wrong/partial DB) | mitigate | CLOSED | Read-only no-version open — `assets/db.js:1009-1024` (`_openReadOnlyNoVersion`, `indexedDB.open(DB_NAME)` no version arg; defensive `onupgradeneeded`→`transaction.abort()` `:1015-1022`). Per-store `objectStoreNames.contains` guards return `[]` — `:1026-1035` (`_readStoreReadOnly`). Never calls `openDB()`. Test: `tests/29-02-recovery-export.test.js` cases 1,2,3 (wrinkle reproduced; un-upgraded read; missing store → []). PASS. |
| T-29-08 | Info Disclosure / zero-network (export + reset paths) | mitigate | CLOSED | No `fetch`/XHR/`import()` in `assets/db.js` or the recovery path in `assets/backup.js` (grep: NONE in both). Test spies fetch/XHR → 0 calls: `tests/29-02-recovery-export.test.js:320-321,496-498` (PASS). |
| T-29-09 | Information Disclosure (PII reaching clipboard/email) | mitigate | CLOSED | Best-effort redaction floor — `assets/report.js:200-248` (emails, ≥7-digit runs, capitalised multi-word name heuristic with non-PII allowlist). User-editable preview is the final gate — `:278-289` (`showPreview` → editable `<textarea>`). Copy copies the CURRENT textarea value (honors edits) — `:303-317` (`copyReport` reads `preview.value`). Tests: `tests/29-03-report.test.js` case 2 (seeded name redacted), case 3 ("clipboard received exactly the edited textarea value"). PASS. |
| T-29-10 | Info Disclosure / zero-network (report flow) | mitigate | CLOSED | No `fetch`/XHR/`import()` in `assets/report.js` (grep: NONE). Only outbound is the user's own mailto handoff — `:319-334` (`openSupportEmail`). Test spies fetch → 0 calls: `tests/29-03-report.test.js:265-266,355` (PASS). |
| T-29-11 | Information Disclosure (full log in mailto URL) | mitigate | CLOSED | mailto body is a short "paste below this line" template only — `assets/report.js:319-328` (`body` = template, never the assembled log). Full log travels via Copy. Test asserts long log token absent from mailto body — `tests/29-03-report.test.js:398` ("mailto body does NOT carry the full log"). PASS. |
| T-29-12 | Spoofing / wrong support address (mailto target) | **accept** | CLOSED | Hardcoded single constant `SUPPORT_ADDRESS = 'contact@sessionsgarden.app'` — `assets/report.js:36`; no user input flows into the address. Documented in the Accepted Risks log below. |
| T-29-SC | Tampering (supply chain — npm/pip/cargo) | mitigate | CLOSED | Zero new dependencies. No `package.json` / `package-lock.json` / `yarn.lock` / `node_modules` in the repo (verified absent). SUMMARY `tech-stack.added: []` in all three plans. Tests use the project's vendored zero-npm vm-sandbox shim. |

---

## Unregistered Flags

None. All three SUMMARY `## Threat Flags` / `## Threat Surface` sections self-report "No new security surface beyond the threat model" (29-01) and explicitly map every disposition (29-03). No new attack surface appeared during implementation that lacks a register mapping.

---

## Accepted Risks Log

### T-29-12 — Wrong/spoofed support address (Spoofing) — ACCEPTED
- **Component:** `mailto:` target on the OBS-02 report screen.
- **Why accepted:** The destination is a single hardcoded constant `SUPPORT_ADDRESS = 'contact@sessionsgarden.app'` (`assets/report.js:36`), the Impressum support address. No user-, storage-, or URL-derived input flows into the address; there is no injection surface to spoof the target. Risk is low and the constant is the only outbound destination.
- **Residual exposure:** A future code change that templated the address from untrusted input would reopen this. None exists today.

### WR-04 — Footer `innerHTML` with unvalidated storage-derived `lang` — ACCEPTED (residual, pre-existing, out of the OBS register)
- **Component:** `assets/shared-chrome.js:87-104` (`renderFooter`) assigns `footer.innerHTML` with interpolated `getLocalizedLegalLink(type, lang)` href values (`:38-41`), where `lang` derives from `localStorage.getItem('portfolioLang')` (`:34-36`) with **no allowlist validation** before concatenation. This violates the project's stated `createElement` + `textContent` / NEVER-innerHTML contract (see `settings.js:112`, `db.js` builders, `version.js:231-233`).
- **Auditor verdict — NOT a Phase-29 blocker:**
  1. **Not a live injection vector.** `portfolioLang` is a controlled `de/he/cs/en` set written only by the app's own language switcher; it is interpolated into an href path segment, not executed. No user-supplied value reaches it today.
  2. **Out of the plan-time OBS threat register.** The footer `innerHTML` predates this phase and sits outside the OBS-01/02/03 trust boundaries; it is not a mitigation this phase declared and then failed to deliver. Phase 29 did NOT introduce this pattern.
  3. **Already tracked.** Logged as WR-04 in `29-REVIEW.md` with status `open` and a concrete fix (build with `createElement`+`setAttribute`, or validate `lang` against `['en','he','de','cs']` before interpolation). The 2026-06-23 resolution pass explicitly deferred it as out-of-scope for that pass.
- **Disposition:** Accepted as a residual, low-severity, latent hardening item. It is a real defence-in-depth gap (an unvalidated storage value flowing into `innerHTML`), so it should be remediated, but it is NOT a Phase-29 ship blocker under `block_on: high` (no high-severity, no live exploit path). Recommend carrying WR-04 forward to a hardening/backlog item rather than escalating: validate `lang` against the allowlist before any href interpolation, or convert `renderFooter` to the project-standard `createElement`+`textContent`+`setAttribute` builder used everywhere else in the phase.

---

## Notes for the record (non-blocking, informational)

- **WR-01 / WR-02 / WR-03** (from `29-REVIEW.md`) were diagnostic-quality issues, not security gaps, and are confirmed RESOLVED in code: `report.js:117-124` reads the now-exported `PortfolioDB.DB_VERSION`; `report.js:198-242` implements the User-agent re-stitch (verified by `tests/29-03-report.test.js` WR-02 cases); `shared-chrome.js:12-14` fallback aligned to `1.2.1`.
- **CR-01** (the BLOCKER from review — `ingestEarlyBuffer` wiping the IDB log to ≤5 on every load) is confirmed RESOLVED: `crashlog.js:389-420` now merges IDB+mirror, dedupes on a stable content key (`entryKey` `:126-135`), prunes, and persists the full set; regression-locked by `tests/29-04-crashlog-ingest-merge.test.js` (3/3 PASS — 40 pre-existing entries survive, idempotent). This is a data-integrity/retention fix that also reinforces T-29-03's "bounded but not truncated" retention contract.
- **Deferred human-check (not a code gap):** D-06 mailto reliability inside an installed PWA is an OPEN manual field-verification (`29-03-SUMMARY.md` / `deferred-items.md`). The degradation surface (`degradeToVisibleAddress`, `report.js:338-347`) is already shipped and tested, so the worst case is copy-only + a visible address — no security exposure either way.

---

## Test Execution Evidence

All six Phase-29 test files executed 2026-06-23 — 30 assertions, 0 failures:
- `tests/29-01-crashlog-capture.test.js` — 6/6 (onerror/rejection persist, ≤50, ≤30d prune, mirror-bypasses-openDB, zero-network)
- `tests/29-02-migration-escape-hatch.test.js` — 6/6 (controls rendered, disabled→enabled gate, danger confirm→deleteDatabase, cancel does NOT wipe, extra-emphatic variant, RTL)
- `tests/29-02-recovery-export.test.js` — 6/6 (wrinkle reproduced, read-around-failure, missing-store=[], real ZIP manifest, zero-network, interactive passphrase gate)
- `tests/29-03-report-wiring.test.js` — all (Settings row → report.html, integrity persist once + tagged, feature-gated no-throw, wedged report nav)
- `tests/29-03-report.test.js` — all (diagnostic header + entries, redaction, copy-current-edited-value, mailto excludes full log, empty state, zero-network)
- `tests/29-04-crashlog-ingest-merge.test.js` — 3/3 (40 IDB entries preserved, idempotent, IDB-reject fallback never throws)
