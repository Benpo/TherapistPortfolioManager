# Phase 29: Reliability & Observability - Context

**Gathered:** 2026-06-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Make production problems on a user's device **diagnosable**, without any data
ever leaving the device. Three deliverables:

1. **OBS-01** — A local crash log: capture uncaught errors + unhandled promise
   rejections (and the Phase 28 integrity mismatch), persist the most recent
   entries to IndexedDB. Zero network calls.
2. **OBS-02** — A "Report a problem" flow: the user copies the (redacted)
   crash log + basic diagnostic context and hands it to support by their own
   action. Nothing is transmitted automatically (GDPR-safe).
3. **OBS-03** — An IndexedDB-migration "reset & recover" escape hatch so a
   failed migration can no longer trap a user in an unrecoverable "please
   refresh" loop.

**Out of scope (belongs elsewhere):**
- Actually *sending* email / any server-side transmission — impossible by
  design (no backend = the local-only value proposition; OBS-02 explicitly
  forbids auto-transmission). The flow hands off to the user's own email
  client via `mailto:`; the send is the user's action.
- Adding tagged logging to the codebase's silent `catch` blocks — that is
  Phase 31 (RFCT-03). Phase 29 builds the capture/log/report/recover
  machinery; broad call-site instrumentation comes later.
- Fixing the migration-blocked (`onblocked`, another tab) banner — distinct
  from the loop (closing the other tab resolves it); not OBS-03's target.

</domain>

<decisions>
## Implementation Decisions

### Crash log — capture & storage (OBS-01)
- **D-01:** **Capture set:** uncaught `window.onerror` + `unhandledrejection`,
  plus the version-integrity mismatch surfaced by Phase 28's self-check
  (28-CONTEXT D-12 handoff). Each entry: timestamp, message, stack (when
  available), page/URL, and minimal context. Zero network.
- **D-02:** **Dual storage (closes the IDB paradox).** Primary log lives in
  **IndexedDB** (satisfies OBS-01; structured, holds the full set). The **last
  few entries are also mirrored to `localStorage`** so that an IDB-open /
  migration failure — the exact scenario OBS-03 handles — is still captured and
  reportable even when IndexedDB itself is broken.
- **D-03:** **Retention = age + count, whichever is tighter.** Keep entries
  **≤ 30 days old AND ≤ 50 entries max**. Prune **on write**: every time a new
  error is appended, drop anything older than 30 days and trim to the 50-entry
  ceiling. No timer needed. (30 days chosen so "I finally got around to
  reporting last week's bug" still works, while stale entries self-clean —
  bounded size + data-minimization hygiene.)

### Report a problem — privacy (OBS-02)
- **D-04:** **Redact + preview.** Best-effort scrub of obvious
  client-identifying data from error messages/stacks (a thrown error could
  embed a client name), **AND** show the full assembled report in a **preview
  the user can read and edit** before it reaches the clipboard. Belt-and-
  suspenders for the local-only promise: automated scrub as a floor, the user's
  own eyes as the final gate, because they are pasting this into an email.

### Report a problem — delivery (OBS-02)
- **D-05:** **Dedicated "Report a problem" screen** (not just a Settings
  button). The screen: shows the redacted **preview** → **"Copy report"**
  (full log → clipboard) → **"Open email to support"** which launches a
  prefilled `mailto:` to the support address in the Impressum (subject preset).
- **D-06:** **Copy + `mailto:` handoff, send happens in the user's email app.**
  The app never transmits. Copy carries the full multi-line log (a `mailto:`
  body can't reliably hold a long log — URL length limits), and the `mailto:`
  opens a short "paste your report below this line" email. Zero-network
  preserved. If `mailto:` proves unreliable in the installed PWA, degrade to
  copy-only + the displayed support address (builder's call at implementation).

### Reset & recover escape hatch (OBS-03)
- **D-07:** **Backup-gated reset — never a silent wipe.** Because backup export
  is *always* interactive (it routes through a passphrase modal; even "Skip
  encryption" forces an explicit "Yes, export unprotected" confirm — see
  `backup.js`), there is **no silent auto-export**. So the escape hatch offers
  an **"Export backup now"** button that routes through the *existing*
  passphrase export flow.
- **D-08:** **Hard affirmation gate before the destructive step.** The reset
  (`indexedDB.deleteDatabase` + reload into a fresh DB) stays disabled behind a
  **checkbox** ("I have saved a backup I can restore from") **plus a
  double-confirm** dialog. The confirmation is made **extra-emphatic when no
  export happened in this session** (catch the user who clicked straight to
  reset). Only then does the wipe run.
- **D-09:** **Trigger is the migration-failure path.** The escape hatch replaces
  the dead-end "Refresh page → `location.reload()`" of today's
  `showDBMigrationError()` (`db.js:429–450`), which simply re-runs the same
  failing migration forever. It is also the landing spot for Phase 28's
  "Couldn't finish automatically" integrity escalation (28-CONTEXT D-12).

### Claude's Discretion
- **Global-handler installation:** the crash-log capture module must load
  **early on all ~20 app pages** (multi-page app — same wiring concern that
  `version.js` solved in Phase 28). Exact module shape / load order is the
  builder's call, must work before other scripts can throw.
- **Diagnostic-context fields** in the report (app version, language,
  `userAgent`, DB version, object-store counts, storage usage) — bounded by the
  D-04 redaction + preview safety net; exact field set is builder's discretion.
- **Crash-log "clear" affordance** (let the user empty the log) — optional, nice
  to have; builder's call.
- **`localStorage` mirror depth** (how many of the last entries to mirror) —
  builder's call; enough to make an IDB-failure report useful.

### ⚠ Known wrinkle for research/planning (OBS-03)
A failed migration may also **block the normal export path**, because
`exportBackup()` re-opens the DB via `openDB()` — which re-triggers the same
failing upgrade. The escape hatch's "Export backup now" likely needs to open the
DB **read-only at its existing (un-upgraded) version** to export *around* the
failure. The researcher/planner must resolve this; it is flagged, not decided
here.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — section "Reliability & Observability (Phase 29)":
  OBS-01, OBS-02, OBS-03 (plus the "Out of Scope" table — no build step, no
  multi-device sync, etc.)
- `.planning/ROADMAP.md` — section "Phase 29: Reliability & Observability":
  goal + the 3 success criteria

### Prior-phase handoff (the integration contract)
- `.planning/phases/28-update-reliability-versioning/28-CONTEXT.md` — D-12:
  Phase 28's integrity nudge **persists the detected mismatch to the OBS-01
  error log**, and its "Couldn't finish automatically" escalation **hands off
  to the OBS-03 reset & recover hatch + this report flow**. This phase must
  honor that contract.

### Codebase concerns (the source of this milestone)
- `.planning/codebase/CONCERNS.md` — directly relevant entries: error telemetry
  (→ OBS-01/02) and the IndexedDB migration escape hatch (→ OBS-03).

No external ADRs/specs beyond the above. Durable facts referenced inline:
project memories `feedback-behavior-verification` (the report screen/escape
hatch are runtime-behavior UI — falsifiable behavior tests, not grep gates),
`feedback-ui-phase-gate-mandatory` (the UI surfaces below warrant
`/gsd-ui-phase`), and `reference-pwa-sw-cache-updates` (stale-SW context behind
the Phase 28 handoff).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets / touch-points
- `assets/db.js:429–450` — `showDBMigrationError()`: the current dead-end
  banner whose only action is "Refresh page → `location.reload()`" — the exact
  infinite-loop trap OBS-03 replaces. Sibling handlers: `showDBBlockedMessage()`
  (`db.js:394`, the *other-tab* blocked state — out of scope) and
  `showDBVersionChangedMessage()` (`db.js:407`).
- `assets/db.js:272–328` — `openDB()` / `onupgradeneeded` runs migrations in a
  single transaction; on throw it `transaction.abort()`s (DB stays at old
  version, **data is safe**) then shows the dead-end banner. `DB_VERSION = 5`;
  `MIGRATIONS` map at `db.js:190+`. The read-only-export-around-failure wrinkle
  (D-09 / known wrinkle) lives here.
- `assets/db.js:152–183` — `DB_STRINGS` inline EN/HE/DE/CS string objects +
  `dbStr()`: the pattern for text that must render **before `i18n.js` loads**
  (the migration banner uses it). The escape-hatch UI needs the same early,
  4-language, RTL-safe treatment.
- `assets/backup.js` — `exportBackup()` (line 550, builds the ZIP blob) and
  `exportEncryptedBackup()` (line 689, passphrase modal → encrypt → download).
  The escape hatch's "Export backup now" reuses this flow. **Confirms D-07:**
  every export path is interactive (passphrase or explicit skip-encryption
  confirm at `backup.js:115–118`) — no silent export exists.
- `assets/backup.js` / `assets/add-session.js` — existing clipboard / copy
  patterns to reuse for "Copy report".
- `assets/settings.js` (~2,827 lines) — section structure (`data-section-key`
  rows); the "Report a problem" entry point / link to the dedicated screen
  slots in here. (Note: this is a Phase 31 refactor target — keep additions
  cohesive and isolated so they survive the extraction.)

### Established Patterns
- Zero-build, zero-npm, IIFE-global modules served verbatim; IndexedDB only;
  **zero network calls** (the core constraint OBS-01/02 must not break).
- 4 languages (EN/HE/DE/CS), RTL-safe (Hebrew) — all new UI strings and the
  report screen must cover all four.
- Early-loading inline string objects (`DB_STRINGS`, `FOOTER_STRINGS`) for text
  that renders before `i18n.js` — relevant for the crash-log/escape-hatch UI.

### Integration Points
- **Phase 28 → 29:** the integrity self-check writes its mismatch into the
  OBS-01 log, and its escalation routes into the OBS-03 hatch + report screen
  (28-CONTEXT D-12). Build the OBS-01 `logError()`-style entry point so Phase
  28's code can call it.
- **Crash-log module ↔ all pages:** global error handlers install early on
  every app page (multi-page wiring like `version.js`).

</code_context>

<specifics>
## Specific Ideas

- **"Nothing leaves the device" is literal and absolute** (Ben, this session).
  The app has no backend and cannot send email itself — an in-app "send" page is
  impossible by design. The report flow assembles + previews + copies, then
  hands off to the user's *own* email client via `mailto:`. The transmission is
  always the user's manual action.
- **OBS-03 is forward-looking insurance, not a fix for a bug we have today**
  (owner framing for Ben). On the current v5 schema there is **no known
  reproducible loop** — all 5 migrations are shipped and stable. The realistic
  failure is a **future** migration (v6+, likely authored by Sapir as the
  non-technical maintainer) that throws — and it bricks **only users who already
  have data** (fresh installs jump straight to the target version), i.e. your
  loyal customers with the most session history. OBS-01/02/03 together turn that
  worst case from "bricked + data stranded + you never hear about it" into
  "recoverable + diagnosable."
- The crash log/report must itself be safe to paste into an email — hence
  redact **and** preview (D-04), not one or the other.

</specifics>

<deferred>
## Deferred Ideas

- **Tagged logging in silent `catch` blocks across the codebase** — Phase 31
  (RFCT-03). Phase 29 builds the capture/log machinery; broad call-site
  instrumentation rides the refactor.
- **`onblocked` (another tab open at old version) UX** — a distinct stuck state
  from the migration loop; resolved by closing the other tab. Not OBS-03's
  target; revisit only if it proves a real user pain.
- **A standing "nuclear reset" button in Settings** (independent of a migration
  failure) — not requested; OBS-03 is scoped to the failure path. Could be a
  future hardening idea if support reports warrant it.

### Reviewed Todos (not folded)
5 pending todos surfaced by `todo.match-phase` — all generic keyword
false-positives (matched on words like "data", "phase", "user", "indexeddb"),
none about crash logging, error reporting, or migration recovery. None folded:
stronger deactivation data-loss warning, PWA install guidance + user manual,
restructure terms-acceptance into LS activation flow, "v1.2 full IndexedDB
encryption with PIN/passphrase", modality templates.

</deferred>

---

*Phase: 29-reliability-observability*
*Context gathered: 2026-06-22*
